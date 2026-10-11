# WMS Industrial V202 — Motor CAD de precisión

Versión basada en la V201 auditada. Mantiene **Wrangler, Cloudflare D1 (`DB`), las migraciones SQL, la biblioteca de racks, el constructor de mobiliario y Diseñar espacio 3D**. No se realizan cambios de esquema SQL.

## Nuevo sistema de cotas (tres clics, estilo Revit)

1. En **Editar layout → Arquitectura**, elige **Medir**.
2. Haz clic en el **punto A** (vértice o arista).
3. Haz clic en el **punto B**. Se muestra la cota alineada, todavía sin fijar.
4. **Mueve el mouse perpendicularmente** para ajustar la distancia de la cota a la geometría.
5. **Tercer clic** para fijar la posición. Se mantiene la herramienta para seguir creando cotas. **Esc** cancela.

Las cotas creadas con V202 referencian los vértices, nodos y aristas de las zonas, del área general y de los muros cuando hay geometría de destino. Si se modifica la geometría vinculada, la distancia se actualiza. Las cotas históricas sin referencias conservan sus coordenadas anteriores, sin migraciones destructivas. Si un elemento de referencia desaparece, queda la posición de respaldo para evitar errores de renderizado.

Selecciona una cota con la herramienta **Seleccionar** y arrástrala para cambiar su separación perpendicular. También puedes indicar el **desplazamiento (cm)** desde su inspector.

## Herramientas de precisión

- Los **círculos de vértices de zonas se centran en la posición exacta de los puntos** (sin desplazamiento hacia afuera).
- **Orto** activable/desactivable con el botón **⊥** o tecla **F8**. Shift también restringe temporalmente el movimiento.
- Se conserva el SNAP a rejilla y referencias geométricas.
- **Ctrl+Z**, **Ctrl+Y** y **Ctrl+Shift+Z** ejecutan Undo/Redo fuera de campos de edición.
- Los movimientos de vértices de zona, perímetro general, aristas y nodos principales se registran como operaciones deshacibles; las cotas admiten historial para creación, eliminación, separación por arrastre y entrada numérica.

## Pruebas realizadas

- `npm run check`: compilación JavaScript y CSS, sincronización del bundle, auditoría y sintaxis.
- Chromium: creación en tres clics, cotas horizontales y diagonales, referencias que siguen a vértices movidos, ajuste mediante drag y campo numérico, Undo/Redo, Esc, F8 y cambio de modos.
- Drag real de un vértice: la cota actualiza el punto origen y Undo restituye la geometría.

## Despliegue Cloudflare Pages

- Framework preset: `None`
- Build command: `npm ci && npm run build`
- Output directory: `public`

Mantén el binding D1 preexistente de `wrangler.toml`. **No recrees la base de datos.** Si Cloudflare no instala `three`, el build se detiene para evitar publicar el visor 3D incompleto.

## Límites de la validación

No se probó en este entorno el render WebGL completo ni las operaciones remotas con Cloudflare D1. Antes de publicar en producción, prueba ambos en una rama Preview. Las cotas angulares y en cadena y las restricciones geométricas paramétricas avanzadas no forman parte de esta entrega; el tipo implementado es la **cota alineada, asociativa y editable**.
