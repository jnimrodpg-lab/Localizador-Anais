# WMS Industrial V225 — Nomenclatura por zona y encuentros físicos

Medidas y geometría coherentes entre Biblioteca de racks, Crear mobiliario 3D, Editar layout y Diseñar espacio 3D. Conserva Arquitectura, Urbanismo, Distribución, calles por puntos, diorama, apilamiento y visor 3D. Mantiene backend Pages, configuración Cloudflare y migraciones D1.

## Correcciones V225 — zonas y encuentros de muros con muebles

- **Nomenclatura por zona:** un rack situado en Z3 usa `Z3-E5`; al pasar a Z2 cambia a `Z2-E5`. El prefijo identifica la zona actual y el sufijo del rack se conserva. Se corrigen los prefijos antiguos al cargar. El centro del mueble determina la zona durante el movimiento; si sale de todas las zonas mantiene su vínculo lógico y muestra el aviso de límite.
- **Códigos únicos:** si `Z2-E5` está ocupado, el rack que llega recibe el siguiente número disponible. El cambio automático conserva el código del mueble existente. La edición manual permite cambiar el número o sufijo; repetir un código de la misma zona intercambia ambas nomenclaturas con una sola operación de historial.
- **Identidad estable:** el ID interno, modelos, nombres, SKU, ubicaciones de productos y contenido del ejemplar se conservan. Los nuevos racks no reutilizan IDs de muebles que se hayan trasladado a otra zona. El movimiento individual, en grupo o con módulos superiores, la reclasificación y la recarga actualizan la nomenclatura.
- **Contacto físico:** tocar una cara del muro no es traslape. La validación considera la rotación real del mueble, espesor y posición Adentro/Centro/Afuera del muro, encuentros de esquinas, vanos, antepechos, dinteles y altura NPT. Un mueble ubicado dentro de un vano libre no colisiona con una pared ficticia.
- **Geometría compartida:** el espacio virtual 3D y la validación construyen las mismas franjas de muro y huecos. El visor 3D secundario usa ancho y profundidad físicos, sin volver a girar las medidas de la caja envolvente; también conserva medidas particulares, tableros, pendientes y NPT.
- **Alertas actuales:** el rojo se actualiza durante la edición y se retira cuando desaparece la interferencia. Los avisos de pasillo no pintan el mueble como una colisión. El modo libre permite conservar una posición con interferencia; el modo estricto y la edición de posición 3D la rechazan.
- **Alineación a caras:** «Hacer paralelo a muro» calcula la separación desde su cara física, en lugar de su eje. El snap a caras de muro admite contacto exacto de 0 cm, también en diagonales. Se conserva el snap entre muebles de V224.
- **Diorama:** el zócalo de 20 cm sigue siendo un corte visual. La ocupación física usa la altura completa guardada del muro, independientemente del ángulo de cámara; «Muros completos» permite comprobar ese encuentro.
- `scripts/test-v225.mjs` comprueba nomenclaturas, códigos repetidos, IDs, productos, grupos, historial, recarga, encuentros en 36 combinaciones de ángulo/escala/posición, vanos y volumen real de Three.js. `scripts/test-v225-ui.mjs` verifica movimientos nativos en 2D/3D, grupos, colores, historial, geometría de ambos visores y recarga completa en navegador.

## Correcciones V224 — contornos y fondo posterior

- **Cara posterior única:** el fondo creado en la biblioteca corresponde al plano local Y=0. En Distribución la marca está siempre en la cara posterior, independientemente del lado más largo. Se visualiza también en el espacio 3D y en la vista isométrica heredada.
- **Contornos 2D rectos:** las esquinas visuales de los muebles son de 90 grados, coincidentes con la geometría usada para cálculos y validaciones.
- **Snap entre caras reales:** acercar aristas paralelas de dos muebles en Distribución permite contacto lateral y alineación de fondos, incluido encaje entre mueble alto y bajo. Si el ángulo tiene una desviación pequeña (hasta 7 grados), corrige la rotación del elemento móvil y preserva su centro, con verificación de posibles colisiones por polígonos rotados.
- **Separación editable:** la casilla «Snap entre aristas» y el valor «Separación entre caras / muro» permiten de 0 a 250 cm (0 es contacto exacto). El snap entre aristas tiene prioridad sobre el snap a vértices. Ctrl suspende la captura durante el arrastre. La guía verde muestra la cara de referencia y la posición candidata.
- **Detección por SAT:** se comprueba el solape geométrico real con rotación en planta y la altura NPT; una arista compartida no se considera colisión. Los controles de mover/rotar y el historial existentes se conservan.
- `scripts/test-v224.mjs` prueba fondo consistente, contacto 0/4 cm, alineación de fondos, giro arbitrario, colisión precisa y reglas de NPT.

## Interfaz V223

