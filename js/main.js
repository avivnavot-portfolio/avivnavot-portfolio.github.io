/* Aviv Navot — Portfolio
   Language toggle, nav behavior, scroll interactions */

(function () {
  var STORAGE_KEY = "aviv-portfolio-lang";

  function applyLang(lang) {
    document.documentElement.setAttribute("lang", lang);
    document.documentElement.setAttribute("dir", lang === "he" ? "rtl" : "ltr");
    document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang-btn") === lang);
    });
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    document.title = lang === "he" && document.body.getAttribute("data-title-he")
      ? document.body.getAttribute("data-title-he")
      : document.body.getAttribute("data-title-en") || document.title;
  }

  function initLang() {
    /* The portfolio is English only. */
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
    applyLang("en");


  }

  function initReveal() {
    var els = document.querySelectorAll(".reveal");
    if (!("IntersectionObserver" in window) || !els.length) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach(function (el) { io.observe(el); });
  }

  function initNav() {
    var nav = document.querySelector(".nav");
    if (!nav) return;
    var hero = document.querySelector(".hero-cover");
    var toggle = document.getElementById("navToggle");
    var links = document.getElementById("navLinks");

    // Transparent-over-hero behavior only applies on the homepage.
    if (hero) {
      var threshold = function () { return window.innerHeight * 0.82; };
      var onScroll = function () {
        if (window.scrollY > threshold()) {
          nav.classList.remove("nav--on-hero");
        } else {
          nav.classList.add("nav--on-hero");
        }
      };
      nav.classList.add("nav--on-hero");
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    // Mobile hamburger menu.
    if (toggle && links) {
      var closeMenu = function () {
        toggle.classList.remove("open");
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      };
      var openMenu = function () {
        toggle.classList.add("open");
        links.classList.add("open");
        toggle.setAttribute("aria-expanded", "true");
        document.body.style.overflow = "hidden";
      };
      toggle.addEventListener("click", function () {
        if (links.classList.contains("open")) closeMenu(); else openMenu();
      });
      links.querySelectorAll("a").forEach(function (a) {
        a.addEventListener("click", closeMenu);
      });
    }
  }

  function initChapters() {
    var rows = document.querySelectorAll(".proj-row");
    if (!rows.length) return;

    var ticking = false;
    var update = function () {
      var vh = window.innerHeight;
      rows.forEach(function (row) {
        var rect = row.getBoundingClientRect();
        var scrollRange = rect.height - vh;
        var progress = scrollRange > 0 ? (0 - rect.top) / scrollRange : 0;
        if (progress < 0) progress = 0;
        if (progress > 1) progress = 1;
        row.style.setProperty("--progress", progress.toFixed(3));
      });
      ticking = false;
    };
    var onScroll = function () {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
  }

  /* typography: a paragraph never ends with a line of fewer than three words
     (the last three words are tied together with non-breaking spaces) */
  function noOrphans() {
    var els = document.querySelectorAll("main p, main li, main figcaption, main blockquote, footer p, .cs-lede");
    Array.prototype.forEach.call(els, function (el) {
      if (el.closest("[data-words], [data-typewriter], .hm-note") || el.querySelector(".lt, .w, br + br")) return;
      var roots = el.querySelectorAll(":scope > .en, :scope > .he");
      if (!roots.length) roots = [el];
      Array.prototype.forEach.call(roots, tie);
    });
    function tie(root) {
      var nodes = [], w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n;
      while ((n = w.nextNode())) nodes.push(n);
      var seenWord = false, inGap = false, gaps = 0;
      for (var k = nodes.length - 1; k >= 0 && gaps < 3; k--) {
        var t = nodes[k].nodeValue.split(""), changed = false;
        for (var i = t.length - 1; i >= 0; i--) {
          var c = t[i], space = /\s/.test(c) && c !== "\u00A0";
          if (space) {
            if (!seenWord) continue;                 /* trailing whitespace */
            if (gaps >= 2) { gaps = 3; break; }      /* two gaps tied: done */
            if (!inGap) { t[i] = "\u00A0"; inGap = true; } else { t[i] = ""; }
            changed = true;
          } else {
            if (inGap) { inGap = false; gaps++; }
            if (c === "-") { t[i] = "\u2011"; changed = true; }   /* no line break inside a hyphenated last word either */
            seenWord = true;
          }
        }
        if (changed) nodes[k].nodeValue = t.join("");
      }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initLang();
    initReveal();
    initNav();
    initChapters();
    noOrphans();
  });
})();
