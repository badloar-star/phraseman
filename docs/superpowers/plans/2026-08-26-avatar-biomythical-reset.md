# Avatar Biomyhtical Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute inline with one writer; do not create a worktree, branch, delegated task, background generator, or parallel image call.

**Goal:** Preserve the accepted 50-pearl tier, regenerate every 70–1000 pair as a new biomyhtical species, and replace only the dark 3000-pearl leopard with a distinct seated generation.

**Architecture:** Store the approved 53-species mapping in one tested JavaScript module, derive a new checkpointed 107-item queue from that map, and reuse the existing one-image normalization/promotion pipeline. Every generated variant is inspected on warm and navy backgrounds before promotion; browser contact sheets are produced after each five completed pairs.

**Tech Stack:** Node.js ESM, `node:test`, `sharp`, static HTML showcase, built-in Codex image generation.

---

### Task 1: Add the authoritative biomyhtical creature map

**Files:**
- Create: `scripts/avatar-100/biomythical-map.mjs`
- Create: `scripts/avatar-100/biomythical-map.test.mjs`
- Reference: `docs/superpowers/specs/2026-08-26-avatar-biomythical-reset-design.md`

- [ ] **Step 1: Write the failing map contract test**

The test imports `BIOMYTHICAL_AVATARS` and asserts IDs are exactly 73–125, prices contain 10/10/10/10/10/3 entries for 70/100/150/300/500/1000, names are unique, ID 91 contains neither `flamingo` nor `фламинго`, ID 121 contains neither `saiga` nor `сайг`, every entry declares anatomy/poses/avoid rules, and no concept contains `human`, `robot`, `machine`, or `vehicle`.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test scripts/avatar-100/biomythical-map.test.mjs`

Expected: FAIL because `biomythical-map.mjs` does not exist.

- [ ] **Step 3: Implement the 53-entry map**

Export entries with this exact shape:

```js
{
  id: 73,
  price: 70,
  name: 'Moss-Eared Pandafox',
  labelRu: 'Дружелюбный исследователь',
  baseAnimal: 'red-panda-like quadruped',
  anatomy: 'exactly four legs, four paws, one head, two leaf-shaped ears, one mossy tail fan',
  signature: 'leaf-shaped ears and a single mossy tail fan grown from fur',
  darkPose: 'walking three-quarter pose facing left with all four paws visible',
  lightPose: 'seated three-quarter pose facing right with all four paws visible',
  avoid: 'ordinary red panda, detached leaves, extra tail, wings',
}
```

Populate all IDs from the approved spec without changing Russian labels or prices.

- [ ] **Step 4: Run the map test and verify GREEN**

Run: `node --test scripts/avatar-100/biomythical-map.test.mjs`

Expected: PASS with one 53-entry map contract test.

### Task 2: Build and checkpoint the V3 queue

**Files:**
- Create: `scripts/avatar-100/build-biomythical-queue.mjs`
- Create: `scripts/avatar-100/build-biomythical-queue.test.mjs`
- Create at runtime: `.codex-tmp/avatar-regeneration-v3/queue.json`
- Preserve at runtime: `.codex-tmp/avatar-regeneration-v3/history/v2-queue-before-reset.json`

- [ ] **Step 1: Write the failing queue test**

Assert the builder produces exactly 107 items: black/white for IDs 73–125 plus black only for ID 126. Assert no ID 63–72 appears, every item begins `pending`, prompts include `independent generation`, exact anatomy, complete margins, acid-green matte, no ordinary unmodified animal, and manual anatomy review.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test scripts/avatar-100/build-biomythical-queue.test.mjs`

Expected: FAIL because the builder does not exist.

- [ ] **Step 3: Implement `buildBiomythicalQueue`**

The exported builder returns:

```js
{
  version: 3,
  contract: 'biomythical-reset-2026-08-26',
  total: 107,
  completed: 0,
  items: [
    {
      id,
      variant,
      price,
      name,
      labelRu,
      prompt,
      status: 'pending',
      sourcePath: null,
      finalPath,
      completedAt: null,
    },
  ],
}
```

For ID 126 black, use the fixed prompt contract: same Imperial Astral Snow Leopard species, seated three-quarter pose distinct from the accepted light pose, four visible paws, black-diamond/champagne-gold mantle, no horror or standing pose.

- [ ] **Step 4: Run the queue test and verify GREEN**

Run: `node --test scripts/avatar-100/build-biomythical-queue.test.mjs`

Expected: PASS.

- [ ] **Step 5: Preserve V2 and write V3 runtime state**

Copy `.codex-tmp/avatar-regeneration-v2/queue.json` to the V3 history path if the history copy does not exist, then write the new queue and per-item prompt files under `.codex-tmp/avatar-regeneration-v3/prompts/`.

### Task 3: Update content names without changing prices or Russian labels

**Files:**
- Modify: `constants/custom_avatars.ts`
- Modify: `tests/avatar_showcase_html_contract.test.ts`

