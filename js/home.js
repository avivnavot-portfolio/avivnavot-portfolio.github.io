/* Homepage interactions
   1. Dot game: a row of dots drifting right. Hover a dot and it bounces
      softly like a ping-pong ball; the text above it lifts with it.
   2. Project cards stack on scroll, earlier cards easing back a little. */

(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- split text into letters (keeps inline elements such as <span data-cursor> and <br>) ---------- */
  function splitLetters(el) {
    var letters = [];
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
    function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 1) { if (n.tagName !== "BR") walk(n); return; }
        if (n.nodeType !== 3) return;
        var frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(" ")); return; }
          var ws = document.createElement("span");
          ws.className = "lw";
          ws.setAttribute("aria-hidden", "true");
          w.split("").forEach(function (c) {
            var s = document.createElement("span");
            s.className = "lt";
            s.textContent = c;
            ws.appendChild(s);
            letters.push(s);
          });
          frag.appendChild(ws);
        });
        node.replaceChild(frag, n);
      });
    }
    walk(el);
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
        el.style.setProperty("--n", dots.length);
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

  /* ---------- 3. hero entrance ---------- */
  function initIntro() {
    var hero = document.querySelector(".hm-hero");
    if (!hero) return;
    hero.querySelectorAll(".hm-hello .lt").forEach(function (l, i) { l.style.setProperty("--n", i); });
    var note = hero.querySelector(".hm-note"), row = hero.querySelector(".hm-dots");
    if (note && !reduce) note.classList.add("is-typing");
    var started = false;
    function go() {
      if (started) return; started = true;
      /* "I'm Aviv" waits until the last dot has rolled in (0.25s start, 30ms apart, 0.65s each) */
      var n = row ? row.querySelectorAll(".hm-dot").length : 0;
      var dotsEnd = 0.25 + Math.max(0, n - 1) * 0.03 + 0.65;
      var nameDelay = Math.max(0.9, dotsEnd - 0.45);   /* starts while the last dots are still landing */
      hero.style.setProperty("--name-delay", nameDelay.toFixed(2) + "s");
      hero.classList.add("hm-in");
      setTimeout(function () { if (row) row.classList.add("is-done"); }, dotsEnd * 1000 + 100);
      if (note && !reduce) setTimeout(function () { typeNote(note); }, (nameDelay + 0.75) * 1000);   /* while "I'm Aviv" is halfway in */
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { window.requestAnimationFrame(go); });
    setTimeout(go, 1200);
  }

  /* typewriter: letter by letter, with a blinking caret that leaves at the end */
  function typeNote(note) {
    var letters = Array.prototype.slice.call(note.querySelectorAll(".lt"));
    var caret = document.createElement("span");
    caret.className = "hm-caret"; caret.setAttribute("aria-hidden", "true");
    var i = 0;
    (function step() {
      if (i >= letters.length) {
        note.classList.remove("is-typing");
        setTimeout(function () { caret.remove(); }, 1600);
        return;
      }
      var l = letters[i++];
      l.classList.add("on");
      l.parentNode.insertBefore(caret, l.nextSibling);
      var ch = l.textContent, next = letters[i];
      var pause = /[,.]/.test(ch) ? 260 : (next && next.parentNode !== l.parentNode ? 70 : 38);
      setTimeout(step, pause);
    })();
  }

  /* ---------- 4. green aura: a small soft glow, with a flame-like trail behind it ---------- */
  function initGlow() {
    var host = document.querySelector(".hm-glow");
    if (!host || reduce) return;
    var fine = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    var N = 16, parts = [];
    for (var i = 0; i < N; i++) {
      var el = document.createElement("i");
      var size = Math.round(260 - i * (190 / (N - 1)));      /* head 260px, tail tapering to ~70px */
      el.style.setProperty("--s", size + "px");
      host.appendChild(el);
      parts.push({ el: el, x: 0, y: 0 });
    }
    var tx = window.innerWidth * 0.8, ty = window.innerHeight * 0.3, speed = 0, lastX = tx, lastY = ty, t0 = performance.now(), seen = true, vis = 0;
    parts.forEach(function (p) { p.x = tx; p.y = ty; });
    if (fine) window.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; seen = true; }, { passive: true });
    document.addEventListener("mouseleave", function () { seen = false; });
    (function frame(now) {
      var head = parts[0];
      head.x += (tx - head.x) * 0.12; head.y += (ty - head.y) * 0.12;          /* slight delay behind the cursor */
      var v = Math.hypot(head.x - lastX, head.y - lastY); lastX = head.x; lastY = head.y;
      speed += (Math.min(1, v / 26) - speed) * 0.08;                             /* eases out slowly, so the trail lingers */
      var tsec = (now - t0) / 1000;
      for (var i = 1; i < N; i++) {                                              /* each part trails the one before it */
        var p = parts[i], q = parts[i - 1];
        p.x += (q.x - p.x) * 0.3; p.y += (q.y - p.y) * 0.3;
        p.y -= speed * 0.35 * (i / N);                                           /* a flame licks slightly upward */
        p.x += Math.sin(tsec * 6 + i * 0.9) * speed * 0.6;                       /* and flickers a little */
      }
      var breathe = 1 + Math.sin(tsec * 1.7) * 0.07 + Math.sin(tsec * 0.8 + 1.1) * 0.04;
      vis += ((seen ? 1 : 0) - vis) * 0.05;
      var base = (fine ? 1 : 0.85) * vis;
      parts.forEach(function (p, i) {
        var k = i / (N - 1);
        var s = i === 0 ? breathe * (1 + speed * 0.3) : (0.75 + speed * 0.45) * (1 + Math.sin(tsec * 3 + i) * 0.05);
        var o = i === 0 ? base : base * Math.min(1, speed * 1.6) * (1 - k) * 0.85;
        p.el.style.transform = "translate3d(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px,0) scale(" + s.toFixed(3) + ")";
        p.el.style.opacity = o.toFixed(3);
      });
      window.requestAnimationFrame(frame);
    })(performance.now());
  }

    /* scroll progress (0 at top, 1 at the bottom) drives the left glow */
  function initSkyScroll() {
    var sky = document.querySelector(".hm-orbit i");
    if (!sky) return;
    var raf = 0;
    function upd() {
      raf = 0;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var t = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      sky.style.setProperty("--sp", t.toFixed(4));
    }
    function req() { if (!raf) raf = requestAnimationFrame(upd); }
    window.addEventListener("scroll", req, { passive: true });
    window.addEventListener("resize", req);
    upd();
  }

  document.addEventListener("DOMContentLoaded", function () {
    initDots();
    initIntro();
    initGlow(); initSkyScroll();
    initStack();
  });
})();
