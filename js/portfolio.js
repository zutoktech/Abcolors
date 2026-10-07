/*
 * AB Colors - portfolio pages (signage, branding, promotional, digital, corporate gifting).
 * Category filter buttons + accessible lightbox for the .gallery-item links.
 * Without JavaScript every gallery link still opens the full-size photo.
 */
(function () {
  "use strict";

  function $all(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }

  var ACTIVE = ["bg-[#d72a2f]", "text-white", "border-[#d72a2f]"];
  var IDLE = ["bg-white", "text-gray-700", "border-gray-200"];

  function initFilters() {
    var buttons = $all(".filter-btn[data-filter]");
    if (!buttons.length) return;
    var items = $all(".gallery-item");
    buttons.forEach(function (btn) {
      btn.setAttribute("aria-pressed", btn.getAttribute("data-filter") === "all" ? "true" : "false");
      btn.addEventListener("click", function () {
        var filter = btn.getAttribute("data-filter");
        buttons.forEach(function (b) {
          var on = b === btn;
          b.setAttribute("aria-pressed", String(on));
          ACTIVE.forEach(function (c) { b.classList.toggle(c, on); });
          IDLE.forEach(function (c) { b.classList.toggle(c, !on); });
        });
        items.forEach(function (item) {
          item.hidden = !(filter === "all" || item.getAttribute("data-category") === filter);
        });
      });
    });
  }

  function initLightbox() {
    var items = $all(".gallery-item");
    if (!items.length) return;

    var box = document.createElement("div");
    box.className = "portfolio-lightbox";
    box.id = "portfolio-lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Photo viewer");
    box.innerHTML =
      '<button type="button" class="lightbox-close" aria-label="Close photo viewer">&times;</button>' +
      '<button type="button" class="lightbox-prev" aria-label="Previous photo"><i class="fa fa-angle-left" aria-hidden="true"></i></button>' +
      '<button type="button" class="lightbox-next" aria-label="Next photo"><i class="fa fa-angle-right" aria-hidden="true"></i></button>' +
      '<figure class="lightbox-content"><img id="lightbox-img" src="" alt=""><figcaption id="lightbox-caption" class="lightbox-caption"></figcaption></figure>';
    document.body.appendChild(box);

    var img = box.querySelector("#lightbox-img");
    var caption = box.querySelector("#lightbox-caption");
    var closeBtn = box.querySelector(".lightbox-close");
    var visible = [];
    var current = 0;
    var opener = null;

    function show(index) {
      if (!visible.length) return;
      current = (index + visible.length) % visible.length;
      var item = visible[current];
      var title = item.getAttribute("data-title") || "";
      var thumb = item.querySelector("img");
      img.style.opacity = "0";
      window.setTimeout(function () {
        img.src = item.getAttribute("href");
        img.alt = thumb ? thumb.alt : title;
        caption.textContent = title;
        img.style.opacity = "1";
      }, 120);
    }

    function open(item) {
      visible = items.filter(function (el) { return !el.hidden; });
      opener = item;
      box.classList.add("active");
      document.body.classList.add("lightbox-open");
      show(visible.indexOf(item));
      closeBtn.focus();
    }

    function close() {
      box.classList.remove("active");
      document.body.classList.remove("lightbox-open");
      img.src = "";
      if (opener) opener.focus();
    }

    items.forEach(function (item) {
      item.addEventListener("click", function (e) {
        e.preventDefault();
        open(item);
      });
    });

    closeBtn.addEventListener("click", close);
    box.querySelector(".lightbox-prev").addEventListener("click", function () { show(current - 1); });
    box.querySelector(".lightbox-next").addEventListener("click", function () { show(current + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });

    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("active")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(current - 1);
      else if (e.key === "ArrowRight") show(current + 1);
      else if (e.key === "Tab") {
        // keep focus inside the dialog
        var focusables = $all("button", box);
        var first = focusables[0];
        var last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });

    var startX = null;
    box.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
      startX = null;
    }, { passive: true });
  }

  function init() {
    initFilters();
    initLightbox();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
