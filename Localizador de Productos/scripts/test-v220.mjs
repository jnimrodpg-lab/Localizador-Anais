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
 cut(geometry,'  function polygonBounds(pts=[]){','  function ensureStreetVisualDefaults(street){'),
 cut(geometry,'  function getStreetCornerStyle(){','  function unitsToCm(units){'),
 fs.readFileSync(new URL('../src/frontend/67-wall-union-v216.js',import.meta.url),'utf8'),
 fs.readFileSync(new URL('../src/frontend/69-camera-cut-v218.js',import.meta.url),'utf8'),
 fs.readFileSync(new URL('../src/frontend/69-total-area-v219.js',import.meta.url),'utf8'),
 fs.readFileSync(new URL('../src/frontend/69-streets-v220.js',import.meta.url),'utf8')
].join('\n'),c);
const rectangle=[{x:0,y:0},{x:1200,y:0},{x:1200,y:900},{x:0,y:900}],area=r=>r.reduce((s,p)=>s+c.v216SignedArea(p),0),inside=(p,r)=>r.reduce((s,ring)=>s+(c.v216Inside(p,ring)?Math.sign(c.v216SignedArea(ring)):0),0)>0;
const walls=pts=>pts.map((p,i)=>({id:'W'+i,x1:p.x,y1:p.y,x2:pts[(i+1)%pts.length].x,y2:pts[(i+1)%pts.length].y,thickness:12,height:290,placement:'inside',referenceOutwardSign:-1}));
const reset=(pts=rectangle)=>{c.appState.layout={walls:walls(pts),zones:[],openings:[],streets:[],meta:{siteBoundary:{id:'AREA-GENERAL',pts},scaleCmPerUnit:1,commercialAreaV209:true,defaultStreetCornerStyle:'right'}};c.v219SyncTotalArea();};
reset();assert.equal(c.v220Dims().totalWidth,1200,'Reference profile: 240 + 60 + 600 + 60 + 240 cm');
assert.equal(c.v220BuildStreetGeometry('top').side,'top','Native creation keeps the selected side even without opts.side');
const network=['top','left'].map((side,i)=>({id:'C'+i,side,roadWidth:600,sidewalkWidth:240,gutterWidth:60,roadType:'drain-covered',sidewalkType:'paver',cornerStyle:'right'}));
c.appState.layout.streets=network;c.v220RebuildStreetNetwork();const initial=JSON.stringify(c.appState.layout),scene=c.v220StreetScene();assert.equal(scene.intersections.length,1);const j=scene.intersections[0];
for(const [dx,dy] of [[0,0],[-600,0],[600,0],[0,-600],[0,600]])assert(inside({x:j.x+dx,y:j.y+dy},scene.roads),'Four open arms through a true crossing');
assert(Math.abs(area(scene.roads)-2772000)<1e-3,'Joined calzada has exactly one surface and no duplicated intersection area');
assert(inside({x:600,y:-930},scene.gutters));assert(!inside({x:600,y:-600},scene.gutters));assert(!inside({x:-600,y:500},scene.curbs),'Longitudinal curb never crosses the calzada');assert(!inside({x:j.x,y:j.y},scene.curbs),'No curb through the middle of the intersection');
assert(scene.crossings.length>=4);assert(!inside({x:j.x,y:j.y},scene.markings));assert.equal(JSON.stringify(c.appState.layout),initial,'Rendering preserves IDs, dimensions and manual commercial polygon');assert.equal(c.v220StreetScene(),scene,'Camera/UI changes reuse cached geometry');
assert(scene.grates.length>0);assert(scene.grates.every(p=>{const q=p.reduce((s,p)=>({x:s.x+p.x/4,y:s.y+p.y/4}),{x:0,y:0});return !inside(q,scene.roads);}),'Rejillas stay outside the calzada');
for(const style of ['round','diagonal']){c.appState.layout.streets.forEach(s=>s.cornerStyle=style);const view=c.v220StreetScene();assert(view.roads.flat().every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));assert(view.roads.flat().length>scene.roads.flat().length,'Edited corner style changes joined geometry');}
reset([{x:250,y:0},{x:1200,y:0},{x:1200,y:900},{x:0,y:900},{x:0,y:250}]);c.appState.layout.streets=network.map(s=>({...s}));c.appState.layout.streets[0].fitSidewalkToArea=true;c.v220RebuildStreetNetwork();const fitted=c.v220StreetScene();assert(fitted.walks.some(w=>inside({x:50,y:50},w.rings)),'Fit fills the chamfer setback outside the physical building');assert(!fitted.walks.some(w=>inside({x:500,y:500},w.rings)),'Fit never covers the building');
const selected=c.appState.layout.streets[0],manual=[{x:0,y:-240},{x:1200,y:-240},{x:1200,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}];assert(c.v220ValidPolygon(manual),'Concave veredas are allowed');assert(!c.v220ValidPolygon([{x:0,y:0},{x:100,y:100},{x:0,y:100},{x:100,y:0}]),'Self intersections are rejected');assert(c.v220StoreSidewalk(selected,'sidewalkPts',manual));c.v220RebuildStreetNetwork();assert.equal(c.appState.layout.streets[0].sidewalkPts.length,6);const saved=JSON.parse(JSON.stringify(c.appState.layout));c.appState.layout=saved;c.v220RebuildStreetNetwork();assert.equal(c.appState.layout.streets[0].sidewalkPts.length,6,'Inserted/concave vertices survive reload');
reset();c.appState.layout.streets=['top','bottom','left','right'].map((side,i)=>({...network[0],id:'C'+i,side}));c.v220RebuildStreetNetwork();const complete=c.v220StreetScene();assert.equal(complete.intersections.length,4);assert(complete.roads.some(p=>c.v216SignedArea(p)<0),'Closed road network preserves its central building hole');
const geo=c.v220StreetGeometry(THREE,complete.roads,p=>({x:p.x/100,z:p.y/100}),.02);assert([...geo.attributes.position.array].every(Number.isFinite));let volume=0;const pos=geo.attributes.position;for(let i=0;i<pos.count;i+=3){const a=new THREE.Vector3().fromBufferAttribute(pos,i),b=new THREE.Vector3().fromBufferAttribute(pos,i+1),d=new THREE.Vector3().fromBufferAttribute(pos,i+2);volume+=a.dot(b.cross(d))/6;}assert(Math.abs(Math.abs(volume)-area(complete.roads)/10000*.02)<1e-4,'Actual 3D geometry preserves road union area and holes');
console.log('V220 PASS: five physical bands, longitudinal curbs/drainage, four-way and four-corner intersections, zebra/centerline placement, rounded/diagonal corners, no duplicated asphalt, concave sidewalk editing, chamfer fill, building exclusion, saved vertices, cache and actual 3D mesh volume with a building hole.');
