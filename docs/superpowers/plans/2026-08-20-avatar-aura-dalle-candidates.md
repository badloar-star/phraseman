# Avatar Aura DALL·E Candidates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate three layered DALL·E candidates for each of ten ordinary catalog aura slots and present all thirty candidates in an animated browser mockup for user selection.

**Architecture:** Use Codex built-in image generation to produce one transparent 3×3 sprite sheet per aura slot. A deterministic Sharp-based pipeline crops each sheet into `base`, `flow`, and `accents` layers, validates alpha and geometry, and builds a local HTML gallery that overlays and animates the layers around one neutral avatar on light and dark surfaces.

**Tech Stack:** Codex built-in `image_gen`, Node.js, Sharp, HTML/CSS, JSON manifests, existing visual-companion server.

---

## File Structure

- Create: `.codex-tmp/avatar-aura-candidates/manifest.json` — slot briefs, prompts, source paths, crop paths, and validation state.
- Create: `.codex-tmp/avatar-aura-candidates/pipeline.mjs` — crop, validate, and gallery generation commands.
- Create: `.codex-tmp/avatar-aura-candidates/sources/*.png` — ten built-in DALL·E sprite sheets.
- Create: `.codex-tmp/avatar-aura-candidates/crops/<slot>/<variant>-<layer>.webp` — ninety preview layers.
- Create: `.superpowers/brainstorm/1700-1787223064/content/aura-candidates-generated.html` — animated selection gallery.
- Modify: none under `assets/images/**` until the user selects winners.

### Task 1: Create the candidate manifest and deterministic workspace

**Files:**
- Create: `.codex-tmp/avatar-aura-candidates/manifest.json`

- [ ] **Step 1: Write the manifest with ten distinct slots**

Use this exact slot inventory. Names are working labels for selection and do not become localized product copy yet.

```json
{
  "version": 1,
  "sheetLayout": { "columns": ["a", "b", "c"], "rows": ["base", "flow", "accents"] },
  "slots": [
    { "id": "polar-orbit", "palette": ["#42E8FF", "#6C7BFF", "#C58BFF"], "form": "broken orbital light bands" },
    { "id": "solar-ribbon", "palette": ["#FFE28A", "#FF9B68", "#FF6F91"], "form": "one broad luminous ribbon" },
    { "id": "jade-current", "palette": ["#B8FFE3", "#39D5AE", "#42BFE8"], "form": "liquid current loop" },
    { "id": "velvet-eclipse", "palette": ["#E7B4FF", "#9A6DFF", "#5366E8"], "form": "soft eclipse crescents" },
    { "id": "rose-plasma", "palette": ["#FFD1E6", "#F56EAD", "#EF6B72"], "form": "plasma arcs with a soft core" },
    { "id": "prism-fold", "palette": ["#65EEFF", "#9D7CFF", "#F58DCA"], "form": "folded spectral light planes" },
    { "id": "lagoon-helix", "palette": ["#78F4E2", "#49A9FF", "#FFE09A"], "form": "two intertwined aquatic arcs" },
    { "id": "sunset-vector", "palette": ["#FF7B96", "#FFB06A", "#7D7FF2"], "form": "asymmetric vector sweep" },
    { "id": "ice-halo", "palette": ["#E6FAFF", "#75D7FF", "#9AABFF"], "form": "frosted translucent halo segments" },
    { "id": "lime-pulse", "palette": ["#D9FF85", "#63E6B5", "#55CBE7"], "form": "clean pulse wave around a ring" }
  ]
}
```

### Task 2: Generate and approve one pilot DALL·E element sheet

**Files:**
- Create: `.codex-tmp/avatar-aura-candidates/sources/polar-orbit.png`
- Modify: `.codex-tmp/avatar-aura-candidates/manifest.json`

- [ ] **Step 1: Read the image-generation prompt guidance**

Read completely:

```text
C:/Users/badlo/.codex/skills/.system/imagegen/references/prompting.md
C:/Users/badlo/.codex/skills/.system/imagegen/references/sample-prompts.md
```

- [ ] **Step 2: Generate the pilot through built-in image generation**

Use one built-in `image_gen` call with no image references and this exact prompt,
substituting the pilot palette and form from the manifest:

