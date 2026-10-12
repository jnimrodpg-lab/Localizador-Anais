# WMS Industrial V221 — Calles por puntos, edición y eliminación

Calles y veredas mejoradas sobre V220, conservando el flujo de arquitectura y diorama. Conserva Arquitectura, Urbanismo, Distribución, biblioteca, mobiliario y visor 3D. Mantiene backend Pages, configuración Cloudflare y migraciones D1.

## Calles V221

- **+ Trazar calle** funciona por puntos: primer clic define el inicio, los siguientes crean tramos continuos y Enter / Esc / clic derecho terminan. Clic en el primer punto cierra un circuito. El encuadre deja espacio exterior para empezar a construir. Shift ayuda a 45°/90°; la vista previa muestra el ancho y evita que la calzada invada el área total. El primer clic no deja una calle huérfana.
- Varias calles pueden trazarse libremente, con diagonales y cambios de dirección. Acercarse al eje o extremo de otra calle facilita la conexión. Los cruces entre ejes generan nodos compartidos e intersecciones T o X según sus brazos reales.
- **Calle activa** está visible en el inspector. **Editar trazado** permite arrastrar puntos y mover la calle desde el eje azul; los puntos compartidos mantienen la conexión. Añadir / quitar punto y doble clic en un tramo permiten ajustar el recorrido. Las veredas manuales acompañan el cambio del eje.
- **Eliminar calle** está visible en la barra de Urbanismo y en el inspector 3D. Supr elimina la calle seleccionada; si se seleccionó un grupo de mobiliario, elimina ese grupo. El borrado actualiza calzadas, bordillos, canaletas y cruces y se puede deshacer. No elimina muros, zonas ni el área comercial.
- Las propiedades de calle siguen visibles en el modo simplificado. Los puntos de edición mantienen un tamaño legible al alejar el plano. En 3D también se puede seleccionar una vía haciendo clic sobre su superficie.
- **Colocación rápida → Alrededor del local** conserva la creación anterior por lados del área total. Las calles existentes mantienen sus IDs, nombres y dimensiones; Editar trazado las convierte a puntos con historial, conservando sus veredas ajustadas.
- Los ejes de las calles libres son manuales. Mover el local completo los traslada junto a su contenido; cambiar su contorno recorta las superficies contra el área total, sin inventar un nuevo recorrido. Para cambiar el recorrido, edita los puntos.

## Urbanismo V220

- Perfil de cinco franjas: vereda, canaleta, calzada, canaleta y vereda. Nuevas calles: 2,40 / 0,60 / 6,00 / 0,60 / 2,40 m; las medidas existentes se conservan. El ancho de canaletas es independiente y editable en 2D y 3D.
- Las calzadas conectadas forman una sola superficie, con brazos que continúan a través del cruce. Los bordillos amarillos y canaletas siguen el borde real; no atraviesan la calzada ni se repiten dentro de la textura. No se dibujan grietas. La línea central y los pasos peatonales se generan como geometría y se interrumpen en el cruce.
- Encuentros de 90°, diagonales o redondeados. Los acabados de veredas y el mobiliario urbano se conservan. Las vistas 2D y 3D utilizan el mismo modelo de superficies, con huecos y sin diagonales internas entre calles.
- **Forma de la vereda → Ajustar al contorno del edificio** cubre el espacio exterior entre la vereda y un área con ochava o entrantes. La superficie se recorta contra el área total, calzadas y canaletas.
- **Editar vértices** permite arrastrar el perímetro, añadir una esquina con doble clic en un lado o con Añadir vértice, y quitar el vértice seleccionado. Admite polígonos cóncavos y movimientos mayores de 2 m; rechaza perímetros que se cruzan. Los vértices manuales se guardan y siguen el traslado del área. Restablecer vértices recupera la forma automática.
- Deshacer/rehacer y recarga local conservan ajustes de veredas, medidas, ID de calles y mobiliario. Continúan vigentes el área total automática y los zócalos de 20 cm del diorama.

