# Avatar Studio Whole-Render Mock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected cutout-layer prototype with a visual mock whose preview always uses a single approved whole-character render.

**Architecture:** The mock has two neutral opaque base characters. A catalog entry resolves to one verified whole-character render keyed by base and look; the browser never composites hair, clothing, headwear, or accessories above a portrait. Future production will use author-authored 3D meshes and a compatibility manifest, but this mock only presents approved complete renders.

**Tech Stack:** Static HTML, CSS, JavaScript, optimized local raster preview assets, Python static server.

---

### Task 1: Remove the false compositing model

**Files:**
- Modify: `prototypes/avatar-studio/index.html`
- Test: `tests/avatar_studio_visual_mock_contract.test.ts`

- [ ] **Step 1: Write the failing contract**

```ts
expect(html).not.toContain('hair-overlay');
expect(html).not.toContain('headwear-overlay');
expect(html).not.toContain('accessory-overlay');
expect(html).toContain('wholeRenderSrc');
```

- [ ] **Step 2: Verify the contract fails**

Run: `node -e "const h=require('fs').readFileSync('prototypes/avatar-studio/index.html','utf8'); if(h.includes('hair-overlay')) process.exit(1)"`

Expected: exit code 1.

- [ ] **Step 3: Render one image only**

```js
function wholeRenderSrc(base, look) {
  return `./assets/whole-renders/${base}-${look}.png`;
}
portrait.src = wholeRenderSrc(state.base, state.look);
```

- [ ] **Step 4: Verify the contract passes**

Run: `node -e "const h=require('fs').readFileSync('prototypes/avatar-studio/index.html','utf8'); if(h.includes('hair-overlay')||!h.includes('wholeRenderSrc')) process.exit(1)"`

Expected: exit code 0.

### Task 2: Establish two approved neutral bases

**Files:**
- Create: `prototypes/avatar-studio/assets/whole-renders/boy-neutral.png`
- Create: `prototypes/avatar-studio/assets/whole-renders/girl-neutral.png`
- Modify: `prototypes/avatar-studio/index.html`

- [ ] **Step 1: Generate only safe, neutral base renders**

Generate a full-body, non-sexual, premium stylized 3D boy and girl separately on a warm white studio background. Both wear identical opaque fitted neutral base suits; no hair, headwear, accessories, or fashion clothing.

- [ ] **Step 2: Visually inspect each render**

Reject any image with cropped limbs, added apparel, face distortion, inconsistent body proportions, visible lettering, or a non-white/cream background.

- [ ] **Step 3: Add base chooser behaviour**

```js
const BASES = [
  { id: 'boy', label: 'Мальчик', render: 'boy-neutral' },
  { id: 'girl', label: 'Девочка', render: 'girl-neutral' },
];
```

- [ ] **Step 4: Verify in browser**

At 375 px wide, each base button changes the central preview to a whole-image render without any overlay element in the DOM.

### Task 3: Add only validated whole-look variants

**Files:**
- Create: `prototypes/avatar-studio/assets/whole-renders/<base>-<look>.png`
- Modify: `prototypes/avatar-studio/index.html`
- Test: `tests/avatar_studio_visual_mock_contract.test.ts`

- [ ] **Step 1: Define an explicit compatibility manifest**

```js
const LOOKS = Object.freeze([
  { id: 'neutral', base: 'boy', render: 'boy-neutral', slots: {} },
  { id: 'neutral', base: 'girl', render: 'girl-neutral', slots: {} },
]);
```

- [ ] **Step 2: Add a variant only when it is a full render**

Each entry must have an actual `render` file. Do not create a selectable catalog tile that uses a partial crop or overlay source.

- [ ] **Step 3: Visually verify each addition**

Check complete character framing, face coherence, body silhouette, clothing fit, hair/headwear relationship, and accessory placement in the browser before retaining the asset.

- [ ] **Step 4: Verify catalog integrity**

Run: `node scripts/avatar-dna/check-whole-render-catalog.mjs`

Expected: `whole_render_catalog=PASS` and zero missing files.

### Task 4: Keep interaction instant and asset growth bounded

**Files:**
- Create: `scripts/avatar-dna/check-whole-render-catalog.mjs`
- Modify: `prototypes/avatar-studio/index.html`

- [ ] **Step 1: Preload only displayed base previews**

```js
for (const src of ['boy-neutral', 'girl-neutral']) {
  const image = new Image();
  image.src = wholeRenderSrc('', src).replace('/-', '/');
}
```

- [ ] **Step 2: Use fixed intrinsic portrait sizing**

The preview container keeps its dimensions while the next image fades over 180 ms; no waiting state or layout shift is shown.

- [ ] **Step 3: Verify accessibility and motion**

All selectors have 44 px minimum targets, visible selected state, descriptive image alt text, and `prefers-reduced-motion` disables the fade.

- [ ] **Step 4: Verify manually**

Open `http://localhost:64110/` at 375 px width. Switch repeatedly between bases; verify no overlaid image elements, no overflow, and no delayed first interaction after preload.
