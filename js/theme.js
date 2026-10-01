/* Light/dark theme toggle + persistence.
   The initial theme is already applied by the inline anti-flash script in
   <head> (before first paint) — this file only wires up the toggle buttons. */

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
      /* localStorage unavailable (private mode, etc.) — theme just won't persist. */
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
