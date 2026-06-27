# Claude Review Handoff - 2026-06-27

Purpose: review the latest owner-readiness pass before any build. This is a review handoff only. Do not build from this handoff.

## Owner Direction To Preserve

- Do not revert or clean unrelated dirty worktree changes.
- Do not delete, hide or disable functionality unless the owner explicitly named that exact thing.
- Do not start a build yet. The owner said Claude must review first.
- Keep optimistic UI where it is safe, but keep money/auth/other-user/economy-authority flows server-first with pending UI and idempotency.
- Keep server costs controlled: no write-per-tap, no unnecessary hot listeners, no broad immediate `syncToCloud({ forceNow: true })` without owner-reviewed reason.
- Keep XP/progress/shards monotonic or timestamp-guarded so stale mirrors cannot lower newer local/server state.
- Keep runtime UI free of `expo-blur`/`BlurView` unless the owner explicitly re-approves blur later.

## Working Tree Warning

The repo is very dirty overall. Review the files below as the current handoff scope, but do not assume every diff in the repository belongs to the latest pass.

Important nuance: `app/_layout.tsx` already had other dirty changes in the file before the final startup batching edit. Claude should separate:

- latest intended edit: startup `AsyncStorage.multiGet` batching for `user_prev_xp`, `user_total_xp`, `onboarding_done`;
- existing same-file dirty state: maintenance/promo placement, loyalty flags, content prewarm flags, trainer route changes and other unrelated hunks.

## Primary Review Scope

- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `components/TopFadeMask.tsx`
- `tests/owner_direction_runtime_contract.test.ts`
- `tests/fabric_background_layout_contract.test.ts`
- `FINAL_OWNER_CLOSURE_AUDIT_2026-06-27.md`
- `OWNER_REVIEW_QUEUE.md`
- `PERFORMANCE_COST_AUDIT_2026-06-26.md`
- `OPTIMISTIC_UI_COVERAGE_AUDIT_2026-06-27.md`
- `SHARDS_LEDGER_AUTHORITY_AUDIT_2026-06-27.md`

## What Changed In The Final Pass

- Root startup reads for `user_prev_xp`, `user_total_xp`, and `onboarding_done` are batched with `AsyncStorage.multiGet`.
- Runtime `expo-blur`/`BlurView` surfaces were removed from the tabbar and `TopFadeMask`.
- Tabbar now uses a static 95% dark underlay instead of native blur.
- `TopFadeMask` still uses `MaskedView` + `LinearGradient` + static scrim, but no native blur.
- Owner guards were added/updated for startup batching and runtime blur removal.
- Final audit docs were updated to record local closure versus external App Check/Firebase Console work.

## Exact Code Points To Inspect

- `app/_layout.tsx`: `startupIdentityKeys`, `startupIdentityPairs`, and `startupIdentity` inside `bootstrap`.
- `app/(tabs)/_layout.tsx`: `TAB_UNDERLAY_DIM_ALPHA = 0.95`, `TAB_UNDERLAY_DIM_BG`, and tab pill fill underlay.
- `components/TopFadeMask.tsx`: static scrim under `MaskedView`; no `BlurView`.
- `tests/owner_direction_runtime_contract.test.ts`: startup batching guard and runtime blur ban.
- `tests/fabric_background_layout_contract.test.ts`: static TopFadeMask/tabbar contract.

## High-Value Review Questions

- Does removing `BlurView` from `TopFadeMask` preserve enough top-edge readability on real devices?
- Is `TAB_UNDERLAY_DIM_ALPHA = 0.95` visually acceptable on light/dark/minimal themes?
- Does root startup batching preserve QA forced onboarding behavior and `user_prev_xp` initialization?
- Are the owner guards too strict for future legitimate UI work, or are they appropriate for the current owner request?
- Are unrelated `_layout.tsx` dirty hunks risky enough to block pre-build cleanup/review?
- Do final audit docs accurately separate locally closed work from external Firebase Console/App Check work?

## Verification Already Run

- `npm test -- --runTestsByPath tests/owner_direction_runtime_contract.test.ts tests/firebase_cost_controls_contract.test.ts tests/fabric_background_layout_contract.test.ts tests/gustav_last_opened_lesson_target_isolation.test.ts tests/home_title_selection_source.test.ts tests/stats_premium_blur_performance_contract.test.ts --runInBand`
  - Result: 6 suites, 68 tests passed.
- `npm test -- --runTestsByPath tests/tabbar_scroll_chrome_contract.test.ts tests/lesson_intro_screens_locale.test.ts --runInBand`
  - Result: 2 suites, 12 tests passed.
- After removing the last `TopFadeMask` blur:
  - `npm test -- --runTestsByPath tests/owner_direction_runtime_contract.test.ts tests/fabric_background_layout_contract.test.ts tests/tabbar_scroll_chrome_contract.test.ts tests/lesson_intro_screens_locale.test.ts tests/stats_premium_blur_performance_contract.test.ts --runInBand`
  - Result: 5 suites, 60 tests passed.
- TypeScript transpile smoke for the latest touched files passed.
- Runtime scans for `expo-blur`, `BlurView`, and `dimezisBlurView` in `app/`, `components/`, `hooks/`, `contexts/` passed.
- `git diff --check` passed for the touched files, with only Windows CRLF warnings.
- Trailing whitespace scan passed for the touched files.

## Suggested Claude Commands

Use targeted checks first:

```powershell
git diff -- app/_layout.tsx "app/(tabs)/_layout.tsx" components/TopFadeMask.tsx tests/owner_direction_runtime_contract.test.ts tests/fabric_background_layout_contract.test.ts
npm test -- --runTestsByPath tests/owner_direction_runtime_contract.test.ts tests/fabric_background_layout_contract.test.ts tests/tabbar_scroll_chrome_contract.test.ts tests/lesson_intro_screens_locale.test.ts tests/stats_premium_blur_performance_contract.test.ts --runInBand
rg -n --fixed-strings "expo-blur" app components hooks contexts
rg -n --fixed-strings "BlurView" app components hooks contexts
```

Do not run a build unless the owner explicitly asks after review.

## Not Build-Ready Until

- Claude review findings are resolved.
- Firebase Console/App Check providers and deployed function env flags are externally confirmed.
- Dirty worktree is triaged so release contents are explicit.
- A final pre-build gate is run after review fixes.
- Manual phone/emulator smoke confirms no startup/tab/top-fade visual regressions.

## External Blocker

Local code can verify App Check init/enforcement guardrails, but cannot prove Firebase Console provider configuration or deployed Cloud Functions env state.

