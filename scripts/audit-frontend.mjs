import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const file = path.join(root, 'public/assets/app-main.runtimefix.js');
const source = fs.readFileSync(file, 'utf8');

const declarations = new Map();
for (const match of source.matchAll(/^  (?:async )?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)) {
  const name = match[1];
  declarations.set(name, (declarations.get(name) || 0) + 1);
}
const duplicateDeclarations = [...declarations].filter(([,count]) => count > 1);

const protectedOverrides = ['renderViewerProductInfoPanel', 'openProductLocationModal'];
const duplicateOverrides = [];
for (const name of protectedOverrides) {
  const count = [...source.matchAll(new RegExp(`^  ${name}\\s*=\\s*function\\s*\\(`, 'gm'))].length;
  if (count > 1) duplicateOverrides.push([name,count]);
}

if (duplicateDeclarations.length || duplicateOverrides.length) {
  console.error('Se detectaron overrides/redeclaraciones que deben consolidarse:');
  for (const [name,count] of duplicateDeclarations) console.error(`- function ${name}: ${count}`);
  for (const [name,count] of duplicateOverrides) console.error(`- ${name} = function: ${count}`);
  process.exit(1);
}

if (!source.startsWith('/* WMS_V148_VISUAL_FURNITURE_CAD */')) {
  console.error('Falta la marca de bundle v148.');
  process.exit(1);
}
console.log(`Auditoría frontend OK: ${declarations.size} funciones declaradas, sin overrides protegidos duplicados.`);
