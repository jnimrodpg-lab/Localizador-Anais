import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import os from 'node:os';import {createRequire} from 'node:module';import {fileURLToPath} from 'node:url';const require=createRequire(import.meta.url);
const {chromium:pw}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
(async()=>{
 const root=fileURLToPath(new URL('../public/',import.meta.url));
 const qa=process.env.WMS_QA_DIR||os.tmpdir();fs.mkdirSync(qa,{recursive:true});
 const server=http.createServer((req,res)=>{let file=path.join(root,req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0]);if(!fs.existsSync(file)){res.writeHead(404);res.end();return;}
 let buf=fs.readFileSync(file);if(file.endsWith('app-main.runtimefix.js'))buf=Buffer.from(buf.toString().replace('  bootstrapApp();','  window.__test={appState,setScreen,renderLayoutEditor,v212SetMode,persistActiveLayout,loadLayoutForBranch,ensureLayoutMeta,getVspace:()=>vspaceActive,v214PlanArea,v214EnsureHierarchy,applyUiTheme,v217VisibleWallParts,v217ExteriorIntervals,v214AreaContext,v216JointPieces,v216Union,v212Insert,v212Remove,v212SetMode,v213RenameZone,v213ApplyLength,v213ApplyPlacement,v212Commit,undoHistory,redoHistory,saveRemoteAppState,getWallSlicePolygon,ensureWallTopology,v219SyncTotalArea,v219UrbanBounds,v219CanCreateUrbanism,addStreetFromPoint,buildStreetGeometry}; bootstrapApp();'));
 res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':'text/html');res.end(buf);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await pw.launch({executablePath:process.env.WMS_TEST_BROWSER||pw.executablePath(),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'],headless:true});
 const page=await browser.newPage({viewport:{width:1560,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 page.setDefaultTimeout(20000);
 await page.route('https://**',route=>route.abort());
 await page.goto('http://127.0.0.1:'+server.address().port);await page.waitForFunction(()=>window.__test);
 const state=async fn=>page.evaluate(fn);
 await page.evaluate(()=>{const t=window.__test,s=t.appState,r=(x,y,w,h)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];s.auth={loggedIn:true,user:'qa',role:'admin',localMode:true};document.getElementById('authModal')?.classList.remove('show');document.body.classList.remove('auth-open');document.getElementById('authModal').style.display='none';
 const pts=[{x:0,y:0},{x:900,y:0},{x:900,y:450},{x:650,y:450},{x:650,y:700},{x:0,y:700}];const wall=(id,a,b)=>({id,x1:a.x,y1:a.y,x2:b.x,y2:b.y,thickness:16,height:290,placement:'inside',material:'default'});
 s.layout={zones:[{id:'Z1',name:'Ventas',color:'#72b58b',kind:'virtual',pts:r(0,350,450,350)},{id:'Z2',name:'Almacén',color:'#75a9d4',kind:'virtual',pts:r(450,0,450,350)}],racks:[{id:'Z1-E1',zoneId:'Z1',modelId:s.models[0].id,x:100,y:500,w:120,h:40,rot:0},{id:'Z2-E1',zoneId:'Z2',modelId:s.models[0].id,x:630,y:80,w:120,h:40,rot:0}],walls:[...pts.map((p,i)=>wall('O'+i,p,pts[(i+1)%pts.length])),wall('I1',{x:450,y:0},{x:450,y:700}),wall('I2',{x:450,y:350},{x:900,y:350}),wall('I3',{x:220,y:350},{x:220,y:700})],wallNodes:[],rooms:[],openings:[{id:'EXT-WIN',wallId:'O0',type:'window',width:120,height:100,sill:90,t:1/3,offset:300},{id:'INT-DOOR',wallId:'I1',type:'door',width:80,height:210,sill:0,t:.4,offset:280}],streets:[],measurements:[],meta:{siteBoundary:{id:'AREA-GENERAL',name:'Local',pts},scaleCmPerUnit:1,autoFitBoundaryToZones:false,zoneSemantics:'virtual',commercialAreaV209:true,architectureInitializedV180:true}};s.history={};s.selectedRackLayoutId='Z1-E1';s.selectedWallId='O0';s.selectedZoneId='Z1';t.applyUiTheme('light');t.setScreen('virtual');});
 await page.waitForFunction(()=>window.__test.getVspace()?.camera&&window.__test.getVspace()?.world?.children.length>5,{},{timeout:20000});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const snapshot=await state(()=>JSON.stringify(window.__test.appState.layout));
 const visible=()=>state(()=>{const ids=new Set();window.__test.getVspace().world.traverse(m=>{if(m.userData?.wallUnion)(m.userData.wallParts||[]).filter(p=>!p.cutaway).forEach(p=>ids.add(p.id));});return [...ids].sort();});
 const settle=()=>page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const allIds=['I1','I2','I3','O0','O1','O2','O3','O4','O5'],initialIds=['I1','I2','I3','O0','O1','O3'];
 const assertCut=async()=>{
  await settle();const actual=await visible();
  const low=await state(()=>{const s=window.__test.getVspace(),ids=new Set();let valid=true;s.world.traverse(m=>{if(m.userData?.wallUnion){(m.userData.wallIds||[]).forEach(id=>ids.add(id));if(m.userData.wallParts.some(p=>p.cutaway)){m.geometry.computeBoundingBox();valid&&=m.geometry.boundingBox.max.y<=.20001&&m.geometry.boundingBox.min.y>=-.00001;}}});return {ids:[...ids].sort(),valid};});
  assert.deepEqual(low.ids,allIds,'Every physical wall retains a full body or a visible plinth');assert(low.valid,'Cut walls stop at 20 cm');
  for(const id of ['I1','I2','I3'])assert(actual.includes(id),'Interior partition '+id+' remains visible');
  const view=await state(()=>{const s=window.__test.getVspace(),v=new s.THREE.Vector3();s.camera.getWorldDirection(v).negate();return {x:v.x,y:v.y,z:v.z};});
  const flat=Math.hypot(view.x,view.z);
  if(flat<.12){assert.deepEqual(actual,allIds);return actual;}
  for(const [id,x,z] of [['O0',0,1],['O1',-1,0],['O2',0,-1],['O3',-1,0],['O4',0,-1],['O5',1,0]]){
   const dot=(x*view.x+z*view.z)/flat;
   if(Math.abs(dot)>.03)assert.equal(actual.includes(id),dot>0,id+' matches the interior face toward the camera');
  }
  const opening=await state(()=>{const s=window.__test.getVspace();return {outer:s.architectureMeshes.some(m=>m.userData?.openingId==='EXT-WIN'),inner:s.architectureMeshes.some(m=>m.userData?.openingId==='INT-DOOR'),finite:s.architectureMeshes.every(m=>[...m.geometry.attributes.position.array].every(Number.isFinite))};});
  assert.equal(opening.outer,actual.includes('O0'),'Window follows its perimeter wall');assert(opening.inner&&opening.finite,'Interior door and finite joined geometry');
  return actual;
 };
 assert.deepEqual(await assertCut(),initialIds);assert.equal(await page.locator('[data-vspace-action="toggle-wall"]').innerText(),'Diorama');assert.equal(await page.locator('.vspace-compass').innerText(),'ISO');
 const pose=await state(()=>{const s=window.__test.getVspace();return {x:s.camera.position.x,y:s.camera.position.y,z:s.camera.position.z,orthographic:s.camera.isOrthographicCamera};});assert(pose.orthographic&&pose.x<0&&pose.z>0);assert(Math.abs(pose.x+pose.z)<1e-6&&Math.abs((pose.y-.8)-pose.z)<1e-6,'True isometric orientation, mirrored reference side');
 assert(await state(()=>window.__test.getVspace().architectureMeshes.some(m=>m.userData?.openingId==='EXT-WIN')));assert(await state(()=>window.__test.getVspace().architectureMeshes.some(m=>m.userData?.openingId==='INT-DOOR')));
 assert(await state(()=>window.__test.getVspace().world.children.some(m=>m.userData?.dioramaBase)&&window.__test.getVspace().world.children.some(m=>m.userData?.dioramaShadow)));
 for(const [width,height] of [[1560,1000],[1280,900]]){
  const before=await state(()=>window.__test.getVspace().camera.uuid),old=page.viewportSize();await page.setViewportSize({width,height});
  if(old.width!==width||old.height!==height)await page.waitForFunction(id=>window.__test.getVspace()?.camera&&window.__test.getVspace().camera.uuid!==id,before);
  await settle();const rect=await page.locator('.vspace-stage canvas').boundingBox();assert(rect.width>350&&rect.height>height*.5&&rect.y+rect.height<=height+1,'Canvas remains visible after resizing');
  for(const theme of ['light','dark']){await page.evaluate(theme=>window.__test.applyUiTheme(theme),theme);await page.waitForFunction(theme=>window.__test.getVspace().scene.background.getHex()===(theme==='light'?0xd6dde1:0x202b33),theme);await assertCut();await page.screenshot({animations:'disabled',path:path.join(qa,`wms-v219-${width}-${theme}-diorama.png`)});}
 }
 // Explicit focus still works; isometric and keyboard presets return to the full scene.
 await page.locator('[data-vspace-action="focus"]').click();assert.equal(await page.locator('.vspace-compass').innerText(),'SEL');await page.locator('[data-vspace-cam="iso"]').click();assert.equal(await page.locator('.vspace-compass').innerText(),'ISO');
 for(const cam of ['front','top','iso']){await page.locator(`[data-vspace-cam="${cam}"]`).click();await assertCut();if(cam==='top')assert.deepEqual(await visible(),allIds);}
 // Small rotations, panning and zooming retain geometry when no face changes.
 const canvas=page.locator('.vspace-stage canvas'),bounds=await canvas.boundingBox(),x=bounds.x+20,y=bounds.y+bounds.height*.88;
 assert(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.tagName==='CANVAS',{x,y}),'Native orbit starts on the exposed canvas');
 const meshIds=()=>state(()=>window.__test.getVspace().architectureMeshes.map(m=>m.uuid));
 const startMeshes=await meshIds();
 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+12,y,{steps:3});await page.mouse.up();await assertCut();
 assert.deepEqual(await meshIds(),startMeshes,'No rebuild for a rotation within the same quadrant');
 await page.mouse.move(x,y);await page.mouse.down({button:'middle'});await page.mouse.move(x+24,y,{steps:3});await page.mouse.up({button:'middle'});await assertCut();
 await page.mouse.wheel(0,100);await assertCut();assert.deepEqual(await meshIds(),startMeshes,'Orthographic pan/zoom do not change the cut');
 await page.locator('[data-vspace-cam="iso"]').click();await assertCut();
 const seen=new Set(),beforeOrbit=await meshIds();
 for(let n=0;n<6;n++){
  await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+160,y,{steps:12});
  const ids=await assertCut();seen.add(ids.join(',')); // Checked while dragging.
  await page.mouse.up();await assertCut();
  await page.screenshot({animations:'disabled',path:path.join(qa,`wms-v219-orbit-${n}.png`)});
 }
 assert(seen.size>=4,'A full orbit switches the exterior walls from all four sides: '+[...seen].join(' / '));
 assert.notDeepEqual(await meshIds(),beforeOrbit,'Crossing a face threshold updates joined wall geometry');
 await page.locator('[data-vspace-cam="iso"]').click();await settle();await page.locator('[data-vspace-action="toggle-wall"]').click();await settle();assert.equal(await page.locator('[data-vspace-action="toggle-wall"]').innerText(),'Muros completos');assert.deepEqual(await visible(),allIds);assert(await state(()=>window.__test.getVspace().architectureMeshes.some(m=>m.userData?.openingId==='EXT-WIN')));
 await page.screenshot({animations:'disabled',path:path.join(qa,'wms-v219-complete-walls.png')});
 await page.locator('[data-vspace-action="toggle-wall"]').click();await settle();assert.deepEqual(await visible(),[]);assert.equal(await state(()=>window.__test.getVspace().architectureMeshes.length),0);await page.locator('[data-vspace-action="toggle-wall"]').click();assert.deepEqual(await assertCut(),initialIds);
 assert.equal(await state(()=>JSON.stringify(window.__test.appState.layout)),snapshot,'Display controls preserve all saved walls, furniture and openings');
 // A mixed wall's window is clipped at the cut, including glass and trim.
 await state(()=>{const s=window.__test.appState;s.layout.walls.push({id:'MIX',x1:900,y1:450,x2:0,y2:450,thickness:16,height:290,placement:'inside'});s.layout.openings.push({id:'MIX-WIN',wallId:'MIX',type:'window',width:120,height:100,sill:90,offset:240,t:240/900});window.__test.getVspace().render();});await settle();
 assert(await state(()=>{const meshes=window.__test.getVspace().architectureMeshes.filter(m=>m.userData?.openingId==='MIX-WIN');return meshes.length>0&&meshes.every(m=>m.position.x-m.geometry.parameters.width/2>=-1e-6&&m.position.x+m.geometry.parameters.width/2<=6.5+1e-6);}),'Window frame/glass do not extend into a hidden wall portion');
 // Commercial area -> walls -> gross footprint -> streets, using the native UI.
 await page.setViewportSize({width:1560,height:1000});
 await state(()=>{const t=window.__test,s=t.appState;s.layout={zones:[],racks:[],walls:[],wallNodes:[],rooms:[],openings:[],streets:[],measurements:[],meta:{siteBoundary:{id:'AREA-GENERAL',name:'Comercial manual',pts:[{x:0,y:0},{x:600,y:0},{x:600,y:400},{x:0,y:400}]},scaleCmPerUnit:1,autoFitBoundaryToZones:false,zoneSemantics:'virtual',commercialAreaV209:true,architectureInitializedV180:true}};s.history={};s.selectedRackLayoutId='';s.selectedZoneId='';s.selectedWallId='';s.selectedOpeningId='';s.editor.geometrySelection=null;s.editor.areaWallEdgeIndex=null;s.editor.selectedWallIds=[];s.editor.layoutSubsystem='architecture';s.editor.architectureTool='area';s.editor.mode='select';s.editor.viewBox={x:-180,y:-180,w:980,h:760};s.editor.viewBoxCustomized=true;s.editor.viewBoxInitialized=true;t.applyUiTheme('light');t.setScreen('layout');});
 await settle();const manual=await state(()=>JSON.stringify(window.__test.appState.layout.meta.siteBoundary.pts.map(({x,y})=>({x,y}))));
 await page.locator('[data-layout-workspace="urbanism"]').click();assert(await page.locator('#btnStreetPlus').isDisabled());assert(await page.locator('#v200DrawStreet').isDisabled());assert(await page.locator('#btnStreetPlusRail').isDisabled());assert(await page.locator('.v219-total-summary').isVisible());assert(!await state(()=>window.__test.v219CanCreateUrbanism()));
 await page.locator('[data-layout-workspace="architecture"]').click();await page.locator('[data-architecture-tool="walls"]').click();await page.locator('.layout-cad-localbar-v80 [data-emode="wall"]').click();
 await page.locator('#v203WallThickness').fill('20');await page.locator('#v203WallPlacement').selectOption('outside');
 const point=async(x,y)=>{await settle();return page.evaluate(({x,y})=>{const svg=document.querySelector('#layoutSvg'),p=svg.createSVGPoint();p.x=x;p.y=y;const q=p.matrixTransform(svg.getScreenCTM());return {x:q.x,y:q.y};},{x,y});};
 for(const [x,y] of [[0,0],[600,0],[600,400],[0,400],[0,0]]){const p=await point(x,y);await page.mouse.click(p.x,p.y);}
 assert.equal(await state(()=>window.__test.appState.layout.walls.length),4);assert(await state(()=>window.__test.v219CanCreateUrbanism()));assert.equal(await page.locator('[data-v219-total-boundary]').count(),1);assert.equal(await state(()=>JSON.stringify(window.__test.appState.layout.meta.siteBoundary.pts.map(({x,y})=>({x,y})))),manual,'Creating walls does not alter the manual commercial area');
 const outer=await state(()=>window.__test.v219UrbanBounds());assert.equal(outer.minY,-20);assert.equal(outer.maxX,620);
 await page.locator('[data-layout-workspace="urbanism"]').click();assert(await page.locator('#btnStreetPlus').isEnabled());await page.locator('#btnStreetPlus').click();let p=await point(300,-130);await page.mouse.click(p.x,p.y);
 assert.equal(await state(()=>window.__test.appState.layout.streets.length),1);assert.equal(await state(()=>Math.max(...window.__test.appState.layout.streets[0].sidewalkPts.map(p=>p.y))),-20,'Street and sidewalk attach outside the physical walls');
 const beforeUrban=await state(()=>JSON.stringify(window.__test.appState.layout));await page.locator('#v213UndoGlobal').click();assert.equal(await state(()=>window.__test.appState.layout.streets.length),0);await page.locator('#v213RedoGlobal').click();assert.equal(await state(()=>JSON.stringify(window.__test.appState.layout)),beforeUrban,'Urbanism and derived area survive undo/redo');
 await state(()=>{const t=window.__test;t.appState.layout.walls.forEach(w=>w.thickness=40);t.persistActiveLayout('espesor QA');t.renderLayoutEditor();});assert.equal(await state(()=>Math.max(...window.__test.appState.layout.streets[0].sidewalkPts.map(p=>p.y))),-40,'Already placed streets follow changes of the gross footprint');
 await settle();await page.screenshot({animations:'disabled',timeout:45000,path:path.join(qa,'wms-v219-total-area-urbanism.png')});
 await state(()=>window.__test.persistActiveLayout());const saved=await state(()=>JSON.stringify(window.__test.appState.layout));await state(()=>window.__test.loadLayoutForBranch(0));assert.equal(await state(()=>JSON.stringify(window.__test.appState.layout)),saved,'Gross area and street geometry survive local reload');
 assert.equal(errors.length,0,errors.join('\n'));console.log('V219 UI PASS: full native orbit with 20 cm plinths, full interior walls, clipped openings, both themes, view modes, stable saved wall heights, commercial-area preservation, gated urbanism, automatic gross footprint after native wall creation, street offsets, thickness edits, undo/redo and local reload.');await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1);});
