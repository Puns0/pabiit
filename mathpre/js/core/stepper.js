/* ============================================================
   stepper.js — Animation & step sequencer for precomputed steps
   ============================================================ */
(function () {
  'use strict';

  window.NG = window.NG || {};

  /**
   * Stepper manages stepping forward/backward, playing, pausing,
   * speed control, and reset over an array of precomputed self-contained steps.
   */
  function Stepper(opts) {
    opts = opts || {};
    this.steps = Array.isArray(opts.steps) ? opts.steps : [];
    this.onStep = typeof opts.onStep === 'function' ? opts.onStep : function () {};
    this.onEnd = typeof opts.onEnd === 'function' ? opts.onEnd : function () {};
    this.intervalMs = typeof opts.intervalMs === 'number' ? opts.intervalMs : 700;
    this.speedMultiplier = 1;

    // index = -1 denotes the initial state before step 0
    this._index = -1;
    this._playing = false;
    this._timer = null;
  }

  Object.defineProperty(Stepper.prototype, 'index', {
    get: function () { return this._index; }
  });

  Object.defineProperty(Stepper.prototype, 'length', {
    get: function () { return this.steps.length; }
  });

  Object.defineProperty(Stepper.prototype, 'playing', {
    get: function () { return this._playing; }
  });

  Stepper.prototype._scheduleNext = function () {
    if (!this._playing) return;
    var self = this;
    var delay = Math.max(25, this.intervalMs / this.speedMultiplier);

    this._timer = setTimeout(function () {
      self._timer = null;
      if (!self._playing) return;

      var hasMore = self.next();
      if (hasMore && self._playing) {
        self._scheduleNext();
      }
    }, delay);
  };

  /**
   * Advance one step forward. Returns true if advanced, false if at end.
   */
  Stepper.prototype.next = function () {
    if (this._index >= this.steps.length - 1) {
      this.pause();
      this.onEnd();
      return false;
    }

    this._index++;
    var currentStep = this.steps[this._index];
    this.onStep(this._index, currentStep, 'forward');

    if (this._index === this.steps.length - 1) {
      this.pause();
      this.onEnd();
    }
    return true;
  };

  /**
   * Step one step backward. Returns true if stepped back, false if already at initial state (-1).
   */
  Stepper.prototype.prev = function () {
    if (this._index <= -1) {
      return false;
    }

    this._index--;
    var step = this._index >= 0 ? this.steps[this._index] : null;
    this.onStep(this._index, step, 'backward');
    return true;
  };

  /**
   * Jump directly to step index i (-1 to length - 1).
   */
  Stepper.prototype.goto = function (i) {
    if (this.steps.length === 0) return;
    var target = Math.max(-1, Math.min(this.steps.length - 1, i));
    if (target === this._index) return;

    var dir = target > this._index ? 'forward' : 'backward';
    this._index = target;
    var step = this._index >= 0 ? this.steps[this._index] : null;
    this.onStep(this._index, step, dir);
  };

  /**
   * Reset stepper to initial state before step 0.
   */
  Stepper.prototype.reset = function () {
    this.pause();
    this._index = -1;
    this.onStep(-1, null, 'reset');
  };

  /**
   * Start automated forward playback.
   */
  Stepper.prototype.play = function () {
    if (this._playing) return;
    if (this.steps.length === 0) return;

    // If at end, loop back to beginning
    if (this._index >= this.steps.length - 1) {
      this.reset();
    }

    this._playing = true;

    // Take immediate first step if at initial state
    if (this._index < this.steps.length - 1) {
      this.next();
      if (this._playing && this._index < this.steps.length - 1) {
        this._scheduleNext();
      }
    }
  };

  /**
   * Pause automated playback. Safe to call anytime.
   */
  Stepper.prototype.pause = function () {
    this._playing = false;
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  };

  /**
   * Toggle between play and pause.
   */
  Stepper.prototype.toggle = function () {
    if (this._playing) {
      this.pause();
    } else {
      this.play();
    }
  };

  /**
   * Set speed multiplier between 0.25 and 4.0.
   */
  Stepper.prototype.setSpeed = function (multiplier) {
    var m = typeof multiplier === 'number' ? multiplier : 1;
    this.speedMultiplier = Math.max(0.25, Math.min(4.0, m));

    // Reschedule next tick if playing
    if (this._playing && this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
      this._scheduleNext();
    }
  };

  NG.Stepper = Stepper;

})();
