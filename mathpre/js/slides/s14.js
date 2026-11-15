/**
 * js/slides/s14.js
 * Slide 14: Applications (3x2 Grid with unique mini-graph animations)
 *
 * Conforms to SPEC Section 8 (Slide 14).
 * Animations play on hover and keyboard focus; stop on leave/blur.
 */

(function () {
  'use strict';

  window.NG = window.NG || {};
  NG.slides = NG.slides || {};

  var s14 = {
    _initialized: false,
    _activeAnims: {},

    init: function (root) {
      if (!root) return;
      var self = this;
      self._root = root;
      self.destroy();

      var cards = root.querySelectorAll('.s14-card');

      cards.forEach(function (card) {
        var cardType = card.getAttribute('data-card');
        var svg = card.querySelector('.s14-mini-svg');
        if (!svg) return;

        // Render initial resting SVG
        self._renderInitial(cardType, svg);

        // Hover & Focus handlers
        function start() {
          self._startAnim(cardType, svg);
        }
        function stop() {
          self._stopAnim(cardType, svg);
        }

        card.addEventListener('mouseenter', start);
        card.addEventListener('mouseleave', stop);
        card.addEventListener('focus', start);
        card.addEventListener('blur', stop);
      });

      self._initialized = true;
    },

    /* ============================================================
       INITIAL RESTING SVGs
       ============================================================ */
    _renderInitial: function (type, svg) {
      svg.innerHTML = '';

      if (type === 'campus') {
        // Buildings & faint mesh
        svg.innerHTML =
          '<g class="mesh-lines">' +
          '  <line x1="50" y1="45" x2="230" y2="40" stroke="var(--grid-major)" stroke-width="1.5" stroke-dasharray="3,3"/>' +
          '  <line x1="50" y1="45" x2="210" y2="105" stroke="var(--grid-major)" stroke-width="1.5" stroke-dasharray="3,3"/>' +
          '  <line x1="70" y1="110" x2="230" y2="40" stroke="var(--grid-major)" stroke-width="1.5" stroke-dasharray="3,3"/>' +
          '</g>' +
          '<g class="tree-lines">' +
          '  <line x1="50" y1="45" x2="70" y2="110" stroke="var(--ink)" stroke-width="2.5"/>' +
          '  <line x1="50" y1="45" x2="210" y2="105" stroke="var(--ink)" stroke-width="2.5"/>' +
          '  <line x1="210" y1="105" x2="230" y2="40" stroke="var(--ink)" stroke-width="2.5"/>' +
          '</g>' +
          '<g class="buildings">' +
          '  <g transform="translate(50,45)"><rect x="-14" y="-14" width="28" height="28" rx="3" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="2"/><text y="4" text-anchor="middle" font-family="var(--font-mono)" font-size="9" font-weight="700">ADM</text></g>' +
          '  <g transform="translate(230,40)"><rect x="-14" y="-14" width="28" height="28" rx="3" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="2"/><text y="4" text-anchor="middle" font-family="var(--font-mono)" font-size="9" font-weight="700">LIB</text></g>' +
          '  <g transform="translate(70,110)"><rect x="-14" y="-14" width="28" height="28" rx="3" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="2"/><text y="4" text-anchor="middle" font-family="var(--font-mono)" font-size="9" font-weight="700">LAB</text></g>' +
          '  <g transform="translate(210,105)"><rect x="-14" y="-14" width="28" height="28" rx="3" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="2"/><text y="4" text-anchor="middle" font-family="var(--font-mono)" font-size="9" font-weight="700">ENG</text></g>' +
          '</g>';

      } else if (type === 'fibre') {
        // Cities & terrain
        svg.innerHTML =
          '<g class="terrain" opacity="0.35">' +
          '  <path d="M 10 120 Q 90 80 150 110 T 270 95" fill="none" stroke="var(--ink-3)" stroke-width="1.5" stroke-dasharray="2,2"/>' +
          '  <path d="M 20 30 Q 120 60 180 20 T 260 40" fill="none" stroke="var(--ink-3)" stroke-width="1.5" stroke-dasharray="2,2"/>' +
          '</g>' +
          '<g class="trench-lines">' +
          '  <line x1="40" y1="70" x2="100" y2="35" stroke="var(--ink)" stroke-width="2.5"/>' +
          '  <line x1="100" y1="35" x2="200" y2="45" stroke="var(--ink)" stroke-width="2.5"/>' +
          '  <line x1="100" y1="35" x2="150" y2="105" stroke="var(--ink)" stroke-width="2.5"/>' +
          '  <line x1="200" y1="45" x2="250" y2="85" stroke="var(--ink)" stroke-width="2.5"/>' +
          '</g>' +
          '<g class="cities">' +
          '  <circle cx="40" cy="70" r="7" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="2"/>' +
          '  <circle cx="100" cy="35" r="7" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="2"/>' +
          '  <circle cx="150" cy="105" r="7" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="2"/>' +
          '  <circle cx="200" cy="45" r="7" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="2"/>' +
          '  <circle cx="250" cy="85" r="7" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="2"/>' +
          '</g>';

      } else if (type === 'power') {
        // Substation & Moravian towns
        svg.innerHTML =
          '<g class="power-lines">' +
          '  <line x1="50" y1="70" x2="110" y2="35" stroke="var(--ink)" stroke-width="2.5"/>' +
          '  <line x1="50" y1="70" x2="120" y2="110" stroke="var(--ink)" stroke-width="2.5"/>' +
          '  <line x1="110" y1="35" x2="200" y2="45" stroke="var(--ink)" stroke-width="2.5"/>' +
          '  <line x1="120" y1="110" x2="230" y2="105" stroke="var(--ink)" stroke-width="2.5"/>' +
          '</g>' +
          '<g class="nodes">' +
          '  <!-- Substation -->' +
          '  <g transform="translate(50,70)"><circle cx="0" cy="0" r="14" fill="#FFE066" stroke="var(--ink)" stroke-width="2"/><path d="M -2 -7 L 4 -1 L -1 0 L 3 7 L -4 1 L 0 0 z" fill="var(--ink)"/></g>' +
          '  <!-- Towns -->' +
          '  <circle cx="110" cy="35" r="6" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="2"/>' +
          '  <circle cx="120" cy="110" r="6" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="2"/>' +
          '  <circle cx="200" cy="45" r="6" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="2"/>' +
          '  <circle cx="230" cy="105" r="6" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="2"/>' +
          '</g>';

      } else if (type === 'multicast') {
        // Source server & fan-out tree
        svg.innerHTML =
          '<g class="tree-lines">' +
          '  <line x1="140" y1="25" x2="80" y2="70" stroke="var(--ink)" stroke-width="2"/>' +
          '  <line x1="140" y1="25" x2="200" y2="70" stroke="var(--ink)" stroke-width="2"/>' +
          '  <line x1="80" y1="70" x2="40" y2="115" stroke="var(--ink)" stroke-width="2"/>' +
          '  <line x1="80" y1="70" x2="105" y2="115" stroke="var(--ink)" stroke-width="2"/>' +
          '  <line x1="200" y1="70" x2="175" y2="115" stroke="var(--ink)" stroke-width="2"/>' +
          '  <line x1="200" y1="70" x2="240" y2="115" stroke="var(--ink)" stroke-width="2"/>' +
          '</g>' +
          '<g class="nodes">' +
          '  <!-- Source -->' +
          '  <g transform="translate(140,25)"><rect x="-14" y="-10" width="28" height="20" rx="3" fill="var(--vermilion)" stroke="var(--ink)" stroke-width="1.5"/><text y="4" text-anchor="middle" font-family="var(--font-mono)" font-size="8" font-weight="700" fill="#fff">SRC</text></g>' +
          '  <!-- Routers -->' +
          '  <circle cx="80" cy="70" r="6" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="1.5"/>' +
          '  <circle cx="200" cy="70" r="6" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="1.5"/>' +
          '  <!-- Receivers -->' +
          '  <circle cx="40" cy="115" r="5" fill="var(--c4)" stroke="var(--ink)" stroke-width="1.2"/>' +
          '  <circle cx="105" cy="115" r="5" fill="var(--c4)" stroke="var(--ink)" stroke-width="1.2"/>' +
          '  <circle cx="175" cy="115" r="5" fill="var(--c4)" stroke="var(--ink)" stroke-width="1.2"/>' +
          '  <circle cx="240" cy="115" r="5" fill="var(--c4)" stroke="var(--ink)" stroke-width="1.2"/>' +
          '</g>';

      } else if (type === 'iot') {
        // Sink node & scattered sensors
        svg.innerHTML =
          '<g class="routing-tree">' +
          '  <line x1="45" y1="40" x2="140" y2="70" stroke="var(--ink)" stroke-width="1.8" stroke-dasharray="3,3"/>' +
          '  <line x1="60" y1="110" x2="140" y2="70" stroke="var(--ink)" stroke-width="1.8" stroke-dasharray="3,3"/>' +
          '  <line x1="220" y1="35" x2="140" y2="70" stroke="var(--ink)" stroke-width="1.8" stroke-dasharray="3,3"/>' +
          '  <line x1="235" y1="110" x2="175" y2="115" stroke="var(--ink)" stroke-width="1.8" stroke-dasharray="3,3"/>' +
          '  <line x1="175" y1="115" x2="140" y2="70" stroke="var(--ink)" stroke-width="1.8" stroke-dasharray="3,3"/>' +
          '</g>' +
          '<g class="nodes">' +
          '  <!-- Sink -->' +
          '  <g transform="translate(140,70)"><circle cx="0" cy="0" r="13" fill="var(--c5)" stroke="var(--ink)" stroke-width="2"/><text y="3" text-anchor="middle" font-family="var(--font-mono)" font-size="8" font-weight="700" fill="#fff">SINK</text></g>' +
          '  <!-- Sensors -->' +
          '  <circle cx="45" cy="40" r="5" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="1.5"/>' +
          '  <circle cx="60" cy="110" r="5" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="1.5"/>' +
          '  <circle cx="220" cy="35" r="5" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="1.5"/>' +
          '  <circle cx="175" cy="115" r="5" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="1.5"/>' +
          '  <circle cx="235" cy="110" r="5" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="1.5"/>' +
          '</g>';

      } else if (type === 'clustering') {
        // 3 clusters connected by full MST
        svg.innerHTML =
          '<g class="cluster-halos"></g>' +
          '<g class="mst-lines">' +
          '  <!-- Cluster 1 -->' +
          '  <line x1="45" y1="50" x2="75" y2="40" stroke="var(--ink)" stroke-width="2"/>' +
          '  <line x1="45" y1="50" x2="60" y2="85" stroke="var(--ink)" stroke-width="2"/>' +
          '  <!-- Longest bridge 1 -->' +
          '  <line id="s14-bridge-1" x1="75" y1="40" x2="135" y2="70" stroke="var(--vermilion)" stroke-width="2.5"/>' +
          '  <!-- Cluster 2 -->' +
          '  <line x1="135" y1="70" x2="155" y2="105" stroke="var(--ink)" stroke-width="2"/>' +
          '  <!-- Longest bridge 2 -->' +
          '  <line id="s14-bridge-2" x1="135" y1="70" x2="210" y2="50" stroke="var(--vermilion)" stroke-width="2.5"/>' +
          '  <!-- Cluster 3 -->' +
          '  <line x1="210" y1="50" x2="245" y2="45" stroke="var(--ink)" stroke-width="2"/>' +
          '  <line x1="210" y1="50" x2="230" y2="85" stroke="var(--ink)" stroke-width="2"/>' +
          '</g>' +
          '<g class="data-points">' +
          '  <circle cx="45" cy="50" r="5" fill="var(--ink)" stroke="var(--ink)" stroke-width="1"/>' +
          '  <circle cx="75" cy="40" r="5" fill="var(--ink)" stroke="var(--ink)" stroke-width="1"/>' +
          '  <circle cx="60" cy="85" r="5" fill="var(--ink)" stroke="var(--ink)" stroke-width="1"/>' +
          '  <circle cx="135" cy="70" r="5" fill="var(--ink)" stroke="var(--ink)" stroke-width="1"/>' +
          '  <circle cx="155" cy="105" r="5" fill="var(--ink)" stroke="var(--ink)" stroke-width="1"/>' +
          '  <circle cx="210" cy="50" r="5" fill="var(--ink)" stroke="var(--ink)" stroke-width="1"/>' +
          '  <circle cx="245" cy="45" r="5" fill="var(--ink)" stroke="var(--ink)" stroke-width="1"/>' +
          '  <circle cx="230" cy="85" r="5" fill="var(--ink)" stroke="var(--ink)" stroke-width="1"/>' +
          '</g>';
      }
    },

    /* ============================================================
       HOVER / FOCUS ANIMATIONS
       ============================================================ */
    _startAnim: function (type, svg) {
      var self = this;
      self._stopAnim(type, svg);

      var animData = { running: true };
      self._activeAnims[type] = animData;

      if (type === 'campus') {
        // Vermilion MST drawing in + signal pulse
        var treeLines = svg.querySelectorAll('.tree-lines line');
        treeLines.forEach(function (l) {
          l.style.stroke = 'var(--vermilion)';
          l.style.strokeWidth = '3.5px';
        });

        var pulseDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pulseDot.setAttribute('r', '5');
        pulseDot.setAttribute('fill', 'var(--vermilion)');
        svg.appendChild(pulseDot);
        animData.dot = pulseDot;

        var waypoints = [
          { x: 70, y: 110 },
          { x: 50, y: 45 },
          { x: 210, y: 105 },
          { x: 230, y: 40 }
        ];

        var stepI = 0;
        var startT = performance.now();
        var segDur = 450;

        function loopCampus(t) {
          if (!animData.running) return;
          var prog = (t - startT) / segDur;
          if (prog >= 1) {
            stepI = (stepI + 1) % (waypoints.length - 1);
            startT = t;
            prog = 0;
          }
          var p1 = waypoints[stepI];
          var p2 = waypoints[stepI + 1];
          pulseDot.setAttribute('cx', p1.x + (p2.x - p1.x) * prog);
          pulseDot.setAttribute('cy', p1.y + (p2.y - p1.y) * prog);
          animData.frameId = requestAnimationFrame(loopCampus);
        }
        animData.frameId = requestAnimationFrame(loopCampus);

      } else if (type === 'fibre') {
        // High-speed light pulse traveling through trenching routes
        var trenchLines = svg.querySelectorAll('.trench-lines line');
        trenchLines.forEach(function (l) {
          l.style.stroke = 'var(--vermilion)';
          l.style.strokeWidth = '3.5px';
        });

        var lightPulse = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        lightPulse.setAttribute('r', '5');
        lightPulse.setAttribute('fill', '#fff');
        lightPulse.setAttribute('stroke', 'var(--vermilion)');
        lightPulse.setAttribute('stroke-width', '2');
        svg.appendChild(lightPulse);
        animData.dot = lightPulse;

        var fibrePath = [
          { x: 40, y: 70 },
          { x: 100, y: 35 },
          { x: 200, y: 45 },
          { x: 250, y: 85 }
        ];

        var segIdx = 0;
        var startT = performance.now();
        var dur = 380;

        function loopFibre(t) {
          if (!animData.running) return;
          var prog = (t - startT) / dur;
          if (prog >= 1) {
            segIdx = (segIdx + 1) % (fibrePath.length - 1);
            startT = t;
            prog = 0;
          }
          var a = fibrePath[segIdx];
          var b = fibrePath[segIdx + 1];
          lightPulse.setAttribute('cx', a.x + (b.x - a.x) * prog);
          lightPulse.setAttribute('cy', a.y + (b.y - a.y) * prog);
          animData.frameId = requestAnimationFrame(loopFibre);
        }
        animData.frameId = requestAnimationFrame(loopFibre);

      } else if (type === 'power') {
        // Lightning spark pulses from substation to Moravian towns
        var spark = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        spark.setAttribute('r', '5');
        spark.setAttribute('fill', '#D49A00');
        svg.appendChild(spark);
        animData.dot = spark;

        var townCircles = svg.querySelectorAll('.nodes circle');

        var startT = performance.now();
        function loopPower(t) {
          if (!animData.running) return;
          var elapsed = (t - startT) % 1500;
          var prog = (elapsed % 750) / 750;

          // Branch 1: Substation -> T1 -> T3
          if (elapsed < 750) {
            if (prog < 0.5) {
              spark.setAttribute('cx', 50 + (110 - 50) * (prog * 2));
              spark.setAttribute('cy', 70 + (35 - 70) * (prog * 2));
            } else {
              spark.setAttribute('cx', 110 + (200 - 110) * ((prog - 0.5) * 2));
              spark.setAttribute('cy', 35 + (45 - 35) * ((prog - 0.5) * 2));
            }
          } else {
            // Branch 2: Substation -> T2 -> T4
            if (prog < 0.5) {
              spark.setAttribute('cx', 50 + (120 - 50) * (prog * 2));
              spark.setAttribute('cy', 70 + (110 - 70) * (prog * 2));
            } else {
              spark.setAttribute('cx', 120 + (230 - 120) * ((prog - 0.5) * 2));
              spark.setAttribute('cy', 110 + (105 - 110) * ((prog - 0.5) * 2));
            }
          }

          // Towns illuminate
          townCircles.forEach(function (c) {
            c.setAttribute('fill', '#FFE066');
          });

          animData.frameId = requestAnimationFrame(loopPower);
        }
        animData.frameId = requestAnimationFrame(loopPower);

      } else if (type === 'multicast') {
        // Stream packets fan out through routers to all 4 receivers
        var dotL = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dotL.setAttribute('r', '4');
        dotL.setAttribute('fill', 'var(--vermilion)');
        svg.appendChild(dotL);

        var dotR = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dotR.setAttribute('r', '4');
        dotR.setAttribute('fill', 'var(--vermilion)');
        svg.appendChild(dotR);

        animData.dots = [dotL, dotR];

        var startT = performance.now();
        function loopMulti(t) {
          if (!animData.running) return;
          var prog = ((t - startT) % 1200) / 1200;

          if (prog < 0.4) {
            var subP = prog / 0.4;
            // From Server (140,25) to Routers L(80,70) and R(200,70)
            dotL.setAttribute('cx', 140 + (80 - 140) * subP);
            dotL.setAttribute('cy', 25 + (70 - 25) * subP);
            dotR.setAttribute('cx', 140 + (200 - 140) * subP);
            dotR.setAttribute('cy', 25 + (70 - 25) * subP);
          } else {
            var subP = (prog - 0.4) / 0.6;
            // Router L to Clients (40, 115) and Router R to Clients (240, 115)
            dotL.setAttribute('cx', 80 + (40 - 80) * subP);
            dotL.setAttribute('cy', 70 + (115 - 70) * subP);
            dotR.setAttribute('cx', 200 + (240 - 200) * subP);
            dotR.setAttribute('cy', 70 + (115 - 70) * subP);
          }
          animData.frameId = requestAnimationFrame(loopMulti);
        }
        animData.frameId = requestAnimationFrame(loopMulti);

      } else if (type === 'iot') {
        // Sensors emit ripple waves and ping upward to sink gateway
        var pings = [];
        var sensors = [
          { x: 45, y: 40 },
          { x: 60, y: 110 },
          { x: 220, y: 35 },
          { x: 175, y: 115 },
          { x: 235, y: 110 }
        ];

        sensors.forEach(function (s) {
          var ping = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          ping.setAttribute('r', '3.5');
          ping.setAttribute('fill', 'var(--c5)');
          svg.appendChild(ping);
          pings.push({ el: ping, sx: s.x, sy: s.y });
        });
        animData.pings = pings;

        var startT = performance.now();
        function loopIot(t) {
          if (!animData.running) return;
          var prog = ((t - startT) % 1100) / 1100;
          pings.forEach(function (p) {
            p.el.setAttribute('cx', p.sx + (140 - p.sx) * prog);
            p.el.setAttribute('cy', p.sy + (70 - p.sy) * prog);
          });
          animData.frameId = requestAnimationFrame(loopIot);
        }
        animData.frameId = requestAnimationFrame(loopIot);

      } else if (type === 'clustering') {
        // Cut the 2 longest bridge edges and color the 3 clusters
        var b1 = svg.querySelector('#s14-bridge-1');
        var b2 = svg.querySelector('#s14-bridge-2');
        var halos = svg.querySelector('.cluster-halos');
        var points = svg.querySelectorAll('.data-points circle');

        // Scissors effect on bridge lines
        if (b1) {
          b1.style.stroke = 'var(--alarm)';
          b1.style.strokeDasharray = '4,4';
          b1.style.opacity = '0.3';
        }
        if (b2) {
          b2.style.stroke = 'var(--alarm)';
          b2.style.strokeDasharray = '4,4';
          b2.style.opacity = '0.3';
        }

        // Color points by cluster
        // Cluster 1 (indices 0,1,2): Teal
        points[0].setAttribute('fill', 'var(--c1)');
        points[1].setAttribute('fill', 'var(--c1)');
        points[2].setAttribute('fill', 'var(--c1)');
        // Cluster 2 (indices 3,4): Mustard
        points[3].setAttribute('fill', 'var(--c2)');
        points[4].setAttribute('fill', 'var(--c2)');
        // Cluster 3 (indices 5,6,7): Rose
        points[5].setAttribute('fill', 'var(--c6)');
        points[6].setAttribute('fill', 'var(--c6)');
        points[7].setAttribute('fill', 'var(--c6)');

        // Draw cluster halos
        if (halos) {
          halos.innerHTML =
            '<ellipse cx="60" cy="58" rx="28" ry="32" fill="var(--c1)" opacity="0.18"/>' +
            '<ellipse cx="145" cy="87" rx="22" ry="26" fill="var(--c2)" opacity="0.18"/>' +
            '<ellipse cx="230" cy="60" rx="30" ry="32" fill="var(--c6)" opacity="0.18"/>' +
            '<text x="140" y="132" text-anchor="middle" font-family="var(--font-mono)" font-size="9" font-weight="700" fill="var(--ink)">3 clusters found (cut longest edges)</text>';
        }
      }
    },

    _stopAnim: function (type, svg) {
      var self = this;
      var anim = self._activeAnims[type];
      if (anim) {
        anim.running = false;
        if (anim.frameId) cancelAnimationFrame(anim.frameId);
        if (anim.dot && anim.dot.parentNode) anim.dot.remove();
        if (anim.dots) anim.dots.forEach(function (d) { if (d.parentNode) d.remove(); });
        if (anim.pings) anim.pings.forEach(function (p) { if (p.el.parentNode) p.el.remove(); });
        delete self._activeAnims[type];
      }
      self._renderInitial(type, svg);
    },

    pause: function () {
      var self = this;
      for (var k in self._activeAnims) {
        var anim = self._activeAnims[k];
        anim.running = false;
        if (anim.frameId) cancelAnimationFrame(anim.frameId);
      }
    },

    resume: function () {},

    destroy: function () {
      var self = this;
      self.pause();
      self._activeAnims = {};
      self._initialized = false;
    }
  };

  NG.slides.s14 = s14;

})();
