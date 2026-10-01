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

/* Desktop pill nav: "you are here" indicator.
   Scroll-spy picks the section whose top has passed 40% of the viewport
   (the last one, going down the page) and slides the glass indicator to
   its link. Hovering another link previews it; leaving the nav slides the
   indicator back. Above the first section (in the hero) nothing is active. */
(function () {
  var nav = document.querySelector("[data-nav-pill]");
  var indicator = nav && nav.querySelector("[data-nav-indicator]");
  if (!indicator) return;

  var links = Array.prototype.slice.call(nav.querySelectorAll('.nav-pill__link[href^="#"]'));
  var entries = links
    .map(function (link) {
      return { link: link, section: document.querySelector(link.getAttribute("href")) };
    })
    .filter(function (entry) {
      return entry.section;
    });

  var activeLink = null;
  var placed = false; // first placement appears in place, later ones slide

  function moveTo(link) {
    if (!link) {
      indicator.classList.remove("is-visible");
      return;
    }
    if (!placed) indicator.classList.add("no-slide");
    indicator.style.setProperty("--x", link.offsetLeft + "px");
    indicator.style.setProperty("--y", link.offsetTop + "px");
    indicator.style.width = link.offsetWidth + "px";
    indicator.style.height = link.offsetHeight + "px";
    indicator.classList.add("is-visible");
    if (!placed) {
      placed = true;
      // Let that first position render before enabling the slide.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          indicator.classList.remove("no-slide");
        });
      });
    }
  }

  function setActive(link) {
    if (link === activeLink) return;
    if (activeLink) activeLink.removeAttribute("aria-current");
    activeLink = link;
    if (link) link.setAttribute("aria-current", "true");
    if (!nav.matches(":hover")) moveTo(link);
  }

  function update() {
    var line = window.innerHeight * 0.4;
    var current = null;
    entries.forEach(function (entry) {
      if (entry.section.getBoundingClientRect().top <= line) current = entry.link;
    });
    setActive(current);
  }

  var ticking = false;
  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      update();
    });
  }, { passive: true });

  links.forEach(function (link) {
    link.addEventListener("mouseenter", function () {
      moveTo(link);
    });
  });
  nav.addEventListener("mouseleave", function () {
    moveTo(activeLink);
  });

  // Link widths change on resize and once the web font loads.
  function remeasure() {
    if (activeLink) moveTo(activeLink);
  }
  window.addEventListener("resize", remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);

  update();
})();

/* Eased scroll for in-page links (#about, #works, #hero…): starts gently,
   speeds up, and settles slowly at the target, instead of the browser's
   short linear smooth-scroll. Duration grows with distance (0.8s–1.6s).
   Falls back to the native behavior without GSAP/ScrollToPlugin, and jumps
   directly with reduced motion. */
(function () {
  if (typeof gsap === "undefined" || typeof ScrollToPlugin === "undefined") return;
  gsap.registerPlugin(ScrollToPlugin);

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var rootStyle = document.documentElement.style;

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest('a[href^="#"]');
    if (!link) return;
    var hash = link.getAttribute("href");
    if (hash === "#" || hash.length < 2) return; // placeholder links (TODOs)
    var target = document.querySelector(hash);
    if (!target) return;

    event.preventDefault();

    var targetY = target.getBoundingClientRect().top + window.scrollY;
    var distance = Math.abs(targetY - window.scrollY);

    function arrive() {
      rootStyle.scrollBehavior = "";
      history.pushState(null, "", hash);
      // Move focus to the section so keyboard / screen reader users land
      // there too, without a second scroll.
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }

    // base.css has `scroll-behavior: smooth`; with it on, every scroll
    // position GSAP sets would itself be smoothed, and the tween stutters.
    rootStyle.scrollBehavior = "auto";

    if (reduceMotion.matches) {
      window.scrollTo(0, targetY);
      arrive();
      return;
    }

    gsap.to(window, {
      duration: gsap.utils.clamp(0.8, 1.6, 0.6 + distance / 4000),
      ease: "power3.inOut",
      // autoKill: if the visitor scrolls by hand mid-way, stop and let them.
      scrollTo: { y: target, autoKill: true },
      overwrite: true,
      onComplete: arrive,
      onInterrupt: function () {
        rootStyle.scrollBehavior = "";
      },
    });
  });
})();
