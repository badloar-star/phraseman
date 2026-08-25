# Avatar Quality Repair and Value Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair every defective active avatar and expand the standalone showroom from 43 to 63 independently generated dark/light pairs with a clear 50–1000 pearl value ladder.

**Architecture:** Keep the project-local collection under `.codex-tmp/avatar-20-one-by-one/independent` and leave production app/economy code untouched. Replace destructive color-wide extraction with edge-connected background removal, validate alpha structure automatically, and use built-in image generation one asset at a time with genuine transparency and a strict one-subject contract. The manifest remains the source of truth for both validators and the standalone HTML showcase.

**Tech Stack:** Node.js ESM, Sharp, Node test runner, built-in `image_gen`, standalone HTML/CSS/JavaScript.

---

### Task 1: Make background extraction non-destructive

**Files:**
- Create: `scripts/avatar-100/normalize-master.test.mjs`
- Modify: `scripts/avatar-100/normalize-master.mjs`

- [ ] **Step 1: Write a failing regression test for enclosed magenta and pale foreground**

Create synthetic 96 × 96 RGBA fixtures in memory. One fixture has a transparent edge and a solid magenta square in the center; the other has a light-neutral edge, a dark outline, and a pale-neutral center. Call `removeBorderBackground`, then assert that edge alpha becomes zero while the center alpha remains 255.

```js
import assert from 'node:assert/strict';
import test from 'node:test';
import { removeBorderBackground } from './normalize-master.mjs';

test('preserves magenta foreground disconnected from the border', () => {
  const data = makeFixture({ edge: [255, 0, 255, 255], center: [210, 40, 205, 255] });
  const output = removeBorderBackground(data, 96, 96);
  assert.equal(output[(48 * 96 + 48) * 4 + 3], 255);
  assert.equal(output[3], 0);
});
```

- [ ] **Step 2: Run the regression test and confirm the current global deletion fails**

Run: `node --test scripts/avatar-100/normalize-master.test.mjs`

Expected: FAIL because the center magenta foreground currently receives alpha 0.

- [ ] **Step 3: Remove global chroma deletion and export the focused helper**

Change the final alpha loop to clear only pixels marked by the edge flood and export `removeBorderBackground` for focused testing.

```js
export function removeBorderBackground(data, width, height) {
  // existing edge flood
  const output = Buffer.from(data);
  for (let index = 0; index < pixelCount; index += 1) {
    if (background[index]) output[index * 4 + 3] = 0;
  }
  return output;
}
```

- [ ] **Step 4: Run the focused test**

Run: `node --test scripts/avatar-100/normalize-master.test.mjs`

Expected: PASS for transparent, chroma, pale-neutral, and already-transparent fixture cases.

### Task 2: Add structural image-quality gates

**Files:**
- Create: `.codex-tmp/avatar-20-one-by-one/independent/validate-visual-integrity.mjs`
- Create: `.codex-tmp/avatar-20-one-by-one/independent/visual-integrity-report.json`

- [ ] **Step 1: Implement alpha-component and safe-margin analysis**

For every active PNG, decode RGBA with Sharp and record: visible bounds, minimum transparent margin, significant connected components, second-largest component pixels, transparent holes inside the foreground envelope, suspicious thin components, and total visible pixels. Treat alpha above 10 as foreground and ignore antialias components smaller than 20 pixels.

- [ ] **Step 2: Add collection assertions**

Reject an image when any visible pixel touches the 24 px safe margin, a secondary component exceeds 20 pixels, a thin detached component exceeds 12 pixels, or the file metadata is not 512 × 512 RGBA. Report hole counts as review evidence rather than blindly failing every natural opening.

- [ ] **Step 3: Run the audit over pairs 41–83**

Run: `node .codex-tmp/avatar-20-one-by-one/independent/validate-visual-integrity.mjs --from 41 --to 83`

Expected: a non-zero exit code for known damaged files and a JSON report naming every structural suspect.

