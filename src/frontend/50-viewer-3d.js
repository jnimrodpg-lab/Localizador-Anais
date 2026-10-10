  async function loadThreeRuntime(){
    if(window.THREE) return window.THREE;
    if(window.__threeRuntimePromise) return window.__threeRuntimePromise;
    window.__threeRuntimePromise = (async () => {
      const localUrl = './vendor/three.module.js?v=wms-v161-isometric';
      try{
        const THREE = await import(localUrl);
        window.THREE = THREE;
        return THREE;
      }catch(localError){
        console.warn('Three.js local no disponible; usando respaldo CDN.', localError);
        const cdnSources=[
          'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
          'https://unpkg.com/three@0.160.0/build/three.module.js',
          'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js'
        ];
        let remoteError;
        for(const source of cdnSources){
          try{
            const THREE=await import(source);
            window.THREE=THREE;
            return THREE;
          }catch(error){remoteError=error;}
        }
        window.__threeRuntimePromise=null;
        throw new Error(`No se pudo cargar Three.js: ${remoteError?.message || remoteError}`);
      }
    })();
    return window.__threeRuntimePromise;
  }

  function disposeThreeScene(scene, renderer){
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    const collectTexture = value => {
      if(value && typeof value === 'object' && value.isTexture) textures.add(value);
    };
    const collectMaterial = material => {
      if(!material || materials.has(material)) return;
      materials.add(material);
      Object.values(material).forEach(collectTexture);
      if(material.uniforms && typeof material.uniforms === 'object'){
        Object.values(material.uniforms).forEach(uniform => collectTexture(uniform?.value));
      }
    };
    scene?.traverse?.(obj => {
      if(obj?.geometry) geometries.add(obj.geometry);
      if(Array.isArray(obj?.material)) obj.material.forEach(collectMaterial);
      else collectMaterial(obj?.material);
    });
    textures.forEach(texture => { try{ texture.dispose?.(); }catch{} });
    materials.forEach(material => { try{ material.dispose?.(); }catch{} });
    geometries.forEach(geometry => { try{ geometry.dispose?.(); }catch{} });
    try{ renderer?.renderLists?.dispose?.(); }catch{}
    try{ renderer?.dispose?.(); }catch{}
    try{ renderer?.forceContextLoss?.(); }catch{}
  }

  function openNavigable3DModal(prod = appState.selectedProduct){
    const existing = document.getElementById('navigable3DModal');
    if(existing){
      if(typeof existing.__wmsDispose3D === 'function') existing.__wmsDispose3D();
      else existing.remove();
    }
    const ctx = getViewerProductLocationContext(prod);
    ensureAppRuntimeState();
    const currentVisualMode = appState.ui?.nav3DVisualMode || 'operativo';
    const modal = document.createElement('div');
    modal.id = 'navigable3DModal';
    modal.className = 'nav3d-backdrop show nav3d-webgl-mode';
    modal.innerHTML = `
      <div class="nav3d-shell">
        <div class="nav3d-head">
          <div>
            <div class="search-card-kicker">Ubicación visual · WebGL</div>
            <h2>Visor 3D del layout</h2>
            <p>Modelo sincronizado 2D↔3D para ubicar producto, revisar racks y coordinar la operación sin vista arquitectónica redundante.</p>
          </div>
          <div class="nav3d-actions">
            <div class="nav3d-head-location">${escapeHtml(ctx.primaryLoc || 'Sin ubicación')}</div>
            <div class="nav3d-target-switch" id="nav3dTargetSwitch">
              <button type="button" class="active" data-nav3d-target="primary">Ubicación</button>
              <button type="button" data-nav3d-target="store">Almacén</button>
              <button type="button" data-nav3d-target="both">Ambas</button>
            </div>
            <button class="iso-tool nav3d-solo-location active" data-nav3d-action="solo">Solo ubicación</button>
            <button class="iso-tool" data-nav3d-action="focus">Centrar</button>
            <button class="iso-tool ${appState.ui?.nav3DWallCut ? 'active' : ''}" data-nav3d-action="wall-cut">Corte rápido</button>
            <button class="iso-tool" data-nav3d-action="section-panel">Cortes X/Y/Z</button>
            <button class="iso-tool" data-nav3d-action="views-panel">Vistas</button>
            <button class="iso-tool" data-nav3d-action="first-person">Primera persona</button>
            <button class="iso-tool" data-nav3d-action="save-view">Guardar vista</button>
                        <button class="iso-tool ${appState.ui?.nav3DPresentation ? 'active' : ''}" data-nav3d-action="presentation-mode">Presentación</button>
            <button class="iso-tool ${appState.ui?.nav3DRoof ? 'active' : ''}" data-nav3d-action="roof-toggle">Techo</button>
            <button class="iso-tool ${appState.ui?.nav3DShowRoomSlabs !== false ? 'active' : ''}" data-nav3d-action="room-slabs">Pisos</button>
            <button class="iso-tool ${appState.ui?.nav3DShowOpeningFrames !== false ? 'active' : ''}" data-nav3d-action="opening-frames">Marcos</button>
            <button class="iso-tool ${appState.ui?.nav3DShowArchitecturalDetails !== false ? 'active' : ''}" data-nav3d-action="arch-details">Detalles</button>
            <button class="iso-tool" data-nav3d-action="camera-top">Planta 3D</button>
            ${prod ? '<button class="iso-tool nav3d-locate-product" data-nav3d-action="locate-product">⌖ Producto</button>' : ''}
            <label class="nav3d-wms-mode-wrap" title="Modo de visualización WMS"><span>Vista</span><select id="nav3dWmsMode">
              <option value="occupancy">Ocupación</option><option value="zones">Zonas</option><option value="stock">Stock</option><option value="category">Categoría</option><option value="brand">Marca</option>
            </select></label>
            <div class="nav3d-visual-switch">
              <button class="iso-tool visual-mode" data-nav3d-action="visual-dark">Oscuro</button>
              <button class="iso-tool visual-mode active" data-nav3d-action="visual-operativo">Operativo</button>
              <button class="iso-tool visual-mode" data-nav3d-action="visual-claro">Claro</button>
            </div>
            <button class="location-modal-close" type="button" aria-label="Cerrar">✕</button>
          </div>
        </div>
        <div class="nav3d-body">
          <div class="nav3d-stage">
            <canvas id="nav3dCanvas"></canvas>
            <div class="nav3d-hud" id="nav3dHud">
              <b>Controles</b>
              <span>Arrastrar: orbitar suave</span>
              <span>Rueda: zoom progresivo</span>
              <span>Shift + arrastrar: pan</span>
            </div>
            <div class="nav3d-pro-panel nav3d-section-panel" id="nav3dSectionPanel" hidden>
              <div class="nav3d-pro-head"><b>Cortes profesionales</b><button type="button" data-panel-close="section">✕</button></div>
              <div class="nav3d-cut-row"><button type="button" data-section-axis="x">X</button><input type="range" min="0" max="100" step="1" data-section-range="x"><span data-section-value="x">50%</span><button type="button" data-section-dir="x">⇄</button></div>
              <div class="nav3d-cut-row"><button type="button" data-section-axis="y">Y</button><input type="range" min="0" max="100" step="1" data-section-range="y"><span data-section-value="y">50%</span><button type="button" data-section-dir="y">⇄</button></div>
              <div class="nav3d-cut-row"><button type="button" data-section-axis="z">Z</button><input type="range" min="0" max="100" step="1" data-section-range="z"><span data-section-value="z">70%</span><button type="button" data-section-dir="z">⇅</button></div>
              <div class="nav3d-box-head"><button type="button" class="iso-tool" data-section-box> Caja de sección </button><button type="button" class="iso-tool" data-section-reset>Restablecer</button></div>
              <div class="nav3d-box-grid">
                <label>X mín<input type="range" min="0" max="95" step="1" data-box-range="xMin"></label><label>X máx<input type="range" min="5" max="100" step="1" data-box-range="xMax"></label>
                <label>Y mín<input type="range" min="0" max="95" step="1" data-box-range="yMin"></label><label>Y máx<input type="range" min="5" max="100" step="1" data-box-range="yMax"></label>
                <label>Z mín<input type="range" min="0" max="95" step="1" data-box-range="zMin"></label><label>Z máx<input type="range" min="5" max="100" step="1" data-box-range="zMax"></label>
              </div>
              <div class="tiny muted">Al activar un corte, el techo se oculta automáticamente. X/Y cortan la planta; Z corta la altura.</div>
            </div>
            <div class="nav3d-pro-panel nav3d-views-panel" id="nav3dViewsPanel" hidden>
              <div class="nav3d-pro-head"><b>Vistas profesionales</b><button type="button" data-panel-close="views">✕</button></div>
              <div class="nav3d-view-grid">
                <button type="button" data-view-preset="top">Planta</button><button type="button" data-view-preset="front">Frontal</button><button type="button" data-view-preset="back">Posterior</button>
                <button type="button" data-view-preset="left">Izquierda</button><button type="button" data-view-preset="right">Derecha</button><button type="button" data-view-preset="iso-ne">ISO NE</button>
                <button type="button" data-view-preset="iso-nw">ISO NO</button><button type="button" data-view-preset="perspective">Perspectiva</button>
              </div>
              <div class="nav3d-saved-title"><b>Vistas guardadas</b><span class="tiny muted">Se guardan con el layout</span></div>
              <div class="nav3d-saved-list" id="nav3dSavedViews"></div>
            </div>
            <div class="nav3d-compass" id="nav3dCompass">N</div>
            <div class="nav3d-loading" id="nav3dLoading">Cargando motor 3D…</div>
            <div class="nav3d-product-card" id="nav3dProductCard"></div>
            <div class="nav3d-minimap" id="nav3dMiniMap"></div>
            <div class="nav3d-rack-popover" id="nav3dRackPopover" hidden></div>
            <div class="nav3d-hover-label" id="nav3dHoverLabel" hidden></div>
            <div class="nav3d-selection-card" id="nav3dSelectionCard"></div>
            <div class="nav3d-wms-legend" id="nav3dWmsLegend"></div>
          </div>
          <div class="nav3d-side">
            <div class="nav3d-rack-card is-primary">
              <div class="nav3d-rack-head">
                <div><b>Rack de ubicación</b><div class="muted tiny">${escapeHtml(ctx.primaryRackId || '—')}</div></div>
                <div class="nav3d-rack-tools"><button class="nav3d-rack-expand" type="button" data-rack-expand="primary">⤢</button></div>
              </div>
              <div class="nav3d-rack-stage"><svg id="nav3dRackPrimary"></svg></div>
              <div class="nav3d-rack-meta" id="nav3dRackPrimaryMeta"></div>
            </div>
            <div class="nav3d-rack-card is-store">
              <div class="nav3d-rack-head">
                <div><b>Rack de almacén</b><div class="muted tiny">${escapeHtml(ctx.storeRackId || '—')}</div></div>
                <div class="nav3d-rack-tools"><button class="nav3d-rack-expand" type="button" data-rack-expand="store">⤢</button></div>
              </div>
              <div class="nav3d-rack-stage"><svg id="nav3dRackStore"></svg></div>
              <div class="nav3d-rack-meta" id="nav3dRackStoreMeta"></div>
            </div>
          </div>
        </div>
        <div class="nav3d-rack-zoom" id="nav3dRackZoom" hidden>
          <div class="nav3d-rack-zoom-card">
            <div class="nav3d-rack-zoom-head">
              <div><div class="search-card-kicker">Vista ampliada</div><b id="nav3dRackZoomTitle">Rack</b></div>
              <div class="nav3d-rack-tools"><span class="chip" id="nav3dRackZoomChip">—</span><button class="nav3d-rack-expand" type="button" data-rack-zoom-close>✕</button></div>
            </div>
            <div class="nav3d-rack-zoom-stage"><svg id="nav3dRackZoomSvg"></svg></div>
            <div class="nav3d-rack-meta" id="nav3dRackZoomMeta"></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.classList.toggle('nav3d-presentation-clean', !!appState.ui?.nav3DPresentation);

    const canvas = modal.querySelector('#nav3dCanvas');
    const loading = modal.querySelector('#nav3dLoading');
    const compass = modal.querySelector('#nav3dCompass');
    const rackPopover = modal.querySelector('#nav3dRackPopover');
    const hoverLabel = modal.querySelector('#nav3dHoverLabel');
    const productCard = modal.querySelector('#nav3dProductCard');
    const miniMap = modal.querySelector('#nav3dMiniMap');
    const nav3dHud = modal.querySelector('#nav3dHud');
    const sectionPanel = modal.querySelector('#nav3dSectionPanel');
    const viewsPanel = modal.querySelector('#nav3dViewsPanel');
    const savedViewsList = modal.querySelector('#nav3dSavedViews');
    const selectionCard = modal.querySelector('#nav3dSelectionCard');
    const wmsLegend = modal.querySelector('#nav3dWmsLegend');
    const wmsModeSelect = modal.querySelector('#nav3dWmsMode');
    const rackPrimarySvg = modal.querySelector('#nav3dRackPrimary');
    const rackStoreSvg = modal.querySelector('#nav3dRackStore');
    const rackZoom = modal.querySelector('#nav3dRackZoom');
    const rackZoomSvg = modal.querySelector('#nav3dRackZoomSvg');
    const rackZoomTitle = modal.querySelector('#nav3dRackZoomTitle');
    const rackZoomChip = modal.querySelector('#nav3dRackZoomChip');
    const rackZoomMeta = modal.querySelector('#nav3dRackZoomMeta');
    const baseRackModel = () => rackModel(appState.selectedModelId) || appState.models?.[0] || { id:'std_4', name:'Rack estándar', levels:4, slots:2, width:120, depth:40, height:240, clearance:0, style:'metallic' };
    const makeVirtualRack = (rackId, loc, isStore=false, index=0) => {
      const model = baseRackModel();
      const parsed = parseLocationCode(loc || rackId || '', isStore ? 'ALM-E1' : 'Z1-E1');
      const id = rackId || parsed.rackId || (isStore ? 'ALM-E1' : 'Z1-E1');
      return { id, modelId:model.id, zoneId:parsed.zoneId || (isStore ? 'ALM' : 'Z1'), x:isStore ? 200 : 0, y:index * 150, w:Number(model.width || 120) || 120, h:Number(model.depth || 56) || 56, rackHeight:Number(model.height || 240) || 240, baseHeight:0, _virtual:true };
    };
    const getVirtualRacks = () => {
      const liveCtx = getViewerProductLocationContext(prod);
      const out = [];
      if(liveCtx.primaryRackId && !findRackById(liveCtx.primaryRackId)) out.push(makeVirtualRack(liveCtx.primaryRackId, liveCtx.primaryLoc, false, 0));
      if(liveCtx.storeRackId && liveCtx.storeRackId !== liveCtx.primaryRackId && !findRackById(liveCtx.storeRackId)) out.push(makeVirtualRack(liveCtx.storeRackId, liveCtx.storeLoc, true, 1));
      if(!out.length && !(appState.layout?.racks || []).length){
        out.push(makeVirtualRack(liveCtx.primaryRackId || 'Z1-E1', liveCtx.primaryLoc || 'Z1-E1-N1-S1', false, 0));
        if(liveCtx.storeRackId && liveCtx.storeRackId !== liveCtx.primaryRackId) out.push(makeVirtualRack(liveCtx.storeRackId, liveCtx.storeLoc, true, 1));
      }
      return out;
    };
    const getNav3DRacks = () => {
      const real = Array.isArray(appState.layout?.racks) ? appState.layout.racks.slice() : [];
      const realIds = new Set(real.map(r => r.id));
      getVirtualRacks().forEach(r => { if(!realIds.has(r.id)) real.push(r); });
      return real;
    };
    const nav3dRackKey = value => norm(String(value || '')).replace(/\s+/g,'');
    const findNav3DRackById = (id) => {
      const key = nav3dRackKey(id);
      if(!key) return null;
      return findRackById(id) || (appState.layout?.racks || []).find(r => nav3dRackKey(r.id) === key) || getVirtualRacks().find(r => nav3dRackKey(r.id) === key) || null;
    };
    const getTargetRackId = () => {
      const liveCtx = getViewerProductLocationContext(prod);
      if(ui.target === 'store') return liveCtx.storeRackId || prod?.rackStore || '';
      return liveCtx.primaryRackId || prod?.rack || '';
    };
    const getTargetLoc = () => {
      const liveCtx = getViewerProductLocationContext(prod);
      if(ui.target === 'both') return `${liveCtx.primaryLoc || 'Sin ubicación principal'}${liveCtx.storeLoc && liveCtx.storeLoc !== liveCtx.primaryLoc ? ' · ' + liveCtx.storeLoc : ''}`;
      return ui.target === 'store' ? (liveCtx.storeLoc || 'Sin ubicación de almacén') : (liveCtx.primaryLoc || 'Sin ubicación principal');
    };
    const getFocusSets = () => {
      const liveCtx = getViewerProductLocationContext(prod);
      const targetRackId = getTargetRackId();
      const focusRackIds = new Set([targetRackId, ui.selectedRackId, appState.ui?.nav3DSelectedRackId, appState.selectedRackLayoutId, ui.selection?.type==='rack'?ui.selection.id:''].filter(Boolean));
      if(ui.isolation === 'solo') [liveCtx.primaryRackId, liveCtx.storeRackId].filter(Boolean).forEach(id => focusRackIds.add(id));
      const focusZoneIds = new Set([ui.selection?.type==='zone'?ui.selection.id:''].filter(Boolean));
      if((ui.target === 'store' || ui.target === 'both') && prod?.zonaStore) focusZoneIds.add(prod.zonaStore);
      if((ui.target !== 'store' || ui.target === 'both') && prod?.zona) focusZoneIds.add(prod.zona);
      focusRackIds.forEach(rid => { const r = findNav3DRackById(rid); if(r?.zoneId) focusZoneIds.add(r.zoneId); });
      return { focusRackIds, focusZoneIds };
    };
    const getBounds = () => {
      const pts = [];
      (Array.isArray(appState.layout?.zones) ? appState.layout.zones : []).forEach(z => (z.pts || []).forEach(pt => pts.push({x:Number(pt.x)||0,y:Number(pt.y)||0})));
      getNav3DRacks().forEach(r => { const x=Number(r.x)||0,y=Number(r.y)||0,w=Math.max(10,Number(r.w)||80),d=Math.max(10,Number(r.h)||40); pts.push({x,y},{x:x+w,y},{x:x+w,y:y+d},{x,y:y+d}); });
      if(!pts.length) pts.push({x:-250,y:-180},{x:250,y:180});
      const minX=Math.min(...pts.map(p=>p.x)), maxX=Math.max(...pts.map(p=>p.x)), minY=Math.min(...pts.map(p=>p.y)), maxY=Math.max(...pts.map(p=>p.y));
      return { minX,maxX,minY,maxY,w:Math.max(1,maxX-minX),h:Math.max(1,maxY-minY),cx:(minX+maxX)/2,cy:(minY+maxY)/2 };
    };
    const buildRackMetaHtml = (rackId, nivel, slot, extraActive = '') => {
      const rack = findNav3DRackById(rackId);
      const model = rackModel(rack?.modelId) || baseRackModel();
      const levelCount = Math.max(1, Number(model.levels || 1) || 1);
      const slotCount = Math.max(1, Number(model.slots || model.capacity || 1) || 1);
      const activeLevel = Math.max(1, Number(nivel || 1) || 1);
      const activeSlot = Math.max(1, Number(slot || 1) || 1);
      return `<span class="nav3d-rack-badge is-active">Activo N${activeLevel} · S${activeSlot}</span><span class="nav3d-rack-badge">${levelCount} niveles</span><span class="nav3d-rack-badge">${slotCount} slots</span>${extraActive ? `<span class="nav3d-rack-badge is-accent">${escapeHtml(extraActive)}</span>` : ''}`;
    };
    const renderSideRacks = () => {
      const liveCtx = getViewerProductLocationContext(prod);
      renderRackDetail(liveCtx.primaryRackId, { nivel: prod?.nivel || 0, slot: prod?.slot || 0, label:'Ubicación', fullLabel:liveCtx.primaryLoc || 'Sin ubicación' }, rackPrimarySvg, null, findNav3DRackById(liveCtx.primaryRackId));
      renderRackDetail(liveCtx.storeRackId, { nivel: prod?.nivelStore || 0, slot: prod?.slotStore || 0, label:'Almacén', fullLabel:liveCtx.storeLoc || 'Sin ubicación de almacén' }, rackStoreSvg, null, findNav3DRackById(liveCtx.storeRackId));
      modal.querySelector('#nav3dRackPrimaryMeta').innerHTML = buildRackMetaHtml(liveCtx.primaryRackId, prod?.nivel, prod?.slot);
      modal.querySelector('#nav3dRackStoreMeta').innerHTML = buildRackMetaHtml(liveCtx.storeRackId, prod?.nivelStore, prod?.slotStore);
      modal.querySelector('.nav3d-rack-card.is-primary')?.classList.toggle('target-active', ui.target === 'primary' || ui.target === 'both');
      modal.querySelector('.nav3d-rack-card.is-store')?.classList.toggle('target-active', ui.target === 'store' || ui.target === 'both');
      renderProductOperationalCard();
      renderMiniMap();
    };
    const openRackZoom = (type) => {
      const liveCtx = getViewerProductLocationContext(prod);
      const isPrimary = type === 'primary';
      const rackId = isPrimary ? liveCtx.primaryRackId : liveCtx.storeRackId;
      const fullLabel = isPrimary ? liveCtx.primaryLoc : liveCtx.storeLoc;
      const nivel = isPrimary ? prod?.nivel : prod?.nivelStore;
      const slot = isPrimary ? prod?.slot : prod?.slotStore;
      rackZoomTitle.textContent = isPrimary ? 'Rack de ubicación' : 'Rack de almacén';
      rackZoomChip.textContent = rackId || '—';
      rackZoomMeta.innerHTML = buildRackMetaHtml(rackId, nivel, slot, fullLabel);
      renderRackDetail(rackId, { nivel, slot, label: isPrimary ? 'Ubicación' : 'Almacén', fullLabel }, rackZoomSvg, null, findNav3DRackById(rackId));
      rackZoom.hidden = false; rackZoom.classList.add('show');
    };

    let renderer = null, scene = null, camera = null, animation = 0, resizeObserver = null;
    let pulseTimer = 0, isClosed = false, visibilityHandler = null, nav3dKeyDownHandler = null, nav3dKeyUpHandler = null;
    const activePulseTargets = [];
    const initialUnifiedSelection = typeof getUnifiedLayoutSelection === 'function' ? getUnifiedLayoutSelection() : {type:'',id:''};
    const ui = { isolation:'solo', ghost:true, labels:true, route:true, visual: currentVisualMode, target: appState.ui?.nav3DTarget || 'primary', selectedRackId: appState.ui?.nav3DSelectedRackId || '', arch:false, roof:!!appState.ui?.nav3DRoof, presentation:!!appState.ui?.nav3DPresentation, wmsMode:appState.ui?.nav3DWmsMode||'occupancy', selection:{...initialUnifiedSelection}, move3D:!!appState.ui?.nav3DMoveMode };
    if(wmsModeSelect) wmsModeSelect.value=ui.wmsMode;
    const close = () => {
      if(isClosed) return;
      isClosed = true;
      cancelAnimationFrame(animation);
      clearTimeout(pulseTimer);
      resizeObserver?.disconnect();
      if(visibilityHandler) document.removeEventListener('visibilitychange', visibilityHandler);
      if(nav3dKeyDownHandler) document.removeEventListener('keydown', nav3dKeyDownHandler);
      if(nav3dKeyUpHandler) document.removeEventListener('keyup', nav3dKeyUpHandler);
      disposeThreeScene(scene, renderer);
      scene = null; camera = null; renderer = null;
      if(modal.isConnected) modal.remove();
      if(typeof isLayoutWorkspaceScreen==='function' && isLayoutWorkspaceScreen() && typeof renderLayoutEditor==='function'){
        try{ renderLayoutEditor(); }catch{}
      }
    };
    modal.__wmsDispose3D = close;
    modal.querySelector('.location-modal-close')?.addEventListener('click', close);
    modal.addEventListener('click', e => { if(e.target === modal) close(); });
    modal.querySelectorAll('[data-rack-expand]').forEach(btn => btn.addEventListener('click', () => openRackZoom(btn.dataset.rackExpand)));
    modal.querySelector('[data-rack-zoom-close]')?.addEventListener('click', () => { rackZoom.hidden=true; rackZoom.classList.remove('show'); });
    rackZoom?.addEventListener('click', e => { if(e.target === rackZoom){ rackZoom.hidden=true; rackZoom.classList.remove('show'); } });

    appState.ui.nav3DArchitectural = false;
    if(ui.wmsMode === 'architecture') ui.wmsMode = 'occupancy';
    const syncToolbar = () => {
      modal.querySelectorAll('[data-nav3d-action="all"],[data-nav3d-action="zone"],[data-nav3d-action="rack"],[data-nav3d-action="solo"]').forEach(b => b.classList.toggle('active', b.dataset.nav3dAction === ui.isolation));
      modal.querySelector('[data-nav3d-action="ghost"]')?.classList.toggle('active', ui.ghost);
      modal.querySelector('[data-nav3d-action="labels"]')?.classList.toggle('active', ui.labels);
      modal.querySelector('[data-nav3d-action="route"]')?.classList.toggle('active', ui.route);
      modal.querySelectorAll('[data-nav3d-action^="visual-"]').forEach(b => b.classList.toggle('active', b.dataset.nav3dAction === `visual-${ui.visual}`));
      modal.querySelector('[data-nav3d-action="wall-cut"]')?.classList.toggle('active', !!appState.ui?.nav3DWallCut);
      modal.querySelector('[data-nav3d-action="arch-mode"]')?.classList.toggle('active', !!appState.ui?.nav3DArchitectural);
      modal.querySelector('[data-nav3d-action="presentation-mode"]')?.classList.toggle('active', !!appState.ui?.nav3DPresentation);
      modal.querySelector('[data-nav3d-action="roof-toggle"]')?.classList.toggle('active', !!appState.ui?.nav3DRoof);
      modal.querySelector('[data-nav3d-action="arch-details"]')?.classList.toggle('active', appState.ui?.nav3DShowArchitecturalDetails !== false);
      const sectionUi=appState.ui?.nav3DSection||{}; const sectionActive=!!(sectionUi.box||sectionUi.axes?.x||sectionUi.axes?.y||sectionUi.axes?.z);
      modal.querySelector('[data-nav3d-action="section-panel"]')?.classList.toggle('active', sectionActive || !sectionPanel?.hidden);
      modal.querySelector('[data-nav3d-action="views-panel"]')?.classList.toggle('active', !viewsPanel?.hidden);
      modal.querySelector('[data-nav3d-action="first-person"]')?.classList.toggle('active', modal.classList.contains('nav3d-first-person'));
      modal.querySelectorAll('[data-nav3d-target]').forEach(b => b.classList.toggle('active', b.dataset.nav3dTarget === ui.target));
      if(wmsModeSelect) wmsModeSelect.value=ui.wmsMode;
      canvas?.classList.toggle('nav3d-move-enabled',!!ui.move3D);
      modal.dataset.wms3dMode=ui.wmsMode;
    };

    const rackStatsForPopover = (rackId) => {
      const rack = findNav3DRackById(rackId);
      const model = rackModel(rack?.modelId) || baseRackModel();
      const levelCount = Math.max(1, Number(model.levels || 1) || 1);
      const slotCount = Math.max(1, Number(model.slots || model.capacity || 1) || 1);
      const liveCtx = getViewerProductLocationContext(prod);
      const isPrimary = rackId && rackId === liveCtx.primaryRackId;
      const isStore = rackId && rackId === liveCtx.storeRackId;
      const level = isPrimary ? (prod?.nivel || 1) : (isStore ? (prod?.nivelStore || 1) : 1);
      const slot = isPrimary ? (prod?.slot || 1) : (isStore ? (prod?.slotStore || 1) : 1);
      return { rack, model, levelCount, slotCount, level, slot, isPrimary, isStore };
    };
    const renderRackPopover = (rackId) => {
      if(!rackPopover) return;
      const { rack, levelCount, slotCount, level, slot, isPrimary, isStore } = rackStatsForPopover(rackId);
      if(!rack || !rackId){ rackPopover.hidden = true; return; }
      const zone = rack.zoneId || (isStore ? 'Almacén' : 'Zona');
      rackPopover.hidden = false;
      rackPopover.innerHTML = `
        <div class="nav3d-popover-head"><span>${isPrimary ? 'Ubicación' : isStore ? 'Almacén' : 'Rack'}</span><b>${escapeHtml(rackId)}</b></div>
        <div class="nav3d-popover-grid compact">
          <span>Zona</span><b>${escapeHtml(zone)}</b>
          <span>Activo</span><b>N${escapeHtml(String(level))} · S${escapeHtml(String(slot))}</b>
        </div>
        <div class="nav3d-popover-actions">
          <button type="button" data-popover-action="center">Enfocar slot</button>
        </div>`;
    };

    const renderProductOperationalCard = () => {
      if(!productCard) return;
      const liveCtx = getViewerProductLocationContext(prod);
      const isBoth = ui.target === 'both';
      const targetLoc = getTargetLoc();
      const level = ui.target === 'store' ? (prod?.nivelStore || '—') : (prod?.nivel || '—');
      const slot = ui.target === 'store' ? (prod?.slotStore || '—') : (prod?.slot || '—');
      const rackId = ui.target === 'store' ? (liveCtx.storeRackId || prod?.rackStore || '—') : (liveCtx.primaryRackId || prod?.rack || '—');
      productCard.innerHTML = `
        <div class="nav3d-product-topline compact">
          <div>
            <div class="nav3d-product-kicker">Producto activo</div>
            <b>${escapeHtml(prod?.nombre || 'Producto sin nombre')}</b>
          </div>
          <div class="nav3d-product-sku">${escapeHtml(prod?.sku || 'SKU —')}</div>
        </div>
        <div class="nav3d-product-inline-location">${escapeHtml(isBoth ? `${liveCtx.primaryLoc || '—'} · ${liveCtx.storeLoc || '—'}` : targetLoc)}</div>
        ${isBoth ? `
          <div class="nav3d-product-focus dual">
            <span class="nav3d-focus-pill">Ubicación <b>${escapeHtml(liveCtx.primaryRackId || '—')}</b></span>
            <span class="nav3d-focus-pill">Almacén <b>${escapeHtml(liveCtx.storeRackId || '—')}</b></span>
          </div>` : `
          <div class="nav3d-product-focus">
            <span class="nav3d-focus-pill">Rack <b>${escapeHtml(rackId)}</b></span>
            <span class="nav3d-focus-pill">Nivel <b>${escapeHtml(String(level))}</b></span>
            <span class="nav3d-focus-pill nav3d-focus-pill-slot">Slot <b>${escapeHtml(String(slot))}</b></span>
          </div>`}
        <div class="nav3d-product-actions nav3d-product-actions-focused compact">
          <button type="button" data-nav3d-product-action="center">Enfocar slot</button>
          <button type="button" data-nav3d-product-action="isolate">Aislar rack</button>
        </div>`;
    };
    const productStockValue = p => {
      const candidates=[p?.stock,p?.restock,p?.cantidad,p?.quantity,p?.qty];
      for(const v of candidates){ const n=Number(v); if(Number.isFinite(n)) return Math.max(0,n); }
      return 1;
    };
    const productsForRack = rackId => (appState.products||[]).filter(p=>p?.rack===rackId||p?.rackStore===rackId);
    const dominantValue = (items,keys) => {
      const counts=new Map(); items.forEach(p=>{ let value=''; for(const key of keys){value=String(p?.[key]||'').trim();if(value)break;} if(value)counts.set(value,(counts.get(value)||0)+1); });
      return [...counts.entries()].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0])))[0]?.[0]||'Sin dato';
    };
    const rackOperationalMetric = rack => {
      if(!rack)return {products:0,stock:0,capacity:1,occupied:0,ratio:0,category:'Sin dato',brand:'Sin dato'};
      const items=productsForRack(rack.id); const model=rackModel(rack.modelId)||baseRackModel(); const levels=Math.max(1,Number(model.levels||1)||1),slots=Math.max(1,Number(model.slots||model.capacity||1)||1);
      const occupiedKeys=new Set(); items.forEach(p=>{ const store=p?.rackStore===rack.id; const level=Math.max(1,Number(store?p?.nivelStore:p?.nivel)||1),slot=Math.max(1,Number(store?p?.slotStore:p?.slot)||1); occupiedKeys.add(`${level}:${slot}`); });
      const capacity=Math.max(1,levels*slots); const occupied=Math.min(capacity,occupiedKeys.size);
      return {products:items.length,stock:items.reduce((sum,p)=>sum+productStockValue(p),0),capacity,occupied,ratio:Math.max(0,Math.min(1,occupied/capacity)),category:dominantValue(items,['categoria','category']),brand:dominantValue(items,['marca','brand'])};
    };
    const zoneAreaM2 = zone => { try{return polygonAreaAbs(zone?.pts||[])*getScaleCmPerUnit()*getScaleCmPerUnit()/10000;}catch{return 0;} };
    const renderSelectionCard = () => {
      if(!selectionCard)return; const sel=ui.selection||{type:'',id:''};
      if(!sel.type||!sel.id){ selectionCard.innerHTML='<div class="nav3d-selection-empty"><b>Selección 2D ↔ 3D</b><span>Haz clic en una zona, muro, abertura o rack.</span></div>'; return; }
      if(sel.type==='rack'){ const r=findNav3DRackById(sel.id); if(!r){selectionCard.innerHTML='';return;} const m=rackOperationalMetric(r),model=rackModel(r.modelId)||baseRackModel(),editable=typeof isRackDistributionScreen==='function'&&isRackDistributionScreen(); selectionCard.innerHTML=`<div class="nav3d-selection-head"><span>Rack</span><b>${escapeHtml(r.id)}</b></div><div class="nav3d-selection-grid"><span>Zona</span><b>${escapeHtml(r.zoneId||'—')}</b><span>Modelo</span><b>${escapeHtml(model.name||model.id||'—')}</b><span>Ocupación</span><b>${Math.round(m.ratio*100)}% · ${m.occupied}/${m.capacity}</b><span>Stock cargado</span><b>${Math.round(m.stock)}</b></div>${editable?`<div class="nav3d-selection-edit three"><label>X<input data-selection-field="rack-x" type="number" step="1" value="${Math.round(Number(r.x||0))}"></label><label>Y<input data-selection-field="rack-y" type="number" step="1" value="${Math.round(Number(r.y||0))}"></label><label>Rotación<input data-selection-field="rack-rot" type="number" step="1" value="${Math.round(Number(r.rot||0))}"></label></div>`:'<div class="tiny muted">Rack bloqueado fuera de Distribución.</div>'}<div class="nav3d-selection-actions"><button data-selection-action="focus">Centrar</button><button data-selection-action="isolate">Aislar</button>${editable?`<button class="${ui.move3D?'active':''}" data-selection-action="move-toggle">${ui.move3D?'Mover 3D activo':'Mover en 3D'}</button>`:''}</div>`; return; }
      if(sel.type==='wall'){ const w=findWallById(sel.id); if(!w){selectionCard.innerHTML='';return;} const editable=typeof isStructureLayoutScreen==='function'&&isStructureLayoutScreen(); selectionCard.innerHTML=`<div class="nav3d-selection-head"><span>Muro</span><b>${escapeHtml(w.id)}</b></div><div class="nav3d-selection-grid"><span>Longitud</span><b>${escapeHtml(typeof formatDistanceCm==='function'?formatDistanceCm(wallLength(w)):Math.round(wallLength(w))+' cm')}</b><span>Muros compartidos</span><b>${escapeHtml(String(w.sharedWith?.length||w.roomIds?.length||0))}</b></div>${editable?`<div class="nav3d-selection-edit two"><label>Espesor<input data-selection-field="wall-thickness" type="number" min="4" step="1" value="${Math.round(Number(w.thickness||14))}"></label><label>Altura<input data-selection-field="wall-height" type="number" min="80" step="1" value="${Math.round(Number(w.height||290))}"></label></div>`:'<div class="tiny muted">La estructura está protegida en este modo.</div>'}<div class="nav3d-selection-actions"><button data-selection-action="focus">Centrar</button><button data-selection-action="isolate-zone">Mostrar zona</button></div>`; return; }
      if(sel.type==='opening'){ const o=(appState.layout.openings||[]).find(x=>x.id===sel.id),w=o?findWallById(o.wallId):null; if(!o||!w){selectionCard.innerHTML='';return;} const editable=typeof isStructureLayoutScreen==='function'&&isStructureLayoutScreen(); selectionCard.innerHTML=`<div class="nav3d-selection-head"><span>Abertura</span><b>${escapeHtml(o.id)}</b></div><div class="nav3d-selection-grid"><span>Tipo</span><b>${escapeHtml(normalizeOpeningType(o.type))}</b><span>Muro</span><b>${escapeHtml(o.wallId||'—')}</b></div>${editable?`<div class="nav3d-selection-edit four"><label>Ancho<input data-selection-field="opening-width" type="number" min="20" step="1" value="${Math.round(Number(o.width||90))}"></label><label>Alto<input data-selection-field="opening-height" type="number" min="20" step="1" value="${Math.round(Number(o.height||210))}"></label><label>Cota inferior<input data-selection-field="opening-sill" type="number" min="0" step="1" value="${Math.round(Number(o.sill||0))}"></label><label>Posición %<input data-selection-field="opening-t" type="number" min="1" max="99" step="1" value="${Math.round(Number(o.t||.5)*100)}"></label></div>`:'<div class="tiny muted">Abertura protegida fuera de Estructura.</div>'}<div class="nav3d-selection-actions"><button data-selection-action="focus">Centrar</button></div>`; return; }
      if(sel.type==='zone'){ const z=findZoneById(sel.id); if(!z){selectionCard.innerHTML='';return;} const racks=(appState.layout.racks||[]).filter(r=>r.zoneId===z.id); selectionCard.innerHTML=`<div class="nav3d-selection-head"><span>Zona</span><b>${escapeHtml(z.name||z.id)}</b></div><div class="nav3d-selection-grid"><span>ID</span><b>${escapeHtml(z.id)}</b><span>Área</span><b>${zoneAreaM2(z).toFixed(2)} m²</b><span>Racks</span><b>${racks.length}</b><span>Adyacentes</span><b>${typeof v128ZoneRelations==='function'?(v128ZoneRelations(z.id)||[]).length:'—'}</b></div><div class="nav3d-selection-actions"><button data-selection-action="focus">Centrar</button><button data-selection-action="isolate">Aislar zona</button></div>`; return; }
      selectionCard.innerHTML='';
    };
    const renderWmsLegend = () => {
      if(!wmsLegend)return; const labels={zones:'Zonas',occupancy:'Ocupación',stock:'Stock',category:'Categoría',brand:'Marca'}; const racks=getNav3DRacks(); const metrics=racks.map(r=>rackOperationalMetric(r)); const occupied=metrics.filter(m=>m.occupied>0).length; const stock=Math.round(metrics.reduce((a,m)=>a+m.stock,0));
      wmsLegend.innerHTML=`<div class="nav3d-wms-legend-head"><b>${labels[ui.wmsMode]||'Ocupación'}</b><span>${racks.length} racks</span></div>${ui.wmsMode==='occupancy'?'<div class="nav3d-wms-gradient"><i></i><span>Vacío</span><span>Completo</span></div>':''}<div class="nav3d-wms-stats"><span>${occupied} con producto</span><span>${stock} stock cargado</span></div>`;
    };

    const renderMiniMap = () => {
      if(!miniMap) return;
      const b = getBounds();
      const w = 210, h = 140, pad = 14;
      const sx = (x) => pad + ((Number(x||0) - b.minX) / Math.max(1,b.w)) * (w - pad*2);
      const sy = (y) => pad + ((Number(y||0) - b.minY) / Math.max(1,b.h)) * (h - pad*2);
      const { focusRackIds, focusZoneIds } = getFocusSets();
      const zones = Array.isArray(appState.layout?.zones) ? appState.layout.zones : [];
      const zonePaths = zones.map(z => {
        const pts = (z.pts || []).map((pt,i) => `${i?'L':'M'} ${sx(pt.x).toFixed(1)} ${sy(pt.y).toFixed(1)}`).join(' ');
        const active = focusZoneIds.has(z.id);
        return `<path d="${pts} Z" class="${active?'active':''}"/>`;
      }).join('');
      const rackDots = getNav3DRacks().map(r => {
        const cx = sx(Number(r.x||0)+Number(r.w||80)/2), cy = sy(Number(r.y||0)+Number(r.h||40)/2);
        const active = focusRackIds.has(r.id);
        return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${active?4.4:2.4}" class="${active?'active':''}"><title>${escapeHtml(r.id)}</title></circle>`;
      }).join('');
      const targetLabel = ui.target === 'store' ? 'Almacén activo' : ui.target === 'both' ? 'Ubicaciones activas' : 'Rack activo';
      miniMap.innerHTML = `<div class="nav3d-mini-head"><b>Mini mapa</b><span>${escapeHtml(getTargetRackId() || '—')}</span></div><div class="nav3d-mini-sub">${targetLabel}</div><svg viewBox="0 0 ${w} ${h}" aria-label="Mini mapa de layout">${zonePaths}${rackDots}</svg>`;
    };

    renderSelectionCard();
    renderWmsLegend();
    loadThreeRuntime().then(THREE => {
      loading?.remove();
      renderSideRacks();
      const visualProfiles = {
        oscuro: { bg:0x061018, fog:.022, exposure:1.10, ambient:.52, hemi:.95, key:2.8, fill:.78, rim:1.15, active:2.0, floor:0x0b1722, floorA:'#102235', floorB:'#091827', floorC:'#07121d', grid:.36, ghost:.12, wire:.22 },
        operativo: { bg:0x081722, fog:.014, exposure:1.48, ambient:.82, hemi:1.42, key:3.75, fill:1.15, rim:1.55, active:2.9, floor:0x132638, floorA:'#183149', floorB:'#102338', floorC:'#0c1b2c', grid:.58, ghost:.20, wire:.40 },
        claro: { bg:0x0d2232, fog:.010, exposure:1.72, ambient:1.05, hemi:1.70, key:4.25, fill:1.38, rim:1.75, active:3.2, floor:0x1a3347, floorA:'#234159', floorB:'#173047', floorC:'#102538', grid:.68, ghost:.26, wire:.52 },
        presentacion: { bg:0xe7ecef, fog:.0045, exposure:1.18, ambient:1.35, hemi:1.65, key:3.15, fill:1.05, rim:.72, active:2.35, floor:0xcfd5d8, floorA:'#d8dddf', floorB:'#c9d0d4', floorC:'#c0c7cb', grid:0, ghost:.08, wire:.18 }
      };
      const presentationMode = !!appState.ui?.nav3DPresentation;
      const visual = presentationMode ? visualProfiles.presentacion : (visualProfiles[ui.visual] || visualProfiles.operativo);
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const pickables = [];
      const rackObjectMap = new Map();
      const instancedRackLookup = new Map();
      let selectionHelper = null, selectionGizmo = null, rackDrag = null;
      let hoveredRackId = '', hoveredEntityKey = '';
      let downX = 0, downY = 0, downTime = 0, downMoved = false;
      scene = new THREE.Scene();
      scene.background = new THREE.Color(visual.bg);
      scene.fog = new THREE.FogExp2(visual.bg, visual.fog);
      renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:false, powerPreference:'high-performance' });
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = visual.exposure;
      camera = new THREE.PerspectiveCamera(presentationMode ? 36 : 42, 1, .1, 500);
      const ambient = new THREE.AmbientLight(0xc7e7ff, visual.ambient); scene.add(ambient);
      const hemi = new THREE.HemisphereLight(0xf2fbff, 0x153047, visual.hemi); scene.add(hemi);
      const key = new THREE.DirectionalLight(0xffffff, visual.key); key.position.set(16,38,22); key.castShadow = true; key.shadow.mapSize.set(1024,1024); key.shadow.camera.near=.5; key.shadow.camera.far=90; key.shadow.camera.left=-38; key.shadow.camera.right=38; key.shadow.camera.top=38; key.shadow.camera.bottom=-38; scene.add(key);
      const fill = new THREE.DirectionalLight(0x8fc5ff, visual.fill); fill.position.set(-26,18,24); scene.add(fill);
      const rim = new THREE.DirectionalLight(0x70ffb1, visual.rim); rim.position.set(-22,24,-18); scene.add(rim);
      const activeLight = new THREE.PointLight(0x57ff98, visual.active, 26, 1.7); activeLight.position.set(0, 5.2, 0); scene.add(activeLight);

      const bounds = getBounds();
      const scale = 0.035;
      const hScale = 0.020;
      const metricsByRack = new Map(getNav3DRacks().map(r=>[r.id,rackOperationalMetric(r)]));
      const maxRackStock = Math.max(1,...[...metricsByRack.values()].map(m=>Number(m.stock||0)));
      const stringColor = value => {
        const text=String(value||'Sin dato'); let h=2166136261; for(let i=0;i<text.length;i++){h^=text.charCodeAt(i);h=Math.imul(h,16777619);}
        const hue=((h>>>0)%360)/360; const c=new THREE.Color(); c.setHSL(hue,.58,.55); return c;
      };
      const rackVisualColor = rack => {
        const metric=metricsByRack.get(rack?.id)||rackOperationalMetric(rack), zone=findZoneById(rack?.zoneId);
        if(ui.wmsMode==='zones') return new THREE.Color(zone?.color||'#6f93aa');
        if(ui.wmsMode==='occupancy'){ const c=new THREE.Color(); c.setHSL(.34*(1-Math.max(0,Math.min(1,metric.ratio))),.78,.50); return c; }
        if(ui.wmsMode==='stock'){ const ratio=Math.max(0,Math.min(1,Number(metric.stock||0)/maxRackStock)); const c=new THREE.Color(); c.setHSL(.60*(1-ratio),.76,.52); return c; }
        if(ui.wmsMode==='category') return stringColor(metric.category);
        if(ui.wmsMode==='brand') return stringColor(metric.brand);
        return new THREE.Color(0x3e6f8f);
      };
      const world = new THREE.Group(); scene.add(world);
      // V49: sistema único layout 2D → mundo 3D.
      // El editor usa X hacia la derecha e Y hacia abajo. En Three.js usamos X igual y Z como profundidad positiva,
      // para que una vista superior conserve la misma lectura del plano 2D.
      const layoutToWorld = (x, y, z=0) => new THREE.Vector3((Number(x||0)-bounds.cx)*scale, z*hScale, (Number(y||0)-bounds.cy)*scale);
      const layoutToShapePoint = (pt) => new THREE.Vector2((Number(pt?.x||0)-bounds.cx)*scale, -(Number(pt?.y||0)-bounds.cy)*scale);
      const toWorld = layoutToWorld;
      const rackYaw = (r) => -THREE.MathUtils.degToRad(Number(r?.rot || 0) || 0);
      const makeFloorTexture = () => {
        const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
        const g = c.getContext('2d');
        const grad = g.createLinearGradient(0,0,1024,1024);
        grad.addColorStop(0, visual.floorA); grad.addColorStop(.55, visual.floorB); grad.addColorStop(1, visual.floorC);
        g.fillStyle = grad; g.fillRect(0,0,1024,1024);
        g.strokeStyle = ui.visual === 'oscuro' ? 'rgba(125,210,185,.13)' : 'rgba(145,225,205,.18)'; g.lineWidth = 1;
        for(let i=0;i<=1024;i+=64){ g.beginPath(); g.moveTo(i,0); g.lineTo(i,1024); g.stroke(); g.beginPath(); g.moveTo(0,i); g.lineTo(1024,i); g.stroke(); }
        g.strokeStyle = ui.visual === 'oscuro' ? 'rgba(255,190,72,.20)' : 'rgba(255,205,82,.30)'; g.lineWidth = 3;
        for(let i=128;i<1024;i+=256){ g.beginPath(); g.moveTo(0,i); g.lineTo(1024,i); g.stroke(); }
        g.fillStyle = 'rgba(255,255,255,.025)';
        for(let i=0;i<180;i++){ const x=Math.random()*1024,y=Math.random()*1024; g.fillRect(x,y,1.2,1.2); }
        const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(2,2); return tex;
      };
      const floorW = Math.max(12, bounds.w*scale + 6), floorD = Math.max(12, bounds.h*scale + 6);
      const { focusRackIds, focusZoneIds } = getFocusSets();
      const layoutZonesRaw = Array.isArray(appState.layout?.zones) ? appState.layout.zones.filter(z => (z.pts || []).length >= 3) : [];
      // V62: mantener el layout completo como referencia espacial. Las zonas fuera del foco quedan en modo ghost,
      // mientras que la zona activa conserva mayor presencia visual.
      const layoutZones = layoutZonesRaw;
      const floorMat = new THREE.MeshStandardMaterial({ color:visual.floor, map:layoutZones.length ? null : makeFloorTexture(), roughness:.46, metalness:.22, envMapIntensity:.45, transparent:!!layoutZones.length, opacity:layoutZones.length ? .055 : 1 });
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(floorW, floorD), floorMat); floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; world.add(floor);
      const grid = new THREE.GridHelper(Math.max(floorW,floorD), Math.max(12, Math.round(Math.max(floorW,floorD)*2.6)), 0x6ff0b4, 0x2f6680); grid.position.y=.028; grid.material.transparent = true; grid.material.opacity = presentationMode ? 0 : (appState.ui?.nav3DArchitectural ? Math.min(.16, visual.grid*.24) : Math.min(.34, visual.grid*.48)); world.add(grid);

      // v130 — cortes X/Y/Z y caja de sección en coordenadas reales del mundo 3D.
      const defaultSectionState = () => ({
        axes:{x:false,y:false,z:false}, values:{x:50,y:50,z:70}, dirs:{x:1,y:1,z:-1}, box:false,
        boxValues:{xMin:5,xMax:95,yMin:5,yMax:95,zMin:0,zMax:100}
      });
      const sectionState = (() => {
        const current=appState.ui?.nav3DSection;
        const base=defaultSectionState();
        if(!current || typeof current!=='object'){ appState.ui.nav3DSection=base; return base; }
        current.axes={...base.axes,...(current.axes||{})}; current.values={...base.values,...(current.values||{})}; current.dirs={...base.dirs,...(current.dirs||{})}; current.boxValues={...base.boxValues,...(current.boxValues||{})}; current.box=!!current.box;
        return current;
      })();
      const sectionWorldBounds={xMin:-floorW/2,xMax:floorW/2,zMin:-floorD/2,zMax:floorD/2,yMin:-.06,yMax:12};
      const pctRange=(a,b,p)=>a+(b-a)*(Math.max(0,Math.min(100,Number(p||0)))/100);
      const sectionIsActive=()=>!!(sectionState.box||sectionState.axes.x||sectionState.axes.y||sectionState.axes.z);
      const buildSectionPlanes=()=>{
        const planes=[];
        if(sectionState.box){
          const v=sectionState.boxValues;
          const xmin=pctRange(sectionWorldBounds.xMin,sectionWorldBounds.xMax,v.xMin), xmax=pctRange(sectionWorldBounds.xMin,sectionWorldBounds.xMax,v.xMax);
          const zmin=pctRange(sectionWorldBounds.zMin,sectionWorldBounds.zMax,v.yMin), zmax=pctRange(sectionWorldBounds.zMin,sectionWorldBounds.zMax,v.yMax);
          const ymin=pctRange(sectionWorldBounds.yMin,sectionWorldBounds.yMax,v.zMin), ymax=pctRange(sectionWorldBounds.yMin,sectionWorldBounds.yMax,v.zMax);
          planes.push(new THREE.Plane(new THREE.Vector3(1,0,0),-xmin),new THREE.Plane(new THREE.Vector3(-1,0,0),xmax),new THREE.Plane(new THREE.Vector3(0,0,1),-zmin),new THREE.Plane(new THREE.Vector3(0,0,-1),zmax),new THREE.Plane(new THREE.Vector3(0,1,0),-ymin),new THREE.Plane(new THREE.Vector3(0,-1,0),ymax));
        }else{
          if(sectionState.axes.x){ const c=pctRange(sectionWorldBounds.xMin,sectionWorldBounds.xMax,sectionState.values.x),d=sectionState.dirs.x<0?-1:1; planes.push(new THREE.Plane(new THREE.Vector3(d,0,0),-d*c)); }
          if(sectionState.axes.y){ const c=pctRange(sectionWorldBounds.zMin,sectionWorldBounds.zMax,sectionState.values.y),d=sectionState.dirs.y<0?-1:1; planes.push(new THREE.Plane(new THREE.Vector3(0,0,d),-d*c)); }
          if(sectionState.axes.z){ const c=pctRange(sectionWorldBounds.yMin,sectionWorldBounds.yMax,sectionState.values.z),d=sectionState.dirs.z<0?-1:1; planes.push(new THREE.Plane(new THREE.Vector3(0,d,0),-d*c)); }
        }
        return planes;
      };
      const applySectionClipping=()=>{
        const planes=buildSectionPlanes(); renderer.localClippingEnabled=planes.length>0;
        world.traverse(obj=>{
          if(obj?.userData?.isArchitecturalRoof) obj.visible=!sectionIsActive() && !!appState.ui?.nav3DRoof;
          const mats=Array.isArray(obj?.material)?obj.material:(obj?.material?[obj.material]:[]);
          mats.forEach(mat=>{ if(!mat)return; mat.clippingPlanes=planes; mat.clipShadows=true; mat.needsUpdate=true; });
        });
        if(sectionIsActive()) appState.ui.nav3DRoof=false;
      };
      const renderSectionPanel=()=>{
        if(!sectionPanel)return;
        ['x','y','z'].forEach(axis=>{
          sectionPanel.querySelector(`[data-section-axis="${axis}"]`)?.classList.toggle('active',!!sectionState.axes[axis]);
          const range=sectionPanel.querySelector(`[data-section-range="${axis}"]`); if(range)range.value=String(sectionState.values[axis]);
          const value=sectionPanel.querySelector(`[data-section-value="${axis}"]`); if(value)value.textContent=`${Math.round(Number(sectionState.values[axis]||0))}%`;
          const dir=sectionPanel.querySelector(`[data-section-dir="${axis}"]`); if(dir)dir.classList.toggle('active',sectionState.dirs[axis]<0);
        });
        sectionPanel.querySelector('[data-section-box]')?.classList.toggle('active',!!sectionState.box);
        Object.entries(sectionState.boxValues).forEach(([key,val])=>{ const el=sectionPanel.querySelector(`[data-box-range="${key}"]`); if(el)el.value=String(val); });
      };

      const DEFAULT_WALL_HEIGHT = 290;
      const DEFAULT_WALL_THICKNESS = 14;
      const buildWallSegmentsFromLayout = () => {
        try { syncZonePerimeterWalls(); ensureLayoutDecorations(); } catch(_err) {}
        const walls = Array.isArray(appState.layout?.walls) ? appState.layout.walls : [];
        return walls.map(w => {
          const linkedZoneIds=[];
          if(!w.autoZoneEdge && w.startNodeId && w.endNodeId){
            (appState.layout?.rooms||[]).forEach(room=>{
              const ids=room.nodeIds||[];
              for(let i=0;i<ids.length;i++){ const a=ids[i],b=ids[(i+1)%ids.length]; if((a===w.startNodeId&&b===w.endNodeId)||(a===w.endNodeId&&b===w.startNodeId)){ const z=getRoomLinkedZone(room); if(z) linkedZoneIds.push(z.id); break; } }
            });
          }
          return {
          raw:w,
          a:{ x:Number(w.x1||0), y:Number(w.y1||0) },
          b:{ x:Number(w.x2||0), y:Number(w.y2||0) },
          zoneIds:new Set([w.zoneId,...linkedZoneIds].filter(Boolean)),
          thickness:Number(w.thickness || DEFAULT_WALL_THICKNESS),
          height:Number(w.height || DEFAULT_WALL_HEIGHT),
          id:w.id,
          type:w.kind || 'wall',
          autoZoneEdge:!!w.autoZoneEdge,
          zoneId:w.zoneId || '',
          edgeIndex:Number(w.edgeIndex),
          side:getWallSideSign(w.side)
        }; }).filter(seg => Math.hypot(seg.b.x - seg.a.x, seg.b.y - seg.a.y) > 2);
      };
      const getSegmentNormal = (seg) => {
        if(seg?.autoZoneEdge && seg.zoneId && Number.isFinite(seg.edgeIndex)){
          const zone = findZoneById(seg.zoneId);
          if(zone?.pts?.[seg.edgeIndex] && zone?.pts?.[(seg.edgeIndex + 1) % zone.pts.length]){
            const a = zone.pts[seg.edgeIndex];
            const b = zone.pts[(seg.edgeIndex + 1) % zone.pts.length];
            const n = getZoneOutwardEdgeNormal(zone, a, b);
            return { x:n.x * getWallSideSign(seg.side), y:n.y * getWallSideSign(seg.side) };
          }
        }
        const dx = Number(seg.b?.x||0) - Number(seg.a?.x||0);
        const dy = Number(seg.b?.y||0) - Number(seg.a?.y||0);
        const len = Math.hypot(dx, dy) || 1;
        return { x:-dy/len, y:dx/len };
      };
      const makeWallPrismGeometry = (footprint=[], height=2.8) => {
        const pts = (footprint || []).filter(Boolean).map(pt => ({
          x:(Number(pt.x || 0) - bounds.cx) * scale,
          z:(Number(pt.y || 0) - bounds.cy) * scale
        }));
        if(pts.length < 3 || !Number.isFinite(height) || height <= 0) return null;
        const positions = [];
        pts.forEach(pt => positions.push(pt.x, 0, pt.z));
        pts.forEach(pt => positions.push(pt.x, height, pt.z));
        const indices = [];
        const n = pts.length;
        for(let i=1; i<n-1; i++){
          indices.push(0, i+1, i);
          indices.push(n, n+i, n+i+1);
        }
        for(let i=0; i<n; i++){
          const j = (i + 1) % n;
          indices.push(i, j, n+j);
          indices.push(i, n+j, n+i);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        geo.computeBoundingBox();
        geo.computeBoundingSphere();
        return geo;
      };
      const makeWallBandGeometry = (seg, t0, t1, y0, y1, thicknessUnits, offsetUnits=0) => {
        const height = Math.max(.02, Number(y1 || 0) - Number(y0 || 0));
        if(t1 - t0 <= .002 || height <= .02) return null;
        const ax = Number(seg.a?.x || 0), ay = Number(seg.a?.y || 0);
        const bx = Number(seg.b?.x || 0), by = Number(seg.b?.y || 0);
        const n = getSegmentNormal(seg);
        const a = { x:ax + (bx-ax)*t0, y:ay + (by-ay)*t0 };
        const b = { x:ax + (bx-ax)*t1, y:ay + (by-ay)*t1 };
        const offset = Number(offsetUnits || 0);
        const footprint = [
          { x:a.x + n.x*offset, y:a.y + n.y*offset },
          { x:b.x + n.x*offset, y:b.y + n.y*offset },
          { x:b.x + n.x*(offset + thicknessUnits), y:b.y + n.y*(offset + thicknessUnits) },
          { x:a.x + n.x*(offset + thicknessUnits), y:a.y + n.y*(offset + thicknessUnits) }
        ];
        const basePts = footprint.map(pt => ({ x:(Number(pt.x || 0)-bounds.cx)*scale, z:(Number(pt.y || 0)-bounds.cy)*scale }));
        const positions = [];
        basePts.forEach(pt => positions.push(pt.x, y0, pt.z));
        basePts.forEach(pt => positions.push(pt.x, y1, pt.z));
        const indices = [0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7];
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        geo.computeBoundingBox();
        geo.computeBoundingSphere();
        return geo;
      };
      const getWallOpeningsForSegment = (seg, rawLengthUnits) => {
        const wallOpenings = (appState.layout?.openings || []).filter(o => o.wallId === seg.id);
        return wallOpenings.map(o => {
          const width = Math.max(40, Math.min(rawLengthUnits * .86, Number(o.width || (o.type === 'window' ? 120 : 90)) || 90));
          const half = (width / 2) / Math.max(1, rawLengthUnits);
          const t = Math.max(half, Math.min(1-half, Number(o.t || .5)));
          const type = normalizeOpeningType(o.type);
          const def = openingDefaultForType(type);
          const sillUnits = (type==='door' || type==='gate') ? 0 : Math.max(0, Number(o.sill ?? def.sill) || 0);
          const heightUnits = Math.max(20, Number(o.height || def.height) || def.height);
          return { ...o, t, t0:Math.max(0, t-half), t1:Math.min(1, t+half), sillUnits, heightUnits };
        }).sort((a,b)=>a.t0-b.t0);
      };
      const addWallMesh = (group, geo, mat, isActive, wallId='') => {
        if(!geo) return null;
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData.wallId = wallId || '';
        mesh.userData.entityType = 'wall';
        group.add(mesh);
        pickables.push(mesh);
        const edgeOpacity = presentationMode ? (isActive ? .34 : .10) : (isActive ? .70 : .36);
        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(geo),
          new THREE.LineBasicMaterial({ color:presentationMode ? 0x697985 : (isActive ? 0xffffff : 0xd7e7f4), transparent:true, opacity:edgeOpacity })
        );
        group.add(edges);
        return mesh;
      };
      const addArchitecturalBaseboards = (group, seg, openings, thicknessUnits, isActive) => {
        if(!appState.ui?.nav3DArchitectural || appState.ui?.nav3DShowArchitecturalDetails === false) return;
        const blockers=(openings||[]).filter(o=>['door','gate','free'].includes(normalizeOpeningType(o.type)) && Number(o.sillUnits||0) < 8).sort((a,b)=>a.t0-b.t0);
        const ranges=[]; let cursor=0;
        blockers.forEach(o=>{ const a=Math.max(cursor,Number(o.t0||0)), b=Math.max(a,Number(o.t1||0)); if(a>cursor+.004) ranges.push([cursor,a]); cursor=Math.max(cursor,b); });
        if(cursor<.996) ranges.push([cursor,1]);
        if(!blockers.length) ranges.push([0,1]);
        const mat=new THREE.MeshStandardMaterial({color:presentationMode?0x9ca5aa:(isActive?0xcbd7df:0x6c7b86),roughness:.74,metalness:.02});
        ranges.forEach(([a,b])=>{
          const geo=makeWallBandGeometry(seg,a,b,.015,.13,Math.max(4,thicknessUnits*1.035),-.25);
          if(!geo) return; const mesh=new THREE.Mesh(geo,mat); mesh.castShadow=false; mesh.receiveShadow=true; mesh.userData.wallId=seg.id||''; group.add(mesh);
        });
      };
      const zoneCeilingHeightWorld = (zone, segments=[], fallback=2.8) => {
        const explicit=Number(zone?.ceilingHeight||zone?.height3D||0);
        if(explicit>0) return Math.max(1.8, explicit*hScale);
        const related=(segments||[]).filter(seg=>seg?.zoneIds?.has?.(zone?.id) || seg?.zoneId===zone?.id);
        if(related.length) return Math.max(1.8,...related.map(seg=>(Number(seg.height||DEFAULT_WALL_HEIGHT)||DEFAULT_WALL_HEIGHT)*hScale));
        return Math.max(1.8,Number(fallback||2.8));
      };
      const buildArchitecturalRoofGroup = (zones=[], activeZoneIds=new Set(), wallHeight=2.8, segments=[]) => {
        const group = new THREE.Group();
        group.userData.isArchitecturalRoof = true;
        if(!appState.ui?.nav3DRoof) return group;
        zones.forEach(z => {
          const pts = (z.pts || []).map(layoutToShapePoint);
          if(pts.length < 3) return;
          const active=activeZoneIds.has(z.id);
          const shape = new THREE.Shape(pts);
          const geo = new THREE.ExtrudeGeometry(shape,{depth:.055,bevelEnabled:false,steps:1});
          geo.rotateX(-Math.PI/2);
          const roofMat = new THREE.MeshStandardMaterial({ color:presentationMode?0xf5f5f2:(active?0xeaf4f9:0xd7e2e8), transparent:true, opacity:presentationMode ? .84 : (active ? .34 : .20), roughness:.82, metalness:.01, side:THREE.DoubleSide, depthWrite:!presentationMode });
          const mesh = new THREE.Mesh(geo, roofMat);
          mesh.position.y = zoneCeilingHeightWorld(z,segments,wallHeight)+.025;
          mesh.castShadow=true; mesh.receiveShadow=true; mesh.userData.zoneId=z.id||''; group.add(mesh);
          const roofEdgeMat = new THREE.LineBasicMaterial({ color:presentationMode?0x7a878e:0xffffff, transparent:true, opacity:presentationMode ? .18 : .38 });
          const linePts = pts.concat([pts[0]]).map(v => new THREE.Vector3(v.x, mesh.position.y + .07, -v.y));
          group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePts), roofEdgeMat));
        });
        return group;
      };

      const addOpeningFrame3D = (group, seg, opening, rawLengthUnits, height, thicknessUnits, isActive) => {
        if(!opening) return;
        const type=normalizeOpeningType(opening.type);
        const dx=Number(seg.b.x||0)-Number(seg.a.x||0), dy=Number(seg.b.y||0)-Number(seg.a.y||0);
        const len=Math.max(1,Math.hypot(dx,dy)); const ux=dx/len, uy=dy/len; const n=getSegmentNormal(seg);
        const centerT=Number(opening.t||.5); const center={x:Number(seg.a.x||0)+dx*centerT,y:Number(seg.a.y||0)+dy*centerT};
        const widthU=Math.max(20,Number(opening.width||90)||90); const sillU=Math.max(0,Number(opening.sillUnits??opening.sill??0)||0); const openingHU=Math.max(20,Number(opening.heightUnits??opening.height??210)||210);
        const frameU=Math.max(4,Math.min(9,widthU*.055)); const frameD=Math.max(5,thicknessUnits*.72);
        const maxVisibleU=Math.max(0,height/Math.max(.0001,hScale)-sillU); const visibleHU=Math.min(openingHU,maxVisibleU);
        if(visibleHU<=2) return;
        const yaw=-Math.atan2(dy,dx);
        const pickMid=toWorld(center.x,center.y,0);
        const pickMat=new THREE.MeshBasicMaterial({transparent:true,opacity:.001,depthWrite:false,side:THREE.DoubleSide});
        const pickMesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.06,widthU*scale),Math.max(.06,visibleHU*hScale),Math.max(.025,thicknessUnits*scale*.35)),pickMat);
        pickMesh.position.set(pickMid.x,(sillU+visibleHU*.5)*hScale,pickMid.z); pickMesh.rotation.y=yaw; pickMesh.userData.openingId=opening.id||''; pickMesh.userData.wallId=seg.id||''; pickMesh.userData.entityType='opening'; group.add(pickMesh); pickables.push(pickMesh);
        if(appState.ui?.nav3DShowOpeningFrames === false || (type==='free' && opening.frame !== true)) return;
        const mat=new THREE.MeshStandardMaterial({color:presentationMode?(isActive?0x6e7b82:0x77848b):(isActive?0xf5fbff:0x8094a4),roughness:.45,metalness:.14});
        const addVertical=(cx,cy,wU,hU)=>{ const mid=toWorld(cx,cy,0); const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.03,wU*scale),Math.max(.03,hU*hScale),Math.max(.05,frameD*scale)),mat); mesh.position.set(mid.x,(sillU+hU/2)*hScale,mid.z); mesh.rotation.y=yaw; mesh.castShadow=true; mesh.receiveShadow=true; mesh.userData.openingId=opening.id||''; mesh.userData.wallId=seg.id||''; mesh.userData.entityType='opening'; group.add(mesh); pickables.push(mesh); return mesh; };
        const addHorizontal=(cyU,wU,yU,depthFactor=1)=>{ const mid=toWorld(center.x,center.y,0); const mesh=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.03,wU*scale),Math.max(.025,frameU*hScale),Math.max(.05,frameD*scale*depthFactor)),mat); mesh.position.set(mid.x,yU*hScale,mid.z); mesh.rotation.y=yaw; mesh.castShadow=true; mesh.receiveShadow=true; mesh.userData.openingId=opening.id||''; mesh.userData.wallId=seg.id||''; mesh.userData.entityType='opening'; group.add(mesh); pickables.push(mesh); return mesh; };
        const half=widthU/2;
        addVertical(center.x-ux*half,center.y-uy*half,frameU,visibleHU);
        addVertical(center.x+ux*half,center.y+uy*half,frameU,visibleHU);
        if(openingHU<=maxVisibleU+.01) addHorizontal(0,widthU,sillU+openingHU);
        if(type==='window'){
          addHorizontal(0,widthU,sillU,1.24);
          if(widthU>=135) addVertical(center.x,center.y,Math.max(3.2,frameU*.65),visibleHU);
          const glassH=Math.max(4,visibleHU-frameU*1.4);
          const glass=new THREE.Mesh(new THREE.PlaneGeometry(Math.max(.05,(widthU-frameU*2)*scale),Math.max(.05,glassH*hScale)),new THREE.MeshPhysicalMaterial({color:presentationMode?0xbad9e4:0xa9e8ff,transparent:true,opacity:presentationMode ? .34 : .22,roughness:.08,metalness:.02,transmission:.58,depthWrite:false,side:THREE.DoubleSide}));
          const wp=toWorld(center.x+n.x*(thicknessUnits*.5),center.y+n.y*(thicknessUnits*.5),0); glass.position.set(wp.x,(sillU+visibleHU*.5)*hScale,wp.z); glass.rotation.y=yaw; glass.userData.openingId=opening.id||''; glass.userData.wallId=seg.id||''; glass.userData.entityType='opening'; group.add(glass); pickables.push(glass);
        }
        if(appState.ui?.nav3DShowArchitecturalDetails === false || !['door','gate'].includes(type)) return;
        const swingSign=Number(opening.swing||1)>=0?1:-1;
        const leafW=Math.max(30,widthU-frameU*1.5); const leafH=Math.max(50,Math.min(visibleHU-frameU*.6,openingHU-frameU*.6));
        const hinge={x:center.x-ux*leafW*.5,y:center.y-uy*leafW*.5};
        const a=swingSign*THREE.MathUtils.degToRad(type==='gate'?52:68);
        const vx=ux*Math.cos(a)-uy*Math.sin(a), vy=ux*Math.sin(a)+uy*Math.cos(a);
        const lc={x:hinge.x+vx*leafW*.5,y:hinge.y+vy*leafW*.5}; const worldC=toWorld(lc.x,lc.y,0);
        const leafMat=new THREE.MeshStandardMaterial({color:type==='gate'?(presentationMode?0x7f8d93:0x657a86):(presentationMode?0xc6a878:0x8f6b45),roughness:type==='gate' ? .50 : .66,metalness:type==='gate' ? .18 : .04});
        const leaf=new THREE.Mesh(new THREE.BoxGeometry(Math.max(.06,leafW*scale),Math.max(.08,leafH*hScale),Math.max(.035,3.8*scale)),leafMat);
        leaf.position.set(worldC.x,(sillU+leafH*.5)*hScale,worldC.z); leaf.rotation.y=-Math.atan2(vy,vx); leaf.castShadow=true; leaf.receiveShadow=true; leaf.userData.openingId=opening.id||''; leaf.userData.wallId=seg.id||''; leaf.userData.entityType='opening'; group.add(leaf); pickables.push(leaf);
        if(type==='door'){
          const free={x:hinge.x+vx*leafW*.82,y:hinge.y+vy*leafW*.82}; const hp=toWorld(free.x,free.y,0);
          const handle=new THREE.Mesh(new THREE.SphereGeometry(.055,10,8),new THREE.MeshStandardMaterial({color:0xd6bd72,roughness:.28,metalness:.72})); handle.position.set(hp.x,Math.min((sillU+105)*hScale,(sillU+leafH*.58)*hScale),hp.z); group.add(handle);
        }
      };
      const buildArchitecturalRoomSlabs = (zones=[], activeZoneIds=new Set()) => {
        const group=new THREE.Group();
        if(appState.ui?.nav3DShowRoomSlabs === false) return group;
        const linkedRoomIds=new Set(zones.map(z=>z.linkedRoomId).filter(Boolean));
        const items=[...zones.map(z=>({id:z.id,pts:z.pts||[],color:z.color||'#9fb6c7',zone:true})), ...(appState.layout?.rooms||[]).filter(r=>!linkedRoomIds.has(r.id)).map(r=>({id:r.id,pts:roomPointsRaw(r),color:'#8aa8b8',zone:false}))];
        items.forEach(item=>{
          const pts=(item.pts||[]).map(layoutToShapePoint); if(pts.length<3) return;
          const shape=new THREE.Shape(pts); const geo=new THREE.ExtrudeGeometry(shape,{depth:.065,bevelEnabled:false,steps:1});
          geo.rotateX(-Math.PI/2);
          const active=item.zone&&activeZoneIds.has(item.id);
          const color=new THREE.Color(item.color||'#9fb6c7');
          const mat=new THREE.MeshStandardMaterial({color:presentationMode?color.clone().lerp(new THREE.Color(0xd8dcde),.58):color,roughness:presentationMode ? .90 : .78,metalness:.02,transparent:true,opacity:presentationMode ? (active ? .94 : .80):(active ? .72 : (appState.ui?.nav3DArchitectural ? .42 : .22)),side:THREE.DoubleSide});
          const mesh=new THREE.Mesh(geo,mat); mesh.position.y=-.055; mesh.receiveShadow=true; mesh.userData.zoneId=item.zone?item.id:''; mesh.userData.roomId=item.zone?'':item.id; mesh.userData.entityType=item.zone?'zone':'room'; group.add(mesh); if(item.zone)pickables.push(mesh);
        });
        return group;
      };
      const buildWallGroup = (segments=[], activeZoneIds=new Set()) => {
        const group = new THREE.Group();
        if(!segments.length) return group;
        segments.forEach(seg => {
          const dx = Number(seg.b?.x||0) - Number(seg.a?.x||0);
          const dy = Number(seg.b?.y||0) - Number(seg.a?.y||0);
          const rawLengthUnits = Math.hypot(dx, dy);
          const length = rawLengthUnits * scale;
          if(length <= .08) return;
          const isActive = appState.selectedWallId===seg.id || ui.selection?.type==='wall'&&ui.selection.id===seg.id || [...(seg.zoneIds || [])].some(id => activeZoneIds.has(id));
          const wallCut = !!appState.ui?.nav3DWallCut;
          const baseHeight = Math.max(2.8, (Number(seg.height || DEFAULT_WALL_HEIGHT) || DEFAULT_WALL_HEIGHT) * hScale);
          const height = wallCut ? Math.min(1.25, baseHeight) : baseHeight;
          const thicknessUnits = Math.max(8, Number(seg.thickness || DEFAULT_WALL_THICKNESS) || DEFAULT_WALL_THICKNESS);
          const thickness = Math.max(.24, thicknessUnits * scale);
          const wallMat = new THREE.MeshStandardMaterial({
            color:presentationMode ? (isActive ? 0xffffff : 0xeeeae3) : (isActive ? 0xf2f7fb : 0xb8c8d8),
            transparent:true,
            opacity:presentationMode ? (wallCut ? (isActive ? .78 : .58) : .985) : (appState.ui?.nav3DArchitectural ? (wallCut ? (isActive ? .74 : .48) : (isActive ? .98 : .86)) : (wallCut ? (isActive ? .62 : .38) : (isActive ? .96 : .72))),
            roughness:presentationMode ? .92 : .78,
            metalness:.02,
            side:THREE.DoubleSide
          });
          const glassMat = new THREE.MeshStandardMaterial({ color:0x8feaff, transparent:true, opacity:appState.ui?.nav3DArchitectural ? .46 : .32, roughness:.18, metalness:.04, side:THREE.DoubleSide, depthWrite:false });
          const leafMat = new THREE.MeshStandardMaterial({ color:0x9aa8b4, transparent:true, opacity:appState.ui?.nav3DArchitectural ? .62 : .46, roughness:.55, metalness:.08, side:THREE.DoubleSide });
          const openings = getWallOpeningsForSegment(seg, rawLengthUnits);
          if(openings.length){
            let cursor = 0;
            openings.forEach(o => {
              const safeT0 = Math.max(cursor, o.t0);
              const safeT1 = Math.max(safeT0, o.t1);
              if(safeT0 > cursor + .004){
                addWallMesh(group, makeWallBandGeometry(seg, cursor, safeT0, 0, height, thicknessUnits), wallMat, isActive, seg.id);
              }
              const sill = Math.max(0, Number(o.sillUnits || 0) * hScale);
              const openingTop = Math.min(height, Math.max(.08, (Number(o.sillUnits || 0) + Number(o.heightUnits || 210)) * hScale));
              if(sill > .035){
                addWallMesh(group, makeWallBandGeometry(seg, safeT0, safeT1, 0, Math.min(sill, height), thicknessUnits), wallMat, isActive, seg.id);
              }
              if(openingTop < height - .035){
                addWallMesh(group, makeWallBandGeometry(seg, safeT0, safeT1, openingTop, height, thicknessUnits), wallMat, isActive, seg.id);
              }
              // v112: el hueco sigue siendo vacío real; se agrega únicamente marco arquitectónico opcional.
              addOpeningFrame3D(group, seg, o, rawLengthUnits, height, thicknessUnits, isActive);
              cursor = Math.max(cursor, safeT1);
            });
            if(cursor < .996){
              addWallMesh(group, makeWallBandGeometry(seg, cursor, 1, 0, height, thicknessUnits), wallMat, isActive, seg.id);
            }
            addArchitecturalBaseboards(group,seg,openings,thicknessUnits,isActive);
            return;
          }
          const autoPoly = seg.autoZoneEdge && seg.zoneId && Number.isFinite(seg.edgeIndex) ? getAutoWallPolygon(seg.raw || seg) : null;
          let wall = null;
          if(Array.isArray(autoPoly) && autoPoly.length >= 4){
            const geo = makeWallPrismGeometry(autoPoly, height);
            if(geo) wall = new THREE.Mesh(geo, wallMat);
          }
          if(!wall){
            const n = getSegmentNormal(seg);
            const midX = (Number(seg.a?.x||0) + Number(seg.b?.x||0))/2 + n.x * (thicknessUnits / 2);
            const midY = (Number(seg.a?.y||0) + Number(seg.b?.y||0))/2 + n.y * (thicknessUnits / 2);
            const mid = toWorld(midX, midY, 0);
            const angle = -Math.atan2(dy, dx);
            wall = new THREE.Mesh(new THREE.BoxGeometry(length, height, thickness), wallMat);
            wall.position.set(mid.x, height/2, mid.z);
            wall.rotation.y = angle;
          }
          wall.castShadow = true;
          wall.receiveShadow = true;
          wall.userData.wallId = seg.id || '';
          wall.userData.entityType = 'wall';
          group.add(wall);
          pickables.push(wall);
          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(wall.geometry),
            new THREE.LineBasicMaterial({ color:presentationMode ? 0x697985 : (isActive ? 0xffffff : 0xd7e7f4), transparent:true, opacity:presentationMode ? (isActive ? .34 : .10) : (isActive ? .70 : .36) })
          );
          edges.position.copy(wall.position);
          edges.rotation.copy(wall.rotation);
          edges.scale.copy(wall.scale);
          group.add(edges);
          addArchitecturalBaseboards(group,seg,[],thicknessUnits,isActive);
        });

        // v105: cierre completo de esquinas tipo L en 3D sin usar variables fuera de scope.
        getAllWallCornerClosurePolygons().forEach(joint => {
          if(!Array.isArray(joint.poly) || joint.poly.length < 4) return;
          const isActive = joint.selected || activeZoneIds.has(joint.zoneId);
          const height = Math.max(2.8, (Number(joint.height || DEFAULT_WALL_HEIGHT) || DEFAULT_WALL_HEIGHT) * hScale);
          const geo = makeWallPrismGeometry(joint.poly, height);
          if(!geo) return;
          const jointMat = new THREE.MeshStandardMaterial({
            color:presentationMode ? (isActive ? 0xffffff : 0xeeeae3) : (isActive ? 0xf2f7fb : 0xb8c8d8),
            transparent:true,
            opacity:presentationMode ? .985 : (appState.ui?.nav3DArchitectural ? (isActive ? .98 : .86) : (isActive ? .96 : .72)),
            roughness:presentationMode ? .92 : .78,
            metalness:.02,
            side:THREE.DoubleSide
          });
          const wall = new THREE.Mesh(geo, jointMat);
          wall.castShadow = true;
          wall.receiveShadow = true;
          wall.userData.wallId = `${joint.prevWallId || ''}+${joint.currWallId || ''}`;
          group.add(wall);
          const edges = new THREE.LineSegments(
            new THREE.EdgesGeometry(wall.geometry),
            new THREE.LineBasicMaterial({ color:presentationMode ? 0x697985 : (isActive ? 0xffffff : 0xd7e7f4), transparent:true, opacity:presentationMode ? (isActive ? .34 : .10) : (isActive ? .70 : .36) })
          );
          edges.position.copy(wall.position);
          edges.rotation.copy(wall.rotation);
          edges.scale.copy(wall.scale);
          group.add(edges);
        });
        return group;
      };
      const roomSlabsGroup = buildArchitecturalRoomSlabs(layoutZones, focusZoneIds);
      world.add(roomSlabsGroup);
      const makeZoneMaterials = (active=false) => ({
        floor: new THREE.MeshStandardMaterial({ color:presentationMode ? (active?0xd9dedf:0xc8ced0) : (active ? (appState.ui?.nav3DArchitectural ? 0xd9e4ec : 0x18394b) : (appState.ui?.nav3DArchitectural ? 0x2b3c4b : visual.floor)), roughness:presentationMode ? .90 : .62, metalness:.03, transparent:true, opacity:presentationMode ? (active ? .32 : .13):(appState.ui?.nav3DArchitectural ? (active ? .16 : .035) : (active ? .54 : .07)), side:THREE.DoubleSide, depthWrite:active }),
        overlay: new THREE.MeshBasicMaterial({ color:active ? (appState.ui?.nav3DArchitectural ? 0xe9f3fa : 0x43e68c) : 0x8eb3ca, transparent:true, opacity:presentationMode ? (active ? .045 : .008):(appState.ui?.nav3DArchitectural ? (active ? .08 : .012) : (active ? (ui.visual === 'oscuro' ? .08 : .12) : .014)), side:THREE.DoubleSide, depthWrite:false }),
        line: new THREE.LineBasicMaterial({ color:active ? (appState.ui?.nav3DArchitectural ? 0xffffff : 0x86ffd0) : 0x91bad3, transparent:true, opacity:active ? (appState.ui?.nav3DArchitectural ? .78 : (ui.visual === 'oscuro' ? .52 : .70)) : .12 })
      });
      layoutZones.forEach(z => {
        const pts = (z.pts || []).map(layoutToShapePoint);
        if(pts.length >= 3){
          const isActiveZone = focusZoneIds.has(z.id) || appState.selectedZoneId===z.id || (ui.selection?.type==='zone'&&ui.selection.id===z.id);
          const mats = makeZoneMaterials(isActiveZone);
          if(ui.wmsMode==='zones'){ const zc=new THREE.Color(z.color||'#6f93aa');mats.floor.color.copy(zc);mats.floor.opacity=isActiveZone?.62:.34;mats.overlay.color.copy(zc.clone().lerp(new THREE.Color(0xffffff),.22));mats.overlay.opacity=isActiveZone?.16:.07;mats.line.color.copy(zc.clone().lerp(new THREE.Color(0xffffff),.35));mats.line.opacity=isActiveZone?.92:.58; }
          const shape = new THREE.Shape(pts);
          const geo = new THREE.ShapeGeometry(shape);
          const floorMesh = new THREE.Mesh(geo, mats.floor); floorMesh.rotation.x = -Math.PI/2; floorMesh.position.y=isActiveZone ? .022 : .012; floorMesh.receiveShadow = isActiveZone; floorMesh.userData.zoneId=z.id||''; floorMesh.userData.entityType='zone'; world.add(floorMesh); pickables.push(floorMesh);
          const overlay = new THREE.Mesh(geo.clone(), mats.overlay); overlay.rotation.x = -Math.PI/2; overlay.position.y=isActiveZone ? .044 : .031; world.add(overlay);
          const linePts = pts.concat([pts[0]]).map(v => new THREE.Vector3(v.x, isActiveZone ? .064 : .045, -v.y));
          const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(linePts), mats.line); world.add(line);
        }
      });
      const zoneWallSegments = buildWallSegmentsFromLayout();
      const zoneWallsGroup = buildWallGroup(zoneWallSegments, focusZoneIds);
      zoneWallsGroup.position.y = .01;
      world.add(zoneWallsGroup);
      const maxWallHeight = Math.max(2.8, ...zoneWallSegments.map(s => (Number(s.height || DEFAULT_WALL_HEIGHT) || DEFAULT_WALL_HEIGHT) * hScale));
      sectionWorldBounds.yMax = Math.max(5.5, maxWallHeight + 2.2, ...getNav3DRacks().map(r => (Number(r.baseHeight||0)+Number(r.rackHeight||240))*hScale + 1.2));
      const roofZones = layoutZones.length ? layoutZones : (appState.layout?.rooms||[]).map(r=>({id:r.id,pts:roomPointsRaw(r)}));
      const roofGroup = buildArchitecturalRoofGroup(roofZones, focusZoneIds, appState.ui?.nav3DWallCut ? Math.min(1.25, maxWallHeight) : maxWallHeight, zoneWallSegments);
      world.add(roofGroup);

      const matGhost = new THREE.MeshStandardMaterial({ color:0x9eb6d0, transparent:true, opacity:Math.min(visual.ghost, .10), roughness:.86, metalness:.08, depthWrite:false });
      const matGhostWire = new THREE.LineBasicMaterial({ color:0xd0ecff, transparent:true, opacity:Math.min(visual.wire, .24) });
      const matFrame = new THREE.MeshStandardMaterial({ color:0x0b4f82, roughness:.31, metalness:.72 });
      const matBeam = new THREE.MeshStandardMaterial({ color:0xe88a2f, roughness:.42, metalness:.48 });
      const matBox = new THREE.MeshStandardMaterial({ color:0xca9a5a, roughness:.86, metalness:.025 });
      const matBox2 = new THREE.MeshStandardMaterial({ color:0xd8d1bd, roughness:.74, metalness:.02 });
      const matWrap = new THREE.MeshStandardMaterial({ color:0xeff3e9, roughness:.62, metalness:.03 });
      const matActive = new THREE.MeshStandardMaterial({ color:0xd7ff64, emissive:0x92ff76, emissiveIntensity:1.55, transparent:true, opacity:.68, roughness:.22, metalness:.06 });
      const matRoute = new THREE.MeshStandardMaterial({ color:0x47ff91, emissive:0x38ff86, emissiveIntensity:1.12, roughness:.24, metalness:.04 });
      const matRouteHalo = new THREE.MeshBasicMaterial({ color:0x38ff86, transparent:true, opacity:ui.visual === 'oscuro' ? .12 : .18, depthWrite:false });
      const createSlotLabelSprite = (textLabel) => {
        const tag = document.createElement('canvas');
        tag.width = 256; tag.height = 96;
        const g = tag.getContext('2d');
        g.clearRect(0,0,tag.width,tag.height);
        g.fillStyle = 'rgba(6,18,28,.92)';
        g.strokeStyle = 'rgba(126,255,184,.92)';
        g.lineWidth = 4;
        const radius = 20;
        g.beginPath();
        g.moveTo(radius, 6);
        g.lineTo(tag.width - radius, 6);
        g.quadraticCurveTo(tag.width - 6, 6, tag.width - 6, radius);
        g.lineTo(tag.width - 6, tag.height - radius);
        g.quadraticCurveTo(tag.width - 6, tag.height - 6, tag.width - radius, tag.height - 6);
        g.lineTo(radius, tag.height - 6);
        g.quadraticCurveTo(6, tag.height - 6, 6, tag.height - radius);
        g.lineTo(6, radius);
        g.quadraticCurveTo(6, 6, radius, 6);
        g.closePath();
        g.fill(); g.stroke();
        g.font = '900 34px Inter, Arial, sans-serif';
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = '#ecfff5';
        g.fillText(textLabel, tag.width/2, tag.height/2 + 2);
        const texture = new THREE.CanvasTexture(tag);
        if('colorSpace' in texture) texture.colorSpace = THREE.SRGBColorSpace;
        const material = new THREE.SpriteMaterial({ map:texture, transparent:true, depthWrite:false });
        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1.55, .58, 1);
        return sprite;
      };

      const addBox = (group, w,h,d, x,y,z, mat, cast=true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), mat); m.position.set(x,y,z); m.castShadow=cast; m.receiveShadow=true; group.add(m); return m; };
      const addCylinderBetween = (group, start, end, radius, mat, cast=false) => {
        const dir = new THREE.Vector3().subVectors(end,start);
        const len = dir.length(); if(len <= .001) return null;
        const geo = new THREE.CylinderGeometry(radius, radius, len, 16, 1, false);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(start).addScaledVector(dir,.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), dir.normalize());
        mesh.castShadow = cast; mesh.receiveShadow = true; group.add(mesh); return mesh;
      };
      const activeInfoForRack = (r) => {
        const liveCtx = getViewerProductLocationContext(prod);
        const isStore = r.id === liveCtx.storeRackId || r.id === prod?.rackStore;
        return { level: Math.max(1, Number(isStore ? prod?.nivelStore : prod?.nivel) || 1), slot: Math.max(1, Number(isStore ? prod?.slotStore : prod?.slot) || 1) };
      };
      const targetFocusForRack = (r, mode='slot') => {
        if(!r) return new THREE.Vector3(0,0,0);
        const model = rackModel(r.modelId) || baseRackModel();
        const w = Math.max(.8, (Number(r.w || model.width || 120))*scale);
        const d = Math.max(.45, (Number(r.h || model.depth || 56))*scale);
        const rackH = Math.max(1.2, (Number(r.rackHeight || model.height || 240))*hScale);
        const levels = Math.max(1, Math.min(8, Number(model.levels || 4) || 4));
        const levelSlots = typeof buildLevelSlots==='function' ? buildLevelSlots(model) : [];
        const target = activeInfoForRack(r);
        const level = Math.max(1, Math.min(levels, Number(target.level || 1)));
        const slots = Math.max(1, Math.min(12, Number(levelSlots[level-1] || model.slots || model.capacity || 2) || 2));
        const slot = Math.max(1, Math.min(slots, Number(target.slot || 1)));
        const rackCenter = toWorld(Number(r.x||0) + Number(r.w||model.width||120)/2, Number(r.y||0) + Number(r.h||model.depth||56)/2, 0);
        if(mode !== 'slot') return new THREE.Vector3(rackCenter.x, Math.min(rackH*.55, 3.8), rackCenter.z);
        const bw = (w*.78)/slots;
        const localX = -w*.39 + bw*(slot-.5);
        const localZ = d*.05;
        const yaw = rackYaw(r);
        const cos = Math.cos(yaw), sin = Math.sin(yaw);
        const worldX = rackCenter.x + localX * cos + localZ * sin;
        const worldZ = rackCenter.z - localX * sin + localZ * cos;
        const y = Math.max(.55, Math.min(rackH*.92, ((level-.5)/levels)*rackH + .35));
        return new THREE.Vector3(worldX, y, worldZ);
      };
      const buildDetailedRack = (r, active=false) => {
        const group = new THREE.Group();
        const model = rackModel(r.modelId) || baseRackModel();
        const w = Math.max(.8, (Number(r.w || model.width || 120))*scale);
        const d = Math.max(.45, (Number(r.h || model.depth || 56))*scale);
        const rackH = Math.max(1.2, (Number(r.rackHeight || model.height || 240))*hScale);
        const levels = Math.max(1, Math.min(8, Number(model.levels || 4) || 4));
        const slots = Math.max(1, Math.min(6, Number(model.slots || model.capacity || 2) || 2));
        const p = toWorld(Number(r.x||0) + Number(r.w||model.width||120)/2, Number(r.y||0) + Number(r.h||model.depth||56)/2, 0);
        group.position.set(p.x, 0, p.z);
        group.rotation.y = rackYaw(r);
        if(model?.furniture?.enabled && typeof getFurnitureRenderPieces === 'function') {
          const pieces=getFurnitureRenderPieces(model);
          const MW=Math.max(1,Number(model.width||120)),MD=Math.max(1,Number(model.depth||40)),MH=Math.max(1,Number(model.height||200));
          const sx=w/MW, sz=d/MD, sy=rackH/MH;
          const panelBase=model.furniture.material==='metal'?0x45667f:(model.furniture.material==='wood'?0xb47b43:0xdce5ed);
          const panelMat=new THREE.MeshStandardMaterial({color:panelBase,roughness:model.furniture.material==='metal'?.36:.72,metalness:model.furniture.material==='metal'?.58:.03});
          const backMat=new THREE.MeshStandardMaterial({color:panelBase,roughness:.8,metalness:.02,transparent:true,opacity:.55});
          pieces.forEach(piece=>{
            if(piece.type==='brace'){const a=new THREE.Vector3(-w/2+Number(piece.x||0)*sx,Number(piece.z||0)*sy,-d/2+Math.max(.02,Number(piece.y||0))*sz),b=new THREE.Vector3(-w/2+Number(piece.x2||piece.x+piece.w||0)*sx,Number(piece.z2||piece.z+piece.h||0)*sy,-d/2+Math.max(.02,Number(piece.y||0))*sz);addCylinderBetween(group,a,b,Math.max(.018,Number(piece.d||2)*Math.min(sx,sy)*.45),panelMat,false);return;}
            const pw=Math.max(.012,Number(piece.w||1)*sx),ph=Math.max(.012,Number(piece.h||1)*sy),pd=Math.max(.012,Number(piece.d||1)*sz),px=-w/2+(Number(piece.x||0)+Number(piece.w||1)/2)*sx,py=(Number(piece.z||0)+Number(piece.h||1)/2)*sy,pz=-d/2+(Number(piece.y||0)+Number(piece.d||1)/2)*sz;addBox(group,pw,ph,pd,px,py,pz,piece.type==='back'?backMat:panelMat,false);
          });
          const target=activeInfoForRack(r),defs=typeof deriveFurnitureLevels==='function'?deriveFurnitureLevels(model):[];
          if(active&&defs.length){const lv=defs.find(l=>l.index===Math.max(1,Number(target.level||1))),slot=lv?.slots?.[Math.max(1,Number(target.slot||1))-1];if(lv&&slot){const hw=Math.max(.04,(slot.x1-slot.x0)*sx*.92),hh=Math.max(.05,(lv.z1-lv.z0)*sy*.84),hd=Math.max(.04,d*.82),hx=-w/2+(slot.x0+(slot.x1-slot.x0)/2)*sx,hy=(lv.z0+(lv.z1-lv.z0)/2)*sy;const activeShell=addBox(group,hw,hh,hd,hx,hy,0,matActive,false);activePulseTargets.push({activeShell,baseScale:1});}}
          if(active){const haloGeo=new THREE.EdgesGeometry(new THREE.BoxGeometry(w+.16,rackH+.16,d+.16)),halo=new THREE.LineSegments(haloGeo,new THREE.LineBasicMaterial({color:0x7dffab,transparent:true,opacity:.96}));halo.position.y=rackH/2;group.add(halo);}
          return group;
        }
        const postW = Math.max(.045, w*.045);
        const beamH = Math.max(.035, rackH*.014);
        [[-w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2]].forEach(([x,z]) => addBox(group, postW, rackH, postW, x, rackH/2, z, matFrame));
        for(let i=0;i<=levels;i++){
          const y = (rackH/levels)*i;
          addBox(group, w+postW, beamH, postW, 0, y, -d/2, matBeam);
          addBox(group, w+postW, beamH, postW, 0, y, d/2, matBeam);
          addBox(group, postW, beamH, d+postW, -w/2, y, 0, matBeam);
          addBox(group, postW, beamH, d+postW, w/2, y, 0, matBeam);
        }
        const target = activeInfoForRack(r);
        for(let li=1; li<=levels; li++){
          const baseY = ((li-1)/levels)*rackH + beamH*3;
          const boxH = Math.max(.18, rackH/levels*.52);
          const boxD = d*.58;
          for(let si=1; si<=slots; si++){
            const bw = (w*.78)/slots;
            const bx = -w*.39 + bw*(si-.5);
            const isTarget = active && li === target.level && si === target.slot;
            const box = addBox(group, bw*.76, boxH, boxD, bx, baseY + boxH/2, d*.05, ((li+si)%4===0) ? matWrap : ((li+si)%2 ? matBox : matBox2));
            if(isTarget){
              const activeShell = addBox(group, bw*.96, boxH*1.18, boxD*1.18, bx, baseY + boxH/2, d*.05, matActive, false);
              const glowShell = addBox(group, bw*1.08, boxH*1.26, boxD*1.26, bx, baseY + boxH/2, d*.05, new THREE.MeshBasicMaterial({ color:0xffdd70, transparent:true, opacity:.14, depthWrite:false }), false);
              const markerY = baseY + boxH + .28;
              const slotLabel = createSlotLabelSprite(`N${li} · S${si}`);
              slotLabel.position.set(bx, markerY + .42, d*.05);
              group.add(slotLabel);
              activePulseTargets.push({ activeShell, glowShell, slotLabel, baseScale:1, labelY:slotLabel.position.y });
            }
          }
        }
        if(ui.wmsMode!=='architecture'){
          const modeColor=rackVisualColor(r);
          const bandMat=new THREE.MeshStandardMaterial({color:modeColor,emissive:modeColor.clone().multiplyScalar(.18),emissiveIntensity:.55,roughness:.46,metalness:.12,transparent:true,opacity:.92});
          addBox(group,Math.max(.2,w*.94),Math.max(.035,beamH*1.6),Math.max(.08,d*.90),0,Math.max(.08,rackH-.08),0,bandMat,false);
        }
        if(active){
          const haloGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(w+.18, rackH+.18, d+.18));
          const halo = new THREE.LineSegments(haloGeo, new THREE.LineBasicMaterial({ color:0x7dffab, transparent:true, opacity:.98 }));
          halo.position.y = rackH/2; group.add(halo);
          const glow = new THREE.PointLight(0x55ff99, 1.1, 8, 1.7);
          glow.position.set(0, rackH*.72, 0); group.add(glow);
          activeLight.position.copy(group.position).add(new THREE.Vector3(0, rackH*.65, 0));
        }
        return group;
      };
      const buildBasicRack = (r, active=false, ghost=true) => {
        const group = new THREE.Group();
        const model = rackModel(r.modelId) || baseRackModel();
        const w = Math.max(.8, (Number(r.w || model.width || 120))*scale), d = Math.max(.45, (Number(r.h || model.depth || 56))*scale), rackH = Math.max(1.1, (Number(r.rackHeight || model.height || 240))*hScale);
        const p = toWorld(Number(r.x||0)+Number(r.w||model.width||120)/2, Number(r.y||0)+Number(r.h||model.depth||56)/2, 0);
        group.position.set(p.x,0,p.z);
        group.rotation.y = rackYaw(r);
        const mesh = addBox(group, w, rackH, d, 0, rackH/2, 0, ghost ? matGhost : matActive, false);
        mesh.material.opacity = active ? .34 : (ghost ? .13 : .24);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), active ? new THREE.LineBasicMaterial({ color:0x55ff99, transparent:true, opacity:.85 }) : matGhostWire);
        edges.position.copy(mesh.position); group.add(edges);
        return group;
      };
      const buildMediumRack = (r) => {
        const group=new THREE.Group(), model=rackModel(r.modelId)||baseRackModel();
        const w=Math.max(.8,(Number(r.w||model.width||120))*scale),d=Math.max(.45,(Number(r.h||model.depth||56))*scale),rackH=Math.max(1.1,(Number(r.rackHeight||model.height||240))*hScale);
        const levels=Math.max(1,Math.min(8,Number(model.levels||4)||4)), p=toWorld(Number(r.x||0)+Number(r.w||model.width||120)/2,Number(r.y||0)+Number(r.h||model.depth||56)/2,0);
        group.position.set(p.x,0,p.z); group.rotation.y=rackYaw(r);
        if(model?.furniture?.enabled && typeof getFurnitureRenderPieces === 'function'){const pieces=getFurnitureRenderPieces(model),MW=Math.max(1,Number(model.width||120)),MD=Math.max(1,Number(model.depth||40)),MH=Math.max(1,Number(model.height||200)),sx=w/MW,sz=d/MD,sy=rackH/MH,c=rackVisualColor(r),mat=new THREE.MeshStandardMaterial({color:ui.wmsMode==='architecture'?(model.furniture.material==='wood'?0xb47b43:model.furniture.material==='metal'?0x45667f:0xdce5ed):c,roughness:model.furniture.material==='metal'?.4:.74,metalness:model.furniture.material==='metal'?.48:.03});pieces.filter(piece=>piece.type!=='brace'&&piece.type!=='back').slice(0,48).forEach(piece=>{addBox(group,Math.max(.012,Number(piece.w||1)*sx),Math.max(.012,Number(piece.h||1)*sy),Math.max(.012,Number(piece.d||1)*sz),-w/2+(Number(piece.x||0)+Number(piece.w||1)/2)*sx,(Number(piece.z||0)+Number(piece.h||1)/2)*sy,-d/2+(Number(piece.y||0)+Number(piece.d||1)/2)*sz,mat,false);});return group;}
        const c=rackVisualColor(r), frameC=ui.wmsMode==='architecture'?new THREE.Color(0x315c7a):c.clone().multiplyScalar(.72), beamC=ui.wmsMode==='architecture'?new THREE.Color(0xd58437):c;
        const frameMat=new THREE.MeshStandardMaterial({color:frameC,roughness:.38,metalness:.56}), beamMat=new THREE.MeshStandardMaterial({color:beamC,roughness:.44,metalness:.32}), shelfMat=new THREE.MeshStandardMaterial({color:c.clone().lerp(new THREE.Color(0xdbe1e4),.55),roughness:.72,metalness:.08,transparent:true,opacity:.78});
        const post=Math.max(.04,w*.035), beam=Math.max(.03,rackH*.012);
        [[-w/2,-d/2],[w/2,-d/2],[-w/2,d/2],[w/2,d/2]].forEach(([x,z])=>addBox(group,post,rackH,post,x,rackH/2,z,frameMat,false));
        for(let i=0;i<=levels;i++){const y=Math.min(rackH,(rackH/levels)*i);addBox(group,w+post,beam,post,0,y,-d/2,beamMat,false);addBox(group,w+post,beam,post,0,y,d/2,beamMat,false);if(i>0)addBox(group,w*.94,Math.max(.018,beam*.55),d*.82,0,Math.max(.03,y-beam*.7),0,shelfMat,false);}
        return group;
      };
      const addInstancedRackProxies = racks => {
        if(!racks.length)return null; const geo=new THREE.BoxGeometry(1,1,1),mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.58,metalness:.18,transparent:true,opacity:ui.wmsMode==='architecture'?.18:.64,vertexColors:true});
        const mesh=new THREE.InstancedMesh(geo,mat,racks.length); mesh.userData.entityType='rack'; mesh.userData.rackIds=racks.map(r=>r.id); mesh.userData.isRackInstanced=true; const dummy=new THREE.Object3D();
        racks.forEach((r,i)=>{const model=rackModel(r.modelId)||baseRackModel(),w=Math.max(.8,(Number(r.w||model.width||120))*scale),d=Math.max(.45,(Number(r.h||model.depth||56))*scale),rh=Math.max(1.1,(Number(r.rackHeight||model.height||240))*hScale),p=toWorld(Number(r.x||0)+Number(r.w||model.width||120)/2,Number(r.y||0)+Number(r.h||model.depth||56)/2,0);dummy.position.set(p.x,rh/2,p.z);dummy.rotation.set(0,rackYaw(r),0);dummy.scale.set(w,rh,d);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,rackVisualColor(r));instancedRackLookup.set(r.id,{mesh,index:i});});
        mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.castShadow=false;mesh.receiveShadow=true;world.add(mesh);pickables.push(mesh);return mesh;
      };

      let visibleRacks = getNav3DRacks().filter(r => {
        const rackActive = focusRackIds.has(r.id) || focusRackIds.has(nav3dRackKey(r.id));
        const zoneActive = focusZoneIds.has(r.zoneId);
        if(ui.isolation === 'all') return true;
        if(ui.isolation === 'zone') return zoneActive;
        if(ui.isolation === 'solo') return rackActive || zoneActive;
        return rackActive;
      });
      if(!visibleRacks.length){
        const fallbackRack = findNav3DRackById(getTargetRackId()) || getNav3DRacks()[0] || null;
        if(fallbackRack) visibleRacks = [fallbackRack];
        if(window.__wmsDiagPush) window.__wmsDiagPush('3d', 'Se aplicó fallback de rack visible en WebGL');
      }
      const directSelectedRackId = ui.selection?.type==='rack'?ui.selection.id:appState.selectedRackLayoutId;
      const detailedRackIds=new Set([...focusRackIds,directSelectedRackId].filter(Boolean));
      const passiveRacks=[];
      visibleRacks.forEach(r=>{
        const active=detailedRackIds.has(r.id); if(!active){passiveRacks.push(r);return;}
        const rackObject=buildDetailedRack(r,true); rackObject.userData.rackId=r.id; rackObject.userData.entityType='rack'; rackObject.traverse(obj=>{obj.userData.rackId=r.id;obj.userData.entityType='rack';obj.userData.isRackPickable=true;if(obj.isMesh)pickables.push(obj);}); rackObjectMap.set(r.id,rackObject); world.add(rackObject);
      });
      if(passiveRacks.length>=36){ addInstancedRackProxies(passiveRacks); }
      else passiveRacks.forEach(r=>{ const rackObject=buildMediumRack(r); rackObject.userData.rackId=r.id;rackObject.userData.entityType='rack';rackObject.traverse(obj=>{obj.userData.rackId=r.id;obj.userData.entityType='rack';obj.userData.isRackPickable=true;if(obj.isMesh)pickables.push(obj);});rackObjectMap.set(r.id,rackObject);world.add(rackObject); });
      if(ui.route && prod && !appState.ui?.nav3DPresentation){
        const activeRack = visibleRacks.find(r => r.id === getTargetRackId()) || visibleRacks.find(r => focusRackIds.has(r.id));
        if(activeRack){
          const routeGroup = new THREE.Group();
          const relatedZone = (Array.isArray(appState.layout?.zones) ? appState.layout.zones : []).find(z => z.id === activeRack.zoneId || focusZoneIds.has(z.id));
          const zoneCenter = relatedZone ? centroid(relatedZone.pts || []) : { x: bounds.minX + bounds.w*.12, y: bounds.minY + bounds.h*.82 };
          const start = toWorld(zoneCenter.x, zoneCenter.y, 0);
          const end = toWorld(Number(activeRack.x||0)+Number(activeRack.w||120)/2, Number(activeRack.y||0)+Number(activeRack.h||56)/2, 0);
          const mid = new THREE.Vector3((start.x+end.x)/2, .055, start.z);
          const points = [new THREE.Vector3(start.x,.065,start.z), mid, new THREE.Vector3(end.x,.065,end.z)];
          for(let i=0;i<points.length-1;i++){
            addCylinderBetween(routeGroup, points[i], points[i+1], .026, matRoute, false);
            addCylinderBetween(routeGroup, points[i].clone().setY(.055), points[i+1].clone().setY(.055), .074, matRouteHalo, false);
          }
          [start,end].forEach((p,idx)=>{
            const sphere = new THREE.Mesh(new THREE.SphereGeometry(idx ? .18 : .10, 24, 12), matRoute);
            sphere.position.set(p.x,.14,p.z); sphere.castShadow=false; routeGroup.add(sphere);
            const ring = new THREE.Mesh(new THREE.TorusGeometry(idx ? .30 : .18, .018, 12, 64), idx ? matRoute : matRouteHalo);
            ring.position.set(p.x,.075,p.z); ring.rotation.x = Math.PI/2; routeGroup.add(ring);
          });
          world.add(routeGroup);
        }
      }

      applySectionClipping();
      renderSectionPanel();

      const cameraFocusRack = visibleRacks.find(r => r.id === getTargetRackId()) || visibleRacks.find(r => focusRackIds.has(r.id));
      const initialPan = cameraFocusRack
        ? targetFocusForRack(cameraFocusRack, 'slot')
        : new THREE.Vector3(0,0,0);
      const initialDistance = Math.max(4.6, Math.max(floorW,floorD) * (ui.isolation === 'solo' ? .29 : .54));
      const controls = { yaw:-Math.PI/4, pitch:.68, distance:initialDistance, pan:initialPan.clone(), targetYaw:-Math.PI/4, targetPitch:.68, targetDistance:initialDistance, targetPan:initialPan.clone(), dragging:false, lastX:0, lastY:0 };
      const fp = {active:false,position:new THREE.Vector3(initialPan.x,1.65,initialPan.z),yaw:Math.PI*.75,pitch:0,speed:.075,keys:new Set()};
      const savedViews = () => {
        if(!appState.layout.meta || typeof appState.layout.meta!=='object') appState.layout.meta={};
        if(!Array.isArray(appState.layout.meta.saved3DViews)) appState.layout.meta.saved3DViews=[];
        return appState.layout.meta.saved3DViews;
      };
      const syncNavigationHud = () => {
        if(!nav3dHud)return;
        nav3dHud.innerHTML=fp.active
          ? '<b>Primera persona</b><span>W A S D: caminar</span><span>Mouse arrastrando: mirar</span><span>Shift: rápido · ESC: salir</span>'
          : '<b>Controles</b><span>Arrastrar: orbitar suave</span><span>Rueda: zoom progresivo</span><span>Shift + arrastrar: pan</span>';
      };
      const setOrbitView = (yaw,pitch,distance=initialDistance,pan=initialPan) => {
        if(fp.active){ fp.active=false; fp.keys.clear(); modal.classList.remove('nav3d-first-person'); }
        controls.targetYaw=yaw; controls.targetPitch=pitch; controls.targetDistance=Math.max(3.8,distance); controls.targetPan.copy(pan||initialPan); syncNavigationHud(); syncToolbar();
      };
      const applyCameraPreset = (name) => {
        const d=Math.max(6.2,initialDistance*.92), p=initialPan.clone();
        const presets={
          top:[0,1.535,d*.92],front:[0,.08,d],back:[Math.PI,.08,d],left:[-Math.PI/2,.08,d],right:[Math.PI/2,.08,d],
          'iso-ne':[-Math.PI/4,.66,d*.88],'iso-nw':[Math.PI/4,.66,d*.88],perspective:[-Math.PI/4,.46,d*.82]
        };
        const v=presets[name]||presets.perspective; setOrbitView(v[0],v[1],v[2],p); requestRender(true);
      };
      const renderSavedViews = () => {
        if(!savedViewsList)return;
        const items=savedViews();
        savedViewsList.innerHTML=items.length?items.map(v=>`<div class="nav3d-saved-row"><button type="button" data-saved-view="${escapeHtml(v.id)}">${escapeHtml(v.name||'Vista')}</button><button type="button" class="nav3d-saved-delete" data-delete-view="${escapeHtml(v.id)}">×</button></div>`).join(''):'<div class="tiny muted">Todavía no hay vistas guardadas.</div>';
      };
      const saveCurrentView = () => {
        const name=window.prompt('Nombre de la vista',`Vista ${savedViews().length+1}`); if(!name)return;
        const views=savedViews(); const id=`V3D-${Date.now().toString(36)}`;
        views.push({id,name:String(name).trim()||'Vista',yaw:Number(controls.targetYaw),pitch:Number(controls.targetPitch),distance:Number(controls.targetDistance),pan:{x:Number(controls.targetPan.x),y:Number(controls.targetPan.y),z:Number(controls.targetPan.z)}});
        if(views.length>24)views.splice(0,views.length-24); persistActiveLayout(); renderSavedViews(); showToast('Vista 3D guardada.','success',1800);
      };
      const applySavedView = (id) => {
        const v=savedViews().find(x=>x.id===id); if(!v)return;
        setOrbitView(Number(v.yaw||0),Number(v.pitch||.5),Number(v.distance||initialDistance),new THREE.Vector3(Number(v.pan?.x||0),Number(v.pan?.y||0),Number(v.pan?.z||0))); requestRender(true);
      };
      const enterFirstPerson = () => {
        fp.active=true; fp.keys.clear(); fp.position.set(controls.targetPan.x,Math.max(1.45,Math.min(1.85,controls.targetPan.y+1.65)),controls.targetPan.z); fp.yaw=controls.targetYaw+Math.PI; fp.pitch=0; modal.classList.add('nav3d-first-person'); syncNavigationHud(); syncToolbar(); requestRender(true);
      };
      const exitFirstPerson = () => {
        if(!fp.active)return; fp.active=false; fp.keys.clear(); modal.classList.remove('nav3d-first-person'); controls.targetPan.set(fp.position.x,Math.max(.5,fp.position.y-.8),fp.position.z); controls.targetYaw=fp.yaw-Math.PI; controls.targetPitch=.48; controls.targetDistance=Math.max(5.2,initialDistance*.42); syncNavigationHud(); syncToolbar(); requestRender(true);
      };
      const toggleFirstPerson = () => fp.active ? exitFirstPerson() : enterFirstPerson();
      renderSavedViews(); syncNavigationHud();
      const selectedInitial = getTargetRackId() || ui.selectedRackId || appState.ui?.nav3DSelectedRackId || '';
      if(selectedInitial) { ui.selectedRackId = selectedInitial; appState.ui.nav3DSelectedRackId = selectedInitial; if(rackPopover) rackPopover.hidden = true; }
      const updateCamera = () => {
        if(fp.active){
          let moving=false; const fast=fp.keys.has('shift')?2.35:1; const step=fp.speed*fast;
          const fwd=new THREE.Vector3(Math.sin(fp.yaw),0,Math.cos(fp.yaw)); const right=new THREE.Vector3(Math.cos(fp.yaw),0,-Math.sin(fp.yaw));
          const move=new THREE.Vector3();
          if(fp.keys.has('w')||fp.keys.has('arrowup'))move.add(fwd);
          if(fp.keys.has('s')||fp.keys.has('arrowdown'))move.sub(fwd);
          if(fp.keys.has('d')||fp.keys.has('arrowright'))move.add(right);
          if(fp.keys.has('a')||fp.keys.has('arrowleft'))move.sub(right);
          if(move.lengthSq()>0){ move.normalize().multiplyScalar(step); fp.position.add(move); moving=true; }
          fp.position.x=Math.max(sectionWorldBounds.xMin+.25,Math.min(sectionWorldBounds.xMax-.25,fp.position.x));
          fp.position.z=Math.max(sectionWorldBounds.zMin+.25,Math.min(sectionWorldBounds.zMax-.25,fp.position.z));
          fp.position.y=Math.max(1.35,Math.min(Math.max(2.2,sectionWorldBounds.yMax-.25),fp.position.y));
          camera.position.copy(fp.position);
          const cp=Math.cos(fp.pitch), dir=new THREE.Vector3(Math.sin(fp.yaw)*cp,Math.sin(fp.pitch),Math.cos(fp.yaw)*cp);
          camera.lookAt(fp.position.clone().add(dir));
          if(compass){ const deg=Math.round((((fp.yaw*180/Math.PI)%360)+360)%360); compass.textContent=`N · ${deg}° · FP`; }
          return moving;
        }
        const yawDelta = controls.targetYaw-controls.yaw;
        const pitchDelta = controls.targetPitch-controls.pitch;
        const distanceDelta = controls.targetDistance-controls.distance;
        const panDelta = controls.pan.distanceTo(controls.targetPan);
        const moving = Math.abs(yawDelta) > .00035 || Math.abs(pitchDelta) > .00035 || Math.abs(distanceDelta) > .0025 || panDelta > .0025;
        if(moving){
          controls.yaw += yawDelta*.16;
          controls.pitch += pitchDelta*.16;
          controls.distance += distanceDelta*.16;
          controls.pan.lerp(controls.targetPan,.16);
        }else{
          controls.yaw = controls.targetYaw;
          controls.pitch = controls.targetPitch;
          controls.distance = controls.targetDistance;
          controls.pan.copy(controls.targetPan);
        }
        const x = Math.cos(controls.pitch)*Math.sin(controls.yaw)*controls.distance;
        const y = Math.sin(controls.pitch)*controls.distance;
        const z = Math.cos(controls.pitch)*Math.cos(controls.yaw)*controls.distance;
        camera.position.set(controls.pan.x+x, controls.pan.y+y, controls.pan.z+z);
        camera.lookAt(controls.pan);
        if(compass){ const deg = Math.round((((controls.yaw * 180/Math.PI) % 360) + 360) % 360); compass.textContent = `N · ${deg}°`; }
        return moving;
      };
      const setPointerFromEvent = (e) => {
        const rect = canvas.getBoundingClientRect();
        pointer.x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      };
      const pickEntity = (e) => {
        if(!pickables.length) return null;
        setPointerFromEvent(e);
        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(pickables, false)[0];
        if(!hit?.object) return null;
        const data=hit.object.userData||{};
        if(data.isRackInstanced && Number.isInteger(hit.instanceId)){ const id=data.rackIds?.[hit.instanceId]||''; if(id)return {type:'rack',id,object:hit.object,instanceId:hit.instanceId,point:hit.point}; }
        if(data.openingId) return {type:'opening',id:data.openingId,object:hit.object,point:hit.point};
        if(data.rackId) return {type:'rack',id:data.rackId,object:hit.object,point:hit.point};
        if(data.wallId) return {type:'wall',id:data.wallId,object:hit.object,point:hit.point};
        if(data.zoneId) return {type:'zone',id:data.zoneId,object:hit.object,point:hit.point};
        return null;
      };
      const pickRackId = e => { const entity=pickEntity(e); return entity?.type==='rack'?entity.id:''; };
      const focusRackCamera = (rackId, closeDistance = false) => {
        const rack = findNav3DRackById(rackId);
        if(!rack) return;
        const target = targetFocusForRack(rack, closeDistance ? 'slot' : 'rack');
        controls.targetPan.copy(target);
        controls.targetDistance = closeDistance ? Math.max(3.8, initialDistance * .30) : Math.max(4.8, initialDistance * .48);
        requestRender();
      };
      const clearSelectionHelper = () => { if(selectionHelper){ try{scene.remove(selectionHelper);}catch{} selectionHelper=null; } if(selectionGizmo){try{scene.remove(selectionGizmo);}catch{}selectionGizmo=null;} };
      const entityBox = entity => {
        if(!entity?.type||!entity.id)return null;
        if(entity.object && !entity.object.isInstancedMesh){ try{return new THREE.Box3().setFromObject(entity.object);}catch{} }
        if(entity.type==='rack'){ const r=findNav3DRackById(entity.id); if(!r)return null; const model=rackModel(r.modelId)||baseRackModel(),w=Math.max(.8,(Number(r.w||model.width||120))*scale),d=Math.max(.45,(Number(r.h||model.depth||56))*scale),rh=Math.max(1.1,(Number(r.rackHeight||model.height||240))*hScale),p=toWorld(Number(r.x||0)+Number(r.w||model.width||120)/2,Number(r.y||0)+Number(r.h||model.depth||56)/2,0); return new THREE.Box3(new THREE.Vector3(p.x-w/2,0,p.z-d/2),new THREE.Vector3(p.x+w/2,rh,p.z+d/2)); }
        const candidate=pickables.find(o=>(entity.type==='wall'&&o.userData?.wallId===entity.id)||(entity.type==='opening'&&o.userData?.openingId===entity.id)||(entity.type==='zone'&&o.userData?.zoneId===entity.id));
        if(candidate){try{return new THREE.Box3().setFromObject(candidate);}catch{}} return null;
      };
      const showSelectionHelper = entity => { clearSelectionHelper(); const box=entityBox(entity); if(!box||box.isEmpty())return; selectionHelper=new THREE.Box3Helper(box,0x66ffd0); selectionHelper.material.transparent=true; selectionHelper.material.opacity=.92; scene.add(selectionHelper); if(entity?.type==='rack'&&typeof isRackDistributionScreen==='function'&&isRackDistributionScreen()){const c=box.getCenter(new THREE.Vector3());c.y=Math.max(.10,box.min.y+.10);selectionGizmo=new THREE.Group();selectionGizmo.add(new THREE.ArrowHelper(new THREE.Vector3(1,0,0),c,1.05,0xff675c,.24,.12));selectionGizmo.add(new THREE.ArrowHelper(new THREE.Vector3(0,0,1),c,1.05,0x4bb8ff,.24,.12));scene.add(selectionGizmo);} requestRender(true); };
      const focusEntityCamera = (entity,closeDistance=false) => {
        if(!entity?.type||!entity.id)return; if(entity.type==='rack'){focusRackCamera(entity.id,closeDistance);return;}
        let target=null;
        if(entity.type==='zone'){const z=findZoneById(entity.id);if(z){const c=centroid(z.pts||[]);target=toWorld(c.x,c.y,0);target.y=.7;}}
        if(entity.type==='wall'){const w=findWallById(entity.id);if(w){target=toWorld((Number(w.x1||0)+Number(w.x2||0))/2,(Number(w.y1||0)+Number(w.y2||0))/2,0);target.y=Math.max(.6,Number(w.height||290)*hScale*.45);}}
        if(entity.type==='opening'){const o=(appState.layout.openings||[]).find(x=>x.id===entity.id),w=o?findWallById(o.wallId):null,seg=o&&w?getOpeningSegment(o,w):null;if(seg){target=toWorld(seg.center.x,seg.center.y,0);target.y=Math.max(.55,(Number(o.sill||0)+Number(o.height||210)*.5)*hScale);}}
        if(!target)return; controls.targetPan.copy(target); controls.targetDistance=closeDistance?Math.max(3.8,initialDistance*.30):Math.max(4.8,initialDistance*.48); requestRender();
      };
      const setEntitySelection = (entity,{center=false}={}) => {
        if(!entity?.type||!entity.id)return; ui.selection={type:entity.type,id:entity.id}; appState.ui.nav3DSelectionType=entity.type;appState.ui.nav3DSelectionId=entity.id; if(typeof setUnifiedLayoutSelection==='function')setUnifiedLayoutSelection(entity.type,entity.id,{source:'3d'});
        if(entity.type==='rack'){ appState.ui.nav3DSelectedRackId=entity.id;ui.selectedRackId=entity.id;renderRackPopover(entity.id); const liveCtxSel=getViewerProductLocationContext(prod);if(entity.id===liveCtxSel.primaryRackId){ui.target='primary';appState.ui.nav3DTarget='primary';}if(entity.id===liveCtxSel.storeRackId){ui.target='store';appState.ui.nav3DTarget='store';} } else if(rackPopover) rackPopover.hidden=true;
        renderSelectionCard(); renderMiniMap(); showSelectionHelper(entity); if(center)focusEntityCamera(entity,true); syncToolbar();
      };
      const selectRackFromScene = (rackId, center = false) => { if(!rackId)return; setEntitySelection({type:'rack',id:rackId},{center}); if(!center)focusRackCamera(rackId,false); setTimeout(()=>{renderSideRacks();renderProductOperationalCard();renderMiniMap();syncToolbar();},60); };
      const updateRackSceneTransform = rack => {
        if(!rack)return; const model=rackModel(rack.modelId)||baseRackModel(),w=Math.max(.8,(Number(rack.w||model.width||120))*scale),d=Math.max(.45,(Number(rack.h||model.depth||56))*scale),rh=Math.max(1.1,(Number(rack.rackHeight||model.height||240))*hScale),p=toWorld(Number(rack.x||0)+Number(rack.w||model.width||120)/2,Number(rack.y||0)+Number(rack.h||model.depth||56)/2,0);
        const obj=rackObjectMap.get(rack.id); if(obj){obj.position.set(p.x,0,p.z);obj.rotation.y=rackYaw(rack);}
        const inst=instancedRackLookup.get(rack.id); if(inst){const dummy=new THREE.Object3D();dummy.position.set(p.x,rh/2,p.z);dummy.rotation.set(0,rackYaw(rack),0);dummy.scale.set(w,rh,d);dummy.updateMatrix();inst.mesh.setMatrixAt(inst.index,dummy.matrix);inst.mesh.instanceMatrix.needsUpdate=true;}
        showSelectionHelper({type:'rack',id:rack.id});
      };
      const rackPlacementErrors = rackId => typeof v117OperationalIssues==='function' ? v117OperationalIssues().filter(i=>i.severity==='error'&&(i.rackIds||[]).includes(rackId)) : [];
      const commitRackCandidate = (rack,candidate,lastValid) => {
        const before={x:rack.x,y:rack.y,rot:rack.rot,zoneId:rack.zoneId}; Object.assign(rack,candidate); const center={x:Number(rack.x||0)+Number(rack.w||0)/2,y:Number(rack.y||0)+Number(rack.h||0)/2}; const host=(appState.layout.zones||[]).find(z=>rackFullyInsideZone(rack,z)&&pointInPoly(center,z.pts))||findZoneById(rack.zoneId); if(host)rack.zoneId=host.id;
        const errors=rackPlacementErrors(rack.id); if(errors.length){Object.assign(rack,lastValid||before);return false;} return true;
      };
      const updatePulse = now => {
        if(!activePulseTargets.length) return;
        const t = now * 0.0032;
        activePulseTargets.forEach(item => {
          const pulse = 0.72 + (Math.sin(t) + 1) * 0.34;
          if(item.activeShell?.material){ item.activeShell.material.opacity = 0.48 + pulse * 0.24; item.activeShell.material.emissiveIntensity = 1.25 + pulse * 1.15; }
          if(item.glowShell){ const s = 0.98 + pulse * 0.08; item.glowShell.scale.set(s,s,s); if(item.glowShell.material) item.glowShell.material.opacity = 0.07 + pulse * 0.11; }
          if(item.slotLabel){ item.slotLabel.material.opacity = 0.74 + pulse * 0.22; item.slotLabel.position.y = item.labelY + pulse * 0.04; }
        });
      };
      const schedulePulse = () => {
        clearTimeout(pulseTimer);
        if(isClosed || !activePulseTargets.length || document.visibilityState !== 'visible' || !modal.isConnected) return;
        pulseTimer = setTimeout(() => requestRender(true), 50);
      };
      const requestRender = (pulseFrame = false) => {
        if(isClosed || animation || document.visibilityState !== 'visible' || !modal.isConnected || !renderer || !scene || !camera) return;
        animation = requestAnimationFrame(now => {
          animation = 0;
          if(isClosed || document.visibilityState !== 'visible' || !modal.isConnected) return;
          const moving = updateCamera();
          if(pulseFrame || moving || controls.dragging) updatePulse(now);
          renderer.render(scene,camera);
          if(renderer.shadowMap?.autoUpdate){
            renderer.shadowMap.autoUpdate = false;
            renderer.shadowMap.needsUpdate = false;
          }
          if(moving || controls.dragging) requestRender(false);
          else schedulePulse();
        });
      };
      visibilityHandler = () => {
        if(document.visibilityState !== 'visible'){
          cancelAnimationFrame(animation); animation = 0; clearTimeout(pulseTimer); pulseTimer = 0;
        }else requestRender(true);
      };
      document.addEventListener('visibilitychange', visibilityHandler);
      nav3dKeyDownHandler = e => {
        if(!fp.active) return;
        const tag=String(e.target?.tagName||'').toLowerCase(); if(['input','textarea','select'].includes(tag)) return;
        const key=String(e.key||'').toLowerCase();
        if(key==='escape'){ e.preventDefault(); exitFirstPerson(); return; }
        if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)){ e.preventDefault(); fp.keys.add(key); requestRender(); }
      };
      nav3dKeyUpHandler = e => { if(!fp.active)return; fp.keys.delete(String(e.key||'').toLowerCase()); requestRender(); };
      document.addEventListener('keydown', nav3dKeyDownHandler);
      document.addEventListener('keyup', nav3dKeyUpHandler);
      const resize = () => {
        if(isClosed || !renderer || !camera) return;
        const stage = modal.querySelector('.nav3d-stage');
        const rect = canvas.getBoundingClientRect();
        const stageRect = stage?.getBoundingClientRect?.() || rect;
        const w = Math.max(320, Math.round(rect.width || stageRect.width || 860));
        const h = Math.max(260, Math.round(rect.height || stageRect.height || 560));
        renderer.setSize(w, h, false);
        camera.aspect = w / Math.max(1, h);
        camera.updateProjectionMatrix();
        requestRender(true);
      };
      resizeObserver = new ResizeObserver(resize); resizeObserver.observe(modal.querySelector('.nav3d-stage') || canvas); resize();
      requestAnimationFrame(resize);
      setTimeout(() => { if(!isClosed) resize(); }, 120);
      requestRender(true);
      if(ui.selection?.type&&ui.selection?.id){ showSelectionHelper(ui.selection); renderSelectionCard(); }
      renderWmsLegend();
      const floorDragPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
      const floorPointFromEvent=e=>{setPointerFromEvent(e);raycaster.setFromCamera(pointer,camera);const hit=new THREE.Vector3();return raycaster.ray.intersectPlane(floorDragPlane,hit)?hit:null;};
      canvas.addEventListener('pointerdown', e => {
        const entity=pickEntity(e); downX=e.clientX;downY=e.clientY;downTime=Date.now();downMoved=false;controls.lastX=e.clientX;controls.lastY=e.clientY;
        if(ui.move3D && typeof isRackDistributionScreen==='function' && isRackDistributionScreen() && entity?.type==='rack' && ui.selection?.type==='rack' && entity.id===ui.selection.id){
          const rack=findNav3DRackById(entity.id); if(rack&&!rack._virtual){ if(typeof recordHistorySnapshot==='function')recordHistorySnapshot('distribution'); rackDrag={rackId:rack.id,lastValid:{x:rack.x,y:rack.y,rot:rack.rot,zoneId:rack.zoneId},original:{x:rack.x,y:rack.y,rot:rack.rot,zoneId:rack.zoneId}}; canvas.classList.add('nav3d-moving-rack'); canvas.setPointerCapture(e.pointerId); return; }
        }
        controls.dragging=true; canvas.setPointerCapture(e.pointerId); requestRender();
      });
      canvas.addEventListener('pointermove', e => {
        if(rackDrag){ const rack=findNav3DRackById(rackDrag.rackId),wp=floorPointFromEvent(e); if(rack&&wp){ const cx=wp.x/scale+bounds.cx,cy=wp.z/scale+bounds.cy; const candidate={x:typeof snapGrid==='function'?snapGrid(cx-Number(rack.w||0)/2):cx-Number(rack.w||0)/2,y:typeof snapGrid==='function'?snapGrid(cy-Number(rack.h||0)/2):cy-Number(rack.h||0)/2}; if(commitRackCandidate(rack,candidate,rackDrag.lastValid)){rackDrag.lastValid={x:rack.x,y:rack.y,rot:rack.rot,zoneId:rack.zoneId};} updateRackSceneTransform(rack);renderSelectionCard();requestRender(true);} return; }
        if(!controls.dragging){
          const entity=pickEntity(e), key=entity?`${entity.type}:${entity.id}`:'';
          if(key!==hoveredEntityKey){ hoveredEntityKey=key; hoveredRackId=entity?.type==='rack'?entity.id:''; canvas.style.cursor=entity?'pointer':'grab'; if(hoverLabel){hoverLabel.hidden=!entity;hoverLabel.textContent=entity?`${entity.type==='wall'?'Muro':entity.type==='opening'?'Abertura':entity.type==='zone'?'Zona':'Rack'} · ${entity.id}`:'';} }
          if(entity&&hoverLabel){const rect=canvas.getBoundingClientRect();hoverLabel.style.left=`${e.clientX-rect.left+14}px`;hoverLabel.style.top=`${e.clientY-rect.top+14}px`;} return;
        }
        const dx=e.clientX-controls.lastX, dy=e.clientY-controls.lastY; controls.lastX=e.clientX; controls.lastY=e.clientY; if(Math.abs(e.clientX-downX)+Math.abs(e.clientY-downY)>6)downMoved=true;
        if(fp.active){ fp.yaw-=dx*.0032;fp.pitch=Math.max(-1.15,Math.min(1.15,fp.pitch-dy*.0022)); }
        else if(e.shiftKey){ const side=new THREE.Vector3().subVectors(camera.position,controls.pan).cross(new THREE.Vector3(0,1,0)).normalize();const up=new THREE.Vector3(0,1,0);controls.targetPan.addScaledVector(side,-dx*.012).addScaledVector(up,dy*.012); }
        else{controls.targetYaw-=dx*.0032;controls.targetPitch=Math.max(.08,Math.min(1.535,controls.targetPitch+dy*.0022));} requestRender();
      });
      canvas.addEventListener('pointerup', e => {
        if(rackDrag){ const rack=findNav3DRackById(rackDrag.rackId);rackDrag=null;canvas.classList.remove('nav3d-moving-rack');try{canvas.releasePointerCapture(e.pointerId)}catch{};if(rack){persistActiveLayout();if(typeof v117RunValidation==='function')v117RunValidation({quiet:true});renderSelectionCard();renderWmsLegend();showToast('Posición 3D del rack actualizada.','success',1200);}requestRender(true);return;}
        controls.dragging=false;requestRender();try{canvas.releasePointerCapture(e.pointerId)}catch{}; if(!downMoved&&Date.now()-downTime<420){const entity=pickEntity(e);if(entity)setEntitySelection(entity,{center:false});}
      });
      canvas.addEventListener('dblclick', e => { const entity=pickEntity(e); if(entity)setEntitySelection(entity,{center:true}); });
      canvas.addEventListener('pointerleave', () => { if(rackDrag)return; controls.dragging=false;hoveredRackId='';hoveredEntityKey='';canvas.style.cursor='grab';if(hoverLabel)hoverLabel.hidden=true;requestRender(); });
      canvas.addEventListener('wheel', e => { e.preventDefault(); if(fp.active){ const dir=new THREE.Vector3(Math.sin(fp.yaw),0,Math.cos(fp.yaw)); fp.position.addScaledVector(dir,e.deltaY>0?-.35:.35); } else controls.targetDistance = Math.max(4.5, Math.min(120, controls.targetDistance * (e.deltaY > 0 ? 1.07 : .93))); requestRender(); }, { passive:false });
      modal.querySelectorAll('[data-nav3d-target]').forEach(btn => btn.addEventListener('click', () => {
        ui.target = btn.dataset.nav3dTarget || 'primary';
        appState.ui.nav3DTarget = ui.target;
        syncToolbar();
        close();
        openNavigable3DModal(prod);
      }));
      productCard?.addEventListener('click', e => {
        const action = e.target?.dataset?.nav3dProductAction;
        if(!action) return;
        if(action === 'variants') openProductVariantsModal(prod);
        if(action === 'center') focusRackCamera(getTargetRackId(), true);
        if(action === 'isolate') { ui.isolation = 'rack'; syncToolbar(); close(); openNavigable3DModal(prod); }
      });
      const wallZonesFor = wall => {
        const ids=[]; if(!wall)return ids; (appState.layout.rooms||[]).forEach(room=>{const nodes=room.nodeIds||[];for(let i=0;i<nodes.length;i++){const a=nodes[i],b=nodes[(i+1)%nodes.length];if((a===wall.startNodeId&&b===wall.endNodeId)||(a===wall.endNodeId&&b===wall.startNodeId)){const z=getRoomLinkedZone(room);if(z)ids.push(z.id);break;}}}); return [...new Set(ids)];
      };
      const openingPlacementConflict = opening => {
        const wall=findWallById(opening?.wallId); if(!wall)return true; const len=Math.max(1,wallLength(wall)),half=Math.max(10,Number(opening.width||90)/2)/len,t=Math.max(half,Math.min(1-half,Number(opening.t||.5))); const a=t-half,b=t+half;
        return (appState.layout.openings||[]).some(o=>o.id!==opening.id&&o.wallId===opening.wallId&&(()=>{const oh=Math.max(10,Number(o.width||90)/2)/len,ot=Math.max(oh,Math.min(1-oh,Number(o.t||.5))),oa=ot-oh,ob=ot+oh;return Math.min(b,ob)-Math.max(a,oa)>.01;})());
      };
      selectionCard?.addEventListener('click',e=>{
        const action=e.target?.dataset?.selectionAction;if(!action)return;const sel=ui.selection||{};
        if(action==='focus'){focusEntityCamera(sel,true);return;}
        if(action==='move-toggle'&&sel.type==='rack'&&typeof isRackDistributionScreen==='function'&&isRackDistributionScreen()){ui.move3D=!ui.move3D;appState.ui.nav3DMoveMode=ui.move3D;renderSelectionCard();canvas.classList.toggle('nav3d-move-enabled',ui.move3D);return;}
        if(action==='isolate'){if(sel.type==='rack')ui.isolation='rack';else if(sel.type==='zone')ui.isolation='zone';syncToolbar();close();openNavigable3DModal(prod);return;}
        if(action==='isolate-zone'&&sel.type==='wall'){const zid=wallZonesFor(findWallById(sel.id))[0];if(zid)appState.selectedZoneId=zid;ui.isolation='zone';close();openNavigable3DModal(prod);}
      });
      selectionCard?.addEventListener('change',e=>{
        const field=e.target?.dataset?.selectionField;if(!field)return;const sel=ui.selection||{};
        if(field.startsWith('rack-')&&sel.type==='rack'&&typeof isRackDistributionScreen==='function'&&isRackDistributionScreen()){const rack=findNav3DRackById(sel.id);if(!rack||rack._virtual)return;const prev={x:rack.x,y:rack.y,rot:rack.rot,zoneId:rack.zoneId};let candidate={};if(field==='rack-x')candidate.x=Number(e.target.value||0);if(field==='rack-y')candidate.y=Number(e.target.value||0);if(field==='rack-rot')candidate.rot=normalizeAngle(Number(e.target.value||0));if(!commitRackCandidate(rack,candidate,prev)){showToast('Movimiento bloqueado por colisión o límite de zona.','warning',1800);}persistActiveLayout();if(typeof v117RunValidation==='function')v117RunValidation({quiet:true});updateRackSceneTransform(rack);renderSelectionCard();renderWmsLegend();requestRender(true);return;}
        if(field.startsWith('wall-')&&sel.type==='wall'&&typeof isStructureLayoutScreen==='function'&&isStructureLayoutScreen()){const wall=findWallById(sel.id);if(!wall)return;if(typeof recordHistorySnapshot==='function')recordHistorySnapshot('structure');if(field==='wall-thickness')wall.thickness=Math.max(4,Number(e.target.value||14));if(field==='wall-height')wall.height=Math.max(80,Number(e.target.value||290));persistActiveLayout();close();openNavigable3DModal(prod);return;}
        if(field.startsWith('opening-')&&sel.type==='opening'&&typeof isStructureLayoutScreen==='function'&&isStructureLayoutScreen()){const opening=(appState.layout.openings||[]).find(o=>o.id===sel.id),wall=opening?findWallById(opening.wallId):null;if(!opening||!wall)return;const prev={width:opening.width,height:opening.height,sill:opening.sill,t:opening.t,offset:opening.offset};if(typeof recordHistorySnapshot==='function')recordHistorySnapshot('structure');if(field==='opening-width')opening.width=Math.max(20,Math.min(wallLength(wall)*.86,Number(e.target.value||90)));if(field==='opening-height')opening.height=Math.max(20,Number(e.target.value||210));if(field==='opening-sill')opening.sill=Math.max(0,Number(e.target.value||0));if(field==='opening-t')opening.t=Math.max(.01,Math.min(.99,Number(e.target.value||50)/100));const maxH=Math.max(20,Number(wall.height||290)-Number(opening.sill||0));opening.height=Math.min(Number(opening.height||210),maxH);opening.offset=Number(opening.t||.5)*Math.max(1,wallLength(wall));if(openingPlacementConflict(opening)){Object.assign(opening,prev);showToast('Cambio bloqueado: la abertura se superpondría con otra.','warning',2000);renderSelectionCard();return;}persistActiveLayout();close();openNavigable3DModal(prod);}
      });
      wmsModeSelect?.addEventListener('change',()=>{const mode=String(wmsModeSelect.value||'occupancy');appState.ui.nav3DWmsMode=mode;ui.wmsMode=mode;renderWmsLegend();close();openNavigable3DModal(prod);});
      const updateSectionNow = () => { applySectionClipping(); renderSectionPanel(); syncToolbar(); requestRender(true); };
      sectionPanel?.addEventListener('click', e => {
        const axis=e.target?.dataset?.sectionAxis, dirAxis=e.target?.dataset?.sectionDir;
        if(axis){ sectionState.axes[axis]=!sectionState.axes[axis]; if(sectionState.axes[axis]){sectionState.box=false;appState.ui.nav3DRoof=false;} updateSectionNow(); return; }
        if(dirAxis){ sectionState.dirs[dirAxis]=(sectionState.dirs[dirAxis]||1)*-1; updateSectionNow(); return; }
        if(e.target?.hasAttribute?.('data-section-box')){ sectionState.box=!sectionState.box; if(sectionState.box){sectionState.axes={x:false,y:false,z:false};appState.ui.nav3DRoof=false;} updateSectionNow(); return; }
        if(e.target?.hasAttribute?.('data-section-reset')){ const fresh=defaultSectionState(); Object.assign(sectionState,fresh); sectionState.axes={...fresh.axes};sectionState.values={...fresh.values};sectionState.dirs={...fresh.dirs};sectionState.boxValues={...fresh.boxValues}; updateSectionNow(); return; }
        if(e.target?.dataset?.panelClose==='section'){ sectionPanel.hidden=true; syncToolbar(); }
      });
      sectionPanel?.addEventListener('input', e => {
        const axis=e.target?.dataset?.sectionRange; if(axis){ sectionState.values[axis]=Number(e.target.value||0); sectionState.axes[axis]=true; sectionState.box=false; appState.ui.nav3DRoof=false; updateSectionNow(); return; }
        const boxKey=e.target?.dataset?.boxRange; if(boxKey){ sectionState.boxValues[boxKey]=Number(e.target.value||0); const v=sectionState.boxValues; if(v.xMin>=v.xMax)v[boxKey==='xMin'?'xMin':'xMax']=boxKey==='xMin'?Math.max(0,v.xMax-1):Math.min(100,v.xMin+1); if(v.yMin>=v.yMax)v[boxKey==='yMin'?'yMin':'yMax']=boxKey==='yMin'?Math.max(0,v.yMax-1):Math.min(100,v.yMin+1); if(v.zMin>=v.zMax)v[boxKey==='zMin'?'zMin':'zMax']=boxKey==='zMin'?Math.max(0,v.zMax-1):Math.min(100,v.zMin+1); sectionState.box=true; sectionState.axes={x:false,y:false,z:false}; appState.ui.nav3DRoof=false; updateSectionNow(); }
      });
      viewsPanel?.addEventListener('click', e => {
        const preset=e.target?.dataset?.viewPreset; if(preset){ applyCameraPreset(preset); return; }
        const saved=e.target?.dataset?.savedView; if(saved){ applySavedView(saved); return; }
        const del=e.target?.dataset?.deleteView; if(del){ const arr=savedViews(),idx=arr.findIndex(v=>v.id===del); if(idx>=0){arr.splice(idx,1);persistActiveLayout();renderSavedViews();} return; }
        if(e.target?.dataset?.panelClose==='views'){ viewsPanel.hidden=true; syncToolbar(); }
      });
      modal.querySelectorAll('[data-nav3d-action]').forEach(btn => btn.addEventListener('click', () => {
        const action = btn.dataset.nav3dAction;
        if(action==='section-panel'){ sectionPanel.hidden=!sectionPanel.hidden; if(!sectionPanel.hidden)viewsPanel.hidden=true; renderSectionPanel(); syncToolbar(); return; }
        if(action==='views-panel'){ viewsPanel.hidden=!viewsPanel.hidden; if(!viewsPanel.hidden)sectionPanel.hidden=true; renderSavedViews(); syncToolbar(); return; }
        if(action==='first-person'){ toggleFirstPerson(); return; }
        if(action==='save-view'){ saveCurrentView(); return; }
        if(action==='camera-top'){ applyCameraPreset('top'); return; }
        if(action==='locate-product'){ const rid=getTargetRackId(); if(rid){ui.isolation='rack';ui.route=true;setEntitySelection({type:'rack',id:rid},{center:true});focusRackCamera(rid,true);showToast('Producto localizado en rack, nivel y slot.','success',1500);} return; }
        if(action === 'focus' || action === 'slot'){
          controls.targetYaw = -Math.PI/4;
          controls.targetPitch = .68;
          controls.targetDistance = action === 'slot' ? Math.max(4.2, initialDistance*.36) : Math.max(5.2, initialDistance*.48);
          controls.targetPan.copy(initialPan);
        }
        if(action && action.startsWith('visual-')){
          const mode = action.replace('visual-','');
          appState.ui.nav3DVisualMode = mode;
          appState.ui.nav3DPresentation = false;
          ui.visual = mode;
        }
        if(action === 'wall-cut'){
          appState.ui.nav3DWallCut = !appState.ui.nav3DWallCut;
        }
        if(action === 'presentation-mode'){
          appState.ui.nav3DPresentation = !appState.ui.nav3DPresentation;
          if(appState.ui.nav3DPresentation){
            appState.ui.nav3DArchitectural = false;
            appState.ui.nav3DWallCut = false;
            appState.ui.nav3DRoof = false;
            appState.ui.nav3DShowRoomSlabs = true;
            appState.ui.nav3DShowOpeningFrames = true;
            appState.ui.nav3DShowArchitecturalDetails = true;
            ui.route = false; ui.labels = false; ui.ghost = false;
          }
        }
        if(action === 'arch-details'){ appState.ui.nav3DShowArchitecturalDetails = appState.ui.nav3DShowArchitecturalDetails === false; }
        if(action === 'roof-toggle'){
          appState.ui.nav3DRoof = !appState.ui.nav3DRoof;
        }
        if(action === 'room-slabs'){ appState.ui.nav3DShowRoomSlabs = appState.ui.nav3DShowRoomSlabs === false; }
        if(action === 'opening-frames'){ appState.ui.nav3DShowOpeningFrames = appState.ui.nav3DShowOpeningFrames === false; }

        if(action === 'all' || action === 'zone' || action === 'rack' || action === 'solo') ui.isolation = action;
        if(action === 'ghost') ui.ghost = !ui.ghost;
        if(action === 'labels') ui.labels = !ui.labels;
        if(action === 'route') ui.route = !ui.route;
        syncToolbar();
        close();
        openNavigable3DModal(prod);
      }));
      rackPopover?.addEventListener('click', e => {
        const action = e.target?.dataset?.popoverAction;
        if(!action) return;
        const rid = ui.selectedRackId || appState.ui?.nav3DSelectedRackId;
        if(action === 'center') focusRackCamera(rid, true);
        if(action === 'isolate') { ui.isolation = 'rack'; syncToolbar(); close(); openNavigable3DModal(prod); }
        if(action === 'detail') openRackZoom(rid === getViewerProductLocationContext(prod).storeRackId ? 'store' : 'primary');
      });
      syncToolbar();
    }).catch(err => {
      console.error(err);
      if(loading) loading.innerHTML = '<b>No se pudo cargar Three.js</b><span>Falta el módulo local y tampoco fue posible usar el respaldo.</span>';
      showToast('No se pudo cargar el motor 3D.', 'warning');
    });
  }

  function openProductLocationModal(product = appState.selectedProduct){
    ensureAppRuntimeState();
    if(!appState.ui.locationFocusMode) appState.ui.locationFocusMode = 'primary';
    appState.ui.isoIsolation = 'rack';
    appState.ui.isoGhost = true;
    const ctx = getViewerProductLocationContext(product);
    const prod = product || ctx.prod;
    if(!prod){ showToast('Selecciona un producto primero.', 'warning'); return; }
    let modal = document.getElementById('productLocationModal');
    if(modal) modal.remove();
    modal = document.createElement('div');
    modal.id = 'productLocationModal';
    modal.className = 'location-modal-backdrop show';
    modal.innerHTML = `
      <div class="location-modal-card">
        <div class="location-modal-head">
          <div>
            <b>Plano de ubicación del producto</b>
            <div class="muted tiny">Enfoque directo al rack, nivel y slot del producto seleccionado.</div>
          </div>
          <div class="location-modal-head-actions">
            <span class="chip location-focus-chip">${escapeHtml(prod.sku || 'SKU —')}</span>
            <button class="btn secondary nav3d-open-btn" type="button" id="btnOpenNavigable3DFromLocation">Abrir 3D</button>
            <button class="location-modal-close" type="button" aria-label="Cerrar">✕</button>
          </div>
        </div>
        <div class="location-modal-focus-strip">
          <div class="location-focus-product"><span>Producto</span><b>${escapeHtml(prod.nombre || 'Sin nombre')}</b><small>${escapeHtml(prod.sku || 'SKU —')}</small></div>
          <div class="location-focus-target"><span>Ubicación principal</span><b>${escapeHtml(ctx.primaryLoc)}</b><small>Rack ${escapeHtml(ctx.primaryRackId || '—')} · N${escapeHtml(prod.nivel || '—')} · S${escapeHtml(prod.slot || '—')}</small></div>
          <div class="location-focus-target ${ctx.storeRackId && ctx.storeRackId !== ctx.primaryRackId ? '' : 'muted-target'}"><span>Ubicación en almacén</span><b>${escapeHtml(ctx.storeLoc)}</b><small>Rack ${escapeHtml(ctx.storeRackId || '—')} · N${escapeHtml(prod.nivelStore || prod.nivel || '—')} · S${escapeHtml(prod.slotStore || prod.slot || '—')}</small></div>
          <div class="location-focus-tabs" role="group" aria-label="Enfoque de ubicación">
            <button type="button" data-location-focus="primary" class="iso-tool ${appState.ui.locationFocusMode === 'primary' ? 'active' : ''}">Ubicación</button>
            <button type="button" data-location-focus="store" class="iso-tool ${appState.ui.locationFocusMode === 'store' ? 'active' : ''}">Almacén</button>
            <button type="button" data-location-focus="both" class="iso-tool ${appState.ui.locationFocusMode === 'both' ? 'active' : ''}">Ambas</button>
          </div>
        </div>
        <div class="location-modal-body v60-product-location-body">
          <div class="location-modal-main dual-rack-card v60-focused-map">
            <div class="dual-rack-head modal-iso-head">
              <div><b>Plano 2D enfocado al producto</b><div class="muted tiny">Abre con el rack del producto aislado. Usa Zona o Todo solo si necesitas contexto.</div></div>
              <div class="iso-toolbar modal-iso-toolbar" id="locationModalIsoToolbar">
                ${['NE','NW','SE','SW'].map(v => `<button type="button" class="iso-tool ${appState.ui.isoView===v?'active':''}" data-modal-iso-view="${v}">${v}</button>`).join('')}
                <button type="button" class="iso-tool" data-modal-iso-rotate="-1">↺</button>
                <button type="button" class="iso-tool" data-modal-iso-rotate="1">↻</button>
                <button type="button" class="iso-tool ${appState.ui.isoIsolation==='zone'?'active':''}" data-modal-iso-isolate="zone">Zona</button>
                <button type="button" class="iso-tool ${appState.ui.isoIsolation==='rack'?'active':''}" data-modal-iso-isolate="rack">Rack</button>
                <button type="button" class="iso-tool ${appState.ui.isoIsolation==='all'?'active':''}" data-modal-iso-isolate="all">Todo</button>
                <button type="button" class="iso-tool ${appState.ui.isoGhost?'active':''}" data-modal-iso-ghost="toggle">Ghost</button>
                <span class="iso-compass">${escapeHtml(getIsoViewConfig().compass)}</span>
              </div>
            </div>
            <div class="detail-stage"><svg id="locationModalIsoMap" viewBox="-560 -160 1220 820"></svg></div>
          </div>
          <div class="location-modal-side">
            <div class="dual-rack-card"><div class="dual-rack-head"><div><b>Rack de ubicación</b><div class="muted tiny">${escapeHtml(ctx.primaryLoc)}</div></div><span class="chip">${escapeHtml(ctx.primaryRackId || '—')}</span></div><div class="detail-stage dual-rack-svg"><svg id="locationModalRackPrimary"></svg></div></div>
            <div class="dual-rack-card"><div class="dual-rack-head"><div><b>Rack de almacén</b><div class="muted tiny">${escapeHtml(ctx.storeLoc)}</div></div><span class="chip">${escapeHtml(ctx.storeRackId || '—')}</span></div><div class="detail-stage dual-rack-svg"><svg id="locationModalRackStore"></svg></div></div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector('.location-modal-close')?.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if(e.target === modal) modal.remove(); });
    modal.querySelector('#btnOpenNavigable3DFromLocation')?.addEventListener('click', () => openNavigable3DModal(prod));
    const redrawModalViews = () => {
      const updatedCtx = getViewerProductLocationContext(prod);
      const iso = modal.querySelector('#locationModalIsoMap');
      const rackPrimary = modal.querySelector('#locationModalRackPrimary');
      const rackStore = modal.querySelector('#locationModalRackStore');
      const toolbar = modal.querySelector('#locationModalIsoToolbar');
      if(toolbar){
        toolbar.innerHTML = `${['NE','NW','SE','SW'].map(v => `<button type="button" class="iso-tool ${appState.ui.isoView===v?'active':''}" data-modal-iso-view="${v}">${v}</button>`).join('')}<button type="button" class="iso-tool" data-modal-iso-rotate="-1">↺</button><button type="button" class="iso-tool" data-modal-iso-rotate="1">↻</button><button type="button" class="iso-tool ${appState.ui.isoIsolation==='rack'?'active':''}" data-modal-iso-isolate="rack">Rack</button><button type="button" class="iso-tool ${appState.ui.isoIsolation==='zone'?'active':''}" data-modal-iso-isolate="zone">Zona</button><button type="button" class="iso-tool ${appState.ui.isoIsolation==='all'?'active':''}" data-modal-iso-isolate="all">Todo</button><button type="button" class="iso-tool ${appState.ui.isoGhost?'active':''}" data-modal-iso-ghost="toggle">Ghost</button><span class="iso-compass">${escapeHtml(getIsoViewConfig().compass)}</span>`;
      }
      renderIsoLocationSvg(iso, prod);
      renderRackDetail(updatedCtx.primaryRackId, { nivel: prod?.nivel || 0, slot: prod?.slot || 0, label: 'Ubicación', fullLabel: updatedCtx.primaryLoc }, rackPrimary);
      renderRackDetail(updatedCtx.storeRackId, { nivel: prod?.nivelStore || 0, slot: prod?.slotStore || 0, label: 'Almacén', fullLabel: updatedCtx.storeLoc }, rackStore);
      modal.querySelectorAll('[data-modal-iso-view]').forEach(btn => { btn.onclick = () => { setIsoView(btn.dataset.modalIsoView || 'NE'); redrawModalViews(); }; });
      modal.querySelectorAll('[data-modal-iso-rotate]').forEach(btn => { btn.onclick = () => { rotateIsoView(Number(btn.dataset.modalIsoRotate || 1)); redrawModalViews(); }; });
      modal.querySelectorAll('[data-modal-iso-isolate]').forEach(btn => { btn.onclick = () => { appState.ui.isoIsolation = btn.dataset.modalIsoIsolate || 'all'; redrawModalViews(); }; });
      modal.querySelectorAll('[data-modal-iso-ghost]').forEach(btn => { btn.onclick = () => { appState.ui.isoGhost = !appState.ui.isoGhost; redrawModalViews(); }; });
      modal.querySelectorAll('[data-location-focus]').forEach(btn => {
        btn.classList.toggle('active', appState.ui.locationFocusMode === btn.dataset.locationFocus);
        btn.onclick = () => { appState.ui.locationFocusMode = btn.dataset.locationFocus || 'primary'; redrawModalViews(); };
      });
    };
    redrawModalViews();
  }


  let viewerImageRotationTimer = null;
  function clearViewerImageRotationTimer(){
    if(viewerImageRotationTimer){
      clearInterval(viewerImageRotationTimer);
      viewerImageRotationTimer = null;
    }
  }

  function bindViewerProductImageCarousel(host, images, productLabel){
    clearViewerImageRotationTimer();
    if(!host || !Array.isArray(images) || !images.length) return;
    const mediaImg = host.querySelector('.viewer-product-media img');
    const thumbButtons = Array.from(host.querySelectorAll('.viewer-product-thumb'));
    const expandBtn = host.querySelector('.viewer-media-expand');
    if(!mediaImg) return;
    let currentIndex = 0;
    const setActive = (index) => {
      if(!images.length) return;
      currentIndex = ((index % images.length) + images.length) % images.length;
      mediaImg.src = images[currentIndex];
      mediaImg.alt = `${productLabel || 'Producto'} · imagen ${currentIndex + 1}`;
      thumbButtons.forEach((btn, idx) => btn.classList.toggle('active', idx === currentIndex));
    };
    const restartTimer = () => {
      clearViewerImageRotationTimer();
      if(images.length <= 1) return;
      viewerImageRotationTimer = setInterval(() => setActive(currentIndex + 1), 2600);
    };
    thumbButtons.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        setActive(idx);
        restartTimer();
      });
    });
    expandBtn?.addEventListener('click', () => {
      const modal = document.createElement('div');
      modal.className = 'media-lightbox';
      modal.innerHTML = `<button class="media-lightbox-close" type="button" aria-label="Cerrar">✕</button><img src="${escapeHtml(images[currentIndex])}" alt="${escapeHtml(productLabel || 'Producto')}">`;
      document.body.appendChild(modal);
      const close = () => modal.remove();
      modal.querySelector('.media-lightbox-close')?.addEventListener('click', close);
      modal.addEventListener('click', e => { if(e.target === modal) close(); });
    });
    host.addEventListener('mouseenter', () => clearViewerImageRotationTimer(), { passive:true });
    host.addEventListener('mouseleave', () => restartTimer(), { passive:true });
    setActive(0);
    restartTimer();
  }

  function renderViewerProductInfoPanel(){
    clearViewerImageRotationTimer();
    const ctx = getViewerProductLocationContext(appState.selectedProduct);
    const prod = appState.selectedProduct || null;
    detailTitle.textContent = 'Información del producto';
    detailSubtitle.textContent = '';
    detailStatus.textContent = prod ? `Producto activo: ${prod.sku || '—'}` : 'Sin selección';
    detailChip.textContent = prod ? (prod.ubicacion || '—') : '—';
    if(!prod){
      detailWrap.innerHTML = `<div class="viewer-product-info-card empty"><div class="empty compact"><b>Sin producto seleccionado</b><div class="muted tiny">Usa la búsqueda central para seleccionar un producto y ver sus variantes.</div></div></div>`;
      return;
    }
    const images = getProductImageUrls(prod).filter(Boolean);
    const img = images[0] || '';
    const thumbs = images.slice(0, 6).map((url, idx) => `<button class="viewer-product-thumb ${idx === 0 ? 'active' : ''}" type="button"><img src="${escapeHtml(url)}" alt="Vista ${idx + 1}"></button>`).join('');
    const family = getViewerProductFamilySummary(prod);
    const sizesHtml = family.sizes.length
      ? family.sizes.map(size => `<span class="viewer-variant-chip size">${escapeHtml(size)}</span>`).join('')
      : '<span class="muted tiny">Sin tallas detectadas</span>';
    const colorsHtml = family.colors.length
      ? family.colors.map(color => `<span class="viewer-variant-chip color" style="${getViewerColorChipStyle(color)}">${escapeHtml(color)}</span>`).join('')
      : '<span class="muted tiny">Sin colores detectados</span>';
    detailWrap.innerHTML = `
      <div class="viewer-product-info-card viewer-product-premium-card compact-fit product-only-panel">
        <div class="viewer-product-top-layout">
          <div class="viewer-media-col">
            <div class="viewer-product-media ${img ? '' : 'empty'}">
              ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(prod.nombre || 'Producto')}">` : '<span>Sin imagen</span>'}
              ${img ? '<button class="viewer-media-expand" type="button" title="Ampliar imagen">⛶</button>' : ''}
            </div>
            ${thumbs ? `<div class="viewer-product-thumbs">${thumbs}</div>` : ''}
          </div>
          <div class="viewer-side-col">
            <div class="viewer-product-copy tight">
              <div class="search-card-kicker">Producto</div>
              <h2>${escapeHtml(prod.nombre || 'Sin nombre')}</h2>
              <div class="viewer-sku-pill">${escapeHtml(prod.sku || 'SKU —')}</div>
            </div>
            <div class="viewer-info-grid viewer-info-icon-grid top-right-grid location-only-grid">
              <div class="search-meta-block emphasis"><span class="viewer-info-icon">⌖</span><span class="search-meta-label">Ubicación</span><span class="search-meta-value">${escapeHtml(ctx.primaryLoc)}</span></div>
              <div class="search-meta-block emphasis"><span class="viewer-info-icon">◫</span><span class="search-meta-label">Ubicación en almacén</span><span class="search-meta-value store">${escapeHtml(ctx.storeLoc)}</span></div>
            </div>
          </div>
        </div>
        <div class="viewer-bottom-info product-variants-only">
          <div class="viewer-variant-panel">
            <div class="viewer-variant-head"><span class="viewer-info-icon">T</span><div><b>Tallas del modelo</b><small>${family.sizes.length || 0} registradas</small></div></div>
            <div class="viewer-variant-chip-wrap">${sizesHtml}</div>
          </div>
          <div class="viewer-variant-panel">
            <div class="viewer-variant-head"><span class="viewer-info-icon color-dot"></span><div><b>Colores del modelo</b><small>${family.colors.length || 0} registrados</small></div></div>
            <div class="viewer-variant-chip-wrap">${colorsHtml}</div>
          </div>
        </div>
        <div class="viewer-location-actions viewer-location-actions-extended"><button class="btn primary viewer-location-btn" type="button" id="btnOpenLocationModal"><span>⌖</span> Ver ubicación</button><button class="btn secondary viewer-location-btn nav3d-inline-btn" type="button" id="btnOpenNavigable3D"><span>◈</span> Localizar en 3D</button><button class="btn secondary viewer-location-btn" type="button" id="btnOpenVariants"><span>▦</span> Variantes</button></div>
      </div>`;
    document.getElementById('btnOpenLocationModal')?.addEventListener('click', () => openProductLocationModal(prod));
    document.getElementById('btnOpenNavigable3D')?.addEventListener('click', () => openNavigable3DModal(prod));
    document.getElementById('btnOpenVariants')?.addEventListener('click', () => openProductVariantsModal(prod));
    bindViewerProductImageCarousel(detailWrap, images, prod.nombre || prod.sku || 'Producto');
  }

  function renderMapView(){
    const layoutBranchIndex = getActiveLayoutBranchIndex();
    const branches = appState.admin?.branches || [];
    const activeBranch = branches[layoutBranchIndex] || branches[getActiveSheetBranchIndex()] || null;
    const rackIdsInLayout = new Set((appState.layout?.racks || []).map(r => r.id));
    const selectedProd = appState.selectedProduct;
    const productMatchesLayout = selectedProd && (
      (selectedProd.rack && rackIdsInLayout.has(selectedProd.rack)) ||
      (selectedProd.rackStore && rackIdsInLayout.has(selectedProd.rackStore))
    );
    const prod = productMatchesLayout ? selectedProd : null;
    if(!productMatchesLayout && appState.selectedProduct){
      appState.selectedProduct = null;
    }
    setUnifiedMapLayout(true);
    contentTitle.textContent = 'Plano general 3D isométrico';
    contentSubtitle.textContent = 'Sección unificada: arriba plano general; abajo racks de ubicación y almacén.';
    setTags(['isométrico', 'pan + zoom', 'resaltado', 'racks realistas']);

    const primaryRackId = (prod?.rack && rackIdsInLayout.has(prod.rack) ? prod.rack : '') || (appState.selectedRack && rackIdsInLayout.has(appState.selectedRack) ? appState.selectedRack : '') || appState.layout.racks[0]?.id || '';
    const storeRackId = (prod?.rackStore && rackIdsInLayout.has(prod.rackStore) ? prod.rackStore : '') || primaryRackId;
    const primaryLoc = prod?.ubicacion || primaryRackId || '—';
    const storeLoc = prod?.almacen || storeRackId || '—';

    renderViewerBranchHost(layoutBranchIndex);
    if(appState.screen === 'viewer'){
      if(contentWrap) contentWrap.innerHTML = '';
      renderViewerProductInfoPanel();
      contentStatus.textContent = prod ? `Producto activo: ${prod.sku || '—'}` : 'Busca y selecciona un producto';
      contentFootRight.textContent = prod ? `${primaryLoc} • ALM: ${storeLoc}` : `${(appState.products || []).length.toLocaleString('es-PE')} productos`;
      return;
    }

    contentWrap.innerHTML = `
      <div class="map-unified" style="grid-template-columns:minmax(0,1fr) clamp(320px,28vw,420px);grid-template-rows:minmax(0,1fr);gap:8px;">
        <div class="dual-rack-card" style="min-height:0;display:grid;grid-template-rows:auto 1fr;">
          <div class="dual-rack-head">
            <div>
              <b>Plano general 3D isométrico</b>
              <div class="muted tiny">Mapa navegable con foco en el producto activo.</div>
              <span class="loc-full">Sucursal: ${escapeHtml(activeBranch?.name || '—')} • Ubicación: ${primaryLoc} • Almacén: ${storeLoc}</span>
            </div>
            <div class="iso-toolbar" id="isoToolbar">
              ${['NE','NW','SE','SW'].map(v => `<button type="button" class="iso-tool ${appState.ui.isoView===v?'active':''}" data-iso-view="${v}">${v}</button>`).join('')}
              <button type="button" class="iso-tool" data-iso-rotate="-1">↺</button>
              <button type="button" class="iso-tool" data-iso-rotate="1">↻</button>
              <button type="button" class="iso-tool ${appState.ui.isoIsolation==='zone'?'active':''}" data-iso-isolate="zone">Aislar zona</button>
              <button type="button" class="iso-tool ${appState.ui.isoIsolation==='rack'?'active':''}" data-iso-isolate="rack">Aislar rack</button>
              <button type="button" class="iso-tool ${appState.ui.isoIsolation==='all'?'active':''}" data-iso-isolate="all">Todo</button>
              <button type="button" class="iso-tool ${appState.ui.isoGhost?'active':''}" data-iso-ghost="toggle">Ghost</button>
              <span class="iso-compass">${escapeHtml(getIsoViewConfig().compass)}</span>
            </div>
          </div>
          <div class="detail-stage"><svg id="isoMap" viewBox="-560 -160 1220 820"></svg></div>
        </div>
        <div class="map-bottom-split" style="grid-template-columns:1fr;grid-template-rows:1fr 1fr;height:100%;min-height:0;width:100%;gap:8px;">
          <div class="dual-rack-card">
            <div class="dual-rack-head">
              <div>
                <b>Rack de ubicación</b>
                <div class="muted tiny">Ubicación principal del producto</div>
                <span class="loc-full" id="rackPrimaryLoc">—</span>
              </div>
              <span class="chip" id="rackPrimaryChip">—</span>
            </div>
            <div class="detail-stage dual-rack-svg"><svg id="rackViewPrimary" viewBox="-121.59515592786995 -225.15226089174166 324.75952572292744 432.80452177622624"></svg></div>
          </div>
          <div class="dual-rack-card">
            <div class="dual-rack-head">
              <div>
                <b>Rack de almacén</b>
                <div class="muted tiny">Ubicación de respaldo / almacén</div>
                <span class="loc-full" id="rackStoreLoc">—</span>
              </div>
              <span class="chip" id="rackStoreChip">—</span>
            </div>
            <div class="detail-stage dual-rack-svg"><svg id="rackViewStore" viewBox="-134.86196899414062 -198.444665512236 282.6610565185547 387.889331024472"></svg></div>
          </div>
        </div>
      </div>`;
    detailWrap.innerHTML = `
      <div class="viewer-focus-banner">
        <div class="focus-copy">
          <div class="focus-title">${prod ? escapeHtml(prod.nombre || 'Producto activo') : 'Plano listo para explorar'}</div>
          <div class="focus-sub">${prod ? `Zona ${escapeHtml(prod.zona || '—')} • Rack ${escapeHtml(primaryRackId || '—')} • Nivel ${escapeHtml(String(prod.nivel || 0))} • Slot ${escapeHtml(String(prod.slot || 0))}` : 'Selecciona un producto desde la lista y el visor centrará zona, rack y ubicación principal.'}</div>
        </div>
        <div class="focus-actions">
          <button class="btn secondary" type="button" id="viewerCenterSelectedBtn">Centrar producto</button>
          <button class="btn secondary" type="button" id="viewerRefreshMapBtn">Actualizar visor</button>
        </div>
      </div>
      <div class="panel-shell">
        <div class="panel-shell-head">
          <div>
            <b>Ubicación principal y de almacén</b>
            <div class="muted tiny">Resumen uniforme para leer rápido la ruta del producto dentro del plano.</div>
          </div>
          <span class="chip">${prod ? escapeHtml(prod.sku || 'SKU —') : 'Sin selección'}</span>
        </div>
        <div class="panel-shell-grid-2">
          <div class="metric-tile">
            <span class="metric-label">Ubicación principal</span>
            <span class="metric-value">${escapeHtml(primaryLoc)}</span>
            <span class="metric-note">Zona ${escapeHtml(prod?.zona || '—')} • Rack ${escapeHtml(primaryRackId || '—')} • Nivel ${escapeHtml(String(prod?.nivel || 0))} • Slot ${escapeHtml(String(prod?.slot || 0))}</span>
          </div>
          <div class="metric-tile">
            <span class="metric-label">Ubicación de almacén</span>
            <span class="metric-value">${escapeHtml(storeLoc)}</span>
            <span class="metric-note">Zona ${escapeHtml(prod?.zonaStore || '—')} • Rack ${escapeHtml(storeRackId || '—')} • Nivel ${escapeHtml(String(prod?.nivelStore || 0))} • Slot ${escapeHtml(String(prod?.slotStore || 0))}</span>
          </div>
        </div>
      </div>
      <div class="panel-shell compact">
        <div class="panel-shell-grid-3">
          <div class="metric-tile">
            <span class="metric-label">Sucursal</span>
            <span class="metric-value">${escapeHtml(activeBranch?.name || '—')}</span>
            <span class="metric-note">Visor conectado a la sucursal activa.</span>
          </div>
          <div class="metric-tile">
            <span class="metric-label">Rack activo</span>
            <span class="metric-value">${escapeHtml(primaryRackId || '—')}</span>
            <span class="metric-note">${prod ? 'Se resalta en el mapa isométrico.' : 'Selecciona un producto para resaltarlo.'}</span>
          </div>
          <div class="metric-tile">
            <span class="metric-label">Estado visual</span>
            <span class="metric-value">${prod ? 'En foco' : 'Exploración libre'}</span>
            <span class="metric-note">${prod ? 'Zona, rack y slots sincronizados.' : 'Puedes navegar por el plano manualmente.'}</span>
          </div>
        </div>
      </div>`;
    detailTitle.textContent = 'Ruta visual del producto';
    detailSubtitle.textContent = prod ? 'La selección actual ya está conectada con zona, rack, nivel y slot.' : 'Resumen operativo del visor isométrico.';
    detailStatus.textContent = prod ? `${primaryRackId} / ${storeRackId}` : '—';
    detailChip.textContent = prod ? `U: N${prod.nivel||0} S${prod.slot||0} • A: N${prod.nivelStore||0} S${prod.slotStore||0}` : '—';
    const svg = $('#isoMap');
    const rackSvgPrimary = $('#rackViewPrimary');
    const rackSvgStore = $('#rackViewStore');
    const defs = svgEl('defs');
    const glow = svgEl('filter',{id:'mapGlow',x:'-40%',y:'-40%',width:'180%',height:'180%'});
    glow.appendChild(svgEl('feDropShadow',{dx:'0',dy:'0',stdDeviation:'10','flood-color':'#50e37b','flood-opacity':'.55'}));
    defs.appendChild(glow); svg.appendChild(defs);
    const root = svgEl('g',{id:'mapRoot',transform:'translate(0 0) scale(1)'}); svg.appendChild(root);

    const bounds = getLayoutContentBounds();
    const padX = Math.max(280, bounds.w * 0.22);
    const padY = Math.max(280, bounds.h * 0.22);
    const floorRect = {
      x: bounds.x - padX,
      y: bounds.y - padY,
      w: bounds.w + padX * 2,
      h: bounds.h + padY * 2
    };
    const floor = face([
      toIso(floorRect.x, floorRect.y, 0),
      toIso(floorRect.x + floorRect.w, floorRect.y, 0),
      toIso(floorRect.x + floorRect.w, floorRect.y + floorRect.h, 0),
      toIso(floorRect.x, floorRect.y + floorRect.h, 0)
    ],{fill:'rgba(255,255,255,.025)',stroke:'rgba(255,255,255,.08)','stroke-width':'2'});
    root.appendChild(floor);
    const isoGrid = svgEl('g',{opacity:'.36'});
    const gridStep = Math.max(4, getSnapSize() * 2);
    for(let gx = Math.floor(floorRect.x / gridStep) * gridStep; gx <= floorRect.x + floorRect.w; gx += gridStep){
      const a = toIso(gx, floorRect.y, 0);
      const b = toIso(gx, floorRect.y + floorRect.h, 0);
      isoGrid.appendChild(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'rgba(120,162,210,.22)','stroke-width':'1'}));
    }
    for(let gy = Math.floor(floorRect.y / gridStep) * gridStep; gy <= floorRect.y + floorRect.h; gy += gridStep){
      const a = toIso(floorRect.x, gy, 0);
      const b = toIso(floorRect.x + floorRect.w, gy, 0);
      isoGrid.appendChild(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'rgba(120,162,210,.22)','stroke-width':'1'}));
    }
    root.appendChild(isoGrid);

    let projected = [
      toIso(floorRect.x, floorRect.y, 0),
      toIso(floorRect.x + floorRect.w, floorRect.y, 0),
      toIso(floorRect.x + floorRect.w, floorRect.y + floorRect.h, 0),
      toIso(floorRect.x, floorRect.y + floorRect.h, 0)
    ];

    const isolation = appState.ui?.isoIsolation || 'all';
    const focusZoneIds = new Set([prod?.zona, prod?.zonaStore].filter(Boolean));
    const focusRackIds = new Set([primaryRackId, storeRackId].filter(Boolean));
    const visibleZones = appState.layout.zones.filter(z => isolation === 'all' || focusZoneIds.has(z.id));
    const visibleZoneIds = new Set(visibleZones.map(z => z.id));

    visibleZones.forEach(z => {
      const pts = z.pts.map(p => toIso(p.x, p.y, 0));
      projected.push(...pts);
      const isMainZone = prod?.zona === z.id;
      const isStoreZone = prod?.zonaStore === z.id;
      const isSearchZone = (prod?.zona || prod?.zonaStore) === z.id;
      const ghostZone = appState.ui.isoGhost && prod && isolation === 'all' && !isSearchZone;
      const cls = 'zone-floor' + (isMainZone ? ' active' : '') + (isStoreZone ? ' storage' : '') + (isSearchZone ? ' search-focus' : '') + (ghostZone ? ' iso-ghost' : '');
      const zoneColor = z.color || getBranchColor(layoutBranchIndex) || '#ffd84d';
      const baseFill = hexToRgba(zoneColor, ghostZone ? 0.08 : (isSearchZone ? 0.30 : 0.22));
      const baseStroke = hexToRgba(zoneColor, ghostZone ? 0.34 : (isSearchZone ? 0.98 : 0.92));
      const path = svgEl('path',{d:`M ${pts.map(pt => `${pt.x} ${pt.y}`).join(' L ')} Z`,class:cls,fill:baseFill,stroke:baseStroke,'stroke-width':isSearchZone ? '2.8' : '2.1'});
      root.appendChild(path);
      const c = centroid(z.pts); const ci = toIso(c.x,c.y,0);
      projected.push(ci);
      const label = svgEl('text',{x:ci.x,y:ci.y,class:'zone-label','text-anchor':'middle'}); label.textContent = z.id; root.appendChild(label);
      if(z.name && z.name.toUpperCase() !== z.id.toUpperCase()){
        const sub = svgEl('text',{x:ci.x,y:ci.y + 22,class:'ortho-label','text-anchor':'middle'}); sub.textContent = z.name; root.appendChild(sub);
      }
    });

    const racks = appState.layout.racks.slice()
      .filter(r => {
        if(isolation === 'rack') return focusRackIds.has(r.id);
        if(isolation === 'zone') return visibleZoneIds.has(r.zoneId);
        return true;
      })
      .sort((a,b)=>(a.x+a.y+Number(a.baseHeight||0))-(b.x+b.y+Number(b.baseHeight||0)));
    racks.forEach(r => {
      const rackGroup = buildIsoRack(r, prod);
      if(appState.ui.isoGhost && prod && isolation === 'all' && !focusRackIds.has(r.id)){
        rackGroup.group.setAttribute('opacity','.32');
      }
      root.appendChild(rackGroup.group);
      if(Array.isArray(rackGroup.projectedPoints)) projected.push(...rackGroup.projectedPoints);
    });

    if(projected.length){
      const minX = Math.min(...projected.map(p => p.x));
      const maxX = Math.max(...projected.map(p => p.x));
      const minY = Math.min(...projected.map(p => p.y));
      const maxY = Math.max(...projected.map(p => p.y));
      const padVX = Math.max(80, (maxX - minX) * 0.12);
      const padVY = Math.max(80, (maxY - minY) * 0.16);
      svg.setAttribute('viewBox', `${Math.floor(minX - padVX)} ${Math.floor(minY - padVY)} ${Math.ceil((maxX - minX) + padVX * 2)} ${Math.ceil((maxY - minY) + padVY * 2)}`);
    }

    enablePanZoom(svg, root, focusBoundsForProduct(prod), { tx:0, ty:0, scale:1.35 });

    renderRackDetail(primaryRackId, { nivel: prod?.nivel || 0, slot: prod?.slot || 0, label: 'Ubicación', fullLabel: primaryLoc }, rackSvgPrimary);
    renderRackDetail(storeRackId, { nivel: prod?.nivelStore || 0, slot: prod?.slotStore || 0, label: 'Almacén', fullLabel: storeLoc }, rackSvgStore);
    if($('#rackPrimaryChip')) $('#rackPrimaryChip').textContent = primaryRackId || '—';
    if($('#rackStoreChip')) $('#rackStoreChip').textContent = storeRackId || '—';
    if($('#rackPrimaryLoc')) $('#rackPrimaryLoc').textContent = primaryLoc;
    if($('#rackStoreLoc')) $('#rackStoreLoc').textContent = storeLoc;
    contentStatus.textContent = prod ? `Producto activo: ${prod.sku} • ${prod.rack}` : 'Visualizando layout actual';
    contentFootRight.textContent = prod ? `${primaryLoc} • ALM: ${storeLoc}` : `${(appState.layout?.zones || []).length} zonas • ${(appState.layout?.racks || []).length} racks`;
    document.querySelectorAll('[data-iso-view]').forEach(btn => {
      btn.onclick = () => { setIsoView(btn.dataset.isoView || 'NE'); renderMapView(); };
    });
    document.querySelectorAll('[data-iso-rotate]').forEach(btn => {
      btn.onclick = () => { rotateIsoView(Number(btn.dataset.isoRotate || 1)); renderMapView(); };
    });
    document.querySelectorAll('[data-iso-isolate]').forEach(btn => {
      btn.onclick = () => { appState.ui.isoIsolation = btn.dataset.isoIsolate || 'all'; renderMapView(); };
    });
    document.querySelectorAll('[data-iso-ghost]').forEach(btn => {
      btn.onclick = () => { appState.ui.isoGhost = !appState.ui.isoGhost; renderMapView(); };
    });
    const centerBtn = document.getElementById('viewerCenterSelectedBtn');
    if(centerBtn) centerBtn.onclick = () => { appState.ui.isoIsolation = appState.ui.isoIsolation || 'all'; focusSelectedProductInViewer({ switchScreen:false }); };
    const refreshBtn = document.getElementById('viewerRefreshMapBtn');
    if(refreshBtn) refreshBtn.onclick = () => renderMapView();
  }

  function buildBlinkMarker(x, y, color = '#ffd84d', store = false){
    const g = svgEl('g',{class:'marker-blink' + (store ? ' store' : ''), transform:`translate(${x} ${y})`});
    const stem = svgEl('line',{x1:'0',y1:'-18',x2:'0',y2:'-2',stroke:color,'stroke-width':'2.6','stroke-linecap':'round',opacity:'.92'});
    const circle = svgEl('circle',{cx:'0',cy:'-22',r:'5.5',fill:'none',stroke:color,'stroke-width':'2',opacity:'.8'});
    const arrow = svgEl('path',{class:'arrow-core',d:'M 0 0 L -8 -14 L -2 -14 L -2 -30 L 2 -30 L 2 -14 L 8 -14 Z',fill:color,stroke:'rgba(255,255,255,.45)','stroke-width':'0.8'});
    g.appendChild(circle);
    g.appendChild(stem);
    g.appendChild(arrow);
    return g;
  }

  function getRackIsoPlan(r){
    const fp = getRackFootprint(r.modelId, 0);
    const bw = fp.baseW || r.w || 120;
    const bd = fp.baseH || r.h || 80;
    const cx = Number(r.x || 0) + Number(r.w || bw) / 2;
    const cy = Number(r.y || 0) + Number(r.h || bd) / 2;
    const ang = normalizeAngle(r.rot || 0) * Math.PI / 180;
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const local = [
      { x:-bw/2, y:-bd/2 },
      { x:bw/2, y:-bd/2 },
      { x:bw/2, y:bd/2 },
      { x:-bw/2, y:bd/2 }
    ];
    const corners = local.map(pt => ({ x:cx + pt.x * cos - pt.y * sin, y:cy + pt.x * sin + pt.y * cos }));
    return { corners, center:{ x:cx, y:cy }, bw, bd };
  }



  function clampUnderStairsTopLength(model){
    const width = Math.max(30, Number(model?.width || 180) || 180);
    const raw = Number(model?.topLength || model?.topWidth || Math.round(width * 0.33)) || Math.round(width * 0.33);
    return Math.max(8, Math.min(width - 8, raw));
  }
  function isUnderStairsStyle(style){
    const normalized = normalizeRackStyle(style);
    return normalized === 'under_stairs' || normalized === 'under_stairs_reflected';
  }
  function isUnderStairsMirrored(model){
    const style = normalizeRackStyle(model?.style);
    return style === 'under_stairs_reflected' ? true : !!model?.mirrored;
  }
  function getAdaptiveSlotCount(requestedSlots, availableWidth, minSlotWidth = 18){
    const desired = Math.max(1, Math.min(6, Number(requestedSlots || 1) || 1));
    const fit = Math.max(1, Math.floor(Math.max(6, Number(availableWidth || 0)) / Math.max(8, Number(minSlotWidth || 18))));
    return Math.max(1, Math.min(desired, fit));
  }

  function getUnderStairsShape(model){
    const width = Math.max(30, Number(model?.width || 180) || 180);
    const depth = Math.max(20, Number(model?.depth || 45) || 45);
    const rawLeftHeight = Math.max(20, Number(model?.leftHeight || model?.height || 240) || 240);
    const rawRightHeight = Math.max(20, Number(model?.rightHeight || Math.max(40, ((model?.height || 240) * 0.35))) || Math.max(40, ((model?.height || 240) * 0.35)));
    const mirrored = isUnderStairsMirrored(model);
    const panel1Height = Math.max(rawLeftHeight, rawRightHeight);
    const panel2Height = Math.min(rawLeftHeight, rawRightHeight);
    const leftHeight = mirrored ? panel2Height : panel1Height;
    const rightHeight = mirrored ? panel1Height : panel2Height;
    const rawTopLength = Math.max(8, Number(model?.topLength || clampUnderStairsTopLength(model)) || clampUnderStairsTopLength(model));
    const tallerLeft = leftHeight >= rightHeight;
    const tallHeight = tallerLeft ? leftHeight : rightHeight;
    const lowHeight = tallerLeft ? rightHeight : leftHeight;
    const topLength = Math.max(8, Math.min(width - 8, rawTopLength));
    const flatStart = tallerLeft ? 0 : Math.max(0, width - topLength);
    const flatEnd = tallerLeft ? Math.min(width, topLength) : width;
    const slopeSpan = Math.max(8, width - (flatEnd - flatStart));
    const roofEdgeLength = Math.sqrt((slopeSpan * slopeSpan) + Math.pow(tallHeight - lowHeight, 2));
    const topHeightAt = (xValue) => {
      const x = Math.max(0, Math.min(width, Number(xValue) || 0));
      if(Math.abs(tallHeight - lowHeight) < 0.001) return tallHeight;
      if(tallerLeft){
        if(x <= flatEnd) return tallHeight;
        const t = Math.max(0, Math.min(1, (x - flatEnd) / Math.max(1, width - flatEnd)));
        return tallHeight + ((lowHeight - tallHeight) * t);
      }
      if(x >= flatStart) return tallHeight;
      const t = Math.max(0, Math.min(1, x / Math.max(1, flatStart)));
      return lowHeight + ((tallHeight - lowHeight) * t);
    };
    const shelfRangeAtZ = (zValue) => {
      const z = Math.max(0, Number(zValue) || 0);
      if(Math.abs(tallHeight - lowHeight) < 0.001 || z <= lowHeight) return { start:0, end:width };
      if(z >= tallHeight) return { start:flatStart, end:flatEnd };
      const ratio = Math.max(0, Math.min(1, (tallHeight - z) / Math.max(1, tallHeight - lowHeight)));
      if(tallerLeft){
        const end = flatEnd + (width - flatEnd) * ratio;
        return { start:0, end:Math.max(flatEnd, Math.min(width, end)) };
      }
      const start = flatStart * (1 - ratio);
      return { start:Math.max(0, Math.min(flatStart, start)), end:width };
    };
    return { width, depth, leftHeight, rightHeight, topLength, roofEdgeLength, tallerLeft, tallHeight, lowHeight, flatStart, flatEnd, slopeSpan, mirrored, rawLeftHeight, rawRightHeight, panel1Height, panel2Height, topHeightAt, shelfRangeAtZ };
  }



  function getRackBoxDepth(furnitureDepth, paddingCm = 3, minDepth = 12){
    const fd = Math.max(0, Number(furnitureDepth) || 0);
    return Math.max(minDepth, fd - paddingCm);
  }

  const UNDER_STAIRS_BOX_FORWARD_CM = 2;
  const UNDER_STAIRS_SLOPE_COLLISION_CLEARANCE_CM = 3;


  function getUnderStairsSafeSlotRange(shape, baseRange, boxTopZ, roofThickness = 0, sideMargin = 2.2, slopeClearance = UNDER_STAIRS_SLOPE_COLLISION_CLEARANCE_CM){
    const range = {
      start: Math.max(0, Number(baseRange?.start || 0) || 0),
      end: Math.max(0, Number(baseRange?.end || 0) || 0)
    };
    if(range.end <= range.start) return null;
    const safeProbeZ = Math.max(0, Number(boxTopZ || 0) + Math.max(2.2, Number(roofThickness || 0)) + 1.2);
    const topRange = shape?.shelfRangeAtZ ? shape.shelfRangeAtZ(safeProbeZ) : range;
    const slopeGap = Math.max(0, Number(slopeClearance || 0) || 0);
    let start = Math.max(range.start, Number(topRange?.start || range.start) || range.start) + sideMargin;
    let end = Math.min(range.end, Number(topRange?.end || range.end) || range.end) - sideMargin;
    if(shape?.tallerLeft){
      end -= slopeGap;
    } else {
      start += slopeGap;
    }
    if(end <= start) return null;
    return { start, end };
  }

  function drawStandardIsoStorageBox(target, toIsoFn, options = {}){
    const {
      slotClass = false,
      bx = 0,
      bw = 20,
      by = 0,
      boxDepth = 20,
      boxBottomZ = 0,
      dividerTopZ = 40,
      shelfY0 = 0,
      shelfY1 = 30,
      glowFilter = ''
    } = options;
    const boxHeight = Math.max(20, Math.min((dividerTopZ - boxBottomZ) - 4, (dividerTopZ - boxBottomZ) * 0.72));
    const effectiveTopZ = boxBottomZ + boxHeight;
    const lidRise = Math.max(2.4, Math.min(5.2, boxHeight * 0.08));
    const lidTopZ = Math.min(dividerTopZ - 2, effectiveTopZ + lidRise);
    const lidOverhang = Math.max(0.7, Math.min(1.35, bw * 0.018));
    const lidFront = by;
    const lidBack = by + boxDepth;
    const tapeX0 = bx + bw * 0.42;
    const tapeX1 = tapeX0 + Math.max(4, bw * 0.09);
    const labelW = Math.max(10, bw * 0.26);
    const labelH = Math.max(6, boxHeight * 0.15);
    const labelX = bx + bw * 0.2;
    const labelY = by + boxDepth - 0.6;
    const labelTopZ = boxBottomZ + boxHeight * 0.38;
    const handleW = 0;
    const handleH = 0;
    const handleX = 0;
    const handleTopZ = 0;
    const handleY = 0;
    const colors = slotClass ? {top:'#8cff4b', front:'#69e230', right:'#5dd228', lid:'#b0ff79', lidFront:'#8de75d', lidRight:'#7ad848', tape:'#78cc45', shadow:'rgba(73,120,42,.18)'}
                             : {top:'#ebbb7a', front:'#d8a260', right:'#c98e4d', lid:'#f2c98f', lidFront:'#dfb273', lidRight:'#cf9853', tape:'#b67a3d', shadow:'rgba(88,58,22,.16)'};
    target.appendChild(face([
      toIsoFn(bx + 1.3, by + 1.3, boxBottomZ + 0.25),
      toIsoFn(bx+bw + 1.3, by + 1.3, boxBottomZ + 0.25),
      toIsoFn(bx+bw + 1.3, by+boxDepth + 1.3, boxBottomZ + 0.25),
      toIsoFn(bx + 1.3, by+boxDepth + 1.3, boxBottomZ + 0.25)
    ],{fill:colors.shadow,stroke:'none'}));
    target.appendChild(face([
      toIsoFn(bx, by, effectiveTopZ),
      toIsoFn(bx+bw, by, effectiveTopZ),
      toIsoFn(bx+bw, by+boxDepth, effectiveTopZ),
      toIsoFn(bx, by+boxDepth, effectiveTopZ)
    ],{fill:colors.top,stroke:slotClass?'#53d61d':'#9b6829','stroke-width':'1.1',filter:slotClass && glowFilter ? glowFilter : ''}));
    target.appendChild(face([
      toIsoFn(bx, by+boxDepth, effectiveTopZ),
      toIsoFn(bx+bw, by+boxDepth, effectiveTopZ),
      toIsoFn(bx+bw, by+boxDepth, boxBottomZ),
      toIsoFn(bx, by+boxDepth, boxBottomZ)
    ],{fill:colors.front,stroke:'rgba(128,83,25,.55)','stroke-width':'0.8'}));
    target.appendChild(face([
      toIsoFn(bx+bw, by, effectiveTopZ),
      toIsoFn(bx+bw, by+boxDepth, effectiveTopZ),
      toIsoFn(bx+bw, by+boxDepth, boxBottomZ),
      toIsoFn(bx+bw, by, boxBottomZ)
    ],{fill:colors.right,stroke:'rgba(116,75,22,.45)','stroke-width':'0.8'}));
    target.appendChild(face([
      toIsoFn(bx-lidOverhang, lidFront, lidTopZ),
      toIsoFn(bx+bw+lidOverhang, lidFront, lidTopZ),
      toIsoFn(bx+bw+lidOverhang, lidBack, lidTopZ),
      toIsoFn(bx-lidOverhang, lidBack, lidTopZ)
    ],{fill:colors.lid,stroke:'rgba(176,116,49,.65)','stroke-width':'0.9'}));
    target.appendChild(face([
      toIsoFn(bx-lidOverhang, lidBack, lidTopZ),
      toIsoFn(bx+bw+lidOverhang, lidBack, lidTopZ),
      toIsoFn(bx+bw+lidOverhang, lidBack, effectiveTopZ),
      toIsoFn(bx-lidOverhang, lidBack, effectiveTopZ)
    ],{fill:colors.lidFront}));
    target.appendChild(face([
      toIsoFn(bx+bw+lidOverhang, lidFront, lidTopZ),
      toIsoFn(bx+bw+lidOverhang, lidBack, lidTopZ),
      toIsoFn(bx+bw+lidOverhang, lidBack, effectiveTopZ),
      toIsoFn(bx+bw+lidOverhang, lidFront, effectiveTopZ)
    ],{fill:colors.lidRight}));
    target.appendChild(face([
      toIsoFn(tapeX0, lidFront + 0.5, lidTopZ + 0.03),
      toIsoFn(tapeX1, lidFront + 0.5, lidTopZ + 0.03),
      toIsoFn(tapeX1, lidBack - 0.5, lidTopZ + 0.03),
      toIsoFn(tapeX0, lidBack - 0.5, lidTopZ + 0.03)
    ],{fill:colors.tape,stroke:'none'}));
    target.appendChild(face([
      toIsoFn(labelX, labelY, labelTopZ),
      toIsoFn(labelX + labelW, labelY, labelTopZ),
      toIsoFn(labelX + labelW, labelY, labelTopZ - labelH),
      toIsoFn(labelX, labelY, labelTopZ - labelH)
    ],{fill:'rgba(255,248,234,.96)',stroke:'rgba(214,194,162,.65)','stroke-width':'0.45'}));
  }


  function buildUnderStairsIsoRack(r, prod){
    const model = rackModel(r.modelId) || {};
    const g = svgEl('g',{class:'rack-iso under-stairs','data-rack':r.id});
    const main = prod?.rack === r.id;
    const store = prod?.rackStore === r.id;
    const selected = (appState.selectedRack || prod?.rack) === r.id;
    const searchHit = isRackSearchHit(r.id);
    const searchPrimary = appState.primaryHighlightedRackId === r.id;
    const levelHighlight = main ? Number(prod?.nivel || 0) : (store ? Number(prod?.nivelStore || 0) : 0);
    if(main) g.classList.add('active');
    if(store) g.classList.add('storage');
    if(selected || searchPrimary) g.classList.add('selected');
    if(searchHit) g.classList.add('search-hit');
    if(prod && !main && !store && !searchHit) g.classList.add('dim');

    const plan = getRackIsoPlan(r);
    const baseHeight = Math.max(0, Number(r.baseHeight || 0) * ISO_Z_SCALE);
    const modelWidth = Math.max(30, Number(model.width || plan.bw || 180) || 180);
    const scaledTop = clampUnderStairsTopLength(model) * (Math.max(30, plan.bw || modelWidth) / modelWidth);
    const baseShape = getUnderStairsShape({
      width: Math.max(30, plan.bw || modelWidth),
      depth: Math.max(20, plan.bd || model.depth || 45),
      leftHeight: Math.max(20, Number(model.leftHeight || model.height || 238) || 238),
      rightHeight: Math.max(20, Number(model.rightHeight || Math.max(40, (model.height||238) * 0.35)) || Math.max(40, (model.height||238) * 0.35)),
      topLength: scaledTop,
      mirrored: isUnderStairsMirrored(model)
    });
    const scaledRackHeight = Math.max(40, Number(r.rackHeight || model.height || baseShape.tallHeight || 238) * ISO_Z_SCALE);
    const shapeHeightScale = scaledRackHeight / Math.max(1, baseShape.tallHeight || 1);
    const shape = getUnderStairsShape({
      width: baseShape.width,
      depth: baseShape.depth,
      leftHeight: Math.max(20, baseShape.leftHeight * shapeHeightScale),
      rightHeight: Math.max(20, baseShape.rightHeight * shapeHeightScale),
      topLength: baseShape.topLength,
      mirrored: isUnderStairsMirrored(model)
    });
    const colors = {
      flatTop:'rgba(226,235,244,.94)',
      slopeTop: levelHighlight ? '#ffe27f' : 'rgba(220,231,241,.92)',
      left:'rgba(122,145,170,.34)',
      right:'rgba(104,127,152,.48)',
      front:'rgba(205,217,230,.72)',
      post:'#355a83',
      beam:'rgba(229,237,247,.98)',
      beamFront:'rgba(168,189,210,.96)',
      beamSide:'rgba(193,206,220,.94)',
      divider:'rgba(214,224,235,.94)',
      diagonal:'rgba(229,236,244,.92)',
      diagonalLip:'rgba(194,208,223,.98)',
      stroke:'#6d8daf'
    };
    const c = plan.corners;
    const bottom = c.map(pt => toIso(pt.x, pt.y, baseHeight));
    const projectedPoints = [...bottom];
    const project = (pt, z = 0) => {
      const p = toIso(pt.x, pt.y, z + baseHeight);
      projectedPoints.push(p);
      return p;
    };
    const lerpPt = (a, b, t) => ({ x:a.x + (b.x - a.x) * t, y:a.y + (b.y - a.y) * t });
    const leftBack = c[0], rightBack = c[1], rightFront = c[2], leftFront = c[3];
    const leftBackTop = project(leftBack, shape.leftHeight);
    const leftFrontTop = project(leftFront, shape.leftHeight);
    const rightBackTop = project(rightBack, shape.rightHeight);
    const rightFrontTop = project(rightFront, shape.rightHeight);
    const flatBack = lerpPt(leftBack, rightBack, shape.flatEnd / Math.max(1, shape.width));
    const flatFront = lerpPt(leftFront, rightFront, shape.flatEnd / Math.max(1, shape.width));
    const flatBackTop = project(flatBack, shape.tallHeight);
    const flatFrontTop = project(flatFront, shape.tallHeight);
    const flatBackStart = lerpPt(leftBack, rightBack, shape.flatStart / Math.max(1, shape.width));
    const flatFrontStart = lerpPt(leftFront, rightFront, shape.flatStart / Math.max(1, shape.width));
    const flatBackStartTop = project(flatBackStart, shape.tallHeight);
    const flatFrontStartTop = project(flatFrontStart, shape.tallHeight);
    const roofThickness = Math.max(2.4, Math.min(6, shape.tallHeight * 0.03));
    const slopeBackStartTop = shape.tallerLeft ? flatBackTop : flatBackStartTop;
    const slopeFrontStartTop = shape.tallerLeft ? flatFrontTop : flatFrontStartTop;
    const slopeBackEndTop = shape.tallerLeft ? rightBackTop : leftBackTop;
    const slopeFrontEndTop = shape.tallerLeft ? rightFrontTop : leftFrontTop;
    const slopeFrontStartBase = shape.tallerLeft ? flatFront : flatFrontStart;
    const slopeFrontEndBase = shape.tallerLeft ? rightFront : leftFront;
    const slopeEndHeight = shape.tallerLeft ? shape.rightHeight : shape.leftHeight;

    const overlayFaces = [];
    const slopeFrontLowerEnd = project(slopeFrontEndBase, Math.max(0, slopeEndHeight - roofThickness));
    const slopeFrontLowerStart = project(slopeFrontStartBase, Math.max(0, shape.tallHeight - roofThickness));
    const frontDiagonalTopEdgeStart = slopeFrontStartTop;
    const frontDiagonalTopEdgeEnd = slopeFrontEndTop;
    const frontDiagonalTallOuter = shape.tallerLeft ? leftFrontTop : rightFrontTop;
    const frontDiagonalPanel = null;
    const rearSlopeTopFace = face([slopeBackStartTop, slopeBackEndTop, slopeFrontEndTop, slopeFrontStartTop],{fill:colors.slopeTop,stroke:levelHighlight ? '#ffca2f' : colors.stroke,'stroke-width':levelHighlight ? '1.6' : '1.05'});
    const slopeFrontLip = face([
      slopeFrontStartTop,
      slopeFrontEndTop,
      slopeFrontLowerEnd,
      slopeFrontLowerStart
    ],{fill:'#d7e1eb',stroke:'rgba(158,178,201,.98)','stroke-width':'1.08'});
    const isReflectedUnderStairs = normalizeRackStyle(model.style) === 'under_stairs_reflected';
    if(isReflectedUnderStairs){
      g.appendChild(rearSlopeTopFace);
    } else {
      overlayFaces.push(rearSlopeTopFace);
    }
    g.appendChild(face([leftBackTop, leftFrontTop, bottom[3], bottom[0]],{fill:colors.left,stroke:colors.stroke,'stroke-width':'1'}));
    if(isReflectedUnderStairs){
      g.appendChild(slopeFrontLip);
    }
    if(shape.flatEnd - shape.flatStart > 1.5){
      overlayFaces.push(face([flatBackStartTop, flatBackTop, flatFrontTop, flatFrontStartTop],{fill:colors.flatTop,stroke:levelHighlight ? '#ffca2f' : colors.stroke,'stroke-width':levelHighlight ? '1.5' : '1.05'}));
      overlayFaces.push(face([
        flatFrontStartTop,
        flatFrontTop,
        project(flatFront, Math.max(0, shape.tallHeight - roofThickness)),
        project(flatFrontStart, Math.max(0, shape.tallHeight - roofThickness))
      ],{fill:colors.diagonalLip,stroke:'none'}));
      overlayFaces.push(svgEl('line',{x1:slopeFrontStartTop.x,y1:slopeFrontStartTop.y,x2:slopeBackStartTop.x,y2:slopeBackStartTop.y,stroke:levelHighlight ? '#ffca2f' : '#c9d6e5','stroke-width':'1.1','stroke-linecap':'round',opacity:'.95'}));
    }

    const levels = Math.max(2, Number(model.levels || 4) || 4);
    const levelHeights = buildLevelHeights(model);
    const levelSlots = buildLevelSlots(model);
    const totalLevelHeight = Math.max(1, levelHeights.reduce((sum, value) => sum + Math.max(10, Number(value) || 10), 0));
    const usableHeight = Math.max(18, shape.tallHeight - 16);
    let zCursor = 10;
    for(let i=0;i<levels;i++){
      const levelH = Math.max(10, Number(levelHeights[i] || 10));
      const z = zCursor;
      zCursor += (levelH / totalLevelHeight) * usableHeight;
      const levelTopZ = zCursor;
      const range = shape.shelfRangeAtZ(z + 2.2);
      const shelfW = Math.max(12, range.end - range.start);
      if(shelfW <= 10) continue;
      const t0 = range.start / shape.width;
      const t1 = range.end / shape.width;
      const backA = lerpPt(leftBack, rightBack, t0);
      const backB = lerpPt(leftBack, rightBack, t1);
      const frontA = lerpPt(leftFront, rightFront, t0);
      const frontB = lerpPt(leftFront, rightFront, t1);
      const p1 = project(backA, z);
      const p2 = project(backB, z);
      const p3 = project(frontB, z);
      const p4 = project(frontA, z);
      const activeShelf = levelHighlight === (i + 1);
      g.appendChild(face([p1,p2,p3,p4],{fill:activeShelf ? '#ffe27f' : colors.beam,stroke:activeShelf ? '#ffca2f' : colors.stroke,'stroke-width':activeShelf ? '1.45' : '0.95'}));
      g.appendChild(face([
        project(frontA, z),
        project(frontB, z),
        project(frontB, Math.max(0, z - 2.5)),
        project(frontA, Math.max(0, z - 2.5))
      ],{fill:colors.beamFront,stroke:'none'}));
      g.appendChild(face([
        project(backB, z),
        project(frontB, z),
        project(frontB, Math.max(0, z - 2.5)),
        project(backB, Math.max(0, z - 2.5))
      ],{fill:colors.beamSide,stroke:'none'}));
      const desiredSlots = Math.max(1, Number(levelSlots[i] || model.slots || 1) || 1);
      const slots = getAdaptiveSlotCount(desiredSlots, shelfW - 10, 18);
      const span = shelfW / Math.max(1, slots);
      for(let s=1;s<slots;s++){
        const sx = range.start + span * s;
        const dividerThickness = 2;
        const divX0 = Math.max(range.start + 0.4, sx - dividerThickness / 2);
        const divX1 = Math.min(range.end - 0.4, sx + dividerThickness / 2);
        if(divX1 <= divX0) continue;
        const t0Div = divX0 / Math.max(1, shape.width);
        const t1Div = divX1 / Math.max(1, shape.width);
        const divBack0 = lerpPt(leftBack, rightBack, t0Div);
        const divFront0 = lerpPt(leftFront, rightFront, t0Div);
        const divBack1 = lerpPt(leftBack, rightBack, t1Div);
        const divFront1 = lerpPt(leftFront, rightFront, t1Div);
        const roofHere = Math.min(shape.topHeightAt(divX0), shape.topHeightAt(divX1), shape.topHeightAt(sx));
        const nextShelfZ = i < levels - 1 ? (levelTopZ + 0.6) : null;
        const divTop = i < levels - 1
          ? Math.min(roofHere - roofThickness - 1.2, nextShelfZ)
          : Math.min(roofHere - roofThickness - 1.2, roofHere - roofThickness - 1.2);
        const divBottom = z + 0.15;
        if(divTop <= divBottom + 8) continue;
        const pA = project(divBack0, divBottom);
        const pB = project(divFront0, divBottom);
        const pC = project(divFront0, divTop);
        const pD = project(divBack0, divTop);
        const pE = project(divBack1, divBottom);
        const pF = project(divFront1, divBottom);
        const pG = project(divFront1, divTop);
        const pH = project(divBack1, divTop);
        overlayFaces.push(face([pD,pH,pG,pC],{fill:'#f1f6fb',stroke:'#9eb2c9','stroke-width':'1.05'}));
        overlayFaces.push(face([pA,pB,pC,pD],{fill:'#d8e2ec',stroke:'#90a7c2','stroke-width':'0.95'}));
        overlayFaces.push(face([pE,pF,pG,pH],{fill:'#b9c9da',stroke:'#89a0ba','stroke-width':'0.9'}));
        overlayFaces.push(face([pB,pF,pG,pC],{fill:'#cfd9e5',stroke:'rgba(123,145,168,.78)','stroke-width':'0.82'}));
        overlayFaces.push(face([pA,pE,pH,pD],{fill:'#e5edf5',stroke:'rgba(123,145,168,.56)','stroke-width':'0.7'}));
      }
      for(let s=0;s<slots;s++){
        const rawSlotStart = range.start + span * s;
        const rawSlotEnd = range.start + span * (s + 1);
        const boxBottomZ = z + 4;
        const roofMid = shape.topHeightAt((rawSlotStart + rawSlotEnd) / 2);
        const dividerTopZ = Math.min(roofMid - 4, levelTopZ - 3);
        if(dividerTopZ <= boxBottomZ + 4) continue;
        const safeRange = getUnderStairsSafeSlotRange(shape, { start: rawSlotStart, end: rawSlotEnd }, dividerTopZ, roofThickness, Math.max(2.2, span * 0.08), 3);
        if(!safeRange || (safeRange.end - safeRange.start) < 8) continue;
        const bx = safeRange.start;
        const bw = Math.max(8, safeRange.end - safeRange.start);
        const boxDepth = getRackBoxDepth(shape.depth, 3, 14);
        const by = Math.min(Math.max(0.5, shape.depth * 0.14) + UNDER_STAIRS_BOX_FORWARD_CM, Math.max(0.5, shape.depth - boxDepth - 0.5));
        drawStandardIsoStorageBox(g, (xx,yy,zz)=>{
          const u = xx / Math.max(1, shape.width);
          const v = yy / Math.max(1, shape.depth);
          const worldPt = {
            x: leftBack.x + (rightBack.x - leftBack.x) * u + (leftFront.x - leftBack.x) * v,
            y: leftBack.y + (rightBack.y - leftBack.y) * u + (leftFront.y - leftBack.y) * v
          };
          return project(worldPt, zz);
        }, {
          slotClass: false,
          bx, bw, by, boxDepth,
          boxBottomZ,
          dividerTopZ,
          shelfY0: 0,
          shelfY1: shape.depth,
          glowFilter: 'url(#slotGlow)'
        });
      }
    }

    const sidePanelT = 2;
    const rightInnerBack = lerpPt(leftBack, rightBack, Math.max(0, (shape.width - sidePanelT) / Math.max(1, shape.width)));
    const rightInnerFront = lerpPt(leftFront, rightFront, Math.max(0, (shape.width - sidePanelT) / Math.max(1, shape.width)));
    const rightInnerBackTop = project(rightInnerBack, shape.topHeightAt(Math.max(0, shape.width - sidePanelT)));
    const rightInnerFrontTop = project(rightInnerFront, shape.topHeightAt(Math.max(0, shape.width - sidePanelT)));
    const rightInnerBackBottom = project(rightInnerBack, 0);
    const rightInnerFrontBottom = project(rightInnerFront, 0);
    overlayFaces.push(face([rightBackTop, rightFrontTop, bottom[2], bottom[1]],{fill:colors.right,stroke:colors.stroke,'stroke-width':'1'}));
    overlayFaces.push(face([rightInnerFrontTop, rightFrontTop, bottom[2], rightInnerFrontBottom],{fill:'#c5d3e0',stroke:'rgba(117,140,165,.92)','stroke-width':'0.86'}));
    overlayFaces.push(face([rightInnerBackTop, rightBackTop, rightFrontTop, rightInnerFrontTop],{fill:'#edf3f9',stroke:'rgba(117,140,165,.72)','stroke-width':'0.78'}));
    overlayFaces.forEach(el => g.appendChild(el));
    if(frontDiagonalPanel) g.appendChild(frontDiagonalPanel);

    [0,1,2,3].forEach(i => {
      const topPoint = i === 0 ? leftBackTop : i === 1 ? rightBackTop : i === 2 ? rightFrontTop : leftFrontTop;
      g.appendChild(svgEl('line',{x1:bottom[i].x,y1:bottom[i].y,x2:topPoint.x,y2:topPoint.y,stroke:colors.post,'stroke-width':'2.65','stroke-linecap':'round'}));
    });
    g.appendChild(svgEl('line',{x1:leftFrontTop.x,y1:leftFrontTop.y,x2:leftBackTop.x,y2:leftBackTop.y,stroke:colors.post,'stroke-width':'2.1','stroke-linecap':'round'}));
    g.appendChild(svgEl('line',{x1:rightFrontTop.x,y1:rightFrontTop.y,x2:rightBackTop.x,y2:rightBackTop.y,stroke:colors.post,'stroke-width':'2.1','stroke-linecap':'round'}));
    g.appendChild(svgEl('line',{x1:bottom[3].x,y1:bottom[3].y,x2:bottom[2].x,y2:bottom[2].y,stroke:'rgba(119,143,168,.9)','stroke-width':'1.8','stroke-linecap':'round'}));

    const labelAnchor = project(lerpPt(leftFront, rightFront, 0.5), shape.tallHeight + 18);
    const label = svgEl('text',{x:labelAnchor.x,y:labelAnchor.y,class:'rack-title','text-anchor':'middle'});
    label.textContent = r.id;
    g.appendChild(label);
    if(main || store){
      const mk = project(lerpPt(leftFront, rightFront, 0.5), shape.tallHeight + 52);
      g.appendChild(buildBlinkMarker(mk.x, mk.y, main ? '#ffd84d' : '#72f29d', store && !main));
    }
    g.addEventListener('click', e => { e.stopPropagation(); appState.selectedRack = r.id; appState.selectedRackLayoutId = r.id; renderMapView(); });
    return { group:g, projectedPoints };
  }

  function renderUnderStairsDetail(rackId, prod = null, targetSvg = null, forcedModel = null, forcedRack = null){
    const rack = forcedRack || findRackById(rackId) || appState.layout.racks[0];
    const model = forcedModel || (rack ? rackModel(rack.modelId) : rackModel(appState.selectedModelId));
    const holder = targetSvg || $('#rackView');
    if(!holder || !model) return;
    holder.innerHTML = '';
    holder.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const root = svgEl('g',{transform:'translate(0 108)'}); holder.appendChild(root);

    const shape = getUnderStairsShape(model);
    const w = shape.width, depth = shape.depth, hL = shape.leftHeight, hR = shape.rightHeight;
    const levels = Math.max(2, Number(model.levels || 4) || 4);
    const levelHeightsCm = buildLevelHeights(model).slice(0, levels);
    const levelSlots = buildLevelSlots(model).slice(0, levels);
    const totalCm = Math.max(1, levelHeightsCm.reduce((s,v)=>s + Math.max(10, Number(v)||10), 0));
    const x = -92, y = -26, z = 0;

    const flatStartX = x + shape.flatStart;
    const flatEndX = x + shape.flatEnd;
    const flatBackA = toIso(flatStartX, y, shape.tallHeight);
    const flatBackB = toIso(flatEndX, y, shape.tallHeight);
    const flatFrontA = toIso(flatStartX, y + depth, shape.tallHeight);
    const flatFrontB = toIso(flatEndX, y + depth, shape.tallHeight);
    const A = toIso(x, y, hL), B = toIso(x + w, y, hR), C = toIso(x + w, y + depth, hR), D = toIso(x, y + depth, hL);
    const a = toIso(x, y, z), b = toIso(x + w, y, z), c = toIso(x + w, y + depth, z), d0 = toIso(x, y + depth, z);
    const roofT = Math.max(2.4, Math.min(5.5, shape.tallHeight * 0.022));
    const slopeBackStartTop = shape.tallerLeft ? flatBackB : flatBackA;
    const slopeFrontStartTop = shape.tallerLeft ? flatFrontB : flatFrontA;
    const slopeBackEndTop = shape.tallerLeft ? B : A;
    const slopeFrontEndTop = shape.tallerLeft ? C : D;
    const slopeEndX = shape.tallerLeft ? (x + w) : x;
    const slopeStartX = shape.tallerLeft ? flatEndX : flatStartX;
    const slopeEndHeight = shape.tallerLeft ? hR : hL;

    const overlayFaces = [];
    const frontDiagonalTopEdge = toIso(slopeStartX, y + depth, shape.tallHeight);
    const frontDiagonalBottomEdge = toIso(slopeEndX, y + depth, slopeEndHeight);
    const frontDiagonalInnerBottomStart = toIso(slopeStartX, y + depth, Math.max(0, shape.tallHeight - roofT));
    const frontDiagonalInnerBottomEnd = toIso(slopeEndX, y + depth, Math.max(0, slopeEndHeight - roofT));
    const frontTallOuter = shape.tallerLeft ? D : C;
    const metallic = {
      post:'#355a83',
      stroke:'#6d8daf',
      shellLeft:'#7a91aa',
      shellRight:'#687f98',
      shellFront:'#cdd9e6',
      topFlat:'#e2ebf4',
      topSlope:'#dce7f1',
      diagonal:'#e5ecf4',
      diagonalLip:'#c2d0df',
      shelfTop:'#e5edf7',
      shelfFront:'#a8bdd2',
      divider:'#d6e0eb'
    };
    const frontDiagonalPanel = null;
    const rearSlopeTopFace = face([slopeBackStartTop,slopeBackEndTop,slopeFrontEndTop,slopeFrontStartTop],{fill:metallic.topSlope,stroke:metallic.stroke,'stroke-width':'1.15'});
    const slopeFrontLip = face([
      slopeFrontStartTop,
      slopeFrontEndTop,
      toIso(slopeEndX, y + depth, Math.max(0, slopeEndHeight - roofT)),
      toIso(slopeStartX, y + depth, Math.max(0, shape.tallHeight - roofT))
    ],{fill:metallic.diagonalLip,stroke:'none'});
    const isReflectedUnderStairs = normalizeRackStyle(model.style) === 'under_stairs_reflected';
    if(isReflectedUnderStairs){
      root.appendChild(rearSlopeTopFace);
    } else {
      overlayFaces.push(rearSlopeTopFace);
    }
    root.appendChild(face([A,D,d0,a],{fill:metallic.shellLeft,stroke:metallic.stroke,'stroke-width':'1'}));
    if(isReflectedUnderStairs){
      root.appendChild(slopeFrontLip);
    }
    if(shape.flatEnd - shape.flatStart > 1.5){
      overlayFaces.push(face([flatBackA,flatBackB,flatFrontB,flatFrontA],{fill:metallic.topFlat,stroke:metallic.stroke,'stroke-width':'1.15'}));
      overlayFaces.push(face([
        flatFrontA,
        flatFrontB,
        toIso(flatEndX, y + depth, Math.max(0, shape.tallHeight - roofT)),
        toIso(flatStartX, y + depth, Math.max(0, shape.tallHeight - roofT))
      ],{fill:'#b1c1d1',stroke:'none'}));
      overlayFaces.push(svgEl('line',{x1:slopeFrontStartTop.x,y1:slopeFrontStartTop.y,x2:slopeBackStartTop.x,y2:slopeBackStartTop.y,stroke:'#d7e3ee','stroke-width':'1.1','stroke-linecap':'round'}));
    }

    [
      [a,A],[b,B],[c,C],[d0,D],
      [toIso(flatStartX,y,z),flatBackA],[toIso(flatEndX,y,z),flatBackB],
      [toIso(flatStartX,y+depth,z),flatFrontA],[toIso(flatEndX,y+depth,z),flatFrontB]
    ].forEach(pair => root.appendChild(svgEl('line',{x1:pair[0].x,y1:pair[0].y,x2:pair[1].x,y2:pair[1].y,stroke:metallic.post,'stroke-width':'2.55','stroke-linecap':'round'})));

    const selectedLevel = Math.max(0, Number(prod?.nivel || 0));
    const selectedSlot = Math.max(0, Number(prod?.slot || 0));
    let accCm = 0;
    for(let i=0;i<levels;i++){
      const levelCm = Math.max(10, Number(levelHeightsCm[i] || 10) || 10);
      const floorZ = (accCm / totalCm) * shape.tallHeight;
      const topZ = ((accCm + levelCm) / totalCm) * shape.tallHeight;
      accCm += levelCm;
      const shelfZ = floorZ + 3;
      const usable = shape.shelfRangeAtZ(shelfZ + 2.2);
      const availW = Math.max(0, usable.end - usable.start);
      if(availW < 18) continue;
      const lx0 = usable.start + 3;
      const lx1 = usable.end - 3;
      if(lx1 - lx0 < 12) continue;
      const q1 = toIso(x + lx0, y, shelfZ), q2 = toIso(x + lx1, y, shelfZ), q3 = toIso(x + lx1, y + depth, shelfZ), q4 = toIso(x + lx0, y + depth, shelfZ);
      const levelActive = selectedLevel === (i + 1);
      root.appendChild(face([q1,q2,q3,q4],{fill:levelActive?'#ffe27f':metallic.shelfTop,stroke:levelActive?'#ffca2f':metallic.stroke,'stroke-width':levelActive?'1.35':'0.9'}));
      root.appendChild(face([
        q4,
        q3,
        toIso(x + lx1, y + depth, Math.max(0, shelfZ - 2.4)),
        toIso(x + lx0, y + depth, Math.max(0, shelfZ - 2.4))
      ],{fill:metallic.shelfFront,stroke:'none'}));

      const desiredSlots = Math.max(1, Number(levelSlots[i] || model.slots || 1) || 1);
      const slots = getAdaptiveSlotCount(desiredSlots, lx1 - lx0, 18);
      const span = (lx1 - lx0) / Math.max(1, slots);
      const dividerByIndex = [];
      for(let s=1;s<slots;s++){
        const sx = lx0 + span * s;
        const roofHere = shape.topHeightAt(sx);
        const nextShelfZ = i < levels - 1 ? ((((accCm) / totalCm) * shape.tallHeight) + 3) : null;
        const topDiv = i < levels - 1 ? Math.min(roofHere - 3, nextShelfZ) : (roofHere - 3);
        if(topDiv <= shelfZ + 4) continue;
        const dividerHeight = topDiv;
        const halfThick = 1;
        const x0Div = x + sx - halfThick;
        const x1Div = x + sx + halfThick;
        const frontFace = face([
          toIso(x0Div, y + depth, shelfZ),
          toIso(x1Div, y + depth, shelfZ),
          toIso(x1Div, y + depth, dividerHeight),
          toIso(x0Div, y + depth, dividerHeight)
        ],{fill:'#d7e2ec',stroke:metallic.stroke,'stroke-width':'0.96'});
        const sideFace = face([
          toIso(x1Div, y, shelfZ),
          toIso(x1Div, y + depth, shelfZ),
          toIso(x1Div, y + depth, dividerHeight),
          toIso(x1Div, y, dividerHeight)
        ],{fill:'#c2d1df',stroke:metallic.stroke,'stroke-width':'0.9'});
        const topFace = face([
          toIso(x0Div, y, dividerHeight),
          toIso(x1Div, y, dividerHeight),
          toIso(x1Div, y + depth, dividerHeight),
          toIso(x0Div, y + depth, dividerHeight)
        ],{fill:'#e6eef7',stroke:metallic.stroke,'stroke-width':'0.82'});
        const dividerGroup = svgEl('g', {'data-understairs-divider': `${i + 1}-${s}`});
        dividerGroup.appendChild(sideFace);
        dividerGroup.appendChild(frontFace);
        dividerGroup.appendChild(topFace);
        dividerByIndex[s] = dividerGroup;
      }
      for(let s=0;s<slots;s++){
        const slotNo = s + 1;
        const rawBx0 = lx0 + span * s;
        const rawBx1 = lx0 + span * (s + 1);
        const baseBoxDepth = Math.max(12, depth * 0.48);
        const frontClearance = 2;
        const by1 = y + depth - frontClearance;
        const by0 = Math.max(y + 4, by1 - baseBoxDepth);
        const boxBottom = shelfZ + 2;
        const roofMid = shape.topHeightAt((rawBx0 + rawBx1) / 2);
        const boxTop = Math.min(roofMid - 6, topZ - 4, boxBottom + Math.max(12, Math.min(22, (topZ - shelfZ) * 0.58)));
        const active = levelActive && selectedSlot === slotNo;
        const safeRange = boxTop > boxBottom + 2
          ? getUnderStairsSafeSlotRange(shape, { start: rawBx0, end: rawBx1 }, boxTop, roofT, Math.max(2.2, span * 0.08), 3)
          : null;
        if(safeRange && (safeRange.end - safeRange.start) >= 8){
          drawStandardIsoStorageBox(root, (xx,yy,zz)=>toIso(xx,yy,zz), {
            slotClass: active,
            bx: x + safeRange.start,
            bw: Math.max(8, safeRange.end - safeRange.start),
            by: by0,
            boxDepth: Math.max(12, by1 - by0),
            boxBottomZ: boxBottom,
            dividerTopZ: Math.max(boxBottom + 8, topZ - 3),
            shelfY0: y,
            shelfY1: y + depth,
            glowFilter: 'url(#slotGlow)'
          });
        }
        if(dividerByIndex[slotNo]) root.appendChild(dividerByIndex[slotNo]);
      }
    }
    overlayFaces.push(slopeFrontLip);
    const sidePanelT = 2;
    const innerRightX = x + w - sidePanelT;
    const innerRightTop = shape.topHeightAt(Math.max(0, w - sidePanelT));
    const innerB = toIso(innerRightX, y, innerRightTop);
    const innerC = toIso(innerRightX, y + depth, innerRightTop);
    const innerb = toIso(innerRightX, y, z);
    const innerc = toIso(innerRightX, y + depth, z);
    overlayFaces.push(face([B,C,c,b],{fill:metallic.shellRight,stroke:metallic.stroke,'stroke-width':'1'}));
    overlayFaces.push(face([innerC,C,c,innerc],{fill:'#c5d3e0',stroke:'rgba(117,140,165,.92)','stroke-width':'0.86'}));
    overlayFaces.push(face([innerB,B,C,innerC],{fill:'#edf3f9',stroke:'rgba(117,140,165,.72)','stroke-width':'0.78'}));
    overlayFaces.forEach(el => root.appendChild(el));
    if(frontDiagonalPanel) root.appendChild(frontDiagonalPanel);

    const label = svgEl('text',{x:(A.x + C.x) / 2,y:Math.min(A.y,B.y) - 18,class:'rack-title','text-anchor':'middle'});
    label.textContent = rack?.id || model.name || 'Bajo escalera';
    root.appendChild(label);
    holder.setAttribute('viewBox','-190 -65 380 330');
    fitSelectedViewerRackPreview(holder, root, 0.9);
  }
  function buildIsoRack(r, prod){
    const model = rackModel(r.modelId) || {};
    const g = svgEl('g',{class:'rack-iso','data-rack':r.id});
    const main = prod?.rack === r.id;
    const store = prod?.rackStore === r.id;
    const selected = (appState.selectedRack || prod?.rack) === r.id;
    const levelHighlight = main ? Number(prod?.nivel || 0) : (store ? Number(prod?.nivelStore || 0) : 0);
    const searchHit = isRackSearchHit(r.id);
    const searchPrimary = appState.primaryHighlightedRackId === r.id;
    if(main) g.classList.add('active');
    if(store) g.classList.add('storage');
    if(selected) g.classList.add('selected');
    if(searchHit) g.classList.add('search-hit');
    if(searchPrimary) g.classList.add('selected');
    if(prod && !main && !store && !searchHit) g.classList.add('dim');

    const styleKind = normalizeRackStyle(model.style);
    if(isUnderStairsStyle(styleKind)) return buildUnderStairsIsoRack(rack, prod);

    const plan = getRackIsoPlan(r);
    const levels = Math.max(2, Number(model.levels || 4) || 4);
    const levelHeights = buildLevelHeights(model);
    const levelSlots = buildLevelSlots(model);
    const H = Math.max(72, Number(r.rackHeight || model.height || 238) * ISO_Z_SCALE);
    const baseHeight = Math.max(0, Number(r.baseHeight || 0) * 0.42);
    const projectedPoints = [];
    const project = (x, y, z = 0) => {
      const p = toIso(x, y, z + baseHeight);
      projectedPoints.push(p);
      return p;
    };
    const P0 = plan.corners[0], P1 = plan.corners[1], P3 = plan.corners[3];
    const ux = { x:(P1.x - P0.x) / Math.max(1, plan.bw), y:(P1.y - P0.y) / Math.max(1, plan.bw) };
    const uy = { x:(P3.x - P0.x) / Math.max(1, plan.bd), y:(P3.y - P0.y) / Math.max(1, plan.bd) };
    const lp = (lx, ly, lz = 0) => project(P0.x + ux.x * lx + uy.x * ly, P0.y + ux.y * lx + uy.y * ly, lz);
    const quad = (x0, y0, x1, y1, z) => [lp(x0,y0,z), lp(x1,y0,z), lp(x1,y1,z), lp(x0,y1,z)];
    const faceFront = (x0, x1, y, z0, z1) => [lp(x0,y,z1), lp(x1,y,z1), lp(x1,y,z0), lp(x0,y,z0)];
    const faceSide = (x, y0, y1, z0, z1) => [lp(x,y0,z1), lp(x,y1,z1), lp(x,y1,z0), lp(x,y0,z0)];
    const top = quad(0,0,plan.bw,plan.bd,H);
    const bottom = quad(0,0,plan.bw,plan.bd,0);

    const colors = styleKind === 'melamine'
      ? { top:'rgba(239,244,250,.97)', side:'rgba(193,208,224,.95)', front:'rgba(213,223,235,.95)', beamTop:'#edf3fa', beamFront:'#d9e4ef', post:'#c7d5e3', stroke:'#93a9c2', boxTop:'#efc98b', boxFront:'#d9a45f', boxSide:'#c98d46', divider:'#d5e0ea', back:'rgba(226,234,243,.92)' }
      : { top:'rgba(230,237,246,.97)', side:'rgba(142,168,197,.94)', front:'rgba(166,188,212,.95)', beamTop:'#e4edf7', beamFront:'#afc4d8', post:'#3f6287', stroke:'#6f8dad', boxTop:'#e4ba79', boxFront:'#ce9650', boxSide:'#bd7f39', divider:'#8ea8c4', back:'rgba(196,211,227,.72)' };

    const thickness = styleKind === 'melamine' ? 2 : 3;
    const shellT = styleKind === 'melamine' ? 2 : 0;
    const rackW = plan.bw;
    const rackD = plan.bd;
    const rackH = H;
    const floorY = 0;
    const melInnerX0 = shellT;
    const melInnerX1 = rackW - shellT;
    const melInnerY0 = 0;
    const melInnerY1 = rackD;

    if(styleKind === 'metallic'){
      const openRail = (x0, y0, z0, x1, y1, z1, width = '1.2', opacity = '1') => {
        const a = lp(x0, y0, z0);
        const b = lp(x1, y1, z1);
        g.appendChild(svgEl('line',{
          x1:a.x, y1:a.y, x2:b.x, y2:b.y,
          stroke:colors.post, 'stroke-width':width, 'stroke-linecap':'round', opacity
        }));
      };
      [0, rackW].forEach(x => {
        openRail(x, rackD, floorY, x, rackD, floorY + rackH, '2.2');
        openRail(x, 0, floorY, x, 0, floorY + rackH, '1.8', '.78');
      });
      openRail(0, 0, floorY, rackW, 0, floorY, '1.2', '.4');
      openRail(0, rackD, floorY, rackW, rackD, floorY, '1.4', '.55');
      openRail(0, 0, floorY + rackH, rackW, 0, floorY + rackH, '1.1', '.26');
      openRail(0, rackD, floorY + rackH, rackW, rackD, floorY + rackH, '1.2', '.38');
      openRail(0, 0, floorY, 0, rackD, floorY, '1.0', '.32');
      openRail(rackW, 0, floorY, rackW, rackD, floorY, '1.0', '.4');
    } else {
      g.appendChild(face(faceSide(0, 0, rackD, floorY, floorY + rackH), { fill:'#edf2f8', stroke:'#97abc1', 'stroke-width':'1.18' }));
      g.appendChild(face(faceFront(0, shellT, rackD, floorY, floorY + rackH), { fill:'#d8e2ec', stroke:'#92a8bf', 'stroke-width':'0.98' }));
      g.appendChild(face(faceFront(0, rackW, 0, floorY, floorY + rackH), { fill:'rgba(228,236,245,.92)', stroke:'rgba(132,153,177,.86)', 'stroke-width':'1.08' }));
      g.appendChild(face(faceFront(0, rackW, rackD, floorY, floorY - shellT), { fill:'#cad5e2', stroke:'none' }));
    }

    const totalLevelHeight = Math.max(1, levelHeights.reduce((sum, value) => sum + Math.max(10, Number(value) || 10), 0));
    const usableH = Math.max(40, rackH - 24);
    const levelScale = usableH / totalLevelHeight;
    const levelTopInset = 12;
    const levelZs = [];
    const levelClearHeights = [];
    let zCursor = floorY + levelTopInset;
    for(let i=0;i<levels;i++){
      levelZs.push(zCursor);
      const clearH = Math.max(16, (Math.max(10, Number(levelHeights[i] || 10)) * levelScale) - thickness - 2);
      levelClearHeights.push(clearH);
      zCursor += Math.max(10, Number(levelHeights[i] || 10)) * levelScale;
    }

    const drawMelamineDivider = (z, centerX, dividerY0, dividerY1, dividerW, dividerTopZ) => {
      const dx0 = centerX - dividerW / 2;
      const dx1 = centerX + dividerW / 2;
      const capZ = z + thickness + 0.08;
      g.appendChild(face([lp(dx0, dividerY0, capZ), lp(dx1, dividerY0, capZ), lp(dx1, dividerY1, capZ), lp(dx0, dividerY1, capZ)],{fill:'#f3f7fb',stroke:'#9fb0c3','stroke-width':'0.95'}));
      g.appendChild(face(faceFront(dx0, dx1, dividerY1, capZ, dividerTopZ),{fill:'#d6e1ec',stroke:'rgba(136,153,171,.42)','stroke-width':'0.55'}));
      g.appendChild(face(faceSide(dx1, dividerY0, dividerY1, capZ, dividerTopZ),{fill:'#c3d0de',stroke:'rgba(128,146,166,.38)','stroke-width':'0.55'}));
    };

    for(let i=0;i<levels;i++){
      const level = i + 1;
      const z = levelZs[i];
      const levelClass = levelHighlight === level;
      const shelfX0 = styleKind === 'melamine' ? melInnerX0 : 0;
      const shelfX1 = styleKind === 'melamine' ? melInnerX1 : rackW;
      const shelfY0 = styleKind === 'melamine' ? melInnerY0 : 0;
      const shelfY1 = styleKind === 'melamine' ? melInnerY1 : rackD;
      const levelTopPts = [lp(shelfX0, shelfY0, z), lp(shelfX1, shelfY0, z), lp(shelfX1, shelfY1, z), lp(shelfX0, shelfY1, z)];
      g.appendChild(face(levelTopPts,{fill:levelClass?'#ffe27f':'#e5edf7',stroke:levelClass?'#ffca2f':'#6c88a8','stroke-width':levelClass?'1.8':'1',filter:levelClass?'url(#mapGlow)':''}));
      g.appendChild(face(faceFront(shelfX0, shelfX1, shelfY1, z - thickness, z),{fill:levelClass?'#f4c73f':'#a8bdd2',stroke:'none'}));
      g.appendChild(face(faceSide(shelfX1, shelfY0, shelfY1, z - thickness, z),{fill:levelClass?'#e6b021':'#c1cedc',stroke:'none'}));

      const slotCount = Math.max(1, Number(levelSlots[i] || model.slots || 1) || 1);
      const sideInset = styleKind === 'melamine' ? 3 : 6;
      const slotDepthInset = styleKind === 'melamine' ? 0 : 8;
      const usableSlotWidth = Math.max(16, (shelfX1 - shelfX0) - sideInset * 2);
      const slotSpan = usableSlotWidth / slotCount;
      const dividerW = styleKind === 'melamine' ? shellT : Math.max(3, Math.min(6, rackW * 0.024));
      const dividerY0 = styleKind === 'melamine' ? 0 : (shelfY0 + slotDepthInset);
      const dividerY1 = styleKind === 'melamine' ? rackD : (shelfY1 - slotDepthInset);
      const dividerTopZ = (i < levelZs.length - 1) ? Math.max(z + thickness + 12, levelZs[i + 1] - thickness) : Math.max(z + thickness + 18, floorY + rackH - shellT);
      const dividerH = Math.max(18, dividerTopZ - (z + thickness));

      const slotGeometries = [];
      for(let s=1;s<=slotCount;s++){
        const slotStart = shelfX0 + sideInset + (s - 1) * slotSpan;
        const slotInnerPad = 2;
        const x0 = slotStart + slotInnerPad;
        const sw = Math.max(10, slotSpan - slotInnerPad * 2 - (styleKind === 'melamine' ? dividerW * 0.25 : 0));
        const slotClass = (levelHighlight === level && (main ? Number(prod?.slot || 0) : (store ? Number(prod?.slotStore || 0) : 0)) === s);
        slotGeometries.push({ s, slotClass, x0, sw });
      }

      const drawSlotBox = ({ s, slotClass, x0, sw }) => {
        g.appendChild(face([lp(x0, shelfY0 + 8, z + 1), lp(x0 + sw, shelfY0 + 8, z + 1), lp(x0 + sw, shelfY1 - 8, z + 1), lp(x0, shelfY1 - 8, z + 1)],{fill:slotClass?'rgba(255,216,77,.86)':'transparent',stroke:slotClass?'#ffc400':'rgba(201,216,237,.18)','stroke-width':slotClass?'1.5':'1',filter:slotClass?'url(#mapGlow)':''}));
        const boxDepth = getRackBoxDepth(shelfY1 - shelfY0, 3, 18);
        if(styleKind === 'melamine'){
          const boxInsetX = Math.max(2.6, Math.min(4.8, sw * 0.06));
          const bx = x0 + boxInsetX;
          const bw = Math.max(14, sw - boxInsetX * 2);
          const by = shelfY0 + 0.8;
          const boxBottomZ = z + thickness + 2;
          drawStandardIsoStorageBox(g, lp, { slotClass, bx, bw, by, boxDepth, boxBottomZ, dividerTopZ, shelfY0, shelfY1, glowFilter:'url(#mapGlow)' });
        } else {
          const bx = x0 + 2;
          const bw = Math.max(8, sw - 4);
          const by = shelfY0 + 5;
          const boxBottomZ = z + 4;
          drawStandardIsoStorageBox(g, lp, { slotClass, bx, bw, by, boxDepth, boxBottomZ, dividerTopZ, shelfY0, shelfY1, glowFilter:'url(#mapGlow)' });
        }
      };

      if(styleKind === 'melamine'){
        slotGeometries.forEach((geom, idx) => {
          drawSlotBox(geom);
          if(idx < slotCount - 1){
            const centerX = shelfX0 + sideInset + slotSpan * (idx + 1);
            drawMelamineDivider(z, centerX, dividerY0, dividerY1, dividerW, dividerTopZ);
          }
        });
      } else {
        slotGeometries.forEach(drawSlotBox);
      }

      const refSpacing = i < levelClearHeights.length ? levelClearHeights[i] : (usableH / Math.max(1, levels));
      const lt = lp(rackW + 14, rackD * 0.72, z + Math.max(10, refSpacing * 0.42));
      const txt = svgEl('text',{x:lt.x,y:lt.y,fill:levelClass ? '#ffd84d' : '#cbdcf4','font-size':levelClass ? '11' : '10','font-weight':'900','text-anchor':'start'});
      txt.textContent = 'N' + level;
      g.appendChild(txt);
    }

    if(styleKind === 'metallic'){
      g.appendChild(svgEl('line',{x1:lp(0, rackD * 0.08, floorY).x, y1:lp(0, rackD * 0.08, floorY).y, x2:lp(rackW, rackD * 0.08, floorY).x, y2:lp(rackW, rackD * 0.08, floorY).y, stroke:'rgba(95,127,160,.45)', 'stroke-width':'0.95', 'stroke-linecap':'round'}));
      g.appendChild(svgEl('line',{x1:lp(0, rackD * 0.08, floorY + rackH).x, y1:lp(0, rackD * 0.08, floorY + rackH).y, x2:lp(rackW, rackD * 0.08, floorY + rackH).x, y2:lp(rackW, rackD * 0.08, floorY + rackH).y, stroke:'rgba(95,127,160,.22)', 'stroke-width':'0.85', 'stroke-linecap':'round'}));
    } else {
      g.appendChild(face(faceFront(rackW - shellT, rackW, rackD, floorY, floorY + rackH), { fill:'#d8e2ec', stroke:'#8ea5bc', 'stroke-width':'1.02' }));
      g.appendChild(face(faceSide(rackW, 0, rackD, floorY, floorY + rackH), { fill:'#b7c7d8', stroke:'#7f99b5', 'stroke-width':'1.22' }));
      g.appendChild(face(top,{fill:levelHighlight ? '#ffe27f' : '#f3f6fb',stroke:levelHighlight ? '#ffca2f' : '#9fb2c7','stroke-width':levelHighlight ? '1.7' : '1.08',filter:levelHighlight ? 'url(#mapGlow)' : ''}));
      g.appendChild(face(faceFront(0, rackW, rackD, floorY + rackH - shellT, floorY + rackH),{fill:'#cfd9e6',stroke:'none'}));
      g.appendChild(face(faceSide(rackW, 0, rackD, floorY + rackH - shellT, floorY + rackH),{fill:'#d6e0ea',stroke:'none'}));
    }

    const frontTopA = lp(0, plan.bd, H);
    const frontTopB = lp(plan.bw, plan.bd, H);
    g.appendChild(svgEl('line',{x1:frontTopA.x,y1:frontTopA.y,x2:frontTopB.x,y2:frontTopB.y,class:'rack-front-line'}));
    const midFront = { x:(frontTopA.x + frontTopB.x) / 2, y:(frontTopA.y + frontTopB.y) / 2 };
    const centerTop = lp(plan.bw / 2, plan.bd / 2, H);
    const arrowDir = { x:midFront.x - centerTop.x, y:midFront.y - centerTop.y };
    const arrowLen = Math.hypot(arrowDir.x, arrowDir.y) || 1;
    const ax = midFront.x + (arrowDir.x / arrowLen) * 16;
    const ay = midFront.y + (arrowDir.y / arrowLen) * 16;
    const sideX = (arrowDir.x / arrowLen) * 6;
    const sideY = (arrowDir.y / arrowLen) * 6;
    const perpX = -(arrowDir.y / arrowLen) * 5;
    const perpY = (arrowDir.x / arrowLen) * 5;
    g.appendChild(svgEl('path',{class:'rack-front-arrow',d:`M ${ax + sideX} ${ay + sideY} L ${ax - sideX + perpX} ${ay - sideY + perpY} L ${ax - sideX - perpX} ${ay - sideY - perpY} Z`}));

    const labelPos = lp(plan.bw / 2, plan.bd / 2, H + 18);
    const label = svgEl('text',{x:labelPos.x,y:labelPos.y,class:'rack-title','text-anchor':'middle'});
    label.textContent = r.id;
    g.appendChild(label);
    if(main || store){
      const mk = lp(plan.bw / 2, plan.bd / 2, H + 72);
      g.appendChild(buildBlinkMarker(mk.x, mk.y, main ? '#ffd84d' : '#72f29d', store && !main));
    }
    g.addEventListener('click', e => { e.stopPropagation(); appState.selectedRack = r.id; appState.selectedRackLayoutId = r.id; renderMapView(); });
    return { group:g, projectedPoints };
  }

  function renderRackDetail(rackId, prod = null, targetSvg = null, forcedModel = null, forcedRack = null){
    const fallbackModel = rackModel(appState.selectedModelId) || appState.models?.[0] || { id:'std_4', name:'Rack estándar', levels:4, slots:2, width:120, depth:40, height:240, clearance:0, style:'metallic' };
    const foundRack = forcedRack || findRackById(rackId) || appState.layout?.racks?.[0] || null;
    const rack = foundRack || { id:rackId || fallbackModel.id || 'Rack', modelId:fallbackModel.id, x:0, y:0, w:fallbackModel.width || 120, h:fallbackModel.depth || 40, rackHeight:fallbackModel.height || 240, zoneId:'' };
    const model = forcedModel || rackModel(rack.modelId) || fallbackModel;
    const holder = targetSvg || $('#rackView');
    if(model?.furniture?.enabled && typeof renderFurnitureRackDetail === 'function') return renderFurnitureRackDetail(rackId, prod, holder, model, rack);
    if(model && isUnderStairsStyle(model.style)) return renderUnderStairsDetail(rackId, prod, holder, model, rack);
    if(!holder || !model) return;
    holder.innerHTML = '';
    holder.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const defs = svgEl('defs');
    const filter = svgEl('filter',{id:'slotGlow',x:'-90%',y:'-90%',width:'280%',height:'280%'});
    filter.appendChild(svgEl('feDropShadow',{dx:'0',dy:'0',stdDeviation:'12','flood-color':'#9eff49','flood-opacity':'.95'}));
    filter.appendChild(svgEl('feDropShadow',{dx:'0',dy:'0',stdDeviation:'22','flood-color':'#ffe066','flood-opacity':'.42'}));
    defs.appendChild(filter); holder.appendChild(defs);

    const clearance = Math.max(0, model.clearance || 0);
    const levelSlots = buildLevelSlots(model);
    const levelHeights = buildLevelHeights(model);
    const styleKind = normalizeRackStyle(model.style);
    if(isUnderStairsStyle(styleKind)) return buildUnderStairsIsoRack(rack, prod);
    const rackDims = { x:-68, y:-22, w:model.width || 150, d:model.depth || 82, h:model.height || 238, levels:model.levels || 4, slots:Math.max(1, Math.min(6, Number(model.slots || model.capacity || 2) || 2)), clearance };
    const selectedLayoutRack = forcedRack || findRackById(rackId) || null;
    const renderContextMode = !!selectedLayoutRack && ['rackViewPrimary','rackViewStore','nav3dRackPrimary','nav3dRackStore'].includes(holder.id);
    const root = svgEl('g',{transform:`translate(0 118)`}); holder.appendChild(root);
    const floorY = clearance;
    const contextView = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const computeIsoPrismBounds = (x0, y0, z0, w, d, h) => {
      const pts = [
        toIso(x0, y0, z0), toIso(x0 + w, y0, z0), toIso(x0 + w, y0 + d, z0), toIso(x0, y0 + d, z0),
        toIso(x0, y0, z0 + h), toIso(x0 + w, y0, z0 + h), toIso(x0 + w, y0 + d, z0 + h), toIso(x0, y0 + d, z0 + h)
      ];
      return pts.reduce((acc, p) => {
        if(p.x < acc.minX) acc.minX = p.x;
        if(p.x > acc.maxX) acc.maxX = p.x;
        if(p.y < acc.minY) acc.minY = p.y;
        if(p.y > acc.maxY) acc.maxY = p.y;
        return acc;
      }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    };
    const trackIsoPrismBounds = (x0, y0, z0, w, d, h) => {
      const bounds = computeIsoPrismBounds(x0, y0, z0, w, d, h);
      if(bounds.minX < contextView.minX) contextView.minX = bounds.minX;
      if(bounds.maxX > contextView.maxX) contextView.maxX = bounds.maxX;
      if(bounds.minY < contextView.minY) contextView.minY = bounds.minY;
      if(bounds.maxY > contextView.maxY) contextView.maxY = bounds.maxY;
    };
    const drawContextRack = (x0, y0, z0, w, d, h, isStacked = false) => {
      const topFill = isStacked ? 'rgba(110,191,255,.42)' : 'rgba(161,187,219,.28)';
      const frontFill = isStacked ? 'rgba(90,154,232,.34)' : 'rgba(112,138,170,.24)';
      const sideFill = isStacked ? 'rgba(74,132,206,.28)' : 'rgba(89,113,145,.20)';
      const stroke = isStacked ? 'rgba(140,205,255,.86)' : 'rgba(171,192,219,.48)';
      root.appendChild(face([
        toIso(x0, y0, z0 + h),
        toIso(x0 + w, y0, z0 + h),
        toIso(x0 + w, y0 + d, z0 + h),
        toIso(x0, y0 + d, z0 + h)
      ],{fill:topFill,stroke,'stroke-width':'1'}));
      root.appendChild(face([
        toIso(x0, y0 + d, z0 + h),
        toIso(x0 + w, y0 + d, z0 + h),
        toIso(x0 + w, y0 + d, z0),
        toIso(x0, y0 + d, z0)
      ],{fill:frontFill,stroke:'rgba(120,145,178,.26)','stroke-width':'0.8'}));
      root.appendChild(face([
        toIso(x0 + w, y0, z0 + h),
        toIso(x0 + w, y0 + d, z0 + h),
        toIso(x0 + w, y0 + d, z0),
        toIso(x0 + w, y0, z0)
      ],{fill:sideFill,stroke:'rgba(120,145,178,.22)','stroke-width':'0.8'}));
      trackIsoPrismBounds(x0, y0, z0, w, d, h);
    };
    root.appendChild(face([toIso(rackDims.x-28,rackDims.y-20,floorY),toIso(rackDims.x+rackDims.w+28,rackDims.y-20,floorY),toIso(rackDims.x+rackDims.w+28,rackDims.y+rackDims.d+20,floorY),toIso(rackDims.x-28,rackDims.y+rackDims.d+20,floorY)],{fill:'rgba(255,255,255,.04)',stroke:'rgba(146,170,198,.22)','stroke-width':'1.2'}));
    trackIsoPrismBounds(rackDims.x - 28, rackDims.y - 20, floorY - 2, rackDims.w + 56, rackDims.d + 40, 2);
    const isRackCardView = ['rackViewPrimary','rackViewStore','nav3dRackPrimary','nav3dRackStore'].includes(holder.id);
    if(isRackCardView){
      const focusPad = 10;
      const focusLabelPadRight = 24;
      const focusBounds = computeIsoPrismBounds(
        rackDims.x - focusPad,
        rackDims.y - focusPad,
        floorY - focusPad,
        rackDims.w + (focusPad * 2) + focusLabelPadRight,
        rackDims.d + (focusPad * 2),
        rackDims.h + (focusPad * 2)
      );
      holder.__rackCardFocusBounds = focusBounds;
    } else if(holder.__rackCardFocusBounds){
      delete holder.__rackCardFocusBounds;
    }
    if(renderContextMode && selectedLayoutRack){
      const contextPaddingUnits = 10;
      const sideContextUnits = contextPaddingUnits;
      const depthContextUnits = contextPaddingUnits;
      const verticalContextUnits = contextPaddingUnits;
      const selectedX = Number(selectedLayoutRack.x || 0);
      const selectedY = Number(selectedLayoutRack.y || 0);
      const selectedW = Number(selectedLayoutRack.w || 0);
      const selectedH = Number(selectedLayoutRack.h || 0);
      const rangeX0 = selectedX - sideContextUnits;
      const rangeX1 = selectedX + selectedW + sideContextUnits;
      const rangeY0 = selectedY - depthContextUnits;
      const rangeY1 = selectedY + selectedH + depthContextUnits;
      const selectedCenterX = selectedX + selectedW / 2;
      const selectedCenterY = selectedY + selectedH / 2;
      const selectedBaseHeight = Math.max(0, Number(selectedLayoutRack.baseHeight || 0) || 0);
      const selectedRackHeight = Math.max(60, Number(selectedLayoutRack.rackHeight || model.height || 238) || 238);
      const selectedTopHeight = selectedBaseHeight + selectedRackHeight;
      const rangeZ0 = selectedBaseHeight - verticalContextUnits;
      const rangeZ1 = selectedTopHeight + verticalContextUnits;
      const scaleX = rackDims.w / Math.max(1, Number(selectedLayoutRack.w || rackDims.w) || rackDims.w);
      const scaleY = rackDims.d / Math.max(1, Number(selectedLayoutRack.h || rackDims.d) || rackDims.d);
      const scaleZ = rackDims.h / Math.max(60, selectedRackHeight);
      const neighbors = (appState.layout.racks || [])
        .filter(r => r && r.zoneId === selectedLayoutRack.zoneId)
        .filter(r => {
          if(r.id === selectedLayoutRack.id) return false;
          const rx0 = Number(r.x || 0), ry0 = Number(r.y || 0);
          const rw0 = Number(r.w || 0), rh0 = Number(r.h || 0);
          const rx1 = rx0 + rw0, ry1 = ry0 + rh0;
          const baseZ = Number(r.baseHeight || 0) || 0;
          const heightZ = Math.max(60, Number(r.rackHeight || rackModel(r.modelId)?.height || 238) || 238);
          const topZ = baseZ + heightZ;
          const sameDepthBand = !(ry1 < rangeY0 || ry0 > rangeY1);
          const withinSideBand = !(rx1 < rangeX0 || rx0 > rangeX1);
          const withinVerticalBand = !(topZ < rangeZ0 || baseZ > rangeZ1);
          const stacked = Math.round(rx0) === Math.round(selectedX) && Math.round(ry0) === Math.round(selectedY);
          return stacked || (sameDepthBand && withinSideBand && withinVerticalBand);
        })
        .sort((a,b) => ((Math.hypot((Number(a.x || 0) + Number(a.w || 0)/2) - selectedCenterX, (Number(a.y || 0) + Number(a.h || 0)/2) - selectedCenterY) - Math.hypot((Number(b.x || 0) + Number(b.w || 0)/2) - selectedCenterX, (Number(b.y || 0) + Number(b.h || 0)/2) - selectedCenterY)) || (Number(a.baseHeight || 0) - Number(b.baseHeight || 0)) || ((a.id || '').localeCompare(b.id || ''))))
        .slice(0, 10);
      neighbors.forEach(r => {
        const ctxModel = rackModel(r.modelId);
        const rw = Math.max(26, (Number(ctxModel?.width || r.w || 100) || 100) * scaleX);
        const rd = Math.max(18, (Number(ctxModel?.depth || r.h || 60) || 60) * scaleY);
        const rh = Math.max(34, (Number(r.rackHeight || ctxModel?.height || 238) || 238) * scaleZ);
        const centerX = Number(r.x || 0) + Number(r.w || 0) / 2;
        const centerY = Number(r.y || 0) + Number(r.h || 0) / 2;
        const localCx = rackDims.x + rackDims.w / 2 + ((centerX - selectedCenterX) * scaleX);
        const localCy = rackDims.y + rackDims.d / 2 + ((centerY - selectedCenterY) * scaleY);
        const localX = localCx - rw / 2;
        const localY = localCy - rd / 2;
        const localBase = floorY + ((Number(r.baseHeight || 0) - selectedBaseHeight) * scaleZ);
        const isStacked = Math.round(Number(r.x || 0)) === Math.round(Number(selectedLayoutRack.x || 0)) && Math.round(Number(r.y || 0)) === Math.round(Number(selectedLayoutRack.y || 0));
        drawContextRack(localX, localY, localBase, rw, rd, rh, isStacked);
        const lbl = toIso(localCx, localY + rd * 0.5, localBase + rh + 14);
        const txt = svgEl('text',{x:lbl.x,y:lbl.y,fill:isStacked?'rgba(179,228,255,.9)':'rgba(190,208,231,.82)','font-size':'10','font-weight':'800','text-anchor':'middle'});
        txt.textContent = r.id || '';
        root.appendChild(txt);
      });
    }
    const thickness = 3;
    const line = (a,b, opacity='1')=>svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#355a83','stroke-width':'4','stroke-linecap':'round','stroke-opacity':opacity});
    const selectedLevel = Number(prod?.nivel || 0);
    const selectedSlot = Number(prod?.slot || 0);
    const totalLevelHeight = Math.max(1, levelHeights.reduce((sum, v) => sum + Math.max(10, Number(v) || 10), 0));
    const usableHeight = Math.max(40, rackDims.h - 24);
    const levelScale = usableHeight / totalLevelHeight;
    const levelTopInset = 12;
    const levelZs = [];
    const levelClearHeights = [];
    let zCursor = floorY + levelTopInset;
    for(let i=0;i<rackDims.levels;i++){
      levelZs.push(zCursor);
      const clearH = Math.max(16, (Math.max(10, Number(levelHeights[i] || 10)) * levelScale) - thickness - 2);
      levelClearHeights.push(clearH);
      zCursor += Math.max(10, Number(levelHeights[i] || 10)) * levelScale;
    }
    const shellT = styleKind === 'melamine' ? 2 : 0;
    const melInnerX0 = rackDims.x + shellT;
    const melInnerX1 = rackDims.x + rackDims.w - shellT;
    const melInnerY0 = rackDims.y;
    const melInnerY1 = rackDims.y + rackDims.d;
    const melInnerW = Math.max(20, melInnerX1 - melInnerX0);
    const melInnerD = Math.max(20, melInnerY1 - melInnerY0);

    let drawMelamineRightShell = null;
    let drawMelamineTopShell = null;
    if(styleKind === 'metallic'){
      [
        line(toIso(rackDims.x+rackDims.w,rackDims.y,floorY),toIso(rackDims.x+rackDims.w,rackDims.y,rackDims.h+floorY),'0.98'),
        line(toIso(rackDims.x,rackDims.y,floorY),toIso(rackDims.x,rackDims.y,rackDims.h+floorY),'0.98')
      ].forEach(el=>root.appendChild(el));
    } else {
      const shellFill = '#edf2f8';
      const shellFillDark = '#dbe4ef';
      const shellStroke = '#a8b8ca';
      const appendMelamineRightShell = () => {
        // front strip first, then outer right face so the panel reads with actual 2 cm thickness
        root.appendChild(face([
          toIso(rackDims.x + rackDims.w - shellT, rackDims.y + rackDims.d, floorY),
          toIso(rackDims.x + rackDims.w, rackDims.y + rackDims.d, floorY),
          toIso(rackDims.x + rackDims.w, rackDims.y + rackDims.d, floorY + rackDims.h),
          toIso(rackDims.x + rackDims.w - shellT, rackDims.y + rackDims.d, floorY + rackDims.h)
        ],{fill:'#d8e2ec',stroke:'#8ea5bc','stroke-width':'1.02'}));
        root.appendChild(face([
          toIso(rackDims.x+rackDims.w, rackDims.y, floorY),
          toIso(rackDims.x+rackDims.w, rackDims.y + rackDims.d, floorY),
          toIso(rackDims.x+rackDims.w, rackDims.y + rackDims.d, floorY + rackDims.h),
          toIso(rackDims.x+rackDims.w, rackDims.y, floorY + rackDims.h)
        ],{fill:'#b7c7d8',stroke:'#7f99b5','stroke-width':'1.22'}));
      };
      const appendMelamineTopShell = () => {
        root.appendChild(face([
          toIso(rackDims.x, rackDims.y, floorY + rackDims.h),
          toIso(rackDims.x + rackDims.w, rackDims.y, floorY + rackDims.h),
          toIso(rackDims.x + rackDims.w, rackDims.y + rackDims.d, floorY + rackDims.h),
          toIso(rackDims.x, rackDims.y + rackDims.d, floorY + rackDims.h)
        ],{fill:'#f3f6fb',stroke:'#9fb2c7','stroke-width':'1.08'}));
        root.appendChild(face([
          toIso(rackDims.x, rackDims.y + rackDims.d, floorY + rackDims.h),
          toIso(rackDims.x + rackDims.w, rackDims.y + rackDims.d, floorY + rackDims.h),
          toIso(rackDims.x + rackDims.w, rackDims.y + rackDims.d, floorY + rackDims.h - shellT),
          toIso(rackDims.x, rackDims.y + rackDims.d, floorY + rackDims.h - shellT)
        ],{fill:'#cfd9e6'}));
        root.appendChild(face([
          toIso(rackDims.x + rackDims.w, rackDims.y, floorY + rackDims.h),
          toIso(rackDims.x + rackDims.w, rackDims.y + rackDims.d, floorY + rackDims.h),
          toIso(rackDims.x + rackDims.w, rackDims.y + rackDims.d, floorY + rackDims.h - shellT),
          toIso(rackDims.x + rackDims.w, rackDims.y, floorY + rackDims.h - shellT)
        ],{fill:'#d6e0ea'}));
      };
      // left wall stays behind the contents
      root.appendChild(face([
        toIso(rackDims.x, rackDims.y, floorY),
        toIso(rackDims.x, rackDims.y + rackDims.d, floorY),
        toIso(rackDims.x, rackDims.y + rackDims.d, floorY + rackDims.h),
        toIso(rackDims.x, rackDims.y, floorY + rackDims.h)
      ],{fill:shellFill,stroke:'#97abc1','stroke-width':'1.18'}));
      // visible front strip so the left side panel has real thickness
      root.appendChild(face([
        toIso(rackDims.x, rackDims.y + rackDims.d, floorY),
        toIso(rackDims.x + shellT, rackDims.y + rackDims.d, floorY),
        toIso(rackDims.x + shellT, rackDims.y + rackDims.d, floorY + rackDims.h),
        toIso(rackDims.x, rackDims.y + rackDims.d, floorY + rackDims.h)
      ],{fill:'#d8e2ec',stroke:'#92a8bf','stroke-width':'0.98'}));
      // optional back panel to close the cubicles visually
      root.appendChild(face([
        toIso(rackDims.x, rackDims.y, floorY),
        toIso(rackDims.x + rackDims.w, rackDims.y, floorY),
        toIso(rackDims.x + rackDims.w, rackDims.y, floorY + rackDims.h),
        toIso(rackDims.x, rackDims.y, floorY + rackDims.h)
      ],{fill:'rgba(228,236,245,.92)',stroke:'rgba(132,153,177,.86)','stroke-width':'1.08'}));
      // en melamina la base visible del mueble es el Nivel 1; evitamos una segunda bandeja extra en el piso
      root.appendChild(face([
        toIso(rackDims.x, rackDims.y + rackDims.d, floorY),
        toIso(rackDims.x + rackDims.w, rackDims.y + rackDims.d, floorY),
        toIso(rackDims.x + rackDims.w, rackDims.y + rackDims.d, floorY - shellT),
        toIso(rackDims.x, rackDims.y + rackDims.d, floorY - shellT)
      ],{fill:'#cad5e2'}));
      drawMelamineRightShell = appendMelamineRightShell;
      drawMelamineTopShell = appendMelamineTopShell;
    }

    for(let i=0;i<rackDims.levels;i++){
      const level = i+1, z = levelZs[i];
      const levelClass = selectedLevel === level;
      root.appendChild(face([toIso(styleKind === 'melamine' ? melInnerX0 : rackDims.x, styleKind === 'melamine' ? melInnerY0 : rackDims.y, z),toIso(styleKind === 'melamine' ? melInnerX1 : rackDims.x+rackDims.w, styleKind === 'melamine' ? melInnerY0 : rackDims.y, z),toIso(styleKind === 'melamine' ? melInnerX1 : rackDims.x+rackDims.w, styleKind === 'melamine' ? melInnerY1 : rackDims.y+rackDims.d, z),toIso(styleKind === 'melamine' ? melInnerX0 : rackDims.x, styleKind === 'melamine' ? melInnerY1 : rackDims.y+rackDims.d, z)],{fill:levelClass?'#ffe27f':'#e5edf7',stroke:levelClass?'#ffca2f':'#6c88a8','stroke-width':levelClass?'1.8':'1',filter:levelClass?'url(#slotGlow)':''}));
      root.appendChild(face([toIso(styleKind === 'melamine' ? melInnerX0 : rackDims.x, styleKind === 'melamine' ? melInnerY1 : rackDims.y+rackDims.d, z),toIso(styleKind === 'melamine' ? melInnerX1 : rackDims.x+rackDims.w, styleKind === 'melamine' ? melInnerY1 : rackDims.y+rackDims.d, z),toIso(styleKind === 'melamine' ? melInnerX1 : rackDims.x+rackDims.w, styleKind === 'melamine' ? melInnerY1 : rackDims.y+rackDims.d, z-thickness),toIso(styleKind === 'melamine' ? melInnerX0 : rackDims.x, styleKind === 'melamine' ? melInnerY1 : rackDims.y+rackDims.d, z-thickness)],{fill:levelClass?'#f4c73f':'#a8bdd2'}));
      root.appendChild(face([toIso(styleKind === 'melamine' ? melInnerX0 : rackDims.x, (styleKind === 'melamine' ? melInnerY1 : rackDims.y+rackDims.d) - 1.2, z - 0.05),toIso(styleKind === 'melamine' ? melInnerX1 : rackDims.x+rackDims.w, (styleKind === 'melamine' ? melInnerY1 : rackDims.y+rackDims.d) - 1.2, z - 0.05),toIso(styleKind === 'melamine' ? melInnerX1 : rackDims.x+rackDims.w, styleKind === 'melamine' ? melInnerY1 : rackDims.y+rackDims.d, z - thickness - 0.2),toIso(styleKind === 'melamine' ? melInnerX0 : rackDims.x, styleKind === 'melamine' ? melInnerY1 : rackDims.y+rackDims.d, z - thickness - 0.2)],{fill:'rgba(69,95,128,.10)',stroke:'none'}));
      root.appendChild(face([toIso(styleKind === 'melamine' ? melInnerX1 : rackDims.x+rackDims.w, styleKind === 'melamine' ? melInnerY0 : rackDims.y, z),toIso(styleKind === 'melamine' ? melInnerX1 : rackDims.x+rackDims.w, styleKind === 'melamine' ? melInnerY1 : rackDims.y+rackDims.d, z),toIso(styleKind === 'melamine' ? melInnerX1 : rackDims.x+rackDims.w, styleKind === 'melamine' ? melInnerY1 : rackDims.y+rackDims.d, z-thickness),toIso(styleKind === 'melamine' ? melInnerX1 : rackDims.x+rackDims.w, styleKind === 'melamine' ? melInnerY0 : rackDims.y, z-thickness)],{fill:levelClass?'#e6b021':'#c1cedc'}));
      const slotCount = Math.max(1, levelSlots[i] || rackDims.slots || 1);
      const sideInset = styleKind === 'melamine' ? 3 : 6;
      const slotDepthInset = styleKind === 'melamine' ? 0 : 8;
      const shelfX0 = styleKind === 'melamine' ? melInnerX0 : rackDims.x;
      const shelfX1 = styleKind === 'melamine' ? melInnerX1 : (rackDims.x + rackDims.w);
      const shelfY0 = styleKind === 'melamine' ? melInnerY0 : rackDims.y;
      const shelfY1 = styleKind === 'melamine' ? melInnerY1 : (rackDims.y + rackDims.d);
      const usableSlotWidth = Math.max(16, (shelfX1 - shelfX0) - sideInset * 2);
      const slotSpan = usableSlotWidth / slotCount;
      const dividerW = styleKind === 'melamine' ? shellT : Math.max(3, Math.min(6, rackDims.w * 0.024));
      const dividerY0 = styleKind === 'melamine' ? rackDims.y : (shelfY0 + slotDepthInset);
      const dividerY1 = styleKind === 'melamine' ? (rackDims.y + rackDims.d) : (shelfY1 - slotDepthInset);
      const dividerTopZ = (i < levelZs.length - 1)
        ? Math.max(z + thickness + 12, levelZs[i + 1] - thickness)
        : Math.max(z + thickness + 18, floorY + rackDims.h - shellT);
      const dividerH = Math.max(18, dividerTopZ - (z + thickness));

      const drawMelamineDivider = (centerX) => {
        const dx0 = centerX - dividerW / 2;
        const dx1 = centerX + dividerW / 2;
        const capZ = z + thickness + 0.08;
        const dividerFront = '#d6e1ec';
        const dividerSide = '#c3d0de';
        const dividerTop = '#f3f7fb';
        root.appendChild(face([
          toIso(dx0, dividerY0, capZ),
          toIso(dx1, dividerY0, capZ),
          toIso(dx1, dividerY1, capZ),
          toIso(dx0, dividerY1, capZ)
        ],{fill:dividerTop,stroke:'#9fb0c3','stroke-width':'0.95'}));
        root.appendChild(face([
          toIso(dx0, dividerY1, capZ),
          toIso(dx1, dividerY1, capZ),
          toIso(dx1, dividerY1, dividerTopZ),
          toIso(dx0, dividerY1, dividerTopZ)
        ],{fill:dividerFront,stroke:'rgba(136,153,171,.42)','stroke-width':'0.55'}));
        root.appendChild(face([
          toIso(dx1, dividerY0, capZ),
          toIso(dx1, dividerY1, capZ),
          toIso(dx1, dividerY1, dividerTopZ),
          toIso(dx1, dividerY0, dividerTopZ)
        ],{fill:dividerSide,stroke:'rgba(128,146,166,.38)','stroke-width':'0.55'}));
      };

      const slotGeometries = [];
      for(let s=1;s<=slotCount;s++){
        const slotStart = shelfX0 + sideInset + (s-1) * slotSpan;
        const slotInnerPad = styleKind === 'melamine' ? 2 : 2;
        const x0 = slotStart + slotInnerPad;
        const sw = Math.max(10, slotSpan - slotInnerPad * 2 - (styleKind === 'melamine' ? dividerW * 0.25 : 0));
        const slotClass = (selectedLevel === level && selectedSlot === s);
        slotGeometries.push({ s, slotClass, x0, sw });
      }

      const drawStorageBox = ({slotClass, bx, bw, by, boxDepth, boxBottomZ, boxTopZ, dividerTopZ}) => {
        drawStandardIsoStorageBox(root, toIso, { slotClass, bx, bw, by, boxDepth, boxBottomZ, dividerTopZ, shelfY0, shelfY1, glowFilter:'url(#slotGlow)' });
      };

      const drawSlotBox = ({ s, slotClass, x0, sw }) => {
        root.appendChild(face([
          toIso(x0, shelfY0 + 8, z + 1),
          toIso(x0+sw, shelfY0 + 8, z + 1),
          toIso(x0+sw, shelfY1 - 8, z + 1),
          toIso(x0, shelfY1 - 8, z + 1)
        ],{fill:slotClass?'rgba(255,216,77,.92)':'transparent',stroke:slotClass?'#ffc400':'rgba(201,216,237,.18)','stroke-width':slotClass?'2.35':'1',filter:slotClass?'url(#slotGlow)':''}));

        if(styleKind === 'melamine'){
          const boxDepth = getRackBoxDepth(shelfY1 - shelfY0, 3, 18);
          const boxInsetX = Math.max(2.6, Math.min(4.8, sw * 0.06));
          const bx = x0 + boxInsetX;
          const bw = Math.max(14, sw - boxInsetX * 2);
          const by = shelfY0 + 0.8;
          const boxBottomZ = z + thickness + 2;
          drawStorageBox({ slotClass, bx, bw, by, boxDepth, boxBottomZ, boxTopZ: dividerTopZ - 6, dividerTopZ });
        } else {
          const boxDepth = getRackBoxDepth(shelfY1 - shelfY0, 3, 18);
          const bx = x0 + 2, bw = Math.max(8, sw - 4);
          const by = shelfY0 + 5;
          const boxBottomZ = z + 4;
          drawStorageBox({ slotClass, bx, bw, by, boxDepth, boxBottomZ, boxTopZ: dividerTopZ - 8, dividerTopZ });
        }
      };

      if(styleKind === 'melamine'){
        slotGeometries.forEach((geom, idx) => {
          drawSlotBox(geom);
          if(idx < slotCount - 1){
            const centerX = shelfX0 + sideInset + slotSpan * (idx + 1);
            drawMelamineDivider(centerX);
          }
        });
      } else {
        slotGeometries.forEach(drawSlotBox);
      }
      const refSpacing = i < levelClearHeights.length ? levelClearHeights[i] : (usableHeight / Math.max(1, rackDims.levels));
      const lt = toIso(rackDims.x + rackDims.w + 18, rackDims.y + rackDims.d * 0.72, z + Math.max(12, refSpacing * 0.42));
      const txt = svgEl('text',{x:lt.x,y:lt.y,fill:levelClass?'#ffd84d':'#cbdcf4','font-size':levelClass?'13':'12','font-weight':'900','text-anchor':'start'}); txt.textContent = 'N' + level; root.appendChild(txt);
    }

    if(styleKind === 'metallic'){
      [
        line(toIso(rackDims.x,rackDims.y+rackDims.d,floorY),toIso(rackDims.x,rackDims.y+rackDims.d,rackDims.h+floorY)),
        line(toIso(rackDims.x+rackDims.w,rackDims.y+rackDims.d,floorY),toIso(rackDims.x+rackDims.w,rackDims.y+rackDims.d,rackDims.h+floorY))
      ].forEach(el=>root.appendChild(el));
    } else {
      if(drawMelamineRightShell) drawMelamineRightShell();
      if(drawMelamineTopShell) drawMelamineTopShell();
    }
    const title = svgEl('text',{x:toIso(rackDims.x+rackDims.w/2,rackDims.y+rackDims.d/2,rackDims.h+24).x,y:toIso(rackDims.x+rackDims.w/2,rackDims.y+rackDims.d/2,rackDims.h+24).y,fill:'#eaf3ff','font-size':'14','font-weight':'900','text-anchor':'middle'});
    title.textContent = rackId || model.name; root.appendChild(title);
    const floorLabelPos = toIso(rackDims.x + rackDims.w/2, rackDims.y + rackDims.d + 28, floorY);
    const floorLabel = svgEl('text',{x:floorLabelPos.x,y:floorLabelPos.y,fill:'#8fa8c7','font-size':'11','font-weight':'700','text-anchor':'middle'});
    floorLabel.textContent = `Piso ${clearance}cm`; root.appendChild(floorLabel);
    try {
      const isPreviewSvg = holder && holder.id === 'rackModelSvg';
      const sideMargin = renderContextMode ? 10 : (isPreviewSvg ? 2 : 10);
      const topMargin = renderContextMode ? 10 : (isPreviewSvg ? 0 : 100);
      const frontMargin = renderContextMode ? 10 : 0;
      const bottomMargin = renderContextMode ? 10 : (isPreviewSvg ? 0 : 100);
      const envX0 = rackDims.x - sideMargin;
      const envX1 = rackDims.x + rackDims.w + sideMargin;
      const envY0 = rackDims.y - frontMargin;
      const envY1 = rackDims.y + rackDims.d + frontMargin;
      const envZ0 = floorY - bottomMargin;
      const envZ1 = floorY + rackDims.h + topMargin;
      trackIsoPrismBounds(envX0, envY0, envZ0, envX1 - envX0, envY1 - envY0, envZ1 - envZ0);
      const pts = [
        toIso(envX0, envY0, envZ0), toIso(envX1, envY0, envZ0), toIso(envX1, envY1, envZ0), toIso(envX0, envY1, envZ0),
        toIso(envX0, envY0, envZ1), toIso(envX1, envY0, envZ1), toIso(envX1, envY1, envZ1), toIso(envX0, envY1, envZ1)
      ];
      const minX = Number.isFinite(contextView.minX) ? contextView.minX : Math.min(...pts.map(p => p.x));
      const maxX = Number.isFinite(contextView.maxX) ? contextView.maxX : Math.max(...pts.map(p => p.x));
      const minY = Number.isFinite(contextView.minY) ? contextView.minY : Math.min(...pts.map(p => p.y));
      const maxY = Number.isFinite(contextView.maxY) ? contextView.maxY : Math.max(...pts.map(p => p.y));
      const chromePadX = renderContextMode ? 26 : (isPreviewSvg ? 0 : 18);
      const chromePadY = renderContextMode ? 26 : (isPreviewSvg ? 0 : 18);
      holder.setAttribute('viewBox', `${Math.floor(minX - chromePadX)} ${Math.floor(minY - chromePadY)} ${Math.ceil((maxX - minX) + chromePadX * 2)} ${Math.ceil((maxY - minY) + chromePadY * 2)}`);
    } catch(err) {}
    fitSelectedViewerRackPreview(holder, root, 0.9);
    detailStatus.textContent = prod ? `${rackId} • N${prod.nivel} • S${prod.slot}` : (rackId || model.name);
    detailChip.textContent = `${model.levels} niveles`;
  }


  function fitSelectedViewerRackPreview(holder, root, fillRatio = 0.88){
    try {
      if(!holder || !root) return;
      const holderId = holder.id || '';
      const isRackCardView = /^(rackViewPrimary|rackViewStore|nav3dRackPrimary|nav3dRackStore)$/.test(holderId);
      const cardFillRatio = isRackCardView ? 0.8 : fillRatio;
      const focusBounds = isRackCardView && holder.__rackCardFocusBounds ? holder.__rackCardFocusBounds : null;
      const bbox = focusBounds
        ? { x: focusBounds.minX, y: focusBounds.minY, width: focusBounds.maxX - focusBounds.minX, height: focusBounds.maxY - focusBounds.minY }
        : root.getBBox();
      if(!bbox || !Number.isFinite(bbox.width) || !Number.isFinite(bbox.height) || bbox.width <= 0 || bbox.height <= 0) return;
      const vb = holder.viewBox && holder.viewBox.baseVal ? holder.viewBox.baseVal : null;
      const targetW = Math.max(220, Number(vb?.width || 470) || 470);
      const targetH = Math.max(220, Number(vb?.height || 520) || 520);
      const aspect = targetW / Math.max(1, targetH);
      const desiredW = bbox.width / Math.max(0.1, cardFillRatio);
      const desiredH = bbox.height / Math.max(0.1, cardFillRatio);
      let viewW = desiredW;
      let viewH = desiredH;
      if((viewW / Math.max(1, viewH)) > aspect){
        viewH = viewW / aspect;
      } else {
        viewW = viewH * aspect;
      }
      const cx = bbox.x + bbox.width / 2;
      const cy = bbox.y + bbox.height / 2;
      const cardOffsetY = 0;
      holder.setAttribute('viewBox', `${cx - viewW / 2} ${(cy - viewH / 2) - cardOffsetY} ${viewW} ${viewH}`);
    } catch(err) {}
  }

  function enablePanZoom(svg, target, focusBounds = null, initialTransform = null){
    const ZOOM_MIN = 0.55;
    const ZOOM_MAX = 4.8;
    const ZOOM_STEP = 0.14;
    let scale = Number(initialTransform?.scale || 1.35) || 1.35, tx = Number(initialTransform?.tx || 20) || 0, ty = Number(initialTransform?.ty || 170) || 0, dragging = false, sx = 0, sy = 0;
    const apply = () => target.setAttribute('transform', `translate(${tx} ${ty}) scale(${scale})`);

    if(focusBounds){
      const vb = svg.viewBox?.baseVal;
      const vw = Math.max(640, Number(vb?.width || 1220) || 1220);
      const vh = Math.max(420, Number(vb?.height || 820) || 820);
      const bw = Math.max(120, focusBounds.maxX - focusBounds.minX);
      const bh = Math.max(120, focusBounds.maxY - focusBounds.minY);
      const pad = 80;
      scale = Math.max(1.05, Math.min(2.8, Math.min((vw - pad) / bw, (vh - pad) / bh)));
      const cx = (focusBounds.minX + focusBounds.maxX) / 2;
      const cy = (focusBounds.minY + focusBounds.maxY) / 2;
      tx = (vw / 2) - (cx * scale);
      ty = (vh / 2) - (cy * scale);
    }

    apply();
    svg.onwheel = e => {
      e.preventDefault();
      const direction = e.deltaY > 0 ? -1 : 1;
      scale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scale + (direction * ZOOM_STEP)));
      apply();
    };
    svg.onpointerdown = e => { if(e.target.closest('.rack-iso')) return; dragging = true; sx = e.clientX - tx; sy = e.clientY - ty; svg.setPointerCapture(e.pointerId); };
    svg.onpointermove = e => { if(!dragging) return; tx = e.clientX - sx; ty = e.clientY - sy; apply(); };
    svg.onpointerup = () => dragging = false; svg.onpointercancel = () => dragging = false;
  }


