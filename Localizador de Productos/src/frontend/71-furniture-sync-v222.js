/* V222 — fuente de dimensiones y geometría común para modelo e instancias. */
const v222ModelSignatures = new Map();
const v222FurnitureCache = new WeakMap();
let v222SyncBusy = false;

function v222ModelFor(rack){ return (appState.models||[]).find(m=>m.id===rack?.modelId)||null; }
function v222Number(value,fallback,min,max=10000){ const n=Number(value);return Math.min(max,Math.max(min,value!==null&&value!==''&&Number.isFinite(n)?n:fallback)); }
function v222ModelDimensions(model){
  const f=model?.furniture;
  return {width:v222Number(model?.width,120,30),depth:v222Number(model?.depth,40,20,5000),height:v222Number(model?.height,200,f?.enabled?60:30),levels:Math.round(v222Number(model?.levels,1,1,12)),slots:Math.round(v222Number(model?.slots,1,1,12))};
}
function v222Dimensions(rack,model=v222ModelFor(rack)){
  const fallback=model?v222ModelDimensions(model):{width:Number(rack?.virtual?.width||120),depth:Number(rack?.virtual?.depth||40),height:Number(rack?.rackHeight||rack?.virtual?.height||200),levels:Number(rack?.virtual?.levels||1),slots:Number(rack?.virtual?.slots||1)};
  const overrides=rack?.furnitureOverrides||{};
  const out={...fallback};
  for(const key of ['width','depth','height','levels','slots'])if(overrides[key]!=null)out[key]=v222Number(overrides[key],fallback[key],key==='width'?30:key==='depth'?20:key==='height'?(model?.furniture?.enabled?60:30):1,key==='levels'||key==='slots'?12:key==='depth'?5000:10000);
  // La altura editada en layouts antiguos debe sobrevivir a la migración.
  if(!rack?.furnitureDataVersion&&overrides.height==null&&Number(rack?.rackHeight)>0){
    const savedHeight=Number(rack?.virtual?.height);
    if((savedHeight>0&&Math.abs(Number(rack.rackHeight)-savedHeight)>.01)||(!savedHeight&&Math.abs(Number(rack.rackHeight)-fallback.height)>.01))out.height=Number(rack.rackHeight);
  }
  out.levels=Math.round(out.levels);out.slots=Math.round(out.slots);
  return out;
}
function v222RackName(rack){
  const model=v222ModelFor(rack),source=rack?.furnitureSource;
  return String(rack?.name||(source?.name&&rack?.virtualName===source.name?model?.name:rack?.virtualName)||model?.name||rack?.id||'Mueble');
}
function v222RackCode(rack){ return typeof v225RackCode==='function'?v225RackCode(rack):String(rack?.displayCode||rack?.id||''); }
function v222CodeKey(value){ return String(value||'').normalize('NFKC').trim().toLocaleUpperCase('es'); }
function v222CodePlan(rack,value){
  if(typeof v225CodePlan==='function')return v225CodePlan(rack,value);
  const next=String(value??'').trim().slice(0,80),current=v222RackCode(rack);
  if(!next)return {ok:false,msg:'La nomenclatura no puede quedar vacía.'};
  const others=(appState.layout?.racks||[]).filter(r=>r.id!==rack.id);
  const matches=others.filter(r=>v222CodeKey(v222RackCode(r))===v222CodeKey(next));
  if(matches.length>1)return {ok:false,msg:'Ese código corresponde a varios muebles. Renombra uno de ellos antes de intercambiar.'};
  return {ok:true,next,current,other:matches[0]||null,changed:next!==current};
}
function v222ApplyCodePlan(rack,plan){
  if(!plan.ok||!plan.changed)return;
  if(plan.other)plan.other.displayCode=plan.current;
  rack.displayCode=plan.next;
  if(typeof v225CodeZone==='function'){
    const zone=v225CodeZone(rack);if(zone)rack.nomenclatureZoneId=zone.id;
    if(plan.other){const otherZone=v225CodeZone(plan.other);if(otherZone)plan.other.nomenclatureZoneId=otherZone.id;}
  }
}
function v222PrepareRackCopy(copy,source){
  const taken=new Set((appState.layout?.racks||[]).filter(r=>r.id!==copy.id).map(r=>v222CodeKey(v222RackCode(r))));let code=String(copy.id),suffix=1;while(taken.has(v222CodeKey(code)))code=String(copy.id)+'-'+suffix++;
  copy.displayCode=code;copy.name=copy.virtualName=(v222RackName(source)+' (copia)').slice(0,80);
}
function v222RenameRack(rack,field,value){
  if(!rack)return false;
  if(field==='code'){
    const plan=v222CodePlan(rack,value);
    if(!plan.ok){showToast(plan.msg,'warning',3000);return false;}
    if(!plan.changed)return false;
    recordHistorySnapshot('distribution');v222ApplyCodePlan(rack,plan);
    persistActiveLayout(plan.other?'Intercambiar nomenclaturas':'Renombrar nomenclatura');
    if(plan.other)showToast(`Nomenclaturas intercambiadas: ${plan.current} ↔ ${plan.next}`,'success',2800);
  }else{
    const name=String(value||'').trim().slice(0,80);
    if(!name||name===v222RackName(rack))return false;
    recordHistorySnapshot('distribution');rack.name=name;rack.virtualName=name;persistActiveLayout('Renombrar mueble');
  }
  return true;
}
function v222SyncRack(rack,layout=appState.layout){
  const model=v222ModelFor(rack);if(!model)return false;
  const before=JSON.stringify(rack),dims=v222Dimensions(rack,model),base=v222ModelDimensions(model);
  if(!rack.furnitureDataVersion&&Math.abs(dims.height-base.height)>.01)rack.furnitureOverrides={...(rack.furnitureOverrides||{}),height:dims.height};
  const prior=rack.furnitureSource;
  if(prior?.name&&rack.virtualName===prior.name&&!rack.name)rack.virtualName=model.name;
  const scale=Math.max(.01,Number(layout?.meta?.scaleCmPerUnit||1)),rad=Number(rack.rot||0)*Math.PI/180;
  const w=(dims.width*Math.abs(Math.cos(rad))+dims.depth*Math.abs(Math.sin(rad)))/scale,h=(dims.width*Math.abs(Math.sin(rad))+dims.depth*Math.abs(Math.cos(rad)))/scale;
  const cx=Number(rack.x||0)+Number(rack.w||w)/2,cy=Number(rack.y||0)+Number(rack.h||h)/2;
  const nextX=cx-w/2,nextY=cy-h/2;if(Math.abs(Number(rack.x||0)-nextX)>.0000001)rack.x=nextX;if(Math.abs(Number(rack.y||0)-nextY)>.0000001)rack.y=nextY;rack.w=w;rack.h=h;rack.rackHeight=dims.height;
  rack.virtual={...(rack.virtual||{}),...dims};rack.furnitureSource={...base,name:model.name};rack.furnitureDataVersion=222;
  return before!==JSON.stringify(rack);
}
function v222SynchronizeModels({persist=true}={}){
  if(v222SyncBusy)return;v222SyncBusy=true;
  try{
    let changed=false;
    for(const model of appState.models||[]){
      const f=model.furniture||{},signature=JSON.stringify([model.name,model.width,model.depth,model.height,model.levels,model.slots,f.material,f.finish,f.thickness,f.roofMode,f.leftHeight,f.rightHeight,f.backMode,f.pieces,f.logicalSlots]);
      if(v222ModelSignatures.get(model.id)!==signature){model.furnitureRevision=Number(model.furnitureRevision||0)+1;v222ModelSignatures.set(model.id,signature);}
    }
    const layouts=[appState.layout,...Object.values(appState.branchLayouts||{})].filter(Boolean),seen=new Set();
    for(const layout of layouts){if(seen.has(layout))continue;seen.add(layout);for(const rack of layout.racks||[])changed=v222SyncRack(rack,layout)||changed;
      if(typeof v225SyncRackCodes==='function')changed=v225SyncRackCodes(layout)||changed;
      for(let pass=0;pass<Math.min(12,(layout.racks||[]).length);pass++){let moved=false;for(const rack of layout.racks||[]){if(!rack.stackedOnId)continue;const support=layout.racks.find(r=>r.id===rack.stackedOnId);if(!support)continue;const top=Number(support.baseHeight||0)+v222Dimensions(support).height;if(Math.abs(Number(rack.baseHeight||0)-top)>.01){rack.baseHeight=top;moved=true;changed=true;}}if(!moved)break;}
    }
    if(persist&&changed&&appState.layout){
      const idx=typeof getActiveLayoutBranchIndex==='function'?getActiveLayoutBranchIndex():Number(appState.activeLayoutBranchIndex||0);
      appState.branchLayouts=appState.branchLayouts||{};appState.branchLayouts[idx]=clone(appState.layout);
      if(typeof saveBranchLayouts==='function')saveBranchLayouts();
      if(typeof markLayoutDirty==='function')markLayoutDirty('medidas de mobiliario');
    }
    if(persist&&typeof vspaceActive!=='undefined'&&vspaceActive&&appState.screen==='virtual'){vspaceActive.modified=true;vspaceActive.render?.(true);vspaceActive.refreshInspector?.();}
  }finally{v222SyncBusy=false;}
}
function v222FurnitureForRack(rack,spec=v222Dimensions(rack)){
  const original=v222ModelFor(rack);if(!original?.furniture?.enabled)return original;
  const key=JSON.stringify([original.furnitureRevision||0,spec.width,spec.depth,spec.height,spec.levels,spec.slots]);
  let cache=v222FurnitureCache.get(original);const revision=Number(original.furnitureRevision||0);if(!cache||cache.revision!==revision){cache={revision,models:new Map()};v222FurnitureCache.set(original,cache);}const cached=cache.models.get(key);if(cached)return cached;
  const model=clone(original);
  for(const field of ['width','depth','height'])if(Math.abs(Number(model[field])-spec[field])>.001)resizeFurnitureIntoVolume(model,field,spec[field]);
  if(Number(model.levels)!==spec.levels)applyConstructionHorizontalSpaces(model,spec.levels,true);
  if(rack.furnitureOverrides?.slots!=null){deriveFurnitureLevels(model).forEach(level=>{model.furniture.logicalSlots[level.index]=spec.slots;});syncFurnitureModelToLegacy(model);}
  furnitureRefitModel(model);if(cache.models.size>=64)cache.models.delete(cache.models.keys().next().value);cache.models.set(key,model);return model;
}
function v222FurnitureMeshes(model){
  const f=model.furniture,W=Number(model.width),D=Number(model.depth),H=Number(model.height),t=Number(f.thickness||1.8);
  return getFurnitureRenderPieces(model).map(p=>{
    const item={piece:p,x:Number(p.x||0)+p.w/2,y:Number(p.z||0)+p.h/2,z:Number(p.y||0)+p.d/2,w:p.w,h:p.h,d:p.d,angle:0};
    if((p.type==='top'&&p.slopeTop||p.autoFit==='metal-top-beam')&&f.roofMode==='slope'){
      const metal=p.autoFit==='metal-top-beam',thickness=metal?Number(p.h):t,left=Number(f.leftHeight||H),right=Number(f.rightHeight||H),span=Math.max(1,W-(metal?thickness:2*t)),delta=right-left;
      Object.assign(item,{x:W/2,y:(left+right)/2-thickness/2,z:metal?item.z:D/2,w:Math.hypot(span,delta),h:thickness,d:metal?item.d:D,angle:Math.atan2(delta,span)});
    }else if(p.type==='brace'){
      const x1=Number(p.x||0),z1=Number(p.z||0),x2=Number(p.x2??x1+p.w),z2=Number(p.z2??z1+p.h),dx=x2-x1,dy=z2-z1;
      Object.assign(item,{x:(x1+x2)/2,y:(z1+z2)/2,z:D*.05,w:Math.max(.1,Math.hypot(dx,dy)),h:Math.max(.5,p.d),d:Math.max(.5,p.d),angle:Math.atan2(dy,dx)});
    }else if((p.type==='back'||p.type==='divider'&&p.roofFit)&&f.roofMode==='slope'){
      const bottom=Number(p.z||0),left=Math.max(bottom+.1,Math.min(bottom+p.h,furnitureRoofHeightAtX(model,p.x))),right=Math.max(bottom+.1,Math.min(bottom+p.h,furnitureRoofHeightAtX(model,p.x+p.w)));
      item.profile=[{x:p.x,y:bottom},{x:p.x+p.w,y:bottom},{x:p.x+p.w,y:right},{x:p.x,y:left}];
    }
    return item;
  });
}
function v222PieceGeometry(THREE,item,scale=1){
  if(item.profile){const shape=new THREE.Shape();shape.moveTo(item.profile[0].x*scale,item.profile[0].y*scale);item.profile.slice(1).forEach(p=>shape.lineTo(p.x*scale,p.y*scale));shape.closePath();return new THREE.ExtrudeGeometry(shape,{depth:Math.max(.001,item.d*scale),bevelEnabled:false});}
  return new THREE.BoxGeometry(Math.max(.001,item.w*scale),Math.max(.001,item.h*scale),Math.max(.001,item.d*scale));
}
function v222SetInstanceDimensions(rack,patch){
  if(!rack)return false;
  const trial=clone(rack),current=v222Dimensions(rack);trial.furnitureOverrides={...(rack.furnitureOverrides||{})};
  for(const key of ['width','depth','height'])if(patch[key]!=null){const n=Number(patch[key]);if(!Number.isFinite(n)||n<(key==='width'?30:key==='depth'?20:60)){showToast('Introduce una medida válida en centímetros.','warning');return false;}trial.furnitureOverrides[key]=n;}
  if(patch.reset)for(const key of ['width','depth','height'])delete trial.furnitureOverrides[key];
  trial.furnitureDataVersion=222;v222SyncRack(trial);
  const proposals=typeof vspaceFollowAttachedModules==='function'?vspaceFollowAttachedModules(rack,trial):[trial];
  if(!distributionIsFreeMoveAvailable()&&typeof distributionCanCommit==='function'&&!distributionCanCommit(trial)){showToast('El cambio de medidas produce una colisión o sale de la zona.','warning',3000);return false;}
  if(!distributionIsFreeMoveAvailable()&&typeof vspaceValidateRackProposals==='function'){const fitting=vspaceValidateRackProposals(proposals);if(!fitting.ok){showToast(fitting.msg,'warning',3000);return false;}}
  if(JSON.stringify(v222Dimensions(trial))===JSON.stringify(current)&&!patch.reset)return false;
  recordHistorySnapshot('distribution');proposals.forEach(next=>{const target=(appState.layout.racks||[]).find(r=>r.id===next.id);if(target)Object.assign(target,next);});persistActiveLayout(patch.reset?'Usar medidas del modelo':'Editar medidas del mueble');return true;
}
function distributionIsFreeMoveAvailable(){return typeof distributionIsFreeMove==='function'&&distributionIsFreeMove();}