### Task 3: Preserve and replace every defective current variant

**Files:**
- Modify: `.codex-tmp/avatar-20-one-by-one/independent/avatar-41/**` through `avatar-83/**` only where QA fails
- Create: `.codex-tmp/avatar-20-one-by-one/independent/rejected-v2/<avatar-number>/**`
- Modify: `.codex-tmp/avatar-20-one-by-one/independent/collection-manifest.json`

- [ ] **Step 1: Build full before-repair review sheets**

Run the priced overview builder and inspect every pair at card and enlarged size. Combine manual findings with the structural report; mandatory review includes 42 light, 46 light, 48 light, 50 light, both 67 variants, both 69 variants, both 72 variants, 70 light, 78 light, and 83 dark.

- [ ] **Step 2: Back up every rejected active file**

Copy the raw PNG plus active PNG/WebP for each rejected variant into `rejected-v2/avatar-NN/<variant>/` before replacement. Preserve filenames and add `reason.txt` containing the observed defect.

- [ ] **Step 3: Generate each replacement as one independent transparent asset**

Use one built-in image generation call per variant. Every prompt must request a 1:1 premium stylized collectible, genuine transparent background, one organic non-human subject, 15% clear margin, complete anatomy, one connected composition, and no text, border, base, shadow plate, detached decoration, particles, smoke, or watermark. The dark and light prompts must specify different poses, lighting, palettes, and material arrangements.

- [ ] **Step 4: Normalize and compress each accepted replacement**

Copy the generated master into the avatar folder, normalize to 512 × 512, then save PNG and WebP (quality 68–76, alpha preserved) using the established pair filenames. Keep each WebP below 50 KB without destroying fine edges.

- [ ] **Step 5: Re-run structural QA and manually inspect repaired review sheets**

Expected: all active pairs 41–83 pass structural gates and no manual review defect remains.

### Task 4: Define the 20 new collectible pairs

**Files:**
- Modify: `.codex-tmp/avatar-20-one-by-one/independent/collection-manifest.json`

- [ ] **Step 1: Add seven legendary 300-pearl concepts numbered 84–90**

Add manta ray, snow owl, black panther, kingfisher, sea turtle, red fox, and crane concepts. Use gold-accented connected inlays and iconic poses without crowns, medals, bases, or detached effects.

- [ ] **Step 2: Add ten mythic 500-pearl concepts numbered 91–100**

Add glass octopus, orchid mantis, resplendent quetzal, mandarin fish, albino peacock, arctic wolf, emperor moth, blue dragon sea slug, saiga antelope, and sailfish. Use platinum structure, spectral aurora, multi-layer depth, and luminous detail embedded in anatomy.

- [ ] **Step 3: Add three apex 1000-pearl concepts numbered 101–103**

Add humpback whale, Bengal tiger, and wandering albatross. Use black-diamond depth, full-spectrum internal light, supreme natural silhouette, and the highest coherent craftsmanship without mechanical or heraldic language.

- [ ] **Step 4: Verify uniqueness and tier counts in memory**

Expected manifest counts: `{ "50": 10, "70": 10, "100": 10, "150": 10, "300": 10, "500": 10, "1000": 3 }` with no duplicate number or slug.

### Task 5: Generate 40 new images sequentially

**Files:**
- Create: `.codex-tmp/avatar-20-one-by-one/independent/avatar-84/**` through `avatar-103/**`

- [ ] **Step 1: Generate avatars 84–90 one variant at a time**

For each manifest concept, generate dark then light in separate built-in calls. Normalize, validate, and inspect the dark image before requesting the light image; inspect the completed pair before advancing to the next number.

- [ ] **Step 2: Generate avatars 91–100 one variant at a time**

Apply the same checkpoint flow with the 500-pearl mythic signature. Reject any detached aurora, false limb, cropped fin/wing/tail, or ambiguous silhouette.

- [ ] **Step 3: Generate avatars 101–103 one variant at a time**

