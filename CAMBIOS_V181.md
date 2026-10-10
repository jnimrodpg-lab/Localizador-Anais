# WMS Industrial V181 — CAD estable, pisos y calles

## 1. Corrección del error

- `overlayLayer is not defined`: la capa SVG se declara antes del render y se incorpora al SVG antes de utilizarse.
- Se evita que `renderLayoutSvg` duplique los manejadores `pointerdown`, `pointermove`, `pointerup` y `pointerleave` después de sucesivas modificaciones de muros.
- Regresión probada en Chromium: tres cambios consecutivos de espesor de muro (22 cm, 26 cm, 18 cm), navegación a CAD sin excepción.

## 2. Acabados de piso por zona

- Base cálida, porcelanato blanco/marfil/gris 60×60, porcelanato mármol claro, concreto pulido y madera clara.
- Selector en Editar layout → zona y en Diseñar espacio 3D → Arquitectura → Acabados de piso.
- SVG: patrones con juntas; 3D: CanvasTexture procedimental local, sin dependencia de imágenes externas.
- `zone.floorFinish` queda dentro del modelo de layout por sucursal.

## 3. Calles

- Al seleccionar una calle en el layout: editor de ancho de calzada, ancho de veredas y tipo de esquina.
- Botón «Editar vértices» + selector de capa: calzada, vereda interior o vereda exterior.
- Arrastre con snap, límite de desplazamiento, validación de convexidad y superficie mínima.
- `street.vertexOffsets` preserva modificaciones tras modificar dimensiones o recalcular las intersecciones.
- Botón «Restablecer vértices» para regresar a la forma paramétrica.
- Las mismas coordenadas de calle se usan en el diorama.

## Validaciones

- `npm run check` y `npm run test:regression-v181`.
- Chromium: edición repetida de muro, selección de porcelanato en 3D y comprobación en CAD, creación de calle, edición de vértices y cambio de ancho.
- No se ensayó Cloudflare D1 real ni WebGL completo con Three.js descargado desde npm; verificar en Pages Preview.

## Despliegue

Cloudflare Pages: Framework preset None, Build command `npm run build`, Output directory `public`. Mantén el binding `DB` de D1.
