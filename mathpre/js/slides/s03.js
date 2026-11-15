/* ============================================================
   s03.js — Slide 3: Graph Modelling
   ============================================================ */
(function () {
  'use strict';

  window.NG = window.NG || {};
  NG.slides = NG.slides || {};

  var SVG_NS = 'http://www.w3.org/2000/svg';

  var abstractGraph = null;
  var abstractView = null;
  var editMode = false;
  var selectedFirstNode = null;

  var INITIAL_NODES = [
    { id: 'A', label: 'A', name: 'R1 (Router)', type: 'router', x: 65, y: 100 },
    { id: 'B', label: 'B', name: 'S1 (Switch)', type: 'switch', x: 190, y: 55 },
    { id: 'C', label: 'C', name: 'S2 (Switch)', type: 'switch', x: 190, y: 150 },
    { id: 'D', label: 'D', name: 'PC1 (Client)', type: 'pc', x: 345, y: 35 },
    { id: 'E', label: 'E', name: 'PC2 (Client)', type: 'pc', x: 345, y: 100 },
    { id: 'F', label: 'F', name: 'SRV (Server)', type: 'server', x: 345, y: 165 }
  ];

  var INITIAL_EDGES = [
    { u: 'A', v: 'B', w: 4 },
    { u: 'A', v: 'C', w: 6 },
    { u: 'B', v: 'C', w: 7 },
    { u: 'B', v: 'D', w: 3 },
    { u: 'B', v: 'E', w: 5 },
    { u: 'C', v: 'E', w: 8 },
    { u: 'C', v: 'F', w: 2 }
  ];

  function buildInitialGraph() {
    var g = new NG.Graph();
    for (var i = 0; i < INITIAL_NODES.length; i++) {
      var n = INITIAL_NODES[i];
      g.addNode(n.x, n.y, n.label, n.id);
    }
    for (var j = 0; j < INITIAL_EDGES.length; j++) {
      var e = INITIAL_EDGES[j];
      g.addEdge(e.u, e.v, e.w, e.u + e.v);
    }
    return g;
  }

  var LABEL_OFFSETS = {
    A: { x: 65, y: 168, w: 86, h: 20 },
    B: { x: 190, y: 22, w: 86, h: 20 },
    C: { x: 190, y: 192, w: 86, h: 20 },
    D: { x: 395, y: 35, w: 90, h: 20 },
    E: { x: 395, y: 100, w: 90, h: 20 },
    F: { x: 395, y: 165, w: 92, h: 20 }
  };

  function renderRealNetworkSVG(container) {
    container.innerHTML = '';
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('id', 's03-real-svg');
    svg.setAttribute('viewBox', '0 0 450 220');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.display = 'block';
    svg.style.maxWidth = '100%';
    svg.style.maxHeight = '100%';
    svg.style.overflow = 'visible';

    // 1. Draw cables
    var cablesG = document.createElementNS(SVG_NS, 'g');
    cablesG.setAttribute('class', 'real-cables-group');

    for (var i = 0; i < INITIAL_EDGES.length; i++) {
      var e = INITIAL_EDGES[i];
      var u = INITIAL_NODES.filter(function (n) { return n.id === e.u; })[0];
      var v = INITIAL_NODES.filter(function (n) { return n.id === e.v; })[0];
      if (!u || !v) continue;

      var gLine = document.createElementNS(SVG_NS, 'g');
      gLine.setAttribute('class', 'real-cable-item');
      gLine.setAttribute('data-edge', e.u + e.v);

      var l = document.createElementNS(SVG_NS, 'line');
      l.setAttribute('x1', u.x);
      l.setAttribute('y1', u.y);
      l.setAttribute('x2', v.x);
      l.setAttribute('y2', v.y);
      l.setAttribute('stroke', 'var(--ink-2)');
      l.setAttribute('stroke-width', '3');
      l.setAttribute('stroke-linecap', 'round');
      gLine.appendChild(l);

      // Cost label
      var mx = (u.x + v.x) / 2;
      var my = (u.y + v.y) / 2;
      var rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', mx - 13);
      rect.setAttribute('y', my - 9);
      rect.setAttribute('width', '26');
      rect.setAttribute('height', '18');
      rect.setAttribute('rx', '4');
      rect.setAttribute('fill', 'var(--paper-3)');
      rect.setAttribute('stroke', 'var(--ink-3)');
      rect.setAttribute('stroke-width', '1');
      gLine.appendChild(rect);

      var txt = document.createElementNS(SVG_NS, 'text');
      txt.setAttribute('x', mx);
      txt.setAttribute('y', my);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('dominant-baseline', 'central');
      txt.setAttribute('font-family', 'var(--font-mono)');
      txt.setAttribute('font-size', '11');
      txt.setAttribute('font-weight', '700');
      txt.setAttribute('fill', 'var(--ink)');
      txt.textContent = e.w;
      gLine.appendChild(txt);

      cablesG.appendChild(gLine);
    }
    svg.appendChild(cablesG);

    // 2. Draw devices
    var devicesG = document.createElementNS(SVG_NS, 'g');
    devicesG.setAttribute('class', 'real-devices-group');

    for (var j = 0; j < INITIAL_NODES.length; j++) {
      var d = INITIAL_NODES[j];
      var dg = document.createElementNS(SVG_NS, 'g');
      dg.setAttribute('class', 'real-device-item');
      dg.setAttribute('data-node', d.id);
      dg.style.cursor = 'pointer';

      // Outer housing circle/pill
      var circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', d.x);
      circle.setAttribute('cy', d.y);
      circle.setAttribute('r', '20');
      circle.setAttribute('fill', 'var(--paper-3)');
      circle.setAttribute('stroke', 'var(--ink)');
      circle.setAttribute('stroke-width', '2.5');
      dg.appendChild(circle);

      // Device icon inside
      var icon = document.createElementNS(SVG_NS, 'text');
      icon.setAttribute('x', d.x);
      icon.setAttribute('y', d.y);
      icon.setAttribute('text-anchor', 'middle');
      icon.setAttribute('dominant-baseline', 'central');
      icon.setAttribute('font-family', 'var(--font-mono)');
      icon.setAttribute('font-size', '12');
      icon.setAttribute('font-weight', '700');
      icon.setAttribute('fill', 'var(--ink)');
      icon.textContent = d.id;
      dg.appendChild(icon);

      // Device Name with background pill to guarantee no cable collision
      var pos = LABEL_OFFSETS[d.id] || { x: d.x, y: d.y + 26, w: 86, h: 20 };
      var pillG = document.createElementNS(SVG_NS, 'g');
      pillG.setAttribute('class', 'device-label-pill');

      var pillRect = document.createElementNS(SVG_NS, 'rect');
      pillRect.setAttribute('x', pos.x - pos.w / 2);
      pillRect.setAttribute('y', pos.y - pos.h / 2);
      pillRect.setAttribute('width', pos.w);
      pillRect.setAttribute('height', pos.h);
      pillRect.setAttribute('rx', '4');
      pillRect.setAttribute('fill', 'var(--paper-3)');
      pillRect.setAttribute('stroke', 'var(--ink-3)');
      pillRect.setAttribute('stroke-width', '1');
      pillG.appendChild(pillRect);

      var nameLbl = document.createElementNS(SVG_NS, 'text');
      nameLbl.setAttribute('x', pos.x);
      nameLbl.setAttribute('y', pos.y);
      nameLbl.setAttribute('text-anchor', 'middle');
      nameLbl.setAttribute('dominant-baseline', 'central');
      nameLbl.setAttribute('font-family', 'var(--font-mono)');
      nameLbl.setAttribute('font-size', '10.5');
      nameLbl.setAttribute('font-weight', '700');
      nameLbl.setAttribute('fill', 'var(--ink-2)');
      nameLbl.textContent = d.name;
      pillG.appendChild(nameLbl);

      dg.appendChild(pillG);
      devicesG.appendChild(dg);
    }
    svg.appendChild(devicesG);

    container.appendChild(svg);
    setupRealNetworkHover(svg);
  }

  function setupRealNetworkHover(svg) {
    var devices = svg.querySelectorAll('.real-device-item');
    devices.forEach(function (dev) {
      var nid = dev.getAttribute('data-node');
      dev.addEventListener('pointerenter', function () {
        highlightLinked('node', nid);
      });
      dev.addEventListener('pointerleave', function () {
        clearLinkedHighlight();
      });
    });

    var cables = svg.querySelectorAll('.real-cable-item');
    cables.forEach(function (cbl) {
      var eid = cbl.getAttribute('data-edge');
      cbl.addEventListener('pointerenter', function () {
        highlightLinked('edge', eid);
      });
      cbl.addEventListener('pointerleave', function () {
        clearLinkedHighlight();
      });
    });
  }

  function highlightLinked(type, id) {
    clearLinkedHighlight();
    var tableRows = document.querySelectorAll('#s03-mapping-table tbody tr');

    if (type === 'node') {
      // Highlight row 1 (Router/Switch)
      if (tableRows[0]) tableRows[0].classList.add('highlighted');

      // Highlight real device
      var rDev = document.querySelector('.real-device-item[data-node="' + id + '"]');
      if (rDev) rDev.classList.add('hover-linked-element');

      // Highlight abstract node
      if (abstractView) {
        abstractView.setNodeState(id, { fill: 'var(--highlighter)' });
      }

      // Update hovered degree readout
      var degEl = document.getElementById('s03-readout-deg');
      if (degEl && abstractGraph) {
        degEl.textContent = abstractGraph.degree(id);
      }
    } else if (type === 'edge') {
      // Highlight row 2 & row 3 (Cable & Weight)
      if (tableRows[1]) tableRows[1].classList.add('highlighted');
      if (tableRows[2]) tableRows[2].classList.add('highlighted');

      // Highlight real cable
      var rCbl = document.querySelector('.real-cable-item[data-edge="' + id + '"]');
      if (rCbl) rCbl.classList.add('hover-linked-element');

      // Highlight abstract edge
      if (abstractView) {
        abstractView.setEdgeState(id, 'candidate');
      }
    }
  }

  function clearLinkedHighlight() {
    var tableRows = document.querySelectorAll('#s03-mapping-table tbody tr');
    tableRows.forEach(function (r) { r.classList.remove('highlighted'); });

    document.querySelectorAll('.hover-linked-element').forEach(function (el) {
      el.classList.remove('hover-linked-element');
    });

    if (abstractView && abstractGraph) {
      var nIter = abstractGraph._nodes.keys();
      for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
        abstractView.setNodeState(nit.value, { fill: '' });
      }
      var eIter = abstractGraph._edges.keys();
      for (var eit = eIter.next(); !eit.done; eit = eIter.next()) {
        abstractView.setEdgeState(eit.value, 'default');
      }
    }

    var degEl = document.getElementById('s03-readout-deg');
    if (degEl) degEl.textContent = '−';
  }

  function setupTableHover() {
    var table = document.getElementById('s03-mapping-table');
    if (!table) return;

    var rows = table.querySelectorAll('tbody tr');
    rows.forEach(function (row) {
      var mapKey = row.getAttribute('data-map');
      row.addEventListener('pointerenter', function () {
        row.classList.add('highlighted');
        if (mapKey === 'devices') {
          document.querySelectorAll('.real-device-item').forEach(function (d) { d.classList.add('hover-linked-element'); });
          if (abstractGraph) {
            var nIter = abstractGraph._nodes.keys();
            for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
              abstractView.setNodeState(nit.value, { fill: 'var(--highlighter)' });
            }
          }
        } else if (mapKey === 'cables' || mapKey === 'costs') {
          document.querySelectorAll('.real-cable-item').forEach(function (c) { c.classList.add('hover-linked-element'); });
          if (abstractGraph) {
            var eIter = abstractGraph._edges.keys();
            for (var eit = eIter.next(); !eit.done; eit = eIter.next()) {
              abstractView.setEdgeState(eit.value, 'accepted');
            }
          }
        } else if (mapKey === 'whole') {
          document.querySelectorAll('.real-device-item, .real-cable-item').forEach(function (x) { x.classList.add('hover-linked-element'); });
          if (abstractGraph) {
            var nIt = abstractGraph._nodes.keys();
            for (var it1 = nIt.next(); !it1.done; it1 = nIt.next()) {
              abstractView.setNodeState(it1.value, { fill: 'var(--highlighter)' });
            }
            var eIt = abstractGraph._edges.keys();
            for (var it2 = eIt.next(); !it2.done; it2 = eIt.next()) {
              abstractView.setEdgeState(it2.value, 'accepted');
            }
          }
        }
      });

      row.addEventListener('pointerleave', function () {
        row.classList.remove('highlighted');
        clearLinkedHighlight();
      });
    });
  }

  function updateMatrixAndList() {
    if (!abstractGraph) return;

    var nodes = [];
    var nIter = abstractGraph._nodes.keys();
    for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
      nodes.push(nit.value);
    }
    nodes.sort();

    // 1. Adjacency Matrix
    var matrixWrap = document.getElementById('s03-matrix-wrap');
    if (matrixWrap) {
      var html = '<table class="s03-matrix-table"><thead><tr><th></th>';
      for (var i = 0; i < nodes.length; i++) {
        html += '<th>' + nodes[i] + '</th>';
      }
      html += '</tr></thead><tbody>';

      for (var r = 0; r < nodes.length; r++) {
        var u = nodes[r];
        html += '<tr><th>' + u + '</th>';
        for (var c = 0; c < nodes.length; c++) {
          var v = nodes[c];
          var weight = 0;
          if (u !== v) {
            var edgeId1 = abstractGraph._pairIndex.get(u < v ? u + '--' + v : v + '--' + u);
            if (edgeId1) {
              var eObj = abstractGraph.edge(edgeId1);
              if (eObj) weight = eObj.w;
            }
          }
          if (weight > 0) {
            html += '<td class="has-edge">' + weight + '</td>';
          } else {
            html += '<td>0</td>';
          }
        }
        html += '</tr>';
      }
      html += '</tbody></table>';
      matrixWrap.innerHTML = html;
    }

    // 2. Adjacency List
    var listWrap = document.getElementById('s03-adj-list-wrap');
    if (listWrap) {
      var listHtml = '';
      for (var k = 0; k < nodes.length; k++) {
        var nid = nodes[k];
        var nbrs = abstractGraph.neighbors(nid);
        var nbrStrs = [];
        for (var b = 0; b < nbrs.length; b++) {
          nbrStrs.push(nbrs[b].node.id + '(' + nbrs[b].edge.w + ')');
        }
        nbrStrs.sort();
        listHtml += '<div><strong>' + nid + ':</strong> ' + (nbrStrs.length ? nbrStrs.join(', ') : '<em>&empty;</em>') + '</div>';
      }
      listWrap.innerHTML = listHtml;
    }

    // 3. Readouts
    var vEl = document.getElementById('s03-readout-v');
    var eEl = document.getElementById('s03-readout-e');
    var sumEl = document.getElementById('s03-readout-sum');

    if (vEl) vEl.textContent = abstractGraph.n();
    if (eEl) eEl.textContent = abstractGraph.m();

    var sumW = 0;
    var eIt = abstractGraph._edges.values();
    for (var it = eIt.next(); !it.done; it = eIt.next()) {
      sumW += it.value.w;
    }
    if (sumEl) sumEl.textContent = sumW;
  }

  NG.slides.s03 = {
    init: function (root) {
      // 1. Render illustrated real network
      var realCanvas = document.getElementById('s03-real-canvas');
      if (realCanvas) renderRealNetworkSVG(realCanvas);

      // 2. Build abstract graph and View
      var abstractCanvas = document.getElementById('s03-abstract-canvas');
      if (!abstractCanvas) return;
      abstractCanvas.innerHTML = '';

      abstractGraph = buildInitialGraph();
      abstractView = new NG.View(abstractCanvas, abstractGraph, {
        width: 450,
        height: 220,
        viewBox: '0 0 450 220',
        draggable: true,
        showWeights: true,
        weightMode: 'fixed',
        nodeRadius: 26,
        padding: 22
      });

      // Drag handler: live recalculation of weights = round(euclid / 20)
      abstractView.onNodeDrag = function (id) {
        var nbrs = abstractGraph.neighbors(id);
        for (var i = 0; i < nbrs.length; i++) {
          var ne = nbrs[i];
          var dist = abstractGraph.euclid(ne.node.id, id);
          var newW = Math.max(1, Math.round(dist / 20));
          abstractGraph.setWeight(ne.edge.id, newW);
        }
        abstractView._updateIncidentEdges(id);
        updateMatrixAndList();
      };

      // Hover handler: 3-way linking
      abstractView.onNodeHover = function (id) {
        if (id) {
          highlightLinked('node', id);
        } else {
          clearLinkedHighlight();
        }
      };

      abstractView.onEdgeHover = function (id) {
        if (id) {
          highlightLinked('edge', id);
        } else {
          clearLinkedHighlight();
        }
      };

      // Edge editing logic
      abstractView.onNodeClick = function (id) {
        if (!editMode) return;
        if (!selectedFirstNode) {
          selectedFirstNode = id;
          abstractView.setNodeState(id, { ring: 'var(--vermilion)' });
        } else {
          var u = selectedFirstNode;
          var v = id;
          selectedFirstNode = null;
          abstractView.setNodeState(u, { ring: '' });

          if (u !== v) {
            var existing = abstractGraph._pairIndex.get(u < v ? u + '--' + v : v + '--' + u);
            if (!existing) {
              var dist = abstractGraph.euclid(u, v);
              var w = Math.max(1, Math.round(dist / 20));
              abstractGraph.addEdge(u, v, w, u + v);
              abstractView.render();
              updateMatrixAndList();
            }
          }
        }
      };

      abstractView.onEdgeClick = function (id) {
        if (!editMode) return;
        abstractGraph.removeEdge(id);
        abstractView.render();
        updateMatrixAndList();
      };

      // Edit edges button toggle
      var btnEdit = document.getElementById('s03-btn-edit');
      if (btnEdit && !btnEdit._hasClickListener) {
        btnEdit._hasClickListener = true;
        btnEdit.addEventListener('click', function () {
          editMode = !editMode;
          btnEdit.textContent = 'Edit edges: ' + (editMode ? 'ON' : 'OFF');
          btnEdit.classList.toggle('btn-primary', editMode);
          if (!editMode && selectedFirstNode) {
            abstractView.setNodeState(selectedFirstNode, { ring: '' });
            selectedFirstNode = null;
          }
        });
      }

      // Reset button
      var btnReset = document.getElementById('s03-btn-reset');
      if (btnReset && !btnReset._hasClickListener) {
        btnReset._hasClickListener = true;
        btnReset.addEventListener('click', function () {
          abstractGraph = buildInitialGraph();
          abstractView.graph = abstractGraph;
          abstractView.render();
          if (realCanvas) renderRealNetworkSVG(realCanvas);
          editMode = false;
          if (btnEdit) {
            btnEdit.textContent = 'Edit edges: OFF';
            btnEdit.classList.remove('btn-primary');
          }
          selectedFirstNode = null;
          updateMatrixAndList();
        });
      }

      setupTableHover();
      updateMatrixAndList();
    },

    destroy: function () {
      if (abstractView) {
        abstractView.destroy();
        abstractView = null;
      }
      abstractGraph = null;
    }
  };

})();
