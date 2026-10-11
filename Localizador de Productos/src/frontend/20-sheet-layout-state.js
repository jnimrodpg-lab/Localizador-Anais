  async function loadSheetFromConfig(){
    const url = appState.sheetConfig.url;
    const sheetName = appState.sheetConfig.sheetName || 'Productos';
    const id = parseSheetUrl(url);
    if(!id){ alert('URL o ID de Google Sheet inválido.'); return; }
    sheetStatusChip.textContent = 'Cargando sheet...';
    contentStatus.textContent = 'Intentando leer Google Sheet...';
    try {
      const endpoint = `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:json&headers=0&sheet=${encodeURIComponent(sheetName)}`;
      const text = await fetch(endpoint).then(r => r.text());
      const json = JSON.parse(text.substring(47).slice(0, -2));
      const rows = json.table.rows || [];
      const rowValues = rows.map(r => (r.c || []).map(c => String(c?.v ?? '').trim()));

      const normalizeHeaderKey = (v) => {
        const s = norm(String(v || ''));
        const compact = s.replace(/\s+/g, '');
        const map = {
          'sku':'sku',
          'nombre':'nombre',
          'variante':'variante',
          'barras':'barras',
          'barra':'barras',
          'ubicacion':'ubicacion',
          'ubiccaion':'ubicacion',
          'ubicaion':'ubicacion',
          'ubiccacion':'ubicacion',
          'almacen':'almacen',
          'alamacen':'almacen',
          'alamacenf':'almacen',
          'alamacenfinal':'almacen',
          'alamacen2':'almacen',
          'alamacen1':'almacen',
          'alamacenprincipal':'almacen',
          'alamacenrespaldo':'almacen',
          'alamacenreserva':'almacen',
          'alamacenstock':'almacen',
          'alamacenubicacion':'almacen',
          'alamacenubi':'almacen',
          'alamacenn':'almacen',
          'alamacenx':'almacen',
          'alamacenw':'almacen',
          'alamacenv':'almacen',
          'alamacenq':'almacen',
          'alamacenr':'almacen',
          'alamacenm':'almacen',
          'alamaacen':'almacen',
          'alamacn':'almacen',
          'alamac':'almacen',
          'alam':'almacen',
          'alamacen ':'almacen',
          'alamacen_':'almacen',
          'almacen':'almacen',
          'almacenubicado':'almacen',
          'zona':'zona',
          'estante':'estante',
          'nivel':'nivel',
          'slot':'slot'
        };
        return map[compact] || compact;
      };

      const expected = ['sku','nombre','variante','barras','ubicacion','almacen','zona','estante','nivel','slot'];
      const scoreHeaderRow = (vals, rowIndex) => {
        const keys = vals.map(normalizeHeaderKey).filter(Boolean);
        const set = new Set(keys);
        let score = 0;
        expected.forEach(k => { if (set.has(k)) score += 3; });
        if (set.has('sku')) score += 5;
        if (set.has('nombre')) score += 5;
        if (set.has('variante')) score += 4;
        if (set.has('barras')) score += 4;
        if (set.has('ubicacion')) score += 8; // priorizar columna fusionada
        if (set.has('almacen')) score += 8;   // priorizar columna fusionada
        if (rowIndex === 1 && score > 0) score += 6; // preferir fila 2 si coincide
        return score;
      };

      let headerRowIndex = 0;
      let bestScore = -1;
      for (let i = 0; i < Math.min(12, rowValues.length); i++){
        const score = scoreHeaderRow(rowValues[i], i);
        if (score > bestScore){
          bestScore = score;
          headerRowIndex = i;
        }
      }

      const headerVals = rowValues[headerRowIndex] || [];
      const headers = headerVals.map((raw, idx) => ({ raw, key: normalizeHeaderKey(raw), idx }));
      const duplicates = (name) => headers.filter(h => h.key === name).map(h => h.idx);
      const firstOf = (...names) => {
        for (const n of names){
          const key = normalizeHeaderKey(n);
          const hit = headers.find(h => h.key === key);
          if (hit) return hit.idx;
        }
        return -1;
      };
      const val = (vals, i) => String(vals?.[i] ?? '').trim();

      // Fallback fijo por columnas: J barras, K sku, L nombre, M variante, R ubicacion, W almacen
      // N/O/P/Q = zona/estante/nivel/slot principal
      // S/T/U/V = zona/estante/nivel/slot almacén
      const fallback = {
        barras: 9,
        sku: 10,
        nombre: 11,
        variante: 12,
        zona1: 13,
        estante1: 14,
        nivel1: 15,
        slot1: 16,
        ubicacion: 17,
        zona2: 18,
        estante2: 19,
        nivel2: 20,
        slot2: 21,
        almacen: 22
      };

      const iSKU = firstOf('sku') >= 0 ? firstOf('sku') : fallback.sku;
      const iNombre = firstOf('nombre') >= 0 ? firstOf('nombre') : fallback.nombre;
      const iVar = firstOf('variante') >= 0 ? firstOf('variante') : fallback.variante;
      const iBarras = firstOf('barras','barra') >= 0 ? firstOf('barras','barra') : fallback.barras;
      const iImagen = firstOf('imagen','imagen 1','imagen1','image','image 1','image1','foto','foto 1','foto1','img','img 1','img1');
      const iImagen2 = firstOf('imagen 2','imagen2','image 2','image2','foto 2','foto2','img 2','img2');
      const iImagen3 = firstOf('imagen 3','imagen3','image 3','image3','foto 3','foto3','img 3','img3');
      const iImagen4 = firstOf('imagen 4','imagen4','image 4','image4','foto 4','foto4','img 4','img4');
      const iFondoCard = firstOf('fondo card','fondo_card','background card','background_card','imagen fondo','imagen_fondo','url fondo','link fondo');
      const iTalla = firstOf('talla','size');
      const iColor = firstOf('color','colour');
      const iUb = firstOf('ubicacion','ubiccaion','ubicaion','ubiccacion') >= 0 ? firstOf('ubicacion','ubiccaion','ubicaion','ubiccacion') : fallback.ubicacion;
      const iAlm = firstOf('almacen','alamacen','almacen','alamaacen','alamacn','alamac') >= 0 ? firstOf('almacen','alamacen','almacen','alamaacen','alamacn','alamac') : fallback.almacen;

      const zonas = duplicates('zona');
      const estantes = duplicates('estante');
      const niveles = duplicates('nivel');
      const slots = duplicates('slot');
      const mainZona = zonas[0] ?? fallback.zona1, storeZona = zonas[1] ?? fallback.zona2;
      const mainEst = estantes[0] ?? fallback.estante1, storeEst = estantes[1] ?? fallback.estante2;
      const mainNiv = niveles[0] ?? fallback.nivel1, storeNiv = niveles[1] ?? fallback.nivel2;
      const mainSlot = slots[0] ?? fallback.slot1, storeSlot = slots[1] ?? fallback.slot2;

      const buildLocation = (z,e,n,s) => {
        const zzRaw = String(z || '').trim().toUpperCase();
        const zz = /^ALM(?:ACEN)?$/.test(zzRaw) ? 'ALM' : zzRaw;
        const ee = String(e || '').trim().toUpperCase();
        const nn = String(n || '').trim().toUpperCase();
        const ss = String(s || '').trim().toUpperCase();
        const parts = [zz, ee, nn, ss].filter(Boolean);
        if (!parts.length) return '';
        return parts.join('-');
      };

      const normalizeLocationString = normalizeLocationCode;

      const parseLoc = (txt, fallbackRack='Z1-E1') => {
        const parsed = parseLocationCode(txt, fallbackRack);
        return { raw: parsed.raw, rack: parsed.rackId, zona: parsed.zoneId, nivel: parsed.level, slot: parsed.slot };
      };

      const dataRows = rowValues.slice(headerRowIndex + 1);
      const parsed = dataRows.map((vals, dataIndex) => {
        const rawRecord = {};
        headerVals.forEach((h, hi) => { if(String(h||'').trim()) rawRecord[String(h).trim()] = String(vals[hi] || '').trim(); });
        const sku = val(vals, iSKU);
        const nombre = val(vals, iNombre);
        const variante = val(vals, iVar);
        const barras = val(vals, iBarras);
        const imagen = val(vals, iImagen);
        const imagen2 = val(vals, iImagen2);
        const imagen3 = val(vals, iImagen3);
        const imagen4 = val(vals, iImagen4);
        const imagenes = [imagen, imagen2, imagen3, imagen4].filter(Boolean);
        const fondo_card = val(vals, iFondoCard);
        const talla = val(vals, iTalla);
        const color = val(vals, iColor);

        // Prioridad total a columnas fusionadas Ubiccaion y Alamacen
        let ubicacion = normalizeLocationString(val(vals, iUb));
        let almacen = normalizeLocationString(val(vals, iAlm));

        if (!ubicacion){
          ubicacion = buildLocation(val(vals, mainZona), val(vals, mainEst), val(vals, mainNiv), val(vals, mainSlot));
        }
        if (!almacen){
          almacen = buildLocation(val(vals, storeZona), val(vals, storeEst), val(vals, storeNiv), val(vals, storeSlot));
        }

        const main = parseLoc(ubicacion, 'Z1-E1');
        const store = parseLoc(almacen, 'ALM-E1');

        return {
          sku,
          barras,
          nombre,
          variante,
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
          ubicacion: main.raw || ubicacion,
          almacen: store.raw || almacen,
          rack: main.rack,
          rackStore: store.rack,
          zona: main.zona,
          zonaStore: store.zona,
          nivel: main.nivel,
          slot: main.slot,
          nivelStore: store.nivel,
          slotStore: store.slot,
          _raw: rawRecord,
          _rowIndex: headerRowIndex + 1 + dataIndex
        };
      }).filter(x => x.sku || x.nombre || x.barras);

      if(parsed.length){
        setProductDataset(parsed);
        appState.filtered = appState.products.slice();
        appState.sheetConfig.lastMode = 'google';
        syncBranchLayoutWithProducts(getActiveLayoutBranchIndex(), parsed);
        sheetStatusChip.textContent = `${parsed.length.toLocaleString('es-PE')} filas`;
        contentStatus.textContent = `Sheet vinculado. Encabezados detectados en fila ${headerRowIndex + 1}. Columnas: SKU ${iSKU+1}, Nombre ${iNombre+1}, Variante ${iVar+1}, Ubicación ${iUb+1}, Almacén ${iAlm+1}. Ubicaciones enlazadas por niveles/slots.`;
        selectProduct(parsed[0]);
        renderProducts(parsed);
        renderCurrentScreen();
      } else {
        throw new Error('No se encontraron filas útiles.');
      }
    } catch (err) {
      console.error(err);
      sheetStatusChip.textContent = 'Error de lectura';
      contentStatus.textContent = 'No se pudo leer la hoja. Verifica permisos, URL, fila de encabezados y nombre de hoja.';
      alert('No se pudo leer el Google Sheet. Verifica que esté compartido y que el nombre de hoja sea correcto.');
    }
  }




  function loadBranchLayouts(){
    try{
      const raw = localStorage.getItem('wms_branch_layouts_v2');
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    }catch{ return {}; }
  }
  function saveBranchLayouts(){
    try{ localStorage.setItem('wms_branch_layouts_v2', JSON.stringify(appState.branchLayouts||{})); }catch{}
  }
  const ZONE_COLOR_PALETTE = ['#ffd84d','#58c5ff','#6ef0a8','#ff8f70','#c48bff','#7cf0ff','#ff5db1','#9ee65e','#ffb84d','#63a4ff'];
  function getBranchColor(index){
    return (appState.admin?.branches?.[index]?.color) || ZONE_COLOR_PALETTE[(Number(index)||0) % ZONE_COLOR_PALETTE.length] || DEFAULT_ZONE_COLOR;
  }
  function getNextZoneColor(preferred = ''){
    const used = new Set((appState.layout?.zones || []).map(z => String(z?.color || '').toLowerCase()).filter(Boolean));
    const pref = String(preferred || '').toLowerCase();
    if(pref && !used.has(pref)) return preferred;
    const pick = ZONE_COLOR_PALETTE.find(c => !used.has(String(c).toLowerCase()));
    if(pick) return pick;
    const idx = (appState.layout?.zones || []).length % ZONE_COLOR_PALETTE.length;
    return ZONE_COLOR_PALETTE[idx] || DEFAULT_ZONE_COLOR;
  }
  function makeRectZone(id,name,color,x,y,w,h){
    const safeName = name || (String(id).toUpperCase() === 'ALM' ? 'Almacén' : `Zona ${id}`);
    return { id, name:safeName, color: color || DEFAULT_ZONE_COLOR, wallThickness:14, pts:[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}], sectionCuts:{ x:{pos:.5,dir:1,depth:100}, y:{pos:.5,dir:1,depth:100} } };
  }
  function buildDefaultLayoutForBranch(branchIndex){
    const branch = (appState.admin?.branches||[])[branchIndex] || {};
    const zoneId = 'Z1';
    const zoneName = branch.name ? `Zona ${zoneId}` : `Zona ${zoneId}`;
    const zx = 90, zy = 80, zw = DEFAULT_ZONE_SIZE.w, zh = DEFAULT_ZONE_SIZE.h;
    const zone = makeRectZone(zoneId, zoneName, getBranchColor(branchIndex), zx, zy, zw, zh);
    const gap = 0, rackW = 84, rackH = 46;
    const startX = zx + 40;
    const y = zy + 26;
    const racks = Array.from({length:4}, (_,i)=>({
      id:`${zoneId}-E${i+1}`,
      zoneId,
      x:startX + i*(rackW+gap),
      y,
      w:rackW,
      h:rackH,
      rot:0,
      modelId:i===2?'wide_5':'std_4',
      front:'auto',
      baseHeight:0,
      rackHeight:rackModel(i===2?'wide_5':'std_4').height || 238
    }));
    racks.forEach(r=>syncRackFootprint(r,false));
    const areaPts = [
      { x:zx - 70, y:zy - 56 },
      { x:zx + zw + 140, y:zy - 56 },
      { x:zx + zw + 140, y:zy + zh + 160 },
      { x:zx - 70, y:zy + zh + 160 }
    ];
    return { zones:[zone], racks, streets:[], meta:{ createdAt: Date.now(), scaleCmPerUnit: 1, defaultStreetCornerStyle:'right', siteBoundary:{ id:'AREA-GENERAL', name:'Área general', pts:areaPts } } };
  }
  function ensureBranchLayouts(){
    const branches = appState.admin?.branches || [];
    if(!appState.branchLayouts || typeof appState.branchLayouts !== 'object') appState.branchLayouts = {};
    branches.forEach((_,i)=>{
      if(!appState.branchLayouts[i] || !Array.isArray(appState.branchLayouts[i].zones) || !Array.isArray(appState.branchLayouts[i].racks)){
        appState.branchLayouts[i] = buildDefaultLayoutForBranch(i);
      }
    });
    Object.keys(appState.branchLayouts).forEach(k=>{ if(Number(k) >= branches.length) delete appState.branchLayouts[k]; });
    normalizeLayoutSectionState();
    saveBranchLayouts();
  }
  function getActiveLayoutBranchIndex(){
    return Number.isFinite(appState.activeLayoutBranchIndex) ? appState.activeLayoutBranchIndex : (Number.isFinite(appState.activeBranchIndex) ? appState.activeBranchIndex : 0);
  }
  function ensureZoneSectionCuts(zone){
    if(!zone) return { x:{pos:.5,dir:1,range:1}, y:{pos:.5,dir:1,range:1} };
    if(!zone.sectionCuts || typeof zone.sectionCuts !== 'object') zone.sectionCuts = {};
    if(!zone.sectionCuts.x) zone.sectionCuts.x = { pos:.5, dir:1, depth:100 };
    if(!zone.sectionCuts.y) zone.sectionCuts.y = { pos:.5, dir:1, depth:100 };
    zone.sectionCuts.x.pos = Math.max(.06, Math.min(.94, Number(zone.sectionCuts.x.pos) || .5));
    zone.sectionCuts.y.pos = Math.max(.06, Math.min(.94, Number(zone.sectionCuts.y.pos) || .5));
    zone.sectionCuts.x.dir = zone.sectionCuts.x.dir === -1 ? -1 : 1;
    zone.sectionCuts.y.dir = zone.sectionCuts.y.dir === -1 ? -1 : 1;
    const bounds = zoneBounds(zone);
    const maxDepthX = Math.max(1, bounds.maxX - bounds.minX);
    const maxDepthY = Math.max(1, bounds.maxY - bounds.minY);
    const oldRangeX = Number(zone.sectionCuts.x.range);
    const oldRangeY = Number(zone.sectionCuts.y.range);
    const baseDepthX = Number(zone.sectionCuts.x.depth);
    const baseDepthY = Number(zone.sectionCuts.y.depth);
    zone.sectionCuts.x.depth = Math.max(Math.min(100, maxDepthX), Math.min(maxDepthX, Number.isFinite(baseDepthX) ? (baseDepthX <= 10 ? 100 : baseDepthX) : (Number.isFinite(oldRangeX) ? maxDepthX * oldRangeX : 100)));
    zone.sectionCuts.y.depth = Math.max(Math.min(100, maxDepthY), Math.min(maxDepthY, Number.isFinite(baseDepthY) ? (baseDepthY <= 10 ? 100 : baseDepthY) : (Number.isFinite(oldRangeY) ? maxDepthY * oldRangeY : 100)));
    delete zone.sectionCuts.x.range;
    delete zone.sectionCuts.y.range;
    return zone.sectionCuts;
  }
  function normalizeLayoutSectionState(){
    (appState.layout?.zones || []).forEach(zone => ensureZoneSectionCuts(zone));
  }

  // WMS v99 - estabilidad, guardado y validación
  function setLayoutSaveState(state='local', message=''){
    try{
      appState.ui = appState.ui || {};
      appState.ui.layoutSaveState = state;
      appState.ui.layoutSaveMessage = message || (state === 'remote' ? 'Guardado en servidor' : state === 'saving' ? 'Guardando…' : state === 'error' ? 'Error al guardar' : 'Guardado local');
      appState.ui.layoutSaveAt = new Date().toISOString();
      updateLayoutSaveStatus();
    }catch(_err){}
  }
  function updateLayoutSaveStatus(){
    try{
      const el = document.getElementById('layoutSaveStatus');
      if(!el) return;
      const state = appState.ui?.layoutSaveState || 'local';
      const msg = appState.ui?.layoutSaveMessage || 'Guardado local';
      el.className = `v99-save-status ${state}`;
      el.textContent = msg;
      el.title = appState.ui?.layoutSaveAt ? `Última actualización: ${new Date(appState.ui.layoutSaveAt).toLocaleString('es-PE')}` : msg;
    }catch(_err){}
  }
  function markLayoutDirty(reason='layout'){
    try{
      appState.ui = appState.ui || {};
      appState.ui.layoutDirty = true;
      setLayoutSaveState('local', reason ? `Guardado local · ${reason}` : 'Guardado local');
      if(window.__wmsDiagPush) window.__wmsDiagPush('layout', `Cambio local: ${reason || 'layout'}`);
    }catch(_err){}
  }
  function getLayoutQualityWarnings(){
    const warnings = [];
    try{
      const layout = appState.layout || {};
      const zones = Array.isArray(layout.zones) ? layout.zones : [];
      const racks = Array.isArray(layout.racks) ? layout.racks : [];
      const walls = Array.isArray(layout.walls) ? layout.walls : [];
      const openings = Array.isArray(layout.openings) ? layout.openings : [];
      const zoneIds = new Set(zones.map(z => String(z.id || '')));
      const rackIds = new Set(racks.map(r => String(r.id || '')));
      const wallIds = new Set(walls.map(w => String(w.id || '')));
      zones.forEach(z => {
        if(!z.id) warnings.push('Zona sin ID.');
        if(!Array.isArray(z.pts) || z.pts.length < 3) warnings.push(`Zona ${z.id || 'sin ID'} no tiene polígono válido.`);
      });
      racks.forEach(r => {
        if(!r.id) warnings.push('Rack sin ID.');
        if(r.zoneId && !zoneIds.has(String(r.zoneId))) warnings.push(`Rack ${r.id || 'sin ID'} apunta a zona inexistente: ${r.zoneId}`);
        if(!Number.isFinite(Number(r.x)) || !Number.isFinite(Number(r.y))) warnings.push(`Rack ${r.id || 'sin ID'} tiene coordenadas inválidas.`);
      });
      walls.forEach(w => {
        if(!w.id) warnings.push('Muro sin ID.');
        if(w.autoZoneEdge && w.zoneId && !zoneIds.has(String(w.zoneId))) warnings.push(`Muro ${w.id || 'sin ID'} apunta a zona inexistente: ${w.zoneId}`);
      });
      openings.forEach(o => {
        if(!o.id) warnings.push('Vano sin ID.');
        if(o.wallId && !wallIds.has(String(o.wallId))) warnings.push(`Vano ${o.id || 'sin ID'} apunta a muro inexistente: ${o.wallId}`);
        const width = Number(o.width || 0);
        if(!Number.isFinite(width) || width <= 0) warnings.push(`Vano ${o.id || 'sin ID'} tiene ancho inválido.`);
      });
      const wallNodes = Array.isArray(layout.wallNodes) ? layout.wallNodes : [];
      const nodeIds = new Set(wallNodes.map(n => String(n.id || '')));
      walls.filter(w => !w.autoZoneEdge).forEach(w => {
        if(w.startNodeId && !nodeIds.has(String(w.startNodeId))) warnings.push(`Muro ${w.id || 'sin ID'} tiene nodo inicial inexistente.`);
        if(w.endNodeId && !nodeIds.has(String(w.endNodeId))) warnings.push(`Muro ${w.id || 'sin ID'} tiene nodo final inexistente.`);
        if(w.startNodeId && w.startNodeId === w.endNodeId) warnings.push(`Muro ${w.id || 'sin ID'} tiene longitud nula.`);
      });
      (layout.rooms || []).forEach(room => {
        if((room.nodeIds || []).some(id => !nodeIds.has(String(id)))) warnings.push(`Recinto ${room.id || 'sin ID'} tiene nodos inexistentes.`);
      });
      const products = Array.isArray(appState.products) ? appState.products : [];
      const locationProducts = products.slice(0, 15000);
      let invalidLocations = 0;
      locationProducts.forEach(p => {
        const rack = String(p.rack || p.Rack || '').trim();
        const rackStore = String(p.rackStore || '').trim();
        if(rack && !rackIds.has(rack)) invalidLocations += 1;
        if(rackStore && !rackIds.has(rackStore)) invalidLocations += 1;
      });
      if(invalidLocations) warnings.push(`${invalidLocations} referencia(s) de producto apuntan a racks no encontrados en el layout activo.`);
      const operationalIssues = Array.isArray(appState.editor?.validationIssues) ? appState.editor.validationIssues : [];
      operationalIssues.slice(0,30).forEach(issue => { if(issue?.message) warnings.push(issue.message); });
    }catch(err){
      warnings.push(`No se pudo validar layout: ${err.message || err}`);
    }
    return warnings.slice(0, 80);
  }
  function updateLayoutQualityBadge(){
    try{
      const el = document.getElementById('layoutQualityBadge');
      if(!el) return;
      const warnings = getLayoutQualityWarnings();
      el.className = `v99-quality-badge ${warnings.length ? 'warn' : 'ok'}`;
      el.textContent = warnings.length ? `${warnings.length} alertas` : 'Sin alertas';
      el.title = warnings.length ? warnings.join('\n') : 'Layout sin alertas detectadas';
    }catch(_err){}
  }


  function persistActiveLayout(){
    const historyType = isRackDistributionScreen() ? 'distribution' : (isStructureLayoutScreen() ? 'structure' : 'layout');
    const bucket = getHistoryBucket(historyType);
    if(!bucket?.isApplying) recordHistorySnapshot(historyType);
    const idx = getActiveLayoutBranchIndex();
    if(!appState.branchLayouts) appState.branchLayouts = {};
    normalizeLayoutSectionState();
    ensureLayoutMeta();
    appState.branchLayouts[idx] = clone(appState.layout);
    saveBranchLayouts();
    markLayoutDirty(`sucursal ${idx + 1}`);
  }
  function loadLayoutForBranch(branchIndex){
    ensureBranchLayouts();
    const source = appState.branchLayouts[branchIndex] || buildDefaultLayoutForBranch(branchIndex);
    appState.layout = clone(source);
    ensureLayoutMeta();
    appState.activeLayoutBranchIndex = branchIndex;
    appState.selectedZoneId = appState.layout.zones[0]?.id || '';
    appState.selectedRackLayoutId = appState.layout.racks[0]?.id || '';
    appState.selectedVertex = { zoneId:'', idx:-1 };
    appState.selectedEdge = { zoneId:'', a:-1, b:-1 };
    appState.editor.dragging = null;
    appState.editor.mode = 'select';
    ensureRackProps();
  }
  function setLayoutBranch(branchIndex){
    persistActiveLayout();
    loadLayoutForBranch(branchIndex);
  }
  function zoneBounds(zone){
    const xs = zone.pts.map(p=>p.x), ys = zone.pts.map(p=>p.y);
    return { minX:Math.min(...xs), maxX:Math.max(...xs), minY:Math.min(...ys), maxY:Math.max(...ys) };
  }
  function nearestZoneForPoint(point){
    const zones = appState.layout.zones || [];
    let best = null, bestDist = Infinity;
    zones.forEach(z=>{
      const c = centroid(z.pts); const d = dist2(point,c); if(d<bestDist){ best=z; bestDist=d; }
    });
    return best;
  }
  function keepRackInsideZone(rack, zone){
    const fp = getRackFootprint(rack.modelId, rack.rot || 0);
    const b = zoneBounds(zone);
    const margin = 0;
    const effW = Math.max(0, Number(rack.w || fp.w || fp.baseW || 0));
    const effH = Math.max(0, Number(rack.h || fp.h || fp.baseH || 0));
    const minX = b.minX + margin, maxX = b.maxX - effW - margin;
    const minY = b.minY + margin, maxY = b.maxY - effH - margin;
    rack.x = Math.max(minX, Math.min(maxX, rack.x));
    rack.y = Math.max(minY, Math.min(maxY, rack.y));
    if(rackFullyInsideZone(rack, zone)) return;
    const original = { x:rack.x, y:rack.y };
    for(let step=0; step<=48; step+=4){
      const candidates = [
        { x:original.x-step, y:original.y }, { x:original.x+step, y:original.y },
        { x:original.x, y:original.y-step }, { x:original.x, y:original.y+step },
        { x:original.x-step, y:original.y-step }, { x:original.x+step, y:original.y+step }
      ];
      const found = candidates.find(pos => { rack.x = pos.x; rack.y = pos.y; return rackFullyInsideZone(rack, zone); });
      if(found) return;
    }
    rack.x = original.x; rack.y = original.y;
  }
  function snapRackToZoneEdges(rack, zone, threshold = 28){
    if(!rack || !zone) return;
    const bounds = zoneBounds(zone);
    const edges = [];
    for(let i=0;i<zone.pts.length;i++){
      const a = zone.pts[i], b = zone.pts[(i+1)%zone.pts.length];
      if(Math.abs(a.x - b.x) <= 0.001) edges.push({type:'v', value:a.x, min:Math.min(a.y,b.y), max:Math.max(a.y,b.y)});
      else if(Math.abs(a.y - b.y) <= 0.001) edges.push({type:'h', value:a.y, min:Math.min(a.x,b.x), max:Math.max(a.x,b.x)});
    }
    let bestX = null, bestDX = Infinity;
    let bestY = null, bestDY = Infinity;
    const rackMidY = rack.y + rack.h/2;
    const rackMidX = rack.x + rack.w/2;
    edges.forEach(edge => {
      if(edge.type === 'v' && rackMidY >= edge.min-8 && rackMidY <= edge.max+8){
        const leftTarget = edge.value;
        const rightTarget = edge.value - rack.w;
        const dLeft = Math.abs(rack.x - leftTarget);
        const dRight = Math.abs(rack.x - rightTarget);
        if(dLeft < bestDX && dLeft <= threshold){ bestDX = dLeft; bestX = leftTarget; }
        if(dRight < bestDX && dRight <= threshold){ bestDX = dRight; bestX = rightTarget; }
      }
      if(edge.type === 'h' && rackMidX >= edge.min-8 && rackMidX <= edge.max+8){
        const topTarget = edge.value;
        const bottomTarget = edge.value - rack.h;
        const dTop = Math.abs(rack.y - topTarget);
        const dBottom = Math.abs(rack.y - bottomTarget);
        if(dTop < bestDY && dTop <= threshold){ bestDY = dTop; bestY = topTarget; }
        if(dBottom < bestDY && dBottom <= threshold){ bestDY = dBottom; bestY = bottomTarget; }
      }
    });
    if(bestX === null){
      const boundLeft = Math.abs(rack.x - bounds.minX);
      const boundRight = Math.abs(rack.x - (bounds.maxX - rack.w));
      if(boundLeft <= threshold || boundRight <= threshold) bestX = boundLeft <= boundRight ? bounds.minX : (bounds.maxX - rack.w);
    }
    if(bestY === null){
      const boundTop = Math.abs(rack.y - bounds.minY);
      const boundBottom = Math.abs(rack.y - (bounds.maxY - rack.h));
      if(boundTop <= threshold || boundBottom <= threshold) bestY = boundTop <= boundBottom ? bounds.minY : (bounds.maxY - rack.h);
    }
    if(bestX !== null) rack.x = bestX;
    if(bestY !== null) rack.y = bestY;
    rack.x = Math.max(bounds.minX, Math.min(bounds.maxX - rack.w, rack.x));
    rack.y = Math.max(bounds.minY, Math.min(bounds.maxY - rack.h, rack.y));
  }
  function rangesOverlap(a1, a2, b1, b2, tolerance = 4){
    return Math.min(a2, b2) >= Math.max(a1, b1) - tolerance;
  }
  function rackBox(rack){
    return { left:rack.x, right:rack.x + rack.w, top:rack.y, bottom:rack.y + rack.h, width:rack.w, height:rack.h };
  }
  function rackAxisData(rack){
    if(!rack) return null;
    const fp = getRackFootprint(rack.modelId, rack.rot || 0);
    const baseW = Math.max(8, fp.baseW || rack.w || 0);
    const baseH = Math.max(8, fp.baseH || rack.h || 0);
    const angle = normalizeAngle(rack.rot || 0) * Math.PI / 180;
    const ux = Math.cos(angle), uy = Math.sin(angle);
    const vx = -uy, vy = ux;
    return {
      cx: rack.x + (rack.w || fp.w || baseW) / 2,
      cy: rack.y + (rack.h || fp.h || baseH) / 2,
      baseW, baseH, angle, ux, uy, vx, vy
    };
  }
  function shortestAngleDelta(a, b){
    const da = normalizeAngle(a) - normalizeAngle(b);
    return ((da + 540) % 360) - 180;
  }
  function clearRackSnapPreview(){
    if(appState?.editor) appState.editor.snapPreview = null;
  }
  function setRackSnapPreview(preview){
    if(appState?.editor) appState.editor.snapPreview = preview || null;
  }
  function clampAlongForNeighbor(targetAlong, rackAxis, otherAxis){
    const halfRange = Math.max(0, (otherAxis.baseW - rackAxis.baseW) / 2);
    return Math.max(-halfRange, Math.min(halfRange, targetAlong));
  }
  function moveRackCenterTo(rack, cx, cy){
    if(!rack) return;
    rack.x = snapGrid(cx - (rack.w || 0) / 2);
    rack.y = snapGrid(cy - (rack.h || 0) / 2);
  }
  function rectsOverlap(a, b, tolerance = 0.001){
    return a.left < b.right - tolerance && a.right > b.left + tolerance && a.top < b.bottom - tolerance && a.bottom > b.top + tolerance;
  }
  function resolveRackOverlap(rack, zone){
    if(!rack || !zone) return;
    const neighbors = (appState.layout.racks || []).filter(r => r !== rack && r.zoneId === zone.id && !racksCanOverlapByLevel(rack, r));
    let moved = false;
    neighbors.forEach(other => {
      const a = rackBox(rack), b = rackBox(other);
      if(!rectsOverlap(a, b)) return;
      const pushLeft = Math.abs(a.right - b.left);
      const pushRight = Math.abs(b.right - a.left);
      const pushUp = Math.abs(a.bottom - b.top);
      const pushDown = Math.abs(b.bottom - a.top);
      const candidates = [
        { axis:'x', value: other.x - rack.w, d: pushLeft },
        { axis:'x', value: other.x + other.w, d: pushRight },
        { axis:'y', value: other.y - rack.h, d: pushUp },
        { axis:'y', value: other.y + other.h, d: pushDown },
      ].sort((m,n)=>m.d-n.d);
      const pick = candidates[0];
      if(!pick) return;
      if(pick.axis === 'x') rack.x = pick.value;
      else rack.y = pick.value;
      moved = true;
    });
    return moved;
  }
  function snapRackToNeighbors(rack, zone, threshold = 18){
    if(!rack || !zone) return;
    clearRackSnapPreview();
    const neighbors = (appState.layout.racks || []).filter(r => r !== rack && r.zoneId === zone.id && !racksCanOverlapByLevel(rack, r));
    let bestX = null, bestDX = Infinity;
    let bestY = null, bestDY = Infinity;
    const a = rackBox(rack);
    neighbors.forEach(other => {
      const b = rackBox(other);
      const verticalGap = Math.min(Math.abs(a.bottom - b.top), Math.abs(b.bottom - a.top));
      const horizontalGap = Math.min(Math.abs(a.right - b.left), Math.abs(b.right - a.left));
      const verticallyAligned = rangesOverlap(a.top, a.bottom, b.top, b.bottom, 0.001) || verticalGap <= threshold;
      const horizontallyAligned = rangesOverlap(a.left, a.right, b.left, b.right, 0.001) || horizontalGap <= threshold;
      if(verticallyAligned){
        const targetRight = b.right;
        const targetLeft = b.left - a.width;
        const dAttachLeft = Math.abs(a.left - targetRight);
        const dAttachRight = Math.abs(a.left - targetLeft);
        if(dAttachLeft < bestDX && dAttachLeft <= threshold){ bestDX = dAttachLeft; bestX = targetRight; }
        if(dAttachRight < bestDX && dAttachRight <= threshold){ bestDX = dAttachRight; bestX = targetLeft; }
      }
      if(horizontallyAligned){
        const targetBottom = b.bottom;
        const targetTop = b.top - a.height;
        const dAttachTop = Math.abs(a.top - targetBottom);
        const dAttachBottom = Math.abs(a.top - targetTop);
        if(dAttachTop < bestDY && dAttachTop <= threshold){ bestDY = dAttachTop; bestY = targetBottom; }
        if(dAttachBottom < bestDY && dAttachBottom <= threshold){ bestDY = dAttachBottom; bestY = targetTop; }
      }
    });
    if(bestX !== null) rack.x = bestX;
    if(bestY !== null) rack.y = bestY;

    const rackAxis = rackAxisData(rack);
    if(!rackAxis) return;

    const SNAP_TOL = {
      angleSoft: 8,
      angleHard: 3,
      side: Math.max(20, threshold * 1.6),
      end: Math.max(18, threshold * 1.25),
      align: Math.max(22, threshold * 1.8),
      exact: Math.max(10, threshold * 0.9)
    };
    const MIN_SEPARATION = 0;
    let best = null;
    neighbors.forEach(other => {
      const deltaAngle = Math.abs(shortestAngleDelta(rack.rot || 0, other.rot || 0));
      if(deltaAngle > SNAP_TOL.angleSoft) return;
      const otherAxis = rackAxisData(other);
      if(!otherAxis) return;
      const dx = rackAxis.cx - otherAxis.cx;
      const dy = rackAxis.cy - otherAxis.cy;
      const along = dx * otherAxis.ux + dy * otherAxis.uy;
      const lateral = dx * otherAxis.vx + dy * otherAxis.vy;
      const sideTargetAbs = (rackAxis.baseH + otherAxis.baseH) / 2 + MIN_SEPARATION;
      const endTargetAbs = (rackAxis.baseW + otherAxis.baseW) / 2 + MIN_SEPARATION;
      const sideGap = Math.abs(Math.abs(lateral) - sideTargetAbs);
      const endGap = Math.abs(Math.abs(along) - endTargetAbs);
      const alignGap = Math.abs(along);
      const overlapAlong = otherAxis.baseW - Math.abs(along);
      const overlapEnough = overlapAlong >= Math.max(8, Math.min(rackAxis.baseW, otherAxis.baseW) * 0.25);
      const edgeNear = alignGap <= otherAxis.baseW / 2 + rackAxis.baseW / 2 + SNAP_TOL.align;
      const anglePenalty = deltaAngle <= SNAP_TOL.angleHard ? 0 : (deltaAngle - SNAP_TOL.angleHard) * 2.2;

      if(sideGap <= SNAP_TOL.side && (overlapEnough || edgeNear)){
        const signLat = lateral >= 0 ? 1 : -1;
        const targetLat = signLat * sideTargetAbs;
        const targetAlong = clampAlongForNeighbor(along, rackAxis, otherAxis);
        const targetCx = otherAxis.cx + otherAxis.vx * targetLat + otherAxis.ux * targetAlong;
        const targetCy = otherAxis.cy + otherAxis.vy * targetLat + otherAxis.uy * targetAlong;
        const lanePenalty = overlapEnough ? 0 : Math.max(0, Math.abs(along) - (otherAxis.baseW/2 + rackAxis.baseW/2)) * 0.6;
        const score = sideGap + anglePenalty + lanePenalty;
        if(!best || score < best.score){
          best = { type:'side', score, cx:targetCx, cy:targetCy, otherId:other.id, side:[{x:otherAxis.cx + otherAxis.vx * targetLat + otherAxis.ux * (-otherAxis.baseW/2), y:otherAxis.cy + otherAxis.vy * targetLat + otherAxis.uy * (-otherAxis.baseW/2)}, {x:otherAxis.cx + otherAxis.vx * targetLat + otherAxis.ux * (otherAxis.baseW/2), y:otherAxis.cy + otherAxis.vy * targetLat + otherAxis.uy * (otherAxis.baseW/2)}] };
        }
      }

      if(endGap <= SNAP_TOL.end && Math.abs(lateral) <= Math.max(rackAxis.baseH, otherAxis.baseH) * 0.7 + SNAP_TOL.exact){
        const signAlong = along >= 0 ? 1 : -1;
        const targetAlong = signAlong * endTargetAbs;
        const targetLat = Math.abs(lateral) <= SNAP_TOL.exact ? 0 : lateral;
        const targetCx = otherAxis.cx + otherAxis.ux * targetAlong + otherAxis.vx * targetLat;
        const targetCy = otherAxis.cy + otherAxis.uy * targetAlong + otherAxis.vy * targetLat;
        const score = endGap + anglePenalty + Math.abs(targetLat) * 0.2;
        if(!best || score < best.score){
          best = { type:'end', score, cx:targetCx, cy:targetCy, otherId:other.id, side:[{x:otherAxis.cx + otherAxis.ux * targetAlong + otherAxis.vx * (-otherAxis.baseH/2), y:otherAxis.cy + otherAxis.uy * targetAlong + otherAxis.vy * (-otherAxis.baseH/2)}, {x:otherAxis.cx + otherAxis.ux * targetAlong + otherAxis.vx * (otherAxis.baseH/2), y:otherAxis.cy + otherAxis.uy * targetAlong + otherAxis.vy * (otherAxis.baseH/2)}] };
        }
      }
    });
    if(best){
      moveRackCenterTo(rack, best.cx, best.cy);
      setRackSnapPreview({ type:best.type, rackId:rack.id, otherId:best.otherId, line:best.side, strength: best.score <= threshold ? 'hard' : (best.score <= threshold * 1.45 ? 'medium' : 'soft') });
    }
  }
  function keepRackSnapped(rack, zone){
    if(!rack || !zone) return;
    if(!isSnapEnabled()){
      clearRackSnapPreview();
      resolveRackOverlap(rack, zone);
      keepRackInsideZone(rack, zone);
      recalcAllRackStackHeights();
      return;
    }
    snapRackToZoneEdges(rack, zone);
    snapRackToNeighbors(rack, zone);
    resolveRackOverlap(rack, zone);
    keepRackInsideZone(rack, zone);
    snapRackToZoneEdges(rack, zone, Math.max(3, getSnapSize() * 0.6));
    snapRackToNeighbors(rack, zone, Math.max(5, getSnapSize()));
    recalcAllRackStackHeights();
  }
  function renameRackByZone(rack, zoneId, seq){
    rack.zoneId = zoneId;
    rack.id = `${zoneId}-E${seq}`;
  }
  function assignRackToZone(rack, zoneId){
    if(!rack || !zoneId) return;
    if(rack.zoneId === zoneId && String(rack.id||'').startsWith(`${zoneId}-E`)) return;
    rack.zoneId = zoneId;
    rack.id = nextRackId(zoneId);
  }
  function normalizeZoneAndRackIds(){
    const zones = appState.layout.zones || [];
    const zoneRemap = new Map();
    const preserveRackPlacement = isStructureLayoutScreen() || (typeof distributionIsFreeMove==='function' && distributionIsFreeMove());
    zones.forEach((z, zi)=>{
      if(appState.layout.meta?.zoneSemantics==='virtual'){if(!z.name)z.name='Zona '+z.id;return;}
      const previousId = String(z?.id || '').toUpperCase();
      let nextId = previousId;
      if(isStorageZoneLike(previousId, z?.name)) nextId = 'ALM';
      else if(!/^Z\d+$/i.test(previousId)) nextId = `Z${zi+1}`;
      if(previousId && nextId !== previousId) zoneRemap.set(previousId, nextId);
      z.id = nextId;
      if(z.id === 'ALM') z.name = z.name && norm(z.name) !== 'almacen' ? z.name : 'Almacén';
      else if(!z.name) z.name = `Zona ${z.id}`;
    });
    if(appState.selectedZoneId && zoneRemap.has(String(appState.selectedZoneId).toUpperCase())){
      appState.selectedZoneId = zoneRemap.get(String(appState.selectedZoneId).toUpperCase());
    }
    (appState.layout.racks||[]).forEach(r=>{
      if(!r) return;
      if(zoneRemap.has(String(r.zoneId || '').toUpperCase())) r.zoneId = zoneRemap.get(String(r.zoneId || '').toUpperCase());
      if(appState.layout.meta?.zoneSemantics!=='virtual' && r.zoneId === 'ALM' && !String(r.id || '').toUpperCase().startsWith('ALM-E')){
        const est = parseInt((String(r.id || '').match(/-E(\d+)/i)||[])[1] || '1', 10) || 1;
        r.id = `ALM-E${est}`;
      }
      const fallbackW = Math.max(0, Number(r.w || 0));
      const fallbackH = Math.max(0, Number(r.h || 0));
      const anchorX = Number(r.x || 0);
      const anchorY = Number(r.y || 0);
      syncRackFootprint(r, false);
      if(!Number.isFinite(Number(r.x))) r.x = anchorX;
      if(!Number.isFinite(Number(r.y))) r.y = anchorY;
      if(preserveRackPlacement) return;
      const probe = { x: anchorX + Math.max(r.w || 0, fallbackW) / 2, y: anchorY + Math.max(r.h || 0, fallbackH) / 2 };
      const host = findZoneById(r.zoneId) || zones.find(z => pointInPoly(probe, z.pts));
      if(host){
        if(r.zoneId !== host.id) assignRackToZone(r, host.id);
        keepRackSnapped(r, host);
      }
    });
  }
  function renameZoneId(current, requested){
    const zone = findZoneById(current); if(!zone) return current;
    let raw = String(requested||'').trim();
    let target = raw.toUpperCase().replace(/\s+/g,'');
    if(!target) target = current;
    if(/^ALM(?:ACEN)?$/i.test(target)) target = 'ALM';
    else if(!/^Z\d+$/.test(target)){
      const num = parseInt((target.match(/(\d+)/)||[])[1] || '0',10);
      target = `Z${num || (appState.layout.zones.indexOf(zone)+1)}`;
    }
    if(target !== current && appState.layout.zones.some(z=>z.id===target)) return current;
    zone.id = target;
    if(target === 'ALM' && (!zone.name || norm(zone.name) === 'almacen')) zone.name = 'Almacén';
    else if(!zone.name) zone.name = `Zona ${target}`;
    normalizeZoneAndRackIds();
    persistActiveLayout();
    return zone.id;
  }

  function zoneRackSequence(zoneId){
    return (appState.layout.racks||[]).filter(r => r.zoneId === zoneId).sort((a,b)=> (a.x-b.x) || (a.y-b.y) || String(a.id).localeCompare(String(b.id)));
  }
  function duplicateSelectedRack(){
    const rack = findRackById(appState.selectedRackLayoutId); if(!rack) return;
    const zone = findZoneById(rack.zoneId); if(!zone) return;
    const copy = clone(rack);
    copy.id = nextRackId(zone.id);
    copy.x = snapGrid(rack.x + rack.w + 12);
    copy.y = snapGrid(rack.y);
    if(!(typeof distributionIsFreeMove==='function' && distributionIsFreeMove())) keepRackSnapped(copy, zone);
    appState.layout.racks.push(copy);
    appState.selectedRackLayoutId = copy.id;
    persistActiveLayout();
    renderLayoutEditor();
  }
  function duplicateSelectedZone(){
    if(findZoneById(appState.selectedZoneId)?.locked)return;
    const zone = findZoneById(appState.selectedZoneId); if(!zone || !isStructureLayoutScreen()) return;
    const cloneZone = clone(zone);
    const newId = nextZoneId();
    cloneZone.id = newId;
    cloneZone.name = `${zone.name || ('Zona '+zone.id)} copia`;
    cloneZone.color = getNextZoneColor(zone.color);
    delete cloneZone.linkedRoomId; delete cloneZone.dynamicFromRoom; delete cloneZone.roomLinkBroken; cloneZone.source='manual';
    let candidate=null;
    for(let step=1;step<=12;step++){
      const dx=60*step,dy=40*step; const pts=(zone.pts||[]).map(pt=>({x:snapGrid(pt.x+dx),y:snapGrid(pt.y+dy)}));
      const hit=typeof findZoneOverlap==='function'?findZoneOverlap('',pts):null;
      if(!hit){candidate=pts;break;}
    }
    if(!candidate){ if(typeof showToast==='function')showToast('No hay espacio libre cercano para duplicar la zona sin superponerla.','warning',2600); return; }
    recordHistorySnapshot('structure');
    cloneZone.pts = candidate;
    ensureZoneSectionCuts(cloneZone);
    appState.layout.zones.push(cloneZone);
    appState.selectedZoneId = newId;
    appState.selectedRackLayoutId = '';
    persistActiveLayout();
    renderLayoutEditor();
  }
  function drawArrowHead(layer, x, y, angle, color){
    const size = 6;
    const a1 = angle + Math.PI * 0.8;
    const a2 = angle - Math.PI * 0.8;
    layer.appendChild(svgEl('line',{x1:x,y1:y,x2:x + Math.cos(a1)*size,y2:y + Math.sin(a1)*size,stroke:color,'stroke-width':'1.2'}));
    layer.appendChild(svgEl('line',{x1:x,y1:y,x2:x + Math.cos(a2)*size,y2:y + Math.sin(a2)*size,stroke:color,'stroke-width':'1.2'}));
  }
  function getZoneOutwardEdgeNormal(zone, a, b){
    const dx = b.x-a.x, dy = b.y-a.y;
    const len = Math.hypot(dx,dy) || 1;
    let nx = -dy/len, ny = dx/len;
    const ctr = polygonCentroid(zone.pts);
    const mid = { x:(a.x+b.x)/2, y:(a.y+b.y)/2 };
    const probeA = { x:mid.x + nx*12, y:mid.y + ny*12 };
    const probeB = { x:mid.x - nx*12, y:mid.y - ny*12 };
    const insideA = pointInPoly(probeA, zone.pts);
    const insideB = pointInPoly(probeB, zone.pts);
    const distA = Math.hypot(probeA.x - ctr.x, probeA.y - ctr.y);
    const distB = Math.hypot(probeB.x - ctr.x, probeB.y - ctr.y);
    if((insideA && !insideB) || (distA < distB)){ nx *= -1; ny *= -1; }
    const finalProbe = { x:mid.x + nx*18, y:mid.y + ny*18 };
    if(pointInPoly(finalProbe, zone.pts)){ nx *= -1; ny *= -1; }
    return { x:nx, y:ny };
  }

  function getZoneOutwardVertexNormal(zone, idx){
    const pts = zone?.pts || [];
    const count = pts.length || 0;
    if(count < 2) return { x:0, y:-1 };
    const p = pts[idx];
    const prev = pts[(idx - 1 + count) % count];
    const next = pts[(idx + 1) % count];
    const n1 = getZoneOutwardEdgeNormal(zone, prev, p);
    const n2 = getZoneOutwardEdgeNormal(zone, p, next);
    let nx = n1.x + n2.x, ny = n1.y + n2.y;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len; ny /= len;
    const probe = { x:p.x + nx*16, y:p.y + ny*16 };
    if(pointInPoly(probe, pts)){ nx *= -1; ny *= -1; }
    return { x:nx, y:ny };
  }

  function drawRackMeasureLine(layer, x1,y1,x2,y2,label,color='#8fb7df', offset=0, formatter=formatDistanceCm, opts={}){
    const dx = x2-x1, dy = y2-y1;
    const len = Math.hypot(dx,dy) || 1;
    const settings = Object.assign({ showTextBox:false, textGap:10, dashed:true, normalOverride:null }, opts || {});
    let nx = -dy/len, ny = dx/len;
    if(settings.normalOverride && Number.isFinite(settings.normalOverride.x) && Number.isFinite(settings.normalOverride.y)){
      const nLen = Math.hypot(settings.normalOverride.x, settings.normalOverride.y) || 1;
      nx = settings.normalOverride.x / nLen;
      ny = settings.normalOverride.y / nLen;
    }
    const ax1 = x1 + nx*offset, ay1 = y1 + ny*offset;
    const ax2 = x2 + nx*offset, ay2 = y2 + ny*offset;
    layer.appendChild(svgEl('line',{
      x1:ax1,y1:ay1,x2:ax2,y2:ay2,stroke:color,'stroke-width':'1.4',
      ...(settings.dashed ? {'stroke-dasharray':'5 4'} : {}),opacity:'.98'
    }));
    layer.appendChild(svgEl('line',{x1:x1,y1:y1,x2:ax1,y2:ay1,stroke:color,'stroke-width':'1.1',opacity:'.78'}));
    layer.appendChild(svgEl('line',{x1:x2,y1:y2,x2:ax2,y2:ay2,stroke:color,'stroke-width':'1.1',opacity:'.78'}));
    const ang = Math.atan2(ay2-ay1, ax2-ax1);
    drawArrowHead(layer, ax1, ay1, ang, color);
    drawArrowHead(layer, ax2, ay2, ang + Math.PI, color);
    const tx = (ax1+ax2)/2 + nx*settings.textGap;
    const ty = (ay1+ay2)/2 + ny*settings.textGap;
    const textValue = typeof formatter === 'function' ? formatter(label) : String(Math.round(label));
    const text = svgEl('text',{x:tx,y:ty+1,class:'ortho-dim-text','text-anchor':'middle',style:`font-size:${getDimFontSize()}px`});
    text.textContent = textValue;
    const angDeg = ang*180/Math.PI + (Math.abs(ang) > Math.PI/2 ? 180 : 0);
    text.setAttribute('transform',`rotate(${angDeg} ${tx} ${ty+1})`);
    if(settings.showTextBox){
      const fontSize = getDimFontSize();
      const bgW = Math.max(72, Math.min(220, textValue.length * fontSize * .68 + 26));
      const bgH = Math.max(26, fontSize + 12);
      const bg = svgEl('rect',{x:tx-bgW/2,y:ty-bgH/2,width:bgW,height:bgH,rx:'8',fill:'rgba(8,18,30,.92)',stroke:color,'stroke-width':'1'});
      bg.setAttribute('transform',`rotate(${angDeg} ${tx} ${ty+1})`);
      layer.appendChild(bg);
    }
    layer.appendChild(text);
  }
  function drawZoneEdgeDimensions(layer, zone){
    if(!layer || !zone || !appState.editor.showDims) return;
    const b=zoneBounds(zone);
    const w=Math.max(0,b.maxX-b.minX),h=Math.max(0,b.maxY-b.minY);
    if(w<1||h<1)return;
    const cmPerUnit=Math.max(.01,getScaleCmPerUnit());
    const offset=58/cmPerUnit;
    // CAD: dimensiones generales fuera de la zona. Las cotas de las aristas
    // fragmentadas se consultan al seleccionar el elemento correspondiente.
    drawRackMeasureLine(layer,b.minX,b.minY,b.maxX,b.minY,w,'#b88949',offset,formatDistanceCm,{
      showTextBox:false,textGap:11/cmPerUnit,dashed:false,normalOverride:{x:0,y:-1}
    });
    drawRackMeasureLine(layer,b.minX,b.minY,b.minX,b.maxY,h,'#b88949',offset,formatDistanceCm,{
      showTextBox:false,textGap:11/cmPerUnit,dashed:false,normalOverride:{x:-1,y:0}
    });
  }
  function drawSelectedRackMeasurements(layer, rack, zone){
    if(!layer || !rack || !zone || !appState.editor.showDims) return;
    const fp = getRackFootprint(rack.modelId, rack.rot || 0);
    const geomW = Math.max(8, fp.baseW || rack.w || 0);
    const geomH = Math.max(8, fp.baseH || rack.h || 0);
    const cx = rack.x + Math.max(8, rack.w || fp.w || geomW)/2;
    const cy = rack.y + Math.max(8, rack.h || fp.h || geomH)/2;
    const angle = normalizeAngle(rack.rot || 0) * Math.PI / 180;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const ux = { x: cos, y: sin };
    const uy = { x: -sin, y: cos };
    const p1 = { x: cx - ux.x * geomW/2 - uy.x * geomH/2, y: cy - ux.y * geomW/2 - uy.y * geomH/2 };
    const p2 = { x: cx + ux.x * geomW/2 - uy.x * geomH/2, y: cy + ux.y * geomW/2 - uy.y * geomH/2 };
    const p3 = { x: cx + ux.x * geomW/2 + uy.x * geomH/2, y: cy + ux.y * geomW/2 + uy.y * geomH/2 };
    drawRackMeasureLine(layer, p1.x, p1.y, p2.x, p2.y, geomW, '#ff9f2f', 14, formatDistanceCm, {
      showTextBox:false,
      textGap:10,
      dashed:true,
      normalOverride:{ x:-uy.x, y:-uy.y }
    });
    drawRackMeasureLine(layer, p2.x, p2.y, p3.x, p3.y, geomH, '#ff9f2f', 14, formatDistanceCm, {
      showTextBox:false,
      textGap:10,
      dashed:true,
      normalOverride:{ x:ux.x, y:ux.y }
    });
  }
  function drawSelectedZoneMeasurements(layer, zone){
    if(!layer || !zone) return;
    drawZoneEdgeDimensions(layer, zone);
  }

