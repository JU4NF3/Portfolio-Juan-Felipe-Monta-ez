/* Lee el contenido del portafolio (servicios, proyectos, testimonios,
   aliados) desde el bloque #info-data <script type="application/json"> en
   index.html y renderiza cada sección a partir de él.

   Esos datos se leen con JSON.parse(), no con fetch(): obtener un archivo
   info.json separado queda bloqueado por las reglas CORS del navegador
   cuando la página se abre directamente vía file:// (doble clic sobre
   index.html), y doble clic es como este sitio necesita funcionar. Si
   prefieres mantener los datos en un archivo info.json independiente de
   verdad, también es posible, pero entonces el sitio tiene que servirse
   por http(s) (ej. la extensión "Live Server" de VS Code) — pregunta si
   quieres volver a eso.

   Referencia de campos de #info-data (todo es contenido de ejemplo — edita
   el JSON en index.html directamente, sin cambios de JS necesarios):
   - services[]:      label (nombre corto que se ve en la lista), icon
                       (clave dentro de SERVICE_ICONS más abajo), title +
                       description (usados por lectores de pantalla y una
                       futura página /servicios).
   - projects[]:      title, category (etiqueta corta), summary, initials
                       (respaldo de 2 letras en los bloques de media
                       placeholder — quitar una vez se ponga una captura
                       real; ver el TODO más abajo donde <img> debería
                       reemplazar a .media-placeholder).
   - testimonials[]:  quote, name, role.
   - partners[]:      arreglo de strings simples (nombres de clientes/aliados).

   Expone window.PortfolioContentLoaded (una promesa ya resuelta — se
   mantiene así para que el Promise.all(...) de preloader.js siga
   funcionando sin cambios) y dispara un evento "portfolio:content-ready" +
   pone window.PortfolioContentReady = true una vez que termina el
   renderizado, para que animations.js solo conecte ScrollTrigger después
   de que las tarjetas ya existan en el DOM (el renderizado aquí es
   síncrono, pero la bandera/evento mantienen este archivo independiente
   del orden respecto a animations.js). */

