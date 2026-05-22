# GUSTAV Target Isolation Apply Plan

Run: `2026-05-19_fr_inventory_v0a1`

Status: `HOLD`

Approval: `not_requested`

Generated at: 2026-05-19T20:01:01.108Z

## Summary

- Files: 83
- Add: 19
- Modify: 64
- Delete: 0
- Production files: 79
- Test files: 4
- Dirty worktree files: 827
- Dirty worktree overlaps: 20
- Dirty preservation reviewed: yes
- Phases: 6
- Adapters: 16
- Blockers: 2
- High risks: 83

## Safety

- May modify production app files: no
- May start French generation: no

Required approval text:

> User approved apply plan 2026-05-19_fr_inventory_v0a1 on 2026-05-19. Approved file list: docs/gustav/runs/2026-05-19_fr_inventory_v0a1/apply_plan/file_changes.json.

## Blockers

- Apply plan is not explicitly approved by the user.
- Production app files must not be modified until approvalStatus becomes approved.

## Dirty Worktree Overlaps

- `app/_layout.tsx`
- `app/(tabs)/home.tsx`
- `app/(tabs)/settings.tsx`
- `app/cloud_sync.ts`
- `app/daily_tasks_screen.tsx`
- `app/daily_tasks.ts`
- `app/diagnostic_test.tsx`
- `app/exam.tsx`
- `app/firestore_leaderboard.ts`
- `app/flashcards_collection.tsx`
- `app/flashcards_swipe.tsx`
- `app/lesson_intro_screens.tsx`
- `app/lesson_irregular_verbs.tsx`
- `app/lesson_words.tsx`
- `app/lesson1.tsx`
- `app/level_exam.tsx`
- `app/pack_opening.tsx`
- `app/trainer_smart_session.tsx`
- `app/trainer.tsx`
- `hooks/use-flashcards.ts`

## File Changes

### app/_layout.tsx

- Action: `modify`
- Phase: `P5`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Inject production studyTarget into every user-facing learning route. Replace direct target-sensitive storage reads with adapter APIs. Keep sourceLocale switching limited to copy/explanations.
- Rollback: Route integration should be feature-flagged so English-only app shell can stay active.
- Tests:
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/(tabs)/home.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `lesson_progress_store`, `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - English lesson completion does not mark French lesson complete.
  - French target does not reuse English unlocked_lessons.

### app/(tabs)/lessons.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `lesson_progress_store`, `level_exam_certificate_store`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - English lesson completion does not mark French lesson complete.
  - French target does not reuse English unlocked_lessons.

### app/(tabs)/quizzes.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `quiz_progress_store`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - French quiz navigation does not resume English quiz level.
  - French quiz counters do not increment English quiz achievements.

### app/(tabs)/settings.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `study_target`
- Risk: `blocker`
- Adapters: `production_study_target`, `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Introduce production StudyTarget type with en/fr and keep it separate from sourceLocale. Rename or isolate dev StudyTargetLang so Spanish experiments cannot drive French target selection. Expose a provider API that route surfaces can consume without reading sourceLocale as target.
- Rollback: Feature-flag the production target provider and keep dev Spanish path untouched until migration is complete.
- Tests:
  - Switch sourceLocale ru -> uk and assert studyTarget remains fr.
  - Enable French target and assert Spanish dev gates do not activate.
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/achievement_progress_store.ts

- Action: `add`
- Phase: `P4`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `achievement_progress_store`
- Dirty worktree overlap: no
- Reason: Split achievement state into global and target buckets using taxonomy. Route target-content counters through target stores. Hold mixed achievements until product policy decides global versus per-target behavior.
- Rollback: Keep flat achievements_state read-only during migration and never delete before rollback window.
- Tests:
  - Target achievement unlocks independently for en and fr.
  - Global achievement remains shared only when taxonomy says global.

### app/achievements_screen.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `achievement_progress_store`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - Target achievement unlocks independently for en and fr.
  - Global achievement remains shared only when taxonomy says global.

### app/achievements.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `achievement_progress_store`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - Target achievement unlocks independently for en and fr.
  - Global achievement remains shared only when taxonomy says global.

### app/active_recall.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `trainer_practice_store`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - French trainer queue never reads English active_recall_items.
  - French mistake log survives ru/uk sourceLocale switch without duplicating target items.

