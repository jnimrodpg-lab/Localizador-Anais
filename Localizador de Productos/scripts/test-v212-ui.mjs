import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import os from 'node:os';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';const require=createRequire(import.meta.url);
const {chromium:pw}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
(async()=>{
 const root=fileURLToPath(new URL('../public/',import.meta.url));
 const server=http.createServer((req,res)=>{let file=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 let buf=fs.readFileSync(file);if(file.endsWith('app-main.runtimefix.js'))buf=Buffer.from(buf.toString().replace('  bootstrapApp();','  window.__test={appState,setScreen,renderLayoutEditor,v212SetMode,persistActiveLayout,loadLayoutForBranch,ensureLayoutMeta,getVspace:()=>vspaceActive}; bootstrapApp();'));
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(buf);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await pw.launch({executablePath:process.env.WMS_TEST_BROWSER||pw.executablePath(),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'],headless:true});
 const page=await browser.newPage({viewport:{width:1560,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.setDefaultTimeout(20000);
 await page.route('https://**',route=>route.abort());
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.__test);
 await page.evaluate(()=>{const t=window.__test,s=t.appState;const r=(x,y,w,h)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];s.auth={loggedIn:true,user:'qa',role:'admin',localMode:true};document.getElementById('authModal')?.classList.remove('show');document.body.classList.remove('auth-open');document.getElementById('authModal').style.display='none';
 s.layout={zones:[{id:'Z1',name:'Almacén',color:'#75a9d4',kind:'virtual',pts:r(40,40,200,240)},{id:'Z2',name:'Ventas',color:'#72b58b',kind:'virtual',pts:r(240,40,160,240)}],racks:[],walls:[],wallNodes:[],rooms:[],openings:[],streets:[],measurements:[],meta:{siteBoundary:{id:'AREA-GENERAL',name:'Área comercial',pts:r(0,0,500,400)},scaleCmPerUnit:1,autoFitBoundaryToZones:false,zoneSemantics:'virtual',commercialAreaV209:true,architectureInitializedV180:true}};s.selectedZoneId='Z1';s.editor.architectureTool='zones';s.editor.sectionVisible=false;s.editor.viewBox={x:-80,y:-50,w:720,h:540};s.editor.viewBoxCustomized=true;s.editor.viewBoxInitialized=true;t.setScreen('layout');});
 await page.waitForSelector('#v212AddPoint');await page.screenshot({timeout:30000,animations:'disabled',path:path.join(os.tmpdir(),'wms-v212-qa-zones.png')});
 assert.equal(await page.locator('[data-architecture-tool]').count(),3);
 await page.locator('#v213GeometryToggle').click();await page.locator('#v212EdgeIndex').selectOption('1');await page.locator('#v212AddPoint').click();
 assert.equal(await page.evaluate(()=>window.__test.appState.layout.zones[0].pts.length),5);
 assert.equal(await page.evaluate(()=>window.__test.appState.layout.zones[1].pts.length),5);
 await page.locator('#v212VertexIndex').selectOption('2');await page.locator('#v212X').fill('2.2');await page.locator('#v212ApplyPoint').click();
 assert(await page.evaluate(()=>window.__test.appState.layout.zones[1].pts.some(p=>Math.abs(p.x-220)<1e-8&&Math.abs(p.y-160)<1e-8)));
 await page.locator('#v212Undo').click();assert(await page.evaluate(()=>window.__test.appState.layout.zones[0].pts[2].x===240));
 await page.locator('#v212Redo').click();assert(await page.evaluate(()=>Math.abs(window.__test.appState.layout.zones[0].pts[2].x-220)<1e-8));
 await page.locator('#v212VertexIndex').selectOption('2');await page.locator('#v212RemovePoint').click();assert.equal(await page.evaluate(()=>window.__test.appState.layout.zones[0].pts.length),4);
 await page.locator('#v212Lock').click();assert(await page.locator('#v212ApplyPoint').isDisabled());await page.locator('#v212Lock').click();
 await page.locator('[data-architecture-tool="area"]').click();assert.equal(await page.locator('[data-site-vertex]').count(),4);assert.equal(await page.locator('[data-v211-zone]:visible').count(),0);
 await page.locator('#v213GeometryToggle').click();await page.locator('#v212VertexIndex').selectOption('1');await page.locator('#v212X').fill('1');await page.locator('#v212ApplyPoint').click();assert(await page.locator('#v212CancelArea').isVisible());
 assert.equal(await page.evaluate(()=>window.__test.appState.layout.meta.siteBoundary.pts[1].x),500);await page.locator('#v212CancelArea').click();
 await page.locator('#v212AddPoint').click();assert.equal(await page.locator('[data-site-vertex]').count(),5);await page.locator('#v212Undo').click();assert.equal(await page.locator('[data-site-vertex]').count(),4);
 await page.screenshot({timeout:30000,animations:'disabled',path:path.join(os.tmpdir(),'wms-v212-qa-area.png')});
 await page.locator('[data-architecture-tool="zones"]').click();await page.locator('[data-v211-zone="Z1"]').click();
 // Screen coordinate conversion uses the SVG CTM so the same test works after zoom.
 const point=async(x,y)=>page.evaluate(({x,y})=>{const svg=document.querySelector('#layoutSvg'),p=svg.createSVGPoint();p.x=x;p.y=y;const s=p.matrixTransform(svg.getScreenCTM());return{x:s.x,y:s.y};},{x,y});
 let c=await point(140,40);await page.mouse.dblclick(c.x,c.y,{delay:80});assert.equal(await page.evaluate(()=>window.__test.appState.layout.zones[0].pts.length),5,'Double click adds zone vertex');
 await page.locator('#v212Draw').click();for(const [x,y] of [[40,310],[200,310],[200,380],[120,380],[120,350],[40,350]]){const p=await point(x,y);await page.mouse.click(p.x,p.y);}
 await page.locator('#v212Finish').click();assert.equal(await page.evaluate(()=>window.__test.appState.layout.zones.length),3,'Irregular polygon draw saves');
 assert.equal(await page.evaluate(()=>window.__test.appState.layout.zones[2].pts.length),6);
 await page.evaluate(()=>window.__test.persistActiveLayout());const saved=await page.evaluate(()=>JSON.stringify(window.__test.appState.layout.zones.map(z=>({id:z.id,pts:z.pts}))));await page.evaluate(()=>window.__test.loadLayoutForBranch(0));assert.equal(await page.evaluate(()=>JSON.stringify(window.__test.appState.layout.zones.map(z=>({id:z.id,pts:z.pts})))),saved,'Reload preserves polygon points and IDs');
 await page.locator('[data-architecture-tool="walls"]').click();assert.equal(await page.locator('#v212Draw').count(),0);assert.equal(await page.locator('#v203WallApply').count(),1);
 await page.setViewportSize({width:1280,height:800});await page.screenshot({timeout:30000,animations:'disabled',path:path.join(os.tmpdir(),'wms-v212-qa-before-small.png')});await page.locator('[data-architecture-tool="zones"]').click();await page.locator('[data-v211-zone="Z3"]').click();await page.screenshot({timeout:30000,animations:'disabled',path:path.join(os.tmpdir(),'wms-v212-qa-small.png')});
 await page.evaluate(()=>window.__test.setScreen('virtual'));await page.waitForFunction(()=>window.__test.getVspace()?.world?.children.some(m=>m.userData?.zoneId==='Z3'),{},{timeout:20000});assert.equal(await page.evaluate(()=>window.__test.getVspace().world.children.filter(m=>m.userData?.zoneId).length),3);await page.locator('[data-vspace-cam="top"]').click();
 assert.equal(errors.length,0,errors.join('\n'));console.log('UI PASS: tabs, shared vertices, numeric edits, undo/redo, locks, staged area edits, area insertion, double click, irregular polygon, wall mode, 1280px layout. Local reload and 3D polygon surfaces passed. No JavaScript errors.');
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
