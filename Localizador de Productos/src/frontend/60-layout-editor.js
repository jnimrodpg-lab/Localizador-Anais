/* WMS_V130_UNIFIED_WALLS_VIEWS */
  function ensureLayoutEditorState(){
    if(!appState.editor || typeof appState.editor !== 'object') appState.editor = {};
    ensureLayoutDecorations();
    if(appState.editor.showGrid === undefined) appState.editor.showGrid = true;
    if(appState.editor.showZones === undefined) appState.editor.showZones = true;
    if(appState.editor.showLabels === undefined) appState.editor.showLabels = true;
    if(appState.editor.racksVisible === undefined) appState.editor.racksVisible = true;
    if(appState.editor.wallsVisible === undefined) appState.editor.wallsVisible = true;
    if(appState.editor.openingsVisible === undefined) appState.editor.openingsVisible = true;
    if(appState.editor.showDims === undefined) appState.editor.showDims = true;
    if(appState.editor.showMiniMap === undefined) appState.editor.showMiniMap = true;
    if(appState.editor.snapEnabled === undefined) appState.editor.snapEnabled = true;
    if(appState.editor.beginnerMode === undefined) appState.editor.beginnerMode = true;
    if(appState.editor.sectionVisible === undefined) appState.editor.sectionVisible = false;
    if(appState.editor.pendingWallPoint === undefined) appState.editor.pendingWallPoint = null;
    if(appState.editor.wallCursor === undefined) appState.editor.wallCursor = null;
    if(!Array.isArray(appState.editor.wallChainNodeIds)) appState.editor.wallChainNodeIds = [];
    if(appState.editor.wallChainStartNodeId === undefined) appState.editor.wallChainStartNodeId = '';
    if(appState.editor.wallLengthDraft === undefined) appState.editor.wallLengthDraft = '';
    if(appState.editor.measureDraft === undefined) appState.editor.measureDraft = null;
    if(appState.editor.orthoEnabled === undefined) appState.editor.orthoEnabled = false;
    if(appState.editor.selectedMeasurementId === undefined) appState.editor.selectedMeasurementId = '';
    if(appState.selectedRoomId === undefined) appState.selectedRoomId = '';
    if(appState.selectedStreetId === undefined) appState.selectedStreetId = '';
    if(!appState.editor.stackViewMode) appState.editor.stackViewMode='compact';
    if(!['architecture','urbanism'].includes(appState.editor.layoutSubsystem)) appState.editor.layoutSubsystem='architecture';
    if(appState.editor.visibleRackLevel===undefined) appState.editor.visibleRackLevel='all';
    if(appState.editor.distributionFreeMove===undefined) appState.editor.distributionFreeMove=true;
    if(appState.editor.distributionVertexSnap===undefined) appState.editor.distributionVertexSnap=true;
    if(!['wall','vertices'].includes(appState.editor.rackAlignMode)) appState.editor.rackAlignMode='';
    if(appState.editor.rackAlignVertexA===undefined) appState.editor.rackAlignVertexA=null;
    if(appState.editor.rackAlignClearanceCm===undefined) appState.editor.rackAlignClearanceCm=2;
    if(appState.editor.areaMoveMode===undefined) appState.editor.areaMoveMode=false;
    if(appState.editor.selectedStackLevel===undefined) appState.editor.selectedStackLevel=0;
    if(appState.selectedStreetFurnitureId === undefined) appState.selectedStreetFurnitureId = '';
    if(appState.editor.editSiteBoundary === undefined) appState.editor.editSiteBoundary=false;
    if(!['area','zones','walls'].includes(appState.editor.architectureTool)) appState.editor.architectureTool='area';
    if(appState.editor.structureClipboard === undefined) appState.editor.structureClipboard = null;
    if(appState.editor.keyboardBoundV111 === undefined) appState.editor.keyboardBoundV111 = false;
    if(appState.editor.wallMergePreview === undefined) appState.editor.wallMergePreview = null;
    if(!Array.isArray(appState.editor.selectedWallIds)) appState.editor.selectedWallIds = appState.selectedWallId ? [appState.selectedWallId] : [];
    if(appState.editor.roomMovePreview === undefined) appState.editor.roomMovePreview = null;
    if(appState.editor.zoneCollisionPreview === undefined) appState.editor.zoneCollisionPreview = null;
    if(appState.editor.geometrySnapPreview === undefined) appState.editor.geometrySnapPreview = null;
    // Migración: versiones antiguas dejaban el snap en 20 unidades; ahora se baja a 2 para precisión fina.
    if(!appState.editor.snapPrecisionMigrated && Number(appState.editor.snapSize || 0) >= 20){
      appState.editor.snapSize = DEFAULT_GRID_SIZE;
      appState.editor.snapPrecisionMigrated = true;
    }
    if(!appState.editor.dimFontMigrated && Number(appState.editor.dimFontSize || 0) <= 20){
      appState.editor.dimFontSize = DEFAULT_DIM_FONT_SIZE;
      appState.editor.dimFontMigrated = true;
    }
    appState.editor.snapSize = getSnapSize();
    appState.editor.dimFontSize = getDimFontSize();
    if(appState.editor.rightPanelOpen === undefined) appState.editor.rightPanelOpen = true;
    if(appState.editor.presentationMode === undefined) appState.editor.presentationMode = false;
    if(isRackDistributionScreen() && ['zone','area','street','wall','opening','door','measure'].includes(appState.editor.mode)) appState.editor.mode = 'select';
    if(isStructureLayoutScreen() && appState.editor.mode === 'rack') appState.editor.mode = 'select';
    const vb = appState.editor.viewBox || {};
    if(!Number.isFinite(Number(vb.w)) || !Number.isFinite(Number(vb.h)) || Number(vb.w) > 14000 || Number(vb.h) > 10000){
      appState.editor.viewBox = { x:0, y:0, w:900, h:620 };
      appState.editor.viewBoxInitialized = false;
      appState.editor.viewBoxCustomized = false;
    }
  }


  // v111 — motor de layout conectado (nodos + muros + recintos + medición)
  function nextWallNodeId(layout=appState.layout){
    if(!layout || typeof layout !== 'object') return 'N1';
    if(!Array.isArray(layout.wallNodes)) layout.wallNodes = [];
    const nums = layout.wallNodes.map(n => {
      const m = String(n?.id || '').match(/^N(\d+)$/i);
      return m ? Number(m[1]) : NaN;
    }).filter(Number.isFinite);
    return `N${Math.max(0, ...nums) + 1}`;
  }
  function getWallNode(id, layout=appState.layout){
    if(!id || !layout || !Array.isArray(layout.wallNodes)) return null;
    return layout.wallNodes.find(n => n.id === id) || null;
  }
  function findWallNodeNear(point, tolerance=2, layout=appState.layout){
    if(!point || !layout || !Array.isArray(layout.wallNodes)) return null;
    let best = null;
    layout.wallNodes.forEach(node => {
      const d = Math.hypot(Number(node.x||0)-Number(point.x||0), Number(node.y||0)-Number(point.y||0));
      if(d <= tolerance && (!best || d < best.d)) best = { node, d };
    });
    return best?.node || null;
  }
  function findOrCreateWallNode(point, preferredId='', layout=appState.layout){
    if(!layout || typeof layout !== 'object') return null;
    if(!Array.isArray(layout.wallNodes)) layout.wallNodes = [];
    if(preferredId){
      const existing = getWallNode(preferredId, layout);
      if(existing) return existing;
    }
    const near = findWallNodeNear(point, Math.max(.75, Math.min(3, getSnapSize() * .45)), layout);
    if(near) return near;
    const node = { id:nextWallNodeId(layout), x:Number(point?.x||0), y:Number(point?.y||0) };
    layout.wallNodes.push(node);
    return node;
  }
  function manualWalls(layout=appState.layout){ return (layout?.walls || []).filter(w => !w?.autoZoneEdge); }
  function wallsForNode(nodeId, layout=appState.layout){ return manualWalls(layout).filter(w => w.startNodeId === nodeId || w.endNodeId === nodeId); }
  function findManualWallByNodes(aId, bId, layout=appState.layout){
    return manualWalls(layout).find(w => (w.startNodeId===aId && w.endNodeId===bId) || (w.startNodeId===bId && w.endNodeId===aId)) || null;
  }
  function syncManualWallsFromNodes(layout=appState.layout){
    if(!layout || !Array.isArray(layout.walls) || !Array.isArray(layout.wallNodes)) return layout;
    const map = new Map(layout.wallNodes.map(n => [n.id, n]));
    layout.walls.forEach(wall => {
      if(wall?.autoZoneEdge) return;
      const a = map.get(wall.startNodeId), b = map.get(wall.endNodeId);
      if(a){ wall.x1 = Number(a.x||0); wall.y1 = Number(a.y||0); }
      if(b){ wall.x2 = Number(b.x||0); wall.y2 = Number(b.y||0); }
      wall.height = Math.max(120, Number(wall.height || layout.meta?.defaultWallHeight || 290) || 290);
      wall.thickness = Math.max(4, Number(wall.thickness || layout.meta?.defaultWallThickness || 12) || 12);
    });
    return layout;
  }
  function pruneOrphanWallNodes(layout=appState.layout){
    if(!layout || !Array.isArray(layout.wallNodes)) return;
    const used = new Set();
    manualWalls(layout).forEach(w => { if(w.startNodeId) used.add(w.startNodeId); if(w.endNodeId) used.add(w.endNodeId); });
    (layout.rooms || []).forEach(room => (room.nodeIds || []).forEach(id => used.add(id)));
    layout.wallNodes = layout.wallNodes.filter(n => used.has(n.id));
  }
  function ensureWallTopology(layout=appState.layout){
    if(!layout || typeof layout !== 'object') return layout;
    if(!layout.meta || typeof layout.meta !== 'object') layout.meta = {};
    if(!Number.isFinite(Number(layout.meta.defaultWallThickness))) layout.meta.defaultWallThickness = 12;
    if(!Number.isFinite(Number(layout.meta.defaultWallHeight))) layout.meta.defaultWallHeight = 290;
    if(!Array.isArray(layout.wallNodes)) layout.wallNodes = [];
    if(!Array.isArray(layout.rooms)) layout.rooms = [];
    if(!Array.isArray(layout.measurements)) layout.measurements = [];
    const nodeTolerance = 1.75;
    const locate = pt => {
      let node = findWallNodeNear(pt, nodeTolerance, layout);
      if(!node){ node = { id:nextWallNodeId(layout), x:Number(pt.x||0), y:Number(pt.y||0) }; layout.wallNodes.push(node); }
      return node;
    };
    manualWalls(layout).forEach(wall => {
      let a = getWallNode(wall.startNodeId, layout);
      let b = getWallNode(wall.endNodeId, layout);
      if(!a){ a = locate({x:Number(wall.x1||0), y:Number(wall.y1||0)}); wall.startNodeId = a.id; }
      if(!b){ b = locate({x:Number(wall.x2||0), y:Number(wall.y2||0)}); wall.endNodeId = b.id; }
      wall.height = Math.max(120, Number(wall.height || layout.meta.defaultWallHeight || 290) || 290);
      wall.thickness = Math.max(4, Number(wall.thickness || layout.meta.defaultWallThickness || 12) || 12);
      wall.kind = wall.kind || 'wall';
      if(layout.meta?.commercialAreaV209)wall.ownerAreaId='AREA-GENERAL';
    });
    syncManualWallsFromNodes(layout);
    syncRoomLinkedZones(layout);
    ensureOpeningAttachmentOffsets(layout);
    if(typeof v214EnsureHierarchy==='function')v214EnsureHierarchy(layout);
    return layout;
  }
  function ensureOpeningAttachmentOffsets(layout=appState.layout){
    if(!layout || !Array.isArray(layout.openings)) return layout;
    const walls = new Map((layout.walls || []).map(w => [w.id, w]));
    layout.openings.forEach(opening => {
      const wall = walls.get(opening.wallId);
      if(!wall) return;
      const len = Math.max(1, Math.hypot(Number(wall.x2||0)-Number(wall.x1||0), Number(wall.y2||0)-Number(wall.y1||0)));
      const width = Math.max(40, Number(opening.width || 90) || 90);
      const minCenter = Math.min(len/2, width/2);
      const maxCenter = Math.max(minCenter, len - width/2);
      let offset = Number(opening.offset);
      if(!Number.isFinite(offset)) offset = Math.max(minCenter, Math.min(maxCenter, Number(opening.t ?? .5) * len));
      opening.offset = Math.max(minCenter, Math.min(maxCenter, offset));
      opening.t = Math.max(.001, Math.min(.999, opening.offset / len));
    });
    return layout;
  }
  function setWallNodePosition(nodeId, x, y){
    ensureWallTopology();
    const node = getWallNode(nodeId);
    if(!node) return null;
    const ok = trySetWallNodesPositionsBulk([{id:nodeId,x:Number(x||0),y:Number(y||0)}], appState.layout, {silent:true});
    return ok ? getWallNode(nodeId) : null;
  }
  function setManualWallLength(wall, nextLength){
    if(!wall || wall.autoZoneEdge) return false;
    ensureWallTopology();
    const a = getWallNode(wall.startNodeId), b = getWallNode(wall.endNodeId);
    if(!a || !b) return false;
    const len = Math.max(1, Math.hypot(b.x-a.x, b.y-a.y));
    const target = Math.max(10, Number(nextLength || len) || len);
    const dx = (b.x-a.x)/len, dy = (b.y-a.y)/len;
    return !!setWallNodePosition(b.id, a.x + dx*target, a.y + dy*target);
  }
  function nextRoomId(){
    ensureWallTopology();
    const nums = (appState.layout.rooms || []).map(r => Number(String(r.id||'').replace(/\D+/g,''))).filter(Number.isFinite);
    return `ROOM-${Math.max(0,...nums)+1}`;
  }
  function roomPointsRaw(room, layout=appState.layout){
    if(!room || !layout || !Array.isArray(layout.wallNodes)) return [];
    const nodes = new Map(layout.wallNodes.map(n => [n.id,n]));
    return (room.nodeIds || []).map(id => nodes.get(id)).filter(Boolean).map(n => ({x:Number(n.x||0),y:Number(n.y||0)}));
  }
  function roomPoints(room){
    ensureWallTopology();
    return roomPointsRaw(room, appState.layout);
  }
  function findRoomById(id, layout=appState.layout){
    if(!id || !layout || !Array.isArray(layout.rooms)) return null;
    return layout.rooms.find(r => r.id === id) || null;
  }
  function getRoomLinkedZone(roomOrId, layout=appState.layout){
    const room = typeof roomOrId === 'string' ? findRoomById(roomOrId, layout) : roomOrId;
    if(!room || !Array.isArray(layout?.zones)) return null;
    return layout.zones.find(z => z.linkedRoomId === room.id) || (room.zoneId ? layout.zones.find(z => z.id === room.zoneId) : null) || null;
  }
  function getRoomForZone(zoneOrId, layout=appState.layout){
    const zone = typeof zoneOrId === 'string' ? (layout?.zones||[]).find(z=>z.id===zoneOrId) : zoneOrId;
    if(!zone?.linkedRoomId) return null;
    return findRoomById(zone.linkedRoomId, layout);
  }
  function isRoomLinkedZone(zoneOrId, layout=appState.layout){ return !!getRoomForZone(zoneOrId, layout); }
  function roomNodeIds(room){ return [...new Set((room?.nodeIds || []).filter(Boolean))]; }
  function roomWallEdges(room, layout=appState.layout){
    if(!room) return [];
    const ids=room.nodeIds || [];
    const walls=(layout?.walls||[]).filter(w=>!w?.autoZoneEdge);
    const out=[];
    for(let i=0;i<ids.length;i++){
      const aId=ids[i], bId=ids[(i+1)%ids.length];
      const a=getWallNode(aId,layout), b=getWallNode(bId,layout);
      if(!a||!b) continue;
      const wall=walls.find(w=>(w.startNodeId===aId&&w.endNodeId===bId)||(w.startNodeId===bId&&w.endNodeId===aId))||null;
      out.push({index:i,aId,bId,a:{x:Number(a.x||0),y:Number(a.y||0)},b:{x:Number(b.x||0),y:Number(b.y||0)},wall});
    }
    return out;
  }
  function setWallNodesPositionsBulk(items, layout=appState.layout){
    if(typeof v214NodesBound==='function'&&v214NodesBound(items,layout)){showToast('Modifica los vértices del Área comercial para mover sus muros vinculados.','warning');return false;}
    if(!layout || !Array.isArray(layout.wallNodes)) return false;
    const map=new Map(layout.wallNodes.map(n=>[n.id,n]));
    let changed=false;
    (items||[]).forEach(item=>{ const n=map.get(item.id); if(!n) return; n.x=Number(item.x||0); n.y=Number(item.y||0); changed=true; });
    if(changed){ syncManualWallsFromNodes(layout); syncRoomLinkedZones(layout); ensureOpeningAttachmentOffsets(layout); }
    return changed;
  }
  function translateRoomGeometry(roomOrId, dx, dy, {snap=false}={}){
    const room=typeof roomOrId==='string'?findRoomById(roomOrId):roomOrId;
    if(!room) return false;
    ensureWallTopology();
    const updates=roomNodeIds(room).map(id=>{ const n=getWallNode(id); return n?{id,x:(snap?snapGrid(n.x+dx):n.x+dx),y:(snap?snapGrid(n.y+dy):n.y+dy)}:null; }).filter(Boolean);
    return trySetWallNodesPositionsBulk(updates, appState.layout, {silent:false});
  }
  function mergeWallNodeInto(sourceId,targetId,layout=appState.layout){
    if(!sourceId||!targetId||sourceId===targetId) return targetId;
    const source=getWallNode(sourceId,layout), target=getWallNode(targetId,layout);
    if(!source||!target) return targetId;
    (layout.walls||[]).forEach(w=>{ if(w.autoZoneEdge) return; if(w.startNodeId===sourceId) w.startNodeId=targetId; if(w.endNodeId===sourceId) w.endNodeId=targetId; });
    (layout.rooms||[]).forEach(room=>{ room.nodeIds=(room.nodeIds||[]).map(id=>id===sourceId?targetId:id); });
    layout.wallNodes=(layout.wallNodes||[]).filter(n=>n.id!==sourceId);
    return targetId;
  }
  function transferWallOpenings(sourceWall,targetWall,reversed=false,layout=appState.layout){
    if(!sourceWall||!targetWall||sourceWall.id===targetWall.id) return;
    const targetLen=Math.max(1,wallLength(targetWall));
    (layout.openings||[]).forEach(o=>{
      if(o.wallId!==sourceWall.id) return;
      const off=Number(o.offset);
      o.wallId=targetWall.id;
      if(Number.isFinite(off)) o.offset=reversed?Math.max(0,targetLen-off):off;
      o.t=Math.max(.001,Math.min(.999,Number(o.offset||targetLen*.5)/targetLen));
    });
  }
  function dedupeManualWalls({preferWallId=''}={}){
    const groups=new Map();
    manualWalls().forEach(w=>{ const key=[w.startNodeId,w.endNodeId].sort().join('|'); if(!groups.has(key)) groups.set(key,[]); groups.get(key).push(w); });
    groups.forEach(group=>{
      if(group.length<2) return;
      const keeper=group.find(w=>w.id===preferWallId)||group[0];
      group.filter(w=>w!==keeper).forEach(w=>{
        const reversed=w.startNodeId===keeper.endNodeId && w.endNodeId===keeper.startNodeId;
        transferWallOpenings(w,keeper,reversed);
        appState.layout.walls=appState.layout.walls.filter(x=>x!==w);
        if(appState.selectedWallId===w.id) appState.selectedWallId=keeper.id;
      });
    });
    syncManualWallsFromNodes(); ensureOpeningAttachmentOffsets();
  }
  function findRoomWallCollisionSnap(room, originalNodes, dx, dy){
    if(!room || !originalNodes) return null;
    const threshold=Math.max(8,Math.min(22,getSnapSize()*3.4));
    const cosTol=Math.cos(7*Math.PI/180);
    const movingEdges=roomWallEdges(room).map(edge=>{
      const oa=originalNodes[edge.aId], ob=originalNodes[edge.bId];
      return oa&&ob?{...edge,a:{x:oa.x+dx,y:oa.y+dy},b:{x:ob.x+dx,y:ob.y+dy}}:null;
    }).filter(Boolean);
    let best=null;
    (appState.layout.rooms||[]).forEach(targetRoom=>{
      if(targetRoom.id===room.id) return;
      roomWallEdges(targetRoom).forEach(target=>{
        const tl=Math.hypot(target.b.x-target.a.x,target.b.y-target.a.y)||1;
        movingEdges.forEach(moving=>{
          if([moving.aId,moving.bId].some(id=>id===target.aId||id===target.bId)) return;
          const ml=Math.hypot(moving.b.x-moving.a.x,moving.b.y-moving.a.y)||1;
          if(Math.abs(ml-tl)>Math.max(threshold*1.6,Math.min(ml,tl)*.08)) return;
          const mdx=(moving.b.x-moving.a.x)/ml, mdy=(moving.b.y-moving.a.y)/ml;
          const tdx=(target.b.x-target.a.x)/tl, tdy=(target.b.y-target.a.y)/tl;
          if(Math.abs(mdx*tdx+mdy*tdy)<cosTol) return;
          [false,true].forEach(reversed=>{
            const ta=reversed?target.b:target.a, tb=reversed?target.a:target.b;
            const adx=((ta.x-moving.a.x)+(tb.x-moving.b.x))/2;
            const ady=((ta.y-moving.a.y)+(tb.y-moving.b.y))/2;
            const aa={x:moving.a.x+adx,y:moving.a.y+ady}, bb={x:moving.b.x+adx,y:moving.b.y+ady};
            const residual=Math.max(Math.hypot(aa.x-ta.x,aa.y-ta.y),Math.hypot(bb.x-tb.x,bb.y-tb.y));
            const shift=Math.hypot(adx,ady);
            if(residual>threshold*.8 || shift>threshold*1.5) return;
            const score=residual+shift*.18;
            if(!best||score<best.score) best={score,roomId:room.id,targetRoomId:targetRoom.id,movingAId:moving.aId,movingBId:moving.bId,targetAId:target.aId,targetBId:target.bId,movingWallId:moving.wall?.id||'',targetWallId:target.wall?.id||'',reversed,dx:dx+adx,dy:dy+ady};
          });
        });
      });
    });
    return best;
  }
  function mergeRoomSharedWall(candidate){
    if(!candidate) return false;
    ensureWallTopology();
    const movingWall=findWallById(candidate.movingWallId), targetWall=findWallById(candidate.targetWallId);
    const mapA=candidate.reversed?candidate.targetBId:candidate.targetAId;
    const mapB=candidate.reversed?candidate.targetAId:candidate.targetBId;
    mergeWallNodeInto(candidate.movingAId,mapA);
    mergeWallNodeInto(candidate.movingBId,mapB);
    syncManualWallsFromNodes();
    if(movingWall&&targetWall&&movingWall!==targetWall){
      transferWallOpenings(movingWall,targetWall,!!candidate.reversed);
      appState.layout.walls=(appState.layout.walls||[]).filter(w=>w.id!==movingWall.id);
      if(appState.selectedWallId===movingWall.id) appState.selectedWallId=targetWall.id;
    }
    dedupeManualWalls({preferWallId:targetWall?.id||''});
    pruneOrphanWallNodes(); syncManualWallsFromNodes(); syncRoomLinkedZones(); ensureOpeningAttachmentOffsets();
    return true;
  }
  function syncRoomLinkedZones(layout=appState.layout){
    if(!layout || !Array.isArray(layout.zones) || !Array.isArray(layout.rooms)) return layout;
    // Los muros y recintos físicos nunca modifican las delimitaciones virtuales.
    if(layout.meta?.zoneSemantics==='virtual')return layout;
    const roomMap = new Map(layout.rooms.map(r => [r.id,r]));
    layout.zones.forEach(zone => {
      if(!zone?.linkedRoomId) return;
      const room = roomMap.get(zone.linkedRoomId);
      if(!room || room.obsolete){ zone.roomLinkBroken = true; return; }
      const pts = roomPointsRaw(room, layout);
      if(pts.length < 3){ zone.roomLinkBroken = true; return; }
      zone.pts = pts;
      zone.dynamicFromRoom = true;
      zone.roomLinkBroken = false;
      room.zoneId = zone.id;
    });
    return layout;
  }
  // v128 — geometría segura de zonas: snap topológico + prohibición de solapes interiores.
  function zoneBoundaryDistance(point, pts){
    if(!point || !Array.isArray(pts) || pts.length < 2) return Infinity;
    let best=Infinity;
    for(let i=0;i<pts.length;i++){
      const pr=projectPointToSegment(point,pts[i],pts[(i+1)%pts.length]);
      best=Math.min(best,Math.hypot(pr.x-point.x,pr.y-point.y));
    }
    return best;
  }
  function pointStrictlyInsidePolygon(point, pts, tolerance=.8){
    return !!(point && Array.isArray(pts) && pts.length>=3 && pointInPoly(point,pts) && zoneBoundaryDistance(point,pts)>tolerance);
  }
  function segmentProperIntersection(a,b,c,d,eps=.35){
    const cross=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
    const ab1=cross(a,b,c), ab2=cross(a,b,d), cd1=cross(c,d,a), cd2=cross(c,d,b);
    return ((ab1>eps&&ab2<-eps)||(ab1<-eps&&ab2>eps)) && ((cd1>eps&&cd2<-eps)||(cd1<-eps&&cd2>eps));
  }
  function zonePolygonsOverlap(a,b,tolerance=.8){
    if(!Array.isArray(a)||a.length<3||!Array.isArray(b)||b.length<3) return false;
    const ba={minX:Math.min(...a.map(p=>p.x)),maxX:Math.max(...a.map(p=>p.x)),minY:Math.min(...a.map(p=>p.y)),maxY:Math.max(...a.map(p=>p.y))};
    const bb={minX:Math.min(...b.map(p=>p.x)),maxX:Math.max(...b.map(p=>p.x)),minY:Math.min(...b.map(p=>p.y)),maxY:Math.max(...b.map(p=>p.y))};
    if(ba.maxX<=bb.minX+tolerance||bb.maxX<=ba.minX+tolerance||ba.maxY<=bb.minY+tolerance||bb.maxY<=ba.minY+tolerance) return false;
    for(let i=0;i<a.length;i++) for(let j=0;j<b.length;j++) if(segmentProperIntersection(a[i],a[(i+1)%a.length],b[j],b[(j+1)%b.length],tolerance*.25)) return true;
    if(a.some(p=>pointStrictlyInsidePolygon(p,b,tolerance)) || b.some(p=>pointStrictlyInsidePolygon(p,a,tolerance))) return true;
    const aMid=a.map((p,i)=>({x:(p.x+a[(i+1)%a.length].x)/2,y:(p.y+a[(i+1)%a.length].y)/2}));
    const bMid=b.map((p,i)=>({x:(p.x+b[(i+1)%b.length].x)/2,y:(p.y+b[(i+1)%b.length].y)/2}));
    if(aMid.some(p=>pointStrictlyInsidePolygon(p,b,tolerance)) || bMid.some(p=>pointStrictlyInsidePolygon(p,a,tolerance))) return true;
    const ca=polygonCentroid(a), cb=polygonCentroid(b);
    if(pointStrictlyInsidePolygon(ca,b,tolerance) || pointStrictlyInsidePolygon(cb,a,tolerance)) return true;
    return false;
  }
  // V209: una zona representa una delimitación virtual, sin paredes automáticas.
  // Los polígonos pueden compartir vértices y aristas, pero no superficies.
  function v209PointOnSegment(p,a,b,eps=.65){
    if(!p||!a||!b)return false;
    const vx=b.x-a.x,vy=b.y-a.y,den=vx*vx+vy*vy;
    if(den<eps*eps)return Math.hypot(p.x-a.x,p.y-a.y)<=eps;
    const t=((p.x-a.x)*vx+(p.y-a.y)*vy)/den;
    if(t< -0.0001||t>1.0001)return false;
    return Math.hypot(p.x-(a.x+t*vx),p.y-(a.y+t*vy))<=eps;
  }
  function v209InsideOrOnBoundary(p,pts,eps=.65){
    if(!Array.isArray(pts)||pts.length<3)return false;
    if(pts.some((a,i)=>v209PointOnSegment(p,a,pts[(i+1)%pts.length],eps)))return true;
    return pointInPoly(p,pts);
  }
  function v209SimplePolygon(pts){
    if(!Array.isArray(pts)||pts.length<3)return false;
    if(!pts.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)))return false;
    if(polygonAreaAbs(pts)<1)return false;
    const eps=.01;
    for(let i=0;i<pts.length;i++) {const a=pts[(i+pts.length-1)%pts.length],b=pts[i],c=pts[(i+1)%pts.length];if(Math.abs((b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x))<eps&&(b.x-a.x)*(c.x-b.x)+(b.y-a.y)*(c.y-b.y)<0)return false;}
    for(let i=0;i<pts.length;i++){
      const a=pts[i],b=pts[(i+1)%pts.length];
      if(Math.hypot(b.x-a.x,b.y-a.y)<1)return false;
      for(let j=i+1;j<pts.length;j++){
        if(j===i+1||(i===0&&j===pts.length-1))continue;
        const c=pts[j],d=pts[(j+1)%pts.length];
        if(segmentProperIntersection(a,b,c,d,eps)||v209PointOnSegment(a,c,d,eps)||v209PointOnSegment(b,c,d,eps)||v209PointOnSegment(c,a,b,eps)||v209PointOnSegment(d,a,b,eps))return false;
      }
    }
    return true;
  }
  function v209ZoneInsideArea(pts,areaPts){
    if(!v209SimplePolygon(pts)||!v209SimplePolygon(areaPts))return false;
    for(let i=0;i<pts.length;i++){
      const a=pts[i],b=pts[(i+1)%pts.length];
      // Los puntos intermedios impiden cruzar un entrante del perímetro
      // aunque ambos extremos permanezcan dentro del área comercial.
      for(const t of [0,.125,.25,.5,.75,.875,1]){
        if(!v209InsideOrOnBoundary({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t},areaPts))return false;
      }
      for(let j=0;j<areaPts.length;j++){
        if(segmentProperIntersection(a,b,areaPts[j],areaPts[(j+1)%areaPts.length],.001))return false;
      }
    }
    return true;
  }
  function v209ZoneViolation(zoneId, pts, layout=appState.layout){
    if(!v209SimplePolygon(pts))return {id:'INVALIDA',name:'Geometría inválida',reason:'invalid'};
    const area=layout?.meta?.siteBoundary?.pts;
    if(Array.isArray(area)&&area.length>=3&&!v209ZoneInsideArea(pts,area)){
      return {id:'AREA-GENERAL',name:'Área útil del local',reason:'outside'};
    }
    const overlap=(layout?.zones||[]).find(other=>other?.id!==zoneId && Array.isArray(other.pts)&&other.pts.length>=3&&zonePolygonsOverlap(pts,other.pts));
    return overlap ? {...overlap,reason:'overlap'} : null;
  }
  function findZoneOverlap(zoneId, pts, layout=appState.layout){
    if(!Array.isArray(pts)||pts.length<3)return {id:'INVALIDA',name:'Geometría inválida',reason:'invalid'};
    return v209ZoneViolation(zoneId,pts,layout);
  }
  function v209AreaMetrics(layout=appState.layout){
    const scale=Math.max(.001,Number(layout?.meta?.scaleCmPerUnit||1));
    const sqm=pts=>polygonAreaAbs(pts||[])*scale*scale/10000;
    const areaPts=layout?.meta?.siteBoundary?.pts||[];
    const total=sqm(areaPts);
    let assigned=0,invalid=0;
    (layout?.zones||[]).forEach(z=>{
      if(v209ZoneViolation(z.id,z.pts,layout)){invalid++;return;}
      assigned+=sqm(z.pts);
    });
    return {total,assigned,unassigned:Math.max(0,total-assigned),invalid,count:layout?.zones?.length||0};
  }
  // V211 — superficies virtuales: operaciones no destructivas.
  const V211_ZONE_COLORS=['#75a9d4','#72b58b','#e0aa68','#bb93cb','#6cb6b2','#e58a83','#adb26b','#9ca9dc','#d7a0b0'];
  function v211ZoneColor(zoneId=''){
    const used=new Set((appState.layout?.zones||[]).filter(z=>z.id!==zoneId).map(z=>String(z.color||'').toLowerCase()));
    return V211_ZONE_COLORS.find(c=>!used.has(c.toLowerCase()))||V211_ZONE_COLORS[(appState.layout?.zones||[]).length%V211_ZONE_COLORS.length];
  }
  function v211OrphanRackCount(){return (appState.layout?.racks||[]).filter(r=>!findZoneById(r.zoneId)).length;}
  function v211DetachPhysicalWallReferences(zoneId){
    // La zonificación es virtual. Al eliminar/fusionar su antiguo código,
    // conservar exactamente el lado donde estaba el espesor del muro físico.
    (appState.layout?.walls||[]).forEach(w=>{
      if(w.zoneBoundarySource?.zoneId!==zoneId)return;
      const offsets=getWallFaceOffsets(w);
      const placement=normalizeWallPlacement(w.placement);
      if(placement!=='center'){
        const towardLeft=offsets.left>offsets.right;
        w.referenceOutwardSign=placement==='outside'?(towardLeft?1:-1):(towardLeft?-1:1);
      }
      delete w.zoneBoundarySource;
      w.ownerAreaId='AREA-GENERAL';
    });
  }
  function v211DeleteZone(zoneId){
    if(typeof v213LayerLocked==='function'&&v213LayerLocked('zones'))return false;
    if(findZoneById(zoneId)?.locked){showToast('Desbloquea la zona antes de eliminarla.','warning');return false;}
    const zone=findZoneById(zoneId);if(!zone)return false;
    const related=(appState.layout?.racks||[]).filter(r=>r.zoneId===zoneId);
    const msg=`¿Eliminar la delimitación virtual «${zone.name||zone.id}»?${related.length?' Sus '+related.length+' rack(s) quedarán SIN ZONA, sin perder sus ID, modelos, SKU ni posiciones.':''} Los muros físicos no se eliminarán.`;
    if(typeof window!=='undefined' && typeof window.confirm==='function' && !window.confirm(msg))return false;
    recordHistorySnapshot('structure');
    if(zone.linkedRoomId){const room=findRoomById(zone.linkedRoomId);if(room?.zoneId===zone.id)delete room.zoneId;}
    v211DetachPhysicalWallReferences(zoneId);
    (appState.layout?.racks||[]).forEach(r=>{if(r.zoneId===zoneId)r.zoneId='';});
    (appState.layout?.rooms||[]).forEach(r=>{if(r.zoneId===zoneId)delete r.zoneId;});
    appState.layout.zones=appState.layout.zones.filter(z=>z.id!==zoneId);
    appState.selectedZoneId=appState.layout.zones[0]?.id||'';
    appState.selectedVertex={zoneId:'',idx:-1};appState.selectedEdge={zoneId:'',a:-1,b:-1};
    appState.selectedRoomId='';appState.selectedWallId='';appState.editor.selectedMeasurementId='';
    clearZoneCollisionPreview();persistActiveLayout();renderLayoutEditor();
    showToast(`Zona eliminada. ${related.length} rack(s) conservados sin clasificación. Ctrl+Z para recuperar.`,'success',3500);
    return true;
  }
  function v211RenameZone(current,requested){
    const zone=findZoneById(current);if(!zone)return false;
    const name=String(requested||'').trim().toUpperCase().replace(/\s+/g,'');
    if(!/^Z[1-9]\d*$/.test(name) && name!=='ALM'){
      showToast('Código no válido: utiliza Z1, Z2, Z3… o ALM. El nombre visible puede ser libre.','warning',3200);return false;
    }
    if(name===current)return true;
    if(appState.layout.zones.some(z=>z.id===name)){
      showToast('Ese código ya pertenece a otra zona.','warning',2800);return false;
    }
    recordHistorySnapshot('structure');zone.id=name;
    (appState.layout.racks||[]).forEach(r=>{if(r.zoneId===current)r.zoneId=name;});
    (appState.layout.rooms||[]).forEach(r=>{if(r.zoneId===current)r.zoneId=name;});
    (appState.layout.walls||[]).forEach(w=>{if(w.zoneBoundarySource?.zoneId===current)w.zoneBoundarySource.zoneId=name;});
    (appState.layout.measurements||[]).forEach(m=>{
      const updateRef=ref=>{if(!ref||typeof ref!=='object')return;
        if(ref.zoneId===current)ref.zoneId=name;
        if(typeof ref.kind==='string' && ref.kind.startsWith('zone-') && ref.id===current)ref.id=name;
      };
      updateRef(m.aRef);updateRef(m.bRef);updateRef(m.anchorA);updateRef(m.anchorB);
    });
    if(appState.selectedZoneId===current)appState.selectedZoneId=name;
    if(appState.selectedVertex?.zoneId===current)appState.selectedVertex.zoneId=name;
    if(appState.selectedEdge?.zoneId===current)appState.selectedEdge.zoneId=name;
    persistActiveLayout();renderLayoutEditor();return true;
  }
  function v211ReassignOrphanRacks(targetId){
    const target=findZoneById(targetId);if(!target)return false;
    const orphans=(appState.layout?.racks||[]).filter(r=>!findZoneById(r.zoneId));if(!orphans.length)return false;
    recordHistorySnapshot('structure');orphans.forEach(r=>{r.zoneId=target.id;});
    persistActiveLayout();renderLayoutEditor();showToast(`${orphans.length} rack(s) asignados a ${target.name||target.id} sin cambiar su ID.`, 'success',3000);
    return true;
  }
  function v211SamePoint(a,b,eps=.12){return !!a&&!!b&&Math.hypot(a.x-b.x,a.y-b.y)<eps;}
  function v211SharedVertexEdits(zoneId, indices, deltaPts, originalZones){
    // Solo desplaza vértices exactamente compartidos; los muros físicos no se alteran.
    const changes=new Map();
    const original=originalZones.find(z=>z.id===zoneId);if(!original)return null;
    const next=clone(original.pts);
    indices.forEach((index,k)=>{next[index]={...next[index],x:deltaPts[k].x,y:deltaPts[k].y};});
    changes.set(zoneId,next);
    originalZones.forEach(other=>{
      if(other.id===zoneId)return;
      const draft=clone(other.pts);let touched=false;
      indices.forEach((index,k)=>other.pts.forEach((pt,j)=>{
        if(v211SamePoint(pt,original.pts[index])){draft[j]={...draft[j],x:deltaPts[k].x,y:deltaPts[k].y};touched=true;}
      }));
      if(touched)changes.set(other.id,draft);
    });
    return changes;
  }
  function v211ValidateZoneEdits(changes, layout=appState.layout){
    if(!changes || !changes.size)return {id:'INVALIDA',reason:'invalid',name:'Sin geometría'};
    const trial={...layout,zones:layout.zones.map(z=>changes.has(z.id)?{...z,pts:changes.get(z.id)}:z)};
    for(const [id,pts] of changes){const violation=v209ZoneViolation(id,pts,trial);if(violation)return violation;}
    return null;
  }
  function v211ApplyZoneEdits(changes){
    for(const [id,pts] of changes){const z=findZoneById(id);if(z)z.pts=clone(pts);}
  }
  function v211TrySharedZoneMove(zoneId,indices,nextPts,originalZones){
    let changes=v211SharedVertexEdits(zoneId,indices,nextPts,originalZones);
    if(typeof v212ZoneChanges==='function'){const original=originalZones.find(z=>z.id===zoneId);if(original){const next=clone(original.pts);indices.forEach((i,k)=>next[i]=nextPts[k]);changes=v212ZoneChanges(original,next,originalZones);}}
    const locked=[...changes.keys()].find(id=>findZoneById(id)?.locked);
    if(locked){showToast('Hay una zona bloqueada en el límite compartido.','warning');return false;}
    const problem=v211ValidateZoneEdits(changes);
    if(!problem){v211ApplyZoneEdits(changes);clearZoneCollisionPreview();return true;}
    setZoneCollisionPreview(zoneId,problem,changes?.get(zoneId));return false;
  }
  function v211MergePolygons(a,b){
    // Unión de polígonos colindantes mediante eliminación de aristas opuestas.
    // Se fragmentan los segmentos en los vértices intermedios del vecino.
    if(!v209SimplePolygon(a)||!v209SimplePolygon(b)||zonePolygonsOverlap(a,b))return null;
    const signed=pts=>pts.reduce((s,p,i)=>s+p.x*pts[(i+1)%pts.length].y-pts[(i+1)%pts.length].x*p.y,0)/2;
    const ordered=pts=>signed(pts)>=0?pts:[...pts].reverse();
    const pa=ordered(a),pb=ordered(b), all=[...pa,...pb];
    const key=p=>`${Math.round(p.x*1000)/1000},${Math.round(p.y*1000)/1000}`;
    const edges=[];
    for(const poly of [pa,pb])for(let i=0;i<poly.length;i++){
      const start=poly[i],end=poly[(i+1)%poly.length],vx=end.x-start.x,vy=end.y-start.y,den=vx*vx+vy*vy;
      const ts=[0,1];
      all.forEach(pt=>{if(v209PointOnSegment(pt,start,end,.08)){
        const t=((pt.x-start.x)*vx+(pt.y-start.y)*vy)/den;
        if(t>.000001 && t<.999999)ts.push(t);
      }});
      ts.sort((x,y)=>x-y);
      for(let j=0;j<ts.length-1;j++){
        if(ts[j+1]-ts[j]<1e-6)continue;
        const aa={x:start.x+vx*ts[j],y:start.y+vy*ts[j]},bb={x:start.x+vx*ts[j+1],y:start.y+vy*ts[j+1]};
        edges.push({a:aa,b:bb,ak:key(aa),bk:key(bb)});
      }
    }
    const map=new Map();let matched=0;
    edges.forEach(e=>{const dir=e.ak+'>'+e.bk,reverse=e.bk+'>'+e.ak;
      if(map.has(reverse)){map.delete(reverse);matched++;}else map.set(dir,e);
    });
    if(!matched)return null;
    const remaining=[...map.values()],starts=new Map();
    remaining.forEach(e=>{if(!starts.has(e.ak))starts.set(e.ak,[]);starts.get(e.ak).push(e);});
    if(remaining.some(e=>starts.get(e.ak).length!==1))return null;
    let current=remaining[0],result=[],seen=new Set(),first=current.ak;
    while(current && !seen.has(current.ak)){
      seen.add(current.ak);result.push(current.a);
      const n=current.bk;if(n===first)break;
      current=starts.get(n)?.[0];
    }
    if(!current||current.bk!==first||result.length<3||seen.size!==remaining.length)return null;
    result=result.filter((pt,i)=>!v211SamePoint(pt,result[(i+1)%result.length]));
    // No guardar vértices intermedios colineales ni figuras autointersecadas.
    const cleaned=result.filter((p,i)=>{
      const prev=result[(i-1+result.length)%result.length],next=result[(i+1)%result.length];
      return Math.abs((p.x-prev.x)*(next.y-p.y)-(p.y-prev.y)*(next.x-p.x))>0.00001;
    });
    if(!v209SimplePolygon(cleaned))return null;
    if(Math.abs(polygonAreaAbs(cleaned)-polygonAreaAbs(a)-polygonAreaAbs(b))>.02)return null;
    return cleaned;
  }
  function v211MergeZones(baseId,otherId){
    if(findZoneById(baseId)?.locked||findZoneById(otherId)?.locked){showToast('Desbloquea ambas zonas antes de fusionarlas.','warning');return false;}
    const base=findZoneById(baseId),other=findZoneById(otherId);if(!base||!other||base===other)return false;
    if(isRoomLinkedZone(base)||isRoomLinkedZone(other)){showToast('Desvincula las zonas de recintos físicos antes de unirlas.','warning',3000);return false;}
    const merged=v211MergePolygons(base.pts,other.pts);
    if(!merged){showToast('Solo se pueden unir zonas colindantes que compartan una arista y formen un único perímetro válido.','warning',3500);return false;}
    const trial={...appState.layout,zones:appState.layout.zones.filter(z=>z.id!==otherId)};
    const violation=v209ZoneViolation(base.id,merged,trial);
    if(violation){showToast(`No se pueden fusionar: ${violation.name||violation.reason}.`,'warning',3200);return false;}
    recordHistorySnapshot('structure');v211DetachPhysicalWallReferences(baseId);v211DetachPhysicalWallReferences(otherId);base.pts=merged;
    appState.layout.zones=appState.layout.zones.filter(z=>z.id!==otherId);
    appState.layout.racks.forEach(r=>{if(r.zoneId===otherId)r.zoneId=baseId;});
    (appState.layout.rooms||[]).forEach(r=>{if(r.zoneId===otherId)delete r.zoneId;});
    appState.selectedZoneId=baseId;appState.selectedVertex={zoneId:'',idx:-1};appState.selectedEdge={zoneId:'',a:-1,b:-1};
    persistActiveLayout();renderLayoutEditor();showToast('Zonas unidas; los racks y SKU mantienen sus identificadores.','success',2700);
    return true;
  }
  function clearZoneCollisionPreview(){ if(appState.editor) appState.editor.zoneCollisionPreview=null; }
  function setZoneCollisionPreview(zoneId, other, pts=null){
    if(!appState.editor) return;
    appState.editor.zoneCollisionPreview={zoneId,otherZoneId:other?.id||'',message:other?`No se puede superponer con ${other.name||other.id}.`:'Las zonas no pueden superponerse.',pts:Array.isArray(pts)?pts.map(p=>({...p})):null};
  }
  function zoneOwnTopologyIds(zoneId=''){
    const zone=findZoneById(zoneId), room=zone?.linkedRoomId?findRoomById(zone.linkedRoomId):null; const nodeIds=new Set(room?.nodeIds||[]), wallIds=new Set();
    if(room) roomWallEdges(room).forEach(e=>{if(e.wall?.id)wallIds.add(e.wall.id);});
    return {nodeIds,wallIds};
  }
  function zoneTargetSegments(excludeZoneId=''){
    const out=[], own=zoneOwnTopologyIds(excludeZoneId);
    (appState.layout?.zones||[]).forEach(z=>{
      if(z.id===excludeZoneId||!Array.isArray(z.pts)) return;
      for(let i=0;i<z.pts.length;i++) out.push({a:z.pts[i],b:z.pts[(i+1)%z.pts.length],kind:'zone-edge',label:`Borde ${z.name||z.id}`,zoneId:z.id});
    });
    (appState.layout?.walls||[]).filter(w=>wallLength(w)>2&&!own.wallIds.has(w.id)).forEach(w=>out.push({a:{x:Number(w.x1||0),y:Number(w.y1||0)},b:{x:Number(w.x2||0),y:Number(w.y2||0)},kind:'wall-edge',label:`Muro ${w.id}`,wallId:w.id}));
    return out;
  }
  function zoneTargetPoints(excludeZoneId=''){
    const out=[], own=zoneOwnTopologyIds(excludeZoneId);
    (appState.layout?.zones||[]).forEach(z=>{
      if(z.id===excludeZoneId) return;
      (z.pts||[]).forEach((p,i)=>out.push({x:p.x,y:p.y,label:`Vértice ${z.name||z.id}`,zoneId:z.id,idx:i}));
      (z.pts||[]).forEach((p,i)=>{ const b=z.pts[(i+1)%z.pts.length]; if(b) out.push({x:(p.x+b.x)/2,y:(p.y+b.y)/2,label:`Centro borde ${z.name||z.id}`,zoneId:z.id}); });
    });
    (appState.layout?.wallNodes||[]).forEach(n=>{if(!own.nodeIds.has(n.id))out.push({x:Number(n.x||0),y:Number(n.y||0),label:`Nodo ${n.id}`,nodeId:n.id});});
    (appState.layout?.walls||[]).filter(w=>wallLength(w)>2&&!own.wallIds.has(w.id)).forEach(w=>out.push({x:(Number(w.x1)+Number(w.x2))/2,y:(Number(w.y1)+Number(w.y2))/2,label:`Centro ${w.id}`,wallId:w.id}));
    return out;
  }
  function snapZoneTranslation(zone, originalPts, dx, dy){
    const baseDx=snapGrid(dx), baseDy=snapGrid(dy), threshold=Math.max(6,Math.min(30,getSnapSize()*4.2));
    let best=null;
    const moving=(originalPts||[]).map(p=>({x:p.x+baseDx,y:p.y+baseDy}));
    zoneTargetPoints(zone?.id||'').forEach(t=>moving.forEach(p=>{
      const vx=t.x-p.x, vy=t.y-p.y, dist=Math.hypot(vx,vy);
      if(dist<=threshold && (!best||dist<best.score)) best={score:dist,dx:baseDx+vx,dy:baseDy+vy,label:t.label,point:{x:t.x,y:t.y},kind:'point'};
    }));
    zoneTargetSegments(zone?.id||'').forEach(seg=>{
      const tx=seg.b.x-seg.a.x, ty=seg.b.y-seg.a.y, tl=Math.hypot(tx,ty)||1, ux=tx/tl, uy=ty/tl, nx=-uy, ny=ux;
      moving.forEach((a,i)=>{
        const b=moving[(i+1)%moving.length]; if(!b) return;
        const mx=b.x-a.x,my=b.y-a.y,ml=Math.hypot(mx,my)||1, dot=Math.abs((mx/ml)*ux+(my/ml)*uy); if(dot<Math.cos(6*Math.PI/180)) return;
        const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2}; const signed=(mid.x-seg.a.x)*nx+(mid.y-seg.a.y)*ny; if(Math.abs(signed)>threshold) return;
        const projA=(a.x-seg.a.x)*ux+(a.y-seg.a.y)*uy, projB=(b.x-seg.a.x)*ux+(b.y-seg.a.y)*uy; const lo=Math.min(projA,projB), hi=Math.max(projA,projB); if(hi< -threshold || lo>tl+threshold) return;
        const overlap=Math.max(0,Math.min(hi,tl)-Math.max(lo,0));
        const cx=-nx*signed, cy=-ny*signed, score=Math.abs(signed)*.44-Math.min(overlap,100)*.012;
        if(!best||score<best.score) best={score,dx:baseDx+cx,dy:baseDy+cy,label:overlap>Math.min(ml,tl)*.8?`Muro coincidente · ${seg.label}`:seg.label,point:{x:mid.x+cx,y:mid.y+cy},kind:seg.kind,target:seg,overlap};
      });
    });
    const result=best||{dx:baseDx,dy:baseDy,label:'Rejilla',point:null,kind:'grid'};
    if(appState.editor) appState.editor.geometrySnapPreview=result.kind==='grid'?null:result;
    return result;
  }
  function roomCandidatePoints(room, originalNodes, dx, dy){
    return (room?.nodeIds||[]).map(id=>originalNodes?.[id]?{x:originalNodes[id].x+dx,y:originalNodes[id].y+dy}:null).filter(Boolean);
  }
  function affectedZoneIdsForNodes(nodeIds, layout=appState.layout){
    const ids=new Set(nodeIds||[]), out=[];
    (layout?.zones||[]).forEach(z=>{ const room=z.linkedRoomId?findRoomById(z.linkedRoomId,layout):null; if(room&&(room.nodeIds||[]).some(id=>ids.has(id))) out.push(z.id); });
    return out;
  }
  function trySetWallNodesPositionsBulk(items, layout=appState.layout, {silent=true}={}){
    if(typeof v214NodesBound==='function'&&v214NodesBound(items,layout)){if(!silent)showToast('Modifica los vértices del Área comercial para mover sus muros vinculados.','warning');return false;}
    if(!layout||!Array.isArray(layout.wallNodes)) return false;
    const ids=(items||[]).map(i=>i.id).filter(Boolean), affected=affectedZoneIdsForNodes(ids,layout);
    const map=new Map(layout.wallNodes.map(n=>[n.id,n])); const original=ids.map(id=>{const n=map.get(id);return n?{id,x:n.x,y:n.y}:null;}).filter(Boolean);
    setWallNodesPositionsBulk(items,layout);
    let hit=null, hitZone='';
    for(const zid of affected){ const z=(layout.zones||[]).find(x=>x.id===zid); const other=z?findZoneOverlap(z.id,z.pts,layout):null; if(other){hit=other;hitZone=z.id;break;} }
    if(hit){ setWallNodesPositionsBulk(original,layout); setZoneCollisionPreview(hitZone,hit); if(!silent) showToast(`Movimiento bloqueado: ${hitZone} no puede superponerse con ${hit.name||hit.id}.`,'warning',2400); return false; }
    clearZoneCollisionPreview(); return true;
  }
  function snapWallNodeSetTranslation(nodeIds, originalNodes, dx, dy, movingWallIds=[]){
    const threshold=Math.max(6,Math.min(26,getSnapSize()*3.8)); let best=null; const movingSet=new Set(nodeIds||[]), wallSet=new Set(movingWallIds||[]);
    const pts=(nodeIds||[]).map(id=>originalNodes?.[id]?{id,x:originalNodes[id].x+dx,y:originalNodes[id].y+dy}:null).filter(Boolean);
    const targets=[]; (appState.layout?.wallNodes||[]).forEach(n=>{if(!movingSet.has(n.id))targets.push({x:n.x,y:n.y,label:`Nodo ${n.id}`});});
    (appState.layout?.zones||[]).forEach(z=>(z.pts||[]).forEach(p=>targets.push({x:p.x,y:p.y,label:`Zona ${z.id}`})));
    targets.forEach(t=>pts.forEach(p=>{const vx=t.x-p.x,vy=t.y-p.y,d=Math.hypot(vx,vy);if(d<=threshold&&(!best||d<best.score))best={score:d,dx:dx+vx,dy:dy+vy,label:t.label,point:{x:t.x,y:t.y}};}));
    (appState.layout?.walls||[]).filter(w=>!wallSet.has(w.id)&&wallLength(w)>2).forEach(w=>{
      const a={x:Number(w.x1||0),y:Number(w.y1||0)},b={x:Number(w.x2||0),y:Number(w.y2||0)};
      pts.forEach(p=>{const pr=projectPointToSegment(p,a,b),dist=Math.hypot(pr.x-p.x,pr.y-p.y);if(dist<=threshold*.75&&(!best||dist<best.score))best={score:dist,dx:dx+(pr.x-p.x),dy:dy+(pr.y-p.y),label:`Muro ${w.id}`,point:pr};});
    });
    if(best && appState.editor) appState.editor.geometrySnapPreview={...best,kind:'wall'}; else if(appState.editor) appState.editor.geometrySnapPreview=null;
    return best||{dx,dy,label:'Rejilla',point:null};
  }

  function nextRoomZoneName(room){
    const idx = Math.max(1,(appState.layout?.zones||[]).length+1);
    const base = String(room?.name || '').replace(/^Recinto\s*/i,'').trim();
    return base ? `Zona ${base}` : `Zona ${idx}`;
  }
  function convertRoomToZone(roomOrId){
    ensureWallTopology();
    const room = typeof roomOrId === 'string' ? findRoomById(roomOrId) : roomOrId;
    if(!room) return null;
    const existing = getRoomLinkedZone(room);
    if(existing){ appState.selectedZoneId=existing.id; appState.selectedRoomId=room.id; return existing; }
    const pts = roomPointsRaw(room, appState.layout);
    if(pts.length < 3 || polygonAreaAbs(pts) < 10) return null;
    const id = nextZoneId();
    const palette = Array.isArray(ZONE_COLOR_PALETTE) && ZONE_COLOR_PALETTE.length ? ZONE_COLOR_PALETTE : ['#6ff0a8','#6fa8ff','#ffd66f'];
    const zone = {
      id, kind:'virtual', name:nextRoomZoneName(room), color:palette[(appState.layout.zones||[]).length % palette.length], pts:pts.map(p=>({...p})),
      sourceRoomId:room.id, edgeWalls:{}, source:'room-snapshot'
    };
    const collision=findZoneOverlap('',zone.pts);
    if(collision){ showToast(`No se puede crear la zona: el recinto se superpone con ${collision.name||collision.id}.`,'warning',2800); return null; }
    appState.layout.zones.push(zone);
    appState.selectedRoomId=room.id;
    appState.selectedZoneId=id;
    appState.selectedWallId=''; appState.selectedOpeningId=''; appState.selectedRackLayoutId='';
    normalizeZoneAndRackIds();
    persistActiveLayout();
    showToast(`${room.name} convertido en zona virtual. Los muros físicos no quedarán vinculados a sus límites.`, 'success', 3200);
    return zone;
  }
  function detachRoomZone(zoneOrId){
    const zone = typeof zoneOrId === 'string' ? findZoneById(zoneOrId) : zoneOrId;
    if(!zone?.linkedRoomId) return false;
    const room=findRoomById(zone.linkedRoomId);
    if(room && room.zoneId===zone.id) delete room.zoneId;
    delete zone.linkedRoomId; delete zone.dynamicFromRoom; delete zone.roomLinkBroken;
    zone.source='manual';
    persistActiveLayout();
    showToast('Zona desvinculada del recinto. Ahora puede editarse manualmente.', 'success', 2600);
    return true;
  }
  function polygonAreaAbs(pts){
    if(!Array.isArray(pts) || pts.length < 3) return 0;
    let sum=0; for(let i=0;i<pts.length;i++){ const a=pts[i], b=pts[(i+1)%pts.length]; sum += a.x*b.y-b.x*a.y; }
    return Math.abs(sum/2);
  }
  function createRoomFromWallChain(nodeIds){
    ensureWallTopology();
    const clean = (nodeIds || []).filter(Boolean);
    if(clean.length < 4 || clean[0] !== clean[clean.length-1]) return null;
    const unique = clean.slice(0,-1);
    if(new Set(unique).size < 3) return null;
    const pts = unique.map(id => getWallNode(id)).filter(Boolean);
    if(pts.length < 3 || polygonAreaAbs(pts) < 500) return null;
    const signature = unique.join('|');
    const reverseSignature = unique.slice().reverse().join('|');
    const exists = (appState.layout.rooms || []).some(r => {
      const sig=(r.nodeIds||[]).join('|'); return sig===signature || sig===reverseSignature;
    });
    if(exists) return null;
    const room = { id:nextRoomId(), name:`Recinto ${(appState.layout.rooms||[]).length+1}`, nodeIds:unique, kind:'room' };
    appState.layout.rooms.push(room);
    appState.selectedRoomId = room.id;
    return room;
  }
  function nextMeasurementId(){
    ensureWallTopology();
    const nums=(appState.layout.measurements||[]).map(m=>Number(String(m.id||'').replace(/\D+/g,''))).filter(Number.isFinite);
    return `M${Math.max(0,...nums)+1}`;
  }
  // CAD V202: las cotas guardan referencias geométricas, además de coordenadas de respaldo.
  // No se usa una posición desplazada como punto de medición: el desplazamiento es perpendicular.
  function cadMeasurementVertexId(point){
    if(!point) return '';
    if(!point.cadVertexId){
      const meta=appState.layout.meta || (appState.layout.meta={});
      meta.cadVertexSerial=Math.max(0,Number(meta.cadVertexSerial||0))+1;
      point.cadVertexId=`CADV-${meta.cadVertexSerial}`;
    }
    return point.cadVertexId;
  }
  function cadMeasurementPoint(ref, fallback){
    if(!ref || typeof ref!=='object') return fallback ? {x:Number(fallback.x||0),y:Number(fallback.y||0)} : null;
    let pt=null;
    if(ref.kind==='wall-node') pt=getWallNode(ref.id);
    if(ref.kind==='zone-vertex'){
      const zone=findZoneById(ref.id);
      pt=(zone?.pts||[]).find(p=>ref.vertexId && p.cadVertexId===ref.vertexId) || ((!ref.vertexId || (ref.vertexCount && zone?.pts?.length===ref.vertexCount && !(zone.pts||[]).some(p=>p.cadVertexId))) ? zone?.pts?.[ref.index] : null);
    }
    if(ref.kind==='site-vertex'){
      const sites=layoutBoundaryPts();
      pt=sites.find(p=>ref.vertexId && p.cadVertexId===ref.vertexId) || ((!ref.vertexId || (ref.vertexCount===sites.length && !sites.some(p=>p.cadVertexId))) ? sites[ref.index] : null);
    }
    if(ref.kind==='wall-edge'){
      const wall=findWallById(ref.id), t=Math.max(0,Math.min(1,Number(ref.t||0)));
      if(wall)pt={x:Number(wall.x1)+(Number(wall.x2)-Number(wall.x1))*t,y:Number(wall.y1)+(Number(wall.y2)-Number(wall.y1))*t};
    }
    if(ref.kind==='zone-edge' || ref.kind==='site-edge'){
      const pts=ref.kind==='zone-edge' ? (findZoneById(ref.id)?.pts||[]) : layoutBoundaryPts();
      const findCad=id=>id ? pts.find(v=>v.cadVertexId===id) : null;
      const aa=findCad(ref.vertexA) || (pts.length===ref.vertexCount?pts[ref.index]:null);
      const bb=findCad(ref.vertexB) || (pts.length===ref.vertexCount?pts[(ref.index+1)%pts.length]:null);
      if(aa && bb){const t=Math.max(0,Math.min(1,Number(ref.t||0)));pt={x:Number(aa.x)+(Number(bb.x)-Number(aa.x))*t,y:Number(aa.y)+(Number(bb.y)-Number(aa.y))*t};}
    }
    return pt && Number.isFinite(Number(pt.x)) && Number.isFinite(Number(pt.y))
      ? {x:Number(pt.x),y:Number(pt.y)}
      : fallback ? {x:Number(fallback.x||0),y:Number(fallback.y||0)} : null;
  }
  function cadMeasurementEnds(measure){
    return {a:cadMeasurementPoint(measure.aRef,measure.a),b:cadMeasurementPoint(measure.bRef,measure.b)};
  }
  function cadMeasurementAnchor(point){
    const targets=[];
    const push=(pt,ref,priority=1)=>{if(pt && Number.isFinite(Number(pt.x)) && Number.isFinite(Number(pt.y)))targets.push({point:pt,ref,priority});};
    (appState.layout?.wallNodes||[]).forEach(n=>push(n,{kind:'wall-node',id:n.id},1));
    (appState.layout?.zones||[]).forEach(z=>(z.pts||[]).forEach((pt,i)=>push(pt,{kind:'zone-vertex',id:z.id,index:i,vertexCount:z.pts.length},z.linkedRoomId?2:0)));
    layoutBoundaryPts().forEach((pt,i)=>push(pt,{kind:'site-vertex',index:i,vertexCount:layoutBoundaryPts().length},3));
    let best=null;
    const threshold=Math.max(9,Math.min(23,getSnapSize()*4));
    targets.forEach(t=>{
      const d=Math.hypot(Number(t.point.x)-point.x,Number(t.point.y)-point.y);
      if(d<=threshold && (!best || d<best.d-.1 || (Math.abs(d-best.d)<.1 && t.priority<best.priority))) best={...t,d};
    });
    if(!best){
      // Si el usuario elige un punto cualquiera de una arista, también queda
      // referenciado paramétricamente en lugar de guardar coordenadas estáticas.
      let edge=null;
      const consider=(a,b,ref)=>{
        const proj=projectPointToSegment(point,a,b);
        const d=Math.hypot(proj.x-point.x,proj.y-point.y);
        if(d<=Math.max(7,Math.min(16,getSnapSize()*3)) && (!edge || d<edge.d)) edge={point:{x:proj.x,y:proj.y},ref,d,a,b};
      };
      (appState.layout?.walls||[]).forEach(w=>{
        if(w.autoZoneEdge) return;
        consider({x:Number(w.x1),y:Number(w.y1)},{x:Number(w.x2),y:Number(w.y2)},{kind:'wall-edge',id:w.id});
      });
      (appState.layout?.zones||[]).forEach(z=>(z.pts||[]).forEach((a,i)=>{
        const b=z.pts[(i+1)%z.pts.length];if(b)consider(a,b,{kind:'zone-edge',id:z.id,index:i,vertexCount:z.pts.length});
      }));
      const sites=layoutBoundaryPts();sites.forEach((a,i)=>{
        const b=sites[(i+1)%sites.length];if(b)consider(a,b,{kind:'site-edge',index:i,vertexCount:sites.length});
      });
      if(edge){
        const ref={...edge.ref};
        if(ref.kind==='zone-edge'||ref.kind==='site-edge'){ref.vertexA=cadMeasurementVertexId(edge.a);ref.vertexB=cadMeasurementVertexId(edge.b);}
        const a=ref.kind==='wall-edge'?{x:findWallById(ref.id).x1,y:findWallById(ref.id).y1}:ref.kind==='zone-edge'?findZoneById(ref.id).pts[ref.index]:sites[ref.index];
        const b=ref.kind==='wall-edge'?{x:findWallById(ref.id).x2,y:findWallById(ref.id).y2}:ref.kind==='zone-edge'?findZoneById(ref.id).pts[(ref.index+1)%findZoneById(ref.id).pts.length]:sites[(ref.index+1)%sites.length];
        const den=(b.x-a.x)**2+(b.y-a.y)**2;
        ref.t=den?Math.max(0,Math.min(1,((edge.point.x-a.x)*(b.x-a.x)+(edge.point.y-a.y)*(b.y-a.y))/den)):0;
        return {point:edge.point,ref};
      }
      return {point:{x:point.x,y:point.y},ref:null};
    }
    const ref={...best.ref};
    if(ref.kind==='zone-vertex' || ref.kind==='site-vertex')ref.vertexId=cadMeasurementVertexId(best.point);
    return {point:{x:Number(best.point.x),y:Number(best.point.y)},ref};
  }
  function cadMeasureNormal(a,b){
    const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
    return {x:-dy/len,y:dx/len,length:len};
  }
  function cadMeasureOffset(a,b,cursor){
    const n=cadMeasureNormal(a,b);
    return (cursor.x-a.x)*n.x+(cursor.y-a.y)*n.y;
  }
  function cadMeasureShape(layer,a,b,offset,{selected=false,preview=false,measureId=''}={}){
    const n=cadMeasureNormal(a,b); if(n.length<.01)return null;
    const off=Number.isFinite(Number(offset))?Number(offset):26;
    const start={x:a.x+n.x*off,y:a.y+n.y*off},end={x:b.x+n.x*off,y:b.y+n.y*off};
    const color=preview?'#d59238':selected?'#c47d29':'#a77b42';
    const group=svgEl('g',{class:'cad-associative-measurement', 'data-measurement-id':measureId||'',style:'pointer-events:none'});
    [a,b].forEach((pt,i)=>{
      const dim=i?end:start;
      const extension=svgEl('line',{x1:pt.x,y1:pt.y,x2:dim.x+n.x*Math.sign(off||1)*9,y2:dim.y+n.y*Math.sign(off||1)*9,stroke:color,'stroke-width':'1.1','stroke-dasharray':'3 2','vector-effect':'non-scaling-stroke'});
      group.appendChild(extension);
      if(selected||preview)group.appendChild(svgEl('circle',{cx:pt.x,cy:pt.y,r:'3.6',fill:'#fffaf0',stroke:color,'stroke-width':'1.3'}));
    });
    group.appendChild(svgEl('line',{x1:start.x,y1:start.y,x2:end.x,y2:end.y,stroke:color,'stroke-width':selected?'2.1':'1.6','vector-effect':'non-scaling-stroke'}));
    const ux=(b.x-a.x)/n.length,uy=(b.y-a.y)/n.length;
    [start,end].forEach(pt=>group.appendChild(svgEl('line',{x1:pt.x-n.x*4-ux*4,y1:pt.y-n.y*4-uy*4,x2:pt.x+n.x*4+ux*4,y2:pt.y+n.y*4+uy*4,stroke:color,'stroke-width':'1.45','vector-effect':'non-scaling-stroke'})));
    const mid={x:(start.x+end.x)/2,y:(start.y+end.y)/2};
    const angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
    const readable=angle>90?angle-180:angle< -90?angle+180:angle;
    const label=svgEl('text',{x:mid.x+n.x*12,y:mid.y+n.y*12,class:'layout-measure-text'+(preview?' active':''),'text-anchor':'middle','dominant-baseline':'central',transform:`rotate(${readable} ${mid.x+n.x*12} ${mid.y+n.y*12})`,style:'pointer-events:none;paint-order:stroke fill;stroke:#fcf5e9;stroke-width:3px;stroke-linejoin:round;fill:#865a28;font-weight:800'});
    label.textContent=formatDistanceCm(n.length);
    group.appendChild(label);
    layer.appendChild(group);
    return {start,end,mid,normal:n,group};
  }
  function cadMeasureSelectAndDrag(evt,measure){
    if(appState.editor.mode!=='select') return;
    evt.preventDefault();evt.stopPropagation();
    appState.editor.selectedMeasurementId=measure.id;
    const svg=$('#layoutSvg');
    const {a,b}=cadMeasurementEnds(measure);
    if(!a||!b)return;
    const prev=Number(measure.offset||0),historyBefore=snapshotForType('structure');let moved=false;
    const move=e=>{
      const point=svgPoint(e,svg),next=cadMeasureOffset(a,b,point);
      if(Math.abs(next-prev)>0.1)moved=true;
      measure.offset=Math.round(next*100)/100;
      renderLayoutSvg(svg);
    };
    const clear=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',cancel);};
    const finish=()=>{clear();if(moved){recordHistorySnapshot('structure',historyBefore);persistActiveLayout();}renderLayoutEditor();};
    const cancel=()=>{clear();measure.offset=prev;renderLayoutEditor();};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish,{once:true});window.addEventListener('pointercancel',cancel,{once:true});
    renderLayoutInspector();
  }
  function convexHull2D(points){
    const pts=(points||[]).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)).map(p=>({x:p.x,y:p.y}));
    if(pts.length<=3) return pts;
    pts.sort((a,b)=>a.x===b.x?a.y-b.y:a.x-b.x);
    const cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
    const lower=[]; for(const p of pts){ while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],p)<=0) lower.pop(); lower.push(p); }
    const upper=[]; for(let i=pts.length-1;i>=0;i--){ const p=pts[i]; while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],p)<=0) upper.pop(); upper.push(p); }
    lower.pop(); upper.pop(); return lower.concat(upper);
  }
  function getManualWallNodeJointPolygons(){
    ensureWallTopology();
    const joints=[];
    (appState.layout.wallNodes || []).forEach(node => {
      const connected=wallsForNode(node.id).filter(w=>wallLength(w)>2);
      if(connected.length<3) return; // V210: degree-two corners use exact paired-face miters
      const pts=[];
      connected.forEach(w=>{
        const slice=getWallRawSlicePolygon(w,0,1,1);
        if(!slice?.poly)return;
        const atStart=w.startNodeId===node.id;
        const ends=atStart?[slice.poly[0],slice.poly[3]]:[slice.poly[1],slice.poly[2]];
        pts.push(...ends);
      });
      const poly=convexHull2D(pts);
      if(poly.length>=3) joints.push({ nodeId:node.id, poly, selected:connected.some(w=>w.id===appState.selectedWallId), height:Math.max(...connected.map(w=>Number(w.height||appState.layout?.meta?.defaultWallHeight||290)||290)) });
    });
    return joints;
  }
  function collectWallSnapTargets(){
    ensureWallTopology();
    const out=[];
    (appState.layout.wallNodes||[]).forEach(n=>out.push({x:n.x,y:n.y,type:'endpoint',label:'Extremo',nodeId:n.id,priority:0}));
    (appState.layout.zones||[]).forEach(z=>{
      (z.pts||[]).forEach((pt,i)=>{
        out.push({x:pt.x,y:pt.y,type:'zone',label:`Vértice ${z.id}`,priority:4});
        const b=z.pts[(i+1)%z.pts.length]; if(b) out.push({x:(pt.x+b.x)/2,y:(pt.y+b.y)/2,type:'zone-mid',label:`Centro borde ${z.id}`,priority:5});
      });
    });
    const walls=(appState.layout.walls||[]).filter(w=>wallLength(w)>2);
    walls.forEach(w=>out.push({x:(Number(w.x1)+Number(w.x2))/2,y:(Number(w.y1)+Number(w.y2))/2,type:'midpoint',label:'Centro',priority:3}));
    for(let i=0;i<walls.length;i++) for(let j=i+1;j<walls.length;j++){
      const a=walls[i],b=walls[j];
      const hit=lineIntersection2D({x:a.x1,y:a.y1},{x:a.x2,y:a.y2},{x:b.x1,y:b.y1},{x:b.x2,y:b.y2});
      if(!hit) continue;
      const pa=projectPointToSegment(hit,{x:a.x1,y:a.y1},{x:a.x2,y:a.y2});
      const pb=projectPointToSegment(hit,{x:b.x1,y:b.y1},{x:b.x2,y:b.y2});
      if(pointDist2D(hit,pa)<1.5 && pointDist2D(hit,pb)<1.5) out.push({...hit,type:'intersection',label:'Intersección',priority:0});
    }
    return out;
  }
  function snapWallPointSmart(point,{origin=null,shiftKey=false,excludeNodeId=''}={}){
    let x=isSnapEnabled()?snapGrid(point.x):point.x, y=isSnapEnabled()?snapGrid(point.y):point.y, type='grid', label='Rejilla', nodeId='';
    let forcedOrthoAxis='';
    if(origin){
      const dx=x-origin.x, dy=y-origin.y;
      if(Math.hypot(dx,dy)>1){
        const ang=Math.atan2(dy,dx)*180/Math.PI;
        const horizontalDistance=Math.min(Math.abs(ang),Math.abs(Math.abs(ang)-180));
        const verticalDistance=Math.abs(Math.abs(ang)-90);
        if(shiftKey || appState.editor?.orthoEnabled || horizontalDistance<=7 || verticalDistance<=7){
          if((shiftKey || appState.editor?.orthoEnabled) ? Math.abs(dx)>=Math.abs(dy) : horizontalDistance<=verticalDistance){ y=origin.y; if(shiftKey||appState.editor?.orthoEnabled)forcedOrthoAxis='x'; type='ortho'; label='Horizontal'; }
          else { x=origin.x; if(shiftKey||appState.editor?.orthoEnabled)forcedOrthoAxis='y'; type='ortho'; label='Vertical'; }
        }
      }
    }
    if(!isSnapEnabled()) return {x,y,type,label,nodeId};
    const threshold=Math.max(7,Math.min(24,getSnapSize()*3.2));
    let best=null;
    collectWallSnapTargets().forEach(t=>{
      if(excludeNodeId && t.nodeId===excludeNodeId) return;
      const d=Math.hypot(t.x-x,t.y-y);
      if(d<=threshold && (!best || t.priority<best.priority || (t.priority===best.priority&&d<best.d))) best={...t,d};
    });
    if(best){ x=best.x; y=best.y; type=best.type; label=(best.nodeId && best.nodeId===appState.editor.wallChainStartNodeId && appState.editor.wallChainNodeIds?.length>=3)?'Cerrar':best.label; nodeId=best.nodeId||''; }
    else {
      const targets=collectWallSnapTargets(); let alignX=null,alignY=null;
      targets.forEach(t=>{ const ax=Math.abs(t.x-x), ay=Math.abs(t.y-y); if(ax<=threshold*.58&&(!alignX||ax<alignX.d))alignX={d:ax,x:t.x,label:t.label}; if(ay<=threshold*.58&&(!alignY||ay<alignY.d))alignY={d:ay,y:t.y,label:t.label}; });
      if(alignX){x=alignX.x;type='alignment';label=`Alinear X · ${alignX.label}`;} if(alignY){y=alignY.y;type='alignment';label=`Alinear Y · ${alignY.label}`;}
      let edgeBest=null;
      const considerEdge=(a,b,edgeLabel)=>{ const proj=projectPointToSegment({x,y},a,b); const d=Math.hypot(proj.x-x,proj.y-y); if(d<=threshold*.72&&(!edgeBest||d<edgeBest.d))edgeBest={...proj,d,label:edgeLabel}; };
      (appState.layout.walls||[]).forEach(w=>considerEdge({x:Number(w.x1||0),y:Number(w.y1||0)},{x:Number(w.x2||0),y:Number(w.y2||0)},`Muro ${w.id}`));
      (appState.layout.zones||[]).forEach(z=>(z.pts||[]).forEach((a,i)=>{const b=z.pts[(i+1)%z.pts.length];if(b)considerEdge(a,b,`Borde ${z.id}`);}));
      if(edgeBest){ x=edgeBest.x; y=edgeBest.y; type='perpendicular'; label=edgeBest.label; }
      else {
        let extensionBest=null;
        (appState.layout.walls||[]).filter(w=>wallLength(w)>2).forEach(w=>{
          const a={x:Number(w.x1||0),y:Number(w.y1||0)},b={x:Number(w.x2||0),y:Number(w.y2||0)},dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy||1;
          const t=((x-a.x)*dx+(y-a.y)*dy)/den; if(t>=0&&t<=1) return;
          const q={x:a.x+dx*t,y:a.y+dy*t},dist=Math.hypot(q.x-x,q.y-y),endDist=Math.min(Math.hypot(q.x-a.x,q.y-a.y),Math.hypot(q.x-b.x,q.y-b.y));
          if(dist<=threshold*.65&&endDist<=threshold*4&&(!extensionBest||dist<extensionBest.d))extensionBest={...q,d:dist,label:`Prolongación ${w.id}`};
        });
        if(extensionBest){x=extensionBest.x;y=extensionBest.y;type='extension';label=extensionBest.label;}
      }
    }
    if(origin && forcedOrthoAxis){
      const originalX=x,originalY=y;
      if(forcedOrthoAxis==='x') y=origin.y;
      else x=origin.x;
      if(Math.hypot(originalX-x,originalY-y)>.01)nodeId='';
    }
    return {x,y,type,label,nodeId};
  }
  function cancelLayoutDrawing({render=true}={}){
    if(appState.editor){appState.editor.polygonDraft=null;appState.editor.streetDraft=null;}
    if(!appState.editor) return;
    appState.editor.rackAlignMode='';appState.editor.rackAlignVertexA=null;appState.editor.rackAlignTargetId='';appState.editor.areaMoveMode=false;
    appState.editor.pendingWallPoint=null;
    appState.editor.wallCursor=null;
    appState.editor.wallChainNodeIds=[];
    appState.editor.wallChainStartNodeId='';
    appState.editor.wallLengthDraft='';
    appState.editor.measureDraft=null;
    if(['wall','door','opening','measure','zone','polygon','street','street-path'].includes(appState.editor.mode)) appState.editor.mode='select';
    if(render&&isLayoutWorkspaceScreen())renderLayoutEditor();
  }
  function commitWallLengthFromHud(value){
    if(appState.editor.mode!=='wall' || !appState.editor.pendingWallPoint) return false;
    const rawCm=Number(value);
    if(!Number.isFinite(rawCm) || rawCm<=0) return false;
    const units=rawCm/Math.max(.0001,getScaleCmPerUnit());
    const start=appState.editor.pendingWallPoint;
    const cursor=appState.editor.wallCursor || {x:start.x+100,y:start.y};
    const dx=cursor.x-start.x, dy=cursor.y-start.y, len=Math.hypot(dx,dy)||1;
    const end={x:start.x+(dx/len)*units,y:start.y+(dy/len)*units};
    completeWallChainPoint(end, {numeric:true});
    return true;
  }
  function completeWallChainPoint(rawPoint, opts={}){
    ensureWallTopology();v128RebuildSharedWallRegistry();
    const pending=appState.editor.pendingWallPoint;
    if(!pending) return null;
    const snap=opts.numeric ? {x:Number(rawPoint.x||0),y:Number(rawPoint.y||0),type:'numeric',label:'Medida exacta',nodeId:''} : snapWallPointSmart(rawPoint,{origin:pending,shiftKey:!!opts.shiftKey});
    if(Math.hypot(snap.x-pending.x,snap.y-pending.y)<10){showToast('El tramo debe medir al menos '+formatDistanceCm(10)+'.','warning');return null;}
    recordHistorySnapshot('structure');
    let endNode=snap.nodeId ? getWallNode(snap.nodeId) : null;
    if(!endNode) endNode=findOrCreateWallNode(snap);
    const startNode=getWallNode(pending.nodeId) || findOrCreateWallNode(pending,pending.nodeId);
    if(!startNode || !endNode || startNode.id===endNode.id) return null;
    if(!appState.editor.wallChainStartNodeId)appState.editor.wallChainStartNodeId=startNode.id;
    const wall=createWallSegment(startNode,endNode,{startNodeId:startNode.id,endNodeId:endNode.id});
    if(!wall) return null;
    const v117Splits = v117ResolveWallIntersections();
    const chain=appState.editor.wallChainNodeIds || [];
    if(!chain.length) chain.push(startNode.id);
    chain.push(endNode.id);
    appState.editor.wallChainNodeIds=chain;
    const closed=appState.editor.wallChainStartNodeId && endNode.id===appState.editor.wallChainStartNodeId && chain.length>=4;
    if(closed){
      const room=createRoomFromWallChain(chain);
      v117RefreshRooms();
      appState.editor.pendingWallPoint=null; appState.editor.wallCursor=null; appState.editor.wallChainNodeIds=[]; appState.editor.wallChainStartNodeId=''; appState.editor.mode='select';
      if(room || v117Splits) showToast(room ? `Recinto cerrado: ${room.name}.` : 'Intersecciones resueltas y recintos actualizados.', 'success', 2200);
    }else{
      appState.editor.pendingWallPoint={x:endNode.x,y:endNode.y,nodeId:endNode.id};
      appState.editor.wallCursor={x:endNode.x+100,y:endNode.y,type:'grid',label:'Rejilla'};
    }
    appState.editor.wallLengthDraft='';
    v128RebuildSharedWallRegistry();
    persistActiveLayout('tramo de muro');
    renderLayoutEditor();
    return wall;
  }
  function startWallNodeDrag(e,nodeId){
    if(typeof v214WallGuard==='function'&&v214WallGuard((appState.layout.walls||[]).find(w=>(w.startNodeId===nodeId||w.endNodeId===nodeId)&&(w.areaBinding?.start||w.areaBinding?.end))))return;
    if(typeof v213LayerLocked==='function' && v213LayerLocked('walls'))return;
    if(!isStructureLayoutScreen() || appState.editor.mode!=='select') return;
    e.stopPropagation();
    ensureWallTopology();
    const node=getWallNode(nodeId); if(!node) return;
    const svg=$('#layoutSvg'), p=svgPoint(e,svg);
    appState.editor.dragging={type:'wall-node',nodeId,start:p,original:{x:node.x,y:node.y},historyBefore:snapshotForType('structure')};
    appState.selectedWallNodeId=nodeId; appState.selectedRoomId='';
    renderLayoutSvg(svg); renderLayoutInspector();
  }
  function startWallBodyDrag(e,wallId){
    if(typeof v214WallGuard==='function'&&v214WallGuard((appState.layout.walls||[]).find(w=>w.id===wallId)))return;
    if(typeof v213LayerLocked==='function' && v213LayerLocked('walls'))return;
    if(!isStructureLayoutScreen() || appState.editor.mode!=='select') return;
    e.stopPropagation(); ensureWallTopology();
    const wall=findWallById(wallId); if(!wall) return;
    if(wall.autoZoneEdge){ appState.selectedWallId=wall.id; renderLayoutEditor(); return; }
    if(e.shiftKey){ v117ToggleWallSelection(wall.id); renderLayoutEditor(); return; }
    const selected=v117GetSelectedWallIds(); if(!selected.includes(wall.id))v117SetSelectedWallIds([wall.id]);
    appState.selectedWallId=wall.id; appState.selectedOpeningId=''; appState.selectedRackLayoutId=''; appState.selectedRoomId='';
    const dragWalls=v117GetSelectedWallIds().map(findWallById).filter(w=>w&&!w.autoZoneEdge); const nodeIds=[...new Set(dragWalls.flatMap(w=>[w.startNodeId,w.endNodeId]).filter(Boolean))]; const originalNodes={}; nodeIds.forEach(id=>{const n=getWallNode(id);if(n)originalNodes[id]={x:n.x,y:n.y};});
    const svg=$('#layoutSvg'), p=svgPoint(e,svg);
    const historyBefore=snapshotForType('structure');
    appState.editor.dragging=dragWalls.length>1?{type:'wall-group',wallIds:dragWalls.map(w=>w.id),start:p,originalNodes,nodeIds,moved:false,historyBefore}:{type:'wall-body',wallId:wall.id,start:p,originalNodes,nodeIds,moved:false,historyBefore};
    appState.editor.wallMergePreview=null; renderLayoutSvg(svg); renderLayoutInspector();
  }
  function deleteLayoutSelection(){
    if(activeLayoutWorkspace()==='urbanism'&&typeof v221DeleteUrbanSelection==='function')return v221DeleteUrbanSelection();
    if(typeof v213SelectionLocked==='function'&&v213SelectionLocked()){showToast('Desbloquea la capa para eliminar el elemento.','warning');return;}
    const selectedIds=getSelectedRackIds(); const rid=appState.selectedRackLayoutId; const zid=appState.selectedZoneId;
    const oid=appState.selectedOpeningId; const wid=appState.selectedWallId; const mid=appState.editor?.selectedMeasurementId;
    if(isRackDistributionScreen()){
      if(selectedIds.length){ appState.layout.racks=appState.layout.racks.filter(r=>!selectedIds.includes(r.id)); clearRackSelection(); }
      else if(rid){ appState.layout.racks=appState.layout.racks.filter(r=>r.id!==rid); clearRackSelection(); }
    }else{
      if(mid){ appState.layout.measurements=(appState.layout.measurements||[]).filter(m=>m.id!==mid); appState.editor.selectedMeasurementId=''; }
      else if(oid){ appState.layout.openings=(appState.layout.openings||[]).filter(o=>o.id!==oid); appState.selectedOpeningId=''; }
      else if(v117GetSelectedWallIds().length>1){ v117DeleteSelectedWalls(); }
      else if(wid){
        const wall=findWallById(wid);
        if(wall?.autoZoneEdge){
          const zone=findZoneById(wall.zoneId); if(zone) removeZoneEdgeWall(zone,Number(wall.edgeIndex||0));
        }else {
          const aId=wall?.startNodeId, bId=wall?.endNodeId;
          appState.layout.walls=(appState.layout.walls||[]).filter(w=>w.id!==wid);
          if(aId&&bId){ appState.layout.rooms=(appState.layout.rooms||[]).filter(room=>{ const ids=room.nodeIds||[]; for(let i=0;i<ids.length;i++){ const a=ids[i],b=ids[(i+1)%ids.length]; if((a===aId&&b===bId)||(a===bId&&b===aId)) return false; } return true; }); syncRoomLinkedZones(); }
        }
        appState.layout.openings=(appState.layout.openings||[]).filter(o=>o.wallId!==wid); appState.selectedWallId=''; appState.selectedOpeningId=''; pruneOrphanWallNodes();
      }else if(zid){return v211DeleteZone(zid);}
    }
    cleanupDetachedOpenings(); ensureWallTopology(); if(isStructureLayoutScreen()) v117RefreshRooms(); persistActiveLayout(); renderLayoutEditor(); return true;
  }
  function copySelectedStructure(){
    if(!isStructureLayoutScreen()) return false;
    const op=findOpeningById(appState.selectedOpeningId), wall=findWallById(appState.selectedWallId), zone=findZoneById(appState.selectedZoneId);
    if(op){ appState.editor.structureClipboard={type:'opening',data:clone(op)}; showToast('Opening copiado.','success',1200); return true; }
    if(wall && !wall.autoZoneEdge){ appState.editor.structureClipboard={type:'wall',data:clone(wall)}; showToast('Muro copiado.','success',1200); return true; }
    if(zone){ appState.editor.structureClipboard={type:'zone',data:clone(zone)}; showToast('Zona copiada.','success',1200); return true; }
    return false;
  }
  function pasteStructureClipboard(){
    if(!isStructureLayoutScreen()) return false;
    const clip=appState.editor.structureClipboard; if(!clip) return false;
    const layer=clip.type==='zone'?'zones':clip.type==='opening'?'openings':'walls';if(typeof v213LayerLocked==='function'&&v213LayerLocked(layer))return false;
    const off=Math.max(20,getSnapSize()*6);
    if(clip.type==='opening'){
      const src=clip.data, wall=findWallById(src.wallId); if(!wall) return false;
      const next=clone(src); next.id=nextOpeningId(); next.offset=Math.min(Math.max(20,Number(src.offset||wallLength(wall)*.5)+off),Math.max(20,wallLength(wall)-20)); next.t=next.offset/Math.max(1,wallLength(wall)); appState.layout.openings.push(next); appState.selectedOpeningId=next.id; appState.selectedWallId=wall.id;
    }else if(clip.type==='wall'){
      const src=clip.data; const a={x:Number(src.x1||0)+off,y:Number(src.y1||0)+off}, b={x:Number(src.x2||0)+off,y:Number(src.y2||0)+off}; const next=createWallSegment(a,b); if(next){ next.thickness=src.thickness; next.height=src.height; next.name=src.name; }
    }else if(clip.type==='zone'){
      const proposal=(clip.data.pts||[]).map(pt=>({x:pt.x+off,y:pt.y+off}));const problem=v209ZoneViolation('',proposal);if(problem){showToast('No se puede pegar la zona: '+problem.name,'warning');return false;}
      const next=clone(clip.data); next.id=nextZoneId(); next.name=`${next.name||'Zona'} copia`; next.pts=(next.pts||[]).map(pt=>({x:pt.x+off,y:pt.y+off})); delete next.edgeWalls; appState.layout.zones.push(next); appState.selectedZoneId=next.id;
    }
    ensureWallTopology(); persistActiveLayout(); renderLayoutEditor(); return true;
  }
  function duplicateSelectedStructure(){
    if(!isStructureLayoutScreen()) return false;
    if(!copySelectedStructure()) return false;
    return pasteStructureClipboard();
  }
  function ensureLayoutKeyboardBindings(){
    if(appState.editor.keyboardBoundV111) return;
    appState.editor.keyboardBoundV111=true;
    document.addEventListener('keydown', e=>{
      if(!isLayoutWorkspaceScreen()) return;
      const tag=String(e.target?.tagName||'').toLowerCase(); const editing=['input','textarea','select'].includes(tag) || e.target?.isContentEditable;
      if(e.key==='Escape'){ e.preventDefault();if(appState.editor.mode==='street-path'){v221FinishStreet();return;} if(document.getElementById('v213CanvasPopover')){v213ClosePopover();return;} cancelLayoutDrawing(); return; }
      if(editing) return;
      if(appState.editor.mode==='street-path'&&e.key==='Enter'){e.preventDefault();v221FinishStreet();return;}
      if(appState.editor.mode==='street-path'&&(e.key==='Backspace'||e.key==='Delete')){e.preventDefault();const draft=appState.editor.streetDraft;if((appState.layout.streets||[]).some(s=>s.id===draft?.activeId))undoHistory('structure');else if(draft){draft.seed=null;draft.cursor=null;renderLayoutEditor();}return;}
      if(e.key==='Enter'&&appState.editor.mode==='wall'&&!appState.editor.wallLengthDraft){e.preventDefault();cancelLayoutDrawing();return;}
      if(e.key==='Enter'&&appState.editor.polygonDraft){e.preventDefault();v212FinishPolygon();return;}
      if((e.ctrlKey||e.metaKey) && String(e.key||'').toLowerCase()==='z'){
        e.preventDefault();const bucket=isRackDistributionScreen()?'distribution':(appState.editor.areaMoveMode?'layout':'structure');
        if(e.shiftKey)redoHistory(bucket);else undoHistory(bucket);
        return;
      }
      if((e.ctrlKey||e.metaKey) && String(e.key||'').toLowerCase()==='y'){
        e.preventDefault();redoHistory(isRackDistributionScreen()?'distribution':(appState.editor.areaMoveMode?'layout':'structure'));return;
      }
      if(e.key==='F8' && !isRackDistributionScreen()){e.preventDefault();appState.editor.orthoEnabled=!appState.editor.orthoEnabled;renderLayoutEditor();return;}
      const key=String(e.key||'').toLowerCase();
      if((e.key==='Delete'||e.key==='Backspace') && !e.ctrlKey && !e.metaKey){e.preventDefault();if(appState.editor.polygonDraft){appState.editor.polygonDraft.pts.pop();renderLayoutEditor();return;}if(activeLayoutWorkspace()==='architecture'&&appState.editor.architectureTool==='area'){const sel=appState.editor.geometrySelection;if(sel?.type==='vertex')v212Remove('area',sel.index);return;}if(activeLayoutWorkspace()==='architecture'&&appState.editor.architectureTool==='zones'&&appState.selectedVertex?.idx>=0){v212Remove('zones',appState.selectedVertex.idx);return;}deleteLayoutSelection();return;}
      if((e.ctrlKey||e.metaKey) && key==='c'){ if(copySelectedStructure()) e.preventDefault(); return; }
      if((e.ctrlKey||e.metaKey) && key==='v'){ if(pasteStructureClipboard()) e.preventDefault(); return; }
      if((e.ctrlKey||e.metaKey) && key==='d'){ if(duplicateSelectedStructure()) e.preventDefault(); return; }
      if(isStructureLayoutScreen() && appState.editor.mode==='wall' && appState.editor.pendingWallPoint && /^[0-9.]$/.test(e.key)){
        const input=document.getElementById('wallLengthInput'); if(input){ e.preventDefault(); input.focus(); input.value=(input.value||'')+e.key; input.dispatchEvent(new Event('input')); }
      }
    });
  }


  // v130 — unificación: ya no existen "muros de zona" separadas.
  // Toda arista convertida pasa a ser un MURO real con nodos y todas las capacidades CAD.
  function ensureZoneEdgeWalls(zone){
    if(!zone || typeof zone !== 'object') return {};
    if(!zone.edgeWalls || typeof zone.edgeWalls !== 'object' || Array.isArray(zone.edgeWalls)) zone.edgeWalls = {};
    return zone.edgeWalls;
  }
  function zoneEdgeEndpoints(zone, edgeIndex){
    if(!zone || !Array.isArray(zone.pts) || zone.pts.length < 2) return null;
    const idx=((Number(edgeIndex)||0)%zone.pts.length+zone.pts.length)%zone.pts.length;
    const a=zone.pts[idx], b=zone.pts[(idx+1)%zone.pts.length];
    return a&&b ? {a,b,idx} : null;
  }
  function findManualWallForZoneEdge(zone, edgeIndex, tolerance=2.25){
    const edge=zoneEdgeEndpoints(zone,edgeIndex); if(!edge) return null;
    const near=(p,q)=>Math.hypot(Number(p?.x||0)-Number(q?.x||0),Number(p?.y||0)-Number(q?.y||0))<=tolerance;
    return manualWalls().find(w=>{
      const a=getWallNode(w.startNodeId)||{x:w.x1,y:w.y1}, b=getWallNode(w.endNodeId)||{x:w.x2,y:w.y2};
      return (near(a,edge.a)&&near(b,edge.b))||(near(a,edge.b)&&near(b,edge.a));
    })||null;
  }
  // V203: el eje del muro es una referencia inmutable; el espesor puede crecer
  // dentro, fuera o a ambos lados, sin desplazar el eje ni sus nodos compartidos.
  function normalizeWallPlacement(value){
    return ['inside','outside','center'].includes(String(value)) ? String(value) : 'center';
  }
  function getWallFaceOffsets(wall){
    const thick=Math.max(4,Number(wall?.thickness||12)||12);
    const placement=normalizeWallPlacement(wall?.placement);
    if(placement==='center') return {left:thick/2,right:thick/2};
    const ax=Number(wall?.x1||0),ay=Number(wall?.y1||0),bx=Number(wall?.x2||0),by=Number(wall?.y2||0);
    const len=Math.hypot(bx-ax,by-ay)||1;
    const leftNormal={x:-(by-ay)/len,y:(bx-ax)/len};
    const src=wall?.zoneBoundarySource;
    const zone=src?.zoneId ? findZoneById(src.zoneId) : null;
    let outwardSign=Number(wall?.referenceOutwardSign)===-1?-1:1;
    if(zone?.pts?.length>=3){
      const idx=Number(src.edgeIndex);
      let edge=(Number.isFinite(idx)&&idx>=0)?zoneEdgeEndpoints(zone,idx):null;
      if(!edge || !(pointDist2D(edge.a,{x:ax,y:ay})<4||pointDist2D(edge.b,{x:ax,y:ay})<4)){
        edge=zone.pts.map((pt,i)=>zoneEdgeEndpoints(zone,i)).find(e=>e&&(
          (pointDist2D(e.a,{x:ax,y:ay})<4&&pointDist2D(e.b,{x:bx,y:by})<4)||
          (pointDist2D(e.a,{x:bx,y:by})<4&&pointDist2D(e.b,{x:ax,y:ay})<4)
        ));
      }
      if(edge){
        const outward=getZoneOutwardEdgeNormal(zone,edge.a,edge.b);
        outwardSign=leftNormal.x*outward.x+leftNormal.y*outward.y>=0?1:-1;
      }
    }
    const growLeft=placement==='outside' ? outwardSign>0 : outwardSign<0;
    return growLeft ? {left:thick,right:0} : {left:0,right:thick};
  }
  function getZoneEdgeWall(zone, edgeIndex){
    const wall=findManualWallForZoneEdge(zone,edgeIndex);
    return wall ? {...wall,enabled:true,side:getWallSideSign(wall.side)} : null;
  }
  function isZoneEdgeWallEnabled(zone, edgeIndex){ return !!findManualWallForZoneEdge(zone,edgeIndex); }
  function setZoneEdgeWall(zone, edgeIndex, updates={}){
    if(appState.layout.meta?.architectureHierarchyV214&&zone?.id!=='AREA-GENERAL'){showToast('Los muros se crean desde los lados del Área comercial.','warning');return null;}
    const edge=zoneEdgeEndpoints(zone,edgeIndex); if(!edge) return null;
    let wall=findManualWallForZoneEdge(zone,edge.idx);
    if(!wall){
      const exactArea=zone.id==='AREA-GENERAL';
      const start=exactArea?v214AreaNode(edge.a):null,end=exactArea?v214AreaNode(edge.b):null;
      wall=createWallSegment(edge.a,edge.b,exactArea?{startNodeId:start.id,endNodeId:end.id}:{});
      if(!wall) return null;
      wall.name=`Muro ${zone.id}-${edge.idx+1}`;
      if(zone.id==='AREA-GENERAL'){if(typeof v214BindWall==='function')v214BindWall(wall,appState.layout);}else wall.zoneBoundarySource={zoneId:zone.id,edgeIndex:edge.idx};
      wall.placement=normalizeWallPlacement(updates.placement||appState.editor?.wallDefaultPlacement||'inside');
    }
    wall.kind='wall'; wall.ownerAreaId='AREA-GENERAL'; wall.autoZoneEdge=false; delete wall.zoneId; delete wall.edgeIndex; delete wall.locked;
    wall.thickness=Math.max(4,Number(updates.thickness ?? wall.thickness ?? getZoneWallThickness(zone) ?? 14)||14);
    wall.height=Math.max(120,Number(updates.height ?? wall.height ?? appState.layout?.meta?.defaultWallHeight ?? 290)||290);
    wall.side=getWallSideSign(updates.side ?? wall.side ?? 1);
    wall.placement=normalizeWallPlacement(updates.placement ?? wall.placement);
    if(zone.edgeWalls) delete zone.edgeWalls[String(edge.idx)];
    return wall;
  }
  function removeZoneEdgeWall(zone, edgeIndex){
    const wall=findManualWallForZoneEdge(zone,edgeIndex); if(!wall) return;
    if((wall.sharedRoomIds||[]).length>1){ showToast('Este muro es compartido por más de un recinto. Sepáralos antes de eliminarlo.','warning',2600); return; }
    appState.layout.walls=(appState.layout.walls||[]).filter(w=>w.id!==wall.id);
    appState.layout.openings=(appState.layout.openings||[]).filter(o=>o.wallId!==wall.id);
    if(zone?.edgeWalls) delete zone.edgeWalls[String(edgeIndex)];
    pruneOrphanWallNodes();
  }

  function getWallSideSign(value){
    const n = Number(value);
    return Number.isFinite(n) && n < 0 ? -1 : 1;
  }

  function lineIntersection2D(a1, a2, b1, b2){
    const x1 = Number(a1?.x || 0), y1 = Number(a1?.y || 0);
    const x2 = Number(a2?.x || 0), y2 = Number(a2?.y || 0);
    const x3 = Number(b1?.x || 0), y3 = Number(b1?.y || 0);
    const x4 = Number(b2?.x || 0), y4 = Number(b2?.y || 0);
    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if(Math.abs(den) < 0.00001) return null;
    const px = ((x1*y2 - y1*x2) * (x3 - x4) - (x1 - x2) * (x3*y4 - y3*x4)) / den;
    const py = ((x1*y2 - y1*x2) * (y3 - y4) - (y1 - y2) * (x3*y4 - y3*x4)) / den;
    return Number.isFinite(px) && Number.isFinite(py) ? { x:px, y:py } : null;
  }

  function getZoneEdgeWallPlacementOffsets(zone, edgeIndex, wall){
    const thickness = Math.max(8, Number(wall?.thickness || getZoneWallThickness(zone) || 14));
    const placement = normalizeWallPlacement(wall?.placement || 'inside');
    if(placement === 'outside') return { near:0, far:thickness, thickness, placement };
    if(placement === 'center') return { near:-thickness/2, far:thickness/2, thickness, placement };
    return { near:-thickness, far:0, thickness, placement };
  }
  function offsetPoint(pt, n, amount){
    return { x:Number(pt?.x || 0) + Number(n?.x || 0) * Number(amount || 0), y:Number(pt?.y || 0) + Number(n?.y || 0) * Number(amount || 0) };
  }
  function getZoneEdgeWallPolygon(zone, edgeIndex, wallData = null){
    if(!zone || !Array.isArray(zone.pts) || zone.pts.length < 2 || edgeIndex < 0) return null;
    const count = zone.pts.length;
    const a = zone.pts[edgeIndex];
    const b = zone.pts[(edgeIndex + 1) % count];
    const wall = wallData || getZoneEdgeWall(zone, edgeIndex);
    if(!a || !b || !wall || wall.enabled === false) return null;
    const baseN = getZoneOutwardEdgeNormal(zone, a, b);
    const side = getWallSideSign(wall.side);
    const n = { x:baseN.x * side, y:baseN.y * side };
    const offsets = getZoneEdgeWallPlacementOffsets(zone, edgeIndex, wall);
    let startNear = offsetPoint(a, n, offsets.near);
    let endNear = offsetPoint(b, n, offsets.near);
    let startFar = offsetPoint(a, n, offsets.far);
    let endFar = offsetPoint(b, n, offsets.far);

    const safeMiter = (hit, vertex, fallback, thicknessHint) => {
      if(!hit) return fallback;
      const maxLen = Math.max(Number(thicknessHint || offsets.thickness) * 3.4, 52);
      return pointDist2D(hit, vertex) <= maxLen ? hit : fallback;
    };
    const joinEdge = (neighborIdx, atStart) => {
      const neighbor = getZoneEdgeWall(zone, neighborIdx);
      if(!neighbor?.enabled) return;
      const na = zone.pts[neighborIdx];
      const nb = zone.pts[(neighborIdx + 1) % count];
      if(!na || !nb) return;
      const neighborBase = getZoneOutwardEdgeNormal(zone, na, nb);
      const neighborSide = getWallSideSign(neighbor.side);
      const nn = { x:neighborBase.x * neighborSide, y:neighborBase.y * neighborSide };
      const no = getZoneEdgeWallPlacementOffsets(zone, neighborIdx, neighbor);
      const neighborNearA = offsetPoint(na, nn, no.near);
      const neighborNearB = offsetPoint(nb, nn, no.near);
      const neighborFarA = offsetPoint(na, nn, no.far);
      const neighborFarB = offsetPoint(nb, nn, no.far);
      const vertex = atStart ? a : b;
      if(atStart){
        startNear = safeMiter(lineIntersection2D(neighborNearA, neighborNearB, startNear, endNear), vertex, startNear, Math.max(offsets.thickness, no.thickness));
        startFar = safeMiter(lineIntersection2D(neighborFarA, neighborFarB, startFar, endFar), vertex, startFar, Math.max(offsets.thickness, no.thickness));
      } else {
        endNear = safeMiter(lineIntersection2D(startNear, endNear, neighborNearA, neighborNearB), vertex, endNear, Math.max(offsets.thickness, no.thickness));
        endFar = safeMiter(lineIntersection2D(startFar, endFar, neighborFarA, neighborFarB), vertex, endFar, Math.max(offsets.thickness, no.thickness));
      }
    };

    joinEdge((edgeIndex - 1 + count) % count, true);
    joinEdge((edgeIndex + 1) % count, false);
    return [startNear, endNear, endFar, startFar];
  }


  function pointDist2D(a,b){
    return Math.hypot(Number(a?.x || 0) - Number(b?.x || 0), Number(a?.y || 0) - Number(b?.y || 0));
  }
  function getZoneWallCornerClosurePolygons(zone){
    // V204: las uniones de muros perimetrales ya se resuelven con mitras en la
    // geometría principal del muro. Evitamos parches extra que generaban
    // solapes, picos y cierres incorrectos en modos hacia dentro / fuera.
    return [];
  }
  function getAllWallCornerClosurePolygons(){
    ensureLayoutDecorations();
    return [
      ...(appState.layout?.zones || []).flatMap(zone => getZoneWallCornerClosurePolygons(zone)),
      ...getManualWallNodeJointPolygons()
    ];
  }

  function wallPolygonPath(poly){
    if(!Array.isArray(poly) || poly.length < 3) return '';
    return poly.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${Number(pt.x||0)} ${Number(pt.y||0)}`).join(' ') + ' Z';
  }

  function getAutoWallPolygon(wall){
    if(!wall?.autoZoneEdge) return null;
    const zone = findZoneById(wall.zoneId);
    const edgeIndex = Number(wall.edgeIndex);
    if(!zone || !Number.isFinite(edgeIndex)) return null;
    return getZoneEdgeWallPolygon(zone, edgeIndex, wall);
  }
  function getSelectedEdgeWallContext(){
    if(typeof v214AreaContext==='function'&&appState.editor.architectureTool==='walls')return v214AreaContext();
    const sel = appState.selectedEdge || { zoneId:'', a:-1, b:-1 };
    const zone = findZoneById(sel.zoneId);
    if(!zone || sel.a < 0 || !zone.pts?.[sel.a] || !zone.pts?.[sel.b]) return null;
    const edgeIndex = sel.a;
    const wall = getZoneEdgeWall(zone, edgeIndex);
    const a = zone.pts[sel.a], b = zone.pts[sel.b];
    return { zone, edgeIndex, a, b, wall, isWall:!!wall?.enabled, length:Math.sqrt(dist2(a,b)) };
  }
  function convertSelectedEdgeToWall(updates={}){
    const ctx = getSelectedEdgeWallContext();
    if(!ctx) return null;
    const wall = setZoneEdgeWall(ctx.zone, ctx.edgeIndex, updates);
    syncZonePerimeterWalls();
    appState.selectedWallId = zoneEdgeWallId(ctx.zone.id, ctx.edgeIndex);
    return wall;
  }

  function getZoneWallThickness(zone){
    const raw = Number(zone?.wallThickness);
    if(Number.isFinite(raw) && raw > 0) return Math.max(8, raw);
    const metaRaw = Number(appState.layout?.meta?.defaultWallThickness);
    if(Number.isFinite(metaRaw) && metaRaw > 0) return Math.max(8, metaRaw);
    return 14;
  }
  function zoneEdgeWallId(zoneId, edgeIndex){
    const zone=findZoneById(zoneId); return findManualWallForZoneEdge(zone,edgeIndex)?.id || '';
  }
  function migrateLegacyZoneWallsToUnifiedWalls(layout=appState.layout){
    if(!layout || typeof layout!=='object') return layout;
    if(!layout.meta || typeof layout.meta!=='object') layout.meta={};
    if(layout.meta.unifiedWallsV130 && !(layout.walls||[]).some(w=>w?.autoZoneEdge)) return layout;
    if(!Array.isArray(layout.walls)) layout.walls=[];
    if(!Array.isArray(layout.openings)) layout.openings=[];
    if(!Array.isArray(layout.wallNodes)) layout.wallNodes=[];
    const manual=(layout.walls||[]).filter(w=>!w?.autoZoneEdge);
    let nextNum=Math.max(0,...manual.map(w=>{const m=String(w.id||'').match(/^W(\d+)$/i);return m?Number(m[1]):0;}));
    const nextId=()=>`W${++nextNum}`;
    const near=(p,q,t=2.1)=>Math.hypot(Number(p?.x||0)-Number(q?.x||0),Number(p?.y||0)-Number(q?.y||0))<=t;
    const nodeFor=(pt)=>{
      let n=layout.wallNodes.find(x=>near(x,pt,1.8));
      if(!n){ n={id:nextWallNodeId(layout),x:Number(pt.x||0),y:Number(pt.y||0)}; layout.wallNodes.push(n); }
      return n;
    };
    const findSame=(a,b)=>manual.find(w=>{
      const wa=getWallNode(w.startNodeId,layout)||{x:w.x1,y:w.y1}, wb=getWallNode(w.endNodeId,layout)||{x:w.x2,y:w.y2};
      return (near(wa,a)&&near(wb,b))||(near(wa,b)&&near(wb,a));
    });
    const remap=new Map();
    const candidates=[];
    (layout.walls||[]).filter(w=>w?.autoZoneEdge).forEach(w=>candidates.push({oldId:w.id,a:{x:w.x1,y:w.y1},b:{x:w.x2,y:w.y2},name:w.name,thickness:w.thickness,height:w.height,side:w.side,zoneId:w.zoneId,edgeIndex:w.edgeIndex}));
    (layout.zones||[]).forEach(zone=>{
      const raw=zone?.edgeWalls;
      if(!raw || typeof raw!=='object') return;
      Object.entries(raw).forEach(([key,cfg])=>{
        if(!cfg?.enabled) return;
        const edge=zoneEdgeEndpoints(zone,Number(key)); if(!edge) return;
        const oldId=`ZW-${String(zone.id||'Z')}-${edge.idx}`;
        if(candidates.some(c=>c.oldId===oldId)) return;
        candidates.push({oldId,a:edge.a,b:edge.b,name:`Muro ${zone.id}-${edge.idx+1}`,thickness:cfg.thickness,height:cfg.height,side:cfg.side,zoneId:zone.id,edgeIndex:edge.idx});
      });
    });
    candidates.forEach(c=>{
      let wall=findSame(c.a,c.b);
      if(!wall){
        const a=nodeFor(c.a), b=nodeFor(c.b);
        wall={id:nextId(),name:String(c.name||'Muro').replace(/Muro/gi,'Muro'),x1:a.x,y1:a.y,x2:b.x,y2:b.y,startNodeId:a.id,endNodeId:b.id,thickness:Math.max(4,Number(c.thickness||layout.meta.defaultWallThickness||12)||12),height:Math.max(120,Number(c.height||layout.meta.defaultWallHeight||290)||290),side:getWallSideSign(c.side),kind:'wall',zoneBoundarySource:{zoneId:c.zoneId||'',edgeIndex:Number(c.edgeIndex)||0}};
        manual.push(wall);
      }else{
        wall.thickness=Math.max(Number(wall.thickness||0),Number(c.thickness||0),4);
        wall.height=Math.max(Number(wall.height||0),Number(c.height||0),120);
      }
      if(c.oldId) remap.set(String(c.oldId),wall.id);
    });
    layout.openings.forEach(o=>{ const mapped=remap.get(String(o.wallId||'')); if(mapped)o.wallId=mapped; });
    (layout.zones||[]).forEach(z=>{ if(z&&z.edgeWalls) z.edgeWalls={}; });
    layout.walls=manual.map(w=>{ w.kind='wall'; w.autoZoneEdge=false; delete w.zoneId; delete w.edgeIndex; delete w.locked; const oldLabel='P'+'ared'; if(new RegExp('^'+oldLabel,'i').test(String(w.name||'')))w.name=String(w.name).replace(new RegExp('^'+oldLabel,'i'),'Muro'); if(!w.name)w.name='Muro'; return w; });
    layout.meta.unifiedWallsV130=true;
    syncManualWallsFromNodes(layout); pruneOrphanWallNodes(layout);
    return layout;
  }
  function syncZonePerimeterWalls(layout = appState.layout){
    // Compatibilidad de carga: las antiguas "muros de zona" se convierten una sola vez
    // en muros CAD normales. A partir de v130 no se vuelven a generar autoZoneEdge.
    migrateLegacyZoneWallsToUnifiedWalls(layout);
    return layout;
  }

  function ensureLayoutDecorations(layout = appState.layout){
    if(!layout || typeof layout !== 'object') return { walls:[], openings:[] };
    if(!Array.isArray(layout.walls)) layout.walls = [];
    if(!Array.isArray(layout.openings)) layout.openings = [];
    syncZonePerimeterWalls(layout);
    ensureWallTopology(layout);
    ensureOpeningAttachmentOffsets(layout);
    return layout;
  }

  function nextWallId(){
    ensureLayoutDecorations();
    const vals = (appState.layout.walls || []).map(w => {
      const m = String(w.id || '').match(/^W(\d+)$/i);
      return m ? parseInt(m[1], 10) : NaN;
    }).filter(Number.isFinite);
    return `W${(Math.max(0, ...vals) + 1)}`;
  }
  function nextOpeningId(){
    ensureLayoutDecorations();
    const vals = (appState.layout.openings || []).map(o => parseInt(String(o.id || '').replace(/\D+/g,''), 10)).filter(Number.isFinite);
    return `O${(Math.max(0, ...vals) + 1)}`;
  }
  function findWallById(id){ ensureLayoutDecorations(); return (appState.layout.walls || []).find(w => w.id === id); }
  function findOpeningById(id){ ensureLayoutDecorations(); return (appState.layout.openings || []).find(o => o.id === id); }
  function wallLength(wall){ return wall ? Math.sqrt(((Number(wall.x2||0)-Number(wall.x1||0))**2)+((Number(wall.y2||0)-Number(wall.y1||0))**2)) : 0; }
  function wallDirection(wall){
    const len = Math.max(1, wallLength(wall));
    return wall ? { x:(Number(wall.x2||0)-Number(wall.x1||0))/len, y:(Number(wall.y2||0)-Number(wall.y1||0))/len } : {x:1,y:0};
  }
  function wallNormal(wall){ const d = wallDirection(wall); return { x:-d.y, y:d.x }; }
  function openingClampT(wall, width, t){
    const len = Math.max(1, wallLength(wall));
    const half = Math.min(.49, Math.max(6, Number(width || 90) / 2) / len);
    return Math.max(half, Math.min(1 - half, Number(t || .5)));
  }
  function getOpeningSegment(opening, wall=findWallById(opening?.wallId)){
    if(!opening || !wall) return null;
    const len = Math.max(1, wallLength(wall));
    const width = Math.max(40, Number(opening.width || 90) || 90);
    const halfT = Math.min(.48, (width / 2) / len);
    ensureOpeningAttachmentOffsets();
    const t = openingClampT(wall, width, Number(opening.offset) / len);
    const a = { x:Number(wall.x1||0), y:Number(wall.y1||0) };
    const b = { x:Number(wall.x2||0), y:Number(wall.y2||0) };
    const vx = b.x - a.x, vy = b.y - a.y;
    return {
      a: { x:a.x + vx * Math.max(0, t - halfT), y:a.y + vy * Math.max(0, t - halfT) },
      b: { x:a.x + vx * Math.min(1, t + halfT), y:a.y + vy * Math.min(1, t + halfT) },
      center: { x:a.x + vx * t, y:a.y + vy * t },
      width,
      t
    };
  }

  function getWallOpeningNormal(wall){
    if(wall?.autoZoneEdge){
      const zone = findZoneById(wall.zoneId);
      const idx = Number(wall.edgeIndex || 0) || 0;
      const a = zone?.pts?.[idx];
      const b = zone?.pts?.[(idx + 1) % (zone?.pts?.length || 1)];
      if(zone && a && b){
        const base = getZoneOutwardEdgeNormal(zone, a, b);
        const side = typeof getWallSideSign === 'function' ? getWallSideSign(wall.side) : (Number(wall.side || 1) >= 0 ? 1 : -1);
        return { x:base.x * side, y:base.y * side };
      }
    }
    return wallNormal(wall);
  }

  function getWallRawSlicePolygon(wall, t0=0, t1=1, inflate=1){
    if(!wall) return null;
    const len = Math.max(1, wallLength(wall));
    const start = Math.max(0, Math.min(1, Number(t0) || 0));
    const end = Math.max(start, Math.min(1, Number(t1) || 1));
    if((end - start) * len < 1) return null;
    const ax = Number(wall.x1 || 0), ay = Number(wall.y1 || 0);
    const bx = Number(wall.x2 || 0), by = Number(wall.y2 || 0);
    const dir = { x:(bx-ax) / len, y:(by-ay) / len };
    const p0 = { x:ax + (bx-ax) * start, y:ay + (by-ay) * start };
    const p1 = { x:ax + (bx-ax) * end, y:ay + (by-ay) * end };
    const normal={x:-dir.y,y:dir.x};
    const rawThickness=Math.max(4,Number(wall.thickness||14)||14)*Math.max(.1,Number(inflate||1));
    const nominal=Math.max(4,Number(wall.thickness||14)||14);
    const original=getWallFaceOffsets(wall);
    const left=rawThickness*original.left/nominal,right=rawThickness*original.right/nominal;
    return {
      normal,
      poly:[
        {x:p0.x-normal.x*right,y:p0.y-normal.y*right},
        {x:p1.x-normal.x*right,y:p1.y-normal.y*right},
        {x:p1.x+normal.x*left,y:p1.y+normal.y*left},
        {x:p0.x+normal.x*left,y:p0.y+normal.y*left}
      ],
      center:{x:(p0.x+p1.x)/2+normal.x*(left-right)/2,y:(p0.y+p1.y)/2+normal.y*(left-right)/2},
      thickness:rawThickness,dir,a:p0,b:p1
    };
  }

  // V210: one source of truth for 2D/3D wall footprint joins.
  // Join the physical faces, NOT merely the two centerline endpoints.  Previous
  // separate wall rectangles + a convex hull patch left visible gaps at oblique
  // corners and could produce doubled faces in WebGL.
  function wallEndpointFaceFrame(wall, atStart, inflate=1){
    const raw=getWallRawSlicePolygon(wall,0,1,inflate);
    if(!raw?.poly)return null;
    const node=atStart?raw.a:raw.b;
    const other=atStart?raw.b:raw.a;
    const length=Math.hypot(other.x-node.x,other.y-node.y);
    if(length<1e-5)return null;
    const ray={x:(other.x-node.x)/length,y:(other.y-node.y)/length};
    // Polygon order: start-right, end-right, end-left, start-left.
    const leftIndex=atStart?3:1;
    const rightIndex=atStart?0:2;
    return {node,ray,length,atStart,leftIndex,rightIndex,
      left:raw.poly[leftIndex],right:raw.poly[rightIndex],poly:raw.poly,
      thickness:Number(raw.thickness)||12};
  }
  function wallMiterFacePoint(a,b, node, maxThickness){
    const a2={x:a.point.x+a.ray.x*100,y:a.point.y+a.ray.y*100};
    const b2={x:b.point.x+b.ray.x*100,y:b.point.y+b.ray.y*100};
    const hit=lineIntersection2D(a.point,a2,b.point,b2);
    if(!hit)return null;
    // A very shallow angle yields unbounded miters. A separate bevel is safer.
    const limit=Math.max(24,Number(maxThickness||12)*5.5);
    return pointDist2D(hit,node)<=limit?hit:null;
  }
  function getWallSlicePolygon(wall,t0=0,t1=1,inflate=1,neighbors=null){
    const raw=getWallRawSlicePolygon(wall,t0,t1,inflate);
    if(!raw?.poly || wall?.autoZoneEdge)return raw;
    const poly=raw.poly.map(p=>({...p}));let miterLimited=false;
    const walls=(neighbors||appState.layout?.walls||[]).filter(w=>w && w.id!==wall.id && !w.autoZoneEdge && wallLength(w)>1);
    const join=(atStart)=>{
      const t=atStart?Number(t0||0):Number(t1??1);
      if(atStart?t>1e-5:t<1-1e-5)return;
      const self=wallEndpointFaceFrame(wall,atStart,inflate);
      if(!self)return;
      const joined=walls.map(w=>{
        const a={x:Number(w.x1||0),y:Number(w.y1||0)};
        const b={x:Number(w.x2||0),y:Number(w.y2||0)};
        const aDistance=pointDist2D(a,self.node),bDistance=pointDist2D(b,self.node);
        const tolerance=2.25;
        if(Math.min(aDistance,bDistance)>tolerance)return null;
        return wallEndpointFaceFrame(w,aDistance<=bDistance,inflate);
      }).filter(Boolean);
      // Two incident walls: exact face-to-face miters. For T/X nodes the
      // bounded junction polygon is built separately (never move 3+ wall ends
      // to a single incorrect miter).
      if(joined.length!==1)return;
      const other=joined[0];
      const cross=self.ray.x*other.ray.y-self.ray.y*other.ray.x;
      if(Math.abs(cross)<0.012)return;
      const thickness=Math.max(self.thickness,other.thickness);
      const leftHit=wallMiterFacePoint(
        {point:self.left,ray:self.ray},{point:other.right,ray:other.ray},self.node,thickness);
      const rightHit=wallMiterFacePoint(
        {point:self.right,ray:self.ray},{point:other.left,ray:other.ray},self.node,thickness);
      // Do not mutate the opposite end: openings and other pieces preserve
      // their own profile. Both neighbors compute identical intersections.
      const budget=Math.min(self.length,other.length)*.45;
      if(!leftHit||!rightHit||pointDist2D(leftHit,self.node)>budget||pointDist2D(rightHit,self.node)>budget){miterLimited=true;return;}
      poly[self.leftIndex]=leftHit;poly[self.rightIndex]=rightHit;
    };
    join(true);join(false);
    const forward=(a,b)=>(b.x-a.x)*raw.dir.x+(b.y-a.y)*raw.dir.y;
    if(forward(poly[0],poly[1])<=1e-7||forward(poly[3],poly[2])<=1e-7)return {...raw,miterLimited:true};
    return {...raw,poly,miterLimited};
  }

  function getOpeningFootprint(opening, wall=findWallById(opening?.wallId), inflate=1){
    const seg = getOpeningSegment(opening, wall);
    if(!seg || !wall) return null;
    const len = Math.max(1, wallLength(wall));
    const width = Math.max(40, Number(opening.width || 90) || 90);
    const start = Math.max(0, (seg.t * len - width / 2) / len);
    const end = Math.min(1, (seg.t * len + width / 2) / len);
    const slice = getWallSlicePolygon(wall, start, end, inflate);
    return slice ? { seg, normal:slice.normal, poly:slice.poly } : null;
  }

  function normalizeOpeningType(type){
    if(type === 'window') return 'window';
    if(type === 'free' || type === 'open') return 'free';
    if(type === 'gate') return 'gate';
    return 'door';
  }
  function openingDefaultForType(type){
    const kind = normalizeOpeningType(type);
    if(kind === 'window') return { width:120, height:100, sill:90 };
    if(kind === 'gate') return { width:180, height:240, sill:0 };
    if(kind === 'free') return { width:120, height:260, sill:0 };
    return { width:90, height:210, sill:0 };
  }
  function getOpeningPositionInfo(opening, wall=findWallById(opening?.wallId)){
    if(!opening || !wall) return null;
    const len = Math.max(1, wallLength(wall));
    const width = Math.max(40, Number(opening.width || openingDefaultForType(opening.type).width) || 90);
    ensureOpeningAttachmentOffsets();
    const t = openingClampT(wall, width, Number(opening.offset) / len);
    const start = Math.max(0, t * len - width / 2);
    const end = Math.min(len, t * len + width / 2);
    return { len, width, t, start, end, left:start, right:Math.max(0, len-end), center:t*len };
  }
  function setOpeningPositionFromPoint(opening, point, opts={}){
    const wall = findWallById(opening?.wallId);
    if(!opening || !wall || !point) return null;
    const proj = projectPointToSegment(point, {x:Number(wall.x1||0), y:Number(wall.y1||0)}, {x:Number(wall.x2||0), y:Number(wall.y2||0)});
    const len = Math.max(1, wallLength(wall));
    const width = Math.max(40, Number(opening.width || openingDefaultForType(opening.type).width) || 90);
    let dist = proj.t * len;
    if(opts.snap !== false){
      const step = Math.max(1, Number(appState.editor?.snapSize || DEFAULT_GRID_SIZE || 2) || 2);
      dist = Math.round(dist / step) * step;
    }
    opening.offset = Math.max(width/2, Math.min(len-width/2, dist));
    opening.t = openingClampT(wall, width, opening.offset / len);
    return opening;
  }
  function resizeOpeningFromPoint(opening, point, edge='end'){
    const wall = findWallById(opening?.wallId);
    if(!opening || !wall || !point) return null;
    const len = Math.max(1, wallLength(wall));
    const info = getOpeningPositionInfo(opening, wall);
    if(!info) return null;
    const proj = projectPointToSegment(point, {x:Number(wall.x1||0), y:Number(wall.y1||0)}, {x:Number(wall.x2||0), y:Number(wall.y2||0)});
    let moving = proj.t * len;
    const step = Math.max(1, Number(appState.editor?.snapSize || DEFAULT_GRID_SIZE || 2) || 2);
    moving = Math.round(moving / step) * step;
    let start = info.start, end = info.end;
    const minWidth = 40;
    if(edge === 'start') start = Math.min(end - minWidth, moving);
    else end = Math.max(start + minWidth, moving);
    start = Math.max(0, Math.min(len - minWidth, start));
    end = Math.max(start + minWidth, Math.min(len, end));
    const width = Math.max(minWidth, Math.min(360, end - start));
    opening.width = Math.round(width);
    opening.offset = (start + end) / 2;
    opening.t = openingClampT(wall, opening.width, opening.offset / len);
    return opening;
  }
  function duplicateOpening(opening){
    const wall = findWallById(opening?.wallId);
    if(!opening || !wall) return null;
    const next = clone(opening);
    next.id = nextOpeningId();
    const len = Math.max(1, wallLength(wall));
    const offset = Math.min(.18, Math.max(.08, (Number(next.width || 90) * 1.35) / len));
    const baseOffset = Number(opening.offset || (Number(opening.t||.5)*len));
    next.offset = Math.min(Math.max(next.width/2, baseOffset + Math.max(20, Number(next.width||90)*.35)), Math.max(next.width/2, len-next.width/2));
    next.t = openingClampT(wall, next.width, next.offset / len);
    appState.layout.openings.push(next);
    appState.selectedOpeningId = next.id;
    appState.selectedWallId = next.wallId;
    return next;
  }
  function startOpeningDrag(e, openingId, mode='move'){
    if(typeof v213LayerLocked==='function' && v213LayerLocked('openings'))return;
    if(!isStructureLayoutScreen() || appState.editor.mode !== 'select') return;
    e.stopPropagation();
    const opening = findOpeningById(openingId);
    const wall = findWallById(opening?.wallId);
    if(!opening || !wall) return;
    const svg = $('#layoutSvg');
    const p = svgPoint(e, svg);
    appState.selectedOpeningId = opening.id;
    appState.selectedWallId = opening.wallId;
    appState.selectedRackLayoutId = '';
    closeStackMenu();
    appState.editor.dragging = { type:'opening', openingId:opening.id, mode, start:p, original:clone(opening) };
    if(svg) svg.style.cursor = mode === 'move' ? 'grabbing' : 'ew-resize';
    renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector();
  }
  function findNearestWallProjection(point, threshold = 22){
    ensureLayoutDecorations();
    let best = null;
    (appState.layout.walls || []).forEach(wall => {
      const proj = projectPointToSegment(point, {x:Number(wall.x1||0), y:Number(wall.y1||0)}, {x:Number(wall.x2||0), y:Number(wall.y2||0)});
      const d = Math.sqrt(dist2(point, proj));
      if(d <= threshold && (!best || d < best.d)) best = { wall, proj, d };
    });
    return best;
  }
  function createWallSegment(a, b, opts={}){
    ensureLayoutDecorations();
    ensureWallTopology();
    const pa={x:Number(a?.x||0),y:Number(a?.y||0)}, pb={x:Number(b?.x||0),y:Number(b?.y||0)};
    if(Math.hypot(pb.x-pa.x,pb.y-pa.y) < 10) return null;
    const startNode=opts.startNodeId ? getWallNode(opts.startNodeId) : findOrCreateWallNode({x:snapGrid(pa.x),y:snapGrid(pa.y)});
    const endNode=opts.endNodeId ? getWallNode(opts.endNodeId) : findOrCreateWallNode({x:snapGrid(pb.x),y:snapGrid(pb.y)});
    if(!startNode || !endNode || startNode.id===endNode.id) return null;
    const existing=manualWalls().find(w => (w.startNodeId===startNode.id&&w.endNodeId===endNode.id)||(w.startNodeId===endNode.id&&w.endNodeId===startNode.id));
    if(existing){ appState.selectedWallId=existing.id; return existing; }
    const wall = {
      id:nextWallId(), name:'Muro',
      x1:startNode.x, y1:startNode.y, x2:endNode.x, y2:endNode.y,
      startNodeId:startNode.id, endNodeId:endNode.id,
      thickness:appState.editor.wallDraftThickness!=null?Math.max(4,Math.min(80,Number(appState.editor.wallDraftThickness)||12))/Math.max(.0001,getScaleCmPerUnit()):Math.max(4,Number(appState.layout?.meta?.defaultWallThickness||12)||12),
      height:appState.editor.wallDraftHeight!=null?Math.max(100,Math.min(800,Number(appState.editor.wallDraftHeight)||290))/Math.max(.0001,getScaleCmPerUnit()):Math.max(120,Number(appState.layout?.meta?.defaultWallHeight||290)||290),
      placement:normalizeWallPlacement(appState.editor.wallDefaultPlacement||'inside'),
      ownerAreaId:'AREA-GENERAL', kind:'wall'
    };
    appState.layout.walls.push(wall);
    syncManualWallsFromNodes();
    appState.selectedWallId = wall.id;
    appState.selectedWallNodeId = endNode.id;
    appState.selectedOpeningId = '';
    appState.selectedRackLayoutId = '';
    return wall;
  }
  function splitRoomBoundaryAtEdge(room, edgeIndex){
    if(!room || !Array.isArray(room.nodeIds) || room.nodeIds.length < 3) return null;
    const ids = room.nodeIds;
    const aId = ids[edgeIndex], bId = ids[(edgeIndex+1)%ids.length];
    const a = getWallNode(aId), b = getWallNode(bId);
    if(!a || !b) return null;
    const mid = findOrCreateWallNode({ x:(Number(a.x||0)+Number(b.x||0))/2, y:(Number(a.y||0)+Number(b.y||0))/2 });
    if(!mid) return null;
    room.nodeIds.splice(edgeIndex+1, 0, mid.id);
    const wall = findManualWallByNodes(aId,bId);
    if(wall){
      const idx = (appState.layout.walls||[]).findIndex(w => w.id===wall.id);
      if(idx >= 0){
        const w1 = { ...wall, id:nextWallId(), startNodeId:aId, endNodeId:mid.id, x1:Number(a.x||0), y1:Number(a.y||0), x2:Number(mid.x||0), y2:Number(mid.y||0) };
        const w2 = { ...wall, id:nextWallId(), startNodeId:mid.id, endNodeId:bId, x1:Number(mid.x||0), y1:Number(mid.y||0), x2:Number(b.x||0), y2:Number(b.y||0) };
        appState.layout.walls.splice(idx, 1, w1, w2);
      }
    }
    syncManualWallsFromNodes();
    syncRoomLinkedZones();
    ensureOpeningAttachmentOffsets();
    return { roomId:room.id, nodeId:mid.id };
  }
  function insertVertexOnSelectedRoom(){
    const room = findRoomById(appState.selectedRoomId); if(!room) return;
    let edgeIndex = -1;
    if(appState.selectedWallId){
      const wall = findWallById(appState.selectedWallId);
      const ids = room.nodeIds || [];
      for(let i=0;i<ids.length;i++){
        const a=ids[i], b=ids[(i+1)%ids.length];
        if((wall?.startNodeId===a && wall?.endNodeId===b) || (wall?.startNodeId===b && wall?.endNodeId===a)){ edgeIndex=i; break; }
      }
    }
    if(edgeIndex < 0){
      const ids = room.nodeIds || [];
      let best = { len:-1, idx:-1 };
      for(let i=0;i<ids.length;i++){
        const a=getWallNode(ids[i]), b=getWallNode(ids[(i+1)%ids.length]);
        if(!a || !b) continue;
        const len=Math.hypot(Number(b.x||0)-Number(a.x||0), Number(b.y||0)-Number(a.y||0));
        if(len > best.len) best = { len, idx:i };
      }
      edgeIndex = best.idx;
    }
    if(edgeIndex < 0) return;
    const res = splitRoomBoundaryAtEdge(room, edgeIndex);
    if(!res) return;
    appState.selectedRoomId = room.id;
    appState.selectedWallNodeId = res.nodeId;
    persistActiveLayout();
    renderLayoutEditor();
  }

  function createOpeningAtPoint(point, type='door'){
    if(typeof v213LayerLocked==='function'&&v213LayerLocked('openings'))return null;
    ensureLayoutDecorations();
    const nearest = findNearestWallProjection(point, 28);
    if(!nearest || !nearest.wall) return null;
    const def = openingDefaultForType(type);
    const hostDepth = Math.max(8, Number(nearest.wall.thickness || 14) || 14);
    const opening = { id:nextOpeningId(), wallId:nearest.wall.id, t:nearest.proj.t, offset:nearest.proj.t * Math.max(1, wallLength(nearest.wall)), width:def.width, height:def.height, sill:def.sill, depth:hostDepth, type:normalizeOpeningType(type), swing:1 };
    opening.t = openingClampT(nearest.wall, opening.width, opening.t);
    appState.layout.openings.push(opening);
    appState.selectedOpeningId = opening.id;
    appState.selectedWallId = nearest.wall.id;
    appState.selectedRackLayoutId = '';
    return opening;
  }

  function createOpeningOnWall(wallId, type='door'){
    if(typeof v213LayerLocked==='function'&&v213LayerLocked('openings')){showToast('Desbloquea la capa Aberturas para agregar una.','warning');return null;}
    ensureLayoutDecorations();
    const wall = findWallById(wallId);
    if(!wall) return null;
    const def = openingDefaultForType(type);
    const hostDepth = Math.max(8, Number(wall.thickness || 14) || 14);
    const opening = { id:nextOpeningId(), wallId:wall.id, t:.5, offset:Math.max(1, wallLength(wall))*.5, width:def.width, height:def.height, sill:def.sill, depth:hostDepth, type:normalizeOpeningType(type), swing:1 };
    opening.t = openingClampT(wall, opening.width, opening.t);
    appState.layout.openings.push(opening);
    appState.selectedOpeningId = opening.id;
    appState.selectedWallId = wall.id;
    appState.selectedRackLayoutId = '';
    return opening;
  }
  function cleanupDetachedOpenings(){
    ensureLayoutDecorations();
    const ids = new Set((appState.layout.walls || []).map(w => w.id));
    appState.layout.openings = (appState.layout.openings || []).filter(o => ids.has(o.wallId));
    if(appState.selectedOpeningId && !findOpeningById(appState.selectedOpeningId)) appState.selectedOpeningId = '';
    if(appState.selectedWallId && !findWallById(appState.selectedWallId)) appState.selectedWallId = '';
  }

  // V200: Las pestañas comparten layout y zoom, pero aíslan selección y herramientas.
  function activeLayoutWorkspace(){
    return isRackDistributionScreen() ? 'distribution' : (appState.editor?.layoutSubsystem==='urbanism'?'urbanism':'architecture');
  }
  function rackVisibleAtLevel(rack){
    const filter=appState.editor?.visibleRackLevel;
    if(filter===undefined || filter==='all' || !isRackDistributionScreen()) return true;
    const level=rack.stackGroupId ? Math.max(0,Number(rack.stackLevel||0)) : Math.max(0,Math.round(Number(rack.baseHeight||0) / Math.max(1,Number(rack.rackHeight||rackModel(rack.modelId)?.height||200))));
    return level===Number(filter);
  }
  function switchLayoutWorkspace(next){
    if(!['architecture','urbanism','distribution'].includes(next)) return;
    if(appState.editor.pendingFurnitureModelId){appState.editor.pendingFurnitureModelId='';appState.editor.pendingFurniturePoint=null;}
    if(next!=='architecture')appState.editor.areaMoveMode=false;
    if(next!=='distribution'){appState.editor.rackAlignMode='';appState.editor.rackAlignVertexA=null;}
    if(next==='distribution'){
      appState.editor.mode='select'; appState.editor.layoutSubsystem='architecture';
      if(!isRackDistributionScreen())setScreen('distribution');else renderLayoutEditor();
      return;
    }
    appState.editor.layoutSubsystem=next;
    appState.editor.mode='select'; appState.editor.editSiteBoundary=false;
    appState.editor.streetVerticesVisible=false;
    appState.editor.pendingWallPoint=null;
    if(next==='urbanism'){
      appState.selectedWallId=''; appState.selectedOpeningId=''; appState.selectedRackLayoutId='';
    }else{
      appState.selectedStreetId=''; appState.selectedStreetFurnitureId='';
    }
    if(!isStructureLayoutScreen())setScreen('layout');else renderLayoutEditor();
  }
  function layoutWorkspaceTabs(){
    const active=activeLayoutWorkspace();
    const choices=[['architecture','Arquitectura','Área · muros · zonas'],['urbanism','Urbanismo','Calles · veredas'],['distribution','Distribución','Racks · niveles']];
    return `<nav class="layout-v200-tabs" aria-label="Herramientas del layout">${choices.map(([key,label,desc])=>`<button type="button" data-layout-workspace="${key}" class="layout-v200-tab ${active===key?'active':''}" aria-pressed="${active===key}"><b>${label}</b><small>${desc}</small></button>`).join('')}</nav>`;
  }
  function layoutWallSubtabs(){
    const active=appState.editor.architectureTool;
    return `<div class="v203-wall-subtabs v212-subtabs" role="group" aria-label="Herramientas de arquitectura">${[['area','Área comercial'],['walls','Muros'],['zones','Zonas']].map(([key,label])=>`<button type="button" class="seg-btn ${active===key?'active':''}" data-architecture-tool="${key}" aria-pressed="${active===key}">${label}</button>`).join('')}</div>`;
  }
  function layoutWallToolsMarkup(){
    const wallMode=appState.editor.architectureTool==='walls';
    if(!wallMode)return '';
    const drawing=appState.editor.mode==='wall';
    const ctx=getSelectedEdgeWallContext();
    const selected=ctx?.zone ? findManualWallForZoneEdge(ctx.zone,ctx.edgeIndex):null;
    const wall=selected||findWallById(appState.selectedWallId);
    const defaultPlacement=normalizeWallPlacement(wall?.placement||appState.editor.wallDefaultPlacement||'inside');
    const thickness=appState.editor.wallDraftThickness ?? Math.round((Number(wall?.thickness||appState.layout?.meta?.defaultWallThickness||12))*getScaleCmPerUnit());
    const height=appState.editor.wallDraftHeight ?? Math.round((Number(wall?.height||appState.layout?.meta?.defaultWallHeight||290))*getScaleCmPerUnit());
    return `<section class="layout-prop-card v203-wall-card">
       <div class="layout-prop-title">${drawing?'Muros · trazado continuo':'Muros · creación contextual'}</div>
       <p class="tiny muted">${drawing?'Clic para iniciar y continuar tramos. Vuelve al primer punto para cerrar; Esc, Enter o clic derecho para terminar.':'Selecciona un lado del Área comercial para crear su muro. Sus extremos siguen los vértices del área.'}</p>
       <div class="layout-selected-title">${drawing?(appState.editor.pendingWallPoint?'Elige el siguiente extremo':'Elige el punto inicial'):ctx?`Arista ${ctx.edgeIndex+1} · ${escapeHtml(ctx.zone.name||ctx.zone.id)}`:wall?`Muro ${escapeHtml(wall.name||wall.id)}`:'Selecciona un lado del Área comercial'}</div>
       <div class="layout-prop-grid two">
         <label style="grid-column:1/-1">Espesor respecto al eje<select id="v203WallPlacement">
           <option value="inside" ${defaultPlacement==='inside'?'selected':''}>Hacia dentro</option>
           <option value="outside" ${defaultPlacement==='outside'?'selected':''}>Hacia fuera</option>
           <option value="center" ${defaultPlacement==='center'?'selected':''}>Centrado</option>
         </select></label>
         <label>Espesor (cm)<input id="v203WallThickness" type="number" min="4" max="80" value="${thickness}"></label>
         <label>Altura (cm)<input id="v203WallHeight" type="number" min="100" max="800" value="${height}"></label>
       </div>
       <div class="layout-template-grid" style="margin-top:10px" ${drawing?'hidden':''}>
         <button class="btn primary" type="button" id="v203WallApply" ${!ctx&&!wall?'disabled':''}>${wall?'Actualizar muro':'Crear muro en arista'}</button>
         <button class="seg-btn danger" type="button" id="v203WallRemove" ${!wall?'disabled':''}>Quitar muro</button>
         <button class="seg-btn" type="button" id="v203WallPerimeter" ${!ctx?.zone?'disabled':''}>Crear muros del área</button>
       </div>
       <p class="tiny muted">Las uniones comparten nodos geométricos. Crea o cambia el muro desde aquí; el contorno se actualiza en 2D y 3D.</p>
    </section>`;
  }
  function layoutLevelSelector(){
    const visible=String(appState.editor.visibleRackLevel??'all');
    const highest=Math.max(2,...(appState.layout?.racks||[]).map(r=>r.stackGroupId?Number(r.stackLevel||0):0));
    return `<div class="layout-v200-levels" role="group" aria-label="Nivel visible"><span>Nivel visible</span>${[['all','Todos'],...Array.from({length:Math.min(8,highest+1)},(_,i)=>[String(i),`N${i+1}`])].map(([v,label])=>`<button type="button" data-visible-level="${v}" class="seg-btn ${visible===v?'active':''}" aria-pressed="${visible===v}">${label}</button>`).join('')}</div>`;
  }
  function layoutUrbanismInspector(){
    const streets=appState.layout?.streets||[];
    return `<section class="layout-prop-card layout-v200-urban"><div class="layout-prop-title">Calles y veredas</div><p class="tiny muted">Selecciona una calle del plano para editar su geometría y materiales. La arquitectura se mantiene visible como referencia.</p><label class="layout-v200-street-select">Calle activa<select id="v200StreetSelect"><option value="">Seleccionar calle</option>${streets.map(st=>`<option value="${escapeHtml(st.id)}" ${st.id===appState.selectedStreetId?'selected':''}>${escapeHtml(st.name||st.id)}</option>`).join('')}</select></label><div class="layout-template-grid"><button type="button" class="seg-btn" id="v200DrawStreet">+ Crear calle</button><button type="button" class="seg-btn" id="v200ShowStreetHandles">Editar vértices</button></div></section>`;
  }
  function layoutDistributionInspector(){
    return `<section class="layout-prop-card layout-v200-distribution"><div class="layout-prop-title">Precisión y movimiento</div>
      <div class="layout-v205-motion-options" style="display:grid;gap:9px;margin:10px 0 14px">
        <label style="display:flex;align-items:center;gap:8px"><input id="v205FreeMove" type="checkbox" ${appState.editor.distributionFreeMove!==false?'checked':''}><span>Movimiento libre de racks</span></label>
        <label style="display:flex;align-items:center;gap:8px"><input id="v205VertexSnap" type="checkbox" ${appState.editor.distributionVertexSnap!==false?'checked':''}><span>Alinear con vértices y bordes</span></label>
        <div class="layout-prop-title" style="margin-top:4px">Rotación y paralelismo</div>
        <label>Ángulo libre (0°–360°)<input id="v208RackAngle" type="number" min="0" max="360" step="0.1" inputmode="decimal" value="${findRackById(appState.selectedRackLayoutId)?Number(normalizeAngle(findRackById(appState.selectedRackLayoutId).rot||0).toFixed(2)):0}" ${!appState.selectedRackLayoutId?'disabled':''}></label>
        <label>Separación perpendicular (cm)<input id="v206AlignClearance" type="number" min="0" max="250" step="0.1" value="${Number(appState.editor.rackAlignClearanceCm??2)}"></label>
        <div class="layout-template-grid"><button type="button" class="seg-btn ${appState.editor.rackAlignMode==='wall'?'active':''}" id="v206AlignWall" ${!appState.selectedRackLayoutId?'disabled':''}>↗ Hacer paralelo a muro</button><button type="button" class="seg-btn ${appState.editor.rackAlignMode==='vertices'?'active':''}" id="v206AlignVertices" ${!appState.selectedRackLayoutId?'disabled':''}>↗ Paralelo a 2 vértices</button></div>
        <div class="layout-template-grid"><button type="button" class="seg-btn" id="v208ReapplyParallel" ${!appState.editor?.rackAlignLast || appState.editor?.rackAlignLast?.rackId!==appState.selectedRackLayoutId?'disabled':''}>Aplicar nueva separación</button><button type="button" class="seg-btn" id="v208ReverseParallel" ${!appState.selectedRackLayoutId?'disabled':''}>Invertir sentido 180°</button></div>
        ${appState.editor?.rackAlignLast?.rackId===appState.selectedRackLayoutId?`<p class="tiny muted" style="margin:0">Referencia: ${escapeHtml(appState.editor.rackAlignLast.reference)} · ajusta la separación y aplica sin volver a seleccionar la arista.</p>`:''}
        ${appState.editor.rackAlignMode?`<p class="tiny muted" style="padding:9px;border:1px dashed #4d8d72;border-radius:9px">${appState.editor.rackAlignMode==='wall'?'Haz clic sobre el muro o arista inclinada que deseas seguir.':'Haz clic en el primer y segundo vértice para marcar la dirección.'} Esc cancela.</p>`:''}
        <p class="tiny muted" style="margin:0">Libre: puedes mover fuera de zonas pequeñas sin que el rack regrese. Se advierten las interferencias sin bloquear. Desactívalo para exigir cabida y ausencia de colisiones. El snap general se mantiene independiente. Ctrl mientras arrastras: ignorar snap.</p>
      </div>
      <div class="layout-prop-title">Selección por altura</div><p class="tiny muted">Aísla N1 para seleccionar módulos inferiores aunque los niveles superiores tengan la misma huella.</p>${layoutLevelSelector()}<label class="layout-v200-rack-select">Seleccionar rack<select id="v200RackSelect"><option value="">Seleccionar rack</option>${(appState.layout?.racks||[]).filter(r=>rackVisibleAtLevel(r)).map(r=>`<option value="${escapeHtml(r.id)}" ${r.id===appState.selectedRackLayoutId?'selected':''}>${escapeHtml(r.displayCode||r.id)} · NPT +${Math.round(Number(r.baseHeight||0))}</option>`).join('')}</select></label><button type="button" class="seg-btn" id="v200ShowSections">${appState.editor.sectionVisible?'Ocultar secciones':'Ver secciones X/Y'}</button></section>`;
  }

  function layoutSelectedSummary(){
    const measurement = (appState.layout?.measurements || []).find(m => m.id === appState.editor?.selectedMeasurementId);
    const opening = findOpeningById(appState.selectedOpeningId);
    const wall = findWallById(appState.selectedWallId);
    const zone = findZoneById(appState.selectedZoneId);
    const room = findRoomById(appState.selectedRoomId);
    const rack = findRackById(appState.selectedRackLayoutId);
    if(isRackDistributionScreen()){
      if(rack) return { type:'rack', title:rack.displayCode||rack.id, subtitle:`${rack.zoneId} · ${escapeHtml((rackModel(rack.modelId)||{}).name || rack.modelId || 'Rack')}` };
      if(zone) return { type:'none', title:'Selecciona un rack', subtitle:`Zona ${zone.name||zone.id} · ${(appState.layout.racks||[]).filter(r=>r.zoneId===zone.id).length} racks disponibles` };
      return { type:'none', title:'Sin rack seleccionado', subtitle:'Selecciona o agrega un rack; la estructura está bloqueada' };
    }
    if(activeLayoutWorkspace()==='urbanism'){const st=(appState.layout?.streets||[]).find(x=>x.id===appState.selectedStreetId);return st?{type:'street',title:st.name||st.id,subtitle:'Calzada y vereda editables'}:{type:'none',title:'Selecciona una calle',subtitle:'Haz clic en una calle para editarla'};}
    if(measurement) return { type:'measure', title:'Medición', subtitle:`${measurement.id} · ${formatDistanceCm(Math.hypot(cadMeasurementEnds(measurement).b.x-cadMeasurementEnds(measurement).a.x,cadMeasurementEnds(measurement).b.y-cadMeasurementEnds(measurement).a.y))}` };
    if(opening){
      const host = findWallById(opening.wallId), kind=normalizeOpeningType(opening.type); const title=kind==='window'?'Ventana':kind==='free'?'Abertura libre':kind==='gate'?'Portón':'Puerta';
      return { type:'opening', title, subtitle:`${opening.id} · ${host?.id || 'sin muro'} · ${Math.round(Number(opening.width||90))} cm · cota ${Math.round(Number(opening.sill||0))} cm` };
    }
    if(wall){
      return { type:'wall', title:wall.name || wall.id, subtitle:`${wall.id} · ${formatDistanceCm(wallLength(wall))} · espesor ${formatDistanceCm(Number(wall.thickness||12))}` };
    }
    if(room){ const linked=getRoomLinkedZone(room); const area=polygonAreaAbs(roomPointsRaw(room))*getScaleCmPerUnit()*getScaleCmPerUnit()/10000; return { type:'room', title:room.name || room.id, subtitle:`${area.toFixed(2)} m² · ${linked ? `Zona dinámica ${linked.id}` : 'Disponible para convertir en zona'}` }; }
    if(zone) return { type:'zone', title:zone.name || zone.id, subtitle:`${zone.id} · ${(appState.layout.racks||[]).filter(r=>r.zoneId===zone.id).length} racks · ${isRoomLinkedZone(zone)?'vinculada a muros':'racks bloqueados'}` };
    return { type:'none', title:'Sin selección', subtitle:'Selecciona una zona, muro o vano; los racks están bloqueados' };
  }

  function formatUnitNumber(value){
    const n = Number(value || 0);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }

  function setRectZoneBounds(zone, updates={}){
    if(!zone || !Array.isArray(zone.pts) || zone.pts.length < 3) return;
    const b = zoneBounds(zone);
    const nextX = Number.isFinite(Number(updates.x)) ? Number(updates.x) : b.minX;
    const nextY = Number.isFinite(Number(updates.y)) ? Number(updates.y) : b.minY;
    const nextW = Math.max(40, Number.isFinite(Number(updates.w)) ? Number(updates.w) : (b.maxX - b.minX));
    const nextH = Math.max(40, Number.isFinite(Number(updates.h)) ? Number(updates.h) : (b.maxY - b.minY));
    // Mantener la forma irregular (inclusive cuadriláteros diagonales) al editar
    // ancho/alto: no convertir accidentalmente cuatro vértices en un rectángulo.
    const oldW=Math.max(1,b.maxX-b.minX),oldH=Math.max(1,b.maxY-b.minY);
    const candidate=zone.pts.map(pt=>({
      ...pt,x:snapGrid(nextX+((pt.x-b.minX)/oldW)*nextW),
      y:snapGrid(nextY+((pt.y-b.minY)/oldH)*nextH)
    }));
    const collision=findZoneOverlap(zone.id,candidate);
    if(collision){setZoneCollisionPreview(zone.id,collision,candidate);showToast(collision.reason==='outside'?'La zona debe permanecer dentro del área útil del local.':`Cambio bloqueado: ${collision.name||collision.id}.`,'warning',3000);return false;}
    zone.pts=candidate; clearZoneCollisionPreview();
    // v110: la estructura no reposiciona racks; se corrigen luego en Distribución de racks.
    return true;
  }

  function addWarehouseTemplate(){
    const bounds = getLayoutContentBounds();
    const x = snapGrid(bounds.x + bounds.w + 100);
    const y = snapGrid(bounds.y + 60);
    const id = nextZoneId();
    const zone = { id, kind:'virtual', name:'Almacén', color:'#62d7a0', wallThickness:14, pts:[{x,y},{x:x+520,y},{x:x+520,y:y+360},{x,y:y+360}] };
    const invalid=v209ZoneViolation('',zone.pts);
    if(invalid){showToast('No cabe una nueva zona aquí. Selecciona + Zona y un punto libre dentro del área comercial.','warning',3400);return;}
    appState.layout.zones.push(zone);
    appState.selectedZoneId = zone.id;
    appState.selectedRackLayoutId = '';
    normalizeZoneAndRackIds();
    persistActiveLayout();
    renderLayoutEditor();
  }

  function addZoneWithRackTemplate(){
    const bounds = getLayoutContentBounds();
    const x = snapGrid(bounds.x + bounds.w + 90);
    const y = snapGrid(bounds.y + 80);
    const id = nextZoneId();
    const zone = { id, kind:'virtual', name:`Zona ${id}`, color:v211ZoneColor(), wallThickness:14, pts:[{x,y},{x:x+420,y},{x:x+420,y:y+280},{x,y:y+280}] };
    const invalid=v209ZoneViolation('',zone.pts);
    if(invalid){showToast('No cabe la plantilla en el área útil sin invadir otras zonas.','warning',3400);return;}
    appState.layout.zones.push(zone);
    const fp = getRackFootprint(appState.selectedModelId, 0);
    const rack = { id:`${id}-E1`, zoneId:id, x:x+40, y:y+40, w:fp.w, h:fp.h, rot:0, modelId:appState.selectedModelId, front:'auto', baseHeight:0, rackHeight:(rackModel(appState.selectedModelId)?.height || 238) };
    appState.layout.racks.push(rack);
    appState.selectedZoneId = id;
    appState.selectedRackLayoutId = rack.id;
    normalizeZoneAndRackIds();
    persistActiveLayout();
    renderLayoutEditor();
  }

  function addRackRowTemplate(count=5){
    const zone = findZoneById(appState.selectedZoneId) || appState.layout.zones[0];
    if(!zone){ addZoneWithRackTemplate(); return; }
    const b = zoneBounds(zone);
    const fp = getRackFootprint(appState.selectedModelId, 0);
    const gap = 16;
    const totalW = (fp.w * count) + (gap * (count - 1));
    const startX = snapGrid(b.minX + Math.max(18, ((b.maxX - b.minX) - totalW) / 2));
    const y = snapGrid(b.minY + 38);
    for(let i=0;i<count;i++){
      const rack = { id:nextRackId(zone.id), zoneId:zone.id, x:startX + i*(fp.w+gap), y, w:fp.w, h:fp.h, rot:0, modelId:appState.selectedModelId, front:'auto', baseHeight:0, rackHeight:(rackModel(appState.selectedModelId)?.height || 238) };
      keepRackInsideZone(rack, zone);
      appState.layout.racks.push(rack);
      appState.selectedRackLayoutId = rack.id;
    }
    normalizeZoneAndRackIds();
    persistActiveLayout();
    renderLayoutEditor();
  }

  function distributeSelectedZoneRacks(){
    const zone = findZoneById(appState.selectedZoneId);
    if(!zone) return;
    const racks = (appState.layout.racks||[]).filter(r=>r.zoneId===zone.id).sort((a,b)=>a.x-b.x || a.y-b.y);
    if(racks.length < 2) return;
    const b = zoneBounds(zone);
    const margin = 24;
    const maxRackW = Math.max(...racks.map(r=>Number(r.w||0)), 1);
    const usableW = Math.max(1, (b.maxX-b.minX) - margin*2 - maxRackW);
    const step = racks.length === 1 ? 0 : usableW/(racks.length-1);
    racks.forEach((rack,i)=>{
      rack.x = snapGrid(b.minX + margin + step*i);
      rack.y = snapGrid(Math.max(b.minY+margin, Math.min(b.maxY - rack.h - margin, rack.y)));
      keepRackInsideZone(rack, zone);
    });
    persistActiveLayout();
    renderLayoutEditor();
  }

  function renderLayoutMiniMapMarkup(){
    const bounds = getLayoutContentBounds();
    const pad = 30;
    const vb = `${bounds.x-pad} ${bounds.y-pad} ${bounds.w+pad*2} ${bounds.h+pad*2}`;
    const zones = (appState.layout.zones||[]).map(zone => {
      const d = zone.pts.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ') + ' Z';
      const active = zone.id === appState.selectedZoneId;
      return `<path d="${escapeHtml(d)}" class="mini-zone ${active?'active':''}" fill="${escapeHtml(hexToRgba(zone.color||'#6ff0a8', active ? .32 : .16))}" stroke="${escapeHtml(zone.color||'#6ff0a8')}"/>`;
    }).join('');
    const walls = (appState.layout.walls||[]).map(w => `<line x1="${w.x1}" y1="${w.y1}" x2="${w.x2}" y2="${w.y2}" stroke="${w.id===appState.selectedWallId?'#ffd66f':'#d7e5f5'}" stroke-width="${Math.max(2, Number(w.thickness||12)/4)}" stroke-linecap="round" opacity=".9"/>`).join('');
    const openings = (appState.layout.openings||[]).map(o => { const wall=(appState.layout.walls||[]).find(w=>w.id===o.wallId); if(!wall) return ''; const seg=getOpeningSegment(o, wall); if(!seg) return ''; const d=wallDirection(wall); const n=getWallOpeningNormal(wall); const w=Math.max(28, Number(o.width||90)||90); const h=Math.max(48, Math.min(120, Number(o.visualHeight||80)||80)); const a={x:seg.center.x-d.x*h/2-n.x*w/2,y:seg.center.y-d.y*h/2-n.y*w/2}; const b={x:seg.center.x-d.x*h/2+n.x*w/2,y:seg.center.y-d.y*h/2+n.y*w/2}; const c={x:seg.center.x+d.x*h/2+n.x*w/2,y:seg.center.y+d.y*h/2+n.y*w/2}; const e={x:seg.center.x+d.x*h/2-n.x*w/2,y:seg.center.y+d.y*h/2-n.y*w/2}; return `<path d="M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y} L ${e.x} ${e.y} Z" fill="rgba(8,27,40,.92)" stroke="${o.id===appState.selectedOpeningId?'#7dffaf':'#5bf3d0'}" stroke-width="2"/>`; }).join('');
    const racks = (appState.layout.racks||[]).map(r => `<rect x="${r.x}" y="${r.y}" width="${Math.max(2,r.w)}" height="${Math.max(2,r.h)}" rx="4" class="mini-rack ${r.id===appState.selectedRackLayoutId?'active':''}"/>`).join('');
    return `<svg class="layout-mini-svg" viewBox="${vb}">${zones}${walls}${openings}${racks}</svg>`;
  }

  function renderLayerToggle(id, label, checked){
    return `<label class="layout-layer-toggle"><input type="checkbox" id="${id}" ${checked?'checked':''}><span>${label}</span></label>`;
  }

  function modularStackCard(rack){
    if(!rack)return '';
    const members=modularStackMembers(rack);
    const levels=modularStackLevels(rack);
    const counts=levels.length?levels.map(l=>l.count):[2,3,2];
    const sample=levels.length?levels[0].modules[0]:rack;
    const moduleWidth=Math.round(Number(sample.virtual?.width||rackModel(sample.modelId)?.width||sample.w||120));
    const moduleDepth=Math.round(Number(sample.virtual?.depth||rackModel(sample.modelId)?.depth||sample.h||60));
    const levelH=Math.round(Number(sample.rackHeight||80));
    const npt=levels.length?Math.round(levels[0].npt):Math.round(Number(rack.baseHeight||0));
    const wholeW=levels.length?Math.round(Math.max(...levels.map(l=>l.count))*moduleWidth):moduleWidth*3;
    const totalH=levels.length?Math.round(levels[levels.length-1].npt+levels[levels.length-1].height-npt):levelH*3;
    const blocks=counts.map((count,index)=>{
      const y=8+(counts.length-1-index)*38;
      const size=Math.min(46,212/Math.max(...counts));
      const left=(236-count*size)/2;
      return `<g><text x="5" y="${y+20}" fill="#596659" font-size="10" font-weight="700">N${index+1}</text>${Array.from({length:count},(_,mi)=>`<rect x="${left+mi*size}" y="${y}" width="${size-3}" height="31" rx="3" stroke="#fff" stroke-width="1.5" fill="${STACK_LEVEL_COLORS[index%STACK_LEVEL_COLORS.length]}"/><text x="${left+mi*size+(size-3)/2}" y="${y+20}" fill="white" text-anchor="middle" font-size="10" font-weight="700">${index+1}${String.fromCharCode(65+mi)}</text>`).join('')}</g>`;
    }).join('');
    const activeLevel=Math.max(0,Number(appState.editor.selectedStackLevel||0));
    return `<section class="layout-prop-card modular-stack-card">
      <div class="layout-prop-title">Apilamiento modular ${members.length?`· ${escapeHtml(rack.stackGroupId)}`:''}</div>
      <div class="tiny muted" style="margin-bottom:9px">Cada nivel puede tener diferente cantidad de módulos. El conjunto conserva sus piezas y materiales en 3D.</div>
      <div class="modular-stack-modes">
        <button type="button" id="stackCompact" class="seg-btn ${appState.editor.stackViewMode!=='expanded'?'active':''}">Planta compacta</button>
        <button type="button" id="stackExpanded" class="seg-btn ${appState.editor.stackViewMode==='expanded'?'active':''}">Ver niveles</button>
      </div>
      <div class="modular-stack-preview"><svg viewBox="0 0 250 ${Math.max(135,counts.length*38+16)}" role="img" aria-label="Elevación de conjunto apilado">${blocks}</svg><div class="tiny muted">${counts.join(' / ')} · ${wholeW} cm ancho · ${totalH} cm alto</div></div>
      <div class="layout-prop-grid two" style="margin-top:10px">
        <label>Cantidad por nivel<input id="stackCounts" type="text" value="${counts.join(',')}" placeholder="2,3,2" title="De abajo hacia arriba"></label>
        <label>Ancho de módulo (cm)<input id="stackWidth" type="number" min="20" max="800" value="${moduleWidth}"></label>
        <label>Profundidad (cm)<input id="stackDepth" type="number" min="20" max="500" value="${moduleDepth}"></label>
        <label>Altura por nivel (cm)<input id="stackLevelHeight" type="number" min="30" max="600" value="${members.length?levelH:Math.max(30,Math.round(levelH/3))}"></label>
        <label>Separación (cm)<input id="stackGap" type="number" min="0" max="100" value="2"></label>
        <label>Base NPT (cm)<input id="stackBaseNpt" type="number" min="0" max="20000" value="${npt}"></label>
        <label>Centro X (cm)<input id="stackCenterX" type="number" value="${Math.round((modularStackBounds(members.length?members:[rack])?.cx||0)*getScaleCmPerUnit())}"></label>
        <label>Centro Y (cm)<input id="stackCenterY" type="number" value="${Math.round((modularStackBounds(members.length?members:[rack])?.cy||0)*getScaleCmPerUnit())}"></label>
        <label style="grid-column:1/-1">Alineación<select id="stackAlign"><option value="center">Centrado</option><option value="left">Izquierda</option><option value="right">Derecha</option></select></label>
      </div>
      <div class="layout-template-grid" style="margin-top:10px"><button class="seg-btn primary" id="stackApply">${members.length?'Actualizar conjunto':'Crear conjunto 2 / 3 / 2'}</button>${members.length?'<button class="seg-btn" id="stackDissolve">Desagrupar módulos</button>':''}</div>
      ${members.length?`<div class="modular-stack-levels"><b>Niveles y módulos</b>${levels.slice().reverse().map(level=>`<div class="modular-stack-level"><div class="modular-stack-level-head" style="border-left:4px solid ${STACK_LEVEL_COLORS[level.index%STACK_LEVEL_COLORS.length]}">Nivel ${level.index+1} · ${level.count} módulos <span>NPT +${Math.round(level.npt)} cm</span></div><div class="modular-stack-member-grid">${level.modules.map(m=>`<button type="button" class="seg-btn ${m.id===rack.id?'active':''}" data-modular-rack="${escapeHtml(m.id)}" title="Seleccionar ${escapeHtml(m.id)}">${level.index+1}-${String.fromCharCode(65+Number(m.stackModuleIndex||0))}</button>`).join('')}</div></div>`).join('')}</div>
      <div class="layout-prop-grid two" style="margin-top:9px"><label>Mover X (cm)<input type="number" id="stackMoveX" value="0"></label><label>Mover Y (cm)<input type="number" id="stackMoveY" value="0"></label></div><button type="button" class="seg-btn" id="stackMoveApply">Mover conjunto con snap</button>
      <div class="tiny muted" style="margin-top:9px">Alt + arrastrar mueve el conjunto. La estabilidad estructural de salientes y apoyos debe verificarse antes de construir.</div>`:''}
    </section>`;
  }

  // V207: secciones del inspector con apertura estable entre redibujados.
  function layoutPanelOpen(section, defaultOpen=false){
    const panels=appState.editor?.layoutPanelOpen||{};
    return Object.prototype.hasOwnProperty.call(panels,section) ? !!panels[section] : defaultOpen;
  }
  function layoutFold(section, label, html, defaultOpen=false, hint=''){
    return `<details class="layout-v207-fold" data-layout-fold="${section}" ${layoutPanelOpen(section,defaultOpen)?'open':''}>
      <summary><span>${label}</span>${hint?`<small>${hint}</small>`:''}<span class="layout-v207-chevron" aria-hidden="true">⌄</span></summary>
      <div class="layout-v207-fold-body">${html}</div>
    </details>`;
  }
  function v207FocusZone(zone){
    if(!zone?.pts?.length)return;
    const bounds=zoneBounds(zone),svg=document.getElementById('layoutSvg');
    const width=Math.max(220,svg?.clientWidth||850),height=Math.max(180,svg?.clientHeight||600);
    const ratio=width/height;
    const padx=Math.max(55,(bounds.maxX-bounds.minX)*.16),pady=Math.max(50,(bounds.maxY-bounds.minY)*.16);
    let bw=Math.max(180,bounds.maxX-bounds.minX+padx*2),bh=Math.max(140,bounds.maxY-bounds.minY+pady*2);
    if(bw/bh<ratio)bw=bh*ratio;else bh=bw/ratio;
    appState.editor.viewBox={x:(bounds.minX+bounds.maxX-bw)/2,y:(bounds.minY+bounds.maxY-bh)/2,w:bw,h:bh};
    appState.editor.viewBoxCustomized=true;appState.editor.viewBoxInitialized=true;
    renderLayoutViewportOnly();
  }
  function renderLayoutRightPanelMarkup(){
    ensureLayoutEditorState();
    const zone = findZoneById(appState.selectedZoneId);
    const rack = findRackById(appState.selectedRackLayoutId);
    const summary = layoutSelectedSummary();
    const zoneB = zone ? zoneBounds(zone) : null;
    const model = rack ? rackModel(rack.modelId) : null;
    const fp = rack ? getRackFootprint(rack.modelId, rack.rot || 0) : null;
    const modelOptions = appState.models.map(m=>`<option value="${escapeHtml(m.id)}" ${rack?.modelId===m.id?'selected':''}>${escapeHtml(m.name)}</option>`).join('');
    const rackMode = isRackDistributionScreen();
    const urbanismMode = !rackMode && activeLayoutWorkspace()==='urbanism';
    const architectureMode = !rackMode && !urbanismMode;
    const structureMode = !rackMode;
    const focusIdentity=(rackMode?'rack:':urbanismMode?'street:':'architecture:')+(appState.selectedWallId||appState.selectedOpeningId||appState.selectedZoneId||appState.selectedStreetId||appState.selectedRackLayoutId||'none');
    if(appState.editor.layoutInspectorSelection!==focusIdentity){
      appState.editor.layoutInspectorSelection=focusIdentity;
      appState.editor.rightPanelScrollTop=0;
    }
    const zoneTools=architectureMode && zone && appState.editor.architectureTool==='zones' && !appState.selectedWallId && !appState.selectedOpeningId;
    const zoneRacks=zoneTools?(appState.layout.racks||[]).filter(r=>r.zoneId===zone.id).length:0;
    const metricsV209=architectureMode?v209AreaMetrics():null;
    const areaDashboard=architectureMode?`<section class="layout-v209-area-summary"><div class="layout-prop-title">Área interior útil · local comercial</div><div class="layout-v209-stats"><div><strong>${metricsV209.total.toFixed(2)}</strong><small>m² comerciales</small></div><div><strong>${metricsV209.assigned.toFixed(2)}</strong><small>m² zonificados</small></div><div><strong>${metricsV209.unassigned.toFixed(2)}</strong><small>m² libres</small></div></div><p class="tiny muted">${metricsV209.count} zonas virtuales · los muros son elementos físicos del área; dividir zonas no crea paredes.</p>${metricsV209.invalid?`<p class="tiny layout-v209-warning">${metricsV209.invalid} zona(s) heredadas necesitan ajuste: fuera del área, superposición o geometría inválida. No se han eliminado ni movido.</p>`:''}</section>`:'';
    const zoneList=architectureMode && appState.editor.architectureTool==='zones' ? `<section class="v211-zone-manager" aria-label="Gestor de zonas virtuales"><div class="layout-prop-title">Zonas virtuales · ${appState.layout.zones.length}</div><p class="tiny muted">Selecciona una zona por su color. Sus límites se editan en el plano; las paredes no se modifican.</p><div class="v211-zone-list">${appState.layout.zones.map(z=>`<button type="button" data-v211-zone="${escapeHtml(z.id)}" class="v211-zone-item ${z.id===appState.selectedZoneId?'active':''}"><span class="v211-zone-chip" style="background:${escapeHtml(z.color||'#72b58b')}"></span><b>${escapeHtml(z.name||z.id)}</b><small>${escapeHtml(z.id)}</small></button>`).join('')}</div>${v211OrphanRackCount()>0?`<div class="v211-orphans"><b>${v211OrphanRackCount()} rack(s) sin zona</b><div class="layout-prop-grid two"><select id="v211OrphanTarget"><option value="">Elegir destino</option>${appState.layout.zones.map(z=>`<option value="${escapeHtml(z.id)}">${escapeHtml(z.name||z.id)}</option>`).join('')}</select><button class="seg-btn" type="button" id="v211ReassignRacks">Reasignar</button></div></div>`:''}</section>`:'';
    const quickZone=zoneTools?`<section class="layout-v207-context-card" aria-label="Acciones de zona">
        <div class="layout-v207-zone-title"><span class="layout-v207-zone-dot" style="background:${escapeHtml(zone.color||'#4a896e')}"></span><div><strong>${escapeHtml(zone.name||zone.id)}</strong><small>${escapeHtml(zone.id)} · ${zoneRacks} racks vinculados</small></div></div>
        <button type="button" class="btn primary layout-v207-convert" id="v206ZoneToArea" title="Usa el contorno de la zona como nueva área principal">⇧ Convertir zona en área</button>
        <div class="layout-v207-context-actions"><button type="button" class="seg-btn" id="v211EditZone">✎ Editar perímetro</button><button type="button" class="seg-btn danger" id="v211DeleteZone">Eliminar zona</button></div><div class="layout-v207-context-actions"><button type="button" class="seg-btn" id="v207FocusZone">Centrar zona</button><button type="button" class="seg-btn" id="v207EditArea">Editar área</button></div>
        <p class="tiny muted">Zona virtual: no genera paredes. Al convertirla en área, todas las demás zonas deberán quedar dentro del nuevo perímetro.</p>
      </section>`:'';
    return `
      <div class="layout-right-head">
        <div><b>Inspector del layout</b></div>
        <span class="layout-type-pill">${summary.type === 'rack' ? 'Rack' : summary.type === 'zone' ? 'Zona' : summary.type === 'wall' ? 'Muro' : summary.type === 'opening' ? 'Opening' : summary.type === 'measure' ? 'Medida' : summary.type === 'room' ? 'Recinto' : summary.type === 'street' ? 'Calle' : 'Plano'}</span>
      </div>
      <div class="layout-right-scroll ${appState.editor.beginnerMode ? 'beginner-scroll' : ''}">
        ${!zoneTools?`<div class="layout-v207-selection"><span>Seleccionado</span><strong>${escapeHtml(summary.title)}</strong></div>`:''}
        ${architectureMode?v214CreationMarkup()+v212GeometryMarkup():''}
        ${!rackMode?v219TotalAreaMarkup():''}
        ${areaDashboard?layoutFold('metrics','Superficie comercial',areaDashboard,false,'Comercial · zonificada · libre'):''}
        ${zoneList}
        ${quickZone?layoutFold('zoneActions','Acciones de zona',quickZone,false,'Convertir · centrar · eliminar'):''}
        ${rackMode && rack ? modularStackCard(rack) : ''}
        ${layoutFold('visual','Capas y visibilidad',v213LayersMarkup(),false,'Mostrar · ocultar · bloquear')}
        ${layoutFold('precision','Precisión y snap',`        <section class="layout-prop-card">
          <div class="layout-prop-title">Precisión</div>
          <div class="layout-prop-grid two">
            <label>Snap<input id="rpSnapEnabled" type="checkbox" ${isSnapEnabled()?'checked':''}></label>
            <label>Orto (0°/90°)<input id="rpOrthoEnabled" type="checkbox" ${appState.editor.orthoEnabled?'checked':''}></label>
            <label>Tamaño snap<input id="rpSnapSize" type="number" min="1" max="80" step="1" value="${formatUnitNumber(getSnapSize())}"></label>
            <label>Tamaño letra cotas<input id="rpDimFontSize" type="number" min="10" max="18" step="1" value="${formatUnitNumber(getDimFontSize())}"></label>

          </div>

        </section>`,false,'Orto · rejilla · cotas')}
        ${rackMode ? layoutDistributionInspector() + v117RackToolsMarkup() + v117ValidationMarkup() : architectureMode ? layoutWallToolsMarkup() + (appState.editor.architectureTool!=='walls'?'':layoutFold('technical','Herramientas CAD',v117StructureToolsMarkup(),false,'Recintos · nodos · contactos')) : layoutUrbanismInspector()}
        <details class="layout-v207-fold layout-v207-tools" data-layout-fold="quick" ${layoutPanelOpen('quick',false)?'open':''}><summary><span>Herramientas adicionales</span><small>Acciones · referencia</small><span class="layout-v207-chevron" aria-hidden="true">⌄</span></summary><div class="layout-v207-fold-body">
        ${rackMode ? `<section class="layout-prop-card">
          <div class="layout-prop-title">Acciones rápidas</div>
          <div class="layout-template-grid">
            <button class="seg-btn" id="tplRackRow">Fila de racks</button>
            <button class="seg-btn" id="tplDistribute">Distribuir racks</button>
          </div>

        </section>` : architectureMode ? `<section class="layout-prop-card">
          <div class="layout-prop-title">Acciones rápidas</div>
          <div class="layout-template-grid"><button class="seg-btn" id="tplWarehouse">Agregar almacén / zona</button></div>
        </section>
        <section class="layout-prop-card">
          <div class="layout-prop-title">Fondo de referencia</div>
          <input type="file" id="layoutBgInput" accept="image/*" style="display:none">
          <div class="layout-template-grid">
            <button class="seg-btn" id="btnLayoutBgUpload">Subir imagen</button>
            <button class="seg-btn" id="btnLayoutBgClear" ${appState.layout?.meta?.backgroundImage ? '' : 'disabled'}>Quitar fondo</button>
          </div>

        </section>` : ''}
        </div></details>
        <details class="layout-v207-fold layout-v207-area" data-layout-fold="area" ${layoutPanelOpen('area',false)?'open':''} ${architectureMode&&appState.editor.architectureTool==='area'?'':'style="display:none"'}><summary><span>Área principal</span><small>Perímetro · posición · muros</small><span class="layout-v207-chevron" aria-hidden="true">⌄</span></summary><div class="layout-v207-fold-body">
        ${architectureMode ? `<section class="layout-prop-card layout-site-properties">
          <div class="layout-prop-title">Área general · perímetro editable</div>
          <div class="layout-template-grid">
            <button type="button" class="seg-btn ${appState.editor.editSiteBoundary?'active':''}" id="rpSiteEdit">${appState.editor.editSiteBoundary?'Ocultar puntos':'Editar vértices'}</button>
            <button type="button" class="seg-btn" id="rpSiteAddVertex">+ Vértice área</button>
            <button type="button" class="seg-btn" id="rpSiteReset">Ajustar a zonas</button>
            <button type="button" class="seg-btn ${appState.editor.areaMoveMode?'active':''}" id="v206MoveArea">${appState.editor.areaMoveMode?'Mover área: activo':'Mover área + muros'}</button>
          </div><div class="layout-prop-grid two" style="margin-top:10px">
            <label>Área X (cm)<input id="v206AreaX" type="number" step="1" value="${Math.round(layoutBoundaryBounds().minX*getScaleCmPerUnit())}"></label>
            <label>Área Y (cm)<input id="v206AreaY" type="number" step="1" value="${Math.round(layoutBoundaryBounds().minY*getScaleCmPerUnit())}"></label>
          </div><div class="layout-template-grid" style="margin-top:6px">
            <button type="button" class="seg-btn" id="v206AreaApplyCoordinates">Aplicar X / Y del área</button>
            <button type="button" class="seg-btn" id="v206AreaUndo">↶ Deshacer traslado</button>
            <button type="button" class="seg-btn" id="v206AreaRedo">↷ Rehacer traslado</button>
          </div>
          <div class="tiny muted layout-panel-hint">Mover área traslada en conjunto las zonas, muros, recintos, racks, cotas y mobiliario. La edición individual de vértices permanece disponible.</div>
        </section>` : ''}
        </div></details>
        ${architectureMode && findRoomById(appState.selectedRoomId) ? (()=>{ const rr=findRoomById(appState.selectedRoomId); const rp=roomPointsRaw(rr); const rz=getRoomLinkedZone(rr); const area=polygonAreaAbs(rp)*getScaleCmPerUnit()*getScaleCmPerUnit()/10000; const perimeter=rp.reduce((sum,p,i)=>{ const q=rp[(i+1)%rp.length]; return sum+Math.hypot(q.x-p.x,q.y-p.y); },0); return `<section class="layout-prop-card room-zone-card">
          <div class="layout-prop-title">Recinto</div>
          <div class="layout-prop-grid two">
            <label>ID<input value="${escapeHtml(rr.id)}" disabled></label>
            <label>Nombre<input id="rpRoomName" value="${escapeHtml(rr.name||rr.id)}"></label>
            <label>Área<input value="${area.toFixed(2)} m²" disabled></label>
            <label>Perímetro<input value="${formatDistanceCm(perimeter)}" disabled></label>
            <label>Vértices<input value="${rp.length}" disabled></label>
            <label>Estado<input value="${rz ? `Zona ${rz.id} vinculada` : 'Sin zona'}" disabled></label>
          </div>
          <div class="layout-template-grid" style="margin-top:10px">
            ${rz ? `<button class="seg-btn active" id="rpSelectLinkedZone">Seleccionar zona ${escapeHtml(rz.id)}</button>` : `<button class="btn primary" id="rpRoomToZone">Convertir recinto en zona</button>`}
            <button class="seg-btn" id="rpRoomAddVertex">+ Vértice área</button>
          </div>
          <div class="tiny muted layout-panel-hint" style="margin-top:8px">Puedes convertir este recinto en zona, o añadir un vértice al área. Si hay un muro del recinto seleccionado, el nuevo vértice se inserta en esa arista.</div>
        </section>`; })() : ''}
        ${urbanismMode && (appState.layout?.streets||[]).some(s=>s.id===appState.selectedStreetId) ? (()=>{const street=ensureStreetVisualDefaults(appState.layout.streets.find(s=>s.id===appState.selectedStreetId));return `<section class="layout-prop-card layout-street-properties">
          <div class="layout-prop-title">Calle seleccionada · ${escapeHtml(street.name||street.id)}</div>
          <div class="layout-prop-grid two">
            <label style="grid-column:1/-1">Nombre de la calle<input id="rpStreetName" value="${escapeHtml(street.name||street.id)}"></label>
            <label>Calzada (cm)<input id="rpStreetRoad" type="number" min="26" max="2400" step="1" value="${Math.round((street.roadWidth||600)*getScaleCmPerUnit())}"></label>
            <label>Veredas (cm)<input id="rpStreetWalk" type="number" min="20" max="1200" step="1" value="${Math.round((street.sidewalkWidth||240)*getScaleCmPerUnit())}"></label>
            <label>Canaletas (cm)<input id="rpStreetGutter" type="number" min="0" max="300" step="1" value="${Math.round((street.gutterWidth??60)*getScaleCmPerUnit())}"></label>
            <label>Tipo de calle<select id="rpStreetType">${Object.entries(STREET_SURFACE_PRESETS).map(([v,p])=>`<option value="${v}" ${street.roadType===v?'selected':''}>${p.label}</option>`).join('')}</select></label>
            <label>Tipo de vereda<select id="rpSidewalkType">${Object.entries(SIDEWALK_SURFACE_PRESETS).map(([v,p])=>`<option value="${v}" ${street.sidewalkType===v?'selected':''}>${p.label}</option>`).join('')}</select></label>
            <label>Esquinas<select id="rpStreetCorner"><option value="right" ${street.cornerStyle==='right'?'selected':''}>90°</option><option value="round" ${street.cornerStyle==='round'?'selected':''}>Redondeada</option><option value="diagonal" ${street.cornerStyle==='diagonal'?'selected':''}>Diagonal</option></select></label>
            <label>Editar geometría<select id="rpStreetPart"><option value="roadPts" ${appState.editor.streetVertexPart==='roadPts'?'selected':''}>Calzada</option><option value="sidewalkPts" ${appState.editor.streetVertexPart==='sidewalkPts'?'selected':''}>Vereda interior</option><option value="outerSidewalkPts" ${appState.editor.streetVertexPart==='outerSidewalkPts'?'selected':''}>Vereda exterior</option></select></label>
            <label>Mobiliario<input value="${(street.streetFurniture||[]).length ? '1 objeto agrupado' : 'Sin mobiliario'}" disabled></label>
            <label>Lado<input value="${escapeHtml(street.creation==='path'?'Por puntos':street.side||'')}" disabled></label>
          </div>
          <div class="layout-template-grid" style="margin-top:10px">
            <button type="button" class="seg-btn" id="rpStreetVertices">${appState.editor.streetVerticesVisible?'Ocultar vértices':'Editar vértices'}</button>
            <button type="button" class="seg-btn" id="rpStreetApply">Aplicar medidas</button>
            <button type="button" class="seg-btn" id="rpStreetReset">Restablecer vértices</button>
          </div>
          ${v220SidewalkTools(street)}
          <div class="layout-template-grid" style="margin-top:10px">
            <button type="button" class="seg-btn" id="rpStreetAddUrban">${(street.streetFurniture||[]).length ? 'Reemplazar mobiliario urbano' : '+ Mobiliario urbano'}</button>
            <button type="button" class="seg-btn" id="rpStreetClearFurniture" ${(street.streetFurniture||[]).length?'':'disabled'}>Quitar mobiliario</button>
          </div>
          ${(street.streetFurniture||[]).length?(() => {const u=getScaleCmPerUnit(),o=street.streetFurniture[0];return `<div class="layout-prop-grid two" style="margin-top:10px">
            <label>X mobiliario (cm)<input id="rpUrbanX" type="number" value="${Math.round(Number(o.x||0)*u)}"></label>
            <label>Y mobiliario (cm)<input id="rpUrbanY" type="number" value="${Math.round(Number(o.y||0)*u)}"></label>
            <label>Giro (°)<input id="rpUrbanRotation" type="number" min="-360" max="360" value="${Math.round(Number(o.rotation||0))}"></label>
          </div><button type="button" class="seg-btn" id="rpUrbanTransform">Aplicar posición y giro</button>`;})():''}
          <div class="tiny muted" style="margin-top:8px">El mobiliario urbano se trata como un solo objeto agrupado. Puedes seleccionarlo y moverlo con snap en el layout, manteniendo la misma lectura en 2D y en Diseñar espacio 3D.</div>
        </section>`;})() : ''}
        <details class="layout-v207-fold layout-v207-zone" data-layout-fold="zone" ${layoutPanelOpen('zone',false)?'open':''} ${architectureMode&&zone&&appState.editor.architectureTool==='zones'?'':'style="display:none"'}><summary><span>Propiedades de zona</span><small>Nombre · tamaño · acabado</small><span class="layout-v207-chevron" aria-hidden="true">⌄</span></summary><div class="layout-v207-fold-body">
        ${architectureMode && zone ? `<section class="layout-prop-card">
          <div class="layout-prop-title">Zona</div>
          <div class="layout-prop-grid two">
            <label>Nombre<input id="rpZoneName" value="${escapeHtml(zone.name||'')}"></label>
            <label>Código<input id="rpZoneCode" value="${escapeHtml(zone.id||'')}"></label>
            <label>X<input id="rpZoneX" type="number" value="${formatUnitNumber(zoneB.minX)}"></label>
            <label>Y<input id="rpZoneY" type="number" value="${formatUnitNumber(zoneB.minY)}"></label>
            <label>Ancho<input id="rpZoneW" type="number" min="40" value="${formatUnitNumber(zoneB.maxX-zoneB.minX)}" ${isRoomLinkedZone(zone)?'disabled':''}></label>
            <label>Alto<input id="rpZoneH" type="number" min="40" value="${formatUnitNumber(zoneB.maxY-zoneB.minY)}" ${isRoomLinkedZone(zone)?'disabled':''}></label>
            <label>Color<input id="rpZoneColor" type="color" value="${escapeHtml(zone.color||'#6ff0a8')}"></label><div class="v211-palette" style="grid-column:1/-1" aria-label="Paleta de colores">${V211_ZONE_COLORS.map(c=>`<button type="button" data-v211-color="${c}" style="--swatch:${c}" title="Color ${c}" aria-label="Color ${c}" class="${String(zone.color||'').toLowerCase()===c?'chosen':''}"></button>`).join('')}</div>
            <label style="grid-column:1/-1">Acabado de piso<select id="rpZoneFloor">
              ${[['default','Base cálida'],['porcelain-white','Porcelanato blanco 60×60'],['porcelain-ivory','Porcelanato marfil 60×60'],['porcelain-gray','Porcelanato gris 60×60'],['marble','Porcelanato mármol claro'],['concrete','Concreto pulido'],['wood','Madera clara']].map(([v,label])=>`<option value="${v}" ${(zone.floorFinish||'default')===v?'selected':''}>${label}</option>`).join('')}
            </select></label>
            <label>Escala cm/u<input id="rpScaleCm" type="number" min="0.1" step="0.1" value="${getScaleCmPerUnit()}"></label>
            <label>Rotación zona<input id="rpZoneRot" type="number" step="1" value="${Math.round(getZoneRotationDegrees(zone))}" ${isRoomLinkedZone(zone)?'disabled':''}></label>
            <label>Contenido<input value="${(appState.layout.racks||[]).filter(r => r.zoneId === zone.id).length} racks vinculados" disabled></label>
            ${isRoomLinkedZone(zone)?`<label>Geometría<input value="Vinculada · arrastrable" disabled></label>`:''}
          </div>
          <div class="v211-zone-merge"><label>Unir con zona colindante<select id="v211MergeTarget"><option value="">Seleccionar zona</option>${appState.layout.zones.filter(z=>z.id!==zone.id).map(z=>`<option value="${escapeHtml(z.id)}">${escapeHtml(z.name||z.id)}</option>`).join('')}</select></label><button type="button" class="seg-btn" id="v211MergeZones">Fusionar zonas</button><small>No se crean muros. Las superficies deben compartir una arista.</small></div>
          <details class="layout-v207-advanced" data-layout-fold="zoneAdvanced" ${layoutPanelOpen('zoneAdvanced',false)?'open':''}><summary>Edición avanzada <span>Vértices · giros · división</span></summary>
          <div class="layout-template-grid zone-rotate-grid" style="margin-top:10px">${isRoomLinkedZone(zone)?`<button class="seg-btn active" id="rpSelectZoneRoom">Editar muros del recinto</button><button class="seg-btn" id="rpDetachRoomZone">Desvincular geometría</button><button class="seg-btn" id="rpZoneAddVertex">+ Vértice zona</button><div class="tiny muted layout-panel-hint" style="grid-column:1/-1">Arrastra para mover toda la geometría vinculada.</div>`:`<button class="seg-btn" id="rpZoneMinus15">Girar -15°</button><button class="seg-btn" id="rpZone15">Girar 15°</button><button class="seg-btn" id="rpZone45">Girar 45°</button><button class="seg-btn" id="rpZone90">Girar 90°</button><button class="seg-btn" id="rpDuplicateZone">Duplicar zona</button><button class="seg-btn" id="rpLockZones">${appState.editor.zonesLocked?'Desbloquear zonas':'Bloquear zonas'}</button><button class="seg-btn" id="rpZoneAddVertex">+ Vértice zona</button><button class="seg-btn" id="rpZoneRemoveVertex">− Vértice</button><button class="seg-btn" id="rpZoneSplitVertical">Dividir vertical</button><button class="seg-btn" id="rpZoneSplitHorizontal">Dividir horizontal</button><button class="seg-btn" id="rpGoWalls">Abrir Muros físicos</button>`}</div>
          </details>
        </section>` : ''}
        </div></details>
        ${rackMode && rack ? `<section class="layout-prop-card">
          <div class="layout-prop-title">Rack</div>
          <div class="layout-prop-grid two">
            <label>ID<input value="${escapeHtml(rack.id)}" disabled></label>
            <label>Zona<input value="${escapeHtml(rack.zoneId)}" disabled></label>
            <label style="grid-column:1/-1">Nombre / nomenclatura<input id="rpRackDisplayCode" value="${escapeHtml(rack.displayCode||rack.id)}" placeholder="Ej. A-01-R03"></label>
            <label>Modelo<select id="rpRackModel">${modelOptions}</select></label>
            <label>Rotación (°)<input id="rpRackRot" type="number" min="0" max="360" step="0.1" value="${Number(normalizeAngle(rack.rot||0).toFixed(2))}"></label>
            <label>X<input id="rpRackX" type="number" value="${formatUnitNumber(rack.x)}"></label>
            <label>Y<input id="rpRackY" type="number" value="${formatUnitNumber(rack.y)}"></label>
            <label>Huella<input value="${formatUnitNumber(fp?.w||rack.w)} × ${formatUnitNumber(fp?.h||rack.h)}" disabled></label>
            <label>Altura<input id="rpRackHeight" type="number" min="60" step="10" value="${Math.round(Number(rack.rackHeight || model?.height || 238))}"></label>
            <label>NPT (cm desde suelo)<input id="rpRackNpt" type="number" min="0" max="20000" step="1" value="${Math.round(Number(rack.baseHeight||0))}"></label>
          </div>
          <div class="layout-template-grid" style="margin-top:10px"><button class="seg-btn" id="rpDuplicateRack">Duplicar rack</button><button class="seg-btn" id="rpRack45">Girar 45°</button><button class="seg-btn" id="rpRack90">Girar 90°</button><button class="seg-btn" id="rpAddAbove">Agregar encima</button></div>
        </section>` : ''}
        ${architectureMode && findWallById(appState.selectedWallId) ? (()=>{ const sw=findWallById(appState.selectedWallId); const na=!sw.autoZoneEdge?getWallNode(sw.startNodeId):null; const nb=!sw.autoZoneEdge?getWallNode(sw.endNodeId):null; const linkedA=na?wallsForNode(na.id).length:0; const linkedB=nb?wallsForNode(nb.id).length:0; return `<section class="layout-prop-card wall-pro-card">
          <div class="layout-prop-title">Muro</div>
          <div class="layout-prop-grid two">
            <label>ID<input value="${escapeHtml(sw.id)}" disabled></label>
            <label>Nombre<input id="rpWallName" value="${escapeHtml(sw.name||'Muro')}"></label>
            <label>Longitud (cm)<input id="rpWallLength" type="number" min="10" step="1" value="${Math.round(unitsToCm(wallLength(sw)))}" ${sw.autoZoneEdge?'disabled':''}></label>
            <label>Ángulo (°)<input id="rpWallAngle" type="number" step="1" value="${Math.round(v117WallAngleDeg(sw))}" ${sw.autoZoneEdge?'disabled':''}></label>
            <label>Espesor (cm)<input id="rpWallThickness" type="number" min="4" max="80" step="1" value="${Math.round(unitsToCm(sw.thickness||12))}"></label>
            <label>Altura 3D (cm)<input id="rpWallHeight" type="number" min="120" max="600" step="5" value="${Math.round(unitsToCm(sw.height||290))}"></label>
            <label>Posición del espesor<select id="rpWallPlacement"><option value="inside" ${normalizeWallPlacement(sw.placement)==='inside'?'selected':''}>Hacia dentro de zona</option><option value="outside" ${normalizeWallPlacement(sw.placement)==='outside'?'selected':''}>Hacia fuera de zona</option><option value="center" ${normalizeWallPlacement(sw.placement)==='center'?'selected':''}>Centrado al eje</option></select></label>
            </div><details class="v213-geometry" data-layout-fold="wallEndpoints" ${layoutPanelOpen('wallEndpoints',false)?'open':''}><summary>Extremos y traslado exacto</summary><div class="layout-prop-grid two"><label>Conexiones<input value="A:${linkedA} · B:${linkedB}" disabled></label>
            ${!sw.autoZoneEdge && na ? `<label>Inicio X (cm)<input id="rpWallAX" type="number" step="1" value="${Math.round(unitsToCm(na.x))}"></label><label>Inicio Y (cm)<input id="rpWallAY" type="number" step="1" value="${Math.round(unitsToCm(na.y))}"></label>` : ''}
            ${!sw.autoZoneEdge && nb ? `<label>Final X (cm)<input id="rpWallBX" type="number" step="1" value="${Math.round(unitsToCm(nb.x))}"></label><label>Final Y (cm)<input id="rpWallBY" type="number" step="1" value="${Math.round(unitsToCm(nb.y))}"></label>` : ''}
          </div>
          ${!sw.autoZoneEdge?`<div class="layout-prop-grid two" style="margin-top:10px"><label>Mover ΔX (cm)<input id="rpWallMoveX" type="number" step="1" value="0"></label><label>Mover ΔY (cm)<input id="rpWallMoveY" type="number" step="1" value="0"></label></div>`:''}</details>
          <div class="layout-template-grid" style="margin-top:10px">
            <button class="seg-btn" id="rpWallDuplicate">Duplicar muro</button><button class="seg-btn" id="rpWallMoveExact">Mover exacto</button>
            <button class="seg-btn" id="rpWallAddFree">Agregar abertura</button>
            <button class="seg-btn" id="rpWallAddDoor">Agregar puerta</button>
            <button class="seg-btn" id="rpWallAddWindow">Agregar ventana</button>
            <button class="seg-btn danger" id="rpWallDelete">Eliminar muro</button>
          </div>
          <div class="tiny muted layout-panel-hint" style="margin-top:8px">Los extremos comparten nodos para mantener uniones limpias.</div>
        </section>`; })() : ''}
        ${architectureMode && findOpeningById(appState.selectedOpeningId) ? `<section class="layout-prop-card opening-editor-card">
          <div class="layout-prop-title">Vano / apertura</div>
          ${(() => { const op=findOpeningById(appState.selectedOpeningId); const wall=findWallById(op?.wallId); const info=getOpeningPositionInfo(op, wall); const type=normalizeOpeningType(op.type); return `<div class="tiny muted" style="margin-bottom:10px">Arrastra el vano sobre el muro o ajusta su posición exacta. ${wall ? `Muro ${escapeHtml(wall.id)}` : ''}</div>
          <div class="layout-prop-grid two">
            <label>ID<input value="${escapeHtml(op.id)}" disabled></label>
            <label>Tipo<select id="rpOpeningType"><option value="free" ${type==='free'?'selected':''}>Abertura libre</option><option value="door" ${type==='door'?'selected':''}>Puerta</option><option value="window" ${type==='window'?'selected':''}>Ventana</option><option value="gate" ${type==='gate'?'selected':''}>Portón</option></select></label>
            <label>Ancho (cm)<input id="rpOpeningWidth" type="number" min="40" max="600" step="5" value="${formatUnitNumber(op.width||90)}"></label>
            <label>Alto (cm)<input id="rpOpeningHeight" type="number" min="20" max="600" step="5" value="${formatUnitNumber(op.height || openingDefaultForType(type).height)}"></label>
            <label>${type==='window'?'Antepecho (cm)':'Cota inferior (cm)'}<input id="rpOpeningSill" type="number" min="0" max="600" step="5" value="${formatUnitNumber(op.sill || 0)}" ${type==='door'||type==='gate'?'disabled':''}></label>
            <label>Profundidad<input id="rpOpeningDepth" type="number" min="4" max="120" step="1" value="${formatUnitNumber(op.depth || wall?.thickness || 14)}"></label>
            <label>Posición %<input id="rpOpeningT" type="number" min="1" max="99" step="1" value="${Math.round((op.t || .5)*100)}"></label>
            <label>Desde inicio<input id="rpOpeningLeft" type="number" min="0" step="5" value="${info ? formatUnitNumber(info.left) : 0}"></label>
            <label>Hasta final<input value="${info ? formatUnitNumber(info.right) : 0}" disabled></label>
            <label>Muro<input value="${wall ? formatUnitNumber(wall.thickness || 14) : 14}" disabled></label>
          </div>
          <div class="opening-position-control">
            <div class="opening-position-line"><span style="left:${Math.max(1,Math.min(99,Math.round((op.t||.5)*100)))}%"></span></div>
            <input id="rpOpeningSlider" type="range" min="1" max="99" step="1" value="${Math.round((op.t || .5)*100)}" style="width:100%;margin-top:10px">
          </div>
          <div class="layout-template-grid" style="margin-top:10px"><button class="seg-btn" id="rpOpening25">25%</button><button class="seg-btn" id="rpOpeningCenter">50%</button><button class="seg-btn" id="rpOpening75">75%</button><button class="seg-btn" id="rpOpeningNudgeLeft">◀ 0.25 m</button><button class="seg-btn" id="rpOpeningNudgeRight">0.25 m ▶</button><button class="seg-btn" id="rpOpeningDuplicate">Duplicar</button><button class="seg-btn" id="rpOpeningFlip">Invertir apertura</button><button class="seg-btn" id="rpOpeningDelete">Eliminar</button></div>
          <div class="tiny muted layout-panel-hint" style="margin-top:8px">${type==='free'?'Usa la cota inferior para controlar si la abertura nace del piso o queda elevada.':'Puedes arrastrar el vano sobre el muro y se actualizará también en 3D.'}</div>` })()}
        </section>` : ''}
        ${architectureMode && appState.editor?.selectedMeasurementId ? (()=>{ const mm=(appState.layout.measurements||[]).find(m=>m.id===appState.editor.selectedMeasurementId); if(!mm) return ''; const ends=cadMeasurementEnds(mm),dx=ends.b.x-ends.a.x,dy=ends.b.y-ends.a.y,scale=getScaleCmPerUnit(); return `<section class="layout-prop-card"><div class="layout-prop-title">Cota asociativa · ${escapeHtml(mm.id)}</div><div class="layout-prop-grid two"><label>Longitud real<input value="${formatDistanceCm(Math.hypot(dx,dy))}" disabled></label><label>Desplazamiento (cm)<input id="rpMeasureOffset" type="number" step="1" value="${formatUnitNumber(Number(mm.offset||0)*scale)}"></label><label>ΔX (cm)<input value="${formatUnitNumber(Math.abs(dx)*scale)}" disabled></label><label>ΔY (cm)<input value="${formatUnitNumber(Math.abs(dy)*scale)}" disabled></label></div><div class="tiny muted" style="margin-top:7px">Arrastra la línea de cota para cambiar su separación. Al mover A o B, la longitud se actualiza automáticamente.</div><button class="seg-btn danger" id="rpMeasureDelete" style="margin-top:10px">Eliminar cota</button></section>`; })() : ''}
      </div>`;
  }

  // V205 — el usuario dirige el movimiento; la zona es una referencia lógica,
  // no una pinza que recoloca el mueble durante cada frame del arrastre.
  function distributionIsFreeMove(){return appState.editor?.distributionFreeMove!==false;}
  function distributionHostForRack(rack){
    const c={x:Number(rack.x||0)+Number(rack.w||0)/2,y:Number(rack.y||0)+Number(rack.h||0)/2};
    return (appState.layout?.zones||[]).find(z=>pointInPoly(c,z.pts)) || findZoneById(rack.zoneId) || nearestZoneForPoint(c);
  }
  function distributionRackPlacement(rack, x, y, opts={}){
    const n={...rack,x:Number(x)||0,y:Number(y)||0};
    const snapping=isSnapEnabled()&&!opts.ignoreSnap;
    if(snapping){n.x=snapGrid(n.x);n.y=snapGrid(n.y);}
    clearRackSnapPreview();
    if(snapping && appState.editor?.distributionVertexSnap!==false){
      const points=[],segments=[],vertexPoints=[];
      const addEdges=pts=>{(pts||[]).forEach((pt,i)=>{const q=pts[(i+1)%pts.length];points.push(pt);vertexPoints.push(pt);if(q && pts.length>1){segments.push([pt,q]);points.push({x:(pt.x+q.x)/2,y:(pt.y+q.y)/2});}});};
      (appState.layout?.zones||[]).forEach(zone=>addEdges(zone.pts||[]));
      (appState.layout?.wallNodes||[]).forEach(pt=>{points.push(pt);vertexPoints.push(pt);});
      (appState.layout?.racks||[]).filter(r=>r.id!==rack.id&&!opts.ignoreRackIds?.includes(r.id)).forEach(other=>{
        addEdges(rackCorners(other));
        points.push({x:other.x+other.w/2,y:other.y+other.h/2});
      });
      const moving=[...rackCorners(n),{x:n.x+n.w/2,y:n.y+n.h/2}];
      // Tolerancia pequeña en unidades del plano; no hay atracción a distancia.
      const threshold=Math.max(3,Math.min(14,getSnapSize()*3));
      let bestPoint=null,best2=threshold*threshold*2.0;
      let bestX=null,bestY=null,distX=threshold,distY=threshold;
      for(const anchor of moving){
        for(const target of points){
          const dx=Number(target.x)-anchor.x,dy=Number(target.y)-anchor.y;
          const d2=dx*dx+dy*dy;
          if(d2<best2){best2=d2;bestPoint={dx,dy,anchor,target};}
          if(Math.abs(dx)<distX){distX=Math.abs(dx);bestX={dx,anchor,target};}
          if(Math.abs(dy)<distY){distY=Math.abs(dy);bestY={dy,anchor,target};}
        }
        // Extensiones/aristas: proyección del vértice del rack al tramo real.
        for(const [a,b] of segments){
          const vx=b.x-a.x,vy=b.y-a.y,den=vx*vx+vy*vy;
          if(den<=1e-9)continue;
          const t=Math.max(0,Math.min(1,((anchor.x-a.x)*vx+(anchor.y-a.y)*vy)/den));
          const target={x:a.x+t*vx,y:a.y+t*vy};
          const dx=target.x-anchor.x,dy=target.y-anchor.y,d2=dx*dx+dy*dy;
          if(d2<best2){best2=d2;bestPoint={dx,dy,anchor,target};}
        }
      }
      // Un vértice real tiene prioridad sobre un punto proyectado de arista,
      // siempre que el cursor haya entrado en su radio de captura.
      let vertexHit=null,vertexDist=threshold*threshold*2;
      for(const anchor of moving){for(const target of vertexPoints){
        const dx=target.x-anchor.x,dy=target.y-anchor.y,d2=dx*dx+dy*dy;
        if(d2<vertexDist){vertexDist=d2;vertexHit={dx,dy,anchor,target};}
      }}
      if(vertexHit)bestPoint=vertexHit;
      if(bestPoint){
        n.x+=bestPoint.dx;n.y+=bestPoint.dy;
        setRackSnapPreview({type:'vertex',strength:'hard',line:[bestPoint.anchor,bestPoint.target]});
      }else{
        if(bestX)n.x+=bestX.dx;
        if(bestY)n.y+=bestY.dy;
        const match=bestX||bestY;
        if(match)setRackSnapPreview({type:'vertex',strength:'medium',line:[match.anchor,match.target]});
      }
    }
    const host=distributionHostForRack(n);
    if(host)n.zoneId=host.id;
    return n;
  }
  function distributionRackInterference(rack,ignoreIds=[]){
    const host=distributionHostForRack(rack);
    if(!host||!rackFullyInsideZone(rack,host))return 'El rack queda parcial o totalmente fuera de la zona; puedes ajustarlo después.';
    const ignored=new Set([rack.id,...ignoreIds]);
    const other=(appState.layout?.racks||[]).find(r=>!ignored.has(r.id) &&
      typeof vspaceStackIntersect==='function' && vspaceStackIntersect(rack,r));
    return other ? `Posible colisión con ${other.displayCode||other.id}.` : '';
  }
  function distributionCanCommit(rack,ignoreIds=[]){
    if(distributionIsFreeMove())return true;
    const host=distributionHostForRack(rack);
    if(!host||!rackFullyInsideZone(rack,host))return false;
    const ignored=new Set([rack.id,...ignoreIds]);
    return !(appState.layout?.racks||[]).some(r=>!ignored.has(r.id) &&
      typeof vspaceStackIntersect==='function' && vspaceStackIntersect(rack,r));
  }
  // V206: Alineación 2D a un segmento real; la rotación y posición se calculan
  // antes de modificar el objeto para conservar una operación Undo atómica.
  function v206AlignRackToSegment(a,b,reference='muro'){
    const rack=findRackById(appState.editor?.rackAlignTargetId||appState.selectedRackLayoutId);
    if(!rack){showToast('Selecciona primero el rack que deseas alinear.','warning',2600);return false;}
    const vx=Number(b?.x)-Number(a?.x),vy=Number(b?.y)-Number(a?.y);
    const len=Math.hypot(vx,vy);if(!Number.isFinite(len)||len<1){showToast('Se necesitan dos puntos distintos para alinear.','warning',2200);return false;}
    const baseAngle=normalizeAngle(Math.atan2(vy,vx)*180/Math.PI);
    const reverseAngle=normalizeAngle(baseAngle+180);
    const desired=Math.abs(shortestAngleDelta(rack.rot||0,baseAngle))<=Math.abs(shortestAngleDelta(rack.rot||0,reverseAngle))?baseAngle:reverseAngle;
    const fp=getRackFootprint(rack.modelId,desired);
    const baseH=Math.max(4,Number(fp.baseH||rack.h||40));
    const oldCenter={x:Number(rack.x||0)+Number(rack.w||fp.w)/2,y:Number(rack.y||0)+Number(rack.h||fp.h)/2};
    const ux=vx/len,uy=vy/len,nx=-uy,ny=ux;
    const signed=(oldCenter.x-a.x)*nx+(oldCenter.y-a.y)*ny;
    let side=signed>=0?1:-1;
    if(Math.abs(signed)<.01){
      const positive={x:a.x+nx*(baseH/2+5),y:a.y+ny*(baseH/2+5)};
      const zone=findZoneById(rack.zoneId);
      side=zone&&!pointInPoly(positive,zone.pts)?-1:1;
    }
    const along=(oldCenter.x-a.x)*ux+(oldCenter.y-a.y)*uy;
    const clamped=Math.max(0,Math.min(len,along));
    const cm=Math.max(0,Math.min(250,Number(appState.editor.rackAlignClearanceCm)||0));
    const clearance=cm/Math.max(.0001,getScaleCmPerUnit());
    const target={x:a.x+ux*clamped+nx*side*(baseH/2+clearance),y:a.y+uy*clamped+ny*side*(baseH/2+clearance)};
    const proposal={...rack,rot:desired,w:fp.w,h:fp.h,x:target.x-fp.w/2,y:target.y-fp.h/2};
    const host=distributionHostForRack(proposal);if(host)proposal.zoneId=host.id;
    if(!distributionCanCommit(proposal)){
      showToast('La alineación genera una colisión o sale de la zona. Activa Movimiento libre para permitirla.','warning',3600);return false;
    }
    const prior={x:rack.x,y:rack.y,w:rack.w,h:rack.h,rot:rack.rot,zoneId:rack.zoneId};
    if(['x','y','w','h','rot','zoneId'].every(k=>Math.abs(Number(prior[k])-Number(proposal[k]))<1e-7 || prior[k]===proposal[k])){
      appState.editor.rackAlignLast={rackId:rack.id,a:{x:Number(a.x),y:Number(a.y)},b:{x:Number(b.x),y:Number(b.y)},reference};
      appState.editor.rackAlignMode='';appState.editor.rackAlignVertexA=null;renderLayoutEditor();return true;
    }
    recordHistorySnapshot('distribution');
    Object.assign(rack,{x:proposal.x,y:proposal.y,w:proposal.w,h:proposal.h,rot:desired,zoneId:proposal.zoneId});
    appState.selectedRackLayoutId=rack.id;appState.selectedZoneId=rack.zoneId;
    appState.editor.rackAlignLast={rackId:rack.id,a:{x:Number(a.x),y:Number(a.y)},b:{x:Number(b.x),y:Number(b.y)},reference};
    appState.editor.rackAlignMode='';appState.editor.rackAlignVertexA=null;appState.editor.rackAlignTargetId='';
    persistActiveLayout();renderLayoutEditor();
    const collision=distributionRackInterference(rack);
    showToast(`Rack paralelo a ${reference} · ${desired.toFixed(1)}°${collision?' · '+collision:''}`,collision?'warning':'success',3300);
    return true;
  }
  function v206ChooseAlignPoint(pt){
    if(appState.editor.rackAlignMode!=='vertices')return false;
    const point={x:Number(pt.x),y:Number(pt.y)};
    if(!appState.editor.rackAlignVertexA){appState.editor.rackAlignVertexA=point;renderLayoutSvg($('#layoutSvg'));renderLayoutInspector();return true;}
    if(Math.hypot(point.x-appState.editor.rackAlignVertexA.x,point.y-appState.editor.rackAlignVertexA.y)<1){showToast('Selecciona otro vértice para definir la dirección.','warning',2200);return true;}
    return v206AlignRackToSegment(appState.editor.rackAlignVertexA,point,'dos vértices');
  }
  function v206BeginRackAlign(mode){
    if(!findRackById(appState.selectedRackLayoutId)){showToast('Primero selecciona un rack.','warning',2400);return;}
    appState.editor.rackAlignTargetId=appState.selectedRackLayoutId;
    appState.editor.rackAlignMode=appState.editor.rackAlignMode===mode?'':mode;
    appState.editor.rackAlignVertexA=null;
    appState.editor.mode='select';renderLayoutEditor();
  }

  // Traslada el sitio y TODO su contenido desde una fotografía inicial.
  // El desplazamiento conserva ID de muros y racks, NPT, links de recintos y cotas.
  function v206TranslateAreaSnapshot(origin,dx,dy){
    const layout=appState.layout;if(!layout||!origin)return;
    const indexById=items=>new Map((items||[]).map(item=>[item.id,item]));
    const zonesById=indexById(origin.zones),nodesById=indexById(origin.wallNodes),wallsById=indexById(origin.walls);
    const racksById=indexById(origin.racks),measuresById=indexById(origin.measurements),streetsById=indexById(origin.streets);
    const movePoints=(dest,src)=>{if(!Array.isArray(dest)||!Array.isArray(src))return;dest.forEach((pt,i)=>{if(!src[i])return;pt.x=Number(src[i].x||0)+dx;pt.y=Number(src[i].y||0)+dy;});};
    ensureLayoutMeta();
    layout.meta.autoFitBoundaryToZones=false;
    movePoints(layout.meta.siteBoundary?.pts,origin.meta?.siteBoundary?.pts);
    (layout.zones||[]).forEach(zone=>{const old=zonesById.get(zone.id);if(old)movePoints(zone.pts,old.pts);});
    (layout.wallNodes||[]).forEach(node=>{const old=nodesById.get(node.id);if(old){node.x=Number(old.x||0)+dx;node.y=Number(old.y||0)+dy;}});
    (layout.walls||[]).forEach(w=>{const old=wallsById.get(w.id);if(old){w.x1=Number(old.x1||0)+dx;w.y1=Number(old.y1||0)+dy;w.x2=Number(old.x2||0)+dx;w.y2=Number(old.y2||0)+dy;}});
    (layout.racks||[]).forEach(r=>{const old=racksById.get(r.id);if(old){r.x=Number(old.x||0)+dx;r.y=Number(old.y||0)+dy;}});
    (layout.measurements||[]).forEach(m=>{const old=measuresById.get(m.id);if(!old)return;for(const field of ['a','b','p1','p2','start','end'])if(m[field]&&old[field]){m[field].x=Number(old[field].x||0)+dx;m[field].y=Number(old[field].y||0)+dy;}for(const field of ['x','x1','x2','y','y1','y2'])if(Number.isFinite(Number(old[field])))m[field]=Number(old[field])+((field[0]==='x')?dx:dy);});
    (layout.streets||[]).forEach(st=>{const old=streetsById.get(st.id);if(!old)return;for(const field of ['roadPts','sidewalkPts','outerSidewalkPts','axisPts'])movePoints(st[field],old[field]);(st.streetFurniture||[]).forEach(it=>{const oi=(old.streetFurniture||[]).find(n=>n.id===it.id);if(oi){it.x=Number(oi.x||0)+dx;it.y=Number(oi.y||0)+dy;}});});
  }
  function v206MoveAreaBy(dx,dy){
    if(typeof v213LayerLocked==='function'&&['zones','walls','openings','racks'].some(v213LayerLocked)){showToast('Desbloquea las capas antes de trasladar el área con todo su contenido.','warning');return;}
    if(appState.layout.meta?.siteBoundary?.locked||(appState.layout.zones||[]).some(z=>z.locked)){showToast('Desbloquea el área y sus zonas para trasladar el conjunto.','warning');return;}
    if(!Number.isFinite(dx)||!Number.isFinite(dy)||(!dx&&!dy))return;
    const original=clone(appState.layout);
    recordHistorySnapshot('layout',original);
    v206TranslateAreaSnapshot(original,dx,dy);
    syncManualWallsFromNodes();
    persistActiveLayout();renderLayoutEditor();
  }
  function v206PromoteZoneToArea(zone){
    if(appState.layout.meta?.siteBoundary?.locked){showToast('Desbloquea el área antes de reemplazarla.','warning');return;}
    if(!zone||!Array.isArray(zone.pts)||zone.pts.length<3)return;
    const others=(appState.layout?.zones||[]).filter(z=>z.id!==zone.id);
    const out=others.filter(z=>!v209ZoneInsideArea(z.pts,zone.pts));
    if(out.length){showToast(`No se puede convertir: ${out.length} zona(s) quedarían fuera del nuevo perímetro. Reubícalas primero.`, 'warning',5200);return false;}
    if(typeof v214ApplyArea==='function'){if(!v214ApplyArea(clone(zone.pts)))return false;appState.layout.meta.siteBoundary.name=zone.name||`Área de ${zone.id}`;appState.layout.meta.promotedFromZoneId=zone.id;persistActiveLayout('conversión de zona en área');renderLayoutEditor();return true;}
    recordHistorySnapshot('structure');ensureLayoutMeta();
    appState.layout.meta.siteBoundary={id:'AREA-GENERAL',name:zone.name||`Área de ${zone.id}`,pts:clone(zone.pts)};
    appState.layout.meta.autoFitBoundaryToZones=false;
    appState.layout.meta.promotedFromZoneId=zone.id;
    rebuildStreetNetwork();persistActiveLayout();renderLayoutEditor();
    if(out.length)showToast(`Área actualizada. ${out.length} zona(s) quedan fuera del nuevo perímetro; se conservan para no perder racks ni datos.`, 'warning',5200);
    else showToast('Zona convertida en perímetro del área. Se conservan sus racks y nomenclatura.', 'success',3500);
  }
  function v194RotateRack(rack,angle){
    if(!rack)return false;
    const numeric=Number(angle);
    if(!Number.isFinite(numeric)){showToast('Introduce un ángulo válido de 0° a 360°.','warning',2500);return false;}
    const desired=normalizeAngle(numeric);
    if(Math.abs(shortestAngleDelta(desired,Number(rack.rot||0)))<0.00001)return true;
    const prior={x:rack.x,y:rack.y,w:rack.w,h:rack.h,rot:rack.rot,zoneId:rack.zoneId};
    const cx=Number(rack.x||0)+Number(rack.w||0)/2;
    const cy=Number(rack.y||0)+Number(rack.h||0)/2;
    // No usar applyRackRotation: llamaba a keepRackSnapped y podía desplazar
    // involuntariamente el rack incluso con "Movimiento libre" activo.
    const fp=getRackFootprint(rack.modelId,desired);
    const proposal={...rack,rot:desired,w:fp.w,h:fp.h,x:cx-fp.w/2,y:cy-fp.h/2};
    const host=distributionHostForRack(proposal);
    if(host)proposal.zoneId=host.id;
    if(!distributionCanCommit(proposal)){
      showToast('El giro provoca una colisión o sale de la zona. Activa Movimiento libre para permitirlo.','warning',3000);
      renderLayoutEditor();return false;
    }
    recordHistorySnapshot('distribution');
    Object.assign(rack,{rot:desired,w:fp.w,h:fp.h,x:proposal.x,y:proposal.y,zoneId:proposal.zoneId});
    appState.selectedRackLayoutId=rack.id;
    persistActiveLayout();renderLayoutEditor();
    return true;
  }

  function bindLayoutRightPanel(){
    v212BindGeometryPanel();
    document.querySelectorAll('[data-layout-fold]').forEach(el=>{
      el.addEventListener('toggle',evt=>{
        if(evt.target!==el)return;
        appState.editor.layoutPanelOpen=appState.editor.layoutPanelOpen||{};
        appState.editor.layoutPanelOpen[el.dataset.layoutFold]=!!el.open;
      });
    });
    const rightScroller = document.querySelector('#layoutRightPanel .layout-right-scroll');
    if(rightScroller){
      rightScroller.scrollTop = appState.editor?.rightPanelScrollTop || 0;
      rightScroller.onscroll = () => { appState.editor.rightPanelScrollTop = rightScroller.scrollTop || 0; };
    }
    const stackRack=findRackById(appState.selectedRackLayoutId);
    if($('#stackCompact')) $('#stackCompact').onclick=()=>{appState.editor.stackViewMode='compact';renderLayoutEditor();};
    if($('#stackExpanded')) $('#stackExpanded').onclick=()=>{appState.editor.stackViewMode='expanded';renderLayoutEditor();};
    if($('#stackApply')) $('#stackApply').onclick=()=>{
      if(!stackRack)return;
      const text=String($('#stackCounts')?.value||'2,3,2').trim();
      if(!/^\d+(\s*,\s*\d+){0,5}$/.test(text)){showToast('Introduce cantidades separadas por comas, por ejemplo: 2,3,2.','warning',2800);return;}
      const counts=text.split(',').map(v=>Number(v.trim()));
      if(counts.some(n=>n<1||n>8)){showToast('Cada nivel admite de 1 a 8 módulos.','warning',2600);return;}
      const options={widthCm:Number($('#stackWidth')?.value||120),depthCm:Number($('#stackDepth')?.value||60),levelHeightCm:Number($('#stackLevelHeight')?.value||80),gapCm:Number($('#stackGap')?.value||2),baseNpt:Number($('#stackBaseNpt')?.value||0),align:$('#stackAlign')?.value||'center',centerX:Number($('#stackCenterX')?.value||0)/Math.max(.01,getScaleCmPerUnit()),centerY:Number($('#stackCenterY')?.value||0)/Math.max(.01,getScaleCmPerUnit())};
      const result=applyModularStack(stackRack.id,counts,options);
      if(!result.ok){showToast(result.msg,'warning',3700);return;}
      showToast(`Conjunto creado: ${counts.join(' / ')} módulos por nivel.`,'success',2800);
      renderLayoutEditor();
    };
    if($('#stackDissolve')) $('#stackDissolve').onclick=()=>{if(!stackRack?.stackGroupId)return;dissolveModularStack(stackRack.stackGroupId);renderLayoutEditor();};
    if($('#stackMoveApply')) $('#stackMoveApply').onclick=()=>{
      if(!stackRack?.stackGroupId)return;
      const u=Math.max(.01,getScaleCmPerUnit());
      const dx=snapGrid(Number($('#stackMoveX')?.value||0)/u),dy=snapGrid(Number($('#stackMoveY')?.value||0)/u);
      if(!dx&&!dy)return;
      const group=modularStackMembers(stackRack); const original=group.map(r=>({x:r.x,y:r.y}));
      const moved=moveModularStack(stackRack.stackGroupId,dx,dy);
      if(!moved.ok){showToast(moved.msg,'warning',3200);return;}
      group.forEach((r,i)=>{r.x=original[i].x;r.y=original[i].y;});
      recordHistorySnapshot(isRackDistributionScreen()?'distribution':'structure');
      group.forEach((r,i)=>{r.x=original[i].x+dx;r.y=original[i].y+dy;});
      persistActiveLayout();renderLayoutEditor();
    };
    document.querySelectorAll('[data-modular-rack]').forEach(btn=>btn.onclick=()=>{
      const target=findRackById(btn.getAttribute('data-modular-rack'));if(!target)return;
      appState.selectedRackLayoutId=target.id;appState.editor.selectedStackLevel=getRackStackLevel(target);
      renderLayoutEditor();
    });
    const bindCheck = (id, key, rerender=true) => {
      const el = document.getElementById(id);
      if(!el) return;
      el.onchange = e => { appState.editor[key] = !!e.target.checked; if(rerender) renderLayoutEditor(); else renderLayoutSvg(document.getElementById('layoutSvg')); };
    };
    bindCheck('lyGrid','showGrid');
    bindCheck('lyZones','showZones');
    bindCheck('lyWalls','wallsVisible');
    bindCheck('lyOpenings','openingsVisible');
    bindCheck('lyRacks','racksVisible');
    bindCheck('lyLabels','showLabels');
    bindCheck('lyDims','showDims');
    bindCheck('lyMini','showMiniMap');
    if($('#rpOrthoEnabled')) $('#rpOrthoEnabled').onchange=e=>{appState.editor.orthoEnabled=!!e.target.checked;renderLayoutEditor();};
    if($('#rpSnapEnabled')) $('#rpSnapEnabled').onchange = e => { appState.editor.snapEnabled = !!e.target.checked; clearRackSnapPreview(); persistActiveLayout(); renderLayoutEditor(); };
    const updateSnapSize = value => { appState.editor.snapSize = Math.max(1, Math.min(80, Number(value || DEFAULT_GRID_SIZE) || DEFAULT_GRID_SIZE)); appState.editor.snapPrecisionMigrated = true; persistActiveLayout(); renderLayoutEditor(); };
    const updateDimFont = value => { appState.editor.dimFontSize = Math.max(10, Math.min(18, Number(value || DEFAULT_DIM_FONT_SIZE) || DEFAULT_DIM_FONT_SIZE)); appState.editor.dimFontMigrated = true; persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpSnapSize')) $('#rpSnapSize').onchange = e => updateSnapSize(e.target.value);
    if($('#rpDimFontSize')) $('#rpDimFontSize').onchange = e => updateDimFont(e.target.value);
    if($('#layoutSnapEnabled')) $('#layoutSnapEnabled').onchange = e => { appState.editor.snapEnabled = !!e.target.checked; clearRackSnapPreview(); persistActiveLayout(); renderLayoutEditor(); };
    if($('#layoutSnapSize')) $('#layoutSnapSize').onchange = e => updateSnapSize(e.target.value);
    if($('#layoutDimFontSize')) $('#layoutDimFontSize').onchange = e => updateDimFont(e.target.value);
    const selectedStreet=(appState.layout?.streets||[]).find(s=>s.id===appState.selectedStreetId)||null;
    v220BindSidewalkTools();
    if($('#rpStreetName')) $('#rpStreetName').onchange=e=>{if(!selectedStreet)return;const name=String(e.target.value||'').trim();if(!name||name===selectedStreet.name)return;recordHistorySnapshot('structure');selectedStreet.name=name;persistActiveLayout();renderLayoutEditor();};
    if($('#rpStreetPart')) $('#rpStreetPart').onchange=e=>{appState.editor.streetVertexPart=e.target.value;renderLayoutEditor();};
    if($('#rpStreetVertices')) $('#rpStreetVertices').onclick=()=>{appState.editor.streetAxisVisible=false;appState.editor.streetVerticesVisible=!appState.editor.streetVerticesVisible;renderLayoutEditor();};
    if($('#rpStreetApply')) $('#rpStreetApply').onclick=()=>{
      if(!selectedStreet)return;const cm=Math.max(.0001,getScaleCmPerUnit());
      const values={roadWidth:Math.max(26,Math.min(2400,Number($('#rpStreetRoad')?.value)||600))/cm,gutterWidth:Math.max(0,Math.min(300,Number($('#rpStreetGutter')?.value)||0))/cm,sidewalkWidth:Math.max(20,Math.min(1200,Number($('#rpStreetWalk')?.value)||240))/cm,cornerStyle:v220Corner($('#rpStreetCorner')?.value),roadType:Object.hasOwn(STREET_SURFACE_PRESETS,$('#rpStreetType')?.value)?$('#rpStreetType').value:'drain-covered',sidewalkType:Object.hasOwn(SIDEWALK_SURFACE_PRESETS,$('#rpSidewalkType')?.value)?$('#rpSidewalkType').value:'paver'};
      if(typeof v221ApplyStreetProfile==='function'){if(!v221ApplyStreetProfile(selectedStreet,values))return;}else{recordHistorySnapshot('structure');Object.assign(selectedStreet,values);}
      rebuildStreetNetwork();persistActiveLayout('medidas de calle');renderLayoutEditor();
    };
    if($('#rpStreetReset')) $('#rpStreetReset').onclick=()=>{
      if(!selectedStreet)return;
      recordHistorySnapshot('structure');
      selectedStreet.vertexOffsets={};selectedStreet.manualSidewalks={};selectedStreet.fitSidewalkToArea=false;rebuildStreetNetwork();persistActiveLayout();renderLayoutEditor();
    };
    if($('#rpStreetType')) $('#rpStreetType').onchange=e=>{ if(!selectedStreet)return;recordHistorySnapshot('structure'); ensureStreetVisualDefaults(selectedStreet); selectedStreet.roadType=Object.hasOwn(STREET_SURFACE_PRESETS,e.target.value)?e.target.value:'drain-covered'; rebuildStreetNetwork();persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpSidewalkType')) $('#rpSidewalkType').onchange=e=>{ if(!selectedStreet)return;recordHistorySnapshot('structure'); ensureStreetVisualDefaults(selectedStreet); selectedStreet.sidewalkType=Object.hasOwn(SIDEWALK_SURFACE_PRESETS,e.target.value)?e.target.value:'paver'; persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpStreetAddUrban')) $('#rpStreetAddUrban').onclick=()=>{ if(!selectedStreet)return; const item=setStreetFurnitureUrbanSet(selectedStreet); appState.selectedStreetFurnitureId=item?.id||''; persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpUrbanTransform')) $('#rpUrbanTransform').onclick=()=>{
      if(!selectedStreet?.streetFurniture?.length)return;
      const item=selectedStreet.streetFurniture[0],u=Math.max(.0001,getScaleCmPerUnit());
      const p={x:Number($('#rpUrbanX')?.value)/u,y:Number($('#rpUrbanY')?.value)/u};
      if(!Number.isFinite(p.x)||!Number.isFinite(p.y))return;
      if(!v220PointOnSidewalk(p,selectedStreet)){showToast('El mobiliario debe ubicarse sobre una vereda.','warning',2200);return;}
      recordHistorySnapshot('structure');
      item.x=isSnapEnabled()?snapGrid(p.x):p.x;item.y=isSnapEnabled()?snapGrid(p.y):p.y;
      item.rotation=Math.max(-360,Math.min(360,Number($('#rpUrbanRotation')?.value)||0));
      appState.selectedStreetFurnitureId=item.id;persistActiveLayout();renderLayoutEditor();
    };
    if($('#rpStreetClearFurniture')) $('#rpStreetClearFurniture').onclick=()=>{ if(!selectedStreet)return; clearStreetFurniture(selectedStreet); appState.selectedStreetFurnitureId=''; persistActiveLayout(); renderLayoutEditor(); };
    const zone = findZoneById(appState.selectedZoneId);
    const room = findRoomById(appState.selectedRoomId);
    const rack = findRackById(appState.selectedRackLayoutId);
    if($('#rpSiteEdit')) $('#rpSiteEdit').onclick=()=>v212SetMode('area');
    if($('#v206MoveArea'))$('#v206MoveArea').onclick=()=>{appState.editor.areaMoveMode=!appState.editor.areaMoveMode;appState.editor.mode='select';renderLayoutEditor();};
    if($('#v206AreaApplyCoordinates'))$('#v206AreaApplyCoordinates').onclick=()=>{const cm=Math.max(.0001,getScaleCmPerUnit()),b=layoutBoundaryBounds();const x=Number($('#v206AreaX')?.value),y=Number($('#v206AreaY')?.value);if(!Number.isFinite(x)||!Number.isFinite(y))return;v206MoveAreaBy(x/cm-b.minX,y/cm-b.minY);};
    if($('#v206AreaUndo'))$('#v206AreaUndo').onclick=()=>undoHistory('layout');
    if($('#v206AreaRedo'))$('#v206AreaRedo').onclick=()=>redoHistory('layout');
    if($('#v206ZoneToArea'))$('#v206ZoneToArea').onclick=()=>{const z=findZoneById(appState.selectedZoneId);if(z)v206PromoteZoneToArea(z);};
    if($('#v207FocusZone'))$('#v207FocusZone').onclick=()=>v207FocusZone(findZoneById(appState.selectedZoneId));
    if($('#v207EditArea'))$('#v207EditArea').onclick=()=>v212SetMode('area');
    if($('#rpSiteAddVertex')) $('#rpSiteAddVertex').onclick=()=>v212Insert('area',appState.editor.areaEdgeIndex||0);
    if($('#rpSiteReset')) $('#rpSiteReset').onclick=()=>{
      if(appState.layout.meta.siteBoundary?.locked){showToast('Desbloquea el área antes de editarla.','warning');return;}
      ensureLayoutMeta();if(typeof v214ApplyArea==='function'){const b=zoneContentBounds();if(!b)return;const px=Math.max(18,Math.min(42,b.w*.04)),py=Math.max(18,Math.min(42,b.h*.05));v212Commit('area',[{x:b.minX-px,y:b.minY-py},{x:b.maxX+px,y:b.minY-py},{x:b.maxX+px,y:b.maxY+py},{x:b.minX-px,y:b.maxY+py}]);return;}recordHistorySnapshot('structure');
      appState.layout.meta.autoFitBoundaryToZones=true;fitSiteBoundaryToZones(true);rebuildStreetNetwork();
      persistActiveLayout();renderLayoutEditor();
    };
    if($('#rpRoomName')) $('#rpRoomName').onchange = e => { if(!room) return; room.name=String(e.target.value||room.name||room.id); persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpRoomToZone')) $('#rpRoomToZone').onclick = () => { if(!room) return; convertRoomToZone(room); renderLayoutEditor(); };
    if($('#rpRoomAddVertex')) $('#rpRoomAddVertex').onclick = () => { if(!room) return; insertVertexOnSelectedRoom(); };
    if($('#rpSelectLinkedZone')) $('#rpSelectLinkedZone').onclick = () => { const linked=room?getRoomLinkedZone(room):null; if(!linked) return; appState.selectedZoneId=linked.id; appState.selectedRoomId=room.id; renderLayoutEditor(); };
    if($('#rpSelectZoneRoom')) $('#rpSelectZoneRoom').onclick = () => { const rr=zone?getRoomForZone(zone):null; if(!rr) return; appState.selectedRoomId=rr.id; appState.selectedWallId=''; appState.selectedOpeningId=''; renderLayoutEditor(); };
    if($('#rpDetachRoomZone')) $('#rpDetachRoomZone').onclick = () => { if(zone && detachRoomZone(zone)){ renderLayoutEditor(); } };
    document.querySelectorAll('[data-v211-zone]').forEach(btn=>btn.onclick=()=>{appState.editor.architectureTool='zones';appState.editor.editSiteBoundary=false;appState.selectedZoneId=btn.dataset.v211Zone;appState.editor.focusInspectorTop=true;appState.selectedWallId='';appState.selectedOpeningId='';appState.selectedVertex={zoneId:'',idx:-1};appState.editor.mode='select';renderLayoutEditor();});
    if($('#v211DeleteZone')) $('#v211DeleteZone').onclick=()=>v211DeleteZone(zone?.id);
    if($('#v211EditZone')) $('#v211EditZone').onclick=()=>{
      appState.editor.architectureTool='zones';appState.editor.editSiteBoundary=false;
      if(!zone)return;
      if(isRoomLinkedZone(zone)){
        if(typeof window!=='undefined' && !window.confirm('Esta zona heredada está vinculada a un recinto físico. ¿Separar la delimitación virtual de sus muros para poder editarla? Los muros se conservarán.'))return;
        recordHistorySnapshot('structure');const room=findRoomById(zone.linkedRoomId);
        if(room?.zoneId===zone.id)delete room.zoneId;
        delete zone.linkedRoomId;delete zone.dynamicFromRoom;delete zone.roomLinkBroken;zone.source='manual';
        persistActiveLayout();
      }
      appState.selectedZoneId=zone.id;appState.editor.mode='select';appState.editor.zonesLocked=false;appState.editor.showZones=true;
      showToast('Arrastra vértices o aristas. Los vértices comunes de zonas contiguas se desplazan juntos.','success',3200);
      renderLayoutEditor();
    };
    if($('#v211MergeZones')) $('#v211MergeZones').onclick=()=>v211MergeZones(zone?.id,$('#v211MergeTarget')?.value);
    if($('#v211ReassignRacks')) $('#v211ReassignRacks').onclick=()=>v211ReassignOrphanRacks($('#v211OrphanTarget')?.value);
    document.querySelectorAll('[data-v211-color]').forEach(btn=>btn.onclick=()=>{if(!zone)return;recordHistorySnapshot('structure');zone.color=btn.dataset.v211Color;persistActiveLayout();renderLayoutEditor();});
    if($('#rpZoneAddVertex')) $('#rpZoneAddVertex').onclick = () => {
      if(!zone || isRoomLinkedZone(zone)){
        if(isRoomLinkedZone(zone)){appState.selectedRoomId=getRoomForZone(zone)?.id||'';insertVertexOnSelectedRoom();}
        return;
      }
      if(appState.selectedEdge?.zoneId!==zone.id){
        let best={len:-1,a:0,b:1};
        (zone.pts||[]).forEach((a,i,pts)=>{const b=pts[(i+1)%pts.length];const len=Math.hypot(a.x-b.x,a.y-b.y);if(len>best.len)best={len,a:i,b:(i+1)%pts.length};});
        appState.selectedEdge={zoneId:zone.id,a:best.a,b:best.b};
      }
      insertVertexOnSelectedEdge();
    };
    if($('#rpZoneSplitVertical')) $('#rpZoneSplitVertical').onclick=()=>splitSelectedZoneByAxis('x');
    if($('#rpZoneSplitHorizontal')) $('#rpZoneSplitHorizontal').onclick=()=>splitSelectedZoneByAxis('y');
    if($('#rpZoneRemoveVertex')) $('#rpZoneRemoveVertex').onclick = () => { if(!zone) return; if(appState.selectedVertex?.zoneId!==zone.id) showToast('Primero selecciona un vértice de la zona.','warning',2300); else removeSelectedVertex(); };
    const applyZoneGeometry = () => {
      if(!zone||zone.locked) return;
      const linkedRoom=getRoomForZone(zone);
      if(linkedRoom){
        const b=zoneBoundsOf(zone);
        const nx=Number($('#rpZoneX')?.value); const ny=Number($('#rpZoneY')?.value);
        const dx=Number.isFinite(nx)?nx-b.minX:0; const dy=Number.isFinite(ny)?ny-b.minY:0;
        if(dx||dy) translateRoomGeometry(linkedRoom,dx,dy,{snap:false});
      }else{
        const before=snapshotForType('structure');
        const changed=setRectZoneBounds(zone, { x:$('#rpZoneX')?.value, y:$('#rpZoneY')?.value, w:$('#rpZoneW')?.value, h:$('#rpZoneH')?.value });
        if(changed)recordHistorySnapshot('structure',before);
      }
      persistActiveLayout(); renderLayoutEditor();
    };
    if($('#rpZoneName')) $('#rpZoneName').onchange = e => {if(!zone)return;recordHistorySnapshot('structure');zone.name = e.target.value;persistActiveLayout();renderLayoutEditor();};
    if($('#rpZoneCode')) $('#rpZoneCode').onchange = e => {if(!zone)return;if(!v211RenameZone(zone.id,e.target.value))renderLayoutEditor();};
    ['rpZoneX','rpZoneY','rpZoneW','rpZoneH'].forEach(id=>{ const el=$('#'+id); if(el) el.onchange = applyZoneGeometry; });
    if($('#rpZoneColor')) $('#rpZoneColor').onchange = e => {if(!zone)return;recordHistorySnapshot('structure');zone.color=e.target.value;persistActiveLayout();renderLayoutEditor();};
    if($('#rpZoneFloor')) $('#rpZoneFloor').onchange = e => { if(!zone)return; zone.floorFinish=Object.hasOwn(FLOOR_FINISHES,e.target.value)?e.target.value:'default'; persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpScaleCm')) $('#rpScaleCm').onchange = e => { ensureLayoutMeta(); appState.layout.meta.scaleCmPerUnit = Math.max(0.1, Number(e.target.value||1)||1); persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpZoneRot')) $('#rpZoneRot').onchange = e => { if(zone && !isRoomLinkedZone(zone)) setZoneRotation(zone.id, Number(e.target.value || 0) || 0); };
    if($('#rpZoneMinus15')) $('#rpZoneMinus15').onclick = () => { if(zone && !isRoomLinkedZone(zone)) rotateZoneWithContents(zone.id, -15); };
    if($('#rpZone15')) $('#rpZone15').onclick = () => { if(zone && !isRoomLinkedZone(zone)) rotateZoneWithContents(zone.id, 15); };
    if($('#rpZone45')) $('#rpZone45').onclick = () => { if(zone && !isRoomLinkedZone(zone)) rotateZoneWithContents(zone.id, 45); };
    if($('#rpZone90')) $('#rpZone90').onclick = () => { if(zone && !isRoomLinkedZone(zone)) rotateZoneWithContents(zone.id, 90); };
    if($('#rpDuplicateZone')) $('#rpDuplicateZone').onclick = () => duplicateSelectedZone();
    if($('#rpLockZones')) $('#rpLockZones').onclick = () => { appState.editor.zonesLocked = !appState.editor.zonesLocked; persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpAllEdgesWalls')) $('#rpAllEdgesWalls').onclick = () => {
      if(!zone) return;
      (zone.pts || []).forEach((_, idx) => setZoneEdgeWall(zone, idx, { thickness:getZoneWallThickness(zone), height:Number(appState.layout?.meta?.defaultWallHeight || 290) || 290 }));
      syncZonePerimeterWalls(); persistActiveLayout(); renderLayoutEditor();
    };
    if($('#rpClearEdgesWalls')) $('#rpClearEdgesWalls').onclick = () => {
      if(!zone) return;
      const ids=new Set();
      (zone.pts||[]).forEach((_,idx)=>{ const w=findManualWallForZoneEdge(zone,idx); if(w && (w.sharedRoomIds||[]).length<=1) ids.add(w.id); });
      if(ids.size){
        appState.layout.walls=(appState.layout.walls||[]).filter(w=>!ids.has(w.id));
        appState.layout.openings=(appState.layout.openings||[]).filter(o=>!ids.has(o.wallId));
        pruneOrphanWallNodes(); v117RefreshRooms(); syncRoomLinkedZones();
      }
      cleanupDetachedOpenings(); persistActiveLayout(); renderLayoutEditor();
    };

    const applyRackPosition = () => {
      if(!rack) return;
      const prior={x:rack.x,y:rack.y,zoneId:rack.zoneId};
      const x=Number($('#rpRackX')?.value), y=Number($('#rpRackY')?.value);
      if(!Number.isFinite(x)||!Number.isFinite(y))return;
      const candidate=distributionRackPlacement(rack,x,y);
      if(!distributionCanCommit(candidate)){showToast('Ubicación restringida por zona o colisión. Activa Movimiento libre para continuar.','warning',2800);renderLayoutEditor();return;}
      if(Math.abs(prior.x-candidate.x)<.001&&Math.abs(prior.y-candidate.y)<.001&&prior.zoneId===candidate.zoneId)return;
      recordHistorySnapshot('distribution');
      Object.assign(rack,{x:candidate.x,y:candidate.y,zoneId:candidate.zoneId});
      persistActiveLayout();renderLayoutEditor();
    };
    if($('#rpRackDisplayCode')) $('#rpRackDisplayCode').onchange=e=>{if(!rack)return;const label=String(e.target.value||'').trim().slice(0,80);if(!label||label===(rack.displayCode||rack.id))return;recordHistorySnapshot('distribution');rack.displayCode=label;persistActiveLayout();renderLayoutEditor();};
    if($('#rpRackModel')) $('#rpRackModel').onchange = e => { if(!rack) return; rack.modelId=e.target.value; syncRackFootprint(rack,true); const host=findZoneById(rack.zoneId); if(host && !distributionIsFreeMove()) keepRackSnapped(rack, host); persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpRackRot')) $('#rpRackRot').onchange = e => v194RotateRack(rack,e.target.value);
    if($('#rpRackX')) $('#rpRackX').onchange = applyRackPosition;
    if($('#rpRackY')) $('#rpRackY').onchange = applyRackPosition;
    if($('#rpRackHeight')) $('#rpRackHeight').onchange = e => { if(!rack) return; rack.rackHeight = Math.max(60, Number(e.target.value||60)||60); persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpRackNpt')) $('#rpRackNpt').onchange=e=>{if(!rack)return;const npt=Math.max(0,Math.min(20000,Number(e.target.value)||0));if(Math.abs(Number(rack.baseHeight||0)-npt)<.001)return;const trial={...rack,baseHeight:npt};if(typeof vspaceFits==='function'&&!vspaceFits(trial,rack.id).ok){showToast('Elevación NPT bloqueada por colisión.','warning',2600);renderLayoutEditor();return;}recordHistorySnapshot('distribution');rack.baseHeight=npt;persistActiveLayout();renderLayoutEditor();};
    if($('#rpDuplicateRack')) $('#rpDuplicateRack').onclick = () => duplicateSelectedRack();
    if($('#rpRack45')) $('#rpRack45').onclick = () => v194RotateRack(rack,Number(rack?.rot||0)+45);
    if($('#rpRack90')) $('#rpRack90').onclick = () => v194RotateRack(rack,Number(rack?.rot||0)+90);
    if($('#rpAddAbove')) $('#rpAddAbove').onclick = () => { if(!rack) return; duplicateRackLayout(rack.id); };

    const selectedWall = findWallById(appState.selectedWallId);
    const selectedOpening = findOpeningById(appState.selectedOpeningId);
    if($('#rpGoWalls')) $('#rpGoWalls').onclick=()=>{appState.editor.architectureTool='walls';appState.editor.mode='select';renderLayoutEditor();};
    if($('#v203WallPlacement')) $('#v203WallPlacement').onchange=e=>{appState.editor.wallDefaultPlacement=normalizeWallPlacement(e.target.value);};
    if($('#v203WallThickness')) $('#v203WallThickness').oninput=e=>{const n=Number(e.target.value);if(Number.isFinite(n))appState.editor.wallDraftThickness=n;};
    if($('#v203WallHeight')) $('#v203WallHeight').oninput=e=>{const n=Number(e.target.value);if(Number.isFinite(n))appState.editor.wallDraftHeight=n;};
    if($('#v203WallApply')) $('#v203WallApply').onclick=()=>{
      const ctx=getSelectedEdgeWallContext(); const active=ctx?.zone?findManualWallForZoneEdge(ctx.zone,ctx.edgeIndex):findWallById(appState.selectedWallId);
      if(!ctx&&!active)return;
      const scale=Math.max(.001,getScaleCmPerUnit());
      const placement=normalizeWallPlacement($('#v203WallPlacement')?.value||'inside');
      const thickness=Math.max(4,Math.min(80,Number(appState.editor.wallDraftThickness ?? $('#v203WallThickness')?.value ?? 12)))/scale;
      const height=Math.max(100,Math.min(800,Number(appState.editor.wallDraftHeight ?? $('#v203WallHeight')?.value ?? 290)))/scale;
      recordHistorySnapshot('structure');
      const target=ctx?setZoneEdgeWall(ctx.zone,ctx.edgeIndex,{thickness,height,placement}):active;
      if(target){ target.thickness=thickness;target.height=height;target.placement=placement;appState.selectedWallId=target.id;}
      appState.editor.wallDefaultPlacement=placement;
      syncZonePerimeterWalls();persistActiveLayout();renderLayoutEditor();
    };
    if($('#v203WallRemove')) $('#v203WallRemove').onclick=()=>{
      const ctx=getSelectedEdgeWallContext();const selected=ctx?.zone?findManualWallForZoneEdge(ctx.zone,ctx.edgeIndex):findWallById(appState.selectedWallId);
      if(!selected)return;
      recordHistorySnapshot('structure');
      if(ctx?.zone)removeZoneEdgeWall(ctx.zone,ctx.edgeIndex);
      else{appState.layout.walls=(appState.layout.walls||[]).filter(w=>w.id!==selected.id);appState.layout.openings=(appState.layout.openings||[]).filter(o=>o.wallId!==selected.id);pruneOrphanWallNodes();}
      appState.selectedWallId='';syncZonePerimeterWalls();persistActiveLayout();renderLayoutEditor();
    };
    if($('#v203WallPerimeter')) $('#v203WallPerimeter').onclick=()=>{
      const ctx=getSelectedEdgeWallContext();if(!ctx?.zone)return;
      const scale=Math.max(.001,getScaleCmPerUnit());
      const placement=normalizeWallPlacement($('#v203WallPlacement')?.value||'inside');
      const thickness=Math.max(4,Math.min(80,Number(appState.editor.wallDraftThickness ?? $('#v203WallThickness')?.value ?? 12)))/scale;
      const height=Math.max(100,Math.min(800,Number(appState.editor.wallDraftHeight ?? $('#v203WallHeight')?.value ?? 290)))/scale;
      recordHistorySnapshot('structure');
      ctx.zone.pts.forEach((_,i)=>setZoneEdgeWall(ctx.zone,i,{thickness,height,placement}));
      appState.editor.wallDefaultPlacement=placement;syncZonePerimeterWalls();persistActiveLayout();renderLayoutEditor();
    };
    if($('#rpWallPlacement')) $('#rpWallPlacement').onchange=e=>{
      if(!selectedWall)return;const placement=normalizeWallPlacement(e.target.value);
      if(placement===normalizeWallPlacement(selectedWall.placement))return;
      recordHistorySnapshot('structure');selectedWall.placement=placement;
      syncZonePerimeterWalls();persistActiveLayout();renderLayoutEditor();
    };
    if($('#rpWallName')) $('#rpWallName').onchange = e => { if(!selectedWall||v213LayerLocked('walls')) return; const name=String(e.target.value||'').trim().slice(0,80)||'Muro';if(name===selectedWall.name)return;recordHistorySnapshot('structure');selectedWall.name=name;persistActiveLayout('nombre del muro');renderLayoutEditor(); };
    if($('#rpWallLength')) $('#rpWallLength').onchange = e => v213ApplyLength('wall',selectedWall?.id,0,Number(e.target.value)/100,'start');
    if($('#rpWallAngle')) $('#rpWallAngle').onchange = e => {if(v214WallGuard(selectedWall))return; if(v117SetWallAngle(selectedWall,Number(e.target.value||0))){ persistActiveLayout(); renderLayoutEditor(); } };
    if($('#rpWallMoveExact')) $('#rpWallMoveExact').onclick = () => {if(v214WallGuard(selectedWall))return; if(v117TranslateWallCm(selectedWall,$('#rpWallMoveX')?.value,$('#rpWallMoveY')?.value)){ persistActiveLayout(); renderLayoutEditor(); } };
    if($('#rpWallHeight')) $('#rpWallHeight').onchange = e => { if(!selectedWall||v213LayerLocked('walls')) return; recordHistorySnapshot('structure');const sc=Math.max(.0001,getScaleCmPerUnit()); selectedWall.height=Math.max(120/sc,Math.min(600/sc,Number(e.target.value||290)/sc)); if(selectedWall.autoZoneEdge){ const z=findZoneById(selectedWall.zoneId); if(z) setZoneEdgeWall(z,Number(selectedWall.edgeIndex||0),{height:selectedWall.height}); } persistActiveLayout(); renderLayoutEditor(); };
    const wallNodeCoord=(nodeId,axis,value)=>{if(v214WallGuard(selectedWall))return;const node=getWallNode(nodeId); if(!node) return; const units=Number(value||0)/Math.max(.0001,getScaleCmPerUnit()); const moved=setWallNodePosition(nodeId,axis==='x'?units:node.x,axis==='y'?units:node.y); if(!moved)showToast('Coordenada bloqueada: provocaría superposición entre zonas.','warning',2200); persistActiveLayout(); renderLayoutEditor(); };
    if(selectedWall && !selectedWall.autoZoneEdge){
      if($('#rpWallAX')) $('#rpWallAX').onchange=e=>wallNodeCoord(selectedWall.startNodeId,'x',e.target.value);
      if($('#rpWallAY')) $('#rpWallAY').onchange=e=>wallNodeCoord(selectedWall.startNodeId,'y',e.target.value);
      if($('#rpWallBX')) $('#rpWallBX').onchange=e=>wallNodeCoord(selectedWall.endNodeId,'x',e.target.value);
      if($('#rpWallBY')) $('#rpWallBY').onchange=e=>wallNodeCoord(selectedWall.endNodeId,'y',e.target.value);
      if($('#rpWallDuplicate')) $('#rpWallDuplicate').onclick=()=>duplicateSelectedStructure();
    }
    if($('#rpWallDelete')) $('#rpWallDelete').onclick=()=>deleteLayoutSelection();
    if($('#rpWallThickness')) $('#rpWallThickness').onchange = e => {
      if(!selectedWall||v213LayerLocked('walls')) return;
      recordHistorySnapshot('structure');
      const sc=Math.max(.0001,getScaleCmPerUnit()); const nextThickness = Math.max(4/sc, Math.min(80/sc, (Number(e.target.value || 14) || 14)/sc));
      selectedWall.thickness = nextThickness;
      if(selectedWall.autoZoneEdge){
        const zone = findZoneById(selectedWall.zoneId);
        if(zone) setZoneEdgeWall(zone, Number(selectedWall.edgeIndex || 0) || 0, { thickness:nextThickness });
      }
      syncZonePerimeterWalls();
      persistActiveLayout();
      renderLayoutEditor();
    };
    if($('#rpWallSide')) $('#rpWallSide').onchange = e => {
      if(!selectedWall || !selectedWall.autoZoneEdge) return;
      const nextSide = getWallSideSign(Number(e.target.value || 1));
      selectedWall.side = nextSide;
      const zone = findZoneById(selectedWall.zoneId);
      if(zone) setZoneEdgeWall(zone, Number(selectedWall.edgeIndex || 0) || 0, { side:nextSide });
      syncZonePerimeterWalls();
      persistActiveLayout();
      renderLayoutEditor();
    };
    if($('#rpWallFlip')) $('#rpWallFlip').onclick = () => {
      if(!selectedWall || !selectedWall.autoZoneEdge) return;
      const nextSide = getWallSideSign(selectedWall.side) * -1;
      selectedWall.side = nextSide;
      const zone = findZoneById(selectedWall.zoneId);
      if(zone) setZoneEdgeWall(zone, Number(selectedWall.edgeIndex || 0) || 0, { side:nextSide });
      syncZonePerimeterWalls();
      persistActiveLayout();
      renderLayoutEditor();
    };
    if($('#rpWallAddFree')) $('#rpWallAddFree').onclick = () => { if(!selectedWall) return; createOpeningOnWall(selectedWall.id, 'free'); persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpWallAddDoor')) $('#rpWallAddDoor').onclick = () => { if(!selectedWall) return; createOpeningOnWall(selectedWall.id, 'door'); persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpWallAddWindow')) $('#rpWallAddWindow').onclick = () => { if(!selectedWall) return; createOpeningOnWall(selectedWall.id, 'window'); persistActiveLayout(); renderLayoutEditor(); };
    const persistOpeningUpdate = () => { if(!selectedOpening) return; const host=findWallById(selectedOpening.wallId); if(host){ const len=Math.max(1,wallLength(host)); const width=Math.max(40,Number(selectedOpening.width||90)||90); const current=Number(selectedOpening.offset); selectedOpening.offset=Math.max(width/2,Math.min(len-width/2,Number.isFinite(current)?current:Number(selectedOpening.t||.5)*len)); selectedOpening.t=openingClampT(host,width,selectedOpening.offset/len); } persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpOpeningType')) $('#rpOpeningType').onchange = e => { if(!selectedOpening) return; const nextType=normalizeOpeningType(e.target.value); const prevType=normalizeOpeningType(selectedOpening.type); selectedOpening.type = nextType; const def=openingDefaultForType(nextType); const host=findWallById(selectedOpening.wallId); if(!Number(selectedOpening.width) || selectedOpening.width < def.width*.65) selectedOpening.width = def.width; if(prevType!==nextType){ selectedOpening.height = def.height; selectedOpening.sill = def.sill; } if(nextType==='door'||nextType==='gate') selectedOpening.sill=0; selectedOpening.depth = Math.max(4, Math.min(120, Number(selectedOpening.depth || host?.thickness || 14) || 14)); persistOpeningUpdate(); };
    if($('#rpOpeningWidth')) {
      const commitOpeningWidth = e => {
        if(!selectedOpening) return;
        selectedOpening.width = Math.max(40, Math.min(360, Number(e.target.value || selectedOpening.width || 90) || 90));
        persistOpeningUpdate();
      };
      $('#rpOpeningWidth').onchange = commitOpeningWidth;
      $('#rpOpeningWidth').onblur = commitOpeningWidth;
    }
    if($('#rpOpeningHeight')) $('#rpOpeningHeight').onchange = e => { if(!selectedOpening) return; const host=findWallById(selectedOpening.wallId); const wallH=Math.max(40,Number(host?.height||appState.layout?.meta?.defaultWallHeight||290)||290); const sill=Math.max(0,Number(selectedOpening.sill||0)||0); selectedOpening.height = Math.max(20, Math.min(Math.max(20,wallH-sill), Number(e.target.value || 210) || 210)); persistOpeningUpdate(); };
    if($('#rpOpeningSill')) $('#rpOpeningSill').onchange = e => { if(!selectedOpening) return; const type=normalizeOpeningType(selectedOpening.type); if(type==='door'||type==='gate'){ selectedOpening.sill=0; persistOpeningUpdate(); return; } const host=findWallById(selectedOpening.wallId); const wallH=Math.max(40,Number(host?.height||appState.layout?.meta?.defaultWallHeight||290)||290); const h=Math.max(20,Number(selectedOpening.height||openingDefaultForType(type).height)||100); selectedOpening.sill = Math.max(0, Math.min(Math.max(0,wallH-h), Number(e.target.value || 0) || 0)); persistOpeningUpdate(); };
    if($('#rpOpeningDepth')) $('#rpOpeningDepth').onchange = e => { if(!selectedOpening) return; const host=findWallById(selectedOpening.wallId); const maxDepth=Math.max(4, Math.min(120, Number(host?.thickness || 14) || 14)); selectedOpening.depth = Math.max(4, Math.min(maxDepth, Number(e.target.value || maxDepth) || maxDepth)); persistOpeningUpdate(); };
    const setOpeningPositionPct = value => { if(!selectedOpening) return; const wall=findWallById(selectedOpening.wallId); if(!wall) return; const len=Math.max(1,wallLength(wall)); selectedOpening.offset=len*Math.max(.01,Math.min(.99,(Number(value||50)||50)/100)); selectedOpening.t=openingClampT(wall,selectedOpening.width,selectedOpening.offset/len); persistOpeningUpdate(); };
    if($('#rpOpeningT')) $('#rpOpeningT').onchange = e => setOpeningPositionPct(e.target.value);
    if($('#rpOpeningSlider')) $('#rpOpeningSlider').oninput = e => { if($('#rpOpeningT')) $('#rpOpeningT').value = e.target.value; setOpeningPositionPct(e.target.value); };
    if($('#rpOpeningLeft')) $('#rpOpeningLeft').onchange = e => { if(!selectedOpening) return; const wall=findWallById(selectedOpening.wallId); if(!wall) return; const len=Math.max(1, wallLength(wall)); const width=Math.max(40, Number(selectedOpening.width||90)||90); const left=Math.max(0, Math.min(len-width, Number(e.target.value||0)||0)); selectedOpening.offset = left + width/2; selectedOpening.t = openingClampT(wall, width, selectedOpening.offset / len); persistOpeningUpdate(); };
    if($('#rpOpening25')) $('#rpOpening25').onclick = () => setOpeningPositionPct(25);
    if($('#rpOpeningCenter')) $('#rpOpeningCenter').onclick = () => setOpeningPositionPct(50);
    if($('#rpOpening75')) $('#rpOpening75').onclick = () => setOpeningPositionPct(75);
    const nudgeOpening = delta => { if(!selectedOpening) return; const wall=findWallById(selectedOpening.wallId); if(!wall) return; const len=Math.max(1, wallLength(wall)); const info=getOpeningPositionInfo(selectedOpening, wall); if(!info) return; selectedOpening.offset = Math.max(info.width/2,Math.min(len-info.width/2,info.center+delta)); selectedOpening.t = openingClampT(wall, info.width, selectedOpening.offset / len); persistOpeningUpdate(); };
    if($('#rpOpeningNudgeLeft')) $('#rpOpeningNudgeLeft').onclick = () => nudgeOpening(-25);
    if($('#rpOpeningNudgeRight')) $('#rpOpeningNudgeRight').onclick = () => nudgeOpening(25);
    if($('#rpOpeningDuplicate')) $('#rpOpeningDuplicate').onclick = () => { if(!selectedOpening) return; duplicateOpening(selectedOpening); persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpOpeningFlip')) $('#rpOpeningFlip').onclick = () => { if(!selectedOpening) return; selectedOpening.swing = Number(selectedOpening.swing || 1) * -1; persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpOpeningDelete')) $('#rpOpeningDelete').onclick = () => { if(!selectedOpening) return; appState.layout.openings = (appState.layout.openings || []).filter(o => o.id !== selectedOpening.id); appState.selectedOpeningId = ''; persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpMeasureOffset')) $('#rpMeasureOffset').onchange=e=>{const m=(appState.layout.measurements||[]).find(v=>v.id===appState.editor.selectedMeasurementId);if(!m)return;const value=Number(e.target.value)/Math.max(.0001,getScaleCmPerUnit());if(!Number.isFinite(value)||Math.abs(value-Number(m.offset||0))<.001)return;recordHistorySnapshot('structure');m.offset=value;persistActiveLayout();renderLayoutEditor();};
    if($('#rpMeasureDelete')) $('#rpMeasureDelete').onclick = () => { recordHistorySnapshot('structure');deleteLayoutSelection(); };

    if($('#tplZoneRack')) $('#tplZoneRack').onclick = () => { if(isStructureLayoutScreen()) addZoneWithRackTemplate(); };
    if($('#tplWarehouse')) $('#tplWarehouse').onclick = () => { if(isStructureLayoutScreen()) addWarehouseTemplate(); };
    if($('#tplRackRow')) $('#tplRackRow').onclick = () => { if(isRackDistributionScreen()) addRackRowTemplate(5); };
    if($('#tplDistribute')) $('#tplDistribute').onclick = () => { if(isRackDistributionScreen()) distributeSelectedZoneRacks(); };
    if($('#btnLayoutBgUpload')) $('#btnLayoutBgUpload').onclick = () => $('#layoutBgInput')?.click();
    if($('#layoutBgInput')) $('#layoutBgInput').onchange = e => {
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => { ensureLayoutMeta(); appState.layout.meta.backgroundImage = String(reader.result || ''); persistActiveLayout(); renderLayoutEditor(); };
      reader.readAsDataURL(file);
    };
    if($('#btnLayoutBgClear')) $('#btnLayoutBgClear').onclick = () => { ensureLayoutMeta(); delete appState.layout.meta.backgroundImage; persistActiveLayout(); renderLayoutEditor(); };
    v117BindTools();
  }

  function renderLayoutEditor(){
    const pendingFurnitureModel = isRackDistributionScreen() && appState.editor?.pendingFurnitureModelId ? rackModel(appState.editor.pendingFurnitureModelId) : null;
    document.body.dataset.wmsLayoutVersion = 'v165-clear-workflow';
    document.body.dataset.wmsLayoutWorkspace = isRackDistributionScreen() ? 'racks' : 'structure';
    const __layoutRightScrollBefore = appState.editor?.focusInspectorTop?0:(document.querySelector('#layoutRightPanel .layout-right-scroll')?.scrollTop ?? appState.editor?.rightPanelScrollTop ?? 0);
    appState.editor.focusInspectorTop=false;
    ensureLayoutEditorState();
    appState.editor.rightPanelScrollTop = __layoutRightScrollBefore;
    // Los tres modos comparten un lienzo, pero deben decidirse antes de construir
    // etiquetas, barras e inspectores. No declarar estos flags aquí provocaba
    // ReferenceError: architectureMode is not defined al abrir Editar layout.
    const rackMode = isRackDistributionScreen();
    const urbanismMode = !rackMode && activeLayoutWorkspace() === 'urbanism';
    const architectureMode = !rackMode && !urbanismMode;
    const workspaceHistory = rackMode ? 'distribution' : 'structure';
    if(!(getHistoryBucket(workspaceHistory)?.undoStack?.length)) recordHistorySnapshot(workspaceHistory);
    ensureRackProps();
    const structureMode = !rackMode;
    contentTitle.textContent = rackMode ? 'Editar layout · Distribución' : urbanismMode ? 'Editar layout · Urbanismo' : 'Editar layout · Arquitectura';
    appState.editor.view = 'ortho';
    const isIsoView = false;
    const selectedRack = findRackById(appState.selectedRackLayoutId);
    const selectedRackModel = selectedRack ? rackModel(selectedRack.modelId) : null;
    const selectedRackFootprint = selectedRack ? getRackFootprint(selectedRack.modelId, selectedRack.rot || 0) : null;
    const selectedZone = findZoneById(appState.selectedZoneId);
    const selectedWall = findWallById(appState.selectedWallId);
    const selectedOpening = findOpeningById(appState.selectedOpeningId);
    const selectionType = rackMode ? (selectedRack ? 'rack' : '') : urbanismMode ? (appState.selectedStreetId?'street':'') : (selectedOpening ? 'opening' : (selectedWall ? 'wall' : (selectedZone ? 'zone' : '')));
    let contextTitle = rackMode ? 'Selecciona un rack para editarlo.' : 'Selecciona un elemento del layout.';
    let contextHint = rackMode ? 'Desde aquí podrás duplicar, eliminar o abrir el elemento en 3D.' : 'Usa el panel derecho solo cuando necesites detalle.';
    let contextActions = [];
    if(selectionType==='rack' && selectedRack){
      contextTitle = `Rack activo: ${selectedRack.displayCode||selectedRack.id}`;
      contextHint = 'Acciones rápidas para distribución y revisión visual.';
      contextActions = [['ctx-duplicate-rack','Duplicar'],['ctx-delete','Eliminar']];
    }else if(selectionType==='zone' && selectedZone){
      contextTitle = `Zona activa: ${selectedZone.name || selectedZone.id}`;
      contextHint = 'Ajusta geometría, duplica la zona o agrega muros.';
      contextActions = [['ctx-duplicate-zone','Duplicar'],['ctx-mode-wall','Dibujar muro'],['ctx-delete','Eliminar']];
    }else if(selectionType==='wall' && selectedWall){
      contextTitle = `Muro activo: ${selectedWall.name || selectedWall.id}`;
      contextHint = 'Añade vanos o elimina el muro seleccionado.';
      contextActions = [['ctx-add-door','Agregar puerta'],['ctx-add-window','Agregar ventana'],['ctx-delete','Eliminar']];
    }else if(selectionType==='opening' && selectedOpening){
      contextTitle = `Abertura activa: ${selectedOpening.id}`;
      contextHint = 'Duplica o elimina el vano seleccionado.';
      contextActions = [['ctx-duplicate-opening','Duplicar'],['ctx-delete','Eliminar']];
    }
    const contextMarkup = `<div class="layout-contextual-bar"><div class="layout-contextual-copy"><b>${escapeHtml(contextTitle)}</b></div><div class="layout-contextual-actions">${contextActions.map(([action,label])=>`<button class="seg-btn" data-layout-context-action="${action}">${label}</button>`).join('')}</div></div>`;
    const pendingFurnitureBanner = pendingFurnitureModel ? `<div class="layout-placement-prompt" role="status"><div><b>Ubicar: ${escapeHtml(pendingFurnitureModel.name||'Mueble')}</b><span>${Math.round(Number(pendingFurnitureModel.width||0))} × ${Math.round(Number(pendingFurnitureModel.depth||0))} cm · Clic en zona libre para colocarlo</span></div><button class="seg-btn" type="button" id="btnCancelFurniturePlacement">Cancelar · Esc</button></div>` : '';
    contentSubtitle.textContent = rackMode ? 'Mover, rotar, apilar y nombrar racks.' : urbanismMode ? 'Crear y editar calles, veredas y mobiliario urbano.' : 'Área comercial, muros vinculados y zonas virtuales.';
    detailTitle.textContent = rackMode ? 'Distribución' : urbanismMode ? 'Urbanismo' : 'Arquitectura';
    detailSubtitle.textContent = rackMode ? 'Racks editables, niveles aislables.' : urbanismMode ? 'Calles y veredas con materiales.' : 'Perímetro y geometría de zonas.';
    setTags([
      { label:'↶ Deshacer', active: true, action:`history-undo-${workspaceHistory}`, extraClass:'history-chip' },
      { label:'↷ Rehacer', active: true, action:`history-redo-${workspaceHistory}`, extraClass:'history-chip' },
      { label:`Snap ${isSnapEnabled() ? getSnapSize() : 'OFF'}`, active: isSnapEnabled(), action:'toggle-snap' },
      { label:'Orto', active:!!appState.editor.orthoEnabled, action:'toggle-ortho' },
      { label:'Cotas', active: !!appState.editor.showDims, action:'toggle-dims' },
      { label:'Sección', active: !!appState.editor.sectionVisible, action:'toggle-section' },
      { label: appState.editor.rightPanelOpen === false ? 'Mostrar inspector' : 'Ocultar inspector', active: appState.editor.rightPanelOpen !== false, action:'toggle-right-props' },
      { label: appState.editor.presentationMode ? 'Salir presentación' : 'Solo espacio', active: !!appState.editor.presentationMode, action:'toggle-presentation' },
      { label: appState.editor.beginnerMode ? 'Modo fácil' : 'Modo pro', active: !!appState.editor.beginnerMode, action:'toggle-beginner-mode' }
    ]);

    contentWrap.innerHTML = `
      <div class="stage layout-premium-render layout-cad-v80" style="position:relative;height:100%">
        <div data-subsystem="${activeLayoutWorkspace()}" data-mode="${appState.editor.mode}" class="layout-cad-shell-v80 ${appState.editor.rightPanelOpen === false ? 'right-collapsed' : ''} ${appState.editor.beginnerMode ? 'beginner-ui' : 'advanced-ui'} ${appState.editor.presentationMode ? 'presentation-mode' : ''}">
          ${layoutWorkspaceTabs()}
          ${architectureMode?layoutWallSubtabs():''}
          <div class="layout-cad-localbar-v80">
            ${architectureMode ? (appState.editor.architectureTool==='area'?'<button class="btn primary v80-zone-btn" id="btnAreaPlus">Dibujar área</button>':appState.editor.architectureTool==='zones'?'<button class="btn primary v80-zone-btn" id="btnZonePlus">+ Zona</button>':'<button class="btn primary v80-zone-btn" data-emode="wall">Dibujar muro</button>') : urbanismMode ? '<button class="btn primary v80-zone-btn" id="btnStreetPlus">+ Calle</button>' : '<button class="btn primary v80-zone-btn" data-emode="rack">+ Rack</button>'}
            <select id="layoutBranchSelect" class="seg-btn v80-branch-select">${(appState.admin.branches||[]).map((b,i)=>`<option value="${i}" ${i===getActiveLayoutBranchIndex()?'selected':''}>${escapeHtml(b.name||('Sucursal '+(i+1)))}</option>`).join('')}</select>
            ${rackMode?layoutLevelSelector():''}
            ${urbanismMode?`<button type="button" class="seg-btn" id="streetCornerToggle">${getStreetCornerStyle()==='diagonal'?'Esquina diagonal':getStreetCornerStyle()==='round'?'Esquina redondeada':'Esquina 90°'}</button>`:''}
            <span class="v175-unit-label" title="Escala del plano">cm / m</span>
            <button class="seg-btn v80-icon-btn ${isSnapEnabled()?'is-active':''}" data-layout-tag-action="toggle-snap" type="button" aria-pressed="${isSnapEnabled()}" title="Activar o desactivar snap" aria-label="Activar o desactivar snap">⌁</button>
            ${!rackMode?`<button class="seg-btn v80-icon-btn ${appState.editor.orthoEnabled?'is-active':''}" data-layout-tag-action="toggle-ortho" type="button" aria-pressed="${!!appState.editor.orthoEnabled}" title="Ortogonalidad 0° y 90° (F8)">⊥</button>`:''}
            <button class="seg-btn v80-icon-btn ${appState.editor.showDims?'is-active':''}" data-layout-tag-action="toggle-dims" type="button" aria-pressed="${!!appState.editor.showDims}" title="Mostrar u ocultar cotas" aria-label="Mostrar u ocultar cotas">▦</button>
            <button class="seg-btn v80-icon-btn" id="btnZoomFit" title="Ajustar plano a la vista" aria-label="Ajustar plano a la vista">⛶</button>
            <button class="seg-btn v172-sections-switch ${appState.editor.sectionVisible ? 'is-active' : ''}" id="btnToggleSections" type="button" aria-pressed="${!!appState.editor.sectionVisible}" title="Mostrar u ocultar cortes X e Y">${appState.editor.sectionVisible ? '◉ Ocultar secciones' : '◫ Mostrar secciones'}</button>
            <button class="seg-btn v165-inspector-toggle" data-layout-tag-action="toggle-right-props" type="button">${appState.editor.rightPanelOpen === false ? 'Mostrar inspector' : 'Ocultar inspector'}</button>
            <button class="seg-btn v165-presentation-toggle" id="btnPresentationMode" type="button">${appState.editor.presentationMode ? 'Salir de solo espacio' : 'Solo espacio'}</button>
            <button class="seg-btn v80-icon-btn" id="v213UndoGlobal" type="button" aria-label="Deshacer">↶</button><button class="seg-btn v80-icon-btn" id="v213RedoGlobal" type="button" aria-label="Rehacer">↷</button>
            <button class="seg-btn" id="v213OpenLayers" type="button" title="Mostrar, ocultar y bloquear capas">Capas</button>
            <button class="btn primary v90-save-layout-btn" id="btnSaveLayoutVisible" type="button">${rackMode ? 'Guardar racks' : 'Guardar layout'}</button>
            <span id="layoutSaveStatus" class="v99-save-status local">Local</span>
            <span id="layoutQualityBadge" class="v99-quality-badge ok">OK</span>
          </div>
          ${contextMarkup}
          ${pendingFurnitureBanner}
          <div class="layout-cad-workspace-v80">
            <main class="layout-main-stage v80-main-stage ${appState.editor.sectionVisible ? 'with-section' : ''}">
              <div class="layout-canvas-wrap v80-canvas-wrap">
                <div class="layout-canvas-card detail-stage v80-canvas-card">
                  <svg id="layoutSvg"></svg>${architectureMode && appState.editor.mode==='measure'?`<div class="cad-v202-measure-hint" id="cadMeasureHint">${appState.editor.measureDraft?.b?'3. Mueve el mouse para separar la cota y haz clic para fijarla.':appState.editor.measureDraft?.a?'2. Selecciona el punto B.':'1. Selecciona el punto A.'} · Esc: cancelar</div>`:''}${appState.editor.presentationMode ? `<button class="seg-btn layout-presentation-exit" id="btnExitPresentation">Salir de solo espacio</button><div class="layout-presentation-badge">Modo presentación</div>` : ``}
                  <div class="v80-tool-rail" aria-label="${rackMode ? 'Herramientas de distribución' : urbanismMode ? 'Herramientas de calles' : 'Herramientas de arquitectura'}">
                    ${architectureMode ? `
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='select'?'active':''}" data-emode="select"><span class="v80-tool-ico">↖</span><b>Seleccionar</b></button>
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='area'?'active':''}" id="btnAreaPlusRail" data-tool-proxy="btnAreaPlus"><span class="v80-tool-ico">▧</span><b>Área</b></button>
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='wall'?'active':''}" data-emode="wall"><span class="v80-tool-ico">╱</span><b>Muro</b></button>
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='door'?'active':''}" data-emode="door"><span class="v80-tool-ico">◧</span><b>Puerta</b></button>
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='opening'?'active':''}" data-emode="opening"><span class="v80-tool-ico">▭</span><b>Abertura</b></button>
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='zone'?'active':''}" id="btnZonePlusRail" data-tool-proxy="btnZonePlus"><span class="v80-tool-ico">□</span><b>Zona</b></button>
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='measure'?'active':''}" data-emode="measure"><span class="v80-tool-ico">↔</span><b>Medir</b></button>
                    ` : urbanismMode ? `
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='select'?'active':''}" data-emode="select"><span class="v80-tool-ico">↖</span><b>Seleccionar</b></button>
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='street'?'active':''}" id="btnStreetPlusRail" data-tool-proxy="btnStreetPlus"><span class="v80-tool-ico">═</span><b>Calle</b></button>
                    <button class="v80-tool-btn seg-btn" id="v200StreetHandlesRail"><span class="v80-tool-ico">⌖</span><b>Vértices</b></button>
                    ` : `
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='select'?'active':''}" data-emode="select"><span class="v80-tool-ico">↖</span><b>Seleccionar</b></button>
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='rack'?'active':''}" data-emode="rack"><span class="v80-tool-ico">▤</span><b>Rack</b></button>
                    <button class="v80-tool-btn seg-btn" id="btnDuplicateRackRail"><span class="v80-tool-ico">⧉</span><b>Duplicar</b></button>
                    `}
                  </div>
                  ${appState.editor.showMiniMap !== false ? `<div class="v80-minimap-card"><div class="v80-minimap-title">Vista general</div>${renderLayoutMiniMapMarkup()}</div>` : ''}
                  <div class="v80-canvas-footer">
                    <button class="seg-btn" id="btnZoomOut" title="Alejar" aria-label="Alejar plano">−</button><span class="zoom-chip" id="zoomLabel">100%</span><button class="seg-btn" id="btnZoomIn" title="Acercar" aria-label="Acercar plano">+</button>
                  </div>

                  ${architectureMode && appState.editor.mode==='wall' && appState.editor.pendingWallPoint ? `<div class="wall-length-hud"><span>Longitud</span><input id="wallLengthInput" type="number" min="1" step="1" placeholder="cm" value="${escapeHtml(String(appState.editor.wallLengthDraft||''))}"><b>cm</b><small>Enter fija · ESC termina</small></div>` : ''}
                  ${architectureMode && appState.editor.mode==='wall' ? `<button type="button" class="seg-btn v216-finish-wall" id="btnFinishWall">Terminar trazado</button><div class="wall-draw-help">Clic para iniciar · clic para encadenar · Shift ortogonal · escribe una medida · Esc / Enter termina · clic en el inicio cierra</div>` : ''}
                  <div id="layoutStackMenu" class="layout-stack-overlay"></div>
                </div>
              </div>
              <div id="layoutSectionWrap" class="v80-section-floating" aria-label="Secciones horizontales X e Y"></div>
            </main>
            <aside id="layoutRightPanel" class="layout-right-panel v80-right-panel">${renderLayoutRightPanelMarkup()}</aside>
          </div>
          <div class="v80-hidden-actions" aria-hidden="true">
            <button class="seg-btn" id="btnDuplicateZone">Duplicar zona</button>
            <button class="seg-btn" id="btnVertexPlus">Agregar vértice</button>
            <button class="seg-btn" id="btnDuplicateRack">Duplicar rack</button>
            <button class="seg-btn" id="btnDeleteSelected">Eliminar selección</button>
            <button class="seg-btn" id="btnSaveLayoutTop">Guardar layout</button>
            <button class="seg-btn" id="btnSaveLayoutRemote">Guardar layout</button>
            <label><input type="checkbox" id="layoutSnapEnabled" ${isSnapEnabled()?'checked':''}></label>
            <input id="layoutSnapSize" value="${formatUnitNumber(getSnapSize())}">
            <input id="layoutDimFontSize" value="${formatUnitNumber(getDimFontSize())}">
          </div>
        </div>
      </div>`
    // Finalize toolbar geometry before calculating SVG coordinates and fitting.
    v214SimplifyEditor();
    v215RedesignEditor();
    if(typeof v221EnhanceEditor==='function')v221EnhanceEditor();
    const svg = $('#layoutSvg');
    svg.setAttribute('tabindex','0');svg.setAttribute('aria-label','Plano editable: selecciona un elemento para editarlo.');
    const currentBox = appState.editor.viewBox || { x:0, y:0, w:900, h:620 };
    if(!appState.editor.viewBoxInitialized){
      fitLayoutViewBox();
      appState.editor.viewBoxInitialized = true;
    }else if(!appState.editor.viewBoxCustomized && (currentBox.x===0 && currentBox.y===0 && currentBox.w===900 && currentBox.h===620)){
      fitLayoutViewBox();
    }
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.oncontextmenu=e=>{if(appState.editor.mode==='wall'){e.preventDefault();cancelLayoutDrawing();}};
    renderLayoutSvg(svg);
    renderLayoutSection();
    renderLayoutInspector();
    renderLayoutStackMenu();
    const layoutStageRoot = document.querySelector('.layout-cad-v80');
    if(layoutStageRoot) layoutStageRoot.addEventListener('pointerdown', evt => {
      if(evt.target && evt.target.closest('button, select, input, .seg-btn')) markLayoutManualInteraction();
    }, { capture:true });
    bindLayoutToolbar();
    document.querySelectorAll('[data-architecture-tool]').forEach(btn=>btn.onclick=()=>v212SetMode(btn.dataset.architectureTool));
    ensureLayoutKeyboardBindings();
    const wallLengthInput=$('#wallLengthInput'); if(wallLengthInput){ wallLengthInput.oninput=e=>{ appState.editor.wallLengthDraft=e.target.value; }; wallLengthInput.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); commitWallLengthFromHud(e.currentTarget.value); } if(e.key==='Escape'){ e.preventDefault();if(appState.editor.mode==='street-path'){v221FinishStreet();return;} cancelLayoutDrawing(); } }; }
    document.querySelectorAll('[data-tool-proxy]').forEach(btn => {
      btn.onclick = () => { const target = document.getElementById(btn.getAttribute('data-tool-proxy')); if(target) target.click(); };
    });
    bindLayoutRightPanel();
    v213BindUx();
    v214SimplifyEditor();
    v215RedesignEditor();
    if(typeof v221EnhanceEditor==='function')v221EnhanceEditor();
    requestAnimationFrame(() => {
      const scroller = document.querySelector('#layoutRightPanel .layout-right-scroll');
      if(scroller) scroller.scrollTop = appState.editor?.rightPanelScrollTop ?? __layoutRightScrollBefore ?? 0;
    });
    bindLayoutAutoFit();
    const undoBtn = document.querySelector('[data-history-undo="layout"]'); if(undoBtn) undoBtn.onclick = () => undoHistory(isRackDistributionScreen()?'distribution':appState.editor.areaMoveMode?'layout':'structure');
    const redoBtn = document.querySelector('[data-history-redo="layout"]'); if(redoBtn) redoBtn.onclick = () => redoHistory(isRackDistributionScreen()?'distribution':appState.editor.areaMoveMode?'layout':'structure');
    updateUndoRedoUi();
    const zl = $('#zoomLabel'); if(zl){ const vb = appState.editor.viewBox || {w:900}; zl.textContent = `${Math.round((900 / vb.w) * 100)}%`; }
    updateLayoutSaveStatus();
    updateLayoutQualityBadge();
    if(/^Cargando vista/.test(contentStatus.textContent||'')) contentStatus.textContent='';
  }

  function renderLayoutStackMenu(){
    const mount = document.getElementById('layoutStackMenu');
    if(!mount) return;
    const state = appState.editor.stackMenu || { open:false };
    const rack = findRackById(state.rackId);
    const summary = rack ? rackStackSummary(rack) : { count:0, members:[] };
    if(!state.open || !rack || summary.count <= 1){
      mount.innerHTML = '';
      return;
    }
    const rows = summary.members.map(member => {
      const active = member.id === appState.selectedRackLayoutId;
      const model = rackModel(member.modelId);
      const topCm = Number(member.baseHeight||0) + Number(member.rackHeight || model.height || 238);
      return `<button type="button" class="stack-row ${active?'active':''}" data-stack-rack="${member.id}" style="width:100%;text-align:left;border:1px solid rgba(255,255,255,.08);background:${active?'rgba(86,210,255,.15)':'rgba(255,255,255,.03)'};color:#e8f1fb;border-radius:12px;padding:10px 12px;cursor:pointer;display:grid;gap:4px"><b>${escapeHtml(member.id)}</b><span class="tiny muted">N${getRackStackLevel(member)} · ${escapeHtml(model.name)} · ${model.levels||4} niveles · ${formatDistanceCm(topCm)}</span></button>`;
    }).join('');
    mount.innerHTML = `<div style="position:absolute;left:${Math.max(12,state.x)}px;top:${Math.max(58,state.y)}px;z-index:8;min-width:260px;max-width:320px;background:rgba(7,17,29,.98);border:1px solid rgba(255,255,255,.10);box-shadow:0 18px 40px rgba(0,0,0,.38);border-radius:16px;padding:12px;display:grid;gap:10px"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px"><div><div style="font-weight:800">Superposición de racks</div><div class="tiny muted">${summary.count} racks en la misma huella</div></div><button type="button" id="stackMenuCloseBtn" class="seg-btn" style="padding:8px 10px">Cerrar</button></div><div style="display:grid;gap:8px">${rows}</div></div>`;
    const closeBtn = document.getElementById('stackMenuCloseBtn');
    if(closeBtn) closeBtn.onclick = () => { closeStackMenu(); renderLayoutStackMenu(); };
    mount.querySelectorAll('[data-stack-rack]').forEach(btn => btn.onclick = () => {
      const rackId = btn.getAttribute('data-stack-rack');
      const target = findRackById(rackId);
      if(!target) return;
      appState.selectedRackLayoutId = target.id;
      appState.selectedZoneId = target.zoneId;
      renderLayoutEditor();
    });
  }



  function findZoneBadgePlacement(zone, badgeW, badgeH){
    const zb = zoneBoundsOf(zone);
    const racks = (appState.layout.racks||[]).filter(r => r.zoneId === zone.id);
    const candidates = [
      {x:zb.minX+12,y:zb.minY+12},
      {x:zb.maxX-badgeW-12,y:zb.minY+12},
      {x:zb.minX+12,y:zb.maxY-badgeH-12},
      {x:zb.maxX-badgeW-12,y:zb.maxY-badgeH-12}
    ];
    const overlap=(c)=>racks.some(r=>{
      const fp=getRackFootprint(r.modelId, r.rot||0); const w=fp.w||r.w||40, h=fp.h||r.h||28;
      const cx=(r.x||0)+w/2, cy=(r.y||0)+h/2; const rx=cx-w/2-10, ry=cy-h/2-10, rw=w+20, rh=h+20;
      return !(c.x+badgeW < rx || c.x > rx+rw || c.y+badgeH < ry || c.y > ry+rh);
    });
    return candidates.find(c=>!overlap(c)) || candidates[0];
  }


  function getLayoutContentBounds(){
    ensureLayoutDecorations();
    ensureLayoutMeta();
    const zones = appState.layout?.zones || [];
    const racks = appState.layout?.racks || [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    (layoutBoundaryPts() || []).forEach(pt => {
      minX = Math.min(minX, Number(pt.x || 0));
      minY = Math.min(minY, Number(pt.y || 0));
      maxX = Math.max(maxX, Number(pt.x || 0));
      maxY = Math.max(maxY, Number(pt.y || 0));
    });
    (appState.layout?.streets || []).forEach(street => {
      [...(street.sidewalkPts || []), ...(street.outerSidewalkPts||[]), ...(street.sidewalkExtraContours||[]).flat(), ...(street.roadPts || [])].forEach(pt => {
        minX = Math.min(minX, Number(pt.x || 0));
        minY = Math.min(minY, Number(pt.y || 0));
        maxX = Math.max(maxX, Number(pt.x || 0));
        maxY = Math.max(maxY, Number(pt.y || 0));
      });
    });
    zones.forEach(zone => {
      const zb = zoneBounds(zone);
      minX = Math.min(minX, zb.minX);
      minY = Math.min(minY, zb.minY);
      maxX = Math.max(maxX, zb.maxX);
      maxY = Math.max(maxY, zb.maxY);
    });
    racks.forEach(r => {
      const x = Number(r.x || 0), y = Number(r.y || 0);
      const w = Math.max(1, Number(r.w || 0)), h = Math.max(1, Number(r.h || 0));
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    });
    (appState.layout?.walls || []).forEach(w => {
      const t = Math.max(4, Number(w.thickness || 12) || 12);
      minX = Math.min(minX, Number(w.x1 || 0) - t, Number(w.x2 || 0) - t);
      minY = Math.min(minY, Number(w.y1 || 0) - t, Number(w.y2 || 0) - t);
      maxX = Math.max(maxX, Number(w.x1 || 0) + t, Number(w.x2 || 0) + t);
      maxY = Math.max(maxY, Number(w.y1 || 0) + t, Number(w.y2 || 0) + t);
    });
    if(!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return { x:0, y:0, w:900, h:620 };
    return { x:minX, y:minY, w:Math.max(240, maxX - minX), h:Math.max(180, maxY - minY) };
  }

  function fitLayoutViewBox(){
    const bounds = getLayoutContentBounds();
    const svg = document.getElementById('layoutSvg');
    const rawWidth = Number(svg?.clientWidth || 0);
    const rawHeight = Number(svg?.clientHeight || 0);
    const viewportRatioRaw = (rawWidth >= 220 && rawHeight >= 160) ? (rawWidth / rawHeight) : 1.65;
    const viewportRatio = Math.max(.45, Math.min(3.2, viewportRatioRaw || 1.65));
    const padX = Math.max(105, bounds.w * 0.12);
    const padY = Math.max(95, bounds.h * 0.12);
    let box = {
      x: bounds.x - padX,
      y: bounds.y - padY,
      w: Math.max(240, bounds.w + padX * 2),
      h: Math.max(180, bounds.h + padY * 2)
    };
    const currentRatio = box.w / Math.max(1, box.h);
    if(currentRatio < viewportRatio){
      const targetW = box.h * viewportRatio;
      box.x -= (targetW - box.w) / 2;
      box.w = targetW;
    } else if(currentRatio > viewportRatio){
      const targetH = box.w / viewportRatio;
      box.y -= (targetH - box.h) / 2;
      box.h = targetH;
    }
    const maxW = Math.max(12000, bounds.w * 8);
    const maxH = Math.max(9000, bounds.h * 8);
    if(!Number.isFinite(box.x) || !Number.isFinite(box.y) || !Number.isFinite(box.w) || !Number.isFinite(box.h) || box.w > maxW || box.h > maxH){
      box = {
        x: bounds.x - padX,
        y: bounds.y - padY,
        w: Math.max(900, bounds.w + padX * 2),
        h: Math.max(620, (bounds.w + padX * 2) / 1.65, bounds.h + padY * 2)
      };
    }
    appState.editor.viewBox = box;
    appState.editor.viewBoxCustomized = false;
    return box;
  }

  function sanitizeLayoutViewBox(vb){
    const bounds = getLayoutContentBounds();
    const maxW = Math.max(14000, bounds.w * 10);
    const maxH = Math.max(10000, bounds.h * 10);
    if(!vb || !Number.isFinite(Number(vb.x)) || !Number.isFinite(Number(vb.y)) || !Number.isFinite(Number(vb.w)) || !Number.isFinite(Number(vb.h)) || Number(vb.w) <= 0 || Number(vb.h) <= 0 || Number(vb.w) > maxW || Number(vb.h) > maxH){
      appState.editor.viewBoxInitialized = false;
      appState.editor.viewBoxCustomized = false;
      return fitLayoutViewBox();
    }
    return vb;
  }


  function cleanupLayoutAutoFit(){
    const cleanup = appState.editor?.layoutAutoFitCleanup;
    if(typeof cleanup === 'function'){
      try{ cleanup(); }catch(_err){}
    }
    if(appState.editor) appState.editor.layoutAutoFitCleanup = null;
  }

  function scheduleLayoutAutoFit(force=false){
    if(appState.editor?.dragging || appState.editor?.dragSelect?.active) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if(!force && appState.editor?.suppressAutoFitUntil && now < appState.editor.suppressAutoFitUntil) return;
    if(!force && appState.editor?.viewBoxCustomized && appState.editor?.lastZoomAt && (now - appState.editor.lastZoomAt) < 520) return;
    if(!force && appState.editor?.viewBoxInitialized) return;
    window.cancelAnimationFrame(appState.editor?.layoutAutoFitRaf || 0);
    const run = () => {
      if(appState.editor?.dragging || appState.editor?.dragSelect?.active) return;
      const svg = document.getElementById('layoutSvg');
      if(!svg) return;
      const nowRun = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      if(!force && appState.editor?.suppressAutoFitUntil && nowRun < appState.editor.suppressAutoFitUntil) return;
      if(!force && appState.editor?.viewBoxCustomized && appState.editor?.lastZoomAt && (nowRun - appState.editor.lastZoomAt) < 520) return;
      if(!force && appState.editor?.viewBoxInitialized) return;
      if(force || !appState.editor.viewBoxCustomized) fitLayoutViewBox();
      if(force) appState.editor.viewBoxInitialized = true;
      renderLayoutSvg(svg);
      renderLayoutSection();
    };
    if(!appState.editor) return run();
    appState.editor.layoutAutoFitRaf = window.requestAnimationFrame(run);
  }

  function bindLayoutAutoFit(){
    cleanupLayoutAutoFit();
    const shell = document.querySelector('.layout-main-stage');
    const svg = document.getElementById('layoutSvg');
    if(!shell || !svg || typeof ResizeObserver === 'undefined') return;
    let lastW = 0, lastH = 0;
    const ro = new ResizeObserver(entries => {
      const rect = entries && entries[0] ? entries[0].contentRect : shell.getBoundingClientRect();
      const w = Math.round(rect?.width || 0);
      const h = Math.round(rect?.height || 0);
      if(!w || !h) return;
      if(Math.abs(w - lastW) < 6 && Math.abs(h - lastH) < 6) return;
      lastW = w; lastH = h;
      scheduleLayoutAutoFit(false);
    });
    ro.observe(shell);
    window.addEventListener('resize', scheduleLayoutAutoFit, { passive:true });
    appState.editor.layoutAutoFitCleanup = () => {
      try{ ro.disconnect(); }catch(_err){}
      window.removeEventListener('resize', scheduleLayoutAutoFit, { passive:true });
      window.cancelAnimationFrame(appState.editor?.layoutAutoFitRaf || 0);
      if(appState.editor) appState.editor.layoutAutoFitRaf = null;
    };
  }

  function getLayoutRenderViewBox(svg, vb){
    const width = Number(svg?.clientWidth || 0);
    const height = Number(svg?.clientHeight || 0);
    if(width < 220 || height < 160) return vb;
    const viewportRatio = Math.max(.45, Math.min(3.2, width / height));
    const viewRatio = vb.w / Math.max(1, vb.h);
    if(Math.abs(viewportRatio - viewRatio) < 0.01) return vb;
    if(viewportRatio > viewRatio){
      const targetW = vb.h * viewportRatio;
      return { x: vb.x - (targetW - vb.w) / 2, y: vb.y, w: targetW, h: vb.h };
    }
    const targetH = vb.w / viewportRatio;
    return { x: vb.x, y: vb.y - (targetH - vb.h) / 2, w: vb.w, h: targetH };
  }

  function renderLayoutSvg(svg){
    svg = svg || document.getElementById('layoutSvg') || document.getElementById('layout-svg');
    if(!svg) return;
    if(typeof v128RebuildSharedWallRegistry === 'function') v128RebuildSharedWallRegistry();
    appState.editor.view = 'ortho';
    svg.innerHTML = '';
    svg.style.setProperty('--layout-dim-font-size', `${getDimFontSize()}px`);
    const vb = sanitizeLayoutViewBox(appState.editor.viewBox || { x:0, y:0, w:900, h:620 });
    const renderVb = getLayoutRenderViewBox(svg, vb);
    svg.setAttribute('viewBox', `${renderVb.x} ${renderVb.y} ${renderVb.w} ${renderVb.h}`);
    const panSurface = svgEl('rect',{x:vb.x-1400,y:vb.y-1400,width:vb.w+2800,height:vb.h+2800,fill:'transparent',class:'layout-pan-surface',style:'cursor:grab'});
    svg.appendChild(panSurface);
    panSurface.addEventListener('pointerdown', evt => {
      const shouldPan = appState.editor.mode === 'navigate' || evt.shiftKey || evt.button === 1;
      if(!shouldPan) return;
      evt.preventDefault();
      evt.stopPropagation();
      appState.editor.dragging = { type:'pan-layout', startClient:{ x:evt.clientX, y:evt.clientY }, originalViewBox: clone(appState.editor.viewBox || { x:0, y:0, w:900, h:620 }) };
      appState.editor.viewBoxCustomized = true;
      svg.setPointerCapture?.(evt.pointerId);
    });
    const contentBounds = getLayoutContentBounds();
    const gridStep = v215GridStep(Math.max(4, getSnapSize() * 2), svg.getScreenCTM()?.a || 1);
    if(appState.editor.showGrid !== false){
      const px=1/(svg.getScreenCTM()?.a||1),defs=svgEl('defs');
      [[gridStep,'v213-grid-minor',.08],[gridStep*5,'v213-grid-major',.18]].forEach(([size,id,opacity])=>{
        const pattern=svgEl('pattern',{id,patternUnits:'userSpaceOnUse',width:size,height:size});
        pattern.appendChild(svgEl('path',{d:`M ${size} 0 H 0 V ${size}`,fill:'none','stroke-width':px,opacity,class:'v213-grid-line'}));defs.appendChild(pattern);
      });svg.appendChild(defs);
      ['v213-grid-minor','v213-grid-major'].forEach(id=>svg.appendChild(svgEl('rect',{x:renderVb.x,y:renderVb.y,width:renderVb.w,height:renderVb.h,fill:`url(#${id})`,'pointer-events':'none'})));
    }
    const bgImage = appState.layout?.meta?.backgroundImage;
    if(bgImage){
      const b = getLayoutContentBounds();
      const bg = svgEl('image',{href:bgImage,x:b.x,y:b.y,width:b.w,height:b.h,preserveAspectRatio:'xMidYMid meet',class:'layout-bg-image'});
      svg.appendChild(bg);
    }

    const streetsLayer = svgEl('g',{class:'layout-street-layer'});
    const areaLayer = svgEl('g',{class:'layout-area-layer'});
    const roomLayer = svgEl('g',{class:'layout-room-layer'});
    const edgeLayer = svgEl('g');
    const zoneLayer = svgEl('g');
    const wallLayer = svgEl('g');
    const openingLayer = svgEl('g');
    const guideLayer = svgEl('g');
    const rackLayer = svgEl('g');
    const measureLayer = svgEl('g');
    const vertexLayer = svgEl('g');
    const overlayLayer = svgEl('g',{class:'layout-overlay-layer','pointer-events':'none'});
    const streetHandleLayer = svgEl('g',{class:'layout-street-handles'});
    if(appState.editor.showZones === false){ zoneLayer.setAttribute('style','display:none'); vertexLayer.setAttribute('style','display:none'); edgeLayer.setAttribute('style','display:none'); }
    if(appState.editor.wallsVisible === false) wallLayer.setAttribute('style','display:none');
    if(appState.editor.openingsVisible === false) openingLayer.setAttribute('style','display:none');
    [[zoneLayer,'zones'],[edgeLayer,'zones'],[vertexLayer,'zones'],[wallLayer,'walls'],[openingLayer,'openings'],[rackLayer,'racks']].forEach(([layer,key])=>layer.dataset.v213Layer=key);
    svg.append(streetsLayer, areaLayer, roomLayer, edgeLayer, zoneLayer, wallLayer, openingLayer, rackLayer, guideLayer, measureLayer, vertexLayer, overlayLayer, streetHandleLayer);
    // Capas visibles, pero solo el modo activo captura los clics.
    const editArea = activeLayoutWorkspace()==='architecture';
    const editStreet = activeLayoutWorkspace()==='urbanism';
    if(!editStreet) streetsLayer.style.pointerEvents='none';
    if(!editArea){[areaLayer,roomLayer,edgeLayer,zoneLayer,wallLayer,openingLayer,vertexLayer,measureLayer].forEach(layer=>layer.style.pointerEvents='none');}
    if(activeLayoutWorkspace()!=='distribution') rackLayer.style.pointerEvents='none';
    if(!editStreet && activeLayoutWorkspace()!=='distribution') streetHandleLayer.style.pointerEvents='none';


    const streetRoadFill = street => `url(#street-road-${(ensureStreetVisualDefaults(street).roadType||'drain-covered')})`;
    const streetSidewalkFill = street => `url(#street-sidewalk-${(ensureStreetVisualDefaults(street).sidewalkType||'paver')})`;
    const streetFurnitureColor = type => ({ 'urban-set':'#d67b5f', bench:'#c86d56', planter:'#7e9d73', bollard:'#6c7074', bin:'#55595d' }[type] || '#c86d56');
    const rotateLocalPts = (x,y,rotDeg,pts=[]) => {
      const r=(Number(rotDeg||0)||0)*Math.PI/180, cos=Math.cos(r), sin=Math.sin(r);
      return pts.map(([dx,dy])=>({x:x+dx*cos-dy*sin,y:y+dx*sin+dy*cos}));
    };
    const renderStreetFurniture2D = (street, layer, selected=false) => {
      ensureStreetVisualDefaults(street);
      (street.streetFurniture||[]).forEach(item => {
        const x=Number(item.x||0), y=Number(item.y||0), rot=Number(item.rotation||0)||0;
        const w=Math.max(20, Number(item.width||36)), d=Math.max(20, Number(item.depth||22));
        const isSelected=selected && appState.selectedStreetFurnitureId===item.id;
        const group=svgEl('g',{'data-street-furniture-id':item.id,style:'cursor:move'});
        const selectFurniture=evt=>{
          if(appState.editor.mode!=='select') return;
          evt.stopPropagation();
          appState.selectedStreetId=street.id;
          appState.selectedStreetFurnitureId=item.id;
          appState.selectedZoneId=''; appState.selectedWallId=''; appState.selectedOpeningId=''; appState.selectedRackLayoutId='';
          startStreetFurnitureDrag(evt, street.id, item.id);
        };
        if(item.type==='urban-set'){
          const slab=rotateLocalPts(x,y,rot,[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]]);
          const leftBench=rotateLocalPts(x-w*.22*Math.cos(rot*Math.PI/180)+0, y-w*.22*Math.sin(rot*Math.PI/180)+0, rot, [[-w*.18,-d*.12],[-w*.02,-d*.12],[-w*.02,d*.12],[-w*.18,d*.12]]);
          const rightBench=rotateLocalPts(x+w*.02*Math.cos(rot*Math.PI/180)+0, y+w*.02*Math.sin(rot*Math.PI/180)+0, rot, [[0,-d*.12],[w*.18,-d*.12],[w*.18,d*.12],[0,d*.12]]);
          const planter=rotateLocalPts(x,y,rot,[[-d*.18,-d*.2],[d*.18,-d*.2],[d*.18,d*.2],[-d*.18,d*.2]]);
          const bollardA=rotateLocalPts(x,y,rot,[[-w*.43,-d*.18],[-w*.35,-d*.18],[-w*.35,d*.18],[-w*.43,d*.18]]);
          const bollardB=rotateLocalPts(x,y,rot,[[w*.35,-d*.18],[w*.43,-d*.18],[w*.43,d*.18],[w*.35,d*.18]]);
          group.appendChild(svgEl('path',{d:pathFromPts(slab),fill:'url(#street-sidewalk-concrete)',stroke:isSelected?'#0f4a3f':'rgba(92,95,98,.75)','stroke-width':isSelected?'2':'1.25'}));
          group.appendChild(svgEl('path',{d:pathFromPts(leftBench),fill:'#d67b5f',stroke:'rgba(108,67,54,.72)','stroke-width':'1'}));
          group.appendChild(svgEl('path',{d:pathFromPts(rightBench),fill:'#d67b5f',stroke:'rgba(108,67,54,.72)','stroke-width':'1'}));
          group.appendChild(svgEl('path',{d:pathFromPts(planter),fill:'#e8e0d2',stroke:'rgba(121,115,107,.88)','stroke-width':'1'}));
          const c=polygonCentroid(planter); group.appendChild(svgEl('circle',{cx:c.x,cy:c.y,r:String(Math.max(5,d*.12)),fill:'#557a4f'}));
          group.appendChild(svgEl('path',{d:pathFromPts(bollardA),fill:'#696e72',stroke:'rgba(56,59,61,.82)','stroke-width':'1'}));
          group.appendChild(svgEl('path',{d:pathFromPts(bollardB),fill:'#696e72',stroke:'rgba(56,59,61,.82)','stroke-width':'1'}));
        }else{
          const pts=rotateLocalPts(x,y,rot,[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]]);
          group.appendChild(svgEl('path',{d:pathFromPts(pts),fill:streetFurnitureColor(item.type),stroke:isSelected?'#0f4a3f':'rgba(62,63,66,.68)','stroke-width':isSelected?'1.5':'1'}));
          if(item.type==='planter') group.appendChild(svgEl('circle',{cx:x,cy:y,r:String(Math.max(4,Math.min(w,d)*.22)),fill:'#557a4f'}));
          if(item.type==='bench') group.appendChild(svgEl('line',{x1:String(pts[0].x),y1:String((pts[0].y+pts[3].y)/2),x2:String(pts[1].x),y2:String((pts[1].y+pts[2].y)/2),stroke:'rgba(255,244,234,.85)','stroke-width':'1'}));
          if(item.type==='bollard' || item.type==='bin') group.appendChild(svgEl('circle',{cx:x,cy:y,r:String(Math.max(3.2,Math.min(w,d)*.18)),fill:'rgba(255,250,240,.55)'}));
        }
        group.addEventListener('pointerdown',selectFurniture);
        layer.appendChild(group);
      });
    };

    const floorDefs=svgEl('defs');
    Object.entries(FLOOR_FINISHES).forEach(([key,finish])=>{
      if(key==='default')return;
      const tile=Math.max(12,Number(finish.size||60)/Math.max(.1,getScaleCmPerUnit()));
      const pat=svgEl('pattern',{id:`floor-${key}`,patternUnits:'userSpaceOnUse',width:tile,height:tile});
      pat.appendChild(svgEl('rect',{width:tile,height:tile,fill:finish.color}));
      if(key==='marble')pat.appendChild(svgEl('path',{d:`M ${tile*.15} ${tile*.8} Q ${tile*.35} ${tile*.3} ${tile*.86} ${tile*.17}`,fill:'none',stroke:'#bcc4bf','stroke-width':'.9',opacity:'.55'}));
      if(key==='wood')pat.appendChild(svgEl('path',{d:`M 0 ${tile*.33} H ${tile} M 0 ${tile*.68} H ${tile}`,fill:'none',stroke:finish.grout,'stroke-width':'1.4'}));
      pat.appendChild(svgEl('path',{d:`M 0 ${tile} V 0 H ${tile}`,fill:'none',stroke:finish.grout,'stroke-width':'1.6',opacity:'.88'}));
      floorDefs.appendChild(pat);
    });
    const walkPat1=svgEl('pattern',{id:'street-sidewalk-paver',patternUnits:'userSpaceOnUse',width:'56',height:'28'});
    walkPat1.appendChild(svgEl('rect',{width:'56',height:'28',fill:'#bb7860'}));
    walkPat1.appendChild(svgEl('path',{d:'M 0 14 H 56 M 0 0 H 56 M 0 28 H 56',stroke:'rgba(106,63,48,.48)','stroke-width':'1'}));
    walkPat1.appendChild(svgEl('path',{d:'M 14 0 V 14 M 42 0 V 14 M 0 14 V 28 M 28 14 V 28 M 56 14 V 28',stroke:'rgba(106,63,48,.48)','stroke-width':'1'}));
    walkPat1.appendChild(svgEl('path',{d:'M 0 2 H 56',stroke:'rgba(255,255,255,.07)','stroke-width':'1'}));
    floorDefs.appendChild(walkPat1);
    const walkPat2=svgEl('pattern',{id:'street-sidewalk-concrete',patternUnits:'userSpaceOnUse',width:'72',height:'72'});
    walkPat2.appendChild(svgEl('rect',{width:'72',height:'72',fill:'#e6e0d4'}));
    walkPat2.appendChild(svgEl('path',{d:'M 0 0 H 72 V 72',fill:'none',stroke:'rgba(194,180,153,.78)','stroke-width':'1.15'}));
    walkPat2.appendChild(svgEl('path',{d:'M 0 36 H 72 M 36 0 V 72',fill:'none',stroke:'rgba(215,207,188,.55)','stroke-width':'0.9'}));
    floorDefs.appendChild(walkPat2);
    svg.appendChild(floorDefs);
    ensureLayoutMeta();
    const boundary = layoutBoundary();
    const boundaryPts = layoutBoundaryPts();
    if(boundaryPts.length >= 3){
      const bd = pathFromPts(boundaryPts);
      areaLayer.appendChild(svgEl('path',{ d:bd, fill:'rgba(226,221,209,.16)', stroke:'rgba(198,171,128,.58)', 'stroke-width':'1.5', 'stroke-dasharray':'10 8', class:'layout-site-boundary' }));
      const bb = layoutBoundaryBounds();
      const head = svgEl('g',{});
      head.appendChild(svgEl('rect',{ x:bb.minX + 10, y:bb.minY + 10, width:112, height:26, rx:'12', fill:'rgba(7,18,30,.92)', stroke:'rgba(198,171,128,.65)', 'stroke-width':'1.1' }));
      const tx = svgEl('text',{ x:bb.minX + 66, y:bb.minY + 27, 'text-anchor':'middle', style:'font-size:11px;font-weight:800;fill:#f7efdf;pointer-events:none' });
      tx.textContent = boundary?.name || 'Área general';
      head.appendChild(tx);
      areaLayer.appendChild(head);
    }
    const totalContours=v219TotalContours();
    if(totalContours.length)overlayLayer.appendChild(svgEl('path',{d:totalContours.map(pathFromPts).join(' '),fill:'none',stroke:'#448575','stroke-width':'2','stroke-dasharray':'5 4','pointer-events':'none','data-v219-total-boundary':'1'}));
    v220RenderStreets2D(streetsLayer,svg);
    (appState.layout?.streets || []).forEach(street => {
      const selected = appState.selectedStreetId === street.id;
      const pickStreet = evt => { evt.stopPropagation(); appState.selectedStreetId = street.id; appState.selectedStreetFurnitureId=''; appState.selectedZoneId=''; appState.selectedWallId=''; appState.selectedOpeningId=''; appState.selectedRackLayoutId=''; renderLayoutEditor(); };
      const labelPts = street.roadPts?.length ? street.roadPts : (street.sidewalkPts?.length ? street.sidewalkPts : street.outerSidewalkPts);
      renderStreetFurniture2D(street, streetsLayer, selected);
      if(selected && appState.editor.showLabels!==false && Array.isArray(labelPts) && labelPts.length){
        const c = street.creation==='path'&&street.axisPts?.length?street.axisPts[Math.floor((street.axisPts.length-1)/2)]:polygonCentroid(labelPts);
        const roadLabel=getStreetSurfacePreset(street.roadType).label;
        const sideLabel=getSidewalkSurfacePreset(street.sidewalkType).label;
        const label=street.name||'Calle',px=1/(svg.getScreenCTM()?.a||1),approxW=Math.max(90,label.length*6.5)*px;
        streetsLayer.appendChild(svgEl('rect',{x:c.x-approxW/2,y:c.y-12*px,width:approxW,height:24*px,rx:8*px,fill:'rgba(246,241,231,.92)',stroke:'#448575','stroke-width':px,'pointer-events':'none'}));
        const txt=svgEl('text',{x:c.x,y:c.y+4*px,'text-anchor':'middle',style:`font-size:${12*px}px;font-weight:700;fill:#30363c;pointer-events:none`});
        txt.textContent = label;
        streetsLayer.appendChild(txt);
      }
    });
    v212RenderGeometryOverlay(svg,overlayLayer);
    const editedStreet=(appState.layout?.streets||[]).find(street=>street.id===appState.selectedStreetId);
    if(editedStreet && activeLayoutWorkspace()==='urbanism' && appState.editor.streetVerticesVisible){
      if(editedStreet.creation==='path'&&appState.editor.streetVertexPart==='roadPts')appState.editor.streetVertexPart='sidewalkPts';
      const part=['roadPts','sidewalkPts','outerSidewalkPts'].includes(appState.editor.streetVertexPart) ? appState.editor.streetVertexPart : 'roadPts';
      if(part!=='roadPts')(editedStreet[part]||[]).forEach((a,i)=>{const b=editedStreet[part][(i+1)%editedStreet[part].length],edge=svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'transparent','stroke-width':'12','vector-effect':'non-scaling-stroke','data-v220-sidewalk-edge':i,style:'pointer-events:stroke;cursor:crosshair'});edge.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();const p=projectPointToSegment(svgPoint(e,svg),a,b);v220InsertSidewalkPoint(editedStreet,part,i,{x:p.x,y:p.y});});streetHandleLayer.appendChild(edge);});
      (editedStreet[part]||[]).forEach((pt,i)=>{
        const handle=svgEl('circle',{cx:pt.x,cy:pt.y,r:8/Math.max(.001,svg.getScreenCTM()?.a||1),fill:'#fff8e9',stroke:'#267760','stroke-width':'2','vector-effect':'non-scaling-stroke',class:'street-vertex-handle',style:'cursor:move;touch-action:none','data-street-vertex':i});
        handle.addEventListener('pointerdown',event=>{
          if(event.button!==0)return;
          event.preventDefault();event.stopPropagation();
          const original={x:pt.x,y:pt.y};
          const oldOffsets=clone(editedStreet.vertexOffsets||{}),oldManual=clone(editedStreet.manualSidewalks||{}),oldFit=editedStreet.fitSidewalkToArea;appState.editor.streetSelectedVertex=i;
          const historyBefore=snapshotForType('structure');
          let dragged=false;
          const move=e=>{
            const raw=svgPoint(e,svg);
            const scale=appState.editor?.streetSnapOff?1:getSnapSize();
            const x=Math.round(raw.x/Math.max(1,scale))*Math.max(1,scale);
            const y=Math.round(raw.y/Math.max(1,scale))*Math.max(1,scale);
            let dx=x-original.x;
            let dy=y-original.y;
            if(appState.editor.orthoEnabled||e.shiftKey){if(Math.abs(dx)>=Math.abs(dy))dy=0;else dx=0;}
            const next=(editedStreet[part]||[]).map((p,j)=>j===i?{x:original.x+dx,y:original.y+dy}:{x:p.x,y:p.y});
            if(!isValidStreetPolygon(next))return;
            editedStreet[part]=next;
            if(part!=='roadPts')v220StoreSidewalk(editedStreet,part,next);
            editedStreet.vertexOffsets=editedStreet.vertexOffsets||{};
            editedStreet.vertexOffsets[part]=editedStreet.vertexOffsets[part]||{};
            const prev=oldOffsets?.[part]?.[i]||{dx:0,dy:0};
            if(part==='roadPts')editedStreet.vertexOffsets[part][i]={dx:Number(prev.dx||0)+dx,dy:Number(prev.dy||0)+dy};
            renderLayoutViewportOnly();
            handle.setAttribute('cx',next[i].x);handle.setAttribute('cy',next[i].y);
            streetsLayer.querySelectorAll(`[data-street-id="${editedStreet.id}"]`).forEach((shape,k)=>{
              const group=shape.getAttribute('data-street-part');
              if(group===part)shape.setAttribute('d',pathFromPts(next));
            });
            dragged=true;
          };
          const finish=()=>{
            window.removeEventListener('pointermove',move);
            window.removeEventListener('pointerup',finish);
            window.removeEventListener('pointercancel',cancel);
            if(dragged){recordHistorySnapshot('structure',historyBefore);rebuildStreetNetwork();persistActiveLayout();renderLayoutEditor();}
          };
          const cancel=()=>{
            editedStreet[part][i]=original;editedStreet.vertexOffsets=oldOffsets;editedStreet.manualSidewalks=oldManual;editedStreet.fitSidewalkToArea=oldFit;
            window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',cancel);
            renderLayoutEditor();
          };
          window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish,{once:true});window.addEventListener('pointercancel',cancel,{once:true});
        });
        streetHandleLayer.appendChild(handle);
      });
    }

    ensureWallTopology();
    (appState.layout.meta?.zoneSemantics==='virtual'?[]:(appState.layout.rooms||[])).forEach(room=>{ const pts=roomPointsRaw(room); if(pts.length<3) return; const linked=getRoomLinkedZone(room); const selected=appState.selectedRoomId===room.id; const d=pts.map((pt,i)=>`${i?'L':'M'} ${pt.x} ${pt.y}`).join(' ')+' Z'; const path=svgEl('path',{d,class:`layout-room-fill ${selected?'selected':''} ${linked?'is-zone':''}`,fill:linked?hexToRgba(linked.color||'#6ff0a8',selected?.14:.075):(selected?'rgba(77,222,166,.12)':'rgba(77,222,166,.055)'),stroke:linked?(linked.color||'#6ff0a8'):(selected?'rgba(111,240,168,.88)':'rgba(77,222,166,.22)'),'stroke-width':selected?'2.3':'1','stroke-dasharray':linked?'5 4':'8 7','data-room-id':room.id,style:'cursor:pointer'}); path.addEventListener('pointerdown',evt=>{ if(!isStructureLayoutScreen()||appState.editor.mode!=='select') return; evt.stopPropagation(); appState.selectedRoomId=room.id; appState.selectedZoneId=linked?.id||''; appState.selectedWallId=''; appState.selectedOpeningId=''; appState.selectedRackLayoutId=''; appState.selectedEdge={zoneId:'',a:-1,b:-1}; appState.selectedVertex={zoneId:'',idx:-1}; renderLayoutEditor(); }); roomLayer.appendChild(path); const c={x:pts.reduce((a,p)=>a+p.x,0)/pts.length,y:pts.reduce((a,p)=>a+p.y,0)/pts.length}; const t=svgEl('text',{x:c.x,y:c.y,class:`layout-room-label ${selected?'selected':''}`,'text-anchor':'middle','data-room-id':room.id,style:'cursor:pointer;pointer-events:auto'}); const area=Math.round(polygonAreaAbs(pts)*getScaleCmPerUnit()*getScaleCmPerUnit()/10000*100)/100; t.textContent=`${linked?`${linked.name||linked.id} · `:''}${room.name} · ${area} m²`; t.addEventListener('pointerdown',evt=>{ evt.stopPropagation(); appState.selectedRoomId=room.id; appState.selectedZoneId=linked?.id||''; appState.selectedWallId=''; appState.selectedOpeningId=''; renderLayoutEditor(); }); roomLayer.appendChild(t); });


    const flipSectionDirection = (axis) => {
      const cut = getSectionCut(axis);
      cut.dir = cut.dir === -1 ? 1 : -1;
      renderLayoutEditor();
    };

    const drawSectionGuide = (zone, axis) => {
      const zb = zoneBounds(zone);
      const isY = axis === 'y';
      const color = isY ? '#d16f65' : '#4d9ac2';
      const cut = clampSectionCut(zone, axis);
      const linePos = getSectionLinePosition(zone, axis);
      const extend = 38;
      const x1 = isY ? zb.minX - extend : linePos;
      const y1 = isY ? linePos : zb.minY - extend;
      const x2 = isY ? zb.maxX + extend : linePos;
      const y2 = isY ? linePos : zb.maxY + extend;
      const guide = svgEl('line',{ x1,y1,x2,y2, stroke:color, 'stroke-width':'2.5', 'stroke-dasharray':'10 8', opacity:'.98', style:isY ? 'cursor:ns-resize' : 'cursor:ew-resize' });
      guide.addEventListener('pointerdown', evt => startSectionGuideDrag(evt, axis, 'line'));
      guideLayer.appendChild(guide);
      const rangeLimit = getSectionRangeLimit(zone, axis);
      if(isY){
        const bandY1 = Math.min(linePos, rangeLimit), bandY2 = Math.max(linePos, rangeLimit);
        guideLayer.appendChild(svgEl('rect',{x:zb.minX,y:bandY1,width:Math.max(1,zb.maxX-zb.minX),height:Math.max(1,bandY2-bandY1),class:'section-range-fill'}));
        const rangeLine = svgEl('line',{x1:zb.minX-8,y1:rangeLimit,x2:zb.maxX+8,y2:rangeLimit,stroke:color,'stroke-width':'2.5','stroke-dasharray':'10 8',opacity:'.98',style:'cursor:ns-resize'});
        rangeLine.addEventListener('pointerdown', evt => startSectionGuideDrag(evt, axis, 'range'));
        guideLayer.appendChild(rangeLine);
        const rHandleL = svgEl('circle',{cx:zb.minX-8, cy:rangeLimit, r:'6', class:'section-range-handle', fill:color, stroke:color});
        rHandleL.addEventListener('pointerdown', evt => startSectionGuideDrag(evt, axis, 'range'));
        guideLayer.appendChild(rHandleL);
        const rHandleR = svgEl('circle',{cx:zb.maxX+8, cy:rangeLimit, r:'6', class:'section-range-handle', fill:color, stroke:color});
        rHandleR.addEventListener('pointerdown', evt => startSectionGuideDrag(evt, axis, 'range'));
        guideLayer.appendChild(rHandleR);
        const rHandle = svgEl('circle',{cx:(zb.minX+zb.maxX)/2, cy:rangeLimit, r:'7', class:'section-range-handle', fill:color, stroke:color});
        rHandle.addEventListener('pointerdown', evt => startSectionGuideDrag(evt, axis, 'range'));
        guideLayer.appendChild(rHandle);
        // El corte se reconoce por color y manijas; evitamos etiquetas que pisan las cotas.
      } else {
        const bandX1 = Math.min(linePos, rangeLimit), bandX2 = Math.max(linePos, rangeLimit);
        guideLayer.appendChild(svgEl('rect',{x:bandX1,y:zb.minY,width:Math.max(1,bandX2-bandX1),height:Math.max(1,zb.maxY-zb.minY),class:'section-range-fill'}));
        const rangeLine = svgEl('line',{x1:rangeLimit,y1:zb.minY-8,x2:rangeLimit,y2:zb.maxY+8,stroke:color,'stroke-width':'2.5','stroke-dasharray':'10 8',opacity:'.98',style:'cursor:ew-resize'});
        rangeLine.addEventListener('pointerdown', evt => startSectionGuideDrag(evt, axis, 'range'));
        guideLayer.appendChild(rangeLine);
        const rHandleT = svgEl('circle',{cx:rangeLimit, cy:zb.minY-8, r:'6', class:'section-range-handle', fill:color, stroke:color});
        rHandleT.addEventListener('pointerdown', evt => startSectionGuideDrag(evt, axis, 'range'));
        guideLayer.appendChild(rHandleT);
        const rHandleB = svgEl('circle',{cx:rangeLimit, cy:zb.maxY+8, r:'6', class:'section-range-handle', fill:color, stroke:color});
        rHandleB.addEventListener('pointerdown', evt => startSectionGuideDrag(evt, axis, 'range'));
        guideLayer.appendChild(rHandleB);
        const rHandle = svgEl('circle',{cx:rangeLimit, cy:(zb.minY+zb.maxY)/2, r:'7', class:'section-range-handle', fill:color, stroke:color});
        rHandle.addEventListener('pointerdown', evt => startSectionGuideDrag(evt, axis, 'range'));
        guideLayer.appendChild(rHandle);
        // Sin rótulo redundante de límite; las manijas mantienen la interacción.
      }
      const label = svgEl('text',{ x:isY ? zb.minX+16 : linePos+12, y:isY ? linePos-12 : zb.maxY-18, fill:color, 'font-size':'10', 'font-weight':'700', 'text-anchor':'start', style:'pointer-events:none;' });
      label.textContent = isY ? 'Corte Y' : 'Corte X';
      guideLayer.appendChild(label);
      const dir = cut.dir === -1 ? -1 : 1;
      const mkArrow = (pts) => {
        const path = svgEl('path',{ d:`M ${pts.map(pt => `${pt[0]} ${pt[1]}`).join(' L ')} Z`, fill:color, stroke:'rgba(255,255,255,.18)', 'stroke-width':'1', 'stroke-linejoin':'round', opacity:'.98', style:'cursor:pointer' });
        path.addEventListener('pointerdown', (evt) => startSectionGuideDrag(evt, axis, 'arrow'));
        return path;
      };
      if(isY){
        const leftX = x1, rightX = x2, ay = linePos;
        const targetDown = rangeLimit > linePos;
        const leftArrow = targetDown
          ? [[leftX, ay+14],[leftX-10, ay-6],[leftX+10, ay-6]]
          : [[leftX, ay-14],[leftX-10, ay+6],[leftX+10, ay+6]];
        const rightArrow = targetDown
          ? [[rightX, ay+14],[rightX-10, ay-6],[rightX+10, ay-6]]
          : [[rightX, ay-14],[rightX-10, ay+6],[rightX+10, ay+6]];
        guideLayer.appendChild(mkArrow(leftArrow));
        guideLayer.appendChild(mkArrow(rightArrow));
      } else {
        const ax = linePos, topY = y1, botY = y2;
        const topArrow = dir === 1
          ? [[ax+14, topY],[ax-6, topY-10],[ax-6, topY+10]]
          : [[ax-14, topY],[ax+6, topY-10],[ax+6, topY+10]];
        const botArrow = dir === 1
          ? [[ax+14, botY],[ax-6, botY-10],[ax-6, botY+10]]
          : [[ax-14, botY],[ax+6, botY-10],[ax+6, botY+10]];
        guideLayer.appendChild(mkArrow(topArrow));
        guideLayer.appendChild(mkArrow(botArrow));
      }
      const handle = svgEl('circle',{ cx:isY ? (zb.minX+zb.maxX)/2 : linePos, cy:isY ? linePos : (zb.minY+zb.maxY)/2, r:'7', fill:color, stroke:'#05101c', 'stroke-width':'2', style:isY ? 'cursor:ns-resize' : 'cursor:ew-resize' });
      handle.addEventListener('pointerdown', evt => startSectionGuideDrag(evt, axis, 'handle'));
      guideLayer.appendChild(handle);
    };

    appState.layout.zones.forEach(zone => {
      const d = zone.pts.map((p,i)=>`${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
      const zoneWallThickness = getZoneWallThickness(zone);
      const wallInsetOpacity = appState.editor.wallsVisible === false ? (appState.selectedZoneId===zone.id ? .34 : .22) : (appState.selectedZoneId===zone.id ? .20 : .12);
      const path = svgEl('path',{d,class:'ortho-zone' + (appState.selectedZoneId===zone.id ? ' selected' : ''),fill:zone.floorFinish && FLOOR_FINISHES[zone.floorFinish] && zone.floorFinish!=='default' ? `url(#floor-${zone.floorFinish})` : hexToRgba(zone.color || '#ffd84d', wallInsetOpacity),stroke:hexToRgba(zone.color || '#ffd84d', appState.editor.wallsVisible === false ? .98 : .46),'stroke-width':'1.4','stroke-dasharray':'6 4','data-zone-id':zone.id});
      path.addEventListener('pointerdown', e => {
        try{ e.currentTarget?.setPointerCapture?.(e.pointerId); }catch(_){}
        startZoneDrag(e, zone.id);
      }); if(appState.editor.zonesLocked || isRackDistributionScreen()){ path.style.cursor='default'; if(isRackDistributionScreen()) path.classList.add('workspace-locked'); }
      zoneLayer.appendChild(path);
      const c = centroid(zone.pts);
      const zb = zoneBoundsOf(zone);
      const zoneTitle = String(zone.name || zone.id || '').trim() || String(zone.id || '');
      const zoneSub = String(zone.id || '').trim().toUpperCase();
      const padX = 12, padY = 10;
      const badgeW = Math.min(Math.max(88, zoneTitle.length * 8.2 + 24), Math.max(96, zb.maxX - zb.minX - 24));
      const hasSub = !!zoneSub && !zoneTitle.toUpperCase().includes(zoneSub);
      const badgeH = hasSub ? 42 : 28;
      const badgePos = findZoneBadgePlacement(zone, badgeW, badgeH);
      const badgeX = badgePos.x;
      const badgeY = badgePos.y;
      const badge = svgEl('g',{transform:`translate(${badgeX} ${badgeY})`,'data-v213-zone-name':zone.id,'data-v213-ui':'1',role:'button',tabindex:'0','aria-label':`Renombrar zona ${zoneTitle}`,style: appState.editor.showLabels === false ? 'display:none' : 'cursor:text;pointer-events:all'});
      const badgeTitle=svgEl('title');badgeTitle.textContent='Doble clic para renombrar';badge.appendChild(badgeTitle);
      badge.addEventListener('pointerdown',e=>{if(appState.editor.mode==='select'){e.stopPropagation();}});
      badge.addEventListener('mousedown',e=>{if(e.detail>=2 && appState.editor.architectureTool==='zones'){e.preventDefault();e.stopPropagation();v213OpenRename(svg,zone.id);}});
      badge.addEventListener('dblclick',e=>{if(appState.editor.architectureTool==='zones'){e.preventDefault();e.stopPropagation();v213OpenRename(svg,zone.id);}});
      badge.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key==='F2')&&appState.editor.architectureTool==='zones'){e.preventDefault();v213OpenRename(svg,zone.id);}});
      badge.appendChild(svgEl('rect',{x:0,y:0,width:badgeW,height:badgeH,rx:'10',fill:'rgba(5,16,28,.86)',stroke:hexToRgba(zone.color || '#B0E4CC', .95),'stroke-width':'1.4'}));
      const badgeText = svgEl('text',{x:padX,y:hasSub ? 16 : 18,class:'zone-badge-text','text-anchor':'start'});
      badgeText.textContent = zoneTitle;
      badge.appendChild(badgeText);
      if(hasSub){
        const badgeSub = svgEl('text',{x:padX,y:31,class:'zone-badge-sub','text-anchor':'start'});
        badgeSub.textContent = zoneSub;
        badge.appendChild(badgeSub);
      }
      zoneLayer.appendChild(badge);
      if(appState.editor.showDims && activeLayoutWorkspace()!=='architecture') drawZoneEdgeDimensions(edgeLayer, zone);

      if(appState.selectedZoneId===zone.id && activeLayoutWorkspace()==='architecture' && appState.editor.architectureTool!=='area'){
        if(appState.editor.sectionVisible){
          drawSectionGuide(zone, 'x');
          drawSectionGuide(zone, 'y');
        }
        const handleOffsetUnits = 15 / Math.max(.01, getScaleCmPerUnit());
        zone.pts.forEach((p, idx) => {
          // El centro del controlador coincide con el vértice real, incluso en esquinas diagonales.
          const hx = p.x;
          const hy = p.y;
          const selectedVertex = appState.selectedVertex.zoneId===zone.id && appState.selectedVertex.idx===idx;
          const px=appState.editor.viewBox.w/Math.max(1,svg.getBoundingClientRect().width);
          const hit = svgEl('circle',{cx:hx,cy:hy,r:12*px,class:'vertex-hit'});
          const v = svgEl('circle',{cx:hx,cy:hy,r:(selectedVertex?7:5)*px,class:'vertex' + (selectedVertex ? ' selected' : '')});
          const vertexTitle=svgEl('title');vertexTitle.textContent=`Mover vértice ${idx+1}`;v.appendChild(vertexTitle);
          [hit, v].forEach(el => { el.addEventListener('pointerdown', e => startVertexDrag(e, zone.id, idx)); if(appState.editor.mode!=='select'||zone.locked||appState.editor.zonesLocked || isRackDistributionScreen() || (isRoomLinkedZone(zone) && appState.editor.architectureTool!=='walls')) el.style.pointerEvents='none'; });
          [hit,v].forEach(el=>el.addEventListener('contextmenu',e=>{if(appState.editor.architectureTool!=='zones')return;e.preventDefault();e.stopPropagation();appState.selectedZoneId=zone.id;v212Remove('zones',idx);}));
          if(appState.editor.architectureTool==='zones'){vertexLayer.appendChild(hit);vertexLayer.appendChild(v);}
        });
        zone.pts.forEach((p, idx) => {
          const q = zone.pts[(idx+1)%zone.pts.length];
          const en = getZoneOutwardEdgeNormal(zone, p, q);
          const mx = (p.x + q.x)/2, my = (p.y + q.y)/2;
          const hx = mx + en.x * handleOffsetUnits;
          const hy = my + en.y * handleOffsetUnits;
          const activeEdge = (appState.selectedEdge.zoneId===zone.id && appState.selectedEdge.a===idx);
          const edgeLineHit = svgEl('line',{x1:p.x + en.x*4,y1:p.y + en.y*4,x2:q.x + en.x*4,y2:q.y + en.y*4,class:'edge-hit','stroke-width':'20'});
          edgeLineHit.addEventListener('pointerdown', e => {if(appState.editor.architectureTool!=='walls')startEdgeDrag(e, zone.id, idx, (idx+1)%zone.pts.length);}); if(appState.editor.architectureTool==='walls')edgeLineHit.style.pointerEvents='none'; if(zone.locked||appState.editor.zonesLocked || isRackDistributionScreen() || isRoomLinkedZone(zone)) edgeLineHit.style.pointerEvents='none';
          edgeLayer.appendChild(edgeLineHit);
          if(activeEdge) edgeLayer.appendChild(svgEl('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,class:'edge-guide'}));
          const edgePx=1/(svg.getScreenCTM()?.a||1);
          const hitBox = svgEl('circle',{cx:hx,cy:hy,r:12*edgePx,class:'edge-hit'});
          const handle = svgEl('rect',{x:hx-5*edgePx,y:hy-5*edgePx,width:10*edgePx,height:10*edgePx,rx:2*edgePx,class:'edge-handle' + (activeEdge ? ' active' : '')});
          const edgeTitle=svgEl('title');edgeTitle.textContent=`Mover lado ${idx+1}`;handle.appendChild(edgeTitle);
          [hitBox, handle].forEach(el => { el.addEventListener('pointerdown', e => startEdgeDrag(e, zone.id, idx, (idx+1)%zone.pts.length)); if(zone.locked||appState.editor.zonesLocked || isRackDistributionScreen() || isRoomLinkedZone(zone)) el.style.pointerEvents='none'; });
          if(appState.editor.architectureTool!=='walls'){
            edgeLayer.appendChild(hitBox);
            edgeLayer.appendChild(handle);
          }
          const edgeWall = getZoneEdgeWall(zone, idx);
          const isWallEdge = !!edgeWall?.enabled;
          // V203: no chips + MURO permanentes. En herramienta Muros la arista
          // se resalta al pasar el cursor; clic = seleccionar, inspector = actuar.
          if(appState.editor.architectureTool==='walls'&&typeof v214AreaContext!=='function'){
            const segment=svgEl('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,
              class:'v203-wall-edge-target'+(activeEdge?' active':''),'data-v213-layer':'walls',
              'stroke-width':'18',stroke:'transparent',style:'cursor:pointer;pointer-events:stroke'});
            segment.addEventListener('pointerdown',e=>{
              if(appState.editor.mode!=='select')return;
              e.preventDefault();e.stopPropagation();
              appState.selectedZoneId=zone.id;
              appState.selectedRoomId=zone.linkedRoomId||'';
              appState.selectedEdge={zoneId:zone.id,a:idx,b:(idx+1)%zone.pts.length};
              appState.selectedWallId=findManualWallForZoneEdge(zone,idx)?.id||'';
              appState.editor.wallDraftThickness=null;appState.editor.wallDraftHeight=null;
              appState.selectedOpeningId='';appState.selectedRackLayoutId='';
              renderLayoutEditor();
            });
            // La capa de vértices va por encima del relleno de zonas y de los muros.
            vertexLayer.appendChild(segment);
          }
        });
        if(appState.selectedEdge.zoneId===zone.id && appState.selectedEdge.a>=0){
          const a = zone.pts[appState.selectedEdge.a], b = zone.pts[appState.selectedEdge.b];
          edgeLayer.appendChild(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'edge-guide'}));
        }
        if(appState.editor.architectureTool==='walls' && appState.selectedVertex?.zoneId===zone.id && appState.selectedVertex?.idx>=0){
          drawWallVertexPlacementMenu(vertexLayer, zone, appState.selectedVertex.idx);
        }
      }
    });


    ensureLayoutDecorations();
    cleanupDetachedOpenings();

    const getRenderableWallOpenings = wall => {
      const len = Math.max(1, wallLength(wall));
      return (appState.layout.openings || []).filter(o => o.wallId === wall.id).map(o => {
        const width = Math.max(40, Math.min(len * .86, Number(o.width || openingDefaultForType(o.type).width) || 90));
        const half = width / 2 / len;
        const t = openingClampT(wall, width, o.t);
        return { opening:o, width, t0:Math.max(0, t - half), t1:Math.min(1, t + half) };
      }).sort((a,b) => a.t0 - b.t0);
    };

    const v117ConflictWalls = v117ConflictWallIds();
    const v216WallPolys=[];
    const renderWallSlice = (wall, t0, t1, selected) => {
      if(t1 - t0 <= .002) return;
      const isAutoZoneEdge = !!wall.autoZoneEdge;
      const isSharedWall = !!wall.isSharedWall || (Array.isArray(wall.sharedRoomIds) && wall.sharedRoomIds.length > 1);
      const outerStroke = selected ? '#b98034' : (isSharedWall ? '#497c5c' : (isAutoZoneEdge ? '#8f7860' : '#7b6753'));
      const innerStroke = selected ? '#6d4815' : (isSharedWall ? '#2f5f48' : (isAutoZoneEdge ? '#8a6c49' : '#6a5543'));
      const slice = getWallSlicePolygon(wall, t0, t1, 1);
      if(!slice?.poly) return;
      v216WallPolys.push(slice.poly);
      const d = wallPolygonPath(slice.poly);
      const hit = svgEl('path',{ d, fill:'transparent', stroke:'transparent', 'stroke-width':'14', style:wall.autoZoneEdge?'cursor:pointer':'cursor:move' });
      const conflict=v117ConflictWalls.has(wall.id);
      const fill = svgEl('path',{ d, class:conflict?'v117-wall-conflict':'', fill:conflict?'rgba(255,96,96,.88)':(selected ? 'rgba(232,204,148,.96)' : (isSharedWall ? 'rgba(219,236,225,.98)' : 'rgba(232,223,209,.98)')), stroke:conflict?'#ff5d68':outerStroke, 'stroke-width':conflict?'2.5':(isSharedWall?'2.2':'1.6'), opacity:selected ? '.99' : '.99', style:wall.autoZoneEdge?'cursor:pointer':'cursor:move' });
      const accent = svgEl('line',{ x1:slice.a.x, y1:slice.a.y, x2:slice.b.x, y2:slice.b.y, stroke:innerStroke, 'stroke-width':'1.8', 'stroke-linecap':'round', opacity:'.92', style:'pointer-events:none' });
      const selectWall = evt => {
        if(isRackDistributionScreen() || appState.editor.mode !== 'select') return;
        if(appState.editor.architectureTool!=='walls'){return;}
        evt.stopPropagation();
        appState.selectedWallId = wall.id;
        if(appState.editor.architectureTool==='walls'){
          appState.editor.areaWallEdgeIndex=null;appState.selectedZoneId='';
          if(wall.areaBinding?.perimeter){const boundary=appState.layout.meta.siteBoundary;const i=boundary.pts.findIndex(p=>p.cadVertexId===wall.areaBinding.start?.vertexId||p.cadVertexId===wall.areaBinding.start?.aId);if(i>=0)appState.editor.areaWallEdgeIndex=i;}
          const src=wall.zoneBoundarySource;
          const zone=src?.zoneId?findZoneById(src.zoneId):null;
          const index=Number(src?.edgeIndex);
          if(zone && Number.isInteger(index) && index>=0 && index<zone.pts.length){
            appState.selectedZoneId=zone.id;
            appState.selectedEdge={zoneId:zone.id,a:index,b:(index+1)%zone.pts.length};
          } else appState.selectedEdge={zoneId:'',a:-1,b:-1};
        }
        appState.selectedOpeningId = '';
        appState.selectedRackLayoutId = '';
        renderLayoutEditor();
      };
      [fill, hit].forEach(el => el.addEventListener('pointerdown', selectWall));
      // Only the union owns the normal fill/outline; selection remains per axis.
      if(!selected&&!conflict){fill.setAttribute('fill','transparent');fill.setAttribute('stroke','none');}
      accent.setAttribute('opacity',selected?'.92':'0');
      wallLayer.append(fill, accent, hit);
    };

    (appState.layout.walls || []).forEach(wall => {
      const selected = appState.selectedWallId === wall.id || v117WallSelected(wall.id);
      const label = svgEl('text',{x:(Number(wall.x1)+Number(wall.x2))/2,y:(Number(wall.y1)+Number(wall.y2))/2 - 10,class:'ortho-dim-text','text-anchor':'middle',style:(appState.editor.showLabels===false || wall.autoZoneEdge)?'display:none;pointer-events:none':'pointer-events:none;font-size:11px'});
      label.textContent = (wall.isSharedWall || (wall.sharedRoomIds||[]).length>1) ? `${wall.id} · COMP.` : wall.id;
      const openings = getRenderableWallOpenings(wall);
      if(openings.length){
        let cursor = 0;
        openings.forEach(item => {
          const t0 = Math.max(cursor, item.t0);
          const t1 = Math.max(t0, item.t1);
          if(t0 > cursor + .002) renderWallSlice(wall, cursor, t0, selected);
          cursor = Math.max(cursor, t1);
        });
        if(cursor < .998) renderWallSlice(wall, cursor, 1, selected);
      } else {
        renderWallSlice(wall, 0, 1, selected);
      }
      wallLayer.appendChild(label);
    });

    v216RenderWallUnion(wallLayer,v216WallPolys);
    const roomMergePreview=appState.editor?.roomMovePreview;
    if(roomMergePreview){
      const tw=findWallById(roomMergePreview.targetWallId);
      if(tw){
        guideLayer.appendChild(svgEl('line',{x1:tw.x1,y1:tw.y1,x2:tw.x2,y2:tw.y2,stroke:'#55f3ad','stroke-width':'7','stroke-linecap':'round',opacity:'.78','stroke-dasharray':'14 8',style:'pointer-events:none'}));
        const mx=(Number(tw.x1)+Number(tw.x2))/2, my=(Number(tw.y1)+Number(tw.y2))/2;
        const tx=svgEl('text',{x:mx,y:my-15,'text-anchor':'middle',style:'font-size:11px;font-weight:900;fill:#8dffd0;paint-order:stroke;stroke:#05101c;stroke-width:4px;pointer-events:none'}); tx.textContent=roomMergePreview.label ? `UNIR · ${roomMergePreview.label.toUpperCase()}` : 'UNIR MURO'; guideLayer.appendChild(tx);
      }
    }

    const geometrySnap=appState.editor?.geometrySnapPreview;
    if(geometrySnap?.point){
      const sp=geometrySnap.point; guideLayer.appendChild(svgEl('circle',{cx:sp.x,cy:sp.y,r:'7',fill:'rgba(72,245,167,.18)',stroke:'#48f5a7','stroke-width':'2.2',style:'pointer-events:none'}));
      const st=svgEl('text',{x:sp.x+11,y:sp.y-10,'text-anchor':'start',style:'font-size:10px;font-weight:900;fill:#8dffd0;paint-order:stroke;stroke:#05101c;stroke-width:4px;pointer-events:none'}); st.textContent=geometrySnap.label||'SNAP'; guideLayer.appendChild(st);
    }
    const zoneCollision=appState.editor?.zoneCollisionPreview;
    if(zoneCollision){
      const other=findZoneById(zoneCollision.otherZoneId); const pts=zoneCollision.pts||other?.pts||[];
      if(pts.length>=3){ const dcol=pts.map((pt,i)=>`${i?'L':'M'} ${pt.x} ${pt.y}`).join(' ')+' Z'; guideLayer.appendChild(svgEl('path',{d:dcol,fill:'rgba(255,75,91,.13)',stroke:'#ff5b68','stroke-width':'3','stroke-dasharray':'9 6',style:'pointer-events:none'})); const c=polygonCentroid(pts); const tt=svgEl('text',{x:c.x,y:c.y-12,'text-anchor':'middle',style:'font-size:11px;font-weight:950;fill:#ff8f98;paint-order:stroke;stroke:#05101c;stroke-width:4px;pointer-events:none'});tt.textContent='NO SE PUEDE SUPERPONER';guideLayer.appendChild(tt); }
    }

    v117RenderDragMeasurements(guideLayer);

    // v102: cierre completo de esquinas en L.
    getAllWallCornerClosurePolygons().forEach(joint => {
      if(!joint.zoneId)return; // Manual joins are included in the physical union.
      if(!Array.isArray(joint.poly) || joint.poly.length < 4) return;
      wallLayer.appendChild(svgEl('path',{
        d: wallPolygonPath(joint.poly),
        class:'layout-wall-corner-closure',
        fill: joint.selected ? 'rgba(232,204,148,.99)' : 'rgba(232,223,209,.99)',
        stroke: 'none',
        'stroke-width':'0',
        style:'pointer-events:none'
      }));
    });

    if(isStructureLayoutScreen() && appState.editor.mode==='select'){
      const sw=findWallById(appState.selectedWallId);
      if(sw && !sw.autoZoneEdge){
        [sw.startNodeId,sw.endNodeId].forEach((nodeId,idx)=>{ const node=getWallNode(nodeId); if(!node) return; const connected=wallsForNode(nodeId).length; const g=svgEl('g',{class:'wall-node-handle','data-v213-layer':'walls',style:'cursor:move'}); g.appendChild(svgEl('circle',{cx:node.x,cy:node.y,r:'10',fill:'rgba(5,21,32,.94)',stroke:idx===0?'#58c5ff':'#65f0a8','stroke-width':'2.4'})); g.appendChild(svgEl('circle',{cx:node.x,cy:node.y,r:'3.5',fill:idx===0?'#58c5ff':'#65f0a8'})); const tx=svgEl('text',{x:node.x+13,y:node.y-11,class:'wall-node-label'}); tx.textContent=idx===0?'A':'B'; g.appendChild(tx); g.addEventListener('pointerdown',e=>startWallNodeDrag(e,node.id)); guideLayer.appendChild(g); });
      }
    }

    // v89 FORCE: puertas con modelo de imagen 2; reemplaza definitivamente el modelo viejo de rombos.
    const openingTypeName = type => {
      const kind = normalizeOpeningType(type);
      if(kind === 'window') return 'VENTANA';
      if(kind === 'gate') return 'PORTÓN';
      if(kind === 'free') return 'ABERTURA';
      return 'PUERTA';
    };
    const openingAccentForType = (type, selected=false) => selected ? '#36f58d' : (normalizeOpeningType(type) === 'window' ? '#53e7ff' : normalizeOpeningType(type) === 'free' ? '#c7fff0' : '#36f58d');
    const clampOpeningCardSize = (value, fallback, min, max) => Math.max(min, Math.min(max, Number(value || fallback) || fallback));
    const ptAdd = (p, v, scale=1) => ({ x:p.x + v.x * scale, y:p.y + v.y * scale });
    const ptMid = (a,b) => ({ x:(a.x+b.x)/2, y:(a.y+b.y)/2 });
    const ptDist = (a,b) => Math.hypot((b.x-a.x),(b.y-a.y));
    const ptNorm = v => { const len = Math.hypot(v.x||0, v.y||0) || 1; return { x:(v.x||0)/len, y:(v.y||0)/len }; };
    const doorCardRect = (center, longDir, shortDir, cardHeight, cardWidth) => {
      const halfH = Math.max(8, cardHeight) / 2;
      const halfW = Math.max(8, cardWidth) / 2;
      const topCenter = ptAdd(center, longDir, -halfH);
      const bottomCenter = ptAdd(center, longDir, halfH);
      const topLeft = ptAdd(topCenter, shortDir, -halfW);
      const topRight = ptAdd(topCenter, shortDir, halfW);
      const bottomRight = ptAdd(bottomCenter, shortDir, halfW);
      const bottomLeft = ptAdd(bottomCenter, shortDir, -halfW);
      return {
        center, topCenter, bottomCenter,
        leftCenter:ptAdd(center, shortDir, -halfW),
        rightCenter:ptAdd(center, shortDir, halfW),
        topLeft, topRight, bottomRight, bottomLeft,
        poly:[topLeft, topRight, bottomRight, bottomLeft]
      };
    };
    const appendOpeningMeasure = (a, b, dir, side, value, title='', selected=true, offsetOverride=null) => {
      if(!a || !b || !dir || !side) return;
      const isVertical = Math.abs(dir.y) > Math.abs(dir.x);
      const offset = Number.isFinite(Number(offsetOverride)) ? Number(offsetOverride) : (selected ? 36 : 26);
      const pA = { x:a.x + side.x*offset, y:a.y + side.y*offset };
      const pB = { x:b.x + side.x*offset, y:b.y + side.y*offset };
      const color = selected ? '#ffa728' : 'rgba(255,167,40,.72)';
      const dimLine = svgEl('line',{x1:pA.x,y1:pA.y,x2:pB.x,y2:pB.y,class:'opening-dim-line',stroke:color,'stroke-width':selected?'1.8':'1.2',opacity:selected?'.98':'.66'});
      const extA = svgEl('line',{x1:a.x,y1:a.y,x2:pA.x,y2:pA.y,class:'opening-dim-ext',stroke:color,'stroke-width':'1.1','stroke-dasharray':'4 4',opacity:selected?'.92':'.55'});
      const extB = svgEl('line',{x1:b.x,y1:b.y,x2:pB.x,y2:pB.y,class:'opening-dim-ext',stroke:color,'stroke-width':'1.1','stroke-dasharray':'4 4',opacity:selected?'.92':'.55'});
      const tick = 5;
      const n = { x:-dir.y, y:dir.x };
      const tA = svgEl('line',{x1:pA.x-n.x*tick,y1:pA.y-n.y*tick,x2:pA.x+n.x*tick,y2:pA.y+n.y*tick,stroke:color,'stroke-width':'1.8',opacity:'.95'});
      const tB = svgEl('line',{x1:pB.x-n.x*tick,y1:pB.y-n.y*tick,x2:pB.x+n.x*tick,y2:pB.y+n.y*tick,stroke:color,'stroke-width':'1.8',opacity:'.95'});
      openingLayer.append(extA, extB, dimLine, tA, tB);
      const mid = { x:(pA.x+pB.x)/2, y:(pA.y+pB.y)/2 };
      const txtAnchor = isVertical ? (side.x >= 0 ? 'start' : 'end') : 'middle';
      const tx = isVertical ? mid.x + (side.x >= 0 ? 10 : -10) : mid.x;
      const ty = isVertical ? mid.y - (title ? 4 : -2) : mid.y + (side.y >= 0 ? 18 : -12);
      const labelMain = svgEl('text',{x:tx,y:ty,class:'opening-dim-text','text-anchor':txtAnchor,style:`font-size:${selected?13:11}px`});
      labelMain.textContent = formatDistanceCm(value);
      openingLayer.append(labelMain);
      if(title){
        const labelSub = svgEl('text',{x:tx,y:ty+14,class:'opening-dim-title','text-anchor':txtAnchor,style:`font-size:${selected?9:8}px`});
        labelSub.textContent = title;
        openingLayer.append(labelSub);
      }
    };
    const appendOpeningPill = (opening, anchorPoint, outwardDir, type, accentColor) => {
      const dir = outwardDir || {x:-1,y:0};
      const text = openingTypeName(type);
      const pillW = Math.max(72, Math.min(112, 44 + text.length * 7));
      const pillH = 24;
      const cx = anchorPoint.x + dir.x * (pillW/2 + 20);
      const cy = anchorPoint.y + dir.y * (pillH/2 + 20);
      const x = cx - pillW/2;
      const y = cy - pillH/2;
      const edgeDist = Math.abs(dir.x) >= Math.abs(dir.y) ? (pillW/2 + 2) : (pillH/2 + 2);
      const from = { x:cx - dir.x*edgeDist, y:cy - dir.y*edgeDist };
      const elbow = { x:from.x - dir.x*13, y:from.y - dir.y*13 };
      const to = { x:anchorPoint.x + dir.x*6, y:anchorPoint.y + dir.y*6 };
      const g = svgEl('g',{class:'opening-callout',style:'cursor:grab'});
      const connector = svgEl('polyline',{points:`${from.x},${from.y} ${elbow.x},${elbow.y} ${to.x},${to.y}`,fill:'none',stroke:accentColor,'stroke-width':'1.3',opacity:'.94'});
      const rect = svgEl('rect',{x,y,width:pillW,height:pillH,rx:'9',fill:'rgba(7,25,36,.96)',stroke:accentColor,'stroke-width':'1.6'});
      const dot = svgEl('circle',{cx:x+14,cy:cy,r:'4.5',fill:accentColor,stroke:'rgba(3,20,15,.8)','stroke-width':'1'});
      const label = svgEl('text',{x:x+26,y:cy+4,class:'opening-pill-text',style:'font-size:11px'});
      label.textContent = text;
      g.append(connector, rect, dot, label);
      g.addEventListener('pointerdown', evt => startOpeningDrag(evt, opening.id, 'move'));
      openingLayer.appendChild(g);
    };

    (appState.layout.openings || []).forEach(opening => {
      const wall = findWallById(opening.wallId);
      const seg = getOpeningSegment(opening, wall);
      if(!wall || !seg) return;
      const selected = appState.selectedOpeningId === opening.id;
      const footprint = getOpeningFootprint(opening, wall, 1);
      const type = normalizeOpeningType(opening.type);
      const accentColor = openingAccentForType(type, selected);
      const dir = wallDirection(wall);
      const normal = footprint?.normal || getWallOpeningNormal(wall);
      const poly = footprint?.poly || [];
      const p0 = poly[0], p1 = poly[1], p2 = poly[2], p3 = poly[3];
      const isDoor = true; // v94: todos los vanos usan el render rectangular modelo 2
      const wallThickness = Math.max(8, Number(wall?.thickness || opening.depth || 14) || 14);
      const doorCardWidthMin = Math.max(8, wallThickness / 2);
      const doorCardWidthMax = Math.max(doorCardWidthMin, wallThickness);
      const doorCardWidth = clampOpeningCardSize(opening.depth || wallThickness, wallThickness, doorCardWidthMin, doorCardWidthMax);
      const wallFaces=wall?getWallFaceOffsets(wall):{left:wallThickness/2,right:wallThickness/2};
      const wallCardCenter=ptAdd(seg.center,normal,(wallFaces.left-wallFaces.right)/2);
      const card = isDoor ? doorCardRect(
        wallCardCenter,
        dir,
        normal,
        clampOpeningCardSize(opening.width || 90, 90, 40, Math.max(40, Math.min(wallLength(wall) * .86, 360))),
        doorCardWidth
      ) : null;
      const hitPoly = card?.poly?.length ? card.poly : poly;
      const hitPath = hitPoly.length >= 4 ? svgEl('path',{ d:wallPolygonPath(hitPoly), fill:'rgba(0,0,0,.001)', stroke:'transparent', 'stroke-width':'12', style:'cursor:grab' }) : null;
      if(hitPath){
        hitPath.addEventListener('pointerdown', evt => startOpeningDrag(evt, opening.id, 'move'));
        openingLayer.appendChild(hitPath);
      }

      if(isDoor && card){
        const panel = svgEl('path',{
          d:wallPolygonPath(card.poly),
          class:'opening-void-body' + (selected ? ' selected' : ''),
          fill:selected ? 'rgba(8,27,40,.98)' : 'rgba(6,20,31,.78)',
          stroke:accentColor,
          'stroke-width':selected?'3.4':'2.0',
          opacity:selected?'.99':'.92',
          style:'cursor:grab'
        });
        panel.addEventListener('pointerdown', evt => startOpeningDrag(evt, opening.id, 'move'));
        openingLayer.appendChild(panel);
        openingLayer.appendChild(svgEl('line',{x1:card.topCenter.x,y1:card.topCenter.y,x2:card.bottomCenter.x,y2:card.bottomCenter.y,stroke:accentColor,'stroke-width':selected?'1.9':'1.1','stroke-linecap':'round',opacity:selected?'.78':'.50',style:'pointer-events:none'}));
      } else {
        if(poly.length >= 4){
          const panel = svgEl('path',{d:wallPolygonPath(poly),class:'opening-void-body' + (selected ? ' selected' : ''),fill:selected ? 'rgba(7,26,39,.90)' : 'rgba(4,16,26,.58)',stroke:accentColor,'stroke-width':selected?'2.3':'1.25',opacity:selected?'.99':'.82',style:'cursor:grab'});
          panel.addEventListener('pointerdown', evt => startOpeningDrag(evt, opening.id, 'move'));
          openingLayer.appendChild(panel);
        }
        if(p0 && p3){
          const jambA = svgEl('line',{x1:p0.x,y1:p0.y,x2:p3.x,y2:p3.y,class:'opening-jamb',stroke:accentColor,'stroke-width':selected?'2.2':'1.45',opacity:selected?'.96':'.74',style:'cursor:grab'});
          jambA.addEventListener('pointerdown', evt => startOpeningDrag(evt, opening.id, 'move'));
          openingLayer.appendChild(jambA);
        }
        if(p1 && p2){
          const jambB = svgEl('line',{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,class:'opening-jamb',stroke:accentColor,'stroke-width':selected?'2.2':'1.45',opacity:selected?'.96':'.74',style:'cursor:grab'});
          jambB.addEventListener('pointerdown', evt => startOpeningDrag(evt, opening.id, 'move'));
          openingLayer.appendChild(jambB);
        }
        if(type === 'window' && p0 && p1 && p2 && p3){
          const midA = { x:(p0.x + p3.x) / 2, y:(p0.y + p3.y) / 2 };
          const midB = { x:(p1.x + p2.x) / 2, y:(p1.y + p2.y) / 2 };
          const glass = svgEl('line',{x1:midA.x,y1:midA.y,x2:midB.x,y2:midB.y,class:'opening-window-glass',stroke:accentColor,'stroke-width':'1.3','stroke-dasharray':'6 4',opacity:selected?'.86':'.55',style:'cursor:grab'});
          glass.addEventListener('pointerdown', evt => startOpeningDrag(evt, opening.id, 'move'));
          openingLayer.appendChild(glass);
        }
      }

      if(selected){
        if(isDoor && card){
          const labelDir = Math.abs(dir.y) > Math.abs(dir.x) ? {x:-1,y:0} : {x:0,y:-1};
          const labelAnchor = Math.abs(labelDir.x) > Math.abs(labelDir.y)
            ? (labelDir.x < 0 ? card.leftCenter : card.rightCenter)
            : (labelDir.y < 0 ? card.topCenter : card.bottomCenter);
          appendOpeningPill(opening, labelAnchor, labelDir, type, accentColor);
          appendOpeningMeasure(card.topLeft, card.topRight, normal, { x:-dir.x, y:-dir.y }, doorCardWidth, '', true, 18);
          const hSide = Math.abs(dir.y) > Math.abs(dir.x) ? {x:1,y:0} : {x:0,y:-1};
          appendOpeningMeasure(card.topRight, card.bottomRight, dir, hSide, Number(opening.width || 90) || 90, 'ANCHO', true, 22);
          const handleR = 6.8;
          const hA = svgEl('circle',{cx:card.topCenter.x,cy:card.topCenter.y,r:handleR,fill:'#4cff9b',stroke:'#06251a','stroke-width':'2',class:'opening-resize-handle',style:'cursor:ew-resize'});
          const hB = svgEl('circle',{cx:card.bottomCenter.x,cy:card.bottomCenter.y,r:handleR,fill:'#4cff9b',stroke:'#06251a','stroke-width':'2',class:'opening-resize-handle',style:'cursor:ew-resize'});
          hA.addEventListener('pointerdown', evt => startOpeningDrag(evt, opening.id, 'resize-start'));
          hB.addEventListener('pointerdown', evt => startOpeningDrag(evt, opening.id, 'resize-end'));
          openingLayer.append(hA,hB);
          const center = svgEl('g',{class:'opening-move-handle',style:'cursor:grab'});
          center.appendChild(svgEl('circle',{cx:card.center.x,cy:card.center.y,r:'13',fill:'#4cff9b',stroke:'#06251a','stroke-width':'2.2'}));
          center.appendChild(svgEl('line',{x1:card.center.x-6,y1:card.center.y,x2:card.center.x+6,y2:card.center.y,stroke:'#063020','stroke-width':'2.2','stroke-linecap':'round'}));
          center.appendChild(svgEl('line',{x1:card.center.x,y1:card.center.y-6,x2:card.center.x,y2:card.center.y+6,stroke:'#063020','stroke-width':'2.2','stroke-linecap':'round'}));
          center.appendChild(svgEl('path',{d:`M ${card.center.x-8} ${card.center.y} L ${card.center.x-4} ${card.center.y-3} L ${card.center.x-4} ${card.center.y+3} Z`,fill:'#063020'}));
          center.appendChild(svgEl('path',{d:`M ${card.center.x+8} ${card.center.y} L ${card.center.x+4} ${card.center.y-3} L ${card.center.x+4} ${card.center.y+3} Z`,fill:'#063020'}));
          center.appendChild(svgEl('path',{d:`M ${card.center.x} ${card.center.y-8} L ${card.center.x-3} ${card.center.y-4} L ${card.center.x+3} ${card.center.y-4} Z`,fill:'#063020'}));
          center.appendChild(svgEl('path',{d:`M ${card.center.x} ${card.center.y+8} L ${card.center.x-3} ${card.center.y+4} L ${card.center.x+3} ${card.center.y+4} Z`,fill:'#063020'}));
          center.addEventListener('pointerdown', evt => startOpeningDrag(evt, opening.id, 'move'));
          openingLayer.appendChild(center);
        } else {
          appendOpeningPill(opening, seg.center, {x:-normal.x, y:-normal.y}, type, accentColor);
          const info = getOpeningPositionInfo(opening, wall);
          if(info){ appendOpeningMeasure(seg.a, seg.b, dir, { x:-normal.x, y:-normal.y }, info.width, Math.abs(dir.y) > Math.abs(dir.x) ? 'ALTURA' : 'ANCHO', true); }
          const handleR = 6.8;
          const hA = svgEl('circle',{cx:seg.a.x,cy:seg.a.y,r:handleR,fill:'#4cff9b',stroke:'#06251a','stroke-width':'2',class:'opening-resize-handle',style:'cursor:ew-resize'});
          const hB = svgEl('circle',{cx:seg.b.x,cy:seg.b.y,r:handleR,fill:'#4cff9b',stroke:'#06251a','stroke-width':'2',class:'opening-resize-handle',style:'cursor:ew-resize'});
          hA.addEventListener('pointerdown', evt => startOpeningDrag(evt, opening.id, 'resize-start'));
          hB.addEventListener('pointerdown', evt => startOpeningDrag(evt, opening.id, 'resize-end'));
          openingLayer.append(hA,hB);
          const center = svgEl('g',{class:'opening-move-handle',style:'cursor:grab'});
          center.appendChild(svgEl('circle',{cx:seg.center.x,cy:seg.center.y,r:'13',fill:'#4cff9b',stroke:'#06251a','stroke-width':'2.2'}));
          center.addEventListener('pointerdown', evt => startOpeningDrag(evt, opening.id, 'move'));
          openingLayer.appendChild(center);
        }
      }
    });

    if(appState.editor.showDims !== false || appState.editor.mode==='measure'){
      (appState.layout.measurements||[]).forEach(measure=>{
        const {a,b}=cadMeasurementEnds(measure);if(!a||!b)return;
        const selected=appState.editor.selectedMeasurementId===measure.id;
        const shape=cadMeasureShape(measureLayer,a,b,measure.offset ?? 0,{selected,measureId:measure.id});
        if(shape){
          const hit=svgEl('line',{x1:shape.start.x,y1:shape.start.y,x2:shape.end.x,y2:shape.end.y,stroke:'transparent','stroke-width':'19',style:appState.editor.mode==='select'?'cursor:ns-resize;pointer-events:stroke':'pointer-events:none'});
          hit.addEventListener('pointerdown',evt=>cadMeasureSelectAndDrag(evt,measure));
          measureLayer.appendChild(hit);
        }
      });
    }
    if(appState.editor.mode==='measure' && appState.editor.measureDraft?.a){
      const draft=appState.editor.measureDraft;
      const a=draft.a,b=draft.b || draft.cursor || a;
      if(draft.b){
        cadMeasureShape(guideLayer,a,b,draft.offset??26,{preview:true});
        const hint=svgEl('text',{x:(a.x+b.x)/2,y:(a.y+b.y)/2-14,class:'layout-measure-text active','text-anchor':'middle',style:'pointer-events:none;fill:#ba7934;paint-order:stroke;stroke:#fff7ec;stroke-width:3'});
        hint.textContent='3.er clic: fijar separación';guideLayer.appendChild(hint);
      }else{
        guideLayer.appendChild(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#d59238','stroke-width':'1.7','stroke-dasharray':'6 4','pointer-events':'none'}));
        const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};const txt=svgEl('text',{x:mid.x,y:mid.y-12,class:'layout-measure-text active','text-anchor':'middle','pointer-events':'none'});
        txt.textContent=formatDistanceCm(Math.hypot(b.x-a.x,b.y-a.y));guideLayer.appendChild(txt);
      }
      guideLayer.appendChild(svgEl('circle',{cx:a.x,cy:a.y,r:'5',fill:'#fff',stroke:'#d59238','stroke-width':'2','pointer-events':'none'}));
      if(draft.b)guideLayer.appendChild(svgEl('circle',{cx:b.x,cy:b.y,r:'5',fill:'#fff',stroke:'#d59238','stroke-width':'2','pointer-events':'none'}));
    }
    if(appState.editor.pendingWallPoint){
      const pending = appState.editor.pendingWallPoint;
      const cursor = appState.editor.wallCursor;
      guideLayer.appendChild(svgEl('circle',{cx:pending.x, cy:pending.y, r:'7', fill:'#ffd84d', stroke:'#fff', 'stroke-width':'1.5'}));
      if(cursor){
        guideLayer.appendChild(svgEl('line',{x1:pending.x,y1:pending.y,x2:cursor.x,y2:cursor.y,stroke:'#ffd84d','stroke-width':'2.3','stroke-dasharray':'8 6',opacity:'.98'}));
        const mid={x:(pending.x+cursor.x)/2,y:(pending.y+cursor.y)/2}; const dim=svgEl('text',{x:mid.x,y:mid.y-12,class:'wall-preview-dim','text-anchor':'middle'}); dim.textContent=formatDistanceCm(Math.hypot(cursor.x-pending.x,cursor.y-pending.y)); guideLayer.appendChild(dim);
        guideLayer.appendChild(svgEl('circle',{cx:cursor.x,cy:cursor.y,r:cursor.type==='endpoint'?7:5,fill:cursor.type==='endpoint'?'#65f0a8':'#58c5ff',stroke:'#04141f','stroke-width':'2'}));
        const snapTxt=svgEl('text',{x:cursor.x+11,y:cursor.y-9,class:'wall-snap-label'}); snapTxt.textContent=cursor.label||'Snap'; guideLayer.appendChild(snapTxt);
        if(cursor.type==='ortho') guideLayer.appendChild(svgEl('line',{x1:pending.x,y1:cursor.y,x2:cursor.x,y2:cursor.y,stroke:'#58c5ff','stroke-width':'1','stroke-dasharray':'3 5',opacity:'.65'}));
      }
    }

    const v117ConflictRacks = v117ConflictRackIds();
    if(appState.editor.racksVisible !== false) appState.layout.racks.forEach(r => {
      if(!rackVisibleAtLevel(r)) return;
      if(r.stackGroupId && appState.editor.stackViewMode!=='expanded' && appState.editor.visibleRackLevel==='all'){
        const lastLevel=Math.max(...modularStackMembers(r).map(x=>Number(x.stackLevel||0)));
        if(Number(r.stackLevel||0)!==lastLevel && r.id!==appState.selectedRackLayoutId)return;
      }
      r.rot = normalizeAngle(r.rot || 0);
      r.front = r.front || 'top';
      const fp = getRackFootprint(r.modelId, r.rot || 0);
      const unitScale=Math.max(.01,getScaleCmPerUnit());
      const baseW = r.stackGroupId ? Number(r.virtual?.width||120)/unitScale : fp.baseW;
      const baseH = r.stackGroupId ? Number(r.virtual?.depth||60)/unitScale : fp.baseH;
      const bboxW = r.stackGroupId ? Number(r.w||fp.w) : (fp.w || r.w || baseW);
      const bboxH = r.stackGroupId ? Number(r.h||fp.h) : (fp.h || r.h || baseH);
      const cx = r.x + bboxW/2, cy = r.y + bboxH/2;
      const g = svgEl('g',{
        class:'layout-rack-wrap',
        transform:`translate(${cx} ${cy}) rotate(${r.rot || 0})`,
        'data-rack-id':r.id
      });
      const hit = svgEl('rect',{
        x:-(bboxW/2)-14,y:-(bboxH/2)-14,width:bboxW+28,height:bboxH+28,rx:'14',
        class:'ortho-rack-hit',style:isLayoutWorkspaceScreen()?'cursor:move':'cursor:default'
      });
      const geomW = Math.max(8, baseW);
      const geomH = Math.max(8, baseH);
      const strokeInset = 0;
      const bodyInset = 0;
      const visualW = Math.max(4, geomW - bodyInset * 2);
      const visualH = Math.max(4, geomH - bodyInset * 2);
      const cornerRadius = Math.min(5, Math.max(2, Math.min(visualW, visualH) / 12));
      if(appState.selectedRackLayoutId===r.id) g.classList.add('selected');
      if(v117ConflictRacks.has(r.id)) g.classList.add('v117-conflict');
      if(isRackSelected(r.id)) g.classList.add('multi-selected');
      if(isRackSearchHit(r.id)) g.classList.add('search-hit');
      if(appState.primaryHighlightedRackId===r.id) g.classList.add('search-primary');
      g.classList.add('ortho-rack-group');
      // El plano arquitectónico también permite seleccionar y mover racks.
      const body = svgEl('rect',{
        x:-(visualW/2),y:-(visualH/2),width:visualW,height:visualH,rx:String(cornerRadius),
        class:'ortho-rack-body'
      });
      const outlineInset = 0;
      const outlineW = Math.max(4, geomW - outlineInset * 2);
      const outlineH = Math.max(4, geomH - outlineInset * 2);
      const outlineRadius = Math.min(4, Math.max(2, Math.min(outlineW, outlineH) / 12));
      const outline = svgEl('rect',{
        x:-(outlineW/2),y:-(outlineH/2),width:outlineW,height:outlineH,rx:String(outlineRadius),
        class:'ortho-rack-outline'
      });
      const fl = getFrontLine(visualW, visualH);
      const frontLine = svgEl('line',{x1:fl.x1,y1:fl.y1,x2:fl.x2,y2:fl.y2,class:'rack-front-line'});
      const frontArrow = svgEl('path',{d:frontArrowPath(fl.ax, fl.ay, fl.dir), class:'rack-front-arrow'});
      const t = svgEl('text',{
        x:0,y:4,class:'ortho-label','text-anchor':'middle','dominant-baseline':'middle',
        style:'pointer-events:none', transform:`rotate(${-normalizeAngle(r.rot||0)})`
      });
      t.textContent = r.stackGroupId?`N${Number(r.stackLevel||0)+1}-${String.fromCharCode(65+Number(r.stackModuleIndex||0))}`:(r.displayCode||r.id);
      const baseHVal = Math.round(Number(r.baseHeight || 0));
      const levelBadge = svgEl('g',{transform:`translate(${-visualW/2 + 18} ${-visualH/2 + 10})`,style:'pointer-events:none'});
      levelBadge.appendChild(svgEl('rect',{x:-18,y:-12,width:36,height:18,rx:'9',fill:'rgba(8,18,30,.95)',stroke:'#56d2ff','stroke-width':'1'}));
      const levelTxt = svgEl('text',{x:0,y:1,class:'ortho-dim-text','text-anchor':'middle',style:'font-size:10px'});
      levelTxt.textContent = `N${getRackStackLevel(r)}`;
      levelBadge.appendChild(levelTxt);
      if(appState.editor.showLabels !== false && (appState.editor.viewBox?.w || 900) < 520) g.appendChild(levelBadge);
      if(baseHVal > 0){
        const badge = svgEl('g',{transform:`translate(${visualW/2 - 10} ${-visualH/2 + 10})`,style:'pointer-events:none'});
        badge.appendChild(svgEl('rect',{x:-20,y:-12,width:40,height:18,rx:'9',fill:'rgba(8,18,30,.95)',stroke:'#56d2ff','stroke-width':'1'}));
        const bt = svgEl('text',{x:0,y:1,class:'ortho-dim-text','text-anchor':'middle',style:'font-size:10px'});
        bt.textContent = `+${baseHVal}`;
        badge.appendChild(bt);
        g.appendChild(badge);
      }
      const stackInfo = rackStackSummary(r);
      if(stackInfo.count > 1){
        const stackBadge = svgEl('g',{transform:`translate(${visualW/2 - 14} ${visualH/2 - 14})`,style:'cursor:pointer'});
        stackBadge.appendChild(svgEl('rect',{x:-18,y:-11,width:36,height:20,rx:'10',fill:'rgba(5,15,24,.96)',stroke:'#ffd84d','stroke-width':'1.2'}));
        const st = svgEl('text',{x:0,y:2,class:'ortho-dim-text','text-anchor':'middle',style:'font-size:11px;fill:#ffd84d;font-weight:900'});
        st.textContent = `×${stackInfo.count}`;
        stackBadge.appendChild(st);
        stackBadge.addEventListener('click', evt => { evt.stopPropagation(); appState.selectedRackLayoutId = r.id; appState.selectedZoneId = r.zoneId; openStackMenuForRack(r.id, evt); renderLayoutEditor(); });
        g.appendChild(stackBadge);
      }
      g.append(hit, body, outline, frontLine, frontArrow, t);
      if(r.stackGroupId){
        g.appendChild(svgEl('rect',{x:-visualW/2,y:-visualH/2,width:Math.min(7,visualW*.08),height:visualH,rx:'2',fill:STACK_LEVEL_COLORS[Number(r.stackLevel||0)%STACK_LEVEL_COLORS.length],style:'pointer-events:none'}));
      }
      g.addEventListener('pointerdown', e => startRackDrag(e, r.id));
      if(isRackDistributionScreen()) g.addEventListener('dblclick', e => { e.stopPropagation(); openStackMenuForRack(r.id, e); renderLayoutStackMenu(); renderLayoutInspector(); });
      rackLayer.appendChild(g);
    });


    // V206: blancos de selección de muros/aristas y vértices, por encima de
    // las mallas de racks solo mientras la herramienta de alineación está activa.
    if(isRackDistributionScreen() && appState.editor.rackAlignMode){
      const mode=appState.editor.rackAlignMode;
      const targets=svgEl('g',{class:'v206-align-targets'});
      const segment=(a,b,label)=>{
        const path=svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#2fb68b','stroke-width':'14',opacity:'.35',style:'cursor:crosshair;pointer-events:stroke'});
        path.addEventListener('pointerdown',evt=>{evt.stopPropagation();evt.preventDefault();v206AlignRackToSegment(a,b,label);});
        targets.appendChild(path);
      };
      const vertex=p=>{
        const circ=svgEl('circle',{cx:p.x,cy:p.y,r:'10',fill:'#f0fff8',stroke:'#258b73','stroke-width':'3',style:'cursor:crosshair'});
        circ.addEventListener('pointerdown',evt=>{evt.stopPropagation();evt.preventDefault();v206ChooseAlignPoint(p);});
        targets.appendChild(circ);
      };
      if(mode==='wall'){
        (appState.layout?.walls||[]).forEach(w=>segment({x:w.x1,y:w.y1},{x:w.x2,y:w.y2},'muro'));
        (appState.layout?.zones||[]).forEach(z=>(z.pts||[]).forEach((a,i)=>segment(a,z.pts[(i+1)%z.pts.length],'arista de zona')));
        const boundary=typeof layoutBoundaryPts==='function'?layoutBoundaryPts():[];
        boundary.forEach((a,i)=>segment(a,boundary[(i+1)%boundary.length],'perímetro principal'));
      }else if(mode==='vertices'){
        (appState.layout?.zones||[]).forEach(z=>(z.pts||[]).forEach(vertex));
        (typeof layoutBoundaryPts==='function'?layoutBoundaryPts():[]).forEach(vertex);
        (appState.layout?.wallNodes||[]).forEach(vertex);
        const first=appState.editor.rackAlignVertexA;
        if(first)targets.appendChild(svgEl('circle',{cx:first.x,cy:first.y,r:'14',fill:'none',stroke:'#e09c33','stroke-width':'3','pointer-events':'none'}));
      }
      vertexLayer.appendChild(targets);
    }

    // V195: resumen compacto de grupos apilados sobre la huella global.
    if(appState.editor.racksVisible!==false){
      const groups=new Map();
      (appState.layout.racks||[]).forEach(r=>{if(r.stackGroupId){if(!groups.has(r.stackGroupId))groups.set(r.stackGroupId,[]);groups.get(r.stackGroupId).push(r);}});
      groups.forEach((members,key)=>{
        const box=modularStackBounds(members);if(!box)return;
        const levels=modularStackLevels(members[0]);
        const expanded=appState.editor.stackViewMode==='expanded';
        const outline=svgEl('rect',{x:box.x-4,y:box.y-4,width:box.w+8,height:box.h+8,rx:'5',fill:'none',stroke:'#257d70','stroke-width':'2','stroke-dasharray':expanded?'4 5':'8 4',style:'pointer-events:none'});
        guideLayer.appendChild(outline);
        const width=Math.max(105,Math.min(215,box.w));
        const tag=svgEl('g',{transform:`translate(${box.cx-width/2} ${box.y-40})`,style:'cursor:pointer'});
        tag.appendChild(svgEl('rect',{width:width,height:35,rx:'9',fill:'rgba(14,49,45,.95)',stroke:'#49ae94','stroke-width':'1.4'}));
        const text=svgEl('text',{x:width/2,y:13,'text-anchor':'middle',fill:'#fff',style:'font-size:10px;font-weight:800'});
        text.textContent=`${key.slice(0,19)} · ${levels.length} niveles`;
        tag.appendChild(text);
        const small=svgEl('text',{x:width/2,y:27,'text-anchor':'middle',fill:'#e8f4dc',style:'font-size:10px;font-weight:700'});
        small.textContent=levels.map(l=>l.count).join(' / ');
        tag.appendChild(small);
        tag.addEventListener('pointerdown',evt=>{
          evt.stopPropagation();evt.preventDefault();
          const first=members.slice().sort((a,b)=>a.stackLevel-b.stackLevel)[0];
          if(!first)return;appState.selectedRackLayoutId=first.id;appState.selectedZoneId=first.zoneId;
          appState.editor.stackViewMode=expanded?'compact':'expanded';renderLayoutEditor();
        });
        streetHandleLayer.appendChild(tag);
      });
    }

    // Vista fantasma del mueble pendiente: mismo footprint del modelo, no persiste hasta hacer clic.
    if(isRackDistributionScreen() && appState.editor?.pendingFurnitureModelId){
      const pendingModel=rackModel(appState.editor.pendingFurnitureModelId);
      if(pendingModel){
        const scale=Math.max(.01,getScaleCmPerUnit());
        const w=Math.max(4,Number(pendingModel.width||120)/scale), h=Math.max(4,Number(pendingModel.depth||40)/scale);
        const ghost=svgEl('g',{id:'pendingFurnitureGhost',style:'display:none;pointer-events:none','aria-hidden':'true'});
        ghost.appendChild(svgEl('rect',{x:-w/2,y:-h/2,width:w,height:h,rx:'3',fill:'rgba(52,147,110,.25)',stroke:'#278c67','stroke-width':'2.5','stroke-dasharray':'7 5'}));
        const label=svgEl('text',{x:0,y:0,'text-anchor':'middle','dominant-baseline':'middle',fill:'#194f41',style:'font-size:11px;font-weight:800;paint-order:stroke;stroke:#fff9ed;stroke-width:3px'});
        label.textContent=String(pendingModel.name||'Mueble').slice(0,24);ghost.appendChild(label);
        guideLayer.appendChild(ghost);
      }
    }
    const dsBox = getDragSelectionBox();
    const snapPreview = appState.editor?.snapPreview;
    if(snapPreview?.line && Array.isArray(snapPreview.line) && snapPreview.line.length === 2){
      const [p1,p2] = snapPreview.line;
      const dash = snapPreview.strength === 'hard' ? 'none' : (snapPreview.strength === 'medium' ? '8 5' : '4 6');
      guideLayer.appendChild(svgEl('line',{x1:p1.x,y1:p1.y,x2:p2.x,y2:p2.y,stroke:snapPreview.type==='side' ? '#65f0a8' : '#56d2ff','stroke-width': snapPreview.strength === 'hard' ? '4' : '3','stroke-dasharray':dash,opacity:'.96'}));
      guideLayer.appendChild(svgEl('circle',{cx:p1.x,cy:p1.y,r:'5',fill:'#65f0a8',opacity:'.95'}));
      guideLayer.appendChild(svgEl('circle',{cx:p2.x,cy:p2.y,r:'5',fill:'#65f0a8',opacity:'.95'}));
    }

    if(dsBox && appState.editor?.dragSelect?.active){
      overlayLayer.appendChild(svgEl('rect',{x:dsBox.x,y:dsBox.y,width:dsBox.w,height:dsBox.h,class:'drag-select-box'}));
    }
    const selectedRack = findRackById(appState.selectedRackLayoutId);
    const selectedZone = selectedRack ? (findZoneById(selectedRack.zoneId) || findZoneById(appState.selectedZoneId)) : findZoneById(appState.selectedZoneId);
    if(selectedZone && activeLayoutWorkspace()!=='architecture'){
      drawSelectedZoneMeasurements(measureLayer, selectedZone);
    }
    if(selectedRack && selectedZone){
      if(isRackDistributionScreen()) drawSelectedRackMeasurements(measureLayer, selectedRack, selectedZone);
    }

    // Los renderizados sucesivos no deben acumular manejadores del canvas.
    if(svg.__v206AreaCapture){svg.removeEventListener('pointerdown',svg.__v206AreaCapture,true);svg.__v206AreaCapture=null;}
    if(isStructureLayoutScreen() && appState.editor.areaMoveMode && activeLayoutWorkspace()==='architecture'){
      const areaCapture=evt=>{
        if(typeof v213LayerLocked==='function'&&['zones','walls','openings','racks'].some(v213LayerLocked))return;
        if(evt.button!==0||!appState.editor.areaMoveMode||appState.layout.meta?.siteBoundary?.locked||(appState.layout.zones||[]).some(z=>z.locked))return;
        const p=svgPoint(evt,svg);
        if(!pointInLayoutBoundary(p))return;
        evt.stopImmediatePropagation();evt.preventDefault();
        appState.editor.dragging={type:'area-composite',start:p,original:clone(appState.layout),moved:false};
      };
      svg.__v206AreaCapture=areaCapture;
      svg.addEventListener('pointerdown',areaCapture,true);
    }
    svg.onpointerdown = handleLayoutCanvasDown;
    // En colocación, priorizar el clic de confirmación antes de los handlers
    // de selección de racks, zonas y otros objetos.
    svg.addEventListener('pointerdown',evt=>{
      if(!isRackDistributionScreen()||!appState.editor?.pendingFurnitureModelId||evt.button!==0)return;
      evt.preventDefault();evt.stopImmediatePropagation();
      confirmPendingFurniturePlacement(svgPoint(evt,svg));
    },{capture:true});
    svg.onpointermove = handleLayoutMove;
    svg.onpointerup = stopEditorDrag;
    svg.onpointerleave = stopEditorDrag;
    if(typeof v214RenderAreaWallTargets==='function')v214RenderAreaWallTargets(svg);
    v213RenderCanvas(svg);
    if(typeof v221BindCanvas==='function')v221BindCanvas(svg);
  }


  function getSectionCut(axis, zone){
    const targetZone = zone || findZoneById(appState.selectedZoneId) || appState.layout.zones[0];
    const cuts = ensureZoneSectionCuts(targetZone);
    return cuts[axis] || cuts.x;
  }
  function clampSectionCut(zone, axis){
    const cut = getSectionCut(axis, zone);
    cut.pos = Math.max(.06, Math.min(.94, Number(cut.pos) || .5));
    cut.dir = cut.dir === -1 ? -1 : 1;
    return cut;
  }
  function getSectionLinePosition(zone, axis){
    const zb = zoneBounds(zone);
    const cut = clampSectionCut(zone, axis);
    return axis === 'x'
      ? zb.minX + (zb.maxX - zb.minX) * cut.pos
      : zb.minY + (zb.maxY - zb.minY) * cut.pos;
  }
  function updateSectionCutFromPoint(zone, axis, point){
    const zb = zoneBounds(zone);
    const span = axis === 'x' ? Math.max(1, zb.maxX - zb.minX) : Math.max(1, zb.maxY - zb.minY);
    const raw = axis === 'x' ? (point.x - zb.minX) / span : (point.y - zb.minY) / span;
    const cut = getSectionCut(axis, zone);
    cut.pos = Math.max(.06, Math.min(.94, raw));
  }
  function updateSectionRangeFromPoint(zone, axis, point){
    const zb = zoneBounds(zone);
    const cut = clampSectionCut(zone, axis);
    const line = getSectionLinePosition(zone, axis);
    const minEdge = axis === 'x' ? zb.minX : zb.minY;
    const maxEdge = axis === 'x' ? zb.maxX : zb.maxY;
    const target = axis === 'x' ? point.x : point.y;
    const maxDist = cut.dir === 1 ? (maxEdge - line) : (line - minEdge);
    if(maxDist <= 1){ cut.depth = maxDist; return; }
    let dist = cut.dir === 1 ? (target - line) : (line - target);
    dist = Math.max(100, Math.min(maxDist, dist));
    cut.depth = dist;
  }
  function getSectionRangeLimit(zone, axis){
    const zb = zoneBounds(zone);
    const cut = clampSectionCut(zone, axis);
    const line = getSectionLinePosition(zone, axis);
    const maxDist = cut.dir === 1
      ? ((axis === 'x' ? zb.maxX : zb.maxY) - line)
      : (line - (axis === 'x' ? zb.minX : zb.minY));
    const depth = Math.max(Math.min(100, maxDist), Math.min(maxDist, Number(cut.depth) || 100));
    return line + (cut.dir * depth);
  }
  function sectionVisibleRacks(zone, racks, axis){
    if(!zone) return [];
    const line = getSectionLinePosition(zone, axis);
    const limit = getSectionRangeLimit(zone, axis);
    const minV = Math.min(line, limit) - 0.25;
    const maxV = Math.max(line, limit) + 0.25;
    return (racks||[]).filter(r => {
      const start = axis === 'x' ? Number(r.x || 0) : Number(r.y || 0);
      const size = axis === 'x' ? Number(r.w || 0) : Number(r.h || 0);
      const end = start + size;
      return end >= minV && start <= maxV;
    });
  }


  // Cortes X/Y autoencuadrados: la geometría y los textos comparten viewBox.
  // En vistas laterales angostas se usa una anchura visual mínima identificada
  // como ampliada, sin alterar los datos físicos del rack.
  function renderSectionAxisSvg(svg, zone, racks, axis){
    if(!svg) return;
    const width=640, height=196, groundY=168, pad=32;
    const dark=document.body.classList.contains('theme-dark');
    const fg=dark?'#e7ece7':'#29453a';
    const muted=dark?'#a0b9ae':'#6b8276';
    const line=dark?'#496355':'#c0d4c8';
    const rackFill=dark?'#537d66':'#bad4bd';
    const shelf=dark?'#e3ba81':'#987045';
    svg.innerHTML='';
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.setAttribute('role','img');
    svg.setAttribute('aria-label',`Sección ${axis.toUpperCase()} · racks intersectados`);
    svg.appendChild(svgEl('rect',{x:0,y:0,width,height,rx:12,fill:dark?'#182a24':'#f4f8f2'}));
    for(let i=0;i<4;i++){
      const gy=32+i*34;
      svg.appendChild(svgEl('line',{x1:pad,y1:gy,x2:width-pad,y2:gy,stroke:line,'stroke-width':'1',opacity:'.55','stroke-dasharray':'4 7'}));
    }
    svg.appendChild(svgEl('line',{x1:pad,y1:groundY,x2:width-pad,y2:groundY,stroke:line,'stroke-width':'2'}));
    const empty=message=>{
      const t=svgEl('text',{x:width/2,y:93,fill:muted,'text-anchor':'middle','font-size':'15','font-weight':'600'});
      t.textContent=message;svg.appendChild(t);
    };
    if(!zone||!(racks||[]).length){empty('Sin racks en la zona');return;}
    const visible=sectionVisibleRacks(zone,racks,axis);
    if(!visible.length){empty('Sin racks intersectados por el corte');return;}
    const key=axis==='x'?'y':'x', sizeKey=axis==='x'?'h':'w';
    const rows=visible.map(r=>{
      const model=rackModel(r.modelId);
      return {r,model,pos:Number(r[key]||0),physicalW:Math.max(10,Number(r[sizeKey]||45)),height:Math.max(60,Number(r.rackHeight||model.height||240)),base:Math.max(0,Number(r.baseHeight||0))};
    }).sort((a,b)=>a.pos-b.pos||a.base-b.base);
    const contentW=width-pad*2;
    const minPos=Math.min(...rows.map(o=>o.pos)),maxPos=Math.max(...rows.map(o=>o.pos+o.physicalW));
    const span=Math.max(1,maxPos-minPos);
    const maxHeight=Math.max(240,...rows.map(o=>o.height+o.base));
    const scaleY=(groundY-30)/maxHeight;
    // Keep meaningful relative spacing while ensuring a single side section
    // is not reduced to a 12 px line on a 600 px card.
    const natural=rows.map(o=>Math.max(76,o.physicalW/span*contentW));
    const gaps=rows.length>1?Math.min(24,(contentW-rows.length*80)/(rows.length-1)):0;
    const total=natural.reduce((a,b)=>a+b,0)+Math.max(0,rows.length-1)*Math.max(9,gaps);
    const fit=Math.min(1,contentW/Math.max(1,total));
    const scaled=natural.map(n=>n*fit);
    let x=pad+(contentW-(scaled.reduce((a,b)=>a+b,0)+Math.max(0,rows.length-1)*Math.max(9,gaps)*fit))/2;
    rows.forEach((o,i)=>{
      const rw=scaled[i],rh=o.height*scaleY,ry=groundY-(o.base+o.height)*scaleY;
      const selected=appState.selectedRackLayoutId===o.r.id;
      const g=svgEl('g',{role:'button',tabindex:'0',style:'cursor:pointer','aria-label':`Rack ${o.r.id}`});
      g.appendChild(svgEl('rect',{x,y:ry,width:rw,height:rh,rx:3,fill:rackFill,stroke:selected?shelf:line,'stroke-width':selected?2.5:1.5}));
      const levels=Math.max(1,Math.min(12,Number(o.model.levels)||4));
      for(let k=1;k<levels;k++)g.appendChild(svgEl('line',{x1:x+2,y1:ry+rh*k/levels,x2:x+rw-2,y2:ry+rh*k/levels,stroke:shelf,'stroke-width':'2'}));
      const name=svgEl('text',{x:x+rw/2,y:Math.max(18,ry-7),'text-anchor':'middle',fill:fg,'font-size':'12','font-weight':'700'});
      name.textContent=String(o.r.id||'Rack').slice(0,20);g.appendChild(name);
      const select=()=>{appState.selectedRackLayoutId=o.r.id;appState.selectedZoneId=o.r.zoneId;renderLayoutEditor();};
      g.addEventListener('pointerdown',e=>{e.stopPropagation();select()});
      g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select()}});
      svg.appendChild(g);x+=rw+Math.max(9,gaps)*fit;
    });
    const footer=svgEl('text',{x:pad,y:188,'font-size':'11',fill:muted});
    footer.textContent=`${rows.length} rack${rows.length===1?'':'s'} · vista ${axis==='x'?'frontal':'lateral'} ajustada al contenido`;
    svg.appendChild(footer);
  }

  function renderLayoutSection(){
    const mount = $('#layoutSectionWrap');
    if(!mount) return;
    if(!appState.editor.sectionVisible || appState.editor.racksVisible === false){ mount.innerHTML = ''; mount.style.display='none'; return; }
    mount.style.display='block';
    const zone = findZoneById(appState.selectedZoneId) || appState.layout.zones[0];
    const racks = zone ? (appState.layout.racks||[]).filter(r => r.zoneId === zone.id) : [];
    mount.innerHTML = `
      <div class="layout-section-wrap layout-section-panel">
        <div class="layout-section-head">
          <div>
            <div class="layout-section-title">Cortes X / Y</div>
            <div class="layout-section-sub">Revisa cortes X e Y lado a lado en el panel desplegable.</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div class="section-stack-chip">${escapeHtml(zone?.name || zone?.id || 'Sin zona')} · ${racks.length} racks</div><button type="button" class="seg-btn" id="v215CloseSections" aria-label="Cerrar cortes">Cerrar ×</button>
          </div>
        </div>
        <div class="layout-section-body layout-section-grid">
          <div class="layout-section-card">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
              <div class="layout-section-sub">Sección eje X</div>
              <button class="seg-btn" id="btnFlipSectionX">Invertir dirección</button>
            </div>
            <svg id="layoutSectionSvg"></svg>
          </div>
          <div class="layout-section-card">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
              <div class="layout-section-sub">Sección eje Y</div>
              <button class="seg-btn" id="btnFlipSectionY">Invertir dirección</button>
            </div>
            <svg id="layoutSectionSvgY"></svg>
          </div>
        </div>
      </div>`;
    const close = $('#v215CloseSections');
    if(close) close.onclick = () => { appState.editor.sectionVisible=false; renderLayoutEditor(); };
    if(!racks.length){
      mount.querySelector('.layout-section-body').innerHTML='<p class="v215-section-empty">Esta zona no tiene racks. Selecciona una zona con racks para ver sus cortes.</p>';
      return;
    }
    renderSectionAxisSvg($('#layoutSectionSvg'), zone, racks, 'x');
    renderSectionAxisSvg($('#layoutSectionSvgY'), zone, racks, 'y');
    $('#btnFlipSectionX').onclick = () => { const cut = getSectionCut('x', zone); cut.dir *= -1; persistActiveLayout(); renderLayoutEditor(); };
    $('#btnFlipSectionY').onclick = () => { const cut = getSectionCut('y', zone); cut.dir *= -1; persistActiveLayout(); renderLayoutEditor(); };
  }

  function hexToRgba(hex, a){ const h = hex.replace('#',''); const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16); return `rgba(${r},${g},${b},${a})`; }
  function svgPoint(evt, svg){ const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); }
  function renderLayoutViewportOnly(){
    const svg = document.getElementById('layoutSvg');
    if(!svg) return;
    window.cancelAnimationFrame(appState.editor?.layoutAutoFitRaf || 0);
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    renderLayoutSvg(svg);
    renderLayoutSection();
    renderLayoutStackMenu();
    const zl = document.getElementById('zoomLabel');
    if(zl){
      const vb = appState.editor.viewBox || {w:900};
      zl.textContent = `${Math.round((900 / Math.max(1, vb.w)) * 100)}%`;
    }
  }
  function zoomLayout(factor, center){
    const vb = appState.editor.viewBox || { x:0, y:0, w:900, h:620 };
    const cx = center ? center.x : vb.x + vb.w/2;
    const cy = center ? center.y : vb.y + vb.h/2;
    const nw = Math.max(220, Math.min(2400, vb.w * factor));
    const nh = Math.max(160, Math.min(1800, vb.h * factor));
    appState.editor.viewBox = {
      x: cx - ((cx - vb.x) / vb.w) * nw,
      y: cy - ((cy - vb.y) / vb.h) * nh,
      w: nw,
      h: nh
    };
    appState.editor.viewBoxCustomized = true;
    appState.editor.lastZoomAt = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    renderLayoutViewportOnly();
  }

  function markLayoutManualInteraction(){
    if(!appState.editor) return;
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    appState.editor.viewBoxInitialized = true;
    appState.editor.lastLayoutButtonAt = now;
    appState.editor.suppressAutoFitUntil = now + 850;
  }

  function bindLayoutToolbar(){
    document.querySelectorAll('[data-layout-workspace]').forEach(btn=>btn.onclick=()=>{markLayoutManualInteraction();switchLayoutWorkspace(btn.dataset.layoutWorkspace);});
    document.querySelectorAll('[data-visible-level]').forEach(btn=>btn.onclick=()=>{
      const level=btn.dataset.visibleLevel;appState.editor.visibleRackLevel=level;
      const selected=findRackById(appState.selectedRackLayoutId);
      if(selected && !rackVisibleAtLevel(selected))appState.selectedRackLayoutId='';
      renderLayoutEditor();
    });
    const changeStreet=id=>{appState.selectedStreetId=id;appState.editor.mode='select';renderLayoutEditor();};
    if($('#v200StreetSelect'))$('#v200StreetSelect').onchange=e=>changeStreet(e.target.value);
    if($('#v200DrawStreet')){ $('#v200DrawStreet').disabled=!v219CanCreateUrbanism();$('#v200DrawStreet').onclick=()=>{if(!v219RequireUrbanism())return;appState.editor.mode='street';renderLayoutEditor();}; }
    const streetHandles=()=>{appState.editor.mode='select';appState.editor.streetAxisVisible=false;appState.editor.streetVerticesVisible=!appState.editor.streetVerticesVisible;renderLayoutEditor();};
    if($('#v200ShowStreetHandles'))$('#v200ShowStreetHandles').onclick=streetHandles;
    if($('#v200StreetHandlesRail'))$('#v200StreetHandlesRail').onclick=streetHandles;
    if($('#v200RackSelect'))$('#v200RackSelect').onchange=e=>{const rack=findRackById(e.target.value);if(!rack)return;appState.selectedRackLayoutId=rack.id;appState.selectedZoneId=rack.zoneId;renderLayoutEditor();};
    if($('#v200ShowSections'))$('#v200ShowSections').onclick=()=>{appState.editor.sectionVisible=!appState.editor.sectionVisible;renderLayoutEditor();};
    if($('#v205FreeMove'))$('#v205FreeMove').onchange=e=>{appState.editor.distributionFreeMove=!!e.target.checked;persistActiveLayout();renderLayoutEditor();};
    if($('#v205VertexSnap'))$('#v205VertexSnap').onchange=e=>{appState.editor.distributionVertexSnap=!!e.target.checked;clearRackSnapPreview();persistActiveLayout();renderLayoutEditor();};
    if($('#v206AlignClearance'))$('#v206AlignClearance').onchange=e=>{appState.editor.rackAlignClearanceCm=Math.max(0,Math.min(250,Number(e.target.value)||0));persistActiveLayout();};
    if($('#v208RackAngle'))$('#v208RackAngle').onchange=e=>{const r=findRackById(appState.selectedRackLayoutId);if(r)v194RotateRack(r,e.target.value);};
    if($('#v206AlignWall'))$('#v206AlignWall').onclick=()=>v206BeginRackAlign('wall');
    if($('#v206AlignVertices'))$('#v206AlignVertices').onclick=()=>v206BeginRackAlign('vertices');
    if($('#v208ReapplyParallel'))$('#v208ReapplyParallel').onclick=()=>{
      const ref=appState.editor?.rackAlignLast;
      if(ref?.rackId===appState.selectedRackLayoutId)v206AlignRackToSegment(ref.a,ref.b,ref.reference);
    };
    if($('#v208ReverseParallel'))$('#v208ReverseParallel').onclick=()=>{
      const r=findRackById(appState.selectedRackLayoutId);
      if(r)v194RotateRack(r,Number(r.rot||0)+180);
    };
    const cancelPlacement=document.getElementById('btnCancelFurniturePlacement');
    if(cancelPlacement)cancelPlacement.onclick=()=>{appState.editor.pendingFurnitureModelId='';appState.editor.pendingFurniturePoint=null;renderLayoutEditor();};
    if(!window.__pendingFurnitureEscapeBound){
      window.__pendingFurnitureEscapeBound=true;
      window.addEventListener('keydown',event=>{
        if(event.key!=='Escape'||!appState.editor?.pendingFurnitureModelId)return;
        appState.editor.pendingFurnitureModelId='';appState.editor.pendingFurniturePoint=null;
        if(isRackDistributionScreen())renderLayoutEditor();
      });
    }
    $$('.layout-cad-shell-v80 [data-emode]').forEach(btn => btn.onclick = () => { const nextMode = btn.dataset.emode;if(activeLayoutWorkspace()==='architecture'&&['area','zone'].includes(nextMode)){v212BeginDraw(nextMode==='area'?'area':'zones');return;}if(activeLayoutWorkspace()==='architecture'&&['wall','door','opening'].includes(nextMode)){v212SetMode('walls');} if(nextMode === 'rack' && !isRackDistributionScreen()) return; if(['zone','area','street','wall','opening','door','measure'].includes(nextMode) && isRackDistributionScreen()) return; if(activeLayoutWorkspace()==='urbanism' && !['select','street','navigate'].includes(nextMode))return; if(activeLayoutWorkspace()==='architecture' && nextMode==='street')return; markLayoutManualInteraction(); if(nextMode==='select') cancelLayoutDrawing(); else { appState.editor.mode = nextMode; if(nextMode!=='wall'){ appState.editor.pendingWallPoint=null; appState.editor.wallCursor=null; appState.editor.wallChainNodeIds=[]; appState.editor.wallChainStartNodeId=''; } if(nextMode!=='measure')appState.editor.measureDraft=null; renderLayoutEditor(); } });
    $$('[data-layout-tag-action]').forEach(btn => btn.onclick = () => {
      markLayoutManualInteraction();
      const action = btn.getAttribute('data-layout-tag-action');
      if(action === 'toggle-select') appState.editor.mode = appState.editor.mode === 'select' ? 'navigate' : 'select';
      else if(action === 'toggle-nav') appState.editor.mode = appState.editor.mode === 'navigate' ? 'select' : 'navigate';
      else if(action === 'toggle-lock-zones') appState.editor.zonesLocked = !appState.editor.zonesLocked;
      else if(action === 'toggle-dims') appState.editor.showDims = !appState.editor.showDims;
      else if(action === 'toggle-snap') { appState.editor.snapEnabled = !isSnapEnabled(); clearRackSnapPreview(); }
      else if(action === 'toggle-ortho') appState.editor.orthoEnabled = !appState.editor.orthoEnabled;
      else if(action === 'toggle-section'){ appState.editor.sectionVisible = !appState.editor.sectionVisible; if(appState.editor.sectionVisible) appState.editor.racksVisible = true; appState.editor.viewBoxInitialized = false; appState.editor.viewBoxCustomized = false; }
      else if(action === 'toggle-walls') appState.editor.wallsVisible = appState.editor.wallsVisible === false ? true : false;
      else if(action === 'toggle-openings') appState.editor.openingsVisible = appState.editor.openingsVisible === false ? true : false;
      else if(action === 'toggle-racks') appState.editor.racksVisible = appState.editor.racksVisible === false ? true : false;
      else if(action === 'toggle-zone-props') appState.editor.inspectorZoneOpen = !appState.editor.inspectorZoneOpen;
      else if(action === 'toggle-rack-props') appState.editor.rackPropsOpen = !appState.editor.rackPropsOpen;
      else if(action === 'toggle-right-props') appState.editor.rightPanelOpen = appState.editor.rightPanelOpen === false ? true : false;
      else if(action === 'noop-layers'){ appState.editor.rightPanelOpen = true; }
      else if(action === 'toggle-presentation') appState.editor.presentationMode = appState.editor.presentationMode ? false : true;
      else if(action.startsWith('history-undo-')){ undoHistory(action.slice('history-undo-'.length)); return; }
      else if(action.startsWith('history-redo-')){ redoHistory(action.slice('history-redo-'.length)); return; }
      renderLayoutEditor();
    });
    if($('#layoutBranchSelect')) $('#layoutBranchSelect').onchange = e => { markLayoutManualInteraction(); setLayoutBranch(+e.target.value || 0); renderLayoutEditor(); };
    if($('#btnFinishWall')) $('#btnFinishWall').onclick=()=>cancelLayoutDrawing();
    if($('#btnAreaPlus')) $('#btnAreaPlus').onclick=()=>v212BeginDraw('area');
    if($('#btnZonePlus')) $('#btnZonePlus').onclick=()=>v212BeginDraw('zones');
    if(!document.getElementById('btnStreetPlus') && activeLayoutWorkspace()==='urbanism'){
      const localbar = document.querySelector('.layout-cad-localbar-v80');
      if(localbar && activeLayoutWorkspace()==='urbanism'){
        const streetBtn = document.createElement('button');
        streetBtn.className = 'btn primary v80-zone-btn';
        streetBtn.id = 'btnStreetPlus';
        streetBtn.textContent = 'Calle';
        const styleWrap = document.createElement('span');
        styleWrap.className = 'seg-btn';
        styleWrap.id = 'streetCornerToggle';
        styleWrap.textContent = getStreetCornerStyle() === 'diagonal' ? 'Esquina diagonal' : 'Esquina 90°';
        const saveBtn = document.getElementById('btnSaveLayoutVisible');
        if(saveBtn?.parentNode){ saveBtn.parentNode.insertBefore(styleWrap, saveBtn); saveBtn.parentNode.insertBefore(streetBtn, styleWrap); }
      }
    }
    if($('#btnStreetPlus')){ $('#btnStreetPlus').disabled=!v219CanCreateUrbanism();if($('#btnStreetPlusRail'))$('#btnStreetPlusRail').disabled=$('#btnStreetPlus').disabled;$('#btnStreetPlus').title=v219CanCreateUrbanism()?'Ubicar calle y veredas desde el área total':'Primero dibuja el área comercial y crea sus muros';$('#btnStreetPlus').onclick = () => { if(!isStructureLayoutScreen()||!v219RequireUrbanism()) return; markLayoutManualInteraction(); appState.editor.mode = 'street'; appState.editor.pendingWallPoint = null; renderLayoutEditor(); }; }
    if($('#streetCornerToggle')) $('#streetCornerToggle').onclick = () => { const next = getStreetCornerStyle() === 'right' ? 'diagonal' : getStreetCornerStyle()==='diagonal'?'round':'right'; setStreetCornerStyle(next); persistActiveLayout(); renderLayoutEditor(); };
    if($('#btnOpeningPlus')) $('#btnOpeningPlus').onclick = () => { if(!isStructureLayoutScreen()) return; markLayoutManualInteraction(); appState.editor.mode = 'opening'; appState.editor.pendingWallPoint = null; renderLayoutEditor(); };
    if($('#btnVertexPlus')) $('#btnVertexPlus').onclick = () => { markLayoutManualInteraction(); insertVertexOnSelectedEdge(); };
    if($('#btnDuplicateRack')) $('#btnDuplicateRack').onclick = () => { if(!isRackDistributionScreen()) return; markLayoutManualInteraction(); duplicateSelectedRack(); };
    if($('#btnDuplicateRackRail')) $('#btnDuplicateRackRail').onclick = () => { if(!isRackDistributionScreen()) return; markLayoutManualInteraction(); duplicateSelectedRack(); };
    if($('#btnDuplicateZone')) $('#btnDuplicateZone').onclick = () => { if(!isStructureLayoutScreen()) return; markLayoutManualInteraction(); duplicateSelectedZone(); };
    if($('#btnDeleteSelected')) $('#btnDeleteSelected').onclick = () => { markLayoutManualInteraction(); deleteLayoutSelection(); };
    const runSaveLayout = async () => { persistActiveLayout(); const label = isRackDistributionScreen() ? 'distribución' : 'estructura'; if(await saveRemoteAppState(label)) showToast(`${label.charAt(0).toUpperCase()+label.slice(1)} guardada.`, 'success'); };
    if($('#btnSaveLayoutRemote')) $('#btnSaveLayoutRemote').onclick = runSaveLayout;
    if($('#btnSaveLayoutTop')) $('#btnSaveLayoutTop').onclick = runSaveLayout;
    if($('#btnSaveLayoutVisible')) $('#btnSaveLayoutVisible').onclick = runSaveLayout;
    if($('#btnSaveLayoutFloat')) $('#btnSaveLayoutFloat').onclick = runSaveLayout;
    if($('#btnToggleSections')) $('#btnToggleSections').onclick = () => { appState.editor.sectionVisible = !appState.editor.sectionVisible; if(appState.editor.sectionVisible) appState.editor.racksVisible = true; appState.editor.viewBoxInitialized = false; appState.editor.viewBoxCustomized = false; renderLayoutEditor(); };
    if($('#btnPresentationMode')) $('#btnPresentationMode').onclick = () => { appState.editor.presentationMode = !appState.editor.presentationMode; renderLayoutEditor(); };
    if($('#btnExitPresentation')) $('#btnExitPresentation').onclick = () => { appState.editor.presentationMode = false; renderLayoutEditor(); };
    $$('[data-layout-context-action]').forEach(btn=>btn.onclick = () => {
      const action = btn.getAttribute('data-layout-context-action');
      if(action === 'ctx-duplicate-rack') return duplicateSelectedRack();
      if(action === 'ctx-delete') return deleteLayoutSelection();
      if(action === 'ctx-duplicate-zone') return duplicateSelectedZone();
      if(action === 'ctx-mode-wall'){v212SetMode('walls'); appState.editor.mode = 'wall'; appState.editor.pendingWallPoint = null; return renderLayoutEditor(); }
      if(action === 'ctx-add-door'){ const sw=findWallById(appState.selectedWallId); if(!sw) return; createOpeningOnWall(sw.id, 'door'); persistActiveLayout(); return renderLayoutEditor(); }
      if(action === 'ctx-add-window'){ const sw=findWallById(appState.selectedWallId); if(!sw) return; createOpeningOnWall(sw.id, 'window'); persistActiveLayout(); return renderLayoutEditor(); }
      if(action === 'ctx-duplicate-opening'){ const op=findOpeningById(appState.selectedOpeningId); if(!op) return; duplicateOpening(op); persistActiveLayout(); return renderLayoutEditor(); }
    });
    if($('#btnZoomIn')) $('#btnZoomIn').onclick = () => { markLayoutManualInteraction(); zoomLayout(0.86); };
    if($('#btnZoomOut')) $('#btnZoomOut').onclick = () => { markLayoutManualInteraction(); zoomLayout(1.16); };
    if($('#btnZoomFit')) $('#btnZoomFit').onclick = () => { 
      markLayoutManualInteraction();
      fitLayoutViewBox();
      appState.editor.viewBoxInitialized = true;
      renderLayoutViewportOnly();
    };
    window.requestAnimationFrame(() => {
      const stageSvg = document.getElementById('layoutSvg');
      if(!stageSvg) return;
      if(!appState.editor.viewBoxInitialized){
        fitLayoutViewBox();
        appState.editor.viewBoxInitialized = true;
      }
      renderLayoutSvg(stageSvg);
      renderLayoutSection();
    });
    const svg = $('#layoutSvg');
    svg.onwheel = e => {
      e.preventDefault();
      markLayoutManualInteraction();
      const factor = e.deltaY > 0 ? 1.10 : 0.90;
      zoomLayout(factor, svgPoint(e, svg));
    };
  }


  function renderLayoutIsoSvg(svg){
    svg.innerHTML = '';
    const iso = (x,y,z=0) => ({ x:(x-y)*0.72, y:(x+y)*0.36 - z });
    const zones = appState.layout.zones || [];
    const racks = appState.layout.racks || [];
    const pts=[];
    zones.forEach(z=> (z.pts||[]).forEach(p=>{ const q=iso(p.x,p.y,0); pts.push(q); }));
    racks.forEach(r=>{
      const h = Math.max(48, Math.round((getModelById(r.modelId)?.height || 220) * (ISO_Z_SCALE * 0.6666667)));
      [[r.x,r.y,0],[r.x+r.w,r.y,0],[r.x+r.w,r.y+r.h,0],[r.x,r.y+r.h,0],[r.x,r.y,h],[r.x+r.w,r.y,h],[r.x+r.w,r.y+r.h,h],[r.x,r.y+r.h,h]].forEach(([x,y,z])=>pts.push(iso(x,y,z)));
    });
    if(!pts.length){ svg.setAttribute('viewBox','-400 -260 800 520'); return; }
    let minX=Math.min(...pts.map(p=>p.x)), maxX=Math.max(...pts.map(p=>p.x)), minY=Math.min(...pts.map(p=>p.y)), maxY=Math.max(...pts.map(p=>p.y));
    const pad=80;
    svg.setAttribute('viewBox', `${minX-pad} ${minY-pad} ${Math.max(600,maxX-minX+pad*2)} ${Math.max(420,maxY-minY+pad*2)}`);
    const grid = svgEl('g',{opacity:'.22'});
    for(let i=-1200;i<=1200;i+=80){
      const a=iso(i,-1200,0), b=iso(i,1200,0); grid.appendChild(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'rgba(86,124,170,.28)','stroke-width':'1'}));
      const c=iso(-1200,i,0), d=iso(1200,i,0); grid.appendChild(svgEl('line',{x1:c.x,y1:c.y,x2:d.x,y2:d.y,stroke:'rgba(86,124,170,.28)','stroke-width':'1'}));
    }
    svg.appendChild(grid);
    const zoneLayer=svgEl('g'), wallLayer=svgEl('g'), rackLayer=svgEl('g'), textLayer=svgEl('g');
    svg.append(zoneLayer,wallLayer,rackLayer,textLayer);
    zones.forEach(zone=>{
      const base=(zone.pts||[]).map(p=>iso(p.x,p.y,0));
      zoneLayer.appendChild(svgEl('path',{d:base.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ')+' Z', fill:hexToRgba(zone.color||'#ffd84d', .22), stroke:hexToRgba(zone.color||'#ffd84d', .96), 'stroke-width':'2'}));
      const c=centroid(zone.pts||[]); const ci=iso(c.x,c.y,0);
      const t=svgEl('text',{x:ci.x,y:ci.y,class:'ortho-label','text-anchor':'middle'}); t.textContent=zone.id; textLayer.appendChild(t);
    });
    ensureLayoutDecorations();
    (appState.layout.walls || []).forEach(wall => {
      const poly = wall.autoZoneEdge ? getAutoWallPolygon(wall) : null;
      if(!Array.isArray(poly) || poly.length < 4) return;
      const base = poly.map(p => iso(p.x, p.y, 0));
      wallLayer.appendChild(svgEl('path',{d:base.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ')+' Z', fill:'rgba(231,239,247,.72)', stroke:'rgba(255,255,255,.55)', 'stroke-width':'1.6'}));
    });
    getAllWallCornerClosurePolygons().forEach(joint => {
      if(!Array.isArray(joint.poly) || joint.poly.length < 4) return;
      const base = joint.poly.map(p => iso(p.x, p.y, 0));
      wallLayer.appendChild(svgEl('path',{d:base.map((p,i)=>`${i?'L':'M'} ${p.x} ${p.y}`).join(' ')+' Z', fill:'rgba(231,239,247,.92)', stroke:'rgba(255,255,255,.60)', 'stroke-width':'1.4'}));
    });
    racks.forEach(r=>{
      const h = Math.max(48, Math.round((getModelById(r.modelId)?.height || 220) * (ISO_Z_SCALE * 0.6666667)));
      const p0=iso(r.x,r.y,0), p1=iso(r.x+r.w,r.y,0), p2=iso(r.x+r.w,r.y+r.h,0), p3=iso(r.x,r.y+r.h,0);
      const t0=iso(r.x,r.y,h), t1=iso(r.x+r.w,r.y,h), t2=iso(r.x+r.w,r.y+r.h,h), t3=iso(r.x,r.y+r.h,h);
      const cls = appState.selectedRackLayoutId===r.id ? ' selected' : '';
      rackLayer.appendChild(svgEl('path',{d:`M ${p3.x} ${p3.y} L ${p2.x} ${p2.y} L ${t2.x} ${t2.y} L ${t3.x} ${t3.y} Z`, class:'rack-iso'+cls, fill:'rgba(55,87,120,.55)', stroke:'#9db8d4','stroke-width':'2'}));
      rackLayer.appendChild(svgEl('path',{d:`M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${t2.x} ${t2.y} L ${t1.x} ${t1.y} Z`, class:'rack-iso'+cls, fill:'rgba(40,64,96,.65)', stroke:'#88acd1','stroke-width':'2'}));
      rackLayer.appendChild(svgEl('path',{d:`M ${t0.x} ${t0.y} L ${t1.x} ${t1.y} L ${t2.x} ${t2.y} L ${t3.x} ${t3.y} Z`, class:'rack-iso'+cls, fill:'rgba(255,255,255,.08)', stroke:'#c7d8ea','stroke-width':'2'}));
      const center=iso(r.x+r.w/2,r.y+r.h/2,h+10); const tx=svgEl('text',{x:center.x,y:center.y,class:'ortho-label','text-anchor':'middle'}); tx.textContent=r.id; textLayer.appendChild(tx);
    });
  }

  function startLayoutPan(e){
    const svg = $('#layoutSvg');
    const vb = clone(appState.editor.viewBox || { x:0, y:0, w:900, h:620 });
    appState.editor.dragging = { type:'pan-layout', startClient:{ x:e.clientX, y:e.clientY }, originalViewBox:vb };
    if(svg) svg.style.cursor = 'grabbing';
  }

  function confirmPendingFurniturePlacement(point){
    if(v213LayerLocked('racks')){showToast('Desbloquea la capa Racks para colocar el mueble.','warning');return false;}
    const modelId=appState.editor?.pendingFurnitureModelId;
    const model=modelId?rackModel(modelId):null;
    if(!model){appState.editor.pendingFurnitureModelId='';renderLayoutEditor();return false;}
    const zone=(appState.layout?.zones||[]).find(z=>pointInPoly(point,z.pts));
    if(!zone){showToast('Haz clic dentro de una zona. Si no tienes zonas, créala primero en Estructura.','warning',3000);return false;}
    const scale=Math.max(.01,getScaleCmPerUnit());
    const w=Number(model.width||120)/scale,h=Number(model.depth||40)/scale;
    const candidate={id:nextRackId(zone.id),zoneId:zone.id,modelId:model.id,x:snapGrid(point.x-w/2),y:snapGrid(point.y-h/2),w,h,rot:0,front:'auto',baseHeight:0,rackHeight:Number(model.height||200),virtualName:model.name,virtualType:'',virtual:{width:Number(model.width||120),depth:Number(model.depth||40),height:Number(model.height||200),levels:Number(model.levels||1),slots:Number(model.slots||1)},virtualPlacements:[],virtualContainers:[],customFurniture:true};
    // Comprobar la geometría completa de la huella antes de persistir.
    const fits=typeof vspaceFits==='function' ? vspaceFits(candidate) : {ok:rackFullyInsideZone(candidate,zone),msg:'El mueble no cabe en la zona.'};
    if(!fits.ok){showToast(fits.msg||'Hay una colisión o el mueble no cabe. Prueba otro lugar.','warning',3500);return false;}
    recordHistorySnapshot('distribution');
    appState.layout.racks.push(candidate);
    appState.selectedRackLayoutId=candidate.id;
    appState.selectedZoneId=zone.id;
    appState.selectedModelId=model.id;
    appState.editor.pendingFurnitureModelId='';
    appState.editor.pendingFurniturePoint=null;
    appState.editor.mode='select';
    persistActiveLayout();
    renderLayoutEditor();
    showToast('Mueble colocado y seleccionado. Ya puedes moverlo o rotarlo con snap.','success',3100);
    return true;
  }

  function handleLayoutCanvasDown(e){
    const lockKey=appState.editor.mode==='rack'?'racks':['wall','door','window','opening'].includes(appState.editor.mode)?appState.editor.mode==='wall'?'walls':'openings':appState.editor.mode==='zone'?'zones':null;
    if(lockKey&&v213LayerLocked(lockKey)){showToast('Desbloquea la capa antes de dibujar.','warning');return;}
    const svg = e.currentTarget; if(v212CanvasDown(e,svg))return; const raw = svgPoint(e, svg); const p = { x:snapGrid(raw.x), y:snapGrid(raw.y) };
    if(isRackDistributionScreen() && ['zone','area','street','wall','opening','door','measure'].includes(appState.editor.mode)) appState.editor.mode = 'select';
    if(isStructureLayoutScreen() && appState.editor.mode === 'rack') appState.editor.mode = 'select';
    if(isRackDistributionScreen() && appState.editor.pendingFurnitureModelId && e.button===0){
      e.preventDefault();e.stopPropagation();
      confirmPendingFurniturePlacement(raw);
      return;
    }
    if(activeLayoutWorkspace()==='architecture'&&appState.editor.mode==='zone'&&v214CreateZoneAt(raw))return;
    const target = e.target;
    const isPanSurface = target === svg || (target && target.classList && target.classList.contains('layout-pan-surface'));
    if(appState.editor.dragging?.type === 'pan-layout') return;
    if(isPanSurface && (appState.editor.mode === 'navigate' || e.shiftKey || e.button === 1)){
      startLayoutPan(e);
      return;
    }
    if(appState.editor.mode === 'select' && isPanSurface){
      closeStackMenu(); appState.selectedOpeningId=''; appState.selectedStreetId=''; appState.selectedStreetFurnitureId='';
      if(isStructureLayoutScreen()){ if(!(e.ctrlKey||e.metaKey))v117SetSelectedWallIds([]); appState.selectedWallId=''; }
      startDragSelection(raw,!!(e.ctrlKey||e.metaKey)); renderLayoutSvg(svg); renderLayoutInspector(); renderLayoutSection(); return;
    }
    if(appState.editor.mode === 'wall' && isStructureLayoutScreen()){
      const smart=snapWallPointSmart(raw,{origin:appState.editor.pendingWallPoint,shiftKey:e.shiftKey});
      if(!appState.editor.pendingWallPoint){
        let node=smart.nodeId?getWallNode(smart.nodeId):{...smart,id:''};
        appState.editor.pendingWallPoint = { x:node.x, y:node.y, nodeId:node.id };
        appState.editor.wallCursor = {...smart,x:node.x+100,y:node.y};
        appState.editor.wallChainNodeIds=node.id?[node.id]:[]; appState.editor.wallChainStartNodeId=node.id;
        appState.selectedWallId = ''; appState.selectedOpeningId = '';
        renderLayoutEditor(); return;
      }
      completeWallChainPoint(raw,{shiftKey:e.shiftKey});
      return;
    }
    if((appState.editor.mode === 'door' || appState.editor.mode === 'opening') && isStructureLayoutScreen()){
      const created = createOpeningAtPoint(p, appState.editor.mode==='door'?'door':'free');
      if(created){ appState.editor.mode = 'select'; persistActiveLayout(); renderLayoutEditor(); }
      else showToast('Acércate a un muro para insertar el vano.','warning',1800);
      return;
    }
    if(appState.editor.mode === 'measure' && isStructureLayoutScreen()){
      const draft=appState.editor.measureDraft;
      if(!draft?.a){
        const smart=snapWallPointSmart(raw,{}),anchor=cadMeasurementAnchor({x:smart.x,y:smart.y});
        appState.editor.measureDraft={a:anchor.point,aRef:anchor.ref,cursor:anchor.point,stage:1};
        const hint=document.getElementById('cadMeasureHint');if(hint)hint.textContent='2. Selecciona el punto B. · Esc: cancelar';
        renderLayoutSvg(svg);
      }else if(!draft.b){
        // La segunda referencia se obtiene sin ORTO: admite una cota alineada inclinada.
        const smart=snapWallPointSmart(raw,{}),anchor=cadMeasurementAnchor({x:smart.x,y:smart.y});
        if(Math.hypot(anchor.point.x-draft.a.x,anchor.point.y-draft.a.y)<1){showToast('Selecciona otro punto para la cota.','warning',1800);return;}
        draft.b=anchor.point;draft.bRef=anchor.ref;draft.stage=2;draft.offset=-26;
        const hint=document.getElementById('cadMeasureHint');if(hint)hint.textContent='3. Aleja la cota y haz clic para fijar su separación. · Esc: cancelar';
        renderLayoutSvg(svg);
      }else{
        const offset=cadMeasureOffset(draft.a,draft.b,raw);
        recordHistorySnapshot('structure');
        const m={id:nextMeasurementId(),a:draft.a,b:draft.b,aRef:draft.aRef||null,bRef:draft.bRef||null,offset:Math.round((Math.abs(offset)<3 ? (draft.offset??-26) : offset)*100)/100,dimensionType:'aligned'};
        appState.layout.measurements.push(m);
        appState.editor.selectedMeasurementId=m.id;
        appState.editor.measureDraft=null;
        appState.editor.showDims=true;
        persistActiveLayout();renderLayoutEditor();
      }
      return;
    }
    if(appState.editor.mode === 'area' && isStructureLayoutScreen()){
      ensureLayoutMeta();
      const w = 760, h = 540;
      const cx = Number(p.x || 0), cy = Number(p.y || 0);
      const proposedArea=[{x:cx-w/2,y:cy-h/2},{x:cx+w/2,y:cy-h/2},{x:cx+w/2,y:cy+h/2},{x:cx-w/2,y:cy+h/2}];
      if((appState.layout.zones||[]).some(z=>!v209ZoneInsideArea(z.pts,proposedArea))){
        showToast('El área nueva dejaría zonas existentes fuera. Usa Editar vértices o mueve el local completo.', 'warning',3800);
        appState.editor.mode='select';renderLayoutEditor();return;
      }
      if(typeof v214ApplyArea==='function'){if(!v214ApplyArea(proposedArea))return;appState.editor.mode='select';renderLayoutEditor();return;}
      recordHistorySnapshot('structure');
      appState.layout.meta.siteBoundary = { id:'AREA-GENERAL', name:'Área útil del local', pts:proposedArea };
      appState.layout.meta.autoFitBoundaryToZones=false;
      appState.editor.mode = 'select';
      persistActiveLayout();
      renderLayoutEditor();
      return;
    }
    if(appState.editor.mode === 'street' && isStructureLayoutScreen()){
      ensureLayoutMeta();
      if(!v219RequireUrbanism())return;
      const street = addStreetFromPoint(p, { cornerStyle:getStreetCornerStyle() });
      appState.selectedStreetId = street?.id || '';
      appState.editor.mode = 'select';
      persistActiveLayout();
      renderLayoutEditor();
      return;
    }
    if(appState.editor.mode === 'zone' && isStructureLayoutScreen()){
      ensureLayoutMeta();
      if(!layoutBoundaryPts().length){ showToast('Primero crea el área general del espacio.','warning',1800); return; }
      const safe = clampPointToLayoutBoundary(p, 80);
      const id = nextZoneId();
      const halfW = Math.min(90, Math.max(48, layoutBoundaryBounds().w * 0.14));
      const halfH = Math.min(64, Math.max(38, layoutBoundaryBounds().h * 0.12));
      const newZone={ id, kind:'virtual', name:'Zona ' + id, color:v211ZoneColor(), wallThickness:14, pts:[{x:safe.x-halfW,y:safe.y-halfH},{x:safe.x+halfW,y:safe.y-halfH},{x:safe.x+halfW,y:safe.y+halfH},{x:safe.x-halfW,y:safe.y+halfH}] };
      if(!v209ZoneInsideArea(newZone.pts,layoutBoundaryPts())){showToast('La zona debe quedar totalmente dentro del área útil. Prueba más cerca del centro o un espacio libre.','warning',2700);return;}
      const collision=findZoneOverlap('',newZone.pts); if(collision){showToast(`No se puede crear aquí: se superpondría con ${collision.name||collision.id}.`,'warning',2400);return;}
      appState.layout.zones.push(newZone); normalizeZoneAndRackIds(); persistActiveLayout();
      appState.selectedZoneId = id; appState.selectedStreetId = ''; appState.selectedStreetFurnitureId=''; appState.editor.mode = 'select'; renderLayoutEditor(); return;
    }
    if(appState.editor.mode === 'rack' && isRackDistributionScreen()){
      const zone = appState.layout.zones.find(z => pointInPoly(p, z.pts)) || findZoneById(appState.selectedZoneId) || appState.layout.zones[0];
      if(!zone){showToast('Primero crea una zona virtual o reasigna una existente para colocar racks.','warning',2800);return;}
      const id = nextRackId(zone.id);
      const fp = getRackFootprint(appState.selectedModelId, 0);
      const rackObj = { id, zoneId:zone.id, x:snapGrid(p.x-fp.w/2), y:snapGrid(p.y-fp.h/2), w:fp.w, h:fp.h, rot:0, modelId:appState.selectedModelId, front:'auto', baseHeight:0, rackHeight:(rackModel(appState.selectedModelId)?.height || 238) };
      keepRackSnapped(rackObj, zone); appState.layout.racks.push(rackObj); persistActiveLayout();
      appState.selectedRackLayoutId = rackObj.id; appState.editor.mode = 'select'; renderLayoutEditor(); return;
    }
    pickNearestEdge(p);
    renderLayoutInspector();
  }

  function pickNearestEdge(p){
    const zone = findZoneById(appState.selectedZoneId); if(!zone) return;
    let best = { d: Infinity, a:-1, b:-1 };
    for(let i=0;i<zone.pts.length;i++){
      const a = zone.pts[i], b = zone.pts[(i+1)%zone.pts.length];
      const pr = projectPointToSegment(p, a, b); const d = dist2(p, pr);
      if(d < best.d){ best = { d, a:i, b:(i+1)%zone.pts.length }; }
    }
    if(best.d < 180) appState.selectedEdge = { zoneId:zone.id, a:best.a, b:best.b };
    else appState.selectedEdge = { zoneId:'', a:-1, b:-1 };
  }

  // V187: partición del área en dos zonas a partir de una línea X/Y.
  // Se valida la geometría y se impide cortar racks por la mitad.
  function splitSelectedZoneByAxis(axis='x'){
    if(findZoneById(appState.selectedZoneId)?.locked)return false;
    const zone=findZoneById(appState.selectedZoneId);
    if(!zone || isRoomLinkedZone(zone)){showToast('Desvincula primero la geometría de este recinto para dividirlo.','warning',2500);return false;}
    const pts=Array.isArray(zone.pts)?zone.pts:[];
    if(pts.length<3)return false;
    const b=zoneBoundsOf(zone);
    const mid=axis==='x'?(b.minX+b.maxX)/2:(b.minY+b.maxY)/2;
    const clip=keepLow=>{
      const inside=p=>keepLow?p[axis]<=mid+1e-7:p[axis]>=mid-1e-7;
      const output=[];
      for(let i=0;i<pts.length;i++){
        const a=pts[i],next=pts[(i+1)%pts.length],ina=inside(a),inb=inside(next);
        if(ina)output.push({x:a.x,y:a.y});
        if(ina!==inb){
          const delta=next[axis]-a[axis];
          if(Math.abs(delta)>1e-8){const t=(mid-a[axis])/delta;output.push({x:a.x+(next.x-a.x)*t,y:a.y+(next.y-a.y)*t});}
        }
      }
      return output.filter((p,i)=>i===0||Math.hypot(p.x-output[i-1].x,p.y-output[i-1].y)>.001);
    };
    const left=clip(true),right=clip(false);
    const area1=polygonAreaAbs(left),area2=polygonAreaAbs(right),total=polygonAreaAbs(pts);
    if(left.length<3||right.length<3||area1<100||area2<100||Math.abs(area1+area2-total)>Math.max(.5,total*.002)||!isValidStreetPolygon(left)||!isValidStreetPolygon(right)){
      showToast('No se puede dividir esta zona sin crear polígonos inválidos.','warning',2600);return false;
    }
    const nextId=nextZoneId();
    const first={...clone(zone),pts:left},second={...clone(zone),id:nextId,name:`${zone.name||zone.id} - B`,color:v211ZoneColor(zone.id),pts:right};
    // Los racks deben caber íntegramente en una de las dos zonas nuevas.
    const existing=(appState.layout.racks||[]).filter(r=>r.zoneId===zone.id);
    const migration=[];
    for(const rack of existing){
      if(rackFullyInsideZone(rack,first))migration.push([rack,first.id]);
      else if(rackFullyInsideZone(rack,second))migration.push([rack,second.id]);
      else {showToast(`Mueve primero el rack ${rack.id}: la división lo atraviesa.`,'warning',3000);return false;}
    }
    recordHistorySnapshot('structure');
    zone.pts=left;appState.layout.zones.push(second);
    migration.forEach(([rack,id])=>rack.zoneId=id);
    if(appState.layout.meta?.zoneSemantics!=='virtual')normalizeZoneAndRackIds();
    appState.selectedZoneId=zone.id;appState.selectedEdge={zoneId:'',a:-1,b:-1};
    persistActiveLayout();renderLayoutEditor();return true;
  }

  function insertVertexOnSelectedEdge(){
    if(findZoneById(appState.selectedEdge?.zoneId)?.locked)return;
    const sel=appState.selectedEdge;const zone=findZoneById(sel.zoneId);if(!zone||sel.a<0)return;
    const a=zone.pts[sel.a],b=zone.pts[sel.b];if(!a||!b)return;
    const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    const linked=[];
    // Si el punto medio cae sobre un borde vecino, insertar el mismo vértice
    // en la otra zona. Así se mantiene una única frontera compartida editable.
    (appState.layout.zones||[]).forEach(other=>{
      if(other.id===zone.id)return;
      for(let i=0;i<other.pts.length;i++){
        const q=other.pts[i],r=other.pts[(i+1)%other.pts.length];
        if(v211PointOnSegmentSafe(mid,q,r) && !other.pts.some(v=>v211SamePoint(v,mid))){
          linked.push({zone:other,index:i+1});break;
        }
      }
    });
    recordHistorySnapshot('structure');
    const insertAt=sel.b===0?zone.pts.length:sel.b;
    zone.pts.splice(insertAt,0,mid);
    linked.forEach(({zone:neighbor,index})=>neighbor.pts.splice(index,0,{...mid}));
    appState.selectedVertex={zoneId:zone.id,idx:insertAt};
    appState.selectedEdge={zoneId:'',a:-1,b:-1};
    persistActiveLayout();renderLayoutEditor();
  }
  function v211PointOnSegmentSafe(pt,a,b){
    const len=Math.hypot(a.x-b.x,a.y-b.y);
    if(len<.1||v211SamePoint(pt,a)||v211SamePoint(pt,b))return false;
    return v209PointOnSegment(pt,a,b,.14);
  }

  function removeSelectedVertex(){
    if(findZoneById(appState.selectedVertex?.zoneId)?.locked)return;
    const sel = appState.selectedVertex || { zoneId:'', idx:-1 };
    const zone = findZoneById(sel.zoneId);
    if(!zone || sel.idx < 0 || !Array.isArray(zone.pts) || zone.pts.length <= 3) return;
    const candidate=clone(zone.pts); candidate.splice(sel.idx,1); const collision=findZoneOverlap(zone.id,candidate);
    if(collision){setZoneCollisionPreview(zone.id,collision,candidate);showToast(`No se puede quitar el vértice: la zona se superpondría con ${collision.name||collision.id}.`,'warning',2400);renderLayoutEditor();return;}
    recordHistorySnapshot('structure');zone.pts=candidate;
    appState.selectedVertex = { zoneId:'', idx:-1 };
    appState.selectedEdge = { zoneId:'', a:-1, b:-1 };
    persistActiveLayout();
    renderLayoutEditor();
  }


  function dragZoneFromState(d){
    if(!d) return null;
    if(Number.isInteger(d.zoneIndex) && appState.layout?.zones?.[d.zoneIndex]) return appState.layout.zones[d.zoneIndex];
    return findZoneById(d.zoneId);
  }

  function startZoneDrag(e, zoneId){
    if(typeof v213LayerLocked==='function' && v213LayerLocked('zones'))return;
    if(appState.editor.architectureTool==='area')return;
    if(!isStructureLayoutScreen() || appState.editor.mode !== 'select') return;
    e.stopPropagation();
    const svg = $('#layoutSvg'); const p = svgPoint(e, svg);
    appState.selectedZoneId = zoneId; appState.selectedRackLayoutId = ''; appState.selectedWallId = ''; appState.selectedOpeningId = '';
    closeStackMenu();
    const zone = findZoneById(zoneId);
    if(!zone) return;
    appState.selectedRoomId = zone.linkedRoomId || '';
    if(zone.locked||appState.editor.zonesLocked){renderLayoutEditor();return;}
    const linkedRoom=getRoomForZone(zone);
    if(linkedRoom){
      ensureWallTopology();
      const detachedShared = typeof v128PrepareRoomForMove === 'function' ? !!v128PrepareRoomForMove(linkedRoom) : false;
      const originalNodes={}; roomNodeIds(linkedRoom).forEach(id=>{ const n=getWallNode(id); if(n) originalNodes[id]={x:n.x,y:n.y}; });
      appState.editor.dragging={type:'room-zone',zoneId,roomId:linkedRoom.id,start:p,originalNodes,originalZonePts:clone(zone.pts||[]),mergeCandidate:null,moved:false,lastValidDx:0,lastValidDy:0,blockedByZoneCollision:false,detachedShared};
      appState.editor.roomMovePreview=null;
      renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector(); return;
    }
    const zoneIndex = (appState.layout?.zones || []).findIndex(z => z === zone);
    appState.editor.dragging = { type:'zone', zoneId, zoneIndex, start:p, original: clone(zone.pts), lastValid:clone(zone.pts), blockedByZoneCollision:false,historyBefore:snapshotForType('structure') };
    renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector();
  }
  function selectWallVertex(e, zoneId, idx){
    if(!isStructureLayoutScreen() || appState.editor.mode !== 'select' || appState.editor.zonesLocked) return;
    e.stopPropagation();
    const zone = findZoneById(zoneId); if(!zone) return;
    appState.selectedZoneId = zoneId;
    appState.selectedVertex = { zoneId, idx };
    appState.selectedEdge = { zoneId:'', a:-1, b:-1 };
    appState.selectedWallId = '';
    appState.selectedOpeningId = '';
    appState.selectedRackLayoutId = '';
    appState.selectedRoomId = zone.linkedRoomId || '';
    renderLayoutEditor();
  }
  function applyWallsAtVertex(zoneId, idx, placement){
    const zone = findZoneById(zoneId);
    if(!zone || !Array.isArray(zone.pts) || zone.pts.length < 2) return;
    const scale = Math.max(.001, getScaleCmPerUnit());
    const thickness = Math.max(4, Math.min(80, Number(appState.editor.wallDraftThickness ?? 12))) / scale;
    const height = Math.max(100, Math.min(800, Number(appState.editor.wallDraftHeight ?? (appState.layout?.meta?.defaultWallHeight || 290)))) / scale;
    const prevIdx = (idx - 1 + zone.pts.length) % zone.pts.length;
    const currIdx = idx;
    recordHistorySnapshot('structure');
    setZoneEdgeWall(zone, prevIdx, { thickness, height, placement });
    setZoneEdgeWall(zone, currIdx, { thickness, height, placement });
    appState.editor.wallDefaultPlacement = placement;
    appState.selectedZoneId = zoneId;
    appState.selectedVertex = { zoneId, idx };
    appState.selectedEdge = { zoneId, a:currIdx, b:(currIdx + 1) % zone.pts.length };
    appState.selectedWallId = zoneEdgeWallId(zone.id, currIdx) || zoneEdgeWallId(zone.id, prevIdx) || '';
    syncZonePerimeterWalls();
    persistActiveLayout();
    renderLayoutEditor();
  }
  function drawWallVertexPlacementMenu(layer, zone, idx){
    if(!layer || !zone || !Array.isArray(zone.pts) || !zone.pts[idx]) return;
    const p = zone.pts[idx];
    const outward = typeof getZoneOutwardVertexNormal === 'function' ? getZoneOutwardVertexNormal(zone, idx) : { x:0, y:-1 };
    const scale = Math.max(.001, getScaleCmPerUnit());
    const gap = 18 / scale;
    const pillH = 18 / scale;
    const base = { x:p.x + outward.x * (26/scale), y:p.y + outward.y * (26/scale) };
    const items = [
      { key:'inside', label:'+ Dentro', dx:0, dy:0 },
      { key:'center', label:'+ Centro', dx:0, dy:(pillH + gap) },
      { key:'outside', label:'+ Fuera', dx:0, dy:(pillH + gap) * 2 }
    ];
    items.forEach(item => {
      const x = base.x + item.dx;
      const y = base.y + item.dy;
      const w = 58 / scale;
      const h = 18 / scale;
      const g = svgEl('g', { class:'v204-wall-vertex-action', style:'cursor:pointer' });
      const bg = svgEl('rect', { x:x - w/2, y:y - h/2, width:w, height:h, rx:8/scale, ry:8/scale, fill:'#0f2438', stroke:'#5fe3b1', 'stroke-width':'1.2', opacity:'0.98' });
      const fg = svgEl('text', { x, y:y + 1.8/scale, 'text-anchor':'middle', fill:'#ffffff', 'font-size': 7.5/scale, 'font-weight':'700', style:'pointer-events:none' });
      fg.textContent = item.label;
      [bg, fg].forEach(el => el.addEventListener('pointerdown', evt => { evt.preventDefault(); evt.stopPropagation(); applyWallsAtVertex(zone.id, idx, item.key); }));
      g.appendChild(bg); g.appendChild(fg);
      layer.appendChild(g);
    });
  }
  function startVertexDrag(e, zoneId, idx){
    if(typeof v213LayerLocked==='function' && v213LayerLocked('zones'))return;
    if(appState.editor.architectureTool==='area'||findZoneById(zoneId)?.locked)return;
    if(!isStructureLayoutScreen() || appState.editor.mode !== 'select' || appState.editor.zonesLocked) return;
    if(appState.editor.architectureTool==='walls'){
      selectWallVertex(e, zoneId, idx);
      return;
    }
    e.stopPropagation();
    const svg = $('#layoutSvg'); const p = svgPoint(e, svg);
    const zone = findZoneById(zoneId);
    if(!zone) return;
    if(isRoomLinkedZone(zone)){ showToast('La geometría está vinculada al recinto. Edita sus muros.', 'warning', 2400); return; }
    const zoneIndex = (appState.layout?.zones || []).findIndex(z => z === zone);
    appState.selectedZoneId = zoneId; appState.selectedVertex = { zoneId, idx }; appState.selectedRackLayoutId = ''; appState.selectedWallId = ''; appState.selectedOpeningId = '';
    closeStackMenu();
    appState.editor.dragging = { type:'vertex', zoneId, zoneIndex, idx, start:p, original: clone(zone.pts[idx]), historyBefore:snapshotForType('structure'),originalZones:clone(appState.layout.zones) };
    renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector();
  }
  function startEdgeDrag(e, zoneId, a, b){
    if(typeof v213LayerLocked==='function' && v213LayerLocked('zones'))return;
    if(appState.editor.architectureTool==='area'||findZoneById(zoneId)?.locked)return;
    if(!isStructureLayoutScreen() || appState.editor.mode !== 'select' || appState.editor.zonesLocked) return;
    e.stopPropagation();
    const svg = $('#layoutSvg'); const p = svgPoint(e, svg);
    const zone = findZoneById(zoneId);
    if(!zone) return;
    if(isRoomLinkedZone(zone)){ showToast('La geometría está vinculada al recinto. Edita sus muros.', 'warning', 2400); return; }
    const zoneIndex = (appState.layout?.zones || []).findIndex(z => z === zone);
    appState.selectedZoneId = zoneId;
    appState.selectedEdge = { zoneId, a, b };
    appState.selectedRackLayoutId = '';
    appState.selectedWallId = '';
    appState.selectedOpeningId = '';
    closeStackMenu();
    appState.editor.dragging = { type:'edge', zoneId, zoneIndex, a, b, start:p, originalA: clone(zone.pts[a]), originalB: clone(zone.pts[b]), historyBefore:snapshotForType('structure'),originalZones:clone(appState.layout.zones) };
    renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector();
  }
  function startSectionGuideDrag(e, axis, source='line'){
    if(!appState.editor.sectionVisible) return;
    e.stopPropagation();
    const zone = findZoneById(appState.selectedZoneId) || appState.layout.zones[0];
    if(!zone) return;
    const svg = $('#layoutSvg'); const p = svgPoint(e, svg);
    appState.editor.dragging = { type:'section-guide', axis, zoneId:zone.id, start:p, moved:false, source };
  }

  function startStreetFurnitureDrag(e, streetId, furnitureId){
    if(!isStructureLayoutScreen() || appState.editor.mode !== 'select') return;
    e.stopPropagation();
    const street=(appState.layout?.streets||[]).find(s=>s.id===streetId);
    const item=(street?.streetFurniture||[]).find(it=>it.id===furnitureId);
    if(!street||!item) return;
    const svg = $('#layoutSvg'); const p = svgPoint(e, svg);
    appState.editor.dragging = { type:'street-furniture', streetId, furnitureId, start:p, original:{ x:Number(item.x||0), y:Number(item.y||0) } };
    renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector();
  }

  function startRackDrag(e, rackId){
    if(typeof v213LayerLocked==='function' && v213LayerLocked('racks'))return;
    if(!isLayoutWorkspaceScreen() || appState.editor.mode !== 'select') return;
    e.preventDefault();e.stopPropagation();
    const rack = findRackById(rackId);
    if(!rack) return;
    closeStackMenu();
    if(e.altKey && rack.stackGroupId){
      const members=modularStackMembers(rack);
      const svg=$('#layoutSvg'),p=svgPoint(e,svg);
      appState.selectedRackLayoutId=rack.id;
      appState.editor.dragging={type:'modular-stack',groupId:rack.stackGroupId,start:p,originals:members.map(m=>({id:m.id,x:m.x,y:m.y,zoneId:m.zoneId})),historyBefore:snapshotForType('distribution')};
      renderLayoutSvg(svg);renderLayoutSection();renderLayoutInspector();return;
    }
    if(e.shiftKey){
      toggleRackSelection(rackId);
      appState.selectedZoneId = rack.zoneId;
      const activeSvg = document.getElementById('layoutSvg');
      renderLayoutSvg(activeSvg); renderLayoutSection(); renderLayoutInspector();
      return;
    }
    const currentIds=getSelectedRackIds();
    if(!currentIds.includes(rackId)) setSelectedRackIds([rackId]);
    const dragIds=getSelectedRackIds();
    const svg = $('#layoutSvg'); const p = svgPoint(e, svg);
    const cx = rack.x + rack.w/2, cy = rack.y + rack.h/2;
    appState.selectedZoneId = rack.zoneId;
    appState.selectedWallId = '';
    appState.selectedOpeningId = '';
    if(dragIds.length>1){
      const originals={}; dragIds.forEach(id=>{const rr=findRackById(id);if(rr)originals[id]={x:rr.x,y:rr.y,zoneId:rr.zoneId};});
      appState.editor.dragging={type:'rack-group',rackIds:dragIds,start:p,originals,historyBefore:snapshotForType('distribution')};
    }else appState.editor.dragging = { type:'rack', rackId, start:p, original: { x:rack.x, y:rack.y, cx, cy, zoneId:rack.zoneId },historyBefore:snapshotForType('distribution') };
    renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector();
  }

  function handleLayoutMove(e){
    const svg = $('#layoutSvg'); const p = svgPoint(e, svg);
    if(typeof v221PreviewStreet==='function'&&v221PreviewStreet(e,svg))return;
    if(isRackDistributionScreen() && appState.editor?.pendingFurnitureModelId && !appState.editor?.dragging){
      const ghost=svg?.querySelector('#pendingFurnitureGhost');
      const model=rackModel(appState.editor.pendingFurnitureModelId);
      if(ghost&&model){
        const center={x:isSnapEnabled()?snapGrid(p.x):p.x,y:isSnapEnabled()?snapGrid(p.y):p.y};
        ghost.style.display='';ghost.setAttribute('transform',`translate(${center.x} ${center.y})`);
        const zone=(appState.layout.zones||[]).find(z=>pointInPoly(center,z.pts));
        const sc=Math.max(.01,getScaleCmPerUnit());
        const candidate={zoneId:zone?.id||'',x:center.x-Number(model.width||120)/sc/2,y:center.y-Number(model.depth||40)/sc/2,w:Number(model.width||120)/sc,h:Number(model.depth||40)/sc,rot:0,baseHeight:0};
        const ok=!!zone&&(typeof vspaceFits==='function'?vspaceFits(candidate).ok:true);
        const rect=ghost.querySelector('rect');
        if(rect){rect.setAttribute('stroke',ok?'#278c67':'#c45543');rect.setAttribute('fill',ok?'rgba(52,147,110,.25)':'rgba(190,72,57,.22)');}
      }
      return;
    }
    const d = appState.editor.dragging;
    if(!d && !appState.editor?.dragSelect?.active){
      if(isStructureLayoutScreen() && appState.editor.mode==='wall' && appState.editor.pendingWallPoint){ appState.editor.wallCursor=snapWallPointSmart(p,{origin:appState.editor.pendingWallPoint,shiftKey:e.shiftKey}); renderLayoutSvg(svg); return; }
      if(isStructureLayoutScreen() && appState.editor.mode==='measure' && appState.editor.measureDraft?.a){ const draft=appState.editor.measureDraft; if(draft.b){ draft.offset=cadMeasureOffset(draft.a,draft.b,p); } else { const smart=snapWallPointSmart(p,{});draft.cursor=cadMeasurementAnchor({x:smart.x,y:smart.y}).point; } renderLayoutSvg(svg); return; }
      return;
    }
    if(d && d.type === 'pan-layout'){
      const rect = svg.getBoundingClientRect();
      const vb = d.originalViewBox || appState.editor.viewBox || { x:0, y:0, w:900, h:620 };
      const scaleX = vb.w / Math.max(1, rect.width);
      const scaleY = vb.h / Math.max(1, rect.height);
      const dxClient = e.clientX - d.startClient.x;
      const dyClient = e.clientY - d.startClient.y;
      appState.editor.viewBox = {
        x: vb.x - dxClient * scaleX,
        y: vb.y - dyClient * scaleY,
        w: vb.w,
        h: vb.h
      };
      renderLayoutSvg(svg); renderLayoutSection();
      return;
    }
    if(appState.editor?.dragSelect?.active){
      updateDragSelection(p);
      renderLayoutSvg(svg); renderLayoutSection();
      return;
    }
    const dx = snapGrid(p.x - d.start.x), dy = snapGrid(p.y - d.start.y);
    if(d.type === 'area-composite'){
      const dx=isSnapEnabled()?snapGrid(p.x-d.start.x):(p.x-d.start.x);
      const dy=isSnapEnabled()?snapGrid(p.y-d.start.y):(p.y-d.start.y);
      v206TranslateAreaSnapshot(d.original,dx,dy);
      d.moved=!!(Math.abs(dx)>0.01||Math.abs(dy)>0.01);
      renderLayoutSvg(svg);renderLayoutSection();return;
    }
    if(d.type === 'zone'){
      const zone = dragZoneFromState(d);
      if(!zone) return;
      const snapped=snapZoneTranslation(zone,d.original,p.x-d.start.x,p.y-d.start.y);
      const candidate=d.original.map(pt=>({...pt,x:pt.x+snapped.dx,y:pt.y+snapped.dy}));
      const collision=findZoneOverlap(zone.id,candidate);
      if(collision){ zone.pts=clone(d.lastValid||d.original); d.blockedByZoneCollision=true; setZoneCollisionPreview(zone.id,collision,candidate); }
      else { zone.pts=candidate; d.lastValid=clone(candidate); d.blockedByZoneCollision=false; clearZoneCollisionPreview(); }
      // v110: mover la zona no arrastra los racks.
      clearRackSnapPreview(); renderLayoutSvg(svg); renderLayoutSection();
    } else if(d.type === 'room-zone'){
      const room=findRoomById(d.roomId), zone=findZoneById(d.zoneId); if(!room||!zone) return;
      const rawDx=p.x-d.start.x, rawDy=p.y-d.start.y;
      const snapMove=snapZoneTranslation(zone,d.originalZonePts||zone.pts,rawDx,rawDy);
      const candidateMerge=(typeof v128FindRoomContactSnap === 'function' ? v128FindRoomContactSnap(room,d.originalNodes,snapMove.dx,snapMove.dy) : null) || findRoomWallCollisionSnap(room,d.originalNodes,snapMove.dx,snapMove.dy);
      const useDx=candidateMerge?candidateMerge.dx:snapMove.dx, useDy=candidateMerge?candidateMerge.dy:snapMove.dy;
      const proposed=roomCandidatePoints(room,d.originalNodes,useDx,useDy); const collision=findZoneOverlap(zone.id,proposed);
      if(collision){ d.blockedByZoneCollision=true; d.mergeCandidate=null; appState.editor.roomMovePreview=null; setZoneCollisionPreview(zone.id,collision,proposed); }
      else { setWallNodesPositionsBulk(Object.entries(d.originalNodes).map(([id,n])=>({id,x:n.x+useDx,y:n.y+useDy}))); d.mergeCandidate=candidateMerge; d.moved=true; d.lastValidDx=useDx; d.lastValidDy=useDy; d.blockedByZoneCollision=false; appState.editor.roomMovePreview=candidateMerge; clearZoneCollisionPreview(); }
      clearRackSnapPreview(); renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector();
    } else if(d.type === 'wall-group'){
      const rawDx=snapGrid(p.x-d.start.x), rawDy=snapGrid(p.y-d.start.y); const sm=snapWallNodeSetTranslation(d.nodeIds,d.originalNodes,rawDx,rawDy,d.wallIds||[]); const ok=trySetWallNodesPositionsBulk(d.nodeIds.map(id=>({id,x:d.originalNodes[id].x+sm.dx,y:d.originalNodes[id].y+sm.dy})),appState.layout,{silent:true}); d.blockedByZoneCollision=!ok; d.moved=d.moved||ok; clearRackSnapPreview(); renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector();
    } else if(d.type === 'wall-body'){
      const rawDx=snapGrid(p.x-d.start.x), rawDy=snapGrid(p.y-d.start.y); const sm=snapWallNodeSetTranslation(d.nodeIds,d.originalNodes,rawDx,rawDy,[d.wallId]);
      const ok=trySetWallNodesPositionsBulk(d.nodeIds.map(id=>({id,x:d.originalNodes[id].x+sm.dx,y:d.originalNodes[id].y+sm.dy})),appState.layout,{silent:true});
      d.blockedByZoneCollision=!ok; d.moved=d.moved||ok; clearRackSnapPreview(); renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector();
    } else if(d.type === 'vertex'){
      const zone = dragZoneFromState(d);
      if(!zone) return;
      const lockAxis = (e.shiftKey || appState.editor.orthoEnabled) ? (Math.abs(p.x - d.start.x) >= Math.abs(p.y - d.start.y) ? 'x' : 'y') : null;
      const snapped = snapPointAdvanced(p, { zoneId:d.zoneId, keepAxis:lockAxis, origin:d.original }); appState.editor.geometrySnapPreview={point:{x:snapped.x,y:snapped.y},label:snapped.label||'Snap',kind:snapped.type||'point'}; const candidate=clone(zone.pts);candidate[d.idx]={...candidate[d.idx],x:snapped.x,y:snapped.y};
      clearRackSnapPreview();
      const moved=v211TrySharedZoneMove(zone.id,[d.idx],[candidate[d.idx]],d.originalZones||clone(appState.layout.zones));
      d.blockedByZoneCollision=!moved;if(moved)pickNearestEdge(snapped);renderLayoutSvg(svg);renderLayoutSection();
    } else if(d.type === 'edge'){
      const zone = dragZoneFromState(d);
      if(!zone) return;
      const a0 = d.originalA, b0 = d.originalB; const candidate=clone(zone.pts);
      const len=Math.hypot(b0.x-a0.x,b0.y-a0.y)||1,nx=-(b0.y-a0.y)/len,ny=(b0.x-a0.x)/len;
      let distance=(p.x-d.start.x)*nx+(p.y-d.start.y)*ny;
      if(isSnapEnabled())distance=snapGrid(distance);
      candidate[d.a]={x:a0.x+nx*distance,y:a0.y+ny*distance};candidate[d.b]={x:b0.x+nx*distance,y:b0.y+ny*distance};
      clearRackSnapPreview();
      const moved=v211TrySharedZoneMove(zone.id,[d.a,d.b],[candidate[d.a],candidate[d.b]],d.originalZones||clone(appState.layout.zones));
      d.blockedByZoneCollision=!moved;
      appState.selectedEdge = { zoneId:d.zoneId, a:d.a, b:d.b }; renderLayoutSvg(svg); renderLayoutSection();
    } else if(d.type === 'street-furniture'){
      const street=(appState.layout?.streets||[]).find(s=>s.id===d.streetId);
      const item=(street?.streetFurniture||[]).find(it=>it.id===d.furnitureId);
      if(item){
        const snapped = appState.editor?.snapEnabled===false ? {x:p.x,y:p.y} : {x:snapGrid(p.x),y:snapGrid(p.y)};
        item.x = d.original.x + (snapped.x - (appState.editor?.snapEnabled===false ? d.start.x : snapGrid(d.start.x)));
        item.y = d.original.y + (snapped.y - (appState.editor?.snapEnabled===false ? d.start.y : snapGrid(d.start.y)));
        appState.selectedStreetId=street.id; appState.selectedStreetFurnitureId=item.id;
        renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector();
      }
    } else if(d.type === 'section-guide'){
      const zone = findZoneById(d.zoneId) || appState.layout.zones[0];
      if(zone){
        if(d.source === 'range') updateSectionRangeFromPoint(zone, d.axis, p);
        else updateSectionCutFromPoint(zone, d.axis, p);
        clearRackSnapPreview();
        d.moved = true;
        renderLayoutSvg(svg); renderLayoutSection();
      }
    } else if(d.type === 'wall-node'){
      const node=getWallNode(d.nodeId); if(!node) return; const smart=snapWallPointSmart(p,{origin:d.original,shiftKey:e.shiftKey,excludeNodeId:d.nodeId}); appState.editor.geometrySnapPreview={point:{x:smart.x,y:smart.y},label:smart.label,kind:smart.type}; const moved=setWallNodePosition(node.id,smart.x,smart.y); d.blockedByZoneCollision=!moved; clearRackSnapPreview(); renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector();
    } else if(d.type === 'opening'){
      const opening = findOpeningById(d.openingId);
      if(!opening) return;
      if(d.mode === 'resize-start') resizeOpeningFromPoint(opening, p, 'start');
      else if(d.mode === 'resize-end') resizeOpeningFromPoint(opening, p, 'end');
      else setOpeningPositionFromPoint(opening, p);
      clearRackSnapPreview();
      renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector();
    } else if(d.type === 'modular-stack'){
      const members=modularStackMembers(d.groupId);
      const dx=(isSnapEnabled()&&!e.ctrlKey)?snapGrid(p.x-d.start.x):(p.x-d.start.x);
      const dy=(isSnapEnabled()&&!e.ctrlKey)?snapGrid(p.y-d.start.y):(p.y-d.start.y);
      const trial=members.map(r=>{const old=d.originals.find(x=>x.id===r.id)||r;return distributionRackPlacement(r,old.x+dx,old.y+dy,{ignoreSnap:true});});
      const check=distributionIsFreeMove()?{ok:true}:modularStackIsValid(trial,d.groupId);
      if(check.ok){members.forEach((r,i)=>{r.x=trial[i].x;r.y=trial[i].y;r.zoneId=trial[i].zoneId;});d.lastValid={dx,dy};}
      d.blocked=!check.ok;
      renderLayoutSvg(svg);renderLayoutSection();
    } else if(d.type === 'rack-group'){
      const rawDX=p.x-d.start.x, rawDY=p.y-d.start.y;
      const leader=findRackById(d.rackIds?.[0]);const leaderOrig=leader&&d.originals?.[leader.id];
      const snappedLead=leaderOrig?distributionRackPlacement(leader,leaderOrig.x+rawDX,leaderOrig.y+rawDY,{ignoreSnap:!!e.ctrlKey,ignoreRackIds:d.rackIds||[]}):null;
      // Trasladar el grupo como un cuerpo rígido: nunca hacer snap independiente
      // de cada rack, pues se perderían separaciones y alineaciones preexistentes.
      const dx=snappedLead?snappedLead.x-leaderOrig.x:rawDX;
      const dy=snappedLead?snappedLead.y-leaderOrig.y:rawDY;
      const candidates=(d.rackIds||[]).map(id=>{const rack=findRackById(id),orig=d.originals?.[id];if(!rack||!orig)return null;const proposal={...rack,x:orig.x+dx,y:orig.y+dy};const host=distributionHostForRack(proposal);if(host)proposal.zoneId=host.id;return {rack,proposal};}).filter(Boolean);
      if(distributionIsFreeMove()||candidates.every(c=>distributionCanCommit(c.proposal,d.rackIds))){candidates.forEach(({rack,proposal})=>{rack.x=proposal.x;rack.y=proposal.y;rack.zoneId=proposal.zoneId;});d.blocked=false;}
      else d.blocked=true;
      renderLayoutSvg(svg); renderLayoutSection();
    } else if(d.type === 'rack'){
      const rack = findRackById(d.rackId);
      const rawDX = p.x - d.start.x;
      const rawDY = p.y - d.start.y;
      const ncx = d.original.cx + rawDX;
      const ncy = d.original.cy + rawDY;
      const proposed=distributionRackPlacement(rack,ncx-rack.w/2,ncy-rack.h/2,{ignoreSnap:!!e.ctrlKey});
      if(distributionCanCommit(proposed)){rack.x=proposed.x;rack.y=proposed.y;rack.zoneId=proposed.zoneId;d.blocked=false;}
      else d.blocked=true;
      renderLayoutSvg(svg); renderLayoutSection();
    }
  }
  function stopEditorDrag(){
    if(appState.editor?.dragSelect?.active){
      commitDragSelection();
      persistActiveLayout();
      if(isLayoutWorkspaceScreen()) renderLayoutEditor();
      return;
    }
    const d = appState.editor.dragging;
    const svg = $('#layoutSvg');
    if(svg) svg.style.cursor = '';
    if(!d)return;
    if(d && d.type==='section-guide'){
      const zone = findZoneById(d.zoneId) || appState.layout.zones[0];
      if(zone && d.source === 'arrow' && !d.moved){
        const cut = getSectionCut(d.axis, zone);
        cut.dir *= -1;
      }
    }
    if(d && d.type==='modular-stack' && d.lastValid && (d.lastValid.dx||d.lastValid.dy)){
      const members=modularStackMembers(d.groupId);
      const final=members.map(r=>({id:r.id,x:r.x,y:r.y,zoneId:r.zoneId}));
      members.forEach(r=>{const old=d.originals.find(v=>v.id===r.id);if(old){r.x=old.x;r.y=old.y;r.zoneId=old.zoneId;}});
      recordHistorySnapshot(isRackDistributionScreen()?'distribution':'structure');
      members.forEach(r=>{const moved=final.find(v=>v.id===r.id);if(moved){r.x=moved.x;r.y=moved.y;r.zoneId=moved.zoneId;}});
    }
    if(d?.type==='area-composite'){
      if(d.moved){recordHistorySnapshot('layout',d.original);syncManualWallsFromNodes();}
      else v206TranslateAreaSnapshot(d.original,0,0);
    }
    if(d && (d.type==='rack-group'||d.type==='rack')){
      // En modo libre la posición aceptada durante el arrastre no se recalcula ni
      // regresa por un contorno estrecho. El ID permanece estable para stock/stack.
      const moved=d.type==='rack'?[findRackById(d.rackId)].filter(Boolean):(d.rackIds||[]).map(findRackById).filter(Boolean);
      const changed=d.historyBefore && JSON.stringify(snapshotForType('distribution'))!==JSON.stringify(d.historyBefore);
      if(changed)recordHistorySnapshot('distribution',d.historyBefore);
      normalizeZoneAndRackIds();
      if(distributionIsFreeMove()){
        const problems=moved.map(r=>distributionRackInterference(r,moved.map(x=>x.id))).filter(Boolean);
        if(problems.length)showToast(problems[0]+' Posición conservada en modo libre.','warning',3400);
      }else if(d.blocked){showToast('Movimiento limitado por zona o colisión.','warning',2400);}
      v117RunValidation({quiet:true});
    }
    if(d && (d.type==='vertex'||d.type==='edge'||d.type==='zone'||d.type==='wall-node'||d.type==='wall-body'||d.type==='wall-group') && d.historyBefore && JSON.stringify(snapshotForType('structure'))!==JSON.stringify(d.historyBefore)) recordHistorySnapshot('structure',d.historyBefore);
    if(d && d.type==='zone'){ normalizeZoneAndRackIds(); }
    if(d?.blockedByZoneCollision) showToast('Movimiento limitado: las zonas no pueden superponerse.','warning',2200);
    if(d && d.type==='room-zone'){
      if(typeof v128FinalizeRoomMove === 'function') v128FinalizeRoomMove(d.roomId,{targetRoomId:d.mergeCandidate?.targetRoomId||'',notify:true});
      else { if(d.mergeCandidate && mergeRoomSharedWall(d.mergeCandidate)) showToast('Muros coincidentes unidas como muro compartido.', 'success', 2400); v117ResolveWallIntersections(); v117RefreshRooms(); syncRoomLinkedZones(); }
      if(appState.layout.meta?.zoneSemantics!=='virtual')normalizeZoneAndRackIds();appState.editor.roomMovePreview=null;
    }
    if(d && (d.type==='wall-node' || d.type==='wall-body' || d.type==='wall-group')){ syncManualWallsFromNodes(); v117ResolveWallIntersections(); if(typeof v128FuseAllTouchingRooms==='function')v128FuseAllTouchingRooms(); v117RefreshRooms(); syncRoomLinkedZones(); if(typeof v128RebuildSharedWallRegistry==='function')v128RebuildSharedWallRegistry(); ensureOpeningAttachmentOffsets(); appState.editor.wallMergePreview=null; }
    clearRackSnapPreview();
    clearZoneCollisionPreview();
    if(appState.editor) appState.editor.geometrySnapPreview=null;
    appState.editor.dragging = null;
    persistActiveLayout(d?.type==='vertex'?'movimiento de vértice':d?.type==='edge'?'movimiento de lado':d?.type==='zone'?'movimiento de zona':d?.type?.startsWith('wall')?'movimiento de muro':'movimiento');
    if(isLayoutWorkspaceScreen()) renderLayoutEditor();
  }

  function renderLayoutInspector(){
    const mount = $('#layoutSidebarInspector'); if(!mount) return;
    const headerMount = $('#layoutHeaderCards');
    const zone = findZoneById(appState.selectedZoneId);
    const rack = findRackById(appState.selectedRackLayoutId);
    const zoneOpen = !!appState.editor?.inspectorZoneOpen;
    const rackPropsOpen = !!appState.editor?.rackPropsOpen;
    const stackOpen = !!appState.editor?.inspectorStackOpen;
    const sectionOpen = !!appState.editor?.inspectorSectionOpen;
    const stack = rack ? rackStackSummary(rack) : { count:0, isStacked:false, members:[] };
    const selectedRackModel = rack ? rackModel(rack.modelId) : null;
    const selectedRackFootprint = rack ? getRackFootprint(rack.modelId, rack.rot || 0) : null;
    const edgeWallCtx = getSelectedEdgeWallContext();

    if(headerMount){
      headerMount.innerHTML = `
        ${zoneOpen ? `
        <div class="layout-header-card">
          <div class="layout-tool-group">
            <div class="layout-tool-group-title">Propiedades de zona</div>
            ${!zone ? `<div class="empty" style="padding:14px 8px"><b>Sin zona seleccionada</b><div class="muted tiny" style="margin-top:8px">Selecciona una zona para abrir sus propiedades de edición.</div></div>` : `
            <div class="grid">
              <label class="tiny muted">Nombre visible de la zona</label>
              <input id="insZoneName" value="${zone.name}">
              <label class="tiny muted">Nomenclatura / código de zona</label>
              <input id="insZoneCode" value="${zone.id}" placeholder="Ej: Z1, Z2, ALM, A" />
              <div class="two">
                <div>
                  <label class="tiny muted">Color</label>
                  <input id="insZoneColor" type="color" value="${zone.color}" style="height:44px;padding:6px">
                  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">${ZONE_COLOR_PALETTE.map(color => `<button type="button" data-zone-swatch="${color}" title="${color}" style="width:26px;height:26px;border-radius:999px;border:${String(zone.color||'').toLowerCase()===String(color).toLowerCase()?'2px solid #ffffff':'1px solid rgba(255,255,255,.24)'};background:${color};cursor:pointer"></button>`).join('')}</div>
                </div>
                <div><label class="tiny muted">Vértices</label><div class="chip">${zone.pts.length}</div></div>
              </div>
              <div class="three"><div><label class="tiny muted">Ancho</label><input value="${formatDistanceShort(zoneBounds(zone).maxX-zoneBounds(zone).minX)}" disabled></div><div><label class="tiny muted">Alto</label><input value="${formatDistanceShort(zoneBounds(zone).maxY-zoneBounds(zone).minY)}" disabled></div><div><label class="tiny muted">Racks</label><input value="${appState.layout.racks.filter(r=>r.zoneId===zone.id).length}" disabled></div></div>
              <div><label class="tiny muted">Escala cm/u</label><input id="insScaleCm" type="number" min="0.1" step="0.1" value="${getScaleCmPerUnit()}"></div>
            </div>`}
          </div>
        </div>` : ''}
        ${rackPropsOpen ? `
        <div class="layout-header-card">
          <div class="layout-tool-group">
            <div class="layout-tool-group-title">Propiedades de rack</div>
            ${!rack ? `
              <div class="tiny muted" style="padding:6px 4px 2px">Selecciona un rack para editar su modelo, altura y rotación desde aquí.</div>
            ` : `
              <label class="tiny muted">Modelo de rack</label>
              <div class="rack-model-picker" id="sideRackModelPicker" data-picker-mode="viewer">
                <input id="sideRackModel" type="hidden" value="${rack.modelId}">
                <button type="button" id="sideRackModelTrigger" class="seg-btn rack-model-picker-trigger"><span>${escapeHtml((rackModel(rack.modelId)||{}).name || rack.modelId || 'Seleccionar modelo')}</span><span class="rack-model-picker-caret">▾</span></button>
                <div class="rack-model-picker-menu" id="sideRackModelMenu">
                  <div class="rack-model-picker-list">
                    ${appState.models.map(m => `<button type="button" class="rack-model-option ${m.id===rack.modelId?'active':''}" data-rack-model-option="${m.id}" title="${escapeHtml(m.name)}"><span class="rack-model-option-name">${escapeHtml(m.name)}</span></button>`).join('')}
                  </div>
                </div>
                <div class="rack-model-fixed-viewer">
                  <div class="tiny muted">Visor del modelo</div>
                  <div class="rack-model-fixed-viewer-layout">
                    <div class="rack-model-mini-stage"><svg id="sideRackModelViewerSvg" viewBox="0 0 320 260"></svg></div>
                    <div class="rack-model-mini-meta">
                      <div class="mini-field">
                        <label class="tiny muted">Rotación</label>
                        <input id="sideRackRot" type="number" min="0" max="360" step="0.1" value="${Number(normalizeAngle(rack.rot||0).toFixed(2))}">
                      </div>
                      <div class="mini-field">
                        <label class="tiny muted">Nivel apilado</label>
                        <input id="sideRackStackLevel" type="number" min="0" step="1" value="${getRackStackLevel(rack)}">
                      </div>
                      <div class="mini-field">
                        <label class="tiny muted">NPT desde suelo (cm)</label>
                        <input id="sideRackBaseH" type="number" min="0" max="20000" step="1" value="${Math.round(Number(rack.baseHeight || 0))}">
                      </div>
                      <div class="mini-field">
                        <label class="tiny muted">Altura rack</label>
                        <input id="sideRackHeight" type="number" min="60" step="10" value="${Math.round(Number(rack.rackHeight || selectedRackModel?.height || 238))}">
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              ${isUnderStairsStyle(selectedRackModel?.style) ? `
              <div class="layout-inline-3" style="grid-template-columns:repeat(3,minmax(0,1fr))">
                <div>
                  <label class="tiny muted">Lateral 1</label>
                  <input id="sideRackLeftHeight" type="number" min="40" step="1" value="${Math.round(Number(selectedRackModel?.leftHeight || selectedRackModel?.height || 240))}">
                </div>
                <div>
                  <label class="tiny muted">Lateral 2</label>
                  <input id="sideRackRightHeight" type="number" min="20" step="1" value="${Math.round(Number(selectedRackModel?.rightHeight || Math.max(40, (selectedRackModel?.height||240)*0.35)))}">
                </div>
                <div>
                  <label class="tiny muted">Largo top</label>
                  <input id="sideRackTopLength" type="number" min="8" step="1" value="${Math.round(Number(selectedRackModel?.topLength || clampUnderStairsTopLength(selectedRackModel)))}">
                </div>
              </div>` : ''}
              <div class="layout-inline-2">
                <div class="kv-row" style="padding:10px 12px"><b>Vista sección</b><span>${appState.editor.sectionVisible ? 'Activa' : 'Oculta'}</span></div>
                <div class="kv-row" style="padding:10px 12px"><b>Cota superior</b><span>${formatDistanceCm((Number(rack.baseHeight||0) + Number(rack.rackHeight || selectedRackModel?.height || 238)))}</span></div>
              </div>
              <div class="layout-inline-3" style="grid-template-columns:repeat(3,minmax(0,1fr))">
                <div class="kv-row" style="padding:10px 12px"><b>Ancho</b><span>${formatDistanceShort(selectedRackFootprint?.baseW || 0)}</span></div>
                <div class="kv-row" style="padding:10px 12px"><b>Fondo</b><span>${formatDistanceShort(selectedRackFootprint?.baseH || 0)}</span></div>
                <div class="kv-row" style="padding:10px 12px"><b>Zona</b><span>${escapeHtml(rack.zoneId)}</span></div>
              </div>
              <div class="layout-inline-2">
                <button class="seg-btn" id="btnAddRackAbove">Agregar encima</button>
                <div class="kv-row" style="padding:10px 12px"><b>Seleccionados</b><span>${getSelectedRackIds().length || 0}</span></div>
              </div>
              <div class="kv-row" style="padding:10px 12px"><b>Referencia visual</b><span>Línea naranja = frente del rack · N = nivel</span></div>
            `}
          </div>
        </div>` : ''}`;
    }

    mount.innerHTML = `
      ${edgeWallCtx ? `
      <div class="layout-tool-group" style="margin-top:2px">
        <div class="layout-tool-group-title">Arista seleccionada</div>
        <div class="grid">
          <div class="kv-row"><b>Zona</b><span>${escapeHtml(edgeWallCtx.zone.id)}</span></div>
          <div class="kv-row"><b>Arista</b><span>${edgeWallCtx.edgeIndex + 1}</span></div>
          <div class="kv-row"><b>Largo</b><span>${formatDistanceShort(edgeWallCtx.length)}</span></div>
          <div class="kv-row"><b>Estado</b><span>${edgeWallCtx.isWall ? 'Muro activa' : 'Solo arista'}</span></div>
          <div class="two">
            <button class="seg-btn ${edgeWallCtx.isWall ? 'active' : ''}" id="btnEdgeMakeWall">${edgeWallCtx.isWall ? 'Actualizar muro' : 'Convertir en muro'}</button>
            <button class="seg-btn" id="btnEdgeRemoveWall" ${edgeWallCtx.isWall ? '' : 'disabled'}>Quitar muro</button>
          </div>
          <div class="two">
            <label class="layout-mini-field">Espesor<input id="edgeWallThickness" type="number" min="8" max="80" step="1" value="${Math.round(Number(edgeWallCtx.wall?.thickness || getZoneWallThickness(edgeWallCtx.zone) || 14))}"></label>
            <label class="layout-mini-field">Altura 3D<input id="edgeWallHeight" type="number" min="120" max="600" step="10" value="${Math.round(Number(edgeWallCtx.wall?.height || appState.layout?.meta?.defaultWallHeight || 290))}"></label>
          </div>
          <div class="two">
            <button class="seg-btn" id="btnEdgeAddDoor">${edgeWallCtx.isWall ? 'Agregar puerta' : 'Crear muro + puerta'}</button>
            <button class="seg-btn" id="btnEdgeAddWindow">${edgeWallCtx.isWall ? 'Agregar ventana' : 'Crear muro + ventana'}</button>
          </div>
          <div class="tiny muted">Selecciona un lado del Área comercial y agrega el vano directamente. Si todavía no es muro, se convierte automáticamente.</div>
        </div>
      </div>` : ''}
      ${stackOpen ? `
      <div class="layout-tool-group" style="margin-top:2px">
        <div class="layout-tool-group-title">Superposición / pila</div>
        ${!rack ? `<div class="empty" style="padding:14px 8px"><b>Sin rack seleccionado</b><div class="muted tiny" style="margin-top:8px">Selecciona un rack para revisar si comparte huella con otros racks.</div></div>` : `
        <div class="grid">
          <div class="kv-row"><b>Estado</b><span>${stack.isStacked ? 'Apilado' : 'Individual'}</span></div>
          <div class="kv-row"><b>Cantidad en pila</b><span>${stack.count}</span></div>
          <div class="kv-row"><b>Nivel activo</b><span>N${getRackStackLevel(rack)}</span></div>
          <div class="kv-row"><b>Rack activo</b><span>${escapeHtml(rack.id)}</span></div>
          <div class="kv-row"><b>Huella compartida</b><span>${escapeHtml(rack.zoneId)} · (${Math.round(rack.x)}, ${Math.round(rack.y)})</span></div>
          ${stack.isStacked ? `<div style="display:grid;gap:8px">${stack.members.map(member => `<button type="button" class="seg-btn stack-ins-btn ${member.id===rack.id?'active':''}" data-stack-ins-rack="${member.id}" style="text-align:left;padding:10px 12px">N${getRackStackLevel(member)} · ${escapeHtml(member.id)} · ${escapeHtml(rackModel(member.modelId).name)}</button>`).join('')}</div>` : `<div class="tiny muted">Este rack no comparte su base con otros racks.</div>`}
          <div class="two">
            <button class="seg-btn" id="insAddRackAbove">Agregar encima</button>
            <button class="seg-btn" id="insOpenStackMenu" ${stack.isStacked ? '' : 'disabled'}>Ver selector flotante</button>
          </div>
          <div class="two">
            <button class="seg-btn" id="insCloseStackMenu">Ocultar selector</button>
            <div class="tiny muted" style="display:flex;align-items:center;justify-content:flex-end">Solo el mismo nivel bloquea colisión XY</div>
          </div>
        </div>`}
      </div>` : ''}
      ${sectionOpen ? `
      <div class="layout-tool-group" style="margin-top:2px">
        <div class="layout-tool-group-title">Propiedades de sección</div>
        <div class="grid">
          <div class="two">
            <div><label class="tiny muted">Corte X</label><div class="chip">${getSectionCut('x').dir===1 ? 'hacia derecha' : 'hacia izquierda'}</div></div>
            <div><label class="tiny muted">Corte Y</label><div class="chip">${getSectionCut('y').dir===1 ? 'hacia abajo' : 'hacia arriba'}</div></div>
          </div>
          <div class="two">
            <div><label class="tiny muted">Rango X (u)</label><input id="insSectionRangeX" type="number" min="10" max="2000" step="1" value="${Math.round((getSectionCut('x').depth || 100))}"></div>
            <div><label class="tiny muted">Rango Y (u)</label><input id="insSectionRangeY" type="number" min="10" max="2000" step="1" value="${Math.round((getSectionCut('y').depth || 100))}"></div>
          </div>
          <div class="kv-row"><b>Comportamiento</b><span>Solo se abre manualmente desde el icono de desplegar</span></div>
        </div>
      </div>` : ''}`;

    if($('#btnEdgeMakeWall')) $('#btnEdgeMakeWall').onclick = () => {
      const thickness = Math.max(8, Math.min(80, Number($('#edgeWallThickness')?.value || 14) || 14));
      const height = Math.max(120, Math.min(600, Number($('#edgeWallHeight')?.value || 290) || 290));
      convertSelectedEdgeToWall({ thickness, height });
      persistActiveLayout();
      renderLayoutEditor();
    };
    if($('#btnEdgeRemoveWall')) $('#btnEdgeRemoveWall').onclick = () => {
      const ctx = getSelectedEdgeWallContext();
      if(!ctx) return;
      removeZoneEdgeWall(ctx.zone, ctx.edgeIndex);
      appState.selectedWallId = '';
      syncZonePerimeterWalls();
      cleanupDetachedOpenings();
      persistActiveLayout();
      renderLayoutEditor();
    };
    const addOpeningFromSelectedEdge = (type='door') => {
      const ctx = getSelectedEdgeWallContext();
      if(!ctx) return;
      if(!ctx.isWall){
        setZoneEdgeWall(ctx.zone, ctx.edgeIndex, { thickness:Math.max(8, Math.min(80, Number($('#edgeWallThickness')?.value || 14) || 14)), height:Math.max(120, Math.min(600, Number($('#edgeWallHeight')?.value || 290) || 290)) });
        syncZonePerimeterWalls();
      }
      const wallId = zoneEdgeWallId(ctx.zone.id, ctx.edgeIndex);
      createOpeningOnWall(wallId, type);
      persistActiveLayout();
      renderLayoutEditor();
    };
    if($('#btnEdgeAddDoor')) $('#btnEdgeAddDoor').onclick = () => addOpeningFromSelectedEdge('door');
    if($('#btnEdgeAddWindow')) $('#btnEdgeAddWindow').onclick = () => addOpeningFromSelectedEdge('window');
    if($('#edgeWallThickness')) $('#edgeWallThickness').onchange = e => {
      const ctx = getSelectedEdgeWallContext();
      if(!ctx?.isWall) return;
      setZoneEdgeWall(ctx.zone, ctx.edgeIndex, { thickness:Math.max(8, Math.min(80, Number(e.target.value || 14) || 14)) });
      syncZonePerimeterWalls();
      persistActiveLayout();
      renderLayoutEditor();
    };
    if($('#edgeWallHeight')) $('#edgeWallHeight').onchange = e => {
      const ctx = getSelectedEdgeWallContext();
      if(!ctx?.isWall) return;
      setZoneEdgeWall(ctx.zone, ctx.edgeIndex, { height:Math.max(120, Math.min(600, Number(e.target.value || 290) || 290)) });
      syncZonePerimeterWalls();
      persistActiveLayout();
      renderLayoutEditor();
    };

    if($('#insZoneName')) {
      $('#insZoneName').oninput = e => { zone.name = e.target.value; };
      $('#insZoneName').onchange = () => { persistActiveLayout(); renderLayoutEditor(); };
    }
    if($('#insZoneCode')) {
      const commitZoneCode = (value) => {
        const previous = zone.id;
        const updated = renameZoneId(previous, value);
        const el = $('#insZoneCode');
        if(el) el.value = updated;
        renderLayoutEditor();
      };
      $('#insZoneCode').onchange = e => commitZoneCode(e.target.value);
      $('#insZoneCode').onblur = e => commitZoneCode(e.target.value);
    }
    if($('#insZoneColor')) $('#insZoneColor').oninput = e => { zone.color = e.target.value; persistActiveLayout(); renderLayoutEditor(); };
    $$('[data-zone-swatch]').forEach(btn => btn.onclick = () => { zone.color = btn.getAttribute('data-zone-swatch') || zone.color; persistActiveLayout(); renderLayoutEditor(); });
    if($('#insScaleCm')) $('#insScaleCm').onchange = e => { ensureLayoutMeta(); appState.layout.meta.scaleCmPerUnit = Math.max(0.1, Number(e.target.value || 1) || 1); persistActiveLayout(); renderLayoutEditor(); };
    if($('#sideRackModel')) $('#sideRackModel').onchange = e => { if(!rack) return; const oldDefault = rackModel(rack.modelId).height || 238; const prevHeight = Number(rack.rackHeight || oldDefault); rack.modelId = e.target.value; const newDefault = rackModel(rack.modelId).height || 238; if(!Number.isFinite(prevHeight) || Math.abs(prevHeight - oldDefault) < 1) rack.rackHeight = newDefault; syncRackFootprint(rack, true); const host=findZoneById(rack.zoneId); if(host && !distributionIsFreeMove()){ keepRackSnapped(rack, host); } persistActiveLayout(); renderLayoutEditor(); };
    initSideRackModelPicker(rack);
    if($('#sideRackRot')) {
      $('#sideRackRot').onchange = e => v194RotateRack(rack,e.target.value);
    }
    if($('#insRackBaseH')) {
      $('#insRackBaseH').oninput = e => { rack.baseHeight = Math.max(0, Number(e.target.value || 0) || 0); };
      $('#insRackBaseH').onchange = e => { rack.baseHeight = Math.max(0, Number(e.target.value || 0) || 0); persistActiveLayout(); renderLayoutEditor(); };
    }
    if($('#sideRackBaseH')) {
      $('#sideRackBaseH').onchange = e => { if(!rack) return; const npt=Math.max(0,Math.min(20000,Number(e.target.value)||0));if(Math.abs(Number(rack.baseHeight||0)-npt)<.001)return;const candidate={...rack,baseHeight:npt};if(typeof vspaceFits==='function'&&!vspaceFits(candidate,rack.id).ok){showToast('Altura NPT bloqueada por colisión.','warning',2600);renderLayoutEditor();return;}recordHistorySnapshot('distribution');rack.baseHeight=npt;persistActiveLayout();renderLayoutEditor(); };
    }
    if($('#sideRackStackLevel')) {
      $('#sideRackStackLevel').oninput = e => { if(!rack) return; rack.stackLevel = Math.max(0, parseInt(e.target.value || 0, 10) || 0); recalcAllRackStackHeights(); };
      $('#sideRackStackLevel').onchange = e => { if(!rack) return; rack.stackLevel = Math.max(0, parseInt(e.target.value || 0, 10) || 0); recalcAllRackStackHeights(); persistActiveLayout(); renderLayoutEditor(); };
    }
    if($('#insRackHeight')) {
      $('#insRackHeight').oninput = e => { rack.rackHeight = Math.max(60, Number(e.target.value || 0) || 60); };
      $('#insRackHeight').onchange = e => { rack.rackHeight = Math.max(60, Number(e.target.value || 0) || 60); persistActiveLayout(); renderLayoutEditor(); };
    }
    if($('#sideRackHeight')) {
      $('#sideRackHeight').oninput = e => { if(!rack) return; rack.rackHeight = Math.max(60, Number(e.target.value || 0) || 60); };
      $('#sideRackHeight').onchange = e => { if(!rack) return; rack.rackHeight = Math.max(60, Number(e.target.value || 0) || 60); persistActiveLayout(); renderLayoutEditor(); };
    }
    const syncSelectedUnderStairsModel = () => {
      if(!rack) return;
      const model = rackModel(rack.modelId);
      if(!model || normalizeRackStyle(model.style) !== 'under_stairs') return;
      if($('#sideRackLeftHeight')) model.leftHeight = Math.max(40, Number($('#sideRackLeftHeight').value || model.leftHeight || model.height || 240) || 240);
      if($('#sideRackRightHeight')) model.rightHeight = Math.max(20, Number($('#sideRackRightHeight').value || model.rightHeight || Math.max(40, (model.height||240)*0.35)) || Math.max(40, (model.height||240)*0.35));
      if($('#sideRackTopLength')) model.topLength = Math.max(8, Number($('#sideRackTopLength').value || model.topLength || clampUnderStairsTopLength(model)) || clampUnderStairsTopLength(model));
      model.mirrored = false;
      model.topLength = clampUnderStairsTopLength(model);
      persistActiveLayout();
      renderLayoutEditor();
    };
    if($('#sideRackLeftHeight')) { $('#sideRackLeftHeight').oninput = syncSelectedUnderStairsModel; $('#sideRackLeftHeight').onchange = syncSelectedUnderStairsModel; }
    if($('#sideRackRightHeight')) { $('#sideRackRightHeight').oninput = syncSelectedUnderStairsModel; $('#sideRackRightHeight').onchange = syncSelectedUnderStairsModel; }
    if($('#sideRackTopLength')) { $('#sideRackTopLength').oninput = syncSelectedUnderStairsModel; $('#sideRackTopLength').onchange = syncSelectedUnderStairsModel; }
    if($('#insSectionRangeX')) $('#insSectionRangeX').onchange = e => { setSectionCutDepth('x', Math.max(10, Number(e.target.value||10)||10)); persistActiveLayout(); renderLayoutEditor(); };
    if($('#insSectionRangeY')) $('#insSectionRangeY').onchange = e => { setSectionCutDepth('y', Math.max(10, Number(e.target.value||10)||10)); persistActiveLayout(); renderLayoutEditor(); };
    $$('.quick-angle').forEach(btn => btn.onclick = () => { if(!rack) return; v194RotateRack(rack,(Number(rack.rot||0)||0)+(Number(btn.dataset.angle||0)||0)); });
    $$('.quick-zone-angle').forEach(btn => btn.onclick = () => { const zoneId = appState.selectedZoneId; if(!zoneId) return; rotateZoneWithContents(zoneId, Number(btn.dataset.angle || 0) || 0); });
    $$('.rotate-step').forEach(btn => btn.onclick = () => { if(!rack) return; v194RotateRack(rack,(Number(rack.rot||0)||0)+(Number(btn.dataset.step||0)||0)); });
    if($('#insDupRack')) $('#insDupRack').onclick = () => { if(!rack) return; duplicateRackLayout(rack.id); };
    if($('#insDupZone')) $('#insDupZone').onclick = () => { if(zone) duplicateZone(zone.id); else if(rack) duplicateZone(rack.zoneId); };
    document.querySelectorAll('[data-stack-ins-rack]').forEach(btn => btn.onclick = () => {
      const target = findRackById(btn.getAttribute('data-stack-ins-rack'));
      if(!target) return;
      appState.selectedRackLayoutId = target.id;
      appState.selectedZoneId = target.zoneId;
      renderLayoutEditor();
    });
    if($('#insOpenStackMenu')) $('#insOpenStackMenu').onclick = () => { if(!rack) return; openStackMenuForRack(rack.id); renderLayoutStackMenu(); };
    if($('#insCloseStackMenu')) $('#insCloseStackMenu').onclick = () => { closeStackMenu(); renderLayoutStackMenu(); };
    if($('#insAddRackAbove')) $('#insAddRackAbove').onclick = () => { if(!rack) return; duplicateRackAbove(rack.id); };
    if($('#btnAddRackAbove')) $('#btnAddRackAbove').onclick = () => { if(!rack) return; duplicateRackAbove(rack.id); };
  }

