/* ============================================================
   s04.js — Slide 4: Trees (Definition, Properties & Path Finder)
   ============================================================ */
(function () {
  'use strict';

  window.NG = window.NG || {};
  NG.slides = NG.slides || {};

  var view = null;
  var fullGraph = null;
  var activeEdges = new Set();
  var pathMode = false;
  var pathStartNode = null;
  var hoverRestoreTimeout = null;

  var MST_EDGES = ['EH', 'EF', 'BE', 'AB', 'CF', 'DE', 'GH'];

  function buildCanonical() {
    var g = new NG.Graph();
    g.addNode(120, 80, 'A', 'A');
    g.addNode(300, 50, 'B', 'B');
    g.addNode(480, 90, 'C', 'C');
    g.addNode(80, 230, 'D', 'D');
    g.addNode(260, 210, 'E', 'E');
    g.addNode(450, 240, 'F', 'F');
    g.addNode(170, 370, 'G', 'G');
    g.addNode(380, 360, 'H', 'H');

    g.addEdge('E', 'H', 1, 'EH');
    g.addEdge('E', 'F', 2, 'EF');
    g.addEdge('B', 'E', 3, 'BE');
    g.addEdge('A', 'B', 4, 'AB');
    g.addEdge('A', 'E', 5, 'AE');
    g.addEdge('C', 'F', 6, 'CF');
    g.addEdge('D', 'E', 7, 'DE');
    g.addEdge('G', 'H', 8, 'GH');
    g.addEdge('A', 'D', 9, 'AD');
    g.addEdge('B', 'C', 10, 'BC');
    g.addEdge('D', 'G', 11, 'DG');
    g.addEdge('F', 'H', 12, 'FH');
    g.addEdge('C', 'E', 13, 'CE');
    return g;
  }

  function getActiveSubgraph() {
    var sub = new NG.Graph();
    var nIter = fullGraph._nodes.values();
    for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
      var n = nit.value;
      sub.addNode(n.x, n.y, n.label, n.id);
    }
    var eIter = activeEdges.values();
    for (var eit = eIter.next(); !eit.done; eit = eIter.next()) {
      var eid = eit.value;
      var eObj = fullGraph.edge(eid);
      if (eObj) sub.addEdge(eObj.u, eObj.v, eObj.w, eid);
    }
    return sub;
  }

  function updateVisuals() {
    if (!view || !fullGraph) return;

    // Set edge states in view
    var eIter = fullGraph._edges.keys();
    for (var it = eIter.next(); !it.done; it = eIter.next()) {
      var eid = it.value;
      if (activeEdges.has(eid)) {
        view.setEdgeState(eid, 'accepted');
      } else {
        view.setEdgeState(eid, 'faded');
      }
    }

    var sub = getActiveSubgraph();
    var conn = NG.Algo.isConnected(sub);
    var acyc = !NG.Algo.hasCycle(sub);
    var m = activeEdges.size;
    var nMinus1 = fullGraph.n() - 1; // 7

    // Update status indicators
    var connEl = document.getElementById('s04-status-conn');
    var acycEl = document.getElementById('s04-status-acyc');
    var mEl = document.getElementById('s04-status-m');
    var verdEl = document.getElementById('s04-verdict');

    if (connEl) {
      connEl.textContent = conn ? 'YES' : 'NO';
      connEl.className = 'chip ' + (conn ? 'chip-yes' : 'chip-no');
    }
    if (acycEl) {
      acycEl.textContent = acyc ? 'YES' : 'NO';
      acycEl.className = 'chip ' + (acyc ? 'chip-yes' : 'chip-no');
    }
    if (mEl) {
      mEl.textContent = m + ' vs ' + nMinus1;
    }

    if (verdEl) {
      if (conn && acyc && m === nMinus1) {
        verdEl.textContent = 'TREE';
        verdEl.className = 's04-verdict-chip verdict-tree';
      } else {
        var reason = '';
        if (!conn && !acyc) reason = 'both: disconnected & has cycle';
        else if (!acyc) reason = 'has a cycle';
        else if (!conn) reason = 'disconnected';
        else reason = (m < nMinus1 ? 'too few edges' : 'too many edges');

        verdEl.textContent = 'NOT A TREE: ' + reason;
        verdEl.className = 's04-verdict-chip verdict-not-tree';
      }
    }
  }

  function findAllSimplePaths(subgraph, start, target, visited, currentPath, allPaths) {
    visited = visited || new Set();
    currentPath = currentPath || [];
    allPaths = allPaths || [];

    visited.add(start);
    currentPath.push(start);

    if (start === target) {
      allPaths.push(currentPath.slice());
    } else {
      var nbrs = subgraph.neighbors(start);
      for (var i = 0; i < nbrs.length; i++) {
        var nextId = nbrs[i].node.id;
        if (!visited.has(nextId)) {
          findAllSimplePaths(subgraph, nextId, target, visited, currentPath, allPaths);
        }
      }
    }

    currentPath.pop();
    visited.delete(start);
    return allPaths;
  }

  function handleEdgeToggle(eid) {
    if (pathMode) return;

    if (activeEdges.has(eid)) {
      activeEdges.delete(eid);
      updateVisuals();
    } else {
      // Check if adding this edge closes a cycle
      var sub = getActiveSubgraph();
      var closesCycle = false;
      var cycleEdges = null;

      // In undirected graph, cycle appears if endpoints already in same component
      var eObj = fullGraph.edge(eid);
      if (eObj) {
        var comp = NG.Algo.components(sub);
        var inSameComp = false;
        for (var c = 0; c < comp.length; c++) {
          if (comp[c].includes(eObj.u) && comp[c].includes(eObj.v)) {
            inSameComp = true;
            break;
          }
        }
        if (inSameComp) {
          closesCycle = true;
          // Find the path between endpoints to identify the cycle
          var path = NG.Algo.pathInForest(sub, eObj.u, eObj.v);
          if (path && path.edges) {
            cycleEdges = path.edges.concat([eid]);
          }
        }
      }

      activeEdges.add(eid);
      updateVisuals();

      if (closesCycle) {
        view.flashEdge(eid, 'cycle');
        if (cycleEdges && cycleEdges.length > 0) {
          for (var k = 0; k < cycleEdges.length; k++) {
            var ceid = cycleEdges[k];
            var eel = view._edgeEls.get(ceid);
            if (eel) eel.group.classList.add('path-highlight');
          }
          setTimeout(function () {
            if (!view) return;
            for (var j = 0; j < cycleEdges.length; j++) {
              var el = view._edgeEls.get(cycleEdges[j]);
              if (el) el.group.classList.remove('path-highlight');
            }
          }, 800);
        }
      }
    }
  }

  function handleNodeClick(nid) {
    if (!pathMode) return;
    var hint = document.getElementById('s04-hint-box');

    if (!pathStartNode) {
      pathStartNode = nid;
      view.setNodeState(nid, { ring: 'var(--vermilion)' });
      if (hint) hint.innerHTML = 'Path finder: Start at <strong>' + nid + '</strong>. Click a destination vertex.';
    } else if (pathStartNode === nid) {
      view.setNodeState(nid, { ring: '' });
      pathStartNode = null;
      if (hint) hint.textContent = 'Path finder: Click any two vertices to find the path.';
    } else {
      var u = pathStartNode;
      var v = nid;
      view.setNodeState(u, { ring: '' });
      pathStartNode = null;

      var sub = getActiveSubgraph();
      var isT = NG.Algo.isTree(sub);

      if (isT) {
        var path = NG.Algo.pathInForest(sub, u, v);
        if (path) {
          view.highlightPath(path);
          if (hint) {
            hint.innerHTML = 'Unique path between <strong>' + u + '</strong> and <strong>' + v + '</strong>: ' +
              path.nodes.join(' &rarr; ') + ' (' + path.edges.length + ' edges).';
          }
        }
      } else {
        // Not a tree
        var allPaths = findAllSimplePaths(sub, u, v);
        if (allPaths.length === 0) {
          if (hint) {
            hint.innerHTML = 'No path between <strong>' + u + '</strong> and <strong>' + v + '</strong> (disconnected).';
          }
        } else if (allPaths.length === 1) {
          var pNodes = allPaths[0];
          var pEdges = [];
          for (var i = 0; i < pNodes.length - 1; i++) {
            var eMatch = sub.edgesBetween(pNodes[i], pNodes[i + 1]);
            if (eMatch && eMatch[0]) pEdges.push(eMatch[0].id);
          }
          view.highlightPath({ nodes: pNodes, edges: pEdges });
          if (hint) {
            hint.innerHTML = 'Path found between <strong>' + u + '</strong> and <strong>' + v + '</strong>: ' +
              pNodes.join(' &rarr; ');
          }
        } else {
          // Multiple paths! Show that paths are NOT unique
          var pNodes1 = allPaths[0];
          var pEdges1 = [];
          for (var a = 0; a < pNodes1.length - 1; a++) {
            var e1 = sub.edgesBetween(pNodes1[a], pNodes1[a + 1]);
            if (e1 && e1[0]) pEdges1.push(e1[0].id);
          }
          view.highlightPath({ nodes: pNodes1, edges: pEdges1 });
          if (hint) {
            hint.innerHTML = '<strong style="color:var(--alarm);">Paths are not unique here!</strong> Found ' +
              allPaths.length + ' different paths between ' + u + ' and ' + v + ' (e.g. ' + pNodes1.join('&rarr;') + ' and ' + allPaths[1].join('&rarr;') + ').';
          }
        }
      }
    }
  }

  var prop3CutIndex = 0;

  function getThemeColors() {
    var teal = '#178A86';
    var mustard = '#D49A00';
    var ink = '#1C1A16';
    var paper = '#FBF6E9';
    var alarm = '#B80F2A';
    try {
      var style = getComputedStyle(document.documentElement);
      var c1 = style.getPropertyValue('--c1').trim();
      if (c1) teal = c1;
      var c2 = style.getPropertyValue('--c2').trim();
      if (c2) mustard = c2;
      var cAlarm = style.getPropertyValue('--alarm').trim();
      if (cAlarm) alarm = cAlarm;
      var cInk = style.getPropertyValue('--ink').trim();
      if (cInk) ink = cInk;
      var cPaper = style.getPropertyValue('--paper-3').trim();
      if (cPaper) paper = cPaper;
    } catch (e) {}
    return { teal: teal, mustard: mustard, ink: ink, paper: paper, alarm: alarm };
  }

  function clearPropertyPreview() {
    if (!view || !fullGraph) return;

    // Reset edge classes, styles, and crosses
    var eIter = fullGraph._edges.keys();
    for (var it = eIter.next(); !it.done; it = eIter.next()) {
      var eid = it.value;
      var el = view._edgeEls.get(eid);
      if (el) {
        el.group.classList.remove('edge-comp-teal', 'edge-comp-mustard', 'edge-comp-cut', 'path-highlight');
        el.line.style.stroke = '';
        el.line.style.strokeWidth = '';
        el.line.style.strokeDasharray = '';
        el.line.style.opacity = '';
        el.cross.style.display = 'none';
        el.cross.classList.remove('alarm');
      }
    }

    // Reset node classes, styles, and text fills
    var nIter = fullGraph._nodes.keys();
    for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
      var nid = nit.value;
      var nel = view._nodeEls.get(nid);
      if (nel) {
        nel.circle.style.fill = '';
        nel.circle.style.stroke = '';
        if (nel.text) nel.text.style.fill = '';
        nel.group.setAttribute('class', 'graph-node');
      }
    }

    // Clear overlay layer
    var overlay = view.layer('overlay');
    if (overlay) overlay.innerHTML = '';
  }

  function drawPieceOverlayBadge(comp, pieceNum, color, textColor) {
    if (!view || !comp || comp.length === 0) return;
    var overlay = view.layer('overlay');
    if (!overlay) return;

    var sx = 0, sy = 0;
    comp.forEach(function (id) {
      var n = fullGraph.node(id);
      if (n) {
        sx += n.x;
        sy += n.y;
      }
    });
    var cx = Math.round(sx / comp.length);
    var cy = Math.round(sy / comp.length);

    // Collision avoidance with component nodes
    var collides = false;
    comp.forEach(function (id) {
      var n = fullGraph.node(id);
      if (n) {
        var d = Math.hypot(n.x - cx, n.y - cy);
        if (d < 30) collides = true;
      }
    });

    if (comp.length === 1) {
      cy -= 32;
      if (cx > 450) cx -= 15;
    } else if (comp.length === 2) {
      cy -= 28;
    } else if (collides) {
      cy += 30;
    }

    // Clamp inside viewBox (560x420)
    cx = Math.max(35, Math.min(525, cx));
    cy = Math.max(25, Math.min(395, cy));

    var SVG_NS = 'http://www.w3.org/2000/svg';
    var g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 's04-piece-overlay-marker');

    var rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('x', cx - 26);
    rect.setAttribute('y', cy - 12);
    rect.setAttribute('width', 52);
    rect.setAttribute('height', 24);
    rect.setAttribute('rx', 12);
    rect.setAttribute('fill', color);
    rect.setAttribute('stroke', '#1C1A16');
    rect.setAttribute('stroke-width', '2');
    g.appendChild(rect);

    var text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', cx);
    text.setAttribute('y', cy);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('fill', textColor);
    text.setAttribute('font-family', 'var(--font-mono)');
    text.setAttribute('font-size', '11.5px');
    text.setAttribute('font-weight', '700');
    text.textContent = 'Piece ' + pieceNum;
    g.appendChild(text);

    overlay.appendChild(g);
  }

  function setupPropertyHovers() {
    var items = document.querySelectorAll('#s04-props-list .s04-prop-item');
    items.forEach(function (item) {
      var prop = item.getAttribute('data-prop');

      function onEnter() {
        if (!view || !fullGraph) return;
        clearTimeout(hoverRestoreTimeout);
        clearPropertyPreview();

        if (prop === '1') {
          // Property 1: n vertices -> n-1 edges
          var nIt = fullGraph._nodes.keys();
          for (var nit = nIt.next(); !nit.done; nit = nIt.next()) {
            view.setNodeState(nit.value, { fill: 'var(--highlighter)' });
          }
          var hint1 = document.getElementById('s04-hint-box');
          if (hint1) hint1.innerHTML = '<strong>Property 1:</strong> 8 vertices requires exactly 7 edges for a tree.';
        } else if (prop === '2') {
          // Property 2: Exactly ONE path between any two vertices (A <-> G)
          view.highlightPath({
            nodes: ['A', 'B', 'E', 'H', 'G'],
            edges: ['AB', 'BE', 'EH', 'GH']
          });
          var hint2 = document.getElementById('s04-hint-box');
          if (hint2) hint2.innerHTML = '<strong>Property 2:</strong> Unique path between A and G is A &rarr; B &rarr; E &rarr; H &rarr; G.';
        } else if (prop === '3') {
          // Property 3: Remove any edge -> falls apart into 2 pieces
          var sub = getActiveSubgraph();
          var candidates = [];
          var activeList = Array.from(activeEdges);

          for (var i = 0; i < activeList.length; i++) {
            var eid = activeList[i];
            var comps = NG.Algo.components(sub, { skipEdges: new Set([eid]) });
            if (comps && comps.length === 2) {
              candidates.push({
                eid: eid,
                c1: comps[0].slice().sort(),
                c2: comps[1].slice().sort(),
                balance: Math.min(comps[0].length, comps[1].length)
              });
            }
          }

          // Preferred cycle priority: balanced cuts first (BE, EF, EH), then leaf cuts
          var PREFERRED_ORDER = ['BE', 'EF', 'EH', 'CF', 'AB', 'DE', 'GH'];
          candidates.sort(function (a, b) {
            if (a.balance !== b.balance) return b.balance - a.balance;
            var idxA = PREFERRED_ORDER.indexOf(a.eid);
            var idxB = PREFERRED_ORDER.indexOf(b.eid);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            return a.eid.localeCompare(b.eid);
          });

          var chosen = null;
          if (candidates.length > 0) {
            chosen = candidates[prop3CutIndex % candidates.length];
            prop3CutIndex++;
          } else {
            // Fallback if no 2-component cut was found
            chosen = {
              eid: activeList[0] || 'CF',
              c1: ['C'],
              c2: ['A', 'B', 'D', 'E', 'F', 'G', 'H'],
              balance: 1
            };
          }

          // Sort pieces so smaller piece is Piece 1 (Teal), larger is Piece 2 (Mustard)
          var c1 = chosen.c1;
          var c2 = chosen.c2;
          if (c1.length > c2.length) {
            var temp = c1;
            c1 = c2;
            c2 = temp;
          }

          var colors = getThemeColors();
          var cutEdgeId = chosen.eid;

          // Identify internal tree edges for each component
          var c1Set = new Set(c1);
          var c2Set = new Set(c2);
          var c1Edges = [];
          var c2Edges = [];

          activeEdges.forEach(function (ae) {
            if (ae === cutEdgeId) return;
            var eObj = fullGraph.edge(ae);
            if (eObj) {
              if (c1Set.has(eObj.u) && c1Set.has(eObj.v)) c1Edges.push(ae);
              else if (c2Set.has(eObj.u) && c2Set.has(eObj.v)) c2Edges.push(ae);
            }
          });

          // Style Component 1 nodes (Teal fill, Ink ring, Paper text)
          c1.forEach(function (nid) {
            view.setNodeState(nid, { fill: colors.teal, ring: colors.ink, className: 'comp-teal' });
            var item = view._nodeEls.get(nid);
            if (item && item.text) item.text.style.fill = colors.paper;
          });

          // Style Component 2 nodes (Mustard fill, Ink ring, Ink text)
          c2.forEach(function (nid) {
            view.setNodeState(nid, { fill: colors.mustard, ring: colors.ink, className: 'comp-mustard' });
            var item = view._nodeEls.get(nid);
            if (item && item.text) item.text.style.fill = colors.ink;
          });

          // Style Component 1 internal edges (Teal, 5px)
          c1Edges.forEach(function (eid) {
            var item = view._edgeEls.get(eid);
            if (item) {
              item.group.classList.remove('state-accepted', 'state-faded', 'state-default');
              item.group.classList.add('edge-comp-teal');
              item.line.style.stroke = colors.teal;
              item.line.style.strokeWidth = '5px';
              item.line.style.strokeDasharray = 'none';
              item.line.style.opacity = '1';
              item.cross.style.display = 'none';
            }
          });

          // Style Component 2 internal edges (Mustard, 5px)
          c2Edges.forEach(function (eid) {
            var item = view._edgeEls.get(eid);
            if (item) {
              item.group.classList.remove('state-accepted', 'state-faded', 'state-default');
              item.group.classList.add('edge-comp-mustard');
              item.line.style.stroke = colors.mustard;
              item.line.style.strokeWidth = '5px';
              item.line.style.strokeDasharray = 'none';
              item.line.style.opacity = '1';
              item.cross.style.display = 'none';
            }
          });

          // Style Cut edge (Dashed Alarm Red with cross icon)
          view.setEdgeState(cutEdgeId, 'broken');
          var cutItem = view._edgeEls.get(cutEdgeId);
          if (cutItem) {
            cutItem.group.classList.add('edge-comp-cut');
            cutItem.line.style.stroke = colors.alarm;
            cutItem.line.style.strokeWidth = '3.5px';
            cutItem.line.style.strokeDasharray = '5 5';
            cutItem.line.style.opacity = '1';
            cutItem.cross.style.display = '';
            cutItem.cross.classList.add('alarm');
          }

          // Non-tree edges stay faint dashed grey
          var allEdgeKeys = fullGraph._edges.keys();
          for (var aek = allEdgeKeys.next(); !aek.done; aek = allEdgeKeys.next()) {
            var oEid = aek.value;
            if (!activeEdges.has(oEid)) {
              view.setEdgeState(oEid, 'faded');
            }
          }

          // Overlay markers near each piece
          drawPieceOverlayBadge(c1, 1, colors.teal, colors.paper);
          drawPieceOverlayBadge(c2, 2, colors.mustard, colors.ink);

          // Update caption with exact wording and swatch legend
          var hint3 = document.getElementById('s04-hint-box');
          if (hint3) {
            hint3.innerHTML =
              '<strong>Property 3:</strong> Cutting edge <strong>' + cutEdgeId + '</strong> splits the graph into 2 separate components ' +
              '<span class="s04-swatch-badge s04-swatch-teal" aria-label="Piece 1">' +
                '<span class="s04-swatch" style="background:' + colors.teal + ';"></span>Piece 1: {' + c1.join(',') + '}' +
              '</span> and ' +
              '<span class="s04-swatch-badge s04-swatch-mustard" aria-label="Piece 2">' +
                '<span class="s04-swatch" style="background:' + colors.mustard + ';"></span>Piece 2: {' + c2.join(',') + '}' +
              '</span>.';
          }
        } else if (prop === '4') {
          // Property 4: Add any edge -> exactly ONE cycle appears (AE creates A-B-E-A)
          view.setEdgeState('AE', 'candidate');
          view.flashEdge('AE', 'cycle');
          ['AB', 'BE'].forEach(function (eid) {
            var el = view._edgeEls.get(eid);
            if (el) el.group.classList.add('path-highlight');
          });
          var hint4 = document.getElementById('s04-hint-box');
          if (hint4) hint4.innerHTML = '<strong>Property 4:</strong> Adding edge AE creates exactly one cycle {A, B, E}.';
        }
      }

      function onLeave() {
        if (!view || !fullGraph) return;
        hoverRestoreTimeout = setTimeout(function () {
          clearPropertyPreview();
          view.clearStates();
          updateVisuals();
          var hint = document.getElementById('s04-hint-box');
          if (hint) {
            hint.textContent = pathMode ?
              'Path finder: Click any two vertices to find the path.' :
              'Click any edge in the graph to toggle it on/off.';
          }
        }, 80);
      }

      item.addEventListener('pointerenter', onEnter);
      item.addEventListener('pointerleave', onLeave);
      item.addEventListener('focus', onEnter);
      item.addEventListener('blur', onLeave);
    });
  }

  function resetToMST() {
    activeEdges.clear();
    for (var i = 0; i < MST_EDGES.length; i++) {
      activeEdges.add(MST_EDGES[i]);
    }
    pathMode = false;
    pathStartNode = null;
    var btnPath = document.getElementById('s04-btn-pathmode');
    if (btnPath) {
      btnPath.textContent = 'Path finder: OFF';
      btnPath.classList.remove('btn-primary');
    }
    var hint = document.getElementById('s04-hint-box');
    if (hint) hint.textContent = 'Click any edge in the graph to toggle it on/off.';
    if (view) {
      clearPropertyPreview();
      view.clearStates();
      updateVisuals();
    }
  }

  NG.slides.s04 = {
    init: function (root) {
      var canvas = document.getElementById('s04-canvas');
      if (!canvas) return;

      fullGraph = buildCanonical();
      activeEdges.clear();
      for (var i = 0; i < MST_EDGES.length; i++) {
        activeEdges.add(MST_EDGES[i]);
      }

      view = new NG.View(canvas, fullGraph, {
        width: 560,
        height: 420,
        viewBox: '0 0 560 420',
        draggable: false,
        showWeights: true,
        weightMode: 'fixed',
        nodeRadius: 18,
        padding: 24
      });

      view.onEdgeClick = function (eid) {
        handleEdgeToggle(eid);
      };

      view.onNodeClick = function (nid) {
        handleNodeClick(nid);
      };

      // Path finder button
      var btnPath = document.getElementById('s04-btn-pathmode');
      if (btnPath) {
        btnPath.addEventListener('click', function () {
          pathMode = !pathMode;
          pathStartNode = null;
          btnPath.textContent = 'Path finder: ' + (pathMode ? 'ON' : 'OFF');
          btnPath.classList.toggle('btn-primary', pathMode);
          var hint = document.getElementById('s04-hint-box');
          if (hint) {
            hint.textContent = pathMode ?
              'Path finder: Click any two vertices to find the path.' :
              'Click any edge in the graph to toggle it on/off.';
          }
          if (!pathMode && view) {
            clearPropertyPreview();
            view.clearStates();
            updateVisuals();
          }
        });
      }

      // Reset button
      var btnReset = document.getElementById('s04-btn-reset');
      if (btnReset) {
        btnReset.addEventListener('click', function () {
          resetToMST();
        });
      }

      setupPropertyHovers();
      updateVisuals();
    },

    resume: function () {
      if (view) updateVisuals();
    },

    pause: function () {
      clearTimeout(hoverRestoreTimeout);
      clearPropertyPreview();
    },

    destroy: function () {
      clearTimeout(hoverRestoreTimeout);
      clearPropertyPreview();
      if (view) {
        view.destroy();
        view = null;
      }
      fullGraph = null;
      activeEdges.clear();
    }
  };

})();
