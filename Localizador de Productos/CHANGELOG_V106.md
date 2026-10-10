# Changelog v106

## Crítico
- API consolidada en una sola implementación catch-all.
- `app-state` protegido por autenticación.
- Credenciales de producción retiradas del repositorio.
- Registro viewer corregido.

## Seguridad
- PBKDF2-SHA256 para contraseñas nuevas.
- Migración transparente de hashes SHA-256 heredados.
- Limpieza de datos privados de `localStorage` al cerrar sesión.
- Endpoints de lectura de Google Sheets limitados a administradores.
- Eliminación de metadatos `debug` en respuestas públicas.

## Estabilidad
- Arranque sin comprobación inválida de cookie HttpOnly.
- Menos reintentos y sin healthcheck incorrecto previo a sesión.
- Eliminada la carga duplicada de estado remoto.
- Borrado de sucursal limpia registros dependientes.

## Intencionalmente no incluido
- Migración de productos JSON a tabla D1 normalizada.
- Modularización del bundle frontend.
- Three.js local/render bajo demanda.

Estos puntos quedan para las siguientes versiones para no mezclar refactor profundo con la estabilización.
