/* ============================================================
   s08b.js — Slide 8b: Campus Network Designer (Flagship Simulation)
   ============================================================ */
(function () {
  'use strict';

  window.NG = window.NG || {};
  NG.slides = NG.slides || {};

  var SVG_NS = 'http://www.w3.org/2000/svg';
  var STORAGE_KEY = 'ng_campus_designer';

  var SAMPLE_BUILDINGS = [
    { id: 'b1', name: 'Main Block', x: 500, y: 300 },
    { id: 'b2', name: 'Library', x: 380, y: 200 },
    { id: 'b3', name: 'CSE Dept', x: 620, y: 200 },
    { id: 'b4', name: 'Hostel A', x: 140, y: 150 },
    { id: 'b5', name: 'Hostel B', x: 160, y: 440 },
    { id: 'b6', name: 'Canteen', x: 330, y: 380 },
    { id: 'b7', name: 'Auditorium', x: 700, y: 380 },
    { id: 'b8', name: 'Sports Complex', x: 860, y: 250 },
    { id: 'b9', name: 'Admin', x: 500, y: 120 },
    { id: 'b10', name: 'Workshop', x: 760, y: 520 }
  ];

  var SAMPLE_OBSTACLES = [
    { id: 'obs1', type: 'road', x: 0, y: 335, w: 1000, h: 22, mult: 2, label: 'Road' },
    { id: 'obs2', type: 'rocky', x: 80, y: 240, w: 130, h: 110, mult: 3, label: 'Rocky ground' },
    { id: 'obs3', type: 'nogo', x: 700, y: 80, w: 200, h: 90, mult: Infinity, label: 'Lake' }
  ];

  var PALETTE = [
    'var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)',
    'var(--c5)', 'var(--c6)', 'var(--c7)', 'var(--c8)'
  ];

  // State
  var buildings = [];
  var obstacles = [];
  var mapWidthMetres = 500;
  var ratePerMetre = 500;
  var mode = 'place'; // 'place' | 'move' | 'delete' | 'draw'
  var obstacleType = 'road'; // 'road' | 'rocky' | 'nogo'
  var showMeshLinks = false;
  var algo = 'kruskal'; // 'kruskal' | 'prim'
  var primRootId = null;

  var historyStack = [];
  var graph = null;
  var edgeDataMap = new Map(); // eid -> { cost, metres, blocked }
  var stepper = null;
  var steps = [];
  var rejectTimeout = null;
  var kruskalRan = false;
  var primRan = false;

  // DOM elements cache
  var elCanvasContainer = null;
  var svgEl = null;
  var gObstacles = null;
  var gDrawing = null;
  var gMeshLinks = null;
  var gTreeLinks = null;
  var gCostBadges = null;
  var gBuildings = null;
  var gOverlay = null;

  var elBtnPlace = null;
  var elBtnMove = null;
  var elBtnDelete = null;
  var elBtnDraw = null;
  var elObsPicker = null;
  var elBtnObsRoad = null;
  var elBtnObsRocky = null;
  var elBtnObsNogo = null;
  var elBtnUndo = null;
  var elBtnClear = null;
  var elBtnSample = null;
  var elBtnToggleMesh = null;
  var elWarning = null;

  var elBtnBuild = null;
  var elStepBtn = null;
  var elBackBtn = null;
  var elResetBtn = null;
  var elSpeedSlider = null;
  var elSpeedVal = null;
  var elSimCaption = null;
  var elAlgoKruskal = null;
  var elAlgoPrim = null;
  var elPrimRootWrap = null;
  var elPrimRootSel = null;

  var elInputWidth = null;
  var elInputRate = null;
  var elScaleHint = null;

  var elStatN = null;
  var elStatK = null;
  var elStatNMinus1 = null;
  var elStatLength = null;
  var elStatTotal = null;
  var elStatMeshCost = null;
  var elStatSavings = null;
  var elCmpBox = null;
  var elStatCmpChip = null;

  function pushHistory() {
    historyStack.push({
      buildings: JSON.parse(JSON.stringify(buildings)),
      obstacles: JSON.parse(JSON.stringify(obstacles))
    });
    if (historyStack.length > 30) historyStack.shift();
  }

  function saveToStorage() {
    try {
      if (buildings.length === 0 && obstacles.length === 0) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      var state = {
        buildings: buildings,
        obstacles: obstacles,
        mapWidthMetres: mapWidthMetres,
        ratePerMetre: ratePerMetre,
        algo: algo,
        primRootId: primRootId,
        showMeshLinks: showMeshLinks
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function loadFromStorage() {
    try {
      var data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        var parsed = JSON.parse(data);
        if (Array.isArray(parsed.buildings) && parsed.buildings.length > 0) {
          buildings = parsed.buildings;
          obstacles = Array.isArray(parsed.obstacles) ? parsed.obstacles : [];
          if (typeof parsed.mapWidthMetres === 'number' && parsed.mapWidthMetres > 0) {
            mapWidthMetres = parsed.mapWidthMetres;
          }
          if (typeof parsed.ratePerMetre === 'number' && parsed.ratePerMetre > 0) {
            ratePerMetre = parsed.ratePerMetre;
          }
          if (parsed.algo === 'kruskal' || parsed.algo === 'prim') {
            algo = parsed.algo;
          }
          primRootId = parsed.primRootId || (buildings[0] ? buildings[0].id : null);
          showMeshLinks = !!parsed.showMeshLinks;
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  // Cost calculation by segment sampling
  function computeEdgeCost(p1, p2, obstacleList, widthMetres, rate) {
    var dx = p2.x - p1.x;
    var dy = p2.y - p1.y;
    var distPx = Math.hypot(dx, dy);
    var metresPerPixel = widthMetres / 1000;
    if (distPx === 0) return { blocked: true, cost: 0, metres: 0 };

    var N = Math.max(1, Math.round(distPx / 2));
    var stepMetres = (distPx / N) * metresPerPixel;
    var effectiveMetres = 0;

    for (var i = 0; i < N; i++) {
      var t = (i + 0.5) / N;
      var sx = p1.x + t * dx;
      var sy = p1.y + t * dy;

      var sampleMult = 1;
      for (var j = 0; j < obstacleList.length; j++) {
        var obs = obstacleList[j];
        if (sx >= obs.x && sx <= obs.x + obs.w && sy >= obs.y && sy <= obs.y + obs.h) {
          if (obs.type === 'nogo') {
            return { blocked: true, cost: Infinity, metres: Math.round(distPx * metresPerPixel) };
          }
          if (obs.mult > sampleMult) {
            sampleMult = obs.mult;
          }
        }
      }
      effectiveMetres += stepMetres * sampleMult;
    }

    var cost = Math.round(effectiveMetres * rate);
    return { blocked: false, cost: cost, metres: Math.round(distPx * metresPerPixel) };
  }

  function isPointInNoGo(x, y) {
    for (var i = 0; i < obstacles.length; i++) {
      var obs = obstacles[i];
      if (obs.type === 'nogo') {
        if (x >= obs.x && x <= obs.x + obs.w && y >= obs.y && y <= obs.y + obs.h) {
          return true;
        }
      }
    }
    return false;
  }

  function findObstacleAt(x, y) {
    for (var i = obstacles.length - 1; i >= 0; i--) {
      var obs = obstacles[i];
      if (x >= obs.x && x <= obs.x + obs.w && y >= obs.y && y <= obs.y + obs.h) {
        return obs;
      }
    }
    return null;
  }

  function findBuildingAt(x, y, radius) {
    radius = radius || 20;
    for (var i = buildings.length - 1; i >= 0; i--) {
      var b = buildings[i];
      var d = Math.hypot(b.x - x, b.y - y);
      if (d <= radius) return b;
    }
    return null;
  }

  function clientToSvg(clientX, clientY) {
    if (!svgEl) return { x: 0, y: 0 };
    var pt = svgEl.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    var ctm = svgEl.getScreenCTM();
    if (ctm) {
      return pt.matrixTransform(ctm.inverse());
    }
    return { x: clientX, y: clientY };
  }

  function updatePlayButton() {
    if (!elBtnBuild || !stepper) return;
    if (stepper.playing) {
      elBtnBuild.textContent = 'Pause';
      elBtnBuild.classList.remove('btn-primary');
    } else {
      elBtnBuild.textContent = 'Build';
      elBtnBuild.classList.add('btn-primary');
    }
  }

  function updatePrimRootOptions() {
    if (!elPrimRootSel) return;
    elPrimRootSel.innerHTML = '';
    for (var i = 0; i < buildings.length; i++) {
      var b = buildings[i];
      var opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      if (b.id === primRootId) opt.selected = true;
      elPrimRootSel.appendChild(opt);
    }
  }

  // Rebuild the mathematical graph and stepper
  function rebuildGraph() {
    if (stepper) stepper.pause();
    clearTimeout(rejectTimeout);

    graph = new NG.Graph();
    edgeDataMap.clear();

    for (var bi = 0; bi < buildings.length; bi++) {
      var b = buildings[bi];
      graph.addNode(b.x, b.y, b.name, b.id);
    }

    var meshCost = 0;
    var meshCount = 0;

    for (var i = 0; i < buildings.length; i++) {
      for (var j = i + 1; j < buildings.length; j++) {
        var b1 = buildings[i];
        var b2 = buildings[j];
        var res = computeEdgeCost(b1, b2, obstacles, mapWidthMetres, ratePerMetre);
        var eid = b1.id + '_' + b2.id;
        edgeDataMap.set(eid, res);

        if (!res.blocked) {
          graph.addEdge(b1.id, b2.id, res.cost, eid);
          meshCost += res.cost;
          meshCount++;
        }
      }
    }

    var n = buildings.length;

    // Warning and connectivity checks
    if (elWarning) {
      if (n < 2) {
        elWarning.style.display = 'flex';
        elWarning.className = 's08b-warning-banner';
        elWarning.textContent = 'Place at least 2 buildings to design a network.';
      } else {
        var isConn = NG.Algo.isConnected(graph);
        if (!isConn) {
          var comps = NG.Algo.components(graph);
          elWarning.style.display = 'flex';
          elWarning.className = 's08b-warning-banner alarm';
          elWarning.textContent = 'No-go zone cuts the campus into ' + comps.length + ' separate parts.';
        } else {
          elWarning.style.display = 'none';
          elWarning.textContent = '';
        }
      }
    }

    // Prepare steps
    steps = [];
    if (n >= 2) {
      if (algo === 'kruskal') {
        steps = NG.Algo.kruskalSteps(graph);
      } else {
        if (!primRootId || !graph.node(primRootId)) {
          primRootId = buildings[0] ? buildings[0].id : null;
        }
        steps = NG.Algo.primSteps(graph, primRootId);
      }
    }

    updatePrimRootOptions();

    var currentSpeed = elSpeedSlider ? parseFloat(elSpeedSlider.value) : 1;
    stepper = new NG.Stepper({
      steps: steps,
      intervalMs: 700,
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
    renderStaticMap();
    saveToStorage();
  }

  function renderStaticMap() {
    if (!svgEl || !gObstacles || !gMeshLinks || !gBuildings) return;

    // 1. Obstacles
    gObstacles.innerHTML = '';
    for (var oi = 0; oi < obstacles.length; oi++) {
      var obs = obstacles[oi];
      var gObs = document.createElementNS(SVG_NS, 'g');
      gObs.setAttribute('data-id', obs.id);

      var rect = document.createElementNS(SVG_NS, 'rect');
      rect.setAttribute('x', obs.x);
      rect.setAttribute('y', obs.y);
      rect.setAttribute('width', obs.w);
      rect.setAttribute('height', obs.h);
      rect.setAttribute('class', 's08b-obs-rect');

      if (obs.type === 'road') {
        rect.setAttribute('fill', 'url(#s08b-pattern-road)');
        rect.setAttribute('stroke', '#d97706');
      } else if (obs.type === 'rocky') {
        rect.setAttribute('fill', 'url(#s08b-pattern-rocky)');
        rect.setAttribute('stroke', '#4b5563');
      } else {
        rect.setAttribute('fill', 'url(#s08b-pattern-nogo)');
        rect.setAttribute('stroke', '#dc2626');
      }
      gObs.appendChild(rect);

      // Label in top-left
      var txt = document.createElementNS(SVG_NS, 'text');
      txt.setAttribute('x', obs.x + 6);
      txt.setAttribute('y', obs.y + 14);
      txt.setAttribute('class', 's08b-obs-label');
      txt.setAttribute('fill', obs.type === 'nogo' ? '#dc2626' : (obs.type === 'road' ? '#b45309' : '#374151'));
      txt.textContent = obs.label + (obs.mult !== Infinity ? ' (\u00D7' + obs.mult + ')' : ' [BLOCKED]');
      gObs.appendChild(txt);

      gObstacles.appendChild(gObs);
    }

    // 2. Candidate Mesh Links (only when toggle ON)
    gMeshLinks.innerHTML = '';
    if (showMeshLinks) {
      var eIter = graph._edges.values();
      for (var eit = eIter.next(); !eit.done; eit = eIter.next()) {
        var edge = eit.value;
        var u = graph.node(edge.u);
        var v = graph.node(edge.v);
        if (!u || !v) continue;

        var line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', u.x);
        line.setAttribute('y1', u.y);
        line.setAttribute('x2', v.x);
        line.setAttribute('y2', v.y);
        line.setAttribute('class', 's08b-cable-candidate');
        line.setAttribute('data-id', edge.id);

        var title = document.createElementNS(SVG_NS, 'title');
        title.textContent = edge.id + ': ' + NG.Util.formatINR(edge.w);
        line.appendChild(title);

        gMeshLinks.appendChild(line);
      }
    }

    // 3. Buildings
    gBuildings.innerHTML = '';
    for (var bi = 0; bi < buildings.length; bi++) {
      var b = buildings[bi];
      var gB = document.createElementNS(SVG_NS, 'g');
      gB.setAttribute('data-id', b.id);
      gB.setAttribute('class', 's08b-building-group');

      // Halo circle behind
      var circle = document.createElementNS(SVG_NS, 'circle');
      circle.setAttribute('cx', b.x);
      circle.setAttribute('cy', b.y);
      circle.setAttribute('r', 15);
      circle.setAttribute('class', 's08b-building-circle');
      gB.appendChild(circle);

      // Inner dot
      var dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('cx', b.x);
      dot.setAttribute('cy', b.y);
      dot.setAttribute('r', 4);
      dot.setAttribute('class', 's08b-building-dot');
      gB.appendChild(dot);

      // Label below
      var lbl = document.createElementNS(SVG_NS, 'text');
      lbl.setAttribute('x', b.x);
      lbl.setAttribute('y', b.y + 26);
      lbl.setAttribute('class', 's08b-building-label');
      lbl.textContent = b.name;
      gB.appendChild(lbl);

      gBuildings.appendChild(gB);
    }
  }

  function renderStep(index, step, dir) {
    if (!svgEl || !gTreeLinks || !gCostBadges) return;
    var n = buildings.length;
    var nMinus1 = Math.max(0, n - 1);

    // 1. Stats Card Base Values
    var meshCost = 0;
    var meshCount = 0;
    var eIter = edgeDataMap.values();
    for (var eit = eIter.next(); !eit.done; eit = eIter.next()) {
      var ed = eit.value;
      if (!ed.blocked) {
        meshCost += ed.cost;
        meshCount++;
      }
    }

    var acceptedEdges = [];
    var currentTotal = 0;
    var totalCableMetres = 0;

    if (step) {
      if (algo === 'kruskal') {
        acceptedEdges = step.acceptedEdges || [];
        currentTotal = step.total || 0;
      } else {
        acceptedEdges = step.treeEdges || [];
        currentTotal = step.total || 0;
      }
    }

    for (var ai = 0; ai < acceptedEdges.length; ai++) {
      var d = edgeDataMap.get(acceptedEdges[ai]);
      if (d) totalCableMetres += d.metres;
    }

    if (elStatN) elStatN.textContent = n;
    if (elStatK) elStatK.textContent = acceptedEdges.length;
    if (elStatNMinus1) elStatNMinus1.textContent = nMinus1;
    if (elStatLength) elStatLength.textContent = totalCableMetres + ' m';
    if (elStatTotal) elStatTotal.textContent = NG.Util.formatINR(currentTotal);
    if (elStatMeshCost) {
      elStatMeshCost.textContent = NG.Util.formatINR(meshCost) + ' (' + meshCount + ' links)';
    }

    var isDone = step && step.type === 'done';
    if (elStatSavings) {
      if (isDone && meshCost > 0) {
        var pct = ((meshCost - currentTotal) / meshCost) * 100;
        elStatSavings.textContent = pct.toFixed(1) + '% saved';
      } else {
        elStatSavings.textContent = '\u2212';
      }
    }

    // Check Kruskal vs Prim equivalence chip
    if (isDone) {
      if (algo === 'kruskal') kruskalRan = true;
      if (algo === 'prim') primRan = true;

      if (elCmpBox && elStatCmpChip) {
        // Precompute or compare
        var kDone = NG.Algo.kruskalSteps(graph).pop();
        var pDone = NG.Algo.primSteps(graph, primRootId).pop();
        if (kDone && pDone && kDone.total === pDone.total) {
          elCmpBox.style.display = 'block';
          elStatCmpChip.style.display = 'inline-block';
        }
      }
    }

    // 2. Caption
    if (elSimCaption) {
      if (index === -1) {
        elSimCaption.textContent = n < 2 ?
          'Place at least 2 buildings on the campus to begin.' :
          'Ready. Click Build to design the minimum-cost cable network.';
      } else if (!step) {
        elSimCaption.textContent = '';
      } else if (step.type === 'consider') {
        elSimCaption.textContent = 'Examining candidate link ' + step.edgeId + ' (' + NG.Util.formatINR(graph.edge(step.edgeId).w) + ')...';
      } else if (step.type === 'accept') {
        elSimCaption.textContent = 'Cable ' + step.edgeId + ' accepted into network (' + NG.Util.formatINR(graph.edge(step.edgeId).w) + ').';
      } else if (step.type === 'reject') {
        elSimCaption.textContent = 'Link ' + step.edgeId + ' would create a cycle. Skipped.';
      } else if (step.type === 'pick') {
        elSimCaption.textContent = 'Connected ' + step.edgeId + ' to campus tree (' + NG.Util.formatINR(graph.edge(step.edgeId).w) + ').';
      } else if (step.type === 'skip') {
        elSimCaption.textContent = 'Link ' + step.edgeId + ' already internal to tree. Skipped.';
      } else if (step.type === 'frontier') {
        elSimCaption.textContent = 'Expanded frontier edges into priority queue.';
      } else if (step.type === 'done') {
        elSimCaption.textContent = step.forest ?
          'Finished spanning forest: ' + acceptedEdges.length + ' cables, total ' + NG.Util.formatINR(currentTotal) + '.' :
          'Optimal network complete: ' + acceptedEdges.length + ' cables, total ' + NG.Util.formatINR(currentTotal) + '.';
      }
    }

    // 3. Tree Cables & Cost Badges
    gTreeLinks.innerHTML = '';
    gCostBadges.innerHTML = '';

    var acceptedSet = new Set(acceptedEdges);
    var frontierSet = new Set((step && step.frontierEdges) ? step.frontierEdges : []);

    // Draw accepted cables
    for (var ci = 0; ci < acceptedEdges.length; ci++) {
      var eid = acceptedEdges[ci];
      var edgeObj = graph.edge(eid);
      if (!edgeObj) continue;
      var uNode = graph.node(edgeObj.u);
      var vNode = graph.node(edgeObj.v);
      if (!uNode || !vNode) continue;

      var line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', uNode.x);
      line.setAttribute('y1', uNode.y);
      line.setAttribute('x2', vNode.x);
      line.setAttribute('y2', vNode.y);
      line.setAttribute('class', 's08b-cable-accepted');
      line.setAttribute('data-id', eid);
      gTreeLinks.appendChild(line);

      // Cost badge in middle
      var midX = (uNode.x + vNode.x) / 2;
      var midY = (uNode.y + vNode.y) / 2;
      var badgeG = document.createElementNS(SVG_NS, 'g');
      badgeG.setAttribute('class', 's08b-cost-badge');

      var costStr = NG.Util.formatINR(edgeObj.w);
      var bWidth = Math.max(34, costStr.length * 6.5 + 8);
      var bHeight = 16;

      var bRect = document.createElementNS(SVG_NS, 'rect');
      bRect.setAttribute('x', midX - bWidth / 2);
      bRect.setAttribute('y', midY - bHeight / 2);
      bRect.setAttribute('width', bWidth);
      bRect.setAttribute('height', bHeight);
      bRect.setAttribute('rx', 3);
      bRect.setAttribute('ry', 3);

      var bText = document.createElementNS(SVG_NS, 'text');
      bText.setAttribute('x', midX);
      bText.setAttribute('y', midY);
      bText.textContent = costStr;

      badgeG.appendChild(bRect);
      badgeG.appendChild(bText);
      gCostBadges.appendChild(badgeG);
    }

    // Draw frontier edges if Prim is running
    if (algo === 'prim' && step && frontierSet.size > 0) {
      frontierSet.forEach(function (feid) {
        if (!acceptedSet.has(feid)) {
          var fEdge = graph.edge(feid);
          if (fEdge) {
            var fu = graph.node(fEdge.u);
            var fv = graph.node(fEdge.v);
            if (fu && fv) {
              var fLine = document.createElementNS(SVG_NS, 'line');
              fLine.setAttribute('x1', fu.x);
              fLine.setAttribute('y1', fu.y);
              fLine.setAttribute('x2', fv.x);
              fLine.setAttribute('y2', fv.y);
              fLine.setAttribute('class', 's08b-cable-frontier');
              gTreeLinks.appendChild(fLine);
            }
          }
        }
      });
    }

    // Forward animations on accept/reject
    if (dir === 'forward' && step) {
      if (step.type === 'reject') {
        var rejE = graph.edge(step.edgeId);
        if (rejE) {
          var rLine = document.createElementNS(SVG_NS, 'line');
          var ru = graph.node(rejE.u);
          var rv = graph.node(rejE.v);
          rLine.setAttribute('x1', ru.x);
          rLine.setAttribute('y1', ru.y);
          rLine.setAttribute('x2', rv.x);
          rLine.setAttribute('y2', rv.y);
          rLine.setAttribute('class', 's08b-cable-rejected');
          rLine.style.stroke = '#dc3545';
          rLine.style.strokeWidth = '3px';
          gTreeLinks.appendChild(rLine);

          rejectTimeout = setTimeout(function () {
            if (rLine.parentNode) rLine.parentNode.removeChild(rLine);
          }, 600);
        }
      }
    }

    // 4. Building Component / Visited Coloring
    var compColorMap = {};
    if (step && step.componentsAfter && step.componentsAfter.length > 1) {
      // Color forest components
      for (var ci = 0; ci < step.componentsAfter.length; ci++) {
        var comp = step.componentsAfter[ci];
        var col = PALETTE[ci % PALETTE.length];
        for (var cj = 0; cj < comp.length; cj++) {
          compColorMap[comp[cj]] = col;
        }
      }
    }

    var treeNodeSet = new Set((step && step.treeNodes) ? step.treeNodes : []);

    var bGroups = gBuildings.querySelectorAll('.s08b-building-group');
    for (var bi = 0; bi < bGroups.length; bi++) {
      var bg = bGroups[bi];
      var bid = bg.getAttribute('data-id');
      var circleEl = bg.querySelector('.s08b-building-circle');
      if (circleEl) {
        if (compColorMap[bid]) {
          circleEl.style.fill = compColorMap[bid];
          circleEl.style.stroke = 'var(--ink)';
        } else if (algo === 'prim' && treeNodeSet.has(bid)) {
          circleEl.style.fill = 'var(--vermilion-soft)';
          circleEl.style.stroke = 'var(--vermilion)';
        } else {
          circleEl.style.fill = 'var(--paper-2)';
          circleEl.style.stroke = 'var(--ink)';
        }
      }
    }
  }

  function shakeRefusal(x, y) {
    if (elCanvasContainer) {
      elCanvasContainer.classList.remove('s08b-shake');
      void elCanvasContainer.offsetWidth;
      elCanvasContainer.classList.add('s08b-shake');
    }
    // Temporary red marker at refused spot
    var marker = document.createElementNS(SVG_NS, 'circle');
    marker.setAttribute('cx', x);
    marker.setAttribute('cy', y);
    marker.setAttribute('r', 18);
    marker.setAttribute('fill', 'rgba(220, 53, 69, 0.4)');
    marker.setAttribute('stroke', '#dc3545');
    marker.setAttribute('stroke-width', 2);
    gOverlay.appendChild(marker);

    setTimeout(function () {
      if (marker.parentNode) marker.parentNode.removeChild(marker);
    }, 450);
  }

  function setupSVGCanvas() {
    if (!elCanvasContainer) return;
    elCanvasContainer.innerHTML = '';

    svgEl = document.createElementNS(SVG_NS, 'svg');
    svgEl.setAttribute('viewBox', '0 0 1000 620');
    svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    // Defs: hatch patterns
    var defs = document.createElementNS(SVG_NS, 'defs');
    defs.innerHTML = `
      <pattern id="s08b-pattern-road" width="12" height="12" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="12" stroke="#d97706" stroke-width="3" opacity="0.35" />
      </pattern>
      <pattern id="s08b-pattern-rocky" width="8" height="8" patternTransform="rotate(0 0 0)" patternUnits="userSpaceOnUse">
        <path d="M0 0 L8 8 M8 0 L0 8" stroke="#4b5563" stroke-width="1.5" opacity="0.3" />
      </pattern>
      <pattern id="s08b-pattern-nogo" width="16" height="16" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
        <line x1="0" y1="0" x2="0" y2="16" stroke="#dc2626" stroke-width="5" opacity="0.4" />
      </pattern>
    `;
    svgEl.appendChild(defs);

    // Optional background map image (silent fallback if missing)
    var bgImg = document.createElementNS(SVG_NS, 'image');
    bgImg.setAttribute('href', 'assets/campus/campus-map.png');
    bgImg.setAttribute('x', 0);
    bgImg.setAttribute('y', 0);
    bgImg.setAttribute('width', 1000);
    bgImg.setAttribute('height', 620);
    bgImg.setAttribute('opacity', 0.55);
    bgImg.setAttribute('preserveAspectRatio', 'none');
    bgImg.addEventListener('error', function () {
      bgImg.style.display = 'none';
    });
    svgEl.appendChild(bgImg);

    // Layer groups in rendering order
    gObstacles = document.createElementNS(SVG_NS, 'g');
    gDrawing = document.createElementNS(SVG_NS, 'g');
    gMeshLinks = document.createElementNS(SVG_NS, 'g');
    gTreeLinks = document.createElementNS(SVG_NS, 'g');
    gCostBadges = document.createElementNS(SVG_NS, 'g');
    gBuildings = document.createElementNS(SVG_NS, 'g');
    gOverlay = document.createElementNS(SVG_NS, 'g');

    svgEl.appendChild(gObstacles);
    svgEl.appendChild(gDrawing);
    svgEl.appendChild(gMeshLinks);
    svgEl.appendChild(gTreeLinks);
    svgEl.appendChild(gCostBadges);
    svgEl.appendChild(gBuildings);
    svgEl.appendChild(gOverlay);

    elCanvasContainer.appendChild(svgEl);

    // Interactive pointer handlers for canvas
    var isPointerDown = false;
    var startPt = null;
    var draggingBuilding = null;
    var drawPreviewRect = null;

    svgEl.addEventListener('pointerdown', function (e) {
      var pt = clientToSvg(e.clientX, e.clientY);
      var x = Math.max(10, Math.min(990, pt.x));
      var y = Math.max(10, Math.min(610, pt.y));

      isPointerDown = true;
      startPt = { x: x, y: y };

      if (mode === 'place') {
        if (buildings.length >= 30) {
          alert('Maximum 30 buildings reached.');
          return;
        }
        // Refusal check: building cannot be placed in No-go zone
        if (isPointInNoGo(x, y)) {
          shakeRefusal(x, y);
          return;
        }
        // Duplicate click check (within 18px of existing building)
        if (findBuildingAt(x, y, 18)) {
          return;
        }

        // Auto name
        pushHistory();
        var nextNum = 1;
        var existingNames = new Set(buildings.map(function (b) { return b.name; }));
        while (existingNames.has('B' + nextNum)) {
          nextNum++;
        }
        var newId = 'b' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
        buildings.push({
          id: newId,
          name: 'B' + nextNum,
          x: Math.round(x),
          y: Math.round(y)
        });
        rebuildGraph();
      } else if (mode === 'move') {
        var hitB = findBuildingAt(x, y, 22);
        if (hitB) {
          try { svgEl.setPointerCapture(e.pointerId); } catch (_) {}
          draggingBuilding = hitB;
          // Dragging during animation resets the run
          if (stepper && stepper.index > -1) {
            stepper.reset();
            updatePlayButton();
          }
        }
      } else if (mode === 'delete') {
        var delB = findBuildingAt(x, y, 22);
        if (delB) {
          pushHistory();
          buildings = buildings.filter(function (b) { return b.id !== delB.id; });
          if (primRootId === delB.id) {
            primRootId = buildings[0] ? buildings[0].id : null;
          }
          rebuildGraph();
          return;
        }
        var delObs = findObstacleAt(x, y);
        if (delObs) {
          pushHistory();
          obstacles = obstacles.filter(function (o) { return o.id !== delObs.id; });
          rebuildGraph();
          return;
        }
      } else if (mode === 'draw') {
        try { svgEl.setPointerCapture(e.pointerId); } catch (_) {}
        drawPreviewRect = document.createElementNS(SVG_NS, 'rect');
        drawPreviewRect.setAttribute('x', x);
        drawPreviewRect.setAttribute('y', y);
        drawPreviewRect.setAttribute('width', 0);
        drawPreviewRect.setAttribute('height', 0);
        drawPreviewRect.setAttribute('fill', obstacleType === 'road' ? 'url(#s08b-pattern-road)' : (obstacleType === 'rocky' ? 'url(#s08b-pattern-rocky)' : 'url(#s08b-pattern-nogo)'));
        drawPreviewRect.setAttribute('stroke', obstacleType === 'road' ? '#d97706' : (obstacleType === 'rocky' ? '#4b5563' : '#dc2626'));
        drawPreviewRect.setAttribute('stroke-width', 1.5);
        drawPreviewRect.setAttribute('stroke-dasharray', '4 4');
        gDrawing.appendChild(drawPreviewRect);
      }
    });

    svgEl.addEventListener('pointermove', function (e) {
      if (!isPointerDown) return;
      var pt = clientToSvg(e.clientX, e.clientY);
      var curX = Math.max(5, Math.min(995, pt.x));
      var curY = Math.max(5, Math.min(615, pt.y));

      if (mode === 'move' && draggingBuilding) {
        draggingBuilding.x = Math.round(curX);
        draggingBuilding.y = Math.round(curY);
        rebuildGraph();
      } else if (mode === 'draw' && drawPreviewRect && startPt) {
        var rx = Math.min(startPt.x, curX);
        var ry = Math.min(startPt.y, curY);
        var rw = Math.abs(curX - startPt.x);
        var rh = Math.abs(curY - startPt.y);
        drawPreviewRect.setAttribute('x', rx);
        drawPreviewRect.setAttribute('y', ry);
        drawPreviewRect.setAttribute('width', rw);
        drawPreviewRect.setAttribute('height', rh);
      }
    });

    function onPointerUp(e) {
      if (!isPointerDown) return;
      isPointerDown = false;

      if (mode === 'move' && draggingBuilding) {
        try { svgEl.releasePointerCapture(e.pointerId); } catch (_) {}
        draggingBuilding = null;
        pushHistory();
        saveToStorage();
      } else if (mode === 'draw' && drawPreviewRect && startPt) {
        try { svgEl.releasePointerCapture(e.pointerId); } catch (_) {}
        var pt = clientToSvg(e.clientX, e.clientY);
        var endX = Math.max(5, Math.min(995, pt.x));
        var endY = Math.max(5, Math.min(615, pt.y));

        var ox = Math.round(Math.min(startPt.x, endX));
        var oy = Math.round(Math.min(startPt.y, endY));
        var ow = Math.round(Math.abs(endX - startPt.x));
        var oh = Math.round(Math.abs(endY - startPt.y));

        if (ow >= 12 && oh >= 12) {
          pushHistory();
          var oId = 'obs' + Date.now().toString(36);
          var mult = (obstacleType === 'road' ? 2 : (obstacleType === 'rocky' ? 3 : Infinity));
          var lbl = (obstacleType === 'road' ? 'Road' : (obstacleType === 'rocky' ? 'Rocky ground' : 'No-go zone'));
          obstacles.push({
            id: oId,
            type: obstacleType,
            x: ox,
            y: oy,
            w: ow,
            h: oh,
            mult: mult,
            label: lbl
          });
          rebuildGraph();
        }

        if (drawPreviewRect.parentNode) {
          drawPreviewRect.parentNode.removeChild(drawPreviewRect);
        }
        drawPreviewRect = null;
        startPt = null;
      }
    }

    svgEl.addEventListener('pointerup', onPointerUp);
    svgEl.addEventListener('pointercancel', onPointerUp);

    // Double-click to rename building inline
    svgEl.addEventListener('dblclick', function (e) {
      var pt = clientToSvg(e.clientX, e.clientY);
      var b = findBuildingAt(pt.x, pt.y, 24);
      if (b) {
        var newName = prompt('Rename building:', b.name);
        if (newName && newName.trim()) {
          pushHistory();
          b.name = newName.trim();
          rebuildGraph();
        }
      }
    });
  }

  function setMode(newMode) {
    mode = newMode;
    var modeBtns = [elBtnPlace, elBtnMove, elBtnDelete, elBtnDraw];
    for (var i = 0; i < modeBtns.length; i++) {
      if (modeBtns[i]) {
        modeBtns[i].classList.toggle('active', modeBtns[i].getAttribute('data-mode') === newMode);
      }
    }
    if (elObsPicker) {
      elObsPicker.style.display = (mode === 'draw') ? 'flex' : 'none';
    }
  }

  function setObstacleType(newType) {
    obstacleType = newType;
    if (elBtnObsRoad) elBtnObsRoad.classList.toggle('active', newType === 'road');
    if (elBtnObsRocky) elBtnObsRocky.classList.toggle('active', newType === 'rocky');
    if (elBtnObsNogo) elBtnObsNogo.classList.toggle('active', newType === 'nogo');
  }

  function validateInput(inputEl, prevVal, minVal, maxVal) {
    var raw = parseFloat(inputEl.value);
    if (isNaN(raw) || raw < minVal || (maxVal !== undefined && raw > maxVal)) {
      inputEl.value = prevVal;
      inputEl.classList.add('flash-invalid');
      setTimeout(function () { inputEl.classList.remove('flash-invalid'); }, 400);
      return prevVal;
    }
    return raw;
  }

  NG.slides.s08b = {
    init: function (root) {
      elCanvasContainer = document.getElementById('s08b-canvas-container');

      elBtnPlace = document.getElementById('s08b-mode-place');
      elBtnMove = document.getElementById('s08b-mode-move');
      elBtnDelete = document.getElementById('s08b-mode-delete');
      elBtnDraw = document.getElementById('s08b-mode-draw');
      elObsPicker = document.getElementById('s08b-obs-picker');
      elBtnObsRoad = document.getElementById('s08b-obs-road');
      elBtnObsRocky = document.getElementById('s08b-obs-rocky');
      elBtnObsNogo = document.getElementById('s08b-obs-nogo');
      elBtnUndo = document.getElementById('s08b-btn-undo');
      elBtnClear = document.getElementById('s08b-btn-clear');
      elBtnSample = document.getElementById('s08b-btn-sample');
      elBtnToggleMesh = document.getElementById('s08b-btn-toggle-mesh');
      elWarning = document.getElementById('s08b-warning');

      elBtnBuild = document.getElementById('s08b-btn-build');
      elStepBtn = document.getElementById('s08b-btn-step');
      elBackBtn = document.getElementById('s08b-btn-back');
      elResetBtn = document.getElementById('s08b-btn-reset');
      elSpeedSlider = document.getElementById('s08b-speed-slider');
      elSpeedVal = document.getElementById('s08b-speed-val');
      elSimCaption = document.getElementById('s08b-sim-caption');
      elAlgoKruskal = document.getElementById('s08b-algo-kruskal');
      elAlgoPrim = document.getElementById('s08b-algo-prim');
      elPrimRootWrap = document.getElementById('s08b-prim-root-wrap');
      elPrimRootSel = document.getElementById('s08b-prim-root-sel');

      elInputWidth = document.getElementById('s08b-input-width');
      elInputRate = document.getElementById('s08b-input-rate');
      elScaleHint = document.getElementById('s08b-scale-hint');

      elStatN = document.getElementById('s08b-stat-n');
      elStatK = document.getElementById('s08b-stat-k');
      elStatNMinus1 = document.getElementById('s08b-stat-nminus1');
      elStatLength = document.getElementById('s08b-stat-length');
      elStatTotal = document.getElementById('s08b-stat-total');
      elStatMeshCost = document.getElementById('s08b-stat-mesh-cost');
      elStatSavings = document.getElementById('s08b-stat-savings');
      elCmpBox = document.getElementById('s08b-cmp-box');
      elStatCmpChip = document.getElementById('s08b-stat-cmp-chip');

      // Mode toggles
      if (elBtnPlace) elBtnPlace.addEventListener('click', function () { setMode('place'); });
      if (elBtnMove) elBtnMove.addEventListener('click', function () { setMode('move'); });
      if (elBtnDelete) elBtnDelete.addEventListener('click', function () { setMode('delete'); });
      if (elBtnDraw) elBtnDraw.addEventListener('click', function () { setMode('draw'); });

      if (elBtnObsRoad) elBtnObsRoad.addEventListener('click', function () { setObstacleType('road'); });
      if (elBtnObsRocky) elBtnObsRocky.addEventListener('click', function () { setObstacleType('rocky'); });
      if (elBtnObsNogo) elBtnObsNogo.addEventListener('click', function () { setObstacleType('nogo'); });

      // Action buttons
      if (elBtnUndo) {
        elBtnUndo.addEventListener('click', function () {
          if (historyStack.length > 0) {
            var prev = historyStack.pop();
            buildings = prev.buildings;
            obstacles = prev.obstacles;
            rebuildGraph();
          }
        });
      }

      if (elBtnClear) {
        elBtnClear.addEventListener('click', function () {
          pushHistory();
          buildings = [];
          obstacles = [];
          kruskalRan = false;
          primRan = false;
          try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
          rebuildGraph();
        });
      }

      if (elBtnSample) {
        elBtnSample.addEventListener('click', function () {
          pushHistory();
          buildings = JSON.parse(JSON.stringify(SAMPLE_BUILDINGS));
          obstacles = JSON.parse(JSON.stringify(SAMPLE_OBSTACLES));
          primRootId = 'b1';
          rebuildGraph();
        });
      }

      if (elBtnToggleMesh) {
        elBtnToggleMesh.addEventListener('click', function () {
          showMeshLinks = !showMeshLinks;
          elBtnToggleMesh.textContent = showMeshLinks ? 'Links: ON' : 'Links: OFF';
          elBtnToggleMesh.classList.toggle('btn-primary', showMeshLinks);
          renderStaticMap();
        });
      }

      // Algorithm switcher
      if (elAlgoKruskal) {
        elAlgoKruskal.addEventListener('click', function () {
          algo = 'kruskal';
          elAlgoKruskal.classList.add('active');
          if (elAlgoPrim) elAlgoPrim.classList.remove('active');
          if (elPrimRootWrap) elPrimRootWrap.style.display = 'none';
          rebuildGraph();
        });
      }

      if (elAlgoPrim) {
        elAlgoPrim.addEventListener('click', function () {
          algo = 'prim';
          elAlgoPrim.classList.add('active');
          if (elAlgoKruskal) elAlgoKruskal.classList.remove('active');
          if (elPrimRootWrap) elPrimRootWrap.style.display = 'flex';
          rebuildGraph();
        });
      }

      if (elPrimRootSel) {
        elPrimRootSel.addEventListener('change', function () {
          primRootId = elPrimRootSel.value;
          rebuildGraph();
        });
      }

      // Stepper controls
      if (elBtnBuild) {
        elBtnBuild.addEventListener('click', function () {
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
        var onSpeed = function () {
          var val = parseFloat(elSpeedSlider.value);
          if (elSpeedVal) elSpeedVal.textContent = val.toFixed(2).replace(/\.00$/, '') + 'x';
          if (stepper) stepper.setSpeed(val);
        };
        elSpeedSlider.addEventListener('input', onSpeed);
        elSpeedSlider.addEventListener('change', onSpeed);
      }

      // Parameters input validation
      if (elInputWidth) {
        elInputWidth.value = mapWidthMetres;
        elInputWidth.addEventListener('change', function () {
          var validated = validateInput(elInputWidth, mapWidthMetres, 10, 10000);
          if (validated !== mapWidthMetres) {
            mapWidthMetres = validated;
            if (elScaleHint) {
              var mpp = (mapWidthMetres / 1000).toFixed(2);
              elScaleHint.textContent = 'Scale: ' + mpp + ' m/px \u2022 Road \u00D72, Rocky \u00D73';
            }
            rebuildGraph();
          }
        });
      }

      if (elInputRate) {
        elInputRate.value = ratePerMetre;
        elInputRate.addEventListener('change', function () {
          var validated = validateInput(elInputRate, ratePerMetre, 1, 100000);
          if (validated !== ratePerMetre) {
            ratePerMetre = validated;
            rebuildGraph();
          }
        });
      }

      setupSVGCanvas();

      // Load state from localStorage or load sample campus by default
      var loaded = loadFromStorage();
      if (!loaded || buildings.length === 0) {
        buildings = JSON.parse(JSON.stringify(SAMPLE_BUILDINGS));
        obstacles = JSON.parse(JSON.stringify(SAMPLE_OBSTACLES));
        primRootId = 'b1';
      }

      if (elAlgoKruskal && elAlgoPrim) {
        elAlgoKruskal.classList.toggle('active', algo === 'kruskal');
        elAlgoPrim.classList.toggle('active', algo === 'prim');
        if (elPrimRootWrap) elPrimRootWrap.style.display = (algo === 'prim') ? 'flex' : 'none';
      }

      if (elBtnToggleMesh) {
        elBtnToggleMesh.textContent = showMeshLinks ? 'Links: ON' : 'Links: OFF';
        elBtnToggleMesh.classList.toggle('btn-primary', showMeshLinks);
      }

      rebuildGraph();
    },

    pause: function () {
      if (stepper) {
        stepper.pause();
        updatePlayButton();
      }
      clearTimeout(rejectTimeout);
    },

    resume: function () {
      // Kept paused unless user presses Build
    },

    destroy: function () {
      if (stepper) stepper.pause();
      clearTimeout(rejectTimeout);
    },

    // Public test hooks
    getGraph: function () { return graph; },
    getStepper: function () { return stepper; },
    getBuildings: function () { return buildings; },
    getObstacles: function () { return obstacles; },
    rebuild: function () { rebuildGraph(); },
    loadSample: function () {
      if (!svgEl) {
        var rootEl = document.getElementById('s08b');
        if (rootEl) NG.slides.s08b.init(rootEl);
      }
      buildings = JSON.parse(JSON.stringify(SAMPLE_BUILDINGS));
      obstacles = JSON.parse(JSON.stringify(SAMPLE_OBSTACLES));
      primRootId = 'b1';
      rebuildGraph();
    }
  };

})();
