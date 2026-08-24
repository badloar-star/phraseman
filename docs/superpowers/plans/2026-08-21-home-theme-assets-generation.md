# Home Theme Assets Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate, alpha-process, compress, and statically wire the six approved Home illustration slots for all nine live themes without touching MAX or removed features/themes.

**Architecture:** Use approved Ember masters as immutable geometry references. Generate one theme and one slot at a time onto an achromatic `#808080` matte, convert sources to clean RGBA locally, then add only compressed statically required WebP files to the bundle. Maintain a manifest and checkpoint after every asset so another session can resume without repeating generation.

**Tech Stack:** Built-in Codex `imagegen`, Node.js, `sharp`, React Native/Expo static `require()`, focused Jest contract tests.

---

### Task 1: Freeze scope and create the manifest

**Files:**
- Create: `.codex-tmp/theme-assets-v2/home-generation-manifest.json`
- Inspect: `constants/theme.ts`
- Inspect: `app/home_menu_icons.ts`
- Inspect: `app/home_last_lesson_assets.ts`
- Inspect: `components/SurveyTaskCard.tsx`
- Inspect: `components/DailyPhraseCard.tsx`

- [ ] Confirm `ThemeMode` is exactly `dark`, `gold`, `olive`, `midnight`, `ember`, `aurora`, `volt`, `indigo`, `sagePorcelain`.
- [ ] Create a 54-row manifest covering exactly six slots and nine themes, with fields `theme`, `slot`, `status`, `sourcePath`, `alphaPath`, `finalPath`, `promptPath`, `semanticQa`, `alphaQa`, `wired`.
- [ ] Initialize existing Ember references as `approved_reference`; initialize ungenerated rows as `pending`.
- [ ] Assert the manifest contains no `minimalDark`, `candyBlue`, `business`, `businessLight`, `max`, `practice`, `diagnostic`, `gift`, or `dailyChallenge` row.

Run:

```powershell
node -e "const m=require('./.codex-tmp/theme-assets-v2/home-generation-manifest.json'); const banned=/minimalDark|candyBlue|businessLight|business|max|practice|diagnostic|gift|dailyChallenge/i; if(m.assets.length!==54||m.assets.some(x=>banned.test(JSON.stringify(x)))) process.exit(1); console.log('manifest-ok',m.assets.length)"
```

Expected: `manifest-ok 54`.

### Task 2: Finish and approve the Ember masters

**Files:**
- Reuse: `.codex-tmp/theme-assets-v2/ember-quick-start-preview/ember-lessons-transparent.png`
- Reuse: `.codex-tmp/theme-assets-v2/ember-quick-start-preview/ember-flashcards-english-transparent.png`
- Reuse: `.codex-tmp/theme-assets-v2/ember-quick-start-preview/ember-league-english-shield-approved.png`
- Regenerate: `.codex-tmp/theme-assets-v2/home-matte-sources/ember/ember-survey-compact-still-life-v2.png`
- Regenerate: `.codex-tmp/theme-assets-v2/home-matte-sources/ember/ember-last-lesson-compact-still-life-v2.png`
- Regenerate: `.codex-tmp/theme-assets-v2/home-matte-sources/ember/ember-phrase-of-day-compact-still-life-v2.png`

- [ ] Render all six sources as 256 px and actual-slot thumbnails on neutral preview cards.
- [ ] Confirm the six meanings remain distinct: collection, vocabulary cards, league shield, questionnaire, unfinished workbook, quotation ribbon.
- [ ] Confirm every slot matches the first three Ember masters: compact 2-4-object cluster, 60-75% canvas occupancy, generous clear space, same camera/light/shadow/material grammar.
- [ ] Reject any oversized isolated sheet/book/scroll/panel, any survey resembling electronics, or any Phrase of the Day resembling Flashcards/audio.
- [ ] Update manifest rows only after visual approval.

### Task 3: Implement neutral-matte alpha processing

**Files:**
- Create: `scripts/process-home-theme-asset.mjs`
- Create: `tests/home_theme_asset_processing.test.ts`
- Create: `.codex-tmp/theme-assets-v2/home-alpha-qa/`

