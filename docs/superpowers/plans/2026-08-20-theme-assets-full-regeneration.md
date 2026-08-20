# Theme Assets Full Regeneration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every connected theme-switching raster slot with a coherent nine-theme soft-3D material set, while deleting four legacy themes and four owner-retired image families without removing their live functionality.

**Architecture:** A deterministic source-first auditor builds the exact slot matrix from static `require()` consumers. Runtime cleanup reduces `ThemeMode` to nine values and substitutes code-native fallbacks for retired raster families. A file-backed prompt/checkpoint pipeline then generates, compresses, wires, and verifies one asset family at a time without using a project OpenAI API key or accumulating a large in-thread image batch.

**Tech Stack:** React Native/Expo, TypeScript, Node.js ESM scripts, Jest, static Metro `require()`, built-in Codex image generation, Sharp/WebP.

**Design spec:** `docs/superpowers/specs/2026-08-20-theme-assets-full-regeneration-design.md`

**Execution mode:** Inline execution in the current checkout. Do not create a branch, worktree, or delegated coding session. Preserve unrelated staged and unstaged changes.

---

## File responsibility map

- `scripts/theme_assets/audit-theme-assets.mjs` — read-only source and filesystem scanner; emits the slot matrix and violations.
- `scripts/theme_assets/theme-asset-config.mjs` — nine live theme ids, four migration tombstones, retired raster families, scan roots, and generated-report paths.
- `scripts/theme_assets/build-prompt-manifest.mjs` — converts the audited matrix plus the style lock into one canonical prompt and nine variant prompts per slot.
- `scripts/theme_assets/verify-generated-family.mjs` — checks exact files, dimensions, format, alpha policy, compression, hashes, and static wiring for one family.
- `config/theme-asset-style-lock.json` — theme material overrides and global image constraints.
- `tests/theme_asset_audit.test.ts` — deterministic scanner unit/contract tests.
- `tests/live_theme_contract.test.ts` — exactly nine runtime themes plus string-only migration tombstones.
- `tests/retired_theme_raster_families.test.ts` — no static requires or bundled files for retired image families.
- `tests/theme_asset_matrix_contract.test.ts` — nine distinct files per connected slot and no live-theme aliases.
- `components/ThemeContext.tsx` and `constants/theme.ts` — runtime theme union, palette map, and persisted-value migration.
- `constants/*Theme*.ts`, `constants/*IconAssets.ts`, `app/*theme*.ts`, `app/*assets.ts`, `components/**/*Theme*.ts` — exhaustive nine-theme maps.
- `components/feedback/RetiredRasterFallback.tsx` — code-native neutral fallback for owner-retired raster surfaces.
- `constants/levelGiftRewardIcons.ts`, `constants/boonIconAssets.ts`, `constants/dailyPhraseThemeArt.ts`, `constants/leagueBonusGiftImages.ts` — retired raster registries to remove or reduce to code-native contracts.
- `.codex-tmp/theme-assets-v2/` — ignored generated manifests, prompts, source PNGs, QA sheets, checkpoints, and logs.
- `assets/images/**` — final statically wired compressed WebP only.

### Task 1: Add the deterministic source-first asset auditor

