import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/frontend/60-layout-editor.js',import.meta.url),'utf8');
const stateSrc=fs.readFileSync(new URL('../src/frontend/20-sheet-layout-state.js',import.meta.url),'utf8');
const begin=source.indexOf('  function distributionIsFreeMove(){');
const end=source.indexOf('  function v194RotateRack(',begin);
assert.ok(begin>=0&&end>begin,'Faltan helpers V205');
const zone={id:'Z1',pts:[{x:0,y:0},{x:100,y:0},{x:100,y:90},{x:0,y:90}]};
const target={id:'R1',zoneId:'Z1',x:10,y:10,w:90,h:55,baseHeight:0,rackHeight:120};
const appState={editor:{distributionFreeMove:true,distributionVertexSnap:true,snapEnabled:true,snapSize:2},layout:{zones:[zone],racks:[target],wallNodes:[]}};
const context={appState,Math,Number,Set,
 isSnapEnabled:()=>appState.editor.snapEnabled,getSnapSize:()=>appState.editor.snapSize,
 snapGrid:n=>appState.editor.snapEnabled?Math.round(n/2)*2:n,
 clearRackSnapPreview:()=>{appState.editor.snapPreview=null;},setRackSnapPreview:s=>{appState.editor.snapPreview=s;},
 rackCorners:r=>[{x:r.x,y:r.y},{x:r.x+r.w,y:r.y},{x:r.x+r.w,y:r.y+r.h},{x:r.x,y:r.y+r.h}],
 pointInPoly:(pt,z)=>pt.x>=0&&pt.x<=100&&pt.y>=0&&pt.y<=90,
 findZoneById:id=>appState.layout.zones.find(z=>z.id===id),
 nearestZoneForPoint:()=>zone,
 rackFullyInsideZone:(r,z)=>r.x>=0&&r.y>=0&&r.x+r.w<=100&&r.y+r.h<=90,
 vspaceStackIntersect:(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y,
};
vm.createContext(context);vm.runInContext(source.slice(begin,end),context);
const {distributionRackPlacement:place,distributionCanCommit:can,distributionRackInterference:warn,distributionIsFreeMove:isFree}=context;
assert.equal(isFree(),true);
const proposed=place(target,230,177,{ignoreSnap:true});
assert.equal(proposed.x,230);assert.equal(proposed.y,177);
assert.equal(can(proposed),true,'El modo libre no debe bloquear zonas pequeñas');
assert.match(warn(proposed),/fuera de la zona/);
appState.editor.distributionFreeMove=false;
assert.equal(can(proposed),false,'El modo estricto debe rechazar posiciones fuera de zona');
appState.editor.distributionFreeMove=true;
const snapping=place(target,4.8,5.1);
assert.equal(snapping.x,0,'Alinear X con vértice');
assert.equal(snapping.y,0,'Alinear Y con vértice');
appState.editor.distributionVertexSnap=false;
const gridOnly=place(target,4.8,5.1);
assert.equal(gridOnly.x,4);assert.equal(gridOnly.y,6);
appState.editor.snapEnabled=false;
const precise=place(target,4.8,5.1);
assert.equal(precise.x,4.8);assert.equal(precise.y,5.1);
assert.match(source,/if\(distributionIsFreeMove\(\)\)\{[\s\S]*?Posición conservada en modo libre/,'El drag no debe revertir en modo libre.');
assert.match(stateSrc,/preserveRackPlacement = isStructureLayoutScreen\(\) \|\|/,'La normalización no puede mover racks libres.');
assert.match(source,/id="v205FreeMove"/);assert.match(source,/id="v205VertexSnap"/);
assert.match(source,/recordHistorySnapshot\('distribution',d\.historyBefore\)/);
console.log('V205 OK: movimiento libre/estricto, snap a vértices, rejilla independiente, posición estable, undo.');
