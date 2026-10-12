import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import * as THREE from 'three';
const editor=fs.readFileSync(new URL('../src/frontend/60-layout-editor.js',import.meta.url),'utf8'),geometry=fs.readFileSync(new URL('../src/frontend/10-products-geometry.js',import.meta.url),'utf8');
const cut=(s,a,b)=>s.slice(s.indexOf(a),s.indexOf(b,s.indexOf(a)));
const c={Math,Number,Array,Set,Map,WeakMap,JSON,appState:{layout:{walls:[],openings:[],zones:[],streets:[],meta:{}}},findZoneById:()=>null,fitSiteBoundaryToZones:()=>false,showToast:()=>{},ensureStreetVisualDefaults:s=>s,applyStreetVertexOffsets:(_,g)=>g,ensureOpeningAttachmentOffsets:()=>{}};
c.findWallById=id=>c.appState.layout.walls.find(w=>w.id===id);c.getScaleCmPerUnit=()=>c.appState.layout.meta.scaleCmPerUnit||1;vm.createContext(c);
vm.runInContext([
 cut(editor,'  function normalizeWallPlacement(value){','  function getZoneEdgeWall(zone, edgeIndex){'),
 cut(editor,'  function lineIntersection2D(a1, a2, b1, b2){','  function getZoneEdgeWallPolygon(zone, edgeIndex, wallData = null){'),
 cut(editor,'  function pointDist2D(a,b){','  function getZoneWallCornerClosurePolygons(zone){'),
 cut(editor,'  function wallLength(wall){','  function getWallOpeningNormal(wall){'),
 cut(editor,'  function getWallRawSlicePolygon(wall, t0=0, t1=1, inflate=1){','  function getOpeningFootprint(opening, wall=findWallById(opening?.wallId), inflate=1){'),
 cut(editor,'  function getOpeningFootprint(opening, wall=findWallById(opening?.wallId), inflate=1){','  function getOpeningPositionInfo(opening, wall=findWallById(opening?.wallId)){'),
 cut(editor,'  function convexHull2D(points){','  function getManualWallNodeJointPolygons(){'),
 cut(geometry,'  function ensureLayoutMeta(){','  function nextStreetId(layout=appState.layout){'),
 cut(geometry,'  function nextStreetId(layout=appState.layout){','  const FLOOR_FINISHES'),
 cut(geometry,'  function getStreetCornerStyle(){','  function unitsToCm(units){'),
 fs.readFileSync(new URL('../src/frontend/67-wall-union-v216.js',import.meta.url),'utf8'),
 fs.readFileSync(new URL('../src/frontend/69-camera-cut-v218.js',import.meta.url),'utf8'),
 fs.readFileSync(new URL('../src/frontend/69-total-area-v219.js',import.meta.url),'utf8')
].join('\n'),c);
const rect=(w=500,h=400)=>[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}];
const wallsFor=(pts,placement='outside')=>pts.map((p,i)=>({id:'W'+i,x1:p.x,y1:p.y,x2:pts[(i+1)%pts.length].x,y2:pts[(i+1)%pts.length].y,thickness:20,height:290,referenceOutwardSign:-1,placement}));
const make=(pts=rect(),placement='outside')=>({walls:wallsFor(pts,placement),wallNodes:[],openings:[],zones:[],streets:[],meta:{siteBoundary:{id:'AREA-GENERAL',name:'Comercial manual',pts},scaleCmPerUnit:1,commercialAreaV209:true,autoFitBoundaryToZones:false}});
const area=b=>b.contours.reduce((s,p)=>s+c.v216SignedArea(p),0),bounds=()=>c.v219UrbanBounds();
for(const [placement,expected,min] of [['outside',237600,-20],['center',218400,-10],['inside',200000,0]]){
 c.appState.layout=make(rect(),placement);const original=JSON.stringify(c.appState.layout),total=c.v219ComputeTotalArea(c.appState.layout);
 assert(Math.abs(area(total)-expected)<1e-5,placement+' gross area includes exactly the wall footprint');assert.equal(JSON.stringify(c.appState.layout),original,'Computation preserves the manual model');
 c.v219SyncTotalArea();assert.equal(bounds().minX,min);assert.equal(bounds().minY,min);assert.equal(c.appState.layout.meta.totalBoundary.id,'AREA-TOTAL');
 assert.equal(c.v219SyncTotalArea(),c.v219SyncTotalArea(),'Unchanged geometry reuses the derived footprint');
}
c.appState.layout=make();c.appState.layout.walls=[];assert.equal(c.v219SyncTotalArea(),null);assert(!c.v219CanCreateUrbanism());assert.equal(c.addStreetFromPoint({x:0,y:-100}),null);assert.equal(c.appState.layout.streets.length,0,'Urbanism cannot be created before walls');
c.appState.layout.walls=wallsFor(rect());c.ensureLayoutMeta();const commercial=JSON.stringify(c.appState.layout.meta.siteBoundary);assert(c.v219CanCreateUrbanism());
const street=c.addStreetFromPoint({x:100,y:-100},{side:'top',sidewalkWidth:42,roadWidth:92});assert.equal(Math.max(...street.sidewalkPts.map(p=>p.y)),-20,'Vereda begins outside the wall thickness');
c.appState.layout.streets[0].name='Conservar nombre';c.appState.layout.streets[0].streetFurniture=[{id:'OBJ-1',type:'bench'}];
c.appState.layout.walls.forEach(w=>w.thickness=40);c.ensureLayoutMeta();assert.equal(bounds().minY,-40);assert.equal(Math.max(...c.appState.layout.streets[0].sidewalkPts.map(p=>p.y)),-40,'Existing urbanism follows thickness edits');assert.equal(c.appState.layout.streets[0].id,street.id);assert.equal(c.appState.layout.streets[0].name,'Conservar nombre');assert.equal(c.appState.layout.streets[0].streetFurniture[0].id,'OBJ-1');assert.equal(JSON.stringify(c.appState.layout.meta.siteBoundary),commercial,'Total area never replaces the commercial polygon');
c.appState.layout.walls.forEach(w=>w.thickness=20);c.ensureLayoutMeta();assert.equal(bounds().minY,-20,'Restoring geometry recalculates the footprint');
const reload=JSON.parse(JSON.stringify(c.appState.layout));reload.meta.totalBoundary.pts=[{x:999,y:999}];c.appState.layout=reload;c.ensureLayoutMeta();assert.equal(bounds().minX,-20,'Reload rebuilds a stale derived footprint');
c.appState.layout.walls=[];c.ensureLayoutMeta();assert.equal(c.appState.layout.meta.totalBoundary,undefined);assert.equal(c.appState.layout.streets.length,1,'Removing the last wall preserves existing streets');
const concave=[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:300,y:300},{x:300,y:500},{x:0,y:500}];c.appState.layout=make(concave);const total=c.v219SyncTotalArea();assert(!total.contours.some(p=>c.v216Inside({x:400,y:400},p)),'Concave corners stay concave');
c.appState.layout.walls.push({id:'DETACHED',x1:900,y1:0,x2:1100,y2:0,thickness:20,height:290,placement:'center'});assert.equal(c.v219SyncTotalArea().contours.length,2);assert.equal(bounds().maxX,1100,'Every physical wall is included without inventing a filled connector');

