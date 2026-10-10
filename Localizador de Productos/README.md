# WMS Industrial V200 — Editor CAD unificado

**Versión integrada** de la V196: las cuatro etapas de mejora del layout se distribuyen internamente en un único proyecto y un solo despliegue.

## Tres modos dentro de Editar layout

- **Arquitectura:** perímetro, zonas, denominación, muros, vanos, cotas y secciones. Edita desde los puntos con snap. Los racks y calles permanecen visibles como contexto y no capturan selección.
- **Urbanismo:** calles, veredas, esquinas, superficies, vértices y mobiliario urbano. Selecciona la calle en el plano o en el inspector, asigna nombre y modifica sus parámetros. La estructura no captura clics.
- **Distribución:** agregar, mover, rotar, nombrar y colocar racks de la biblioteca. La selección por niveles **Todos / N1 / N2 / N3** aísla el nivel elegido y permite seleccionar módulos inferiores. Usa el inspector para seleccionar un mueble por nombre / NPT, crear matrices y validar colisiones.

Al cambiar de modo se conserva el layout y sus identidades. **No se crean tablas SQL nuevas**. La pestaña Distribución utiliza la ruta existente `distribution` y los otros dos modos comparten `layout`.

## Diseñar espacio 3D

La barra del visor permite filtrar la visibilidad por nivel con los mismos controles de altura (Todos/N1/N2/N3), sin alterar los NPT ni la geometría guardada. Se conservan los modelos paramétricos de melamina y metal/madera, Colocar encima, relación de soporte, posiciones X/Y y NPT.

## Nomenclatura

Zonas y muros mantienen los campos existentes; el inspector de Urbanismo admite nombre de calle; el inspector de Distribución admite una nomenclatura visible de rack (`displayCode`) separada del ID inmutable. Esta separación protege las referencias SKU, posiciones y asignaciones.

## Undo / Redo y validación

Las herramientas de alineación/distribución/rotación de racks registran un único paso reversible y validan colisiones antes de aplicar el cambio. Se mantienen los históricos separados de `structure` y `distribution` para evitar deshacer geometría cuando se pretendía deshacer un movimiento de racks. Se conserva la comprobación de volumen tridimensional.

## Despliegue Cloudflare Pages

Framework preset: `None`. Build command: `npm ci && npm run build`. Output directory: `public`.
Mantén `wrangler.toml`, el binding D1 **DB** y las migraciones existentes. No hace falta recrear la base.

## Limitaciones de pruebas

Se ejecutaron `npm run check`, verificaciones de sintaxis y pruebas estáticas de la vinculación de controles. La automatización visual de Chromium fue bloqueada por el entorno, por lo que **hay que validar los cambios de modo, las interacciones del selector de niveles y el render WebGL en Cloudflare Pages Preview** antes de publicar en producción. La estabilidad/resistencia estructural de módulos apilados no está certificada por el editor.
