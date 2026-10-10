# WMS Industrial V180 · Arquitectura compartida 2D / 3D

Aplicación WMS para **Cloudflare Pages + Pages Functions + D1**. Esta versión extiende la V179 sin sustituir los módulos de inventario, Google Sheets, mobiliario, racks y calles.

## Desplegar

1. Utiliza la carpeta `WMS_Industrial_V180` como raíz de tu repositorio GitHub.
2. En Cloudflare Pages selecciona **Framework preset: None**, comando `npm run build` y directorio de salida `public`.
3. **No cambies las credenciales ni los identificadores de D1** ya configurados en tu proyecto; revisa `wrangler.toml` y conserva el binding `DB`.
4. Cloudflare debe ejecutar `npm ci` antes de compilar: instala **Three.js 0.160.0** y lo copia a `public/vendor/three.module.js` durante el build.
5. Publica primero en **Preview**, prueba editar muros y vanos, guardar, cambiar a CAD y volver al espacio 3D. Luego actualiza producción.
6. La esquina inferior muestra **WMS V180 · Arquitectura 2D/3D**. Usa Ctrl + Shift + R si la interfaz sigue mostrando otra versión.

## Novedades

- Inspector arquitectónico dentro de **Diseñar espacio 3D**, con pestañas Mobiliario / Arquitectura.
- Muros reales del CAD con longitud, espesor, altura y acabado editables.
- Colocación de puertas, aberturas libres y un modelo de ventanal con vidrio dividido en dos paños.
- Los huecos se construyen mediante segmentos 3D de pared, no mediante pegatinas sobre una pared completa.
- Controles para impedir aberturas demasiado grandes, fuera del muro o superpuestas; crear muros con dos clics sobre el piso.
- Carga inicial de muros editables a partir del perímetro de zonas cuando la sucursal aún no tiene muros; migración marcada una sola vez para no regenerar muros borrados.
- Los mismos datos `layout.walls` y `layout.openings` alimentan el CAD y el diorama; se mantiene el guardado por sucursal.
- Deshacer / rehacer mediante historial de estructura existente.

## Desarrollo

```bash
npm ci
npm run check
```

Pruebas destacadas: `npm run test:architecture`, `npm run test:virtual`, `npm run test:auth` y `npm run test:ui-v176` (prueba de regresión de CAD y Sheets, renombrada próximamente).

## Observaciones y límites

- El render completo WebGL con Three.js y los guardados reales en **D1 remoto** deben verificarse en Cloudflare Pages Preview; las pruebas locales no confirman el comportamiento de un despliegue remoto.
- El perímetro se convierte en muros CAD editables solo si no existe ya un sistema de paredes en esa sucursal. No se altera deliberadamente un plano existente.
- Las modificaciones de extremos vinculados afectan los muros compartidos mediante sus nodos, pero mover un muro no redefine automáticamente todas las zonas interiores.
- Los muros exteriores cercanos a la cámara continúan usando corte arquitectónico en la vista isométrica para mantener visibles los racks. Puedes seleccionar cualquier muro desde la lista del inspector.
- No se incluyen `node_modules`, capturas temporales ni archivos de auditoría de navegador.

## Estructura

- `src/frontend/`: módulos funcionales y renderizadores.
- `src/styles/`: CSS consolidado.
- `public/assets/`: frontend compilado.
- `functions/`, `migrations/`, `wrangler.toml`: API y base de datos Cloudflare.
- `tests/architecture-v180.test.mjs`: validación geométrica de paredes y aberturas.

Las mejoras específicas se documentan en `CAMBIOS_V180.md`.
