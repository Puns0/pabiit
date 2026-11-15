/* ============================================================
   util.js — Helper utilities: math, formatting, RNG, DOM, easing
   ============================================================ */
(function () {
  'use strict';

  window.NG = window.NG || {};

  /**
   * Clamp a number between min and max (inclusive).
   */
  function clamp(val, min, max) {
    if (min > max) {
      var tmp = min; min = max; max = tmp;
    }
    return Math.max(min, Math.min(max, val));
  }

  /**
   * Linear interpolation between a and b by factor t (0 <= t <= 1).
   */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * Mulberry32 32-bit seeded pseudo-random number generator.
   * Returns a function that produces numbers in [0, 1).
   */
  function mulberry32(seed) {
    var s = (seed >>> 0) || 1;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * Alias / convenience wrapper for mulberry32.
   */
  function rng(seed) {
    return mulberry32(seed !== undefined ? seed : 123456789);
  }

  /**
   * Format a numeric amount in Indian Rupees with en-IN grouping and '₹' prefix.
   * e.g. 12300 -> '₹12,300', 4950000 -> '₹49,50,000'
   */
  function formatINR(num) {
    if (num === null || num === undefined || isNaN(num)) return '₹0';
    var isNeg = num < 0;
    var abs = Math.abs(num);
    var rounded = Math.round(abs);

    var s = String(rounded);
    if (s.length <= 3) {
      return (isNeg ? '-₹' : '₹') + s;
    }

    var lastThree = s.slice(-3);
    var rest = s.slice(0, -3);

    // Group the preceding digits in twos
    var grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    return (isNeg ? '-₹' : '₹') + grouped + ',' + lastThree;
  }

  /**
   * Easing functions (input t in [0, 1] -> output in [0, 1]).
   */
  var easing = {
    linear: function (t) { return t; },
    easeInQuad: function (t) { return t * t; },
    easeOutQuad: function (t) { return t * (2 - t); },
    easeInOutQuad: function (t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },
    easeInCubic: function (t) { return t * t * t; },
    easeOutCubic: function (t) { return (--t) * t * t + 1; },
    easeInOutCubic: function (t) {
      return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }
  };

  /**
   * Debounce a function call by waitMs.
   */
  function debounce(fn, waitMs) {
    var timer = null;
    return function () {
      var ctx = this;
      var args = arguments;
      if (timer) clearTimeout(timer);
      timer = setTimeout(function () {
        timer = null;
        fn.apply(ctx, args);
      }, waitMs || 100);
    };
  }

  /**
   * DOM helper: create an element with attributes, styles, events, and children.
   * e.g. el('div', { className: 'card', textContent: 'Hi' }, [childEl])
   */
  function el(tag, attrs, children) {
    var isSvg = (tag === 'svg' || tag === 'path' || tag === 'circle' || tag === 'rect' ||
                 tag === 'line' || tag === 'g' || tag === 'text' || tag === 'filter' ||
                 tag === 'feTurbulence' || tag === 'feColorMatrix' || tag === 'feBlend');

    var elem = isSvg ? document.createElementNS('http://www.w3.org/2000/svg', tag)
                     : document.createElement(tag);

    if (attrs) {
      for (var key in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, key)) continue;
        var val = attrs[key];

        if (key === 'className' || key === 'class') {
          if (isSvg) elem.setAttribute('class', val);
          else elem.className = val;
        } else if (key === 'style' && typeof val === 'object') {
          for (var s in val) {
            if (Object.prototype.hasOwnProperty.call(val, s)) {
              elem.style[s] = val[s];
            }
          }
        } else if (key === 'textContent') {
          elem.textContent = val;
        } else if (key === 'innerHTML') {
          elem.innerHTML = val;
        } else if (key.indexOf('on') === 0 && typeof val === 'function') {
          elem.addEventListener(key.slice(2).toLowerCase(), val);
        } else {
          elem.setAttribute(key, val);
        }
      }
    }

    if (children) {
      if (!Array.isArray(children)) children = [children];
      for (var i = 0; i < children.length; i++) {
        var c = children[i];
        if (c === null || c === undefined) continue;
        if (typeof c === 'string' || typeof c === 'number') {
          elem.appendChild(document.createTextNode(String(c)));
        } else if (c.nodeType) {
          elem.appendChild(c);
        }
      }
    }

    return elem;
  }

  var _uidCounter = 0;
  /**
   * Generate a unique ID string.
   */
  function uid(prefix) {
    return (prefix || 'id') + '_' + (++_uidCounter) + '_' + Math.random().toString(36).substr(2, 5);
  }

  // Export functions onto NG and NG.Util
  var Util = {
    clamp: clamp,
    lerp: lerp,
    mulberry32: mulberry32,
    rng: rng,
    formatINR: formatINR,
    easing: easing,
    debounce: debounce,
    el: el,
    uid: uid
  };

  NG.Util = Util;
  NG.clamp = clamp;
  NG.lerp = lerp;
  NG.mulberry32 = mulberry32;
  NG.rng = rng;
  NG.formatINR = formatINR;
  NG.easing = easing;
  NG.debounce = debounce;
  NG.el = el;
  NG.uid = uid;

})();
