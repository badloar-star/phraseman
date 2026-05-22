# GUSTAV Target Key Integration Plan

Run: `2026-05-19_fr_inventory_v0a1`

Status: `HOLD`

Generated at: 2026-05-20T18:32:20.557Z

## Summary

- Domains: 14
- Files with target storage touchpoints: 56
- Raw target storage records: 330
- Cloud target mappings: 52
- Local/cloud decisions: 28
- Blocker domains: 14
- Blockers: 20

## Existing Dev Study Target Warning

PhraseMan already contains a dev-only StudyTargetLang path for en/es. Gustav must not treat it as the production multi-language target model for French.

- `app/study_target_lang_dev.ts`
- `components/StudyTargetContext.tsx`
- `app/spanish_content_gate.ts`
- `app/lesson_data_all.ts`
- `app/lesson_intro_screens.tsx`
- `app/(tabs)/settings.tsx`
- `app/flashcards_collection.tsx`
- `app/_admin_intro_preview.tsx`

Required before French:

- Rename or isolate dev StudyTargetLang from production StudyTarget.
- Define production StudyTarget as en/fr before any target-aware storage migration.
- Audit all imports of StudyTargetLang so French does not inherit Spanish dev gates.

## Phases

### P0: Freeze inventory and block product writes

Status: `HOLD`

- Keep Gustav in run-only artifact mode until target storage design is approved.
- Re-run storage, cloud and target integration validators after any app storage change.

### P1: Introduce production StudyTarget and key builder

Status: `HOLD`

- Add production StudyTarget model independent from sourceLocale and dev Spanish target.
- Create target key builder and raw-key guard tests.

### P2: Migrate English compatibility only

Status: `HOLD`

- Copy legacy flat learning keys to en target buckets without deleting rollback keys.
- Prove fr reads do not fallback to legacy English keys.

### P3: Target-aware cloud restore and local-only policy

Status: `HOLD`

- Split cloud payloads by global/sourceLocale/studyTarget policy.
- Document local-only target-scoped keys and exclude them from cloud sync.

### P4: Enable content generation gate

Status: `HOLD`

- Allow French generation only after storage, cloud, trainer and personal-practice gates are green.
- Keep generated French content in a closed run container until app apply is explicitly approved.

## Domains

### study_target_model

Status: `HOLD`
Risk: `blocker`
Product module: `app/study_target.ts + components/StudyTargetContext.tsx`

Proposed API:
- `type StudyTarget = 'en' | 'fr'`
- `getStudyTarget(): Promise<StudyTarget>`
- `setStudyTarget(target: StudyTarget): Promise<void>`
- `useStudyTarget(): { studyTarget: StudyTarget; setStudyTarget: ... }`

Storage shape:
- `study_target_v1`
- `legacy dev key dev_study_target_lang stays isolated until removed or renamed`

Blockers:
- Current StudyTargetLang is dev-only and supports en/es, not production en/fr.
- Existing Spanish gate helpers must not become the production multi-target model.

Required before French:
- Create a production StudyTarget type and provider independent from sourceLocale.
- Decide whether the dev Spanish target feature is removed, renamed, or guarded behind a separate adapter.
- Add route-level tests proving sourceLocale=ru/uk does not mutate studyTarget=fr.

Tests:
- Changing app_lang from ru to uk preserves studyTarget=fr.
- Selecting French target does not activate Spanish dev content gates.

Notes:
- This domain has few storage records because the risk is architectural, not just key count.

### target_key_builder

Status: `HOLD`
Risk: `blocker`
Product module: `app/target_storage_keys.ts`

Proposed API:
- `targetKey(domain, studyTarget, id?)`
- `sourceTargetKey(domain, studyTarget, sourceLocale, id?)`
- `legacyEnglishKey(domain, id?)`
- `assertTargetKey(key)`

Storage shape:
- `<domain>_v2::{studyTarget}`
- `<domain>_v2::{studyTarget}::{id}`
- `<domain>_v2::{studyTarget}::{sourceLocale}::{id}`

Blockers:
- 330 target-sensitive storage records still depend on raw keys or scattered templates.
- No single production key builder exists for study target storage.

Required before French:
- Route every target-sensitive AsyncStorage key through one builder or a reviewed migration adapter.
- Add a lint/test guard rejecting new raw target-sensitive keys outside migration modules.
- Keep legacy English reads inside explicit compatibility modules only.

