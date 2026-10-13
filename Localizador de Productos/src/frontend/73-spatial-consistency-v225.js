/* V225 — nomenclatura por zona y encuentros físicos comunes a CAD y Three.js. */
function v225CodeZone(rack,layout=appState.layout){
  return (layout?.zones||[]).find(z=>String(z.id)===String(rack?.zoneId))||null;
}
function v225RackCodeSuffix(rack,value=rack?.displayCode||rack?.id,layout=appState.layout){
  let suffix=String(value||'').trim();
  const prefixes=[rack?.nomenclatureZoneId,rack?.zoneId,...(layout?.zones||[]).map(z=>z.id)].filter(Boolean).map(String).sort((a,b)=>b.length-a.length);
  const prefix=prefixes.find(p=>suffix.toLocaleUpperCase('es').startsWith(p.toLocaleUpperCase('es')+'-'));
  if(prefix)suffix=suffix.slice(prefix.length+1);
  else suffix=suffix.replace(/^(?:Z\d+|ALM(?:ACEN)?)-/i,'');
  if(!suffix)suffix=String(rack?.id||'E1').replace(/^(?:Z\d+|ALM(?:ACEN)?)-/i,'')||'E1';
  return /^\d+$/.test(suffix)?'E'+suffix:suffix;
}
function v225RackCode(rack,layout=appState.layout){
  const zone=v225CodeZone(rack,layout);
  if(!zone)return String(rack?.displayCode||rack?.id||'');
  return String(zone.id).trim().toLocaleUpperCase('es')+'-'+v225RackCodeSuffix(rack,undefined,layout);
}
function v225SyncRackCodes(layout=appState.layout,{reassign=false}={}){
  if(!layout)return false;
  let changed=false;
  const zones=layout.zones||[],racks=layout.racks||[],taken=new Set(),pending=[];
  for(const rack of racks){
    if(reassign){
      const center={x:Number(rack.x||0)+Number(rack.w||0)/2,y:Number(rack.y||0)+Number(rack.h||0)/2};
      const host=zones.find(z=>z.pts?.length>=3&&pointInPoly(center,z.pts));
      if(host&&rack.zoneId!==host.id){rack.zoneId=host.id;changed=true;}
    }
    const zone=v225CodeZone(rack,layout),code=v225RackCode(rack,layout),raw=String(rack.displayCode||rack.id||'');
    const item={rack,zone,code};
    // Los códigos que ya pertenecen al destino se reservan antes de los que llegan.
    if(v222CodeKey(raw)===v222CodeKey(code)&&!taken.has(v222CodeKey(code))){taken.add(v222CodeKey(code));pending.push({...item,reserved:true});}
    else pending.push(item);
  }
  for(const item of pending){
    const {rack,zone}=item;let code=item.code;
    if(!item.reserved){
      if(taken.has(v222CodeKey(code))){
        const prefix=zone?String(zone.id).trim().toLocaleUpperCase('es')+'-':'';
        let number=1;
        for(const key of taken){if(key.startsWith(v222CodeKey(prefix))){const match=key.slice(prefix.length).match(/^E(\d+)$/);if(match)number=Math.max(number,Number(match[1])+1);}}
        if(zone){code=prefix+'E'+number;while(taken.has(v222CodeKey(code)))code=prefix+'E'+(++number);}
        else{let n=2;while(taken.has(v222CodeKey(code)))code=item.code+'-'+n++;}
      }
      taken.add(v222CodeKey(code));
    }
    if(rack.displayCode!==code){rack.displayCode=code;changed=true;}
    if(zone&&rack.nomenclatureZoneId!==zone.id){rack.nomenclatureZoneId=zone.id;changed=true;}
  }
  return changed;
}
function v225CodePlan(rack,value){
  const raw=String(value??'').trim().slice(0,80);
  if(!raw)return {ok:false,msg:'La nomenclatura no puede quedar vacía.'};
  const zone=v225CodeZone(rack),next=zone?String(zone.id).trim().toLocaleUpperCase('es')+'-'+v225RackCodeSuffix(rack,raw):raw;
  if(next.length>80)return {ok:false,msg:'La nomenclatura admite hasta 80 caracteres, incluido el prefijo de zona.'};
  const current=v225RackCode(rack),matches=(appState.layout?.racks||[]).filter(r=>r.id!==rack.id&&v222CodeKey(v225RackCode(r))===v222CodeKey(next));
  if(matches.length>1)return {ok:false,msg:'Ese código corresponde a varios muebles. Renombra uno antes de intercambiar.'};
  return {ok:true,next,current,other:matches[0]||null,changed:next!==current};
}