- [ ] Write a failing focused test that feeds a synthetic warm-ivory object on `#808080` and asserts transparent corners, opaque ivory center, and absence of green/magenta edge bias.
- [ ] Run the focused test and confirm it fails before the script exists.
- [ ] Implement border-connected neutral matte detection, edge feathering, gray decontamination, post-alpha contact shadow, WebP compression, and four-background QA composites.
- [ ] Run the focused test and confirm it passes.
- [ ] Process the three matte Ember masters and verify `channels=4`, `hasAlpha=true`, zero corner alpha, no holes, and no gray/colored halos.

### Task 4: Add static consumers before non-Ember generation

**Files:**
- Modify: `app/home_menu_icons.ts`
- Modify: `app/home_last_lesson_assets.ts`
- Create: `app/home_supporting_art.ts`
- Modify: `components/SurveyTaskCard.tsx`
- Modify: `components/DailyPhraseCard.tsx`
- Create: `tests/home_theme_art_contract.test.ts`

- [ ] Add a failing contract test requiring exactly six Home art keys for all nine live themes and forbidding excluded themes/features.
- [ ] Add static `require()` entries for Survey and Phrase of the Day through `home_supporting_art.ts`.
- [ ] Preserve existing behavior and accessibility labels; artwork remains decorative.
- [ ] Remove no user-visible functionality and do not touch MAX.
- [ ] Run the focused contract test until green.

### Task 5: Generate one complete theme at a time

**Files:**
- Create sources under: `.codex-tmp/theme-assets-v2/home-matte-sources/<theme>/`
- Create prompt records under: `.codex-tmp/theme-assets-v2/home-prompts/<theme>/`
- Create final assets under the statically required `assets/images/home_menu/**` and focused supporting-art directories.

For each theme in this exact order — `indigo`, `sagePorcelain`, `olive`, `midnight`, `aurora`, `volt`, `dark`, `gold`:

- [ ] Check free memory; do not generate if free physical memory is below 8 GB.
- [ ] Generate Lessons from the approved Lessons geometry on neutral gray.
- [ ] Save source, prompt, and manifest checkpoint; run semantic QA.
- [ ] Generate Flashcards with one English word and British motif; save/checkpoint/QA.
- [ ] Generate League with exact approved shield geometry; save/checkpoint/QA.
- [ ] Generate Survey as paper questionnaire; save/checkpoint/QA.
- [ ] Generate Last Lesson with exact top-spiral workbook geometry; save/checkpoint/QA.
- [ ] Generate Phrase of the Day as quote ribbon; save/checkpoint/QA.
- [ ] Run local alpha processing for all six sources.
- [ ] Inspect black, white, theme-card, blue, and actual-size composites.
- [ ] Compress only approved RGBA outputs to final WebP.
- [ ] Mark the theme complete only when all six assets are wired and verified.

Use one built-in image generation call per asset. Never parallelize image generation and never keep an unverified generated file only under the Codex default output path.

### Task 6: Focused verification and bundle hygiene

**Files:**
- Test: `tests/home_theme_art_contract.test.ts`
- Test: `tests/home_theme_asset_processing.test.ts`
- Inspect: `assets/images/**`

- [ ] Run the two focused tests.
- [ ] Run a literal static-reference audit for every new basename across `app`, `components`, `constants`, `hooks`, `contexts`, `lib`, and `modules`.
- [ ] Confirm 54 expected final assets and zero extra source/intermediate files inside bundled directories.
- [ ] Confirm all final images are WebP with alpha and compressed size appropriate for the bundle.
- [ ] Verify Home under all nine themes at target device width.
- [ ] Confirm MAX remains unchanged and excluded features/themes have no generated files.

### Task 7: Final handoff

**Files:**
- Update: `.codex-tmp/theme-assets-v2/home-generation-manifest.json`
- Create: `.codex-tmp/theme-assets-v2/HOME_GENERATION_REPORT.md`

- [ ] Record every source, prompt, alpha output, final output, static consumer, metadata result, and visual QA result.
- [ ] List rejected variants separately; never leave them in bundled directories.
- [ ] Report any remaining visual approval item without claiming the full set complete.