Tests:
- Key builder returns distinct keys for en and fr for every learning domain.
- Raw target-sensitive key detector fails when app code adds a new flat learning key.

### lesson_progress

Status: `HOLD`
Risk: `blocker`
Product module: `app/lesson_progress_store.ts`

Proposed API:
- `getLessonProgress(studyTarget, lessonId)`
- `setLessonProgress(studyTarget, lessonId, progress)`
- `getUnlockedLessons(studyTarget)`
- `recordLessonPass(studyTarget, lessonId, score)`

Storage shape:
- `lesson_progress_v2::{studyTarget}::{lessonId}`
- `lesson_words_v2::{studyTarget}::{lessonId}`
- `unlocked_lessons_v2::{studyTarget}`

Top file touchpoints:
- `scripts/gustav_migration_adapter_plan.ts`: 1 records; example `lesson${...}_progress` at line 785

Blockers:
- Lesson progress, words, pass counts and unlocks are currently represented by legacy English flat keys.
- Cloud mapping says lesson state must move under progress/targets/{studyTarget}.

Required before French:
- Create a lesson progress store and migrate English legacy keys to en only.
- Make French lesson reads refuse legacy English fallbacks.
- Audit lesson order differences before mapping English lesson ids to French lesson ids.

Tests:
- English legacy lesson32_progress migrates to en and not fr.
- French target starts with no completed lessons after English progress exists.

### lesson_session_local

Status: `HOLD`
Risk: `blocker`
Product module: `app/lesson_session_store.ts`

Proposed API:
- `getLessonSession(studyTarget, lessonId)`
- `setLessonSession(studyTarget, lessonId, state)`
- `clearLessonSession(studyTarget, lessonId)`

Storage shape:
- `lesson_session_v2::{studyTarget}::{lessonId}`
- `lesson_error_replay_v2::{studyTarget}::{lessonId}`
- `quiz_nav_level_v2::{studyTarget}`

Blockers:
- Local-only session keys must still be target-scoped so French cannot resume an English lesson session.

Required before French:
- Move cell index, phrase order, replay queue and quiz navigation into target-scoped local stores.
- Keep these keys out of cloud by explicit allowlist decision.

Tests:
- Switching en -> fr does not reuse lesson cellIndex or phraseOrder.
- Cloud sync never exports local-only lesson session keys.

### lesson_rewards

Status: `HOLD`
Risk: `blocker`
Product module: `app/reward_idempotency_store.ts`

Proposed API:
- `hasRewardGrant(studyTarget, rewardId)`
- `markRewardGrant(studyTarget, rewardId)`
- `rewardIdForLesson(studyTarget, lessonId, rewardType)`

Storage shape:
- `reward_grants_v2::{studyTarget}::{rewardId}`
- `progress/targets/{studyTarget}/reward_grants`

Blockers:
- Flat reward/idempotency keys can double-grant or suppress rewards after target switch or cloud restore.

Required before French:
- Decide whether reward idempotency is local target-scoped or cloud/server target-scoped.
- Map legacy reward grants to English only.

Tests:
- French lesson reward can be granted even if English equivalent reward key exists.
- Cloud restore cannot duplicate a target reward grant.

### level_exams

Status: `HOLD`
Risk: `blocker`
Product module: `app/level_exam_store.ts`

Proposed API:
- `getLevelExamState(studyTarget, level)`
- `recordLevelExamResult(studyTarget, level, pct)`
- `getCertificate(studyTarget)`

Storage shape:
- `level_exam_v2::{studyTarget}::{level}`
- `certificate_v2::{studyTarget}`

Top file touchpoints:
- `app/exam_certificate.ts`: 1 records; example `lingman_certificate_v1` at line 17

Blockers:
- Level exam and certificate keys are target-language proof state and cannot remain shared.

Required before French:
- Separate exam state and certificates by studyTarget.
- Decide whether French CEFR levels reuse English level ids or define a target-specific map.

Tests:
- English A1 pass does not unlock French A1 certificate.
- French exam result writes only to fr target bucket.

### trainer_practice

Status: `HOLD`
Risk: `blocker`
Product module: `app/target_practice_store.ts`

