  function loadAdminState(){
    try{ const raw = localStorage.getItem('wms_admin_cfg_v2'); if(raw) return JSON.parse(raw); }catch{}
    const fallbackColor = '#ffd84d';
    return { company:'WMS Industrial', logo:'', branding:{ colors:['#6ff0a8','#1f8d68','#324d57','#d9b45e','#20323b'], activeColor:0 }, branches:[{name:'Sucursal principal', type:'tienda', color:fallbackColor, warehouses:['Almacén principal'], sheetUrl:'', sheetName:'Productos', sheetConnected:false, lastSheetCount:0, expanded:true}], activeBranch:0 };
  }
  function sanitizedAdminState(){
    const admin = clone(appState.admin || {});
    admin.branches = (admin.branches || []).map(b => ({
      ...b,
      sheetPreviewProducts: [],
      sheetHeaders: Array.isArray(b.sheetHeaders) ? b.sheetHeaders : [],
      sheetMapRows: Array.isArray(b.sheetMapRows) ? b.sheetMapRows : [],
      sheetMeta: {
        status: b?.sheetMeta?.status || '',
        lastHeadersReadAt: Number(b?.sheetMeta?.lastHeadersReadAt || 0),
        lastImportedAt: Number(b?.sheetMeta?.lastImportedAt || 0),
        productCount: Number(b?.sheetMeta?.productCount || 0),
        headerCount: Number(b?.sheetMeta?.headerCount || 0),
        error: b?.sheetMeta?.error || '',
        loadingMessage: b?.sheetMeta?.loadingMessage || ''
      }
    }));
    return admin;
  }
  function saveAdminState(){
    try{ localStorage.setItem('wms_admin_cfg_v2', JSON.stringify(sanitizedAdminState())); }catch(err){ console.warn('No se pudo guardar admin local:', err); }
    ensureBranchLayouts(); saveBranchLayouts(); applyBrand();
  }
  function getActiveBrandColor(){
    const colors = Array.isArray(appState.admin?.branding?.colors) ? appState.admin.branding.colors : [];
    const idx = Math.max(0, Math.min(Number(appState.admin?.branding?.activeColor || 0), Math.max(0, colors.length - 1)));
    return colors[idx] || '#6ff0a8';
  }
  function hexToRgbTriplet(hex){
    let value = String(hex || '').trim().replace('#','');
    if(value.length === 3) value = value.split('').map(ch => ch + ch).join('');
    const num = /^[0-9a-f]{6}$/i.test(value) ? parseInt(value, 16) : 0x6ff0a8;
    return `${(num>>16)&255}, ${(num>>8)&255}, ${num&255}`;
  }
  function applyBrand(){
    const companyInfo = appState.admin?.company;
    const companyName = typeof companyInfo === 'string' ? companyInfo : (companyInfo?.name || companyInfo?.company || 'WMS Industrial');
    const brandTitle = document.querySelector('.brand-text b'); if(brandTitle) brandTitle.textContent = companyName || 'WMS Industrial';
    const brandSub = document.querySelector('.brand-text .muted'); if(brandSub) brandSub.textContent = 'Gestión de almacenes';
    const box = document.querySelector('.brand-box');
    if(box){ box.innerHTML = appState.admin.logo ? `<img src="${appState.admin.logo}" alt="Logo" style="width:100%;height:100%;object-fit:contain;display:block">` : 'W'; }
    // La paleta la definen exclusivamente los tokens claro/oscuro.
    for(const key of ['--accent','--accent-rgb','--brand-active']) document.documentElement.style.removeProperty(key);
  }
  function getAdminCompanyName(){
    const company = appState.admin?.company;
    return typeof company === 'string' ? company : (company?.name || company?.company || 'WMS Industrial');
  }
  function ensureAdminVisualState(){
    if(!appState.admin || typeof appState.admin !== 'object') appState.admin = loadAdminState();
    if(typeof appState.admin.company !== 'string') appState.admin.company = getAdminCompanyName();
    if(!Array.isArray(appState.admin.branches) || !appState.admin.branches.length) appState.admin.branches = [{name:'Sucursal principal', type:'tienda', color:'#6ff0a8', warehouses:['Almacén principal'], sheetUrl:'', sheetName:'Productos', sheetConnected:false, lastSheetCount:0}];
    if(typeof appState.admin.activeBranch !== 'number') appState.admin.activeBranch = 0;
    if(!appState.admin.branding || typeof appState.admin.branding !== 'object') appState.admin.branding = {};
    if(!Array.isArray(appState.admin.branding.colors) || !appState.admin.branding.colors.length){
      appState.admin.branding.colors = ['#6ff0a8','#1f8d68','#324d57','#d9b45e','#20323b'];
    }
    if(typeof appState.admin.branding.activeColor !== 'number') appState.admin.branding.activeColor = 0;
    appState.admin.branches = appState.admin.branches.map((branch, idx) => ({
      sheetUrl:'', sheetName:'Productos', sheetConnected:false, lastSheetCount:0,
      color:'#6ff0a8',
      ...branch,
      name: String(branch?.name || `Sucursal ${idx+1}`),
      type: String(branch?.type || 'tienda'),
      warehouses: Array.isArray(branch?.warehouses) && branch.warehouses.length ? branch.warehouses.map(w => String(w || 'Almacén principal')) : ['Almacén principal'],
      mainWarehouse: String(branch?.mainWarehouse || (Array.isArray(branch?.warehouses) && branch.warehouses[0]) || 'Almacén principal'),
      color: String(branch?.color || '#6ff0a8'),
      expanded: branch?.expanded !== false
    }));
    if(appState.admin.activeBranch >= appState.admin.branches.length) appState.admin.activeBranch = 0;
  }
  function renderCompanySectionHeader(step, title, subtitle=''){
    return `<div class="company-config-section-header"><span class="company-config-step">${escapeHtml(String(step || '•'))}</span><div class="company-config-section-copy"><b>${escapeHtml(title || '')}</b>${subtitle ? `<small>${escapeHtml(subtitle)}</small>` : ''}</div></div>`;
  }

  function renderAdminBranchCard(branch, index){
    const expanded = branch.expanded !== false;
    const statusLabel = index === 0 ? 'Principal' : 'Secundaria';
    const warehouses = Array.isArray(branch.warehouses) ? branch.warehouses : ['Almacén principal'];
    const warehouseOptions = warehouses.map(name => `<option value="${escapeHtml(name)}" ${norm(name) === norm(branch.mainWarehouse) ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('');
    const rows = warehouses.map((name, wi) => `
      <div class="company-warehouse-row${norm(name) === norm(branch.mainWarehouse) ? ' is-main' : ''}">
        <div class="company-warehouse-index">${wi+1}</div>
        <input data-field="warehouse-name" data-bindex="${index}" data-windex="${wi}" value="${escapeHtml(name)}">
        <div class="company-warehouse-tag">${norm(name) === norm(branch.mainWarehouse) ? 'Principal' : 'Adicional'}</div>
        <button class="company-icon-btn" type="button" data-action="set-main-warehouse" data-bindex="${index}" data-windex="${wi}" title="Definir principal">⌂</button>
        <button class="company-icon-btn danger" type="button" data-action="delete-warehouse" data-bindex="${index}" data-windex="${wi}" title="Eliminar almacén">🗑</button>
      </div>`).join('');
    return `
      <article class="company-branch-card${expanded ? ' expanded' : ' collapsed'}" data-branch-card="${index}">
        <div class="company-branch-head">
          <button class="company-branch-toggle" type="button" data-action="toggle-branch" data-index="${index}">${expanded ? '−' : '+'}</button>
          <div class="company-branch-name-wrap">
            <div class="company-branch-title-row">
              <span class="company-branch-dot" style="background:${escapeHtml(branch.color)}"></span>
              <input class="company-branch-name-input" data-field="branch-name" data-index="${index}" value="${escapeHtml(branch.name)}">
              <span class="company-status-badge${index===0 ? ' primary' : ''}">${statusLabel}</span>
              ${expanded ? `<span class="company-status-badge success">Activa</span>` : ''}
            </div>
          </div>
          <div class="company-branch-type-pill">${escapeHtml(branch.type === 'almacen' ? 'Almacén' : branch.type === 'showroom' ? 'Showroom' : 'Tienda')}</div>
          <div class="company-branch-actions">
            <button class="company-icon-btn" type="button" data-action="move-up" data-index="${index}" title="Subir">↑</button>
            <button class="company-icon-btn" type="button" data-action="move-down" data-index="${index}" title="Bajar">↓</button>
            <button class="company-icon-btn danger" type="button" data-action="delete-branch" data-index="${index}" title="Eliminar">🗑</button>
          </div>
        </div>
        <div class="company-branch-body">
          ${renderCompanySectionHeader('A', 'Configuración de sucursal', 'Datos principales y almacén principal.')}
          <div class="company-branch-fields two">
            <div class="grid"><label>Tipo</label><select data-field="branch-type" data-index="${index}"><option value="tienda" ${branch.type==='tienda'?'selected':''}>Tienda</option><option value="almacen" ${branch.type==='almacen'?'selected':''}>Almacén</option><option value="showroom" ${branch.type==='showroom'?'selected':''}>Showroom</option></select></div>
            <div class="grid"><label>Almacén principal</label><select data-field="branch-main-warehouse" data-index="${index}">${warehouseOptions}</select></div>
          </div>
          ${renderCompanySectionHeader('B', `Almacenes adicionales (${warehouses.length})`, 'Administra los almacenes vinculados a esta sucursal.')}
          <div class="company-warehouse-list">${rows}</div>
          <button class="company-add-inline" type="button" data-action="add-warehouse" data-index="${index}">＋ Agregar almacén adicional</button>
          ${renderCompanySectionHeader('C', 'Plano y operación', 'La estructura y la distribución de racks se editan por separado para evitar movimientos accidentales.')}
          <div class="branch-layout-actions">
            <button class="company-mini-action" type="button" data-action="edit-branch-layout" data-index="${index}">Editar estructura</button>
            <button class="company-mini-action" type="button" data-action="distribute-branch-racks" data-index="${index}">Distribuir racks</button>
            <button class="company-mini-action" type="button" data-action="view-branch-products" data-index="${index}">Ver productos</button>
          </div>
        </div>
      </article>`;
  }
  function renderAdminScreen(){
    ensureAdminVisualState();
    renderViewerMenu();
    const cfg = appState.admin;
    const summaryBranches = cfg.branches.length;
    const summaryWarehouses = cfg.branches.reduce((a,b)=>a+(b.warehouses?.length||0),0);
    const companyName = getAdminCompanyName();
    contentTitle.textContent = '';
    contentSubtitle.textContent = '';
    contentStatus.textContent = '';
    contentFootRight.textContent = '';
    setTags([]);
    detailTitle.textContent='';
    detailSubtitle.textContent='';
    detailStatus.textContent='';
    detailChip.textContent='';
    detailWrap.innerHTML = ""; // El tablero ya muestra las métricas; no duplicar el resumen lateral.
    const quickActions = [
      ['virtual','box','Diseñar en 3D','Espacio y mobiliario'],
      ['viewer','search','Buscar productos','Inventario y ubicaciones'],
      ['layout','map','Editar layout','Muros, zonas y medidas']
    ];
    const advancedActions = [
      ['sheet','database','Vincular datos','Google Sheets'],
      ['distribution','grid','Distribuir racks','Ajustar posiciones'],
      ['racks','layers','Biblioteca','Modelos reutilizables'],
      ['rack-builder','tool','Crear rack','Construcción paramétrica']
    ];
    contentWrap.innerHTML = `
      <div class="company-config-v2 company-dashboard-v165">
        <section class="company-dashboard-hero">
          <div class="company-dashboard-copy">
            <span class="company-dashboard-kicker">WMS Studio</span>
            <h3>${escapeHtml(companyName)}</h3>
            <div class="company-dashboard-mini-stats">
              <div><b>${summaryBranches}</b><span>Sucursales</span></div>
              <div><b>${summaryWarehouses}</b><span>Almacenes</span></div>
              <div><b>${(appState.admin?.branches||[]).filter(b=>b.sheetConnected).length}</b><span>Sheets vinculados</span></div>
            </div>
          </div>
          <div class="company-dashboard-actions-grid">
            ${quickActions.map(([screen,icon,title,desc])=>`<button class="company-quick-card" type="button" data-dashboard-screen="${screen}"><b><svg class="wms-icon" aria-hidden="true"><use href="#wms-${icon}"></use></svg></b><span>${title}</span><small>${desc}</small></button>`).join('')}
          </div>
          <details class="company-dashboard-extra"><summary>Más herramientas</summary>
            <div class="company-dashboard-extra-grid">${advancedActions.map(([screen,icon,title,desc])=>`<button class="company-quick-card" type="button" data-dashboard-screen="${screen}"><b><svg class="wms-icon" aria-hidden="true"><use href="#wms-${icon}"></use></svg></b><span>${title}</span><small>${desc}</small></button>`).join('')}</div>
          </details>
        </section>
        <div class="company-topbar-v2"><div class="company-title-stack"><h3>Empresa y sucursales</h3></div><button class="btn secondary company-preview-btn" id="companyPreviewBtn" type="button">Abrir visor ↗</button></div>
        <section class="company-top-grid">
          <article class="company-card company-info-card">
            ${renderCompanySectionHeader(1, 'Información general')}
            <div class="grid"><label>Nombre de la Empresa</label><input id="companyNameInput" value="${escapeHtml(companyName)}"></div>
            <div class="company-logo-grid">
              <div class="grid"><label>Logo</label><div class="company-logo-drop"><div class="company-logo-drop-inner">${cfg.logo ? `<img src="${cfg.logo}" alt="Logo actual">` : '<span class="company-logo-mark">⌂</span><span>Logo actual</span>'}</div></div></div>
              <div class="company-upload-card"><input type="file" id="companyLogoInput" accept="image/*" style="display:none"><button class="company-logo-btn" id="companyLogoBtn">☁ Subir logo</button><small>PNG, JPG o SVG.<br>Máx. 2MB</small></div>
            </div>
            
          </article>
        </section>
        <section class="company-card company-branches-panel">
          <div class="company-panel-head sectionized"><div>${renderCompanySectionHeader(2, 'Sucursales y almacenes')}</div><button class="btn" id="addBranchBtn">＋ Nueva sucursal</button></div>
          <div class="company-branch-list">${cfg.branches.map((branch, idx)=>renderAdminBranchCard(branch, idx)).join('')}</div>

        </section>
        <div class="company-save-row"><button class="btn company-save-btn" id="saveCompanyBtn">💾 Guardar configuración</button></div>
      </div>`;
    bindAdminScreenEvents();
  }
  function bindAdminScreenEvents(){
    ensureAdminVisualState();
    const companyInput = $('#companyNameInput');
    if(companyInput) companyInput.addEventListener('input', e=>{ appState.admin.company = e.target.value; applyBrand(); });
    const logoBtn = $('#companyLogoBtn');
    const logoInput = $('#companyLogoInput');
    if(logoBtn && logoInput) logoBtn.onclick = ()=> logoInput.click();
    if(logoInput) logoInput.addEventListener('change', e=>{ const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{ appState.admin.logo=r.result; saveAdminState(); renderAdminScreen(); }; r.readAsDataURL(f); });
    const addBranchBtn = $('#addBranchBtn');
    if(addBranchBtn) addBranchBtn.onclick = ()=>{ const n='Sucursal '+(appState.admin.branches.length+1); appState.admin.branches.push({name:n,type:'tienda',color:(ZONE_COLOR_PALETTE[(appState.admin?.branches?.length||0)%ZONE_COLOR_PALETTE.length] || '#6ff0a8'),warehouses:['Almacén principal'],mainWarehouse:'Almacén principal',sheetUrl:'', sheetName:'Productos', sheetConnected:false, lastSheetCount:0}); appState.admin.activeBranch=appState.admin.branches.length-1; renderAdminScreen(); };
    const saveCompanyBtn = $('#saveCompanyBtn');
    if(saveCompanyBtn) saveCompanyBtn.onclick = async ()=>{ const names=appState.admin.branches.map(b=>norm(b.name)); if(new Set(names).size!==names.length) return alert('Hay sucursales con nombres repetidos.'); for(const b of appState.admin.branches){ const ws=(b.warehouses||[]).map(x=>norm(x)); if(new Set(ws).size!==ws.length) return alert(`Hay almacenes repetidos en ${b.name}.`); } saveAdminState(); await saveRemoteAppState('empresa'); showToast('Configuración guardada.', 'success'); renderAdminScreen(); };
    contentWrap.querySelectorAll('[data-dashboard-screen]').forEach(btn=>btn.onclick=()=>{
      const screen = btn.getAttribute('data-dashboard-screen') || 'admin';
      setScreen(screen);
    });
    const previewBtn = $('#companyPreviewBtn');
    if(previewBtn) previewBtn.onclick = () => {
      saveAdminState();
      showToast('Visor abierto.', 'success');
      setScreen('viewer');
    };
    contentWrap.querySelectorAll('[data-field="branch-name"]').forEach(el=>{ el.oninput=e=>appState.admin.branches[+e.target.dataset.index].name=e.target.value; el.onchange=()=>saveAdminState(); });
    contentWrap.querySelectorAll('[data-field="branch-type"]').forEach(el=>el.onchange=e=>{ appState.admin.branches[+e.target.dataset.index].type=e.target.value; saveAdminState(); renderAdminScreen(); });
    contentWrap.querySelectorAll('[data-field="branch-main-warehouse"]').forEach(el=>el.onchange=e=>{ appState.admin.branches[+e.target.dataset.index].mainWarehouse=e.target.value; saveAdminState(); renderAdminScreen(); });
    contentWrap.querySelectorAll('[data-field="warehouse-name"]').forEach(el=>{ el.oninput=e=>{ const bi=+e.target.dataset.bindex, wi=+e.target.dataset.windex; const branch = appState.admin.branches[bi]; const oldName = branch.warehouses[wi]; branch.warehouses[wi]=e.target.value; if(norm(branch.mainWarehouse)===norm(oldName)) branch.mainWarehouse=e.target.value; }; el.onchange=()=>saveAdminState(); });
    contentWrap.querySelectorAll('[data-action]').forEach(btn=>btn.onclick=e=>{
      const a=e.currentTarget.dataset.action, i=+e.currentTarget.dataset.index, bi=+e.currentTarget.dataset.bindex, wi=+e.currentTarget.dataset.windex;
      if(a==='toggle-branch'){
        const branch = appState.admin.branches[i];
        if(branch) branch.expanded = branch.expanded === false ? true : false;
        appState.admin.activeBranch = branch?.expanded ? i : -1;
        saveAdminState(); renderAdminScreen(); return;
      }
      if(a==='move-up'&&i>0){ const arr=appState.admin.branches; [arr[i-1],arr[i]]=[arr[i],arr[i-1]]; appState.admin.activeBranch=i-1; saveAdminState(); renderAdminScreen(); return; }
      if(a==='move-down'&&i<appState.admin.branches.length-1){ const arr=appState.admin.branches; [arr[i+1],arr[i]]=[arr[i],arr[i+1]]; appState.admin.activeBranch=i+1; saveAdminState(); renderAdminScreen(); return; }
      if(a==='delete-branch'){ if(!confirm('¿Eliminar sucursal?')) return; if(appState.admin.branches.length===1) return alert('Debe quedar al menos una sucursal.'); appState.admin.branches.splice(i,1); appState.admin.activeBranch=Math.max(0,Math.min(appState.admin.activeBranch, appState.admin.branches.length-1)); saveAdminState(); renderAdminScreen(); return; }
      if(a==='add-warehouse'){ const name = 'Nuevo almacén '+((appState.admin.branches[i].warehouses?.length||0)+1); appState.admin.branches[i].warehouses.push(name); if(!appState.admin.branches[i].mainWarehouse) appState.admin.branches[i].mainWarehouse=name; appState.admin.branches[i].expanded = true; saveAdminState(); renderAdminScreen(); return; }
      if(a==='delete-warehouse'){ if(!confirm('¿Eliminar almacén?')) return; const branch = appState.admin.branches[bi]; const removed = branch.warehouses.splice(wi,1)[0]; if(!branch.warehouses.length) branch.warehouses=['Almacén principal']; if(norm(branch.mainWarehouse)===norm(removed)) branch.mainWarehouse=branch.warehouses[0]; saveAdminState(); renderAdminScreen(); return; }
      if(a==='set-main-warehouse'){ const branch = appState.admin.branches[bi]; branch.mainWarehouse = branch.warehouses[wi] || branch.mainWarehouse; saveAdminState(); renderAdminScreen(); return; }
      if(a==='edit-branch-layout'){ setLayoutBranch(i); appState.admin.activeBranch=i; saveAdminState(); setScreen('layout'); return; }
      if(a==='distribute-branch-racks'){ setLayoutBranch(i); appState.admin.activeBranch=i; saveAdminState(); setScreen('distribution'); return; }
      if(a==='view-branch-products'){ setGlobalBranch(i, { screen:'viewer' }); return; }
    });
    applyBrand();
  }

  function dedupeSheetHeadersLocal(headers){
    const seen = new Map();
    return (headers || []).map((h, i) => {
      const base = String(h || `Columna ${i + 1}`).trim() || `Columna ${i + 1}`;
      const key = norm(base) || `columna_${i+1}`;
      const count = (seen.get(key) || 0) + 1;
      seen.set(key, count);
      return count > 1 ? `${base} ${count}` : base;
    });
  }

  function parseCsvRowsLocal(csvText){
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    const text = String(csvText || '').replace(/^\uFEFF/, '');
    for(let i = 0; i < text.length; i += 1){
      const ch = text[i];
      const next = text[i + 1];
      if(inQuotes){
        if(ch === '"' && next === '"') { cell += '"'; i += 1; }
        else if(ch === '"') inQuotes = false;
        else cell += ch;
      }else{
        if(ch === '"') inQuotes = true;
        else if(ch === ',') { row.push(String(cell || '').trim()); cell = ''; }
        else if(ch === '\n') { row.push(String(cell || '').trim()); rows.push(row); row = []; cell = ''; }
        else if(ch === '\r') { /* ignorar */ }
        else cell += ch;
      }
    }
    row.push(String(cell || '').trim());
    if(row.some(v => String(v || '').trim()) || rows.length) rows.push(row);
    return rows;
  }

  function normalizeSheetMatrixLocal(rawRows){
    const rowsIn = Array.isArray(rawRows) ? rawRows : [];
    const nonEmpty = rowsIn.filter(row => Array.isArray(row) && row.some(v => String(v || '').trim()));
    if(!nonEmpty.length) throw new Error('La hoja está vacía o no se pudo leer.');
    let headerIndex = 0;
    let headerRow = nonEmpty[0] || [];
    if(headerRow.filter(v => String(v || '').trim()).length <= 1 && nonEmpty[1] && nonEmpty[1].filter(v => String(v || '').trim()).length >= 2){
      headerIndex = 1;
      headerRow = nonEmpty[1] || [];
    }
    const dataRowsAllRaw = nonEmpty.slice(headerIndex + 1);
    const maxLen = Math.max(headerRow.length, ...dataRowsAllRaw.map(r => Array.isArray(r) ? r.length : 0), 0);
    let lastCol = 0;
    for(let i = 0; i < maxLen; i += 1){
      if(String(headerRow[i] || '').trim()) lastCol = i;
      else if(dataRowsAllRaw.slice(0,500).some(r => String((r || [])[i] || '').trim())) lastCol = i;
    }
    const headers = dedupeSheetHeadersLocal(headerRow.slice(0, lastCol + 1));
    const rows = dataRowsAllRaw.map(r => (r || []).slice(0, lastCol + 1));
    return { headers, rows, headerIndex, totalRows: rows.length };
  }

  async function fetchSheetRowsLocal(apiUrl){
    const params = new URLSearchParams(String(apiUrl).split('?')[1] || '');
    const id = parseSheetId(params.get('url') || params.get('id') || '');
    const sheet = String(params.get('sheet') || 'Productos').trim();
    const headerOnly = String(params.get('headerOnly') || '') === '1';
    const limit = Math.max(1, Math.min(50000, Number(params.get('limit') || (headerOnly ? 1 : 50000)) || (headerOnly ? 1 : 50000)));
    if(!id || !sheet) throw new Error('URL/ID y hoja son obligatorios.');

    // Live Server no tiene backend. Para evitar el corte típico de 500 filas del visor JSON,
    // primero se lee como CSV por Google GViz con rango amplio. Esto permite buscar sobre toda la hoja.
    const rangeRows = Math.max(limit + 5, 1000);
    const csvEndpoint = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&headers=0&sheet=${encodeURIComponent(sheet)}&range=${encodeURIComponent('A1:AZ' + rangeRows)}`;
    try{
      const csvText = await fetch(csvEndpoint, { cache:'no-store' }).then(r => {
        if(!r.ok) throw new Error('No se pudo leer Google Sheet en modo CSV.');
        return r.text();
      });
      const parsed = normalizeSheetMatrixLocal(parseCsvRowsLocal(csvText));
      const rowsLimited = parsed.rows.slice(0, limit);
      if(headerOnly) return { ok:true, headers:parsed.headers, headerIndex:parsed.headerIndex, previewCount:parsed.totalRows, source:'local-gviz-csv-full' };
      return { ok:true, headers:parsed.headers, rows:rowsLimited, headerIndex:parsed.headerIndex, totalRows:parsed.totalRows, source:'local-gviz-csv-full' };
    }catch(csvErr){
      console.warn('Fallback CSV falló, intentando JSON GViz:', csvErr);
    }

    const endpoint = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&headers=0&sheet=${encodeURIComponent(sheet)}&range=${encodeURIComponent('A1:AZ' + rangeRows)}`;
    const text = await fetch(endpoint, { cache:'no-store' }).then(r => {
      if(!r.ok) throw new Error('No se pudo leer Google Sheet. Revisa permisos o nombre de hoja.');
      return r.text();
    });
    const jsonText = text.replace(/^.*?setResponse\(/s, '').replace(/\);?\s*$/s, '');
    const json = JSON.parse(jsonText);
    const rawRows = (json.table?.rows || []).map(r => (r.c || []).map(c => String(c?.v ?? c?.f ?? '').trim()));
    const parsed = normalizeSheetMatrixLocal(rawRows);
    const rowsLimited = parsed.rows.slice(0, limit);
    if(headerOnly) return { ok:true, headers:parsed.headers, headerIndex:parsed.headerIndex, previewCount:parsed.totalRows, source:'local-gviz-json-range' };
    return { ok:true, headers:parsed.headers, rows:rowsLimited, headerIndex:parsed.headerIndex, totalRows:parsed.totalRows, source:'local-gviz-json-range' };
  }

  async function httpJson(url, opts={}){
    if(typeof isLocalRuntimeForAuth === 'function' && isLocalRuntimeForAuth() && typeof url === 'string' && url.startsWith('/api/sheets/rows')){
      return fetchSheetRowsLocal(url);
    }
    const finalOpts = { credentials:'include', ...opts };
    if(opts.headers) finalOpts.headers = opts.headers;
    const res=await fetch(url, finalOpts);
    const txt=await res.text();
    let data={};
    try{data=txt?JSON.parse(txt):{}}catch{data={raw:txt}}
    if(!res.ok) throw new Error(data.error||txt||'Error');
    return data;
  }

  function coerceRemoteModels(models){
    if(!Array.isArray(models) || !models.length) return null;
    return models.map(m => ({ ...m, leftHeight: Number(m.leftHeight || m.height || 240), rightHeight: Number(m.rightHeight || Math.max(40, (m.height || 240) * 0.35)), mirrored: isUnderStairsStyle(m?.style) ? (normalizeRackStyle(m?.style) === 'under_stairs_reflected' ? true : false) : !!m.mirrored }));
  }
  function normalizeRemoteBranchLayouts(layouts){
    if(!layouts || typeof layouts !== 'object') return null;
    const out = {};
    Object.keys(layouts).forEach(key => {
      const layout = layouts[key];
      if(layout && Array.isArray(layout.zones) && Array.isArray(layout.racks)) out[key] = layout;
    });
    return out;
  }
  function getPersistedPreferredBranchIndex(){
    const branches = Array.isArray(appState.admin?.branches) ? appState.admin.branches : [];
    if(!branches.length) return 0;
    const preferred = Number.isFinite(Number(appState.admin?.activeBranch)) ? Number(appState.admin.activeBranch) : (Number.isFinite(Number(appState.activeBranchIndex)) ? Number(appState.activeBranchIndex) : 0);
    if(Number.isFinite(preferred) && preferred >= 0 && branches[preferred]) return preferred;
    const linkedIdx = branches.findIndex(b => (Array.isArray(b?.sheetPreviewProducts) && b.sheetPreviewProducts.length) || Number(b?.lastSheetCount || 0) > 0 || String(b?.sheetUrl || '').trim());
    return linkedIdx >= 0 ? linkedIdx : 0;
  }
  function rehydratePersistedBranchView(){
    ensureBranchSheetFields();
    ensureBranchLayouts();
    const branches = Array.isArray(appState.admin?.branches) ? appState.admin.branches : [];
    if(!branches.length) return false;
    const idx = getPersistedPreferredBranchIndex();
    appState.activeBranchIndex = idx;
    if(appState.admin) appState.admin.activeBranch = idx;
    try{ loadLayoutForBranch(idx); }catch(_err){}
    const branch = branches[idx];
    if(Array.isArray(branch?.sheetPreviewProducts) && branch.sheetPreviewProducts.length){
      setProductDataset(branch.sheetPreviewProducts.slice(0,50000));
      appState.filtered = appState.products.slice();
      return true;
    }
    const fallbackIdx = branches.findIndex(b => Array.isArray(b?.sheetPreviewProducts) && b.sheetPreviewProducts.length);
    if(fallbackIdx >= 0){
      appState.activeBranchIndex = fallbackIdx;
      if(appState.admin) appState.admin.activeBranch = fallbackIdx;
      try{ loadLayoutForBranch(fallbackIdx); }catch(_err){}
      const fallbackBranch = branches[fallbackIdx];
      setProductDataset(fallbackBranch.sheetPreviewProducts.slice(0,50000));
      appState.filtered = appState.products.slice();
      return true;
    }
    setProductDataset([]);
    appState.filtered = [];
    return false;
  }
  function applyRemoteAppState(state){
    if(!state || typeof state !== 'object') return;
    if(state.admin && typeof state.admin === 'object') appState.admin = state.admin;
    ensureAppRuntimeState();
    const models = coerceRemoteModels(state.models);
    if(models) appState.models = models;
    const branchLayouts = normalizeRemoteBranchLayouts(state.branchLayouts);
    if(branchLayouts) appState.branchLayouts = branchLayouts;
    rehydratePersistedBranchView();
  }
  async function loadAllBranchSheetConfigsFromServer(){
    ensureAppRuntimeState();
    ensureBranchSheetFields();
    const branches = Array.isArray(appState.admin?.branches) ? appState.admin.branches : [];
    if(!branches.length) return false;
    let changed = false;
    for(const branch of branches){
      const branchId = Number(branch?.id || 0);
      if(!branchId) continue;
      try{
        const data = await httpJson(`/api/branches/${branchId}/sheet`);
        const cfg = data?.config || {};
        ensureBranchRuntimeShape(branch);
        if(String(cfg.sheet_id || '').trim()) branch.sheetUrl = String(cfg.sheet_id || '').trim();
        if(String(cfg.sheet_name || '').trim()) branch.sheetName = String(cfg.sheet_name || 'Productos').trim();
        if(Array.isArray(cfg.sheet_map_rows)) branch.sheetMapRows = cfg.sheet_map_rows;
        if(Array.isArray(cfg.sheet_headers)) branch.sheetHeaders = cfg.sheet_headers;
        if(Number.isFinite(Number(cfg.sheet_header_index))) branch.sheetHeaderIndex = Number(cfg.sheet_header_index || 0);
        branch.lastImportAt = cfg.last_imported_at || '';
        branch.lastImportStatus = cfg.last_import_status || '';
        branch.lastImportSource = cfg.last_import_source || '';
        branch.lastImportError = cfg.last_import_error || '';
        const remoteProductCount = Number(cfg.product_count || cfg.last_sheet_count || 0);
        branch.lastSheetCount = remoteProductCount;
        branch.sheetConnected = remoteProductCount > 0 || !!String(cfg.sheet_id || '').trim();
        branch.sheetPreviewProducts = [];
        if(remoteProductCount > 0){
          branch.sheetStatusText = `Importados: ${remoteProductCount.toLocaleString('es-PE')} · D1`;
          changed = true;
        }
      }catch(_err){}
    }
    rehydratePersistedBranchView();
    if(Array.isArray(appState.products) && appState.products.length){
      renderProducts(appState.filtered);
      countProducts.textContent = appState.products.length.toLocaleString('es-PE');
      if(appState.products[0]) appState.selectedProduct = appState.products[0];
    }else{
      renderProducts([]);
      countProducts.textContent = '0';
    }
    return changed;
  }

  async function loadRemoteAppState(){
    try{
      const data = await httpJson('/api/app-state');
      if(data?.state) applyRemoteAppState(data.state);
      return true;
    }catch(err){
      console.warn('No se pudo cargar persistencia remota:', err);
      return false;
    }
  }
  async function saveRemoteAppState(reason=''){
    try{
      setLayoutSaveState('saving', reason ? `Guardando ${reason}…` : 'Guardando…');
      persistActiveLayout();
      await httpJson('/api/app-state', {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ admin: sanitizedAdminState(), models: appState.models, branchLayouts: appState.branchLayouts })
      });
      appState.ui = appState.ui || {};
      appState.ui.layoutDirty = false;
      setLayoutSaveState('remote', reason ? `Guardado remoto · ${reason}` : 'Guardado remoto');
      contentStatus.textContent = reason ? `Guardado: ${reason}` : 'Cambios guardados en el servidor.';
      if(window.__wmsDiagPush) window.__wmsDiagPush('save', `Guardado remoto correcto: ${reason || 'app-state'}`);
      return true;
    }catch(err){
      console.error(err);
      setLayoutSaveState('error', err.message || 'No se pudo guardar en el servidor');
      if(window.__wmsDiagPush) window.__wmsDiagPush('save-error', err.message || 'No se pudo guardar en el servidor');
      return false;
    }
  }
  function getSheetSourceSignature(url, sheetName){
    const sheetId = parseSheetId(url || '');
    const cleanName = norm(sheetName || 'productos').replace(/[^a-z0-9]+/g,'_');
    return `${sheetId || 'sinurl'}__${cleanName || 'sinhoja'}`;
  }
  function getBranchStoragePrefix(branchIndex){
    const branch = (appState.admin?.branches || [])[branchIndex] || {};
    const branchName = norm(branch.name || `branch_${branchIndex}`).replace(/[^a-z0-9]+/g,'_');
    return `wms_products_branch_v2_${branchName}__`;
  }
  function getBranchStorageKey(branchIndex){
    const branch = (appState.admin?.branches || [])[branchIndex] || {};
    const branchName = norm(branch.name || `branch_${branchIndex}`).replace(/[^a-z0-9]+/g,'_');
    const sheetUrl = parseSheetId(branch.sheetUrl || '');
    const sheetName = norm(branch.sheetName || 'productos').replace(/[^a-z0-9]+/g,'_');
    return `wms_products_branch_v2_${branchName}__${sheetUrl || 'sinurl'}__${sheetName || 'sinhoja'}`;
  }
  function saveProductsLocal(branchIndex){
    try{
      const branch = (appState.admin?.branches || [])[Number(branchIndex)] || null;
      if(appState.auth?.loggedIn && Number(branch?.id || 0) > 0){
        const keys = [getBranchStorageKey(branchIndex), `wms_products_branch_${branchIndex}`, 'wms_products_v2'];
        keys.forEach(key => { try{ localStorage.removeItem(key); }catch{} });
        return;
      }
      const payload = JSON.stringify((appState.products || []));
      const key = (Number.isFinite(branchIndex) && branchIndex >= 0) ? getBranchStorageKey(branchIndex) : 'wms_products_v2';
      localStorage.setItem(key, payload);
      if(Number.isFinite(branchIndex) && branchIndex >= 0){
        localStorage.setItem(`wms_products_branch_${branchIndex}`, payload);
      }
      localStorage.setItem('wms_products_v2', payload);
    }catch{}
  }
  function loadProductsLocal(){ try{ const raw=localStorage.getItem('wms_products_v2'); if(raw){ const arr=JSON.parse(raw); if(Array.isArray(arr)&&arr.length){ appState.products=arr; appState.filtered=arr; } } }catch{} }
  function applyBranchProducts(arr, branchIndex){
    ensureAppRuntimeState();
    if(!Array.isArray(arr) || !arr.length) return false;
    setProductDataset(arr);
    appState.filtered = appState.products.slice();
    appState.activeBranchIndex = branchIndex;
    renderProducts(appState.filtered);
    if(arr[0]) selectProduct(arr[0]);
    countProducts.textContent = arr.length.toLocaleString('es-PE');
    return true;
  }
  function loadBranchProducts(branchIndex){
    try{
      const modernKey = getBranchStorageKey(branchIndex);
      const rawModern = localStorage.getItem(modernKey);
      if(rawModern){
        const arr = JSON.parse(rawModern);
        if(applyBranchProducts(arr, branchIndex)) return true;
      }
      const rawLegacy = localStorage.getItem(`wms_products_branch_${branchIndex}`);
      if(rawLegacy){
        const arr = JSON.parse(rawLegacy);
        if(applyBranchProducts(arr, branchIndex)){
          try{ localStorage.setItem(modernKey, rawLegacy); }catch{}
          return true;
        }
      }
    }catch{}
    return false;
  }
  async function activateBranchSelection(branchIndex){
    ensureBranchSheetFields();
    appState.activeBranchIndex = branchIndex;
    appState.admin.activeBranch = branchIndex;
    if(Number.isFinite(Number(branchIndex))) appState.activeLayoutBranchIndex = Number(branchIndex);
    const branch = (appState.admin?.branches || [])[branchIndex];
    if(!branch) return false;
    if(branch.id && appState.auth?.loggedIn){
      ensureProductPagingState().backendUnavailable = false;
      const ok = await requestProductsPage({ branchIndex, query:String(searchInput?.value || '').trim(), page:1, silent:true });
      if(ok) return true;
    }
    if(loadBranchProducts(branchIndex)) {
      appState.productPaging = { ...appState.productPaging, mode:'local', page:1, total:appState.products.length, totalPages:1, query:String(searchInput?.value || '').trim(), branchId:Number(branch.id || 0), lastError:'', backendUnavailable:true };
      updateProductPagerUi();
      return true;
    }
    if(Array.isArray(branch.sheetPreviewProducts) && branch.sheetPreviewProducts.length){
      applyBranchProducts(branch.sheetPreviewProducts, branchIndex);
      appState.productPaging = { ...appState.productPaging, mode:'local', page:1, total:appState.products.length, totalPages:1, query:String(searchInput?.value || '').trim(), branchId:Number(branch.id || 0), lastError:'', backendUnavailable:true };
      updateProductPagerUi();
      return true;
    }
    const hasLink = String(branch.sheetUrl||'').trim() && String(branch.sheetName||'').trim();
    if(hasLink){
      try{ await importBranchSheet(branchIndex); return true; }catch{}
    }
    setProductDataset([]);
    appState.filtered = [];
    appState.productPaging = { ...appState.productPaging, mode:'local', page:1, total:0, totalPages:1, query:'', branchId:Number(branch.id || 0), lastError:'' };
    renderProducts([]);
    countProducts.textContent = '0';
    updateProductPagerUi();
    return false;
  }
  function resetSheetPanelList(){ productList.innerHTML = '<div class="empty" style="padding:18px">Aún no hay productos importados en este asistente.</div>'; productSummary.textContent = 'Importa productos en el paso 3 para verlos aquí.'; countProducts.textContent='0'; }
  function clearImportedProductsForBranch(branchIndex, { resetUi=false, clearHeaders=false } = {}){
    try{
      const branch = (appState.admin?.branches || [])[branchIndex];
      const prefix = getBranchStoragePrefix(branchIndex);
      const staleKeys = [];
      for(let i=0;i<localStorage.length;i+=1){
        const key = localStorage.key(i);
        if(key && key.startsWith(prefix)) staleKeys.push(key);
      }
      staleKeys.forEach(key=>localStorage.removeItem(key));
      localStorage.removeItem(`wms_products_branch_${branchIndex}`);
      localStorage.removeItem('wms_products_v2');
      if(branch){
        branch.sheetPreviewProducts = [];
        branch.lastSheetCount = 0;
        branch.sheetConnected = false;
        branch.lastImportedSourceSignature = '';
        const meta = ensureBranchMeta(branch);
        meta.productCount = 0;
        meta.lastImportedAt = 0;
        if(clearHeaders){
          branch.sheetHeaders = [];
          branch.sheetHeaderIndex = 0;
          branch.sheetMapRows = (branch.sheetMapRows||[]).map(row=>({ ...row, header:'' }));
          meta.headerCount = 0;
          meta.lastHeadersReadAt = 0;
        }
        setBranchMetaStatus(branch, deriveBranchStatusAfterCleanup(branch), { headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) });
      }
    }catch{}
    if(resetUi){
      appState.products = [];
      appState.filtered = [];
      appState.selectedProduct = null;
      appState.selectedRack = '';
      appState.selectedRackLayoutId = '';
      renderProducts([]);
      resetSheetPanelList();
      countProducts.textContent='0';
    }
  }

  function clearCurrentProductsForSheetLink(branchIndex){
    setProductDataset([]);
    appState.filtered = [];
    appState.selectedProduct = null;
    appState.selectedRack = '';
    appState.selectedRackLayoutId = '';
    try{
      if(Number.isFinite(branchIndex) && branchIndex >= 0){
        const branch = (appState.admin?.branches || [])[branchIndex];
        if(branch){
          branch.sheetPreviewProducts = [];
          branch.lastSheetCount = 0;
        }
        clearImportedProductsForBranch(branchIndex, { resetUi:false, clearHeaders:false });
      }
    }catch{}
    renderProducts([]);
    resetSheetPanelList();
  }
  function detectHeaderMap(headers){ const normed=headers.map(h=>({raw:h,key:norm(h).replace(/\s+/g,'')})); const pick=(...names)=>{ for(const n of names){ const hit=normed.find(h=>h.key.includes(n)); if(hit) return hit.raw; } return ''; }; return { sku:pick('sku','codigo'), nombre:pick('nombre','name','producto'), variante:pick('variante','variant'), talla:pick('talla','size'), color:pick('color','colour'), categoria:pick('categoria','categoría','category'), genero:pick('genero','género','gender'), barras:pick('barras','barcode','barra'), ubicacion:pick('ubicacion','ubiccaion','location'), almacen:pick('almacen','warehouse','alamacen') }; }


  function defaultSheetMapRows(){
    return [
      { id: uid('map'), field:'sku', label:'SKU', header:'' },
      { id: uid('map'), field:'nombre', label:'Nombre', header:'' },
      { id: uid('map'), field:'variante', label:'Variante', header:'' },
      { id: uid('map'), field:'talla', label:'Talla', header:'' },
      { id: uid('map'), field:'color', label:'Color', header:'' },
      { id: uid('map'), field:'categoria', label:'Categoría', header:'' },
      { id: uid('map'), field:'genero', label:'Género', header:'' },
      { id: uid('map'), field:'imagen', label:'Imagen 1', header:'' },
      { id: uid('map'), field:'imagen2', label:'Imagen 2', header:'' },
      { id: uid('map'), field:'imagen3', label:'Imagen 3', header:'' },
      { id: uid('map'), field:'fondo_card', label:'Fondo card', header:'' },
      { id: uid('map'), field:'ubicacion', label:'Ubicación', header:'' },
    ];
  }
  function uid(prefix='id'){ return `${prefix}_${Math.random().toString(36).slice(2,8)}_${Date.now().toString(36)}`; }

  function ensureBranchMeta(branch){
    if(!branch) return { status:BRANCH_STATUS.EMPTY, lastHeadersReadAt:0, lastImportedAt:0, productCount:0, headerCount:0, error:'', loadingMessage:'' };
    if(!branch.sheetMeta || typeof branch.sheetMeta !== 'object') branch.sheetMeta = {};
    branch.sheetMeta = {
      status: branch.sheetMeta.status || '',
      lastHeadersReadAt: Number(branch.sheetMeta.lastHeadersReadAt || 0),
      lastImportedAt: Number(branch.sheetMeta.lastImportedAt || 0),
      productCount: Number(branch.sheetMeta.productCount || 0),
      headerCount: Number(branch.sheetMeta.headerCount || 0),
      error: String(branch.sheetMeta.error || ''),
      loadingMessage: String(branch.sheetMeta.loadingMessage || '')
    };
    return branch.sheetMeta;
  }
  function formatMetaDate(ts){
    const n = Number(ts || 0);
    if(!n) return '—';
    try{ return new Date(n).toLocaleString('es-PE', { hour12:true }); }catch{ return '—'; }
  }
  function getSheetBranchProductCount(branch){
    if(Array.isArray(branch?.sheetPreviewProducts) && branch.sheetPreviewProducts.length) return branch.sheetPreviewProducts.length;
    const meta = ensureBranchMeta(branch);
    return Number(meta.productCount || branch?.lastSheetCount || 0);
  }
  function getSheetBranchHeaderCount(branch){
    if(Array.isArray(branch?.sheetHeaders) && branch.sheetHeaders.length) return branch.sheetHeaders.length;
    return Number(ensureBranchMeta(branch).headerCount || 0);
  }
  function branchHasMappedHeaders(branch){
    return Array.isArray(branch?.sheetMapRows) && branch.sheetMapRows.some(row => String(row?.header || '').trim());
  }
  function getSheetBranchStatusInfo(branch){
    const meta = ensureBranchMeta(branch);
    let key = meta.status;
    if(!key){
      if(getSheetBranchProductCount(branch)) key = BRANCH_STATUS.IMPORTED;
      else if(branchHasMappedHeaders(branch)) key = BRANCH_STATUS.MAPPED;
      else if(getSheetBranchHeaderCount(branch)) key = BRANCH_STATUS.HEADERS_LOADED;
      else if(String(branch?.sheetUrl || '').trim() || String(branch?.sheetName || '').trim()) key = BRANCH_STATUS.LINKED;
      else key = BRANCH_STATUS.EMPTY;
    }
    const labels = {
      [BRANCH_STATUS.EMPTY]:'Sin vincular',
      [BRANCH_STATUS.LINKED]:'Vinculada',
      [BRANCH_STATUS.HEADERS_LOADED]:'Encabezados leídos',
      [BRANCH_STATUS.MAPPED]:'Mapeo listo',
      [BRANCH_STATUS.IMPORTED]:'Productos importados',
      [BRANCH_STATUS.DIRTY]:'Cambios pendientes',
      [BRANCH_STATUS.ERROR]:'Error',
      [BRANCH_STATUS.LOADING]:(meta.loadingMessage || 'Procesando…')
    };
    const cls = key === BRANCH_STATUS.ERROR ? 'error' : (key === BRANCH_STATUS.DIRTY || key === BRANCH_STATUS.EMPTY ? 'warn' : (key === BRANCH_STATUS.LOADING ? 'loading' : 'ok'));
    return { key, label: labels[key] || labels[BRANCH_STATUS.EMPTY], cls };
  }
  function setBranchMetaStatus(branch, status, extra={}){
    const meta = ensureBranchMeta(branch);
    meta.status = status;
    if(Object.prototype.hasOwnProperty.call(extra, 'loadingMessage')) meta.loadingMessage = String(extra.loadingMessage || '');
    if(Object.prototype.hasOwnProperty.call(extra, 'error')) meta.error = String(extra.error || '');
    if(Object.prototype.hasOwnProperty.call(extra, 'headerCount')) meta.headerCount = Number(extra.headerCount || 0);
    if(Object.prototype.hasOwnProperty.call(extra, 'productCount')) meta.productCount = Number(extra.productCount || 0);
    if(extra.touchHeadersReadAt) meta.lastHeadersReadAt = Date.now();
    if(extra.touchImportedAt) meta.lastImportedAt = Date.now();
    if(status !== BRANCH_STATUS.LOADING && !Object.prototype.hasOwnProperty.call(extra, 'loadingMessage')) meta.loadingMessage = '';
    if(status !== BRANCH_STATUS.ERROR && !Object.prototype.hasOwnProperty.call(extra, 'error')) meta.error = '';
    branch.sheetMeta = meta;
    return meta;
  }
  function deriveBranchStatusAfterCleanup(branch){
    if(getSheetBranchProductCount(branch)) return BRANCH_STATUS.IMPORTED;
    if(branchHasMappedHeaders(branch)) return BRANCH_STATUS.MAPPED;
    if(getSheetBranchHeaderCount(branch)) return BRANCH_STATUS.HEADERS_LOADED;
    if(String(branch?.sheetUrl || '').trim() || String(branch?.sheetName || '').trim()) return BRANCH_STATUS.LINKED;
    return BRANCH_STATUS.EMPTY;
  }
  function markBranchDirty(index){
    ensureBranchSheetFields();
    const branch = appState.admin?.branches?.[index];
    if(!branch) return;
    const meta = ensureBranchMeta(branch);
    if(meta.status === BRANCH_STATUS.LOADING) return;
    setBranchMetaStatus(branch, BRANCH_STATUS.DIRTY, { headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) });
    branch.sheetStatusText = 'Cambios pendientes por guardar.';
  }

  function setUnifiedMapLayout(){}
  
  function focusBoundsForProduct(product = appState.selectedProduct){
    const ctx = getViewerProductLocationContext(product);
    const prod = product || ctx.prod;
    if(!prod) return null;
    const mode = appState.ui?.locationFocusMode || 'both';
    const ids = [];
    if((mode === 'primary' || mode === 'both') && ctx.primaryRackId) ids.push(ctx.primaryRackId);
    if((mode === 'store' || mode === 'both') && ctx.storeRackId && ctx.storeRackId !== ctx.primaryRackId) ids.push(ctx.storeRackId);
    if(!ids.length && ctx.primaryRackId) ids.push(ctx.primaryRackId);
    const points = [];
    ids.forEach(id => {
      const rack = findRackById(id);
      if(!rack) return;
      const plan = getRackIsoPlan(rack);
      (plan?.corners || []).forEach(p => points.push(toIso(p.x, p.y, 0)));
      (plan?.corners || []).forEach(p => points.push(toIso(p.x, p.y, getRackRenderHeight3D(rack))));
    });
    const zoneIds = new Set();
    if((mode === 'primary' || mode === 'both') && prod.zona) zoneIds.add(prod.zona);
    if((mode === 'store' || mode === 'both') && prod.zonaStore) zoneIds.add(prod.zonaStore);
    (appState.layout?.zones || []).forEach(z => {
      if(zoneIds.has(z.id)) (z.pts || []).forEach(p => points.push(toIso(p.x, p.y, 0)));
    });
    if(!points.length) return null;
    return {
      minX: Math.min(...points.map(p => p.x)),
      maxX: Math.max(...points.map(p => p.x)),
      minY: Math.min(...points.map(p => p.y)),
      maxY: Math.max(...points.map(p => p.y))
    };
  }
  function getActiveSheetBranch(){
    ensureBranchSheetFields();
    const branches = appState.admin.branches || [];
    // Prioridad: sucursal actualmente abierta en el acordeón
    if(Number.isFinite(appState.activeBranchIndex) && branches[appState.activeBranchIndex]) {
      return branches[appState.activeBranchIndex];
    }
    return branches.find(b => b.sheetConnected) || branches[0] || null;
  }
  function getActiveBranchIndex(){
    const branches = appState.admin.branches || [];
    if(Number.isFinite(appState.activeBranchIndex) && branches[appState.activeBranchIndex]) return appState.activeBranchIndex;
    const idx = branches.findIndex(b => b.sheetConnected);
    return idx >= 0 ? idx : 0;
  }
  function getActiveSheetBranchIndex(){
    return getActiveBranchIndex();
  }
  function getActiveBranchContextIndex(fallback = 0){
    const branches = appState.admin?.branches || [];
    const candidates = [
      Number(appState.viewerBranchIndex),
      Number(appState.activeBranchIndex),
      Number(appState.activeLayoutBranchIndex),
      Number(appState.admin?.activeBranch),
      Number(fallback)
    ];
    const found = candidates.find(i => Number.isFinite(i) && i >= 0 && i < branches.length);
    return Number.isFinite(found) ? found : 0;
  }

  function getBranchWarehouseList(branchIndex = null){
    const idx = Number.isFinite(Number(branchIndex)) ? Number(branchIndex) : getActiveBranchContextIndex();
    const branch = (appState.admin?.branches || [])[idx] || {};
    const fromConfig = Array.isArray(branch.warehouses) ? branch.warehouses : [];
    const fromProducts = Array.from(new Set((appState.products || []).map(p => String(p?.almacen || p?.warehouse || '').trim()).filter(Boolean)));
    const merged = Array.from(new Set(fromConfig.concat(fromProducts).map(x => String(x || '').trim()).filter(Boolean)));
    return merged.length ? merged : ['Almacén principal'];
  }

  async function setGlobalBranch(branchIndex, { screen = null } = {}){
    const idx = Number(branchIndex);
    const branches = appState.admin?.branches || [];
    if(!Number.isFinite(idx) || !branches[idx]) return;
    appState.admin.activeBranch = idx;
    appState.activeBranchIndex = idx;
    appState.viewerBranchIndex = idx;
    appState.productFilters = { ...(appState.productFilters || {}), warehouse:'' };
    saveAdminState();
    loadLayoutForBranch(idx);
    await activateBranchSelection(idx);
    if(screen || appState.screen === 'viewer') setScreen(screen || 'viewer');
    else {
      renderViewerBranchHost(idx);
      if(isLayoutWorkspaceScreen()) renderLayoutEditor();
    }
  }

  function renderViewerBranchHost(activeBranchIndex){
    ensureAppRuntimeState();
    const branches = Array.isArray(appState.admin?.branches) ? appState.admin.branches : [];
    const index = branches.length ? getActiveBranchContextIndex(activeBranchIndex) : -1;
    appState.viewerBranchIndex = index;
    renderViewerMenu();
    if(!searchBranchHost) return;
    if(!branches.length){
      searchBranchHost.classList.remove('active');
      searchBranchHost.innerHTML = '';
      return;
    }
    const branch = branches[index] || branches[0];
    const warehouses = getBranchWarehouseList(index);
    const activeWarehouse = String(appState.productFilters?.warehouse || '').trim();
    searchBranchHost.classList.add('active');
    searchBranchHost.innerHTML = `
      <div class="branch-switch-card v53">
        <div class="branch-switch-main">
          <div class="branch-switch-dot" style="background:${escapeHtml(branch?.color || getActiveBrandColor())}"></div>
          <div class="branch-switch-copy">
            <span>Sucursal activa</span>
            <b>${escapeHtml(branch?.name || 'Sucursal')}</b>
          </div>
        </div>
        <div class="branch-switch-controls">
          <select id="globalBranchSelect" title="Cambiar sucursal">${branches.map((b,i)=>`<option value="${i}" ${i===index?'selected':''}>${escapeHtml(b?.name || ('Sucursal '+(i+1)))}</option>`).join('')}</select>
          <select id="globalWarehouseSelect" title="Filtrar almacén"><option value="">Todos los almacenes</option>${warehouses.map(w=>`<option value="${escapeHtml(w)}" ${w===activeWarehouse?'selected':''}>${escapeHtml(w)}</option>`).join('')}</select>
        </div>
      </div>`;
    const branchSelect = document.getElementById('globalBranchSelect');
    if(branchSelect) branchSelect.onchange = e => setGlobalBranch(Number(e.target.value), { screen:'viewer' });
    const warehouseSelect = document.getElementById('globalWarehouseSelect');
    if(warehouseSelect) warehouseSelect.onchange = e => {
      appState.productFilters.warehouse = String(e.target.value || '').trim();
      filterProducts();
      renderViewerBranchHost(index);
    };
  }
  function getBranchPreviewProducts(branch){
    return Array.isArray(branch?.sheetPreviewProducts) ? branch.sheetPreviewProducts : [];
  }

  function renderSheetDetailPreview(){
    const branchIdx = getActiveBranchIndex();
    const branch = (appState.admin.branches||[])[branchIdx];
    const products = getBranchPreviewProducts(branch).slice(0, 20);
    const rowsHtml = products.length ? products.map(p => `<tr><td>${escapeHtml(p.sku||'')}</td><td>${escapeHtml(p.nombre||'')}</td><td>${escapeHtml(p.variante||'')}</td><td>${escapeHtml(p.ubicacion||'')}</td></tr>`).join('') : `<tr><td colspan="4" class="muted" style="padding:18px">Aún no hay productos importados en esta sucursal.</td></tr>`;
    detailTitle.textContent='Vista previa de productos';
    detailSubtitle.textContent=`Sucursal activa: ${branch?.name||'—'}`;
    detailWrap.innerHTML = `<div class="card" style="height:100%;display:flex;flex-direction:column"><div class="card-body" style="display:flex;flex-direction:column;gap:12px;height:100%"><div class="kv"><div class="kv-row"><div class="tiny muted">Sucursal</div><div>${escapeHtml(branch?.name||'—')}</div></div><div class="kv-row"><div class="tiny muted">Productos cargados</div><div>${appState.products.length.toLocaleString('es-PE')}</div></div><div class="kv-row"><div class="tiny muted">Total detectados</div><div>${Number(branch?.lastSheetCount||0).toLocaleString('es-PE')}</div></div></div><div class="tiny muted">Vista previa (${products.length} filas)</div><div style="overflow:auto;flex:1;border:1px solid rgba(255,255,255,.08);border-radius:12px"><table class="table"><thead><tr><th>SKU</th><th>Nombre</th><th>Variante</th><th>Ubicación</th></tr></thead><tbody>${rowsHtml}</tbody></table></div></div></div>`;
    detailStatus.textContent='Sheet';
    detailChip.textContent=`${products.length} filas`;
  }

  function ensureBranchSheetFields(){
    appState.admin.branches = (appState.admin.branches||[]).map(b => ({
      ...b,
      sheetUrl: b.sheetUrl || '',
      sheetName: b.sheetName || 'Productos',
      sheetConnected: !!b.sheetConnected,
      lastSheetCount: Number(b.lastSheetCount || 0),
      sheetHeaders: Array.isArray(b.sheetHeaders) ? b.sheetHeaders : [],
      sheetStatusText: b.sheetStatusText || '',
      sheetHeaderIndex: Number.isFinite(Number(b.sheetHeaderIndex)) ? Number(b.sheetHeaderIndex) : 0,
      sheetPreviewProducts: Array.isArray(b.sheetPreviewProducts) ? b.sheetPreviewProducts : [],
      sheetMapRows: (Array.isArray(b.sheetMapRows) && b.sheetMapRows.length ? b.sheetMapRows : defaultSheetMapRows()).filter(row => row?.field !== 'video_url'),
      cardConfig: b.cardConfig && typeof b.cardConfig === 'object' ? b.cardConfig : null,
      sheetMeta: {
        status: b?.sheetMeta?.status || '',
        lastHeadersReadAt: Number(b?.sheetMeta?.lastHeadersReadAt || 0),
        lastImportedAt: Number(b?.sheetMeta?.lastImportedAt || 0),
        productCount: Number(b?.sheetMeta?.productCount || 0),
        headerCount: Number(b?.sheetMeta?.headerCount || 0),
        error: b?.sheetMeta?.error || '',
        loadingMessage: b?.sheetMeta?.loadingMessage || ''
      },
    }));
    appState.admin.branches.forEach(branch => { if(!Array.isArray(branch.sheetMapRows) || !branch.sheetMapRows.length) branch.sheetMapRows = defaultSheetMapRows(); ensureBranchMeta(branch); ensureBranchCardConfig(branch); });
  }

  
  function getSheetHeaderOptions(branch){
    const explicit = Array.isArray(branch?.sheetHeaders) ? branch.sheetHeaders.filter(Boolean) : [];
    const mapped = Array.isArray(branch?.sheetMapRows) ? branch.sheetMapRows.map(r => String(r?.header||'').trim()).filter(Boolean) : [];
    return Array.from(new Set([...explicit, ...mapped]));
  }

  function defaultCardConfig(branch){
    const headers = getSheetHeaderOptions(branch || {});
    const pick = (...keys) => headers.find(h => keys.some(k => norm(h).includes(norm(k)))) || '';
    return {
      titleHeader: pick('nombre','producto','descripcion') || 'Nombre',
      subtitleHeader: pick('sku','cod','modelo','barras') || 'Sku',
      imageHeader: pick('imagen','foto','image','img'),
      videoHeader: '',
      backdropHeader: pick('fondo','background'),
      mediaMode: 'image-first',
      layout: {
        width: 1180,
        height: 820,
        mediaPosition: 'left',
        alignX: 'center',
        alignY: 'top',
        offsetX: 0,
        offsetY: 0,
      },
      showDefaultLocation: true,
      showVariants: true,
      showActions: true,
      fields: [
        { id: uid('cardfld'), label:'Marca', header: pick('marca','brand'), visible: !!pick('marca','brand') },
        { id: uid('cardfld'), label:'Categoría', header: pick('categoria','categoría','category'), visible: !!pick('categoria','categoría','category') },
        { id: uid('cardfld'), label:'Precio', header: pick('p.lista','precio','price'), visible: !!pick('p.lista','precio','price') },
        { id: uid('cardfld'), label:'Restock', header: pick('restock','stock','cantidad'), visible: !!pick('restock','stock','cantidad') }
      ]
    };
  }

  function sanitizeCardLayout(layout){
    const source = layout && typeof layout === 'object' ? layout : {};
    const clamp = (value, min, max, fallback) => {
      const n = Number(value);
      if(!Number.isFinite(n)) return fallback;
      return Math.max(min, Math.min(max, n));
    };
    const allow = (value, list, fallback) => list.includes(value) ? value : fallback;
    return {
      width: clamp(source.width, 380, 1600, 1180),
      height: clamp(source.height, 420, 1200, 820),
      mediaPosition: allow(String(source.mediaPosition || ''), ['left','right','top'], 'left'),
      alignX: allow(String(source.alignX || ''), ['left','center','right'], 'center'),
      alignY: allow(String(source.alignY || ''), ['top','center','bottom'], 'top'),
      offsetX: clamp(source.offsetX, -320, 320, 0),
      offsetY: clamp(source.offsetY, -320, 320, 0)
    };
  }

  function ensureBranchCardConfig(branch){
    if(!branch || typeof branch !== 'object') return defaultCardConfig({});
    const base = defaultCardConfig(branch);
    const cfg = branch.cardConfig && typeof branch.cardConfig === 'object' ? branch.cardConfig : {};
    const isVideoHeader = (value) => ['video','video url','video_url','url video','url_video','link video','link_video','enlace video','enlace_video','video producto','video_producto'].includes(norm(value));
    const fields = (Array.isArray(cfg.fields) ? cfg.fields : base.fields).filter(f => !isVideoHeader(f?.header) && !isVideoHeader(f?.label));
    branch.cardConfig = {
      ...base,
      ...cfg,
      videoHeader: '',
      mediaMode: 'image-first',
      layout: sanitizeCardLayout(cfg.layout || base.layout),
      fields: fields.map((f, idx) => ({ id:f?.id || uid('cardfld'), label:String(f?.label || `Dato ${idx+1}`), header:String(f?.header || ''), visible:f?.visible !== false }))
    };
    return branch.cardConfig;
  }

  function getCardLayoutConfig(cfg){
    return sanitizeCardLayout(cfg?.layout || {});
  }

  function applyCardLayoutConfigToElement(element, cfg, { preview=false }={}){
    if(!element) return;
    const layout = getCardLayoutConfig(cfg);
    element.dataset.mediaPosition = layout.mediaPosition;
    element.dataset.previewAlignX = layout.alignX;
    element.dataset.previewAlignY = layout.alignY;
    element.style.setProperty('--card-custom-width', `${layout.width}px`);
    element.style.setProperty('--card-custom-height', `${layout.height}px`);
    element.style.setProperty('--card-offset-x', `${layout.offsetX}px`);
    element.style.setProperty('--card-offset-y', `${layout.offsetY}px`);
    if(preview){
      element.style.setProperty('--preview-offset-x', `${layout.offsetX}px`);
      element.style.setProperty('--preview-offset-y', `${layout.offsetY}px`);
    }
  }

  function getCardPreviewMediaHtml(item){
    if(!item || !item.url) return '<div class="designer-preview-empty">Sin imagen ni video</div>';
    if(item.type === 'video'){
      const driveDirectUrl = getDriveDirectVideoUrl(item.url);
      if(isDirectVideoUrl(item.url) || driveDirectUrl){
        return `<video src="${escapeHtml(driveDirectUrl || item.url)}" controls autoplay muted loop playsinline preload="auto"></video>`;
      }
      const embed = getVideoEmbedUrl(item.url, { autoplay:true });
      if(embed){
        return `<iframe src="${escapeHtml(embed)}" title="Video del producto" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
      }
      return `<div class="designer-preview-video-placeholder"><div class="play">▶</div><div><b>Video externo</b><small>Este enlace no se puede reproducir automáticamente dentro del card.</small><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Abrir video</a></div></div>`;
    }
    return `<img src="${escapeHtml(item.url)}" alt="Imagen del producto">`;
  }

  function buildCardDesignerPreviewMarkup(product, cfg){
    const previewProduct = product ? hydrateProductForCard(product) : null;
    const titleValue = previewProduct ? (productHeaderValue(previewProduct, cfg.titleHeader) || previewProduct.nombre || 'Sin nombre') : 'Sin producto';
    const subtitleValue = previewProduct ? (productHeaderValue(previewProduct, cfg.subtitleHeader) || previewProduct.sku || '—') : '—';
    const locationValue = previewProduct ? (previewProduct.ubicacion || '—') : '—';
    const storeValue = previewProduct ? (previewProduct.almacen || '—') : '—';
    const sizeValue = previewProduct ? getProductSizeValue(previewProduct) : '';
    const colorValue = previewProduct ? getProductColorValue(previewProduct) : '';
    const mediaItems = previewProduct ? getProductMediaItems(previewProduct) : [];
    const firstMedia = mediaItems[0] || null;
    const backdropUrl = previewProduct ? getProductBackdropUrl(previewProduct, firstMedia?.type === 'image' ? firstMedia?.url : '') : '';
    const mediaHeaders = new Set([cfg.imageHeader, cfg.videoHeader, cfg.backdropHeader].map(v => String(v || '').trim()).filter(Boolean));
    const customRows = (cfg.fields || []).filter(f => f.visible !== false && String(f.header || '').trim() && !mediaHeaders.has(String(f.header || '').trim())).map(f => {
      const value = previewProduct ? productHeaderValue(previewProduct, f.header) : '';
      if(!value) return '';
      return `<div class="active-card-custom-field"><span>${escapeHtml(f.label || f.header)}</span><b>${escapeHtml(value)}</b></div>`;
    }).filter(Boolean).join('');
    const thumbs = mediaItems.map((item, index) => `<button class="search-card-thumb ${index===0?'active':''}" type="button" tabindex="-1"><span>${item.type === 'video' ? '▶' : String(index+1).padStart(2,'0')}</span></button>`).join('');
    const variantsHtml = cfg.showVariants === false ? '' : `<div class="variant-groups"><div class="variant-group"><div class="variant-group-label">Talla</div><div class="variant-strip">${sizeValue ? `<span class="variant-chip static">${escapeHtml(sizeValue)}</span>` : '<span class="muted tiny">Sin talla detectada</span>'}</div></div><div class="variant-group"><div class="variant-group-label">Color</div><div class="variant-strip">${colorValue ? `<span class="variant-chip static">${escapeHtml(colorValue)}</span>` : '<span class="muted tiny">Sin color detectado</span>'}</div></div></div>`;
    const actionsHtml = cfg.showActions === false ? '' : `<div class="search-card-actions-row"><button class="action-btn secondary search-card-action" type="button">Ver ubicación</button><button class="action-btn primary search-card-action" type="button">Abrir visor</button></div>`;
    const metaHtml = cfg.showDefaultLocation === false ? '' : `<div class="search-card-meta"><div class="search-meta-block"><span class="search-meta-label">Ubicación</span><span class="search-meta-value">${escapeHtml(locationValue)}</span></div><div class="search-meta-block"><span class="search-meta-label">Ubicación en almacén</span><span class="search-meta-value store">${escapeHtml(storeValue)}</span></div></div>`;
    const layout = getCardLayoutConfig(cfg);
    const overlayClass = firstMedia?.type === 'video' ? ' card-video-overlay' : '';
    return `<div class="card-designer-stage"><div class="card-designer-stage-note tiny muted">Preview editable del card expandido. Ajusta medidas, posición y ubicación desde la configuración.</div><div class="card-designer-preview-host align-x-${layout.alignX} align-y-${layout.alignY}" id="cardDesignerPreviewHost"><div class="search-card search-card-expanded designer-preview-card${overlayClass}" id="cardDesignerPreviewCard" style="--product-bg-image:${toCssImageUrl(backdropUrl || (firstMedia?.type === 'image' ? firstMedia.url : ''))};"><div class="search-card-media-col ${backdropUrl || firstMedia?.type==='image' ? 'has-backdrop-image' : ''}"><div class="product-photo ${firstMedia ? '' : 'empty'}">${getCardPreviewMediaHtml(firstMedia)}</div><div class="search-card-gallery">${thumbs}</div><div class="search-card-gallery-nav"><button class="gallery-nav-btn" type="button" tabindex="-1">‹</button><span class="gallery-counter">${String(Math.max(1, mediaItems.length)).padStart(2,'0')} / ${String(Math.max(1, mediaItems.length)).padStart(2,'0')}</span><button class="gallery-nav-btn" type="button" tabindex="-1">›</button></div></div><div class="search-card-body"><div class="search-card-title-row"><div><div class="search-card-kicker">Producto</div><div class="search-card-title">${escapeHtml(titleValue)}</div><div class="search-card-sku">${escapeHtml(subtitleValue)}</div></div></div>${metaHtml}<div>${customRows ? `<div id="activeCardCustomFields" class="active-card-custom-fields">${customRows}</div>` : ''}<div class="muted tiny search-card-variant-copy">Variante activa: talla ${escapeHtml(sizeValue || '—')}${colorValue ? ` • color ${escapeHtml(colorValue)}` : ''}</div>${variantsHtml}</div>${actionsHtml}</div></div></div></div>`;
  }

  function renderCardDesignerPreviewPane(branch, cfg, product){
    detailWrap.innerHTML = `<div class="card-designer-preview-shell"><div class="card-designer-preview-meta"><div><div class="tiny muted">Producto usado para vista previa</div><h3>${escapeHtml(product?.nombre || 'Sin producto seleccionado')}</h3><div class="muted tiny">${escapeHtml(product?.sku || '')}</div></div><div class="designer-preview-asset-list"><div><span>Imagen detectada</span><b>${escapeHtml(productHeaderValue(product, cfg.imageHeader) || product?.imagen || '—')}</b></div><div><span>Video detectado</span><b>${escapeHtml(productHeaderValue(product, cfg.videoHeader) || product?.video_url || '—')}</b></div></div></div>${buildCardDesignerPreviewMarkup(product, cfg)}</div>`;
    const previewCard = document.getElementById('cardDesignerPreviewCard');
    if(previewCard) applyCardLayoutConfigToElement(previewCard, cfg, { preview:true });
    fitCardDesignerPreview();
  }

  function fitCardDesignerPreview(){
    const host = document.getElementById('cardDesignerPreviewHost');
    const card = document.getElementById('cardDesignerPreviewCard');
    if(!host || !card) return;
    const width = parseFloat(card.style.getPropertyValue('--card-custom-width') || card.style.width || 1180);
    const height = parseFloat(card.style.getPropertyValue('--card-custom-height') || card.style.height || 820);
    const rect = host.getBoundingClientRect();
    if(!rect.width || !rect.height) return;
    const scale = Math.max(0.22, Math.min((rect.width - 28) / width, (rect.height - 28) / height, 1));
    card.style.setProperty('--preview-scale', String(Number(scale.toFixed(3))));
  }

  function getActiveCardBranch(){
    const branches = Array.isArray(appState.admin?.branches) ? appState.admin.branches : [];
    const idx = Number.isFinite(Number(appState.activeBranchIndex)) ? Number(appState.activeBranchIndex) : Number(appState.admin?.activeBranch || 0);
    return branches[idx] || branches[0] || null;
  }

  function getActiveCardConfig(){
    return ensureBranchCardConfig(getActiveCardBranch());
  }

  function productHeaderValue(product, header){
    if(!product || !header) return '';
    const h = String(header || '').trim();
    if(!h) return '';
    if(product._raw && Object.prototype.hasOwnProperty.call(product._raw, h)) return String(product._raw[h] ?? '').trim();
    const branch = getActiveCardBranch();
    const mapped = Array.isArray(branch?.sheetMapRows) ? branch.sheetMapRows.find(r => String(r?.header||'').trim() === h) : null;
    if(mapped?.field && product[mapped.field] != null) return String(product[mapped.field] ?? '').trim();
    const compact = norm(h).replace(/[^a-z0-9]+/g,'');
    const aliases = {
      sku:['sku','codigo','codmodelo','codigomodelo','modelo'],
      nombre:['nombre','producto','descripcion','description','name'],
      variante:['variante','variant','linea'],
      talla:['talla','size'],
      color:['color','colour'],
      barras:['barras','barra','barcode','codigobarras'],
      imagen:['imagen','imagen1','image','image1','foto','foto1','fotografia','img','img1','urlimagen','linkimagen'],
      imagen2:['imagen2','image2','foto2','img2','urlimagen2','linkimagen2'],
      imagen3:['imagen3','image3','foto3','img3','urlimagen3','linkimagen3'],
      imagen4:['imagen4','image4','foto4','img4','urlimagen4','linkimagen4'],
      imagen5:['imagen5','image5','foto5','img5','urlimagen5','linkimagen5'],
      imagen6:['imagen6','image6','foto6','img6','urlimagen6','linkimagen6'],
      fondo_card:['fondocard','backgroundcard','imagenfondo','urlfondo','linkfondo'],
      ubicacion:['ubicacion','ubicacionfinal','location'],
      almacen:['almacen','ubicacionalmacen','warehouse'],
      zona:['zona'], estante:['estante','rack'], nivel:['nivel'], slot:['slot','posicion'],
      marca:['marca','brand'], categoria:['categoria','category'], genero:['genero','gender'], estado:['estado','status'], linea:['linea'], precio:['precio','plistaigv','plistamasigv','plist'], restock:['cantrestock','restock','stock','cantidad']
    };
    for(const [field, keys] of Object.entries(aliases)){
      if(keys.includes(compact) && product[field] != null) return String(product[field] ?? '').trim();
    }
    const directKey = Object.keys(product).find(k => norm(k).replace(/[^a-z0-9]+/g,'') === compact);
    return directKey ? String(product[directKey] ?? '').trim() : '';
  }

  function hydrateProductForCard(product){
    if(!product) return product;
    const cfg = getActiveCardConfig();
    const copy = { ...product };
    const img = productHeaderValue(product, cfg.imageHeader);
    const back = productHeaderValue(product, cfg.backdropHeader);
    if(img) copy._card_image_url = img;
    if(back) copy._card_backdrop_url = back;
    return copy;
  }

  function renderActiveCardCustomFields(product){
    const body = document.querySelector('#activeProductCard .search-card-body');
    if(!body) return;
    let host = document.getElementById('activeCardCustomFields');
    if(!host){
      host = document.createElement('div');
      host.id = 'activeCardCustomFields';
      host.className = 'active-card-custom-fields';
      const meta = document.getElementById('activeProductMeta');
      if(meta && meta.parentNode) meta.parentNode.insertBefore(host, meta.nextSibling);
      else body.appendChild(host);
    }
    const cfg = getActiveCardConfig();
    const mediaHeaders = new Set([cfg.imageHeader, cfg.videoHeader, cfg.backdropHeader].map(v => String(v || '').trim()).filter(Boolean));
    const rows = (cfg.fields || []).filter(f => f.visible !== false && String(f.header||'').trim() && !mediaHeaders.has(String(f.header || '').trim())).map(f => {
      const value = productHeaderValue(product, f.header);
      if(!value) return '';
      return `<div class="active-card-custom-field"><span>${escapeHtml(f.label || f.header)}</span><b>${escapeHtml(value)}</b></div>`;
    }).filter(Boolean);
    host.innerHTML = rows.join('');
    host.style.display = rows.length ? '' : 'none';
    const metaWrap = document.querySelector('#activeProductCard .search-card-meta');
    if(metaWrap) metaWrap.style.display = cfg.showDefaultLocation === false ? 'none' : '';
    const variants = document.querySelector('#activeProductCard .variant-groups');
    if(variants) variants.style.display = cfg.showVariants === false ? 'none' : '';
    const actions = document.querySelector('#activeProductCard .search-card-actions-row');
    if(actions) actions.style.display = cfg.showActions === false ? 'none' : '';
  }

  async function saveCardConfigForBranch(index){
    ensureBranchSheetFields();
    const branch = appState.admin.branches[index];
    if(!branch) return;
    ensureBranchCardConfig(branch);
    saveAdminState();
    if(!(typeof isLocalRuntimeForAuth === 'function' && isLocalRuntimeForAuth())){
      await saveRemoteAppState('Configuración');
    }
    updateActiveProductCard(appState.selectedProduct);
    showToast('Configuración guardada.', 'success');
  }

  function renderCardDesigner(){
    setScreen('sheet');
  }

