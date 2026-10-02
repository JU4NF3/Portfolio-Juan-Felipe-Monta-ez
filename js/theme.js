/* Cambio de tema claro/oscuro + persistencia.
   El tema inicial ya lo aplica el script inline anti-flash en <head> (antes
   del primer renderizado) — este archivo solo conecta los botones de cambio. */

(function () {
  var STORAGE_KEY = "portfolio-theme";

  function getCurrentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {
      /* localStorage no disponible (modo privado, etc.) — el tema simplemente no persistirá. */
    }
    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      button.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    });
  }

  function toggleTheme() {
    applyTheme(getCurrentTheme() === "light" ? "dark" : "light");
  }

  document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
    button.setAttribute("aria-pressed", getCurrentTheme() === "light" ? "true" : "false");
    button.addEventListener("click", toggleTheme);
  });
})();