- Selector superior con búsqueda por nombre; crear, guardar y opciones para duplicar o eliminar siguen disponibles.
- Visor 3D a toda la altura disponible y propiedades a la derecha, agrupadas en nombre, medidas y distribución.
- Materiales y edición de piezas plegados, con desplazamiento independiente del visor. Seleccionar una pieza abre su inspector.
- **Ampliar vista** oculta las propiedades; **Volver a edición** o Escape las recupera. El encuadre se adapta a la geometría real y proporción del visor. Los cambios de tamaño del visor conservan el giro y zoom.
- Temas claro/oscuro y densidad al 80 %. En pantallas pequeñas, visor encima de las propiedades sin solaparse.
- `scripts/test-v223-ui.mjs` comprueba selector, búsqueda, panel derecho, encuadre, edición, modo ampliado, piezas y tamaños adaptables.

## Mobiliario V222

- La biblioteca tiene una sola previsualización 3D editable, con selector superior y propiedades a la derecha: nombre, ancho, profundidad, cubierta plana o con pendiente, una altura o dos alturas laterales, niveles y divisiones físicas. Materiales y edición de piezas se despliegan al necesitarlos. Clic en una pieza abre el inspector; fondo y rueda permiten girar y acercar la vista.
- Las cuatro pantallas comparten dimensiones y descriptores físicos de piezas. Redimensionar conserva el espesor de tableros, piezas personalizadas y uniones; las repisas se redistribuyen cuando la altura o pendiente reduce su espacio. La tapa inclinada y los fondos recortados usan la misma geometría en el constructor, la biblioteca y el espacio 3D.
- Los cambios de modelo actualizan los ejemplares vinculados en las sucursales. Ancho, profundidad y altura editados en el layout o espacio 3D son modificaciones del ejemplar y se conservan cuando cambia el modelo. **Usar medidas del modelo** restaura esas tres dimensiones. La rotación usa grados continuos y una huella real; la escala de plano se aplica una sola vez.
- El inspector de un mueble seleccionado muestra directamente **nombre** y **nomenclatura**, también en el modo simplificado. La nomenclatura identifica el ejemplar y es independiente de su ID interno. Introducir el código de otro mueble del mismo layout intercambia los dos códigos en una operación que puede deshacerse; posiciones, nombre, SKU y contenidos conservan su ejemplar.
- Nombres y códigos se muestran en las etiquetas, lista e inspectores. Medidas, piezas, pendiente y nomenclaturas persisten localmente y utilizan el flujo existente de guardado en Cloudflare D1. Se corrigió la recarga que restablecía dimensiones de los modelos predeterminados.
- `scripts/test-v222.mjs` comprueba medidas, espesores, piezas, pendientes, geometría real, coincidencia de huellas, códigos y persistencia. `scripts/test-v222-ui.mjs` verifica las cuatro pantallas con controles nativos, un único preview, selección de piezas, temas, tamaño compacto, historial y recarga.

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

`npm run check` compila fuentes/CSS, verifica el bundle, ejecuta regresiones geométricas V202–V222 y comprueba sintaxis del backend/frontend.

`npm run test:ui` comprueba V220, V221, V222, V223 y V225 en navegador: rotación completa con zócalos de 20 cm, divisiones interiores constantes, puertas/ventanas y recorte de marcos/vidrios, temas, base/sombra, desplazamiento/zoom sin reconstrucción, vistas Planta/Frontal/Isométrica, ciclo de muros y alturas guardadas. Incluye trazado nativo por puntos, conexiones compartidas, edición del eje, eliminación por botón y Supr, circuitos cerrados y eliminación en 3D. También verifica cruces y canaletas en 2D/3D, veredas junto a ochavas, edición de vértices, y el flujo Área comercial → Muros → Área total → Calles con creación nativa de muros, posición exterior de veredas, cambios de espesor, deshacer/rehacer y recarga local. `npm run test:ui:layout` conserva la prueba completa de edición de V216. Requieren Playwright/Chromium como dependencia opcional; no forman parte del despliegue. `WMS_TEST_BROWSER` permite indicar un Chromium existente. Capturas de QA solo temporales.

## Alcance

Polígonos simples sin huecos ni contornos desconectados. El área sigue siendo un único perímetro comercial. No se intercambian ni eliminan los objetos ya guardados: se intercambian sus flujos de creación y se corrigen las dependencias. Los cambios que dejen zonas fuera del área pasan por revisión; el ajuste automático de zonas conserva el alcance de V212.

La sincronización real necesita comprobarse en la instancia Cloudflare/D1 del usuario; los cambios se han probado localmente y en navegador. Los muros interiores completamente libres pertenecen al área, pero no se desplazan al editar vértices lejanos de su perímetro.

## Cloudflare Pages

- Framework: None.
- Compilación: `npm ci && npm run build`.
- Directorio de salida: `public`.
- Conserva binding D1 **DB**, `wrangler.toml` y migraciones actuales. No requiere otra base ni una migración nueva.
