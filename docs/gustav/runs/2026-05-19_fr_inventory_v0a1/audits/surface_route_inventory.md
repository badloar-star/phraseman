# GUSTAV Surface Route Inventory

Run: `2026-05-19_fr_inventory_v0a1`

Status: `HOLD`

Generated at: 2026-05-19T16:27:00.560Z

## Summary

- Surfaces: 129
- App TSX files: 93
- Stack screens: 54
- Tab screens: 5
- Target-sensitive surfaces: 52
- User-facing target surfaces: 18
- Dev StudyTarget surfaces: 9
- Direct storage surfaces: 72
- Blocker surfaces: 66
- Blockers: 92
- Route-like without Stack registration: 16
- Stack screens without file: 0

## Route Coverage

Stack screens:
- `(tabs)`
- `achievements_screen`
- `admin_intro_preview`
- `admin_review_test`
- `arena_game`
- `arena_join`
- `arena_leaderboard`
- `arena_lobby`
- `arena_rating`
- `arena_results`
- `arena_room`
- `avatar_select`
- `beta_testers`
- `club_screen`
- `community_pack_create`
- `daily_tasks_screen`
- `diagnostic_test`
- `exam`
- `flashcards`
- `flashcards_collection`
- `flashcards_swipe`
- `hint`
- `index`
- `league_screen`
- `lesson1`
- `lesson_complete`
- `lesson_help`
- `lesson_irregular_verbs`
- `lesson_menu`
- `lesson_words`
- `level_exam`
- `pack_opening`
- `phrase_analytics_screen`
- `pos_analytics_audit`
- `premium_modal`
- `preposition_drill`
- `privacy_screen`
- `problem_coach`
- `progress_map`
- `quizzes_screen`
- `review`
- `settings_edu`
- `settings_language`
- `settings_notifications`
- `settings_testers`
- `settings_themes`
- `streak_stats`
- `terms_screen`
- `trainer`
- `trainer_arena_session`
- `trainer_phrases_session`
- `trainer_smart_session`
- `trainer_words_session`
- `web_screen`

Tab screens:
- `(tabs)/arena`
- `(tabs)/friends`
- `(tabs)/home`
- `(tabs)/lessons`
- `(tabs)/settings`

Route-like TSX files without Stack registration:
- `+native-intent`
- `+not-found`
- `LeagueResultModal`
- `TabContext`
- `TabSlider`
- `_pos_analytics_audit`
- `flashcards_market_dev`
- `friends_screen`
- `lesson_intro_screens`
- `lesson_verbs`
- `level_gifts_inventory`
- `modal`
- `quizzes`
- `settings_invite_friend`
- `shards_shop`
- `trainer_session_report`

## Blocker Surfaces

### app/cloud_sync.ts

Kind: `service`
Domain: `cloud_sync`
Risk: `blocker`
Target storage records: 47
Keys: `achievement_active_recall_correct_count`, `achievement_flashcards_flip_count`, `achievement_flashcards_saved_count`, `achievement_flashcards_source_set_v1`, `achievement_flashcards_view_streak_v1`, `achievement_trainer_correct_count`, `achievement_trainer_correct_streak_v1`, `active_recall_items`, `custom_flashcards_v2`, `diagnostic_last`, `flashcards`, `flashcards_v1`, `irregular_verbs_global`, `lesson${...}_best_score`, `lesson${...}_intro_shown`, `lesson${...}_listening_progress`, `lesson${...}_pass_count`, `lesson${...}_progress`, `lesson${...}_words`, `level_exam_A1_best_pct`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- Cloud/auth shell must restore and sync selected studyTarget buckets only.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add target-aware cloud restore/merge tests for en and fr buckets.

### app/achievements.ts

Kind: `service`
Domain: `achievements`
Risk: `blocker`
Target storage records: 35
Keys: `achievement_active_recall_correct_count`, `achievement_daily_phrase_read_count`, `achievement_daily_phrase_save_count`, `achievement_flashcards_flip_count`, `achievement_flashcards_saved_count`, `achievement_flashcards_source_set_v1`, `achievement_flashcards_view_streak_v1`, `achievement_lesson_${...}_perfect_passes_v1`, `achievement_quiz_hard_perfect_count`, `achievement_quiz_perfect_levels_today_v1`, `achievement_quiz_perfect_streak_v1`, `achievement_quiz_total_count`, `achievement_trainer_correct_count`, `achievement_trainer_correct_streak_v1`, `achievement_trainer_perfect_session_count`, `lesson${...}_pass_count`, `lesson${...}_progress`, `quiz_hard_count`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/lesson1.tsx