**Files:**
- Create: `scripts/theme_assets/theme-asset-config.mjs`
- Create: `scripts/theme_assets/audit-theme-assets.mjs`
- Create: `tests/theme_asset_audit.test.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing auditor contract**

Create `tests/theme_asset_audit.test.ts` with fixtures in a temporary directory. Assert that the scanner:

```ts
expect(report.liveThemes).toEqual([
  'indigo', 'sagePorcelain', 'olive', 'midnight', 'ember',
  'aurora', 'volt', 'dark', 'gold',
]);
expect(report.slots['sample/menu']).toEqual({
  indigo: 'assets/images/sample/indigo/menu.webp',
  sagePorcelain: 'assets/images/sample/sagePorcelain/menu.webp',
  olive: 'assets/images/sample/olive/menu.webp',
  midnight: 'assets/images/sample/midnight/menu.webp',
  ember: 'assets/images/sample/ember/menu.webp',
  aurora: 'assets/images/sample/aurora/menu.webp',
  volt: 'assets/images/sample/volt/menu.webp',
  dark: 'assets/images/sample/dark/menu.webp',
  gold: 'assets/images/sample/gold/menu.webp',
});
expect(report.violations).toEqual([]);
```

Add negative fixture assertions for a missing file, a duplicate path shared by two live themes, a legacy theme key, and a retired raster family.

- [ ] **Step 2: Run the test and confirm RED**

Run:

```powershell
npx jest --runTestsByPath tests/theme_asset_audit.test.ts --no-cache --runInBand
```

Expected: FAIL because `scripts/theme_assets/audit-theme-assets.mjs` does not exist.

- [ ] **Step 3: Implement the scanner and shared config**

Export these exact constants from `theme-asset-config.mjs`:

```js
export const LIVE_THEMES = Object.freeze([
  'indigo', 'sagePorcelain', 'olive', 'midnight', 'ember',
  'aurora', 'volt', 'dark', 'gold',
]);
export const LEGACY_THEME_TOMBSTONES = Object.freeze([
  'minimalDark', 'candyBlue', 'business', 'businessLight',
]);
export const RETIRED_RASTER_PREFIXES = Object.freeze([
  'assets/images/level_gifts/',
  'assets/images/level_gift_reward_icons/',
  'assets/images/league_bonus/',
  'assets/images/weekly_boon_icons/',
  'assets/images/trainer_theme_icons/',
]);
export const SOURCE_ROOTS = Object.freeze([
  'app', 'components', 'constants', 'hooks', 'lib', 'modules',
]);
```

The scanner must parse literal static `require()` paths, associate them with `Record<ThemeMode, ...>` or explicit `themeMode` branches, normalize separators, validate disk existence, and write JSON/Markdown only when `--out-dir` is supplied. Export a pure `auditThemeAssets({ rootDir, sourceRoots })` for Jest.

- [ ] **Step 4: Add the narrow command**

Add to `package.json`:

```json
"assets:audit:themes": "node scripts/theme_assets/audit-theme-assets.mjs --root . --out-dir .codex-tmp/theme-assets-v2/audit"
```

- [ ] **Step 5: Run GREEN and capture the baseline**

Run:

```powershell
npx jest --runTestsByPath tests/theme_asset_audit.test.ts --no-cache --runInBand
npm run assets:audit:themes
```

Expected: Jest PASS; audit command exits non-zero while reporting the current legacy keys, aliases, missing theme variants, and retired families under `.codex-tmp/theme-assets-v2/audit/`.

- [ ] **Step 6: Commit only Task 1 files**

```powershell
git add -- scripts/theme_assets/theme-asset-config.mjs scripts/theme_assets/audit-theme-assets.mjs tests/theme_asset_audit.test.ts package.json
git commit --only -m "test: add themed asset auditor" -- scripts/theme_assets/theme-asset-config.mjs scripts/theme_assets/audit-theme-assets.mjs tests/theme_asset_audit.test.ts package.json
```

### Task 2: Lock the nine-theme runtime and migration tombstones

**Files:**
- Create: `tests/live_theme_contract.test.ts`
- Modify: `constants/theme.ts`
- Modify: `components/ThemeContext.tsx`
- Modify: `app/theme_access_policy.ts`
- Modify: `tests/theme_context_default.test.ts`
- Modify: `tests/removed_theme_assets_contract.test.ts`
- Remove after zero consumers: `constants/flatDesign.ts`
- Remove after zero consumers: `constants/monoIcon.ts`

- [ ] **Step 1: Write the failing live-theme guard**

Assert the exact union and tombstone-only compatibility:

```ts
expect(themeSource).toMatch(
  /export type ThemeMode = 'dark' \| 'gold' \| 'olive' \| 'midnight' \| 'ember' \| 'aurora' \| 'volt' \| 'indigo' \| 'sagePorcelain';/,
);
for (const removed of ['minimalDark', 'candyBlue', 'business', 'businessLight']) {
  expect(themeSource).not.toContain(`'${removed}'`);
  expect(contextSource).toContain(`'${removed}'`);
}
expect(contextSource).toContain("const DEFAULT_THEME_MODE: ThemeMode = 'indigo'");
```

Also assert that each removed string appears in `ThemeContext.tsx` only inside `REMOVED_THEME_MODES` and never in `THEME_MAP`, `isFlat`, preview, or access policy.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runTestsByPath tests/live_theme_contract.test.ts tests/theme_context_default.test.ts tests/theme_access_policy.test.ts --no-cache --runInBand
```

