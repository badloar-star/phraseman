# Avatar Phenomena V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `executing-plans` to implement this plan task by task. Work in the current checkout; do not create a branch, worktree, fork, or delegated coding task unless the owner explicitly requests it.

**Goal:** Add 18 premium, non-sentient phenomenon avatars—three for every active shard price tier—with high-quality DALL-E art, Yin/Yang variants, and the existing full-size layered hex renderer.

**Architecture:** Keep the current Avatar100 collection intact and add a separate immutable `phenomena-v1` collection. Generate one raw image per call with Codex built-in image generation, checkpoint every result to an ignored folder, remove a saturated matte background, compress only final transparent WebP files into the hosted avatar folder, and resolve them through a static catalog plus generated fit table. Extend the customization/economy parsers and bot cosmetics contract without changing the client-authoritative purchase model.

**Tech Stack:** React Native/TypeScript, Firebase Hosting static assets, Node.js ESM scripts, Sharp, Jest, Codex built-in `image_gen`.

---

## Fixed product matrix

| ID | Price | English concept | Russian storefront name |
|---|---:|---|---|
| `custom-phen-01` | 70 | Spark Rain | Первая искра |
| `custom-phen-02` | 70 | Wind Spiral | Ветер перемен |
| `custom-phen-03` | 70 | Dawn Halo | Рассветная ясность |
| `custom-phen-04` | 100 | Ball Lightning | Заряд мысли |
| `custom-phen-05` | 100 | Moonbow | Лунный спектр |
| `custom-phen-06` | 100 | Fire Rainbow | Небесный импульс |
| `custom-phen-07` | 150 | Aurora Vortex | Полярное вдохновение |
| `custom-phen-08` | 150 | Volcanic Lightning | Грозовая воля |
| `custom-phen-09` | 150 | Diamond Dust | Алмазная тишина |
| `custom-phen-10` | 300 | Total Eclipse | Момент затмения |
| `custom-phen-11` | 300 | Supercell Core | Небесный натиск |
| `custom-phen-12` | 300 | Meteor Storm | Звёздный дождь |
| `custom-phen-13` | 500 | Crimson Nebula | Багровое рождение |
| `custom-phen-14` | 500 | Pulsar Crown | Ритм пульсара |
| `custom-phen-15` | 500 | Magnetar Flare | Магнитная буря |
| `custom-phen-16` | 1000 | Reality Rift | За гранью |
| `custom-phen-17` | 1000 | Heart of the Abyss | Сердце бездны |
| `custom-phen-18` | 1000 | Time Fracture | Вне времени |

Every row produces two files: `black` (Yin/dark) and `white` (Yang/light), for 36 final images total.

## Non-negotiable visual contract

- One non-sentient phenomenon only. No people, faces, eyes, animals, creatures, characters, mascots, buildings, tools, vehicles, typography, logos, or recognizable manufactured objects.
- Premium stylized cinematic 3D illustration, crisp material detail, controlled volumetric light, rich depth, and clean silhouette at small mobile size.
- Macro/full-frame composition. The phenomenon must occupy 90–100% of the standing hex safe area, touch the lower-V baseline, and remain visually strong at the top and side rails. No distant landscape, horizon, scenic framing, or empty lower half.
- The generated image contains no hexagon and no decorative background. It is rendered against one flat, fully saturated RGB matte color absent from the subject; the matte is removed locally.
- `black` and `white` variants preserve the same phenomenon, silhouette, framing, and energy flow. Only material/light polarity changes. Generate `black` first, then use the approved local `black` image as the reference for `white`.
- The price tier changes visual scale, not geometry: 70 is focused/minimal, 100 is rarer and brighter, 150 is layered, 300 is dramatic, 500 is cosmic, 1000 is reality-bending and most intricate.
- The real app hex gradient remains visible behind the transparent artwork. It is never baked into the DALL-E output.

## Shared generation prompt contract

Use the following base prompt for every first (`black`) image, replacing the bracketed fields with the fixed row data and its concept-specific description:

```text
Create a high-quality premium mobile-game avatar cutout of [PHENOMENON], price-tier visual intensity [TIER DESCRIPTION]. A single non-sentient natural or cosmic phenomenon, no character and no creature. Stylized cinematic 3D illustration, extremely refined forms, crisp micro-detail, controlled volumetric glow, deep material contrast, elegant energy flow, readable silhouette at 64 px. Macro close-up, centered and vertically powerful, filling 90–100% of a tall standing-hex safe area, reaching the bottom V baseline and nearly touching the upper and side boundaries, with no empty lower area. No landscape, no horizon, no distant scene. Dark Yin polarity: obsidian, charcoal, deep indigo and restrained luminous accents appropriate to the phenomenon. Isolated on one perfectly flat solid [MATTE HEX] background that does not appear anywhere in the subject. No hexagon, frame, border, pedestal, badge, text, letters, logo, face, eyes, human, animal, bird, insect, marine life, monster, mascot, plant, building, vehicle, weapon or manufactured object. Square image, polished production concept art, clean edges suitable for precise background removal.
```

Use this edit/reference prompt for the matching `white` image:

```text
Preserve the referenced phenomenon's exact identity, silhouette, energy flow, crop, scale, perspective, and placement. Convert only its visual polarity into a luminous Yang version: pearl white, pale gold, opalescent silver and restrained phenomenon-appropriate spectral accents. Keep the same premium stylized cinematic 3D quality and small-size readability. Keep the single perfectly flat solid [MATTE HEX] background. Do not add or remove components. No hexagon, frame, text, logo, face, eyes, character, human, animal, creature, plant, building, vehicle, weapon or manufactured object.
```

Reject an image if it contains a sentient reading, eye-like focal mark, recognizable object, baked scenery, matte contamination, weak lower anchoring, or a subject occupying less than 90% of the target silhouette.

## Task 1: Lock the catalog, version, and test expectations

**Files:**

- Create: `constants/avatar_phenomena_assets.ts`
- Create: `tests/avatar_phenomena_catalog.test.ts`
- Modify: `tests/customization_catalog.test.ts`
- Modify: `docs/superpowers/specs/2026-08-31-avatar-phenomena-v1-design.md`

- [ ] Add the high-quality rendering contract and fixed 36-image count to the approved design spec.
- [ ] Write `tests/avatar_phenomena_catalog.test.ts` first. Assert 18 unique IDs, exactly three items per price in `[70, 100, 150, 300, 500, 1000]`, two distinct hosted art URLs per item, and collection/version `phenomena-v1`.
- [ ] Update the expected storefront counts in `tests/customization_catalog.test.ts`: 70→8, 100→9, 150→9, 300→12, 500→6, 1000→5, total→49.
- [ ] Run the focused tests and confirm they fail because the new catalog is not integrated yet:

```powershell
npx jest tests/avatar_phenomena_catalog.test.ts tests/customization_catalog.test.ts --runInBand
```

Expected: new phenomena assertions fail; no unrelated suite is run.

- [ ] Implement `constants/avatar_phenomena_assets.ts` with immutable IDs, names, prices, `black`/`white` URLs under `/avatars/avatar-phenomena-v1/`, and art version `phenomena-v1`.
- [ ] Re-run the catalog-only test. It may pass while the storefront-count test remains red until Task 5.
- [ ] Commit only the task files:

```powershell
git commit --only constants/avatar_phenomena_assets.ts tests/avatar_phenomena_catalog.test.ts tests/customization_catalog.test.ts docs/superpowers/specs/2026-08-31-avatar-phenomena-v1-design.md -m "test(avatars): lock phenomena catalog contract"
```

## Task 2: Build the safe image-production workspace and validators

**Files:**

- Create: `scripts/avatar-phenomena/catalog.mjs`
- Create: `scripts/avatar-phenomena/validate-raw.mjs`
- Create: `scripts/avatar-phenomena/process-final.mjs`
- Create: `scripts/avatar-phenomena/build-fit-table.mjs`
- Create: `scripts/avatar-phenomena/build-contact-sheet.mjs`
- Create: `tests/avatar_phenomena_pipeline.test.ts`
- Runtime only, ignored: `.codex-tmp/avatar-phenomena-v1/**`

- [ ] Write pipeline tests first for exact catalog parity, path safety, required metadata, alpha output, dimensions, matte-edge detection, WebP size ceiling, SHA-256 generation, and immutable approved-entry behavior.
- [ ] Run:

```powershell
npx jest tests/avatar_phenomena_pipeline.test.ts --runInBand
```

Expected: fail because scripts do not exist.

