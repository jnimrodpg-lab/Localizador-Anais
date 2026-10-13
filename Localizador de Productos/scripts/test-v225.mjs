import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import * as THREE from 'three';

const copy=value=>JSON.parse(JSON.stringify(value));
const rect=(x,y,w,h)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
const stored=new Map();let snapshots=0;
const c={Math,Number,Array,Set,Map,WeakMap,JSON,Date,console,clone:copy,
  localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},
  document:{getElementById:()=>null},$:()=>null,$$:()=>[],escapeHtml:String,showToast:()=>{},
  appState:{models:[],products:[],branchLayouts:{},activeLayoutBranchIndex:0,history:{},screen:'test',
    layout:{zones:[],racks:[],walls:[],wallNodes:[],openings:[],rooms:[],streets:[],measurements:[],meta:{scaleCmPerUnit:1}},
    editor:{distributionFreeMove:true,snapEnabled:true,snapSize:2,distributionEdgeSnap:true,distributionVertexSnap:true,rackAlignClearanceCm:0},ui:{},auth:{loggedIn:true,role:'admin'}}};
vm.createContext(c);
for(const name of ['10-products-geometry.js','20-sheet-layout-state.js','60-layout-editor.js','65-layout-pro-v117.js','67-wall-union-v216.js','69-total-area-v219.js','70-rack-editor.js','71-furniture-sync-v222.js','73-spatial-consistency-v225.js','74-isometric-furniture.js','75-virtual-space.js']){
  vm.runInContext(fs.readFileSync(new URL('../src/frontend/'+name,import.meta.url),'utf8'),c,{filename:name});
}
const core=fs.readFileSync(new URL('../src/frontend/00-core-state.js',import.meta.url),'utf8');
vm.runInContext(core.slice(core.indexOf('  function getHistoryBucket('),core.indexOf('  function updateUndoRedoUi(')),c);
Object.assign(c,{ensureLayoutMeta:()=>{},normalizeLayoutSectionState:()=>{},ensureLayoutDecorations:()=>c.appState.layout,
  ensureOpeningAttachmentOffsets:()=>{},ensureBranchLayouts:()=>{},updateUndoRedoUi:()=>{},renderLayoutEditor:()=>{},
  markLayoutDirty:()=>{},getActiveLayoutBranchIndex:()=>0,saveBranchLayouts:()=>{stored.set('branches',JSON.stringify(c.appState.branchLayouts));return true;},
  isRackDistributionScreen:()=>c.appState.screen==='distribution',isStructureLayoutScreen:()=>c.appState.screen==='structure',isLayoutWorkspaceScreen:()=>false,
  clearRackSnapPreview:()=>{},setRackSnapPreview:()=>{},getSnapSize:()=>2,isSnapEnabled:()=>true,snapGrid:x=>x,
  defaultLayout:()=>copy(c.appState.layout)});
const model={id:'M1',name:'Módulo paneles',width:100,depth:40,height:90,levels:2,slots:2,style:'wood',furniture:{enabled:true,material:'wood',thickness:1.8,roofMode:'flat',leftHeight:90,rightHeight:90,pieces:[],backMode:'full'}};
c.appState.models=[model];c.furnitureGenerateFromModelSetup(model);
function rack(id,zoneId,x,y,rot=0,base=0){const f=c.getRackFootprint('M1',rot);return {id,zoneId,modelId:'M1',x,y,w:f.w,h:f.h,rot,baseHeight:base,rackHeight:90,virtualPlacements:[{sku:'SKU-01',level:1,slot:1}],name:'Mueble propio'};}
function reset(){const s=c.appState;s.history={};s.branchLayouts={};s.screen='distribution';s.layout={zones:[{id:'Z2',pts:rect(0,-200,400,500)},{id:'Z3',pts:rect(400,-200,400,500)}],racks:[],walls:[],wallNodes:[],openings:[],rooms:[],streets:[],measurements:[],meta:{scaleCmPerUnit:1}};s.editor.validationIssues=[];}
reset();let s=c.appState;
s.layout.racks=[rack('Z4-E5','Z2',100,50),rack('Z3-E5','Z3',550,50)];s.products=[{sku:'SKU-01',rack:'Z4-E5',rackStore:'Z4-E5',nivel:'N1',slot:'S1'}];
const products=JSON.stringify(s.products),placements=JSON.stringify(s.layout.racks[0].virtualPlacements);
c.v225SyncRackCodes();assert.equal(c.v222RackCode(s.layout.racks[0]),'Z2-E5');assert.equal(s.layout.racks[0].id,'Z4-E5');
const first=s.layout.racks[0],destination=s.layout.racks[1];c.recordHistorySnapshot('distribution');Object.assign(first,{x:420,y:-150,zoneId:'Z3'});c.persistActiveLayout('Mover a otra zona');
assert.equal(first.displayCode,'Z3-E6','A destination collision assigns a free number');assert.equal(destination.displayCode,'Z3-E5','Automatic moves do not swap another rack');
assert.equal(JSON.stringify(s.products),products);assert.equal(JSON.stringify(first.virtualPlacements),placements);
c.undoHistory('distribution');assert.equal(s.layout.racks[0].displayCode,'Z2-E5');assert.equal(s.layout.racks[0].x,100);
c.redoHistory('distribution');assert.equal(s.layout.racks[0].displayCode,'Z3-E6');assert.equal(s.layout.racks[0].x,420);
c.loadLayoutForBranch(0);assert.equal(c.v222RackCode(s.layout.racks[0]),'Z3-E6');assert.equal(s.layout.racks[0].id,'Z4-E5');assert.equal(s.layout.racks[0].name,'Mueble propio');
assert.equal(JSON.stringify(s.products),products);assert.equal(JSON.stringify(s.layout.racks[0].virtualPlacements),placements);
console.log('PASS V225 zone migration, collision without swapping, persistent numbering, stable product keys, undo/redo and branch reload');

