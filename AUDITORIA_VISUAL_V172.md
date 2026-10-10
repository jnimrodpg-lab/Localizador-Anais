# Auditoría de interfaz — WMS Industrial V172

## Problemas reales detectados en V171

1. El espacio virtual utilizaba `height:calc(100vh - 146px)` dentro de un contenedor ya limitado por el viewport y por `zoom:0.8`; quedaban grandes bandas vacías.
2. El editor CAD incorporaba reglas contradictorias de `grid`, `min-height` y media queries. Parte del alto disponible se perdía y el contenido se recortaba.
3. `#layoutSectionWrap` estaba dentro de `.v80-canvas-wrap`, actuando en la práctica como overlay; además V170 forzaba los cortes a una sola columna.
4. Los tokens heredados establecían `--sidebar-w:210px` con el tema claro, pero V171 esperaba `236px`. **Cambiar de tema variaba la anchura de todo el workspace.**
5. La regla `v170-refinement.css` agregaba `stroke:rgba(255,250,243,.96)` y `stroke-width:3.4px` a textos del SVG (rebordes blancos excesivos).
6. Las sucursales tenían estilos de `.company-card` y `.company-branch-card` anidados, heredando marcos y sombreados inadecuados.

## Correcciones implementadas

- Vista virtual flex con columnas laterales de ancho limitado, lienzo principal flexible y `ResizeObserver` ya existente en el motor 3D.
- Vista CAD redistribuida en contenedores que crecen con el viewport; canvas e inspector comparten el espacio sin desbordar.
- Secciones X/Y movidas fuera del contenedor del canvas, en fila horizontal, con **Mostrar secciones** / **Ocultar secciones** operativos.
- Dimensiones de sidebar, buscador y columnas fijadas de forma equivalente en claro y oscuro; solo cambian variables de color.
- Reemplazo del borde luminoso SVG por contornos finos oscuros; etiquetas duplicadas de zona suprimidas cuando su ID ya aparece en el título.
- Eliminado el contenedor externo de sucursales: tarjetas individuales con fondo de tema y expansión libre.
- Activos versionados como `wms-v172-responsive-workspace` para impedir servir CSS o JS de la versión anterior desde caché.

## Verificaciones realizadas

- `npm run build`: **OK**.
- `npm run check`: pruebas de integridad frontend, estilos, geometría virtual y compatibilidad de autenticación.
- Playwright/Chromium en 390×844, 768×1024 y 1440×900, temas claro/oscuro, vistas de inicio, layout y espacio virtual: **sin desbordamiento horizontal**.
- 1440×900: diferencias de ancho/alto de los paneles de contenido, layout, canvas, espacio virtual y sucursales al alternar tema: **0 px**.
- Confirmada posición horizontal de las vistas de sección X/Y y activación/desactivación desde el botón del editor.
- Inspeccionado visualmente el layout principal y sucursales en ambos temas.

## Limitaciones de la auditoría

- Las verificaciones automatizadas del espacio 3D confirman dimensiones y eventos, **no constituyen prueba gráfica del render WebGL completo** en esta sesión; el motor Three.js usa la dependencia del build y requiere GPU/WebGL al desplegar.
- No se ejecutó una conexión real a Cloudflare D1 ni una importación real de Google Sheets. El Wrangler y las migraciones se han mantenido sin cambios.

## Despliegue

1. Subir el contenido de `WMS_Industrial_V172/` al repositorio usado por Cloudflare Pages.
2. Comando de build: `npm ci && npm run build` (o `npm run build` si el gestor ya instala las dependencias).
3. Directorio de salida: `public`.
4. Mantener la vinculación D1 `DB` existente en la configuración de Pages.
5. Abrir la URL del nuevo despliegue; los `?v=wms-v172-responsive-workspace` del HTML permiten verificar que se está sirviendo esta revisión.
