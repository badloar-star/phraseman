# Phraseman 100-Avatar Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reproducible, tested authoring pipeline and produce the first 10 master avatars—one per approved visual house—plus deterministic `black`/`white` pairs and visual QA artifacts.

**Architecture:** The approved design spec remains the canonical source for the 100 archetypes. A small parser turns its exact table rows into a machine-readable manifest; prompt generation, tonal pair conversion, validation, and preview generation consume that manifest. The creative stage uses one built-in Codex `image_gen` call per master, with current achievement assets as quality-only references, then immediately exports each result to ignored workspace staging.

**Tech Stack:** Node.js ESM, Sharp, Jest/ts-jest, built-in Codex `image_gen`, project `.codex-tmp/` staging, existing custom-avatar geometry.

---

## Scope and repository constraints

- This plan ends at the owner review gate for 10 pilots. The remaining 90 assets receive a second plan only after the ten-house system passes.
- Work in the current checkout. Do not create a branch, worktree, delegated coding task, or new checkout unless the owner explicitly asks for that exact action.
- Do not call any project- or user-funded OpenAI API. Use only built-in Codex `image_gen`.
- Do not modify, remove, or overwrite the 62 current custom avatars.
- Do not copy pilot files into `admin/v2/avatars`, edit `constants/custom_avatars.ts`, change shop/gift classification, deploy hosting, or publish anything in this plan.
- Keep generated masters, derived pairs, previews, and reports in `.codex-tmp/avatar-100-production/`.
- The old avatar examples from the ZIP are technical references only. They must never be passed to `image_gen` as artistic references.
- The positive quality references are read-only: `assets/images/achievements/legend_second_wind.webp`, `assets/images/achievements/streak_365.webp`, and `assets/images/achievements/league_reached_black_diamond.webp`.
- Before every focused Jest run, acquire the shared heavy-process slot with Git Bash and release it in `finally`/immediately after the command. Never bypass the traffic light.
- Existing staged and unstaged changes belong to other sessions. Commit only explicit paths with `git commit --only`; if a repository guard fails because of unrelated state, stop and report it instead of using `--no-verify`.

## File structure

| File | Responsibility |
|---|---|
| `content/avatar-100/houses.json` | Ten approved house media, palettes, and negative constraints |
| `scripts/avatar-100/build-manifest.mjs` | Parse the 100 canonical design rows and emit validated JSON |
| `scripts/avatar-100/build-prompts.mjs` | Produce exact built-in image-generation prompts from manifest entries |
| `scripts/avatar-100/build-pair.mjs` | Convert one transparent master into geometrically identical dark/light PNG and WebP pairs |
| `scripts/avatar-100/validate-assets.mjs` | Validate naming, dimensions, alpha, safe zone, weight, pair completeness, and alpha-mask identity |
| `scripts/avatar-100/build-preview.mjs` | Render both versions on all ten app gradients and a 20 px readability row |
| `tests/avatar_100_manifest.test.ts` | Manifest range, uniqueness, house counts, and subject balance |
| `tests/avatar_100_prompts.test.ts` | Prompt completeness, uniqueness, positive reference policy, and anti-copy constraints |
| `tests/avatar_100_pair_transform.test.ts` | Pixel-level pair geometry, alpha identity, tonal separation, and output naming |
| `tests/avatar_100_asset_validator.test.ts` | Validator rejection/acceptance fixtures |
| `tests/avatar_100_preview.test.ts` | Preview dimensions and all-gradient coverage |
| `.codex-tmp/avatar-100-production/manifest.json` | Generated 100-entry production manifest |
| `.codex-tmp/avatar-100-production/prompts/pilot/*.txt` | Ten exact pilot prompts |
| `.codex-tmp/avatar-100-production/masters/*.png` | Ten built-in generation outputs |
| `.codex-tmp/avatar-100-production/pairs/*` | Twenty `black`/`white` PNG sources and twenty final WebP files |
| `.codex-tmp/avatar-100-production/previews/*` | Contact sheets and 20 px QA |
| `.codex-tmp/avatar-100-production/checkpoint.json` | Per-ID generation, transformation, and QA status |

