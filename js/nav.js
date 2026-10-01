/* Mobile "open menu" overlay: open/close, Escape to close, focus trap + return. */

(function () {
  var toggle = document.querySelector("[data-nav-toggle]");
  var menu = document.querySelector("[data-mobile-menu]");
  var closeBtn = menu ? menu.querySelector("[data-nav-close]") : null;

  if (!toggle || !menu) return;

  var lastFocused = null;

  function focusableElements() {
    return Array.prototype.slice.call(
      menu.querySelectorAll('a[href], button:not([disabled])')
    );
  }

  function openMenu() {
    lastFocused = document.activeElement;
    menu.setAttribute("data-open", "true");
    toggle.setAttribute("aria-expanded", "true");
    document.documentElement.style.overflow = "hidden";
    var focusables = focusableElements();
    if (focusables[0]) focusables[0].focus();
    document.addEventListener("keydown", onKeydown);
  }

  function closeMenu() {
    menu.setAttribute("data-open", "false");
    toggle.setAttribute("aria-expanded", "false");
    document.documentElement.style.overflow = "";
    document.removeEventListener("keydown", onKeydown);
    if (lastFocused) lastFocused.focus();
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      closeMenu();
      return;
    }
    // Minimal focus trap: keep Tab cycling within the menu while it's open.
    if (event.key === "Tab") {
      var focusables = focusableElements();
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  toggle.setAttribute("aria-expanded", "false");
  toggle.addEventListener("click", openMenu);
  if (closeBtn) closeBtn.addEventListener("click", closeMenu);

  // Close automatically when a menu link is used to jump to a section.
  menu.querySelectorAll("a[href]").forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });
})();
