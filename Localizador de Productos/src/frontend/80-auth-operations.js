  function renderReports(){
    renderMapView();
    contentTitle.textContent = 'Reportes';
    contentSubtitle.textContent = 'Resumen visual rápido del inventario y ubicación.';
    setTags(['resumen', 'zonas', 'racks', 'inventario']);
    contentStatus.textContent = 'Vista rápida de reportes.';
  }

  async function stopScanner(){
    try{
      if (html5QrScanner && scannerRunning) await html5QrScanner.stop();
    } catch (e) { console.warn(e); }
    scannerRunning = false;
    if (html5QrScanner){
      try { await html5QrScanner.clear(); } catch(e){}
      html5QrScanner = null;
    }
    scannerModal.classList.remove('show');
  }

  async function openScanner(mode='qr'){
    scannerHint.textContent = mode === 'bar' ? 'Apunta al código de barras con buena luz y distancia.' : 'Apunta al QR o código de barras.';
    scannerModal.classList.add('show');
    if (!window.Html5Qrcode) {
      alert('No se pudo cargar la librería del escáner. Revisa tu conexión.');
      return;
    }
    if (html5QrScanner){ await stopScanner(); scannerModal.classList.add('show'); }
    html5QrScanner = new Html5Qrcode('scannerReader');
    const formats = mode === 'bar'
      ? [ Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E, Html5QrcodeSupportedFormats.ITF ]
      : [ Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8, Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E ];
    try{
      const cameras = await Html5Qrcode.getCameras();
      const cameraId = (cameras.find(c => /back|rear|trasera/i.test(c.label || '')) || cameras[0] || {}).id;
      if (!cameraId) throw new Error('No se detectó cámara.');
      await html5QrScanner.start(
        cameraId,
        { fps: 12, qrbox: { width: 260, height: 180 }, formatsToSupport: formats, aspectRatio: 1.777 },
        (decodedText) => {
          searchInput.value = decodedText;
          filterProducts();
          const exact = appState.products.find(p => [p.sku,p.barras,p.rack,p.ubicacion].some(v => String(v||'').toLowerCase() === String(decodedText).toLowerCase()));
          if (exact) selectProduct(exact);
          stopScanner();
        },
        () => {}
      );
      scannerRunning = true;
    } catch(err){
      console.error(err);
      alert('No se pudo iniciar el escáner. Asegúrate de estar en localhost o https y de dar permiso a la cámara.');
      stopScanner();
    }
  }


  function syncAuthModeUi(){
    const mode = authMode?.value || 'login';
    const role = authRole?.value || 'admin';
    if(authCompanyWrap) authCompanyWrap.style.display = mode === 'register' && role !== 'viewer' ? '' : 'none';
    if(authCompanyCodeWrap) authCompanyCodeWrap.style.display = mode === 'register' && role === 'viewer' ? '' : 'none';
    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    if(title) title.textContent = mode === 'register' ? 'Crear cuenta' : 'Iniciar sesión';
    if(subtitle) subtitle.textContent = mode === 'register'
      ? (role === 'viewer' ? 'Crea un acceso viewer separado del administrador usando el código de empresa.' : 'Crea una cuenta administradora para gestionar sucursales, racks y layouts persistentes.')
      : (role === 'viewer' ? 'Ingresa como viewer para consultar productos y ubicaciones sin editar.' : 'Ingresa como administrador para gestionar cambios y guardados persistentes.');
    if(btnDoLogin){ const nextLabel = mode === 'register' ? 'Crear e ingresar' : 'Ingresar'; btnDoLogin.dataset.label = nextLabel; if(!authBusy) btnDoLogin.textContent = nextLabel; }
    if(btnToggleAuthMode) btnToggleAuthMode.textContent = mode === 'register' ? 'Ya tengo cuenta' : 'Crear cuenta';
    document.querySelectorAll('.auth-segment-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    document.querySelectorAll('.auth-role-card').forEach(btn => btn.classList.toggle('active', btn.dataset.role === role));
  }

  function setAuthMode(mode){
    if(authMode) authMode.value = mode === 'register' ? 'register' : 'login';
    syncAuthModeUi();
  }

  function setAuthRole(role){
    if(authRole) authRole.value = role === 'viewer' ? 'viewer' : 'admin';
    syncAuthModeUi();
  }

  function openAuthModal(message=''){
    if(!authModal) return;
    authModal.classList.add('show');
    authModal.style.display = 'flex';
    document.body.classList.add('auth-open');
    if(authStatus) authStatus.textContent = message || '';
    if(loginPassword) loginPassword.value = '';
    if(authMode && !authMode.value) authMode.value = 'login';
    if(authRole && !authRole.value) authRole.value = 'admin';
    syncAuthModeUi();
    setTimeout(()=>{ if(loginPassword) loginPassword.focus(); }, 20);
  }

  function closeAuthModal(force=false){
    if(!authModal) return;
    if(!force && !appState.auth?.loggedIn && !appState.auth?.viewerGuest) return;
    authModal.classList.remove('show');
    authModal.style.display = 'none';
    document.body.classList.remove('auth-open');
    if(authStatus) authStatus.textContent = '';
    setAuthPending(false);
  }

  function updateAuthUi(){
    if(!btnAuthAction) return;
    if(appState.auth?.loggedIn){
      btnAuthAction.textContent = `Salir · ${appState.auth.user || 'admin'}${appState.auth.role ? ' ('+appState.auth.role+')' : ''}`;
      btnAuthAction.classList.add('active');
    }else{
      btnAuthAction.textContent = 'Iniciar sesión';
      btnAuthAction.classList.remove('active');
    }
  }

  function applyRoleUi(){
    const isViewer = String(appState.auth?.role || '') === 'viewer' || !!appState.auth?.viewerGuest;
    document.body.classList.toggle('role-viewer', isViewer);
    document.querySelectorAll('[data-admin-only="1"]').forEach(el=>{ el.style.display = isViewer ? 'none' : ''; });
    if(isViewer && appState.screen !== 'viewer'){ appState.screen = 'viewer'; setActiveMenu && setActiveMenu('viewer'); }
  }

  function isLocalRuntimeForAuth(){
    try{
      const host = String(window.location.hostname || '').toLowerCase();
      return host === 'localhost' || host === '127.0.0.1' || host === '' || String(window.location.port || '') === '5500' || window.location.protocol === 'file:';
    }catch(_err){ return false; }
  }

  function wait(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

  let authBusy = false;
  function setAuthPending(pending, message=''){
    authBusy = !!pending;
    if(btnDoLogin){
      btnDoLogin.disabled = !!pending;
      btnDoLogin.dataset.label = btnDoLogin.dataset.label || btnDoLogin.textContent || 'Ingresar';
      btnDoLogin.textContent = pending ? 'Ingresando…' : (btnDoLogin.dataset.label || btnDoLogin.textContent || 'Ingresar');
      btnDoLogin.classList.toggle('is-loading', !!pending);
    }
    if(btnContinueViewer){
      btnContinueViewer.disabled = !!pending;
      btnContinueViewer.classList.toggle('is-loading', !!pending);
    }
    if(loginUsername) loginUsername.disabled = !!pending;
    if(loginPassword) loginPassword.disabled = !!pending;
    if(authMode) authMode.disabled = !!pending;
    if(authRole) authRole.disabled = !!pending;
    document.querySelectorAll('.auth-role-card,.auth-segment-btn').forEach(el=>{
      el.classList.toggle('disabled', !!pending);
      el.style.pointerEvents = pending ? 'none' : '';
      el.setAttribute('aria-disabled', pending ? 'true' : 'false');
    });
    if(authStatus && pending) authStatus.textContent = message || 'Validando acceso…';
  }

  async function fetchSessionWithRetry(maxAttempts=5){
    let lastStatus = 0;
    let lastErr = null;
    for(let i=0;i<maxAttempts;i++){
      try{
        const res = await fetch('/api/session', { credentials:'include', cache:'no-store' });
        lastStatus = Number(res.status || 0);
        if(res.ok){
          const data = await res.json();
          return { ok:true, data };
        }
        if(res.status === 401){
          return { ok:false, unauthorized:true, status:401 };
        }
        if(res.status >= 500 && i < maxAttempts - 1){
          await wait(450 + (i*300));
          continue;
        }
        return { ok:false, status:lastStatus };
      }catch(err){
        lastErr = err;
        if(i < maxAttempts - 1){
          await wait(450 + (i*300));
          continue;
        }
      }
    }
    return { ok:false, status:lastStatus, error:lastErr };
  }

  async function checkSession(){
    if(isLocalRuntimeForAuth()){
      appState.auth = { loggedIn:false, user:'', role:'', company:'', companyCode:'', viewerGuest:false, localMode:true };
      updateAuthUi();
      applyRoleUi();
      return;
    }
    const outcome = await fetchSessionWithRetry(3);
    if(outcome.ok && outcome.data){
      const data = outcome.data;
      appState.auth = { loggedIn:true, user:data.user || 'admin', role:data.role || 'admin', company:data.company_name || '', companyCode:data.company_code || '', viewerGuest:false };
    }else if(outcome.unauthorized){
      // Un navegador compartido no debe conservar estructura, racks ni inventario de una sesión anterior.
      clearPrivateLocalCache();
      appState.admin = loadAdminState();
      appState.branchLayouts = {};
      appState.models = [
        { id:'std_4', name:'Rack estándar 4 niveles', levels:4, slots:2, width:120, depth:40, height:240, clearance:0, style:'metallic' },
        { id:'wide_5', name:'Rack ancho 5 niveles', levels:5, slots:2, width:120, depth:40, height:240, clearance:0, style:'wide' },
        { id:'compact_3', name:'Rack compacto 3 niveles', levels:3, slots:2, width:120, depth:40, height:240, clearance:0, style:'melamine' },
        { id:'under_stairs', name:'Mueble bajo escalera', levels:4, slots:1, width:180, depth:45, height:240, leftHeight:240, rightHeight:70, topLength:60, mirrored:false, clearance:0, style:'under_stairs', levelHeights:[60,60,60,60], levelSlots:[1,1,1,1] },
        { id:'under_stairs_reflected', name:'Mueble bajo escalera reflejado', levels:4, slots:1, width:180, depth:45, height:240, leftHeight:240, rightHeight:70, topLength:60, mirrored:true, clearance:0, style:'under_stairs_reflected', levelHeights:[60,60,60,60], levelSlots:[1,1,1,1] }
      ];
      ensureBranchLayouts();
      loadLayoutForBranch(0);
      setProductDataset([]);
      appState.filtered = [];
      appState.auth = { loggedIn:false, user:'', role:'', company:'', companyCode:'', viewerGuest:false };
    }else{
      console.warn('Sesión temporalmente no disponible; se conserva el estado actual.', outcome.status || outcome.error || 'sin-detalle');
      if(!appState.auth?.loggedIn){
        appState.auth = { loggedIn:false, user:'', role:'', company:'', companyCode:'', viewerGuest:false, transientUnavailable:true };
      }
    }
    updateAuthUi();
    applyRoleUi();
  }

  function getViewerTokenFromUrl(){
    try{
      const path = String(window.location.pathname || '');
      const m = path.match(/^\/viewer\/([^/?#]+)/i);
      if(m && m[1]) return decodeURIComponent(m[1]);
      const qs = new URLSearchParams(window.location.search || '');
      return String(qs.get('viewerToken') || qs.get('token') || '').trim();
    }catch(_err){
      return '';
    }
  }

  async function loadViewerLinkState(token){
    const safeToken = String(token || '').trim();
    if(!safeToken) return false;
    const data = await httpJson(`/api/view-links/${encodeURIComponent(safeToken)}`);
    const branch = data?.branch || {};
    const layoutPayload = data?.layout || {};
    const sheet = data?.sheet || {};
    const imported = Array.isArray(sheet.imported_products) ? sheet.imported_products.slice(0,50000) : [];
    const viewerBranch = {
      id: Number(branch.id || 1),
      name: String(branch.name || 'Sucursal'),
      type: String(branch.type || 'tienda'),
      color: (appState.admin?.branches?.[0]?.color) || '#ffd84d',
      warehouses: Array.isArray(branch.warehouses_json) ? branch.warehouses_json : (Array.isArray(branch.warehouses) ? branch.warehouses : ['Almacén principal']),
      sheetUrl: String(sheet.sheet_id || ''),
      sheetName: String(sheet.sheet_name || 'Productos'),
      sheetConnected: imported.length > 0,
      lastSheetCount: Number(sheet.last_sheet_count || imported.length || 0),
      sheetMapRows: Array.isArray(sheet.sheet_map_rows) ? sheet.sheet_map_rows : defaultSheetMapRows(),
      sheetHeaders: Array.isArray(sheet.sheet_headers) ? sheet.sheet_headers : [],
      sheetHeaderIndex: Number(sheet.sheet_header_index || 0),
      sheetPreviewProducts: imported,
      sheetStatusText: imported.length ? `Importados: ${imported.length.toLocaleString('es-PE')}` : 'Sin productos importados'
    };
    appState.admin.branches = [viewerBranch];
    appState.admin.activeBranch = 0;
    appState.activeBranchIndex = 0;
    appState.layout = layoutPayload.layout || defaultLayout();
    if(appState.editor) appState.editor.viewBox = layoutPayload.viewBox || { x:0, y:0, w:900, h:620 };
    setProductDataset(imported);
    appState.filtered = appState.products.slice();
    appState.auth = { loggedIn:false, user:'', role:'viewer', company:'', companyCode:'', viewerGuest:true };
    return true;
  }

  function continueAsViewer(){
    if(authBusy) return;
    if(appState.ui) appState.ui.pendingScreenAfterLogin = '';
    appState.auth = { loggedIn:false, user:'', role:'viewer', company:'', companyCode:'', viewerGuest:true };
    updateAuthUi();
    applyRoleUi();
    setScreen('viewer');
    closeAuthModal(true);
  }

  async function doLogin(){
    if(authBusy) return false;
    const username = String(loginUsername?.value || '').trim();
    const password = String(loginPassword?.value || '');
    const mode = String(authMode?.value || 'login');
    const role = String(authRole?.value || 'admin');
    if(!username || !password){ if(authStatus) authStatus.textContent = 'Completa usuario y contraseña.'; return false; }
    setAuthPending(true, mode === 'register' ? 'Creando acceso…' : 'Ingresando…');
    try{
      if(isLocalRuntimeForAuth()){
        // El modo Live Server es solo una simulación local: no contiene credenciales embebidas.
        appState.auth = { loggedIn:true, user:username || 'local', role:role || 'admin', company:getAdminCompanyName ? getAdminCompanyName() : 'WMS Local', companyCode:'LOCAL', viewerGuest:false, localMode:true };
        updateAuthUi();
        applyRoleUi();
        const targetScreen = String(appState.ui?.pendingScreenAfterLogin || '').trim() || (appState.auth?.role === 'viewer' ? 'viewer' : 'admin');
        if(appState.ui) appState.ui.pendingScreenAfterLogin = '';
        closeAuthModal(true);
        setScreen(targetScreen);
        showToast('Modo local activo para Live Server.', 'success', 2200);
        return true;
      }
      const payload = { username, password };
      let endpoint = '/api/login';
      if(mode === 'register'){
        endpoint = '/api/register';
        payload.mode = role;
        payload.companyName = String(authCompanyName?.value || '').trim();
        payload.companyCode = String(authCompanyCode?.value || '').trim();
      }
      const res = await fetch(endpoint, { method:'POST', credentials:'include', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(()=>({}));
      if(!res.ok || !data.ok) throw new Error(data.error || 'No se pudo iniciar sesión');

      appState.auth = { loggedIn:true, user:data.user || username, role:data.role || 'admin', company:data.company_name || '', companyCode:data.company_code || '', viewerGuest:false };
      updateAuthUi();
      applyRoleUi();

      const targetScreen = String(appState.ui?.pendingScreenAfterLogin || '').trim() || (appState.auth?.role === 'viewer' ? 'viewer' : 'admin');
      if(appState.ui) appState.ui.pendingScreenAfterLogin = '';
      closeAuthModal(true);
      setScreen(targetScreen);

      Promise.allSettled([loadRemoteAppState(), loadAllBranchSheetConfigsFromServer()]).then(() => {
        try{
          ensureProductPagerUi();
          ensureProductFilterBar();
          syncProductFilterUi();
          renderCurrentScreen();
        }catch(_err){}
      });
      return true;
    }catch(err){
      const msg = err.message || 'Error al iniciar sesión';
      if(authStatus) authStatus.textContent = msg;
      if(/network|fetch|servidor|disponible|timeout/i.test(String(msg))) showToast(msg, 'error', 3200);
      return false;
    }finally{
      setAuthPending(false);
    }
  }

  function clearPrivateLocalCache(){
    try{
      const removable = [];
      for(let i=0;i<localStorage.length;i+=1){
        const key = localStorage.key(i);
        if(!key) continue;
        if(
          key === 'wms_admin_cfg_v2' ||
          key === 'wms_branch_layouts_v2' ||
          key === 'wms_rack_models_v3' ||
          key === 'wms_products_v2' ||
          key.startsWith('wms_products_branch_') ||
          key.startsWith('wms_products_branch_v2_')
        ) removable.push(key);
      }
      removable.forEach(key=>localStorage.removeItem(key));
    }catch(_err){}
  }

  async function doLogout(){
    try{ await fetch('/api/logout', { method:'POST', credentials:'include' }); }catch(_err){}
    clearPrivateLocalCache();
    setProductDataset([]);
    appState.filtered = [];
    appState.selectedProduct = null;
    appState.auth = { loggedIn:false, user:'', role:'', company:'', companyCode:'', viewerGuest:false };
    updateAuthUi();
    applyRoleUi();
    openAuthModal('');
    showToast('Sesión cerrada.', 'success', 1800);
  }

  function renderCurrentScreen(){
    if(appState.screen === 'admin') return renderAdminScreen();
    if(appState.screen === 'viewer') return renderMapView();
    if(appState.screen === 'products') { appState.screen = 'viewer'; setActiveMenu && setActiveMenu('viewer'); return renderMapView(); }
    setUnifiedMapLayout(false);
    if(appState.screen === 'sheet') (typeof renderSheetScreen==='function'?renderSheetScreen():renderMapView());
    else if(isLayoutWorkspaceScreen()) renderLayoutEditor();
    else if(appState.screen === 'virtual') renderVirtualSpace();
    else if(appState.screen === 'racks') renderRackModels();
    else if(appState.screen === 'rack-builder') renderRackConstructionWorkspace();
  }

  function applyUiTheme(theme){
    const next = theme === 'light' ? 'light' : 'dark';
    document.body.classList.toggle('theme-light', next === 'light');
    document.body.classList.toggle('theme-dark', next === 'dark');
    try{ localStorage.setItem('wms_ui_theme', next); }catch{}
    const toggleThemeCheckbox = document.getElementById('toggleThemeCheckbox');
    if(toggleThemeCheckbox) toggleThemeCheckbox.checked = next === 'light';
  }

  function loadUiTheme(){
    let theme = 'dark';
    try{ theme = localStorage.getItem('wms_ui_theme') || 'dark'; }catch{}
    applyUiTheme(theme);
  }

  const toggleThemeCheckbox = document.getElementById('toggleThemeCheckbox');
  if(toggleThemeCheckbox) toggleThemeCheckbox.addEventListener('change', (e) => {
    applyUiTheme(e.target.checked ? 'light' : 'dark');
  });

  // V54 - Picking por lista de SKUs / códigos
  function ensurePickingUi(){
    if(!document.getElementById('btnOpenPicking')){
      const searchbar = document.querySelector('.searchbar');
      const before = document.getElementById('btnScanCode');
      const btn = document.createElement('button');
      btn.className = 'action-btn picking-launch-btn';
      btn.id = 'btnOpenPicking';
      btn.type = 'button';
      btn.textContent = 'Picking';
      if(searchbar) searchbar.insertBefore(btn, before || null);
      btn.addEventListener('click', openPickingModal);
    }
    const adminMenu = document.querySelector('.menu-section .menu-items');
    if(adminMenu && !document.getElementById('menuPickingBtn')){
      const item = document.createElement('div');
      item.className = 'menu-item';
      item.id = 'menuPickingBtn';
      item.innerHTML = '🧾 <span>Picking</span>';
      item.addEventListener('click', (e)=>{ e.preventDefault(); openPickingModal(); });
      adminMenu.appendChild(item);
    }
  }

  function normalizePickingToken(value){
    return norm(String(value || '').replace(/[^a-zA-Z0-9ñÑáéíóúÁÉÍÓÚüÜ_-]+/g,' ').trim());
  }

  function splitPickingInput(raw){
    return String(raw || '')
      .split(/[\n,;\t]+/)
      .map(x => x.trim())
      .filter(Boolean)
      .map((token, index) => ({ token, key:normalizePickingToken(token), index:index + 1 }));
  }

  function productPickingKeys(product){
    const sku = normalizePickingToken(product?.sku || '');
    const barras = normalizePickingToken(product?.barras || product?.barcode || '');
    const nombre = normalizePickingToken(product?.nombre || product?.name || '');
    const variante = normalizePickingToken(product?.variante || '');
    const color = normalizePickingToken(getProductColorValue(product));
    const talla = normalizePickingToken(getProductSizeValue(product));
    return { sku, barras, nombre, variante, color, talla, joined:[sku,barras,nombre,variante,color,talla].filter(Boolean).join(' ') };
  }

  function findPickingProduct(tokenObj, indexMaps){
    if(!tokenObj?.key) return null;
    const key = tokenObj.key;
    if(indexMaps.bySku.has(key)) return { product:indexMaps.bySku.get(key), match:'SKU exacto' };
    if(indexMaps.byBar.has(key)) return { product:indexMaps.byBar.get(key), match:'Barras exacto' };
    if(indexMaps.byLocation.has(key)) return { product:indexMaps.byLocation.get(key), match:'Ubicación exacta' };
    const partial = indexMaps.products.find(p => {
      const k = p.__pickKeys;
      return k?.sku?.includes(key) || k?.barras?.includes(key) || k?.nombre?.includes(key) || k?.joined?.includes(key);
    });
    return partial ? { product:partial, match:'Coincidencia parcial' } : null;
  }

  function buildPickingIndex(products){
    const bySku = new Map(), byBar = new Map(), byLocation = new Map();
    const list = (products || []).map(p => ({ ...p, __pickKeys:productPickingKeys(p) }));
    list.forEach(p => {
      if(p.__pickKeys.sku && !bySku.has(p.__pickKeys.sku)) bySku.set(p.__pickKeys.sku, p);
      if(p.__pickKeys.barras && !byBar.has(p.__pickKeys.barras)) byBar.set(p.__pickKeys.barras, p);
      const locKey = normalizePickingToken(p.ubicacion || p.almacen || '');
      if(locKey && !byLocation.has(locKey)) byLocation.set(locKey, p);
    });
    return { products:list, bySku, byBar, byLocation };
  }

  function getPickingSortInfo(product){
    const parsed = parseLocationCode(product?.ubicacion || product?.almacen || '', product?.rack || product?.rackStore || 'Z1-E1');
    return { parsed, zone:parsed.zoneId || 'ZZ', est:Number(parsed.est || 999), level:Number(parsed.level || 999), slot:Number(parsed.slot || 999), rack:parsed.rackId || product?.rack || product?.rackStore || '' };
  }

  function analyzePickingInput(raw){
    const tokens = splitPickingInput(raw);
    const products = Array.isArray(appState.filtered) && appState.filtered.length ? appState.filtered : (appState.products || []);
    const indexMaps = buildPickingIndex(products);
    const rows = tokens.map(tokenObj => {
      const hit = findPickingProduct(tokenObj, indexMaps);
      if(!hit) return { ...tokenObj, found:false, product:null, match:'No encontrado', sort:{ zone:'ZZZ', est:999, level:999, slot:999, rack:'' } };
      const sort = getPickingSortInfo(hit.product);
      return { ...tokenObj, found:true, product:hit.product, match:hit.match, sort };
    });
    rows.sort((a,b) => {
      if(a.found !== b.found) return a.found ? -1 : 1;
      return String(a.sort.zone).localeCompare(String(b.sort.zone),'es',{numeric:true}) || a.sort.est-b.sort.est || a.sort.level-b.sort.level || a.sort.slot-b.sort.slot || a.index-b.index;
    });
    return rows;
  }

  function pickingCsv(rows){
    const header = ['orden','buscado','estado','sku','nombre','variante','ubicacion','almacen','rack','nivel','slot','match'];
    const esc = v => '"' + String(v ?? '').replace(/"/g,'""') + '"';
    const lines = [header.join(',')];
    rows.forEach((r,i)=>{
      const p = r.product || {};
      lines.push([
        i+1, r.token, r.found ? 'ENCONTRADO' : 'NO ENCONTRADO', p.sku, p.nombre, p.variante, p.ubicacion, p.almacen,
        r.sort?.rack || p.rack || p.rackStore || '', r.sort?.parsed?.level || '', r.sort?.parsed?.slot || '', r.match
      ].map(esc).join(','));
    });
    return lines.join('\n');
  }

  function downloadPickingCsv(rows){
    const csv = pickingCsv(rows);
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `picking_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 700);
  }

  function renderPickingResults(modal, rows){
    const host = modal.querySelector('#pickingResults');
    const stats = modal.querySelector('#pickingStats');
    const found = rows.filter(r=>r.found).length;
    const missing = rows.length - found;
    const zones = Array.from(new Set(rows.filter(r=>r.found).map(r=>r.sort.zone).filter(Boolean)));
    stats.innerHTML = `
      <div class="picking-stat"><b>${rows.length}</b><span>Total</span></div>
      <div class="picking-stat success"><b>${found}</b><span>Encontrados</span></div>
      <div class="picking-stat danger"><b>${missing}</b><span>Faltantes</span></div>
      <div class="picking-stat"><b>${zones.length}</b><span>Zonas</span></div>`;
    if(!rows.length){
      host.innerHTML = '<div class="empty picking-empty">Pega una lista de SKUs, códigos de barras o nombres para generar el recorrido.</div>';
      return;
    }
    host.innerHTML = rows.map((r,i)=>{
      const p = r.product || {};
      const img = r.found ? (getProductImageUrls(p)[0] || '') : '';
      const loc = p.ubicacion || p.almacen || '—';
      const zoneBadge = r.found ? `${escapeHtml(r.sort.zone)} · ${escapeHtml(r.sort.rack || '')} · N${escapeHtml(r.sort.parsed?.level || '')}-S${escapeHtml(r.sort.parsed?.slot || '')}` : 'Sin coincidencia';
      return `<article class="picking-row ${r.found ? 'is-found' : 'is-missing'}" data-pick-row="${i}">
        <div class="picking-order">${i+1}</div>
        <div class="picking-thumb ${img ? '' : 'empty'}">${img ? `<img src="${escapeHtml(img)}" alt="">` : '—'}</div>
        <div class="picking-main">
          <div class="picking-title">${escapeHtml(p.nombre || r.token)}</div>
          <div class="picking-sub">${escapeHtml(p.sku || r.token)} ${p.variante ? '· '+escapeHtml(p.variante) : ''}</div>
          <div class="picking-badges"><span>${escapeHtml(zoneBadge)}</span><span>${escapeHtml(r.match)}</span></div>
        </div>
        <div class="picking-loc"><small>Ubicación</small><b>${escapeHtml(loc)}</b></div>
        <div class="picking-actions">
          ${r.found ? `<button class="mini-btn" data-pick-action="select" data-index="${i}">Seleccionar</button><button class="mini-btn" data-pick-action="loc" data-index="${i}">Ver ubicación</button><button class="mini-btn" data-pick-action="copy" data-index="${i}">Copiar</button>` : `<span class="picking-missing">Revisar Sheet</span>`}
        </div>
      </article>`;
    }).join('');
    host.querySelectorAll('[data-pick-action]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const r = rows[Number(btn.dataset.index)];
        if(!r?.product) return;
        if(btn.dataset.pickAction === 'select'){
          selectProduct(r.product);
          showToast('Producto seleccionado en el viewer.', 'success');
        }
        if(btn.dataset.pickAction === 'loc'){
          selectProduct(r.product);
          openProductLocationModal(r.product);
        }
        if(btn.dataset.pickAction === 'copy'){
          navigator.clipboard?.writeText(r.product.ubicacion || r.product.almacen || '');
          showToast('Ubicación copiada.', 'success');
        }
      });
    });
  }

  function openPickingModal(){
    ensureAppRuntimeState();
    let modal = document.getElementById('pickingModal');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'pickingModal';
      modal.className = 'modal picking-modal';
      modal.innerHTML = `<div class="modal-card picking-card">
        <button class="modal-close" id="btnClosePicking" type="button">✕</button>
        <div class="modal-head picking-head">
          <div>
            <h2>Picking por lista de SKUs</h2>
            <p>Pega SKUs, códigos de barras o nombres. La app los ordena por zona, rack, nivel y slot para armar un recorrido operativo.</p>
          </div>
          <div class="picking-head-actions">
            <button class="action-btn" id="btnAnalyzePicking" type="button">Generar recorrido</button>
            <button class="seg-btn" id="btnExportPicking" type="button">Exportar CSV</button>
          </div>
        </div>
        <div class="picking-context" id="pickingContext"></div>
        <textarea id="pickingInput" class="picking-input" placeholder="Ejemplo:\nSKU-001\n7894561230001\nProducto color negro talla M"></textarea>
        <div class="picking-stats" id="pickingStats"></div>
        <div class="picking-results" id="pickingResults"></div>
      </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', e=>{ if(e.target === modal) modal.classList.remove('show'); });
      modal.querySelector('#btnClosePicking').addEventListener('click', ()=>modal.classList.remove('show'));
    }
    const branch = (appState.admin?.branches || [])[getActiveBranchIndex?.() ?? appState.activeBranchIndex] || {};
    modal.querySelector('#pickingContext').innerHTML = `<span>Sucursal: <b>${escapeHtml(branch.name || 'Actual')}</b></span><span>Productos cargados: <b>${Number((appState.products || []).length).toLocaleString('es-PE')}</b></span><span>Orden: <b>Zona → Rack → Nivel → Slot</b></span>`;
    let currentRows = [];
    const input = modal.querySelector('#pickingInput');
    const analyze = () => { currentRows = analyzePickingInput(input.value); renderPickingResults(modal, currentRows); };
    modal.querySelector('#btnAnalyzePicking').onclick = analyze;
    modal.querySelector('#btnExportPicking').onclick = () => currentRows.length ? downloadPickingCsv(currentRows) : showToast('Primero genera un recorrido.', 'warn');
    input.onkeydown = e => { if((e.ctrlKey || e.metaKey) && e.key === 'Enter'){ e.preventDefault(); analyze(); } };
    renderPickingResults(modal, currentRows);
    modal.classList.add('show');
    setTimeout(()=>input.focus(), 80);
  }

  ensurePickingUi();


  // V55 - Reposición / Restock operativo
  function ensureRestockUi(){
    if(!document.getElementById('btnOpenRestock')){
      const anchor = document.getElementById('btnOpenPicking') || document.querySelector('.search-action-bar .action-btn, .viewer-toolbar .action-btn, .viewer-actions .action-btn');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'action-btn restock-launch-btn';
      btn.id = 'btnOpenRestock';
      btn.textContent = 'Reposición';
      btn.title = 'Ver productos con cantidad de restock y generar ruta de reposición';
      btn.addEventListener('click', openRestockModal);
      if(anchor?.parentNode) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
      else document.body.appendChild(btn);
    }
    const adminMenu = document.querySelector('.sidebar-menu, .menu-list, nav');
    if(adminMenu && !document.getElementById('menuRestockBtn')){
      const item = document.createElement('a');
      item.href = '#';
      item.id = 'menuRestockBtn';
      item.className = 'menu-item restock-menu-item';
      item.innerHTML = '📦 <span>Reposición</span>';
      item.addEventListener('click', (e)=>{ e.preventDefault(); openRestockModal(); });
      const pickItem = document.getElementById('menuPickingBtn');
      if(pickItem?.parentNode) pickItem.parentNode.insertBefore(item, pickItem.nextSibling);
      else adminMenu.appendChild(item);
    }
  }

  function parseRestockNumber(value){
    if(value == null) return 0;
    const raw = String(value).trim();
    if(!raw) return 0;
    const cleaned = raw.replace(/[^0-9,.-]/g,'').replace(/,/g,'.');
    const n = Number.parseFloat(cleaned);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  function getRestockValue(product){
    if(!product) return 0;
    const direct = parseRestockNumber(product.restock ?? product.cantRestock ?? product.cantidad_restock ?? product.cant_restock);
    if(direct > 0) return direct;
    const headers = ['Cant. Restock','Cant Restock','Cantidad Restock','Restock','Cant. restock','cant restock'];
    for(const h of headers){
      try{
        const v = typeof productHeaderValue === 'function' ? productHeaderValue(product, h) : '';
        const n = parseRestockNumber(v);
        if(n > 0) return n;
      }catch(_err){}
    }
    const raw = product._raw && typeof product._raw === 'object' ? product._raw : {};
    for(const [k,v] of Object.entries(raw)){
      const key = String(k || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      if((key.includes('restock') || (key.includes('cant') && key.includes('stock'))) && !key.includes('precio')){
        const n = parseRestockNumber(v);
        if(n > 0) return n;
      }
    }
    return 0;
  }

  function getRestockKey(product){
    return normalizePickingToken?.(product?.sku || product?.barras || `${product?.nombre || ''}-${product?.ubicacion || ''}-${product?.almacen || ''}`) || String(product?.sku || product?.nombre || Math.random());
  }

  function ensureRestockState(){
    ensureAppRuntimeState();
    if(!appState.ui) appState.ui = {};
    if(!appState.ui.restockReviewed || typeof appState.ui.restockReviewed !== 'object') appState.ui.restockReviewed = {};
    if(!appState.ui.restockFilters || typeof appState.ui.restockFilters !== 'object') appState.ui.restockFilters = { search:'', pendingOnly:false, group:'zone' };
  }

  function getRestockRows(){
    ensureRestockState();
    const base = Array.isArray(appState.filtered) && appState.filtered.length ? appState.filtered : (appState.products || []);
    const rows = base.map(product => {
      const qty = getRestockValue(product);
      if(qty <= 0) return null;
      const sort = getPickingSortInfo(product);
      const key = getRestockKey(product);
      return { product, qty, key, reviewed: !!appState.ui.restockReviewed[key], sort };
    }).filter(Boolean);
    rows.sort((a,b) => String(a.sort.zone).localeCompare(String(b.sort.zone),'es',{numeric:true}) || a.sort.est-b.sort.est || a.sort.level-b.sort.level || a.sort.slot-b.sort.slot || String(a.product?.sku||'').localeCompare(String(b.product?.sku||''),'es',{numeric:true}));
    return rows;
  }

  function filterRestockRows(rows, modal){
    ensureRestockState();
    const q = normalizePickingToken?.(modal?.querySelector('#restockSearch')?.value || appState.ui.restockFilters.search || '') || '';
    const pendingOnly = !!modal?.querySelector('#restockPendingOnly')?.checked;
    appState.ui.restockFilters.search = q;
    appState.ui.restockFilters.pendingOnly = pendingOnly;
    return (rows || []).filter(r => {
      if(pendingOnly && r.reviewed) return false;
      if(!q) return true;
      const p = r.product || {};
      const hay = [p.sku,p.barras,p.nombre,p.variante,p.color,p.talla,p.ubicacion,p.almacen,r.sort.zone,r.sort.rack].map(v => normalizePickingToken?.(v || '') || '').join(' ');
      return hay.includes(q);
    });
  }

  function restockCsv(rows){
    const header = ['orden','estado','cantidad_restock','sku','barras','nombre','variante','ubicacion','almacen','zona','rack','nivel','slot'];
    const esc = v => '"' + String(v ?? '').replace(/"/g,'""') + '"';
    const lines = [header.join(',')];
    rows.forEach((r,i)=>{
      const p = r.product || {};
      lines.push([i+1, r.reviewed ? 'REVISADO' : 'PENDIENTE', r.qty, p.sku, p.barras, p.nombre, p.variante, p.ubicacion, p.almacen, r.sort.zone, r.sort.rack, r.sort.parsed?.level || '', r.sort.parsed?.slot || ''].map(esc).join(','));
    });
    return lines.join('\n');
  }

  function downloadRestockCsv(rows){
    const csv = restockCsv(rows);
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reposicion_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 700);
  }

  function renderRestockResults(modal){
    const allRows = getRestockRows();
    const rows = filterRestockRows(allRows, modal);
    const stats = modal.querySelector('#restockStats');
    const host = modal.querySelector('#restockResults');
    const totalQty = rows.reduce((s,r)=>s + Number(r.qty || 0),0);
    const pending = rows.filter(r=>!r.reviewed).length;
    const reviewed = rows.length - pending;
    const zones = Array.from(new Set(rows.map(r=>r.sort.zone).filter(Boolean)));
    const racks = Array.from(new Set(rows.map(r=>r.sort.rack).filter(Boolean)));
    stats.innerHTML = `
      <div class="picking-stat restock-stat"><b>${rows.length}</b><span>Productos</span></div>
      <div class="picking-stat restock-stat success"><b>${Number(totalQty).toLocaleString('es-PE')}</b><span>Und. por reponer</span></div>
      <div class="picking-stat restock-stat danger"><b>${pending}</b><span>Pendientes</span></div>
      <div class="picking-stat restock-stat"><b>${zones.length}</b><span>Zonas · ${racks.length} racks</span></div>`;
    modal.__restockRows = rows;
    if(!rows.length){
      host.innerHTML = '<div class="empty picking-empty">No hay productos con Cant. Restock mayor a 0 en el filtro actual.</div>';
      return;
    }
    const groupMode = modal.querySelector('#restockGroupMode')?.value || 'zone';
    let lastGroup = '';
    host.innerHTML = rows.map((r,i)=>{
      const p = r.product || {};
      const img = getProductImageUrls(p)[0] || '';
      const loc = p.ubicacion || p.almacen || '—';
      const group = groupMode === 'rack' ? (r.sort.rack || 'Sin rack') : (r.sort.zone || 'Sin zona');
      const heading = group !== lastGroup ? `<div class="restock-group-title">${escapeHtml(groupMode === 'rack' ? 'Rack ' : 'Zona ')}${escapeHtml(group)}</div>` : '';
      lastGroup = group;
      const place = `${escapeHtml(r.sort.zone)} · ${escapeHtml(r.sort.rack || '')} · N${escapeHtml(r.sort.parsed?.level || '')}-S${escapeHtml(r.sort.parsed?.slot || '')}`;
      return `${heading}<article class="picking-row restock-row ${r.reviewed ? 'is-reviewed' : 'is-pending'}" data-restock-row="${i}">
        <div class="picking-order restock-qty">${escapeHtml(r.qty)}</div>
        <div class="picking-thumb ${img ? '' : 'empty'}">${img ? `<img src="${escapeHtml(img)}" alt="">` : '—'}</div>
        <div class="picking-main">
          <div class="picking-title">${escapeHtml(p.nombre || 'Sin nombre')}</div>
          <div class="picking-sub">${escapeHtml(p.sku || 'Sin SKU')} ${p.variante ? '· '+escapeHtml(p.variante) : ''}</div>
          <div class="picking-badges"><span>${place}</span><span>${r.reviewed ? 'Revisado' : 'Pendiente'}</span></div>
        </div>
        <div class="picking-loc"><small>Ubicación</small><b>${escapeHtml(loc)}</b></div>
        <div class="picking-actions">
          <button class="mini-btn" data-restock-action="review" data-index="${i}">${r.reviewed ? 'Desmarcar' : 'Marcar revisado'}</button>
          <button class="mini-btn" data-restock-action="select" data-index="${i}">Seleccionar</button>
          <button class="mini-btn" data-restock-action="loc" data-index="${i}">Ver ubicación</button>
          <button class="mini-btn" data-restock-action="copy" data-index="${i}">Copiar</button>
        </div>
      </article>`;
    }).join('');
    host.querySelectorAll('[data-restock-action]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const r = rows[Number(btn.dataset.index)];
        if(!r?.product) return;
        const action = btn.dataset.restockAction;
        if(action === 'review'){
          appState.ui.restockReviewed[r.key] = !appState.ui.restockReviewed[r.key];
          try{ saveAdminState?.(); }catch(_err){}
          renderRestockResults(modal);
          showToast(appState.ui.restockReviewed[r.key] ? 'Producto marcado como revisado.' : 'Producto regresó a pendiente.', 'success');
          return;
        }
        if(action === 'select'){
          selectProduct(r.product);
          showToast('Producto seleccionado en el viewer.', 'success');
        }
        if(action === 'loc'){
          selectProduct(r.product);
          openProductLocationModal(r.product);
        }
        if(action === 'copy'){
          navigator.clipboard?.writeText(r.product.ubicacion || r.product.almacen || '');
          showToast('Ubicación copiada.', 'success');
        }
      });
    });
  }

  function openRestockModal(){
    ensureRestockState();
    let modal = document.getElementById('restockModal');
    if(!modal){
      modal = document.createElement('div');
      modal.id = 'restockModal';
      modal.className = 'modal picking-modal restock-modal';
      modal.innerHTML = `<div class="modal-card picking-card restock-card">
        <button class="modal-close" id="btnCloseRestock" type="button">✕</button>
        <div class="modal-head picking-head restock-head">
          <div>
            <h2>Reposición / Restock</h2>
            <p>Lista los productos con Cant. Restock mayor a 0, los ordena por zona, rack, nivel y slot, y permite marcar cada ítem como revisado.</p>
          </div>
          <div class="picking-head-actions">
            <button class="action-btn" id="btnRefreshRestock" type="button">Actualizar ruta</button>
            <button class="seg-btn" id="btnExportRestock" type="button">Exportar CSV</button>
          </div>
        </div>
        <div class="picking-context" id="restockContext"></div>
        <div class="restock-controls">
          <input id="restockSearch" class="restock-search" placeholder="Filtrar por SKU, nombre, color, talla, rack o ubicación">
          <select id="restockGroupMode" class="restock-select"><option value="zone">Agrupar por zona</option><option value="rack">Agrupar por rack</option></select>
          <label class="restock-check"><input id="restockPendingOnly" type="checkbox"> Solo pendientes</label>
        </div>
        <div class="picking-stats" id="restockStats"></div>
        <div class="picking-results restock-results" id="restockResults"></div>
      </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', e=>{ if(e.target === modal) modal.classList.remove('show'); });
      modal.querySelector('#btnCloseRestock').addEventListener('click', ()=>modal.classList.remove('show'));
      modal.querySelector('#restockSearch').addEventListener('input', debounce(()=>renderRestockResults(modal), 90));
      modal.querySelector('#restockGroupMode').addEventListener('change', ()=>renderRestockResults(modal));
      modal.querySelector('#restockPendingOnly').addEventListener('change', ()=>renderRestockResults(modal));
      modal.querySelector('#btnRefreshRestock').addEventListener('click', ()=>renderRestockResults(modal));
      modal.querySelector('#btnExportRestock').addEventListener('click', ()=>{
        const rows = modal.__restockRows || [];
        rows.length ? downloadRestockCsv(rows) : showToast('No hay productos para exportar.', 'warn');
      });
    }
    const branch = (appState.admin?.branches || [])[getActiveBranchIndex?.() ?? appState.activeBranchIndex] || {};
    modal.querySelector('#restockContext').innerHTML = `<span>Sucursal: <b>${escapeHtml(branch.name || 'Actual')}</b></span><span>Productos cargados: <b>${Number((appState.products || []).length).toLocaleString('es-PE')}</b></span><span>Fuente: <b>Cant. Restock</b></span><span>Orden: <b>Zona → Rack → Nivel → Slot</b></span>`;
    const input = modal.querySelector('#restockSearch');
    input.value = appState.ui.restockFilters.search || '';
    modal.querySelector('#restockPendingOnly').checked = !!appState.ui.restockFilters.pendingOnly;
    modal.querySelector('#restockGroupMode').value = appState.ui.restockFilters.group || 'zone';
    renderRestockResults(modal);
    modal.classList.add('show');
    setTimeout(()=>input.focus(), 80);
  }




  ensureRestockUi();


  toggleSidebar.addEventListener('click', () => {
    appRoot.classList.toggle('sidebar-collapsed');
    toggleSidebar.textContent = appRoot.classList.contains('sidebar-collapsed') ? '❯' : '❮';
    if(appState && appState.screen) setScreen(appState.screen);
  });

  let responsiveResizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(responsiveResizeTimer);
    responsiveResizeTimer = setTimeout(() => {
      if(appState && appState.screen) setScreen(appState.screen);
    }, 90);
  });
  menuItems.forEach(item => {
    if(item.dataset.screen === 'card'){ item.remove(); return; }
    item.onclick = (e) => { e.preventDefault(); e.stopPropagation(); setScreen(item.dataset.screen); return false; };
  });
  if(btnSearch) btnSearch.addEventListener('click', (e)=>{ e.preventDefault(); filterProducts(); });
  if(searchInput){
    searchInput.addEventListener('input', debounce(filterProducts, 260));
    searchInput.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); filterProducts(); } });
  }
  if($('#btnOpenCategoryPinterest')) { $('#btnOpenCategoryPinterest').addEventListener('click', openCategoryPinterestModal); updateCategoryFilterButton(); }
  if($('#toggleGroupProducts')) { $('#toggleGroupProducts').classList.add('active'); $('#toggleGroupProducts').textContent = 'Productos'; $('#toggleGroupProducts').onclick = () => { appState.ui.productGroupMode = true; renderProducts(appState.filtered && appState.filtered.length ? appState.filtered : appState.products); }; }
  if(btnScanCode) btnScanCode.addEventListener('click', () => openScanner('qr'));
  btnCloseScanner.addEventListener('click', stopScanner);
  btnStopScanner.addEventListener('click', stopScanner);
  scannerModal.addEventListener('click', (e) => { if (e.target === scannerModal) stopScanner(); });

