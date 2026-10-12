  // V219: a derived gross footprint. The manually edited commercial area
  // remains the source for zones and the anchors of physical walls.
  const v219TotalAreaCache=new WeakMap();
  let v219RefreshingStreets=false;
  function v219ComputeTotalArea(layout){
    const pts=(layout?.meta?.siteBoundary?.pts||[]).map(p=>({x:Number(p.x),y:Number(p.y)}));
    const walls=(layout?.walls||[]).filter(w=>[w.x1,w.y1,w.x2,w.y2].every(v=>Number.isFinite(Number(v)))&&wallLength(w)>=1);
    if(pts.length<3||pts.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))||Math.abs(v216SignedArea(pts))<1e-7||!walls.length)return null;
    const polys=[pts,...walls.map(w=>getWallSlicePolygon(w,0,1,1,walls)?.poly).filter(Boolean),...v216JointPieces(walls).map(j=>j.poly)];
    const contours=v216Union(polys).filter(p=>v216SignedArea(p)>0).sort((a,b)=>v216SignedArea(b)-v216SignedArea(a));
    if(!contours.length)return null;
    return {id:'AREA-TOTAL',name:'Área total',automatic:true,pts:contours[0],contours};
  }
  function v219SyncTotalArea(layout=appState.layout){
    if(!layout?.meta)return null;
    const key=JSON.stringify([(layout.meta.siteBoundary?.pts||[]).map(p=>[p.x,p.y]),(layout.walls||[]).map(w=>[w.id,w.x1,w.y1,w.x2,w.y2,w.thickness,w.placement,w.referenceOutwardSign,w.side,w.autoZoneEdge,w.zoneId,w.edgeIndex]),(layout.zones||[]).filter(z=>(layout.walls||[]).some(w=>w.autoZoneEdge&&w.zoneId===z.id)).map(z=>z.pts)]);
    let entry=v219TotalAreaCache.get(layout);
    if(!entry||entry.key!==key){entry={key,boundary:v219ComputeTotalArea(layout),streetKey:entry?.streetKey};v219TotalAreaCache.set(layout,entry);}
    if(entry.boundary)layout.meta.totalBoundary=entry.boundary;else delete layout.meta.totalBoundary;
    return entry.boundary;
  }
  function v219RefreshTotalArea(){
    const layout=appState.layout,boundary=v219SyncTotalArea(layout),entry=v219TotalAreaCache.get(layout);
    if(!entry||entry.streetKey===entry.key||v219RefreshingStreets)return boundary;
    // Update streets once per changed physical footprint, including migration.
    // Reentrant ensureLayoutMeta calls from the street builder are harmless.
    entry.streetKey=entry.key;
    if(boundary&&(layout.streets||[]).length){
      v219RefreshingStreets=true;
      try{rebuildStreetNetwork();}finally{v219RefreshingStreets=false;}
    }
    return boundary;
  }
  function v219TotalContours(layout=appState.layout){const b=v219SyncTotalArea(layout);return b?.contours||[];}
  function v219UrbanBounds(){
    const pts=v219TotalContours().flat();
    if(!pts.length)return layoutBoundaryBounds();
    const minX=Math.min(...pts.map(p=>p.x)),maxX=Math.max(...pts.map(p=>p.x)),minY=Math.min(...pts.map(p=>p.y)),maxY=Math.max(...pts.map(p=>p.y));
    return {minX,maxX,minY,maxY,w:maxX-minX,h:maxY-minY};
  }
  function v219CanCreateUrbanism(){return !!v219SyncTotalArea();}
  function v219RequireUrbanism(){
    if(v219CanCreateUrbanism())return true;
    showToast('Dibuja el área comercial y crea sus muros. El área total se generará automáticamente para ubicar calles y veredas.','warning',4200);return false;
  }
  function v219TotalAreaMarkup(){
    const total=v219SyncTotalArea(),scale=getScaleCmPerUnit()/100;
    const area=total?total.contours.reduce((s,p)=>s+v216SignedArea(p),0)*scale*scale:0;
    return `<section class="v219-total-summary" aria-label="Área total automática"><div class="layout-prop-title">Área total · automática</div>${total?`<strong>${area.toFixed(2)} <small>m²</small></strong><p>Incluye el área comercial y el espesor de los muros. Calles y veredas usan este límite exterior.</p>`:'<p>Crea los muros del área comercial para generar el área total y habilitar calles y veredas.</p>'}</section>`;
  }

  const V219_CUT_HEIGHT=.20;
  function v219WallRenderHeight(wall,scaleCmPerUnit=1){
    const height=Math.max(100,Number(wall.height)||290)*scaleCmPerUnit/100;
    return wall.v219Cutaway?Math.min(V219_CUT_HEIGHT,height):height;
  }
  function v219CutWallParts(walls,boundary,mode='diorama',towardCamera={x:-1,y:1,z:1},previous=new Map()){
    const full=v218VisibleWallParts(walls,boundary,mode,towardCamera,previous);
    if(mode!=='diorama')return {...full,fullParts:full.parts};
    const lows=walls.flatMap(wall=>{
      const length=wallLength(wall);if(length<1)return [];
      const spans=full.parts.filter(p=>p.id===wall.id).map(p=>[(p.v217StartDistance||0)/length,((p.v217StartDistance||0)+wallLength(p))/length]).sort((a,b)=>a[0]-b[0]);
      let start=0;const hidden=[];
      spans.forEach(([a,b])=>{if(a-start>1e-7)hidden.push([start,a]);start=Math.max(start,b);});if(1-start>1e-7)hidden.push([start,1]);
      return hidden.map(([a,b])=>({...wall,x1:Number(wall.x1)+(Number(wall.x2)-Number(wall.x1))*a,y1:Number(wall.y1)+(Number(wall.y2)-Number(wall.y1))*a,x2:Number(wall.x1)+(Number(wall.x2)-Number(wall.x1))*b,y2:Number(wall.y1)+(Number(wall.y2)-Number(wall.y1))*b,v217SourceLength:length,v217StartDistance:length*a,v219Cutaway:true}));
    });
    return {...full,fullParts:full.parts,parts:[...full.parts,...lows],signature:full.signature+'|plinth20'};
  }