### Task 1: Canonical manifest builder

**Files:**
- Create: `content/avatar-100/houses.json`
- Create: `scripts/avatar-100/build-manifest.mjs`
- Create: `tests/avatar_100_manifest.test.ts`
- Read: `docs/superpowers/specs/2026-08-24-phraseman-100-diverse-avatars-design.md`

- [ ] **Step 1: Write the failing manifest contract test**

```ts
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';

describe('avatar 100 manifest', () => {
  it('builds the approved 100-entry taxonomy exactly', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-100-manifest-'));
    const out = path.join(tempDir, 'manifest.json');
    execFileSync(process.execPath, [
      'scripts/avatar-100/build-manifest.mjs', '--out', out,
    ], { cwd: path.resolve(__dirname, '..') });

    const manifest = JSON.parse(fs.readFileSync(out, 'utf8'));
    expect(manifest.version).toBe(1);
    expect(manifest.entries).toHaveLength(100);
    expect(manifest.entries.map((entry: { assetIndex: number }) => entry.assetIndex))
      .toEqual(Array.from({ length: 100 }, (_, index) => index + 63));
    expect(new Set(manifest.entries.map((entry: { avatarId: string }) => entry.avatarId)).size)
      .toBe(100);

    const subjectCounts = Object.fromEntries(
      ['person', 'creature', 'artifact', 'mask', 'abstract'].map((type) => [
        type,
        manifest.entries.filter((entry: { subjectType: string }) => entry.subjectType === type).length,
      ]),
    );
    expect(subjectCounts).toEqual({ person: 40, creature: 20, artifact: 20, mask: 10, abstract: 10 });

    for (let houseId = 1; houseId <= 10; houseId += 1) {
      expect(manifest.entries.filter((entry: { houseId: number }) => entry.houseId === houseId))
        .toHaveLength(10);
    }

    expect(manifest.pilotAssetIndexes).toEqual([63, 74, 87, 100, 108, 120, 129, 137, 147, 157]);
  });
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh acquire "jest avatar-100 manifest RED"
npx jest --runTestsByPath tests/avatar_100_manifest.test.ts --no-cache --runInBand
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh release
```

Expected: FAIL because `scripts/avatar-100/build-manifest.mjs` does not exist.

- [ ] **Step 3: Create the ten-house source file**

`content/avatar-100/houses.json` must contain these exact records:

```json
{
  "1": { "nameRu": "Проводники", "medium": "titanium, transparent sapphire glass, engraved cartographic routes", "accents": ["#194C80", "#63C9FF"], "avoid": ["generic fantasy", "hoods", "crowns", "blue forehead crystal"] },
  "2": { "nameRu": "Мастера", "medium": "hand-worked copper, wood, amber enamel, warm craft lighting", "accents": ["#7B3E17", "#FFB14A"], "avoid": ["factory robot", "steampunk cliché", "visible letters", "tools crossing the safe zone"] },
  "3": { "nameRu": "Стратеги", "medium": "gunmetal steel, rubber, modular brutalist construction, ruby detail", "accents": ["#711D2D", "#FF5C72"], "avoid": ["weapons as violence", "military insignia", "medal pedestal", "chess-piece portrait"] },
  "4": { "nameRu": "Связующие", "medium": "rose gold, coral enamel, smooth connected forms", "accents": ["#8A3850", "#FF7B91"], "avoid": ["national costumes", "flags", "romance-heart cliché", "speech text"] },
  "5": { "nameRu": "Мечтатели", "medium": "moon glass, cloud resin, soft internal illumination", "accents": ["#58328D", "#BC8CFF"], "avoid": ["wizard robe", "astrology symbols", "existing constellations", "storybook text"] },
  "6": { "nameRu": "Хранители", "medium": "patinated bronze, wood, botanical bio-sculpture", "accents": ["#236B45", "#59DA8C"], "avoid": ["eco-logo", "religious tree", "calendar numbers", "round achievement medal"] },
  "7": { "nameRu": "Технонавты", "medium": "black chrome, clear acrylic, holographic cyan light, physical circuitry", "accents": ["#075F75", "#40E8FF", "#C8FF00"], "avoid": ["brand logo", "screen text", "generic robot head", "flat app icon"] },
  "8": { "nameRu": "Провидцы", "medium": "carved obsidian, amethyst and opal, restrained mysterious lighting", "accents": ["#54206C", "#D478FF"], "avoid": ["religious symbol", "zodiac", "tarot card", "hooded oracle"] },
  "9": { "nameRu": "Ясные", "medium": "matte ivory porcelain, paper, graphite, one exact gesture", "accents": ["#6A6E72", "#ECE7DC"], "avoid": ["busy ornament", "golden luxury", "medal", "empty generic circle"] },
  "10": { "nameRu": "Трикстеры", "medium": "iridescent polymer, pop-glitch construction, coral and neon-lime enamel", "accents": ["#FF6B82", "#C8FF00"], "avoid": ["brand mascot", "scary clown", "casino symbol", "emoji copy"] }
}
```

