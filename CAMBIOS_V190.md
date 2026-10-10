# WMS Industrial V190 — Constructor de mobiliario mejorado

## Funcionalidades implementadas

- Sidebar **Crear mobiliario 3D** preservado.
- **Zócalo estructural** (melamina): activación, altura (4–30 cm), retranqueo (0–20 cm), pieza 3D real y base elevada. El primer nivel útil empieza encima de la base elevada; no aparece un nivel falso bajo el zócalo.
- **Fondo posterior paramétrico**: ninguno, completo o por compartimento. Controles de espesor, retranqueo y generación automática de piezas reales. El botón Fondo del panel lateral coloca el fondo completo directamente, sin apuntar a la cara trasera.
- Distribución horizontal y cálculo de espacios útiles ajustados a la base elevada.
- Cambios de dimensiones generales regeneran las piezas relacionadas, respetando las reglas geométricas existentes.
- **Undo/Redo** conectado en el constructor, con snapshot antes de cada cambio significativo y sin snapshots duplicados por eventos sin cambios. Atajos Ctrl/Cmd+Z, Ctrl/Cmd+Y, Ctrl/Cmd+Shift+Z fuera de campos de texto.
- Al arrastrar una repisa o división se registra historial solo cuando hay desplazamiento efectivo.
- Se conservan las piezas 3D vinculadas al modelo para que se rendericen en Diseñar espacio 3D y las instancias colocadas mantengan sus referencias `modelId`.
- CSS responsive para los bloques de zócalo/fondo, usando la paleta clara/oscura actual.

## Pruebas realizadas

- `npm run check`: auditoría y tests anteriores, más `test:furniture-v190`.
- Chromium (navegador real): nueva plantilla, altura de zócalo 10→15, Undo 15→10, Redo 10→15, fondo completo, modular, ninguno, sin errores JavaScript.
- `npm run test:furniture-v190`: geometría de zócalo y fondo real, altura útil, plantillas, divisiones, historial.

## Consideraciones

- Las vistas WebGL requieren Three.js. En este entorno el paquete no pudo instalarse desde npm; Cloudflare Pages debe ejecutar `npm ci && npm run build` para incluir una copia local.
- Las pruebas en el navegador se hicieron sin descargar Three.js, por lo que no sustituyen una revisión visual del 3D real en Cloudflare Preview.
- La geometría se guarda por piezas y se comparte con el constructor y el visor de espacio 3D. La ingeniería mecánica, resistencia de materiales y fabricación real requieren validación adicional.
- No se modificaron las migraciones de D1 ni `wrangler.toml`.
