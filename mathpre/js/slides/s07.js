/* ============================================================
   s07.js — Slide 7: Kruskal's Algorithm Step-by-Step Visualiser
   ============================================================ */
(function () {
  'use strict';

  window.NG = window.NG || {};
  NG.slides = NG.slides || {};

  var PALETTE = [
    'var(--c1)',
    'var(--c2)',
    'var(--c3)',
    'var(--c4)',
    'var(--c5)',
    'var(--c6)',
    'var(--c7)',
    'var(--c8)'
  ];

  var NODE_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  function nodeIndex(nid) {
    var idx = NODE_ORDER.indexOf(String(nid));
    return idx >= 0 ? idx % PALETTE.length : 0;
  }

  function findRoot(nodeId, parentMap) {
    if (!parentMap) return nodeId;
    var curr = nodeId;
    var visited = new Set();
    while (parentMap[curr] && parentMap[curr] !== curr && !visited.has(curr)) {
      visited.add(curr);
      curr = parentMap[curr];
    }
    return curr;
  }

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
  var sortedEdgeIds = [];
  var rejectTimeout = null;
  var randomSeedCounter = 12345;

  // DOM elements cache
  var elPlayBtn = null;
  var elStepBtn = null;
  var elBackBtn = null;
  var elResetBtn = null;
  var elSpeedSlider = null;
  var elSpeedVal = null;
  var elRandBtn = null;
  var elExampleBtn = null;
  var elStatK = null;
  var elStatTotal = null;
  var elStatStep = null;
  var elStatMax = null;
  var elBanner = null;
  var elEdgeList = null;
  var elUfParent = null;
  var elUfChips = null;
  var elCaption = null;
  var elPseudocode = null;

  function clearCycleHighlights() {
    if (!view) return;
    var nodesLayer = view.layer('nodes');
    if (nodesLayer) {
      var pNodes = nodesLayer.querySelectorAll('.path-highlight-node');
      for (var i = 0; i < pNodes.length; i++) pNodes[i].classList.remove('path-highlight-node');
    }
    var edgesLayer = view.layer('edges');
    if (edgesLayer) {
      var pEdges = edgesLayer.querySelectorAll('.path-highlight');
      for (var j = 0; j < pEdges.length; j++) pEdges[j].classList.remove('path-highlight');
    }
  }

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

  function populateEdgeListTable() {
    if (!elEdgeList) return;
    elEdgeList.innerHTML = '';
    for (var i = 0; i < sortedEdgeIds.length; i++) {
      var eid = sortedEdgeIds[i];
      var edge = currentGraph.edge(eid);
      var row = document.createElement('div');
      row.className = 's07-edge-row';
      row.setAttribute('data-edge-id', eid);

      var lbl = document.createElement('span');
      lbl.textContent = eid + ' (' + (edge ? edge.w : '') + ')';
      row.appendChild(lbl);

      var chip = document.createElement('span');
      chip.className = 'chip pending';
      chip.textContent = 'pending';
      row.appendChild(chip);

      elEdgeList.appendChild(row);
    }
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
    var acceptedCount = step ? step.acceptedEdges.length : 0;
    var totalCost = step ? step.total : 0;
    var stepNum = index >= 0 ? index + 1 : 0;
    var maxSteps = steps.length;

    if (elStatK) elStatK.textContent = acceptedCount;
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
        elCaption.textContent = 'Click Play or Step to begin Kruskal\u2019s algorithm.';
      } else if (!step) {
        elCaption.textContent = '';
      } else if (step.type === 'consider') {
        var eCons = currentGraph.edge(step.edgeId);
        var uCons = eCons ? eCons.u : '';
        var vCons = eCons ? eCons.v : '';
        var wCons = eCons ? eCons.w : '';
        elCaption.textContent = 'Edge ' + step.edgeId + ' (' + wCons + '): check whether ' + uCons + ' and ' + vCons + ' belong to different components.';
      } else if (step.type === 'accept') {
        var eAcc = currentGraph.edge(step.edgeId);
        var uAcc = eAcc ? eAcc.u : '';
        var vAcc = eAcc ? eAcc.v : '';
        var wAcc = eAcc ? eAcc.w : '';
        elCaption.textContent = 'Edge ' + step.edgeId + ' (' + wAcc + '): ' + uAcc + ' and ' + vAcc + ' are in separate groups. Accept edge and merge groups.';
      } else if (step.type === 'reject') {
        var eRej = currentGraph.edge(step.edgeId);
        var uRej = eRej ? eRej.u : '';
        var vRej = eRej ? eRej.v : '';
        var wRej = eRej ? eRej.w : '';
        elCaption.textContent = 'Edge ' + step.edgeId + ' (' + wRej + '): ' + uRej + ' and ' + vRej + ' are already in the same group, so adding it would make a loop. Skip.';
      } else if (step.type === 'done') {
        elCaption.textContent = 'Algorithm finished: found minimum spanning tree with ' + acceptedCount + ' edges. Total cost = ' + totalCost + '.';
      }
    }

    // Determine accepted and rejected edges up to current index
    var acceptedSet = new Set(step ? step.acceptedEdges : []);
    var rejectedSet = new Set();
    if (index >= 0) {
      for (var si = 0; si <= index; si++) {
        if (steps[si].type === 'reject' && steps[si].edgeId) {
          rejectedSet.add(steps[si].edgeId);
        }
      }
    }

    // 5. Sorted edge list UI update
    if (elEdgeList) {
      var rows = elEdgeList.querySelectorAll('.s07-edge-row');
      for (var ri = 0; ri < rows.length; ri++) {
        var row = rows[ri];
        var eid = row.getAttribute('data-edge-id');
        var chip = row.querySelector('.chip');
        var isCurrent = (step && step.edgeId === eid);

        row.classList.remove('current', 'accepted', 'rejected');

        if (acceptedSet.has(eid)) {
          row.classList.add('accepted');
          if (chip) {
            chip.className = 'chip accepted';
            chip.textContent = 'accepted';
          }
        } else if (rejectedSet.has(eid)) {
          row.classList.add('rejected');
          if (chip) {
            chip.className = 'chip rejected';
            chip.textContent = 'rejected';
          }
        } else {
          if (chip) {
            chip.className = 'chip pending';
            chip.textContent = 'pending';
          }
        }

        if (isCurrent) {
          row.classList.add('current');
          try {
            row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          } catch (_) {}
        }
      }
    }

    // 6. Union-Find Parent Table & Components
    var parentMap = step ? step.parentSnapshot : null;
    var nodeIter = currentGraph._nodes.values();
    var allNodes = [];
    for (var nit = nodeIter.next(); !nit.done; nit = nodeIter.next()) {
      allNodes.push(nit.value);
    }
    allNodes.sort(function (a, b) { return a.id < b.id ? -1 : 1; });

    if (elUfParent) {
      elUfParent.innerHTML = '';
      for (var pi = 0; pi < allNodes.length; pi++) {
        var nid = allNodes[pi].id;
        var pVal = (parentMap && parentMap[nid]) ? parentMap[nid] : nid;
        var cell = document.createElement('div');
        cell.className = 's07-uf-cell';
        cell.innerHTML = '<span class="s07-uf-cell-k">' + nid + '</span><span class="s07-uf-cell-v">' + pVal + '</span>';
        elUfParent.appendChild(cell);
      }
    }

    // Component color map and chips
    var colorMap = {};
    if (elUfChips) {
      elUfChips.innerHTML = '';
      if (index === -1 || !step) {
        // All singleton components
        for (var si2 = 0; si2 < allNodes.length; si2++) {
          var snid = allNodes[si2].id;
          var sCol = PALETTE[nodeIndex(snid)];
          colorMap[snid] = sCol;

          var sChip = document.createElement('span');
          sChip.className = 's07-comp-chip';
          sChip.style.background = sCol;
          sChip.textContent = '{' + snid + '}';
          elUfChips.appendChild(sChip);
        }
      } else {
        var comps = step.componentsAfter || [];
        for (var ci = 0; ci < comps.length; ci++) {
          var comp = comps[ci];
          var rootNode = findRoot(comp[0], step.parentSnapshot);
          var compColor = PALETTE[nodeIndex(rootNode)];

          for (var cj = 0; cj < comp.length; cj++) {
            colorMap[comp[cj]] = compColor;
          }

          var compChip = document.createElement('span');
          compChip.className = 's07-comp-chip';
          compChip.style.background = compColor;
          compChip.textContent = '{' + comp.slice().sort().join(',') + '}';
          elUfChips.appendChild(compChip);
        }
      }
    }

    // Apply component colors to graph nodes
    view.setNodeColors(colorMap);

    // 7. Graph Edge States
    clearCycleHighlights();
    clearTimeout(rejectTimeout);

    var eIter = currentGraph._edges.values();
    for (var eit = eIter.next(); !eit.done; eit = eIter.next()) {
      var eObj = eit.value;
      if (acceptedSet.has(eObj.id)) {
        view.setEdgeState(eObj.id, 'accepted');
      } else if (rejectedSet.has(eObj.id)) {
        view.setEdgeState(eObj.id, 'rejected');
      } else if (step && step.type === 'consider' && step.edgeId === eObj.id) {
        view.setEdgeState(eObj.id, 'candidate');
      } else {
        view.setEdgeState(eObj.id, 'default');
      }
    }

    // 8. Dynamic forward animations (ripple & cycle-flash)
    if (dir === 'forward' && step) {
      if (step.type === 'accept') {
        view.drawEdgeIn(step.edgeId, 320);
        view.pulse(step.edgeId);
      } else if (step.type === 'reject') {
        var rejE = currentGraph.edge(step.edgeId);
        if (rejE) {
          var cyclePath = NG.Algo.pathInForest(currentGraph, rejE.u, rejE.v, { onlyEdges: step.acceptedEdges });
          if (cyclePath) {
            view.highlightPath({
              edges: cyclePath.edges.concat([step.edgeId]),
              nodes: cyclePath.nodes
            });
          }
        }
        view.flashEdge(step.edgeId, 'cycle');
        rejectTimeout = setTimeout(function () {
          clearCycleHighlights();
        }, 600);
      }
    }
  }

  function setupGraphAndStepper(graph) {
    if (stepper) {
      stepper.pause();
    }
    clearTimeout(rejectTimeout);

    currentGraph = graph;
    steps = NG.Algo.kruskalSteps(currentGraph);

    // Get sorted edges from first step or sort manually
    sortedEdgeIds = (steps.length > 0 && steps[0].sortedEdgeIds) ?
      steps[0].sortedEdgeIds.slice() :
      [];

    if (sortedEdgeIds.length === 0) {
      var allE = [];
      var it = currentGraph._edges.values();
      for (var val = it.next(); !val.done; val = it.next()) allE.push(val.value);
      allE.sort(function (a, b) { return a.w !== b.w ? a.w - b.w : (a.id < b.id ? -1 : 1); });
      sortedEdgeIds = allE.map(function (e) { return e.id; });
    }

    var canvas = document.getElementById('s07-canvas');
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

    view.onNodeDragEnd = function () {
      if (stepper && stepper.index > -1) {
        stepper.reset();
        updatePlayButton();
      }
    };

    populateEdgeListTable();

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

  NG.slides.s07 = {
    init: function (root) {
      elPlayBtn = document.getElementById('s07-btn-play');
      elStepBtn = document.getElementById('s07-btn-step');
      elBackBtn = document.getElementById('s07-btn-back');
      elResetBtn = document.getElementById('s07-btn-reset');
      elSpeedSlider = document.getElementById('s07-speed-slider');
      elSpeedVal = document.getElementById('s07-speed-val');
      elRandBtn = document.getElementById('s07-btn-rand');
      elExampleBtn = document.getElementById('s07-btn-example');

      elStatK = document.getElementById('s07-stat-k');
      elStatTotal = document.getElementById('s07-stat-total');
      elStatStep = document.getElementById('s07-stat-step');
      elStatMax = document.getElementById('s07-stat-max');
      elBanner = document.getElementById('s07-banner');

      elEdgeList = document.getElementById('s07-edge-list');
      elUfParent = document.getElementById('s07-uf-parent');
      elUfChips = document.getElementById('s07-uf-chips');
      elCaption = document.getElementById('s07-caption');
      elPseudocode = document.getElementById('s07-pseudocode');

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
          randomSeedCounter += 31337;
          var rg = generateRandomGraph(randomSeedCounter);
          setupGraphAndStepper(rg);
        });
      }

      if (elExampleBtn) {
        elExampleBtn.addEventListener('click', function () {
          var cg = buildCanonical();
          setupGraphAndStepper(cg);
        });
      }

      // Initial canonical setup
      var canonical = buildCanonical();
      setupGraphAndStepper(canonical);
    },

    pause: function () {
      if (stepper) {
        stepper.pause();
        updatePlayButton();
      }
      clearTimeout(rejectTimeout);
      clearCycleHighlights();
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
      clearTimeout(rejectTimeout);
      if (view) {
        view.destroy();
        view = null;
      }
    }
  };

})();
