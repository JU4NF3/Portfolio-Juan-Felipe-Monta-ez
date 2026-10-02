/* Shader WebGL del hero — bandas suaves de luz verde que se mueven
   lentamente, más un resplandor que sigue al cursor mientras está sobre el
   hero. Sin librerías, `canvas.getContext('webgl')` puro.

   Cómo funcionan las bandas: se suman unas cuantas ondas seno a lo largo
   de x; su fase se curva con otras ondas seno sobre y y el tiempo, así las
   bandas se mecen y respiran en vez de deslizarse. La suma se eleva al
   cuadrado para mantener los espacios oscuros anchos y los núcleos
   brillantes angostos, y luego se mapea a través de una paleta
   verde-oscuro → lima.

   Resplandor del cursor: la posición del mouse (suavizada hacia el puntero
   real en cada frame, para que vaya un poco rezagada) agrega luz dentro de
   un radio; u_hover desvanece ese resplandor al entrar el puntero al hero
   y lo apaga al salir.

   Degrada con elegancia: la sección .hero ya tiene un gradiente CSS detrás
   del canvas (ver hero.css), así que si WebGL no está disponible o la
   compilación falla, simplemente se sale temprano y ese gradiente es todo
   lo que ve el visitante. */

(function () {
  var canvas = document.querySelector("[data-hero-canvas]");
  if (!canvas) return;
  var hero = canvas.closest(".hero") || canvas.parentElement;

  var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) return; // Sin soporte WebGL — el gradiente de respaldo en CSS se mantiene visible.

  var VERTEX_SRC = [
    "attribute vec2 a_position;",
    "void main() {",
    "  gl_Position = vec4(a_position, 0.0, 1.0);",
    "}",
  ].join("\n");

  var FRAGMENT_SRC = [
    "precision mediump float;",
    "uniform float u_time;",
    "uniform vec2 u_resolution;",
    "uniform vec2 u_mouse;   // 0..1, origen abajo-izquierda",
    "uniform float u_hover;  // 0..1, intensidad del resplandor",
    "",
    "float hash(vec2 p) {",
    "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);",
    "}",
    "",
    "// Brillo de las bandas de luz en uv (0 = espacio oscuro, 1 = núcleo de la banda).",
    "float bands(vec2 uv, float t) {",
    "  float sway = sin(uv.y * 2.1 - t * 0.55) + 0.5 * sin(uv.y * 0.9 + t * 0.3 + 2.0);",
    "  float w = sin(uv.x * 7.0 + sway * 1.3 + t * 0.6) * 0.6",
    "          + sin(uv.x * 3.7 - sway * 0.7 + t * 0.4) * 0.45",
    "          + sin(uv.x * 13.0 + sway * 0.4 - t * 0.25) * 0.18;",
    "  return pow(clamp(w * 0.5 + 0.5, 0.0, 1.0), 2.0);",
    "}",
    "",
    "void main() {",
    "  vec2 uv = gl_FragCoord.xy / u_resolution.xy;",
    "  float t = u_time * 0.3;",
    "  float f = bands(uv, t);",
    "",
    "  // Resplandor del cursor, redondo sin importar el aspect ratio del canvas.",
    "  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);",
    "  float d = distance(uv * aspect, u_mouse * aspect);",
    "  f += smoothstep(0.45, 0.0, d) * 0.6 * u_hover;",
    "",
    "  vec3 deep   = vec3(0.055, 0.045, 0.010);",
    "  vec3 mid    = vec3(0.380, 0.300, 0.020);",
    "  vec3 bright = vec3(0.950, 0.780, 0.050); // un poco por debajo del acento #ffd60a",
    "  vec3 col = mix(deep, mid, smoothstep(0.12, 0.65, f));",
    "  col = mix(col, bright, smoothstep(0.78, 1.10, f));",
    "",
    "  // Se desvanece hacia el fondo de la página en la parte inferior del hero.",
    "  col *= mix(0.25, 1.0, smoothstep(0.0, 0.5, uv.y));",
    "",
    "  // Grano fino para que los gradientes no se vean a bandas en pantallas de 8 bits.",
    "  col += (hash(gl_FragCoord.xy) - 0.5) * 0.02;",
    "  gl_FragColor = vec4(col, 1.0);",
    "}",
  ].join("\n");

  function compileShader(type, source) {
    var shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("hero-shader: compile error", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  var program;
  var uTime;
  var uResolution;
  var uMouse;
  var uHover;

  try {
    var vertexShader = compileShader(gl.VERTEX_SHADER, VERTEX_SRC);
    var fragmentShader = compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    if (!vertexShader || !fragmentShader) return;

    program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("hero-shader: link error", gl.getProgramInfoLog(program));
      return;
    }

    // Un solo triángulo a pantalla completa (cubre la pantalla sin necesitar un segundo).
    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );

    var positionLocation = gl.getAttribLocation(program, "a_position");
    uTime = gl.getUniformLocation(program, "u_time");
    uResolution = gl.getUniformLocation(program, "u_resolution");
    uMouse = gl.getUniformLocation(program, "u_mouse");
    uHover = gl.getUniformLocation(program, "u_hover");

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  } catch (err) {
    console.warn("hero-shader: setup failed", err);
    return;
  }

  // El campo es muy suave, así que renderizar a 1x incluso en pantallas
  // retina se ve igual y cuesta una cuarta parte de los píxeles.
  function resize() {
    var width = Math.max(2, Math.round(canvas.clientWidth));
    var height = Math.max(2, Math.round(canvas.clientHeight));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  // Estado del puntero: `target` es dónde está el puntero, `mouse` se
  // suaviza hacia él en cada frame (ese rezago es lo que hace que la luz
  // se sienta como que sigue al cursor).
  var mouse = [0.7, 0.5];
  var target = [0.7, 0.5];
  var hover = 0;
  var hoverTarget = 0;

  function render(time) {
    resize();
    mouse[0] += (target[0] - mouse[0]) * 0.08;
    mouse[1] += (target[1] - mouse[1]) * 0.08;
    hover += (hoverTarget - hover) * 0.06;

    gl.uniform1f(uTime, time * 0.001);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
    gl.uniform2f(uMouse, mouse[0], mouse[1]);
    gl.uniform1f(uHover, hover);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var rafId = null;
  var isVisible = true;

  function loop(time) {
    render(time);
    if (isVisible && !reducedMotion) {
      rafId = requestAnimationFrame(loop);
    } else {
      // Limpia el id para que el callback del IntersectionObserver sepa que
      // es seguro reiniciar el loop la próxima vez que el hero vuelva a verse.
      rafId = null;
    }
  }

  // Resplandor del cursor: solo mouse/lápiz (en touch no hay nada que
  // seguir), y no con movimiento reducido.
  if (!reducedMotion) {
    hero.addEventListener("pointermove", function (event) {
      if (event.pointerType === "touch") return;
      var box = canvas.getBoundingClientRect();
      target[0] = (event.clientX - box.left) / box.width;
      target[1] = 1 - (event.clientY - box.top) / box.height; // en GL, y apunta hacia arriba
      hoverTarget = 1;
    });
    hero.addEventListener("pointerleave", function () {
      hoverTarget = 0;
    });
  }

  // Pausa el loop de animación en cuanto el hero sale de la vista.
  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(function (entries) {
      isVisible = entries[0].isIntersecting;
      if (isVisible && !reducedMotion && rafId === null) {
        rafId = requestAnimationFrame(loop);
      }
    });
    observer.observe(canvas);
  }

  window.addEventListener("resize", resize);

  if (reducedMotion) {
    render(0); // un solo frame estático, sin loop de animación
  } else {
    rafId = requestAnimationFrame(loop);
  }
})();