reset();s.layout.racks=[rack('Z4-E1','Z2',40,50),rack('Z1-E2','Z2',190,50)];c.v225SyncRackCodes();
c.recordHistorySnapshot('distribution');s.layout.racks.forEach(r=>{r.x+=400;r.zoneId='Z3';});c.persistActiveLayout();
assert.deepEqual(s.layout.racks.map(r=>r.displayCode),['Z3-E1','Z3-E2']);
assert(c.v222RenameRack(s.layout.racks[0],'code','z3-e2'));assert.equal(c.v222CodeKey(s.layout.racks[0].displayCode),'Z3-E2');assert.equal(c.v222CodeKey(s.layout.racks[1].displayCode),'Z3-E1');
assert(c.v222RenameRack(s.layout.racks[0],'code','27'));assert.equal(s.layout.racks[0].displayCode,'Z3-E27');
assert(c.v222RenameRack(s.layout.racks[0],'code','Z2-CUSTOM-02'));assert.equal(s.layout.racks[0].displayCode,'Z3-CUSTOM-02');
const stableIds=s.layout.racks.map(r=>r.id);s.screen='structure';c.recordHistorySnapshot('structure');s.layout.zones[1].id='Z8';s.layout.racks.forEach(r=>r.zoneId='Z8');c.persistActiveLayout();assert.equal(s.layout.racks[0].displayCode,'Z8-CUSTOM-02');
c.undoHistory('structure');assert.equal(s.layout.racks[0].displayCode,'Z3-CUSTOM-02');assert.equal(s.layout.racks[1].displayCode,'Z3-E1');c.redoHistory('structure');assert.equal(s.layout.racks[1].displayCode,'Z8-E1');assert.deepEqual(s.layout.racks.map(r=>r.id),stableIds);
s.layout.racks.push(rack('Z2-E9','Z8',500,160));assert.notEqual(c.nextRackId('Z2'),'Z2-E9','Moved internal keys cannot be reused');
s.layout.zones[0].id='ALM';c.assignRackToZone(s.layout.racks[0],'ALM');assert.equal(s.layout.racks[0].id,stableIds[0]);
console.log('PASS V225 group moves, manual same-zone swap, custom suffix, zone renaming history, storage zone and globally unique internal IDs');

function wall(angle,placement,scale){
  const a=angle*Math.PI/180,ux=Math.cos(a),uy=Math.sin(a),nx=-uy,ny=ux;
  const w={id:'W1',x1:0,y1:0,x2:600/scale*ux,y2:600/scale*uy,thickness:20/scale,height:300/scale,placement,referenceOutwardSign:-1};
  return {w,ux,uy,nx,ny};
}
function pose(frame,scale,distanceCm,base=0){
  const {ux,uy,nx,ny,w}=frame,fp=c.getRackFootprint('M1',Math.atan2(uy,ux)*180/Math.PI),offset=c.getWallFaceOffsets(w).left;
  const cx=300/scale*ux+(offset+20/scale+distanceCm/scale)*nx,cy=300/scale*uy+(offset+20/scale+distanceCm/scale)*ny;
  const r=rack('CONTACT','Z2',cx-fp.w/2,cy-fp.h/2,Math.atan2(uy,ux)*180/Math.PI,base);return r;
}
for(const scale of [.5,1,2])for(const angle of [0,33.25,90,142.7])for(const placement of ['inside','center','outside']){
  reset();s.layout.meta.scaleCmPerUnit=scale;const frame=wall(angle,placement,scale);s.layout.walls=[frame.w];
  const touching=pose(frame,scale,0),separate=pose(frame,scale,3),intruding=pose(frame,scale,-1);
  assert.equal(c.v225RackWallHits(touching).length,0,`Contact ${scale}/${angle}/${placement}`);
  assert.equal(c.v225RackWallHits(separate).length,0,'Separated');assert(c.v225RackWallHits(intruding).includes('W1'),'1 cm penetration');
  assert.equal(c.v225RackWallHits({...intruding,baseHeight:300}).length,0,'Rack above wall');
  const snap=c.v225SnapRackWalls(separate);assert(snap,`Snap to actual face ${scale}/${angle}/${placement}`);assert.equal(c.v225RackWallHits(snap.rack).length,0);
  const physical=c.v225RackWorldSize(touching,.035,.020);assert(Math.abs(physical.w-100/scale*.035)<1e-9);assert(Math.abs(physical.d-40/scale*.035)<1e-9);
}
console.log('PASS V225 exact wall contact, gap, penetration, elevation and face snapping: 36 combinations of rotation, scale and placement');

