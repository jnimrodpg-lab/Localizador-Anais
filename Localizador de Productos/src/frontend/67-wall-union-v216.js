  // V216: union of physical wall footprints. Editable axes/IDs remain stable.
  function v216SignedArea(poly){return poly.reduce((s,p,i)=>s+p.x*poly[(i+1)%poly.length].y-poly[(i+1)%poly.length].x*p.y,0)/2;}
  function v216Inside(p,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
  function v216Union(polygons,excluded=[]){
    const polys=polygons.filter(p=>p?.length>=3&&p.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y))&&Math.abs(v216SignedArea(p))>1e-10);
    if(!polys.length)return [];
    const masks=excluded.filter(p=>p?.length>=3);
    const all=[...polys,...masks].flat(),span=Math.max(1,...all.map(p=>Math.abs(p.x)),...all.map(p=>Math.abs(p.y))),eps=Math.max(1e-7,span*1e-10),key=p=>`${Math.round(p.x/(eps*4))},${Math.round(p.y/(eps*4))}`;
    const bounds=polys.map(p=>({minX:Math.min(...p.map(v=>v.x)),maxX:Math.max(...p.map(v=>v.x)),minY:Math.min(...p.map(v=>v.y)),maxY:Math.max(...p.map(v=>v.y))}));
    const occupied=p=>polys.some((poly,i)=>p.x>=bounds[i].minX&&p.x<=bounds[i].maxX&&p.y>=bounds[i].minY&&p.y<=bounds[i].maxY&&v216Inside(p,poly))&&!masks.some(poly=>v216Inside(p,poly));
    const edges=[...polys,...masks].flatMap(poly=>poly.map((a,i)=>({a,b:poly[(i+1)%poly.length],ts:[0,1]}))).filter(e=>Math.hypot(e.a.x-e.b.x,e.a.y-e.b.y)>eps);
    const cross=(a,b)=>a.x*b.y-a.y*b.x;
    for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){
      const e=edges[i],f=edges[j],r={x:e.b.x-e.a.x,y:e.b.y-e.a.y},s={x:f.b.x-f.a.x,y:f.b.y-f.a.y},q={x:f.a.x-e.a.x,y:f.a.y-e.a.y},den=cross(r,s);
      if(Math.abs(den)>1e-9*Math.hypot(r.x,r.y)*Math.hypot(s.x,s.y)){const t=cross(q,s)/den,u=cross(q,r)/den;if(t>=-1e-9&&t<=1+1e-9&&u>=-1e-9&&u<=1+1e-9){e.ts.push(Math.max(0,Math.min(1,t)));f.ts.push(Math.max(0,Math.min(1,u)));}}
      else if(Math.abs(cross(q,r))<=eps*Math.hypot(r.x,r.y)){
        const add=(edge,p)=>{const dx=edge.b.x-edge.a.x,dy=edge.b.y-edge.a.y,t=((p.x-edge.a.x)*dx+(p.y-edge.a.y)*dy)/(dx*dx+dy*dy);if(t>0&&t<1)edge.ts.push(t);};add(e,f.a);add(e,f.b);add(f,e.a);add(f,e.b);
      }
    }
    const boundary=new Map();
    edges.forEach(e=>{const ts=[...new Set(e.ts)].sort((a,b)=>a-b);for(let i=0;i<ts.length-1;i++){
      const at=t=>({x:e.a.x+(e.b.x-e.a.x)*t,y:e.a.y+(e.b.y-e.a.y)*t});let a=at(ts[i]),b=at(ts[i+1]);const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(len<=eps*4)continue;
      const delta=Math.min(len*.001,eps*20),m={x:(a.x+b.x)/2,y:(a.y+b.y)/2},left=occupied({x:m.x-dy/len*delta,y:m.y+dx/len*delta}),right=occupied({x:m.x+dy/len*delta,y:m.y-dx/len*delta});
      if(left===right)continue;if(!left)[a,b]=[b,a];boundary.set(key(a)+'>'+key(b),{a,b,ka:key(a),kb:key(b)});
    }});
    const outgoing=new Map();boundary.forEach(e=>{if(!outgoing.has(e.ka))outgoing.set(e.ka,[]);outgoing.get(e.ka).push(e);});
    const used=new Set(),rings=[];
    for(const start of boundary.values()){
      if(used.has(start))continue;const ring=[];let e=start,closed=false;
      for(let guard=0;guard<=boundary.size;guard++){
        used.add(e);ring.push(e.a);if(e.kb===start.ka){closed=true;break;}
        const choices=(outgoing.get(e.kb)||[]).filter(x=>!used.has(x));if(!choices.length)break;
        const back=Math.atan2(e.a.y-e.b.y,e.a.x-e.b.x);
        choices.sort((u,v)=>{const turn=x=>(back-Math.atan2(x.b.y-x.a.y,x.b.x-x.a.x)+Math.PI*2)%(Math.PI*2);return turn(u)-turn(v);});e=choices[0];
      }
      if(!closed)throw new Error('Contorno de muro no cerrado');
      if(ring.length>=3&&Math.abs(v216SignedArea(ring))>eps*eps)rings.push(ring);
    }
    return rings;
  }
  function v216JointPieces(walls=appState.layout.walls){
    const nodes=new Map(),key=p=>`${Math.round(p.x*1e5)},${Math.round(p.y*1e5)}`;
    walls.filter(w=>!w.autoZoneEdge).forEach(w=>{const raw=getWallRawSlicePolygon(w);if(!raw)return;const limited=getWallSlicePolygon(w,0,1,1,walls)?.miterLimited;
      [[raw.a,[raw.poly[0],raw.poly[3]]],[raw.b,[raw.poly[1],raw.poly[2]]]].forEach(([p,ends])=>{const k=key(p);if(!nodes.has(k))nodes.set(k,{ends:[],walls:[],limited:false});const n=nodes.get(k);n.ends.push(...ends);n.walls.push(w);n.limited||=!!limited;});
    });
    return [...nodes.values()].filter(n=>n.walls.length>=3||n.walls.length===2&&n.limited).map(n=>({poly:convexHull2D(n.ends),ids:n.walls.map(w=>w.id),height:Math.min(...n.walls.map(w=>Number(w.height)||290))}));
  }
  function v216SameWallProfile(a,b){
    const aa=getWallFaceOffsets(a),bb=getWallFaceOffsets(b),reverse=(a.x2-a.x1)*(b.x2-b.x1)+(a.y2-a.y1)*(b.y2-b.y1)<0;
    return Math.abs(aa.left-(reverse?bb.right:bb.left))<1e-6&&Math.abs(aa.right-(reverse?bb.left:bb.right))<1e-6&&Math.abs((Number(a.height)||290)-(Number(b.height)||290))<1e-6&&(a.material||'default')===(b.material||'default');
  }
  function v216OpeningVoids(){
    if(typeof getOpeningFootprint!=='function')return [];
    const scale=getScaleCmPerUnit()/100;
    return (appState.layout.openings||[]).map(o=>{const wall=findWallById(o.wallId);if(!wall)return null;const footprint=getOpeningFootprint(o,wall),defaults=openingDefaultForType(o.type),sill=Math.max(0,Number(o.sill??defaults.sill));return footprint?{poly:footprint.poly,y0:sill*scale,y1:Math.min(Number(wall.height)||290,sill+(Number(o.height)||defaults.height))*scale}:null;}).filter(Boolean);
  }
  let v216PlanCache=null;
  function v216PlanRings(polys,voids=[]){const signature=JSON.stringify([polys,voids]);if(v216PlanCache?.signature===signature)return v216PlanCache.rings;const rings=v216Union(polys,voids);v216PlanCache={signature,rings};return rings;}
  function v216RenderWallUnion(layer,polys){
    const physical=polys.concat(v216JointPieces().map(j=>j.poly));if(!physical.length)return;
    const rings=v216PlanRings(physical,v216OpeningVoids().map(v=>v.poly)),d=rings.map(r=>wallPolygonPath(r)).join(' ');
    const path=svgEl('path',{d,fill:'rgba(232,223,209,.99)',stroke:'#7b6753','stroke-width':1.6,'fill-rule':'evenodd','pointer-events':'none','data-v216-wall-union':'1'});layer.prepend(path);
  }
  function v216AddUnionMeshes(THREE,host,bands,mapper,register){
    if(!bands.length)return;
    const voids=v216OpeningVoids();
    const levels=[...new Set([...bands,...voids].flatMap(b=>[b.y0,b.y1]))].sort((a,b)=>a-b);
    for(let i=0;i<levels.length-1;i++){
      const y0=levels[i],y1=levels[i+1],mid=(y0+y1)/2;if(y1-y0<1e-7)continue;
      const active=bands.filter(b=>b.y0<=mid&&b.y1>=mid);if(!active.length)continue;
      const materials=new Map();active.forEach(b=>{const m=b.material,k=[m.color?.getHex(),m.opacity,m.transparent,m.roughness,m.metalness].join('|');if(!materials.has(k))materials.set(k,[]);materials.get(k).push(b);});
      let covered=voids.filter(v=>v.y0<=mid&&v.y1>=mid).map(v=>v.poly);
      for(const parts of materials.values()){
      const rings=v216Union(parts.map(b=>b.poly),covered),outers=rings.filter(r=>v216SignedArea(r)>0),holes=rings.filter(r=>v216SignedArea(r)<0);
      outers.forEach(r=>{
        const make=(ring,Type)=>{const path=new Type();ring.forEach((p,i)=>{const q=mapper(p);i?path.lineTo(q.x,-q.z):path.moveTo(q.x,-q.z);});path.closePath();return path;};
        const shape=make(r,THREE.Shape);holes.filter(h=>v216Inside(h[0],r)&&!outers.some(o=>o!==r&&Math.abs(v216SignedArea(o))<Math.abs(v216SignedArea(r))&&v216Inside(h[0],o))).forEach(h=>shape.holes.push(make(h,THREE.Path)));
        const geo=new THREE.ExtrudeGeometry(shape,{depth:y1-y0,bevelEnabled:false,curveSegments:1,steps:1});geo.rotateX(-Math.PI/2);geo.translate(0,y0,0);
        const mesh=new THREE.Mesh(geo,parts[0].material);mesh.castShadow=mesh.receiveShadow=true;
        mesh.userData={entityType:'wall',wallId:parts[0].wallId,wallIds:[...new Set(parts.map(b=>b.wallId))],wallUnion:true,wallParts:parts.map(b=>({id:b.wallId,poly:b.poly.map(mapper)}))};host.add(mesh);register(mesh);
      });covered=covered.concat(parts.map(b=>b.poly));
      }
    }
  }
  function v216WallIdAtHit(hit){
    const parts=hit?.object?.userData?.wallParts;if(!parts)return hit?.object?.userData?.wallId||'';
    const p={x:hit.point.x,y:hit.point.z};return parts.find(part=>v216Inside(p,part.poly.map(q=>({x:q.x,y:q.z}))))?.id||hit.object.userData.wallId||'';
  }
