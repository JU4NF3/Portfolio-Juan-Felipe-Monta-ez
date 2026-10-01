# Juan Felipe Montañez — Portfolio

Portafolio personal. HTML, CSS y JavaScript vanilla — sin frameworks ni paso de build, así que no hay `npm install` que correr: el sitio se abre tal cual.

## Estructura

```
index.html          Página única (home), incluye el bloque #info-data con
                     el contenido (servicios, proyectos, testimonios, partners)
css/                 tokens, base, layout, componentes, hero, reduced-motion
js/                  theme, nav, preloader, transición de paneles, shader
                     WebGL del hero, animaciones (GSAP) y el render de
                     #info-data (main.js)
```

Dependencias externas, todas por CDN (no requieren instalación):
- [GSAP 3.13](https://gsap.com/) (`ScrollTrigger`, `SplitText`) — jsdelivr.
- Google Fonts: Montserrat + Poppins.

## Editar el contenido

Servicios, proyectos, testimonios y partners viven en el bloque
`<script id="info-data" type="application/json">` dentro de `index.html`.
Es JSON de verdad — se edita ahí directo, sin tocar JS. Ver el comentario al
inicio de `js/main.js` para el significado de cada campo.

## Ver el sitio en local

Abre `index.html` con doble clic — no necesita servidor.

## GitHub Pages

Publicado desde la rama `main`, raíz del repo.
