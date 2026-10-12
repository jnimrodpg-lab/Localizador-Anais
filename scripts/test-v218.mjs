import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const c={Math,Number,Array,Set,Map,JSON,appState:{layout:{walls:[],openings:[]}},findZoneById:()=>null,getScaleCmPerUnit:()=>1,ensureOpeningAttachmentOffsets:()=>{}};
c.findWallById=id=>c.appState.layout.walls.find(w=>w.id===id);
vm.createContext(c);
vm.runInContext(fs.readFileSync(new URL('../src/frontend/69-camera-cut-v218.js',import.meta.url),'utf8'),c);
const wall=(id,x1,y1,x2,y2)=>({id,x1,y1,x2,y2,thickness:16,height:290,placement:'inside'});
const perimeter=pts=>pts.map((p,i)=>wall('O'+i,p.x,p.y,pts[(i+1)%pts.length].x,pts[(i+1)%pts.length].y));
const boundary={pts:[{x:0,y:0},{x:600,y:0},{x:600,y:400},{x:0,y:400}]};
const interiors=[wall('I1',300,0,300,400),wall('I2',5,5,200,5)];
const walls=[...perimeter(boundary.pts),...interiors],saved=JSON.stringify(walls);
const ids=result=>Array.from(result.parts,w=>w.id).sort();
const cut=(view,items=walls,area=boundary,previous)=>c.v218VisibleWallParts(items,area,'diorama',view,previous);

for(const [view,expected] of [
 [{x:-1,y:1,z:1},['I1','I2','O0','O1']],
 [{x:1,y:1,z:1},['I1','I2','O0','O3']],
 [{x:1,y:1,z:-1},['I1','I2','O2','O3']],
 [{x:-1,y:1,z:-1},['I1','I2','O1','O2']]
]){
 assert.deepEqual(ids(cut(view)),expected,'Interior faces toward the camera, in each quadrant');
 assert.deepEqual(ids(cut(view,walls,{pts:[...boundary.pts].reverse()})),expected,'Area winding must not change the interior');
 assert.deepEqual(ids(cut(view,walls.map(w=>({...w,x1:w.x2,y1:w.y2,x2:w.x1,y2:w.y1})))),expected,'Wall endpoint order must not change the interior');
}
assert.equal(JSON.stringify(walls),saved,'Camera cuts preserve editable walls');
assert.deepEqual(ids(cut({x:.02,y:1,z:.08})),walls.map(w=>w.id).sort(),'Plan view retains the whole footprint');
assert.deepEqual(ids(cut({x:0,y:0,z:0})),walls.map(w=>w.id).sort());
assert.equal(cut({x:-100,y:100,z:100}).signature,cut({x:-1,y:1,z:1}).signature,'Orthographic visibility is independent of view distance');
assert.equal(c.v218VisibleWallParts(walls,boundary,'none').parts.length,0);
assert.equal(c.v218VisibleWallParts(walls,boundary,'full').parts.length,walls.length);
assert.deepEqual(ids(cut({x:1,y:1,z:1},walls,{pts:[]})),walls.map(w=>w.id).sort());
assert.deepEqual(ids(cut({x:1,y:1,z:1},walls,{pts:[{x:0,y:0},{x:10,y:0},{x:20,y:0}]})),walls.map(w=>w.id).sort(),'Degenerate area must not hide arbitrary walls');

const normal={x:1,z:0};
assert.equal(c.v218FaceVisible(normal,{x:-.01,y:1,z:1},true),true,'A visible wall stays visible near edge-on');
assert.equal(c.v218FaceVisible(normal,{x:.01,y:1,z:1},false),false,'A hidden wall stays hidden near edge-on');
assert.equal(c.v218FaceVisible(normal,{x:-.04,y:1,z:1},true),false);
assert.equal(c.v218FaceVisible(normal,{x:.04,y:1,z:1},false),true);
const previous=new Map(),result=cut({x:-1,y:1,z:1},walls,boundary,previous);
assert.equal(previous.size,0,'Visibility history is transient, with no mutation of the caller');
assert.equal(result.visibility.size,4);