Expected: FAIL because `ThemeMode` still has thirteen entries.

- [ ] **Step 3: Shrink the core theme contract**

In `constants/theme.ts`, delete the four palette exports/imports and use the exact nine-value union above. In `ThemeContext.tsx`, remove their `THEME_MAP` entries and flat-mode branches while retaining their raw strings in `REMOVED_THEME_MODES`; all four persist to `indigo` via `DEFAULT_THEME_MODE`.

- [ ] **Step 4: Remove flat business-only helpers after consumers are gone**

Replace `monoIconColor(...)` consumers with the original theme color path. Replace `isFlat` branches with the normal nine-theme layout. Verify zero imports before deleting:

```powershell
rg -n "flatDesign|monoIcon|isFlatMode|businessLight|minimalDark|candyBlue" app components constants hooks lib modules
```

Expected: only migration tombstones and unrelated English-learning uses of the word `business` remain.

- [ ] **Step 5: Run GREEN**

Run the Task 2 Jest command again. Expected: PASS.

- [ ] **Step 6: Commit Task 2**

Commit only the explicitly modified theme-core files with message:

```text
refactor: remove four legacy interface themes
```

### Task 3: Make every theme-dependent code map exhaustive over nine themes

**Files:**
- Modify: `app/coin_icons.ts`
- Modify: `app/home_last_lesson_assets.ts`
- Modify: `app/home_menu_icons.ts`
- Modify: `app/personal_plan_task_visuals.ts`
- Modify: `app/season_pass_theme_backgrounds.ts`
- Modify: `components/ReferralInviteBannerArt.tsx`
- Modify: `components/tournament/tournament_theme_assets.ts`
- Modify: `constants/generatedThemeIconAssets.ts`
- Modify: `constants/socialIconAssets.ts`
- Modify: `constants/streakIconAssets.ts`
- Modify: `constants/weeklyCompassIcons.ts`
- Modify: `constants/screenBackground.ts`
- Modify: `constants/statsThemeChrome.ts`
- Modify: `constants/themedToastChrome.ts`
- Modify: `constants/weekDotTheme.ts`
- Modify: `constants/leagueBonusPalette.ts`
- Modify: `constants/seasonPassRewardGradients.ts`
- Test: `tests/live_theme_contract.test.ts`

- [ ] **Step 1: Extend RED assertions to all source maps**

