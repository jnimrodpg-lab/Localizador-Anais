/* V222 — catálogo compacto y un único preview editable. */
function v222RackPropertiesMarkup(rack,model,fp,modelOptions){
  const dims=v222Dimensions(rack),custom=['width','depth','height'].some(key=>rack.furnitureOverrides?.[key]!=null);
  return `<section class="layout-prop-card v222-rack-properties"><div class="layout-prop-title">Mueble seleccionado</div><small class="v222-rack-model-label">${escapeHtml(model?.name||'Modelo de mobiliario')}</small><div class="layout-prop-grid two">
    <label style="grid-column:1/-1">Nombre del mueble<input id="rpRackName" maxlength="80" value="${escapeHtml(v222RackName(rack))}" placeholder="Ej. Exhibidor de herramientas"></label>
    <label style="grid-column:1/-1">Nomenclatura<input id="rpRackDisplayCode" maxlength="80" value="${escapeHtml(v222RackCode(rack))}" placeholder="Ej. A-01-R03"></label>
    <small class="v222-code-hint" style="grid-column:1/-1">Si el código ya existe, se intercambia con ese mueble.</small>
    <label>Ancho (cm)<input id="rpRackWidth" type="number" min="30" step=".1" value="${round1(dims.width)}"></label><label>Profundidad (cm)<input id="rpRackDepth" type="number" min="20" step=".1" value="${round1(dims.depth)}"></label>
    <label>Altura (cm)<input id="rpRackHeight" type="number" min="60" step=".1" value="${round1(dims.height)}"></label><label>NPT desde piso (cm)<input id="rpRackNpt" type="number" min="0" max="20000" step="1" value="${round1(rack.baseHeight||0)}"></label>
    </div><div class="v222-rack-measures"><small>${custom?'Medidas particulares de este mueble':'Medidas vinculadas al modelo'}</small>${custom?'<button class="seg-btn v222-reset-dimensions" id="rpRackResetDimensions">Usar medidas del modelo</button>':''}</div>
    <details class="v222-rack-position"><summary>Posición y opciones del mueble</summary><div class="layout-prop-grid two"><label>Modelo<select id="rpRackModel">${modelOptions}</select></label><label>Rotación (°)<input id="rpRackRot" type="number" min="0" max="360" step=".1" value="${round1(normalizeAngle(rack.rot||0))}"></label><label>X<input id="rpRackX" type="number" value="${formatUnitNumber(rack.x)}"></label><label>Y<input id="rpRackY" type="number" value="${formatUnitNumber(rack.y)}"></label><label>Identificador<input value="${escapeHtml(rack.id)}" disabled></label><label>Zona<input value="${escapeHtml(rack.zoneId)}" disabled></label><label style="grid-column:1/-1">Huella en planta<input value="${formatUnitNumber(fp?.w||rack.w)} × ${formatUnitNumber(fp?.h||rack.h)}" disabled></label></div><div class="layout-template-grid" style="margin-top:10px"><button class="seg-btn" id="rpDuplicateRack">Duplicar mueble</button><button class="seg-btn" id="rpRack45">Girar 45°</button><button class="seg-btn" id="rpRack90">Girar 90°</button><button class="seg-btn" id="rpAddAbove">Agregar encima</button></div></details></section>`;
}
function v222LibraryList(){
  const mount=document.getElementById('modelsList');if(!mount)return;
  const query=String(document.getElementById('rackLibrarySearch')?.value||'').trim().toLocaleLowerCase('es');
  const models=(appState.models||[]).filter(m=>!query||String(m.name||'').toLocaleLowerCase('es').includes(query));
  mount.innerHTML=models.map(m=>`<button type="button" class="v222-model-item ${m.id===appState.selectedModelId?'active':''}" data-v222-select="${escapeHtml(m.id)}"><span class="v222-model-icon"><svg class="wms-icon" aria-hidden="true"><use href="#wms-layers"></use></svg></span><span><b>${escapeHtml(m.name)}</b><small>${round1(m.width)} × ${round1(m.depth)} × ${round1(m.height)} cm</small><small>${m.furniture?.enabled?furnitureMaterialLabel(m.furniture.material):rackStyleLabel(m.style)} · ${Number(m.levels||1)} niveles</small></span></button>`).join('')||'<div class="v222-library-empty">No hay modelos con ese nombre.</div>';
  mount.querySelectorAll('[data-v222-select]').forEach(btn=>btn.onclick=()=>{if(btn.dataset.v222Select===appState.selectedModelId)return;appState.selectedModelId=btn.dataset.v222Select;resetRackPreviewCamera();v222RenderLibrary();});
}
function v222LibraryControls(model){
  const f=model.furniture,enabled=!!f?.enabled,sloped=enabled?f.roofMode==='slope':isUnderStairsStyle(model.style),levels=enabled?deriveFurnitureLevels(model):[],divisions=levels.length?Math.max(...levels.map(l=>l.physicalDividerCount)):Math.max(0,Number(model.slots||1)-1);
  const input=(key,label,value,min,max=10000)=>`<label>${label}<span class="v222-input-unit"><input id="rackLibrary-${key}" data-v222-model="${key}" type="number" min="${min}" max="${max}" step="${key==='levels'||key==='divisions'?1:.1}" value="${round1(value)}"><em>${key==='levels'||key==='divisions'?'':'cm'}</em></span></label>`;
  return `<div class="v222-model-identity"><label>Nombre del modelo<input id="rackLibrary-name" data-v222-model="name" value="${escapeHtml(model.name)}" maxlength="80"></label><small>Estas propiedades editan el modelo de la biblioteca. Las medidas particulares se editan en el layout.</small></div>
    <div class="v222-dimension-grid">${input('width','Ancho',model.width,30)}${input('depth','Profundidad',model.depth,20)}<label>Cubierta<select id="rackLibrary-roofMode" data-v222-model="roofMode"><option value="flat" ${!sloped?'selected':''}>Una altura</option><option value="slope" ${sloped?'selected':''}>Con pendiente</option></select></label>${sloped?`${input('leftHeight','Altura izquierda',enabled?f.leftHeight:model.leftHeight||model.height,60)}${input('rightHeight','Altura derecha',enabled?f.rightHeight:model.rightHeight||model.height,60)}`:input('height','Altura',model.height,60)}${input('levels','Niveles',model.levels||1,1,12)}${input('divisions','Divisiones verticales',divisions,0,11)}</div>
    <div class="v222-controls-foot"><span>Los niveles distribuyen repisas. Cada división agrega un compartimento por nivel.</span><button type="button" class="mini-btn" id="rackLibraryOpenBuilder">Editar estructura</button><button type="button" class="btn" id="rackLibraryPlace">Colocar en layout</button></div>`;
}
function v222LibraryAdvanced(model){
  const f=model.furniture;
  if(!f.enabled)return `<details class="v222-library-advanced"><summary>Opciones del modelo</summary><div class="v222-advanced-grid"><label>Tipo<select data-model-input="style" data-mid="${escapeHtml(model.id)}">${[['metallic','Metálico'],['wood','Madera'],['melamine','Melamina'],['under_stairs','Bajo escalera'],['under_stairs_reflected','Bajo escalera reflejado']].map(([value,label])=>`<option value="${value}" ${normalizeRackStyle(model.style)===value?'selected':''}>${label}</option>`).join('')}</select></label><label>Separación desde el piso (cm)<input type="number" min="0" max="120" data-model-input="clearance" data-mid="${escapeHtml(model.id)}" value="${Number(model.clearance||0)}"></label><label>Espesor de estructura (cm)<input type="number" min="2" max="20" data-model-input="beam" data-mid="${escapeHtml(model.id)}" value="${Number(model.beam||2)}"></label></div><button class="mini-btn" data-furniture-action="convert" data-mid="${escapeHtml(model.id)}">Editar por piezas</button></details>`;
  const field=(key,label,values)=>`<label>${label}<select data-furniture-field="${key}" data-mid="${escapeHtml(model.id)}">${values.map(([v,l])=>`<option value="${v}" ${f[key]===v?'selected':''}>${l}</option>`).join('')}</select></label>`;
  return `<details class="v222-library-advanced" id="rackLibraryAdvanced" ${appState.ui.v222LibraryAdvanced?'open':''}><summary>Materiales y edición de piezas</summary><div class="v222-advanced-grid">${field('material','Material',[['wood','Madera'],['melamine','Melamina'],['metal','Metal'],['metal-wood','Metal + madera']])}${field('finish','Acabado',[['oak','Roble'],['white','Blanco'],['walnut','Nogal'],['graphite','Grafito']])}<label>Grosor (cm)<input type="number" min=".3" max="20" step=".1" data-furniture-field="thickness" data-mid="${escapeHtml(model.id)}" value="${round1(f.thickness)}"></label><label>Fondo<select id="rackLibraryBackMode">${[['none','Sin fondo'],['full','Completo'],['modules','Por compartimentos']].map(([value,label])=>`<option value="${value}" ${f.backMode===value?'selected':''}>${label}</option>`).join('')}</select></label><label class="v222-check"><input id="rackLibraryPlinth" type="checkbox" ${f.plinthEnabled?'checked':''} ${furnitureIsMetalFrame(f.material)?'disabled':''}> Zócalo inferior</label></div><div class="v222-piece-actions">${[['shelf','+ Repisa'],['divider','+ División'],['back','+ Fondo'],['brace','+ Refuerzo'],['duplicate-piece','Duplicar pieza'],['distribute-shelves','Distribuir repisas'],['carcass','Rehacer estructura']].map(([action,label])=>`<button class="mini-btn" data-furniture-action="${action}" data-mid="${escapeHtml(model.id)}">${label}</button>`).join('')}</div><div id="rackBuilderInspector" class="rack-builder-inspector rack-3d-inspector"></div><details class="v222-level-options"><summary>Ubicaciones por nivel</summary><div id="rackBuilderLevels" class="rack-builder-levels"></div></details></details>`;
}
function v222BindLibraryControls(model){
  document.querySelectorAll('[data-v222-model]').forEach(el=>el.onchange=()=>v222EditModelField(model.id,el.dataset.v222Model,el.value));
  const place=document.getElementById('rackLibraryPlace');if(place)place.onclick=()=>{if(!model.furniture.enabled){recordHistorySnapshot('racks');convertLegacyModelToFurniture(model);saveRackModels();}placeFurnitureModelInLayout(model);};
  const builder=document.getElementById('rackLibraryOpenBuilder');if(builder)builder.onclick=()=>setScreen('rack-builder');
}
function v222RefreshLibraryControls(){
  const host=document.getElementById('rackLibraryControls'),model=v222ModelFor({modelId:appState.selectedModelId});if(!host||!model)return;
  host.innerHTML=v222LibraryControls(model);v222BindLibraryControls(model);v222LibraryList();
}
function v222RenderLibrary(){
  appState.screen='racks';appState.ui=appState.ui||{};appState.ui.rackBuilder=appState.ui.rackBuilder||{shelfZ:80,dividerX:60,dividerFrom:0,dividerTo:120,snap:1};
  if(!appState.models?.length)appState.models=[{id:'std_4',name:'Rack estándar',width:120,depth:40,height:240,levels:4,slots:2,style:'metallic'}];
  appState.models.forEach(ensureRackFurnitureModel);v222SynchronizeModels();
  const model=v222ModelFor({modelId:appState.selectedModelId})||appState.models[0];appState.selectedModelId=model.id;
  const query=document.getElementById('rackLibrarySearch')?.value||'',scroll=document.getElementById('modelsList')?.scrollTop||0;
  contentTitle.textContent='Biblioteca de racks';contentSubtitle.textContent='Selecciona un modelo y edita sus medidas en una sola vista.';detailTitle.textContent='Modelo de mobiliario';detailSubtitle.textContent='';detailWrap.innerHTML='';
  setTags([{label:'↶ Deshacer',active:true,action:'history-undo-racks',extraClass:'history-chip'},{label:'↷ Rehacer',active:true,action:'history-redo-racks',extraClass:'history-chip'}]);
  contentWrap.innerHTML=`<div class="rack-models-page v222-library-page"><aside class="rack-models-main v222-library-catalog"><div class="v222-catalog-heading"><b>Modelos</b><span>${appState.models.length}</span></div><input id="rackLibrarySearch" class="v222-library-search" type="search" placeholder="Buscar modelo…" aria-label="Buscar modelo" value="${escapeHtml(query)}"><div id="modelsList" class="v222-model-list"></div><button class="btn" id="btnNewModel">+ Crear mobiliario</button><div class="v222-catalog-actions"><button class="mini-btn" id="btnDuplicateModel">Duplicar</button><button class="mini-btn danger" id="btnDeleteModel">Eliminar</button></div></aside><main class="rack-models-side v222-library-workspace"><section class="rack-block preview-box-3d v222-model-preview"><div class="v222-preview-head"><div><h3>${escapeHtml(model.name)}</h3><small>Arrastra el fondo para girar · rueda para zoom · clic en una pieza para editar</small></div><button class="mini-btn" id="rackLibraryCenter">Centrar vista</button><button class="btn" id="btnSaveModel">Guardar</button></div><div class="detail-stage is-navigable" id="rackPreviewStage"><svg id="rackModelSvg" viewBox="0 0 520 480"></svg></div><div id="rackLibraryControls" class="v222-library-controls">${v222LibraryControls(model)}</div></section>${v222LibraryAdvanced(model)}</main></div>`;
  v222LibraryList();document.getElementById('modelsList').scrollTop=scroll;
  document.getElementById('rackLibrarySearch').oninput=v222LibraryList;
  document.getElementById('btnNewModel').onclick=createNewFurnitureModelDraft;document.getElementById('btnDuplicateModel').onclick=()=>duplicateRackModel(model.id);document.getElementById('btnDeleteModel').onclick=()=>deleteRackModel(model.id);document.getElementById('btnSaveModel').onclick=saveRackModel;
  v222BindLibraryControls(model);
  document.getElementById('rackLibraryCenter').onclick=()=>{if(rackLibrary3DEngine){rackLibrary3DEngine.yaw=.83;rackLibrary3DEngine.pitch=.36;rackLibrary3DEngine.fitKey='';}resetRackPreviewCamera();renderRackModelPreview();};
  document.querySelectorAll('[data-model-input]').forEach(el=>el.onchange=()=>updateRackModelField(model.id,el.dataset.modelInput,el.value));
  bindRackFurnitureBuilder(model.id);renderRackFurnitureBuilder(model.id);
  const advanced=document.getElementById('rackLibraryAdvanced');if(advanced)advanced.ontoggle=()=>{appState.ui.v222LibraryAdvanced=advanced.open;};
  const back=document.getElementById('rackLibraryBackMode');if(back)back.onchange=()=>{recordHistorySnapshot('racks');model.furniture.backMode=back.value;furnitureSyncBackPanels(model);syncFurnitureModelToLegacy(model);saveRackModels();v222RenderLibrary();};
  const plinth=document.getElementById('rackLibraryPlinth');if(plinth)plinth.onchange=()=>{recordHistorySnapshot('racks');furnitureSetPlinth(model,plinth.checked);saveRackModels();v222RenderLibrary();};
  renderRackModelPreview();updateUndoRedoUi();contentStatus.textContent='Biblioteca · Modelo vinculado al layout y al espacio 3D';contentFootRight.textContent=`${appState.models.length} modelos`;
}
function v222EditModelField(id,field,value){
  const model=(appState.models||[]).find(m=>m.id===id);if(!model)return;
  v222SynchronizeModels({persist:false});const previous=clone(model);recordHistorySnapshot('racks');ensureRackFurnitureModel(model);const f=model.furniture;
  if(field==='name')model.name=String(value||'').trim().slice(0,80)||'Mueble sin nombre';
  else if(['width','depth','height'].includes(field)){
    if(!Number.isFinite(Number(value))||value===''){v222RenderLibrary();return;}
    if(f.enabled)resizeFurnitureIntoVolume(model,field,Number(value));else model[field]=v222Number(value,model[field],field==='width'?30:field==='depth'?20:60);
  }else if(field==='roofMode'){
    if(!f.enabled)convertLegacyModelToFurniture(model);
    model.furniture.roofMode=value==='slope'?'slope':'flat';
    if(model.furniture.roofMode==='flat')model.furniture.leftHeight=model.furniture.rightHeight=model.height;
    model.height=Math.max(60,model.furniture.leftHeight,model.furniture.rightHeight);furnitureCreateCarcass(model,{keepCustom:true});resolveConstructionShelfCollisions(model);furnitureRefitModel(model);furnitureSyncBackPanels(model);
  }else if(field==='leftHeight'||field==='rightHeight'){
    if(!Number.isFinite(Number(value))||value===''){v222RenderLibrary();return;}
    if(!f.enabled)convertLegacyModelToFurniture(model);
    const roof=model.furniture;roof[field]=v222Number(value,model.height,60);if(roof.roofMode==='flat')roof.leftHeight=roof.rightHeight=roof[field];model.height=Math.max(roof.leftHeight,roof.rightHeight);furnitureCreateCarcass(model,{keepCustom:true});resolveConstructionShelfCollisions(model);furnitureRefitModel(model);furnitureSyncBackPanels(model);
  }else if(field==='levels'){
    const n=Math.round(v222Number(value,model.levels,1,12));if(f.enabled){const dividers=Math.max(0,...deriveFurnitureLevels(model).map(l=>l.physicalDividerCount));applyConstructionHorizontalSpaces(model,n,true);if(dividers)applyConstructionVerticalSpaces(model,'all',dividers+1,true);}else{model.levels=n;syncLevelEditorCount(id);}
  }else if(field==='divisions'){
    const n=Math.round(v222Number(value,0,0,11));if(f.enabled)applyConstructionVerticalSpaces(model,'all',n+1,true);else{model.slots=n+1;model.levelSlots=Array(Math.max(1,model.levels)).fill(n+1);}
  }
  if(model.furniture.enabled){furnitureRefitModel(model);syncFurnitureModelToLegacy(model);const errors=furnitureValidateModel(model).errors;if(field==='levels'&&model.levels!==Math.round(v222Number(value,previous.levels,1,12)))errors.unshift('La altura no permite esa cantidad de niveles. Aumenta la altura o reduce los niveles.');if(errors.length){Object.keys(model).forEach(k=>delete model[k]);Object.assign(model,previous);showToast(errors[0],'warning',3000);v222RenderLibrary();return;}}
  saveRackModels();if(appState.screen==='racks')v222RenderLibrary();else renderRackModelPreview();
}
