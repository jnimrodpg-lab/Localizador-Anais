/* WMS_V148_VISUAL_FURNITURE_CAD */
/* WMS_V147_ASSISTED_MODULAR_RACK */
/* WMS_V134_SYNC_VISUAL_WMS */
/* WMS_V130_UNIFIED_WALLS_VIEWS */
/* WMS_V105_3D_NAVEGABLE_FIX */
/* WMS_V97_BUTTON_NO_BOUNCE_FIX */
/* WMS_V96_ZOOM_NO_BOUNCE_FIX */
/* WMS_V95_LAYOUT_STATE_SCROLL_WIDTH_FIX */
/* v94: centro real del muro */
/* v93: alineado a extremos reales del muro */
/* WMS_V91_FIX_PUBLIC_RENDERER_SAVE_LAYOUT */
/* WMS_V89_FORCE_FROM_V84: reemplazo real del renderer v84 de vanos/puertas */
(() => {
  const $ = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>[...el.querySelectorAll(s)];
  const appRoot = $('#appRoot');
  const toggleSidebar = $('#toggleSidebar');
  $$('.menu-item[data-screen="card"]').forEach(el => el.remove());
  const menuItems = $$('.menu-item');
  const searchInput = $('#searchInput');
  const btnSearch = $('#btnSearch');
  const btnScanCode = $('#btnScanCode');
  const scannerModal = $('#scannerModal');
  const btnCloseScanner = $('#btnCloseScanner');
  const btnStopScanner = $('#btnStopScanner');
  const scannerHint = $('#scannerHint');
  const productList = $('#productList');
  const countProducts = $('#countProducts');
  const searchBranchHost = $('#searchBranchHost');
  const productSummary = $('#productSummary');
  const productToolbar = $('.product-toolbar');
  const activeProductName = $('#activeProductName');
  const activeProductSku = $('#activeProductSku');
  const activeProductMeta = $('#activeProductMeta');
  const activeLocation = $('#activeLocation');
  const activeStoreLocation = $('#activeStoreLocation');
  const activeProductImageWrap = $('#activeProductImageWrap');
  const activeProductImage = $('#activeProductImage');
  const activeProductGallery = $('#activeProductGallery');
  const activeProductGalleryCounter = $('#activeProductGalleryCounter');
  const activeProductGalleryPrev = $('#activeProductGalleryPrev');
  const activeProductGalleryNext = $('#activeProductGalleryNext');
  const activeSizeStrip = $('#activeSizeStrip');
  const activeColorStrip = $('#activeColorStrip');
  const btnFocusProductMap = $('#btnFocusProductMap');
  const btnOpenViewerFromProduct = $('#btnOpenViewerFromProduct');
  let activeImageCycleTimer = null;
  let activeImageCycleUrls = [];
  let activeMediaCycleItems = [];
  let activeImageCycleIndex = 0;
  let activeImageGalleryBound = false;
  const sheetStatusChip = $('#sheetStatusChip');
  const authModal = $('#authModal');
  const btnAuthAction = $('#btnAuthAction');
  const btnAuthClose = $('#btnAuthClose');
  const btnDoLogin = $('#btnDoLogin');
  const loginUsername = $('#loginUsername');
  const loginPassword = $('#loginPassword');
  const authMode = $('#authMode');
  const authCompanyWrap = $('#authCompanyWrap');
  const authCompanyCodeWrap = $('#authCompanyCodeWrap');
  const authCompanyName = $('#authCompanyName');
  const authCompanyCode = $('#authCompanyCode');
  const authRole = $('#authRole');
  const btnToggleAuthMode = $('#btnToggleAuthMode');
  const authStatus = $('#authStatus');
  const contentTitle = $('#contentTitle');
  const contentSubtitle = $('#contentSubtitle');
  const contentTags = $('#contentTags');
  const contentWrap = $('#contentWrap');
  const contentPanel = $('.content-panel');
  const detailPanel = $('.detail-panel');
  const contentStatus = $('#contentStatus');
  const contentFootRight = $('#contentFootRight');
  const detailTitle = $('#detailTitle');
  const detailSubtitle = $('#detailSubtitle');
  const detailWrap = $('#detailWrap');
  const detailStatus = $('#detailStatus');
  const detailChip = $('#detailChip');

  const appState = {
    screen: 'admin',
    products: [],
    filtered: [],
    selectedProduct: null,
    selectedRack: '',
    selectedZoneId: 'Z1',
    selectedRoomId: '',
    selectedVertex: { zoneId:'', idx:-1 },
    selectedEdge: { zoneId:'', a:-1, b:-1 },
    selectedRackLayoutId: '',
    selectedRackLayoutIds: [],
    selectedWallId: '',
    selectedOpeningId: '',
    highlightedRackIds: [],
    primaryHighlightedRackId: '',
    selectedModelId: 'std_4',
    sheetConfig: { url:'', sheetName:'Productos', lastMode:'demo' },
    layout: {
      zones: [],
      racks: [],
      walls: [],
      openings: []
    },
    branchLayouts: loadBranchLayouts(),
    activeLayoutBranchIndex: 0,
    editor: {
      mode: 'select',
      dragging: null,
      offset: {x:0,y:0},
      viewBox: { x:0, y:0, w:900, h:620 },
      sectionVisible: true,
      racksVisible: true,
      rackPropsOpen: true,
      sectionCuts: {
        x: { pos:.5, dir:1 },
        y: { pos:.5, dir:1 }
      },
      view: 'ortho',
      zonesLocked: false,
      showDims: true,
      showGrid: true,
      showZones: true,
      showLabels: true,
      showMiniMap: true,
      snapEnabled: true,
      snapSize: 2,
      dimFontSize: 32,
      rightPanelOpen: true,
      stackMenu: { open:false, rackId:'', x:0, y:0 },
      inspectorStackOpen: false,
      dragSelect: { active:false, additive:false, start:null, end:null },
      snapPreview: null,
      viewBoxCustomized: false
    },
    models: [
      { id:'std_4', name:'Rack estándar 4 niveles', levels:4, slots:2, width:120, depth:40, height:240, clearance:0, style:'metallic' },
      { id:'wide_5', name:'Rack ancho 5 niveles', levels:5, slots:2, width:120, depth:40, height:240, clearance:0, style:'wide' },
      { id:'compact_3', name:'Rack compacto 3 niveles', levels:3, slots:2, width:120, depth:40, height:240, clearance:0, style:'melamine' },
      { id:'under_stairs', name:'Mueble bajo escalera', levels:4, slots:1, width:180, depth:45, height:240, leftHeight:240, rightHeight:70, topLength:60, mirrored:false, clearance:0, style:'under_stairs', levelHeights:[60,60,60,60], levelSlots:[1,1,1,1] },
      { id:'under_stairs_reflected', name:'Mueble bajo escalera reflejado', levels:4, slots:1, width:180, depth:45, height:240, leftHeight:240, rightHeight:70, topLength:60, mirrored:true, clearance:0, style:'under_stairs_reflected', levelHeights:[60,60,60,60], levelSlots:[1,1,1,1] }
    ],
    admin: loadAdminState(),
    ui: { sheetExpanded:false, productGroupMode:true, rackLibraryOpenIds:['std_4'], isoView:'NE', isoIsolation:'all', isoGhost:true, nav3DWmsMode:'occupancy', nav3DSelectionType:'', nav3DSelectionId:'', nav3DMoveMode:false },
    auth: { loggedIn:false, user:'', role:'', company:'', companyCode:'' },
    sheetWizard: { step: 1, url:'', selectedSheet:'', availableSheets:[], headers:[], mapping:{ sku:'', nombre:'', variante:'', barras:'', ubicacion:'', almacen:'' }, imported:false, loading:false, error:'' },
    productFilters: {
      brand:'',
      category:'',
      gender:'',
      warehouse:'',
      zone:'',
      rack:'',
      image_state:'',
      location_state:'',
      stock_state:''
    },
    productFacets: { brands:[], categories:[], warehouses:[], zones:[], racks:[] },
    productSummaryData: null,
    searchIndex: [],
    productPaging: { mode:'local', page:1, limit:120, total:0, totalPages:1, branchId:0, query:'', loading:false, lastError:'', requestSeq:0 },
    history: {
      layout: { undoStack: [], redoStack: [], isApplying: false, max: 80 },
      structure: { undoStack: [], redoStack: [], isApplying: false, max: 80 },
      distribution: { undoStack: [], redoStack: [], isApplying: false, max: 80 },
      racks: { undoStack: [], redoStack: [], isApplying: false, max: 80 }
    }
  };

  function isRackDistributionScreen(){ return appState?.screen === 'distribution'; }
  function isStructureLayoutScreen(){ return appState?.screen === 'layout'; }
  function isLayoutWorkspaceScreen(){ return isStructureLayoutScreen() || isRackDistributionScreen(); }

  function getUnifiedLayoutSelection(){
    ensureAppRuntimeState();
    if(appState.selectedOpeningId && (appState.layout?.openings||[]).some(o=>o.id===appState.selectedOpeningId)) return {type:'opening',id:appState.selectedOpeningId};
    if(appState.selectedWallId && (appState.layout?.walls||[]).some(w=>w.id===appState.selectedWallId)) return {type:'wall',id:appState.selectedWallId};
    if(appState.selectedRackLayoutId && (appState.layout?.racks||[]).some(r=>r.id===appState.selectedRackLayoutId)) return {type:'rack',id:appState.selectedRackLayoutId};
    if(appState.selectedZoneId && (appState.layout?.zones||[]).some(z=>z.id===appState.selectedZoneId)) return {type:'zone',id:appState.selectedZoneId};
    const type=String(appState.ui?.nav3DSelectionType||''); const id=String(appState.ui?.nav3DSelectionId||'');
    return type&&id?{type,id}:{type:'',id:''};
  }

  function setUnifiedLayoutSelection(type,id,{render=false,source=''}={}){
    ensureAppRuntimeState(); type=String(type||''); id=String(id||'');
    if(type==='rack'){
      const rack=findRackById(id); if(!rack)return false;
      appState.selectedRackLayoutId=id; appState.selectedRack=id; appState.selectedRackLayoutIds=[id]; appState.selectedZoneId=rack.zoneId||appState.selectedZoneId; appState.selectedWallId=''; appState.selectedOpeningId=''; appState.selectedRoomId='';
    }else if(type==='wall'){
      if(!findWallById(id))return false; appState.selectedWallId=id; appState.selectedOpeningId=''; appState.selectedRackLayoutId=''; appState.selectedRackLayoutIds=[]; appState.selectedRoomId=''; if(typeof v117SetSelectedWallIds==='function')v117SetSelectedWallIds([id]);
    }else if(type==='opening'){
      const opening=(appState.layout?.openings||[]).find(o=>o.id===id); if(!opening)return false; appState.selectedOpeningId=id; appState.selectedWallId=opening.wallId||''; appState.selectedRackLayoutId=''; appState.selectedRackLayoutIds=[]; appState.selectedRoomId='';
    }else if(type==='zone'){
      if(!findZoneById(id))return false; appState.selectedZoneId=id; appState.selectedRackLayoutId=''; appState.selectedRackLayoutIds=[]; appState.selectedWallId=''; appState.selectedOpeningId=''; appState.selectedRoomId=findZoneById(id)?.linkedRoomId||'';
    }else{
      appState.selectedRackLayoutId=''; appState.selectedRackLayoutIds=[]; appState.selectedWallId=''; appState.selectedOpeningId=''; appState.selectedRoomId='';
    }
    appState.ui.nav3DSelectionType=type; appState.ui.nav3DSelectionId=id;
    try{document.dispatchEvent(new CustomEvent('wms:layout-selection',{detail:{type,id,source}}));}catch{}
    if(render&&isLayoutWorkspaceScreen()&&typeof renderLayoutEditor==='function')renderLayoutEditor();
    return true;
  }

  const storedRackModels = loadRackModels();
  if (storedRackModels) appState.models = storedRackModels.map(m => ({ ...m, leftHeight: Number(m.leftHeight || m.height || 240), rightHeight: Number(m.rightHeight || Math.max(40, (m.height || 240) * 0.35)), mirrored: isUnderStairsStyle(m?.style) ? (normalizeRackStyle(m?.style) === 'under_stairs_reflected' ? true : false) : !!m.mirrored }));

  let html5QrScanner = null;
  let scannerRunning = false;

  const appModalBackdrop = document.getElementById('appModalBackdrop');
  const appModalTitle = document.getElementById('appModalTitle');
  const appModalBody = document.getElementById('appModalBody');
  const appModalActions = document.getElementById('appModalActions');
  const appModalClose = document.getElementById('appModalClose');
  const toastStack = document.getElementById('toastStack');
  const configImportInput = document.getElementById('configImportInput');
  let modalResolver = null;

  function ensureProductPagingState(){
    const base = { mode:'local', page:1, limit:120, total:0, totalPages:1, branchId:0, query:'', loading:false, lastError:'', backendUnavailable:false, requestSeq:0 };
    if(!appState.productPaging || typeof appState.productPaging !== 'object'){
      appState.productPaging = { ...base };
    }else{
      appState.productPaging = { ...base, ...appState.productPaging };
    }
    if(!['local','backend'].includes(appState.productPaging.mode)) appState.productPaging.mode = 'local';
    appState.productPaging.page = Math.max(1, Number(appState.productPaging.page || 1));
    appState.productPaging.totalPages = Math.max(1, Number(appState.productPaging.totalPages || 1));
    appState.productPaging.total = Math.max(0, Number(appState.productPaging.total || 0));
    appState.productPaging.limit = Math.max(1, Number(appState.productPaging.limit || 120));
    return appState.productPaging;
  }

  function ensureBranchRuntimeShape(branch){
    if(!branch || typeof branch !== 'object') return branch;
    if(!Array.isArray(branch.sheetPreviewProducts)) branch.sheetPreviewProducts = [];
    if(!Array.isArray(branch.sheetMapRows)) branch.sheetMapRows = [];
    if(!Array.isArray(branch.sheetHeaders)) branch.sheetHeaders = [];
    if(!branch.sheetStatusText) branch.sheetStatusText = '';
    return branch;
  }

  function ensureAppRuntimeState(){
    ensureProductPagingState();
    if(!appState.ui || typeof appState.ui !== 'object') appState.ui = { sheetExpanded:false, productGroupMode:true, rackLibraryOpenIds:['std_4'] };
    appState.ui = { sheetExpanded:false, productGroupMode:true, rackLibraryOpenIds:['std_4'], isoView:'NE', isoIsolation:'all', isoGhost:true, nav3DRoof:false, nav3DArchitectural:false, nav3DShowRoomSlabs:true, nav3DShowOpeningFrames:true, nav3DWmsMode:'occupancy', nav3DSelectionType:'', nav3DSelectionId:'', nav3DMoveMode:false, ...appState.ui };
    if(typeof appState.ui.productGroupMode !== 'boolean') appState.ui.productGroupMode = true;
    if(!Array.isArray(appState.ui.rackLibraryOpenIds)) appState.ui.rackLibraryOpenIds = ['std_4'];
    if(!['NE','NW','SE','SW'].includes(appState.ui.isoView)) appState.ui.isoView = 'NE';
    if(!['all','zone','rack'].includes(appState.ui.isoIsolation)) appState.ui.isoIsolation = 'all';
    if(typeof appState.ui.isoGhost !== 'boolean') appState.ui.isoGhost = true;
    if(typeof appState.ui.nav3DShowRoomSlabs !== 'boolean') appState.ui.nav3DShowRoomSlabs = true;
    if(typeof appState.ui.nav3DShowOpeningFrames !== 'boolean') appState.ui.nav3DShowOpeningFrames = true;
    if(!['zones','occupancy','stock','category','brand'].includes(appState.ui.nav3DWmsMode)) appState.ui.nav3DWmsMode = 'occupancy';
    if(appState.ui.nav3DArchitectural !== false) appState.ui.nav3DArchitectural = false;
    if(typeof appState.ui.nav3DSelectionType !== 'string') appState.ui.nav3DSelectionType = '';
    if(typeof appState.ui.nav3DSelectionId !== 'string') appState.ui.nav3DSelectionId = '';
    if(typeof appState.ui.nav3DMoveMode !== 'boolean') appState.ui.nav3DMoveMode = false;
    if(appState.selectedRoomId === undefined) appState.selectedRoomId = '';
    if(!appState.admin || typeof appState.admin !== 'object') appState.admin = { branches:[], users:[], company:{} };
    if(!Array.isArray(appState.admin.branches)) appState.admin.branches = [];
    if(!Array.isArray(appState.admin.users)) appState.admin.users = [];
    if(!appState.admin.company || typeof appState.admin.company !== 'object') appState.admin.company = {};
    appState.admin.branches.forEach(ensureBranchRuntimeShape);
    if(!appState.layout || typeof appState.layout !== 'object') appState.layout = { zones:[], racks:[], walls:[], openings:[] };
    if(!Array.isArray(appState.layout.zones)) appState.layout.zones = [];
    if(!Array.isArray(appState.layout.racks)) appState.layout.racks = [];
    if(!Array.isArray(appState.layout.walls)) appState.layout.walls = [];
    if(!Array.isArray(appState.layout.openings)) appState.layout.openings = [];
    if(!appState.editor || typeof appState.editor !== 'object'){
      appState.editor = {
        mode:'select', dragging:null, offset:{x:0,y:0}, viewBox:{x:0,y:0,w:900,h:620}, sectionVisible:true,
        racksVisible:true, wallsVisible:true, openingsVisible:true, rackPropsOpen:true, sectionCuts:{ x:{pos:.5,dir:1}, y:{pos:.5,dir:1} }, view:'ortho',
        zonesLocked:false, showDims:true, snapEnabled:true, snapSize:2, dimFontSize:32, stackMenu:{ open:false, rackId:'', x:0, y:0 }, inspectorStackOpen:false,
        dragSelect:{ active:false, additive:false, start:null, end:null }, snapPreview:null, viewBoxCustomized:false, pendingWallPoint:null
      };
    }
    if(typeof appState.editor.mode !== 'string' || !appState.editor.mode) appState.editor.mode = 'select';
    if(!appState.history || typeof appState.history !== 'object') appState.history = {};
    ['layout','structure','distribution','racks'].forEach(type => { if(!appState.history[type] || typeof appState.history[type] !== 'object') appState.history[type] = { undoStack:[], redoStack:[], isApplying:false, max:80 }; });
    if(!appState.auth || typeof appState.auth !== 'object') appState.auth = { loggedIn:false, user:'', role:'', company:'', companyCode:'' };
    if(!appState.productFilters || typeof appState.productFilters !== 'object') appState.productFilters = { brand:'', category:'', gender:'', warehouse:'', zone:'', rack:'', image_state:'', location_state:'', stock_state:'' };
    if(!appState.productFacets || typeof appState.productFacets !== 'object') appState.productFacets = { brands:[], categories:[], warehouses:[], zones:[], racks:[] };
    return appState;
  }

  function showToast(message, type='success', timeout=2600){
    if(!toastStack) return;
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = String(message || '').trim() || 'Listo';
    toastStack.appendChild(el);
    setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(6px)'; }, Math.max(500, timeout-260));
    setTimeout(()=> el.remove(), timeout);
  }

  function closeAppModal(result=false){
    if(appModalBackdrop) appModalBackdrop.classList.remove('show');
    if(modalResolver){ const r = modalResolver; modalResolver=null; r(result); }
  }

  function openAppModal({title='Aviso', message='', actions=[]}={}){
    if(!appModalBackdrop) return Promise.resolve(false);
    appModalTitle.textContent = title;
    appModalBody.innerHTML = Array.isArray(message) ? message.map(line => `<div>${escapeHtml(String(line))}</div>`).join('') : `<div>${escapeHtml(String(message))}</div>`;
    appModalActions.innerHTML = '';
    return new Promise(resolve => {
      modalResolver = resolve;
      const finalActions = actions.length ? actions : [{label:'Cerrar', value:true, cls:'secondary'}];
      finalActions.forEach(action => {
        const btn = document.createElement('button');
        btn.type='button';
        btn.className = `btn ${action.cls || 'secondary'}`.trim();
        btn.textContent = action.label || 'Aceptar';
        btn.onclick = ()=> closeAppModal(action.value);
        appModalActions.appendChild(btn);
      });
      appModalBackdrop.classList.add('show');
    });
  }

  if(appModalClose) appModalClose.onclick = ()=> closeAppModal(false);
  if(appModalBackdrop) appModalBackdrop.addEventListener('click', e=>{ if(e.target === appModalBackdrop) closeAppModal(false); });

  const __nativeAlert = window.alert ? window.alert.bind(window) : null;
  let alertQueue = Promise.resolve();
  let lastAlertMessage = '';
  let lastAlertAt = 0;
  window.alert = function(message='Aviso'){
    const msg = String(message || '').trim() || 'Aviso';
    const now = Date.now();
    if(msg === lastAlertMessage && (now - lastAlertAt) < 900) return Promise.resolve(true);
    lastAlertMessage = msg;
    lastAlertAt = now;
    alertQueue = alertQueue.then(()=> openAppModal({ title:'Aviso', message:msg, actions:[{label:'Aceptar', value:true, cls:'primary'}] })).catch(()=>true);
    return alertQueue;
  };

  function branchLabel(branch, index){ return String(branch?.name || `Sucursal ${Number(index)+1}`); }

  function exportAdminConfig(){
    try{
      const payload = { exportedAt:new Date().toISOString(), version:'fase3', admin:sanitizedAdminState(), branchLayouts:loadBranchLayouts(), models:appState.models };
      const blob = new Blob([JSON.stringify(payload, null, 2)], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `wms-config-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=> URL.revokeObjectURL(a.href), 800);
      showToast('Configuración exportada.', 'success');
    }catch(err){ showToast(err.message || 'No se pudo exportar la configuración.', 'error', 3600); }
  }

  function triggerImportConfig(){ if(configImportInput) configImportInput.click(); }

  async function handleConfigImportFile(file){
    if(!file) return;
    try{
      const text = await file.text();
      const data = JSON.parse(text);
      const ok = await openAppModal({ title:'Importar configuración', message:'Esto reemplazará la configuración local actual de empresa, sucursales, layouts y racks. ¿Deseas continuar?', actions:[{label:'Cancelar', value:false, cls:'secondary'},{label:'Importar', value:true, cls:'primary'}] });
      if(!ok) return;
      if(data.admin) appState.admin = normalizeAdminState(data.admin);
      if(Array.isArray(data.branchLayouts)) appState.branchLayouts = normalizeBranchLayouts(data.branchLayouts);
      if(Array.isArray(data.models) && data.models.length) appState.models = data.models.map(m => ({ ...m }));
      saveAdminState();
      saveBranchLayouts();
      saveRackModels(appState.models);
      renderApp();
      showToast('Configuración importada correctamente.', 'success');
    }catch(err){ showToast(err.message || 'No se pudo importar el archivo.', 'error', 3600); }
    finally{ if(configImportInput) configImportInput.value=''; }
  }

  if(configImportInput) configImportInput.addEventListener('change', e => handleConfigImportFile(e.target.files?.[0]));

  function validateBranchSheetSetup(branch){
    const issues = [];
    const url = String(branch?.sheetUrl || '').trim();
    const sheetName = String(branch?.sheetName || '').trim();
    if(!url) issues.push('Falta la URL o ID del Sheet.');
    if(!sheetName) issues.push('Falta el nombre de la hoja.');
    const headers = Array.isArray(branch?.sheetHeaders) ? branch.sheetHeaders.filter(Boolean) : [];
    if(!headers.length) issues.push('Primero debes leer la fila 1.');
    const rows = Array.isArray(branch?.sheetMapRows) ? branch.sheetMapRows : [];
    const required = ['sku','nombre','ubicacion'];
    required.forEach(field => {
      const found = rows.find(row => row.field === field && String(row.header || '').trim());
      if(!found) issues.push(`Falta mapear el campo ${field.toUpperCase()}.`);
    });
    return issues;
  }

  function copyBranchSheetConfig(fromIndex, toIndex){
    const from = appState.admin.branches[fromIndex];
    const to = appState.admin.branches[toIndex];
    if(!from || !to || fromIndex===toIndex) return;
    ensureBranchSheetFields();
    to.sheetMapRows = JSON.parse(JSON.stringify(from.sheetMapRows || defaultSheetMapRows()));
    to.sheetHeaders = Array.isArray(from.sheetHeaders) ? from.sheetHeaders.slice() : [];
    to.sheetHeaderIndex = Number(from.sheetHeaderIndex || 0);
    to.sheetConnected = !!to.sheetHeaders.length;
    to.sheetStatusText = `Mapeo copiado desde ${branchLabel(from, fromIndex)}.`;
    markBranchDirty(toIndex);
    saveAdminState();
    renderSheetScreen();
    showToast(`Configuración copiada a ${branchLabel(to, toIndex)}.`, 'success');
  }

  async function clearBranchImportedData(index, mode='products'){
    const branch = appState.admin.branches[index];
    if(!branch) return;
    const isActiveBranch = Number(appState.activeBranchIndex) === Number(index) || Number(appState.viewerBranchIndex) === Number(index) || Number(appState.admin?.activeBranch) === Number(index);
    if(mode === 'cache'){
      if(isActiveBranch){
        appState.searchIndex = buildProductSearchIndex(appState.products || []);
        appState.filtered = Array.isArray(appState.products) ? appState.products.slice() : [];
        renderProducts(appState.filtered || []);
        renderMapView();
      }
      branch.sheetStatusText = 'Búsqueda reconstruida para esta sucursal.';
      saveAdminState();
      renderSheetScreen();
      showToast(branch.sheetStatusText, 'success', 2800);
      return;
    }
    clearImportedProductsForBranch(index, { resetUi:isActiveBranch, clearHeaders:false });
    branch.sheetStatusText = 'Productos importados eliminados. El mapeo se conservó.';
    setBranchMetaStatus(branch, branch.sheetHeaders?.length ? BRANCH_STATUS.MAPPED : BRANCH_STATUS.LINKED, { productCount:0, headerCount:getSheetBranchHeaderCount(branch) });
    if(isActiveBranch){
      setProductDataset([]);
      appState.filtered = [];
      appState.searchIndex = [];
      appState.selectedProduct = null;
      renderProducts([]);
      renderMapView();
    }
    saveAdminState();
    if(appState.auth?.loggedIn && Number(branch.id || 0) > 0){
      try{
        await persistBranchSheet(index, { includeProducts:true });
        appState.productSummaryData = null;
        appState.productSummaryBranchId = 0;
      }catch(err){
        console.warn('No se pudo limpiar productos remotos:', err);
        showToast('Se limpió la vista local, pero no se pudo confirmar el borrado remoto.', 'error', 3600);
      }
    }
    renderSheetScreen();
    showToast(branch.sheetStatusText, 'warn', 3200);
  }

  const DEFAULT_ZONE_COLOR = '#ffd84d';
  const DEFAULT_ZONE_SIZE = { w:580, h:420 };
  const BRANCH_STATUS = {
    EMPTY:'EMPTY',
    LINKED:'LINKED',
    HEADERS_LOADED:'HEADERS_LOADED',
    MAPPED:'MAPPED',
    IMPORTED:'IMPORTED',
    DIRTY:'DIRTY',
    ERROR:'ERROR',
    LOADING:'LOADING'
  };

  function sortProductsStable(list){
    const arr = Array.isArray(list) ? list.slice() : [];
    return arr.sort((a,b)=> String(a?.nombre||'').localeCompare(String(b?.nombre||''), 'es', { sensitivity:'base' }) || String(a?.variante||'').localeCompare(String(b?.variante||''), 'es', { sensitivity:'base' }) || String(a?.sku||'').localeCompare(String(b?.sku||''), 'es', { sensitivity:'base' }));
  }
  function buildProductSearchIndex(products){
    return (Array.isArray(products) ? products : []).map((p, idx) => {
      const familyText = norm([p.marca, p.codigo, p.cod, p.modelo, p.nombre].filter(Boolean).join(' '));
      const variantText = norm([getProductSizeValue(p), getProductColorValue(p), p.variante, p.sku, p.barras].filter(Boolean).join(' '));
      const locationText = norm([p.ubicacion, p.almacen, p.rack, p.rackStore].filter(Boolean).join(' '));
      const nameOnly = norm(p.nombre || '');
      const nameVariant = norm(`${p.nombre || ''} ${p.variante || ''}`);
      return {
        p,
        idx,
        familyText,
        variantText,
        locationText,
        haystack: [familyText, variantText, locationText].filter(Boolean).join(' '),
        nameOnly,
        nameVariant,
        exactSku: norm(p.sku || ''),
        exactRack: norm(p.rack || ''),
        exactRackStore: norm(p.rackStore || ''),
        exactUbic: norm(p.ubicacion || ''),
        exactAlm: norm(p.almacen || '')
      };
    });
  }
  function setProductDataset(list, options = {}){
    const paging = ensureProductPagingState();
    const next = options.keepOrder ? (Array.isArray(list) ? list.slice() : []) : sortProductsStable(list);
    appState.products = next;
    appState.filtered = next.slice();
    appState.searchIndex = buildProductSearchIndex(next);
    if(paging.mode !== 'backend'){
      paging.total = next.length;
      paging.totalPages = 1;
      paging.page = 1;
    }
  }

  function apiGetJson(url){
    return fetch(url, { credentials:'include', cache:'no-store' }).then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if(!res.ok || data?.ok === false){
        const err = new Error(data?.error || `HTTP ${res.status}`);
        err.status = Number(res.status || 0);
        err.payload = data;
        throw err;
      }
      return data;
    });
  }
  function getBranchByIndex(branchIndex){
    return (appState.admin?.branches || [])[Number(branchIndex)] || null;
  }
  function getCurrentProductsTotal(){
    const paging = ensureProductPagingState();
    return Number(paging.total || 0) || (Array.isArray(appState.products) ? appState.products.length : 0);
  }
  function ensureProductPagerUi(){
    if(!productToolbar || document.getElementById('productPager')) return;
    const pager = document.createElement('div');
    pager.className = 'product-pager';
    pager.id = 'productPager';
    pager.innerHTML = `
      <button class="pager-btn" id="productPrevPage" type="button">←</button>
      <div class="pager-info" id="productPageInfo">Página 1 / 1</div>
      <button class="pager-btn" id="productNextPage" type="button">→</button>
      <span class="pager-mode" id="productModeChip">local</span>
    `;
    productToolbar.appendChild(pager);
    const prev = document.getElementById('productPrevPage');
    const next = document.getElementById('productNextPage');
    prev?.addEventListener('click', () => {
      if((appState.productPaging?.page || 1) <= 1) return;
      requestProductsPage({ page: (appState.productPaging.page || 1) - 1 });
    });
    next?.addEventListener('click', () => {
      if((appState.productPaging?.page || 1) >= (appState.productPaging?.totalPages || 1)) return;
      requestProductsPage({ page: (appState.productPaging.page || 1) + 1 });
    });
  }
  function updateProductPagerUi(){
    const paging = ensureProductPagingState();
    const info = document.getElementById('productPageInfo');
    const prev = document.getElementById('productPrevPage');
    const next = document.getElementById('productNextPage');
    const chip = document.getElementById('productModeChip');
    const total = Number(paging.total || 0);
    if(info) info.textContent = `Página ${paging.page || 1} / ${paging.totalPages || 1} • ${total.toLocaleString('es-PE')} registros`;
    if(prev) prev.disabled = (paging.page || 1) <= 1 || !!paging.loading;
    if(next) next.disabled = (paging.page || 1) >= (paging.totalPages || 1) || !!paging.loading;
    if(chip) chip.textContent = paging.mode === 'backend' ? 'api' : 'local';
  }

  function getActiveProductFilters(){
    return { ...(appState.productFilters || {}) };
  }

  function getNormalizedProductFilterEntries(filters = null){
    const src = filters || appState.productFilters || {};
    return Object.entries(src).map(([key, value]) => [key, String(value || '').trim()]).filter(([, value]) => value);
  }

  function updateFilterSummaryChip(){
    const chip = document.getElementById('productFilterSummary');
    if(!chip) return;
    const activeCount = getNormalizedProductFilterEntries().length;
    chip.textContent = activeCount ? `${activeCount} filtro${activeCount === 1 ? '' : 's'} activo${activeCount === 1 ? '' : 's'}` : 'Sin filtros';
    chip.dataset.active = activeCount ? '1' : '0';
  }

  function buildFacetOptionsHtml(items = [], label = 'Todos'){
    const normalized = Array.isArray(items)
      ? items.map(item => typeof item === 'string' ? { value:item, count:null } : item).filter(item => String(item?.value || '').trim())
      : [];
    return [`<option value="">${label}</option>`].concat(normalized.map(item => {
      const value = escapeHtml(item.value || '');
      const suffix = item.count != null ? ` (${Number(item.count || 0).toLocaleString('es-PE')})` : '';
      return `<option value="${value}">${value}${suffix}</option>`;
    })).join('');
  }

  function ensureProductFilterBar(){
    const existing = document.getElementById('productFilterBar');
    if(existing) existing.remove();
    return null;
  }

  function syncProductFilterUi(){
    // Filtros avanzados ocultos en esta versión estable: se conserva solo buscador principal.
    ensureProductFilterBar();
    updateFilterSummaryChip();
    updateCategoryFilterButton();
  }

  function readProductRawValue(product, aliases = []){
    const raw = product?._raw && typeof product._raw === 'object' ? product._raw : null;
    if(!raw) return '';
    const entries = Object.entries(raw);
    for(const alias of aliases){
      const wanted = norm(alias);
      const hit = entries.find(([key]) => norm(key) === wanted);
      if(hit && String(hit[1] || '').trim()) return String(hit[1] || '').trim();
    }
    return '';
  }

  function getProductCategoryValue(product){
    const p = product || {};
    return String(
      p.category || p.categoria || p.categoría || p.Categoria || p.Categoría ||
      readProductRawValue(p, ['categoria','categoría','category']) || ''
    ).trim();
  }

  function canonicalGenderValue(value){
    const raw = String(value || '').trim();
    const n = norm(raw);
    if(!n) return '';
    if(['varon','hombre','caballero','masculino'].includes(n)) return 'Varón';
    if(['mujer','dama','femenino'].includes(n)) return 'Mujer';
    if(['nino','niño','ninos','niños','kidboy','boy'].includes(n)) return 'Niños';
    if(['nina','niña','ninas','niñas','kidgirl','girl'].includes(n)) return 'Niñas';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }

  function getProductGenderValue(product){
    const p = product || {};
    return canonicalGenderValue(
      p.gender || p.genero || p.género || p.Genero || p.Género ||
      readProductRawValue(p, ['genero','género','gender']) || ''
    );
  }

  function getCategoryDisplayName(value){
    const raw = String(value || '').trim();
    return raw || 'Sin categoría';
  }

  function getCategoryStats(genderFilter = ''){
    const products = Array.isArray(appState.products) ? appState.products : [];
    const activeGender = canonicalGenderValue(genderFilter || appState.productFilters?.gender || '');
    const groups = new Map();
    products.forEach(p => {
      if(activeGender && getProductGenderValue(p) !== activeGender) return;
      const raw = getProductCategoryValue(p);
      if(!raw) return;
      const key = norm(raw);
      if(!groups.has(key)) groups.set(key, { key, value: raw, label: getCategoryDisplayName(raw), count:0, families:new Set(), images:[] });
      const g = groups.get(key);
      g.count += 1;
      g.families.add(norm(p?.nombre || '') || String(p?.sku || ''));
      if(g.images.length < 4){
        const img = getProductImageUrls(p)[0] || '';
        if(img && !g.images.includes(img)) g.images.push(img);
      }
    });
    return Array.from(groups.values()).map(g => ({ ...g, familiesCount:g.families.size })).sort((a,b) => {
      return b.familiesCount - a.familiesCount || b.count - a.count || a.label.localeCompare(b.label, 'es', { sensitivity:'base' });
    });
  }

  function updateCategoryFilterButton(){
    const btn = document.getElementById('btnOpenCategoryPinterest');
    if(!btn) return;
    const active = String(appState.productFilters?.category || '').trim();
    const activeGender = canonicalGenderValue(appState.productFilters?.gender || '');
    btn.classList.toggle('active', !!(active || activeGender));
    if(active && activeGender) btn.innerHTML = `Categoría: <span>${escapeHtml(active)}</span> · ${escapeHtml(activeGender)}`;
    else if(active) btn.innerHTML = `Categoría: <span>${escapeHtml(active)}</span>`;
    else if(activeGender) btn.innerHTML = `Categorías · ${escapeHtml(activeGender)}`;
    else btn.innerHTML = 'Categorías';
    btn.title = active || activeGender ? `Filtro activo: ${[active, activeGender].filter(Boolean).join(' · ')}` : 'Filtrar por categoría';
  }

  function openCategoryPinterestModal(){
    const existing = document.getElementById('categoryPinterestModal');
    if(existing) existing.remove();
    const active = String(appState.productFilters?.category || '').trim();
    let activeGender = canonicalGenderValue(appState.productFilters?.gender || '');
    const totalProducts = Array.isArray(appState.products) ? appState.products.length : 0;
    const modal = document.createElement('div');
    modal.id = 'categoryPinterestModal';
    modal.className = 'category-pinterest-backdrop show';
    modal.innerHTML = `
      <div class="category-pinterest-shell">
        <div class="category-pinterest-head">
          <div>
            <div class="search-card-kicker">Filtro visual</div>
            <h2>Categorías</h2>
            <p>Selecciona una categoría para filtrar el listado de productos. Vista tipo Pinterest para navegar más rápido.</p>
          </div>
          <div class="category-pinterest-actions">
            <span class="chip">${totalProducts.toLocaleString('es-PE')} registros</span>
            <button class="btn secondary" id="btnClearCategoryFilter" type="button">Todas</button>
            <button class="location-modal-close" type="button" id="btnCloseCategoryPinterest" aria-label="Cerrar">✕</button>
          </div>
        </div>
        <div class="category-pinterest-toolbar">
          <input id="categoryPinterestSearch" placeholder="Buscar categoría..." autocomplete="off">
          <span class="muted tiny" id="categoryPinterestCounter">0 categorías detectadas</span>
        </div>
        <div class="category-pinterest-genders" id="categoryPinterestGenders">
          ${['Mujer','Varón','Niños','Niñas'].map(label => `<button type="button" class="category-gender-pill ${activeGender===label?'active':''}" data-gender-value="${label}">${label}</button>`).join('')}
        </div>
        <div class="category-pinterest-grid" id="categoryPinterestGrid"></div>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('#btnCloseCategoryPinterest')?.addEventListener('click', close);
    modal.addEventListener('click', e => { if(e.target === modal) close(); });
    modal.querySelector('#btnClearCategoryFilter')?.addEventListener('click', () => {
      appState.productFilters.category = '';
      appState.productFilters.gender = '';
      close();
      filterProducts();
      updateCategoryFilterButton();
    });
    const grid = modal.querySelector('#categoryPinterestGrid');
    const search = modal.querySelector('#categoryPinterestSearch');
    const counter = modal.querySelector('#categoryPinterestCounter');
    const renderGrid = () => {
      const categories = getCategoryStats(activeGender);
      const q = norm(search?.value || '');
      const filtered = categories.filter(cat => !q || norm(`${cat.label} ${cat.value}`).includes(q));
      counter.textContent = `${categories.length.toLocaleString('es-PE')} categorías detectadas`;
      if(!filtered.length){
        grid.innerHTML = `<div class="empty compact"><b>No hay categorías detectadas</b><div class="muted tiny">Verifica que el Sheet tenga valores en la columna Categoria y, si usas género, prueba con otra opción como Mujer, Varón, Niños o Niñas.</div></div>`;
        return;
      }
      grid.innerHTML = filtered.map((cat, idx) => {
        const isActive = active && cat.value === active;
        const media = cat.images.length
          ? `<div class="category-pinterest-media count-${Math.min(cat.images.length,4)}">${cat.images.slice(0,4).map(url => `<img src="${escapeHtml(url)}" alt="${escapeHtml(cat.label)}">`).join('')}</div>`
          : `<div class="category-pinterest-media empty"><span>${escapeHtml(cat.label.slice(0,2).toUpperCase())}</span></div>`;
        return `<button class="category-pinterest-card ${isActive ? 'active' : ''} size-${(idx % 5) + 1}" type="button" data-category-value="${escapeHtml(cat.value)}">
          ${media}
          <div class="category-pinterest-card-body">
            <div><b>${escapeHtml(cat.label)}</b><small>${cat.familiesCount.toLocaleString('es-PE')} producto${cat.familiesCount === 1 ? '' : 's'} • ${cat.count.toLocaleString('es-PE')} variante${cat.count === 1 ? '' : 's'}</small></div>
            <span>${isActive ? 'Activo' : 'Filtrar'}</span>
          </div>
        </button>`;
      }).join('');
      grid.querySelectorAll('[data-category-value]').forEach(btn => {
        btn.addEventListener('click', () => {
          appState.productFilters.category = String(btn.dataset.categoryValue || '').trim();
          appState.productFilters.gender = activeGender || '';
          close();
          filterProducts();
          updateCategoryFilterButton();
        });
      });
    };
    modal.querySelectorAll('[data-gender-value]').forEach(btn => {
      btn.addEventListener('click', () => {
        const clicked = canonicalGenderValue(btn.dataset.genderValue || '');
        activeGender = activeGender === clicked ? '' : clicked;
        appState.productFilters.gender = activeGender;
        modal.querySelectorAll('[data-gender-value]').forEach(pill => pill.classList.toggle('active', canonicalGenderValue(pill.dataset.genderValue || '') === activeGender));
        filterProducts();
        updateCategoryFilterButton();
        renderGrid();
      });
    });
    search?.addEventListener('input', renderGrid);
    renderGrid();
    window.setTimeout(() => search?.focus(), 80);
  }

  function updateProductAnalyticsSummary(){
    const summary = appState.productSummaryData || null;
    const foot = document.getElementById('contentFootRight');
    if(!summary){ if(foot) foot.textContent = '—'; return; }
    const pieces = [];
    if(Number(summary.with_location || 0) || Number(summary.total || 0)) pieces.push(`${Number(summary.with_location || 0).toLocaleString('es-PE')} con ubicación`);
    if(Number(summary.with_image || 0) || Number(summary.total || 0)) pieces.push(`${Number(summary.with_image || 0).toLocaleString('es-PE')} con imagen`);
    if(Number(summary.with_stock || 0) || Number(summary.total || 0)) pieces.push(`${Number(summary.with_stock || 0).toLocaleString('es-PE')} con stock`);
    if(foot) foot.textContent = pieces.length ? pieces.join(' • ') : '—';
  }

  async function fetchProductsSummary(branchIndex = null){
    const targetBranchIndex = Number.isFinite(branchIndex) ? Number(branchIndex) : getActiveBranchIndex();
    const branch = getBranchByIndex(targetBranchIndex);
    if(!branch?.id) return null;
    try{
      const data = await apiGetJson(`/api/branches/${branch.id}/products-summary`);
      appState.productSummaryData = data?.summary || null;
      appState.productSummaryBranchId = Number(branch.id || 0);
      if(data?.facets) appState.productFacets = data.facets;
      syncProductFilterUi();
      updateProductAnalyticsSummary();
      return data;
    }catch(_err){
      return null;
    }
  }
  async function fetchBranchProductsPage(branchIndex, { query = '', page = 1, limit = null, filters = null } = {}){
    const paging = ensureProductPagingState();
    const branch = getBranchByIndex(branchIndex);
    if(!branch?.id) return null;
    const pageSize = Number(limit || paging.limit || 120);
    const params = new URLSearchParams();
    if(query) params.set('q', query);
    params.set('page', String(page));
    params.set('limit', String(pageSize));
    getNormalizedProductFilterEntries(filters).forEach(([key, value]) => params.set(key, value));
    return apiGetJson(`/api/branches/${branch.id}/products?${params.toString()}`);
  }
  async function requestProductsPage({ branchIndex = null, query = null, page = null, silent = false } = {}){
    ensureAppRuntimeState();
    const paging = ensureProductPagingState();
    const targetBranchIndex = Number.isFinite(branchIndex) ? Number(branchIndex) : getActiveBranchIndex();
    const nextQuery = query != null ? String(query || '').trim() : String(paging?.query || '').trim();
    const nextPage = Math.max(1, Number(page || paging?.page || 1));
    const branch = getBranchByIndex(targetBranchIndex);
    if(!branch?.id) return false;
    if(paging.backendUnavailable){
      appState.productPaging = { ...paging, mode:'local', loading:false, query:nextQuery };
      filterProducts();
      return false;
    }
    const requestSeq = Number(paging.requestSeq || 0) + 1;
    appState.productPaging.requestSeq = requestSeq;
    try{
      appState.productPaging.loading = true;
      appState.productPaging.branchId = Number(branch.id || 0);
      updateProductPagerUi();
      const activeFilters = getActiveProductFilters();
      const data = await fetchBranchProductsPage(targetBranchIndex, { query: nextQuery, page: nextPage, filters: activeFilters });
      if(Number(ensureProductPagingState().requestSeq || 0) !== requestSeq) return false;
      const items = Array.isArray(data?.items) ? data.items : [];
      if(data?.facets) appState.productFacets = data.facets;
      appState.productPaging = {
        ...appState.productPaging,
        mode:'backend',
        page:Number(data?.page || nextPage || 1),
        limit:Number(data?.limit || appState.productPaging.limit || 120),
        total:Number(data?.total || items.length || 0),
        totalPages:Number(data?.total_pages || 1),
        query:nextQuery,
        loading:false,
        branchId:Number(branch.id || 0),
        filters:activeFilters,
        lastError:'',
        requestSeq
      };
      setProductDataset(items, { keepOrder:true });
      appState.filtered = appState.products.filter(p => productMatchesLocalFilters(p));
      countProducts.textContent = getCurrentProductsTotal().toLocaleString('es-PE');
      syncProductFilterUi();
      renderProducts(appState.filtered);
      const selectedKey = getProductIdentityKey(appState.selectedProduct);
      const selectedStillVisible = items.find(p => getProductIdentityKey(p) === selectedKey);
      if(selectedStillVisible) updateActiveProductCard(selectedStillVisible);
      else if(items[0]) selectProduct(items[0]);
      else updateActiveProductCard(null);
      if(!silent) syncActiveProductCardHint();
      if(!appState.productSummaryData || Number(appState.productSummaryBranchId || 0) !== Number(branch.id || 0)) fetchProductsSummary(targetBranchIndex);
      updateProductPagerUi();
      return true;
    }catch(err){
      if(Number(ensureProductPagingState().requestSeq || 0) !== requestSeq) return false;
      const status = Number(err?.status || 0);
      if(status === 404){
        appState.productPaging = {
          ...ensureProductPagingState(),
          mode:'local',
          page:1,
          total:Array.isArray(appState.products) ? appState.products.length : 0,
          totalPages:1,
          query:nextQuery,
          loading:false,
          branchId:Number(branch.id || 0),
          filters:getActiveProductFilters(),
          lastError:'backend_404_local_fallback',
          backendUnavailable:true
        };
        filterProducts();
        updateProductPagerUi();
        return false;
      }
      appState.productPaging.loading = false;
      appState.productPaging.lastError = String(err?.message || err || 'error');
      updateProductPagerUi();
      return false;
    }
  }

  function getHistoryBucket(type){
    if(!appState.history) appState.history = {};
    if(!appState.history[type]) appState.history[type] = { undoStack:[], redoStack:[], isApplying:false, max:80 };
    return appState.history[type];
  }
  function snapshotForType(type){
    if(type === 'layout') return clone(appState.layout || defaultLayout());
    if(type === 'structure'){
      const snapshot = clone(appState.layout || defaultLayout());
      delete snapshot.racks;
      return snapshot;
    }
    if(type === 'distribution') return clone(appState.layout?.racks || []);
    if(type === 'racks') return clone(appState.models || []);
    return null;
  }
  function recordHistorySnapshot(type, snapshot = null){
    const bucket = getHistoryBucket(type);
    if(!bucket || bucket.isApplying) return;
    const snap = snapshot == null ? snapshotForType(type) : clone(snapshot);
    const serialized = JSON.stringify(snap);
    const last = bucket.undoStack[bucket.undoStack.length - 1];
    if(last === serialized) return;
    bucket.undoStack.push(serialized);
    if(bucket.undoStack.length > (bucket.max || 80)) bucket.undoStack.shift();
    bucket.redoStack = [];
    updateUndoRedoUi();
  }
  function applyHistoryState(type, payload){
    if(type === 'layout'){
      appState.layout = clone(payload || defaultLayout());
      ensureLayoutMeta();
      normalizeLayoutSectionState();
      appState.selectedZoneId = appState.layout?.zones?.[0]?.id || '';
      appState.selectedRackLayoutId = appState.layout?.racks?.[0]?.id || '';
      appState.selectedVertex = { zoneId:'', idx:-1 };
      appState.selectedEdge = { zoneId:'', a:-1, b:-1 };
      persistActiveLayout();
      if(isLayoutWorkspaceScreen()){ renderLayoutEditor(); renderLayoutInspector(); }
      else if(appState.screen === 'viewer' || appState.screen === 'products') renderMapView();
    } else if(type === 'structure'){
      const currentLayout = clone(appState.layout || defaultLayout());
      const currentRacks = clone(currentLayout.racks || []);
      const currentZones = Array.isArray(currentLayout.zones) ? currentLayout.zones : [];
      const nextStructure = clone(payload || {});
      const nextZones = Array.isArray(nextStructure.zones) ? nextStructure.zones : [];
      const zoneIdMap = new Map();
      currentZones.forEach((zone, index) => { const nextId = nextZones[index]?.id; if(zone?.id && nextId) zoneIdMap.set(String(zone.id), String(nextId)); });
      currentRacks.forEach(rack => {
        const mapped = zoneIdMap.get(String(rack.zoneId || ''));
        if(!mapped || mapped === rack.zoneId) return;
        const seq = (String(rack.id || '').match(/-E(\d+)/i)||[])[1] || '';
        rack.zoneId = mapped;
        if(seq) rack.id = `${mapped}-E${seq}`;
      });
      appState.layout = { ...currentLayout, ...nextStructure, racks:currentRacks };
      ensureLayoutMeta();
      normalizeLayoutSectionState();
      appState.selectedZoneId = appState.layout?.zones?.[0]?.id || '';
      appState.selectedRackLayoutId = '';
      appState.selectedVertex = { zoneId:'', idx:-1 };
      appState.selectedEdge = { zoneId:'', a:-1, b:-1 };
      persistActiveLayout();
      if(isLayoutWorkspaceScreen()){ renderLayoutEditor(); renderLayoutInspector(); }
    } else if(type === 'distribution'){
      appState.layout.racks = clone(Array.isArray(payload) ? payload : []);
      appState.selectedRackLayoutId = appState.layout.racks?.[0]?.id || '';
      appState.selectedRackLayoutIds = appState.selectedRackLayoutId ? [appState.selectedRackLayoutId] : [];
      if(appState.selectedRackLayoutId){ const activeRack = appState.layout.racks[0]; appState.selectedZoneId = activeRack?.zoneId || appState.selectedZoneId; }
      persistActiveLayout();
      if(isLayoutWorkspaceScreen()){ renderLayoutEditor(); renderLayoutInspector(); }
    } else if(type === 'racks'){
      appState.models = clone(Array.isArray(payload) ? payload : []);
      if(!appState.models.length){ updateUndoRedoUi(); return; }
      if(!appState.models.some(m => m.id === appState.selectedModelId)) appState.selectedModelId = appState.models[0].id;
      saveRackModels();
      if(appState.screen === 'racks') renderRackModels(); else if(appState.screen === 'rack-builder') renderRackConstructionWorkspace(); else renderRackModelPreview();
    }
    updateUndoRedoUi();
  }
  function undoHistory(type){
    const bucket = getHistoryBucket(type);
    if(!bucket || !bucket.undoStack.length) return;
    const current = JSON.stringify(snapshotForType(type));
    const previous = bucket.undoStack.pop();
    if(previous === current && bucket.undoStack.length){
      bucket.redoStack.push(current);
      const prev2 = bucket.undoStack.pop();
      if(prev2 == null){ updateUndoRedoUi(); return; }
      bucket.isApplying = true;
      try{ applyHistoryState(type, JSON.parse(prev2)); }
      finally{ bucket.isApplying = false; }
      return;
    }
    bucket.redoStack.push(current);
    bucket.isApplying = true;
    try{ applyHistoryState(type, JSON.parse(previous)); }
    finally{ bucket.isApplying = false; }
  }
  function redoHistory(type){
    const bucket = getHistoryBucket(type);
    if(!bucket || !bucket.redoStack.length) return;
    const current = JSON.stringify(snapshotForType(type));
    const next = bucket.redoStack.pop();
    bucket.undoStack.push(current);
    bucket.isApplying = true;
    try{ applyHistoryState(type, JSON.parse(next)); }
    finally{ bucket.isApplying = false; }
  }
  function updateUndoRedoUi(){
    ['layout','structure','distribution','racks'].forEach(type => {
      const bucket = getHistoryBucket(type);
      const undoBtn = document.querySelector(`[data-history-undo="${type}"]`);
      const redoBtn = document.querySelector(`[data-history-redo="${type}"]`);
      if(undoBtn) undoBtn.disabled = !bucket.undoStack.length;
      if(redoBtn) redoBtn.disabled = !bucket.redoStack.length;
    });
  }
  let productSearchDebounce = null;

