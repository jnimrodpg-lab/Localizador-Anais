  // V214: Área comercial -> muros físicos -> zonas virtuales.
  function v214Ring(pts){
    const lengths=pts.map((p,i)=>Math.hypot(pts[(i+1)%pts.length].x-p.x,pts[(i+1)%pts.length].y-p.y));
    const total=lengths.reduce((a,b)=>a+b,0)||1;let sum=0;
    return {total,lengths,starts:lengths.map(length=>{const s=sum/total;sum+=length;return s;})};
  }
  function v214PointAt(pts,s){
    const ring=v214Ring(pts);s=((s%1)+1)%1;
    let i=pts.length-1;for(let j=0;j<pts.length;j++){if(s<=ring.starts[j]+ring.lengths[j]/ring.total+1e-8){i=j;break;}}
    const t=Math.max(0,Math.min(1,(s-ring.starts[i])*ring.total/(ring.lengths[i]||1))),a=pts[i],b=pts[(i+1)%pts.length];
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  }
  function v214Anchor(pts,p,tolerance=.15){
    if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||!pts?.length)return null;
    const ring=v214Ring(pts);let best=null;
    pts.forEach((a,i)=>{const b=pts[(i+1)%pts.length],dx=b.x-a.x,dy=b.y-a.y,den=dx*dx+dy*dy;
      const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(den||1))),q={x:a.x+dx*t,y:a.y+dy*t},d=Math.hypot(q.x-p.x,q.y-p.y);
      if(!best||d<best.d)best={d,i,t,q};});
    if(!best||best.d>tolerance)return null;
    const {i,t}=best,a=pts[i],b=pts[(i+1)%pts.length],s=(ring.starts[i]+t*ring.lengths[i]/ring.total)%1;
    return t<1e-7?{vertexId:a.cadVertexId,s}:t>1-1e-7?{vertexId:b.cadVertexId,s}:{aId:a.cadVertexId,bId:b.cadVertexId,t,s};
  }
  function v214ResolveAnchor(anchor,pts){
    if(!anchor)return null;
    const a=pts.find(p=>p.cadVertexId===(anchor.vertexId||anchor.aId));
    if(anchor.vertexId&&a)return {x:a.x,y:a.y};
    const b=pts.find(p=>p.cadVertexId===anchor.bId);
    if(a&&b){const ring=v214Ring(pts),i=pts.indexOf(a),j=pts.indexOf(b),span=(ring.starts[j]-ring.starts[i]+1)%1;return v214PointAt(pts,ring.starts[i]+span*anchor.t);}
    return v214PointAt(pts,Number(anchor.s)||0);
  }
  function v214AssignVertexIds(pts,layout,old=[]){
    const used=new Set([...(layout.zones||[]).flatMap(z=>(z.pts||[]).map(p=>p.cadVertexId)),...old.map(p=>p.cadVertexId)].filter(Boolean));
    const seen=new Set();return pts.map((p,i)=>{
      let id=p.cadVertexId;if(!id&&old.length===pts.length)id=old[i]?.cadVertexId;
      if(!id)id=old.find(q=>Math.hypot(q.x-p.x,q.y-p.y)<1e-7)?.cadVertexId;
      if(!id||seen.has(id)){do{layout.meta.cadVertexSerial=Math.max(0,Number(layout.meta.cadVertexSerial||0))+1;id=`CADV-A${layout.meta.cadVertexSerial}`;}while(used.has(id));}
      used.add(id);seen.add(id);return {...p,cadVertexId:id};
    });
  }
  function v214BindWall(wall,layout){
    if(wall.autoZoneEdge||![wall.x1,wall.y1,wall.x2,wall.y2].every(Number.isFinite))return wall;
    const pts=layout.meta.siteBoundary.pts,pa={x:wall.x1,y:wall.y1},pb={x:wall.x2,y:wall.y2};
    const a=v214Anchor(pts,pa),b=v214Anchor(pts,pb),mid={x:(pa.x+pb.x)/2,y:(pa.y+pb.y)/2};
    const m=v214Anchor(pts,mid),perimeter=!!(a&&b&&m&&[.2,.4,.6,.8].every(t=>v214Anchor(pts,{x:pa.x+(pb.x-pa.x)*t,y:pa.y+(pb.y-pa.y)*t})));
    wall.ownerAreaId=layout.meta.siteBoundary.id||'AREA-GENERAL';
    if(a||b){let direction=1;if(perimeter){const edge=pts.findIndex(p=>p.cadVertexId===m.aId||p.cadVertexId===m.vertexId),p=pts[Math.max(0,edge)],q=pts[(Math.max(0,edge)+1)%pts.length];direction=(pb.x-pa.x)*(q.x-p.x)+(pb.y-pa.y)*(q.y-p.y)>=0?1:-1;}
      wall.areaBinding={areaId:wall.ownerAreaId,start:a,end:b,perimeter,direction};
      for(const [nodeId,anchor] of [[wall.startNodeId,a],[wall.endNodeId,b]]){const node=(layout.wallNodes||[]).find(n=>n.id===nodeId);if(node&&anchor)node.areaAnchor=clone(anchor);}
    }
    if(wall.zoneBoundarySource){
      const z=(layout.zones||[]).find(z=>z.id===wall.zoneBoundarySource.zoneId),i=wall.zoneBoundarySource.edgeIndex;
      if(z?.pts?.[i]&&!perimeter){const p=z.pts[i],q=z.pts[(i+1)%z.pts.length],sign=z.pts.reduce((s,p,j)=>s+p.x*z.pts[(j+1)%z.pts.length].y-z.pts[(j+1)%z.pts.length].x*p.y,0)>=0?-1:1;wall.referenceOutwardSign=((pb.x-pa.x)*(q.x-p.x)+(pb.y-pa.y)*(q.y-p.y)>=0?1:-1)*sign;}
      delete wall.zoneBoundarySource;
    }
    if(perimeter){const ringArea=pts.reduce((s,p,i)=>s+p.x*pts[(i+1)%pts.length].y-pts[(i+1)%pts.length].x*p.y,0);wall.referenceOutwardSign=(ringArea>=0?-1:1)*wall.areaBinding.direction;}
    return wall;
  }
  function v214EnsureHierarchy(layout=appState.layout){
    const boundary=layout?.meta?.siteBoundary;if(!boundary?.pts?.length)return;
    boundary.id='AREA-GENERAL';boundary.pts=v214AssignVertexIds(boundary.pts,layout,boundary.pts);
    layout.meta.architectureHierarchyV214=true;layout.meta.autoFitBoundaryToZones=false;
    (layout.zones||[]).forEach(z=>{z.kind='virtual';if(z.linkedRoomId){z.legacyRoomId=z.linkedRoomId;delete z.linkedRoomId;delete z.dynamicFromRoom;}if(layout.meta.unifiedWallsV130)z.edgeWalls={};});
    (layout.walls||[]).forEach(w=>{
      const binding=w.areaBinding,a=v214ResolveAnchor(binding?.start,boundary.pts),b=v214ResolveAnchor(binding?.end,boundary.pts);
      const changed=a&&Math.hypot(a.x-w.x1,a.y-w.y1)>1e-6||b&&Math.hypot(b.x-w.x2,b.y-w.y2)>1e-6;
      if(changed)delete w.areaBinding;
      if(!w.areaBinding||w.zoneBoundarySource)v214BindWall(w,layout);w.ownerAreaId=boundary.id;
    });
    (layout.wallNodes||[]).forEach(n=>{const anchor=v214Anchor(boundary.pts,n);if(anchor)n.areaAnchor=anchor;else delete n.areaAnchor;});
  }
  function v214NodesBound(items,layout){
    if(!layout?.meta?.architectureHierarchyV214)return false;
    return (items||[]).some(item=>{const n=(layout.wallNodes||[]).find(n=>n.id===item.id);return n?.areaAnchor&&Math.hypot(Number(item.x)-n.x,Number(item.y)-n.y)>1e-7;});
  }
  function v214PlanArea(layout,next){
    const result=clone(layout);result.wallNodes=result.wallNodes||[];v214EnsureHierarchy(result);const old=result.meta.siteBoundary.pts;
    const pts=v214AssignVertexIds(next,result,old),ring=v214Ring(pts),sourceWalls=clone(result.walls||[]),allOpenings=clone(result.openings||[]);
    const ids=new Set(sourceWalls.map(w=>w.id)),nodeIds=new Set((result.wallNodes||[]).map(n=>n.id));
    const nextId=(prefix,set)=>{let n=1;while(set.has(prefix+n))n++;const id=prefix+n;set.add(id);return id;};
    const nodeAt=(p,preferred)=>{let node=(result.wallNodes||[]).find(n=>n.id===preferred)||(result.wallNodes||[]).find(n=>Math.hypot(n.x-p.x,n.y-p.y)<1e-7);if(!node){node={id:nextId('N',nodeIds),x:p.x,y:p.y};result.wallNodes.push(node);}node.x=p.x;node.y=p.y;node.areaAnchor=v214Anchor(pts,p);return node;};
    result.walls=[];result.openings=allOpenings.filter(o=>!sourceWalls.some(w=>w.id===o.wallId&&w.areaBinding));
    for(const wall of sourceWalls){
      const binding=wall.areaBinding;if(!binding){result.walls.push(wall);continue;}
      const a=v214ResolveAnchor(binding.start,pts)||{x:wall.x1,y:wall.y1},b=v214ResolveAnchor(binding.end,pts)||{x:wall.x2,y:wall.y2};
      let path=[a,b];if(binding.perimeter){
        const aa=v214Anchor(pts,a,1),bb=v214Anchor(pts,b,1);if(!aa||!bb)return {ok:false,message:'No se pudo mantener un muro sobre el nuevo perímetro.'};
        const direction=binding.direction||1,span=((bb.s-aa.s)*direction+1)%1;
        const between=pts.map((p,i)=>({p,d:((ring.starts[i]-aa.s)*direction+1)%1})).filter(v=>v.d>1e-7&&v.d<span-1e-7).sort((a,b)=>a.d-b.d).map(v=>v.p);
        path=[a,...between,b];
      }
      const lengths=path.slice(1).map((p,i)=>Math.hypot(p.x-path[i].x,p.y-path[i].y)),total=lengths.reduce((a,b)=>a+b,0);
      if(lengths.some(l=>l<1))return {ok:false,message:'El cambio dejaría un muro sin longitud válida.'};
      const pieces=[];let offset=0;for(let i=0;i<lengths.length;i++){
        const start=nodeAt(path[i],i===0?wall.startNodeId:null),end=nodeAt(path[i+1],i===lengths.length-1?wall.endNodeId:null);
        const piece={...clone(wall),id:i===0?wall.id:nextId('W',ids),x1:start.x,y1:start.y,x2:end.x,y2:end.y,startNodeId:start.id,endNodeId:end.id};
        delete piece.areaBinding;pieces.push({piece,offset,length:lengths[i]});result.walls.push(piece);offset+=lengths[i];
      }
      for(const opening of allOpenings.filter(o=>o.wallId===wall.id)){
        const oldLength=Math.hypot(wall.x2-wall.x1,wall.y2-wall.y1)||1,t=Number.isFinite(opening.offset)?opening.offset/oldLength:Number(opening.t??.5),center=Math.max(0,Math.min(1,t))*oldLength,half=Number(opening.width||90)/2;
        const part=pieces.find(p=>center-half>=p.offset-1e-6&&center+half<=p.offset+p.length+1e-6);
        if(!part)return {ok:false,message:`El nuevo contorno atraviesa o no deja espacio para la abertura ${opening.id}. Reubícala antes de cambiar el área.`};
        result.openings.push({...opening,wallId:part.piece.id,offset:center-part.offset,t:(center-part.offset)/part.length});
      }
      if(pieces.length>1){for(const room of result.rooms||[]){const nodes=room.nodeIds||[];for(let i=0;i<nodes.length;i++){const j=(i+1)%nodes.length;if(nodes[i]===wall.startNodeId&&nodes[j]===wall.endNodeId){nodes.splice(i+1,0,...pieces.slice(0,-1).map(p=>p.piece.endNodeId));break;}if(nodes[i]===wall.endNodeId&&nodes[j]===wall.startNodeId){nodes.splice(i+1,0,...pieces.slice(1).reverse().map(p=>p.piece.startNodeId));break;}}}}
    }
    result.meta.siteBoundary.pts=pts;
    // Shared free walls inherit moved endpoint nodes; never follow zone vertices.
    result.walls.forEach(w=>{const a=result.wallNodes.find(n=>n.id===w.startNodeId),b=result.wallNodes.find(n=>n.id===w.endNodeId);if(a){w.x1=a.x;w.y1=a.y;}if(b){w.x2=b.x;w.y2=b.y;}});
    result.walls.forEach(w=>v214BindWall(w,result));return {ok:true,layout:result};
  }
  function v214ApplyArea(next,zones=null,history=true){
    const plan=v214PlanArea(appState.layout,next);if(!plan.ok){showToast(plan.message,'warning',4200);return false;}
    if(typeof v213LayerLocked==='function'){
      if(v213LayerLocked('walls')&&JSON.stringify(plan.layout.walls)!==JSON.stringify(appState.layout.walls)){showToast('Desbloquea la capa Muros antes de cambiar el perímetro vinculado.','warning');return false;}
      if(v213LayerLocked('openings')&&JSON.stringify(plan.layout.openings)!==JSON.stringify(appState.layout.openings)){showToast('Desbloquea la capa Aberturas antes de cambiar sus muros vinculados.','warning');return false;}
      if(zones&&v213LayerLocked('zones')&&JSON.stringify(zones)!==JSON.stringify(appState.layout.zones)){showToast('Desbloquea la capa Zonas antes de ajustar sus límites.','warning');return false;}
    }
    if(history)recordHistorySnapshot('structure');
    if(zones)plan.layout.zones=clone(zones);
    Object.assign(appState.layout,{meta:plan.layout.meta,walls:plan.layout.walls,wallNodes:plan.layout.wallNodes,openings:plan.layout.openings,rooms:plan.layout.rooms});
    if(zones)appState.layout.zones=plan.layout.zones;
    syncManualWallsFromNodes();rebuildStreetNetwork();if(history)persistActiveLayout('perímetro del área');return true;
  }
  function v214AreaContext(){
    const boundary=appState.layout.meta.siteBoundary,index=appState.editor.areaWallEdgeIndex;
    if(!boundary?.pts?.length||!Number.isInteger(index)||index<0||index>=boundary.pts.length)return null;
    const a=boundary.pts[index],b=boundary.pts[(index+1)%boundary.pts.length],wall=findManualWallForZoneEdge(boundary,index);
    return {zone:boundary,area:boundary,edgeIndex:index,a,b,wall:wall?{...wall,enabled:true}:null,isWall:!!wall,length:Math.hypot(b.x-a.x,b.y-a.y)};
  }
  function v214AreaNode(point){
    const existing=(appState.layout.wallNodes||[]).find(n=>Math.hypot(n.x-point.x,n.y-point.y)<1e-7);if(existing)return existing;
    const node={id:nextWallNodeId(),x:point.x,y:point.y,areaAnchor:v214Anchor(layoutBoundaryPts(),point)};appState.layout.wallNodes.push(node);return node;
  }
  function v214WallGuard(wall){
    if(wall?.areaBinding?.start||wall?.areaBinding?.end){showToast('Este muro está vinculado al Área comercial. Edita sus vértices desde Área comercial.','warning',3200);return true;}return false;
  }
  function v214BoundWallLength(wall,units,anchor='start'){
    const moving=anchor==='end'?wall.areaBinding?.start:wall.areaBinding?.end,fixed=anchor==='end'?{x:wall.x2,y:wall.y2}:{x:wall.x1,y:wall.y1};
    if(!moving?.vertexId){showToast('Edita esta medida desde los vértices del Área comercial.','warning');return false;}
    const pts=clone(layoutBoundaryPts()),i=pts.findIndex(p=>p.cadVertexId===moving.vertexId),length=wallLength(wall);if(i<0||length<1)return false;
    const sign=anchor==='end'?-1:1;pts[i]={...pts[i],x:fixed.x+(wall.x2-wall.x1)/length*units*sign,y:fixed.y+(wall.y2-wall.y1)/length*units*sign};
    return v212Commit('area',pts,{label:'longitud del muro vinculado'});
  }
  function v214BeginZone(){
    if(v213LayerLocked('zones')){showToast('Desbloquea la capa Zonas.','warning');return;}
    v212SetMode('zones');appState.editor.mode='zone';appState.editor.zoneCreationHint=true;renderLayoutEditor();
  }
  function v214CreateZoneAt(point){
    if(appState.editor.mode!=='zone')return false;
    const bounds=layoutBoundaryBounds(),scale=getScaleCmPerUnit()/100;
    const w=Number(appState.editor.newZoneWidthM??Math.min(3,bounds.w*scale*.4))/scale,h=Number(appState.editor.newZoneHeightM??Math.min(2,bounds.h*scale*.4))/scale;
    if(!Number.isFinite(w)||!Number.isFinite(h)||w<1||h<1){showToast('Introduce ancho y alto válidos.','warning');return true;}
    const pts=[{x:point.x-w/2,y:point.y-h/2},{x:point.x+w/2,y:point.y-h/2},{x:point.x+w/2,y:point.y+h/2},{x:point.x-w/2,y:point.y+h/2}],id=nextZoneId(),problem=v209ZoneViolation(id,pts);
    if(problem){showToast(problem.reason==='outside'?'La zona debe quedar dentro del Área comercial.':`La zona se superpone con ${problem.name||problem.id}.`,'warning',3000);return true;}
    recordHistorySnapshot('structure');appState.layout.zones.push({id,name:'Zona '+id,color:v211ZoneColor(),kind:'virtual',pts});appState.selectedZoneId=id;appState.editor.mode='select';appState.editor.zoneCreationHint=false;persistActiveLayout('creación de zona');renderLayoutEditor();return true;
  }
  function v214CreationMarkup(){
    if(appState.editor.mode!=='zone')return '';
    const b=layoutBoundaryBounds(),u=getScaleCmPerUnit()/100;
    return `<section class="layout-prop-card v214-creation"><b>Nueva zona rectangular</b><p class="tiny muted">Indica el tamaño y haz clic en su centro dentro del área.</p><div class="layout-prop-grid two"><label>Ancho (m)<input id="v214ZoneWidth" type="number" min="0.01" step="0.01" value="${Number(appState.editor.newZoneWidthM??Math.min(3,b.w*u*.4)).toFixed(2)}"></label><label>Alto (m)<input id="v214ZoneHeight" type="number" min="0.01" step="0.01" value="${Number(appState.editor.newZoneHeightM??Math.min(2,b.h*u*.4)).toFixed(2)}"></label></div><button id="v214CancelZone" type="button" class="seg-btn">Cancelar</button></section>`;
  }
  function v214RenderAreaWallTargets(svg){
    if(activeLayoutWorkspace()!=='architecture'||appState.editor.architectureTool!=='walls'||appState.editor.mode!=='select')return;
    const boundary=appState.layout.meta.siteBoundary,px=1/(svg.getScreenCTM()?.a||1),g=svgEl('g',{class:'v214-area-wall-targets','data-v213-layer':'walls'});
    boundary.pts.forEach((a,i)=>{const b=boundary.pts[(i+1)%boundary.pts.length],line=svgEl('line',{x1:a.x,y1:a.y,x2:b.x,y2:b.y,'data-area-wall-edge':i,class:'v214-area-wall-edge'+(appState.editor.areaWallEdgeIndex===i?' active':''),'stroke-width':14*px,'pointer-events':'stroke'});
      line.addEventListener('pointerdown',e=>{if(v213LayerLocked('walls'))return;e.preventDefault();e.stopPropagation();appState.editor.areaWallEdgeIndex=i;appState.selectedZoneId='';appState.selectedEdge={zoneId:'',a:-1,b:-1};appState.selectedVertex={zoneId:'',idx:-1};appState.selectedOpeningId='';appState.selectedWallId=findManualWallForZoneEdge(boundary,i)?.id||'';renderLayoutEditor();});g.appendChild(line);
      const vertex=svgEl('circle',{cx:a.x,cy:a.y,r:5*px,fill:'#fff7e8',stroke:'#b88949','stroke-width':2*px,'pointer-events':'none'});g.appendChild(vertex);
    });svg.appendChild(g);
  }
  function v214RefreshInspector(){
    const panel=document.getElementById('layoutRightPanel');if(!panel)return;
    appState.editor.rightPanelScrollTop=0;panel.innerHTML=renderLayoutRightPanelMarkup();bindLayoutRightPanel();v213BindUx();v214SimplifyEditor();v215RedesignEditor();
    const svg=document.getElementById('layoutSvg');if(svg){const sel=appState.editor.geometrySelection;svg.querySelectorAll('[data-area-edge]').forEach(line=>{const active=sel?.type==='edge'&&Number(line.dataset.areaEdge)===sel.index;line.setAttribute('stroke',active?'#b87932':'transparent');});}
  }
  function v214SimplifyEditor(){
    const root=document.querySelector('.layout-cad-shell-v80');if(!root)return;
    const mode=appState.editor.architectureTool,architecture=activeLayoutWorkspace()==='architecture';
    // One compact overflow menu preserves the existing controls and handlers.
    const bar=root.querySelector('.layout-cad-localbar-v80');if(bar&&!bar.querySelector('.v214-more')){
      const more=document.createElement('div');more.className='v214-more';more.innerHTML='<button class="seg-btn" id="v214MoreToggle" type="button" aria-haspopup="true" aria-expanded="false">Más</button><div class="v214-more-menu" popover="auto" aria-label="Más herramientas"></div>';const menu=more.lastElementChild,toggle=more.firstElementChild;
      const selectors=['[data-layout-tag-action="toggle-ortho"]','[data-layout-tag-action="toggle-dims"]','#btnZoomFit','#btnToggleSections','[data-layout-tag-action="toggle-right-props"]','#btnPresentationMode','#v213OpenLayers'];
      selectors.forEach(selector=>{const el=bar.querySelector(selector);if(el)menu.appendChild(el);});bar.insertBefore(more,bar.querySelector('#btnSaveLayoutVisible'));
      toggle.onclick=()=>{const box=toggle.getBoundingClientRect(),zoom=Number(getComputedStyle(document.getElementById('appRoot')).zoom)||1;menu.style.left=Math.max(8,Math.min(window.innerWidth-220,box.left))/zoom+'px';menu.style.top=(box.bottom+8)/zoom+'px';menu.togglePopover();};
      menu.addEventListener('toggle',e=>toggle.setAttribute('aria-expanded',String(e.newState==='open')));
      menu.addEventListener('click',e=>{if(e.target.closest('button')&&menu.isConnected)menu.hidePopover();});
      menu.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopPropagation();menu.hidePopover();toggle.focus();}});
    }
    if(!architecture)return;
    root.dataset.v214Mode=mode;
    const rail=root.querySelector('.v80-tool-rail');if(rail){rail.querySelectorAll('button').forEach(btn=>{const key=btn.dataset.emode;btn.hidden=!['select','measure'].includes(key);if(mode==='walls'&&['door','opening'].includes(key)){const menu=bar.querySelector('.v214-more-menu');if(menu){btn.hidden=false;btn.title=key==='door'?'Colocar puerta':'Colocar abertura';menu.appendChild(btn);}}});}
    const pill=root.querySelector('.layout-type-pill');if(pill)pill.textContent=mode==='area'?'Área':mode==='walls'?appState.selectedOpeningId?'Abertura':'Muro':'Zona';
    const card=root.querySelector('.v212-editor');if(card){
      const advanced=card.querySelector('.v213-geometry');const moveInto=(id)=>{const el=card.querySelector('#'+id);if(el&&advanced){advanced.appendChild(el);el.classList.add('v214-advanced-action');}};
      ['v212AddPoint','v212RemovePoint','v212Duplicate','v212DeleteZone','v212Lock'].forEach(moveInto);
      ['v212Draw','v212Undo','v212Redo'].forEach(id=>{const el=card.querySelector('#'+id);if(el)el.hidden=true;});
      card.querySelector('#v213HistoryHint')?.setAttribute('hidden','');card.querySelector('.v213-help')?.setAttribute('hidden','');
      if(mode==='zones'&&advanced&&!advanced.querySelector('#v214DrawIrregularZone')){const btn=document.createElement('button');btn.id='v214DrawIrregularZone';btn.type='button';btn.className='seg-btn';btn.textContent='Dibujar zona irregular';btn.onclick=()=>v212BeginDraw('zones',{polygon:true});advanced.appendChild(btn);}
      if(advanced&&mode==='area')advanced.querySelector('#v213GeometryToggle').firstChild.textContent='Edición precisa del área ';
    }
    const context=root.querySelector('.layout-contextual-actions');if(context){context.querySelectorAll('[data-layout-context-action="ctx-mode-wall"]').forEach(el=>el.hidden=true);}
    const wall=root.querySelector('.wall-pro-card');if(wall){
      const endpoints=wall.querySelector('[data-layout-fold="wallEndpoints"]');
      ['rpWallAngle','rpWallHeight'].forEach(id=>{const label=wall.querySelector('#'+id)?.closest('label');if(label&&endpoints)endpoints.appendChild(label);});
      if(endpoints)endpoints.querySelector('summary').textContent='Más propiedades del muro';
      const actions=wall.querySelector(':scope > .layout-template-grid');if(actions&&endpoints)endpoints.appendChild(actions);
      const idLabel=wall.querySelector('input[disabled]')?.closest('label');if(idLabel&&endpoints)endpoints.appendChild(idLabel);
      if(appState.layout.walls.find(w=>w.id===appState.selectedWallId)?.areaBinding?.perimeter){const button=document.createElement('button');button.type='button';button.className='seg-btn';button.id='v214GoArea';button.textContent='Editar perímetro del área';button.onclick=()=>v212SetMode('area');wall.appendChild(button);}
    }
    const targets=['precision','technical','quick','area','zone','zoneActions','metrics'];
    const scroll=root.querySelector('.layout-right-scroll');if(scroll&&!scroll.querySelector('.v214-advanced-options')){
      const details=document.createElement('details');details.className='v214-advanced-options';details.innerHTML='<summary>Opciones avanzadas</summary><div></div>';const body=details.lastElementChild;
      targets.forEach(key=>{const fold=scroll.querySelector(`:scope > [data-layout-fold="${key}"]`);if(fold)body.appendChild(fold);});scroll.appendChild(details);
    }
    const create=root.querySelector('#v214ZoneWidth'),height=root.querySelector('#v214ZoneHeight');if(create)create.oninput=()=>appState.editor.newZoneWidthM=Number(create.value);if(height)height.oninput=()=>appState.editor.newZoneHeightM=Number(height.value);
    const cancel=root.querySelector('#v214CancelZone');if(cancel)cancel.onclick=()=>{appState.editor.mode='select';renderLayoutEditor();};
    const placement=root.querySelector('#rpWallPlacement');if(placement&&v213LayerLocked('walls'))placement.disabled=true;
    const wallTools=root.querySelector('.v203-wall-card');if(wallTools&&appState.selectedWallId&&appState.editor.mode!=='wall'){wallTools.hidden=true;}
  }
