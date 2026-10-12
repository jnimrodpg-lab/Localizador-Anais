  // V217: display classification follows the commercial area's boundary,
  // never the virtual zoning or camera direction. Stored walls are unchanged.
  const V217_ISO_THETA=-Math.PI/4;
  const V217_ISO_PHI=Math.acos(1/Math.sqrt(3));
  function v217ExteriorIntervals(wall,boundary){
    const pts=boundary?.pts||boundary||[];if(pts.length<3)return [];
    const a={x:Number(wall.x1),y:Number(wall.y1)},dx=Number(wall.x2)-a.x,dy=Number(wall.y2)-a.y,L=Math.hypot(dx,dy);if(!L)return [];
    const tolerance=Math.max(.08,Math.min(.5,(Number(wall.thickness)||12)*.02)),ranges=[];
    const parameter=p=>((p.x-a.x)*dx+(p.y-a.y)*dy)/(L*L);
    const distance=p=>Math.abs((p.x-a.x)*dy-(p.y-a.y)*dx)/L;
    pts.forEach((p,i)=>{const q=pts[(i+1)%pts.length],edge=Math.hypot(q.x-p.x,q.y-p.y);if(edge<1e-7)return;
      if(Math.abs(dx*(q.y-p.y)-dy*(q.x-p.x))/(L*edge)>1e-5||distance(p)>tolerance||distance(q)>tolerance)return;
      const t=parameter(p),u=parameter(q),start=Math.max(0,Math.min(t,u)),end=Math.min(1,Math.max(t,u));if(end-start>1e-7)ranges.push([start,end]);
    });
    ranges.sort((a,b)=>a[0]-b[0]);const merged=[];ranges.forEach(r=>{const last=merged.at(-1);if(last&&r[0]<=last[1]+1e-7)last[1]=Math.max(last[1],r[1]);else merged.push(r.slice());});return merged;
  }
  function v217VisibleWallParts(walls,boundary,mode='diorama'){
    if(mode==='none')return [];
    return walls.flatMap(wall=>{
      if(mode==='full')return [wall];const outer=v217ExteriorIntervals(wall,boundary),ranges=[];let start=0;
      outer.forEach(([a,b])=>{if(a-start>1e-7)ranges.push([start,a]);start=Math.max(start,b);});if(1-start>1e-7)ranges.push([start,1]);
      return ranges.map(([a,b])=>{if(a===0&&b===1)return wall;const dx=wall.x2-wall.x1,dy=wall.y2-wall.y1,L=Math.hypot(dx,dy);return {...wall,x1:wall.x1+dx*a,y1:wall.y1+dy*a,x2:wall.x1+dx*b,y2:wall.y1+dy*b,v217SourceLength:L,v217StartDistance:L*a};});
    });
  }
  function v217WallModeNext(mode){return mode==='diorama'?'full':mode==='full'?'none':'diorama';}
  function v217WallModeLabel(mode){return mode==='full'?'Muros completos':mode==='none'?'Sin muros':'Diorama';}
