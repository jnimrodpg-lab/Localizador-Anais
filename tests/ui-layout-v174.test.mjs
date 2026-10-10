import fs from 'node:fs';
import assert from 'node:assert/strict';
const src=fs.readFileSync('src/frontend/60-layout-editor.js','utf8');
const bundle=fs.readFileSync('public/assets/app-main.runtimefix.js','utf8');
const css=fs.readFileSync('public/assets/styles/v174-workspace.css','utf8');
for(const [name,text] of [['fuente',src],['bundle',bundle]]) {
  for(const pattern of [/\bVer en 3D\b/i,/btnOpenLayout3D/,/ctx-open-3d/]) assert.doesNotMatch(text,pattern,`${name}: acceso 3D del layout retirado`);
}
assert.match(src,/id="btnToggleSections"/);
assert.doesNotMatch(src,/btnToggleSectionVisibility/,'Sin botones duplicados de sección');
assert.match(css,/height:118px!important;min-height:118px!important/);
assert.match(src,/const groundY = height - 20/,'Visores de sección respetan relación de aspecto');
assert.match(src,/id="btnZoomIn"/,'Conservar zoom CAD');
assert.match(src,/id="btnSaveLayoutVisible"/,'Conservar guardar CAD');
console.log('V174: no hay Ver en 3D del layout; secciones, zoom y guardado permanecen disponibles.');
