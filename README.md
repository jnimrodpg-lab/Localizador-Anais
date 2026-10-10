# WMS Industrial V173 — Interfaz CAD/3D/Sheets corregida

Versión incremental basada en la V172, conserva layout arquitectónico, racks, visor 3D, importación Google Sheets, usuarios/roles, Cloudflare D1 y funciones existentes.

**Contenido principal:** `public/` interfaz y recursos; `src/frontend/` fuentes del frontend; `functions/api/` funciones Pages; `wrangler.toml`; `migrations/`; `scripts/` build y auditorías; `tests/` pruebas.

## Cómo desplegar

1. Extrae el ZIP y sube **el contenido de `WMS_Industrial_V173/`** a la raíz de tu repositorio de GitHub (o configura esa carpeta como directorio raíz del build).
2. En Cloudflare Pages: framework `None`, **Build command**: `npm run build`, **Build output directory**: `public`.
3. Cloudflare instalará las dependencias con npm; el build copia Three.js a `public/vendor/three.module.js`.
4. Conserva el binding D1 denominado **`DB`** y el `database_id` actual de `wrangler.toml`. No crees ni migres una base nueva por cambiar la UI.
5. Publica primero una **rama Preview**, recarga con Ctrl+Shift+R y verifica escenas reales, inventario e importación antes de sustituir producción.

## Pruebas en local

```bash
npm ci
npm run build
npm run check
```

Consulta `AUDITORIA_VISUAL_V173.md` para los cambios y límites de la verificación. Las pruebas WebGL reales requieren Three.js disponible y navegador compatible con WebGL.
