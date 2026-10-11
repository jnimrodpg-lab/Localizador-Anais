# WMS Industrial V213 — Edición contextual del plano

Actualización sobre V212. Conserva Arquitectura, Urbanismo, Distribución, biblioteca, constructor de mobiliario y visor 3D. Las funciones Pages, configuración Cloudflare y migraciones D1 se conservan.

## Novedades

- **Renombrado visible**: selecciona la zona y edita «Nombre de zona» al inicio del inspector. También puedes hacer doble clic en la etiqueta del plano o enfocarla y pulsar Enter/F2. El nombre se valida y limita a 80 caracteres. Cambiar el nombre conserva el código, referencias de racks, productos y geometría; admite deshacer/rehacer.
- **Icono sobre el muro seleccionado**: en Muros, pulsa ↔ sobre el eje para abrir Adentro / Centro / Afuera. Seleccionar una opción muestra una previsualización y flechas que indican la dirección real del espesor. Pulsa Aplicar o Cancelar. Cambiar la posición conserva eje, nodos, IDs y aberturas; las uniones usan la geometría compartida de V210 en 2D/3D. El icono aparece solo en el muro activo.
- **Cotas editables**: activa Cotas y pulsa una medida del área, zona o muro manual seleccionado. Introduce la longitud en metros y elige el extremo fijo A/B. Se conserva el ángulo y se valida la geometría conectada. En zonas se propagan los límites compartidos. Los muros automáticos heredados se editan desde sus propiedades, sin una cota directa independiente.
- **Inspector contextual**: identidad y color de la zona primero; coordenadas de vértice o medidas de lado según la selección. La edición precisa, superficies, propiedades adicionales y herramientas de conversión siguen disponibles en secciones desplegables. Los extremos y desplazamientos exactos del muro están agrupados. Seleccionar una zona desde la lista devuelve el inspector al inicio.
- **Selección clara**: «Editando…» indica el elemento activo. Vértices circulares y controles de lado cuadrados; extremos del muro marcados A/B. Deshacer/Rehacer visibles en todos los espacios de edición, con nombres de operaciones en sus ayudas.
- **Capas accesibles**: botón Capas en la barra principal. Zonas, muros, aberturas y racks se muestran/ocultan y bloquean por separado. Cuadrícula y cotas tienen controles propios. Una capa bloqueada evita selección accidental, edición, creación, duplicado y eliminación desde los controles habituales. Estos ajustes de visualización pertenecen a la sesión del editor; los bloqueos geométricos individuales se guardan con el plano.
- **Feedback de precisión**: guías de alineación y marcador al ajustar a vértices/aristas. Los cambios numéricos rechazados muestran el contorno propuesto y el motivo sobre el plano. El inspector conserva el valor editado para corregirlo.
- **Guardado inequívoco**: distingue guardado en este dispositivo, pendiente de sincronizar, sincronizando, guardado en servidor y sincronización fallida. Si se edita durante una petición de guardado, la respuesta anterior no marca los cambios nuevos como sincronizados. Los errores del almacenamiento local tampoco se anuncian como guardado correcto.
- **Interfaz y rendimiento**: cuadrícula de dos patrones SVG en lugar de miles de líneas DOM, textos y controles más legibles, paleta cálida coherente en ambos temas. A 1024/1280/1560 px el plano y el inspector se mantienen dentro de la ventana. En superficies menores se conserva la disposición apilada.

## Editor de polígonos conservado

Área comercial, zonas y muros tienen modos independientes. Dibuja un contorno completo con clics y cierra con Enter, el primer punto o «Cerrar polígono». Escape cancela; Backspace quita el último punto. Doble clic en un borde agrega un vértice; clic derecho en un vértice lo elimina. Se mantienen edición numérica de X/Y, ángulo, longitud y desplazamiento perpendicular, división oblicua, división horizontal/vertical, fusión, colores, acabados, bloqueos y revisión de cambios del área.

Las zonas no se superponen ni salen del área útil. Los límites compartidos se validan en conjunto. Eliminar una zona conserva racks y productos, con reasignación posterior. La división rechaza atravesar racks.

## Alcance y límites

- Polígonos simples sin huecos ni contornos desconectados. Hay que dibujar el contorno completo; no se genera una zona automáticamente a partir de una sola línea.
- El ajuste automático tras modificar el área se limita a vértices coincidentes con su perímetro cuando se mantiene la correspondencia. Si el ajuste no es válido se ofrece revisar o conservar las zonas para corregirlas.
- Redibujar el área o cambiar su cantidad de lados conserva los muros; revisa su alineación. Mover vértices correspondientes sí acompaña nodos y extremos físicos coincidentes.
- «Adentro» y «Afuera» siguen la referencia geométrica del muro; en muros interiores, utiliza las flechas de previsualización para comprobar el lado.
- El nombre visible de una zona y su código interno son independientes. El código sigue disponible en Propiedades de zona y su modificación usa el mecanismo de referencias existente.
- La sincronización real con la instancia Cloudflare/D1 del usuario requiere validar el despliegue. Las pruebas locales de guardado usan respuestas HTTP controladas.

## Cloudflare Pages

- Framework: None.
- Comando: `npm ci && npm run build`.
- Directorio de salida: `public`.
- Conserva `wrangler.toml`, binding D1 **DB** y migraciones actuales; no requiere crear otra base ni ejecutar una migración nueva.

## Verificación

`npm run check` compila las fuentes y CSS, comprueba el bundle, ejecuta las regresiones V202–V212 y revisa sintaxis de backend/frontend.

`npm run test:ui` ejecuta las pruebas de interfaz V212 y V213. Requiere Playwright/Chromium como dependencia opcional de pruebas; no se incluye en el despliegue. Puede definirse `WMS_TEST_BROWSER` para usar un Chromium existente. Las pruebas verifican polígonos, renombrado directo, IDs, cotas con extremo fijo, límites compartidos, vista previa de muros, uniones, aberturas, historial, capas, respuestas de guardado, recarga local, modo claro/oscuro y visor 3D. Las capturas de QA son temporales y no forman parte del ZIP.
