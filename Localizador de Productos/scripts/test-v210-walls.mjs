import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/frontend/60-layout-editor.js',import.meta.url),'utf8');
const slice=(a,b)=>{const start=source.indexOf(a),end=source.indexOf(b,start);assert.ok(start>=0&&end>start,`Missing ${a}`);return source.slice(start,end);};
// Evaluate only the wall geometry kernel, with the real geometry functions.
const pieces=[
 slice('  function normalizeWallPlacement(value){','  function getZoneEdgeWall(zone, edgeIndex){'),
 slice('  function lineIntersection2D(a1, a2, b1, b2){','  function getZoneEdgeWallPolygon(zone, edgeIndex, wallData = null){'),
 slice('  function pointDist2D(a,b){','  function getZoneWallCornerClosurePolygons(zone){'),
 slice('  function wallLength(wall){','  function openingClampT(wall, width, t){'),
 slice('  function getWallRawSlicePolygon(wall, t0=0, t1=1, inflate=1){','  function getOpeningFootprint(opening, wall=findWallById(opening?.wallId), inflate=1){')
];
const context={Math,Number,Array,Set,Map,appState:{layout:{walls:[]}},findZoneById:()=>null,normalizeWallPlacement:undefined,getWallSideSign:undefined};
vm.createContext(context);vm.runInContext(pieces.join('\n'),context);
// The first slice already defines normalizeWallPlacement / getWallFaceOffsets.
const pointDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function runCase(name,wall1,wall2){
  context.appState.layout.walls=[wall1,wall2];
  const p=context.getWallSlicePolygon(wall1,0,1,1).poly;
  const q=context.getWallSlicePolygon(wall2,0,1,1).poly;
  const frame1=context.wallEndpointFaceFrame(wall1,wall1.x1===0&&wall1.y1===0);
  const frame2=context.wallEndpointFaceFrame(wall2,wall2.x1===0&&wall2.y1===0);
  const first=context.getWallSlicePolygon(wall1,0,1,1).poly;
  const second=context.getWallSlicePolygon(wall2,0,1,1).poly;
  assert.ok(first.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)),name+' first face finite');
  assert.ok(second.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)),name+' second face finite');
  // Outgoing rays at the shared origin: left meets opposite right and vice versa.
  const miterPairs=[
    [first[frame1.leftIndex],second[frame2.rightIndex]],
    [first[frame1.rightIndex],second[frame2.leftIndex]]
  ];
  for(const [u,v] of miterPairs) assert.ok(pointDistance(u,v)<.0001,`${name}: faces not joined: ${JSON.stringify(u)}, ${JSON.stringify(v)}`);
  const raw=context.getWallRawSlicePolygon(wall1,0,1,1).poly;
  assert.equal(p.length,4);
  assert.ok(first.some((v,i)=>pointDistance(v,raw[i])>.001),name+' should actually trim or extend');
  console.log('✓',name);
}
// All segments radiate from (0,0), use different orientations and placements.
let id=0;
function wall(x,y,placement='center',reverse=false,t=12){
  return {id:'W'+(++id),x1:reverse?x:0,y1:reverse?y:0,x2:reverse?0:x,y2:reverse?0:y,placement,thickness:t,height:290};
}
for(const placement of ['center','inside','outside']){
  runCase('L 90° '+placement,wall(0,120,placement),wall(120,0,placement));
  runCase('diagonal 45° '+placement,wall(0,120,placement),wall(120,-120,placement));
  runCase('end/start 45° '+placement,wall(0,120,placement,true),wall(120,-120,placement));
  runCase('end/end 45° '+placement,wall(0,120,placement,true),wall(120,-120,placement,true));
}
// Doors: only outer ends are mitered, opening bands retain a square jamb.
const a=wall(0,100,'center');const b=wall(100,-100,'center');context.appState.layout.walls=[a,b];
const near=context.getWallSlicePolygon(a,0,.3,1).poly;
const remote=context.getWallSlicePolygon(a,.3,.6,1).poly;
const normal=context.getWallRawSlicePolygon(a,.3,.6,1).poly;
assert.ok(remote.every((v,i)=>pointDistance(v,normal[i])<.0001),'opening interior cut should remain square');
assert.ok(near.some((v,i)=>pointDistance(v,context.getWallRawSlicePolygon(a,0,.3,1).poly[i])>.001),'wall at node should be mitered even with openings');
console.log('✓ wall band openings');
// More than two wall connections: junction polygons remain enabled, no unsafe miters.
const c=wall(-100,-100,'center');context.appState.layout.walls=[a,b,c];
const joint=context.getWallSlicePolygon(a,0,1,1).poly;
const plain=context.getWallRawSlicePolygon(a,0,1,1).poly;
assert.ok(joint.every((v,i)=>pointDistance(v,plain[i])<.0001),'T junction should rely on dedicated bounded hub');
console.log('✓ T junction fallback');
for(const file of ['50-viewer-3d.js','75-virtual-space.js']){
 const txt=fs.readFileSync(new URL('../src/frontend/'+file,import.meta.url),'utf8');
 if(txt.includes('v225WallBandsFor(')){
   const shared=fs.readFileSync(new URL('../src/frontend/73-spatial-consistency-v225.js',import.meta.url),'utf8');
   assert.match(shared,/getWallSlicePolygon\(/,'The shared band builder must use the CAD footprint');
 }else assert.match(txt,/getWallSlicePolygon\(/,`${file} must share the same footprint`);
}
console.log('V210: CAD paired-face miters, all placement modes, orientation reversals, doors and T junctions OK.');
