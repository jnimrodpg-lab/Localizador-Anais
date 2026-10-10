"""Auditoría WMS v172: responsive, modos de color, secciones y expansión."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re, json
ROOT=Path(__file__).resolve().parents[1]
PUB=ROOT/'public'
html=(PUB/'index.html').read_text()
css_paths=re.findall(r"@import url\(['\"]\.\/styles\/([^'\"]+)['\"]\)", (PUB/'assets/app.css').read_text())
css='\n'.join((PUB/'assets/styles'/n).read_text() for n in css_paths)
html=re.sub(r'<link rel="stylesheet" href="\./assets/app\.css[^>]*>',lambda m:'<style>'+css+'</style>',html)
html=re.sub(r'<script src="\./assets/app-main\.runtimefix\.js[^>]*></script>',lambda m:'<script>'+(PUB/'assets/app-main.runtimefix.js').read_text()+'</script>',html)
shots=ROOT/'visual-audit-v172';shots.mkdir(exist_ok=True)
rows=[];problems=[]
measure='''() => {
  const b=s=>{const e=document.querySelector(s);if(!e)return null; const r=e.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom,display:getComputedStyle(e).display, background:getComputedStyle(e).backgroundColor}};
  return {app:b('#appRoot'),content:b('.content-wrap'),virtual:b('.vspace-root'),main:b('.vspace-main'),stage:b('.vspace-stage'),layout:b('.layout-cad-v80'),canvas:b('.v80-canvas-card'),sections:b('#layoutSectionWrap'),sectionX:b('#layoutSectionSvg'),sectionY:b('#layoutSectionSvgY'),branches:b('.company-branches-shell'),branch:b('.company-branch-card'),branchBody:b('.company-branch-body'),docOverflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,theme:document.body.className}
}'''
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-web-security','--use-gl=angle','--use-angle=swiftshader'])
 for width,height in [(390,844),(768,1024),(1180,800),(1440,900),(1720,890),(1920,1080)]:
  pg=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
  pg.route('https://fonts.googleapis.com/**',lambda r:r.abort());pg.route('https://fonts.gstatic.com/**',lambda r:r.abort())
  errors=[];pg.on('pageerror',lambda e:errors.append(str(e)[:200]))
  pg.set_content(html,wait_until='domcontentloaded')
  pg.locator('#loginUsername').fill('visual-test');pg.locator('#loginPassword').fill('visual-test');pg.locator('#btnDoLogin').click()
  pg.wait_for_timeout(150)
  for screen in ['virtual','layout','admin']:
   pg.locator(f'.sidebar .menu-item[data-screen="{screen}"]').first.evaluate('(n)=>n.click()')
   pg.wait_for_timeout(100)
   if screen=='layout':
    if pg.locator('#btnToggleSections').get_attribute('aria-pressed') != 'true':
     pg.locator('#btnToggleSections').evaluate('(n)=>n.click()')
    pg.wait_for_timeout(80)
   for theme in ['dark','light']:
    pg.locator('#toggleThemeCheckbox').evaluate('''(node,theme)=>{const wanted=theme==='light'; if(node.checked!==wanted){node.checked=wanted; node.dispatchEvent(new Event('change',{bubbles:true}));}}''',theme)
    pg.wait_for_timeout(50)
    m=pg.evaluate(measure)
    if width in (390,1440,1720) and screen in ('virtual','layout','admin'):
     pg.screenshot(path=str(shots/f'{screen}-{theme}-{width}x{height}.png'),timeout=16000,animations='disabled')
    problems_here=[]
    if m['docOverflow']>4:problems_here.append('overflow_document:'+str(m['docOverflow']))
    if screen=='virtual' and width>1180:
     if not m['virtual'] or m['virtual']['h']<m['content']['h']*.85:problems_here.append('virtual_no_fill')
    if screen=='layout':
     if width>1180 and m['layout']['h']<m['content']['h']*.85:problems_here.append('layout_no_fill')
     if not m['sectionX'] or not m['sectionY']:problems_here.append('section_missing')
     elif abs(m['sectionX']['y']-m['sectionY']['y'])>3:problems_here.append('not_horizontal')
     if width>1180 and m['sections'] and m['canvas'] and m['sections']['y']<m['canvas']['bottom']-3:problems_here.append('section_overlaps_canvas')
    if screen=='admin' and m['branch'] and m['branchBody']:
     if m['branchBody']['bottom']>m['branch']['bottom']+4:problems_here.append('expanded_branch_overflow')
    row=dict(resolution=f'{width}x{height}',screen=screen,theme=theme,metrics=m,issues=problems_here,errors=errors[-3:]);rows.append(row)
    print(row['resolution'],screen,theme,'issues',problems_here,'virt',int(m['virtual']['h']) if m['virtual'] else '-', 'canvas',int(m['canvas']['h']) if m['canvas'] else '-', 'sections',m['sectionX']['y'] if m['sectionX'] else '-')
    problems.extend([(row['resolution'],screen,theme,e) for e in problems_here])
   if screen=='layout':
    pg.locator('#btnToggleSections').evaluate('(n)=>n.click()')
    pg.wait_for_timeout(25)
    hide_ok=pg.evaluate('''() => {const e=document.querySelector('#layoutSectionWrap');return !e || getComputedStyle(e).display==='none'}''')
    if not hide_ok:problems.append((str(width),'layout','toggle','not_hidden'))
  pg.close()
 browser.close()
(shots/'report.json').write_text(json.dumps({'measurements':rows,'problems':problems},indent=2,ensure_ascii=False))
print('ISSUES:',problems)
if problems:raise SystemExit(2)
