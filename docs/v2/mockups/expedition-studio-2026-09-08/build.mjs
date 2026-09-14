import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const dir=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(dir,'../../../..');
// Read exact app palettes at build time, without loading React Native at runtime.
const cache = new Map();
function loadThemeModule(file) {
  if (cache.has(file)) return cache.get(file);
  const module = { exports: {} };
  cache.set(file, module.exports);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const localRequire = name => name === 'react-native' ? {Platform:{OS:'ios',select:x=>x.ios??x.default}} : loadThemeModule(path.resolve(path.dirname(file), `${name}.ts`));
  vm.runInNewContext('(function(require,module,exports){'+source+'\n})', {})(localRequire,module,module.exports);
  return module.exports;
}
const themeModule=loadThemeModule(path.join(root,'constants/theme.ts'));
const themeKeys={dark:'DARK',gold:'GOLD',olive:'OLIVE',midnight:'MIDNIGHT',ember:'EMBER',aurora:'AURORA',volt:'VOLT',indigo:'INDIGO',sagePorcelain:'SAGE_PORCELAIN'};
const appThemes=Object.fromEntries(Object.entries(themeKeys).map(([k,v])=>[k,themeModule[v]]));
const restored=fs.readFileSync(path.join(dir,'restored-atlas.js'),'utf8');
const script=`const APP_THEMES=${JSON.stringify(appThemes)};\n`+restored+'\n'+fs.readFileSync(path.join(dir,'expedition.js'),'utf8');
new vm.Script(script);
let html=fs.readFileSync(path.join(dir,'index.html'),'utf8').replace('<script src="expedition.js"></script>',`<script>${script}</script>`);
html=html.replace('@@restored-css@@',fs.readFileSync(path.join(dir,'restored-atlas.css'),'utf8'));
html=html.replace('@@practice-css@@',fs.readFileSync(path.join(dir,'practice-viewport.css'),'utf8'));
for(const [key,file,mime] of [
 ['font','assets/fonts/Inter-Regular.ttf','font/ttf'],
 ['rune','assets/images/level-spin-rewards/stars_10.webp','image/webp'],
 ['medal','assets/images/levels/zoloto.webp','image/webp'],
 ['journal','docs/v2/mockups/expedition-studio-2026-09-08/art/expedition-journal-simple.webp','image/webp'],
]) html=html.replaceAll(`@@${key}@@`,`data:${mime};base64,${fs.readFileSync(path.join(root,file)).toString('base64')}`);
if(/@@\w+@@/.test(html))throw new Error('Unresolved asset');
new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
fs.writeFileSync(path.join(dir,'standalone.html'),html);
console.log(`PASS: standalone ${(Buffer.byteLength(html)/1024).toFixed(0)} KB, embedded font and artwork, JavaScript syntax.`);