### app/arena_leaderboard.tsx

- Action: `modify`
- Phase: `P5`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Inject production studyTarget into every user-facing learning route. Replace direct target-sensitive storage reads with adapter APIs. Keep sourceLocale switching limited to copy/explanations.
- Rollback: Route integration should be feature-flagged so English-only app shell can stay active.
- Tests:
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/arena_rating.tsx

- Action: `modify`
- Phase: `P5`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Inject production studyTarget into every user-facing learning route. Replace direct target-sensitive storage reads with adapter APIs. Keep sourceLocale switching limited to copy/explanations.
- Rollback: Route integration should be feature-flagged so English-only app shell can stay active.
- Tests:
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/auth_provider.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `cloud_sync_target_buckets`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - Cloud restore for en does not write fr target keys.
  - Cloud restore for fr does not overwrite en target keys.

### app/avatar_select.tsx

- Action: `modify`
- Phase: `P5`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Inject production studyTarget into every user-facing learning route. Replace direct target-sensitive storage reads with adapter APIs. Keep sourceLocale switching limited to copy/explanations.
- Rollback: Route integration should be feature-flagged so English-only app shell can stay active.
- Tests:
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/certificate_store.ts

- Action: `add`
- Phase: `P3`
- Owner area: `course`
- Risk: `blocker`
- Adapters: `level_exam_certificate_store`
- Dirty worktree overlap: no
- Reason: Store exam results and certificates under studyTarget. Keep English certificates mapped to en only. Do not assume French CEFR structure equals English until source graph approves it.
- Rollback: Certificate v2 can be hidden without deleting legacy certificate key.
- Tests:
  - English A1 pass does not unlock French A1 certificate.
  - French exam state writes only to fr target bucket.

### app/cloud_sync.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `level_exam_certificate_store`, `target_stats_store`, `cloud_sync_target_buckets`
- Dirty worktree overlap: yes
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - English A1 pass does not unlock French A1 certificate.
  - French exam state writes only to fr target bucket.

### app/daily_tasks_screen.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `quiz_progress_store`, `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - French quiz navigation does not resume English quiz level.
  - French quiz counters do not increment English quiz achievements.

### app/daily_tasks.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`
- Dirty worktree overlap: yes
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.

### app/diagnostic_store.ts

- Action: `add`
- Phase: `P3`
- Owner area: `personal_practice`
- Risk: `blocker`
- Adapters: `personal_practice_store`
- Dirty worktree overlap: no
- Reason: Prefix every diagnosis and recommendation id with studyTarget. Store localized feedback under studyTarget/sourceLocale, not under target-only progress. Make My Practice recommendations consume target practice store snapshots.
- Rollback: Diagnosis v2 can be disabled and legacy English diagnostic_last kept as en-only.
- Tests:
  - fr:<id> and en:<id> diagnoses cannot collide.
  - Russian and Ukrainian feedback for French diagnosis do not overwrite each other.

### app/diagnostic_test.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `personal_practice_store`, `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - fr:<id> and en:<id> diagnoses cannot collide.
  - Russian and Ukrainian feedback for French diagnosis do not overwrite each other.

### app/exam_certificate.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `level_exam_certificate_store`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - English A1 pass does not unlock French A1 certificate.
  - French exam state writes only to fr target bucket.

### app/exam_readiness.ts

- Action: `modify`
- Phase: `P2`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `legacy_english_compat`
- Dirty worktree overlap: no
- Reason: Read legacy flat keys only through a one-time English compatibility adapter. Copy legacy learning state to v2::en without deleting rollback keys. Make fr target reads fail closed when only legacy English keys exist.
- Rollback: Do not remove legacy keys; rollback disables v2 reads and falls back to existing English behavior.
- Tests:
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.

### app/exam.tsx

- Action: `modify`
- Phase: `P2`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `legacy_english_compat`, `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Read legacy flat keys only through a one-time English compatibility adapter. Copy legacy learning state to v2::en without deleting rollback keys. Make fr target reads fail closed when only legacy English keys exist.
- Rollback: Do not remove legacy keys; rollback disables v2 reads and falls back to existing English behavior.
- Tests:
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/firestore_leaderboard.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`
- Dirty worktree overlap: yes
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.

### app/firestore_league_chat.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.

