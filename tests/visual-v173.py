"""Verificación real de DOM y CSS en Chromium, sin dependencias de backend.
No simula WebGL ni sincronización D1: se comprueban solo elementos verificables.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import json,re
ROOT=Path(__file__).resolve().parents[1];PUB=ROOT/'public'; OUT=ROOT/'auditoria-v173';OUT.mkdir(exist_ok=True)
html=(PUB/'index.html').read_text()
imports=re.findall(r"@import url\(['\"]\./styles/([^'\"]+)['\"]\)",(PUB/'assets/app.css').read_text())
css='\n'.join((PUB/'assets/styles'/name).read_text() for name in imports)
html=re.sub(r'<link rel="stylesheet" href="\./assets/app\.css[^>]*>',lambda _: '<style>'+css+'</style>',html)
html=re.sub(r'<script src="\./assets/app-main\.runtimefix\.js[^>]*></script>',lambda _: '<script>'+(PUB/'assets/app-main.runtimefix.js').read_text()+'</script>',html)
measure='''() => {
 const b=(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect(),c=getComputedStyle(e);return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,display:c.display,background:c.backgroundColor,overflow:c.overflow,scroll:e.scrollHeight};};
 return {root:b('#appRoot'),content:b('.content-wrap'),stage:b('.vspace-stage'),virtual:b('.vspace-root'),bar:b('.vspace-toolbar'),controls:b('.vspace-toolbar-right'),sheetContainer:b('.sheet-config-container'),sheetCard:b('.sheet-branch-card.open'),sheetBody:b('.sheet-branch-card.open .sheet-branch-body'),searchCard:b('.search-card:not(.search-card-expanded)'),sheetToolbar:b('.product-toolbar'),sheetTable:b('.search-results-wrap'),cad:b('.layout-cad-v80'),cadBar:b('.layout-cad-localbar-v80'),cadContext:b('.layout-contextual-bar'),canvas:b('.v80-canvas-card'),sections:b('#layoutSectionWrap'),sectionX:b('#layoutSectionSvg'),sectionY:b('#layoutSectionSvgY'),inspector:b('.v80-right-panel'),docOverflow:document.documentElement.scrollWidth-innerWidth,theme:document.body.className};
}'''
rows=[];issues=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security','--use-angle=swiftshader'])
 for w,h in [(390,844),(1440,900)]:
  page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  page.route('https://fonts.googleapis.com/**',lambda r:r.abort());page.route('https://fonts.gstatic.com/**',lambda r:r.abort())
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)[:200]))
  page.set_content(html,wait_until='domcontentloaded');page.locator('#loginUsername').fill('visual-test');page.locator('#loginPassword').fill('visual-test');page.locator('#btnDoLogin').click();page.wait_for_timeout(80)
  for screen in ['virtual','layout','sheet']:
   page.locator(f'.sidebar .menu-item[data-screen="{screen}"]').first.evaluate('(n)=>n.click()')
   page.wait_for_timeout(55)
   if screen=='layout':
    if page.locator('#btnToggleSections').get_attribute('aria-pressed')!='true':page.locator('#btnToggleSections').evaluate('(n)=>n.click()')
   dims={}
   for theme in ['light','dark']:
    page.locator('#toggleThemeCheckbox').evaluate('''(n,theme)=>{const desired=theme==='light';if(n.checked!==desired){n.checked=desired;n.dispatchEvent(new Event('change',{bubbles:true}));}}''',theme)
    page.wait_for_timeout(45)
    m=page.evaluate(measure); dims[theme]=m
    bad=[]
    if m['docOverflow']>6:bad.append('desbordamiento_documento')
    if screen=='virtual' and w>=1200:
     if m['bar'] and m['stage'] and m['bar']['bottom']>m['stage']['y']+2:bad.append('toolbar_se_superpone_a_canvas')
     if m['virtual'] and m['content'] and m['virtual']['h']<.84*m['content']['h']:bad.append('virtual_no_llena_contenedor')
    if screen=='sheet':
     if not m['sheetCard']:bad.append('sucursal_no_expandida')
     elif m['sheetBody']['bottom']>m['sheetCard']['bottom']+2:bad.append('contenido_sucursal_recortado')
     if m['sheetToolbar'] and m['sheetToolbar']['h']>48:bad.append('toolbar_productos_demasiado_alta')
     if m['searchCard'] and m['sheetTable'] and m['searchCard']['bottom']>m['sheetTable']['y']+1:bad.append('card_se_superpone_tabla')
    if screen=='layout':
     if not m['sectionX'] or not m['sectionY']:bad.append('secciones_no_visibles')
     elif abs(m['sectionX']['y']-m['sectionY']['y'])>3:bad.append('secciones_no_horizontales')
     if m['sections'] and m['canvas'] and m['sections']['y']<m['canvas']['bottom']-2:bad.append('secciones_se_superponen_plano')
     if m['cadBar'] and m['cadContext'] and m['cadBar']['bottom']>m['cadContext']['y']+2:bad.append('barra_solapada_contexto')
    if bad: issues.append({'resolution':f'{w}x{h}','screen':screen,'theme':theme,'issues':bad})
    rows.append({'resolution':f'{w}x{h}','screen':screen,'theme':theme,'metrics':m,'issues':bad,'runtimeErrors':errors[-3:]})
    if (w,h) in [(390,844),(1440,900)] and screen in ['sheet','layout','virtual']:
     page.screenshot(path=str(OUT/f'{screen}-{theme}-{w}x{h}.png'),timeout=9000,animations='disabled')
   # Contrast only, no layout changes when toggling themes
   for selector in {'virtual':['virtual','stage','controls'],'layout':['cad','cadBar','canvas','inspector','sections'],'sheet':['sheetContainer','sheetCard','sheetToolbar','sheetTable']}[screen] if screen!='admin' else []:
    a=dims['light'].get(selector);b=dims['dark'].get(selector)
    if a and b and max(abs(a[k]-b[k]) for k in ('x','y','w','h'))>2.2:issues.append({'resolution':f'{w}x{h}','screen':screen,'issues':['cambio_de_geometria_entre_temas',selector]})
   if screen=='layout':
    page.locator('#btnToggleSections').evaluate('(n)=>n.click()');page.wait_for_timeout(30)
    if page.locator('#layoutSectionWrap').evaluate('(n)=>getComputedStyle(n).display')!='none':issues.append({'resolution':f'{w}x{h}','screen':'layout','issues':['boton_no_oculta_secciones']})
   print(f'{w}x{h} {screen}: '+('OK' if not any(i['resolution']==f'{w}x{h}' and i['screen']==screen for i in issues) else 'REVISAR'))
  page.close()
 browser.close()
(OUT/'reporte.json').write_text(json.dumps({'results':rows,'issues':issues},indent=2,ensure_ascii=False))
print('TOTAL PROBLEMAS',len(issues))
for issue in issues:print(issue)
if issues:raise SystemExit(1)
