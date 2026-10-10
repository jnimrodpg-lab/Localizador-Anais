# WMS Industrial V188 · Furniture Builder

## Funciones añadidas

- Constructor paramétrico integrado en **Construir rack / estante** / Biblioteca de racks, sin separar el modelo de datos histórico.
- Plantillas: **estante de melamina**, **armario de melamina** (laterales, tapas, fondo, divisor y dos puertas) y **estantería de metal + madera** (cuatro postes metálicos, vigas metálicas y tres repisas de madera).
- Inspector con medidas de ancho, fondo y alto, espesor de tableros/perfiles, acabado (roble, blanco, nogal, grafito), selección de piezas y edición básica.
- Herramientas para colocar **puerta** o **frente de cajón**, además del motor previo de divisiones, repisas, snaps, ajuste paramétrico, duplicación y vista frontal.
- **Colocar en espacio 3D** genera una instancia en la zona libre con `modelId` vinculado al modelo de construcción, conservando las piezas; no es una copia simplificada.
- Nueva sección **Muebles creados** en el panel izquierdo de *Diseñar espacio 3D*. Permite añadir un modelo guardado a la zona libre.
- El visor 3D construye cada panel, tapa, puerta, perfil y repisa del modelo seleccionado con coordenadas y dimensiones de la biblioteca; soporta metal + madera como materiales diferenciados.
- Datos preservados en las estructuras previas `models`, `layout.racks` y `branchLayouts`, incluidas las rutas Cloudflare D1/Wrangler existentes.

## Cómo usarlo

1. En el sidebar abre **Biblioteca de racks** y después **Construir rack / estante** (constructor de mobiliario).
2. Selecciona una de las tres plantillas en la barra superior.
3. Ajusta dimensiones, espesores, divisores, repisas y acabados; si deseas, añade un frente de puerta o cajón.
4. Pulsa **Guardar** para guardar el modelo en la biblioteca / nube (requiere sesión y conexión para respaldo remoto).
5. Pulsa **Colocar en espacio 3D**. Se requiere una zona interior suficientemente grande y permisos de administrador.
6. Abre **Diseñar espacio 3D**. La instancia y sus piezas aparecen en la escena; puedes seleccionarla y moverla.
7. También puedes añadir otra instancia desde **Muebles creados**, en la biblioteca 3D.

## Pruebas ejecutadas

- `npm run check` (compilación, bundle, auditoría, geometría, racks, autenticación, arquitectura y regresiones).
- `node tests/furniture-v188.test.mjs` (geometría de las tres plantillas, materiales diferenciados, colocación en una zona, modelo vinculado y persistencia local).

## Límites de esta entrega

- No se verificó el render WebGL extremo a extremo en Chromium; el paquete compiló, pero el runtime local no pudo instalar Three.js desde el registro en este entorno. El proyecto mantiene su dependencia declarada, su mecanismo de build local y el respaldo CDN anterior.
- La colocación requiere una zona que admita el mueble sin colisiones. Si no cabe, se muestra un aviso; no se fuerza su posición.
- Los acabados de melamina y madera se representan mediante materiales básicos coloreados (con rugosidad), no mediante fotografías texturizadas PBR de fabricantes.
- No se han añadido aún herrajes de alta fidelidad, optimización de corte de tableros, costos ni exportación de despiece.
- Guardado remoto contra D1 no verificado desde esta sesión; debe comprobarse en Cloudflare Pages Preview.
