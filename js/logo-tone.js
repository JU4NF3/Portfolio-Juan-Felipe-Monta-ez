/* Logo sin fondo: elige la versión blanca o negra según lo que haya detrás.
   Mira el elemento que queda bajo el logo (esquina superior izquierda), sube
   por sus padres hasta encontrar un fondo opaco y calcula su luminosidad.
   El hero y el footer son siempre oscuros, así que se tratan como oscuros
   aunque su fondo lo pinte un canvas. Pone data-tone="light" | "dark" en el
   .logomark; el CSS muestra el logo contrario (negro sobre claro, blanco
   sobre oscuro). */
(function () {
  "use strict";

  var logo = document.querySelector(".logomark");
  if (!logo) return;

  var ticking = false;

  function luminance(color) {
    var m = color.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var p = m[1].split(",").map(parseFloat);
    var a = p.length > 3 ? p[3] : 1;
    if (a < 0.5) return null; // transparente: seguir subiendo
    return (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255;
  }

  function toneBehind() {
    var r = logo.getBoundingClientRect();
    var x = r.left + r.width / 2;
    var y = r.top + r.height / 2;
    var stack = document.elementsFromPoint(x, y);
    for (var i = 0; i < stack.length; i++) {
      var node = stack[i];
      if (logo.contains(node) || node.closest(".site-header")) continue;
      if (node.closest(".hero, .closing, .preloader, .panel-transition")) return "dark";
      for (var el = node; el; el = el.parentElement) {
        var lum = luminance(getComputedStyle(el).backgroundColor);
        if (lum !== null) return lum > 0.55 ? "light" : "dark";
      }
    }
    return "dark";
  }

  function update() {
    ticking = false;
    logo.setAttribute("data-tone", toneBehind());
  }

  function request() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", request, { passive: true });
  window.addEventListener("resize", request);
  // Cambio de tema (theme.js pone data-theme en <html>).
  // Los colores de fondo hacen una transición al cambiar de tema; se vuelve a medir al terminar.
  new MutationObserver(function () {
    request();
    setTimeout(update, 600);
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  update();
})();
