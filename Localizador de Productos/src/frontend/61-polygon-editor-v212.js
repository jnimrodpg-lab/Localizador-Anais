  // V212 — editor poligonal de superficies lógicas; no crea muros al zonificar.
  function v212Target(kind=appState.editor.architectureTool){
    return kind==='area'?appState.layout.meta.siteBoundary:findZoneById(appState.selectedZoneId);
  }
  function v212SetMode(mode){
    appState.editor.architectureTool=['area','zones','walls'].includes(mode)?mode:'zones';
    cancelLayoutDrawing({render:false});appState.editor.mode='select';appState.editor.areaMoveMode=false;
    appState.editor.editSiteBoundary=mode==='area';appState.editor.geometrySelection=null;
    appState.selectedWallId='';appState.selectedOpeningId='';appState.selectedRoomId='';appState.selectedRackLayoutId='';
    appState.editor.selectedWallIds=[];appState.selectedVertex={zoneId:'',idx:-1};appState.selectedEdge={zoneId:'',a:-1,b:-1};
    if(mode==='area')appState.selectedZoneId='';
    appState.editor.layoutPanelOpen={...(appState.editor.layoutPanelOpen||{}),area:false,zone:false,geometry:false};appState.editor.geometryError=null;appState.editor.areaWallEdgeIndex=null;
    renderLayoutEditor();
  }
  function v212BeginDraw(kind,{polygon=false}={}){
    if(kind==='zones'&&!polygon&&typeof v214BeginZone==='function'){v214BeginZone();return;}
    if(!isStructureLayoutScreen())return;
    if(kind==='zones'&&typeof v213LayerLocked==='function'&&v213LayerLocked('zones')){showToast('Desbloquea la capa Zonas antes de dibujar.','warning');return;}
    if(kind==='area'&&v212Target('area')?.locked){showToast('Desbloquea el área antes de dibujar su perímetro.','warning');return;}
    v212SetMode(kind);appState.editor.mode='polygon';appState.editor.polygonDraft={kind,pts:[]};renderLayoutEditor();
  }
  function v212GeometryMarkup(){
    const mode=appState.editor.architectureTool;if(mode==='walls')return '';
    const target=v212Target(mode),pts=target?.pts||[],area=mode==='area';
    const sel=area?appState.editor.geometrySelection:appState.selectedVertex?.zoneId===target?.id&&appState.selectedVertex.idx>=0?{type:'vertex',index:appState.selectedVertex.idx}:appState.selectedEdge?.zoneId===target?.id&&appState.selectedEdge.a>=0?{type:'edge',index:appState.selectedEdge.a}:null;
    const i=Math.max(0,Math.min(pts.length-1,sel?.index||0)),a=pts[i],b=pts[(i+1)%pts.length],u=getScaleCmPerUnit()/100;
    const locked=!!target?.locked||(!area&&typeof v213LayerLocked==='function'&&v213LayerLocked('zones'));
    const pending=appState.editor.pendingAreaEdit;
    return `<section class="layout-prop-card v212-editor" data-focus="${sel?.type||'zone'}" aria-label="Editor ${area?'del área comercial':'de zonas'}"><div class="layout-prop-title">${area?'Área comercial · perímetro útil':'Zonas · polígonos virtuales'}</div>
      ${typeof v213IdentityMarkup==='function'?v213IdentityMarkup(target,area):''}
      <details class="v213-help"><summary>Cómo editar el contorno</summary><p class="tiny muted">Arrastra puntos y lados. Doble clic en un borde agrega un vértice; clic derecho en un punto lo elimina. Pulsa una cota para editar la longitud.</p></details>
      <div class="layout-template-grid"><button type="button" class="seg-btn" id="v212Draw">${area?'Dibujar nuevo perímetro':'Dibujar zona irregular'}</button><button type="button" class="seg-btn" id="v212Lock" ${!target?'disabled':''}>${locked?'Desbloquear':'Bloquear'} ${area?'área':'zona'}</button><button type="button" class="seg-btn" id="v212Undo">↶ Deshacer</button><button type="button" class="seg-btn" id="v212Redo">↷ Rehacer</button></div>
      ${appState.editor.polygonDraft?`<div class="v212-draft"><b>${appState.editor.polygonDraft.pts.length} puntos</b><p>Clic para agregar puntos con snap a límites existentes. Cierra con el botón o haciendo clic en el primer punto.</p><div class="layout-template-grid"><button type="button" class="btn primary" id="v212Finish">Cerrar polígono</button><button type="button" class="seg-btn" id="v212Back">Quitar último</button><button type="button" class="seg-btn" id="v212Cancel">Cancelar</button></div></div>`:''}
      ${pts.length?`<p class="tiny"><b>${escapeHtml(target.name||target.id||'Área comercial')}</b> · ${pts.length} vértices · ${(polygonAreaAbs(pts)*u*u).toFixed(2)} m² ${locked?'· Bloqueada':''}</p>
      <div class="layout-template-grid"><button type="button" class="seg-btn" id="v212AddPoint" ${locked?'disabled':''}>+ Vértice en lado</button><button type="button" class="seg-btn danger" id="v212RemovePoint" ${locked||pts.length<=3?'disabled':''}>Eliminar vértice</button>${!area?`<button type="button" class="seg-btn" id="v212Duplicate">Duplicar zona</button><button type="button" class="seg-btn danger" id="v212DeleteZone" ${locked?'disabled':''}>Eliminar zona</button>`:''}</div>
      <p class="tiny muted" id="v213HistoryHint"></p>
      <details class="v213-geometry" data-layout-fold="geometry" ${sel||layoutPanelOpen('geometry',false)?'open':''}><summary id="v213GeometryToggle">${sel?.type==='vertex'?'Coordenadas del vértice':sel?.type==='edge'?'Medidas del lado':'Edición precisa'} <span>Coordenadas · medidas · giro</span></summary>
      <label>Vértice<select id="v212VertexIndex">${pts.map((p,j)=>`<option value="${j}" ${i===j?'selected':''}>V${j+1} · ${(p.x*u).toFixed(2)}, ${(p.y*u).toFixed(2)} m</option>`).join('')}</select></label>
      <div class="v213-vertex-fields"><div class="layout-prop-grid two"><label>X (m)<input type="number" step="0.01" id="v212X" value="${(a.x*u).toFixed(3)}"></label><label>Y (m)<input type="number" step="0.01" id="v212Y" value="${(a.y*u).toFixed(3)}"></label></div><button type="button" class="seg-btn" id="v212ApplyPoint" ${locked?'disabled':''}>Aplicar coordenadas del vértice</button></div>
      <label style="margin-top:12px">Lado<select id="v212EdgeIndex">${pts.map((p,j)=>`<option value="${j}" ${i===j?'selected':''}>L${j+1} · V${j+1} → V${(j+1)%pts.length+1}</option>`).join('')}</select></label>
      <div class="v213-edge-fields"><div class="layout-prop-grid two"><label>Longitud (m)<input type="number" min="0.01" step="0.01" id="v212Length" value="${(Math.hypot(b.x-a.x,b.y-a.y)*u).toFixed(3)}"></label><label>Ángulo (°)<input type="number" min="0" max="360" step="0.1" id="v212Angle" value="${((Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI+360)%360).toFixed(2)}"></label><label>Desplazar lado (m)<input type="number" step="0.01" id="v212Offset" value="0"></label></div>
      <div class="layout-template-grid"><button type="button" class="seg-btn" id="v212ApplyEdge" ${locked?'disabled':''}>Aplicar medida y ángulo</button><button type="button" class="seg-btn" id="v212MoveEdge" ${locked?'disabled':''}>Desplazar lado</button></div></div>
      ${!area?`<div class="layout-prop-grid two"><label>Giro de zona (°)<input id="v212Rotation" type="number" min="0" max="360" step="0.1" value="0"></label><button type="button" class="seg-btn" id="v212Rotate" ${locked?'disabled':''}>Girar zona</button></div><button type="button" class="seg-btn" id="v212Split" ${locked?'disabled':''}>Dividir con dos puntos del borde</button>`:''}
      <small class="muted">Ángulo medido desde +X; +Y apunta hacia abajo en el plano. Los límites compartidos se editan juntos. Las zonas pueden ser colindantes; no superponerse.</small></details>`:'<p class="tiny muted">Selecciona una zona o dibuja un polígono nuevo.</p>'}
      ${pending?`<div class="v212-review" role="status"><b>Revisar cambio del área</b><p>El nuevo perímetro afecta: ${pending.affected.map(id=>escapeHtml(findZoneById(id)?.name||id)).join(', ')}. El contorno propuesto aparece en naranja.</p><div class="layout-template-grid"><button class="seg-btn" id="v212AdjustArea">Ajustar límites compartidos</button><button class="seg-btn" id="v212KeepArea">Conservar zonas para corregir</button><button class="seg-btn" id="v212CancelArea">Cancelar cambio</button></div><small>El ajuste solo se aplica si mantiene polígonos válidos y sin traslapes. Ninguna zona se elimina.</small></div>`:''}
    </section>`;
  }
  function v212Select(kind,type,index){
    if(kind==='area'){appState.editor.geometrySelection={type,index};appState.editor.areaEdgeIndex=type==='edge'?index:appState.editor.areaEdgeIndex||0;}
    else if(type==='vertex'){appState.selectedVertex={zoneId:appState.selectedZoneId,idx:index};appState.selectedEdge={zoneId:'',a:-1,b:-1};}
    else {const z=v212Target(kind);appState.selectedEdge={zoneId:z.id,a:index,b:(index+1)%z.pts.length};appState.selectedVertex={zoneId:'',idx:-1};}
    renderLayoutEditor();
  }
  function v212BindGeometryPanel(){
    const mode=appState.editor.architectureTool;if(mode==='walls')return;
    const on=(id,fn)=>{const el=$('#'+id);if(el)el.onclick=fn;};
    const value=id=>Number($('#'+id)?.value),kind=mode==='area'?'area':'zones';
    on('v212Draw',()=>v212BeginDraw(kind));
    on('v212Lock',()=>{const t=v212Target(kind);if(!t)return;recordHistorySnapshot('structure');t.locked=!t.locked;persistActiveLayout();renderLayoutEditor();});
    on('v212Undo',()=>{appState.editor.pendingAreaEdit=null;appState.editor.polygonDraft=null;undoHistory('structure');});on('v212Redo',()=>redoHistory('structure'));
    on('v212Finish',v212FinishPolygon);on('v212Back',()=>{appState.editor.polygonDraft?.pts.pop();renderLayoutEditor();});on('v212Cancel',()=>{cancelLayoutDrawing({render:false});appState.editor.mode='select';renderLayoutEditor();});
    const vi=$('#v212VertexIndex'),ei=$('#v212EdgeIndex');if(vi)vi.onchange=()=>v212Select(kind,'vertex',Number(vi.value));if(ei)ei.onchange=()=>v212Select(kind,'edge',Number(ei.value));
    on('v212ApplyPoint',()=>{const t=v212Target(kind);if(!t)return;const index=value('v212VertexIndex'),u=100/getScaleCmPerUnit(),next=clone(t.pts);next[index]={...next[index],x:value('v212X')*u,y:value('v212Y')*u};v212Commit(kind,next);});
    on('v212ApplyEdge',()=>{const t=v212Target(kind),index=value('v212EdgeIndex');if(!t)return;const length=value('v212Length')*100/getScaleCmPerUnit(),angle=value('v212Angle')*Math.PI/180;if(!Number.isFinite(length)||length<=0)return;const next=clone(t.pts),a=next[index];next[(index+1)%next.length]={...next[(index+1)%next.length],x:a.x+length*Math.cos(angle),y:a.y+length*Math.sin(angle)};v212Commit(kind,next);});
    on('v212MoveEdge',()=>{const t=v212Target(kind),index=value('v212EdgeIndex');if(!t)return;v212Commit(kind,v212OffsetEdge(t.pts,index,value('v212Offset')*100/getScaleCmPerUnit()));});
    on('v212Duplicate',duplicateSelectedZone);on('v212DeleteZone',()=>v211DeleteZone(appState.selectedZoneId));
    on('v212AddPoint',()=>v212Insert(kind,value('v212EdgeIndex')));on('v212RemovePoint',()=>v212Remove(kind,value('v212VertexIndex')));
    on('v212Rotate',()=>{const t=v212Target(kind);if(!t)return;const angle=value('v212Rotation')*Math.PI/180,c=polygonCentroid(t.pts);v212Commit(kind,t.pts.map(p=>({x:c.x+(p.x-c.x)*Math.cos(angle)-(p.y-c.y)*Math.sin(angle),y:c.y+(p.x-c.x)*Math.sin(angle)+(p.y-c.y)*Math.cos(angle)})));});
    on('v212Split',()=>{appState.editor.polygonDraft={kind:'split',zoneId:appState.selectedZoneId,pts:[]};appState.editor.mode='polygon';showToast('Selecciona dos puntos sobre el borde de la zona.','success',3000);renderLayoutEditor();});
    on('v212CancelArea',()=>{appState.editor.pendingAreaEdit=null;renderLayoutEditor();});
    on('v212KeepArea',()=>{const p=appState.editor.pendingAreaEdit;if(p){if(v212ApplyArea(p.pts)===false)return;appState.editor.pendingAreaEdit=null;renderLayoutEditor();}});
    on('v212AdjustArea',()=>{const p=appState.editor.pendingAreaEdit;if(!p)return;const old=layoutBoundaryPts(),zones=clone(appState.layout.zones);
      zones.forEach(z=>z.pts=z.pts.map(pt=>{const index=old.findIndex(v=>v211SamePoint(v,pt));return index>=0&&p.pts.length===old.length?clone(p.pts[index]):pt;}));
      const trial={...appState.layout,meta:{...appState.layout.meta,siteBoundary:{...v212Target('area'),pts:p.pts}},zones};
      const invalid=zones.find(z=>v209ZoneViolation(z.id,z.pts,trial)||z.locked&&JSON.stringify(z.pts)!==JSON.stringify(findZoneById(z.id)?.pts));
      if(invalid){showToast('No es posible ajustar automáticamente '+(invalid.name||invalid.id)+'. Corrige el perímetro o conserva las zonas para editarlas.','warning',4200);return;}
      if(v212ApplyArea(p.pts,zones)===false)return;appState.editor.pendingAreaEdit=null;renderLayoutEditor();
    });
  }
  function v212OffsetEdge(pts,index,distance){
    const result=clone(pts),a=pts[index],b=pts[(index+1)%pts.length],len=Math.hypot(b.x-a.x,b.y-a.y)||1,nx=-(b.y-a.y)/len,ny=(b.x-a.x)/len;
    result[index]={...result[index],x:a.x+nx*distance,y:a.y+ny*distance};result[(index+1)%pts.length]={...result[(index+1)%pts.length],x:b.x+nx*distance,y:b.y+ny*distance};return result;
  }
  function v212Commit(kind,next,{preview=false,label='geometría'}={}){
    const target=v212Target(kind);if(!target||target.locked||kind==='zones'&&typeof v213LayerLocked==='function'&&v213LayerLocked('zones')||!v209SimplePolygon(next)){if(target)appState.editor.geometryError={pts:clone(next),message:'Geometría inválida o bloqueada'};showToast('Geometría bloqueada o inválida: revisa cruces, vértices y longitudes.','warning',2600);if(!preview&&typeof v213ShowGeometryError==='function')v213ShowGeometryError(document.getElementById('layoutSvg'));return false;}
    if(kind==='area'){
      const affected=appState.layout.zones.filter(z=>!v209ZoneInsideArea(z.pts,next)).map(z=>z.id);
      if(affected.length){if(!preview){appState.editor.pendingAreaEdit={pts:clone(next),affected};renderLayoutEditor();}return false;}
      if(preview)return v212ApplyArea(next,null,false)!==false;
      if(v212ApplyArea(next)===false)return false;appState.editor.pendingAreaEdit=null;
    } else {
      const changes=v212ZoneChanges(target,next),blocked=[...changes.keys()].find(id=>findZoneById(id)?.locked);
      const problem=v211ValidateZoneEdits(changes);
      if(blocked||problem){const message=blocked?`El límite pertenece a ${findZoneById(blocked)?.name||blocked}, que está bloqueada.`:problem.reason==='outside'?'El contorno sale del área comercial.':`El contorno se superpone con ${problem.name||problem.id||'otra zona'}.`;appState.editor.geometryError={pts:clone(next),message};showToast(message,'warning',3200);if(!preview&&typeof v213ShowGeometryError==='function')v213ShowGeometryError(document.getElementById('layoutSvg'));return false;}
      if(!preview)recordHistorySnapshot('structure');v211ApplyZoneEdits(changes);
    }
    appState.editor.geometryError=null;if(!preview){persistActiveLayout(label);renderLayoutEditor();}return true;
  }
  function v212ZoneChanges(target,next,zones=appState.layout.zones){
    const changes=new Map([[target.id,clone(next)]]);
    // Igual cantidad de puntos: propagar cada punto de un límite compartido,
    // incluidos puntos intermedios sobre una arista que no tiene el mismo número de vértices.
    if(next.length!==target.pts.length)return changes;
    zones.forEach(z=>{if(z.id===target.id)return;let changed=false;
      const pts=z.pts.map(pt=>{for(let i=0;i<target.pts.length;i++){
        const a=target.pts[i],b=target.pts[(i+1)%target.pts.length],na=next[i],nb=next[(i+1)%next.length];
        if(v209PointOnSegment(pt,a,b,.12)){
          const den=(b.x-a.x)**2+(b.y-a.y)**2,t=den?((pt.x-a.x)*(b.x-a.x)+(pt.y-a.y)*(b.y-a.y))/den:0;
          const p={x:na.x+(nb.x-na.x)*t,y:na.y+(nb.y-na.y)*t};if(!v211SamePoint(pt,p,.00001))changed=true;return p;
        }
      }return clone(pt);});if(changed)changes.set(z.id,pts);
    });return changes;
  }
  function v212ApplyArea(next,zones=null,history=true){
    if(typeof v214ApplyArea==='function')return v214ApplyArea(next,zones,history);
    const old=clone(layoutBoundaryPts());if(history)recordHistorySnapshot('structure');
    // Mover solo nodos/endpoints coincidentes con vértices del área; IDs y vanos se conservan.
    if(old.length===next.length){
      const moved=pt=>{const i=old.findIndex(p=>v211SamePoint(p,pt));return i>=0?next[i]:null;};
      appState.layout.wallNodes?.forEach(n=>{const p=moved(n);if(p){n.x=p.x;n.y=p.y;}});
      appState.layout.walls?.forEach(w=>{const a=moved({x:w.x1,y:w.y1}),b=moved({x:w.x2,y:w.y2});if(a){w.x1=a.x;w.y1=a.y;}if(b){w.x2=b.x;w.y2=b.y;}});
      syncManualWallsFromNodes();
    }
    appState.layout.meta.siteBoundary.pts=clone(next);appState.layout.meta.autoFitBoundaryToZones=false;
    if(zones)appState.layout.zones=zones;rebuildStreetNetwork();if(history)persistActiveLayout();
  }
  function v212Insert(kind,index,point=null){
    const target=v212Target(kind);if(!target||target.locked||appState.editor.zonesLocked&&kind!=='area')return false;
    const a=target.pts[index],b=target.pts[(index+1)%target.pts.length];if(!a||!b)return false;
    const p=point?projectPointToSegment(point,a,b):{x:(a.x+b.x)/2,y:(a.y+b.y)/2};
    if(Math.hypot(p.x-a.x,p.y-a.y)<1||Math.hypot(p.x-b.x,p.y-b.y)<1)return false;
    const next=clone(target.pts);next.splice(index+1,0,{x:p.x,y:p.y});
    if(kind==='area'){if(!v212Commit(kind,next))return false;appState.editor.geometrySelection={type:'vertex',index:index+1};}
    else {
      const changes=new Map([[target.id,next]]);
      appState.layout.zones.forEach(z=>{if(z.id===target.id)return;const j=z.pts.findIndex((a,j)=>v211PointOnSegmentSafe(p,a,z.pts[(j+1)%z.pts.length]));if(j>=0){const pts=clone(z.pts);pts.splice(j+1,0,{x:p.x,y:p.y});changes.set(z.id,pts);}});
      if([...changes.keys()].some(id=>findZoneById(id)?.locked)||v211ValidateZoneEdits(changes))return false;
      recordHistorySnapshot('structure');v211ApplyZoneEdits(changes);appState.selectedVertex={zoneId:target.id,idx:index+1};appState.selectedEdge={zoneId:'',a:-1,b:-1};persistActiveLayout();
    }
    renderLayoutEditor();return true;
  }
  function v212Remove(kind,index){
    const t=v212Target(kind);if(!t||t.locked||t.pts.length<=3){showToast('El polígono debe conservar al menos tres vértices.','warning');return false;}
    const next=clone(t.pts);const removed=next.splice(index,1)[0];let ok;
    if(kind==='area')ok=v212Commit(kind,next);
    else {const changes=new Map([[t.id,next]]);appState.layout.zones.forEach(z=>{if(z.id===t.id)return;const j=z.pts.findIndex(p=>v211SamePoint(p,removed));if(j>=0){const pts=clone(z.pts);pts.splice(j,1);changes.set(z.id,pts);}});
      const invalid=v211ValidateZoneEdits(changes);if(invalid||[...changes.keys()].some(id=>findZoneById(id)?.locked)){showToast('No se puede eliminar el vértice compartido: revisa geometría y bloqueos.','warning');return false;}
      recordHistorySnapshot('structure');v211ApplyZoneEdits(changes);persistActiveLayout();ok=true;
    }
    if(ok){appState.editor.geometrySelection=null;appState.selectedVertex={zoneId:'',idx:-1};appState.selectedEdge={zoneId:'',a:-1,b:-1};renderLayoutEditor();}return ok;
  }
  function v212Snap(raw,origin=null){
    if(!isSnapEnabled()){appState.editor.geometrySnapPreview=null;return{x:raw.x,y:raw.y};}
    const points=[...layoutBoundaryPts(),...appState.layout.zones.flatMap(z=>z.pts),...(appState.layout.wallNodes||[])];
    const svg=$('#layoutSvg'),threshold=svg?appState.editor.viewBox.w/Math.max(1,svg.getBoundingClientRect().width)*10:10;
    const nearest=points.map(p=>({p,d:Math.hypot(raw.x-p.x,raw.y-p.y)})).sort((a,b)=>a.d-b.d)[0];if(nearest?.d<threshold){appState.editor.geometrySnapPreview={point:nearest.p,label:'Vértice',kind:'vertex'};return{x:nearest.p.x,y:nearest.p.y};}
    const edges=[layoutBoundaryPts(),...appState.layout.zones.map(z=>z.pts)];let best={d:threshold,p:null};
    edges.forEach(poly=>poly.forEach((a,i)=>{const p=projectPointToSegment(raw,a,poly[(i+1)%poly.length]),d=Math.hypot(p.x-raw.x,p.y-raw.y);if(d<best.d)best={p,d};}));
    const p=best.p?{x:best.p.x,y:best.p.y}:{x:snapGrid(raw.x),y:snapGrid(raw.y)};appState.editor.geometrySnapPreview=best.p?{point:p,label:'Arista',kind:'edge'}:null;
    if(origin&&appState.editor.orthoEnabled){if(Math.abs(p.x-origin.x)>Math.abs(p.y-origin.y))p.y=origin.y;else p.x=origin.x;}return p;
  }
  function v212FinishPolygon(){
    const draft=appState.editor.polygonDraft;if(!draft)return false;
    if(draft.kind!=='area'&&typeof v213LayerLocked==='function'&&v213LayerLocked('zones'))return false;
    if(draft.kind==='split')return v212SplitZone(draft.zoneId,draft.pts);
    if(!v209SimplePolygon(draft.pts)){showToast('Dibuja al menos tres puntos, sin cruces ni lados repetidos.','warning');return false;}
    if(draft.kind==='area'){
      // Conservar borrador si no se pudo aceptar; la revisión tiene el candidato completo.
      const ok=v212Commit('area',draft.pts);if(!ok&&!appState.editor.pendingAreaEdit)return false;
    } else {
      const id=nextZoneId(),problem=v209ZoneViolation(id,draft.pts);if(problem){showToast('No se puede crear la zona: '+problem.name,'warning');return false;}
      recordHistorySnapshot('structure');appState.layout.zones.push({id,name:'Zona '+id,kind:'virtual',color:v211ZoneColor(),pts:clone(draft.pts)});appState.selectedZoneId=id;persistActiveLayout();
    }
    appState.editor.polygonDraft=null;appState.editor.mode='select';renderLayoutEditor();return true;
  }
  function v212SplitPolygons(pts,a,b){
    if(Math.hypot(a.x-b.x,a.y-b.y)<1)return null;
    const path=clone(pts);
    for(const p of [a,b]){if(path.some(q=>v211SamePoint(q,p)))continue;const index=path.findIndex((q,i)=>v211PointOnSegmentSafe(p,q,path[(i+1)%path.length]));if(index<0)return null;path.splice(index+1,0,clone(p));}
    const ia=path.findIndex(p=>v211SamePoint(p,a)),ib=path.findIndex(p=>v211SamePoint(p,b));if(ia<0||ib<0)return null;
    const walk=(from,to)=>{const out=[path[from]];for(let j=(from+1)%path.length;j!==to;j=(j+1)%path.length){out.push(path[j]);if(out.length>path.length)return [];}out.push(path[to]);return out;};
    const first=walk(ia,ib),second=walk(ib,ia);
    if(!v209SimplePolygon(first)||!v209SimplePolygon(second)||!v209ZoneInsideArea(first,pts)||!v209ZoneInsideArea(second,pts)||Math.abs(polygonAreaAbs(first)+polygonAreaAbs(second)-polygonAreaAbs(pts))>.1)return null;
    return [first,second];
  }
  function v212SplitZone(id,points){
    const zone=findZoneById(id);if(!zone||zone.locked||points.length!==2)return false;
    const result=v212SplitPolygons(zone.pts,...points);if(!result){showToast('La línea debe unir dos bordes y quedar dentro de la zona, formando dos polígonos válidos.','warning',3500);return false;}
    const nextId=nextZoneId(),one={...zone,pts:result[0]},two={...clone(zone),id:nextId,name:(zone.name||id)+' · B',color:v211ZoneColor(),pts:result[1]},refs=[];
    const trial={...appState.layout,zones:appState.layout.zones.filter(z=>z.id!==id).concat(one,two)};
    if(v209ZoneViolation(one.id,one.pts,trial)||v209ZoneViolation(two.id,two.pts,trial))return false;
    for(const rack of appState.layout.racks.filter(r=>r.zoneId===id)){if(rackFullyInsideZone(rack,one))refs.push([rack,id]);else if(rackFullyInsideZone(rack,two))refs.push([rack,nextId]);else{showToast('Mueve primero el rack '+rack.id+': la división lo atraviesa.','warning');return false;}}
    recordHistorySnapshot('structure');zone.pts=clone(one.pts);appState.layout.zones.push(two);refs.forEach(([r,id])=>r.zoneId=id);appState.editor.polygonDraft=null;appState.editor.mode='select';persistActiveLayout();renderLayoutEditor();return true;
  }
  function v212CanvasDown(e,svg){
    if(activeLayoutWorkspace()!=='architecture')return false;
    const draft=appState.editor.polygonDraft;if(!draft||e.button!==0)return false;
    e.preventDefault();e.stopPropagation();const raw=svgPoint(e,svg);
    let p=v212Snap(raw,draft.pts.at(-1));
    if(draft.kind==='split'){
      const z=findZoneById(draft.zoneId);if(!z)return true;let best={d:Infinity};z.pts.forEach((a,i)=>{const q=projectPointToSegment(raw,a,z.pts[(i+1)%z.pts.length]),d=Math.hypot(raw.x-q.x,raw.y-q.y);if(d<best.d)best={d,p:q};});
      const limit=appState.editor.viewBox.w/Math.max(1,svg.getBoundingClientRect().width)*15;if(best.d>limit){showToast('Elige un punto sobre el borde de la zona.','warning');return true;}p={x:best.p.x,y:best.p.y};
    }
    if(draft.pts.length>=3&&Math.hypot(p.x-draft.pts[0].x,p.y-draft.pts[0].y)<1){v212FinishPolygon();return true;}
    if(draft.pts.at(-1)&&v211SamePoint(p,draft.pts.at(-1)))return true;
    draft.pts.push(p);if(draft.kind==='split'&&draft.pts.length===2)v212FinishPolygon();else renderLayoutEditor();return true;
  }
  function v212RenderGeometryOverlay(svg,layer){
    if(activeLayoutWorkspace()!=='architecture')return;
    // Capture at the canvas before zone/wall handlers; drawing never starts a drag.
    if(!svg.dataset.v212Capture){svg.dataset.v212Capture='1';svg.addEventListener('pointerdown',e=>{
      if(appState.editor.polygonDraft&&e.button===0){e.stopImmediatePropagation();v212CanvasDown(e,svg);return;}
    },true);svg.addEventListener('mousedown',e=>{if(e.detail>=2)v212AddAtEvent(e,svg);},true);svg.addEventListener('dblclick',e=>v212AddAtEvent(e,svg),true);}
    const pending=appState.editor.pendingAreaEdit;if(pending)layer.appendChild(svgEl('path',{d:pathFromPts(pending.pts),fill:'rgba(205,137,61,.10)',stroke:'#b87932','stroke-width':2,'stroke-dasharray':'6 4','pointer-events':'none'}));
    const draft=appState.editor.polygonDraft;if(draft){const p=draft.pts;if(p.length)layer.appendChild(svgEl('path',{d:p.map((v,i)=>`${i?'L':'M'} ${v.x} ${v.y}`).join(' '),fill:'none',stroke:'#267760','stroke-width':2,'pointer-events':'none'}));p.forEach((v,i)=>layer.appendChild(svgEl('circle',{cx:v.x,cy:v.y,r:5,fill:i===0?'#b87932':'#267760','pointer-events':'none'})));}
    if(appState.editor.architectureTool!=='area'||appState.editor.mode!=='select')return;
    const t=v212Target('area');if(!t)return;const pts=t.pts,px=appState.editor.viewBox.w/Math.max(1,svg.getBoundingClientRect().width);
    pts.forEach((p,i)=>{const q=pts[(i+1)%pts.length],selected=appState.editor.geometrySelection?.type==='edge'&&appState.editor.geometrySelection.index===i;
      const line=svgEl('line',{x1:p.x,y1:p.y,x2:q.x,y2:q.y,stroke:selected?'#b87932':'transparent','stroke-width':selected?4*px:14*px,'pointer-events':'stroke',style:'cursor:move','data-area-edge':i});
      line.addEventListener('pointerdown',e=>v212AreaDrag(e,svg,'edge',i));layer.appendChild(line);
      const u=getScaleCmPerUnit()/100,label=svgEl('text',{x:(p.x+q.x)/2,y:(p.y+q.y)/2-8*px,'text-anchor':'middle',style:`font-size:${11*px}px;fill:#805b30;pointer-events:none`});label.textContent=`L${i+1}`;if(!appState.editor.showDims)layer.appendChild(label);
    });
    pts.forEach((p,i)=>{const circle=svgEl('circle',{cx:p.x,cy:p.y,r:6*px,fill:'#fff8e9',stroke:'#b87932','stroke-width':2*px,'data-site-vertex':i,style:'cursor:move;touch-action:none'});
      circle.addEventListener('pointerdown',e=>v212AreaDrag(e,svg,'vertex',i));circle.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();v212Remove('area',i);});layer.appendChild(circle);
    });
  }
  function v212AddAtEvent(e,svg){
    if(e.target.closest?.('[data-v213-ui]')||appState.editor.polygonDraft||appState.editor.architectureTool==='walls'||e.button!==0)return;
    const kind=appState.editor.architectureTool,target=v212Target(kind);if(!target)return;
    const raw=svgPoint(e,svg),threshold=appState.editor.viewBox.w/Math.max(1,svg.getBoundingClientRect().width)*10;let hit={d:threshold,index:-1};
    target.pts.forEach((a,i)=>{const q=projectPointToSegment(raw,a,target.pts[(i+1)%target.pts.length]),d=Math.hypot(raw.x-q.x,raw.y-q.y);if(d<hit.d)hit={d,index:i};});
    if(hit.index<0)return;e.preventDefault();e.stopImmediatePropagation();
    const last=appState.editor.lastVertexInsertion,now=performance.now();if(last&&now-last.time<1000&&Math.hypot(e.clientX-last.x,e.clientY-last.y)<6)return;
    appState.editor.dragging=null;
    if(v212Insert(kind,hit.index,raw))appState.editor.lastVertexInsertion={time:now,x:e.clientX,y:e.clientY};
  }
  function v212AreaDrag(e,svg,type,index){
    if(e.button!==0)return;e.preventDefault();e.stopPropagation();
    appState.editor.geometrySelection={type,index};appState.editor.areaEdgeIndex=type==='edge'?index:0;
    if(v212Target('area')?.locked){renderLayoutEditor();return;}
    const original=clone(layoutBoundaryPts()),start=svgPoint(e,svg);let next=original,lastValid=original,moved=false;
    const move=evt=>{const p=v212Snap(svgPoint(evt,svg)),dx=p.x-start.x,dy=p.y-start.y;if(typeof v213DrawSnap==='function')v213DrawSnap(svg);
      if(Math.hypot(dx,dy)<1)return;
      next=type==='vertex'?original.map((v,j)=>j===index?p:v):(()=>{const a=original[index],b=original[(index+1)%original.length],len=Math.hypot(b.x-a.x,b.y-a.y)||1;return v212OffsetEdge(original,index,dx*-(b.y-a.y)/len+dy*(b.x-a.x)/len);})();
      if(!v209SimplePolygon(next)){next=lastValid;return;}lastValid=next;moved=true;
      // A preview path does not mutate zones or walls before release.
      let path=svg.querySelector('[data-area-preview]');if(!path){path=svgEl('path',{'data-area-preview':'1',fill:'rgba(205,137,61,.1)',stroke:'#b87932','stroke-width':2,'pointer-events':'none'});svg.appendChild(path);}path.setAttribute('d',pathFromPts(next));
    };
    const cleanup=()=>{appState.editor.geometrySnapPreview=null;window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',cancel);};
    const finish=()=>{cleanup();if(moved)v212Commit('area',next);else if(typeof v214RefreshInspector==='function')v214RefreshInspector();else renderLayoutEditor();};
    const cancel=()=>{cleanup();renderLayoutEditor();};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',finish,{once:true});window.addEventListener('pointercancel',cancel,{once:true});
  }
