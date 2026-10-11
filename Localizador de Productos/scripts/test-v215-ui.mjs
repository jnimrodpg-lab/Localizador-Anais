import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import os from 'node:os';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';const require=createRequire(import.meta.url);
const {chromium:pw}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
(async()=>{
 const root=fileURLToPath(new URL('../public/',import.meta.url));
 const server=http.createServer((req,res)=>{let file=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 let buf=fs.readFileSync(file);if(file.endsWith('app-main.runtimefix.js'))buf=Buffer.from(buf.toString().replace('  bootstrapApp();','  window.__test={appState,setScreen,renderLayoutEditor,v212SetMode,persistActiveLayout,loadLayoutForBranch,ensureLayoutMeta,getVspace:()=>vspaceActive,v214PlanArea,v214EnsureHierarchy,v214AreaContext,v212Insert,v212Remove,v212SetMode,v213RenameZone,v213ApplyLength,v213ApplyPlacement,v212Commit,undoHistory,redoHistory,saveRemoteAppState,getWallSlicePolygon,ensureWallTopology}; bootstrapApp();'));
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(buf);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await pw.launch({executablePath:process.env.WMS_TEST_BROWSER||pw.executablePath(),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'],headless:true});
 const page=await browser.newPage({viewport:{width:1560,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.setDefaultTimeout(20000);
 await page.route('https://**',route=>route.abort());
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.__test);
 await page.evaluate(()=>{const t=window.__test,s=t.appState;const r=(x,y,w,h)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];s.auth={loggedIn:true,user:'qa',role:'admin',localMode:true};document.getElementById('authModal')?.classList.remove('show');document.body.classList.remove('auth-open');document.getElementById('authModal').style.display='none';
 s.layout={zones:[{id:'Z1',name:'Almacén',color:'#75a9d4',kind:'virtual',pts:r(40,40,200,240)},{id:'Z2',name:'Ventas',color:'#72b58b',kind:'virtual',pts:r(240,40,160,240)}],racks:[],walls:[],wallNodes:[],rooms:[],openings:[],streets:[],measurements:[],meta:{siteBoundary:{id:'AREA-GENERAL',name:'Área comercial',pts:r(0,0,500,400)},scaleCmPerUnit:1,autoFitBoundaryToZones:false,zoneSemantics:'virtual',commercialAreaV209:true,architectureInitializedV180:true}};s.history={};s.selectedZoneId='Z1';s.editor.architectureTool='area';s.editor.sectionVisible=false;s.editor.viewBox={x:-80,y:-50,w:720,h:540};s.editor.viewBoxCustomized=true;s.editor.viewBoxInitialized=true;t.setScreen('layout');});


 const state=async(fn)=>page.evaluate(fn),point=async(x,y)=>{await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));return page.evaluate(({x,y})=>{const svg=document.querySelector('#layoutSvg'),p=svg.createSVGPoint();p.x=x;p.y=y;const s=p.matrixTransform(svg.getScreenCTM());return{x:s.x,y:s.y};},{x,y});};
 const order=await page.locator('[data-architecture-tool]').evaluateAll(nodes=>nodes.map(n=>n.dataset.architectureTool));assert.deepEqual(order,['area','walls','zones']);
 assert.equal(await page.locator('.v80-tool-rail button:visible').count(),2);await page.locator('.v80-tool-rail [data-emode="measure"]').click();assert.equal(await state(()=>window.__test.appState.editor.mode),'measure');await page.keyboard.press('Escape');
 // Area inherits polygon creation; no walls or zones are created by tracing it.
 await page.locator('#btnAreaPlus').click();for(const [x,y] of [[0,0],[500,0],[500,300],[350,300],[350,400],[0,400]]){const p=await point(x,y);await page.mouse.click(p.x,p.y);}
 await page.locator('#v212Finish').click();assert.equal(await state(()=>window.__test.appState.layout.meta.siteBoundary.pts.length),6);assert.equal(await state(()=>window.__test.appState.layout.zones.length),2);assert.equal(await state(()=>window.__test.appState.layout.walls.length),0);
 await page.locator('[data-architecture-tool="walls"]').click();assert.equal(await page.locator('[data-area-wall-edge]').count(),6);assert.equal(await page.locator('.v203-wall-edge-target').count(),0);
 {const q=await point(250,0);await page.mouse.click(q.x,q.y);}await page.locator('#v203WallApply').click();
 assert.equal(await state(()=>window.__test.appState.layout.walls.length),1);assert(await state(()=>window.__test.appState.layout.walls[0].areaBinding.perimeter));assert(!await state(()=>window.__test.appState.layout.walls[0].zoneBoundarySource));
 {const q=await point(500,150);await page.mouse.click(q.x,q.y);}await page.locator('#v203WallPerimeter').click();assert.equal(await state(()=>window.__test.appState.layout.walls.length),6);
 {const q=await point(250,0);await page.mouse.click(q.x,q.y);}await page.locator('[data-v213-wall-control="W1"]').click();await page.locator('[data-v213-placement="center"]').click();await page.locator('#v213PlacementApply').click();assert.equal(await state(()=>window.__test.appState.layout.walls[0].placement),'center');
 await page.locator('[data-architecture-tool="area"]').click();await page.locator('#v213GeometryToggle').click();await page.locator('#v212VertexIndex').selectOption('1');await page.locator('#v212X').fill('5.3');await page.locator('#v212ApplyPoint').click();
 assert(await state(()=>window.__test.appState.layout.walls.some(w=>w.x2===530&&w.y2===0)));assert(await state(()=>window.__test.appState.layout.walls.some(w=>w.x1===530&&w.y1===0)));assert.equal(await state(()=>window.__test.appState.layout.zones[0].pts[0].x),40);
 await page.locator('#v213UndoGlobal').click();assert.equal(await state(()=>window.__test.appState.layout.walls[0].x2),500);await page.locator('#v213RedoGlobal').click();assert.equal(await state(()=>window.__test.appState.layout.walls[0].x2),530);
 // An inserted area vertex splits a wall, then both pieces follow the new corner.
 let p=await point(265,0);const canvasBefore=await page.locator('#layoutSvg').boundingBox();await page.mouse.dblclick(p.x,p.y,{delay:80});const canvasAfter=await page.locator('#layoutSvg').boundingBox();assert(Math.abs(canvasBefore.height-canvasAfter.height)<1,'Selection must not resize canvas');assert.equal(await state(()=>window.__test.appState.layout.meta.siteBoundary.pts.length),7);assert.equal(await state(()=>window.__test.appState.layout.walls.length),7);
 await page.locator('#v212VertexIndex').selectOption('1');await page.locator('#v212Y').fill('-0.5');await page.locator('#v212ApplyPoint').click();assert.equal(await state(()=>window.__test.appState.layout.walls.filter(w=>w.y1===-50||w.y2===-50).length),2);
 console.log('PASS hierarchy: polygon area, area-only wall targets, stable bindings, connected move, inserted corner and undo');
 const walls=await state(()=>JSON.stringify(window.__test.appState.layout.walls)),nodes=await state(()=>JSON.stringify(window.__test.appState.layout.wallNodes));
 // Zones now use the former quick rectangular workflow, with sizes before placement.
 await page.locator('[data-architecture-tool="zones"]').click();await page.locator('#btnZonePlus').click();assert.equal(await page.locator('#v212Finish').count(),0);await page.locator('#v214ZoneWidth').fill('0.6');await page.locator('#v214ZoneHeight').fill('0.6');p=await point(150,350);await page.mouse.click(p.x,p.y);
 assert.equal(await state(()=>window.__test.appState.layout.zones.length),3);assert.equal(await state(()=>window.__test.appState.layout.zones[2].pts.length),4);assert.equal(await state(()=>JSON.stringify(window.__test.appState.layout.walls)),walls);assert.equal(await state(()=>JSON.stringify(window.__test.appState.layout.wallNodes)),nodes);
 await page.locator('#v213ZoneName').fill('Despacho');await page.locator('#v213ZoneName').press('Enter');assert.equal(await state(()=>window.__test.appState.layout.zones[2].name),'Despacho');
 await page.locator('#v213GeometryToggle').click();await page.locator('#v212VertexIndex').selectOption('0');await page.locator('#v212X').fill('1.1');await page.locator('#v212ApplyPoint').click();assert.equal(await state(()=>JSON.stringify(window.__test.appState.layout.walls)),walls,'Zone editing does not affect physical walls');
 await page.locator('#v214DrawIrregularZone').click();for(const [x,y] of [[20,310],[100,310],[100,340],[80,340],[80,380],[20,380]]){p=await point(x,y);await page.mouse.click(p.x,p.y);}await page.locator('#v212Finish').click();assert.equal(await state(()=>window.__test.appState.layout.zones[3].pts.length),6,'Advanced irregular zones retained');
 // Overflow menu must escape the toolbar and stay interactive.
 await page.locator('#v214MoreToggle').click();assert(await page.locator('.v214-more-menu').isVisible());const menuBox=await page.locator('.v214-more-menu').boundingBox();assert(menuBox.y>0&&menuBox.y+menuBox.height<=1000);await page.locator('#v213OpenLayers').click();assert(await page.locator('[data-v213-lock="walls"]').isVisible());
 await page.locator('[data-v213-lock="walls"]').click();await page.locator('[data-architecture-tool="walls"]').click();await page.locator('[data-architecture-tool="area"]').click();
 const saved=await state(()=>JSON.stringify({a:window.__test.appState.layout.meta.siteBoundary,w:window.__test.appState.layout.walls,n:window.__test.appState.layout.wallNodes}));
 // Area geometry remains protected by the wall layer lock.
 await page.locator('#v213GeometryToggle').click();await page.locator('#v212VertexIndex').selectOption('0');await page.locator('#v212X').fill('-0.1');await page.locator('#v212ApplyPoint').click();
 assert.equal(await state(()=>JSON.stringify({a:window.__test.appState.layout.meta.siteBoundary,w:window.__test.appState.layout.walls,n:window.__test.appState.layout.wallNodes})),saved);
 if(!await page.locator('[data-v213-lock="walls"]').isVisible()){await page.locator('#v214MoreToggle').click();await page.locator('#v213OpenLayers').click();}await page.locator('[data-v213-lock="walls"]').click();
 console.log('PASS simplified creation, independent zones, name edit, advanced polygon, overflow menu and locks');

 // V215: properties change without moving the canvas, and cuts never consume its height.
 await page.locator('[data-architecture-tool="area"]').click();await page.locator('#v213GeometryToggle').click();
 await page.locator('[data-v215-geometry="edge"]').click();assert(!await page.locator('#v212VertexIndex').isVisible());assert(await page.locator('#v212EdgeIndex').isVisible());
 await page.locator('[data-v215-geometry="vertex"]').click();assert(await page.locator('#v212VertexIndex').isVisible());assert(!await page.locator('#v212EdgeIndex').isVisible());
 const planBefore=await state(()=>JSON.stringify(window.__test.appState.layout));
 const canvasClosed=await page.locator('#layoutSvg').boundingBox();await page.locator('#btnToggleSections').click();
 assert(await page.locator('#layoutSectionWrap').isVisible());assert(await page.locator('.v215-section-empty').isVisible());
 const canvasOpened=await page.locator('#layoutSvg').boundingBox();assert(Math.abs(canvasClosed.height-canvasOpened.height)<1);assert(Math.abs(canvasClosed.y-canvasOpened.y)<1);
 await page.locator('#v215CloseSections').click();assert(!await page.locator('#layoutSectionWrap').isVisible());
 const fullWidth=await page.locator('#layoutSvg').boundingBox();await page.locator('.layout-cad-localbar-v80 [data-layout-tag-action="toggle-right-props"]').click();assert(!await page.locator('#layoutRightPanel').isVisible());assert((await page.locator('#layoutSvg').boundingBox()).width>fullWidth.width+200);
 await page.locator('.layout-cad-localbar-v80 [data-layout-tag-action="toggle-right-props"]').click();assert(await page.locator('#layoutRightPanel').isVisible());
 assert.equal(await state(()=>JSON.stringify(window.__test.appState.layout)),planBefore,'View controls preserve geometry');
 assert((await page.locator('#layoutSaveStatus').getAttribute('aria-label')).includes('dispositivo'));

 // Nonempty cuts keep both axes and direction controls in the compact drawer.
 await state(()=>{const s=window.__test.appState;s.layout.racks.push({id:'QA-CUT',zoneId:'Z1',modelId:s.models[0].id,x:90,y:90,rot:0,baseHeight:0});window.__test.renderLayoutEditor();});
 const cutCanvas=await page.locator('#layoutSvg').boundingBox();await page.locator('#btnToggleSections').click();assert(await page.locator('#layoutSectionSvg').isVisible());assert(await page.locator('#layoutSectionSvgY').isVisible());assert(Math.abs((await page.locator('#layoutSvg').boundingBox()).height-cutCanvas.height)<1);
 await page.locator('#btnFlipSectionX').click();assert(await page.locator('#layoutSectionSvgY').isVisible());await page.locator('#v215CloseSections').click();
 await page.evaluate(serialized=>{window.__test.appState.layout=JSON.parse(serialized);window.__test.renderLayoutEditor();},planBefore);
 console.log('PASS V215: contextual fields, stable canvas, empty cuts drawer, inspector expansion, accessible save status, geometry unchanged by view controls');
 for(const [width,height] of [[1560,1000],[1280,800],[1024,768]]){await page.setViewportSize({width,height});for(const workspace of ['architecture','urbanism','distribution']){await page.locator(`[data-layout-workspace="${workspace}"]`).click();const toolbar=await page.locator('.layout-cad-localbar-v80').boundingBox();for(const selector of ['#btnZoomFit','#v214MoreToggle','#v213UndoGlobal']){const control=await page.locator(selector).boundingBox();assert(control.x>=toolbar.x&&control.x+control.width<=toolbar.x+toolbar.width+1,selector+' toolbar visibility');}const b=await page.locator('#layoutSvg').boundingBox();assert(b.width>400&&b.height>height*.6&&b.y>=0&&b.y+b.height<=height,workspace+' viewport');}
  await page.locator('[data-layout-workspace="architecture"]').click();for(const theme of ['theme-light','theme-dark']){await page.evaluate(theme=>{document.body.classList.remove('theme-dark','theme-light');document.body.classList.add(theme);},theme);await page.screenshot({animations:'disabled',path:path.join(process.env.WMS_QA_DIR||os.tmpdir(),`wms-v215-${width}-${theme}.png`)});}}
 await state(()=>window.__test.persistActiveLayout());const geometry=await state(()=>JSON.stringify(window.__test.appState.layout));await state(()=>window.__test.loadLayoutForBranch(0));assert.equal(await state(()=>JSON.stringify(window.__test.appState.layout)),geometry);
 await state(()=>window.__test.setScreen('virtual'));await page.waitForFunction(()=>window.__test.getVspace()?.world?.children.some(m=>m.userData?.zoneId==='Z4'),{},{timeout:20000});
 assert.equal(errors.length,0,errors.join('\n'));console.log('V215 UI PASS: hierarchy, polygon area, quick rectangular zones, retained advanced zones, area-bound walls, insertion, connected moves, independent zones, wall icon, undo/redo, layers, compact overflow, all workspaces at 1560/1280/1024, local reload and 3D.');await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
