# WMS Industrial V208 — Giro libre y alineación paralela de racks

## Novedades de Distribución

- **Giro libre:** selecciona un rack y ajusta el campo **Ángulo libre (0°–360°)** con precisión de 0,1°. Acepta cualquier ángulo intermedio y normaliza el resultado a 0–360°. El giro mantiene el centro del rack.
- **Hacer paralelo a muro:** selecciona el rack, pulsa el botón y haz clic en una arista de muro, de zona o del perímetro del área general. Se calcula la orientación real de ese segmento, incluyendo diagonales.
- **Paralelo a 2 vértices:** selecciona el rack y pulsa el botón; después haz clic en dos vértices distintos. La dirección se calcula entre esos dos puntos.
- **Separación perpendicular:** introduce la distancia en cm en **Separación perpendicular (cm)** antes de alinear. Después de colocar el rack, cambia la cifra y usa **Aplicar nueva separación** sin seleccionar de nuevo el muro.
- **Invertir sentido 180°:** invierte el sentido longitudinal del rack sin desplazar su centro.
- **Movimiento libre y snap:** continúan como ajustes separados. Si el modo de movimiento libre está activado, se advierten colisiones sin bloquear la alineación. Al desactivarlo, las colisiones y restricciones de zona vuelven a impedir la operación. El snap a rejilla y a vértices permanece disponible durante el arrastre; la operación "Hacer paralelo" calcula el ángulo exacto sin redondearlo a la rejilla.
- **Undo/Redo:** el giro o la alineación se guarda como una sola operación reversible. Usa **Ctrl+Z** y **Ctrl+Y** o **Ctrl+Shift+Z** fuera de los campos de texto.

## Instrucciones rápidas

1. Abre **Editar layout → Distribución** y selecciona un rack en el plano o desde el inspector.
2. Para giro exacto, escribe `37.5` en **Ángulo libre** y confirma.
3. Para hacer paralelo, define la separación, pulsa **Hacer paralelo a muro**, y haz clic sobre la arista inclinada (o selecciona **Paralelo a 2 vértices** y haz clic en ambos puntos).
4. Para ajustar distancia posteriormente, modifica el campo de separación y pulsa **Aplicar nueva separación**.
5. Activa **Movimiento libre** si deseas permitir una ubicación provisional fuera de la zona. Los avisos de interferencia no equivalen a una aprobación de seguridad.

## Compatibilidad

Conserva Arquitectura, Urbanismo, áreas, cotas, muros, zonas, biblioteca de racks, mobiliario, apilamiento, modelos 3D, Wrangler y las migraciones SQL. No modifica el esquema de Cloudflare D1.

## Despliegue en Cloudflare Pages

- Framework: `None`
- Comando: `npm ci && npm run build`
- Directorio de salida: `public`
- Conserva el binding `DB` del archivo `wrangler.toml` y tu base D1 existente.

## Validaciones realizadas

- `npm run check` (compilación, sincronización, verificaciones V202/V205/V206/V208 y sintaxis).
- Chromium: navegación a Distribución, 33,7°, selección de muro, dos vértices, cambio de separación, inversión y Undo/Redo, sin errores JavaScript.
- Pruebas de geometría: 27,35° y distancias perpendiculares de 13,5 y 24,25 cm; operaciones inválidas no modifican el modelo.

**Pendiente de validar en Cloudflare Preview:** carga WebGL de Three.js y persistencia remota D1. En el entorno local de auditoría Three.js no está instalado; el build de Cloudflare utiliza `npm ci`.
