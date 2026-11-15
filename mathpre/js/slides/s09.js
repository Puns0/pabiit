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

  // State variables
  var activeTab = 'cut'; // 'cut' | 'cycle' | 'algs'
  var storyStep = 1;     // 1-based index within current tab
  var isInteractive = false;

  var cutGraph = null;
  var cutView = null;
  var cycleGraph = null;
  var cycleView = null;

  var currentCutPartition = ['A', 'B']; // S
  var mstEdgeSet = new Set(['EH', 'EF', 'BE', 'AB', 'CF', 'DE', 'GH']);
  var cutLineEl = null;
  var isDraggingCut = false;
  var cutStartPt = null;

  // DOM Elements
  var elRoot = null;
  var elMainTabs = [];
  var elFigViews = {};

  var elTopicChip = null;
  var elModeTag = null;
  var elStoryTitle = null;
  var elPastSteps = null;
  var elCurrentStepText = null;
  var elCurrentStepDetail = null;

  var elBtnBack = null;
  var elBtnNext = null;
  var elBtnReset = null;
  var elProgressDots = null;

  var elBtnInteractive = null;
  var elInteractiveLabel = null;
  var elBtnProof = null;

  // Cut View DOM
  var elCutHint = null;
  var elBtnRandCut = null;
  var elCutGraphWrap = null;
  var elCutStatus = null;
  var elCutMstChip = null;
  var elCrossingItems = null;

  // Cycle View DOM
  var elCycleHint = null;
  var elBtnResetCycle = null;
  var elCycleGraphWrap = null;
  var elCycleStatus = null;
  var elCycleMstChip = null;
  var elCycleItems = null;

  // Algs View DOM
  var elAlgCards = [];

  // Modal Proof Drawer
  var elProofModal = null;
  var elBtnCloseProof = null;

  // Keydown bound listener
  var boundKeydownHandler = null;

  // Story definition table
  var STORIES = {
    cut: {
      title: 'Pick any cut, take the lightest edge.',
      chip: 'Cut Property',
      totalSteps: 4,
      steps: [
        {
          text: 'Cut the graph into two parts: S and V \\ S.',
          detail: 'A cut is any split of the nodes into two non-empty sets. Edges with one endpoint in S and one in V \\ S cross the cut.',
          action: function () { renderCutStep1(); }
        },
        {
          text: 'Take the lightest edge crossing the cut: e = BE (weight 3).',
          detail: 'Any spanning tree must connect S to V \\ S, so it must pick at least one crossing edge. The lightest crossing edge is always a safe choice.',
          action: function () { renderCutStep2(); }
        },
        {
          text: 'Any tree T that leaves out e must cross on another edge f (e.g. AE, wt 5).',
          detail: 'Because B ∈ S and E ∈ V \\ S, the tree path in T between B and E must cross the cut somewhere. That crossing edge f has weight w(f) ≥ w(e).',
          action: function () { renderCutStep3(); }
        },
        {
          text: 'Swap f → e: weight cannot increase (31 ≤ 33). So e ∈ MST! Q.E.D.',
          detail: 'New tree T\' = T − f + e stays connected and w(T\') = w(T) − w(f) + w(e) = 33 − 5 + 3 = 31 ≤ 33. Minimality proves e belongs in an MST!',
          action: function () { renderCutStep4(); }
        }
      ]
    },
    cycle: {
      title: 'Any cycle\'s heaviest edge can NEVER be in an MST.',
      chip: 'Cycle Property',
      totalSteps: 3,
      steps: [
        {
          text: 'Find any cycle in the graph: here A-B-E-A.',
          detail: 'A cycle provides multiple alternative paths between its vertices. Here the cycle edges have weights AB=4, BE=3, and AE=5.',
          action: function () { renderCycleStep1(); }
        },
        {
          text: 'The heaviest edge on this cycle is e = AE (weight 5).',
          detail: 'The Cycle Property states that the unique heaviest edge on any cycle can never belong to any Minimum Spanning Tree.',
          action: function () { renderCycleStep2(); }
        },
        {
          text: 'If T had AE, cutting it allows reconnecting with a lighter edge (32 → 31). Contradiction! Q.E.D.',
          detail: 'Cutting AE splits T into two pieces. The cycle reconnects them via AB (4) or BE (3), which strictly drops total weight. Contradicting minimality!',
          action: function () { renderCycleStep3(); }
        }
      ]
    },
    algs: {
      title: 'Why Kruskal & Prim only make provably safe moves.',
      chip: 'Algorithm Correctness',
      totalSteps: 3,
      steps: [
        {
          text: 'Kruskal adds the lightest edge between components → safe by Cut Property.',
          detail: 'When Kruskal accepts (u, v), let S = component of u. No accepted edge crosses (S, V \\ S), and (u,v) is the lightest crossing edge.',
          action: function () { highlightAlgCard(0); }
        },
        {
          text: 'Kruskal rejects cycle-closing edges → safe by Cycle Property.',
          detail: 'Edges are sorted in ascending weight order. Any edge that would create a cycle is strictly the heaviest in that cycle, so discarding it is provably safe.',
          action: function () { highlightAlgCard(1); }
        },
        {
          text: 'Prim adds the lightest edge leaving the visited tree → safe by Cut Property.',
          detail: 'At every step, let S = visited tree. Prim greedily chooses the lightest edge crossing the cut from S to unvisited nodes, which is safe by the Cut Property.',
          action: function () { highlightAlgCard(2); }
        }
      ]
    }
  };

  /* --------------------------------------------------------------
     DOM Initialisation & Event Wiring
     -------------------------------------------------------------- */
  function init(root) {
    elRoot = root || document.getElementById('s09');
    if (!elRoot) return;

    // Header & Tabs
    elMainTabs = Array.from(elRoot.querySelectorAll('.s09-tab-btn'));
    elFigViews = {
      cut: document.getElementById('s09-fig-cut'),
      cycle: document.getElementById('s09-fig-cycle'),
      algs: document.getElementById('s09-fig-algs')
    };

    // Story Panel DOM
    elTopicChip = document.getElementById('s09-topic-chip');
    elModeTag = document.getElementById('s09-mode-tag');
    elStoryTitle = document.getElementById('s09-story-title');
    elPastSteps = document.getElementById('s09-past-steps');
    elCurrentStepText = document.getElementById('s09-current-step-text');
    elCurrentStepDetail = document.getElementById('s09-current-step-detail');

    elBtnBack = document.getElementById('s09-btn-back');
    elBtnNext = document.getElementById('s09-btn-next');
    elBtnReset = document.getElementById('s09-btn-reset');
    elProgressDots = document.getElementById('s09-progress-dots');

    elBtnInteractive = document.getElementById('s09-btn-interactive');
    elInteractiveLabel = document.getElementById('s09-interactive-btn-label');
    elBtnProof = document.getElementById('s09-btn-proof');

    // Cut DOM
    elCutHint = document.getElementById('s09-cut-hint');
    elBtnRandCut = document.getElementById('s09-btn-rand-cut');
    elCutGraphWrap = document.getElementById('s09-cut-graph');
    elCutStatus = document.getElementById('s09-cut-status');
    elCutMstChip = document.getElementById('s09-cut-mst-chip');
    elCrossingItems = document.getElementById('s09-crossing-items');

    // Cycle DOM
    elCycleHint = document.getElementById('s09-cycle-hint');
    elBtnResetCycle = document.getElementById('s09-btn-reset-cycle');
    elCycleGraphWrap = document.getElementById('s09-cycle-graph');
    elCycleStatus = document.getElementById('s09-cycle-status');
    elCycleMstChip = document.getElementById('s09-cycle-mst-chip');
    elCycleItems = document.getElementById('s09-cycle-items');

    // Algs DOM
    elAlgCards = [
      document.getElementById('s09-alg-kruskal-add'),
      document.getElementById('s09-alg-kruskal-rej'),
      document.getElementById('s09-alg-prim-add')
    ];

    // Proof Modal
    elProofModal = document.getElementById('s09-proof-modal');
    elBtnCloseProof = document.getElementById('s09-btn-close-proof');

    // Graphs initialization
    initGraphs();

    // Event listeners for tabs
    elMainTabs.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-tab');
        if (tab) switchTab(tab);
      });
    });

    // Story controls
    if (elBtnBack) {
      elBtnBack.addEventListener('click', function () { prevStep(); });
    }
    if (elBtnNext) {
      elBtnNext.addEventListener('click', function () { nextStep(); });
    }
    if (elBtnReset) {
      elBtnReset.addEventListener('click', function () { resetStory(); });
    }
    if (elBtnInteractive) {
      elBtnInteractive.addEventListener('click', function () { toggleInteractive(); });
    }
    if (elBtnProof) {
      elBtnProof.addEventListener('click', function () { openProofModal(); });
    }
    if (elBtnCloseProof) {
      elBtnCloseProof.addEventListener('click', function () { closeProofModal(); });
    }
    if (elProofModal) {
      elProofModal.addEventListener('click', function (e) {
        if (e.target === elProofModal) closeProofModal();
      });
    }

    // Cut toolbar
    if (elBtnRandCut) {
      elBtnRandCut.addEventListener('click', function () { randomCut(); });
    }
    if (elBtnResetCycle) {
      elBtnResetCycle.addEventListener('click', function () { resetCycleDemo(); });
    }

    // Keyboard navigation
    setupKeyboardListeners();

    // Display initial state
    updateStoryView();
  }

  function initGraphs() {
    if (!cutGraph) cutGraph = buildCanonicalGraph();
    if (!cycleGraph) cycleGraph = buildCanonicalGraph();

    if (elCutGraphWrap && !cutView) {
      cutView = new NG.View(elCutGraphWrap, cutGraph, {
        width: 580,
        height: 420,
        viewBox: '0 0 580 420',
        draggable: false,
        showWeights: true
      });
      setupCutPointerEvents();
      setupCutNodeClick();
    }

    if (elCycleGraphWrap && !cycleView) {
      cycleView = new NG.View(elCycleGraphWrap, cycleGraph, {
        width: 580,
        height: 420,
        viewBox: '0 0 580 420',
        draggable: false,
        showWeights: true
      });
      setupCycleEdgeClick();
    }
  }

  /* --------------------------------------------------------------
     Tab Switching & Story Stepping
     -------------------------------------------------------------- */
  function switchTab(tabName) {
    if (!STORIES[tabName]) return;
    activeTab = tabName;
    storyStep = 1;
    isInteractive = false;

    // Update Top Tab buttons
    elMainTabs.forEach(function (btn) {
      var matches = btn.getAttribute('data-tab') === tabName;
      btn.classList.toggle('active', matches);
      btn.setAttribute('aria-selected', matches ? 'true' : 'false');
    });

    // Update Figure View
    for (var k in elFigViews) {
      if (elFigViews[k]) {
        elFigViews[k].classList.toggle('active', k === tabName);
      }
    }

    // Interactive button display / text
    if (elInteractiveLabel) {
      elInteractiveLabel.textContent = 'Try it yourself';
    }
    if (elBtnInteractive) {
      elBtnInteractive.style.display = (tabName === 'algs') ? 'none' : 'inline-block';
    }

    updateStoryView();
  }

  function nextStep() {
    if (isInteractive) {
      toggleInteractive(false);
      return;
    }
    var total = STORIES[activeTab].totalSteps;
    if (storyStep < total) {
      storyStep++;
      updateStoryView();
    }
  }

  function prevStep() {
    if (isInteractive) {
      toggleInteractive(false);
      return;
    }
    if (storyStep > 1) {
      storyStep--;
      updateStoryView();
    }
  }

  function goToStep(s) {
    if (isInteractive) isInteractive = false;
    var total = STORIES[activeTab].totalSteps;
    storyStep = Math.max(1, Math.min(total, s));
    updateStoryView();
  }

  function resetStory() {
    storyStep = 1;
    isInteractive = false;
    updateStoryView();
  }

  function updateStoryView() {
    var story = STORIES[activeTab];
    var cur = story.steps[storyStep - 1];

    if (elTopicChip) elTopicChip.textContent = story.chip;
    if (elModeTag) {
      elModeTag.textContent = isInteractive ? 'Free Interactive Mode' : 'Guided Story (Step ' + storyStep + '/' + story.totalSteps + ')';
      elModeTag.classList.toggle('interactive', isInteractive);
    }
    if (elStoryTitle) elStoryTitle.textContent = story.title;

    // Past steps (small greyed one-liners above)
    if (elPastSteps) {
      elPastSteps.innerHTML = '';
      if (!isInteractive) {
        for (var i = 0; i < storyStep - 1; i++) {
          var pDiv = document.createElement('div');
          pDiv.className = 's09-past-step-item';
          pDiv.textContent = 'Step ' + (i + 1) + ': ' + story.steps[i].text;
          elPastSteps.appendChild(pDiv);
        }
      }
    }

    // Current step (big, at least 24px on 1920x1080)
    if (elCurrentStepText) {
      if (isInteractive) {
        if (activeTab === 'cut') {
          elCurrentStepText.textContent = 'Click any node to flip its set, or drag a line to partition.';
        } else if (activeTab === 'cycle') {
          elCurrentStepText.textContent = 'Click ANY of the 13 edges to test its cycle property.';
        }
      } else {
        elCurrentStepText.textContent = cur.text;
      }
    }

    if (elCurrentStepDetail) {
      if (isInteractive) {
        if (activeTab === 'cut') {
          elCurrentStepDetail.textContent = 'Explore different cuts of the graph. The lightest crossing edge is guaranteed to belong to the canonical MST.';
        } else if (activeTab === 'cycle') {
          elCurrentStepDetail.textContent = 'The 6 non-MST edges are strictly heaviest on an identified cycle. The 7 MST edges are never heaviest on any cycle.';
        }
      } else {
        elCurrentStepDetail.textContent = cur.detail;
      }
    }

    // Nav controls state
    if (elBtnBack) elBtnBack.disabled = isInteractive || (storyStep === 1);
    if (elBtnNext) {
      elBtnNext.disabled = isInteractive || (storyStep === story.totalSteps);
      elBtnNext.textContent = (storyStep === story.totalSteps) ? 'Finished' : 'Next step';
    }

    // Progress dots
    renderProgressDots(story.totalSteps, storyStep);

    // Toolbar buttons in figure view
    if (elBtnRandCut) {
      elBtnRandCut.style.display = (activeTab === 'cut' && isInteractive) ? 'inline-block' : 'none';
    }
    if (elBtnResetCycle) {
      elBtnResetCycle.style.display = (activeTab === 'cycle' && isInteractive) ? 'inline-block' : 'none';
    }

    // Execute corresponding graph action
    if (!isInteractive && cur && typeof cur.action === 'function') {
      cur.action();
    }
  }

  function renderProgressDots(total, current) {
    if (!elProgressDots) return;
    elProgressDots.innerHTML = '';
    for (var i = 1; i <= total; i++) {
      var dot = document.createElement('button');
      dot.className = 's09-dot';
      dot.setAttribute('type', 'button');
      dot.setAttribute('aria-label', 'Go to step ' + i);
      if (i === current) dot.classList.add('active');
      else if (i < current) dot.classList.add('completed');

      (function (stepNum) {
        dot.addEventListener('click', function (e) {
          e.stopPropagation();
          goToStep(stepNum);
        });
      })(i);

      elProgressDots.appendChild(dot);
    }
  }

  /* --------------------------------------------------------------
     Interactive Mode Toggle
     -------------------------------------------------------------- */
  function toggleInteractive(forceState) {
    if (activeTab === 'algs') return;
    isInteractive = (typeof forceState === 'boolean') ? forceState : !isInteractive;

    if (elInteractiveLabel) {
      elInteractiveLabel.textContent = isInteractive ? 'Back to Story' : 'Try it yourself';
    }

    if (isInteractive) {
      if (activeTab === 'cut') {
        if (elCutHint) elCutHint.textContent = 'Interactive Mode: Click nodes to toggle, or drag a line to partition.';
        applyInteractiveCut(currentCutPartition);
      } else if (activeTab === 'cycle') {
        if (elCycleHint) elCycleHint.textContent = 'Interactive Mode: Click any edge to test if it is heaviest on a cycle.';
        resetCycleDemo();
      }
    }

    updateStoryView();
  }

  /* --------------------------------------------------------------
     Tab 1: Cut Property Visuals
     -------------------------------------------------------------- */
  function ensureCutLine() {
    if (!cutView) return null;
    var overlay = cutView.layer('overlay');
    if (!overlay) return null;

    if (!cutLineEl || cutLineEl.parentNode !== overlay) {
      cutLineEl = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      cutLineEl.setAttribute('id', 's09-cut-line');
      cutLineEl.setAttribute('stroke', '#E4411F');
      cutLineEl.setAttribute('stroke-width', '3');
      cutLineEl.setAttribute('stroke-dasharray', '7 5');
      cutLineEl.style.display = 'none';
      cutLineEl.style.pointerEvents = 'none';
      overlay.appendChild(cutLineEl);
    }
    return cutLineEl;
  }

  function setCutLineCoords(x1, y1, x2, y2) {
    var line = ensureCutLine();
    if (!line) return;
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.style.display = 'block';
  }

  function hideCutLine() {
    if (cutLineEl) cutLineEl.style.display = 'none';
  }

  function renderCutNodes(setSArray) {
    if (!cutView) return;
    var sSet = new Set(setSArray);
    for (var i = 0; i < CANONICAL_NODES.length; i++) {
      var n = CANONICAL_NODES[i];
      var isS = sSet.has(n.id);
      var fillColor = isS ? '#178A86' : '#D49A00'; // Teal vs Mustard
      var textColor = isS ? '#FDFBF7' : '#1F2421'; // Crisp contrast

      cutView.setNodeState(n.id, { fill: fillColor, ring: '#1F2421' });
      var nodeItem = cutView._nodeEls.get(n.id);
      if (nodeItem && nodeItem.text) {
        nodeItem.text.style.fill = textColor;
      }
    }
  }

  function resetCutEdgesFaded() {
    if (!cutView) return;
    for (var i = 0; i < CANONICAL_EDGES.length; i++) {
      var e = CANONICAL_EDGES[i];
      var eid = e.u + e.v;
      cutView.setEdgeState(eid, 'faded');
    }
  }

  // Step 1: Pick any cut S = {A, B}
  function renderCutStep1() {
    currentCutPartition = ['A', 'B'];
    renderCutNodes(currentCutPartition);
    resetCutEdgesFaded();

    // Line from (-30, 175) to (470, 15) separates {A, B} from {C, D, E, F, G, H}
    setCutLineCoords(-20, 175, 470, 15);

    var cutRes = NG.Algo.cut(cutGraph, currentCutPartition);
    cutRes.crossing.forEach(function (eid) {
      cutView.setEdgeState(eid, 'candidate');
    });

    if (elCutHint) elCutHint.textContent = 'Cut (S, V\\S): S = {A, B} (Teal) vs V\\S = {C, D, E, F, G, H} (Mustard)';
    if (elCutStatus) {
      elCutStatus.className = 'chip';
      elCutStatus.textContent = '4 edges cross the cut: BE(3), AE(5), AD(9), BC(10)';
    }
    if (elCutMstChip) elCutMstChip.style.display = 'none';
    if (elCrossingItems) elCrossingItems.textContent = 'BE (3), AE (5), AD (9), BC (10)';
  }

  // Step 2: Take lightest edge e = BE (wt 3)
  function renderCutStep2() {
    renderCutStep1();
    if (cutView) {
      cutView.setEdgeState('BE', 'accepted');
    }
    if (elCutStatus) {
      elCutStatus.className = 'chip';
      elCutStatus.textContent = 'Lightest crossing edge: e = BE (wt 3) — safe for MST';
    }
    if (elCutMstChip) {
      elCutMstChip.style.display = 'inline-block';
      elCutMstChip.className = 'chip chip-success';
      elCutMstChip.textContent = '✓ Verified: BE is in canonical MST';
    }
  }

  // Step 3: Any tree T leaving out e must cross on f (e.g. AE, wt 5)
  function renderCutStep3() {
    currentCutPartition = ['A', 'B'];
    renderCutNodes(currentCutPartition);
    resetCutEdgesFaded();
    setCutLineCoords(-20, 175, 470, 15);

    // Tree without BE: AB, AE, DE, EF, EH, CF, GH (weight 33)
    var treeWithoutBE = ['AB', 'DE', 'EF', 'EH', 'CF', 'GH'];
    treeWithoutBE.forEach(function (eid) {
      cutView.setEdgeState(eid, 'accepted');
    });

    // Crossing edge f = AE in Alarm/Broken style
    cutView.setEdgeState('AE', 'broken');
    cutView.setEdgeState('BE', 'candidate');

    if (elCutStatus) {
      elCutStatus.className = 'chip chip-alarm';
      elCutStatus.textContent = 'Tree T without BE crosses cut on edge f = AE (wt 5), total w(T) = 33';
    }
    if (elCutMstChip) {
      elCutMstChip.style.display = 'inline-block';
      elCutMstChip.className = 'chip';
      elCutMstChip.textContent = 'Path B-A-E in T crosses cut at f = AE';
    }
    if (elCrossingItems) {
      elCrossingItems.textContent = 'Swap candidate: replace f = AE (wt 5) with e = BE (wt 3)';
    }
  }

  // Step 4: Swap f -> e, w(T') <= w(T). So e in MST!
  function renderCutStep4() {
    currentCutPartition = ['A', 'B'];
    renderCutNodes(currentCutPartition);
    resetCutEdgesFaded();
    setCutLineCoords(-20, 175, 470, 15);

    // Canonical MST with BE (weight 31)
    var canonicalMST = ['AB', 'BE', 'DE', 'EF', 'EH', 'CF', 'GH'];
    canonicalMST.forEach(function (eid) {
      cutView.setEdgeState(eid, 'accepted');
    });

    if (elCutStatus) {
      elCutStatus.className = 'chip';
      elCutStatus.textContent = 'New Tree T\' = T − f + e has weight 33 − 5 + 3 = 31 ≤ 33';
    }
    if (elCutMstChip) {
      elCutMstChip.style.display = 'inline-block';
      elCutMstChip.className = 'chip chip-success';
      elCutMstChip.textContent = '✓ Q.E.D. Lightest crossing edge e belongs to an MST!';
    }
    if (elCrossingItems) {
      elCrossingItems.textContent = 'MST edges: AB (4), BE (3), DE (7), EF (2), EH (1), CF (6), GH (8) — Total = 31';
    }
  }

  /* --------------------------------------------------------------
     Interactive Cut & Line Dragging
     -------------------------------------------------------------- */
  function setupCutPointerEvents() {
    if (!cutView || !cutView.svg) return;
    var svg = cutView.svg;

    svg.addEventListener('pointerdown', function (e) {
      if (!isInteractive || activeTab !== 'cut') return;
      isDraggingCut = true;
      try { svg.setPointerCapture(e.pointerId); } catch (_) {}
      cutStartPt = cutView._clientToSvgPoint(e.clientX, e.clientY);
      var line = ensureCutLine();
      if (line) {
        line.setAttribute('x1', cutStartPt.x);
        line.setAttribute('y1', cutStartPt.y);
        line.setAttribute('x2', cutStartPt.x);
        line.setAttribute('y2', cutStartPt.y);
        line.style.display = 'block';
      }
    });

    svg.addEventListener('pointermove', function (e) {
      if (!isDraggingCut || !cutStartPt || !isInteractive || activeTab !== 'cut') return;
      var curPt = cutView._clientToSvgPoint(e.clientX, e.clientY);
      var line = ensureCutLine();
      if (line) {
        line.setAttribute('x2', curPt.x);
        line.setAttribute('y2', curPt.y);
      }
    });

    function onPointerFinish(e) {
      if (!isDraggingCut || !cutStartPt) return;
      isDraggingCut = false;
      try { svg.releasePointerCapture(e.pointerId); } catch (_) {}

      var endPt = cutView._clientToSvgPoint(e.clientX, e.clientY);
      var dx = endPt.x - cutStartPt.x;
      var dy = endPt.y - cutStartPt.y;
      var dist = Math.hypot(dx, dy);

      if (dist < 15) {
        // Simple tap: don't clear line, do nothing
        return;
      }

      // Extend line across canvas
      var len = dist;
      var ux = dx / len;
      var uy = dy / len;
      var cx = (cutStartPt.x + endPt.x) / 2;
      var cy = (cutStartPt.y + endPt.y) / 2;

      var x1 = cx - ux * 550;
      var y1 = cy - uy * 550;
      var x2 = cx + ux * 550;
      var y2 = cy + uy * 550;

      setCutLineCoords(x1, y1, x2, y2);

      // Evaluate partition: line equation (y2 - y1)*x - (x2 - x1)*y + (x2*y1 - x1*y2) = 0
      var setS = [];
      for (var i = 0; i < CANONICAL_NODES.length; i++) {
        var n = CANONICAL_NODES[i];
        var side = (n.x - cutStartPt.x) * dy - (n.y - cutStartPt.y) * dx;
        if (side > 0) {
          setS.push(n.id);
        }
      }

      if (setS.length > 0 && setS.length < CANONICAL_NODES.length) {
        applyInteractiveCut(setS);
      } else {
        if (elCutStatus) {
          elCutStatus.className = 'chip chip-alarm';
          elCutStatus.textContent = 'Draw a line dividing the nodes into two non-empty sets.';
        }
      }
    }

    svg.addEventListener('pointerup', onPointerFinish);
    svg.addEventListener('pointercancel', onPointerFinish);
  }

  function toggleCutNode(nodeId) {
    if (!isInteractive || activeTab !== 'cut') return;
    var sSet = new Set(currentCutPartition);
    if (sSet.has(nodeId)) {
      sSet.delete(nodeId);
    } else {
      sSet.add(nodeId);
    }
    var newS = Array.from(sSet);
    if (newS.length === 0 || newS.length === CANONICAL_NODES.length) {
      if (elCutStatus) {
        elCutStatus.className = 'chip chip-alarm';
        elCutStatus.textContent = 'A cut must leave at least one node on each side.';
      }
      return;
    }
    hideCutLine();
    applyInteractiveCut(newS);
  }

  function setupCutNodeClick() {
    if (!cutView) return;
    cutView.onNodeClick = function (nodeId) {
      toggleCutNode(nodeId);
    };
  }

  function applyInteractiveCut(setSArray) {
    currentCutPartition = setSArray;
    renderCutNodes(currentCutPartition);
    resetCutEdgesFaded();

    var cutRes = NG.Algo.cut(cutGraph, setSArray);
    var crossing = cutRes.crossing;
    var lightest = cutRes.lightest;

    crossing.forEach(function (eid) {
      cutView.setEdgeState(eid, 'candidate');
    });

    if (lightest) {
      cutView.setEdgeState(lightest, 'accepted');
    }

    var lightestEdge = cutGraph.edge(lightest);
    var lightestLabel = lightestEdge ? (lightest + ' (wt ' + lightestEdge.w + ')') : 'none';
    var isMST = lightest && mstEdgeSet.has(lightest);

    if (elCutHint) {
      var sStr = setSArray.join(', ');
      elCutHint.textContent = 'Cut: S = {' + sStr + '} vs V\\S';
    }

    if (elCutStatus) {
      elCutStatus.className = 'chip';
      elCutStatus.textContent = 'Lightest crossing edge: e = ' + lightestLabel;
    }

    if (elCutMstChip) {
      elCutMstChip.style.display = 'inline-block';
      elCutMstChip.className = isMST ? 'chip chip-success' : 'chip chip-alarm';
      elCutMstChip.textContent = isMST ? '✓ Verified: ' + lightest + ' is in the canonical MST' : 'Edge not in canonical MST';
    }

    if (elCrossingItems) {
      var items = crossing.map(function (eid) {
        var ed = cutGraph.edge(eid);
        var tag = (eid === lightest) ? ' [LIGHTEST]' : '';
        return eid + ' (' + (ed ? ed.w : '') + ')' + tag;
      });
      elCrossingItems.textContent = items.join(', ') || 'none';
    }
  }

  function randomCut() {
    var s = [];
    while (s.length === 0 || s.length === CANONICAL_NODES.length) {
      s = [];
      for (var i = 0; i < CANONICAL_NODES.length; i++) {
        if (Math.random() > 0.5) s.push(CANONICAL_NODES[i].id);
      }
    }
    hideCutLine();
    applyInteractiveCut(s);
  }

  /* --------------------------------------------------------------
     Tab 2: Cycle Property Visuals (Distinct Visual Identity)
     -------------------------------------------------------------- */
  function clearCycleGraphStyles() {
    if (!cycleView) return;
    // Nodes MUST remain in default bone/paper (NO Teal/Mustard!)
    for (var i = 0; i < CANONICAL_NODES.length; i++) {
      var nid = CANONICAL_NODES[i].id;
      var nodeItem = cycleView._nodeEls.get(nid);
      if (nodeItem) {
        nodeItem.circle.style.fill = '';
        nodeItem.circle.style.stroke = '';
        if (nodeItem.text) nodeItem.text.style.fill = '';
        nodeItem.group.setAttribute('class', 'graph-node');
      }
    }

    // Reset edges
    for (var j = 0; j < CANONICAL_EDGES.length; j++) {
      var e = CANONICAL_EDGES[j];
      var eid = e.u + e.v;
      var edgeItem = cycleView._edgeEls.get(eid);
      if (edgeItem) {
        edgeItem.group.classList.remove('cycle-edge-loop', 'cycle-edge-heaviest', 's09-faded-edge');
        edgeItem.line.removeAttribute('style');
        edgeItem.cross.style.display = 'none';
        cycleView.setEdgeState(eid, 'faded');
        edgeItem.group.classList.add('s09-faded-edge');
      }
    }
  }

  function highlightCycleEdges(loopEdgeIds, heaviestEdgeId) {
    if (!cycleView) return;
    clearCycleGraphStyles();

    loopEdgeIds.forEach(function (eid) {
      var item = cycleView._edgeEls.get(eid);
      if (item) {
        item.group.classList.remove('s09-faded-edge');
        item.group.classList.add('cycle-edge-loop');
      }
    });

    if (heaviestEdgeId) {
      var hItem = cycleView._edgeEls.get(heaviestEdgeId);
      if (hItem) {
        hItem.group.classList.remove('s09-faded-edge', 'cycle-edge-loop');
        hItem.group.classList.add('cycle-edge-heaviest');
        hItem.cross.style.display = '';
      }
    }
  }

  // Step 1: Cycle A-B-E (Cobalt loop)
  function renderCycleStep1() {
    highlightCycleEdges(['AB', 'BE', 'AE'], null);

    if (elCycleHint) elCycleHint.textContent = 'Canonical cycle: A-B-E (Cobalt loop), edge weights: AB=4, BE=3, AE=5';
    if (elCycleStatus) {
      elCycleStatus.className = 'chip';
      elCycleStatus.textContent = 'Active cycle: A-B-E (edges AB=4, BE=3, AE=5)';
    }
    if (elCycleMstChip) elCycleMstChip.style.display = 'none';
    if (elCycleItems) elCycleItems.textContent = 'A - B - E - A (weights: 4, 3, 5)';
  }

  // Step 2: Heaviest edge AE (wt 5) in Alarm Red
  function renderCycleStep2() {
    highlightCycleEdges(['AB', 'BE'], 'AE');

    if (elCycleHint) elCycleHint.textContent = 'Heaviest edge on cycle: AE (wt 5, Alarm Red with cross icon)';
    if (elCycleStatus) {
      elCycleStatus.className = 'chip chip-alarm';
      elCycleStatus.textContent = 'Strictly heaviest edge on this cycle: e = AE (wt 5)';
    }
    if (elCycleMstChip) {
      elCycleMstChip.style.display = 'inline-block';
      elCycleMstChip.className = 'chip chip-alarm';
      elCycleMstChip.textContent = '✓ Cycle Property: AE can never be in ANY MST';
    }
    if (elCycleItems) elCycleItems.textContent = 'Cycle A-B-E-A: AE(5) > AB(4) and AE(5) > BE(3)';
  }

  // Step 3: Tree contradiction swap (32 -> 31)
  function renderCycleStep3() {
    if (!cycleView) return;
    clearCycleGraphStyles();

    // Show canonical MST in accepted style, but AE crossed out
    var mstEdges = ['EH', 'EF', 'BE', 'AB', 'CF', 'DE', 'GH'];
    mstEdges.forEach(function (eid) {
      var item = cycleView._edgeEls.get(eid);
      if (item) {
        item.group.classList.remove('s09-faded-edge');
        cycleView.setEdgeState(eid, 'accepted');
      }
    });

    var aeItem = cycleView._edgeEls.get('AE');
    if (aeItem) {
      aeItem.group.classList.remove('s09-faded-edge');
      aeItem.group.classList.add('cycle-edge-heaviest');
      aeItem.cross.style.display = '';
    }

    if (elCycleHint) elCycleHint.textContent = 'Contradiction: Swapping AE (5) → BE (3) drops tree weight 32 → 31';
    if (elCycleStatus) {
      elCycleStatus.className = 'chip';
      elCycleStatus.textContent = 'If T had AE, cutting AE allows reconnecting via BE(3) at weight 31 < 32';
    }
    if (elCycleMstChip) {
      elCycleMstChip.style.display = 'inline-block';
      elCycleMstChip.className = 'chip chip-success';
      elCycleMstChip.textContent = '✓ Q.E.D. Heaviest cycle edge is never in an MST';
    }
    if (elCycleItems) {
      elCycleItems.textContent = 'Contradiction to minimality: AE is excluded from the MST!';
    }
  }

  /* --------------------------------------------------------------
     Interactive Cycle Testing for All 13 Edges
     -------------------------------------------------------------- */
  function findCycleWithHeaviest(graph, edgeId) {
    var edge = graph.edge(edgeId);
    if (!edge) return null;
    var u = edge.u;
    var v = edge.v;
    var w = edge.w;

    // BFS for a path between u and v using ONLY edges with weight < w
    var queue = [[u]];
    var visited = new Set([u]);
    var foundPath = null;

    while (queue.length > 0) {
      var path = queue.shift();
      var curr = path[path.length - 1];
      if (curr === v) {
        foundPath = path;
        break;
      }
      var nbrs = graph.neighbors(curr);
      for (var i = 0; i < nbrs.length; i++) {
        var nbr = nbrs[i];
        var nId = nbr.node.id;
        var ed = nbr.edge;
        if (ed.id === edge.id) continue;
        if (ed.w < w && !visited.has(nId)) {
          visited.add(nId);
          var nextP = path.slice();
          nextP.push(nId);
          queue.push(nextP);
        }
      }
    }

    if (!foundPath) return null;

    var cycleEdges = [];
    for (var j = 0; j < foundPath.length - 1; j++) {
      var n1 = foundPath[j];
      var n2 = foundPath[j + 1];
      var edB = graph.edge(n1, n2);
      if (edB) cycleEdges.push(edB.id);
    }

    return {
      nodes: foundPath.concat([u]),
      loopEdges: cycleEdges,
      heaviestEdge: edge.id
    };
  }

  function setupCycleEdgeClick() {
    if (!cycleView) return;
    cycleView.onEdgeClick = function (edgeId) {
      if (!isInteractive || activeTab !== 'cycle') return;
      testCycleProperty(edgeId);
    };
  }

  function testCycleProperty(edgeId) {
    if (!cycleView) return;
    var res = findCycleWithHeaviest(cycleGraph, edgeId);
    var ed = cycleGraph.edge(edgeId);
    var weight = ed ? ed.w : '';

    if (res) {
      // Clicked edge IS strictly heaviest on cycle 'res'
      highlightCycleEdges(res.loopEdges, edgeId);

      if (elCycleHint) {
        elCycleHint.textContent = 'Cycle found! Edge ' + edgeId + ' (wt ' + weight + ') is strictly heaviest.';
      }
      if (elCycleStatus) {
        elCycleStatus.className = 'chip chip-alarm';
        elCycleStatus.textContent = 'Heaviest on cycle: ' + edgeId + ' (wt ' + weight + ')';
      }
      if (elCycleMstChip) {
        elCycleMstChip.style.display = 'inline-block';
        elCycleMstChip.className = 'chip chip-alarm';
        elCycleMstChip.textContent = '✓ Cycle Property: ' + edgeId + ' CANNOT be in any MST';
      }
      if (elCycleItems) {
        var pathStr = res.nodes.join(' - ');
        var weightsStr = res.loopEdges.map(function (eid) {
          var eObj = cycleGraph.edge(eid);
          return eid + '=' + (eObj ? eObj.w : '');
        }).join(', ');
        elCycleItems.textContent = pathStr + ' (' + weightsStr + ', ' + edgeId + '=' + weight + ')';
      }
    } else {
      // Clicked edge is an MST edge: no cycle exists where it is strictly heaviest!
      clearCycleGraphStyles();
      var item = cycleView._edgeEls.get(edgeId);
      if (item) {
        item.group.classList.remove('s09-faded-edge');
        cycleView.setEdgeState(edgeId, 'accepted');
      }

      if (elCycleHint) {
        elCycleHint.textContent = 'Edge ' + edgeId + ' (wt ' + weight + ') is an MST edge!';
      }
      if (elCycleStatus) {
        elCycleStatus.className = 'chip';
        elCycleStatus.textContent = 'MST Edge: ' + edgeId + ' (wt ' + weight + ')';
      }
      if (elCycleMstChip) {
        elCycleMstChip.style.display = 'inline-block';
        elCycleMstChip.className = 'chip chip-success';
        elCycleMstChip.textContent = 'ℹ In MST: Never the strictly heaviest on any cycle';
      }
      if (elCycleItems) {
        elCycleItems.textContent = 'No cycle exists where ' + edgeId + ' is strictly the heaviest edge.';
      }
    }
  }

  function resetCycleDemo() {
    clearCycleGraphStyles();
    if (elCycleHint) {
      elCycleHint.textContent = 'Interactive Mode: Click any edge to test if it is heaviest on a cycle.';
    }
    if (elCycleStatus) {
      elCycleStatus.className = 'chip';
      elCycleStatus.textContent = 'Click an edge above to test';
    }
    if (elCycleMstChip) elCycleMstChip.style.display = 'none';
    if (elCycleItems) elCycleItems.textContent = '—';
  }

  /* --------------------------------------------------------------
     Tab 3: So The Algorithms Work
     -------------------------------------------------------------- */
  function highlightAlgCard(cardIdx) {
    elAlgCards.forEach(function (card, idx) {
      if (card) {
        card.classList.toggle('highlight', idx === cardIdx);
      }
    });
  }

  /* --------------------------------------------------------------
     Formal Proof Modal Drawer
     -------------------------------------------------------------- */
  function openProofModal() {
    if (!elProofModal) return;
    elProofModal.classList.add('open');
    elProofModal.setAttribute('aria-hidden', 'false');
    if (elBtnCloseProof) elBtnCloseProof.focus();
  }

  function closeProofModal() {
    if (!elProofModal) return;
    elProofModal.classList.remove('open');
    elProofModal.setAttribute('aria-hidden', 'true');
    if (elBtnProof) elBtnProof.focus();
  }

  /* --------------------------------------------------------------
     Keyboard Listener: Right Arrow advances story
     -------------------------------------------------------------- */
  function setupKeyboardListeners() {
    boundKeydownHandler = function (e) {
      var isSlideActive = elRoot && elRoot.classList.contains('active');
      if (!isSlideActive) return;

      // Handle Escape for modal
      if (e.key === 'Escape' || e.keyCode === 27) {
        if (elProofModal && elProofModal.classList.contains('open')) {
          e.stopPropagation();
          closeProofModal();
          return;
        }
      }

      // If modal is open, do not handle arrows
      if (elProofModal && elProofModal.classList.contains('open')) return;

      // Ignore if user is inside an input/button or textarea
      var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'ArrowRight' || e.keyCode === 39) {
        var total = STORIES[activeTab].totalSteps;
        if (!isInteractive && storyStep < total) {
          e.preventDefault();
          e.stopPropagation();
          nextStep();
        }
      } else if (e.key === 'ArrowLeft' || e.keyCode === 37) {
        if (!isInteractive && storyStep > 1) {
          e.preventDefault();
          e.stopPropagation();
          prevStep();
        }
      }
    };

    document.addEventListener('keydown', boundKeydownHandler);
  }

  /* --------------------------------------------------------------
     Lifecycle & Public Export
     -------------------------------------------------------------- */
  function pause() {
    // Stop any pending timers or drags
    isDraggingCut = false;
  }

  function resume() {
    // Re-verify sizing and active tab
    if (activeTab === 'cut' && cutView) cutView.update();
    if (activeTab === 'cycle' && cycleView) cycleView.update();
  }

  function destroy() {
    if (boundKeydownHandler) {
      document.removeEventListener('keydown', boundKeydownHandler);
      boundKeydownHandler = null;
    }
    if (cutView) {
      cutView.destroy();
      cutView = null;
    }
    if (cycleView) {
      cycleView.destroy();
      cycleView = null;
    }
    cutGraph = null;
    cycleGraph = null;
    cutLineEl = null;
  }

  NG.slides.s09 = {
    init: init,
    pause: pause,
    resume: resume,
    destroy: destroy,

    // Navigation & Story Helpers
    switchTab: switchTab,
    nextStep: nextStep,
    prevStep: prevStep,
    goToStep: goToStep,
    resetStep: resetStory,
    toggleInteractive: toggleInteractive,

    // Modal Drawer
    openProofModal: openProofModal,
    closeProofModal: closeProofModal,

    // Test & Automation Hooks
    getCutPartition: function () { return currentCutPartition; },
    applyCut: function (s) { applyInteractiveCut(s); },
    toggleNode: toggleCutNode,
    randomCut: randomCut,
    testCycleProperty: testCycleProperty,
    checkCycleProperty: function (edgeId) { return findCycleWithHeaviest(cycleGraph || buildCanonicalGraph(), edgeId); },
    getMstEdges: function () { return Array.from(mstEdgeSet); },
    getCanonicalGraph: function () { return buildCanonicalGraph(); }
  };
})();