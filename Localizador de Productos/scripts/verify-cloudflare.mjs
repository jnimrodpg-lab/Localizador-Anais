import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=process.cwd();
const mustExist=['wrangler.toml','package.json','public/index.html','public/app/main.js',
  'public/app/data.js','public/app/scene.js','public/app/styles.css',
  'functions/api/[[path]].js','migrations/0001_init.sql','migrations/0002_products.sql'];
let errors=0;
for(const rel of mustExist){
  if(!existsSync(resolve(root,rel))){console.error('FALTA:',rel); errors++;}
}
if(existsSync('wrangler.toml')){
  const toml=readFileSync('wrangler.toml','utf8');
  if(!/^pages_build_output_dir\s*=\s*"public"/m.test(toml)){
    console.error('wrangler.toml debe tener pages_build_output_dir = "public"');errors++;
  }
  if(!/binding\s*=\s*"DB"/.test(toml)||!/database_name\s*=\s*"wms-industrial-db"/.test(toml)){
    console.error('Revisar binding D1: DB -> wms-industrial-db');errors++;
  }
}
if(errors){console.error(`${errors} problema(s) en el despliegue.`);process.exitCode=1;}
else console.log('OK: carpeta de Cloudflare Pages válida y configuración Wrangler / D1 conservada.');
