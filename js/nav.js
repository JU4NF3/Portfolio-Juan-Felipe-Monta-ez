/* Overlay móvil "abrir menú": abrir/cerrar, Escape para cerrar, trampa de foco + retorno. */

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
    // Trampa de foco mínima: mantiene el Tab circulando dentro del menú mientras está abierto.
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

  // Se cierra automáticamente cuando un enlace del menú se usa para saltar a una sección.
  menu.querySelectorAll("a[href]").forEach(function (link) {
    link.addEventListener("click", closeMenu);
  });
})();

/* Nav tipo "pill" de escritorio: indicador de "estás aquí".
   El scroll-spy elige la sección cuyo borde superior ya pasó el 40% del
   viewport (la última, bajando por la página) y desliza el indicador de
   vidrio hasta su enlace. Pasar el mouse sobre otro enlace lo previsualiza;
   al salir de la nav el indicador vuelve a su lugar. Por encima de la
   primera sección (en el hero) nada está activo. */
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
  var placed = false; // el primer posicionamiento aparece en su lugar, los siguientes se deslizan

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
      // Deja que esa primera posición se renderice antes de habilitar el deslizamiento.
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

  // El ancho de los enlaces cambia al redimensionar y cuando carga la web font.
  function remeasure() {
    if (activeLink) moveTo(activeLink);
  }
  window.addEventListener("resize", remeasure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);

  update();
})();

/* Scroll suavizado para enlaces internos (#about, #works, #hero…): empieza
   suave, acelera y se asienta lentamente en el destino, en vez del
   smooth-scroll lineal y corto del navegador. La duración crece con la
   distancia (0.8s–1.6s). Vuelve al comportamiento nativo sin
   GSAP/ScrollToPlugin, y salta directo con movimiento reducido. */
(function () {
  if (typeof gsap === "undefined" || typeof ScrollToPlugin === "undefined") return;
  gsap.registerPlugin(ScrollToPlugin);

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var rootStyle = document.documentElement.style;

  document.addEventListener("click", function (event) {
    var link = event.target.closest && event.target.closest('a[href^="#"]');
    if (!link) return;
    var hash = link.getAttribute("href");
    if (hash === "#" || hash.length < 2) return; // enlaces placeholder (TODOs)
    var target = document.querySelector(hash);
    if (!target) return;

    event.preventDefault();

    var targetY = target.getBoundingClientRect().top + window.scrollY;
    var distance = Math.abs(targetY - window.scrollY);

    function arrive() {
      rootStyle.scrollBehavior = "";
      history.pushState(null, "", hash);
      // Mueve el foco a la sección para que los usuarios de teclado / lector
      // de pantalla también lleguen ahí, sin un segundo scroll.
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }

    // base.css tiene `scroll-behavior: smooth`; con eso activo, cada
    // posición de scroll que GSAP fije se suavizaría por sí misma, y el tween se traba.
    rootStyle.scrollBehavior = "auto";

    if (reduceMotion.matches) {
      window.scrollTo(0, targetY);
      arrive();
      return;
    }

    gsap.to(window, {
      duration: gsap.utils.clamp(0.8, 1.6, 0.6 + distance / 4000),
      ease: "power3.inOut",
      // autoKill: si el visitante hace scroll a mano a mitad de camino, se detiene y lo deja.
      scrollTo: { y: target, autoKill: true },
      overwrite: true,
      onComplete: arrive,
      onInterrupt: function () {
        rootStyle.scrollBehavior = "";
      },
    });
  });
})();