```text
Use case: stylized-concept
Asset type: transparent sprite sheet for an animated mobile avatar aura
Primary request: create nine separate luminous aura elements in a perfectly aligned 3-column by 3-row sprite sheet. Columns are three distinct variants A, B, C of one aura. Rows are: top = base ring/light mass, middle = moving flow ribbon/arc, bottom = sparse accent lights. The aura concept is broken orbital light bands. Palette: #42E8FF, #6C7BFF, #C58BFF.
Composition: square sheet, equal cells, generous transparent gutters, every element centred on the same open circular safe area, no element crosses its cell, no grid lines.
Style/medium: polished modern Phraseman mobile-game cosmetic, luminous translucent WebP-ready raster art, broad readable silhouette, restrained premium glow.
Constraints: genuinely transparent background and alpha; open empty centre for a face; no avatar; no text; no labels; no UI; no opaque panels; no watermark; no letters; no symbols; no fantasy heraldry; no wings; no weapons; no gems; no random confetti; no dense particle cloud; no rainbow strip construction.
Variant distinction: A organic continuous arcs; B precise geometric orbital segments; C balanced organic-geometric hybrid.
Layer distinction: base is persistent and nearly circular; flow has clear directional motion and incomplete arcs; accents contain only 4-8 small isolated highlights.
```

- [ ] **Step 3: Save the built-in result into the ignored source folder**

Copy the generated result from Codex's generated-images location to:

```text
.codex-tmp/avatar-aura-candidates/sources/polar-orbit.png
```

Do not move or copy it into `assets/images/**`.

- [ ] **Step 4: Inspect the pilot before generating the remaining nine sheets**

Use local image inspection. Pass only if the sheet has nine isolated elements,
a transparent background, an open centre, visible gutters, and three clearly
different columns. If it fails, make one targeted prompt correction and replace
only the pilot source.

### Task 3: Generate the remaining nine element sheets

**Files:**
- Create: `.codex-tmp/avatar-aura-candidates/sources/<slot>.png`
- Modify: `.codex-tmp/avatar-aura-candidates/manifest.json`

- [ ] **Step 1: Generate one sheet per remaining manifest slot**

Repeat the approved pilot prompt through nine separate built-in `image_gen`
calls. For each call, replace only the concept form and three palette values.
Keep layout, transparency, safe-area, layer, and avoid constraints unchanged.

- [ ] **Step 2: Persist every result immediately**

After each call, copy the output to the exact manifest source path and record:

```json
{
  "source": ".codex-tmp/avatar-aura-candidates/sources/<slot>.png",
  "generator": "codex-built-in-imagegen",
  "status": "generated"
}
```

- [ ] **Step 3: Check the ten-source gate**

Run:

```powershell
Get-ChildItem .codex-tmp/avatar-aura-candidates/sources -Filter *.png | Measure-Object
```

Expected: `Count : 10`.

### Task 4: Create the crop, validation, and gallery pipeline

**Files:**
- Create: `.codex-tmp/avatar-aura-candidates/pipeline.mjs`
- Create: `.codex-tmp/avatar-aura-candidates/crops/<slot>/*.webp`
- Create: `.superpowers/brainstorm/1700-1787223064/content/aura-candidates-generated.html`

- [ ] **Step 1: Write the complete deterministic pipeline**

Create the file with this complete implementation:

````js
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const ROOT = path.resolve('.codex-tmp/avatar-aura-candidates');
const CONTENT = path.resolve('.superpowers/brainstorm/1700-1787223064/content');
const ASSETS = path.join(CONTENT, 'aura-candidate-assets');
const GALLERY = path.join(CONTENT, 'aura-candidates-generated.html');
const VARIANTS = ['a', 'b', 'c'];
const LAYERS = ['base', 'flow', 'accents'];
const manifest = JSON.parse(await fs.readFile(path.join(ROOT, 'manifest.json'), 'utf8'));

async function cropSheet(slot) {
  const source = path.join(ROOT, 'sources', `${slot.id}.png`);
  const meta = await sharp(source).metadata();
  if (!meta.width || !meta.height || !meta.hasAlpha) {
    throw new Error(`${slot.id}: source alpha or dimensions missing`);
  }
  const xs = [0, Math.floor(meta.width / 3), Math.floor(meta.width * 2 / 3), meta.width];
  const ys = [0, Math.floor(meta.height / 3), Math.floor(meta.height * 2 / 3), meta.height];
  const outDir = path.join(ROOT, 'crops', slot.id);
  await fs.mkdir(outDir, { recursive: true });
  for (let row = 0; row < LAYERS.length; row += 1) {
    for (let col = 0; col < VARIANTS.length; col += 1) {
      const output = path.join(outDir, `${VARIANTS[col]}-${LAYERS[row]}.webp`);
      await sharp(source)
        .extract({ left: xs[col], top: ys[row], width: xs[col + 1] - xs[col], height: ys[row + 1] - ys[row] })
        .webp({ quality: 78, alphaQuality: 90 })
        .toFile(output);
    }
  }
}

function expectedCrops(slot) {
  return VARIANTS.flatMap((variant) => LAYERS.map((layer) => ({
    variant,
    layer,
    file: path.join(ROOT, 'crops', slot.id, `${variant}-${layer}.webp`),
  })));
}

