# Frontend modular source — v107

El runtime histórico del WMS compartía un único scope léxico dentro de una IIFE. Para no cambiar comportamiento mientras se sanea la arquitectura, v107 divide ese source en fragmentos de subsistema y genera el bundle publicado mediante `npm run build:frontend`.

## Regla principal

**No editar `public/assets/app-main.runtimefix.js` a mano.** Edita el fragmento correspondiente en `src/frontend/` y ejecuta:

```bash
npm run build:frontend
npm run check
```

## Fragmentos

- `00-core-state.js` — DOM base, estado, modales, paginación e historial.
- `10-products-geometry.js` — productos, búsqueda, selección y geometría común.
- `20-sheet-layout-state.js` — carga de Sheet y estado persistente del layout.
- `30-admin-sync.js` — administración, sincronización remota, sucursales y mapeo de Sheet.
- `40-sheet-dashboard-quality.js` — asistente Sheet, dashboard y diagnóstico de datos.
- `50-viewer-3d.js` — viewer, modal de ubicación, isométrico y 3D navegable.
- `60-layout-editor.js` — editor 2D, muros, vanos, secciones y snapping.
- `70-rack-editor.js` — editor/modelos de rack.
- `80-auth-operations.js` — autenticación, scanner y herramientas operativas.
- `90-bootstrap-compat.js` — arranque y compatibilidad con mejoras heredadas.

Los fragmentos **no son scripts independientes**. Se concatenan deliberadamente para conservar el mismo scope y permitir una migración gradual hacia módulos ES reales en etapas posteriores.
