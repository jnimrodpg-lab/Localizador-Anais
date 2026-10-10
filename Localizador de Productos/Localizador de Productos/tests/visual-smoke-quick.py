from pathlib import Path
from playwright.sync_api import sync_playwright
import re,json,sys
R=Path(__file__).resolve().parents[1]
P=R/'public'
names=re.findall(r"@import url\('\./styles/([^']+)'\);",(P/'assets/app.css').read_text())
css='\n'.join((P/'assets/styles'/name).read_text() for name in names)
html=(P/'index.html').read_text()
html=re.sub(r'<link[^>]+https?://[^>]+>', '', html)
html=re.sub(r'<script[^>]+src="https?://[^"]+"[^>]*></script>', '', html)
html=re.sub(r'<link rel="stylesheet" href="\./assets/app\.css[^>]*>',lambda m:'<style>'+css+'</style>',html)
js=(P/'assets/app-main.runtimefix.js').read_text()
html=re.sub(r'<script src="\./assets/app-main\.runtimefix\.js[^>]*></script>',lambda m:'<script>'+js+'</script>',html)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 page=browser.new_page(viewport={'width':1366,'height':768})
 errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded',timeout=20000)
 page.locator('#loginUsername').fill('visual-test',timeout=10000)
 page.locator('#loginPassword').fill('visual-test')
 page.locator('#btnDoLogin').click(timeout=10000)
 page.wait_for_timeout(250)
 results=[]
 for name in ['admin','layout','racks']:
  try:
   page.locator(f'.sidebar .menu-item[data-screen="{name}"]').first.click(timeout=3500)
   page.wait_for_timeout(150)
   if name in ('admin','layout'):
    page.screenshot(path=str(R/f'visual-{name}-1366.png'),animations='disabled')
   r=page.evaluate('''() => ({horizontal: document.documentElement.scrollWidth-document.documentElement.clientWidth, app: document.querySelector('#appRoot').scrollWidth-document.querySelector('#appRoot').clientWidth, screen:document.body.dataset.screen || '', content:document.querySelector('.content-wrap')?.textContent.slice(0,65)})''')
   results.append({'view':name,**r})
  except Exception as e:results.append({'view':name,'error':str(e)[:130]})
 print(json.dumps({'checks':results,'jsErrors':errs[-5:]},ensure_ascii=False,indent=2))
 browser.close()
