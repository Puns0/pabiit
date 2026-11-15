/* ============================================================
   s06.js — Slide 6: Minimum Spanning Tree (Beat the Algorithm)
   ============================================================ */
(function () {
  'use strict';

  window.NG = window.NG || {};
  NG.slides = NG.slides || {};

  var view = null;
  var fullGraph = null;
  var chosenEdges = new Set();
  var histogramData = null;
  var userTreeWeight = null;
  var SVG_NS = 'http://www.w3.org/2000/svg';

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

  function computeHistogramData() {
    if (histogramData) return histogramData;
    var trees = NG.Algo.enumerateSpanningTrees(fullGraph);
    var counts = {};
    var minW = Infinity;
    var maxW = -Infinity;

    for (var i = 0; i < trees.length; i++) {
      var t = trees[i];
      var w = 0;
      for (var j = 0; j < t.length; j++) {
        w += fullGraph.edge(t[j]).w;
      }
      counts[w] = (counts[w] || 0) + 1;
      if (w < minW) minW = w;
      if (w > maxW) maxW = w;
    }

    histogramData = {
      counts: counts,
      minW: minW,
      maxW: maxW,
      maxCount: 28,
      totalTrees: trees.length
    };
    return histogramData;
  }

  function renderHistogram() {
    var container = document.getElementById('s06-hist-container');
    if (!container || !fullGraph) return;

    var data = computeHistogramData();
    container.innerHTML = '';

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 380 120');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.overflow = 'visible';

    var padLeft = 24;
    var padRight = 16;
    var padTop = 18;
    var padBottom = 22;
    var plotW = 380 - padLeft - padRight;
    var plotH = 120 - padTop - padBottom;

    var minW = data.minW; // 31
    var maxW = data.maxW; // 70
    var numBars = (maxW - minW + 1); // 40
    var barW = Math.max(3, (plotW / numBars) - 1.5);
    var maxCount = data.maxCount; // 28

    // Baseline
    var baseline = document.createElementNS(SVG_NS, 'line');
    baseline.setAttribute('x1', padLeft);
    baseline.setAttribute('y1', padTop + plotH);
    baseline.setAttribute('x2', padLeft + plotW);
    baseline.setAttribute('y2', padTop + plotH);
    baseline.setAttribute('stroke', 'var(--ink)');
    baseline.setAttribute('stroke-width', '1.5');
    svg.appendChild(baseline);

    // Bars
    for (var w = minW; w <= maxW; w++) {
      var count = data.counts[w] || 0;
      var barH = count > 0 ? Math.max(3, (count / maxCount) * (plotH - 6)) : 0;
      var bx = padLeft + (w - minW) * (plotW / numBars);
      var by = padTop + plotH - barH;

      var isMin = (w === data.minW);
      var isUser = (userTreeWeight !== null && w === userTreeWeight);

      var rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', bx);
      rect.setAttribute('y', by);
      rect.setAttribute('width', barW);
      rect.setAttribute('height', barH);
      rect.setAttribute('rx', '1');

      if (isUser && isMin) {
        rect.setAttribute('fill', 'var(--vermilion)');
        rect.setAttribute('stroke', 'var(--ink)');
        rect.setAttribute('stroke-width', '1.5');
      } else if (isUser) {
        rect.setAttribute('fill', 'var(--cobalt)');
        rect.setAttribute('stroke', 'var(--ink)');
        rect.setAttribute('stroke-width', '1.5');
      } else if (isMin) {
        rect.setAttribute('fill', 'var(--vermilion)');
        rect.setAttribute('stroke', 'var(--ink)');
        rect.setAttribute('stroke-width', '1');
      } else {
        rect.setAttribute('fill', 'var(--paper-3)');
        rect.setAttribute('stroke', 'var(--ink-2)');
        rect.setAttribute('stroke-width', '0.75');
      }

      svg.appendChild(rect);
    }

    // Min marker label at 31
    var minLbl = document.createElementNS(SVG_NS, 'text');
    minLbl.setAttribute('x', padLeft + 2);
    minLbl.setAttribute('y', padTop - 4);
    minLbl.setAttribute('font-family', 'var(--font-mono)');
    minLbl.setAttribute('font-size', '9');
    minLbl.setAttribute('font-weight', '700');
    minLbl.setAttribute('fill', 'var(--vermilion)');
    minLbl.textContent = 'Min: ' + data.minW;
    svg.appendChild(minLbl);

    // User weight marker if completed
    if (userTreeWeight !== null) {
      var ux = padLeft + (userTreeWeight - minW) * (plotW / numBars) + barW / 2;
      var userLbl = document.createElementNS(SVG_NS, 'text');
      userLbl.setAttribute('x', Math.min(370, Math.max(ux, padLeft + 40)));
      userLbl.setAttribute('y', padTop - 4);
      userLbl.setAttribute('text-anchor', 'middle');
      userLbl.setAttribute('font-family', 'var(--font-mono)');
      userLbl.setAttribute('font-size', '9');
      userLbl.setAttribute('font-weight', '700');
      userLbl.setAttribute('fill', userTreeWeight === data.minW ? 'var(--vermilion)' : 'var(--cobalt)');
      userLbl.textContent = 'You: ' + userTreeWeight;
      svg.appendChild(userLbl);
    }

    // X-axis min and max numbers
    var xMinText = document.createElementNS(SVG_NS, 'text');
    xMinText.setAttribute('x', padLeft);
    xMinText.setAttribute('y', padTop + plotH + 14);
    xMinText.setAttribute('font-family', 'var(--font-mono)');
    xMinText.setAttribute('font-size', '9');
    xMinText.setAttribute('fill', 'var(--ink-3)');
    xMinText.textContent = String(minW);
    svg.appendChild(xMinText);

    var xMaxText = document.createElementNS(SVG_NS, 'text');
    xMaxText.setAttribute('x', padLeft + plotW);
    xMaxText.setAttribute('y', padTop + plotH + 14);
    xMaxText.setAttribute('text-anchor', 'end');
    xMaxText.setAttribute('font-family', 'var(--font-mono)');
    xMaxText.setAttribute('font-size', '9');
    xMaxText.setAttribute('fill', 'var(--ink-3)');
    xMaxText.textContent = String(maxW);
    svg.appendChild(xMaxText);

    container.appendChild(svg);
  }

  function getChosenWeight() {
    var w = 0;
    var eIter = chosenEdges.values();
    for (var it = eIter.next(); !it.done; it = eIter.next()) {
      var eObj = fullGraph.edge(it.value);
      if (eObj) w += eObj.w;
    }
    return w;
  }

  function updateStatusAndBanner() {
    var k = chosenEdges.size;
    var currW = getChosenWeight();
    var kEl = document.getElementById('s06-chosen-k');
    var wEl = document.getElementById('s06-curr-weight');
    var banner = document.getElementById('s06-banner');
    var msgEl = document.getElementById('s06-banner-msg');

    if (kEl) kEl.textContent = k;
    if (wEl) wEl.textContent = currW;

    if (banner) {
      banner.classList.remove('success', 'warning', 'alarm');
    }

    if (k < 7) {
      userTreeWeight = null;
      if (msgEl) {
        msgEl.textContent = 'Choose 7 edges without closing any cycles (' + (7 - k) + ' more needed).';
      }
    } else if (k === 7) {
      // Tree complete! Compute optimal dynamically from algo.mst
      userTreeWeight = currW;
      var optimal = NG.Algo.mst(fullGraph);
      var bestW = optimal.total;
      var gap = currW - bestW;

      if (gap === 0) {
        if (banner) banner.classList.add('success');
        if (msgEl) {
          msgEl.innerHTML = 'Your tree: <strong>' + currW + '</strong>. Best possible: <strong>' +
            bestW + '</strong>. <strong>Gap: 0</strong> (You found an MST!)';
        }
      } else {
        if (banner) banner.classList.add('warning');
        if (msgEl) {
          msgEl.innerHTML = 'Your tree: <strong>' + currW + '</strong>. Best possible: <strong>' +
            bestW + '</strong>. <strong>Gap: +' + gap + '</strong>';
        }
      }
    }

    renderHistogram();
  }

  function handleEdgeClick(eid) {
    if (chosenEdges.has(eid)) {
      // Deselect edge
      chosenEdges.delete(eid);
      view.setEdgeState(eid, 'default');
      updateStatusAndBanner();
    } else {
      // If already has 7 edges, don't allow more
      if (chosenEdges.size >= 7) {
        var banner = document.getElementById('s06-banner');
        var msgEl = document.getElementById('s06-banner-msg');
        if (banner) banner.classList.add('warning');
        if (msgEl) msgEl.textContent = 'Already have 7 edges for a spanning tree. Click an edge to remove it first.';
        return;
      }

      // Check if adding this edge closes a cycle among chosen edges
      var eObj = fullGraph.edge(eid);
      if (!eObj) return;

      // Build temp graph of chosen edges
      var tempG = new NG.Graph();
      var nIter = fullGraph._nodes.values();
      for (var nit = nIter.next(); !nit.done; nit = nIter.next()) {
        var n = nit.value;
        tempG.addNode(n.x, n.y, n.label, n.id);
      }
      var cIter = chosenEdges.values();
      for (var cit = cIter.next(); !cit.done; cit = cIter.next()) {
        var ceObj = fullGraph.edge(cit.value);
        if (ceObj) tempG.addEdge(ceObj.u, ceObj.v, ceObj.w, cit.value);
      }

      // If u and v already in same component, adding eid closes a cycle
      var comp = NG.Algo.components(tempG);
      var closesCycle = false;
      for (var c = 0; c < comp.length; c++) {
        if (comp[c].includes(eObj.u) && comp[c].includes(eObj.v)) {
          closesCycle = true;
          break;
        }
      }

      if (closesCycle) {
        // Block edge! Red flash + shake
        view.flashEdge(eid, 'cycle');
        var banner = document.getElementById('s06-banner');
        var msgEl = document.getElementById('s06-banner-msg');
        if (banner) banner.classList.add('alarm');
        if (msgEl) msgEl.textContent = 'Blocked: Edge ' + eid + ' closes a cycle! Spanning trees must be acyclic.';
        return;
      }

      // Accepted edge
      chosenEdges.add(eid);
      view.setEdgeState(eid, 'accepted');
      updateStatusAndBanner();
    }
  }

  function revealMST() {
    var optimal = NG.Algo.mst(fullGraph);
    chosenEdges.clear();

    for (var i = 0; i < optimal.edges.length; i++) {
      chosenEdges.add(optimal.edges[i]);
    }

    var eIter = fullGraph._edges.keys();
    for (var it = eIter.next(); !it.done; it = eIter.next()) {
      var eid = it.value;
      if (chosenEdges.has(eid)) {
        view.setEdgeState(eid, 'accepted');
        view.drawEdgeIn(eid, 250);
      } else {
        view.setEdgeState(eid, 'faded');
      }
    }

    updateStatusAndBanner();
  }

  function resetBuilder() {
    chosenEdges.clear();
    userTreeWeight = null;
    var eIter = fullGraph._edges.keys();
    for (var it = eIter.next(); !it.done; it = eIter.next()) {
      view.setEdgeState(it.value, 'default');
    }
    updateStatusAndBanner();
    var msgEl = document.getElementById('s06-banner-msg');
    if (msgEl) msgEl.textContent = 'Click edges to build a spanning tree. Avoid creating cycles!';
  }

  NG.slides.s06 = {
    init: function (root) {
      fullGraph = buildCanonical();
      chosenEdges.clear();
      userTreeWeight = null;

      var canvas = document.getElementById('s06-canvas');
      if (!canvas) return;

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
        handleEdgeClick(eid);
      };

      // Reveal MST button
      var btnReveal = document.getElementById('s06-btn-reveal');
      if (btnReveal) {
        btnReveal.addEventListener('click', function () {
          revealMST();
        });
      }

      // Reset button
      var btnReset = document.getElementById('s06-btn-reset');
      if (btnReset) {
        btnReset.addEventListener('click', function () {
          resetBuilder();
        });
      }

      // Toggle histogram button
      var btnToggleHist = document.getElementById('s06-btn-toggle-hist');
      var histCard = document.getElementById('s06-hist-container');
      if (btnToggleHist && histCard) {
        btnToggleHist.addEventListener('click', function () {
          var isHidden = (histCard.style.display === 'none');
          histCard.style.display = isHidden ? 'block' : 'none';
          btnToggleHist.textContent = isHidden ? 'Hide' : 'Show';
        });
      }

      renderHistogram();
      updateStatusAndBanner();
    },

    resume: function () {
      if (view) {
        renderHistogram();
        updateStatusAndBanner();
      }
    },

    destroy: function () {
      if (view) {
        view.destroy();
        view = null;
      }
      fullGraph = null;
      chosenEdges.clear();
      userTreeWeight = null;
      histogramData = null;
    }
  };

})();