// Alturas en metros; coordenadas XY en unidades CAD, igual que los muros del visor.
function v225WallBandsFor(wall,walls=appState.layout.walls,levels=null){
  const scale=getScaleCmPerUnit()/100,L=wallLength(wall);
  if(L<1)return [];
  const height=v219WallRenderHeight(wall,getScaleCmPerUnit());
  const heights=levels||[...new Set([0,...walls.map(w=>v219WallRenderHeight(w,getScaleCmPerUnit()))])].sort((a,b)=>a-b);
  const openings=(appState.layout.openings||[]).filter(o=>o.wallId===wall.id).map(o=>{
    const source=(appState.layout.walls||[]).find(w=>w.id===wall.id)||wall,segment=getOpeningSegment(o,source),defaults=openingDefaultForType(o.type);
    const c=Number(segment?.t??o.t??.5)*(wall.v217SourceLength||L)-(wall.v217StartDistance||0),half=Number(segment?.width||o.width||90)/2;
    return {left:Math.max(0,c-half),right:Math.min(L,c+half),low:Math.max(0,Number(o.sill??defaults.sill))*scale,high:Math.min(height,(Math.max(0,Number(o.sill??defaults.sill))+Math.max(20,Number(o.height||defaults.height)))*scale)};
  }).filter(o=>o.right>o.left&&o.low<height);
  const cuts=[...new Set([0,L,...openings.flatMap(o=>[o.left,o.right])])].sort((a,b)=>a-b),bands=[];
  const add=(a,b,y0,y1)=>{
    if((b-a)*scale<.000001||y1-y0<.000001)return;
    const slices=[y0,...heights.filter(h=>h>y0+1e-7&&h<y1-1e-7),y1];
    for(let i=0;i<slices.length-1;i++){
      const low=slices[i],high=slices[i+1],neighbors=walls.filter(w=>v219WallRenderHeight(w,getScaleCmPerUnit())>=high-1e-7);
      const slice=getWallSlicePolygon(wall,a/L,b/L,1,neighbors);
      if(slice?.poly?.length>=3)bands.push({poly:slice.poly,y0:low,y1:high,wallId:wall.id,cutaway:!!wall.v219Cutaway});
    }
  };
  for(let i=0;i<cuts.length-1;i++){
    const a=cuts[i],b=cuts[i+1],mid=(a+b)/2,voids=openings.filter(o=>o.left<=mid&&o.right>=mid).sort((x,y)=>x.low-y.low);
    let cursor=0;
    for(const hole of voids){if(hole.low>cursor)add(a,b,cursor,hole.low);cursor=Math.max(cursor,hole.high);}
    if(cursor<height)add(a,b,cursor,height);
  }
  return bands;
}
function v225JointBands(walls,bands,levels){
  const result=[];
  for(let i=0;i<levels.length-1;i++){
    const y0=levels[i],y1=levels[i+1],neighbors=walls.filter(w=>v219WallRenderHeight(w,getScaleCmPerUnit())>=y1-1e-7);
    for(const joint of v216JointPieces(neighbors)){
      const host=bands.find(b=>joint.ids.includes(b.wallId)&&b.y0<=y0+1e-7&&b.y1>=y1-1e-7);
      if(host)result.push({poly:joint.poly,y0,y1,wallId:host.wallId,wallIds:joint.ids,material:host.material,cutaway:host.cutaway});
    }
  }
  return result;
}
let v225WallCache=null;
function v225WallSolids(){
  const layout=appState.layout,signature=JSON.stringify([getScaleCmPerUnit(),layout.walls,layout.openings,(layout.zones||[]).map(z=>[z.id,z.pts])]);
  if(v225WallCache?.signature===signature)return v225WallCache.cells;
  // El corte del diorama es visual. La ocupación física conserva la altura guardada.
  const walls=(layout.walls||[]).map(w=>{const copy={...w};delete copy.v219Cutaway;return copy;});
  const heights=[...new Set([0,...walls.map(w=>v219WallRenderHeight(w,getScaleCmPerUnit()))])].sort((a,b)=>a-b);
  const bands=walls.flatMap(w=>v225WallBandsFor(w,walls,heights));bands.push(...v225JointBands(walls,bands,heights));
  const voids=v216OpeningVoids(),levels=[...new Set([...bands,...voids].flatMap(b=>[b.y0,b.y1]))].sort((a,b)=>a-b),cells=[];
  for(let i=0;i<levels.length-1;i++){
    const y0=levels[i],y1=levels[i+1],mid=(y0+y1)/2,active=bands.filter(b=>b.y0<=mid&&b.y1>=mid);
    if(!active.length)continue;
    const holes=voids.filter(v=>v.y0<=mid&&v.y1>=mid).map(v=>v.poly);
    cells.push({y0,y1,parts:active,rings:v216Union(active.map(b=>b.poly),holes)});
  }
  v225WallCache={signature,cells};return cells;
}
function v225ClipToConvex(poly,clip){
  let result=poly.map(p=>({...p}));
  for(let i=0;i<clip.length&&result.length;i++){
    const a=clip[i],b=clip[(i+1)%clip.length],side=p=>(b.x-a.x)*(p.y-a.y)-(b.y-a.y)*(p.x-a.x),out=[];
    for(let j=0;j<result.length;j++){
      const p=result[j],q=result[(j+1)%result.length],sp=side(p),sq=side(q),inP=sp>=0,inQ=sq>=0;
      if(inP)out.push(p);
      if(inP!==inQ){const t=sp/(sp-sq);out.push({x:p.x+(q.x-p.x)*t,y:p.y+(q.y-p.y)*t});}
    }
    result=out;
  }
  return result;
}
function v225RackWallHits(rack){
  const epsilon=.02/Math.max(.0001,getScaleCmPerUnit()),fp=getRackFootprint(rack.modelId,rack.rot||0,rack),corners=rackCorners(rack);
  const cx=Number(rack.x||0)+Number(rack.w||fp.w)/2,cy=Number(rack.y||0)+Number(rack.h||fp.h)/2;
  const rad=Number(rack.rot||0)*Math.PI/180,c=Math.cos(rad),s=Math.sin(rad),bw=Math.max(0,fp.baseW-2*epsilon),bh=Math.max(0,fp.baseH-2*epsilon);
  if(!bw||!bh||corners.length!==4)return [];
  const clip=[[-bw/2,-bh/2],[bw/2,-bh/2],[bw/2,bh/2],[-bw/2,bh/2]].map(([x,y])=>({x:cx+x*c-y*s,y:cy+x*s+y*c}));
  const low=Number(rack.baseHeight||0)/100,high=low+v222Dimensions(rack).height/100,hits=new Set();
  for(const cell of v225WallSolids()){
    if(high<=cell.y0+.0002||cell.y1<=low+.0002)continue;
    const area=cell.rings.reduce((sum,ring)=>sum+v216SignedArea(v225ClipToConvex(ring,clip)),0);
    if(area<=epsilon*epsilon*.001)continue;
    for(const part of cell.parts){if(Math.abs(v216SignedArea(v225ClipToConvex(part.poly,clip)))>epsilon*epsilon*.001)(part.wallIds||[part.wallId]).forEach(id=>hits.add(id));}
  }
  return [...hits];
}
let v225ValidationSignature='';
function v225RefreshValidation(){
  if(typeof v117OperationalIssues!=='function')return;
  const layout=appState.layout,signature=JSON.stringify([layout.zones,layout.walls,layout.openings,layout.meta?.scaleCmPerUnit,layout.meta?.minAisleCm,(layout.racks||[]).map(r=>[r.id,r.zoneId,r.displayCode,r.x,r.y,r.w,r.h,r.rot,r.modelId,r.baseHeight,r.rackHeight,r.virtual,r.furnitureOverrides,r.stackedOnId])]);
  if(signature===v225ValidationSignature&&Array.isArray(appState.editor.validationIssues))return;
  appState.editor.validationIssues=v117OperationalIssues();appState.editor.validationAt=Date.now();
  v225ValidationSignature=signature;
}
function v225RackWorldSize(rack,scale,heightScale=scale){
  const fp=getRackFootprint(rack.modelId,rack.rot||0,rack),cm=Math.max(.0001,getScaleCmPerUnit()),dims=v222Dimensions(rack);
  return {w:fp.baseW*scale,d:fp.baseH*scale,h:dims.height/cm*heightScale,base:Number(rack.baseHeight||0)/cm*heightScale};
}
function v225WallFaceForRack(wall,rack){
  const raw=getWallRawSlicePolygon(wall),center={x:rack.x+rack.w/2,y:rack.y+rack.h/2};
  if(!raw)return null;
  const dot=(center.x-raw.a.x)*raw.normal.x+(center.y-raw.a.y)*raw.normal.y,offset=getWallFaceOffsets(wall);
  const distance=dot>=0?offset.left:-offset.right;
  return {a:{x:raw.a.x+raw.normal.x*distance,y:raw.a.y+raw.normal.y*distance},b:{x:raw.b.x+raw.normal.x*distance,y:raw.b.y+raw.normal.y*distance}};
}
function v225SnapRackWalls(rack,excluded=[]){
  const gap=Math.max(0,Number(appState.editor?.rackAlignClearanceCm||0))/getScaleCmPerUnit(),threshold=Math.max(3,Math.min(14,getSnapSize()*3));
  let best=null;
  for(const wall of appState.layout.walls||[]){
    const face=v225WallFaceForRack(wall,rack);if(!face)continue;
    const dx=face.b.x-face.a.x,dy=face.b.y-face.a.y,len=Math.hypot(dx,dy),ux=dx/len,uy=dy/len;
    const center={x:rack.x+rack.w/2,y:rack.y+rack.h/2},side=(center.x-face.a.x)*(-uy)+(center.y-face.a.y)*ux>=0?1:-1,nx=-uy*side,ny=ux*side;
    for(const edge of rackContourEdges(rack)){
      if(edge.nx*nx+edge.ny*ny>-.9999)continue;
      const distance=(edge.a.x-face.a.x)*nx+(edge.a.y-face.a.y)*ny,shift=gap-distance;
      const along=p=>(p.x-face.a.x)*ux+(p.y-face.a.y)*uy,lo=Math.min(along(edge.a),along(edge.b)),hi=Math.max(along(edge.a),along(edge.b));
      if(Math.min(hi,len)-Math.max(lo,0)<.5||Math.abs(shift)>threshold+1e-7)continue;
      const next={...rack,x:rack.x+nx*shift,y:rack.y+ny*shift};
      if(v225RackWallHits(next).length||(appState.layout.racks||[]).some(r=>r.id!==rack.id&&!excluded.includes(r.id)&&rackVerticalOverlap(r,next)&&rackContoursOverlap(r,next)))continue;
      if(!best||Math.abs(shift)<best.cost)best={rack:next,cost:Math.abs(shift),kind:'wall',target:face,moving:rackContourEdges(next)[edge.index],label:`Cara del muro · ${round1(gap*getScaleCmPerUnit())} cm`};
    }
  }
  return best;
}
