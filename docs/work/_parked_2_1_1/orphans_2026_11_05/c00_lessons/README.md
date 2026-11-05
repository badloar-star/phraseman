Governance-ID: TG-36D28DDC3544

# Припаркованная сирота c00_lessons

Решение координатора 06.11 («дерево = HEAD + свежая работа живых сессий»): файлы не трогались больше 18 часов, ни один свежий файл не зависит от их грязной версии (проверено по импортам и добавленным экспортам), HEAD их не импортирует. Сборка 149 собиралась из `git archive` (`eas_novcs_47206b7f1`), в прод они не попали.

## Файлы (71)
Изменённые (патч `tracked.patch`): 45
- app/(tabs)/lessons.tsx
- app/_learning_v2_authoring_preview.tsx
- app/_learning_v2_modes_showcase.tsx
- app/achievement_catalog_v2.ts
- app/achievement_restore_diff.ts
- app/achievements.ts
- app/achievements_screen.tsx
- app/client_reports.ts
- app/dev_chapter_exam_v2_preview.tsx
- app/dev_learning_v2_dictionary_v2.tsx
- app/dev_learning_v2_theory.tsx
- app/dev_season_preview.tsx
- app/learning-v2/chapter-exam.tsx
- app/learning-v2/course.tsx
- app/learning-v2/intro-reader-fixture.tsx
- app/learning-v2/session/[id].tsx
- app/learning_v2_authoring_preview.tsx
- app/learning_v2_course_released_session_client_v3.ts
- app/learning_v2_direct_session_player_v1.tsx
- app/learning_v2_home_continue_route.ts
- app/learning_v2_last_lesson.ts
- app/learning_v2_lesson_words.tsx
- app/learning_v2_locale_guard.tsx
- app/learning_v2_modes_showcase.tsx
- app/learning_v2_modes_showcase_run/[family].tsx
- app/learning_v2_owner_repository_runtime.ts
- app/learning_v2_placement.tsx
- app/learning_v2_session_intro.tsx
- app/learning_v2_session_intro_check.tsx
- app/learning_v2_session_launch_v1.ts
- app/premium_theme_entitlements.ts
- app/premium_theme_video_watch.ts
- components/AchievementArt.tsx
- components/stories/StorySlides.tsx
- constants/achievementImageAssets.ts
- constants/achievement_image_urls.ts
- modules/story_events/story_events_core.ts
- modules/today-tasks/today_tasks_store.ts
- tests/achievement_foundation_catalog_v2.test.ts
- tests/learning_v2_course_startup_redirect.test.tsx
- tests/learning_v2_last_lesson.test.ts
- tests/learning_v2_session1_rune_reward_composite_gate.ts
- tests/learning_v2_session_prepare_inflight_reuse.test.ts
- tests/owner_locks_lesson_ready_before_tap_2026_10_25.test.ts
- tests/premium_theme_remote_packs.test.ts

Новые (копии с суффиксом `.untracked` в `untracked/`): 26
- app/activity_achievement_sources.ts
- app/learning_v2_session_rune_reward_recovery_bootstrap.ts
- app/spire/spire_achievement_client.ts
- components/SpireAchievementUpgrade.tsx
- constants/spireAchievementImageAssets.ts
- modules/achievements/activity_catalog.ts
- modules/achievements/activity_copy.ts
- modules/achievements/activity_progress.ts
- modules/achievements/spire_catalog.ts
- modules/spire/achievement_copy.ts
- modules/spire/achievement_progress.ts
- modules/spire/achievement_reconcile.ts
- tests/activity_achievement_delivery.test.ts
- tests/activity_achievement_progress.test.ts
- tests/learning_v2_full_off_client.test.ts
- tests/learning_v2_full_off_preparation.test.tsx
- tests/learning_v2_full_off_routes.test.tsx
- tests/learning_v2_full_off_session_launch.test.ts
- tests/learning_v2_session1_rune_reward_composite_gate.test.ts
- tests/learning_v2_session_rune_reward_recovery_bootstrap.test.ts
- tests/spire_achievement_art.test.ts
- tests/spire_achievement_art_render.test.tsx
- tests/spire_achievement_client.test.ts
- tests/spire_achievement_delivery.test.ts
- tests/spire_achievement_progress.test.ts
- tests/spire_achievement_reconcile.test.ts

## Как вернуть
```bash
git apply docs/work/_parked_2_1_1/orphans_2026_11_05/c00_lessons/tracked.patch   # если есть
cd docs/work/_parked_2_1_1/orphans_2026_11_05/c00_lessons/untracked 2>/dev/null && find . -type f -name '*.untracked' | while read f; do t="../../../../../../${f%.untracked}"; mkdir -p "$(dirname "$t")"; cp "$f" "$t"; done
```
Перед возвратом в релиз: решение владельца, типы и связанные тесты зелёные, кадры эмулятора.
