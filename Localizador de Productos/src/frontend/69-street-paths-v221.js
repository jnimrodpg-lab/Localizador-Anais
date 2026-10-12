  // V221: a street owns an editable centreline; surfaces are derived from it.
  const v221LegacyStreetScene=v220StreetScene;
  const v221StreetCache=new WeakMap();
  function v221IsPath(s){return s?.creation==='path'&&Array.isArray(s.axisPts)&&s.axisPts.length>=2;}
  function v221Vector(a,b){const length=Math.hypot(b.x-a.x,b.y-a.y);return {x:(b.x-a.x)/length,y:(b.y-a.y)/length,length};}
  function v221Area(rings){return rings.reduce((sum,p)=>sum+v216SignedArea(p),0);}
  function v221Contains(p,rings){return rings.reduce((sum,r)=>sum+(v216Inside(p,r)?Math.sign(v216SignedArea(r)):0),0)>0;}
  function v221NodeId(){let i=0;for(const s of appState.layout.streets||[])for(const p of s.axisPts||[])i=Math.max(i,Number(String(p.id||'').replace(/^SP-/,''))||0);appState.editor.streetNodeSequence=Math.max(i,appState.editor.streetNodeSequence||0)+1;return 'SP-'+appState.editor.streetNodeSequence;}
  function v221Frames(streets=appState.layout.streets||[]){
    const frames=[];
    for(const s of streets){
      if(v221IsPath(s)){
        const n=s.axisPts.length,count=s.closed?n:n-1;
        for(let i=0;i<count;i++){const start=s.axisPts[i],end=s.axisPts[(i+1)%n],axis=v221Vector(start,end);if(!Number.isFinite(axis.x)||axis.length<1e-5)continue;frames.push({street:s,start,end,axis,normal:{x:-axis.y,y:axis.x},length:axis.length,index:i,openStart:!s.closed&&i===0,openEnd:!s.closed&&i===count-1});}
      }else{const f=v220Frame(s);if(f)frames.push({...f,normal:{x:-f.axis.y,y:f.axis.x},index:0,openStart:true,openEnd:true});}
    }return frames;
  }
  function v221Offset(p,n,w){return {x:p.x+n.x*w,y:p.y+n.y*w};}
  function v221Quad(a,b,lo,hi){const v=v221Vector(a,b),n={x:-v.y,y:v.x};return [v221Offset(a,n,lo),v221Offset(b,n,lo),v221Offset(b,n,hi),v221Offset(a,n,hi)];}
  function v221Join(p,n1,n2,w,style){
    if(style==='round')return Array.from({length:20},(_,i)=>({x:p.x+Math.cos(i*Math.PI/10)*w,y:p.y+Math.sin(i*Math.PI/10)*w}));
    const points=[p];
    for(const sign of [-1,1]){points.push(v221Offset(p,n1,w*sign),v221Offset(p,n2,w*sign));const sum={x:n1.x+n2.x,y:n1.y+n2.y},den=1+n1.x*n2.x+n1.y*n2.y;if(style==='right'&&den>.15){const q=v221Offset(p,sum,w*sign/den);if(Math.hypot(q.x-p.x,q.y-p.y)<=w*2.5)points.push(q);}}
    return convexHull2D(points);
  }
  function v221Corridor(s,width){
    const frames=v221Frames([s]),out=frames.map(f=>v221Quad(f.start,f.end,-width,width));
    for(let i=0;i<frames.length;i++){const next=frames[(i+1)%frames.length];if(!s.closed&&i===frames.length-1)continue;if(Math.hypot(frames[i].end.x-next.start.x,frames[i].end.y-next.start.y)>1e-5)continue;out.push(v221Join(frames[i].end,frames[i].normal,next.normal,width,v220Corner(s.cornerStyle)));}return out.filter(p=>p.length>=3);
  }
  function v221WalkBands(s,inner,outer,sign){
    const frames=v221Frames([s]),out=frames.map(f=>v221Quad(f.start,f.end,inner*sign,outer*sign));
    for(let i=0;i<frames.length;i++){const next=frames[(i+1)%frames.length];if(!s.closed&&i===frames.length-1)continue;const p=frames[i].end,n1=frames[i].normal,n2=next.normal;if(Math.hypot(p.x-next.start.x,p.y-next.start.y)>1e-5)continue;const join=v221Join(p,n1,n2,outer,v220Corner(s.cornerStyle));const side=join.filter(q=>(q.x-p.x)*(n1.x+n2.x)*sign+(q.y-p.y)*(n1.y+n2.y)*sign>=-1e-5);if(side.length>=2)out.push(convexHull2D([p,...side]));}return out.filter(p=>p.length>=3);
  }
  function v221PathGeometry(s,b=v219UrbanBounds()){
    const d=v220Dims(s),g=s.roadType==='plain'?0:d.gutterWidth,c=Math.max(2,Math.min(8,d.sidewalkWidth*.07)),r=d.roadWidth/2,roadSources=v221Corridor(s,r),insideSources=v221Corridor(s,r+g+c);
    const leftSources=v221WalkBands(s,r+g+c,r+g+d.sidewalkWidth,1),rightSources=v221WalkBands(s,r+g+c,r+g+d.sidewalkWidth,-1),gross=v219TotalContours();
    const sides=[['sidewalkPts',leftSources],['outerSidewalkPts',rightSources]],extra=[];
    const result={...s,...d,roadSources,roadPts:v216Union(roadSources,gross).find(p=>v216SignedArea(p)>0)||[],walkLeftSources:leftSources,walkRightSources:rightSources,streetGeometryV221:true};
    for(const [part,sources] of sides){
      const rings=v216Union(sources,[...insideSources,...gross]),positive=rings.filter(p=>v216SignedArea(p)>0).sort((a,b)=>v216SignedArea(b)-v216SignedArea(a));result[part]=positive[0]||[];extra.push(...positive.slice(1));
      if(s.manualSidewalks?.[part])result[part]=s.manualSidewalks[part].map(p=>({x:p.x+b.minX,y:p.y+b.minY}));
    }
    if(s.fitSidewalkToArea){
      const missing=v216Union([v220Rect(b.minX,b.minY,b.maxX,b.maxY)],gross).filter(p=>v216SignedArea(p)>0),near=missing.filter(poly=>poly.some(p=>leftSources.some(q=>v216Inside(p,q)||pointNearPolygonEdge(p,q,1))));
      result.walkLeftSources=[...leftSources,...near];const fitted=v216Union(result.walkLeftSources,[...insideSources,...gross]).filter(p=>v216SignedArea(p)>0).sort((a,b)=>v216SignedArea(b)-v216SignedArea(a));if(fitted.length){result.sidewalkPts=fitted[0];extra.push(...fitted.slice(1));}
    }
    result.sidewalkExtraContours=extra;return result;
  }
  function v221RebuildStreetNetwork(){v220RebuildStreetNetwork();const b=v219UrbanBounds();appState.layout.streets=appState.layout.streets.map(s=>v221IsPath(s)?ensureStreetVisualDefaults(v221PathGeometry(s,b)):s);return appState.layout.streets;}
  function v221Intersection(a,b){
    const dx=a.end.x-a.start.x,dy=a.end.y-a.start.y,ex=b.end.x-b.start.x,ey=b.end.y-b.start.y,den=dx*ey-dy*ex;if(Math.abs(den)<1e-7)return null;
    const qx=b.start.x-a.start.x,qy=b.start.y-a.start.y,t=(qx*ey-qy*ex)/den,u=(qx*dy-qy*dx)/den;if(t< -1e-7||t>1+1e-7||u< -1e-7||u>1+1e-7)return null;return {x:a.start.x+dx*t,y:a.start.y+dy*t,t,u};
  }
  function v221RoadSources(s){return v221IsPath(s)?s.roadSources||v221Corridor(s,(s.roadWidth||600)/2):s.roadPts?.length>=3?[s.roadPts]:[];}
  function v221WalkSources(s,part){return s.manualSidewalks?.[part]?[s[part]]:v221IsPath(s)?(part==='sidewalkPts'?s.walkLeftSources:s.walkRightSources)||[]:[s[part],...(part==='sidewalkPts'?s.sidewalkExtraContours||[]:[])].filter(p=>p?.length>=3);}
  function v221Junctions(frames){
    const candidates=[];
    for(let i=0;i<frames.length;i++)for(let j=i+1;j<frames.length;j++){const p=v221Intersection(frames[i],frames[j]);if(p&&!candidates.some(q=>Math.hypot(p.x-q.x,p.y-q.y)<1))candidates.push(p);}
    return candidates.map(p=>{
      const arms=[],ids=new Set();for(const f of frames){const q=projectPointToSegment(p,f.start,f.end);if(Math.hypot(p.x-q.x,p.y-q.y)>1e-4)continue;ids.add(f.street.id);for(const [end,sign] of [[f.start,-1],[f.end,1]]){const length=Math.hypot(end.x-p.x,end.y-p.y);if(length<1)continue;const a={x:f.axis.x*sign,y:f.axis.y*sign,length,street:f.street};const existing=arms.find(b=>a.x*b.x+a.y*b.y>.999);if(existing){existing.length=Math.max(existing.length,length);existing.street=(existing.street.roadWidth||0)>(f.street.roadWidth||0)?existing.street:f.street;}else arms.push(a);}}
      return {...p,arms,ids:[...ids]};
    }).filter(p=>p.arms.length>=3);
  }
  function v221StreetScene(layout=appState.layout){
    const streets=(layout.streets||[]).filter(s=>s?.roadPts?.length>=3);if(!streets.some(v221IsPath))return v221LegacyStreetScene(layout);
    const gross=v219TotalContours(layout),key=JSON.stringify([gross,streets]),old=v221StreetCache.get(layout);if(old?.key===key)return old.scene;
    const frames=v221Frames(streets),roads=streets.flatMap(v221RoadSources),bands=[],outer=[],bars=[],endMasks=[];
    const owner=(p,dx,dy)=>frames.reduce((best,f)=>{const q=projectPointToSegment(p,f.start,f.end),distance=Math.hypot(p.x-q.x,p.y-q.y),score=Math.abs(distance-(f.street.roadWidth||600)/2)+(Math.abs(f.axis.x*dx+f.axis.y*dy)<.45?100000:0);return !best||score<best.score?{f,score}:best;},null)?.f;
    const connected=(p,f)=>frames.some(q=>q!==f&&Math.hypot(p.x-projectPointToSegment(p,q.start,q.end).x,p.y-projectPointToSegment(p,q.start,q.end).y)<1e-4);
    for(const f of frames)for(const [p,isOpen] of [[f.start,f.openStart],[f.end,f.openEnd]])if(isOpen&&!connected(p,f)){const pad=Math.max((f.street.gutterWidth||0)+8,12),n=f.normal,r=(f.street.roadWidth||600)/2+pad;endMasks.push([v221Offset(v221Offset(p,f.axis,-pad),n,-r),v221Offset(v221Offset(p,f.axis,pad),n,-r),v221Offset(v221Offset(p,f.axis,pad),n,r),v221Offset(v221Offset(p,f.axis,-pad),n,r)]);}
    const rawRings=v216Union(roads,gross),wedges=[];
    for(const ring of rawRings)for(let i=0;i<ring.length;i++){
      const p=ring[i],a=ring[(i+ring.length-1)%ring.length],b=ring[(i+1)%ring.length],u=v221Vector(a,p),v=v221Vector(p,b),f=owner(p,u.x,u.y),style=v220Corner(f?.street.cornerStyle);if(u.x*v.y-u.y*v.x>=-1e-7||style==='right')continue;
      const radius=Math.min(u.length*.25,v.length*.25,Math.max(8,(f.street.gutterWidth||f.street.sidewalkWidth*.15)*(style==='round'?.8:1.25))),q=v221Offset(p,u,-radius),z=v221Offset(p,v,radius),arc=style==='diagonal'?[q,z]:Array.from({length:6},(_,n)=>{const t=n/5;return {x:(1-t)**2*q.x+2*(1-t)*t*p.x+t*t*z.x,y:(1-t)**2*q.y+2*(1-t)*t*p.y+t*t*z.y};});wedges.push([p,...arc]);
    }
    roads.push(...wedges);const roadRings=v216Union(roads,gross);
    for(const ring of roadRings){
      const edges=ring.map((a,i)=>{const b=ring[(i+1)%ring.length],d=v221Vector(a,b),f=owner({x:(a.x+b.x)/2,y:(a.y+b.y)/2},d.x,d.y);return {a,b,d,n:{x:d.y,y:-d.x},g:f?.street.roadType==='plain'?0:Number(f?.street.gutterWidth)||0,c:Math.max(2,Math.min(8,(f?.street.sidewalkWidth||240)*.07))};});
      for(let i=0;i<edges.length;i++){const e=edges[i];if(e.d.length<1e-6)continue;const band=w=>[e.a,e.b,v221Offset(e.b,e.n,w),v221Offset(e.a,e.n,w)];if(e.g>0)bands.push(band(e.g));outer.push(band(e.g+e.c));const prev=edges[(i+edges.length-1)%edges.length],join=w=>convexHull2D([e.a,v221Offset(e.a,e.n,w),v221Offset(e.a,prev.n,w)]);if(Math.min(e.g,prev.g)>0)bands.push(join(Math.min(e.g,prev.g)));outer.push(join(Math.max(e.g+e.c,prev.g+prev.c)));
        if(e.g>0){const step=Math.max(5,Math.min(18,e.g*.6)),thick=Math.max(1,Math.min(4,e.g*.12));for(let t=step*.5;t<e.d.length-step*.2;t+=step){const p=v221Offset(e.a,e.d,t),a=v221Offset(p,e.n,e.g*.15),b=v221Offset(p,e.n,e.g*.85);bars.push([v221Offset(a,e.d,-thick/2),v221Offset(b,e.d,-thick/2),v221Offset(b,e.d,thick/2),v221Offset(a,e.d,thick/2)]);}}
      }
    }
    const gutters=v216Union(bands,[...roads,...gross,...endMasks]),curbs=v216Union(outer,[...roads,...bands,...gross,...endMasks]),grates=bars.filter(poly=>{const p=poly.reduce((s,q)=>({x:s.x+q.x/4,y:s.y+q.y/4}),{x:0,y:0});return ![...roads,...gross,...endMasks].some(q=>v216Inside(p,q));});
    const occupied=[...roads,...outer,...gross],walks=[],byFinish=new Map();for(const s of streets){const finish=s.sidewalkType||'paver';if(!byFinish.has(finish))byFinish.set(finish,[]);byFinish.get(finish).push(...v221WalkSources(s,'sidewalkPts'),...v221WalkSources(s,'outerSidewalkPts'));}
    let covered=[];for(const [finish,sources] of byFinish){const rings=v216Union(sources,[...occupied,...covered]);walks.push({finish,rings,sources});covered.push(...sources);}
    const intersections=v221Junctions(frames),zebra=[],clear=[];
    for(const j of intersections){const radius=Math.max(...j.arms.map(a=>(a.street.roadWidth||600)/2))*1.45;clear.push(Array.from({length:20},(_,i)=>({x:j.x+Math.cos(i*Math.PI/10)*radius,y:j.y+Math.sin(i*Math.PI/10)*radius})));
      for(const a of j.arms){const width=a.street.roadWidth||600,n={x:-a.y,y:a.x};let core=0;for(const b of j.arms){const sin=Math.abs(a.x*b.y-a.y*b.x);if(sin>.2)core=Math.max(core,(b.street.roadWidth||600)/2/sin);}const lo=core+Math.max(5,width*.04),depth=Math.min(200,width*.38,a.length-lo-10);if(depth<8)continue;const start=v221Offset(j,a,lo),end=v221Offset(start,a,depth),bar=Math.max(4,Math.min(22,width*.045)),space=bar*.7;
        clear.push([v221Offset(start,n,-width/2),v221Offset(end,n,-width/2),v221Offset(end,n,width/2),v221Offset(start,n,width/2)]);for(let t=0;t+bar<=depth;t+=bar+space){const p=v221Offset(start,a,t),q=v221Offset(start,a,t+bar);zebra.push([v221Offset(p,n,-width*.44),v221Offset(q,n,-width*.44),v221Offset(q,n,width*.44),v221Offset(p,n,width*.44)]);}
      }
    }
    const lines=[];for(const f of frames){const width=f.street.roadWidth||600,dash=Math.max(16,Math.min(160,width*.45)),gap=dash*.6,thick=Math.max(2,Math.min(6,width*.015));for(let t=10;t<f.length-10;t+=dash+gap){const a=v221Offset(f.start,f.axis,t),b=v221Offset(f.start,f.axis,Math.min(f.length-10,t+dash));lines.push([v221Offset(a,f.normal,-thick/2),v221Offset(b,f.normal,-thick/2),v221Offset(b,f.normal,thick/2),v221Offset(a,f.normal,thick/2)]);}}
    const scene={roads:roadRings,roadSources:roads,gutters,curbs,grates,walks,markings:v216Union(lines,[...clear,...gross]),crossings:v216Union(zebra,gross),intersections,frames};v221StreetCache.set(layout,{key,scene});return scene;
  }
  v220StreetScene=v221StreetScene;
  function v221PickStreet(point){
    const choices=[];for(const s of appState.layout.streets||[]){const sources=[...v221RoadSources(s),...v221WalkSources(s,'sidewalkPts'),...v221WalkSources(s,'outerSidewalkPts')];if(!sources.some(p=>v216Inside(point,p)||pointNearPolygonEdge(point,p,2)))continue;const distance=Math.min(...v221Frames([s]).map(f=>{const q=projectPointToSegment(point,f.start,f.end);return Math.hypot(point.x-q.x,point.y-q.y);}));choices.push({s,distance});}
    choices.sort((a,b)=>a.distance-b.distance);return choices[0]?.s.id||'';
  }
  v220StreetAt=v221PickStreet;
  function v221ApplyStreetProfile(street,values){
    const next={...street,...values};if(v221IsPath(next)&&!v221RoadClear(next)){showToast('Ese ancho haría que la calzada invada el área total. Ajusta el ancho o el trazado.','warning');return false;}
    recordHistorySnapshot('structure');Object.assign(street,values);return true;
  }
  function v221SelectStreet(id){appState.selectedStreetId=id;appState.selectedStreetFurnitureId='';appState.selectedWallId='';appState.selectedOpeningId='';appState.selectedZoneId='';appState.selectedRackLayoutId='';appState.editor.selectedWallIds=[];appState.editor.selectedMeasurementId='';appState.editor.geometrySelection=null;appState.editor.mode='select';appState.editor.streetDraft=null;renderLayoutEditor();}
  function v221DeleteStreet(id=appState.selectedStreetId,{render=true}={}){
    const s=(appState.layout.streets||[]).find(s=>s.id===id);if(!s)return false;if(s.locked){showToast('Desbloquea la calle antes de eliminarla.','warning');return false;}
    recordHistorySnapshot('structure');appState.layout.streets=appState.layout.streets.filter(s=>s.id!==id);appState.selectedStreetId='';appState.selectedStreetFurnitureId='';appState.editor.streetVerticesVisible=false;appState.editor.streetAxisVisible=false;if(appState.editor.streetDraft?.activeId===id){appState.editor.streetDraft=null;appState.editor.mode='select';}rebuildStreetNetwork();persistActiveLayout('calle eliminada');if(render&&isLayoutWorkspaceScreen())renderLayoutEditor();return true;
  }
  function v221DeleteUrbanSelection(){
    const s=(appState.layout.streets||[]).find(s=>s.id===appState.selectedStreetId);if(!s||s.locked)return false;
    if(appState.selectedStreetFurnitureId){recordHistorySnapshot('structure');s.streetFurniture=(s.streetFurniture||[]).filter(f=>f.id!==appState.selectedStreetFurnitureId);appState.selectedStreetFurnitureId='';persistActiveLayout('mobiliario urbano eliminado');renderLayoutEditor();return true;}return v221DeleteStreet(s.id);
  }
  function v221ConvertStreet(s,{record=true}={}){
    if(v221IsPath(s))return s;const f=v220Frame(s);if(!f)return null;if(record)recordHistorySnapshot('structure');
    s.creation='path';s.axisPts=[{...f.start,id:v221NodeId()},{...f.end,id:v221NodeId()}];s.closed=false;s.boundarySide=s.side;s.vertexOffsets={};
    // Retain fitted/manual sidewalk shapes while the centreline remains in place.
    for(const part of ['sidewalkPts','outerSidewalkPts'])if(s[part]?.length>=3&&v220ValidPolygon(s[part]))v220StoreSidewalk(s,part,s[part]);
    if(record){v221ConnectGraph();rebuildStreetNetwork();persistActiveLayout('trazado de calle editable');}return s;
  }
  function v221ConnectGraph(){
    const paths=(appState.layout.streets||[]).filter(v221IsPath),frames=v221Frames(paths),inserts=new Map(),near=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y)<1e-4;
    for(let i=0;i<frames.length;i++)for(let j=i+1;j<frames.length;j++){
      const a=frames[i],b=frames[j],p=v221Intersection(a,b);if(!p)continue;
      const existing=paths.flatMap(s=>s.axisPts).find(q=>near(q,p)),id=existing?.id||v221NodeId();
      for(const [f,t] of [[a,p.t],[b,p.u]]){const vertex=f.street.axisPts.find(q=>near(q,p));if(vertex){vertex.id=id;continue;}if(t<1e-7||t>1-1e-7)continue;if(!inserts.has(f.street.id))inserts.set(f.street.id,new Map());const map=inserts.get(f.street.id);if(!map.has(f.index))map.set(f.index,[]);if(!map.get(f.index).some(q=>near(q,p)))map.get(f.index).push({x:p.x,y:p.y,id,t});}
    }
    for(const s of paths){const map=inserts.get(s.id);if(!map)continue;s.axisPts=s.axisPts.flatMap((p,i)=>[p,...(map.get(i)||[]).sort((a,b)=>a.t-b.t).map(({t,...p})=>p)]);}
    // Collinear endpoints also share their identity.
    const nodes=[];for(const s of paths)for(const p of s.axisPts){const same=nodes.find(q=>near(p,q));if(same)p.id=same.id;else{p.id=p.id||v221NodeId();nodes.push(p);}}
  }
  function v221RoadClear(s){const sources=v221Corridor(s,(s.roadWidth||600)/2),full=v221Area(v216Union(sources)),outside=v221Area(v216Union(sources,v219TotalContours()));return full-outside<Math.max(1,full*1e-7);}
  function v221SnapStreet(raw,{origin=null,shiftKey=false,excludeStreetId='',tolerance=null}={}){
    let p={x:isSnapEnabled()?snapGrid(raw.x):raw.x,y:isSnapEnabled()?snapGrid(raw.y):raw.y};if(origin&&shiftKey){const angle=Math.round(Math.atan2(p.y-origin.y,p.x-origin.x)/(Math.PI/4))*Math.PI/4,length=Math.hypot(p.x-origin.x,p.y-origin.y);p={x:origin.x+Math.cos(angle)*length,y:origin.y+Math.sin(angle)*length};}
    const svg=document.getElementById('layoutSvg'),tol=tolerance??12/Math.max(.001,svg?.getScreenCTM()?.a||1);let best=null;
    for(const f of v221Frames()){if(f.street.id===excludeStreetId)continue;for(const q of [f.start,f.end]){const distance=Math.hypot(p.x-q.x,p.y-q.y);if(distance<=tol&&(!best||distance<best.distance))best={...q,distance,type:'node',streetId:f.street.id};}const q=projectPointToSegment(p,f.start,f.end),distance=Math.hypot(p.x-q.x,p.y-q.y);if(distance<=tol&&(!best||distance<best.distance))best={x:q.x,y:q.y,distance,type:'axis',streetId:f.street.id,index:f.index};}return best||p;
  }
  function v221Profile(){const cm=Math.max(.0001,getScaleCmPerUnit()),p=appState.editor.streetDrawProfile||{};return {roadWidth:(p.road||600)/cm,sidewalkWidth:(p.walk||240)/cm,gutterWidth:(p.gutter??60)/cm,roadType:'drain-covered',sidewalkType:'paver',cornerStyle:getStreetCornerStyle()};}
  function v221EnsureDrawingSpace(){
    const b=v219UrbanBounds(),pad=v220Dims(v221Profile()).totalWidth*1.2,content=getLayoutContentBounds(),minX=Math.min(b.minX-pad,content.x),minY=Math.min(b.minY-pad,content.y),maxX=Math.max(b.maxX+pad,content.x+content.w),maxY=Math.max(b.maxY+pad,content.y+content.h),view=appState.editor.viewBox;
    if(view&&view.x<=minX&&view.y<=minY&&view.x+view.w>=maxX&&view.y+view.h>=maxY)return;
    appState.editor.viewBox={x:minX,y:minY,w:maxX-minX,h:maxY-minY};appState.editor.viewBoxInitialized=true;appState.editor.viewBoxCustomized=true;
  }
  function v221BeginStreet(){if(!v219RequireUrbanism())return false;if(typeof markLayoutManualInteraction==='function')markLayoutManualInteraction();cancelLayoutDrawing({render:false});v221EnsureDrawingSpace();appState.editor.mode='street-path';appState.editor.streetDraft={seed:null,activeId:'',cursor:null};appState.editor.streetAxisVisible=false;appState.editor.streetVerticesVisible=false;appState.selectedStreetId='';appState.selectedStreetFurnitureId='';renderLayoutEditor();return true;}
  function v221BeginBoundaryStreet(){if(!v219RequireUrbanism())return false;if(typeof markLayoutManualInteraction==='function')markLayoutManualInteraction();cancelLayoutDrawing({render:false});v221EnsureDrawingSpace();appState.editor.mode='street';renderLayoutEditor();return true;}
  function v221FinishStreet(){appState.editor.streetDraft=null;appState.editor.mode='select';appState.editor.streetAxisVisible=!!(appState.layout.streets||[]).find(s=>s.id===appState.selectedStreetId&&v221IsPath(s));renderLayoutEditor();}
  function v221CommitStreetPoint(raw,opts={}){
    const draft=appState.editor.streetDraft;if(!draft||appState.editor.mode!=='street-path')return false;
    const current=(appState.layout.streets||[]).find(s=>s.id===draft.activeId),origin=current?.axisPts.at(-1)||draft.seed,point=v221SnapStreet(raw,{origin,shiftKey:opts.shiftKey,excludeStreetId:current?.id||''});
    if(!origin){if(v221Contains(point,v219TotalContours())){showToast('Traza la calle fuera del área total.','warning');return false;}draft.seed={x:point.x,y:point.y,id:point.id||v221NodeId()};draft.seedStreetId=point.streetId||'';draft.cursor=null;renderLayoutEditor();return true;}
    const closing=current&&current.axisPts.length>=3&&Math.hypot(point.x-current.axisPts[0].x,point.y-current.axisPts[0].y)<(opts.tolerance||12/Math.max(.001,document.getElementById('layoutSvg')?.getScreenCTM()?.a||1));
    const target=closing?current.axisPts[0]:point;if(Math.hypot(target.x-origin.x,target.y-origin.y)<20/Math.max(.0001,getScaleCmPerUnit()))return false;
    const candidate=current?{...current,axisPts:closing?current.axisPts:current.axisPts.concat({x:target.x,y:target.y,id:target.id||''}),closed:!!closing}:{creation:'path',axisPts:[draft.seed,{x:target.x,y:target.y}],closed:false,...v221Profile()};
    if(!v221RoadClear(candidate)){showToast('La calzada invade el área total. Aleja el trazado del edificio.','warning');return false;}
    recordHistorySnapshot('structure');for(const id of new Set([point.streetId,draft.seedStreetId].filter(Boolean))){const neighbor=appState.layout.streets.find(s=>s.id===id);if(neighbor&&!v221IsPath(neighbor))v221ConvertStreet(neighbor,{record:false});}
    let street=current;if(!street){street={id:nextStreetId(),name:'Calle '+((appState.layout.streets||[]).length+1),creation:'path',side:'',axisPts:[draft.seed,{x:target.x,y:target.y,id:target.id||v221NodeId()}],closed:false,streetFurniture:[],...v221Profile()};appState.layout.streets.push(street);draft.activeId=street.id;}else if(closing)street.closed=true;else street.axisPts.push({x:target.x,y:target.y,id:target.id||v221NodeId()});
    v221ConnectGraph();rebuildStreetNetwork();appState.selectedStreetId=street.id;draft.cursor=null;persistActiveLayout(closing?'circuito de calle cerrado':'tramo de calle creado');if(closing)v221FinishStreet();else renderLayoutEditor();return true;
  }
  function v221WarpSidewalks(before,after,b=v219UrbanBounds()){
    const oldFrames=v221Frames([before]),newFrames=v221Frames([after]);for(const part of ['sidewalkPts','outerSidewalkPts'])if(before.manualSidewalks?.[part])after.manualSidewalks[part]=before.manualSidewalks[part].map(saved=>{const p={x:saved.x+b.minX,y:saved.y+b.minY},f=oldFrames.reduce((best,f)=>{const q=projectPointToSegment(p,f.start,f.end),d=Math.hypot(p.x-q.x,p.y-q.y);return !best||d<best.d?{f,d}:best;},null)?.f,next=newFrames.find(q=>q.index===f?.index);if(!f||!next)return saved;const t=((p.x-f.start.x)*f.axis.x+(p.y-f.start.y)*f.axis.y)/f.length,offset=(p.x-f.start.x)*f.normal.x+(p.y-f.start.y)*f.normal.y,q=v221Offset(v221Offset(next.start,next.axis,t*next.length),next.normal,offset);return {x:q.x-b.minX,y:q.y-b.minY};});
  }
  function v221StartAxisDrag(event,s,index=null){
    if(event.button!==0||s.locked)return;event.preventDefault();event.stopPropagation();const svg=document.getElementById('layoutSvg'),start=svgPoint(event,svg),original=clone(appState.layout.streets),ids=new Set(index===null?s.axisPts.map(p=>p.id):[s.axisPts[index].id]);appState.editor.streetAxisIndex=index??0;appState.editor.streetAxisDragging=true;let changed=false,lastValid=clone(original);
    const move=e=>{const raw=svgPoint(e,svg);let dx=raw.x-start.x,dy=raw.y-start.y;if(index!==null){const initial=original.find(q=>q.id===s.id).axisPts[index],origin=s.axisPts[index===0?1:index-1],p=v221SnapStreet({x:initial.x+dx,y:initial.y+dy},{origin,shiftKey:e.shiftKey,excludeStreetId:s.id});dx=p.x-initial.x;dy=p.y-initial.y;}else{if(isSnapEnabled()){dx=snapGrid(dx);dy=snapGrid(dy);}if(e.shiftKey){if(Math.abs(dx)>Math.abs(dy))dy=0;else dx=0;}}
      const next=clone(original);for(const street of next){if(!v221IsPath(street))continue;for(const p of street.axisPts)if(ids.has(p.id)){p.x+=dx;p.y+=dy;}const old=original.find(q=>q.id===street.id);if(JSON.stringify(old.axisPts)!==JSON.stringify(street.axisPts))v221WarpSidewalks(old,street);}
      const touched=next.filter(q=>v221IsPath(q)&&JSON.stringify(q.axisPts)!==JSON.stringify(original.find(p=>p.id===q.id).axisPts)),valid=touched.every(q=>v221Frames([q]).length===(q.closed?q.axisPts.length:q.axisPts.length-1)&&v221RoadClear(q));if(valid){lastValid=next;changed=touched.length>0;appState.editor.streetMoveBlocked=false;}else appState.editor.streetMoveBlocked=true;appState.layout.streets=clone(lastValid);rebuildStreetNetwork();renderLayoutSvg(svg);
    };
    const finish=e=>{document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',finish);document.removeEventListener('pointercancel',finish);appState.editor.streetAxisDragging=false;appState.editor.streetMoveBlocked=false;if(e.type==='pointercancel')appState.layout.streets=original;else if(changed){const before=snapshotForType('structure');before.streets=original;recordHistorySnapshot('structure',before);v221ConnectGraph();}rebuildStreetNetwork();if(changed&&e.type!=='pointercancel')persistActiveLayout('trazado de calle modificado');renderLayoutEditor();};document.addEventListener('pointermove',move);document.addEventListener('pointerup',finish);document.addEventListener('pointercancel',finish);
  }
  function v221EditAxis(){const s=(appState.layout.streets||[]).find(s=>s.id===appState.selectedStreetId);if(!s||s.locked)return;v221ConvertStreet(s);appState.editor.mode='select';appState.editor.streetVerticesVisible=false;appState.editor.streetAxisVisible=!appState.editor.streetAxisVisible;renderLayoutEditor();}
  function v221ChangeAxisPoint(add=true){
    const s=(appState.layout.streets||[]).find(s=>s.id===appState.selectedStreetId);if(!v221IsPath(s)||s.locked)return;let i=Math.min(s.axisPts.length-1,appState.editor.streetAxisIndex||0);const next=clone(s),n=next.axisPts.length;if(add){if(i===n-1&&!s.closed)i=n-2;const a=next.axisPts[i],b=next.axisPts[(i+1)%n];next.axisPts.splice(i+1,0,{x:(a.x+b.x)/2,y:(a.y+b.y)/2,id:v221NodeId()});}else{if(n<=(s.closed?3:2))return;next.axisPts.splice(i,1);if(!v221RoadClear(next)){showToast('El nuevo tramo invadiría el edificio.','warning');return;}}
    recordHistorySnapshot('structure');Object.assign(s,next);appState.editor.streetAxisIndex=add?i+1:Math.max(0,i-1);v221ConnectGraph();rebuildStreetNetwork();persistActiveLayout('puntos del trazado modificados');renderLayoutEditor();
  }
  function v221DrawOverlay(svg){
    svg.querySelector('[data-v221-road-overlay]')?.remove();if(activeLayoutWorkspace()!=='urbanism')return;const layer=svgEl('g',{'data-v221-road-overlay':'','pointer-events':'none'}),px=1/Math.max(.001,svg.getScreenCTM()?.a||1),s=(appState.layout.streets||[]).find(s=>s.id===appState.selectedStreetId);
    if(s&&v221IsPath(s)&&appState.editor.streetAxisVisible&&appState.editor.mode==='select'){
      for(const f of v221Frames([s])){const line=svgEl('line',{x1:f.start.x,y1:f.start.y,x2:f.end.x,y2:f.end.y,stroke:'#1d9fba','stroke-width':2.5,'vector-effect':'non-scaling-stroke','stroke-dasharray':'7 5','pointer-events':'stroke',style:'cursor:move','data-v221-axis-segment':f.index});line.addEventListener('pointerdown',e=>v221StartAxisDrag(e,s,null));line.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();const point=projectPointToSegment(svgPoint(e,svg),f.start,f.end);if(Math.hypot(point.x-f.start.x,point.y-f.start.y)<20/getScaleCmPerUnit()||Math.hypot(point.x-f.end.x,point.y-f.end.y)<20/getScaleCmPerUnit())return;recordHistorySnapshot('structure');s.axisPts.splice(f.index+1,0,{x:point.x,y:point.y,id:v221NodeId()});v221ConnectGraph();rebuildStreetNetwork();persistActiveLayout('punto de calle añadido');renderLayoutEditor();});const hit=svgEl('line',{x1:f.start.x,y1:f.start.y,x2:f.end.x,y2:f.end.y,stroke:'transparent','stroke-width':18,'vector-effect':'non-scaling-stroke','pointer-events':'stroke',style:'cursor:move'});hit.addEventListener('pointerdown',e=>v221StartAxisDrag(e,s,null));layer.append(hit,line);}
      s.axisPts.forEach((p,i)=>{const selected=i===(appState.editor.streetAxisIndex||0),g=svgEl('g',{'pointer-events':'all','data-v221-axis-point':i,style:'cursor:move'});g.appendChild(svgEl('circle',{cx:p.x,cy:p.y,r:12*px,fill:'transparent'}));g.appendChild(svgEl('circle',{cx:p.x,cy:p.y,r:(selected?7:5)*px,fill:appState.editor.streetMoveBlocked?'#ba5141':'#fff8ec',stroke:'#168ca4','stroke-width':2,'vector-effect':'non-scaling-stroke'}));const title=svgEl('title',{});title.textContent='Punto '+(i+1)+': arrastra para modificar el trazado';g.appendChild(title);g.addEventListener('pointerdown',e=>v221StartAxisDrag(e,s,i));layer.appendChild(g);});
    }
    const draft=appState.editor.streetDraft;if(appState.editor.mode==='street-path'&&draft){const current=(appState.layout.streets||[]).find(s=>s.id===draft.activeId),origin=current?.axisPts.at(-1)||draft.seed;if(origin){if(draft.cursor){const candidate={creation:'path',axisPts:[origin,draft.cursor],...(current||v221Profile()),closed:false},ok=v221RoadClear({...candidate,axisPts:[origin,draft.cursor]});if(Math.hypot(draft.cursor.x-origin.x,draft.cursor.y-origin.y)>1){layer.appendChild(svgEl('path',{d:pathFromPts(v221Quad(origin,draft.cursor,-(candidate.roadWidth||600)/2,(candidate.roadWidth||600)/2)),fill:ok?'rgba(33,157,179,.22)':'rgba(190,72,56,.25)',stroke:ok?'#168ca4':'#ba5141','stroke-width':1,'vector-effect':'non-scaling-stroke'}));layer.appendChild(svgEl('line',{x1:origin.x,y1:origin.y,x2:draft.cursor.x,y2:draft.cursor.y,stroke:ok?'#168ca4':'#ba5141','stroke-width':2,'vector-effect':'non-scaling-stroke','stroke-dasharray':'7 5'}));}}layer.appendChild(svgEl('circle',{cx:origin.x,cy:origin.y,r:6*px,fill:'#fff8ec',stroke:'#168ca4','stroke-width':2,'vector-effect':'non-scaling-stroke'}));}}
    svg.appendChild(layer);
  }
  function v221BindCanvas(svg){
    if(svg.__v221DrawCapture)svg.removeEventListener('pointerdown',svg.__v221DrawCapture,true);const capture=e=>{if(activeLayoutWorkspace()!=='urbanism'||appState.editor.mode!=='street-path'||e.button!==0)return;e.preventDefault();e.stopImmediatePropagation();v221CommitStreetPoint(svgPoint(e,svg),{shiftKey:e.shiftKey});};svg.__v221DrawCapture=capture;svg.addEventListener('pointerdown',capture,true);
    if(activeLayoutWorkspace()==='urbanism')svg.oncontextmenu=e=>{if(activeLayoutWorkspace()==='urbanism'&&appState.editor.mode==='street-path'){e.preventDefault();v221FinishStreet();}};v221DrawOverlay(svg);
  }
  function v221PreviewStreet(e,svg){if(activeLayoutWorkspace()!=='urbanism'||appState.editor.mode!=='street-path'||!appState.editor.streetDraft)return false;const draft=appState.editor.streetDraft,current=(appState.layout.streets||[]).find(s=>s.id===draft.activeId),origin=current?.axisPts.at(-1)||draft.seed;draft.cursor=v221SnapStreet(svgPoint(e,svg),{origin,shiftKey:e.shiftKey,excludeStreetId:current?.id||''});v221DrawOverlay(svg);return true;}
  function v221EnhanceEditor(){
    if(activeLayoutWorkspace()!=='urbanism')return;const panel=document.getElementById('layoutRightPanel'),bar=document.querySelector('.layout-cad-localbar-v80');if(!panel||!bar)return;
    const drawing=appState.editor.mode==='street-path',streets=appState.layout.streets||[],selected=streets.find(s=>s.id===appState.selectedStreetId);
    let picker=panel.querySelector('.v221-street-picker');if(!picker){picker=document.createElement('section');picker.className='v221-street-picker';panel.querySelector('.layout-right-scroll')?.prepend(picker);}
    picker.innerHTML=`<label>Calle activa<select id="v221StreetSelect"><option value="">Seleccionar calle</option>${streets.map(s=>`<option value="${escapeHtml(s.id)}" ${s.id===selected?.id?'selected':''}>${escapeHtml(s.name||s.id)}</option>`).join('')}</select></label>${drawing?`<p>Clic para iniciar y continuar. Acerca el puntero a otra calle para conectar.</p><div class="layout-prop-grid two">${[['road','Calzada',600],['walk','Veredas',240],['gutter','Canaletas',60]].map(([key,label,fallback])=>`<label>${label} (cm)<input id="v221Draft${key}" type="number" min="${key==='gutter'?0:20}" max="${key==='road'?2400:key==='walk'?1200:300}" value="${appState.editor.streetDrawProfile?.[key]??fallback}" ${appState.editor.streetDraft?.activeId?'disabled':''}></label>`).join('')}</div><button type="button" class="seg-btn" id="v221FinishStreet">Terminar trazado</button><small>Shift: 45°/90° · Enter / Esc: terminar · clic en el inicio: cerrar.</small>`:!selected?'<p>Traza el eje de la vía por puntos. Las veredas y los cruces se generan automáticamente.</p>':''}<details><summary>Colocación rápida</summary><button type="button" class="seg-btn" id="v221BoundaryStreet" ${v219CanCreateUrbanism()?'':'disabled'}>Alrededor del local</button></details>`;
    picker.querySelector('#v221StreetSelect').onchange=e=>v221SelectStreet(e.target.value);picker.querySelector('#v221FinishStreet')?.addEventListener('click',v221FinishStreet);picker.querySelector('#v221BoundaryStreet').onclick=v221BeginBoundaryStreet;
    for(const key of ['road','walk','gutter']){const input=picker.querySelector('#v221Draft'+key);if(input)input.onchange=()=>{const min=key==='gutter'?0:20,max=key==='road'?2400:key==='walk'?1200:300;appState.editor.streetDrawProfile={...appState.editor.streetDrawProfile,[key]:Math.max(min,Math.min(max,Number(input.value)||min))};};}
    const plus=bar.querySelector('#btnStreetPlus');if(plus){plus.textContent='+ Trazar calle';plus.title='Dibujar el eje de una calle por puntos';plus.onclick=v221BeginStreet;plus.classList.toggle('active',drawing);}const create=document.getElementById('v200DrawStreet');if(create)create.onclick=v221BeginStreet;
    let del=bar.querySelector('#v221DeleteStreet');if(!del){del=document.createElement('button');del.id='v221DeleteStreet';del.type='button';del.className='seg-btn v221-delete';bar.querySelector('#v213UndoGlobal')?.before(del);}del.textContent='Eliminar calle';del.disabled=!selected||drawing;del.onclick=()=>v221DeleteStreet();
    const properties=panel.querySelector('.layout-street-properties');if(properties){let actions=properties.querySelector('.v221-axis-actions');if(!actions){actions=document.createElement('div');actions.className='v221-axis-actions';properties.querySelector('.layout-prop-title').after(actions);}actions.innerHTML=`<button type="button" class="seg-btn ${appState.editor.streetAxisVisible?'active':''}" id="v221EditAxis">${appState.editor.streetAxisVisible?'Ocultar trazado':'Editar trazado'}</button>${v221IsPath(selected)&&appState.editor.streetAxisVisible?'<button type="button" class="seg-btn" id="v221AddAxisPoint">Añadir punto</button><button type="button" class="seg-btn" id="v221RemoveAxisPoint">Quitar punto</button><small>Arrastra un punto para cambiar el recorrido; arrastra el eje azul para mover la calle. Supr elimina la calle.</small>':''}`;actions.querySelector('#v221EditAxis').onclick=v221EditAxis;actions.querySelector('#v221AddAxisPoint')?.addEventListener('click',()=>v221ChangeAxisPoint(true));actions.querySelector('#v221RemoveAxisPoint')?.addEventListener('click',()=>v221ChangeAxisPoint(false));const select=properties.querySelector('#rpStreetPart');if(v221IsPath(selected)&&select){select.querySelector('[value="roadPts"]')?.remove();select.querySelector('[value="sidewalkPts"]').textContent='Vereda lado A';select.querySelector('[value="outerSidewalkPts"]').textContent='Vereda lado B';if(appState.editor.streetVertexPart==='roadPts')appState.editor.streetVertexPart='sidewalkPts';select.value=appState.editor.streetVertexPart||'sidewalkPts';}properties.querySelector('label:last-child input[disabled]')?.setAttribute('title','Las calles trazadas por puntos se editan desde su eje.');}
    const hide=panel.querySelector('#v200StreetSelect')?.closest('section');if(hide)hide.hidden=true;
  }
