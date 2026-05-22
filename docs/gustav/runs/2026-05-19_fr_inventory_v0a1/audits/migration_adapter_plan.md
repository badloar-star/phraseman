# GUSTAV Migration Adapter Plan

Run: `2026-05-19_fr_inventory_v0a1`

Status: `HOLD`

Generated at: 2026-05-19T18:01:42.917Z

## Summary

- Phases: 6
- Adapters: 16
- Blocker adapters: 16
- Product modules: 35
- Source files covered: 61
- Storage keys covered: 99
- Target storage records: 348
- Surface blockers: 92
- Cloud target mappings: 42
- Local/cloud decisions: 28
- Can start French generation after this plan only: no

## Phases

### P0: Plan-only freeze

Status: `HOLD`
Adapters: 

Exit criteria:
- No product runtime files are changed by this plan.
- Adapter plan is reviewed with storage, cloud, route and My Practice risks visible.

### P1: Production target identity and key builder

Status: `HOLD`
Adapters: `production_study_target`, `target_storage_key_builder`

Exit criteria:
- Production StudyTarget is separate from sourceLocale and dev StudyTargetLang.
- Target storage keys can be generated and tested for en/fr.

### P2: Legacy English compatibility

Status: `HOLD`
Adapters: `legacy_english_compat`

Exit criteria:
- Legacy flat learning state copies to en only.
- French reads have no legacy fallback.

### P3: Target local stores for learning surfaces

Status: `HOLD`
Adapters: `lesson_progress_store`, `lesson_session_store`, `lesson_reward_idempotency`, `level_exam_certificate_store`, `quiz_progress_store`, `trainer_practice_store`, `personal_practice_store`, `flashcards_target_store`

Exit criteria:
- Lessons, quizzes, trainer, My Practice and flashcards use target-aware store APIs.
- Route-level target switch tests pass for en/fr.

### P4: Cloud, achievements and stats split

Status: `HOLD`
Adapters: `achievement_progress_store`, `target_stats_store`, `cloud_sync_target_buckets`

Exit criteria:
- Global versus target payloads are split.
- Cloud restore hydrates only selected target buckets.

### P5: Surface integration and guards

Status: `HOLD`
Adapters: `route_surface_integration`, `raw_storage_guard`

Exit criteria:
- All user-facing blocker surfaces are covered by target-aware adapters.
- Readiness gate returns GO for French generation.

## Adapters

### production_study_target

Phase: `P1`
Status: `HOLD`
Risk: `blocker`
Owner area: `study_target`

Product modules:
- `app/study_target.ts`
- `components/StudyTargetContext.tsx`

Covered source files:
- `app/study_target_lang_dev.ts`
- `components/StudyTargetContext.tsx`
- `app/spanish_content_gate.ts`
- `app/(tabs)/settings.tsx`

Storage keys:
- `study_target_v1`
- `dev_study_target_lang`

Implementation steps:
- Introduce production StudyTarget type with en/fr and keep it separate from sourceLocale.
- Rename or isolate dev StudyTargetLang so Spanish experiments cannot drive French target selection.
- Expose a provider API that route surfaces can consume without reading sourceLocale as target.

Tests required:
- Switch sourceLocale ru -> uk and assert studyTarget remains fr.
- Enable French target and assert Spanish dev gates do not activate.

Rollback notes:
- Feature-flag the production target provider and keep dev Spanish path untouched until migration is complete.

Blockers:
- Current StudyTargetLang is dev-only en/es.
- Production StudyTarget does not exist yet.

### target_storage_key_builder

Phase: `P1`
Status: `HOLD`
Risk: `blocker`
Owner area: `storage`
Depends on: `production_study_target`

Product modules:
- `app/target_storage_keys.ts`

Covered source files:
- `app/(tabs)/home.tsx`
- `app/(tabs)/lessons.tsx`
- `app/(tabs)/quizzes.tsx`
- `app/achievements.ts`
- `app/achievements_screen.tsx`
- `app/active_recall.ts`
- `app/auth_provider.ts`
- `app/cloud_sync.ts`
- `app/daily_tasks.ts`
- `app/daily_tasks_screen.tsx`
- `app/diagnostic_test.tsx`
- `app/exam_certificate.ts`

