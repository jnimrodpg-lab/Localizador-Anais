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
    if(vspaceActive){vspaceActive.modified=true;vspaceActive.render(true);}
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
      <aside class="vspace-inspector"><h4>Inspector de ubicaciones</h4><div id="vspaceInspector" class="vspace-inspector-body">Selecciona un mueble para editar, ubicar productos y gestionar niveles.</div></aside></div>
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
    const state={root,canvas,selectedId:appState.selectedRackLayoutId||'',selectedLevel:1,selectedSlot:1,modified:false,wallVisible:true,move:false,mode:'iso',editMode:'build',destroyed:false,objects:new Map()};
    vspaceActive=state;
    const getRack=()=>appState.layout.racks?.find(r=>r.id===state.selectedId)||null;
    const canWrite=()=>vspaceIsEditable();
    const zoneBounds=[];(appState.layout.zones||[]).forEach(z=>(z.pts||[]).forEach(p=>zoneBounds.push(p)));
    const sitePts = Array.isArray(appState.layout?.meta?.siteBoundary?.pts) ? appState.layout.meta.siteBoundary.pts : [];
    sitePts.forEach(p=>zoneBounds.push(p));
    (appState.layout.streets||[]).forEach(s=>[...(s.sidewalkPts||[]),...(s.roadPts||[]),...(s.outerSidewalkPts||[])].forEach(p=>zoneBounds.push(p)));
    if(!zoneBounds.length)(appState.layout.racks||[]).forEach(r=>zoneBounds.push({x:r.x,y:r.y},{x:r.x+r.w,y:r.y+r.h}));
    let mx=zoneBounds.length?(Math.min(...zoneBounds.map(p=>Number(p.x)))+Math.max(...zoneBounds.map(p=>Number(p.x))))/2:200;
    let my=zoneBounds.length?(Math.min(...zoneBounds.map(p=>Number(p.y)))+Math.max(...zoneBounds.map(p=>Number(p.y))))/2:180;
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
    state.refreshInspector=()=>{
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
    const destroyBase=()=>{state.destroyed=true;window.removeEventListener('keydown',state.keyHandler);state.resizeObs?.disconnect();if(state.raf)cancelAnimationFrame(state.raf);if(state.renderer&&state.scene)disposeThreeScene(state.scene,state.renderer);state.renderer=null;};
    state.destroy=destroyBase;
    (async()=>{
      try{
        const THREE=await loadThreeRuntime();if(state.destroyed||vspaceActive!==state)return;
        const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance'});
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.75));
        renderer.outputColorSpace=THREE.SRGBColorSpace;
        renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.33;
        renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
        const scene=new THREE.Scene();scene.background=new THREE.Color(0xf6f3ed);
        const camera=new THREE.OrthographicCamera(-5,5,5,-5,.05,260);
        scene.add(new THREE.HemisphereLight(0xfffaf1,0xb6ada0,2.15));
        const fill=new THREE.AmbientLight(0xffffff,.5);scene.add(fill);
        const sun=new THREE.DirectionalLight(0xffedcf,3.2);
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
        const addStreetBand = (pts=[], color=0x8a8f92, y=0, depth=.02, outlineColor=0xe9dcc2) => {
          if(!Array.isArray(pts) || pts.length < 3) return;
          const shape = shapeFromLayoutPts(pts);
          const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}), meshMat(color,{metalness:.03,roughness:.92}));
          mesh.rotation.x = -Math.PI/2; mesh.position.y = y - depth; mesh.receiveShadow = true; mesh.castShadow = false; world.add(mesh);
          addOutlineFromPts(pts, outlineColor, y + .02, .92);
        };
        const addStreetLabel = (street, pts=[]) => {
          if(!Array.isArray(pts) || !pts.length) return;
          const c = { x:pts.reduce((v,p)=>v+Number(p.x||0),0)/pts.length, y:pts.reduce((v,p)=>v+Number(p.y||0),0)/pts.length };
          const tag = labelSprite(`Calle ${street.side}`, 1.2);
          const cc = coord(c); tag.position.set(cc.x, .065, cc.z); world.add(tag);
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
          const zones=appState.layout.zones||[];
          const siteBoundary = Array.isArray(appState.layout?.meta?.siteBoundary?.pts) ? appState.layout.meta.siteBoundary.pts : [];
          const streets = Array.isArray(appState.layout?.streets) ? appState.layout.streets : [];
          if(siteBoundary.length >= 3){
            const siteShape = shapeFromLayoutPts(siteBoundary);
            const siteFloor = new THREE.Mesh(new THREE.ExtrudeGeometry(siteShape,{depth:.12,bevelEnabled:false}),[
              meshMat(0xeee6d6,{metalness:0,roughness:.96}),meshMat(0xd7c8ae,{metalness:0,roughness:.98})]);
            siteFloor.rotation.x=-Math.PI/2; siteFloor.position.y=-.12; siteFloor.receiveShadow=true; world.add(siteFloor);
            addOutlineFromPts(siteBoundary, 0xa9855f, .042, .98);
            addOutlineFromPts(siteBoundary, 0xe8d4b7, .058, .82);
          }
          streets.forEach(street => {
            addStreetBand(street.outerSidewalkPts, 0xe7dece, .014, 0xd9c8aa);
            addStreetBand(street.roadPts, 0x8c9398, .008, 0xf7efe0);
            addStreetBand(street.sidewalkPts, 0xe7dece, .014, 0xd9c8aa);
            addStreetLabel(street, street.roadPts || street.sidewalkPts || street.outerSidewalkPts);
          });
          for(const zone of zones){
            const pts=zone.pts||[];if(pts.length<3)continue;
            const shape=new THREE.Shape();
            pts.forEach((pt,i)=>{const p=coord(pt);if(i===0)shape.moveTo(p.x,-p.z);else shape.lineTo(p.x,-p.z);});shape.closePath();
            const floor=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.15,bevelEnabled:false}),[
              meshMat(0xe9d7bb,{metalness:0,roughness:.9}),meshMat(0xbba48a,{metalness:0,roughness:.95})]);
            floor.rotation.x=-Math.PI/2;floor.position.y=-.15;floor.receiveShadow=true;world.add(floor);
            addOutlineFromPts(pts, 0x2f7b6e, .03, .96);
            addOutlineFromPts(pts, 0xe6d5b5, .04, .78);
            if(state.wallVisible){
              const center={x:pts.reduce((v,p)=>v+Number(p.x),0)/pts.length,y:pts.reduce((v,p)=>v+Number(p.y),0)/pts.length};
              const midpoint=coord(center);
              const eye=new THREE.Vector2(Math.sin(orbit.theta),Math.cos(orbit.theta));
              for(let i=0;i<pts.length;i++){
                const a=coord(pts[i]),b=coord(pts[(i+1)%pts.length]);const dx=b.x-a.x,dz=b.z-a.z;
                const len=Math.hypot(dx,dz);if(len<.04)continue;
                const midX=(a.x+b.x)/2,midZ=(a.z+b.z)/2;
                // Diorama cutaway: only walls behind the furniture, never the near walls blocking the view.
                const outward=new THREE.Vector2(midX-midpoint.x,midZ-midpoint.z);
                if(outward.dot(eye)>=0)continue;
                const wall=new THREE.Mesh(new THREE.BoxGeometry(len,2.75,.085),meshMat(0xf3e9dc,{metalness:0,roughness:.95}));
                wall.position.set(midX,1.375,midZ);wall.rotation.y=-Math.atan2(dz,dx);
                wall.receiveShadow=true;wall.castShadow=true;world.add(wall);
                const addTrim=(y,bh,color)=>{
                  const mesh=new THREE.Mesh(new THREE.BoxGeometry(len,bh,.115),meshMat(color,{metalness:0,roughness:.8}));
                  mesh.position.set(midX,y,midZ);mesh.rotation.y=wall.rotation.y;world.add(mesh);
                };
                addTrim(.09,.16,0xc8b397);addTrim(2.74,.055,0xe7d4b7);
              }
            }
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
          const hit=intersectFurniture(e),point=state.move&&canWrite()?groundPoint(e):null;
          if(hit){state.select(hit.rackId,hit.level||state.selectedLevel,hit.slot||state.selectedSlot);}
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
        canvas.addEventListener('dblclick',e=>{const hit=intersectFurniture(e); if(hit){state.select(hit.rackId,hit.level||state.selectedLevel,hit.slot||state.selectedSlot); state.focusSelected();} else state.setCamera(state.mode||'iso');});
        state.keyHandler=e=>{
          if(state.destroyed) return;
          const tag=(document.activeElement?.tagName||'').toLowerCase(); if(tag==='input'||tag==='textarea'||tag==='select') return;
          const step=Math.max(.18,orbit.radius*.05);
          if(e.key==='1'){state.setCamera('iso');e.preventDefault();}
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
        vspaceToast('Vista isométrica activa. Selecciona un estante, crea cajas y asigna SKU por nivel.');
      }catch(err){console.error('Vista virtual 3D:',err);const el=root.querySelector('#vspaceLoading');if(el)el.textContent=`No se pudo inicializar la vista 3D: ${err.message||err}. Verifica WebGL y la dependencia Three.js.`;}
    })();
  }
