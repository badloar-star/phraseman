# Phraseman Avatar No-Humans Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the 100-avatar system to exactly zero human or humanoid designs while preserving all 100 learner archetypes and the light/dark production contract.

**Architecture:** The approved Markdown taxonomy remains the single source of truth. The manifest builder enforces the exact global balance `0 person / 30 creature / 30 artifact / 20 mask / 20 abstract` and the exact per-house balance `3C / 3A / 2M / 2X`; prompt generation adds a hard no-human constraint to every prompt. Existing human pilot assets are preserved under rejected staging and removed from the active pilot set before five replacement masters are generated in a fresh image session.

**Tech Stack:** Node.js ESM, TypeScript/Jest, Sharp, built-in Codex `image_gen`, JSON checkpoints, ignored `.codex-tmp` staging.

---

### Task 1: Lock the no-human taxonomy contract with tests

**Files:**
- Modify: `tests/avatar_100_manifest.test.ts`
- Modify: `tests/avatar_100_prompts.test.ts`

- [x] **Step 1: Change the manifest test to the approved distribution**

Replace the subject-count expectation with:

```ts
expect(countBy(entries, 'subjectType')).toEqual({
  creature: 30,
  artifact: 30,
  mask: 20,
  abstract: 20,
});
expect(entries.some((entry) => entry.subjectType === 'person')).toBe(false);
```

Add a per-house assertion:

```ts
for (let houseId = 1; houseId <= 10; houseId += 1) {
  expect(countBy(entries.filter((entry) => entry.houseId === houseId), 'subjectType')).toEqual({
    creature: 3,
    artifact: 3,
    mask: 2,
    abstract: 2,
  });
}
```

- [x] **Step 2: Add prompt-level anti-human assertions**

Require every pilot prompt to include these exact production constraints:

```ts
expect(prompt).toContain('No human or humanoid');
expect(prompt).toContain('no human face, body, hands, clothing, portrait pose, or android');
expect(prompt).not.toContain('Subject class: person');
```

- [x] **Step 3: Run the focused tests and verify RED**

Run under the shared semaphore:

```powershell
npx jest --runTestsByPath tests/avatar_100_manifest.test.ts tests/avatar_100_prompts.test.ts --no-cache --runInBand
```

Expected: FAIL because the current builder still expects 40 people and current prompts do not contain the new hard constraint.

### Task 2: Enforce the approved distribution in the manifest builder

**Files:**
- Modify: `scripts/avatar-100/build-manifest.mjs`
- Regenerate: `.codex-tmp/avatar-100-production/manifest.json`

- [x] **Step 1: Remove the person code and change global counts**

Use this type map and exact expected counts:

```js
const SUBJECT_TYPES = {
  C: 'creature',
  A: 'artifact',
  M: 'mask',
  X: 'abstract',
};

const expectedSubjectCounts = {
  creature: 30,
  artifact: 30,
  mask: 20,
  abstract: 20,
};
```

- [x] **Step 2: Add exact per-house validation**

For every `houseId` from 1 through 10, throw unless the counts equal:

```js
{ creature: 3, artifact: 3, mask: 2, abstract: 2 }
```

Also throw if a parsed row has type code `P`. Human likeness is additionally blocked by the invariant prompt text and the mandatory visual rejection gate, avoiding false positives from negative phrases such as `без человеческих черт` in approved mask descriptions.

- [x] **Step 3: Rebuild the manifest**

```powershell
node scripts/avatar-100/build-manifest.mjs --out .codex-tmp/avatar-100-production/manifest.json
```

Expected summary: `100` entries, IDs `63..162`, counts `30/30/20/20`, no `person`.

- [x] **Step 4: Run the manifest test and verify GREEN**

```powershell
npx jest --runTestsByPath tests/avatar_100_manifest.test.ts --no-cache --runInBand
```

Expected: PASS.

### Task 3: Add hard no-human constraints to every prompt