Storage keys:
- `achievement_active_recall_correct_count`
- `achievement_daily_phrase_read_count`
- `achievement_daily_phrase_save_count`
- `achievement_flashcards_flip_count`
- `achievement_flashcards_saved_count`
- `achievement_flashcards_source_set_v1`
- `achievement_flashcards_view_streak_v1`
- `achievement_lesson_${...}_perfect_passes_v1`
- `achievement_quiz_hard_perfect_count`
- `achievement_quiz_perfect_levels_today_v1`
- `achievement_quiz_perfect_streak_v1`
- `achievement_quiz_total_count`
- `achievement_trainer_correct_count`
- `achievement_trainer_correct_streak_v1`
- `achievement_trainer_perfect_session_count`
- `active_recall_items`

Implementation steps:
- Create typed targetKey/sourceTargetKey helpers and legacyEnglishKey compatibility helper.
- Add a runtime assertTargetKey guard for target-sensitive domains.
- Allow raw legacy keys only inside explicitly named migration adapters.

Tests required:
- Key builder returns distinct keys for en/fr for every target-sensitive domain.
- Raw storage guard fails on a new flat lesson/trainer/quiz key outside migration adapters.

Rollback notes:
- Keep helper additive first; do not delete legacy keys until migration confidence is recorded.

Blockers:
- 348 target-sensitive storage records still exist.
- Raw target-sensitive key families still need routing.

### legacy_english_compat

Phase: `P2`
Status: `HOLD`
Risk: `blocker`
Owner area: `storage`
Depends on: `target_storage_key_builder`

Product modules:
- `app/legacy_english_progress_migration.ts`

Covered source files:
- `app/(tabs)/home.tsx`
- `app/(tabs)/lessons.tsx`
- `app/(tabs)/quizzes.tsx`
- `app/achievements.ts`
- `app/achievements_screen.tsx`
- `app/active_recall.ts`
- `app/auth_provider.ts`
- `app/cloud_sync.ts`
- `app/daily_tasks_screen.tsx`
- `app/diagnostic_test.tsx`
- `app/exam.tsx`
- `app/exam_readiness.ts`

Storage keys:
- `achievement_active_recall_correct_count`
- `achievement_daily_phrase_read_count`
- `achievement_daily_phrase_save_count`
- `achievement_flashcards_flip_count`
- `achievement_flashcards_saved_count`
- `achievement_flashcards_source_set_v1`
- `achievement_flashcards_view_streak_v1`
- `achievement_lesson_${...}_perfect_passes_v1`
- `achievement_quiz_hard_perfect_count`
- `achievement_quiz_perfect_levels_today_v1`
- `achievement_quiz_perfect_streak_v1`
- `achievement_quiz_total_count`
- `achievement_trainer_correct_count`
- `achievement_trainer_correct_streak_v1`
- `achievement_trainer_perfect_session_count`
- `active_recall_items`

Implementation steps:
- Read legacy flat keys only through a one-time English compatibility adapter.
- Copy legacy learning state to v2::en without deleting rollback keys.
- Make fr target reads fail closed when only legacy English keys exist.

Tests required:
- Existing English user keeps lesson, quiz, trainer and flashcard state after migration.
- French user sees empty target state even when legacy English progress exists.

Rollback notes:
- Do not remove legacy keys; rollback disables v2 reads and falls back to existing English behavior.

Blockers:
- Legacy English mapping has not been implemented or tested.

### lesson_progress_store

Phase: `P3`
Status: `HOLD`
Risk: `blocker`
Owner area: `lesson`
Depends on: `legacy_english_compat`

Product modules:
- `app/lesson_progress_store.ts`

