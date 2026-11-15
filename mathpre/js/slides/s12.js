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
  var NON_TREE_CANDIDATES = ['AE', 'AD', 'BC', 'DG', 'FH', 'CE'];

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

  // DOM Elements - Tabs
  var elTabBtns = [];
  var elTabContents = [];

  // Tab 1 Elements
  var elBtnAddBackup = null;
  var elBtnResetBackup = null;
  var elBtnToggleFailure = null;
  var elCostVal = null;
  var elIncreaseVal = null;
  var elBridgesVal = null;
  var elSurvivesChip = null;
  var elFailureMsg = null;
  var elBackupGraphWrap = null;

  // Tab 2 Elements
  var elSptRootSel = null;
  var elBtnToggleSpt = null;
  var elSptWeight = null;
  var elSptAvg = null;
  var elSptMax = null;
  var elSptGraphWrap = null;

  // Tab 3 Elements
  var elBtnSnapSteiner = null;
  var elBtnEquilateral = null;
  var elBtnObtuse = null;
  var elSteinerMstLen = null;
  var elSteinerLen = null;
  var elSteinerSavingChip = null;
  var elSteinerNotice = null;
  var elSteinerBoard = null;

  // State - Tab 1
  var view1 = null;
  var graph1 = null;
  var activeBackupEdges = [];
  var testFailureMode = false;
  var failedEdgeId = null;
  var bridgeMarkerElements = new Map();

  // State - Tab 2
  var view2 = null;
  var graph2 = null;
  var sptRoot = 'A';
  var viewModeSpt = false; // false = MST, true = SPT

  // State - Tab 3
  var steinerSvg = null;
  var steinerTerminals = { A: { x: 280, y: 74 }, B: { x: 180, y: 247 }, C: { x: 380, y: 247 } };
  var steinerPoint = { x: 280, y: 190 };
  var steinerScale = 150; // 150px = 1 unit
  var draggingSteinerKey = null; // 'A', 'B', 'C', or 'S'
  var steinerElements = {};

  function ensureInitialized() {
    if (!view1) {
      var rootEl = document.getElementById('s12');
      if (rootEl) NG.slides.s12.init(rootEl);
    }
  }

  function switchTab(tabIndex) {
    for (var i = 0; i < elTabBtns.length; i++) {
      elTabBtns[i].classList.toggle('active', i === tabIndex - 1);
    }
    for (var j = 0; j < elTabContents.length; j++) {
      elTabContents[j].classList.toggle('active', j === tabIndex - 1);
    }
    if (tabIndex === 1 && view1) view1.update();
    if (tabIndex === 2 && view2) view2.update();
    if (tabIndex === 3) updateSteinerView();
  }

  /* ----------------------------------------------------------------
     Tab 1: Add Backup Links
     ---------------------------------------------------------------- */
  function initTab1() {
    graph1 = buildCanonicalGraph();
    activeBackupEdges = MST_EDGES.slice();
    testFailureMode = false;
    failedEdgeId = null;

    if (elBackupGraphWrap) {
      elBackupGraphWrap.innerHTML = '';
      view1 = new NG.View(elBackupGraphWrap, graph1, {
        width: 540,
        height: 310,
        viewBox: '0 0 560 420',
        draggable: false,
        showWeights: true,
        nodeRadius: 18
      });
      view1.render();

      view1.onEdgeClick = function (edgeId) {
        if (!testFailureMode) return;
        handleFailureEdgeClick(edgeId);
      };

      updateTab1View();
    }
  }

  function updateTab1View() {
    if (!view1 || !graph1) return;

    // 1. Calculate bridges among currently active edges (excluding failedEdgeId if failure mode)
    var effectiveEdges = activeBackupEdges.filter(function (e) { return e !== failedEdgeId; });
    var bridgesList = NG.Algo.bridges(graph1, { onlyEdges: effectiveEdges });
    var bridgesSet = new Set(bridgesList);

    // 2. Clear old markers
    bridgeMarkerElements.forEach(function (el) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    bridgeMarkerElements.clear();

    // 3. Style edges
    var eIter = graph1._edges.values();
    var overlay = view1.layer('overlay');

    for (var it = eIter.next(); !it.done; it = eIter.next()) {
      var e = it.value;
      if (e.id === failedEdgeId) {
        view1.setEdgeState(e.id, 'cut');
      } else if (activeBackupEdges.indexOf(e.id) !== -1) {
        if (bridgesSet.has(e.id)) {
          // Bridge edge: thick vermilion with marker
          view1.setEdgeState(e.id, 'accepted');
          renderBridgeMarker(e, overlay);
        } else {
          // Protected edge (2-edge-connected)
          view1.setEdgeState(e.id, 'accepted');
        }
      } else {
        view1.setEdgeState(e.id, 'faded');
      }
    }

    // 4. Calculate cost & metrics
    var totalCost = 0;
    for (var a = 0; a < activeBackupEdges.length; a++) {
      totalCost += graph1.edge(activeBackupEdges[a]).w;
    }
    var incPct = (((totalCost - 31) / 31) * 100).toFixed(1);
    var survives = (bridgesList.length === 0 && failedEdgeId === null);

    if (elCostVal) elCostVal.textContent = '₹' + totalCost;
    if (elIncreaseVal) elIncreaseVal.textContent = '+' + incPct + '%';
    if (elBridgesVal) elBridgesVal.textContent = bridgesList.length;
    if (elSurvivesChip) {
      elSurvivesChip.className = survives ? 'chip chip-success' : 'chip chip-alarm';
      elSurvivesChip.textContent = survives ? 'Yes' : 'No';
    }

    if (elBtnAddBackup) {
      elBtnAddBackup.disabled = (bridgesList.length === 0);
    }
  }

  function renderBridgeMarker(edge, overlay) {
    if (bridgeMarkerElements.has(edge.id)) return;
    var uNode = graph1.node(edge.u);
    var vNode = graph1.node(edge.v);
    if (!uNode || !vNode) return;

    var mx = (uNode.x + vNode.x) / 2;
    var my = (uNode.y + vNode.y) / 2;

    var svgNS = 'http://www.w3.org/2000/svg';
    var gMarker = document.createElementNS(svgNS, 'g');
    gMarker.setAttribute('class', 'bridge-marker');
    gMarker.setAttribute('transform', 'translate(' + mx + ',' + my + ')');

    // Warning diamond badge
    var path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M0,-9 L9,0 L0,9 L-9,0 Z');
    path.setAttribute('fill', 'var(--vermilion)');
    path.setAttribute('stroke', '#fff');
    path.setAttribute('stroke-width', '1.5');
    gMarker.appendChild(path);

    var txt = document.createElementNS(svgNS, 'text');
    txt.setAttribute('x', '0');
    txt.setAttribute('y', '3');
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('font-family', 'var(--font-mono)');
    txt.setAttribute('font-size', '9px');
    txt.setAttribute('font-weight', '700');
    txt.setAttribute('fill', '#fff');
    txt.textContent = '!';
    gMarker.appendChild(txt);

    overlay.appendChild(gMarker);
    bridgeMarkerElements.set(edge.id, gMarker);
  }

  function addGreedyBackupLink() {
    var curBridges = NG.Algo.bridges(graph1, { onlyEdges: activeBackupEdges });
    if (curBridges.length === 0) return null;

    var bestCand = null;
    var bestWeight = Infinity;

    for (var i = 0; i < NON_TREE_CANDIDATES.length; i++) {
      var candId = NON_TREE_CANDIDATES[i];
      if (activeBackupEdges.indexOf(candId) !== -1) continue;

      var trialEdges = activeBackupEdges.concat([candId]);
      var trialBridges = NG.Algo.bridges(graph1, { onlyEdges: trialEdges });

      // Must remove at least one bridge
      if (trialBridges.length < curBridges.length) {
        var w = graph1.edge(candId).w;
        if (w < bestWeight) {
          bestWeight = w;
          bestCand = candId;
        }
      }
    }

    if (bestCand) {
      activeBackupEdges.push(bestCand);
      updateTab1View();
    }
    return bestCand;
  }

  function handleFailureEdgeClick(edgeId) {
    if (activeBackupEdges.indexOf(edgeId) === -1) return;

    if (failedEdgeId === edgeId) {
      // Repair
      failedEdgeId = null;
      if (elFailureMsg) elFailureMsg.style.display = 'none';
    } else {
      // Cut this edge
      failedEdgeId = edgeId;
      var remaining = activeBackupEdges.filter(function (e) { return e !== failedEdgeId; });
      var comps = NG.Algo.components(graph1, { skipEdges: [failedEdgeId].concat(NON_TREE_CANDIDATES.filter(function (c) { return activeBackupEdges.indexOf(c) === -1; })) });

      if (elFailureMsg) {
        elFailureMsg.style.display = 'block';
        if (comps.length > 1) {
          elFailureMsg.className = 's12-test-msg alarm';
          elFailureMsg.textContent = 'Cut ' + edgeId + ': Network severed into ' + comps.length + ' pieces! Edge was a single point of failure.';
        } else {
          elFailureMsg.className = 's12-test-msg success';
          elFailureMsg.textContent = 'Cut ' + edgeId + ': Network stays connected! Traffic reroutes via backup links.';
        }
      }
    }
    updateTab1View();
  }

  function resetTab1() {
    activeBackupEdges = MST_EDGES.slice();
    failedEdgeId = null;
    testFailureMode = false;
    if (elBtnToggleFailure) {
      elBtnToggleFailure.textContent = 'Test a failure: OFF';
      elBtnToggleFailure.classList.remove('btn-primary');
    }
    if (elFailureMsg) elFailureMsg.style.display = 'none';
    updateTab1View();
  }

  /* ----------------------------------------------------------------
     Tab 2: Shortest-Path Tree (SPT)
     ---------------------------------------------------------------- */
  function initTab2() {
    graph2 = buildCanonicalGraph();
    sptRoot = 'A';
    viewModeSpt = false;

    if (elSptGraphWrap) {
      elSptGraphWrap.innerHTML = '';
      view2 = new NG.View(elSptGraphWrap, graph2, {
        width: 540,
        height: 310,
        viewBox: '0 0 560 420',
        draggable: false,
        showWeights: true,
        nodeRadius: 18
      });
      view2.render();

      view2.onNodeClick = function (nodeId) {
        sptRoot = nodeId;
        if (elSptRootSel) elSptRootSel.value = nodeId;
        updateTab2View();
      };

      updateTab2View();
    }
  }

  function updateTab2View() {
    if (!view2 || !graph2) return;

    // 1. Calculate MST root distances
    var dMst = NG.Algo.dijkstra(graph2, sptRoot); // Dijkstra with full graph
    // But we need distances strictly along MST edges:
    var mstEdgesList = [];
    var mstTotalWeight = 0;
    for (var m = 0; m < MST_EDGES.length; m++) {
      mstEdgesList.push(MST_EDGES[m]);
      mstTotalWeight += graph2.edge(MST_EDGES[m]).w;
    }

    // Recompute Dijkstra on MST edges only:
    var nNodes = CANONICAL_NODES.length;
    var mstDistances = [];
    var maxMstDist = 0;
    var sumMstDist = 0;

    for (var i = 0; i < nNodes; i++) {
      var nid = CANONICAL_NODES[i].id;
      if (nid === sptRoot) continue;
      var pPath = NG.Algo.pathInForest(graph2, sptRoot, nid, { onlyEdges: MST_EDGES });
      var dLen = 0;
      if (pPath && pPath.edges) {
        for (var pe = 0; pe < pPath.edges.length; pe++) {
          dLen += graph2.edge(pPath.edges[pe]).w;
        }
      }
      mstDistances.push(dLen);
      sumMstDist += dLen;
      if (dLen > maxMstDist) maxMstDist = dLen;
    }
    var avgMstDist = sumMstDist / (nNodes - 1);

    // 2. Calculate SPT from root
    var sptRes = NG.Algo.shortestPathTree(graph2, sptRoot);
    var dFull = NG.Algo.dijkstra(graph2, sptRoot);
    var sumSptDist = 0;
    var maxSptDist = 0;

    for (var j = 0; j < nNodes; j++) {
      var sid = CANONICAL_NODES[j].id;
      if (sid === sptRoot) continue;
      var sDist = dFull.dist.get(sid);
      sumSptDist += sDist;
      if (sDist > maxSptDist) maxSptDist = sDist;
    }
    var avgSptDist = sumSptDist / (nNodes - 1);

    // 3. Update Visuals
    var treeEdges = viewModeSpt ? sptRes.edges : MST_EDGES;
    var treeEdgesSet = new Set(treeEdges);

    var eIter = graph2._edges.values();
    for (var it = eIter.next(); !it.done; it = eIter.next()) {
      var e = it.value;
      if (treeEdgesSet.has(e.id)) {
        view2.setEdgeState(e.id, 'accepted');
      } else {
        view2.setEdgeState(e.id, 'faded');
      }
    }

    // Root vertex styling
    for (var k = 0; k < nNodes; k++) {
      var nodeKey = CANONICAL_NODES[k].id;
      if (nodeKey === sptRoot) {
        view2.setNodeState(nodeKey, { fill: 'var(--highlighter-yellow)', ring: 'var(--vermilion)' });
      } else {
        view2.setNodeState(nodeKey, { fill: 'var(--paper-2)', ring: 'var(--ink)' });
      }
    }

    // 4. Update Readouts
    if (elBtnToggleSpt) {
      elBtnToggleSpt.textContent = viewModeSpt ? 'View: Shortest-Path Tree (SPT)' : 'View: MST';
      elBtnToggleSpt.classList.toggle('btn-primary', viewModeSpt);
    }
    if (elSptWeight) {
      elSptWeight.textContent = viewModeSpt ? (sptRes.total + ' (MST is 31)') : (mstTotalWeight + ' (cheapest)');
    }
    if (elSptAvg) {
      elSptAvg.textContent = viewModeSpt ? (avgSptDist.toFixed(1) + ' (optimal)') : (avgMstDist.toFixed(1));
    }
    if (elSptMax) {
      elSptMax.textContent = viewModeSpt ? (maxSptDist + ' (optimal)') : maxMstDist;
    }
  }

  /* ----------------------------------------------------------------
     Tab 3: Steiner Tree
     ---------------------------------------------------------------- */
  function getTriangleAngle(v, p1, p2) {
    var v1x = p1.x - v.x, v1y = p1.y - v.y;
    var v2x = p2.x - v.x, v2y = p2.y - v.y;
    var dot = v1x * v2x + v1y * v2y;
    var m1 = Math.hypot(v1x, v1y);
    var m2 = Math.hypot(v2x, v2y);
    if (m1 === 0 || m2 === 0) return 0;
    var cos = Math.max(-1, Math.min(1, dot / (m1 * m2)));
    return Math.acos(cos) * (180 / Math.PI);
  }

  function computeBestSteinerPoint(A, B, C) {
    var angA = getTriangleAngle(A, B, C);
    var angB = getTriangleAngle(B, A, C);
    var angC = getTriangleAngle(C, A, B);

    if (angA >= 120) return { pt: { x: A.x, y: A.y }, terminal: 'A', angle: angA, helps: false };
    if (angB >= 120) return { pt: { x: B.x, y: B.y }, terminal: 'B', angle: angB, helps: false };
    if (angC >= 120) return { pt: { x: C.x, y: C.y }, terminal: 'C', angle: angC, helps: false };

    // Weiszfeld iterations: 200 iterations, stop at 1e-6
    var curr = { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 };
    var pts = [A, B, C];

    for (var iter = 0; iter < 200; iter++) {
      var sw = 0, nx = 0, ny = 0;
      for (var i = 0; i < 3; i++) {
        var d = Math.max(1e-6, Math.hypot(curr.x - pts[i].x, curr.y - pts[i].y));
        var w = 1 / d;
        sw += w;
        nx += pts[i].x * w;
        ny += pts[i].y * w;
      }
      var nextX = nx / sw;
      var nextY = ny / sw;
      if (Math.hypot(nextX - curr.x, nextY - curr.y) < 1e-6) break;
      curr.x = nextX;
      curr.y = nextY;
    }

    return { pt: curr, helps: true };
  }

  function initTab3() {
    if (!elSteinerBoard) return;
    elSteinerBoard.innerHTML = '';

    steinerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    steinerSvg.setAttribute('viewBox', '0 0 560 360');
    steinerSvg.setAttribute('width', '100%');
    steinerSvg.setAttribute('height', '100%');
    steinerSvg.style.touchAction = 'none';
    elSteinerBoard.appendChild(steinerSvg);

    setEquilateralLayout();
    buildSteinerSvgElements();
    setupSteinerPointerEvents();
    updateSteinerView();
  }

  function setEquilateralLayout() {
    steinerScale = 150;
    var cx = 280, cy = 180;
    var h = (steinerScale * Math.sqrt(3)) / 2;

    steinerTerminals.A = { x: cx, y: cy - (2 / 3) * h };
    steinerTerminals.B = { x: cx - steinerScale / 2, y: cy + (1 / 3) * h };
    steinerTerminals.C = { x: cx + steinerScale / 2, y: cy + (1 / 3) * h };

    // Snap to Fermat point initially
    var snap = computeBestSteinerPoint(steinerTerminals.A, steinerTerminals.B, steinerTerminals.C);
    steinerPoint = { x: snap.pt.x, y: snap.pt.y };

    if (elSteinerNotice) elSteinerNotice.style.display = 'none';
  }

  function setObtuseLayout() {
    steinerScale = 150;
    var Bx = 280, By = 220;
    var r = 120;
    steinerTerminals.B = { x: Bx, y: By };
    steinerTerminals.A = { x: Bx - r, y: By }; // 180 deg
    var rad = (50 * Math.PI) / 180;
    steinerTerminals.C = { x: Math.round(Bx + r * Math.cos(rad)), y: Math.round(By - r * Math.sin(rad)) };

    snapToBestSteiner();
  }

  function buildSteinerSvgElements() {
    var svgNS = 'http://www.w3.org/2000/svg';

    // 1. MST Lines (dashed)
    steinerElements.mstLine1 = document.createElementNS(svgNS, 'line');
    steinerElements.mstLine1.setAttribute('stroke', 'var(--ochre)');
    steinerElements.mstLine1.setAttribute('stroke-width', '2.5');
    steinerElements.mstLine1.setAttribute('stroke-dasharray', '5 4');
    steinerSvg.appendChild(steinerElements.mstLine1);

    steinerElements.mstLine2 = document.createElementNS(svgNS, 'line');
    steinerElements.mstLine2.setAttribute('stroke', 'var(--ochre)');
    steinerElements.mstLine2.setAttribute('stroke-width', '2.5');
    steinerElements.mstLine2.setAttribute('stroke-dasharray', '5 4');
    steinerSvg.appendChild(steinerElements.mstLine2);

    // 2. Steiner Lines (solid vermilion)
    steinerElements.stLineA = document.createElementNS(svgNS, 'line');
    steinerElements.stLineA.setAttribute('stroke', 'var(--vermilion)');
    steinerElements.stLineA.setAttribute('stroke-width', '3');
    steinerSvg.appendChild(steinerElements.stLineA);

    steinerElements.stLineB = document.createElementNS(svgNS, 'line');
    steinerElements.stLineB.setAttribute('stroke', 'var(--vermilion)');
    steinerElements.stLineB.setAttribute('stroke-width', '3');
    steinerSvg.appendChild(steinerElements.stLineB);

    steinerElements.stLineC = document.createElementNS(svgNS, 'line');
    steinerElements.stLineC.setAttribute('stroke', 'var(--vermilion)');
    steinerElements.stLineC.setAttribute('stroke-width', '3');
    steinerSvg.appendChild(steinerElements.stLineC);

    // 3. Steiner Point S Node
    steinerElements.gS = document.createElementNS(svgNS, 'g');
    steinerElements.gS.style.cursor = 'grab';

    var sCircle = document.createElementNS(svgNS, 'circle');
    sCircle.setAttribute('r', '14');
    sCircle.setAttribute('fill', '#e8f0fe');
    sCircle.setAttribute('stroke', 'var(--cobalt)');
    sCircle.setAttribute('stroke-width', '2.5');
    steinerElements.gS.appendChild(sCircle);

    var sText = document.createElementNS(svgNS, 'text');
    sText.setAttribute('text-anchor', 'middle');
    sText.setAttribute('dominant-baseline', 'central');
    sText.setAttribute('font-family', 'var(--font-mono)');
    sText.setAttribute('font-weight', '700');
    sText.setAttribute('font-size', '12px');
    sText.setAttribute('fill', 'var(--cobalt)');
    sText.textContent = 'S';
    steinerElements.gS.appendChild(sText);
    steinerSvg.appendChild(steinerElements.gS);

    // 4. Terminals A, B, C
    var termKeys = ['A', 'B', 'C'];
    steinerElements.terms = {};
    for (var i = 0; i < termKeys.length; i++) {
      var key = termKeys[i];
      var gT = document.createElementNS(svgNS, 'g');
      gT.style.cursor = 'grab';

      var tCircle = document.createElementNS(svgNS, 'circle');
      tCircle.setAttribute('r', '16');
      tCircle.setAttribute('fill', 'var(--paper-2)');
      tCircle.setAttribute('stroke', 'var(--ink)');
      tCircle.setAttribute('stroke-width', '2.5');
      gT.appendChild(tCircle);

      var tText = document.createElementNS(svgNS, 'text');
      tText.setAttribute('text-anchor', 'middle');
      tText.setAttribute('dominant-baseline', 'central');
      tText.setAttribute('font-family', 'var(--font-mono)');
      tText.setAttribute('font-weight', '700');
      tText.setAttribute('font-size', '13px');
      tText.setAttribute('fill', 'var(--ink)');
      tText.textContent = key;
      gT.appendChild(tText);

      steinerSvg.appendChild(gT);
      steinerElements.terms[key] = gT;
    }
  }

  function setupSteinerPointerEvents() {
    function getSvgPt(clientX, clientY) {
      var pt = steinerSvg.createSVGPoint();
      pt.x = clientX;
      pt.y = clientY;
      var ctm = steinerSvg.getScreenCTM();
      if (ctm) return pt.matrixTransform(ctm.inverse());
      return { x: clientX, y: clientY };
    }

    steinerSvg.addEventListener('pointerdown', function (e) {
      var pt = getSvgPt(e.clientX, e.clientY);
      // Check hit on S
      if (Math.hypot(pt.x - steinerPoint.x, pt.y - steinerPoint.y) <= 20) {
        draggingSteinerKey = 'S';
        try { steinerSvg.setPointerCapture(e.pointerId); } catch (_) {}
        return;
      }
      // Check hit on A, B, C
      var keys = ['A', 'B', 'C'];
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (Math.hypot(pt.x - steinerTerminals[k].x, pt.y - steinerTerminals[k].y) <= 22) {
          draggingSteinerKey = k;
          try { steinerSvg.setPointerCapture(e.pointerId); } catch (_) {}
          return;
        }
      }
    });

    steinerSvg.addEventListener('pointermove', function (e) {
      if (!draggingSteinerKey) return;
      var pt = getSvgPt(e.clientX, e.clientY);
      var clampedX = Math.max(30, Math.min(530, pt.x));
      var clampedY = Math.max(30, Math.min(330, pt.y));

      if (draggingSteinerKey === 'S') {
        steinerPoint.x = clampedX;
        steinerPoint.y = clampedY;
      } else {
        steinerTerminals[draggingSteinerKey].x = clampedX;
        steinerTerminals[draggingSteinerKey].y = clampedY;
      }
      updateSteinerView();
    });

    function finishDrag(e) {
      if (!draggingSteinerKey) return;
      try { steinerSvg.releasePointerCapture(e.pointerId); } catch (_) {}
      draggingSteinerKey = null;
    }

    steinerSvg.addEventListener('pointerup', finishDrag);
    steinerSvg.addEventListener('pointercancel', finishDrag);
  }

  function updateSteinerView() {
    if (!steinerSvg || !steinerElements.stLineA) return;

    var A = steinerTerminals.A;
    var B = steinerTerminals.B;
    var C = steinerTerminals.C;
    var S = steinerPoint;

    // Position terminal groups
    steinerElements.terms.A.setAttribute('transform', 'translate(' + A.x + ',' + A.y + ')');
    steinerElements.terms.B.setAttribute('transform', 'translate(' + B.x + ',' + B.y + ')');
    steinerElements.terms.C.setAttribute('transform', 'translate(' + C.x + ',' + C.y + ')');
    steinerElements.gS.setAttribute('transform', 'translate(' + S.x + ',' + S.y + ')');

    // Position Steiner lines (S -> A, B, C)
    steinerElements.stLineA.setAttribute('x1', S.x); steinerElements.stLineA.setAttribute('y1', S.y);
    steinerElements.stLineA.setAttribute('x2', A.x); steinerElements.stLineA.setAttribute('y2', A.y);

    steinerElements.stLineB.setAttribute('x1', S.x); steinerElements.stLineB.setAttribute('y1', S.y);
    steinerElements.stLineB.setAttribute('x2', B.x); steinerElements.stLineB.setAttribute('y2', B.y);

    steinerElements.stLineC.setAttribute('x1', S.x); steinerElements.stLineC.setAttribute('y1', S.y);
    steinerElements.stLineC.setAttribute('x2', C.x); steinerElements.stLineC.setAttribute('y2', C.y);

    // MST on 3 terminals: the two shortest sides
    var sides = [
      { u: A, v: B, len: Math.hypot(A.x - B.x, A.y - B.y) },
      { u: B, v: C, len: Math.hypot(B.x - C.x, B.y - C.y) },
      { u: C, v: A, len: Math.hypot(C.x - A.x, C.y - A.y) }
    ];
    sides.sort(function (a, b) { return a.len - b.len; });

    steinerElements.mstLine1.setAttribute('x1', sides[0].u.x); steinerElements.mstLine1.setAttribute('y1', sides[0].u.y);
    steinerElements.mstLine1.setAttribute('x2', sides[0].v.x); steinerElements.mstLine1.setAttribute('y2', sides[0].v.y);

    steinerElements.mstLine2.setAttribute('x1', sides[1].u.x); steinerElements.mstLine2.setAttribute('y1', sides[1].u.y);
    steinerElements.mstLine2.setAttribute('x2', sides[1].v.x); steinerElements.mstLine2.setAttribute('y2', sides[1].v.y);

    // Calculate normalized lengths
    var mstPx = sides[0].len + sides[1].len;
    var steinerPx = Math.hypot(S.x - A.x, S.y - A.y) + Math.hypot(S.x - B.x, S.y - B.y) + Math.hypot(S.x - C.x, S.y - C.y);

    var mstNorm = mstPx / steinerScale;
    var steinerNorm = steinerPx / steinerScale;
    var savingPct = Math.max(0, ((mstPx - steinerPx) / mstPx) * 100);

    if (elSteinerMstLen) elSteinerMstLen.textContent = mstNorm.toFixed(3);
    if (elSteinerLen) elSteinerLen.textContent = steinerNorm.toFixed(3);
    if (elSteinerSavingChip) {
      elSteinerSavingChip.textContent = 'Saving ' + savingPct.toFixed(1) + '%';
      elSteinerSavingChip.className = savingPct > 5 ? 'chip chip-success' : 'chip';
    }
  }

  function snapToBestSteiner() {
    var snap = computeBestSteinerPoint(steinerTerminals.A, steinerTerminals.B, steinerTerminals.C);
    steinerPoint.x = snap.pt.x;
    steinerPoint.y = snap.pt.y;

    if (elSteinerNotice) {
      if (!snap.helps) {
        elSteinerNotice.style.display = 'block';
        elSteinerNotice.textContent = 'Angle at terminal ' + snap.terminal + ' is ≥ 120° (' + snap.angle.toFixed(0) + '°). No extra point helps.';
      } else {
        elSteinerNotice.style.display = 'none';
      }
    }
    updateSteinerView();
  }

  NG.slides.s12 = {
    init: function (root) {
      elTabBtns = [
        document.getElementById('s12-tab-btn-1'),
        document.getElementById('s12-tab-btn-2'),
        document.getElementById('s12-tab-btn-3')
      ];
      elTabContents = [
        document.getElementById('s12-tab-1'),
        document.getElementById('s12-tab-2'),
        document.getElementById('s12-tab-3')
      ];

      // Tab 1 Elements
      elBtnAddBackup = document.getElementById('s12-btn-add-backup');
      elBtnResetBackup = document.getElementById('s12-btn-reset-backup');
      elBtnToggleFailure = document.getElementById('s12-btn-toggle-failure');
      elCostVal = document.getElementById('s12-cost-val');
      elIncreaseVal = document.getElementById('s12-increase-val');
      elBridgesVal = document.getElementById('s12-bridges-val');
      elSurvivesChip = document.getElementById('s12-survives-chip');
      elFailureMsg = document.getElementById('s12-failure-msg');
      elBackupGraphWrap = document.getElementById('s12-backup-graph');

      // Tab 2 Elements
      elSptRootSel = document.getElementById('s12-spt-root-sel');
      elBtnToggleSpt = document.getElementById('s12-btn-toggle-spt');
      elSptWeight = document.getElementById('s12-spt-weight');
      elSptAvg = document.getElementById('s12-spt-avg');
      elSptMax = document.getElementById('s12-spt-max');
      elSptGraphWrap = document.getElementById('s12-spt-graph');

      // Tab 3 Elements
      elBtnSnapSteiner = document.getElementById('s12-btn-snap-steiner');
      elBtnEquilateral = document.getElementById('s12-btn-equilateral');
      elBtnObtuse = document.getElementById('s12-btn-obtuse');
      elSteinerMstLen = document.getElementById('s12-steiner-mst-len');
      elSteinerLen = document.getElementById('s12-steiner-len');
      elSteinerSavingChip = document.getElementById('s12-steiner-saving-chip');
      elSteinerNotice = document.getElementById('s12-steiner-notice');
      elSteinerBoard = document.getElementById('s12-steiner-board');

      // Setup Tab Switches
      for (var t = 0; t < elTabBtns.length; t++) {
        (function (tabIdx) {
          if (elTabBtns[tabIdx]) {
            elTabBtns[tabIdx].addEventListener('click', function () {
              switchTab(tabIdx + 1);
            });
          }
        })(t);
      }

      // Tab 1 Listeners
      if (elBtnAddBackup) elBtnAddBackup.addEventListener('click', addGreedyBackupLink);
      if (elBtnResetBackup) elBtnResetBackup.addEventListener('click', resetTab1);
      if (elBtnToggleFailure) {
        elBtnToggleFailure.addEventListener('click', function () {
          testFailureMode = !testFailureMode;
          elBtnToggleFailure.textContent = testFailureMode ? 'Test a failure: ON (click edge)' : 'Test a failure: OFF';
          elBtnToggleFailure.classList.toggle('btn-primary', testFailureMode);
          if (!testFailureMode) {
            failedEdgeId = null;
            if (elFailureMsg) elFailureMsg.style.display = 'none';
            updateTab1View();
          }
        });
      }

      // Tab 2 Listeners
      if (elSptRootSel) {
        elSptRootSel.addEventListener('change', function () {
          sptRoot = elSptRootSel.value;
          updateTab2View();
        });
      }
      if (elBtnToggleSpt) {
        elBtnToggleSpt.addEventListener('click', function () {
          viewModeSpt = !viewModeSpt;
          updateTab2View();
        });
      }

      // Tab 3 Listeners
      if (elBtnSnapSteiner) elBtnSnapSteiner.addEventListener('click', snapToBestSteiner);
      if (elBtnEquilateral) {
        elBtnEquilateral.addEventListener('click', function () {
          setEquilateralLayout();
          updateSteinerView();
        });
      }
      if (elBtnObtuse) {
        elBtnObtuse.addEventListener('click', function () {
          setObtuseLayout();
        });
      }

      // Initialize all tabs
      initTab1();
      initTab2();
      initTab3();
    },

    destroy: function () {
      if (view1) { view1.destroy(); view1 = null; }
      if (view2) { view2.destroy(); view2 = null; }
      steinerSvg = null;
    },

    // Exposed helpers for acceptance testing
    switchTab: function (idx) {
      ensureInitialized();
      switchTab(idx);
    },
    runGreedyAll: function () {
      ensureInitialized();
      while (true) {
        var added = addGreedyBackupLink();
        if (!added) break;
      }
      return {
        activeEdges: activeBackupEdges.slice(),
        bridgesCount: NG.Algo.bridges(graph1, { onlyEdges: activeBackupEdges }).length
      };
    },
    testAllSingleFailures: function () {
      ensureInitialized();
      var allSurvive = true;
      var edges = activeBackupEdges.slice();
      for (var i = 0; i < edges.length; i++) {
        var trial = edges.filter(function (e) { return e !== edges[i]; });
        var comps = NG.Algo.components(graph1, { skipEdges: [edges[i]].concat(NON_TREE_CANDIDATES.filter(function (c) { return edges.indexOf(c) === -1; })) });
        if (comps.length > 1) {
          allSurvive = false;
        }
      }
      return allSurvive;
    },
    getBridgesCount: function () {
      ensureInitialized();
      return NG.Algo.bridges(graph1, { onlyEdges: activeBackupEdges }).length;
    },
    getSteinerMetrics: function () {
      ensureInitialized();
      var A = steinerTerminals.A, B = steinerTerminals.B, C = steinerTerminals.C, S = steinerPoint;
      var sides = [
        Math.hypot(A.x - B.x, A.y - B.y),
        Math.hypot(B.x - C.x, B.y - C.y),
        Math.hypot(C.x - A.x, C.y - A.y)
      ].sort(function (a, b) { return a - b; });
      var mstPx = sides[0] + sides[1];
      var steinerPx = Math.hypot(S.x - A.x, S.y - A.y) + Math.hypot(S.x - B.x, S.y - B.y) + Math.hypot(S.x - C.x, S.y - C.y);
      var mstNorm = mstPx / steinerScale;
      var steinerNorm = steinerPx / steinerScale;
      var saving = ((mstPx - steinerPx) / mstPx) * 100;
      return {
        mstNorm: parseFloat(mstNorm.toFixed(3)),
        steinerNorm: parseFloat(steinerNorm.toFixed(3)),
        savingPct: parseFloat(saving.toFixed(1))
      };
    },
    setSteinerObtuse: function () {
      ensureInitialized();
      setObtuseLayout();
      return {
        noticeText: elSteinerNotice ? elSteinerNotice.textContent : '',
        displayed: elSteinerNotice ? elSteinerNotice.style.display !== 'none' : false
      };
    },
    snapSteiner: function () {
      ensureInitialized();
      snapToBestSteiner();
    }
  };
})();
