# WMS Industrial V195 — Conjuntos apilados y niveles

## Nuevo módulo de apilamiento 2/3/2

Selecciona un rack en **Editar layout** (Estructura o Racks). En el inspector, busca **Apilamiento modular**. Introduce la cantidad de módulos por nivel desde abajo hacia arriba (por ejemplo, `2,3,2`), el ancho, profundidad, altura por nivel, separación, alineación y NPT base. Usa **Crear conjunto**.

- **Planta compacta:** dibuja los módulos superiores y un contorno de toda la huella, con el resumen `2 / 3 / 2`.
- **Ver niveles:** muestra los siete módulos individualmente, identificados como N1-A, N1-B, N2-A, N2-B, N2-C, N3-A y N3-B.
- **Inspector:** elevación frontal, selección individual de cada módulo, NPT por nivel, mover grupo con X/Y, actualizar configuración o separar módulos.
- **Movimiento directo:** `Alt + arrastrar` cualquiera de los módulos del conjunto. Un arrastre normal continúa moviendo solo el módulo seleccionado.
- **Diseñar espacio 3D:** cada módulo conserva su modelo, medidas, material y altura NPT. El inspector 3D también presenta el árbol del conjunto para cambiar de módulo y permite regresar al layout.

La validación diferencia intersecciones horizontales y verticales: dos módulos a distinta cota no colisionan si sus intervalos verticales son disjuntos. También se controla que el conjunto quepa dentro de la zona y que los módulos del mismo nivel no se solapen. Las posiciones y metadatos se guardan en el layout existente, sin migración SQL nueva.

**Nota constructiva:** una composición con el nivel medio sobresaliendo sobre el inferior puede requerir refuerzos o apoyos. El editor comprueba la geometría pero no certifica capacidad portante, estabilidad, cargas ni anclajes.

## Despliegue Cloudflare Pages
- Framework preset: `None`
- Comando: `npm ci && npm run build`
- Directorio: `public`
- Mantener `wrangler.toml` y el binding D1 **DB** existentes.

Ejecuta `npm run check` para comprobar compilación y sintaxis. La interacción de apilamiento, desplazamiento y navegación de 2D a 3D se verificó en Chromium. La visualización WebGL completa y la persistencia remota necesitan comprobarse en Cloudflare Preview. Three.js se empaqueta localmente tras `npm ci`.
