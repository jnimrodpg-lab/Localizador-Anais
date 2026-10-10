/* WMS V161: modelos 3D paramétricos de mobiliario y cajas colocadas sobre niveles.
 * Geometría y materiales creados en Three.js; sin imágenes incrustadas ni modelos remotos.
 * Todas las piezas llevan furnitureId, level, slot para picking sobre el canvas.
 */
function vspaceContainersForSlot(rack,level,slot){
  const configured=(rack.virtualContainers||[]).find(c=>Number(c.level)===level && Number(c.slot)===slot);
  if(configured)return {kind:['carton','plastic','none'].includes(configured.kind)?configured.kind:'carton',count:vspaceClamp(Math.round(Number(configured.count)||0),0,4)};
  return vspaceProductsForSlot(rack,level,slot).length?{kind:'carton',count:1}:{kind:'none',count:0};
}
function vspaceSetSlotContainers(rack,level,slot,kind,count){
  if(!rack||!vspaceIsEditable())return;
  const spec=vspaceSpec(rack);
  if(level<1||level>spec.levels||slot<1||slot>spec.slots)return vspaceToast('Nivel o posición incorrectos.',true);
  const allowed=['carton','plastic','none'];
  if(!allowed.includes(kind))return vspaceToast('Tipo de contenedor incorrecto.',true);
  count=kind==='none'?0:vspaceClamp(Math.round(Number(count)||1),1,4);
  rack.virtualContainers=(rack.virtualContainers||[]).filter(c=>!(Number(c.level)===level&&Number(c.slot)===slot));
  rack.virtualContainers.push({level,slot,kind,count});
  vspaceCommit(`${count} ${kind==='carton'?'caja(s) de cartón':kind==='plastic'?'gaveta(s) plástica(s)':'contenedores'} en N${level}/P${slot}`);
  vspaceActive?.refreshInspector();
}
function vspaceBuildIsometricFurniture(THREE, group, rack, spec, options){
  const {shared, block:box, sprite:label, selected, selectedLevel, selectedSlot, products}=options;
  const w=spec.width/100, d=spec.depth/100, h=spec.height/100;
  const metal=shared.metal; // selección mediante contorno, sin sustituir los acabados del resto
  const part=(x,y,z,bw,bh,bd,mat,l=0,s=0)=>box(group,x,y,z,bw,bh,bd,mat,l,s);
  const sign=(text,x,y,z,width=.33)=>{const sp=label(text,width);sp.position.set(x,y,z);group.add(sp);return sp;};
  const shelfSlot=(l,s)=>({l,s,selectedSlot: selected && l===selectedLevel && s===selectedSlot});
  const carton=(x,y,z,bw,bh,bd,l=0,s=0,material=shared.cardboard)=>{
    const cube=part(x,y+bh/2,z,bw,bh,bd,material,l,s);
    // Branded, lightweight packaging details: central packing tape and a shipping label.
    part(x,y+bh+.002,z,.075,.006,bd*.92,shared.tape,l,s);
    part(x,y+bh/2,z-bd/2-.003,bw*.075,bh*.94,.006,shared.tape,l,s);
    part(x-bw*.25,y+bh*.58,z+bd/2+.005,bw*.018,bh*.18,.004,shared.ink,l,s);
    part(x+bw*.25,y+bh*.58,z+bd/2+.005,bw*.018,bh*.18,.004,shared.ink,l,s);
    part(x,y+bh/2,z+bd/2+.003,bw*.36,bh*.34,.007,shared.paper,l,s);
    part(x-bw*.105,y+bh*.46,z+bd/2+.009,bw*.03,bh*.17,.004,shared.ink,l,s);
    part(x-bw*.045,y+bh*.46,z+bd/2+.009,bw*.02,bh*.17,.004,shared.ink,l,s);
    part(x+bw*.018,y+bh*.46,z+bd/2+.009,bw*.045,bh*.17,.004,shared.ink,l,s);
    return cube;
  };
  const crate=(x,y,z,bw,bh,bd,l=0,s=0)=>{
    part(x,y+.025,z,bw,.05,bd,shared.plastic,l,s);
    part(x,y+bh-.026,z,bw,.05,bd,shared.plasticLight,l,s);
    const t=Math.min(.035,bw*.065,bd*.1);
    [-1,1].forEach(i=>{
      part(x+i*(bw-t)/2,y+bh/2,z,t,bh,bd,shared.plastic,l,s);
      part(x,y+bh/2,z+i*(bd-t)/2,bw,bh,t,shared.plastic,l,s);
    });
    for(let i=1;i<5;i++){
      const xx=x-bw/2+bw*i/5;
      part(xx,y+bh*.44,z+bd/2+.004,.009,bh*.56,.009,shared.plasticDark,l,s);
    }
    part(x,y+bh*.79,z+bd/2+.01,bw*.27,bh*.07,.007,shared.paper,l,s);
  };
  const slotContents=(l,s,surfaceY,bayW,bayDepth,bayX)=>{
    const cfg=vspaceContainersForSlot(rack,l,s);
    const filled=products(rack,l,s).length>0;
    const count=cfg.kind==='none'?0:cfg.count;
    const capH=Math.max(.10,Math.min(.46,h/Math.max(1,spec.levels)*.52));
    if(selected&&l===selectedLevel&&s===selectedSlot){
      part(bayX,surfaceY+.013,d*.02,bayW*.89,.017,bayDepth*.84,shared.highlight,l,s);
    }
    if(!count)return;
    const space=bayW*.89/count;
    for(let n=0;n<count;n++){
      const bx=bayX-bayW*.445+space*(n+.5);
      const bw=Math.max(.06,space*.79),bd=bayDepth*.68;
      const z=0;
      if(cfg.kind==='plastic')crate(bx,surfaceY+.027,z,bw,capH,bd,l,s);
      else carton(bx,surfaceY+.027,z,bw,capH,bd,l,s,filled?shared.cardboard:shared.cardboardLight);
    }
  };
  // Modelos diseñados en Furniture Builder: mismas piezas y cotas en espacio 3D.
  const customModel=(appState.models||[]).find(m=>m.id===rack.modelId);
  if(customModel?.furniture?.enabled && Array.isArray(customModel.furniture.pieces) && customModel.furniture.pieces.length){
    const f=customModel.furniture;
    const finishColors={oak:0xcda579,white:0xe9e8e2,walnut:0x826046,graphite:0x4f5357};
    const board=new THREE.MeshStandardMaterial({color:finishColors[f.finish]||finishColors.oak,roughness:.76,metalness:.025});
    const powder=new THREE.MeshStandardMaterial({color:0x59656c,roughness:.49,metalness:.65});
    const renderPieces=customModel.furniture.pieces;
    const mw=Math.max(1,Number(customModel.width||spec.width)),md=Math.max(1,Number(customModel.depth||spec.depth));
    const physicalScaleX=spec.width/mw,physicalScaleD=spec.depth/md,physicalScaleH=spec.height/Math.max(1,Number(customModel.height||spec.height));
    renderPieces.forEach(p=>{
      const px=Number(p.x||0),py=Number(p.y||0),pz=Number(p.z||0),pw=Math.max(.1,Number(p.w||1)),pd=Math.max(.1,Number(p.d||1)),ph=Math.max(.1,Number(p.h||1));
      const metalPiece=f.material==='metal'||(f.material==='metal-wood' && ['post','beam','brace'].includes(p.type));
      const mat=metalPiece?powder:board;
      const cx=((px+pw/2)*physicalScaleX-spec.width/2)/100;
      const cy=((pz+ph/2)*physicalScaleH)/100;
      const cz=((py+pd/2)*physicalScaleD-spec.depth/2)/100;
      if(p.type==='brace'){
        const ex=Number.isFinite(Number(p.x2))?Number(p.x2):px+pw, ez=Number.isFinite(Number(p.z2))?Number(p.z2):pz+ph;
        const dx=(ex-px)*physicalScaleX/100,dy=(ez-pz)*physicalScaleH/100;
        const length=Math.max(.01,Math.hypot(dx,dy));
        const midX=((px+ex)/2*physicalScaleX-spec.width/2)/100;
        const midY=((pz+ez)/2*physicalScaleH)/100;
        const mesh=part(midX,midY,cz,length,Math.max(.008,pd/100),Math.max(.008,pd/100),powder);
        mesh.rotation.z=Math.atan2(dy,dx);
      }else{
        part(cx,cy,cz,Math.max(.004,pw*physicalScaleX/100),Math.max(.004,ph*physicalScaleH/100),Math.max(.004,pd*physicalScaleD/100),mat);
      }
    });
    if(selected){
      // El resaltado se dibuja separado de las mallas: no modifica pintura ni veta del mueble.
      const boundary=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2],[-w/2,-d/2]];
      const geo=new THREE.BufferGeometry().setFromPoints(boundary.map(([x,z])=>new THREE.Vector3(x,.022,z)));
      const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0x15a889,depthTest:false}));
      line.renderOrder=8;group.add(line);
      sign(spec.title,0,spec.height/100+.12,0,Math.min(1.6,Math.max(.4,w*.9)));
    }
    return;
  }
  const frame=Math.max(.023,Math.min(.047,w*.025));
  if(spec.kind==='rack'){
    // Industrial shelving: powder-coated posts, cross-bracing and oak decks.
    for(const xx of [-w/2+frame/2,w/2-frame/2]) for(const zz of [-d/2+frame/2,d/2-frame/2]){
      part(xx,h/2,zz,frame,h,frame,metal);
      for(let i=1;i<Math.min(13,Math.round(h/.19));i++)part(xx,h*i/Math.min(13,Math.round(h/.19)),zz+(zz>0?.002:-.002),.014,.019,.009,shared.hole);
    }
    const pitch=(h-.26)/Math.max(1,spec.levels);
    for(let l=1;l<=spec.levels;l++){
      const sy=.13+(l-1)*pitch;
      part(0,sy-.015,0,w-.015,.065,d-.012,shared.wood,l,0);
      part(0,sy-.067,d/2-.015,w-.04,.046,.026,metal,l,0);
      part(0,sy-.067,-d/2+.015,w-.04,.046,.026,metal,l,0);
      for(let s=1;s<=spec.slots;s++){
        const bayW=(w-.055)/spec.slots, bayX=-w/2+.027+(s-.5)*bayW;
        slotContents(l,s,sy+.018,bayW,d,bayX);
      }
      // La posición por nivel se consulta en el inspector, sin carteles sobre las repisas.
    }
    // Rear diagonal bracing, slim enough to preserve visibility.
    const braceLength=Math.hypot(h-.20,w-.18);
    for(const side of [-1,1]){
      const brace=part(0,h/2,-d/2+.017,.022,braceLength,.021,shared.metalDark);
      brace.rotation.z=side*Math.atan2(w-.18,h-.20);
    }
    sign(spec.title,0,h+.14,0,Math.min(.9,Math.max(.4,w*.64)));
  }else if(spec.kind==='vitrina'){
    const base=Math.min(.52,h*.29),topY=base,glassH=h-base;
    // Wooden storage plinth with drawer lines.
    part(0,base/2,0,w,base,d,shared.woodDark);
    part(0,base*.60,d/2+.009,w*.90,.012,.01,shared.woodLight);
    for(let i=1;i<3;i++)part(-w/2+w*i/3,base*.53,d/2+.014,.012,base*.63,.012,shared.metalDark);
    for(const xx of [-w/2+frame/2,w/2-frame/2]) for(const zz of [-d/2+frame/2,d/2-frame/2]) part(xx,base+glassH/2,zz,frame,glassH,frame,shared.metalDark);
    part(0,h,0,w+.035,.045,d+.035,shared.metalDark);
    const pitch=(glassH-.13)/Math.max(1,spec.levels);
    for(let l=1;l<=spec.levels;l++){
      const sy=base+.07+(l-1)*pitch;
      part(0,sy,0,w-.06,.023,d-.05,shared.glassShelf,l,0);
      for(let s=1;s<=spec.slots;s++){
        const bayW=(w-.065)/spec.slots;
        slotContents(l,s,sy+.017,bayW,d*.83,-w/2+.032+(s-.5)*bayW);
      }
      sign(`N${l}`,-w/2-.095,sy+.055,d/2,.20);
    }
    const pane=(x,y,z,bw,bh,bd)=>part(x,y,z,bw,bh,bd,shared.glass);
    pane(0,base+glassH/2,d/2-.004,w-.045,glassH-.045,.012);
    pane(0,base+glassH/2,-d/2+.004,w-.045,glassH-.045,.012);
    pane(-w/2+.006,base+glassH/2,0,.012,glassH-.045,d-.045);
    pane(w/2-.006,base+glassH/2,0,.012,glassH-.045,d-.045);
    part(0,base+glassH/2,d/2+.015,.017,glassH,frame,shared.metalDark);
    sign(spec.title,0,h+.20,0,Math.min(1.7,w));
  }else if(spec.kind==='mostrador'){
    const base=Math.max(.09,h-.08);
    part(0,base/2,0,w-.07,base,d-.065,shared.woodDark);
    part(0,h-.027,0,w+.07,.07,d+.08,shared.woodLight);
    // Retail oak-wood slat front.
    const n=vspaceClamp(Math.floor(w/.082),4,30);
    for(let i=0;i<n;i++){
      const xx=-w/2+w*(i+.5)/n;
      part(xx,base/2,d/2+.005,.024,base*.87,.018,shared.wood,0,0);
    }
    const screenW=Math.min(.38,w*.34),screenH=Math.min(.30,h*.32);
    part(-w*.18,h+.12,-d*.13,screenW,screenH,.035,shared.metalDark);
    part(-w*.18,h+.025,-d*.13,.04,.06,.045,shared.metal);
    part(w*.20,h+.016,-d*.07,.21,.035,.15,shared.paper);
    part(w*.34,h+.032,d*.17,.055,.08,.065,shared.plasticDark);
    for(let l=1;l<=spec.levels;l++){
      const sy=.13+(l-1)*(h-.23)/Math.max(1,spec.levels);
      for(let s=1;s<=spec.slots;s++){
        const bayW=(w-.14)/spec.slots;
        const bayX=-w/2+.07+(s-.5)*bayW;
        // Compartments behind the counter can also hold stock.
        part(bayX,sy,-d/2+.045,bayW*.91,.018,.055,shared.wood,l,s);
        if(products(rack,l,s).length || vspaceContainersForSlot(rack,l,s).count){
          const cfg=vspaceContainersForSlot(rack,l,s);
          const cbw=bayW*.53, cbh=Math.min(.19,h/spec.levels*.35);
          if(cfg.kind==='plastic')crate(bayX,sy+.02,-d/2+.075,cbw,cbh,.15,l,s);
          else carton(bayX,sy+.02,-d/2+.075,cbw,cbh,.15,l,s);
        }
      }
    }
    sign(spec.title,0,h+.47,0,Math.min(2,w*1.05));
  }else if(spec.kind==='contenedor'){
    // Modular open bin shelving, blue molded plastic with compartments.
    const unit=h/spec.levels;
    part(0,.045,0,w,.09,d,shared.plasticDark);
    for(let l=1;l<=spec.levels;l++){
      const y=(l-1)*unit;
      part(0,y+unit-.035,0,w,.07,d,shared.plastic);
      for(let s=1;s<=spec.slots;s++){
        const bayW=w/spec.slots, cx=-w/2+(s-.5)*bayW;
        crate(cx,y+.08,0,bayW*.87,Math.min(.28,unit*.62),d*.76,l,s);
        if(selected && selectedLevel===l && selectedSlot===s)part(cx,y+.11,d*.10,bayW*.6,.015,d*.65,shared.highlight,l,s);
      }
    }
    for(const x of [-w/2+.025,w/2-.025])part(x,h/2,0,.05,h,d,shared.plasticDark);
    sign(spec.title,0,h+.23,0,Math.min(1.9,w*1.2));
  }else if(spec.kind==='cajonera'){
    // Chest of drawers / dresser with pickable drawers and warm wooden finish.
    const shell=Math.max(.028,Math.min(.045,w*.035));
    part(0,h/2,0,w,h,d,shared.woodDark);
    part(0,h-.022,0,w+.02,.045,d+.02,shared.woodLight);
    const innerW=w-shell*2, innerH=h-.09, drawerH=innerH/spec.levels, slotGap=.018;
    for(let l=1;l<=spec.levels;l++){
      const cy=.05+drawerH*(l-.5);
      for(let s=1;s<=spec.slots;s++){
        const bayW=(innerW-slotGap*(spec.slots-1))/spec.slots;
        const cx=-innerW/2+bayW/2+(s-1)*(bayW+slotGap);
        const faceH=Math.max(.11,drawerH*.8), faceD=Math.min(.08,d*.13);
        part(cx,cy, d/2-faceD/2-.004,bayW*.96,faceH,faceD,shared.wood,l,s);
        part(cx,cy, d/2-faceD+.002,bayW*.62,.012,.018,shared.metalDark,l,s);
        part(cx,cy-faceH*.42,d/2-faceD/2-.003,bayW*.92,.008,.006,shared.woodLight,l,s);
        if(selected && selectedLevel===l && selectedSlot===s)part(cx,cy,d/2+.004,bayW*.82,.012,.012,shared.highlight,l,s);
        const cfg=vspaceContainersForSlot(rack,l,s);
        if(cfg.count||products(rack,l,s).length){
          const bayDepth=d*.62; const sy=cy-faceH*.33;
          if(cfg.kind==='plastic')crate(cx,Math.max(.03,sy),-d*.08,bayW*.72,Math.min(.19,drawerH*.52),bayDepth*.62,l,s);
          else carton(cx,Math.max(.03,sy),-d*.08,bayW*.72,Math.min(.19,drawerH*.52),bayDepth*.62,l,s,products(rack,l,s).length?shared.cardboard:shared.cardboardLight);
        }
      }
    }
    for(const x of [-w/2+shell/2,w/2-shell/2]) part(x,h/2,0,shell,h,d,shared.woodDark);
    sign(spec.title,0,h+.20,0,Math.min(1.9,w*1.15));
  }else{
    carton(0,0,0,w,h,d,1,1,shared.cardboard);
    sign(spec.title,0,h+.17,0,Math.min(1.55,w*1.4));
  }
  // Thin selected outline on the floor: does not obstruct selection or shelf contents.
  if(selected){
    const vertices=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2],[-w/2,-d/2]];
    const geo=new THREE.BufferGeometry().setFromPoints(vertices.map(([x,z])=>new THREE.Vector3(x,.021,z)));
    const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0x0e947b,depthTest:false}));
    group.add(line);
  }
}
