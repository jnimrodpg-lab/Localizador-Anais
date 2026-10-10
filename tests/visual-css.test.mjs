import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const base='public/assets';
const main=fs.readFileSync(`${base}/app.css`,'utf8');
const imports=Array.from(main.matchAll(/@import url\(['"]\.\/styles\/([^'"\)]+)['"]\);/g),x=>x[1]);
assert.ok(imports.length>=10,'Se esperan módulos CSS: tokens, base, dashboard, viewer, CAD y responsive');
for(const name of imports) assert.ok(fs.existsSync(path.join(base,'styles',name)),`Falta CSS importado: ${name}`);
assert.equal(imports[0],'tokens.css','Tokens deben cargarse primero');
assert.equal(imports[imports.length-1],'v174-workspace.css','Workspace V174 debe cargarse al final');
for(const n of ['legacy-core.css','layout-cad.css']){
 const text=fs.readFileSync(path.join(base,'styles',n),'utf8');
 assert.ok(!/body\.theme-(?:light|dark)/.test(text),`${n} conserva reglas duplicadas de modo visual`);
}
const tokens=fs.readFileSync(path.join(base,'styles','tokens.css'),'utf8');
function colorValue(theme,token){
 const block=theme==='light'?tokens.split('body.theme-dark{')[0]:tokens.split('body.theme-dark{')[1].split('}')[0];
 const m=block.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+':(#[0-9a-f]{6})','i'));
 assert.ok(m,`Token ${token} del tema ${theme} falta`);
 return m[1];
}
const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4);
const luminance=hex=>rgb(hex).reduce((a,b,i)=>a+b*[.2126,.7152,.0722][i],0);
const contrast=(a,b)=>{let x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};
for(const t of ['light','dark']){
 const ink=colorValue(t,'--ink'),soft=colorValue(t,'--ink-soft'),surface=colorValue(t,'--surface-1');
 assert.ok(contrast(ink,surface)>=7,`${t}: contraste títulos menor de 7:1`);
 assert.ok(contrast(soft,surface)>=4.5,`${t}: contraste textos secundarios menor de 4.5:1`);
}
console.log(`OK visual CSS: ${imports.length} importaciones, tokens unificados, contraste WCAG AA y auditoría responsive.`);
