# WMS Industrial V173 — Auditoría y corrección estructural (09/10/2026)

## Cambios reales de código

1. **Espacio virtual:** estructura de cabecera separada en título y controles, altura automática para la barra, sin botones superpuestos con el lienzo. Panel lateral e inspector con scroll propio; escenario ocupa la altura restante. Ayuda desplegable en vez de 5 instrucciones fijas.
2. **3D:** retirados letreros individuales N1…Nn que cubrían las estanterías; letreros de identificación de muebles reducidos, de alto contraste y ubicados sobre ellos. Niveles y posiciones se gestionan en el inspector sin modificar su modelo de datos.
3. **Sheets:** eliminado **del JavaScript** el wrapper negro de gradiente y las alturas/scroll forzadas. Tarjetas se expanden naturalmente dentro del scroll principal. Los encabezados de la fila 1 se presentan como texto informativo en lugar de chips con apariencia pulsable. Mapeo de columnas con grid flexible.
4. **Ficha de productos en Sheets:** el espacio de resumen ocupa ahora una fila de 40 px; la tarjeta y la tabla están en filas independientes, con scroll propio para contenido largo y sin superposición. Botones compactados.
5. **Editor CAD:** barra superior y contextual separadas; canvas sin borde grueso ni padding superpuesto; inspector con scroll. Secciones X/Y horizontales por debajo del canvas, activables desde la barra o desde el panel de secciones.
6. **Cotas y texto SVG:** tipografía base de cota disminuida (32→17), CSS limita el tamaño visual extremo y sustituye el halo grueso por trazo fino oscuro.
7. **Responsive:** corregido un bug crítico de *flex-basis: 0* que dejaba el grid de layout con altura cero a 390 px, provocando que el inspector se dibujara encima del plano. En móvil las áreas ahora se apilan con alto real y el inspector tiene scroll acotado.
8. **Temas:** una misma definición de geometría para claro/oscuro. Los valores cromáticos se obtienen de `tokens.css`.
9. **Eliminación de duplicados:** `v172-workspace.css`, copia no utilizada de render de Sheets, scripts obsoletos de captura; el CSS anterior con parches repetidos de V171 se depuró.

## Verificaciones ejecutadas

- `npm run build`, `npm run check`: pruebas de sincronía de bundle, estilos, autenticación, mobiliario geométrico, colisiones y fuente de datos.
- Playwright/Chromium: vistas 3D, CAD y Sheets inspeccionadas a 390×844 y 1440×900. Se comprobó la distribución de secciones X/Y y la desaparición de desbordamientos principales. La prueba rápida a 390×844 indicó OK para las tres vistas en ambos temas.
- Se constató en Chromium a 1440×900 que el espacio 3D ocupa 860 px de un contenido de 876 px, y el editor CAD 782 px de un contenido de 798 px.

## Límites de la auditoría

- No se confirmó el **renderizado WebGL real** en este contenedor: Three.js debe instalarse mediante `npm ci` para generar `public/vendor/three.module.js` al compilar. El fallback CDN depende de conexión de red.
- No se accedió a Cloudflare D1 de producción ni a hojas privadas de Google. Los flujos reales de guardar, importar y permisos requieren validación con una rama Preview.
- Las pruebas visuales sin servicios externos no garantizan ausencia absoluta de bugs en todos los dispositivos o conjuntos de datos.

## Despliegue sin afectar base de datos

Cloudflare Pages: comando de compilación `npm run build`, directorio de salida `public`, ruta raíz la carpeta del proyecto. Mantener exactamente las bindings `DB`, `wrangler.toml`, `functions/` y `migrations/`. Usar primero Preview y **no volver a inicializar ni eliminar D1**.