**Files:**
- Modify: `scripts/avatar-100/build-prompts.mjs`
- Regenerate: `.codex-tmp/avatar-100-production/prompts/pilot/*.txt`

- [x] **Step 1: Add an invariant prompt block**

Every prompt must include:

```text
No human or humanoid. Depict only the specified creature, artifact, non-wearable sculptural mask, or abstract form. Absolutely no human face, body, hands, clothing, portrait pose, mannequin, cyborg, or android. A mask is an independent object without eyes, mouth, human proportions, or a wearer.
```

- [x] **Step 2: Rebuild the pilot prompt cards**

```powershell
node scripts/avatar-100/build-prompts.mjs --manifest .codex-tmp/avatar-100-production/manifest.json --out-dir .codex-tmp/avatar-100-production/prompts --pilot
```

Expected: exactly 10 resolved prompt files for IDs `63,74,87,100,108,120,129,137,147,157`.

- [x] **Step 3: Run the prompt test and verify GREEN**

```powershell
npx jest --runTestsByPath tests/avatar_100_prompts.test.ts --no-cache --runInBand
```

Expected: PASS with no `Subject class: person` in any pilot prompt.

### Task 4: Quarantine the two human pilot designs without deleting them

**Files:**
- Modify: `.codex-tmp/avatar-100-production/checkpoint.json`
- Move: `.codex-tmp/avatar-100-production/pilot-assets/custom-idea-63-*`
- Move: `.codex-tmp/avatar-100-production/pilot-assets/custom-idea-74-*`
- Move: `.codex-tmp/avatar-100-production/masters/raw/custom-idea-63-master.png`
- Move: `.codex-tmp/avatar-100-production/masters/raw/custom-idea-74-master.png`
- Move: `.codex-tmp/avatar-100-production/masters/normalized/custom-idea-63-master.png`
- Move: `.codex-tmp/avatar-100-production/masters/normalized/custom-idea-74-master.png`
- Preserve under: `.codex-tmp/avatar-100-production/rejected/human-designs/`

- [x] **Step 1: Resolve every exact source and destination path**

List the 12 expected source files and verify each resolved path stays under `.codex-tmp/avatar-100-production/`.

- [x] **Step 2: Move the human masters and variants into rejected staging**

Preserve filenames and add `human-designs/masters/` and `human-designs/pairs/` subdirectories. Do not delete the original generation records in `C:/Users/badlo/.codex/generated_images/`.

- [x] **Step 3: Update checkpoint statuses**

Set IDs 63 and 74 to:

```json
{
  "status": "rejected",
  "reason": "owner decision: no people or humanoids",
  "replacementRequired": true
}
```

Keep 87, 100, 108, 120, and 129 accepted; keep 137 rejected for generic-fantasy drift; keep 147 and 157 pending.

- [x] **Step 4: Validate the remaining active pilot files**

```powershell
node scripts/avatar-100/validate-assets.mjs .codex-tmp/avatar-100-production/pilot-assets --json .codex-tmp/avatar-100-production/reports/pilot-assets-no-humans.json
```

Expected: 20 checked files for five accepted IDs, zero rejected files, and no files for IDs 63 or 74.

### Task 5: Generate the five missing non-human masters in a fresh image session

**Files:**
- Read: `.codex-tmp/avatar-100-production/prompts/pilot/custom-idea-63-master.txt`
- Read: `.codex-tmp/avatar-100-production/prompts/pilot/custom-idea-74-master.txt`
- Read: `.codex-tmp/avatar-100-production/prompts/pilot/custom-idea-137-master.txt`
- Read: `.codex-tmp/avatar-100-production/prompts/pilot/custom-idea-147-master.txt`
- Read: `.codex-tmp/avatar-100-production/prompts/pilot/custom-idea-157-master.txt`
- Create: `.codex-tmp/avatar-100-production/masters/raw/custom-idea-<id>-master.png`
- Create: `.codex-tmp/avatar-100-production/masters/normalized/custom-idea-<id>-master.png`
- Create: `.codex-tmp/avatar-100-production/pilot-assets/custom-idea-<id>-{black,white}.{png,webp}`
- Create: `.codex-tmp/avatar-100-production/previews/custom-idea-<id>-contact-sheet.png`

