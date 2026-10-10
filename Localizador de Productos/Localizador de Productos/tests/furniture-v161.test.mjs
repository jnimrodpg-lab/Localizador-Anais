import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const src=fs.readFileSync(path.join(root,'src/frontend/74-isometric-furniture.js'),'utf8');
const src75=fs.readFileSync(path.join(root,'src/frontend/75-virtual-space.js'),'utf8');
const state={
  products:[{sku:'SKU-250',nombre:'Producto',rack:'R1',nivel:2,slot:2}],
  auth:{loggedIn:true,role:'admin'},models:[],layout:{zones:[],racks:[]}
};
const env={appState:state,escapeHtml:x=>x,getScaleCmPerUnit:()=>1,persistActiveLayout:()=>{},
  document:{getElementById:()=>null},showToast:()=>{},console};
vm.createContext(env);vm.runInContext(src75+'\n'+src,env);
const expression=e=>vm.runInContext(e,env);
assert.equal(expression("vspaceProductsForSlot({id:'R1'},2,2)[0].sku"),'SKU-250');
assert.equal(expression("vspaceProductsForSlot({id:'R1'},2,3).length"),0);
assert.equal(expression("vspaceContainersForSlot({id:'R1'},2,2).kind"),'carton');
assert.equal(expression("vspaceContainersForSlot({id:'R1',virtualContainers:[{level:2,slot:2,kind:'plastic',count:3}]},2,2).count"),3);
let updated=[];
const sample={id:'R1',virtualType:'rack',virtual:{levels:3,slots:3},virtualContainers:[]};
state.layout.racks=[sample];
env.__rack=sample;
expression("vspaceSetSlotContainers(__rack,2,2,'plastic',3)");
assert.equal(sample.virtualContainers[0].count,3);
assert.equal(sample.virtualContainers[0].kind,'plastic');
expression("vspaceSetSlotContainers(__rack,2,2,'none',0)");
assert.equal(sample.virtualContainers.length,1);
assert.equal(sample.virtualContainers[0].count,0);

class Group{constructor(){this.userData={furnitureId:'R1'};this.children=[];}add(v){this.children.push(v);}}
class Vector3{constructor(x,y,z){this.x=x;this.y=y;this.z=z;}}
class BufferGeometry{setFromPoints(points){this.points=points;return this;}}
class LineBasicMaterial{constructor(x){this.opts=x;}}
class Line{constructor(geo,mat){this.geo=geo;this.mat=mat;}}
const THREE={Vector3,BufferGeometry,LineBasicMaterial,Line};
const shared=Object.fromEntries(['metal','metalSelected','metalDark','hole','wood','woodLight','woodDark','cardboard','cardboardLight','tape','paper','ink','plastic','plasticLight','plasticDark','glass','glassShelf','highlight'].map(x=>[x,x]));
for(const kind of ['rack','vitrina','mostrador','contenedor','cajonera','caja']){
  const group=new Group(),blocks=[];
  const rack={...sample,virtualType:kind,virtualContainers:[{level:2,slot:2,kind:'carton',count:2}]};
  const spec={kind,title:kind,width:150,depth:60,height:225,levels:kind==='caja'?1:3,slots:kind==='caja'?1:3};
  expression('');
  env.vspaceBuildIsometricFurniture(THREE,group,rack,spec,{
    shared,selected:true,selectedLevel:2,selectedSlot:2,
    products:(r,l,s)=>l===2&&s===2?[{sku:'SKU-250'}]:[],
    block:(g,x,y,z,w,h,d,mat,level,slot)=>{blocks.push({x,y,z,w,h,d,mat,level,slot});return {rotation:{z:0}};},
    sprite:(text,width)=>({position:{set(){}},text,width})
  });
  assert.ok(blocks.length>=8, `${kind} should have real detail geometry`);
  assert.ok(group.children.length>0,`${kind} should include label or selection outline`);
  if(kind==='rack'||kind==='vitrina'){
    assert.ok(blocks.some(b=>b.level===2&&b.slot===2),`${kind} has a pickable N2/P2 compartment`);
    assert.ok(blocks.some(b=>b.mat==='paper'),`${kind} packaging carries labels`);
  }
}
console.log('OK: 6 modelos geométricos 3D, cajas anidadas, niveles, SKU y cambios de contenedores.');
