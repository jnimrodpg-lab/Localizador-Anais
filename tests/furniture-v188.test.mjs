import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const editor=readFileSync(join(root,'src/frontend/70-rack-editor.js'),'utf8');
const iso=readFileSync(join(root,'src/frontend/74-isometric-furniture.js'),'utf8');
const vspace=readFileSync(join(root,'src/frontend/75-virtual-space.js'),'utf8');
const state={models:[],ui:{rackBuilder:{}},history:{racks:{undoStack:[{}]}},screen:'rack-builder', selectedModelId:'',layout:{zones:[{id:'Z1',pts:[{x:0,y:0},{x:900,y:0},{x:900,y:600},{x:0,y:600}]}],racks:[],meta:{scaleCmPerUnit:1}},auth:{loggedIn:true,role:'admin'}};
let persisted=0,saved=0;
const env={appState:state,Math,console,document:{getElementById:()=>null},getScaleCmPerUnit:()=>1,escapeHtml:s=>String(s),recordHistorySnapshot:()=>{},persistActiveLayout:()=>{persisted++},saveRackModels:()=>{saved++},showToast:()=>{},getActiveLayoutBranchIndex:()=>0,
 normalizeRackStyle:s=>s,saveRemoteAppState:async()=>{},contentWrap:{innerHTML:''},
   getSnapSize:()=>1};
vm.createContext(env);
vm.runInContext(vspace+'\n'+editor+'\n'+iso+'\nrenderRackConstructionWorkspace=()=>{};disposeRackFurniture3DEngine=()=>{};rackModel=id=>appState.models.find(m=>m.id===id)||null;',env);
const evaluate=s=>vm.runInContext(s,env);
for (const type of ['melamine-shelf','melamine-cabinet','metal-wood']) {
 evaluate(`createFurnitureTemplate('${type}')`);
 const m=state.models[0];
 assert.ok(m.furniture.enabled);
 assert.ok(m.furniture.pieces.length>=4,`${type} must contain physical pieces`);
 assert.ok(m.furniture.pieces.every(p=>p.w>0&&p.h>0&&p.d>0),`${type} piece dimensions valid`);
 if(type==='melamine-cabinet')assert.equal(m.furniture.pieces.filter(p=>p.type==='door').length,2);
 if(type==='metal-wood'){
  assert.equal(m.furniture.material,'metal-wood');
  assert.equal(m.furniture.pieces.filter(p=>p.type==='post').length,4);
  assert.ok(m.furniture.pieces.filter(p=>p.type==='shelf').length>=3);
 }
 let blocks=[];
 class Group{constructor(){this.children=[];}add(v){this.children.push(v)}}
 class Material{constructor(opt){this.opt=opt}}
 const THREE={MeshStandardMaterial:Material};
 const spec={kind:'rack',title:m.name,width:m.width,depth:m.depth,height:m.height,levels:m.levels,slots:m.slots};
 env.THREE=THREE; env.__m=m; env.__spec=spec;env.__rack={modelId:m.id,id:'test'};env.__group=new Group();env.__blocks=blocks;
 evaluate(`vspaceBuildIsometricFurniture(THREE,__group,__rack,__spec,{shared:{},selected:false,selectedLevel:1,selectedSlot:1,products:()=>[],block:(group,x,y,z,w,h,d,mat)=>{__blocks.push({x,y,z,w,h,d,mat});return {rotation:{z:0}}},sprite:()=>({position:{set(){}}})})`);
 assert.ok(blocks.length>=m.furniture.pieces.length,`Every ${type} part visible in scene`);
 assert.ok(blocks.every(b=>b.w>0&&b.h>0&&b.d>0),`${type} no invalid 3D boxes`);
 if(type==='metal-wood'){
   const colors=new Set(blocks.map(b=>b.mat?.opt?.color));
   assert.ok(colors.size>=2, 'Metal frame and wooden shelves render in different materials');
 }
}
evaluate('placeFurnitureModelInLayout(appState.models[0])');
assert.equal(state.layout.racks.length,1);
const r=state.layout.racks[0];
assert.equal(r.modelId,state.models[0].id);
assert.equal(r.w,state.models[0].width);
assert.equal(r.rackHeight,state.models[0].height);
assert.equal(persisted,1);
assert.ok(saved>=4);
// A rack instance must preserve its model geometry when spec is read in the 3D inspector.
assert.equal(evaluate('vspaceSpec(appState.layout.racks[0]).width'),state.models[0].width);
console.log('V188 OK: melamina, armario con puertas y metal+madera; piezas reales en 3D y colocación persistente.');
