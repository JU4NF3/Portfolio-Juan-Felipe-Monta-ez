/* 6-panel page transition system.
   - revealOnEntry(): retracts the panels once the preloader finishes, so the
     page is never shown mid-paint before it's ready.
   - navigate(href): covers the screen in --duration-panel (900ms), then does
     a REAL navigation (window.location.href) — not a simulated one. A flag
     in sessionStorage tells the next page load to start already covered, so
     there is no flash of content before revealOnEntry() runs again.

   Today there's only index.html, so the logo/Home link points at itself
   (href="index.html") with [data-page-transition] to exercise the full
   mechanism end to end with a real reload. When /work (or other internal
   pages) exist, add [data-page-transition] to links pointing at them too. */

window.PortfolioTransition = (function () {
  var FLAG_KEY = "pt-covering";
  var panels = document.querySelector("[data-panel-transition]");

  function prefersReducedMotion() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function revealOnEntry() {
    if (!panels) return;
    panels.setAttribute("data-state", "revealed");
  }

  function navigate(href) {
    if (!panels || prefersReducedMotion()) {
      window.location.href = href;
      return;
    }
    panels.setAttribute("data-state", "covering");
    try {
      sessionStorage.setItem(FLAG_KEY, "1");
    } catch (e) {
      /* sessionStorage unavailable — navigation still works, just no cover-on-load. */
    }
    window.setTimeout(function () {
      window.location.href = href;
    }, 900);
  }

  // Runs as early as possible (this script is loaded with `defer`, so DOM
  // parsing is done but images etc. may still be loading): if we arrived
  // here via navigate(), start already covered instead of revealed, so the
  // preloader/reveal sequence runs on top of a covered screen, not a flash
  // of bare content.
  (function restoreCoveringState() {
    var wasCovering = false;
    try {
      wasCovering = sessionStorage.getItem(FLAG_KEY) === "1";
      sessionStorage.removeItem(FLAG_KEY);
    } catch (e) {
      /* ignore */
    }
    if (wasCovering && panels) {
      panels.setAttribute("data-state", "covering");
    }
  })();

  document.querySelectorAll("[data-page-transition]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#") return; // anchors handled by native scroll
      event.preventDefault();
      navigate(href);
    });
  });

  return { revealOnEntry: revealOnEntry, navigate: navigate };
})();