### app/flashcards_collection.tsx

- Action: `modify`
- Phase: `P3`
- Owner area: `course`
- Risk: `blocker`
- Adapters: `flashcards_target_store`, `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Add studyTarget metadata to system and custom cards. Move progress and owned target card state under studyTarget. Keep sourceLocale translations as card copy metadata.
- Rollback: Flashcard v2 can read legacy English only when studyTarget=en.
- Tests:
  - English custom card does not appear in French unless explicitly copied.
  - French flashcard progress is independent from English progress.
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/flashcards_swipe.tsx

- Action: `modify`
- Phase: `P3`
- Owner area: `course`
- Risk: `blocker`
- Adapters: `flashcards_target_store`, `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Add studyTarget metadata to system and custom cards. Move progress and owned target card state under studyTarget. Keep sourceLocale translations as card copy metadata.
- Rollback: Flashcard v2 can read legacy English only when studyTarget=en.
- Tests:
  - English custom card does not appear in French unless explicitly copied.
  - French flashcard progress is independent from English progress.
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/flashcards.tsx

- Action: `modify`
- Phase: `P5`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Inject production studyTarget into every user-facing learning route. Replace direct target-sensitive storage reads with adapter APIs. Keep sourceLocale switching limited to copy/explanations.
- Rollback: Route integration should be feature-flagged so English-only app shell can stay active.
- Tests:
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/flashcards/storage.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `flashcards_target_store`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - English custom card does not appear in French unless explicitly copied.
  - French flashcard progress is independent from English progress.

### app/flashcards/target_storage.ts

- Action: `add`
- Phase: `P3`
- Owner area: `course`
- Risk: `blocker`
- Adapters: `flashcards_target_store`
- Dirty worktree overlap: no
- Reason: Add studyTarget metadata to system and custom cards. Move progress and owned target card state under studyTarget. Keep sourceLocale translations as card copy metadata.
- Rollback: Flashcard v2 can read legacy English only when studyTarget=en.
- Tests:
  - English custom card does not appear in French unless explicitly copied.
  - French flashcard progress is independent from English progress.

### app/global_broadcast_modal.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.

### app/legacy_english_progress_migration.ts

- Action: `add`
- Phase: `P2`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `legacy_english_compat`
- Dirty worktree overlap: no
- Reason: Read legacy flat keys only through a one-time English compatibility adapter. Copy legacy learning state to v2::en without deleting rollback keys. Make fr target reads fail closed when only legacy English keys exist.
- Rollback: Do not remove legacy keys; rollback disables v2 reads and falls back to existing English behavior.
- Tests:
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.

### app/lesson_complete.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `lesson_progress_store`, `lesson_reward_idempotency`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - English lesson completion does not mark French lesson complete.
  - French target does not reuse English unlocked_lessons.

### app/lesson_intro_screens.tsx

- Action: `modify`
- Phase: `P5`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Inject production studyTarget into every user-facing learning route. Replace direct target-sensitive storage reads with adapter APIs. Keep sourceLocale switching limited to copy/explanations.
- Rollback: Route integration should be feature-flagged so English-only app shell can stay active.
- Tests:
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/lesson_irregular_verbs.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `lesson_progress_store`, `lesson_session_store`, `lesson_reward_idempotency`, `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - English lesson completion does not mark French lesson complete.
  - French target does not reuse English unlocked_lessons.

### app/lesson_lock_system.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `lesson_progress_store`, `level_exam_certificate_store`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - English lesson completion does not mark French lesson complete.
  - French target does not reuse English unlocked_lessons.

### app/lesson_menu.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `lesson_progress_store`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - English lesson completion does not mark French lesson complete.
  - French target does not reuse English unlocked_lessons.

### app/lesson_progress_store.ts

- Action: `add`
- Phase: `P3`
- Owner area: `course`
- Risk: `blocker`
- Adapters: `lesson_progress_store`
- Dirty worktree overlap: no
- Reason: Centralize lesson progress, unlocks, words and score reads/writes. Replace direct AsyncStorage calls in lesson list/menu/runtime/completion surfaces with store calls. Keep French lesson ids separate until a French source graph approves lesson ordering.
- Rollback: Store adapter can read v2 first and legacy en second only when studyTarget=en.
- Tests:
  - English lesson completion does not mark French lesson complete.
  - French target does not reuse English unlocked_lessons.
  - Home and lessons tab render target-specific progress.

### app/lesson_screen_bootstrap.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.

### app/lesson_session_store.ts

- Action: `add`
- Phase: `P3`
- Owner area: `course`
- Risk: `blocker`
- Adapters: `lesson_session_store`
- Dirty worktree overlap: no
- Reason: Move lesson runtime session state to target-scoped local-only keys. Document these keys as not cloud-synced. Reset session state on studyTarget change unless an explicit target session exists.
- Rollback: Session adapter can clear v2 target session keys without touching legacy lesson progress.
- Tests:
  - Switch en -> fr does not resume English cell index, phrase order or replay queue.
  - Cloud sync does not export local session keys.

### app/lesson_words.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `lesson_progress_store`, `lesson_session_store`, `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - English lesson completion does not mark French lesson complete.
  - French target does not reuse English unlocked_lessons.
  - Home and lessons tab render target-specific progress.
  - Switch en -> fr does not resume English cell index, phrase order or replay queue.