For every file above, assert no legacy theme keys and require `Record<ThemeMode, ...>` where the map is expected to be exhaustive. Assert fallbacks use `.indigo` rather than `.minimalDark`.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runTestsByPath tests/live_theme_contract.test.ts tests/currency_icon_assets_contract.test.ts tests/streak_icon_assets.test.ts tests/season_pass_theme_backgrounds_contract.test.ts tests/tournament_theme_personalization_contract.test.ts --no-cache --runInBand
```

Expected: FAIL on legacy keys/fallbacks.

- [ ] **Step 3: Remove four legacy entries and normalize fallbacks**

Update each exhaustive map to the nine live themes. Do not alias one live theme to another. Where a separate file is not yet available, keep the current file temporarily only in the staging manifest; the runtime map must be completed in the same commit that adds its final asset.

- [ ] **Step 4: Run GREEN**

Run the Task 3 Jest command. Expected: PASS with no TypeScript transform errors.

- [ ] **Step 5: Commit Task 3**

```text
refactor: normalize live theme asset registries
```

### Task 4: Remove owner-retired raster registries without deleting behavior

**Files:**
- Create: `components/feedback/RetiredRasterFallback.tsx`
- Create: `tests/retired_theme_raster_families.test.ts`
- Modify: `components/DailyPhraseCard.tsx`
- Modify: `components/LevelGiftDualModal.tsx`
- Modify: `components/LevelGiftModal.tsx`
- Modify: `components/LeagueBonusAvailableModal.tsx`
- Modify: `components/LeagueChestOpenModal.tsx`
- Modify: `components/WeeklyBoonDetailModal.tsx`
- Modify: `components/celebration/BoonActivatedHybrid.tsx`
- Modify: `constants/levelGiftRewardIcons.ts`
- Modify or remove: `constants/boonIconAssets.ts`
- Remove: `constants/dailyPhraseThemeArt.ts`
- Remove: `constants/leagueBonusGiftImages.ts`
- Modify: `scripts/verify_weekly_boon_assets.mjs`
- Modify: `package.json`
- Modify: `tests/boon_icon_assets.test.ts`
- Modify: `tests/daily_phrase_locale.test.ts`
- Modify: `tests/league_bonus_gift_images.test.ts`
- Modify: `tests/level_gift_images.test.ts`
- Modify: `tests/level_gift_modal_theme_contract.test.ts`
- Modify: `tests/onboarding_graphite_level_gift_assets.test.ts`
- Modify: `tests/onboarding_graphite_league_bonus_chest_asset.test.ts`

- [ ] **Step 1: Write the failing retired-family guard**

Walk working source roots and `assets/images`. Assert zero static references and zero files under all five `RETIRED_RASTER_PREFIXES`. Assert `DailyPhraseCard` does not import `dailyPhraseThemeArtSource`, and boon/league/level-gift components render `RetiredRasterFallback` or an existing code-native icon.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runTestsByPath tests/retired_theme_raster_families.test.ts tests/daily_phrase_quest_card_contract.test.ts tests/boon_icon_assets.test.ts tests/league_bonus_gift_images.test.ts tests/level_gift_modal_theme_contract.test.ts --no-cache --runInBand
```

Expected: FAIL on the existing imports and files.

- [ ] **Step 3: Implement a neutral code-native fallback**

`RetiredRasterFallback` accepts only:

```ts
type RetiredRasterFallbackProps = {
  kind: 'gift' | 'league' | 'boon';
  size: number;
  color: string;
  accessibilityLabel?: string;
};
```

Render deterministic React Native `View` geometry and an existing vector icon; do not add a raster file, emoji, text-in-image, network URL, animation magic number, or new feature behavior.

- [ ] **Step 4: Remove bitmap imports while preserving logic**

Keep reward grants, boon identifiers, league results, Daily Phrase XP/questions/save behavior, and accessibility labels. Remove only image-source selection.

- [ ] **Step 5: Retire the boon pretest**

Delete `assets:verify:boons` from `pretest` and remove the obsolete verifier only after `retired_theme_raster_families.test.ts` owns the no-raster contract. Preserve any unrelated pretest commands.

- [ ] **Step 6: Run GREEN**

Run the Task 4 command. Expected: PASS.

- [ ] **Step 7: Commit code before deleting binaries**

```text
refactor: retire gift and daily raster art
```

### Task 5: Delete the approved legacy and retired image files safely

**Files:**
- Delete only paths enumerated by `.codex-tmp/theme-assets-v2/audit/deletions-approved.json`.
- Test: `tests/removed_theme_assets_contract.test.ts`
- Test: `tests/retired_theme_raster_families.test.ts`

- [ ] **Step 1: Generate and inspect the exact deletion manifest**

Run the auditor with `--deletions` and require each path to satisfy at least one predicate:

```text
contains a full legacy theme path/name token
OR starts with a RETIRED_RASTER_PREFIX
```

The manifest must include resolved absolute paths and prove every target is beneath `assets/images`.

- [ ] **Step 2: Verify zero remaining static consumers**

```powershell
npm run assets:audit:themes
```

Expected: no `consumerStillReferencesDeletion` violations.

- [ ] **Step 3: Delete only exact validated manifest paths**

