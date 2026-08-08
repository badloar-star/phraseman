# HANDOVER: Codex restored deleted arena/quiz files — NEEDS CLEANUP

## What happened

On 2026-07-21 ~12:40, Codex (Claude) made commit `3628d1504` with message:
> "chore: commit remaining restored app sources and tests (arena daily limit, quizzes tab, loyalty/trainer tests)"

This commit **restored files that had been intentionally deleted** from the project:
- `app/(tabs)/quizzes.tsx`
- `app/arena_results.tsx`
- `app/arena_daily_limit.ts`
- `app/arena_battle_pass.ts`
- `app/arena_battle_pass_store.ts`
- `app/quiz_daily_limit.ts`

## Why this broke the build

These restored files import modules that **no longer exist** in the project:
- `arena_results.tsx` → `arena_battle_pass_store`, `arena_battle_pass`, `services/arena_db`, `types/arena`
- `quizzes.tsx` → `quiz_data`, `quiz_phrases_loader`, `quiz_utils`, `use_quiz_explain`

This caused a cascade of "Unable to resolve module" errors on every Metro build.

## What was fixed in this session (Kimi)

1. **Deleted all restored TS/TSX files** listed above
2. **Deleted Kimi's temporary shims** (`quiz_data.ts`, `quiz_phrases_loader.ts`, `quiz_utils.ts`, `use_quiz_explain.ts`)
3. **Fixed `package.json`** — Codex appended 3 stray lines (`english-test:generate`, `english-test:check`, `english-test:deploy`) AFTER the closing `}`, breaking JSON parsing
4. **Fixed Turkish quote** in `app/daily_tasks.ts` line 1912 — `12:00'den` broke the single-quoted string

## What still needs cleanup

The following **arena/quiz assets and files still exist** in the repo. They don't break the build (Metro only bundles imported files), but they clutter the repo:

### Code files still tracked by git:
- `tests/loyalty_gift_flow_contract.test.ts`
- `tests/trainer_weekly_review_order_contract.test.ts`
- `assets/arena_questions_a1.json`
- `assets/arena_questions_a2.json`
- `assets/arena_questions_b1.json`
- `assets/arena_questions_b2.json`

### Asset directories (images, icons):
- `assets/images/achievements/arena_*`
- `assets/images/achievements/quiz_*`
- `assets/images/arena_actions/`
- `assets/images/arena_actions_sources/`
- `assets/images/arena_ranks/`
- `assets/images/arena_tickets/`
- `assets/images/daily_task_icons/arena_*`
- `assets/images/daily_task_icons/quiz_*`
- `assets/images/home_menu/*/home-*-quizzes.*`
- `assets/images/quizzes/`
- `assets/images/weekly_boon_icons/*/arena_saturday.*`

### Lingman content:
- `content/lingman/quiz_attraction_two_word_phrases_20260703.psv`

### Translation blocks:
- `docs/heisenberg/*/translation_blocks/quizzes-*.jsonl` (hundreds of files)

## What Codex should NOT do

- **DO NOT** run `git add -A` and commit everything blindly
- **DO NOT** restore "missing" files without checking if they were intentionally deleted
- **DO NOT** append scripts to `package.json` after the closing brace
- **DO NOT** modify files outside the requested scope without user confirmation

## Current branch state

- Branch: `codex/admin-digest-app-codex` (or user may have switched)
- Last commit: `3628d1504` (the problematic restore commit)
- Working tree: dirty (files deleted, package.json fixed, daily_tasks.ts fixed)

## Recommended next steps

1. **User decision needed**: Should all arena/quiz assets be permanently deleted, or kept for potential future re-enablement?
2. If delete: create a commit that removes all arena/quiz code + assets + translation blocks
3. If keep: move assets to an `archive/` or `deprecated/` folder so they don't clutter searches
4. Consider adding `.gitignore` rules for `arena_*` and `quiz_*` if these features are permanently removed

---
*Handover created by Kimi on 2026-07-21*
