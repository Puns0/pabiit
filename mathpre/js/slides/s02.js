/* ============================================================
   s02.js — Slide 2: The Problem (Mesh vs Tree)
   ============================================================ */
(function () {
  'use strict';

  window.NG = window.NG || {};
  NG.slides = NG.slides || {};

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var currentN = 8;
  var animFrameId = null;
  var resizeHandler = null;

  // Cached previous stat values for smooth tweening
  var lastStats = {
    mesh: 28,
    tree: 7,
    wasted: 21,
    ratio: 25.0
  };

  function computeCircleCoords(n, cx, cy, r) {
    var coords = [];
    for (var i = 0; i < n; i++) {
      var angle = (2 * Math.PI * i) / n - Math.PI / 2;
      coords.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
      });
    }
    return coords;
  }

  function drawCircleGraph(container, n, isTree) {
    if (!container) return null;
    container.innerHTML = '';

    var rect = container.getBoundingClientRect();
    var w = Math.round(container.clientWidth || (rect ? rect.width : 0)) || 360;
    var h = Math.round(container.clientHeight || (rect ? rect.height : 0)) || 180;
    if (w < 60) w = 360;
    if (h < 60) h = 180;

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.overflow = 'visible';

    var cx = w / 2;
    var cy = h / 2;

    // Node radius scales down gracefully as n increases
    var nodeR = n <= 6 ? 7.5 : (n <= 10 ? 6 : (n <= 16 ? 4.5 : (n <= 24 ? 3.5 : 2.5)));
    var margin = nodeR + 10;
    var r = Math.max(15, Math.min(cx, cy) - margin);
    var coords = computeCircleCoords(n, cx, cy, r);

    // 1. Draw Edges
    var edgesG = document.createElementNS(SVG_NS, 'g');
    if (isTree) {
      // Tree: Euclidean MST on circle layout is perimeter path of n-1 edges
      var treeStrokeW = n <= 8 ? '3.5' : (n <= 14 ? '2.8' : '2.2');
      for (var i = 0; i < n - 1; i++) {
        var l = document.createElementNS(SVG_NS, 'line');
        l.setAttribute('x1', coords[i].x);
        l.setAttribute('y1', coords[i].y);
        l.setAttribute('x2', coords[i + 1].x);
        l.setAttribute('y2', coords[i + 1].y);
        l.setAttribute('stroke', 'var(--vermilion)');
        l.setAttribute('stroke-width', treeStrokeW);
        l.setAttribute('stroke-linecap', 'round');
        edgesG.appendChild(l);
      }
    } else {
      // Mesh: all n(n-1)/2 pairs (drawn only when n <= 24)
      if (n <= 24) {
        var strokeW = n <= 6 ? '1.5' : (n <= 10 ? '1.1' : (n <= 16 ? '0.8' : '0.5'));
        var opacity = n <= 6 ? '0.7' : (n <= 10 ? '0.55' : (n <= 16 ? '0.4' : '0.28'));
        for (var i = 0; i < n; i++) {
          for (var j = i + 1; j < n; j++) {
            var l = document.createElementNS(SVG_NS, 'line');
            l.setAttribute('x1', coords[i].x);
            l.setAttribute('y1', coords[i].y);
            l.setAttribute('x2', coords[j].x);
            l.setAttribute('y2', coords[j].y);
            l.setAttribute('stroke', 'var(--ink)');
            l.setAttribute('stroke-width', strokeW);
            l.setAttribute('opacity', opacity);
            edgesG.appendChild(l);
          }
        }
      }
    }
    svg.appendChild(edgesG);

    // 2. Draw Nodes
    var nodesG = document.createElementNS(SVG_NS, 'g');
    for (var i = 0; i < n; i++) {
      var c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', coords[i].x);
      c.setAttribute('cy', coords[i].y);
      c.setAttribute('r', nodeR);
      c.setAttribute('fill', isTree ? 'var(--vermilion)' : 'var(--paper-3)');
      c.setAttribute('stroke', 'var(--ink)');
      c.setAttribute('stroke-width', n <= 10 ? '2' : '1.2');
      nodesG.appendChild(c);
    }
    svg.appendChild(nodesG);

    container.appendChild(svg);
    return svg;
  }

  function drawNodeRing(container, n) {
    if (!container) return null;
    container.innerHTML = '';

    var rect = container.getBoundingClientRect();
    var w = Math.round(container.clientWidth || (rect ? rect.width : 0)) || 360;
    var h = Math.round(container.clientHeight || (rect ? rect.height : 0)) || 110;
    if (w < 60) w = 360;
    if (h < 60) h = 110;

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.overflow = 'visible';

    var cx = w / 2;
    var cy = h / 2;
    var nodeR = n <= 40 ? 3 : (n <= 70 ? 2.2 : 1.7);
    var margin = nodeR + 6;
    var r = Math.max(15, Math.min(cx, cy) - margin);
    var coords = computeCircleCoords(n, cx, cy, r);

    var g = document.createElementNS(SVG_NS, 'g');
    for (var i = 0; i < n; i++) {
      var c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', coords[i].x);
      c.setAttribute('cy', coords[i].y);
      c.setAttribute('r', nodeR);
      c.setAttribute('fill', 'var(--ink)');
      g.appendChild(c);
    }
    svg.appendChild(g);
    container.appendChild(svg);
    return svg;
  }

  function tweenNumber(element, startVal, endVal, duration, isFloat) {
    if (!element) return;
    if (element._animId) {
      cancelAnimationFrame(element._animId);
      element._animId = null;
    }
    var startTime = null;

    function step(ts) {
      if (!startTime) startTime = ts;
      var elapsed = ts - startTime;
      var p = Math.min(1, elapsed / duration);
      var eased = 1 - Math.pow(1 - p, 3);
      var current = startVal + (endVal - startVal) * eased;

      if (isFloat) {
        element.textContent = current.toFixed(1) + '%';
      } else {
        element.textContent = Math.round(current).toLocaleString();
      }

      if (p < 1) {
        element._animId = requestAnimationFrame(step);
      } else {
        element._animId = null;
        if (isFloat) {
          element.textContent = endVal.toFixed(1) + '%';
        } else {
          element.textContent = endVal.toLocaleString();
        }
      }
    }
    element._animId = requestAnimationFrame(step);
  }

  function updateVisuals(n, instant) {
    currentN = n;

    // Use NG.Algo.meshEdges to verify count
    var meshCount = NG.Algo.meshEdges(n);
    var treeCount = n - 1;
    var wastedCount = meshCount - treeCount;
    var ratioVal = meshCount > 0 ? (treeCount / meshCount) * 100 : 0;

    // Update Slider Label
    var nValEl = document.getElementById('s02-n-val');
    if (nValEl) nValEl.textContent = n;

    // Update Stat Numbers with animated tween
    var statMesh = document.getElementById('s02-stat-mesh');
    var statTree = document.getElementById('s02-stat-tree');
    var statWasted = document.getElementById('s02-stat-wasted');
    var statRatio = document.getElementById('s02-stat-ratio');

    var isReduced = instant ||
      document.documentElement.classList.contains('reduced-motion') ||
      document.body.classList.contains('reduced-motion') ||
      (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var duration = isReduced ? 1 : 250;

    tweenNumber(statMesh, lastStats.mesh, meshCount, duration, false);
    tweenNumber(statTree, lastStats.tree, treeCount, duration, false);
    tweenNumber(statWasted, lastStats.wasted, wastedCount, duration, false);
    tweenNumber(statRatio, lastStats.ratio, ratioVal, duration, true);

    lastStats.mesh = meshCount;
    lastStats.tree = treeCount;
    lastStats.wasted = wastedCount;
    lastStats.ratio = ratioVal;

    // Callout on n = 100
    var callout = document.getElementById('s02-callout-100');
    if (callout) {
      callout.classList.toggle('active', n === 100);
    }

    // Toggle between circle drawings (n <= 24) and bar charts (n > 24)
    var splitView = document.getElementById('s02-split-view');
    var barsView = document.getElementById('s02-bars-view');
    var meshCanvas = document.getElementById('s02-mesh-canvas');
    var treeCanvas = document.getElementById('s02-tree-canvas');

    if (n <= 24) {
      if (splitView) splitView.style.display = 'flex';
      if (barsView) barsView.classList.remove('active');

      if (meshCanvas) drawCircleGraph(meshCanvas, n, false);
      if (treeCanvas) drawCircleGraph(treeCanvas, n, true);
    } else {
      // For n > 24: draw only ring nodes and display comparison bars
      if (splitView) splitView.style.display = 'none';
      if (barsView) barsView.classList.add('active');

      var barMeshCount = document.getElementById('s02-bar-mesh-count');
      var barTreeCount = document.getElementById('s02-bar-tree-count');
      var barTreeFill = document.getElementById('s02-bar-tree-fill');

      if (barMeshCount) barMeshCount.textContent = meshCount.toLocaleString();
      if (barTreeCount) barTreeCount.textContent = treeCount.toLocaleString();

      var pctWidth = Math.max(1.5, Math.min(100, (treeCount / meshCount) * 100));
      if (barTreeFill) barTreeFill.style.width = pctWidth.toFixed(1) + '%';

      var ringContainer = document.getElementById('s02-bars-node-ring');
      if (ringContainer) drawNodeRing(ringContainer, n);
    }
  }

  NG.slides.s02 = {
    init: function (root) {
      var slider = document.getElementById('s02-slider');
      if (slider) {
        slider.addEventListener('input', function () {
          var val = parseInt(slider.value, 10);
          updateVisuals(val, false);
        });
      }

      resizeHandler = function () {
        if (currentN <= 24) {
          var meshCanvas = document.getElementById('s02-mesh-canvas');
          var treeCanvas = document.getElementById('s02-tree-canvas');
          if (meshCanvas) drawCircleGraph(meshCanvas, currentN, false);
          if (treeCanvas) drawCircleGraph(treeCanvas, currentN, true);
        } else {
          var ringContainer = document.getElementById('s02-bars-node-ring');
          if (ringContainer) drawNodeRing(ringContainer, currentN);
        }
      };
      window.addEventListener('resize', resizeHandler);

      lastStats = { mesh: 0, tree: 0, wasted: 0, ratio: 0 };
      updateVisuals(8, false);
    },

    resume: function () {
      lastStats = { mesh: 0, tree: 0, wasted: 0, ratio: 0 };
      updateVisuals(currentN, false);
    },

    destroy: function () {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
        resizeHandler = null;
      }
    }
  };

})();
