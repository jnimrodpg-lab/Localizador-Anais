# WMS Industrial V175 — CAD premium suave y estabilización visual

Versión basada en V174. **Conserva** los módulos de inventario, Google Sheets, construcción del espacio 3D, navegación, roles, Cloudflare Pages Functions, el binding Wrangler `DB` y los esquemas D1. No altera ni elimina datos de la base.

## Despliegue

1. Extrae el ZIP y coloca el contenido de `WMS_Industrial_V175/` en la raíz de tu repositorio, o configura esa carpeta como raíz del build.
2. Cloudflare Pages: **Framework preset `None`** · **Build command `npm run build`** · **Build output directory `public`**.
3. Cloudflare instala dependencias. El build incorpora Three.js desde `node_modules` al despliegue cuando está disponible.
4. Conserva el `database_id` de la base D1 y el binding **`DB`** de `wrangler.toml`; no ejecutes migraciones sobre datos reales sin respaldo previo.
5. Prueba primero con Cloudflare Pages Preview y usa **Ctrl+Shift+R** para impedir que un CSS/JS antiguo quede cacheado. Los recursos están marcados `wms-v175-premium-soft-20261010`.

## Pruebas locales

```bash
npm ci
npm run build
npm run check
python tests/visual-v175-css.py
```

La última prueba requiere Chromium y Playwright instalados. Comprueba geometría CSS y modos de color sin simular conexiones remotas.

Consulta `CAMBIOS_V175.md` para los cambios y los límites de la validación.
