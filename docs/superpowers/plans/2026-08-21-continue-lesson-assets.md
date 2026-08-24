# Continue Lesson Themed Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce approved variant-3 preview artwork for the Home “Continue Lesson” slot without touching MAX or generating removed features.

**Architecture:** Use one semantic master composition—a compact top-spiral workbook with an unfinished current page, progress dots, a horizontal pen holder, and a bookmark—then preserve that geometry across theme variants. Work remains in `.codex-tmp/theme-assets-v2/**` until visual approval and real-alpha verification; no bundled assets or static `require()` maps change in this preview phase.

**Tech Stack:** Built-in Codex `imagegen`, PNG/RGBA metadata verification with `sharp`, existing Phraseman theme palettes.

---

### Task 1: Retire the incorrect architectural previews

**Files:**
- Move: `.codex-tmp/theme-assets-v2/ember-quick-start-preview/ember-continue-lesson-transparent.png`
- Move: `.codex-tmp/theme-assets-v2/indigo-english-preview/indigo-continue-london-source.png`
- Preserve under: `.codex-tmp/theme-assets-v2/rejected-theme-previews/continue-lesson-architecture/`

- [ ] **Step 1: Confirm neither preview is referenced by app source**

Run:

```powershell
rg -n -F "ember-continue-lesson-transparent.png" app components constants hooks lib modules
rg -n -F "indigo-continue-london-source.png" app components constants hooks lib modules
```

Expected: no matches.

- [ ] **Step 2: Move only the two preview files into the recoverable rejected archive**

Expected: originals remain recoverable outside the active preview directories; no file in `assets/images/**` changes.

### Task 2: Fix the approved Ember variant-3 master

**Files:**
- Create: `.codex-tmp/theme-assets-v2/ember-quick-start-preview/ember-continue-top-spiral-workbook-approved-source.png`

- [ ] **Step 1: Generate one preview through built-in imagegen**

The prompt must require:

```text
one compact top-spiral workbook; terracotta cover folded behind a warm-ivory current page; 6-7 refined top rings; three embossed exercise lines; half-finished final line ending in an open circle; two filled progress dots and one hollow dot; pen in a horizontal lower holder; small bookmark; compact three-quarter silhouette; true transparent alpha
```

The prompt must prohibit:

```text
buildings, landmarks, books, flashcards, microphones, speakers, audio symbols, Practice/Test symbols, MAX, trophies, shields, gifts, characters, readable words, UI containers
```

- [ ] **Step 2: Verify semantic content visually**

Expected: it reads as one unfinished task at Home thumbnail size and does not read as Lessons, Practice, Test, or a destination.

- [ ] **Step 3: Verify image metadata**

Run:

```powershell
node -e "const sharp=require('sharp'); sharp(process.argv[1]).metadata().then(m=>console.log(JSON.stringify({width:m.width,height:m.height,channels:m.channels,hasAlpha:m.hasAlpha})))" ".codex-tmp/theme-assets-v2/ember-quick-start-preview/ember-continue-top-spiral-workbook-approved-source.png"
```

Expected: `channels: 4` and `hasAlpha: true`. If false, keep it as a `-source.png` preview and do not call it production-ready.

### Task 3: Generate the Indigo material variant

**Files:**
- Create: `.codex-tmp/theme-assets-v2/indigo-english-preview/indigo-continue-top-spiral-workbook-source.png`

- [ ] **Step 1: Use the accepted Ember top-spiral workbook as the strict composition reference**

Preserve workbook outline, camera angle, cover/page placement, 6-7 top rings, lifted page corner, three-line exercise layout, final open circle, two-filled-plus-one-hollow progress dots, horizontal pen holder, bookmark, padding, and visual mass. Change only to Indigo materials: deep-indigo cover, warm-ivory page, antique-silver/dark-cocoa rings, dark-indigo pen with silver hardware, muted-lavender ribbon, and lavender/indigo progress dots.

- [ ] **Step 2: Verify semantic and geometric parity**

Expected: both images are immediately recognized as the same Home slot; differences are thematic, not functional.

- [ ] **Step 3: Verify image metadata**

Run the same `sharp(...).metadata()` check as Task 2.

Expected: real RGBA alpha. A checkerboard baked into RGB or an opaque black/white background fails the gate.

### Task 4: Present previews without integration

**Files:**
- No app-source changes.
- No changes under `assets/images/**`.

- [ ] **Step 1: Show the two generated previews to the owner**

Expected: Ember and Indigo variant 3 are visible side by side or sequentially.

- [ ] **Step 2: Stop before bundling**

Integration, WebP compression, and static `require()` wiring occur only after visual approval of the variant-3 master.
