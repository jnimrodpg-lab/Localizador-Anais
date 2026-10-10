# WMS Industrial V161 — Ambiente isométrico y mobiliario 3D

Esta entrega es una evolución **del proyecto V160 original**, conservando el resto del WMS y su esquema de Cloudflare D1. La sala isométrica se dibuja con **geometría WebGL Three.js real**, no con una imagen fija ni un render prerenderizado.

## Funciones nuevas

- **Estilo maqueta isométrica**: cámara ortográfica, piso con espesor, paredes cálidas de corte abierto, muros ocultables, iluminación ambiente y sombras suaves.
- **Cinco modelos 3D paramétricos**: estanterías metálicas con repisas de madera y niveles señalizados; vitrinas con cristal y base de madera; mostradores con listones y terminal; gaveteros plásticos; cajas de cartón con cinta y etiqueta.
- **Cajas dentro de los estantes**: en el inspector del mueble, elegir nivel N y posición P; seleccionar `Cartón` o `Gaveta plástica`; fijar la cantidad (1–4 por compartimento) y pulsar **Colocar cajas**. También puede elegirse `Sin caja`.
- Las cajas creadas mediante el inspector son elementos visuales **asociados a ese compartimento**, y se dibujan físicamente sobre su repisa. El SKU y la cantidad se asignan en el mismo inspector. Las cajas físicas **no alteran automáticamente el stock de productos**.
- Búsqueda por SKU y enfoque de cámara en el mueble, selección directa de repisas y cajas mediante raycasting.
- Botón **Preparar ambiente de ejemplo** para crear una zona vacía si todavía no existe y agregar cinco muebles. Si existen datos, los conserva y agrega muebles si hay espacio.
- Índice de ubicación por SKU construido una vez por actualización del catálogo, mejorando el rendimiento de muchas repisas.
- Evita reducir los niveles por debajo de ubicaciones ocupadas.

## Instalación y despliegue

En la carpeta raíz del proyecto:

```bash
npm ci
npm run build
npm run check
```

En **Cloudflare Pages**: comando de compilación `npm run build`; directorio `public`; vinculación `DB` a la base de datos D1 existente. Es indispensable instalar las dependencias antes de compilar: `build-frontend.mjs` copia la biblioteca `three` a `public/vendor/three.module.js`. Si falta el módulo local, el navegador intenta proveedores CDN externos como respaldo, lo que no es garantía de funcionamiento sin conexión.

**No crear una nueva base ni ejecutar migraciones por este cambio.** Se mantienen usuarios, productos y datos originales. Antes de reemplazar una versión productiva, exportar el respaldo de D1.

## Comprobaciones

`npm run check` comprueba el bundle, redeclaraciones relevantes, sintaxis, escenarios de geometría/ubicaciones, los cinco modelos geométricos y contenedores por nivel. No sustituye una prueba manual del renderizado WebGL en el navegador publicado ni de la persistencia Cloudflare D1 real.

## Archivos principales modificados

- `src/frontend/74-isometric-furniture.js` — nuevo motor de mobiliarios y contenedores.
- `src/frontend/75-virtual-space.js` — integración con el 3D, inspector, zona demo, sombras, cámara y dibujo del recinto.
- `src/frontend/50-viewer-3d.js` — respaldo de carga Three.js.
- `public/assets/app.css` — estilo cálido de la interfaz del ambiente virtual.
- `tests/furniture-v161.test.mjs` — validaciones nuevas.

## Notas operativas

El sistema continúa requiriendo el **administrador real configurado en D1**. No se ha insertado una contraseña estática `admin123` en el código distribuible. Las ubicaciones del inspector se guardan primero localmente con `persistActiveLayout` y después en D1 mediante **Guardar en nube**. Los modelos nuevos de caja no son productos nuevos del inventario: representan contenedores físicos.
