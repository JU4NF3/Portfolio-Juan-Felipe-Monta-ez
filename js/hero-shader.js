/* Hero WebGL shader — intentionally small ("toy" shader): a full-viewport
   triangle with a fragment shader that mixes an animated gradient with
   cheap hash-based noise. No libraries, plain `canvas.getContext('webgl')`.

   Degrades gracefully: the .hero section already has a CSS gradient behind
   the canvas (see hero.css), so if WebGL is unavailable or compilation
   fails, we just bail out early and that gradient is all the visitor sees.

   Future iteration ideas (not built now): real Perlin/simplex noise,
   mouse-reactive uniform (u_mouse), color driven by the active theme. */

(function () {
  var canvas = document.querySelector("[data-hero-canvas]");
  if (!canvas) return;

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
    "",
    "float hash(vec2 p) {",
    "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);",
    "}",
    "",
    "void main() {",
    "  vec2 uv = gl_FragCoord.xy / u_resolution.xy;",
    "  float n = hash(uv * 3.0 + u_time * 0.05);",
    "  vec3 colorA = vec3(0.05, 0.06, 0.05);",
    "  vec3 colorB = vec3(0.776, 1.0, 0.239);",
    "  float mixAmount = smoothstep(0.3, 0.9, uv.y + n * 0.08 + sin(u_time * 0.2) * 0.05);",
    "  vec3 color = mix(colorA, colorB, mixAmount * 0.35);",
    "  gl_FragColor = vec4(color, 1.0);",
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

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  } catch (err) {
    console.warn("hero-shader: setup failed", err);
    return;
  }

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width = canvas.clientWidth * dpr;
    var height = canvas.clientHeight * dpr;
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  }

  function render(time) {
    resize();
    gl.uniform1f(uTime, time * 0.001);
    gl.uniform2f(uResolution, canvas.width, canvas.height);
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
