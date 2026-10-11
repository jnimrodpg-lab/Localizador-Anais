# WMS Industrial V215 — Editor con más espacio

Rediseño sobre V214. Conserva Arquitectura, Urbanismo, Distribución, biblioteca, mobiliario y visor 3D. Mantiene backend Pages, configuración Cloudflare y migraciones D1.

## Jerarquía y creación

1. **Área comercial** es el contorno maestro. «Dibujar área» utiliza el editor poligonal que era la creación principal de Zonas: clic en cada esquina, Enter / primer punto / Cerrar polígono para terminar. Admite perímetros irregulares. Sus vértices y lados se editan con arrastre, doble clic, clic derecho y medidas exactas.
2. **Muros** pertenecen al área. Selecciona un lado del perímetro comercial y pulsa Crear muro en arista, o Crear muros del área para completar el perímetro. Los muros del perímetro guardan referencias estables a los vértices y a los puntos de sus lados. Cambiar el área actualiza sus nodos y muros conectados. Los muros interiores conservan sus extremos libres y se vinculan al perímetro donde coinciden con él; sus IDs y posiciones se conservan al migrar.
3. **Zonas** son divisiones virtuales interiores. «+ Zona» pasa a la creación rectangular rápida que antes correspondía al área: indica ancho y alto en metros, y haz clic en el centro de la zona. Debe quedar dentro del área y sin superponer otras zonas. El dibujo irregular sigue disponible en Edición precisa para casos especiales. Cambiar nombre, color o perímetro de una zona no mueve muros.

La creación y edición avanzadas siguen disponibles. El nombre visible y el código interno de una zona son independientes; renombrarla conserva las referencias de racks y productos.

## Vínculos geométricos

- Vértices del área con identidad estable; muros vinculados mediante referencias a vértices o posición sobre un lado. Se guardan con el plano, admiten recarga e historial.
- Añadir una esquina divide el muro que la atraviesa y conserva el ID original en la primera parte. Los nuevos segmentos siguen el nuevo contorno y las uniones de V210 se recalculan en 2D/3D.
- Eliminar un vértice o redibujar el área vuelve a anclar los extremos al nuevo contorno. Se conservan IDs existentes y se añaden segmentos cuando hace falta seguir las nuevas esquinas.
- Puertas y aberturas conservan sus IDs y distancia desde el inicio del muro. Si una nueva esquina atraviesa una abertura o el nuevo tramo no tiene espacio suficiente, el cambio se rechaza sin modificar el plano; primero debe reubicarse la abertura.
- Muros vinculados se modifican desde el Área comercial. La longitud del muro puede editar un vértice del área cuando corresponde; los movimientos y giros CAD independientes no pueden separar esos extremos del contorno maestro. Los muros interiores libres conservan sus herramientas CAD.
- Las capas bloqueadas impiden modificar sus elementos a través del área cuando el cambio también los movería. El traslado del local con todo su contenido requiere desbloquear las capas implicadas.
- La migración conserva muros físicos preexistentes. Retira la dependencia de zonas virtuales, sin borrar ni mover muros, racks o productos.

## Interfaz rediseñada

- **Dos barras:** espacios de trabajo, sucursal y guardado en la primera; Área comercial / Muros / Zonas, creación, historial, Ajustar e Inspector en la segunda. Las tres especialidades siguen disponibles.
- **Plano a altura completa:** los cortes X/Y se abren desde «Cortes» junto al zoom, sobre el lienzo. Se cierran con el mismo botón o «Cerrar». Una zona sin racks muestra un mensaje breve en lugar de dos gráficos vacíos. Las vistas y la inversión de dirección se conservan cuando hay racks.
- **Inspector más ancho:** título y selección visibles arriba; campos más legibles, espaciado uniforme y menos tarjetas anidadas. Puede ocultarse desde la barra para ampliar el plano.
- **Edición contextual:** al elegir un lado aparecen sus medidas; al elegir un vértice aparecen X/Y. Los botones Vértice / Lado permiten cambiar el tipo de edición precisa. Coordenadas, giros, división, bloqueo y operaciones avanzadas continúan disponibles.
- **Cuadrícula adaptativa:** la separación visual aumenta al alejar la vista. El tamaño de snap y la precisión del plano no cambian.
- **Guardado breve:** Local · pendiente / Sincronizando / Sincronizado / Error de guardado. El mensaje completo permanece en la descripción accesible y al pasar el cursor.
- **Más:** cotas, ortogonalidad, presentación y capas. Muros también conserva puertas y aberturas. Ajustar e Inspector quedan a mano; los cortes se encuentran junto al zoom.
- Se mantienen el nombre editable de zonas, colores, capas y bloqueos, icono del muro con Adentro / Centro / Afuera, historial y revisión de cambios del área.
- Paleta cálida, temas claro/oscuro y escala de interfaz del 80%. A partir de 1024 px el editor ocupa la ventana; en pantallas menores, plano e inspector se apilan y la barra admite desplazamiento horizontal.

## Guardado y validación

Se mantienen los estados de V213: guardado en este dispositivo, pendiente de sincronizar, sincronizando, guardado en servidor y error de sincronización. Una respuesta anterior de guardado no marca los cambios nuevos como sincronizados. Se mantienen las comprobaciones del almacenamiento local.

`npm run check` compila fuentes/CSS, verifica el bundle, ejecuta regresiones geométricas V202–V214 y la interfaz V215 y comprueba sintaxis del backend/frontend.

`npm run test:ui` ejecuta la prueba de interfaz V215. Requiere Playwright/Chromium como dependencia opcional de pruebas; no forma parte del despliegue. `WMS_TEST_BROWSER` permite indicar un Chromium existente. Se comprueban jerarquía, creación poligonal del área, creación rectangular/irregular de zonas, vínculos de muros, esquinas nuevas, medidas, historial, independencia de zonas, menú de posición del muro, capas, Más, tres espacios de edición, recarga local y visor 3D. También se verifica la altura completa con cortes abiertos, el cambio entre vértice/lado y los controles a distintos tamaños. Capturas de QA solo temporales.

## Alcance

Polígonos simples sin huecos ni contornos desconectados. El área sigue siendo un único perímetro comercial. No se intercambian ni eliminan los objetos ya guardados: se intercambian sus flujos de creación y se corrigen las dependencias. Los cambios que dejen zonas fuera del área pasan por revisión; el ajuste automático de zonas conserva el alcance de V212.

La sincronización real necesita comprobarse en la instancia Cloudflare/D1 del usuario; los cambios se han probado localmente y en navegador. Los muros interiores completamente libres pertenecen al área, pero no se desplazan al editar vértices lejanos de su perímetro.

## Cloudflare Pages

- Framework: None.
- Compilación: `npm ci && npm run build`.
- Directorio de salida: `public`.
- Conserva binding D1 **DB**, `wrangler.toml` y migraciones actuales. No requiere otra base ni una migración nueva.
