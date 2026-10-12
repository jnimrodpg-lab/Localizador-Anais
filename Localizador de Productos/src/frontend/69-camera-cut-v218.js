  // V218: camera-dependent cutaway. Plan coordinates x/y map to world x/z.
  function v218InwardFaces(wall,boundary){
    const pts=boundary?.pts||boundary||[];if(pts.length<3)return [];
    const area=pts.reduce((s,p,i)=>s+Number(p.x)*Number(pts[(i+1)%pts.length].y)-Number(pts[(i+1)%pts.length].x)*Number(p.y),0);
    if(Math.abs(area)<1e-8)return [];
    const sign=area>0?1:-1,a={x:Number(wall.x1),y:Number(wall.y1)},dx=Number(wall.x2)-a.x,dy=Number(wall.y2)-a.y,L=Math.hypot(dx,dy);if(!L)return [];
    const tolerance=Math.max(.08,Math.min(.5,(Number(wall.thickness)||12)*.02)),faces=[];
    const parameter=p=>((p.x-a.x)*dx+(p.y-a.y)*dy)/(L*L),distance=p=>Math.abs((p.x-a.x)*dy-(p.y-a.y)*dx)/L;
    pts.forEach((p,i)=>{const q=pts[(i+1)%pts.length],ex=Number(q.x)-Number(p.x),ey=Number(q.y)-Number(p.y),len=Math.hypot(ex,ey);if(len<1e-7)return;
      if(Math.abs(dx*ey-dy*ex)/(L*len)>1e-5||distance(p)>tolerance||distance(q)>tolerance)return;
      const t=parameter(p),u=parameter(q),start=Math.max(0,Math.min(t,u)),end=Math.min(1,Math.max(t,u));if(end-start<=1e-7)return;
      const normal={x:-ey/len*sign,z:ex/len*sign};
      // Normal is part of the key: a changed contour cannot inherit an old side.
      faces.push({start,end,normal,key:`${wall.id}:${i}:${normal.x.toFixed(6)}:${normal.z.toFixed(6)}`});
    });return faces;
  }
  function v218FaceVisible(normal,towardCamera,previous){
    const x=Number(towardCamera?.x)||0,z=Number(towardCamera?.z)||0,y=Number(towardCamera?.y)||0,flat=Math.hypot(x,z),length=Math.hypot(x,y,z);
    // Near plan view keep the complete footprint; vertical faces are edge-on.
    if(!length||flat/length<.12)return true;
    const dot=(normal.x*x+normal.z*z)/flat,hysteresis=.025;
    if(dot>hysteresis)return true;if(dot<-hysteresis)return false;
    return typeof previous==='boolean'?previous:dot>=0;
  }
  function v218VisibleWallParts(walls,boundary,mode='diorama',towardCamera={x:-1,y:1,z:1},previous=new Map()){
    if(mode==='none')return {parts:[],visibility:previous,signature:'none'};
    if(mode==='full')return {parts:walls,visibility:previous,signature:'full'};
    const next=new Map(),parts=walls.flatMap(wall=>{
      const faces=v218InwardFaces(wall,boundary),hidden=[];
      faces.forEach(face=>{const visible=v218FaceVisible(face.normal,towardCamera,previous.get(face.key));next.set(face.key,visible);if(!visible)hidden.push([face.start,face.end]);});
      hidden.sort((a,b)=>a[0]-b[0]);const ranges=[];let start=0;
      hidden.forEach(([a,b])=>{if(a-start>1e-7)ranges.push([start,a]);start=Math.max(start,b);});if(1-start>1e-7)ranges.push([start,1]);
      return ranges.map(([a,b])=>{if(a===0&&b===1)return wall;const ax=Number(wall.x1),ay=Number(wall.y1),dx=Number(wall.x2)-ax,dy=Number(wall.y2)-ay,L=Math.hypot(dx,dy);return {...wall,x1:ax+dx*a,y1:ay+dy*a,x2:ax+dx*b,y2:ay+dy*b,v217SourceLength:L,v217StartDistance:L*a};});
    });
    return {parts,visibility:next,signature:JSON.stringify(parts.map(w=>[w.id,w.x1,w.y1,w.x2,w.y2,w.v217StartDistance||0,w.v217SourceLength||0]))};
  }
