# WMS Industrial V174 — Corrección puntual del editor CAD

## Cambios
- Eliminado **Ver en 3D** de la barra CAD y de las acciones contextuales, incluidos handlers y CSS sin uso.
- **No** se ha borrado el espacio 3D independiente, el recorrido 3D ni la lógica WebGL / Wrangler / D1.
- Corregida la relación entre `viewBox` y altura de las secciones X e Y: SVG más legibles y ocupando el ancho de cada tarjeta.
- Eliminado el segundo botón de ocultar secciones: el control único sigue en la barra superior.
- Reducido el tamaño visual de las cotas SVG y desplazadas las etiquetas de corte fuera del centro.
- Eliminado el duplicado del nombre de la zona y las instrucciones repetidas del inspector.
- Compactada la barra flotante de zoom para que no ocupe todo el ancho del canvas.
- Compactada la barra de herramientas vertical y ajustada la cabecera del sidebar.

## Validación
`npm run build && npm run check` comprueba sincronización de bundle, funciones, geometría, auth y ausencia del botón eliminado.
Probar en Cloudflare Pages Preview antes de actualizar producción. La compilación no sustituye una verificación WebGL y D1 contra el servidor real.