## Área comercial manual y área total automática

1. Dibuja el **Área comercial** manualmente con el mismo editor de vértices. Sigue siendo el contorno maestro para sus muros y las zonas virtuales.
2. Al crear los muros se calcula el **Área total**: unión del área comercial con la huella física de todos los muros, incluidos espesores, posiciones Adentro/Centro/Afuera y encuentros. No sustituye el polígono comercial ni necesita otro dibujo. Conserva entrantes y contornos separados; no rellena un contorno convexo inventado entre ellos.
3. El contorno total aparece con una línea verde discontinua y su superficie se informa en el inspector. El botón **+ Calle** se habilita cuando existen área comercial y muros. Calles y veredas parten de los límites exteriores del área total, usando las cuatro orientaciones del editor existente.

Cambiar el área, los extremos, el espesor o la posición de los muros recalcula la huella y ajusta las calles existentes. Conserva sus IDs, nombres, acabados, mobiliario y ajustes manuales de vértices. El área total se guarda con el plano y se regenera al recargar, deshacer o rehacer. Si se elimina el último muro, se retira el área total derivada y se deshabilita crear nuevas calles; las calles existentes se conservan.

La base y el encuadre del diorama incluyen el área total y las calles para que el espesor exterior de los muros quede apoyado sobre la maqueta.

## Espacio virtual 3D: corte según la cámara con zócalo de 20 cm

- Abre con el modelo completo encuadrado y una orientación isométrica de ejes equivalentes, mirando desde el lado opuesto al preset anterior. Coincide con la orientación solicitada en la segunda captura.
- La selección previa de un mueble mantiene sus propiedades, pero no cambia automáticamente el encuadre al entrar. «Enfocar», F y doble clic siguen acercando al elemento; «Isométrica» y «Ajustar» recuperan la vista completa.
- **Diorama** es el modo de muros inicial: cada tramo del perímetro comercial conserva su altura completa cuando su cara interior mira hacia la cámara y se reduce visualmente a un **zócalo de 20 cm** cuando se mira desde su cara exterior. Al girar, cambia el corte de la maqueta: se abren los muros de primer plano dejando visible su huella y se conservan los del fondo. Las divisiones interiores siempre permanecen visibles.
- La normal interior se obtiene del contorno del área, con independencia del sentido de sus vértices o de los extremos del muro. La comparación usa la dirección de la cámara ortográfica; desplazar o acercar la vista no cambia qué lado se ve. Admite perímetros cóncavos y diagonales y tramos mixtos: se recorta solo la porción exterior que corresponda.
- Una pequeña tolerancia angular estabiliza el cambio cuando un muro queda de canto. En vista Planta se conserva el perímetro completo para leer su huella.
- El botón alterna **Diorama → Muros completos → Sin muros → Diorama**. La arquitectura guardada, sus ID, vínculos, aberturas y la geometría del plano 2D se conservan.
- Las ventanas situadas sobre los 20 cm se ocultan con la parte alta del muro; sus huecos no perforan las paredes vecinas. Las puertas mantienen su paso abierto a través del zócalo. Marcos, vidrios y sombras se recortan a la altura visible. Las aberturas interiores siguen visibles. Los empalmes se calculan por franjas de altura: el encuentro del zócalo no prolonga la parte alta de una pared vecina.
- Los 20 cm son una altura física constante aunque cambie la escala del plano. No modifica la altura guardada ni el espesor o los vínculos de los muros. «Muros completos» recupera las alturas originales; «Sin muros» oculta también los zócalos.
- Fondo gris azulado en tema claro y azul oscuro en tema oscuro; iluminación más moderada para recuperar colores y volumen. Base cálida con canto oscuro y sombra de contacto bajo la maqueta.
- Cambiar tema actualiza el fondo 3D inmediatamente. El corte se evalúa durante el arrastre y solo reconstruye la escena cuando cambia el conjunto de tramos visibles. La arquitectura guardada permanece intacta.
- El visor mantiene su altura al reducir la ventana a 1280 px; se retiran de esta pantalla las filas heredadas del antiguo diseño de cuatro paneles.

