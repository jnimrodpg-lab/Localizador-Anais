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
