# 39 New Avatar Auras Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate, normalize, animate, and present 39 wholly new Phraseman avatar auras without reusing any rejected aura artwork.

**Architecture:** Four DALL·E guide atlases each hold up to ten auras; every aura occupies three adjacent cells for `base`, `flow`, and `accents`. A deterministic Sharp pipeline converts the returned atlas background to alpha, splits 117 cells, applies one centered uniform scale per aura, verifies geometry, and embeds the WebPs into the existing local final-gallery URL.

**Tech Stack:** Built-in Codex image generation, Node.js ESM, Sharp, node:test, HTML/CSS animations, local Python static server.

---

### Task 1: Collection manifest and atlas guides

**Files:**
- Create: `.codex-tmp/avatar-aura-v2/collection.json`
- Create: `.codex-tmp/avatar-aura-v2/build-guides.mjs`
- Create: `.codex-tmp/avatar-aura-v2/pipeline.test.mjs`

- [ ] **Step 1: Write a failing manifest test**

Assert exactly 39 unique IDs, 37 `ordinary`, one `plus`, one `pro`, eight audience families, three layer names, and four atlas assignments containing no more than ten auras each.

- [ ] **Step 2: Run the manifest test and observe failure**

Run: `node --test .codex-tmp/avatar-aura-v2/pipeline.test.mjs`

Expected: FAIL because `collection.json` and guides do not exist.

- [ ] **Step 3: Add the complete manifest**

Encode the 39 approved names, audience families, palettes, silhouette prompts, motion recipes, tiers, atlas number, and slot triplet. IDs use lowercase kebab-case and no old aura ID may appear.

- [ ] **Step 4: Build four 6×6 guide PNGs**

Create 1536×1536 guide images with fixed grid lines and triplet labels. Each aura receives three horizontally adjacent square cells; unused cells are explicitly marked empty.

- [ ] **Step 5: Run the manifest/guide tests**

Expected: PASS with `39 auras, 117 layer cells, 4 guides`.

### Task 2: Generate the four source atlases

**Files:**
- Create: `.codex-tmp/avatar-aura-v2/generated/atlas-01.png`
- Create: `.codex-tmp/avatar-aura-v2/generated/atlas-02.png`
- Create: `.codex-tmp/avatar-aura-v2/generated/atlas-03.png`
- Create: `.codex-tmp/avatar-aura-v2/generated/atlas-04.png`
- Create: `.codex-tmp/avatar-aura-v2/generated/prompts.json`

- [ ] **Step 1: Generate atlas 01 from guide 01**

Use the built-in image generator in edit mode. Preserve the 6×6 grid; fill only assigned cells. Each triplet must depict one coherent aura as separate base, flow, and accents elements on black/transparent background.

- [ ] **Step 2: Inspect and save atlas 01**

Reject any result with merged cells, avatars, text inside art, flat-clipped forms, or elements touching dividers. Copy the accepted output immediately to the workspace.

- [ ] **Step 3: Repeat for atlases 02–04**

Use each atlas's exact collection prompt. Save every accepted source before starting the next generation so large base64 results are not accumulated without checkpoints.

- [ ] **Step 4: Persist prompts**

Write the final four prompts and output filenames to `generated/prompts.json`.

### Task 3: Deterministic extraction and geometry gates

**Files:**
- Create: `.codex-tmp/avatar-aura-v2/pipeline.mjs`
- Modify: `.codex-tmp/avatar-aura-v2/pipeline.test.mjs`
- Create: `.codex-tmp/avatar-aura-v2/layers/<aura-id>/{base,flow,accents}.webp`

- [ ] **Step 1: Write failing extraction tests**

Assert 117 unique 320×320 alpha WebPs, at least 20 px transparent padding, center offset ≤1.5 px, rotation radius ≤145 px, and zero edge pixels above alpha 8.

- [ ] **Step 2: Run the extraction tests and observe failure**

Expected: FAIL because normalized layer files do not exist.

- [ ] **Step 3: Implement alpha restoration and cell splitting**

Convert only near-black connected background to alpha, crop inside each grid divider, and retain the generated RGB pixels unchanged.

- [ ] **Step 4: Implement set normalization**

Measure all three layers together, calculate their common center and maximum radius, then apply one translation and one uniform scale to the complete triplet. Do not independently distort layers.

- [ ] **Step 5: Export WebPs and run geometry tests**

Expected: PASS with `117/117 layers verified`.

### Task 4: Replacement animated gallery

**Files:**
- Create: `.codex-tmp/avatar-aura-v2/gallery.mjs`
- Modify: `.superpowers/brainstorm/2027-1787226456/content/aura-final-gallery.html`
- Modify: `.codex-tmp/avatar-aura-v2/pipeline.test.mjs`

- [ ] **Step 1: Write failing gallery tests**

Assert exactly 39 aura cards, 117 unique embedded payloads used twice each, 37 ordinary cards, one Plus card, one Pro card, hex avatar points, reduced-motion CSS, and absence of every rejected aura payload and name.

- [ ] **Step 2: Run the gallery tests and observe failure**

Expected: FAIL because the existing URL still contains the rejected gallery.

- [ ] **Step 3: Build the responsive gallery**

Use the dark vibrant Phraseman surface with accessible text, audience-family filters, dark animated and light static previews, visible focus states, and responsive layouts at 375/768/1024/1440 px. Animate `base` by breathing, `flow` by circular rotation, and `accents` by counter-rotation plus opacity.

- [ ] **Step 4: Replace the old mock at the existing URL**

Write the generated self-contained HTML to `.superpowers/brainstorm/2027-1787226456/content/aura-final-gallery.html`. The old artwork remains unreferenced and is not rendered.

- [ ] **Step 5: Run gallery tests**

Expected: PASS with `39 cards, 117 unique layers, rejected set absent`.

### Task 5: Visual verification and delivery

**Files:**
- Create: `.codex-tmp/avatar-aura-v2/verification.json`

- [ ] **Step 1: Run the focused automated suite**

Run: `node --test .codex-tmp/avatar-aura-v2/pipeline.test.mjs`

Expected: all tests PASS.

- [ ] **Step 2: Run focused lint**

Run: `npx eslint --no-ignore .codex-tmp/avatar-aura-v2/*.mjs`

Expected: exit code 0.

- [ ] **Step 3: Inspect representative cards**

Open the existing local gallery URL and inspect at least one aura from every audience family plus Plus and Pro on dark and light backgrounds.

- [ ] **Step 4: Check animation geometry**

Pause rotation at multiple angles and confirm circular motion, stable center, no frame collision, no clipping, and no neighboring fragments.

- [ ] **Step 5: Save verification evidence and present the mock**

Record counts, geometry maxima, test commands, and representative IDs in `verification.json`; reload the user's open gallery tab and present the completed collection.

