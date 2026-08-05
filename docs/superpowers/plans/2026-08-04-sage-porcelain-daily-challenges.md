# Sage Porcelain Daily Challenges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add theme-specific light Daily Challenges art and chrome for `sagePorcelain` while preserving every other theme.

**Architecture:** Extend the existing static task-type artwork resolver with a complete `sagePorcelain` map and pass `themeMode` at both render sites. Keep visual token selection local to `daily_tasks_screen.tsx`, because `DailyTaskCard` and `DailyBonusCard` already accept colors as props.

**Tech Stack:** React Native, Expo Image, TypeScript, Jest, Sharp, built-in DALL-E image generation.

---

### Task 1: Lock the themed asset contract

**Files:**
- Modify: `tests/daily_task_icons_coverage.test.ts`
- Modify: `tests/daily_tasks_text_integrity_contract.test.ts`

- [ ] Add a failing contract requiring six 768x256 WebP files under `assets/images/daily_task_card_art/sagePorcelain/`, each no larger than 80 KB and with a unique SHA-256 hash.
- [ ] Require `dailyTaskBackgroundArt(task.type, themeMode)` and `dailyTaskBackgroundArt(taskToStart.type, themeMode)` in the screen source.
- [ ] Run `npx jest tests/daily_task_icons_coverage.test.ts tests/daily_tasks_text_integrity_contract.test.ts --runInBand` and confirm the new assertions fail before implementation.

### Task 2: Wire the light theme before generation

**Files:**
- Modify: `app/daily_task_background_art.ts`
- Modify: `app/daily_tasks_screen.tsx`

- [ ] Import `ThemeMode` and add six literal `require()` entries for the `sagePorcelain` asset directory.
- [ ] Change the resolver to accept `themeMode`, selecting the light set only for `sagePorcelain` and falling back to the existing set for every other mode.
- [ ] Pass `themeMode` from both the task card and task-detail modal call sites.
- [ ] Add `isSagePorcelainTheme` and select light porcelain surfaces, dark theme text, sage disabled controls, and dark status icons only in that branch.

### Task 3: Generate and compress the six illustrations

**Files:**
- Create: `assets/images/daily_task_card_art/sagePorcelain/lesson.webp`
- Create: `assets/images/daily_task_card_art/sagePorcelain/recall.webp`
- Create: `assets/images/daily_task_card_art/sagePorcelain/words.webp`
- Create: `assets/images/daily_task_card_art/sagePorcelain/verbs.webp`
- Create: `assets/images/daily_task_card_art/sagePorcelain/word_trainer.webp`
- Create: `assets/images/daily_task_card_art/sagePorcelain/practice.webp`
- Create ignored source: `.codex-tmp/daily-task-sage-porcelain/master.png`

- [ ] Generate one borderless 3x2 DALL-E master sheet with six equal 3:1 scenes, no text, and consistent light porcelain art direction.
- [ ] Crop each panel, resize to 768x256, and encode to WebP with Sharp while preserving enough detail for high-density screens.
- [ ] Inspect the master and all six exports for seams, labels, dark blocks, repeated panels, or objects intruding into the left text-safe area.

### Task 4: Run focused verification

**Files:**
- Test: `tests/daily_task_icons_coverage.test.ts`
- Test: `tests/daily_tasks_text_integrity_contract.test.ts`

- [ ] Run `npx jest tests/daily_task_icons_coverage.test.ts tests/daily_tasks_text_integrity_contract.test.ts --runInBand` and require PASS.
- [ ] Run a targeted TypeScript-aware source check through the existing Jest contracts; do not start Metro, an emulator, or the full project typecheck.
- [ ] Inspect `git diff --check` and the final file sizes, then report the exact asset budget.
