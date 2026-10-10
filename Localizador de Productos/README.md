# WMS Industrial V187 — CAD + construcción 3D

Aplicación para Cloudflare Pages, Cloudflare D1 y Google Sheets. Basada en la V186. Mantiene el editor de racks, el inventario, las ubicaciones y Wrangler.

## Desplegar en Cloudflare Pages

1. Extrae el ZIP y usa `WMS_Industrial_V187` como carpeta raíz del repositorio.
2. Conserva la configuración de `wrangler.toml` y el binding `DB` para D1.
3. Configura Framework preset **None**, comando de construcción `npm run build` y directorio de salida `public`.
4. Cloudflare instalará las dependencias desde `package-lock.json` mediante `npm ci`; el build copia Three.js a `public/vendor/three.module.js` si está disponible localmente. Existe un respaldo por CDN.
5. Comprueba primero el despliegue **Preview** y solo después actualiza producción. Verifica que el sidebar diga **WMS V187 · CAD y 3D**.

## Funciones incorporadas

### Editar layout
- Inspector para editar el perímetro general, incorporar vértices y restablecer el ajuste automático a las zonas.
- Arrastrar puntos de la superficie general con snap y validación de zonas contenidas; cambios persistidos con las calles actualizadas.
- Agregar un vértice de zona en un clic, eligiendo la arista más larga cuando aún no hay arista activa.
- Dividir zonas independientes por línea central horizontal o vertical. La operación no procede si corta un rack o produce una geometría inválida.
- Posicionar y girar numéricamente el mobiliario urbano agrupado, conservando la selección y representación 3D.
- Conserva la edición de muros, vanos, racks, calles y panel de capas existente.

### Diseñar espacio 3D
- Pestaña **Urbanismo** junto a Mobiliario y Arquitectura.
- Editar tipos de calzada y vereda, anchos, tipo de esquina, y añadir o quitar el conjunto urbano.
- Selección del conjunto urbano en la escena 3D mediante raycasting y desplazamiento con snap cuando Mover está activo.
- Edición numérica de posición/giro del conjunto urbano con comprobación de ubicación en vereda.
- Desplazar los dos extremos de un muro mediante deltas X/Y numéricos con el motor geométrico compartido.
- Conserva la edición arquitectónica existente de muros, aberturas libres, puertas, ventanal y pisos por zona.

## Auditoría y pruebas

```bash
npm ci
npm run check
npm run test:v187
```

Las pruebas de integración V187 y regresión previas pasan. Se probó en Chromium el flujo **agregar vértice de área → crear calle → agregar mobiliario agrupado → modificar materiales en Urbanismo**, sin errores JS.

## Límites pendientes

- No se han implementado aún agrupaciones arbitrarias entre todos los tipos de objetos, uniones/recortes booleanos complejos de polígonos ni distribución automática avanzada con optimización de pasillos.
- El movimiento de un muro vinculado actualiza sus nodos y elementos dependientes; no reconstruye automáticamente todas las subdivisiones de zona existentes.
- Las texturas urbanas son procedurales: no equivalen exactamente a una fotografía/PBR escaneada ni cuentan con mapas de relieve profesionales.
- La prueba WebGL 3D completa con Three.js no se pudo realizar localmente porque este entorno no tiene instalada esa biblioteca ni acceso al registro npm. Cloudflare debe instalarla durante el build.
- No se validó una escritura efectiva sobre la base de datos D1 remota. Comprueba guardados, cambio de sucursal y recarga en Preview.

Documentación de cambios técnicos: `CAMBIOS_V187.md`.