Covered source files:
- `app/(tabs)/home.tsx`
- `app/(tabs)/lessons.tsx`
- `app/lesson1.tsx`
- `app/lesson_complete.tsx`
- `app/lesson_irregular_verbs.tsx`
- `app/lesson_lock_system.ts`
- `app/lesson_menu.tsx`
- `app/lesson_words.tsx`
- `app/lessons_tab_state.ts`
- `app/preposition_drill.tsx`

Storage keys:
- `lesson${...}_best_score`
- `lesson${...}_listening_progress`
- `lesson${...}_pass_count`
- `lesson${...}_preposition_progress`
- `lesson${...}_progress`
- `lesson${...}_words`
- `lesson1_progress`
- `lesson1_words`
- `unlocked_lessons`

Implementation steps:
- Centralize lesson progress, unlocks, words and score reads/writes.
- Replace direct AsyncStorage calls in lesson list/menu/runtime/completion surfaces with store calls.
- Keep French lesson ids separate until a French source graph approves lesson ordering.

Tests required:
- English lesson completion does not mark French lesson complete.
- French target does not reuse English unlocked_lessons.
- Home and lessons tab render target-specific progress.

Rollback notes:
- Store adapter can read v2 first and legacy en second only when studyTarget=en.

Blockers:
- Lesson surfaces currently use flat lesson keys across multiple screens.

### lesson_session_store

Phase: `P3`
Status: `HOLD`
Risk: `blocker`
Owner area: `lesson`
Depends on: `target_storage_key_builder`

Product modules:
- `app/lesson_session_store.ts`

Covered source files:
- `app/lesson1.tsx`
- `app/lesson_irregular_verbs.tsx`
- `app/lesson_words.tsx`
- `app/preposition_drill.tsx`

Storage keys:
- `lesson${...}_cellIndex`
- `lesson${...}_errorReplayOverride`
- `lesson${...}_errorReplayQueue`
- `lesson${...}_errorReplaySince`
- `lesson${...}_intro_shown`
- `lesson${...}_phraseOrder`

Implementation steps:
- Move lesson runtime session state to target-scoped local-only keys.
- Document these keys as not cloud-synced.
- Reset session state on studyTarget change unless an explicit target session exists.

Tests required:
- Switch en -> fr does not resume English cell index, phrase order or replay queue.
- Cloud sync does not export local session keys.

Rollback notes:
- Session adapter can clear v2 target session keys without touching legacy lesson progress.

Blockers:
- Lesson runtime can resume local state from the wrong target.

### lesson_reward_idempotency

Phase: `P3`
Status: `HOLD`
Risk: `blocker`
Owner area: `lesson`
Depends on: `target_storage_key_builder`

Product modules:
- `app/reward_idempotency_store.ts`

Covered source files:
- `app/lesson_complete.tsx`
- `app/lesson_irregular_verbs.tsx`
- `app/preposition_drill.tsx`

Storage keys:
- `lesson${...}_bonus_granted`
- `lesson${...}_irregular_shards_granted`
- `prep_drill_perfect_${...}`

Implementation steps:
- Create target-scoped reward grant ids.
- Decide per reward whether idempotency is local target-scoped or synced under target.
- Map legacy reward markers to English only.

Tests required:
- French reward can be granted even if English reward marker exists.
- Cloud restore does not double-grant target rewards.

Rollback notes:
- Preserve legacy reward markers; disable new grants behind a feature flag if needed.

Blockers:
- Flat reward markers can suppress or duplicate French rewards.

### level_exam_certificate_store

Phase: `P3`
Status: `HOLD`
Risk: `blocker`
Owner area: `lesson`
Depends on: `legacy_english_compat`

Product modules:
- `app/level_exam_store.ts`
- `app/certificate_store.ts`

Covered source files:
- `app/(tabs)/lessons.tsx`
- `app/cloud_sync.ts`
- `app/exam_certificate.ts`
- `app/lesson_lock_system.ts`
- `app/lessons_tab_state.ts`
- `app/level_exam.tsx`
- `app/medal_utils.ts`