const plan=make(rect(),'inside');plan.walls.push({id:'INNER',x1:250,y1:0,x2:250,y2:400,thickness:20,height:290,placement:'center'});c.appState.layout=plan;
const saved=JSON.stringify(plan),view={x:-1,y:1,z:1},result=c.v219CutWallParts(plan.walls,plan.meta.siteBoundary,'diorama',view),lows=Array.from(result.parts).filter(w=>w.v219Cutaway);
assert.deepEqual(lows.map(w=>w.id).sort(),['W2','W3']);assert.deepEqual(Array.from(result.fullParts,w=>w.id).sort(),['INNER','W0','W1']);assert.equal(result.parts.length,plan.walls.length,'Every wall has a visible body or a plinth');
for(const scale of [1,.5,2])assert(lows.every(w=>c.v219WallRenderHeight(w,scale)===.2),'Plinth is physically 20 cm regardless of plan scale');
assert.equal(c.v219CutWallParts(plan.walls,plan.meta.siteBoundary,'none').parts.length,0);assert(c.v219CutWallParts(plan.walls,plan.meta.siteBoundary,'full').parts.every(w=>!w.v219Cutaway));assert.equal(c.v219CutWallParts(plan.walls,plan.meta.siteBoundary,'diorama',{x:0,y:1,z:.04}).parts.filter(w=>w.v219Cutaway).length,0,'Plan preset keeps full walls');assert.equal(JSON.stringify(plan),saved,'Diorama does not change saved wall heights');
plan.openings=[{id:'LOW-DOOR',wallId:'W2',type:'door',width:90,height:210,sill:0,t:.5,offset:250},{id:'HIDDEN-WINDOW',wallId:'W3',type:'window',width:100,height:100,sill:90,t:.5,offset:200}];
const voids=c.v216OpeningVoids(result.parts);assert.equal(voids.length,1,'Windows above the plinth leave no ghost opening');assert.equal(voids[0].y0,0);assert.equal(voids[0].y1,.2,'Door retains its walk-through opening in the plinth');
// Actual union volume verifies that the door remains open through the low body.
const host=new THREE.Group(),material=new THREE.MeshBasicMaterial(),low=lows.find(w=>w.id==='W2');
c.v216AddUnionMeshes(THREE,host,[{poly:c.getWallRawSlicePolygon(low).poly,y0:0,y1:.2,wallId:low.id,material,cutaway:true}],p=>({x:p.x/100,z:p.y/100}),()=>{},{walls:[low]});
let volume=0;for(const mesh of host.children){const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),d=new THREE.Vector3().fromBufferAttribute(p,i+2);volume+=a.dot(b.cross(d))/6;}assert(mesh.userData.wallParts.every(p=>p.cutaway));}
assert(Math.abs(Math.abs(volume)-(5-.9)*.2*.2)<1e-6,'20 cm plinth volume subtracts the doorway');
console.log('V219 PASS: gross footprints for inside/center/outside placement, concavity, disconnected walls, cached updates/reload, urbanism gating and offsets, preserved commercial area/street IDs, fixed 20 cm plinths, view modes, clipped openings and actual door/plinth union volume.');