(function () {
  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  // --- Services ---
  // Íconos SVG inline (currentColor, para que sigan el color de hover de la fila).
  var SERVICE_ICONS = {
    burst:
      '<circle cx="24" cy="24" r="7"/>' +
      '<path d="M24 3v9M24 36v9M3 24h9M36 24h9M9.2 9.2l6.3 6.3M32.5 32.5l6.3 6.3M9.2 38.8l6.3-6.3M32.5 15.5l6.3-6.3" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>',
    sparkle: '<path d="M24 2c1.6 12.4 9.6 20.4 22 22-12.4 1.6-20.4 9.6-22 22-1.6-12.4-9.6-20.4-22-22 12.4-1.6 20.4-9.6 22-22Z"/>',
    asterisk:
      '<g transform="translate(24 24)">' +
      '<ellipse rx="5" ry="21"/><ellipse rx="5" ry="21" transform="rotate(45)"/>' +
      '<ellipse rx="5" ry="21" transform="rotate(90)"/><ellipse rx="5" ry="21" transform="rotate(135)"/>' +
      "</g>",
    diamonds:
      '<path d="M24 2l9 9-9 9-9-9zM24 28l9 9-9 9-9-9zM11 15l9 9-9 9-9-9zM37 15l9 9-9 9-9-9z"/>',
    cube:
      '<path d="M24 4l18 10v20L24 44 6 34V14Z M24 24l18-10M24 24v20M24 24 6 14" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>',
  };

  function renderServices(services) {
    var servicesList = document.querySelector("[data-services-grid]");
    if (!servicesList || !services) return;
    services.forEach(function (service) {
      var row = el("a", "service-row");
      row.href = "#"; // TODO: enlazar a /servicios#[service] cuando esa página exista.
      row.innerHTML =
        '<svg class="service-row__icon" data-service-icon viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">' +
        (SERVICE_ICONS[service.icon] || SERVICE_ICONS.sparkle) +
        "</svg>" +
        // El título se renderiza dos veces: la copia va debajo y sube rotando en hover.
        '<span class="service-row__title" aria-hidden="true">' +
        '<span class="service-row__roll">' + service.label +
        '<span class="service-row__roll-dup">' + service.label + "</span>" +
        "</span></span>" +
        '<span class="sr-only">' + service.title + ": " + service.description + "</span>";
      servicesList.appendChild(row);
    });
  }

  // --- Works (proyectos) ---
  // Una fila por proyecto: etiqueta + título + enlace "Ver proyecto", luego
  // una imagen principal grande y una imagen lateral más pequeña. Cada
  // .work-media recibe el reveal con clip-path de animations.js y el zoom
  // en hover desde CSS.
  // Imagen del proyecto (project.images[i], con project.positions[i] como
  // object-position); si no hay imagen, cae al bloque placeholder con iniciales.
  function mediaHTML(project, i, alt) {
    var src = project.images && project.images[i];
    if (!src) {
      var initials = project.initials || project.title.slice(0, 2).toUpperCase();
      return i === 0
        ? '<div class="media-placeholder" role="img" aria-label="Marcador de imagen del proyecto — ' +
            project.title + '">' + initials + "</div>"
        : '<div class="media-placeholder media-placeholder--alt">' + initials + "</div>";
    }
    var pos = (project.positions && project.positions[i]) || "50% 50%";
    return '<img src="' + encodeURI(src) + '" alt="' + (alt ? alt.replace(/"/g, "&quot;") : "") +
      '" loading="lazy" decoding="async" style="object-position:' + pos + '">';
  }

  function renderWorks(projects) {
    var worksGrid = document.querySelector("[data-works-grid]");
    if (!worksGrid || !projects) return;
    projects.forEach(function (project) {
      // Enlace externo del proyecto (project.url). Sin url, los enlaces quedan sin destino.
      var hasUrl = !!project.url;
      var href = hasUrl ? project.url : "";
      var linkAttrs = hasUrl ? ' href="' + href + '" target="_blank" rel="noopener noreferrer"' : "";
      var row = el("article", "work-row");
      row.innerHTML =
        '<div class="work-row__head">' +
        '<span class="work-row__tag">' + project.category + "</span>" +
        '<h3 class="work-row__title">' + project.title + "</h3>" +
        (hasUrl ? '<a class="work-row__link"' + linkAttrs + ">Ver proyecto</a>" : "") +
        "</div>" +
        '<p class="work-row__summary">' + project.summary + "</p>" +
        '<div class="work-row__media">' +
        // Imagen principal: el enlace accesible hacia el caso de estudio.
        '<a class="work-media work-media--main"' + linkAttrs + ' aria-label="' +
        project.title + (hasUrl ? " — ver proyecto (se abre en una pestaña nueva)" : "") + '">' +
        '<div class="work-media__inner">' +
        mediaHTML(project, 0, project.title) +
        "</div></a>" +
        // Imagen lateral: enlace duplicado, oculto para tecnología de asistencia y del orden de tabulación.
        '<a class="work-media work-media--side"' + linkAttrs + ' aria-hidden="true" tabindex="-1">' +
        '<div class="work-media__inner">' +
        mediaHTML(project, 1, "") +
        "</div></a>" +
        "</div>";
      worksGrid.appendChild(row);
    });
  }

  // --- Testimonials ---
  // Cada tarjeta va dentro de un wrapper .testimonial-orbit: en escritorio
  // ese wrapper se convierte en un cuadrado enorme cuya rotación balancea
  // la tarjeta a lo largo de un arco amplio (animations.js). Sin JS es solo
  // un bloque simple.
  function renderTestimonials(testimonials) {
    var testimonialsGrid = document.querySelector("[data-testimonials-grid]");
    if (!testimonialsGrid || !testimonials) return;
    testimonials.forEach(function (testimonial, index) {
      var orbit = el("div", "testimonial-orbit");
      var stepLabel = "Testimonio " + String(index + 1).padStart(2, "0");
      orbit.innerHTML =
        '<article class="testimonial-card">' +
        '<span class="testimonial-card__step">' + stepLabel + "</span>" +
        "<blockquote>“" + testimonial.quote + "”</blockquote>" +
        "<footer><strong>" + testimonial.name + "</strong><span>" + testimonial.role + "</span></footer>" +
        "</article>";
      testimonialsGrid.appendChild(orbit);
    });
  }

  // --- Partners (dentro del footer de cierre, un <ul>) ---
  function renderPartners(partners) {
    var partnerRow = document.querySelector("[data-partners-row]");
    if (!partnerRow || !partners) return;
    partners.forEach(function (name) {
      var logo = el("li", "partner-logo", name);
      partnerRow.appendChild(logo);
    });
  }

  function markReady() {
    window.PortfolioContentReady = true;
    window.dispatchEvent(new Event("portfolio:content-ready"));
  }

  function readEmbeddedData() {
    var node = document.getElementById("info-data");
    if (!node) {
      console.error("main.js: no se encontró #info-data en index.html.");
      return null;
    }
    try {
      return JSON.parse(node.textContent);
    } catch (err) {
      console.error("main.js: el JSON dentro de #info-data no es válido.", err);
      return null;
    }
  }

  var data = readEmbeddedData() || {};
  renderServices(data.services);
  renderWorks(data.projects);
  renderTestimonials(data.testimonials);
  renderPartners(data.partners);

  // Ya terminado para cuando esta línea se ejecuta (sin ida y vuelta de
  // red) — se mantiene como una promesa resuelta para que el
  // Promise.all(...) de preloader.js siga funcionando sin cambios.
  window.PortfolioContentLoaded = Promise.resolve();
  markReady();
})();

/* Chips de About: marquesina infinita sin espacios vacíos.
   El loop mueve la pista -50%, lo cual solo es perfecto si la mitad de la
   pista es al menos tan ancha como el área visible. Entonces: se mide un
   conjunto, se clona hasta que la mitad de la pista cubra el contenedor, y
   luego se duplica eso. Se reconstruye cuando cambia el ancho del
   contenedor. El hover baja la velocidad al 25% (playbackRate de Web
   Animations, para que la posición no salte). */
(function () {
  var marquee = document.querySelector("[data-chip-marquee]");
  if (!marquee) return;
  var list = marquee.querySelector(".chip-list");
  var originals = Array.prototype.slice.call(list.children);
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var SPEED = 45; // px por segundo
  var lastWidth = 0;

  function build() {
    var width = marquee.clientWidth;
    if (!width || width === lastWidth) return;
    lastWidth = width;

    list.querySelectorAll("[data-chip-clone]").forEach(function (clone) {
      clone.remove();
    });
    marquee.classList.remove("chip-marquee--ready");
    if (reduceMotion.matches) return; // deja los chips haciendo wrap, estáticos

    // El ancho de un conjunto, márgenes incluidos (la lista mide max-content de ancho).
    list.style.width = "max-content";
    list.style.flexWrap = "nowrap";
    var setWidth = list.scrollWidth;
    list.style.width = "";
    list.style.flexWrap = "";
    if (!setWidth) return;

    var setsPerHalf = Math.max(1, Math.ceil(width / setWidth));
    for (var copy = 1; copy < setsPerHalf * 2; copy++) {
      originals.forEach(function (chip) {
        var clone = chip.cloneNode(true);
        clone.setAttribute("aria-hidden", "true");
        clone.setAttribute("data-chip-clone", "");
        list.appendChild(clone);
      });
    }

    list.style.setProperty("--marquee-duration", (setWidth * setsPerHalf) / SPEED + "s");
    marquee.classList.add("chip-marquee--ready");
  }

  // Ajusta suavemente el playbackRate de la animación CSS hacia un objetivo.
  var rampFrame = null;
  function rampSpeed(target) {
    var animation = list.getAnimations ? list.getAnimations()[0] : null;
    if (!animation) return;
    cancelAnimationFrame(rampFrame);
    var from = animation.playbackRate;
    var start = performance.now();
    (function step(now) {
      var t = Math.min((now - start) / 400, 1);
      animation.playbackRate = from + (target - from) * t;
      if (t < 1) rampFrame = requestAnimationFrame(step);
    })(start);
  }

  marquee.addEventListener("mouseenter", function () {
    rampSpeed(0.25);
  });
  marquee.addEventListener("mouseleave", function () {
    rampSpeed(1);
  });

  build();
  if (window.ResizeObserver) {
    new ResizeObserver(build).observe(marquee);
  } else {
    window.addEventListener("resize", build);
  }
  // El ancho de los chips cambia cuando carga la web font; volver a medir entonces.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      lastWidth = 0;
      build();
    });
  }
  reduceMotion.addEventListener("change", function () {
    lastWidth = 0;
    build();
  });
})();