Storage keys:
- `level_exam_${...}_best_pct`
- `level_exam_${...}_pass_count`
- `level_exam_${...}_passed`
- `level_exam_${...}_pct`
- `level_exam_A1_best_pct`
- `level_exam_A1_pass_count`
- `level_exam_A1_passed`
- `level_exam_A1_pct`
- `level_exam_A2_best_pct`
- `level_exam_A2_pass_count`
- `level_exam_A2_passed`
- `level_exam_A2_pct`
- `level_exam_B1_best_pct`
- `level_exam_B1_pass_count`
- `level_exam_B1_passed`
- `level_exam_B1_pct`

Implementation steps:
- Store exam results and certificates under studyTarget.
- Keep English certificates mapped to en only.
- Do not assume French CEFR structure equals English until source graph approves it.

Tests required:
- English A1 pass does not unlock French A1 certificate.
- French exam state writes only to fr target bucket.

Rollback notes:
- Certificate v2 can be hidden without deleting legacy certificate key.

Blockers:
- Exam/certificate proof state is currently target-unscoped.

### quiz_progress_store

Phase: `P3`
Status: `HOLD`
Risk: `blocker`
Owner area: `quiz`
Depends on: `target_storage_key_builder`

Product modules:
- `app/quiz_progress_store.ts`

Covered source files:
- `app/(tabs)/quizzes.tsx`
- `app/daily_tasks_screen.tsx`
- `app/lifetime_profile_stats.ts`
- `app/quizzes.tsx`

Storage keys:
- `achievement_quiz_hard_perfect_count`
- `achievement_quiz_perfect_levels_today_v1`
- `achievement_quiz_perfect_streak_v1`
- `achievement_quiz_total_count`
- `lifetime_quiz_counters_migrated_v1`
- `lifetime_quiz_easy_v1`
- `lifetime_quiz_hard_v1`
- `lifetime_quiz_medium_v1`
- `quiz_hard_count`
- `quiz_nav_level`

Implementation steps:
- Move quiz navigation and counters to target-aware store APIs.
- Keep quiz_nav_level local target-scoped unless explicit cloud policy changes.
- Route quiz achievement counters through achievement adapter.

Tests required:
- French quiz navigation does not resume English quiz level.
- French quiz counters do not increment English quiz achievements.

Rollback notes:
- Quiz v2 keys can be cleared per target while preserving legacy English counters.

Blockers:
- Quiz state has direct route and tab surfaces with target-sensitive keys.

### trainer_practice_store

Phase: `P3`
Status: `HOLD`
Risk: `blocker`
Owner area: `trainer`
Depends on: `target_storage_key_builder`

Product modules:
- `app/target_practice_store.ts`
- `app/trainer_store.ts`
- `app/mistake_log.ts`
- `app/active_recall.ts`

Covered source files:
- `app/active_recall.ts`
- `app/mistake_log.ts`
- `app/trainer.tsx`
- `app/trainer_arena_session.tsx`
- `app/trainer_phrases_session.tsx`
- `app/trainer_smart_session.tsx`
- `app/trainer_store.ts`
- `app/trainer_words_session.tsx`

Storage keys:
- `achievement_active_recall_correct_count`
- `achievement_trainer_correct_count`
- `achievement_trainer_correct_streak_v1`
- `achievement_trainer_perfect_session_count`
- `active_recall_items`
- `lesson${...}_preposition_progress`
- `mistake_log_v1`
- `prep_drill_perfect_${...}`
- `trainer_store_v1`

Implementation steps:
- Move trainer_store, mistake_log and active_recall queues under studyTarget.
- Keep sourceLocale feedback separate from target practice state.
- Expose one practice store consumed by trainer and My Practice surfaces.

Tests required:
- French trainer queue never reads English active_recall_items.
- French mistake log survives ru/uk sourceLocale switch without duplicating target items.

Rollback notes:
- Keep legacy trainer_store_v1 and mistake_log_v1 mapped to en only.

Blockers:
- Trainer and mistake logs carry target-language material.

### personal_practice_store

