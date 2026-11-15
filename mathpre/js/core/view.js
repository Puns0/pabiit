/* ============================================================
   view.js — SVG Graph Renderer & Pointer Interaction Engine
   ============================================================ */
(function () {
  'use strict';

  window.NG = window.NG || {};

  var SVG_NS = 'http://www.w3.org/2000/svg';

  /**
   * NG.View manages rendering a graph to an interactive SVG,
   * handling dragging, states, animations, halos, and overlays.
   */
  function View(container, graph, opts) {
    opts = opts || {};
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    this.graph = graph;

    // Configuration
    this.width = opts.width || 560;
    this.height = opts.height || 420;
    this.viewBox = opts.viewBox || ('0 0 ' + this.width + ' ' + this.height);
    this.draggable = opts.draggable !== undefined ? !!opts.draggable : false;
    this.showWeights = opts.showWeights !== undefined ? !!opts.showWeights : true;
    this.weightMode = opts.weightMode || 'fixed'; // 'fixed' | 'euclid'
    this.weightScale = typeof opts.weightScale === 'number' ? opts.weightScale : 0.05;
    this.editableWeights = !!opts.editableWeights;
    this.showNodeLabels = opts.showNodeLabels !== undefined ? !!opts.showNodeLabels : true;
    this.nodeRadius = typeof opts.nodeRadius === 'number' ? opts.nodeRadius : 20;
    this.padding = typeof opts.padding === 'number' ? opts.padding : 20;

    // Event hooks
    this.onNodeClick = null;
    this.onEdgeClick = null;
    this.onNodeDrag = null;
    this.onNodeDragEnd = null;
    this.onBackgroundClick = null;
    this.onEdgeHover = null;
    this.onNodeHover = null;

    // Internal maps for fast element lookup
    this._nodeEls = new Map(); // id -> { group, circle, text }
    this._edgeEls = new Map(); // id -> { group, line, cross, state }
    this._pillEls = new Map(); // id -> { group, rect, text }
    this._activeTimers = new Set();
    this._boundListeners = [];

    // Parse viewBox dimensions for clamping
    var vbParts = this.viewBox.split(/\s+/).map(Number);
    this._vbMinX = (vbParts[0] || 0) + this.padding + this.nodeRadius;
    this._vbMinY = (vbParts[1] || 0) + this.padding + this.nodeRadius;
    this._vbMaxX = (vbParts[0] || 0) + (vbParts[2] || this.width) - this.padding - this.nodeRadius;
    this._vbMaxY = (vbParts[1] || 0) + (vbParts[3] || this.height) - this.padding - this.nodeRadius;

    this._initDOM();
    if (this.graph) {
      this.render();
    }
  }

  View.prototype._initDOM = function () {
    if (!this.container) return;

    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('class', 'graph-svg');
    this.svg.setAttribute('viewBox', this.viewBox);
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('role', 'img');
    this.svg.setAttribute('aria-label', 'Interactive Network Graph');
    this.svg.style.touchAction = 'none';

    // SVG Layers in exact bottom-to-top order
    this._layers = {
      halos: document.createElementNS(SVG_NS, 'g'),
      edges: document.createElementNS(SVG_NS, 'g'),
      weightPills: document.createElementNS(SVG_NS, 'g'),
      nodes: document.createElementNS(SVG_NS, 'g'),
      overlay: document.createElementNS(SVG_NS, 'g')
    };

    this._layers.halos.setAttribute('class', 'layer-halos');
    this._layers.edges.setAttribute('class', 'layer-edges');
    this._layers.weightPills.setAttribute('class', 'layer-weight-pills');
    this._layers.nodes.setAttribute('class', 'layer-nodes');
    this._layers.overlay.setAttribute('class', 'layer-overlay');

    this.svg.appendChild(this._layers.halos);
    this.svg.appendChild(this._layers.edges);
    this.svg.appendChild(this._layers.weightPills);
    this.svg.appendChild(this._layers.nodes);
    this.svg.appendChild(this._layers.overlay);

    this.container.appendChild(this.svg);

    // Setup background click listener
    var self = this;
    var bgPointerDown = null;

    function onSvgPointerDown(e) {
      bgPointerDown = { x: e.clientX, y: e.clientY };
    }

    function onSvgPointerUp(e) {
      if (!bgPointerDown) return;
      var dx = Math.abs(e.clientX - bgPointerDown.x);
      var dy = Math.abs(e.clientY - bgPointerDown.y);
      bgPointerDown = null;

      if (dx < 4 && dy < 4 && (e.target === self.svg || e.target.tagName === 'svg')) {
        if (typeof self.onBackgroundClick === 'function') {
          var pt = self._clientToSvgPoint(e.clientX, e.clientY);
          self.onBackgroundClick(pt.x, pt.y);
        }
      }
    }

    this.svg.addEventListener('pointerdown', onSvgPointerDown);
    this.svg.addEventListener('pointerup', onSvgPointerUp);

    this._boundListeners.push({ target: this.svg, type: 'pointerdown', fn: onSvgPointerDown });
    this._boundListeners.push({ target: this.svg, type: 'pointerup', fn: onSvgPointerUp });
  };

  /**
   * Convert client viewport coordinates (e.clientX, e.clientY) to SVG coordinate space.
   */
  View.prototype._clientToSvgPoint = function (clientX, clientY) {
    if (!this.svg) return { x: 0, y: 0 };
    var pt = this.svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    var ctm = this.svg.getScreenCTM();
    if (ctm) {
      var inv = ctm.inverse();
      return pt.matrixTransform(inv);
    }
    return { x: clientX, y: clientY };
  };

  /**
   * Access an SVG layer element by name: 'halos' | 'edges' | 'weightPills' | 'nodes' | 'overlay'.
   */
  View.prototype.layer = function (name) {
    if (name === 'overlay') return this._layers.overlay;
    if (name === 'halos') return this._layers.halos;
    if (name === 'edges') return this._layers.edges;
    if (name === 'weightPills' || name === 'weight-pills') return this._layers.weightPills;
    if (name === 'nodes') return this._layers.nodes;
    return null;
  };

  /**
   * Full redraw: rebuilds all nodes, edges, weight pills from the graph.
   */
  View.prototype.render = function () {
    if (!this.svg || !this.graph) return;

    // Clear layer contents
    this._layers.halos.innerHTML = '';
    this._layers.edges.innerHTML = '';
    this._layers.weightPills.innerHTML = '';
    this._layers.nodes.innerHTML = '';
    this._layers.overlay.innerHTML = '';

    this._nodeEls.clear();
    this._edgeEls.clear();
    this._pillEls.clear();

    var self = this;

    // 1. Render Edges
    var eIter = this.graph._edges.values();
    for (var eit = eIter.next(); !eit.done; eit = eIter.next()) {
      var edge = eit.value;
      this._renderEdge(edge);
    }

    // 2. Render Weight Pills
    if (this.showWeights) {
      var wIter = this.graph._edges.values();
      for (var wit = wIter.next(); !wit.done; wit = wIter.next()) {
        var wEdge = wit.value;
        this._renderWeightPill(wEdge);
      }
    }

    // 3. Render Nodes
    var nIter = this.graph._nodes.values();
    for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
      var node = nit.value;
      this._renderNode(node);
    }
  };

  View.prototype._renderEdge = function (edge) {
    var u = this.graph.node(edge.u);
    var v = this.graph.node(edge.v);
    if (!u || !v) return;

    var g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'graph-edge state-default');
    g.setAttribute('data-id', edge.id);

    var line = document.createElementNS(SVG_NS, 'line');
    line.setAttribute('x1', u.x);
    line.setAttribute('y1', u.y);
    line.setAttribute('x2', v.x);
    line.setAttribute('y2', v.y);
    g.appendChild(line);

    // Cross icon at midpoint for rejected/broken states
    var midX = (u.x + v.x) / 2;
    var midY = (u.y + v.y) / 2;
    var cross = document.createElementNS(SVG_NS, 'g');
    cross.setAttribute('class', 'edge-cross');
    cross.style.display = 'none';

    var c1 = document.createElementNS(SVG_NS, 'line');
    c1.setAttribute('x1', midX - 5);
    c1.setAttribute('y1', midY - 5);
    c1.setAttribute('x2', midX + 5);
    c1.setAttribute('y2', midY + 5);

    var c2 = document.createElementNS(SVG_NS, 'line');
    c2.setAttribute('x1', midX - 5);
    c2.setAttribute('y1', midY + 5);
    c2.setAttribute('x2', midX + 5);
    c2.setAttribute('y2', midY - 5);

    cross.appendChild(c1);
    cross.appendChild(c2);
    g.appendChild(cross);

    var self = this;
    g.addEventListener('click', function (e) {
      e.stopPropagation();
      if (typeof self.onEdgeClick === 'function') {
        self.onEdgeClick(edge.id);
      }
    });

    g.addEventListener('pointerenter', function () {
      if (typeof self.onEdgeHover === 'function') {
        self.onEdgeHover(edge.id);
      }
    });

    g.addEventListener('pointerleave', function () {
      if (typeof self.onEdgeHover === 'function') {
        self.onEdgeHover(null);
      }
    });

    this._layers.edges.appendChild(g);
    this._edgeEls.set(edge.id, { group: g, line: line, cross: cross, state: 'default' });
  };

  View.prototype._renderWeightPill = function (edge) {
    var u = this.graph.node(edge.u);
    var v = this.graph.node(edge.v);
    if (!u || !v) return;

    var midX = (u.x + v.x) / 2;
    var midY = (u.y + v.y) / 2;

    var g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'graph-weight-pill');
    g.setAttribute('data-id', edge.id);

    var rect = document.createElementNS(SVG_NS, 'rect');
    var text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', midX);
    text.setAttribute('y', midY);
    text.textContent = String(edge.w);

    var txtLen = String(edge.w).length;
    var pillWidth = Math.max(22, txtLen * 8 + 10);
    var pillHeight = 18;

    rect.setAttribute('x', midX - pillWidth / 2);
    rect.setAttribute('y', midY - pillHeight / 2);
    rect.setAttribute('width', pillWidth);
    rect.setAttribute('height', pillHeight);
    rect.setAttribute('rx', 4);
    rect.setAttribute('ry', 4);

    g.appendChild(rect);
    g.appendChild(text);

    this._layers.weightPills.appendChild(g);
    this._pillEls.set(edge.id, { group: g, rect: rect, text: text });
  };

  View.prototype._renderNode = function (node) {
    var g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'graph-node');
    g.setAttribute('data-id', node.id);

    var circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('cx', node.x);
    circle.setAttribute('cy', node.y);
    circle.setAttribute('r', this.nodeRadius);
    g.appendChild(circle);

    var text = null;
    if (this.showNodeLabels) {
      text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', node.x);
      text.setAttribute('y', node.y);
      text.textContent = node.label || node.id;
      g.appendChild(text);
    }

    var self = this;
    var isDragging = false;
    var startPos = null;

    function onPointerDown(e) {
      e.stopPropagation();
      startPos = { x: e.clientX, y: e.clientY };

      if (self.draggable) {
        try {
          g.setPointerCapture(e.pointerId);
        } catch (_) {}
        g.classList.add('dragging');
        isDragging = true;
      }
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      var pt = self._clientToSvgPoint(e.clientX, e.clientY);

      // Clamp to viewBox
      var cx = Math.max(self._vbMinX, Math.min(self._vbMaxX, pt.x));
      var cy = Math.max(self._vbMinY, Math.min(self._vbMaxY, pt.y));

      self.graph.moveNode(node.id, cx, cy);
      self._updateNodePosition(node.id, cx, cy);

      // In euclid mode, recompute edge weights live
      if (self.weightMode === 'euclid') {
        var nbrs = self.graph.neighbors(node.id);
        for (var i = 0; i < nbrs.length; i++) {
          var ne = nbrs[i];
          var dist = self.graph.euclid(ne.node.id, node.id);
          var newW = Math.max(1, Math.round(dist * self.weightScale));
          self.graph.setWeight(ne.edge.id, newW);
        }
      }

      // Update incident edges and pills
      self._updateIncidentEdges(node.id);

      if (typeof self.onNodeDrag === 'function') {
        self.onNodeDrag(node.id, cx, cy);
      }
    }

    function onPointerUp(e) {
      if (isDragging) {
        try {
          g.releasePointerCapture(e.pointerId);
        } catch (_) {}
        g.classList.remove('dragging');
        isDragging = false;

        if (typeof self.onNodeDragEnd === 'function') {
          self.onNodeDragEnd(node.id);
        }
      }

      // Detect click (drag distance < 4px)
      if (startPos) {
        var dx = Math.abs(e.clientX - startPos.x);
        var dy = Math.abs(e.clientY - startPos.y);
        startPos = null;
        if (dx < 4 && dy < 4) {
          if (typeof self.onNodeClick === 'function') {
            self.onNodeClick(node.id);
          }
        }
      }
    }

    g.addEventListener('pointerdown', onPointerDown);
    g.addEventListener('pointermove', onPointerMove);
    g.addEventListener('pointerup', onPointerUp);
    g.addEventListener('pointercancel', onPointerUp);

    g.addEventListener('pointerenter', function () {
      if (typeof self.onNodeHover === 'function') {
        self.onNodeHover(node.id);
      }
    });

    g.addEventListener('pointerleave', function () {
      if (typeof self.onNodeHover === 'function') {
        self.onNodeHover(null);
      }
    });

    this._layers.nodes.appendChild(g);
    this._nodeEls.set(node.id, { group: g, circle: circle, text: text });
  };

  View.prototype._updateNodePosition = function (nodeId, x, y) {
    var item = this._nodeEls.get(nodeId);
    if (!item) return;
    item.circle.setAttribute('cx', x);
    item.circle.setAttribute('cy', y);
    if (item.text) {
      item.text.setAttribute('x', x);
      item.text.setAttribute('y', y);
    }
  };

  View.prototype._updateIncidentEdges = function (nodeId) {
    var nbrs = this.graph.neighbors(nodeId);
    for (var i = 0; i < nbrs.length; i++) {
      var edge = nbrs[i].edge;
      var u = this.graph.node(edge.u);
      var v = this.graph.node(edge.v);
      if (!u || !v) continue;

      var edgeItem = this._edgeEls.get(edge.id);
      if (edgeItem) {
        edgeItem.line.setAttribute('x1', u.x);
        edgeItem.line.setAttribute('y1', u.y);
        edgeItem.line.setAttribute('x2', v.x);
        edgeItem.line.setAttribute('y2', v.y);

        var midX = (u.x + v.x) / 2;
        var midY = (u.y + v.y) / 2;

        if (edgeItem.cross) {
          var cLines = edgeItem.cross.querySelectorAll('line');
          if (cLines.length >= 2) {
            cLines[0].setAttribute('x1', midX - 5);
            cLines[0].setAttribute('y1', midY - 5);
            cLines[0].setAttribute('x2', midX + 5);
            cLines[0].setAttribute('y2', midY + 5);

            cLines[1].setAttribute('x1', midX - 5);
            cLines[1].setAttribute('y1', midY + 5);
            cLines[1].setAttribute('x2', midX + 5);
            cLines[1].setAttribute('y2', midY - 5);
          }
        }
      }

      var pillItem = this._pillEls.get(edge.id);
      if (pillItem) {
        var pMidX = (u.x + v.x) / 2;
        var pMidY = (u.y + v.y) / 2;
        pillItem.text.setAttribute('x', pMidX);
        pillItem.text.setAttribute('y', pMidY);
        pillItem.text.textContent = String(edge.w);

        var txtLen = String(edge.w).length;
        var pillWidth = Math.max(22, txtLen * 8 + 10);
        var pillHeight = 18;

        pillItem.rect.setAttribute('x', pMidX - pillWidth / 2);
        pillItem.rect.setAttribute('y', pMidY - pillHeight / 2);
        pillItem.rect.setAttribute('width', pillWidth);
        pillItem.rect.setAttribute('height', pillHeight);
      }
    }
  };

  /**
   * Cheap restyle: updates existing node and edge coordinates without re-creating DOM.
   */
  View.prototype.update = function () {
    var self = this;
    var nIter = this.graph._nodes.values();
    for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
      var n = nit.value;
      this._updateNodePosition(n.id, n.x, n.y);
      this._updateIncidentEdges(n.id);
    }
  };

  /**
   * Set styling state for an edge:
   * 'default' | 'accepted' | 'rejected' | 'candidate' | 'frontier' | 'cut' | 'faded' | 'blocked' | 'broken'
   */
  View.prototype.setEdgeState = function (id, state) {
    id = String(id);
    var item = this._edgeEls.get(id);
    if (!item) return;

    var validStates = ['default', 'accepted', 'rejected', 'candidate', 'frontier', 'cut', 'faded', 'blocked', 'broken'];
    for (var i = 0; i < validStates.length; i++) {
      item.group.classList.remove('state-' + validStates[i]);
    }
    item.group.classList.remove('flash-cycle', 'flash-shake', 'path-highlight');

    item.state = state;
    item.group.classList.add('state-' + state);

    if (state === 'rejected' || state === 'broken') {
      item.cross.style.display = '';
      item.cross.classList.toggle('alarm', state === 'broken');
    } else {
      item.cross.style.display = 'none';
    }
  };

  /**
   * Set styling state for a node: { fill, ring, className }
   */
  View.prototype.setNodeState = function (id, opts) {
    id = String(id);
    var item = this._nodeEls.get(id);
    if (!item) return;

    opts = opts || {};
    if (opts.fill) {
      item.circle.style.fill = opts.fill;
    }
    if (opts.ring) {
      item.circle.style.stroke = opts.ring;
    }
    if (opts.className) {
      item.group.className.baseVal = 'graph-node ' + opts.className;
    }
  };

  /**
   * Set component colours for all or a subset of nodes: { [nodeId]: colorVar }
   */
  View.prototype.setNodeColors = function (colorMap) {
    if (!colorMap) return;
    for (var id in colorMap) {
      if (Object.prototype.hasOwnProperty.call(colorMap, id)) {
        this.setNodeState(id, { fill: colorMap[id] });
      }
    }
  };

  /**
   * Clear all custom states, highlights, halos, and reset to default styles.
   */
  View.prototype.clearStates = function () {
    var self = this;
    var eIter = this._edgeEls.keys();
    for (var eit = eIter.next(); !eit.done; eit = eIter.next()) {
      self.setEdgeState(eit.value, 'default');
    }

    var nIter = this._nodeEls.keys();
    for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
      var item = self._nodeEls.get(nit.value);
      item.circle.style.fill = '';
      item.circle.style.stroke = '';
      item.group.setAttribute('class', 'graph-node');
    }

    this._layers.halos.innerHTML = '';
    this._layers.overlay.innerHTML = '';
  };

  /**
   * Stroke-dashoffset draw animation on an edge over ms milliseconds.
   */
  View.prototype.drawEdgeIn = function (id, ms) {
    id = String(id);
    var item = this._edgeEls.get(id);
    if (!item) return;

    var duration = typeof ms === 'number' ? ms : 500;
    var edge = this.graph.edge(id);
    if (!edge) return;

    var u = this.graph.node(edge.u);
    var v = this.graph.node(edge.v);
    var len = Math.hypot(v.x - u.x, v.y - u.y);

    item.line.style.transition = 'none';
    item.line.style.strokeDasharray = len;
    item.line.style.strokeDashoffset = len;

    // Force reflow
    item.line.getBoundingClientRect();

    item.line.style.transition = 'stroke-dashoffset ' + (duration / 1000) + 's ease';
    item.line.style.strokeDashoffset = '0';

    var self = this;
    var timer = setTimeout(function () {
      self._activeTimers.delete(timer);
      item.line.style.strokeDasharray = '';
      item.line.style.strokeDashoffset = '';
      item.line.style.transition = '';
    }, duration + 50);
    this._activeTimers.add(timer);
  };

  /**
   * Flash edge with alarm red, 300ms shake, and cross icon, then settle to rejected style.
   */
  View.prototype.flashEdge = function (id, type) {
    id = String(id);
    var item = this._edgeEls.get(id);
    if (!item) return;

    item.group.classList.add('flash-cycle', 'flash-shake');
    item.cross.style.display = '';
    item.cross.classList.add('alarm');

    var self = this;
    var timer = setTimeout(function () {
      self._activeTimers.delete(timer);
      item.group.classList.remove('flash-cycle', 'flash-shake');
      item.cross.classList.remove('alarm');
      self.setEdgeState(id, 'rejected');
    }, 300);
    this._activeTimers.add(timer);
  };

  /**
   * Pulse animation on specified edge or node IDs.
   */
  View.prototype.pulse = function (ids) {
    var list = Array.isArray(ids) ? ids : [ids];
    for (var i = 0; i < list.length; i++) {
      var id = String(list[i]);
      var nodeItem = this._nodeEls.get(id);
      if (nodeItem) nodeItem.group.classList.add('pulse-active');
      var edgeItem = this._edgeEls.get(id);
      if (edgeItem) edgeItem.group.classList.add('pulse-active');
    }
  };

  /**
   * Highlight a specific path: { nodes: [ids], edges: [ids] }
   */
  View.prototype.highlightPath = function (path) {
    if (!path) return;
    if (Array.isArray(path.nodes)) {
      for (var i = 0; i < path.nodes.length; i++) {
        var nItem = this._nodeEls.get(String(path.nodes[i]));
        if (nItem) nItem.group.classList.add('path-highlight-node');
      }
    }
    if (Array.isArray(path.edges)) {
      for (var j = 0; j < path.edges.length; j++) {
        var eItem = this._edgeEls.get(String(path.edges[j]));
        if (eItem) eItem.group.classList.add('path-highlight');
      }
    }
  };

  /**
   * Render soft growing vermilion halo blob behind given tree nodes for Prim's algorithm.
   */
  View.prototype.halo = function (nodeIds, color) {
    var layer = this._layers.halos;
    layer.innerHTML = '';
    if (!nodeIds || nodeIds.length === 0) return;

    var list = Array.isArray(nodeIds) ? nodeIds : Array.from(nodeIds);
    var blobColor = color || 'var(--vermilion)';
    var haloRadius = this.nodeRadius + 14;

    var g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'graph-halo-blob');
    if (color) {
      g.style.fill = color;
      g.style.stroke = color;
    }

    // Connect nodes in the tree with thick strokes
    var nodeSet = new Set(list.map(String));
    for (var i = 0; i < list.length; i++) {
      var uId = String(list[i]);
      var u = this.graph.node(uId);
      if (!u) continue;

      // Draw circular halo at node
      var c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', u.x);
      c.setAttribute('cy', u.y);
      c.setAttribute('r', haloRadius);
      g.appendChild(c);

      // Connect with neighbors in the halo
      var nbrs = this.graph.neighbors(uId);
      for (var j = 0; j < nbrs.length; j++) {
        var vId = nbrs[j].node.id;
        if (nodeSet.has(vId) && uId < vId) {
          var v = nbrs[j].node;
          var l = document.createElementNS(SVG_NS, 'line');
          l.setAttribute('x1', u.x);
          l.setAttribute('y1', u.y);
          l.setAttribute('x2', v.x);
          l.setAttribute('y2', v.y);
          l.setAttribute('stroke-width', haloRadius * 1.8);
          l.setAttribute('stroke-linecap', 'round');
          g.appendChild(l);
        }
      }
    }

    layer.appendChild(g);
  };

  /**
   * Cleanup: cancel timers, remove all listeners, and detach SVG.
   */
  View.prototype.destroy = function () {
    var self = this;
    var tIter = this._activeTimers.values();
    for (var tit = tIter.next(); !tit.done; tit = tIter.next()) {
      clearTimeout(tit.value);
    }
    this._activeTimers.clear();

    for (var i = 0; i < this._boundListeners.length; i++) {
      var b = this._boundListeners[i];
      if (b.target && b.target.removeEventListener) {
        b.target.removeEventListener(b.type, b.fn);
      }
    }
    this._boundListeners = [];

    this._nodeEls.clear();
    this._edgeEls.clear();
    this._pillEls.clear();

    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
    this.svg = null;
  };

  NG.View = View;

})();
