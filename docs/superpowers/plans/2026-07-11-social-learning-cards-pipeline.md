# Social Learning Cards Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a file-based, two-slide social learning card pipeline and produce one verified pilot carousel before generating the remaining six cards.

**Architecture:** A new isolated `tools/social-learning-cards` Node ESM package reads versioned JSON manifests, imports file-based Codex/DALL-E atlases, renders deterministic 1080×1080 JPEG slides with Sharp, validates automatic and manual QA gates, and exports platform-ready packages. It reuses project conventions without modifying the existing viral carousel engine.

**Tech Stack:** Node.js 22, ESM, Sharp, Jest, JSON manifests, SVG composition, existing Codex DALL-E export workflow.

---

## File map

- Create `functions/src/contracts/social_learning_card_manifest_v1.json`: single versioned JSON Schema consumed by local and server validators.
- Create `functions/src/contracts/social_learning_card_manifest_v1.fixture.json`: shared valid fixture.
- Create `tools/social-learning-cards/src/schema.mjs`: load the versioned contract, normalize and validate manifests.
- Create `tools/social-learning-cards/src/paths.mjs`: safe repository-relative input/output paths and revision directories.
- Create `tools/social-learning-cards/src/prompts.mjs`: atlas and replacement-cell prompt builders.
- Create `tools/social-learning-cards/src/import-atlas.mjs`: atlas inspection, crop extraction and checkpoints.
- Create `tools/social-learning-cards/src/render.mjs`: deterministic layout model, SVG and learning/install JPEG renderer.
- Create `tools/social-learning-cards/src/validate.mjs`: automatic package gate and manual-QA state gate.
- Create `tools/social-learning-cards/src/package.mjs`: captions, UTM, manifest and final package writer.
- Create `tools/social-learning-cards/src/cli.mjs`: `prepare`, `import-atlas`, `render`, `validate`, `package` commands.
- Create `tools/social-learning-cards/README.md`: exact operator workflow, including Codex DALL-E safety.
- Create `content/marketing/social-learning-cards/pilot-01/cards.json`: seven-card editorial queue.
- Create `content/marketing/social-learning-cards/pilot-01/manual-qa.json`: explicit human approvals by revision.
- Create `tests/social_learning_cards_pipeline.test.ts`: schema, path, render and package contracts.
- Modify `package.json`: add narrow scripts only.
- Modify `package-lock.json`: lock the shared JSON Schema validator.
- Modify `.gitignore`: ignore raw atlases, crops, checkpoints and rendered pilot output.

### Task 1: Lock the manifest and safe path contract

**Files:**
- Create: `functions/src/contracts/social_learning_card_manifest_v1.json`
- Create: `functions/src/contracts/social_learning_card_manifest_v1.fixture.json`
- Create: `tools/social-learning-cards/src/schema.mjs`
- Create: `tools/social-learning-cards/src/paths.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `tests/social_learning_cards_pipeline.test.ts`

- [ ] **Step 1: Write failing manifest tests**

Add tests that import `validateCardManifest`, load the shared v1 fixture, and assert: `schemaVersion` is exactly `1`; six or nine unique items only; `contentId` matches `slc_[a-z0-9_]+`; revision is a positive integer; published revisions reject overwrite; surfaces and image hashes use the contract names; every item has `english`, `visualBrief`, and optional `russian`; unknown fields are rejected.

```ts
const valid = {
  schemaVersion: 1,
  contentId: 'slc_pilot_01_taste', revision: 1, status: 'copy_ready',
  campaign: 'slc_pilot_01', grid: '3x3', titleEn: 'TASTE VOCABULARY',
  titleRu: 'Вкусы на английском', visualStyle: 'editorial',
  items: Array.from({ length: 9 }, (_, i) => ({
    id: `item_${i + 1}`, english: `word_${i + 1}`, visualBrief: `distinct visual ${i + 1}`,
  })),
};
expect(validateCardManifest(valid).ok).toBe(true);
expect(validateCardManifest({ ...valid, items: valid.items.slice(0, 8) }).ok).toBe(false);
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

Expected: FAIL because the modules do not exist.

- [ ] **Step 3: Implement strict schema validation and safe paths**