Phase: `P3`
Status: `HOLD`
Risk: `blocker`
Owner area: `personal_practice`
Depends on: `trainer_practice_store`

Product modules:
- `app/personal_practice_store.ts`
- `app/diagnostic_store.ts`

Covered source files:
- `app/diagnostic_test.tsx`
- `app/problem_coach.tsx`

Storage keys:
- `diagnostic_last`
- `open_diagnostic`

Implementation steps:
- Prefix every diagnosis and recommendation id with studyTarget.
- Store localized feedback under studyTarget/sourceLocale, not under target-only progress.
- Make My Practice recommendations consume target practice store snapshots.

Tests required:
- fr:<id> and en:<id> diagnoses cannot collide.
- Russian and Ukrainian feedback for French diagnosis do not overwrite each other.

Rollback notes:
- Diagnosis v2 can be disabled and legacy English diagnostic_last kept as en-only.

Blockers:
- My Practice can otherwise mix English diagnosis and French recommendations.

### flashcards_target_store

Phase: `P3`
Status: `HOLD`
Risk: `blocker`
Owner area: `flashcards`
Depends on: `target_storage_key_builder`

Product modules:
- `app/flashcards/target_storage.ts`
- `hooks/use-flashcards.ts`

Covered source files:
- `app/flashcards/storage.ts`
- `app/flashcards_collection.tsx`
- `app/flashcards_swipe.tsx`
- `hooks/use-flashcards.ts`

Storage keys:
- `achievement_flashcards_flip_count`
- `achievement_flashcards_saved_count`
- `achievement_flashcards_source_set_v1`
- `achievement_flashcards_view_streak_v1`
- `custom_flashcards_v2`
- `flashcards`
- `flashcards_v1`
- `irregular_verbs_global`

Implementation steps:
- Add studyTarget metadata to system and custom cards.
- Move progress and owned target card state under studyTarget.
- Keep sourceLocale translations as card copy metadata.

Tests required:
- English custom card does not appear in French unless explicitly copied.
- French flashcard progress is independent from English progress.

Rollback notes:
- Flashcard v2 can read legacy English only when studyTarget=en.

Blockers:
- Flashcard content and progress are target-sensitive.

### achievement_progress_store

Phase: `P4`
Status: `HOLD`
Risk: `blocker`
Owner area: `achievements`
Depends on: `lesson_progress_store`, `quiz_progress_store`, `trainer_practice_store`, `flashcards_target_store`

Product modules:
- `app/achievement_progress_store.ts`
- `app/achievements.ts`
- `app/achievements_screen.tsx`

Covered source files:
- `app/achievements.ts`
- `app/achievements_screen.tsx`

Storage keys:
- `achievement_active_recall_correct_count`
- `achievement_daily_phrase_read_count`
- `achievement_daily_phrase_save_count`
- `achievement_flashcards_flip_count`
- `achievement_flashcards_saved_count`
- `achievement_flashcards_source_set_v1`
- `achievement_flashcards_view_streak_v1`
- `achievement_lesson_${...}_perfect_passes_v1`
- `achievement_quiz_hard_perfect_count`
- `achievement_quiz_perfect_levels_today_v1`
- `achievement_quiz_perfect_streak_v1`
- `achievement_quiz_total_count`
- `achievement_trainer_correct_count`
- `achievement_trainer_correct_streak_v1`
- `achievement_trainer_perfect_session_count`

Implementation steps:
- Split achievement state into global and target buckets using taxonomy.
- Route target-content counters through target stores.
- Hold mixed achievements until product policy decides global versus per-target behavior.

Tests required:
- Target achievement unlocks independently for en and fr.
- Global achievement remains shared only when taxonomy says global.

Rollback notes:
- Keep flat achievements_state read-only during migration and never delete before rollback window.

Blockers:
- Achievement taxonomy still contains target and mixed blocker entries.

### target_stats_store

Phase: `P4`
Status: `HOLD`
Risk: `blocker`
Owner area: `stats`
Depends on: `lesson_progress_store`, `quiz_progress_store`, `trainer_practice_store`

