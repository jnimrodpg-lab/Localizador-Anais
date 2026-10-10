# WMS Industrial V191 — Rediseño del constructor y materiales

## Crear mobiliario 3D
- Nueva distribución: selección de plantillas, navegación por **5 pasos**, herramientas separadas por contexto, visor amplio y **panel de propiedades** con acordeones.
- **Vista frontal** como modo inicial para construir con clic y arrastre; botón **Vista 3D** para revisión orbitable.
- El zócalo y el fondo se configuran en un panel desplegable, sin tener que dibujar la cara trasera; se conservan sus parámetros y la elevación de la primera repisa.
- Los controles de dimensiones/material y de divisiones están en secciones independientes y siguen activos dentro de paneles cerrados.
- **Despiece, validación y niveles** plegables al pie para que no quiten altura al visor.
- Paneles responsivos: tres columnas grandes, dos a tamaño medio y una columna en pantallas estrechas; inspector con scroll propio en escritorio.
- Los botones de los cinco pasos llevan al panel funcional correspondiente; al cambiar valores, la apertura de los paneles se conserva.
- Vista frontal con fondo claro y materiales que reflejan acabado **blanco, roble, nogal o grafito**, o acero cuando corresponde.
- En el visor de creación, la selección usa un **contorno**, sin recolorear el material original de la pieza.
- El visor 3D del constructor se inicializa **bajo demanda** al entrar a la pestaña correspondiente; la vista frontal no requiere WebGL.

## Diseñar espacio 3D
- Se conserva la geometría paramétrica compartida por `modelId` de V188–V190.
- El contorno de selección de modelos personalizados es independiente de sus materiales; los modelos sin seleccionar mantienen su acabado.
- Acero no seleccionado con tono claro y neutro para diferenciarlo del fondo y los tableros de madera.

## Integración y estabilidad
- Se mantienen los componentes de Cloudflare Pages/Workers, Wrangler, D1, Sheets y la biblioteca de modelos.
- Se mantiene Undo/Redo y atajos del constructor; se comprobó en Chromium el ciclo **10 cm → 16 cm → Undo 10 cm → Redo 16 cm**.
- Verificados los pasos de zócalo y fondo, divisiones y revisión/despiece en navegador.
- Pruebas automatizadas: `npm run check` (auditoría, frontend, autenticación, arquitectura, racks y mobiliario).

## Limitaciones
- El ensayo en Chromium no pudo probar el render WebGL completo porque el módulo Three.js no está disponible localmente; en el despliegue Pages debe instalarse con `npm ci` y copiarse a `public/vendor` durante el build. Mantiene respaldo CDN.
- La selección, los materiales y el guardado remoto D1 se deben confirmar en un despliegue Preview con datos reales antes de actualizar producción.