Before implementation, install Ajv 8.20.0 as a direct root dependency so the following GREEN run is reproducible from a clean checkout: `npm install --save-exact ajv@8.20.0`. Commit the resulting `package.json` and `package-lock.json` in this task. Then export these stable interfaces:

```js
export const CARD_STATUSES = ['idea','copy_ready','waiting_dalle','images_ready','review','ready','published','collecting','scored'];
export function revisionKey(contentId, revision) { return `${contentId}/revision_${String(revision).padStart(3, '0')}`; }
export function canMutateRevision(status) { return !['published','collecting','scored'].includes(status); }
export function resolveInside(root, relativePath) {
  if (path.isAbsolute(relativePath)) throw new Error('absolute_path_forbidden');
  const base = path.resolve(root);
  const resolved = path.resolve(base, relativePath);
  if (resolved !== base && !resolved.startsWith(`${base}${path.sep}`)) throw new Error('path_traversal');
  return resolved;
}
```

Add the current supported Ajv release as a direct dependency and lock it. Configure `allErrors: true`, `removeAdditional: false`, `useDefaults: false`, `coerceTypes: false` and JSON Schema `additionalProperties: false`. `validateCardManifest(input)` returns `{ ok: true, value, errors: [] }` for the exact allowed v1 JSON Schema and `{ ok: false, value: null, errors: string[] }` otherwise. The server plan must use Ajv with the same options, schema and fixture rather than restating field names. Run `npm audit --omit=dev` and do not accept a newly introduced high/critical advisory.

- [ ] **Step 4: Run the test and confirm GREEN**

Run: `npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

Expected: PASS for schema and traversal cases.

- [ ] **Step 5: Commit**

```powershell
git add functions/src/contracts/social_learning_card_manifest_v1.json functions/src/contracts/social_learning_card_manifest_v1.fixture.json tools/social-learning-cards/src/schema.mjs tools/social-learning-cards/src/paths.mjs tests/social_learning_cards_pipeline.test.ts package.json package-lock.json
git commit -m "feat: define social learning card manifests"
```

### Task 2: Generate file-based DALL-E briefs and checkpoints

**Files:**
- Create: `tools/social-learning-cards/src/prompts.mjs`
- Create: `tools/social-learning-cards/src/cli.mjs`
- Test: `tests/social_learning_cards_pipeline.test.ts`

- [ ] **Step 1: Add failing prompt tests**

Assert the prompt contains the exact grid, all item IDs and visual briefs, `NO TEXT`, consistent character/style instructions, white/light background, adult audience, and a replacement prompt names one cell only.

- [ ] **Step 2: Verify RED**

Run: `npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

Expected: FAIL for missing `buildAtlasPrompt`.

- [ ] **Step 3: Implement prompt and `prepare` command**

The command writes only small text/JSON files:

```text
output/social-learning-cards/<contentId>/revision_001/
  dalle/atlas-prompt.txt
  dalle/replacement-prompts.json
  checkpoint.json
```

Checkpoint shape:

```json
{"contentId":"slc_pilot_01_taste","revision":1,"stage":"prompt_ready","atlasPath":null,"verifiedAt":null}
```

Do not call an image API and do not read `OPENAI_API_KEY`.

- [ ] **Step 4: Verify GREEN and firewall contract**

Run: `npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

Expected: PASS. The contract checks absence of OpenAI SDK imports, `/v1/images`, reads of `OPENAI_API_KEY`/`OPENAI_TTS_API_KEY`, and `fetch`/`http`/`https` network calls from pipeline source. Documentation may still name OpenAI when explaining the prohibition.

- [ ] **Step 5: Commit**

```powershell
git add tools/social-learning-cards/src/prompts.mjs tools/social-learning-cards/src/cli.mjs tests/social_learning_cards_pipeline.test.ts
git commit -m "feat: prepare file based DALL-E briefs"
```

### Task 3: Import, verify and crop an atlas

**Files:**
- Create: `tools/social-learning-cards/src/import-atlas.mjs`
- Modify: `tools/social-learning-cards/src/cli.mjs`
- Test: `tests/social_learning_cards_pipeline.test.ts`

- [ ] **Step 1: Add failing Sharp fixture tests**

Generate a temporary 900×900 RGB atlas inside the test temp directory. Assert a 3×3 import creates nine 300×300 crops, records SHA-256 hashes and refuses wrong dimensions, alpha-only input, missing cells and paths outside the workspace.

- [ ] **Step 2: Verify RED**

Run: `npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

