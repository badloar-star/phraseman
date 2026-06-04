# Onboarding Graphite Theme 100% Coverage Plan

Date: 2026-06-02

## Goal

Make `minimalDark` the default free-tier "Onboarding Graphite" theme across the whole app: same graphite/amber/ivory language as onboarding, but with newly generated DALL-E assets instead of reusing onboarding icons.

The theme must feel simple, beautiful, unique, convenient, and more square than the old rounded free theme.

## Design Rules

- Use the onboarding color mood: deep graphite black, warm amber/gold, ivory text, rare teal only as a signal.
- Do not use onboarding icon assets in the app theme. Every theme-specific bitmap must be generated for this theme.
- Keep UI efficient for a learning app: readable 4.5:1 text contrast, 44px+ touch targets, restrained animation, stable card dimensions.
- Prefer WebP for app assets; use PNG only where alpha quality or existing pipeline requires it.
- Make cards/buttons less rounded: compact radii, crisp edges, no bubbly claymorphism.
- Preserve all existing features, routes, rewards, premium gates, and fallback behavior.

## Current Coverage

- Done: `MINIMAL_DARK` palette moved from blue graphite to graphite/amber tokens.
- Done: `minimalDark` radius scale reduced in `ThemeContext`.
- Done: settings theme preview updated.
- Done: home menu uses 11 generated DALL-E assets under `assets/images/home_menu/onboarding-graphite/`.
- Done: browser mockups exist under `.codex-tmp/onboarding-default-theme-mockups/`.
- Done: targeted test exists: `tests/onboarding_graphite_default_theme_assets.test.ts`.

## 100% Coverage Definition

The theme is complete only when all of these are true:

- Every user-visible `minimalDark` theme-specific bitmap is either replaced with a new `onboarding-graphite` generated asset or explicitly classified as non-theme content.
- No `minimalDark` app-theme branch references `assets/images/onboarding/`.
- Old blue graphite accents in `minimalDark` theme chrome are replaced with amber/ivory/graphite tokens unless they represent a deliberate semantic state.
- The asset registry has tests proving each required generated file exists, has expected dimensions, and is wired into the correct theme branch.
- Browser contact sheets show the final generated families before app integration.
- `npx tsc --noEmit --pretty false` and targeted coverage tests pass after each phase.

## Asset Inventory

### Phase 1: Core Chrome

Generate and wire:

- `components/DailyPhraseCard.tsx`: daily phrase home card.
- `components/EnergyIcon.tsx`: energy icon.
- `components/AppMessagesInbox.tsx`: message header glyph.
- `components/LingmanVideosButton.tsx`: YouTube/Lingman header glyph.
- `components/firstLessonSheetAssets.ts`: first lesson sheet background.
- `app/image_preload.ts`: update preloaded paths when assets move.
- Color-only cleanup: `DailyTaskRewardToast`, `NoEnergyModal`, `trainerThemeIcons`, `streakIconAssets`, `statsThemeChrome`, `leagueBonusPalette`, quiz palette/text maps.

### Phase 2: Global And Route Backdrops

Generate and wire route art for all `APP_ART_BACKDROP_NAMES`:

- `home`
- `lessons`
- `lessonIntro`
- `lessonPractice`
- `arena`
- `arenaReady`
- `arenaMatch`
- `friends`
- `settings`
- `achievements`
- `dailyTasks`
- `quizzes`
- `diagnosticTest`
- `exam`
- `flashcards`
- `progressMap`
- `shardsShop`
- `levelGifts`
- `statistics`

Target files:

- `components/appArtBackdropRegistry.ts`
- `components/AppArtBackdrop.tsx`
- `components/ScreenGradient.tsx`

### Phase 3: Quiz System

Generate and wire:

- Level cards: easy, medium, hard.
- Level logos: easy, medium, hard.
- Completion medal/cutout.
- Thematic quiz cards/logos:
  - kitchen and cooking
  - home and rooms
  - at the doctor
  - body and health
  - shopping and money

Target files:

- `app/quizzes/constants.ts`
- `app/quizzes/medal_assets.ts`
- `app/quiz_thematic_registry.ts`
- `app/quiz_thematic_dev_registry.ts`
- mirrored prompt metadata files where paths are embedded.

