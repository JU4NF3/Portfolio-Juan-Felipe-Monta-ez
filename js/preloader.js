/* Preloader with a % counter. There are no real heavy assets to track yet,
   so progress is a GSAP tween eased toward ~90%, tied to real readiness
   signals (fonts + window load + content rendered, see main.js) for the
   final jump to 100%. On completion it fades the preloader out and tells
   the panel-transition system to reveal the page (see page-transition.js). */

(function () {
  var preloader = document.querySelector("[data-preloader]");
  var countEl = document.querySelector("[data-preloader-count]");
  var progressBar = document.querySelector("[data-preloader-bar]");
  if (!preloader || !countEl) return;

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var progress = { value: 0 };

  function render() {
    var rounded = Math.round(progress.value);
    countEl.textContent = rounded + "%";
    if (progressBar) progressBar.setAttribute("aria-valuenow", String(rounded));
  }

  function hidePreloader() {
    preloader.setAttribute("data-hidden", "true");
    if (window.PortfolioTransition) {
      window.PortfolioTransition.revealOnEntry();
    }
    if (window.PortfolioAnimations && window.PortfolioAnimations.playHeroIntro) {
      window.PortfolioAnimations.playHeroIntro();
    }
    preloader.addEventListener(
      "transitionend",
      function () {
        preloader.setAttribute("hidden", "");
      },
      { once: true }
    );
  }

  function finish() {
    if (reducedMotion || typeof gsap === "undefined") {
      progress.value = 100;
      render();
      hidePreloader();
      return;
    }
    gsap.to(progress, {
      value: 100,
      duration: 0.4,
      ease: "power2.out",
      onUpdate: render,
      onComplete: hidePreloader,
    });
  }

  if (reducedMotion || typeof gsap === "undefined") {
    progress.value = 90;
    render();
  } else {
    gsap.to(progress, {
      value: 90,
      duration: 2.2,
      ease: "power1.out",
      onUpdate: render,
    });
  }

  Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise(function (resolve) {
      if (document.readyState === "complete") {
        resolve();
      } else {
        window.addEventListener("load", resolve, { once: true });
      }
    }),
    // main.js resolves this once the sections are rendered from #info-data
    // — kept as a promise (even though rendering is synchronous today) so
    // the preloader stays correct if that ever becomes async again.
    window.PortfolioContentLoaded || Promise.resolve(),
  ]).then(finish);
})();
