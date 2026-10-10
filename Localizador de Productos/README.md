# WMS Industrial V176 · Reconstrucción CAD y Google Sheets

Proyecto completo para **Cloudflare Pages + Pages Functions + D1 (binding `DB`)**. Parte del WMS V175 y conserva módulos de inventario, autenticación, importación de Google Sheets, recorrido 3D, diseñador 3D y biblioteca/constructor paramétrico de racks.

## Instalar y desplegar

1. **Descomprime este ZIP**. Usa el contenido de la carpeta `WMS_Industrial_V176` como raíz de tu repositorio GitHub, no una carpeta superior adicional.
2. En Cloudflare Pages selecciona **Framework preset: None**, **Build command: `npm run build`** y **Build output directory: `public`**.
3. Mantén el binding `DB` y los datos correctos de D1 en `wrangler.toml`. Las carpetas `functions/` y `migrations/` se conservan.
4. Despliega **primero como Preview** y verifica login, carga real de Google Sheets, guardados y vistas WebGL antes de reemplazar la versión de producción.
5. La esquina inferior del sidebar identifica la versión: **WMS V176**. Si ves otro número, revisa la rama o el proyecto Pages que estás abriendo. Refresca con **Ctrl + Shift + R**.

## Desarrollo

```bash
npm ci
npm run build
npm run check
```

Prueba visual opcional (requiere Python, Playwright y Chromium):

```bash
python tests/visual-v176.py
```

## Mantenimiento

- `src/frontend/*.js`: fragmentos del frontend. **No edites el bundle generado manualmente**.
- `src/styles/base.css`: estilos de compatibilidad de los módulos históricos, conservados para no perder funciones.
- `src/styles/modern.css`: nueva distribución de CAD, Sheets, visor y navegación (prioridad de layout y temas).
- `public/assets/app-main.runtimefix.js` y `public/assets/app.css`: **archivos publicados generados** por `npm run build`.
- `functions/api/[[path]].js`, `migrations/`, `wrangler.toml`: API y almacenamiento Cloudflare, sin cambios destructivos.

La estructura antigua de hojas `public/assets/styles/` y los reportes de pruebas históricas se han eliminado del paquete. Se consolidaron los estilos para tener una ruta de build verificable en lugar de cargar múltiples CSS versionados.

Consulta `CAMBIOS_V176.md` para el detalle y los límites de validación.
