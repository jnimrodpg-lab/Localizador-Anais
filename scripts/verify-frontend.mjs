import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const srcRoot = path.join(root, 'src', 'frontend');
const manifest = JSON.parse(fs.readFileSync(path.join(srcRoot, 'manifest.json'), 'utf8'));
const expected = manifest.files.map(file => fs.readFileSync(path.join(srcRoot, file), 'utf8')).join('');
const outputPath = path.join(root, manifest.output);
const actual = fs.readFileSync(outputPath, 'utf8');
if (actual !== expected) {
  console.error('ERROR: el bundle publicado no coincide con src/frontend. Ejecuta npm run build:frontend.');
  process.exit(1);
}
const hash = crypto.createHash('sha256').update(actual).digest('hex');
console.log(`Bundle sincronizado (${actual.length.toLocaleString()} bytes, sha256 ${hash.slice(0,16)}...)`);
