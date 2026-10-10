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
      width:vspaceClamp(vspaceFloat(physical.width, rack?.virtualType ? preset.width : vspaceFloat(model.width,rack?.w*scale||120)),30,1000),
      depth:vspaceClamp(vspaceFloat(physical.depth, rack?.virtualType ? preset.depth : vspaceFloat(model.depth,rack?.h*scale||50)),20,700),
      height:vspaceClamp(vspaceFloat(physical.height,vspaceFloat(rack?.rackHeight, vspaceFloat(model.height,preset.height))),30,600),
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
      if(Math.abs(Number(r.baseHeight||0)-Number(candidate.baseHeight||0))>5) return false;
      const q=vspaceBounds(r);
      return b.left<q.right-2 && b.right>q.left+2 && b.top<q.bottom-2 && b.bottom>q.top+2;
    });
    return collision?{ok:false,msg:`Colisión detectada con ${collision.virtualName||collision.id}.`}:{ok:true,msg:''};
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
    if(patch.rot!==undefined)cloneRack.rot=((Math.round(vspaceFloat(patch.rot,0)/90)*90)%360+360)%360;
    for(const key of ['width','depth','height','levels','slots'])if(patch[key]!==undefined){
      const limits=key==='levels'||key==='slots'?[1,12]:key==='height'?[30,600]:[20,1000];
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
    // No dejar ubicaciones con SKU o cajas invisibles tras reducir los niveles.
    const invalid=(rack.virtualPlacements||[]).some(a=>Number(a.level)>spec.levels||Number(a.slot)>spec.slots)
      ||(rack.virtualContainers||[]).some(a=>a.kind!=='none'&&Number(a.count)>0&&(Number(a.level)>spec.levels||Number(a.slot)>spec.slots));
    if(invalid){vspaceToast('Hay productos o cajas en niveles que desaparecerían. Reubícalos antes de reducirlos.',true);vspaceActive?.refreshInspector();return;}
    const fitting=vspaceFits(cloneRack,rack.id);
    if(!fitting.ok){vspaceToast(fitting.msg,true);vspaceActive?.refreshInspector();return;}
    Object.assign(rack,cloneRack);
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
      <div class="vspace-toolbar-right"><div class="vspace-mode-switch"><button data-vspace-mode="build" class="active">Construir</button><button data-vspace-mode="place">Ubicar</button><button data-vspace-mode="explore">Explorar</button></div><button data-vspace-cam="iso" class="active">Isométrica</button><button data-vspace-cam="top">Planta</button><button data-vspace-cam="front">Frontal</button><button data-vspace-action="fit">Ajustar</button><button data-vspace-action="focus">Enfocar</button><button data-vspace-action="toggle-wall" class="active">Muros</button><button data-vspace-action="move" ${canEdit?'':'disabled'}>Mover: OFF</button><button data-vspace-action="save" class="vspace-save" ${canEdit?'':'disabled'}>Guardar en nube</button></div></div>
      <div class="vspace-main"><aside class="vspace-left"><div class="vspace-sidebar-section" data-vs-section="library"><h4>Biblioteca 3D</h4><p>Agrega estanterías, vitrinas, cajoneras o contenedores desde este panel.</p><div class="vspace-catalog">${typelist}</div><button class="vspace-example-btn" data-vspace-action="sample" ${canEdit?'':'disabled'}>✧ Preparar ambiente de ejemplo</button></div>
      <div class="vspace-sidebar-section" data-vs-section="search"><h4>Buscar producto / SKU</h4><div class="vspace-search"><input id="vspaceFindSku" placeholder="SKU, nombre o barras…" autocomplete="off"><button data-vspace-action="find">⌕</button></div><div class="vspace-hits" id="vspaceHits"></div></div>
      <div class="vspace-sidebar-section" data-vs-section="objects"><h4>Muebles ubicados</h4><div id="vspaceObjects" class="vspace-object-list"></div></div></aside>
      <section class="vspace-stage"><canvas id="vspaceCanvas" aria-label="Visualizador tridimensional interactivo del almacén"></canvas>
      <details class="vspace-help"><summary title="Controles de navegación 3D" aria-label="Mostrar ayuda de navegación">? Ayuda</summary><div>Arrastrar: orbitar · Shift + arrastrar: desplazar · Rueda: zoom · Doble clic: enfocar · F: enfocar · 1/2/3: vistas</div></details>
      <div class="vspace-compass">ISO</div><div class="vspace-loading" id="vspaceLoading">Preparando el espacio tridimensional…</div></section>
      <aside class="vspace-inspector"><h4 id="vspaceInspectorHeading">Inspector de ubicaciones</h4>
      <div class="vspace-panel-tabs" role="group" aria-label="Editor activo"><button type="button" data-vspace-panel="furniture" class="active">Mobiliario</button><button type="button" data-vspace-panel="architecture">Arquitectura</button></div>
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
    const state={root,canvas,selectedId:appState.selectedRackLayoutId||'',selectedLevel:1,selectedSlot:1,inspectorMode:'furniture',selectedWallId:appState.selectedWallId||'',selectedOpeningId:appState.selectedOpeningId||'',drawWallStart:null,modified:false,wallVisible:true,move:false,mode:'iso',editMode:'build',destroyed:false,objects:new Map(),architectureMeshes:[]};
    vspaceActive=state;
    const getRack=()=>appState.layout.racks?.find(r=>r.id===state.selectedId)||null;
    const canWrite=()=>vspaceIsEditable();
    const collectScenePoints=()=>{
      const pts=[];
      (appState.layout.zones||[]).forEach(z=>(z.pts||[]).forEach(p=>pts.push(p)));
      const sitePts = Array.isArray(appState.layout?.meta?.siteBoundary?.pts) ? appState.layout.meta.siteBoundary.pts : [];
      sitePts.forEach(p=>pts.push(p));
      (appState.layout.streets||[]).forEach(s=>[...(s.sidewalkPts||[]),...(s.roadPts||[]),...(s.outerSidewalkPts||[])].forEach(p=>pts.push(p)));
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
          <button type="button" class="vspace-primary" id="vsApplyWall" ${lock}>Aplicar propiedades del muro</button>
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
        wall.thickness=nextThick;wall.height=nextH;wall.material=host.querySelector('#vsWallFinish').value;
        syncManualWallsFromNodes();ensureOpeningAttachmentOffsets();vspaceCommit(`muro ${wall.id}`);state.refreshInspector();
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
      state.inspectorMode=btn.dataset.vspacePanel;state.archDrawMode=false;state.drawWallStart=null;
      root.querySelectorAll('[data-vspace-panel]').forEach(b=>b.classList.toggle('active',b===btn));
      root.querySelector('#vspaceInspectorHeading').textContent=state.inspectorMode==='architecture'?'Inspector arquitectónico':'Inspector de ubicaciones';
      state.refreshInspector();state.render?.(true);
    }));
    state.refreshInspector=()=>{
      if(state.inspectorMode==='architecture') return state.refreshArchitecturalInspector();
      const rack=getRack(),host=root.querySelector('#vspaceInspector');
      state.refreshObjects();
      if(!rack){host.innerHTML='<div class="vspace-empty">Selecciona un mueble en 3D o desde la lista de la izquierda.</div>';return;}
      const sp=vspaceSpec(rack);state.selectedLevel=vspaceClamp(state.selectedLevel,1,sp.levels);state.selectedSlot=vspaceClamp(state.selectedSlot,1,sp.slots);
      const assignments=vspaceProductsForSlot(rack,state.selectedLevel,state.selectedSlot);
      const assigned=assignments[0]||null;
      const levels=Array.from({length:sp.levels},(_,i)=>`<button class="${i+1===state.selectedLevel?'active':''}" data-vspace-level="${i+1}">N${i+1}</button>`).join('');
      const slots=Array.from({length:sp.slots},(_,i)=>`<button class="${i+1===state.selectedSlot?'active':''}" data-vspace-slot="${i+1}">P${i+1}</button>`).join('');
      host.innerHTML=`<div class="vspace-inspector-id"><b>${vspaceEsc(sp.title)}</b><small>${vspaceEsc(rack.id)} · ${vspaceEsc(VSPACE_TYPES[sp.kind].name)}</small></div>
        <label class="vspace-field">Nombre<input id="vsName" value="${vspaceEsc(sp.title)}" ${lock}></label>
        <div class="vspace-grid-2"><label class="vspace-field">Ancho (cm)<input id="vsWidth" type="number" min="30" max="1000" value="${sp.width}" ${lock}></label><label class="vspace-field">Fondo (cm)<input id="vsDepth" type="number" min="20" max="700" value="${sp.depth}" ${lock}></label></div>
        <div class="vspace-grid-2"><label class="vspace-field">Alto (cm)<input id="vsHeight" type="number" min="30" max="600" value="${sp.height}" ${lock}></label><label class="vspace-field">Giro (°)<select id="vsRotation" ${lock}>${[0,90,180,270].map(d=>`<option value="${d}" ${Number(rack.rot||0)===d?'selected':''}>${d}°</option>`).join('')}</select></label></div>
        <div class="vspace-grid-2"><label class="vspace-field">Niveles<input id="vsLevels" type="number" min="1" max="12" value="${sp.levels}" ${lock}></label><label class="vspace-field">Posiciones / nivel<input id="vsSlots" type="number" min="1" max="12" value="${sp.slots}" ${lock}></label></div>
        <div class="vspace-grid-2"><label class="vspace-field">X plano<input id="vsX" type="number" value="${Math.round(rack.x)}" ${lock}></label><label class="vspace-field">Y plano<input id="vsY" type="number" value="${Math.round(rack.y)}" ${lock}></label></div>
        <button class="vspace-primary" id="vsUpdate" ${lock}>Aplicar medidas y posición</button><div class="vspace-divider"></div>
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
      host.querySelectorAll('[data-vspace-level]').forEach(b=>b.onclick=()=>{state.selectedLevel=Number(b.dataset.vspaceLevel);state.refreshInspector();state.render(false);});
      host.querySelectorAll('[data-vspace-slot]').forEach(b=>b.onclick=()=>{state.selectedSlot=Number(b.dataset.vspaceSlot);state.refreshInspector();state.render(false);});
      host.querySelector('#vsUpdate')?.addEventListener('click',()=>{
        vspaceUpdateRack(rack,{name:host.querySelector('#vsName').value,width:host.querySelector('#vsWidth').value,depth:host.querySelector('#vsDepth').value,
          height:host.querySelector('#vsHeight').value,levels:host.querySelector('#vsLevels').value,slots:host.querySelector('#vsSlots').value,
          rot:host.querySelector('#vsRotation').value,x:host.querySelector('#vsX').value,y:host.querySelector('#vsY').value});
      });
      host.querySelector('#vsPutContainers')?.addEventListener('click',()=>vspaceSetSlotContainers(rack,state.selectedLevel,state.selectedSlot,host.querySelector('#vsContainerKind').value,host.querySelector('#vsContainerCount').value));
      host.querySelector('#vsAssign')?.addEventListener('click',()=>vspaceAssign(rack,state.selectedLevel,state.selectedSlot,host.querySelector('#vsSku').value,host.querySelector('#vsQty').value));
      host.querySelector('#vsRemoveAssignment')?.addEventListener('click',()=>vspaceAssign(rack,state.selectedLevel,state.selectedSlot,''));
      host.querySelector('#vsDelete')?.addEventListener('click',()=>{
        if(!confirm(`¿Eliminar ${sp.title} y sus asignaciones?`))return;
        appState.layout.racks=appState.layout.racks.filter(r=>r.id!==rack.id);
        state.selectedId=appState.layout.racks[0]?.id||'';
        vspaceCommit('mueble eliminado');state.refreshInspector();
      });
      host.querySelector('#vsDuplicate')?.addEventListener('click',()=>{
        const cloneRack=JSON.parse(JSON.stringify(rack));cloneRack.id=`${rack.id}-C${Date.now().toString(36).slice(-4).toUpperCase()}`;
        cloneRack.virtualName=`${sp.title} (copia)`;cloneRack.x+=20;cloneRack.y+=20;
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
      state.refreshInspector();state.render(false);
    };
    root.querySelectorAll('[data-vspace-add]').forEach(b=>b.onclick=()=>vspaceCreate(b.dataset.vspaceAdd));
    root.querySelector('#vspaceObjects').addEventListener('click',e=>{
      const b=e.target.closest('[data-vspace-select]');if(b)state.select(b.dataset.vspaceSelect);
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
      state.move=!state.move;e.currentTarget.textContent=`Mover: ${state.move?'ON':'OFF'}`;e.currentTarget.classList.toggle('active',state.move);
      vspaceToast(state.move?'Arrastra un mueble sobre el suelo. Se impedirán las colisiones.':'Modo órbita activado.');
    };
    root.querySelector('[data-vspace-action="toggle-wall"]').onclick=e=>{
      state.wallVisible=!state.wallVisible;e.currentTarget.classList.toggle('active',state.wallVisible);state.render(true);
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
    const destroyBase=()=>{state.destroyed=true;state.releaseFloorTextures?.();window.removeEventListener('keydown',state.keyHandler);state.resizeObs?.disconnect();if(state.raf)cancelAnimationFrame(state.raf);if(state.renderer&&state.scene)disposeThreeScene(state.scene,state.renderer);state.renderer=null;};
    state.destroy=destroyBase;
    (async()=>{
      try{
        const THREE=await loadThreeRuntime();if(state.destroyed||vspaceActive!==state)return;
        const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
        renderer.outputColorSpace=THREE.SRGBColorSpace;
        renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.28;
        renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
        if('physicallyCorrectLights' in renderer) renderer.physicallyCorrectLights = true;
        const scene=new THREE.Scene();scene.background=new THREE.Color(0xf6f3ed);
        const camera=new THREE.OrthographicCamera(-5,5,5,-5,.05,260);
        scene.add(new THREE.HemisphereLight(0xfffaf1,0xb8b2a8,2.35));
        const fill=new THREE.AmbientLight(0xffffff,.62);scene.add(fill);
        const sun=new THREE.DirectionalLight(0xffedcf,3.45);
        sun.position.set(-5,12,8);sun.castShadow=true;
        sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-32;sun.shadow.camera.right=32;
        sun.shadow.camera.top=32;sun.shadow.camera.bottom=-32;
        sun.shadow.camera.near=.5;sun.shadow.camera.far=55;sun.shadow.bias=-.0004;
        sun.shadow.radius=4;scene.add(sun);
        const world=new THREE.Group();scene.add(world);state.scene=scene;state.renderer=renderer;state.camera=camera;state.THREE=THREE;state.world=world;
        const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(),ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
        const orbit={theta:.78,phi:.97,radius:12,target:new THREE.Vector3(0,.8,0)};
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
          metal:meshMat(0x6e7674,{metalness:.63,roughness:.43}),
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
            if(kind==='road' && key==='drain-covered'){
              ctx.fillStyle='#7f8588';ctx.fillRect(0,0,w,h);
              ctx.fillStyle='rgba(255,255,255,.035)';for(let i=0;i<160;i++){ctx.fillRect((i*37)%w,(i*83)%h,2,2);} 
              const gutterW=Math.max(18,w*.1);
              ctx.fillStyle='#696f72';ctx.fillRect(0,0,gutterW,h);ctx.fillRect(w-gutterW,0,gutterW,h);
              ctx.strokeStyle='rgba(201,209,214,.58)';ctx.lineWidth=2;
              for(let y=10;y<h;y+=20){ctx.beginPath();ctx.moveTo(gutterW*.2,y);ctx.lineTo(gutterW*.82,y-8);ctx.stroke();ctx.beginPath();ctx.moveTo(w-gutterW*.82,y);ctx.lineTo(w-gutterW*.2,y-8);ctx.stroke();}
              ctx.strokeStyle='#efc84d';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(0,h*.24);ctx.lineTo(w,h*.24);ctx.moveTo(0,h*.76);ctx.lineTo(w,h*.76);ctx.stroke();
              ctx.strokeStyle='rgba(70,74,77,.28)';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(28,h*.58);ctx.bezierCurveTo(74,h*.48,132,h*.67,230,h*.52);ctx.stroke();
              ctx.strokeStyle='rgba(255,255,255,.08)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(18,h*.38);ctx.bezierCurveTo(64,h*.32,118,h*.43,186,h*.34);ctx.stroke();
            }else if(kind==='road'){
              ctx.fillStyle='#8d9194';ctx.fillRect(0,0,w,h);
              ctx.fillStyle='rgba(255,255,255,.03)';for(let i=0;i<130;i++){ctx.fillRect((i*43)%w,(i*71)%h,2,2);} 
              ctx.strokeStyle='rgba(248,242,223,.46)';ctx.lineWidth=3.6;ctx.beginPath();ctx.moveTo(0,h*.5);ctx.lineTo(w,h*.5);ctx.stroke();
              ctx.strokeStyle='rgba(67,69,72,.22)';ctx.lineWidth=1.7;ctx.beginPath();ctx.moveTo(16,h*.72);ctx.bezierCurveTo(58,h*.58,118,h*.78,228,h*.56);ctx.stroke();
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
        const addDioramaBase = (pts=[]) => {
          const basePts = rectFromPts(pts);
          if(basePts.length < 4) return [];
          const shape = shapeFromLayoutPts(basePts);
          const base = new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.24,bevelEnabled:false}),[
            meshMat(0xf1e7d6,{metalness:0,roughness:.94}),
            meshMat(0xcebb9f,{metalness:0,roughness:.98})
          ]);
          base.rotation.x = -Math.PI/2;
          base.position.y = -.24;
          base.receiveShadow = true;
          base.castShadow = true;
          world.add(base);
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
          });
        };
        const buildArchitecturalWall=(wall,zoneCenters=[])=>{
          const scale=getScaleCmPerUnit()/100;
          const dx=Number(wall.x2||0)-Number(wall.x1||0),dy=Number(wall.y2||0)-Number(wall.y1||0);
          const L=Math.hypot(dx,dy);if(L<8)return;
          const selected=wall.id===state.selectedWallId && state.inspectorMode==='architecture';
          const wallCenter={x:(Number(wall.x1||0)+Number(wall.x2||0))/2,y:(Number(wall.y1||0)+Number(wall.y2||0))/2};
          const zone=(appState.layout.zones||[]).find(z=>z.id===wall.zoneBoundarySource?.zoneId)||null;
          const center=zone && zone.pts?.length?{x:zone.pts.reduce((sum,p)=>sum+Number(p.x||0),0)/zone.pts.length,y:zone.pts.reduce((sum,p)=>sum+Number(p.y||0),0)/zone.pts.length}:null;
          if(center && !selected){
            const outward=new THREE.Vector2(wallCenter.x-center.x,wallCenter.y-center.y);
            const cameraFacing=new THREE.Vector2(Math.sin(orbit.theta),Math.cos(orbit.theta));
            if(outward.dot(cameraFacing)>=0)return; // Corte arquitectónico para no tapar muebles
          }
          const group=new THREE.Group();
          const pos=coord({x:Number(wall.x1||0),y:Number(wall.y1||0)});
          group.position.set(pos.x,0,pos.z);group.rotation.y=-Math.atan2(dy,dx);
          group.userData={wallId:wall.id,entityType:'wall'};
          const wallHeight=Math.max(100,Number(wall.height||290))*scale;
          const thickness=Math.max(4,Number(wall.thickness||12))*scale;
          const length=L*scale;
          const color=wall.material==='concrete'?0xc6c7c1:wall.material==='white'?0xf9f7f0:0xf1e8d9;
          const mat=meshMat(selected?0xd8eadf:color,{metalness:0,roughness:.89,side:THREE.DoubleSide});
          const lineMat=new THREE.LineBasicMaterial({color:selected?0x398d70:0xc2ae92,transparent:true,opacity:selected?.78:.38});
          const openings=(appState.layout.openings||[]).filter(o=>o.wallId===wall.id).map(o=>{
            const w=Math.min(Math.max(35,Number(o.width||90))*scale,length*.93);
            const t=vspaceClamp(Number(o.t??.5),.03,.97),c=t*length;
            const sill=Math.max(0,Number(o.sill||0))*scale;
            const h=Math.min(Math.max(20,Number(o.height||210))*scale,Math.max(.001,wallHeight-sill));
            return {o,left:Math.max(0,c-w/2),right:Math.min(length,c+w/2),c,w,sill,h};
          }).sort((a,b)=>a.left-b.left);
          const cuts=[0,length,...openings.flatMap(o=>[o.left,o.right])].sort((a,b)=>a-b);
          const breaks=cuts.filter((n,i)=>i===0||Math.abs(n-cuts[i-1])>.001);
          const addWallPiece=(l,r,y0,y1)=>{
            if(r-l<.008||y1-y0<.008)return;
            const geo=new THREE.BoxGeometry(r-l,y1-y0,thickness);
            const mesh=new THREE.Mesh(geo,mat);
            mesh.position.set((l+r)/2,(y0+y1)/2,0);
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
            const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.012,w),Math.max(.012,h),Math.max(.015,d)),material);
            mesh.position.set(cx,cy,0);mesh.castShadow=!material.transparent;mesh.receiveShadow=true;
            mesh.userData={openingId:o.id,wallId:wall.id,entityType:'opening'};
            group.add(mesh);state.architectureMeshes.push(mesh);
            return mesh;
          };
          openings.forEach(({o,left,right,c,w,sill,h})=>{
            const kind=normalizeOpeningType(o.type);
            if(kind==='free')return;
            const trim=Math.min(.055,Math.max(.025,w*.035));
            addTrim(o,left+trim/2,sill+h/2,trim,h,thickness*1.12,frameMat);
            addTrim(o,right-trim/2,sill+h/2,trim,h,thickness*1.12,frameMat);
            addTrim(o,c,sill+h-trim/2,w,trim,thickness*1.12,frameMat);
            if(kind==='window'){
              addTrim(o,c,sill+trim/2,w,trim,thickness*1.12,frameMat);
              addTrim(o,c,sill+h/2,trim,h,thickness*.72,frameMat); // Ventanal único de dos paños
              addTrim(o,c,sill+h/2,w-trim*2,h-trim*2,Math.max(.014,thickness*.18),glassMat);
            }
          });
          world.add(group);
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
          world.add(group);state.objects.set(r.id,group);
        };
        const rebuild=()=>{
          clearWorld();
          refreshSceneFrame();
          const zones=appState.layout.zones||[];
          const siteBoundary = Array.isArray(appState.layout?.meta?.siteBoundary?.pts) ? appState.layout.meta.siteBoundary.pts : [];
          const streets = Array.isArray(appState.layout?.streets) ? appState.layout.streets : [];
          const footprintSource = [];
          siteBoundary.forEach(pt => footprintSource.push(pt));
          streets.forEach(street => [ ...(street.outerSidewalkPts||[]), ...(street.roadPts||[]), ...(street.sidewalkPts||[]) ].forEach(pt => footprintSource.push(pt)));
          if(!footprintSource.length) zones.forEach(zone => (zone.pts||[]).forEach(pt => footprintSource.push(pt)));
          const dioramaBase = addDioramaBase(footprintSource);
          if(siteBoundary.length >= 3){
            addTopSurfaceFromPts(siteBoundary, 0xefe6d7, .01, 0xc9b28f, .98, 1);
            addOutlineFromPts(siteBoundary, 0xae9069, .032, .96);
            addOutlineFromPts(siteBoundary, 0xf1e5cf, .046, .78);
          }
          streets.forEach((street, index) => {
            ensureStreetVisualDefaults(street);
            const roadPreset=getStreetSurfacePreset(street.roadType);
            const sidewalkPreset=getSidewalkSurfacePreset(street.sidewalkType);
            addStreetBand(street.outerSidewalkPts,{color:0xefe7da,y:.016,outlineColor:0xd2bc98,opacity:.985,order:2+index*.1,texture:streetTexture('sidewalk',street.sidewalkType)});
            addStreetBand(street.roadPts,{color:roadPreset.fill,y:.011,outlineColor:0xf8efde,opacity:.985,order:2.1+index*.1,texture:streetTexture('road',street.roadType)});
            addStreetBand(street.sidewalkPts,{color:0xf3ede1,y:.018,outlineColor:0xd2bc98,opacity:.985,order:2.2+index*.1,texture:streetTexture('sidewalk',street.sidewalkType)});
            addStreetLabel(street, street.roadPts || street.sidewalkPts || street.outerSidewalkPts);
            addStreetFurniture3D(street);
          });
          for(const zone of zones){
            const pts=zone.pts||[];if(pts.length<3)continue;
            addTopSurfaceFromPts(pts, 0xe9d7bb, .022, 0x2f7b6e, .98, 4, zone.floorFinish||'default');
            addOutlineFromPts(pts, 0x2f7b6e, .03, .98);
            addOutlineFromPts(pts, 0xe6d5b5, .041, .82);
          }
          state.architectureMeshes=[];
          if(state.wallVisible){
            (appState.layout.walls||[]).forEach(w=>buildArchitecturalWall(w));
          }
          // Small unobtrusive measurement grid, enabled over the entire editing area.
          const boundsW=(zoneBounds.length?Math.max(...zoneBounds.map(p=>p.x))-Math.min(...zoneBounds.map(p=>p.x)):700)*getScaleCmPerUnit()/100;
          const boundsH=(zoneBounds.length?Math.max(...zoneBounds.map(p=>p.y))-Math.min(...zoneBounds.map(p=>p.y)):600)*getScaleCmPerUnit()/100;
          if(zones.length){
            const count=Math.max(10,Math.ceil(Math.max(boundsW,boundsH)*2));
            const grid=new THREE.GridHelper(Math.max(7,Math.ceil(Math.max(boundsW,boundsH))),count,0xb9a78f,0xb9a78f);
            grid.material.transparent=true;grid.material.opacity=.12;grid.position.y=.002;world.add(grid);
          }
          (appState.layout.racks||[]).forEach(addFurniture);
          if(state.wallVisible && (appState.layout.zones||[]).length===0){vspaceToast('Dibuja primero el perímetro desde Plano / Estructura.');}
          state.requestRender();
        };
        state.requestRender=()=>{
          if(state.destroyed||state.raf)return;
          state.raf=requestAnimationFrame(()=>{state.raf=0;if(state.destroyed)return;updateCam();renderer.render(scene,camera);});
        };
        state.render=()=>rebuild();
        state.setCamera=mode=>{
          const points=zoneBounds.length?zoneBounds:[{x:mx-300,y:my-200},{x:mx+300,y:my+200}];
          const width=(Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)))*getScaleCmPerUnit()/100;
          const depth=(Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y)))*getScaleCmPerUnit()/100;
          orbit.radius=vspaceClamp(Math.max(width,depth)*1.48+2.3,4,65);
          orbit.theta=mode==='front'?0:mode==='top'?.0001:.79;
          orbit.phi=mode==='top'?.04:mode==='front'?1.26:.97;
          orbit.target.set(0,.8,0);state.mode=mode;root.querySelector('.vspace-compass').textContent=(mode==='top'?'PLN':mode==='front'?'FRT':'ISO');state.requestRender();
        };
        state.focusSelected=()=>{
          const r=getRack();if(!r)return;
          const c=coord({x:Number(r.x)+Number(r.w)/2,y:Number(r.y)+Number(r.h)/2});
          orbit.target.set(c.x,vspaceSpec(r).height/200,c.z);
          orbit.radius=vspaceClamp(Math.max(vspaceSpec(r).width,vspaceSpec(r).depth)/55+3,3,12);orbit.phi=.94;state.requestRender();
          root.querySelector('.vspace-compass').textContent='SEL';
        };
        const intersectArchitecture=e=>{
          applyPointer(e);
          const hits=raycaster.intersectObjects(state.architectureMeshes||[],false);
          const opening=hits.find(hit=>hit.object?.userData?.openingId);
          const hit=opening||hits[0];
          return hit?{wallId:hit.object.userData.wallId||'',openingId:hit.object.userData.openingId||''}:null;
        };
        const intersectFurniture=e=>{
          applyPointer(e);
          const intersections=raycaster.intersectObjects([...state.objects.values()],true);
          for(const hit of intersections){
            let obj=hit.object;
            while(obj && !obj.userData?.furnitureId) obj=obj.parent;
            if(obj?.userData?.furnitureId) return {rackId:obj.userData.furnitureId,level:hit.object.userData?.level||0,slot:hit.object.userData?.slot||0};
          }
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
          const archHit=state.inspectorMode==='architecture'?intersectArchitecture(e):null;
          const hit=!archHit?intersectFurniture(e):null;
          if(archHit){selectArch(archHit.wallId,archHit.openingId);}
          else if(hit){state.select(hit.rackId,hit.level||state.selectedLevel,hit.slot||state.selectedSlot);}
          const point=state.move&&canWrite()?groundPoint(e):null;
          const rack=hit && appState.layout.racks.find(r=>r.id===hit.rackId);
          const wantsPan = e.button===1 || e.button===2 || e.shiftKey;
          gesture={x:e.clientX,y:e.clientY,button:e.button,mode:(e.button===0&&state.move&&canWrite()&&rack&&!e.shiftKey)?'move':wantsPan?'pan':'orbit',rackId:rack?.id||'',
            initialX:Number(rack?.x||0),initialY:Number(rack?.y||0),groundStart:point,moved:false};
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
          }else if(gesture.mode==='move'){
            const rack=appState.layout.racks.find(r=>r.id===gesture.rackId),current=groundPoint(e);
            if(rack&&current&&gesture.groundStart){
              const candidate={...rack,x:Math.round(gesture.initialX+current.x-gesture.groundStart.x),y:Math.round(gesture.initialY+current.y-gesture.groundStart.y)};
              if(vspaceFits(candidate,rack.id).ok){rack.x=candidate.x;rack.y=candidate.y;const group=state.objects.get(rack.id);if(group){const cp=coord({x:rack.x+rack.w/2,y:rack.y+rack.h/2});group.position.x=cp.x;group.position.z=cp.z;} state.refreshMiniLayout();}
            }
          }
          gesture.x=e.clientX;gesture.y=e.clientY;state.requestRender();
        });
        canvas.addEventListener('pointerup',()=>{
          if(gesture?.mode==='move'&&gesture.moved){vspaceCommit('mueble desplazado');state.refreshInspector();}
          if(gesture?.mode==='orbit'&&gesture.moved&&state.wallVisible)state.render(true);
          gesture=null;
        });
        canvas.addEventListener('pointercancel',()=>{gesture=null;});
        canvas.addEventListener('wheel',e=>{e.preventDefault();orbit.radius*=e.deltaY>0?1.1:.9;orbit.radius=vspaceClamp(orbit.radius,2.5,80);state.requestRender();},{passive:false});
        canvas.addEventListener('dblclick',e=>{const archHit=state.inspectorMode==='architecture'?intersectArchitecture(e):null;const hit=archHit?null:intersectFurniture(e); if(archHit)selectArch(archHit.wallId,archHit.openingId);else if(hit){state.select(hit.rackId,hit.level||state.selectedLevel,hit.slot||state.selectedSlot); state.focusSelected();} else state.setCamera(state.mode||'iso');});
        state.keyHandler=e=>{
          if(state.destroyed) return;
          const tag=(document.activeElement?.tagName||'').toLowerCase(); if(tag==='input'||tag==='textarea'||tag==='select') return;
          const step=Math.max(.18,orbit.radius*.05);
          if(e.key==='Escape'&&state.archDrawMode){state.archDrawMode=false;state.drawWallStart=null;state.refreshInspector();e.preventDefault();}
          else if(e.key==='1'){state.setCamera('iso');e.preventDefault();}
          else if(e.key==='2'){state.setCamera('top');e.preventDefault();}
          else if(e.key==='3'){state.setCamera('front');e.preventDefault();}
          else if(e.key.toLowerCase()==='f'){state.focusSelected();e.preventDefault();}
          else if(e.key.toLowerCase()==='m'&&canWrite()){state.move=!state.move;root.querySelector('[data-vspace-action="move"]').textContent=`Mover: ${state.move?'ON':'OFF'}`;root.querySelector('[data-vspace-action="move"]').classList.toggle('active',state.move);e.preventDefault();}
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
        if(state.selectedId && (appState.layout.racks||[]).some(r=>r.id===state.selectedId)) state.focusSelected();
        resize();root.querySelector('#vspaceLoading')?.remove();
        vspaceToast('Modelo 3D listo. Mobiliario y Arquitectura comparten las propiedades guardadas con Editar layout.');
      }catch(err){console.error('Vista virtual 3D:',err);const el=root.querySelector('#vspaceLoading');if(el)el.textContent=`No se pudo inicializar la vista 3D: ${err.message||err}. Verifica WebGL y la dependencia Three.js.`;}
    })();
  }
