# Cambios V180

## Implementado

- Nuevo inspector Arquitectura/Mobiliario en Diseñar espacio 3D.
- Creación de muros con dos clics, edición de espesor, altura, longitud y acabado.
- Aberturas sobre muros con validación de ancho, posición, altura y solapamientos.
- Tipo `window`: un único ventanal de dos paños con marco oscuro y vidrio semitransparente.
- Render 3D basado en `layout.walls` / `layout.openings` y guardado sincronizado con Editar layout.
- Generación inicial de muros editables en sucursales que solo tenían paredes visuales; no regenerar tras eliminaciones.
- Deshacer y rehacer de estructura.
- CSS del inspector integrado en las hojas consolidadas, sin capas de override nuevas.
- Versión/recursos estáticos actualizados a V180 para evitar caché antiguo.

## Verificación realizada

- `npm run check`: compilación, integridad bundle, auditoría de funciones, regresiones CAD/Sheets, autenticación, geometría y arquitectura.
- Prueba de navegador Chromium sin Three.js: edición del espesor 12→24 cm, creación de ventanal, cambio a CAD y verificación de la abertura, sin excepciones JS después de corregir el estado asíncrono.
- Test geométrico automatizado: hueco de puerta hasta suelo, dintel, antepecho y hueco de ventanal con vidrio seleccionable.

## Pendiente de comprobar al desplegar

- Render WebGL real (Three.js no pudo descargarse dentro del contenedor de pruebas) y guardado en Cloudflare D1 de producción.
- Unión avanzada de encuentros complejos de muros y movimiento de particiones que reconfiguren automáticamente zonas vecinas. Se conserva el sistema actual de nodos.
