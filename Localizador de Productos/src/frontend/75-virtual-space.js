/* WMS V160 — Ambiente virtual de ubicaciones. Se integra con layout.racks y branchLayouts. */
  const VSPACE_TYPES = Object.freeze({
    rack:       {name:'Estantería industrial', icon:'▤', width:150,depth:55,height:225,levels:4,slots:3,color:0x7d8b88},
    mostrador:  {name:'Mostrador de madera',icon:'▰',width:170,depth:65,height:106,levels:2,slots:2,color:0xb99572},
    vitrina:    {name:'Vitrina de cristal',icon:'▥',width:130,depth:50,height:205,levels:3,slots:2,color:0xc19c74},
    contenedor: {name:'Gavetero organizador',icon:'▣',width:100,depth:58,height:145,levels:3,slots:3,color:0x93a5a0},
    cajonera:   {name:'Cómoda / cajonera',icon:'▦',width:120,depth:52,height:118,levels:4,slots:2,color:0xbe9d7a},
    caja:       {name:'Caja de cartón',icon:'□',width:56,depth:42,height:40,levels:1,slots:1,color:0xbd9564}
  });
  let vspaceActive = null;
  const vspaceEsc = value => escapeHtml(String(value ?? ''));
  const vspaceClamp = (v,min,max) => Math.min(max,Math.max(min,v));
  const vspaceFloat = (v,fallback) => v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : fallback;
  function vspaceSpec(rack){
    const kind = VSPACE_TYPES[rack?.virtualType] ? rack.virtualType : 'rack';
    const preset = VSPACE_TYPES[kind];
    const model = (appState.models||[]).find(m => m.id === rack?.modelId) || {};
    const physical = rack?.virtual || {};
    const scale = Math.max(.01,getScaleCmPerUnit());
    return {
      kind, title:String(rack?.virtualName || rack?.id || preset.name),
      width:vspaceClamp(vspaceFloat(physical.width, rack?.virtualType ? preset.width : vspaceFloat(model.width,rack?.w*scale||120)),30,10000),
      depth:vspaceClamp(vspaceFloat(physical.depth, rack?.virtualType ? preset.depth : vspaceFloat(model.depth,rack?.h*scale||50)),20,5000),
      height:vspaceClamp(vspaceFloat(physical.height,vspaceFloat(rack?.rackHeight, vspaceFloat(model.height,preset.height))),30,10000),
      levels:vspaceClamp(Math.round(vspaceFloat(physical.levels,vspaceFloat(model.levels,preset.levels))),1,12),
      slots:vspaceClamp(Math.round(vspaceFloat(physical.slots,vspaceFloat(model.slots,preset.slots))),1,12)
    };
  }
  function vspaceIsEditable(){ return String(appState.auth?.role||'') === 'admin' && !!appState.auth?.loggedIn; }
  // Índice SKU por mueble/nivel/posición: evita filtrar 10 000 productos por cada repisa.
  let vspaceProductIndexSource=null;
  let vspaceProductIndex=null;
  function vspaceProductIndexForBranch(){
    const products=appState.products||[];
    if(products===vspaceProductIndexSource&&vspaceProductIndex)return vspaceProductIndex;
    const index=new Map();
    const add=(rack,level,slot,p)=>{
      const id=String(rack||'').trim().toUpperCase();
      const l=Number(String(level||'').replace(/[^0-9]/g,''));
      const s=Number(String(slot||'').replace(/[^0-9]/g,''));
      if(!id||!l||!s)return;
      const key=`${id}|${l}|${s}`;
      if(!index.has(key))index.set(key,[]);
      const arr=index.get(key);
      if(arr.length<20 && !arr.some(row=>row.sku===p.sku))arr.push({sku:p.sku,name:p.nombre,quantity:1,manual:false});
    };
    products.forEach(p=>{
      add(p.rack,p.nivel,p.slot,p);
      if(String(p.rackStore||'').toUpperCase()!==String(p.rack||'').toUpperCase() || Number(p.nivelStore)!==Number(p.nivel) || Number(p.slotStore)!==Number(p.slot))
        add(p.rackStore,p.nivelStore,p.slotStore,p);
    });
    vspaceProductIndexSource=products;vspaceProductIndex=index;
    return index;
  }
  function vspaceProductsForSlot(rack,level,slot){
    const overrides = Array.isArray(rack.virtualPlacements) ? rack.virtualPlacements : [];
    const manual = overrides.filter(p=> Number(p.level) === level && Number(p.slot) === slot);
    if(manual.length) return manual.map(p=>({ ...p,manual:true }));
    return vspaceProductIndexForBranch().get(`${String(rack.id||'').trim().toUpperCase()}|${level}|${slot}`)||[];
  }
  function vspaceAllAssignments(){
    const rows=[];
    (appState.layout?.racks||[]).forEach(r=>{
      const sp=vspaceSpec(r);
      for(let l=1;l<=sp.levels;l++) for(let s=1;s<=sp.slots;s++){
        vspaceProductsForSlot(r,l,s).forEach(p=>rows.push({...p,rackId:r.id,level:l,slot:s,code:`${r.id}-N${l}-S${s}`}));
      }
    });
    return rows;
  }
  function vspacePointInZone(p,zone){
    const pts=zone?.pts||[]; if(pts.length<3)return false;
    let inside=false;
    for(let i=0,j=pts.length-1;i<pts.length;j=i++){
      if(((pts[i].y>p.y)!==(pts[j].y>p.y))&&(p.x<(pts[j].x-pts[i].x)*(p.y-pts[i].y)/(pts[j].y-pts[i].y)+pts[i].x))inside=!inside;
    }
    return inside;
  }
  function vspaceCorners(r){
    const hw=(Number(r.w)||60)/2,hd=(Number(r.h)||45)/2;
    const cx=Number(r.x)+hw,cy=Number(r.y)+hd;
    return [[-hw,-hd],[hw,-hd],[hw,hd],[-hw,hd]].map(([dx,dy])=>({x:cx+dx,y:cy+dy}));
  }
  function vspaceBounds(r){
    const ps=vspaceCorners(r);
    return {left:Math.min(...ps.map(p=>p.x)),right:Math.max(...ps.map(p=>p.x)),top:Math.min(...ps.map(p=>p.y)),bottom:Math.max(...ps.map(p=>p.y))};
  }
  function vspaceFits(candidate,ignoreId=''){
    const zone=(appState.layout?.zones||[]).find(z=>z.id===candidate.zoneId);
    if(!zone || !vspaceCorners(candidate).every(p=>vspacePointInZone(p,zone)))return {ok:false,msg:'El mueble sale de la zona. Cambia su posición o dimensiones.'};
    const b=vspaceBounds(candidate);
    const collision=(appState.layout.racks||[]).find(r=>{
      if(r.id===ignoreId || r.zoneId!==candidate.zoneId)return false;
      const aLow=Number(r.baseHeight||0), bLow=Number(candidate.baseHeight||0);const aHigh=aLow+Number(r.rackHeight||vspaceSpec(r).height||200),bHigh=bLow+Number(candidate.rackHeight||vspaceSpec(candidate).height||200);if(aHigh<=bLow+.5 || bHigh<=aLow+.5)return false;
      const q=vspaceBounds(r);
      return b.left<q.right-2 && b.right>q.left+2 && b.top<q.bottom-2 && b.bottom>q.top+2;
    });
    return collision?{ok:false,msg:`Colisión detectada con ${collision.virtualName||collision.id}.`}:{ok:true,msg:''};
  }
  // V196: apilamiento interactivo sin perder la identidad ni las piezas de los muebles.
  function vspaceStackHeight(r){ return Math.max(1, Number(r?.rackHeight||vspaceSpec(r).height||200)); }
  function vspaceStackFamily(rootId){
    const rows=appState.layout?.racks||[];
    const seen=new Set(), result=[], queue=[rootId];
    while(queue.length){
      const id=queue.shift();
      if(!id||seen.has(id))continue;
      seen.add(id);
      const r=rows.find(item=>item.id===id);
      if(!r)continue;
      result.push(r);
      rows.filter(item=>item.stackedOnId===id&&!seen.has(item.id)).forEach(item=>queue.push(item.id));
    }
    return result;
  }
  function vspaceStackIntersect(a,b){
    const az=Number(a.baseHeight||0),bz=Number(b.baseHeight||0);
    if(az+vspaceStackHeight(a)<=bz+.5||bz+vspaceStackHeight(b)<=az+.5)return false;
    const ap=vspaceBounds(a),bp=vspaceBounds(b);
    return ap.left<bp.right-1 && ap.right>bp.left+1 && ap.top<bp.bottom-1 && ap.bottom>bp.top+1;
  }
  function vspaceValidateRackProposals(changes){
    const ids=new Set(changes.map(r=>r.id));
    const others=(appState.layout?.racks||[]).filter(r=>!ids.has(r.id));
    for(const p of changes){
      const zone=(appState.layout?.zones||[]).find(z=>z.id===p.zoneId);
      if(!zone||!vspaceCorners(p).every(pt=>vspacePointInZone(pt,zone)))return {ok:false,msg:`${p.id} no cabe en la zona.`};
      const crash=others.find(r=>r.zoneId===p.zoneId&&vspaceStackIntersect(p,r));
      if(crash)return {ok:false,msg:`Interferencia con ${crash.virtualName||crash.id}.`};
    }
    for(let i=0;i<changes.length;i++)for(let j=i+1;j<changes.length;j++){
      if(changes[i].zoneId===changes[j].zoneId&&vspaceStackIntersect(changes[i],changes[j]))return {ok:false,msg:`Los módulos ${changes[i].id} y ${changes[j].id} se superponen.`};
    }
    const proposedMap=new Map(changes.map(item=>[item.id,item]));
    for(const child of changes){
      if(!child.stackedOnId)continue;
      const parent=proposedMap.get(child.stackedOnId)||(appState.layout?.racks||[]).find(r=>r.id===child.stackedOnId);
      if(!parent)return {ok:false,msg:`No se encontró el soporte vinculado de ${child.id}.`};
      const top=Number(parent.baseHeight||0)+vspaceStackHeight(parent),bottom=Number(child.baseHeight||0);
      if(child.zoneId!==parent.zoneId||Math.abs(top-bottom)>.51)return {ok:false,msg:`La cota de ${child.id} no coincide con la superficie de su soporte.`};
      const c=vspaceBounds(child),p=vspaceBounds(parent);
      if(c.left<p.left-1||c.right>p.right+1||c.top<p.top-1||c.bottom>p.bottom+1)return {ok:false,msg:`${child.id} sobresale de su soporte. Reduce sus medidas o desvincúlalo.`};
    }
    return {ok:true,msg:''};
  }
  function vspaceFollowAttachedModules(original,next){
    const family=vspaceStackFamily(original.id);
    const dx=Number(next.x||0)-Number(original.x||0),dy=Number(next.y||0)-Number(original.y||0);
    const dz=(Number(next.baseHeight||0)+vspaceStackHeight(next))-(Number(original.baseHeight||0)+vspaceStackHeight(original));
    return family.map(r=>r.id===original.id?next:{...r,x:Number(r.x||0)+dx,y:Number(r.y||0)+dy,baseHeight:Number(r.baseHeight||0)+dz,zoneId:next.zoneId});
  }
  function vspaceStackOnTop(sourceId,targetId){
    const racks=appState.layout?.racks||[];
    const source=racks.find(r=>r.id===sourceId),target=racks.find(r=>r.id===targetId);
    if(!source||!target)return {ok:false,msg:'No se encontró el mueble seleccionado.'};
    if(sourceId===targetId)return {ok:false,msg:'Debes seleccionar otro mueble como soporte.'};
    if(source.stackGroupId)return {ok:false,msg:'El módulo pertenece a un conjunto modular. Sepáralo desde layout antes de colocarlo encima.'};
    if(source.zoneId!==target.zoneId && !racks.some(r=>r.zoneId===target.zoneId))return {ok:false,msg:'El soporte no tiene una zona válida.'};
    const family=vspaceStackFamily(sourceId);
    if(family.some(r=>r.id===targetId))return {ok:false,msg:'No se puede colocar un mueble sobre uno de sus propios módulos dependientes.'};
    const topLeftX=Number(target.x||0)+(Number(target.w||0)-Number(source.w||0))/2;
    const topLeftY=Number(target.y||0)+(Number(target.h||0)-Number(source.h||0))/2;
    const targetBounds=vspaceBounds(target);
    const candidate={...source,x:topLeftX,y:topLeftY,zoneId:target.zoneId,baseHeight:Number(target.baseHeight||0)+vspaceStackHeight(target),stackedOnId:target.id};
    const childBounds=vspaceBounds(candidate);
    const epsilon=1;
    if(childBounds.left<targetBounds.left-epsilon||childBounds.right>targetBounds.right+epsilon||childBounds.top<targetBounds.top-epsilon||childBounds.bottom>targetBounds.bottom+epsilon){
      return {ok:false,msg:'La base del mueble superior sobresale del soporte. Usa un soporte mayor o reduce el módulo.'};
    }
    const dx=candidate.x-Number(source.x||0),dy=candidate.y-Number(source.y||0),dz=candidate.baseHeight-Number(source.baseHeight||0);
    const proposals=family.map(r=>r.id===sourceId?candidate:{...r,x:Number(r.x||0)+dx,y:Number(r.y||0)+dy,baseHeight:Number(r.baseHeight||0)+dz,zoneId:target.zoneId});
    const valid=vspaceValidateRackProposals(proposals);
    if(!valid.ok)return valid;
    return {ok:true,changes:proposals,source,target,npt:candidate.baseHeight};
  }
  function vspaceStackCommit(plan){
    if(!plan?.ok)return false;
    if(typeof recordHistorySnapshot==='function')recordHistorySnapshot('distribution');
    plan.changes.forEach(next=>{const rack=(appState.layout?.racks||[]).find(r=>r.id===next.id);if(!rack)return;Object.assign(rack,{x:next.x,y:next.y,zoneId:next.zoneId,baseHeight:next.baseHeight});if(next.stackedOnId)rack.stackedOnId=next.stackedOnId;});
    persistActiveLayout();
    return true;
  }
  function vspaceFindPosition(template){
    const zones=appState.layout.zones||[];
    for(const zone of zones){
      const ps=zone.pts||[]; if(!ps.length)continue;
      const minX=Math.min(...ps.map(p=>p.x)),maxX=Math.max(...ps.map(p=>p.x));
      const minY=Math.min(...ps.map(p=>p.y)),maxY=Math.max(...ps.map(p=>p.y));
      for(let y=minY+14;y<maxY-template.h-7;y+=16){
        for(let x=minX+14;x<maxX-template.w-7;x+=16){
          const r={...template,x,y,zoneId:zone.id};
          if(vspaceFits(r).ok)return r;
        }
      }
    }
    return null;
  }
  function vspaceToast(msg,isError=false){
    const el=document.getElementById('vspaceNotice');
    if(el){el.textContent=String(msg);el.classList.toggle('error',isError);}
    if(isError && typeof showToast==='function')showToast(msg,'error',2700);
  }
  function vspaceCommit(label='ambiente virtual'){
    persistActiveLayout();
    if(vspaceActive){vspaceActive.modified=true;vspaceActive.render?.(true);}
    vspaceToast(`Cambios locales guardados · ${label}. Usa «Guardar en nube» para sincronizarlos.`);
  }
  function vspaceCreate(kind){
    if(!vspaceIsEditable()) return vspaceToast('Se requiere permiso de administrador para editar.',true);
    const p=VSPACE_TYPES[kind];if(!p)return;
    const modelId=`v160_${kind}_${Date.now().toString(36)}`;
    const model={id:modelId,name:p.name,levels:p.levels,slots:p.slots,width:p.width,depth:p.depth,height:p.height,style:kind};
    // Los modelos se agregan a la biblioteca ya utilizada por el plano 2D y el visor anterior.
    appState.models.push(model);
    const scale=getScaleCmPerUnit();
    const rack={id:`M-${kind.toUpperCase().slice(0,3)}-${Date.now().toString(36).toUpperCase()}`,
      zoneId:appState.layout.zones?.[0]?.id||'Z1',x:0,y:0,
      w:p.width/scale,h:p.depth/scale,rot:0,modelId,baseHeight:0,rackHeight:p.height,
      virtualType:kind,virtualName:`${p.name} ${(appState.layout.racks||[]).filter(r=>r.virtualType===kind).length+1}`,
      virtual:{width:p.width,depth:p.depth,height:p.height,levels:p.levels,slots:p.slots},virtualPlacements:[],virtualContainers:[]};
    const available=vspaceFindPosition(rack);
    if(!available){appState.models=appState.models.filter(m=>m.id!==modelId);return vspaceToast('No hay espacio libre suficiente. Amplía la zona en Plano / Estructura.',true);}
    Object.assign(rack,available);
    appState.layout.racks.push(rack);
    vspaceActive.selectedId=rack.id;vspaceActive.selectedLevel=1;vspaceActive.selectedSlot=1;
    vspaceCommit(rack.virtualName);
    vspaceActive?.refreshInspector();
  }
  function vspaceUpdateRack(rack,patch){
    if(!rack || !vspaceIsEditable())return;
    const cloneRack={...rack,virtual:{...rack.virtual}};
    if(patch.name!==undefined)cloneRack.virtualName=String(patch.name).trim().slice(0,80)||rack.id;
    if(patch.x!==undefined)cloneRack.x=vspaceFloat(patch.x,rack.x);
    if(patch.y!==undefined)cloneRack.y=vspaceFloat(patch.y,rack.y);
    if(patch.npt!==undefined)cloneRack.baseHeight=vspaceClamp(vspaceFloat(patch.npt,Number(rack.baseHeight||0)),0,20000);
    if(patch.rot!==undefined)cloneRack.rot=((Math.round(vspaceFloat(patch.rot,0)/90)*90)%360+360)%360;
    for(const key of ['width','depth','height','levels','slots'])if(patch[key]!==undefined){
      const limits=key==='levels'||key==='slots'?[1,12]:key==='height'?[30,10000]:[20,10000];
      cloneRack.virtual[key]=vspaceClamp(key==='levels'||key==='slots'?Math.round(vspaceFloat(patch[key],rack.virtual?.[key]||1)):vspaceFloat(patch[key],rack.virtual?.[key]||100),...limits);
    }
    const spec=vspaceSpec(cloneRack), scale=getScaleCmPerUnit();
    const width=spec.width/scale, depth=spec.depth/scale;
    const rotated=cloneRack.rot%180!==0;
    const nextW=rotated?depth:width,nextH=rotated?width:depth;
    // Mantener centro durante redimensionamiento y giro.
    if(patch.width!==undefined||patch.depth!==undefined||patch.rot!==undefined){
      if(patch.x===undefined)cloneRack.x=Number(rack.x)+(Number(rack.w)-nextW)/2;
      if(patch.y===undefined)cloneRack.y=Number(rack.y)+(Number(rack.h)-nextH)/2;
      cloneRack.w=nextW;cloneRack.h=nextH;
    }
    cloneRack.rackHeight=spec.height;
    if(rack.stackedOnId && (Math.abs(Number(cloneRack.x||0)-Number(rack.x||0))>.01 || Math.abs(Number(cloneRack.y||0)-Number(rack.y||0))>.01 || Math.abs(Number(cloneRack.baseHeight||0)-Number(rack.baseHeight||0))>.01)){
      return vspaceToast('Este módulo está apoyado sobre otro. Para desplazarlo libremente usa «Desvincular soporte», o mueve el conjunto desde su base.',true);
    }
    // No dejar ubicaciones con SKU o cajas invisibles tras reducir los niveles.
    const invalid=(rack.virtualPlacements||[]).some(a=>Number(a.level)>spec.levels||Number(a.slot)>spec.slots)
      ||(rack.virtualContainers||[]).some(a=>a.kind!=='none'&&Number(a.count)>0&&(Number(a.level)>spec.levels||Number(a.slot)>spec.slots));
    if(invalid){vspaceToast('Hay productos o cajas en niveles que desaparecerían. Reubícalos antes de reducirlos.',true);vspaceActive?.refreshInspector();return;}
    const proposals=vspaceFollowAttachedModules(rack,cloneRack);
    const fitting=vspaceValidateRackProposals(proposals);
    if(!fitting.ok){vspaceToast(fitting.msg,true);vspaceActive?.refreshInspector();return;}
    if(typeof recordHistorySnapshot==='function')recordHistorySnapshot('structure');
    proposals.forEach(next=>{const current=(appState.layout.racks||[]).find(item=>item.id===next.id);if(current)Object.assign(current,next);});
    // Actualizar modelo compartido sin cambiar la identidad del rack.
    const model=appState.models.find(m=>m.id===rack.modelId);
    if(model && rack.virtualType)Object.assign(model,{name:rack.virtualName,width:spec.width,depth:spec.depth,height:spec.height,levels:spec.levels,slots:spec.slots});
    rack.virtualPlacements=(rack.virtualPlacements||[]).filter(p=>p.level<=spec.levels&&p.slot<=spec.slots);
    vspaceActive.selectedLevel=vspaceClamp(vspaceActive.selectedLevel,1,spec.levels);
    vspaceActive.selectedSlot=vspaceClamp(vspaceActive.selectedSlot,1,spec.slots);
    vspaceCommit('propiedades');vspaceActive?.refreshInspector();
  }
  function vspaceAssign(rack,level,slot,sku,qty=1){
    if(!rack||!vspaceIsEditable())return;
    const spec=vspaceSpec(rack);level=Math.round(Number(level));slot=Math.round(Number(slot));
    if(!(level>=1&&level<=spec.levels&&slot>=1&&slot<=spec.slots))return vspaceToast('Nivel o posición fuera del mueble.',true);
    sku=String(sku||'').trim().slice(0,120);
    const products=appState.products||[];
    const product=products.find(p=>String(p.sku||'').toLowerCase()===sku.toLowerCase()||String(p.barras||'')===sku);
    rack.virtualPlacements=(rack.virtualPlacements||[]).filter(p=>!(Number(p.level)===level&&Number(p.slot)===slot));
    if(sku)rack.virtualPlacements.push({level,slot,sku,name:String(product?.nombre||''),quantity:vspaceClamp(Math.round(Number(qty)||1),1,100000)});
    vspaceCommit(sku?`SKU ${sku} en N${level} / P${slot}`:'asignación eliminada');vspaceActive?.refreshInspector();
  }
  function renderVirtualSpace(){
    if(vspaceActive?.destroy) vspaceActive.destroy();
    ensureAppRuntimeState();
    contentTitle.textContent='';
    contentSubtitle.textContent='';
    contentStatus.textContent='';
    contentFootRight.textContent='';
    setTags([]);
    const canEdit=vspaceIsEditable();
    ensureLayoutDecorations();
    // La maqueta y el CAD comparten muros. Convertir el perímetro inicial una sola vez
    // para que las paredes que antes eran solo visuales también sean editables.
    ensureLayoutMeta();
    if(!appState.layout.meta.architectureInitializedV180){
      if(!(appState.layout.walls || []).length){
        (appState.layout.zones || []).forEach(zone => {
          (zone.pts || []).forEach((pt,i,pts)=>{
            const next=pts[(i+1)%pts.length];
            if(next && Math.hypot(next.x-pt.x,next.y-pt.y)>=20){
              const w=createWallSegment(pt,next);
              if(w){w.name=`Muro ${zone.id}-${i+1}`; w.zoneBoundarySource={zoneId:zone.id,edgeIndex:i};}
            }
          });
        });
      }
      appState.layout.meta.architectureInitializedV180=true;
      // Los usuarios de solo lectura pueden visualizar el perímetro sin generar escrituras.
      if(canEdit) persistActiveLayout();
    }
    const typelist=Object.entries(VSPACE_TYPES).map(([id,p])=>`<button type="button" class="vspace-catalog-btn" data-vspace-add="${id}" ${canEdit?'':'disabled'}><b>${p.icon}</b><span>${vspaceEsc(p.name)}</span><small>${p.levels} niveles</small></button>`).join('');
    contentWrap.innerHTML=`<div class="vspace-root" id="vspaceRoot" data-edit-mode="build">
      <div class="vspace-toolbar"><div class="vspace-toolbar-heading"><strong>Espacio virtual 3D</strong><div class="vspace-toolbar-meta"><span class="vspace-chip" id="vspaceBranch">Sucursal activa</span><span class="vspace-chip" id="vspaceStats">—</span><span class="vspace-edit-note" id="vspaceModeHint">Modo construir: agrega y organiza mobiliario.</span></div></div>
      <div class="vspace-toolbar-right"><div class="vspace-v200-filter" role="group" aria-label="Filtrar niveles de muebles"><span>Altura</span><button type="button" data-vspace-rack-height="all" class="active" aria-pressed="true">Todos</button><button type="button" data-vspace-rack-height="0">N1</button><button type="button" data-vspace-rack-height="1">N2</button><button type="button" data-vspace-rack-height="2">N3</button></div><div class="vspace-mode-switch"><button data-vspace-mode="build" class="active">Construir</button><button data-vspace-mode="place">Ubicar</button><button data-vspace-mode="explore">Explorar</button></div><button data-vspace-cam="iso" class="active">Isométrica</button><button data-vspace-cam="top">Planta</button><button data-vspace-cam="front">Frontal</button><button data-vspace-action="fit">Ajustar</button><button data-vspace-action="focus">Enfocar</button><button data-vspace-action="toggle-wall" class="active" title="Diorama dinámico: conserva un zócalo de 20 cm al ver la cara exterior y la altura completa al ver la cara interior. Las divisiones interiores permanecen visibles. Pulsa para ver muros completos o esconder todos." aria-label="Cambiar visibilidad de muros: Diorama">Diorama</button><button data-vspace-action="move" ${canEdit?'':'disabled'}>Mover: OFF</button><button type="button" data-vspace-action="stack" ${canEdit?'':'disabled'} title="Selecciona el mueble superior y después el inferior">Colocar encima</button><button data-vspace-action="save" class="vspace-save" ${canEdit?'':'disabled'}>Guardar en nube</button></div></div>
      <div class="vspace-main"><aside class="vspace-left"><div class="vspace-sidebar-section" data-vs-section="library"><h4>Biblioteca 3D</h4><p>Agrega estanterías, vitrinas, cajoneras o contenedores desde este panel.</p><div class="vspace-catalog">${typelist}</div><div class="vspace-saved-models"><strong>Muebles creados</strong><label for="vspaceSavedModel">Modelo guardado</label><select id="vspaceSavedModel"><option value="">Selecciona un modelo</option>${(appState.models||[]).filter(m=>m?.furniture?.enabled).map(m=>`<option value="${vspaceEsc(m.id)}">${vspaceEsc(m.name||m.id)}</option>`).join('')}</select><button id="vspaceAddSavedModel" ${canEdit?'':'disabled'}>Añadir al espacio 3D</button></div><button class="vspace-example-btn" data-vspace-action="sample" ${canEdit?'':'disabled'}>✧ Preparar ambiente de ejemplo</button></div>
      <div class="vspace-sidebar-section" data-vs-section="search"><h4>Buscar producto / SKU</h4><div class="vspace-search"><input id="vspaceFindSku" placeholder="SKU, nombre o barras…" autocomplete="off"><button data-vspace-action="find">⌕</button></div><div class="vspace-hits" id="vspaceHits"></div></div>
      <div class="vspace-sidebar-section" data-vs-section="objects"><h4>Muebles ubicados</h4><div id="vspaceObjects" class="vspace-object-list"></div></div></aside>
      <section class="vspace-stage"><canvas id="vspaceCanvas" aria-label="Visualizador tridimensional interactivo del almacén"></canvas><div id="vspaceStackPrompt" class="vspace-stack-prompt" hidden><span id="vspaceStackPromptText">Selecciona un mueble de soporte.</span><button type="button" id="vspaceStackCancel">Cancelar · Esc</button></div>
      <details class="vspace-help"><summary title="Controles de navegación 3D" aria-label="Mostrar ayuda de navegación">? Ayuda</summary><div>Arrastrar: orbitar · Shift + arrastrar: desplazar · Rueda: zoom · Doble clic: enfocar · F: enfocar · 1/2/3: vistas</div></details>
      <div class="vspace-compass">ISO</div><div class="vspace-loading" id="vspaceLoading">Preparando el espacio tridimensional…</div></section>
      <aside class="vspace-inspector"><h4 id="vspaceInspectorHeading">Inspector de ubicaciones</h4>
      <div class="vspace-panel-tabs" role="group" aria-label="Editor activo"><button type="button" data-vspace-panel="furniture" class="active">Mobiliario</button><button type="button" data-vspace-panel="architecture">Arquitectura</button><button type="button" data-vspace-panel="urban">Urbanismo</button></div>
      <div id="vspaceInspector" class="vspace-inspector-body">Selecciona un mueble o abre Arquitectura para modificar muros y vanos.</div></aside></div>
      <div class="vspace-bottom"><span id="vspaceNotice" aria-live="polite">Los cambios se guardan localmente; «Guardar en nube» sincroniza la sucursal.</span></div>
    </div>`;
    contentStatus.textContent='Ambiente 3D listo para diseñar';
    if(!document.getElementById('vspaceV164Styles')){
      const style=document.createElement('style');style.id='vspaceV164Styles';style.textContent=`
      .vspace-stage{display:block}
      .vspace-object small{display:block;opacity:.75}
      `;document.head.appendChild(style);
    }
    const root=document.getElementById('vspaceRoot'),canvas=root.querySelector('#vspaceCanvas');
    const state={root,canvas,selectedId:appState.selectedRackLayoutId||(appState.layout?.racks||[])[0]?.id||'',stackSourceId:'',selectedLevel:1,selectedSlot:1,inspectorMode:'furniture',selectedWallId:appState.selectedWallId||'',selectedOpeningId:appState.selectedOpeningId||'',selectedStreetId:appState.selectedStreetId||'',selectedStreetFurnitureId:appState.selectedStreetFurnitureId||'',drawWallStart:null,modified:false,wallVisible:true,wallDisplay:'diorama',move:false,mode:'iso',editMode:'build',destroyed:false,objects:new Map(),architectureMeshes:[]};
    vspaceActive=state;
    const rackAtLevel = r => {
      const level=appState.editor?.visibleRackLevel;
      if(level==='all' || level===undefined)return true;
      const index=r.stackGroupId ? Math.max(0,Number(r.stackLevel||0)) : Math.max(0,Math.round(Number(r.baseHeight||0)/Math.max(1,Number(r.rackHeight||vspaceSpec(r).height||200))));
      return index===Number(level);
    };
    const update3DLevelButtons=()=>root.querySelectorAll('[data-vspace-rack-height]').forEach(b=>{const active=String(appState.editor?.visibleRackLevel??'all')===b.dataset.vspaceRackHeight;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});
    root.querySelectorAll('[data-vspace-rack-height]').forEach(b=>b.addEventListener('click',()=>{
      if(!appState.editor)appState.editor={};
      appState.editor.visibleRackLevel=b.dataset.vspaceRackHeight;
      update3DLevelButtons();
      if(state.selectedId && !rackAtLevel((appState.layout?.racks||[]).find(r=>r.id===state.selectedId)||{}))state.selectedId='';
      state.refreshInspector?.();state.refreshObjects?.();state.render?.(true);
    }));
    update3DLevelButtons();
    const getRack=()=>appState.layout.racks?.find(r=>r.id===state.selectedId)||null;
    const canWrite=()=>vspaceIsEditable();
    const stackButton=root.querySelector('[data-vspace-action="stack"]');
    const stackPrompt=root.querySelector('#vspaceStackPrompt');
    const syncStackPrompt=()=>{
      const armed=!!state.stackSourceId;
      if(stackPrompt)stackPrompt.hidden=!armed;
      if(stackButton){stackButton.classList.toggle('active',armed);stackButton.textContent=armed?'Cancelar apilamiento':'Colocar encima';stackButton.setAttribute('aria-pressed',String(armed));}
      root.classList.toggle('vspace-stacking-mode',armed);
      const source=(appState.layout?.racks||[]).find(r=>r.id===state.stackSourceId);
      const label=root.querySelector('#vspaceStackPromptText');
      if(label)label.textContent=`Mueble superior: ${source?.virtualName||source?.id||'—'}. Ahora haz clic en el mueble inferior (soporte).`;
      root.querySelectorAll('[data-vspace-select]').forEach(btn=>btn.classList.toggle('stack-source',armed&&btn.dataset.vspaceSelect===state.stackSourceId));
    };
    const cancelStackMode=(quiet=false)=>{if(!state.stackSourceId)return;state.stackSourceId='';syncStackPrompt();if(!quiet)vspaceToast('Colocación encima cancelada.');};
    const startStackMode=()=>{
      if(!canWrite())return;
      if(state.stackSourceId){cancelStackMode();return;}
      const selected=getRack();if(!selected)return vspaceToast('Selecciona primero el mueble que irá arriba.',true);
      if(selected.stackGroupId)return vspaceToast('Separa primero el módulo del conjunto modular desde Editar layout.',true);
      state.inspectorMode='furniture';state.archDrawMode=false;state.drawWallStart=null;
      root.querySelectorAll('[data-vspace-panel]').forEach(btn=>btn.classList.toggle('active',btn.dataset.vspacePanel==='furniture'));
      const inspectorHeading=root.querySelector('#vspaceInspectorHeading');if(inspectorHeading)inspectorHeading.textContent='Inspector de ubicaciones';
      state.stackSourceId=selected.id;
      state.move=false;
      const moveBtn=root.querySelector('[data-vspace-action="move"]');if(moveBtn){moveBtn.textContent='Mover: OFF';moveBtn.classList.remove('active');}
      syncStackPrompt();vspaceToast(`Ahora selecciona el soporte de ${selected.virtualName||selected.id} en el visor 3D o en «Muebles ubicados».`);
    };
    const finishStackMode=targetId=>{
      if(!state.stackSourceId)return false;
      const sourceId=state.stackSourceId;
      const plan=vspaceStackOnTop(sourceId,targetId);
      if(!plan.ok){vspaceToast(plan.msg,true);syncStackPrompt();return false;}
      if(!vspaceStackCommit(plan))return false;
      cancelStackMode(true);
      state.selectedId=sourceId;appState.selectedRackLayoutId=sourceId;appState.selectedRack=sourceId;
      state.refreshInspector();state.render?.(true);
      vspaceToast(`«${plan.source.virtualName||sourceId}» colocado sobre «${plan.target.virtualName||targetId}» · NPT +${Math.round(plan.npt)} cm. Guarda en nube para sincronizar.`);
      state.modified=true;
      return true;
    };
    stackButton?.addEventListener('click',startStackMode);
    root.querySelector('#vspaceStackCancel')?.addEventListener('click',()=>cancelStackMode());
    state.stackEscapeHandler=e=>{
      if(e.key==='Escape'&&state.stackSourceId){cancelStackMode();e.preventDefault();e.stopImmediatePropagation();}
    };
    window.addEventListener('keydown',state.stackEscapeHandler);
    const collectScenePoints=()=>{
      const pts=[];
      (appState.layout.zones||[]).forEach(z=>(z.pts||[]).forEach(p=>pts.push(p)));
      const sitePts = Array.isArray(appState.layout?.meta?.siteBoundary?.pts) ? appState.layout.meta.siteBoundary.pts : [];
      sitePts.forEach(p=>pts.push(p));
      v219TotalContours().flat().forEach(p=>pts.push(p));
      (appState.layout.streets||[]).forEach(s=>[...(s.sidewalkPts||[]),...(s.roadPts||[]),...(s.outerSidewalkPts||[]),...(s.sidewalkExtraContours||[]).flat()].forEach(p=>pts.push(p)));
      if(!pts.length)(appState.layout.racks||[]).forEach(r=>pts.push({x:r.x,y:r.y},{x:r.x+r.w,y:r.y+r.h}));
      return pts;
    };
    let zoneBounds=collectScenePoints();
    let mx=zoneBounds.length?(Math.min(...zoneBounds.map(p=>Number(p.x)))+Math.max(...zoneBounds.map(p=>Number(p.x))))/2:200;
    let my=zoneBounds.length?(Math.min(...zoneBounds.map(p=>Number(p.y)))+Math.max(...zoneBounds.map(p=>Number(p.y))))/2:180;
    const refreshSceneFrame=()=>{
      zoneBounds=collectScenePoints();
      mx=zoneBounds.length?(Math.min(...zoneBounds.map(p=>Number(p.x)))+Math.max(...zoneBounds.map(p=>Number(p.x))))/2:mx;
      my=zoneBounds.length?(Math.min(...zoneBounds.map(p=>Number(p.y)))+Math.max(...zoneBounds.map(p=>Number(p.y))))/2:my;
    };
    const coord=p=>({x:(p.x-mx)*getScaleCmPerUnit()/100,z:(p.y-my)*getScaleCmPerUnit()/100});
    const invCoord=p=>({x:p.x*100/getScaleCmPerUnit()+mx,y:p.z*100/getScaleCmPerUnit()+my});
    const formatPosition=r=>`${Math.round(Number(r.x))}, ${Math.round(Number(r.y))}`;
    const lock=canWrite()?'':'disabled';
    const branch=(appState.admin?.branches||[])[getActiveLayoutBranchIndex()];
    root.querySelector('#vspaceBranch').textContent=branch?.name||`Sucursal ${getActiveLayoutBranchIndex()+1}`;
    const modeNotes={build:'Modo construir: agrega y organiza mobiliario.',place:'Modo ubicar: asigna niveles, cajas y SKU.',explore:'Modo explorar: enfócate en el espacio sin paneles laterales.'};
    state.applyEditMode=(mode='build')=>{
      state.editMode=['build','place','explore'].includes(mode)?mode:'build';
      root.setAttribute('data-edit-mode',state.editMode);
      root.querySelectorAll('[data-vspace-mode]').forEach(btn=>btn.classList.toggle('active',btn.dataset.vspaceMode===state.editMode));
      const note=root.querySelector('#vspaceModeHint'); if(note) note.textContent=modeNotes[state.editMode]||modeNotes.build;
    };
    state.applyEditMode(state.editMode);

    state.refreshMiniLayout=()=>{};
    state.refreshObjects=()=>{
      root.querySelector('#vspaceObjects').innerHTML=(appState.layout.racks||[]).map(r=>{
        const sp=vspaceSpec(r),active=r.id===state.selectedId;
        return `<button type="button" class="vspace-object ${active?'active':''}" data-vspace-select="${vspaceEsc(r.id)}"><b>${vspaceEsc(sp.title)}</b><small>${vspaceEsc(r.id)} · ${sp.levels} niveles · ${formatPosition(r)}</small></button>`;
      }).join('')||'<p class="vspace-muted">No hay muebles. Añade uno desde la biblioteca.</p>';
      const assigned=vspaceAllAssignments();
      root.querySelector('#vspaceStats').textContent=`${(appState.layout.racks||[]).length} muebles · ${assigned.length} ubicaciones`;
      syncStackPrompt();
    };
    const archUnit = () => Math.max(.0001,getScaleCmPerUnit());
    const wallLen = wall => Math.hypot(Number(wall.x2)-Number(wall.x1),Number(wall.y2)-Number(wall.y1));
    const safeArchNum = (raw,min,max, fallback) => {
      const n=Number(raw); return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;
    };
    const selectArch = (wallId, openingId='') => {
      state.inspectorMode='architecture';state.selectedWallId=wallId||'';state.selectedOpeningId=openingId||'';
      appState.selectedWallId=state.selectedWallId;appState.selectedOpeningId=state.selectedOpeningId;
      state.drawWallStart=null;state.refreshInspector();state.render?.(true);
    };
    state.selectArch=selectArch;
    const validOpening = (candidate,wall,omitId='') => {
      const L=wallLen(wall), u=archUnit();
      const width=Number(candidate.width||0), sill=Number(candidate.sill||0), h=Number(candidate.height||0), H=Number(wall.height||290);
      const position=safeArchNum(candidate.t,0,1,.5)*L;
      if(L<60/u) return 'El muro es demasiado corto para instalar una abertura.';
      if(width<35/u || width>L-20/u) return 'El ancho no cabe entre los extremos del muro.';
      if(sill<0||h<=0||sill+h>H+0.01) return 'La abertura excede la altura del muro.';
      if(position-width/2<10/u||position+width/2>L-10/u) return 'Deja al menos 10 cm libres en cada extremo.';
      const collision=(appState.layout.openings||[]).find(other=>other.wallId===wall.id && other.id!==omitId &&
        Math.abs(safeArchNum(other.t,0,1,.5)*L-position)<(Number(other.width||90)+width)/2+8/u);
      return collision?`Se superpone con la abertura ${collision.id}.`:'';
    };
    // V187: urbanismo comparte los mismos datos que la calle del editor CAD.
    state.refreshUrbanInspector=()=>{
      const host=root.querySelector('#vspaceInspector');
      if(!host) return;
      const streets=Array.isArray(appState.layout?.streets)?appState.layout.streets:[];
      const selected=streets.find(street=>street.id===state.selectedStreetId)||streets[0]||null;
      if(selected && !state.selectedStreetId) state.selectedStreetId=selected.id;
      if(selected) ensureStreetVisualDefaults(selected);
      const urban=selected?.streetFurniture?.find(item=>item.id===state.selectedStreetFurnitureId)||selected?.streetFurniture?.[0]||null;
      const u=archUnit();
      host.innerHTML=`<div class="vspace-arch-toolbar"><button type="button" id="vsUrbanUndo">Deshacer</button><button type="button" id="vsUrbanRedo">Rehacer</button></div>
        <div class="vspace-arch-subtitle">Calles del proyecto</div>
        <div class="vspace-arch-list">${streets.map(s=>`<button type="button" class="vspace-arch-entry ${s.id===selected?.id?'selected':''}" data-vs-street="${vspaceEsc(s.id)}"><b>${vspaceEsc(s.name||s.id)}</b><small>Calzada y dos veredas</small></button>`).join('')||'<div class="vspace-empty">Crea una calle en Editar layout para configurarla aquí.</div>'}</div>
        ${selected?`<div class="vspace-arch-subtitle">Calzada y veredas</div>
          <label class="vspace-field">Modelo de calle<select id="vsUrbanRoadType" ${lock}>${Object.entries(STREET_SURFACE_PRESETS).map(([key,p])=>`<option value="${key}" ${selected.roadType===key?'selected':''}>${vspaceEsc(p.label)}</option>`).join('')}</select></label>
          <label class="vspace-field">Acabado de veredas<select id="vsUrbanWalkType" ${lock}>${Object.entries(SIDEWALK_SURFACE_PRESETS).map(([key,p])=>`<option value="${key}" ${selected.sidewalkType===key?'selected':''}>${vspaceEsc(p.label)}</option>`).join('')}</select></label>
          <div class="vspace-grid-2"><label class="vspace-field">Calzada (cm)<input id="vsUrbanRoadWidth" type="number" min="26" max="2400" value="${Math.round(Number(selected.roadWidth||600)*u)}" ${lock}></label>
          <label class="vspace-field">Veredas (cm)<input id="vsUrbanSidewalkWidth" type="number" min="20" max="1200" value="${Math.round(Number(selected.sidewalkWidth||240)*u)}" ${lock}></label></div>
          <label class="vspace-field">Canaletas (cm)<input id="vsUrbanGutterWidth" type="number" min="0" max="300" value="${Math.round(Number(selected.gutterWidth||0)*u)}" ${lock}></label>
          <label class="vspace-field">Tipo de esquina<select id="vsUrbanCorner" ${lock}><option value="right" ${selected.cornerStyle==='right'?'selected':''}>90°</option><option value="round" ${selected.cornerStyle==='round'?'selected':''}>Redondeada</option><option value="diagonal" ${selected.cornerStyle==='diagonal'?'selected':''}>Diagonal / ochava</option></select></label>
          <button type="button" class="vspace-primary" id="vsUrbanApply" ${lock}>Aplicar a la calle</button><button type="button" class="v221-delete" id="vsUrbanDeleteStreet" ${lock}>Eliminar calle</button>
          <div class="vspace-arch-subtitle">Mobiliario urbano (grupo único)</div>
          <button type="button" id="vsUrbanAdd" ${lock}>${urban?'Reemplazar conjunto':'Añadir conjunto'}</button>
          ${urban?`<div class="vspace-grid-2"><label class="vspace-field">X plano (cm)<input type="number" id="vsUrbanX" value="${Math.round(Number(urban.x||0)*u)}" ${lock}></label>
            <label class="vspace-field">Y plano (cm)<input type="number" id="vsUrbanY" value="${Math.round(Number(urban.y||0)*u)}" ${lock}></label></div>
            <label class="vspace-field">Giro (°)<input type="number" id="vsUrbanRotation" min="-360" max="360" step="5" value="${Math.round(Number(urban.rotation||0))}" ${lock}></label>
            <div class="vspace-grid-2"><button class="vspace-primary" type="button" id="vsUrbanApplyGroup" ${lock}>Mover / girar grupo</button><button type="button" id="vsUrbanRemove" ${lock}>Quitar conjunto</button></div>
            <small class="vspace-muted">Activa Mover en la barra superior para arrastrar el conjunto directamente sobre la vereda. Snap según la rejilla CAD.</small>`:''}`:''}`;
      host.querySelector('#vsUrbanUndo')?.addEventListener('click',()=>{if(!canWrite())return;undoHistory('structure');state.refreshInspector();state.render?.(true);});
      host.querySelector('#vsUrbanRedo')?.addEventListener('click',()=>{if(!canWrite())return;redoHistory('structure');state.refreshInspector();state.render?.(true);});
      host.querySelectorAll('[data-vs-street]').forEach(btn=>btn.onclick=()=>{state.selectedStreetId=btn.dataset.vsStreet;appState.selectedStreetId=btn.dataset.vsStreet;state.selectedStreetFurnitureId='';state.refreshInspector();state.render?.(true);});
      host.querySelector('#vsUrbanDeleteStreet')?.addEventListener('click',()=>{if(!canWrite()||!selected)return;if(v221DeleteStreet(selected.id,{render:false})){state.selectedStreetId='';state.selectedStreetFurnitureId='';state.refreshInspector();state.render?.(true);}});
      host.querySelector('#vsUrbanApply')?.addEventListener('click',()=>{
        if(!canWrite()||!selected)return;
        const nextRoad=safeArchNum(host.querySelector('#vsUrbanRoadWidth')?.value,26,2400,600)/u;
        const nextWalk=safeArchNum(host.querySelector('#vsUrbanSidewalkWidth')?.value,20,1200,240)/u;
        const values={roadType:host.querySelector('#vsUrbanRoadType')?.value in STREET_SURFACE_PRESETS?host.querySelector('#vsUrbanRoadType').value:'drain-covered',sidewalkType:host.querySelector('#vsUrbanWalkType')?.value in SIDEWALK_SURFACE_PRESETS?host.querySelector('#vsUrbanWalkType').value:'paver',roadWidth:nextRoad,sidewalkWidth:nextWalk,gutterWidth:safeArchNum(host.querySelector('#vsUrbanGutterWidth')?.value,0,300,60)/u,cornerStyle:v220Corner(host.querySelector('#vsUrbanCorner')?.value)};
        if(!v221ApplyStreetProfile(selected,values))return;
        rebuildStreetNetwork();vspaceCommit(`calle ${selected.id}`);state.refreshInspector();
      });
      host.querySelector('#vsUrbanAdd')?.addEventListener('click',()=>{
        if(!canWrite()||!selected)return;
        recordHistorySnapshot('structure');const item=setStreetFurnitureUrbanSet(selected);
        state.selectedStreetFurnitureId=item?.id||'';appState.selectedStreetFurnitureId=state.selectedStreetFurnitureId;
        vspaceCommit('conjunto urbano');state.refreshInspector();
      });
      host.querySelector('#vsUrbanApplyGroup')?.addEventListener('click',()=>{
        if(!canWrite()||!selected||!urban)return;
        const next={x:safeArchNum(host.querySelector('#vsUrbanX')?.value,-200000,200000,urban.x*u)/u,
          y:safeArchNum(host.querySelector('#vsUrbanY')?.value,-200000,200000,urban.y*u)/u};
        const fits=v220PointOnSidewalk(next,selected);
        if(!fits) return vspaceToast('Coloca el conjunto sobre una de las veredas.',true);
        recordHistorySnapshot('structure');urban.x=appState.editor?.snapEnabled===false?next.x:snapGrid(next.x);
        urban.y=appState.editor?.snapEnabled===false?next.y:snapGrid(next.y);
        urban.rotation=safeArchNum(host.querySelector('#vsUrbanRotation')?.value,-360,360,urban.rotation||0);
        state.selectedStreetFurnitureId=urban.id;vspaceCommit('posición del mobiliario urbano');state.refreshInspector();
      });
      host.querySelector('#vsUrbanRemove')?.addEventListener('click',()=>{
        if(!canWrite()||!selected)return;
        recordHistorySnapshot('structure');clearStreetFurniture(selected);
        state.selectedStreetFurnitureId='';appState.selectedStreetFurnitureId='';vspaceCommit('mobiliario retirado');state.refreshInspector();
      });
    };
    state.refreshArchitecturalInspector=()=>{
      ensureLayoutDecorations();
      const host=root.querySelector('#vspaceInspector');
      const walls=appState.layout.walls||[];
      const wall=walls.find(w=>w.id===state.selectedWallId)||null;
      const op=(appState.layout.openings||[]).find(o=>o.id===state.selectedOpeningId && o.wallId===wall?.id)||null;
      const u=archUnit();
      const list=walls.map(w=>`<button type="button" class="vspace-arch-entry ${w.id===state.selectedWallId?'selected':''}" data-vs-wall="${vspaceEsc(w.id)}"><b>${vspaceEsc(w.name||w.id)}</b><small>${Math.round(wallLen(w)*u)} cm · ${Math.round(Number(w.thickness||12)*u)} cm espesor</small></button>`).join('');
      const wallOpenings=wall?(appState.layout.openings||[]).filter(o=>o.wallId===wall.id):[];
      host.innerHTML=`<div class="vspace-arch-toolbar"><button type="button" id="vsArchUndo">Deshacer</button><button type="button" id="vsArchRedo">Rehacer</button></div>
        <div class="vspace-arch-toolbar"><button type="button" id="vsDrawArchWall" ${canWrite()?'':'disabled'}>${state.drawWallStart?'Primer punto fijado…':'Dibujar muro'}</button><button type="button" id="vsCancelArchDraw" ${state.drawWallStart?'':'disabled'}>Cancelar</button></div>
        <small class="vspace-muted">${state.drawWallStart?'Marca el segundo extremo sobre el piso 3D.':'Selecciona un muro o dibuja uno con dos clics sobre el piso.'}</small>
        <div class="vspace-arch-list">${list||'<div class="vspace-empty">No hay muros. Utiliza «Dibujar muro» para empezar.</div>'}</div>
        ${wall?`<div class="vspace-inspector-id"><b>${vspaceEsc(wall.name||wall.id)}</b><small>${vspaceEsc(wall.id)} · geometría compartida con Editar layout</small></div>
          <label class="vspace-field">Nombre<input id="vsWallName" value="${vspaceEsc(wall.name||'Muro')}" ${lock}></label>
          <div class="vspace-grid-2"><label class="vspace-field">Longitud (cm)<input id="vsWallLen" type="number" min="40" max="10000" step="1" value="${Math.round(wallLen(wall)*u)}" ${lock}></label>
          <label class="vspace-field">Espesor (cm)<input id="vsWallThick" type="number" min="4" max="80" step="1" value="${Math.round(Number(wall.thickness||12)*u)}" ${lock}></label></div>
          <div class="vspace-grid-2"><label class="vspace-field">Altura (cm)<input id="vsWallHeight" type="number" min="120" max="600" step="5" value="${Math.round(Number(wall.height||290)*u)}" ${lock}></label>
          <label class="vspace-field">Acabado<select id="vsWallFinish" ${lock}><option value="ivory" ${!wall.material||wall.material==='ivory'?'selected':''}>Marfil mate</option><option value="concrete" ${wall.material==='concrete'?'selected':''}>Concreto suave</option><option value="white" ${wall.material==='white'?'selected':''}>Blanco cálido</option></select></label></div>
          <label class="vspace-field">Colocación respecto al eje<select id="vsWallPlacement" ${lock}>
            <option value="inside" ${wall.placement==='inside'?'selected':''}>Hacia dentro de zona</option>
            <option value="outside" ${wall.placement==='outside'?'selected':''}>Hacia fuera de zona</option>
            <option value="center" ${!wall.placement||wall.placement==='center'?'selected':''}>Centrado al eje</option>
          </select></label>
          <button type="button" class="vspace-primary" id="vsApplyWall" ${lock}>Aplicar propiedades del muro</button>
          <div class="vspace-arch-subtitle">Mover muro con snap (ambos extremos)</div>
          <div class="vspace-grid-2"><label class="vspace-field">Desplazar X (cm)<input type="number" id="vsWallDeltaX" value="0" ${lock}></label><label class="vspace-field">Desplazar Y (cm)<input type="number" id="vsWallDeltaY" value="0" ${lock}></label></div>
          <button type="button" id="vsWallTranslate" ${lock}>Desplazar muro</button>
          <div class="vspace-arch-subtitle">Agregar al muro</div>
          <div class="vspace-arch-toolbar"><button type="button" data-vs-create-opening="door" ${lock}>Puerta</button><button type="button" data-vs-create-opening="free" ${lock}>Abertura libre</button><button type="button" data-vs-create-opening="window" ${lock}>Ventanal</button></div>
          <div class="vspace-arch-list">${wallOpenings.map(o=>`<button class="vspace-arch-entry ${state.selectedOpeningId===o.id?'selected':''}" data-vs-opening="${vspaceEsc(o.id)}"><b>${o.type==='window'?'Ventanal':o.type==='free'?'Abertura':o.type==='door'?'Puerta':'Portón'} · ${vspaceEsc(o.id)}</b><small>${Math.round(Number(o.width||90)*u)} × ${Math.round(Number(o.height||210)*u)} cm</small></button>`).join('')||'<small class="vspace-muted">Sin aberturas.</small>'}</div>
          ${op?`<div class="vspace-arch-subtitle">Propiedades de ${vspaceEsc(op.id)}</div>
            <div class="vspace-grid-2"><label class="vspace-field">Ancho (cm)<input id="vsOpeningWidth" type="number" min="35" value="${Math.round(Number(op.width||90)*u)}" ${lock}></label>
            <label class="vspace-field">Alto (cm)<input id="vsOpeningHeight" type="number" min="30" value="${Math.round(Number(op.height||210)*u)}" ${lock}></label></div>
            <div class="vspace-grid-2"><label class="vspace-field">Antepecho (cm)<input id="vsOpeningSill" type="number" min="0" value="${Math.round(Number(op.sill||0)*u)}" ${lock}></label>
            <label class="vspace-field">Posición (%)<input id="vsOpeningPosition" type="number" min="1" max="99" value="${Math.round(Number(op.t||.5)*100)}" ${lock}></label></div>
            <div class="vspace-grid-2"><button type="button" class="vspace-primary" id="vsApplyOpening" ${lock}>Aplicar abertura</button><button type="button" id="vsRemoveOpening" ${lock}>Eliminar abertura</button></div>`:''}
          <button type="button" class="vspace-danger" id="vsRemoveWall" ${lock}>Eliminar muro</button>`:''}`;
      const zonesWithFloors=(appState.layout.zones||[]);
      if(zonesWithFloors.length){
        const selections=zonesWithFloors.map(zone=>`<label class="vspace-field">${vspaceEsc(zone.name||zone.id)}<select data-vs-zone-floor="${vspaceEsc(zone.id)}" ${lock}>${Object.entries(FLOOR_FINISHES).map(([value,f])=>`<option value="${value}" ${(zone.floorFinish||'default')===value?'selected':''}>${vspaceEsc(f.label)}</option>`).join('')}</select></label>`).join('');
        host.insertAdjacentHTML('beforeend',`<div class="vspace-arch-subtitle">Acabados de piso por zona</div>${selections}`);
        host.querySelectorAll('[data-vs-zone-floor]').forEach(el=>el.onchange=()=>{
          if(!canWrite())return;
          const zone=appState.layout.zones.find(z=>z.id===el.dataset.vsZoneFloor);
          if(!zone)return;
          recordHistorySnapshot('structure');
          zone.floorFinish=Object.hasOwn(FLOOR_FINISHES,el.value)?el.value:'default';
          vspaceCommit(`piso de ${zone.id}`);
          state.refreshInspector();
        });
      }
      host.querySelector('#vsArchUndo')?.addEventListener('click',()=>{if(!canWrite())return;undoHistory('structure');ensureLayoutDecorations();state.refreshInspector();state.render?.(true);});
      host.querySelector('#vsArchRedo')?.addEventListener('click',()=>{if(!canWrite())return;redoHistory('structure');ensureLayoutDecorations();state.refreshInspector();state.render?.(true);});
      host.querySelectorAll('[data-vs-wall]').forEach(btn=>btn.onclick=()=>selectArch(btn.dataset.vsWall));
      host.querySelectorAll('[data-vs-opening]').forEach(btn=>btn.onclick=()=>selectArch(wall?.id||'',btn.dataset.vsOpening));
      host.querySelector('#vsDrawArchWall')?.addEventListener('click',()=>{
        if(!canWrite())return;
        state.drawWallStart=null;state.archDrawMode=true;state.refreshInspector();vspaceToast('Pulsa dos puntos en el piso para crear el muro. ESC cancela.');
      });
      host.querySelector('#vsCancelArchDraw')?.addEventListener('click',()=>{state.archDrawMode=false;state.drawWallStart=null;state.refreshInspector();});
      host.querySelector('#vsApplyWall')?.addEventListener('click',()=>{
        if(!canWrite()||!wall)return;
        const nextLength=safeArchNum(host.querySelector('#vsWallLen').value,40,10000,wallLen(wall)*u)/u;
        const nextThick=safeArchNum(host.querySelector('#vsWallThick').value,4,80,12)/u;
        const nextH=safeArchNum(host.querySelector('#vsWallHeight').value,120,600,290)/u;
        if((appState.layout.openings||[]).filter(o=>o.wallId===wall.id).some(o=> Number(o.sill||0)+Number(o.height||0)>nextH || Number(o.width||0)>nextLength-20/u))return vspaceToast('Reduce las aberturas antes de acortar o bajar el muro.',true);
        recordHistorySnapshot('structure');
        if(Math.abs(nextLength-wallLen(wall))>.01 && !setManualWallLength(wall,nextLength))return vspaceToast('No se puede alargar este muro por restricciones geométricas.',true);
        wall.name=String(host.querySelector('#vsWallName').value||'Muro').trim().slice(0,75)||'Muro';
        wall.thickness=nextThick;wall.height=nextH;wall.placement=normalizeWallPlacement(host.querySelector('#vsWallPlacement')?.value);wall.material=host.querySelector('#vsWallFinish').value;
        syncManualWallsFromNodes();ensureOpeningAttachmentOffsets();vspaceCommit(`muro ${wall.id}`);state.refreshInspector();
      });
      host.querySelector('#vsWallTranslate')?.addEventListener('click',()=>{
        if(!canWrite()||!wall)return;
        if(!wall.startNodeId||!wall.endNodeId)return vspaceToast('Selecciona un muro con extremos editables.',true);
        const a=getWallNode(wall.startNodeId), b=getWallNode(wall.endNodeId);
        if(!a||!b)return vspaceToast('El muro no tiene nodos editables.',true);
        const dx=safeArchNum(host.querySelector('#vsWallDeltaX')?.value,-10000,10000,0)/archUnit();
        const dy=safeArchNum(host.querySelector('#vsWallDeltaY')?.value,-10000,10000,0)/archUnit();
        if(!dx&&!dy)return;
        const pts=[a,b].map(pt=>({id:pt.id,x:appState.editor?.snapEnabled===false?Number(pt.x)+dx:snapGrid(Number(pt.x)+dx),y:appState.editor?.snapEnabled===false?Number(pt.y)+dy:snapGrid(Number(pt.y)+dy)}));
        // No alterar nodos ni geometrías compartidas si la transformación no es válida.
        recordHistorySnapshot('structure');
        if(!trySetWallNodesPositionsBulk(pts,appState.layout,{silent:true}))return vspaceToast('El desplazamiento produciría una colisión o geometría inválida.',true);
        syncManualWallsFromNodes();syncRoomLinkedZones();ensureOpeningAttachmentOffsets();
        vspaceCommit(`posición del muro ${wall.id}`);state.refreshInspector();
      });
      host.querySelectorAll('[data-vs-create-opening]').forEach(btn=>btn.onclick=()=>{
        if(!canWrite()||!wall)return;
        const type=btn.dataset.vsCreateOpening,def=openingDefaultForType(type);
        const opening={id:nextOpeningId(),wallId:wall.id,type,width:def.width/u,height:def.height/u,sill:def.sill/u,t:.5,offset:wallLen(wall)*.5,depth:wall.thickness,frame:true};
        const err=validOpening(opening,wall);
        if(err)return vspaceToast(err,true);
        if(!Array.isArray(appState.layout.openings))appState.layout.openings=[];
        recordHistorySnapshot('structure');appState.layout.openings.push(opening);state.selectedOpeningId=opening.id;appState.selectedOpeningId=opening.id;
        vspaceCommit(`${type==='window'?'ventanal':type==='door'?'puerta':'abertura'} ${opening.id}`);state.refreshInspector();
      });
      host.querySelector('#vsApplyOpening')?.addEventListener('click',()=>{
        if(!canWrite()||!wall||!op)return;
        const next={...op,width:safeArchNum(host.querySelector('#vsOpeningWidth').value,35,1000,op.width*u)/u,
          height:safeArchNum(host.querySelector('#vsOpeningHeight').value,30,500,op.height*u)/u,
          sill:op.type==='door'?0:safeArchNum(host.querySelector('#vsOpeningSill').value,0,500,op.sill*u)/u,
          t:safeArchNum(host.querySelector('#vsOpeningPosition').value,1,99,50)/100};
        const err=validOpening(next,wall,op.id);if(err)return vspaceToast(err,true);
        recordHistorySnapshot('structure');next.offset=next.t*wallLen(wall);Object.assign(op,next);vspaceCommit(`abertura ${op.id}`);state.refreshInspector();
      });
      host.querySelector('#vsRemoveOpening')?.addEventListener('click',()=>{
        if(!canWrite()||!op)return;recordHistorySnapshot('structure');appState.layout.openings=appState.layout.openings.filter(o=>o.id!==op.id);
        state.selectedOpeningId='';appState.selectedOpeningId='';vspaceCommit('abertura eliminada');state.refreshInspector();
      });
      host.querySelector('#vsRemoveWall')?.addEventListener('click',()=>{
        if(!canWrite()||!wall||!confirm(`¿Eliminar ${wall.name||wall.id} y sus aberturas?`))return;
        recordHistorySnapshot('structure');appState.layout.walls=appState.layout.walls.filter(w=>w.id!==wall.id);
        appState.layout.openings=appState.layout.openings.filter(o=>o.wallId!==wall.id);
        pruneOrphanWallNodes();state.selectedWallId='';state.selectedOpeningId='';appState.selectedWallId='';appState.selectedOpeningId='';
        vspaceCommit('muro eliminado');state.refreshInspector();
      });
    };
    root.querySelectorAll('[data-vspace-panel]').forEach(btn=>btn.addEventListener('click',()=>{
      if(state.stackSourceId && btn.dataset.vspacePanel!=='furniture')cancelStackMode(true);
      state.inspectorMode=btn.dataset.vspacePanel;state.archDrawMode=false;state.drawWallStart=null;
      root.querySelectorAll('[data-vspace-panel]').forEach(b=>b.classList.toggle('active',b===btn));
      root.querySelector('#vspaceInspectorHeading').textContent=state.inspectorMode==='architecture'?'Inspector arquitectónico':state.inspectorMode==='urban'?'Inspector de urbanismo':'Inspector de ubicaciones';
      state.refreshInspector();state.render?.(true);
    }));
    state.refreshInspector=()=>{
      if(state.inspectorMode==='architecture') return state.refreshArchitecturalInspector();
      if(state.inspectorMode==='urban') return state.refreshUrbanInspector();
      const rack=getRack(),host=root.querySelector('#vspaceInspector');
      state.refreshObjects();
      if(!rack){host.innerHTML='<div class="vspace-empty">Selecciona un mueble en 3D o desde la lista de la izquierda.</div>';return;}
      const sp=vspaceSpec(rack);state.selectedLevel=vspaceClamp(state.selectedLevel,1,sp.levels);state.selectedSlot=vspaceClamp(state.selectedSlot,1,sp.slots);
      const assignments=vspaceProductsForSlot(rack,state.selectedLevel,state.selectedSlot);
      const assigned=assignments[0]||null;
      const levels=Array.from({length:sp.levels},(_,i)=>`<button class="${i+1===state.selectedLevel?'active':''}" data-vspace-level="${i+1}">N${i+1}</button>`).join('');
      const slots=Array.from({length:sp.slots},(_,i)=>`<button class="${i+1===state.selectedSlot?'active':''}" data-vspace-slot="${i+1}">P${i+1}</button>`).join('');
      const groupLevels=rack.stackGroupId?modularStackLevels(rack):[];
      const groupPanel=groupLevels.length?`<div class="vspace-stack-panel"><b>Conjunto apilado · ${vspaceEsc(rack.stackGroupId)}</b><small class="vspace-muted">${groupLevels.length} niveles · ${groupLevels.map(v=>v.count).join(' / ')} módulos (de abajo hacia arriba)</small>
        ${groupLevels.slice().reverse().map(level=>`<div class="vspace-stack-level" style="border-left:4px solid ${STACK_LEVEL_COLORS[level.index%STACK_LEVEL_COLORS.length]}"><strong>Nivel ${level.index+1} · ${level.count} módulos</strong><small>NPT +${Math.round(level.npt)} cm</small><div class="vspace-stack-module-buttons">${level.modules.map(m=>`<button type="button" data-vs-modular="${vspaceEsc(m.id)}" class="${m.id===rack.id?'active':''}">${level.index+1}-${String.fromCharCode(65+Number(m.stackModuleIndex||0))}</button>`).join('')}</div></div>`).join('')}
        <button id="vsEditModularLayout" type="button">Editar conjunto en layout</button>
        <small class="vspace-muted">Selecciona cada módulo para editar su NPT y materiales. Alt+arrastrar mueve la pila en layout.</small></div>`:'';
      host.innerHTML=`<div class="vspace-inspector-id"><b>${vspaceEsc(sp.title)}</b><small>${vspaceEsc(rack.id)} · ${vspaceEsc(VSPACE_TYPES[sp.kind].name)}</small></div>
        ${groupPanel}
        <label class="vspace-field">Nombre<input id="vsName" value="${vspaceEsc(sp.title)}" ${lock}></label>
        <div class="vspace-grid-2"><label class="vspace-field">Ancho (cm)<input id="vsWidth" type="number" min="30" max="10000" value="${sp.width}" ${lock}></label><label class="vspace-field">Fondo (cm)<input id="vsDepth" type="number" min="20" max="5000" value="${sp.depth}" ${lock}></label></div>
        <div class="vspace-grid-2"><label class="vspace-field">Alto (cm)<input id="vsHeight" type="number" min="30" max="10000" value="${sp.height}" ${lock}></label><label class="vspace-field">Giro (°)<select id="vsRotation" ${lock}>${[0,90,180,270].map(d=>`<option value="${d}" ${Number(rack.rot||0)===d?'selected':''}>${d}°</option>`).join('')}</select></label></div>
        <div class="vspace-grid-2"><label class="vspace-field">Niveles<input id="vsLevels" type="number" min="1" max="12" value="${sp.levels}" ${lock}></label><label class="vspace-field">Posiciones / nivel<input id="vsSlots" type="number" min="1" max="12" value="${sp.slots}" ${lock}></label></div>
        <div class="vspace-grid-2"><label class="vspace-field">X plano<input id="vsX" type="number" value="${Math.round(rack.x)}" ${lock}></label><label class="vspace-field">Y plano<input id="vsY" type="number" value="${Math.round(rack.y)}" ${lock}></label></div>
        <div class="vspace-grid-2"><label class="vspace-field">NPT — altura desde el piso (cm)<input id="vsNpt" type="number" min="0" max="20000" step="1" value="${Math.round(Number(rack.baseHeight||0))}" ${lock}></label><div class="vspace-field"><small class="vspace-muted">Cota superior</small><b>+${Math.round(Number(rack.baseHeight||0)+Number(rack.rackHeight||sp.height))} cm</b></div></div>
        <button class="vspace-primary" id="vsUpdate" ${lock}>Aplicar medidas y posición</button><div class="vspace-stack-controls"><button type="button" id="vsPlaceOnTop" ${lock}>Colocar encima de otro mueble</button>${rack.stackedOnId?`<small class="vspace-muted">Sobre: ${vspaceEsc((appState.layout.racks||[]).find(r=>r.id===rack.stackedOnId)?.virtualName||rack.stackedOnId)}</small><button type="button" id="vsReleaseStack" ${lock}>Desvincular soporte</button>`:''}</div><div class="vspace-divider"></div>
        <h4>Asignación por nivel</h4><small class="vspace-muted">Nivel: de abajo hacia arriba · P: de izquierda a derecha</small>
        <div class="vspace-numbers">${levels}</div><div class="vspace-numbers vspace-slots">${slots}</div>
        <div class="vspace-loc-code">${vspaceEsc(rack.id)}-N${state.selectedLevel}-S${state.selectedSlot}</div>
        <div class="vspace-container-editor"><b>Cajas sobre el nivel</b><small class="vspace-muted">Elige el contenedor físico que aparecerá en el estante. No cambia el stock.</small>
        <div class="vspace-grid-2"><label class="vspace-field">Contenedor<select id="vsContainerKind" ${lock}>${[['none','Sin caja'],['carton','Cartón'],['plastic','Gaveta plástica']].map(([value,title])=>`<option value="${value}" ${vspaceContainersForSlot(rack,state.selectedLevel,state.selectedSlot).kind===value?'selected':''}>${title}</option>`).join('')}</select></label>
        <label class="vspace-field">Cantidad (1–4)<input type="number" min="1" max="4" id="vsContainerCount" value="${Math.max(1,vspaceContainersForSlot(rack,state.selectedLevel,state.selectedSlot).count)}" ${lock}></label></div>
        <button type="button" id="vsPutContainers" ${lock}>Colocar cajas en este nivel</button></div>
        <label class="vspace-field">SKU / código de barras<input id="vsSku" value="${vspaceEsc(assigned?.sku||'')}" list="vsProductHints" placeholder="Escribe el SKU" ${lock}></label>
        <datalist id="vsProductHints">${(appState.products||[]).slice(0,450).map(p=>`<option value="${vspaceEsc(p.sku||'')}">${vspaceEsc(p.nombre||'')}</option>`).join('')}</datalist>
        <label class="vspace-field">Cantidad de unidades<input id="vsQty" type="number" min="1" max="100000" value="${Number(assigned?.quantity)||1}" ${lock}></label>
        ${assigned?.name?`<div class="vspace-assignment-name">${vspaceEsc(assigned.name)}</div>`:''}
        ${assignments.length>1?`<div class="vspace-muted">${assignments.length} productos importados en esta posición. La asignación manual sustituye la lista mostrada aquí.</div>`:''}
        <div class="vspace-grid-2"><button class="vspace-primary" id="vsAssign" ${lock}>Asignar SKU</button><button id="vsRemoveAssignment" ${lock}>Vaciar posición</button></div>
        <div class="vspace-divider"></div><div class="vspace-grid-2"><button id="vsDuplicate" ${lock}>Duplicar mueble</button><button id="vsDelete" class="vspace-danger" ${lock}>Eliminar mueble</button></div>`;
      host.querySelectorAll('[data-vs-modular]').forEach(btn=>btn.onclick=()=>{const target=findRackById(btn.dataset.vsModular);if(target)state.select(target.id);});
      host.querySelector('#vsEditModularLayout')?.addEventListener('click',()=>{appState.selectedRackLayoutId=rack.id;appState.selectedZoneId=rack.zoneId;appState.editor.stackViewMode='expanded';setScreen('distribution');});
      host.querySelectorAll('[data-vspace-level]').forEach(b=>b.onclick=()=>{state.selectedLevel=Number(b.dataset.vspaceLevel);state.refreshInspector();state.render?.(false);});
      host.querySelectorAll('[data-vspace-slot]').forEach(b=>b.onclick=()=>{state.selectedSlot=Number(b.dataset.vspaceSlot);state.refreshInspector();state.render?.(false);});
      host.querySelector('#vsPlaceOnTop')?.addEventListener('click',startStackMode);
      host.querySelector('#vsReleaseStack')?.addEventListener('click',()=>{
        if(!canWrite()||!rack.stackedOnId)return;
        if(typeof recordHistorySnapshot==='function')recordHistorySnapshot('structure');
        delete rack.stackedOnId;
        vspaceCommit('soporte desvinculado');state.refreshInspector();
      });
      host.querySelector('#vsUpdate')?.addEventListener('click',()=>{
        vspaceUpdateRack(rack,{name:host.querySelector('#vsName').value,width:host.querySelector('#vsWidth').value,depth:host.querySelector('#vsDepth').value,
          height:host.querySelector('#vsHeight').value,levels:host.querySelector('#vsLevels').value,slots:host.querySelector('#vsSlots').value,
          rot:host.querySelector('#vsRotation').value,x:host.querySelector('#vsX').value,y:host.querySelector('#vsY').value,npt:host.querySelector('#vsNpt').value});
      });
      host.querySelector('#vsPutContainers')?.addEventListener('click',()=>vspaceSetSlotContainers(rack,state.selectedLevel,state.selectedSlot,host.querySelector('#vsContainerKind').value,host.querySelector('#vsContainerCount').value));
      host.querySelector('#vsAssign')?.addEventListener('click',()=>vspaceAssign(rack,state.selectedLevel,state.selectedSlot,host.querySelector('#vsSku').value,host.querySelector('#vsQty').value));
      host.querySelector('#vsRemoveAssignment')?.addEventListener('click',()=>vspaceAssign(rack,state.selectedLevel,state.selectedSlot,''));
      host.querySelector('#vsDelete')?.addEventListener('click',()=>{
        if((appState.layout?.racks||[]).some(r=>r.stackedOnId===rack.id))return vspaceToast('No puedes eliminar un soporte que sostiene otros módulos. Desvincula primero los muebles superiores.',true);
        if(!confirm(`¿Eliminar ${sp.title} y sus asignaciones?`))return;
        appState.layout.racks=appState.layout.racks.filter(r=>r.id!==rack.id);
        state.selectedId=appState.layout.racks[0]?.id||'';
        vspaceCommit('mueble eliminado');state.refreshInspector();
      });
      host.querySelector('#vsDuplicate')?.addEventListener('click',()=>{
        const cloneRack=JSON.parse(JSON.stringify(rack));cloneRack.id=`${rack.id}-C${Date.now().toString(36).slice(-4).toUpperCase()}`;
        cloneRack.virtualName=`${sp.title} (copia)`;delete cloneRack.stackedOnId;cloneRack.x+=20;cloneRack.y+=20;
        const found=vspaceFindPosition(cloneRack);if(!found)return vspaceToast('No queda espacio disponible para duplicar.',true);
        Object.assign(cloneRack,found);
        const sourceModel=appState.models.find(m=>m.id===rack.modelId);
        if(sourceModel){cloneRack.modelId=`${rack.modelId}_c${Date.now().toString(36)}`;appState.models.push({...sourceModel,id:cloneRack.modelId,name:cloneRack.virtualName});}
        appState.layout.racks.push(cloneRack);state.selectedId=cloneRack.id;
        vspaceCommit('mueble duplicado');state.refreshInspector();
      });
    };
    state.select=(id,level=null,slot=null)=>{
      state.inspectorMode='furniture';state.archDrawMode=false;state.drawWallStart=null;
      root.querySelectorAll('[data-vspace-panel]').forEach(btn=>btn.classList.toggle('active',btn.dataset.vspacePanel==='furniture'));
      root.querySelector('#vspaceInspectorHeading').textContent='Inspector de ubicaciones';
      state.selectedId=id;appState.selectedRackLayoutId=id;appState.selectedRack=id;
      if(level!=null)state.selectedLevel=Number(level)||1;
      if(slot!=null)state.selectedSlot=Number(slot)||1;
      state.refreshInspector();state.render?.(false);
    };
    root.querySelectorAll('[data-vspace-add]').forEach(b=>b.onclick=()=>vspaceCreate(b.dataset.vspaceAdd));
    root.querySelector('#vspaceAddSavedModel')?.addEventListener('click',()=>{
      const modelId=root.querySelector('#vspaceSavedModel')?.value;
      const model=(appState.models||[]).find(m=>m.id===modelId && m?.furniture?.enabled);
      if(!model) return vspaceToast('Selecciona un modelo del constructor.',true);
      const rack=placeFurnitureModelInLayout(model,{navigate:false});
      if(!rack) return;
      state.selectedId=rack.id;
      state.selectedLevel=1;state.selectedSlot=1;
      vspaceCommit('mueble paramétrico añadido');
      state.refreshInspector();
      state.setCamera?.('iso');
    });
    root.querySelector('#vspaceObjects').addEventListener('click',e=>{
      const b=e.target.closest('[data-vspace-select]');if(b){if(state.stackSourceId)finishStackMode(b.dataset.vspaceSelect);else state.select(b.dataset.vspaceSelect);}
    });
    root.querySelectorAll('[data-vspace-mode]').forEach(btn=>btn.addEventListener('click',()=>state.applyEditMode(btn.dataset.vspaceMode)));
    const findSku=async()=>{
      const q=String(root.querySelector('#vspaceFindSku').value||'').trim().toLowerCase();
      const hits=root.querySelector('#vspaceHits');
      if(!q){hits.innerHTML='';return;}
      let assignments=vspaceAllAssignments().filter(p=>[p.sku,p.name,p.code].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,50);
      if(!assignments.length){
        const lookup=(appState.products||[]).filter(p=>[p.sku,p.nombre,p.barras].some(v=>String(v||'').toLowerCase().includes(q))).slice(0,15);
        assignments=lookup.map(p=>({sku:p.sku,name:p.nombre,rackId:p.rack,level:Number(p.nivel)||1,slot:Number(p.slot)||1,code:p.ubicacion}));
      }
      // Búsqueda remota para la sucursal actual si la paginación sólo cargó una fracción del catálogo.
      if(!assignments.length && appState.auth?.loggedIn){
        const branchId=Number((appState.admin?.branches||[])[getActiveLayoutBranchIndex()]?.id||0);
        if(branchId){
          try{
            const response=await httpJson(`/api/branches/${branchId}/products?q=${encodeURIComponent(q)}&limit=25`);
            const found=response?.products||response?.items||response?.rows||[];
            assignments=found.map(p=>({sku:p.sku,name:p.nombre||p.name,rackId:p.rack||p.rack_id,level:Number(p.nivel||p.level)||1,slot:Number(p.slot)||1,code:p.ubicacion||p.location}));
          }catch(_err){}
        }
      }
      hits.innerHTML=assignments.length?assignments.map(p=>`<button data-vspace-found="${vspaceEsc(p.rackId||'')}" data-vspace-found-level="${Number(p.level)||1}" data-vspace-found-slot="${Number(p.slot)||1}"><b>${vspaceEsc(p.sku||'')}</b><small>${vspaceEsc(p.code||`${p.rackId||'—'} N${p.level||1}/P${p.slot||1}`)}</small></button>`).join(''):'<small class="vspace-muted">No se encontró ubicación. Revisa el SKU o asígnalo a un mueble.</small>';
    };
    root.querySelector('#vspaceFindSku').addEventListener('input',debounce(findSku,380));
    root.querySelector('[data-vspace-action="find"]').onclick=findSku;
    root.querySelector('#vspaceHits').addEventListener('click',e=>{
      const b=e.target.closest('[data-vspace-found]');if(!b)return;
      if((appState.layout.racks||[]).some(r=>r.id===b.dataset.vspaceFound)){
        state.select(b.dataset.vspaceFound,Number(b.dataset.vspaceFoundLevel),Number(b.dataset.vspaceFoundSlot));
        state.focusSelected();vspaceToast(`Ubicación encontrada: ${b.dataset.vspaceFound} · N${b.dataset.vspaceFoundLevel} / P${b.dataset.vspaceFoundSlot}`);
      }else vspaceToast('El producto tiene una ubicación, pero ese mueble aún no existe en el plano.',true);
    });
    root.querySelectorAll('[data-vspace-cam]').forEach(b=>b.onclick=()=>{
      root.querySelectorAll('[data-vspace-cam]').forEach(x=>x.classList.toggle('active',x===b));
      state.setCamera(b.dataset.vspaceCam);
    });
    root.querySelector('[data-vspace-action="fit"]').onclick=()=>state.setCamera(state.mode||'iso');
    root.querySelector('[data-vspace-action="focus"]').onclick=()=>state.focusSelected();
    root.querySelector('[data-vspace-action="move"]').onclick=e=>{
      if(state.stackSourceId)cancelStackMode(true);
      state.move=!state.move;e.currentTarget.textContent=`Mover: ${state.move?'ON':'OFF'}`;e.currentTarget.classList.toggle('active',state.move);
      vspaceToast(state.move?'Arrastra un mueble sobre el suelo. Se impedirán las colisiones.':'Modo órbita activado.');
    };
    root.querySelector('[data-vspace-action="toggle-wall"]').onclick=e=>{
      state.wallDisplay=v217WallModeNext(state.wallDisplay);state.wallVisible=state.wallDisplay!=='none';e.currentTarget.textContent=v217WallModeLabel(state.wallDisplay);e.currentTarget.setAttribute('aria-label','Cambiar visibilidad de muros: '+e.currentTarget.textContent);e.currentTarget.classList.toggle('active',state.wallVisible);state.render(true);
    };
    root.querySelector('[data-vspace-action="sample"]').onclick=()=>{
      if(!canWrite())return;
      if((appState.layout.racks||[]).length && !confirm('Se añadirán muebles al plano actual, sin eliminar los existentes. ¿Continuar?'))return;
      if(!(appState.layout.zones||[]).length){
        if(!Array.isArray(appState.layout.zones))appState.layout.zones=[];
        const demoZone={id:'Z-ISOMETRICA',name:'Ambiente principal',color:'#e8d7be',pts:[{x:0,y:0},{x:900,y:0},{x:900,y:700},{x:0,y:700}]};
        appState.layout.zones.push(demoZone);zoneBounds.push(...demoZone.pts);
        mx=450;my=350;
      }
      const previous=(appState.layout.racks||[]).length;
      ['rack','rack','vitrina','mostrador','contenedor','cajonera'].forEach(kind=>vspaceCreate(kind));
      const newly=(appState.layout.racks||[]).slice(previous);
      newly.forEach((r,i)=>{
        if(r.virtualType==='rack')r.virtualContainers=[{level:1,slot:1,kind:'carton',count:2},{level:2,slot:2,kind:'plastic',count:2},{level:3,slot:1,kind:'carton',count:2}];
        if(r.virtualType==='vitrina')r.virtualContainers=[{level:1,slot:1,kind:'carton',count:1}];
      });
      if(newly.length){state.select(newly[0].id);vspaceCommit('ambiente de ejemplo');state.setCamera('iso');}
      else vspaceToast('Primero dibuja una zona suficientemente grande desde el editor de Plano.',true);
    };
    root.querySelector('[data-vspace-action="save"]').onclick=async()=>{
      if(!canWrite())return;
      const btn=root.querySelector('[data-vspace-action="save"]');btn.disabled=true;btn.textContent='Guardando…';
      try{
        persistActiveLayout();
        if(appState.auth?.localMode){vspaceToast('Guardado local. Para sincronizar con Cloudflare inicia sesión en la versión desplegada.');return;}
        const ok=await saveRemoteAppState('ambiente virtual');
        vspaceToast(ok?'Ambiente y asignaciones guardados en Cloudflare D1.':'No se pudo guardar en nube. Los cambios siguen en el navegador.',!ok);
        if(ok)state.modified=false;
      }catch(err){vspaceToast(err.message||'Error guardando',true);}
      finally{btn.disabled=false;btn.textContent='Guardar en nube';}
    };
    state.refreshObjects();state.refreshInspector();
    const destroyBase=()=>{state.destroyed=true;state.releaseFloorTextures?.();window.removeEventListener('keydown',state.stackEscapeHandler);window.removeEventListener('keydown',state.keyHandler);state.resizeObs?.disconnect();state.themeObs?.disconnect();if(state.raf)cancelAnimationFrame(state.raf);if(state.renderer&&state.scene)disposeThreeScene(state.scene,state.renderer);state.renderer=null;};
    state.destroy=destroyBase;
    (async()=>{
      try{
        const THREE=await loadThreeRuntime();if(state.destroyed||vspaceActive!==state)return;
        const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
        renderer.outputColorSpace=THREE.SRGBColorSpace;
        renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
        renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
        if('physicallyCorrectLights' in renderer) renderer.physicallyCorrectLights = true;
        const scene=new THREE.Scene();scene.background=new THREE.Color(document.body.classList.contains('theme-light')?0xd6dde1:0x202b33);
        const camera=new THREE.OrthographicCamera(-5,5,5,-5,.05,260);
        scene.add(new THREE.HemisphereLight(0xfffaf1,0x8e9a9d,1.45));
        const fill=new THREE.AmbientLight(0xffffff,.22);scene.add(fill);
        const sun=new THREE.DirectionalLight(0xfff4e1,2.25);
        sun.position.set(-5,12,8);sun.castShadow=true;
        sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-32;sun.shadow.camera.right=32;
        sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;
        sun.shadow.camera.near=.5;sun.shadow.camera.far=55;sun.shadow.bias=-.0004;
        sun.shadow.radius=4;scene.add(sun);
        const world=new THREE.Group();scene.add(world);state.scene=scene;state.renderer=renderer;state.camera=camera;state.THREE=THREE;state.world=world;
        const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(),ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
        const orbit={theta:V217_ISO_THETA,phi:V217_ISO_PHI,radius:12,target:new THREE.Vector3(0,.8,0)};
        const updateCam=()=>{
          orbit.phi=vspaceClamp(orbit.phi,.1,1.53);orbit.radius=vspaceClamp(orbit.radius,1.8,80);
          const sin=Math.sin(orbit.phi);camera.position.set(orbit.target.x+Math.sin(orbit.theta)*sin*orbit.radius,orbit.target.y+Math.cos(orbit.phi)*orbit.radius,orbit.target.z+Math.cos(orbit.theta)*sin*orbit.radius);
          camera.lookAt(orbit.target);
          const rect=canvas.getBoundingClientRect(),aspect=Math.max(.5,rect.width/Math.max(1,rect.height));
          const halfH=orbit.radius*.44;
          camera.left=-halfH*aspect;camera.right=halfH*aspect;camera.top=halfH;camera.bottom=-halfH;camera.updateProjectionMatrix();
        };
        const applyPointer=e=>{const r=canvas.getBoundingClientRect();mouse.x=((e.clientX-r.left)/r.width)*2-1;mouse.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(mouse,camera);};
        const meshMat=(color,extra={})=>new THREE.MeshStandardMaterial({color,metalness:.14,roughness:.6,...extra});
        const shared={
          metal:meshMat(0x939e9c,{metalness:.53,roughness:.48}),
          metalDark:meshMat(0x424947,{metalness:.58,roughness:.41}),
          metalSelected:meshMat(0x3b8d7e,{metalness:.43,roughness:.35}),
          hole:meshMat(0x353b39),
          wood:meshMat(0xc89e73,{metalness:0,roughness:.81}),
          woodLight:meshMat(0xe4be90,{metalness:0,roughness:.77}),
          woodDark:meshMat(0x9c7150,{metalness:0,roughness:.78}),
          cardboard:meshMat(0xc99560,{metalness:0,roughness:.94}),
          cardboardLight:meshMat(0xd8af7d,{metalness:0,roughness:.91}),
          tape:meshMat(0xe7d4a5,{metalness:0,roughness:.72}),
          paper:meshMat(0xfaf7ee,{metalness:0,roughness:.84}),
          ink:meshMat(0x44433e),
          plastic:meshMat(0x9caeb0,{metalness:.08,roughness:.66}),
          plasticLight:meshMat(0xb9c5c4,{metalness:.08,roughness:.64}),
          plasticDark:meshMat(0x76898b,{metalness:.1,roughness:.65}),
          glass:meshMat(0xd8eff0,{transparent:true,opacity:.19,depthWrite:false,side:THREE.DoubleSide,metalness:0,roughness:.08}),
          glassShelf:meshMat(0xcee5e2,{transparent:true,opacity:.68,depthWrite:false,metalness:0,roughness:.09}),
          highlight:meshMat(0x37dfaf,{transparent:true,opacity:.32,depthWrite:false,emissive:0x168f7d,emissiveIntensity:.18})
        };
        const addBlock=(group,x,y,z,w,h,d,mat,level=0,slot=0)=>{
          const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.015,w),Math.max(.015,h),Math.max(.015,d)),mat);
          mesh.position.set(x,y,z);mesh.castShadow=!mat.transparent;mesh.receiveShadow=true;
          const data=group.userData;mesh.userData={furnitureId:data.furnitureId,level,slot};group.add(mesh);return mesh;
        };
        const labelSprite=(text,width=1.1)=>{
          const c=document.createElement('canvas');c.width=384;c.height=84;
          const ctx=c.getContext('2d');ctx.clearRect(0,0,384,84);
          ctx.fillStyle='rgba(25,45,39,.91)';ctx.beginPath();ctx.roundRect(3,3,378,78,16);ctx.fill();
          ctx.fillStyle='#fff9ec';ctx.font='600 34px Arial';ctx.textAlign='center';ctx.fillText(String(text).slice(0,25),192,55,350);
          const tex=new THREE.CanvasTexture(c);const material=new THREE.SpriteMaterial({map:tex,depthTest:false,transparent:true,depthWrite:false});
          const sprite=new THREE.Sprite(material);sprite.scale.set(Math.min(width,.95),Math.min(width,.95)*.22,1);return sprite;
        };
        const clearWorld=()=>{
          world.children.forEach(obj=>{obj.traverse(node=>{
            if(node.geometry)node.geometry.dispose();
            const materials=Array.isArray(node.material)?node.material:[node.material];
            materials.forEach(m=>{if(m?.isSpriteMaterial){m.map?.dispose();m.dispose();}else if(m&&!Object.values(shared).includes(m))m.dispose();});
          });});world.clear();state.objects.clear();
        };
        const shapeFromLayoutPts = (pts=[]) => {
          const shape = new THREE.Shape();
          pts.forEach((pt,i)=>{ const p=coord(pt); if(i===0) shape.moveTo(p.x,-p.z); else shape.lineTo(p.x,-p.z); });
          shape.closePath();
          return shape;
        };
        const addOutlineFromPts = (pts=[], color=0xb99261, y=.026, opacity=.98) => {
          const outlinePts = pts.map(pt => coord(pt));
          if(outlinePts.length < 2) return;
          const arr=[];
          outlinePts.forEach((pt,i)=>{ arr.push(pt.x, y, pt.z); const nx=outlinePts[(i+1)%outlinePts.length]; arr.push(nx.x, y, nx.z); });
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
          const line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color, transparent:true, opacity }));
          world.add(line);
        };
        const rectFromPts = (pts=[]) => {
          if(!Array.isArray(pts) || !pts.length) return [];
          const xs = pts.map(pt => Number(pt?.x || 0));
          const ys = pts.map(pt => Number(pt?.y || 0));
          const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
          return [{x:minX,y:minY},{x:maxX,y:minY},{x:maxX,y:maxY},{x:minX,y:maxY}];
        };
        const floorTextureCache=new Map();
        state.releaseFloorTextures=()=>{floorTextureCache.forEach(texture=>texture.dispose());floorTextureCache.clear();};
        const makeCanvasTexture=(cacheKey, painter, repeatX=1, repeatY=1)=>{
          if(floorTextureCache.has(cacheKey)) return floorTextureCache.get(cacheKey);
          const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
          const ctx=canvas.getContext('2d');
          painter(ctx,canvas.width,canvas.height);
          const texture=new THREE.CanvasTexture(canvas);
          texture.colorSpace=THREE.SRGBColorSpace;
          texture.wrapS=THREE.RepeatWrapping;texture.wrapT=THREE.RepeatWrapping;
          texture.repeat.set(repeatX,repeatY);
          texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy?.()||4);
          texture.needsUpdate=true;
          floorTextureCache.set(cacheKey,texture);
          return texture;
        };
        const floorTexture=(key)=>{
          if(!key || key==='default' || !FLOOR_FINISHES[key])return null;
          if(floorTextureCache.has(`floor:${key}`))return floorTextureCache.get(`floor:${key}`);
          const finish=FLOOR_FINISHES[key];
          const texture=makeCanvasTexture(`floor:${key}`,(ctx)=>{
            ctx.fillStyle=finish.color;ctx.fillRect(0,0,256,256);
            if(key==='marble'){
              ctx.strokeStyle='rgba(148,158,150,.26)';ctx.lineWidth=2;
              for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-12,i*90+15);ctx.bezierCurveTo(72,i*90-28,145,i*90+45,270,i*90-12);ctx.stroke();}
            } else if(key==='wood'){
              ctx.strokeStyle='rgba(122,91,60,.18)';ctx.lineWidth=2;
              for(let k=0;k<8;k++){ctx.beginPath();ctx.moveTo(0,k*34);ctx.bezierCurveTo(68,k*34-3,184,k*34+4,256,k*34);ctx.stroke();}
            } else if(key==='concrete'){
              ctx.fillStyle='rgba(255,255,255,.035)';
              for(let i=0;i<100;i++){const px=(i*67)%256,py=(i*113)%256;ctx.fillRect(px,py,2,2);}
            }
            ctx.strokeStyle=finish.grout;ctx.globalAlpha=key==='concrete'?.18:.65;
            ctx.lineWidth=3;ctx.strokeRect(1.5,1.5,253,253);ctx.globalAlpha=1;
          });
          const tileSize=(finish.size||60)/100;
          texture.repeat.set(1/tileSize,1/tileSize);
          return texture;
        };
        const streetTexture=(kind='road', key='plain')=>{
          const cacheKey=`street:${kind}:${key}`;
          if(floorTextureCache.has(cacheKey)) return floorTextureCache.get(cacheKey);
          const texture=makeCanvasTexture(cacheKey,(ctx,w,h)=>{
            if(kind==='road'){
              ctx.fillStyle='#70777b';ctx.fillRect(0,0,w,h);
              ctx.fillStyle='rgba(255,255,255,.035)';for(let i=0;i<150;i++)ctx.fillRect((i*37)%w,(i*83)%h,2,2);
            }else if(kind==='sidewalk' && key==='paver'){
              ctx.fillStyle='#bf7c63';ctx.fillRect(0,0,w,h);
              ctx.strokeStyle='rgba(114,68,52,.42)';ctx.lineWidth=1.8;
              for(let y=0;y<=h;y+=28){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
              for(let y=0;y<h;y+=28){const offset=((y/28)%2)*28;for(let x=offset;x<=w;x+=56){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+28);ctx.stroke();}}
              ctx.strokeStyle='rgba(255,255,255,.08)';ctx.beginPath();ctx.moveTo(0,3);ctx.lineTo(w,3);ctx.stroke();
            }else{
              ctx.fillStyle='#e4ddd0';ctx.fillRect(0,0,w,h);
              ctx.strokeStyle='rgba(198,184,158,.58)';ctx.lineWidth=1.3;ctx.strokeRect(2,2,w-4,h-4);
              ctx.strokeStyle='rgba(222,214,196,.48)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w/2,0);ctx.lineTo(w/2,h);ctx.moveTo(0,h/2);ctx.lineTo(w,h/2);ctx.stroke();
            }
          });
          texture.repeat.set(kind==='road'?1.1:0.95,kind==='road'?1.1:0.95);
          return texture;
        };
        const addTopSurfaceFromPts = (pts=[], color=0x8a8f92, y=.012, outlineColor=0xe9dcc2, opacity=.98, order=0, floorFinish='default', textureOverride=null) => {
          if(!Array.isArray(pts) || pts.length < 3) return null;
          const shape = shapeFromLayoutPts(pts);
          const texture=textureOverride||floorTexture(floorFinish);
          const material = meshMat(texture?0xffffff:color,{map:texture||null,metalness:.03,roughness:floorFinish==='marble'?.57:.92,transparent:opacity < 1,opacity,polygonOffset:true,polygonOffsetFactor:-1-order*.15,polygonOffsetUnits:-1,side:THREE.DoubleSide});
          const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
          mesh.rotation.x = -Math.PI/2;
          mesh.position.y = y;
          mesh.receiveShadow = true;
          mesh.castShadow = false;
          world.add(mesh);
          if(outlineColor !== null) addOutlineFromPts(pts, outlineColor, y + .0035, .92);
          return mesh;
        };
        const addStreetNetwork=()=>{
          const model=v220StreetScene();
          const add=(rings,color,y,depth,kind,texture=null)=>{
            const geo=v220StreetGeometry(THREE,rings,coord,depth);if(!geo)return;
            const order={road:3,gutter:4,grates:5,centerline:6,crosswalk:7,sidewalk:2,curb:8}[kind]||3;
            const material=meshMat(texture?0xffffff:color,{map:texture,metalness:kind==='grates'?.35:.03,roughness:.89,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1-order*.4,polygonOffsetUnits:-2});
            const mesh=new THREE.Mesh(geo,material);mesh.rotation.x=-Math.PI/2;mesh.position.y=y;mesh.receiveShadow=true;mesh.castShadow=depth>0;mesh.userData={streetSurface:kind,streetIds:(appState.layout.streets||[]).map(s=>s.id)};world.add(mesh);
          };
          model.walks.forEach(w=>add(w.rings,w.finish==='paver'?0xbf7c63:0xe4ddd0,0,.12,'sidewalk',streetTexture('sidewalk',w.finish)));
          add(model.roads,0x70777b,.011,0,'road',streetTexture('road','plain'));add(model.gutters,0x434e52,.015,0,'gutter');add(model.grates,0xb0bab9,.018,0,'grates');add(model.curbs,0xe5bd3d,0,.14,'curb');add(model.markings,0xfff9ec,.024,0,'centerline');add(model.crossings,0xfff9ec,.025,0,'crosswalk');
        };
        const addDioramaBase = (pts=[]) => {
          const basePts = rectFromPts(pts);
          if(basePts.length < 4) return [];
          const shape = shapeFromLayoutPts(basePts);
          const base = new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.32,bevelEnabled:false}),[
            meshMat(0xd9c8af,{metalness:0,roughness:.94}),
            meshMat(0x88715b,{metalness:0,roughness:.98})
          ]);
          base.rotation.x = -Math.PI/2;
          base.position.y = -.32;
          base.receiveShadow = true;
          base.castShadow = true;
          base.userData.dioramaBase=true;world.add(base);
          const points=basePts.map(coord),width=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),depth=Math.max(...points.map(p=>p.z))-Math.min(...points.map(p=>p.z));
          const ground=new THREE.Mesh(new THREE.PlaneGeometry(width+4,depth+4),new THREE.ShadowMaterial({color:0x15202a,opacity:.24,transparent:true,depthWrite:false}));
          ground.rotation.x=-Math.PI/2;ground.position.y=-.325;ground.receiveShadow=true;ground.userData.dioramaShadow=true;world.add(ground);
          addTopSurfaceFromPts(basePts, 0xf7f1e4, .002, 0xe0caaa, .99, 0);
          addOutlineFromPts(basePts, 0xb09068, .026, .98);
          addOutlineFromPts(basePts, 0xf6ead5, .042, .84);
          addOutlineFromPts(basePts, 0x8e7555, .058, .38);
          return basePts;
        };
        const addStreetBand = (pts=[], opts={}) => addTopSurfaceFromPts(pts, opts.color||0x8a8f92, opts.y??.012, opts.outlineColor??0xe9dcc2, opts.opacity??.98, opts.order??0, opts.floorFinish||'default', opts.texture||null);
        const addStreetLabel = (street, pts=[]) => {
          if(!Array.isArray(pts) || !pts.length) return;
          const c = { x:pts.reduce((v,p)=>v+Number(p.x||0),0)/pts.length, y:pts.reduce((v,p)=>v+Number(p.y||0),0)/pts.length };
          const tag = labelSprite(`Calle ${street.side}`, 1.2);
          const cc = coord(c); tag.position.set(cc.x, .065, cc.z); world.add(tag);
        };
        const addStreetFurniture3D = street => {
          ensureStreetVisualDefaults(street);
          const concreteMat=meshMat(0xbdb8b1,{metalness:.08,roughness:.88});
          const curbMat=meshMat(0xd3bf58,{metalness:0,roughness:.82});
          const accentMat=meshMat(0xc96e56,{metalness:.02,roughness:.76});
          const darkMat=meshMat(0x65686c,{metalness:.24,roughness:.66});
          const soilMat=meshMat(0x665341,{metalness:0,roughness:.96});
          const leafMat=meshMat(0x557a4f,{metalness:0,roughness:.88});
          (street.streetFurniture||[]).forEach(item=>{
            const p=coord({x:Number(item.x||0),y:Number(item.y||0)});
            const group=new THREE.Group();
            group.userData={streetId:street.id,streetFurnitureId:item.id};
            state.urbanObjects.set(`${street.id}:${item.id}`,group);
            group.position.set(p.x,.042,p.z);
            group.rotation.y=-(Number(item.rotation||0)||0)*Math.PI/180;
            const w=Math.max(.18, Number(item.width||60)/100), d=Math.max(.18, Number(item.depth||40)/100);
            if(item.type==='urban-set'){
              const slab=new THREE.Mesh(new THREE.BoxGeometry(w,.05,d),concreteMat);slab.position.set(0,.025,0);slab.castShadow=slab.receiveShadow=true;group.add(slab);
              const benchLen=w*.34, benchDepth=d*.26;
              const bench1=new THREE.Mesh(new THREE.BoxGeometry(benchLen,.07,benchDepth),accentMat);bench1.position.set(-w*.2,.19,0);bench1.castShadow=bench1.receiveShadow=true;group.add(bench1);
              const bench2=new THREE.Mesh(new THREE.BoxGeometry(benchLen,.07,benchDepth),accentMat);bench2.position.set(w*.2,.19,0);bench2.castShadow=bench2.receiveShadow=true;group.add(bench2);
              [-1,1].forEach(dir=>{ [-1,1].forEach(sz=>{ const leg=new THREE.Mesh(new THREE.BoxGeometry(.05,.18,.05),accentMat); leg.position.set(dir*w*.2 + sz*benchLen*.32,.09,0); leg.castShadow=leg.receiveShadow=true; group.add(leg); }); });
              const planter=new THREE.Mesh(new THREE.BoxGeometry(d*.34,.34,d*.34),concreteMat);planter.position.set(0,.17,0);planter.castShadow=planter.receiveShadow=true;group.add(planter);
              const soil=new THREE.Mesh(new THREE.BoxGeometry(d*.24,.05,d*.24),soilMat);soil.position.set(0,.33,0);soil.castShadow=soil.receiveShadow=true;group.add(soil);
              const crown=new THREE.Mesh(new THREE.SphereGeometry(d*.13,14,12),leafMat);crown.position.set(0,.5,0);crown.castShadow=crown.receiveShadow=true;group.add(crown);
              [-1,1].forEach(side=>{ const body=new THREE.Mesh(new THREE.BoxGeometry(.14,.24,.14),darkMat);body.position.set(side*w*.44,.12,0);body.castShadow=body.receiveShadow=true;group.add(body); const cap=new THREE.Mesh(new THREE.BoxGeometry(.18,.04,.18),darkMat);cap.position.set(side*w*.44,.26,0);cap.castShadow=cap.receiveShadow=true;group.add(cap); });
            }else if(item.type==='bench'){
              const seat=new THREE.Mesh(new THREE.BoxGeometry(w,.08,d*.34),accentMat);seat.position.set(0,.25,0);seat.castShadow=seat.receiveShadow=true;group.add(seat);
              const back=new THREE.Mesh(new THREE.BoxGeometry(w,.12,.06),accentMat);back.position.set(0,.38,-d*.14);back.castShadow=back.receiveShadow=true;group.add(back);
              [-1,1].forEach(s=>{const leg=new THREE.Mesh(new THREE.BoxGeometry(.05,.25,.05),darkMat);leg.position.set(s*w*.36,.125,0);leg.castShadow=leg.receiveShadow=true;group.add(leg);});
            }else if(item.type==='planter'){
              const box=new THREE.Mesh(new THREE.BoxGeometry(w,.32,d),concreteMat);box.position.set(0,.16,0);box.castShadow=box.receiveShadow=true;group.add(box);
              const soil=new THREE.Mesh(new THREE.BoxGeometry(w*.78,.06,d*.78),soilMat);soil.position.set(0,.31,0);soil.castShadow=soil.receiveShadow=true;group.add(soil);
              const crown=new THREE.Mesh(new THREE.SphereGeometry(Math.min(w,d)*.22,14,12),leafMat);crown.position.set(0,.5,0);crown.castShadow=crown.receiveShadow=true;group.add(crown);
            }else if(item.type==='bollard'){
              const post=new THREE.Mesh(new THREE.BoxGeometry(.11,.42,.11),darkMat);post.position.set(0,.21,0);post.castShadow=post.receiveShadow=true;group.add(post);
              const cap=new THREE.Mesh(new THREE.BoxGeometry(.15,.05,.15),darkMat);cap.position.set(0,.44,0);cap.castShadow=cap.receiveShadow=true;group.add(cap);
            }else if(item.type==='bin'){
              const body=new THREE.Mesh(new THREE.BoxGeometry(.22,.34,.22),darkMat);body.position.set(0,.2,0);body.castShadow=body.receiveShadow=true;group.add(body);
              const top=new THREE.Mesh(new THREE.BoxGeometry(.26,.04,.26),darkMat);top.position.set(0,.39,0);top.castShadow=top.receiveShadow=true;group.add(top);
            }
            world.add(group);
            state.urbanMeshes.push(group);
          });
        };
        let wallUnionBands=[],visibleWallParts=[],wallHeightLevels=[],cutVisibility=new Map(),visibleWallSignature='',renderingFrame=false;
        const towardCamera=new THREE.Vector3();
        const resolveWallCut=()=>{
          camera.getWorldDirection(towardCamera).negate();
          const result=v219CutWallParts(appState.layout.walls||[],appState.layout.meta?.siteBoundary,state.wallDisplay,towardCamera,cutVisibility);
          cutVisibility=result.visibility;return result;
        };
        const buildArchitecturalWall=(wall,zoneCenters=[])=>{
          const scale=getScaleCmPerUnit()/100;
          const dx=Number(wall.x2||0)-Number(wall.x1||0),dy=Number(wall.y2||0)-Number(wall.y1||0);
          const L=Math.hypot(dx,dy);if(L<1)return;
          const selected=wall.id===state.selectedWallId && state.inspectorMode==='architecture';
          const group=new THREE.Group();
          const pos=coord({x:Number(wall.x1||0),y:Number(wall.y1||0)});
          group.position.set(pos.x,0,pos.z);group.rotation.y=-Math.atan2(dy,dx);
          group.userData={wallId:wall.id,entityType:'wall',cutaway:!!wall.v219Cutaway};
          const wallHeight=v219WallRenderHeight(wall,getScaleCmPerUnit());
          const thickness=Math.max(4,Number(wall.thickness||12))*scale;
          const faceOffsets=getWallFaceOffsets(wall);
          const faceCenter=(faceOffsets.left-faceOffsets.right)*scale*.5;
          const length=L*scale;
          const color=wall.material==='concrete'?0xc6c7c1:wall.material==='white'?0xf9f7f0:0xf1e8d9;
          const mat=meshMat(selected?0x83b4a2:color,{metalness:0,roughness:.89,side:THREE.DoubleSide});
          const lineMat=new THREE.LineBasicMaterial({color:selected?0x398d70:0xc2ae92,transparent:true,opacity:selected?.78:.38});
          const openings=(appState.layout.openings||[]).filter(o=>o.wallId===wall.id).map(o=>{
            const source=findWallById(wall.id)||wall,segment=getOpeningSegment(o,source);
            const w=Math.max(40,Number(segment?.width||o.width||90))*scale;
            const t=Number(segment?.t??o.t??.5),c=(t*(wall.v217SourceLength||L)-(wall.v217StartDistance||0))*scale;
            const sill=Math.max(0,Number(o.sill||0))*scale;
            const h=Math.max(20,Number(o.height||210))*scale;
            return {o,left:Math.max(0,c-w/2),right:Math.min(length,c+w/2),c,w,sill,h};
          }).filter(o=>o.c+o.w/2>0&&o.c-o.w/2<length&&o.sill<wallHeight-1e-7).sort((a,b)=>a.left-b.left);
          const cuts=[0,length,...openings.flatMap(o=>[o.left,o.right])].sort((a,b)=>a-b);
          const breaks=cuts.filter((n,i)=>i===0||Math.abs(n-cuts[i-1])>.001);
          const addWallPiece=(l,r,y0,y1)=>{
            if(r-l<.008||y1-y0<.008)return;
            const split=wallHeightLevels.find(h=>h>y0+1e-7&&h<y1-1e-7);
            if(split!==undefined){addWallPiece(l,r,y0,split);addWallPiece(l,r,split,y1);return;}
            let geo=null,position=null;
            // V210: project the joined CAD footprint into this wall's local
            // x/z frame so the virtual designer and layout close on the same
            // bevel/miter points, even at diagonal-to-vertical intersections.
            const neighbors=visibleWallParts.filter(p=>v219WallRenderHeight(p,getScaleCmPerUnit())>=y1-1e-7);
            const slice=typeof getWallSlicePolygon==='function'?getWallSlicePolygon(wall,l/length,r/length,1,neighbors):null;
            if(slice?.poly){wallUnionBands.push({poly:slice.poly,y0,y1,wallId:wall.id,material:mat,cutaway:!!wall.v219Cutaway});return;}
            if(slice?.poly?.length===4){
              const d={x:dx/L,y:dy/L};const n={x:-d.y,y:d.x};
              const ax=Number(wall.x1||0),ay=Number(wall.y1||0);
              const coords=slice.poly.map(p=>{const rx=p.x-ax,ry=p.y-ay;return {x:(rx*d.x+ry*d.y)*scale,z:(rx*n.x+ry*n.y)*scale};});
              const positions=[];coords.forEach(p=>positions.push(p.x,y0,p.z));coords.forEach(p=>positions.push(p.x,y1,p.z));
              const indices=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7];
              geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
              position={x:0,y:0,z:0};
            }else{geo=new THREE.BoxGeometry(r-l,y1-y0,thickness);position={x:(l+r)/2,y:(y0+y1)/2,z:faceCenter};}
            const mesh=new THREE.Mesh(geo,mat);
            mesh.position.set(position.x,position.y,position.z);
            mesh.castShadow=true;mesh.receiveShadow=true;
            mesh.userData={wallId:wall.id,entityType:'wall'};
            group.add(mesh);state.architectureMeshes.push(mesh);
            const edge=new THREE.LineSegments(new THREE.EdgesGeometry(geo),lineMat);
            edge.position.copy(mesh.position);group.add(edge);
          };
          for(let i=0;i<breaks.length-1;i++){
            const l=breaks[i],r=breaks[i+1],mid=(l+r)/2;
            if(r-l<.008)continue;
            const voids=openings.filter(o=>o.left<=mid+.001&&o.right>=mid-.001).map(o=>[o.sill,Math.min(wallHeight,o.sill+o.h)]).sort((a,b)=>a[0]-b[0]);
            let cursor=0;
            voids.forEach(([a,b])=>{if(a>cursor+.008)addWallPiece(l,r,cursor,a);cursor=Math.max(cursor,b);});
            if(wallHeight>cursor+.008)addWallPiece(l,r,cursor,wallHeight);
          }
          const frameMat=meshMat(0x515a55,{metalness:.38,roughness:.48});
          const glassMat=meshMat(0xadc9c5,{metalness:.08,roughness:.18,transparent:true,opacity:.33,depthWrite:false,side:THREE.DoubleSide});
          const addTrim=(o,cx,cy,w,h,d,material)=>{
            const half=Math.max(.012,w)/2,left=Math.max(0,cx-half),right=Math.min(length,cx+half);
            const halfH=Math.max(.012,h)/2,bottom=Math.max(0,cy-halfH),top=Math.min(wallHeight,cy+halfH);
            if(right-left<.001||top-bottom<.001)return null;
            const mesh=new THREE.Mesh(new THREE.BoxGeometry(right-left,top-bottom,Math.max(.015,d)),material);
            mesh.position.set((left+right)/2,(bottom+top)/2,faceCenter);mesh.castShadow=!material.transparent;mesh.receiveShadow=true;
            mesh.userData={openingId:o.id,wallId:wall.id,entityType:'opening'};
            group.add(mesh);state.architectureMeshes.push(mesh);
            return mesh;
          };
          openings.forEach(({o,left,right,c,w,sill,h})=>{
            const kind=normalizeOpeningType(o.type);
            if(kind==='free')return;
            const trim=Math.min(.055,Math.max(.025,w*.035));
            addTrim(o,c-w/2+trim/2,sill+h/2,trim,h,thickness*1.12,frameMat);
            addTrim(o,c+w/2-trim/2,sill+h/2,trim,h,thickness*1.12,frameMat);
            addTrim(o,c,sill+h-trim/2,w,trim,thickness*1.12,frameMat);
            if(kind==='window'){
              addTrim(o,c,sill+trim/2,w,trim,thickness*1.12,frameMat);
              addTrim(o,c,sill+h/2,trim,h,thickness*.72,frameMat); // Ventanal único de dos paños
              addTrim(o,c,sill+h/2,w-trim*2,h-trim*2,Math.max(.014,thickness*.18),glassMat);
            }
          });
          world.add(group);
        };
        const addArchitecturalWallJoints=()=>{
          const joints=getAllWallCornerClosurePolygons();
          const scale=getScaleCmPerUnit()/100;
          joints.forEach(joint=>{
            if(!Array.isArray(joint.poly)||joint.poly.length<3)return;
            const pts=joint.poly.map(coord);
            if(!pts.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)))return;
            const shape=new THREE.Shape();
            pts.forEach((v,i)=>i?shape.lineTo(v.x,-v.z):shape.moveTo(v.x,-v.z));
            shape.closePath();
            const height=Math.max(60,Number(joint.height||290))*scale;
            const geo=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:1,steps:1});
            geo.rotateX(-Math.PI/2);
            const mat=meshMat(joint.selected?0xd8eadf:0xf1e8d9,{metalness:0,roughness:.89,side:THREE.DoubleSide});
            const mesh=new THREE.Mesh(geo,mat);
            mesh.castShadow=true;mesh.receiveShadow=true;
            const hostWall=joint.prevWallId || joint.currWallId || (appState.layout?.walls||[]).find(w=>w.startNodeId===joint.nodeId||w.endNodeId===joint.nodeId)?.id||'';
            mesh.userData={entityType:'wall',wallId:hostWall};
            world.add(mesh);state.architectureMeshes.push(mesh);
          });
        };
        const addFurniture=r=>{
          const spec=vspaceSpec(r);
          const group=new THREE.Group();group.userData={furnitureId:r.id};
          const c=coord({x:Number(r.x)+(Number(r.w)||0)/2,y:Number(r.y)+(Number(r.h)||0)/2});
          group.position.set(c.x,Number(r.baseHeight||0)/100,c.z);
          group.rotation.y=-(Number(r.rot||0)*Math.PI/180);
          vspaceBuildIsometricFurniture(THREE,group,r,spec,{
            shared,block:addBlock,sprite:labelSprite,selected:r.id===state.selectedId,
            selectedLevel:state.selectedLevel,selectedSlot:state.selectedSlot,products:vspaceProductsForSlot
          });
          // Cinta de nivel física: diferencia N1/N2/N3 sin alterar los materiales del modelo.
          if(r.stackGroupId){
            const levelColor=[0x4a86c5,0x59a66e,0xe79a45,0x9675bc,0x5096a4,0xc47c8a][Math.max(0,Number(r.stackLevel||0))%6];
            const markerMat=new THREE.MeshStandardMaterial({color:levelColor,roughness:.72,metalness:.08});
            const strip=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.06,spec.width/100-.012),.013,.014),markerMat);
            strip.position.set(0,.025,spec.depth/200+.014);
            group.add(strip);
          }
          world.add(group);state.objects.set(r.id,group);
        };
        const rebuild=()=>{
          clearWorld();wallUnionBands=[];const cut=resolveWallCut();visibleWallParts=cut.parts;visibleWallSignature=cut.signature;
          wallHeightLevels=[...new Set([0,...visibleWallParts.map(p=>v219WallRenderHeight(p,getScaleCmPerUnit()))])].sort((a,b)=>a-b);
          refreshSceneFrame();
          const zones=appState.layout.zones||[];
          const siteBoundary = Array.isArray(appState.layout?.meta?.siteBoundary?.pts) ? appState.layout.meta.siteBoundary.pts : [];
          const streets = Array.isArray(appState.layout?.streets) ? appState.layout.streets : [];
          const footprintSource = [];
          siteBoundary.forEach(pt => footprintSource.push(pt));
          const totalContours=v219TotalContours();totalContours.flat().forEach(pt=>footprintSource.push(pt));
          streets.forEach(street => [ ...(street.outerSidewalkPts||[]), ...(street.roadPts||[]), ...(street.sidewalkPts||[]),...(street.sidewalkExtraContours||[]).flat() ].forEach(pt => footprintSource.push(pt)));
          if(!footprintSource.length) zones.forEach(zone => (zone.pts||[]).forEach(pt => footprintSource.push(pt)));
          const dioramaBase = addDioramaBase(footprintSource);
          if(siteBoundary.length >= 3){
            addTopSurfaceFromPts(siteBoundary, 0xefe6d7, .01, 0xc9b28f, .98, 1);
            addOutlineFromPts(siteBoundary, 0xae9069, .032, .96);
            addOutlineFromPts(siteBoundary, 0xf1e5cf, .046, .78);
          }
          totalContours.forEach(pts=>{const surface=addTopSurfaceFromPts(pts,0xe2cfb3,.006,0xae9069,.98,0);if(surface)surface.userData.totalArea=true;});
          addStreetNetwork();
          streets.forEach(street=>{addStreetLabel(street,street.roadPts);addStreetFurniture3D(street);});
          for(const zone of zones){
            const pts=zone.pts||[];if(pts.length<3)continue;
            const zoneColor=new THREE.Color(zone.color||'#2f7b6e');
            const surface=addTopSurfaceFromPts(pts, 0xe9d7bb, .022, zoneColor, .98, 4, zone.floorFinish||'default');
            if(surface)surface.userData.zoneId=zone.id;
            addOutlineFromPts(pts, zoneColor, .03, .98);
            addOutlineFromPts(pts, 0xe6d5b5, .041, .82);
          }
          state.architectureMeshes=[];state.urbanMeshes=[];state.urbanObjects=new Map();
          if(state.wallVisible){
            visibleWallParts.forEach(w=>buildArchitecturalWall(w));
            const levels=wallHeightLevels;
            for(let i=0;i<levels.length-1;i++){
              const y0=levels[i],y1=levels[i+1],neighbors=visibleWallParts.filter(p=>v219WallRenderHeight(p,getScaleCmPerUnit())>=y1-1e-7);
              v216JointPieces(neighbors).forEach(j=>{const host=wallUnionBands.find(b=>j.ids.includes(b.wallId)&&b.y0<=y0+1e-7&&b.y1>=y1-1e-7);if(host)wallUnionBands.push({poly:j.poly,y0,y1,wallId:host.wallId,material:host.material,cutaway:!!host.cutaway});});
            }
            v216AddUnionMeshes(THREE,world,wallUnionBands,coord,mesh=>state.architectureMeshes.push(mesh),{walls:visibleWallParts});
          }
          // Small unobtrusive measurement grid, enabled over the entire editing area.
          const boundsW=(zoneBounds.length?Math.max(...zoneBounds.map(p=>p.x))-Math.min(...zoneBounds.map(p=>p.x)):700)*getScaleCmPerUnit()/100;
          const boundsH=(zoneBounds.length?Math.max(...zoneBounds.map(p=>p.y))-Math.min(...zoneBounds.map(p=>p.y)):600)*getScaleCmPerUnit()/100;
          if(zones.length){
            const count=Math.max(10,Math.ceil(Math.max(boundsW,boundsH)*2));
            const grid=new THREE.GridHelper(Math.max(7,Math.ceil(Math.max(boundsW,boundsH))),count,0xb9a78f,0xb9a78f);
            grid.material.transparent=true;grid.material.opacity=.12;grid.position.y=.002;world.add(grid);
          }
          (appState.layout.racks||[]).filter(rackAtLevel).forEach(addFurniture);
          if(state.wallVisible && (appState.layout.meta?.siteBoundary?.pts||[]).length<3){vspaceToast('Dibuja primero el perímetro desde Plano / Estructura.');}
          state.requestRender();
        };
        state.requestRender=()=>{
          if(state.destroyed||state.raf||renderingFrame)return;
          state.raf=requestAnimationFrame(()=>{
            state.raf=0;if(state.destroyed)return;renderingFrame=true;
            try{updateCam();const cut=resolveWallCut();if(cut.signature!==visibleWallSignature)rebuild();renderer.render(scene,camera);}
            finally{renderingFrame=false;}
          });
        };
        state.render=()=>rebuild();
        state.updateSceneTheme=()=>{scene.background.setHex(document.body.classList.contains('theme-light')?0xd6dde1:0x202b33);state.requestRender();};
        state.themeObs=new MutationObserver(()=>state.updateSceneTheme());state.themeObs.observe(document.body,{attributes:true,attributeFilter:['class']});
        state.setCamera=mode=>{
          const points=zoneBounds.length?zoneBounds:[{x:mx-300,y:my-200},{x:mx+300,y:my+200}];
          const width=(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*getScaleCmPerUnit()/100;
          const depth=(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))*getScaleCmPerUnit()/100;
          orbit.radius=vspaceClamp(Math.max(width,depth)*1.48+2.3,4,65);
          orbit.theta=mode==='front'?0:mode==='top'?.0001:V217_ISO_THETA;
          orbit.phi=mode==='top'?.04:mode==='front'?1.26:V217_ISO_PHI;
          orbit.target.set(0,.8,0);state.mode=mode;root.querySelectorAll('[data-vspace-cam]').forEach(b=>b.classList.toggle('active',b.dataset.vspaceCam===mode));root.querySelector('.vspace-compass').textContent=(mode==='top'?'PLN':mode==='front'?'FRT':'ISO');state.requestRender();
        };
        state.focusSelected=()=>{
          const r=getRack();if(!r)return;
          const c=coord({x:Number(r.x)+Number(r.w)/2,y:Number(r.y)+Number(r.h)/2});
          orbit.target.set(c.x,Number(r.baseHeight||0)/100+vspaceSpec(r).height/200,c.z);
          orbit.radius=vspaceClamp(Math.max(vspaceSpec(r).width,vspaceSpec(r).depth)/55+3,3,12);orbit.phi=.94;state.requestRender();
          root.querySelector('.vspace-compass').textContent='SEL';
        };
        const intersectArchitecture=e=>{
          applyPointer(e);
          const hits=raycaster.intersectObjects(state.architectureMeshes||[],false);
          const opening=hits.find(hit=>hit.object?.userData?.openingId);
          const hit=opening||hits[0];
          return hit?{wallId:v216WallIdAtHit(hit),openingId:hit.object.userData.openingId||''}:null;
        };
        const intersectFurniture=(e,excludeRackId='')=>{
          applyPointer(e);
          const intersections=raycaster.intersectObjects([...state.objects.values()],true);
          for(const hit of intersections){
            let obj=hit.object;
            while(obj && !obj.userData?.furnitureId) obj=obj.parent;
            if(obj?.userData?.furnitureId && obj.userData.furnitureId!==excludeRackId) return {rackId:obj.userData.furnitureId,level:hit.object.userData?.level||0,slot:hit.object.userData?.slot||0};
          }
          return null;
        };
        const intersectUrban=e=>{
          applyPointer(e);
          const hits=raycaster.intersectObjects(state.urbanMeshes||[],true);
          for(const hit of hits){
            let obj=hit.object;while(obj&&!obj.userData?.streetFurnitureId)obj=obj.parent;
            if(obj?.userData?.streetFurnitureId)return {streetId:obj.userData.streetId,furnitureId:obj.userData.streetFurnitureId};
          }
          const surfaces=world.children.filter(m=>m.userData?.streetSurface);const surface=raycaster.intersectObjects(surfaces,false)[0];if(surface){const id=v221PickStreet(invCoord(surface.point));if(id)return {streetId:id,furnitureId:''};}
          return null;
        };
        const groundPoint=e=>{
          applyPointer(e);const target=new THREE.Vector3();return raycaster.ray.intersectPlane(ground,target)?invCoord(target):null;
        };
        let gesture=null;
        canvas.addEventListener('contextmenu',e=>e.preventDefault());
        canvas.addEventListener('pointerdown',e=>{
          if(e.button!==0&&e.button!==1&&e.button!==2)return;
          if(state.archDrawMode&&e.button===0&&!e.shiftKey){
            const p=groundPoint(e);
            if(!p || !pointInLayoutBoundary(p))return vspaceToast('Selecciona un punto dentro del área general.',true);
            if(!state.drawWallStart){state.drawWallStart=p;state.refreshInspector();vspaceToast('Primer extremo definido. Selecciona el segundo punto.');}
            else{
              const a=state.drawWallStart;state.drawWallStart=null;state.archDrawMode=false;
              if(Math.hypot(p.x-a.x,p.y-a.y)<30/Math.max(.0001,getScaleCmPerUnit()))return vspaceToast('El muro debe tener al menos 30 cm de longitud.',true);
              recordHistorySnapshot('structure');const w=createWallSegment(a,p);
              if(w){selectArch(w.id);vspaceCommit(`muro ${w.id} creado`);}else{state.refreshInspector();vspaceToast('No se pudo crear el tramo.',true);}
            }
            e.preventDefault();return;
          }
          // V196: el segundo clic resuelve el soporte sin cambiar la selección del mueble superior.
          if(state.stackSourceId&&e.button===0&&!e.shiftKey){
            const target=intersectFurniture(e,state.stackSourceId);
            if(target)finishStackMode(target.rackId);
            else vspaceToast('Haz clic sobre el mueble inferior o selecciónalo desde la lista izquierda.',true);
            e.preventDefault();return;
          }
          const archHit=state.inspectorMode==='architecture'?intersectArchitecture(e):null;
          const urbanHit=state.inspectorMode==='urban'?intersectUrban(e):null;
          const hit=state.inspectorMode==='furniture'&&!archHit&&!urbanHit?intersectFurniture(e):null;
          if(archHit){selectArch(archHit.wallId,archHit.openingId);}
          else if(urbanHit){state.selectedStreetId=urbanHit.streetId;state.selectedStreetFurnitureId=urbanHit.furnitureId;appState.selectedStreetId=urbanHit.streetId;appState.selectedStreetFurnitureId=urbanHit.furnitureId;state.refreshInspector();}
          else if(hit){state.select(hit.rackId,hit.level||state.selectedLevel,hit.slot||state.selectedSlot);}
          const point=state.move&&canWrite()?groundPoint(e):null;
          const rack=hit && appState.layout.racks.find(r=>r.id===hit.rackId);
          if(rack?.stackedOnId&&state.move&&e.button===0){vspaceToast('Este módulo está sobre otro. Desvincúlalo antes de moverlo individualmente.',true);}
          const urbanItem=urbanHit?(appState.layout.streets||[]).find(s=>s.id===urbanHit.streetId)?.streetFurniture?.find(item=>item.id===urbanHit.furnitureId):null;
          const wantsPan = e.button===1 || e.button===2 || e.shiftKey;
          gesture={x:e.clientX,y:e.clientY,button:e.button,mode:(e.button===0&&state.move&&canWrite()&&urbanItem&&!e.shiftKey)?'move-urban':(e.button===0&&state.move&&canWrite()&&rack&&!rack.stackedOnId&&!e.shiftKey)?'move':wantsPan?'pan':'orbit',rackId:rack?.id||'',urbanId:urbanHit?.furnitureId||'',streetId:urbanHit?.streetId||'',
            initialX:Number(rack?.x||0),initialY:Number(rack?.y||0),urbanStartX:Number(urbanItem?.x||0),urbanStartY:Number(urbanItem?.y||0),groundStart:point,moved:false};
          try{canvas.setPointerCapture(e.pointerId);}catch(_){}
        });
        canvas.addEventListener('pointermove',e=>{
          if(!gesture)return;
          const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;
          if(Math.abs(dx)+Math.abs(dy)>.3)gesture.moved=true;
          if(gesture.mode==='orbit'){
            orbit.theta-=dx*.008;orbit.phi=vspaceClamp(orbit.phi-dy*.006,.12,1.54);
          }else if(gesture.mode==='pan'){
            const forward=new THREE.Vector3();camera.getWorldDirection(forward);forward.y=0;forward.normalize();
            const right=new THREE.Vector3().crossVectors(forward,new THREE.Vector3(0,1,0)).normalize();
            const sensitivity=orbit.radius*.0018;orbit.target.addScaledVector(right,dx*sensitivity).addScaledVector(forward,dy*sensitivity);
          }else if(gesture.mode==='move-urban'){
            const street=(appState.layout.streets||[]).find(s=>s.id===gesture.streetId);
            const item=street?.streetFurniture?.find(it=>it.id===gesture.urbanId);
            const current=groundPoint(e);
            if(item&&current&&gesture.groundStart){
              const raw={x:gesture.urbanStartX+current.x-gesture.groundStart.x,y:gesture.urbanStartY+current.y-gesture.groundStart.y};
              const point=appState.editor?.snapEnabled===false?raw:{x:snapGrid(raw.x),y:snapGrid(raw.y)};
              if(v220PointOnSidewalk(point,street)){
                item.x=point.x;item.y=point.y;
                const group=state.urbanObjects?.get(`${street.id}:${item.id}`);
                if(group){const cp=coord(point);group.position.x=cp.x;group.position.z=cp.z;}
              }
            }
          }else if(gesture.mode==='move'){
            const rack=appState.layout.racks.find(r=>r.id===gesture.rackId),current=groundPoint(e);
            if(rack&&current&&gesture.groundStart){
              const candidate={...rack,x:Math.round(gesture.initialX+current.x-gesture.groundStart.x),y:Math.round(gesture.initialY+current.y-gesture.groundStart.y)};
              const drafts=vspaceFollowAttachedModules(rack,candidate);
              if(vspaceValidateRackProposals(drafts).ok){
                drafts.forEach(next=>{
                  const current=(appState.layout.racks||[]).find(item=>item.id===next.id);if(!current)return;
                  current.x=next.x;current.y=next.y;current.baseHeight=next.baseHeight;
                  const group=state.objects.get(current.id);
                  if(group){const cp=coord({x:current.x+current.w/2,y:current.y+current.h/2});group.position.x=cp.x;group.position.z=cp.z;group.position.y=Number(current.baseHeight||0)/100;}
                });state.refreshMiniLayout();
              }
            }
          }
          gesture.x=e.clientX;gesture.y=e.clientY;state.requestRender();
        });
        canvas.addEventListener('pointerup',()=>{
          if(gesture?.mode==='move-urban'&&gesture.moved){vspaceCommit('mobiliario urbano desplazado');state.refreshInspector();}
          if(gesture?.mode==='move'&&gesture.moved){vspaceCommit('mueble desplazado');state.refreshInspector();}
          // Camera cut is evaluated in the render frame; rebuild only if the visible set changes.
          gesture=null;
        });
        canvas.addEventListener('pointercancel',()=>{gesture=null;});
        canvas.addEventListener('wheel',e=>{e.preventDefault();orbit.radius*=e.deltaY>0?1.1:.9;orbit.radius=vspaceClamp(orbit.radius,2.5,80);state.requestRender();},{passive:false});
        canvas.addEventListener('dblclick',e=>{const archHit=state.inspectorMode==='architecture'?intersectArchitecture(e):null;const hit=archHit?null:intersectFurniture(e); if(archHit)selectArch(archHit.wallId,archHit.openingId);else if(hit){state.select(hit.rackId,hit.level||state.selectedLevel,hit.slot||state.selectedSlot); state.focusSelected();} else state.setCamera(state.mode||'iso');});
        state.keyHandler=e=>{
          if(state.destroyed) return;
          const tag=(document.activeElement?.tagName||'').toLowerCase(); if(tag==='input'||tag==='textarea'||tag==='select') return;
          const step=Math.max(.18,orbit.radius*.05);
          if(e.key==='Escape'&&state.stackSourceId){cancelStackMode();e.preventDefault();}
          else if(e.key==='Escape'&&state.archDrawMode){state.archDrawMode=false;state.drawWallStart=null;state.refreshInspector();e.preventDefault();}
          else if(e.key==='1'){state.setCamera('iso');e.preventDefault();}
          else if(e.key==='2'){state.setCamera('top');e.preventDefault();}
          else if(e.key==='3'){state.setCamera('front');e.preventDefault();}
          else if(e.key.toLowerCase()==='f'){state.focusSelected();e.preventDefault();}
          else if(e.key.toLowerCase()==='m'&&canWrite()){if(state.stackSourceId)cancelStackMode(true);state.move=!state.move;root.querySelector('[data-vspace-action="move"]').textContent=`Mover: ${state.move?'ON':'OFF'}`;root.querySelector('[data-vspace-action="move"]').classList.toggle('active',state.move);e.preventDefault();}
          else if(e.key==='ArrowUp'||e.key.toLowerCase()==='w'){orbit.target.z-=step;state.requestRender();e.preventDefault();}
          else if(e.key==='ArrowDown'||e.key.toLowerCase()==='s'){orbit.target.z+=step;state.requestRender();e.preventDefault();}
          else if(e.key==='ArrowLeft'||e.key.toLowerCase()==='a'){orbit.target.x-=step;state.requestRender();e.preventDefault();}
          else if(e.key==='ArrowRight'||e.key.toLowerCase()==='d'){orbit.target.x+=step;state.requestRender();e.preventDefault();}
          else if(e.key==='+'||e.key==='='){orbit.radius=vspaceClamp(orbit.radius*.92,2.5,80);state.requestRender();e.preventDefault();}
          else if(e.key==='-'){orbit.radius=vspaceClamp(orbit.radius*1.08,2.5,80);state.requestRender();e.preventDefault();}
        };
        window.addEventListener('keydown',state.keyHandler);
        const resize=()=>{
          if(state.destroyed)return;const bounds=canvas.getBoundingClientRect();
          const w=Math.max(160,Math.floor(bounds.width)),h=Math.max(120,Math.floor(bounds.height));
          renderer.setSize(w,h,false);state.requestRender();
        };
        state.resizeObs=new ResizeObserver(resize);state.resizeObs.observe(canvas);
        rebuild();state.setCamera('iso');
        // Keep the whole diorama framed on entry. Focus is an explicit action.
        resize();root.querySelector('#vspaceLoading')?.remove();
        vspaceToast('Modelo 3D listo. Mobiliario y Arquitectura comparten las propiedades guardadas con Editar layout.');
      }catch(err){console.error('Vista virtual 3D:',err);const el=root.querySelector('#vspaceLoading');if(el)el.textContent=`No se pudo inicializar la vista 3D: ${err.message||err}. Verifica WebGL y la dependencia Three.js.`;}
    })();
  }