- [ ] **Step 3: Implement `import-atlas`**

Use `sharp(path).metadata()`, normalize to sRGB, crop by exact integer boundaries, write `dalle/cells/<itemId>.png`, then update checkpoint to `atlas_imported`. The command must refuse to continue until every written crop can be reopened and its hash matches the checkpoint.

- [ ] **Step 4: Verify GREEN**

Run: `npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

Expected: PASS; no writes outside Jest temp/output directories.

- [ ] **Step 5: Commit**

```powershell
git add tools/social-learning-cards/src/import-atlas.mjs tools/social-learning-cards/src/cli.mjs tests/social_learning_cards_pipeline.test.ts
git commit -m "feat: import DALL-E card atlases"
```

### Task 4: Render deterministic learning and install slides

**Files:**
- Create: `tools/social-learning-cards/src/render.mjs`
- Create: `tools/social-learning-cards/assets/phone-frame.svg`
- Modify: `tools/social-learning-cards/src/cli.mjs`
- Test: `tests/social_learning_cards_pipeline.test.ts`

- [ ] **Step 1: Write failing render tests**

Assert the intermediate composition model and SVG contain the exact CTA, supplied real app screenshot reference, coordinates inside the 48 px safe area, English/Russian font sizes of at least 34/24 px and title size of at least 56 px. Separately assert both raster outputs are 1080×1080 JPEG, sRGB, under 1.5 MB and have no alpha.

- [ ] **Step 2: Verify RED**

Run: `npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

- [ ] **Step 3: Implement SVG composition through Sharp**

Expose:

Export `renderLearningSlide({ card, cellPaths, outputPath })` and `renderInstallSlide({ card, appScreenshotPath, heroCellPath, outputPath })`; both return `{ layoutPath, svgPath, jpegPath, sha256 }` only after all three artifacts are reopened and verified.

Each function first creates `layout.json`, then `slide.svg`, then rasterizes the SVG. Use two fixed layouts (`3x3`, `2x3`), XML-escape all copy, line-wrap only at spaces, use dark foreground on lime CTA surfaces, and fail before rasterization if copy exceeds two lines. Automated tests validate the model/SVG and JPEG metadata; semantic accuracy, defects and actual readability remain mandatory manual visual-gate checks.

- [ ] **Step 4: Verify GREEN and inspect generated fixture images**

Run: `npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

Expected: PASS and test artifacts are written only under `.codex-tmp/social-learning-cards-tests/`.

- [ ] **Step 5: Commit**

```powershell
git add tools/social-learning-cards/src/render.mjs tools/social-learning-cards/assets/phone-frame.svg tools/social-learning-cards/src/cli.mjs tests/social_learning_cards_pipeline.test.ts
git commit -m "feat: render two slide learning cards"
```

### Task 5: Enforce automatic and manual QA gates

**Files:**
- Create: `tools/social-learning-cards/src/validate.mjs`
- Create: `content/marketing/social-learning-cards/pilot-01/manual-qa.json`
- Modify: `tools/social-learning-cards/src/cli.mjs`
- Test: `tests/social_learning_cards_pipeline.test.ts`

- [ ] **Step 1: Add failing gate tests**

Test failures for duplicate English/Russian labels, missing output, wrong dimensions/profile, low text contrast, missing app screenshot, missing CTA, unapproved manual checklist, published revision overwrite and platform order mismatch.

- [ ] **Step 2: Verify RED**

Run: `npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

- [ ] **Step 3: Implement machine report and manual approval schema**

Manual approval must contain booleans for semantic match, no random text, no anatomy/object defects, no crop, correct copy, current real Phraseman screen, CTA readability and slide order, plus `reviewedBy` and ISO `reviewedAt`.

- [ ] **Step 4: Verify GREEN**

