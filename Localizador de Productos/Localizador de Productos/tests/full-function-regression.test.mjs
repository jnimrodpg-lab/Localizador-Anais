import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const dir='src/frontend';
const manifest=JSON.parse(fs.readFileSync(`${dir}/manifest.json`,'utf8'));
const required=[
 '00-core-state.js','10-products-geometry.js','20-sheet-layout-state.js','30-admin-sync.js',
 '40-sheet-viewer-tools.js','50-viewer-3d.js','60-layout-editor.js','65-layout-pro-v117.js',
 '66-topology-v128.js','70-rack-editor.js','74-isometric-furniture.js',
 '75-virtual-space.js','80-auth-operations.js','90-bootstrap-compat.js'
];
assert.deepEqual(manifest.files,required,'No se pueden perder módulos avanzados del WMS');
const source=(name)=>fs.readFileSync(path.join(dir,name),'utf8');
assert.match(source('60-layout-editor.js'),/function renderLayoutEditor\s*\(/);
assert.match(source('75-virtual-space.js'),/data-vspace-mode="build"/);
assert.match(source('75-virtual-space.js'),/data-vspace-mode="place"/);
assert.match(source('75-virtual-space.js'),/data-vspace-mode="explore"/);
assert.match(source('70-rack-editor.js'),/function renderRackModels\s*\(/);
assert.match(source('74-isometric-furniture.js'),/kind==='cajonera'/);
assert.match(source('20-sheet-layout-state.js'),/Sheet/);
assert.match(fs.readFileSync('functions/api/[[path]].js','utf8'),/100000|100_000/);
const wrangler=fs.readFileSync('wrangler.toml','utf8');
assert.match(wrangler,/pages_build_output_dir\s*=\s*"public"/);
assert.match(wrangler,/binding\s*=\s*"DB"/);
assert.match(wrangler,/database_name\s*=\s*"wms-industrial-db"/);

const state={
 layout:{zones:[{id:'Z1',pts:[{x:0,y:0},{x:600,y:0},{x:600,y:480},{x:0,y:480}]}],racks:[
  {id:'R1',zoneId:'Z1',x:40,y:40,w:120,h:50,rot:0,virtual:{width:120,depth:50,height:200,levels:4,slots:2}}
 ]},models:[],products:[],auth:{role:'admin',loggedIn:true},ui:{}
};
const context={appState:state,escapeHtml:x=>x,getScaleCmPerUnit:()=>1,document:{getElementById:()=>null},showToast:()=>{},console};
vm.createContext(context);
vm.runInContext(source('75-virtual-space.js'),context);
const run=(js)=>vm.runInContext(js,context);
assert.equal(run('Object.keys(VSPACE_TYPES).length'),6);
assert.equal(run("vspaceFits({id:'R2',zoneId:'Z1',x:40,y:40,w:120,h:50,rot:90}).ok"),false,'Los giros no deben permitir intersecciones');
assert.equal(run("vspaceFits({id:'R2',zoneId:'Z1',x:530,y:460,w:120,h:50,rot:90}).ok"),false,'Rotación debe respetar zona');
assert.equal(run("vspaceFits({id:'R2',zoneId:'Z1',x:260,y:260,w:120,h:50,rot:90}).ok"),true,'Mueble rotado sin colisión válido');
assert.equal(run("vspaceFits({id:'R2',zoneId:'Z1',x:165,y:40,w:120,h:50,rot:0}).ok"),true,'Muebles separados no deben colisionar');
assert.equal(run("vspaceFits({id:'R2',zoneId:'Z1',x:110,y:40,w:120,h:50,rot:0}).ok"),false,'Muebles superpuestos deben colisionar');
console.log('OK V172: 14 módulos, flujo 2D/3D, biblioteca completa, auth, D1 y colisiones rotadas.');
