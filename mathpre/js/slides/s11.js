(function () {
  window.NG = window.NG || {};
  NG.slides = NG.slides || {};

  var CANONICAL_NODES = [
    { id: 'A', x: 120, y: 80 },
    { id: 'B', x: 300, y: 50 },
    { id: 'C', x: 480, y: 90 },
    { id: 'D', x: 80, y: 230 },
    { id: 'E', x: 260, y: 210 },
    { id: 'F', x: 450, y: 240 },
    { id: 'G', x: 170, y: 370 },
    { id: 'H', x: 380, y: 360 }
  ];

  var CANONICAL_EDGES = [
    { u: 'E', v: 'H', w: 1 },
    { u: 'E', v: 'F', w: 2 },
    { u: 'B', v: 'E', w: 3 },
    { u: 'A', v: 'B', w: 4 },
    { u: 'A', v: 'E', w: 5 },
    { u: 'C', v: 'F', w: 6 },
    { u: 'D', v: 'E', w: 7 },
    { u: 'G', v: 'H', w: 8 },
    { u: 'A', v: 'D', w: 9 },
    { u: 'B', v: 'C', w: 10 },
    { u: 'D', v: 'G', w: 11 },
    { u: 'F', v: 'H', w: 12 },
    { u: 'C', v: 'E', w: 13 }
  ];

  var MST_EDGES = ['EH', 'EF', 'BE', 'AB', 'CF', 'DE', 'GH'];
  var COMP_PALETTES = [
    { fill: '#178A86', ring: '#0e5653', text: '#ffffff', className: 'comp-teal' },
    { fill: '#D49A00', ring: '#8a6400', text: '#1c1a16', className: 'comp-mustard' },
    { fill: '#7D3C98', ring: '#512763', text: '#ffffff', className: 'comp-plum' },
    { fill: '#2E6918', ring: '#1b400e', text: '#ffffff', className: 'comp-leaf' },
    { fill: '#2F6BD6', ring: '#1b4992', text: '#ffffff', className: 'comp-cobalt' },
    { fill: '#E4411F', ring: '#9c2110', text: '#ffffff', className: 'comp-vermilion' },
    { fill: '#E65100', ring: '#993600', text: '#ffffff', className: 'comp-orange' },
    { fill: '#5E35B1', ring: '#3b1f73', text: '#ffffff', className: 'comp-deep-purple' }
  ];

  function buildCanonicalGraph() {
    var g = new NG.Graph();
    for (var i = 0; i < CANONICAL_NODES.length; i++) {
      var n = CANONICAL_NODES[i];
      g.addNode(n.x, n.y, n.id, n.id);
    }
    for (var j = 0; j < CANONICAL_EDGES.length; j++) {
      var e = CANONICAL_EDGES[j];
      g.addEdge(e.u, e.v, e.w);
    }
    return g;
  }

  function buildTreeGraph() {
    var g = new NG.Graph();
    for (var i = 0; i < CANONICAL_NODES.length; i++) {
      var n = CANONICAL_NODES[i];
      g.addNode(n.x, n.y, n.id, n.id);
    }
    for (var j = 0; j < CANONICAL_EDGES.length; j++) {
      var e = CANONICAL_EDGES[j];
      var id1 = e.u + e.v;
      var id2 = e.v + e.u;
      if (MST_EDGES.indexOf(id1) !== -1 || MST_EDGES.indexOf(id2) !== -1) {
        g.addEdge(e.u, e.v, e.w);
      }
    }
    return g;
  }

  // DOM Elements
  var elGraphBoxA = null;
  var elBtnResetA = null;
  var elCompCount = null;
  var elCompSizes = null;
  var elUnreachablePairs = null;

  var elGraphBoxB = null;
  var elBtnWorstPair = null;
  var elBtnResetB = null;
  var elDetourPair = null;
  var elDetourP = null;
  var elDetourS = null;
  var elDetourRatio = null;

  // View & State for Demo A
  var viewA = null;
  var graphA = null;
  var treeGraph = null;
  var cutEdges = new Set();
  var crossElements = new Map(); // edgeId -> SVG element

  // View & State for Demo B
  var viewB = null;
  var graphB = null;
  var selectedNodesB = []; // [u, v]
  var detourOverlayGroup = null;

  function ensureInitialized() {
    if (!viewA) {
      var rootEl = document.getElementById('s11');
      if (rootEl) NG.slides.s11.init(rootEl);
    }
  }

  /* ----------------------------------------------------------------
     Demo A: Break a Link
     ---------------------------------------------------------------- */
  function initDemoA() {
    graphA = buildCanonicalGraph();
    treeGraph = buildTreeGraph();
    cutEdges.clear();
    crossElements.clear();

    if (elGraphBoxA) {
      elGraphBoxA.innerHTML = '';
      viewA = new NG.View(elGraphBoxA, graphA, {
        width: 560,
        height: 420,
        viewBox: '0 0 560 420',
        draggable: false,
        showWeights: true,
        nodeRadius: 28
      });
      viewA.render();

      viewA.onEdgeClick = function (edgeId) {
        toggleCutEdge(edgeId);
      };

      updateDemoAView();
    }
  }

  function toggleCutEdge(edgeId) {
    if (MST_EDGES.indexOf(edgeId) === -1) {
      // Non-tree edge cannot be cut in this demo
      return;
    }
    if (cutEdges.has(edgeId)) {
      cutEdges.delete(edgeId);
    } else {
      cutEdges.add(edgeId);
    }
    updateDemoAView();
  }

  function updateDemoAView() {
    if (!viewA || !graphA) return;
    var overlay = viewA.layer('overlay');

    // 1. Calculate components on tree graph with cutEdges skipped
    var comps = NG.Algo.components(treeGraph, { skipEdges: Array.from(cutEdges) });

    // 2. Color vertices by component
    for (var cIdx = 0; cIdx < comps.length; cIdx++) {
      var pal = COMP_PALETTES[cIdx % COMP_PALETTES.length];
      var compNodes = comps[cIdx];
      for (var ni = 0; ni < compNodes.length; ni++) {
        var cNid = compNodes[ni];
        viewA.setNodeState(cNid, { fill: pal.fill, ring: pal.ring, className: pal.className });
        var nItem = viewA._nodeEls.get(cNid);
        if (nItem && nItem.text) {
          nItem.text.style.fill = pal.text;
        }
      }
    }

    // 3. Style edges
    var eIter = graphA._edges.values();
    for (var it = eIter.next(); !it.done; it = eIter.next()) {
      var e = it.value;
      if (MST_EDGES.indexOf(e.id) !== -1) {
        if (cutEdges.has(e.id)) {
          viewA.setEdgeState(e.id, 'cut');
          showCutCross(e);
        } else {
          viewA.setEdgeState(e.id, 'accepted');
          hideCutCross(e.id);
        }
      } else {
        viewA.setEdgeState(e.id, 'faded');
        hideCutCross(e.id);
      }
    }

    // 4. Update Readouts
    var totalPairs = (CANONICAL_NODES.length * (CANONICAL_NODES.length - 1)) / 2; // 28
    var reachablePairs = 0;
    var sizesArr = [];
    for (var k = 0; k < comps.length; k++) {
      var sz = comps[k].length;
      sizesArr.push(sz);
      reachablePairs += (sz * (sz - 1)) / 2;
    }
    var unreachable = totalPairs - reachablePairs;
    var unreachablePct = ((unreachable / totalPairs) * 100).toFixed(1);

    if (elCompCount) elCompCount.textContent = comps.length;
    if (elCompSizes) elCompSizes.textContent = sizesArr.join(' and ');
    if (elUnreachablePairs) {
      elUnreachablePairs.textContent = unreachable + ' of ' + totalPairs + ' (' + unreachablePct + '%)';
    }

    // 5. Dynamic Takeaway
    var elTakeawayA = document.getElementById('s11-takeaway-a');
    if (elTakeawayA) {
      if (cutEdges.size === 0) {
        elTakeawayA.textContent = 'Cut any cable to see the network split.';
      } else {
        elTakeawayA.textContent = 'The network is now in ' + comps.length + ' separate pieces.';
      }
    }
  }

  function showCutCross(edge) {
    if (crossElements.has(edge.id)) return;
    var overlay = viewA.layer('overlay');
    var uNode = graphA.node(edge.u);
    var vNode = graphA.node(edge.v);
    if (!uNode || !vNode) return;

    var mx = (uNode.x + vNode.x) / 2;
    var my = (uNode.y + vNode.y) / 2;

    var svgNS = 'http://www.w3.org/2000/svg';
    var gCross = document.createElementNS(svgNS, 'g');
    gCross.setAttribute('class', 'cut-cross-group');

    // Circle backdrop
    var circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', mx);
    circle.setAttribute('cy', my);
    circle.setAttribute('r', '10');
    circle.setAttribute('fill', '#fff');
    circle.setAttribute('stroke', 'var(--alarm)');
    circle.setAttribute('stroke-width', '1.5');
    gCross.appendChild(circle);

    // Cross lines
    var l1 = document.createElementNS(svgNS, 'line');
    l1.setAttribute('x1', mx - 5); l1.setAttribute('y1', my - 5);
    l1.setAttribute('x2', mx + 5); l1.setAttribute('y2', my + 5);
    l1.setAttribute('class', 'cut-cross');
    gCross.appendChild(l1);

    var l2 = document.createElementNS(svgNS, 'line');
    l2.setAttribute('x1', mx + 5); l2.setAttribute('y1', my - 5);
    l2.setAttribute('x2', mx - 5); l2.setAttribute('y2', my + 5);
    l2.setAttribute('class', 'cut-cross');
    gCross.appendChild(l2);

    overlay.appendChild(gCross);
    crossElements.set(edge.id, gCross);
  }

  function hideCutCross(edgeId) {
    if (crossElements.has(edgeId)) {
      var el = crossElements.get(edgeId);
      if (el && el.parentNode) el.parentNode.removeChild(el);
      crossElements.delete(edgeId);
    }
  }

  function resetDemoA() {
    cutEdges.clear();
    crossElements.forEach(function (el) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    crossElements.clear();
    updateDemoAView();
  }

  /* ----------------------------------------------------------------
     Demo B: Detour
     ---------------------------------------------------------------- */
  function initDemoB() {
    graphB = buildCanonicalGraph();
    selectedNodesB = [];

    if (elGraphBoxB) {
      elGraphBoxB.innerHTML = '';
      viewB = new NG.View(elGraphBoxB, graphB, {
        width: 560,
        height: 420,
        viewBox: '0 0 560 420',
        draggable: false,
        showWeights: true,
        nodeRadius: 28
      });
      viewB.render();

      detourOverlayGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      viewB.layer('overlay').appendChild(detourOverlayGroup);

      viewB.onNodeClick = function (nodeId) {
        handleNodeClickB(nodeId);
      };

      // Initial state: select worst pair (A, D)
      selectWorstPair();
    }
  }

  function handleNodeClickB(nodeId) {
    var idx = selectedNodesB.indexOf(nodeId);
    if (idx !== -1) {
      selectedNodesB.splice(idx, 1);
    } else {
      if (selectedNodesB.length >= 2) {
        selectedNodesB = [nodeId];
      } else {
        selectedNodesB.push(nodeId);
      }
    }
    updateDemoBView();
  }

  function updateDemoBView() {
    if (!viewB || !graphB) return;
    viewB.clearStates();
    var overlay = viewB.layer('overlay');

    // Reset node styling - cobalt fill with white/paper text, no black circles
    for (var i = 0; i < CANONICAL_NODES.length; i++) {
      var nid = CANONICAL_NODES[i].id;
      if (selectedNodesB.indexOf(nid) !== -1) {
        viewB.setNodeState(nid, { fill: '#2F6BD6', ring: '#1C1A16', className: 'node-selected-b' });
        var itm = viewB._nodeEls.get(nid);
        if (itm && itm.text) itm.text.style.fill = '#FBF6E9';
      } else {
        viewB.setNodeState(nid, { fill: '#FBF6E9', ring: '#1C1A16' });
        var itm2 = viewB._nodeEls.get(nid);
        if (itm2 && itm2.text) itm2.text.style.fill = '#1C1A16';
      }
    }

    // Add 1 and 2 badges on selected nodes
    for (var s = 0; s < selectedNodesB.length; s++) {
      var snode = graphB.node(selectedNodesB[s]);
      if (!snode) continue;
      var badgeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      badgeG.setAttribute('class', 's11-node-badge');
      badgeG.setAttribute('transform', 'translate(' + (snode.x + 18) + ',' + (snode.y - 18) + ')');

      var bCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      bCircle.setAttribute('r', '9');
      bCircle.setAttribute('fill', '#E4411F');
      bCircle.setAttribute('stroke', '#FFFFFF');
      bCircle.setAttribute('stroke-width', '1.5');
      badgeG.appendChild(bCircle);

      var bTxt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      bTxt.setAttribute('text-anchor', 'middle');
      bTxt.setAttribute('dominant-baseline', 'central');
      bTxt.setAttribute('font-family', 'var(--font-mono)');
      bTxt.setAttribute('font-weight', '700');
      bTxt.setAttribute('font-size', '11');
      bTxt.setAttribute('fill', '#FFFFFF');
      bTxt.textContent = String(s + 1);
      badgeG.appendChild(bTxt);

      overlay.appendChild(badgeG);
    }

    var elTakeawayB = document.getElementById('s11-takeaway-b');

    if (selectedNodesB.length < 2) {
      if (elDetourPair) elDetourPair.textContent = selectedNodesB.length === 1 ? ('Selected: ' + selectedNodesB[0] + ' (click 2nd)') : 'None selected';
      if (elDetourP) elDetourP.textContent = '—';
      if (elDetourS) elDetourS.textContent = '—';
      if (elDetourRatio) elDetourRatio.textContent = '—';
      if (elTakeawayB) elTakeawayB.textContent = 'Pick two vertices, or press Worst pair.';
      return;
    }

    var u = selectedNodesB[0];
    var v = selectedNodesB[1];

    // 1. Path in MST
    var pPath = NG.Algo.pathInForest(graphB, u, v, { onlyEdges: MST_EDGES });
    var pEdges = pPath ? pPath.edges : [];
    var pLen = 0;
    for (var pe = 0; pe < pEdges.length; pe++) {
      pLen += graphB.edge(pEdges[pe]).w;
    }

    // 2. Shortest path in Full Graph via Dijkstra
    var dRes = NG.Algo.dijkstra(graphB, u);
    var sLen = dRes.dist.get(v);

    // Reconstruct shortest path edges
    var sEdges = [];
    var curr = v;
    while (curr !== u) {
      var edgeId = dRes.prevEdge.get(curr);
      if (!edgeId) break;
      sEdges.unshift(edgeId);
      var eObj = graphB.edge(edgeId);
      curr = (eObj.u === curr) ? eObj.v : eObj.u;
    }

    // Style graph edges
    var eIter = graphB._edges.values();
    for (var it = eIter.next(); !it.done; it = eIter.next()) {
      var eid = it.value.id;
      var inP = pEdges.indexOf(eid) !== -1;
      var inS = sEdges.indexOf(eid) !== -1;

      if (inP && inS) {
        // Both: draw solid vermilion
        viewB.setEdgeState(eid, 'accepted');
      } else if (inP) {
        // Tree only: thick vermilion
        viewB.setEdgeState(eid, 'accepted');
      } else if (inS) {
        // Shortest path only: dashed cobalt
        viewB.setEdgeState(eid, 'frontier');
      } else {
        viewB.setEdgeState(eid, 'faded');
      }
    }

    // Readouts
    var ratio = sLen > 0 ? (pLen / sLen) : 1;
    var pct = Math.round((ratio - 1) * 100);

    if (elDetourPair) elDetourPair.textContent = u + ' – ' + v;
    if (elDetourP) elDetourP.textContent = pLen;
    if (elDetourS) elDetourS.textContent = sLen;
    if (elDetourRatio) {
      elDetourRatio.textContent = ratio.toFixed(2) + 'x (+' + pct + '%)';
      elDetourRatio.className = ratio > 1.2 ? 'chip chip-alarm' : 'chip';
    }

    if (elTakeawayB) {
      elTakeawayB.textContent = 'The tree path is ' + pLen + ' long, but a direct route of ' + sLen + ' exists.';
    }
  }

  function selectWorstPair() {
    var maxRatio = 0;
    var bestU = null;
    var bestV = null;

    for (var i = 0; i < CANONICAL_NODES.length; i++) {
      for (var j = i + 1; j < CANONICAL_NODES.length; j++) {
        var u = CANONICAL_NODES[i].id;
        var v = CANONICAL_NODES[j].id;

        var pPath = NG.Algo.pathInForest(graphB, u, v, { onlyEdges: MST_EDGES });
        var pLen = 0;
        if (pPath && pPath.edges) {
          for (var k = 0; k < pPath.edges.length; k++) {
            pLen += graphB.edge(pPath.edges[k]).w;
          }
        }

        var dRes = NG.Algo.dijkstra(graphB, u);
        var sLen = dRes.dist.get(v);
        var ratio = sLen > 0 ? (pLen / sLen) : 1;

        if (ratio > maxRatio) {
          maxRatio = ratio;
          bestU = u;
          bestV = v;
        }
      }
    }

    if (bestU && bestV) {
      selectedNodesB = [bestU, bestV];
      updateDemoBView();
    }
  }

  function resetDemoB() {
    selectedNodesB = [];
    updateDemoBView();
  }

  NG.slides.s11 = {
    init: function (root) {
      elGraphBoxA = document.getElementById('s11-graph-a');
      elBtnResetA = document.getElementById('s11-btn-reset-a');
      elCompCount = document.getElementById('s11-comp-count');
      elCompSizes = document.getElementById('s11-comp-sizes');
      elUnreachablePairs = document.getElementById('s11-unreachable-pairs');

      elGraphBoxB = document.getElementById('s11-graph-b');
      elBtnWorstPair = document.getElementById('s11-btn-worst-pair');
      elBtnResetB = document.getElementById('s11-btn-reset-b');
      elDetourPair = document.getElementById('s11-detour-pair');
      elDetourP = document.getElementById('s11-detour-p');
      elDetourS = document.getElementById('s11-detour-s');
      elDetourRatio = document.getElementById('s11-detour-ratio');

      initDemoA();
      initDemoB();

      if (elBtnResetA) elBtnResetA.addEventListener('click', resetDemoA);
      if (elBtnWorstPair) elBtnWorstPair.addEventListener('click', selectWorstPair);
      if (elBtnResetB) elBtnResetB.addEventListener('click', resetDemoB);
    },

    destroy: function () {
      if (viewA) { viewA.destroy(); viewA = null; }
      if (viewB) { viewB.destroy(); viewB = null; }
    },

    // Exposed helpers for acceptance verification
    cutEdge: function (edgeId) {
      ensureInitialized();
      cutEdges.add(edgeId);
      updateDemoAView();
    },
    repairEdge: function (edgeId) {
      ensureInitialized();
      cutEdges.delete(edgeId);
      updateDemoAView();
    },
    getComponents: function () {
      ensureInitialized();
      return NG.Algo.components(treeGraph, { skipEdges: Array.from(cutEdges) });
    },
    resetCuts: function () {
      ensureInitialized();
      resetDemoA();
    },
    selectPair: function (u, v) {
      ensureInitialized();
      selectedNodesB = [u, v];
      updateDemoBView();
    },
    getWorstPairResult: function () {
      ensureInitialized();
      selectWorstPair();
      return {
        pair: selectedNodesB.slice(),
        P: elDetourP ? parseInt(elDetourP.textContent, 10) : 0,
        S: elDetourS ? parseInt(elDetourS.textContent, 10) : 0
      };
    },
    getAllPairsDetour: function () {
      ensureInitialized();
      var results = [];
      for (var i = 0; i < CANONICAL_NODES.length; i++) {
        for (var j = i + 1; j < CANONICAL_NODES.length; j++) {
          var u = CANONICAL_NODES[i].id;
          var v = CANONICAL_NODES[j].id;
          var pPath = NG.Algo.pathInForest(graphB, u, v, { onlyEdges: MST_EDGES });
          var pLen = 0;
          for (var k = 0; k < pPath.edges.length; k++) {
            pLen += graphB.edge(pPath.edges[k]).w;
          }
          var dRes = NG.Algo.dijkstra(graphB, u);
          var sLen = dRes.dist.get(v);
          results.push({ u: u, v: v, P: pLen, S: sLen, ratio: pLen / sLen });
        }
      }
      return results;
    }
  };
})();
