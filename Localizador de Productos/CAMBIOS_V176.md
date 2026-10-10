# Auditoría y reconstrucción V176

## Cambios implementados

1. **Layout CAD:** eliminado el bloque CSS dinámico `layoutV163Styles` que sobreescribía los temas después de cargar la página; barras y paneles reorganizados con Grid/Flex y scroll interno definido. La barra de zoom ya no ocupa todo el ancho. Las herramientas tienen scroll independiente.
2. **Cotas SVG:** mayor margen automático de encuadre; las cotas de racks solo se dibujan en la pantalla de distribución (no sobre el plano estructural). Las dimensiones generales quedan por fuera de la zona y las etiquetas usan menor grosor de contorno. Los tamaños de texto siguen siendo ajustables en un rango controlado.
3. **Secciones X/Y:** vistas horizontales con un SVG de 640 × 196, autoencuadre de elementos intersectados, selección de rack, estados vacíos legibles y visualización ampliada cuando el corte es muy estrecho. La vista ampliada es una representación gráfica y no debe interpretarse como plano físico a escala exacta.
4. **Google Sheets:** retirados los contenedores visuales anidados `branches-panel` / `branches-scroll` que generaban el marco oscuro; una tarjeta por sucursal, expansión según contenido, encabezados plegables y controles de mapeo consistentes.
5. **Visor de productos:** separado el scroll de búsqueda/ficha y la tabla; ficha compacta en Sheets, sin superposición con las filas y sin controles secundarios de navegación en la pantalla de mapeo. El visor específico de productos conserva sus botones.
6. **Sidebar:** navegación con estilos diferentes para `hover` y `active`, logo/texto con ancho reservado y distintivo de versión V176 visible.
7. **Purgado:** de 19 hojas CSS distribuidas en `public/assets/styles` a dos archivos fuente y un CSS generado. Se descartaron reportes visuales, pruebas obsoletas y capturas del paquete final. Se conservó la base histórica para evitar romper 3D y rack builder.
8. **Bundle y Cloudflare:** el build publica JavaScript/CSS actualizados, conserva Wrangler, Pages Functions, D1 y migraciones. El acceso «Ver en 3D» del editor CAD permanece eliminado. El módulo 3D independiente se mantiene.

## Comprobaciones efectuadas

- `npm run check`: compilación, integridad de bundle, detección de funciones duplicadas, autenticación y geometría de muebles/colisiones; finalizó correctamente.
- Chromium (sin servidor Cloudflare): revisión de layout, secciones y Sheets a **1440×900** y **390×844**; comprobación visual en tema claro y oscuro para escritorio. En las dimensiones observadas, las secciones X/Y quedan horizontales, el zoom es compacto y la ficha de productos no solapa la tabla.
- Archivo de salida `public/assets/app.css` se coteja con los dos fuentes CSS, y `public/assets/app-main.runtimefix.js` con los fragmentos JS originales.

## Pendiente de validar con datos reales

No se ha completado una prueba de extremo a extremo de **WebGL**, lectura/escritura real de **D1**, permisos de Cloudflare, lectura de **Google Sheets privados** ni escaneo QR en producción. El entorno local permite verificar estructura de interfaz, pero no garantiza estas integraciones. Probar la versión en **Pages Preview** antes de producción.