### app/lesson1.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `lesson_progress_store`, `lesson_session_store`, `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - English lesson completion does not mark French lesson complete.
  - French target does not reuse English unlocked_lessons.

### app/lessons_tab_state.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `lesson_progress_store`, `level_exam_certificate_store`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - English lesson completion does not mark French lesson complete.
  - French target does not reuse English unlocked_lessons.

### app/level_exam_store.ts

- Action: `add`
- Phase: `P3`
- Owner area: `course`
- Risk: `blocker`
- Adapters: `level_exam_certificate_store`
- Dirty worktree overlap: no
- Reason: Store exam results and certificates under studyTarget. Keep English certificates mapped to en only. Do not assume French CEFR structure equals English until source graph approves it.
- Rollback: Certificate v2 can be hidden without deleting legacy certificate key.
- Tests:
  - English A1 pass does not unlock French A1 certificate.
  - French exam state writes only to fr target bucket.

### app/level_exam.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `level_exam_certificate_store`, `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - English A1 pass does not unlock French A1 certificate.
  - French exam state writes only to fr target bucket.

### app/level_gift_system.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.

### app/lifetime_profile_stats.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `quiz_progress_store`, `target_stats_store`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - French quiz navigation does not resume English quiz level.
  - French quiz counters do not increment English quiz achievements.

### app/mastery.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.

### app/medal_utils.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `level_exam_certificate_store`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - English A1 pass does not unlock French A1 certificate.
  - French exam state writes only to fr target bucket.

### app/mistake_log.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `trainer_practice_store`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - French trainer queue never reads English active_recall_items.
  - French mistake log survives ru/uk sourceLocale switch without duplicating target items.

### app/notifications.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.

### app/pack_opening.tsx

- Action: `modify`
- Phase: `P5`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Inject production studyTarget into every user-facing learning route. Replace direct target-sensitive storage reads with adapter APIs. Keep sourceLocale switching limited to copy/explanations.
- Rollback: Route integration should be feature-flagged so English-only app shell can stay active.
- Tests:
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/personal_practice_store.ts

- Action: `add`
- Phase: `P3`
- Owner area: `personal_practice`
- Risk: `blocker`
- Adapters: `personal_practice_store`
- Dirty worktree overlap: no
- Reason: Prefix every diagnosis and recommendation id with studyTarget. Store localized feedback under studyTarget/sourceLocale, not under target-only progress. Make My Practice recommendations consume target practice store snapshots.
- Rollback: Diagnosis v2 can be disabled and legacy English diagnostic_last kept as en-only.
- Tests:
  - fr:<id> and en:<id> diagnoses cannot collide.
  - Russian and Ukrainian feedback for French diagnosis do not overwrite each other.

### app/preposition_drill.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `lesson_progress_store`, `lesson_session_store`, `lesson_reward_idempotency`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - English lesson completion does not mark French lesson complete.
  - French target does not reuse English unlocked_lessons.

### app/problem_coach.tsx

