# WMS Industrial V194 — Paquete limpio para Cloudflare Pages

## Mejoras V194
- Racks seleccionables y arrastrables con snap tanto en **Editar layout (estructura)** como en **Distribución**.
- Giro por ángulo y botones +45°/+90°; comprueba límites y colisiones antes de aceptar.
- Entrada **NPT (cm)** por rack en Layout y en **Diseñar espacio 3D**; se guarda en `baseHeight` y eleva realmente las mallas.
- Validación de colisiones según volumen vertical real, no solo la cota inferior.
- **Preview principal de Biblioteca** utiliza el mismo motor WebGL por piezas del Constructor y admite orbitar/zoom. Cuando Three.js no está disponible, el SVG tiene las caras ordenadas en profundidad y un encuadre sin recortes.
- Límites aumentados para modelos paramétricos grandes. Conserva el motor de muebles y la integración de D1.

## Despliegue Cloudflare Pages
- Framework preset: `None`
- Comando de compilación: `npm ci && npm run build`
- Directorio de salida: `public`
- Mantener `wrangler.toml` y el binding D1 `DB` configurado en Cloudflare.

**Importante:** Three.js se incorpora automáticamente a `public/vendor/` al ejecutar `npm ci && npm run build`. Si no se instala, la Biblioteca utiliza su representación SVG de respaldo y la vista 3D depende del CDN. Comprueba el WebGL y la persistencia remota de D1 en una versión Preview desplegada.

### Comprobaciones
`npm run check` verifica compilación, bundle y sintaxis. Se comprobó localmente con Chromium el arrastre y giro en layout, los controles NPT de layout/3D y el respaldo SVG sin errores JS; la escena WebGL completa no se pudo comprobar en este entorno sin la dependencia local.
