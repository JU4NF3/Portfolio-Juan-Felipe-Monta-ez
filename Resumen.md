# Juanfe — resumen de análisis

## Perfil
Soy un esudiante de Creación Digital de la Universidad del Bosque, mis mayores intereses están basados en la UI/UX, Motion Grapphics, Creación de identidad de Marca, Web Gl y cosas relacionadas al modelado 3D.

## Skills
- Modelado 

## Contenido
Portafolio personal real de Juan Felipe, quien soy. Trabajos Hechos, testimonios y partners.

## Enfoque
Captar clientes: el CTA principal, "Book a call" / "Let's talk", lleva a una agenda en Cal.

## Público objetivo
Founders de startups y equipos de producto de empresas grandes.

## Estructura
Home con 7 secciones: hero, about, services, works, CTA a works, testimonios, partners. Páginas internas: `/work` (con vista lista/grid), `/work/[caso]`, `/services`, `/pricing`, `/about`, `/privacy` y `/terms`.

## UX
- En desktop, el nav es una "píldora" `fixed` centrada en la parte inferior de la pantalla, con enlaces, toggle de tema claro/oscuro y CTA.
- En móvil, el nav se reemplaza por un botón "open menu".
- Hay un preloader con contador de %.
- Transición entre páginas: 6 paneles cubren la pantalla (900 ms), luego se recarga la página completa y los paneles se retiran.
- El cambio lista/grid en `/work` usa View Transitions API.
- Respeta `prefers-reduced-motion`.

## UI
- Fondo oscuro (`#121212`) con tema claro opcional.
- Tipografía Montserrat combinada con Poppins en los títulos.
- Hero con shader WebGL propio en `<canvas>`.
- Animaciones con GSAP (ScrollTrigger, SplitText) integrado en el código del sitio.
- Showreel en video `.webm`.
- 67 imágenes, entre fotos de casos y logos.