- Action: `modify`
- Phase: `P3`
- Owner area: `personal_practice`
- Risk: `blocker`
- Adapters: `personal_practice_store`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Prefix every diagnosis and recommendation id with studyTarget. Store localized feedback under studyTarget/sourceLocale, not under target-only progress. Make My Practice recommendations consume target practice store snapshots.
- Rollback: Diagnosis v2 can be disabled and legacy English diagnostic_last kept as en-only.
- Tests:
  - fr:<id> and en:<id> diagnoses cannot collide.
  - Russian and Ukrainian feedback for French diagnosis do not overwrite each other.
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/quiz_progress_store.ts

- Action: `add`
- Phase: `P3`
- Owner area: `quiz`
- Risk: `blocker`
- Adapters: `quiz_progress_store`
- Dirty worktree overlap: no
- Reason: Move quiz navigation and counters to target-aware store APIs. Keep quiz_nav_level local target-scoped unless explicit cloud policy changes. Route quiz achievement counters through achievement adapter.
- Rollback: Quiz v2 keys can be cleared per target while preserving legacy English counters.
- Tests:
  - French quiz navigation does not resume English quiz level.
  - French quiz counters do not increment English quiz achievements.

### app/quizzes.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `quiz_progress_store`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - French quiz navigation does not resume English quiz level.
  - French quiz counters do not increment English quiz achievements.

### app/referral_bootstrap.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.

### app/release_wave_bonus.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.

### app/review.tsx

- Action: `modify`
- Phase: `P5`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Inject production studyTarget into every user-facing learning route. Replace direct target-sensitive storage reads with adapter APIs. Keep sourceLocale switching limited to copy/explanations.
- Rollback: Route integration should be feature-flagged so English-only app shell can stay active.
- Tests:
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/reward_idempotency_store.ts

- Action: `add`
- Phase: `P3`
- Owner area: `course`
- Risk: `blocker`
- Adapters: `lesson_reward_idempotency`
- Dirty worktree overlap: no
- Reason: Create target-scoped reward grant ids. Decide per reward whether idempotency is local target-scoped or synced under target. Map legacy reward markers to English only.
- Rollback: Preserve legacy reward markers; disable new grants behind a feature flag if needed.
- Tests:
  - French reward can be granted even if English reward marker exists.
  - Cloud restore does not double-grant target rewards.

### app/services/league_chest_rewards.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.

### app/shards_system.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.

### app/spanish_content_gate.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `study_target`
- Risk: `blocker`
- Adapters: `production_study_target`
- Dirty worktree overlap: no
- Reason: Introduce production StudyTarget type with en/fr and keep it separate from sourceLocale. Rename or isolate dev StudyTargetLang so Spanish experiments cannot drive French target selection. Expose a provider API that route surfaces can consume without reading sourceLocale as target.
- Rollback: Feature-flag the production target provider and keep dev Spanish path untouched until migration is complete.
- Tests:
  - Switch sourceLocale ru -> uk and assert studyTarget remains fr.
  - Enable French target and assert Spanish dev gates do not activate.

### app/stats_daily_breakdown.ts