- [ ] **Step 4: Implement the manifest parser**

`scripts/avatar-100/build-manifest.mjs` must:

1. Resolve the repository root from `import.meta.url`.
2. Read the approved design spec and `content/avatar-100/houses.json`.
3. Match only rows satisfying `^\| (\d+) \| ([PCAMX]) \| ([^|]+) \| ([^|]+) \|$`.
4. Map `P/C/A/M/X` to `person/creature/artifact/mask/abstract`.
5. Derive `houseId = Math.floor((assetIndex - 63) / 10) + 1`.
6. Emit `{ version: 1, sourceSpec, pilotAssetIndexes, entries }`, where each entry contains `assetIndex`, `avatarId`, `houseId`, `subjectType`, `nameRu`, `visualMetaphor`, and the full house object.
7. Throw before writing when there are not exactly 100 rows, IDs are not exactly 63–162, names repeat, a house does not have 10 rows, or the subject balance differs from 40/20/20/10/10.
8. Accept only `--out .codex-tmp/avatar-100-production/manifest.json`-style arguments and create the supplied output parent directory recursively.

Use this exact output entry shape:

```js
{
  assetIndex,
  avatarId: `custom-gen-${assetIndex}`,
  houseId,
  subjectType: SUBJECT_TYPES[subjectCode],
  nameRu: nameRu.trim(),
  visualMetaphor: visualMetaphor.trim(),
  house: houses[String(houseId)]
}
```

