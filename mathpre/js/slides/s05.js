/* ============================================================
   s05.js — Slide 5: Spanning Trees (Cayley Formula & All Trees Explorer)
   ============================================================ */
(function () {
  'use strict';

  window.NG = window.NG || {};
  NG.slides = NG.slides || {};

  var view = null;
  var fullGraph = null;
  var allTrees = [];
  var allWeights = [];
  var sortedIndices = [];
  var unsortedIndices = [];
  var activeIndices = [];
  var isSorted = false;
  var currentIndex = 0;
  var lightestFound = Infinity;
  var autoplayTimer = null;
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

  function populateCayleyTable() {
    var tbody = document.getElementById('s05-cayley-tbody');
    if (!tbody) return;

    var html = '';
    for (var n = 3; n <= 8; n++) {
      var count = NG.Algo.cayley(n);
      var exp = n - 2;
      html += '<tr>' +
        '<td><strong>K<sub>' + n + '</sub></strong></td>' +
        '<td class="mono">' + n + '<sup>' + exp + '</sup></td>' +
        '<td class="mono">' + count.toLocaleString() + '</td>' +
        '</tr>';
    }
    tbody.innerHTML = html;
  }

  function drawMiniKn(container, n) {
    if (!container) return;
    container.innerHTML = '';

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    var cx = 50;
    var cy = 50;
    var r = 36;
    var coords = [];

    for (var i = 0; i < n; i++) {
      var angle = (2 * Math.PI * i) / n - Math.PI / 2;
      coords.push({
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle)
      });
    }

    // Draw all n(n-1)/2 edges
    var gEdges = document.createElementNS(SVG_NS, 'g');
    for (var i = 0; i < n; i++) {
      for (var j = i + 1; j < n; j++) {
        var l = document.createElementNS(SVG_NS, 'line');
        l.setAttribute('x1', coords[i].x);
        l.setAttribute('y1', coords[i].y);
        l.setAttribute('x2', coords[j].x);
        l.setAttribute('y2', coords[j].y);
        l.setAttribute('stroke', 'var(--ink)');
        l.setAttribute('stroke-width', n <= 6 ? '1.2' : '0.8');
        l.setAttribute('opacity', n <= 6 ? '0.6' : '0.35');
        gEdges.appendChild(l);
      }
    }
    svg.appendChild(gEdges);

    // Draw nodes
    var gNodes = document.createElementNS(SVG_NS, 'g');
    var nodeR = n <= 6 ? 4 : (n <= 8 ? 3 : 2.5);
    for (var k = 0; k < n; k++) {
      var c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('cx', coords[k].x);
      c.setAttribute('cy', coords[k].y);
      c.setAttribute('r', nodeR);
      c.setAttribute('fill', 'var(--vermilion)');
      c.setAttribute('stroke', 'var(--ink)');
      c.setAttribute('stroke-width', '1');
      gNodes.appendChild(c);
    }
    svg.appendChild(gNodes);

    container.appendChild(svg);
  }

  function updateMiniKn(n) {
    var lbl = document.getElementById('s05-kn-n-lbl');
    var val = document.getElementById('s05-kn-count-val');
    var canvas = document.getElementById('s05-kn-canvas');

    if (lbl) lbl.textContent = n;
    var count = NG.Algo.cayley(n);
    if (val) val.textContent = count.toLocaleString();
    if (canvas) drawMiniKn(canvas, n);
  }

  function displayTreeAt(index) {
    if (!view || !fullGraph || allTrees.length === 0) return;

    var actualTreeIdx = activeIndices[index];
    var treeEdges = allTrees[actualTreeIdx];
    var weight = allWeights[actualTreeIdx];

    if (weight < lightestFound) {
      lightestFound = weight;
    }

    var treeSet = new Set(treeEdges);
    var eIter = fullGraph._edges.keys();
    for (var it = eIter.next(); !it.done; it = eIter.next()) {
      var eid = it.value;
      if (treeSet.has(eid)) {
        view.setEdgeState(eid, 'accepted');
      } else {
        view.setEdgeState(eid, 'faded');
      }
    }

    // Update UI numbers
    var idxEl = document.getElementById('s05-tree-idx');
    var totalEl = document.getElementById('s05-tree-total');
    var weightEl = document.getElementById('s05-tree-weight');
    var lightEl = document.getElementById('s05-tree-lightest');

    if (idxEl) idxEl.textContent = (index + 1);
    if (totalEl) totalEl.textContent = allTrees.length;
    if (weightEl) weightEl.textContent = weight;
    if (lightEl) lightEl.textContent = lightestFound;
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
    var btn = document.getElementById('s05-btn-autoplay');
    if (btn) {
      btn.textContent = 'Autoplay';
      btn.classList.add('btn-primary');
    }
  }

  function toggleAutoplay() {
    if (autoplayTimer) {
      stopAutoplay();
    } else {
      var btn = document.getElementById('s05-btn-autoplay');
      if (btn) {
        btn.textContent = 'Pause';
        btn.classList.remove('btn-primary');
      }
      autoplayTimer = setInterval(function () {
        currentIndex = (currentIndex + 1) % allTrees.length;
        displayTreeAt(currentIndex);
      }, 700);
    }
  }

  NG.slides.s05 = {
    init: function (root) {
      // 1. Populate Cayley table
      populateCayleyTable();

      // 2. Mini Kn widget
      var knSlider = document.getElementById('s05-kn-slider');
      if (knSlider) {
        knSlider.addEventListener('input', function () {
          updateMiniKn(parseInt(knSlider.value, 10));
        });
      }
      updateMiniKn(4);

      // 3. Precompute Spanning Trees for Canonical Graph
      fullGraph = buildCanonical();
      allTrees = NG.Algo.enumerateSpanningTrees(fullGraph);
      var kirchhoffCount = NG.Algo.countSpanningTrees(fullGraph);

      allWeights = [];
      unsortedIndices = [];
      for (var i = 0; i < allTrees.length; i++) {
        var t = allTrees[i];
        var w = 0;
        for (var j = 0; j < t.length; j++) {
          w += fullGraph.edge(t[j]).w;
        }
        allWeights.push(w);
        unsortedIndices.push(i);
      }

      // Pre-sort indices by weight
      sortedIndices = unsortedIndices.slice().sort(function (a, b) {
        return allWeights[a] - allWeights[b];
      });

      isSorted = false;
      activeIndices = unsortedIndices;
      currentIndex = 0;
      lightestFound = allWeights[activeIndices[0]];

      // Footnote verification
      var footText = document.getElementById('s05-foot-text');
      var footCheck = document.getElementById('s05-foot-check');
      var isVerified = (kirchhoffCount === BigInt(allTrees.length));

      if (footText) {
        footText.textContent = 'N = ' + allTrees.length +
          ' verified by Kirchhoff\'s matrix-tree theorem = enumeration count';
      }
      if (footCheck) {
        footCheck.style.display = isVerified ? 'inline-flex' : 'none';
      }

      // 4. Graph View
      var canvas = document.getElementById('s05-canvas');
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

      // Controls
      var btnPrev = document.getElementById('s05-btn-prev');
      var btnNext = document.getElementById('s05-btn-next');
      var btnRandom = document.getElementById('s05-btn-random');
      var btnAutoplay = document.getElementById('s05-btn-autoplay');
      var btnSort = document.getElementById('s05-btn-sort');

      if (btnPrev) {
        btnPrev.addEventListener('click', function () {
          stopAutoplay();
          currentIndex = (currentIndex - 1 + allTrees.length) % allTrees.length;
          displayTreeAt(currentIndex);
        });
      }

      if (btnNext) {
        btnNext.addEventListener('click', function () {
          stopAutoplay();
          currentIndex = (currentIndex + 1) % allTrees.length;
          displayTreeAt(currentIndex);
        });
      }

      if (btnRandom) {
        btnRandom.addEventListener('click', function () {
          stopAutoplay();
          currentIndex = Math.floor(Math.random() * allTrees.length);
          displayTreeAt(currentIndex);
        });
      }

      if (btnAutoplay) {
        btnAutoplay.addEventListener('click', function () {
          toggleAutoplay();
        });
      }

      if (btnSort) {
        btnSort.addEventListener('click', function () {
          stopAutoplay();
          isSorted = !isSorted;
          btnSort.textContent = 'Sort: ' + (isSorted ? 'By Weight' : 'Unsorted');
          btnSort.classList.toggle('btn-primary', isSorted);
          activeIndices = isSorted ? sortedIndices : unsortedIndices;
          currentIndex = 0;
          displayTreeAt(currentIndex);
        });
      }

      displayTreeAt(0);
    },

    resume: function () {
      if (view) displayTreeAt(currentIndex);
    },

    pause: function () {
      stopAutoplay();
    },

    destroy: function () {
      stopAutoplay();
      if (view) {
        view.destroy();
        view = null;
      }
      fullGraph = null;
      allTrees = [];
      allWeights = [];
      sortedIndices = [];
      unsortedIndices = [];
      activeIndices = [];
    }
  };

})();
