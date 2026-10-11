# WMS Industrial V203 — Muros contextuales y uniones arquitectónicas

Basado en V202, conservando **Wrangler, binding D1 `DB`, migraciones SQL, apilamiento, biblioteca, constructor de mobiliario, CAD y cotas**. No cambia el esquema SQL.

## Edición de muros

1. Abre **Editar layout → Arquitectura → Muros · crear y editar**.
2. Haz clic sobre una **arista de una zona**. Los chips permanentes `+ MURO` se eliminaron; el borde se resalta al pasar el puntero.
3. En el inspector define la colocación del espesor: **Hacia dentro**, **Hacia fuera** o **Centrado**, además de espesor y altura en centímetros.
4. Pulsa **Crear muro en arista**. El muro se selecciona; puedes actualizarlo o eliminarlo desde el mismo inspector.
5. **Cerrar perímetro de zona** crea/configura los muros de todas las aristas de esa zona (un solo paso de historial).
6. Cambia a **Geometría · áreas y zonas** para mover vértices o crear cotas sin chips obstructivos.

### Empalmes y sincronización 2D/3D

Los muros creados desde aristas comparten nodos y registran qué zona y arista los originó. La línea de referencia no se mueve al cambiar el espesor: se construyen caras según dentro/fuera/centro. Los cierres en nodos usan las caras físicas del muro para evitar el problema de dobles parches. El 3D coloca su espesor sobre el mismo eje geométrico y añade un volumen físico en las juntas; el inspector arquitectónico 3D permite cambiar también la orientación del espesor.

Las uniones de más de dos muros, los muros con alturas distintas y las uniones con vanos adyacentes deben comprobarse en Cloudflare Preview con Three.js para verificar la estética final. Las verificaciones automáticas no certifican estabilidad estructural.

### Verificación

- `npm run check`: compila, valida integridad y ejecuta auditoría heredada.
- Prueba de navegador Chromium: selección de arista, muro interior de 22 cm, edición exterior, cierre del perímetro y geometría de esquinas compartidas, sin excepciones JS.

## Despliegue en Cloudflare Pages

Framework `None`, comando `npm ci && npm run build`, directorio `public`. Mantén tu binding D1 actual. No recrees la base SQL. Antes de sustituir producción, verifica el render WebGL completo y el guardado remoto en Cloudflare Preview.

---

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
