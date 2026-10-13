  function resetRackPreviewCamera(){
    if(!appState.ui) appState.ui = {};
    appState.ui.rackPreviewCamera = null;
  }


  function rerenderRackEditorPreservingState(options={}){ if(appState.screen==='racks')v222RenderLibrary(); }

  async function switchViewerBranch(branchIndex){
    const index=Number(branchIndex);if(!Number.isFinite(index))return;
    await activateBranchSelection(index);loadLayoutForBranch(index);
    if(Array.isArray(appState.filtered)&&appState.filtered.length){const preferred=appState.selectedProduct&&appState.filtered.find(p=>p.sku===appState.selectedProduct.sku&&p.ubicacion===appState.selectedProduct.ubicacion);appState.selectedProduct=preferred||appState.filtered[0];appState.selectedRack=appState.selectedProduct?.rack||appState.selectedProduct?.rackStore||'';appState.selectedRackLayoutId=appState.selectedRack;}
    else{appState.selectedProduct=null;appState.selectedRack=appState.layout?.racks?.[0]?.id||'';appState.selectedRackLayoutId=appState.selectedRack;}
    renderProducts(appState.filtered||[]);renderMapView();
  }


  function renderRackModels(){ return v222RenderLibrary(); }


  function renderModelsList(){ return v222LibraryList(); }


  function buildLevelHeights(model){
    const count = Math.max(1, Math.min(12, Number(model?.levels || 4) || 4));
    const stored = Array.isArray(model?.levelHeights) ? model.levelHeights.map(v => Math.max(10, Number(v)||10)) : [];
    if (stored.length === count) return stored;
    const usable = Math.max(20, (Number(model?.height || 238) || 238) - (Number(model?.clearance || 0) || 0));
    const each = Math.max(10, Math.round((usable / count) * 10) / 10);
    return Array.from({length: count}, () => each);
  }
  function buildLevelSlots(model){
    const count = Math.max(1, Math.min(12, Number(model?.levels || 4) || 4));
    const fallback = Math.max(1, Math.min(12, Number(model?.slots || model?.capacity || 2) || 2));
    const stored = Array.isArray(model?.levelSlots) ? model.levelSlots.map(v => Math.max(1, Math.min(12, Number(v)||fallback))) : [];
    if (stored.length === count) return stored;
    return Array.from({length: count}, (_, idx) => stored[idx] || fallback);
  }
  function getRackCapacity(model){
    const levelSlots = buildLevelSlots(model || {});
    return Math.max(1, levelSlots.reduce((sum, v) => sum + Math.max(1, Number(v)||0), 0));
  }

  function normalizeRackStyle(style){
    const raw = String(style || '').toLowerCase();
    if(raw === 'melamine' || raw === 'melamina' || raw === 'compact') return 'melamine';
    if(raw === 'wood' || raw === 'madera') return 'wood';
    if(raw === 'under_stairs_reflected' || raw === 'bajo_escalera_reflejado' || raw === 'bajo escalera reflejado' || raw === 'under stairs reflected') return 'under_stairs_reflected';
    if(raw === 'under_stairs' || raw === 'bajo_escalera' || raw === 'bajo escalera') return 'under_stairs';
    return 'metallic';
  }
  function rackStyleLabel(style){
    const normalized = normalizeRackStyle(style);
    if(normalized === 'melamine') return 'Melamina';
    if(normalized === 'wood') return 'Madera';
    if(normalized === 'under_stairs_reflected') return 'Bajo escalera reflejado';
    return normalized === 'under_stairs' ? 'Bajo escalera' : 'Metálico';
  }
  function rackStyleSub(style){
    const normalized = normalizeRackStyle(style);
    if(normalized === 'melamine') return 'Rack melamina';
    if(normalized === 'wood') return 'Estantería de madera';
    if(normalized === 'under_stairs_reflected') return 'Mueble bajo escalera reflejado';
    return normalized === 'under_stairs' ? 'Mueble bajo escalera' : 'Rack metálico';
  }

  
  function syncLevelEditorCount(modelId){
    const model = rackModel(modelId || appState.selectedModelId);
    if(!model) return;
    const count = Math.max(1, Math.min(12, Number(model.levels || 4) || 4));
    const current = buildLevelHeights(model);
    if(current.length !== count){
      const next = Array.from({length: count}, (_, idx) => current[idx] || current[current.length - 1] || 60);
      model.levelHeights = next;
    }
    const currentSlots = buildLevelSlots(model);
    if(currentSlots.length !== count){
      const nextSlots = Array.from({length: count}, (_, idx) => currentSlots[idx] || currentSlots[currentSlots.length - 1] || Math.max(1, Number(model.slots||2)||2));
      model.levelSlots = nextSlots;
    }
  }

  function renderLevelEditor(){ return; }

  
  function createNewRackModelDraft(){
    recordHistorySnapshot('racks');
    const base = {
      id: 'm_' + Math.random().toString(16).slice(2,8),
      name: 'Nuevo modelo',
      levels: 4,
      width: 120,
      depth: 40,
      height: 240,
      clearance: 0,
      slots: 2,
      beam: 2,
      style: 'metallic',
      levelHeights: [60,60,60,58],
      levelSlots: [2,2,2,2],
      leftHeight: 240,
      rightHeight: 84,
      topLength: 60,
      mirrored: false,
      furniture: { enabled:false, version:1 }
    };
    appState.models.push(base);
    appState.selectedModelId = base.id;
    resetRackPreviewCamera();
    appState.ui.rackLibraryOpenIds = [base.id];
    appState.ui.rackLibraryLevelsOpenIds = [];
    saveRackModels();
    renderRackModels();
  }

  
  function duplicateRackModel(id){
    recordHistorySnapshot('racks');
    const model = rackModel(id);
    if(!model) return;
    const copy = {
      ...clone(model),
      id: 'm_' + Math.random().toString(16).slice(2,8),
      name: `${model.name} copia`
    };
    appState.models.unshift(copy);
    appState.selectedModelId = copy.id;
    resetRackPreviewCamera();
    appState.ui.rackLibraryOpenIds = [copy.id];
    saveRackModels();
    renderRackModels();
  }

  
  function deleteRackModel(id){
    recordHistorySnapshot('racks');
    if(!id || !Array.isArray(appState.models) || appState.models.length <= 1) return;
    appState.models = appState.models.filter(m => m.id !== id);
    if(!appState.models.some(m => m.id === appState.selectedModelId)) appState.selectedModelId = appState.models[0]?.id || '';
    resetRackPreviewCamera();
    appState.ui.rackLibraryOpenIds = appState.selectedModelId ? [appState.selectedModelId] : [];
    appState.ui.rackLibraryLevelsOpenIds = appState.ui.rackLibraryLevelsOpenIds.filter(mid => mid !== id);
    saveRackModels();
    renderRackModels();
  }

  
  function useRackModel(id){
    const changed = appState.selectedModelId !== id;
    appState.selectedModelId = id;
    if(changed) resetRackPreviewCamera();
    appState.ui.rackLibraryOpenIds = [id];
    renderRackModels();
  }

  
  function autoDistributeLevels(modelId){
    recordHistorySnapshot('racks');
    const targetId = modelId || appState.selectedModelId;
    const draft = rackModel(targetId);
    if(!draft) return;
    const count = Math.max(1, Number(draft.levels||4)||4);
    const usable = Math.max(20, draft.height - draft.clearance);
    const each = Math.max(10, Math.round((usable / count) * 10) / 10);
    draft.levelHeights = Array.from({length: count}, () => each);
    draft.levelSlots = Array.from({length: count}, () => Math.max(1, Math.min(12, Number(draft.slots || 2) || 2)));
    ensureRackFurnitureModel(draft);
    if(draft.furniture?.enabled) furnitureGenerateFromModelSetup(draft);
    appState.selectedModelId = targetId;
    renderRackModels();
  }

  
  function rackModelDraft(){
    const active = rackModel(appState.selectedModelId) || appState.models?.[0] || {
      id:'std_4', name:'Rack estándar 4 niveles', levels:4, width:120, depth:40, height:240, clearance:0, style:'metallic', slots:2, beam:2, levelSlots:[2,2,2,2]
    };
    return clone(active);
  }

  
  async function saveRackModel(){
    recordHistorySnapshot('racks');
    (appState.models||[]).forEach(m=>{ ensureRackFurnitureModel(m); if(m.furniture?.enabled) syncFurnitureModelToLegacy(m); });
    saveRackModels();
    await saveRemoteAppState('modelo de rack');
    renderRackModels();
  }


  function updateRackModelField(id, field, rawValue){
    if(['name','width','depth','height','leftHeight','rightHeight','levels'].includes(field))return v222EditModelField(id,field,rawValue);
    recordHistorySnapshot('racks');
    const model = rackModel(id);
    if(!model) return;
    appState.selectedModelId = id;
    if(field === 'name') model.name = String(rawValue || '').trimStart() || 'Sin nombre';
    else if(field === 'style') {
      model.style = normalizeRackStyle(rawValue || model.style || 'metallic');
      if(model.style === 'under_stairs_reflected') model.mirrored = true;
      else if(model.style === 'under_stairs') model.mirrored = false;
    }
    else if(field === 'levels'){
      model.levels = Math.max(1, Math.min(12, Number(rawValue || 4) || 4));
      syncLevelEditorCount(id);
    } else if(field === 'width') model.width = Math.max(30, Number(rawValue || model.width || 150) || 150);
    else if(field === 'depth') model.depth = Math.max(20, Number(rawValue || model.depth || 82) || 82);
    else if(field === 'height') model.height = Math.max(60, Number(rawValue || model.height || 238) || 238);
    else if(field === 'leftHeight') model.leftHeight = Math.max(40, Number(rawValue || model.leftHeight || model.height || 238) || 238);
    else if(field === 'rightHeight') model.rightHeight = Math.max(20, Number(rawValue || model.rightHeight || Math.max(40,(model.height||238)*0.35)) || Math.max(40,(model.height||238)*0.35));
    else if(field === 'topLength') model.topLength = Math.max(8, Number(rawValue || model.topLength || Math.max(8, ((model.width||150) * 0.33))) || Math.max(8, ((model.width||150) * 0.33)));
    else if(field === 'mirrored') model.mirrored = !!rawValue;
    else if(field === 'clearance') model.clearance = Math.max(0, Math.min(120, Number(rawValue || model.clearance || 0) || 0));
    else if(field === 'slots'){
      model.slots = Math.max(1, Math.min(12, Number(rawValue || model.slots || 2) || 2));
      model.levelSlots = Array.from({length: Math.max(1, Math.min(12, Number(model.levels || 4) || 4))}, () => model.slots);
    }
    else if(field === 'beam') model.beam = Math.max(2, Math.min(20, Number(rawValue || model.beam || 6) || 6));
    if(field === 'height' || field === 'clearance' || field === 'levels') syncLevelEditorCount(id);
    ensureRackFurnitureModel(model);
    if(model.furniture?.enabled){
      if(field==='style'){const st=normalizeRackStyle(model.style);if(st==='metallic')model.furniture.material='metal';else if(st==='melamine')model.furniture.material='melamine';else if(st==='wood')model.furniture.material='wood';}
      if(['width','depth','height'].includes(field)) furnitureRefitModel(model);
      if(field==='levels') furnitureGenerateFromModelSetup(model);
      if(field==='slots'){deriveFurnitureLevels(model).forEach(l=>{model.furniture.logicalSlots[l.index]=model.slots;});syncFurnitureModelToLegacy(model);}
    }
    if(isUnderStairsStyle(model.style)){
      model.leftHeight = Math.max(40, Number(model.leftHeight || model.height || 238) || 238);
      model.rightHeight = Math.max(20, Number(model.rightHeight || Math.max(40, (model.height||238) * 0.35)) || Math.max(40, (model.height||238) * 0.35));
      model.height = Math.max(Number(model.height || 0), Number(model.leftHeight || 0), Number(model.rightHeight || 0));
      model.topLength = clampUnderStairsTopLength(model);
      model.mirrored = normalizeRackStyle(model.style) === 'under_stairs_reflected' ? true : !!model.mirrored;
    }
    renderRackModelPreview();
  }

  
  function buildRackModelSummary(model){ return ''; }

  function renderRackPickerPreview(target, modelId, rackRef = null){
    const svg = typeof target === 'string' ? $(target) : target;
    if(!svg) return;
    const model = rackModel(modelId) || appState.models?.[0];
    if(!model){ svg.innerHTML = ''; return; }
    const rack = rackRef || null; // Un catálogo no hereda la instancia seleccionada del layout.
    const previewRack = rack ? { ...rack, id: rack.id || model.name || 'modelo', modelId: model.id, rackHeight: Math.max(60, Number(rack.rackHeight || model.height || 238) || 238) } : { id: model.name || 'modelo', modelId: model.id, x:0, y:0, w:model.width || 120, h:model.depth || 82, rot:0, baseHeight:0, rackHeight:model.height || 238 };
    renderRackDetail(previewRack.id || model.name || 'modelo', null, svg, model, previewRack);
    try{
      const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : null;
      if(vb && vb.width && vb.height){
        const fit = computePreviewFitView(svg, { x: vb.x, y: vb.y, width: vb.width, height: vb.height }, 20, modelId);
        let finalFit = fit;
        if(svg.id === 'sideRackModelViewerSvg'){
          const cx = fit.x + fit.w / 2;
          const cy = fit.y + fit.h / 2;
          const zoom = 0.7;
          const nw = fit.w * zoom;
          const nh = fit.h * zoom;
          finalFit = { x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh };
        }
        svg.setAttribute('viewBox', `${finalFit.x} ${finalFit.y} ${finalFit.w} ${finalFit.h}`);
      }
    } catch(err) {}
    svg.style.pointerEvents = 'none';
  }

  function initSideRackModelPicker(rack){
    const picker = $('#sideRackModelPicker');
    if(!picker || !rack) return;
    const hidden = $('#sideRackModel');
    const trigger = $('#sideRackModelTrigger');
    const hoverSvg = $('#sideRackModelHoverSvg');
    const viewerSvg = $('#sideRackModelViewerSvg');
    const opts = Array.from($$('[data-rack-model-option]'));
    const selectedId = () => hidden?.value || rack.modelId;
    const updateTrigger = (id) => {
      const model = rackModel(id) || appState.models?.[0];
      const label = trigger ? trigger.querySelector('span') : null;
      if(label) label.textContent = model?.name || id || 'Seleccionar modelo';
      opts.forEach(btn => btn.classList.toggle('active', (btn.getAttribute('data-rack-model-option') || '') === (id || '')));
    };
    const renderFor = (id) => {
      const modelId = id || selectedId();
      if(hoverSvg) renderRackPickerPreview(hoverSvg, modelId, rack);
      if(viewerSvg) renderRackPickerPreview(viewerSvg, modelId, rack);
    };
    updateTrigger(selectedId());
    renderFor(selectedId());
    if(trigger){
      trigger.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        picker.classList.toggle('open');
        renderFor(selectedId());
      };
    }
    opts.forEach(btn => {
      btn.onmouseenter = () => renderFor(btn.getAttribute('data-rack-model-option'));
      btn.onfocus = () => renderFor(btn.getAttribute('data-rack-model-option'));
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const id = btn.getAttribute('data-rack-model-option');
        if(hidden){
          hidden.value = id;
          updateTrigger(id);
          renderFor(id);
          hidden.dispatchEvent(new Event('change', { bubbles:true }));
        }
        picker.classList.remove('open');
      };
    });
    picker.onmouseleave = () => renderFor(selectedId());
    if(!window.__rackPickerDocBound){
      document.addEventListener('click', (evt) => {
        document.querySelectorAll('.rack-model-picker.open').forEach(node => {
          if(!node.contains(evt.target)) node.classList.remove('open');
        });
      });
      window.__rackPickerDocBound = true;
    }
  }

  // V194: el preview principal usa exactamente el motor y las piezas del constructor 3D.
  // El SVG permanece disponible como fallback cuando no hay WebGL.
  let rackLibrary3DEngine = null;
  let rackLibraryPreviewToken = 0;
  function disposeRackLibrary3DPreview(){
    const e=rackLibrary3DEngine;
    if(!e)return;
    try{e.resizeObserver?.disconnect();}catch{}
    try{cancelAnimationFrame(e.raf||0);}catch{}
    try{e.scene?.traverse(o=>{o.geometry?.dispose?.();if(o.material){(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose?.());}});}catch{}
    try{e.renderer?.dispose?.();e.renderer?.forceContextLoss?.();e.renderer?.domElement?.remove();}catch{}
    rackLibrary3DEngine=null;
  }
  function v223FitRackLibraryCamera(e,options={}){
    if(!e?.meshByPiece?.size)return;
    const T=e.THREE,bounds=new T.Box3();e.root.updateMatrixWorld(true);e.meshByPiece.forEach(mesh=>bounds.expandByObject(mesh));if(bounds.isEmpty())return;
    const zoom=Number.isFinite(options.zoom)?options.zoom:(e.fitDistance?e.distance/e.fitDistance:1);
    bounds.getCenter(e.target);
    const cp=Math.cos(e.pitch),sp=Math.sin(e.pitch),cy=Math.cos(e.yaw),sy=Math.sin(e.yaw),tanV=Math.tan(e.camera.fov*Math.PI/360),tanH=tanV*Math.max(.05,e.camera.aspect);
    const occupiedX=Math.min(.86,Math.max(.3,1-56/Math.max(1,e.host.clientWidth))),occupiedY=Math.min(.84,Math.max(.3,1-72/Math.max(1,e.host.clientHeight)));
    let distance=20;
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
      const dx=x-e.target.x,dy=y-e.target.y,dz=z-e.target.z,right=sy*dx-cy*dz,up=-sp*cy*dx+cp*dy-sp*sy*dz,depth=cp*cy*dx+sp*dy+cp*sy*dz;
      distance=Math.max(distance,depth+Math.abs(right)/(tanH*occupiedX),depth+Math.abs(up)/(tanV*occupiedY));
    }
    e.fitDistance=distance;e.distance=distance*Math.max(.1,Math.min(8,zoom));updateRackFurniture3DCamera(e);
  }
  function v223CleanRackLibraryHelpers(e,keepSelection=false){
    e.spaceMeshes.forEach(mesh=>{e.root.remove(mesh);mesh.geometry?.dispose();mesh.material?.dispose();});e.spaceMeshes=[];
    e.root.children.slice().filter(o=>o.isAxesHelper||(o.isLineSegments&&(!keepSelection||!o.userData?.decorative))).forEach(o=>{e.root.remove(o);o.geometry?.dispose();o.material?.dispose();});
  }
  async function renderRackLibrary3DPreview(modelId){
    const token=++rackLibraryPreviewToken;
    const model=rackModel(modelId),host=document.getElementById('rackPreviewStage');
    if(!host||!model?.furniture?.enabled){disposeRackLibrary3DPreview();return;}
    let THREE;
    try{THREE=await loadThreeRuntime();}catch(error){console.warn('Preview WebGL no disponible; se mantiene vista SVG:',error?.message||error);return;}
    if(token!==rackLibraryPreviewToken||!host.isConnected)return;
    let e=rackLibrary3DEngine;
    if(!e||e.host!==host){
      const previousView=e?.modelId===modelId?{yaw:e.yaw,pitch:e.pitch,fitKey:e.fitKey,zoom:e.distance/(e.fitDistance||e.distance)}:null;
      disposeRackLibrary3DPreview();
      let renderer;
      try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:false});}
      catch(error){console.warn('Sin contexto WebGL para el preview:',error);return;}
      renderer.setPixelRatio(Math.min(1.6,window.devicePixelRatio||1));
      renderer.setClearColor(0xf6f2eb,1);
      renderer.shadowMap.enabled=true;
      renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      renderer.domElement.className='wms-v194-real-model-preview';
      renderer.domElement.style.cssText='display:block;position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab;';
      const scene=new THREE.Scene();scene.background=new THREE.Color(0xf6f2eb);
      const camera=new THREE.PerspectiveCamera(34,1,.1,100000);
      const root=new THREE.Group();scene.add(root);
      scene.add(new THREE.HemisphereLight(0xffffff,0xc7beb2,2.15));
      const key=new THREE.DirectionalLight(0xffffff,2.0);key.position.set(260,400,460);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);
      const fill=new THREE.DirectionalLight(0xdce8ff,.65);fill.position.set(-280,140,-220);scene.add(fill);
      e={THREE,host,renderer,scene,camera,root,modelId,meshByPiece:new Map(),spaceMeshes:[],target:new THREE.Vector3(),yaw:previousView?.yaw??.83,pitch:previousView?.pitch??.36,distance:400,raf:0,raycaster:new THREE.Raycaster(),pointer:new THREE.Vector2(),fitKey:'',fitDistance:0,pendingView:previousView};
      rackLibrary3DEngine=e;
      host.style.position='relative';
      host.appendChild(renderer.domElement);
      const resize=()=>{if(!host.isConnected)return;const w=Math.max(160,host.clientWidth||600),h=Math.max(180,host.clientHeight||480);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();v223FitRackLibraryCamera(e);requestRackFurniture3DRender(e);};
      e.resizeObserver=new ResizeObserver(resize);e.resizeObserver.observe(host);resize();
      renderer.domElement.addEventListener('pointerdown',ev=>{if(ev.button!==0)return;const hit=rackFurniture3DHit(e,ev);if(hit?.object?.userData?.pieceId){appState.ui.v222LibraryAdvanced=true;const advanced=document.getElementById('rackLibraryAdvanced');if(advanced)advanced.open=true;}rackFurniture3DPointerDown(e,ev);if(hit?.object?.userData?.pieceId)v223RevealLibraryPieceInspector();rebuildRackFurniture3DScene(e,rackModel(e.modelId));v223CleanRackLibraryHelpers(e,true);requestRackFurniture3DRender(e);});
      renderer.domElement.addEventListener('wheel',ev=>{ev.preventDefault();e.distance=Math.max(10,Math.min(60000,e.distance*(ev.deltaY>0?1.1:.9)));updateRackFurniture3DCamera(e);requestRackFurniture3DRender(e);},{passive:false});
    }
    e.modelId=model.id;
    rebuildRackFurniture3DScene(e,model); // Misma geometría y materiales que 'Crear mobiliario 3D'.
    // El catálogo no muestra ejes, zonas fantasma ni seleccionados de la sesión de construcción.
    v223CleanRackLibraryHelpers(e);
    const W=Math.max(1,Number(model.width||120)),D=Math.max(1,Number(model.depth||40)),H=Math.max(1,Number(model.height||200));
    const fitKey=JSON.stringify([model.id,W,D,H]);if(e.fitKey!==fitKey){
    const zoom=e.pendingView?.fitKey===fitKey?e.pendingView.zoom:1;e.fitKey=fitKey;e.pendingView=null;
    v223FitRackLibraryCamera(e,{zoom});
    }
    updateRackFurniture3DCamera(e);
    const svg=host.querySelector('#rackModelSvg');if(svg)svg.style.display='none';
    e.renderer.domElement.style.display='block';
    requestRackFurniture3DRender(e);
  }

  function renderRackModelPreview(){
    const svg = $('#rackModelSvg');
    if(!svg)return;
    if(appState.screen==='racks')v222RefreshLibraryControls();
    svg.innerHTML='';
    const previewModel = rackModel(appState.selectedModelId) || appState.models?.[0];
    if(!previewModel)return;
    // Preview de catálogo: exclusivamente el diseño base (sin ID ni selección de una instancia).
    const previewRack={id:previewModel.name||'Modelo',modelId:previewModel.id,x:0,y:0,w:previewModel.width||120,h:previewModel.depth||40,rot:0,baseHeight:0,rackHeight:previewModel.height||238};
    svg.setAttribute('data-catalog-preview','');
    renderRackDetail(previewModel.name||'Modelo',null,svg,previewModel,previewRack);
    if(previewModel.furniture?.enabled){
      void renderRackLibrary3DPreview(previewModel.id);
      const thumbnail=Array.from(document.querySelectorAll('svg[data-furniture-thumb]')).find(x=>x.dataset.furnitureThumb===previewModel.id);
      if(thumbnail)renderFurnitureRackDetail(previewModel.name,null,thumbnail,previewModel,null);
    }
    if(!previewModel.furniture?.enabled){rackLibraryPreviewToken++;disposeRackLibrary3DPreview();svg.style.display='';}
    detailStatus.textContent=previewModel.name||'Modelo';
    detailChip.textContent=`${previewModel.levels||0} niveles · ${previewModel.width}×${previewModel.depth}×${previewModel.height} cm`;
    enableRackPreviewNavigation(svg,previewModel.id);
  }

  function computePreviewFitView(svg, vb, padding = 20, modelId = null){
    const aspect = Math.max(0.3, (svg.clientWidth || 780) / Math.max(1, (svg.clientHeight || 640)));
    const pad = Math.max(0, Number(padding) || 0);
    const innerW = Math.max(1, vb.width);
    const innerH = Math.max(1, vb.height);
    const targetW = innerW + pad * 2;
    const targetH = innerH + pad * 2;
    const cx = vb.x + innerW / 2;
    const cy = vb.y + innerH / 2;
    let w = targetW;
    let h = targetH;
    const currentAspect = targetW / Math.max(1, targetH);
    if(currentAspect > aspect){
      h = w / aspect;
    } else {
      w = h * aspect;
    }
    let view = { x: cx - w / 2, y: cy - h / 2, w, h };
    const model = modelId ? rackModel(modelId) : null;
    // El render paramétrico ya calcula su encuadre: evitar zoom y desfase heredados.
    if(model?.furniture?.enabled)return view;
    const styleKind = normalizeRackStyle(model?.style || '');
    if(styleKind === 'metallic' || styleKind === 'melamine' || styleKind === 'wood'){
      const zoomFactor = 0.9;
      view = {
        x: view.x + (view.w * (1 - zoomFactor) / 2),
        y: view.y + (view.h * (1 - zoomFactor) / 2) + 120,
        w: Math.max(120, view.w * zoomFactor),
        h: Math.max(140, view.h * zoomFactor)
      };
    } else if(styleKind === 'under_stairs'){
      const zoomFactor = 0.847; // alejar 10% adicional desde 0.77
      view = {
        x: view.x + (view.w * (1 - zoomFactor) / 2),
        y: view.y + (view.h * (1 - zoomFactor) / 2) + 95,
        w: Math.max(120, view.w * zoomFactor),
        h: Math.max(140, view.h * zoomFactor)
      };
    } else if(styleKind === 'under_stairs_reflected'){
      const zoomFactor = 0.7;
      view = {
        x: view.x + (view.w * (1 - zoomFactor) / 2),
        y: view.y + (view.h * (1 - zoomFactor) / 2) + 115,
        w: Math.max(120, view.w * zoomFactor),
        h: Math.max(140, view.h * zoomFactor)
      };
    }
    return view;
  }

  function getCenteredPreviewView(svg, vb, modelId = null){
    return computePreviewFitView(svg, vb, 20, modelId);
  }

  function enableRackPreviewNavigation(svg, modelId){
    if(!svg) return;
    const vb = svg.viewBox && svg.viewBox.baseVal ? svg.viewBox.baseVal : null;
    if(!vb || !vb.width || !vb.height) return;
    if(!appState.ui) appState.ui = {};
    const saved = appState.ui.rackPreviewCamera;
    const initialView = getCenteredPreviewView(svg, { x: vb.x, y: vb.y, width: vb.width, height: vb.height }, modelId);
    // Las piezas cambian sus límites al editar el modelo: una cámara SVG antigua
    // podía recortar la base o la tapa. El modelo paramétrico siempre se reencuadra.
    const model=rackModel(modelId);
    let view = (!model?.furniture?.enabled && saved && saved.modelId === modelId && saved.view) ? { ...saved.view } : { ...initialView };
    let dragging = false;
    let start = null;
    const apply = () => { svg.setAttribute('viewBox', `${view.x} ${view.y} ${view.w} ${view.h}`); appState.ui.rackPreviewCamera = { modelId, view: { ...view } }; };
    apply();
    svg.onwheel = (e) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const px = rect.width ? (e.clientX - rect.left) / rect.width : 0.5;
      const py = rect.height ? (e.clientY - rect.top) / rect.height : 0.5;
      const mx = view.x + view.w * px;
      const my = view.y + view.h * py;
      const factor = e.deltaY > 0 ? 1.08 : 0.92;
      const nw = Math.max(120, Math.min(1600, view.w * factor));
      const nh = Math.max(140, Math.min(1800, view.h * factor));
      view.x = mx - nw * px;
      view.y = my - nh * py;
      view.w = nw;
      view.h = nh;
      apply();
    };
    svg.onpointerdown = (e) => {
      dragging = true;
      start = { x: e.clientX, y: e.clientY, viewX: view.x, viewY: view.y, w: view.w, h: view.h };
      const stage = document.getElementById('rackPreviewStage');
      if(stage) stage.classList.add('dragging');
      svg.setPointerCapture?.(e.pointerId);
    };
    svg.onpointermove = (e) => {
      if(!dragging || !start) return;
      const rect = svg.getBoundingClientRect();
      const dx = ((e.clientX - start.x) / Math.max(1, rect.width)) * start.w;
      const dy = ((e.clientY - start.y) / Math.max(1, rect.height)) * start.h;
      view.x = start.viewX - dx;
      view.y = start.viewY - dy;
      apply();
    };
    svg.onpointerup = () => { dragging = false; start = null; const stage = document.getElementById('rackPreviewStage'); if(stage) stage.classList.remove('dragging'); };
    svg.onpointercancel = svg.onpointerup;
  }



  /* WMS v143 — 3D Furniture Engine: edición paramétrica directa en el mismo 3D */
  function furnitureId(prefix='p'){ return `${prefix}_${Math.random().toString(36).slice(2,8)}`; }

  function ensureRackFurnitureModel(model){
    if(!model || typeof model !== 'object') return model;
    if(!model.furniture || typeof model.furniture !== 'object') model.furniture = { enabled:false, version:1 };
    const f=model.furniture;
    f.version=1;
    f.enabled=!!f.enabled;
    f.material = ['melamine','wood','metal','metal-wood'].includes(f.material) ? f.material : (normalizeRackStyle(model.style)==='metallic'?'metal':normalizeRackStyle(model.style)==='wood'?'wood':'melamine');
    f.thickness = Math.max(.3, Number(f.thickness || (['metal','metal-wood'].includes(f.material)?4:1.8)) || 1.8);
    f.finish = ['white','oak','walnut','graphite'].includes(f.finish) ? f.finish : 'oak';
    f.template = ['shelf','cabinet','display','metal-wood'].includes(f.template) ? f.template : 'shelf';
    f.backThickness = Math.max(.2, Math.min(3,Number(f.backThickness ?? .3)||.3));
    if(!['none','full','modules'].includes(f.backMode))f.backMode=f.pieces?.some?.(p=>p.type==='back')?'full':'none';
    f.backInset=Math.max(0,Math.min(12,Number(f.backInset ?? .4)||0));
    f.plinthEnabled=!(['metal','metal-wood'].includes(f.material)) && f.plinthEnabled===true;
    f.plinthHeight=Math.max(4,Math.min(30,Number(f.plinthHeight ?? 10)||10));
    f.plinthRecess=Math.max(0,Math.min(20,Number(f.plinthRecess ?? 5)||0));
    f.snap = Math.max(.1, Number(f.snap || 1) || 1);
    f.pieces = Array.isArray(f.pieces) ? f.pieces : [];
    f.logicalSlots = (f.logicalSlots && typeof f.logicalSlots==='object') ? f.logicalSlots : {};
    f.selectedPieceId = String(f.selectedPieceId||'');
    f.selectedPieceIds = Array.isArray(f.selectedPieceIds) ? f.selectedPieceIds.map(String) : (f.selectedPieceId ? [String(f.selectedPieceId)] : []);
    f.selectedSpace = (f.selectedSpace && typeof f.selectedSpace==='object') ? { levelIndex:Number(f.selectedSpace.levelIndex||0), slotIndex:Number(f.selectedSpace.slotIndex||0) } : null;
    f.roofMode = f.roofMode === 'slope' ? 'slope' : 'flat';
    f.leftHeight = Math.max(20, Number(f.leftHeight || model.height || 200));
    f.rightHeight = Math.max(20, Number(f.rightHeight || model.height || 200));
    if(f.roofMode === 'flat') f.leftHeight=f.rightHeight=Math.max(60,Number(model.height||200));
    model.height=Math.max(60,f.leftHeight,f.rightHeight);
    f.showSlots = f.showSlots !== false;
    f.showDims = f.showDims !== false;
    f.pieces.forEach(p=>{
      p.id=String(p.id||furnitureId('piece'));
      p.type=String(p.type||'panel');
      p.name=String(p.name||furniturePieceLabel(p));
      p.x=Number(p.x||0); p.y=Number(p.y||0); p.z=Number(p.z||0);
      p.w=Math.max(.1,Number(p.w||1)); p.d=Math.max(.1,Number(p.d||model.depth||40)); p.h=Math.max(.1,Number(p.h||1));
      p.join=String(p.join||'flush');
      p.autoFit=String(p.autoFit||'');
      if(p.carcass&&furnitureIsMetalFrame(f.material)&&!p.autoFit&&p.type==='post'){p.autoFit='metal-post';p.anchorX=p.x>0?'right':'left';p.anchorY=p.y>0?'front':'back';}
      if(p.carcass&&furnitureIsMetalFrame(f.material)&&!p.autoFit&&p.type==='beam'){p.autoFit=p.z>0?'metal-top-beam':'metal-base-beam';p.anchorY=p.y>0?'front':'back';}
    });
    return model;
  }

  function furniturePieceLabel(piece){
    const map={plinth:'Zócalo',side:'Lateral',top:'Tapa superior',base:'Base',shelf:'Repisa',divider:'División',back:'Fondo',brace:'Refuerzo',post:'Poste',beam:'Viga',panel:'Panel',door:'Puerta',drawer:'Cajón'};
    return map[String(piece?.type||'panel')]||'Pieza';
  }

  function furnitureMaterialLabel(material){ return material==='metal-wood'?'Metal + madera':material==='metal'?'Metal':material==='wood'?'Madera':'Melamina'; }
  function furnitureMaterialStyle(material){ return ['metal','metal-wood'].includes(material)?'metallic':material==='wood'?'wood':'melamine'; }
  function furnitureIsMetalFrame(material){return material==='metal'||material==='metal-wood';}
  function furniturePieceFinish(model,piece){const f=model?.furniture||{};return f.material==='metal-wood' ? (['post','beam','brace'].includes(piece.type)?'metal':'wood') : f.material;}

  function furnitureMakePiece(type, props={}){
    return { id:furnitureId(type), type, name:props.name||furniturePieceLabel({type}), x:0,y:0,z:0,w:1,d:1,h:1,join:'flush',autoFit:'',...props };
  }

  function furnitureBaseTop(model){
    const base=model?.furniture?.pieces?.find(p=>p.type==='base');
    if(base)return Number(base.z||0)+Number(base.h||model.furniture.thickness||1.8);
    return model?.furniture?.plinthEnabled?Number(model.furniture.plinthHeight||10):Number(model?.furniture?.thickness||1.8);
  }
  // Todos los fondos son paneles reales: Y=0 corresponde a la cara posterior.
  // El usuario no necesita orbitar ni acertar con el ratón para colocarlos.
  function furnitureSyncBackPanels(model){
    ensureRackFurnitureModel(model);const f=model.furniture;
    f.pieces=f.pieces.filter(p=>p.type!=='back');
    if(f.backMode==='none')return;
    const W=Number(model.width||120),D=Number(model.depth||40),H=Number(model.height||200),t=f.thickness;
    const z=furnitureBaseTop(model),th=f.backThickness,y=Math.min(D-th,Math.max(0,f.backInset));
    if(f.backMode==='full'){
      f.pieces.unshift(furnitureMakePiece('back',{id:'back_full',name:'Fondo completo',x:t,y,z,w:Math.max(1,W-2*t),d:th,h:Math.max(1,H-t-z),join:'inset',autoFit:'full-back'}));
      return;
    }
    const levels=deriveFurnitureLevels(model);
    for(const level of levels){
      for(const slot of level.slots){
        const x=slot.x0+Math.min(.4,t*.2),wide=Math.max(.1,slot.x1-slot.x0-Math.min(.8,t*.4));
        f.pieces.push(furnitureMakePiece('back',{id:`back_${level.index}_${slot.index}`,name:`Fondo N${level.index}-${slot.code}`,x,y,z:level.z0,w:wide,d:th,h:Math.max(.1,level.height),join:'inset',autoFit:''}));
      }
    }
  }
  function furnitureSetPlinth(model,enabled){
    ensureRackFurnitureModel(model);model.furniture.plinthEnabled=!!enabled;
    furnitureCreateCarcass(model,{keepCustom:true});
    resolveConstructionShelfCollisions(model);
    furnitureSyncBackPanels(model);syncFurnitureModelToLegacy(model);
  }

  function furnitureCreateCarcass(model,{keepCustom=true}={}){
    ensureRackFurnitureModel(model); const f=model.furniture; f.enabled=true;
    const W=Math.max(30,Number(model.width||120)),D=Math.max(20,Number(model.depth||40)),H=Math.max(60,Number(model.height||200));
    const t=Math.max(.3,Number(f.thickness||1.8));
    const custom=keepCustom?f.pieces.filter(p=>!p.carcass):[];
    const pieces=[];
    if(furnitureIsMetalFrame(f.material)){
      const post=Math.max(2,Math.min(8,t));
      [[0,0],[W-post,0],[0,D-post],[W-post,D-post]].forEach(([x,y],i)=>pieces.push(furnitureMakePiece('post',{name:`Poste ${i+1}`,x,y,z:0,w:post,d:post,h:H,carcass:true,join:'bolted',autoFit:'metal-post',anchorX:i%2?'right':'left',anchorY:i>1?'front':'back'})));
      const beam=Math.max(2,Math.min(8,t));
      [0,H-beam].forEach((z,zi)=>{
        pieces.push(furnitureMakePiece('beam',{name:zi?'Viga superior frontal':'Viga base frontal',x:0,y:D-beam,z,w:W,d:beam,h:beam,carcass:true,join:'bolted',autoFit:zi?'metal-top-beam':'metal-base-beam',anchorY:'front'}));
        pieces.push(furnitureMakePiece('beam',{name:zi?'Viga superior posterior':'Viga base posterior',x:0,y:0,z,w:W,d:beam,h:beam,carcass:true,join:'bolted',autoFit:zi?'metal-top-beam':'metal-base-beam',anchorY:'back'}));
      });
    }else{
      pieces.push(furnitureMakePiece('side',{name:'Lateral izquierdo',x:0,y:0,z:0,w:t,d:D,h:Number(f.leftHeight||H),carcass:true,join:'flush',autoFit:'left-side'}));
      pieces.push(furnitureMakePiece('side',{name:'Lateral derecho',x:W-t,y:0,z:0,w:t,d:D,h:Number(f.rightHeight||H),carcass:true,join:'flush',autoFit:'right-side'}));
      const baseZ=f.plinthEnabled?Math.min(f.plinthHeight,H-t-8):0;
      pieces.push(furnitureMakePiece('base',{name:'Base inferior',x:t,y:0,z:baseZ,w:Math.max(1,W-2*t),d:D,h:t,carcass:true,join:'between',autoFit:'between-sides'}));
      if(f.plinthEnabled)pieces.push(furnitureMakePiece('plinth',{name:'Zócalo remetido',x:t,y:Math.max(0,D-t-f.plinthRecess),z:0,w:Math.max(1,W-2*t),d:t,h:baseZ,carcass:true,autoFit:'plinth-front'}));
      pieces.push(furnitureMakePiece('top',{name:'Tapa superior',x:t,y:0,z:H-t,w:Math.max(1,W-2*t),d:D,h:t,carcass:true,join:'between',autoFit:'between-sides-top',slopeTop:f.roofMode==='slope'}));
    }
    f.pieces=[...pieces,...custom]; furnitureRefitModel(model); furnitureSyncBackPanels(model); syncFurnitureModelToLegacy(model); return model;
  }

  function furnitureRoofHeightAtX(model,x){
    ensureRackFurnitureModel(model);const f=model.furniture,W=Math.max(1,Number(model.width||120));
    if(f.roofMode!=='slope')return Math.max(20,Number(f.leftHeight||model.height||200));
    const t=Math.max(0,Math.min(1,Number(x||0)/W));return Number(f.leftHeight||model.height||200)+(Number(f.rightHeight||model.height||200)-Number(f.leftHeight||model.height||200))*t;
  }

  function furnitureShelfMaxZ(model,piece){
    const f=model.furniture,t=Math.max(.3,Number(f.thickness||1.8)),x0=Math.max(0,Number(piece?.x||0)),x1=Math.min(Number(model.width||120),x0+Math.max(.1,Number(piece?.w||1)));
    return Math.max(furnitureBaseTop(model),Math.min(furnitureRoofHeightAtX(model,x0),furnitureRoofHeightAtX(model,x1))-Math.max(t,Number(piece?.h||t)));
  }

  function furnitureRefitModel(model){
    ensureRackFurnitureModel(model); const f=model.furniture; if(!f.enabled)return;
    const W=Math.max(30,Number(model.width||120)),D=Math.max(20,Number(model.depth||40)),H=Math.max(60,Number(model.height||200)),t=Math.max(.3,Number(f.thickness||1.8));
    f.pieces.forEach(p=>{
      if(p.autoFit==='metal-post'){const post=Math.max(2,Math.min(8,t));p.x=p.anchorX==='right'?W-post:0;p.y=p.anchorY==='front'?D-post:0;p.z=0;p.w=p.d=post;p.h=p.anchorX==='right'?Number(f.rightHeight||H):Number(f.leftHeight||H);}
      else if(p.autoFit==='metal-top-beam'||p.autoFit==='metal-base-beam'){const beam=Math.max(2,Math.min(8,t));p.x=0;p.y=p.anchorY==='front'?D-beam:0;p.w=W;p.d=p.h=beam;p.z=p.autoFit==='metal-top-beam'?Math.min(Number(f.leftHeight||H),Number(f.rightHeight||H))-beam:0;}
      else if(p.autoFit==='left-side'){p.x=0;p.y=0;p.z=0;p.w=t;p.d=D;p.h=Math.max(t,Number(f.leftHeight||H));}
      else if(p.autoFit==='right-side'){p.x=W-t;p.y=0;p.z=0;p.w=t;p.d=D;p.h=Math.max(t,Number(f.rightHeight||H));}
      else if(p.autoFit==='plinth-front'){
        p.x=t;p.w=Math.max(1,W-2*t);p.y=Math.max(0,D-t-f.plinthRecess);p.d=t;p.z=0;p.h=Math.min(f.plinthHeight,H-t-8);
      }
      else if(p.autoFit==='between-sides'||p.autoFit==='between-sides-top'){
        const join=p.join||'between'; const inset=join==='inset'?t*.5:join==='overlap'?0:t;
        p.x=inset; p.w=Math.max(1,W-inset*2); p.y=0;p.d=D;p.h=t;
        if(p.type==='base')p.z=f.plinthEnabled?Math.min(f.plinthHeight,H-t-8):0;
        if(p.autoFit==='between-sides-top'){
          const lh=Math.max(t,Number(f.leftHeight||H)),rh=Math.max(t,Number(f.rightHeight||H));
          p.slopeTop=f.roofMode==='slope'; p.leftZ=lh-t; p.rightZ=rh-t; p.z=Math.min(lh,rh)-t;
        }
      } else if(p.autoFit==='full-back'){
        const offset=furnitureBaseTop(model);p.x=t;p.y=Math.min(D-f.backThickness,f.backInset);p.z=offset;p.w=Math.max(1,W-2*t);p.d=f.backThickness;p.h=Math.max(1,H-t-offset);
      }
      else if(p.autoFit==='shelf'){
        const join=p.join||'between'; const inset=join==='overlap'?0:join==='inset'?t*.5:t;
        p.x=inset;p.w=Math.max(1,W-inset*2);p.y=0;p.d=D;p.h=t;p.z=Math.max(furnitureBaseTop(model),Math.min(H-t,Number(p.z||0)));
      }
      p.x=Math.max(0,Math.min(W-Math.min(W,p.w),Number(p.x||0))); p.y=Math.max(0,Math.min(D-Math.min(D,p.d),Number(p.y||0))); p.z=Math.max(0,Math.min(H-Math.min(H,p.h),Number(p.z||0)));
      p.w=Math.max(.1,Math.min(W-p.x,Number(p.w||1)));p.d=Math.max(.1,Math.min(D-p.y,Number(p.d||1)));p.h=Math.max(.1,Math.min(H-p.z,Number(p.h||1)));
      if(p.type==='shelf'){p.h=t;constrainConstructionShelf(model,p);}
      if(p.type==='divider')constrainConstructionDivider(model,p);
    });
  }

  function getFurnitureRenderPieces(model){ ensureRackFurnitureModel(model); if(!model?.furniture?.enabled)return []; furnitureRefitModel(model); return model.furniture.pieces||[]; }

  function furnitureHorizontalBoundaries(model){
    ensureRackFurnitureModel(model); const f=model.furniture,t=Math.max(.3,Number(f.thickness||1.8)),H=Number(model.height||200);
    const shelves=f.pieces.filter(p=>['base','shelf'].includes(p.type)).map(p=>({id:p.id,z:Number(p.z||0),top:Number(p.z||0)+Number(p.h||t),piece:p})).sort((a,b)=>a.z-b.z);
    if(!shelves.length) return [{id:'floor',z:0,top:0,piece:null},{id:'top',z:H,top:H,piece:null}];
    const out=shelves;
    if(!out.some(bound=>bound.piece?.type==='base') && out[0].z>1)out.unshift({id:'floor',z:0,top:0,piece:null});
    const topPiece=f.pieces.find(p=>p.type==='top'); const topZ=topPiece?Number(topPiece.z||H-t):f.roofMode==='slope'?Math.min(Number(f.leftHeight||H),Number(f.rightHeight||H))-t:H;
    out.push({id:topPiece?.id||'top',z:topZ,top:H,piece:topPiece||null}); return out;
  }

  function deriveFurnitureLevels(model){
    ensureRackFurnitureModel(model); if(!model.furniture.enabled)return [];
    const f=model.furniture,W=Number(model.width||120),D=Number(model.depth||40),t=Math.max(.3,Number(f.thickness||1.8));
    const bounds=furnitureHorizontalBoundaries(model); const levels=[];
    for(let i=0;i<bounds.length-1;i++){
      const lower=bounds[i],upper=bounds[i+1]; const z0=Math.max(0,Number(lower.top||lower.z||0)),z1=Math.max(z0,Number(upper.z||upper.top||0));
      if(z1-z0<4)continue;
      const dividers=f.pieces.filter(p=>p.type==='divider' && Number(p.x||0)>t*.5 && Number(p.x||0)<W-t*.5 && Number(p.z||0)<=z0+1.5 && Number(p.z||0)+Number(p.h||0)>=z1-1.5).sort((a,b)=>a.x-b.x);
      const physicalXs=dividers.map(p=>Number(p.x||0)+Number(p.w||t)/2).filter((x,idx,arr)=>idx===0||Math.abs(x-arr[idx-1])>.5);
      const physicalSlots=Math.max(1,physicalXs.length+1); const levelNo=levels.length+1;
      const logical=Math.max(1,Number(f.logicalSlots?.[levelNo]||0)||0); const slotCount=Math.max(physicalSlots,logical||1);
      let edges=[];
      if(slotCount===physicalSlots && physicalXs.length){edges=[t,...physicalXs,W-t];}
      else {const innerW=Math.max(1,W-2*t);edges=Array.from({length:slotCount+1},(_,k)=>t+innerW*k/slotCount);}
      const slots=Array.from({length:slotCount},(_,si)=>({index:si+1,code:String.fromCharCode(65+si),x0:edges[si],x1:edges[si+1],width:Math.max(.1,edges[si+1]-edges[si]),physicalDividerAfter:si<physicalXs.length}));
      levels.push({index:levelNo,z0,z1,height:z1-z0,slots,physicalDividerCount:physicalXs.length});
    }
    return levels;
  }

  function syncFurnitureModelToLegacy(model){
    ensureRackFurnitureModel(model); if(!model.furniture.enabled)return model; furnitureRefitModel(model);
    const levels=deriveFurnitureLevels(model);
    if(model.furniture.backMode==='modules'){
      const signature=JSON.stringify(levels.map(level=>[level.z0,level.z1,level.slots.map(slot=>[slot.x0,slot.x1])]));
      if(signature!==model.furniture.backSignature){furnitureSyncBackPanels(model);model.furniture.backSignature=signature;}
    }
    if(levels.length){model.levels=levels.length;model.levelHeights=levels.map(l=>Math.max(10,Math.round(l.height*10)/10));model.levelSlots=levels.map(l=>l.slots.length);model.slots=Math.max(...model.levelSlots);}
    model.style=furnitureMaterialStyle(model.furniture.material); model.capacity=getRackCapacity(model); return model;
  }

  function convertLegacyModelToFurniture(model){
    ensureRackFurnitureModel(model); const f=model.furniture; f.enabled=true; f.material=normalizeRackStyle(model.style)==='metallic'?'metal':normalizeRackStyle(model.style)==='wood'?'wood':'melamine'; f.thickness=f.material==='metal'?4:1.8; f.pieces=[]; f.logicalSlots={};
    furnitureCreateCarcass(model,{keepCustom:false});
    const heights=buildLevelHeights(model),slots=buildLevelSlots(model),t=f.thickness,H=Number(model.height||200),W=Number(model.width||120),D=Number(model.depth||40);
    let cursor=Math.max(t,furnitureBaseTop(model),Number(model.clearance||0));
    for(let i=0;i<Math.max(1,heights.length-1);i++){
      cursor+=Math.max(10,Number(heights[i]||40)); if(cursor>=H-t*2)break;
      f.pieces.push(furnitureMakePiece('shelf',{name:`Repisa ${i+1}`,x:t,y:0,z:cursor,w:Math.max(1,W-2*t),d:D,h:t,join:'between',autoFit:'shelf'}));
    }
    furnitureRefitModel(model);
    const lvls=deriveFurnitureLevels(model);
    lvls.forEach((l,i)=>{const count=Math.max(1,Number(slots[i]||1));f.logicalSlots[l.index]=count;if(f.material!=='metal'&&count>1){for(let si=1;si<count;si++){const x=t+(W-2*t)*si/count;f.pieces.push(furnitureMakePiece('divider',{name:`Divisor N${l.index}.${si}`,x:x-t/2,y:0,z:l.z0,w:t,d:D,h:l.height,join:'between',autoFit:''}));}}});
    syncFurnitureModelToLegacy(model); return model;
  }

  function createNewFurnitureModelDraft(){
    recordHistorySnapshot('racks');
    const model={id:'rb_'+Math.random().toString(16).slice(2,8),name:'Estantería desde cero',levels:1,width:120,depth:40,height:200,clearance:0,slots:1,beam:2,style:'melamine',levelHeights:[196],levelSlots:[1],furniture:{enabled:true,version:1,material:'melamine',thickness:1.8,backThickness:.3,snap:1,pieces:[],logicalSlots:{},selectedPieceId:'',selectedPieceIds:[],roofMode:'flat',leftHeight:200,rightHeight:200,showSlots:true,showDims:true}};
    appState.models.unshift(model);appState.selectedModelId=model.id;appState.ui.rackLibraryOpenIds=[model.id];appState.ui.rackLibraryLevelsOpenIds=[];resetRackPreviewCamera();saveRackModels();renderRackModels();
  }


  function isRackConstructionScreen(){ return appState.screen === 'rack-builder'; }

  // Plantillas paramétricas: cada pieza se guarda en appState.models y se comparte con CAD/3D.
  function createFurnitureTemplate(kind='melamine-shelf'){
    const modes={
      'melamine-shelf':{name:'Estante de melamina',material:'melamine',template:'shelf',width:120,depth:40,height:200,thickness:1.8},
      'melamine-cabinet':{name:'Armario de melamina',material:'melamine',template:'cabinet',width:120,depth:55,height:205,thickness:1.8},
      'metal-wood':{name:'Estante de metal y madera',material:'metal-wood',template:'metal-wood',width:150,depth:55,height:220,thickness:4}
    };
    const opt=modes[kind]||modes['melamine-shelf'];
    recordHistorySnapshot('racks');
    const m={id:'fb_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,5),name:opt.name,levels:3,width:opt.width,depth:opt.depth,height:opt.height,clearance:0,slots:2,beam:2,style:furnitureMaterialStyle(opt.material),furniture:{enabled:true,version:1,material:opt.material,template:opt.template,finish:'oak',thickness:opt.thickness,backThickness:.3,backMode:kind==='melamine-cabinet'?'full':'none',backInset:.4,plinthEnabled:kind!=='metal-wood',plinthHeight:10,plinthRecess:5,snap:1,pieces:[],logicalSlots:{},selectedPieceId:'',selectedPieceIds:[],roofMode:'flat',leftHeight:opt.height,rightHeight:opt.height,showSlots:true,showDims:true}};
    appState.models.unshift(m);appState.selectedModelId=m.id;
    furnitureCreateCarcass(m,{keepCustom:false});
    if(kind==='melamine-cabinet'){
      const t=m.furniture.thickness;
      m.furniture.pieces.push(furnitureMakePiece('divider',{name:'Separador central',x:m.width/2-t/2,y:t,z:t,w:t,d:m.depth-t,h:m.height-2*t,join:'between'}));
      m.furniture.pieces.push(furnitureMakePiece('door',{name:'Puerta izquierda',x:t,y:m.depth-t,z:t,w:(m.width-3*t)/2,d:t,h:m.height-2*t,join:'hinged'}));
      m.furniture.pieces.push(furnitureMakePiece('door',{name:'Puerta derecha',x:m.width/2+t/2,y:m.depth-t,z:t,w:(m.width-3*t)/2,d:t,h:m.height-2*t,join:'hinged'}));
    }else{
      for(let i=1;i<=3;i++){
        const t=m.furniture.thickness;
        const z=(m.height-2*t)*i/4;
        m.furniture.pieces.push(furnitureMakePiece('shelf',{name:`Repisa ${i}`,x:furnitureIsMetalFrame(opt.material)?t/2:t,y:0,z,w:Math.max(1,m.width-(furnitureIsMetalFrame(opt.material)?t:2*t)),d:m.depth,h:furnitureIsMetalFrame(opt.material)?2.5:t,autoFit:furnitureIsMetalFrame(opt.material)?'':'shelf'}));
      }
    }
    furnitureRefitModel(m);furnitureSyncBackPanels(m);syncFurnitureModelToLegacy(m);saveRackModels();
    if(typeof disposeRackFurniture3DEngine==='function')disposeRackFurniture3DEngine();
    renderRackConstructionWorkspace();
    return m;
  }
  function addFurnitureFrontPiece(model,type='door'){
    ensureRackFurnitureModel(model);
    const f=model.furniture,t=Math.max(.3,Number(f.thickness||1.8));
    const door=type==='door';
    const existing=f.pieces.filter(p=>p.type===type).length;
    const w=door?Math.max(12,model.width*.46):Math.max(15,model.width*.7);
    const h=door?Math.max(20,model.height-t*3):Math.max(12,model.height*.18);
    const z=door?t:Math.min(model.height-h-t,t+(existing+1)*(h+4));
    if(z+h>model.height-t){showToast('No queda altura para otro frente.','warning',2200);return null;}
    const piece=furnitureMakePiece(type,{name:`${door?'Puerta':'Cajón'} ${existing+1}`,x:door?(existing%2===0?t:model.width-w-t):Math.max(t,(model.width-w)/2),y:Math.max(0,model.depth-t),z,w,d:t,h,join:door?'hinged':'slides'});
    f.pieces.push(piece);f.selectedPieceId=piece.id;f.selectedPieceIds=[piece.id];
    furnitureRefitModel(model);syncFurnitureModelToLegacy(model);saveRackModels();
    renderRackConstructionWorkspace();return piece;
  }
  // V193: la colocación se prepara en el plano y se confirma con un clic válido.
  // No exigimos una ubicación libre automática para poder abrir Editar layout.
  function placeFurnitureModelInLayout(model, options={}){
    if(!model||!model.furniture?.enabled)return null;
    if(typeof vspaceIsEditable==='function'&&!vspaceIsEditable()){
      showToast('Necesitas permisos de administrador para colocar muebles.','warning',2400);
      return null;
    }
    const validation=furnitureValidateModel(model);
    if(validation.errors.length){
      if(typeof furnitureShowValidation==='function')furnitureShowValidation(model);
      showToast('Revisa la geometría del modelo antes de colocarlo.','warning',3200);
      return null;
    }
    syncFurnitureModelToLegacy(model);
    saveRackModels();
    // El visor Espacio 3D conserva su inserción directa cuando se solicita navigate:false.
    if(options.navigate===false){
      if(typeof vspaceFindPosition!=='function')return null;
      const scale=Math.max(.01,getScaleCmPerUnit());
      const template={id:'M-'+Date.now().toString(36).toUpperCase(),zoneId:appState.layout?.zones?.[0]?.id||'',modelId:model.id,x:0,y:0,w:Number(model.width||120)/scale,h:Number(model.depth||40)/scale,rot:0,baseHeight:0,rackHeight:Number(model.height||200),virtualName:model.name,virtualType:'',virtual:{width:Number(model.width||120),depth:Number(model.depth||40),height:Number(model.height||200),levels:Number(model.levels||1),slots:Number(model.slots||1)},virtualPlacements:[],virtualContainers:[],customFurniture:true};
      const spot=vspaceFindPosition(template);
      if(!spot){showToast('No hay una ubicación libre en el espacio 3D. Prueba otro tamaño o zona.','warning',3000);return null;}
      recordHistorySnapshot('distribution');
      const instance={...template,...spot};
      appState.layout.racks.push(instance);
      appState.selectedRackLayoutId=instance.id;
      appState.selectedZoneId=instance.zoneId;
      persistActiveLayout();
      return instance;
    }
    if(!appState.editor || typeof appState.editor!=='object')appState.editor={};
    appState.editor.pendingFurnitureModelId=model.id;
    appState.editor.pendingFurniturePoint=null;
    appState.editor.mode='select';
    appState.editor.rightPanelOpen=true;
    appState.editor.presentationMode=false;
    appState.editor.racksVisible=true;
    appState.editor.sectionVisible=false;
    appState.editor.viewBoxInitialized=false;
    appState.editor.viewBoxCustomized=false;
    if(typeof setScreen==='function')setScreen('distribution');
    if(typeof showToast==='function')showToast('Haz clic dentro de una zona del plano para colocar el mueble. Esc cancela.','success',4100);
    return {pending:true,modelId:model.id};
  }

  function createNewFurnitureModelForConstruction(){
    recordHistorySnapshot('racks');
    const model={id:'rb_'+Math.random().toString(16).slice(2,8),name:'Nuevo rack / estante',levels:1,width:120,depth:40,height:200,clearance:0,slots:1,beam:2,style:'melamine',levelHeights:[196],levelSlots:[1],furniture:{enabled:true,version:1,material:'melamine',thickness:1.8,backThickness:.3,snap:1,pieces:[],logicalSlots:{},selectedPieceId:'',selectedPieceIds:[],roofMode:'flat',leftHeight:200,rightHeight:200,showSlots:true,showDims:true}};
    appState.models.unshift(model);appState.selectedModelId=model.id;ensureRackFurnitureModel(model);furnitureCreateCarcass(model,{keepCustom:false});saveRackModels();renderRackConstructionWorkspace();
  }

  function duplicateFurnitureModelForConstruction(){
    const model=rackModel(appState.selectedModelId);if(!model)return;recordHistorySnapshot('racks');
    const copy={...clone(model),id:'rb_'+Math.random().toString(16).slice(2,8),name:`${model.name} copia`};
    ensureRackFurnitureModel(copy);copy.furniture.selectedPieceId='';copy.furniture.selectedPieceIds=[];appState.models.unshift(copy);appState.selectedModelId=copy.id;saveRackModels();renderRackConstructionWorkspace();
  }

  async function saveFurnitureConstructionModel(){
    const model=rackModel(appState.selectedModelId);if(!model)return;
    ensureRackFurnitureModel(model);
    if(model.furniture.enabled){
      const validation=furnitureShowValidation(model);
      if(validation.errors.length) return;
      syncFurnitureModelToLegacy(model);
    }
    saveRackModels();
    let savedRemotely=false;
    try{savedRemotely=await saveRemoteAppState('mobiliario 3D');}catch(error){console.warn('No se pudo sincronizar el mobiliario:',error);}
    if(typeof showToast==='function')showToast(savedRemotely?'Mueble guardado y sincronizado con Cloudflare D1.':'Mueble guardado localmente; sincronización con D1 pendiente.',savedRemotely?'success':'warning',2600);
    renderRackConstructionWorkspace();
  }

  function constructionDividerSpan(model,z0,z1){
    const bounds=furnitureHorizontalBoundaries(model);const center=(Number(z0||0)+Number(z1||0))/2;let best=null,bestDist=Infinity;
    for(let i=0;i<bounds.length-1;i++){
      const lower=bounds[i],upper=bounds[i+1];const a=Math.max(0,Number(lower.top||lower.z||0)),b=Math.max(a,Number(upper.z||upper.top||0));if(b-a<4)continue;
      const dist=center>=a&&center<=b?0:Math.min(Math.abs(center-a),Math.abs(center-b));if(dist<bestDist){bestDist=dist;best={z0:a,z1:b,height:b-a,isRoof:upper.piece?.type==='top'||upper.id==='top'};}
    }
    return best||{z0:0,z1:Number(model.height||200),height:Number(model.height||200)};
  }

  function constrainConstructionDivider(model,piece){
    if(piece?.type!=='divider')return piece;
    const f=model.furniture,t=Math.max(.3,Number(f.thickness||1.8)),W=Number(model.width||120),D=Number(model.depth||40);const span=constructionDividerSpan(model,piece.z,Number(piece.z||0)+Number(piece.h||0));
    piece.z=span.z0;const roofLeft=furnitureRoofHeightAtX(model,piece.x),roofRight=furnitureRoofHeightAtX(model,Number(piece.x||0)+t);piece.roofFit=span.isRoof&&f.roofMode==='slope';piece.h=Math.max(.1,(span.isRoof?Math.max(roofLeft,roofRight):Math.min(span.z1,roofLeft,roofRight))-span.z0);piece.y=0;piece.d=D;piece.w=t;piece.x=Math.max(t,Math.min(W-t-piece.w,Number(piece.x||0)));return piece;
  }

  function constrainConstructionShelf(model,piece){
    if(piece?.type!=='shelf')return piece;
    const f=model.furniture,t=Math.max(.3,Number(f.thickness||1.8));
    const roof=f.roofMode==='slope'?Math.min(Number(f.leftHeight||model.height||200),Number(f.rightHeight||model.height||200)):Number(model.height||200);
    const others=f.pieces.filter(p=>p.id!==piece.id&&['base','shelf','top'].includes(p.type)).map(p=>({z:Number(p.z||0),top:Number(p.z||0)+Number(p.h||t),type:p.type})).sort((a,b)=>a.z-b.z);
    const gaps=[];let cursor=furnitureBaseTop(model);
    for(const q of others){if(q.type==='base'){cursor=Math.max(cursor,q.top);continue;}if(q.type==='top')break;if(q.z>cursor+.01){gaps.push({z0:cursor,z1:q.z});cursor=Math.max(cursor,q.top);}else cursor=Math.max(cursor,q.top);}
    const topInside=Math.max(cursor,roof-t);if(topInside>cursor+.01)gaps.push({z0:cursor,z1:topInside});
    if(!gaps.length){piece.z=Math.max(t,Math.min(roof-t-piece.h,Number(piece.z||t)));return piece;}
    const center=Number(piece.z||0)+Number(piece.h||t)/2;let best=gaps[0],dist=Infinity;for(const g of gaps){const c=(g.z0+g.z1)/2,d=center>=g.z0&&center<=g.z1?0:Math.abs(center-c);if(d<dist){dist=d;best=g;}}
    piece.h=t;piece.z=Math.max(best.z0,Math.min(best.z1-piece.h,Number(piece.z||best.z0)));return piece;
  }

  function resolveConstructionShelfCollisions(model){
    const f=model.furniture,t=Math.max(.3,Number(f.thickness||1.8));const roof=f.roofMode==='slope'?Math.min(Number(f.leftHeight||model.height||200),Number(f.rightHeight||model.height||200)):Number(model.height||200);const low=furnitureBaseTop(model),high=Math.max(low,roof-t);
    const shelves=f.pieces.filter(p=>p.type==='shelf').sort((a,b)=>Number(a.z||0)-Number(b.z||0));let cursor=low;
    let crowded=false;for(const shelf of shelves){if(Number(shelf.z||0)-cursor<4)crowded=true;cursor=Number(shelf.z||0)+t;}if(high-cursor<4)crowded=true;
    if(crowded&&shelves.length){const free=Math.max(0,high-low-shelves.length*t),gap=free/(shelves.length+1);let z=low;for(const shelf of shelves){z+=gap;shelf.z=z;shelf.h=t;z+=t;}return;}
    cursor=low;
    shelves.forEach(s=>{s.h=t;s.z=Math.max(cursor,Math.min(high-t,Number(s.z||cursor)));cursor=s.z+t;});
    let end=high;for(let i=shelves.length-1;i>=0;i--){const s=shelves[i];s.z=Math.min(s.z,end-t);end=s.z;}
    shelves.forEach(s=>{s.z=Math.max(low,s.z);});
  }

  function resizeFurnitureIntoVolume(model,field,newValue){
    ensureRackFurnitureModel(model);const f=model.furniture;const old={width:Math.max(1,Number(model.width||120)),depth:Math.max(1,Number(model.depth||40)),height:Math.max(1,Number(model.height||200))};
    const min=field==='height'?60:field==='depth'?20:30;const next=Math.max(min,Number(newValue||old[field]));if(Math.abs(next-old[field])<.0001)return;
    const ratio=next/old[field];const custom=f.pieces.filter(p=>!p.carcass);
    custom.forEach(piece=>{
      if(field==='width'){
        if(piece.type==='divider'){piece.x*=ratio;piece.w=f.thickness;}else if(piece.type==='shelf'){if(piece.autoFit!=='shelf'){piece.x*=ratio;piece.w*=ratio;}}else if(piece.type==='brace'){piece.x*=ratio;if(Number.isFinite(Number(piece.x2)))piece.x2*=ratio;piece.w*=ratio;}else if(piece.autoFit!=='full-back'){piece.x*=ratio;piece.w*=ratio;}
      }else if(field==='depth'){
        piece.y*=ratio;if(piece.type==='shelf'||piece.type==='divider'||piece.type==='back')piece.d=next;else piece.d*=ratio;
      }else if(field==='height'){
        if(piece.type==='shelf'){piece.z*=ratio;piece.h=f.thickness;}else if(piece.type==='divider'){piece.z*=ratio;piece.h*=ratio;}else if(piece.type==='brace'){piece.z*=ratio;if(Number.isFinite(Number(piece.z2)))piece.z2*=ratio;piece.h*=ratio;}else if(piece.autoFit!=='full-back'){piece.z*=ratio;piece.h*=ratio;}
      }
    });
    model[field]=next;
    if(field==='height'){
      if(f.roofMode==='flat'){f.leftHeight=f.rightHeight=next;}else{f.leftHeight=Math.max(20,Number(f.leftHeight||old.height)*ratio);f.rightHeight=Math.max(20,Number(f.rightHeight||old.height)*ratio);const mx=Math.max(f.leftHeight,f.rightHeight);if(mx>next){const k=next/mx;f.leftHeight*=k;f.rightHeight*=k;}model.height=next;}
    }
    furnitureCreateCarcass(model,{keepCustom:true});resolveConstructionShelfCollisions(model);furnitureRefitModel(model);furnitureSyncBackPanels(model);f.pieces.filter(p=>p.type==='divider').forEach(p=>constrainConstructionDivider(model,p));syncFurnitureModelToLegacy(model);
  }

  function normalizeConstructionSizes(values,total,count){
    const n=Math.max(1,count);let vals=Array.from({length:n},(_,i)=>Math.max(.1,Number(values?.[i]||0)||0));if(!vals.some(v=>v>0))vals=Array(n).fill(1);const sum=vals.reduce((a,b)=>a+b,0)||n;return vals.map(v=>total*v/sum);
  }

  function applyConstructionHorizontalSpaces(model,count,equal,values){
    ensureRackFurnitureModel(model);const f=model.furniture,t=Math.max(.3,Number(f.thickness||1.8));const n=Math.max(1,Math.min(12,Number(count||1)));const roof=f.roofMode==='slope'?Math.min(Number(f.leftHeight||model.height||200),Number(f.rightHeight||model.height||200)):Number(model.height||200);const baseTop=furnitureBaseTop(model),free=Math.max(n,roof-baseTop-t-(n-1)*t);
    const gaps=equal?Array(n).fill(free/n):normalizeConstructionSizes(values,free,n);f.pieces=f.pieces.filter(p=>p.type!=='shelf');let cursor=baseTop;
    for(let i=0;i<n-1;i++){cursor+=gaps[i];const shelf=furnitureMakePiece('shelf',{name:`Repisa ${i+1}`,x:t,y:0,z:cursor,w:Math.max(1,Number(model.width||120)-2*t),d:Number(model.depth||40),h:t,join:f.material==='metal'?'bolted':'between',autoFit:'shelf'});f.pieces.push(shelf);cursor+=t;}
    f.logicalSlots={};furnitureRefitModel(model);resolveConstructionShelfCollisions(model);furnitureSyncBackPanels(model);f.pieces.filter(p=>p.type==='divider').forEach(p=>constrainConstructionDivider(model,p));syncFurnitureModelToLegacy(model);return gaps;
  }

  function applyConstructionVerticalSpaces(model,target,count,equal,values){
    ensureRackFurnitureModel(model);furnitureRefitModel(model);const f=model.furniture,t=Math.max(.3,Number(f.thickness||1.8)),W=Number(model.width||120),D=Number(model.depth||40);const levels=deriveFurnitureLevels(model);const n=Math.max(1,Math.min(12,Number(count||1)));const targets=String(target)==='all'?levels:levels.filter(l=>l.index===Number(target));if(!targets.length)return [];
    const free=Math.max(n,W-2*t-(n-1)*t);const gaps=equal?Array(n).fill(free/n):normalizeConstructionSizes(values,free,n);
    const isTargetLevel=p=>targets.some(l=>Number(p.z||0)<=l.z0+1.5&&Number(p.z||0)+Number(p.h||0)>=l.z1-1.5);f.pieces=f.pieces.filter(p=>p.type!=='divider'||!isTargetLevel(p));
    targets.forEach(level=>{let cursor=t;for(let i=0;i<n-1;i++){cursor+=gaps[i];const d=furnitureMakePiece('divider',{name:`División N${level.index}.${i+1}`,x:cursor,y:0,z:level.z0,w:t,d:D,h:level.height,join:f.material==='metal'?'slot':'between'});f.pieces.push(d);cursor+=t;}f.logicalSlots[level.index]=n;});
    furnitureRefitModel(model);furnitureSyncBackPanels(model);syncFurnitureModelToLegacy(model);return gaps;
  }

  // V189: distribución real y despiece del constructor (misma geometría que ve el visor 3D).
  function furnitureValidateModel(model){
    ensureRackFurnitureModel(model);
    const warnings=[],errors=[],f=model.furniture;
    const W=Number(model.width||0),D=Number(model.depth||0),H=Number(model.height||0);
    if(!f.enabled || !f.pieces.length)errors.push('El mueble no contiene piezas físicas.');
    if(W<30||D<20||H<60)errors.push('Revisa las dimensiones generales del mueble.');
    if(f.thickness>=Math.min(W,D,H)/2)errors.push('El espesor ocupa demasiado volumen.');
    for(const piece of f.pieces){
      const id=piece.name||piece.type||'Pieza';
      const values=['x','y','z','w','d','h'].map(k=>Number(piece[k]));
      if(values.some(v=>!Number.isFinite(v)))errors.push(`${id}: coordenada o dimensión no numérica.`);
      else if(values.slice(3).some(v=>v<=0))errors.push(`${id}: dimensión nula o negativa.`);
      else if(values[0]<-0.6||values[1]<-0.6||values[2]<-0.6||values[0]+values[3]>W+.6||values[1]+values[4]>D+.6||values[2]+values[5]>H+.6)
        errors.push(`${id}: sale del volumen general del mueble.`);
    }
    if(f.pieces.length>350)warnings.push('El modelo tiene más de 350 piezas: el render puede ser lento.');
    if(furnitureIsMetalFrame(f.material))warnings.push('La resistencia de perfiles y uniones requiere validación estructural independiente.');
    return {warnings,errors};
  }
  function furnitureShowValidation(model){
    const box=document.getElementById('fbValidationResult');
    const result=furnitureValidateModel(model);
    if(box) box.innerHTML=`<div class="fb-validation ${result.errors.length?'is-error':'is-ok'}"><strong>${result.errors.length?`${result.errors.length} problema(s) por corregir`:'Geometría verificada'}</strong>${[...result.errors,...result.warnings].map(m=>`<div>• ${escapeHtml(m)}</div>`).join('') || '<div>Las piezas tienen dimensiones positivas y se encuentran dentro del volumen.</div>'}</div>`;
    if(result.errors.length && typeof showToast==='function')showToast('Corrige los problemas de geometría antes de colocar el mueble.','warning',2600);
    return result;
  }
  function furniturePartsTable(model){
    if(!model?.furniture?.enabled)return '';
    return `<div class="fb-parts-scroll"><table><thead><tr><th>Pieza</th><th>Material</th><th>Ancho</th><th>Fondo</th><th>Alto</th></tr></thead><tbody>${(model.furniture.pieces||[]).map(piece=>`<tr data-bom-piece="${escapeHtml(piece.id)}"><td>${escapeHtml(piece.name||piece.type)}</td><td>${escapeHtml(furniturePieceFinish(model,piece)||'')}</td><td>${round1(piece.w)} cm</td><td>${round1(piece.d)} cm</td><td>${round1(piece.h)} cm</td></tr>`).join('')}</tbody></table></div><div class="fb-parts-summary">${(model.furniture.pieces||[]).length} piezas · ${(model.furniture.pieces||[]).filter(p=>p.type==='shelf').length} repisas · ${(model.furniture.pieces||[]).filter(p=>p.type==='divider').length} divisores</div>`;
  }
  function furnitureExportPartsCsv(model){
    const escapeCsv=value=>{let v=String(value??'');if(/^[\s]*[=+@-]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';};
    const rows=[['Modelo','Pieza','Tipo','Material','X (cm)','Y (cm)','Z (cm)','Ancho (cm)','Profundidad (cm)','Alto (cm)','Unión']];
    for(const piece of model.furniture?.pieces||[])rows.push([model.name,piece.name,piece.type,furniturePieceFinish(model,piece),piece.x,piece.y,piece.z,piece.w,piece.d,piece.h,piece.join]);
    const csv='\ufeff'+rows.map(row=>row.map(escapeCsv).join(';')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;
    a.download=String(model.name||'mueble').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,55)+'_despiece.csv';
    document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function bindFurnitureCreationExtras(model,rb){
    const byId=id=>document.getElementById(id);
    const snap=byId('fbSnapStep');if(snap)snap.onchange=()=>{recordHistorySnapshot('racks');model.furniture.snap=Math.max(.1,Math.min(50,Number(snap.value)||1));saveRackModels();};
    for(const [id,key] of [['fbShowDims','showDims'],['fbShowSlots','showSlots']]){
      const inp=byId(id);if(inp)inp.onchange=()=>{model.furniture[key]=!!inp.checked;saveRackModels();renderRackFurnitureBuilder(model.id);renderRackFurniture3D(model.id);};
    }
    const getAxisConfig=axis=>({count:axis==='h'?rb.hCount:rb.vCount,mode:axis==='h'?rb.hMode:rb.vMode,values:axis==='h'?rb.hValues:rb.vValues});
    const renderValues=axis=>{
      const prefix=axis==='h'?'Horizontal':'Vertical';const host=byId('fb'+prefix+'Values');if(!host)return;
      const {count,mode,values}=getAxisConfig(axis);const f=model.furniture;
      const span=axis==='h'?(Number(model.height||200)-furnitureBaseTop(model)-f.thickness-(count-1)*f.thickness):(Number(model.width||120)-2*f.thickness-(count-1)*f.thickness);
      if(mode==='equal'){host.textContent=`${round1(Math.max(0,span)/count)} cm libres por espacio · ${count} espacio(s)`;return;}
      host.innerHTML=`<div class="fb-custom-dimensions">${Array.from({length:count},(_,i)=>`<label>Esp. ${i+1}<input type="number" min="0.1" step="0.1" data-fb-space-input="${axis}" data-i="${i}" value="${round1(Number(values[i]||Math.max(1,span/count)))}"></label>`).join('')}</div><small>Los valores se interpretan como proporciones y se normalizan al espacio disponible (${round1(Math.max(0,span))} cm).</small>`;
      host.querySelectorAll('[data-fb-space-input]').forEach(inp=>inp.onchange=()=>{const arr=axis==='h'?rb.hValues:rb.vValues;arr[Number(inp.dataset.i)]=Math.max(.1,Number(inp.value)||1);});
    };
    for(const [axis,prefix] of [['h','Horizontal'],['v','Vertical']]){
      const count=byId('fb'+prefix+'Count'),mode=byId('fb'+prefix+'Mode');
      if(count)count.onchange=()=>{rb[axis+'Count']=Math.max(1,Math.min(12,Math.round(Number(count.value)||1)));count.value=rb[axis+'Count'];renderValues(axis);};
      if(mode)mode.onchange=()=>{rb[axis+'Mode']=mode.value==='custom'?'custom':'equal';renderValues(axis);};
      renderValues(axis);
    }
    const apply=(axis)=>{
      const opt=getAxisConfig(axis),f=model.furniture;
      const t=Math.max(.3,Number(f.thickness||1.8));
      const usable=(axis==='h'?Math.min(Number(f.leftHeight||model.height),Number(f.rightHeight||model.height))-furnitureBaseTop(model)-t:Number(model.width)-2*t)-(opt.count-1)*t;
      if(usable<opt.count*.5){if(typeof showToast==='function')showToast('El volumen no admite esa cantidad de divisiones.','warning',2400);return;}
      recordHistorySnapshot('racks');
      if(axis==='h')applyConstructionHorizontalSpaces(model,opt.count,opt.mode==='equal',opt.values);
      else applyConstructionVerticalSpaces(model,byId('fbVerticalTarget')?.value||'all',opt.count,opt.mode==='equal',opt.values);
      saveRackModels();renderRackConstructionWorkspace();
    };
    byId('fbApplyHorizontal')?.addEventListener('click',()=>apply('h'));
    byId('fbApplyVertical')?.addEventListener('click',()=>apply('v'));
    byId('fbValidate')?.addEventListener('click',()=>furnitureShowValidation(model));
    byId('fbExportBom')?.addEventListener('click',()=>furnitureExportPartsCsv(model));
    byId('fbPartsList')?.querySelectorAll('[data-bom-piece]').forEach(row=>row.onclick=()=>{
      const id=row.dataset.bomPiece;model.furniture.selectedSpace=null;model.furniture.selectedPieceId=id;model.furniture.selectedPieceIds=[id];
      renderRackFurnitureBuilder(model.id);renderRackFurniture3D(model.id);
    });
  }

  function renderRackConstructionWorkspace(){
    appState.screen='rack-builder';
    contentTitle.textContent='Crear mobiliario 3D';
    contentSubtitle.textContent='Melamina o metal + madera: modelado paramétrico por piezas con vista frontal y 3D, división de espacios y colocación en el almacén.';
    detailTitle.textContent='';detailSubtitle.textContent='';
    setTags([{label:'↶ Undo',active:true,action:'history-undo-racks',extraClass:'history-chip'},{label:'↷ Redo',active:true,action:'history-redo-racks',extraClass:'history-chip'}]);
    if(!Array.isArray(appState.models))appState.models=[];
    if(!appState.models.length){createNewFurnitureModelForConstruction();return;}
    if(!appState.ui)appState.ui={};
    if(!appState.ui.rackBuilder||typeof appState.ui.rackBuilder!=='object')appState.ui.rackBuilder={shelfZ:80,dividerX:60,dividerFrom:0,dividerTo:120,snap:1};
    const rb=appState.ui.rackBuilder;
    if(!rb.v191ViewInitialized){rb.viewMode='front';rb.v191ViewInitialized=true;}
    rb.viewMode=['3d','front'].includes(rb.viewMode)?rb.viewMode:'front';
    rb.v191Panels=rb.v191Panels||{build:false,spaces:false,review:false,levels:false};
    rb.cadTool=['select','shelf','divider','back'].includes(rb.cadTool)?rb.cadTool:'select';
    rb.hCount=Math.max(1,Math.min(12,Math.round(Number(rb.hCount||3))));
    rb.vCount=Math.max(1,Math.min(12,Math.round(Number(rb.vCount||2))));
    rb.hMode=rb.hMode==='custom'?'custom':'equal';
    rb.vMode=rb.vMode==='custom'?'custom':'equal';
    rb.hValues=Array.isArray(rb.hValues)?rb.hValues:[];
    rb.vValues=Array.isArray(rb.vValues)?rb.vValues:[];
    // Abrir el constructor con un modelo editable, aunque el último seleccionado sea un rack clásico.
    const activeModel=appState.models.find(m=>m.id===appState.selectedModelId);
    if(!activeModel?.furniture?.enabled){
      appState.selectedModelId=appState.models.find(m=>m.furniture?.enabled)?.id || appState.selectedModelId || appState.models[0].id;
    }
    const model=rackModel(appState.selectedModelId);ensureRackFurnitureModel(model);const f=model.furniture;
    const enabled=!!f.enabled;const levels=enabled?deriveFurnitureLevels(model):[];const totalSlots=levels.reduce((s,l)=>s+l.slots.length,0);
    const modelOptions=appState.models.map(m=>`<option value="${escapeHtml(m.id)}" ${m.id===model.id?'selected':''}>${escapeHtml(m.name)}</option>`).join('');
    const tool=(id,icon,label)=>`<button type="button" class="rack-cad-tool ${rb.cadTool===id?'active':''}" data-rack-cad-tool="${id}" title="${label}: haz clic en el modelo para utilizar esta herramienta"><i>${icon}</i><span>${label}</span></button>`;
    contentWrap.innerHTML=`<div class="rack-cad-shell">
      <header class="rack-cad-projectbar">
        <div class="rack-cad-project-main"><select id="rackConstructionModelSelect">${modelOptions}</select><input id="rackConstructionName" value="${escapeHtml(model.name||'')}" aria-label="Nombre del rack"></div>
        <div class="rack-cad-project-meta"><span>${round1(model.width)} × ${round1(model.depth)} × ${round1(model.height)} cm</span><span>${furnitureMaterialLabel(f.material)} · ${round1(f.thickness)} cm</span><span>${levels.length} niveles · ${totalSlots} slots</span></div>
        <div class="rack-cad-project-actions"><button class="mini-btn" id="rackConstructionNew">Nuevo</button><button class="mini-btn" id="rackConstructionDuplicate">Duplicar</button><button class="mini-btn" id="rackConstructionLibrary">Biblioteca</button><button class="btn" id="rackConstructionSave">Guardar</button><button class="btn rack-builder-primary" id="rackConstructionPlace" ${enabled?'':'disabled'}>Colocar y editar en layout</button><button class="mini-btn" id="rackConstructionOpen3D" title="Abrir Diseñar espacio 3D">Ver espacio 3D</button></div>
      </header>
      <section class="fb-template-bar"><div><b>Constructor de mobiliario</b><small>Elige el sistema constructivo para generar piezas editables.</small></div><div class="fb-template-actions"><button id="fbNewMelamineShelf" class="mini-btn">+ Estante melamina</button><button id="fbNewCabinet" class="mini-btn">+ Armario melamina</button><button id="fbNewMetalWood" class="mini-btn">+ Metal + madera</button></div></section>
      ${enabled?`<div class="rack-cad-workflow" role="navigation" aria-label="Pasos de creación"><button type="button" data-fb-step="model">01 · Medidas</button><button type="button" data-fb-step="build">02 · Zócalo y fondo</button><button type="button" data-fb-step="spaces">03 · Divisiones</button><button type="button" data-fb-step="materials">04 · Acabados</button><button type="button" data-fb-step="review">05 · Revisar</button></div><div class="rack-cad-main">
        <aside class="rack-cad-toolrail" aria-label="Herramientas de construcción">
          <div class="fb-rail-title">EDICIÓN</div>
          ${tool('select','↖','Seleccionar')}
          <div class="fb-rail-title">INTERIOR</div>
          ${tool('shelf','▬','Repisa')}
          ${tool('divider','│','División')}
          <div class="fb-rail-title">ESTRUCTURA</div>
          <button type="button" class="rack-cad-tool" data-furniture-action="back" data-mid="${model.id}" title="Crear fondo completo automáticamente"><i>▤</i><span>+ Fondo</span></button>
          <button type="button" class="rack-cad-tool" id="fbAddDoor"><i>▯</i><span>Puerta</span></button>
          <button type="button" class="rack-cad-tool" id="fbAddDrawer"><i>▣</i><span>Cajón</span></button>
          <button type="button" class="rack-cad-tool" data-furniture-action="brace" data-mid="${model.id}"><i>╱</i><span>Refuerzo</span></button>
          <div class="fb-rail-title">PIEZAS</div>
          <button type="button" class="rack-cad-tool" data-furniture-action="duplicate-piece" data-mid="${model.id}"><i>⧉</i><span>Duplicar</span></button>
          <button type="button" class="rack-cad-tool" data-furniture-action="distribute-shelves" data-mid="${model.id}"><i>↕</i><span>Distribuir</span></button>
        </aside>
        <section class="rack-cad-canvas">
          <div class="rack-cad-canvas-head"><div><b>Diseño del mueble</b><span id="rackCadModeHint">${rb.cadTool==='select'?'Selecciona una pieza o un espacio interno.':rb.cadTool==='shelf'?'Haz clic dentro de un espacio para insertar una repisa a esa altura.':rb.cadTool==='divider'?'Haz clic dentro de un espacio para dividirlo verticalmente.':'El fondo se configura arriba en «② Fondo posterior».'}</span></div><div class="rack-view-switch" role="group" aria-label="Vista del modelo"><button class="${rb.viewMode==='front'?'active':''}" data-rack-view="front">Vista frontal</button><button class="${rb.viewMode==='3d'?'active':''}" data-rack-view="3d">Vista 3D</button></div></div>
          <div class="rack-cad-stage-stack">
            <div id="rackFurniture3D" class="rack-furniture-3d-stage rack-cad-3d ${rb.viewMode==='3d'?'':'is-hidden'}" data-model-id="${model.id}"></div>
            <div class="rack-cad-front ${rb.viewMode==='front'?'':'is-hidden'}"><svg id="rackBuilderFront" viewBox="0 0 820 590" preserveAspectRatio="xMidYMid meet"></svg></div>
          </div>
          <div class="rack-cad-canvas-foot"><span>Frontal: coloca y ajusta piezas</span><span>3D: arrastra para orbitar · rueda para zoom</span><button class="mini-btn" data-furniture-action="reset-3d-camera" data-mid="${model.id}">Centrar</button></div>
        </section>
        <aside class="rack-cad-inspector-col">
          <details class="fb-accordion fb-accordion-build" data-fb-panel="build" ${rb.v191Panels?.build?'open':''}>
            <summary><span><b>02 · Zócalo y fondo</b><small>Base elevada y panel posterior, sin dibujar a mano</small></span><span class="fb-chevron">⌄</span></summary>
<section class="fb-construction-quick" aria-label="Construcción básica">
        <div class="fb-quick-head"><b>Construcción básica</b><small>1. Zócalo y base elevada → 2. Fondo posterior → 3. Divisiones y repisas</small></div>
        <div class="fb-quick-columns">
          <div class="fb-quick-group"><strong>① Zócalo</strong><label class="fb-checkbox"><input id="fbPlinthEnabled" type="checkbox" ${f.plinthEnabled?'checked':''} ${furnitureIsMetalFrame(f.material)?'disabled':''}> Activar zócalo</label><label>Altura (cm)<input id="fbPlinthHeight" type="number" min="4" max="30" step="0.5" value="${round1(f.plinthHeight)}" ${!f.plinthEnabled?'disabled':''}></label><label>Retranqueo (cm)<input id="fbPlinthRecess" type="number" min="0" max="20" step="0.5" value="${round1(f.plinthRecess)}" ${!f.plinthEnabled?'disabled':''}></label><small>La base y el primer espacio útil comienzan encima del zócalo.</small></div>
          <div class="fb-quick-group"><strong>② Fondo posterior</strong><label>Aplicación<select id="fbBackMode"><option value="none" ${f.backMode==='none'?'selected':''}>Sin fondo</option><option value="full" ${f.backMode==='full'?'selected':''}>Fondo completo</option><option value="modules" ${f.backMode==='modules'?'selected':''}>Fondo por compartimento</option></select></label><label>Espesor (cm)<input id="fbBackThickness" type="number" min="0.2" max="3" step="0.1" value="${round1(f.backThickness)}"></label><label>Retranqueo posterior (cm)<input id="fbBackInset" type="number" min="0" max="12" step="0.5" value="${round1(f.backInset)}"></label><small>La opción se aplica automáticamente; no necesitas seleccionar la parte trasera.</small></div>
        </div>
      </section>
          </details>
          <section class="rack-cad-inspector-card"><div class="rack-panel-title"><div><b>Propiedades</b><span id="rackCadInspectorHint">Contexto de la selección</span></div></div><div id="rackBuilderInspector" class="rack-builder-inspector rack-3d-inspector"></div></section>
          <details open class="fb-accordion fb-accordion-model" data-fb-panel="model"><summary><span><b>01 · Dimensiones y materiales</b><small>Medidas generales del mueble seleccionado</small></span><span class="fb-chevron">⌄</span></summary><section class="rack-cad-inspector-card rack-cad-general">
            <div class="construction-grid-2"><label class="construction-field">Ancho<input type="number" min="30" step="1" data-furniture-model-field="width" data-mid="${model.id}" value="${round1(model.width)}"></label><label class="construction-field">Profundidad<input type="number" min="20" step="1" data-furniture-model-field="depth" data-mid="${model.id}" value="${round1(model.depth)}"></label><label class="construction-field">Alto<input type="number" min="60" step="1" data-furniture-model-field="height" data-mid="${model.id}" value="${round1(model.height)}"></label><label class="construction-field">Grosor<input type="number" min=".3" step=".1" data-furniture-field="thickness" data-mid="${model.id}" value="${round1(f.thickness)}"></label></div>
            <label class="construction-field">Material<select data-furniture-field="material" data-mid="${model.id}"><option value="melamine" ${f.material==='melamine'?'selected':''}>Melamina</option><option value="wood" ${f.material==='wood'?'selected':''}>Madera</option><option value="metal" ${f.material==='metal'?'selected':''}>Metal</option><option value="metal-wood" ${f.material==='metal-wood'?'selected':''}>Metal + madera</option></select></label>
            <label class="construction-field">Acabado<select data-furniture-field="finish" data-mid="${model.id}"><option value="oak" ${f.finish==='oak'?'selected':''}>Roble natural</option><option value="white" ${f.finish==='white'?'selected':''}>Blanco</option><option value="walnut" ${f.finish==='walnut'?'selected':''}>Nogal</option><option value="graphite" ${f.finish==='graphite'?'selected':''}>Grafito</option></select></label>
            <label class="construction-field">Forma superior<select data-furniture-field="roofMode" data-mid="${model.id}"><option value="flat" ${f.roofMode==='flat'?'selected':''}>Recto</option><option value="slope" ${f.roofMode==='slope'?'selected':''}>Pendiente</option></select></label>
            ${f.roofMode==='slope'?`<div class="construction-grid-2"><label class="construction-field">Altura izq.<input type="number" min="20" step="1" data-furniture-field="leftHeight" data-mid="${model.id}" value="${round1(f.leftHeight)}"></label><label class="construction-field">Altura der.<input type="number" min="20" step="1" data-furniture-field="rightHeight" data-mid="${model.id}" value="${round1(f.rightHeight)}"></label></div>`:''}
            <div class="fb-edit-options"><label class="construction-field">Snap (cm)<input id="fbSnapStep" type="number" min="0.1" max="50" step="0.1" value="${round1(f.snap)}"></label><label class="fb-checkbox"><input id="fbShowDims" type="checkbox" ${f.showDims?'checked':''}> Mostrar cotas</label><label class="fb-checkbox"><input id="fbShowSlots" type="checkbox" ${f.showSlots?'checked':''}> Mostrar ubicaciones</label></div>
          </section></details>
          <details class="fb-accordion fb-accordion-spaces" data-fb-panel="spaces" ${rb.v191Panels?.spaces?'open':''}><summary><span><b>03 · Divisiones y compartimentos</b><small>Distribución equitativa o personalizada</small></span><span class="fb-chevron">⌄</span></summary><section class="rack-cad-inspector-card fb-spaces-panel">
            <div class="rack-panel-title"><div><b>Distribución paramétrica</b><span>Divisiones iguales o con medidas personalizadas</span></div></div>
            <div class="fb-space-group"><strong>Espacios horizontales (altura)</strong><div class="fb-space-controls"><label>Cantidad<input id="fbHorizontalCount" type="number" min="1" max="12" value="${rb.hCount}"></label><label>Distribución<select id="fbHorizontalMode"><option value="equal" ${rb.hMode==='equal'?'selected':''}>Equitativa</option><option value="custom" ${rb.hMode==='custom'?'selected':''}>Personalizada</option></select></label></div><div id="fbHorizontalValues" class="fb-space-values"></div><button type="button" id="fbApplyHorizontal" class="mini-btn fb-apply-partitions">Aplicar divisiones horizontales</button></div>
            <div class="fb-space-group"><strong>Espacios verticales (ancho)</strong><div class="fb-space-controls"><label>Cantidad<input id="fbVerticalCount" type="number" min="1" max="12" value="${rb.vCount}"></label><label>Distribución<select id="fbVerticalMode"><option value="equal" ${rb.vMode==='equal'?'selected':''}>Equitativa</option><option value="custom" ${rb.vMode==='custom'?'selected':''}>Personalizada</option></select></label><label>Aplicar a<select id="fbVerticalTarget"><option value="all">Todos los niveles</option>${levels.map(l=>`<option value="${l.index}">Nivel ${l.index}</option>`).join('')}</select></label></div><div id="fbVerticalValues" class="fb-space-values"></div><button type="button" id="fbApplyVertical" class="mini-btn fb-apply-partitions">Aplicar divisiones verticales</button></div>
            <div class="fb-space-note">Las medidas son libres, descontando espesores. Al modificar el volumen se recalculan las piezas del mueble.</div>
          </section></details>
        </aside>
      </div>
      <details class="fb-accordion fb-bottom-accordion fb-accordion-review" data-fb-panel="review" ${rb.v191Panels?.review?'open':''}><summary><span><b>05 · Verificar y guardar</b><small>${(f.pieces||[]).length} piezas · comprueba el modelo antes de colocarlo</small></span><span class="fb-chevron">⌄</span></summary><section class="rack-cad-levelbar fb-bom-section"><div class="rack-cad-levelbar-head"><div><b>Comprobación del modelo</b><span>Dimensiones y colisiones; el despiece es opcional.</span></div><div class="fb-bom-actions"><button type="button" id="fbValidate" class="mini-btn">Comprobar modelo</button></div></div><div id="fbValidationResult" role="status" aria-live="polite"></div><details class="fb-parts-details"><summary>Ver lista de piezas y exportar CSV (opcional)</summary><div class="fb-bom-actions"><button type="button" id="fbExportBom" class="mini-btn">Exportar CSV</button></div><div id="fbPartsList" class="fb-parts-list">${furniturePartsTable(model)}</div></details></section></details>
      <details class="fb-accordion fb-bottom-accordion fb-accordion-levels" data-fb-panel="levels" ${rb.v191Panels?.levels?'open':''}><summary><span><b>Niveles y ubicaciones</b><small>Capacidad y repisas distribuidas</small></span><span class="fb-chevron">⌄</span></summary><section class="rack-cad-levelbar"><div class="rack-cad-levelbar-head"><div><b>Niveles / espacios</b><span>Se derivan automáticamente de las repisas y divisiones.</span></div><button class="mini-btn" id="rackCadAutoLevels">Distribuir repisas uniformemente</button></div><div id="rackBuilderLevels" class="rack-builder-levels rack-cad-levels"></div></section></details>`:`<div class="rack-assistant-convert"><div><b>Este modelo usa el generador clásico.</b><span>Modelos de rack permanece intacto. Crea una copia editable para usar Visual Furniture CAD.</span></div><button class="btn" data-furniture-action="convert" data-mid="${model.id}">Preparar copia editable</button></div>`}
    </div>`;
    document.getElementById('rackConstructionModelSelect')?.addEventListener('change',e=>{appState.selectedModelId=e.target.value;disposeRackFurniture3DEngine();renderRackConstructionWorkspace();});
    document.getElementById('rackConstructionName')?.addEventListener('change',e=>{const name=String(e.target.value||'').trim()||'Rack sin nombre';if(model.name===name)return;recordHistorySnapshot('racks');model.name=name;saveRackModels();});
    document.getElementById('rackConstructionNew')?.addEventListener('click',createNewFurnitureModelForConstruction);
    document.getElementById('rackConstructionDuplicate')?.addEventListener('click',duplicateFurnitureModelForConstruction);
    document.getElementById('rackConstructionLibrary')?.addEventListener('click',()=>setScreen('racks'));
    document.getElementById('rackConstructionSave')?.addEventListener('click',saveFurnitureConstructionModel);
    document.getElementById('rackConstructionPlace')?.addEventListener('click',()=>placeFurnitureModelInLayout(model));
    document.getElementById('rackConstructionOpen3D')?.addEventListener('click',()=>setScreen('virtual'));
    bindFurnitureCreationExtras(model,rb);
    // V191: el panel derecho conserva la apertura entre ediciones y Undo/Redo.
    document.querySelectorAll('.fb-accordion[data-fb-panel]').forEach(panel=>panel.addEventListener('toggle',()=>{
      if(panel.dataset.fbPanel==='model')return;
      rb.v191Panels[panel.dataset.fbPanel]=panel.open;
    }));
    const openStep=(step)=>{
      const target=step==='build'?'.fb-accordion-build':step==='spaces'?'.fb-accordion-spaces':step==='review'?'.fb-accordion-review':'.fb-accordion-model';
      const el=document.querySelector(target);
      if(!el)return;
      if(el.tagName==='DETAILS'&&!el.open)el.open=true;
      requestAnimationFrame(()=>{el.scrollIntoView({behavior:'smooth',block:'nearest',inline:'nearest'});});
      document.querySelectorAll('[data-fb-step]').forEach(btn=>btn.classList.toggle('active',btn.dataset.fbStep===step));
      if(step==='materials')document.querySelector('[data-furniture-field="finish"]')?.focus({preventScroll:true});
    };
    document.querySelectorAll('[data-fb-step]').forEach(btn=>btn.addEventListener('click',()=>openStep(btn.dataset.fbStep)));
    document.getElementById('fbNewMelamineShelf')?.addEventListener('click',()=>createFurnitureTemplate('melamine-shelf'));
    document.getElementById('fbNewCabinet')?.addEventListener('click',()=>createFurnitureTemplate('melamine-cabinet'));
    document.getElementById('fbNewMetalWood')?.addEventListener('click',()=>createFurnitureTemplate('metal-wood'));
    // Opciones sencillas con una sola operación por cada cambio (Undo/Redo fiable).
    const applyConstructionParam=(key,value)=>{
      const m=rackModel(appState.selectedModelId);if(!m)return;
      ensureRackFurnitureModel(m);
      if(m.furniture[key]===value)return;
      recordHistorySnapshot('racks');
      m.furniture[key]=value;
      if(key.startsWith('plinth'))furnitureSetPlinth(m,m.furniture.plinthEnabled);
      else {furnitureSyncBackPanels(m);furnitureRefitModel(m);syncFurnitureModelToLegacy(m);}
      saveRackModels();renderRackConstructionWorkspace();
    };
    for(const [id,key,lo,hi] of [['fbPlinthHeight','plinthHeight',4,30],['fbPlinthRecess','plinthRecess',0,20],['fbBackThickness','backThickness',.2,3],['fbBackInset','backInset',0,12]]){
      const el=document.getElementById(id);
      if(el)el.onchange=()=>applyConstructionParam(key,Math.max(lo,Math.min(hi,Number(el.value)||lo)));
    }
    const plinthToggle=document.getElementById('fbPlinthEnabled');if(plinthToggle)plinthToggle.onchange=()=>applyConstructionParam('plinthEnabled',plinthToggle.checked);
    const backChoice=document.getElementById('fbBackMode');if(backChoice)backChoice.onchange=()=>applyConstructionParam('backMode',['none','full','modules'].includes(backChoice.value)?backChoice.value:'none');
    // Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z sólo en el lienzo, no dentro de un input.
    if(!appState.ui.fbUndoKeysBound){
      appState.ui.fbUndoKeysBound=true;
      document.addEventListener('keydown',ev=>{
        if(appState.screen!=='rack-builder'||!(ev.ctrlKey||ev.metaKey))return;
        const focus=ev.target;
        if(focus?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(focus?.tagName))return;
        const key=String(ev.key||'').toLowerCase();
        if(key==='z'||key==='y'){
          ev.preventDefault();
          if(key==='y'||ev.shiftKey)redoHistory('racks');else undoHistory('racks');
        }
      });
    }
    const undoBuilder=document.querySelector('[data-history-undo="racks"]');
    if(undoBuilder)undoBuilder.onclick=()=>undoHistory('racks');
    const redoBuilder=document.querySelector('[data-history-redo="racks"]');
    if(redoBuilder)redoBuilder.onclick=()=>redoHistory('racks');
    document.getElementById('fbAddDoor')?.addEventListener('click',()=>{recordHistorySnapshot('racks');addFurnitureFrontPiece(model,'door');});
    document.getElementById('fbAddDrawer')?.addEventListener('click',()=>{recordHistorySnapshot('racks');addFurnitureFrontPiece(model,'drawer');});
    $$('[data-rack-cad-tool]').forEach(btn=>btn.onclick=()=>{rb.cadTool=btn.getAttribute('data-rack-cad-tool')||'select';$$('[data-rack-cad-tool]').forEach(x=>x.classList.toggle('active',x.getAttribute('data-rack-cad-tool')===rb.cadTool));const hint=document.getElementById('rackCadModeHint');if(hint)hint.textContent=rb.cadTool==='select'?'Selecciona una pieza o un espacio interno.':rb.cadTool==='shelf'?'Haz clic dentro de un espacio para insertar una repisa a esa altura.':rb.cadTool==='divider'?'Haz clic dentro de un espacio para dividirlo verticalmente.':'El fondo se configura arriba en «② Fondo posterior».';});
    $$('[data-rack-view]').forEach(btn=>btn.onclick=()=>{rb.viewMode=btn.getAttribute('data-rack-view')||'3d';$$('[data-rack-view]').forEach(x=>x.classList.toggle('active',x.getAttribute('data-rack-view')===rb.viewMode));document.getElementById('rackFurniture3D')?.classList.toggle('is-hidden',rb.viewMode!=='3d');document.querySelector('.rack-cad-front')?.classList.toggle('is-hidden',rb.viewMode!=='front');if(rb.viewMode==='3d')renderRackFurniture3D(model.id);});
    document.getElementById('rackCadAutoLevels')?.addEventListener('click',()=>{recordHistorySnapshot('racks');furnitureDistributeShelves(model);syncFurnitureModelToLegacy(model);saveRackModels();renderRackConstructionWorkspace();});
    bindRackFurnitureBuilder(model.id);
    if(enabled){
      if(document.getElementById('rackBuilderFront')) renderRackFurnitureBuilder(model.id);
      refreshRackConstructionPanels(model);
      if(rb.viewMode==='3d')renderRackFurniture3D(model.id);
    }
    updateUndoRedoUi();contentStatus.textContent='Modo activo: VISUAL FURNITURE CAD • modela directamente sobre el mueble.';contentFootRight.textContent=`${appState.models.length} modelos`;
  }

  function refreshRackConstructionPanels(model){
    if(!isRackConstructionScreen()||!model?.furniture?.enabled)return;
    const inspector=document.getElementById('rackBuilderInspector');if(inspector)renderFurnitureInspector(model,inspector);
    const levels=document.getElementById('rackBuilderLevels');if(levels)renderFurnitureLevels(model,levels);
  }

  function furnitureGetSelectedSpace(model){
    ensureRackFurnitureModel(model);const sel=model.furniture.selectedSpace;if(!sel)return null;const level=deriveFurnitureLevels(model).find(l=>l.index===Number(sel.levelIndex));const slot=level?.slots?.find(s=>s.index===Number(sel.slotIndex));return level&&slot?{level,slot}:null;
  }

  function furnitureDivideSpaceVertical(model,levelIndex,slotIndex,count=2){
    ensureRackFurnitureModel(model);furnitureRefitModel(model);const f=model.furniture,t=Math.max(.3,Number(f.thickness||1.8)),D=Number(model.depth||40);const level=deriveFurnitureLevels(model).find(l=>l.index===Number(levelIndex));const slot=level?.slots?.find(s=>s.index===Number(slotIndex));if(!level||!slot)return false;const n=Math.max(2,Math.min(8,Number(count||2)));recordHistorySnapshot('racks');for(let i=1;i<n;i++){const cx=slot.x0+(slot.x1-slot.x0)*i/n;const d=furnitureMakePiece('divider',{name:`División N${level.index}`,x:cx-t/2,y:0,z:level.z0,w:t,d:D,h:level.height,join:f.material==='metal'?'slot':'between'});constrainConstructionDivider(model,d);f.pieces.push(d);}f.selectedSpace=null;furnitureRefitModel(model);syncFurnitureModelToLegacy(model);saveRackModels();return true;
  }

  function furnitureSplitLevelHorizontal(model,levelIndex,z=null){
    ensureRackFurnitureModel(model);furnitureRefitModel(model);const f=model.furniture,t=Math.max(.3,Number(f.thickness||1.8)),W=Number(model.width||120),D=Number(model.depth||40);const level=deriveFurnitureLevels(model).find(l=>l.index===Number(levelIndex));if(!level)return false;let target=Number.isFinite(Number(z))?Number(z):(level.z0+level.z1)/2;target=Math.max(level.z0+Math.max(4,t),Math.min(level.z1-Math.max(4,t),target));if(level.z1-level.z0<Math.max(12,t*3))return false;recordHistorySnapshot('racks');const shelf=furnitureMakePiece('shelf',{name:`Repisa ${f.pieces.filter(x=>x.type==='shelf').length+1}`,x:t,y:0,z:target,w:Math.max(1,W-2*t),d:D,h:t,join:f.material==='metal'?'bolted':'between',autoFit:'shelf'});f.pieces.push(shelf);resolveConstructionShelfCollisions(model,shelf.id);f.selectedSpace=null;furnitureRefitModel(model);syncFurnitureModelToLegacy(model);saveRackModels();return true;
  }


  function bindRackConstructionComponentLibrary(model){
    if(!model?.furniture?.enabled)return;const f=model.furniture,host=document.getElementById('rackFurniture3D'),overlay=document.getElementById('rackConstructionDropOverlay');
    const add=(type,ev=null)=>{recordHistorySnapshot('racks');if(type==='carcass')furnitureCreateCarcass(model,{keepCustom:true});else if(type==='shelf'){if(ev&&host){const r=host.getBoundingClientRect(),roof=f.roofMode==='slope'?Math.min(Number(f.leftHeight||model.height),Number(f.rightHeight||model.height)):Number(model.height||200);appState.ui.rackBuilder.shelfZ=Math.max(f.thickness,Math.min(roof-f.thickness*2,(1-(ev.clientY-r.top)/Math.max(1,r.height))*roof));}furnitureAddShelf(model);}else if(type==='divider'){if(ev&&host){const r=host.getBoundingClientRect(),W=Number(model.width||120),H=Number(model.height||200),px=Math.max(0,Math.min(1,(ev.clientX-r.left)/Math.max(1,r.width))),pz=Math.max(0,Math.min(1,1-(ev.clientY-r.top)/Math.max(1,r.height))),z=pz*H;appState.ui.rackBuilder.dividerX=px*W;const level=deriveFurnitureLevels(model).find(l=>z>=l.z0&&z<=l.z1)||deriveFurnitureLevels(model)[0];if(level){appState.ui.rackBuilder.dividerFrom=level.z0;appState.ui.rackBuilder.dividerTo=level.z1;}}furnitureAddDivider(model);}else if(type==='back')furnitureAddBack(model);else if(type==='brace')furnitureAddBrace(model);syncFurnitureModelToLegacy(model);saveRackModels();renderRackConstructionWorkspace();};
    $$('[data-construction-piece]').forEach(btn=>{const type=btn.getAttribute('data-construction-piece');btn.onclick=()=>add(type);btn.ondragstart=ev=>{ev.dataTransfer?.setData('text/rack-piece',type);if(overlay)overlay.classList.add('armed');};btn.ondragend=()=>overlay?.classList.remove('armed');});
    if(host){host.ondragover=ev=>{ev.preventDefault();overlay?.classList.add('show');};host.ondragleave=()=>overlay?.classList.remove('show');host.ondrop=ev=>{ev.preventDefault();overlay?.classList.remove('show','armed');const type=ev.dataTransfer?.getData('text/rack-piece');if(type)add(type,ev);};}
  }


  function renderRackFurnitureBuilderMarkup(model){
    ensureRackFurnitureModel(model); const f=model.furniture||{};
    if(!f.enabled){return `<section class="rack-block rack-builder-pro"><div class="rack-block-head"><div><h3>Motor 3D de mueble</h3><div class="rack-block-sub">Convierte este modelo para editarlo directamente en 3D.</div></div><span class="tag">3D Furniture Engine</span></div><div class="rack-builder-empty"><b>Este modelo aún usa el generador clásico.</b><span>La conversión mantiene dimensiones, niveles y slots.</span><button class="btn" data-furniture-action="convert" data-mid="${model.id}">Abrir en motor 3D</button></div></section>`;}
    const material=furnitureMaterialLabel(f.material),pieceCount=(f.pieces||[]).length,levels=deriveFurnitureLevels(model);
    return `<section class="rack-block rack-builder-pro rack-3d-engine" data-furniture-model="${model.id}">
      <div class="rack-block-head"><div><h3>Editor 3D del mueble</h3><div class="rack-block-sub">Selecciona una pieza en el 3D y edítala desde el inspector. Repisas y divisiones también se pueden arrastrar directamente.</div></div><div class="tag-row"><span class="tag">${material}</span><span class="tag">${pieceCount} piezas</span><span class="tag">${levels.length} niveles</span></div></div>
      <div class="rack-3d-compact-bar">
        <label>Material<select data-furniture-field="material" data-mid="${model.id}"><option value="melamine" ${f.material==='melamine'?'selected':''}>Melamina</option><option value="wood" ${f.material==='wood'?'selected':''}>Madera</option><option value="metal" ${f.material==='metal'?'selected':''}>Metal</option></select></label>
        <label>Grosor / perfil (cm)<input type="number" min="0.3" step="0.1" data-furniture-field="thickness" data-mid="${model.id}" value="${Number(f.thickness||1.8)}"></label>
        <label>Forma superior<select data-furniture-field="roofMode" data-mid="${model.id}"><option value="flat" ${f.roofMode==='flat'?'selected':''}>Una sola altura</option><option value="slope" ${f.roofMode==='slope'?'selected':''}>Con pendiente</option></select></label>
        <label>Altura izq. (cm)<input type="number" min="20" step="1" data-furniture-field="leftHeight" data-mid="${model.id}" value="${round1(f.leftHeight)}"></label>
        <label>Altura der. (cm)<input type="number" min="20" step="1" data-furniture-field="rightHeight" data-mid="${model.id}" value="${round1(f.rightHeight)}" ${f.roofMode==='flat'?'disabled':''}></label>
      </div>
      <div class="rack-builder-toolbar rack-3d-toolbar">
        <button class="mini-btn" data-furniture-action="carcass" data-mid="${model.id}">Rehacer estructura</button>
        <button class="mini-btn rack-builder-primary" data-furniture-action="shelf" data-mid="${model.id}">+ Repisa</button>
        <button class="mini-btn" data-furniture-action="divider" data-mid="${model.id}">+ División</button>
        <button class="mini-btn" data-furniture-action="back" data-mid="${model.id}">+ Fondo</button>
        <button class="mini-btn" data-furniture-action="duplicate-piece" data-mid="${model.id}">Duplicar selección</button>
        <button class="mini-btn" data-furniture-action="distribute-shelves" data-mid="${model.id}">Distribuir repisas</button>
        <button class="mini-btn" data-furniture-action="reset-3d-camera" data-mid="${model.id}">Centrar cámara</button>
      </div>
      <div class="rack-3d-workspace">
        <div class="rack-3d-stage-wrap">
          <div class="rack-builder-view-head"><b>Construcción 3D</b><span>Clic selecciona · arrastra repisa/división · arrastra fondo para orbitar · rueda para zoom</span></div>
          <div id="rackFurniture3D" class="rack-furniture-3d-stage" data-model-id="${model.id}"></div>
          <div class="rack-3d-stage-hint">Ctrl/Cmd + clic selecciona varias repisas para distribuirlas uniformemente.</div>
        </div>
        <aside id="rackBuilderInspector" class="rack-builder-inspector rack-3d-inspector"></aside>
      </div>
      <details class="rack-technical-view"><summary>Vista frontal técnica y cotas</summary><div class="rack-builder-front-wrap"><svg id="rackBuilderFront" viewBox="0 0 820 590" preserveAspectRatio="xMidYMid meet"></svg></div></details>
      <div id="rackBuilderLevels" class="rack-builder-levels"></div>
    </section>`;
  }

  function bindIntegratedRackBuilder(modelId){
    const model=rackModel(modelId);
    if(!model) return;
    bindRackFurnitureBuilder(model.id);
    if(document.getElementById('rackBuilderFront')) renderRackFurnitureBuilder(model.id);
  }

  function refreshRackFurnitureBuilderHost(modelId){
    const host=document.getElementById('rackBuilderHost'),model=rackModel(modelId);if(!host||!model)return;ensureRackFurnitureModel(model);host.innerHTML=renderRackFurnitureBuilderMarkup(model);bindRackFurnitureBuilder(model.id);renderRackFurnitureBuilder(model.id);
  }

  function bindRackFurnitureBuilder(modelId){
    const model=rackModel(modelId); if(!model)return; ensureRackFurnitureModel(model);
    $$('[data-furniture-action]').forEach(btn=>{btn.onclick=e=>{e.preventDefault();e.stopPropagation();const id=btn.getAttribute('data-mid')||modelId,m=rackModel(id);if(!m)return;ensureRackFurnitureModel(m);const a=btn.getAttribute('data-furniture-action');if(a==='reset-3d-camera'){resetRackFurniture3DCamera(m.id);return;}recordHistorySnapshot('racks');
      if(a==='convert')convertLegacyModelToFurniture(m);
      else if(a==='carcass')furnitureCreateCarcass(m,{keepCustom:true});
      else if(a==='build-from-levels')furnitureGenerateFromModelSetup(m);
      else if(a==='shelf')furnitureAddShelf(m);
      else if(a==='divider')furnitureAddDivider(m);
      else if(a==='back')furnitureAddBack(m);
      else if(a==='brace')furnitureAddBrace(m);
      else if(a==='duplicate-piece')furnitureDuplicateSelectedPiece(m);
      else if(a==='distribute-shelves')furnitureDistributeShelves(m);
      else if(a==='sync-instances')furnitureSyncInstances(m);
      else if(a==='clear'){m.furniture.pieces=[];m.furniture.selectedPieceId='';m.furniture.selectedPieceIds=[];m.furniture.logicalSlots={};}
      syncFurnitureModelToLegacy(m);saveRackModels();if(isRackConstructionScreen())renderRackConstructionWorkspace();else rerenderRackEditorPreservingState({focusId:id});};});
    $$('[data-furniture-field]').forEach(el=>{const apply=()=>{const m=rackModel(el.getAttribute('data-mid'));if(!m)return;ensureRackFurnitureModel(m);const field=el.getAttribute('data-furniture-field');recordHistorySnapshot('racks');if(field==='material'){const oldMaterial=m.furniture.material;m.furniture.material=el.value;if(furnitureIsMetalFrame(el.value))m.furniture.plinthEnabled=false;m.style=furnitureMaterialStyle(el.value);if(furnitureIsMetalFrame(el.value)&&Number(m.furniture.thickness)<2)m.furniture.thickness=4;if(furnitureIsMetalFrame(oldMaterial)!==furnitureIsMetalFrame(el.value)) furnitureCreateCarcass(m,{keepCustom:true});}else if(field==='finish'){m.furniture.finish=el.value;}else if(field==='roofMode'){m.furniture.roofMode=el.value==='slope'?'slope':'flat';if(m.furniture.roofMode==='flat')m.furniture.rightHeight=m.furniture.leftHeight;}else if(field==='leftHeight'||field==='rightHeight'){m.furniture[field]=Math.max(20,Number(el.value||m.height||200));if(m.furniture.roofMode==='flat')m.furniture.leftHeight=m.furniture.rightHeight=m.furniture[field];m.height=Math.max(60,m.furniture.leftHeight,m.furniture.rightHeight);}else m.furniture[field]=Math.max(field==='snap'?.1:.2,Number(el.value||1));if(field==='thickness')furnitureCreateCarcass(m,{keepCustom:true});furnitureRefitModel(m);syncFurnitureModelToLegacy(m);saveRackModels();renderRackFurnitureBuilder(m.id);renderRackFurniture3D(m.id);renderRackModelPreview();};el.onchange=apply;});
    $$('[data-furniture-model-field]').forEach(el=>{const apply=()=>{const m=rackModel(el.getAttribute('data-mid'));if(!m)return;const field=el.getAttribute('data-furniture-model-field'),value=Math.max(field==='height'?60:field==='depth'?20:30,Number(el.value||m[field]||100));if(Math.abs(Number(m[field]||0)-value)<.0001)return;recordHistorySnapshot('racks');resizeFurnitureIntoVolume(m,field,value);saveRackModels();renderRackFurnitureBuilder(m.id);renderRackFurniture3D(m.id);renderRackModelPreview();};el.onchange=apply;});
    [['rackBuilderShelfZ','shelfZ'],['rackBuilderDividerX','dividerX'],['rackBuilderDividerFrom','dividerFrom'],['rackBuilderDividerTo','dividerTo']].forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.oninput=()=>{appState.ui.rackBuilder[key]=Number(el.value||0);};});
  }

  function furnitureGenerateFromModelSetup(model){
    ensureRackFurnitureModel(model);
    const f=model.furniture;
    f.enabled=true;
    f.material=normalizeRackStyle(model.style)==='metallic'?'metal':(normalizeRackStyle(model.style)==='wood'?'wood':normalizeRackStyle(model.style)==='melamine'?'melamine':f.material||'melamine');
    const count=Math.max(1,Math.min(12,Number(model.levels||1)||1));
    const slots=Math.max(1,Math.min(12,Number(model.slots||1)||1));
    furnitureCreateCarcass(model,{keepCustom:false});
    const H=Number(model.height||200), t=Math.max(.3,Number(f.thickness||1.8));
    const innerBottom=furnitureBaseTop(model);
    const innerTop=Math.max(innerBottom+1,H-t);
    const usable=Math.max(1,innerTop-innerBottom);
    for(let i=1;i<count;i++){
      const z=innerBottom+usable*i/count;
      f.pieces.push(furnitureMakePiece('shelf',{name:`Repisa ${i}`,x:t,y:0,z,w:Math.max(1,Number(model.width||120)-2*t),d:Number(model.depth||40),h:t,join:f.material==='metal'?'bolted':'between',autoFit:'shelf'}));
    }
    furnitureRefitModel(model);
    const levels=deriveFurnitureLevels(model);
    f.logicalSlots={};
    levels.forEach(l=>{f.logicalSlots[l.index]=slots;});
    syncFurnitureModelToLegacy(model);
    return model;
  }

  function furnitureSyncInstances(model){ if(!model)return;v222SynchronizeModels();saveRackModels();showToast('Instancias vinculadas actualizadas; las medidas particulares se conservan.','success',2400); }


  function furnitureAddShelf(model){ensureRackFurnitureModel(model);const f=model.furniture;f.enabled=true;const t=f.thickness,W=Number(model.width||120),D=Number(model.depth||40),H=Number(model.height||200),z=Math.max(furnitureBaseTop(model),Math.min(H-t*2,Number(appState.ui?.rackBuilder?.shelfZ||H/2)));const p=furnitureMakePiece('shelf',{name:`Repisa ${(f.pieces.filter(x=>x.type==='shelf').length+1)}`,x:t,y:0,z,w:Math.max(1,W-2*t),d:D,h:t,join:'between',autoFit:'shelf'});f.pieces.push(p);f.selectedPieceId=p.id;}
  function furnitureAddDivider(model){ensureRackFurnitureModel(model);const f=model.furniture;f.enabled=true;const t=f.thickness,W=Number(model.width||120),D=Number(model.depth||40),H=Number(model.height||200);let x=Math.max(t,Math.min(W-t*2,Number(appState.ui?.rackBuilder?.dividerX||W/2))),z0=Math.max(0,Math.min(H-4,Number(appState.ui?.rackBuilder?.dividerFrom||0))),z1=Math.max(z0+4,Math.min(H,Number(appState.ui?.rackBuilder?.dividerTo||H)));const p=furnitureMakePiece('divider',{name:`División ${(f.pieces.filter(x=>x.type==='divider').length+1)}`,x:x-t/2,y:0,z:z0,w:t,d:D,h:z1-z0,join:'between'});if(isRackConstructionScreen())constrainConstructionDivider(model,p);f.pieces.push(p);f.selectedPieceId=p.id;}
  function furnitureAddBack(model){ensureRackFurnitureModel(model);const f=model.furniture;f.enabled=true;f.backMode='full';furnitureSyncBackPanels(model);f.selectedPieceId=f.pieces.find(p=>p.type==='back')?.id||'';}
  function furnitureAddBrace(model){ensureRackFurnitureModel(model);const f=model.furniture;f.enabled=true;const p=furnitureMakePiece('brace',{name:`Refuerzo ${(f.pieces.filter(x=>x.type==='brace').length+1)}`,x:Number(model.width||120)*.15,y:0,z:Number(model.height||200)*.15,w:Number(model.width||120)*.7,d:Math.max(1,f.thickness),h:Math.max(1,f.thickness),join:'bolted',x2:Number(model.width||120)*.85,z2:Number(model.height||200)*.85});f.pieces.push(p);f.selectedPieceId=p.id;}
  function furnitureDuplicateSelectedPiece(model){ensureRackFurnitureModel(model);const f=model.furniture,p=f.pieces.find(x=>x.id===f.selectedPieceId);if(!p)return;const cp={...clone(p),id:furnitureId(p.type),name:`${p.name} copia`,x:Number(p.x||0)+Math.max(2,f.snap*2),z:Number(p.z||0)+Math.max(2,f.snap*2),carcass:false,autoFit:p.type==='shelf'?'shelf':''};f.pieces.push(cp);f.selectedPieceId=cp.id;furnitureRefitModel(model);}
  function furnitureDistributeShelves(model){ensureRackFurnitureModel(model);const f=model.furniture,shelves=f.pieces.filter(p=>p.type==='shelf').sort((a,b)=>a.z-b.z),t=f.thickness,H=f.roofMode==='slope'?Math.min(Number(f.leftHeight||model.height||200),Number(f.rightHeight||model.height||200)):Number(model.height||200);if(!shelves.length)return;const low=furnitureBaseTop(model),each=Math.max(1,(H-t-low)/(shelves.length+1));shelves.forEach((p,i)=>{p.z=Math.min(furnitureShelfMaxZ(model,p),Math.round((low+each*(i+1))*10)/10);p.autoFit='shelf';});}

  function furnitureSnapValue(value,candidates,snap){let best=value,bestD=Math.max(.1,snap*1.75);for(const c of candidates){const d=Math.abs(value-c);if(d<bestD){best=c;bestD=d;}}return Math.round(best/snap)*snap;}
  function furnitureSnapPiece(model,piece,next){const f=model.furniture,snap=Math.max(.1,Number(f.snap||1)),xs=[0,Number(model.width||120)/2,Number(model.width||120)],zs=[0,Number(model.height||200)/2,Number(model.height||200)];f.pieces.forEach(p=>{if(p.id===piece.id)return;xs.push(Number(p.x||0),Number(p.x||0)+Number(p.w||0),Number(p.x||0)+Number(p.w||0)/2);zs.push(Number(p.z||0),Number(p.z||0)+Number(p.h||0),Number(p.z||0)+Number(p.h||0)/2);});return {x:furnitureSnapValue(next.x,xs,snap),z:furnitureSnapValue(next.z,zs,snap)};}

  function renderRackFurnitureBuilder(modelId){
    const model=rackModel(modelId);const svg=$('#rackBuilderFront'),inspector=$('#rackBuilderInspector'),levelsMount=$('#rackBuilderLevels');if(!model||!inspector||!levelsMount)return;ensureRackFurnitureModel(model);if(!model.furniture.enabled)return;if(!svg){renderFurnitureInspector(model,inspector);renderFurnitureLevels(model,levelsMount);return;}furnitureRefitModel(model);const f=model.furniture,W=Number(model.width||120),H=Number(model.height||200),margin=64,availW=690,availH=450,scale=Math.min(availW/W,availH/H),ox=65+(availW-W*scale)/2,oy=40+(availH-H*scale)/2;svg.innerHTML='';
    const bg=svgEl('rect',{x:ox,y:oy,width:W*scale,height:H*scale,rx:3,fill:'rgba(8,21,32,.52)',stroke:'rgba(125,166,196,.32)','stroke-width':'1.2','stroke-dasharray':'6 5'});svg.appendChild(bg);
    for(let gx=0;gx<=W;gx+=10){const x=ox+gx*scale;svg.appendChild(svgEl('line',{x1:x,y1:oy,x2:x,y2:oy+H*scale,stroke:'rgba(255,255,255,.035)','stroke-width':.8}));}for(let gz=0;gz<=H;gz+=10){const y=oy+(H-gz)*scale;svg.appendChild(svgEl('line',{x1:ox,y1:y,x2:ox+W*scale,y2:y,stroke:'rgba(255,255,255,.035)','stroke-width':.8}));}
    if(f.showDims) renderFurnitureSpanDimensions(svg,model,scale,ox,oy,H);
    const pieces=[...f.pieces].sort((a,b)=>(a.type==='back'?-10:0)-(b.type==='back'?-10:0));
    pieces.forEach(p=>{const selected=p.id===f.selectedPieceId;if(p.type==='brace'){const x1=ox+Number(p.x||0)*scale,y1=oy+(H-Number(p.z||0))*scale,x2=ox+Number(p.x2||p.x+p.w||0)*scale,y2=oy+(H-Number(p.z2||p.z+p.h||0))*scale;const line=svgEl('line',{x1,y1,x2,y2,class:`rack-builder-piece brace ${selected?'selected':''}`,'data-furniture-piece':p.id,'stroke-width':Math.max(3,Number(p.d||2)*scale)});svg.appendChild(line);return;}const x=ox+Number(p.x||0)*scale,y=oy+(H-(Number(p.z||0)+Number(p.h||0)))*scale,w=Math.max(2,Number(p.w||1)*scale),h=Math.max(2,Number(p.h||1)*scale);const rect=svgEl('rect',{x,y,width:w,height:h,rx:Math.min(3,h/4),class:`rack-builder-piece type-${p.type} material-${f.material} ${selected?'selected':''}`,'data-furniture-piece':p.id});svg.appendChild(rect);});
    const levelDefs=deriveFurnitureLevels(model); if(f.showSlots){levelDefs.forEach(l=>{l.slots.forEach(slot=>{const x=ox+slot.x0*scale,y=oy+(H-l.z1)*scale,w=(slot.x1-slot.x0)*scale,h=(l.z1-l.z0)*scale;const r=svgEl('rect',{x,y,width:w,height:h,class:'rack-builder-slot','pointer-events':'none'});svg.appendChild(r);const tx=svgEl('text',{x:x+w/2,y:y+h/2,class:'rack-builder-slot-label','text-anchor':'middle','dominant-baseline':'middle','pointer-events':'none'});tx.textContent=`N${l.index}-${slot.code}`;svg.appendChild(tx);});});}
    if(f.showDims){const wt=svgEl('text',{x:ox+W*scale/2,y:oy+H*scale+34,class:'rack-builder-dim','text-anchor':'middle'});wt.textContent=`${Math.round(W*10)/10} cm`;svg.appendChild(wt);const ht=svgEl('text',{x:ox-32,y:oy+H*scale/2,class:'rack-builder-dim',transform:`rotate(-90 ${ox-32} ${oy+H*scale/2})`,'text-anchor':'middle'});ht.textContent=`${Math.round(H*10)/10} cm`;svg.appendChild(ht);renderFurnitureSelectedGuides(svg,model,scale,ox,oy,H);}
    $$('[data-furniture-piece]',svg).forEach(el=>{el.addEventListener('pointerdown',evt=>furnitureBeginPieceDrag(evt,model,el,scale,ox,oy,H));el.addEventListener('click',evt=>{evt.stopPropagation();f.selectedPieceId=el.getAttribute('data-furniture-piece');f.selectedPieceIds=[f.selectedPieceId];renderRackFurnitureBuilder(model.id);});});svg.onclick=()=>{f.selectedPieceId='';f.selectedPieceIds=[];renderRackFurnitureBuilder(model.id);};
    renderFurnitureInspector(model,inspector);renderFurnitureLevels(model,levelsMount);syncFurnitureModelToLegacy(model);renderRackFurniture3D(model.id);
  }

  function furnitureDimensionLine(svg,{x1,y1,x2,y2,label,labelX,labelY,rotate=0,accent=false}){
    svg.appendChild(svgEl('line',{x1,y1,x2,y2,stroke:accent?'rgba(118,235,196,.95)':'rgba(240,183,70,.72)','stroke-width':accent?1.8:1.2,'stroke-dasharray':accent?'':'4 4','pointer-events':'none'}));
    const tx=svgEl('text',{x:labelX,y:labelY,class:'rack-builder-dim','text-anchor':'middle','dominant-baseline':'middle','pointer-events':'none'});
    if(rotate) tx.setAttribute('transform',`rotate(${rotate} ${labelX} ${labelY})`);
    tx.textContent=label;
    svg.appendChild(tx);
  }

  function renderFurnitureSpanDimensions(svg,model,scale,ox,oy,H){
    const levels=deriveFurnitureLevels(model); if(!levels.length) return;
    const dimX=ox-54;
    levels.forEach((level,idx)=>{
      const y1=oy+(H-level.z1)*scale, y2=oy+(H-level.z0)*scale, mid=(y1+y2)/2;
      svg.appendChild(svgEl('line',{x1:dimX+16,y1:y1,x2:dimX+16,y2:y2,stroke:'rgba(240,183,70,.55)','stroke-width':1,'pointer-events':'none'}));
      svg.appendChild(svgEl('line',{x1:dimX+10,y1:y1,x2:ox-6,y2:y1,stroke:'rgba(240,183,70,.35)','stroke-width':1,'pointer-events':'none'}));
      svg.appendChild(svgEl('line',{x1:dimX+10,y1:y2,x2:ox-6,y2:y2,stroke:'rgba(240,183,70,.35)','stroke-width':1,'pointer-events':'none'}));
      const label=idx===0?`Base útil → Repisa 1: ${round1(level.height)} cm`:`Repisa ${idx} → Repisa ${idx+1}: ${round1(level.height)} cm`;
      furnitureDimensionLine(svg,{x1:dimX,y1:y1,x2:dimX,y2:y2,label,labelX:dimX-6,labelY:mid,rotate:-90});
    });
  }

  function furnitureNeighborBounds(model,piece){
    const f=model.furniture, H=Number(model.height||200), t=Math.max(.3,Number(f.thickness||1.8));
    if(piece.type==='shelf'){
      const shelves=f.pieces.filter(p=>['base','shelf','top'].includes(p.type)&&p.id!==piece.id).map(p=>({id:p.id,type:p.type,z:Number(p.z||0),top:Number(p.z||0)+Number(p.h||0)})).sort((a,b)=>a.z-b.z);
      let lower={label:'Base', top:0, z:0}, upper={label:'Tapa', z:H, top:H};
      shelves.forEach(s=>{if(s.top<=piece.z+0.01) lower={label:s.type==='base'?'Base':`Repisa ${shelves.filter(x=>x.type==='shelf'&&x.z<=s.z).length}`,top:s.top,z:s.z}; if(s.z>=piece.z+piece.h-0.01 && upper.z===H) upper={label:s.type==='top'?'Tapa superior':`Repisa ${shelves.filter(x=>x.type==='shelf'&&x.z<=s.z).length+1}`,z:s.z,top:s.top};});
      return {lower,upper};
    }
    if(piece.type==='divider'){
      const tW=Math.max(.3,Number(piece.w||t));
      return {left:{label:'Lateral izq.',x:t/2},right:{label:'Lateral der.',x:Number(model.width||120)-t/2},width:tW};
    }
    return null;
  }

  function renderFurnitureSelectedGuides(svg,model,scale,ox,oy,H){
    const f=model.furniture, p=f.pieces.find(x=>x.id===f.selectedPieceId); if(!p) return;
    if(p.type==='shelf'){
      const nb=furnitureNeighborBounds(model,p); if(!nb) return;
      const yTop=oy+(H-(Number(p.z||0)+Number(p.h||0)))*scale, yBottom=oy+(H-Number(p.z||0))*scale;
      const prevY=oy+(H-Number(nb.lower.top||0))*scale, nextY=oy+(H-Number(nb.upper.z||H))*scale;
      const dx=ox+Number(model.width||120)*scale+34;
      if(Math.abs(prevY-yBottom)>8) furnitureDimensionLine(svg,{x1:dx,y1:prevY,x2:dx,y2:yBottom,label:`${nb.lower.label} → ${escapeHtml(p.name||'Repisa')}: ${round1((Number(p.z||0)-(Number(nb.lower.top)||0)))} cm`,labelX:dx+16,labelY:(prevY+yBottom)/2,rotate:-90,accent:true});
      if(Math.abs(nextY-yTop)>8) furnitureDimensionLine(svg,{x1:dx+26,y1:yTop,x2:dx+26,y2:nextY,label:`${escapeHtml(p.name||'Repisa')} → ${nb.upper.label}: ${round1((Number(nb.upper.z||H)-(Number(p.z||0)+Number(p.h||0))))} cm`,labelX:dx+42,labelY:(yTop+nextY)/2,rotate:-90,accent:true});
    } else if(p.type==='divider'){
      const nb=furnitureNeighborBounds(model,p); if(!nb) return;
      const xLeft=ox+Number(p.x||0)*scale, xRight=ox+(Number(p.x||0)+Number(p.w||0))*scale;
      const leftX=ox+Number(nb.left.x||0)*scale, rightX=ox+Number(nb.right.x||Number(model.width||120))*scale;
      const dy=oy+H*scale+26;
      if(Math.abs(xLeft-leftX)>8) furnitureDimensionLine(svg,{x1:leftX,y1:dy,x2:xLeft,y2:dy,label:`Izq. → ${escapeHtml(p.name||'División')}: ${round1(Number(p.x||0)-(Number(nb.left.x)||0))} cm`,labelX:(leftX+xLeft)/2,labelY:dy+14,accent:true});
      if(Math.abs(rightX-xRight)>8) furnitureDimensionLine(svg,{x1:xRight,y1:dy+24,x2:rightX,y2:dy+24,label:`${escapeHtml(p.name||'División')} → Der.: ${round1((Number(nb.right.x||Number(model.width||120))-(Number(p.x||0)+Number(p.w||0))))} cm`,labelX:(xRight+rightX)/2,labelY:dy+38,accent:true});
    }
  }

  function furnitureBeginPieceDrag(evt,model,el,scale,ox,oy,H){
    evt.preventDefault();evt.stopPropagation();
    const f=model.furniture,p=f.pieces.find(x=>x.id===el.getAttribute('data-furniture-piece'));
    if(!p||p.carcass||p.type==='back'||p.type==='plinth'||p.type==='brace')return;
    f.selectedPieceId=p.id;
    if(!f.selectedPieceIds.includes(p.id))f.selectedPieceIds=[p.id];
    const start={clientX:evt.clientX,clientY:evt.clientY,x:Number(p.x||0),z:Number(p.z||0)};
    let moved=false;
    el.setPointerCapture?.(evt.pointerId);
    const move=e=>{
      const dx=(e.clientX-start.clientX)/scale,dz=-(e.clientY-start.clientY)/scale;
      if(!moved && Math.hypot(e.clientX-start.clientX,e.clientY-start.clientY)<3)return;
      if(!moved){recordHistorySnapshot('racks');moved=true;}
      let next={x:start.x+dx,z:start.z+dz};next=furnitureSnapPiece(model,p,next);
      if(p.type==='shelf')p.z=Math.max(furnitureBaseTop(model),Math.min(furnitureShelfMaxZ(model,p),next.z));
      else if(p.type==='divider')p.x=Math.max(0,Math.min(Number(model.width||120)-p.w,next.x));
      furnitureRefitModel(model);renderRackFurnitureBuilder(model.id);renderRackModelPreview();
    };
    const up=()=>{
      document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);
      if(moved){syncFurnitureModelToLegacy(model);saveRackModels();}
    };
    document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});
  }

  function renderFurnitureInspector(model,mount){
    const f=model.furniture;
    if(isRackConstructionScreen() && f.selectedSpace){
      const selectedSpace=furnitureGetSelectedSpace(model);
      if(selectedSpace){
        const {level,slot}=selectedSpace;
        mount.innerHTML=`<div class="rack-builder-inspector-head"><div><span>Espacio seleccionado</span><b>N${level.index}-${slot.code}</b></div><span class="tag">ESPACIO</span></div><div class="rack-builder-piece-metrics"><div><b>Ancho libre</b><span>${round1(slot.width)} cm</span></div><div><b>Alto libre</b><span>${round1(level.height)} cm</span></div></div><div class="rack-space-actions"><b>Dividir verticalmente</b><div class="rack-space-split-buttons"><button class="mini-btn" data-space-vertical="2">2</button><button class="mini-btn" data-space-vertical="3">3</button><button class="mini-btn" data-space-vertical="4">4</button><label>Partes<input id="rackSpaceVerticalCount" type="number" min="2" max="8" value="2"></label><button class="btn" id="rackSpaceVerticalCustom">Dividir</button></div><b>Dividir horizontalmente</b><button class="mini-btn" id="rackSpaceHorizontalSplit">Agregar repisa al centro de este nivel</button></div><div class="tiny muted">Las divisiones verticales quedan contenidas entre las repisas que forman este nivel.</div>`;
        $$('[data-space-vertical]',mount).forEach(btn=>btn.onclick=()=>{if(furnitureDivideSpaceVertical(model,level.index,slot.index,Number(btn.getAttribute('data-space-vertical')))){renderRackConstructionWorkspace();}});
        mount.querySelector('#rackSpaceVerticalCustom')?.addEventListener('click',()=>{const count=Math.max(2,Math.min(8,Number(mount.querySelector('#rackSpaceVerticalCount')?.value||2)));if(furnitureDivideSpaceVertical(model,level.index,slot.index,count))renderRackConstructionWorkspace();});
        mount.querySelector('#rackSpaceHorizontalSplit')?.addEventListener('click',()=>{if(furnitureSplitLevelHorizontal(model,level.index))renderRackConstructionWorkspace();});
        return;
      } else f.selectedSpace=null;
    }
    const ids=(f.selectedPieceIds||[]).filter(id=>f.pieces.some(p=>p.id===id));
    const selected=ids.map(id=>f.pieces.find(p=>p.id===id)).filter(Boolean);
    const p=f.pieces.find(x=>x.id===f.selectedPieceId)||selected[0];
    const shelfSelection=selected.filter(x=>x.type==='shelf');
    if(selected.length>1 && shelfSelection.length===selected.length){
      mount.innerHTML=`<div class="rack-builder-inspector-head"><div><span>Selección múltiple</span><b>${selected.length} repisas</b></div><span class="tag">REPISAS</span></div><div class="rack-builder-piece-metrics"><div><b>Primera cota</b><span>${round1(Math.min(...selected.map(x=>Number(x.z||0))))} cm</span></div><div><b>Última cota</b><span>${round1(Math.max(...selected.map(x=>Number(x.z||0))))} cm</span></div></div><div class="rack-3d-inspector-actions"><button class="btn" data-multi-piece-action="distribute">Distribuir uniformemente</button><button class="mini-btn" data-multi-piece-action="same-width">Igualar ancho</button><button class="mini-btn" data-multi-piece-action="clear-selection">Limpiar selección</button></div><div class="tiny muted">La distribución conserva la primera y última repisa seleccionadas y reparte las intermedias a la misma distancia.</div>`;
      const dis=mount.querySelector('[data-multi-piece-action="distribute"]');if(dis)dis.onclick=()=>{recordHistorySnapshot('racks');furnitureDistributeSelectedShelves(model,selected);syncFurnitureModelToLegacy(model);renderRackFurnitureBuilder(model.id);renderRackFurniture3D(model.id);renderRackModelPreview();};
      const same=mount.querySelector('[data-multi-piece-action="same-width"]');if(same)same.onclick=()=>{recordHistorySnapshot('racks');const ref=selected[0];selected.forEach(x=>{x.x=ref.x;x.w=ref.w;x.autoFit='';});furnitureRefitModel(model);syncFurnitureModelToLegacy(model);renderRackFurnitureBuilder(model.id);renderRackFurniture3D(model.id);};
      const clear=mount.querySelector('[data-multi-piece-action="clear-selection"]');if(clear)clear.onclick=()=>{f.selectedPieceIds=[];f.selectedPieceId='';renderRackFurnitureBuilder(model.id);renderRackFurniture3D(model.id);};
      return;
    }
    if(!p){mount.innerHTML=`<div class="rack-builder-inspector-empty"><b>Selecciona una pieza en el 3D</b><span>Lateral: altura. Repisa: ancho y distancia desde la base. División: posición y altura. Puedes usar Ctrl/Cmd para seleccionar varias repisas.</span><div class="rack-builder-piece-metrics"><div><b>Material</b><span>${furnitureMaterialLabel(f.material)}</span></div><div><b>Grosor</b><span>${round1(f.thickness)} cm</span></div><div><b>Forma</b><span>${f.roofMode==='slope'?'Pendiente':'Una altura'}</span></div><div><b>Alturas</b><span>${round1(f.leftHeight)} / ${round1(f.rightHeight)} cm</span></div></div></div>`;return;}
    const joinOptions=f.material==='metal'?[['bolted','Atornillada'],['slot','Encastrada'],['welded','Soldada'],['flush','A ras']]:[['between','Entre laterales'],['overlap','Sobrepuesta'],['inset','Embutida'],['flush','A ras']];
    let specific='';
    if(p.type==='side'){
      const isLeft=p.autoFit==='left-side';const height=isLeft?f.leftHeight:f.rightHeight;
      specific=`<div class="rack-3d-param-section"><b>Lateral ${isLeft?'izquierdo':'derecho'}</b><label>Altura (cm)<input data-parametric-side-height="${isLeft?'leftHeight':'rightHeight'}" type="number" min="20" step="1" value="${round1(height)}"></label><div class="tiny muted">En modo pendiente cada lateral puede tener una altura diferente.</div></div>`;
    }else if(p.type==='shelf'){
      const nb=furnitureNeighborBounds(model,p);specific=`<div class="rack-3d-param-section"><b>Repisa</b><div class="rack-builder-piece-metrics"><div><b>Desde la base</b><span>${round1(p.z)} cm</span></div><div><b>Libre abajo</b><span>${round1((Number(p.z||0)-(Number(nb?.lower?.top)||0)))} cm</span></div><div><b>Libre arriba</b><span>${round1((Number(nb?.upper?.z||model.height)-(Number(p.z||0)+Number(p.h||0))))} cm</span></div></div><label>Distancia desde base (cm)<input data-parametric-shelf="z" type="number" step="0.1" value="${round1(p.z)}"></label><div class="rack-builder-piece-grid"><label>Inicio X<input data-parametric-shelf="x" type="number" step="0.1" value="${round1(p.x)}"></label><label>Ancho<input data-parametric-shelf="w" type="number" min="1" step="0.1" value="${round1(p.w)}"></label></div><label class="rack-3d-check"><input type="checkbox" data-parametric-shelf-full ${p.autoFit==='shelf'?'checked':''}> Ocupar todo el ancho útil</label></div>`;
    }else if(p.type==='back'){
      specific='<div class="rack-3d-param-section"><b>Fondo posterior</b><div class="tiny muted">Se configura desde «② Fondo posterior» en la parte superior. Cambia entre completo y por compartimentos sin girar la cámara.</div></div>';
    }else if(p.type==='plinth'){
      specific='<div class="rack-3d-param-section"><b>Zócalo</b><div class="tiny muted">Su altura y retranqueo se editan desde «① Zócalo». El primer nivel útil se calcula automáticamente desde su parte superior.</div></div>';
    }else if(p.type==='divider'){
      specific=`<div class="rack-3d-param-section"><b>División</b><div class="rack-builder-piece-grid"><label>Posición X<input data-parametric-divider="x" type="number" step="0.1" value="${round1(p.x)}"></label><label>Desde base<input data-parametric-divider="z" type="number" step="0.1" value="${round1(p.z)}"></label><label>Altura<input data-parametric-divider="h" type="number" step="0.1" value="${round1(p.h)}"></label><label>Profundidad<input data-parametric-divider="d" type="number" step="0.1" value="${round1(p.d)}"></label></div></div>`;
    }
    mount.innerHTML=`<div class="rack-builder-inspector-head"><div><span>Pieza seleccionada</span><b>${escapeHtml(p.name||furniturePieceLabel(p))}</b></div><span class="tag">${furniturePieceLabel(p)}</span></div>${specific}<details class="rack-advanced-piece"><summary>Propiedades avanzadas</summary><div class="rack-builder-piece-grid"><label>X<input data-piece-field="x" type="number" step="0.1" value="${round1(p.x)}" ${p.carcass?'disabled':''}></label><label>Z<input data-piece-field="z" type="number" step="0.1" value="${round1(p.z)}" ${p.carcass?'disabled':''}></label><label>Ancho<input data-piece-field="w" type="number" step="0.1" value="${round1(p.w)}" ${p.autoFit?'disabled':''}></label><label>Alto<input data-piece-field="h" type="number" step="0.1" value="${round1(p.h)}" ${p.autoFit?'disabled':''}></label><label>Prof.<input data-piece-field="d" type="number" step="0.1" value="${round1(p.d)}"></label><label>Unión<select data-piece-field="join">${joinOptions.map(([v,l])=>`<option value="${v}" ${p.join===v?'selected':''}>${l}</option>`).join('')}</select></label></div></details><div class="rack-builder-inspector-actions"><button class="mini-btn" data-piece-action="duplicate">Duplicar</button><button class="mini-btn danger" data-piece-action="delete" ${p.carcass?'disabled':''}>Eliminar</button></div>`;
    const applyAll=()=>{furnitureRefitModel(model);syncFurnitureModelToLegacy(model);saveRackModels();renderRackFurnitureBuilder(model.id);renderRackFurniture3D(model.id);renderRackModelPreview();};
    $$('[data-parametric-side-height]',mount).forEach(el=>el.onchange=()=>{recordHistorySnapshot('racks');const key=el.getAttribute('data-parametric-side-height');f[key]=Math.max(20,Number(el.value||model.height||200));if(f.roofMode==='flat')f.leftHeight=f.rightHeight=f[key];model.height=Math.max(60,f.leftHeight,f.rightHeight);applyAll();});
    $$('[data-parametric-shelf]',mount).forEach(el=>{el.onchange=()=>{recordHistorySnapshot('racks');const field=el.getAttribute('data-parametric-shelf');p.autoFit='';p[field]=Math.max(field==='w'?1:0,Number(el.value||0));applyAll();};});
    const full=mount.querySelector('[data-parametric-shelf-full]');if(full)full.onchange=()=>{recordHistorySnapshot('racks');p.autoFit=full.checked?'shelf':'';applyAll();};
    $$('[data-parametric-divider]',mount).forEach(el=>el.onchange=()=>{recordHistorySnapshot('racks');const field=el.getAttribute('data-parametric-divider');p[field]=Math.max((field==='h'||field==='d') ? .1 : 0, Number(el.value||0));applyAll();});
    $$('[data-piece-field]',mount).forEach(el=>{const apply=()=>{recordHistorySnapshot('racks');const field=el.getAttribute('data-piece-field');if(field==='name'||field==='join')p[field]=el.value;else p[field]=Math.max(['d','h','w'].includes(field)?.1:0,Number(el.value||0));if(field==='join'&&p.type==='shelf')p.autoFit='shelf';applyAll();};el.onchange=apply;});
    const dup=mount.querySelector('[data-piece-action="duplicate"]');if(dup)dup.onclick=()=>{recordHistorySnapshot('racks');furnitureDuplicateSelectedPiece(model);renderRackFurnitureBuilder(model.id);renderRackFurniture3D(model.id);renderRackModelPreview();};
    const del=mount.querySelector('[data-piece-action="delete"]');if(del)del.onclick=()=>{if(p.carcass)return;recordHistorySnapshot('racks');f.pieces=f.pieces.filter(x=>x.id!==p.id);f.selectedPieceId='';f.selectedPieceIds=[];syncFurnitureModelToLegacy(model);renderRackFurnitureBuilder(model.id);renderRackFurniture3D(model.id);renderRackModelPreview();};
  }

  function furnitureDistributeSelectedShelves(model,shelves){
    const arr=[...shelves].sort((a,b)=>Number(a.z||0)-Number(b.z||0)); if(arr.length<2)return;
    const min=Number(arr[0].z||0),max=Number(arr[arr.length-1].z||0);const step=(max-min)/(arr.length-1||1);
    arr.forEach((p,i)=>{p.z=round1(min+step*i);});furnitureRefitModel(model);
  }

  function renderFurnitureLevels(model,mount){
    const f=model.furniture,levels=deriveFurnitureLevels(model);
    if(!levels.length){mount.innerHTML='<div class="tiny muted">Agrega una base y una tapa/repisas para formar compartimentos.</div>';return;}
    if(isRackConstructionScreen()){
      mount.innerHTML=`<div class="rack-cad-level-list">${[...levels].reverse().map(l=>`<div class="rack-cad-level-card ${f.selectedSpace&&Number(f.selectedSpace.levelIndex)===Number(l.index)?'active':''}"><div><b>N${l.index}</b><span>${round1(l.height)} cm libres</span></div><label>Slots WMS<input type="number" min="1" max="12" step="1" data-furniture-level-slots="${l.index}" value="${l.slots.length}"></label><small>${l.physicalDividerCount} divisor${l.physicalDividerCount===1?'':'es'} físico${l.physicalDividerCount===1?'':'s'}</small></div>`).join('')}</div>`;
    }else{
      mount.innerHTML=`<div class="rack-builder-levels-head"><div><b>Niveles y slots derivados</b><span>Los slots pueden ser físicos (divisor) o lógicos para WMS.</span></div><span class="tag">Capacidad ${levels.reduce((s,l)=>s+l.slots.length,0)}</span></div><div class="rack-builder-level-grid">${[...levels].reverse().map(l=>`<div class="rack-builder-level-card"><div><b>Nivel ${l.index}</b><span>${round1(l.height)} cm libres · ${l.physicalDividerCount} divisores físicos</span></div><label>Slots WMS<input type="number" min="1" max="12" step="1" data-furniture-level-slots="${l.index}" value="${l.slots.length}"></label><div class="rack-builder-slot-chips">${l.slots.map(s=>`<span>${s.code} · ${round1(s.width)} cm</span>`).join('')}</div><div class="rack-builder-level-actions"><button class="mini-btn" data-furniture-materialize="${l.index}">Crear divisores físicos</button><button class="mini-btn" data-furniture-clear-dividers="${l.index}">Quitar divisores</button></div></div>`).join('')}</div>`;
    }
    $$('[data-furniture-level-slots]',mount).forEach(inp=>{inp.onchange=()=>{const idx=Number(inp.getAttribute('data-furniture-level-slots'));f.logicalSlots[idx]=Math.max(1,Math.min(12,Number(inp.value||1)||1));syncFurnitureModelToLegacy(model);if(isRackConstructionScreen())renderRackConstructionWorkspace();else{renderRackFurnitureBuilder(model.id);renderRackModelPreview();}};});
    $$('[data-furniture-materialize]',mount).forEach(btn=>btn.onclick=()=>{recordHistorySnapshot('racks');furnitureMaterializeLevelDividers(model,Number(btn.getAttribute('data-furniture-materialize')));syncFurnitureModelToLegacy(model);saveRackModels();if(isRackConstructionScreen())renderRackConstructionWorkspace();else{renderRackFurnitureBuilder(model.id);renderRackModelPreview();}});
    $$('[data-furniture-clear-dividers]',mount).forEach(btn=>btn.onclick=()=>{recordHistorySnapshot('racks');furnitureClearLevelDividers(model,Number(btn.getAttribute('data-furniture-clear-dividers')));syncFurnitureModelToLegacy(model);saveRackModels();if(isRackConstructionScreen())renderRackConstructionWorkspace();else{renderRackFurnitureBuilder(model.id);renderRackModelPreview();}});
  }


  function furnitureLevelByIndex(model,index){return deriveFurnitureLevels(model).find(l=>l.index===Number(index))||null;}
  function furnitureClearLevelDividers(model,index){ensureRackFurnitureModel(model);const level=furnitureLevelByIndex(model,index);if(!level)return;model.furniture.pieces=model.furniture.pieces.filter(p=>!(p.type==='divider'&&Number(p.z||0)<=level.z0+1.5&&Number(p.z||0)+Number(p.h||0)>=level.z1-1.5));}
  function furnitureMaterializeLevelDividers(model,index){ensureRackFurnitureModel(model);const f=model.furniture,level=furnitureLevelByIndex(model,index);if(!level)return;const desired=Math.max(1,Number(f.logicalSlots?.[index]||level.slots.length||1));furnitureClearLevelDividers(model,index);if(desired<=1)return;const W=Number(model.width||120),D=Number(model.depth||40),t=Math.max(.3,Number(f.thickness||1.8)),inner=Math.max(1,W-2*t),divT=f.material==='metal'?Math.max(.8,Math.min(2,t*.45)):t;for(let i=1;i<desired;i++){const cx=t+inner*i/desired;f.pieces.push(furnitureMakePiece('divider',{name:`Divisor N${index}.${i}`,x:cx-divT/2,y:0,z:level.z0,w:divT,d:D,h:level.height,join:f.material==='metal'?'slot':'between'}));}}

  let rackFurniture3DEngine = null;

  function disposeRackFurniture3DEngine(){
    const e=rackFurniture3DEngine;if(!e)return;
    try{cancelAnimationFrame(e.raf||0);}catch{}
    try{e.resizeObserver?.disconnect();}catch{}
    try{e.scene?.traverse(o=>{o.geometry?.dispose?.();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>m.dispose?.());}});}catch{}
    try{e.renderer?.dispose?.();e.renderer?.forceContextLoss?.();}catch{}
    try{e.renderer?.domElement?.remove();}catch{}
    rackFurniture3DEngine=null;
  }

  function resetRackFurniture3DCamera(modelId){
    const e=rackFurniture3DEngine;if(!e||e.modelId!==modelId)return;
    const model=rackModel(modelId);if(!model)return;const W=Number(model.width||120),D=Number(model.depth||40),H=Number(model.height||200);
    e.target.set(W/2,H*.45,D/2);e.yaw=-0.75;e.pitch=.42;e.distance=Math.max(W,D,H)*1.55;updateRackFurniture3DCamera(e);requestRackFurniture3DRender(e);
  }

  function updateRackFurniture3DCamera(e){
    const cp=Math.cos(e.pitch),sp=Math.sin(e.pitch),cy=Math.cos(e.yaw),sy=Math.sin(e.yaw),d=e.distance;
    e.camera.position.set(e.target.x+d*cp*cy,e.target.y+d*sp,e.target.z+d*cp*sy);e.camera.lookAt(e.target);
  }

  function requestRackFurniture3DRender(e){if(!e||e.raf)return;e.raf=requestAnimationFrame(()=>{e.raf=0;if(e.renderer&&e.scene&&e.camera)e.renderer.render(e.scene,e.camera);});}

  async function renderRackFurniture3D(modelId){
    const host=document.getElementById('rackFurniture3D'),model=rackModel(modelId);if(!host||!model?.furniture?.enabled)return;
    let THREE;try{THREE=await loadThreeRuntime();}catch(err){host.innerHTML=`<div class="rack-3d-error">No se pudo cargar el motor 3D.<br><small>${escapeHtml(err?.message||String(err))}</small></div>`;return;}
    if(!host.isConnected)return;
    let e=rackFurniture3DEngine;
    if(!e||e.host!==host||e.modelId!==modelId){disposeRackFurniture3DEngine();e=createRackFurniture3DEngine(THREE,host,model);rackFurniture3DEngine=e;}
    rebuildRackFurniture3DScene(e,model);requestRackFurniture3DRender(e);
  }

  function createRackFurniture3DEngine(THREE,host,model){
    const constructionMode=isRackConstructionScreen();
    host.innerHTML='';const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(1.5,window.devicePixelRatio||1));renderer.setClearColor(constructionMode?0xedece7:0x07131d,1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;host.appendChild(renderer.domElement);
    const scene=new THREE.Scene();scene.background=new THREE.Color(constructionMode?0xedece7:0x07131d);const camera=new THREE.PerspectiveCamera(34,1,.1,10000);const target=new THREE.Vector3();
    scene.add(new THREE.HemisphereLight(constructionMode?0xf0fbff:0xd9efff,constructionMode?0xcbc9c1:0x24313b,constructionMode?1.8:1.45));const key=new THREE.DirectionalLight(0xffffff,constructionMode?1.9:1.55);key.position.set(250,360,220);key.castShadow=true;key.shadow.mapSize.set(1024,1024);scene.add(key);const fill=new THREE.DirectionalLight(constructionMode?0xf5e8d8:0x89b8d8,constructionMode ? .95 : .65);fill.position.set(-220,160,-180);scene.add(fill);
    const root=new THREE.Group();root.name='furnitureRoot';scene.add(root);const grid=new THREE.GridHelper(700,35,constructionMode?0xc9c9c3:0x355064,constructionMode?0xdfded8:0x1c3444);grid.position.y=-.03;scene.add(grid);
    const e={THREE,host,renderer,scene,camera,target,root,raycaster:new THREE.Raycaster(),pointer:new THREE.Vector2(),modelId:model.id,yaw:-.75,pitch:.42,distance:320,raf:0,drag:null,orbit:null,meshByPiece:new Map(),spaceMeshes:[]};
    const resize=()=>{const w=Math.max(320,host.clientWidth),h=Math.max(360,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();requestRackFurniture3DRender(e);};resize();e.resizeObserver=new ResizeObserver(resize);e.resizeObserver.observe(host);
    renderer.domElement.style.touchAction='none';
    renderer.domElement.addEventListener('pointerdown',ev=>rackFurniture3DPointerDown(e,ev));
    renderer.domElement.addEventListener('wheel',ev=>{ev.preventDefault();e.distance=Math.max(45,Math.min(1600,e.distance*(ev.deltaY>0?1.1:.9)));updateRackFurniture3DCamera(e);requestRackFurniture3DRender(e);},{passive:false});
    resetRackFurniture3DCamera(model.id);return e;
  }

  function rackFurnitureMaterialSet(THREE,material,selected=false,finish='oak'){
    const constructionMode=isRackConstructionScreen();
    const palette=constructionMode?(material==='metal'?{main:0x8aaac0}:material==='wood'?{main:0xca9360}:{main:0xe7edf3}):(material==='metal'?{main:0x607f98}:material==='wood'?{main:0xb77d43}:{main:0xdce5ed});
    const finishes={white:0xf2f0e8,oak:0xd2af85,walnut:0x86603f,graphite:0x4b5055};
    const actualColor=material==='metal'?palette.main:(finishes[finish]||palette.main);
    return new THREE.MeshStandardMaterial({color:actualColor,roughness:material==='metal'?(constructionMode ? .28 : .38):(constructionMode ? .62 : .72),metalness:material==='metal'?(constructionMode ? .72 : .65):.05,emissive:0x000000,emissiveIntensity:0});
  }

  function clearRackFurniture3DRoot(e){
    e.root.children.slice().forEach(o=>{e.root.remove(o);o.traverse?.(x=>{x.geometry?.dispose?.();if(x.material){const ms=Array.isArray(x.material)?x.material:[x.material];ms.forEach(m=>m.dispose?.());}});});e.meshByPiece.clear();e.spaceMeshes=[];
  }

  function rebuildRackFurniture3DScene(e,model){
    const {THREE}=e;clearRackFurniture3DRoot(e);ensureRackFurnitureModel(model);furnitureRefitModel(model);const f=model.furniture,W=Number(model.width||120),D=Number(model.depth||40),H=Number(model.height||200),selectedIds=new Set(f.selectedPieceIds||[]);if(f.selectedPieceId)selectedIds.add(f.selectedPieceId);
    const selected=new Set(f.selectedPieceIds||[]);if(f.selectedPieceId)selected.add(f.selectedPieceId);
    v222FurnitureMeshes(model).forEach(item=>{
      const p=item.piece,geom=v222PieceGeometry(THREE,item),mat=rackFurnitureMaterialSet(THREE,furniturePieceFinish(model,p),selected.has(p.id),f.finish),mesh=new THREE.Mesh(geom,mat);
      if(item.profile)mesh.position.set(0,0,Number(p.y||0));else{mesh.position.set(item.x,item.y,item.z);mesh.rotation.z=item.angle;}
      mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData={pieceId:p.id,type:p.type};e.root.add(mesh);e.meshByPiece.set(p.id,mesh);
      if(selected.has(p.id)){const outline=new THREE.LineSegments(new THREE.EdgesGeometry(geom),new THREE.LineBasicMaterial({color:0x16a687,depthTest:false,transparent:true,opacity:.95}));outline.position.copy(mesh.position);outline.rotation.copy(mesh.rotation);outline.renderOrder=6;outline.userData={decorative:true};e.root.add(outline);}
    });
    // espacios internos seleccionables en el constructor visual
    deriveFurnitureLevels(model).forEach(l=>l.slots.forEach(slot=>{const selected=!!(isRackConstructionScreen()&&f.selectedSpace&&Number(f.selectedSpace.levelIndex)===Number(l.index)&&Number(f.selectedSpace.slotIndex)===Number(slot.index));const geom=new THREE.BoxGeometry(Math.max(.1,slot.width-1),Math.max(.1,l.height-1),Math.max(1,D*.82));const mat=new THREE.MeshBasicMaterial({color:selected?0x42e7a5:0x5ec7f0,transparent:true,opacity:selected?.18:(isRackConstructionScreen()?.055:.025),depthWrite:false,side:THREE.DoubleSide});const m=new THREE.Mesh(geom,mat);m.position.set((slot.x0+slot.x1)/2,(l.z0+l.z1)/2,D*.5);m.userData={space:true,levelIndex:l.index,slotIndex:slot.index};e.root.add(m);e.spaceMeshes.push(m);}));
    // axes labels via simple helper
    const axes=new THREE.AxesHelper(Math.max(35,Math.min(W,H,D)));axes.position.set(0,0,0);e.root.add(axes);
    if(!e.fitKey)e.target.set(W/2,Math.max(20,H*.42),D/2);updateRackFurniture3DCamera(e);
  }

  function rackFurniture3DHit(e,ev){
    const rect=e.renderer.domElement.getBoundingClientRect();e.pointer.x=((ev.clientX-rect.left)/rect.width)*2-1;e.pointer.y=-((ev.clientY-rect.top)/rect.height)*2+1;e.raycaster.setFromCamera(e.pointer,e.camera);return e.raycaster.intersectObjects([...e.meshByPiece.values(),...(e.spaceMeshes||[])],false)[0]||null;
  }

  function rackFurniture3DPointerDown(e,ev){
    const model=rackModel(e.modelId);if(!model)return;const f=model.furniture,hit=rackFurniture3DHit(e,ev);const start={x:ev.clientX,y:ev.clientY};
    if(isRackConstructionScreen() && hit?.object?.userData?.space){
      const levelIndex=Number(hit.object.userData.levelIndex),slotIndex=Number(hit.object.userData.slotIndex);const rb=appState.ui?.rackBuilder||{};
      f.selectedPieceId='';f.selectedPieceIds=[];f.selectedSpace={levelIndex,slotIndex};
      if(rb.cadTool==='shelf'){
        const z=Math.max(0,Number(hit.point?.y||0));if(furnitureSplitLevelHorizontal(model,levelIndex,z)){rb.cadTool='select';renderRackConstructionWorkspace();return;}
      }else if(rb.cadTool==='divider'){
        const level=deriveFurnitureLevels(model).find(l=>l.index===levelIndex);const slot=level?.slots?.find(s=>s.index===slotIndex);if(level&&slot){recordHistorySnapshot('racks');const t=Math.max(.3,Number(f.thickness||1.8)),D=Number(model.depth||40),x=Math.max(slot.x0+t*.5,Math.min(slot.x1-t*.5,Number(hit.point?.x||((slot.x0+slot.x1)/2))));const d=furnitureMakePiece('divider',{name:`División N${level.index}`,x:x-t/2,y:0,z:level.z0,w:t,d:D,h:level.height,join:f.material==='metal'?'slot':'between'});constrainConstructionDivider(model,d);f.pieces.push(d);f.selectedSpace=null;f.selectedPieceId=d.id;f.selectedPieceIds=[d.id];syncFurnitureModelToLegacy(model);saveRackModels();rb.cadTool='select';renderRackConstructionWorkspace();return;}
      }else if(rb.cadTool==='back'){
        recordHistorySnapshot('racks');furnitureAddBack(model);syncFurnitureModelToLegacy(model);saveRackModels();rb.cadTool='select';renderRackConstructionWorkspace();return;
      }else{
        rebuildRackFurniture3DScene(e,model);requestRackFurniture3DRender(e);refreshRackConstructionPanels(model);return;
      }
    }
    if(hit?.object?.userData?.pieceId){
      f.selectedSpace=null;
      const id=hit.object.userData.pieceId,p=f.pieces.find(x=>x.id===id);if(!p)return;
      if(ev.ctrlKey||ev.metaKey){const set=new Set(f.selectedPieceIds||[]);if(set.has(id))set.delete(id);else set.add(id);f.selectedPieceIds=[...set];f.selectedPieceId=id;}else{f.selectedPieceId=id;f.selectedPieceIds=[id];}
      renderRackFurnitureBuilder(model.id);renderRackFurniture3D(model.id);
      if(!p.carcass&&(p.type==='shelf'||p.type==='divider')){
        recordHistorySnapshot('racks');const base={clientX:ev.clientX,clientY:ev.clientY,x:Number(p.x||0),z:Number(p.z||0)};const move=mv=>{const rect=e.renderer.domElement.getBoundingClientRect();if(p.type==='shelf'){const dz=-(mv.clientY-base.clientY)/rect.height*Math.max(80,Number(model.height||200)*1.35);p.autoFit='';p.z=Math.max(0,Math.min(furnitureShelfMaxZ(model,p),base.z+dz));p.z=furnitureSnapValue(p.z,f.pieces.filter(x=>x.id!==p.id&&['base','shelf','top'].includes(x.type)).flatMap(x=>[x.z,x.z+x.h]),Math.max(.1,f.snap||1));}else{const dx=(mv.clientX-base.clientX)/rect.width*Math.max(80,Number(model.width||120)*1.35);p.x=Math.max(0,Math.min(Number(model.width||120)-p.w,base.x+dx));p.x=furnitureSnapValue(p.x,f.pieces.filter(x=>x.id!==p.id).flatMap(x=>[x.x,x.x+x.w]),Math.max(.1,f.snap||1));}furnitureRefitModel(model);syncFurnitureModelToLegacy(model);rebuildRackFurniture3DScene(e,model);requestRackFurniture3DRender(e);renderRackFurnitureBuilder(model.id);renderRackModelPreview();};const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);saveRackModels();};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});
      }
      return;
    }
    if(isRackConstructionScreen()){f.selectedSpace=null;refreshRackConstructionPanels(model);}
    e.orbit={x:ev.clientX,y:ev.clientY,yaw:e.yaw,pitch:e.pitch};const move=mv=>{e.yaw=e.orbit.yaw-(mv.clientX-e.orbit.x)*.008;e.pitch=Math.max(-.05,Math.min(1.35,e.orbit.pitch+(mv.clientY-e.orbit.y)*.006));updateRackFurniture3DCamera(e);requestRackFurniture3DRender(e);};const up=()=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);};document.addEventListener('pointermove',move);document.addEventListener('pointerup',up,{once:true});
  }

  function round1(v){return Math.round((Number(v)||0)*10)/10;}

  function renderFurnitureRackDetail(rackId,prod,holder,model,rack){
    if(!holder||!model)return;ensureRackFurnitureModel(model);furnitureRefitModel(model);holder.innerHTML='';holder.setAttribute('preserveAspectRatio','xMidYMid meet');
    const root=svgEl('g',{});holder.appendChild(root);const W=Number(model.width||120),D=Number(model.depth||40),H=Number(model.height||200),baseOffset=Math.max(0,Number(rack?.baseHeight ?? model.clearance ?? 0)||0),pieces=getFurnitureRenderPieces(model);const ox=-W/2,oy=-D/2;
    const finish=model.furniture.finish||'oak';
    const palettes={
      white:{top:'#f6f4ee',front:'#e6e2d9',side:'#cbc8c1',stroke:'#b7b2a9'},
      oak:{top:'#e3c49b',front:'#cda77c',side:'#b38b62',stroke:'#9b7650'},
      walnut:{top:'#a98560',front:'#86603f',side:'#6a4933',stroke:'#5f4330'},
      graphite:{top:'#6e7478',front:'#4e545a',side:'#3a4148',stroke:'#303840'},
      metal:{top:'#8999a6',front:'#697c8b',side:'#4e626e',stroke:'#455864'}
    };
    const paletteFor=p=>furniturePieceFinish(model,p)==='metal'?palettes.metal:(palettes[finish]||palettes.oak);
    // Vista técnica SVG de respaldo: proyección por caras ordenadas según profundidad.
    // Evita que un panel lejano se dibuje encima de las repisas delanteras.
    const isoCfg=getIsoViewConfig();
    const svgFaces=[];
    const addFace=(pts3,color,stroke,strokeWidth='0.9')=>{
      const pts=pts3.map(pt=>toIso(pt[0],pt[1],pt[2]));
      const depth=pts3.reduce((v,pt)=>v+pt[0]*isoCfg.sx+pt[1]*isoCfg.sy+pt[2]*.95,0)/pts3.length;
      svgFaces.push({depth,element:face(pts,{fill:color,stroke,'stroke-width':strokeWidth})});
    };
    const prism=(p,attrs={})=>{
      const colors=paletteFor(p),x0=ox+p.x,x1=x0+p.w,y0=oy+p.y,y1=y0+p.d,z0=p.z+baseOffset,z1=p.z+p.h+baseOffset;
      const yy=isoCfg.sy>=0?y1:y0,xx=isoCfg.sx>=0?x1:x0;
      addFace([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],attrs.top||colors.top,colors.stroke,'1');
      addFace([[x0,yy,z0],[x1,yy,z0],[x1,yy,z1],[x0,yy,z1]],attrs.front||colors.front,colors.stroke);
      addFace([[xx,y0,z0],[xx,y1,z0],[xx,y1,z1],[xx,y0,z1]],attrs.side||colors.side,colors.stroke);
    };
    pieces.filter(p=>p.type!=='brace').forEach(prism);
    svgFaces.sort((a,b)=>a.depth-b.depth).forEach(row=>root.appendChild(row.element));
    pieces.filter(p=>p.type==='brace').forEach(p=>{const a=toIso(ox+Number(p.x||0),oy+D*.1,Number(p.z||0)+baseOffset),b=toIso(ox+Number(p.x2||p.x+p.w||0),oy+D*.1,Number(p.z2||p.z+p.h||0)+baseOffset);root.appendChild(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#637b87','stroke-width':Math.max(2,Number(p.d||2)),'stroke-linecap':'round'}));});
    const levels=deriveFurnitureLevels(model),selectedLevel=prod?.nivel?Math.max(1,Number(prod.nivel)||1):0,selectedSlot=prod?.slot?Math.max(1,Number(prod.slot)||1):0;if(selectedLevel&&selectedSlot){const l=levels.find(x=>x.index===selectedLevel),slot=l?.slots?.[selectedSlot-1];if(l&&slot){const p={x:slot.x0+1,y:D*.08,z:l.z0+1,w:Math.max(1,slot.width-2),d:D*.84,h:Math.max(2,l.height-2)};prism(p,{top:'rgba(196,255,91,.48)',front:'rgba(143,255,91,.34)',side:'rgba(118,238,72,.28)'});}}
    const thumbnail=holder.dataset?.furnitureThumb!==undefined;
    const catalogPreview=thumbnail||holder.dataset?.catalogPreview!==undefined;
    if(!catalogPreview){
      const floorPt=toIso(0,0,baseOffset-3),floorLabel=svgEl('text',{x:floorPt.x,y:floorPt.y,class:'rack-dim','text-anchor':'middle'});floorLabel.textContent=`Piso ${round1(baseOffset)}cm`;root.appendChild(floorLabel);
      const base=toIso(0,0,H+baseOffset+14),label=svgEl('text',{x:base.x,y:base.y,class:'rack-title','text-anchor':'middle'});label.textContent=rack?.id||model.name||'Rack';root.appendChild(label);
    }
    try{const box=root.getBBox();holder.setAttribute('viewBox',`${box.x-(catalogPreview?14:32)} ${box.y-(catalogPreview?14:38)} ${Math.max(80,box.width+(catalogPreview?28:64))} ${Math.max(120,box.height+(catalogPreview?28:78))}`);}catch{holder.setAttribute('viewBox','-240 -300 480 520');}
  }
