# WMS Industrial V192

**Crear mobiliario 3D → Colocar y editar en layout:** abre el editor de distribución y selecciona el nuevo mueble. Se mueve por arrastre y snap desde el plano. **Biblioteca de racks:** los muebles creados muestran miniatura paramétrica con sus piezas y colores. El despiece es opcional.

Consulta `CAMBIOS_V192.md` para el resumen y pruebas.

# WMS Industrial V191 — Constructor 3D rediseñado

Proyecto Cloudflare Pages + D1 con los módulos WMS, inventario, edición de layout, espacio 3D y constructor paramétrico de mobiliario.

## Despliegue
1. Extraer el ZIP y abrir **WMS_Industrial_V191** como raíz del repositorio.
2. Mantener `wrangler.toml` y el binding `DB` configurado para la base D1 actual.
3. En Cloudflare Pages elegir Framework preset **None**.
4. Build command: **`npm ci && npm run build`**; output directory: **`public`**.
5. Publicar primero en **Preview**, comprobar la biblioteca, crear un modelo, colocarlo y abrir **Diseñar espacio 3D**. Verificar el guardado en D1 antes de publicarlo en producción.

## Crear mobiliario 3D
- Elegir una plantilla de melamina, armario o metal+madera.
- **01 Medidas**: ancho, altura, profundidad, espesor y acabado.
- **02 Zócalo y fondo**: base elevada, fondo completo o modular; los paneles se actualizan automáticamente.
- **03 Divisiones**: distribución equitativa o personalizada en altura y ancho.
- **04 Acabados**: material y acabado del modelo.
- **05 Despiece**: comprobar geometría y exportar CSV.
- El visor abre en **Frontal** para editar; pulsar **Vista 3D** para revisar el volumen real.
- **Colocar en el almacén** crea una instancia del modelo seleccionable en **Diseñar espacio 3D**.
- Undo/Redo: botones superiores o `Ctrl+Z`, `Ctrl+Y` (fuera de inputs).

Para el detalle de las modificaciones, consultar `CAMBIOS_V191.md`.

## Verificación
Ejecutar `npm run check`. Para pruebas visuales 3D, disponer de WebGL/Three.js en un despliegue Preview.
