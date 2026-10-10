# WMS Industrial V160 — Ambiente virtual 3D

## Objetivo

Visualizar el ambiente físico (zonas/plano 2D) como un espacio tridimensional, colocar racks, mostradores, vitrinas, contenedores y cajas, y localizar productos por mueble, nivel y posición.

## Novedades

- Menú **Ambiente virtual 3D** accesible desde el administrador y como visualización para usuarios viewer.
- Modelos 3D paramétricos: rack, mostrador, vitrina de vidrio, contenedor y caja/gaveta.
- Muebles relacionados con los **racks del layout existente**. Su posición también se utiliza en el plano 2D.
- Edición de ancho, fondo, altura, rotación, número de niveles y posiciones.
- Colocación automática en un espacio libre de la zona y comprobación básica de colisiones y límites.
- Navegación 3D: orbitar, panorámica, zoom, vistas isométrica/planta/frontal y mover muebles sobre el suelo.
- Asignación manual de SKU y cantidad a cada nivel/posición; visualización adicional de ubicaciones disponibles en productos importados desde Sheets.
- Búsqueda por SKU, nombre y código; localización y enfoque del objeto 3D, consultando D1 si el producto no está en el lote local.
- Persistencia local inmediata dentro de `branchLayouts` y botón explícito «Guardar en nube» que utiliza la API `/api/app-state` original.
- Control de edición de acuerdo con rol: viewer consulta, administrador modifica.
- Corrección de autorización omitida en el proxy de video.
- Copia en compilación de Three.js a `public/vendor/three.module.js`, sin dependencia del CDN cuando npm está instalado.

## Desplegar en Cloudflare Pages

1. Ejecutar `npm install` (necesario para descargar Three.js).
2. Ejecutar `npm run build` y `npm run check`.
3. Mantener output `public/` y la vinculación D1 configurada en `wrangler.toml`.
4. Publicar en GitHub/Cloudflare Pages con build command `npm run build`.
5. Iniciar sesión como administrador, abrir **Ambiente virtual 3D**, añadir modelos y asignar SKU por niveles. Presionar «Guardar en nube».

## Datos y compatibilidad

No se alteran las migraciones D1. Los muebles nuevos se guardan como racks con propiedades adicionales (`virtualType`, `virtual`, `virtualName`, `virtualPlacements`) dentro de los layouts por sucursal. La asignación manual **no modifica el Google Sheet** ni ejecuta movimientos físicos de stock: es una configuración visual del ambiente. Se recomienda un respaldo del estado remoto antes de reemplazar la versión publicada.

## Alcances y pruebas pendientes

`npm run check` verifica coherencia de bundle, ausencia de overrides duplicados y sintaxis. Las pruebas unitarias de geometría se ejecutan con `npm run test:virtual`. No es una prueba completa del despliegue Cloudflare D1 ni de GPU/WebGL de todos los dispositivos. El movimiento detecta solapes por huella rectangular (AABB), no colisión de geometrías interiores 3D ni simulación estructural. La búsqueda D1 está limitada por la cantidad devuelta de cada consulta.
