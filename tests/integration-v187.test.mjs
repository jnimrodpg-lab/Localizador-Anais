import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=process.cwd();
const layout=fs.readFileSync(path.join(root,'src/frontend/60-layout-editor.js'),'utf8');
const vspace=fs.readFileSync(path.join(root,'src/frontend/75-virtual-space.js'),'utf8');
const index=fs.readFileSync(path.join(root,'public/index.html'),'utf8');
assert.match(index,/WMS V187 · CAD y 3D/);
for(const name of ['rpSiteAddVertex','rpSiteReset','data-site-vertex','rpZoneSplitVertical','rpZoneSplitHorizontal','rpUrbanTransform'])
  assert.ok(layout.includes(name),`Falta función CAD: ${name}`);
for(const name of ['data-vspace-panel="urban"','vsUrbanApply','vsUrbanAdd','vsUrbanApplyGroup','vsUrbanRemove','vsWallTranslate','intersectUrban','move-urban'])
  assert.ok(vspace.includes(name),`Falta construcción 3D: ${name}`);
const start=layout.indexOf('  function splitSelectedZoneByAxis(axis=');
const end=layout.indexOf('  function insertVertexOnSelectedEdge(){',start);
assert.ok(start>0 && end>start,'Falta motor de división de zonas');
const area=pts=>Math.abs(pts.reduce((acc,p,i)=>{const q=pts[(i+1)%pts.length];return acc+p.x*q.y-q.x*p.y;},0)/2);
const original={id:'Z1',name:'Zona 1',pts:[{x:0,y:0},{x:200,y:0},{x:200,y:120},{x:0,y:120}]};
let saved=0,rendered=0;
const context={
  appState:{selectedZoneId:'Z1',layout:{zones:[original],racks:[]}},
  findZoneById:id=>context.appState.layout.zones.find(z=>z.id===id),
  isRoomLinkedZone:()=>false,showToast:()=>{},zoneBoundsOf:z=>({minX:Math.min(...z.pts.map(p=>p.x)),maxX:Math.max(...z.pts.map(p=>p.x)),minY:Math.min(...z.pts.map(p=>p.y)),maxY:Math.max(...z.pts.map(p=>p.y))}),
  polygonAreaAbs:area,isValidStreetPolygon:poly=>area(poly)>0,
  rackFullyInsideZone:()=>true,nextZoneId:()=>`Z${context.appState.layout.zones.length+1}`,
  clone:v=>JSON.parse(JSON.stringify(v)),recordHistorySnapshot:()=>{},normalizeZoneAndRackIds:()=>{},
  persistActiveLayout:()=>saved++,renderLayoutEditor:()=>rendered++
};
const divide=vm.runInNewContext(`${layout.slice(start,end)}\n splitSelectedZoneByAxis`,context);
assert.equal(divide('x'),true,'No se pudo dividir en vertical');
assert.equal(context.appState.layout.zones.length,2);
assert.ok(Math.abs(area(context.appState.layout.zones[0].pts)-12000)<1e-7);
assert.ok(Math.abs(area(context.appState.layout.zones[1].pts)-12000)<1e-7);
assert.equal(saved,1);assert.equal(rendered,1);
context.appState.layout.zones=[JSON.parse(JSON.stringify(original))];
context.appState.layout.racks=[{id:'E1',zoneId:'Z1'}];
context.rackFullyInsideZone=()=>false;
assert.equal(divide('x'),false,'Una zona no debe cortar racks existentes');
assert.equal(context.appState.layout.zones.length,1,'La división rechazada alteró el layout');
console.log('V187: edición de área, división con validación, urbanismo 3D y sincronización del bundle OK.');