Proposed API:
- `getTrainerQueue(studyTarget)`
- `saveTrainerQueue(studyTarget, queue)`
- `appendMistake(studyTarget, item)`
- `getActiveRecallItems(studyTarget)`

Storage shape:
- `trainer_store_v2::{studyTarget}`
- `mistake_log_v2::{studyTarget}`
- `active_recall_v2::{studyTarget}`

Top file touchpoints:
- `app/achievements_screen.tsx`: 1 records; example `achievement_active_recall_correct_count` at line 165
- `app/achievements.ts`: 1 records; example `achievement_active_recall_correct_count` at line 1224
- `app/streak_safety.ts`: 1 records; example `achievement_active_recall_correct_count` at line 101

Blockers:
- Trainer, active recall and mistake log carry target words, phrases and grammar categories.
- My Practice depends on this store and would otherwise mix English and French diagnosis data.

Required before French:
- Create target buckets for trainer_store_v1, mistake_log_v1 and active recall.
- Prefix all diagnosis ids with studyTarget before personalization.

Tests:
- English mistake log is invisible in French My Practice.
- French trainer queue survives sourceLocale ru -> uk switch.

### personal_practice

Status: `HOLD`
Risk: `blocker`
Product module: `app/personal_practice_store.ts`

Proposed API:
- `getDiagnosis(studyTarget, sourceLocale)`
- `saveDiagnosis(studyTarget, sourceLocale, diagnosis)`
- `recommendPractice(studyTarget, sourceLocale, learnerState)`

Storage shape:
- `personal_practice_v2::{studyTarget}::{sourceLocale}`
- `diagnostic_last_v2::{studyTarget}::{sourceLocale}`
- `open_diagnostic_v2::{studyTarget}`

Blockers:
- Personal practice must combine target-specific learner state with source-locale-specific explanations without collision.

Required before French:
- Store diagnosis ids as fr:<id> for French and en:<id> for legacy English.
- Separate recommendation state from localized feedback copy.

Tests:
- Russian and Ukrainian feedback copies do not overwrite each other for the same French diagnosis.
- French diagnosis never reads English active recall mistakes.

### achievements

Status: `HOLD`
Risk: `blocker`
Product module: `app/achievement_progress_store.ts`

Proposed API:
- `getAchievementProgress(scope, studyTarget?, id)`
- `incrementTargetAchievement(studyTarget, id, amount)`
- `incrementGlobalAchievement(id, amount)`

Storage shape:
- `achievements_global_v2`
- `achievements_target_v2::{studyTarget}`
- `progress/targets/{studyTarget}/achievements`

Top file touchpoints:
- `app/achievements.ts`: 22 records; example `achievement_trainer_correct_count` at line 1223
- `app/achievements_screen.tsx`: 10 records; example `achievement_trainer_correct_count` at line 166
- `app/(tabs)/quizzes.tsx`: 2 records; example `achievement_quiz_total_count` at line 753
- `app/quizzes.tsx`: 2 records; example `achievement_quiz_total_count` at line 650

Blockers:
- Achievement taxonomy has 101 target achievements and 57 mixed-policy achievements.
- Flat achievements_state cannot be reused for French.

Required before French:
- Split achievement state into global and per-target buckets using the taxonomy.
- Resolve mixed achievements before cloud restore is enabled for French.

Tests:
- Target achievement unlocks independently for en and fr.
- Global achievements remain shared only when taxonomy marks them global.

### cloud_sync

Status: `HOLD`
Risk: `blocker`
Product module: `app/cloud_sync.ts`

Proposed API:
- `syncTargetProgress(studyTarget)`
- `restoreTargetProgress(studyTarget)`
- `mergeLegacyEnglishCloudIntoTargetEn()`
- `syncGlobalProgress()`

Storage shape:
- `progress/global/*`
- `progress/targets/{studyTarget}/*`
- `progress/sourceLocales/{sourceLocale}/*`

Top file touchpoints:
- `app/cloud_sync.ts`: 52 records; example `achievement_active_recall_correct_count` at line 1

Blockers:
- 40 cloud keys require target buckets.
- 12 cloud payloads remain blocked by mixed field policy.

Required before French:
- Make cloud restore/merge target-aware before any French content apply.
- Map legacy flat cloud progress to targets.en only.
- Never hydrate fr from legacy English cloud fields.

