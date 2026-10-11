import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import os from 'node:os';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';const require=createRequire(import.meta.url);
const {chromium:pw}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
(async()=>{
 const root=fileURLToPath(new URL('../public/',import.meta.url));
 const server=http.createServer((req,res)=>{let file=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 let buf=fs.readFileSync(file);if(file.endsWith('app-main.runtimefix.js'))buf=Buffer.from(buf.toString().replace('  bootstrapApp();','  window.__test={appState,setScreen,renderLayoutEditor,v212SetMode,persistActiveLayout,loadLayoutForBranch,ensureLayoutMeta,getVspace:()=>vspaceActive,v213RenameZone,v213ApplyLength,v213ApplyPlacement,v212Commit,undoHistory,redoHistory,saveRemoteAppState,getWallSlicePolygon,ensureWallTopology}; bootstrapApp();'));
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(buf);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await pw.launch({executablePath:process.env.WMS_TEST_BROWSER||pw.executablePath(),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'],headless:true});
 const page=await browser.newPage({viewport:{width:1560,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.setDefaultTimeout(20000);
 await page.route('https://**',route=>route.abort());
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.__test);
 await page.evaluate(()=>{const t=window.__test,s=t.appState;const r=(x,y,w,h)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];s.auth={loggedIn:true,user:'qa',role:'admin',localMode:true};document.getElementById('authModal')?.classList.remove('show');document.body.classList.remove('auth-open');document.getElementById('authModal').style.display='none';
 s.layout={zones:[{id:'Z1',name:'Almacén',color:'#75a9d4',kind:'virtual',pts:r(40,40,200,240)},{id:'Z2',name:'Ventas',color:'#72b58b',kind:'virtual',pts:r(240,40,160,240)}],racks:[],walls:[],wallNodes:[],rooms:[],openings:[],streets:[],measurements:[],meta:{siteBoundary:{id:'AREA-GENERAL',name:'Área comercial',pts:r(0,0,500,400)},scaleCmPerUnit:1,autoFitBoundaryToZones:false,zoneSemantics:'virtual',commercialAreaV209:true,architectureInitializedV180:true}};s.history={};s.selectedZoneId='Z1';s.editor.architectureTool='zones';s.editor.sectionVisible=false;s.editor.viewBox={x:-80,y:-50,w:720,h:540};s.editor.viewBoxCustomized=true;s.editor.viewBoxInitialized=true;t.setScreen('layout');});

 await page.waitForSelector('#v213ZoneName');
 const state=async(fn)=>page.evaluate(fn);
 const point=async(x,y)=>page.evaluate(({x,y})=>{const svg=document.querySelector('#layoutSvg'),p=svg.createSVGPoint();p.x=x;p.y=y;const s=p.matrixTransform(svg.getScreenCTM());return{x:s.x,y:s.y};},{x,y});
 const ids=await state(()=>JSON.stringify(window.__test.appState.layout.zones.map(z=>z.id)));
 await page.locator('#v213ZoneName').fill('Recepción y despacho');await page.locator('#v213ZoneName').press('Enter');
 assert.equal(await state(()=>window.__test.appState.layout.zones[0].name),'Recepción y despacho');
 assert.equal(await state(()=>JSON.stringify(window.__test.appState.layout.zones.map(z=>z.id))),ids);
 assert.match(await page.locator('#v213HistoryHint').textContent(),/cambio de nombre/);
 await page.locator('#v212Undo').click();assert.equal(await state(()=>window.__test.appState.layout.zones[0].name),'Almacén');
 await page.locator('#v212Redo').click();assert.equal(await state(()=>window.__test.appState.layout.zones[0].name),'Recepción y despacho');
 await page.locator('[data-v213-zone-name="Z1"]').dblclick({delay:80});
 await page.locator('#v213RenameInput').fill('Almacén central');await page.locator('#v213RenameForm button[type=submit]').click();
 assert.equal(await state(()=>window.__test.appState.layout.zones[0].name),'Almacén central');
 assert.equal(await state(()=>window.__test.appState.layout.zones[0].pts.length),4,'Rename cannot insert vertices');
 const geom=await state(()=>JSON.stringify(window.__test.appState.layout.zones.map(z=>z.pts)));
 await page.locator('[data-v213-dimension="zones"][data-v213-edge="1"]').click();
 await page.locator('#v213LengthAnchor').selectOption('end');await page.locator('#v213LengthInput').fill('2.2');await page.locator('#v213LengthForm button[type=submit]').click();
 assert.equal(await state(()=>window.__test.appState.layout.zones[0].pts[2].y),280,'Fixed endpoint B stays put');
 assert(Math.abs(await state(()=>window.__test.appState.layout.zones[0].pts[1].y)-60)<1e-8);
 assert(Math.abs(await state(()=>window.__test.appState.layout.zones[1].pts[0].y)-60)<1e-8,'Shared neighbor moves atomically');
 await page.locator('#v212Undo').click();assert.equal(await state(()=>JSON.stringify(window.__test.appState.layout.zones.map(z=>z.pts))),geom);
 if(!await page.locator('[data-v213-lock="walls"]').isVisible())await page.locator('#v213OpenLayers').click();await page.locator('[data-v213-lock="zones"]').click();
 assert(await page.locator('#v213ZoneName').isDisabled());
 let p=await point(100,170);await page.mouse.move(p.x,p.y);await page.mouse.down();await page.mouse.move(p.x+40,p.y+40);await page.mouse.up();
 assert.equal(await state(()=>JSON.stringify(window.__test.appState.layout.zones.map(z=>z.pts))),geom,'Locked layer ignores drag');
 await page.locator('[data-v213-lock="zones"]').click();await page.locator('[data-v213-visible="showZones"]').click();
 assert.equal(await page.locator('.ortho-zone:visible').count(),0);assert.equal(await page.locator('[data-v213-dimension="zones"]:visible').count(),0);
 await page.locator('[data-v213-visible="showZones"]').click();
 await state(()=>{const t=window.__test,s=t.appState;s.layout.walls=[{id:'W1',name:'Muro principal',x1:40,y1:40,x2:240,y2:40,thickness:14,height:290,placement:'center',ownerAreaId:'AREA-GENERAL',zoneBoundarySource:{zoneId:'Z1',edgeIndex:0}},{id:'W2',x1:240,y1:40,x2:240,y2:280,thickness:14,height:290,placement:'center',ownerAreaId:'AREA-GENERAL'}];s.layout.openings=[{id:'O1',wallId:'W1',t:.5,offset:100,width:60,height:210,type:'door',sill:0}];t.ensureWallTopology();t.v212SetMode('walls');s.selectedWallId='W1';t.renderLayoutEditor();});
 const linked=await state(()=>JSON.stringify({walls:window.__test.appState.layout.walls.map(w=>({id:w.id,x1:w.x1,y1:w.y1,x2:w.x2,y2:w.y2,start:w.startNodeId,end:w.endNodeId})),openings:window.__test.appState.layout.openings}));
 const oldJoin=await state(()=>JSON.stringify(window.__test.getWallSlicePolygon(window.__test.appState.layout.walls[1],0,1,1).poly));
 assert(await page.locator('[data-v213-wall-control="W1"]').isVisible());
 await page.locator('[data-v213-wall-control="W1"]').click();await page.locator('[data-v213-placement="outside"]').click();
 assert.equal(await state(()=>window.__test.appState.layout.walls[0].placement),'center','Preview does not mutate saved wall');
 assert.equal(await page.locator('[data-v213-preview] path').count()>0,true);
 await page.screenshot({animations:'disabled',path:path.join(os.tmpdir(),'wms-v213-wall-preview.png')});
 await page.locator('#v213PlacementCancel').click();assert.equal(await page.locator('[data-v213-preview]').count(),0);
 await page.locator('[data-v213-wall-control="W1"]').click();await page.locator('[data-v213-placement="outside"]').click();await page.locator('#v213PlacementApply').click();
 assert.equal(await state(()=>window.__test.appState.layout.walls[0].placement),'outside');
 assert.equal(await state(()=>JSON.stringify({walls:window.__test.appState.layout.walls.map(w=>({id:w.id,x1:w.x1,y1:w.y1,x2:w.x2,y2:w.y2,start:w.startNodeId,end:w.endNodeId})),openings:window.__test.appState.layout.openings})),linked,'Placement preserves axis nodes openings and IDs');
 assert.notEqual(await state(()=>JSON.stringify(window.__test.getWallSlicePolygon(window.__test.appState.layout.walls[1],0,1,1).poly)),oldJoin,'Neighbor join recalculates');
 await page.keyboard.press('Control+z');assert.equal(await state(()=>window.__test.appState.layout.walls[0].placement),'center');
 await page.keyboard.press('Control+y');assert.equal(await state(()=>window.__test.appState.layout.walls[0].placement),'outside');
 await page.locator('[data-v213-dimension="wall"]').click();await page.locator('#v213LengthAnchor').selectOption('end');await page.locator('#v213LengthInput').fill('1.8');await page.locator('#v213LengthForm button[type=submit]').click();
 assert.equal(await state(()=>window.__test.appState.layout.walls[0].x2),240);assert.equal(await state(()=>window.__test.appState.layout.walls[0].x1),60);
 await page.keyboard.press('Control+z');assert.equal(await state(()=>window.__test.appState.layout.walls[0].x1),40);
 if(!await page.locator('[data-v213-lock="walls"]').isVisible())await page.locator('#v213OpenLayers').click();await page.locator('[data-v213-lock="walls"]').click();
 assert(await page.locator('#rpWallThickness').isDisabled());assert.equal(await page.locator('[data-v213-wall-control]').count(),0);
 const locked=await state(()=>JSON.stringify(window.__test.appState.layout));await page.keyboard.press('Delete');assert.equal(await state(()=>JSON.stringify(window.__test.appState.layout)),locked);
 await page.locator('[data-v213-lock="walls"]').click();
 console.log('PASS editing: rename, dimensions, shared borders, wall preview, joins, undo, layers');
 // A response for an older snapshot must not report newer edits as synchronized.
 let release;const pending=new Promise(r=>release=r);let received=false;
 await page.route('**/api/app-state',async route=>{received=true;await pending;await route.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});});
 await state(()=>{window.__savePromise=window.__test.saveRemoteAppState('layout');});
 await page.waitForFunction(()=>window.__test.appState.ui.layoutSaveState==='saving');
 await state(()=>{const t=window.__test;t.appState.layout.walls[0].name='Cambio durante guardado';t.persistActiveLayout('nombre del muro');});
 release();await state(()=>window.__savePromise);assert(received);assert.equal(await state(()=>window.__test.appState.ui.layoutDirty),true);assert.match(await page.locator('#layoutSaveStatus').textContent(),/pendiente de sincronizar/);
 await state(()=>window.__test.saveRemoteAppState('layout'));assert.equal(await state(()=>window.__test.appState.ui.layoutDirty),false);assert.match(await page.locator('#layoutSaveStatus').textContent(),/Guardado en servidor/);
 await page.unroute('**/api/app-state');await page.route('**/api/app-state',route=>route.fulfill({status:503,body:'{"error":"unavailable"}',contentType:'application/json'}));await state(()=>window.__test.saveRemoteAppState('layout'));assert.equal(await state(()=>window.__test.appState.ui.layoutSaveState),'error');assert.match(await page.locator('#layoutSaveStatus').textContent(),/sincronización fallida/);
 // Verify the same readable layout in both themes at common laptop widths.
 for(const [width,height] of [[1560,1000],[1280,800],[1024,768]]){
  await page.setViewportSize({width,height});await page.locator('[data-architecture-tool="zones"]').click();await page.locator('[data-v211-zone="Z1"]').click();
  for(const theme of ['theme-dark','theme-light']){await state(()=>{});await page.evaluate(theme=>{document.body.classList.remove('theme-light','theme-dark');document.body.classList.add(theme);},theme);
   const b=await page.locator('#layoutSvg').boundingBox();assert(b.width>400&&b.height>350,'Canvas stays usable');assert(b.y>=0&&b.y+b.height<=height,'Canvas remains within viewport');const nameBox=await page.locator('#v213ZoneName').boundingBox();assert(nameBox.y>0&&nameBox.y<height,'Name field stays in view');
   await page.screenshot({animations:'disabled',path:path.join(os.tmpdir(),`wms-v213-${width}-${theme}.png`)});
  }
 }
 for(const workspace of ['urbanism','distribution','architecture']){await page.locator(`[data-layout-workspace="${workspace}"]`).click();const b=await page.locator('#layoutSvg').boundingBox();assert(b.height>350&&b.y>=0&&b.y+b.height<=768,workspace+' viewport');}
 await state(()=>window.__test.persistActiveLayout());const saved=await state(()=>JSON.stringify(window.__test.appState.layout));await state(()=>window.__test.loadLayoutForBranch(0));assert.equal(await state(()=>JSON.stringify(window.__test.appState.layout)),saved);
 await state(()=>window.__test.setScreen('virtual'));await page.waitForFunction(()=>window.__test.getVspace()?.world?.children.some(m=>m.userData?.zoneId==='Z1'),{},{timeout:20000});
 assert.equal(errors.length,0,errors.join('\n'));console.log('V213 UI PASS: rename in inspector/canvas, stable IDs, contextual dimensions with fixed endpoint, shared boundaries, wall placement preview/cancel/apply, join recalculation, preserved nodes/openings, undo/redo, layer visibility/locks, sync races/errors, reload, dark/light at 1560/1280/1024, 3D.');
 await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