## Muros: correcciones V216

- Los espesores traslapados forman un contorno físico unido, sin diagonales ni líneas internas permanentes. Se conservan los ejes e IDs necesarios para seleccionar y editar cada tramo y sus vínculos al área.
- Los empalmes tienen un límite proporcional a la longitud de ambos tramos. Si el encuentro invertiría una cara o produciría una punta desproporcionada, se utiliza un encuentro acotado y se une su superficie con la del vecino.
- La vista 2D y ambas vistas 3D utilizan las mismas superficies. La unión admite huecos y cambios de altura; las puertas y ventanas se recortan también sobre superficies superpuestas. Se mantienen los acabados de los muros.
- Los tramos colineales superpuestos con el mismo perfil y acabado se fragmentan y deduplican, incluso si comparten un extremo. Los perfiles distintos mantienen sus propiedades y se unen en la superficie visible.
- **Dibujar muro** activa ahora el botón principal. Primer clic: inicio. Siguientes clics: tramos encadenados con extremo compartido y vista previa. Volver al inicio cierra el ciclo y termina el trazado.
- **Esc**, **Enter** sin medida pendiente, clic derecho o **Terminar trazado** finalizan la cadena conservando los tramos ya creados. Iniciar y cancelar sin crear un tramo no deja un nodo suelto.
- Para una longitud exacta, orienta el cursor, introduce centímetros en el campo de longitud y pulsa Enter. El siguiente tramo comienza en el extremo recién creado. Se respetan espesor, altura y posición respecto al eje del panel de creación.
- Deshacer/rehacer actúa sobre cada tramo confirmado. El cierre de un ciclo crea un recinto físico; no crea automáticamente una zona virtual.

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

`npm run check` compila fuentes/CSS, verifica el bundle, ejecuta regresiones geométricas V202–V221 y comprueba sintaxis del backend/frontend.

`npm run test:ui` comprueba V220 y V221 en navegador: rotación completa con zócalos de 20 cm, divisiones interiores constantes, puertas/ventanas y recorte de marcos/vidrios, temas, base/sombra, desplazamiento/zoom sin reconstrucción, vistas Planta/Frontal/Isométrica, ciclo de muros y alturas guardadas. Incluye trazado nativo por puntos, conexiones compartidas, edición del eje, eliminación por botón y Supr, circuitos cerrados y eliminación en 3D. También verifica cruces y canaletas en 2D/3D, veredas junto a ochavas, edición de vértices, y el flujo Área comercial → Muros → Área total → Calles con creación nativa de muros, posición exterior de veredas, cambios de espesor, deshacer/rehacer y recarga local. `npm run test:ui:layout` conserva la prueba completa de edición de V216. Requieren Playwright/Chromium como dependencia opcional; no forman parte del despliegue. `WMS_TEST_BROWSER` permite indicar un Chromium existente. Capturas de QA solo temporales.

## Alcance

Polígonos simples sin huecos ni contornos desconectados. El área sigue siendo un único perímetro comercial. No se intercambian ni eliminan los objetos ya guardados: se intercambian sus flujos de creación y se corrigen las dependencias. Los cambios que dejen zonas fuera del área pasan por revisión; el ajuste automático de zonas conserva el alcance de V212.

La sincronización real necesita comprobarse en la instancia Cloudflare/D1 del usuario; los cambios se han probado localmente y en navegador. Los muros interiores completamente libres pertenecen al área, pero no se desplazan al editar vértices lejanos de su perímetro.

## Cloudflare Pages

- Framework: None.
- Compilación: `npm ci && npm run build`.
- Directorio de salida: `public`.
- Conserva binding D1 **DB**, `wrangler.toml` y migraciones actuales. No requiere otra base ni una migración nueva.
