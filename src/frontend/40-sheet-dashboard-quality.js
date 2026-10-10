  function toggleSheetExpanded(){
    appState.ui.sheetExpanded = !appState.ui.sheetExpanded;
    appRoot.classList.toggle('sheet-expanded', !!appState.ui.sheetExpanded);
    if(appState.screen === 'sheet') renderSheetScreen();
  }

  function renderSheetScreen(){
    ensureAppRuntimeState();
    ensureBranchSheetFields();
    const openMap = getSheetBranchOpenMap();
    contentTitle.textContent='Vincular Google Sheet';
    contentSubtitle.textContent='Guarda la URL del Sheet, la hoja y elige qué columnas quieres usar por sucursal';
    setTags([]);
    contentTags.insertAdjacentHTML('beforeend', `<button type="button" class="btn primary" id="btnSheetSaveCurrent">Guardar cambios</button>`);
    renderSheetDetailPreview();
    const currentSheetIndex = getCurrentSheetBranchIndex();
    const currentSheetBranch = (appState.admin?.branches || [])[currentSheetIndex];
    if(currentSheetBranch && Array.isArray(currentSheetBranch.sheetPreviewProducts) && currentSheetBranch.sheetPreviewProducts.length){
      applyBranchProducts(currentSheetBranch.sheetPreviewProducts.slice(0,50000), currentSheetIndex);
      if(currentSheetBranch.sheetPreviewProducts[0]) appState.selectedProduct = currentSheetBranch.sheetPreviewProducts[0];
      countProducts.textContent = currentSheetBranch.sheetPreviewProducts.length.toLocaleString('es-PE');
    }

    contentWrap.innerHTML = `<div class="form-wrap" style="height:100%;display:flex;flex-direction:column"><div class="branches-panel" style="min-height:0;flex:1;border-radius:22px;background:linear-gradient(180deg,rgba(9,22,40,.78),rgba(6,16,30,.9));box-shadow:0 20px 46px rgba(0,0,0,.24)"><div class="branches-scroll" style="max-height:none;flex:1;padding:18px" id="sheetBranchesList">${appState.admin.branches.map((b,i)=>{
      const isOpen = !!openMap[i];
      const statusInfo = getSheetBranchStatusInfo(b);
      const statusClass = `${statusInfo.cls} ${statusInfo.key.toLowerCase()}`;
      const statusText = statusInfo.label;
      const helperText = String(b.sheetStatusText || '').trim();
      const helperHtml = helperText && helperText !== statusText ? `<div class="tiny muted sheet-helper-text">${escapeHtml(helperText)}</div>` : '';
      const importStamp = b.lastImportAt || ensureBranchMeta(b).lastImportedAt;
      const importBadge = b.lastImportStatus ? `<span>Estado importación: ${escapeHtml(String(b.lastImportStatus || '').toUpperCase())}</span>` : '';
      const sourceBadge = b.lastImportSource ? `<span>Origen: ${escapeHtml(b.lastImportSource)}</span>` : '';
      const metaHtml = `<div class="sheet-branch-submeta"><span>Headers: ${Number(getSheetBranchHeaderCount(b) || 0).toLocaleString('es-PE')}</span><span>Productos: ${Number(getSheetBranchProductCount(b) || 0).toLocaleString('es-PE')}</span><span>Última importación: ${escapeHtml(formatMetaDate(importStamp))}</span>${importBadge}${sourceBadge}</div>`;
      const headerOptions = ['<option value="">(Sin seleccionar)</option>'].concat(getSheetHeaderOptions(b).map(h=>`<option value="${escapeHtml(h)}">${escapeHtml(h)}</option>`)).join('');
      const rowsHtml = (b.sheetMapRows||[]).map((row,idx)=>`<div class="sheet-map-row" style="display:grid;grid-template-columns:140px 1fr 34px 34px 34px;gap:8px;align-items:center;margin-top:10px"><select data-map-field="${row.id}"><option value="sku" ${row.field==='sku'?'selected':''}>SKU</option><option value="nombre" ${row.field==='nombre'?'selected':''}>Nombre</option><option value="variante" ${row.field==='variante'?'selected':''}>Variante</option><option value="talla" ${row.field==='talla'?'selected':''}>Talla</option><option value="color" ${row.field==='color'?'selected':''}>Color</option><option value="categoria" ${row.field==='categoria'?'selected':''}>Categoría</option><option value="genero" ${row.field==='genero'?'selected':''}>Género</option><option value="imagen" ${row.field==='imagen'?'selected':''}>Imagen 1</option><option value="imagen2" ${row.field==='imagen2'?'selected':''}>Imagen 2</option><option value="imagen3" ${row.field==='imagen3'?'selected':''}>Imagen 3</option><option value="imagen4" ${row.field==='imagen4'?'selected':''}>Imagen 4</option><option value="imagen5" ${row.field==='imagen5'?'selected':''}>Imagen 5</option><option value="imagen6" ${row.field==='imagen6'?'selected':''}>Imagen 6</option><option value="fondo_card" ${row.field==='fondo_card'?'selected':''}>Fondo card</option><option value="ubicacion" ${row.field==='ubicacion'?'selected':''}>Ubicación</option><option value="barras" ${row.field==='barras'?'selected':''}>Código de barras</option><option value="almacen" ${row.field==='almacen'?'selected':''}>Almacén</option><option value="zona" ${row.field==='zona'?'selected':''}>Zona</option><option value="estante" ${row.field==='estante'?'selected':''}>Estante</option><option value="nivel" ${row.field==='nivel'?'selected':''}>Nivel</option><option value="slot" ${row.field==='slot'?'selected':''}>Slot</option><option value="personalizado" ${row.field==='personalizado'?'selected':''}>Personalizado</option></select><select data-map-header="${row.id}">${headerOptions.replace(`value="${escapeHtml(row.header||'')}"`,`value="${escapeHtml(row.header||'')}" selected`)}</select><button class="tiny-btn" data-map-up="${i}:${row.id}">↑</button><button class="tiny-btn" data-map-down="${i}:${row.id}">↓</button><button class="tiny-btn" data-map-del="${i}:${row.id}">✕</button></div>`).join('');
      const isBusy = statusInfo.key === BRANCH_STATUS.LOADING;
      return `<div class="sheet-branch-card ${isOpen?'open':''}" data-sheet-branch="${i}"><div class="sheet-branch-head" data-sheet-toggle="${i}"><span class="sheet-branch-dot" style="background:${escapeHtml(b.color||(ZONE_COLOR_PALETTE[0] || '#ffd84d'))}"></span><div><div style="font-weight:800">${escapeHtml(b.name||('Sucursal '+(i+1)))}</div><div class="tiny muted">${escapeHtml((b.type||'tienda').toUpperCase())}</div>${helperHtml}</div><div class="sheet-branch-meta"><span class="status-badge ${statusClass}" data-status="${statusInfo.key}">${escapeHtml(statusText)}</span><button class="tiny-btn" type="button">${isOpen?'−':'+'}</button></div></div><div class="sheet-branch-body"><div class="sheet-branch-grid"><div class="grid"><label>URL / ID del Sheet</label><input data-sheet-url="${i}" placeholder="https://docs.google.com/spreadsheets/d/..." value="${escapeHtml(b.sheetUrl||'')}"></div><div class="grid"><label>Nombre de la hoja</label><input data-sheet-name="${i}" placeholder="Ej: Productos" value="${escapeHtml(b.sheetName||'Productos')}"></div></div><div class="sheet-actions"><button class="btn primary" data-sheet-save="${i}" ${isBusy?'disabled':''}>Leer fila 1</button><button class="btn secondary" data-sheet-import="${i}" ${isBusy?'disabled':''}>Importar productos</button><button class="btn secondary" data-sheet-clear-products="${i}" ${isBusy?'disabled':''}>Limpiar productos</button></div>${metaHtml}<div class="sheet-mini-preview"><div class="tiny muted">Paso 2 • Encabezados disponibles en la fila 1</div><div class="sheet-preview-row">${getSheetHeaderOptions(b).length ? getSheetHeaderOptions(b).map(h=>`<span class="sheet-preview-chip">${escapeHtml(h)}</span>`).join('') : '<span class="tiny muted">Aún no se leyeron encabezados.</span>'}</div><div style="margin-top:16px"><div class="sheet-actions" style="justify-content:flex-start"><button class="btn secondary" data-sheet-add-header="${i}">+ Encabezado</button><span class="tiny muted">Paso 3 • Elige qué columnas usar para producto, ubicación e imágenes</span></div>${rowsHtml}<div class="sheet-actions"><button class="btn secondary" data-sheet-map-save="${i}">Guardar columnas visibles</button></div></div></div></div></div>`;
    }).join('')}</div></div></div>`;

    contentWrap.querySelectorAll('[data-sheet-toggle]').forEach(el=>el.onclick=async (e)=>{ const i=+e.currentTarget.dataset.sheetToggle; const wasOpen=!!openMap[i]; Object.keys(openMap).forEach(k=>{openMap[k]=false;}); openMap[i]=!wasOpen; if(openMap[i]){ await activateBranchSelection(i); } renderSheetScreen(); });
    contentWrap.querySelectorAll('[data-sheet-url]').forEach(el=>{
      el.oninput=(e)=>{ const idx=+e.target.dataset.sheetUrl; appState.admin.branches[idx].sheetUrl=e.target.value; };
      el.onchange=(e)=>{ const idx=+e.target.dataset.sheetUrl; appState.admin.branches[idx].sheetUrl=e.target.value; markBranchDirty(idx); saveAdminState(); renderSheetScreen(); };
    });
    contentWrap.querySelectorAll('[data-sheet-name]').forEach(el=>{
      el.oninput=(e)=>{ const idx=+e.target.dataset.sheetName; appState.admin.branches[idx].sheetName=e.target.value; };
      el.onchange=(e)=>{ const idx=+e.target.dataset.sheetName; appState.admin.branches[idx].sheetName=e.target.value; markBranchDirty(idx); saveAdminState(); renderSheetScreen(); };
    });
    contentWrap.querySelectorAll('[data-sheet-save]').forEach(el=>el.onclick=(e)=>saveBranchSheetLink(+e.currentTarget.dataset.sheetSave));
    contentWrap.querySelectorAll('[data-sheet-import]').forEach(el=>el.onclick=(e)=>importBranchSheet(+e.currentTarget.dataset.sheetImport));
    contentWrap.querySelectorAll('[data-sheet-clear-products]').forEach(el=>el.onclick=(e)=>clearBranchImportedData(+e.currentTarget.dataset.sheetClearProducts,'products'));
        contentWrap.querySelectorAll('[data-sheet-map-save]').forEach(el=>el.onclick=(e)=>saveBranchSheetMapping(+e.currentTarget.dataset.sheetMapSave));
    contentWrap.querySelectorAll('[data-sheet-add-header]').forEach(el=>el.onclick=(e)=>addSheetMapRow(+e.currentTarget.dataset.sheetAddHeader));
    contentWrap.querySelectorAll('[data-map-del]').forEach(el=>el.onclick=(e)=>{ const [i,id] = e.currentTarget.dataset.mapDel.split(':'); deleteSheetMapRow(+i,id); });
    contentWrap.querySelectorAll('[data-map-up]').forEach(el=>el.onclick=(e)=>{ const [i,id] = e.currentTarget.dataset.mapUp.split(':'); moveSheetMapRow(+i,id,-1); });
    contentWrap.querySelectorAll('[data-map-down]').forEach(el=>el.onclick=(e)=>{ const [i,id] = e.currentTarget.dataset.mapDown.split(':'); moveSheetMapRow(+i,id,1); });
    contentWrap.querySelectorAll('[data-map-field],[data-map-header]').forEach(el=>el.onchange=(e)=>{
      const card=e.target.closest('[data-sheet-branch]');
      const idx=card?Number(card.dataset.sheetBranch):-1;
      if(idx<0) return;
      const branch = appState.admin.branches[idx];
      if(!branch) return;
      const rowId = e.target.dataset.mapField || e.target.dataset.mapHeader;
      const row = (branch.sheetMapRows||[]).find(item => item.id === rowId);
      if(row){
        if(e.target.dataset.mapField) row.field = e.target.value;
        if(e.target.dataset.mapHeader) row.header = e.target.value;
      }
      markBranchDirty(idx);
      saveAdminState();
      renderSheetScreen();
    });
    const btnSheetExpand = document.getElementById('btnSheetExpand');
    if(btnSheetExpand) btnSheetExpand.onclick = toggleSheetExpanded;
    const btnExportConfig = document.getElementById('btnExportConfig'); if(btnExportConfig) btnExportConfig.onclick = exportAdminConfig;
    const btnImportConfig = document.getElementById('btnImportConfig'); if(btnImportConfig) btnImportConfig.onclick = triggerImportConfig;
    const btnSheetSaveCurrent = document.getElementById('btnSheetSaveCurrent');
    if(btnSheetSaveCurrent) btnSheetSaveCurrent.onclick = async ()=>{ const idx = getCurrentSheetBranchIndex(); await saveBranchSheetCurrent(idx); };
  }


  function buildDashboardData(){
    const products = Array.isArray(appState.filtered) && appState.filtered.length ? appState.filtered : (appState.products || []);
    const racks = appState.layout?.racks || [];
    const zones = appState.layout?.zones || [];
    const summary = appState.productSummaryData || {};
    const remoteRackCounts = summary.rack_counts && typeof summary.rack_counts === 'object' ? summary.rack_counts : null;
    const byRack = new Map();
    if(remoteRackCounts){
      Object.entries(remoteRackCounts).forEach(([rid, count]) => { if(rid) byRack.set(rid, Number(count || 0)); });
    }else{
      products.forEach(p => {
        const rid = p?.rack || p?.rackStore || '';
        if(!rid) return;
        byRack.set(rid, (byRack.get(rid) || 0) + 1);
      });
    }
    const rackStats = racks.map(r => {
      const model = rackModel(r.modelId) || {};
      const capacity = getRackCapacity(model);
      const occupied = byRack.get(r.id) || 0;
      return {
        id: r.id,
        zoneId: r.zoneId || '—',
        model: model.name || r.modelId || '—',
        capacity,
        occupied,
        free: Math.max(0, capacity - occupied),
        occupancy: Math.min(100, capacity ? (occupied / capacity) * 100 : 0)
      };
    }).sort((a,b) => b.occupancy - a.occupancy || b.occupied - a.occupied || String(a.id).localeCompare(String(b.id)));
    const zoneStats = zones.map(z => {
      const zr = rackStats.filter(r => r.zoneId === z.id);
      const slots = zr.reduce((s,r) => s + r.capacity, 0);
      const occupied = zr.reduce((s,r) => s + r.occupied, 0);
      return {
        id: z.id,
        name: z.name || z.id,
        racks: zr.length,
        slots,
        occupied,
        free: Math.max(0, slots - occupied),
        occupancy: slots ? (occupied / slots) * 100 : 0
      };
    }).sort((a,b) => b.occupancy - a.occupancy || String(a.id).localeCompare(String(b.id)));
    const totalSlots = rackStats.reduce((s,r) => s + r.capacity, 0);
    const occupiedSlots = rackStats.reduce((s,r) => s + r.occupied, 0);
    const freeSlots = Math.max(0, totalSlots - occupiedSlots);
    const skuCount = Number(summary.sku_count || 0) || new Set(products.map(p => (p.sku || '').trim()).filter(Boolean)).size;
    const noRack = Number.isFinite(Number(summary.without_rack)) ? Number(summary.without_rack || 0) : products.filter(p => !(p?.rack || p?.rackStore)).length;
    const totalProducts = Number(summary.total || 0) || products.length;
    const racksNoLoad = rackStats.filter(r => r.occupied === 0).length;
    const topZone = zoneStats[0] || null;
    const fullestRack = rackStats[0] || null;
    return {
      products,
      racks,
      zones,
      skuCount,
      totalProducts,
      totalRacks: racks.length,
      totalZones: zones.length,
      totalSlots,
      occupiedSlots,
      freeSlots,
      occPct: totalSlots ? (occupiedSlots / totalSlots) * 100 : 0,
      noRack,
      racksNoLoad,
      topZone,
      fullestRack,
      zoneStats,
      rackStats
    };
  }

  function dashboardBarClass(value){
    if(value >= 85) return 'down';
    if(value >= 65) return 'warn';
    return 'good';
  }

  function renderDashboard(){
    setUnifiedMapLayout(false);
    const data = buildDashboardData();
    const selectedRackId = appState.selectedRackLayoutId || appState.selectedRack || data.rackStats[0]?.id || appState.layout?.racks?.[0]?.id || '';
    const selectedRack = findRackById(selectedRackId) || appState.layout?.racks?.[0] || null;
    const selectedZone = findZoneById(appState.selectedZoneId) || (selectedRack ? findZoneById(selectedRack.zoneId) : null) || appState.layout?.zones?.[0] || null;
    if(selectedRack && !appState.selectedRackLayoutId) appState.selectedRackLayoutId = selectedRack.id;
    if(selectedZone && !appState.selectedZoneId) appState.selectedZoneId = selectedZone.id;

    contentTitle.textContent = 'Dashboard WMS';
    const branchIdx = getActiveBranchContextIndex();
    const branchName = appState.admin?.branches?.[branchIdx]?.name || 'Sucursal activa';
    contentSubtitle.textContent = `Resumen operativo de ${branchName} con ocupación, alertas y foco rápido.`;
    setTags([`Sucursal: ${branchName}`, 'KPI', 'ocupación', 'alertas', 'racks', 'zonas']);

    const kpis = [
      { label:'Productos analizados', value:data.totalProducts.toLocaleString('es-PE'), foot:`${data.skuCount.toLocaleString('es-PE')} SKU únicos`, trend:'up', trendText:ensureProductPagingState().mode === 'backend' ? 'D1 global' : 'Inventario' },
      { label:'Capacidad total', value:data.totalSlots.toLocaleString('es-PE'), foot:`${data.freeSlots.toLocaleString('es-PE')} slots libres`, trend:data.freeSlots ? 'up' : 'down', trendText:data.freeSlots ? 'Disponible' : 'Lleno' },
      { label:'Ocupación general', value:`${Math.round(data.occPct)}%`, foot:`${data.occupiedSlots.toLocaleString('es-PE')} ocupados`, trend:dashboardBarClass(data.occPct), trendText:data.occPct >= 85 ? 'Crítico' : data.occPct >= 65 ? 'Atención' : 'Saludable' },
      { label:'Calidad de datos', value:`${data.noRack}`, foot:'productos sin rack', trend:data.noRack ? 'warn' : 'up', trendText:data.noRack ? 'Revisar' : 'OK' }
    ];

    const alerts = [];
    if(data.noRack) alerts.push({ cls:'warn', title:'Productos sin ubicación', text:`Hay ${data.noRack} productos sin rack asignado.` });
    if(data.fullestRack && data.fullestRack.occupancy >= 90) alerts.push({ cls:'down', title:'Rack casi saturado', text:`${data.fullestRack.id} está al ${Math.round(data.fullestRack.occupancy)}% de ocupación.` });
    if(data.racksNoLoad) alerts.push({ cls:'good', title:'Racks disponibles', text:`${data.racksNoLoad} racks no tienen carga y pueden recibir productos.` });
    if(!alerts.length) alerts.push({ cls:'good', title:'Sin alertas críticas', text:'La estructura actual no muestra bloqueos evidentes.' });

    contentWrap.innerHTML = `
      <div class="dashboard-grid">
        ${kpis.map(k => `<div class="dashboard-card kpi-card"><span class="tiny muted">${k.label}</span><b>${k.value}</b><div class="kpi-foot"><span>${k.foot}</span><span class="kpi-trend ${k.trend}">${k.trendText}</span></div></div>`).join('')}
        <div class="dashboard-card wide tall">
          <h4>Ocupación por zona</h4>
          <span class="tiny muted">Haz clic para enfocar una zona.</span>
          <div class="dash-zone-grid" style="margin-top:12px;">
            ${data.zoneStats.map(zone => `<button class="dash-zone-card ${selectedZone?.id===zone.id?'active':''}" data-dash-zone="${zone.id}" type="button"><div class="dash-progress-head"><b>${escapeHtml(zone.id)}</b><span>${Math.round(zone.occupancy)}%</span></div><div class="dash-bar ${dashboardBarClass(zone.occupancy)}"><span style="width:${Math.max(4, Math.min(100, zone.occupancy))}%"></span></div><div class="dash-mini-kv"><span>${zone.racks} racks</span><span>${zone.occupied}/${zone.slots} slots</span></div></button>`).join('') || `<div class="empty">No hay zonas cargadas.</div>`}
          </div>
        </div>
        <div class="dashboard-card wide tall">
          <h4>Racks con mayor ocupación</h4>
          <span class="tiny muted">Selecciona uno para verlo en detalle.</span>
          <div class="dash-top-list" style="margin-top:12px;">
            ${data.rackStats.slice(0,8).map(rack => `<button class="dash-top-item ${selectedRackId===rack.id?'active':''}" type="button" data-dash-rack="${rack.id}"><div class="dash-top-head"><b>${escapeHtml(rack.id)}</b><span>${Math.round(rack.occupancy)}%</span></div><div class="dash-bar ${dashboardBarClass(rack.occupancy)}"><span style="width:${Math.max(4, Math.min(100, rack.occupancy))}%"></span></div><div class="dash-top-meta"><span>${escapeHtml(rack.zoneId)} · ${escapeHtml(rack.model)}</span><span>${rack.occupied}/${rack.capacity}</span></div></button>`).join('') || `<div class="empty">No hay racks cargados.</div>`}
          </div>
        </div>
        <div class="dashboard-card wide">
          <h4>Alertas operativas</h4>
          <div class="dash-alert-list" style="margin-top:12px;">
            ${alerts.map(a => `<div class="dash-alert-item ${a.cls}"><b>${a.title}</b><span class="tiny muted">${a.text}</span></div>`).join('')}
          </div>
        </div>
        <div class="dashboard-card wide">
          <h4>Resumen rápido</h4>
          <div class="dash-alert-list" style="margin-top:12px;">
            <div class="dash-alert-item good"><b>Zonas activas</b><span class="tiny muted">${data.totalZones} zonas y ${data.totalRacks} racks modelados.</span></div>
            <div class="dash-alert-item ${dashboardBarClass(data.occPct)}"><b>Ocupación total</b><span class="tiny muted">${data.occupiedSlots} ocupados de ${data.totalSlots} slots.</span></div>
            <div class="dash-alert-item ${data.topZone ? dashboardBarClass(data.topZone.occupancy) : 'good'}"><b>Zona más exigida</b><span class="tiny muted">${data.topZone ? `${escapeHtml(data.topZone.id)} al ${Math.round(data.topZone.occupancy)}%` : 'Sin datos'}</span></div>
            <div class="dash-alert-item ${data.noRack ? 'warn' : 'good'}"><b>Integridad</b><span class="tiny muted">${data.noRack ? `${data.noRack} productos requieren ubicación.` : 'Todos los productos visibles tienen rack.'}</span></div>
          </div>
        </div>
      </div>`;

    detailTitle.textContent = selectedRack ? `Rack ${selectedRack.id}` : 'Detalle de rack';
    detailSubtitle.textContent = selectedRack ? `Zona ${selectedRack.zoneId || '—'} • Vista rápida del rack seleccionado` : 'Selecciona una zona o rack desde el dashboard.';
    detailWrap.innerHTML = `
      <div class="dash-detail-grid">
        <div class="dash-svg-wrap"><svg id="dashboardRackSvg" viewBox="-230 -310 470 520"></svg></div>
        <div class="dash-alert-list">
          <div class="dash-alert-item ${selectedRack ? dashboardBarClass((data.rackStats.find(r=>r.id===selectedRack.id)?.occupancy)||0) : 'good'}"><b>Rack activo</b><span class="tiny muted">${selectedRack ? `${escapeHtml(selectedRack.id)} • ${escapeHtml(selectedRack.zoneId || '—')}` : 'No hay rack seleccionado.'}</span></div>
          <div class="dash-alert-item good"><b>Modelo</b><span class="tiny muted">${selectedRack ? escapeHtml((rackModel(selectedRack.modelId)||{}).name || selectedRack.modelId || '—') : '—'}</span></div>
          <div class="dash-alert-item good"><b>Capacidad</b><span class="tiny muted">${selectedRack ? (()=>{ const s = data.rackStats.find(r=>r.id===selectedRack.id); return s ? `${s.capacity} slots • ${s.occupied} ocupados` : '—'; })() : '—'}</span></div>
          <div class="dash-alert-item ${selectedZone ? dashboardBarClass((data.zoneStats.find(z=>z.id===selectedZone.id)?.occupancy)||0) : 'good'}"><b>Zona enfocada</b><span class="tiny muted">${selectedZone ? `${escapeHtml(selectedZone.id)} • ${(data.zoneStats.find(z=>z.id===selectedZone.id)?.racks)||0} racks` : '—'}</span></div>
        </div>
      </div>`;

    const dashSvg = document.getElementById('dashboardRackSvg');
    if(dashSvg && selectedRack){
      const stat = data.rackStats.find(r => r.id === selectedRack.id);
      const level = stat?.occupied ? 1 : 0;
      renderRackDetail(selectedRack.id, { nivel: level, slot: stat?.occupied ? 1 : 0, label:'Rack activo', fullLabel:selectedRack.id }, dashSvg, rackModel(selectedRack.modelId), selectedRack);
    }

    contentStatus.textContent = `Dashboard listo • ${data.totalProducts.toLocaleString('es-PE')} productos analizados`;
    contentFootRight.textContent = selectedZone ? `${selectedZone.id} • ${Math.round((data.zoneStats.find(z=>z.id===selectedZone.id)?.occupancy)||0)}% ocupación` : '—';
    detailStatus.textContent = selectedRack ? `${selectedRack.id} • ${(data.rackStats.find(r=>r.id===selectedRack.id)?.occupied)||0} ocupados` : 'Sin rack seleccionado';
    detailChip.textContent = selectedRack ? `${(data.rackStats.find(r=>r.id===selectedRack.id)?.capacity)||0} slots` : '—';

    contentWrap.querySelectorAll('[data-dash-zone]').forEach(btn => btn.addEventListener('click', () => {
      appState.selectedZoneId = btn.dataset.dashZone;
      const firstRack = appState.layout.racks.find(r => r.zoneId === appState.selectedZoneId);
      if(firstRack) appState.selectedRackLayoutId = firstRack.id;
      renderDashboard();
    }));
    contentWrap.querySelectorAll('[data-dash-rack]').forEach(btn => btn.addEventListener('click', () => {
      const rackId = btn.dataset.dashRack;
      appState.selectedRackLayoutId = rackId;
      const rack = findRackById(rackId);
      if(rack?.zoneId) appState.selectedZoneId = rack.zoneId;
      renderDashboard();
    }));
  }


  function getViewerProductLocationContext(product = appState.selectedProduct){
    const layoutBranchIndex = getActiveLayoutBranchIndex();
    const branches = appState.admin?.branches || [];
    const activeBranch = branches[layoutBranchIndex] || branches[getActiveSheetBranchIndex()] || null;
    const rackIdsInLayout = new Set((appState.layout?.racks || []).map(r => r.id));
    const selectedProd = product || null;
    const productMatchesLayout = selectedProd && (
      (selectedProd.rack && rackIdsInLayout.has(selectedProd.rack)) ||
      (selectedProd.rackStore && rackIdsInLayout.has(selectedProd.rackStore))
    );
    const prod = productMatchesLayout ? selectedProd : selectedProd;
    const primaryRackId = (selectedProd?.rack && rackIdsInLayout.has(selectedProd.rack) ? selectedProd.rack : '') || (appState.selectedRack && rackIdsInLayout.has(appState.selectedRack) ? appState.selectedRack : '') || appState.layout.racks[0]?.id || '';
    const storeRackId = (selectedProd?.rackStore && rackIdsInLayout.has(selectedProd.rackStore) ? selectedProd.rackStore : '') || primaryRackId;
    const primaryLoc = selectedProd?.ubicacion || primaryRackId || '—';
    const storeLoc = selectedProd?.almacen || storeRackId || '—';
    return { layoutBranchIndex, activeBranch, rackIdsInLayout, prod, productMatchesLayout, primaryRackId, storeRackId, primaryLoc, storeLoc };
  }

  function renderIsoLocationSvg(svg, prod = appState.selectedProduct){
    if(!svg) return;
    svg.innerHTML = '';
    const defs = svgEl('defs');
    const glow = svgEl('filter',{id:'mapGlowLocationModal',x:'-40%',y:'-40%',width:'180%',height:'180%'});
    glow.appendChild(svgEl('feDropShadow',{dx:'0',dy:'0',stdDeviation:'10','flood-color':'#50e37b','flood-opacity':'.55'}));
    defs.appendChild(glow); svg.appendChild(defs);
    const root = svgEl('g',{id:'locationModalMapRoot',transform:'translate(0 0) scale(1)'}); svg.appendChild(root);

    const bounds = getLayoutContentBounds();
    const padX = Math.max(280, bounds.w * 0.22);
    const padY = Math.max(280, bounds.h * 0.22);
    const floorRect = { x: bounds.x - padX, y: bounds.y - padY, w: bounds.w + padX * 2, h: bounds.h + padY * 2 };
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
      const a = toIso(gx, floorRect.y, 0); const b = toIso(gx, floorRect.y + floorRect.h, 0);
      isoGrid.appendChild(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'rgba(120,162,210,.22)','stroke-width':'1'}));
    }
    for(let gy = Math.floor(floorRect.y / gridStep) * gridStep; gy <= floorRect.y + floorRect.h; gy += gridStep){
      const a = toIso(floorRect.x, gy, 0); const b = toIso(floorRect.x + floorRect.w, gy, 0);
      isoGrid.appendChild(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'rgba(120,162,210,.22)','stroke-width':'1'}));
    }
    root.appendChild(isoGrid);

    let projected = [
      toIso(floorRect.x, floorRect.y, 0),
      toIso(floorRect.x + floorRect.w, floorRect.y, 0),
      toIso(floorRect.x + floorRect.w, floorRect.y + floorRect.h, 0),
      toIso(floorRect.x, floorRect.y + floorRect.h, 0)
    ];
    (appState.layout?.zones || []).forEach(z => {
      const pts = z.pts.map(p => toIso(p.x, p.y, 0));
      projected.push(...pts);
      const isMainZone = prod?.zona === z.id;
      const isStoreZone = prod?.zonaStore === z.id;
      const isSearchZone = (prod?.zona || prod?.zonaStore) === z.id;
      const zoneColor = z.color || getBranchColor(getActiveLayoutBranchIndex()) || '#ffd84d';
      const path = svgEl('path',{d:`M ${pts.map(pt => `${pt.x} ${pt.y}`).join(' L ')} Z`,class:'zone-floor' + (isMainZone ? ' active' : '') + (isStoreZone ? ' storage' : '') + (isSearchZone ? ' search-focus' : ''),fill:hexToRgba(zoneColor, isSearchZone ? 0.30 : 0.22),stroke:hexToRgba(zoneColor, isSearchZone ? 0.98 : 0.92),'stroke-width':isSearchZone ? '2.8' : '2.1'});
      root.appendChild(path);
      const c = centroid(z.pts); const ci = toIso(c.x,c.y,0);
      projected.push(ci);
      const label = svgEl('text',{x:ci.x,y:ci.y,class:'zone-label','text-anchor':'middle'}); label.textContent = z.id; root.appendChild(label);
    });
    const racks = (appState.layout?.racks || []).slice().sort((a,b)=>(a.x+a.y+Number(a.baseHeight||0))-(b.x+b.y+Number(b.baseHeight||0)));
    racks.forEach(r => {
      const rackGroup = buildIsoRack(r, prod);
      root.appendChild(rackGroup.group);
      if(Array.isArray(rackGroup.projectedPoints)) projected.push(...rackGroup.projectedPoints);
    });
    if(projected.length){
      const minX = Math.min(...projected.map(p => p.x)); const maxX = Math.max(...projected.map(p => p.x));
      const minY = Math.min(...projected.map(p => p.y)); const maxY = Math.max(...projected.map(p => p.y));
      const padVX = Math.max(80, (maxX - minX) * 0.12); const padVY = Math.max(80, (maxY - minY) * 0.16);
      svg.setAttribute('viewBox', `${Math.floor(minX - padVX)} ${Math.floor(minY - padVY)} ${Math.ceil((maxX - minX) + padVX * 2)} ${Math.ceil((maxY - minY) + padVY * 2)}`);
    }
    enablePanZoom(svg, root, focusBoundsForProduct(prod), { tx:0, ty:0, scale:1.25 });
  }



  function getRackRenderHeight3D(r){
    const model = appState.models.find(m => m.id === r.modelId) || appState.models[0] || {};
    return Math.max(50, Number(r.rackHeight || model.height || 180) * 0.65);
  }

  function getScene3DBounds(){
    const pts = [];
    (appState.layout?.zones || []).forEach(z => (z.pts || []).forEach(pt => pts.push({x:Number(pt.x)||0,y:Number(pt.y)||0})));
    (appState.layout?.racks || []).forEach(r => {
      const x=Number(r.x)||0, y=Number(r.y)||0, w=Math.max(10,Number(r.w)||80), d=Math.max(10,Number(r.h)||40);
      pts.push({x,y},{x:x+w,y},{x:x+w,y:y+d},{x,y:y+d});
    });
    if(!pts.length) pts.push({x:-200,y:-160},{x:200,y:160});
    const minX = Math.min(...pts.map(p=>p.x)), maxX = Math.max(...pts.map(p=>p.x));
    const minY = Math.min(...pts.map(p=>p.y)), maxY = Math.max(...pts.map(p=>p.y));
    return { minX, maxX, minY, maxY, w:Math.max(1,maxX-minX), h:Math.max(1,maxY-minY), cx:(minX+maxX)/2, cy:(minY+maxY)/2 };
  }


  function productHasValidLocation(product){
    const p = product || {};
    return !!String(p.ubicacion || p.location || '').trim();
  }

  function isProbablyUrl(value){
    const v = String(value || '').trim();
    if(!v) return false;
    if(/^https?:\/\//i.test(v)) return true;
    if(/^data:image\//i.test(v)) return true;
    if(/^\/\//.test(v)) return true;
    if(/^\/[^\s]+\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i.test(v)) return true;
    return false;
  }

  function getProductLocationIssue(product, mode='primary'){
    const p = product || {};
    const loc = String(mode === 'store' ? (p.almacen || '') : (p.ubicacion || '')).trim();
    if(!loc) return mode === 'store' ? 'Sin ubicación de almacén' : 'Sin ubicación';
    const parsed = mode === 'store'
      ? parseLocationCode(loc, /^Z\d+/i.test(loc) ? 'Z1-E1' : 'ALM-E1')
      : parseLocationCode(loc, 'Z1-E1');
    const rackId = mode === 'store' ? (p.rackStore || parsed.rackId || '') : (p.rack || parsed.rackId || '');
    if(rackId && !findRackById(rackId)) return `Rack no existe: ${rackId}`;
    if(rackId){
      const rack = findRackById(rackId);
      const model = rack ? (appState.models.find(m => m.id === rack.modelId) || appState.models[0] || {}) : {};
      const levels = Math.max(1, Number(model.levels || 4));
      const slots = Math.max(1, Number(model.slots || 2));
      const level = Number(mode === 'store' ? (p.nivelStore || parsed.level || 0) : (p.nivel || parsed.level || 0));
      const slot = Number(mode === 'store' ? (p.slotStore || parsed.slot || 0) : (p.slot || parsed.slot || 0));
      if(level && (level < 1 || level > levels)) return `Nivel fuera de rango: N${level} / máximo N${levels}`;
      if(slot && (slot < 1 || slot > slots)) return `Slot fuera de rango: S${slot} / máximo S${slots}`;
    }
    return '';
  }

  function analyzeInventoryData(){
    const products = Array.isArray(appState.products) ? appState.products : [];
    const racks = Array.isArray(appState.layout?.racks) ? appState.layout.racks : [];
    const zones = Array.isArray(appState.layout?.zones) ? appState.layout.zones : [];
    const counters = {
      total:products.length,
      missingName:0,
      missingSku:0,
      missingBarcode:0,
      missingCategory:0,
      missingGender:0,
      missingImage:0,
      invalidImage:0,
      missingLocation:0,
      missingStoreLocation:0,
      badLocation:0,
      badStoreLocation:0,
      rackMissing:0,
      duplicateSku:0,
      duplicateBarcode:0,
      emptyRacks:0,
      occupiedRacks:0,
      overCapacityRacks:0,
      racksTotal:racks.length,
      zonesTotal:zones.length
    };
    const issues = [];
    const skuMap = new Map();
    const barcodeMap = new Map();
    const rackUsage = new Map(racks.map(r => [r.id, { id:r.id, products:0, capacity:0, zoneId:r.zoneId || '', overflow:0 }]));
    const zoneUsage = new Map(zones.map(z => [z.id, { id:z.id, name:z.name || z.id, products:0, racks:0 }]));
    racks.forEach(r => {
      const model = appState.models.find(m => m.id === r.modelId) || appState.models[0] || {};
      const capacity = Math.max(1, Number(model.levels || 4)) * Math.max(1, Number(model.slots || 2));
      const item = rackUsage.get(r.id);
      if(item) item.capacity = capacity;
      const z = zoneUsage.get(r.zoneId);
      if(z) z.racks += 1;
    });
    const addIssue = (severity, type, detail, product=null, extra={}) => {
      const row = product?._rowIndex || extra.row || '—';
      const sku = String(product?.sku || extra.sku || '').trim() || '—';
      const name = String(product?.nombre || extra.name || '').trim() || '—';
      issues.push({ severity, row, sku, name, type, detail, ...extra });
    };
    products.forEach((p, idx) => {
      const sku = String(p?.sku || '').trim();
      const barcode = String(p?.barras || '').trim();
      const name = String(p?.nombre || '').trim();
      if(sku){ const key = norm(sku); if(!skuMap.has(key)) skuMap.set(key, []); skuMap.get(key).push(p); }
      if(barcode){ const key = norm(barcode); if(!barcodeMap.has(key)) barcodeMap.set(key, []); barcodeMap.get(key).push(p); }
      if(!name){ counters.missingName++; addIssue('Alta','Sin nombre','El producto no tiene nombre. Esto impide mostrarlo correctamente.',p); }
      if(!sku){ counters.missingSku++; addIssue('Alta','Sin SKU','No se detectó SKU/código. Afecta búsqueda, picking y cruce con Bsale.',p); }
      if(!barcode){ counters.missingBarcode++; }
      if(!getProductCategoryValue(p)){ counters.missingCategory++; addIssue('Media','Sin categoría','Completa la columna Categoria/Categoría para que los filtros funcionen.',p); }
      if(!getProductGenderValue(p)){ counters.missingGender++; addIssue('Media','Sin género','Completa la columna Genero/Género: Mujer, Varón, Niños o Niñas.',p); }
      const imgs = getProductImageUrls(p);
      if(!imgs.length){ counters.missingImage++; addIssue('Baja','Sin imagen','No hay Imagen 1–6 para este producto.',p); }
      else {
        const badImgs = imgs.filter(v => !isProbablyUrl(v));
        if(badImgs.length){ counters.invalidImage++; addIssue('Media','Imagen inválida',`Hay ${badImgs.length} imagen(es) con formato no reconocido. Usa URL https o data:image.`,p); }
      }
      const locIssue = getProductLocationIssue(p, 'primary');
      if(locIssue){
        if(locIssue === 'Sin ubicación') counters.missingLocation++;
        else counters.badLocation++;
        if(locIssue.startsWith('Rack no existe')) counters.rackMissing++;
        addIssue(locIssue === 'Sin ubicación' ? 'Alta' : 'Alta','Ubicación principal',locIssue,p);
      }
      const storeIssue = getProductLocationIssue(p, 'store');
      if(storeIssue){
        if(storeIssue === 'Sin ubicación de almacén') counters.missingStoreLocation++;
        else counters.badStoreLocation++;
        if(storeIssue.startsWith('Rack no existe')) counters.rackMissing++;
        addIssue(storeIssue === 'Sin ubicación de almacén' ? 'Media' : 'Alta','Ubicación almacén',storeIssue,p);
      }
      [p?.rack, p?.rackStore].filter(Boolean).forEach(rid => {
        const usage = rackUsage.get(rid);
        if(usage) usage.products += 1;
      });
      [p?.zona, p?.zonaStore].filter(Boolean).forEach(zid => {
        const usage = zoneUsage.get(zid);
        if(usage) usage.products += 1;
      });
    });
    skuMap.forEach((items, key) => {
      if(items.length > 1){
        counters.duplicateSku += items.length;
        items.slice(0, 30).forEach(p => addIssue('Alta','SKU duplicado',`El SKU aparece ${items.length} veces. Revisa variantes o códigos repetidos.`,p,{ duplicateKey:key }));
      }
    });
    barcodeMap.forEach((items, key) => {
      if(items.length > 1){
        counters.duplicateBarcode += items.length;
        items.slice(0, 30).forEach(p => addIssue('Media','Barras duplicadas',`El código de barras aparece ${items.length} veces.`,p,{ duplicateKey:key }));
      }
    });
    const rackStats = Array.from(rackUsage.values()).map(r => {
      const overflow = Math.max(0, Number(r.products || 0) - Number(r.capacity || 0));
      r.overflow = overflow;
      if(Number(r.products || 0) <= 0) counters.emptyRacks++;
      else counters.occupiedRacks++;
      if(overflow > 0){ counters.overCapacityRacks++; addIssue('Media','Rack sobrecapacidad',`${r.id} tiene ${r.products} productos para ${r.capacity} posiciones estimadas.`,null,{ row:'—', sku:r.id, name:'Rack', rackId:r.id }); }
      return r;
    }).sort((a,b) => (b.products - a.products) || String(a.id).localeCompare(String(b.id)));
    const zoneStats = Array.from(zoneUsage.values()).sort((a,b) => (b.products - a.products) || String(a.id).localeCompare(String(b.id)));
    const high = issues.filter(i => i.severity === 'Alta').length;
    const medium = issues.filter(i => i.severity === 'Media').length;
    const low = issues.filter(i => i.severity === 'Baja').length;
    const weighted = high * 3 + medium * 1.6 + low * .6;
    const base = Math.max(1, counters.total * 3);
    const score = Math.max(0, Math.min(100, Math.round(100 - (weighted / base) * 100)));
    return { counters, issues, rackStats, zoneStats, score, severity:{ high, medium, low } };
  }

  function exportDataQualityCsv(report){
    const data = report || analyzeInventoryData();
    const header = ['Severidad','Fila','SKU','Producto','Tipo','Detalle'];
    const esc = value => `"${String(value ?? '').replace(/"/g,'""')}"`;
    const lines = [header.map(esc).join(',')].concat((data.issues || []).map(i => [i.severity,i.row,i.sku,i.name,i.type,i.detail].map(esc).join(',')));
    const blob = new Blob([lines.join('\n')], { type:'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostico-wms-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
    showToast('Reporte CSV descargado.', 'success');
  }

  function openDataQualityModal(){
    const existing = document.getElementById('dataQualityModal');
    if(existing) existing.remove();
    const report = analyzeInventoryData();
    const { counters, issues, rackStats, zoneStats, score, severity } = report;
    const cards = [
      ['Productos', counters.total, 'registros importados', 'ok'],
      ['Calidad', `${score}%`, `${severity.high} altas · ${severity.medium} medias`, score >= 85 ? 'ok' : 'warn'],
      ['Sin ubicación', counters.missingLocation, 'ubicación principal vacía', 'warn'],
      ['Ubicación inválida', counters.badLocation + counters.badStoreLocation, 'rack, nivel o slot', 'warn'],
      ['Racks no encontrados', counters.rackMissing, 'no existen en layout', 'warn'],
      ['SKU duplicado', counters.duplicateSku, 'registros afectados', 'warn'],
      ['Barras duplicadas', counters.duplicateBarcode, 'registros afectados', 'warn'],
      ['Sin nombre', counters.missingName, 'deben corregirse', 'warn'],
      ['Sin SKU', counters.missingSku, 'afecta búsquedas', 'warn'],
      ['Sin categoría', counters.missingCategory, 'afecta filtros', 'warn'],
      ['Sin género', counters.missingGender, 'afecta filtros', 'warn'],
      ['Imágenes inválidas', counters.invalidImage, 'URL no reconocida', 'warn'],
      ['Racks vacíos', counters.emptyRacks, `${counters.racksTotal} racks en layout`, counters.emptyRacks ? 'neutral' : 'ok'],
      ['Sobrecapacidad', counters.overCapacityRacks, 'racks con exceso estimado', 'warn'],
      ['Zonas', counters.zonesTotal, 'zonas del layout', 'ok'],
      ['Racks ocupados', counters.occupiedRacks, 'con productos vinculados', 'ok']
    ].map(([label, value, hint, state]) => `<div class="dq-card ${state === 'warn' && Number(value)>0 ? 'warn' : state === 'neutral' ? 'neutral' : ''}"><b>${typeof value === 'number' ? Number(value||0).toLocaleString('es-PE') : escapeHtml(value)}</b><span>${escapeHtml(label)}</span><small>${escapeHtml(hint)}</small></div>`).join('');
    const rows = issues.slice(0, 160).map(item => `<tr><td><span class="dq-severity ${norm(item.severity)}">${escapeHtml(item.severity)}</span></td><td>${escapeHtml(String(item.row))}</td><td>${escapeHtml(item.sku)}</td><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(item.detail)}</td></tr>`).join('');
    const rackRows = rackStats.slice(0, 18).map(r => `<tr><td>${escapeHtml(r.id)}</td><td>${escapeHtml(r.zoneId || '—')}</td><td>${Number(r.products||0).toLocaleString('es-PE')}</td><td>${Number(r.capacity||0).toLocaleString('es-PE')}</td><td>${r.overflow ? `<span class="dq-severity media">+${r.overflow}</span>` : 'OK'}</td></tr>`).join('');
    const zoneRows = zoneStats.slice(0, 12).map(z => `<tr><td>${escapeHtml(z.id)}</td><td>${escapeHtml(z.name || z.id)}</td><td>${Number(z.racks||0).toLocaleString('es-PE')}</td><td>${Number(z.products||0).toLocaleString('es-PE')}</td></tr>`).join('');
    const modal = document.createElement('div');
    modal.id = 'dataQualityModal';
    modal.className = 'data-quality-backdrop show';
    modal.innerHTML = `
      <div class="data-quality-shell dq-health-shell">
        <div class="data-quality-head">
          <div><div class="search-card-kicker">Control de calidad · v53</div><h2>Salud del almacén</h2><p>Sucursal: ${escapeHtml((appState.admin?.branches || [])[getActiveBranchContextIndex()]?.name || 'Sucursal activa')} · valida productos, ubicaciones, racks, duplicados e imágenes antes de operar picking, reposición o Bsale.</p></div>
          <div class="data-quality-actions"><span class="dq-score ${score < 75 ? 'danger' : score < 90 ? 'warning' : ''}">Calidad ${score}%</span><button class="iso-tool" type="button" data-dq-export>Exportar CSV</button><button class="location-modal-close" type="button" aria-label="Cerrar">✕</button></div>
        </div>
        <div class="data-quality-grid dq-health-grid">${cards}</div>
        <div class="dq-health-tabs">
          <button class="active" data-dq-tab="issues">Observaciones</button>
          <button data-dq-tab="racks">Racks</button>
          <button data-dq-tab="zones">Zonas</button>
        </div>
        <div class="data-quality-table-wrap dq-tab-panel active" data-dq-panel="issues">
          <div class="data-quality-table-head"><b>Observaciones detectadas</b><span>${issues.length.toLocaleString('es-PE')} alertas encontradas · se muestran hasta 160</span></div>
          <table class="data-quality-table"><thead><tr><th>Severidad</th><th>Fila</th><th>SKU</th><th>Producto</th><th>Tipo</th><th>Detalle</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No se detectaron observaciones críticas.</td></tr>'}</tbody></table>
        </div>
        <div class="data-quality-table-wrap dq-tab-panel" data-dq-panel="racks">
          <div class="data-quality-table-head"><b>Uso por rack</b><span>${rackStats.length.toLocaleString('es-PE')} racks revisados</span></div>
          <table class="data-quality-table"><thead><tr><th>Rack</th><th>Zona</th><th>Productos</th><th>Capacidad estimada</th><th>Estado</th></tr></thead><tbody>${rackRows || '<tr><td colspan="5">No hay racks creados en el layout.</td></tr>'}</tbody></table>
        </div>
        <div class="data-quality-table-wrap dq-tab-panel" data-dq-panel="zones">
          <div class="data-quality-table-head"><b>Uso por zona</b><span>${zoneStats.length.toLocaleString('es-PE')} zonas revisadas</span></div>
          <table class="data-quality-table"><thead><tr><th>Zona</th><th>Nombre</th><th>Racks</th><th>Productos vinculados</th></tr></thead><tbody>${zoneRows || '<tr><td colspan="4">No hay zonas creadas en el layout.</td></tr>'}</tbody></table>
        </div>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('.location-modal-close')?.addEventListener('click', close);
    modal.querySelector('[data-dq-export]')?.addEventListener('click', () => exportDataQualityCsv(report));
    modal.querySelectorAll('[data-dq-tab]').forEach(btn => btn.addEventListener('click', () => {
      const tab = btn.dataset.dqTab;
      modal.querySelectorAll('[data-dq-tab]').forEach(b => b.classList.toggle('active', b === btn));
      modal.querySelectorAll('[data-dq-panel]').forEach(panel => panel.classList.toggle('active', panel.dataset.dqPanel === tab));
    }));
    modal.addEventListener('click', e => { if(e.target === modal) close(); });
  }

  function openProductVariantsModal(product = appState.selectedProduct){
    const prod = product || appState.selectedProduct;
    if(!prod){ showToast('Selecciona un producto primero.', 'warning'); return; }
    const key = norm(prod.nombre || prod.sku || '');
    const variants = (appState.products || []).filter(p => norm(p.nombre || p.sku || '') === key);
    const existing = document.getElementById('productVariantsModal');
    if(existing) existing.remove();
    const rows = variants.map((v, idx) => {
      const color = getProductColorValue(v);
      const colorChip = color ? `<span class="viewer-variant-chip color" style="${getViewerColorChipStyle(color)}">${escapeHtml(color)}</span>` : '—';
      return `<tr data-variant-idx="${idx}"><td>${escapeHtml(v.sku || '—')}</td><td>${escapeHtml(getProductSizeValue(v) || '—')}</td><td>${colorChip}</td><td>${escapeHtml(v.ubicacion || '—')}</td><td>${escapeHtml(v.almacen || '—')}</td><td><button class="tiny-btn" data-select-variant="${idx}">Ver</button></td></tr>`;
    }).join('');
    const modal = document.createElement('div');
    modal.id = 'productVariantsModal';
    modal.className = 'data-quality-backdrop show';
    modal.innerHTML = `
      <div class="product-variants-shell">
        <div class="data-quality-head"><div><div class="search-card-kicker">Variantes</div><h2>${escapeHtml(prod.nombre || 'Producto')}</h2><p>${variants.length.toLocaleString('es-PE')} variantes detectadas para este modelo.</p></div><button class="location-modal-close" type="button" aria-label="Cerrar">✕</button></div>
        <div class="variant-table-wrap"><table class="data-quality-table"><thead><tr><th>SKU</th><th>Talla</th><th>Color</th><th>Ubicación</th><th>Almacén</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="6">No hay variantes detectadas.</td></tr>'}</tbody></table></div>
      </div>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector('.location-modal-close')?.addEventListener('click', close);
    modal.addEventListener('click', e => { if(e.target === modal) close(); });
    modal.querySelectorAll('[data-select-variant]').forEach(btn => btn.addEventListener('click', () => {
      const v = variants[Number(btn.dataset.selectVariant || 0)];
      if(v){ close(); selectProduct(v); focusSelectedProductInViewer({ product:v, switchScreen:false }); }
    }));
  }

  async function copySelectedProductLocation(product = appState.selectedProduct){
    const prod = product || appState.selectedProduct;
    if(!prod){ showToast('Selecciona un producto primero.', 'warning'); return; }
    const ctx = getViewerProductLocationContext(prod);
    const textToCopy = `SKU: ${prod.sku || '—'} | ${prod.nombre || 'Producto'} | Ubicación: ${ctx.primaryLoc || '—'} | Almacén: ${ctx.storeLoc || '—'}`;
    try{
      await navigator.clipboard.writeText(textToCopy);
      showToast('Ubicación copiada al portapapeles.', 'success');
    }catch{
      const ta = document.createElement('textarea');
      ta.value = textToCopy; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      showToast('Ubicación copiada.', 'success');
    }
  }

  /* v98: función duplicada openNavigable3DModal removida para evitar overrides accidentales. */
// V45: Three.js/WebGL paso 2: materiales, luces, sombras y ruta 3D con glow.
