# WMS Industrial V212 — Editor poligonal de Arquitectura

Continúa sobre V211 y conserva Arquitectura, Urbanismo, Distribución, biblioteca, constructor de mobiliario y visor 3D. Mantiene `wrangler.toml`, funciones Pages y migraciones D1.

## Uso

1. Abre **Editar layout → Arquitectura**. Selecciona **Área comercial**, **Zonas** o **Muros**. Cada modo tiene herramientas propias; editar una zona no mueve sus muros.
2. En **Zonas**, selecciona el polígono desde el plano o desde la lista de colores. Usa **Dibujar zona irregular** o **+ Zona virtual** para crear una forma en L, U u otro contorno sencillo. Haz clic en cada esquina; termina con **Cerrar polígono**, Enter o clic en el primer punto. Escape cancela y Backspace quita el último punto.
3. Para editar, arrastra los puntos o los lados. **Doble clic en un borde** agrega un vértice en esa posición. **+ Vértice en lado** agrega el punto medio del lado elegido. Clic derecho en un punto o **Eliminar vértice** lo elimina, manteniendo un mínimo de tres puntos.
4. En el inspector puedes elegir el vértice o el lado por su número e introducir **X/Y en metros**, **longitud**, **ángulo de 0° a 360°** y **desplazamiento perpendicular**. El ángulo parte de +X; +Y apunta hacia abajo en el plano. Los lados diagonales conservan su orientación al desplazarse.
5. **Dividir con dos puntos del borde** permite una división oblicua. Las nuevas zonas conservan el total de superficie. Una división que atraviesa un rack se rechaza. También se mantienen división horizontal/vertical y fusión por arista colindante.
6. Usa los colores, nombres, códigos y acabados en **Propiedades de zona**. **Eliminar zona** conserva racks, productos, IDs y posiciones; el gestor permite reasignar los racks que quedaron sin clasificación. **Duplicar zona** busca espacio libre sin traslapes.
7. **Bloquear área/zona** protege su geometría. Un límite compartido con una zona bloqueada no puede desplazarse. Las operaciones geométricas admiten **Deshacer/Rehacer**, incluidos puntos, división, bloqueo y clasificación de racks.
8. En **Área comercial**, selecciona y edita sus puntos y lados con las mismas herramientas. Si un cambio deja zonas fuera, aparece un contorno propuesto y una revisión: **Ajustar límites compartidos**, **Conservar zonas para corregir** o **Cancelar cambio**. Nunca se eliminan zonas silenciosamente.
9. **Guardar layout** utiliza el mecanismo existente de guardado remoto. Las modificaciones locales también se conservan al recargar el layout de la sucursal.

## Reglas y alcance

- Las zonas son subdivisiones imaginarias del área útil. Pueden compartir puntos y lados y dejar superficie sin clasificar; no pueden superponerse ni salir del perímetro comercial.
- Se rechazan cruces, contacto de aristas no adyacentes, vértices repetidos, retrocesos sobre un lado y superficies degeneradas.
- Insertar/eliminar un punto compartido y moverlo sincroniza las zonas vecinas tras validar el conjunto. Los controles numéricos también propagan puntos intermedios que coinciden con una arista vecina.
- El snap de dibujo permite reutilizar vértices y aristas del área y las zonas. El usuario debe trazar el contorno completo; no se genera automáticamente una zona a partir de un único límite nuevo.
- El ajuste automático de zonas afectadas por un cambio de área se limita a vértices coincidentes con su perímetro y se aplica solo cuando todo el resultado es válido. Para modificaciones complejas se ofrece conservar las zonas y corregirlas manualmente.
- Los nodos y extremos físicos coincidentes con vértices del área acompañan su movimiento cuando se conserva la correspondencia del perímetro. Redibujar por completo el área o cambiar la cantidad de lados conserva los muros existentes; revisa sus alineaciones en **Muros**.
- Solo se admiten polígonos simples, sin huecos interiores ni múltiples contornos desconectados. La unión por un único vértice y una división que produciría más de dos polígonos se rechazan.
- Las zonas virtuales conservan su código al arrastrarse. Se corrigió la renumeración heredada basada en el nombre «Almacén» y el historial del panel usa el ámbito correcto.
- Se corrigió el colapso del plano a 1280 px por una regla responsive antigua de cuatro paneles.

## Cloudflare Pages

- Framework: `None`
- Compilación: `npm ci && npm run build`
- Salida: `public`
- Conserva el binding D1 **DB** y los datos de `wrangler.toml`. No se requiere una base nueva ni una migración adicional para estas mejoras.

## Validación

`npm run check` compila frontend/CSS, verifica que el bundle corresponda con las fuentes, ejecuta las pruebas V202–V212 y verifica la sintaxis del backend.

V212 incorpora pruebas de polígonos estrictos, puntos compartidos, edición numérica, bloqueos, propuestas de área, muros vinculados, lados diagonales y división oblicua. La interfaz se comprueba adicionalmente en Chromium con inserción por doble clic, coordenadas, Undo/Redo, modos separados, creación irregular, recarga local y superficies de zonas en el visor 3D. El guardado remoto en una instancia real de Cloudflare D1 no se prueba desde este entorno.

La prueba de interfaz reproducible está en `scripts/test-v212-ui.mjs`. Requiere Playwright con Chromium instalado (dependencia de pruebas opcional). Puede usarse `WMS_TEST_BROWSER` para indicar un ejecutable Chromium existente.
