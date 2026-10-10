  function loadRackModels(){
    try{
      const raw = localStorage.getItem('wms_rack_models_v3');
      if(!raw) return null;
      const arr = JSON.parse(raw);
      if(!Array.isArray(arr) || !arr.length) return null;
      const baseDefaults = { std_4:{ width:120, depth:40, height:240 }, wide_5:{ width:120, depth:40, height:240 }, compact_3:{ width:120, depth:40, height:240 } };
      arr.forEach(model => {
        if(!model || !baseDefaults[model.id]) return;
        model.width = baseDefaults[model.id].width;
        model.depth = baseDefaults[model.id].depth;
        model.height = baseDefaults[model.id].height;
      });
      return arr;
    }catch{ return null; }
  }
  function saveRackModels(){
    try{ localStorage.setItem('wms_rack_models_v3', JSON.stringify(appState.models || [])); }catch{}
  }

  function makeDemoProducts(total = 8000){
    const bases = [
      ['Widget','Rojo'],['Gadget','Mediano'],['Componente','Azul'],['Producto','XL'],['Sensor','Negro'],['Caja técnica','Gris']
    ];
    const racks = buildDefaultLayoutForBranch(0).racks.map(r => r.id);
    const out = [];
    for(let i=1;i<=total;i++){
      const [n,v] = bases[i % bases.length];
      const rack = racks[i % racks.length];
      const lvl = (i % 4) + 1;
      const slot = (i % 2) + 1;
      const storageRack = racks[(i+3) % racks.length].startsWith('ALM') ? racks[(i+3)%racks.length] : 'ALM-E1';
      out.push({
        sku: 'SKU' + String(i).padStart(5,'0'),
        nombre: n + ' ' + ((i%12)+1),
        variante: v,
        ubicacion: `${rack}-N${lvl}-S${slot}`,
        almacen: `${storageRack}-N${((i+1)%4)+1}-S${((i+1)%2)+1}`,
        rack,
        rackStore: storageRack,
        zona: rack.split('-')[0],
        nivel: lvl,
        slot
      });
    }
    return out;
  }

  function clone(obj){ return JSON.parse(JSON.stringify(obj)); }
  function debounce(fn, ms=120){ let t; return (...args) => { clearTimeout(t); t=setTimeout(() => fn(...args), ms); }; }
  function getIsoViewConfig(view = appState?.ui?.isoView || 'NE'){
    const configs = {
      NE:{ label:'Iso NE', sx: 1, sy: 1, compass:'N ↗' },
      NW:{ label:'Iso NW', sx:-1, sy: 1, compass:'N ↖' },
      SE:{ label:'Iso SE', sx: 1, sy:-1, compass:'S ↘' },
      SW:{ label:'Iso SW', sx:-1, sy:-1, compass:'S ↙' }
    };
    return configs[view] || configs.NE;
  }
  function toIso(x,y,z=0){
    const a = Math.PI/6;
    const cfg = getIsoViewConfig();
    const xx = Number(x || 0) * cfg.sx;
    const yy = Number(y || 0) * cfg.sy;
    return { x:(xx-yy)*Math.cos(a), y:(xx+yy)*Math.sin(a)-z };
  }
  function rotateIsoView(direction = 1){
    const order = ['NE','SE','SW','NW'];
    const current = appState.ui?.isoView || 'NE';
    const idx = Math.max(0, order.indexOf(current));
    appState.ui.isoView = order[(idx + direction + order.length) % order.length];
  }
  function setIsoView(view){
    ensureAppRuntimeState();
    appState.ui.isoView = ['NE','NW','SE','SW'].includes(view) ? view : 'NE';
  }
  const ISO_Z_SCALE = 0.42;
  function svgEl(tag, attrs={}){ const el = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.entries(attrs).forEach(([k,v]) => el.setAttribute(k, v)); return el; }
  function face(points, attrs={}){ const d = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y} Z`; const baseAttrs = { d, 'stroke-linejoin':'round', 'stroke-linecap':'round', 'vector-effect':'non-scaling-stroke' }; return svgEl('path', { ...baseAttrs, ...attrs }); }
  function centroid(pts){ const s=pts.reduce((a,p)=>({x:a.x+p.x,y:a.y+p.y}),{x:0,y:0}); return { x:s.x/pts.length, y:s.y/pts.length }; }
  function norm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim(); }

  function parseSheetId(input){
    const value = String(input || '').trim();
    const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/i);
    return match ? match[1] : value;
  }

  function parseSheetUrl(url){
    const t = String(url||'').trim();
    const m = t.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if(m) return m[1];
    if(/^[a-zA-Z0-9-_]{20,}$/.test(t)) return t;
    return '';
  }

  function normalizeLocationCode(txt){
    let raw = String(txt || '').trim().toUpperCase();
    if (!raw) return '';
    raw = raw.replace(/\s+/g, '-').replace(/--+/g, '-');
    raw = raw.replace(/([A-Z0-9]+)\s*(E\d+)/g, '$1-$2');
    raw = raw.replace(/(E\d+)\s*(N\d+)/g, '$1-$2');
    raw = raw.replace(/(N\d+)\s*([SP]\d+)/g, '$1-$2');
    raw = raw.replace(/[^A-Z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-|-$/g, '');
    raw = raw.replace(/^ALM\d+(?=-E\d+$)/i, 'ALM');
    return raw;
  }
  function parseLocationCode(txt, fallbackRack='Z1-E1'){
    const raw = normalizeLocationCode(txt);
    const fallbackNorm = normalizeLocationCode(fallbackRack || 'Z1-E1') || 'Z1-E1';
    const fallbackZoneToken = (fallbackNorm.split('-')[0] || 'Z1').toUpperCase();
    const rawZoneToken = ((raw.match(/^([A-Z0-9]+)(?=-E\d+)/i) || [,''])[1] || fallbackZoneToken || 'Z1').toUpperCase();
    let zoneId = rawZoneToken;
    let zoneIndex = 0;
    if(/^ALM(?:ACEN)?$/i.test(rawZoneToken)){
      zoneId = 'ALM';
    } else {
      const zm = rawZoneToken.match(/^Z(\d+)$/i);
      if(zm){
        zoneIndex = Math.max(1, parseInt(zm[1], 10) || 1);
        zoneId = `Z${zoneIndex}`;
      } else {
        const fb = fallbackZoneToken.match(/^Z(\d+)$/i);
        if(/^ALM(?:ACEN)?$/i.test(fallbackZoneToken)){
          zoneId = 'ALM';
        } else if(fb){
          zoneIndex = Math.max(1, parseInt(fb[1], 10) || 1);
          zoneId = `Z${zoneIndex}`;
        } else {
          zoneId = 'Z1';
          zoneIndex = 1;
        }
      }
    }
    const est = Math.max(1, parseInt((raw.match(/-E(\d+)/i)||[])[1] || (fallbackNorm.match(/-E(\d+)/i)||[])[1] || '1', 10) || 1);
    const nivel = Math.max(1, parseInt((raw.match(/-N(\d+)/i)||[])[1] || '1', 10) || 1);
    const slot = Math.max(1, parseInt((raw.match(/-(?:S|P)(\d+)/i)||[])[1] || '1', 10) || 1);
    return { raw, zoneId, zoneIndex, rackId:`${zoneId}-E${est}`, level:nivel, slot, est, isStorage: zoneId === 'ALM' };
  }

  function isStorageZoneLike(value, name=''){
    const zid = String(value || '').trim().toUpperCase();
    const zname = norm(name || '');
    return /^ALM(?:ACEN)?$/i.test(zid) || /^ALM\d+$/i.test(zid) || zname === 'almacen';
  }
  function zoneBoundsOf(zone){
    const pts = Array.isArray(zone?.pts) ? zone.pts : [];
    const xs = pts.map(p=>Number(p.x)||0), ys = pts.map(p=>Number(p.y)||0);
    return { minX:Math.min(...xs), maxX:Math.max(...xs), minY:Math.min(...ys), maxY:Math.max(...ys) };
  }
  function isRectZone(zone){
    if(!zone || !Array.isArray(zone.pts) || zone.pts.length !== 4) return false;
    const b = zoneBoundsOf(zone);
    const expected = new Set([
      `${b.minX}|${b.minY}`,
      `${b.maxX}|${b.minY}`,
      `${b.maxX}|${b.maxY}`,
      `${b.minX}|${b.maxY}`
    ]);
    return zone.pts.every(pt => expected.has(`${Number(pt.x)||0}|${Number(pt.y)||0}`));
  }
  /* v98: función duplicada setRectZoneBounds removida para evitar overrides accidentales. */
function guessAutoRackWidth(slots, baseWidth=150, baseSlots=2){
    const s = Math.max(1, Number(slots)||1);
    const bs = Math.max(1, Number(baseSlots)||2);
    if(s <= bs) return Math.max(baseWidth, 120);
    return Math.round(baseWidth + (s - bs) * Math.max(42, Math.round(baseWidth / (bs + 1))));
  }
  function ensureAutoRackModel(levels, slots, preferredModelId='std_4'){
    const pref = rackModel(preferredModelId) || rackModel('std_4') || appState.models[0] || { id:'std_4', name:'Rack', levels:4, slots:2, width:120, depth:40, height:240, clearance:0, style:'metallic' };
    const lv = Math.max(1, parseInt(levels || pref.levels || 4, 10) || 4);
    const sl = Math.max(1, parseInt(slots || pref.slots || 2, 10) || 2);
    const style = pref.style || 'standard';
    const id = `auto_${style}_${lv}n_${sl}s`;
    let model = appState.models.find(m => m.id === id);
    if(!model){
      model = {
        id,
        name:`Auto ${lv} niveles / ${sl} slots`,
        levels: lv,
        slots: sl,
        width: guessAutoRackWidth(sl, Number(pref.width)||120, Number(pref.slots)||2),
        depth: Math.max(40, Number(pref.depth)||40),
        height: Math.max(140, Number(pref.height)||240, 80 + lv * 40),
        clearance: Math.max(0, Number(pref.clearance)||0),
        style,
        beam: Math.max(4, Number(pref.beam)||6)
      };
      appState.models.push(model);
      saveRackModels();
    } else {
      model.levels = Math.max(model.levels||0, lv);
      model.slots = Math.max(model.slots||0, sl);
      model.width = Math.max(Number(model.width)||0, guessAutoRackWidth(sl, Number(pref.width)||120, Number(pref.slots)||2));
      model.depth = Math.max(Number(model.depth)||0, Math.max(40, Number(pref.depth)||40));
      model.height = Math.max(Number(model.height)||0, Math.max(140, Number(pref.height)||240, 80 + lv * 40));
    }
    return model.id;
  }
  function createAutoZone(zoneId, branchIndex=0){
    ensureBranchLayouts();
    const idx = Number.isFinite(Number(branchIndex)) ? Number(branchIndex) : getActiveLayoutBranchIndex();
    const layout = appState.branchLayouts?.[idx] || appState.layout || { zones:[] };
    const zones = Array.isArray(layout.zones) ? layout.zones : [];
    const gap = 120;
    const cols = 3;
    const existing = zones.length;
    const col = existing % cols;
    const row = Math.floor(existing / cols);
    const baseX = 80;
    const baseY = 80;
    const startX = baseX + col * (DEFAULT_ZONE_SIZE.w + gap);
    const startY = baseY + row * (DEFAULT_ZONE_SIZE.h + gap);
    const zoneName = String(zoneId).toUpperCase() === 'ALM' ? 'Almacén' : `Zona ${String(zoneId).toUpperCase().replace(/^Z/, '')}`;
    return makeRectZone(zoneId, zoneName, getBranchColor(branchIndex), startX, startY, DEFAULT_ZONE_SIZE.w, DEFAULT_ZONE_SIZE.h);
  }
  function ensureRackFitsZoneRect(zone, rack, margin=28){
    if(!isRectZone(zone) || !rack) return;
    const b = zoneBoundsOf(zone);
    let minX = b.minX, minY = b.minY, maxX = b.maxX, maxY = b.maxY;
    if(rack.x < minX + margin) minX = rack.x - margin;
    if(rack.y < minY + margin) minY = rack.y - margin;
    if(rack.x + rack.w > maxX - margin) maxX = rack.x + rack.w + margin;
    if(rack.y + rack.h > maxY - margin) maxY = rack.y + rack.h + margin;
    setRectZoneBounds(zone, { minX, minY, maxX, maxY });
  }
  function placeRackInZone(layout, zone, rack){
    const margin = 28, gap = 18;
    const b = zoneBoundsOf(zone);
    const sameZone = (layout.racks || []).filter(r => r.zoneId === zone.id && r.id !== rack.id).sort((a,b)=>(a.y-b.y)||(a.x-b.x));
    let x = b.minX + margin;
    let y = b.minY + margin;
    if(sameZone.length){
      const last = sameZone[sameZone.length - 1];
      x = last.x + last.w + gap;
      y = last.y;
      if(x + rack.w > b.maxX - margin){
        x = b.minX + margin;
        y = Math.max(...sameZone.map(r => r.y + r.h), b.minY + margin) + gap;
      }
    }
    rack.x = x;
    rack.y = y;
    ensureRackFitsZoneRect(zone, rack, margin);
  }
  function syncBranchLayoutWithProducts(branchIndex, products=[]){
    ensureBranchLayouts();
    const idx = Number.isFinite(Number(branchIndex)) ? Number(branchIndex) : getActiveLayoutBranchIndex();
    const layout = clone(appState.branchLayouts[idx] || buildDefaultLayoutForBranch(idx));
    if(!Array.isArray(layout.zones)) layout.zones = [];
    if(!Array.isArray(layout.racks)) layout.racks = [];
    if(!layout.meta || typeof layout.meta !== 'object') layout.meta = { createdAt: Date.now(), scaleCmPerUnit: 1 };

    const zoneIdRemap = new Map();
    (layout.zones || []).forEach(z => {
      const previousId = String(z?.id || '').toUpperCase();
      if(isStorageZoneLike(previousId, z?.name)){
        if(previousId && previousId !== 'ALM') zoneIdRemap.set(previousId, 'ALM');
        z.id = 'ALM';
        z.name = 'Almacén';
      }
    });
    (layout.racks || []).forEach(r => {
      const zid = String(r?.zoneId || '').toUpperCase();
      const nextZoneId = zoneIdRemap.get(zid) || (isStorageZoneLike(zid) ? 'ALM' : '');
      if(nextZoneId === 'ALM'){
        r.zoneId = 'ALM';
        r.id = String(r.id || '').replace(/^[A-Z0-9]+-E/i, 'ALM-E');
      }
    });

    const zoneReqs = new Map();
    let maxZoneIndex = 0;
    let hasALM = false;
    const touchZoneReq = zoneId => {
      if(!zoneReqs.has(zoneId)) zoneReqs.set(zoneId, { zoneId, maxRack:0, maxLevel:0, maxSlot:0, hits:0 });
      return zoneReqs.get(zoneId);
    };
    const pushReq = (loc, fallbackRack, forceZoneId='') => {
      const rawLoc = normalizeLocationCode(loc);
      if(!rawLoc && !forceZoneId) return;
      const parsed = parseLocationCode(rawLoc || forceZoneId, fallbackRack);
      let zoneId = forceZoneId || parsed.zoneId;
      let zoneIndex = parsed.zoneIndex || 0;
      if(!forceZoneId && /^ALM(?:ACEN)?(?:-|$)/i.test(rawLoc)) zoneId = 'ALM';
      if(!zoneId) return;
      if(zoneId === 'ALM') hasALM = true;
      else if(/^Z\d+$/i.test(zoneId)) maxZoneIndex = Math.max(maxZoneIndex, zoneIndex || 0);
      const req = touchZoneReq(zoneId);
      req.maxRack = Math.max(req.maxRack, parsed.est || 1);
      req.maxLevel = Math.max(req.maxLevel, parsed.level || 1);
      req.maxSlot = Math.max(req.maxSlot, parsed.slot || 1);
      req.hits += 1;
    };
    (products || []).forEach(p => {
      if(p?.ubicacion){
        const rawMain = normalizeLocationCode(p.ubicacion);
        const forceMainZone = /^ALM(?:ACEN)?(?:-|$)/i.test(rawMain) ? 'ALM' : '';
        pushReq(rawMain, p.rack || (forceMainZone === 'ALM' ? 'ALM-E1' : 'Z1-E1'), forceMainZone);
      }
      if(p?.almacen){
        const rawStore = normalizeLocationCode(p.almacen);
        const forceStoreZone = /^ALM(?:ACEN)?(?:-|$)/i.test(rawStore) ? 'ALM' : '';
        pushReq(rawStore, p.rackStore || (forceStoreZone === 'ALM' ? 'ALM-E1' : 'Z1-E1'), forceStoreZone);
      }
    });
    if((products || []).some(p => {
      const rawMain = normalizeLocationCode(p?.ubicacion);
      const rawStore = normalizeLocationCode(p?.almacen);
      return /^ALM(?:ACEN)?(?:-|$)/i.test(rawMain) || /^ALM(?:ACEN)?(?:-|$)/i.test(rawStore);
    })){
      hasALM = true;
      touchZoneReq('ALM');
    }

    const desiredZoneIds = [];
    for(let i=1;i<=Math.max(0, maxZoneIndex);i++) desiredZoneIds.push(`Z${i}`);
    if(hasALM || zoneReqs.has('ALM')) desiredZoneIds.push('ALM');
    const desiredZoneSet = new Set(desiredZoneIds);

    layout.zones = layout.zones.filter(z => {
      const zid = String(z?.id || '').toUpperCase();
      if(/^Z\d+$/.test(zid) || zid === 'ALM') return desiredZoneSet.has(zid);
      return true;
    });
    layout.racks = layout.racks.filter(r => {
      const zid = String(r?.zoneId || '').toUpperCase();
      if(/^Z\d+$/.test(zid) || zid === 'ALM') return desiredZoneSet.has(zid);
      return true;
    });

    desiredZoneIds.forEach(zoneId => {
      if(!layout.zones.some(z => z.id === zoneId)) layout.zones.push(createAutoZone(zoneId, idx));
    });

    desiredZoneIds.forEach(zoneId => {
      const req = zoneReqs.get(zoneId) || { maxRack:0, maxLevel:0, maxSlot:0 };
      const zone = layout.zones.find(z => z.id === zoneId) || createAutoZone(zoneId, idx);
      if(!layout.zones.some(z => z.id === zoneId)) layout.zones.push(zone);
      const maxRack = Math.max(0, req.maxRack || 0);
      const maxLevel = Math.max(1, req.maxLevel || 1);
      const maxSlot = Math.max(1, req.maxSlot || 1);

      if(maxRack > 0){
        const zoneRacks = layout.racks.filter(r => r.zoneId === zoneId);
        zoneRacks.forEach(r => {
          const m = String(r.id || '').match(/-E(\d+)$/i);
          const num = Math.max(1, parseInt(m?.[1] || '1', 10) || 1);
          if(num > maxRack) r.__drop = true;
        });
        layout.racks = layout.racks.filter(r => !r.__drop);
        const autoModelId = ensureAutoRackModel(maxLevel, maxSlot, zoneRacks[0]?.modelId || 'std_4');
        for(let e=1; e<=maxRack; e++){
          const rackId = `${zoneId}-E${e}`;
          let rack = layout.racks.find(r => r.id === rackId);
          if(!rack){
            rack = { id:rackId, zoneId, x:0, y:0, w:84, h:46, rot:0, modelId:autoModelId, front:'auto', baseHeight:0, rackHeight:238 };
            layout.racks.push(rack);
          }
          rack.zoneId = zoneId;
          rack.modelId = autoModelId;
          rack.rackHeight = Math.max(120, Number(rackModel(autoModelId)?.height || rack.rackHeight || 238));
          syncRackFootprint(rack, rack.x > 0 || rack.y > 0);
          if(!(Number.isFinite(rack.x) && Number.isFinite(rack.y)) || (rack.x === 0 && rack.y === 0)) placeRackInZone(layout, zone, rack);
          ensureRackFitsZoneRect(zone, rack);
        }
      }
    });

    layout.zones.sort((a,b) => {
      const aa = String(a?.id || '').toUpperCase(), bb = String(b?.id || '').toUpperCase();
      if(aa === 'ALM' && bb !== 'ALM') return 1;
      if(bb === 'ALM' && aa !== 'ALM') return -1;
      const na = parseInt((aa.match(/^Z(\d+)$/)||[])[1] || '9999', 10);
      const nb = parseInt((bb.match(/^Z(\d+)$/)||[])[1] || '9999', 10);
      return na - nb;
    });
    layout.zones.forEach(z => ensureZoneSectionCuts(z));
    appState.branchLayouts[idx] = layout;
    if(getActiveLayoutBranchIndex() === idx || appState.activeBranchIndex === idx){
      appState.layout = clone(layout);
      ensureLayoutMeta();
      ensureRackProps();
      appState.selectedZoneId = appState.selectedZoneId && appState.layout.zones.some(z => z.id === appState.selectedZoneId) ? appState.selectedZoneId : (appState.layout.zones[0]?.id || '');
      appState.selectedRackLayoutId = appState.selectedRackLayoutId && appState.layout.racks.some(r => r.id === appState.selectedRackLayoutId) ? appState.selectedRackLayoutId : (appState.layout.racks[0]?.id || '');
    }
    saveBranchLayouts();
  }
  function pointInPoly(point, vs){
    let inside = false;
    for (let i=0,j=vs.length-1;i<vs.length;j=i++){
      const xi=vs[i].x, yi=vs[i].y, xj=vs[j].x, yj=vs[j].y;
      const intersect = ((yi>point.y)!==(yj>point.y)) && (point.x < (xj-xi)*(point.y-yi)/(yj-yi+0.00001)+xi);
      if(intersect) inside = !inside;
    }
    return inside;
  }
  function dist2(a,b){ const dx=a.x-b.x, dy=a.y-b.y; return dx*dx + dy*dy; }
  function projectPointToSegment(p,a,b){
    const vx=b.x-a.x, vy=b.y-a.y, wx=p.x-a.x, wy=p.y-a.y;
    const vv = vx*vx + vy*vy || 1;
    let t = (wx*vx + wy*vy)/vv; t=Math.max(0,Math.min(1,t));
    return { x:a.x+t*vx, y:a.y+t*vy, t };
  }

  function getScaleCmPerUnit(){
    const v = Number(appState.layout?.meta?.scaleCmPerUnit);
    return Number.isFinite(v) && v > 0 ? v : 1;
  }
  function ensureLayoutMeta(){
    if(!appState.layout.meta || typeof appState.layout.meta !== 'object') appState.layout.meta = {};
    if(!Number.isFinite(Number(appState.layout.meta.scaleCmPerUnit)) || Number(appState.layout.meta.scaleCmPerUnit) <= 0) appState.layout.meta.scaleCmPerUnit = 1;
    return appState.layout.meta;
  }
  function unitsToCm(units){ return Number(units || 0) * getScaleCmPerUnit(); }
  function formatDistanceCm(units){
    const cm = unitsToCm(units);
    if(cm >= 100) return `${(cm/100).toFixed(2).replace(/\.00$/,'')} m`;
    return `${Math.round(cm)} cm`;
  }
  function formatDistanceShort(units){ return `${Math.round(unitsToCm(units))} cm`; }
  function polygonArea(pts){ let sum = 0; for(let i=0;i<pts.length;i++){ const a = pts[i], b = pts[(i+1)%pts.length]; sum += a.x*b.y - b.x*a.y; } return sum/2; }
  function polygonCentroid(pts){ const area = polygonArea(pts) || 1; let cx = 0, cy = 0; for(let i=0;i<pts.length;i++){ const a = pts[i], b = pts[(i+1)%pts.length]; const f = a.x*b.y - b.x*a.y; cx += (a.x + b.x) * f; cy += (a.y + b.y) * f; } return { x: cx / (6*area), y: cy / (6*area) }; }
  function pointNearPolygonEdge(point, pts, tolerance = 8){ for(let i=0;i<pts.length;i++){ const a = pts[i], b = pts[(i+1)%pts.length]; const proj = projectPointToSegment(point, a, b); if(Math.sqrt(dist2(point, proj)) <= tolerance) return true; } return false; }
  function rackCorners(rack){
    if(!rack) return [];
    const fp = getRackFootprint(rack.modelId, rack.rot || 0);
    const bw = fp.baseW || rack.w || 0;
    const bh = fp.baseH || rack.h || 0;
    const ang = normalizeAngle(rack.rot || 0) * Math.PI / 180;
    const cos = Math.cos(ang), sin = Math.sin(ang);
    const cx = rack.x + (rack.w || fp.w || bw) / 2;
    const cy = rack.y + (rack.h || fp.h || bh) / 2;
    const pts = [
      { x:-bw/2, y:-bh/2 },
      { x:bw/2, y:-bh/2 },
      { x:bw/2, y:bh/2 },
      { x:-bw/2, y:bh/2 }
    ];
    return pts.map(pt => ({
      x: cx + pt.x * cos - pt.y * sin,
      y: cy + pt.x * sin + pt.y * cos
    }));
  }
  function rackFullyInsideZone(rack, zone){ return !!(rack && zone) && rackCorners(rack).every(pt => pointInPoly(pt, zone.pts) || pointNearPolygonEdge(pt, zone.pts, 1)); }
  function collectSnapPoints(exceptZoneId = ''){
    const out = [];
    (appState.layout?.zones || []).forEach(zone => {
      if(zone.id === exceptZoneId || !Array.isArray(zone.pts)) return;
      zone.pts.forEach((pt, idx) => {
        out.push({ x:pt.x, y:pt.y, zoneId:zone.id, idx, type:'zone-vertex', label:`Vértice ${zone.id}` });
        const b=zone.pts[(idx+1)%zone.pts.length];
        if(b) out.push({x:(pt.x+b.x)/2,y:(pt.y+b.y)/2,zoneId:zone.id,type:'zone-mid',label:`Centro borde ${zone.id}`});
      });
    });
    (appState.layout?.walls||[]).forEach(w=>{
      out.push({x:Number(w.x1||0),y:Number(w.y1||0),wallId:w.id,type:'wall-end',label:`Extremo ${w.id}`});
      out.push({x:Number(w.x2||0),y:Number(w.y2||0),wallId:w.id,type:'wall-end',label:`Extremo ${w.id}`});
      out.push({x:(Number(w.x1||0)+Number(w.x2||0))/2,y:(Number(w.y1||0)+Number(w.y2||0))/2,wallId:w.id,type:'wall-mid',label:`Centro ${w.id}`});
    });
    return out;
  }
  function snapPointAdvanced(point, { zoneId = '', keepAxis = null, origin = null } = {}){
    let x = snapGrid(point.x), y = snapGrid(point.y), type='grid', label='Rejilla';
    if(keepAxis === 'x' && origin) y = origin.y;
    if(keepAxis === 'y' && origin) x = origin.x;
    if(!isSnapEnabled()) return { x, y, type, label };
    const threshold = Math.max(6, Math.min(28, getSnapSize() * 3.6));
    let best=null;
    collectSnapPoints(zoneId).forEach(pt=>{
      let tx=pt.x,ty=pt.y;
      if(keepAxis==='x'&&origin) ty=origin.y;
      if(keepAxis==='y'&&origin) tx=origin.x;
      const d=Math.hypot(tx-x,ty-y);
      if(d<=threshold && (!best||d<best.d)) best={...pt,x:tx,y:ty,d};
    });
    if(best){ x=best.x;y=best.y;type=best.type;label=best.label; }
    else {
      let edgeBest=null;
      const consider=(a,b,edgeLabel,edgeType)=>{
        const pr=projectPointToSegment({x,y},a,b),d=Math.hypot(pr.x-x,pr.y-y);
        let px=pr.x,py=pr.y;
        if(keepAxis==='x'&&origin)py=origin.y;
        if(keepAxis==='y'&&origin)px=origin.x;
        const dd=Math.hypot(px-x,py-y);
        if(dd<=threshold*.78&&(!edgeBest||dd<edgeBest.d))edgeBest={x:px,y:py,d:dd,label:edgeLabel,type:edgeType};
      };
      (appState.layout?.zones||[]).forEach(z=>{if(z.id===zoneId)return;(z.pts||[]).forEach((a,i)=>{const b=z.pts[(i+1)%z.pts.length];if(b)consider(a,b,`Borde ${z.id}`,'zone-edge');});});
      (appState.layout?.walls||[]).forEach(w=>consider({x:Number(w.x1||0),y:Number(w.y1||0)},{x:Number(w.x2||0),y:Number(w.y2||0)},`Muro ${w.id}`,'wall-edge'));
      if(edgeBest){x=edgeBest.x;y=edgeBest.y;type=edgeBest.type;label=edgeBest.label;}
      else {
        let ax=null,ay=null;
        collectSnapPoints(zoneId).forEach(pt=>{const dx=Math.abs(pt.x-x),dy=Math.abs(pt.y-y);if(dx<=threshold*.55&&(!ax||dx<ax.d))ax={d:dx,v:pt.x,label:pt.label};if(dy<=threshold*.55&&(!ay||dy<ay.d))ay={d:dy,v:pt.y,label:pt.label};});
        if(ax&&keepAxis!=='y'){x=ax.v;type='align-x';label=`Alinear X · ${ax.label}`;} if(ay&&keepAxis!=='x'){y=ay.v;type='align-y';label=`Alinear Y · ${ay.label}`;}
      }
    }
    return { x, y, type, label };
  }
  function getRackOccupancy(rackId){ let total = 0; for(const p of (appState.products || [])){ if(p.rack === rackId || p.rackStore === rackId) total++; } return total; }

  function seedState(){
    ensureBranchLayouts();
    loadLayoutForBranch(getActiveLayoutBranchIndex());
    setProductDataset(makeDemoProducts());
    appState.filtered = appState.products.slice(0, 400);
    appState.selectedProduct = appState.products[0];
    appState.selectedRack = appState.products[0].rack;
    appState.selectedRackLayoutId = appState.products[0].rack;
  }

  function isCompactViewport(){
    return window.innerWidth <= 1280;
  }

  function renderViewerMenu(){
    ensureAppRuntimeState();
    const host = document.getElementById('viewerBranchMenu');
    if(!host) return;
    const branches = Array.isArray(appState.admin?.branches) ? appState.admin.branches : [];
    const activeViewerIndex = Number(appState.viewerBranchIndex ?? -1);
    host.innerHTML = branches.length ? branches.map((b, i) => {
      const active = appState.screen === 'viewer' && activeViewerIndex === i;
      return `<div class="menu-item ${active ? 'active' : ''}" data-screen="viewer" data-viewer-branch-menu="${i}">👁 <span>${escapeHtml(b?.name || ('Sucursal ' + (i + 1)))}</span></div>`;
    }).join('') : '<div class="menu-item active" data-screen="viewer" data-viewer-branch-menu="-1">👁 <span>Visualizar</span></div>';
    host.querySelectorAll('[data-viewer-branch-menu]').forEach(item => {
      item.onclick = async () => {
        const idx = Number(item.getAttribute('data-viewer-branch-menu'));
        appState.viewerBranchIndex = idx;
        setScreen('viewer');
        if(idx >= 0) await switchViewerBranch(idx);
        else renderViewerBranchHost(-1);
        renderViewerMenu();
      };
    });
  }

  function normalizeAppScreenName(screen){
    const value = String(screen || '').trim();
    const allowed = ['admin','sheet','layout','distribution','racks','rack-builder','virtual','viewer'];
    if(value === 'card' || value === 'products') return 'sheet';
    return allowed.includes(value) ? value : 'viewer';
  }
  function getLastAppScreen(){
    try{
      const saved = normalizeAppScreenName(localStorage.getItem('wms_last_screen_v95') || '');
      return ['admin','sheet','layout','distribution','racks','rack-builder','virtual','viewer'].includes(saved) ? saved : 'admin';
    }catch(_err){ return 'admin'; }
  }
  function persistLastAppScreen(screen){
    try{
      const normalized = normalizeAppScreenName(screen);
      if(['admin','sheet','layout','distribution','racks','rack-builder','virtual','viewer'].includes(normalized)) localStorage.setItem('wms_last_screen_v95', normalized);
    }catch(_err){}
  }

  function setScreen(screen){
    ensureAppRuntimeState();
    screen = normalizeAppScreenName(screen);
    if(screen === 'card') screen = 'sheet';
    if(!appState.auth?.loggedIn && !appState.auth?.viewerGuest && screen !== 'viewer' && screen !== 'virtual'){
      appState.ui = appState.ui || {};
      appState.ui.pendingScreenAfterLogin = screen;
      openAuthModal('');
      screen = 'viewer';
    }
    if((appState.auth?.viewerGuest || String(appState.auth?.role||'') === 'viewer') && screen !== 'viewer' && screen !== 'virtual'){ screen = 'viewer'; }
    cleanupLayoutAutoFit();
    if(screen !== 'virtual' && vspaceActive?.destroy){ vspaceActive.destroy(); vspaceActive = null; }
    appState.screen = screen;
    if(appRoot) appRoot.dataset.screen = screen;
    if(document?.body) document.body.dataset.screen = screen;
    persistLastAppScreen(screen);
    menuItems.forEach(i => i.classList.toggle('active', i.dataset.screen === screen));
    renderViewerMenu();
    const showSearch = ['sheet','viewer'].includes(screen);
    const compactViewport = isCompactViewport();
    const isSheetLayout = screen === 'sheet';
    const isCardDesignerScreen = false;
    appRoot.classList.toggle('card-designer-layout', isCardDesignerScreen);
    appRoot.classList.toggle('sheet-swap-layout', isSheetLayout);
    appRoot.classList.toggle('sheet-expanded', isSheetLayout && !!appState.ui.sheetExpanded);
    if(showSearch){
      document.querySelector('.search-panel').style.display='';
      const isViewer = screen === 'viewer';
      appRoot.classList.toggle('viewer-product-layout', isViewer);
      appRoot.classList.remove('editor-workspace');
      if(isViewer){
        if(contentPanel) contentPanel.style.display = 'none';
        if(detailPanel) detailPanel.style.display = '';
        contentPanel.classList.remove('full-span');
        contentPanel.style.gridColumn = '';
        contentPanel.style.gridRow = '';
        if(detailPanel){
          detailPanel.style.gridColumn = '';
          detailPanel.style.gridRow = '';
        }
        appRoot.style.gridTemplateColumns = ''; // V168: CSS responsive manages the viewer's columns at 100% zoom
      }else{
        if(contentPanel) contentPanel.style.display = '';
        detailPanel.style.display = isSheetLayout ? 'none' : '';
        contentPanel.classList.remove('full-span');
        contentPanel.style.gridColumn = '';
        contentPanel.style.gridRow = '';
        if(detailPanel){
          detailPanel.style.gridColumn = '';
          detailPanel.style.gridRow = '';
        }
        appRoot.style.gridTemplateColumns = compactViewport ? '' : '';
      }
    }else{
      appRoot.classList.remove('sheet-swap-layout');
      appRoot.classList.remove('sheet-expanded');
      appRoot.classList.remove('viewer-product-layout');
      appRoot.classList.toggle('editor-workspace', ['layout','distribution'].includes(screen));
      if(contentPanel) contentPanel.style.display = '';
      document.querySelector('.search-panel').style.display='none';
      const isRackModels = screen === 'racks' || screen === 'rack-builder';
      const isLayoutScreen = screen === 'layout' || screen === 'distribution' || screen === 'virtual';
      const isCardDesigner = false;
      detailPanel.style.display = (isRackModels || isLayoutScreen) ? 'none' : '';
      contentPanel.classList.toggle('full-span', isRackModels || isLayoutScreen);
      contentPanel.style.gridColumn = compactViewport ? '' : ((isRackModels || isLayoutScreen) ? '2 / -1' : '');
      if(compactViewport){
        appRoot.style.gridTemplateColumns = '';
      }else if(isRackModels || isLayoutScreen){
        appRoot.style.gridTemplateColumns = appRoot.classList.contains('sidebar-collapsed') ? 'var(--sidebar-w-collapsed) minmax(0,1fr)' : 'var(--sidebar-w) minmax(0,1fr)';
      }else if(isCardDesigner){
        appRoot.style.gridTemplateColumns = appRoot.classList.contains('sidebar-collapsed') ? 'var(--sidebar-w-collapsed) minmax(640px,1fr) minmax(640px,1fr)' : 'var(--sidebar-w) minmax(640px,1fr) minmax(640px,1fr)';
      }else{
        appRoot.style.gridTemplateColumns = appRoot.classList.contains('sidebar-collapsed') ? 'var(--sidebar-w-collapsed) 1fr 320px' : 'var(--sidebar-w) 1fr 320px';
      }
    }
    contentWrap.innerHTML = '';
    detailWrap.innerHTML = '';
    renderViewerBranchHost(screen === 'viewer' ? getActiveBranchContextIndex() : -1);
    contentStatus.textContent = 'Cargando vista…';
    detailStatus.textContent = '—';
    detailChip.textContent = '—';
    try{
      if(screen === 'admin') renderAdminScreen();
      else if(screen === 'sheet') (typeof renderSheetScreen==='function'?renderSheetScreen():renderMapView());
      else if(screen === 'layout' || screen === 'distribution') renderLayoutEditor();
      else if(screen === 'virtual') renderVirtualSpace();
      else if(screen === 'racks') renderRackModels();
      else if(screen === 'rack-builder') renderRackConstructionWorkspace();
      else renderMapView();
    }catch(err){
      console.error('Error al cambiar de pantalla:', err);
      contentTitle.textContent = 'Error de navegación';
      contentSubtitle.textContent = 'No se pudo abrir la vista solicitada.';
      contentWrap.innerHTML = `<div class="empty"><b>No se pudo abrir la pantalla.</b><div class="muted tiny" style="margin-top:8px">${escapeHtml(err.message || 'Error desconocido')}</div></div>`;
      detailTitle.textContent = 'Detalle';
      detailSubtitle.textContent = 'Sin información';
      detailWrap.innerHTML = '';
      contentStatus.textContent = 'Error al abrir la vista';
    }
  }

  function setTags(tags=[]){
    contentTags.innerHTML = tags.map(t => {
      const item = typeof t === 'string' ? { label:t, active:true } : (t || {});
      const label = escapeHtml(String(item.label || ''));
      const cls = (item.active === false ? 'tag inactive' : 'tag active') + (item.extraClass ? ` ${escapeHtml(String(item.extraClass))}` : '');
      if(item.action){
        const historyMatch = String(item.action).match(/^history-(undo|redo)-(.+)$/);
        const historyType = historyMatch ? historyMatch[2] : '';
        const historyAttr = historyMatch ? ` data-history-${historyMatch[1]}="${historyType}"` : '';
        return `<button type="button" class="${cls}" data-layout-tag-action="${escapeHtml(String(item.action))}"${historyAttr}>${label}</button>`;
      }
      return `<span class="${cls}">${label}</span>`;
    }).join('');
  }

  function getProductSizeValue(product){
    if(!product) return '';
    const raw = String(product.talla || '').trim();
    if(raw) return raw.toUpperCase();
    const variant = String(product.variante || '').trim();
    if(!variant) return '';
    const match = variant.match(/(?:^|\b)(?:talla\s*)?(XXXL|XXL|XXS|XS|XL|L|M|S|3XL|2XL|4XL|5XL|U|UNICA|ÚNICA)(?:\b|$)/i);
    return match ? match[1].toUpperCase().replace('ÚNICA','UNICA') : '';
  }

  function getProductColorValue(product){
    if(!product) return '';
    const raw = String(product.color || '').trim();
    if(raw) return raw;
    const variant = String(product.variante || '').trim();
    if(!variant) return '';
    let cleaned = variant
      .replace(/(?:^|\b)talla\b/ig, ' ')
      .replace(/(?:^|\b)(XXXL|XXL|XXS|XS|XL|L|M|S|3XL|2XL|4XL|5XL|U|UNICA|ÚNICA)(?:\b|$)/ig, ' ')
      .replace(/[\-_/,]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned;
  }


  function getViewerProductFamilyItems(product){
    if(!product) return [];
    const list = Array.isArray(appState.products) ? appState.products : [];
    const nameKey = norm(product.nombre || '');
    const variantKey = norm(product.variante || '');
    const skuBase = norm(String(product.sku || '').replace(/[-_ ]?(?:xs|s|m|l|xl|xxl|xxxl|\d+)$/i,''));
    const sameName = nameKey ? list.filter(p => norm(p?.nombre || '') === nameKey) : [];
    if(sameName.length > 1) return sameName;
    if(skuBase){
      const sameSkuBase = list.filter(p => norm(String(p?.sku || '').replace(/[-_ ]?(?:xs|s|m|l|xl|xxl|xxxl|\d+)$/i,'')) === skuBase);
      if(sameSkuBase.length > 1) return sameSkuBase;
    }
    if(variantKey && nameKey){
      const fuzzy = list.filter(p => norm(p?.nombre || '') === nameKey || norm(p?.variante || '') === variantKey);
      if(fuzzy.length > 1) return fuzzy;
    }
    return [product];
  }

  function getViewerProductFamilySummary(product){
    const items = getViewerProductFamilyItems(product);
    const sizes = Array.from(new Set(items.map(p => getProductSizeValue(p)).filter(Boolean)));
    sizes.sort((a,b) => {
      const rank = getLogicalSizeRank(a) - getLogicalSizeRank(b);
      return rank || String(a).localeCompare(String(b), 'es', { sensitivity:'base', numeric:true });
    });
    const colors = Array.from(new Set(items.map(p => getProductColorValue(p)).filter(Boolean)));
    colors.sort((a,b) => String(a).localeCompare(String(b), 'es', { sensitivity:'base', numeric:true }));
    return { items, sizes, colors };
  }


  function getViewerColorChipStyle(colorName){
    const key = norm(colorName || '');
    const palette = {
      'amarillo': { bg:'#f3cf4f', text:'#3f2c00', border:'#f7dd80' },
      'arena': { bg:'#cfbfa0', text:'#352b1a', border:'#dfd1b5' },
      'azalea': { bg:'#c9b3e6', text:'#352450', border:'#dac9ef' },
      'blanco': { bg:'#f3f4f6', text:'#31353b', border:'#ffffff' },
      'melon': { bg:'#d6dd88', text:'#334015', border:'#e4e8ae' },
      'negro': { bg:'#23272f', text:'#f3f7fb', border:'#4a5360' },
      'plomo': { bg:'#858b95', text:'#10151d', border:'#aab0b8' },
      'coral': { bg:'#ff9478', text:'#4b2115', border:'#ffb39f' },
      'rojo': { bg:'#de5a54', text:'#fff5f4', border:'#ea827d' },
      'beige': { bg:'#dac8ab', text:'#342a1b', border:'#e7dbc7' },
      'palo rosa': { bg:'#d792a7', text:'#472434', border:'#e7b7c5' },
      'azul': { bg:'#6a93d8', text:'#f4f8ff', border:'#8cb0ea' },
      'verde': { bg:'#71bf8d', text:'#143322', border:'#95d2aa' },
      'lila': { bg:'#c3abdd', text:'#352549', border:'#d6c5ea' },
      'rosado': { bg:'#efb6c9', text:'#4a2330', border:'#f3cad7' },
      'fucsia': { bg:'#d964a8', text:'#fff4fb', border:'#e58abf' },
      'marron': { bg:'#8b6148', text:'#fff8f4', border:'#a67a5d' },
      'chocolate': { bg:'#6f5238', text:'#fff8f1', border:'#8d6b4c' },
      'indigo': { bg:'#6674b8', text:'#f5f7ff', border:'#8894cd' },
      'índigo': { bg:'#6674b8', text:'#f5f7ff', border:'#8894cd' },
      'perla': { bg:'#ece7da', text:'#3b3730', border:'#faf6ea' },
      'melange': { bg:'#b6b6b1', text:'#21242b', border:'#d0d0ca' },
      'gris': { bg:'#9aa1ab', text:'#151922', border:'#bbc0c7' }
    };
    const tone = palette[key] || { bg:'rgba(255,255,255,.08)', text:'#effbf4', border:'rgba(255,255,255,.16)' };
    return `background:${tone.bg};color:${tone.text};border-color:${tone.border};`;
  }

  function normalizeVariantValue(value){
    return norm(String(value || '').trim());
  }

  function getVariantToneKey(value){
    const key = normalizeVariantValue(value);
    if(!key) return 'tone-1';
    let hash = 0;
    for(let i = 0; i < key.length; i++){
      hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
    }
    const idx = Math.abs(hash % 6) + 1;
    return `tone-${idx}`;
  }
  function getProductSearchText(product){
    if(!product) return '';
    return norm([
      product.marca,
      product.codigo,
      product.cod,
      product.modelo,
      product.nombre,
      getProductSizeValue(product),
      getProductColorValue(product),
      product.variante,
      product.sku,
      product.barras,
      product.ubicacion,
      product.almacen,
      product.rack,
      product.rackStore
    ].filter(Boolean).join(' '));
  }


  function buildVariantGroups(product){
    if(!product) return { sizes: [], colors: [] };
    const siblings = appState.products.filter(p => norm(p.nombre) === norm(product.nombre));
    const pool = siblings.length ? siblings : [product];
    const activeSizeKey = normalizeVariantValue(getProductSizeValue(product));
    const activeColorKey = normalizeVariantValue(getProductColorValue(product));
    const sizeSeen = new Set();
    const colorSeen = new Set();
    const sizes = [];
    const colors = [];
    const sizeOrder = ['XXS','XS','S','M','L','XL','XXL','XXXL','2XL','3XL','4XL','5XL','U','UNICA'];
    const sizeRank = v => { const i = sizeOrder.indexOf(String(v||'').toUpperCase()); return i >= 0 ? i : 999; };
    const availableByActiveColor = activeColorKey ? new Set(pool.filter(p => normalizeVariantValue(getProductColorValue(p)) === activeColorKey).map(p => normalizeVariantValue(getProductSizeValue(p))).filter(Boolean)) : new Set();
    const availableByActiveSize = activeSizeKey ? new Set(pool.filter(p => normalizeVariantValue(getProductSizeValue(p)) === activeSizeKey).map(p => normalizeVariantValue(getProductColorValue(p))).filter(Boolean)) : new Set();
    pool.forEach(p => {
      const size = getProductSizeValue(p);
      const color = getProductColorValue(p);
      if(size){
        const key = normalizeVariantValue(size);
        if(!sizeSeen.has(key)){
          sizeSeen.add(key);
          sizes.push({ label:size, product:p, active:key === activeSizeKey, available: !activeColorKey || availableByActiveColor.has(key) });
        }
      }
      if(color){
        const key = normalizeVariantValue(color);
        if(!colorSeen.has(key)){
          colorSeen.add(key);
          colors.push({ label:color, product:p, active:key === activeColorKey, available: !activeSizeKey || availableByActiveSize.has(key) });
        }
      }
    });
    sizes.sort((a,b) => sizeRank(a.label) - sizeRank(b.label) || String(a.label).localeCompare(String(b.label)));
    colors.sort((a,b) => String(a.label).localeCompare(String(b.label)));
    return { sizes, colors };
  }

  function getColorChipStyle(label){
    const colorName = norm(label || '');
    const presets = [
      { keys:['blanco','white'], bg:'#f5f5f2', fg:'#545b56', border:'#d7ddd9' },
      { keys:['negro','black'], bg:'#2e3331', fg:'#f5fffb', border:'#4f5854' },
      { keys:['gris','gray','grey'], bg:'#dce2df', fg:'#51605a', border:'#c2cbc6' },
      { keys:['rojo','red'], bg:'#f6c6c6', fg:'#8a2f2f', border:'#e5aaaa' },
      { keys:['vino','burgundy','guinda'], bg:'#dcc3d0', fg:'#6a314f', border:'#caa8b9' },
      { keys:['rosa','pink'], bg:'#f3d5de', fg:'#8a4560', border:'#e5bfd0' },
      { keys:['azul','blue','uva'], bg:'#cfe1f7', fg:'#315a88', border:'#bad2ef' },
      { keys:['celeste','sky'], bg:'#d8eef8', fg:'#3d6780', border:'#c6e4f0' },
      { keys:['verde','green'], bg:'#d8f0df', fg:'#35694a', border:'#c2e3ce' },
      { keys:['amarillo','yellow','coral'], bg:'#f6e6b3', fg:'#8b6a12', border:'#ebd788' },
      { keys:['lila','morado','violeta','purple','azalea'], bg:'#e6daf8', fg:'#6b4f99', border:'#d4c2f1' },
      { keys:['beige','nude','natural'], bg:'#eadfcf', fg:'#7a6751', border:'#deceb7' },
    ];
    const hit = presets.find(p => p.keys.some(k => colorName.includes(k)));
    const chosen = hit || { bg:'rgba(255,255,255,.08)', fg:'var(--text)', border:'rgba(255,255,255,.12)' };
    return `background:${chosen.bg};color:${chosen.fg};border-color:${chosen.border}`;
  }

  function renderVariantStrip(target, items, emptyLabel, clickFactory, type='default'){
    if(!target) return;
    target.innerHTML = '';
    if(!items.length){
      const empty = document.createElement('span');
      empty.className = 'muted tiny';
      empty.textContent = emptyLabel;
      target.appendChild(empty);
      return;
    }
    items.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `variant-chip ${type === 'color' ? 'variant-color' : getVariantToneKey(item.label)}${item.active ? ' active' : ''}${item.available === false ? ' muted' : ''}`;
      btn.textContent = item.label;
      btn.title = item.label;
      if(type === 'color') btn.style.cssText = getColorChipStyle(item.label);
      btn.addEventListener('click', () => clickFactory(item));
      target.appendChild(btn);
    });
  }

  function toCssImageUrl(url){
    const value = String(url || '').trim();
    if(!value) return 'none';
    return `url("${value.replace(/"/g, '\"')}")`;
  }

  function splitMediaValues(values){
    const split = [];
    values.filter(Boolean).map(v => String(v).trim()).forEach(value => {
      if(/[|\n;]/.test(value)) split.push(...value.split(/[|\n;]+/));
      else split.push(value);
    });
    const out = [];
    const seen = new Set();
    split.map(v => String(v || '').trim()).filter(Boolean).forEach(url => {
      if(!seen.has(url)){ seen.add(url); out.push(url); }
    });
    return out;
  }

  function imageHeaderRank(header){
    const key = norm(header).replace(/[^a-z0-9]+/g,'');
    if(!key) return null;
    const patterns = [
      /^(imagen|image|foto|fotografia|img)(\d+)?$/,
      /^(urlimagen|imagenurl|linkimagen|enlaceimagen)(\d+)?$/,
      /^(imageurl|urlimage|linkimage)(\d+)?$/
    ];
    for(const rx of patterns){
      const m = key.match(rx);
      if(m) return m[2] ? Number(m[2]) : 1;
    }
    return null;
  }

  function isImageHeaderName(header){
    return imageHeaderRank(header) !== null;
  }

  function getRawImageValues(product){
    const raw = product && product._raw && typeof product._raw === 'object' ? product._raw : null;
    if(!raw) return [];
    return Object.entries(raw)
      .map(([header, value], idx) => ({ header, value:String(value || '').trim(), idx, rank:imageHeaderRank(header) }))
      .filter(item => item.value && item.rank !== null)
      .sort((a,b) => (a.rank - b.rank) || (a.idx - b.idx))
      .map(item => item.value);
  }

  function getProductImageUrls(product){
    if(!product) return [];
    const explicit = [
      product._card_image_url,
      product.imagen, product.imagen1, product.image, product.image1, product.imagen_url, product.image_url, product.foto, product.foto1, product.img, product.img1,
      product.imagen2, product.image2, product.foto2, product.img2,
      product.imagen3, product.image3, product.foto3, product.img3,
      product.imagen4, product.image4, product.foto4, product.img4,
      product.imagen5, product.image5, product.foto5, product.img5,
      product.imagen6, product.image6, product.foto6, product.img6,
      product.imagen7, product.image7, product.foto7, product.img7,
      product.imagen8, product.image8, product.foto8, product.img8,
      ...(Array.isArray(product.imagenes) ? product.imagenes : []),
      ...getRawImageValues(product)
    ];
    return splitMediaValues(explicit);
  }

  function getProductBackdropUrl(product, fallbackUrl=''){
    if(!product) return fallbackUrl || '';
    const raw = splitMediaValues([
      product._card_backdrop_url, product.fondo_card, product.background_card, product.imagen_fondo, product.background_image,
      product.fondo, product.backdrop, product.backdrop_url
    ]);
    return raw[0] || fallbackUrl || '';
  }

  function getProductVideoUrls(product){
    if(!product) return [];
    return splitMediaValues([
      product._card_video_url, product.video, product.video_url, product.video_link, product.link_video, product.enlace_video,
      product.url_video, product.video_producto, product.product_video
    ]);
  }

  function isGifLikeUrl(url){
    return /\.(gif|apng)(\?|#|$)/i.test(String(url || ''));
  }

  function getDriveFileInfo(url){
    const raw = String(url || '').trim();
    if(!raw) return null;
    try{
      const u = new URL(raw);
      const host = u.hostname.replace(/^www\./,'').toLowerCase();
      if(!host.includes('drive.google.com') && !host.includes('docs.google.com')) return null;
      const parts = u.pathname.split('/').filter(Boolean);
      const dIdx = parts.indexOf('d');
      const fileIdx = parts.indexOf('file');
      const id = (dIdx >= 0 && parts[dIdx + 1])
        ? parts[dIdx + 1]
        : ((fileIdx >= 0 && parts[fileIdx + 2]) ? parts[fileIdx + 2] : (u.searchParams.get('id') || ''));
      if(!id) return null;
      const resourcekey = u.searchParams.get('resourcekey') || '';
      return { id, resourcekey };
    }catch(_){ return null; }
  }

  function getDrivePreviewUrl(url){
    const info = getDriveFileInfo(url);
    if(!info?.id) return '';
    return `https://drive.google.com/file/d/${info.id}/preview${info.resourcekey ? `?resourcekey=${encodeURIComponent(info.resourcekey)}` : ''}`;
  }

  function getDriveDirectVideoUrl(url){
    const raw = String(url || '').trim();
    const info = getDriveFileInfo(raw);
    if(!info?.id) return '';
    const qp = new URLSearchParams();
    qp.set('id', info.id);
    if(info.resourcekey) qp.set('resourcekey', info.resourcekey);
    qp.set('source', raw);
    return `/api/drive-video?${qp.toString()}`;
  }

  function getVideoEmbedUrl(url, { autoplay=false }={}){
    const raw = String(url || '').trim();
    if(!raw) return '';
    try{
      const u = new URL(raw);
      const host = u.hostname.replace(/^www\./,'').toLowerCase();
      if(host === 'youtu.be'){
        const id = u.pathname.split('/').filter(Boolean)[0];
        return id ? `https://www.youtube.com/embed/${id}${autoplay ? '?autoplay=1&mute=1&playsinline=1&rel=0' : '?rel=0'}` : '';
      }
      if(host.includes('youtube.com')){
        const id = u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop();
        return id ? `https://www.youtube.com/embed/${id}${autoplay ? '?autoplay=1&mute=1&playsinline=1&rel=0' : '?rel=0'}` : '';
      }
      if(host.includes('vimeo.com')){
        const id = u.pathname.split('/').filter(Boolean).pop();
        return id ? `https://player.vimeo.com/video/${id}${autoplay ? '?autoplay=1&muted=1&playsinline=1' : ''}` : '';
      }
      if(host.includes('drive.google.com') || host.includes('docs.google.com')){
        return getDrivePreviewUrl(raw);
      }
      if(host.includes('dropbox.com')){
        const direct = new URL(raw);
        direct.searchParams.set('raw', '1');
        return direct.toString();
      }
    }catch(_){}
    return '';
  }

  function isDirectVideoUrl(url){
    return /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(String(url || ''));
  }

  function canInlineVideoUrl(url){
    return isDirectVideoUrl(url) || !!getDriveFileInfo(url) || !!getVideoEmbedUrl(url);
  }

  function getProductMediaItems(product){
    return getProductImageUrls(product).map((url, idx) => ({ type:'image', url, label:`Imagen ${idx + 1}` }));
  }

  function clearActiveProductVideo(){
    if(!activeProductImageWrap) return;
    activeProductImageWrap.querySelectorAll('.active-product-video-frame,.active-product-video,.active-product-video-placeholder').forEach(el => el.remove());
  }

  function stopActiveProductImageCycle(){
    if(activeImageCycleTimer){ clearInterval(activeImageCycleTimer); activeImageCycleTimer = null; }
    activeImageCycleUrls = [];
    activeMediaCycleItems = [];
    activeImageCycleIndex = 0;
  }

  function renderActiveProductGallery(){
    if(!activeProductGallery || !activeProductGalleryCounter) return;
    const items = (Array.isArray(activeMediaCycleItems) && activeMediaCycleItems.length)
      ? activeMediaCycleItems.slice()
      : (Array.isArray(activeImageCycleUrls) ? activeImageCycleUrls.map(url => ({ type:'image', url })) : []);
    activeProductGallery.innerHTML = '';
    const total = items.length;
    const index = Math.max(0, Math.min(activeImageCycleIndex, Math.max(0, total - 1)));
    activeImageCycleIndex = index;
    if(!total){
      activeProductGalleryCounter.textContent = '00 / 00';
      if(activeProductGalleryPrev) activeProductGalleryPrev.disabled = true;
      if(activeProductGalleryNext) activeProductGalleryNext.disabled = true;
      return;
    }
    items.forEach((item, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'search-card-thumb' + (idx === index ? ' active' : '') + (item.type === 'video' ? ' is-video' : '');
      btn.setAttribute('aria-label', item.type === 'video' ? `Video ${idx + 1}` : `Imagen ${idx + 1}`);
      if(item.type === 'video'){
        const mark = document.createElement('span');
        mark.className = 'video-thumb-mark';
        mark.textContent = '▶ Video';
        btn.appendChild(mark);
      }else{
        const img = document.createElement('img');
        img.src = item.url;
        img.alt = `Vista ${idx + 1}`;
        btn.appendChild(img);
      }
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        showActiveProductImageAt(idx);
      });
      activeProductGallery.appendChild(btn);
    });
    activeProductGalleryCounter.textContent = `${String(index + 1).padStart(2,'0')} / ${String(total).padStart(2,'0')}`;
    if(activeProductGalleryPrev) activeProductGalleryPrev.disabled = total <= 1;
    if(activeProductGalleryNext) activeProductGalleryNext.disabled = total <= 1;
  }

  function showActiveProductImageAt(index = 0){
    if(!activeProductImageWrap || !activeProductImage) return;
    const items = (Array.isArray(activeMediaCycleItems) && activeMediaCycleItems.length)
      ? activeMediaCycleItems.filter(item => item && item.url)
      : (Array.isArray(activeImageCycleUrls) ? activeImageCycleUrls.filter(Boolean).map(url => ({ type:'image', url })) : []);
    const mediaCol = activeProductImageWrap.closest('.search-card-media-col');
    clearActiveProductVideo();
    const activeCard = document.getElementById('activeProductCard');
    if(!items.length){
      activeProductImage.removeAttribute('src');
      activeProductImage.style.display = 'none';
      activeProductImageWrap.classList.add('empty');
      activeProductImageWrap.classList.remove('has-video');
      if(activeCard) activeCard.classList.remove('card-video-overlay');
      if(mediaCol){
        mediaCol.style.setProperty('--product-bg-image', 'none');
        mediaCol.classList.remove('has-backdrop-image');
      }
      renderActiveProductGallery();
      return;
    }
    activeImageCycleIndex = Math.max(0, Math.min(Number(index) || 0, items.length - 1));
    const item = items[activeImageCycleIndex];
    const currentUrl = item.url;
    activeProductImageWrap.classList.remove('empty');
    if(activeCard) activeCard.classList.toggle('card-video-overlay', item.type === 'video');
    if(item.type === 'video'){
      activeProductImage.removeAttribute('src');
      activeProductImage.style.display = 'none';
      activeProductImageWrap.classList.add('has-video');
      const driveDirectUrl = getDriveDirectVideoUrl(currentUrl);
      if(isDirectVideoUrl(currentUrl) || driveDirectUrl){
        const video = document.createElement('video');
        video.className = 'active-product-video';
        video.src = driveDirectUrl || currentUrl;
        video.controls = true;
        video.autoplay = true;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = 'auto';
        video.setAttribute('playsinline','');
        video.setAttribute('webkit-playsinline','');
        activeProductImageWrap.appendChild(video);
        const tryPlay = () => video.play().catch(()=>{});
        video.addEventListener('loadedmetadata', tryPlay, { once:true });
        setTimeout(tryPlay, 160);
      }else{
        const embedUrl = getVideoEmbedUrl(currentUrl, { autoplay:true });
        if(embedUrl){
          const iframe = document.createElement('iframe');
          iframe.className = 'active-product-video-frame';
          iframe.src = embedUrl;
          iframe.title = 'Video del producto';
          iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
          iframe.allowFullscreen = true;
          activeProductImageWrap.appendChild(iframe);
        }else{
          const placeholder = document.createElement('div');
          placeholder.className = 'active-product-video-placeholder';
          placeholder.innerHTML = `<div class="play">▶</div><div><b>Video externo</b><small>No se puede reproducir automáticamente este enlace dentro del card.</small><a href="${escapeHtml(currentUrl)}" target="_blank" rel="noopener noreferrer">Abrir video</a></div>`;
          activeProductImageWrap.appendChild(placeholder);
        }
      }
    }else{
      activeProductImageWrap.classList.remove('has-video');
      activeProductImage.src = currentUrl;
      activeProductImage.style.display = 'block';
    }
    if(mediaCol){
      const backdropUrl = getProductBackdropUrl(appState.selectedProduct, item.type === 'image' ? currentUrl : '');
      mediaCol.style.setProperty('--product-bg-image', toCssImageUrl(backdropUrl || (item.type === 'image' ? currentUrl : '')));
      mediaCol.classList.toggle('has-backdrop-image', !!(backdropUrl || item.type === 'image'));
    }
    renderActiveProductGallery();
  }

  function bindActiveProductGalleryControls(){
    if(activeImageGalleryBound) return;
    if(activeProductGalleryPrev){
      activeProductGalleryPrev.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!activeImageCycleUrls.length) return;
        showActiveProductImageAt((activeImageCycleIndex - 1 + activeImageCycleUrls.length) % activeImageCycleUrls.length);
      });
    }
    if(activeProductGalleryNext){
      activeProductGalleryNext.addEventListener('click', (e) => {
        e.stopPropagation();
        if(!activeImageCycleUrls.length) return;
        showActiveProductImageAt((activeImageCycleIndex + 1) % activeImageCycleUrls.length);
      });
    }
    activeImageGalleryBound = true;
  }

  function startActiveProductImageCycle(urls, product){
    stopActiveProductImageCycle();
    const mediaItems = product ? getProductMediaItems(product) : [];
    activeMediaCycleItems = mediaItems.length ? mediaItems : (Array.isArray(urls) ? urls.filter(Boolean).map(url => ({ type:'image', url })) : []);
    activeImageCycleUrls = activeMediaCycleItems.map(item => item.url).filter(Boolean);
    bindActiveProductGalleryControls();
    showActiveProductImageAt(0);
  }

  function renderActiveVariantStrip(product){
    const groups = buildVariantGroups(product);
    renderVariantStrip(activeSizeStrip, groups.sizes, 'Sin tallas relacionadas', (item) => {
      const currentColor = getProductColorValue(product);
      const siblings = appState.products.filter(p => norm(p.nombre) === norm(product?.nombre));
      const exact = siblings.find(p => normalizeVariantValue(getProductSizeValue(p)) === normalizeVariantValue(item.label) && normalizeVariantValue(getProductColorValue(p)) === normalizeVariantValue(currentColor));
      selectProduct(exact || item.product);
    }, 'size');
    renderVariantStrip(activeColorStrip, groups.colors, 'Sin colores relacionados', (item) => {
      const currentSize = getProductSizeValue(product);
      const siblings = appState.products.filter(p => norm(p.nombre) === norm(product?.nombre));
      const exact = siblings.find(p => normalizeVariantValue(getProductColorValue(p)) === normalizeVariantValue(item.label) && normalizeVariantValue(getProductSizeValue(p)) === normalizeVariantValue(currentSize));
      selectProduct(exact || item.product);
    }, 'color');
  }

  function updateActiveProductCard(p){
    if(!activeProductName) return;
    const hasProduct = !!p;
    const cfg = getActiveCardConfig();
    const cardProduct = hasProduct ? hydrateProductForCard(p) : p;
    const titleValue = hasProduct ? (productHeaderValue(p, cfg.titleHeader) || p.nombre || 'Sin nombre') : '—';
    const subtitleValue = hasProduct ? (productHeaderValue(p, cfg.subtitleHeader) || p.sku || '—') : '—';
    activeProductName.textContent = titleValue;
    if(activeProductSku) activeProductSku.textContent = hasProduct ? `${cfg.subtitleHeader ? cfg.subtitleHeader + ': ' : 'SKU '}${subtitleValue}` : 'SKU —';
    const sizeText = hasProduct ? getProductSizeValue(p) : '';
    const colorText = hasProduct ? getProductColorValue(p) : '';
    activeProductMeta.textContent = hasProduct ? `Variante activa: talla ${sizeText || '—'}${colorText ? ` • color ${colorText}` : ''}` : 'Selecciona un producto para enfocarlo rápido.';
    activeLocation.textContent = hasProduct ? (p.ubicacion || '—') : '—';
    if(activeStoreLocation) activeStoreLocation.textContent = hasProduct ? (p.almacen || '—') : '—';
    const activeCard = document.getElementById('activeProductCard');
    if(activeCard) applyCardLayoutConfigToElement(activeCard, cfg);
    if(activeProductImageWrap && activeProductImage){
      startActiveProductImageCycle(getProductImageUrls(cardProduct), cardProduct);
    }
    renderActiveCardCustomFields(p);
    renderActiveVariantStrip(p);
    if(document.body.classList.contains('search-card-modal-open')) setTimeout(updateExpandedSideCards, 20);
  }

  function syncSelectedProductLocation(product){
    if(!product) return;
    appState.selectedRack = product.rack || product.rackStore || '';
    appState.selectedRackLayoutId = product.rack || product.rackStore || '';
    appState.selectedRackLayoutIds = [product.rack, product.rackStore].filter(Boolean);
    appState.selectedZoneId = product.zona || product.zonaStore || appState.selectedZoneId || '';
  }

  function focusSelectedProductInViewer(options = {}){
    const opts = options || {};
    const product = opts.product || appState.selectedProduct;
    if(!product){
      showToast('Selecciona un producto primero.', 'warning');
      return false;
    }
    syncSelectedProductLocation(product);
    updateActiveProductCard(product);
    syncActiveProductCardHint();
    if(opts.switchScreen !== false){
      setScreen('viewer');
    } else if(['products','viewer'].includes(appState.screen)) {
      renderMapView();
    }
    setTimeout(() => {
      if(appState.screen === 'viewer') renderMapView();
      else if(isLayoutWorkspaceScreen()) renderLayoutEditor();
      renderProducts(appState.filtered);
    }, 10);
    return true;
  }

  function applyProductSelectionEffects(product){
    if(!product) return;
    syncSelectedProductLocation(product);
  }

  function syncExpandedModalSelection(product){
    appState.selectedProduct = product || null;
    applyProductSelectionEffects(product);
    updateActiveProductCard(product);
    syncActiveProductCardHint();
    const rows = document.querySelectorAll('.product-row');
    rows.forEach(row => {
      const key = row.getAttribute('data-product-key') || '';
      row.classList.toggle('active', !!product && key === getProductIdentityKey(product));
    });
    setTimeout(updateExpandedSideCards, 20);
  }

  const LOGICAL_SIZE_ORDER = ['XXXS','3XS','XXS','2XS','XS','S','M','L','XL','XXL','2XL','XXXL','3XL','XXXXL','4XL','5XL','6XL','U','UNICA','ÚNICA','ONE SIZE'];
  function getLogicalSizeRank(value){
    const raw = String(value || '').trim().toUpperCase();
    if(!raw) return 9999;
    const normalized = raw
      .replace(/TALLA\s+/g, '')
      .replace(/\s+/g, '')
      .replace(/^ÚNICA$/, 'UNICA');
    const directIndex = LOGICAL_SIZE_ORDER.indexOf(normalized);
    if(directIndex >= 0) return directIndex;
    const num = normalized.match(/^(\d{1,3})$/);
    if(num) return 500 + Number(num[1]);
    return 9999;
  }

  function splitAlphaNumericLead(value){
    const text = String(value || '').trim();
    if(!text) return { type:2, normalized:'', text:'' };
    const first = text.charAt(0);
    const isLetter = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(first);
    const isDigit = /\d/.test(first);
    return { type:isLetter ? 0 : (isDigit ? 1 : 2), normalized:norm(text), text };
  }

  function compareTextLettersFirst(a,b){
    const aa = splitAlphaNumericLead(a);
    const bb = splitAlphaNumericLead(b);
    if(aa.type !== bb.type) return aa.type - bb.type;
    return aa.text.localeCompare(bb.text, 'es', { sensitivity:'base', numeric:true });
  }

  function compareProductsAZ(a,b){
    const nameCmp = compareTextLettersFirst(a?.nombre || '', b?.nombre || '');
    if(nameCmp) return nameCmp;
    const sizeA = getProductSizeValue(a) || '';
    const sizeB = getProductSizeValue(b) || '';
    const sizeRankCmp = getLogicalSizeRank(sizeA) - getLogicalSizeRank(sizeB);
    if(sizeRankCmp) return sizeRankCmp;
    const sizeCmp = String(sizeA).localeCompare(String(sizeB), 'es', { sensitivity:'base', numeric:true });
    if(sizeCmp) return sizeCmp;
    const colorCmp = String(getProductColorValue(a) || '').localeCompare(String(getProductColorValue(b) || ''), 'es', { sensitivity:'base', numeric:true });
    if(colorCmp) return colorCmp;
    const variantCmp = String(a?.variante || '').localeCompare(String(b?.variante || ''), 'es', { sensitivity:'base', numeric:true });
    if(variantCmp) return variantCmp;
    const skuCmp = String(a?.sku || '').localeCompare(String(b?.sku || ''), 'es', { sensitivity:'base', numeric:true });
    if(skuCmp) return skuCmp;
    return String(a?.ubicacion || '').localeCompare(String(b?.ubicacion || ''), 'es', { sensitivity:'base', numeric:true });
  }

  function shouldForceIndividualView(list){
    const rawQ = String(searchInput?.value || '').trim();
    if(!rawQ) return false;
    const items = Array.isArray(list) ? list.filter(Boolean) : [];
    if(items.length <= 1) return false;
    const familyKeys = Array.from(new Set(items.map(p => norm(p?.nombre || '') || '__sin_nombre__'))).filter(Boolean);
    return familyKeys.length === 1;
  }

  function renderProducts(list){
    ensureAppRuntimeState();
    list = Array.isArray(list) ? list : [];
    const frag = document.createDocumentFragment();
    const forceIndividual = shouldForceIndividualView(list);
    const groupedMode = true; // V99: listado agrupado más amplio para catálogos grandes
    const maxRows = groupedMode ? 800 : 1200;
    const items = [];
    const sortedList = (Array.isArray(list) ? list.slice() : []).sort(compareProductsAZ);
    if(groupedMode){
      const groups = new Map();
      sortedList.forEach(p => {
        const key = norm(p.nombre || '') || '__sin_nombre__';
        if(!groups.has(key)) groups.set(key, { nombre:p.nombre || 'Sin nombre', items:[], sample:p });
        groups.get(key).items.push(p);
      });
      Array.from(groups.values())
        .sort((a,b) => compareTextLettersFirst(a.nombre || '', b.nombre || ''))
        .slice(0, maxRows)
        .forEach(g => items.push({ type:'group', data:g }));
    } else {
      sortedList.slice(0, maxRows).forEach(p => items.push({ type:'product', data:p }));
    }
    productList.innerHTML = '';
    items.forEach(entry => {
      const row = document.createElement('div');
      row.className = 'product-row' + ((entry.type==='product' && getProductIdentityKey(appState.selectedProduct) === getProductIdentityKey(entry.data)) ? ' active' : '');
      if(entry.type === 'group'){
        const g = entry.data;
        const first = g.items[0];
        const variantes = Array.from(new Set(g.items.map(p => (p.variante || '').trim()).filter(Boolean)));
        const ubicaciones = Array.from(new Set(g.items.map(p => (p.ubicacion || '').trim()).filter(Boolean)));
        const thumb = (getProductImageUrls(first)[0] || '').trim();
        row.innerHTML = `
          <div class="product-cell-sku"><span class="product-select-box"></span>${thumb ? `<img class="product-row-thumb" src="${escapeHtml(thumb)}" alt="${escapeHtml(g.nombre)}">` : '<span class="product-row-thumb empty"></span>'}<b>${escapeHtml(first.sku || '—')}</b></div>
          <div class="product-cell-name">${escapeHtml(g.nombre)}</div>
          <div><span class="variant-chip muted" style="padding:6px 10px;border-radius:10px;min-width:auto;cursor:default">${variantes.length} variante${variantes.length === 1 ? '' : 's'}</span></div>
          <div><span class="loc-pill">${escapeHtml(first.ubicacion || '—')}</span></div>
          <div>${escapeHtml(first.almacen || '—')}</div>`;
        row.title = 'Familia agrupada por nombre de producto';
        row.addEventListener('click', () => selectProduct(first));
      } else {
        const p = entry.data;
        row.setAttribute('data-product-key', getProductIdentityKey(p));
        const thumb = (getProductImageUrls(p)[0] || '').trim();
        row.innerHTML = `
          <div class="product-cell-sku"><span class="product-select-box"></span>${thumb ? `<img class="product-row-thumb" src="${escapeHtml(thumb)}" alt="${escapeHtml(p.nombre || 'Producto')}">` : '<span class="product-row-thumb empty"></span>'}<b>${escapeHtml(p.sku || '—')}</b></div>
          <div class="product-cell-name">${escapeHtml(p.nombre || 'Sin nombre')}</div>
          <div><span class="variant-chip muted ${getVariantToneKey(p.variante)}" style="padding:6px 10px;border-radius:10px;min-width:auto;cursor:default">${escapeHtml(p.variante || '—')}</span></div>
          <div><span class="loc-pill">${escapeHtml(p.ubicacion || '—')}</span></div>
          <div>${escapeHtml(p.almacen || '—')}</div>`;
        row.addEventListener('click', () => selectProduct(p));
      }
      frag.appendChild(row);
    });
    productList.appendChild(frag);
    try{
      const totalRows = Array.isArray(list) ? list.length : 0;
      const shownRows = items.length;
      const foot = document.getElementById('contentFootLeft') || document.getElementById('contentStatus');
      if(foot && totalRows > shownRows) foot.textContent = `Mostrando ${shownRows.toLocaleString('es-PE')} de ${totalRows.toLocaleString('es-PE')} resultados. Usa búsqueda/filtros para afinar.`;
    }catch(_err){}
    /* v99RenderProductsStatus */
    countProducts.textContent = getCurrentProductsTotal().toLocaleString('es-PE');
    const shown = items.length;
    const modeLabel = groupedMode ? 'familias' : 'resultados';
    const modeInfo = forceIndividual
      ? ' • vista por unidad automática para variantes del mismo producto'
      : (groupedMode ? ' • agrupado por producto / nombre' : (list.length > maxRows ? ' • usa el buscador para acotar' : ''));
    const totalRecords = getCurrentProductsTotal();
    const paging = ensureProductPagingState();
    const pageInfo = paging.mode === 'backend' ? ` • página ${paging.page || 1}/${paging.totalPages || 1}` : '';
    productSummary.textContent = `Mostrando ${shown.toLocaleString('es-PE')} ${modeLabel} de ${totalRecords.toLocaleString('es-PE')} registros` + modeInfo + pageInfo;
    updateProductPagerUi();
  }


  let activeExpandedSearchCard = null;
  let activeExpandedSearchCardPlaceholder = null;
  let activeExpandedSearchCardParent = null;
  let activeExpandedSearchCardNextSibling = null;
  let activeExpandedSideCardsBound = false;

  function getProductIdentityKey(p){
    return [p?.sku || '', p?.nombre || '', p?.variante || '', p?.ubicacion || '', p?.almacen || ''].join('¦');
  }
  function getExpandedCarouselBaseList(){
    const source = Array.isArray(appState?.filtered) && appState.filtered.length ? appState.filtered.slice() : (Array.isArray(appState?.products) ? appState.products.slice() : []);
    return source.sort(compareProductsAZ);
  }
  function getExpandedCarouselItems(){
    const list = getExpandedCarouselBaseList();
    const forceIndividual = shouldForceIndividualView(list);
    const groupedMode = !!appState?.ui?.productGroupMode && !forceIndividual;
    if(!groupedMode) return list;
    const groups = new Map();
    list.forEach((p) => {
      const key = norm(p?.nombre || '') || '__sin_nombre__';
      if(!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });
    return Array.from(groups.values()).map(items => items[0]).filter(Boolean);
  }
  function getExpandedCarouselIndex(items){
    if(!Array.isArray(items) || !items.length) return -1;
    const selected = appState?.selectedProduct;
    const selectedKey = getProductIdentityKey(selected);
    let idx = items.findIndex((p) => getProductIdentityKey(p) === selectedKey);
    if(idx >= 0) return idx;
    idx = items.findIndex((p) => (p?.sku || '') === (selected?.sku || '') && (p?.variante || '') === (selected?.variante || ''));
    if(idx >= 0) return idx;
    idx = items.findIndex((p) => norm(p?.nombre || '') === norm(selected?.nombre || ''));
    return idx >= 0 ? idx : 0;
  }
  function ensureExpandedSideCard(side){
    let el = document.getElementById('expandedSideCard-' + side);
    if(el) return el;
    el = document.createElement('button');
    el.type = 'button';
    el.id = 'expandedSideCard-' + side;
    el.className = 'search-card-side-nav ' + side;
    el.setAttribute('aria-label', side === 'left' ? 'Producto anterior' : 'Producto siguiente');
    el.innerHTML = `
      <div class="side-nav-topline"><span class="side-nav-arrow">${side === 'left' ? '‹' : '›'}</span><div class="side-nav-kicker">${side === 'left' ? 'Anterior' : 'Siguiente'}</div></div>
      <div class="side-nav-media"><img alt="Vista previa del producto" /></div>
      <div class="side-nav-body">
        <div class="side-nav-title">—</div>
        <div class="side-nav-sku">SKU —</div>
        <div class="side-nav-swatches"></div>
        <div class="side-nav-sizes"></div>
      </div>
      <div class="side-nav-hint">Haz clic para cambiar de producto</div>
    `;
    document.body.appendChild(el);
    return el;
  }
  function fillExpandedSideCard(el, product, side){
    if(!el) return;
    if(!product){
      el.classList.remove('visible');
      el.onclick = null;
      return;
    }
    const urls = getProductImageUrls(product);
    const img = el.querySelector('img');
    const swatches = el.querySelector('.side-nav-swatches');
    const sizes = el.querySelector('.side-nav-sizes');
    el.querySelector('.side-nav-kicker').textContent = side === 'left' ? 'Anterior' : 'Siguiente';
    el.querySelector('.side-nav-title').textContent = product.nombre || 'Sin nombre';
    el.querySelector('.side-nav-sku').textContent = `SKU ${product.sku || '—'}`;
    if(swatches){
      const sibs = appState.products.filter(p => norm(p?.nombre || '') === norm(product?.nombre || ''));
      const colorItems = Array.from(new Set(sibs.map(p => getProductColorValue(p)).filter(Boolean))).slice(0,4);
      swatches.innerHTML = colorItems.map(color => `<span class="side-swatch" style="${getColorChipStyle(color)}"></span>`).join('');
    }
    if(sizes){
      const sibs = appState.products.filter(p => norm(p?.nombre || '') === norm(product?.nombre || ''));
      const sizeItems = Array.from(new Set(sibs.map(p => getProductSizeValue(p)).filter(Boolean))).slice(0,4);
      sizes.innerHTML = sizeItems.map(size => `<span class="side-size-chip">${escapeHtml(size)}</span>`).join('');
    }
    if(img){
      if(urls && urls[0]){ 
        img.src = urls[0]; 
        img.style.display = ''; 
        const backdropUrl = getProductBackdropUrl(product, urls[0]);
        el.style.setProperty('--side-card-bg', toCssImageUrl(backdropUrl || urls[0]));
        el.classList.add('has-side-image');
      }
      else { 
        img.removeAttribute('src'); 
        img.style.display = 'none'; 
        el.style.setProperty('--side-card-bg', 'none');
        el.classList.remove('has-side-image');
      }
    }
    el.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      syncExpandedModalSelection(product);
    };
    el.classList.add('visible');
  }
  function hideExpandedSideCards(){
    ['left','right'].forEach(side => {
      const el = document.getElementById('expandedSideCard-' + side);
      if(el) el.classList.remove('visible');
    });
  }
  function updateExpandedSideCards(){
    const main = document.getElementById('activeProductCard');
    if(!main || !main.classList.contains('search-card-expanded') || window.innerWidth <= 980){ hideExpandedSideCards(); return; }
    const items = getExpandedCarouselItems();
    if(items.length <= 1){ hideExpandedSideCards(); return; }
    const idx = getExpandedCarouselIndex(items);
    const prev = items[(idx - 1 + items.length) % items.length];
    const next = items[(idx + 1) % items.length];
    fillExpandedSideCard(ensureExpandedSideCard('left'), prev, 'left');
    fillExpandedSideCard(ensureExpandedSideCard('right'), next, 'right');
  }
  function bindExpandedSideCardKeys(){
    if(activeExpandedSideCardsBound) return;
    activeExpandedSideCardsBound = true;
    document.addEventListener('keydown', (e) => {
      const main = document.getElementById('activeProductCard');
      if(!main || !main.classList.contains('search-card-expanded')) return;
      const items = getExpandedCarouselItems();
      if(items.length <= 1) return;
      const idx = getExpandedCarouselIndex(items);
      if(e.key === 'ArrowLeft'){
        e.preventDefault();
        syncExpandedModalSelection(items[(idx - 1 + items.length) % items.length]);
      }else if(e.key === 'ArrowRight'){
        e.preventDefault();
        syncExpandedModalSelection(items[(idx + 1) % items.length]);
      }
    });
    window.addEventListener('resize', () => setTimeout(updateExpandedSideCards, 40));
  }
  function syncActiveProductCardHint(){
    const card = document.getElementById('activeProductCard');
    const hint = card ? card.querySelector('.search-card-expand-hint') : null;
    if(!hint || !card) return;
    const hasProduct = !!(appState && appState.selectedProduct && (appState.selectedProduct.nombre || appState.selectedProduct.sku));
    hint.style.display = hasProduct ? '' : 'none';
  }
  function openActiveProductCard(){
    const card = document.getElementById('activeProductCard');
    const overlay = document.getElementById('searchCardOverlay');
    if(!card || !overlay) return;
    if(card.classList.contains('search-card-expanded')) return;
    activeExpandedSearchCard = card;
    activeExpandedSearchCardParent = card.parentNode;
    activeExpandedSearchCardNextSibling = card.nextSibling;
    activeExpandedSearchCardPlaceholder = document.createElement('div');
    activeExpandedSearchCardPlaceholder.className = 'search-card-placeholder';
    activeExpandedSearchCardPlaceholder.style.height = card.offsetHeight + 'px';
    activeExpandedSearchCardPlaceholder.style.borderRadius = '24px';
    if(activeExpandedSearchCardParent){
      activeExpandedSearchCardParent.insertBefore(activeExpandedSearchCardPlaceholder, activeExpandedSearchCardNextSibling);
    }
    document.body.appendChild(card);
    card.classList.add('search-card-expanded');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden','false');
    document.body.classList.add('search-card-modal-open');
    bindExpandedSideCardKeys();
    setTimeout(updateExpandedSideCards, 40);
  }
  function closeActiveProductCard(){
    const card = activeExpandedSearchCard || document.getElementById('activeProductCard');
    const overlay = document.getElementById('searchCardOverlay');
    if(card){
      card.classList.remove('search-card-expanded');
      if(activeExpandedSearchCardParent){
        if(activeExpandedSearchCardPlaceholder && activeExpandedSearchCardPlaceholder.parentNode === activeExpandedSearchCardParent){
          activeExpandedSearchCardParent.insertBefore(card, activeExpandedSearchCardPlaceholder);
          activeExpandedSearchCardPlaceholder.remove();
        }else if(activeExpandedSearchCardNextSibling && activeExpandedSearchCardNextSibling.parentNode === activeExpandedSearchCardParent){
          activeExpandedSearchCardParent.insertBefore(card, activeExpandedSearchCardNextSibling);
        }else{
          activeExpandedSearchCardParent.appendChild(card);
        }
      }
    }
    if(overlay){
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden','true');
    }
    document.body.classList.remove('search-card-modal-open');
    hideExpandedSideCards();
    activeExpandedSearchCard = null;
    activeExpandedSearchCardPlaceholder = null;
    activeExpandedSearchCardParent = null;
    activeExpandedSearchCardNextSibling = null;
  }
  function bindActiveProductCardExpansion(){
    const card = document.getElementById('activeProductCard');
    const overlay = document.getElementById('searchCardOverlay');
    const closeBtn = document.getElementById('activeProductCardClose');
    if(!card || card.dataset.expandBound === '1') return;
    card.dataset.expandBound = '1';
    card.addEventListener('click', (e) => {
      if(e.target && e.target.closest('#activeProductCardClose')) return;
      if(card.classList.contains('search-card-expanded')) return;
      openActiveProductCard();
    });
    card.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        if(card.classList.contains('search-card-expanded')) closeActiveProductCard();
        else openActiveProductCard();
      }
      if(e.key === 'Escape') closeActiveProductCard();
    });
    if(overlay && overlay.dataset.boundCardExpand !== '1'){ overlay.addEventListener('click', closeActiveProductCard); overlay.dataset.boundCardExpand = '1'; }
    if(closeBtn && closeBtn.dataset.boundCardExpand !== '1'){ closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeActiveProductCard(); }); closeBtn.dataset.boundCardExpand = '1'; }
    if(document.body.dataset.boundCardExpandEsc !== '1'){ document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeActiveProductCard(); }); document.body.dataset.boundCardExpandEsc = '1'; }
    syncActiveProductCardHint();
  }

  function productMatchesLocalFilters(product, filters = null){
    const p = product || {};
    const f = filters || appState.productFilters || {};
    const exactChecks = [
      ['brand', p.brand || p.marca || ''],
      ['category', getProductCategoryValue(p)],
      ['gender', getProductGenderValue(p)],
      ['warehouse', p.warehouse || p.almacen || ''],
      ['zone', p.zone || p.zona || ''],
      ['rack', p.rack || p.estante || ''],
    ];
    for(const [key, rawValue] of exactChecks){
      const expected = String(f?.[key] || '').trim();
      if(expected && String(rawValue || '').trim() !== expected) return false;
    }
    const imageState = String(f?.image_state || '').trim();
    const hasImage = !!String(p.image_url || p.imagen || '').trim();
    if(imageState === 'with_image' && !hasImage) return false;
    if(imageState === 'without_image' && hasImage) return false;
    const locationState = String(f?.location_state || '').trim();
    const hasLocation = !!String(p.location || p.ubicacion || '').trim();
    if(locationState === 'complete' && !hasLocation) return false;
    if(locationState === 'incomplete' && hasLocation) return false;
    const stockState = String(f?.stock_state || '').trim();
    const stock = Number(p.stock || 0);
    if(stockState === 'with_stock' && !(stock > 0)) return false;
    if(stockState === 'without_stock' && stock > 0) return false;
    return true;
  }

  function filterProducts(){
    ensureAppRuntimeState();
    const rawQ = String(searchInput?.value || '').trim();
    const q = norm(rawQ);
    const activeBranch = getBranchByIndex(getActiveBranchIndex());
    if(appState.auth?.loggedIn && Number(activeBranch?.id || 0) > 0){
      const paging = ensureProductPagingState();
      paging.backendUnavailable = false;
      paging.query = rawQ;
      paging.page = 1;
      requestProductsPage({ branchIndex:getActiveBranchIndex(), query:rawQ, page:1 }).catch(() => {});
      return;
    }
    appState.productPaging = {
      ...ensureProductPagingState(),
      mode:'local',
      page:1,
      query:rawQ,
      loading:false,
      lastError:''
    };
    const source = Array.isArray(appState.products) ? appState.products.slice() : [];
    if(!q){
      appState.filtered = source.filter(p => productMatchesLocalFilters(p));
      clearSearchHighlights();
      const selected = appState.selectedProduct && appState.filtered.find(p => getProductIdentityKey(p) === getProductIdentityKey(appState.selectedProduct));
      appState.selectedProduct = selected || appState.filtered[0] || null;
      updateActiveProductCard(appState.selectedProduct || null);
      syncActiveProductCardHint();
      renderProducts(appState.filtered);
      if(isLayoutWorkspaceScreen()) renderLayoutEditor();
      else if(['products','viewer'].includes(appState.screen)) renderMapView();
      else if(isLayoutWorkspaceScreen()){ renderLayoutEditor(); renderLayoutInspector(); }
      return;
    }
    const tokens = q.split(/\s+/).map(t => t.trim()).filter(Boolean);
    const compactQuery = q.replace(/\s+/g, ' ').trim();
    const index = Array.isArray(appState.searchIndex) && appState.searchIndex.length
      ? appState.searchIndex
      : buildProductSearchIndex(source);
    const scored = index.map(entry => {
      const { p, familyText, variantText, locationText, haystack, nameOnly, nameVariant, exactSku, exactRack, exactRackStore, exactUbic, exactAlm, idx } = entry;
      const phraseInFamily = familyText.includes(compactQuery);
      const phraseInNameVariant = nameVariant.includes(compactQuery);
      const phraseInFull = haystack.includes(compactQuery);
      let score = 0;
      if (exactSku === q) score += 260;
      if (familyText === q || nameOnly === q) score += 220;
      if (nameVariant === q) score += 180;
      if (phraseInFamily) score += 170;
      if (phraseInNameVariant) score += 140;
      if (phraseInFull) score += 95;
      if (exactRack === q || exactRackStore === q) score += 90;
      if (exactUbic === q || exactAlm === q) score += 90;
      let familyMatches = 0, variantMatches = 0, locationMatches = 0, matchedTokens = 0;
      tokens.forEach(t => {
        let matched = false;
        if (familyText.includes(t)) { familyMatches += 1; score += 30; matched = true; if (nameOnly.includes(t)) score += 12; if (familyText.startsWith(t) || nameOnly.startsWith(t)) score += 14; }
        if (variantText.includes(t)) { variantMatches += 1; score += 20; matched = true; if (exactSku.startsWith(t)) score += 20; }
        if (locationText.includes(t)) { locationMatches += 1; score += 10; matched = true; }
        if (matched) matchedTokens += 1;
      });
      const allTokensPresent = tokens.length ? matchedTokens === tokens.length : false;
      if (allTokensPresent) score += 36 + tokens.length * 7;
      const contentMatches = familyMatches + variantMatches;
      const strongPhrase = phraseInFamily || phraseInNameVariant || phraseInFull || exactSku === q || exactUbic === q || exactAlm === q;
      let passes = false;
      if (tokens.length === 1) passes = contentMatches >= 1 || locationMatches >= 1 || strongPhrase || exactSku.includes(compactQuery);
      else if (tokens.length === 2) passes = allTokensPresent && (contentMatches >= 2 || strongPhrase || (familyMatches >= 1 && variantMatches >= 1));
      else passes = allTokensPresent && (contentMatches >= Math.max(2, tokens.length - 1) || strongPhrase || familyMatches >= Math.max(2, tokens.length - 1));
      return { p, score, matchedTokens, familyMatches, variantMatches, passes, idx };
    }).filter(x => x.passes && x.score >= (tokens.length >= 3 ? 60 : tokens.length === 2 ? 34 : 10))
      .sort((a,b) => b.score - a.score || b.familyMatches - a.familyMatches || b.variantMatches - a.variantMatches || a.idx - b.idx);
    appState.filtered = scored.map(x => x.p).filter(p => productMatchesLocalFilters(p));
    const primary = appState.filtered[0] || null;
    if(primary){
      appState.selectedProduct = primary;
      appState.selectedRack = primary.rack || primary.rackStore || appState.selectedRack;
      appState.selectedRackLayoutId = primary.rack || primary.rackStore || appState.selectedRackLayoutId;
    }
    const rackIds = [];
    appState.filtered.slice(0, 250).forEach(p => { if(p.rack) rackIds.push(p.rack); if(p.rackStore) rackIds.push(p.rackStore); });
    setSearchHighlightedRacks(rackIds, primary?.rack || primary?.rackStore || '');
    if(primary){ updateActiveProductCard(primary); applyProductSelectionEffects(primary); }
    else { updateActiveProductCard(null); clearSearchHighlights(); }
    syncActiveProductCardHint();
    renderProducts(appState.filtered);
    if(isLayoutWorkspaceScreen()) renderLayoutEditor();
    else if(['products','viewer'].includes(appState.screen)) renderMapView();
    else if(isLayoutWorkspaceScreen()){ renderLayoutEditor(); renderLayoutInspector(); }
  }

  function selectProduct(p){
    if(document.body.classList.contains('search-card-modal-open')){
      syncExpandedModalSelection(p);
      return;
    }
    appState.selectedProduct = p;
    applyProductSelectionEffects(p);
    updateActiveProductCard(p);
    syncActiveProductCardHint();
    if(['products','reports','viewer'].includes(appState.screen)){
      renderMapView();
      renderRackDetail(p.rack || p.rackStore, p);
    } else if (isLayoutWorkspaceScreen()) {
      renderLayoutEditor();
      renderLayoutInspector();
    } else if (appState.screen === 'racks') {
      renderRackModels();
      renderRackModelPreview();
    }
    renderProducts(appState.filtered);
  }

  function findRackById(id){ return appState.layout.racks.find(r => r.id === id); }
  function findZoneById(id){ return appState.layout.zones.find(z => z.id === id); }
  function rackModel(id){ return appState.models.find(m => m.id === id) || appState.models[0]; }
  function getSelectedRackIds(){
    const ids = Array.isArray(appState.selectedRackLayoutIds) ? appState.selectedRackLayoutIds.filter(Boolean) : [];
    if(appState.selectedRackLayoutId && !ids.includes(appState.selectedRackLayoutId)) ids.unshift(appState.selectedRackLayoutId);
    return Array.from(new Set(ids));
  }
  function setSelectedRackIds(ids){
    const clean = Array.from(new Set((ids||[]).filter(Boolean)));
    appState.selectedRackLayoutIds = clean;
    appState.selectedRackLayoutId = clean[0] || '';
    if(appState.selectedRackLayoutId){
      const rack = findRackById(appState.selectedRackLayoutId);
      if(rack) appState.selectedZoneId = rack.zoneId;
    }
  }
  function isRackSelected(id){ return getSelectedRackIds().includes(id); }
  function toggleRackSelection(id){
    const ids = getSelectedRackIds();
    const idx = ids.indexOf(id);
    if(idx >= 0) ids.splice(idx,1); else ids.push(id);
    setSelectedRackIds(ids);
  }
  function clearRackSelection(){ setSelectedRackIds([]); }
  function setSearchHighlightedRacks(ids, primary=''){
    const clean = Array.from(new Set((ids||[]).filter(Boolean)));
    appState.highlightedRackIds = clean;
    appState.primaryHighlightedRackId = primary && clean.includes(primary) ? primary : (clean[0] || '');
  }
  function isRackSearchHit(id){ return (appState.highlightedRackIds || []).includes(id); }
  function clearSearchHighlights(){ setSearchHighlightedRacks([], ''); }
  function getDragSelectionBox(){
    const ds = appState.editor?.dragSelect;
    if(!ds?.start || !ds?.end) return null;
    const x = Math.min(ds.start.x, ds.end.x), y = Math.min(ds.start.y, ds.end.y);
    return { x, y, w:Math.abs(ds.end.x - ds.start.x), h:Math.abs(ds.end.y - ds.start.y) };
  }
  function rackIntersectsBox(rack, box){
    return !!box && rack.x < box.x + box.w && rack.x + rack.w > box.x && rack.y < box.y + box.h && rack.y + rack.h > box.y;
  }
  function startDragSelection(startPoint, additive=false){
    appState.editor.dragSelect = { active:true, additive:!!additive, start:{x:startPoint.x,y:startPoint.y}, end:{x:startPoint.x,y:startPoint.y} };
    if(!additive){ if(typeof isStructureLayoutScreen==='function'&&isStructureLayoutScreen()){ if(typeof v117SetSelectedWallIds==='function')v117SetSelectedWallIds([]); } else clearRackSelection(); }
  }
  function updateDragSelection(point){
    const ds = appState.editor?.dragSelect;
    if(!ds?.active) return;
    ds.end = { x:point.x, y:point.y };
  }
  function commitDragSelection(){
    const ds = appState.editor?.dragSelect;
    if(!ds?.active) return false;
    const box = getDragSelectionBox();
    if(box && box.w >= 6 && box.h >= 6){
      if(typeof isStructureLayoutScreen==='function'&&isStructureLayoutScreen()&&typeof v117SetSelectedWallIds==='function'){
        const ids=ds.additive&&typeof v117GetSelectedWallIds==='function'?v117GetSelectedWallIds():[];
        (appState.layout.walls||[]).filter(w=>!w.autoZoneEdge).forEach(w=>{const minX=Math.min(w.x1,w.x2),maxX=Math.max(w.x1,w.x2),minY=Math.min(w.y1,w.y2),maxY=Math.max(w.y1,w.y2);if(maxX>=box.x&&minX<=box.x+box.w&&maxY>=box.y&&minY<=box.y+box.h)ids.push(w.id);});
        v117SetSelectedWallIds(ids);
      }else{ const ids = ds.additive ? getSelectedRackIds() : []; (appState.layout.racks || []).forEach(r => { if(rackIntersectsBox(r, box)) ids.push(r.id); }); setSelectedRackIds(ids); }
      appState.editor.dragSelect = { active:false, additive:false, start:null, end:null }; return true;
    }
    appState.editor.dragSelect = { active:false, additive:false, start:null, end:null };
    return false;
  }
  function applyModelToSelectedRacks(){
    const ids = getSelectedRackIds();
    const model = rackModel(appState.selectedModelId);
    if(!model || !ids.length) return;
    ids.forEach(id => {
      const rack = findRackById(id);
      if(!rack) return;
      const prev = clone(rack);
      const center = { x: rack.x + rack.w/2, y: rack.y + rack.h/2 };
      const fp = getRackFootprint(model.id, rack.rot || 0);
      rack.modelId = model.id;
      rack.w = fp.w; rack.h = fp.h;
      rack.rackHeight = Number(model.height || rack.rackHeight || 238);
      rack.x = snapGrid(center.x - rack.w/2);
      rack.y = snapGrid(center.y - rack.h/2);
      const zone = findZoneById(rack.zoneId) || nearestZoneForPoint(center);
      if(zone){
        keepRackSnapped(rack, zone);
        if(!rackFullyInsideZone(rack, zone)){
          rack.x = prev.x; rack.y = prev.y; rack.w = prev.w; rack.h = prev.h; rack.modelId = prev.modelId; rack.rackHeight = prev.rackHeight;
        }
      }
    });
    normalizeZoneAndRackIds();
    persistActiveLayout();
    renderLayoutEditor();
  }
  function nextRackId(zoneId){
    const vals = appState.layout.racks.filter(r => r.zoneId === zoneId).map(r => parseInt((r.id.match(/-E(\d+)/)||[])[1] || '0', 10));
    return `${zoneId}-E${(Math.max(0,...vals)+1)}`;
  }
  function nextZoneId(){
    const nums = appState.layout.zones
      .map(z => { const m = String(z.id || '').match(/^Z(\d+)$/i); return m ? parseInt(m[1], 10) : 0; })
      .filter(Boolean);
    const next = Math.max(2, ...nums) + 1;
    return 'Z' + next;
  }

  function normalizeZoneCode(code){
    return String(code || '').trim().toUpperCase().replace(/\s+/g, '').replace(/[^A-Z0-9]/g, '');
  }
  /* v98: función duplicada renameZoneId removida para evitar overrides accidentales. */
