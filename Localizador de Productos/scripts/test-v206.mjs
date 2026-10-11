import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/frontend/60-layout-editor.js',import.meta.url),'utf8');
const begin=source.indexOf('  function v206AlignRackToSegment(');
const end=source.indexOf('  function v194RotateRack(',begin);
assert.ok(begin>=0&&end>begin,'Falta motor de alineación y traslado V206');
const zone={id:'Z1',name:'Zona 1',pts:[{x:0,y:0},{x:300,y:0},{x:300,y:200},{x:0,y:200}]};
const rack={id:'Z1-E1',zoneId:'Z1',modelId:'M',x:60,y:60,w:80,h:40,rot:0};
const layout={meta:{autoFitBoundaryToZones:false,siteBoundary:{pts:[{x:-10,y:-10},{x:310,y:-10},{x:310,y:210},{x:-10,y:210}]}},zones:[zone],racks:[rack],wallNodes:[{id:'N1',x:0,y:0},{id:'N2',x:300,y:0}],walls:[{id:'W1',x1:0,y1:0,x2:300,y2:0,startNodeId:'N1',endNodeId:'N2'}],streets:[],measurements:[]};
const appState={layout,editor:{distributionFreeMove:true,rackAlignClearanceCm:4,rackAlignTargetId:rack.id},selectedRackLayoutId:rack.id,selectedZoneId:zone.id};
const context={appState,Math,Number,Map,Set,clone:x=>JSON.parse(JSON.stringify(x)),findRackById:id=>layout.racks.find(r=>r.id===id),findZoneById:id=>layout.zones.find(z=>z.id===id),
  pointInPoly:()=>true,pointNearPolygonEdge:()=>false,getScaleCmPerUnit:()=>1,normalizeAngle:a=>((a%360)+360)%360,
  shortestAngleDelta:(a,b)=>((a-b+540)%360)-180,getRackFootprint:(id,angle)=>{const a=angle*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));return {baseW:80,baseH:40,w:80*c+40*s,h:80*s+40*c};},
  distributionCanCommit:()=>true,distributionRackInterference:()=>'',distributionHostForRack:()=>zone,recordHistorySnapshot:()=>{},persistActiveLayout:()=>{},renderLayoutEditor:()=>{},showToast:()=>{},
  ensureLayoutMeta:()=>{},syncManualWallsFromNodes:()=>{},rebuildStreetNetwork:()=>{},formatDistanceCm:n=>`${n} cm`};
vm.createContext(context);vm.runInContext(source.slice(begin,end),context);
assert.equal(context.v206AlignRackToSegment({x:0,y:0},{x:100,y:100},'diagonal'),true);
assert.ok([45,225].some(a=>Math.abs(rack.rot-a)<.01));
const orig=JSON.parse(JSON.stringify(layout));
context.v206TranslateAreaSnapshot(orig,15,20);
assert.equal(zone.pts[0].x,15);assert.equal(rack.x-orig.racks[0].x,15);
assert.equal(layout.wallNodes[0].y,20);assert.equal(layout.walls[0].x1,15);
assert.equal(layout.meta.siteBoundary.pts[0].x,5);
console.log('V206 OK: diagonal, dirección del muro y traslado de área con muros, nodos y racks.');