- [ ] **Step 1: Add a focused source contract**

Assert IDs 63–72 retain their original source lines, IDs 73–125 use the English names from `BIOMYTHICAL_AVATARS`, Russian labels and prices remain unchanged, ID 91 does not contain `Flamingo`, and ID 121 does not contain `Saiga`.

- [ ] **Step 2: Apply the name-only content migration**

Change only the English `name` fields for IDs 73–125. Do not change ID, Russian label, price, tier, collection, file path, purchase logic, or economy fields.

- [ ] **Step 3: Run lightweight source assertions**

Run the map/queue Node tests plus a direct Node source assertion. Do not start Jest or a full typecheck.

### Task 4: Replace the dark Absolute leopard first

**Files:**
- Create at runtime: `.codex-tmp/avatar-regeneration-v3/126/black/**`
- Replace after validation: `admin/v2/avatars/custom-idea-126-black.webp`
- Preserve: `admin/v2/avatars/custom-idea-126-white.webp`

- [ ] **Step 1: Generate one dark seated leopard**

Generate only one image call. Require a seated three-quarter pose, all four paws visible, tail fully visible, black-diamond fur/mantle, champagne-gold edges, no green in the subject, and generous matte margin.

- [ ] **Step 2: Process and inspect**

Run `finalize-independent-variant.mjs`, composite the result on warm-light and navy backgrounds, and inspect the processed 512×512 artwork for anatomy, fringe, and sitting pose.

- [ ] **Step 3: Validate the pair**

Stage the new dark with the existing accepted white file and run `validate-assets.mjs`. Reject if pair hashes/masks are too similar or either file fails.

- [ ] **Step 4: Promote with backup and update V3 queue**

Back up the active dark asset, copy the validated WebP, store hashes/checkpoint paths, and mark only `126-black` completed.

### Task 5: Regenerate IDs 73–125 sequentially

**Files:**
- Runtime sources/finals: `.codex-tmp/avatar-regeneration-v3/<id>/<variant>/**`
- Replace after validation: `admin/v2/avatars/custom-idea-<id>-<variant>.webp`
- Update runtime state: `.codex-tmp/avatar-regeneration-v3/queue.json`

- [ ] **Step 1: Work one variant at a time**

For the next pending item only: generate source, copy it to the checkpoint directory, finalize, validate, and composite on both intended/diagnostic backgrounds. Never invoke a second image generation before review finishes.

- [ ] **Step 2: Apply the manual anatomy gate**

Trace the body from head through torso to every limb/wing/tentacle/tail. Reject ambiguous coils, hidden extra limbs, fused paws, detached wings, forked bodies, uncut triangles, or an ordinary real-animal result lacking the declared fictional adaptation.

- [ ] **Step 3: Complete the pair before advancing**

After dark passes, independently generate light in the declared different pose. Run pair validation, preserve both previous active files, promote both validated results, and mark both queue items complete.

- [ ] **Step 4: Produce a browser contact sheet after every five pairs**

Build a lightweight static contact sheet from the ten active WebPs, start the visual-companion server only for review, show the user the URL, record feedback, then stop the server before returning to sequential generation.

- [ ] **Step 5: Repeat by price order**

Complete IDs 73–82, then 83–92, 93–102, 103–112, 113–122, and 123–125. Do not reuse rejected source art.

### Task 6: Final verification and showcase audit

**Files:**
- Modify only if counts/copy need correction: `showcase/index.html`
- Create runtime report: `.codex-tmp/avatar-regeneration-v3/final-report.json`

- [ ] **Step 1: Run lightweight asset and manifest gates**

Verify 64 pairs / 128 files, exact tier counts `10/10/10/10/10/10/3/1`, V3 queue `107/107`, ID 91 no flamingo, ID 121 no saiga, ID 126 dark and light both seated with different masks, and IDs 63–72 hashes unchanged from the V3 baseline.

- [ ] **Step 2: Build final price-grouped contact sheets**

Render every active pair on intended card backgrounds and high-contrast diagnostic backgrounds. Review full size and 20 px.

- [ ] **Step 3: Run focused Node tests**

Run map, queue, prompt, normalizer, alpha-audit, and validator Node tests only. Avoid global Jest, `tsc`, or builds unless the owner explicitly requests them.

- [ ] **Step 4: Inspect the showcase in the browser**

Confirm every file loads, filters work, no horizontal overflow appears at 375 px, and value progression remains clear without rainbow effects.

## Completion Criteria

- 107 V3 items completed and verified.
- Accepted 50-pearl files unchanged.
- No ordinary unmodified real animal above 50 pearls.
- No flamingo, saiga, human, humanoid, robot, machine, or mechanical creature.
- No crop, fringe, white triangle, broken anatomy, or duplicated body part.
- Dark/light pairs are independent generations.
- Dark and light Absolute leopards are both seated in visibly different poses.
- Production economy behavior remains unchanged.
