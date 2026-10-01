/* Reads the portfolio content (services, projects, testimonials, partners)
   from the #info-data <script type="application/json"> block in index.html
   and renders each section from it.

   That data is read with JSON.parse(), not fetch(): fetching a separate
   info.json file is blocked by the browser's CORS rules when the page is
   opened directly via file:// (double-click on index.html), and double-click
   is how this site needs to work. If you'd rather keep the data in an
   actual standalone info.json file, that's doable too, but then the site
   has to be served over http(s) (e.g. VS Code's "Live Server" extension) —
   ask if you want to switch back to that.

   #info-data field reference (all of it is placeholder content — edit the
   JSON in index.html directly, no JS changes needed):
   - services[]:      label (short name shown in the list), icon (key into
                       SERVICE_ICONS below), title + description (used for
                       screen readers and a future /servicios page).
   - projects[]:      title, category (short tag), summary, initials
                       (2-letter fallback on the placeholder media blocks —
                       remove once you swap in a real screenshot; see the
                       TODO below where <img> should replace
                       .media-placeholder).
   - testimonials[]:  quote, name, role.
   - partners[]:      array of plain strings (client/partner names).

   Exposes window.PortfolioContentLoaded (a resolved promise — kept so
   preloader.js's Promise.all(...) still works unchanged) and fires a
   "portfolio:content-ready" event + sets window.PortfolioContentReady = true
   once rendering is done, so animations.js only wires up ScrollTrigger
   after the cards actually exist in the DOM (rendering here is synchronous,
   but the flag/event keep this file order-independent from animations.js). */

(function () {
  function el(tag, className, html) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  // --- Services ---
  // Inline SVG icons (currentColor, so they follow the row's hover color).
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
      row.href = "#"; // TODO: link to /servicios#[service] once that page exists.
      row.innerHTML =
        '<svg class="service-row__icon" data-service-icon viewBox="0 0 48 48" fill="currentColor" aria-hidden="true">' +
        (SERVICE_ICONS[service.icon] || SERVICE_ICONS.sparkle) +
        "</svg>" +
        // The title is rendered twice: the copy sits below and rolls up on hover.
        '<span class="service-row__title" aria-hidden="true">' +
        '<span class="service-row__roll">' + service.label +
        '<span class="service-row__roll-dup">' + service.label + "</span>" +
        "</span></span>" +
        '<span class="sr-only">' + service.title + ": " + service.description + "</span>";
      servicesList.appendChild(row);
    });
  }

  // --- Works (projects) ---
  // One row per project: tag + title + "Ver proyecto" link, then a large
  // main image and a smaller side image. Each .work-media gets the
  // clip-path reveal from animations.js and the hover zoom from CSS.
  function renderWorks(projects) {
    var worksGrid = document.querySelector("[data-works-grid]");
    if (!worksGrid || !projects) return;
    projects.forEach(function (project) {
      var href = "#"; // TODO: link to /work/[case] once case pages exist.
      var row = el("article", "work-row");
      row.innerHTML =
        '<div class="work-row__head">' +
        '<span class="work-row__tag">' + project.category + "</span>" +
        '<h3 class="work-row__title">' + project.title + "</h3>" +
        '<a class="work-row__link" href="' + href + '">Ver proyecto</a>' +
        "</div>" +
        '<p class="work-row__summary">' + project.summary + "</p>" +
        '<div class="work-row__media">' +
        // Main image: the accessible link for the case study.
        '<a class="work-media work-media--main" href="' + href + '" aria-label="' +
        project.title + ' — ver caso de estudio">' +
        '<div class="work-media__inner">' +
        // TODO: swap the placeholder for a real <img> screenshot.
        '<div class="media-placeholder" role="img" aria-label="Marcador de imagen del proyecto — ' +
        project.title + '">' + project.initials + "</div>" +
        "</div></a>" +
        // Side image: duplicate link, hidden from assistive tech and tab order.
        '<a class="work-media work-media--side" href="' + href + '" aria-hidden="true" tabindex="-1">' +
        '<div class="work-media__inner">' +
        '<div class="media-placeholder media-placeholder--alt">' + project.initials + "</div>" +
        "</div></a>" +
        "</div>";
      worksGrid.appendChild(row);
    });
  }

  // --- Testimonials ---
  function renderTestimonials(testimonials) {
    var testimonialsGrid = document.querySelector("[data-testimonials-grid]");
    if (!testimonialsGrid || !testimonials) return;
    testimonials.forEach(function (testimonial) {
      var card = el("article", "testimonial-card");
      card.innerHTML =
        "<blockquote>“" + testimonial.quote + "”</blockquote>" +
        "<footer><strong>" + testimonial.name + "</strong> — " + testimonial.role + "</footer>";
      testimonialsGrid.appendChild(card);
    });
  }

  // --- Partners ---
  function renderPartners(partners) {
    var partnerRow = document.querySelector("[data-partners-row]");
    if (!partnerRow || !partners) return;
    partners.forEach(function (name) {
      var logo = el("span", "partner-logo", name);
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

  // Already finished by the time this line runs (no network round-trip) —
  // kept as a resolved promise so preloader.js's Promise.all(...) still
  // works unchanged.
  window.PortfolioContentLoaded = Promise.resolve();
  markReady();
})();
