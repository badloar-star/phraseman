# Avatar Alpha Repair and Predator Ladder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair every damaged avatar variant in the active 63-pair collection and make the 300/500/1000 tiers read as progressively stronger predators and primordial super-beings.

**Architecture:** Replace pale-color guessing with edge-connected saturated-matte extraction, then run structural and visual QA across all 126 active WebPs. Regenerate only failed variants, one built-in image generation at a time, using independent light/dark prompts and a strict rarity ladder; preserve IDs, prices, asset paths, and showcase inventory.

**Tech Stack:** Node.js ESM, Sharp, Node test runner, Jest/ts-jest, built-in Codex image generation, static HTML showcase.

---

## File map

- Modify `scripts/avatar-100/normalize-master.mjs`: non-destructive saturated-matte extraction and explicit legacy mode.
- Modify `scripts/avatar-100/finalize-independent-variant.mjs`: finalize one independently generated variant through the safe extraction mode.
- Modify `scripts/avatar-100/normalize-master.test.mjs`: pixel-level regression tests for pale anatomy and saturated matte removal.
- Modify `tests/avatar_100_master_normalize.test.ts`: CLI-level regression for 512 px output, safe bounds, and preserved white detail.
- Create `scripts/avatar-100/build-alpha-audit.mjs`: reproducible contact sheets and JSON diagnostics for all active variants.
- Create `tests/avatar_100_alpha_audit.test.ts`: contract for audit outputs and active ID coverage.
- Modify `scripts/avatar-100/build-prompts.mjs`: independent dark/light prompt contract, saturated matte requirement, and predator tier language.
- Modify `tests/avatar_100_prompts.test.ts`: prompt contract for 300/500/1000 and prohibited rainbow/mechanical/human content.
- Replace only failing files under `admin/v2/avatars/custom-idea-{63..125}-{black|white}.webp`.
- Refresh `showcase/index.html` only if tier copy or cache-busting is required; keep exactly 63 cards and 126 image references.
- Write ignored QA artifacts to `.codex-tmp/avatar-audit-v2/`.

### Task 1: Lock the extraction regression in tests

**Files:**
- Modify: `scripts/avatar-100/normalize-master.test.mjs`
- Modify: `tests/avatar_100_master_normalize.test.ts`

- [ ] **Step 1: Add a failing pixel-level test for white anatomy on a saturated matte**

Add a fixture whose border is saturated magenta, whose centered subject is pale neutral, and whose antialiased edge contains near-white pixels. Assert that matte pixels become alpha `0` while the pale center and edge remain alpha `255`.

```js
test('removes a saturated edge matte without eroding pale foreground anatomy', () => {
  const data = rgbaCanvas(9, 9, [236, 0, 160, 255]);
  fillRect(data, 9, 2, 2, 5, 5, [247, 244, 238, 255]);
  setPixel(data, 9, 2, 4, [252, 250, 247, 255]);

  const output = removeBorderBackground(data, 9, 9, { mode: 'saturated-matte' });

  assert.equal(alphaAt(output, 9, 0, 0), 0);
  assert.equal(alphaAt(output, 9, 2, 4), 255);
  assert.equal(alphaAt(output, 9, 4, 4), 255);
});
```

- [ ] **Step 2: Make the checkerboard regression explicitly legacy-only**

Change existing neutral checkerboard calls to:

```js
removeBorderBackground(data, WIDTH, HEIGHT, { mode: 'legacy-neutral' });
```

This prevents the legacy heuristic from remaining the default for new assets.

- [ ] **Step 3: Add a failing CLI regression**

Generate a 512 px PNG with a flat saturated matte and a pale subject, run `normalize-master.mjs`, then assert the output center stays opaque and the surrounding canvas becomes transparent.

- [ ] **Step 4: Run the tests and confirm RED**

Run:

```powershell
node --test scripts/avatar-100/normalize-master.test.mjs
```

Expected: FAIL because `removeBorderBackground` does not yet accept safe extraction modes.

### Task 2: Implement saturated edge-matte extraction

**Files:**
- Modify: `scripts/avatar-100/normalize-master.mjs`
- Modify: `scripts/avatar-100/finalize-independent-variant.mjs`

- [ ] **Step 1: Add extraction modes and saturated border sampling**

Introduce:

```js
const BACKGROUND_MODES = new Set(['saturated-matte', 'legacy-neutral']);

function saturation(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

function sampleSaturatedBorderMatte(data, width, height) {
  const samples = borderPixels(data, width, height)
    .filter(({ r, g, b, alpha }) => alpha > 10 && saturation(r, g, b) >= 0.5);
  if (samples.length === 0) return null;
  return medianRgb(samples);
}

function matchesMatte(r, g, b, matte) {
  return matte !== null
    && saturation(r, g, b) >= 0.35
    && Math.max(Math.abs(r - matte.r), Math.abs(g - matte.g), Math.abs(b - matte.b)) <= 52;
}
```