async function verifyAll() {
  let verified = 0;
  for (const slot of manifest.slots) {
    let expectedSize = null;
    for (const item of expectedCrops(slot)) {
      const meta = await sharp(item.file).metadata();
      const size = `${meta.width}x${meta.height}`;
      if (meta.format !== 'webp' || !meta.hasAlpha || !meta.width || !meta.height) {
        throw new Error(`${slot.id}/${item.variant}-${item.layer}: invalid WebP alpha or dimensions`);
      }
      expectedSize ??= size;
      if (size !== expectedSize) throw new Error(`${slot.id}: inconsistent crop size ${size} versus ${expectedSize}`);
      verified += 1;
    }
  }
  console.log(`verified ${verified}/90 layered aura elements`);
}

function card(slot, variant) {
  const prefix = `aura-candidate-assets/${slot.id}/${variant}`;
  const layers = ['base', 'flow', 'accents'].map((layer) =>
    `<img class="layer ${layer}" src="${prefix}-${layer}.webp" alt="">`).join('');
  return `<button class="candidate" type="button" data-slot="${slot.id}" data-variant="${variant}" onclick="selectAura(this)">
    <span class="variant">${variant.toUpperCase()}</span>
    <span class="previews"><span class="preview dark">${layers}<i class="avatar">PM</i></span><span class="preview light">${layers}<i class="avatar">PM</i></span></span>
  </button>`;
}

async function linkAssets() {
  await fs.rm(ASSETS, { recursive: true, force: true });
  await fs.mkdir(ASSETS, { recursive: true });
  for (const slot of manifest.slots) {
    const targetDir = path.join(ASSETS, slot.id);
    await fs.mkdir(targetDir, { recursive: true });
    for (const item of expectedCrops(slot)) {
      await fs.link(item.file, path.join(targetDir, `${item.variant}-${item.layer}.webp`));
    }
  }
}

