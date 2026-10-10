# WMS Industrial V193 — Paquete limpio para Cloudflare Pages

Contiene únicamente el código de la aplicación, los recursos web, los scripts de compilación y la configuración de Cloudflare/D1. Se han excluido pruebas de desarrollo y registros históricos de cambios.

## Despliegue
1. Usa el contenido de esta carpeta como raíz de tu repositorio.
2. Mantén `wrangler.toml` y configura correctamente el binding D1 `DB` en Cloudflare.
3. Cloudflare Pages: Framework preset `None`; build command `npm ci && npm run build`; output directory `public`.
4. Verifica primero en Preview el login, los modelos guardados, la colocación en layout y la vista 3D.

## Comprobación local
- `npm ci`
- `npm run check`

`public/` contiene la aplicación compilada, y `src/` el código fuente editable. `functions/` y `migrations/` son componentes requeridos por la integración Cloudflare/D1.
