# WMS Industrial V168 — auditoría visual y técnica

## Objetivo

Homogeneizar los modos claro y oscuro con una única fuente de variables cromáticas; retirar reglas de tema antiguas; modularizar el CSS; verificar visualmente vistas y controles con zoom del navegador al **100 %**; y corregir recortes y desbordamientos.

## Cambios implementados

1. **Tokens y temas:** `public/assets/styles/tokens.css` establece superficies, bordes, títulos, textos secundarios, primarios y foco. Un mismo conjunto semántico se usa en claro y oscuro.
2. **Depuración:** se retiraron 139 reglas de tema legadas en las partes migradas (122 en `legacy-core.css`, 16 en `layout-cad.css`, 1 en `virtual-space.css`), además de cuatro bloques `:root` redundantes. Las funcionalidades anteriores se conservan; las reglas específicas de componentes que no son de tema permanecen en archivos legados.
3. **CSS modular:** `public/assets/app.css` importa los archivos de forma determinista: tokens, estilos históricos, layout, espacio virtual, dashboard, estilos semánticos y responsive. Los temas están en `theme-shell.css`, `theme-dashboard.css`, `theme-products.css` y `theme-editors.css`.
4. **Viewer:** columnas flexibles sin `grid-template-columns` fijado en línea desde JS; cinco filas reales del visor; reducción de la altura desproporcionada del buscador; tabla con fondo y texto correctos en ambos temas; ficha de ubicación sin tarjetas superpuestas.
5. **Dashboard:** tres tareas principales visibles; cuatro herramientas adicionales en un desplegable accesible; título, estadísticas y configuración con mejor jerarquía. No se han eliminado los accesos anteriores.
6. **Layout CAD:** se suprime el duplicado de botones de la cabecera para el editor de layout y se mantienen los controles en la barra del propio editor; barra adaptable y colores coherentes.
7. **Responsividad:** se corrigió el `box-sizing` de la raíz y del árbol de la aplicación, causante de 24 px de desbordamiento en la composición anterior. El contenido restante utiliza scroll interno cuando no cabe a 100 %.

## Verificación

- `npm run build`: frontend generado y sincronizado.
- `npm run check`: auditoría de funciones protegidas, pruebas existentes de geometría/mobiliario/autenticación y auditoría estática de CSS.
- `npm run test:visual-css`: comprueba las importaciones de módulos, la centralización del tema y contraste de los colores de texto/títulos contra superficies con mínimo WCAG AA (4.5:1 texto secundario y 7:1 títulos principales).
- `python tests/visual-smoke.py`: prueba optativa con Playwright y Chromium locales; utiliza solamente la simulación de sesión del proyecto en `about:blank`, sin iniciar sesión en tu Cloudflare. Captura **dashboard**, **visor de productos** y **layout** en claro/oscuro a 1366×768, 1440×900 y 1920×1080 con zoom 100 %; mide desbordamientos y errores JS.

## Qué no se comprobó en producción

- La autenticación con cuentas Cloudflare reales, la persistencia D1 o la sincronización de Google Sheets.
- La escena WebGL final de Three.js (el entorno de pruebas no contiene el paquete local; el build publicado necesita `npm ci` antes de `npm run build`).
- Cada operación de todas las herramientas CAD de versiones anteriores; las pruebas automatizadas existentes solo cubren los escenarios declarados.

## Despliegue y respaldo

Conserva tus vinculaciones de D1 y variables secretas de Cloudflare Pages. Crea una copia de seguridad antes de desplegar. El cambio es de interfaz; no ejecuta migraciones de base de datos.

Comandos previstos:

```bash
npm ci
npm run build
npm run check
```

Directorio publicado en Cloudflare Pages: `public`.

Si un problema aparece solamente en Cloudflare, inspecciona la pestaña Network y verifica que se cargan correctamente los doce archivos dentro de `/assets/styles/`.

### Resultados de la prueba de navegador

**18 de 18 combinaciones comprobadas**: dashboard, visor de productos y editor de layout; modo claro y oscuro; 1366×768, 1440×900 y 1920×1080, navegador a zoom 100 %. En las pruebas registradas: **0 errores JavaScript**, **0 píxeles de desbordamiento horizontal del documento** y **0 píxeles de desbordamiento horizontal de `#appRoot`**.

Pruebas de interacción adicional en la simulación local de administrador: cambio claro/oscuro, abrir más herramientas del dashboard, entrar al editor por tarjeta, ocultar/mostrar inspector, activar/salir de solo espacio y entrar al visor de productos. Resultado: **correcto**.

Estos resultados corresponden a una carga local de HTML, CSS y JS de la V168. No garantizan el mismo comportamiento con datos privados remotos o escenas WebGL cargadas desde producción.
