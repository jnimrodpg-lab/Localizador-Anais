# V187 · Registro de cambios

**Base:** V186 · calles, vértices de zonas y áreas, muebles agrupados, acabados y muros compartidos.

## CAD (Editar layout)

- `src/frontend/60-layout-editor.js`: perímetro general editable, handles arrastrables, snap, validación de zonas contenidas y botón de ajuste automático. Al editar se desactiva el ajuste automático para respetar el polígono del usuario.
- Inserción de vértice de zona sobre la arista seleccionada o, si no existe, sobre la de mayor longitud.
- División de zona con clipping por X/Y. Control geométrico y de racks antes del commit.
- Controles numéricos X/Y/rotación del único conjunto de mobiliario urbano.
- CSS del inspector compacto y mejora para viewport de una columna a ancho reducido.

## Vista de construcción 3D

- `src/frontend/75-virtual-space.js`: nueva pestaña de Urbanismo.
- Inspector de calzada, veredas y mobiliario agrupado, preservando los mismos arrays `layout.streets` y `streetFurniture` del CAD.
- Raycast de mobiliario urbano y transformación por arrastre sobre plano con snap y límite a la vereda.
- Movimiento de paredes por X/Y numérico con nodos compartidos y motor de colisiones.
- Reconstrucción del diorama desde los datos originales, sin crear copias divergentes de calles o muros.

## Conservado

- Wrangler, Cloudflare D1, Google Sheets, importación de productos, bibliotecas de racks, operaciones SKU, layouts por sucursal, 3D y navegación.

## Pruebas

- `npm run test:v187`
- `npm run test:architecture`
- `npm run test:regression-v181`
- `npm run test:virtual`
- `npm run test:auth`
- `npm run test:ui-v176`
- `npm run audit:frontend`
- Chromium 1440: vista layout, creación de calle y conjunto, apertura inspector Urbanismo y cambio de acabados sin excepciones.

## Sin validar aquí

- Render completo WebGL y calidad de las texturas con Three.js real, no descargable en este entorno.
- Conexión con base Cloudflare D1 remota y actualizaciones de cuentas existentes.
