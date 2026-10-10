# Frontend modular · WMS V176

El runtime conserva una IIFE compartida: sus fragmentos se concatenan en el orden declarado por `manifest.json` para mantener el alcance original de las funciones. No son módulos ES independientes.

**Editar `src/frontend/*.js`, no `public/assets/app-main.runtimefix.js`.** Después ejecutar `npm run build` y `npm run check`.

## Componentes

- `00-core-state.js`: estado y DOM compartidos.
- `10-products-geometry.js`: inventario, navegación entre pantallas y geometría.
- `20-sheet-layout-state.js`: estado y dimensiones de CAD; Google Sheets.
- `30-admin-sync.js`: administración, sucursales y persistencia.
- `40-sheet-viewer-tools.js`: interfaz de configuración Sheets.
- `50-viewer-3d.js`: visor 3D y navegación.
- `60-layout-editor.js`: editor CAD, secciones y herramientas.
- `65-layout-pro-v117.js`, `66-topology-v128.js`: geometría y topología.
- `70-rack-editor.js`, `74-isometric-furniture.js`: racks y piezas.
- `75-virtual-space.js`: diseño de espacio tridimensional.
- `80-auth-operations.js`: permisos, autenticación y operaciones.
- `90-bootstrap-compat.js`: arranque y compatibilidad.

El diseño CSS está en `src/styles/base.css` y `src/styles/modern.css`, compilado a `public/assets/app.css`.