Product modules:
- `app/target_stats_store.ts`
- `app/lifetime_profile_stats.ts`
- `app/stats_daily_breakdown.ts`

Covered source files:
- `app/cloud_sync.ts`
- `app/lifetime_profile_stats.ts`

Storage keys:
- `lifetime_quiz_counters_migrated_v1`
- `lifetime_quiz_easy_v1`
- `lifetime_quiz_hard_v1`
- `lifetime_quiz_medium_v1`

Implementation steps:
- Split global engagement stats from target learning stats.
- Decide whether XP stays global while words/phrases/quizzes become target-scoped.
- Route progress_map and lifetime profile reads through split stats APIs.

Tests required:
- French words/phrases/quizzes do not increment English target stats.
- Global engagement counters remain shared after target switch.

Rollback notes:
- Keep v1 stats payloads intact and expose v2 stats behind target feature flag.

Blockers:
- Stats payloads currently mix global and target learning fields.

### cloud_sync_target_buckets

Phase: `P4`
Status: `HOLD`
Risk: `blocker`
Owner area: `cloud`
Depends on: `lesson_progress_store`, `quiz_progress_store`, `trainer_practice_store`, `flashcards_target_store`, `achievement_progress_store`, `target_stats_store`

Product modules:
- `app/cloud_sync.ts`
- `app/auth_provider.ts`

Covered source files:
- `app/auth_provider.ts`
- `app/cloud_sync.ts`

Storage keys:
- `achievement_active_recall_correct_count`
- `achievement_all_daily_streak_v1`
- `achievement_arena_wager_win_count`
- `achievement_arena_win_count`
- `achievement_arena_win_streak`
- `achievement_energy_refill_count`
- `achievement_flashcards_flip_count`
- `achievement_flashcards_saved_count`
- `achievement_flashcards_source_set_v1`
- `achievement_flashcards_view_streak_v1`
- `achievement_gift_sent_count`
- `achievement_league_boost_count`
- `achievement_league_chat_message_count`
- `achievement_shards_spent_total`
- `achievement_trainer_correct_count`
- `achievement_trainer_correct_streak_v1`

Implementation steps:
- Move cloud learning payloads under progress/targets/{studyTarget}.
- Keep global account/product state under progress/global.
- Restore only selected target buckets and map legacy flat cloud state to en.

Tests required:
- Cloud restore for en does not write fr target keys.
- Cloud restore for fr does not overwrite en target keys.
- Empty local AsyncStorage cannot overwrite existing target cloud buckets.

Rollback notes:
- Do not delete legacy cloud fields until dual-read window is complete.

Blockers:
- Cloud sync mapping still has target and mixed payload blockers.

### route_surface_integration

Phase: `P5`
Status: `HOLD`
Risk: `blocker`
Owner area: `ui`
Depends on: `production_study_target`, `lesson_progress_store`, `quiz_progress_store`, `trainer_practice_store`, `flashcards_target_store`, `achievement_progress_store`

Product modules:
- `app/_layout.tsx`
- `app/(tabs)/home.tsx`
- `app/(tabs)/lessons.tsx`
- `app/lesson1.tsx`
- `app/quizzes.tsx`
- `app/trainer.tsx`
- `app/flashcards.tsx`

Covered source files:
- `app/(tabs)/home.tsx`
- `app/(tabs)/lessons.tsx`
- `app/(tabs)/quizzes.tsx`
- `app/(tabs)/settings.tsx`
- `app/achievements_screen.tsx`
- `app/arena_leaderboard.tsx`
- `app/arena_rating.tsx`
- `app/avatar_select.tsx`
- `app/daily_tasks_screen.tsx`
- `app/diagnostic_test.tsx`
- `app/exam.tsx`
- `app/flashcards_collection.tsx`

Implementation steps:
- Inject production studyTarget into every user-facing learning route.
- Replace direct target-sensitive storage reads with adapter APIs.
- Keep sourceLocale switching limited to copy/explanations.

