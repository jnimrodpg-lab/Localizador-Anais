# WMS Industrial V201 — Auditoría y corrección integral

Partimos del código V200. Se conserva **Wrangler, el binding Cloudflare D1 (DB), las migraciones, la estructura de datos y los módulos existentes**.

## Errores corregidos

- `architectureMode is not defined`: declarados `rackMode`, `urbanismMode` y `architectureMode` **antes** de utilizarlos en `renderLayoutEditor`. Se corrigió, además, una clasificación equivocada que trataba Arquitectura como Distribución.
- Carga local de Three.js: si Cloudflare devuelve HTML por una ruta inexistente, se valida el MIME antes de ejecutar `import()`, con respaldo CDN y error comprensible si ninguna fuente está disponible.
- Compilaciones incompletas en Cloudflare: si la librería `three` falta durante el build en Pages, **se cancela el deploy** en lugar de publicarlo con el visor roto.
- Layout responsive en ventanas de hasta 1150 px: inspector debajo del plano, secciones y controles sin ocupar una segunda columna forzada.
- Actualización de versión, bundle JavaScript y CSS de V201. El editor de racks, nomenclatura, NPT y conjuntos apilados se conservaron.

## Validaciones realizadas

- `npm run check` (incluye auditoría de compatibilidad V201, sintaxis de functions y correspondencia del bundle).
- Chromium automatizado: navegación entre Arquitectura, Urbanismo y Distribución, selector de N1/N2/Todos, cotas, snap, edición de vértices, nomenclatura de zona, esquinas, secciones, inspector, Biblioteca, Constructor, Sheets e Inicio.
- Pruebas heredadas de geometría, mobiliario, autenticación, volúmenes y persistencia del modelo en memoria. Los tests antiguos que comprueban el nombre literal de la versión V187/V193 no son aplicables al despliegue V201.

## Cloudflare Pages

- Framework preset: `None`
- Build command: `npm ci && npm run build`
- Output directory: `public`
- Mantén los bindings configurados en `wrangler.toml`; **no migres ni recrees D1** para actualizar el frontend.

## Límites de la auditoría

El entorno local no pudo instalar Three.js desde npm por falta de conectividad, de modo que no se verificó el render WebGL real ni una sesión autenticada con D1 remoto. Cloudflare Pages debe instalar la dependencia durante `npm ci`. Recomendamos desplegar primero en **Preview** y verificar guardado, WebGL y la información almacenada con datos reales. No es correcto afirmar ausencia absoluta de fallos en rutas no cubiertas.
