# WMS V171 · GitHub y Cloudflare Pages

**Repositorio observado en captura:** `jinimrodpg-lab/Localizador-Ana-s`  
**Carpeta del proyecto:** `Localizador de Productos`  
**Rama:** `main`

## 1. Qué subir a GitHub

Descomprime el ZIP de esta entrega. Copia el **contenido de la carpeta `Localizador de Productos`** a la carpeta existente de igual nombre en tu repositorio. No subas el ZIP sin extraerlo. Evita duplicar la carpeta (`Localizador de Productos/Localizador de Productos/`).

Dentro de la carpeta deben quedar `package.json`, `wrangler.toml`, `public/`, `functions/`, `migrations/`, `scripts/` y `tests/`.

## 2. Configuración Cloudflare Pages (con GitHub)

En el proyecto Pages vinculado a `jinimrodpg-lab/Localizador-Ana-s`, revisa **Settings → Builds & deployments** y configura:

| Opción | Valor |
|---|---|
| Production branch | `main` |
| Root directory (Build root) | `Localizador de Productos` |
| Framework preset | `None` |
| Build command | `npm run build` |
| Build output directory | `public` |
| Node version | 22, si tu plataforma permite configurarla |

La ruta `public` es relativa a `Localizador de Productos`, **no** a la raíz de todo el repositorio. No coloques `Localizador de Productos/public` como salida si ya estableciste esa carpeta como raíz de compilación.

## 3. D1 / SQL existente

El archivo `wrangler.toml` ha sido conservado con el binding `DB`, el nombre `wms-industrial-db` y el mismo `database_id` de V171. Comprueba en Pages → Settings → Bindings que la instancia D1 sea esa misma base en Production. También revisa Preview cuando sea necesario. Haz un respaldo antes de cambiar despliegues.

**No ejecutes migrations en la base existente** por el simple hecho de desplegar el frontend.

Consulta de solo lectura en D1 Console:

```sql
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
```

## 4. Comprobación local

Desde `Localizador de Productos`:

```bash
npm run verify:cloudflare
npm run check
npm run build
```

Una vez publicado, abre `https://TU-SITIO.pages.dev/api/healthz`; debe responder con JSON `ok: true` si el binding funciona y el esquema no presenta errores.

## Atención sobre la V171

**La V171 todavía NO sincroniza su nuevo frontend con D1.** El diseñador y los productos asignados se guardan en el navegador con `localStorage`. El binding D1 queda operativo para las Cloudflare Pages Functions originales, pero no se deben asumir sincronización real, autenticación en la nueva interfaz ni importación de Google Sheets. Esto requiere un desarrollo separado de integración de frontend/API.

Three.js se importa actualmente desde esm.sh; el navegador necesita acceso a esa dependencia para cargar el 3D. Este paquete no cambia ese comportamiento.

## Recuperación ante problemas

1. Si Pages dice `package.json not found`, verifica la raíz `Localizador de Productos`.
2. Si aparece un 404 para `app/main.js`, verifica `public` como salida y que los archivos estén dentro de `public/app`.
3. Si falla `/api/healthz`, revisa Functions, binding DB y base D1; ese endpoint intenta verificar el esquema.
4. Si el 3D no se carga, revisa la consola del navegador y la importación de Three.js.
5. Si funciona pero no ves tus datos anteriores, es esperable: **la nueva interfaz V171 usa datos locales de demostración, no los de tu D1**.