Kind: `registered_stack`
Domain: `lesson_runtime`
Risk: `blocker`
Target storage records: 31
Keys: `lesson${...}_cellIndex`, `lesson${...}_errorReplayOverride`, `lesson${...}_errorReplayQueue`, `lesson${...}_errorReplaySince`, `lesson${...}_intro_shown`, `lesson${...}_phraseOrder`, `lesson${...}_progress`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- Surface touches dev StudyTargetLang or Spanish content gates; production French must not inherit this path.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.
- Remove, rename or isolate dev StudyTargetLang before enabling French production target.

### app/lesson_lock_system.ts

Kind: `service`
Domain: `lesson_list`
Risk: `blocker`
Target storage records: 17
Keys: `lesson${...}_best_score`, `lesson${...}_pass_count`, `lesson${...}_progress`, `level_exam_A1_passed`, `level_exam_A2_passed`, `level_exam_B1_passed`, `unlocked_lessons`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/achievements_screen.tsx

Kind: `registered_stack`
Domain: `achievements`
Risk: `blocker`
Target storage records: 15
Keys: `achievement_active_recall_correct_count`, `achievement_daily_phrase_read_count`, `achievement_daily_phrase_save_count`, `achievement_flashcards_flip_count`, `achievement_flashcards_saved_count`, `achievement_flashcards_view_streak_v1`, `achievement_lesson_${...}_perfect_passes_v1`, `achievement_quiz_hard_perfect_count`, `achievement_quiz_perfect_streak_v1`, `achievement_quiz_total_count`, `achievement_trainer_correct_count`, `achievement_trainer_perfect_session_count`, `lesson${...}_pass_count`, `lesson${...}_progress`, `quiz_hard_count`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/medal_utils.ts

Kind: `service`
Domain: `other`
Risk: `blocker`
Target storage records: 13
Keys: `lesson${...}_best_score`, `lesson${...}_pass_count`, `level_exam_${...}_best_pct`, `level_exam_${...}_pass_count`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/release_wave_bonus.ts

Kind: `service`
Domain: `other`
Risk: `blocker`
Target storage records: 13

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/lesson_menu.tsx

Kind: `registered_stack`
Domain: `lesson_menu`
Risk: `blocker`
Target storage records: 12
Keys: `lesson${...}_best_score`, `lesson${...}_preposition_progress`, `lesson${...}_progress`, `lesson${...}_words`, `lesson1_words`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/lifetime_profile_stats.ts

Kind: `service`
Domain: `quiz`
Risk: `blocker`
Target storage records: 9
Keys: `diagnostic_last`, `lesson${...}_progress`, `lifetime_quiz_counters_migrated_v1`, `lifetime_quiz_hard_v1`, `quiz_hard_count`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/(tabs)/lessons.tsx

Kind: `tab`
Domain: `lesson_list`
Risk: `blocker`
Target storage records: 8
Keys: `lesson${...}_best_score`, `lesson${...}_pass_count`, `lesson${...}_progress`, `level_exam_${...}_best_pct`, `level_exam_${...}_pass_count`, `level_exam_${...}_passed`, `level_exam_${...}_pct`, `unlocked_lessons`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/(tabs)/quizzes.tsx

Kind: `route_like`
Domain: `quiz`
Risk: `blocker`
Target storage records: 8
Keys: `achievement_quiz_total_count`, `quiz_nav_level`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.
- Route-like file has target-sensitive state but is not registered in the root Stack inventory.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/quizzes.tsx

Kind: `route_like`
Domain: `quiz`
Risk: `blocker`
Target storage records: 8
Keys: `achievement_quiz_total_count`, `quiz_nav_level`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.
- Route-like file has target-sensitive state but is not registered in the root Stack inventory.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/daily_tasks.ts

Kind: `service`
Domain: `other`
Risk: `blocker`
Target storage records: 7
Keys: `irregular_verbs_global`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/lessons_tab_state.ts

Kind: `service`
Domain: `lesson_list`
Risk: `blocker`
Target storage records: 7
Keys: `lesson${...}_best_score`, `lesson${...}_progress`, `level_exam_${...}_best_pct`, `level_exam_${...}_pass_count`, `level_exam_${...}_passed`, `level_exam_${...}_pct`, `unlocked_lessons`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/services/league_chest_rewards.ts

Kind: `service`
Domain: `social_arena`
Risk: `blocker`
Target storage records: 7

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/lesson_complete.tsx

Kind: `registered_stack`
Domain: `lesson_completion`
Risk: `blocker`
Target storage records: 6
Keys: `lesson${...}_bonus_granted`, `lesson${...}_progress`, `lesson1_progress`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/lesson_irregular_verbs.tsx

Kind: `registered_stack`
Domain: `lesson_runtime`
Risk: `blocker`
Target storage records: 6
Keys: `irregular_verbs_global`, `lesson${...}_irregular_shards_granted`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/lesson_screen_bootstrap.ts