- [ ] Create a single-source generation catalog containing all 18 rows, tier description, concept-specific prompt paragraph, and a matte color selected to be absent from that subject.
- [ ] Make `validate-raw.mjs` reject non-square or undersized files, unexpected format, missing checkpoint metadata, corrupt images, and excessive matte variance.
- [ ] Make `process-final.mjs` remove only the connected matte region, decontaminate fringe pixels, preserve internal glow, trim transparent margins conservatively, place the art on a standard square canvas, and encode final WebP at quality 76 with alpha.
- [ ] Make `build-fit-table.mjs` derive per-variant scale/offset from alpha bounds using `AVATAR100_TARGET_SILHOUETTE = 1` and `AVATAR100_TARGET_BOTTOM = 0.965`; write `constants/avatar_phenomena_fits.ts` deterministically.
- [ ] Make `build-contact-sheet.mjs` render each transparent output inside the real app gradient hex, with labels outside the artwork. It must create one tier sheet and one all-items sheet in `.codex-tmp/avatar-phenomena-v1/qa/`.
- [ ] Keep raw, rejected, QA, and manifests ignored. Only final compressed WebP assets enter `admin/v2/avatars/avatar-phenomena-v1/`.
- [ ] Re-run the pipeline test and require PASS.
- [ ] Commit only scripts and tests:

```powershell
git commit --only scripts/avatar-phenomena/catalog.mjs scripts/avatar-phenomena/validate-raw.mjs scripts/avatar-phenomena/process-final.mjs scripts/avatar-phenomena/build-fit-table.mjs scripts/avatar-phenomena/build-contact-sheet.mjs tests/avatar_phenomena_pipeline.test.ts -m "feat(avatars): add safe phenomena art pipeline"
```

## Task 3: Generate and checkpoint the 36 high-quality DALL-E renders

**Files:**

- Write runtime raw images: `.codex-tmp/avatar-phenomena-v1/raw/<id>/<ink>/source.png`
- Write runtime prompt records: `.codex-tmp/avatar-phenomena-v1/raw/<id>/<ink>/prompt.json`
- Write runtime decisions: `.codex-tmp/avatar-phenomena-v1/review/<id>-<ink>.json`

- [ ] Generate sequentially with the built-in `image_gen` capability only. Do not use an OpenAI project/user API key, local API script, batch endpoint, or parallel calls.
- [ ] For each ID, call image generation once for `black`. Immediately export the generated image to its exact raw path before making another image call.
- [ ] Inspect the local `black` image at original detail. Record acceptance/rejection with reasons. A rejected image remains under `.codex-tmp/avatar-phenomena-v1/rejected/`; never overwrite it.
- [ ] Use the accepted local `black` file as the image reference for one `white` edit/generation call. Preserve composition and silhouette. Export and inspect it immediately.
- [ ] Work in six price-tier batches, six images per batch. After the corresponding batch, run its exact validator command:

```powershell
node scripts/codex-safe-run.mjs -- node scripts/avatar-phenomena/validate-raw.mjs --tier 70
node scripts/codex-safe-run.mjs -- node scripts/avatar-phenomena/validate-raw.mjs --tier 100
node scripts/codex-safe-run.mjs -- node scripts/avatar-phenomena/validate-raw.mjs --tier 150
node scripts/codex-safe-run.mjs -- node scripts/avatar-phenomena/validate-raw.mjs --tier 300
node scripts/codex-safe-run.mjs -- node scripts/avatar-phenomena/validate-raw.mjs --tier 500
node scripts/codex-safe-run.mjs -- node scripts/avatar-phenomena/validate-raw.mjs --tier 1000
```

Expected: six accepted files, six prompt records, and zero validator failures for that tier.

- [ ] Generate the batches in this order: 70, 100, 150, 300, 500, 1000. Do not start the next batch until the current batch is checkpointed.
- [ ] After 36 accepted images, verify the checkpoint inventory:

```powershell
node scripts/codex-safe-run.mjs -- node scripts/avatar-phenomena/validate-raw.mjs --all
```

Expected: `18 ids, 36 accepted raw images, 36 prompt records, 0 missing`.

## Task 4: Produce transparent WebP assets, fit data, and the real-hex QA mockup

**Files:**

- Create final assets: `admin/v2/avatars/avatar-phenomena-v1/custom-phen-XX-black.webp`
- Create final assets: `admin/v2/avatars/avatar-phenomena-v1/custom-phen-XX-white.webp`
- Create: `constants/avatar_phenomena_fits.ts`
- Write ignored manifest: `.codex-tmp/avatar-phenomena-v1/approved-manifest.json`
- Write ignored QA: `.codex-tmp/avatar-phenomena-v1/qa/**`

- [ ] Process all accepted raw images through `process-final.mjs`; do not manually erase backgrounds.
- [ ] Run deterministic output and fit generation:

