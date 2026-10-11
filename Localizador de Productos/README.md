# WMS Industrial V211 — Zonas virtuales editables

Esta versión mantiene los módulos de Arquitectura, Urbanismo, Distribución, biblioteca y constructor de mobiliario 3D, así como `wrangler.toml`, las funciones Pages y la base D1 existente.

## Mejoras en Arquitectura

- **Gestor de zonas:** selector visual por colores, sin mezclar muros y subdivisiones virtuales.
- **Crear / clasificar:** nuevas zonas con colores diferenciados; edición de nombre, código y acabado.
- **Editar perímetro:** seleccionar una zona y pulsar «Editar perímetro». Arrastrar vértices o bordes con snap. Los vértices *exactamente compartidos* por zonas vecinas se actualizan conjuntamente. Insertar un vértice en una arista compartida lo inserta también en la zona contigua.
- **Eliminar zona:** elimina solo la clasificación virtual. Los racks y sus productos se conservan, con el mismo ID y ubicación física; quedan «sin zona» hasta reasignarlos desde el gestor. También puede eliminarse la última zona.
- **Fusionar:** unir dos zonas con una arista colindante para obtener un solo perímetro válido, sin generar muros. Los muebles de la zona absorbida conservan IDs y SKU; solo cambia su zona asignada.
- **Dividir:** se mantienen los botones existentes para dividir horizontal o verticalmente. Por seguridad, la división se rechaza si corta físicamente un rack.
- **Muros físicos:** no se eliminan al reorganizar las zonas. Se conserva el lado de crecimiento de su espesor al borrar o fusionar las antiguas clasificaciones.
- **Undo / Redo:** restablece la clasificación de los racks cuando se revierte una eliminación, fusión o renombrado, sin renombrar sus IDs.
- **Forma de zona:** introducir X, Y, ancho o alto no convierte cuadriláteros irregulares en rectángulos; mantiene su geometría relativa.

### Límites conocidos

- Los límites compartidos se sincronizan cuando coinciden geométricamente sus vértices. Para aristas parcialmente coincidentes, primero añade los vértices de correspondencia o utiliza el snap para hacerlas exactamente colindantes.
- Se permite compartir vértices o aristas, pero no superficies; las zonas deben permanecer dentro del área útil. Las zonas heredadas inválidas no se eliminan automáticamente.
- Fusionar zonas exige un contorno continuo sencillo; no se admiten uniones por un único vértice, zonas desconectadas ni polígonos con huecos.
- Las operaciones CAD no sustituyen la comprobación de muros y racks en el visor WebGL ni la persistencia remota en una instancia real de Cloudflare D1.

## Despliegue en Cloudflare Pages

- Framework: `None`
- Comando de compilación: `npm ci && npm run build`
- Directorio de salida: `public`
- Mantener el binding D1 `DB` y el `wrangler.toml` existentes. No es necesario crear otra base SQL.

## Pruebas

`npm run check` valida la compilación, el código frontend, las pruebas heredadas V202–V210 y las nuevas pruebas geométricas, de zonas y de historial V211.

Se recomienda desplegar primero en Cloudflare Preview y probar la creación, edición, unión, eliminación, Undo/Redo, vista 3D y guardado/recuperación real antes de publicar en producción. Las pruebas automatizadas de Chromium no pudieron ejecutarse en este entorno por un bloqueo de navegación, y no se ha comprobado el guardado remoto D1.