- [ ] **Step 5: Run the focused test and confirm GREEN**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh acquire "jest avatar-100 manifest GREEN"
npx jest --runTestsByPath tests/avatar_100_manifest.test.ts --no-cache --runInBand
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh release
```

Expected: 1 suite PASS, 1 test PASS.

- [ ] **Step 6: Build the real manifest and inspect decisive counts**

```powershell
node scripts/avatar-100/build-manifest.mjs --out .codex-tmp/avatar-100-production/manifest.json
node -e "const m=require('./.codex-tmp/avatar-100-production/manifest.json'); console.log(m.entries.length,m.entries[0].assetIndex,m.entries.at(-1).assetIndex,m.pilotAssetIndexes.join(','))"
```

Expected: `100 63 162 63,74,87,100,108,120,129,137,147,157`.

- [ ] **Step 7: Commit only Task 1 paths**

```powershell
git add -- content/avatar-100/houses.json scripts/avatar-100/build-manifest.mjs tests/avatar_100_manifest.test.ts
git commit --only -m "feat: add avatar collection manifest pipeline" -- content/avatar-100/houses.json scripts/avatar-100/build-manifest.mjs tests/avatar_100_manifest.test.ts
```

If a global guard fails because of unrelated worktree debt, do not bypass it; record the failure and continue only after the user decides how to handle commits.

### Task 2: Prompt builder and anti-copy contract

**Files:**
- Create: `scripts/avatar-100/build-prompts.mjs`
- Create: `tests/avatar_100_prompts.test.ts`
- Read: `.codex-tmp/avatar-100-production/manifest.json`

- [ ] **Step 1: Write the failing prompt contract**

The test builds prompts into a temporary directory and asserts:

```ts
expect(files).toEqual([
  'custom-idea-100-master.txt', 'custom-idea-108-master.txt', 'custom-idea-120-master.txt',
  'custom-idea-129-master.txt', 'custom-idea-137-master.txt', 'custom-idea-147-master.txt',
  'custom-idea-157-master.txt', 'custom-idea-63-master.txt', 'custom-idea-74-master.txt',
  'custom-idea-87-master.txt',
]);
for (const prompt of prompts) {
  expect(prompt).toContain('Use case: stylized-concept');
  expect(prompt).toContain('512 x 512');
  expect(prompt).toContain('genuinely transparent background');
  expect(prompt).toContain('quality reference only');
  expect(prompt).toContain('Do not copy any reference subject, silhouette, composition, pedestal, or ornament');
  expect(prompt).toContain('no text, letters, numbers, logo, watermark, frame, badge, pedestal, or background');
  expect(prompt).not.toContain('custom-idea-01');
}
expect(new Set(prompts).size).toBe(10);
```

- [ ] **Step 2: Run RED with the semaphore-wrapped focused Jest command**

Expected: FAIL because the builder does not exist.

- [ ] **Step 3: Implement `build-prompts.mjs`**

Support `--manifest`, `--out-dir`, and `--pilot`. For every selected entry write this fully resolved template—runtime interpolation is required; literal angle-bracket placeholders are forbidden in output:

```text
Use case: stylized-concept
Asset type: Phraseman custom avatar master, later converted into a dark/light pair
Primary request: Create a completely original avatar for the learner archetype "${entry.nameRu}". Express this behavior through ${entry.visualMetaphor}.
Subject class: ${entry.subjectType}
Scene/backdrop: none; genuinely transparent background
Style/medium: ${entry.house.medium}. Match the attached current Phraseman achievement references only for professional material fidelity, sculptural clarity, clean studio lighting, and finish quality. Do not copy any reference subject, silhouette, composition, pedestal, or ornament.
Composition/framing: single centered subject, calm front or three-quarter presentation, strong silhouette, approximately 290 x 380 px of a 512 x 512 canvas, entirely inside the supplied inset standing-hexagon safe zone
Lighting/mood: premium studio object lighting appropriate to the stated material; controlled highlights; readable at 20 px
Color palette: neutral mid-value base material prepared for later dark/light remapping; house accents ${entry.house.accents.join(', ')} must remain limited and intentional
Constraints: exact square 512 x 512 output; genuinely transparent background with alpha; one subject only; culturally neutral; no stereotypes; no visible language; no text, letters, numbers, logo, watermark, frame, badge, pedestal, or background
Avoid: ${entry.house.avoid.join(', ')}; generic fantasy; hooded oracle; crown; central blue forehead crystal; round medal; existing Phraseman avatar; existing Phraseman achievement composition; duplicate of another pilot
```

- [ ] **Step 4: Run GREEN and generate the ten real prompt files**

```powershell
node scripts/avatar-100/build-prompts.mjs --manifest .codex-tmp/avatar-100-production/manifest.json --out-dir .codex-tmp/avatar-100-production/prompts/pilot --pilot
```

Expected: ten `.txt` files, no unresolved `${...}` strings, no old-avatar reference path.

- [ ] **Step 5: Commit only Task 2 paths**

Use `git commit --only` for `scripts/avatar-100/build-prompts.mjs` and `tests/avatar_100_prompts.test.ts`.

### Task 3: Deterministic master-to-pair transformer

**Files:**
- Create: `scripts/avatar-100/build-pair.mjs`
- Create: `tests/avatar_100_pair_transform.test.ts`

- [ ] **Step 1: Write a failing pixel-level test**

Create a 4×1 RGBA fixture with Sharp containing: one neutral mid-gray pixel, one saturated cyan accent pixel, one warm accent pixel, and one fully transparent pixel. Execute:

```ts
execFileSync(process.execPath, [
  'scripts/avatar-100/build-pair.mjs',
  '--input', fixturePath,
  '--index', '63',
  '--out-dir', tempDir,
], { cwd: path.resolve(__dirname, '..') });
```

Assert all four outputs exist:

```ts
expect(files).toEqual([
  'custom-idea-63-black.png', 'custom-idea-63-black.webp',
  'custom-idea-63-white.png', 'custom-idea-63-white.webp',
]);
```

Read the two PNGs as raw RGBA and assert:

```ts
expect(black.info.width).toBe(4);
expect(white.info.width).toBe(4);
expect(alphaBytes(black)).toEqual(alphaBytes(white));
expect(luma(pixel(black, 0))).toBeLessThan(110);
expect(luma(pixel(white, 0))).toBeGreaterThan(160);
expect(pixel(black, 1)[2]).toBeGreaterThan(pixel(black, 1)[1]);
expect(pixel(white, 1)[2]).toBeGreaterThan(pixel(white, 1)[1]);
expect(pixel(black, 3)[3]).toBe(0);
expect(pixel(white, 3)[3]).toBe(0);
```

- [ ] **Step 2: Run RED under the shared semaphore**

Expected: FAIL because the transformer does not exist.

- [ ] **Step 3: Implement the transformer**

The script must:

- accept exactly `--input`, `--index`, and `--out-dir`;
- reject indexes outside 63–162;
- decode once with `sharp(input).ensureAlpha().raw()`;
- preserve alpha bytes exactly;
- classify pixels with normalized RGB chroma `< 0.16` as neutral;
- compute neutral luminance with `0.2126R + 0.7152G + 0.0722B`;
- map neutral pixels to `18 + 0.42*luma` for `black` and `150 + 0.40*luma` for `white`;
- preserve channel ordering for accent pixels while clamping peak brightness to 96–220 (`black`) or 120–238 (`white`);
- write PNG with alpha and WebP using `{ quality: 76, alphaQuality: 100, effort: 6 }`;
- never resize, crop, sharpen, blur, or change geometry.

Use one exported pure function for tests:

```js
export function remapRgba(data, mode) {
  const output = Buffer.from(data);
  for (let offset = 0; offset < output.length; offset += 4) {
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const alpha = data[offset + 3];
    if (alpha === 0) continue;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const chroma = (max - min) / 255;
    if (chroma < 0.16) {
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const target = Math.round(mode === 'black' ? 18 + 0.42 * luma : 150 + 0.40 * luma);
      output[offset] = target;
      output[offset + 1] = target;
      output[offset + 2] = target;
      continue;
    }
    const low = mode === 'black' ? 96 : 120;
    const high = mode === 'black' ? 220 : 238;
    const targetPeak = Math.min(high, Math.max(low, max));
    const scale = max === 0 ? 1 : targetPeak / max;
    output[offset] = Math.min(255, Math.round(r * scale));
    output[offset + 1] = Math.min(255, Math.round(g * scale));
    output[offset + 2] = Math.min(255, Math.round(b * scale));
  }
  return output;
}
```

- [ ] **Step 4: Run GREEN and commit only Task 3 paths**

Expected: pair-transform suite PASS. Do not run on creative masters yet.

### Task 4: Technical validator and ten-gradient preview

**Files:**
- Create: `scripts/avatar-100/validate-assets.mjs`
- Create: `scripts/avatar-100/build-preview.mjs`
- Create: `tests/avatar_100_asset_validator.test.ts`
- Create: `tests/avatar_100_preview.test.ts`
- Read/reference: `phrasemanavatarkit.zip` files `tools/validate.mjs`, `tools/preview.mjs`, and `gradients.json`

- [ ] **Step 1: Write validator RED cases**

Generate fixtures in a temporary directory with Sharp and assert the validator:

- accepts a complete 512×512 `custom-idea-100-black/white` pair inside the inset hexagon;
- accepts both two- and three-digit indexes;
- rejects a missing partner;
- rejects any alpha > 10 outside the safe hex;
- rejects mismatched alpha masks;
- rejects opaque corners;
- rejects wrong dimensions;
- rejects WebP files over 50 KB;
- reports JSON when passed `--json .codex-tmp/avatar-100-production/validation.json`.

- [ ] **Step 2: Write preview RED case**

Given one valid pair, execute the preview builder and assert:

```ts
expect(report.gradients).toHaveLength(10);
expect(report.variants).toEqual(['black', 'white']);
expect(report.smallSize).toBe(20);
expect(fs.existsSync(report.contactSheet)).toBe(true);
const meta = await sharp(report.contactSheet).metadata();
expect(meta.width).toBeGreaterThan(1600);
expect(meta.height).toBeGreaterThan(300);
```

- [ ] **Step 3: Run both suites RED with one acquired semaphore slot**

Expected: FAIL because both scripts are absent.

- [ ] **Step 4: Adapt the provided validator instead of inventing a second geometry**

Copy the algorithmic behavior from the ZIP's `tools/validate.mjs`, then make these exact changes:

- filename regex becomes `/^custom-idea-(\d{2,3})-(black|white)\.(png|webp)$/i`;
- pair-key regex also accepts `\d{2,3}`;
- `outsideSafe > 0` is an error, not a warning;
- hard WebP limit is 50,000 bytes;
- compare full alpha buffers for each pair and reject any mismatch;
- accept a `--json` output argument such as `.codex-tmp/avatar-100-production/validation.json` and write `{ checked, rejected, results }`;
- export `checkFile`, `checkDirectory`, `hexAt`, and `inPoly` for tests;
- keep stdout concise: one line per file plus final counts.

- [ ] **Step 5: Adapt the provided preview builder**

Use the ten exact gradients from `constants/custom_avatars.ts`, not a duplicated old JSON file. Render two rows per index (`black`, `white`) and a 20 px nearest-neighbor inspection strip. Write one contact sheet and a sidecar JSON report.

- [ ] **Step 6: Run GREEN and commit only Task 4 paths**

Expected: 2 suites PASS; the safe-zone and alpha-mask failures are demonstrated by tests before acceptance.

### Task 5: Generate the ten pilot masters with built-in Codex image generation

**Files:**
- Read: `.codex-tmp/avatar-100-production/prompts/pilot/*.txt`
- Read-only references: the three achievement WebP files listed in Scope
- Create through built-in generation/export: `.codex-tmp/avatar-100-production/masters/custom-idea-63-master.png`, `custom-idea-74-master.png`, `custom-idea-87-master.png`, `custom-idea-100-master.png`, `custom-idea-108-master.png`, `custom-idea-120-master.png`, `custom-idea-129-master.png`, `custom-idea-137-master.png`, `custom-idea-147-master.png`, and `custom-idea-157-master.png`
- Create/update: `.codex-tmp/avatar-100-production/checkpoint.json`

- [ ] **Step 1: Initialize the checkpoint**

Write a JSON object with `version: 1`, `pilotAssetIndexes`, and one record per ID containing `status: "pending"`, `attempts: 0`, `masterPath: null`, `promptPath`, and `lastDefect: null`.

- [ ] **Step 2: Generate ID 63 — Любопытный новичок**

Call built-in `image_gen` once with the complete contents of `custom-idea-63-master.txt` and `referenced_image_paths` set only to the three achievement quality references. Export the result immediately to `masters/custom-idea-63-master.png`, inspect it, and update checkpoint status to `master_ready` or `retry_required`.

- [ ] **Step 3: Generate the remaining nine masters with one independent built-in call per ID: 74, 87, 100, 108, 120, 129, 137, 147, and 157**

For every call:

- use only its own resolved prompt;
- use the same three achievements only as quality references;
- never include any old avatar image;
- save before starting the next call;
- record the exact final prompt and output path;
- inspect transparent edges, silhouette, forbidden pedestal/frame/text, and semantic match;
- allow one targeted retry only when a concrete defect is recorded.

- [ ] **Step 4: End the generation batch after ten accepted masters**

Do not generate an eleventh image in the same session. Confirm all ten files exist in workspace staging, preserve the Codex rollout record until export is verified, and compact before further image work.

### Task 6: Derive pairs, validate, and build visual QA

**Files:**
- Read: `.codex-tmp/avatar-100-production/masters/*.png`
- Create: `.codex-tmp/avatar-100-production/pairs/*`
- Create: `.codex-tmp/avatar-100-production/previews/*`
- Create/update: `.codex-tmp/avatar-100-production/checkpoint.json`

- [ ] **Step 1: Run `build-pair.mjs` once for each accepted pilot ID**

Expected: 20 PNG sources and 20 WebP finals; no source geometry changes.

- [ ] **Step 2: Run the validator over the full pilot pair directory**

```powershell
node scripts/avatar-100/validate-assets.mjs .codex-tmp/avatar-100-production/pairs --json .codex-tmp/avatar-100-production/validation.json
```

Expected: `checked=40`, `rejected=0`. The count includes PNG and WebP versions.

- [ ] **Step 3: Fix only localized failures**

- If master geometry or transparency is invalid, perform one targeted built-in retry for that ID.
- If only tonal or compression checks fail, adjust the deterministic transform, add a regression test, and rerun all pair-transform and validator tests.
- Never crop or auto-scale a subject to hide a failed safe-zone prompt without recording the defect.

- [ ] **Step 4: Build all ten contact sheets**

Expected: each sheet shows black and white on all ten gradients plus 20 px rows.

- [ ] **Step 5: Run the full focused gate under one semaphore slot**

```powershell
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh acquire "jest avatar-100 pilot gate"
npx jest --runTestsByPath tests/avatar_100_manifest.test.ts tests/avatar_100_prompts.test.ts tests/avatar_100_pair_transform.test.ts tests/avatar_100_asset_validator.test.ts tests/avatar_100_preview.test.ts --no-cache --runInBand
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh release
```

Expected: all five suites PASS. Always release the slot, including after failures.

### Task 7: Independent visual review and owner gate

**Files:**
- Read: `.codex-tmp/avatar-100-production/previews/*`
- Create: `.codex-tmp/avatar-100-production/PILOT_REVIEW.md`

- [ ] **Step 1: Build one overview contact sheet containing all ten masters and both pair variants**

The overview must label IDs and house names outside the artwork; labels must not be baked into asset files.

- [ ] **Step 2: Review against the approved design, not the old avatar examples**

For every pilot score PASS/FAIL on:

- semantic match to its learner archetype;
- unique silhouette at 20 px;
- house-specific medium and palette;
- achievement-level material and lighting quality;
- no copied achievement composition;
- no old-avatar language, generic fantasy, pedestal, medal, frame, text, logo, or stereotype;
- dark/light contrast on all ten gradients.

- [ ] **Step 3: Present the overview in the visual companion and ask the owner to approve or reject each house**

Do not begin the remaining 90 until all ten houses have an accepted pilot. Replace only rejected pilots and preserve accepted source files.

- [ ] **Step 4: Record the gate result**

`PILOT_REVIEW.md` must list each ID, accepted master SHA-256, final pair SHA-256 values, validator status, owner decision, and any replacement history.

### Task 8: Pilot handoff and next-plan trigger

**Files:**
- Modify: `docs/superpowers/specs/2026-08-24-phraseman-100-diverse-avatars-design.md` only if owner decisions change the approved contract
- Create after owner approval: `docs/superpowers/plans/2026-08-24-phraseman-avatar-100-production-implementation.md`

- [ ] **Step 1: Verify no live integration occurred**

```powershell
git status --short -- admin/v2/avatars constants/custom_avatars.ts components/CustomAvatarBadge.tsx
```

Expected: no changes caused by this pilot plan.

- [ ] **Step 2: Report the pilot outcome with exact paths and counts**

Report 10 masters, 20 PNG pair sources, 20 final WebP files, 10 previews, focused test status, validator status, and owner decisions.

- [ ] **Step 3: Write the production plan only after all ten pilots are approved**

The second plan expands the same tested manifest/prompt/pair/QA pipeline to the remaining 90 IDs in ten house-bounded batches. It must separately cover app integration, 8-locale labels, three-digit filename contract updates, Jarvis data-contract check, static hosting files, focused tests, and an explicit no-deploy boundary.