const DEFAULT_GRID_SIZE = 2;
  const DEFAULT_DIM_FONT_SIZE = 32;
  function isSnapEnabled(){ return appState.editor?.snapEnabled !== false; }
  function getSnapSize(){
    const raw = Number(appState.editor?.snapSize);
    if(!Number.isFinite(raw) || raw <= 0) return DEFAULT_GRID_SIZE;
    return Math.max(1, Math.min(80, raw));
  }
  function getDimFontSize(){
    const raw = Number(appState.editor?.dimFontSize);
    if(!Number.isFinite(raw) || raw <= 0) return DEFAULT_DIM_FONT_SIZE;
    return Math.max(14, Math.min(72, raw));
  }
  function snapGrid(n){
    const value = Number(n) || 0;
    if(!isSnapEnabled()) return value;
    const step = getSnapSize();
    return Math.round(value / step) * step;
  }
  function normalizeAngle(a){ return (((Number(a) || 0) % 360) + 360) % 360; }
  function getRackBaseSize(modelId){
    const m = rackModel(modelId);
    const scale = 1;
    return {
      w: Math.max(44, Math.round((m.width || 150) * scale)),
      h: Math.max(24, Math.round((m.depth || 82) * scale))
    };
  }
  function getRackFootprint(modelId, rot = 0){
    const base = getRackBaseSize(modelId);
    const rad = normalizeAngle(rot) * Math.PI / 180;
    const c = Math.abs(Math.cos(rad)), s = Math.abs(Math.sin(rad));
    const w = Math.max(40, Math.round(base.w * c + base.h * s));
    const h = Math.max(40, Math.round(base.w * s + base.h * c));
    return { w, h, baseW: base.w, baseH: base.h };
  }

  function getRackStackLevel(rack){
    return Math.max(0, parseInt(rack?.stackLevel || 0, 10) || 0);
  }
  function racksCanOverlapByLevel(a, b){
    return getRackStackLevel(a) !== getRackStackLevel(b);
  }
  function rackStackKey(r){
    return [String(r.zoneId||''), Math.round(Number(r.x||0)), Math.round(Number(r.y||0))].join('|');
  }
  function getRackStackMembers(rack){
    if(!rack) return [];
    const key = rackStackKey(rack);
    return (appState.layout.racks || [])
      .filter(r => rackStackKey(r) === key)
      .sort((a,b) => (getRackStackLevel(a) - getRackStackLevel(b)) || ((a.baseHeight||0) - (b.baseHeight||0)) || (a.id > b.id ? 1 : -1));
  }
  function getRackStackCount(rack){
    return getRackStackMembers(rack).length;
  }
  function syncStackGroupHeights(group){
    const members = Array.isArray(group) ? group.slice().sort((a,b) => (getRackStackLevel(a) - getRackStackLevel(b)) || (a.id > b.id ? 1 : -1)) : [];
    if(!members.length) return;
    if(members.length === 1){
      const only = members[0];
      const h = Math.max(60, Number(only.rackHeight || rackModel(only.modelId)?.height || 240) || 240);
      only.baseHeight = getRackStackLevel(only) * h;
      return;
    }
    let cumulative = 0;
    members.forEach((member, idx) => {
      member.stackLevel = idx;
      member.baseHeight = cumulative;
      cumulative += Math.max(60, Number(member.rackHeight || rackModel(member.modelId)?.height || 240) || 240);
    });
  }
  function recalcAllRackStackHeights(){
    const groups = new Map();
    (appState.layout?.racks || []).forEach(r => {
      const key = rackStackKey(r);
      if(!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    groups.forEach(group => syncStackGroupHeights(group));
  }
  function rackStackSummary(rack){
    const members = getRackStackMembers(rack);
    return {
      members,
      count: members.length,
      isStacked: members.length > 1,
      level: getRackStackLevel(rack),
      key: members.length ? rackStackKey(members[0]) : ''
    };
  }
  function duplicateRackAbove(rackId){
    const rack = findRackById(rackId);
    if(!rack) return;
    const zone = findZoneById(rack.zoneId);
    if(!zone) return;
    const cloneRack = clone(rack);
    cloneRack.id = nextRackId(rack.zoneId);
    cloneRack.stackLevel = getRackStackLevel(rack) + 1;
    cloneRack.baseHeight = 0;
    cloneRack.zoneId = rack.zoneId;
    cloneRack.x = rack.x;
    cloneRack.y = rack.y;
    cloneRack.rot = normalizeAngle(rack.rot || 0);
    cloneRack.rackHeight = Math.max(60, Number(rack.rackHeight || rackModel(rack.modelId)?.height || 240) || 240);
    syncRackFootprint(cloneRack, false);
    appState.layout.racks.push(cloneRack);
    recalcAllRackStackHeights();
    appState.selectedRackLayoutId = cloneRack.id;
    appState.selectedZoneId = cloneRack.zoneId;
    persistActiveLayout();
    renderLayoutEditor();
  }
  function openStackMenuForRack(rackId, evt){
    const rack = findRackById(rackId);
    if(!rack) return;
    const summary = rackStackSummary(rack);
    if(summary.count <= 1){
      appState.editor.stackMenu = { open:false, rackId:'', x:0, y:0 };
      return;
    }
    let x = 28, y = 74;
    const svg = document.getElementById('layoutSvg');
    if(svg){
      const svgRect = svg.getBoundingClientRect();
      if(evt && Number.isFinite(evt.clientX) && Number.isFinite(evt.clientY)){
        x = evt.clientX - svgRect.left + 12;
        y = evt.clientY - svgRect.top + 12;
      } else {
        x = 28; y = 74;
      }
    }
    appState.editor.stackMenu = { open:true, rackId, x, y };
  }
  function closeStackMenu(){
    appState.editor.stackMenu = { open:false, rackId:'', x:0, y:0 };
  }
  function getFrontLine(baseW, baseH){
    const pad = 8;
    // El frente siempre es el lado más largo del rack.
    // Si el ancho base es mayor o igual al fondo, el frente es el borde superior.
    // Si el fondo es mayor, el frente es el borde derecho.
    if(baseW >= baseH){
      return { x1: -baseW/2 + 12, y1: -baseH/2 + pad, x2: baseW/2 - 12, y2: -baseH/2 + pad, ax: 0, ay: -baseH/2 - 10, dir:'up' };
    }
    return { x1: baseW/2 - pad, y1: -baseH/2 + 12, x2: baseW/2 - pad, y2: baseH/2 - 12, ax: baseW/2 + 10, ay: 0, dir:'right' };
  }
  function frontArrowPath(x, y, dir){
    if(dir === 'right') return `M ${x-9} ${y-6} L ${x-9} ${y+6} L ${x+4} ${y} Z`;
    if(dir === 'down') return `M ${x-6} ${y-9} L ${x+6} ${y-9} L ${x} ${y+4} Z`;
    if(dir === 'left') return `M ${x+9} ${y-6} L ${x+9} ${y+6} L ${x-4} ${y} Z`;
    return `M ${x-6} ${y+9} L ${x+6} ${y+9} L ${x} ${y-4} Z`;
  }
  function syncRackFootprint(rack, preserveCenter = true){
    if(!rack) return;
    const oldW = rack.w || 48, oldH = rack.h || 90;
    const cx = rack.x + oldW / 2, cy = rack.y + oldH / 2;
    const fp = getRackFootprint(rack.modelId, rack.rot || 0);
    rack.w = fp.w; rack.h = fp.h;
    if(preserveCenter){
      rack.x = cx - rack.w / 2;
      rack.y = cy - rack.h / 2;
    }
  }
  function applyRackRotation(rack, nextAngle, { preserveCenter = true, snap = true } = {}){
    if(!rack) return;
    const cx = rack.x + (rack.w || 0) / 2;
    const cy = rack.y + (rack.h || 0) / 2;
    rack.rot = normalizeAngle(nextAngle);
    syncRackFootprint(rack, false);
    if(preserveCenter){
      rack.x = cx - rack.w / 2;
      rack.y = cy - rack.h / 2;
    }
    const host = findZoneById(rack.zoneId) || nearestZoneForPoint({ x:cx, y:cy });
    if(host){
      keepRackSnapped(rack, host);
      rack.zoneId = host.id;
    }
  }

  function rotatePointAround(point, center, degrees){
    const rad = (Number(degrees) || 0) * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const dx = (Number(point?.x) || 0) - center.x;
    const dy = (Number(point?.y) || 0) - center.y;
    return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
  }

  function getZoneRotationDegrees(zone){
    if(!zone || !Array.isArray(zone.pts) || zone.pts.length < 2) return 0;
    const a = zone.pts[0], b = zone.pts[1];
    return normalizeAngle(Math.atan2((Number(b.y)||0) - (Number(a.y)||0), (Number(b.x)||0) - (Number(a.x)||0)) * 180 / Math.PI);
  }

  function rotateZoneWithContents(zoneId, deltaDegrees, { persist=true, rerender=true } = {}){
    const zone = findZoneById(zoneId);
    if(!zone || !Array.isArray(zone.pts) || zone.pts.length < 3) return false;
    const delta = Number(deltaDegrees) || 0;
    if(!delta) return false;
    const center = polygonCentroid(zone.pts);
    const candidate = zone.pts.map(pt => rotatePointAround(pt, center, delta));
    const collision = typeof findZoneOverlap === 'function' ? findZoneOverlap(zone.id,candidate) : null;
    if(collision){ if(typeof setZoneCollisionPreview==='function')setZoneCollisionPreview(zone.id,collision,candidate); if(typeof showToast==='function')showToast(`Rotación bloqueada: ${zone.name||zone.id} se superpondría con ${collision.name||collision.id}.`,'warning',2400); if(rerender&&typeof renderLayoutEditor==='function')renderLayoutEditor(); return false; }
    zone.pts = candidate;
    if(typeof clearZoneCollisionPreview==='function')clearZoneCollisionPreview();
    // v110: la rotación de estructura no rota ni reposiciona racks.
    appState.selectedZoneId = zone.id;
    clearRackSnapPreview();
    if(persist) persistActiveLayout();
    if(rerender) renderLayoutEditor();
    return true;
  }

  function setZoneRotation(zoneId, targetDegrees){
    const zone = findZoneById(zoneId);
    if(!zone) return;
    const current = getZoneRotationDegrees(zone);
    let delta = (Number(targetDegrees) || 0) - current;
    if(delta > 180) delta -= 360;
    if(delta < -180) delta += 360;
    rotateZoneWithContents(zoneId, delta);
  }

  function ensureRackProps(){
    if(appState.editor.racksVisible !== false) appState.layout.racks.forEach(r => {
      r.rot = normalizeAngle(r.rot || 0);
      const model = rackModel(r.modelId);
      const defaultHeight = Math.max(120, Number(model?.height || 238) || 238);
      const legacyStack = Math.max(0, parseInt(r.stackLevel || 0, 10) || 0);
      if(!Number.isFinite(Number(r.baseHeight))) r.baseHeight = legacyStack * defaultHeight;
      if(!Number.isFinite(Number(r.rackHeight)) || Number(r.rackHeight) <= 0) r.rackHeight = defaultHeight;
      r.baseHeight = Math.max(0, Number(r.baseHeight) || 0);
      r.rackHeight = Math.max(60, Number(r.rackHeight) || defaultHeight);
      syncRackFootprint(r, false);
    });
  }


