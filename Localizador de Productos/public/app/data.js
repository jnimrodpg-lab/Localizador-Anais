// Data layer: preserva IDs, tablas D1, estructuras de app-state y layout de las versiones anteriores.
const DEFAULT_TYPES = {
  rack:{name:'Estantería',w:150,d:55,h:225,levels:4,slots:3},
  vitrina:{name:'Vitrina de cristal',w:125,d:48,h:200,levels:4,slots:2},
  mostrador:{name:'Mostrador',w:160,d:65,h:104,levels:2,slots:2},
  contenedor:{name:'Gavetero',w:95,d:52,h:152,levels:4,slots:3},
  cajonera:{name:'Cómoda / cajonera',w:125,d:52,h:125,levels:4,slots:2},
  caja:{name:'Caja de cartón',w:54,d:42,h:42,levels:1,slots:1}
};
export const TYPES=Object.freeze(DEFAULT_TYPES);
export const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number(n)||a));
export const uid=(prefix='ID')=>`${prefix}-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
export function demoState(){
 const zones=[{id:'Z1',name:'Sala principal',color:'#a4b69b',pts:[{x:0,y:0},{x:660,y:0},{x:660,y:500},{x:0,y:500}]}];
 const racks=[
  {id:'R01',zoneId:'Z1',x:40,y:45,w:150,h:55,rot:0,virtualType:'rack',virtualName:'Estantería central',virtual:{width:150,depth:55,height:220,levels:4,slots:3},virtualPlacements:[{level:1,slot:1,sku:'SKU-1001',name:'Producto de ejemplo',quantity:8}]},
  {id:'V01',zoneId:'Z1',x:250,y:40,w:125,h:48,rot:0,virtualType:'vitrina',virtualName:'Vitrina de muestras',virtual:{width:125,depth:48,height:190,levels:3,slots:2},virtualPlacements:[]},
  {id:'C01',zoneId:'Z1',x:390,y:365,w:125,h:52,rot:0,virtualType:'cajonera',virtualName:'Cajonera',virtual:{width:125,depth:52,height:120,levels:4,slots:2},virtualPlacements:[]},
 ];
 return {admin:{company:'WMS Industrial',branches:[{id:1,name:'Sucursal principal',warehouses:['Principal']}],activeBranch:0},models:[],branchLayouts:{0:{zones,racks,meta:{scaleCmPerUnit:1}}}};
}
export function normalizeState(state){
 const data=state&&typeof state==='object'?structuredClone(state):demoState();
 if(!data.admin || typeof data.admin!=='object')data.admin={company:'WMS Industrial'};
 if(!Array.isArray(data.admin.branches))data.admin.branches=[];
 if(!data.admin.branches.length)data.admin.branches=demoState().admin.branches;
 if(!data.branchLayouts || typeof data.branchLayouts!=='object')data.branchLayouts={};
 if(!Array.isArray(data.models))data.models=[];
 data.admin.branches.forEach((b,i)=>{
  if(!Array.isArray(b.warehouses))b.warehouses=['Almacén principal'];
  const l=data.branchLayouts[i];
  if(!l || !Array.isArray(l.zones) || !Array.isArray(l.racks))data.branchLayouts[i]={zones:[],racks:[],meta:{scaleCmPerUnit:1}};
  else {
   if(!l.meta || typeof l.meta!=='object')l.meta={scaleCmPerUnit:1};
   l.racks.forEach(r=>{if(!Array.isArray(r.virtualPlacements))r.virtualPlacements=[];if(!Array.isArray(r.virtualContainers))r.virtualContainers=[];});
  }
 });
 return data;
}
export function spec(r,models=[]){
 const model=models.find(m=>m.id===r.modelId)||{};
 const kind=TYPES[r.virtualType]?r.virtualType:'rack';
 const preset=TYPES[kind];
 const p=r.virtual||{};
 return {kind,name:r.virtualName||r.name||r.id,width:Number(p.width||model.width||r.w||preset.w),depth:Number(p.depth||model.depth||r.h||preset.d),height:Number(p.height||model.height||r.rackHeight||preset.h),levels:clamp(p.levels||model.levels||preset.levels,1,16),slots:clamp(p.slots||model.slots||preset.slots,1,16)};
}
export function pointsOf(zone){return Array.isArray(zone?.pts)?zone.pts:[];}
export function rectOverlap(a,b,pad=4){return a.x<b.x+b.w-pad&&a.x+a.w>b.x+pad&&a.y<b.y+b.h-pad&&a.y+a.h>b.y+pad;}
export function pointInPoly(p,pts){let inPolygon=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++) {const a=pts[i],b=pts[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inPolygon=!inPolygon;}return inPolygon;}
export function validPosition(item,layout,ignoreId=item.id){
 const zone=layout.zones.find(z=>z.id===item.zoneId)||layout.zones[0];
 if(zone&&zone.pts?.length>=3){const corners=[{x:item.x,y:item.y},{x:item.x+item.w,y:item.y},{x:item.x+item.w,y:item.y+item.h},{x:item.x,y:item.y+item.h}];if(!corners.every(p=>pointInPoly(p,zone.pts)))return 'El mueble queda fuera de su zona';}
 for(const other of layout.racks){if(other.id!==ignoreId&&other.zoneId===item.zoneId&&rectOverlap(item,other))return `Colisión con ${other.virtualName||other.id}`;}
 return null;
}
export function locationCode(r,level,slot){return `${r.id}-N${level}-P${slot}`;}
export function productFields(p){return {sku:String(p?.sku||p?.SKU||p?.Sku||p?.codigo||p?.['cod / modelo']||p?.Barras||''),name:String(p?.nombre||p?.Nombre||p?.name||p?.producto||p?.['cod / modelo']||'Sin nombre'),rack:String(p?.rack||p?.Estante||p?.estante||p?.rackStore||''),level:parseInt(p?.nivel||p?.Nivel||p?.nivelStore||'0')||0,slot:parseInt(p?.slot||p?.Slot||p?.slotStore||'0')||0,image:String(p?.imagen||p?.Imagen||p?.image||'')};}
export async function api(path,opts={}){
 const res=await fetch(`/api${path}`,{credentials:'include',...opts,headers:{...((opts.body)?{'Content-Type':'application/json'}:{}),...(opts.headers||{})}});
 const ct=res.headers.get('content-type')||'';if(!ct.includes('json'))throw new Error('Servidor API no disponible. Usa la demo para revisar la interfaz.');
 const json=await res.json();if(!res.ok||json.ok===false)throw new Error(json.error||`Error HTTP ${res.status}`);return json;
}
export function getLayout(data,index){return data.branchLayouts?.[index]||{zones:[],racks:[],meta:{scaleCmPerUnit:1}};}
