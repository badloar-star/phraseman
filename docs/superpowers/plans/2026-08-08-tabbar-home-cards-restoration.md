# Tabbar and Home Cards Restoration — Implementation Plan

> Execute this plan immediately after it is saved. Preserve all unrelated dirty-worktree changes, especially the hydration and scroll-deceleration edits already present in `app/(tabs)/home.tsx`.

**Goal:** Restore the five-item retained tabbar and the earlier compact-on-scroll motion, then restore the Home daily challenge, league goal, and full-width adaptive-height phrase cards shown in the approved reference.

**Architecture:** Expand the retained-tab model from four to five logical tabs and mount Lessons as a privacy-safe retained pane while keeping `/lessons_list` as the push presentation used by the Home shortcut. Replace the collapsed-orb tab chrome with a single animated capsule whose scale, translation, and opacity respond to scroll direction. Split the combined Home activity panel into independent daily and league cards and make the phrase card stretch to the available width while retaining content-driven height.

**Tech Stack:** Expo Router, React Native, TypeScript, React Native `Animated`, Jest source-contract tests.

---

## Task 1: Lock navigation and presentation contracts with failing tests

**Files:**
- Modify: `tests/tab_page_model.test.ts`
- Modify: `tests/tab_deferred_mount_contract.test.ts`
- Modify: `tests/retained_tabs_runtime_work_contract.test.ts`
- Modify: `tests/exam_best_pct_sync_contract.test.ts`
- Modify: `tests/tournament_screens_contract.test.ts`
- Modify: `tests/dialogs_back_tabbar_contract.test.ts`
- Modify: `tests/perf_freeze_contract.test.ts`

1. Change expected logical tabs to `home`, `lessons`, `tournaments`, `friends`, `settings` with indices `0..4`.
2. Require the layout to lazy-load and retain Lessons, use account-generation fail-closed protection, and remount the Lessons subtree on identity epoch changes.
3. Require Lessons to support both `presentation="tab"` and the existing push route, with runtime work enabled only for the visible retained owner.
4. Run the focused navigation contract tests and confirm RED before production edits.

## Task 2: Restore the five-tab capsule and Instagram-like motion

**Files:**
- Modify: `app/tab_page_model.ts`
- Modify: `app/TabContext.tsx`
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `app/(tabs)/lessons.tsx`
- Modify: `app/(tabs)/home.tsx`
- Modify: `tests/tabbar_scroll_chrome_contract.test.ts`
- Modify: `tests/tab_bar_motion_accessibility_contract.test.ts`

1. Add Lessons at index `1`; shift Tournaments, Friends, and Settings to `2`, `3`, and `4` in every route, segment, icon, and Home-tab mapping.
2. Add the Lessons deferred loader and a keyed privacy boundary that covers stale content during account-generation changes.
3. Make Lessons choose tab-safe-area, bottom padding, back behavior, focus refresh, and runtime activity from its `presentation` prop; keep `/lessons_list` as a push screen.
4. Remove every collapsed-orb state, hit target, and icon-fade path from the tabbar.
5. Restore the whole-capsule animation: scale `1 → 0.9`, translateY `0 → 8`, opacity `1 → 0.94`, with hysteresis and cubic timing. Restore the moving active pill and icon press scale/translate animation.
6. Run tabbar/navigation tests and confirm GREEN.

## Task 3: Restore Home cards from the approved reference

**Files:**
- Add: `tests/home_reference_cards_contract.test.ts`
- Modify: `app/(tabs)/home.tsx`

1. Add failing source contracts for two independent large cards, a segmented daily progress indicator, a full-width league progress bar, and the phrase card width rule.
2. Replace the combined `Сегодня` surface with separate `home-activity-daily` and `home-league-open` gradient cards using the existing artwork, theme palettes, and accessibility labels.
3. Give the league card a visible left emblem, title/subtitle/percentage hierarchy, decorative right chest, and full-width progress track.
4. Change `homeAdditionalEditorial` from centered `maxWidth: '90%'` to stretched width with horizontal margins. Do not set a fixed height or truncate the primary phrase content.
5. Run the Home contract tests and confirm GREEN.

## Task 4: Verification and handoff

**Files:**
- Verify all modified production and test files.

1. Run focused Jest tests for tab models, retained runtime, identity safety, motion, Home cards, Home shortcut routing, layout stability, and tab freeze handoff.
2. Run `npx tsc --noEmit --pretty false` and distinguish task failures from unrelated pre-existing dirty-worktree failures.
3. Inspect `git diff --check`, targeted diffs, and `git status --short`; verify no unrelated user edit was overwritten.
4. Report the exact behavior restored, verification evidence, and any remaining risks. End with `Находки и предложения`.
