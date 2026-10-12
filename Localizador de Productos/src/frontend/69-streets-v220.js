  // V220: roads are geometry. Texture contains material grain only.
  const v220StreetCache=new WeakMap();
  function v220Rect(x0,y0,x1,y1){return [{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}];}
  function v220Corner(value){return ['right','diagonal','round'].includes(value)?value:'right';}
  function v220Dims(source={},fallback={}){
    const sidewalkWidth=Math.max(20,Number(source.sidewalkWidth??fallback.sidewalkWidth??240)||240),roadWidth=Math.max(26,Number(source.roadWidth??fallback.roadWidth??600)||600);
    const gutterWidth=Math.max(0,Number(source.gutterWidth??fallback.gutterWidth??Math.min(60,roadWidth*.1))||0);
    return {side:source.side||fallback.side||'',sidewalkWidth,roadWidth,gutterWidth,totalWidth:2*(sidewalkWidth+gutterWidth)+roadWidth};
  }
  function v220BuildStreetGeometry(side='top',opts={}){
    const b=opts.bounds||v219UrbanBounds(),d=v220Dims({...opts,side}),network=opts.network||appState.layout.streets||[],bySide=new Map(network.filter(s=>s?.side).map(s=>[s.side,v220Dims(s)]));bySide.set(side,d);
    const horizontal=side==='top'||side==='bottom',first=bySide.get(horizontal?'left':'top'),last=bySide.get(horizontal?'right':'bottom');
    const extension=p=>p?Math.max(p.roadWidth*.6,p.sidewalkWidth*.5):0;
    const start=(horizontal?b.minX:b.minY)-(first?first.totalWidth+extension(first):0),end=(horizontal?b.maxX:b.maxY)+(last?last.totalWidth+extension(last):0);
    const origin=side==='top'?b.minY:side==='bottom'?b.maxY:side==='left'?b.minX:b.maxX,sign=side==='top'||side==='left'?-1:1;
    const across=(a,z)=>{const p=origin+sign*a,q=origin+sign*z;return horizontal?v220Rect(start,Math.min(p,q),end,Math.max(p,q)):v220Rect(Math.min(p,q),start,Math.max(p,q),end);};
    const s=d.sidewalkWidth,g=(opts.roadType||bySide.get(side)?.roadType)==='plain'?0:d.gutterWidth,r=d.roadWidth;
    return {side,roadPts:across(s+g,s+g+r),sidewalkPts:across(0,s),outerSidewalkPts:across(s+2*g+r,2*s+2*g+r),gutterInnerPts:across(s,s+g),gutterOuterPts:across(s+g+r,s+2*g+r),...d,cornerStyle:v220Corner(opts.cornerStyle||getStreetCornerStyle()),streetGeometryV220:true};
  }
  function v220ValidPolygon(pts){
    if(!Array.isArray(pts)||pts.length<3||pts.some(p=>!Number.isFinite(Number(p.x))||!Number.isFinite(Number(p.y)))||Math.abs(v216SignedArea(pts))<4)return false;
    const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x),on=(a,b,p)=>Math.abs(cross(a,b,p))<1e-7&&p.x>=Math.min(a.x,b.x)-1e-7&&p.x<=Math.max(a.x,b.x)+1e-7&&p.y>=Math.min(a.y,b.y)-1e-7&&p.y<=Math.max(a.y,b.y)+1e-7;
    for(let i=0;i<pts.length;i++){
      const a=pts[i],b=pts[(i+1)%pts.length];if(Math.hypot(b.x-a.x,b.y-a.y)<1e-5)return false;
      for(let j=i+1;j<pts.length;j++){
        if(j===i+1||i===0&&j===pts.length-1)continue;const p=pts[j],q=pts[(j+1)%pts.length],aa=cross(a,b,p),bb=cross(a,b,q),cc=cross(p,q,a),dd=cross(p,q,b);
        if(aa*bb<0&&cc*dd<0||on(a,b,p)||on(a,b,q)||on(p,q,a)||on(p,q,b))return false;
      }
    }return true;
  }
  function v220StoreSidewalk(street,part,pts,bounds=v219UrbanBounds()){
    if(!['sidewalkPts','outerSidewalkPts'].includes(part)||!v220ValidPolygon(pts))return false;
    street.manualSidewalks=street.manualSidewalks||{};street.manualSidewalks[part]=pts.map(p=>({x:p.x-bounds.minX,y:p.y-bounds.minY}));street[part]=pts.map(p=>({...p}));
    if(part==='sidewalkPts')street.fitSidewalkToArea=false;
    if(street.vertexOffsets)delete street.vertexOffsets[part];return true;
  }
  function v220RebuildStreetNetwork(){
    const layout=appState.layout,b=v219UrbanBounds(),network=layout.streets.map(s=>({...s}));
    layout.streets=layout.streets.map(street=>{
      if(!street?.side)return street;
      const geo=applyStreetVertexOffsets(street,v220BuildStreetGeometry(street.side,{...street,network,bounds:b}));
      for(const part of ['sidewalkPts','outerSidewalkPts']){
        if(street.manualSidewalks?.[part])geo[part]=street.manualSidewalks[part].map(p=>({x:p.x+b.minX,y:p.y+b.minY}));
      }
      if(street.fitSidewalkToArea){
        const missing=v216Union([v220Rect(b.minX,b.minY,b.maxX,b.maxY)],v219TotalContours());
        const near=missing.filter(p=>v216SignedArea(p)>0&&p.some(q=>Math.abs((street.side==='top'?q.y-b.minY:street.side==='bottom'?q.y-b.maxY:street.side==='left'?q.x-b.minX:q.x-b.maxX))<1e-5));
        const fitted=v216Union([geo.sidewalkPts,...near]).filter(p=>v216SignedArea(p)>0).sort((a,b)=>v216SignedArea(b)-v216SignedArea(a));
        if(fitted.length){geo.sidewalkPts=fitted[0];geo.sidewalkExtraContours=fitted.slice(1);}
      }else geo.sidewalkExtraContours=[];
      return ensureStreetVisualDefaults({...street,...geo});
    });return layout.streets;
  }
  function v220Frame(street){
    const p=street.roadPts,h=street.side==='top'||street.side==='bottom';if(!p?.length)return null;
    const b=polygonBounds(p),start=h?{x:b.minX,y:(b.minY+b.maxY)/2}:{x:(b.minX+b.maxX)/2,y:b.minY},end=h?{x:b.maxX,y:start.y}:{x:start.x,y:b.maxY};
    return {street,h,b,start,end,length:Math.hypot(end.x-start.x,end.y-start.y),axis:h?{x:1,y:0}:{x:0,y:1}};
  }
  function v220RoadCorners(rings,frames){
    const wedges=[];
    const owner=p=>frames.reduce((best,f)=>{const d=f.h?Math.abs(p.y-f.start.y):Math.abs(p.x-f.start.x);return !best||d<best.d?{f,d}:best;},null)?.f;
    const paths=rings.map(ring=>ring.flatMap((p,i)=>{
      const a=ring[(i+ring.length-1)%ring.length],b=ring[(i+1)%ring.length],u={x:p.x-a.x,y:p.y-a.y},v={x:b.x-p.x,y:b.y-p.y},lu=Math.hypot(u.x,u.y),lv=Math.hypot(v.x,v.y),f=owner(p),style=v220Corner(f?.street.cornerStyle);
      if(u.x*v.y-u.y*v.x>=-1e-7||style==='right'||lu<1e-7||lv<1e-7)return [p];
      const radius=Math.min(lu*.25,lv*.25,Math.max(8,(f.street.gutterWidth||f.street.sidewalkWidth*.15)*(style==='round'?.8:1.25))),q={x:p.x-u.x/lu*radius,y:p.y-u.y/lu*radius},z={x:p.x+v.x/lv*radius,y:p.y+v.y/lv*radius};
      const arc=style==='diagonal'?[q,z]:Array.from({length:6},(_,n)=>{const t=n/5;return {x:(1-t)*(1-t)*q.x+2*(1-t)*t*p.x+t*t*z.x,y:(1-t)*(1-t)*q.y+2*(1-t)*t*p.y+t*t*z.y};});
      wedges.push([p,...arc]);return arc;
    }));return {rings:paths,wedges};
  }
  function v220StreetScene(layout=appState.layout){
    const streets=(layout.streets||[]).filter(s=>s?.roadPts?.length>=3),gross=v219TotalContours(layout),key=JSON.stringify([gross,streets]);const old=v220StreetCache.get(layout);if(old?.key===key)return old.scene;
    const frames=streets.map(v220Frame).filter(Boolean),rawRoads=streets.map(s=>s.roadPts),corners=v220RoadCorners(v216Union(rawRoads,gross),frames),roads=[...rawRoads,...corners.wedges];
    const roadRings=v216Union(roads,gross),innerBands=[],outerBands=[],bars=[],endMasks=[];
    const owner=(p,dx,dy)=>frames.reduce((best,f)=>{
      const align=Math.abs(f.axis.x*dx+f.axis.y*dy),dist=Math.abs((f.h?p.y-f.start.y:p.x-f.start.x));const score=Math.abs(dist-(Number(f.street.roadWidth)||92)/2)+(align<.45?100000:0);
      return !best||score<best.score?{f,score}:best;
    },null)?.f;
    frames.forEach(f=>{const g=Number(f.street.gutterWidth)||0,pad=Math.max(g+8,12);for(const p of [f.start,f.end])endMasks.push(f.h?v220Rect(p.x-pad,f.b.minY-pad,p.x+pad,f.b.maxY+pad):v220Rect(f.b.minX-pad,p.y-pad,f.b.maxX+pad,p.y+pad));});
    const openEdge=(a,b)=>frames.some(f=>{
      if(f.h&&Math.abs(a.x-b.x)<1e-6)return [f.b.minX,f.b.maxX].some(x=>Math.abs(a.x-x)<1e-5&&Math.abs(b.x-x)<1e-5);
      if(!f.h&&Math.abs(a.y-b.y)<1e-6)return [f.b.minY,f.b.maxY].some(y=>Math.abs(a.y-y)<1e-5&&Math.abs(b.y-y)<1e-5);return false;
    });
    roadRings.forEach(ring=>{
      const edges=ring.map((a,i)=>{const b=ring[(i+1)%ring.length],dx=b.x-a.x,dy=b.y-a.y,L=Math.hypot(dx,dy),f=owner({x:(a.x+b.x)/2,y:(a.y+b.y)/2},dx/L,dy/L),g=f?.street.roadType==='plain'?0:Number(f?.street.gutterWidth)||0,c=Math.max(2,Math.min(8,(f?.street.sidewalkWidth||42)*.07));return {a,b,L,n:{x:dy/L,y:-dx/L},d:{x:dx/L,y:dy/L},g,c,open:openEdge(a,b)};});
      edges.forEach((e,i)=>{
        if(e.open||e.L<1e-6)return;const band=w=>[e.a,e.b,{x:e.b.x+e.n.x*w,y:e.b.y+e.n.y*w},{x:e.a.x+e.n.x*w,y:e.a.y+e.n.y*w}];
        if(e.g>0)innerBands.push(band(e.g));outerBands.push(band(e.g+e.c));
        const prev=edges[(i+edges.length-1)%edges.length];if(!prev.open){
          const join=w=>convexHull2D([e.a,{x:e.a.x+e.n.x*w,y:e.a.y+e.n.y*w},{x:e.a.x+prev.n.x*w,y:e.a.y+prev.n.y*w}]);
          const g=Math.min(e.g,prev.g);if(g>0)innerBands.push(join(g));outerBands.push(join(Math.max(e.g+e.c,prev.g+prev.c)));
        }
        if(e.g>0){const step=Math.max(5,Math.min(18,e.g*.6)),thick=Math.max(1,Math.min(4,e.g*.12));
          for(let t=step*.5;t<e.L-step*.2;t+=step){const p={x:e.a.x+e.d.x*t,y:e.a.y+e.d.y*t},a={x:p.x+e.n.x*e.g*.15,y:p.y+e.n.y*e.g*.15},b={x:p.x+e.n.x*e.g*.85,y:p.y+e.n.y*e.g*.85};bars.push([{x:a.x-e.d.x*thick/2,y:a.y-e.d.y*thick/2},{x:b.x-e.d.x*thick/2,y:b.y-e.d.y*thick/2},{x:b.x+e.d.x*thick/2,y:b.y+e.d.y*thick/2},{x:a.x+e.d.x*thick/2,y:a.y+e.d.y*thick/2}]);}
        }
      });
    });
    const gutters=v216Union(innerBands,[...roads,...gross,...endMasks]),curbs=v216Union(outerBands,[...roads,...innerBands,...gross,...endMasks]),grates=bars.filter(poly=>{const p=poly.reduce((s,p)=>({x:s.x+p.x/4,y:s.y+p.y/4}),{x:0,y:0});return ![...roads,...gross,...endMasks].some(mask=>v216Inside(p,mask));});
    const occupied=[...roads,...outerBands,...gross],byFinish=new Map();streets.forEach(s=>{const finish=s.sidewalkType||'paver';if(!byFinish.has(finish))byFinish.set(finish,[]);byFinish.get(finish).push(s.sidewalkPts,s.outerSidewalkPts,...(s.sidewalkExtraContours||[]));});
    const walks=[];let covered=[];for(const [finish,polys] of byFinish){const sources=polys.filter(p=>p?.length>=3),rings=v216Union(sources,[...occupied,...covered]);walks.push({finish,rings,sources});covered=covered.concat(sources);}
    const intersections=[],zebra=[],clear=[];
    for(const h of frames.filter(f=>f.h))for(const v of frames.filter(f=>!f.h)){
      const x=v.start.x,y=h.start.y;if(x<h.b.minX||x>h.b.maxX||y<v.b.minY||y>v.b.maxY)continue;
      const box={minX:v.b.minX,maxX:v.b.maxX,minY:h.b.minY,maxY:h.b.maxY};intersections.push({x,y,box,ids:[h.street.id,v.street.id]});
      for(const [f,before,at] of [[h,true,box.minX],[h,false,box.maxX],[v,true,box.minY],[v,false,box.maxY]]){
        const width=Number(f.street.roadWidth)||92,depth=Math.min(200,width*.38),gap=Math.max(5,width*.04),bar=Math.max(4,Math.min(22,width*.045)),space=bar*.7,lo=before?at-gap-depth:at+gap,hi=lo+depth,margin=width*.06;
        clear.push(f.h?v220Rect(lo-10,f.b.minY,hi+10,f.b.maxY):v220Rect(f.b.minX,lo-10,f.b.maxX,hi+10));
        for(let p=lo;p+bar<=hi+1e-6;p+=bar+space)zebra.push(f.h?v220Rect(p,f.b.minY+margin,p+bar,f.b.maxY-margin):v220Rect(f.b.minX+margin,p,f.b.maxX-margin,p+bar));
      }
      clear.push(v220Rect(box.minX,box.minY,box.maxX,box.maxY));
    }
    const lines=[];frames.forEach(f=>{const width=Number(f.street.roadWidth)||92,dash=Math.max(16,Math.min(160,width*.45)),gap=dash*.6,thick=Math.max(2,Math.min(6,width*.015));for(let t=10;t<f.length-10;t+=dash+gap){const a=t,b=Math.min(f.length-10,t+dash);if(b<=a)continue;lines.push(f.h?v220Rect(f.start.x+a,f.start.y-thick/2,f.start.x+b,f.start.y+thick/2):v220Rect(f.start.x-thick/2,f.start.y+a,f.start.x+thick/2,f.start.y+b));}});
    const scene={roads:roadRings,roadSources:roads,gutters,curbs,grates,walks,markings:v216Union(lines,[...clear,...gross]),crossings:v216Union(zebra,gross),intersections,frames};v220StreetCache.set(layout,{key,scene});return scene;
  }
  function v220RingsPath(rings){return rings.map(pathFromPts).join(' ');}
  function v220StreetAt(point){
    return v220StreetScene().frames.reduce((best,f)=>{const q=projectPointToSegment(point,f.start,f.end),d=Math.hypot(point.x-q.x,point.y-q.y);return !best||d<best.d?{id:f.street.id,d}:best;},null)?.id||'';
  }
  function v220PointOnSidewalk(point,street=null){
    const scene=v220StreetScene();return scene.walks.some(w=>w.rings.reduce((inside,p)=>inside+(v216Inside(point,p)?(v216SignedArea(p)>0?1:-1):0),0)>0)&&(!street||[street.sidewalkPts,street.outerSidewalkPts,...(street.sidewalkExtraContours||[])].some(p=>p?.length>=3&&v216Inside(point,p)));
  }
  function v220RenderStreets2D(layer,svg){
    const scene=v220StreetScene(),pick=e=>{if(activeLayoutWorkspace()!=='urbanism'||appState.editor.mode!=='select')return;e.stopPropagation();appState.selectedStreetId=v220StreetAt(svgPoint(e,svg));appState.selectedStreetFurnitureId='';renderLayoutEditor();};
    const add=(rings,fill,kind)=>{if(!rings.length)return;const p=svgEl('path',{d:v220RingsPath(rings),fill,'fill-rule':'evenodd','data-v220-street-surface':kind,style:'cursor:pointer'});p.addEventListener('pointerdown',pick);layer.appendChild(p);};
    // The grate bars are separate positive rings; nonzero keeps overlaps filled.
    scene.walks.forEach(w=>add(w.rings,`url(#street-sidewalk-${w.finish})`,'sidewalk'));
    add(scene.roads,'#70777b','road');add(scene.gutters,'#434e52','gutter');add(scene.curbs,'#e5bd3d','curb');add(scene.grates,'#b0bab9','grates');add(scene.markings,'#fff9ec','centerline');add(scene.crossings,'#fff9ec','crosswalk');
  }
  function v220SidewalkTools(street){
    if(!street)return '';return `<details class="v220-sidewalk-tools" ${appState.editor.streetVerticesVisible?'open':''}><summary>Forma de la vereda</summary><p>Ajusta la vereda al contorno del área total o arrastra sus vértices. Doble clic en un lado para añadir una esquina.</p><button type="button" class="seg-btn" id="v220FitSidewalk">Ajustar al contorno del edificio</button><div class="layout-template-grid"><button type="button" class="seg-btn" id="v220AddStreetVertex">Añadir vértice</button><button type="button" class="seg-btn" id="v220RemoveStreetVertex">Quitar vértice</button></div></details>`;
  }
  function v220ChangeSidewalkVertex(add=true){
    const street=appState.layout.streets.find(s=>s.id===appState.selectedStreetId),part=appState.editor.streetVertexPart==='outerSidewalkPts'?'outerSidewalkPts':'sidewalkPts',pts=street?.[part];if(!pts?.length)return;
    const next=pts.map(p=>({...p})),i=Math.max(0,Math.min(next.length-1,Number(appState.editor.streetSelectedVertex)||0));
    if(add){const a=next[i],b=next[(i+1)%next.length];next.splice(i+1,0,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});}else{if(next.length<=3)return;next.splice(i,1);}
    if(!v220ValidPolygon(next)){showToast('El cambio cruzaría el perímetro de la vereda.','warning');return;}
    recordHistorySnapshot('structure');v220StoreSidewalk(street,part,next);appState.editor.streetVertexPart=part;appState.editor.streetVerticesVisible=true;appState.editor.streetSelectedVertex=add?i+1:Math.max(0,i-1);rebuildStreetNetwork();persistActiveLayout('vértices de vereda');renderLayoutEditor();
  }
  function v220BindSidewalkTools(){
    const street=appState.layout.streets.find(s=>s.id===appState.selectedStreetId);
    document.getElementById('v220FitSidewalk')?.addEventListener('click',()=>{if(!street)return;recordHistorySnapshot('structure');street.fitSidewalkToArea=true;if(street.manualSidewalks)delete street.manualSidewalks.sidewalkPts;if(street.vertexOffsets)delete street.vertexOffsets.sidewalkPts;rebuildStreetNetwork();appState.editor.streetVertexPart='sidewalkPts';appState.editor.streetVerticesVisible=true;persistActiveLayout('vereda ajustada al contorno');renderLayoutEditor();});
    document.getElementById('v220AddStreetVertex')?.addEventListener('click',()=>v220ChangeSidewalkVertex(true));document.getElementById('v220RemoveStreetVertex')?.addEventListener('click',()=>v220ChangeSidewalkVertex(false));
  }
  function v220StreetGeometry(THREE,rings,mapper,depth=0){
    const outer=rings.filter(p=>v216SignedArea(p)>0),holes=rings.filter(p=>v216SignedArea(p)<0),make=(pts,Type)=>{const p=new Type();pts.forEach((a,i)=>{const b=mapper(a);i?p.lineTo(b.x,-b.z):p.moveTo(b.x,-b.z);});p.closePath();return p;};
    const shapes=outer.map(p=>{const shape=make(p,THREE.Shape);holes.filter(h=>v216Inside(h[0],p)&&!outer.some(q=>q!==p&&Math.abs(v216SignedArea(q))<Math.abs(v216SignedArea(p))&&v216Inside(h[0],q))).forEach(h=>shape.holes.push(make(h,THREE.Path)));return shape;});
    if(!shapes.length)return null;const geo=depth?new THREE.ExtrudeGeometry(shapes,{depth,bevelEnabled:false,steps:1,curveSegments:1}):new THREE.ShapeGeometry(shapes);
    const pos=geo.attributes.position,uv=geo.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getX(i),-pos.getY(i));return geo;
  }
  function v220InsertSidewalkPoint(street,part,index,point){
    const next=street[part].map(p=>({...p}));next.splice(index+1,0,point);if(!v220ValidPolygon(next))return;
    recordHistorySnapshot('structure');v220StoreSidewalk(street,part,next);appState.editor.streetSelectedVertex=index+1;rebuildStreetNetwork();persistActiveLayout('nuevo vértice de vereda');renderLayoutEditor();
  }