- Action: `modify`
- Phase: `P4`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_stats_store`
- Dirty worktree overlap: no
- Reason: Split global engagement stats from target learning stats. Decide whether XP stays global while words/phrases/quizzes become target-scoped. Route progress_map and lifetime profile reads through split stats APIs.
- Rollback: Keep v1 stats payloads intact and expose v2 stats behind target feature flag.
- Tests:
  - French words/phrases/quizzes do not increment English target stats.
  - Global engagement counters remain shared after target switch.

### app/streak_safety.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.

### app/study_target_lang_dev.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `study_target`
- Risk: `blocker`
- Adapters: `production_study_target`
- Dirty worktree overlap: no
- Reason: Introduce production StudyTarget type with en/fr and keep it separate from sourceLocale. Rename or isolate dev StudyTargetLang so Spanish experiments cannot drive French target selection. Expose a provider API that route surfaces can consume without reading sourceLocale as target.
- Rollback: Feature-flag the production target provider and keep dev Spanish path untouched until migration is complete.
- Tests:
  - Switch sourceLocale ru -> uk and assert studyTarget remains fr.
  - Enable French target and assert Spanish dev gates do not activate.

### app/study_target.ts

- Action: `add`
- Phase: `P1`
- Owner area: `study_target`
- Risk: `blocker`
- Adapters: `production_study_target`
- Dirty worktree overlap: no
- Reason: Introduce production StudyTarget type with en/fr and keep it separate from sourceLocale. Rename or isolate dev StudyTargetLang so Spanish experiments cannot drive French target selection. Expose a provider API that route surfaces can consume without reading sourceLocale as target.
- Rollback: Feature-flag the production target provider and keep dev Spanish path untouched until migration is complete.
- Tests:
  - Switch sourceLocale ru -> uk and assert studyTarget remains fr.
  - Enable French target and assert Spanish dev gates do not activate.

### app/target_practice_store.ts

- Action: `add`
- Phase: `P3`
- Owner area: `trainer`
- Risk: `blocker`
- Adapters: `trainer_practice_store`
- Dirty worktree overlap: no
- Reason: Move trainer_store, mistake_log and active_recall queues under studyTarget. Keep sourceLocale feedback separate from target practice state. Expose one practice store consumed by trainer and My Practice surfaces.
- Rollback: Keep legacy trainer_store_v1 and mistake_log_v1 mapped to en only.
- Tests:
  - French trainer queue never reads English active_recall_items.
  - French mistake log survives ru/uk sourceLocale switch without duplicating target items.

### app/target_stats_store.ts

- Action: `add`
- Phase: `P4`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_stats_store`
- Dirty worktree overlap: no
- Reason: Split global engagement stats from target learning stats. Decide whether XP stays global while words/phrases/quizzes become target-scoped. Route progress_map and lifetime profile reads through split stats APIs.
- Rollback: Keep v1 stats payloads intact and expose v2 stats behind target feature flag.
- Tests:
  - French words/phrases/quizzes do not increment English target stats.
  - Global engagement counters remain shared after target switch.

### app/target_storage_keys.ts

- Action: `add`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.

### app/trainer_arena_session.tsx

- Action: `modify`
- Phase: `P3`
- Owner area: `trainer`
- Risk: `blocker`
- Adapters: `trainer_practice_store`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Move trainer_store, mistake_log and active_recall queues under studyTarget. Keep sourceLocale feedback separate from target practice state. Expose one practice store consumed by trainer and My Practice surfaces.
- Rollback: Keep legacy trainer_store_v1 and mistake_log_v1 mapped to en only.
- Tests:
  - French trainer queue never reads English active_recall_items.
  - French mistake log survives ru/uk sourceLocale switch without duplicating target items.
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/trainer_phrases_session.tsx

- Action: `modify`
- Phase: `P3`
- Owner area: `trainer`
- Risk: `blocker`
- Adapters: `trainer_practice_store`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Move trainer_store, mistake_log and active_recall queues under studyTarget. Keep sourceLocale feedback separate from target practice state. Expose one practice store consumed by trainer and My Practice surfaces.
- Rollback: Keep legacy trainer_store_v1 and mistake_log_v1 mapped to en only.
- Tests:
  - French trainer queue never reads English active_recall_items.
  - French mistake log survives ru/uk sourceLocale switch without duplicating target items.
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/trainer_smart_session.tsx

