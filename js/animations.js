/* Animaciones de GSAP ScrollTrigger + SplitText, una por sección.
   Cada elemento animado empieza totalmente visible en CSS puro — gsap.from()
   es lo que aplica el estado inicial opacity:0, solo dentro de la rama
   "noReduce" de abajo. Así, si GSAP falla al cargar desde el CDN (sin
   conexión, bloqueado, etc.) o el visitante prefiere movimiento reducido,
   la página se mantiene totalmente legible sin ninguna animación conectada. */

window.PortfolioAnimations = (function () {
  var hasGsap = typeof gsap !== "undefined";
  var heroIntroTimeline = null;

  if (hasGsap) {
    gsap.registerPlugin(ScrollTrigger, SplitText);

    // base.css pone `scroll-behavior: smooth` en <html>. ScrollTrigger.refresh()
    // salta la posición de scroll para medir cada trigger; con smooth scroll
    // esos saltos se animan y las mediciones salen mal (el pin de statement
    // empezaba con un offset negativo tras un resize). Se desactiva solo
    // durante la duración de cada refresh.
    var rootStyle = document.documentElement.style;
    ScrollTrigger.addEventListener("refreshInit", function () {
      rootStyle.scrollBehavior = "auto";
    });
    ScrollTrigger.addEventListener("refresh", function () {
      rootStyle.scrollBehavior = "";
    });
  }

  function buildHeroIntro() {
    var heroTitle = document.querySelector("[data-split-hero]");
    var heroRest = document.querySelectorAll("[data-hero-fade]");

    var tl = gsap.timeline({ paused: true });

    if (heroTitle) {
      // División a nivel de palabra (no de caracteres): dividir carácter por
      // carácter rompe la forma de las palabras y se lee como texto "roto"
      // en escritorio. Animar palabras completas se ve limpio y revela bien igual.
      var split = new SplitText(heroTitle, { type: "words" });
      tl.from(split.words, {
        opacity: 0,
        y: 24,
        duration: 0.6,
        stagger: 0.05,
        ease: "power3.out",
      });
    }

    if (heroRest.length) {
      tl.from(
        heroRest,
        { opacity: 0, y: 16, duration: 0.5, stagger: 0.1, ease: "power2.out" },
        heroTitle ? "-=0.3" : 0
      );
    }

    return tl;
  }

  // Testimonials: escritorio = las tarjetas se balancean hacia un abanico
  // sobre una órbita amplia, más un "empujón" con momentum cuando el mouse
  // pasa sobre una tarjeta. Móvil = fade-up. Tiene su propio matchMedia para
  // poder cambiar de layout al redimensionar; se revierte desde la limpieza
  // de movimiento reducido de más abajo.
  var testimonialsMedia = null;

  function buildTestimonialFan() {
    var fan = document.querySelector("[data-testimonials-grid]");
    if (!fan) return;
    var orbits = fan.querySelectorAll(".testimonial-orbit");
    if (!orbits.length) return;

    var hasInertia = typeof InertiaPlugin !== "undefined";
    if (hasInertia) gsap.registerPlugin(InertiaPlugin);

    testimonialsMedia = gsap.matchMedia();

    var cards = fan.querySelectorAll(".testimonial-card");

    testimonialsMedia.add({
      isDesktop: "(min-width: 992px)",
      isMobile: "(max-width: 991px)",
    }, function (context) {
      // Cada breakpoint arranca desde cero. Confiar solo en el revert de
      // matchMedia no bastaba: al pasar de escritorio a móvil, el fade-up
      // móvil capturaba el x/rotation sobrante del abanico como su estado
      // final y dejaba las tarjetas desplazadas fuera de pantalla (scroll
      // horizontal en móvil).
      gsap.killTweensOf(orbits);
      gsap.killTweensOf(cards);
      gsap.set(orbits, { clearProps: "transform,opacity" });
      gsap.set(cards, { clearProps: "transform" });

      if (context.conditions.isMobile) {
        orbits.forEach(function (orbit) {
          gsap.from(orbit, {
            y: 60,
            opacity: 0,
            scale: 0.96,
            duration: 0.9,
            ease: "power3.out",
            scrollTrigger: {
              trigger: orbit,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          });
        });
        return;
      }

      fan.classList.add("testimonial-fan--orbit");

      // Abanico en reposo: la tarjeta del medio recta, las demás se
      // despliegan, inclinadas y bajadas un poco más mientras más lejos
      // están del centro.
      var middle = (orbits.length - 1) / 2;
      orbits.forEach(function (orbit, index) {
        var offset = index - middle;
        gsap.set(orbit, { x: 300 * offset, y: 45 * offset * offset, rotation: 5 * offset });
      });

      // Entrada: cada órbita empieza rotada 40 grados (tarjeta fuera de
      // pantalla a la derecha) y rebota de vuelta hacia el abanico.
      var swingIn = gsap.from(orbits, {
        rotation: 40,
        duration: 1.5,
        stagger: 0.07,
        ease: "elastic.out(1, 0.75)",
        scrollTrigger: {
          trigger: fan,
          start: "top 70%",
          toggleActions: "play none none none",
        },
      });

      // Se reinicia una vez que la sección vuelve a quedar totalmente
      // debajo del viewport, para que la entrada se repita la próxima vez
      // que se haga scroll hasta ella.
      ScrollTrigger.create({
        trigger: fan,
        start: "top bottom",
        onLeaveBack: function () {
          swingIn.pause(0);
        },
      });

      var canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      if (!hasInertia || !canHover) return function () {
        fan.classList.remove("testimonial-fan--orbit");
      };

      // Rastrea la velocidad del mouse (px por frame) sobre el abanico.
      var lastX = 0;
      var lastY = 0;
      var velocityX = 0;
      var velocityY = 0;
      var frame = null;
      var clampMove = gsap.utils.clamp(-320, 320);
      var clampSpin = gsap.utils.clamp(-55, 55);

      function trackPointer(event) {
        if (frame) return;
        frame = requestAnimationFrame(function () {
          velocityX = event.clientX - lastX;
          velocityY = event.clientY - lastY;
          lastX = event.clientX;
          lastY = event.clientY;
          frame = null;
        });
      }

      // Al entrar, empuja la tarjeta con el momentum del mouse. El giro
      // viene de la torsión: dónde se golpeó la tarjeta (offset desde su
      // centro) cruzado con la dirección en la que se movía el mouse.
      function pushCard(event) {
        var card = event.currentTarget;
        var box = card.getBoundingClientRect();
        var offsetX = event.clientX - (box.left + box.width / 2);
        var offsetY = event.clientY - (box.top + box.height / 2);
        var lever = Math.hypot(offsetX, offsetY) || 1;
        var torque = (offsetX * velocityY - offsetY * velocityX) / lever;

        gsap.to(card, {
          inertia: {
            x: { velocity: clampMove(velocityX * 55), end: 0 },
            y: { velocity: clampMove(velocityY * 55), end: 0 },
            rotation: { velocity: clampSpin(torque * 40), end: 0 },
            resistance: 130,
          },
        });
      }

      fan.addEventListener("mousemove", trackPointer);
      cards.forEach(function (card) {
        card.addEventListener("mouseenter", pushCard);
      });

      return function () {
        fan.classList.remove("testimonial-fan--orbit");
        fan.removeEventListener("mousemove", trackPointer);
        cards.forEach(function (card) {
          card.removeEventListener("mouseenter", pushCard);
        });
      };
    });
  }

  // Footer de cierre: clona el contenido en una capa de color de acento que
  // solo es visible dentro de un círculo que sigue al mouse ("linterna").
  // Solo mouse — en touch no hay cursor que seguir, así que no se clona nada.
  var closingSpot = null;
  var closingRoot = null;
  var closingHandlers = null;

  function buildClosingSpotlight() {
    closingRoot = document.querySelector("[data-closing]");
    var layer = closingRoot && closingRoot.querySelector("[data-closing-layer]");
    if (!layer) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    closingSpot = layer.cloneNode(true);
    closingSpot.classList.add("closing__layer--spot");
    closingSpot.removeAttribute("data-closing-layer");
    // Duplicado decorativo: oculto para lectores de pantalla, no enfocable.
    closingSpot.setAttribute("aria-hidden", "true");
    closingSpot.setAttribute("inert", "");
    closingSpot.querySelectorAll("[id], [data-partners-row]").forEach(function (node) {
      node.removeAttribute("id");
      node.removeAttribute("data-partners-row");
    });
    closingRoot.appendChild(closingSpot);

    var moveX = gsap.quickTo(closingSpot, "--spot-x", { duration: 0.4, ease: "back.out(1.7)", unit: "%" });
    var moveY = gsap.quickTo(closingSpot, "--spot-y", { duration: 0.4, ease: "back.out(1.7)", unit: "%" });

    closingHandlers = {
      move: function (event) {
        var box = closingRoot.getBoundingClientRect();
        moveX(gsap.utils.mapRange(box.left, box.right, 0, 100, event.clientX));
        moveY(gsap.utils.mapRange(box.top, box.bottom, 0, 100, event.clientY));
      },
      // El círculo crece al entrar y se encoge al salir.
      enter: function (event) {
        var box = closingRoot.getBoundingClientRect();
        gsap.set(closingSpot, {
          "--spot-x": gsap.utils.mapRange(box.left, box.right, 0, 100, event.clientX) + "%",
          "--spot-y": gsap.utils.mapRange(box.top, box.bottom, 0, 100, event.clientY) + "%",
        });
        gsap.to(closingSpot, { "--spot-r": "11rem", duration: 0.5, ease: "back.out(1.7)" });
      },
      leave: function () {
        gsap.to(closingSpot, { "--spot-r": "0rem", duration: 0.35, ease: "power2.in" });
      },
    };

    closingRoot.addEventListener("mousemove", closingHandlers.move);
    closingRoot.addEventListener("mouseenter", closingHandlers.enter);
    closingRoot.addEventListener("mouseleave", closingHandlers.leave);
  }

  function removeClosingSpotlight() {
    if (!closingSpot) return;
    closingRoot.removeEventListener("mousemove", closingHandlers.move);
    closingRoot.removeEventListener("mouseenter", closingHandlers.enter);
    closingRoot.removeEventListener("mouseleave", closingHandlers.leave);
    closingSpot.remove();
    closingSpot = null;
  }

  function buildScrollReveals() {
    // "Iluminado" palabra por palabra ligado a la posición del scroll: cada
    // palabra empieza tenue y se ilumina en orden de lectura mientras el
    // texto sube.
    function scrubWords(text, start, end) {
      var split = new SplitText(text, { type: "words" });
      gsap.set(split.words, { opacity: 0.25 });
      gsap.to(split.words, {
        opacity: 1,
        stagger: 0.05,
        ease: "none",
        scrollTrigger: { trigger: text, start: start, end: end, scrub: true },
      });
    }

    // Párrafo de About.
    var aboutText = document.querySelector("[data-split-about]");
    if (aboutText) scrubWords(aboutText, "top 80%", "bottom 40%");

    // Encabezado del CTA hacia works: corto (dos líneas), así que una
    // ventana de scroll más corta.
    var ctaText = document.querySelector("[data-split-cta]");
    if (ctaText) scrubWords(ctaText, "top 85%", "bottom 50%");

    // Título de Contacto: las letras van apareciendo una a una con el scroll.
    var charsText = document.querySelector("[data-split-chars]");
    if (charsText) {
      var charSplit = new SplitText(charsText, { type: "words,chars" });
      gsap.set(charSplit.chars, { opacity: 0.12, y: 14 });
      gsap.to(charSplit.chars, {
        opacity: 1,
        y: 0,
        stagger: 0.035,
        ease: "none",
        scrollTrigger: { trigger: charsText, start: "top 88%", end: "bottom 55%", scrub: true },
      });
    }

    // Entrada escalonada genérica para cualquier sección marcada con
    // [data-reveal-group]: cada hijo directo se anima una vez, al entrar por primera vez.
    document.querySelectorAll("[data-reveal-group]").forEach(function (group) {
      var items = group.children;
      gsap.from(items, {
        opacity: 0,
        y: 24,
        duration: 0.6,
        stagger: 0.12,
        ease: "power2.out",
        scrollTrigger: {
          trigger: group,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });
    });

    // Services: los íconos giran mientras la lista atraviesa el viewport.
    // Dirección alternada y velocidades ligeramente distintas por fila.
    var serviceIcons = document.querySelectorAll("[data-service-icon]");
    if (serviceIcons.length) {
      serviceIcons.forEach(function (icon, index) {
        var turns = 1 + (index % 3) * 0.5;
        gsap.to(icon, {
          rotation: (index % 2 ? -360 : 360) * turns,
          ease: "none",
          scrollTrigger: {
            trigger: "[data-services-grid]",
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });
    }

    // Statement: fija el escenario durante los 300vh de la pista y desliza
    // la frase a lo largo de la curva, de fuera de pantalla a la derecha a
    // fuera de pantalla a la izquierda.
    var statement = document.querySelector("[data-statement]");
    var statementText = statement && statement.querySelector("[data-statement-text]");
    if (statementText) {
      var curve = statement.querySelector("#statement-path");
      var viewBoxWidth = 1516; // mantener sincronizado con el viewBox del SVG

      // Distancia a lo largo del trazo donde cruza una x dada (los trazos
      // van de izquierda a derecha, así que x crece con la longitud; el
      // muestreo es suficientemente preciso).
      var lengthAtX = function (x) {
        var total = curve.getTotalLength();
        for (var len = 0; len <= total; len += 4) {
          if (curve.getPointAtLength(len).x >= x) return len;
        }
        return total;
      };

      statement.classList.add("statement--animated");

      // Valores basados en función + invalidateOnRefresh: se vuelven a medir
      // al redimensionar, ya que la longitud del texto cambia con el tamaño
      // de fuente móvil.
      gsap.fromTo(
        statementText,
        { attr: { startOffset: function () { return lengthAtX(viewBoxWidth) + 40; } } },
        {
          attr: {
            startOffset: function () {
              return lengthAtX(0) - statementText.getComputedTextLength() - 40;
            },
          },
          ease: "none",
          scrollTrigger: {
            trigger: statement.querySelector(".statement__track"),
            start: "top top",
            end: "bottom bottom",
            pin: statement.querySelector(".statement__stage"),
            pinSpacing: false, // la pista de 300vh ya aporta el espacio de scroll
            scrub: true,
            invalidateOnRefresh: true,
            // Se crea después de los triggers de [data-reveal-group] más
            // abajo en la página; refrescar este pin primero para que sus
            // posiciones lo tengan en cuenta.
            refreshPriority: 1,
          },
        }
      );

      // El texto se mide con la web font; volver a medir una vez que haya cargado.
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          ScrollTrigger.refresh();
        });
      }
    }

    buildTestimonialFan();
    buildClosingSpotlight();

    // Works: barrido con clip-path + asentamiento de imagen, manejado por
    // transiciones CSS. Agregar .works-list--reveal arma el estado oculto
    // (así sin JS el media se mantiene visible); cada media recibe luego
    // .is-in-view una vez al entrar.
    var worksList = document.querySelector("[data-works-grid]");
    if (worksList) {
      worksList.classList.add("works-list--reveal");
      worksList.querySelectorAll(".work-media").forEach(function (media) {
        ScrollTrigger.create({
          trigger: media,
          start: "top 85%",
          once: true,
          onEnter: function () {
            media.classList.add("is-in-view");
          },
        });
      });
    }
  }

  if (hasGsap) {
    gsap.matchMedia().add(
      {
        reduce: "(prefers-reduced-motion: reduce)",
        noReduce: "(prefers-reduced-motion: no-preference)",
      },
      function (context) {
        if (context.conditions.reduce) {
          // Todo ya es visible por los valores por defecto de CSS; nada que conectar.
          heroIntroTimeline = null;
          return;
        }
        heroIntroTimeline = buildHeroIntro();

        // buildScrollReveals() lee las tarjetas ya renderizadas (services,
        // works, testimonials, partners), que main.js llena desde
        // #info-data. Eso ocurre de forma síncrona hoy, pero se espera la
        // bandera/evento de todos modos para que esto siga siendo correcto
        // si la fuente de datos de main.js vuelve a ser algo asíncrono (un
        // info.json obtenido por red, etc.).
        if (window.PortfolioContentReady) {
          buildScrollReveals();
        } else {
          window.addEventListener("portfolio:content-ready", buildScrollReveals, { once: true });
        }

        // Si el visitante cambia a movimiento reducido a mitad de sesión,
        // se quita el estado armado para que el media de works no quede oculto.
        return function () {
          window.removeEventListener("portfolio:content-ready", buildScrollReveals);
          var worksList = document.querySelector("[data-works-grid]");
          if (worksList) worksList.classList.remove("works-list--reveal");
          var statement = document.querySelector("[data-statement]");
          if (statement) statement.classList.remove("statement--animated");
          if (testimonialsMedia) {
            testimonialsMedia.revert();
            testimonialsMedia = null;
          }
          removeClosingSpotlight();
        };
      }
    );
  }

  function playHeroIntro() {
    if (heroIntroTimeline) {
      heroIntroTimeline.play();
    }
  }

  return { playHeroIntro: playHeroIntro };
})();
