import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const srcRoot = path.join(root, 'src', 'frontend');
const manifest = JSON.parse(fs.readFileSync(path.join(srcRoot, 'manifest.json'), 'utf8'));
const output = path.join(root, manifest.output);

const threeCandidates = [
  path.join(root, 'node_modules', 'three', 'build', 'three.module.min.js'),
  path.join(root, 'node_modules', 'three', 'build', 'three.module.js')
];
const threeSource = threeCandidates.find(candidate => fs.existsSync(candidate));
const threeTarget = path.join(root, 'public', 'vendor', 'three.module.js');
if (threeSource) {
  fs.mkdirSync(path.dirname(threeTarget), { recursive: true });
  fs.copyFileSync(threeSource, threeTarget);
  console.log('Three.js r160 incorporado al despliegue desde npm.');
} else if (!fs.existsSync(threeTarget)) {
  const message = 'No se encontró Three.js local. Instala dependencias con npm ci antes de compilar (Cloudflare Pages: npm ci && npm run build).';
  if (process.env.CF_PAGES === '1' || process.env.WMS_REQUIRE_LOCAL_THREE === '1') {
    throw new Error(message + ' Se canceló el despliegue para evitar un visor 3D roto.');
  }
  console.warn('AVISO:', message, 'El entorno de pruebas podrá utilizar el respaldo CDN.');
}
const source = manifest.files.map(file => fs.readFileSync(path.join(srcRoot, file), 'utf8')).join('');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, source, 'utf8');
const hash = crypto.createHash('sha256').update(source).digest('hex');
console.log(`Frontend v${manifest.version}: ${manifest.files.length} fragmentos -> ${manifest.output}`);
console.log(`SHA-256 ${hash}`);
