# WMS Industrial V206 — Distribución y arquitectura vinculadas

## Novedades

### Alinear un mueble automáticamente
1. Abre **Editar layout → Distribución** y selecciona el rack.
2. En el inspector, busca **Alineación angular** y define una **separación del muro en cm** (predeterminado 2 cm).
3. Pulsa **Alinear con muro/arista** y haz clic sobre el muro o borde del plano que marcará la dirección. El mueble gira en paralelo y se sitúa junto a ese segmento, respetando su espesor y la separación elegida.
4. Alternativamente, pulsa **Alinear entre 2 vértices** y selecciona dos puntos: determinan la dirección de alineación.
5. **Esc** cancela cualquiera de estas herramientas. Los controles de **Movimiento libre**, snap a rejilla y snap a vértices permanecen independientes.

En movimiento estricto se rechazan las alineaciones con colisiones o que salen de la zona. En movimiento libre la posición puede mantenerse y el editor avisa de las interferencias; la validez estructural debe revisarse antes del uso real.

### Mover área principal con todo su contenido
1. En **Editar layout → Arquitectura**, abre **Área general · perímetro editable**.
2. Activa **Mover área + muros** y arrastra dentro del área; el plano se desplaza como un solo conjunto.
3. Otra alternativa es definir **Área X / Área Y (cm)** y pulsar **Aplicar X / Y del área**.
4. Se trasladan los vértices del área, zonas, nodos y segmentos de muros, racks, cotas independientes, calles y mobiliario urbano, sin cambiar los identificadores ni el NPT.
5. Usa los botones **Deshacer traslado / Rehacer traslado** para el historial del layout completo, o Ctrl+Z mientras el modo de movimiento esté activo. Desactiva **Mover área + muros** para volver a seleccionar piezas individualmente.

### Convertir una zona en área
- En **Arquitectura**, selecciona la zona y pulsa **Convertir esta zona en área principal**.
- Su contorno pasa a ser el perímetro del área general. Se conserva la zona y sus referencias de racks/productos para evitar pérdidas de datos.
- Si otras zonas quedan fuera del nuevo perímetro, el editor lo advierte para que puedas reorganizarlas. El WMS sigue teniendo **un área general por layout**, no varios edificios independientes.

## Conservado

Constructor de mobiliario 3D, apilamientos, NPT, Biblioteca, Urbanismo, cotas asociativas, muros y empalmes, selección por niveles, Cloudflare Pages/Functions, Wrangler, binding D1 `DB` y migraciones SQL actuales. No se cambia el esquema SQL.

## Pruebas

- `npm run check`: compila, verifica archivos generados y ejecuta pruebas heredadas y regresión V206.
- Chromium local: selección de rack y herramienta de alineación a muro, alineación diagonal 45°, cambio de coordenadas del área, arrastre del área, desplazamiento conjunto de muros/nodos/racks, deshacer, y conversión de zona en área, sin excepciones JavaScript.
- No se ha probado el render WebGL completo ni D1 remoto desde este entorno.

## Despliegue Cloudflare Pages

- **Framework**: None
- **Build command**: `npm ci && npm run build`
- **Output directory**: `public`
- Conserva el binding D1 existente. No crees otra base.

**Importante:** Three.js requiere `npm ci`. Si no está presente en el entorno de compilación de Cloudflare, el build falla en lugar de publicar un visor 3D roto. Comprueba WebGL y persistencia en Cloudflare Preview antes de reemplazar producción.
