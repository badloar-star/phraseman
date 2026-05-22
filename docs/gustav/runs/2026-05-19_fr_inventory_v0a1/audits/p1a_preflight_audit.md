# GUSTAV P1A Preflight Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-19T20:41:18.682Z

## Summary

- First slice files: 4
- First slice existing now: 0
- First slice additions ready: 4
- First slice dirty overlaps: 0
- First slice parents ready: 4
- Deferred dev bridge files: 4
- Deferred consumer files: 40
- Dev target entrypoints: 20
- Forbidden raw key patterns: 14
- Blockers: 0
- Warnings: 0
- Preflight ready after approval: yes
- May start French generation: no
- May modify production app files: no

## First Slice Readiness

- `app/study_target.ts`: ready_to_add_after_approval
  - action: `add`, phase: `P1`, role: `study_target_model`
  - exists now: no, parent dir exists: yes, dirty overlap: no
- `app/target_storage_keys.ts`: ready_to_add_after_approval
  - action: `add`, phase: `P1`, role: `target_key_builder`
  - exists now: no, parent dir exists: yes, dirty overlap: no
- `tests/gustav_surface_target_switch.test.ts`: ready_to_add_after_approval
  - action: `add`, phase: `P5`, role: `test_contract`
  - exists now: no, parent dir exists: yes, dirty overlap: no
- `tests/gustav_target_storage_keys.test.ts`: ready_to_add_after_approval
  - action: `add`, phase: `P5`, role: `test_contract`
  - exists now: no, parent dir exists: yes, dirty overlap: no

## Deferred Boundaries

P1B dev bridge files:
- `app/(tabs)/settings.tsx`
- `app/spanish_content_gate.ts`
- `app/study_target_lang_dev.ts`
- `components/StudyTargetContext.tsx`

Deferred consumer files:
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
- `app/firestore_leaderboard.ts`
- `app/firestore_league_chat.ts`
- `app/flashcards/storage.ts`
- `app/global_broadcast_modal.ts`
- `app/lesson1.tsx`
- `app/lesson_complete.tsx`
- `app/lesson_irregular_verbs.tsx`
- `app/lesson_lock_system.ts`
- `app/lesson_menu.tsx`
- `app/lesson_screen_bootstrap.ts`
- `app/lesson_words.tsx`
- `app/lessons_tab_state.ts`
- `app/level_exam.tsx`
- `app/level_gift_system.ts`
- `app/lifetime_profile_stats.ts`
- `app/mastery.ts`
- `app/medal_utils.ts`
- `app/mistake_log.ts`
- `app/notifications.ts`
- `app/preposition_drill.tsx`
- `app/quizzes.tsx`
- `app/referral_bootstrap.ts`
- `app/release_wave_bonus.ts`
- `app/services/league_chest_rewards.ts`
- `app/shards_system.ts`
- `app/streak_safety.ts`
- `app/trainer_store.ts`
- `hooks/use-flashcards.ts`

## Dev Target Entrypoints

- `app/_admin_intro_preview.tsx`: `target_consumer`, markers 2
  - boundary: Must keep reading existing en/es dev target until the later P1B/P1C bridge is approved.
- `app/(tabs)/settings.tsx`: `dev_target_provider`, markers 11
  - boundary: Must bridge production StudyTarget after P1A, while keeping dev en/es storage isolated.
- `app/config.ts`: `dev_spanish_gate`, markers 1
  - boundary: Must not become the French production target gate.
- `app/flashcards_collection.tsx`: `target_consumer`, markers 2
  - boundary: Must keep reading existing en/es dev target until the later P1B/P1C bridge is approved.
- `app/flashcards_swipe.tsx`: `target_consumer`, markers 2
  - boundary: Must keep reading existing en/es dev target until the later P1B/P1C bridge is approved.
- `app/lesson_data_all.ts`: `target_consumer`, markers 5
  - boundary: Must keep reading existing en/es dev target until the later P1B/P1C bridge is approved.
- `app/lesson_intro_screens.tsx`: `target_consumer`, markers 10
  - boundary: Must keep reading existing en/es dev target until the later P1B/P1C bridge is approved.
- `app/lesson_locale_utils.ts`: `target_consumer`, markers 4
  - boundary: Must keep reading existing en/es dev target until the later P1B/P1C bridge is approved.
- `app/lesson1_smart_options.ts`: `target_consumer`, markers 7
  - boundary: Must keep reading existing en/es dev target until the later P1B/P1C bridge is approved.
- `app/lesson1.tsx`: `target_consumer`, markers 15
  - boundary: Must keep reading existing en/es dev target until the later P1B/P1C bridge is approved.
- `app/pack_opening.tsx`: `target_consumer`, markers 2
  - boundary: Must keep reading existing en/es dev target until the later P1B/P1C bridge is approved.
- `app/phrase_target_utils.ts`: `target_consumer`, markers 16
  - boundary: Must keep reading existing en/es dev target until the later P1B/P1C bridge is approved.
- `app/review.tsx`: `target_consumer`, markers 7
  - boundary: Must keep reading existing en/es dev target until the later P1B/P1C bridge is approved.
- `app/spanish_content_gate.ts`: `dev_spanish_gate`, markers 11
  - boundary: Must not become the French production target gate.
- `app/study_target_lang_dev.ts`: `dev_target_storage`, markers 10
  - boundary: Must remain dev-only and must not accept fr as a dev StudyTargetLang value.
- `components/LangContext.tsx`: `dev_target_provider`, markers 1
  - boundary: Must bridge production StudyTarget after P1A, while keeping dev en/es storage isolated.
- `components/StudyTargetContext.tsx`: `dev_target_provider`, markers 9
  - boundary: Must bridge production StudyTarget after P1A, while keeping dev en/es storage isolated.
- `tests/flashcard_content_lang.test.ts`: `test`, markers 1
  - boundary: Must continue proving dev Spanish target behavior separately from production French.
- `tests/heisenberg_pipeline.test.ts`: `test`, markers 2
  - boundary: Must continue proving dev Spanish target behavior separately from production French.
- `tests/study_target_lang_dev.test.ts`: `test`, markers 13
  - boundary: Must continue proving dev Spanish target behavior separately from production French.

## Forbidden Raw Key Patterns

- `lesson{lessonId}_progress`
- `lesson{lessonId}_words`
- `lesson{lessonId}_best_score`
- `lesson{lessonId}_intro_shown`
- `lesson{lessonId}_preposition_progress`
- `last_opened_lesson`
- `active_recall_items`
- `smart_review_queue`
- `custom_flashcards_v2`
- `flashcards_progress_v1`
- `achievements_state`
- `daily_stats`
- `user_stats_v1`
- `stats_daily_breakdown_v1`

## Findings

No findings.

## Notes

- This audit is a preflight guard only; it does not write production files.
- P1A can add only the production StudyTarget contract, target key builder and direct tests after explicit apply approval.
- The existing en/es dev StudyTargetLang path must be bridged later and must not become the French production target model.
- French generation remains blocked until target-isolation implementation and generated-content audits pass.
