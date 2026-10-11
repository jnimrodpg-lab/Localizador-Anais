import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/frontend/60-layout-editor.js',import.meta.url),'utf8');
const start=source.indexOf('  function v206AlignRackToSegment(');
const end=source.indexOf('  function bindLayoutRightPanel(',start);
assert.ok(start>=0&&end>start,'Motor angular no localizado');
const zone={id:'Z1',pts:[{x:-400,y:-400},{x:600,y:-400},{x:600,y:600},{x:-400,y:600}]};
const rack={id:'R1',modelId:'M1',zoneId:'Z1',x:80,y:70,w:120,h:40,rot:0};
const layout={racks:[rack],zones:[zone],wallNodes:[],walls:[],measurements:[],streets:[],meta:{siteBoundary:{pts:[]}}};
const state={layout,selectedRackLayoutId:'R1',selectedZoneId:'Z1',editor:{distributionFreeMove:true,rackAlignClearanceCm:13.5,rackAlignTargetId:'R1'}};
const snapshots=[];let renders=0,persists=0;let toast='';
const normalizeAngle=(x)=>((Number(x)%360)+360)%360;
const shortestAngleDelta=(x,y)=>((normalizeAngle(x)-normalizeAngle(y)+540)%360)-180;
const fp=(id,angle)=>{const rad=angle*Math.PI/180,c=Math.abs(Math.cos(rad)),s=Math.abs(Math.sin(rad));return {baseW:120,baseH:40,w:Math.max(40,Math.round(120*c+40*s)),h:Math.max(40,Math.round(120*s+40*c))};};
const context={Math,Number,Map,Set,appState:state,clone:v=>JSON.parse(JSON.stringify(v)),normalizeAngle,shortestAngleDelta,
findRackById:id=>layout.racks.find(r=>r.id===id),findZoneById:id=>layout.zones.find(z=>z.id===id),
pointInPoly:()=>true,pointNearPolygonEdge:()=>false,getScaleCmPerUnit:()=>1,
getRackFootprint:fp,distributionCanCommit:()=>true,distributionRackInterference:()=>'',distributionHostForRack:()=>zone,
recordHistorySnapshot:(bucket)=>snapshots.push({bucket,geometry:{...rack}}),persistActiveLayout:()=>persists++,renderLayoutEditor:()=>renders++,showToast:(v)=>toast=v,
ensureLayoutMeta:()=>{},syncManualWallsFromNodes:()=>{},rebuildStreetNetwork:()=>{},formatDistanceCm:n=>`${n} cm`};
vm.createContext(context);
vm.runInContext(source.slice(start,end),context);
assert.equal(context.v194RotateRack(rack,37.5),true,'Debe admitir giro decimal');
assert.equal(rack.rot,37.5);assert.equal(snapshots.length,1,'Una sola operación Undo');
assert.equal(snapshots[0].bucket,'distribution');
const beforeAlign={...rack};
const angle=27.35*Math.PI/180;
const a={x:12,y:14}, b={x:12+200*Math.cos(angle),y:14+200*Math.sin(angle)};
assert.equal(context.v206AlignRackToSegment(a,b,'muro inclinado'),true);
assert.ok(Math.abs(shortestAngleDelta(rack.rot,27.35))<1e-7,`Ángulo final: ${rack.rot}`);
assert.equal(snapshots.length,2,'La alineación es un solo Undo');
assert.equal(state.editor.rackAlignLast.rackId,'R1');
const center=()=>({x:rack.x+rack.w/2,y:rack.y+rack.h/2});
const signedDistance=()=>{const c=center(),nx=-Math.sin(angle),ny=Math.cos(angle);return (c.x-a.x)*nx+(c.y-a.y)*ny;};
const side=Math.sign(signedDistance());
assert.ok(Math.abs(Math.abs(signedDistance())-(20+13.5))<1e-6,'Separación geométrica exacta respecto al muro');
state.editor.rackAlignClearanceCm=24.25;
assert.equal(context.v206AlignRackToSegment(state.editor.rackAlignLast.a,state.editor.rackAlignLast.b,state.editor.rackAlignLast.reference),true);
assert.ok(Math.abs(Math.abs(signedDistance())-(20+24.25))<1e-6,'Separation adjustable without reselecting');
assert.equal(snapshots.length,3);
assert.equal(Math.sign(signedDistance()),side,'Se mantiene el lado del muro');
assert.equal(context.v194RotateRack(rack,384.5),true);
assert.ok(Math.abs(rack.rot-24.5)<1e-7,'Ángulo se normaliza a 0..360');
assert.equal(snapshots.length,4);
assert.equal(context.v194RotateRack(rack,24.5),true);
assert.equal(snapshots.length,4,'No generar historial para giros nulos');
const orig={...rack};
context.distributionCanCommit=()=>false;
assert.equal(context.v194RotateRack(rack,32.4),false);
assert.deepEqual({...rack},orig,'Giro inválido no muta rack');
assert.equal(snapshots.length,4);
assert.equal(context.v206AlignRackToSegment(a,b,'muro'),false);
assert.deepEqual({...rack},orig,'Alineación inválida no muta rack');
assert.equal(snapshots.length,4);
assert.match(source,/id="v208RackAngle"[^>]*step="0\.1"/);
assert.match(source,/id="v208ReapplyParallel"/);
assert.match(source,/layoutBoundaryPts.*forEach\(vertex\)/);
console.log(`V208 OK: decimales, grados arbitrarios, offset perpendicular exacto, historial atómico, validación y referencias (${renders} renders, ${persists} guardados).`);
