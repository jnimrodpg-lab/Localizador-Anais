# WMS Industrial V168 — interfaz modular y auditoría visual

Partiendo de V167, se conservan los flujos de inventario, racks, layout, editor de mobiliario, autenticación y persistencia Cloudflare. V168 modifica estilos y distribución de interfaz sin migraciones D1.

## CSS modular

La entrada `public/assets/app.css` importa ordenadamente los archivos de `public/assets/styles/`:

- `tokens.css`: paleta semántica para claro/oscuro y dimensiones compartidas.
- `legacy-core.css`: base histórica de estilos no temáticos.
- `layout-cad.css`: editor y reglas geométricas previas.
- `virtual-space.css`: ambiente virtual y mobiliario.
- `dashboard-base.css`: controles base del dashboard.
- `theme-shell.css`, `theme-dashboard.css`, `theme-products.css`, `theme-editors.css`: estilos aplicados a cada módulo con variables semánticas.
- `responsive.css`: organización del espacio sin desbordamientos al 100 %.

Los archivos `shell-v164.css` y `virtual-refinements.css` conservan las últimas mejoras anteriores sin duplicarlas.

## Pruebas

```bash
npm ci
npm run build
npm run check
```

`npm run test:visual-css` valida coherencia de temas y contraste estático. `npm run test:visual-browser` requiere instalar Python Playwright y Chromium y sirve para capturas/regresión local; no es obligatorio para el deploy.

**Resultados:** 18 de 18 combinaciones de resoluciones/temas/pantallas sin errores JS ni desbordamiento horizontal. Ver `AUDITORIA_VISUAL_V168.md` para límites y evidencia.

## Cloudflare Pages

- Compilación: `npm run build`
- Salida: `public`
- Mantener la vinculación original de D1 y las variables de entorno
- Respaldar información antes del despliegue
- Revisar que `/assets/styles/*.css` se sirva correctamente, además de `app-main.runtimefix.js`
