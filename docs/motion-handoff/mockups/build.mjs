import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const HERE = dirname(fileURLToPath(import.meta.url));
const S = (p) => readFileSync(join(HERE, p), 'utf8');

const engine = S('_shared/engine.js');
const bases  = S('_shared/bases.js');
const shell  = S('_shared/shell.js');
const css    = S('_shared/shell.css');

const slug = process.argv[2];
if (!slug) { console.error('usage: node build.mjs <design-slug>'); process.exit(1); }
const design = S(`designs/${slug}.js`);

const html = `<!DOCTYPE html>
<html lang="ru"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Phraseman — макеты</title>
<style>
${css}
/* ── базовые экраны ── */
BASE_CSS_SLOT
/* ── дизайн ── */
DESIGN_CSS_SLOT
</style>
</head><body>
<div class="app">
  <aside class="nav">
    <div class="nav-head"></div>
    <div class="srch"><input id="q" placeholder="Поиск поверхности…" autocomplete="off"></div>
    <div class="list"></div>
  </aside>
  <section class="stage">
    <div class="stage-top"></div>
    <div class="stage-body"><div class="phone"><div class="screen"></div><div class="notch"></div></div></div>
    <div class="tl"></div>
    <div class="dock">
      <button class="btn pri" id="replay">▶ Проиграть <span style="opacity:.6;font-weight:600">Space</span></button>
      <button class="btn" id="loop"><span>Цикл</span></button>
      <div class="seg" id="speed">
        <button data-s="1" class="on">1×</button><button data-s="0.5">0.5×</button><button data-s="0.25">0.25×</button>
      </div>
      <div class="seg" id="themes"></div>
      <button class="btn" id="codebtn">Код RN</button>
    </div>
  </section>
  <aside class="code"><div class="code-h"></div><pre></pre></aside>
</div>
<script>
${engine}
</script>
<script>
${bases}
</script>
<script>
${design}
</script>
<script>
${shell}
</script>
<script>
(function(){ const s=document.createElement('style'); s.textContent = (typeof BASE_CSS!=='undefined'?BASE_CSS:'') + (DESIGN.css||''); document.head.appendChild(s); })();
</script>
</body></html>`;

const out = join(HERE, 'dist');
if (!existsSync(out)) mkdirSync(out, { recursive: true });
const file = join(out, `phraseman-${slug}.html`);
writeFileSync(file, html.replace('BASE_CSS_SLOT', '').replace('DESIGN_CSS_SLOT', ''));
console.log('✓', file, (html.length / 1024).toFixed(0) + ' KB');
