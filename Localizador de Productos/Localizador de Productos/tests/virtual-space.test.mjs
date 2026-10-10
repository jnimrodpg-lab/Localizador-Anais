import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=fs.readFileSync(path.join(root,'src/frontend/75-virtual-space.js'),'utf8');
const state={
  layout:{zones:[{id:'Z1',pts:[{x:0,y:0},{x:600,y:0},{x:600,y:480},{x:0,y:480}]}],racks:[{id:'Z1-E1',zoneId:'Z1',x:30,y:20,w:120,h:55,modelId:'std_4',rackHeight:220,virtualType:'rack',virtual:{width:120,depth:55,height:220,levels:4,slots:2}}]},
  products:[{sku:'SKU1',nombre:'Producto A',rack:'Z1-E1',nivel:2,slot:1}],
  models:[{id:'std_4',width:120,depth:55,height:220,levels:4,slots:2}],
  auth:{role:'admin',loggedIn:true},ui:{},branchLayouts:{},
};
const ctx={appState:state,escapeHtml:x=>String(x),getScaleCmPerUnit:()=>1,
 persistActiveLayout:()=>{},document:{getElementById:()=>null},showToast:()=>{},console};
vm.createContext(ctx);
vm.runInContext(source,ctx);
const check=s=>vm.runInContext(s,ctx);
assert.equal(check('Object.keys(VSPACE_TYPES).length'),6);
assert.equal(check("vspaceSpec(appState.layout.racks[0]).levels"),4);
assert.equal(check("vspacePointInZone({x:100,y:100}, appState.layout.zones[0])"),true);
assert.equal(check("vspacePointInZone({x:750,y:100}, appState.layout.zones[0])"),false);
assert.equal(check("vspaceFits({id:'test',zoneId:'Z1',x:300,y:100,w:80,h:60}).ok"),true);
assert.equal(check("vspaceFits({id:'test',zoneId:'Z1',x:35,y:20,w:80,h:60}).ok"),false);
assert.equal(check("vspaceFits({id:'test',zoneId:'Z1',x:595,y:20,w:80,h:60}).ok"),false);
assert.equal(check("vspaceFindPosition({id:'test',zoneId:'Z1',x:0,y:0,w:80,h:60}) !== null"),true);
assert.equal(check("vspaceProductsForSlot(appState.layout.racks[0],2,1)[0].sku"),'SKU1');
check("vspaceAssign(appState.layout.racks[0],2,1,'SKU2',5)");
assert.equal(check("vspaceProductsForSlot(appState.layout.racks[0],2,1)[0].sku"),'SKU2');
assert.equal(check("vspaceProductsForSlot(appState.layout.racks[0],2,1)[0].quantity"),5);
check("vspaceAssign(appState.layout.racks[0],2,1,'')");
assert.equal(check("vspaceProductsForSlot(appState.layout.racks[0],2,1)[0].sku"),'SKU1');
check("vspaceAssign(appState.layout.racks[0],14,1,'UNSAFE')");
assert.equal(check("(appState.layout.racks[0].virtualPlacements||[]).length"),0);
console.log('OK: catálogo 3D, geometría de zonas, colisiones, búsqueda de posición y SKU por nivel/slot.');
