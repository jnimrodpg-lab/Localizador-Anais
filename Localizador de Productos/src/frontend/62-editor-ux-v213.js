  // V213: edición contextual. Los controles visuales no son datos del plano.
  const V213_PLACEMENTS = [['inside','Adentro'],['center','Centro'],['outside','Afuera']];
  const V213_LAYERS = [['zones','Zonas','showZones'],['walls','Muros','wallsVisible'],['openings','Aberturas','openingsVisible'],['racks','Racks','racksVisible']];

  function v213LayerLocked(key){
    return !!appState.editor?.layerLocks?.[key] || (key==='zones' && !!appState.editor?.zonesLocked);
  }
  function v213SelectionLocked(){
    return appState.selectedOpeningId?v213LayerLocked('openings'):appState.selectedWallId?v213LayerLocked('walls'):isRackDistributionScreen()?v213LayerLocked('racks'):v213LayerLocked('zones');
  }
  function v213DrawSnap(svg){
    svg.querySelector('[data-v213-snap]')?.remove();
    const snap=appState.editor.geometrySnapPreview;if(!snap?.point)return;
    const p=snap.point,px=1/(svg.getScreenCTM()?.a||1),box=svg.viewBox.baseVal;
    const g=svgEl('g',{'data-v213-snap':'1','pointer-events':'none'});
    g.appendChild(svgEl('path',{d:`M ${box.x} ${p.y} H ${box.x+box.width} M ${p.x} ${box.y} V ${box.y+box.height}`,stroke:'#53b38d',opacity:.55,'stroke-width':px,'stroke-dasharray':`${5*px} ${5*px}`}));
    g.appendChild(svgEl('circle',{cx:p.x,cy:p.y,r:6*px,stroke:'#53b38d',fill:'none','stroke-width':2*px}));svg.appendChild(g);
  }
  function v213SelectedPart(){
    const area=appState.editor.architectureTool==='area';
    if(area)return appState.editor.geometrySelection || null;
    const id=appState.selectedZoneId;
    if(appState.selectedVertex?.zoneId===id && appState.selectedVertex.idx>=0)return {type:'vertex',index:appState.selectedVertex.idx};
    if(appState.selectedEdge?.zoneId===id && appState.selectedEdge.a>=0)return {type:'edge',index:appState.selectedEdge.a};
    return null;
  }
  function v213SelectionTitle(){
    if(isRackDistributionScreen()){const r=findRackById(appState.selectedRackLayoutId);return r?`Editando rack: ${v222RackCode(r)}`:'Selecciona un rack';}
    if(activeLayoutWorkspace()!=='architecture')return 'Edición de calles y veredas';
    const opening=findOpeningById(appState.selectedOpeningId),wall=findWallById(appState.selectedWallId);
    if(opening)return `Editando abertura: ${opening.id}`;
    if(appState.editor.architectureTool==='walls'&&appState.editor.mode==='wall')return appState.editor.pendingWallPoint?'Trazado continuo · siguiente extremo':'Trazado continuo · punto inicial';
    if(appState.editor.architectureTool==='walls')return wall?`Editando muro: ${wall.name||wall.id}`:'Selecciona un muro o una arista';
    const target=v212Target(),sel=v213SelectedPart();
    if(!target)return 'Selecciona una zona';
    const name=target.name||target.id||'Área comercial';
    return sel?`Editando ${sel.type==='edge'?'lado':'vértice'} ${sel.index+1} · ${name}`:`Editando ${appState.editor.architectureTool==='area'?'área':'zona'}: ${name}`;
  }
  function v213RenameZone(id,raw){
    const zone=findZoneById(id),name=String(raw||'').trim().slice(0,80);
    if(!zone || !name){showToast('Escribe un nombre para la zona.','warning');return false;}
    if(v213LayerLocked('zones')){showToast('Desbloquea la capa Zonas para editarla.','warning');return false;}
    if(zone.name===name)return true;
    recordHistorySnapshot('structure');zone.name=name;appState.editor.focusInspectorTop=true;
    persistActiveLayout('cambio de nombre');renderLayoutEditor();return true;
  }
  function v213IdentityMarkup(target,area){
    if(!target)return '';
    const sel=v213SelectedPart();
    return `<div class="v213-identity"><p class="v213-editing" role="status">${escapeHtml(v213SelectionTitle())}</p>${!area?`<label>Nombre de zona<input id="v213ZoneName" maxlength="80" value="${escapeHtml(target.name||target.id)}" placeholder="Ej. Despacho"></label><div class="v213-zone-meta"><label>Color<input type="color" id="v213ZoneColor" value="${escapeHtml(target.color||'#72b58b')}"></label><span>Código: <b>${escapeHtml(target.id)}</b></span></div>`:''}${sel?`<small>${sel.type==='edge'?'Arrastra el lado o pulsa su medida para editarla.':'Arrastra el vértice o introduce sus coordenadas.'}</small>`:area?'<small>Selecciona un vértice o un lado del perímetro.</small>':'<small>Doble clic en el nombre del plano para renombrar.</small>'}</div>`;
  }
  function v213LayersMarkup(){
    return `<div class="v213-layers">${V213_LAYERS.map(([key,label,visible])=>`<div class="v213-layer-row"><span>${label}</span><button type="button" class="seg-btn" data-v213-visible="${visible}" aria-pressed="${appState.editor[visible]!==false}" aria-label="${appState.editor[visible]!==false?'Ocultar':'Mostrar'} ${label}">${appState.editor[visible]!==false?'Visible':'Oculta'}</button><button type="button" class="seg-btn" data-v213-lock="${key}" aria-pressed="${v213LayerLocked(key)}" aria-label="${v213LayerLocked(key)?'Desbloquear':'Bloquear'} capa ${label}">${v213LayerLocked(key)?'Bloqueada':'Editable'}</button></div>`).join('')}<div class="v213-layer-row"><span>Cuadrícula</span><button class="seg-btn" data-v213-visible="showGrid" aria-pressed="${appState.editor.showGrid!==false}">${appState.editor.showGrid!==false?'Visible':'Oculta'}</button></div><div class="v213-layer-row"><span>Cotas</span><button class="seg-btn" data-v213-visible="showDims" aria-pressed="${!!appState.editor.showDims}">${appState.editor.showDims?'Visibles':'Ocultas'}</button></div></div>`;
  }
  function v213ClosePopover(){
    document.getElementById('v213CanvasPopover')?.remove();
    document.querySelectorAll('[data-v213-preview]').forEach(el=>el.remove());
  }
  function v213Popover(svg,anchor,title,html){
    v213ClosePopover();
    const card=svg.closest('.layout-canvas-card');if(!card)return null;
    const box=card.getBoundingClientRect(),pt=svg.createSVGPoint();pt.x=anchor.x;pt.y=anchor.y;
    const screen=pt.matrixTransform(svg.getScreenCTM()),el=document.createElement('section');
    el.id='v213CanvasPopover';el.className='v213-popover';el.setAttribute('role','dialog');el.setAttribute('aria-label',title);
    el.innerHTML=`<div class="v213-popover-head"><b>${escapeHtml(title)}</b><button type="button" class="seg-btn" id="v213PopoverClose" aria-label="Cerrar">×</button></div>${html}`;
    card.appendChild(el);const width=el.offsetWidth,height=el.offsetHeight;
    el.style.left=Math.max(8,Math.min(box.width-width-8,screen.x-box.left+18))+'px';
    el.style.top=Math.max(8,Math.min(box.height-height-8,screen.y-box.top+18))+'px';
    el.addEventListener('pointerdown',e=>e.stopPropagation());el.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();v213ClosePopover();svg.focus();}});
    el.querySelector('#v213PopoverClose').onclick=v213ClosePopover;return el;
  }
  function v213OpenRename(svg,id){
    const zone=findZoneById(id);if(!zone||v213LayerLocked('zones'))return;
    appState.selectedZoneId=id;appState.selectedEdge={zoneId:'',a:-1,b:-1};appState.selectedVertex={zoneId:'',idx:-1};
    const el=v213Popover(svg,polygonCentroid(zone.pts),'Renombrar zona',`<form id="v213RenameForm"><label>Nombre<input id="v213RenameInput" maxlength="80" value="${escapeHtml(zone.name||id)}" required></label><small>Código ${escapeHtml(id)} · ${zone.locked?'Geometría bloqueada':'Zona virtual'}</small><button class="btn primary" type="submit">Guardar nombre</button></form>`);
    if(!el)return;el.querySelector('form').onsubmit=e=>{e.preventDefault();v213RenameZone(id,el.querySelector('input').value);};el.querySelector('input').focus();el.querySelector('input').select();
  }
  function v213ApplyPlacement(id,value){
    const wall=findWallById(id);if(!wall||v213LayerLocked('walls'))return false;
    const placement=normalizeWallPlacement(value);if(placement===normalizeWallPlacement(wall.placement)){v213ClosePopover();return true;}
    recordHistorySnapshot('structure');wall.placement=placement;
    if(wall.autoZoneEdge){const z=findZoneById(wall.zoneId);if(z)setZoneEdgeWall(z,Number(wall.edgeIndex||0),{placement});}
    syncZonePerimeterWalls();persistActiveLayout('posición del muro');renderLayoutEditor();return true;
  }
  function v213PreviewPlacement(svg,wall,value){
    svg.querySelectorAll('[data-v213-preview]').forEach(el=>el.remove());
    const trial={...wall,placement:value},slice=getWallSlicePolygon(trial,0,1,1);if(!slice?.poly)return;
    const px=1/(svg.getScreenCTM()?.a||1),layer=svgEl('g',{'data-v213-preview':'1','pointer-events':'none'});
    layer.appendChild(svgEl('path',{d:wallPolygonPath(slice.poly),fill:'rgba(72,174,132,.35)',stroke:'#53b38d','stroke-width':2*px,'stroke-dasharray':`${5*px} ${3*px}`}));
    const offsets=getWallFaceOffsets(trial),len=wallLength(wall)||1,n={x:-(wall.y2-wall.y1)/len,y:(wall.x2-wall.x1)/len},c={x:(wall.x1+wall.x2)/2,y:(wall.y1+wall.y2)/2};
    const signs=value==='center'?[1,-1]:[offsets.left>offsets.right?1:-1];
    signs.forEach(sign=>{const end={x:c.x+n.x*sign*Math.max(26*px,Number(wall.thickness||12)),y:c.y+n.y*sign*Math.max(26*px,Number(wall.thickness||12))};layer.appendChild(svgEl('line',{x1:c.x,y1:c.y,x2:end.x,y2:end.y,stroke:'#53b38d','stroke-width':3*px}));const dx=n.x*sign,dy=n.y*sign;layer.appendChild(svgEl('path',{d:`M ${end.x} ${end.y} L ${end.x-dx*8*px-dy*4*px} ${end.y-dy*8*px+dx*4*px} L ${end.x-dx*8*px+dy*4*px} ${end.y-dy*8*px-dx*4*px} Z`,fill:'#53b38d'}));});svg.appendChild(layer);
  }
  function v213OpenPlacement(svg,wall){
    if(v213LayerLocked('walls'))return;const current=normalizeWallPlacement(wall.placement);
    const el=v213Popover(svg,{x:(wall.x1+wall.x2)/2,y:(wall.y1+wall.y2)/2},'Posición del muro',`<div class="v213-placement-options" role="group" aria-label="Posición del espesor">${V213_PLACEMENTS.map(([value,label])=>`<button type="button" class="seg-btn ${current===value?'active':''}" data-v213-placement="${value}" aria-pressed="${current===value}">${label}</button>`).join('')}</div><small>La flecha indica hacia qué lado crece el espesor. El eje se conserva.</small><div class="v213-popover-actions"><button class="seg-btn" id="v213PlacementCancel">Cancelar</button><button class="btn primary" id="v213PlacementApply">Aplicar</button></div>`);
    if(!el)return;let choice=current;const buttons=[...el.querySelectorAll('[data-v213-placement]')];
    buttons.forEach(btn=>btn.onclick=()=>{choice=btn.dataset.v213Placement;buttons.forEach(b=>{b.classList.toggle('active',b===btn);b.setAttribute('aria-pressed',String(b===btn));});v213PreviewPlacement(svg,wall,choice);});
    el.querySelector('#v213PlacementCancel').onclick=v213ClosePopover;el.querySelector('#v213PlacementApply').onclick=()=>v213ApplyPlacement(wall.id,choice);
    v213PreviewPlacement(svg,wall,current);buttons.find(b=>b.dataset.v213Placement===current)?.focus();
  }
  function v213ApplyLength(kind,id,index,metres,anchor='start'){
    const units=Number(metres)*100/getScaleCmPerUnit();if(!Number.isFinite(units)||units<1){showToast('Introduce una longitud válida, mayor o igual a 0,01 m.','warning');return false;}
    if(kind==='wall'){
      const bound=findWallById(id);if(bound?.areaBinding&&(bound.areaBinding.start||bound.areaBinding.end)&&typeof v214BoundWallLength==='function')return v214BoundWallLength(bound,units,anchor);
      const wall=findWallById(id);if(!wall||wall.autoZoneEdge||v213LayerLocked('walls'))return false;
      const a=getWallNode(wall.startNodeId),b=getWallNode(wall.endNodeId);if(!a||!b)return false;
      const length=Math.hypot(b.x-a.x,b.y-a.y);if(length<.001)return false;
      const fixed=anchor==='end'?b:a,moving=anchor==='end'?a:b,sign=anchor==='end'?-1:1;
      const before=snapshotForType('structure'),target={x:fixed.x+(b.x-a.x)/length*units*sign,y:fixed.y+(b.y-a.y)/length*units*sign};
      if(!setWallNodePosition(moving.id,target.x,target.y)){showToast('La medida provoca un conflicto con la geometría conectada.','warning');return false;}
      recordHistorySnapshot('structure',before);v117RefreshRooms();persistActiveLayout('longitud del muro');renderLayoutEditor();return true;
    }
    const target=kind==='area'?v212Target('area'):findZoneById(id);if(!target||target.locked||kind==='zones'&&v213LayerLocked('zones'))return false;
    const pts=clone(target.pts),a=pts[index],j=(index+1)%pts.length,b=pts[j],length=Math.hypot(b.x-a.x,b.y-a.y);if(length<.001)return false;
    if(anchor==='end')pts[index]={...pts[index],x:b.x-(b.x-a.x)/length*units,y:b.y-(b.y-a.y)/length*units};
    else pts[j]={...pts[j],x:a.x+(b.x-a.x)/length*units,y:a.y+(b.y-a.y)/length*units};
    if(kind==='zones')appState.selectedZoneId=id;
    const result=v212Commit(kind,pts,{label:'longitud del lado'});if(result)v213ClosePopover();return result;
  }
  function v213OpenLength(svg,kind,id,index,a,b){
    const target=kind==='wall'?findWallById(id):kind==='area'?v212Target('area'):findZoneById(id);
    if(!target||target.locked||kind==='wall'&&v213LayerLocked('walls')||kind==='zones'&&v213LayerLocked('zones'))return;
    const el=v213Popover(svg,{x:(a.x+b.x)/2,y:(a.y+b.y)/2},kind==='wall'?'Longitud del muro':`Longitud del lado ${index+1}`,`<form id="v213LengthForm"><label>Longitud (m)<input id="v213LengthInput" type="number" step="0.01" min="0.01" value="${(Math.hypot(b.x-a.x,b.y-a.y)*getScaleCmPerUnit()/100).toFixed(3)}" required></label><label>Extremo fijo<select id="v213LengthAnchor"><option value="start">Inicio A</option><option value="end">Final B</option></select></label><small>Se conserva el ángulo y se validan los límites compartidos.</small><button class="btn primary" type="submit">Aplicar medida</button></form>`);
    if(!el)return;el.querySelector('form').onsubmit=e=>{e.preventDefault();v213ApplyLength(kind,id,index,el.querySelector('input').value,el.querySelector('select').value);};el.querySelector('input').focus();el.querySelector('input').select();
    const px=1/(svg.getScreenCTM()?.a||1),g=svgEl('g',{'data-v213-preview':'endpoints','pointer-events':'none'});
    [a,b].forEach((p,i)=>{const t=svgEl('text',{x:p.x+10*px,y:p.y-12*px,class:'v213-svg-text',style:`font-size:${12*px}px`});t.textContent=i?'B':'A';g.appendChild(t);});svg.appendChild(g);
  }
  function v213Dimension(svg,layer,kind,id,index,a,b,normal){
    const px=1/(svg.getScreenCTM()?.a||1),len=Math.hypot(b.x-a.x,b.y-a.y);if(len<1)return;
    const n=normal||{x:-(b.y-a.y)/len,y:(b.x-a.x)/len},offset=(kind==='wall'?36:52)*px;
    const p={x:(a.x+b.x)/2+n.x*offset,y:(a.y+b.y)/2+n.y*offset},text=`${(len*getScaleCmPerUnit()/100).toFixed(2)} m`,w=Math.max(65,text.length*7+16)*px;
    // Keep the editable label clear of the rail and inside the visible canvas.
    const matrix=svg.getScreenCTM(),box=svg.getBoundingClientRect(),point=svg.createSVGPoint();point.x=p.x;point.y=p.y;
    const screen=point.matrixTransform(matrix),half=w/px/2;
    screen.x=Math.max(box.left+half+8,Math.min(box.right-half-8,screen.x));screen.y=Math.max(box.top+20,Math.min(box.bottom-20,screen.y));
    const rail=svg.closest('.layout-canvas-card')?.querySelector('.v80-tool-rail')?.getBoundingClientRect();
    if(rail&&screen.y+11>rail.top&&screen.y-11<rail.bottom&&screen.x-half<rail.right&&screen.x+half>rail.left)screen.x=Math.min(box.right-half-8,rail.right+half+8);
    const visible=screen.matrixTransform(matrix.inverse());p.x=visible.x;p.y=visible.y;
    const g=svgEl('g',{'data-v213-dimension':kind,'data-v213-id':id,'data-v213-edge':index,'data-v213-ui':'1',role:'button',tabindex:'0','aria-label':`Editar longitud ${text}`,style:'cursor:pointer;pointer-events:all'});
    g.appendChild(svgEl('line',{x1:a.x+n.x*offset,y1:a.y+n.y*offset,x2:b.x+n.x*offset,y2:b.y+n.y*offset,stroke:'#b88949','stroke-width':px,'pointer-events':'none'}));
    g.appendChild(svgEl('rect',{x:p.x-w/2,y:p.y-11*px,width:w,height:22*px,rx:6*px,class:'v213-svg-card'}));
    const t=svgEl('text',{x:p.x,y:p.y+4*px,'text-anchor':'middle',class:'v213-svg-text',style:`font-size:${12*px}px;pointer-events:none`});t.textContent=text;g.appendChild(t);
    const open=()=>v213OpenLength(svg,kind,id,index,a,b);g.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();});g.addEventListener('click',e=>{e.stopPropagation();open();});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}});layer.appendChild(g);
  }
  function v213RenderCanvas(svg){
    if(!svg)return;
    v213ClosePopover();
    svg.querySelector('.v213-context-layer')?.remove();
    if(!svg.__v213Capture){svg.__v213Capture=true;svg.addEventListener('pointerdown',e=>{
      const ui=e.target.closest?.('[data-v213-ui]');if(ui)return;
      const key=e.target.closest?.('[data-v213-layer]')?.dataset.v213Layer;
      if(key&&v213LayerLocked(key)){e.preventDefault();e.stopImmediatePropagation();showToast('Capa bloqueada. Desbloquéala desde Capas.','warning',1800);}
    },true);}
    if(activeLayoutWorkspace()!=='architecture'||appState.editor.mode!=='select')return;
    const layer=svgEl('g',{class:'v213-context-layer'});svg.appendChild(layer);
    v213DrawSnap(svg);
    const kind=appState.editor.architectureTool,wall=findWallById(appState.selectedWallId);
    if(kind==='walls'&&wall&&appState.editor.wallsVisible!==false){
      if(!wall.autoZoneEdge && appState.editor.showDims)v213Dimension(svg,layer,'wall',wall.id,0,{x:wall.x1,y:wall.y1},{x:wall.x2,y:wall.y2});
      if(!v213LayerLocked('walls')){
        const px=1/(svg.getScreenCTM()?.a||1),cx=(wall.x1+wall.x2)/2,cy=(wall.y1+wall.y2)/2;
        const g=svgEl('g',{'data-v213-wall-control':wall.id,'data-v213-ui':'1',role:'button',tabindex:'0','aria-label':'Cambiar posición del espesor del muro',style:'cursor:pointer;pointer-events:all'});
        const title=svgEl('title');title.textContent='Posición del muro: Adentro / Centro / Afuera';g.appendChild(title);
        g.appendChild(svgEl('rect',{x:cx-16*px,y:cy-16*px,width:32*px,height:32*px,rx:9*px,class:'v213-svg-card'}));
        const t=svgEl('text',{x:cx,y:cy+5*px,'text-anchor':'middle',class:'v213-svg-text',style:`font-size:${19*px}px;pointer-events:none`});t.textContent='↔';g.appendChild(t);
        g.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();});g.addEventListener('click',e=>{e.stopPropagation();v213OpenPlacement(svg,wall);});g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();v213OpenPlacement(svg,wall);}});layer.appendChild(g);
      }
    }else if(kind==='area'||kind==='zones'&&appState.editor.showZones!==false){
      const target=v212Target(kind);if(!target||!appState.editor.showDims)return;
      const selection=v213SelectedPart();
      target.pts.forEach((a,i)=>{if(appState.layout.meta.architectureHierarchyV214&&selection&&(selection.type==='edge'?i!==selection.index:i!==selection.index&&i!==(selection.index-1+target.pts.length)%target.pts.length))return;const b=target.pts[(i+1)%target.pts.length];v213Dimension(svg,layer,kind,target.id||'AREA-GENERAL',i,a,b,getZoneOutwardEdgeNormal(target,a,b));});
    }
    v213ShowGeometryError(svg);
  }
  function v213ShowGeometryError(svg){
    if(!svg)return;svg.querySelector('[data-v213-error]')?.remove();
    const error=appState.editor.geometryError;if(!error?.pts)return;
    const px=1/(svg.getScreenCTM()?.a||1),g=svgEl('g',{'pointer-events':'none','data-v213-error':'1'});
    g.appendChild(svgEl('path',{d:pathFromPts(error.pts),fill:'rgba(212,87,64,.12)',stroke:'#d45740','stroke-width':2*px,'stroke-dasharray':`${6*px} ${4*px}`}));
    const c=polygonCentroid(error.pts),t=svgEl('text',{x:c.x,y:c.y,'text-anchor':'middle',style:`font-size:${12*px}px;fill:#d45740;paint-order:stroke;stroke:var(--surface-1);stroke-width:${3*px}px`});t.textContent=error.message;g.appendChild(t);svg.appendChild(g);
  }
  function v213BindUx(){
    const undo=document.getElementById('v213UndoGlobal'),redo=document.getElementById('v213RedoGlobal'),historyType=isRackDistributionScreen()?'distribution':appState.editor.areaMoveMode?'layout':'structure';
    if(undo)undo.onclick=()=>undoHistory(historyType);if(redo)redo.onclick=()=>redoHistory(historyType);
    const name=document.getElementById('v213ZoneName');if(name){name.onchange=()=>v213RenameZone(appState.selectedZoneId,name.value);name.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();name.blur();}};}
    const oldName=document.getElementById('rpZoneName');if(oldName)oldName.onchange=()=>v213RenameZone(appState.selectedZoneId,oldName.value);
    const oldPlacement=document.getElementById('rpWallPlacement');if(oldPlacement)oldPlacement.onchange=()=>v213ApplyPlacement(appState.selectedWallId,oldPlacement.value);
    const color=document.getElementById('v213ZoneColor');if(color)color.onchange=()=>{const z=findZoneById(appState.selectedZoneId);if(!z||v213LayerLocked('zones'))return;recordHistorySnapshot('structure');z.color=color.value;persistActiveLayout('color de zona');renderLayoutEditor();};
    document.querySelectorAll('[data-v213-visible]').forEach(btn=>btn.onclick=()=>{const key=btn.dataset.v213Visible;appState.editor[key]=key==='showDims'?!appState.editor[key]:appState.editor[key]===false;renderLayoutEditor();});
    document.querySelectorAll('[data-v213-lock]').forEach(btn=>btn.onclick=()=>{const key=btn.dataset.v213Lock,next=!v213LayerLocked(key);appState.editor.layerLocks={...appState.editor.layerLocks,[key]:next};if(key==='zones')appState.editor.zonesLocked=next;appState.editor.dragging=null;renderLayoutEditor();});
    const layers=document.getElementById('v213OpenLayers');if(layers)layers.onclick=()=>{const fold=document.querySelector('[data-layout-fold="visual"]');if(!fold)return;fold.open=!fold.open;if(fold.open){const scroller=fold.closest('.layout-right-scroll');if(scroller)scroller.scrollTop+=fold.getBoundingClientRect().top-scroller.getBoundingClientRect().top-10;}};
    const head=document.querySelector('.layout-contextual-copy b');if(head)head.textContent=v213SelectionTitle();
    if(v213SelectionLocked())document.querySelectorAll('.layout-contextual-actions button,[data-layout-context-action]').forEach(btn=>btn.disabled=true);
    document.querySelectorAll('.v80-tool-btn').forEach(btn=>{btn.title=btn.textContent.trim();btn.setAttribute('aria-label',btn.title);});
    const locks=[['zones','.v212-editor input,.v212-editor button:not(#v212Undo):not(#v212Redo),.layout-v207-zone input,.layout-v207-zone button,.layout-v207-context-card button'],['walls','.wall-pro-card input,.wall-pro-card select,.wall-pro-card button,.v203-wall-card input,.v203-wall-card select,.v203-wall-card button'],['openings','.opening-editor-card input,.opening-editor-card select,.opening-editor-card button']];
    locks.forEach(([key,selector])=>{if(v213LayerLocked(key))document.querySelectorAll(selector).forEach(el=>{if(appState.editor.architectureTool==='area'&&el.closest('.v212-editor'))return;el.disabled=true;});});
    if(v213LayerLocked('racks')&&isRackDistributionScreen())document.querySelectorAll('#layoutRightPanel input,#layoutRightPanel select,#layoutRightPanel button:not([data-v213-lock]):not([data-v213-visible])').forEach(el=>el.disabled=true);
    v213UpdateHistoryUi();
  }
  function v213UpdateHistoryUi(){
    const type=isRackDistributionScreen()?'distribution':appState.editor.areaMoveMode?'layout':'structure',bucket=getHistoryBucket(type),current=JSON.stringify(snapshotForType(type));
    const canUndo=bucket.undoStack.some(s=>s!==current),undoLabel=bucket.operationLabels?.[current]||'cambio',next=bucket.redoStack.at(-1),redoLabel=bucket.operationLabels?.[next]||'cambio';
    ['v212Undo','v213UndoGlobal'].forEach(id=>{const undo=document.getElementById(id);if(undo){undo.disabled=!canUndo;undo.title=`Deshacer ${undoLabel}`;undo.setAttribute('aria-label',undo.title);}});
    ['v212Redo','v213RedoGlobal'].forEach(id=>{const redo=document.getElementById(id);if(redo){redo.disabled=!next;redo.title=`Rehacer ${redoLabel}`;redo.setAttribute('aria-label',redo.title);}});
    const hint=document.getElementById('v213HistoryHint');if(hint)hint.textContent=canUndo?`Deshacer: ${undoLabel}`:'Sin cambios para deshacer';
  }
