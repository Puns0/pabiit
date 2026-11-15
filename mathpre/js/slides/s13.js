/**
 * js/slides/s13.js
 * Spanning Tree Protocol (IEEE 802.1D) Interactive Simulation.
 *
 * Plain-words redesign for first-year students:
 * - 3 Acts: [1 The problem] [2 The fix] [3 A link breaks]
 * - Vocabulary: boss switch (root bridge), hello messages (BPDUs),
 *   switched off (blocked), working link (forwarding)
 * - Zero jargon words outside the Technical details drawer.
 * - Inline 'Choose the boss switch' card.
 * - Technical details drawer with bridge table and live protocol log.
 * - Exact resolved hex styling for SVG elements (never "var()" in presentation attributes).
 */

(function () {
  'use strict';

  window.NG = window.NG || {};
  window.NG.slides = window.NG.slides || {};

  var SVG_NS = 'http://www.w3.org/2000/svg';

  // Resolved palette constants
  var COLOR_INK = '#1C1A16';
  var COLOR_PAPER3 = '#FBF6E9';
  var COLOR_PAPER2 = '#EBE1CA';
  var COLOR_MUTED = '#706A5E';
  var COLOR_GRID = '#D0C9B6';
  var COLOR_VERMILION = '#D9531E';
  var COLOR_ALARM = '#B80F2A';
  var COLOR_MUSTARD = '#D49A00';
  var COLOR_GREEN = '#178A86';
  var COLOR_WHITE = '#FFFFFF';

  var s13 = {
    _initialized: false,
    _activeTimers: [],
    _animFrameIds: [],
    _rootEl: null,
    _boundKeyHandler: null,

    // Simulation model state
    switches: [],
    links: [],
    switchMap: {},
    linkMap: {},
    linkGeom: {},

    currentAct: 1,
    currentSentence: 0,
    isStpOn: false,
    selectedSwitch: null,
    isCutMode: false,
    speedMult: 1.0,
    isStormRunning: false,

    flooder: null,
    sim: null,

    // DOM References
    dom: {},

    _addTimer: function (fn, ms) {
      var self = this;
      var id = setTimeout(function () {
        var idx = self._activeTimers.indexOf(id);
        if (idx !== -1) self._activeTimers.splice(idx, 1);
        fn();
      }, ms);
      self._activeTimers.push(id);
      return id;
    },

    _addInterval: function (fn, ms) {
      var self = this;
      var id = setInterval(fn, ms);
      self._activeTimers.push(id);
      return id;
    },

    _clearTimers: function () {
      var self = this;
      for (var i = 0; i < self._activeTimers.length; i++) {
        clearTimeout(self._activeTimers[i]);
        clearInterval(self._activeTimers[i]);
      }
      self._activeTimers = [];
      for (var j = 0; j < self._animFrameIds.length; j++) {
        cancelAnimationFrame(self._animFrameIds[j]);
      }
      self._animFrameIds = [];
    },

    _addRaf: function (fn) {
      var self = this;
      var id = requestAnimationFrame(function (t) {
        var idx = self._animFrameIds.indexOf(id);
        if (idx !== -1) self._animFrameIds.splice(idx, 1);
        fn(t);
      });
      self._animFrameIds.push(id);
      return id;
    },

    init: function (container) {
      var self = this;
      var root = container || document.getElementById('s13');
      if (!root) return;
      self._rootEl = root;

      // Cache DOM references
      self.dom = {
        root: root,
        tabAct1: root.querySelector('#s13-tab-act1'),
        tabAct2: root.querySelector('#s13-tab-act2'),
        tabAct3: root.querySelector('#s13-tab-act3'),
        headline: root.querySelector('#s13-headline'),
        pastSentences: root.querySelector('#s13-past-sentences'),
        currentSentence: root.querySelector('#s13-current-sentence'),
        mathCard: root.querySelector('#s13-math-card'),
        btnBack: root.querySelector('#s13-btn-back'),
        btnNext: root.querySelector('#s13-btn-next'),
        btnReplay: root.querySelector('#s13-btn-replay'),
        progressDots: root.querySelector('#s13-progress-dots'),
        btnDetails: root.querySelector('#s13-btn-details'),

        actBadge: root.querySelector('#s13-act-badge'),
        narratorLine: root.querySelector('#s13-narrator-line'),
        cntFlight: root.querySelector('#s13-cnt-flight'),
        cntDelivered: root.querySelector('#s13-cnt-delivered'),

        canvasWrap: root.querySelector('#s13-canvas-wrap'),
        svg: root.querySelector('#s13-svg'),
        stormStamp: root.querySelector('#s13-storm-stamp'),
        btnStormReplay: root.querySelector('#s13-btn-storm-replay'),

        btnSendFrame: root.querySelector('#s13-btn-send-frame'),
        btnTurnStpOn: root.querySelector('#s13-btn-turn-stp-on'),
        btnChooseBoss: root.querySelector('#s13-btn-choose-boss'),
        btnRepairLink: root.querySelector('#s13-btn-repair-link'),
        btnReset: root.querySelector('#s13-btn-scene-reset'),

        advancedControls: root.querySelector('#s13-advanced-controls'),
        btnStepBpdu: root.querySelector('#s13-btn-step-bpdu'),
        btnAuto: root.querySelector('#s13-btn-auto'),
        speedSlider: root.querySelector('#s13-speed'),
        speedVal: root.querySelector('#s13-speed-val'),

        chooseBossCard: root.querySelector('#s13-choose-boss-card'),
        bossTitle: root.querySelector('#s13-boss-title'),
        bossClose: root.querySelector('#s13-boss-close'),
        bossPrompt: root.querySelector('#s13-boss-prompt'),
        bossActions: root.querySelector('#s13-boss-actions'),
        btnMakeBoss: root.querySelector('#s13-btn-make-boss'),
        btnBossDefault: root.querySelector('#s13-btn-boss-default'),
        priMono: root.querySelector('#s13-pri-mono'),

        detailsDrawer: root.querySelector('#s13-details-drawer'),
        btnCloseDetails: root.querySelector('#s13-btn-close-details'),
        bridgeTbody: root.querySelector('#s13-bridge-tbody'),
        logBox: root.querySelector('#s13-log-box')
      };

      // Model Initialization
      self._initModel();
      self._buildSvgScene();
      self._bindEvents();

      // Start at Act 1, Sentence 0
      self.switchAct(1);

      self._initialized = true;
    },

    _initModel: function () {
      var self = this;
      var topo = NG.STP.defaultTopology();
      self.switches = topo.switches;
      self.links = topo.links;
      self.switchMap = {};
      self.linkMap = {};

      for (var i = 0; i < self.switches.length; i++) {
        self.switchMap[self.switches[i].id] = self.switches[i];
      }
      for (var j = 0; j < self.links.length; j++) {
        self.linkMap[self.links[j].id] = self.links[j];
      }

      self.sim = new NG.STP.BPDUSimulator(self.switches, self.links);
      self.flooder = new NG.STP.FrameFlooding(self.switches, self.links, Object.keys(self.linkMap));
    },

    _buildSvgScene: function () {
      var self = this;
      var svg = self.dom.svg;
      if (!svg) return;
      svg.innerHTML = '';

      // Defs
      var defs = document.createElementNS(SVG_NS, 'defs');
      defs.innerHTML =
        '<filter id="s13-glow" x="-50%" y="-50%" width="200%" height="200%">' +
          '<feGaussianBlur stdDeviation="3" result="blur"/>' +
          '<feMerge>' +
            '<feMergeNode in="blur"/>' +
            '<feMergeNode in="SourceGraphic"/>' +
          '</feMerge>' +
        '</filter>';
      svg.appendChild(defs);

      // SVG Groups in stacking order
      self.svgGroups = {
        hostCable: document.createElementNS(SVG_NS, 'g'),
        links: document.createElementNS(SVG_NS, 'g'),
        blockedEnds: document.createElementNS(SVG_NS, 'g'),
        cutCrosses: document.createElementNS(SVG_NS, 'g'),
        transitionPills: document.createElementNS(SVG_NS, 'g'),
        costPills: document.createElementNS(SVG_NS, 'g'),
        particles: document.createElementNS(SVG_NS, 'g'),
        nodes: document.createElementNS(SVG_NS, 'g'),
        host: document.createElementNS(SVG_NS, 'g')
      };

      for (var gKey in self.svgGroups) {
        svg.appendChild(self.svgGroups[gKey]);
      }

      // Draw Host
      var hostX = 100, hostY = 75;
      var hostG = self.svgGroups.host;
      hostG.setAttribute('class', 's13-host-node');

      // Cable to S1 (220, 110)
      var hostCable = document.createElementNS(SVG_NS, 'line');
      hostCable.setAttribute('x1', hostX);
      hostCable.setAttribute('y1', hostY);
      hostCable.setAttribute('x2', 220);
      hostCable.setAttribute('y2', 110);
      hostCable.setAttribute('stroke', COLOR_MUTED);
      hostCable.setAttribute('stroke-width', '2');
      hostCable.setAttribute('stroke-dasharray', '3,3');
      self.svgGroups.hostCable.appendChild(hostCable);

      hostG.innerHTML =
        '<rect x="' + (hostX - 22) + '" y="' + (hostY - 18) + '" width="44" height="32" rx="4" fill="' + COLOR_PAPER3 + '" stroke="' + COLOR_INK + '" stroke-width="2"/>' +
        '<rect x="' + (hostX - 18) + '" y="' + (hostY - 14) + '" width="36" height="20" rx="2" fill="' + COLOR_PAPER2 + '" stroke="' + COLOR_MUTED + '" stroke-width="1"/>' +
        '<polygon points="' + (hostX - 6) + ',' + (hostY + 14) + ' ' + (hostX + 6) + ',' + (hostY + 14) + ' ' + (hostX + 10) + ',' + (hostY + 20) + ' ' + (hostX - 10) + ',' + (hostY + 20) + '" fill="' + COLOR_INK + '"/>' +
        '<text x="' + hostX + '" y="' + (hostY + 34) + '" text-anchor="middle" font-family="var(--font-mono)" font-size="10" font-weight="700" fill="' + COLOR_INK + '">Host (Sender)</text>';

      // Draw Links
      self.edgeEls = {};
      self.cutCrossEls = {};
      self.transitionEls = {};
      self.blockedPortEls = {};
      self.linkGeom = {};

      self.links.forEach(function (l) {
        var swA = self.switchMap[l.a];
        var swB = self.switchMap[l.b];
        var dx = swB.x - swA.x;
        var dy = swB.y - swA.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var ux = dx / dist;
        var uy = dy / dist;

        var mx = (swA.x + swB.x) / 2;
        var my = (swA.y + swB.y) / 2;
        if (l.id === 'L14') {
          mx -= uy * 22;
          my += ux * 22;
        } else if (l.id === 'L25') {
          mx += uy * 22;
          my -= ux * 22;
        }

        var portDist = 36;
        var pAx = swA.x + ux * portDist;
        var pAy = swA.y + uy * portDist;
        var pBx = swB.x - ux * portDist;
        var pBy = swB.y - uy * portDist;

        self.linkGeom[l.id] = {
          swA: swA,
          swB: swB,
          dx: dx,
          dy: dy,
          dist: dist,
          ux: ux,
          uy: uy,
          mx: mx,
          my: my,
          pAx: pAx,
          pAy: pAy,
          pBx: pBx,
          pBy: pBy
        };

        // Edge line: starts as solid ink (#1C1A16), 3px
        var line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', swA.x);
        line.setAttribute('y1', swA.y);
        line.setAttribute('x2', swB.x);
        line.setAttribute('y2', swB.y);
        line.setAttribute('stroke', COLOR_INK);
        line.setAttribute('stroke-width', '3');
        line.setAttribute('class', 's13-edge active');
        line.setAttribute('data-link', l.id);
        self.svgGroups.links.appendChild(line);
        self.edgeEls[l.id] = line;

        line.addEventListener('click', function () {
          if (self.currentAct === 3) {
            self.cutLink(l.id);
          }
        });

        // Midpoint Cost Pill
        var pillG = document.createElementNS(SVG_NS, 'g');
        pillG.setAttribute('class', 's13-weight-pill-g');
        pillG.innerHTML =
          '<rect x="' + (mx - 15) + '" y="' + (my - 10) + '" width="30" height="20" rx="10" fill="' + COLOR_PAPER3 + '" stroke="' + COLOR_INK + '" stroke-width="1.5"/>' +
          '<text x="' + mx + '" y="' + (my + 4) + '" text-anchor="middle" font-family="var(--font-mono)" font-size="11" font-weight="700" fill="' + COLOR_INK + '">' + l.cost + '</text>';
        self.svgGroups.costPills.appendChild(pillG);

        pillG.addEventListener('click', function () {
          if (self.currentAct === 3) {
            self.cutLink(l.id);
          }
        });

        // Midpoint Cut Cross (alarm red circle with X)
        var crossG = document.createElementNS(SVG_NS, 'g');
        crossG.setAttribute('class', 's13-cut-cross');
        crossG.style.display = 'none';
        crossG.innerHTML =
          '<circle cx="' + mx + '" cy="' + my + '" r="14" fill="' + COLOR_WHITE + '" stroke="' + COLOR_ALARM + '" stroke-width="2"/>' +
          '<path d="M ' + (mx - 6) + ' ' + (my - 6) + ' L ' + (mx + 6) + ' ' + (my + 6) + ' M ' + (mx + 6) + ' ' + (my - 6) + ' L ' + (mx - 6) + ' ' + (my + 6) + '" stroke="' + COLOR_ALARM + '" stroke-width="3" stroke-linecap="round"/>';
        self.svgGroups.cutCrosses.appendChild(crossG);
        self.cutCrossEls[l.id] = crossG;

        // Transition indicator pill on link
        var transG = document.createElementNS(SVG_NS, 'g');
        transG.style.display = 'none';
        transG.innerHTML =
          '<rect x="' + (mx - 75) + '" y="' + (my - 24) + '" width="150" height="20" rx="5" fill="#fff3cd" stroke="#856404" stroke-width="1.5"/>' +
          '<text x="' + mx + '" y="' + (my - 10) + '" text-anchor="middle" font-family="var(--font-mono)" font-size="9" font-weight="700" fill="#856404">waking up: listening</text>';
        self.svgGroups.transitionPills.appendChild(transG);
        self.transitionEls[l.id] = transG;

        // Blocked Port markers (alarm-red perpendicular bar and small cross)
        function createBlockedMarker(px, py, dirUx, dirUy) {
          var nx = -dirUy;
          var ny = dirUx;
          var g = document.createElementNS(SVG_NS, 'g');
          g.style.display = 'none';
          g.innerHTML =
            '<line x1="' + (px - nx * 8) + '" y1="' + (py - ny * 8) + '" x2="' + (px + nx * 8) + '" y2="' + (py + ny * 8) + '" stroke="' + COLOR_ALARM + '" stroke-width="3.5" stroke-linecap="round"/>' +
            '<path d="M ' + (px - 3) + ' ' + (py - 3) + ' L ' + (px + 3) + ' ' + (py + 3) + ' M ' + (px + 3) + ' ' + (py - 3) + ' L ' + (px - 3) + ' ' + (py + 3) + '" stroke="' + COLOR_ALARM + '" stroke-width="1.8" stroke-linecap="round"/>';
          self.svgGroups.blockedEnds.appendChild(g);
          return g;
        }

        self.blockedPortEls[l.id + ':' + l.a] = createBlockedMarker(pAx, pAy, ux, uy);
        self.blockedPortEls[l.id + ':' + l.b] = createBlockedMarker(pBx, pBy, -ux, -uy);
      });

      // Draw Switches
      self.nodeEls = {};
      self.nodeCircleEls = {};
      self.crownEls = {};
      self.readoutPillEls = {};
      self.readoutTextEls = {};
      self.priTextEls = {};

      self.switches.forEach(function (s) {
        var nodeG = document.createElementNS(SVG_NS, 'g');
        nodeG.setAttribute('class', 's13-node');
        nodeG.setAttribute('data-id', s.id);
        self.nodeEls[s.id] = nodeG;

        // Circle: fill = paper-3 (#FBF6E9), stroke = ink (#1C1A16) 2.5px
        var circle = document.createElementNS(SVG_NS, 'circle');
        circle.setAttribute('cx', s.x);
        circle.setAttribute('cy', s.y);
        circle.setAttribute('r', '26');
        circle.setAttribute('fill', COLOR_PAPER3);
        circle.setAttribute('stroke', COLOR_INK);
        circle.setAttribute('stroke-width', '2.5');
        circle.setAttribute('class', 's13-node-circle');
        nodeG.appendChild(circle);
        self.nodeCircleEls[s.id] = circle;

        // Switch Arrows Icon
        var iconG = document.createElementNS(SVG_NS, 'g');
        iconG.innerHTML =
          '<path d="M ' + (s.x - 12) + ' ' + (s.y - 4) + ' L ' + (s.x + 8) + ' ' + (s.y - 4) + ' M ' + (s.x + 4) + ' ' + (s.y - 8) + ' L ' + (s.x + 8) + ' ' + (s.y - 4) + ' L ' + (s.x + 4) + ' ' + s.y + '" stroke="' + COLOR_INK + '" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="M ' + (s.x + 12) + ' ' + (s.y + 6) + ' L ' + (s.x - 8) + ' ' + (s.y + 6) + ' M ' + (s.x - 4) + ' ' + (s.y + 2) + ' L ' + (s.x - 8) + ' ' + (s.y + 6) + ' L ' + (s.x - 4) + ' ' + (s.y + 10) + '" stroke="' + COLOR_INK + '" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';
        nodeG.appendChild(iconG);

        // Switch Label (contrast > 15:1 against paper-3)
        var lbl = document.createElementNS(SVG_NS, 'text');
        lbl.setAttribute('x', s.x);
        lbl.setAttribute('y', s.y + 20);
        lbl.setAttribute('text-anchor', 'middle');
        lbl.setAttribute('font-family', 'var(--font-mono)');
        lbl.setAttribute('font-size', '11');
        lbl.setAttribute('font-weight', '700');
        lbl.setAttribute('fill', COLOR_INK);
        lbl.textContent = s.id;
        nodeG.appendChild(lbl);

        // Priority text
        var priText = document.createElementNS(SVG_NS, 'text');
        priText.setAttribute('x', s.x);
        priText.setAttribute('y', s.y - 12);
        priText.setAttribute('text-anchor', 'middle');
        priText.setAttribute('font-family', 'var(--font-mono)');
        priText.setAttribute('font-size', '8.5');
        priText.setAttribute('font-weight', '600');
        priText.setAttribute('fill', COLOR_INK);
        priText.textContent = s.priority;
        nodeG.appendChild(priText);
        self.priTextEls[s.id] = priText;

        // Boss Crown (gold polygon with vermilion gem)
        var crownG = document.createElementNS(SVG_NS, 'g');
        crownG.setAttribute('class', 's13-crown');
        crownG.style.display = 'none';
        crownG.innerHTML =
          '<polygon points="' + (s.x - 14) + ',' + (s.y - 32) + ' ' + (s.x - 18) + ',' + (s.y - 44) + ' ' + (s.x - 6) + ',' + (s.y - 37) + ' ' + s.x + ',' + (s.y - 48) + ' ' + (s.x + 6) + ',' + (s.y - 37) + ' ' + (s.x + 18) + ',' + (s.y - 44) + ' ' + (s.x + 14) + ',' + (s.y - 32) + '" fill="' + COLOR_MUSTARD + '" stroke="' + COLOR_INK + '" stroke-width="1.5" stroke-linejoin="round"/>' +
          '<circle cx="' + s.x + '" cy="' + (s.y - 38) + '" r="2.5" fill="' + COLOR_VERMILION + '"/>';
        self.svgGroups.nodes.appendChild(crownG);
        self.crownEls[s.id] = crownG;

        // Readout Pill below switch
        var rPillG = document.createElementNS(SVG_NS, 'g');
        rPillG.setAttribute('class', 's13-readout-pill');
        rPillG.style.display = 'none';
        rPillG.innerHTML =
          '<rect x="' + (s.x - 44) + '" y="' + (s.y + 30) + '" width="88" height="18" rx="4" fill="' + COLOR_PAPER3 + '" stroke="' + COLOR_INK + '" stroke-width="1.2"/>' +
          '<text x="' + s.x + '" y="' + (s.y + 42) + '" text-anchor="middle" font-family="var(--font-mono)" font-size="9" font-weight="700" fill="' + COLOR_INK + '">cost to boss: 0</text>';
        self.svgGroups.nodes.appendChild(rPillG);
        self.readoutPillEls[s.id] = rPillG;
        self.readoutTextEls[s.id] = rPillG.querySelector('text');

        // Click handler on switch -> Choose Boss
        nodeG.addEventListener('click', function () {
          if (self.isStpOn && (self.currentAct === 2 || self.currentAct === 3)) {
            self._selectSwitchForBoss(s.id);
          }
        });

        self.svgGroups.nodes.appendChild(nodeG);
      });
    },

    _bindEvents: function () {
      var self = this;
      var d = self.dom;

      // Act tab buttons
      d.tabAct1.addEventListener('click', function () { self.switchAct(1); });
      d.tabAct2.addEventListener('click', function () { self.switchAct(2); });
      d.tabAct3.addEventListener('click', function () { self.switchAct(3); });

      // Stepper
      d.btnBack.addEventListener('click', function () { self.prevSentence(); });
      d.btnNext.addEventListener('click', function () { self.nextSentence(); });
      d.btnReplay.addEventListener('click', function () { self.switchAct(self.currentAct); });

      // Action buttons
      d.btnSendFrame.addEventListener('click', function () { self.sendFrame(); });
      d.btnTurnStpOn.addEventListener('click', function () { self.turnStpOn(); });
      d.btnChooseBoss.addEventListener('click', function () { self._toggleChooseBossCard(); });
      d.btnRepairLink.addEventListener('click', function () { self.repairLink(); });
      d.btnReset.addEventListener('click', function () { self.resetSimulation(); });
      d.btnStormReplay.addEventListener('click', function () { self.switchAct(1); });

      // Speed slider
      d.speedSlider.addEventListener('input', function () {
        self.speedMult = parseFloat(d.speedSlider.value) || 1.0;
        d.speedVal.textContent = self.speedMult.toFixed(2) + 'x';
      });

      // Boss card actions
      d.bossClose.addEventListener('click', function () { self._closeChooseBossCard(); });
      d.btnMakeBoss.addEventListener('click', function () {
        if (self.selectedSwitch) {
          self.setBoss(self.selectedSwitch.id, 4096);
        }
      });
      d.btnBossDefault.addEventListener('click', function () {
        if (self.selectedSwitch) {
          self.setBoss(self.selectedSwitch.id, 32768);
        }
      });

      // Drawer
      d.btnDetails.addEventListener('click', function () { self.openDrawer(); });
      d.btnCloseDetails.addEventListener('click', function () { self.closeDrawer(); });
      d.detailsDrawer.addEventListener('click', function (e) {
        if (e.target === d.detailsDrawer) self.closeDrawer();
      });

      // Global keyboard handler
      self._boundKeyHandler = function (e) {
        if (!self._rootEl || !self._rootEl.classList.contains('in-view')) return;

        // If an input is focused, don't intercept
        var activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return;

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          e.stopPropagation();
          self.nextSentence();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          e.stopPropagation();
          self.prevSentence();
        } else if (e.key === 'Escape') {
          if (d.detailsDrawer.classList.contains('open')) {
            e.preventDefault();
            self.closeDrawer();
          } else if (d.chooseBossCard.style.display !== 'none') {
            e.preventDefault();
            self._closeChooseBossCard();
          }
        }
      };
      window.addEventListener('keydown', self._boundKeyHandler, true);
    },

    /* ================================================================
       ACTS & STORY FLOW
       ================================================================ */

    _getActData: function (actNum) {
      var self = this;
      var analytic = NG.STP.computeAnalytic(self.switches, self.links);
      var numSwitches = self.switches.length;
      var numActive = analytic.activeLinks.length;

      if (actNum === 1) {
        return {
          act: 1,
          badge: 'Act 1: The Problem',
          headline: 'Loops make network traffic multiply.',
          sentences: [
            'A switch copies every message it gets onto all its other cables.',
            'If the cables form a loop, the copies chase each other round and round.',
            'Ethernet frames have no hop limit, so nothing stops them. Press Send.'
          ]
        };
      } else if (actNum === 2) {
        return {
          act: 2,
          badge: 'Act 2: The Fix',
          headline: 'Pick one tree. Switch off the rest.',
          sentences: [
            'Every switch announces: I am the boss (root bridge). These announcements are hello messages (BPDUs).',
            'They compare IDs. The lowest ID wins, so S1 becomes the boss switch.',
            'Every other switch keeps its cheapest path towards the boss and switches off (blocks) every other link.',
            'What is left: ' + numSwitches + ' switches, ' + numActive + ' working links, no loops. That is a spanning tree.'
          ]
        };
      } else {
        return {
          act: 3,
          badge: 'Act 3: A Link Breaks',
          headline: 'A switched-off link wakes up.',
          sentences: [
            'Here is the network after STP has settled.',
            'Click any working link to cut it.',
            'The switches notice, hold a new election, and wake a switched-off link.'
          ]
        };
      }
    },

    switchAct: function (actNum) {
      var self = this;
      self._clearTimers();
      self.isStormRunning = false;
      self.currentAct = actNum;
      self.currentSentence = 0;
      self._closeChooseBossCard();

      var d = self.dom;
      d.tabAct1.classList.toggle('active', actNum === 1);
      d.tabAct2.classList.toggle('active', actNum === 2);
      d.tabAct3.classList.toggle('active', actNum === 3);
      d.tabAct1.setAttribute('aria-selected', actNum === 1 ? 'true' : 'false');
      d.tabAct2.setAttribute('aria-selected', actNum === 2 ? 'true' : 'false');
      d.tabAct3.setAttribute('aria-selected', actNum === 3 ? 'true' : 'false');

      // Reset topology to un-failed defaults & clear all inline edge styles
      self.links.forEach(function (l) {
        l.failed = false;
        var edge = self.edgeEls[l.id];
        if (edge) {
          edge.style.stroke = '';
          edge.style.strokeWidth = '';
          edge.classList.remove('loop-highlight', 'cut-hover', 'failed');
        }
      });
      self.switches.forEach(function (s) {
        s.priority = 32768;
        if (self.priTextEls[s.id]) {
          self.priTextEls[s.id].textContent = '32768';
          self.priTextEls[s.id].setAttribute('fill', COLOR_INK);
        }
        if (self.nodeCircleEls[s.id]) {
          self.nodeCircleEls[s.id].classList.remove('root', 'selected', 'lit');
          self.nodeCircleEls[s.id].setAttribute('fill', COLOR_PAPER3);
          self.nodeCircleEls[s.id].setAttribute('stroke', COLOR_INK);
          self.nodeCircleEls[s.id].setAttribute('stroke-width', '2.5');
        }
        if (self.readoutPillEls[s.id]) {
          var rect = self.readoutPillEls[s.id].querySelector('rect');
          if (rect) {
            rect.setAttribute('fill', COLOR_PAPER3);
            rect.setAttribute('stroke', COLOR_INK);
          }
          if (self.readoutTextEls[s.id]) {
            self.readoutTextEls[s.id].setAttribute('fill', COLOR_INK);
          }
        }
      });

      // Clear particles, storm stamps
      self.svgGroups.particles.innerHTML = '';
      d.stormStamp.style.display = 'none';
      d.cntFlight.classList.remove('storm');
      d.cntFlight.textContent = '0';
      d.cntDelivered.textContent = '0';

      // Act setup
      if (actNum === 1) {
        self.isStpOn = false;
        d.mathCard.style.display = 'none';
        d.btnTurnStpOn.style.display = 'none';
        d.btnChooseBoss.style.display = 'none';
        d.btnRepairLink.style.display = 'none';
        d.btnSendFrame.style.display = 'inline-flex';
        d.btnSendFrame.disabled = true;
        d.btnSendFrame.classList.remove('pulse');
        self._updateTopologyVisuals();
      } else if (actNum === 2) {
        self.isStpOn = false; // Starts waiting for STP election
        d.mathCard.style.display = 'block';
        d.btnTurnStpOn.style.display = 'inline-flex';
        d.btnChooseBoss.style.display = 'none';
        d.btnRepairLink.style.display = 'none';
        d.btnSendFrame.style.display = 'none';
        self._updateTopologyVisuals();
      } else if (actNum === 3) {
        self.isStpOn = true;
        d.mathCard.style.display = 'none';
        d.btnTurnStpOn.style.display = 'none';
        d.btnChooseBoss.style.display = 'inline-flex';
        d.btnRepairLink.style.display = 'none';
        d.btnSendFrame.style.display = 'none';
        self._updateTopologyVisuals();
      }

      self._renderSentence();
      self.updateBridgeTable();
    },

    nextSentence: function () {
      var self = this;
      var actData = self._getActData(self.currentAct);
      if (self.currentSentence < actData.sentences.length - 1) {
        self.currentSentence++;
        self._renderSentence();
        self._applySentenceState();
      }
    },

    prevSentence: function () {
      var self = this;
      if (self.currentSentence > 0) {
        self.currentSentence--;
        self._renderSentence();
        self._applySentenceState();
      }
    },

    _renderSentence: function () {
      var self = this;
      var d = self.dom;
      var actData = self._getActData(self.currentAct);

      d.actBadge.textContent = actData.badge;
      d.headline.textContent = actData.headline;

      // Past sentences
      d.pastSentences.innerHTML = '';
      for (var i = 0; i < self.currentSentence; i++) {
        var pItem = document.createElement('div');
        pItem.className = 's13-past-sentence-item';
        pItem.textContent = actData.sentences[i];
        d.pastSentences.appendChild(pItem);
      }

      // Current sentence
      d.currentSentence.textContent = actData.sentences[self.currentSentence];

      // Stepper buttons state
      d.btnBack.disabled = (self.currentSentence === 0);
      d.btnNext.disabled = (self.currentSentence === actData.sentences.length - 1);

      // Progress dots
      d.progressDots.innerHTML = '';
      for (var j = 0; j < actData.sentences.length; j++) {
        var dot = document.createElement('span');
        dot.className = 's13-dot' + (j === self.currentSentence ? ' active' : j < self.currentSentence ? ' completed' : '');
        dot.setAttribute('data-idx', j);
        (function (idx) {
          dot.addEventListener('click', function () {
            self.currentSentence = idx;
            self._renderSentence();
            self._applySentenceState();
          });
        })(j);
        d.progressDots.appendChild(dot);
      }

      self._applySentenceState();
    },

    _applySentenceState: function () {
      var self = this;
      var d = self.dom;
      var act = self.currentAct;
      var sIdx = self.currentSentence;

      // Clear any temporary edge classes & inline styles
      for (var lId in self.edgeEls) {
        self.edgeEls[lId].classList.remove('loop-highlight', 'cut-hover');
      }

      if (act === 1) {
        d.mathCard.style.display = 'none';
        d.btnTurnStpOn.style.display = 'none';
        d.btnChooseBoss.style.display = 'none';
        d.btnRepairLink.style.display = 'none';
        d.btnSendFrame.style.display = 'inline-flex';

        if (sIdx === 0) {
          d.btnSendFrame.disabled = true;
          d.btnSendFrame.classList.remove('pulse');
          d.narratorLine.textContent = 'Ready. Switches copy incoming messages out of all cables.';
          self.links.forEach(function (l) {
            var edge = self.edgeEls[l.id];
            if (edge) {
              edge.style.stroke = '';
              edge.style.strokeWidth = '';
            }
          });
        } else if (sIdx === 1) {
          d.btnSendFrame.disabled = true;
          d.btnSendFrame.classList.remove('pulse');
          d.narratorLine.textContent = 'Ring loop detected. Packets will circulate endlessly.';
          // Highlight outer ring loop: L12, L23, L34, L45, L56, L61
          ['L12', 'L23', 'L34', 'L45', 'L56', 'L61'].forEach(function (id) {
            if (self.edgeEls[id]) self.edgeEls[id].classList.add('loop-highlight');
          });
        } else if (sIdx === 2) {
          d.btnSendFrame.disabled = false;
          d.btnSendFrame.classList.add('pulse');
          d.narratorLine.textContent = 'Press \'Send one frame\' to start flooding.';
        }
      } else if (act === 2) {
        d.mathCard.style.display = 'block';

        if (sIdx === 0) {
          d.btnTurnStpOn.style.display = 'inline-flex';
          d.btnSendFrame.style.display = 'none';
          d.btnChooseBoss.style.display = 'none';
          d.narratorLine.textContent = 'Press \'Turn STP on\' to start the boss election.';
        } else if (sIdx === 1) {
          if (!self.isStpOn) self.turnStpOn();
          d.btnTurnStpOn.style.display = 'none';
          d.btnChooseBoss.style.display = 'inline-flex';
          d.btnSendFrame.style.display = 'none';
          d.narratorLine.textContent = 'Lowest ID wins election. S1 is the boss switch.';
        } else if (sIdx === 2) {
          if (!self.isStpOn) self.turnStpOn();
          d.btnTurnStpOn.style.display = 'none';
          d.btnChooseBoss.style.display = 'inline-flex';
          d.btnSendFrame.style.display = 'none';
          d.narratorLine.textContent = 'Redundant links switched off. Loops broken.';
        } else if (sIdx === 3) {
          if (!self.isStpOn) self.turnStpOn();
          d.btnTurnStpOn.style.display = 'none';
          d.btnChooseBoss.style.display = 'inline-flex';
          d.btnSendFrame.style.display = 'inline-flex';
          d.btnSendFrame.disabled = false;
          d.btnSendFrame.classList.remove('pulse');
          var analytic = NG.STP.computeAnalytic(self.switches, self.links);
          d.narratorLine.textContent = 'Spanning tree formed. ' + analytic.activeLinks.length + ' working links, ' + (self.links.length - analytic.activeLinks.length) + ' switched off.';
        }
      } else if (act === 3) {
        d.mathCard.style.display = 'none';
        d.btnTurnStpOn.style.display = 'none';
        d.btnChooseBoss.style.display = 'inline-flex';
        d.btnSendFrame.style.display = 'none';

        var hasFailed = self.links.some(function (l) { return l.failed; });
        d.btnRepairLink.style.display = hasFailed ? 'inline-flex' : 'none';

        if (sIdx === 0) {
          d.narratorLine.textContent = 'Network converged and running normally.';
        } else if (sIdx === 1) {
          d.narratorLine.textContent = 'Click any working link to simulate cable failure.';
          // Add hover cue to active links
          var curAnalytic = NG.STP.computeAnalytic(self.switches, self.links);
          curAnalytic.activeLinks.forEach(function (lId) {
            if (self.edgeEls[lId]) self.edgeEls[lId].classList.add('cut-hover');
          });
        } else if (sIdx === 2) {
          d.narratorLine.textContent = hasFailed ? 'Backup link woken up. Connectivity preserved.' : 'Click any working link to cut it.';
          var ana = NG.STP.computeAnalytic(self.switches, self.links);
          ana.activeLinks.forEach(function (lId) {
            if (self.edgeEls[lId]) self.edgeEls[lId].classList.add('cut-hover');
          });
        }
      }
    },

    /* ================================================================
       TOPOLOGY VISUAL RENDERING
       ================================================================ */

    _updateTopologyVisuals: function () {
      var self = this;
      var analytic = NG.STP.computeAnalytic(self.switches, self.links);

      // Links & Blocked Ends
      self.links.forEach(function (l) {
        var edge = self.edgeEls[l.id];
        var cross = self.cutCrossEls[l.id];
        var blockedA = self.blockedPortEls[l.id + ':' + l.a];
        var blockedB = self.blockedPortEls[l.id + ':' + l.b];

        // Clear inline stroke so CSS rules govern cleanly
        if (edge) {
          edge.style.stroke = '';
          edge.style.strokeWidth = '';
        }

        if (l.failed) {
          edge.setAttribute('class', 's13-edge failed');
          cross.style.display = 'block';
          if (blockedA) blockedA.style.display = 'none';
          if (blockedB) blockedB.style.display = 'none';
        } else {
          cross.style.display = 'none';
          if (self.isStpOn) {
            var isActive = (analytic.activeLinks.indexOf(l.id) !== -1);
            edge.setAttribute('class', 's13-edge ' + (isActive ? 'active' : 'blocked'));

            var isBlkA = analytic.blocked.some(function (b) { return b.linkId === l.id && b.switchId === l.a; });
            var isBlkB = analytic.blocked.some(function (b) { return b.linkId === l.id && b.switchId === l.b; });
            if (blockedA) blockedA.style.display = isBlkA ? 'block' : 'none';
            if (blockedB) blockedB.style.display = isBlkB ? 'block' : 'none';
          } else {
            edge.setAttribute('class', 's13-edge active');
            if (blockedA) blockedA.style.display = 'none';
            if (blockedB) blockedB.style.display = 'none';
          }
        }
      });

      // Switches, Crowns, Badges
      self.switches.forEach(function (s) {
        var circle = self.nodeCircleEls[s.id];
        var crown = self.crownEls[s.id];
        var pill = self.readoutPillEls[s.id];
        var txt = self.readoutTextEls[s.id];

        // Ensure baseline fill is cream (#FBF6E9)
        circle.setAttribute('fill', COLOR_PAPER3);

        if (self.isStpOn) {
          var isBoss = (s.id === analytic.root);
          crown.style.display = isBoss ? 'block' : 'none';
          circle.setAttribute('class', 's13-node-circle' + (isBoss ? ' root' : ''));
          circle.setAttribute('stroke', isBoss ? COLOR_MUSTARD : COLOR_INK);
          circle.setAttribute('stroke-width', isBoss ? '3.5' : '2.5');

          var cost = analytic.pathCost[s.id];
          pill.style.display = 'block';
          txt.textContent = 'cost to boss: ' + (cost !== undefined ? cost : 0);
          txt.setAttribute('fill', COLOR_INK);
          pill.querySelector('rect').setAttribute('fill', COLOR_PAPER3);
          pill.querySelector('rect').setAttribute('stroke', COLOR_INK);
        } else {
          crown.style.display = 'none';
          circle.setAttribute('class', 's13-node-circle');
          circle.setAttribute('stroke', COLOR_INK);
          circle.setAttribute('stroke-width', '2.5');
          pill.style.display = 'none';
        }
      });
    },

    /* ================================================================
       ACTION 1: TURN STP ON & ELECTION ANIMATION
       ================================================================ */

    turnStpOn: function () {
      var self = this;
      if (self.isStpOn) return;
      self.isStpOn = true;

      var d = self.dom;
      d.btnTurnStpOn.style.display = 'none';
      d.narratorLine.textContent = 'Switches exchange hello messages to elect the boss switch...';
      self.logMessage('[STP] Turn STP on: Switches exchange initial hello messages (BPDUs).');

      // 1. Show crowns over EVERY switch
      self.switches.forEach(function (s) {
        self.crownEls[s.id].style.display = 'block';
      });

      // 2. Animate envelope icons travelling on links
      self._animateHelloEnvelopes(function () {
        // 3. Compare IDs: crown on S1 stays, others fade out
        var analytic = NG.STP.computeAnalytic(self.switches, self.links);
        self.switches.forEach(function (s) {
          if (s.id !== analytic.root) {
            self.crownEls[s.id].style.display = 'none';
          }
        });

        self._updateTopologyVisuals();
        self.updateBridgeTable();

        d.narratorLine.textContent = 'Lowest ID wins. ' + analytic.root + ' becomes the boss switch.';
        self.logMessage('[STP] Election complete. Root Bridge is ' + analytic.root + '.');

        if (self.currentAct === 2 && self.currentSentence === 0) {
          self.currentSentence = 1;
          self._renderSentence();
        }
      });
    },

    _animateHelloEnvelopes: function (callback) {
      var self = this;
      var gPart = self.svgGroups.particles;
      gPart.innerHTML = '';

      var envCount = 0;
      var totalEnvs = self.links.length;

      self.links.forEach(function (l) {
        var geom = self.linkGeom[l.id];
        if (!geom) return;

        var env = document.createElementNS(SVG_NS, 'g');
        env.innerHTML =
          '<rect x="-8" y="-6" width="16" height="12" rx="2" fill="' + COLOR_WHITE + '" stroke="' + COLOR_INK + '" stroke-width="1.2"/>' +
          '<polyline points="-7,-5 0,1 7,-5" fill="none" stroke="' + COLOR_INK + '" stroke-width="1.2"/>';
        gPart.appendChild(env);

        var startT = performance.now();
        var dur = 600 / self.speedMult;

        function stepEnv(t) {
          var prog = Math.min(1, (t - startT) / dur);
          var curX = geom.swA.x + (geom.swB.x - geom.swA.x) * prog;
          var curY = geom.swA.y + (geom.swB.y - geom.swA.y) * prog;
          env.setAttribute('transform', 'translate(' + curX + ',' + curY + ')');

          if (prog < 1) {
            self._addRaf(stepEnv);
          } else {
            env.remove();
            envCount++;
            if (envCount >= totalEnvs && typeof callback === 'function') {
              callback();
            }
          }
        }
        self._addRaf(stepEnv);
      });
    },

    /* ================================================================
       ACTION 2: SEND ONE FRAME (ACT 1 VS ACT 2)
       ================================================================ */

    sendFrame: function () {
      var self = this;
      if (self.isStpOn) {
        self._sendFrameStpOn();
      } else {
        self._sendFrameStpOff();
      }
    },

    _sendFrameStpOff: function () {
      var self = this;
      var d = self.dom;
      if (self.isStormRunning) return;
      self.isStormRunning = true;
      d.btnSendFrame.disabled = true;
      d.stormStamp.style.display = 'none';
      d.cntFlight.classList.remove('storm');

      // Inject frame at S1
      self.flooder = new NG.STP.FrameFlooding(self.switches, self.links, Object.keys(self.linkMap));
      self.flooder.injectFrame('S1');

      d.cntFlight.textContent = self.flooder.getTotalInFlight().toLocaleString();
      d.cntDelivered.textContent = self.flooder.getTotalDelivered().toLocaleString();
      d.narratorLine.textContent = 'Hop 0: 1 frame injected at S1.';
      self.logMessage('[Act 1] Host injects 1 frame into S1.');

      // Animate frame from Host to S1
      self._animateHostToS1(function () {
        var tickDelay = 550 / self.speedMult;

        var timerId = self._addInterval(function () {
          var res = self.flooder.tick();
          var inFlight = res.totalInFlight;
          var delivered = res.totalDelivered;
          var ticks = res.ticks;

          d.cntFlight.textContent = inFlight.toLocaleString();
          d.cntDelivered.textContent = delivered.toLocaleString();
          d.narratorLine.textContent = 'Hop ' + ticks + ': ' + inFlight.toLocaleString() + ' copies.';

          // Visual edge load styling: 0 = ink (3px), < 20 = vermilion (4px), >= 20 = alarm red (5.5px)
          self.links.forEach(function (l) {
            var k1 = l.id + ':' + l.a + '->' + l.b;
            var k2 = l.id + ':' + l.b + '->' + l.a;
            var c = (self.flooder.inFlight[k1] || 0) + (self.flooder.inFlight[k2] || 0);
            var edge = self.edgeEls[l.id];

            if (c === 0) {
              edge.style.stroke = COLOR_INK;
              edge.style.strokeWidth = '3px';
            } else if (c < 20) {
              edge.style.stroke = COLOR_VERMILION;
              edge.style.strokeWidth = '4px';
            } else {
              edge.style.stroke = COLOR_ALARM;
              edge.style.strokeWidth = '5.5px';
            }
          });

          // Animate particle dots
          self._animateStormParticles();

          if (ticks >= 12 || inFlight >= 1000000) {
            clearInterval(timerId);
            self.isStormRunning = false;
            d.cntFlight.classList.add('storm');
            d.stormStamp.style.display = 'block';
            d.narratorLine.textContent = 'Traffic overwhelmed the network. Broadcast storm triggered.';
            self.logMessage('[STORM] Hop ' + ticks + ': ' + inFlight.toLocaleString() + ' frames circulating. Broadcast storm collapsed the network!', 'alert');
          }
        }, tickDelay);
      });
    },

    _animateHostToS1: function (cb) {
      var self = this;
      var gPart = self.svgGroups.particles;
      var dot = document.createElementNS(SVG_NS, 'circle');
      dot.setAttribute('cx', 100);
      dot.setAttribute('cy', 75);
      dot.setAttribute('r', '5');
      dot.setAttribute('fill', COLOR_GREEN);
      dot.setAttribute('filter', 'url(#s13-glow)');
      gPart.appendChild(dot);

      var startT = performance.now();
      var dur = 250 / self.speedMult;

      function hopHost(t) {
        var prog = Math.min(1, (t - startT) / dur);
        dot.setAttribute('cx', 100 + (220 - 100) * prog);
        dot.setAttribute('cy', 75 + (110 - 75) * prog);
        if (prog < 1) {
          self._addRaf(hopHost);
        } else {
          dot.remove();
          if (cb) cb();
        }
      }
      self._addRaf(hopHost);
    },

    _animateStormParticles: function () {
      var self = this;
      var gPart = self.svgGroups.particles;
      gPart.innerHTML = '';

      for (var k in self.flooder.inFlight) {
        var count = self.flooder.inFlight[k];
        if (!count || count <= 0) continue;

        var colonIdx = k.indexOf(':');
        var lId = k.substring(0, colonIdx);
        var dir = k.substring(colonIdx + 1).split('->');
        var fromId = dir[0];
        var toId = dir[1];

        var swFrom = self.switchMap[fromId];
        var swTo = self.switchMap[toId];
        if (!swFrom || !swTo) continue;

        var dot = document.createElementNS(SVG_NS, 'circle');
        dot.setAttribute('cx', swFrom.x);
        dot.setAttribute('cy', swFrom.y);
        dot.setAttribute('r', '4.5');
        dot.setAttribute('fill', count > 10 ? COLOR_ALARM : COLOR_VERMILION);
        gPart.appendChild(dot);

        (function (dEl, x1, y1, x2, y2) {
          var startT = performance.now();
          var dur = 400 / self.speedMult;
          function anim(t) {
            var prog = Math.min(1, (t - startT) / dur);
            dEl.setAttribute('cx', x1 + (x2 - x1) * prog);
            dEl.setAttribute('cy', y1 + (y2 - y1) * prog);
            if (prog < 1) {
              self._addRaf(anim);
            } else {
              dEl.remove();
            }
          }
          self._addRaf(anim);
        })(dot, swFrom.x, swFrom.y, swTo.x, swTo.y);
      }
    },

    _sendFrameStpOn: function () {
      var self = this;
      var d = self.dom;
      d.btnSendFrame.disabled = true;
      self.svgGroups.particles.innerHTML = '';

      var analytic = NG.STP.computeAnalytic(self.switches, self.links);
      d.cntFlight.textContent = '1';
      d.cntDelivered.textContent = '0';
      d.narratorLine.textContent = 'Frame sent along spanning tree...';
      self.logMessage('[Act 2] Host frame entering S1.');

      self._animateHostToS1(function () {
        // Tree Hops:
        // Hop 0: S1 (delivered: 1)
        // Hop 1: S2, S6 (delivered: 3)
        // Hop 2: S3, S5 (delivered: 5)
        // Hop 3: S4 (delivered: 6)
        var hops = [
          ['S1'],
          ['S2', 'S6'],
          ['S3', 'S5'],
          ['S4']
        ];

        var hopIdx = 0;
        var deliv = 0;

        function doNextHop() {
          if (hopIdx >= hops.length) {
            d.cntFlight.textContent = '0';
            d.narratorLine.textContent = '1 copy per switch. Storm avoided.';
            self.logMessage('[Success] Frame reached all switches exactly once. 1 copy per switch.');
            d.btnSendFrame.disabled = false;
            return;
          }

          var targets = hops[hopIdx];
          d.cntFlight.textContent = targets.length.toString();

          targets.forEach(function (tgtId) {
            deliv++;
            d.cntDelivered.textContent = deliv.toString();
            self.readoutTextEls[tgtId].textContent = 'got 1 copy';
            self.readoutTextEls[tgtId].setAttribute('fill', '#155724');
            var pillRect = self.readoutPillEls[tgtId].querySelector('rect');
            if (pillRect) {
              pillRect.setAttribute('fill', '#d4edda');
              pillRect.setAttribute('stroke', '#28a745');
            }

            // Flash circle
            self.nodeCircleEls[tgtId].classList.add('lit');
            self._addTimer(function () {
              self.nodeCircleEls[tgtId].classList.remove('lit');
            }, 300);
          });

          // Animate particle dots to next hop targets
          if (hopIdx < hops.length - 1) {
            var nextTargets = hops[hopIdx + 1];
            nextTargets.forEach(function (nTgt) {
              var parentId = null;
              analytic.activeLinks.forEach(function (lId) {
                var l = self.linkMap[lId];
                if ((l.a === nTgt && targets.indexOf(l.b) !== -1)) parentId = l.b;
                if ((l.b === nTgt && targets.indexOf(l.a) !== -1)) parentId = l.a;
              });

              if (parentId) {
                var swF = self.switchMap[parentId];
                var swT = self.switchMap[nTgt];
                var p = document.createElementNS(SVG_NS, 'circle');
                p.setAttribute('cx', swF.x);
                p.setAttribute('cy', swF.y);
                p.setAttribute('r', '4.5');
                p.setAttribute('fill', COLOR_GREEN);
                self.svgGroups.particles.appendChild(p);

                var startT = performance.now();
                var dur = 400 / self.speedMult;
                function hopP(t) {
                  var prog = Math.min(1, (t - startT) / dur);
                  p.setAttribute('cx', swF.x + (swT.x - swF.x) * prog);
                  p.setAttribute('cy', swF.y + (swT.y - swF.y) * prog);
                  if (prog < 1) {
                    self._addRaf(hopP);
                  } else {
                    p.remove();
                  }
                }
                self._addRaf(hopP);
              }
            });
          }

          hopIdx++;
          self._addTimer(doNextHop, Math.round(500 / self.speedMult));
        }

        doNextHop();
      });
    },

    /* ================================================================
       ACTION 3: LINK CUT & RECOVERY (ACT 3)
       ================================================================ */

    cutLink: function (linkId) {
      var self = this;
      var l = self.linkMap[linkId];
      if (!l) return;

      var beforeAnalytic = NG.STP.computeAnalytic(self.switches, self.links);
      l.failed = true;
      self.dom.btnRepairLink.style.display = 'inline-flex';
      self._updateTopologyVisuals();
      self.logMessage('[Cut] Link ' + linkId + ' severed.');

      var afterAnalytic = NG.STP.computeAnalytic(self.switches, self.links);

      if (afterAnalytic.roots.length > 1) {
        // Network partitioned
        self._updateTopologyVisuals();
        self.dom.narratorLine.textContent = 'No backup link. The network is split in two.';
        self.logMessage('[Partition] Link failure disconnected the network! No backup link. Split in two.', 'alert');
        return;
      }

      // Check for backup link that woke up
      var backupId = null;
      self.links.forEach(function (candL) {
        if (!candL.failed && beforeAnalytic.activeLinks.indexOf(candL.id) === -1 && afterAnalytic.activeLinks.indexOf(candL.id) !== -1) {
          backupId = candL.id;
        }
      });

      if (backupId) {
        self.dom.narratorLine.textContent = 'The switches notice, hold a new election, and wake a switched-off link.';
        var transPill = self.transitionEls[backupId];
        var txt = transPill.querySelector('text');
        transPill.style.display = 'block';

        txt.textContent = 'waking up: listening';
        self.logMessage('[STP] Backup link ' + backupId + ' waking up: listening.');

        self._addTimer(function () {
          txt.textContent = 'waking up: learning';
          self.logMessage('[STP] Backup link ' + backupId + ' waking up: learning.');
        }, Math.round(1000 / self.speedMult));

        self._addTimer(function () {
          txt.textContent = 'waking up: working';
          self.logMessage('[STP] Backup link ' + backupId + ' waking up: working.');
        }, Math.round(2000 / self.speedMult));

        self._addTimer(function () {
          transPill.style.display = 'none';
          self._updateTopologyVisuals();
          self.updateBridgeTable();
          self.dom.narratorLine.textContent = 'Recovered through a backup link.';
          self.logMessage('[Recovery] Backup link ' + backupId + ' is now a working link. Connectivity restored.');
        }, Math.round(3000 / self.speedMult));
      } else {
        self._updateTopologyVisuals();
        self.updateBridgeTable();
      }
    },

    repairLink: function () {
      var self = this;
      self.links.forEach(function (l) {
        l.failed = false;
      });
      self.dom.btnRepairLink.style.display = 'none';
      self._updateTopologyVisuals();
      self.updateBridgeTable();
      self.dom.narratorLine.textContent = 'Cables repaired. Original spanning tree restored.';
      self.logMessage('[Repair] All severed links repaired. Spanning tree restored.');
    },

    /* ================================================================
       ACTION 4: CHOOSE THE BOSS SWITCH (INLINE CARD)
       ================================================================ */

    _toggleChooseBossCard: function () {
      var self = this;
      var card = self.dom.chooseBossCard;
      if (card.style.display === 'none') {
        card.style.display = 'block';
        self.dom.bossActions.style.display = 'none';
        self.dom.bossPrompt.textContent = 'Click any switch in the scene to select it.';
      } else {
        self._closeChooseBossCard();
      }
    },

    _closeChooseBossCard: function () {
      var self = this;
      self.dom.chooseBossCard.style.display = 'none';
      if (self.selectedSwitch) {
        self.nodeCircleEls[self.selectedSwitch.id].classList.remove('selected');
        self.selectedSwitch = null;
      }
    },

    _selectSwitchForBoss: function (swId) {
      var self = this;
      if (self.selectedSwitch) {
        self.nodeCircleEls[self.selectedSwitch.id].classList.remove('selected');
      }

      var sw = self.switchMap[swId];
      if (!sw) return;
      self.selectedSwitch = sw;
      self.nodeCircleEls[sw.id].classList.add('selected');

      var d = self.dom;
      d.chooseBossCard.style.display = 'block';
      d.bossActions.style.display = 'flex';
      d.bossTitle.textContent = 'Configure Switch ' + sw.id;
      d.btnMakeBoss.textContent = 'Make ' + sw.id + ' the boss';
      d.priMono.textContent = 'Priority: ' + sw.priority;
    },

    setBoss: function (swId, priority) {
      var self = this;
      var sw = self.switchMap[swId];
      if (!sw) return;

      NG.STP.setPriority(self.switches, swId, priority);
      if (self.priTextEls[swId]) self.priTextEls[swId].textContent = priority.toString();
      self.dom.priMono.textContent = 'Priority: ' + priority;

      self.logMessage('[Config] Switch ' + swId + ' priority set to ' + priority + '.');

      // Re-election animation & convergence
      self._animateHelloEnvelopes(function () {
        var analytic = NG.STP.computeAnalytic(self.switches, self.links);
        console.assert(analytic.root === (priority === 4096 ? swId : 'S1'), 'Root bridge must match elected boss!');

        self._updateTopologyVisuals();
        self.updateBridgeTable();

        self.dom.narratorLine.textContent = analytic.root + ' is now the boss switch. Tree re-routed.';
        self.logMessage('[STP] Convergence finished. Root Bridge is ' + analytic.root + '.');
      });
    },

    /* ================================================================
       ACTION 5: RESET SIMULATION
       ================================================================ */

    resetSimulation: function () {
      var self = this;
      self.switchAct(self.currentAct);
      self.logMessage('[Reset] Network restored to initial state.');
    },

    /* ================================================================
       ACTION 6: TECHNICAL DETAILS DRAWER & LOGS
       ================================================================ */

    openDrawer: function () {
      var self = this;
      var drawer = self.dom.detailsDrawer;
      drawer.classList.add('open');
      drawer.setAttribute('aria-hidden', 'false');
      self.updateBridgeTable();
    },

    closeDrawer: function () {
      var self = this;
      var drawer = self.dom.detailsDrawer;
      drawer.classList.remove('open');
      drawer.setAttribute('aria-hidden', 'true');
    },

    updateBridgeTable: function () {
      var self = this;
      var tbody = self.dom.bridgeTbody;
      if (!tbody) return;
      tbody.innerHTML = '';

      var analytic = NG.STP.computeAnalytic(self.switches, self.links);
      var rootId = self.isStpOn ? analytic.root : '—';

      self.switches.forEach(function (s) {
        var tr = document.createElement('tr');
        var isRoot = (self.isStpOn && s.id === rootId);
        if (isRoot) tr.className = 'is-root';

        var macSuffix = s.mac.substring(s.mac.length - 8);
        var rootPort = '—';
        var role = 'Idle';

        if (self.isStpOn) {
          if (isRoot) {
            rootPort = '—';
            role = '<span class="badge" style="background:#D49A00;color:#fff;font-size:0.65rem;padding:0.1rem 0.35rem;border-radius:3px;">Root Bridge</span>';
          } else {
            var rp = analytic.rootPortLink[s.id];
            rootPort = rp || '—';
            role = '<span class="badge" style="background:#178A86;color:#fff;font-size:0.65rem;padding:0.1rem 0.35rem;border-radius:3px;">Forwarding</span>';
          }
        } else {
          role = '<span class="badge" style="background:#706A5E;color:#fff;font-size:0.65rem;padding:0.1rem 0.35rem;border-radius:3px;">Loops Active</span>';
        }

        tr.innerHTML =
          '<td><strong>' + s.id + '</strong></td>' +
          '<td>' + s.priority + '</td>' +
          '<td><code>' + macSuffix + '</code></td>' +
          '<td>' + rootPort + '</td>' +
          '<td>' + role + '</td>';
        tbody.appendChild(tr);
      });
    },

    logMessage: function (msg, level) {
      var self = this;
      var logBox = self.dom.logBox;
      if (!logBox) return;

      var entry = document.createElement('div');
      entry.className = 's13-log-entry' + (level ? ' ' + level : '');
      var now = new Date();
      var timeStr = ('0' + now.getHours()).slice(-2) + ':' +
                    ('0' + now.getMinutes()).slice(-2) + ':' +
                    ('0' + now.getSeconds()).slice(-2);
      entry.textContent = '[' + timeStr + '] ' + msg;
      logBox.insertBefore(entry, logBox.firstChild);

      while (logBox.children.length > 50) {
        logBox.removeChild(logBox.lastChild);
      }
    },

    /* ================================================================
       LIFECYCLE HOOKS
       ================================================================ */

    pause: function () {
      var self = this;
      self._clearTimers();
      self.isStormRunning = false;
    },

    resume: function () {
      var self = this;
      // Re-entry resets to Act 1
      self.switchAct(1);
    },

    destroy: function () {
      var self = this;
      self.pause();
      if (self._boundKeyHandler) {
        window.removeEventListener('keydown', self._boundKeyHandler, true);
        self._boundKeyHandler = null;
      }
      self._initialized = false;
    }
  };

  NG.slides.s13 = s13;

})();