```powershell
node scripts/codex-safe-run.mjs -- node scripts/avatar-phenomena/process-final.mjs --all
node scripts/codex-safe-run.mjs -- node scripts/avatar-phenomena/build-fit-table.mjs
node scripts/codex-safe-run.mjs -- node scripts/avatar-phenomena/build-contact-sheet.mjs
```

- [ ] Verify 36 transparent WebP files, no loose PNGs in the hosted folder, no missing static asset URL, no edge matte halo, lower-V contact, no clipping beyond the upper-overlap allowance, and legibility at both 64 px and storefront size.
- [ ] Review all tier sheets and the all-items sheet on the ten real app hex gradients. Regenerate only rejected pairs, preserving every rejected attempt and decision record.
- [ ] Freeze `.codex-tmp/avatar-phenomena-v1/approved-manifest.json` with ID, price, both final prompts, raw/final paths, SHA-256 values, alpha bounds, fit values, and approval reason.
- [ ] Commit only approved final assets and generated fit data:

```powershell
git commit --only admin/v2/avatars/avatar-phenomena-v1 constants/avatar_phenomena_fits.ts -m "feat(avatars): add phenomena artwork"
```

## Task 5: Integrate the new art version and storefront prices with TDD

**Files:**

- Modify: `constants/custom_avatars.ts`
- Modify: `app/customization_catalog.ts`
- Modify: `modules/phone-state/domains/economy.ts`
- Modify: `app/level_spin_star_grants.ts`
- Modify: `tests/customization_catalog.test.ts`
- Modify: `tests/customization_purchase_validation.test.ts`
- Modify: `tests/customization_rune_operation.test.ts`
- Modify: `tests/customization_selection_journal.test.ts`
- Modify: `tests/level_spin_star_grants.test.ts`

- [ ] Add failing round-trip tests for `custom-phen-01:black:phenomena-v1`, `custom-phen-18:white:phenomena-v1`, owned-style serialization, and exact purchase receipt preservation.
- [ ] Assert that each phenomenon appears once in `CUSTOM_AVATARS`, once in `CUSTOM_AVATAR_SHOP`, has its fixed price, and defaults to `phenomena-v1` without changing any existing Avatar100 or showcase value.
- [ ] Run only the focused catalog/economy tests and confirm RED:

```powershell
npx jest tests/avatar_phenomena_catalog.test.ts tests/customization_catalog.test.ts tests/customization_purchase_validation.test.ts tests/customization_rune_operation.test.ts tests/customization_selection_journal.test.ts tests/level_spin_star_grants.test.ts --runInBand
```
- [ ] Extend `CustomAvatarArtVersion`, `normalizeCustomAvatarArtVersion`, catalog construction, shop-ID membership, purchase result types, regex parsers, and star-grant parsing for `phenomena-v1`.
- [ ] Derive the default art version from each avatar's collection; do not assign Avatar100 version to all shop items.
- [ ] Preserve the economy constitution: one idempotent composite operation still binds the exact price debit to the avatar entitlement; no server balance check, standalone debit, direct `users/{uid}.shards` write, rollback, or LWW balance overwrite is introduced.
- [ ] Re-run focused tests and require PASS.
- [ ] Confirm with a targeted search that Jarvis reads no changed field/collection. If it does, update its fetcher and `functions/src/jarvis/jarvis_data_contract_guard.test.ts` in the same task.
- [ ] Commit only integration and focused tests:

```powershell
git commit --only constants/custom_avatars.ts app/customization_catalog.ts modules/phone-state/domains/economy.ts app/level_spin_star_grants.ts tests/customization_catalog.test.ts tests/avatar_phenomena_catalog.test.ts tests/customization_purchase_validation.test.ts tests/customization_rune_operation.test.ts tests/customization_selection_journal.test.ts tests/level_spin_star_grants.test.ts -m "feat(avatars): sell phenomena collection"
```

## Task 6: Reuse the production layered hex renderer

**Files:**

- Modify: `components/Avatar100Portrait.tsx`
- Modify: `components/CustomAvatarBadge.tsx`
- Create: `tests/avatar_phenomena_renderer_geometry.test.ts`

