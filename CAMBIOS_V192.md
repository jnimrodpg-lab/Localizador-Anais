# WMS Industrial V192 — Constructor, biblioteca y colocación en layout

## Cambios funcionales

1. **Colocar y editar en layout:** crea una instancia con el `modelId` del mueble, selecciona el rack colocado y navega automáticamente al editor de distribución (`distribution`, la vista de layout donde se mueven y rotan racks). Mantiene las restricciones de zona y colisión. La acción se registra en el historial de distribución.
2. **Diseñar espacio 3D conserva su flujo:** agregar un modelo desde el propio visor permanece en 3D (`navigate:false`).
3. **Biblioteca de racks:** se muestran miniaturas isométricas para muebles paramétricos, construidas usando los mismos paneles, perfiles, fondos y acabados del modelo (sin imágenes estáticas ni placeholders genéricos). El preview grande sigue usando `renderRackDetail` y se actualiza al editar.
4. **Colores y selección:** acabados blanco, roble, nogal y grafito; perfiles metálicos y repisas de madera con colores distintos. No se resalta ningún compartimento en las vistas previas sin selección explícita.
5. **Interfaz:** el encabezado, barra de plantillas y pasos ya no compiten por altura con el visor. Se reorganizan los botones y se evita que queden debajo de otros paneles. Se incluyen ajustes para pantallas medianas y pequeñas.
6. **Revisión opcional:** validación disponible en «05 · Verificar y guardar»; la lista de piezas y exportación CSV permanecen accesibles, pero contraídas por defecto.
7. **Identificación V192:** versionado en el sidebar, en los assets y en los metadatos de la compilación.

## Pruebas

- `npm run check`: compilación, frontend, auditoría, virtual-space, autenticación, arquitectura, UI, regresiones y pruebas específicas de mobiliario V188, V189, V190 y V192.
- Chromium: sin solapamiento entre encabezado/plantillas/pasos, miniatura con varias piezas, preview de la biblioteca, creación de instancia, selección y apertura de distribución; sin errores JavaScript.

## Despliegue Cloudflare Pages

Framework preset: **None**. Build: `npm ci && npm run build`. Output directory: `public`. Mantener la configuración Wrangler/D1 existente. Probar en Preview antes de publicar.

**Pendiente de comprobar en producción:** render WebGL con Three.js real y escritura remota en D1; estas validaciones dependen de los servicios de Cloudflare y de las dependencias servidas al navegador.
