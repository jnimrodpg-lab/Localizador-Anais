"""Visual smoke: local preview only; requires pip install playwright & Chromium.
   Uses the application's existing *local development* sign-in (no production credentials).
   Captures dashboard/viewer/layout/3D in light/dark at 100% browser zoom.
"""
from pathlib import Path
import re, json, sys
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
PUB=ROOT/'public'
CSS_NAMES=['tokens','legacy-core','layout-cad','virtual-space','shell-v164','virtual-refinements','dashboard-base','theme-shell','theme-dashboard','theme-products','theme-editors','responsive']
css='\n'.join((PUB/'assets/styles'/f'{n}.css').read_text() for n in CSS_NAMES)
css=re.sub(r'@import url\([^;]+;', '', css)
html=(PUB/'index.html').read_text()
html=re.sub(r'<link rel="stylesheet" href="\./assets/app\.css[^>]*>',lambda m:'<style>'+css+'</style>',html)
js=(PUB/'assets/app-main.runtimefix.js').read_text()
html=re.sub(r'<script src="\./assets/app-main\.runtimefix\.js[^>]*></script>',lambda m:'<script>'+js+'</script>',html)
report=[]
shots=ROOT/'visual-audit';shots.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 for w,h in [(1366,768),(1440,900),(1920,1080)]:
  pg=b.new_page(viewport={'width':w,'height':h},device_scale_factor=1)
  errors=[]
  pg.on('pageerror',lambda e:errors.append(str(e)))
  pg.set_content(html,wait_until='domcontentloaded',timeout=45000)
  pg.locator('#loginUsername').fill('visual-test')
  pg.locator('#loginPassword').fill('visual-test')
  pg.locator('#btnDoLogin').click()
  pg.wait_for_timeout(300)
  for theme in ['light','dark']:
   state=pg.locator('#toggleThemeCheckbox').is_checked()
   if state != (theme=='light'):
    pg.locator('#toggleThemeCheckbox').evaluate('(el)=>{el.checked=!el.checked;el.dispatchEvent(new Event("change",{bubbles:true}))}')
   for view in ['admin','viewer','layout']:
    try:
     pg.locator(f'.sidebar .menu-item[data-screen="{view}"]').first.click(timeout=5000)
     pg.wait_for_timeout(180)
     measure=pg.evaluate('''() => {
       const r = document.querySelector('#appRoot');
       const children=Array.from(r?.children||[]).filter(e=>getComputedStyle(e).display!=='none');
       const boxes=children.map(e=>({name:e.className,w:Math.round(e.getBoundingClientRect().width),x:Math.round(e.getBoundingClientRect().left),right:Math.round(e.getBoundingClientRect().right)}));
       const docOverflow=document.documentElement.scrollWidth-document.documentElement.clientWidth;
       const appOverflow=r.scrollWidth-r.clientWidth;
       const cssSheets=Array.from(document.styleSheets).length;
       const headBg=getComputedStyle(document.querySelector('.panel-header')).backgroundColor;
       const contrastTexts=Array.from(document.querySelectorAll('button, .menu-item, h2, h3')).filter(e => {
          let r=e.getBoundingClientRect(); let s=getComputedStyle(e);
          return r.width>5&&r.height>5&&s.display!=='none'&&s.visibility!=='hidden'&&r.left>=-3&&r.left<innerWidth&&r.top>=0&&r.top<innerHeight&&s.color==='rgba(0, 0, 0, 0)';
       }).map(e=>e.innerText?.slice(0,30)).slice(0,10);
       return {docOverflow,appOverflow,cssSheets,headBg,boxes,contrastTexts};
     }''')
     target=shots/f'{view}-{theme}-{w}x{h}.png'
     if view in ('admin','viewer','layout'): pg.screenshot(path=str(target),full_page=False,animations='disabled')
     report.append(dict(resolution=f'{w}x{h}',theme=theme,screen=view,screenshot=target.name,errors=errors[-3:],**measure))
     print(view,theme,w,'doc overflow',measure['docOverflow'],'app overflow',measure['appOverflow'],'last error',errors[-1:] if errors else '')
    except Exception as e:
     report.append(dict(resolution=f'{w}x{h}',theme=theme,screen=view,error=str(e)[:300],jsErrors=errors[-4:]))
     print('FAIL',view,theme,w,str(e)[:140])
  pg.close()
 b.close()
(shots/'report.json').write_text(json.dumps(report,indent=2,ensure_ascii=False))
fail=[r for r in report if r.get('error') or r.get('docOverflow',0)>3 or r.get('appOverflow',0)>12 or r.get('contrastTexts')]
print('TOTAL',len(report),'ISSUES',len(fail))
for r in fail[:30]:print('ISSUE',r['resolution'],r['theme'],r['screen'],str(r.get('error','')),r.get('docOverflow'),r.get('appOverflow'))
if fail:sys.exit(2)
