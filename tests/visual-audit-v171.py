"""Smoke visual local: sin credenciales reales ni acceso a Cloudflare.
Usa el login de desarrollo incluido en el frontend y analiza overflow.
Ejecución: python tests/visual-audit-v171.py (requiere playwright/chromium).
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re,json
ROOT=Path(__file__).resolve().parents[1]
PUB=ROOT/'public'
html=(PUB/'index.html').read_text()
css_paths=re.findall(r"@import url\(['\"]\.\/styles\/([^'\"]+)['\"]\)", (PUB/'assets/app.css').read_text())
css='\n'.join((PUB/'assets/styles'/n).read_text() for n in css_paths)
html=re.sub(r'<link rel="stylesheet" href="\./assets/app\.css[^>]*>',lambda m:'<style>'+css+'</style>',html)
js=(PUB/'assets/app-main.runtimefix.js').read_text()
html=re.sub(r'<script src="\./assets/app-main\.runtimefix\.js[^>]*></script>',lambda m:'<script>'+js+'</script>',html)
out=ROOT/'visual-audit-v171';out.mkdir(exist_ok=True)
results=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-web-security'])
 for w,h in [(390,844),(768,1024),(1024,768),(1366,768),(1440,900),(1920,1080)]:
  page=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)[:200]))
  page.set_content(html,wait_until='domcontentloaded')
  page.locator('#loginUsername').fill('visual-test');page.locator('#loginPassword').fill('visual-test');page.locator('#btnDoLogin').click()
  page.wait_for_timeout(180)
  for screen in ['admin','sheet','viewer','layout','virtual','racks']:
   try:
    page.locator(f'.sidebar .menu-item[data-screen="{screen}"]').first.evaluate('(node)=>node.click()')
    page.wait_for_timeout(95)
    measure=page.evaluate('''() => {
      let root=document.querySelector('#appRoot');let r=root.getBoundingClientRect();
      let panels=[...root.children].filter(e=>getComputedStyle(e).display!=='none').map(e=>{
       let a=e.getBoundingClientRect();return {name:e.className.replace('panel ',''),x:Math.round(a.x),y:Math.round(a.y),w:Math.round(a.width),h:Math.round(a.height),right:Math.round(a.right),bottom:Math.round(a.bottom), scrollWidth:e.scrollWidth,clientWidth:e.clientWidth}});
      let card=document.querySelector('.company-branch-card.expanded'),body=card?.querySelector('.company-branch-body');
      let screenScrollW = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      return {dataScreen:document.body.dataset.screen,appWidth:Math.round(r.width),appHeight:Math.round(r.height),horizontalOverflow:screenScrollW,panels,companyBranchBodyVisible:body ? getComputedStyle(body).display !== 'none' : null,branchHeight:card?.scrollHeight||0,branchOuterHeight:card?.offsetHeight||0};
    }''')
    if (screen in ['admin','layout','virtual']) and w in [390,768,1440,1920]:
      page.screenshot(path=str(out/f'{screen}-{w}x{h}.png'),animations='disabled',timeout=15000)
    results.append({'viewport':f'{w}x{h}','screen':screen,'errors':errors[-5:],**measure})
    print(w,screen,measure['dataScreen'],'overflow',measure['horizontalOverflow'],'branch',measure['branchHeight'],measure['branchOuterHeight'],'errors',len(errors))
   except Exception as ex:
    results.append({'viewport':f'{w}x{h}','screen':screen,'error':str(ex)[:220]})
    print('ERROR',w,screen,str(ex)[:150])
  page.close()
 b.close()
(out/'report.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
print('Total',len(results),'overflow',[ (a['viewport'],a['screen'],a.get('horizontalOverflow')) for a in results if a.get('horizontalOverflow',0)>3 ])