Use one PowerShell process end-to-end. Resolve each literal path, confirm it starts with the resolved `assets/images` root, then call `Remove-Item -LiteralPath` without recursion for files. Remove now-empty approved directories only after resolving and checking each directory.

- [ ] **Step 4: Run deletion guards**

```powershell
npx jest --runTestsByPath tests/removed_theme_assets_contract.test.ts tests/retired_theme_raster_families.test.ts tests/live_theme_contract.test.ts --no-cache --runInBand
```

Expected: PASS and zero approved-family files.

- [ ] **Step 5: Commit exact deletions**

```text
chore: remove retired themed image files
```

### Task 6: Add the style lock and deterministic prompt/checkpoint manifest

**Files:**
- Create: `config/theme-asset-style-lock.json`
- Create: `scripts/theme_assets/build-prompt-manifest.mjs`
- Create: `tests/theme_asset_prompt_manifest.test.ts`

- [ ] **Step 1: Write RED tests for prompt invariants**

For each slot and theme, assert the prompt contains:

```ts
expect(prompt).toContain('no text, letters, numbers, logos, or watermark');
expect(prompt).toContain('preserve silhouette, camera angle, scale, light direction, and safe area');
expect(prompt).toContain(styleLock.themes[theme].materials);
expect(prompt.output).toMatch(/^\.codex-tmp\/theme-assets-v2\/staging\//);
```