Run: `npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

Expected: export remains blocked until both reports pass.

- [ ] **Step 5: Commit**

```powershell
git add tools/social-learning-cards/src/validate.mjs tools/social-learning-cards/src/cli.mjs content/marketing/social-learning-cards/pilot-01/manual-qa.json tests/social_learning_cards_pipeline.test.ts
git commit -m "feat: gate social card exports"
```

### Task 6: Build platform packages and attribution links

**Files:**
- Create: `tools/social-learning-cards/src/package.mjs`
- Modify: `tools/social-learning-cards/src/cli.mjs`
- Test: `tests/social_learning_cards_pipeline.test.ts`

- [ ] **Step 1: Add failing package tests**

Assert four platform records, ordered slides, Instagram carousel, TikTok Photo Mode, Facebook multi-photo, YouTube Community plus documented fallback, and URLs of the form:

```text
https://knowlyapps.com/download/?utm_source=instagram&utm_medium=carousel&utm_campaign=slc_pilot_01&utm_content=slc_pilot_01_taste
```

- [ ] **Step 2: Verify RED**

Run: `npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

- [ ] **Step 3: Implement immutable revision package**

Write `slide_01_learning.jpg`, `slide_02_install.jpg`, their SHA-256 hashes, `captions.json`, versioned `manifest.json`, `quality-report.json` and `README.txt`. Refuse packaging unless the revision is mutable and both gates pass. The manifest contains a `quality` summary with machine check IDs/results, every required manual boolean, reviewer identity/time supplied for server audit, and SHA-256 of canonical `quality-report.json`; a bare client `passed: true` is invalid. The manifest stores logical immutable Storage object paths but never local absolute paths or download tokens.

- [ ] **Step 4: Verify GREEN**

Run: `npx jest tests/social_learning_cards_pipeline.test.ts --runInBand`

- [ ] **Step 5: Commit**

```powershell
git add tools/social-learning-cards/src/package.mjs tools/social-learning-cards/src/cli.mjs tests/social_learning_cards_pipeline.test.ts
git commit -m "feat: package social learning cards"
```

### Task 7: Define the seven-card queue and produce only card one

**Files:**
- Create: `content/marketing/social-learning-cards/pilot-01/cards.json`
- Modify: `.gitignore`
- Modify: `package.json`
- Create: `tools/social-learning-cards/README.md`

- [ ] **Step 1: Add scripts and ignored output paths**

Add `social-cards:prepare`, `social-cards:import`, `social-cards:render`, `social-cards:validate`, `social-cards:package`. Ignore `output/social-learning-cards/` and `.codex-tmp/social-learning-cards*/`.

- [ ] **Step 2: Write seven unique editorial manifests**

Cover the seven approved rubrics, use four English-only and three exploratory bilingual cards, and set only card one to `waiting_dalle`; the other six remain `copy_ready`.

- [ ] **Step 3: Generate card-one brief and use embedded Codex DALL-E**

Run: `npm run social-cards:prepare -- --card slc_pilot_01_<slug>`. Generate exactly one atlas with the built-in image tool, export it immediately to the ignored revision directory, and do not start card two.

- [ ] **Step 4: Import, render and run both QA gates**

Run the four narrow commands for card one. Inspect both final JPEGs at full and mobile size. Record manual approval only after corrections.

- [ ] **Step 5: Package card one and verify checkpoint**

Expected: one complete immutable revision package; six cards remain ungenerated.

- [ ] **Step 6: Commit source/config only**

```powershell
git add package.json .gitignore tools/social-learning-cards content/marketing/social-learning-cards/pilot-01/cards.json
git commit -m "feat: add social learning cards pilot"
```

### Task 8: Final focused verification

- [ ] Run `npx jest tests/social_learning_cards_pipeline.test.ts --runInBand` — expected PASS.
- [ ] Run `npm run social-cards:validate -- --card <card-one-id> --revision 1` — expected both gates PASS.
- [ ] Run `git diff --check` — expected no output.
- [ ] Confirm `git status --short` contains no raw DALL-E atlas, crops or rendered output.
- [ ] Stop before generating cards 2–7 and request visual approval of card one.
