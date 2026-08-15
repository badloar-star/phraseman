import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const HERE = dirname(fileURLToPath(import.meta.url));
const S = (p) => readFileSync(join(HERE, p), 'utf8');
const slug = process.argv[2];
const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Phraseman</title>
<style>${S('_shared/duel.css')}</style></head><body>
<div class="top"><h1 id="title"></h1><p id="sub"></p></div>
<div class="dock">
  <button class="btn pri" id="play">▶ Проиграть все</button>
  <button class="btn" id="loop">Цикл</button>
  <div class="seg" id="speed"><button data-s="1" class="on">1×</button><button data-s="0.5">0.5×</button><button data-s="0.25">0.25×</button></div>
  <div class="seg" id="themes"></div>
</div>
<div id="row"></div>
<div id="codewrap"><div class="codebox"><div id="codeh"></div><button id="closecode">✕</button><pre id="codebody"></pre></div></div>
<script>${S('_shared/engine.js')}</script>
<script>${S('_shared/bases.js')}</script>
<script>${S(`duels/${slug}.js`)}</script>
<script>${S('_shared/duel.js')}</script>
<script>(function(){const s=document.createElement('style');s.textContent=BASE_CSS+(DUEL.css||'');document.head.appendChild(s);})();</script>
</body></html>`;
const out = join(HERE, 'dist');
if (!existsSync(out)) mkdirSync(out, { recursive: true });
writeFileSync(join(out, `phraseman-${slug}.html`), html);
console.log('✓', join(out, `phraseman-${slug}.html`), (html.length/1024).toFixed(0)+' KB');