### Phase 4: Streak And Week Markers

Generate and wire:

- Fire tiers: 010, 020, 030, 040, 050, 060, 070, 080, 090, 100.
- Freeze icon.
- Week markers: freeze, repair, revive.
- Update fire/freeze chrome from blue to amber/ivory.

Target files:

- `constants/streakIconAssets.ts`
- `app/(tabs)/home.tsx`

### Phase 5: Arena

Generate and wire:

- Arena lobby hero.
- Arena ticket.
- Arena actions: match, friend, throne.
- Arena ready/match backgrounds if used by the current arena route.

Target files:

- `app/arena_lobby.tsx`
- `app/arena_action_icons.ts`
- `app/image_preload.ts`

### Phase 6: Rewards, Shards, Gifts

Generate and wire:

- Shards: single, 80, 180, 420.
- League bonus chest.
- Level gift boxes: common, rare, epic, premium.
- Themed shard reward icon in `levelGiftRewardIcons`.
- Decide whether generic reward icons become theme variants; if yes, generate the full reward-icon family.

Target files:

- `app/oskolok.ts`
- `constants/levelGiftRewardIcons.ts`
- `constants/leagueBonusGiftImages.ts`
- `constants/levelGiftImages.ts`
- `constants/leagueBonusPalette.ts`

### Phase 7: Statistics

Generate and wire:

- Stats cards: streak, multipliers, practiceBalance, weekRhythm, percentiles, archiveMap, wager.
- Update stats chrome from blue graphite to amber/ivory.

Target files:

- `components/StatsCardArtSurface.tsx`
- `constants/statsThemeChrome.ts`
- `app/streak_stats.tsx` only if hardcoded accents remain.

### Phase 8: Trainer

Generate and wire:

- Trainer icons: phrases, words, analytics.
- Update trainer palette from blue to amber/ivory.

Target files:

- `constants/trainerThemeIcons.ts`
- `app/trainer.tsx`

### Phase 9: Daily Tasks And Personal Plan

Generate or theme-wire:

- Daily task card backdrops for all active/completed task themes.
- Bonus daily task card.
- Personal plan task visuals if they are visually shown inside the themed free default experience.

Target files:

- `app/daily_task_card_backdrops.ts`
- `app/personal_plan_task_visuals.ts`
- relevant contract tests.

### Phase 10: Paywall And Modal Surfaces

Generate and wire:

- Premium hero minimal-dark replacement.
- Reward modal backdrop.
- No-energy modal chrome cleanup.
- Flashcards paywall/card-pack shell if it uses `minimalDark` visuals.

Target files:

- `app/premium_modal.tsx`
- `components/RewardModalBackdrop.tsx`
- `components/NoEnergyModal.tsx`
- `app/flashcards/cardPackPaywallTheme.ts`

### Phase 11: Achievement Surfaces

Audit and decide:

- Achievement category art is currently generic, not theme-keyed.
- If achievement categories are considered theme assets, introduce an `onboarding-graphite`/`minimalDark` branch rather than overwriting global achievement art.

Target files:

- `app/achievements_screen.tsx`
- achievement contract tests if added.

### Phase 12: Final QA

- Build final contact sheets for every generated family.
- Run targeted asset coverage tests.
- Run `npx tsc --noEmit --pretty false`.
- Open browser mockups/contact sheets.
- If a device/emulator session is available, visually check: home, lessons, quizzes, arena, settings, stats, rewards, paywall, no-energy, daily tasks.

## Phase Acceptance Checklist

- [ ] Source DALL-E sheet saved under `assets/images/theme_onboarding_graphite/sources/`.
- [ ] Final cut assets saved under stable app paths.
- [ ] Existing theme assets preserved, not deleted.
- [ ] Consuming TS/TSX registry points `minimalDark` to new assets.
- [ ] No onboarding icon asset is referenced by the app theme.
- [ ] Contact sheet generated in `.codex-tmp/onboarding-default-theme-mockups/`.
- [ ] Tests updated before or with wiring.
- [ ] TypeScript passes.

