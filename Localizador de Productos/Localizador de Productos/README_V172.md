# WMS Industrial V172 — Recuperación avanzada y estabilización

## Objetivo
Esta versión NO es una aplicación mínima ni la V171. Se recuperó desde la V170 completa para conservar estética, rutas, API y todas las funciones avanzadas. Las correcciones son selectivas y comprobables.

## Funcionalidades conservadas
- Autenticación administrativa y viewer, sesiones y empresa con backend Cloudflare D1.
- Conexión e importación de productos desde Google Sheets, catálogo, búsqueda por SKU, variantes y escáner.
- Sucursales, almacenes, plano editable, muros, zonas, vanos y cotas.
- Distribución de racks y visor de ubicación 2D/3D.
- Biblioteca de muebles 3D: estantería, mostrador, vitrina, gavetero, cajonera y caja.
- Niveles, posiciones, cajas y asignación de SKU.
- Guardado local y en nube según la función existente (requiere D1 real para comprobar).
- Modo oscuro/claro y diseño cálido; no se sustituyó el sistema visual por una app básica.

## Correcciones implementadas
1. Colisión SAT de polígonos orientados: respeta la rotación del mobiliario y revisa alturas para permitir objetos físicamente separados.
2. El layout ahora dispone de tres filas reales (barra, contexto, lienzo): elimina el solapamiento de la barra contextual sobre el plano.
3. La sección flotante comienza cerrada para liberar espacio; puede volver a abrirse desde Sección.
4. Los metadatos del encabezado que no son controles se presentan como texto, no como botones.
5. Se eliminan etiquetas promocionales sin acción en el constructor 3D y la biblioteca de racks. Se conservan los controles operativos.
6. El antiguo encabezado redundante «3D arquitectónico del layout» se renombra como «Recorrido 3D del almacén»; su visor no se elimina para no romper funciones.
7. El paquete incluye una prueba de regresión que exige conservar los 14 módulos, muebles, estructura, autenticación y binding D1.

## Cloudflare Pages (con repositorio de GitHub)
- Repositorio: `jinimrodpg-lab/Localizador-Ana-s`
- Carpeta raíz del proyecto en el repo: `Localizador de Productos` (con espacios; cuidado con duplicarla).
- Root directory: `Localizador de Productos`
- Build command: `npm run build`
- Build output directory: `public`
- Framework: None
- Deploy: automático con Pages Git integration; no usar `wrangler deploy` (comando de Workers).
- D1: conservar binding `DB` y la base existente; revisar en Settings > Bindings.

### Comprobaciones locales
```sh
npm ci
npm run build
npm run check
```

`npm ci` instalará Three.js para empaquetar el motor 3D localmente; sin dependencias locales, el builder conserva respaldo CDN y muestra una advertencia.

## Seguridad de datos
**No se cambiaron `wrangler.toml`, migraciones ni estructura de D1.**
No ejecutar migraciones de inicialización sobre la base de producción ni borrar tablas. Hacer copia antes del primer despliegue.

## Validación / límites
- `npm run check`: pruebas de API estáticas, bundle, autenticación, colisiones geométricas y regresión completas.
- Chromium (1366x768, 100%): dashboard, layout y biblioteca abrieron sin errores JavaScript ni scroll horizontal. El script de prueba usa login local simulado para renderizado y no consulta SQL real.
- Pendiente de probar en Cloudflare: conexión con D1 real, renderizado WebGL/Three.js y cambios persistentes multiusuario. Por esta razón se recomienda un despliegue Pages de prueba antes de reemplazar producción.