Tests required:
- Route smoke matrix: ru/fr, uk/fr, ru/en and uk/en.
- No user-facing French route displays English progress after target switch.

Rollback notes:
- Route integration should be feature-flagged so English-only app shell can stay active.

Blockers:
- 66 blocker surfaces remain in current inventory.

### raw_storage_guard

Phase: `P5`
Status: `HOLD`
Risk: `blocker`
Owner area: `tests`
Depends on: `target_storage_key_builder`

Product modules:
- `scripts/gustav_storage_inventory.ts`
- `tests/target_storage_keys.test.ts`

Implementation steps:
- Add CI/test gate that fails new raw target-sensitive AsyncStorage keys outside migration adapters.
- Update Gustav readiness gate to require adapter-plan implementation evidence, not just plan existence.
- Keep generated French blocked until this guard is green.

Tests required:
- Adding AsyncStorage.getItem(`lesson${id}_progress`) outside adapter must fail guard.
- Migration adapter raw legacy reads are allowed by explicit allowlist only.

Rollback notes:
- Guard can start as warning in architecture branch, then become blocking before French generation.

Blockers:
- No raw storage guard exists yet.

## Highest Risk Files

- `app/cloud_sync.ts` (cloud_sync): 47 target records, 2 blockers
- `app/achievements.ts` (achievements): 35 target records, 1 blockers
- `app/lesson1.tsx` (lesson_runtime): 31 target records, 2 blockers
- `app/lesson_lock_system.ts` (lesson_list): 17 target records, 1 blockers
- `app/achievements_screen.tsx` (achievements): 15 target records, 2 blockers
- `app/medal_utils.ts` (other): 13 target records, 1 blockers
- `app/release_wave_bonus.ts` (other): 13 target records, 1 blockers
- `app/lesson_menu.tsx` (lesson_menu): 12 target records, 2 blockers
- `app/lifetime_profile_stats.ts` (quiz): 9 target records, 1 blockers
- `app/(tabs)/quizzes.tsx` (quiz): 8 target records, 3 blockers
- `app/quizzes.tsx` (quiz): 8 target records, 3 blockers
- `app/(tabs)/lessons.tsx` (lesson_list): 8 target records, 2 blockers
- `app/daily_tasks.ts` (other): 7 target records, 1 blockers
- `app/lessons_tab_state.ts` (lesson_list): 7 target records, 1 blockers
- `app/services/league_chest_rewards.ts` (social_arena): 7 target records, 1 blockers
- `app/lesson_complete.tsx` (lesson_completion): 6 target records, 2 blockers
- `app/lesson_irregular_verbs.tsx` (lesson_runtime): 6 target records, 2 blockers
- `app/mistake_log.ts` (trainer_practice): 6 target records, 2 blockers
- `app/lesson_screen_bootstrap.ts` (other): 6 target records, 1 blockers
- `app/active_recall.ts` (trainer_practice): 5 target records, 2 blockers
- `app/daily_tasks_screen.tsx` (quiz): 5 target records, 2 blockers
- `app/level_gift_system.ts` (commerce_rewards): 5 target records, 1 blockers
- `app/mastery.ts` (other): 5 target records, 1 blockers
- `app/diagnostic_test.tsx` (personal_practice): 4 target records, 3 blockers
- `app/lesson_words.tsx` (lesson_runtime): 4 target records, 2 blockers
- `app/preposition_drill.tsx` (lesson_runtime): 4 target records, 2 blockers
- `app/trainer_store.ts` (trainer_practice): 4 target records, 2 blockers
- `app/global_broadcast_modal.ts` (other): 4 target records, 1 blockers
- `app/notifications.ts` (other): 4 target records, 1 blockers
- `hooks/use-flashcards.ts` (flashcards): 4 target records, 1 blockers

## Notes

- This is an implementation strategy artifact, not permission to edit product runtime files.
- Every adapter remains HOLD until implemented and verified by tests.
- French generation remains blocked after this plan because planning does not equal target-safe storage/runtime implementation.
