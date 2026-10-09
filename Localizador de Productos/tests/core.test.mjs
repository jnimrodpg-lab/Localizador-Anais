import assert from 'node:assert/strict';
import {demoState,normalizeState,spec,validPosition,locationCode} from '../public/app/data.js';
const state=normalizeState(demoState());const l=state.branchLayouts[0];assert.equal(l.racks.length,3);assert.equal(spec(l.racks[0]).levels,4);assert.equal(locationCode(l.racks[0],1,2),'R01-N1-P2');assert.ok(validPosition({...l.racks[0],x:900},l));assert.equal(validPosition(l.racks[0],l),null);console.log('OK: estructura de datos, niveles, posiciones y validación de colisiones');
