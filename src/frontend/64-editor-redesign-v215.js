  // V215: presentation only. Geometry and hierarchy stay in V212–V214.
  function v215GridStep(base,scale){
    let step=Math.max(4,Number(base)||4),px=Math.abs(Number(scale))||1;
    while(step*px<12)step*=2;
    return step;
  }
  function v215CompactSaveStatus(el,state,message){
    const labels={saving:'Sincronizando…',remote:'Sincronizado',error:'Error de guardado',local:appState.ui?.layoutDirty?'Local · pendiente':'Guardado local'};
    el.textContent=labels[state]||'Guardado local';
    el.title=message+(appState.ui?.layoutSaveAt?` · ${new Date(appState.ui.layoutSaveAt).toLocaleString('es-PE')}`:'');
    el.setAttribute('aria-label',message);
  }
  function v215RedesignEditor(){
    const root=document.querySelector('.layout-cad-shell-v80');if(!root)return;
    root.classList.add('v215-editor');
    const bar=root.querySelector('.layout-cad-localbar-v80');
    if(!root.querySelector('.v215-projectbar')){
      const top=document.createElement('div');top.className='v215-projectbar';top.setAttribute('aria-label','Espacio de trabajo y guardado');
      const nav=root.querySelector('.layout-v200-tabs');root.insertBefore(top,root.firstChild);if(nav)top.appendChild(nav);
      const branch=bar.querySelector('#layoutBranchSelect');if(branch){
        const label=document.createElement('label');label.className='v215-branch';label.innerHTML='<span>Sucursal</span>';
        branch.setAttribute('aria-label','Sucursal del plano');label.appendChild(branch);top.appendChild(label);
      }
      const save=bar.querySelector('#btnSaveLayoutVisible');if(save){save.textContent='Guardar';top.appendChild(save);}
      const status=bar.querySelector('#layoutSaveStatus');if(status)top.appendChild(status);
      const subnav=root.querySelector('.v203-wall-subtabs');if(subnav)bar.prepend(subnav);
      // Move existing controls with their original handlers, without duplicating actions.
      const more=bar.querySelector('.v214-more');
      const fit=bar.querySelector('#btnZoomFit');if(fit){fit.classList.remove('v80-icon-btn');fit.textContent='⛶ Ajustar';bar.insertBefore(fit,more);}
      const inspector=bar.querySelector('[data-layout-tag-action="toggle-right-props"]');if(inspector){inspector.textContent='Inspector';inspector.setAttribute('aria-label',appState.editor.rightPanelOpen===false?'Mostrar inspector':'Ocultar inspector');inspector.setAttribute('aria-pressed',String(appState.editor.rightPanelOpen!==false));bar.insertBefore(inspector,more);}
      const sections=bar.querySelector('#btnToggleSections'),footer=root.querySelector('.v80-canvas-footer');if(sections&&footer){sections.textContent='◫ Cortes';sections.setAttribute('aria-label',appState.editor.sectionVisible?'Ocultar cortes X/Y':'Mostrar cortes X/Y');footer.appendChild(sections);}
      const undo=bar.querySelector('#v213UndoGlobal');if(undo)undo.classList.add('v215-history-start');
      if(fit)fit.classList.add('v215-view-start');
      root.__v215Context=root.querySelector('.layout-contextual-bar');
      root.querySelector('.layoutQualityBadge')?.remove();
    }
    const panel=root.querySelector('#layoutRightPanel'),head=panel?.querySelector('.layout-right-head');
    if(head){
      head.querySelector('b').textContent='Propiedades';
      const context=root.__v215Context;
      if(context){head.appendChild(context);const title=context.querySelector('.layout-contextual-copy b');if(title)title.textContent=v213SelectionTitle();const actions=context.querySelector('.layout-contextual-actions');if(actions)actions.hidden=activeLayoutWorkspace()==='architecture'&&appState.editor.architectureTool==='area';}
    }
    const card=panel?.querySelector('.v212-editor');if(card){
      card.querySelectorAll('.layout-template-grid:empty').forEach(el=>el.hidden=true);
      const geometry=card.querySelector('.v213-geometry'),sel=v213SelectedPart(),type=sel?.type==='edge'?'edge':'vertex';
      const vertex=card.querySelector('#v212VertexIndex')?.closest('label'),edge=card.querySelector('#v212EdgeIndex')?.closest('label');
      if(vertex)vertex.hidden=type!=='vertex';if(edge)edge.hidden=type!=='edge';
      const vf=card.querySelector('.v213-vertex-fields'),ef=card.querySelector('.v213-edge-fields');if(vf)vf.hidden=type!=='vertex';if(ef)ef.hidden=type!=='edge';
      const summary=geometry?.querySelector('summary');if(summary){summary.firstChild.textContent=sel?`${type==='vertex'?'Vértice':'Lado'} ${sel.index+1} `:'Edición precisa ';summary.querySelector('span')?.setAttribute('hidden','');}
      if(geometry&&!geometry.querySelector('.v215-geometry-tabs')){
        const tabs=document.createElement('div');tabs.className='v215-geometry-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Tipo de edición precisa');
        [['vertex','Vértice'],['edge','Lado']].forEach(([key,text])=>{
          const btn=document.createElement('button');btn.type='button';btn.className='seg-btn'+(type===key?' active':'');btn.dataset.v215Geometry=key;btn.textContent=text;btn.setAttribute('aria-pressed',String(type===key));
          btn.onclick=()=>v212Select(appState.editor.architectureTool,key,sel?.index||0);tabs.appendChild(btn);
        });summary.after(tabs);
      }
      if(sel){card.querySelector('#v212AddPoint')?.toggleAttribute('hidden',type!=='edge');card.querySelector('#v212RemovePoint')?.toggleAttribute('hidden',type!=='vertex');}
    }
  }