Kind: `service`
Domain: `other`
Risk: `blocker`
Target storage records: 6
Keys: `lesson${...}_cellIndex`, `lesson${...}_phraseOrder`, `lesson${...}_progress`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/mistake_log.ts

Kind: `service`
Domain: `trainer_practice`
Risk: `blocker`
Target storage records: 6
Keys: `mistake_log_v1`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- Practice surface needs target-prefixed diagnosis/practice ids and sourceLocale-separated feedback.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Prefix practice/diagnosis ids with studyTarget and keep localized feedback under sourceLocale.

### app/active_recall.ts

Kind: `service`
Domain: `trainer_practice`
Risk: `blocker`
Target storage records: 5
Keys: `active_recall_items`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- Practice surface needs target-prefixed diagnosis/practice ids and sourceLocale-separated feedback.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Prefix practice/diagnosis ids with studyTarget and keep localized feedback under sourceLocale.

### app/daily_tasks_screen.tsx

Kind: `registered_stack`
Domain: `quiz`
Risk: `blocker`
Target storage records: 5
Keys: `quiz_nav_level`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/level_gift_system.ts

Kind: `service`
Domain: `commerce_rewards`
Risk: `blocker`
Target storage records: 5

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/mastery.ts

Kind: `service`
Domain: `other`
Risk: `blocker`
Target storage records: 5

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/diagnostic_test.tsx

Kind: `registered_stack`
Domain: `personal_practice`
Risk: `blocker`
Target storage records: 4
Keys: `diagnostic_last`, `lesson${...}_progress`, `open_diagnostic`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.
- Practice surface needs target-prefixed diagnosis/practice ids and sourceLocale-separated feedback.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.
- Prefix practice/diagnosis ids with studyTarget and keep localized feedback under sourceLocale.

### app/global_broadcast_modal.ts

Kind: `service`
Domain: `other`
Risk: `blocker`
Target storage records: 4

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/lesson_words.tsx

Kind: `registered_stack`
Domain: `lesson_runtime`
Risk: `blocker`
Target storage records: 4

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/notifications.ts

Kind: `service`
Domain: `other`
Risk: `blocker`
Target storage records: 4
Keys: `lesson${...}_pass_count`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/preposition_drill.tsx

Kind: `registered_stack`
Domain: `lesson_runtime`
Risk: `blocker`
Target storage records: 4
Keys: `lesson${...}_preposition_progress`, `prep_drill_perfect_${...}`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/trainer_store.ts

Kind: `service`
Domain: `trainer_practice`
Risk: `blocker`
Target storage records: 4
Keys: `trainer_store_v1`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- Practice surface needs target-prefixed diagnosis/practice ids and sourceLocale-separated feedback.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Prefix practice/diagnosis ids with studyTarget and keep localized feedback under sourceLocale.

### hooks/use-flashcards.ts

Kind: `hook`
Domain: `flashcards`
Risk: `blocker`
Target storage records: 4
Keys: `flashcards_v1`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/exam_certificate.ts

Kind: `service`
Domain: `other`
Risk: `blocker`
Target storage records: 3
Keys: `lingman_certificate_v1`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/firestore_leaderboard.ts

Kind: `service`
Domain: `other`
Risk: `blocker`
Target storage records: 3

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/firestore_league_chat.ts

Kind: `service`
Domain: `social_arena`
Risk: `blocker`
Target storage records: 3

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/flashcards/storage.ts

Kind: `service`
Domain: `flashcards`
Risk: `blocker`
Target storage records: 3
Keys: `custom_flashcards_v2`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/referral_bootstrap.ts

Kind: `service`
Domain: `other`
Risk: `blocker`
Target storage records: 3

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/shards_system.ts

Kind: `service`
Domain: `commerce_rewards`
Risk: `blocker`
Target storage records: 3

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/(tabs)/home.tsx

Kind: `tab`
Domain: `home_dashboard`
Risk: `blocker`
Target storage records: 2
Keys: `lesson${...}_progress`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/auth_provider.ts

Kind: `service`
Domain: `cloud_sync`
Risk: `blocker`
Target storage records: 2
Keys: `lesson${...}_intro_shown`, `unlocked_lessons`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- Cloud/auth shell must restore and sync selected studyTarget buckets only.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add target-aware cloud restore/merge tests for en and fr buckets.

### app/level_exam.tsx

Kind: `registered_stack`
Domain: `other`
Risk: `blocker`
Target storage records: 2
Keys: `level_exam_${...}_passed`, `level_exam_${...}_pct`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/paywall_personalization.ts

Kind: `service`
Domain: `commerce_rewards`
Risk: `blocker`
Target storage records: 2

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/rank_change.ts

Kind: `service`
Domain: `other`
Risk: `blocker`
Target storage records: 2

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/arena_leaderboard_fetch.ts

Kind: `service`
Domain: `social_arena`
Risk: `blocker`
Target storage records: 1

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/arena_leaderboard.tsx

