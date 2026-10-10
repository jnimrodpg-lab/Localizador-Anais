# WMS Industrial V196 — Muebles apilables en 3D

## Nuevo módulo de apilamiento 2/3/2

Selecciona un rack en **Editar layout** (Estructura o Racks). En el inspector, busca **Apilamiento modular**. Introduce la cantidad de módulos por nivel desde abajo hacia arriba (por ejemplo, `2,3,2`), el ancho, profundidad, altura por nivel, separación, alineación y NPT base. Usa **Crear conjunto**.

- **Planta compacta:** dibuja los módulos superiores y un contorno de toda la huella, con el resumen `2 / 3 / 2`.
- **Ver niveles:** muestra los siete módulos individualmente, identificados como N1-A, N1-B, N2-A, N2-B, N2-C, N3-A y N3-B.
- **Inspector:** elevación frontal, selección individual de cada módulo, NPT por nivel, mover grupo con X/Y, actualizar configuración o separar módulos.
- **Movimiento directo:** `Alt + arrastrar` cualquiera de los módulos del conjunto. Un arrastre normal continúa moviendo solo el módulo seleccionado.
- **Diseñar espacio 3D:** cada módulo conserva su modelo, medidas, material y altura NPT. El inspector 3D también presenta el árbol del conjunto para cambiar de módulo y permite regresar al layout.

La validación diferencia intersecciones horizontales y verticales: dos módulos a distinta cota no colisionan si sus intervalos verticales son disjuntos. También se controla que el conjunto quepa dentro de la zona y que los módulos del mismo nivel no se solapen. Las posiciones y metadatos se guardan en el layout existente, sin migración SQL nueva.

**Nota constructiva:** una composición con el nivel medio sobresaliendo sobre el inferior puede requerir refuerzos o apoyos. El editor comprueba la geometría pero no certifica capacidad portante, estabilidad, cargas ni anclajes.

## Interacción «Colocar encima» en Diseñar espacio 3D

1. Selecciona el mueble que deseas elevar haciendo clic sobre él en la escena o en **Muebles ubicados**.
2. Pulsa **Colocar encima** en la barra superior o en el inspector del mueble.
3. Haz clic en el mueble inferior **soporte** en la vista 3D (o selecciónalo en la lista lateral si está oculto detrás del modelo).
4. El mueble superior se centra automáticamente en la base del inferior. El nuevo **NPT** es NPT del soporte + altura real del soporte, en centímetros.
5. Si hay colisiones, falta de espacio o el mueble sobresale del soporte, aparece un mensaje y no se modifica ninguna pieza. Puedes elegir otro soporte o cancelar con **Esc** o **Cancelar**.
6. Los módulos superiores quedan vinculados por `stackedOnId`, sin perder su modelo, SKU, materiales ni piezas. Mover el mueble inferior desde **Diseñar espacio 3D** mueve con él sus módulos apoyados. Para mover un módulo superior independientemente, utiliza **Desvincular soporte**.
7. Usa **Guardar en nube** para sincronizar los datos con la sucursal y Cloudflare D1.

Esta función valida ajuste geométrico y colisiones, pero **no certifica resistencia estructural, estabilidad o cargas máximas**. Se conserva la opción anterior de conjuntos con distintas cantidades de módulos por nivel (p. ej., 2/3/2).

## Despliegue Cloudflare Pages
- Framework preset: `None`
- Comando: `npm ci && npm run build`
- Directorio: `public`
- Mantener `wrangler.toml` y el binding D1 **DB** existentes.

Ejecuta `npm run check` para comprobar compilación y sintaxis. La interacción de apilamiento, desplazamiento y navegación de 2D a 3D se verificó en Chromium. La visualización WebGL completa y la persistencia remota necesitan comprobarse en Cloudflare Preview. Three.js se empaqueta localmente tras `npm ci`.