function getSheetBranchOpenMap(){
    if(!appState.sheetBranchOpen || typeof appState.sheetBranchOpen !== 'object') appState.sheetBranchOpen = {0:true};
    return appState.sheetBranchOpen;
  }
  function getCurrentSheetBranchIndex(){
    const openMap = getSheetBranchOpenMap();
    const openKey = Object.keys(openMap).find(k => !!openMap[k]);
    const openIndex = Number(openKey);
    if(Number.isFinite(openIndex) && openIndex >= 0) return openIndex;
    const activeIndex = Number.isFinite(Number(appState.activeBranchIndex)) ? Number(appState.activeBranchIndex) : Number(appState.admin?.activeBranch || 0);
    return Number.isFinite(activeIndex) && activeIndex >= 0 ? activeIndex : 0;
  }

  async function readBranchHeaders(index){
    ensureBranchSheetFields();
    const branch = appState.admin.branches[index];
    if(!branch) return;
    const url = String(branch.sheetUrl||'').trim();
    const sheetName = String(branch.sheetName||'').trim();
    if(!url || !sheetName) throw new Error('Completa la URL/ID del Sheet y el nombre de la hoja.');
    setBranchMetaStatus(branch, BRANCH_STATUS.LOADING, { loadingMessage:'Leyendo fila 1…', headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) });
    saveAdminState();
    const data = await httpJson(`/api/sheets/rows?url=${encodeURIComponent(url)}&sheet=${encodeURIComponent(sheetName)}&headerOnly=1`);
    const detectedHeaders = Array.isArray(data.headers) ? data.headers.filter(Boolean) : [];
    if(!detectedHeaders.length){ throw new Error('La hoja no devolvió encabezados válidos en la fila 1.'); }
    const preservedHeaders = Array.isArray(branch.sheetHeaders) ? branch.sheetHeaders.filter(Boolean) : [];
    branch.sheetHeaders = detectedHeaders.length ? detectedHeaders : preservedHeaders;
    branch.sheetHeaderIndex = Number(data.headerIndex || branch.sheetHeaderIndex || 0);
    branch.sheetConnected = branch.sheetHeaders.length > 0;
    branch.sheetStatusText = detectedHeaders.length ? `Encabezados leídos: ${detectedHeaders.length} • fila ${branch.sheetHeaderIndex + 1}` : (branch.sheetConnected ? 'Usando encabezados guardados hasta releer la fila 1' : 'Sin encabezados');
    setBranchMetaStatus(branch, getSheetBranchProductCount(branch) ? BRANCH_STATUS.IMPORTED : (branch.sheetHeaders.length ? BRANCH_STATUS.HEADERS_LOADED : deriveBranchStatusAfterCleanup(branch)), { touchHeadersReadAt: !!detectedHeaders.length, headerCount: branch.sheetHeaders.length, productCount:getSheetBranchProductCount(branch) });
    const prefer = {
      sku:['sku','cod modelo','codigo','código'], nombre:['nombre','name','producto','descripcion'], variante:['variante','variant'], talla:['talla','size'], color:['color','colour'], ubicacion:['ubicacion','ubicación','location','ubicacion final'],
      barras:['barras','barcode','barra'], almacen:['almacen','almacén','warehouse'], zona:['zona'], estante:['estante','rack'], nivel:['nivel'], slot:['slot','posicion','posición']
    };
    (branch.sheetMapRows||[]).forEach(r=>{
      if(r.header) return;
      const hit = (branch.sheetHeaders||[]).find(h => (prefer[r.field]||[]).some(k => norm(h).includes(norm(k))));
      if(hit) r.header = hit;
    });
    saveAdminState();
    showToast(`Encabezados leídos: ${branch.sheetHeaders.length}.`, 'success');
  }


  async function persistBranchSheet(index, { includeProducts=false }={}){
    ensureBranchSheetFields();
    const branch = appState.admin.branches[index];
    if(!branch) return false;
    const branchId = Number(branch.id || 0);
    if(!branchId) throw new Error('La sucursal no tiene ID válido.');
    const payload = {
      sheet_id: String(branch.sheetUrl || '').trim(),
      sheet_name: String(branch.sheetName || 'Productos').trim(),
      source_type: 'google_sheet',
      sheet_map_rows: Array.isArray(branch.sheetMapRows) ? branch.sheetMapRows : null,
      last_sheet_count: Number(branch.lastSheetCount || 0),
      sheet_headers: Array.isArray(branch.sheetHeaders) ? branch.sheetHeaders : [],
      sheet_header_index: Number(branch.sheetHeaderIndex || 0)
    };
    if(includeProducts){
      payload.imported_products = Array.isArray(branch.sheetPreviewProducts)
        ? branch.sheetPreviewProducts.slice(0,50000)
        : [];
      payload.import_source = 'google-sheet-ui';
    }
    await httpJson(`/api/branches/${branchId}/sheet`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    return true;
  }

  async function persistBranchSheetMetadataOnly(index){
    ensureBranchSheetFields();
    const branch = appState.admin.branches[index];
    if(!branch) return false;
    const branchId = Number(branch.id || 0);
    if(!branchId) throw new Error('La sucursal no tiene ID válido.');
    const payload = {
      sheet_id: String(branch.sheetUrl || '').trim(),
      sheet_name: String(branch.sheetName || 'Productos').trim(),
      source_type: 'google_sheet',
      sheet_map_rows: Array.isArray(branch.sheetMapRows) ? branch.sheetMapRows : null,
      sheet_headers: Array.isArray(branch.sheetHeaders) ? branch.sheetHeaders : [],
      sheet_header_index: Number(branch.sheetHeaderIndex || 0)
    };
    await httpJson(`/api/branches/${branchId}/sheet-metadata`, {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(payload)
    });
    return true;
  }

  async function saveBranchSheetLink(index){
    ensureBranchSheetFields();
    const branch = appState.admin.branches[index];
    if(!branch) return;
    branch.sheetUrl = String(branch.sheetUrl||'').trim();
    branch.sheetName = String(branch.sheetName||'').trim();
    branch.sheetStatusText = 'Leyendo fila 1...';
    setBranchMetaStatus(branch, BRANCH_STATUS.LOADING, { loadingMessage:'Leyendo fila 1…', headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) });
    appState.sheetConfig.lastMode = 'google';
    saveAdminState();
    renderSheetScreen();
    try{
      await readBranchHeaders(index);
      await persistBranchSheet(index, { includeProducts:false });
      setBranchMetaStatus(branch, getSheetBranchProductCount(branch) ? BRANCH_STATUS.IMPORTED : (branch.sheetHeaders.length ? BRANCH_STATUS.HEADERS_LOADED : BRANCH_STATUS.LINKED), { headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) });
      contentStatus.textContent = 'Vinculación de sheet guardada en servidor.';
      renderSheetScreen();
    }catch(err){
      branch.sheetConnected = false;
      branch.sheetStatusText = err.message || 'No se pudieron leer encabezados';
      setBranchMetaStatus(branch, BRANCH_STATUS.ERROR, { error:branch.sheetStatusText, headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) });
      saveAdminState();
      renderSheetScreen();
      showToast(branch.sheetStatusText, 'error', 3800);
    }
  }

  function addSheetMapRow(index){
    const branch = appState.admin.branches[index]; if(!branch) return;
    branch.sheetMapRows.push({ id: uid('map'), field:'personalizado', label:'Encabezado', header:'' });
    saveAdminState(); renderSheetScreen();
  }
  function deleteSheetMapRow(index,rowId){
    const branch = appState.admin.branches[index]; if(!branch) return;
    branch.sheetMapRows = (branch.sheetMapRows||[]).filter(r=>r.id!==rowId);
    if(!branch.sheetMapRows.length) branch.sheetMapRows = defaultSheetMapRows();
    saveAdminState(); renderSheetScreen();
  }
  function moveSheetMapRow(index,rowId,dir){
    const branch = appState.admin.branches[index]; if(!branch) return;
    const rows = branch.sheetMapRows||[];
    const idx = rows.findIndex(r=>r.id===rowId); if(idx<0) return;
    const ni = idx + dir; if(ni<0 || ni>=rows.length) return;
    const tmp = rows[idx]; rows[idx]=rows[ni]; rows[ni]=tmp;
    saveAdminState(); renderSheetScreen();
  }
  async function saveBranchSheetMapping(index){
    ensureBranchSheetFields();
    const branch = appState.admin.branches[index]; if(!branch) return;
    const root = contentWrap.querySelector(`[data-sheet-branch="${index}"]`);
    if(!root) return;
    (branch.sheetMapRows||[]).forEach(row=>{
      const sel = root.querySelector(`[data-map-header="${row.id}"]`);
      const fld = root.querySelector(`[data-map-field="${row.id}"]`);
      const lbl = root.querySelector(`[data-map-label="${row.id}"]`);
      if(fld) row.field = fld.value;
      if(lbl) row.label = lbl.value;
      if(sel) row.header = sel.value;
    });
    branch.sheetStatusText = 'Mapeo guardado';
    setBranchMetaStatus(branch, getSheetBranchProductCount(branch) ? BRANCH_STATUS.IMPORTED : BRANCH_STATUS.MAPPED, { headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) });
    saveAdminState();
    if(!(typeof isLocalRuntimeForAuth === 'function' && isLocalRuntimeForAuth())){
      await persistBranchSheet(index, { includeProducts:false });
      contentStatus.textContent = 'Columnas de sheet guardadas en servidor.';
    }else{
      contentStatus.textContent = 'Columnas de sheet guardadas localmente.';
    }
    renderSheetScreen();
    showToast('Columnas visibles guardadas.', 'success');
  }

  async function saveBranchSheetCurrent(index){
    ensureBranchSheetFields();
    const branch = appState.admin.branches[index];
    if(!branch) return;
    appState.activeBranchIndex = index;
    if(appState.admin) appState.admin.activeBranch = index;

    const previousSourceSignature = getSheetSourceSignature(branch.sheetUrl || '', branch.sheetName || '');
    const previewBackup = Array.isArray(branch.sheetPreviewProducts) ? branch.sheetPreviewProducts.slice(0,50000) : [];
    const productsBackup = Array.isArray(appState.products) ? appState.products.slice(0,50000) : [];
    const filteredBackup = Array.isArray(appState.filtered) ? appState.filtered.slice(0,50000) : [];
    const selectedBackup = appState.selectedProduct ? { ...appState.selectedProduct } : null;

    const urlInput = contentWrap.querySelector(`[data-sheet-url="${index}"]`);
    const nameInput = contentWrap.querySelector(`[data-sheet-name="${index}"]`);
    if(urlInput) branch.sheetUrl = String(urlInput.value || '').trim();
    if(nameInput) branch.sheetName = String(nameInput.value || '').trim();
    const nextSourceSignature = getSheetSourceSignature(branch.sheetUrl || '', branch.sheetName || '');
    const sourceChanged = previousSourceSignature !== nextSourceSignature;
    const root = contentWrap.querySelector(`[data-sheet-branch="${index}"]`);
    if(root){
      (branch.sheetMapRows||[]).forEach(row=>{
        const sel = root.querySelector(`[data-map-header="${row.id}"]`);
        const fld = root.querySelector(`[data-map-field="${row.id}"]`);
        const lbl = root.querySelector(`[data-map-label="${row.id}"]`);
        if(fld) row.field = fld.value;
        if(lbl) row.label = lbl.value;
        if(sel) row.header = sel.value;
      });
    }

    if(sourceChanged){
      clearImportedProductsForBranch(index, { resetUi: appState.activeBranchIndex===index, clearHeaders:false });
      branch.sheetStatusText = 'Vinculación actualizada. Se conservaron los encabezados/mapeo guardados; vuelve a leer fila 1 si quieres revalidarlos antes de importar.';
      setBranchMetaStatus(branch, deriveBranchStatusAfterCleanup(branch), { headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) });
    }else{
      branch.sheetConnected = !!branch.sheetConnected || previewBackup.length > 0 || productsBackup.length > 0;
      branch.lastSheetCount = Number(branch.lastSheetCount || previewBackup.length || productsBackup.length || 0);
      branch.sheetStatusText = 'Cambios guardados';
      setBranchMetaStatus(branch, deriveBranchStatusAfterCleanup(branch), { headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) });
    }

    try{
      if(!(typeof isLocalRuntimeForAuth === 'function' && isLocalRuntimeForAuth())){
        if(sourceChanged) await persistBranchSheet(index, { includeProducts:true });
        else await persistBranchSheetMetadataOnly(index);
      }
      if(sourceChanged){
        setBranchMetaStatus(branch, deriveBranchStatusAfterCleanup(branch), { headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) });
        renderProducts(appState.filtered || []);
        countProducts.textContent = (appState.products || []).length.toLocaleString('es-PE');
        renderViewerMenu();
    renderSheetDetailPreview();
        contentStatus.textContent = 'Guardado: se limpió la importación anterior de la sucursal.';
      }else{
        setBranchMetaStatus(branch, deriveBranchStatusAfterCleanup(branch), { headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) });
        // Restaurar SIEMPRE el estado visible. Este botón no debe tocar productos ni vista previa.
        branch.sheetPreviewProducts = previewBackup.slice(0,50000);
        setProductDataset(productsBackup.slice(0,50000));
        appState.filtered = sortProductsStable((filteredBackup.length ? filteredBackup : productsBackup).slice(0,50000));
        if(selectedBackup) appState.selectedProduct = selectedBackup;
        renderProducts(appState.filtered);
        countProducts.textContent = appState.products.length.toLocaleString('es-PE');
        renderSheetDetailPreview();
        contentStatus.textContent = 'Guardado: cambios de vinculación';
      }
    }catch(err){
      console.error(err);
      if(!sourceChanged){
        branch.sheetPreviewProducts = previewBackup.slice(0,50000);
        setProductDataset(productsBackup.slice(0,50000));
        appState.filtered = sortProductsStable((filteredBackup.length ? filteredBackup : productsBackup).slice(0,50000));
      }
      if(selectedBackup) appState.selectedProduct = selectedBackup;
      setBranchMetaStatus(branch, BRANCH_STATUS.ERROR, { error:err.message || 'No se pudieron guardar los cambios de vinculación.', headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) });
      renderProducts(appState.filtered);
      countProducts.textContent = appState.products.length.toLocaleString('es-PE');
      renderSheetDetailPreview();
      alert(err.message || 'No se pudieron guardar los cambios de vinculación.');
    }
  }

  function buildImportedLocation(rec, mode='main'){
    const isStore = mode === 'store';
    const direct = String(isStore ? (rec.almacen || '') : (rec.ubicacion || '')).trim();
    if(direct) return direct;
    const z = String(isStore ? (rec.zona2 || rec.zonaStore || '') : (rec.zona || '')).trim();
    const e = String(isStore ? (rec.estante2 || rec.estanteStore || '') : (rec.estante || '')).trim();
    const n = String(isStore ? (rec.nivel2 || rec.nivelStore || '') : (rec.nivel || '')).trim();
    const s = String(isStore ? (rec.slot2 || rec.slotStore || '') : (rec.slot || '')).trim();
    return [z,e?`E${String(e).replace(/^E/i,'')}`:'',n?`N${String(n).replace(/^N/i,'')}`:'',s?`S${String(s).replace(/^S/i,'')}`:''].filter(Boolean).join('-');
  }

  async function importBranchSheet(index){
    ensureBranchSheetFields();
    const branch = appState.admin.branches[index]; if(!branch) return;
    const url = String(branch.sheetUrl||'').trim(); const sheetName = String(branch.sheetName||'').trim();
    if(!url || !sheetName){ showToast('Completa la URL/ID del Sheet y el nombre de la hoja.', 'error', 3600); return; }
    const issues = validateBranchSheetSetup(branch).filter(msg => !/leer la fila 1/i.test(msg) || !!(branch.sheetHeaders && branch.sheetHeaders.length));
    const currentSourceSignature = getSheetSourceSignature(url, sheetName);
    const hadImportedProducts = (Array.isArray(branch.sheetPreviewProducts) && branch.sheetPreviewProducts.length) || Number(branch.lastSheetCount || 0) > 0 || (appState.activeBranchIndex===index && Array.isArray(appState.products) && appState.products.length);
    if(hadImportedProducts){
      const replaceOk = await openAppModal({ title:'Reemplazar importación', message:[`La sucursal ${branchLabel(branch, index)} ya tiene productos importados.`,`Se reemplazará la información anterior por la nueva importación.`], actions:[{label:'Cancelar', value:false, cls:'secondary'},{label:'Reemplazar', value:true, cls:'primary'}] });
      if(!replaceOk) return;
      clearImportedProductsForBranch(index, { resetUi: appState.activeBranchIndex===index, clearHeaders:false });
    }
    if(issues.length){ await openAppModal({ title:'Validación de hoja', message: issues, actions:[{label:'Entendido', value:true, cls:'secondary'}] }); return; }
    if(!branch.sheetHeaders || !branch.sheetHeaders.length) {
      branch.sheetStatusText = 'Leyendo fila 1...';
      setBranchMetaStatus(branch, BRANCH_STATUS.LOADING, { loadingMessage:'Leyendo fila 1…', headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) });
      saveAdminState(); renderSheetScreen();
      try { await readBranchHeaders(index); } catch(err){ setBranchMetaStatus(branch, BRANCH_STATUS.ERROR, { error:err.message||'No se pudieron leer encabezados', headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) }); showToast(err.message||'No se pudieron leer encabezados', 'error', 3800); return; }
    }
    await saveBranchSheetMapping(index);
    branch.sheetStatusText = 'Importando productos sin borrar el mapeo de columnas...';
    setBranchMetaStatus(branch, BRANCH_STATUS.LOADING, { loadingMessage:'Importando productos…', headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) });
    saveAdminState(); renderSheetScreen();
    try{
      const data = await httpJson(`/api/sheets/rows?url=${encodeURIComponent(url)}&sheet=${encodeURIComponent(sheetName)}&limit=50000`);
      const headers = Array.isArray(data.headers)?data.headers:[];
      const rows = Array.isArray(data.rows)?data.rows:[];
      const headerIndex = Number(data.headerIndex || branch.sheetHeaderIndex || 0);
      const totalRows = Number(data.totalRows || rows.length || 0);
      const normalizedLookup = {};
      headers.forEach((h,i)=>{ normalizedLookup[norm(h)] = i; });
      const idxByHeader = Object.fromEntries(headers.map((h,i)=>[h,i]));
      const aliasByField = {
        sku:['sku','codigo','código','cod modelo','cod / modelo','modelo'],
        nombre:['nombre','producto','descripcion','descripción','name'],
        variante:['variante','variant','linea'],
        talla:['talla','size'],
        color:['color','colour'],
        categoria:['categoria','categoría','category'],
        genero:['genero','género','gender'],
        imagen:['imagen','imagen 1','imagen1','image','image 1','image1','foto','foto 1','foto1','fotografia','fotografía','img','img 1','img1','image url','url imagen','url de imagen','link imagen','enlace imagen'],
        imagen2:['imagen 2','imagen2','image 2','image2','foto 2','foto2','img 2','img2','url imagen 2','image url 2','link imagen 2','enlace imagen 2'],
        imagen3:['imagen 3','imagen3','image 3','image3','foto 3','foto3','img 3','img3','url imagen 3','image url 3','link imagen 3','enlace imagen 3'],
        imagen4:['imagen 4','imagen4','image 4','image4','foto 4','foto4','img 4','img4','url imagen 4','image url 4','link imagen 4','enlace imagen 4'],
        imagen5:['imagen 5','imagen5','image 5','image5','foto 5','foto5','img 5','img5','url imagen 5','image url 5','link imagen 5','enlace imagen 5'],
        imagen6:['imagen 6','imagen6','image 6','image6','foto 6','foto6','img 6','img6','url imagen 6','image url 6','link imagen 6','enlace imagen 6'],
        fondo_card:['fondo card','fondo_card','background card','background_card','imagen fondo','imagen_fondo','fondo','background image','background','url fondo','link fondo'],
        barras:['barras','barra','barcode','codigo de barras'],
        almacen:['almacen','almacén','warehouse','ubicacion almacen','ubicación almacén','ubicacion en almacen','ubicación en almacén'],
        zona:['zona'],
        estante:['estante','rack'],
        nivel:['nivel'],
        slot:['slot','posicion','posición'],
        ubicacion:['ubicacion','ubicación','ubicacion final','location'],
        zona2:['zona 2','zona2','zona (2)','zona(2)','zona almacen','zona almacén'],
        estante2:['estante 2','estante2','estante (2)','estante(2)','rack 2','rack2','rack almacen'],
        nivel2:['nivel 2','nivel2','nivel (2)','nivel(2)','nivel almacen'],
        slot2:['slot 2','slot2','slot (2)','slot(2)','posicion 2','posición 2','slot almacen']
      };
      const getVal = (row, header)=> header && Object.prototype.hasOwnProperty.call(idxByHeader, header) ? String(row[idxByHeader[header]]||'').trim() : '';
      const getAliasVal = (row, field) => {
        const aliases = aliasByField[field] || [];
        for (const alias of aliases){
          const idx = normalizedLookup[norm(alias)];
          if(Number.isInteger(idx)){
            const value = String(row[idx] || '').trim();
            if(value) return value;
          }
        }
        return '';
      };
      const list = rows.map((row,ri)=>{
        const rec = {};
        const rawRecord = {};
        headers.forEach((h, hi) => { if(String(h||'').trim()) rawRecord[String(h).trim()] = String(row[hi] || '').trim(); });
        (branch.sheetMapRows||[]).forEach(m=>{ if(m.header && m.field) rec[m.field]=getVal(row,m.header); });
        ['sku','nombre','variante','talla','color','categoria','genero','imagen','imagen2','imagen3','imagen4','imagen5','imagen6','fondo_card','barras','almacen','zona','estante','nivel','slot','ubicacion','zona2','estante2','nivel2','slot2'].forEach(field=>{
          if(!String(rec[field]||'').trim()) rec[field] = getAliasVal(row, field);
        });
        const ubicacion = normalizeLocationCode(buildImportedLocation(rec, 'main'));
        const almacenRaw = normalizeLocationCode(buildImportedLocation(rec, 'store'));
        const mainParsed = parseLocationCode(ubicacion || buildImportedLocation(rec, 'main'), 'Z1-E1');
        const storeFallback = /^Z\d+/i.test(almacenRaw || '') ? 'Z1-E1' : 'ALM-E1';
        const storeParsed = parseLocationCode(almacenRaw || '', storeFallback);
        const sku = String(rec.sku || '').trim();
        const nombre = String(rec.nombre || '').trim();
        const variante = String(rec.variante || '').trim();
        const barras = String(rec.barras || '').trim();
        const imagen = String(rec.imagen || '').trim();
        const talla = String(rec.talla || '').trim();
        const color = String(rec.color || '').trim();
        const categoria = String(rec.categoria || readProductRawValue({ _raw: rawRecord }, ['categoria','categoría','category']) || '').trim();
        const genero = canonicalGenderValue(String(rec.genero || readProductRawValue({ _raw: rawRecord }, ['genero','género','gender']) || '').trim());
        const imagen2 = String(rec.imagen2 || '').trim();
        const imagen3 = String(rec.imagen3 || '').trim();
        const imagen4 = String(rec.imagen4 || '').trim();
        const imagen5 = String(rec.imagen5 || '').trim();
        const imagen6 = String(rec.imagen6 || '').trim();
        const imagenes = [imagen, imagen2, imagen3, imagen4, imagen5, imagen6].filter(Boolean);
        const fondo_card = String(rec.fondo_card || '').trim();
        const almacen = storeParsed.raw || almacenRaw || '';
        return {
          sku,
          nombre,
          variante,
          barras,
          imagen,
          imagen2,
          imagen3,
          imagen4,
          imagenes,
          fondo_card,
          talla,
          color,
          categoria,
          category: categoria,
          genero,
          gender: genero,
          ubicacion: mainParsed.raw || ubicacion,
          almacen,
          zona: mainParsed.zoneId,
          rack: mainParsed.rackId,
          nivel: mainParsed.level,
          slot: mainParsed.slot,
          zonaStore: storeParsed.zoneId,
          rackStore: storeParsed.rackId,
          nivelStore: storeParsed.level,
          slotStore: storeParsed.slot,
          _raw: rawRecord,
          _rowIndex:ri + headerIndex + 2
        };
      }).filter(p=>p.sku || p.nombre || p.barras || p.ubicacion || p.almacen);

      setProductDataset(list);
      appState.filtered = appState.products.slice();
      syncBranchLayoutWithProducts(index, list);
      appState.activeBranchIndex = index;
      branch.sheetPreviewProducts = list.slice(0, 50000);
      branch.lastImportedSourceSignature = currentSourceSignature;
      if(list[0]) selectProduct(list[0]); else appState.selectedProduct = null;
      renderProducts(appState.filtered);
      saveProductsLocal(index);
      branch.lastSheetCount = totalRows || list.length;
      branch.sheetConnected = true;
      branch.sheetStatusText = `Importados: ${list.length.toLocaleString('es-PE')} • detectados ${branch.lastSheetCount.toLocaleString('es-PE')}`;
      branch.lastImportAt = new Date().toISOString();
      branch.lastImportStatus = list.length ? 'success' : 'empty';
      branch.lastImportSource = 'google-sheet-ui';
      branch.lastImportError = '';
      setBranchMetaStatus(branch, BRANCH_STATUS.IMPORTED, { touchImportedAt:true, headerCount:getSheetBranchHeaderCount(branch), productCount:list.length });
      saveAdminState();
      if(!(typeof isLocalRuntimeForAuth === 'function' && isLocalRuntimeForAuth())){
        await persistBranchSheet(index, { includeProducts:true });
        branch.sheetPreviewProducts = [];
        ensureProductPagingState().backendUnavailable = false;
        await requestProductsPage({ branchIndex:index, query:'', page:1, silent:true });
        await fetchProductsSummary(index);
        contentStatus.textContent = 'Productos importados en D1 y cargados por páginas.';
      }else{
        contentStatus.textContent = 'Productos importados y guardados localmente.';
      }
      renderSheetScreen();
      showToast(`Se importaron ${list.length.toLocaleString('es-PE')} productos.`, 'success', 3200);
    }catch(err){
      branch.sheetStatusText = err.message || 'Error al importar';
      branch.lastImportStatus = 'error';
      branch.lastImportError = branch.sheetStatusText;
      setBranchMetaStatus(branch, BRANCH_STATUS.ERROR, { error:branch.sheetStatusText, headerCount:getSheetBranchHeaderCount(branch), productCount:getSheetBranchProductCount(branch) });
      saveAdminState(); renderSheetScreen(); showToast(branch.sheetStatusText, 'error', 4000);
    }
  }