Kind: `registered_stack`
Domain: `social_arena`
Risk: `blocker`
Target storage records: 1

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/arena_rating.tsx

Kind: `registered_stack`
Domain: `social_arena`
Risk: `blocker`
Target storage records: 1

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/avatar_select.tsx

Kind: `registered_stack`
Domain: `other`
Risk: `blocker`
Target storage records: 1

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/debug-logger.ts

Kind: `service`
Domain: `other`
Risk: `blocker`
Target storage records: 1

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/exam_readiness.ts

Kind: `service`
Domain: `other`
Risk: `blocker`
Target storage records: 1
Keys: `lesson${...}_progress`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/exam.tsx

Kind: `registered_stack`
Domain: `other`
Risk: `blocker`
Target storage records: 1
Keys: `lesson${...}_progress`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.
- User-facing surface can display target-sensitive state without explicit production studyTarget context.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.

### app/hall_of_fame_utils.ts

Kind: `service`
Domain: `other`
Risk: `blocker`
Target storage records: 1

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/level_gift_active_inventory.ts

Kind: `service`
Domain: `commerce_rewards`
Risk: `blocker`
Target storage records: 1

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/premium_celebration_state.ts

Kind: `service`
Domain: `commerce_rewards`
Risk: `blocker`
Target storage records: 1

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/streak_safety.ts

Kind: `service`
Domain: `other`
Risk: `blocker`
Target storage records: 1
Keys: `achievement_active_recall_correct_count`

Blockers:
- Surface has target-sensitive storage records and must route reads/writes through target-aware stores or migration adapters.

Required before French:
- Replace raw target-sensitive storage access with production target-aware store APIs.
- Map legacy English state to en only and prove fr has no legacy fallback.

### app/(tabs)/settings.tsx

Kind: `tab`
Domain: `settings_source_locale`
Risk: `blocker`
Target storage records: 0

Blockers:
- Surface touches dev StudyTargetLang or Spanish content gates; production French must not inherit this path.

Required before French:
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.
- Remove, rename or isolate dev StudyTargetLang before enabling French production target.

### app/flashcards_collection.tsx

Kind: `registered_stack`
Domain: `flashcards`
Risk: `blocker`
Target storage records: 0

Blockers:
- Surface touches dev StudyTargetLang or Spanish content gates; production French must not inherit this path.

Required before French:
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.
- Remove, rename or isolate dev StudyTargetLang before enabling French production target.

### app/flashcards_swipe.tsx

Kind: `registered_stack`
Domain: `flashcards`
Risk: `blocker`
Target storage records: 0

Blockers:
- Surface touches dev StudyTargetLang or Spanish content gates; production French must not inherit this path.

Required before French:
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.
- Remove, rename or isolate dev StudyTargetLang before enabling French production target.

### app/lesson_intro_screens.tsx

Kind: `route_like`
Domain: `other`
Risk: `blocker`
Target storage records: 0

Blockers:
- Surface touches dev StudyTargetLang or Spanish content gates; production French must not inherit this path.

Required before French:
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.
- Remove, rename or isolate dev StudyTargetLang before enabling French production target.

### app/pack_opening.tsx

Kind: `registered_stack`
Domain: `other`
Risk: `blocker`
Target storage records: 0

Blockers:
- Surface touches dev StudyTargetLang or Spanish content gates; production French must not inherit this path.

Required before French:
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.
- Remove, rename or isolate dev StudyTargetLang before enabling French production target.

### app/problem_coach.tsx

Kind: `registered_stack`
Domain: `personal_practice`
Risk: `blocker`
Target storage records: 0

Blockers:
- Practice surface needs target-prefixed diagnosis/practice ids and sourceLocale-separated feedback.

Required before French:
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.
- Prefix practice/diagnosis ids with studyTarget and keep localized feedback under sourceLocale.

### app/review.tsx

Kind: `registered_stack`
Domain: `other`
Risk: `blocker`
Target storage records: 0

Blockers:
- Surface touches dev StudyTargetLang or Spanish content gates; production French must not inherit this path.

Required before French:
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.
- Remove, rename or isolate dev StudyTargetLang before enabling French production target.

### app/trainer_arena_session.tsx

Kind: `registered_stack`
Domain: `trainer_practice`
Risk: `blocker`
Target storage records: 0

Blockers:
- Practice surface needs target-prefixed diagnosis/practice ids and sourceLocale-separated feedback.

Required before French:
- Add route/screen test that switching sourceLocale ru/uk does not change studyTarget progress.
- Prefix practice/diagnosis ids with studyTarget and keep localized feedback under sourceLocale.

## Notes

- This scanner is read-only and does not approve French generation.
- The goal is to connect user-visible surfaces to target-sensitive storage and dev StudyTarget risks.
- French remains blocked while blocker surfaces exist.
