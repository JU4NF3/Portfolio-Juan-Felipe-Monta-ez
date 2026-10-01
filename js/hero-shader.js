/* Hero WebGL shader — soft, slowly drifting bands of green light, plus a
   glow that follows the cursor while it's over the hero. No libraries,
   plain `canvas.getContext('webgl')`.

   How the bands work: a few sine waves across x are summed; their phase is
   bent by other sines over y and time, so the bands sway and breathe
   instead of sliding. The sum is squared to keep the dark gaps wide and
   the bright cores narrow, then mapped through a dark-green → lime palette.

   Cursor glow: the mouse position (eased toward the real pointer each
   frame, so it trails a little) adds light within a radius; u_hover fades
   that glow in when the pointer enters the hero and out when it leaves.

   Degrades gracefully: the .hero section already has a CSS gradient behind
   the canvas (see hero.css), so if WebGL is unavailable or compilation
   fails, we just bail out early and that gradient is all the visitor sees. */

(function () {
  var canvas = document.querySelector("[data-hero-canvas]");
  if (!canvas) return;
  var hero = canvas.closest(".hero") || canvas.parentElement;

  var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) return; // No WebGL support — CSS fallback gradient stays visible.

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
    "uniform vec2 u_mouse;   // 0..1, origin bottom-left",
    "uniform float u_hover;  // 0..1, glow strength",
    "",
    "float hash(vec2 p) {",
    "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);",
    "}",
    "",
    "// Brightness of the light bands at uv (0 = dark gap, 1 = band core).",
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
    "  // Cursor glow, round regardless of the canvas aspect ratio.",
    "  vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);",
    "  float d = distance(uv * aspect, u_mouse * aspect);",
    "  f += smoothstep(0.45, 0.0, d) * 0.6 * u_hover;",
    "",
    "  vec3 deep   = vec3(0.020, 0.055, 0.020);",
    "  vec3 mid    = vec3(0.180, 0.360, 0.050);",
    "  vec3 bright = vec3(0.640, 0.900, 0.200); // a touch under the #c6ff3d accent",
    "  vec3 col = mix(deep, mid, smoothstep(0.12, 0.65, f));",
    "  col = mix(col, bright, smoothstep(0.78, 1.10, f));",
    "",
    "  // Fade toward the page background at the bottom of the hero.",
    "  col *= mix(0.25, 1.0, smoothstep(0.0, 0.5, uv.y));",
    "",
    "  // Fine grain so the gradients don't band on 8-bit screens.",
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

    // Single full-viewport triangle (covers the screen without a second one).
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

  // The field is very smooth, so rendering at 1x even on retina screens
  // looks the same and costs a quarter of the pixels.
  function resize() {
    var width = Math.max(2, Math.round(canvas.clientWidth));
    var height = Math.max(2, Math.round(canvas.clientHeight));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  // Pointer state: `target` is where the pointer is, `mouse` eases toward
  // it every frame (that lag is what makes the light feel like it follows).
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
      // Clear the id so the IntersectionObserver callback knows it's safe
      // to restart the loop next time the hero scrolls back into view.
      rafId = null;
    }
  }

  // Cursor glow: mouse/pen only (on touch there's nothing to follow), and
  // not with reduced motion.
  if (!reducedMotion) {
    hero.addEventListener("pointermove", function (event) {
      if (event.pointerType === "touch") return;
      var box = canvas.getBoundingClientRect();
      target[0] = (event.clientX - box.left) / box.width;
      target[1] = 1 - (event.clientY - box.top) / box.height; // GL y is up
      hoverTarget = 1;
    });
    hero.addEventListener("pointerleave", function () {
      hoverTarget = 0;
    });
  }

  // Pause the animation loop once the hero scrolls out of view.
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
    render(0); // single static frame, no animation loop
  } else {
    rafId = requestAnimationFrame(loop);
  }
})();