reset();s.layout.zones=[{id:'Z2',pts:rect(-300,-300,1200,1000)}];s.layout.walls=[{id:'W1',x1:0,y1:0,x2:600,y2:0,thickness:20,height:300,placement:'center'}];
s.layout.openings=[{id:'O1',wallId:'W1',type:'free',width:150,height:210,sill:0,t:.5,offset:300}];
let r=rack('DOOR','Z2',250,-20);assert.equal(c.v225RackWallHits(r).length,0,'Furniture can occupy a clear opening');
r.baseHeight=150;assert(c.v225RackWallHits(r).includes('W1'),'Furniture reaches lintel');r.baseHeight=0;
s.layout.openings[0].sill=100;assert(c.v225RackWallHits(r).includes('W1'),'Window sill is solid');r.baseHeight=110;assert.equal(c.v225RackWallHits(r).length,0,'Furniture fully between sill and lintel');
r.x=200;assert(c.v225RackWallHits(r).includes('W1'),'Opening jamb is solid');
s.layout.openings=[];const contact=rack('CONTACT','Z2',250,10),inside=rack('INSIDE','Z2',250,9),high=rack('HIGH','Z2',250,0,0,300);
s.layout.racks=[contact];c.v225RefreshValidation();assert(!c.v117ConflictRackIds().has('CONTACT'));
s.layout.racks=[inside];c.v225RefreshValidation();assert(c.v117ConflictRackIds().has('INSIDE'));
s.layout.racks=[contact];c.v225RefreshValidation();assert(!c.v117ConflictRackIds().has('CONTACT'),'Moving clear immediately removes a stale red flag');
s.layout.racks=[contact,rack('NEAR','Z2',250,55)];c.v225RefreshValidation();assert(s.editor.validationIssues.some(i=>i.type==='aisle'));assert(!c.v117ConflictRackIds().has('CONTACT'),'Aisle warnings are not red collisions');
s.editor.distributionFreeMove=false;assert(!c.distributionCanCommit(inside));assert(c.distributionCanCommit(high));s.editor.distributionFreeMove=true;assert(c.distributionCanCommit(inside));assert(c.distributionRackInterference(inside).includes('W1'));
console.log('PASS V225 openings, sills, lintels, jambs, NPT, free/strict movement and immediate collision colors without red aisle warnings');

// Verify actual triangulated Three.js wall volume independently of CAD clipping.
const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),host=new THREE.Group(),bands=s.layout.walls.flatMap(w=>c.v225WallBandsFor(w)).map(b=>({...b,material}));
c.v216AddUnionMeshes(THREE,host,bands,p=>({x:p.x/100,z:p.y/100}),()=>{});host.updateMatrixWorld(true);
const ray=new THREE.Raycaster(),inside3D=(x,y,z)=>{ray.set(new THREE.Vector3(x,y,z),new THREE.Vector3(0,1,0));const hits=ray.intersectObjects(host.children,true).map(h=>h.distance).sort((a,b)=>a-b),unique=hits.filter((d,i)=>!i||Math.abs(d-hits[i-1])>1e-6);return unique.length%2===1;};
assert(inside3D(3,.45,.09),'Actual wall mesh contains the overlap');assert(!inside3D(3,.45,.101),'Actual wall mesh ends at the same contact face');assert(!inside3D(3,3.1,0),'Actual wall mesh has the declared physical height');
for(const r of [contact,inside,high]){const point={x:(r.x+r.w/2)/100,z:(r.y+.1)/100,y:(r.baseHeight+45)/100};assert.equal(c.v225RackWallHits(r).length>0,inside3D(point.x,point.y,point.z),'CAD collision matches the actual triangulated 3D volume');}
const slope=copy(model);slope.id='SLOPE';slope.furniture.roofMode='slope';slope.furniture.leftHeight=140;slope.furniture.rightHeight=90;slope.height=140;c.appState.models.push(slope);c.furnitureRefitModel(slope);
for(const item of c.v222FurnitureMeshes(slope)){const g=c.v222PieceGeometry(THREE,item,.01);assert([...g.attributes.position.array].every(Number.isFinite));g.dispose();}
console.log('V225 PASS: persistent zone codes and wall collisions match actual Three.js solids; no product, assignment or internal-ID changes.');
