import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),ts=require('typescript');
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(dir,'../../../..');
const allowed=new Set(['theme','goldTheme','oliveTheme','cinemaThemes','statsThemeChrome']);
const cache=new Map();
function readConstants(name){
  if(!allowed.has(name))throw new Error('Unexpected dependency: '+name);
  if(cache.has(name))return cache.get(name);
  const file=path.join(root,'constants',name+'.ts'),exports={};cache.set(name,exports);
  const js=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  vm.runInNewContext(js,{exports,require:ref=>{
    if(ref==='react-native')return{Platform:{OS:'android',select:o=>o.android??o.native??o.default}};
    if(!ref.startsWith('./'))throw new Error('Unexpected module: '+ref);
    return readConstants(ref.slice(2));
  }},{filename:file,timeout:2000});
  return exports;
}
const themes=readConstants('theme'),chrome=readConstants('statsThemeChrome');
const keys={dark:'DARK',gold:'GOLD',olive:'OLIVE',sagePorcelain:'SAGE_PORCELAIN',midnight:'MIDNIGHT',ember:'EMBER',aurora:'AURORA',volt:'VOLT',indigo:'INDIGO'};
const result={};
for(const [id,key] of Object.entries(keys)){
  const t=themes[key];
  result[id]={bg:chrome.statsPageField(id),surface:t.bgCard,surface2:t.bgSurface2,ink:t.textPrimary,muted:t.textMuted,accent:t.accent,'accent-ink':t.correctText,edge:t.btnShadow,danger:t.wrong,'danger-bg':t.wrongBg,gold:t.gold};
}
fs.writeFileSync(path.join(dir,'theme-tokens.js'),'window.V2_THEME_TOKENS = '+JSON.stringify(result,null,2)+';\n');
console.log('9 theme projections from app constants; no style-specific palettes.');
