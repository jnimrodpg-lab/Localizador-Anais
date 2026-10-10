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
    if(appState.editor.selectedMeasurementId === undefined) appState.editor.selectedMeasurementId = '';
    if(appState.selectedRoomId === undefined) appState.selectedRoomId = '';
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
    if(isRackDistributionScreen() && ['zone','wall','opening','door','measure'].includes(appState.editor.mode)) appState.editor.mode = 'select';
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
    });
    syncManualWallsFromNodes(layout);
    syncRoomLinkedZones(layout);
    ensureOpeningAttachmentOffsets(layout);
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
  function findZoneOverlap(zoneId, pts, layout=appState.layout){
    if(!Array.isArray(pts)||pts.length<3) return null;
    return (layout?.zones||[]).find(other=>other?.id!==zoneId && Array.isArray(other.pts) && other.pts.length>=3 && zonePolygonsOverlap(pts,other.pts)) || null;
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
      id, name:nextRoomZoneName(room), color:palette[(appState.layout.zones||[]).length % palette.length], pts:pts.map(p=>({...p})),
      linkedRoomId:room.id, dynamicFromRoom:true, roomLinkBroken:false, edgeWalls:{}, source:'room'
    };
    const collision=findZoneOverlap('',zone.pts);
    if(collision){ showToast(`No se puede crear la zona: el recinto se superpone con ${collision.name||collision.id}.`,'warning',2800); return null; }
    appState.layout.zones.push(zone);
    room.zoneId=id;
    appState.selectedRoomId=room.id;
    appState.selectedZoneId=id;
    appState.selectedWallId=''; appState.selectedOpeningId=''; appState.selectedRackLayoutId='';
    normalizeZoneAndRackIds();
    persistActiveLayout();
    showToast(`${room.name} convertido en ${zone.name}. La zona seguirá a las muros.`, 'success', 3200);
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
      if(connected.length<2) return;
      const pts=[]; let maxTh=8;
      const infos=connected.map(w=>{
        const atStart=w.startNodeId===node.id;
        const other=getWallNode(atStart?w.endNodeId:w.startNodeId);
        if(!other) return null;
        const dx=other.x-node.x, dy=other.y-node.y, len=Math.hypot(dx,dy)||1;
        const d={x:dx/len,y:dy/len}; const n={x:-d.y,y:d.x}; const h=Math.max(4,Number(w.thickness||12)/2); maxTh=Math.max(maxTh,h*2);
        pts.push({x:node.x+n.x*h,y:node.y+n.y*h},{x:node.x-n.x*h,y:node.y-n.y*h});
        return {w,d,n,h};
      }).filter(Boolean);
      for(let i=0;i<infos.length;i++) for(let j=i+1;j<infos.length;j++){
        const a=infos[i], b=infos[j];
        for(const sa of [-1,1]) for(const sb of [-1,1]){
          const p1={x:node.x+a.n.x*a.h*sa,y:node.y+a.n.y*a.h*sa};
          const p2={x:p1.x+a.d.x,y:p1.y+a.d.y};
          const q1={x:node.x+b.n.x*b.h*sb,y:node.y+b.n.y*b.h*sb};
          const q2={x:q1.x+b.d.x,y:q1.y+b.d.y};
          const hit=lineIntersection2D(p1,p2,q1,q2);
          if(hit && pointDist2D(hit,node) <= maxTh*3.5+24) pts.push(hit);
        }
      }
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
    let x=snapGrid(point.x), y=snapGrid(point.y), type='grid', label='Rejilla', nodeId='';
    if(origin){
      const dx=x-origin.x, dy=y-origin.y;
      if(Math.hypot(dx,dy)>1){
        const ang=Math.atan2(dy,dx)*180/Math.PI;
        const horizontalDistance=Math.min(Math.abs(ang),Math.abs(Math.abs(ang)-180));
        const verticalDistance=Math.abs(Math.abs(ang)-90);
        if(shiftKey || horizontalDistance<=7 || verticalDistance<=7){
          if(shiftKey ? Math.abs(dx)>=Math.abs(dy) : horizontalDistance<=verticalDistance){ y=origin.y; type='ortho'; label='Horizontal'; }
          else { x=origin.x; type='ortho'; label='Vertical'; }
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
    return {x,y,type,label,nodeId};
  }
  function cancelLayoutDrawing(){
    if(!appState.editor) return;
    appState.editor.pendingWallPoint=null;
    appState.editor.wallCursor=null;
    appState.editor.wallChainNodeIds=[];
    appState.editor.wallChainStartNodeId='';
    appState.editor.wallLengthDraft='';
    appState.editor.measureDraft=null;
    if(['wall','door','opening','measure','zone'].includes(appState.editor.mode)) appState.editor.mode='select';
    if(isLayoutWorkspaceScreen()) renderLayoutEditor();
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
    ensureWallTopology();
    const pending=appState.editor.pendingWallPoint;
    if(!pending) return null;
    const snap=opts.numeric ? {x:Number(rawPoint.x||0),y:Number(rawPoint.y||0),type:'numeric',label:'Medida exacta',nodeId:''} : snapWallPointSmart(rawPoint,{origin:pending,shiftKey:!!opts.shiftKey});
    let endNode=snap.nodeId ? getWallNode(snap.nodeId) : null;
    if(!endNode) endNode=findOrCreateWallNode(snap);
    const startNode=getWallNode(pending.nodeId) || findOrCreateWallNode(pending,pending.nodeId);
    if(!startNode || !endNode || startNode.id===endNode.id) return null;
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
    persistActiveLayout();
    renderLayoutEditor();
    return wall;
  }
  function startWallNodeDrag(e,nodeId){
    if(!isStructureLayoutScreen() || appState.editor.mode!=='select') return;
    e.stopPropagation();
    ensureWallTopology();
    const node=getWallNode(nodeId); if(!node) return;
    const svg=$('#layoutSvg'), p=svgPoint(e,svg);
    appState.editor.dragging={type:'wall-node',nodeId,start:p,original:{x:node.x,y:node.y}};
    appState.selectedWallNodeId=nodeId; appState.selectedRoomId='';
    renderLayoutSvg(svg); renderLayoutInspector();
  }
  function startWallBodyDrag(e,wallId){
    if(!isStructureLayoutScreen() || appState.editor.mode!=='select') return;
    e.stopPropagation(); ensureWallTopology();
    const wall=findWallById(wallId); if(!wall) return;
    if(wall.autoZoneEdge){ appState.selectedWallId=wall.id; renderLayoutEditor(); return; }
    if(e.shiftKey){ v117ToggleWallSelection(wall.id); renderLayoutEditor(); return; }
    const selected=v117GetSelectedWallIds(); if(!selected.includes(wall.id))v117SetSelectedWallIds([wall.id]);
    appState.selectedWallId=wall.id; appState.selectedOpeningId=''; appState.selectedRackLayoutId=''; appState.selectedRoomId='';
    const dragWalls=v117GetSelectedWallIds().map(findWallById).filter(w=>w&&!w.autoZoneEdge); const nodeIds=[...new Set(dragWalls.flatMap(w=>[w.startNodeId,w.endNodeId]).filter(Boolean))]; const originalNodes={}; nodeIds.forEach(id=>{const n=getWallNode(id);if(n)originalNodes[id]={x:n.x,y:n.y};});
    const svg=$('#layoutSvg'), p=svgPoint(e,svg);
    appState.editor.dragging=dragWalls.length>1?{type:'wall-group',wallIds:dragWalls.map(w=>w.id),start:p,originalNodes,nodeIds,moved:false}:{type:'wall-body',wallId:wall.id,start:p,originalNodes,nodeIds,moved:false};
    appState.editor.wallMergePreview=null; renderLayoutSvg(svg); renderLayoutInspector();
  }
  function deleteLayoutSelection(){
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
      }else if(zid && appState.layout.zones.length>1){
        const linked=(appState.layout.racks||[]).filter(r=>r.zoneId===zid);
        if(linked.length){ showToast(`La zona ${zid} tiene ${linked.length} rack(s). Muévelos o elimínalos primero desde Distribución de racks.`, 'warning', 3600); return false; }
        appState.layout.zones=appState.layout.zones.filter(z=>z.id!==zid); appState.selectedZoneId=appState.layout.zones[0]?.id||''; normalizeZoneAndRackIds();
      }
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
    const off=Math.max(20,getSnapSize()*6);
    if(clip.type==='opening'){
      const src=clip.data, wall=findWallById(src.wallId); if(!wall) return false;
      const next=clone(src); next.id=nextOpeningId(); next.offset=Math.min(Math.max(20,Number(src.offset||wallLength(wall)*.5)+off),Math.max(20,wallLength(wall)-20)); next.t=next.offset/Math.max(1,wallLength(wall)); appState.layout.openings.push(next); appState.selectedOpeningId=next.id; appState.selectedWallId=wall.id;
    }else if(clip.type==='wall'){
      const src=clip.data; const a={x:Number(src.x1||0)+off,y:Number(src.y1||0)+off}, b={x:Number(src.x2||0)+off,y:Number(src.y2||0)+off}; const next=createWallSegment(a,b); if(next){ next.thickness=src.thickness; next.height=src.height; next.name=src.name; }
    }else if(clip.type==='zone'){
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
      if(e.key==='Escape'){ e.preventDefault(); cancelLayoutDrawing(); return; }
      if(editing) return;
      const key=String(e.key||'').toLowerCase();
      if((e.key==='Delete'||e.key==='Backspace') && !e.ctrlKey && !e.metaKey){ e.preventDefault(); deleteLayoutSelection(); return; }
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
  function getZoneEdgeWall(zone, edgeIndex){
    const wall=findManualWallForZoneEdge(zone,edgeIndex);
    return wall ? {...wall,enabled:true,side:getWallSideSign(wall.side)} : null;
  }
  function isZoneEdgeWallEnabled(zone, edgeIndex){ return !!findManualWallForZoneEdge(zone,edgeIndex); }
  function setZoneEdgeWall(zone, edgeIndex, updates={}){
    const edge=zoneEdgeEndpoints(zone,edgeIndex); if(!edge) return null;
    let wall=findManualWallForZoneEdge(zone,edge.idx);
    if(!wall){
      wall=createWallSegment(edge.a,edge.b);
      if(!wall) return null;
      wall.name=`Muro ${zone.id}-${edge.idx+1}`;
      wall.zoneBoundarySource={zoneId:zone.id,edgeIndex:edge.idx};
    }
    wall.kind='wall'; wall.autoZoneEdge=false; delete wall.zoneId; delete wall.edgeIndex; delete wall.locked;
    wall.thickness=Math.max(4,Number(updates.thickness ?? wall.thickness ?? getZoneWallThickness(zone) ?? 14)||14);
    wall.height=Math.max(120,Number(updates.height ?? wall.height ?? appState.layout?.meta?.defaultWallHeight ?? 290)||290);
    wall.side=getWallSideSign(updates.side ?? wall.side ?? 1);
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

  function getZoneEdgeWallPolygon(zone, edgeIndex, wallData = null){
    if(!zone || !Array.isArray(zone.pts) || zone.pts.length < 2 || edgeIndex < 0) return null;
    const count = zone.pts.length;
    const a = zone.pts[edgeIndex];
    const b = zone.pts[(edgeIndex + 1) % count];
    const wall = wallData || getZoneEdgeWall(zone, edgeIndex);
    if(!a || !b || !wall || wall.enabled === false) return null;
    const thickness = Math.max(8, Number(wall.thickness || getZoneWallThickness(zone) || 14));
    const side = getWallSideSign(wall.side);
    const baseN = getZoneOutwardEdgeNormal(zone, a, b);
    const n = { x:baseN.x * side, y:baseN.y * side };
    const innerA = { x:Number(a.x || 0), y:Number(a.y || 0) };
    const innerB = { x:Number(b.x || 0), y:Number(b.y || 0) };
    let outerA = { x:innerA.x + n.x * thickness, y:innerA.y + n.y * thickness };
    let outerB = { x:innerB.x + n.x * thickness, y:innerB.y + n.y * thickness };

    const safeMiter = (hit, vertex, fallback) => {
      if(!hit) return fallback;
      const maxLen = Math.max(thickness * 3.2, 42);
      return pointDist2D(hit, vertex) <= maxLen ? hit : fallback;
    };

    const prevIdx = (edgeIndex - 1 + count) % count;
    const prevWall = getZoneEdgeWall(zone, prevIdx);
    if(prevWall?.enabled && getWallSideSign(prevWall.side) === side){
      const pa = zone.pts[prevIdx];
      const pb = zone.pts[edgeIndex];
      const prevNBase = getZoneOutwardEdgeNormal(zone, pa, pb);
      const prevN = { x:prevNBase.x * side, y:prevNBase.y * side };
      const prevTh = Math.max(8, Number(prevWall.thickness || getZoneWallThickness(zone) || 14));
      const hit = lineIntersection2D(
        { x:Number(pa.x||0) + prevN.x * prevTh, y:Number(pa.y||0) + prevN.y * prevTh },
        { x:Number(pb.x||0) + prevN.x * prevTh, y:Number(pb.y||0) + prevN.y * prevTh },
        outerA,
        outerB
      );
      outerA = safeMiter(hit, innerA, outerA);
    }

    const nextIdx = (edgeIndex + 1) % count;
    const nextWall = getZoneEdgeWall(zone, nextIdx);
    if(nextWall?.enabled && getWallSideSign(nextWall.side) === side){
      const na = zone.pts[nextIdx];
      const nb = zone.pts[(nextIdx + 1) % count];
      const nextNBase = getZoneOutwardEdgeNormal(zone, na, nb);
      const nextN = { x:nextNBase.x * side, y:nextNBase.y * side };
      const nextTh = Math.max(8, Number(nextWall.thickness || getZoneWallThickness(zone) || 14));
      const hit = lineIntersection2D(
        outerA,
        outerB,
        { x:Number(na.x||0) + nextN.x * nextTh, y:Number(na.y||0) + nextN.y * nextTh },
        { x:Number(nb.x||0) + nextN.x * nextTh, y:Number(nb.y||0) + nextN.y * nextTh }
      );
      outerB = safeMiter(hit, innerB, outerB);
    }

    return [innerA, innerB, outerB, outerA];
  }


  function pointDist2D(a,b){
    return Math.hypot(Number(a?.x || 0) - Number(b?.x || 0), Number(a?.y || 0) - Number(b?.y || 0));
  }
  function getZoneWallCornerClosurePolygons(zone){
    if(!zone || !Array.isArray(zone.pts) || zone.pts.length < 3) return [];
    const out = [];
    const count = zone.pts.length;
    for(let idx=0; idx<count; idx+=1){
      const prevIdx = (idx - 1 + count) % count;
      const currIdx = idx;
      const prevWall = getZoneEdgeWall(zone, prevIdx);
      const currWall = getZoneEdgeWall(zone, currIdx);
      if(!prevWall?.enabled || !currWall?.enabled) continue;
      const prevSide = getWallSideSign(prevWall.side);
      const currSide = getWallSideSign(currWall.side);
      if(prevSide !== currSide) continue;

      const prevA = zone.pts[prevIdx];
      const prevB = zone.pts[idx];
      const currA = zone.pts[idx];
      const currB = zone.pts[(idx + 1) % count];
      const vertex = currA;
      if(!prevA || !prevB || !currB || !vertex) continue;

      const prevBaseN = getZoneOutwardEdgeNormal(zone, prevA, prevB);
      const currBaseN = getZoneOutwardEdgeNormal(zone, currA, currB);
      const prevN = { x:prevBaseN.x * prevSide, y:prevBaseN.y * prevSide };
      const currN = { x:currBaseN.x * currSide, y:currBaseN.y * currSide };
      const prevTh = Math.max(8, Number(prevWall.thickness || getZoneWallThickness(zone) || 14));
      const currTh = Math.max(8, Number(currWall.thickness || getZoneWallThickness(zone) || 14));

      const vPrev = { x:Number(vertex.x || 0) + prevN.x * prevTh, y:Number(vertex.y || 0) + prevN.y * prevTh };
      const vCurr = { x:Number(vertex.x || 0) + currN.x * currTh, y:Number(vertex.y || 0) + currN.y * currTh };

      const hit = lineIntersection2D(
        { x:Number(prevA.x || 0) + prevN.x * prevTh, y:Number(prevA.y || 0) + prevN.y * prevTh },
        vPrev,
        vCurr,
        { x:Number(currB.x || 0) + currN.x * currTh, y:Number(currB.y || 0) + currN.y * currTh }
      );

      let outerCorner = hit;
      const fallback = { x:vPrev.x + currN.x * currTh, y:vPrev.y + currN.y * currTh };
      const maxLen = Math.max(prevTh, currTh) * 3.2 + 24;
      if(!outerCorner || pointDist2D(outerCorner, vertex) > maxLen){
        outerCorner = fallback;
      }

      out.push({
        zoneId: zone.id,
        prevWallId: zoneEdgeWallId(zone.id, prevIdx),
        currWallId: zoneEdgeWallId(zone.id, currIdx),
        selected: appState.selectedWallId === zoneEdgeWallId(zone.id, prevIdx) || appState.selectedWallId === zoneEdgeWallId(zone.id, currIdx),
        height: Math.max(120, Number(prevWall.height || currWall.height || appState.layout?.meta?.defaultWallHeight || 290)),
        poly: [
          { x:Number(vertex.x || 0), y:Number(vertex.y || 0) },
          vCurr,
          outerCorner,
          vPrev
        ]
      });
    }
    return out;
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

  function getWallSlicePolygon(wall, t0=0, t1=1, inflate=1){
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
    const normal = getWallOpeningNormal(wall);
    const rawThickness = Math.max(8, Number(wall.thickness || 14) || 14) * Math.max(.1, Number(inflate || 1));
    if(wall.autoZoneEdge){
      return {
        normal,
        poly:[
          { x:p0.x, y:p0.y },
          { x:p1.x, y:p1.y },
          { x:p1.x + normal.x * rawThickness, y:p1.y + normal.y * rawThickness },
          { x:p0.x + normal.x * rawThickness, y:p0.y + normal.y * rawThickness }
        ],
        center:{ x:(p0.x+p1.x)/2 + normal.x * rawThickness * .5, y:(p0.y+p1.y)/2 + normal.y * rawThickness * .5 },
        thickness:rawThickness,
        dir,
        a:p0,
        b:p1
      };
    }
    const half = rawThickness / 2;
    return {
      normal,
      poly:[
        { x:p0.x - normal.x * half, y:p0.y - normal.y * half },
        { x:p1.x - normal.x * half, y:p1.y - normal.y * half },
        { x:p1.x + normal.x * half, y:p1.y + normal.y * half },
        { x:p0.x + normal.x * half, y:p0.y + normal.y * half }
      ],
      center:{ x:(p0.x+p1.x)/2, y:(p0.y+p1.y)/2 },
      thickness:rawThickness,
      dir,
      a:p0,
      b:p1
    };
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
      thickness:Math.max(4,Number(appState.layout?.meta?.defaultWallThickness||12)||12),
      height:Math.max(120,Number(appState.layout?.meta?.defaultWallHeight||290)||290),
      kind:'wall'
    };
    appState.layout.walls.push(wall);
    syncManualWallsFromNodes();
    appState.selectedWallId = wall.id;
    appState.selectedWallNodeId = endNode.id;
    appState.selectedOpeningId = '';
    appState.selectedRackLayoutId = '';
    return wall;
  }
  function createOpeningAtPoint(point, type='door'){
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

  function layoutSelectedSummary(){
    const measurement = (appState.layout?.measurements || []).find(m => m.id === appState.editor?.selectedMeasurementId);
    const opening = findOpeningById(appState.selectedOpeningId);
    const wall = findWallById(appState.selectedWallId);
    const zone = findZoneById(appState.selectedZoneId);
    const room = findRoomById(appState.selectedRoomId);
    const rack = findRackById(appState.selectedRackLayoutId);
    if(isRackDistributionScreen()){
      if(rack) return { type:'rack', title:rack.id, subtitle:`${rack.zoneId} · ${escapeHtml((rackModel(rack.modelId)||{}).name || rack.modelId || 'Rack')}` };
      if(zone) return { type:'zone', title:zone.name || zone.id, subtitle:`Estructura bloqueada · ${(appState.layout.racks||[]).filter(r=>r.zoneId===zone.id).length} racks` };
      return { type:'none', title:'Sin rack seleccionado', subtitle:'Selecciona o agrega un rack; la estructura está bloqueada' };
    }
    if(measurement) return { type:'measure', title:'Medición', subtitle:`${measurement.id} · ${formatDistanceCm(Math.hypot(measurement.b.x-measurement.a.x, measurement.b.y-measurement.a.y))}` };
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
    // Mantener forma rectangular si la zona tiene 4 vértices; si tiene más, escalar proporcionalmente.
    let candidate;
    if(zone.pts.length === 4){
      candidate = [
        {x:snapGrid(nextX), y:snapGrid(nextY)},
        {x:snapGrid(nextX+nextW), y:snapGrid(nextY)},
        {x:snapGrid(nextX+nextW), y:snapGrid(nextY+nextH)},
        {x:snapGrid(nextX), y:snapGrid(nextY+nextH)}
      ];
    } else {
      const oldW = Math.max(1, b.maxX - b.minX), oldH = Math.max(1, b.maxY - b.minY);
      candidate = zone.pts.map(pt => ({
        x: snapGrid(nextX + ((pt.x - b.minX) / oldW) * nextW),
        y: snapGrid(nextY + ((pt.y - b.minY) / oldH) * nextH)
      }));
    }
    const collision=findZoneOverlap(zone.id,candidate);
    if(collision){ setZoneCollisionPreview(zone.id,collision,candidate); showToast(`Cambio bloqueado: ${zone.name||zone.id} no puede superponerse con ${collision.name||collision.id}.`,'warning',2400); return false; }
    zone.pts=candidate; clearZoneCollisionPreview();
    // v110: la estructura no reposiciona racks; se corrigen luego en Distribución de racks.
    return true;
  }

  function addWarehouseTemplate(){
    const bounds = getLayoutContentBounds();
    const x = snapGrid(bounds.x + bounds.w + 100);
    const y = snapGrid(bounds.y + 60);
    const id = nextZoneId();
    const zone = { id, name:'Almacén', color:'#62d7a0', wallThickness:14, pts:[{x,y},{x:x+520,y},{x:x+520,y:y+360},{x,y:y+360}] };
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
    const zone = { id, name:`Zona ${id}`, color:getNextZoneColor(getBranchColor(getActiveLayoutBranchIndex())), wallThickness:14, pts:[{x,y},{x:x+420,y},{x:x+420,y:y+280},{x,y:y+280}] };
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
    const structureMode = !rackMode;
    return `
      <div class="layout-right-head">
        <div><b>Inspector del layout</b><small>Opciones contextualizadas según tu selección.</small></div>
        <span class="layout-type-pill">${summary.type === 'rack' ? 'Rack' : summary.type === 'zone' ? 'Zona' : summary.type === 'wall' ? 'Muro' : summary.type === 'opening' ? 'Opening' : summary.type === 'measure' ? 'Medida' : summary.type === 'room' ? 'Recinto' : 'Plano'}</span>
      </div>
      <div class="layout-right-scroll ${appState.editor.beginnerMode ? 'beginner-scroll' : ''}">
        <section class="layout-prop-card selected-summary layout-editor-focus-card">
          <div class="layout-prop-title">Selección</div>
          <div class="layout-selected-title">${escapeHtml(summary.title)}</div>
          <div class="tiny muted">Modo: ${escapeHtml(appState.editor.mode || 'select')}</div>
          <div class="layout-compact-help">
            <span class="layout-help-chip">${rackMode ? 'Edita racks sin tocar la estructura' : 'Edita muros, zonas y vanos'}</span>
            <span class="layout-help-chip">Cambios sincronizados con la vista 3D</span>
          </div>
        </section>
        ${appState.editor.beginnerMode ? `<section class="layout-prop-card beginner-guide-card"><div class="layout-prop-title">Guía rápida</div><div class="layout-compact-help">${rackMode ? '<span class="layout-help-chip">1. Selecciona o mueve racks</span><span class="layout-help-chip">2. Usa snap para alinear</span><span class="layout-help-chip">3. Guarda al terminar</span>' : '<span class="layout-help-chip">1. Dibuja zonas y muros</span><span class="layout-help-chip">2. Agrega puertas o aberturas</span><span class="layout-help-chip">3. Guarda el layout</span>'}</div></section>` : ''}
        <section class="layout-prop-card">
          <div class="layout-prop-title">Vista</div>
          <div class="layout-layer-grid">
            ${renderLayerToggle('lyGrid','Grilla', appState.editor.showGrid !== false)}
            ${renderLayerToggle('lyZones','Zonas', appState.editor.showZones !== false)}
            ${renderLayerToggle('lyWalls','Muros', appState.editor.wallsVisible !== false)}
            ${renderLayerToggle('lyOpenings','Aberturas', appState.editor.openingsVisible !== false)}
            ${renderLayerToggle('lyRacks','Racks', appState.editor.racksVisible !== false)}
            ${renderLayerToggle('lyLabels','Etiquetas', appState.editor.showLabels !== false)}
            ${renderLayerToggle('lyDims','Cotas', !!appState.editor.showDims)}
            ${renderLayerToggle('lyMini','Mini mapa', appState.editor.showMiniMap !== false)}
          </div>
        </section>
        <section class="layout-prop-card">
          <div class="layout-prop-title">Precisión</div>
          <div class="layout-prop-grid two">
            <label>Snap<input id="rpSnapEnabled" type="checkbox" ${isSnapEnabled()?'checked':''}></label>
            <label>Tamaño snap<input id="rpSnapSize" type="number" min="1" max="80" step="1" value="${formatUnitNumber(getSnapSize())}"></label>
            <label>Tamaño letra cotas<input id="rpDimFontSize" type="number" min="14" max="72" step="1" value="${formatUnitNumber(getDimFontSize())}"></label>
            <label>Estado<input value="${isSnapEnabled() ? 'Activo' : 'Desactivado'}" disabled></label>
          </div>
          <div class="tiny muted layout-panel-hint" style="margin-top:8px">Usa snap bajo para mayor precisión visual. Recomendado: 2, 5 o 10.</div>
        </section>
        ${rackMode ? v117RackToolsMarkup() + v117ValidationMarkup() : v117StructureToolsMarkup()}
        ${rackMode ? `<section class="layout-prop-card">
          <div class="layout-prop-title">Acciones rápidas</div>
          <div class="layout-template-grid">
            <button class="seg-btn" id="tplRackRow">Fila de racks</button>
            <button class="seg-btn" id="tplDistribute">Distribuir racks</button>
          </div>
          <div class="tiny muted layout-panel-hint" style="margin-top:8px">Optimiza la distribución sin cambiar el plano base.</div>
        </section>` : `<section class="layout-prop-card">
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
          <div class="tiny muted layout-panel-hint" style="margin-top:8px">Ideal para calcar un plano real sin ensuciar la vista principal.</div>
        </section>`}
        ${structureMode && findRoomById(appState.selectedRoomId) ? (()=>{ const rr=findRoomById(appState.selectedRoomId); const rp=roomPointsRaw(rr); const rz=getRoomLinkedZone(rr); const area=polygonAreaAbs(rp)*getScaleCmPerUnit()*getScaleCmPerUnit()/10000; const perimeter=rp.reduce((sum,p,i)=>{ const q=rp[(i+1)%rp.length]; return sum+Math.hypot(q.x-p.x,q.y-p.y); },0); return `<section class="layout-prop-card room-zone-card">
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
          </div>
          <div class="tiny muted layout-panel-hint" style="margin-top:8px">Puedes convertir este recinto en zona y mantenerlo sincronizado con su geometría.</div>
        </section>`; })() : ''}
        ${structureMode && zone ? `<section class="layout-prop-card">
          <div class="layout-prop-title">Zona</div>
          <div class="layout-prop-grid two">
            <label>Nombre<input id="rpZoneName" value="${escapeHtml(zone.name||'')}"></label>
            <label>Código<input id="rpZoneCode" value="${escapeHtml(zone.id||'')}"></label>
            <label>X<input id="rpZoneX" type="number" value="${formatUnitNumber(zoneB.minX)}"></label>
            <label>Y<input id="rpZoneY" type="number" value="${formatUnitNumber(zoneB.minY)}"></label>
            <label>Ancho<input id="rpZoneW" type="number" min="40" value="${formatUnitNumber(zoneB.maxX-zoneB.minX)}" ${isRoomLinkedZone(zone)?'disabled':''}></label>
            <label>Alto<input id="rpZoneH" type="number" min="40" value="${formatUnitNumber(zoneB.maxY-zoneB.minY)}" ${isRoomLinkedZone(zone)?'disabled':''}></label>
            <label>Color<input id="rpZoneColor" type="color" value="${escapeHtml(zone.color||'#6ff0a8')}"></label>
            <label>Escala cm/u<input id="rpScaleCm" type="number" min="0.1" step="0.1" value="${getScaleCmPerUnit()}"></label>
            <label>Rotación zona<input id="rpZoneRot" type="number" step="1" value="${Math.round(getZoneRotationDegrees(zone))}" ${isRoomLinkedZone(zone)?'disabled':''}></label>
            <label>Contenido<input value="${(appState.layout.racks||[]).filter(r => r.zoneId === zone.id).length} racks vinculados" disabled></label>
            ${isRoomLinkedZone(zone)?`<label>Geometría<input value="Vinculada · arrastrable" disabled></label>`:''}
          </div>
          <div class="layout-template-grid zone-rotate-grid" style="margin-top:10px">${isRoomLinkedZone(zone)?`<button class="seg-btn active" id="rpSelectZoneRoom">Editar muros del recinto</button><button class="seg-btn" id="rpDetachRoomZone">Desvincular geometría</button><div class="tiny muted layout-panel-hint" style="grid-column:1/-1">Arrastra para mover toda la geometría vinculada.</div>`:`<button class="seg-btn" id="rpZoneMinus15">Girar -15°</button><button class="seg-btn" id="rpZone15">Girar 15°</button><button class="seg-btn" id="rpZone45">Girar 45°</button><button class="seg-btn" id="rpZone90">Girar 90°</button><button class="seg-btn" id="rpDuplicateZone">Duplicar zona</button><button class="seg-btn" id="rpLockZones">${appState.editor.zonesLocked?'Desbloquear zonas':'Bloquear zonas'}</button><button class="seg-btn" id="rpAllEdgesWalls">Todas aristas → muro</button><button class="seg-btn" id="rpClearEdgesWalls">Quitar muros zona</button>`}</div>
        </section>` : ''}
        ${rackMode && rack ? `<section class="layout-prop-card">
          <div class="layout-prop-title">Rack</div>
          <div class="layout-prop-grid two">
            <label>ID<input value="${escapeHtml(rack.id)}" disabled></label>
            <label>Zona<input value="${escapeHtml(rack.zoneId)}" disabled></label>
            <label>Modelo<select id="rpRackModel">${modelOptions}</select></label>
            <label>Rotación<input id="rpRackRot" type="number" step="1" value="${Math.round(Number(rack.rot||0))}"></label>
            <label>X<input id="rpRackX" type="number" value="${formatUnitNumber(rack.x)}"></label>
            <label>Y<input id="rpRackY" type="number" value="${formatUnitNumber(rack.y)}"></label>
            <label>Huella<input value="${formatUnitNumber(fp?.w||rack.w)} × ${formatUnitNumber(fp?.h||rack.h)}" disabled></label>
            <label>Altura<input id="rpRackHeight" type="number" min="60" step="10" value="${Math.round(Number(rack.rackHeight || model?.height || 238))}"></label>
          </div>
          <div class="layout-template-grid" style="margin-top:10px"><button class="seg-btn" id="rpDuplicateRack">Duplicar rack</button><button class="seg-btn" id="rpRack45">Girar 45°</button><button class="seg-btn" id="rpRack90">Girar 90°</button><button class="seg-btn" id="rpAddAbove">Agregar encima</button></div>
        </section>` : ''}
        ${structureMode && findWallById(appState.selectedWallId) ? (()=>{ const sw=findWallById(appState.selectedWallId); const na=!sw.autoZoneEdge?getWallNode(sw.startNodeId):null; const nb=!sw.autoZoneEdge?getWallNode(sw.endNodeId):null; const linkedA=na?wallsForNode(na.id).length:0; const linkedB=nb?wallsForNode(nb.id).length:0; return `<section class="layout-prop-card wall-pro-card">
          <div class="layout-prop-title">Muro</div>
          <div class="layout-prop-grid two">
            <label>ID<input value="${escapeHtml(sw.id)}" disabled></label>
            <label>Nombre<input id="rpWallName" value="${escapeHtml(sw.name||'Muro')}"></label>
            <label>Longitud (cm)<input id="rpWallLength" type="number" min="10" step="1" value="${Math.round(unitsToCm(wallLength(sw)))}" ${sw.autoZoneEdge?'disabled':''}></label>
            <label>Ángulo (°)<input id="rpWallAngle" type="number" step="1" value="${Math.round(v117WallAngleDeg(sw))}" ${sw.autoZoneEdge?'disabled':''}></label>
            <label>Espesor (cm)<input id="rpWallThickness" type="number" min="4" max="80" step="1" value="${Math.round(unitsToCm(sw.thickness||12))}"></label>
            <label>Altura 3D (cm)<input id="rpWallHeight" type="number" min="120" max="600" step="5" value="${Math.round(unitsToCm(sw.height||290))}"></label>
            ${sw.autoZoneEdge ? `<label>Lado<select id="rpWallSide"><option value="1" ${getWallSideSign(sw.side)===1?'selected':''}>Fuera de zona</option><option value="-1" ${getWallSideSign(sw.side)===-1?'selected':''}>Dentro de zona</option></select></label>` : `<label>Conexiones<input value="A:${linkedA} · B:${linkedB}" disabled></label>`}
            ${!sw.autoZoneEdge && na ? `<label>Inicio X (cm)<input id="rpWallAX" type="number" step="1" value="${Math.round(unitsToCm(na.x))}"></label><label>Inicio Y (cm)<input id="rpWallAY" type="number" step="1" value="${Math.round(unitsToCm(na.y))}"></label>` : ''}
            ${!sw.autoZoneEdge && nb ? `<label>Final X (cm)<input id="rpWallBX" type="number" step="1" value="${Math.round(unitsToCm(nb.x))}"></label><label>Final Y (cm)<input id="rpWallBY" type="number" step="1" value="${Math.round(unitsToCm(nb.y))}"></label>` : ''}
          </div>
          ${!sw.autoZoneEdge?`<div class="layout-prop-grid two" style="margin-top:10px"><label>Mover ΔX (cm)<input id="rpWallMoveX" type="number" step="1" value="0"></label><label>Mover ΔY (cm)<input id="rpWallMoveY" type="number" step="1" value="0"></label></div>`:''}
          <div class="layout-template-grid" style="margin-top:10px">
            ${sw.autoZoneEdge ? `<button class="seg-btn" id="rpWallFlip">Invertir muro</button>` : `<button class="seg-btn" id="rpWallDuplicate">Duplicar muro</button><button class="seg-btn" id="rpWallMoveExact">Mover exacto</button>`}
            <button class="seg-btn" id="rpWallAddFree">Agregar abertura</button>
            <button class="seg-btn" id="rpWallAddDoor">Agregar puerta</button>
            <button class="seg-btn" id="rpWallAddWindow">Agregar ventana</button>
            <button class="seg-btn danger" id="rpWallDelete">Eliminar muro</button>
          </div>
          <div class="tiny muted layout-panel-hint" style="margin-top:8px">Los extremos comparten nodos para mantener uniones limpias.</div>
        </section>`; })() : ''}
        ${structureMode && findOpeningById(appState.selectedOpeningId) ? `<section class="layout-prop-card opening-editor-card">
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
        ${structureMode && appState.editor?.selectedMeasurementId ? (()=>{ const mm=(appState.layout.measurements||[]).find(m=>m.id===appState.editor.selectedMeasurementId); if(!mm) return ''; const dx=mm.b.x-mm.a.x,dy=mm.b.y-mm.a.y; return `<section class="layout-prop-card"><div class="layout-prop-title">Medición</div><div class="layout-prop-grid two"><label>Distancia<input value="${formatDistanceCm(Math.hypot(dx,dy))}" disabled></label><label>ΔX<input value="${formatDistanceCm(Math.abs(dx))}" disabled></label><label>ΔY<input value="${formatDistanceCm(Math.abs(dy))}" disabled></label><label>ID<input value="${escapeHtml(mm.id)}" disabled></label></div><button class="seg-btn danger" id="rpMeasureDelete" style="margin-top:10px">Eliminar medición</button></section>`; })() : ''}
      </div>`;
  }

  function bindLayoutRightPanel(){
    const rightScroller = document.querySelector('#layoutRightPanel .layout-right-scroll');
    if(rightScroller){
      rightScroller.scrollTop = appState.editor?.rightPanelScrollTop || 0;
      rightScroller.onscroll = () => { appState.editor.rightPanelScrollTop = rightScroller.scrollTop || 0; };
    }
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
    if($('#rpSnapEnabled')) $('#rpSnapEnabled').onchange = e => { appState.editor.snapEnabled = !!e.target.checked; clearRackSnapPreview(); persistActiveLayout(); renderLayoutEditor(); };
    const updateSnapSize = value => { appState.editor.snapSize = Math.max(1, Math.min(80, Number(value || DEFAULT_GRID_SIZE) || DEFAULT_GRID_SIZE)); appState.editor.snapPrecisionMigrated = true; persistActiveLayout(); renderLayoutEditor(); };
    const updateDimFont = value => { appState.editor.dimFontSize = Math.max(14, Math.min(72, Number(value || DEFAULT_DIM_FONT_SIZE) || DEFAULT_DIM_FONT_SIZE)); appState.editor.dimFontMigrated = true; persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpSnapSize')) $('#rpSnapSize').onchange = e => updateSnapSize(e.target.value);
    if($('#rpDimFontSize')) $('#rpDimFontSize').onchange = e => updateDimFont(e.target.value);
    if($('#layoutSnapEnabled')) $('#layoutSnapEnabled').onchange = e => { appState.editor.snapEnabled = !!e.target.checked; clearRackSnapPreview(); persistActiveLayout(); renderLayoutEditor(); };
    if($('#layoutSnapSize')) $('#layoutSnapSize').onchange = e => updateSnapSize(e.target.value);
    if($('#layoutDimFontSize')) $('#layoutDimFontSize').onchange = e => updateDimFont(e.target.value);
    const zone = findZoneById(appState.selectedZoneId);
    const room = findRoomById(appState.selectedRoomId);
    const rack = findRackById(appState.selectedRackLayoutId);
    if($('#rpRoomName')) $('#rpRoomName').onchange = e => { if(!room) return; room.name=String(e.target.value||room.name||room.id); persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpRoomToZone')) $('#rpRoomToZone').onclick = () => { if(!room) return; convertRoomToZone(room); renderLayoutEditor(); };
    if($('#rpSelectLinkedZone')) $('#rpSelectLinkedZone').onclick = () => { const linked=room?getRoomLinkedZone(room):null; if(!linked) return; appState.selectedZoneId=linked.id; appState.selectedRoomId=room.id; renderLayoutEditor(); };
    if($('#rpSelectZoneRoom')) $('#rpSelectZoneRoom').onclick = () => { const rr=zone?getRoomForZone(zone):null; if(!rr) return; appState.selectedRoomId=rr.id; appState.selectedWallId=''; appState.selectedOpeningId=''; renderLayoutEditor(); };
    if($('#rpDetachRoomZone')) $('#rpDetachRoomZone').onclick = () => { if(zone && detachRoomZone(zone)){ renderLayoutEditor(); } };
    const applyZoneGeometry = () => {
      if(!zone) return;
      const linkedRoom=getRoomForZone(zone);
      if(linkedRoom){
        const b=zoneBoundsOf(zone);
        const nx=Number($('#rpZoneX')?.value); const ny=Number($('#rpZoneY')?.value);
        const dx=Number.isFinite(nx)?nx-b.minX:0; const dy=Number.isFinite(ny)?ny-b.minY:0;
        if(dx||dy) translateRoomGeometry(linkedRoom,dx,dy,{snap:false});
      }else{
        setRectZoneBounds(zone, { x:$('#rpZoneX')?.value, y:$('#rpZoneY')?.value, w:$('#rpZoneW')?.value, h:$('#rpZoneH')?.value });
      }
      persistActiveLayout(); renderLayoutEditor();
    };
    if($('#rpZoneName')) $('#rpZoneName').onchange = e => { zone.name = e.target.value; persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpZoneCode')) $('#rpZoneCode').onchange = e => { renameZoneId(zone.id, e.target.value); renderLayoutEditor(); };
    ['rpZoneX','rpZoneY','rpZoneW','rpZoneH'].forEach(id=>{ const el=$('#'+id); if(el) el.onchange = applyZoneGeometry; });
    if($('#rpZoneColor')) $('#rpZoneColor').oninput = e => { zone.color=e.target.value; persistActiveLayout(); renderLayoutEditor(); };
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
      rack.x = snapGrid(Number($('#rpRackX')?.value || rack.x) || 0);
      rack.y = snapGrid(Number($('#rpRackY')?.value || rack.y) || 0);
      const host = findZoneById(rack.zoneId) || nearestZoneForPoint({x:rack.x+rack.w/2,y:rack.y+rack.h/2});
      if(host) keepRackSnapped(rack, host);
      persistActiveLayout(); renderLayoutEditor();
    };
    if($('#rpRackModel')) $('#rpRackModel').onchange = e => { if(!rack) return; rack.modelId=e.target.value; syncRackFootprint(rack,true); const host=findZoneById(rack.zoneId); if(host) keepRackSnapped(rack, host); persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpRackRot')) $('#rpRackRot').onchange = e => { if(!rack) return; applyRackRotation(rack, Number(e.target.value||0)||0); persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpRackX')) $('#rpRackX').onchange = applyRackPosition;
    if($('#rpRackY')) $('#rpRackY').onchange = applyRackPosition;
    if($('#rpRackHeight')) $('#rpRackHeight').onchange = e => { if(!rack) return; rack.rackHeight = Math.max(60, Number(e.target.value||60)||60); persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpDuplicateRack')) $('#rpDuplicateRack').onclick = () => duplicateSelectedRack();
    if($('#rpRack45')) $('#rpRack45').onclick = () => { if(!rack) return; applyRackRotation(rack, Number(rack.rot||0)+45); persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpRack90')) $('#rpRack90').onclick = () => { if(!rack) return; applyRackRotation(rack, Number(rack.rot||0)+90); persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpAddAbove')) $('#rpAddAbove').onclick = () => { if(!rack) return; duplicateRackLayout(rack.id); };

    const selectedWall = findWallById(appState.selectedWallId);
    const selectedOpening = findOpeningById(appState.selectedOpeningId);
    if($('#rpWallName')) $('#rpWallName').onchange = e => { if(!selectedWall) return; selectedWall.name = e.target.value || 'Muro'; persistActiveLayout(); renderLayoutEditor(); };
    if($('#rpWallLength')) $('#rpWallLength').onchange = e => { if(!selectedWall || selectedWall.autoZoneEdge) return; const units=Math.max(10,Number(e.target.value||0))/Math.max(.0001,getScaleCmPerUnit()); if(setManualWallLength(selectedWall,units)){ v117ResolveWallIntersections(); v117RefreshRooms(); persistActiveLayout(); renderLayoutEditor(); } };
    if($('#rpWallAngle')) $('#rpWallAngle').onchange = e => { if(v117SetWallAngle(selectedWall,Number(e.target.value||0))){ persistActiveLayout(); renderLayoutEditor(); } };
    if($('#rpWallMoveExact')) $('#rpWallMoveExact').onclick = () => { if(v117TranslateWallCm(selectedWall,$('#rpWallMoveX')?.value,$('#rpWallMoveY')?.value)){ persistActiveLayout(); renderLayoutEditor(); } };
    if($('#rpWallHeight')) $('#rpWallHeight').onchange = e => { if(!selectedWall) return; const sc=Math.max(.0001,getScaleCmPerUnit()); selectedWall.height=Math.max(120/sc,Math.min(600/sc,Number(e.target.value||290)/sc)); if(selectedWall.autoZoneEdge){ const z=findZoneById(selectedWall.zoneId); if(z) setZoneEdgeWall(z,Number(selectedWall.edgeIndex||0),{height:selectedWall.height}); } persistActiveLayout(); renderLayoutEditor(); };
    const wallNodeCoord=(nodeId,axis,value)=>{ const node=getWallNode(nodeId); if(!node) return; const units=Number(value||0)/Math.max(.0001,getScaleCmPerUnit()); const moved=setWallNodePosition(nodeId,axis==='x'?units:node.x,axis==='y'?units:node.y); if(!moved)showToast('Coordenada bloqueada: provocaría superposición entre zonas.','warning',2200); persistActiveLayout(); renderLayoutEditor(); };
    if(selectedWall && !selectedWall.autoZoneEdge){
      if($('#rpWallAX')) $('#rpWallAX').onchange=e=>wallNodeCoord(selectedWall.startNodeId,'x',e.target.value);
      if($('#rpWallAY')) $('#rpWallAY').onchange=e=>wallNodeCoord(selectedWall.startNodeId,'y',e.target.value);
      if($('#rpWallBX')) $('#rpWallBX').onchange=e=>wallNodeCoord(selectedWall.endNodeId,'x',e.target.value);
      if($('#rpWallBY')) $('#rpWallBY').onchange=e=>wallNodeCoord(selectedWall.endNodeId,'y',e.target.value);
      if($('#rpWallDuplicate')) $('#rpWallDuplicate').onclick=()=>duplicateSelectedStructure();
    }
    if($('#rpWallDelete')) $('#rpWallDelete').onclick=()=>deleteLayoutSelection();
    if($('#rpWallThickness')) $('#rpWallThickness').onchange = e => {
      if(!selectedWall) return;
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
    if($('#rpMeasureDelete')) $('#rpMeasureDelete').onclick = () => deleteLayoutSelection();

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
    document.body.dataset.wmsLayoutVersion = 'v165-clear-workflow';
    document.body.dataset.wmsLayoutWorkspace = isRackDistributionScreen() ? 'racks' : 'structure';
    const __layoutRightScrollBefore = document.querySelector('#layoutRightPanel .layout-right-scroll')?.scrollTop ?? appState.editor?.rightPanelScrollTop ?? 0;
    ensureLayoutEditorState();
    appState.editor.rightPanelScrollTop = __layoutRightScrollBefore;
    const rackMode = isRackDistributionScreen();
    const workspaceHistory = rackMode ? 'distribution' : 'structure';
    if(!(getHistoryBucket(workspaceHistory)?.undoStack?.length)) recordHistorySnapshot(workspaceHistory);
    ensureRackProps();
    const structureMode = !rackMode;
    contentTitle.textContent = rackMode ? 'Editor de layout · racks' : 'Editor de layout · estructura';
    appState.editor.view = 'ortho';
    const isIsoView = false;
    const selectedRack = findRackById(appState.selectedRackLayoutId);
    const selectedRackModel = selectedRack ? rackModel(selectedRack.modelId) : null;
    const selectedRackFootprint = selectedRack ? getRackFootprint(selectedRack.modelId, selectedRack.rot || 0) : null;
    const selectedZone = findZoneById(appState.selectedZoneId);
    const selectedWall = findWallById(appState.selectedWallId);
    const selectedOpening = findOpeningById(appState.selectedOpeningId);
    const selectionType = rackMode ? (selectedRack ? 'rack' : '') : (selectedOpening ? 'opening' : (selectedWall ? 'wall' : (selectedZone ? 'zone' : '')));
    let contextTitle = rackMode ? 'Selecciona un rack para editarlo.' : 'Selecciona un elemento del layout.';
    let contextHint = rackMode ? 'Desde aquí podrás duplicar, eliminar o abrir el elemento en 3D.' : 'Usa el panel derecho solo cuando necesites detalle.';
    let contextActions = [];
    if(selectionType==='rack' && selectedRack){
      contextTitle = `Rack activo: ${selectedRack.id}`;
      contextHint = 'Acciones rápidas para distribución y revisión visual.';
      contextActions = [['ctx-duplicate-rack','Duplicar'],['ctx-open-3d','Ver en 3D'],['ctx-delete','Eliminar']];
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
    const contextMarkup = `<div class="layout-contextual-bar"><div class="layout-contextual-copy"><b>${escapeHtml(contextTitle)}</b><small>${escapeHtml(contextHint)}</small></div><div class="layout-contextual-actions">${contextActions.map(([action,label])=>`<button class="seg-btn" data-layout-context-action="${action}">${label}</button>`).join('')}</div></div>`;
    contentSubtitle.textContent = rackMode ? 'Distribuye racks con una vista ordenada, limpia y fácil de leer.' : 'Edita la estructura con una vista más clara, compacta y conectada al 3D.';
    detailTitle.textContent = rackMode ? 'Layout de racks' : 'Layout estructural';
    detailSubtitle.textContent = rackMode ? 'Los racks son editables; la estructura permanece protegida.' : 'Muros, vanos y zonas en un solo espacio de edición.';
    setTags([
      { label:'↶ Deshacer', active: true, action:`history-undo-${workspaceHistory}`, extraClass:'history-chip' },
      { label:'↷ Rehacer', active: true, action:`history-redo-${workspaceHistory}`, extraClass:'history-chip' },
      { label:`Snap ${isSnapEnabled() ? getSnapSize() : 'OFF'}`, active: isSnapEnabled(), action:'toggle-snap' },
      { label:'Cotas', active: !!appState.editor.showDims, action:'toggle-dims' },
      { label:'Sección', active: !!appState.editor.sectionVisible, action:'toggle-section' },
      { label: appState.editor.rightPanelOpen === false ? 'Mostrar inspector' : 'Ocultar inspector', active: appState.editor.rightPanelOpen !== false, action:'toggle-right-props' },
      { label: appState.editor.presentationMode ? 'Salir presentación' : 'Solo espacio', active: !!appState.editor.presentationMode, action:'toggle-presentation' },
      { label: appState.editor.beginnerMode ? 'Modo fácil' : 'Modo pro', active: !!appState.editor.beginnerMode, action:'toggle-beginner-mode' }
    ]);

    if(!document.getElementById('layoutV163Styles')){
      const style=document.createElement('style');
      style.id='layoutV163Styles';
      style.textContent=`
      .layout-cad-v80{--panel-bg:rgba(248,244,236,.92);--panel-stroke:rgba(171,152,125,.26);--panel-text:#2e241a;--panel-soft:#78624a;--accent:#0e947b}
      .layout-cad-v80 .layout-cad-localbar-v80{background:linear-gradient(180deg,rgba(245,239,229,.92),rgba(239,233,224,.88));border:1px solid var(--panel-stroke);border-radius:18px;padding:12px 14px;gap:10px;box-shadow:0 18px 40px rgba(6,20,24,.16);backdrop-filter:blur(10px)}
      .layout-cad-v80 .layout-right-panel,.layout-cad-v80 .v80-canvas-card,.layout-cad-v80 .v80-minimap-card{background:var(--panel-bg);border:1px solid var(--panel-stroke);box-shadow:0 18px 40px rgba(6,20,24,.12);backdrop-filter:blur(10px)}
      .layout-cad-v80 .layout-right-panel{border-radius:22px;overflow:hidden}
      .layout-cad-v80 .layout-right-head{background:linear-gradient(180deg,rgba(255,252,246,.84),rgba(246,240,232,.92));border-bottom:1px solid var(--panel-stroke);padding:16px 18px;display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .layout-cad-v80 .layout-right-head b{font-size:18px;color:var(--panel-text)}
      .layout-cad-v80 .layout-right-head small{color:var(--panel-soft);display:block;margin-top:4px}
      .layout-cad-v80 .layout-type-pill{background:rgba(14,148,123,.10);color:#0d6b59;border:1px solid rgba(14,148,123,.18);padding:7px 12px;border-radius:999px;font-weight:700}
      .layout-cad-v80 .layout-right-scroll{padding:14px}
      .layout-cad-v80 .layout-prop-card{background:rgba(255,253,250,.72);border:1px solid rgba(171,152,125,.18);border-radius:18px;padding:14px 15px;margin-bottom:12px}
      .layout-cad-v80 .layout-prop-title{color:#5f4b37;font-size:13px;letter-spacing:.04em;text-transform:uppercase}
      .layout-cad-v80 .layout-selected-title{font-size:28px;line-height:1.05;color:#241b12;margin:6px 0 4px}
      .layout-cad-v80 .tiny.muted,.layout-cad-v80 .layout-compact-help,.layout-cad-v80 .layout-panel-hint{color:#7e6a56}
      .layout-cad-v80 .layout-compact-help{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
      .layout-cad-v80 .layout-help-chip{padding:6px 10px;border-radius:999px;background:rgba(118,99,75,.08);border:1px solid rgba(118,99,75,.14);font-size:12px}
      .layout-cad-v80 .layout-layer-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .layout-cad-v80 .layout-layer-toggle{background:rgba(255,255,255,.64);border:1px solid rgba(171,152,125,.20);border-radius:12px;padding:8px 10px}
      .layout-cad-v80 .layout-layer-toggle span{color:#3a2d22;font-weight:600}
      .layout-cad-v80 .seg-btn,.layout-cad-v80 .btn,.layout-cad-v80 select,.layout-cad-v80 input{border-radius:14px}
      .layout-cad-v80 .v80-tool-rail{background:linear-gradient(180deg,rgba(245,239,229,.92),rgba(237,230,220,.9));border:1px solid rgba(171,152,125,.22);box-shadow:0 18px 40px rgba(6,20,24,.12)}
      .layout-cad-v80 .v80-tool-btn{min-width:86px}
      .layout-cad-v80 .v80-canvas-footer{background:rgba(245,239,229,.88);border:1px solid rgba(171,152,125,.18);border-radius:16px}
      .layout-cad-v80 .v90-floating-save-layout{border-radius:14px;box-shadow:0 16px 30px rgba(14,148,123,.22)}
      .layout-cad-v80 .layout-mini-svg{background:linear-gradient(180deg,rgba(246,241,233,.95),rgba(238,232,223,.95));border-radius:16px;border:1px solid rgba(171,152,125,.18)}
      .layout-cad-v80 .v80-minimap-title{color:#5f4b37}
      .layout-cad-v80 .v99-save-status,.layout-cad-v80 .v99-quality-badge,.layout-cad-v80 .workspace-lock-badge,.layout-cad-v80 .v90-version-badge{border-radius:999px}
      .layout-cad-v80 .layout-canvas-card.detail-stage{overflow:hidden}
      .layout-cad-v80 .layout-editor-focus-card .layout-prop-grid.two{gap:10px}
      .layout-cad-v80 .layout-quick-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
      .layout-cad-v80 .layout-quick-actions .seg-btn{min-height:40px}
      .layout-cad-v80 .layout-contextual-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;margin-top:10px;background:linear-gradient(180deg,rgba(248,244,236,.96),rgba(242,236,228,.92));border:1px solid var(--panel-stroke);border-radius:18px;box-shadow:0 12px 26px rgba(6,20,24,.08)}
      .layout-cad-v80 .layout-contextual-copy{display:grid;gap:3px}
      .layout-cad-v80 .layout-contextual-copy b{font-size:14px;color:#2b2015}
      .layout-cad-v80 .layout-contextual-copy small{color:#7e6a56}
      .layout-cad-v80 .layout-contextual-actions{display:flex;flex-wrap:wrap;gap:8px}
      .layout-cad-v80 .v165-inspector-toggle,.layout-cad-v80 .v165-presentation-toggle{white-space:nowrap}
      .layout-cad-v80 .layout-cad-shell-v80.right-collapsed .layout-cad-workspace-v80{grid-template-columns:1fr}
      .layout-cad-v80 .layout-cad-shell-v80.right-collapsed #layoutRightPanel{display:none!important}
      .layout-cad-v80 .layout-cad-shell-v80.presentation-mode .layout-cad-localbar-v80,
      .layout-cad-v80 .layout-cad-shell-v80.presentation-mode .layout-contextual-bar,
      .layout-cad-v80 .layout-cad-shell-v80.presentation-mode #layoutRightPanel,
      .layout-cad-v80 .layout-cad-shell-v80.presentation-mode .v80-tool-rail,
      .layout-cad-v80 .layout-cad-shell-v80.presentation-mode .v80-minimap-card,
      .layout-cad-v80 .layout-cad-shell-v80.presentation-mode .v80-canvas-footer,
      .layout-cad-v80 .layout-cad-shell-v80.presentation-mode .v90-floating-save-layout{display:none!important}
      .layout-cad-v80 .layout-cad-shell-v80.presentation-mode .layout-cad-workspace-v80{display:block}
      .layout-cad-v80 .layout-cad-shell-v80.presentation-mode .layout-main-stage{height:calc(100vh - 230px)}
      .layout-cad-v80 .layout-presentation-exit{position:absolute;top:18px;right:18px;z-index:9;border-radius:999px;padding:10px 14px!important;box-shadow:0 12px 26px rgba(6,20,24,.16)}
      .layout-cad-v80 .layout-presentation-badge{position:absolute;left:18px;top:18px;z-index:9;background:rgba(255,252,246,.92);border:1px solid rgba(171,152,125,.24);padding:10px 14px;border-radius:999px;color:#4e3d2b;font-weight:700;box-shadow:0 12px 26px rgba(6,20,24,.12)}
      `;
      document.head.appendChild(style);
    }

    contentWrap.innerHTML = `
      <div class="stage layout-premium-render layout-cad-v80" style="position:relative;height:100%">
        <div class="layout-cad-shell-v80 ${appState.editor.rightPanelOpen === false ? 'right-collapsed' : ''} ${appState.editor.beginnerMode ? 'beginner-ui' : 'advanced-ui'} ${appState.editor.presentationMode ? 'presentation-mode' : ''}">
          <div class="layout-cad-localbar-v80">
            ${structureMode ? '<button class="btn primary v80-zone-btn" id="btnZonePlus">+ Zona</button>' : '<button class="btn primary v80-zone-btn" data-emode="rack">+ Rack</button>'}
            <select id="layoutBranchSelect" class="seg-btn v80-branch-select">${(appState.admin.branches||[]).map((b,i)=>`<option value="${i}" ${i===getActiveLayoutBranchIndex()?'selected':''}>${escapeHtml(b.name||('Sucursal '+(i+1)))}</option>`).join('')}</select>
            <select class="seg-btn v80-unit-select" aria-label="Unidades"><option>m</option><option>cm</option></select>
            <button class="seg-btn v80-icon-btn" data-layout-tag-action="toggle-snap" title="Snap">⌁</button>
            <button class="seg-btn v80-icon-btn" data-layout-tag-action="toggle-dims" title="Cotas">▦</button>
            <button class="seg-btn v80-icon-btn" id="btnZoomFit" title="Ajustar vista">□</button>
            <button class="seg-btn v165-inspector-toggle" data-layout-tag-action="toggle-right-props" type="button">${appState.editor.rightPanelOpen === false ? 'Mostrar inspector' : 'Ocultar inspector'}</button>
            <button class="seg-btn v165-presentation-toggle" id="btnPresentationMode" type="button">${appState.editor.presentationMode ? 'Salir de solo espacio' : 'Solo espacio'}</button>
            <button class="seg-btn v134-open-3d" id="btnOpenLayout3D" type="button" title="Abrir el mismo modelo en 3D">◈ Ver en 3D</button>
            <button class="btn primary v90-save-layout-btn" id="btnSaveLayoutVisible" type="button">${rackMode ? 'Guardar racks' : 'Guardar layout'}</button>
            <span id="layoutSaveStatus" class="v99-save-status local">Local</span>
            <span id="layoutQualityBadge" class="v99-quality-badge ok">OK</span>
            <span class="layout-user-badge workspace-lock-badge ${rackMode ? 'rack-workspace' : 'structure-workspace'}">${rackMode ? 'Solo racks' : 'Solo estructura'}</span>
          </div>
          ${contextMarkup}
          <div class="layout-cad-workspace-v80">
            <main class="layout-main-stage v80-main-stage ${appState.editor.sectionVisible ? 'with-section' : ''}">
              <div class="layout-canvas-wrap v80-canvas-wrap">
                <div class="layout-canvas-card detail-stage v80-canvas-card">
                  <svg id="layoutSvg"></svg>${appState.editor.presentationMode ? `<button class="seg-btn layout-presentation-exit" id="btnExitPresentation">Salir de solo espacio</button><div class="layout-presentation-badge">Modo presentación</div>` : ``}
                  <div class="v80-tool-rail" aria-label="${rackMode ? 'Herramientas de distribución' : 'Herramientas de estructura'}">
                    ${structureMode ? `
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='select'?'active':''}" data-emode="select"><span class="v80-tool-ico">↖</span><b>Seleccionar</b></button>
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='wall'?'active':''}" data-emode="wall"><span class="v80-tool-ico">╱</span><b>Muro</b></button>
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='door'?'active':''}" data-emode="door"><span class="v80-tool-ico">◧</span><b>Puerta</b></button>
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='opening'?'active':''}" data-emode="opening"><span class="v80-tool-ico">▭</span><b>Abertura</b></button>
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='zone'?'active':''}" id="btnZonePlusRail" data-tool-proxy="btnZonePlus"><span class="v80-tool-ico">□</span><b>Zona</b></button>
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='measure'?'active':''}" data-emode="measure"><span class="v80-tool-ico">↔</span><b>Medir</b></button>
                    ` : `
                    <button class="v80-tool-btn seg-btn ${appState.editor.mode==='rack'?'active':''}" data-emode="rack"><span class="v80-tool-ico">▤</span><b>Rack</b></button>
                    <button class="v80-tool-btn seg-btn" id="btnDuplicateRackRail"><span class="v80-tool-ico">⧉</span><b>Duplicar</b></button>
                    `}
                    <button class="v80-tool-btn seg-btn" data-layout-tag-action="toggle-dims"><span class="v80-tool-ico">↔</span><b>Cotas</b></button>
                  </div>
                  ${appState.editor.showMiniMap !== false ? `<div class="v80-minimap-card"><div class="v80-minimap-title">Layout mini</div>${renderLayoutMiniMapMarkup()}</div>` : ''}
                  <div class="v80-canvas-footer">
                    <span>Vista layout</span><span>Sucursal activa</span>
                    <span>Rejilla: <b>${formatUnitNumber(getSnapSize() / Math.max(1, getSnapSize()) * 0.25)} m</b></span>
                    <button class="seg-btn" id="btnZoomOut">−</button><span class="zoom-chip" id="zoomLabel">100%</span><button class="seg-btn" id="btnZoomIn">+</button>
                  </div>
                  <button class="v90-floating-save-layout" id="btnSaveLayoutFloat" type="button">${rackMode ? 'Guardar distribución' : 'Guardar estructura'}</button>
                  ${structureMode && appState.editor.mode==='wall' && appState.editor.pendingWallPoint ? `<div class="wall-length-hud"><span>Longitud</span><input id="wallLengthInput" type="number" min="1" step="1" placeholder="cm" value="${escapeHtml(String(appState.editor.wallLengthDraft||''))}"><b>cm</b><small>Enter fija · ESC termina</small></div>` : ''}
                  ${structureMode && appState.editor.mode==='wall' ? `<div class="wall-draw-help">Clic para iniciar · clic para encadenar · Shift ortogonal · escribe una medida · ESC finaliza</div>` : ''}
                  <div id="layoutStackMenu" class="layout-stack-overlay"></div>
                </div>
                <div id="layoutSectionWrap" class="v80-section-floating"></div>
              </div>
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
    const svg = $('#layoutSvg');
    const currentBox = appState.editor.viewBox || { x:0, y:0, w:900, h:620 };
    if(!appState.editor.viewBoxInitialized){
      fitLayoutViewBox();
      appState.editor.viewBoxInitialized = true;
    }else if(!appState.editor.viewBoxCustomized && (currentBox.x===0 && currentBox.y===0 && currentBox.w===900 && currentBox.h===620)){
      fitLayoutViewBox();
    }
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    renderLayoutSvg(svg);
    renderLayoutSection();
    renderLayoutInspector();
    renderLayoutStackMenu();
    const layoutStageRoot = document.querySelector('.layout-cad-v80');
    if(layoutStageRoot) layoutStageRoot.addEventListener('pointerdown', evt => {
      if(evt.target && evt.target.closest('button, select, input, .seg-btn')) markLayoutManualInteraction();
    }, { capture:true });
    bindLayoutToolbar();
    ensureLayoutKeyboardBindings();
    const wallLengthInput=$('#wallLengthInput'); if(wallLengthInput){ wallLengthInput.oninput=e=>{ appState.editor.wallLengthDraft=e.target.value; }; wallLengthInput.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); commitWallLengthFromHud(e.currentTarget.value); } if(e.key==='Escape'){ e.preventDefault(); cancelLayoutDrawing(); } }; }
    document.querySelectorAll('[data-tool-proxy]').forEach(btn => {
      btn.onclick = () => { const target = document.getElementById(btn.getAttribute('data-tool-proxy')); if(target) target.click(); };
    });
    bindLayoutRightPanel();
    requestAnimationFrame(() => {
      const scroller = document.querySelector('#layoutRightPanel .layout-right-scroll');
      if(scroller) scroller.scrollTop = appState.editor?.rightPanelScrollTop || __layoutRightScrollBefore || 0;
    });
    bindLayoutAutoFit();
    const undoBtn = document.querySelector('[data-history-undo="layout"]'); if(undoBtn) undoBtn.onclick = () => undoHistory('layout');
    const redoBtn = document.querySelector('[data-history-redo="layout"]'); if(redoBtn) redoBtn.onclick = () => redoHistory('layout');
    updateUndoRedoUi();
    const zl = $('#zoomLabel'); if(zl){ const vb = appState.editor.viewBox || {w:900}; zl.textContent = `${Math.round((900 / vb.w) * 100)}%`; }
    updateLayoutSaveStatus();
    updateLayoutQualityBadge();
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
    const zones = appState.layout?.zones || [];
    const racks = appState.layout?.racks || [];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
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
    const padX = Math.max(52, bounds.w * 0.08);
    const padY = Math.max(46, bounds.h * 0.08);
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
    const gridStep = Math.max(4, getSnapSize() * 2);
    const gridPad = 2400;
    const gridMinX = Math.floor(Math.min(renderVb.x, contentBounds.x) - gridPad);
    const gridMaxX = Math.ceil(Math.max(renderVb.x + renderVb.w, contentBounds.x + contentBounds.w) + gridPad);
    const gridMinY = Math.floor(Math.min(renderVb.y, contentBounds.y) - gridPad);
    const gridMaxY = Math.ceil(Math.max(renderVb.y + renderVb.h, contentBounds.y + contentBounds.h) + gridPad);
    if(appState.editor.showGrid !== false){
      const grid = svgEl('g',{class:'ortho-grid'});
      for(let x=Math.floor(gridMinX / gridStep) * gridStep; x<=gridMaxX; x+=gridStep) grid.appendChild(svgEl('line',{x1:x,y1:gridMinY,x2:x,y2:gridMaxY}));
      for(let y=Math.floor(gridMinY / gridStep) * gridStep; y<=gridMaxY; y+=gridStep) grid.appendChild(svgEl('line',{x1:gridMinX,y1:y,x2:gridMaxX,y2:y}));
      svg.appendChild(grid);
    }
    const bgImage = appState.layout?.meta?.backgroundImage;
    if(bgImage){
      const b = getLayoutContentBounds();
      const bg = svgEl('image',{href:bgImage,x:b.x,y:b.y,width:b.w,height:b.h,preserveAspectRatio:'xMidYMid meet',class:'layout-bg-image'});
      svg.appendChild(bg);
    }

    const roomLayer = svgEl('g',{class:'layout-room-layer'});
    const edgeLayer = svgEl('g');
    const zoneLayer = svgEl('g');
    const wallLayer = svgEl('g');
    const openingLayer = svgEl('g');
    const guideLayer = svgEl('g');
    const rackLayer = svgEl('g');
    const measureLayer = svgEl('g');
    const vertexLayer = svgEl('g');
    if(appState.editor.showZones === false){ zoneLayer.setAttribute('style','display:none'); vertexLayer.setAttribute('style','display:none'); edgeLayer.setAttribute('style','display:none'); }
    if(appState.editor.wallsVisible === false) wallLayer.setAttribute('style','display:none');
    if(appState.editor.openingsVisible === false) openingLayer.setAttribute('style','display:none');
    svg.append(roomLayer, edgeLayer, zoneLayer, wallLayer, openingLayer, rackLayer, guideLayer, measureLayer, vertexLayer);

    ensureWallTopology();
    (appState.layout.rooms||[]).forEach(room=>{ const pts=roomPointsRaw(room); if(pts.length<3) return; const linked=getRoomLinkedZone(room); const selected=appState.selectedRoomId===room.id; const d=pts.map((pt,i)=>`${i?'L':'M'} ${pt.x} ${pt.y}`).join(' ')+' Z'; const path=svgEl('path',{d,class:`layout-room-fill ${selected?'selected':''} ${linked?'is-zone':''}`,fill:linked?hexToRgba(linked.color||'#6ff0a8',selected?.14:.075):(selected?'rgba(77,222,166,.12)':'rgba(77,222,166,.055)'),stroke:linked?(linked.color||'#6ff0a8'):(selected?'rgba(111,240,168,.88)':'rgba(77,222,166,.22)'),'stroke-width':selected?'2.3':'1','stroke-dasharray':linked?'5 4':'8 7','data-room-id':room.id,style:'cursor:pointer'}); path.addEventListener('pointerdown',evt=>{ if(!isStructureLayoutScreen()||appState.editor.mode!=='select') return; evt.stopPropagation(); appState.selectedRoomId=room.id; appState.selectedZoneId=linked?.id||''; appState.selectedWallId=''; appState.selectedOpeningId=''; appState.selectedRackLayoutId=''; renderLayoutEditor(); }); roomLayer.appendChild(path); const c={x:pts.reduce((a,p)=>a+p.x,0)/pts.length,y:pts.reduce((a,p)=>a+p.y,0)/pts.length}; const t=svgEl('text',{x:c.x,y:c.y,class:`layout-room-label ${selected?'selected':''}`,'text-anchor':'middle','data-room-id':room.id,style:'cursor:pointer;pointer-events:auto'}); const area=Math.round(polygonAreaAbs(pts)*getScaleCmPerUnit()*getScaleCmPerUnit()/10000*100)/100; t.textContent=`${linked?`${linked.name||linked.id} · `:''}${room.name} · ${area} m²`; t.addEventListener('pointerdown',evt=>{ evt.stopPropagation(); appState.selectedRoomId=room.id; appState.selectedZoneId=linked?.id||''; appState.selectedWallId=''; appState.selectedOpeningId=''; renderLayoutEditor(); }); roomLayer.appendChild(t); });


    const flipSectionDirection = (axis) => {
      const cut = getSectionCut(axis);
      cut.dir = cut.dir === -1 ? 1 : -1;
      renderLayoutEditor();
    };

    const drawSectionGuide = (zone, axis) => {
      const zb = zoneBounds(zone);
      const isY = axis === 'y';
      const color = isY ? '#ff5b5b' : '#58c5ff';
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
        const rLabel = svgEl('text',{x:zb.maxX+18,y:rangeLimit-6,class:'section-range-label',fill:color}); rLabel.textContent='Límite Y'; guideLayer.appendChild(rLabel);
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
        const rLabel = svgEl('text',{x:rangeLimit+10,y:zb.minY-14,class:'section-range-label',fill:color}); rLabel.textContent='Límite X'; guideLayer.appendChild(rLabel);
      }
      const label = svgEl('text',{ x:isY ? (zb.minX + zb.maxX)/2 : linePos + 18, y:isY ? linePos - 10 : (zb.minY + zb.maxY)/2, fill:color, 'font-size':'11', 'font-weight':'800', 'text-anchor':'middle', style:'paint-order:stroke;stroke:#05101c;stroke-width:4px;stroke-linejoin:round;pointer-events:none;' });
      label.textContent = isY ? 'Línea de corte Y' : 'Línea de corte X';
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
      const path = svgEl('path',{d,class:'ortho-zone' + (appState.selectedZoneId===zone.id ? ' selected' : ''),fill:hexToRgba(zone.color || '#ffd84d', wallInsetOpacity),stroke:hexToRgba(zone.color || '#ffd84d', appState.editor.wallsVisible === false ? .98 : .46),'stroke-width':'1.4','data-zone-id':zone.id});
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
      const hasSub = zoneSub && zoneSub !== zoneTitle.toUpperCase();
      const badgeH = hasSub ? 42 : 28;
      const badgePos = findZoneBadgePlacement(zone, badgeW, badgeH);
      const badgeX = badgePos.x;
      const badgeY = badgePos.y;
      const badge = svgEl('g',{transform:`translate(${badgeX} ${badgeY})`,style: appState.editor.showLabels === false ? 'display:none;pointer-events:none' : 'pointer-events:none'});
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
      if(appState.selectedZoneId===zone.id && appState.editor.showLabels !== false){
        const centerLabel = svgEl('text',{x:c.x,y:c.y,class:'ortho-label','text-anchor':'middle',style:'opacity:.28;pointer-events:none'});
        centerLabel.textContent = zoneSub || zoneTitle;
        zoneLayer.appendChild(centerLabel);
      }
      if(appState.editor.showDims) drawZoneEdgeDimensions(edgeLayer, zone);

      if(appState.selectedZoneId===zone.id){
        if(appState.editor.sectionVisible){
          drawSectionGuide(zone, 'x');
          drawSectionGuide(zone, 'y');
        }
        const handleOffsetUnits = 15 / Math.max(.01, getScaleCmPerUnit());
        zone.pts.forEach((p, idx) => {
          const vn = getZoneOutwardVertexNormal(zone, idx);
          const hx = p.x + vn.x * handleOffsetUnits;
          const hy = p.y + vn.y * handleOffsetUnits;
          const selectedVertex = appState.selectedVertex.zoneId===zone.id && appState.selectedVertex.idx===idx;
          const hit = svgEl('circle',{cx:hx,cy:hy,r:'14',class:'vertex-hit'});
          const v = svgEl('circle',{cx:hx,cy:hy,r:selectedVertex?'8':'7',class:'vertex' + (selectedVertex ? ' selected' : '')});
          [hit, v].forEach(el => { el.addEventListener('pointerdown', e => startVertexDrag(e, zone.id, idx)); if(appState.editor.zonesLocked || isRackDistributionScreen() || isRoomLinkedZone(zone)) el.style.pointerEvents='none'; });
          vertexLayer.appendChild(hit);
          vertexLayer.appendChild(v);
        });
        zone.pts.forEach((p, idx) => {
          const q = zone.pts[(idx+1)%zone.pts.length];
          const en = getZoneOutwardEdgeNormal(zone, p, q);
          const mx = (p.x + q.x)/2, my = (p.y + q.y)/2;
          const hx = mx + en.x * handleOffsetUnits;
          const hy = my + en.y * handleOffsetUnits;
          const activeEdge = (appState.selectedEdge.zoneId===zone.id && appState.selectedEdge.a===idx);
          const edgeLineHit = svgEl('line',{x1:p.x + en.x*4,y1:p.y + en.y*4,x2:q.x + en.x*4,y2:q.y + en.y*4,class:'edge-hit','stroke-width':'20'});
          edgeLineHit.addEventListener('pointerdown', e => startEdgeDrag(e, zone.id, idx, (idx+1)%zone.pts.length)); if(appState.editor.zonesLocked || isRackDistributionScreen() || isRoomLinkedZone(zone)) edgeLineHit.style.pointerEvents='none';
          edgeLayer.appendChild(edgeLineHit);
          if(activeEdge) edgeLayer.appendChild(svgEl('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,class:'edge-guide'}));
          const hitBox = svgEl('circle',{cx:hx,cy:hy,r:14,class:'edge-hit'});
          const handle = svgEl('circle',{cx:hx,cy:hy,r:8,class:'edge-handle' + (activeEdge ? ' active' : '')});
          [hitBox, handle].forEach(el => { el.addEventListener('pointerdown', e => startEdgeDrag(e, zone.id, idx, (idx+1)%zone.pts.length)); if(appState.editor.zonesLocked || isRackDistributionScreen() || isRoomLinkedZone(zone)) el.style.pointerEvents='none'; });
          edgeLayer.appendChild(hitBox);
          edgeLayer.appendChild(handle);
          const edgeWall = getZoneEdgeWall(zone, idx);
          const isWallEdge = !!edgeWall?.enabled;
          const pillW = isWallEdge ? 72 : 86;
          const pillH = 22;
          const pillX = hx + en.x * 20 - pillW / 2;
          const pillY = hy + en.y * 20 - pillH / 2;
          const pill = svgEl('g',{class:'edge-wall-pill' + (isWallEdge ? ' active' : ''), transform:`translate(${pillX} ${pillY})`, style:'cursor:pointer'});
          pill.appendChild(svgEl('rect',{x:0,y:0,width:pillW,height:pillH,rx:'11',fill:isWallEdge?'rgba(255,216,77,.96)':'rgba(7,18,30,.94)',stroke:isWallEdge?'#fff2a6':'rgba(255,255,255,.26)','stroke-width':'1.2'}));
          const pillText = svgEl('text',{x:pillW/2,y:14,'text-anchor':'middle',style:`font-size:10px;font-weight:900;fill:${isWallEdge?'#1c1600':'#d9e9f8'};pointer-events:none`});
          pillText.textContent = isRoomLinkedZone(zone) ? 'MURO VINC.' : (isWallEdge ? 'MURO' : '+ MURO');
          pill.appendChild(pillText);
          pill.addEventListener('pointerdown', e => {
            if(isRackDistributionScreen() || isRoomLinkedZone(zone)) return;
            e.stopPropagation();
            appState.selectedZoneId = zone.id; appState.selectedRoomId = zone.linkedRoomId || '';
            appState.selectedEdge = { zoneId:zone.id, a:idx, b:(idx+1)%zone.pts.length };
            if(isWallEdge){ removeZoneEdgeWall(zone, idx); appState.selectedWallId = ''; }
            else { setZoneEdgeWall(zone, idx, { thickness:getZoneWallThickness(zone), height:Number(appState.layout?.meta?.defaultWallHeight || 290) || 290 }); appState.selectedWallId = zoneEdgeWallId(zone.id, idx); }
            syncZonePerimeterWalls();
            cleanupDetachedOpenings();
            persistActiveLayout();
            renderLayoutEditor();
          });
          edgeLayer.appendChild(pill);
        });
        if(appState.selectedEdge.zoneId===zone.id && appState.selectedEdge.a>=0){
          const a = zone.pts[appState.selectedEdge.a], b = zone.pts[appState.selectedEdge.b];
          edgeLayer.appendChild(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'edge-guide'}));
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
    const renderWallSlice = (wall, t0, t1, selected) => {
      if(t1 - t0 <= .002) return;
      const isAutoZoneEdge = !!wall.autoZoneEdge;
      const isSharedWall = !!wall.isSharedWall || (Array.isArray(wall.sharedRoomIds) && wall.sharedRoomIds.length > 1);
      const outerStroke = selected ? '#b98034' : (isSharedWall ? '#497c5c' : (isAutoZoneEdge ? '#8f7860' : '#7b6753'));
      const innerStroke = selected ? '#6d4815' : (isSharedWall ? '#2f5f48' : (isAutoZoneEdge ? '#8a6c49' : '#6a5543'));
      const slice = getWallSlicePolygon(wall, t0, t1, 1);
      if(!slice?.poly) return;
      const d = wallPolygonPath(slice.poly);
      const hit = svgEl('path',{ d, fill:'transparent', stroke:'transparent', 'stroke-width':'14', style:wall.autoZoneEdge?'cursor:pointer':'cursor:move' });
      const conflict=v117ConflictWalls.has(wall.id);
      const fill = svgEl('path',{ d, class:conflict?'v117-wall-conflict':'', fill:conflict?'rgba(255,96,96,.88)':(selected ? 'rgba(232,204,148,.96)' : (isSharedWall ? 'rgba(219,236,225,.98)' : 'rgba(232,223,209,.98)')), stroke:conflict?'#ff5d68':outerStroke, 'stroke-width':conflict?'2.5':(isSharedWall?'2.2':'1.6'), opacity:selected ? '.99' : '.99', style:wall.autoZoneEdge?'cursor:pointer':'cursor:move' });
      const accent = svgEl('line',{ x1:slice.a.x, y1:slice.a.y, x2:slice.b.x, y2:slice.b.y, stroke:innerStroke, 'stroke-width':'1.8', 'stroke-linecap':'round', opacity:'.92', style:'pointer-events:none' });
      const selectWall = evt => {
        if(isRackDistributionScreen() || appState.editor.mode !== 'select') return;
        if(!wall.autoZoneEdge){ startWallBodyDrag(evt,wall.id); return; }
        evt.stopPropagation();
        appState.selectedWallId = wall.id;
        appState.selectedOpeningId = '';
        appState.selectedRackLayoutId = '';
        renderLayoutEditor();
      };
      [fill, hit].forEach(el => el.addEventListener('pointerdown', selectWall));
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
      if(!Array.isArray(joint.poly) || joint.poly.length < 4) return;
      wallLayer.appendChild(svgEl('path',{
        d: wallPolygonPath(joint.poly),
        class:'layout-wall-corner-closure',
        fill: joint.selected ? 'rgba(232,204,148,.99)' : 'rgba(232,223,209,.99)',
        stroke: joint.selected ? 'rgba(185,128,52,.92)' : 'rgba(123,103,83,.72)',
        'stroke-width':'1',
        style:'pointer-events:none'
      }));
    });

    if(isStructureLayoutScreen() && appState.editor.mode==='select'){
      const sw=findWallById(appState.selectedWallId);
      if(sw && !sw.autoZoneEdge){
        [sw.startNodeId,sw.endNodeId].forEach((nodeId,idx)=>{ const node=getWallNode(nodeId); if(!node) return; const connected=wallsForNode(nodeId).length; const g=svgEl('g',{class:'wall-node-handle',style:'cursor:move'}); g.appendChild(svgEl('circle',{cx:node.x,cy:node.y,r:'10',fill:'rgba(5,21,32,.94)',stroke:idx===0?'#58c5ff':'#65f0a8','stroke-width':'2.4'})); g.appendChild(svgEl('circle',{cx:node.x,cy:node.y,r:'3.5',fill:idx===0?'#58c5ff':'#65f0a8'})); const tx=svgEl('text',{x:node.x+13,y:node.y-11,class:'wall-node-label'}); tx.textContent=`${node.id} · ${connected}`; g.appendChild(tx); g.addEventListener('pointerdown',e=>startWallNodeDrag(e,node.id)); guideLayer.appendChild(g); });
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
      const wallCardCenter = wall?.autoZoneEdge ? ptAdd(seg.center, normal, wallThickness / 2) : seg.center;
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

    (appState.layout.measurements||[]).forEach(measure=>{
      const a=measure.a,b=measure.b; if(!a||!b) return;
      const selected=appState.editor.selectedMeasurementId===measure.id;
      const line=svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,class:'layout-measure-line'+(selected?' selected':''),stroke:selected?'#ffd84d':'#58c5ff','stroke-width':selected?'2.6':'1.7','stroke-dasharray':'7 5',style:'cursor:pointer'});
      line.addEventListener('pointerdown',evt=>{evt.stopPropagation();appState.editor.selectedMeasurementId=measure.id;renderLayoutSvg(svg);renderLayoutInspector();}); measureLayer.appendChild(line);
      [a,b].forEach(pt=>measureLayer.appendChild(svgEl('circle',{cx:pt.x,cy:pt.y,r:'4',fill:selected?'#ffd84d':'#58c5ff'})));
      const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2}; const txt=svgEl('text',{x:mid.x,y:mid.y-10,class:'layout-measure-text','text-anchor':'middle'}); txt.textContent=formatDistanceCm(Math.hypot(b.x-a.x,b.y-a.y)); measureLayer.appendChild(txt);
    });
    if(appState.editor.mode==='measure' && appState.editor.measureDraft?.a){
      const a=appState.editor.measureDraft.a, b=appState.editor.measureDraft.cursor||a;
      guideLayer.appendChild(svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,stroke:'#ffd84d','stroke-width':'2','stroke-dasharray':'5 5'}));
      const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2}; const txt=svgEl('text',{x:mid.x,y:mid.y-12,class:'layout-measure-text active','text-anchor':'middle'}); txt.textContent=formatDistanceCm(Math.hypot(b.x-a.x,b.y-a.y)); guideLayer.appendChild(txt);
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
      r.rot = normalizeAngle(r.rot || 0);
      r.front = r.front || 'top';
      const fp = getRackFootprint(r.modelId, r.rot || 0);
      const baseW = fp.baseW, baseH = fp.baseH;
      const bboxW = fp.w || r.w || baseW, bboxH = fp.h || r.h || baseH;
      const cx = r.x + bboxW/2, cy = r.y + bboxH/2;
      const g = svgEl('g',{
        class:'layout-rack-wrap',
        transform:`translate(${cx} ${cy}) rotate(${r.rot || 0})`,
        'data-rack-id':r.id
      });
      const hit = svgEl('rect',{
        x:-(bboxW/2)-14,y:-(bboxH/2)-14,width:bboxW+28,height:bboxH+28,rx:'14',
        class:'ortho-rack-hit',style:isRackDistributionScreen()?'cursor:move':'cursor:default'
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
      if(isStructureLayoutScreen()) g.classList.add('workspace-locked');
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
      t.textContent = r.id;
      const baseHVal = Math.round(Number(r.baseHeight || 0));
      const levelBadge = svgEl('g',{transform:`translate(${-visualW/2 + 18} ${-visualH/2 + 10})`,style:'pointer-events:none'});
      levelBadge.appendChild(svgEl('rect',{x:-18,y:-12,width:36,height:18,rx:'9',fill:'rgba(8,18,30,.95)',stroke:'#56d2ff','stroke-width':'1'}));
      const levelTxt = svgEl('text',{x:0,y:1,class:'ortho-dim-text','text-anchor':'middle',style:'font-size:10px'});
      levelTxt.textContent = `N${getRackStackLevel(r)}`;
      levelBadge.appendChild(levelTxt);
      g.appendChild(levelBadge);
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
      g.addEventListener('pointerdown', e => startRackDrag(e, r.id));
      if(isRackDistributionScreen()) g.addEventListener('dblclick', e => { e.stopPropagation(); openStackMenuForRack(r.id, e); renderLayoutStackMenu(); renderLayoutInspector(); });
      rackLayer.appendChild(g);
    });


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
    if(selectedZone){
      drawSelectedZoneMeasurements(measureLayer, selectedZone);
    }
    if(selectedRack && selectedZone){
      drawSelectedRackMeasurements(measureLayer, selectedRack, selectedZone);
    }

    svg.addEventListener('pointerdown', handleLayoutCanvasDown);
    svg.addEventListener('pointermove', handleLayoutMove);
    svg.addEventListener('pointerup', stopEditorDrag);
    svg.addEventListener('pointerleave', stopEditorDrag);
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


  function renderSectionAxisSvg(svg, zone, racks, axis){
    if(!svg) return;
    const mountWidth = Math.max(320, Math.floor((svg.parentElement?.clientWidth || 520) - 4));
    const width = mountWidth, height = 260, groundY = 220;
    const padX = 24;
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.appendChild(svgEl('rect',{x:0,y:0,width,height,rx:18,fill:'rgba(6,16,28,.98)'}));
    svg.appendChild(svgEl('line',{x1:padX,y1:groundY,x2:width-padX,y2:groundY,class:'section-ground'}));
    if(!zone || !racks.length){
      const txt = svgEl('text',{x:width/2,y:height/2,class:'section-text','text-anchor':'middle'});
      txt.textContent = 'Selecciona una zona con racks para ver la sección.';
      svg.appendChild(txt);
      return;
    }
    const zb = zoneBounds(zone);
    const visible = sectionVisibleRacks(zone, racks, axis);
    const displayAxisKey = axis === 'x' ? 'y' : 'x';
    const displaySizeKey = axis === 'x' ? 'h' : 'w';
    const displayMin = axis === 'x' ? zb.minY : zb.minX;
    const displayMax = axis === 'x' ? zb.maxY : zb.minX + Math.max(1, zb.maxX-zb.minX);
    const displaySpan = Math.max(1, displayMax - displayMin);
    const innerWidth = Math.max(120, width - padX * 2);
    if(!visible.length){
      const txt = svgEl('text',{x:width/2,y:height/2,class:'section-text','text-anchor':'middle'});
      txt.textContent = 'No hay racks visibles desde esta línea de sección.';
      svg.appendChild(txt);
      return;
    }
    const maxTop = Math.max(...visible.map(r => (Number(r.baseHeight||0) + Number(r.rackHeight || rackModel(r.modelId).height || 238))), 240);
    const usableHeight = 160;
    const rackHeightScale = usableHeight / maxTop;
    const ordered = visible.slice().sort((a,b)=> ((a[displayAxisKey] || 0) - (b[displayAxisKey] || 0)) || ((a.baseHeight||0)-(b.baseHeight||0)) || (a.id > b.id ? 1 : -1));
    const sectionItems = ordered.map(r => {
      const model = rackModel(r.modelId);
      const pos = Number(r[displayAxisKey] || 0);
      const size = Math.max(8, Number(r[displaySizeKey] || 44));
      const rw = Math.max(18, Math.round((size / displaySpan) * innerWidth));
      const rackHeight = Math.max(60, Number(r.rackHeight || model.height || 238));
      const baseHeight = Math.max(0, Number(r.baseHeight || 0));
      const rh = Math.max(48, Math.round(rackHeight * rackHeightScale));
      const relStart = (pos - displayMin) / displaySpan;
      const rx = Math.round(padX + relStart * innerWidth);
      return { r, model, rw, rh, baseHeight, rackHeight, rx };
    });

    sectionItems.forEach(it => {
      const { r, model, rw, rh, baseHeight, rackHeight } = it;
      let rx = it.rx;
      rx = Math.max(padX, Math.min(width - padX - rw, rx));
      const ry = groundY - Math.round((baseHeight + rackHeight) * rackHeightScale);
      const sectionInset = 1;
      const rect = svgEl('rect',{x:rx+sectionInset,y:ry+sectionInset,width:Math.max(8,rw-sectionInset*2),height:Math.max(8,rh-sectionInset*2),rx:16,class:'section-rack' + (appState.selectedRackLayoutId===r.id ? ' selected' : '')});
      rect.setAttribute('filter','drop-shadow(0 10px 18px rgba(0,0,0,.25))');
      rect.addEventListener('pointerdown', evt => { evt.stopPropagation(); appState.selectedRackLayoutId = r.id; appState.selectedZoneId = r.zoneId; renderLayoutEditor(); });
      svg.appendChild(rect);
      const orangeInset = 14;
      const frontY = ry + 16;
      svg.appendChild(svgEl('line',{x1:rx+orangeInset,y1:frontY,x2:rx+rw-orangeInset,y2:frontY,stroke:'#ff9848','stroke-width':'4.5','stroke-linecap':'round'}));
      svg.appendChild(svgEl('path',{d:`M ${rx+rw/2} ${ry-6} l 10 0 l -5 -12 z`, fill:'#ff9848', opacity:'0.95'}));
      const levels = Math.max(2, parseInt(model.levels || 4, 10));
      for(let i=1;i<levels;i++){
        const ly = ry + (rh/levels) * i;
        svg.appendChild(svgEl('line',{x1:rx+8,y1:ly,x2:rx+rw-8,y2:ly,class:'section-deck'}));
      }
      const label = svgEl('text',{x:rx+rw/2,y:ry+rh/2+6,class:'section-text','text-anchor':'middle'});
      label.textContent = `${r.id} · N${getRackStackLevel(r)}`;
      svg.appendChild(label);
      const baseText = svgEl('text',{x:rx+rw/2,y:ry+rh+16,class:'section-text','text-anchor':'middle',style:'font-size:11px;fill:#9db8d4'});
      baseText.textContent = `Base ${formatDistanceShort(baseHeight)}`;
      svg.appendChild(baseText);
    });
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
            <div class="layout-section-title">Vista de sección</div>
            <div class="layout-section-sub">Revisa cortes X e Y lado a lado sin tapar el plano principal.</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div class="section-stack-chip">${zone ? zone.id : 'Sin zona'} • ${racks.length} racks</div>
            <button class="seg-btn" id="btnToggleSectionVisibility" type="button">Ocultar secciones</button>
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
    renderSectionAxisSvg($('#layoutSectionSvg'), zone, racks, 'x');
    renderSectionAxisSvg($('#layoutSectionSvgY'), zone, racks, 'y');
    $('#btnFlipSectionX').onclick = () => { const cut = getSectionCut('x', zone); cut.dir *= -1; persistActiveLayout(); renderLayoutEditor(); };
    $('#btnFlipSectionY').onclick = () => { const cut = getSectionCut('y', zone); cut.dir *= -1; persistActiveLayout(); renderLayoutEditor(); };
    $('#btnToggleSectionVisibility').onclick = () => { appState.editor.sectionVisible = false; renderLayoutEditor(); };
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
    $$('.seg-btn[data-emode]').forEach(btn => btn.onclick = () => { const nextMode = btn.dataset.emode; if(nextMode === 'rack' && !isRackDistributionScreen()) return; if(['zone','wall','opening','door','measure'].includes(nextMode) && isRackDistributionScreen()) return; markLayoutManualInteraction(); if(nextMode==='select') cancelLayoutDrawing(); else { appState.editor.mode = nextMode; if(nextMode!=='wall'){ appState.editor.pendingWallPoint=null; appState.editor.wallCursor=null; appState.editor.wallChainNodeIds=[]; appState.editor.wallChainStartNodeId=''; } renderLayoutEditor(); } });
    $$('[data-layout-tag-action]').forEach(btn => btn.onclick = () => {
      markLayoutManualInteraction();
      const action = btn.getAttribute('data-layout-tag-action');
      if(action === 'toggle-select') appState.editor.mode = appState.editor.mode === 'select' ? 'navigate' : 'select';
      else if(action === 'toggle-nav') appState.editor.mode = appState.editor.mode === 'navigate' ? 'select' : 'navigate';
      else if(action === 'toggle-lock-zones') appState.editor.zonesLocked = !appState.editor.zonesLocked;
      else if(action === 'toggle-dims') appState.editor.showDims = !appState.editor.showDims;
      else if(action === 'toggle-snap') { appState.editor.snapEnabled = !isSnapEnabled(); clearRackSnapPreview(); }
      else if(action === 'toggle-section') appState.editor.sectionVisible = !appState.editor.sectionVisible;
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
    if($('#btnZonePlus')) $('#btnZonePlus').onclick = () => { if(!isStructureLayoutScreen()) return; markLayoutManualInteraction(); appState.editor.mode = 'zone'; appState.editor.pendingWallPoint = null; renderLayoutEditor(); };
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
    if($('#btnPresentationMode')) $('#btnPresentationMode').onclick = () => { appState.editor.presentationMode = !appState.editor.presentationMode; renderLayoutEditor(); };
    if($('#btnExitPresentation')) $('#btnExitPresentation').onclick = () => { appState.editor.presentationMode = false; renderLayoutEditor(); };
    $$('[data-layout-context-action]').forEach(btn=>btn.onclick = () => {
      const action = btn.getAttribute('data-layout-context-action');
      if(action === 'ctx-duplicate-rack') return duplicateSelectedRack();
      if(action === 'ctx-open-3d') return (persistActiveLayout(), openNavigable3DModal(appState.selectedProduct || null));
      if(action === 'ctx-delete') return deleteLayoutSelection();
      if(action === 'ctx-duplicate-zone') return duplicateSelectedZone();
      if(action === 'ctx-mode-wall'){ appState.editor.mode = 'wall'; appState.editor.pendingWallPoint = null; return renderLayoutEditor(); }
      if(action === 'ctx-add-door'){ const sw=findWallById(appState.selectedWallId); if(!sw) return; createOpeningOnWall(sw.id, 'door'); persistActiveLayout(); return renderLayoutEditor(); }
      if(action === 'ctx-add-window'){ const sw=findWallById(appState.selectedWallId); if(!sw) return; createOpeningOnWall(sw.id, 'window'); persistActiveLayout(); return renderLayoutEditor(); }
      if(action === 'ctx-duplicate-opening'){ const op=findOpeningById(appState.selectedOpeningId); if(!op) return; duplicateOpening(op); persistActiveLayout(); return renderLayoutEditor(); }
    });
    if($('#btnOpenLayout3D')) $('#btnOpenLayout3D').onclick = () => { persistActiveLayout(); openNavigable3DModal(appState.selectedProduct || null); };
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

  function handleLayoutCanvasDown(e){
    const svg = e.currentTarget; const raw = svgPoint(e, svg); const p = { x:snapGrid(raw.x), y:snapGrid(raw.y) };
    if(isRackDistributionScreen() && ['zone','wall','opening','door','measure'].includes(appState.editor.mode)) appState.editor.mode = 'select';
    if(isStructureLayoutScreen() && appState.editor.mode === 'rack') appState.editor.mode = 'select';
    const target = e.target;
    const isPanSurface = target === svg || (target && target.classList && target.classList.contains('layout-pan-surface'));
    if(appState.editor.dragging?.type === 'pan-layout') return;
    if(isPanSurface && (appState.editor.mode === 'navigate' || e.shiftKey || e.button === 1)){
      startLayoutPan(e);
      return;
    }
    if(appState.editor.mode === 'select' && isPanSurface){
      closeStackMenu(); appState.selectedOpeningId='';
      if(isStructureLayoutScreen()){ if(!(e.ctrlKey||e.metaKey))v117SetSelectedWallIds([]); appState.selectedWallId=''; }
      startDragSelection(raw,!!(e.ctrlKey||e.metaKey)); renderLayoutSvg(svg); renderLayoutInspector(); renderLayoutSection(); return;
    }
    if(appState.editor.mode === 'wall' && isStructureLayoutScreen()){
      const smart=snapWallPointSmart(raw,{origin:appState.editor.pendingWallPoint,shiftKey:e.shiftKey});
      if(!appState.editor.pendingWallPoint){
        let node=smart.nodeId?getWallNode(smart.nodeId):findOrCreateWallNode(smart);
        appState.editor.pendingWallPoint = { x:node.x, y:node.y, nodeId:node.id };
        appState.editor.wallCursor = {...smart,x:node.x+100,y:node.y};
        appState.editor.wallChainNodeIds=[node.id]; appState.editor.wallChainStartNodeId=node.id;
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
      const smart=snapWallPointSmart(raw,{origin:appState.editor.measureDraft?.a,shiftKey:e.shiftKey});
      if(!appState.editor.measureDraft?.a){ appState.editor.measureDraft={a:{x:smart.x,y:smart.y},cursor:{x:smart.x,y:smart.y}}; renderLayoutSvg(svg); }
      else { const a=appState.editor.measureDraft.a; const b={x:smart.x,y:smart.y}; if(Math.hypot(b.x-a.x,b.y-a.y)>1){ const m={id:nextMeasurementId(),a,b}; appState.layout.measurements.push(m); appState.editor.selectedMeasurementId=m.id; persistActiveLayout(); } appState.editor.measureDraft=null; renderLayoutEditor(); }
      return;
    }
    if(appState.editor.mode === 'zone' && isStructureLayoutScreen()){
      const id = nextZoneId();
      const newZone={ id, name:'Zona ' + id, color:getNextZoneColor(getBranchColor(getActiveLayoutBranchIndex())), wallThickness:14, pts:[{x:p.x-60,y:p.y-40},{x:p.x+60,y:p.y-40},{x:p.x+60,y:p.y+40},{x:p.x-60,y:p.y+40}] };
      const collision=findZoneOverlap('',newZone.pts); if(collision){showToast(`No se puede crear aquí: se superpondría con ${collision.name||collision.id}.`,'warning',2400);return;}
      appState.layout.zones.push(newZone); normalizeZoneAndRackIds(); persistActiveLayout();
      appState.selectedZoneId = id; appState.editor.mode = 'select'; renderLayoutEditor(); return;
    }
    if(appState.editor.mode === 'rack' && isRackDistributionScreen()){
      const zone = appState.layout.zones.find(z => pointInPoly(p, z.pts)) || findZoneById(appState.selectedZoneId) || appState.layout.zones[0];
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

  function insertVertexOnSelectedEdge(){
    const sel = appState.selectedEdge; const zone = findZoneById(sel.zoneId); if(!zone || sel.a<0) return;
    const a = zone.pts[sel.a], b = zone.pts[sel.b];
    zone.pts.splice(sel.b, 0, { x:(a.x+b.x)/2, y:(a.y+b.y)/2 });
    appState.selectedVertex = { zoneId:zone.id, idx:sel.b };
    persistActiveLayout(); renderLayoutEditor();
  }

  function removeSelectedVertex(){
    const sel = appState.selectedVertex || { zoneId:'', idx:-1 };
    const zone = findZoneById(sel.zoneId);
    if(!zone || sel.idx < 0 || !Array.isArray(zone.pts) || zone.pts.length <= 3) return;
    const candidate=clone(zone.pts); candidate.splice(sel.idx,1); const collision=findZoneOverlap(zone.id,candidate);
    if(collision){setZoneCollisionPreview(zone.id,collision,candidate);showToast(`No se puede quitar el vértice: la zona se superpondría con ${collision.name||collision.id}.`,'warning',2400);renderLayoutEditor();return;}
    zone.pts=candidate;
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
    if(!isStructureLayoutScreen() || appState.editor.mode !== 'select' || appState.editor.zonesLocked) return;
    e.stopPropagation();
    const svg = $('#layoutSvg'); const p = svgPoint(e, svg);
    appState.selectedZoneId = zoneId; appState.selectedRackLayoutId = ''; appState.selectedWallId = ''; appState.selectedOpeningId = '';
    closeStackMenu();
    const zone = findZoneById(zoneId);
    if(!zone) return;
    appState.selectedRoomId = zone.linkedRoomId || '';
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
    appState.editor.dragging = { type:'zone', zoneId, zoneIndex, start:p, original: clone(zone.pts), lastValid:clone(zone.pts), blockedByZoneCollision:false };
    renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector();
  }
  function startVertexDrag(e, zoneId, idx){
    if(!isStructureLayoutScreen() || appState.editor.mode !== 'select' || appState.editor.zonesLocked) return;
    e.stopPropagation();
    const svg = $('#layoutSvg'); const p = svgPoint(e, svg);
    const zone = findZoneById(zoneId);
    if(!zone) return;
    if(isRoomLinkedZone(zone)){ showToast('La geometría está vinculada al recinto. Edita sus muros.', 'warning', 2400); return; }
    const zoneIndex = (appState.layout?.zones || []).findIndex(z => z === zone);
    appState.selectedZoneId = zoneId; appState.selectedVertex = { zoneId, idx }; appState.selectedRackLayoutId = ''; appState.selectedWallId = ''; appState.selectedOpeningId = '';
    closeStackMenu();
    appState.editor.dragging = { type:'vertex', zoneId, zoneIndex, idx, start:p, original: clone(zone.pts[idx]) };
    renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector();
  }
  function startEdgeDrag(e, zoneId, a, b){
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
    appState.editor.dragging = { type:'edge', zoneId, zoneIndex, a, b, start:p, originalA: clone(zone.pts[a]), originalB: clone(zone.pts[b]) };
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

  function startRackDrag(e, rackId){
    if(!isRackDistributionScreen() || appState.editor.mode !== 'select') return;
    e.stopPropagation();
    const rack = findRackById(rackId);
    if(!rack) return;
    closeStackMenu();
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
      appState.editor.dragging={type:'rack-group',rackIds:dragIds,start:p,originals};
    }else appState.editor.dragging = { type:'rack', rackId, start:p, original: { x:rack.x, y:rack.y, cx, cy, zoneId:rack.zoneId } };
    renderLayoutSvg(svg); renderLayoutSection(); renderLayoutInspector();
  }

  function handleLayoutMove(e){
    const svg = $('#layoutSvg'); const p = svgPoint(e, svg);
    const d = appState.editor.dragging;
    if(!d && !appState.editor?.dragSelect?.active){
      if(isStructureLayoutScreen() && appState.editor.mode==='wall' && appState.editor.pendingWallPoint){ appState.editor.wallCursor=snapWallPointSmart(p,{origin:appState.editor.pendingWallPoint,shiftKey:e.shiftKey}); renderLayoutSvg(svg); return; }
      if(isStructureLayoutScreen() && appState.editor.mode==='measure' && appState.editor.measureDraft?.a){ appState.editor.measureDraft.cursor=snapWallPointSmart(p,{origin:appState.editor.measureDraft.a,shiftKey:e.shiftKey}); renderLayoutSvg(svg); return; }
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
    if(d.type === 'zone'){
      const zone = dragZoneFromState(d);
      if(!zone) return;
      const snapped=snapZoneTranslation(zone,d.original,p.x-d.start.x,p.y-d.start.y);
      const candidate=d.original.map(pt=>({x:pt.x+snapped.dx,y:pt.y+snapped.dy}));
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
      const lockAxis = e.shiftKey ? (Math.abs(p.x - d.start.x) >= Math.abs(p.y - d.start.y) ? 'x' : 'y') : null;
      const snapped = snapPointAdvanced(p, { zoneId:d.zoneId, keepAxis:lockAxis, origin:d.original }); appState.editor.geometrySnapPreview={point:{x:snapped.x,y:snapped.y},label:snapped.label||'Snap',kind:snapped.type||'point'}; const candidate=clone(zone.pts); candidate[d.idx]={x:snapped.x,y:snapped.y}; const collision=findZoneOverlap(zone.id,candidate);
      clearRackSnapPreview();
      if(collision){ d.blockedByZoneCollision=true; setZoneCollisionPreview(zone.id,collision,candidate); } else { zone.pts=candidate; d.blockedByZoneCollision=false; clearZoneCollisionPreview(); pickNearestEdge(snapped); } renderLayoutSvg(svg); renderLayoutSection();
    } else if(d.type === 'edge'){
      const zone = dragZoneFromState(d);
      if(!zone) return;
      const a0 = d.originalA, b0 = d.originalB; const candidate=clone(zone.pts);
      const horizontal = Math.abs(a0.y - b0.y) <= Math.abs(a0.x - b0.x);
      if(horizontal){ const base={x:(a0.x+b0.x)/2,y:a0.y+dy}; const snapped=snapPointAdvanced(base,{zoneId:d.zoneId,keepAxis:'y',origin:{x:base.x,y:a0.y}}); candidate[d.a].y=snapped.y;candidate[d.b].y=snapped.y; }
      else { const base={x:a0.x+dx,y:(a0.y+b0.y)/2}; const snapped=snapPointAdvanced(base,{zoneId:d.zoneId,keepAxis:'x',origin:{x:a0.x,y:base.y}}); candidate[d.a].x=snapped.x;candidate[d.b].x=snapped.x; }
      const collision=findZoneOverlap(zone.id,candidate); clearRackSnapPreview();
      if(collision){d.blockedByZoneCollision=true;setZoneCollisionPreview(zone.id,collision,candidate);}else{zone.pts=candidate;d.blockedByZoneCollision=false;clearZoneCollisionPreview();}
      appState.selectedEdge = { zoneId:d.zoneId, a:d.a, b:d.b }; renderLayoutSvg(svg); renderLayoutSection();
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
    } else if(d.type === 'rack-group'){
      const rawDX=p.x-d.start.x, rawDY=p.y-d.start.y;
      (d.rackIds||[]).forEach(id=>{ const rack=findRackById(id), orig=d.originals?.[id]; if(!rack||!orig)return; rack.x=snapGrid(orig.x+rawDX); rack.y=snapGrid(orig.y+rawDY); const host=findZoneById(orig.zoneId)||findZoneById(rack.zoneId); if(host){rack.zoneId=host.id; if(!rackFullyInsideZone(rack,host)){rack.x=orig.x;rack.y=orig.y;rack.zoneId=orig.zoneId;}} });
      clearRackSnapPreview(); renderLayoutSvg(svg); renderLayoutSection();
    } else if(d.type === 'rack'){
      const rack = findRackById(d.rackId);
      const rawDX = p.x - d.start.x;
      const rawDY = p.y - d.start.y;
      const ncx = d.original.cx + rawDX;
      const ncy = d.original.cy + rawDY;
      rack.x = ncx - rack.w/2;
      rack.y = ncy - rack.h/2;
      const center = { x:ncx, y:ncy };
      const currentZone = findZoneById((d.original && d.original.zoneId) || rack.zoneId);
      const targetZone = (appState.layout.zones||[]).find(z => pointInPoly(center, z.pts) && rackCorners(rack).every(pt => pointInPoly(pt, z.pts) || pointNearPolygonEdge(pt, z.pts, 1)));
      const host = targetZone || currentZone || nearestZoneForPoint(center);
      if(host){ keepRackSnapped(rack, host); rack.zoneId = host.id; }
      if(host && !rackFullyInsideZone(rack, host) && d.original){ rack.x = d.original.x; rack.y = d.original.y; rack.zoneId = d.original.zoneId; }
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
    if(d && d.type==='section-guide'){
      const zone = findZoneById(d.zoneId) || appState.layout.zones[0];
      if(zone && d.source === 'arrow' && !d.moved){
        const cut = getSectionCut(d.axis, zone);
        cut.dir *= -1;
      }
    }
    if(d && d.type==='rack-group'){
      normalizeZoneAndRackIds(); v117RunValidation({quiet:true});
    }
    if(d && d.type==='rack'){
      const rack = findRackById(d.rackId);
      if(rack){
        const center = { x:rack.x + rack.w/2, y:rack.y + rack.h/2 };
        const originalZone = findZoneById((d.original && d.original.zoneId) || rack.zoneId) || findZoneById(rack.zoneId);
        const targetZone = (appState.layout.zones||[]).find(z=>pointInPoly(center, z.pts));
        const host = targetZone || originalZone || nearestZoneForPoint(center) || findZoneById(rack.zoneId);
        if(host){
          const previousZoneId = (d.original && d.original.zoneId) || rack.zoneId;
          if(targetZone && previousZoneId !== host.id) assignRackToZone(rack, host.id);
          else rack.zoneId = host.id;
          keepRackSnapped(rack, host);
          if(!rackFullyInsideZone(rack, host) && d.original){ rack.x = d.original.x; rack.y = d.original.y; rack.zoneId = previousZoneId; }
        }
      }
      normalizeZoneAndRackIds(); v117RunValidation({quiet:true});
    }
    if(d && d.type==='zone'){ normalizeZoneAndRackIds(); }
    if(d?.blockedByZoneCollision) showToast('Movimiento limitado: las zonas no pueden superponerse.','warning',2200);
    if(d && d.type==='room-zone'){
      if(typeof v128FinalizeRoomMove === 'function') v128FinalizeRoomMove(d.roomId,{targetRoomId:d.mergeCandidate?.targetRoomId||'',notify:true});
      else { if(d.mergeCandidate && mergeRoomSharedWall(d.mergeCandidate)) showToast('Muros coincidentes unidas como muro compartido.', 'success', 2400); v117ResolveWallIntersections(); v117RefreshRooms(); syncRoomLinkedZones(); }
      normalizeZoneAndRackIds(); appState.editor.roomMovePreview=null;
    }
    if(d && (d.type==='wall-node' || d.type==='wall-body' || d.type==='wall-group')){ syncManualWallsFromNodes(); v117ResolveWallIntersections(); if(typeof v128FuseAllTouchingRooms==='function')v128FuseAllTouchingRooms(); v117RefreshRooms(); syncRoomLinkedZones(); if(typeof v128RebuildSharedWallRegistry==='function')v128RebuildSharedWallRegistry(); ensureOpeningAttachmentOffsets(); appState.editor.wallMergePreview=null; }
    clearRackSnapPreview();
    clearZoneCollisionPreview();
    if(appState.editor) appState.editor.geometrySnapPreview=null;
    appState.editor.dragging = null;
    persistActiveLayout();
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
                        <input id="sideRackRot" type="number" step="1" value="${Math.round(Number(rack.rot || 0))}">
                      </div>
                      <div class="mini-field">
                        <label class="tiny muted">Nivel apilado</label>
                        <input id="sideRackStackLevel" type="number" min="0" step="1" value="${getRackStackLevel(rack)}">
                      </div>
                      <div class="mini-field">
                        <label class="tiny muted">Altura base</label>
                        <input id="sideRackBaseH" type="number" min="0" step="10" value="${Math.round(Number(rack.baseHeight || 0))}" disabled>
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
          <div class="tiny muted">Selecciona una arista y agrega el vano directamente. Si todavía no es muro, se convierte automáticamente.</div>
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
    if($('#sideRackModel')) $('#sideRackModel').onchange = e => { if(!rack) return; const oldDefault = rackModel(rack.modelId).height || 238; const prevHeight = Number(rack.rackHeight || oldDefault); rack.modelId = e.target.value; const newDefault = rackModel(rack.modelId).height || 238; if(!Number.isFinite(prevHeight) || Math.abs(prevHeight - oldDefault) < 1) rack.rackHeight = newDefault; syncRackFootprint(rack, true); const host=findZoneById(rack.zoneId); if(host){ keepRackSnapped(rack, host); } persistActiveLayout(); renderLayoutEditor(); };
    initSideRackModelPicker(rack);
    if($('#sideRackRot')) {
      const applySideRotation = (value) => {
        if(!rack) return;
        rack.rot = normalizeAngle(Number(value || 0) || 0);
        syncRackFootprint(rack, true);
        const host = findZoneById(rack.zoneId);
        if(host) keepRackSnapped(rack, host);
        persistActiveLayout();
        renderLayoutEditor();
      };
      $('#sideRackRot').oninput = e => { if(!rack) return; rack.rot = Number(e.target.value || 0) || 0; };
      $('#sideRackRot').onchange = e => applySideRotation(e.target.value);
      $('#sideRackRot').onblur = e => applySideRotation(e.target.value);
    }
    if($('#insRackBaseH')) {
      $('#insRackBaseH').oninput = e => { rack.baseHeight = Math.max(0, Number(e.target.value || 0) || 0); };
      $('#insRackBaseH').onchange = e => { rack.baseHeight = Math.max(0, Number(e.target.value || 0) || 0); persistActiveLayout(); renderLayoutEditor(); };
    }
    if($('#sideRackBaseH')) {
      $('#sideRackBaseH').oninput = e => { if(!rack) return; rack.baseHeight = Math.max(0, Number(e.target.value || 0) || 0); };
      $('#sideRackBaseH').onchange = e => { if(!rack) return; rack.baseHeight = Math.max(0, Number(e.target.value || 0) || 0); persistActiveLayout(); renderLayoutEditor(); };
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
    $$('.quick-angle').forEach(btn => btn.onclick = () => { if(!rack) return; rack.rot = normalizeAngle((Number(rack.rot || 0) || 0) + (Number(btn.dataset.angle||0)||0)); syncRackFootprint(rack, true); const host=findZoneById(rack.zoneId); if(host){ keepRackSnapped(rack, host); } persistActiveLayout(); renderLayoutEditor(); });
    $$('.quick-zone-angle').forEach(btn => btn.onclick = () => { const zoneId = appState.selectedZoneId; if(!zoneId) return; rotateZoneWithContents(zoneId, Number(btn.dataset.angle || 0) || 0); });
    $$('.rotate-step').forEach(btn => btn.onclick = () => { if(!rack) return; rack.rot = normalizeAngle((Number(rack.rot || 0) || 0) + (Number(btn.dataset.step || 0) || 0)); syncRackFootprint(rack, true); const host=findZoneById(rack.zoneId); if(host){ keepRackSnapped(rack, host); } persistActiveLayout(); renderLayoutEditor(); });
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

