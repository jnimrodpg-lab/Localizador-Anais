import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const geo=fs.readFileSync(new URL('../src/frontend/10-products-geometry.js',import.meta.url),'utf8');
const ed=fs.readFileSync(new URL('../src/frontend/60-layout-editor.js',import.meta.url),'utf8');
const from=(src,a,b)=>{const st=src.indexOf(a),en=src.indexOf(b,st);assert(st>=0&&en>st,a);return src.slice(st,en)};
const models=[{id:'wide',width:100,depth:30,height:200},{id:'low',width:70,depth:60,height:90},{id:'thin',width:36,depth:145,height:160}];
const fp=(id,r,rack)=>{const m=models.find(m=>m.id===id),w=(rack?.virtual?.width||m.width),h=(rack?.virtual?.depth||m.depth),rad=r*Math.PI/180,c=Math.abs(Math.cos(rad)),s=Math.abs(Math.sin(rad));return {w:w*c+h*s,h:w*s+h*c,baseW:w,baseH:h};};
const state={models,layout:{racks:[],zones:[{id:'Z1',pts:[{x:-400,y:-400},{x:900,y:-400},{x:900,y:900},{x:-400,y:900}]}]},editor:{snapEnabled:true,snapSize:2,distributionEdgeSnap:true,distributionVertexSnap:false,rackAlignClearanceCm:0}};
let preview=null;
const ctx={Math,Number,Array,Set,Map,appState:state,normalizeAngle:x=>((x%360)+360)%360,rackModel:id=>models.find(m=>m.id===id),getRackFootprint:fp,getScaleCmPerUnit:()=>1,getSnapSize:()=>2,isSnapEnabled:()=>true,snapGrid:x=>Math.round(x/2)*2,clearRackSnapPreview:()=>{preview=null;},setRackSnapPreview:p=>{preview=p;},distributionHostForRack:()=>state.layout.zones[0],pointInPoly:()=>true};
vm.createContext(ctx);
vm.runInContext(from(geo,'  function rackCorners(rack){','  function collectSnapPoints('),ctx);
vm.runInContext(from(geo,'  function getFrontLine(baseW,baseH){','  function frontArrowPath('),ctx);
vm.runInContext(from(ed,'  function v224SnapRackEdges(rack, excluded=[]){','  function distributionRackInterference('),ctx);
const make=(id,modelId,x,y,rot=0)=>{const f=fp(modelId,rot);return {id,modelId,x,y,w:f.w,h:f.h,rot,baseHeight:0,rackHeight:models.find(m=>m.id===modelId).height,zoneId:'Z1'};};
const distance=(e1,e2)=>Math.hypot(e1.a.x-e2.a.x,e1.a.y-e2.a.y);
const snap=(rack,x,y)=>ctx.distributionRackPlacement(rack,x,y);
const approximate=(a,b,tol=0.05)=>assert(Math.abs(a-b)<=tol,`${a} != ${b}`);
// Back fixed on the local -depth axis regardless of aspect ratio.
const wide=ctx.getFrontLine(100,30),tall=ctx.getFrontLine(36,145);
assert.equal(wide.y1,-15);assert.equal(tall.y1,-72.5);assert.equal(tall.x1<0,true);
const source=make('A','wide',0,0),moving=make('B','low',106,0);
state.layout.racks=[source,moving];
let out=snap(moving,106,0);
assert(['contact','back'].includes(preview?.type));approximate(Math.min(...ctx.rackCorners(out).map(x=>x.x)),100);
assert.equal(ctx.rackContoursOverlap(source,out),false,'Cero cm touching not collision');
state.editor.rackAlignClearanceCm=4;
out=snap(moving,108,0);
assert(['contact','back'].includes(preview?.type));approximate(Math.min(...ctx.rackCorners(out).map(x=>x.x)),104);
assert.equal(ctx.rackContoursOverlap(source,out),false);
// Side-by-side cabinets with equal rears; alignment independent of depth.
state.editor.rackAlignClearanceCm=0;
const adj=make('B','low',105,6);state.layout.racks=[source,adj];
out=snap(adj,105,6);
assert.equal(preview?.type,'back');
approximate(ctx.rackContourEdges(out)[0].a.y,ctx.rackContourEdges(source)[0].a.y);
assert.equal(ctx.rackContoursOverlap(source,out),false);
// Corner with rotated tall: target and moving faces parallel at arbitrary angle.
const rotated=make('C','thin',0,0,33.25);state.layout.racks=[rotated];
const m=make('D','low',0,0,30.1),target=ctx.rackContourEdges(rotated)[1];
const newPos={x:(target.a.x+target.b.x)/2 + target.nx*35,y:(target.a.y+target.b.y)/2+target.ny*35};
const rm=fp('low',30.1);m.x=newPos.x-rm.w/2;m.y=newPos.y-rm.h/2;
const res=ctx.v224SnapRackEdges(m);
assert(res,'slightly angled face can snap');approximate(res.rack.rot,33.25,1e-6);
assert.equal(ctx.rackContoursOverlap(rotated,res.rack),false);
// SAT excludes distant bounding-box collisions for two oblique rectangles.
const ref=make('F','thin',0,0,45);const far=make('G','thin',90,90,45);
assert.equal(ctx.rackContoursOverlap(ref,far),false);
const intrude=make('H','low',5,5,0);assert.equal(ctx.rackContoursOverlap(make('I','wide',0,0),intrude),true);
const stacked=make('J','low',5,5,0);stacked.baseHeight=250;
assert.equal(ctx.rackVerticalOverlap(make('I','wide',0,0),stacked),false);
// No move if disabled; can ignore rack ids for group movement.
state.editor.distributionEdgeSnap=false;state.layout.racks=[source];out=snap(moving,106,0);assert.equal(preview,null);
state.editor.distributionEdgeSnap=true;out=ctx.distributionRackPlacement(moving,106,0,{ignoreRackIds:['A']});assert.equal(preview,null);
for(const k of ['w','h','x','y','rot'])assert(Number.isFinite(out[k]));
assert.match(ed,/id="v224EdgeSnap"/);assert.match(ed,/outlineRadius = 0/);
console.log('V224 PASS: fondo 2D por eje local, contacto lateral 0/4 cm, fondos alineados, rotación diagonal, SAT, altura NPT, snap configurable y sin colisiones.');
