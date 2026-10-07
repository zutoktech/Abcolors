/*
 * AB Colors - site behaviour (no jQuery needed).
 * Mobile menu, back-to-top, home page hero slider, counters, work tabs and
 * testimonials. Every feature checks that its markup exists first.
 */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(selector, root) { return (root || document).querySelector(selector); }
  function $all(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  /* ---------------- Mobile menu ---------------- */
  function initNav() {
    var nav = $(".site-header .nav");
    var toggle = nav && $(".switcher", nav);
    if (!nav || !toggle) return;
    var icon = $("i", toggle);
    var desktop = window.matchMedia("(min-width: 992px)");

    function setOpen(open) {
      nav.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      if (icon) {
        icon.classList.toggle("fa-bars", !open);
        icon.classList.toggle("fa-times", open);
      }
    }

    toggle.addEventListener("click", function () {
      setOpen(!nav.classList.contains("is-open"));
    });

    $all(".dropdown-toggle", nav).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var item = btn.closest(".has-dropdown");
        var open = !item.classList.contains("is-open");
        item.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", String(open));
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });

    document.addEventListener("click", function (e) {
      if (nav.classList.contains("is-open") && !nav.contains(e.target)) setOpen(false);
    });

    var onChange = function (mq) { if (mq.matches) setOpen(false); };
    if (desktop.addEventListener) desktop.addEventListener("change", onChange);
    else if (desktop.addListener) desktop.addListener(onChange);
  }

  /* ---------------- Back to top ---------------- */
  function initScrollTop() {
    var btn = $("#scroll-top");
    if (!btn) return;
    var ticking = false;
    function update() {
      btn.classList.toggle("is-visible", window.pageYOffset > 300);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
    // Check on the next frame instead of now: reading the scroll position during start-up
    // forces a full layout before the page has painted.
    window.requestAnimationFrame(update);
  }

  /* ---------------- Generic auto-rotating slider ---------------- */
  function makeSlider(opts) {
    var slides = opts.slides;
    if (slides.length < 2) return null;
    var index = 0;
    var timer = null;
    var paused = false;

    function show(i) {
      index = (i + slides.length) % slides.length;
      slides.forEach(function (slide, n) {
        var active = n === index;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", String(!active));
        if (active) loadDeferredImages(slide);
      });
      (opts.dots || []).forEach(function (dot, n) {
        if (n === index) dot.setAttribute("aria-current", "true");
        else dot.removeAttribute("aria-current");
      });
    }

    function start() {
      stop();
      if (!reduceMotion && !paused && opts.interval) {
        timer = window.setInterval(function () { show(index + 1); }, opts.interval);
      }
    }

    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    if (opts.prev) opts.prev.addEventListener("click", function () { show(index - 1); start(); });
    if (opts.next) opts.next.addEventListener("click", function () { show(index + 1); start(); });
    (opts.dots || []).forEach(function (dot, n) {
      dot.addEventListener("click", function () { show(n); start(); });
    });

    if (opts.root) {
      opts.root.addEventListener("mouseenter", function () { paused = true; stop(); });
      opts.root.addEventListener("mouseleave", function () { paused = false; start(); });
      opts.root.addEventListener("focusin", function () { paused = true; stop(); });
      opts.root.addEventListener("focusout", function () { paused = false; start(); });

      // Touch swipe
      var startX = null;
      opts.root.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
      opts.root.addEventListener("touchend", function (e) {
        if (startX === null) return;
        var dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 50) { show(index + (dx < 0 ? 1 : -1)); start(); }
        startX = null;
      }, { passive: true });
    }

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stop(); else start();
    });

    show(0);
    start();
    return { show: show };
  }

  function loadDeferredImages(root) {
    $all("img[data-src]", root).forEach(function (img) {
      img.src = img.getAttribute("data-src");
      if (img.hasAttribute("data-srcset")) img.srcset = img.getAttribute("data-srcset");
      img.removeAttribute("data-src");
      img.removeAttribute("data-srcset");
    });
  }

  function initHero() {
    var root = $(".hero-slider");
    if (!root) return;
    makeSlider({
      root: root,
      slides: $all(".hero-slide", root),
      prev: $(".hero-prev", root),
      next: $(".hero-next", root),
      dots: $all(".hero-dots button", root),
      interval: 8000
    });
    // The first banner loads with the page; fetch the others once the page has finished loading.
    if (document.readyState === "complete") loadDeferredImages(root);
    else window.addEventListener("load", function () { loadDeferredImages(root); });
  }

  function initTestimonials() {
    var root = $(".testimonials");
    if (!root) return;
    makeSlider({
      root: root,
      slides: $all(".testimonial-slide", root),
      prev: $(".sl-controll .prev", root),
      next: $(".sl-controll .next", root),
      dots: $all(".testimonial-dots button", root),
      interval: 6000
    });
  }

  /* ---------------- Smooth scroll for the hero "scroll down" link ---------------- */
  function initScrollDown() {
    $all(".scroll-down-button[href^='#']").forEach(function (link) {
      link.addEventListener("click", function (e) {
        var target = $(link.getAttribute("href"));
        if (!target) return;
        e.preventDefault();
        var top = target.getBoundingClientRect().top + window.pageYOffset - 70;
        window.scrollTo({ top: top, behavior: reduceMotion ? "auto" : "smooth" });
      });
    });
  }

  /* ---------------- Counters ---------------- */
  function initCounters() {
    var counters = $all(".counter[data-count]");
    if (!counters.length) return;

    function run(el) {
      var target = parseInt(el.getAttribute("data-count"), 10) || 0;
      if (reduceMotion) { el.textContent = String(target); return; }
      var start = null;
      var duration = 1200;
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        el.textContent = String(Math.floor(target * p));
        if (p < 1) window.requestAnimationFrame(step);
        else el.textContent = String(target);
      }
      window.requestAnimationFrame(step);
    }

    if (!("IntersectionObserver" in window)) { counters.forEach(run); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- "Our works" picture tabs on the home page ---------------- */
  function initServiceTabs() {
    var tabs = $all(".service-tab[aria-controls]");
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        var panel = document.getElementById(tab.getAttribute("aria-controls"));
        if (!panel) return;
        tabs.forEach(function (t) {
          var p = document.getElementById(t.getAttribute("aria-controls"));
          t.setAttribute("aria-pressed", String(t === tab));
          if (p && p !== panel) {
            p.classList.remove("active");
            p.classList.add("none");
            p.hidden = true;
          }
        });
        panel.hidden = false;
        panel.classList.remove("none");
        panel.classList.add("active");
      });
    });
  }

  /* ---------------- Service pages: thumbnail strip swaps the main photo ---------------- */
  function initThumbs() {
    $all(".sd-thumb[data-target]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var main = document.getElementById(btn.getAttribute("data-target"));
        var thumb = $("img", btn);
        if (!main) return;
        main.removeAttribute("srcset");
        main.removeAttribute("sizes");
        main.src = btn.getAttribute("data-full");
        if (thumb) main.alt = btn.getAttribute("aria-label").replace(/^Show photo: /, "");
        $all(".sd-thumb[data-target='" + btn.getAttribute("data-target") + "']").forEach(function (b) {
          b.setAttribute("aria-pressed", String(b === btn));
        });
      });
    });
  }

  function init() {
    initNav();
    initScrollTop();
    initHero();
    initTestimonials();
    initScrollDown();
    initCounters();
    initServiceTabs();
    initThumbs();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
