/* Case study interactions
   1. Typewriter hero headline (types the visible language)
   2. Affinity board: notes start scattered (going wide) and settle
      into themed clusters as you scroll (narrowing down)
   3. Muted autoplay for looping videos in view */

(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.body.classList.add("js-reveal");

  /* ---------- 1. typewriter ---------- */
  function prepTyped(el) {
    if (el.getAttribute("data-tw-ready")) return el.querySelectorAll(".tw-ch");
    var chars = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split("").forEach(function (c) {
            var s = document.createElement("span");
            s.className = "tw-ch";
            s.textContent = c;
            frag.appendChild(s);
            chars.push(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    })(el);
    el.setAttribute("data-tw-ready", "1");
    return chars;
  }

  var twTimer = null;
  function typeHeadline() {
    var h1 = document.querySelector("[data-typewriter]");
    if (!h1) return;
    var lang = document.documentElement.getAttribute("lang") === "he" ? "he" : "en";
    var target = h1.querySelector("." + lang);
    if (!target) return;
    var chars = Array.prototype.slice.call(prepTyped(target));
    var old = h1.querySelector(".tw-caret");
    if (old) old.remove();
    clearTimeout(twTimer);
    if (reduce) { chars.forEach(function (c) { c.classList.add("on"); }); return; }
    chars.forEach(function (c) { c.classList.remove("on"); });
    var caret = document.createElement("span");
    caret.className = "tw-caret";
    caret.setAttribute("aria-hidden", "true");
    var i = 0;
    function step() {
      if (i < chars.length) {
        chars[i].classList.add("on");
        chars[i].after(caret);
        var ch = chars[i].textContent;
        i++;
        twTimer = setTimeout(step, ch === "." || ch === "," ? 260 : 34 + Math.random() * 30);
      } else {
        twTimer = setTimeout(function () { caret.remove(); }, 2200);
      }
    }
    twTimer = setTimeout(step, 350);
  }

  /* ---------- 2. affinity board ---------- */
  function seeded(seed) {
    return function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function smooth(t) { return 0.5 - Math.cos(Math.PI * t) / 2; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function initAffinity(section) {
    var board = section.querySelector(".cs-board");
    var clusters = Array.prototype.slice.call(section.querySelectorAll(".cs-cluster"));
    var layout = null;

    function isStatic() { return window.innerWidth < 900 || reduce; }

    function compute() {
      if (isStatic()) {
        section.classList.add("static", "converged");
        section.querySelectorAll(".cs-note, .cs-cluster-label").forEach(function (n) {
          n.style.transform = ""; n.style.width = "";
        });
        layout = null;
        return;
      }
      section.classList.remove("static");
      var rtl = document.documentElement.getAttribute("dir") === "rtl";
      var pad = parseFloat(getComputedStyle(board).paddingLeft) || 24;
      var W = board.clientWidth - pad * 2;
      var H = board.clientHeight;
      var gap = 12;
      var cols = clusters.length;
      var colW = (W - gap * (cols - 1)) / cols;
      var rnd = seeded(7);
      layout = [];

      section.querySelectorAll(".cs-note").forEach(function (n) { n.style.width = colW + "px"; });

      var labelTop = 22, labelH = 44;
      clusters.forEach(function (c, ci) {
        var colIndex = rtl ? cols - 1 - ci : ci;
        var x = pad + colIndex * (colW + gap);
        var l = c.querySelector(".cs-cluster-label");
        if (l) { l.style.width = colW + "px"; l.style.transform = "translate(" + x + "px," + labelTop + "px)"; }
        var y = labelTop + labelH;
        c.querySelectorAll(".cs-note").forEach(function (el) {
          var h = el.offsetHeight;
          layout.push({
            el: el,
            sx: pad + rnd() * (W - colW),
            sy: 16 + rnd() * Math.max(10, H * 0.8 - h - 24),
            sr: (rnd() - 0.5) * 9,
            gx: x, gy: y, gr: (rnd() - 0.5) * 1.6,
            stagger: ci * 0.02 + rnd() * 0.04
          });
          y += h + 8;
        });
      });
      start();
    }

    function progress() {
      var r = section.getBoundingClientRect();
      var range = r.height - window.innerHeight;
      return range > 0 ? clamp(-r.top / range, 0, 1) : 1;
    }

    /* each note eases toward its own scroll-driven target, with a small
       stagger, so the board flows instead of moving in lockstep */
    var running = false, visible = true, clock = 0;
    function render() {
      if (!layout) { running = false; return; }
      clock += 0.016;
      var p = progress();
      var moving = false, tSum = 0;
      layout.forEach(function (o, i) {
        var target = smooth(clamp((p - 0.1 - o.stagger) / 0.6, 0, 1));
        if (o.t === undefined) o.t = target;
        o.t += (target - o.t) * 0.055;
        if (Math.abs(target - o.t) > 0.001) moving = true;
        tSum += o.t;
        var bob = Math.sin(clock * 0.7 + i * 0.9) * 1.4 * (1 - o.t);   /* idle float while scattered */
        var x = o.sx + (o.gx - o.sx) * o.t;
        var y = o.sy + (o.gy - o.sy) * o.t + bob;
        var rot = o.sr + (o.gr - o.sr) * o.t;
        o.el.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px,0) rotate(" + rot.toFixed(2) + "deg)";
      });
      section.classList.toggle("converged", tSum / layout.length > 0.8);
      if (visible) window.requestAnimationFrame(render); else running = false;
    }
    function start() { if (!running && layout) { running = true; window.requestAnimationFrame(render); } }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) start(); }, { rootMargin: "200px" }).observe(section);
    }
    compute();
    start();
    var rt;
    window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(compute, 150); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(compute);
    return compute;
  }

  /* ---------- 3. videos ---------- */
  function initVideos() {
    var vids = document.querySelectorAll("video[data-autoplay]");
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { var pr = e.target.play(); if (pr && pr.catch) pr.catch(function () {}); }
        else e.target.pause();
      });
    }, { threshold: 0.4 });
    vids.forEach(function (v) { io.observe(v); });
  }

  /* reveal early: as soon as an element is about to enter the screen */
  /* let items inside lists and grids float in one by one instead of as a block */
  function splitReveals() {
    [".cs-acc", ".cs-phones", ".cs-kpi-list", ".cs-swatches", ".cs-type", ".cs-meta", ".cs-tree", ".cs-bridge", ".cs-wires", ".cs-quotes", ".cs-focus"].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (box) {
        var holder = box.classList.contains("reveal") ? box : box.closest(".cs-phones-panel.reveal, .cs-card.reveal");
        if (box.classList.contains("reveal")) box.classList.remove("reveal");
        if (holder && holder !== box && sel === ".cs-phones") holder.classList.remove("reveal");
        Array.prototype.forEach.call(box.children, function (c) {
          if (c.classList.contains("cs-label") || c.classList.contains("cs-link")) return;
          c.classList.add("reveal");
        });
      });
    });
  }

  function initEarlyReveal() {
    splitReveals();
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    /* revealed while scrolling: wait until an element is a little inside the screen,
       and stagger elements that arrive together */
    var io = new IntersectionObserver(function (es) {
      var arriving = es.filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left; });
      arriving.forEach(function (e, i) {
        e.target.style.setProperty("--rd", Math.min(i, 6) * 110 + "ms");
        e.target.classList.add("in");
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.06 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* headline: words rise in one after another */
  function revealWords() {
    var h = document.querySelector("[data-words]");
    if (!h) return;
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var w = document.createElement("span");
            w.className = "w"; w.textContent = part; w.style.setProperty("--wd", (i++ * 70 + 150) + "ms");
            frag.appendChild(w);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1) { walk(n); }
      });
    })(h);
    if (reduce) { h.classList.add("go"); return; }
    window.requestAnimationFrame(function () { window.requestAnimationFrame(function () { h.classList.add("go"); }); });
  }

  /* nav: shrink to a centred capsule once you start scrolling, back at the very top */
  function initCompactNav() {
    var on = false;
    function check() { var c = window.scrollY > 8; if (c !== on) { on = c; document.body.classList.toggle("nav-compact", c); } }
    window.addEventListener("scroll", check, { passive: true });
    check();
  }

  /* cursor: a graphite dot that softens over text and turns lime over things you can press */
  function initCursor() {
    if (!window.matchMedia || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    var dot = document.createElement("div");
    dot.className = "cs-cursor is-hidden";
    document.body.appendChild(dot);
    document.body.classList.add("has-cursor");
    var x = -100, y = -100, cx = -100, cy = -100;
    var linkSel = "a, button, summary, video, .cs-phone, .cs-wire-item, .cs-note, .cs-figure, .hm-dot";
    var textSel = "p, h1, h2, h3, h4, blockquote, li, figcaption, td, th, .cs-label, .cs-pill, .cs-node, .t, .d";
    document.addEventListener("mousemove", function (e) {
      x = e.clientX; y = e.clientY;
      dot.classList.remove("is-hidden");
      var t = e.target;
      var isLink = t.closest && t.closest(linkSel);
      var isText = !isLink && t.closest && t.closest(textSel);
      dot.classList.toggle("is-link", !!isLink);
      dot.classList.toggle("is-text", !!isText);
    }, { passive: true });
    document.addEventListener("mouseleave", function () { dot.classList.add("is-hidden"); });
    (function loop() {
      cx += (x - cx) * 0.28; cy += (y - cy) * 0.28;
      dot.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0)";
      window.requestAnimationFrame(loop);
    })();
  }


  /* hero stage: chefs and plates flow out from behind the phone as you scroll */
  function initStage(stage) {
    var phone = stage.querySelector(".st-phone, .kz-c");
    var items = Array.prototype.slice.call(stage.querySelectorAll(".st-chef, .st-dish, .kz-out"));
    if (!phone || !items.length) return;
    if (reduce) return;
    var data = [], cur = 0, target = 0, running = false;
    function measure() {
      var pcx = phone.offsetLeft + phone.offsetWidth / 2, pcy = phone.offsetTop + phone.offsetHeight / 2;
      data = items.map(function (el, i) {
        var cx = el.offsetLeft + el.offsetWidth / 2, cy = el.offsetTop + el.offsetHeight / 2;
        var dist = Math.hypot(pcx - cx, pcy - cy);
        return { el: el, dx: pcx - cx, dy: pcy - cy, dist: dist };
      });
      var max = Math.max.apply(null, data.map(function (d) { return d.dist; })) || 1;
      data.forEach(function (d) { d.delay = 0.22 * ((d.el.classList.contains("st-chef") || d.el.classList.contains("kz-out")) ? 0.15 : 0.35 + 0.65 * d.dist / max); });
    }
    function smooth(t) { return 0.5 - Math.cos(Math.PI * t) / 2; }
    function progress() {
      var r = stage.getBoundingClientRect(), vh = window.innerHeight;
      return Math.max(0, Math.min(1, (vh - r.top) / (0.45 * vh + 0.5 * r.height)));
    }
    function paint() {
      data.forEach(function (d) {
        var e = smooth(Math.max(0, Math.min(1, (cur - d.delay) / (1 - 0.22))));
        var k = 1 - e;
        d.el.style.transform = "translate3d(" + (d.dx * k).toFixed(1) + "px," + (d.dy * k).toFixed(1) + "px,0) scale(" + (0.55 + 0.45 * e).toFixed(3) + ")";
      });
    }
    function tick() {
      cur += (target - cur) * 0.085;
      if (Math.abs(target - cur) < 0.0005) cur = target;
      paint();
      if (cur !== target) window.requestAnimationFrame(tick); else running = false;
    }
    function update() {
      target = progress();
      if (!running) { running = true; window.requestAnimationFrame(tick); }
    }
    measure();
    cur = target = progress();
    paint();
    items.forEach(function (el) { el.style.willChange = "transform"; });
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", function () { measure(); update(); });
  }


  /* Jaco hero: the box stays pinned while you scroll, opens, and letters pop out */
  function initJacoBox(wrap) {
    var pin = wrap.querySelector(".jc-pin"), stage = wrap.querySelector(".jc-stage");
    var closed = wrap.querySelector(".jc-closed"), open = wrap.querySelector(".jc-open");
    var shadow = wrap.querySelector(".jc-shadow"), hint = wrap.querySelector(".jc-hint");
    var letters = Array.prototype.slice.call(wrap.querySelectorAll(".jc-l"));
    if (!pin || !closed || !open) return;
    if (reduce) { closed.style.opacity = "0"; open.style.opacity = "1"; letters.forEach(function (l) { l.style.opacity = "1"; }); return; }
    wrap.classList.add("on");
    var cur = 0, target = 0, running = false, topPx = 0, travel = 1, ox = 0, oy = 0, data = [];
    function clamp(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
    function smooth(t) { return 0.5 - Math.cos(Math.PI * t) / 2; }
    function back(t) { var c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
    function measure() {
      var vh = window.innerHeight, h = pin.offsetHeight;
      topPx = Math.max(84, (vh - h) / 2 + 24);
      pin.style.top = topPx + "px";
      travel = Math.round(vh * 0.95);
      wrap.style.height = (h + travel) + "px";
      var w = stage.offsetWidth, sh = stage.offsetHeight;
      ox = (w < 560 ? 0.59 : 0.57) * w; oy = 0.6 * sh;   /* the open box's mouth */
      data = letters.map(function (l, i) {
        var cx = l.offsetLeft + l.offsetWidth / 2, cy = l.offsetTop + l.offsetHeight / 2;
        return { el: l, dx: ox - cx, dy: oy - cy, d: 0.48 + 0.028 * i };
      });
    }
    function progress() { return clamp((topPx - wrap.getBoundingClientRect().top) / travel); }
    function paint() {
      var p = cur;
      var lift = smooth(clamp(p / 0.4));
      var wob = Math.sin(lift * Math.PI * 3) * 2.2 * (1 - 0.5 * lift);   /* a little excited wiggle before it opens */
      var fadeOut = smooth(clamp((p - 0.36) / 0.14));
      closed.style.transform = "translate3d(0," + (-4 * lift).toFixed(2) + "%,0) rotate(" + wob.toFixed(2) + "deg) scale(" + (1 + 0.05 * lift + 0.04 * fadeOut).toFixed(3) + ")";
      closed.style.opacity = (1 - fadeOut).toFixed(3);
      closed.style.filter = "drop-shadow(0 30px 40px rgba(53,54,59,.14)) blur(" + (10 * fadeOut).toFixed(1) + "px)";
      var o = smooth(clamp((p - 0.38) / 0.16));
      open.style.opacity = o.toFixed(3);
      open.style.transform = "translate3d(0," + (3 * (1 - o)).toFixed(2) + "%,0) scale(" + (1.06 - 0.06 * o).toFixed(3) + ")";
      open.style.filter = "drop-shadow(0 30px 40px rgba(53,54,59,.12)) blur(" + (10 * (1 - o)).toFixed(1) + "px)";
      if (shadow) shadow.style.transform = "scaleX(" + (1 + 0.08 * lift - 0.1 * o).toFixed(3) + ")";
      if (hint) hint.style.opacity = (1 - clamp(p / 0.2)).toFixed(2);
      data.forEach(function (d) {
        var t = clamp((p - d.d) / 0.3), e = back(t), k = 1 - e;
        d.el.style.opacity = clamp(t * 2.5).toFixed(3);
        d.el.style.transform = "translate3d(" + (d.dx * k).toFixed(1) + "px," + (d.dy * k).toFixed(1) + "px,0) scale(" + (0.2 + 0.8 * Math.min(e, 1.1)).toFixed(3) + ")";
      });
    }
    function tick() {
      cur += (target - cur) * 0.1;
      if (Math.abs(target - cur) < 0.0005) cur = target;
      paint();
      if (cur !== target) window.requestAnimationFrame(tick); else running = false;
    }
    function update() { target = progress(); if (!running) { running = true; window.requestAnimationFrame(tick); } }
    measure(); cur = target = progress(); paint();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", function () { measure(); update(); });
    window.addEventListener("load", function () { measure(); update(); });
  }


  /* closing banner: click the email to copy it */
  function initCopyMail() {
    document.querySelectorAll(".cta-mail[data-copy]").forEach(function (btn) {
      var lbl = btn.querySelector(".lbl"), t;
      btn.addEventListener("click", function () {
        var text = btn.getAttribute("data-copy");
        function done() {
          btn.classList.add("copied"); if (lbl) lbl.textContent = "Copied!";
          clearTimeout(t); t = setTimeout(function () { btn.classList.remove("copied"); if (lbl) lbl.textContent = "Copy"; }, 2200);
        }
        if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(done, fallback); } else { fallback(); }
        function fallback() {
          var ta = document.createElement("textarea"); ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
          document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (e) {} ta.remove(); done();
        }
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    revealWords();
    initCompactNav();
    initCursor();
    initEarlyReveal();
    var recomputes = [];
    document.querySelectorAll(".cs-affinity").forEach(function (s) { recomputes.push(initAffinity(s)); });
    initVideos();
    initCopyMail();
    document.querySelectorAll(".cs-stage, .kz-stage, .bc-stage").forEach(initStage);
    document.querySelectorAll("[data-jc]").forEach(initJacoBox);
    document.querySelectorAll(".jc-flip").forEach(function (c) { c.addEventListener("click", function () { if (window.matchMedia("(hover: hover)").matches) return; c.classList.toggle("on"); }); });
    document.querySelectorAll("[data-lang-btn]").forEach(function (b) {
      b.addEventListener("click", function () {
        setTimeout(function () { recomputes.forEach(function (f) { f(); }); typeHeadline(); }, 30);
      });
    });
  });
})();
