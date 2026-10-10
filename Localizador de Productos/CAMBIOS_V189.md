# WMS Industrial V189 — Crear mobiliario 3D desde el sidebar

## Implementado
- Entrada **Crear mobiliario 3D** visible para usuarios administradores en el sidebar. Abre directamente el constructor ya integrado y marca correctamente el elemento activo.
- Conserva las tres plantillas de V188: estante de melamina, armario de melamina y estructura de metal + madera. Se pueden crear nuevos modelos, seleccionar existentes, duplicar y abrir la Biblioteca de racks.
- Herramientas sobre las piezas en 3D / frontal: repisas, divisores, fondos, puertas, cajones, refuerzos y duplicación; edición por medidas individuales desde el inspector de piezas.
- Panel paramétrico para dividir horizontal y verticalmente en 1–12 espacios. Admite distribución equitativa y personalizada (pesos normalizados al espacio útil, después de descontar espesores). Se pueden aplicar divisiones verticales a todos los niveles o a un nivel seleccionado.
- Editor de volumen (ancho, profundidad, altura), espesor, materiales, acabados y pendiente; opciones de snap en centímetros, mostrar cotas y mostrar slots WMS.
- Despiece tabulado por pieza con dimensiones (cm) y descarga de CSV; selección de la pieza desde la tabla; comprobaciones de coordenadas, volumen y dimensiones positivas antes de colocar un mueble.
- Controles de guardado con información diferenciada para sincronización D1 confirmada y guardado local cuando falla la red.
- Botones «Colocar en el almacén» y «Ver espacio 3D». La instancia reutiliza su modelo `modelId`; la geometría real de sus piezas se visualiza en «Diseñar espacio 3D», como en V188.
- CSS adaptado a la paleta de la app en modo claro y oscuro, con paneles desplazables y reglas responsive.
- Conservados Wrangler, migraciones D1, API, gestión de productos, zonas y racks existentes.

## Pruebas ejecutadas
- `npm run check`: compilación, sincronización bundle/CSS, auditoría, pruebas de autenticación, arquitectura, racks, regresión V181 y pruebas del mobiliario V188 y V189.
- Navegador Chromium: apertura del constructor desde el sidebar, creación de estante, divisiones personalizadas y verticales, validación sin errores JS y descarga CSV.

## Límites actuales
- Esta versión no es un CAD industrial completo: no implementa bisagras físicas avanzadas, despiece de herrajes ni análisis estructural certificado.
- El paquete usa el cargador de Three.js existente; este entorno no pudo descargar e incluir el fichero local. La visualización WebGL requiere conexión al CDN o ejecutar `npm install` antes de `npm run build`.
- Cloudflare D1 remoto y el render WebGL integral deben verificarse en un despliegue Preview con las credenciales y la red del usuario.