- [ ] **Step 1: Start only in a fresh or compacted Codex session**

Confirm the previous ten built-in generation results are exported and the checkpoint is readable. Do not use project or user OpenAI API credentials.

- [ ] **Step 2: Generate one master per missing ID**

Use the three approved achievement assets as quality references only. Never attach old avatar art. Request a uniform production chroma background when genuine alpha is not returned directly.

- [ ] **Step 3: Reject any human drift immediately**

Reject a result if it contains a human face, body, hand, clothing, portrait pose, android, humanoid mask, wearer, or mannequin. Also reject generic fantasy, central-gem symmetry, frames, pedestals, text, or copied achievement composition.

- [ ] **Step 4: Normalize, derive pairs, validate, and preview each accepted master**

For each ID:

```powershell
node scripts/avatar-100/normalize-master.mjs --input <raw-master> --output <normalized-master>
node scripts/avatar-100/build-pair.mjs --input <normalized-master> --index <id> --out-dir .codex-tmp/avatar-100-production/pilot-assets
node scripts/avatar-100/validate-assets.mjs .codex-tmp/avatar-100-production/pilot-assets --json .codex-tmp/avatar-100-production/reports/pilot-assets.json
node scripts/avatar-100/build-preview.mjs --input-dir .codex-tmp/avatar-100-production/pilot-assets --index <id> --out-dir .codex-tmp/avatar-100-production/previews --json .codex-tmp/avatar-100-production/reports/custom-idea-<id>-preview.json
```

Expected after all five: 40 active pilot files, zero validator rejections, ten accepted IDs in the checkpoint.

### Task 6: Final pilot verification and owner gate

**Files:**
- Read: `.codex-tmp/avatar-100-production/checkpoint.json`
- Create: `.codex-tmp/avatar-100-production/reports/no-humans-pilot-final.json`

- [ ] **Step 1: Run all six focused Jest files separately under the shared semaphore**

Run manifest, prompts, pair transform, normalization, asset validator, and preview tests as separate Jest processes to avoid the previously observed 4 GB heap accumulation.

Expected: all suites PASS.

- [ ] **Step 2: Run the full pilot asset validator**

Expected: 40 files checked, zero rejected, identical alpha masks per pair, every WebP below 50 KB.

- [ ] **Step 3: Perform visual contact-sheet review**

Check all ten gradients and the 20 px row. Confirm zero humans/humanoids, ten distinct silhouettes, no generic fantasy drift, and meaningful black/white material separation.

- [ ] **Step 4: Present the ten-avatar pilot to the owner**

Do not generate the remaining 90 until the owner accepts the corrected no-human pilot.

### Task 7: Produce the remaining 90 after pilot approval

**Files:**
- Create: remaining raw and normalized masters in ignored staging
- Create: remaining paired PNG/WebP files in ignored staging
- Update: `.codex-tmp/avatar-100-production/checkpoint.json`
- Create: per-house contact sheets and final QA report

- [ ] **Step 1: Generate one ten-item house batch per fresh or compacted session**

Use file checkpoints after every result and never exceed ten built-in image results in one session.

- [ ] **Step 2: Apply the hard human-drift and generic-fantasy rejection gates to every result**

No result proceeds to pair generation if it violates either gate.

- [ ] **Step 3: Normalize, pair, validate, and preview every accepted master**

Do not place raw masters or speculative variants in bundled `assets/images/**`.

- [ ] **Step 4: Verify the final collection**

Expected: 100 accepted masters, 200 final WebP files, exact balance `30/30/20/20`, zero humans/humanoids, zero missing pairs, zero validator failures.

- [ ] **Step 5: Stop at the integration gate**

Do not wire assets into the live app, delete old avatars, deploy, or change economy/shop behavior without a separate explicit owner decision.
