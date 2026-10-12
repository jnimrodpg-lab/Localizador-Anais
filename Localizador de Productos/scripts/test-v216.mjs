import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import * as THREE from 'three';
const source=fs.readFileSync(new URL('../src/frontend/60-layout-editor.js',import.meta.url),'utf8');const cut=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b,source.indexOf(a)));
const ctx={Math,Number,Array,Set,Map,JSON,appState:{layout:{walls:[]}},findZoneById:()=>null};vm.createContext(ctx);
vm.runInContext([cut('  function normalizeWallPlacement(value){','  function getZoneEdgeWall(zone, edgeIndex){'),cut('  function lineIntersection2D(a1, a2, b1, b2){','  function getZoneEdgeWallPolygon(zone, edgeIndex, wallData = null){'),cut('  function pointDist2D(a,b){','  function getZoneWallCornerClosurePolygons(zone){'),cut('  function wallLength(wall){','  function openingClampT(wall, width, t){'),cut('  function getWallRawSlicePolygon(wall, t0=0, t1=1, inflate=1){','  function getOpeningFootprint(opening, wall=findWallById(opening?.wallId), inflate=1){'),cut('  function convexHull2D(points){','  function getManualWallNodeJointPolygons(){'),fs.readFileSync(new URL('../src/frontend/67-wall-union-v216.js',import.meta.url),'utf8')].join('\n'),ctx);
const rect=(x,y,w,h)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}],area=rings=>rings.reduce((sum,r)=>sum+ctx.v216SignedArea(r),0);
for(const [name,polys,expected,rings] of [
 ['partial overlap',[rect(0,0,10,10),rect(5,0,10,10)],150,1],['duplicate',[rect(0,0,10,10),rect(0,0,10,10).reverse()],100,1],['contained',[rect(0,0,10,10),rect(2,2,3,3)],100,1],['point touch',[rect(0,0,10,10),rect(10,10,10,10)],200,2],['edge touch',[rect(0,0,10,10),rect(10,0,10,10)],200,1],['hole',[rect(0,0,100,10),rect(90,0,10,100),rect(0,90,100,10),rect(0,0,10,100)],3600,2],['T',[rect(0,40,100,20),rect(40,0,20,50)],2800,1]]){
 const result=ctx.v216Union(polys);assert(Math.abs(area(result)-expected)<1e-5,name);assert.equal(result.length,rings,name);assert(result.flat().every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));console.log('PASS union '+name);
}
const walls=[{id:'W1',x1:0,y1:0,x2:600,y2:0,thickness:80,placement:'inside',height:290},{id:'W2',x1:0,y1:0,x2:0,y2:-35,thickness:80,placement:'inside',height:290},{id:'W3',x1:0,y1:-35,x2:40,y2:-35,thickness:80,placement:'inside',height:290},{id:'W4',x1:40,y1:-35,x2:40,y2:-400,thickness:80,placement:'inside',height:290}];ctx.appState.layout.walls=walls;
for(const w of walls){const s=ctx.getWallSlicePolygon(w);assert(s.poly.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));assert(ctx.v216SignedArea(s.poly)>0,'No inverted short wall');}
assert(ctx.getWallSlicePolygon(walls[1]).miterLimited);const solids=[...walls.map(w=>ctx.getWallSlicePolygon(w).poly),...ctx.v216JointPieces().map(j=>j.poly)];const rings=ctx.v216Union(solids);assert.equal(rings.length,1);assert(area(rings)>0);assert.equal(JSON.stringify(ctx.appState.layout.walls),JSON.stringify(walls),'Union does not mutate editable IDs or axes');
// Check the actual prism mesh volume, with an open center and a high lintel.
const host=new THREE.Group(),mat=new THREE.MeshBasicMaterial(),frame=[rect(0,0,100,10),rect(90,0,10,100),rect(0,90,100,10),rect(0,0,10,100)];
const bands=frame.map((poly,i)=>({poly,y0:0,y1:2,wallId:'W'+i,material:mat}));bands.push({poly:rect(0,0,100,10),y0:2,y1:3,wallId:'W0',material:mat});ctx.v216AddUnionMeshes(THREE,host,bands,p=>({x:p.x/100,z:p.y/100}),()=>{});
let volume=0;host.children.forEach(mesh=>{const p=mesh.geometry.attributes.position;for(let i=0;i<p.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(p,i),b=new THREE.Vector3().fromBufferAttribute(p,i+1),c=new THREE.Vector3().fromBufferAttribute(p,i+2);volume+=a.dot(b.cross(c))/6;}assert(mesh.userData.wallUnion);});assert(Math.abs(Math.abs(volume)-.82)<1e-5,'Triangulated union volume preserves the central hole and height changes');
// Door jambs do not inherit another endpoint's bevel.
const doorSlice=ctx.getWallSlicePolygon(walls[0],.3,.6).poly,plain=ctx.getWallRawSlicePolygon(walls[0],.3,.6).poly;assert.equal(JSON.stringify(doorSlice),JSON.stringify(plain));
console.log('V216 PASS: overlap union, duplicates, containment, point/edge contacts, holes, T joins, screenshot-like short jog, safe slices, stable wall IDs and actual 3D volume with holes/heights.');

// Different finishes must retain their materials without duplicated volume.
const varied=new THREE.Group(),red=new THREE.MeshBasicMaterial({color:0xff0000}),blue=new THREE.MeshBasicMaterial({color:0x0000ff});ctx.v216AddUnionMeshes(THREE,varied,[{poly:rect(0,0,100,20),y0:0,y1:2,wallId:'A',material:red},{poly:rect(50,0,100,20),y0:0,y1:2,wallId:'B',material:blue}],p=>({x:p.x/100,z:p.y/100}),()=>{});assert.equal(varied.children.length,2);assert(varied.children.some(m=>m.material===red)&&varied.children.some(m=>m.material===blue));
assert(Math.abs(area(ctx.v216Union([rect(0,0,100,20)],[rect(30,-10,40,40)]))-1200)<1e-5,'Global door void subtracts overlap');
// Deterministic randomized arrangements; a rotated input has identical union area.
let seed=216;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/2**32;};
for(let n=0;n<35;n++){const polys=Array.from({length:10},()=>rect(Math.floor(random()*20),Math.floor(random()*20),1+Math.floor(random()*10),1+Math.floor(random()*10)));let expected=0;for(let x=0;x<30;x++)for(let y=0;y<30;y++)if(polys.some(p=>ctx.v216Inside({x:x+.5,y:y+.5},p)))expected++;
 const result=ctx.v216Union(polys);assert(Math.abs(area(result)-expected)<1e-5,'Random union area '+n);
 const rotated=polys.map(poly=>poly.map(p=>({x:10000+(p.x-p.y)/Math.sqrt(2),y:-5000+(p.x+p.y)/Math.sqrt(2)})));assert(Math.abs(area(ctx.v216Union(rotated))-expected)<1e-4,'Rotated union '+n);
}
console.log('PASS different materials, global opening void, 35 random arrangements and translated/rotated invariance');