- Action: `modify`
- Phase: `P3`
- Owner area: `trainer`
- Risk: `blocker`
- Adapters: `trainer_practice_store`, `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Move trainer_store, mistake_log and active_recall queues under studyTarget. Keep sourceLocale feedback separate from target practice state. Expose one practice store consumed by trainer and My Practice surfaces.
- Rollback: Keep legacy trainer_store_v1 and mistake_log_v1 mapped to en only.
- Tests:
  - French trainer queue never reads English active_recall_items.
  - French mistake log survives ru/uk sourceLocale switch without duplicating target items.
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/trainer_store.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `trainer_practice_store`
- Dirty worktree overlap: no
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - French trainer queue never reads English active_recall_items.
  - French mistake log survives ru/uk sourceLocale switch without duplicating target items.

### app/trainer_words_session.tsx

- Action: `modify`
- Phase: `P3`
- Owner area: `trainer`
- Risk: `blocker`
- Adapters: `trainer_practice_store`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Move trainer_store, mistake_log and active_recall queues under studyTarget. Keep sourceLocale feedback separate from target practice state. Expose one practice store consumed by trainer and My Practice surfaces.
- Rollback: Keep legacy trainer_store_v1 and mistake_log_v1 mapped to en only.
- Tests:
  - French trainer queue never reads English active_recall_items.
  - French mistake log survives ru/uk sourceLocale switch without duplicating target items.
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### app/trainer.tsx

- Action: `modify`
- Phase: `P3`
- Owner area: `trainer`
- Risk: `blocker`
- Adapters: `trainer_practice_store`, `route_surface_integration`
- Dirty worktree overlap: yes
- Reason: Move trainer_store, mistake_log and active_recall queues under studyTarget. Keep sourceLocale feedback separate from target practice state. Expose one practice store consumed by trainer and My Practice surfaces.
- Rollback: Keep legacy trainer_store_v1 and mistake_log_v1 mapped to en only.
- Tests:
  - French trainer queue never reads English active_recall_items.
  - French mistake log survives ru/uk sourceLocale switch without duplicating target items.
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### components/LangContext.tsx

- Action: `modify`
- Phase: `P5`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Inject production studyTarget into every user-facing learning route. Replace direct target-sensitive storage reads with adapter APIs. Keep sourceLocale switching limited to copy/explanations.
- Rollback: Route integration should be feature-flagged so English-only app shell can stay active.
- Tests:
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### components/StudyTargetContext.tsx

- Action: `modify`
- Phase: `P1`
- Owner area: `study_target`
- Risk: `blocker`
- Adapters: `production_study_target`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Introduce production StudyTarget type with en/fr and keep it separate from sourceLocale. Rename or isolate dev StudyTargetLang so Spanish experiments cannot drive French target selection. Expose a provider API that route surfaces can consume without reading sourceLocale as target.
- Rollback: Feature-flag the production target provider and keep dev Spanish path untouched until migration is complete.
- Tests:
  - Switch sourceLocale ru -> uk and assert studyTarget remains fr.
  - Enable French target and assert Spanish dev gates do not activate.
  - Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
  - No user-facing French route displays English progress after target switch.

### hooks/use-flashcards.ts

- Action: `modify`
- Phase: `P1`
- Owner area: `storage`
- Risk: `blocker`
- Adapters: `target_storage_key_builder`, `legacy_english_compat`, `flashcards_target_store`
- Dirty worktree overlap: yes
- Reason: Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper. Add a runtime assertTargetKey guard for target-sensitive domains. Allow raw legacy keys only inside explicitly named migration adapters.
- Rollback: Keep helper additive first; do not delete legacy keys until migration confidence is recorded.
- Tests:
  - Key builder returns distinct keys for en/fr for every target-sensitive domain.
  - Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.
  - Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
  - French user sees empty target state even when legacy English progress exists.
  - English custom card does not appear in French unless explicitly copied.
  - French flashcard progress is independent from English progress.

### tests/gustav_cloud_target_sync.test.ts

- Action: `add`
- Phase: `P5`
- Owner area: `tests`
- Risk: `high`
- Adapters: `raw_storage_guard`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Verify target isolation before French generation is allowed.
- Rollback: Remove proposed test files if the apply plan is rejected; no production state changes are made.
- Tests:
  - Run target-isolation test suite before any French generation.

### tests/gustav_legacy_english_migration.test.ts

- Action: `add`
- Phase: `P5`
- Owner area: `tests`
- Risk: `high`
- Adapters: `raw_storage_guard`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Verify target isolation before French generation is allowed.
- Rollback: Remove proposed test files if the apply plan is rejected; no production state changes are made.
- Tests:
  - Run target-isolation test suite before any French generation.

### tests/gustav_surface_target_switch.test.ts

- Action: `add`
- Phase: `P5`
- Owner area: `tests`
- Risk: `high`
- Adapters: `raw_storage_guard`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Verify target isolation before French generation is allowed.
- Rollback: Remove proposed test files if the apply plan is rejected; no production state changes are made.
- Tests:
  - Run target-isolation test suite before any French generation.

### tests/gustav_target_storage_keys.test.ts

- Action: `add`
- Phase: `P5`
- Owner area: `tests`
- Risk: `high`
- Adapters: `raw_storage_guard`, `route_surface_integration`
- Dirty worktree overlap: no
- Reason: Verify target isolation before French generation is allowed.
- Rollback: Remove proposed test files if the apply plan is rejected; no production state changes are made.
- Tests:
  - Run target-isolation test suite before any French generation.

## Notes

- This plan is a proposal only; it does not authorize production writes.
- No French content may be generated from this plan alone.
- Every production file write must remain inside this file list after approval.
