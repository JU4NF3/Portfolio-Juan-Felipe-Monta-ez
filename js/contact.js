/* Envío del formulario de contacto por correo, vía Web3Forms (https://web3forms.com).
   El servicio recibe el formulario y lo reenvía al correo con el que se generó
   la clave. Pasos para activarlo:
     1. Entra a https://web3forms.com, escribe tu correo y pulsa "Create Access Key".
     2. Te llega la clave (access key) por correo.
     3. Pégala abajo en ACCESS_KEY.
   La clave es pública por diseño (no es una contraseña): solo permite enviar
   mensajes hacia tu correo. */
(function () {
  "use strict";

  var ACCESS_KEY = "6cac91cd-7692-4ba8-bba4-6ca86bc1ae02";
  var ENDPOINT = "https://api.web3forms.com/submit";

  var form = document.getElementById("contact-form");
  if (!form) return;

  var button = form.querySelector(".contact-btn");
  var status = form.querySelector("[data-contact-status]");
  var idleLabel = button ? button.textContent : "";

  function setStatus(message, type) {
    if (!status) return;
    status.textContent = message;
    status.setAttribute("data-type", type || "");
  }

  function setSending(sending) {
    if (!button) return;
    button.disabled = sending;
    button.textContent = sending ? "Enviando..." : idleLabel;
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    // Campo trampa para bots: las personas no lo ven ni lo llenan.
    var honeypot = form.querySelector('input[name="botcheck"]');
    if (honeypot && honeypot.checked) return;

    if (ACCESS_KEY === "PEGA_AQUI_TU_ACCESS_KEY") {
      setStatus("El envío aún no está configurado. Escríbeme directamente por correo.", "error");
      return;
    }

    var data = {
      access_key: ACCESS_KEY,
      subject: "Nuevo mensaje desde tu portafolio",
      from_name: "Portafolio Juan Felipe",
      name: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      message: form.elements.message.value.trim(),
    };

    setSending(true);
    setStatus("", "");

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(data),
    })
      .then(function (response) {
        return response.json().then(function (body) {
          return { ok: response.ok && body.success, body: body };
        });
      })
      .then(function (result) {
        if (result.ok) {
          form.reset();
          setStatus("¡Mensaje enviado! Te responderé muy pronto.", "success");
        } else {
          setStatus("No se pudo enviar el mensaje. Inténtalo de nuevo en unos minutos.", "error");
        }
      })
      .catch(function () {
        setStatus("No hay conexión o el servicio no respondió. Inténtalo de nuevo.", "error");
      })
      .then(function () {
        setSending(false);
      });
  });
})();