Tests:
- Cloud restore for en does not write fr keys.
- Cloud restore for fr does not overwrite en keys.

### flashcards

Status: `HOLD`
Risk: `blocker`
Product module: `app/flashcards/target_storage.ts`

Proposed API:
- `getFlashcards(studyTarget)`
- `saveFlashcard(studyTarget, card)`
- `getFlashcardProgress(studyTarget, cardId)`

Storage shape:
- `flashcards_v2::{studyTarget}`
- `custom_flashcards_v2::{studyTarget}`
- `flashcards_progress_v2::{studyTarget}`

Top file touchpoints:
- `hooks/use-flashcards.ts`: 1 records; example `flashcards_v1` at line 40

Blockers:
- Flashcard cards/progress can contain target-language fronts, translations and sourceLocale explanations.

Required before French:
- Add studyTarget metadata to user flashcards and system packs.
- Keep sourceLocale copy as card metadata, not the target namespace.

Tests:
- English custom flashcard does not appear in French collection unless explicitly copied.
- Same sourceLocale card copy can exist under different study targets.

### analytics_stats

Status: `HOLD`
Risk: `blocker`
Product module: `app/target_stats_store.ts`

Proposed API:
- `recordTargetLearningEvent(studyTarget, event)`
- `recordGlobalEngagementEvent(event)`
- `getTargetStats(studyTarget)`
- `getGlobalStats()`

Storage shape:
- `stats_global_v2`
- `stats_target_v2::{studyTarget}`
- `daily_stats_target_v2::{studyTarget}`

Top file touchpoints:
- `app/lifetime_profile_stats.ts`: 4 records; example `lifetime_quiz_counters_migrated_v1` at line 65
- `app/achievements.ts`: 3 records; example `quiz_hard_count` at line 1319
- `app/achievements_screen.tsx`: 1 records; example `quiz_hard_count` at line 171

Blockers:
- daily_stats, user_stats_v1 and stats_daily_breakdown_v1 mix product/global and target-learning metrics.

Required before French:
- Split analytics fields by target/global policy before sync.
- Decide whether XP remains account-global while learning counters become target-specific.

Tests:
- French words/phrases/quizzes do not increment English target stats.
- Global engagement counters stay global after target switch.

### source_locale_preferences

Status: `HOLD`
Risk: `blocker`
Product module: `components/LangContext.tsx + app/source_locales.ts`

Proposed API:
- `getSourceLocale()`
- `setSourceLocale(sourceLocale)`
- `localizedCopyFor(sourceLocale, studyTarget, contentId)`

Storage shape:
- `app_lang`
- `progress/sourceLocales/{sourceLocale}/preferences`

Blockers:
- Source/interface locale must stay separate from study target in all generated French material.

Required before French:
- French content must provide Russian and Ukrainian source copy without changing target progress buckets.
- Generated content ids must be stable across sourceLocale translations.

Tests:
- Switch ru -> uk changes explanations only, not French lesson state.
- Same French content id resolves to different sourceLocale copy maps.

### unknown_target_storage

Status: `HOLD`
Risk: `blocker`
Product module: `no product module until classified`

Proposed API:
- `classifyUnknownTargetStorage(record)`

Storage shape:
- `blocked until each unknown receives a reviewed target/global/source scope`

Top file touchpoints:
- `app/lesson1.tsx`: 23 records; example `` at line 576
- `app/release_wave_bonus.ts`: 13 records; example `` at line 31
- `app/lesson_complete.tsx`: 11 records; example `` at line 449
- `app/daily_tasks.ts`: 9 records; example `` at line 1258
- `app/lesson_menu.tsx`: 9 records; example `` at line 160
- `app/(tabs)/lessons.tsx`: 8 records; example `` at line 270
- `app/(tabs)/quizzes.tsx`: 7 records; example `` at line 1964
- `app/diagnosis_training_progress.ts`: 7 records; example `` at line 37

Blockers:
- Any target-sensitive unknown storage record blocks French generation.

Required before French:
- Classify all unknown target storage records or add explicit reviewed exceptions.

Tests:
- Storage inventory reports zero unknown target-sensitive learning keys.

## Notes

- This artifact is an integration plan, not a product migration.
- It intentionally blocks French while production target storage, cloud restore and personal practice isolation are missing.
- The current English base remains the reference source, but legacy English storage must be mapped to en only.
