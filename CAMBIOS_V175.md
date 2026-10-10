# WMS Industrial V175 — cambios y auditoría

## Intervenciones en el código fuente

- **Cotas del plano:** `drawZoneEdgeDimensions()` ahora dibuja las dos cotas exteriores generales (ancho/alto) en lugar de rotular todas las aristas parciales y crear solapamientos. Las medidas específicas se consultan mediante la selección.
- **Cortes X/Y:** `renderSectionAxisSvg()` autoencuadra los racks visibles del corte. Mantiene su posición relativa, dibuja niveles legibles y muestra estados vacíos en lugar de miniaturas. La paleta del SVG se vuelve a calcular al alternar el tema.
- **Editor CAD:** controles de snap y cotas con estado accesible, barra compactada, elementos explicativos redundantes retirados, selección e inspector priorizados y acabado premium suave mediante `v175-premium-soft.css`.
- **Google Sheets:** lista de encabezados importados plegable y contador, controles de orden con etiquetas accesibles, apertura inicial de la sucursal activa y expansión sin marcos oscuros adicionales.
- **Visor de productos:** ficha normal compactada; el estilo **no** afecta a la tarjeta expandida (modal). Se restringen elementos decorativos absolutos en la tarjeta normal y se aíslan los scrolls.
- **Sidebar, temas, controles:** marca con espaciado, un único estado visual activo, coherencia dimensional en claro/oscuro y versión de assets actualizada para romper caché.
- **"Ver en 3D" del CAD:** no existe en el código del editor ni en su bundle. Se conserva la funcionalidad independiente de diseño 3D.
- **Infraestructura:** `wrangler.toml`, funciones Pages y migraciones D1 conservadas.

## Pruebas ejecutadas

- `npm run build` — correcta, bundle sincronizado.
- `npm run check` — pasan auditoría de funciones, CSS, autenticación, mobiliario y geometría, pruebas de V171/V173/V174 y nuevas V175.
- `python tests/visual-v175-css.py` — pruebas en Chromium con DOM representativo a 1440×900, 900×900 y 390×844, en ambos temas. Sin cambio dimensional al alternar temas, sin desbordamiento del documento, secciones X/Y a la misma altura y sucursales no recortadas.

## Verificaciones pendientes en entorno real

- El navegador de esta sesión no completó la carga integral del WMS con su bootstrap WebGL/datos; por tanto, el test CSS no demuestra la ausencia de cualquier solapamiento en la aplicación completa.
- No se validó la sincronización con Cloudflare D1 ni Google Sheets reales, ni todas las interacciones WebGL. Es obligatorio probar en Pages Preview con datos reales y en 80/100/125% de zoom antes de publicar en producción.
- El rediseño del editor es intencionalmente suave: no cambia la lógica de distribución de racks, ni geometría 3D, ni datos de usuario.
