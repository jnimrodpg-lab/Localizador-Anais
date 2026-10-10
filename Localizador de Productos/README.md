# WMS Industrial V171 — Auditoría visual y responsive

**Base:** V170 original del usuario, con la arquitectura de administración, importación de productos, Google Sheets, layout CAD, rack builder, espacio virtual y visualizador de productos conservada. Esta es una corrección incremental, no una reconstrucción simplificada.

## Cambios aplicados

- Workspace con densidad de interfaz equivalente a 80% de zoom sobre escritorio (CSS `zoom: .8`, ajustando dimensiones para cubrir toda la ventana). Los diálogos fuera del workspace conservan el tamaño del viewport.
- Sidebar renovado: iconografía vectorial consistente, menú accesible con teclado, colapso que conserva iconos, selector de tema más discreto y sin indicador online ficticio.
- Paleta cálida clara/oscura regida por `tokens.css`. Se quitó el bloque de **Branding** que sobrescribía variables cromáticas sin sincronizarse con los estados de los botones; se mantienen nombre y logo de empresa, y los datos antiguos de branding se leen sin afectar la apariencia.
- Dashboard administrativo ocupa el área central completa. Se retiró el panel lateral duplicado de resumen, manteniendo métricas en la portada.
- Expandir sucursales ya no recorta la ficha: los subpaneles crecen en el scroll principal en vez de desbordar el cuadro padre.
- Chips informativos no se muestran como botones: variantes de la previsualización sin acciones son `span` y el CSS de etiquetas está neutralizado. Los chips que sí tienen interacción (filtros reales, variantes de producto operativas) se mantienen.
- Breakpoints para móvil/tablet: navegación horizontal, tarjetas fluidas, formulario apilado, vista de layout con canvas antes del inspector y barras de herramientas que se redistribuyen.
- Textos de ayuda redundantes compactados. No se elimina ninguna operación de D1, Wrangler ni los editores avanzados.

## Despliegue Cloudflare Pages

1. Subir el contenido del proyecto a GitHub manteniendo `wrangler.toml`, `functions/api/[[path]].js`, `migrations/` y `src/`.
2. Configurar Pages: **Build command** `npm run build`, **Build output directory** `public`. Instalará dependencias con npm según `package-lock.json`.
3. La base D1 ya tiene su binding `DB` y su identificador en `wrangler.toml`; al reutilizar la base existente **no debes crear otra**. Comprobar en los ajustes del proyecto de Cloudflare Pages que el binding D1 se llama `DB` tanto en producción como en vista previa si corresponde.
4. Si es la primera instalación de la base: `npx wrangler d1 migrations apply DB --remote`. **No vuelvas a ejecutar migraciones destructivas ni borres una base con datos activos.** Verificar antes sobre una base de prueba.

## Pruebas

```bash
npm ci
npm run build
npm run check
```

Incluye pruebas de sincronía del frontend, compatibilidad de auth, geometría 3D, CSS y verificaciones de la nueva UI. Los smoke-tests locales con Chromium no sustituyen pruebas de interacción en producción con datos y permisos reales. Los scripts `tests/visual-smoke.py` y `tests/visual-audit-v171.py` son opcionales: requieren Python + Playwright + Chromium; algunas vistas 3D pueden necesitar cargar Three.js por CDN.

## Limitaciones de verificación

Las pruebas de Node terminaron correctamente, y se revisaron visualmente el tablero en escritorio y móvil y el editor de layout en móvil. No se validaron conexiones reales a Google Sheets / Cloudflare D1 ni todos los flujos WebGL con datos de producción. Antes de sustituir el despliegue activo, conviene publicarlo en Preview y comprobar permisos y escenas 3D allí.
