# WMS Industrial V170 — corrección visual conservadora

Esta es la V170 avanzada original (no la V171 ni la V172 simplificadas).

## Cambios
- Nueva capa `public/assets/styles/v170-stability.css` que utiliza los tokens existentes de tema claro/oscuro.
- Corrección de la biblioteca de modelos, sus paneles, inputs, tarjetas, botones y texto sin contraste.
- Eliminación de fondos nocturnos inline en las secciones del editor de modelos.
- Contraste y superficies ajustadas para Categorías, Sheets, fichas de producto, editor 2D y ambiente 3D.
- Ventana de secciones 2D acotada para no ocultar grandes áreas del plano al abrirla.
- Filtro de categorías vacío más compacto.
- Eliminación de etiquetas superiores sin acción en Biblioteca, sin quitar Deshacer/Rehacer.
- No se modificaron endpoints, migraciones, credenciales ni wrangler.toml.

## Pruebas verificadas
- `npm run build` OK.
- `npm run check` OK: autenticación, geometría, catálogo, frontend y CSS.
- Capturas manuales a 1440 x 900 en modo claro y oscuro de inicio, Sheets, Biblioteca, Layout, Inventario y Ambiente 3D: sin errores JavaScript ni overflow horizontal.
- No se pudo completar una prueba automatizada exhaustiva de todas las resoluciones ni probar WebGL con un backend D1 real.

## Instalación en Cloudflare Pages
1. Sustituye los archivos del directorio `Localizador de Productos` de tu repositorio, conservando datos D1.
2. Directorio raíz de compilación: `Localizador de Productos`.
3. Comando: `npm run build` y salida: `public`.
4. Instala dependencias (`npm ci`) durante el build: Three.js se copiará a `public/vendor/three.module.js`.
5. Verifica binding D1 llamado `DB` apuntando a la base existente.

**Respalda la base de producción antes de publicar.**
