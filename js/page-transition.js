/* Sistema de transición de página de 6 paneles.
   - revealOnEntry(): retrae los paneles una vez que el preloader termina,
     para que la página nunca se muestre a medio renderizar antes de estar lista.
   - navigate(href): cubre la pantalla en --duration-panel (900ms), y luego
     hace una navegación REAL (window.location.href) — no una simulada. Una
     bandera en sessionStorage le indica a la siguiente carga de página que
     empiece ya cubierta, para que no haya un parpadeo de contenido antes de
     que revealOnEntry() se ejecute de nuevo.

   Por ahora solo existe index.html, así que el enlace del logo/Home apunta
   a sí mismo (href="index.html") con [data-page-transition] para ejercitar
   todo el mecanismo de punta a punta con una recarga real. Cuando existan
   /work (u otras páginas internas), agregar [data-page-transition] también
   a los enlaces que apunten ahí. */

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
      /* sessionStorage no disponible — la navegación igual funciona, solo sin cubrir al cargar. */
    }
    window.setTimeout(function () {
      window.location.href = href;
    }, 900);
  }

  // Corre lo antes posible (este script se carga con `defer`, así que el
  // parsing del DOM ya terminó pero imágenes, etc. pueden seguir cargando):
  // si llegamos aquí vía navigate(), empieza ya cubierto en vez de revelado,
  // para que la secuencia de preloader/revelado corra sobre una pantalla
  // cubierta, no sobre un parpadeo de contenido desnudo.
  (function restoreCoveringState() {
    var wasCovering = false;
    try {
      wasCovering = sessionStorage.getItem(FLAG_KEY) === "1";
      sessionStorage.removeItem(FLAG_KEY);
    } catch (e) {
      /* se ignora */
    }
    if (wasCovering && panels) {
      panels.setAttribute("data-state", "covering");
    }
  })();

  document.querySelectorAll("[data-page-transition]").forEach(function (link) {
    link.addEventListener("click", function (event) {
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#") return; // los anclajes los maneja el scroll nativo
      event.preventDefault();
      navigate(href);
    });
  });

  return { revealOnEntry: revealOnEntry, navigate: navigate };
})();