- [ ] Write geometry tests first. For all 36 variants assert a fit exists, target silhouette is `1`, target bottom is `0.965`, the body is clipped by the lower V, the upper layer overlaps rails by no more than 20%, and no variant falls back to the legacy flat-image branch.
- [ ] Run the new renderer test and confirm RED.
- [ ] Add a collection-neutral artwork-fit resolver that checks Avatar100 and phenomena fit tables. Preserve the existing `avatar100FitFor` export as a compatibility alias if callers rely on it.
- [ ] Keep the existing render order: real gradient hex → clipped body layer → lower V rail → controlled upper-overlap layer.
- [ ] Do not create a second hex component and do not bake any gradient into the art.
- [ ] Run both renderer suites:

```powershell
npx jest tests/avatar100_renderer_geometry.test.ts tests/avatar_phenomena_renderer_geometry.test.ts --runInBand
```

Expected: PASS, with existing Avatar100 counts unchanged.

- [ ] Commit only renderer files and tests:

```powershell
git commit --only components/Avatar100Portrait.tsx components/CustomAvatarBadge.tsx tests/avatar_phenomena_renderer_geometry.test.ts -m "feat(avatars): render phenomena in production hexes"
```

## Task 7: Keep bot cosmetics and purchase contracts in sync

**Files:**

- Modify: `functions/src/bot_cosmetics.ts`
- Modify: `functions/src/bot_cosmetics.test.ts`
- Modify focused purchase-contract tests if their exhaustive unions require the new art version

- [ ] Add failing tests that the bot-sellable pool contains every currently sold Avatar100 and phenomenon ID exactly once, excludes unsold legacy IDs, and emits `phenomena-v1` for phenomenon values.
- [ ] Replace numeric-only assumptions with an explicit sellable-ID pool that preserves all current bot avatars and adds the 18 phenomena. Do not infer a phenomenon ID from numeric ranges.
- [ ] Confirm bot values parse through the same art-version contract as user-owned values.
- [ ] Run:

```powershell
npx jest functions/src/bot_cosmetics.test.ts --runInBand
```

Expected: PASS after implementation.

- [ ] Run focused purchase/economy contract tests found in Task 5 and require PASS.
- [ ] Commit only bot and contract-test files:

```powershell
git commit --only functions/src/bot_cosmetics.ts functions/src/bot_cosmetics.test.ts -m "feat(avatars): include phenomena in bot cosmetics"
```

## Task 8: Focused verification, asset audit, and deployment handoff

**Files:**

- Verify all files above; do not modify unrelated dirty files.

- [ ] Run a literal-reference audit: every bundled file in `admin/v2/avatars/avatar-phenomena-v1/` must have a matching catalog URL; every catalog URL must resolve to one file. Expected: 36↔36.
- [ ] Run a checksum/alpha/dimensions audit using the immutable approved manifest. Expected: zero drift.
- [ ] Run all narrow new/changed tests under one shared heavy-process slot:

```powershell
bash .claude/semaphore/slot.sh acquire "jest (avatar phenomena focused verification)"
npx jest tests/avatar_phenomena_catalog.test.ts tests/avatar_phenomena_pipeline.test.ts tests/customization_catalog.test.ts tests/customization_purchase_validation.test.ts tests/customization_rune_operation.test.ts tests/customization_selection_journal.test.ts tests/level_spin_star_grants.test.ts tests/avatar100_renderer_geometry.test.ts tests/avatar_phenomena_renderer_geometry.test.ts functions/src/bot_cosmetics.test.ts --runInBand
bash .claude/semaphore/slot.sh release
```

Release the slot even if Jest fails. Do not run the whole Jest suite or full `tsc --noEmit` automatically.

- [ ] Run `git diff --check` on the task paths and inspect `git status --short` to verify unrelated user changes remain untouched.
- [ ] Open the final all-items real-hex contact sheet for owner review and report exact asset count, size range, test command/result, and manifest path.
- [ ] Do not deploy production or Firebase Hosting without a new explicit owner request. Static files become deployable through the existing hosting path only after owner visual approval.

## Completion criteria

- 18 new purchasable phenomenon avatars exist, exactly three at each active price tier.
- All 36 Yin/Yang images are high-quality, non-sentient, transparent, compressed WebP assets with immutable prompts and hashes.
- Every phenomenon fills the production hex, anchors to the lower V, and uses the existing real gradient background/layering.
- Existing 31 Avatar100 products and all legacy behavior remain intact.
- Purchase serialization, exact price/entitlement receipts, star grants, and bot cosmetics recognize `phenomena-v1` without weakening economy guards.
- Focused catalog, pipeline, renderer, economy, and bot tests pass.
- The owner receives a final real-hex contact sheet before any production deployment.