Assert nine distinct outputs and a stable SHA-256 idempotency key derived from slot id, prompt, target dimensions, and theme.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runTestsByPath tests/theme_asset_prompt_manifest.test.ts --no-cache --runInBand
```

- [ ] **Step 3: Add the approved C material table**

Encode the exact nine material directions from the design spec in `config/theme-asset-style-lock.json`, plus global constraints, `webpQualityMin: 58`, `webpQualityMax: 80`, and `liveThemeCount: 9`.

- [ ] **Step 4: Implement prompt generation and checkpoints**

Input is the clean audit matrix. Output JSONL contains `slotId`, `family`, `theme`, `canonicalPrompt`, `themePrompt`, `width`, `height`, `alphaPolicy`, `output`, `sha256`, and `status: "pending"`.

- [ ] **Step 5: Run GREEN and build the manifest**

```powershell
npx jest --runTestsByPath tests/theme_asset_prompt_manifest.test.ts --no-cache --runInBand
node scripts/theme_assets/build-prompt-manifest.mjs --audit .codex-tmp/theme-assets-v2/audit/theme-assets.json --out .codex-tmp/theme-assets-v2/prompts.jsonl
```

Expected: PASS and exactly nine prompt rows per audited slot.

- [ ] **Step 6: Commit Task 6**

```text
feat: add themed asset style and prompt contract
```

### Task 7: Regenerate primary navigation and learning-entry families

**Families:**
- `home_menu`
- `home_last_lesson`
- `generated_theme_icons`
- `weekly_compass_icons`
- connected learning/menu slots reported by the clean audit

**Files:**
- Modify the corresponding static registries under `app/` and `constants/`.
- Replace final wired files under their existing `assets/images/<family>/...` paths.
- Modify: `tests/onboarding_graphite_default_theme_assets.test.ts`
- Modify: `tests/season_pass_theme_backgrounds_contract.test.ts`
- Modify: `tests/tournament_theme_personalization_contract.test.ts`

- [ ] **Step 1: Freeze one canonical reference per logical slot**

Generate preview-only base candidates with built-in Codex image generation. Inspect in the actual tile frame and record the selected source path/hash in the JSONL checkpoint.

- [ ] **Step 2: Generate nine separate theme variants per selected slot**

Use the prompt manifest one call per asset. Never use project/user API credentials. Work in small batches, export immediately, and compact/freshen the session before base64 accumulation becomes large.

- [ ] **Step 3: Post-process and stage**

Use Sharp to crop without distortion, preserve alpha, and compress within the style-lock quality range. Do not overwrite the runtime file yet.

- [ ] **Step 4: Verify family**

Run `verify-generated-family.mjs --family <family>` and inspect the generated contact sheet for semantic, silhouette, angle, small-size legibility, forbidden text, and theme material identity.

- [ ] **Step 5: Wire and replace only after GREEN**

Move final WebP files into already-static paths or add the static `require()` in the same commit. Re-run home/menu focused tests.

- [ ] **Step 6: Commit each family separately**

Use `assets: regenerate <family> theme set` and never mix two unreviewed families in one commit.

### Task 8: Regenerate progress, currency, social, and utility families

**Families:**
- `streak_icons`
- `currency`
- connected energy icons
- `social_icons`
- connected settings/referral theme art

- [ ] **Step 1: Freeze canonical references for progress and utility slots**

Generate built-in preview candidates for each logical slot, inspect them at actual runtime size, and write the accepted source path/hash to the JSONL checkpoint.

- [ ] **Step 2: Generate nine separate variants per accepted slot**

Use one built-in image generation call per prompt-manifest row. Export every result immediately to `.codex-tmp/theme-assets-v2/staging/<family>/<theme>/`; do not use any project or user API credential.

- [ ] **Step 3: Post-process without overwriting runtime files**

Use Sharp to crop without distortion, preserve the declared alpha policy, and compress to WebP quality 58–80. Keep runtime assets untouched until the verifier passes.

- [ ] **Step 4: Verify semantic invariants**

Run `verify-generated-family.mjs` for each family and inspect its contact sheet. Require:

```text
streak level semantics stay ordered and distinguishable
currency silhouette remains identical across all balances
social friend/chat meanings never swap
Volt lime details never contain white foreground symbols
```

- [ ] **Step 5: Wire and replace verified files**

Move only verified WebP finals into their statically required paths, then run the focused Jest command below.

- [ ] **Step 6: Commit one family at a time**

Use `assets: regenerate <family> theme set`; never combine unreviewed families.

Run focused tests:

```powershell
npx jest --runTestsByPath tests/streak_icon_assets.test.ts tests/streak_icon_theme_palette.test.ts tests/currency_icon_assets_contract.test.ts tests/referral_invite_banner_theme_assets.test.ts --no-cache --runInBand
```

### Task 9: Regenerate personal-plan and flashcard families

**Families:**
- `personal_plan_tasks_fit`
- connected `flashcards/mode_icons`
- connected theme-switching `flashcard_backs`

- [ ] **Step 1: Freeze canonical references for every audited task, route, mode, and back slot**

Inspect each candidate in its actual personal-plan or flashcard frame. Record the accepted source/hash; preserve the exact semantic key and do not add speculative variants.

- [ ] **Step 2: Generate nine variants per accepted slot**

Use the prompt manifest and built-in generation one output at a time. Export immediately to `.codex-tmp/theme-assets-v2/staging/`.

- [ ] **Step 3: Post-process to each slot contract**

Crop without distortion, preserve alpha where declared, compress to WebP quality 58–80, and leave runtime files unchanged until verification.

- [ ] **Step 4: Verify family parity and semantics**

Run `verify-generated-family.mjs` for `personal_plan_tasks_fit`, `flashcards/mode_icons`, and theme-switching `flashcard_backs`. Require nine distinct outputs per audited slot and inspect contact sheets for task/route meaning.

- [ ] **Step 5: Wire verified files and run focused tests**

Move verified finals into statically required paths, then run:

```powershell
npx jest --runTestsByPath tests/midnight_flashcards_mode_icon_assets.test.ts tests/flashcard_back_ota_assets.test.ts tests/personal_plan_review_fixes_contract.test.ts --no-cache --runInBand
```

Expected: PASS and nine unique files for every audited live slot.

- [ ] **Step 6: Commit one verified family at a time**

Use `assets: regenerate personal plan theme set`, `assets: regenerate flashcard mode theme set`, and `assets: regenerate flashcard back theme set` as separate commits.

### Task 10: Regenerate season and tournament families

**Families:**
- connected `season/backgrounds`
- connected theme-dependent season art identified by the auditor
- `tournament/themes`

- [ ] **Step 1: Freeze canonical season and tournament references**

Generate preview candidates, inspect them in the real season/tournament frames and safe areas, and checkpoint the accepted source/hash for every audited slot.

- [ ] **Step 2: Generate nine separate variants per slot**

Use built-in image generation one prompt row at a time and export immediately to `.codex-tmp/theme-assets-v2/staging/`.

- [ ] **Step 3: Post-process backgrounds and cutouts to their separate contracts**

Preserve background aspect ratios without stretching; preserve alpha for isolated tournament objects; compress to WebP quality 58–80.

- [ ] **Step 4: Verify safe areas, parity, and theme identity**

Run `verify-generated-family.mjs` for each season and tournament family and inspect contact sheets. Do not touch `components/tournament/TournamentBackdrop.tsx` by replacement or rollback; edit only exact current lines if static wiring requires it.

- [ ] **Step 5: Wire verified files and run focused tests**

Move only verified finals into statically required paths, then run:

```powershell
npx jest --runTestsByPath tests/season_pass_theme_backgrounds_contract.test.ts tests/season_aura_asset_safe_area.test.ts tests/tournament_theme_personalization_contract.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit season and tournament families separately**

