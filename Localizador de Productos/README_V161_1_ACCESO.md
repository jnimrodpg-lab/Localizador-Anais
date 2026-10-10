# WMS V161.1 — Corrección de inicio de sesión para Cloudflare

El runtime Cloudflare indicado en el error del usuario rechaza `PBKDF2` con más de 100 000 iteraciones. La V161 generaba hashes con 150 000. Esta actualización:

- Genera hashes nuevos con **100 000 iteraciones** de PBKDF2-SHA256 y sal aleatoria; **no** guarda contraseñas en texto plano.
- Verifica los hashes antiguos compatibles, incluidos `salt$sha256(salt:password)`, y los migra al inicio de sesión.
- Detecta registros `pbkdf2-sha256$150000$...` y devuelve una indicación de restablecimiento en lugar del error 500.
- **No altera contraseñas preexistentes de forma automática**, tampoco modifica inventario, sucursales, muebles ni layouts.

## Recuperar acceso si ya tienes un hash con 150 000 iteraciones

1. Respaldar la D1 productiva.
2. **Publicar primero esta versión V161.1** en el mismo proyecto Cloudflare Pages manteniendo la vinculación a D1. La V161 anterior intenta actualizar los hashes de 100 000 a 150 000 y rompería de nuevo el inicio de sesión.
3. En Cloudflare, abrir la **D1 vinculada como `DB`** a la app y ejecutar:

```sql
SELECT u.id, u.username, u.company_id, u.role, u.active,
       substr(u.password_hash, 1, instr(u.password_hash || '$', '$') - 1) AS tipo_hash
FROM users u ORDER BY u.id;
```

4. Utilizar la herramienta HTML de recuperación V161.1 **en tu equipo local**. Genera una sentencia SQL para actualizar únicamente la cuenta administradora elegida usando `PBKDF2-SHA256` de **100 000** iteraciones. No subir el HTML de recuperación al sitio público.
5. Ejecutar SQL en la consola D1 y entrar con la contraseña nueva. Si usas `admin123`, protege previamente la web con Cloudflare Access y cámbiala por una clave robusta antes de liberar producción.
6. Comprobar el inicio de sesión en la web ya actualizada. Comando de compilación: `npm run build` (Cloudflare instala dependencias mediante npm); directorio de salida `public`.

**No ejecute DROP, DELETE, nuevas migraciones de autenticación ni cambie D1 para este problema.**

## Comprobaciones

`npm run check` valida componentes originales, sintaxis y compatibilidad de hashes. La prueba de D1 en producción debe realizarla el operador autorizado.
