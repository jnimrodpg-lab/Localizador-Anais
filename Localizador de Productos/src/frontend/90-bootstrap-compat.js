console.info('WMS Industrial V180 · arquitectura 2D/3D');
  async function bootstrapApp(){
    ensureAppRuntimeState();
    loadUiTheme();
    const viewerToken = getViewerTokenFromUrl();
    if(viewerToken){
      try{
        await loadViewerLinkState(viewerToken);
      }catch(err){
        console.error('No se pudo cargar el link de visualización:', err);
        alert(err.message || 'No se pudo abrir el link de visualización.');
      }
    }else{
      await checkSession();
      if(appState.auth?.loggedIn){
        await loadRemoteAppState();
        await loadAllBranchSheetConfigsFromServer();
        rehydratePersistedBranchView();
      }
    }
    const hasRemoteProducts = Array.isArray(appState.products) && appState.products.length;
    if(!hasRemoteProducts){
      if(viewerToken){
        // En modo viewer por token no usar demo ni localStorage, solo datos remotos.
      }else if(appState.auth?.loggedIn){
        const branches = Array.isArray(appState.admin?.branches) ? appState.admin.branches : [];
        const activeIdx = getPersistedPreferredBranchIndex();
        const linkedIdx = branches.findIndex(b => (Array.isArray(b?.sheetPreviewProducts) && b.sheetPreviewProducts.length) || String(b?.sheetUrl || '').trim() || Number(b?.lastSheetCount || 0) > 0);
        if(linkedIdx >= 0){
          const targetIdx = activeIdx >= 0 ? activeIdx : linkedIdx;
          const targetBranch = branches[targetIdx] || branches[linkedIdx];
          if(Array.isArray(targetBranch?.sheetPreviewProducts) && targetBranch.sheetPreviewProducts.length){
            applyBranchProducts(targetBranch.sheetPreviewProducts.slice(0,50000), targetIdx);
            try{ loadLayoutForBranch(targetIdx); }catch(_err){}
          }else{
            await activateBranchSelection(targetIdx >= 0 ? targetIdx : linkedIdx);
          }
        }else{
          rehydratePersistedBranchView();
        }
      }else if(appState.auth?.transientUnavailable){
        console.warn('Se evita cargar demo porque el servicio/sesión aún se está recuperando.');
      }else{
        // Sin sesión mostramos únicamente datos demo; nunca rehidratamos inventario privado del navegador.
        seedState();
      }
    }else{
      rehydratePersistedBranchView();
    }
    renderProducts(appState.filtered && appState.filtered.length ? appState.filtered : appState.products);
    bindActiveProductCardExpansion();
    if(appState.products[0]) selectProduct(appState.products[0]);
    else syncActiveProductCardHint();
    applyBrand();
    if(viewerToken){
      setScreen('viewer');
      closeAuthModal(true);
    }else if(appState.auth?.loggedIn){
      const preferredScreen = appState.auth?.role === 'viewer' ? 'viewer' : getLastAppScreen();
      setScreen(preferredScreen);
      closeAuthModal(true);
    }else if(appState.auth?.transientUnavailable){
      setScreen('viewer');
      openAuthModal('Conectando con el servicio…');
    }else{
      appState.auth = { ...(appState.auth||{}), loggedIn:false, viewerGuest:false, role:'viewer' };
      setScreen('viewer');
      openAuthModal('');
    }
    applyRoleUi();
  }

  if(btnAuthAction) btnAuthAction.onclick = () => { if(appState.auth?.loggedIn) doLogout(); else openAuthModal(); };
  if(btnFocusProductMap) btnFocusProductMap.onclick = (e) => { e.stopPropagation(); openProductLocationModal(appState.selectedProduct); };
  if(btnOpenViewerFromProduct) btnOpenViewerFromProduct.onclick = (e) => {
    e.stopPropagation();
    const rackId = String(appState.selectedProduct?.rack || appState.selectedProduct?.rackStore || '').trim();
    if(rackId && (appState.layout?.racks || []).some(r => r.id === rackId)) appState.selectedRackLayoutId = rackId;
    setScreen('virtual');
  };
  if(btnAuthClose) btnAuthClose.onclick = () => closeAuthModal();
  if(btnDoLogin){ btnDoLogin.onclick = doLogin; }
  if(authMode) authMode.addEventListener('change', syncAuthModeUi);
  if(authRole) authRole.addEventListener('change', syncAuthModeUi);
  document.querySelectorAll('.auth-segment-btn').forEach(btn => btn.addEventListener('click', ()=> setAuthMode(btn.dataset.mode || 'login')));
  document.querySelectorAll('.auth-role-card').forEach(btn => btn.addEventListener('click', ()=> setAuthRole(btn.dataset.role || 'admin')));
  if(btnToggleAuthMode){ const __toggleAuthMode = () => setAuthMode((authMode?.value || 'login') === 'register' ? 'login' : 'register'); btnToggleAuthMode.onclick = __toggleAuthMode; }
  if(authModal) authModal.addEventListener('click', (e) => { if(e.target === authModal) closeAuthModal(); });
  if(btnContinueViewer){ btnContinueViewer.onclick = continueAsViewer; }
  if(loginPassword) loginPassword.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') doLogin(); });
  if(loginUsername) loginUsername.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') doLogin(); });
  document.addEventListener('keydown', async (e) => {
    if((e.ctrlKey || e.metaKey) && String(e.key || '').toLowerCase() === 's'){
      e.preventDefault();
      if(isLayoutWorkspaceScreen()){
        persistActiveLayout();
        await saveRemoteAppState('layout');
      }
    }
  });



  // V56 - Enfoque principal: visualización de ubicación del producto
  function getLocationPartsForVisual(product, type='primary'){
    const prod = product || {};
    const isStore = type === 'store';
    const ctx = getViewerProductLocationContext(prod);
    const rackId = isStore ? (ctx.storeRackId || prod.rackStore || '') : (ctx.primaryRackId || prod.rack || '');
    const rack = rackId ? findRackById(rackId) : null;
    const zone = rack?.zoneId ? findZoneById(rack.zoneId) : null;
    const locText = isStore ? (ctx.storeLoc || prod.almacen || '') : (ctx.primaryLoc || prod.ubicacion || '');
    return {
      label: isStore ? 'Ubicación en almacén' : 'Ubicación principal',
      shortLabel: isStore ? 'Almacén' : 'Ubicación',
      icon: isStore ? '◫' : '⌖',
      loc: locText || '—',
      zone: prod[isStore ? 'zonaStore' : 'zona'] || zone?.name || zone?.id || '—',
      rack: rackId || prod[isStore ? 'rackStore' : 'rack'] || '—',
      level: prod[isStore ? 'nivelStore' : 'nivel'] || prod.nivel || '—',
      slot: prod[isStore ? 'slotStore' : 'slot'] || prod.slot || '—',
      hasRack: !!rackId,
      rackFound: !!rack,
      zoneFound: !!zone
    };
  }
  function renderVisualLocationCard(parts, active=false){
    const state = parts.rackFound ? 'Rack encontrado en layout' : (parts.hasRack ? 'Rack no encontrado en layout' : 'Ubicación incompleta');
    return `<article class="visual-location-card ${active ? 'active' : ''} ${parts.rackFound ? 'ok' : 'warn'}">
      <div class="visual-location-card-head">
        <div class="visual-loc-icon">${escapeHtml(parts.icon)}</div>
        <div><b>${escapeHtml(parts.label)}</b><small>${escapeHtml(state)}</small></div>
      </div>
      <div class="visual-loc-full">${escapeHtml(parts.loc)}</div>
      <div class="visual-loc-breakdown">
        <span><small>Zona</small><b>${escapeHtml(parts.zone)}</b></span>
        <span><small>Rack</small><b>${escapeHtml(parts.rack)}</b></span>
        <span><small>Nivel</small><b>${escapeHtml(parts.level)}</b></span>
        <span><small>Slot</small><b>${escapeHtml(parts.slot)}</b></span>
      </div>
    </article>`;
  }
  function getProductFamilyVariants(product){
    const prod = product || {};
    const byName = norm(prod.nombre || '');
    const bySku = norm(prod.sku || '');
    const products = Array.isArray(appState.products) ? appState.products : [];
    return products.filter(p => {
      if(byName && norm(p.nombre || '') === byName) return true;
      if(bySku && norm(p.sku || '') === bySku) return true;
      return false;
    }).slice(0, 80);
  }
  function renderVariantLocationRows(product){
    const items = getProductFamilyVariants(product);
    if(!items.length) return '<div class="muted tiny">No se detectaron variantes relacionadas.</div>';
    return items.slice(0, 12).map((p, idx) => {
      const color = getProductColorValue(p) || p.color || '—';
      const size = getProductSizeValue(p) || p.talla || '—';
      const active = getProductIdentityKey(p) === getProductIdentityKey(product);
      const loc = p.ubicacion || p.almacen || '—';
      return `<button class="variant-location-row ${active ? 'active' : ''}" type="button" data-v56-variant-index="${idx}">
        <span class="variant-location-main"><b>${escapeHtml(p.variante || p.sku || 'Variante')}</b><small>${escapeHtml(color)} · Talla ${escapeHtml(size)}</small></span>
        <span class="variant-location-loc">${escapeHtml(loc)}</span>
      </button>`;
    }).join('') + (items.length > 12 ? `<div class="muted tiny visual-more-note">+ ${items.length - 12} variantes adicionales. Usa el botón Variantes para ver todas.</div>` : '');
  }
  function removeOperationalStockUi(){
    ['btnOpenPicking','btnOpenRestock','menuPickingBtn','menuRestockBtn'].forEach(id => document.getElementById(id)?.remove());
    document.querySelectorAll('.picking-launch-btn,.restock-launch-btn,.picking-menu-item,.restock-menu-item').forEach(el => el.remove());
  }

  /* v107: override anterior de renderViewerProductInfoPanel eliminado; se conserva únicamente la implementación final. */

  const __v56OriginalOpenProductLocationModal = openProductLocationModal;
  /* v107: override anterior de openProductLocationModal eliminado; se conserva únicamente la implementación final. */

  function applyV56VisualLocationFocus(){
    removeOperationalStockUi();
    const productTitle = document.querySelector('.search-panel .panel-header h2');
    if(productTitle) productTitle.textContent = 'Buscar ubicación';
    const productHint = document.querySelector('.search-panel .panel-header .muted.tiny');
    if(productHint) productHint.textContent = 'Busca un producto para ver zona, rack, nivel y slot en 2D/3D.';
    const searchInput = document.getElementById('searchInput');
    if(searchInput) searchInput.placeholder = 'Buscar producto para ubicar: SKU, barras, nombre, color o talla...';
    const activeBtn = document.getElementById('btnFocusProductMap');
    if(activeBtn) activeBtn.textContent = 'Ver ubicación visual';
    const viewerBtn = document.getElementById('btnOpenViewerFromProduct');
    if(viewerBtn) viewerBtn.textContent = 'Abrir visor de ubicación';
  }
  setTimeout(applyV56VisualLocationFocus, 0);
  setTimeout(applyV56VisualLocationFocus, 600);
  setTimeout(applyV56VisualLocationFocus, 1600);


  // V57 - Limpieza del visor: sin información redundante ni botón copiar ubicación
  function renderCompactVariantLocationRowsV57(product){
    const items = getProductFamilyVariants(product);
    if(!items.length) return '<div class="muted tiny">No se detectaron variantes relacionadas.</div>';
    return items.slice(0, 10).map((p, idx) => {
      const color = getProductColorValue(p) || p.color || '—';
      const size = getProductSizeValue(p) || p.talla || '—';
      const active = getProductIdentityKey(p) === getProductIdentityKey(product);
      const loc = p.ubicacion || p.almacen || '—';
      return `<button class="variant-location-row ${active ? 'active' : ''}" type="button" data-v57-variant-index="${idx}">
        <span class="variant-location-main"><b>${escapeHtml(p.variante || color || p.sku || 'Variante')}</b><small>Talla ${escapeHtml(size)} · ${escapeHtml(color)}</small></span>
        <span class="variant-location-loc">${escapeHtml(loc)}</span>
      </button>`;
    }).join('') + (items.length > 10 ? `<div class="muted tiny visual-more-note">+ ${items.length - 10} variantes adicionales.</div>` : '');
  }

  /* v107: override anterior de renderViewerProductInfoPanel eliminado; se conserva únicamente la implementación final. */

  openProductLocationModal = function(product = appState.selectedProduct){
    const previousIso = appState.ui.isoIsolation;
    appState.ui.isoIsolation = 'rack';
    __v56OriginalOpenProductLocationModal(product);
    const modal = document.getElementById('productLocationModal');
    if(modal){
      modal.classList.add('v56-visual-location-modal','v57-clean-location-modal');
      const title = modal.querySelector('.location-modal-head b');
      if(title) title.textContent = 'Plano de ubicación del producto';
      const desc = modal.querySelector('.modal-iso-head .muted');
      if(desc) desc.textContent = 'Vista enfocada en zona, rack, nivel y slot.';
      modal.querySelector('#btnV56CopyLocationModal')?.remove();
    }
    setTimeout(() => { appState.ui.isoIsolation = previousIso || appState.ui.isoIsolation; }, 0);
  };

  function applyV57CleanLocationFocus(){
    applyV56VisualLocationFocus();
    document.getElementById('btnCopyLocation')?.remove();
    document.getElementById('btnV56CopyLocationModal')?.remove();
    document.querySelectorAll('[data-nav3d-product-action="copy"]').forEach(el => el.remove());
    const activeBtn = document.getElementById('btnFocusProductMap');
    if(activeBtn) activeBtn.textContent = 'Ver ubicación';
    const viewerBtn = document.getElementById('btnOpenViewerFromProduct');
    if(viewerBtn) viewerBtn.textContent = 'Abrir visor';
  }
  setTimeout(applyV57CleanLocationFocus, 0);
  setTimeout(applyV57CleanLocationFocus, 700);
  setTimeout(applyV57CleanLocationFocus, 1800);


  // V58 - Restaura el cuadro de propiedades del producto al diseño v54, manteniendo el resto del flujo actual.
  /* v107: override anterior de renderViewerProductInfoPanel eliminado; se conserva únicamente la implementación final. */



  // V59 - Restaura el cuadro de propiedades del producto al diseño base v54, manteniendo el resto del sistema actual.
  renderViewerProductInfoPanel = function(){
    clearViewerImageRotationTimer();
    if(typeof removeOperationalStockUi === 'function') removeOperationalStockUi();
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
  };




  bootstrapApp();

})();
