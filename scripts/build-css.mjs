import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files=['src/styles/base.css','src/styles/modern.css'];
const css=files.map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n\n');
const out=path.join(root,'public/assets/app.css');
fs.writeFileSync(out,css+'\n','utf8');
console.log(`CSS V176 consolidado: ${files.join(' + ')} → ${path.relative(root,out)} (${css.length} caracteres)`);
