# Level Spin Rune Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the seven level-spin star illustrations with a premium, coherent family of rune-stone illustrations while preserving the existing reward identifiers and mechanics.

**Architecture:** Keep the static `stars_*` asset keys and file paths as compatibility identifiers. Generate one genuine-alpha rune source at a time, obtain owner approval, then materialize only the approved source as a 512×512 alpha WebP and update the matching visual manifest description.

**Tech Stack:** Built-in Codex image generation, Sharp, WebP with alpha, React Native static `require()`, Jest asset-contract tests.

---

### Task 1: Approve and Materialize the 10-Rune Asset

**Files:**
- Replace: `assets/images/level-spin-rewards/stars_10.webp`
- Modify after visual approval: `app/level_spin_reward_asset_manifest.ts`
- Verify: `tests/level_spin_reward_asset_manifest.test.ts`
- Verify: `tests/level_spin_reward_asset_validator.test.ts`
- Verify: `tests/level_spin_reward_assets.test.ts`

- [ ] **Step 1: Preserve the current production file**

Copy `stars_10.webp` to the ignored QA workspace `.codex-tmp/level-spin-runes/backup/stars_10.webp`. Do not remove or overwrite the production file before the replacement passes owner review.

- [ ] **Step 2: Generate exactly one source image**

Use built-in image generation with the current `stars_10.webp` as a material and framing reference, but replace the star object with one original fictional carved rune stone. Require genuine transparent alpha, 12–15% transparent padding, no star, no letters, no digits, no known historical rune, no background, no floor, no cast shadow, and no checkerboard.

- [ ] **Step 3: Verify the source metadata**

Use Sharp metadata and pixel inspection. Expected: square image, four channels, `hasAlpha=true`, all four corner alpha values equal zero, and nontransparent bounds separated from every canvas edge.

- [ ] **Step 4: Build visual QA without altering the source**

Composite the unchanged RGBA source at approximately 300 px and the intended reward-art size on black, white, `#14171A`, and saturated blue backgrounds. Inspect the original source at full size as well.

- [ ] **Step 5: Obtain owner approval**

Show the full-size source and the QA comparison. Do not generate `stars_20` and do not replace the production file until the owner approves this asset.

- [ ] **Step 6: Materialize the approved source**

Resize the approved source to 512×512 with alpha preserved and encode WebP at quality 74. Replace only `assets/images/level-spin-rewards/stars_10.webp`.

- [ ] **Step 7: Align the manifest description**

Replace the `stars_10` visual description in `app/level_spin_reward_asset_manifest.ts` with:

```ts
stars_10: reward('stars_10', 'stars', 'one simple obsidian rune stone with a shallow porcelain-carved glyph'),
```

- [ ] **Step 8: Run focused verification**

Acquire the shared heavy-process semaphore, then run:

```text
npx jest tests/level_spin_reward_asset_manifest.test.ts tests/level_spin_reward_asset_validator.test.ts tests/level_spin_reward_assets.test.ts --runInBand --forceExit
```

Expected: all selected suites pass. Release the semaphore in all outcomes.

- [ ] **Step 9: Commit the approved asset**

Stage only the approved WebP, manifest line, design, and plan files. Commit with message `feat: replace level spin star art with rune stone` when the repository index is available.

### Task 2: Repeat the Owner-Gated Workflow for Higher Rune Values

**Files:**
- Replace after individual approval: `assets/images/level-spin-rewards/stars_20.webp`
- Replace after individual approval: `assets/images/level-spin-rewards/stars_50.webp`
- Replace after individual approval: `assets/images/level-spin-rewards/stars_100.webp`
- Replace after individual approval: `assets/images/level-spin-rewards/stars_250.webp`
- Replace after individual approval: `assets/images/level-spin-rewards/stars_500.webp`
- Replace after individual approval: `assets/images/level-spin-rewards/stars_1000.webp`
- Modify after each approval: `app/level_spin_reward_asset_manifest.ts`

- [ ] **Step 1: Generate `stars_20` only after `stars_10` approval**

Use the approved `stars_10` source as the family reference. Add only a narrow champagne edge inset and a slightly thicker stone.

- [ ] **Step 2: Continue one asset at a time**

For `50`, `100`, `250`, `500`, and `1000`, repeat Task 1 metadata, full-size, four-background, small-size, owner-approval, WebP, manifest, and focused-test gates. Never batch or parallelize the image-generation calls.

- [ ] **Step 3: Run the final family audit**

Confirm exactly seven rune assets exist under the compatibility filenames, all are 512×512 WebP with alpha, none contains a star or baked text, and every file remains referenced by the static asset map.