Apply the apex signature while keeping the subject entirely natural and readable. Reject mere color upgrades; each result must show stronger connected material depth and iconic composition.

- [ ] **Step 4: Produce final pair assets and verify independence**

Expected per pair: dark raw master, light raw master, two normalized PNGs, two compressed WebPs, distinct hashes, and a passing visual-integrity record.

### Task 6: Extend the validator and overview sheets

**Files:**
- Modify: `.codex-tmp/avatar-20-one-by-one/independent/validate-priced.mjs`
- Modify: `.codex-tmp/avatar-20-one-by-one/independent/build-priced-overview.mjs`
- Create: `.codex-tmp/avatar-20-one-by-one/independent/verification-priced-41-103.json`

- [ ] **Step 1: Change the priced range and exact expectations**

Validate numbers 41–103, 63 entries, 252 final PNG/WebP files, 63 independent pairs, and exact price counts of 10/10/10/10/10/10/3.

- [ ] **Step 2: Add 500 and 1000 overview styling**

Add `МИФИЧЕСКИЕ` with platinum/spectral accent and `ВЕРШИНА` with black-diamond/full-spectrum accent. Generate review pages in groups of at most five pairs.

- [ ] **Step 3: Run both tools**

Run:

```powershell
node .codex-tmp/avatar-20-one-by-one/independent/build-priced-overview.mjs
node .codex-tmp/avatar-20-one-by-one/independent/validate-priced.mjs
```

Expected: overview sheets for all seven tiers and validator summary with 63 pairs, 252 checked final files, 63 independent pairs, and zero failures.

### Task 7: Upgrade the standalone showroom

**Files:**
- Modify: `.codex-tmp/avatar-20-one-by-one/independent/showcase/index.html`

- [ ] **Step 1: Extend content and filtering to seven tiers**

Update hero statistics to 63 pairs, 126 independent generations, seven levels, and 50–1000 pearls. Add 500 and 1000 filter buttons, tier metadata, price order, exact counts, and the 63-entry load assertion.

- [ ] **Step 2: Make higher tiers visibly more prestigious**

Keep the restrained dark showroom. Give 500 platinum structural borders with spectral highlights and 1000 a black-diamond double frame with full-spectrum edge light and stronger depth. Preserve equal image scale across tiers so value comes from artwork and craftsmanship rather than artificial enlargement.

- [ ] **Step 3: Preserve accessibility and responsive behavior**

Retain 44 px controls, dark foreground on bright green fills, visible `:focus-visible`, meaningful alt text, `aria-pressed`, reduced-motion behavior, explicit image dimensions, lazy loading, and no horizontal page overflow.

- [ ] **Step 4: Reload the existing local showcase and inspect it**

Expected: seven visible sections, exact card counts, no missing images, stable 375/768/1024/1440 layouts, and progressively stronger 300/500/1000 presentation.

### Task 8: Final acceptance verification

**Files:**
- Verify only; do not modify production application files.

- [ ] **Step 1: Run focused automated gates**

Run:

```powershell
node --test scripts/avatar-100/normalize-master.test.mjs
node .codex-tmp/avatar-20-one-by-one/independent/validate-visual-integrity.mjs --from 41 --to 103
node .codex-tmp/avatar-20-one-by-one/independent/validate-priced.mjs
```

Expected: all commands exit 0.

- [ ] **Step 2: Inspect every final overview sheet**

Confirm no clipping, transparent holes in valid artwork, detached fragments, broken anatomy, generation artifacts, robots, machines, people, or recolored duplicate pairs.

- [ ] **Step 3: Verify the browser-rendered showroom**

Check all image requests, filter counts, keyboard activation, focus visibility, reduced motion, and viewport widths 375, 768, 1024, and 1440. Capture a final screenshot for delivery.

- [ ] **Step 4: Confirm scope boundaries**

Verify that only the avatar tooling, ignored collection/showcase artifacts, and this documentation were changed by this task; production app and economy behavior remain untouched.
