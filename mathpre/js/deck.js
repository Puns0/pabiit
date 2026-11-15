/* ============================================================
   deck.js — Navigation, reveals, overlays, lazy init, observers
   ============================================================ */
(function () {
  'use strict';

  window.NG = window.NG || {};

  /* ---- internal state ---- */
  var slides = [];          // array of section elements
  var slideIds = [];        // parallel id strings
  var currentIndex = 0;
  var initializedSet = {};  // slideId -> true (acts as a Set)
  var dotEls = [];          // parallel dot elements
  var progressBar = null;
  var counterEl = null;
  var notesDrawer = null;
  var notesContent = null;
  var helpOverlay = null;
  var smallOverlay = null;

  /* ---- helpers ---- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function isInteractiveTarget(el) {
    if (!el || typeof el.getAttribute !== 'function') return false;
    var tag = el.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return true;
    if (el.getAttribute('type') === 'range') return true;
    if (el.isContentEditable) return true;
    return false;
  }

  function slideDisplayLabel(id, idx) {
    if (id === 's08b') return '10\u00B7b';
    var mainCount = 0;
    for (var i = 0; i < slides.length; i++) {
      if (slides[i].id !== 's08b') {
        mainCount++;
      }
      if (slides[i].id === id) {
        return ('0' + mainCount).slice(-2);
      }
    }
    return ('0' + (idx + 1)).slice(-2);
  }

  /* ---- deck object ---- */
  var deck = {
    reducedMotion: false,

    /* ============ INIT ============ */
    init: function () {
      slides = $$('#deck > .slide');
      slideIds = slides.map(function (s) { return s.id; });

      if (!slides.length) return;

      // Detect OS reduced-motion preference
      var mql = window.matchMedia('(prefers-reduced-motion: reduce)');
      if (mql.matches) {
        deck.reducedMotion = true;
        document.documentElement.classList.add('reduced-motion');
      }
      // Listen for OS-level changes
      if (mql.addEventListener) {
        mql.addEventListener('change', function (e) {
          deck.reducedMotion = e.matches;
          document.documentElement.classList.toggle('reduced-motion', e.matches);
        });
      }

      deck._buildDotRail();
      deck._buildProgressBar();
      deck._buildCounter();
      deck._buildNotesDrawer();
      deck._buildHelpOverlay();
      deck._buildSmallScreenOverlay();
      deck._setupKeyboard();
      deck._setupScroll();
      deck._setupInViewObserver();
      deck._setupLazyInitObserver();
      deck._setupOutViewObserver();

      // Sync any static slide labels
      slides.forEach(function (s, i) {
        var lbl = s.querySelector('.slide-label');
        if (lbl) {
          lbl.textContent = '\u00A7 ' + slideDisplayLabel(s.id, i);
        }
      });

      // Initial state (support deep linking via URL hash)
      var initialIdx = 0;
      if (window.location.hash) {
        var targetId = window.location.hash.substring(1);
        var foundIdx = slideIds.indexOf(targetId);
        if (foundIdx !== -1) {
          initialIdx = foundIdx;
        }
      }

      window.addEventListener('hashchange', function () {
        var targetId = window.location.hash.substring(1);
        var foundIdx = slideIds.indexOf(targetId);
        if (foundIdx !== -1 && foundIdx !== currentIndex) {
          deck.goTo(foundIdx);
        }
      });

      deck._updateNav(initialIdx);
      if (initialIdx > 0) {
        var deckEl = $('#deck');
        if (deckEl) {
          deckEl.scrollTop = slides[initialIdx].offsetTop;
        } else {
          slides[initialIdx].scrollIntoView();
        }
      }
    },

    /* ============ NAVIGATION ============ */
    goTo: function (idx) {
      if (idx < 0) idx = 0;
      if (idx >= slides.length) idx = slides.length - 1;
      deck._updateNav(idx);
      var deckEl = $('#deck');
      var behavior = deck.reducedMotion ? 'auto' : 'smooth';
      if (deckEl) {
        deckEl.scrollTo({
          top: slides[idx].offsetTop,
          behavior: behavior
        });
      } else {
        slides[idx].scrollIntoView({ behavior: behavior });
      }
    },

    next: function () { deck.goTo(currentIndex + 1); },
    prev: function () { deck.goTo(currentIndex - 1); },
    first: function () { deck.goTo(0); },
    last: function () { deck.goTo(slides.length - 1); },

    _updateNav: function (idx) {
      if (idx < 0 || idx >= slides.length) return;
      currentIndex = idx;

      // Dots
      for (var i = 0; i < dotEls.length; i++) {
        dotEls[i].classList.toggle('active', i === idx);
      }

      // Progress bar
      var pct = slides.length > 1 ? (idx / (slides.length - 1)) * 100 : 100;
      if (progressBar) progressBar.style.width = pct + '%';

      // Counter
      if (counterEl) {
        var id = slideIds[idx];
        var totalMain = slideIds.filter(function (s) { return s !== 's08b'; }).length;
        var totalStr = ('0' + totalMain).slice(-2);
        if (id === 's08b') {
          counterEl.textContent = '10\u00B7b';
        } else {
          var label = slideDisplayLabel(id, idx);
          counterEl.textContent = label + ' / ' + totalStr;
        }
      }

      // If notes drawer is open, keep its content up to date
      if (notesDrawer && notesDrawer.classList.contains('open') && slides[idx]) {
        var notes = slides[idx].getAttribute('data-notes') || '(No notes for this slide)';
        if (notesContent) notesContent.textContent = notes;
      }

      // Update URL hash
      if (slideIds[idx]) {
        var desiredHash = '#' + slideIds[idx];
        if (window.location.hash !== desiredHash) {
          if (history.replaceState) {
            history.replaceState(null, '', desiredHash);
          }
        }
      }
    },

    /* ============ DOT RAIL ============ */
    _buildDotRail: function () {
      var rail = document.createElement('nav');
      rail.className = 'dot-rail';
      rail.setAttribute('aria-label', 'Slide navigation');

      slides.forEach(function (section, i) {
        var dot = document.createElement('button');
        dot.className = 'dot';
        dot.setAttribute('aria-label', 'Go to slide ' + slideDisplayLabel(section.id, i));

        // s08b gets 'sub' class
        if (section.id === 's08b') {
          dot.classList.add('sub');
        }

        // Tooltip from data-title
        var title = section.getAttribute('data-title');
        if (title) {
          dot.setAttribute('data-tooltip', title);
        }

        dot.addEventListener('click', function () {
          deck.goTo(i);
        });

        rail.appendChild(dot);
        dotEls.push(dot);
      });

      document.body.appendChild(rail);
    },

    /* ============ PROGRESS BAR ============ */
    _buildProgressBar: function () {
      progressBar = document.createElement('div');
      progressBar.className = 'progress-bar';
      progressBar.style.width = '0%';
      progressBar.setAttribute('role', 'progressbar');
      progressBar.setAttribute('aria-label', 'Presentation progress');
      document.body.appendChild(progressBar);
    },

    /* ============ SLIDE COUNTER ============ */
    _buildCounter: function () {
      counterEl = document.createElement('div');
      counterEl.className = 'slide-counter';
      counterEl.setAttribute('aria-live', 'polite');
      var totalMain = slideIds.filter(function (s) { return s !== 's08b'; }).length;
      var totalStr = ('0' + totalMain).slice(-2);
      counterEl.textContent = '01 / ' + totalStr;
      document.body.appendChild(counterEl);
    },

    /* ============ NOTES DRAWER ============ */
    _buildNotesDrawer: function () {
      notesDrawer = document.createElement('aside');
      notesDrawer.id = 'notes-drawer';
      notesDrawer.className = 'notes-drawer';
      notesDrawer.setAttribute('aria-label', 'Presenter notes');

      var heading = document.createElement('h3');
      heading.textContent = 'Presenter Notes';
      heading.style.marginTop = '0';
      heading.style.fontFamily = 'var(--font-display)';
      notesDrawer.appendChild(heading);

      notesContent = document.createElement('p');
      notesContent.id = 'notes-content';
      notesContent.className = 'notes-content';
      notesContent.style.margin = '0';
      notesDrawer.appendChild(notesContent);

      document.body.appendChild(notesDrawer);
    },

    _toggleNotes: function () {
      if (!notesDrawer) return;
      var isOpen = notesDrawer.classList.toggle('open');
      if (isOpen && slides[currentIndex]) {
        var notes = slides[currentIndex].getAttribute('data-notes') || '(No notes for this slide)';
        notesContent.textContent = notes;
      }
    },

    /* ============ HELP OVERLAY ============ */
    _buildHelpOverlay: function () {
      helpOverlay = document.createElement('div');
      helpOverlay.className = 'help-overlay';
      helpOverlay.setAttribute('aria-label', 'Keyboard shortcuts');

      var card = document.createElement('div');
      card.className = 'help-card';

      var title = document.createElement('h3');
      title.textContent = 'Keyboard Shortcuts';
      title.style.marginTop = '0';
      title.style.fontFamily = 'var(--font-display)';
      card.appendChild(title);

      var shortcuts = [
        ['Arrow keys / Space', 'Navigate slides'],
        ['F', 'Fullscreen'],
        ['N', 'Presenter notes'],
        ['M', 'Reduced motion'],
        ['?', 'This help'],
        ['Esc', 'Close overlay']
      ];

      var list = document.createElement('dl');
      list.style.margin = '0';
      list.style.display = 'grid';
      list.style.gridTemplateColumns = 'auto 1fr';
      list.style.gap = '0.5rem 1.5rem';
      list.style.alignItems = 'center';

      shortcuts.forEach(function (pair) {
        var dt = document.createElement('dt');
        var kbd = document.createElement('kbd');
        kbd.textContent = pair[0];
        dt.appendChild(kbd);
        list.appendChild(dt);

        var dd = document.createElement('dd');
        dd.textContent = pair[1];
        dd.style.margin = '0';
        list.appendChild(dd);
      });

      card.appendChild(list);

      // Close button
      var close = document.createElement('button');
      close.textContent = 'Close';
      close.style.marginTop = '1.5rem';
      close.className = 'btn';
      close.addEventListener('click', function () {
        helpOverlay.classList.remove('open');
      });
      card.appendChild(close);

      helpOverlay.appendChild(card);

      // Click backdrop to close
      helpOverlay.addEventListener('click', function (e) {
        if (e.target === helpOverlay) {
          helpOverlay.classList.remove('open');
        }
      });

      document.body.appendChild(helpOverlay);
    },

    _toggleHelp: function () {
      if (helpOverlay) helpOverlay.classList.toggle('open');
    },

    /* ============ SMALL-SCREEN OVERLAY ============ */
    _buildSmallScreenOverlay: function () {
      smallOverlay = document.createElement('div');
      smallOverlay.className = 'small-screen-overlay';

      var msg = document.createElement('div');

      var icon = document.createElement('div');
      icon.innerHTML = '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="1" y1="21" x2="23" y2="21"></line></svg>';
      icon.style.margin = '0 0 1rem';
      msg.appendChild(icon);

      var h = document.createElement('h2');
      h.textContent = 'Please open on a laptop or larger screen';
      h.style.fontFamily = 'var(--font-display)';
      h.style.fontSize = '1.5rem';
      msg.appendChild(h);

      var p = document.createElement('p');
      p.textContent = 'This presentation is designed for screens 900px wide and above.';
      p.style.color = 'var(--ink-2)';
      msg.appendChild(p);

      smallOverlay.appendChild(msg);
      document.body.appendChild(smallOverlay);
    },

    /* ============ KEYBOARD ============ */
    _setupKeyboard: function () {
      document.addEventListener('keydown', function (e) {
        // Ignore when focus is in interactive element
        if (isInteractiveTarget(e.target)) return;

        var key = e.key;

        switch (key) {
          case 'ArrowDown':
          case 'ArrowRight':
          case 'PageDown':
            e.preventDefault();
            deck.next();
            break;

          case ' ':
            e.preventDefault();
            if (e.shiftKey) {
              deck.prev();
            } else {
              deck.next();
            }
            break;

          case 'ArrowUp':
          case 'ArrowLeft':
          case 'PageUp':
            e.preventDefault();
            deck.prev();
            break;

          case 'Home':
            e.preventDefault();
            deck.first();
            break;

          case 'End':
            e.preventDefault();
            deck.last();
            break;

          case 'f':
          case 'F':
            if (e.ctrlKey || e.metaKey) return; // don't hijack Ctrl+F
            e.preventDefault();
            deck._toggleFullscreen();
            break;

          case 'n':
          case 'N':
            if (e.ctrlKey || e.metaKey) return;
            e.preventDefault();
            deck._toggleNotes();
            break;

          case 'm':
          case 'M':
            if (e.ctrlKey || e.metaKey) return;
            e.preventDefault();
            deck._toggleReducedMotion();
            break;

          case '?':
            e.preventDefault();
            deck._toggleHelp();
            break;

          case 'Escape':
            e.preventDefault();
            deck._closeOverlays();
            break;
        }
      });
    },

    _toggleFullscreen: function () {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(function () {
          // Fullscreen not available (file:// or user denied)
        });
      } else {
        document.exitFullscreen();
      }
    },

    _toggleReducedMotion: function () {
      deck.reducedMotion = !deck.reducedMotion;
      document.documentElement.classList.toggle('reduced-motion', deck.reducedMotion);
    },

    _closeOverlays: function () {
      if (notesDrawer) notesDrawer.classList.remove('open');
      if (helpOverlay) helpOverlay.classList.remove('open');
    },

    /* ============ SCROLL HANDLING ============ */
    _setupScroll: function () {
      var deckEl = $('#deck');
      if (!deckEl) return;

      var ticking = false;

      deckEl.addEventListener('scroll', function () {
        if (!ticking) {
          requestAnimationFrame(function () {
            ticking = false;
            deck._onScroll(deckEl);
          });
          ticking = true;
        }
      }, { passive: true });
    },

    _onScroll: function (deckEl) {
      var scrollTop = deckEl.scrollTop;
      var viewH = deckEl.clientHeight;

      // Determine current slide (the one covering the most of the viewport)
      var bestIdx = 0;
      var bestOverlap = 0;

      for (var i = 0; i < slides.length; i++) {
        var top = slides[i].offsetTop - deckEl.offsetTop;
        var bot = top + slides[i].offsetHeight;

        var visTop = Math.max(top, scrollTop);
        var visBot = Math.min(bot, scrollTop + viewH);
        var overlap = Math.max(0, visBot - visTop);

        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestIdx = i;
        }
      }

      deck._updateNav(bestIdx);

      // Parallax grid shift
      var maxScroll = deckEl.scrollHeight - deckEl.clientHeight;
      if (maxScroll > 0 && !deck.reducedMotion) {
        var ratio = scrollTop / maxScroll;
        var shift = ratio * 40; // max 40px
        document.documentElement.style.setProperty('--grid-shift', shift + 'px');
      }
    },

    /* ============ IN-VIEW OBSERVER (animations) ============ */
    _setupInViewObserver: function () {
      // When >= 55% visible, add .in-view
      // When < 20% visible, remove .in-view
      // Using two thresholds: 0.2 and 0.55
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var el = entry.target;
          if (entry.intersectionRatio >= 0.55) {
            el.classList.add('in-view');
            // Trigger count-up for elements inside this slide
            deck._triggerCountUp(el);
            // Resume slide module if applicable
            deck._callSlideHook(el.id, 'resume');
          } else if (entry.intersectionRatio < 0.20) {
            el.classList.remove('in-view');
            // Pause slide module if applicable
            deck._callSlideHook(el.id, 'pause');
          }
        });
      }, {
        root: $('#deck'),
        threshold: [0, 0.1, 0.2, 0.3, 0.4, 0.55, 0.6, 0.7, 0.8, 0.9, 1.0]
      });

      slides.forEach(function (s) { observer.observe(s); });
    },

    /* ============ LAZY INIT OBSERVER ============ */
    _setupLazyInitObserver: function () {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var id = el.id;
          if (initializedSet[id]) return;

          initializedSet[id] = true;

          if (NG.slides && NG.slides[id] && typeof NG.slides[id].init === 'function') {
            try {
              NG.slides[id].init(el);
            } catch (err) {
              console.error('[deck] Error initializing slide ' + id + ':', err);
            }
          }
        });
      }, {
        root: $('#deck'),
        rootMargin: '100%'
      });

      slides.forEach(function (s) { observer.observe(s); });
    },

    /* ============ OUT-VIEW OBSERVER ============ */
    _setupOutViewObserver: function () {
      // If CSS scroll-driven animation is supported, CSS handles it natively
      if (window.CSS && CSS.supports && CSS.supports('animation-timeline', 'view()')) {
        return;
      }

      var thresholds = [];
      for (var t = 0; t <= 1.0; t += 0.05) {
        thresholds.push(Math.round(t * 100) / 100);
      }

      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          var el = entry.target;
          var rootTop = entry.rootBounds ? entry.rootBounds.top : 0;
          var isOutgoing = entry.boundingClientRect.top < rootTop;

          if (isOutgoing && entry.intersectionRatio > 0.0 && entry.intersectionRatio < 0.95) {
            el.classList.add('out-view');
          } else {
            el.classList.remove('out-view');
          }
        });
      }, {
        root: $('#deck'),
        threshold: thresholds
      });

      slides.forEach(function (s) { observer.observe(s); });
    },

    /* ============ SLIDE HOOKS (pause/resume) ============ */
    _callSlideHook: function (id, hook) {
      if (!id) return;
      if (NG.slides && NG.slides[id] && typeof NG.slides[id][hook] === 'function') {
        try {
          NG.slides[id][hook]();
        } catch (err) {
          console.error('[deck] Error calling ' + hook + ' on slide ' + id + ':', err);
        }
      }
    },

    /* ============ COUNT-UP ANIMATION ============ */
    _triggerCountUp: function (slideEl) {
      var elems = $$('.count-up', slideEl);
      elems.forEach(function (el) {
        // Prevent re-triggering if already animated
        if (el._countUpDone) {
          // Reset so it replays on revisit
          el._countUpDone = false;
        }
        deck._animateCountUp(el);
      });
    },

    _animateCountUp: function (el) {
      var target = parseFloat(el.getAttribute('data-target'));
      if (isNaN(target)) return;

      // If reduced motion, set instantly
      if (deck.reducedMotion) {
        el.textContent = deck._formatCountValue(target, el);
        el._countUpDone = true;
        return;
      }

      var duration = 1000; // ~1 second
      var startTime = null;
      var startVal = 0;

      function step(ts) {
        if (!startTime) startTime = ts;
        var elapsed = ts - startTime;
        var progress = Math.min(elapsed / duration, 1);

        // Ease out
        var eased = 1 - Math.pow(1 - progress, 3);
        var current = startVal + (target - startVal) * eased;

        el.textContent = deck._formatCountValue(current, el);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          el.textContent = deck._formatCountValue(target, el);
          el._countUpDone = true;
        }
      }

      requestAnimationFrame(step);
    },

    _formatCountValue: function (val, el) {
      // Check if target is integer
      var target = parseFloat(el.getAttribute('data-target'));
      if (Number.isInteger(target)) {
        return String(Math.round(val));
      }
      // Float: show one decimal
      return val.toFixed(1);
    }
  };

  NG.deck = deck;

  document.addEventListener('DOMContentLoaded', function () {
    NG.deck.init();
  });

})();
