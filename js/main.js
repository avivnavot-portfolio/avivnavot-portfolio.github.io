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
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    var lang = saved || document.documentElement.getAttribute("lang") || "en";
    applyLang(lang);

    document.querySelectorAll("[data-lang-btn]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyLang(btn.getAttribute("data-lang-btn"));
      });
    });
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

  document.addEventListener("DOMContentLoaded", function () {
    initLang();
    initReveal();
    initNav();
    initChapters();
  });
})();
