/* Panel de gestión de contenido para gestion.html.

   No hay backend, así que esto no puede escribir index.html por sí solo.
   Lo que sí hace en su lugar:
   - Mantiene los datos (servicios, proyectos, testimonios, aliados) en
     memoria y los refleja en localStorage en cada cambio, para que no se
     pierda nada al recargar.
   - Renderiza una vista previa en vivo del JSON al final, con la forma
     exacta que va dentro del bloque <script id="info-data"> de index.html.
   - Permite copiar ese JSON (portapapeles, con un respaldo de selección
     manual) para pegarlo en index.html a mano.
   - Permite importar un bloque JSON existente (por ejemplo, si index.html
     se editó directamente y la copia de este panel quedó desactualizada).

   DEFAULT_DATA más abajo es una foto del #info-data de index.html al
   momento de escribir este archivo — "Restaurar valores actuales del
   sitio" restablece a eso. Si después editas el JSON de index.html a mano,
   usa el cuadro de "Importar" en vez del botón de reset para no perder esa
   edición. */

(function () {
  var STORAGE_KEY = "portfolio-gestion-data";

  var DEFAULT_DATA = {
    services: [
      {
        label: "Diseño UI/UX",
        icon: "burst",
        title: "Diseño UI/UX",
        description:
          "Diseño de producto de punta a punta: research, wireframes e interfaces de alta fidelidad enfocadas en usabilidad.",
      },
      {
        label: "Motion Graphics",
        icon: "sparkle",
        title: "Motion Graphics",
        description:
          "Identidades animadas, loops explicativos y micro-interacciones que le dan movimiento a una marca.",
      },
      {
        label: "Identidad de marca",
        icon: "asterisk",
        title: "Identidad de Marca",
        description:
          "Sistemas visuales — logo, tipografía, color y tono — construidos para sostenerse en producto y marketing.",
      },
      {
        label: "WebGL",
        icon: "diamonds",
        title: "Experiencias en WebGL",
        description:
          "Shaders propios y trabajo interactivo en canvas para secciones hero y vitrinas de producto.",
      },
      {
        label: "Modelado 3D",
        icon: "cube",
        title: "Modelado y Visualización 3D",
        description:
          "Modelado de producto y de escena para renders, previews en tiempo real y piezas de motion.",
      },
    ],
    projects: [
      {
        title: "Northwind Banking App",
        category: "UI/UX · Fintech",
        summary: "Rediseño de un flujo de banca móvil para reducir el abandono en el onboarding.",
        initials: "NB",
      },
      {
        title: "Loop Studio Rebrand",
        category: "Identidad de Marca",
        summary: "Refresco completo de identidad para un estudio de diseño de motion.",
        initials: "LS",
      },
      {
        title: "Halo Product Launch",
        category: "WebGL · Motion",
        summary: "Landing page interactiva en WebGL para el lanzamiento de un producto de hardware.",
        initials: "HP",
      },
      {
        title: "Atlas Dashboard",
        category: "UI/UX · SaaS",
        summary: "Rediseño de un dashboard denso en datos para una plataforma de logística.",
        initials: "AD",
      },
    ],
    testimonials: [
      {
        quote: "Juanfe convirtió un brief vago en una interfaz que a nuestros usuarios realmente les gusta usar.",
        name: "Alex Rivera",
        role: "Founder, Northwind",
      },
      {
        quote: "El sistema de marca que construyó es lo primero que los nuevos empleados elogian.",
        name: "Priya Shah",
        role: "Head of Product, Loop Studio",
      },
      {
        quote: "Rápido, comunicativo, y el trabajo de motion subió la conversión de nuestro lanzamiento.",
        name: "Marco Dinelli",
        role: "CEO, Halo",
      },
    ],
    partners: ["Northwind", "Loop Studio", "Halo", "Atlas", "Ventures Lab"],
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* almacenamiento corrupto/no disponible — se usan los valores por defecto */
    }
    return clone(DEFAULT_DATA);
  }

  var state = loadState();

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* almacenamiento lleno/no disponible — la página sigue funcionando, solo no persistirá */
    }
    renderOutput();
  }

  // --- Renderizado genérico de listas (services / projects / testimonials) ---
  var LIST_CONFIG = {
    services: {
      titleField: "label",
      metaField: "description",
    },
    projects: {
      titleField: "title",
      metaField: "summary",
    },
    testimonials: {
      titleField: "name",
      metaField: "quote",
    },
  };

  function renderList(section) {
    var config = LIST_CONFIG[section];
    var listEl = document.querySelector('[data-list="' + section + '"]');
    if (!listEl) return;
    listEl.innerHTML = "";
    state[section].forEach(function (item, index) {
      var li = document.createElement("li");
      li.className = "gestion-row";
      li.innerHTML =
        '<div class="gestion-row__body">' +
        '<div class="gestion-row__title"></div>' +
        '<div class="gestion-row__meta"></div>' +
        "</div>" +
        '<div class="gestion-row__actions">' +
        '<button type="button" data-action="edit">Editar</button>' +
        '<button type="button" data-action="remove">Eliminar</button>' +
        "</div>";
      li.querySelector(".gestion-row__title").textContent = item[config.titleField];
      li.querySelector(".gestion-row__meta").textContent = item[config.metaField];
      li.querySelector('[data-action="edit"]').addEventListener("click", function () {
        startEdit(section, index);
      });
      li.querySelector('[data-action="remove"]').addEventListener("click", function () {
        if (!window.confirm("¿Eliminar este elemento?")) return;
        state[section].splice(index, 1);
        saveState();
        renderList(section);
      });
      listEl.appendChild(li);
    });
  }

  function startEdit(section, index) {
    var form = document.querySelector('[data-form="' + section + '"]');
    if (!form) return;
    var item = state[section][index];
    Object.keys(item).forEach(function (key) {
      var field = form.elements[key];
      if (field) field.value = item[key];
    });
    form.querySelector("[data-edit-index]").value = String(index);
    form.querySelector("[data-submit-label]").textContent = "Guardar cambios";
    form.querySelector("[data-cancel-edit]").hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function resetForm(form) {
    form.reset();
    form.querySelector("[data-edit-index]").value = "";
    var addLabels = {
      services: "Agregar servicio",
      projects: "Agregar proyecto",
      testimonials: "Agregar testimonio",
    };
    var section = form.getAttribute("data-form");
    var submitLabel = form.querySelector("[data-submit-label]");
    if (submitLabel) submitLabel.textContent = addLabels[section] || "Agregar";
    var cancelBtn = form.querySelector("[data-cancel-edit]");
    if (cancelBtn) cancelBtn.hidden = true;
    var status = form.querySelector("[data-form-status]");
    if (status) status.textContent = "";
  }

  function wireListForm(section) {
    var form = document.querySelector('[data-form="' + section + '"]');
    if (!form) return;

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var formData = new FormData(form);
      var item = {};
      formData.forEach(function (value, key) {
        item[key] = String(value).trim();
      });

      var missing = Object.keys(item).filter(function (key) {
        return !item[key];
      });
      var status = form.querySelector("[data-form-status]");
      if (missing.length) {
        status.textContent = "Completa todos los campos antes de guardar.";
        return;
      }
      status.textContent = "";

      var editIndex = form.querySelector("[data-edit-index]").value;
      if (editIndex !== "") {
        state[section][Number(editIndex)] = item;
      } else {
        state[section].push(item);
      }
      saveState();
      renderList(section);
      resetForm(form);
    });

    var cancelBtn = form.querySelector("[data-cancel-edit]");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () {
        resetForm(form);
      });
    }
  }

  // --- Partners: chips de texto simple ---
  function renderPartners() {
    var row = document.querySelector("[data-partners-chips]");
    if (!row) return;
    row.innerHTML = "";
    state.partners.forEach(function (name, index) {
      var chip = document.createElement("span");
      chip.className = "gestion-chip";
      chip.innerHTML = "<span></span><button type=\"button\" aria-label=\"Eliminar " + name + "\">×</button>";
      chip.querySelector("span").textContent = name;
      chip.querySelector("button").addEventListener("click", function () {
        state.partners.splice(index, 1);
        saveState();
        renderPartners();
      });
      row.appendChild(chip);
    });
  }

  function wirePartnersForm() {
    var form = document.querySelector('[data-form="partners"]');
    if (!form) return;
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var input = form.elements.name;
      var name = input.value.trim();
      var status = document.querySelector('[data-section-status="partners"]');
      if (!name) {
        status.textContent = "Escribe un nombre antes de agregar.";
        return;
      }
      if (state.partners.indexOf(name) !== -1) {
        status.textContent = "Ese partner ya está en la lista.";
        return;
      }
      status.textContent = "";
      state.partners.push(name);
      saveState();
      renderPartners();
      form.reset();
    });
  }

  // --- Salida JSON ---
  function renderOutput() {
    var output = document.querySelector("[data-output]");
    if (output) output.value = JSON.stringify(state, null, 2);
  }

  function wireOutputActions() {
    var copyBtn = document.querySelector("[data-copy-json]");
    var status = document.querySelector("[data-copy-status]");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        var output = document.querySelector("[data-output]");
        var text = output.value;

        function showCopied() {
          status.textContent = "¡Copiado! Pégalo en el <script id=\"info-data\"> de index.html.";
          window.setTimeout(function () {
            status.textContent = "";
          }, 4000);
        }

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(showCopied, function () {
            // Usa el respaldo de abajo si el permiso/API falla por cualquier motivo.
            fallbackCopy(output, showCopied, status);
          });
        } else {
          fallbackCopy(output, showCopied, status);
        }
      });
    }

    var resetBtn = document.querySelector("[data-reset-data]");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        if (!window.confirm("Esto reemplaza todo lo que editaste acá por los valores que estaban en index.html cuando se creó este panel. ¿Seguro?")) {
          return;
        }
        state = clone(DEFAULT_DATA);
        saveState();
        renderAll();
      });
    }
  }

  function fallbackCopy(textarea, onSuccess, status) {
    try {
      textarea.removeAttribute("readonly");
      textarea.focus();
      textarea.select();
      var ok = document.execCommand("copy");
      textarea.setAttribute("readonly", "");
      if (ok) {
        onSuccess();
        return;
      }
    } catch (e) {
      /* execCommand no soportado/bloqueado — se pasa a las instrucciones manuales */
    }
    textarea.focus();
    textarea.select();
    status.textContent = "No pude copiar automáticamente — el texto ya está seleccionado, usa Ctrl+C.";
  }

  function wireImport() {
    var btn = document.querySelector("[data-import-btn]");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var textarea = document.querySelector("[data-import-textarea]");
      var status = document.querySelector("[data-import-status]");
      var parsed;
      try {
        parsed = JSON.parse(textarea.value);
      } catch (e) {
        status.textContent = "Ese texto no es JSON válido: " + e.message;
        return;
      }
      ["services", "projects", "testimonials", "partners"].forEach(function (key) {
        if (!Array.isArray(parsed[key])) parsed[key] = [];
      });
      state = parsed;
      saveState();
      renderAll();
      status.textContent = "Importado.";
      textarea.value = "";
    });
  }

  function renderAll() {
    renderList("services");
    renderList("projects");
    renderList("testimonials");
    renderPartners();
    renderOutput();
    ["services", "projects", "testimonials"].forEach(function (section) {
      var form = document.querySelector('[data-form="' + section + '"]');
      if (form) resetForm(form);
    });
  }

  wireListForm("services");
  wireListForm("projects");
  wireListForm("testimonials");
  wirePartnersForm();
  wireOutputActions();
  wireImport();
  renderAll();
})();
