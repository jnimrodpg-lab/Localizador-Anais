/* WMS_V128_DYNAMIC_TOPOLOGY */
  // v128 acumulativa — muros compartidas reversibles, fusión parcial, topología multizona y adyacencias.
  function v128EnsureTopologyState(layout=appState.layout){
    if(!layout || typeof layout !== 'object') return layout;
    if(!Array.isArray(layout.sharedWalls)) layout.sharedWalls=[];
    if(!layout.meta || typeof layout.meta !== 'object') layout.meta={};
    if(!Number.isFinite(Number(layout.meta.sharedWallSnapTolerance))) layout.meta.sharedWallSnapTolerance=2.2;
    if(!Number.isFinite(Number(layout.meta.sharedWallContactSnap))) layout.meta.sharedWallContactSnap=18;
    return layout;
  }
  function v128RoomUsageForWalls(layout=appState.layout){
    v128EnsureTopologyState(layout);
    const usage=new Map();
    (layout?.rooms||[]).filter(r=>!r?.obsolete).forEach(room=>{
      roomWallEdges(room,layout).forEach(edge=>{
        if(!edge.wall?.id) return;
        if(!usage.has(edge.wall.id)) usage.set(edge.wall.id,{wallId:edge.wall.id,roomIds:[],zoneIds:[]});
        const entry=usage.get(edge.wall.id);
        if(!entry.roomIds.includes(room.id)) entry.roomIds.push(room.id);
        const zone=getRoomLinkedZone(room,layout);
        if(zone?.id && !entry.zoneIds.includes(zone.id)) entry.zoneIds.push(zone.id);
      });
    });
    return usage;
  }
  function v128RebuildSharedWallRegistry(layout=appState.layout){
    if(!layout) return [];
    ensureWallTopology(layout); v128EnsureTopologyState(layout);
    const usage=v128RoomUsageForWalls(layout), shared=[];
    (layout.walls||[]).forEach(w=>{ if(!w?.autoZoneEdge){ delete w.sharedRoomIds; delete w.sharedZoneIds; w.isSharedWall=false; } });
    usage.forEach(entry=>{
      if(entry.roomIds.length<2) return;
      const wall=(layout.walls||[]).find(w=>w.id===entry.wallId); if(!wall) return;
      wall.isSharedWall=true; wall.sharedRoomIds=[...entry.roomIds]; wall.sharedZoneIds=[...entry.zoneIds];
      const openingIds=(layout.openings||[]).filter(o=>o.wallId===wall.id).map(o=>o.id);
      (layout.openings||[]).filter(o=>o.wallId===wall.id).forEach(o=>{ if(!o.ownerRoomId) o.ownerRoomId=entry.roomIds[0]||''; });
      shared.push({id:`SW-${wall.id}`,wallId:wall.id,roomIds:[...entry.roomIds],zoneIds:[...entry.zoneIds],openingIds,length:Number(wallLength(wall)||0)});
    });
    layout.sharedWalls=shared;
    const adjacency=new Map();
    shared.forEach(link=>{
      for(let i=0;i<link.zoneIds.length;i++) for(let j=i+1;j<link.zoneIds.length;j++){
        const a=link.zoneIds[i],b=link.zoneIds[j]; if(!a||!b||a===b) continue;
        const key=[a,b].sort().join('|'); adjacency.set(key,(adjacency.get(key)||0)+Number(link.length||0));
      }
    });
    (layout.zones||[]).forEach(z=>{ z.adjacentZones=[]; });
    adjacency.forEach((len,key)=>{ const [a,b]=key.split('|'),za=(layout.zones||[]).find(z=>z.id===a),zb=(layout.zones||[]).find(z=>z.id===b); if(za)za.adjacentZones.push({zoneId:b,length:len});if(zb)zb.adjacentZones.push({zoneId:a,length:len}); });
    return shared;
  }
  function v128WallSharedUsage(wallId,layout=appState.layout){ return v128RoomUsageForWalls(layout).get(wallId)||null; }
  function v128RoomHasSharedTopology(roomOrId,layout=appState.layout){
    const room=typeof roomOrId==='string'?findRoomById(roomOrId,layout):roomOrId; if(!room) return false;
    const usage=v128RoomUsageForWalls(layout); return roomWallEdges(room,layout).some(e=>e.wall?.id && (usage.get(e.wall.id)?.roomIds.length||0)>1);
  }
  function v128DetachRoomTopology(roomOrId,{notify=false}={}){
    ensureWallTopology(); v128RebuildSharedWallRegistry();
    const room=typeof roomOrId==='string'?findRoomById(roomOrId):roomOrId; if(!room||room.obsolete) return false;
    const usage=v128RoomUsageForWalls(), edges=roomWallEdges(room); const sharedEdges=edges.filter(e=>e.wall?.id && (usage.get(e.wall.id)?.roomIds.length||0)>1);
    if(!sharedEdges.length) return false;
    const oldIds=[...(room.nodeIds||[])], nodeMap=new Map();
    oldIds.forEach(oldId=>{ const old=getWallNode(oldId); if(!old)return; const n={id:nextWallNodeId(),x:Number(old.x||0),y:Number(old.y||0)}; appState.layout.wallNodes.push(n); nodeMap.set(oldId,n.id); });
    const sharedWallIds=new Set(sharedEdges.map(e=>e.wall.id));
    const perimeterWallIds=new Set(edges.map(e=>e.wall?.id).filter(Boolean));
    // Los muros exclusivos siguen siendo el mismo objeto y solo cambian de nodos; los compartidos se clonan para recuperar el lado móvil.
    (appState.layout.walls||[]).forEach(w=>{
      if(w.autoZoneEdge||!perimeterWallIds.has(w.id)||sharedWallIds.has(w.id)) return;
      if(nodeMap.has(w.startNodeId)) w.startNodeId=nodeMap.get(w.startNodeId);
      if(nodeMap.has(w.endNodeId)) w.endNodeId=nodeMap.get(w.endNodeId);
    });
    sharedEdges.forEach(edge=>{
      const src=edge.wall; if(!src) return;
      const cloneWall={...clone(src),id:nextWallId(),startNodeId:nodeMap.get(src.startNodeId)||src.startNodeId,endNodeId:nodeMap.get(src.endNodeId)||src.endNodeId,isSharedWall:false,sharedRoomIds:[],sharedZoneIds:[],detachedFromWallId:src.id};
      delete cloneWall.sharedRoomIds; delete cloneWall.sharedZoneIds;
      appState.layout.walls.push(cloneWall);
      // Un opening pertenece a un solo lado. Si su propietario era el recinto que se mueve, pasa al muro reconstruido.
      (appState.layout.openings||[]).forEach(o=>{ if(o.wallId===src.id && o.ownerRoomId===room.id) o.wallId=cloneWall.id; });
    });
    room.nodeIds=oldIds.map(id=>nodeMap.get(id)||id);
    syncManualWallsFromNodes(); syncRoomLinkedZones(); ensureOpeningAttachmentOffsets(); pruneOrphanWallNodes();
    v128RebuildSharedWallRegistry();
    if(notify) showToast('Muro compartido separado temporalmente para mover la zona.','success',1500);
    return true;
  }
  function v128PointNear(a,b,tol=1.25){ return !!a&&!!b&&Math.hypot(Number(a.x||0)-Number(b.x||0),Number(a.y||0)-Number(b.y||0))<=tol; }
  function v128SegmentOverlapInfo(a,b,c,d,{lineTol=1.8,angleDeg=5}={}){
    const ax=b.x-a.x,ay=b.y-a.y,bx=d.x-c.x,by=d.y-c.y,la=Math.hypot(ax,ay)||1,lb=Math.hypot(bx,by)||1;
    const ux=ax/la,uy=ay/la,vx=bx/lb,vy=by/lb; if(Math.abs(ux*vx+uy*vy)<Math.cos(angleDeg*Math.PI/180)) return null;
    const nx=-uy,ny=ux; const dc=Math.abs((c.x-a.x)*nx+(c.y-a.y)*ny),dd=Math.abs((d.x-a.x)*nx+(d.y-a.y)*ny); if(Math.max(dc,dd)>lineTol) return null;
    const tc=(c.x-a.x)*ux+(c.y-a.y)*uy, td=(d.x-a.x)*ux+(d.y-a.y)*uy; const lo=Math.max(0,Math.min(tc,td)),hi=Math.min(la,Math.max(tc,td));
    const overlap=Math.max(0,hi-lo); if(overlap<=Math.max(2,lineTol*1.5)) return null;
    return {overlap,lengthA:la,lengthB:lb,start:{x:a.x+ux*lo,y:a.y+uy*lo},end:{x:a.x+ux*hi,y:a.y+uy*hi},u:{x:ux,y:uy},n:{x:nx,y:ny}};
  }
  function v128FindRoomContactSnap(room,originalNodes,dx,dy){
    if(!room||!originalNodes) return null;
    const threshold=Math.max(7,Math.min(28,Number(appState.layout?.meta?.sharedWallContactSnap||18)||18));
    const moving=roomWallEdges(room).map(e=>{const a=originalNodes[e.aId],b=originalNodes[e.bId];return a&&b?{...e,a:{x:a.x+dx,y:a.y+dy},b:{x:b.x+dx,y:b.y+dy}}:null;}).filter(Boolean);
    let best=null;
    (appState.layout.rooms||[]).filter(r=>!r.obsolete&&r.id!==room.id).forEach(targetRoom=>roomWallEdges(targetRoom).forEach(t=>{
      moving.forEach(m=>{
        const mlx=m.b.x-m.a.x,mly=m.b.y-m.a.y,ml=Math.hypot(mlx,mly)||1,tlx=t.b.x-t.a.x,tly=t.b.y-t.a.y,tl=Math.hypot(tlx,tly)||1;
        const ux=tlx/tl,uy=tly/tl,nx=-uy,ny=ux; if(Math.abs((mlx/ml)*ux+(mly/ml)*uy)<Math.cos(6*Math.PI/180)) return;
        const signed=((m.a.x-t.a.x)*nx+(m.a.y-t.a.y)*ny + (m.b.x-t.a.x)*nx+(m.b.y-t.a.y)*ny)/2;
        if(Math.abs(signed)>threshold) return;
        const pdx=-nx*signed,pdy=-ny*signed,aa={x:m.a.x+pdx,y:m.a.y+pdy},bb={x:m.b.x+pdx,y:m.b.y+pdy};
        const info=v128SegmentOverlapInfo(aa,bb,t.a,t.b,{lineTol:1.3,angleDeg:6}); if(!info) return;
        const endpointDistances=[Math.hypot(aa.x-t.a.x,aa.y-t.a.y),Math.hypot(aa.x-t.b.x,aa.y-t.b.y),Math.hypot(bb.x-t.a.x,bb.y-t.a.y),Math.hypot(bb.x-t.b.x,bb.y-t.b.y)];
        const endpointBonus=Math.min(...endpointDistances)<threshold*.8?-2:0; const score=Math.abs(signed)-Math.min(info.overlap,80)*.012+endpointBonus;
        if(!best||score<best.score) best={score,roomId:room.id,targetRoomId:targetRoom.id,movingWallId:m.wall?.id||'',targetWallId:t.wall?.id||'',dx:dx+pdx,dy:dy+pdy,overlap:info.overlap,point:{x:(info.start.x+info.end.x)/2,y:(info.start.y+info.end.y)/2},label:info.overlap>=Math.min(ml,tl)*.92?'Muro coincidente':'Tramo compartido'};
      });
    }));
    return best;
  }
  function v128WallGeometricallyEqual(wa,wb,tol=1.45){
    if(!wa||!wb||wa.id===wb.id) return false;
    const a=v117WallEndpoints(wa),b=v117WallEndpoints(wb);
    return (v128PointNear(a.a,b.a,tol)&&v128PointNear(a.b,b.b,tol))||(v128PointNear(a.a,b.b,tol)&&v128PointNear(a.b,b.a,tol));
  }
  function v128SplitRoomAtBoundaryPoint(room,point){
    if(!room||!point) return false;
    const edge=roomWallEdges(room).find(e=>{ if(!e.wall)return false; const pr=projectPointToSegment(point,e.a,e.b); const t=v117PointSegmentParam(pr,e.a,e.b); return Math.hypot(pr.x-point.x,pr.y-point.y)<=1.6 && t>.004&&t<.996; });
    if(!edge?.wall) return false; const result=v117SplitWallAtPoint(edge.wall,point,{tolerance:2}); return !!(result&&!result.atEndpoint);
  }
  function v128MergeExactRoomWallPair(movingRoom,targetRoom,mEdge,tEdge){
    const movingWall=mEdge?.wall,targetWall=tEdge?.wall; if(!movingWall||!targetWall||movingWall.id===targetWall.id) return false;
    const ma=getWallNode(movingWall.startNodeId),mb=getWallNode(movingWall.endNodeId),ta=getWallNode(targetWall.startNodeId),tb=getWallNode(targetWall.endNodeId); if(!ma||!mb||!ta||!tb) return false;
    const normalCost=Math.hypot(ma.x-ta.x,ma.y-ta.y)+Math.hypot(mb.x-tb.x,mb.y-tb.y),reverseCost=Math.hypot(ma.x-tb.x,ma.y-tb.y)+Math.hypot(mb.x-ta.x,mb.y-ta.y),reversed=reverseCost<normalCost;
    const targetStart=reversed?tb:ta,targetEnd=reversed?ta:tb;
    (appState.layout.openings||[]).filter(o=>o.wallId===targetWall.id).forEach(o=>{if(!o.ownerRoomId)o.ownerRoomId=targetRoom.id;});
    (appState.layout.openings||[]).filter(o=>o.wallId===movingWall.id).forEach(o=>{if(!o.ownerRoomId)o.ownerRoomId=movingRoom.id;});
    mergeWallNodeInto(ma.id,targetStart.id); mergeWallNodeInto(mb.id,targetEnd.id); syncManualWallsFromNodes();
    const mw=findWallById(movingWall.id),tw=findWallById(targetWall.id); if(!mw||!tw||mw===tw) return false;
    transferWallOpenings(mw,tw,reversed); appState.layout.walls=(appState.layout.walls||[]).filter(w=>w.id!==mw.id); if(appState.selectedWallId===mw.id)appState.selectedWallId=tw.id;
    dedupeManualWalls({preferWallId:tw.id}); syncManualWallsFromNodes(); ensureOpeningAttachmentOffsets(); return true;
  }
  function v128FuseTouchingRoomWalls(roomOrId,{targetRoomId='',notify=false}={}){
    ensureWallTopology(); const movingRoom=typeof roomOrId==='string'?findRoomById(roomOrId):roomOrId; if(!movingRoom||movingRoom.obsolete)return {merged:0,split:0};
    let merged=0,split=0,guard=0;
    while(guard++<28){
      let changed=false; const targets=(appState.layout.rooms||[]).filter(r=>!r.obsolete&&r.id!==movingRoom.id&&(!targetRoomId||r.id===targetRoomId));
      outer: for(const targetRoom of targets){
        const movingEdges=roomWallEdges(movingRoom),targetEdges=roomWallEdges(targetRoom);
        for(const me of movingEdges) for(const te of targetEdges){
          if(!me.wall||!te.wall)continue;
          if(me.wall.id===te.wall.id) continue;
          if(v128WallGeometricallyEqual(me.wall,te.wall,1.55)){
            if(v128MergeExactRoomWallPair(movingRoom,targetRoom,me,te)){merged++;changed=true;break outer;}
          }
          const info=v128SegmentOverlapInfo(me.a,me.b,te.a,te.b,{lineTol:1.45,angleDeg:4}); if(!info)continue;
          const minRequired=Math.max(6,Math.min(Math.hypot(me.b.x-me.a.x,me.b.y-me.a.y),Math.hypot(te.b.x-te.a.x,te.b.y-te.a.y))*.12); if(info.overlap<minRequired)continue;
          const s1=v128SplitRoomAtBoundaryPoint(movingRoom,info.start),s2=v128SplitRoomAtBoundaryPoint(movingRoom,info.end),s3=v128SplitRoomAtBoundaryPoint(targetRoom,info.start),s4=v128SplitRoomAtBoundaryPoint(targetRoom,info.end);
          if(s1||s2||s3||s4){split+=Number(s1)+Number(s2)+Number(s3)+Number(s4);changed=true;break outer;}
        }
      }
      if(!changed) break;
    }
    pruneOrphanWallNodes(); syncManualWallsFromNodes(); ensureOpeningAttachmentOffsets(); syncRoomLinkedZones(); v128RebuildSharedWallRegistry();
    if(notify&&merged) showToast(`${merged} tramo(s) fusionados como muro compartida${split?` · ${split} división(es)`:''}.`,'success',2200);
    return {merged,split};
  }
  function v128FuseAllTouchingRooms({notify=false}={}){
    let merged=0,split=0; const ids=(appState.layout.rooms||[]).filter(r=>!r.obsolete).map(r=>r.id);
    ids.forEach(id=>{const r=v128FuseTouchingRoomWalls(id);merged+=r.merged;split+=r.split;});
    v128RebuildSharedWallRegistry(); if(notify)showToast(merged?`${merged} muro(es) compartidas actualizadas.`:'No hay muros nuevas para fusionar.',merged?'success':'info',2000); return {merged,split};
  }
  function v128ZoneMetrics(zoneOrId){
    const zone=typeof zoneOrId==='string'?findZoneById(zoneOrId):zoneOrId;if(!zone||!Array.isArray(zone.pts)||zone.pts.length<3)return null;
    const sc=Math.max(.0001,getScaleCmPerUnit()),areaCm2=polygonAreaAbs(zone.pts)*sc*sc,perimeterUnits=zone.pts.reduce((s,p,i)=>{const q=zone.pts[(i+1)%zone.pts.length];return s+Math.hypot(q.x-p.x,q.y-p.y);},0);
    v128RebuildSharedWallRegistry(); const adjacency=(zone.adjacentZones||[]).map(a=>({zoneId:a.zoneId,lengthM:a.length*sc/100,zone:findZoneById(a.zoneId)}));
    return {areaM2:areaCm2/10000,perimeterM:perimeterUnits*sc/100,adjacency};
  }
  function v128TopologySummary(){
    const shared=v128RebuildSharedWallRegistry(); const rooms=(appState.layout.rooms||[]).filter(r=>!r.obsolete),zones=appState.layout.zones||[]; let adjacencyPairs=0; const keys=new Set(); shared.forEach(s=>{for(let i=0;i<s.zoneIds.length;i++)for(let j=i+1;j<s.zoneIds.length;j++)keys.add([s.zoneIds[i],s.zoneIds[j]].sort().join('|'));});adjacencyPairs=keys.size;
    return {sharedWalls:shared.length,rooms:rooms.length,zones:zones.length,nodes:(appState.layout.wallNodes||[]).length,adjacencyPairs};
  }
  function v128StructureTopologyMarkup(){
    const s=v128TopologySummary(),zone=findZoneById(appState.selectedZoneId),m=zone?v128ZoneMetrics(zone):null;
    return `<div class="v128-topology-summary"><div class="tiny muted" style="margin-top:8px">Topología: <b>${s.sharedWalls}</b> muro(s) compartidos · <b>${s.adjacencyPairs}</b> relación(es) entre zonas · <b>${s.nodes}</b> nodos.</div>${m?`<div class="tiny muted" style="margin-top:5px">${escapeHtml(zone.name||zone.id)} · ${m.areaM2.toFixed(2)} m² · perímetro ${m.perimeterM.toFixed(2)} m${m.adjacency.length?` · adyacente a ${m.adjacency.map(a=>escapeHtml(a.zone?.name||a.zoneId)).join(', ')}`:''}</div>`:''}</div>`;
  }
  function v128PrepareRoomForMove(roomOrId){ const detached=v128DetachRoomTopology(roomOrId); v128RebuildSharedWallRegistry(); return detached; }
  function v128FinalizeRoomMove(roomOrId,{targetRoomId='',notify=true}={}){
    const room=typeof roomOrId==='string'?findRoomById(roomOrId):roomOrId;if(!room)return {merged:0,split:0};
    v117ResolveWallIntersections(); const result=v128FuseTouchingRoomWalls(room,{targetRoomId,notify:false}); v117RefreshRooms(); syncRoomLinkedZones(); v128RebuildSharedWallRegistry();
    if(notify&&result.merged)showToast(result.split?`Muro compartida creada (${result.split} corte(s) automático(s)).`:'Muros fusionadas como muro compartido reversible.','success',2300);
    return result;
  }
