# WMS Industrial V182 — Calles realistas y mobiliario urbano

## Mejoras aplicadas

### Layout / Editor 2D
- Nuevos presets de **tipo de calle**:
  - Calle con dos canales tapados
  - Calle sin canales
- Nuevos presets de **tipo de vereda**:
  - Vereda con adoquín
  - Vereda de concreto
- Nuevas acciones de **mobiliario urbano** para calles:
  - Banca
  - Macetero
  - Bolardo
  - Basurero
- El inspector de calles ahora permite cambiar calle/vereda y vaciar mobiliario.
- Se añadieron patrones visuales 2D para representar mejor las texturas.

### Vista Diseñar espacio 3D
- Se añadieron texturas urbanas procedurales para:
  - calles con canales tapados
  - calles sin canales
  - veredas de adoquín
  - veredas de concreto
- Se añadieron modelos 3D simples de mobiliario urbano:
  - banca
  - macetero
  - bolardo
  - basurero
- Mejora del diorama con contorno adicional para reforzar la base visual.

### Datos y sincronización
- Cada calle ahora guarda:
  - `roadType`
  - `sidewalkType`
  - `streetFurniture[]`
- La red de calles conserva esos estilos al reconstruirse.
- El mobiliario urbano se refleja tanto en 2D como en 3D.
