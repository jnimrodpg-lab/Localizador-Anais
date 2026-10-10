import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=fs.readFileSync(path.join(root,'src/frontend/75-virtual-space.js'),'utf8');
const a=src.indexOf('        const buildArchitecturalWall=(wall,zoneCenters=[])=>{');
const b=src.indexOf('        const addFurniture=r=>{',a);
assert.ok(a>0&&b>a,'Falta el motor de muros CAD en el render isométrico');
class Position { set(x,y,z){this.x=x;this.y=y;this.z=z;} copy(p){this.set(p.x,p.y,p.z)} }
class Element {constructor(geo,mat){this.geometry=geo;this.material=mat;this.position=new Position();this.rotation={y:0};this.userData={};this.children=[];}add(item){this.children.push(item)} }
class BoxGeometry {constructor(w,h,d){this.parameters={width:w,height:h,depth:d}}}
class EdgesGeometry {constructor(geo){this.geometry=geo}}
class Vector2{constructor(x,y){this.x=x;this.y=y;} dot(o){return this.x*o.x+this.y*o.y}}
const THREE={Group:Element,Mesh:Element,BoxGeometry,EdgesGeometry,LineSegments:Element,Vector2,DoubleSide:2,LineBasicMaterial:class{constructor(o){Object.assign(this,o)}}};
const world=new Element();
const appState={layout:{zones:[],openings:[]}};
const state={selectedWallId:'W1',inspectorMode:'architecture',architectureMeshes:[]};
const ctx={appState,state,THREE,world,orbit:{theta:.8},coord:p=>({x:p.x/100,z:p.y/100}),meshMat:(color,opts)=>({color,...opts}),getScaleCmPerUnit:()=>1,vspaceClamp:(v,a,b)=>Math.max(a,Math.min(b,v)),normalizeOpeningType:v=>v==='window'?'window':v==='free'?'free':'door'};
const fn=vm.runInNewContext(`${src.slice(a,b)}\n buildArchitecturalWall`,ctx);
const wall={id:'W1',x1:0,y1:0,x2:500,y2:0,thickness:24,height:290};
const meshes=()=>state.architectureMeshes.filter(m=>m.userData.entityType==='wall');
const intersects=(mesh,x,y)=>Math.abs(mesh.position.x-x)<mesh.geometry.parameters.width/2-1e-4 && Math.abs(mesh.position.y-y)<mesh.geometry.parameters.height/2-1e-4;
fn(wall);
assert.equal(world.children.length,1);
assert.ok(meshes().some(m=>Math.abs(m.geometry.parameters.depth-.24)<1e-4),'El espesor no coincide con 24 cm');
assert.ok(meshes().some(m=>intersects(m,2.5,.8)),'Sin aberturas el muro debe ser macizo');
world.children=[];state.architectureMeshes=[];
appState.layout.openings=[{id:'O1',wallId:'W1',type:'door',t:.5,width:90,height:210,sill:0}];
fn(wall);
assert.ok(!meshes().some(m=>intersects(m,2.5,.8)),'La puerta no ha generado un hueco real');
assert.ok(meshes().some(m=>intersects(m,2.5,2.6)),'Falta dintel sobre la puerta');
world.children=[];state.architectureMeshes=[];
appState.layout.openings=[{id:'O2',wallId:'W1',type:'window',t:.5,width:120,height:100,sill:90}];
fn(wall);
assert.ok(meshes().some(m=>intersects(m,2.5,.4)),'Ventanal sin antepecho');
assert.ok(!meshes().some(m=>intersects(m,2.5,1.3)),'El vidrio no tiene hueco en el muro');
assert.ok(meshes().some(m=>intersects(m,2.5,2.5)),'Ventanal sin dintel superior');
assert.ok(state.architectureMeshes.some(m=>m.userData.openingId==='O2'),'Ventanal no es seleccionable');
assert.ok(src.includes('ensureLayoutDecorations()')&&src.includes('createWallSegment')&&src.includes('persistActiveLayout()'),'Falta sincronización de geometría o guardado');
console.log('V180 OK: espesor de muro, puerta hueca, ventanal único con antepecho y selección 3D.');
