import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const c={Math,Number,Array};vm.createContext(c);vm.runInContext(fs.readFileSync(new URL('../src/frontend/68-diorama-v217.js',import.meta.url),'utf8'),c);
const boundary={pts:[{x:0,y:0},{x:500,y:0},{x:500,y:300},{x:300,y:300},{x:300,y:500},{x:0,y:500}]};
const wall=(id,x1,y1,x2,y2)=>({id,x1,y1,x2,y2,thickness:12,height:290});
const outer=boundary.pts.map((p,i)=>wall('O'+i,p.x,p.y,boundary.pts[(i+1)%6].x,boundary.pts[(i+1)%6].y));
const inside=[wall('I1',200,0,200,500),wall('I2',200,250,500,250),wall('I3',5,5,250,5)];
const full=[...outer,...inside],saved=JSON.stringify(full);const result=c.v217VisibleWallParts(full,boundary);assert.deepEqual(Array.from(result,p=>p.id),['I1','I2','I3']);assert.equal(JSON.stringify(full),saved,'Display does not mutate physical walls');
assert.equal(c.v217VisibleWallParts(full,boundary,'full').length,9);assert.equal(c.v217VisibleWallParts(full,boundary,'none').length,0);
const reverse=wall('R',500,0,0,0);assert.equal(c.v217VisibleWallParts([reverse],boundary).length,0,'Reversed outside wall');
const split=wall('MIX',500,300,0,300),parts=c.v217VisibleWallParts([split],boundary);assert.equal(parts.length,1);assert.equal(parts[0].x1,300);assert.equal(parts[0].x2,0);assert.equal(parts[0].v217StartDistance,200);assert.equal(parts[0].v217SourceLength,500);
assert.equal(c.v217VisibleWallParts([inside[0]],{pts:[]}).length,1,'Missing area must not hide arbitrary walls');
// Collinear area edges with extra vertices are still one exterior interval.
const fragmented={pts:[{x:0,y:0},{x:200,y:0},{x:500,y:0},{x:500,y:400},{x:0,y:400}]};assert.equal(c.v217VisibleWallParts([wall('TOP',0,0,500,0)],fragmented).length,0);
const diagonal={pts:[{x:0,y:0},{x:500,y:0},{x:300,y:300}]};assert.equal(c.v217VisibleWallParts([wall('D',500,0,300,300)],diagonal).length,0);assert.equal(c.v217VisibleWallParts([wall('MID',250,0,300,300)],diagonal).length,1);
assert.equal(c.v217WallModeNext('diorama'),'full');assert.equal(c.v217WallModeNext('full'),'none');assert.equal(c.v217WallModeNext('none'),'diorama');
vm.runInContext('if(Math.abs(Math.sin(V217_ISO_PHI)*Math.sin(V217_ISO_THETA))+1e-9<Math.cos(V217_ISO_PHI))throw Error("Unequal isometric axes");',c);
console.log('V217 PASS: exterior vs interior, concave/diagonal/fragmented boundary, reversed axes, mixed segments, unchanged saved geometry, view modes and isometric preset.');
