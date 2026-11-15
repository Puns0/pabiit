/* ============================================================
   s08.js — Slide 8: Prim's Algorithm Step-by-Step Visualiser
   ============================================================ */
(function () {
  'use strict';

  window.NG = window.NG || {};
  NG.slides = NG.slides || {};

  var NODE_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  function buildCanonical() {
    var g = new NG.Graph();
    var nodes = [
      { id: 'A', x: 120, y: 80 },
      { id: 'B', x: 300, y: 50 },
      { id: 'C', x: 480, y: 90 },
      { id: 'D', x: 80,  y: 230 },
      { id: 'E', x: 260, y: 210 },
      { id: 'F', x: 450, y: 240 },
      { id: 'G', x: 170, y: 370 },
      { id: 'H', x: 380, y: 360 }
    ];
    for (var i = 0; i < nodes.length; i++) {
      g.addNode(nodes[i].x, nodes[i].y, nodes[i].id, nodes[i].id);
    }
    var edges = [
      { id: 'EH', u: 'E', v: 'H', w: 1 },
      { id: 'EF', u: 'E', v: 'F', w: 2 },
      { id: 'BE', u: 'B', v: 'E', w: 3 },
      { id: 'AB', u: 'A', v: 'B', w: 4 },
      { id: 'AE', u: 'A', v: 'E', w: 5 },
      { id: 'CF', u: 'C', v: 'F', w: 6 },
      { id: 'DE', u: 'D', v: 'E', w: 7 },
      { id: 'GH', u: 'G', v: 'H', w: 8 },
      { id: 'AD', u: 'A', v: 'D', w: 9 },
      { id: 'BC', u: 'B', v: 'C', w: 10 },
      { id: 'DG', u: 'D', v: 'G', w: 11 },
      { id: 'FH', u: 'F', v: 'H', w: 12 },
      { id: 'CE', u: 'C', v: 'E', w: 13 }
    ];
    for (var j = 0; j < edges.length; j++) {
      g.addEdge(edges[j].u, edges[j].v, edges[j].w, edges[j].id);
    }
    return g;
  }

  function generateRandomGraph(seed) {
    var rng = NG.Util.mulberry32(seed);
    var g = new NG.Graph();
    var letters = NODE_ORDER.slice();

    var basePositions = [
      { x: 120, y: 80 }, { x: 300, y: 50 }, { x: 480, y: 90 },
      { x: 80, y: 230 }, { x: 260, y: 210 }, { x: 450, y: 240 },
      { x: 170, y: 370 }, { x: 380, y: 360 }
    ];

    for (var i = 0; i < 8; i++) {
      var jx = Math.round((rng() - 0.5) * 40);
      var jy = Math.round((rng() - 0.5) * 40);
      var x = Math.max(60, Math.min(500, basePositions[i].x + jx));
      var y = Math.max(60, Math.min(360, basePositions[i].y + jy));
      g.addNode(x, y, letters[i], letters[i]);
    }

    var weights = [];
    for (var w = 1; w <= 20; w++) weights.push(w);
    for (var k = weights.length - 1; k > 0; k--) {
      var swapIdx = Math.floor(rng() * (k + 1));
      var tmp = weights[k]; weights[k] = weights[swapIdx]; weights[swapIdx] = tmp;
    }

    var wIdx = 0;
    // Spanning tree of 7 edges guarantees connected
    var inTree = [letters[0]];
    var outTree = letters.slice(1);
    while (outTree.length > 0) {
      var uIdx = Math.floor(rng() * inTree.length);
      var vIdx = Math.floor(rng() * outTree.length);
      var u = inTree[uIdx];
      var v = outTree.splice(vIdx, 1)[0];
      inTree.push(v);
      var edgeId = u < v ? u + v : v + u;
      g.addEdge(u, v, weights[wIdx++], edgeId);
    }

    // Add 5-7 extra edges for total 12-14 edges
    var targetTotal = 12 + Math.floor(rng() * 3);
    var allPairs = [];
    for (var a = 0; a < 8; a++) {
      for (var b = a + 1; b < 8; b++) {
        var id = letters[a] + letters[b];
        if (!g.edge(id)) {
          allPairs.push({ u: letters[a], v: letters[b], id: id });
        }
      }
    }
    for (var p = allPairs.length - 1; p > 0; p--) {
      var sIdx = Math.floor(rng() * (p + 1));
      var pTmp = allPairs[p]; allPairs[p] = allPairs[sIdx]; allPairs[sIdx] = pTmp;
    }

    for (var e = 0; e < allPairs.length && g.m() < targetTotal && wIdx < weights.length; e++) {
      var pair = allPairs[e];
      g.addEdge(pair.u, pair.v, weights[wIdx++], pair.id);
    }

    return g;
  }

  // Module state
  var currentGraph = null;
  var view = null;
  var stepper = null;
  var steps = [];
  var startNode = 'A';
  var randomSeedCounter = 54321;

  // DOM elements cache
  var elPlayBtn = null;
  var elStepBtn = null;
  var elBackBtn = null;
  var elResetBtn = null;
  var elSpeedSlider = null;
  var elSpeedVal = null;
  var elRandBtn = null;
  var elExampleBtn = null;
  var elStartLbl = null;
  var elStatK = null;
  var elStatTotal = null;
  var elStatStep = null;
  var elStatMax = null;
  var elBanner = null;
  var elHeapList = null;
  var elCaption = null;
  var elPseudocode = null;
  var elCmpKruskal = null;
  var elCmpPrim = null;

  function updatePlayButton() {
    if (!elPlayBtn || !stepper) return;
    if (stepper.playing) {
      elPlayBtn.textContent = 'Pause';
      elPlayBtn.classList.remove('btn-primary');
    } else {
      elPlayBtn.textContent = 'Play';
      elPlayBtn.classList.add('btn-primary');
    }
  }

  function updateComparisonStrip() {
    if (!currentGraph) return;
    var kSteps = NG.Algo.kruskalSteps(currentGraph);
    var kTotal = kSteps.length > 0 ? kSteps[kSteps.length - 1].total : 0;
    var pTotal = steps.length > 0 ? steps[steps.length - 1].total : 0;

    if (elCmpKruskal) elCmpKruskal.textContent = kTotal;
    if (elCmpPrim) elCmpPrim.textContent = pTotal;
  }

  function renderStep(index, step, dir) {
    if (!view || !currentGraph) return;

    // 1. Pseudocode highlight
    if (elPseudocode) {
      var allLines = elPseudocode.querySelectorAll('.line');
      for (var li = 0; li < allLines.length; li++) {
        allLines[li].classList.remove('active');
      }
      if (step && step.line) {
        var activeLine = elPseudocode.querySelector('.line[data-line="' + step.line + '"]');
        if (activeLine) activeLine.classList.add('active');
      }
    }

    // 2. Stats chips
    var treeVerticesCount = (step && step.treeNodes) ? step.treeNodes.length : 1;
    var totalCost = step ? step.total : 0;
    var stepNum = index >= 0 ? index + 1 : 0;
    var maxSteps = steps.length;

    if (elStatK) elStatK.textContent = treeVerticesCount;
    if (elStatTotal) elStatTotal.textContent = totalCost;
    if (elStatStep) elStatStep.textContent = stepNum;
    if (elStatMax) elStatMax.textContent = maxSteps;

    // 3. Banner
    if (elBanner) {
      if (step && step.type === 'done') {
        elBanner.style.display = 'block';
        elBanner.textContent = 'MST found. Total = ' + totalCost;
      } else {
        elBanner.style.display = 'none';
      }
    }

    // 4. Plain-words caption
    if (elCaption) {
      if (index === -1) {
        elCaption.textContent = 'Click Play or Step to run Prim\u2019s algorithm from vertex ' + startNode + '.';
      } else if (!step) {
        elCaption.textContent = '';
      } else if (step.type === 'start') {
        elCaption.textContent = 'Starting at vertex ' + startNode + '. Adding all incident edges to the min-heap.';
      } else if (step.type === 'frontier') {
        elCaption.textContent = 'Frontier updated: candidate edges leaving the tree are placed in the min-heap.';
      } else if (step.type === 'skip') {
        var eSkip = currentGraph.edge(step.edgeId);
        var wSkip = eSkip ? eSkip.w : '';
        elCaption.textContent = 'Popped edge ' + step.edgeId + ' (' + wSkip + '): endpoint already in tree. Skip (stale heap entry).';
      } else if (step.type === 'pick') {
        var ePick = currentGraph.edge(step.edgeId);
        var wPick = ePick ? ePick.w : '';
        elCaption.textContent = 'Popped cheapest edge ' + step.edgeId + ' (' + wPick + '): adding it and its new vertex to the tree.';
      } else if (step.type === 'done') {
        elCaption.textContent = 'Algorithm finished: tree reaches all ' + treeVerticesCount + ' vertices. Total cost = ' + totalCost + '.';
      }
    }

    // 5. Min-Heap panel UI update
    if (elHeapList) {
      elHeapList.innerHTML = '';
      var heapItems = (step && step.heapSnapshot) ? step.heapSnapshot.slice() : [];

      // If this step is a skip step, prepend the skipped edge at top with .skipped class
      if (step && step.type === 'skip' && step.edgeId) {
        var skipEdge = currentGraph.edge(step.edgeId);
        var skipW = skipEdge ? skipEdge.w : '';
        var skipRow = document.createElement('div');
        skipRow.className = 's08-heap-row skipped';
        skipRow.innerHTML = '<span>' + step.edgeId + '</span><span class="pill mono">' + skipW + '</span>';
        elHeapList.appendChild(skipRow);
      }

      for (var hi = 0; hi < heapItems.length; hi++) {
        var item = heapItems[hi];
        var isTop = (hi === 0 && (!step || step.type !== 'skip'));
        var row = document.createElement('div');
        row.className = 's08-heap-row' + (isTop ? ' current' : '');
        row.innerHTML = '<span>' + item.edgeId + '</span><span class="pill mono">' + item.w + '</span>';
        elHeapList.appendChild(row);
      }

      if (heapItems.length === 0 && (!step || step.type !== 'skip')) {
        var emptyNotice = document.createElement('div');
        emptyNotice.style.padding = '0.4rem 0.5rem';
        emptyNotice.style.color = 'var(--ink-3)';
        emptyNotice.style.fontStyle = 'italic';
        emptyNotice.textContent = (index === -1) ? 'Heap empty: start run to inspect' : '(Heap empty)';
        elHeapList.appendChild(emptyNotice);
      }
    }

    // 6. Graph nodes & halo blob
    var treeNodeList = (step && step.treeNodes && step.treeNodes.length > 0) ?
      step.treeNodes :
      [startNode];

    var treeNodeSet = new Set(treeNodeList);

    // Render halo blob
    view.halo(treeNodeList, 'var(--vermilion-soft)');

    // Node ring highlight for visited nodes
    var nodeIter = currentGraph._nodes.values();
    for (var nit = nodeIter.next(); !nit.done; nit = nodeIter.next()) {
      var nObj = nit.value;
      if (treeNodeSet.has(nObj.id)) {
        view.setNodeState(nObj.id, { ring: 'var(--vermilion)' });
      } else {
        view.setNodeState(nObj.id, { ring: '' });
      }
    }

    // 7. Graph edges
    var treeEdgesSet = new Set(step ? step.treeEdges : []);
    var frontierEdgesSet = new Set(step ? step.frontierEdges : []);

    var edgeIter = currentGraph._edges.values();
    for (var eit = edgeIter.next(); !eit.done; eit = edgeIter.next()) {
      var eObj = eit.value;
      if (treeEdgesSet.has(eObj.id)) {
        view.setEdgeState(eObj.id, 'accepted');
      } else if (frontierEdgesSet.has(eObj.id)) {
        view.setEdgeState(eObj.id, 'frontier');
      } else {
        view.setEdgeState(eObj.id, 'default');
      }
    }

    // Forward draw-in animation for newly picked edge
    if (dir === 'forward' && step && step.type === 'pick') {
      view.drawEdgeIn(step.edgeId, 320);
    }
  }

  function setupGraphAndStepper(graph, initialStart) {
    if (stepper) {
      stepper.pause();
    }

    currentGraph = graph;

    // Verify start node exists in graph; if not, pick first node
    if (!currentGraph.node(startNode)) {
      var firstNode = currentGraph._nodes.keys().next().value;
      startNode = firstNode || 'A';
    }
    if (initialStart) {
      startNode = initialStart;
    }

    if (elStartLbl) {
      elStartLbl.textContent = startNode;
    }

    steps = NG.Algo.primSteps(currentGraph, startNode);

    var canvas = document.getElementById('s08-canvas');
    if (!canvas) return;

    if (view) {
      view.destroy();
    }

    view = new NG.View(canvas, currentGraph, {
      width: 560,
      height: 400,
      viewBox: '0 0 560 400',
      draggable: true,
      showWeights: true,
      weightMode: 'fixed',
      nodeRadius: 18,
      padding: 24
    });

    // Clicking any node selects it as start vertex and resets
    view.onNodeClick = function (nid) {
      if (!currentGraph.node(nid)) return;
      startNode = nid;
      if (elStartLbl) elStartLbl.textContent = startNode;
      setupGraphAndStepper(currentGraph, startNode);
    };

    view.onNodeDragEnd = function () {
      if (stepper && stepper.index > -1) {
        stepper.reset();
        updatePlayButton();
      }
    };

    updateComparisonStrip();

    var currentSpeed = elSpeedSlider ? parseFloat(elSpeedSlider.value) : 1;

    stepper = new NG.Stepper({
      steps: steps,
      intervalMs: 800,
      onStep: function (index, step, dir) {
        renderStep(index, step, dir);
      },
      onEnd: function () {
        updatePlayButton();
      }
    });
    stepper.setSpeed(currentSpeed);

    renderStep(-1, null, 'reset');
    updatePlayButton();
  }

  NG.slides.s08 = {
    init: function (root) {
      elPlayBtn = document.getElementById('s08-btn-play');
      elStepBtn = document.getElementById('s08-btn-step');
      elBackBtn = document.getElementById('s08-btn-back');
      elResetBtn = document.getElementById('s08-btn-reset');
      elSpeedSlider = document.getElementById('s08-speed-slider');
      elSpeedVal = document.getElementById('s08-speed-val');
      elRandBtn = document.getElementById('s08-btn-rand');
      elExampleBtn = document.getElementById('s08-btn-example');
      elStartLbl = document.getElementById('s08-start-lbl');

      elStatK = document.getElementById('s08-stat-k');
      elStatTotal = document.getElementById('s08-stat-total');
      elStatStep = document.getElementById('s08-stat-step');
      elStatMax = document.getElementById('s08-stat-max');
      elBanner = document.getElementById('s08-banner');

      elHeapList = document.getElementById('s08-heap-list');
      elCaption = document.getElementById('s08-caption');
      elPseudocode = document.getElementById('s08-pseudocode');

      elCmpKruskal = document.getElementById('s08-cmp-kruskal');
      elCmpPrim = document.getElementById('s08-cmp-prim');

      if (elPlayBtn) {
        elPlayBtn.addEventListener('click', function () {
          if (!stepper) return;
          stepper.toggle();
          updatePlayButton();
        });
      }

      if (elStepBtn) {
        elStepBtn.addEventListener('click', function () {
          if (!stepper) return;
          stepper.pause();
          stepper.next();
          updatePlayButton();
        });
      }

      if (elBackBtn) {
        elBackBtn.addEventListener('click', function () {
          if (!stepper) return;
          stepper.pause();
          stepper.prev();
          updatePlayButton();
        });
      }

      if (elResetBtn) {
        elResetBtn.addEventListener('click', function () {
          if (!stepper) return;
          stepper.reset();
          updatePlayButton();
        });
      }

      if (elSpeedSlider) {
        var onSpeedChange = function () {
          var val = parseFloat(elSpeedSlider.value);
          if (elSpeedVal) elSpeedVal.textContent = val.toFixed(2).replace(/\.00$/, '') + 'x';
          if (stepper) stepper.setSpeed(val);
        };
        elSpeedSlider.addEventListener('input', onSpeedChange);
        elSpeedSlider.addEventListener('change', onSpeedChange);
      }

      if (elRandBtn) {
        elRandBtn.addEventListener('click', function () {
          randomSeedCounter += 24680;
          var rg = generateRandomGraph(randomSeedCounter);
          setupGraphAndStepper(rg, 'A');
        });
      }

      if (elExampleBtn) {
        elExampleBtn.addEventListener('click', function () {
          var cg = buildCanonical();
          setupGraphAndStepper(cg, 'A');
        });
      }

      // Initial canonical setup
      startNode = 'A';
      var canonical = buildCanonical();
      setupGraphAndStepper(canonical, 'A');
    },

    pause: function () {
      if (stepper) {
        stepper.pause();
        updatePlayButton();
      }
    },

    resume: function () {
      // Keep paused on re-entry per spec unless user clicks Play
    },

    getGraph: function () {
      return currentGraph;
    },

    getStepper: function () {
      return stepper;
    },

    destroy: function () {
      if (stepper) {
        stepper.pause();
      }
      if (view) {
        view.destroy();
        view = null;
      }
    }
  };

})();
