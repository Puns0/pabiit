(function () {
  window.NG = window.NG || {};
  NG.slides = NG.slides || {};

  // Color constants (SPEC Section 4 palette)
  var COLOR_INK = '#1C1A16';
  var COLOR_INK_MUTED = '#706A5E';
  var COLOR_GRID = '#D0C9B6';
  var COLOR_VERMILION = '#D9531E';
  var COLOR_COBALT = '#1D63B8';
  var COLOR_TEAL = '#178A86';
  var COLOR_PAPER_SPARSE = 'rgba(240, 230, 210, 0.55)';
  var COLOR_PAPER_SPARSE_HL = 'rgba(217, 83, 30, 0.18)';
  var COLOR_PAPER_DENSE = 'rgba(225, 240, 238, 0.55)';
  var COLOR_PAPER_DENSE_HL = 'rgba(23, 138, 134, 0.22)';

  // Chart constants
  var CHART_V = 100;
  var CHART_E_MIN = 99;
  var CHART_E_MAX = 4950;
  var CHART_MAX_OPS = 65000;
  var CHART_W = 680;
  var CHART_H = 430;
  var PAD_LEFT = 75;
  var PAD_RIGHT = 175;
  var PAD_TOP = 40;
  var PAD_BOTTOM = 55;

  // State
  var currentStep = 1;
  var totalSteps = 4;
  var isDrawerOpen = false;
  var boundKeyHandler = null;

  // DOM references
  var dom = {
    chartSvg: null,
    btnNext: null,
    btnReset: null,
    btnTable: null,
    btnCloseTable: null,
    drawerBackdrop: null,
    verdictSparse: null,
    verdictDense: null,
    stepEls: []
  };

  // SVG Chart element references
  var chartEls = {
    regionSparse: null,
    regionDense: null,
    curveKruskal: null,
    curvePrimHeap: null,
    curvePrimMatrix: null,
    labelKruskal: null,
    labelPrimHeap: null,
    labelPrimMatrix: null
  };

  /* ----------------------------------------------------------------
     1. Mathematical Crossover Computation
     ---------------------------------------------------------------- */
  function computeSmallestCrossoverE(vVal) {
    var vSq = vVal * vVal; // 10,000 for V = 100
    for (var e = 99; e <= 4950; e++) {
      if (e * Math.log2(e) > vSq) {
        return e;
      }
    }
    return 1003;
  }

  /* ----------------------------------------------------------------
     2. Large Clean SVG Chart Renderer
     ---------------------------------------------------------------- */
  function initChart() {
    var svg = dom.chartSvg;
    if (!svg) return;
    svg.innerHTML = '';

    var plotW = CHART_W - PAD_LEFT - PAD_RIGHT; // 430
    var plotH = CHART_H - PAD_TOP - PAD_BOTTOM; // 335

    function toX(eVal) {
      return PAD_LEFT + ((eVal - CHART_E_MIN) / (CHART_E_MAX - CHART_E_MIN)) * plotW;
    }
    function toY(ops) {
      return PAD_TOP + plotH - (ops / CHART_MAX_OPS) * plotH;
    }

    var crossoverE = computeSmallestCrossoverE(CHART_V);
    console.log('[Slide 10] Crossover computed (smallest integer E where V² < E*log2(E)):', crossoverE, '| Plotted value:', crossoverE);

    var crossoverX = toX(crossoverE);
    var crossoverY = toY(CHART_V * CHART_V); // V^2 = 10,000

    var svgNS = 'http://www.w3.org/2000/svg';

    // 1. Shaded regions (Sparse & Dense)
    // Sparse region: E from 99 to crossoverE (~1003)
    var sparseW = crossoverX - toX(CHART_E_MIN);
    var regionSparse = document.createElementNS(svgNS, 'rect');
    regionSparse.setAttribute('id', 's10-region-sparse');
    regionSparse.setAttribute('x', toX(CHART_E_MIN).toFixed(1));
    regionSparse.setAttribute('y', PAD_TOP);
    regionSparse.setAttribute('width', sparseW.toFixed(1));
    regionSparse.setAttribute('height', plotH);
    regionSparse.setAttribute('fill', COLOR_PAPER_SPARSE);
    regionSparse.setAttribute('stroke', COLOR_GRID);
    regionSparse.setAttribute('stroke-dasharray', '3 3');
    regionSparse.style.transition = 'fill 0.25s ease';
    svg.appendChild(regionSparse);
    chartEls.regionSparse = regionSparse;

    // Dense region: E from 2500 to 4950
    var denseX = toX(2500);
    var denseW = toX(CHART_E_MAX) - denseX;
    var regionDense = document.createElementNS(svgNS, 'rect');
    regionDense.setAttribute('id', 's10-region-dense');
    regionDense.setAttribute('x', denseX.toFixed(1));
    regionDense.setAttribute('y', PAD_TOP);
    regionDense.setAttribute('width', denseW.toFixed(1));
    regionDense.setAttribute('height', plotH);
    regionDense.setAttribute('fill', COLOR_PAPER_DENSE);
    regionDense.setAttribute('stroke', COLOR_GRID);
    regionDense.setAttribute('stroke-dasharray', '3 3');
    regionDense.style.transition = 'fill 0.25s ease';
    svg.appendChild(regionDense);
    chartEls.regionDense = regionDense;

    // Region labels inside shaded zones
    var txtSparse = document.createElementNS(svgNS, 'text');
    txtSparse.setAttribute('x', (toX(CHART_E_MIN) + sparseW / 2).toFixed(1));
    txtSparse.setAttribute('y', PAD_TOP + 20);
    txtSparse.setAttribute('text-anchor', 'middle');
    txtSparse.setAttribute('font-family', 'var(--font-mono)');
    txtSparse.setAttribute('font-size', '13px');
    txtSparse.setAttribute('font-weight', '700');
    txtSparse.setAttribute('fill', COLOR_INK_MUTED);
    txtSparse.textContent = 'Sparse (E ≈ V)';
    svg.appendChild(txtSparse);

    var txtDense = document.createElementNS(svgNS, 'text');
    txtDense.setAttribute('x', (denseX + denseW / 2).toFixed(1));
    txtDense.setAttribute('y', PAD_TOP + 20);
    txtDense.setAttribute('text-anchor', 'middle');
    txtDense.setAttribute('font-family', 'var(--font-mono)');
    txtDense.setAttribute('font-size', '13px');
    txtDense.setAttribute('font-weight', '700');
    txtDense.setAttribute('fill', COLOR_INK_MUTED);
    txtDense.textContent = 'Dense (E ≈ V²)';
    svg.appendChild(txtDense);

    // 2. Grid lines & Y ticks (10k, 30k, 60k)
    var yTicks = [10000, 30000, 60000];
    for (var i = 0; i < yTicks.length; i++) {
      var ty = toY(yTicks[i]);
      var gLine = document.createElementNS(svgNS, 'line');
      gLine.setAttribute('x1', PAD_LEFT);
      gLine.setAttribute('y1', ty.toFixed(1));
      gLine.setAttribute('x2', (PAD_LEFT + plotW).toFixed(1));
      gLine.setAttribute('y2', ty.toFixed(1));
      gLine.setAttribute('stroke', COLOR_GRID);
      gLine.setAttribute('stroke-dasharray', '3 3');
      svg.appendChild(gLine);

      var yTxt = document.createElementNS(svgNS, 'text');
      yTxt.setAttribute('x', PAD_LEFT - 8);
      yTxt.setAttribute('y', (ty + 5).toFixed(1));
      yTxt.setAttribute('text-anchor', 'end');
      yTxt.setAttribute('font-family', 'var(--font-mono)');
      yTxt.setAttribute('font-size', '13px');
      yTxt.setAttribute('fill', COLOR_INK_MUTED);
      yTxt.textContent = (yTicks[i] / 1000) + 'k';
      svg.appendChild(yTxt);
    }

    // 3. Axes
    var axisX = document.createElementNS(svgNS, 'line');
    axisX.setAttribute('x1', PAD_LEFT);
    axisX.setAttribute('y1', PAD_TOP + plotH);
    axisX.setAttribute('x2', PAD_LEFT + plotW);
    axisX.setAttribute('y2', PAD_TOP + plotH);
    axisX.setAttribute('stroke', COLOR_INK);
    axisX.setAttribute('stroke-width', '2');
    svg.appendChild(axisX);

    var axisY = document.createElementNS(svgNS, 'line');
    axisY.setAttribute('x1', PAD_LEFT);
    axisY.setAttribute('y1', PAD_TOP);
    axisY.setAttribute('x2', PAD_LEFT);
    axisY.setAttribute('y2', PAD_TOP + plotH);
    axisY.setAttribute('stroke', COLOR_INK);
    axisY.setAttribute('stroke-width', '2');
    svg.appendChild(axisY);

    // Axis Labels (at least 16px as required)
    var labelX = document.createElementNS(svgNS, 'text');
    labelX.setAttribute('x', (PAD_LEFT + plotW / 2).toFixed(1));
    labelX.setAttribute('y', (PAD_TOP + plotH + 46).toFixed(1));
    labelX.setAttribute('text-anchor', 'middle');
    labelX.setAttribute('font-family', 'var(--font-display)');
    labelX.setAttribute('font-size', '16px');
    labelX.setAttribute('font-weight', '700');
    labelX.setAttribute('fill', COLOR_INK);
    labelX.textContent = 'Number of Edges (E)';
    svg.appendChild(labelX);

    var labelY = document.createElementNS(svgNS, 'text');
    labelY.setAttribute('x', PAD_LEFT - 12);
    labelY.setAttribute('y', PAD_TOP - 14);
    labelY.setAttribute('text-anchor', 'start');
    labelY.setAttribute('font-family', 'var(--font-display)');
    labelY.setAttribute('font-size', '16px');
    labelY.setAttribute('font-weight', '700');
    labelY.setAttribute('fill', COLOR_INK);
    labelY.textContent = 'Operations';
    svg.appendChild(labelY);

    // 4. X Ticks (99, 1000, 2500, 4950)
    var xTicks = [
      { val: 99, label: 'E = 99' },
      { val: 1000, label: '1,000' },
      { val: 2500, label: '2,500' },
      { val: 4950, label: 'E = 4,950' }
    ];
    for (var j = 0; j < xTicks.length; j++) {
      var tx = toX(xTicks[j].val);
      var tickLine = document.createElementNS(svgNS, 'line');
      tickLine.setAttribute('x1', tx.toFixed(1));
      tickLine.setAttribute('y1', PAD_TOP + plotH);
      tickLine.setAttribute('x2', tx.toFixed(1));
      tickLine.setAttribute('y2', PAD_TOP + plotH + 5);
      tickLine.setAttribute('stroke', COLOR_INK);
      tickLine.setAttribute('stroke-width', '1.5');
      svg.appendChild(tickLine);

      var xTxt = document.createElementNS(svgNS, 'text');
      xTxt.setAttribute('x', tx.toFixed(1));
      xTxt.setAttribute('y', PAD_TOP + plotH + 20);
      xTxt.setAttribute('text-anchor', 'middle');
      xTxt.setAttribute('font-family', 'var(--font-mono)');
      xTxt.setAttribute('font-size', '13px');
      xTxt.setAttribute('fill', COLOR_INK_MUTED);
      xTxt.textContent = xTicks[j].label;
      svg.appendChild(xTxt);
    }

    // 5. Crossover vertical guide line & marker
    var crossLine = document.createElementNS(svgNS, 'line');
    crossLine.setAttribute('x1', crossoverX.toFixed(1));
    crossLine.setAttribute('y1', PAD_TOP);
    crossLine.setAttribute('x2', crossoverX.toFixed(1));
    crossLine.setAttribute('y2', PAD_TOP + plotH);
    crossLine.setAttribute('stroke', '#B80F2A');
    crossLine.setAttribute('stroke-width', '1.5');
    crossLine.setAttribute('stroke-dasharray', '4 4');
    svg.appendChild(crossLine);

    var crossDot = document.createElementNS(svgNS, 'circle');
    crossDot.setAttribute('cx', crossoverX.toFixed(1));
    crossDot.setAttribute('cy', crossoverY.toFixed(1));
    crossDot.setAttribute('r', '5.5');
    crossDot.setAttribute('fill', COLOR_VERMILION);
    crossDot.setAttribute('stroke', '#FFFFFF');
    crossDot.setAttribute('stroke-width', '2');
    svg.appendChild(crossDot);

    // Crossover callout label
    var crossCallout = document.createElementNS(svgNS, 'g');
    var crossLabelText = document.createElementNS(svgNS, 'text');
    crossLabelText.setAttribute('id', 's10-cross-label');
    crossLabelText.setAttribute('x', (crossoverX + 8).toFixed(1));
    crossLabelText.setAttribute('y', (crossoverY - 20).toFixed(1));
    crossLabelText.setAttribute('font-family', 'var(--font-display)');
    crossLabelText.setAttribute('font-size', '14px');
    crossLabelText.setAttribute('font-weight', '700');
    crossLabelText.setAttribute('fill', COLOR_INK);
    crossLabelText.textContent = 'Matrix-Prim wins from here \u2192';
    crossCallout.appendChild(crossLabelText);

    var crossSubText = document.createElementNS(svgNS, 'text');
    crossSubText.setAttribute('id', 's10-cross-sub');
    crossSubText.setAttribute('x', (crossoverX + 8).toFixed(1));
    crossSubText.setAttribute('y', (crossoverY - 6).toFixed(1));
    crossSubText.setAttribute('font-family', 'var(--font-mono)');
    crossSubText.setAttribute('font-size', '12px');
    crossSubText.setAttribute('fill', COLOR_INK_MUTED);
    crossSubText.textContent = 'crossover E \u2248 ' + crossoverE.toLocaleString();
    crossCallout.appendChild(crossSubText);
    svg.appendChild(crossCallout);

    // 6. Draw Curves (Stroke widths at least 3px as required)
    var stepsCount = 70;

    // Curve 1: Kruskal E log2(E) (Vermilion)
    var dKruskal = '';
    for (var s1 = 0; s1 <= stepsCount; s1++) {
      var curE1 = CHART_E_MIN + (s1 / stepsCount) * (CHART_E_MAX - CHART_E_MIN);
      var curOps1 = curE1 * Math.log2(curE1);
      var ptX1 = toX(curE1);
      var ptY1 = toY(curOps1);
      dKruskal += (s1 === 0 ? 'M' : 'L') + ptX1.toFixed(1) + ',' + ptY1.toFixed(1);
    }
    var pathKruskal = document.createElementNS(svgNS, 'path');
    pathKruskal.setAttribute('id', 's10-curve-kruskal');
    pathKruskal.setAttribute('d', dKruskal);
    pathKruskal.setAttribute('fill', 'none');
    pathKruskal.setAttribute('stroke', COLOR_VERMILION);
    pathKruskal.setAttribute('stroke-width', '3.5');
    pathKruskal.setAttribute('stroke-linecap', 'round');
    pathKruskal.style.transition = 'stroke-width 0.2s ease, opacity 0.2s ease';
    svg.appendChild(pathKruskal);
    chartEls.curveKruskal = pathKruskal;

    // Curve 2: Prim with heap E log2(V) (Cobalt)
    var dPrimHeap = '';
    var logV = Math.log2(CHART_V); // log2(100) ≈ 6.6438
    for (var s2 = 0; s2 <= stepsCount; s2++) {
      var curE2 = CHART_E_MIN + (s2 / stepsCount) * (CHART_E_MAX - CHART_E_MIN);
      var curOps2 = curE2 * logV;
      var ptX2 = toX(curE2);
      var ptY2 = toY(curOps2);
      dPrimHeap += (s2 === 0 ? 'M' : 'L') + ptX2.toFixed(1) + ',' + ptY2.toFixed(1);
    }
    var pathPrimHeap = document.createElementNS(svgNS, 'path');
    pathPrimHeap.setAttribute('id', 's10-curve-prim-heap');
    pathPrimHeap.setAttribute('d', dPrimHeap);
    pathPrimHeap.setAttribute('fill', 'none');
    pathPrimHeap.setAttribute('stroke', COLOR_COBALT);
    pathPrimHeap.setAttribute('stroke-width', '3.5');
    pathPrimHeap.setAttribute('stroke-linecap', 'round');
    pathPrimHeap.style.transition = 'stroke-width 0.2s ease, opacity 0.2s ease';
    svg.appendChild(pathPrimHeap);
    chartEls.curvePrimHeap = pathPrimHeap;

    // Curve 3: Prim with matrix V² = 10,000 flat line (Teal)
    var pathPrimMatrix = document.createElementNS(svgNS, 'line');
    pathPrimMatrix.setAttribute('id', 's10-curve-prim-matrix');
    pathPrimMatrix.setAttribute('x1', PAD_LEFT);
    pathPrimMatrix.setAttribute('y1', crossoverY.toFixed(1));
    pathPrimMatrix.setAttribute('x2', (PAD_LEFT + plotW).toFixed(1));
    pathPrimMatrix.setAttribute('y2', crossoverY.toFixed(1));
    pathPrimMatrix.setAttribute('stroke', COLOR_TEAL);
    pathPrimMatrix.setAttribute('stroke-width', '3.5');
    pathPrimMatrix.setAttribute('stroke-linecap', 'round');
    pathPrimMatrix.style.transition = 'stroke-width 0.2s ease, opacity 0.2s ease';
    svg.appendChild(pathPrimMatrix);
    chartEls.curvePrimMatrix = pathPrimMatrix;

    // 7. Labels at line ENDS (with generous spacing > 100px so nothing overlaps)
    var endX = PAD_LEFT + plotW + 12;

    // Kruskal line end: ops ≈ 60,752 -> Y ≈ 61
    var endYKruskal = toY(CHART_E_MAX * Math.log2(CHART_E_MAX));
    var lblKruskal = document.createElementNS(svgNS, 'text');
    lblKruskal.setAttribute('id', 's10-label-kruskal');
    lblKruskal.setAttribute('x', endX.toFixed(1));
    lblKruskal.setAttribute('y', (endYKruskal + 5).toFixed(1));
    lblKruskal.setAttribute('font-family', 'var(--font-mono)');
    lblKruskal.setAttribute('font-size', '15px');
    lblKruskal.setAttribute('font-weight', '700');
    lblKruskal.setAttribute('fill', COLOR_VERMILION);
    lblKruskal.style.cursor = 'pointer';
    lblKruskal.textContent = 'Kruskal: O(E log E)';
    svg.appendChild(lblKruskal);
    chartEls.labelKruskal = lblKruskal;

    // Prim heap line end: ops ≈ 32,887 -> Y ≈ 206
    var endYPrimHeap = toY(CHART_E_MAX * logV);
    var lblPrimHeap = document.createElementNS(svgNS, 'text');
    lblPrimHeap.setAttribute('id', 's10-label-prim-heap');
    lblPrimHeap.setAttribute('x', endX.toFixed(1));
    lblPrimHeap.setAttribute('y', (endYPrimHeap + 5).toFixed(1));
    lblPrimHeap.setAttribute('font-family', 'var(--font-mono)');
    lblPrimHeap.setAttribute('font-size', '15px');
    lblPrimHeap.setAttribute('font-weight', '700');
    lblPrimHeap.setAttribute('fill', COLOR_COBALT);
    lblPrimHeap.style.cursor = 'pointer';
    lblPrimHeap.textContent = 'Prim heap: O(E log V)';
    svg.appendChild(lblPrimHeap);
    chartEls.labelPrimHeap = lblPrimHeap;

    // Prim matrix line end: ops = 10,000 -> Y ≈ 324
    var endYPrimMat = crossoverY;
    var lblPrimMatrix = document.createElementNS(svgNS, 'text');
    lblPrimMatrix.setAttribute('id', 's10-label-prim-matrix');
    lblPrimMatrix.setAttribute('x', endX.toFixed(1));
    lblPrimMatrix.setAttribute('y', (endYPrimMat + 5).toFixed(1));
    lblPrimMatrix.setAttribute('font-family', 'var(--font-mono)');
    lblPrimMatrix.setAttribute('font-size', '15px');
    lblPrimMatrix.setAttribute('font-weight', '700');
    lblPrimMatrix.setAttribute('fill', COLOR_TEAL);
    lblPrimMatrix.style.cursor = 'pointer';
    lblPrimMatrix.textContent = 'Prim matrix: O(V²)';
    svg.appendChild(lblPrimMatrix);
    chartEls.labelPrimMatrix = lblPrimMatrix;

    // 8. Curve Label Hover Handlers
    lblKruskal.addEventListener('mouseenter', function () { highlightSingleCurve('kruskal'); });
    lblKruskal.addEventListener('mouseleave', function () { restoreChartHighlight(); });

    lblPrimHeap.addEventListener('mouseenter', function () { highlightSingleCurve('prim-heap'); });
    lblPrimHeap.addEventListener('mouseleave', function () { restoreChartHighlight(); });

    lblPrimMatrix.addEventListener('mouseenter', function () { highlightSingleCurve('prim-matrix'); });
    lblPrimMatrix.addEventListener('mouseleave', function () { restoreChartHighlight(); });
  }

  /* ----------------------------------------------------------------
     3. Highlighting: Verdict Cards and Curve Labels
     ---------------------------------------------------------------- */
  function highlightSparse() {
    if (chartEls.regionSparse) chartEls.regionSparse.setAttribute('fill', COLOR_PAPER_SPARSE_HL);
    if (chartEls.regionDense) chartEls.regionDense.setAttribute('fill', COLOR_PAPER_DENSE);

    if (chartEls.curveKruskal) {
      chartEls.curveKruskal.setAttribute('stroke-width', '5');
      chartEls.curveKruskal.style.opacity = '1';
    }
    if (chartEls.curvePrimHeap) {
      chartEls.curvePrimHeap.setAttribute('stroke-width', '5');
      chartEls.curvePrimHeap.style.opacity = '1';
    }
    if (chartEls.curvePrimMatrix) {
      chartEls.curvePrimMatrix.setAttribute('stroke-width', '2');
      chartEls.curvePrimMatrix.style.opacity = '0.25';
    }
  }

  function highlightDense() {
    if (chartEls.regionDense) chartEls.regionDense.setAttribute('fill', COLOR_PAPER_DENSE_HL);
    if (chartEls.regionSparse) chartEls.regionSparse.setAttribute('fill', COLOR_PAPER_SPARSE);

    if (chartEls.curvePrimMatrix) {
      chartEls.curvePrimMatrix.setAttribute('stroke-width', '5.5');
      chartEls.curvePrimMatrix.style.opacity = '1';
    }
    if (chartEls.curveKruskal) {
      chartEls.curveKruskal.setAttribute('stroke-width', '2');
      chartEls.curveKruskal.style.opacity = '0.25';
    }
    if (chartEls.curvePrimHeap) {
      chartEls.curvePrimHeap.setAttribute('stroke-width', '2');
      chartEls.curvePrimHeap.style.opacity = '0.25';
    }
  }

  function highlightSingleCurve(curveKey) {
    if (!chartEls.curveKruskal || !chartEls.curvePrimHeap || !chartEls.curvePrimMatrix) return;

    chartEls.curveKruskal.setAttribute('stroke-width', '2');
    chartEls.curveKruskal.style.opacity = '0.25';
    chartEls.curvePrimHeap.setAttribute('stroke-width', '2');
    chartEls.curvePrimHeap.style.opacity = '0.25';
    chartEls.curvePrimMatrix.setAttribute('stroke-width', '2');
    chartEls.curvePrimMatrix.style.opacity = '0.25';

    if (curveKey === 'kruskal') {
      chartEls.curveKruskal.setAttribute('stroke-width', '5');
      chartEls.curveKruskal.style.opacity = '1';
    } else if (curveKey === 'prim-heap') {
      chartEls.curvePrimHeap.setAttribute('stroke-width', '5');
      chartEls.curvePrimHeap.style.opacity = '1';
    } else if (curveKey === 'prim-matrix') {
      chartEls.curvePrimMatrix.setAttribute('stroke-width', '5');
      chartEls.curvePrimMatrix.style.opacity = '1';
    }
  }

  function restoreChartHighlight() {
    if (chartEls.regionSparse) chartEls.regionSparse.setAttribute('fill', COLOR_PAPER_SPARSE);
    if (chartEls.regionDense) chartEls.regionDense.setAttribute('fill', COLOR_PAPER_DENSE);

    if (chartEls.curveKruskal) {
      chartEls.curveKruskal.setAttribute('stroke-width', '3.5');
      chartEls.curveKruskal.style.opacity = '1';
    }
    if (chartEls.curvePrimHeap) {
      chartEls.curvePrimHeap.setAttribute('stroke-width', '3.5');
      chartEls.curvePrimHeap.style.opacity = '1';
    }
    if (chartEls.curvePrimMatrix) {
      chartEls.curvePrimMatrix.setAttribute('stroke-width', '3.5');
      chartEls.curvePrimMatrix.style.opacity = '1';
    }
  }

  /* ----------------------------------------------------------------
     4. Story Stepping Flow
     ---------------------------------------------------------------- */
  function updateStory() {
    for (var i = 0; i < dom.stepEls.length; i++) {
      var stepNum = parseInt(dom.stepEls[i].getAttribute('data-step'), 10);
      if (stepNum <= currentStep) {
        dom.stepEls[i].classList.add('visible');
      } else {
        dom.stepEls[i].classList.remove('visible');
      }
    }

    if (dom.btnNext) {
      dom.btnNext.disabled = (currentStep >= totalSteps);
      dom.btnNext.textContent = (currentStep >= totalSteps) ? 'All revealed \u2713' : 'Next step \u2192';
    }
  }

  function nextStep() {
    if (currentStep < totalSteps) {
      currentStep++;
      updateStory();
    }
  }

  function resetStory() {
    currentStep = 1;
    updateStory();
    restoreChartHighlight();
  }

  /* ----------------------------------------------------------------
     5. Full Complexity Table Drawer Modal
     ---------------------------------------------------------------- */
  function openDrawer() {
    if (dom.drawerBackdrop) {
      dom.drawerBackdrop.classList.add('open');
      dom.drawerBackdrop.setAttribute('aria-hidden', 'false');
      isDrawerOpen = true;
    }
  }

  function closeDrawer() {
    if (dom.drawerBackdrop) {
      dom.drawerBackdrop.classList.remove('open');
      dom.drawerBackdrop.setAttribute('aria-hidden', 'true');
      isDrawerOpen = false;
    }
  }

  /* ----------------------------------------------------------------
     6. Slide Lifecycle & Public API
     ---------------------------------------------------------------- */
  NG.slides.s10 = {
    init: function () {
      dom.chartSvg = document.getElementById('s10-growth-chart');
      dom.btnNext = document.getElementById('s10-btn-next');
      dom.btnReset = document.getElementById('s10-btn-reset');
      dom.btnTable = document.getElementById('s10-btn-table');
      dom.btnCloseTable = document.getElementById('s10-btn-close-table');
      dom.drawerBackdrop = document.getElementById('s10-table-drawer');
      dom.verdictSparse = document.getElementById('s10-verdict-sparse');
      dom.verdictDense = document.getElementById('s10-verdict-dense');
      dom.stepEls = Array.from(document.querySelectorAll('#s10 .s10-step'));

      // Render chart
      initChart();

      // Setup Stepper Buttons
      if (dom.btnNext) {
        dom.btnNext.addEventListener('click', function () { nextStep(); });
      }
      if (dom.btnReset) {
        dom.btnReset.addEventListener('click', function () { resetStory(); });
      }

      // Setup Verdict Card Hovers
      if (dom.verdictSparse) {
        dom.verdictSparse.addEventListener('mouseenter', highlightSparse);
        dom.verdictSparse.addEventListener('mouseleave', restoreChartHighlight);
        dom.verdictSparse.addEventListener('focus', highlightSparse);
        dom.verdictSparse.addEventListener('blur', restoreChartHighlight);
      }
      if (dom.verdictDense) {
        dom.verdictDense.addEventListener('mouseenter', highlightDense);
        dom.verdictDense.addEventListener('mouseleave', restoreChartHighlight);
        dom.verdictDense.addEventListener('focus', highlightDense);
        dom.verdictDense.addEventListener('blur', restoreChartHighlight);
      }

      // Setup Drawer Buttons & Backdrop
      if (dom.btnTable) {
        dom.btnTable.addEventListener('click', openDrawer);
      }
      if (dom.btnCloseTable) {
        dom.btnCloseTable.addEventListener('click', closeDrawer);
      }
      if (dom.drawerBackdrop) {
        dom.drawerBackdrop.addEventListener('click', function (e) {
          if (e.target === dom.drawerBackdrop) {
            closeDrawer();
          }
        });
      }

      // Keyboard listener (Right Arrow step reveal when active slide, Esc for drawer)
      boundKeyHandler = function (e) {
        var slide = document.getElementById('s10');
        if (!slide || !slide.classList.contains('active')) return;

        var tag = document.activeElement ? document.activeElement.tagName : '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        if (e.key === 'ArrowRight' || e.keyCode === 39) {
          if (currentStep < totalSteps) {
            e.preventDefault();
            e.stopPropagation();
            nextStep();
          }
        } else if (e.key === 'Escape' || e.keyCode === 27) {
          if (isDrawerOpen) {
            e.preventDefault();
            e.stopPropagation();
            closeDrawer();
          }
        }
      };
      window.addEventListener('keydown', boundKeyHandler, true);

      // Initial story state
      updateStory();
    },

    pause: function () {
      closeDrawer();
    },

    resume: function () {
      resetStory();
      closeDrawer();
    },

    destroy: function () {
      if (boundKeyHandler) {
        window.removeEventListener('keydown', boundKeyHandler, true);
        boundKeyHandler = null;
      }
      closeDrawer();
    },

    // Exposed helpers for testing and verification
    computeSmallestCrossoverE: computeSmallestCrossoverE,
    getCurrentStep: function () { return currentStep; },
    nextStep: nextStep,
    resetStory: resetStory,
    openDrawer: openDrawer,
    closeDrawer: closeDrawer
  };
})();
