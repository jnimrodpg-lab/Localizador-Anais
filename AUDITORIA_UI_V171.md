# Auditoría UI V171 · reporte de entrega

## Incidencias corregidas

| Área | Incidencia detectada | Corrección aplicada |
|---|---|---|
| Densidad | El 100% mostraba áreas muy estrechas para editores | Workspace a escala visual `.8`, con ancho compensado sin cortar el borde derecho |
| Administración | El resumen lateral restaba espacio a los formularios | Resumen integrado en métricas de portada y panel central expandido |
| Sucursales | La tarjeta abierta tenía un alto menor a su contenido real (acordeón recortado) | Retiro de alturas forzadas y scroll anidado; scroll desde el contenedor principal |
| Colores | Branding aplicaba directamente `--accent`, descoordinándolo de tema | Se mantiene el nombre/logo; se elimina la sobreescritura de colores y el bloque sin uso |
| Navegación | Iconos emoji heterogéneos; colapsar reemplazaba el HTML del icono | SVG con el mismo trazo y colapso con icono persistente |
| Estado | Indicador “Online” estático sin comprobación de conectividad | Retirado para no indicar un estado no verificado |
| Variantes | La vista previa usaba botones que no tenían evento de clic | Etiquetas no interactivas, manteniendo intactos los filtros/variantes reales |
| Texto y densidad | Ayudas repetidas y cabeceras extensas | Copy corto y jerarquía compacta |
| Móvil y tablet | Tarjetas, inspector y CAD se superponían o requerían desplazamiento lateral | Breakpoints para navegación, formularios, espacio de dibujo e inspector bajo el canvas |

## Verificaciones realizadas

- `npm run check`: correcto (bundle, declaraciones de funciones, tema CSS, reglas V171, geometría virtual/rack y auth).
- Preview Playwright: escritorio 1440×900, panel admin; móvil 390×844, panel admin y layout. Sin excepciones JS en las capturas puntuales.
- Estructura D1, migraciones, Pages Functions, manifest frontend, Wrangler conservados.

## Pendiente de validación en entorno conectado

Las conexiones reales a D1 / Google Sheets y el WebGL bajo autenticación Cloudflare no se probaron. El modo 3D local puede necesitar `npm ci` para incluir Three.js con el build o utilizar el CDN de respaldo. Verificar el Preview Cloudflare antes del despliegue definitivo.
