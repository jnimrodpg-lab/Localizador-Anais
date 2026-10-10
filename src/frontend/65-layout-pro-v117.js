/* WMS_V128_CAD_TOPOLOGY */
  // v114-v117 acumulativa: topología CAD, recintos inteligentes, distribución masiva y validación operativa.
  function v117GetSelectedWallIds(){ const ids=Array.isArray(appState.editor?.selectedWallIds)?appState.editor.selectedWallIds.filter(Boolean):[]; if(appState.selectedWallId&&!ids.includes(appState.selectedWallId))ids.unshift(appState.selectedWallId); return [...new Set(ids)]; }
  function v117SetSelectedWallIds(ids){ if(!appState.editor)appState.editor={}; const clean=[...new Set((ids||[]).filter(id=>findWallById(id)&&!findWallById(id).autoZoneEdge))]; appState.editor.selectedWallIds=clean; appState.selectedWallId=clean[0]||''; if(clean.length){appState.selectedOpeningId='';appState.selectedRoomId='';} }
  function v117WallSelected(id){ return v117GetSelectedWallIds().includes(id); }
  function v117ToggleWallSelection(id){ const ids=v117GetSelectedWallIds(),idx=ids.indexOf(id); if(idx>=0)ids.splice(idx,1);else ids.push(id); v117SetSelectedWallIds(ids); }
  function v117DeleteSelectedWalls(){ const ids=v117GetSelectedWallIds(); if(!ids.length)return false; const set=new Set(ids); appState.layout.walls=(appState.layout.walls||[]).filter(w=>!set.has(w.id)); appState.layout.openings=(appState.layout.openings||[]).filter(o=>!set.has(o.wallId)); v117SetSelectedWallIds([]); appState.selectedWallId=''; pruneOrphanWallNodes(); v117RefreshRooms(); syncRoomLinkedZones(); return true; }
  function v117Nearly(a,b,t=1.2){ return Math.abs(Number(a||0)-Number(b||0)) <= t; }
  function v117PointKey(p,t=1){ return `${Math.round(Number(p.x||0)/t)}:${Math.round(Number(p.y||0)/t)}`; }
  function v117SegmentIntersection(a,b,c,d){
    const r={x:b.x-a.x,y:b.y-a.y}, s={x:d.x-c.x,y:d.y-c.y};
    const cross=(u,v)=>u.x*v.y-u.y*v.x;
    const den=cross(r,s); const q={x:c.x-a.x,y:c.y-a.y};
    if(Math.abs(den)<1e-8) return null;
    const t=cross(q,s)/den, u=cross(q,r)/den;
    if(t < -1e-7 || t > 1+1e-7 || u < -1e-7 || u > 1+1e-7) return null;
    return {x:a.x+r.x*t,y:a.y+r.y*t,t,u};
  }
  function v117PointSegmentParam(point,a,b){ const dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy||1; return ((point.x-a.x)*dx+(point.y-a.y)*dy)/den; }
  function v117PointLineDistance(point,a,b){ const t=v117PointSegmentParam(point,a,b); const q={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t}; return Math.hypot(q.x-point.x,q.y-point.y); }
  function v117SplitCollinearOverlap(wa,wb){
    const ea=v117WallEndpoints(wa), eb=v117WallEndpoints(wb); const adx=ea.b.x-ea.a.x,ady=ea.b.y-ea.a.y,bdx=eb.b.x-eb.a.x,bdy=eb.b.y-eb.a.y; const la=Math.hypot(adx,ady)||1,lb=Math.hypot(bdx,bdy)||1;
    const cross=Math.abs(adx*bdy-ady*bdx)/(la*lb); if(cross>.015) return false;
    if(v117PointLineDistance(eb.a,ea.a,ea.b)>1.6 || v117PointLineDistance(eb.b,ea.a,ea.b)>1.6) return false;
    const points=[{wall:wa,p:eb.a},{wall:wa,p:eb.b},{wall:wb,p:ea.a},{wall:wb,p:ea.b}];
    for(const item of points){ const {a,b}=v117WallEndpoints(item.wall); const t=v117PointSegmentParam(item.p,a,b); if(t>.004&&t<.996){ const r=v117SplitWallAtPoint(item.wall,item.p); if(r&&!r.atEndpoint)return true; } }
    return false;
  }
  function v117WallEndpoints(wall){
    const a=getWallNode(wall?.startNodeId) || {x:Number(wall?.x1||0),y:Number(wall?.y1||0)};
    const b=getWallNode(wall?.endNodeId) || {x:Number(wall?.x2||0),y:Number(wall?.y2||0)};
    return {a,b};
  }
  function v117InsertNodeIntoRoomEdge(room,aId,bId,nodeId){
    if(!room || !nodeId || !Array.isArray(room.nodeIds)) return false;
    const ids=room.nodeIds; const next=[]; let changed=false;
    for(let i=0;i<ids.length;i++){
      const cur=ids[i], nxt=ids[(i+1)%ids.length];
      next.push(cur);
      if(((cur===aId&&nxt===bId)||(cur===bId&&nxt===aId)) && cur!==nodeId && nxt!==nodeId){ next.push(nodeId); changed=true; }
    }
    if(changed) room.nodeIds=next.filter((id,i,arr)=>i===0||id!==arr[i-1]);
    return changed;
  }
  function v117SplitWallAtPoint(wallOrId, point, {tolerance=1.35}={}){
    ensureWallTopology();
    const wall=typeof wallOrId==='string'?findWallById(wallOrId):wallOrId;
    if(!wall || wall.autoZoneEdge) return null;
    const {a,b}=v117WallEndpoints(wall); const len=Math.hypot(b.x-a.x,b.y-a.y)||1;
    const proj=projectPointToSegment(point,a,b); const d=Math.hypot(proj.x-point.x,proj.y-point.y);
    if(d>tolerance) return null;
    const t=((proj.x-a.x)*(b.x-a.x)+(proj.y-a.y)*(b.y-a.y))/(len*len);
    if(t<.004) return {node:getWallNode(wall.startNodeId),first:wall,second:null,atEndpoint:true};
    if(t>.996) return {node:getWallNode(wall.endNodeId),first:wall,second:null,atEndpoint:true};
    const splitNode=findOrCreateWallNode(proj);
    if(!splitNode || splitNode.id===wall.startNodeId || splitNode.id===wall.endNodeId) return {node:splitNode,first:wall,second:null,atEndpoint:true};
    const oldEnd=wall.endNodeId; const oldLength=len; const firstLength=Math.max(.001,oldLength*t);
    const second={...clone(wall),id:nextWallId(),startNodeId:splitNode.id,endNodeId:oldEnd,x1:splitNode.x,y1:splitNode.y,x2:b.x,y2:b.y};
    wall.endNodeId=splitNode.id; wall.x2=splitNode.x; wall.y2=splitNode.y;
    appState.layout.walls.push(second);
    (appState.layout.rooms||[]).forEach(room=>v117InsertNodeIntoRoomEdge(room,wall.startNodeId,oldEnd,splitNode.id));
    (appState.layout.openings||[]).forEach(o=>{
      if(o.wallId!==wall.id) return;
      const off=Number(o.offset);
      if(Number.isFinite(off) && off>firstLength+.01){ o.wallId=second.id; o.offset=Math.max(0,off-firstLength); o.t=Math.max(.001,Math.min(.999,o.offset/Math.max(.001,oldLength-firstLength))); }
      else { o.offset=Math.min(Math.max(0,Number.isFinite(off)?off:firstLength*.5),firstLength); o.t=Math.max(.001,Math.min(.999,o.offset/firstLength)); }
    });
    syncManualWallsFromNodes(); syncRoomLinkedZones(); ensureOpeningAttachmentOffsets();
    return {node:splitNode,first:wall,second,atEndpoint:false};
  }
  function v117ResolveWallIntersections({maxPasses=80}={}){
    ensureWallTopology(); let splits=0; let changed=true; let pass=0;
    while(changed && pass++<maxPasses){
      changed=false;
      const walls=manualWalls().filter(w=>wallLength(w)>2);
      outer: for(let i=0;i<walls.length;i++) for(let j=i+1;j<walls.length;j++){
        const wa=walls[i], wb=walls[j];
        if([wa.startNodeId,wa.endNodeId].some(id=>id===wb.startNodeId||id===wb.endNodeId)) continue;
        const ea=v117WallEndpoints(wa), eb=v117WallEndpoints(wb);
        if(v117SplitCollinearOverlap(wa,wb)){ splits++; changed=true; dedupeManualWalls({}); break outer; }
        const hit=v117SegmentIntersection(ea.a,ea.b,eb.a,eb.b); if(!hit) continue;
        const aInterior=hit.t>.004&&hit.t<.996, bInterior=hit.u>.004&&hit.u<.996;
        if(!aInterior&&!bInterior) continue;
        let node=null;
        if(aInterior){ const r=v117SplitWallAtPoint(wa,hit); node=r?.node||node; if(r&&!r.atEndpoint){splits++;changed=true;} }
        if(bInterior){ const r=v117SplitWallAtPoint(wb,node||hit); node=r?.node||node; if(r&&!r.atEndpoint){splits++;changed=true;} }
        if(node){
          const near=findWallNodeNear(hit,2.2); if(near&&near.id!==node.id) mergeWallNodeInto(near.id,node.id);
          syncManualWallsFromNodes(); dedupeManualWalls({});
        }
        if(changed) break outer;
      }
    }
    pruneOrphanWallNodes(); syncManualWallsFromNodes(); syncRoomLinkedZones(); ensureOpeningAttachmentOffsets();
    return splits;
  }
  function v117CanonicalCycle(ids){
    const arr=(ids||[]).filter(Boolean); if(arr.length<3) return '';
    const variants=[];
    for(const src of [arr,[...arr].reverse()]) for(let i=0;i<src.length;i++) variants.push(src.slice(i).concat(src.slice(0,i)).join('|'));
    return variants.sort()[0]||'';
  }
  function v117DetectFaces(){
    ensureWallTopology();
    const walls=manualWalls().filter(w=>w.startNodeId&&w.endNodeId&&wallLength(w)>2);
    const nodeMap=new Map((appState.layout.wallNodes||[]).map(n=>[n.id,n])); const adj=new Map();
    const add=(a,b)=>{ if(!adj.has(a)) adj.set(a,[]); if(!adj.get(a).includes(b)) adj.get(a).push(b); };
    walls.forEach(w=>{add(w.startNodeId,w.endNodeId);add(w.endNodeId,w.startNodeId);});
    adj.forEach((list,id)=>{ const p=nodeMap.get(id); list.sort((a,b)=>Math.atan2(nodeMap.get(a).y-p.y,nodeMap.get(a).x-p.x)-Math.atan2(nodeMap.get(b).y-p.y,nodeMap.get(b).x-p.x)); });
    const visited=new Set(), cycles=[];
    const edgeKey=(a,b)=>`${a}>${b}`;
    for(const [u,list] of adj.entries()) for(const v of list){
      if(visited.has(edgeKey(u,v))) continue;
      const cycle=[]; let a=u,b=v; let guard=0;
      while(guard++<2000){
        const key=edgeKey(a,b); if(visited.has(key)) break; visited.add(key); cycle.push(a);
        const around=adj.get(b)||[]; const backIndex=around.indexOf(a); if(backIndex<0||!around.length) break;
        // En coordenadas SVG (Y hacia abajo), el vecino anterior al reverso recorre la cara interior.
        const c=around[(backIndex-1+around.length)%around.length]; a=b; b=c;
        if(a===u&&b===v) break;
      }
      if(cycle.length>=3 && a===u && b===v){
        const pts=cycle.map(id=>nodeMap.get(id)).filter(Boolean); const area=polygonArea(pts);
        if(Math.abs(area)>500) cycles.push({nodeIds:cycle,pts:pts.map(p=>({x:p.x,y:p.y})),area,absArea:Math.abs(area),key:v117CanonicalCycle(cycle)});
      }
    }
    const unique=new Map(); cycles.forEach(c=>{ if(!unique.has(c.key) || c.absArea<unique.get(c.key).absArea) unique.set(c.key,c); });
    let faces=[...unique.values()];
    // En una red con varias caras, la cara exterior suele ser la mayor. La descartamos solo si contiene otras caras.
    if(faces.length>1){
      const sorted=[...faces].sort((a,b)=>b.absArea-a.absArea); const largest=sorted[0];
      const containsOther=sorted.slice(1).some(f=>{ const c=polygonCentroid(f.pts); return pointInPoly(c,largest.pts); });
      if(containsOther) faces=faces.filter(f=>f!==largest);
    }
    return faces.sort((a,b)=>a.absArea-b.absArea);
  }
  function v117RoomBoundaryValid(room){
    if(!room || !Array.isArray(room.nodeIds)||room.nodeIds.length<3) return false;
    const edges=new Set(manualWalls().map(w=>[w.startNodeId,w.endNodeId].sort().join('|'))); const ids=room.nodeIds;
    return ids.every((id,i)=>edges.has([id,ids[(i+1)%ids.length]].sort().join('|')));
  }
  function v117RefreshRooms({notify=false}={}){
    v117ResolveWallIntersections(); const faces=v117DetectFaces(); const existing=appState.layout.rooms||[]; const byKey=new Map(existing.map(r=>[v117CanonicalCycle(r.nodeIds),r]));
    const next=[]; let added=0; const matched=new Set();
    faces.forEach(face=>{
      let room=byKey.get(face.key);
      if(room){ room.nodeIds=[...face.nodeIds]; room.obsolete=false; matched.add(room.id); }
      else { room={id:nextRoomId(),name:`Recinto ${existing.length+added+1}`,nodeIds:[...face.nodeIds],kind:'room',autoDetected:true}; added++; }
      next.push(room);
    });
    existing.forEach(room=>{
      if(matched.has(room.id)) return;
      const zone=getRoomLinkedZone(room);
      if(zone){ room.obsolete=true; zone.roomLinkBroken=true; next.push(room); }
    });
    appState.layout.rooms=next;
    syncRoomLinkedZones();
    if(notify) showToast(added?`${added} recinto(s) nuevo(s) detectado(s).`:'Recintos actualizados.', 'success', 2400);
    return {faces,added,obsolete:next.filter(r=>r.obsolete).length};
  }
  function v117SyncZonesWithRooms(){
    const beforeZones=(appState.layout.zones||[]).length; const oldRooms=(appState.layout.rooms||[]).map(r=>({id:r.id,nodeIds:[...(r.nodeIds||[])],pts:roomPointsRaw(r),zoneId:r.zoneId||getRoomLinkedZone(r)?.id||''}));
    const result=v117RefreshRooms(); const validRooms=(appState.layout.rooms||[]).filter(r=>!r.obsolete&&roomPointsRaw(r).length>=3); let splitCount=0,mergeCount=0;
    const handledZones=new Set();
    // Reubica zonas rotas al recinto nuevo que ocupa su antiguo espacio. Si se divide, crea zonas hermanas.
    oldRooms.filter(r=>r.zoneId).forEach(old=>{
      const zone=findZoneById(old.zoneId); if(!zone||handledZones.has(zone.id)) return;
      let candidates=validRooms.filter(nr=>{ const c=polygonCentroid(roomPointsRaw(nr)); return old.pts.length>=3 && pointInPoly(c,old.pts); });
      if(!candidates.length && old.pts.length>=3){ const oldCenter=polygonCentroid(old.pts); candidates=validRooms.filter(nr=>pointInPoly(oldCenter,roomPointsRaw(nr))); }
      if(!candidates.length) return;
      candidates.sort((a,b)=>polygonAreaAbs(roomPointsRaw(b))-polygonAreaAbs(roomPointsRaw(a)));
      const primary=candidates[0]; zone.linkedRoomId=primary.id; zone.dynamicFromRoom=true; zone.roomLinkBroken=false; primary.zoneId=zone.id; handledZones.add(zone.id);
      candidates.slice(1).forEach((room,idx)=>{
        if(getRoomLinkedZone(room)) return;
        const id=nextZoneId(); const z={...clone(zone),id,name:`${zone.name||zone.id} ${String.fromCharCode(66+idx)}`,linkedRoomId:room.id,dynamicFromRoom:true,roomLinkBroken:false,pts:roomPointsRaw(room).map(p=>({...p})),edgeWalls:{},source:'room'};
        appState.layout.zones.push(z); room.zoneId=id; splitCount++;
      });
    });
    // Si varias zonas terminaron apuntando a la misma cara, conserva una y reasigna sus racks.
    const groups=new Map(); (appState.layout.zones||[]).filter(z=>z.linkedRoomId&&!z.roomLinkBroken).forEach(z=>{if(!groups.has(z.linkedRoomId))groups.set(z.linkedRoomId,[]);groups.get(z.linkedRoomId).push(z);});
    groups.forEach(group=>{
      if(group.length<2) return; const keeper=group[0];
      group.slice(1).forEach(z=>{ (appState.layout.racks||[]).forEach(r=>{if(r.zoneId===z.id)r.zoneId=keeper.id;}); appState.layout.zones=appState.layout.zones.filter(x=>x!==z); mergeCount++; });
      const room=findRoomById(keeper.linkedRoomId); if(room) room.zoneId=keeper.id;
    });
    syncRoomLinkedZones(); normalizeZoneAndRackIds(); persistActiveLayout();
    showToast(`Zonas sincronizadas · ${splitCount} división(es) · ${mergeCount} fusión(es).`, 'success', 3200);
    return {beforeZones,afterZones:(appState.layout.zones||[]).length,splitCount,mergeCount,...result};
  }

  function v117WallAngleDeg(wall){ if(!wall)return 0; const {a,b}=v117WallEndpoints(wall); return normalizeAngle(Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI); }
  function v117SetWallAngle(wallOrId,deg){ const wall=typeof wallOrId==='string'?findWallById(wallOrId):wallOrId; if(!wall||wall.autoZoneEdge)return false; const {a,b}=v117WallEndpoints(wall),len=Math.hypot(b.x-a.x,b.y-a.y)||1,rad=Number(deg||0)*Math.PI/180; setWallNodePosition(wall.endNodeId,a.x+Math.cos(rad)*len,a.y+Math.sin(rad)*len); v117ResolveWallIntersections(); v117RefreshRooms(); return true; }
  function v117TranslateWallCm(wallOrId,dxCm=0,dyCm=0){ const wall=typeof wallOrId==='string'?findWallById(wallOrId):wallOrId; if(!wall||wall.autoZoneEdge)return false; const sc=Math.max(.0001,getScaleCmPerUnit()),dx=Number(dxCm||0)/sc,dy=Number(dyCm||0)/sc; const a=getWallNode(wall.startNodeId),b=getWallNode(wall.endNodeId); if(!a||!b)return false; setWallNodesPositionsBulk([{id:a.id,x:a.x+dx,y:a.y+dy},{id:b.id,x:b.x+dx,y:b.y+dy}]); v117ResolveWallIntersections(); v117RefreshRooms(); return true; }
  function v117RenderDragMeasurements(layer){
    if(!layer)return; const d=appState.editor?.dragging; if(!d)return; let from=null,to=null,label='';
    if(d.type==='wall-node'){ const n=getWallNode(d.nodeId); if(n){from=d.original;to=n;label=`ΔX ${formatDistanceCm(Math.abs(to.x-from.x))} · ΔY ${formatDistanceCm(Math.abs(to.y-from.y))}`;} }
    else if(d.type==='wall-body'||d.type==='wall-group'){ const ids=d.nodeIds||[],a0=d.originalNodes?.[ids[0]],a=ids[0]?getWallNode(ids[0]):null; if(a0&&a){from=a0;to=a;label=`${d.type==='wall-group'?`${(d.wallIds||[]).length} muros`:'Mover muro'} · ΔX ${formatDistanceCm(Math.abs(to.x-from.x))} · ΔY ${formatDistanceCm(Math.abs(to.y-from.y))}`;} }
    else if(d.type==='rack-group'){ const first=(d.rackIds||[])[0],o=d.originals?.[first],r=first?findRackById(first):null; if(o&&r){from={x:o.x,y:o.y};to={x:r.x,y:r.y};label=`${(d.rackIds||[]).length} racks · ΔX ${formatDistanceCm(Math.abs(to.x-from.x))} · ΔY ${formatDistanceCm(Math.abs(to.y-from.y))}`;} }
    if(!from||!to||!label)return; layer.appendChild(svgEl('line',{x1:from.x,y1:from.y,x2:to.x,y2:to.y,stroke:'#65f0a8','stroke-width':'1.6','stroke-dasharray':'6 5',opacity:'.9',style:'pointer-events:none'})); const mid={x:(from.x+to.x)/2,y:(from.y+to.y)/2}; const tx=svgEl('text',{x:mid.x,y:mid.y-12,'text-anchor':'middle',class:'wall-preview-dim',style:'fill:#8dffd0;paint-order:stroke;stroke:#06111d;stroke-width:4px;pointer-events:none'}); tx.textContent=label; layer.appendChild(tx);
  }

  function v117RackMatrix({rows=3,cols=5,gapXcm=20,gapYcm=120,zoneId='',modelId=''}={}){
    if(!isRackDistributionScreen()) return [];
    const zone=findZoneById(zoneId||appState.selectedZoneId)||appState.layout.zones[0]; if(!zone) return [];
    const model=rackModel(modelId||appState.selectedModelId); if(!model) return [];
    rows=Math.max(1,Math.min(50,Math.round(Number(rows)||1))); cols=Math.max(1,Math.min(100,Math.round(Number(cols)||1)));
    const sc=Math.max(.0001,getScaleCmPerUnit()); const gapX=Math.max(0,Number(gapXcm||0)/sc), gapY=Math.max(0,Number(gapYcm||0)/sc); const fp=getRackFootprint(model.id,0); const b=zoneBounds(zone); const margin=Math.max(8,20/sc);
    const created=[]; const startX=b.minX+margin, startY=b.minY+margin;
    for(let row=0;row<rows;row++) for(let col=0;col<cols;col++){
      const rack={id:nextRackId(zone.id),zoneId:zone.id,x:snapGrid(startX+col*(fp.w+gapX)),y:snapGrid(startY+row*(fp.h+gapY)),w:fp.w,h:fp.h,rot:0,modelId:model.id,front:'auto',baseHeight:0,rackHeight:Number(model.height||238)};
      if(rackFullyInsideZone(rack,zone)){ appState.layout.racks.push(rack); created.push(rack.id); }
    }
    setSelectedRackIds(created); normalizeZoneAndRackIds(); persistActiveLayout(); v117RunValidation({quiet:true}); renderLayoutEditor();
    showToast(`${created.length} rack(s) creados en matriz.`, created.length?'success':'warning', 2200); return created;
  }
  function v117SelectedRacks(){ return getSelectedRackIds().map(findRackById).filter(Boolean); }
  function v117AlignRacks(mode){
    const racks=v117SelectedRacks(); if(racks.length<2) return false; const xs=racks.map(r=>r.x), ys=racks.map(r=>r.y), rights=racks.map(r=>r.x+r.w), bottoms=racks.map(r=>r.y+r.h), cx=racks.map(r=>r.x+r.w/2), cy=racks.map(r=>r.y+r.h/2);
    const target={left:Math.min(...xs),right:Math.max(...rights),top:Math.min(...ys),bottom:Math.max(...bottoms),hcenter:cx.reduce((a,b)=>a+b,0)/cx.length,vcenter:cy.reduce((a,b)=>a+b,0)/cy.length}[mode];
    racks.forEach(r=>{ if(mode==='left')r.x=target; if(mode==='right')r.x=target-r.w; if(mode==='top')r.y=target; if(mode==='bottom')r.y=target-r.h; if(mode==='hcenter')r.x=target-r.w/2; if(mode==='vcenter')r.y=target-r.h/2; const z=findZoneById(r.zoneId); if(z)keepRackInsideZone(r,z); });
    persistActiveLayout(); v117RunValidation({quiet:true}); renderLayoutEditor(); return true;
  }
  function v117DistributeRacks(axis='x'){
    const racks=v117SelectedRacks(); if(racks.length<3) return false;
    racks.sort((a,b)=>axis==='x'?(a.x-b.x):(a.y-b.y)); const first=racks[0], last=racks[racks.length-1];
    if(axis==='x'){ const span=(last.x+last.w)-first.x; const total=racks.reduce((s,r)=>s+r.w,0); const gap=(span-total)/(racks.length-1); let x=first.x; racks.forEach(r=>{r.x=snapGrid(x);x+=r.w+gap;}); }
    else { const span=(last.y+last.h)-first.y; const total=racks.reduce((s,r)=>s+r.h,0); const gap=(span-total)/(racks.length-1); let y=first.y; racks.forEach(r=>{r.y=snapGrid(y);y+=r.h+gap;}); }
    racks.forEach(r=>{const z=findZoneById(r.zoneId);if(z)keepRackInsideZone(r,z);}); persistActiveLayout(); v117RunValidation({quiet:true}); renderLayoutEditor(); return true;
  }
  function v117RotateSelected(delta){
    const racks=v117SelectedRacks(); if(!racks.length)return false; racks.forEach(r=>applyRackRotation(r,Number(r.rot||0)+Number(delta||0))); persistActiveLayout(); v117RunValidation({quiet:true}); renderLayoutEditor(); return true;
  }

  function v117PolyAxes(poly){ const axes=[]; for(let i=0;i<poly.length;i++){ const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1; axes.push({x:-dy/l,y:dx/l}); } return axes; }
  function v117PolyOverlap(a,b){
    if(!a?.length||!b?.length)return false; const axes=[...v117PolyAxes(a),...v117PolyAxes(b)];
    for(const ax of axes){ const pa=a.map(p=>p.x*ax.x+p.y*ax.y),pb=b.map(p=>p.x*ax.x+p.y*ax.y); if(Math.max(...pa)<=Math.min(...pb)+.15||Math.max(...pb)<=Math.min(...pa)+.15)return false; } return true;
  }
  function v117RackAisleGap(a,b){
    if(!a||!b)return null; let diff=Math.abs(normalizeAngle(a.rot||0)-normalizeAngle(b.rot||0)); diff=Math.min(diff,360-diff); if(diff>7&&Math.abs(diff-180)>7)return null;
    const ca={x:a.x+a.w/2,y:a.y+a.h/2}, cb={x:b.x+b.w/2,y:b.y+b.h/2}; const ang=normalizeAngle(a.rot||0)*Math.PI/180; const dx=cb.x-ca.x,dy=cb.y-ca.y; const lx=dx*Math.cos(ang)+dy*Math.sin(ang), ly=-dx*Math.sin(ang)+dy*Math.cos(ang); const fa=getRackFootprint(a.modelId,a.rot||0), fb=getRackFootprint(b.modelId,b.rot||0);
    if(Math.abs(ly)<Math.abs(lx)*.55) return null; return Math.abs(ly)-(fa.baseH+fb.baseH)/2;
  }
  function v117DoorClearancePolygon(opening, wall, depthUnits){
    const seg=getOpeningSegment(opening,wall); if(!seg)return null; const dir=wallDirection(wall), n=getWallOpeningNormal(wall), half=Math.max(20,Number(opening.width||90)/2), depth=Math.max(20,depthUnits);
    const c=seg.center; return [
      {x:c.x-dir.x*half-n.x*depth,y:c.y-dir.y*half-n.y*depth},{x:c.x+dir.x*half-n.x*depth,y:c.y+dir.y*half-n.y*depth},
      {x:c.x+dir.x*half+n.x*depth,y:c.y+dir.y*half+n.y*depth},{x:c.x-dir.x*half+n.x*depth,y:c.y-dir.y*half+n.y*depth}
    ];
  }
  function v117OperationalIssues(){
    ensureLayoutMeta(); const issues=[]; const racks=appState.layout.racks||[], walls=(appState.layout.walls||[]).filter(w=>wallLength(w)>2); const sc=Math.max(.0001,getScaleCmPerUnit()); const minAisleCm=Math.max(40,Number(appState.layout.meta.minAisleCm||120)||120), minAisle=minAisleCm/sc;
    const zones=appState.layout.zones||[];
    for(let i=0;i<zones.length;i++) for(let j=i+1;j<zones.length;j++){ const a=zones[i],b=zones[j]; if(typeof zonePolygonsOverlap==='function'&&zonePolygonsOverlap(a.pts,b.pts)){ const ca=polygonCentroid(a.pts),cb=polygonCentroid(b.pts);issues.push({type:'zone-overlap',severity:'error',zoneIds:[a.id,b.id],message:`${a.name||a.id} y ${b.name||b.id}: las zonas se superponen.`,point:{x:(ca.x+cb.x)/2,y:(ca.y+cb.y)/2}}); } }
    racks.forEach(r=>{ const z=findZoneById(r.zoneId); if(!z||!rackFullyInsideZone(r,z))issues.push({type:'outside',severity:'error',rackIds:[r.id],message:`${r.id}: fuera de su zona.`,point:{x:r.x+r.w/2,y:r.y+r.h/2}}); });
    for(let i=0;i<racks.length;i++) for(let j=i+1;j<racks.length;j++){
      const a=racks[i],b=racks[j]; if(racksCanOverlapByLevel(a,b))continue; const pa=rackCorners(a),pb=rackCorners(b);
      if(v117PolyOverlap(pa,pb)) issues.push({type:'rack-collision',severity:'error',rackIds:[a.id,b.id],message:`${a.id} y ${b.id}: colisión entre racks.`,point:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}});
      else { const gap=v117RackAisleGap(a,b); if(gap!==null&&gap>=0&&gap<minAisle)issues.push({type:'aisle',severity:'warning',rackIds:[a.id,b.id],message:`Pasillo ${Math.round(gap*sc)} cm entre ${a.id} y ${b.id} (mín. ${Math.round(minAisleCm)} cm).`,point:{x:(a.x+a.w/2+b.x+b.w/2)/2,y:(a.y+a.h/2+b.y+b.h/2)/2}}); }
    }
    const wallPolys=walls.map(w=>({wall:w,poly:getWallSlicePolygon(w,0,1,1)?.poly||[]}));
    racks.forEach(r=>{const rp=rackCorners(r); wallPolys.forEach(x=>{if(x.poly.length&&v117PolyOverlap(rp,x.poly))issues.push({type:'wall-collision',severity:'error',rackIds:[r.id],wallId:x.wall.id,message:`${r.id}: invade el muro ${x.wall.id}.`,point:{x:r.x+r.w/2,y:r.y+r.h/2}});});});
    const doors=(appState.layout.openings||[]).filter(o=>normalizeOpeningType(o.type)==='door');
    doors.forEach(o=>{const w=findWallById(o.wallId);if(!w)return;const poly=v117DoorClearancePolygon(o,w,minAisle*.72);if(!poly)return;racks.forEach(r=>{if(v117PolyOverlap(rackCorners(r),poly))issues.push({type:'door-clearance',severity:'warning',rackIds:[r.id],openingId:o.id,message:`${r.id}: bloquea el despeje de la puerta ${o.id}.`,point:getOpeningSegment(o,w)?.center});});});
    return issues.slice(0,300);
  }
  function v117RunValidation({quiet=false}={}){ appState.editor.validationIssues=v117OperationalIssues(); appState.editor.validationAt=Date.now(); if(!quiet)showToast(appState.editor.validationIssues.length?`${appState.editor.validationIssues.length} incidencia(s) detectada(s).`:'Layout operativo sin incidencias.',appState.editor.validationIssues.length?'warning':'success',2600); return appState.editor.validationIssues; }
  function v117ConflictRackIds(){ return new Set((appState.editor?.validationIssues||[]).flatMap(i=>i.rackIds||[])); }
  function v117ConflictWallIds(){ return new Set((appState.editor?.validationIssues||[]).map(i=>i.wallId).filter(Boolean)); }
  function v117FocusIssue(index){
    const issue=(appState.editor?.validationIssues||[])[Number(index)]; if(!issue)return;
    if(issue.rackIds?.length)setSelectedRackIds(issue.rackIds); if(issue.wallId)appState.selectedWallId=issue.wallId;
    const p=issue.point; if(p){ const vb=appState.editor.viewBox||{w:900,h:620}; appState.editor.viewBox={x:p.x-vb.w*.28,y:p.y-vb.h*.28,w:vb.w*.56,h:vb.h*.56}; appState.editor.viewBoxCustomized=true; }
    renderLayoutEditor();
  }
  function v117ValidationMarkup(){
    const issues=appState.editor?.validationIssues||[]; const min=Math.max(40,Number(appState.layout?.meta?.minAisleCm||120)||120); const errors=issues.filter(i=>i.severity==='error').length;
    return `<section class="layout-prop-card v117-validation-card"><div class="layout-prop-title">Validación operativa</div><div class="layout-prop-grid two"><label>Pasillo mínimo (cm)<input id="v117MinAisle" type="number" min="40" max="600" step="10" value="${Math.round(min)}"></label><label>Estado<input value="${issues.length?`${errors} errores · ${issues.length-errors} avisos`:'Sin incidencias'}" disabled></label></div><div class="layout-template-grid" style="margin-top:10px"><button class="btn primary" id="v117Validate">Validar layout</button></div><div class="v117-issue-list">${issues.slice(0,24).map((i,idx)=>`<button class="v117-issue ${i.severity}" data-v117-issue="${idx}"><b>${i.severity==='error'?'⛔':'⚠'} ${escapeHtml(i.type)}</b><span>${escapeHtml(i.message)}</span></button>`).join('')||'<div class="tiny muted" style="margin-top:8px">Ejecuta la validación para revisar colisiones, pasillos y accesos.</div>'}</div></section>`;
  }
  function v117RackToolsMarkup(){
    return `<section class="layout-prop-card v117-rack-tools"><div class="layout-prop-title">Distribución profesional</div><div class="layout-prop-grid two"><label>Filas<input id="v117Rows" type="number" min="1" max="50" value="3"></label><label>Columnas<input id="v117Cols" type="number" min="1" max="100" value="5"></label><label>Sep. X (cm)<input id="v117GapX" type="number" min="0" value="20"></label><label>Pasillo Y (cm)<input id="v117GapY" type="number" min="0" value="120"></label></div><button class="btn primary" id="v117Matrix" style="width:100%;margin-top:10px">Crear matriz</button><div class="layout-template-grid v117-align-grid" style="margin-top:10px"><button class="seg-btn" data-v117-align="left">Izquierda</button><button class="seg-btn" data-v117-align="right">Derecha</button><button class="seg-btn" data-v117-align="top">Arriba</button><button class="seg-btn" data-v117-align="bottom">Abajo</button><button class="seg-btn" data-v117-align="hcenter">Centro H</button><button class="seg-btn" data-v117-align="vcenter">Centro V</button><button class="seg-btn" data-v117-distribute="x">Distribuir H</button><button class="seg-btn" data-v117-distribute="y">Distribuir V</button><button class="seg-btn" data-v117-rotate="90">Girar +90°</button></div><div class="tiny muted" style="margin-top:8px">Shift+clic o selección por ventana para trabajar con varios racks.</div></section>`;
  }
  function v117StructureToolsMarkup(){
    const invalid=(appState.layout.rooms||[]).filter(r=>r.obsolete||!v117RoomBoundaryValid(r)).length;
    const topo=typeof v128StructureTopologyMarkup==='function'?v128StructureTopologyMarkup():'';
    return `<section class="layout-prop-card v117-cad-tools"><div class="layout-prop-title">CAD + topología inteligente</div><div class="layout-template-grid"><button class="seg-btn" id="v117ResolveIntersections">Resolver T / X</button><button class="seg-btn" id="v117RefreshRooms">Detectar recintos</button><button class="seg-btn" id="v128FuseContacts">Fusionar contactos</button><button class="btn primary" id="v117SyncZones">Sincronizar zonas</button></div><div class="tiny muted" style="margin-top:8px">Las muros coincidentes se convierten en muros compartidos reversibles; al mover una zona fuera del contacto recupera su propio muro. ${invalid?`${invalid} recinto(s) requieren revisión.`:'Los recintos actuales están cerrados.'}</div>${topo}</section>`;
  }
  function v117BindTools(){
    document.getElementById('v117ResolveIntersections')?.addEventListener('click',()=>{const n=v117ResolveWallIntersections();v117RefreshRooms();persistActiveLayout();renderLayoutEditor();showToast(n?`${n} división(es) de muro creadas.`:'No había intersecciones pendientes.','success',2200);});
    document.getElementById('v117RefreshRooms')?.addEventListener('click',()=>{v117RefreshRooms({notify:true});if(typeof v128RebuildSharedWallRegistry==='function')v128RebuildSharedWallRegistry();persistActiveLayout();renderLayoutEditor();});
    document.getElementById('v128FuseContacts')?.addEventListener('click',()=>{if(typeof v128FuseAllTouchingRooms==='function'){v128FuseAllTouchingRooms({notify:true});v117RefreshRooms();syncRoomLinkedZones();persistActiveLayout();renderLayoutEditor();}});
    document.getElementById('v117SyncZones')?.addEventListener('click',async()=>{const ok=await openAppModal({title:'Sincronizar zonas',message:['Se analizarán los recintos actuales.','Si una zona fue dividida por un muro, se crearán zonas hermanas. Si varias zonas convergen en un recinto, se fusionarán conservando sus racks.'],actions:[{label:'Cancelar',value:false,cls:'secondary'},{label:'Sincronizar',value:true,cls:'primary'}]});if(ok)v117SyncZonesWithRooms();});
    document.getElementById('v117Matrix')?.addEventListener('click',()=>v117RackMatrix({rows:document.getElementById('v117Rows')?.value,cols:document.getElementById('v117Cols')?.value,gapXcm:document.getElementById('v117GapX')?.value,gapYcm:document.getElementById('v117GapY')?.value}));
    document.querySelectorAll('[data-v117-align]').forEach(b=>b.addEventListener('click',()=>v117AlignRacks(b.dataset.v117Align)));
    document.querySelectorAll('[data-v117-distribute]').forEach(b=>b.addEventListener('click',()=>v117DistributeRacks(b.dataset.v117Distribute)));
    document.querySelectorAll('[data-v117-rotate]').forEach(b=>b.addEventListener('click',()=>v117RotateSelected(Number(b.dataset.v117Rotate||0))));
    document.getElementById('v117MinAisle')?.addEventListener('change',e=>{ensureLayoutMeta();appState.layout.meta.minAisleCm=Math.max(40,Math.min(600,Number(e.target.value||120)||120));persistActiveLayout();v117RunValidation({quiet:true});renderLayoutEditor();});
    document.getElementById('v117Validate')?.addEventListener('click',()=>{v117RunValidation();renderLayoutEditor();});
    document.querySelectorAll('[data-v117-issue]').forEach(b=>b.addEventListener('click',()=>v117FocusIssue(b.dataset.v117Issue)));
  }
