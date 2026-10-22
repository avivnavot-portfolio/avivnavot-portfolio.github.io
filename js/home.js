/* Homepage interactions
   1. Dot game: a row of dots drifting right. Hover a dot and it bounces
      softly like a ping-pong ball; the text above it lifts with it.
   2. Project cards stack on scroll, earlier cards easing back a little. */

(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- split text into letters ---------- */
  function splitLetters(el) {
    var letters = [];
    var words = el.textContent.split(/(\s+)/);
    el.textContent = "";
    words.forEach(function (w) {
      if (/^\s+$/.test(w)) { el.appendChild(document.createTextNode(" ")); return; }
      if (!w) return;
      var ws = document.createElement("span");
      ws.className = "lw";
      w.split("").forEach(function (c) {
        var s = document.createElement("span");
        s.className = "lt";
        s.textContent = c;
        ws.appendChild(s);
        letters.push(s);
      });
      el.appendChild(ws);
    });
    el.setAttribute("aria-label", words.join(""));
    return letters;
  }

  /* ---------- 1. dot game ---------- */
  function initDots() {
    var row = document.querySelector(".hm-dots");
    if (!row) return;
    var hero = row.closest(".hm-hero") || row.parentElement;
    var letters = [];
    document.querySelectorAll("[data-lift]").forEach(function (el) {
      var weight = el.classList.contains("hm-hello") ? 0.78 : 1;
      splitLetters(el).forEach(function (s) { letters.push({ el: s, x: 0, cur: 0, w: weight }); });
    });

    var dots = [], D = 30, gap = 90, W = 0, offset = 0, A = 80;
    var px = -9999, py = -9999, active = false, visible = true;

    function build() {
      D = row.offsetHeight;
      W = window.innerWidth;
      gap = D * 2.2;
      A = Math.max(30, Math.min(96, D * 2.45));
      var n = Math.ceil(W / gap) + 2;
      while (dots.length < n) {
        var el = document.createElement("span");
        el.className = "hm-dot";
        row.appendChild(el);
        dots.push({ el: el, t: -1, hov: false, hs: 0, h: 0 });
      }
      while (dots.length > n) dots.pop().el.remove();
      letters.forEach(function (l) {
        var r = l.el.getBoundingClientRect();
        l.x = r.left + r.width / 2;
      });
    }

    /* soft ping-pong: one bounce, a small one, a tiny one */
    var B = [[0, 0.58, 1], [0.58, 0.88, 0.26], [0.88, 1.06, 0.07]];
    var END = 1.06;
    function bounce(t) {
      for (var i = 0; i < B.length; i++) {
        if (t >= B[i][0] && t < B[i][1]) {
          var u = (t - B[i][0]) / (B[i][1] - B[i][0]);
          return 4 * u * (1 - u) * B[i][2];
        }
      }
      return 0;
    }
    function squash(t) {
      var s = 0;
      [0, 0.58, 0.88].forEach(function (c, i) { var k = (t - c) / 0.045; s += Math.exp(-k * k) * (i === 0 ? 0.1 : 0.14 / (i + 0.6)); });
      return s;
    }

    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduce) offset = (offset + dt * 26) % gap;
      var rr = row.getBoundingClientRect();
      var cy = rr.top + D / 2;
      var span = dots.length * gap;
      var sigma = gap * 0.6;

      dots.forEach(function (d, i) {
        var x = ((i * gap + offset) % span) - gap + gap * 0.35;
        d.x = x + D / 2;
        var dx = px - d.x, dy = py - (cy - d.h);
        var inside = dx * dx + dy * dy < Math.pow(D * 0.62 + 6, 2);
        if (inside && !d.hov && !reduce && (d.t < 0 || d.t > 0.5)) d.t = 0;
        d.hov = inside;
        d.hs += ((inside ? 1 : 0) - d.hs) * 0.08;
        if (d.t >= 0) { d.t += dt; if (d.t > END) d.t = -1; }
        var tt = d.t < 0 ? 0 : d.t;
        d.h = d.t < 0 ? 0 : bounce(tt) * A;
        var sq = d.t < 0 ? 0 : squash(tt);
        d.el.style.transform = "translate3d(" + x.toFixed(1) + "px," + (-d.h).toFixed(1) + "px,0) scale(" + (1 + sq).toFixed(3) + "," + (1 - sq).toFixed(3) + ")";
      });

      letters.forEach(function (l) {
        var target = 0;
        for (var i = 0; i < dots.length; i++) {
          var d = dots[i];
          if (d.hs < 0.002 && d.h < 0.5) continue;
          var k = (l.x - d.x) / sigma;
          var v = (d.hs * 12 + d.h * 0.32) * Math.exp(-k * k);
          if (v > target) target = v;
        }
        target *= l.w;
        l.cur += (target - l.cur) * 0.12;
        if (Math.abs(l.cur) < 0.02 && target === 0) l.cur = 0;
        l.el.style.transform = l.cur ? "translate3d(0," + (-l.cur).toFixed(2) + "px,0)" : "";
      });

      if (visible) window.requestAnimationFrame(frame); else active = false;
    }
    function start() { if (!active) { active = true; last = performance.now(); window.requestAnimationFrame(frame); } }

    build();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(build);
    window.addEventListener("resize", function () { build(); });
    window.addEventListener("pointermove", function (e) { px = e.clientX; py = e.clientY; }, { passive: true });
    document.addEventListener("pointerleave", function () { px = py = -9999; });
    window.addEventListener("touchstart", function (e) { var t = e.touches[0]; px = t.clientX; py = t.clientY; }, { passive: true });
    window.addEventListener("touchmove", function (e) { var t = e.touches[0]; px = t.clientX; py = t.clientY; }, { passive: true });
    window.addEventListener("touchend", function () { px = py = -9999; }, { passive: true });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }).observe(hero);
    }
    start();
  }

  /* ---------- 2. stacked project cards ---------- */
  function initStack() {
    var slots = Array.prototype.slice.call(document.querySelectorAll(".hm-slot"));
    if (!slots.length) return;
    slots.forEach(function (s, i) { s.style.setProperty("--i", i); });
    var cards = slots.map(function (s) { return s.querySelector(".hm-card"); });
    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight;
      var arrive = slots.map(function (s) {
        var stick = parseFloat(getComputedStyle(s).top) || 0;
        var top = s.getBoundingClientRect().top;
        return Math.max(0, Math.min(1, (vh - top) / Math.max(1, vh - stick)));
      });
      cards.forEach(function (c, i) {
        var k = 0;
        for (var j = i + 1; j < slots.length; j++) k += arrive[j];
        var sc = 1 - 0.05 * k;
        c.style.transform = k > 0.001 ? "scale(" + sc.toFixed(4) + ")" : "";
      });
    }
    function onScroll() { if (!ticking) { ticking = true; window.requestAnimationFrame(update); } }
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initDots();
    initStack();
  });
})();
