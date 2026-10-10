import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('public/assets/styles/v173-workspace.css','utf8');
const core = fs.readFileSync('src/frontend/60-layout-editor.js','utf8');
const source = fs.readFileSync('src/frontend/30-admin-sync.js','utf8');
const styleIndex = fs.readFileSync('public/assets/app.css','utf8');
const html = fs.readFileSync('public/index.html','utf8');

assert.match(html,/WMS Industrial V173/,'La versión entregable debe ser V173');
assert.match(html,/wms-v173-structural-ui/,'Versionado de assets para evitar cache antiguo');
assert.ok(styleIndex.trimEnd().endsWith("@import url('./styles/v173-workspace.css');"), 'Workspace CSS debe tener precedencia');
assert.match(core,/id="btnToggleSections"/,'Botón visible para activar secciones');
assert.match(core,/id="btnToggleSectionVisibility"/,'Botón para ocultar desde secciones');
assert.match(core,/<\/div>\s*<div id="layoutSectionWrap" class="v80-section-floating"/, 'Las secciones deben ser hermanas del canvas, no contenerse dentro de él');
assert.match(core,/grid-template-columns/,'Se debe conservar el editor de layout');
assert.match(css,/--sidebar-w:236px/,'El sidebar debe tener medida única en ambos temas');
assert.match(css,/#layoutSectionWrap \.layout-section-body\.layout-section-grid/,'Secciones X/Y necesitan columnas explícitas');
assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important/,'Las secciones deben presentarse en horizontal');
assert.match(css,/body\[data-screen="virtual"\] #appRoot\.app \.vspace-root/,'Espacio 3D expansible');
assert.match(source,/company-branches-panel company-branches-shell/,'Sucursales sin wrapper genérico negro');
assert.ok(!fs.readFileSync('public/assets/styles/v170-stability.css','utf8').includes('v80-section-floating .layout-section-grid{grid-template-columns:1fr!important}'),'No deben reintroducirse secciones verticales forzadas');
assert.ok(!fs.readFileSync('public/assets/styles/v170-refinement.css','utf8').includes('stroke:rgba(255,250,243,.96)!important'),'Sin halo blanco en etiquetas CAD');
console.log('OK V173: paneles completos, temas dimensionales, secciones horizontales, sidebar estable y sucursales sin marco negro.');