`removeBorderBackground` must continue to flood-fill from the canvas edge, but `saturated-matte` mode may remove only transparent pixels and pixels matching the sampled saturated matte. It must never classify pale neutral pixels as background.

- [ ] **Step 2: Keep legacy neutral extraction explicit**

Use the old neutral-grid predicate only when `mode === 'legacy-neutral'`. Default `normalizeMaster` to `saturated-matte`.

```js
export async function normalizeMaster({
  inputPath,
  outputPath,
  backgroundMode = 'saturated-matte',
}) { /* ... */ }
```

- [ ] **Step 3: Add the CLI option**

Accept optional `--background-mode saturated-matte|legacy-neutral`, defaulting to `saturated-matte`, and reject any other value with a clear error.

- [ ] **Step 4: Route independent variants through safe mode**

In `finalize-independent-variant.mjs` call:

```js
await normalizeMaster({
  inputPath,
  outputPath: pngPath,
  backgroundMode: 'saturated-matte',
});
```

- [ ] **Step 5: Run the extraction tests and confirm GREEN**

Run:

```powershell
node --test scripts/avatar-100/normalize-master.test.mjs
```

Expected: all tests PASS.

### Task 3: Build a reproducible 126-image audit

**Files:**
- Create: `scripts/avatar-100/build-alpha-audit.mjs`
- Create: `tests/avatar_100_alpha_audit.test.ts`

- [ ] **Step 1: Write the failing audit contract test**

The test creates four temporary sample assets, invokes the audit script with `--input-dir`, `--start`, `--end`, `--out-dir`, and `--json`, and asserts:

```ts
expect(report).toMatchObject({ checked: 4, missing: [], rejected: [] });
expect(report.entries.map((entry: { id: number; variant: string }) => [entry.id, entry.variant]))
  .toEqual([[63, 'black'], [63, 'white'], [64, 'black'], [64, 'white']]);
expect(fs.existsSync(path.join(outDir, 'tier-50-alpha-audit.png'))).toBe(true);
```

- [ ] **Step 2: Run the contract and confirm RED**

Acquire the shared Jest slot, run only the new test, then release it:

```powershell
bash .claude/semaphore/slot.sh acquire "jest avatar alpha audit"
npx jest tests/avatar_100_alpha_audit.test.ts --runInBand
bash .claude/semaphore/slot.sh release
```

Expected: FAIL because the audit script does not exist.

- [ ] **Step 3: Implement the audit script**

For every expected ID/variant:

- verify readable 512 × 512 alpha WebP;
- calculate visible bounds, opaque-pixel count, edge contact, internal transparent component count, and detached foreground component count;
- render the subject on a split intended/diagnostic-magenta tile;
- produce one contact sheet per price tier;
- write machine-readable JSON with `checked`, `missing`, `rejected`, `entries`, and explicit rejection reasons.

The script must write only under the requested output directory and must not mutate active assets.

- [ ] **Step 4: Run the audit contract and confirm GREEN**

Run the same focused Jest command with the semaphore. Expected: PASS.

- [ ] **Step 5: Audit the active collection**

Run:

```powershell
node scripts/avatar-100/build-alpha-audit.mjs --input-dir admin/v2/avatars --start 63 --end 125 --out-dir .codex-tmp/avatar-audit-v2 --json .codex-tmp/avatar-audit-v2/report.json
```

Expected: `checked=126`, `missing=0`, seven tier sheets written. Review every sheet at original resolution and add `manualStatus: pass|regenerate` plus a concise reason to the ignored review manifest.

### Task 4: Lock the approved art direction into prompts

**Files:**
- Modify: `scripts/avatar-100/build-prompts.mjs`
- Modify: `tests/avatar_100_prompts.test.ts`

- [ ] **Step 1: Add failing prompt assertions**

Assert that every generated prompt contains:

```ts
expect(prompt).toContain('flat saturated chroma matte');
expect(prompt).toContain('full silhouette with empty margin on all four sides');
expect(prompt).toContain('independent generation');
expect(prompt).toContain('no human, humanoid, robot, machine, vehicle, text, pedestal, or detached ornament');
```

Assert tier language:

```ts
expect(prompt300).toContain('recognizable real apex predator');
expect(prompt500).toContain('aggressive mythical apex predator');
expect(prompt1000).toContain('primordial non-humanoid super-being');
expect(prompt1000).toContain('no rainbow or generic full-spectrum treatment');
```

- [ ] **Step 2: Run the prompt test and confirm RED**

Use the shared Jest slot and run `npx jest tests/avatar_100_prompts.test.ts --runInBand`. Expected: FAIL on the new contract strings.

- [ ] **Step 3: Implement variant and tier prompt blocks**

Dark and light prompts must differ in pose, lighting, material, and composition. Both must demand exactly one centered organic non-human subject, coherent anatomy, full safe silhouette, no detached effects, and a solid saturated matte color excluded from the subject palette.

Tier blocks:

- 300: recognizable real apex predator; gold/obsidian craft; controlled iconic pose;
- 500: aggressive mythical apex predator; heavier silhouette; organic/mineral armor, horns, fangs, claws, or attached elemental anatomy; platinum/deep-crimson signature;
- 1000: primordial non-humanoid super-being; unique coherent anatomy; immense mass and restrained void/cosmic energy; black-diamond signature; no rainbow.

- [ ] **Step 4: Run the prompt test and confirm GREEN**

Expected: focused prompt suite PASS.

### Task 5: Regenerate failed variants one at a time

**Files:**
- Replace only: `admin/v2/avatars/custom-idea-{id}-{black|white}.webp` entries marked `regenerate`
- Write intermediates: `.codex-tmp/avatar-regeneration-v2/{id}/{variant}/`

- [ ] **Step 1: Create a checkpointed regeneration queue**

Write `.codex-tmp/avatar-regeneration-v2/queue.json` from the manual review manifest. Each entry contains `id`, `variant`, `price`, `subject`, `reason`, `promptPath`, `status`, `sourcePath`, `finalPath`, and SHA-256 receipt.

- [ ] **Step 2: Generate exactly one queued image with built-in image generation**

Use the corresponding prompt file. Do not call any project/user OpenAI API key. Do not request multiple outputs in one call.

- [ ] **Step 3: Export and normalize immediately**

Preserve the raw built-in result in the ignored per-item directory, then run:

```powershell
node scripts/avatar-100/finalize-independent-variant.mjs --input <raw-image> --index <id> --variant <black|white> --out-dir .codex-tmp/avatar-regeneration-v2/<id>/<variant>/final
```

- [ ] **Step 4: Validate before replacing the active file**

Run the asset validator on the single final WebP and inspect it on intended and diagnostic backgrounds. Reject any crop, pale hole, anatomy defect, detached fragment, text, mechanical part, or tier mismatch.

- [ ] **Step 5: Preserve the old asset and promote the passing replacement**

Copy the prior active WebP to `.codex-tmp/avatar-regeneration-v2/rejected-originals/` with its SHA-256 in the queue receipt, then replace only the exact active target. Never delete the preserved original.

- [ ] **Step 6: Mark the queue item complete and advance to the next single image**

Repeat Steps 2–6 sequentially. After a bounded set of built-in generations, export/verify session image results and compact before continuing, per the Codex bulk-image safety rule.

### Task 6: Verify the repaired collection and showcase

**Files:**
- Modify only if required: `showcase/index.html`
- Test: `tests/avatar_100_asset_validator.test.ts`
- Test: `tests/avatar_showcase_html_contract.test.ts`
- Test: `tests/custom_avatar_asset_alignment.test.ts`

- [ ] **Step 1: Run full active-asset validation**

```powershell
node scripts/avatar-100/validate-assets.mjs admin/v2/avatars --json .codex-tmp/avatar-audit-v2/final-validation.json
```

Expected for IDs 63–125: 126 checked, 0 rejected.

- [ ] **Step 2: Rebuild and inspect final contact sheets**

Run `build-alpha-audit.mjs` again into `.codex-tmp/avatar-audit-v2/final/`. Inspect all seven tier sheets at original resolution; no pink intrusion may appear inside valid pale anatomy.

- [ ] **Step 3: Verify the value ladder without labels**

Create shuffled and grayscale comparison sheets for 300/500/1000. Confirm 300 reads as real legendary predators, 500 as heavier/aggressive mythical apex predators, and 1000 as unique primordial super-beings.

- [ ] **Step 4: Run focused repository contracts**

Acquire the shared Jest slot, run only:

```powershell
npx jest tests/avatar_100_asset_validator.test.ts tests/avatar_showcase_html_contract.test.ts tests/custom_avatar_asset_alignment.test.ts --runInBand
```

Release the slot in `finally`/after the command. Expected: all focused suites PASS.

- [ ] **Step 5: Browser verification**

Open `showcase/index.html` through the existing local server. Verify 63 cards, 126 loaded images, zero broken images, working price filters, no horizontal overflow at 375 px, and readable 300/500/1000 hierarchy.

### Task 7: Release checkpoint

**Files:**
- No source changes unless deployment configuration is already part of the approved asset surface.

- [ ] **Step 1: Record exact changed asset paths and hashes**

Write an ignored release manifest containing old/new SHA-256, file size, ID, variant, price, and validation status for every replaced file.

- [ ] **Step 2: Confirm static-only deployment scope**

Deployment may include only the intended avatar WebPs and required static showcase/admin-hosting files. It must not overwrite unrelated dirty `admin/v2/legacy.html` edits or touch functions, Firestore, economy, or production app logic.

- [ ] **Step 3: Publish only after the local final gate is green**

Use the existing isolated staging procedure for Firebase Hosting target `admin`, preserving the live `legacy.html` byte-for-byte. Re-fetch representative and changed asset URLs and verify HTTP 200 plus matching SHA-256.

- [ ] **Step 4: Do not create a branch, worktree, or commit without explicit owner instruction**

The repository is shared and dirty. Preserve all unrelated user/session changes and hand off the exact verification evidence instead of bundling unrelated work.
