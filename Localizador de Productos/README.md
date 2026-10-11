# WMS Industrial V210 — Uniones CAD de muros (2D / 3D)

Esta versión conserva Arquitectura, Urbanismo, Distribución, Mobiliario 3D y configuración D1/Cloudflare Pages de la V209.

## Corrección de encuentros

- Los tramos conectados por un nodo ahora **comparten la intersección exacta de sus caras**, no solo la intersección de los ejes.
- Uniones en L vertical–diagonal y de 90°: mitras para muros **hacia dentro / centrados / hacia fuera**, incluso si los segmentos fueron creados en sentidos inversos.
- En caso de vanos, las caras del extremo del muro se empalman mientras el corte interno de la abertura queda recto.
- Ya no se usa el polígono de parche de unión para los nodos de solo dos muros, evitando dobles superposiciones.
- Los nodos con tres o más muros conservan un cierre local de fallback; los casos estructurales complejos requieren comprobación visual específica.
- Los dos motores 3D reutilizan la huella de muro CAD que usa el layout; no crean simplemente cajas independientes con cortes rectos.

## Comprobaciones

`npm run check` compila, verifica el bundle y ejecuta pruebas de regresión V202–V210, incluidas las nuevas pruebas geométricas de muros.

Las pruebas automatizadas comprueban encuentros de 45° y 90°, las tres posiciones de espesor, inversión de extremos, huecos de puerta y fallback en T. No sustituyen la validación visual de todos los casos WebGL ni el guardado remoto con Cloudflare D1.

## Cloudflare Pages

- Framework: `None`
- Build: `npm ci && npm run build`
- Output: `public`
- Vinculación D1: conservar `DB` en `wrangler.toml` y Pages.

**No necesita migraciones SQL ni crear otra base.**
## Arquitectura: nuevo modelo

- **Área interior útil del local:** `layout.meta.siteBoundary.pts` es el perímetro principal editable. No se recalcula automáticamente al mover, crear o eliminar zonas.
- **Zonas:** subdivisiones **virtuales**, contenidas en el área útil. Pueden tocarse y compartir vértices/aristas, pero las operaciones nuevas rechazan superposición de superficie, geometrías autointersectadas y salidas del área, incluso a través de entrantes cóncavos.
- **Muros:** elementos físicos independientes, vinculados al área mediante `ownerAreaId = 'AREA-GENERAL'`, sin creación automática por dividir zonas. Al mover el local completo se trasladan los muros, nodos, racks, cotas y zonas juntos; al editar un vértice del perímetro se actualizan los extremos de muros coincidentes con ese vértice.
- **Inspector:** superficie interior total, zonificada y libre en m²; muestra advertencias cuando algún plano anterior contiene zonas incompatibles con las nuevas reglas.
- **Conversión zona → área:** disponible al seleccionar una zona. Se bloquea, sin borrar información, si alguna otra zona quedaría fuera del nuevo perímetro.
- **Recintos físicos heredados:** se conservan, pero ya no transforman dinámicamente las geometrías de las zonas virtuales.

## Compatibilidad con diseños anteriores

La primera carga de cada layout actualiza la semántica sin eliminar ni recolocar racks, zonas o muros. Los antiguos muros de zona se conservan como muros CAD físicos. Un layout que ya tenía zonas solapadas o fuera del perímetro puede seguir abriéndose: el inspector informa de las anomalías para corregirlas manualmente; las nuevas operaciones quedan sujetas a la validación.

**Importante:** convertir una zona en área cambia la extensión del local; los muros físicos no se eliminan ni reconstruyen automáticamente. Revisa el diseño resultante antes de guardarlo.

## Funciones conservadas

Arquitectura, Urbanismo, Distribución, rotación decimal y alineación CAD de racks, snapping, Undo/Redo, modelado de mobiliario 3D, NPT, apilamiento, biblioteca, Cloudflare Pages, Wrangler y D1. No se cambió el esquema SQL.

## Cloudflare Pages

- Framework: `None`
- Build: `npm ci && npm run build`
- Output: `public`
- D1: reutiliza la base existente con binding `DB` configurado en `wrangler.toml`.

## Validaciones realizadas

- `npm run check`: compila frontend y CSS y ejecuta las regresiones V202/V205/V206/V208/V209.
- `test-v209.mjs`: geometría convexa y cóncava, zonas colindantes, contención, autointersección, áreas calculadas, preservación de datos.
- Chromium: apertura de Arquitectura, Urbanismo y Distribución; métricas de área; traslado conjunto de perímetro, zonas y racks; sin errores de navegación ni excepciones de JavaScript en el recorrido probado.

**Pendiente de validar en Cloudflare Preview antes de producción:** render WebGL completo y persistencia remota D1. El entorno de pruebas no tiene una sesión contra tu Cloudflare ni instaló Three.js; Cloudflare lo incorpora mediante `npm ci`.
