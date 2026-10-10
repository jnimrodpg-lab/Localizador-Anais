"""Test de geometría y tokens CSS con DOM real de Chromium, sin cargar datos externos.
No equivale a un test funcional Cloudflare ni WebGL.
"""
import json,re
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
public=root/'public'; main=(public/'assets/app.css').read_text()
imports=re.findall(r"@import url\(['\"]\./styles/([^'\"]+)['\"]\)",main)
css='\n'.join((public/'assets/styles'/n).read_text() for n in imports)
# Simula exactamente las clases de los componentes; evita el bootstrap de WebGL.
layout='''<div class="stage layout-premium-render layout-cad-v80"><div class="layout-cad-shell-v80 advanced-ui">
<div class="layout-cad-localbar-v80"><button class="btn primary v80-zone-btn">+ Zona</button><select class="seg-btn v80-branch-select"><option>Sucursal 2</option></select><span class="v175-unit-label">cm / m</span><button class="seg-btn v80-icon-btn">⌁</button><button class="seg-btn v172-sections-switch">Secciones</button><button class="seg-btn">Ocultar inspector</button><button class="btn primary">Guardar layout</button></div>
<div class="layout-contextual-bar"><div class="layout-contextual-copy"><b>Zona activa: Zona Z1</b></div><div class="layout-contextual-actions"><button class="seg-btn">Duplicar</button><button class="seg-btn">Dibujar muro</button></div></div>
<div class="layout-cad-workspace-v80"><main class="layout-main-stage v80-main-stage with-section"><div class="layout-canvas-wrap v80-canvas-wrap"><div class="layout-canvas-card v80-canvas-card"><svg id="layoutSvg" viewBox="0 0 900 630" width="100%" height="100%"><rect x="150" y="100" width="600" height="400" fill="#9db8ac" opacity=".4"/><rect x="150" y="100" width="600" height="400" fill="none" stroke="#507963" stroke-width="3"/><text class="ortho-dim-text" x="450" y="80" text-anchor="middle">5.80 m</text></svg><div class="v80-tool-rail"><button class="v80-tool-btn seg-btn">Seleccionar</button><button class="v80-tool-btn seg-btn">Muro</button><button class="v80-tool-btn seg-btn">Puerta</button><button class="v80-tool-btn seg-btn">Medir</button></div><div class="v80-canvas-footer"><button class="seg-btn">−</button><span class="zoom-chip">90%</span><button class="seg-btn">+</button></div></div></div>
<div id="layoutSectionWrap" class="v80-section-floating"><div class="layout-section-panel layout-section-wrap"><div class="layout-section-head"><b class="layout-section-title">Secciones X / Y</b></div><div class="layout-section-body layout-section-grid"><div class="layout-section-card"><div class="layout-section-sub">Sección eje X</div><svg id="layoutSectionSvg" viewBox="0 0 500 145"><rect x="20" y="20" width="460" height="100" rx="8" fill="#e6eee8"/></svg></div><div class="layout-section-card"><div class="layout-section-sub">Sección eje Y</div><svg id="layoutSectionSvgY" viewBox="0 0 500 145"><rect x="20" y="20" width="460" height="100" rx="8" fill="#e6eee8"/></svg></div></div></div></div></main>
<aside id="layoutRightPanel" class="layout-right-panel v80-right-panel"><div class="layout-right-head"><b>Inspector del layout</b></div><div class="layout-right-scroll"><div class="layout-prop-card"><div class="layout-prop-title">Elemento seleccionado</div><div class="layout-selected-title">Zona Z1</div></div><div class="layout-prop-card"><div class="layout-prop-title">Capas visibles</div><div class="layout-layer-grid"><label class="layout-layer-toggle"><input type="checkbox" checked/><span>Grilla</span></label><label class="layout-layer-toggle"><input type="checkbox" checked/><span>Zonas</span></label></div></div></div></aside></div></div></div>'''
sheet='''<div class="form-wrap sheet-config-workspace"><div class="branches-panel sheet-config-container"><div class="branches-scroll sheet-config-list"><div class="sheet-branch-card open"><div class="sheet-branch-head"><div>Sucursal principal</div><div class="sheet-branch-meta"><span>Mapeo listo</span><span class="sheet-expand-glyph">−</span></div></div><div class="sheet-branch-body"><div class="sheet-branch-grid"><input placeholder="URL Sheet"/><input placeholder="Nombre hoja"/></div><div class="sheet-actions"><button class="btn">Leer fila 1</button></div><div class="sheet-mini-preview"><details class="sheet-headers-disclosure"><summary>Encabezados detectados <span class="sheet-header-count">27</span></summary><div class="sheet-preview-row"><span class="sheet-preview-chip">SKU</span></div></details><div class="sheet-map-row"><select><option>SKU</option></select><select><option>Sku</option></select><button class="tiny-btn">↑</button><button class="tiny-btn">↓</button><button class="tiny-btn">×</button></div></div></div></div></div></div></div>'''
html=f'''<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>{css}</style></head><body class="theme-light"><div id="appRoot" class="app editor-workspace"><aside class="panel sidebar"><div class="sidebar-top"><div class="brand-box">W</div><div class="brand-text"><b>WMS Industrial</b><span>Gestión de almacenes</span></div></div></aside><section class="panel content-panel"><div class="panel-header"><b>Editor de layout</b></div><div class="content-wrap"></div><div class="content-foot"></div></section></div></body></html>'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 problems=[]; reports=[]
 for width,height in [(1440,900),(900,900),(390,844)]:
  page=browser.new_page(viewport={'width':width,'height':height})
  page.set_content(html,wait_until='domcontentloaded',timeout=20000)
  for screen in ['layout','sheet']:
   page.evaluate('''(p)=>{
      document.body.dataset.screen=p.screen;
      const app=document.getElementById('appRoot');app.classList.toggle('editor-workspace',p.screen==='layout');app.classList.toggle('sheet-swap-layout',p.screen==='sheet');
      if(p.screen==='sheet'){app.style.gridTemplateColumns='minmax(0,1fr)';}else{app.style.gridTemplateColumns='minmax(0,1fr)'};
      document.querySelector('.content-wrap').innerHTML=p.html;
   }''',{'screen':screen,'html':layout if screen=='layout' else sheet})
   rows=[]
   for theme in ['light','dark']:
    page.evaluate('''(t)=>{document.body.className='theme-'+t}''',theme)
    metric=page.evaluate('''() => {
       let sels=['.layout-cad-v80','.v80-canvas-card','#layoutSectionWrap','#layoutSectionSvg','#layoutSectionSvgY','#layoutRightPanel','.sheet-config-container','.sheet-branch-card.open','.sheet-branch-body','.sheet-headers-disclosure'];
       const b=(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,background:getComputedStyle(e).backgroundColor,overflow:getComputedStyle(e).overflow}};
       return {viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth-innerWidth,items:Object.fromEntries(sels.map(s=>[s,b(s)]))};
    }''')
    rows.append(metric)
   a,b=rows
   for sel in a['items']:
    x,y=a['items'][sel],b['items'][sel]
    if x and y and max(abs(x[k]-y[k]) for k in ('x','y','w','h'))>1.25:problems.append([width,screen,sel,'tema cambia dimensiones'])
   for idx,r in enumerate(rows):
    if r['overflow']>12:problems.append([width,screen,'desbordamiento',r['overflow']])
    if screen=='layout':
      sec=r['items']['#layoutSectionSvg'];sec2=r['items']['#layoutSectionSvgY'];canvas=r['items']['.v80-canvas-card']
      if sec and sec2 and abs(sec['y']-sec2['y'])>2:problems.append([width,screen,'secciones apiladas'])
      if sec and canvas and sec['y']<canvas['bottom']-2:problems.append([width,screen,'sección sobre canvas'])
    if screen=='sheet':
      card=r['items']['.sheet-branch-card.open'];body=r['items']['.sheet-branch-body']
      if card and body and body['bottom']>card['bottom']+2:problems.append([width,screen,'sucursal recortada'])
    reports.append({'width':width,'screen':screen,'theme':idx,'metrics':r})
   print(width,screen,'tema y geometría','OK' if not problems else problems[-1],flush=True)
  page.close()
 browser.close()
(root/'tests'/'reporte-v175-css.json').write_text(json.dumps({'problems':problems,'reports':reports},indent=2,ensure_ascii=False))
print('Problemas hallados:',problems)
if problems:raise SystemExit(1)
