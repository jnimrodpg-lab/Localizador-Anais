import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>readFileSync(path.join(root,p),'utf8');
const html=read('public/index.html'), css=read('src/styles/modern.css'), code=read('src/frontend/70-rack-editor.js');
assert.match(html,/<div class="menu-item" data-screen="rack-builder" data-admin-only="1"/);
assert.match(html,/Crear mobiliario 3D/);
assert.match(css,/fb-space-group/);
assert.match(code,/fbApplyHorizontal/);
assert.match(code,/fbApplyVertical/);
assert.match(code,/fbExportBom/);
assert.match(code,/rackConstructionOpen3D/);
const state={models:[],ui:{rackBuilder:{}},history:{racks:{undoStack:[{}]}},screen:'rack-builder',selectedModelId:'',layout:{zones:[],racks:[],meta:{scaleCmPerUnit:1}},auth:{loggedIn:true,role:'admin'}};
const env={appState:state,Math,console,document:{getElementById:()=>null},escapeHtml:s=>String(s).replaceAll('<','&lt;'),recordHistorySnapshot:()=>{},getScaleCmPerUnit:()=>1,saveRackModels:()=>{},showToast:()=>{},clone:o=>JSON.parse(JSON.stringify(o)),normalizeRackStyle:s=>s,saveRemoteAppState:async()=>{},contentWrap:{innerHTML:''},getSnapSize:()=>1};
vm.createContext(env);
vm.runInContext(code+'\nrenderRackConstructionWorkspace=()=>{};disposeRackFurniture3DEngine=()=>{};rackModel=id=>appState.models.find(m=>m.id===id)||null;',env);
const ev=s=>vm.runInContext(s,env);
for(const type of ['melamine-shelf','melamine-cabinet','metal-wood']){
 ev(`createFurnitureTemplate('${type}')`);
 const m=state.models[0];
 const check=ev('furnitureValidateModel(appState.models[0])');
 assert.deepEqual(Array.from(check.errors),[],`${type}: ${check.errors.join(', ')}`);
 assert.ok(ev('furniturePartsTable(appState.models[0])').includes('<table>'));
 assert.equal(ev('furniturePartsTable(appState.models[0])').split('data-bom-piece').length-1,m.furniture.pieces.length);
 if(type==='melamine-shelf'){
   ev('applyConstructionHorizontalSpaces(appState.models[0],4,true,[])');
   assert.equal(m.furniture.pieces.filter(p=>p.type==='shelf').length,3);
   assert.deepEqual(Array.from(ev('furnitureValidateModel(appState.models[0]).errors')),[]);
   ev('applyConstructionVerticalSpaces(appState.models[0],"all",3,false,[20,40,60])');
   assert.ok(m.furniture.pieces.some(p=>p.type==='divider'));
 }
}
// Broken pieces must block model placement.
state.models[0].furniture.pieces[0].x=-500;
assert.ok(ev('furnitureValidateModel(appState.models[0]).errors').length>0);
console.log('V189 OK: sidebar dedicado, tres plantillas, distribución paramétrica, despiece y validación 3D.');