async function buildGallery() {
  await linkAssets();
  const groups = manifest.slots.map((slot, index) => `<section class="aura-group">
    <header><span>AURA ${String(index + 1).padStart(2, '0')}</span><h2>${slot.id.replaceAll('-', ' ')}</h2><p>${slot.form}</p></header>
    <div class="variants-grid">${VARIANTS.map((variant) => card(slot, variant)).join('')}</div>
  </section>`).join('');
  const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phraseman Aura Candidates</title><style>
  :root{color-scheme:dark;--bg:#080c12;--panel:#111923;--line:#29384d;--text:#f4f8ff;--muted:#9baabd;--cyan:#38e9ff;--lime:#b8ff43}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 50% -5%,#1a2c43,#0a111a 42%,var(--bg));color:var(--text);font-family:Inter,Segoe UI,Arial,sans-serif}main{width:min(1180px,calc(100% - 28px));margin:auto;padding:34px 0 64px}.eyebrow{color:var(--cyan);font-size:12px;font-weight:900;letter-spacing:.15em}h1{font-size:clamp(30px,5vw,48px);margin:10px 0}.lead{color:var(--muted);line-height:1.55}.aura-group{border:1px solid var(--line);background:#101823d9;border-radius:24px;padding:18px;margin-top:16px}.aura-group header span{color:var(--cyan);font-size:11px;font-weight:900}.aura-group h2{margin:5px 0;text-transform:capitalize}.aura-group header p{margin:0;color:var(--muted)}.variants-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:14px}.candidate{position:relative;border:1px solid #2d3d54;background:#0d141e;color:var(--text);border-radius:18px;padding:11px;cursor:pointer}.candidate.selected{border-color:var(--lime);box-shadow:0 0 0 2px #b8ff4328}.variant{position:absolute;top:10px;left:10px;z-index:8;background:#1b293c;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:900}.previews{display:grid;grid-template-columns:1fr 1fr;gap:8px}.preview{position:relative;aspect-ratio:1;border-radius:14px;overflow:hidden;display:grid;place-items:center}.preview.dark{background:#080d14}.preview.light{background:#eef3f8}.layer{position:absolute;width:90%;height:90%;object-fit:contain}.base{animation:breathe 6.4s ease-in-out infinite}.flow{animation:turn 21s linear infinite}.accents{animation:reverseTurn 14s linear infinite,twinkle 3.8s ease-in-out infinite}.preview.light .layer{animation:none}.avatar{position:relative;z-index:6;width:38%;height:38%;border-radius:50%;display:grid;place-items:center;background:#172337;border:2px solid #fff;color:#dceaff;font-style:normal;font-weight:900}.summary{position:sticky;bottom:12px;margin-top:20px;border:1px solid #415774;background:#101823ef;border-radius:16px;padding:13px;color:#d9e5f3;backdrop-filter:blur(12px)}body.paused .layer{animation-play-state:paused}@keyframes breathe{0%,100%{transform:scale(.98);opacity:.8}50%{transform:scale(1.025);opacity:1}}@keyframes turn{to{transform:rotate(360deg)}}@keyframes reverseTurn{to{transform:rotate(-360deg)}}@keyframes twinkle{0%,100%{opacity:.38}50%{opacity:1}}@media(prefers-reduced-motion:reduce){.layer{animation:none!important}}@media(max-width:760px){.variants-grid{grid-template-columns:1fr}.candidate{max-width:420px;width:100%;margin:auto}}
  </style></head><body><main><div class="eyebrow">PHRASEMAN · DALL·E LAYER LAB</div><h1>Выберите A, B или C для каждой ауры</h1><p class="lead">Слева анимация на тёмном фоне, справа статичный силуэт на светлом.</p>${groups}<div id="summary" class="summary">Выбрано 0 из 10</div></main><script>
  const choices = JSON.parse(localStorage.getItem('phraseman-aura-choices') || '{}');
  function renderChoices(){document.querySelectorAll('.candidate').forEach((el)=>el.classList.toggle('selected',choices[el.dataset.slot]===el.dataset.variant));const count=Object.keys(choices).length;document.getElementById('summary').textContent='Выбрано '+count+' из 10'+(count?' · '+JSON.stringify(choices):'');localStorage.setItem('phraseman-aura-choices',JSON.stringify(choices));}
  function selectAura(el){choices[el.dataset.slot]=el.dataset.variant;renderChoices();}
  document.addEventListener('visibilitychange',()=>document.body.classList.toggle('paused',document.hidden));renderChoices();
  </script></body></html>`;
  await fs.writeFile(GALLERY, html, 'utf8');
  console.log('generated 30 candidate cards');
}

const command = process.argv[2];
if (command === 'crop') {
  for (const slot of manifest.slots) await cropSheet(slot);
} else if (command === 'verify') {
  await verifyAll();
} else if (command === 'gallery') {
  await buildGallery();
} else {
  throw new Error('usage: node pipeline.mjs <crop|verify|gallery>');
}
````

- [ ] **Step 2: Run the crop command and check the file count**

Run:

```powershell
node .codex-tmp/avatar-aura-candidates/pipeline.mjs crop
Get-ChildItem .codex-tmp/avatar-aura-candidates/crops -Recurse -Filter *.webp | Measure-Object
```

Expected: `Count : 90`.

- [ ] **Step 3: Run alpha and geometry verification**

Run:

```powershell
node .codex-tmp/avatar-aura-candidates/pipeline.mjs verify
```

Expected: `verified 90/90 layered aura elements`.

### Task 5: Build the animated 30-candidate browser mockup

**Files:**
- Read: `.codex-tmp/avatar-aura-candidates/pipeline.mjs`
- Create: `.superpowers/brainstorm/1700-1787223064/content/aura-candidates-generated.html`

- [ ] **Step 1: Run gallery generation**

Run:

```powershell
node .codex-tmp/avatar-aura-candidates/pipeline.mjs gallery
```

Expected: `generated 30 candidate cards`.

- [ ] **Step 2: Confirm the gallery contains all cards and linked assets**

Run:

```powershell
rg -o 'class="candidate"' .superpowers/brainstorm/1700-1787223064/content/aura-candidates-generated.html | Measure-Object
Get-ChildItem .superpowers/brainstorm/1700-1787223064/content/aura-candidate-assets -Recurse -Filter *.webp | Measure-Object
```

Expected: `Count : 30` and `Count : 90`.

### Task 6: Verify and hand off selection

**Files:**
- Read: `.superpowers/brainstorm/1700-1787223064/content/aura-candidates-generated.html`
- Read: `.superpowers/brainstorm/1700-1787223064/state/events`

- [ ] **Step 1: Run the deterministic gates**

Run:

```powershell
node .codex-tmp/avatar-aura-candidates/pipeline.mjs verify
rg -o 'data-slot="[^"]+"' .superpowers/brainstorm/1700-1787223064/content/aura-candidates-generated.html | Measure-Object
```

Expected: `verified 90/90 layered aura elements` and `Count : 30`.

- [ ] **Step 2: Visually inspect the generated gallery**

Check the current visual-companion URL at 375 and 1024 pixels. Verify no layer
clips, no avatar face is covered, every slot has A/B/C, dark and light previews
are readable, and reduced motion produces a stable representative frame.

- [ ] **Step 3: Ask the user to choose one variant per slot**

The selection handoff lists the ten final choices in this stable form:

```json
{
  "polar-orbit": "a",
  "solar-ribbon": "b",
  "jade-current": "c"
}
```

Do not copy any candidate into `assets/images/**` or modify the live aura catalog
until all ten selections are confirmed.
