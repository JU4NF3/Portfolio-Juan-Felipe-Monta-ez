/* Preloader con un contador de %. Todavía no hay assets pesados reales que
   rastrear, así que el progreso es un tween de GSAP suavizado hacia ~90%,
   ligado a señales reales de disponibilidad (fuentes + window load +
   contenido renderizado, ver main.js) para el salto final a 100%. Al
   terminar, desvanece el preloader y le avisa al sistema de panel-transition
   que revele la página (ver page-transition.js). */

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
    // main.js resuelve esto una vez que las secciones se renderizan desde
    // #info-data — se mantiene como promesa (aunque el renderizado hoy es
    // síncrono) para que el preloader siga siendo correcto si eso vuelve a
    // ser asíncrono algún día.
    window.PortfolioContentLoaded || Promise.resolve(),
  ]).then(finish);
})();
