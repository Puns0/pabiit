/* ═══════════════════════════════════════════════════════════════════════════
   PRESENTATION.JS — Scroll interactions, reveal animations, counters
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const container = document.getElementById('slidesContainer');
  const progressBar = document.getElementById('progressBar');
  const slideCounter = document.getElementById('slideCounter');
  const slides = document.querySelectorAll('.slide');
  const totalSlides = slides.length;

  // ── Progress bar + Slide counter on scroll ───────────────────────────
  function updateScrollUI() {
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight - container.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = progress + '%';

    // Determine current slide
    let currentSlide = 1;
    for (let i = 0; i < slides.length; i++) {
      const rect = slides[i].getBoundingClientRect();
      if (rect.top <= window.innerHeight * 0.5) {
        currentSlide = i + 1;
      }
    }

    const padded = String(currentSlide).padStart(2, '0');
    const total = String(totalSlides).padStart(2, '0');
    slideCounter.textContent = padded + ' / ' + total;
  }

  container.addEventListener('scroll', updateScrollUI, { passive: true });
  updateScrollUI();

  // ── Slide-level transitions (active / exiting) ───────────────────────
  // Observe each .slide to add/remove active and exiting classes
  var lastActiveIndex = -1;

  var slideObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      var slide = entry.target;

      if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
        // This slide is entering — make it active
        slide.classList.add('active');
        slide.classList.remove('exiting');

        var idx = Array.prototype.indexOf.call(slides, slide);

        // Mark other slides as exiting if they were previously active
        slides.forEach(function (s, i) {
          if (i !== idx && s.classList.contains('active')) {
            s.classList.remove('active');
            s.classList.add('exiting');
          }
        });

        lastActiveIndex = idx;
      }
    });
  }, {
    root: container,
    rootMargin: '0px',
    threshold: [0.0, 0.4, 0.6, 1.0],
  });

  slides.forEach(function (slide) {
    slideObserver.observe(slide);
  });

  // ── IntersectionObserver — Reveal animations (bidirectional) ──────────
  var revealElements = document.querySelectorAll('.reveal');

  var revealObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      } else {
        // Remove visible when leaving so it re-animates on re-entry
        entry.target.classList.remove('visible');
      }
    });
  }, {
    root: container,
    rootMargin: '0px',
    threshold: 0.15,
  });

  revealElements.forEach(function (el) {
    revealObserver.observe(el);
  });

  // ── Keyboard navigation ──────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      var current = getCurrentSlideIndex();
      if (current < totalSlides - 1) {
        slides[current + 1].scrollIntoView({ behavior: 'smooth' });
      }
    }

    if (e.key === 'ArrowUp' || e.key === 'PageUp') {
      e.preventDefault();
      var current = getCurrentSlideIndex();
      if (current > 0) {
        slides[current - 1].scrollIntoView({ behavior: 'smooth' });
      }
    }

    if (e.key === 'Home') {
      e.preventDefault();
      slides[0].scrollIntoView({ behavior: 'smooth' });
    }
    if (e.key === 'End') {
      e.preventDefault();
      slides[totalSlides - 1].scrollIntoView({ behavior: 'smooth' });
    }
  });

  function getCurrentSlideIndex() {
    var closest = 0;
    var closestDist = Infinity;
    for (var i = 0; i < slides.length; i++) {
      var rect = slides[i].getBoundingClientRect();
      var dist = Math.abs(rect.top);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    }
    return closest;
  }

  // ── Trigger first slide immediately ──────────────────────────────────
  setTimeout(function () {
    var firstSlide = slides[0];
    if (firstSlide) {
      firstSlide.classList.add('active');
    }
    var firstReveal = document.querySelector('#slide-1 .reveal');
    if (firstReveal) {
      firstReveal.classList.add('visible');
    }
  }, 100);

})();
