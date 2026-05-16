# Admin Modal Audit — 2026-05-14

Scope: modal previews and modal-like QA actions inside `/settings_testers`.

## Result

The active admin modal gallery now matches the current app shell more closely:

- `ShardRewardModal` was removed from active admin QA. The real shard reward path is now `shards_earned` event -> `GlobalShardsEarnedHost` -> `ShardsEarnedModal`.
- `ReleaseWaveBonusModal` was removed from active core QA. The component still exists, but `_layout.tsx` currently does not mount release-wave flow and config has `RELEASE_WAVE_BONUS_VERSION = 0`.
- `ClubResultModal` compatibility import was replaced with direct `LeagueResultModal`.
- Missing active global modals were added:
  - `ReleaseNotesModal`
  - `GlobalBroadcastModal`
- `GlobalBroadcastModal` now supports `previewOnly`, so admin preview does not write claim markers, touch cloud rewards, or open external review URLs.

## Active Admin Modal Coverage

| Admin preview | Current app path | Status |
| --- | --- | --- |
| `LeagueResultModal` | `app/(tabs)/home.tsx`, `app/club_screen.tsx` | Active |
| `LevelGiftModal`, `LevelGiftDualModal` | `app/_layout.tsx`, `app/progress_map.tsx` | Active |
| `NoEnergyModal` | lessons, quizzes, exam, diagnostic, preposition drill, arena lobby | Active |
| `ArenaLimitModal` | `app/arena_lobby.tsx` | Active |
| `QuizTimeoutModal` | `app/quizzes.tsx` | Active |
| `UserWarningModal` | `app/(tabs)/home.tsx` | Active |
| `ShardsEarnedModal` via `GlobalShardsEarnedHost` | `app/_layout.tsx` + `shards_earned` event | Active |
| `ReportUserModal` | leaderboard/profile report flows | Active, admin uses safe preview |
| `UpdateModal` | `app/_layout.tsx` | Active |
| `NotificationPermissionModal` | `app/_layout.tsx` | Active |
| `ReleaseNotesModal` | `app/_layout.tsx` | Active, added to admin |
| `GlobalBroadcastModal` | `app/_layout.tsx` | Active, added to admin as preview-only |
| `RankChangeModal` | `app/arena_results.tsx` | Active |
| `RankChangeTestModal` | admin-only isolated visual tester | Kept as explicit isolated test |
| `RegistrationPromptModal` | settings, save-progress, lesson completion | Active |
| `MedalToast` | lesson/medal promotion flow | Active |
| `PremiumCelebrationModal` | home premium celebration | Active |
| `MasteryReplayModal` | lesson complete/menu replay flow | Active |
| `StreakReviveModal` | home streak-revive flow | Active |
| `CoachToast` | mistake analysis -> Diagnosis trainer | Active |

## Removed From Active QA

| Component | Why |
| --- | --- |
| `ShardRewardModal` | No active app-shell usage; replaced by `ShardsEarnedModal` event flow. |
| `ReleaseWaveBonusModal` | Component exists but release-wave queue is not mounted and config is disabled. |
| `ClubResultModal` | Compatibility re-export only; admin now imports `LeagueResultModal` directly. |
| `AfterLesson5PushModal` | Component remains unreferenced by production screens; not shown in active admin QA. |

## Remaining Notes

- `ReleaseWaveBonusModal` can return later as a separate gated release QA section if the flow is reconnected in `_layout.tsx`.
- `GlobalBroadcastModal` admin preview validates UI only; real fetch/audience/claim logic remains cloud-dependent.
- `NotificationPermissionModal` preview can trigger the real system permission flow.
- Second sweep confirmed the old `AfterLesson5PushModal` and release-wave preview should stay out of active QA until their production flows are reconnected.
- Third sweep fixed `CoachToast` admin previews so exact-error payloads keep `microDiagnosisId`, labels, focus words, and evidence when opening Diagnosis trainer.

## Verification

Passed:

- `npx tsc --noEmit --pretty false`