Use `assets: regenerate season theme set` and `assets: regenerate tournament theme set`.

### Task 11: Enforce the final nine-by-slot matrix

**Files:**
- Create: `tests/theme_asset_matrix_contract.test.ts`
- Create: `scripts/theme_assets/verify-generated-family.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write RED final-matrix assertions**

Assert for every slot:

```ts
expect(Object.keys(slot.sources).sort()).toEqual([...LIVE_THEMES].sort());
expect(new Set(Object.values(slot.sources))).toHaveLength(9);
expect(slot.missing).toEqual([]);
expect(slot.legacyReferences).toEqual([]);
```

- [ ] **Step 2: Add deterministic image metadata verification**

Use Sharp metadata to validate dimensions, WebP format, alpha policy, and non-zero file size. Hash every final file into the audit report.

- [ ] **Step 3: Add narrow commands**

```json
"assets:verify:themes": "node scripts/theme_assets/audit-theme-assets.mjs --root . --check && jest --runTestsByPath tests/live_theme_contract.test.ts tests/retired_theme_raster_families.test.ts tests/theme_asset_matrix_contract.test.ts --no-cache --runInBand"
```

- [ ] **Step 4: Run GREEN**

```powershell
npm run assets:verify:themes
```

Expected: exit 0; no missing, alias, legacy, retired-family, format, dimension, alpha, or wiring violations.

- [ ] **Step 5: Commit final guards**

```text
test: enforce complete live theme asset matrix
```

### Task 12: Final focused runtime and worktree verification

**Files:**
- Update only tests proven stale by the approved contract.
- Write final bulky logs to `.codex-tmp/theme-assets-v2/logs/`.

- [ ] **Step 1: Run the authoritative asset gate**

```powershell
npm run assets:verify:themes
```

Expected: PASS.

- [ ] **Step 2: Run focused functional contracts for surfaces whose images were retired**

```powershell
npx jest --runTestsByPath tests/daily_phrase_quest_card_contract.test.ts tests/boon_engine.test.ts tests/league_bonus_gift_images.test.ts tests/level_gift_modal_theme_contract.test.ts --no-cache --runInBand
```

Expected: behavior PASS without raster expectations.

- [ ] **Step 3: Run focused theme surface contracts**

```powershell
npx jest --runTestsByPath tests/theme_context_default.test.ts tests/theme_access_policy.test.ts tests/currency_icon_assets_contract.test.ts tests/streak_icon_assets.test.ts tests/season_pass_theme_backgrounds_contract.test.ts tests/tournament_theme_personalization_contract.test.ts --no-cache --runInBand
```

Expected: PASS.

- [ ] **Step 4: Inspect the exact final diff**

```powershell
git diff --check
git status --short
```

Confirm unrelated staged auth/cloud-sync files and unrelated user changes remain present and were never included in themed-asset commits.

- [ ] **Step 5: Produce the final audit summary**

Report exact counts for logical slots, regenerated files, deleted legacy files, deleted retired-family files, compressed bundle delta, test commands, pass/fail status, and the audit/log paths. Do not claim completion while any deterministic gate fails.
