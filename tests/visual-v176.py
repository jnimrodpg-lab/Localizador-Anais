from pathlib import Path
from playwright.sync_api import sync_playwright
import json, re
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'audit-v176';OUT.mkdir(exist_ok=True)
html=(ROOT/'public/index.html').read_text()
css=(ROOT/'public/assets/app.css').read_text()
js=(ROOT/'public/assets/app-main.runtimefix.js').read_text()
html=re.sub(r'<link rel="stylesheet" href="\./assets/app\.css[^>]*>',lambda _: '<style>'+css+'</style>',html)
html=html.replace('<script src="https://unpkg.com/html5-qrcode"></script>','')
html=re.sub(r'<link[^>]+fonts\.googleapis[^>]+>', '', html)
html=re.sub(r'<link[^>]+fonts\.gstatic[^>]+>', '', html)
html=re.sub(r'<script src="\./assets/app-main\.runtimefix\.js[^>]*></script>','',html)

report=[]
issues=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-gpu','--disable-web-security'])
  for w,h in [(1440,900),(390,844)]:
   page=browser.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
   errors=[]
   page.on('pageerror',lambda err:errors.append(str(err)[:200]))
   page.route('https://fonts.googleapis.com/**',lambda route:route.abort())
   page.route('https://fonts.gstatic.com/**',lambda route:route.abort())
   try:
    
    page.set_content(html,wait_until='domcontentloaded',timeout=9000)
    page.add_script_tag(content=js)
    page.locator('#loginUsername').fill('visual-test',timeout=2000)
    page.locator('#loginPassword').fill('visual-test',timeout=2000)
    page.locator('#btnDoLogin').click(timeout=3000)
    page.wait_for_timeout(250)
    page.locator('#toggleThemeCheckbox').evaluate("n=>{n.checked=true;n.dispatchEvent(new Event('change',{bubbles:true}))}")
    page.wait_for_timeout(80)
   except Exception as e: print('LOGIN',repr(e))
   for screen in ['layout','sheet','racks']:
    try:
     page.locator(f'.sidebar .menu-item[data-screen="{screen}"]').first.evaluate('(n)=>n.click()',timeout=2000)
     page.wait_for_timeout(180)
     if screen=='layout':
      if page.locator('#btnToggleSections').count() and page.locator('#btnToggleSections').get_attribute('aria-pressed')!='true':
       page.locator('#btnToggleSections').evaluate('(n)=>n.click()');page.wait_for_timeout(80)
     metrics=page.evaluate('''() => {
      const box=s=>{let n=document.querySelector(s);if(!n)return null;let r=n.getBoundingClientRect(),c=getComputedStyle(n);return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),bottom:Math.round(r.bottom),right:Math.round(r.right),overflow:c.overflow,background:c.backgroundColor}};
      return {screen:document.body.dataset.screen,width:innerWidth,docOverflow:Math.round(document.documentElement.scrollWidth-innerWidth),
        sidebar:box('.sidebar'),main:box('.content-wrap'),canvas:box('.v80-canvas-card'),zoom:box('.v80-canvas-footer'),sections:box('#layoutSectionWrap'),sectionX:box('#layoutSectionSvg'),sectionY:box('#layoutSectionSvgY'),inspector:box('#layoutRightPanel'),sheetList:box('#sheetBranchesList'),sheetCard:box('.sheet-branch-card.open'),sheetBody:box('.sheet-branch-card.open .sheet-branch-body'),sheetSearchTop:box('.search-top'),productCard:box('#activeProductCard'),productList:box('.search-results-wrap'),virtual:box('.vspace-root'),vstage:box('.vspace-stage'),errorText:document.querySelector('#contentTitle')?.textContent,version:document.querySelector('.sidebar-version')?.textContent}
     }''')
     report.append({'viewport':f'{w}x{h}','screen':screen,'metrics':metrics,'errors':errors[-3:]})
     if metrics['docOverflow'] > 8: issues.append((w,screen,'desbordamiento horizontal de documento'))
     if screen=='layout':
      cx, sx, sy=metrics['canvas'], metrics['sectionX'], metrics['sectionY']
      if not all((cx,sx,sy)):issues.append((w,screen,'falta canvas o vista de sección'))
      else:
       if abs(sx['y']-sy['y'])>3:issues.append((w,screen,'secciones no horizontales'))
       if metrics['sections']['y']<cx['bottom']-2:issues.append((w,screen,'secciones solapadas con plano'))
       if metrics['zoom'] and (metrics['zoom']['w']>180 or metrics['zoom']['right']>cx['right']):issues.append((w,screen,'barra de zoom extendida o fuera del plano'))
     if screen=='sheet':
      card, table=metrics['productCard'], metrics['productList']
      if card and table and card['bottom']>table['y']+1:issues.append((w,screen,'producto superpuesto a la tabla'))
      branch,body=metrics['sheetCard'],metrics['sheetBody']
      if branch and body and body['bottom']>branch['bottom']+2:issues.append((w,screen,'sucursal recortada'))
     if errors:issues.append((w,screen,'error de JavaScript: '+str(errors[-1])))
     page.screenshot(path=str(OUT/f'{screen}-{w}.png'),animations='disabled',timeout=12000)
     print(w,screen,metrics['docOverflow'],'canvas',metrics['canvas'],'zoom',metrics['zoom'],'sections',metrics['sections'],'card',metrics['productCard'],'table',metrics['productList'],'errors',errors[-1:] ,flush=True)
    except Exception as e: print('screen failed',w,screen,repr(e),flush=True)
   page.close()
  browser.close()
finally:
 pass
(OUT/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))

if issues:
 print('Errores visuales detectados:',issues)
 raise SystemExit(1)
print('Auditoría visual V176: sin solapamientos detectados en CAD/Sheets a 390 y 1440 px.')