const concave={pts:[{x:0,y:0},{x:900,y:0},{x:900,y:450},{x:650,y:450},{x:650,y:700},{x:0,y:700}]};
assert.deepEqual(ids(cut({x:-1,y:1,z:1},[...perimeter(concave.pts),...interiors],concave)),['I1','I2','O0','O1','O3'],'Concave returns use their local interior normal');
const mixed=wall('MIX',900,450,0,450),part=cut({x:-1,y:1,z:1},[mixed],concave).parts[0];
assert.equal(part.x1,650);assert.equal(part.x2,0);assert.equal(part.v217StartDistance,250);assert.equal(part.v217SourceLength,900);
assert.equal(cut({x:1,y:1,z:-1},[mixed],concave).parts[0],mixed,'The exterior portion returns when its interior face is visible');
const fragmented={pts:[{x:0,y:0},{x:200,y:0},{x:600,y:0},{x:600,y:400},{x:0,y:400}]};
assert.equal(cut({x:1,y:1,z:-1},[walls[0]],fragmented).parts.length,0,'Additional collinear area vertices leave no slivers');
const diagonal={pts:[{x:0,y:0},{x:500,y:0},{x:300,y:300}]},diag=wall('D',500,0,300,300);
assert.equal(cut({x:-1,y:1,z:-1},[diag],diagonal).parts.length,1);
assert.equal(cut({x:1,y:1,z:1},[diag],diagonal).parts.length,0,'Diagonal walls use their actual face normal');

// Exercise the same opening geometry used by 2D and the union meshes, with
// a window crossing the boundary between a hidden and a retained wall part.
const source=fs.readFileSync(new URL('../src/frontend/60-layout-editor.js',import.meta.url),'utf8');
const slice=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
vm.runInContext([
 slice('  function normalizeWallPlacement(value){','  function getZoneEdgeWall(zone, edgeIndex){'),
 slice('  function lineIntersection2D(a1, a2, b1, b2){','  function getZoneEdgeWallPolygon(zone, edgeIndex, wallData = null){'),
 slice('  function pointDist2D(a,b){','  function getZoneWallCornerClosurePolygons(zone){'),
 slice('  function wallLength(wall){','  function getWallOpeningNormal(wall){'),
 slice('  function getWallRawSlicePolygon(wall, t0=0, t1=1, inflate=1){','  function getOpeningFootprint(opening, wall=findWallById(opening?.wallId), inflate=1){'),
 slice('  function getOpeningFootprint(opening, wall=findWallById(opening?.wallId), inflate=1){','  function getOpeningPositionInfo(opening, wall=findWallById(opening?.wallId)){'),
 fs.readFileSync(new URL('../src/frontend/67-wall-union-v216.js',import.meta.url),'utf8')
].join('\n'),c);
c.appState.layout={walls:[...perimeter(concave.pts),mixed,...interiors],openings:[
 {id:'HIDDEN',wallId:'O4',type:'window',width:100,height:100,sill:90,offset:200,t:200/650},
 {id:'SPLIT',wallId:'MIX',type:'window',width:120,height:100,sill:90,offset:240,t:240/900},
 {id:'INNER',wallId:'I1',type:'door',width:80,height:210,sill:0,offset:160,t:.4}
]};
const model=JSON.stringify(c.appState.layout),parts=cut({x:-1,y:1,z:1},c.appState.layout.walls,concave).parts;
const voids=c.v216OpeningVoids(parts);
assert.equal(voids.length,2,'A hidden host must not leave an opening mask in the scene');
const xs=Array.from(voids[0].poly,p=>p.x);
assert.equal(Math.min(...xs),600);assert.equal(Math.max(...xs),650,'Opening mask is clipped to the retained portion');
assert(Math.abs(voids[0].y0-.9)<1e-9);assert(Math.abs(voids[0].y1-1.9)<1e-9);
assert.equal(c.v216OpeningVoids([]).length,0);
assert.equal(c.v216OpeningVoids().length,3,'The full 2D/3D opening path is retained');
assert.equal(JSON.stringify(c.appState.layout),model,'Cuts and openings preserve saved geometry');
console.log('V218 PASS: all four camera quadrants, inward normals, reversed winding/axes, interior partitions, concave/diagonal/mixed walls, orthographic scale independence, plan view, hysteresis, clipped opening masks and unchanged saved geometry.');
