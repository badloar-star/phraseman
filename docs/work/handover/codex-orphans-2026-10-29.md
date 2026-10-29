# Опись сиротских правок Codex в общем дереве — 29.10.2026 (Ревизор)

Владелец 29.10 ~11:40: «Codex ничего не делает, он давно отключён». Решение: «Разобрать и довести» — каждая сессия берёт свой раздел, проверяет тестами, доделывает и коммитит рабочее; непонятное и сломанное — списком владельцу. **НИЧЕГО НЕ УДАЛЯЕМ.**

Источник: `git status --porcelain -uall` на 2026-10-29 09:34 UTC — 7554 путей (с `-uall` каждый файл новой папки считается отдельно; без него ≈4300). Сделано только чтением, ни один файл не тронут.

## Как делил
- **Сирота (старое)** — последний раз изменён до 28.10 17:14 (до старта текущих сессий). Почти наверняка Codex или старые прогоны.
- **Неясно (вечер 28.10)** — изменён 28.10 после 17:14. Часть — правки текущих сессий по записке Codex (например, `tests/codex_review_critical_contract_2026_10_28.test.ts`, энергия, воронка, правила в 20:30), часть — оборванная испанская партия урока 7. Хозяина уточнить у сессий раздела до того, как брать.
- **Живое (сегодня)** — изменён 29.10. Это работа идущих сессий: **не брать**, хозяин закоммитит сам. Перечислено, чтобы никто не принял за сироту.
- Раздел определён по пути файла. Где путь подходит к двум разделам, взят первый по списку — сессии могут перекинуть файл соседу.

## Сводка

| Раздел | Сирота | Неясно (вечер 28.10) | Живое (сегодня) |
|---|---:|---:|---:|
| Мусор, сборки и пробы — не трогать, решит владелец | 4658 | 927 | 6 |
| Курс → Learning V2 | 917 | 149 | 303 |
| Пик → Дизайн | 154 | 2 | 0 |
| Истории и события → Моменты | 5 | 0 | 16 |
| Сцены и темы → Темы | 14 | 0 | 19 |
| Админка, «Пульт», сайт, legal → Сайт | 71 | 9 | 6 |
| Вход, онбординг, Plus/оплата → Вход | 21 | 5 | 16 |
| Конкурс, наборы, функции, правила → Ядро | 85 | 10 | 4 |
| Документы docs/work и прочее — авторам по теме | 81 | 0 | 18 |
| Прочее — разобрать вручную | 44 | 12 | 2 |

## Мусор, сборки и пробы — не трогать, решит владелец

Предложение: **не трогать**, решение владельца. Сборки (`functions-admin/lib`, `functions-content/lib`) пересобираются из исходников — их место скорее в `.gitignore`. `ART_STYLE_FOR_CODEX/trials` и `docs/phraseman-2.0/evidence` — пробы и доказательства 13–19.10, несколько тысяч файлов.

По папкам (все возрасты):
  - `ART_STYLE_FOR_CODEX/trials/S2_clay/…` — 2690
  - `docs/phraseman-2.0/evidence/…` — 1791
  - `functions-admin/lib/functions/…` — 820
  - `ART_STYLE_FOR_CODEX/trials/interactive/…` — 105
  - `functions-admin/lib/modules/…` — 96
  - `functions-content/lib/modules/…` — 22
  - `functions-content/lib/functions/…` — 20
  - `ART_STYLE_FOR_CODEX/_backup/selected-approved-2026-10-14T11-21-09-955Z/…` — 14
  - `docs/superpowers/plans/…` — 6
  - `functions-admin/lib/shared/…` — 6
  - `functions-content/lib/app/…` — 2
  - `functions-content/lib/functions-content/…` — 2
  - `functions-admin/lib/components/…` — 2
  - `functions-admin/lib/functions-admin/…` — 2
  - `ART_STYLE_FOR_CODEX/trials/build-icon-workbench.mjs/…` — 1
  - `ART_STYLE_FOR_CODEX/trials/build-tower-comparison.mjs/…` — 1
  - `ART_STYLE_FOR_CODEX/trials/prepare-clay-candidates.mjs/…` — 1
  - `ART_STYLE_FOR_CODEX/trials/verify-workbench.mjs/…` — 1
  - `docs/phraseman-2.0/MOCKUP_REQUIREMENTS_OWNER_2026-10-13.md/…` — 1
  - `docs/phraseman-2.0/ROBOT_STEP_ERRORS_2026-10-13.md/…` — 1
  - `.claude/semaphore/stale.run.codex-en-audio488-final-20261020.d/…` — 1
  - `.claude/semaphore/stale.run.codex-r2-audio-probe-metro.manual.d/…` — 1
  - `.claude/semaphore/stale.run.codex-r2-size-header-tests.manual.d/…` — 1
  - `ART_STYLE_FOR_CODEX/trials/clay-marker.mjs/…` — 1
  - `ART_STYLE_FOR_CODEX/trials/derive-clay-light-sources.mjs/…` — 1
  - `ART_STYLE_FOR_CODEX/trials/verify-clay-marker.mjs/…` — 1
  - `test-results/.last-run.json/…` — 1

## Курс → Learning V2

### Сирота — 917
  - `assets/audio/learning-v2/…` — 855
  - `content/learning-v2-course/sessions/…` — 15
  - `docs/work/tasks/…` — 12
  - `modules/learning-v2/curriculum/…` — 2
  - `app/_learning_v2_authoring_preview.tsx/…` — 1
  - `content/learning-v2-course/pipeline/…` — 1
  - `modules/learning-v2/content/…` — 1
  - `modules/learning-v2/contracts/…` — 1
  - `modules/learning-v2/runtime/…` — 1
  - `scripts/learning_v2_curriculum_blueprint_gate_v2.ts/…` — 1
  - `scripts/serve_learning_v2_static_owner_review.mjs/…` — 1
  - `tests/learning_v2_activity_released_session_package_v1.test.ts/…` — 1
  - `tests/learning_v2_activity_session_package_v2.test.ts/…` — 1
  - `tests/learning_v2_approved_first_ten_source_assertions.ts/…` — 1
  - `tests/learning_v2_course_session_client_children_v1.test.ts/…` — 1
  - `tests/learning_v2_curriculum_owner_map_v2_gate.mjs/…` — 1
  - `tests/learning_v2_english_course_blueprint_owner_approval_gate.ts/…` — 1
  - `tests/learning_v2_episode_01_session_05_source.test.ts/…` — 1
  - `tests/learning_v2_episode_01_session_16_editorial_gate.ts/…` — 1
  - `tests/learning_v2_intro_reader_a.test.tsx/…` — 1
  - `tests/learning_v2_mode_feedback_lane.test.tsx/…` — 1
  - `tests/learning_v2_no_repeated_primary_task_gate.ts/…` — 1
  - `tests/learning_v2_session_package_from_shard_v1.test.ts/…` — 1
  - `tests/learning_v2_static_owner_review_full_course_gate.mjs/…` — 1
  - `tests/learning_v2_static_owner_review_s02_gate.mjs/…` — 1
  - `tests/learning_v2_system_tts_only.test.ts/…` — 1
  - `tests/learning_v2_visibility_switch_contract.test.ts/…` — 1
  - `content/learning-v2-course/curriculum/…` — 1
  - `scripts/activate_learning_v2_green_prefix.mjs/…` — 1
  - `scripts/activate_learning_v2_green_prefix.test.mjs/…` — 1
  - `scripts/serve_learning_v2_static_owner_review.test.mjs/…` — 1
  - `scripts/serve_learning_v2_static_owner_review_status.test.mjs/…` — 1
  - `tests/learning_v2_factory_learner_wire_redaction_v1.test.ts/…` — 1
  - `tests/learning_v2_scripted_repeat_reveal_policy.test.ts/…` — 1
  - `tests/learning_v2_scripted_repeat_speaking_panel_host.test.tsx/…` — 1
  - `tests/learning_v2_session_intro_feedback_behavior.test.tsx/…` — 1
  - `tests/learning_v2_static_owner_review_three_preview_gate.mjs/…` — 1

### Неясно, вечер 28.10 — 149 (уточнить хозяина)
  - `modules/learning-v2/content/…` — 62
  - `content/learning-v2-course/release/…` — 60
  - `content/learning-v2-course/sessions/…` — 24
  - `content/learning-v2-course/ХОД_КУРСА.md/…` — 1
  - `tests/learning_v2_audio_replay_buttons.test.tsx/…` — 1
  - `content/learning-v2-course/curriculum/…` — 1

### Живое, сегодня — 303 (не брать)
  - `content/learning-v2-course/sessions/…` — 297
  - `components/learning-v2/season/…` — 2
  - `modules/learning-v2/exam/…` — 1
  - `tests/chapter_exam_v2_dialogue_tolerance_2026_10_29.test.ts/…` — 1
  - `tests/learning_v2_terms_autoreplace_guard_2026_10_29.test.ts/…` — 1
  - `tests/cloud_sync_learning_v2_es_progress_2026_10_29.test.ts/…` — 1

## Пик → Дизайн

### Сирота — 154
  - `assets/images/levels/…` — 59
  - `assets/images/coins/…` — 17
  - `assets/images/spire-achievements/…` — 12
  - `assets/images/streak_icons/…` — 10
  - `assets/images/achievement_categories/…` — 2
  - `components/spire/moments/…` — 2
  - `components/spire/scene/…` — 2
  - `app/achievement_catalog_v2.ts/…` — 1
  - `app/achievement_restore_diff.ts/…` — 1
  - `app/achievements.ts/…` — 1
  - `app/achievements_screen.tsx/…` — 1
  - `app/spire/spire_week_result_client.ts/…` — 1
  - `app/spire_report_client.ts/…` — 1
  - `components/AchievementArt.tsx/…` — 1
  - `constants/achievementImageAssets.ts/…` — 1
  - `constants/achievement_image_urls.ts/…` — 1
  - `modules/spire/report_store.ts/…` — 1
  - `tests/achievement_foundation_catalog_v2.test.ts/…` — 1
  - `tests/spire_no_energy_sheet_contract.test.tsx/…` — 1
  - `tests/spire_report_queue.test.ts/…` — 1
  - `tests/spire_week_wallet_merge.test.ts/…` — 1
  - `app/activity_achievement_sources.ts/…` — 1
  - `app/spire/achievement_catalog.ts/…` — 1
  - `app/spire/spire_achievement_client.ts/…` — 1
  - `components/SpireAchievementUpgrade.tsx/…` — 1
  - `components/spire/SpireFloorRecord.tsx/…` — 1
  - `components/spire/SpireRecordAttempt.tsx/…` — 1
  - `constants/spireAchievementImageAssets.ts/…` — 1
  - `content/spire-achievement-art/manifest.json/…` — 1
  - `docs/spire/achievement-collectibles-2026-10-28.md/…` — 1
  - `docs/work/spire-floor-records-2026-10-28.md/…` — 1
  - `docs/work/tasks/…` — 1
  - `functions/src/admin_spire_pack_status.test.ts/…` — 1
  - `functions/src/admin_spire_pack_status.ts/…` — 1
  - `functions/src/admin_spire_statistics_core.test.ts/…` — 1
  - `functions/src/admin_spire_statistics_core.ts/…` — 1
  - `functions/src/spire_floor_records.test.ts/…` — 1
  - `functions/src/spire_floor_records.ts/…` — 1
  - `modules/achievements/activity_catalog.ts/…` — 1
  - `modules/achievements/activity_copy.ts/…` — 1
  - `modules/achievements/activity_progress.ts/…` — 1
  - `modules/spire/achievement_copy.ts/…` — 1
  - `modules/spire/achievement_progress.ts/…` — 1
  - `modules/spire/achievement_reconcile.ts/…` — 1
  - `shared/spire_floor_records.ts/…` — 1
  - `tests/activity_achievement_delivery.test.ts/…` — 1
  - `tests/activity_achievement_progress.test.ts/…` — 1
  - `tests/spire_achievement_art.test.ts/…` — 1
  - `tests/spire_achievement_art_render.test.tsx/…` — 1
  - `tests/spire_achievement_client.test.ts/…` — 1
  - `tests/spire_achievement_delivery.test.ts/…` — 1
  - `tests/spire_achievement_progress.test.ts/…` — 1
  - `tests/spire_achievement_reconcile.test.ts/…` — 1
  - `tests/spire_floor_record_view.test.tsx/…` — 1
  - `tests/spire_floor_records.test.ts/…` — 1
  - `tests/spire_record_attempt.test.tsx/…` — 1
  - `tests/spire_tier_badge.test.ts/…` — 1

### Неясно, вечер 28.10 — 2 (уточнить хозяина)
  - `components/spire/SpireHomeScreen.tsx` — изменён, 10-28 19:19
  - `tests/spire_home_hooks_order.test.ts` — новый, 10-28 19:22

## Истории и события → Моменты

### Сирота — 5
  - `components/stories/StorySlides.tsx` — изменён, 10-28 11:49
  - `modules/story_events/story_events_store.ts` — изменён, 10-28 11:53
  - `modules/today-tasks/today_tasks_store.ts` — изменён, 10-28 12:24
  - `tests/story_announcements_domain.test.ts` — новый, 10-23 19:12
  - `tests/story_events_store.test.ts` — изменён, 10-28 11:52

### Живое, сегодня — 16 (не брать)
  - `components/stories/templates/StoryTemplateSlide.tsx` — изменён, 10-29 11:38
  - `components/stories/templates/frames_contest.tsx` — изменён, 10-29 11:46
  - `components/stories/templates/frames_progress.tsx` — изменён, 10-29 12:06
  - `components/stories/templates/story_template_from_event.ts` — изменён, 10-29 11:36
  - `components/stories/templates/story_template_registry.ts` — изменён, 10-29 11:35
  - `components/stories/templates/story_template_strings.ts` — изменён, 10-29 11:45
  - `modules/story_events/contest_win_store.ts` — новый, 10-29 12:02
  - `modules/story_events/contest_win_story.ts` — новый, 10-29 11:58
  - `modules/story_events/story_events_core.ts` — изменён, 10-29 12:00
  - `modules/story_events/use_contest_win_story.ts` — новый, 10-29 12:00
  - `modules/story_events/use_story_events.ts` — изменён, 10-29 12:00
  - `tests/story_contest_intro_2026_10_29.test.ts` — изменён, 10-29 11:41
  - `tests/story_contest_win_bridge_2026_10_29.test.ts` — новый, 10-29 12:02
  - `tests/story_contest_winner_2026_10_29.test.tsx` — новый, 10-29 11:47
  - `tests/story_summit_tower_deferred_2026_10_29.test.tsx` — новый, 10-29 12:07
  - `tests/story_templates_v1_2026_10_28.test.ts` — изменён, 10-29 11:42

## Сцены и темы → Темы

### Сирота — 14
  - `app/dev_community_scene_preview.tsx` — новый, 10-27 00:30
  - `app/premium_theme_entitlements.ts` — изменён, 10-28 12:23
  - `app/premium_theme_video_watch.ts` — изменён, 10-28 12:23
  - `constants/mainTabs.ts` — новый, 10-26 23:58
  - `docs/design/v2-app/community-scene-v3.app.js` — изменён, 10-26 17:38
  - `docs/design/v2-app/community-scene-v3.css` — изменён, 10-26 15:34
  - `docs/work/DIALOGS_SCENE_ART_BRIEF_2026-10-22.md` — новый, 10-21 23:21
  - `docs/work/HOME_SCENE_ART_BRIEF_2026-10-21.md` — новый, 10-21 23:21
  - `docs/work/patches/scene_flags_release_2026-10-22.patch` — новый, 10-22 13:01
  - `docs/work/tasks/community-scene-v3-mockup-2026-10-26.md` — изменён, 10-26 13:12
  - `docs/work/tasks/core-theme-motion-pause-2026-10-25.md` — изменён, 10-25 12:08
  - `docs/work/tasks/home-scene-two-tone-dark-2026-10-25.md` — новый, 10-25 16:16
  - `docs/work/tasks/scene-flags-release-patch-2026-10-22.md` — новый, 10-22 12:04
  - `scripts/upload_premium_theme_packs_to_storage.mjs` — новый, 10-23 23:35

### Живое, сегодня — 19 (не брать)
  - `components/dialogs/scene/use_dialogs_scene_theme.ts` — изменён, 10-29 12:30
  - `components/home/v2/scene/HomeScene.tsx` — изменён, 10-29 12:30
  - `components/home/v2/scene/HomeSceneStage.tsx` — изменён, 10-29 12:16
  - `components/scene/SceneBackdrop.tsx` — изменён, 10-29 12:30
  - `components/scene/SceneBackdropFill.tsx` — новый, 10-29 11:32
  - `components/scene/scene_palette.ts` — изменён, 10-29 12:30
  - `docs/design/v2-app/dark-themes.app.js` — изменён, 10-29 12:23
  - `docs/design/v2-app/scene-approved.js` — изменён, 10-29 12:27
  - `docs/design/v2-app/scene-final.app.js` — новый, 10-29 12:29
  - `docs/design/v2-app/scene-final.css` — новый, 10-29 12:27
  - `docs/design/v2-app/scene-final.html` — новый, 10-29 12:29
  - `docs/design/v2-app/scene-final.make.cjs` — новый, 10-29 12:23
  - `docs/design/v2-app/scene-real.js` — изменён, 10-29 12:23
  - `docs/design/v2-app/scene-recolor.js` — изменён, 10-29 12:23
  - `docs/work/handover/codex-scene-palette-item-2026-10-29.md` — новый, 10-29 12:07
  - `docs/work/tasks/scene-final-mockup-2026-10-29.md` — новый, 10-29 12:19
  - `docs/work/tasks/scene-palette-single-source-2026-10-29.md` — изменён, 10-29 12:16
  - `tests/dialogs_scene_light_grad_glow.test.ts` — изменён, 10-29 11:36
  - `tests/scene_palette_parity.test.ts` — изменён, 10-29 12:30

## Админка, «Пульт», сайт, legal → Сайт

### Сирота — 71
  - `docs/design/v2-app/…` — 3
  - `admin/v2/site.html/…` — 1
  - `functions/src/admin_analytics.test.ts/…` — 1
  - `functions/src/admin_analytics.ts/…` — 1
  - `functions/src/admin_analytics_core.ts/…` — 1
  - `functions/src/admin_analytics_fields.test.ts/…` — 1
  - `functions/src/admin_arena_content.ts/…` — 1
  - `functions/src/admin_compliance.test.ts/…` — 1
  - `functions/src/admin_compliance.ts/…` — 1
  - `functions/src/admin_diagnostics_overview.ts/…` — 1
  - `functions/src/admin_paywall_variant_stats.test.ts/…` — 1
  - `functions/src/admin_paywall_variant_stats.ts/…` — 1
  - `functions/src/admin_product_analytics.test.ts/…` — 1
  - `functions/src/admin_product_analytics.ts/…` — 1
  - `scripts/mockups/shot_list_after7.cjs/…` — 1
  - `tests/admin_daily_digest_v2_contract.test.ts/…` — 1
  - `tests/admin_legacy_single_runtime_owners_contract.test.ts/…` — 1
  - `tests/admin_root_analytics_runtime_contract.test.ts/…` — 1
  - `tests/admin_root_daily_digest_contract.test.ts/…` — 1
  - `tests/youtube_connect_once_contract.test.ts/…` — 1
  - `tests/youtube_transcript_browser_only.test.ts/…` — 1
  - `functions/src/admin_staff_authority.test.ts/…` — 1
  - `functions/src/admin_staff_authority.ts/…` — 1
  - `functions/src/admin_staff_contract.test.ts/…` — 1
  - `functions/src/admin_staff_contract.ts/…` — 1
  - `functions/src/admin_staff_invitation.test.ts/…` — 1
  - `functions/src/admin_staff_invitation.ts/…` — 1
  - `functions/src/admin_staff_invitation_core.test.ts/…` — 1
  - `functions/src/admin_staff_invitation_core.ts/…` — 1
  - `functions/src/admin_staff_invitation_firestore.emulator.test.ts/…` — 1
  - `functions/src/admin_staff_isolated_admin_adapter.test.ts/…` — 1
  - `functions/src/admin_staff_isolated_admin_adapter.ts/…` — 1
  - `functions/src/admin_staff_isolated_core.test.ts/…` — 1
  - `functions/src/admin_staff_isolated_core.ts/…` — 1
  - `functions/src/admin_staff_isolated_endpoint.test.ts/…` — 1
  - `functions/src/admin_staff_isolated_endpoint.ts/…` — 1
  - `functions/src/admin_staff_isolated_firestore.emulator.test.ts/…` — 1
  - `functions/src/admin_staff_isolated_firestore.test.ts/…` — 1
  - `functions/src/admin_staff_isolated_firestore.ts/…` — 1
  - `functions/src/admin_staff_isolated_gateway_core.test.ts/…` — 1
  - `functions/src/admin_staff_isolated_gateway_core.ts/…` — 1
  - `functions/src/admin_staff_isolated_http.test.ts/…` — 1
  - `functions/src/admin_staff_isolated_http.ts/…` — 1
  - `functions/src/admin_staff_membership.test.ts/…` — 1
  - `functions/src/admin_staff_membership.ts/…` — 1
  - `functions/src/admin_staff_membership_core.test.ts/…` — 1
  - `functions/src/admin_staff_membership_core.ts/…` — 1
  - `functions/src/admin_staff_membership_firestore.emulator.test.ts/…` — 1
  - `functions/src/admin_staff_rules.emulator.test.ts/…` — 1
  - `functions/src/admin_staff_tasks_contract.test.ts/…` — 1
  - `functions/src/admin_staff_tasks_contract.ts/…` — 1
  - `functions/src/admin_statistics.test.ts/…` — 1
  - `functions/src/admin_statistics.ts/…` — 1
  - `functions/src/admin_statistics_core.test.ts/…` — 1
  - `functions/src/admin_statistics_core.ts/…` — 1
  - `functions/src/jarvis/…` — 1
  - `functions/src/youtube_comment_policy.test.ts/…` — 1
  - `functions/src/youtube_comment_policy.ts/…` — 1
  - `functions/src/youtube_comment_topics.test.ts/…` — 1
  - `functions/src/youtube_comment_topics.ts/…` — 1
  - `functions/src/youtube_comments_rules.emulator.test.ts/…` — 1
  - `functions/src/youtube_oauth.test.ts/…` — 1
  - `functions/src/youtube_oauth.ts/…` — 1
  - `scripts/admin_manual_reads_regression.cjs/…` — 1
  - `scripts/admin_query_budget_regression.cjs/…` — 1
  - `scripts/admin_refresh_truth_regression.cjs/…` — 1
  - `scripts/admin_section_entry_regression.cjs/…` — 1
  - `scripts/admin_user_drawer_regression.cjs/…` — 1
  - `tests/admin_staff_access_ui_contract.test.ts/…` — 1

### Неясно, вечер 28.10 — 9 (уточнить хозяина)
  - `admin/v2/scripts/pages/youtube-comments.css` — новый, 10-28 22:29
  - `admin/v2/scripts/pages/youtube-comments.js` — новый, 10-28 22:16
  - `functions/src/youtube_comments.test.ts` — новый, 10-28 22:56
  - `functions/src/youtube_comments.ts` — новый, 10-28 22:56
  - `functions/src/youtube_comments_delivery.emulator.test.ts` — новый, 10-28 19:20
  - `functions/src/youtube_feedback.test.ts` — новый, 10-28 19:16
  - `functions/src/youtube_feedback.ts` — новый, 10-28 19:16
  - `functions/src/youtube_feedback_store.ts` — новый, 10-28 19:19
  - `functions/src/youtube_reply_instructions.ts` — новый, 10-28 22:56

### Живое, сегодня — 6 (не брать)
  - `admin/v2/daily-digest.js` — удалён, удалён
  - `admin/v2/legacy.html` — изменён, 10-29 10:35
  - `knowly-www/legal/privacy-ios/index.html` — изменён, 10-29 12:27
  - `knowly-www/legal/privacy/index.html` — изменён, 10-29 12:27
  - `scripts/mockups/ann_v2_capture.cjs` — изменён, 10-29 12:31
  - `scripts/mockups/ann_v2_gate_compare.cjs` — изменён, 10-29 10:51

## Вход, онбординг, Plus/оплата → Вход

### Сирота — 21
  - `app/paywall_context_texts.ts` — изменён, 10-28 16:30
  - `app/paywall_copy.ts` — изменён, 10-28 16:11
  - `assets/images/plus/plus-crown.webp` — новый, 10-23 10:38
  - `components/CleanOnboarding.tsx` — изменён, 10-28 16:23
  - `components/dialogs/DialogueV2PlusTools.tsx` — изменён, 10-25 10:16
  - `components/paywall/PaywallPlusScreen.tsx` — изменён, 10-28 16:14
  - `components/plus-splash/PlusLaunchSplashView.tsx` — изменён, 10-23 10:39
  - `components/plus/PlusMark.tsx` — новый, 10-23 10:38
  - `docs/work/tasks/auth-a11-identity-retired-fresh-profile-2026-10-22.md` — новый, 10-21 23:52
  - `docs/work/tasks/auth-scenarios-2026-10-18.md` — изменён, 10-18 13:32
  - `docs/work/tasks/paywall-close-latency-2026-10-15.md` — изменён, 10-15 12:54
  - `docs/work/tasks/premium-fast-no-cache-r61-2026-10-15.md` — новый, 10-15 22:45
  - `functions/src/account_delete.ts` — изменён, 10-28 11:57
  - `functions/src/account_delete_coverage_gaps.test.ts` — изменён, 10-23 17:17
  - `functions/src/accounts_v2_migration/inventory.ts` — изменён, 10-23 17:17
  - `functions/src/paywall_receipt_attribution.test.ts` — новый, 10-28 16:13
  - `functions/src/paywall_receipt_attribution.ts` — новый, 10-28 16:33
  - `functions/src/premium_status.ts` — изменён, 10-26 16:57
  - `tests/monthly_training_plus_unlimited.test.mjs` — изменён, 10-28 16:25
  - `tests/paywall_context_headline_contract.test.ts` — изменён, 10-28 16:26
  - `tests/paywall_receipt_attribution.test.mjs` — новый, 10-28 16:27

### Неясно, вечер 28.10 — 5 (уточнить хозяина)
  - `app/paywall_funnel.ts` — изменён, 10-28 23:30
  - `app/paywall_purchase.ts` — изменён, 10-28 23:30
  - `functions/src/paywall_funnel_rules.emulator.test.ts` — новый, 10-28 23:29
  - `tests/paywall_funnel_behavior.test.ts` — изменён, 10-28 23:29
  - `tests/paywall_purchase_behavior.test.ts` — изменён, 10-28 23:31

### Живое, сегодня — 16 (не брать)
  - `app/cloud_sync.ts` — изменён, 10-29 12:29
  - `app/plus_cloud_unconfirmed_entry.ts` — изменён, 10-29 11:58
  - `app/referral_cloud.ts` — изменён, 10-29 12:24
  - `app/referral_ladder_flag.ts` — новый, 10-29 12:24
  - `app/referral_ladder_model.ts` — новый, 10-29 12:24
  - `app/referral_vip.ts` — изменён, 10-29 12:24
  - `app/referrals.tsx` — изменён, 10-29 12:31
  - `components/PremiumContext.tsx` — изменён, 10-29 12:01
  - `components/referral_ladder.tsx` — новый, 10-29 12:28
  - `components/referral_ladder_how_sheet.tsx` — новый, 10-29 12:29
  - `components/referral_ladder_strings.ts` — новый, 10-29 12:25
  - `docs/work/tasks/plus-cloud-unconfirmed-paywall-2026-10-29.md` — изменён, 10-29 11:58
  - `functions/src/telegram_premium_bot.ts` — изменён, 10-29 11:11
  - `functions/src/telegram_premium_invoice_payload.test.ts` — новый, 10-29 11:12
  - `functions/src/telegram_premium_invoice_payload.ts` — новый, 10-29 11:10
  - `tests/plus_cloud_no_account_paywall.test.ts` — новый, 10-29 11:59

## Конкурс, наборы, функции, правила → Ядро

### Сирота — 85
  - `assets/images/community_scene/…` — 10
  - `functions/src/content_factory/…` — 6
  - `docs/work/tasks/…` — 2
  - `app/(tabs)/community.tsx/…` — 1
  - `app/community_pack_create.tsx/…` — 1
  - `app/community_packs/CommunityPackSocialBar.tsx/…` — 1
  - `app/community_packs/communityFirestore.ts/…` — 1
  - `app/community_packs/communityPackActions.ts/…` — 1
  - `app/community_packs/communityPackDraftStorage.ts/…` — 1
  - `app/community_packs/functionsClient.ts/…` — 1
  - `app/community_packs/packSocialFirestore.ts/…` — 1
  - `app/community_packs/packSocialStorage.ts/…` — 1
  - `app/flashcards/CommunityPackPreview.tsx/…` — 1
  - `app/flashcards/DeckPickerSheet.tsx/…` — 1
  - `app/flashcards/FlashcardsHubScreen.tsx/…` — 1
  - `app/flashcards/marketplace.ts/…` — 1
  - `app/flashcards/use_deck_train_sheet.tsx/…` — 1
  - `app/flashcards_packs.tsx/…` — 1
  - `app/flashcards_training_setup.tsx/…` — 1
  - `components/packs/PackRow.tsx/…` — 1
  - `config/phone-state-legacy-inventory.v1.json/…` — 1
  - `firestore.indexes.json/…` — 1
  - `functions-admin/index.ts/…` — 1
  - `functions/src/dialogue_v2_latency_trace.ts/…` — 1
  - `functions/src/openai_budget_dashboard.test.ts/…` — 1
  - `functions/src/openai_budget_dashboard.ts/…` — 1
  - `functions/src/public_profile_projection.ts/…` — 1
  - `functions/src/stars_ledger.test.ts/…` — 1
  - `jest.rntl.config.cjs/…` — 1
  - `package.json/…` — 1
  - `router.ctx.js/…` — 1
  - `tests/community_pack_preview_resolving_contract.test.ts/…` — 1
  - `tests/community_pack_social.test.ts/…` — 1
  - `tests/energy_contract.test.ts/…` — 1
  - `tests/energy_contract_probe.ts/…` — 1
  - `tests/energy_start_cost_contract.test.ts/…` — 1
  - `tests/energy_state_v2.test.ts/…` — 1
  - `tests/flashcard_training_pending_grant_reuse_skips_quota.test.ts/…` — 1
  - `tests/flashcard_training_round_claim.test.ts/…` — 1
  - `tests/pack_like_local_write_failure.test.ts/…` — 1
  - `tests/pack_row_shared_contract.test.ts/…` — 1
  - `app/community_packs/communityDraftNavigation.ts/…` — 1
  - `app/community_packs/packSocialLive.ts/…` — 1
  - `components/packs/CommunityAwardDecoration.tsx/…` — 1
  - `components/packs/CommunityMonthRewardHost.tsx/…` — 1
  - `components/packs/CommunityPackCheckScene.tsx/…` — 1
  - `components/packs/CommunityPackScene.tsx/…` — 1
  - `components/packs/CommunityRootTabs.tsx/…` — 1
  - `components/packs/CommunityScene.tsx/…` — 1
  - `components/packs/CommunityWinnerDialog.tsx/…` — 1
  - `docs/community-packs-monthly-contest.md/…` — 1
  - `docs/work/release/…` — 1
  - `functions/src/community_month_claim.emulator.test.ts/…` — 1
  - `functions/src/community_month_reward.test.ts/…` — 1
  - `functions/src/diagnostics_cron_freshness.test.ts/…` — 1
  - `functions/src/diagnostics_cron_freshness.ts/…` — 1
  - `functions/src/diagnostics_scheduler_status.test.ts/…` — 1
  - `functions/src/diagnostics_scheduler_status.ts/…` — 1
  - `functions/src/dialogue_v2_latency_trace.test.ts/…` — 1
  - `functions/src/profile_card_showcase_projection.test.ts/…` — 1
  - `shared/profile_card_showcase.ts/…` — 1
  - `shared/profile_card_showcase_ids.ts/…` — 1
  - `tests/community_contest_schedule.test.ts/…` — 1
  - `tests/community_draft_confirmed_save.test.ts/…` — 1
  - `tests/community_draft_leave.test.ts/…` — 1
  - `tests/community_month_contest.test.ts/…` — 1
  - `tests/community_pack_live_state.test.ts/…` — 1
  - `tests/community_podium_navigation.test.tsx/…` — 1
  - `tests/community_root_tabs.test.tsx/…` — 1
  - `tests/community_winner_dialog.test.tsx/…` — 1

### Неясно, вечер 28.10 — 10 (уточнить хозяина)
  - `app/energy_contract.ts` — изменён, 10-28 23:31
  - `app/energy_system.ts` — изменён, 10-28 23:30
  - `app/flashcards/CollectionHeaderV2.tsx` — изменён, 10-28 21:22
  - `app/flashcards/FlashcardsCategoryHub.tsx` — изменён, 10-28 21:23
  - `app/flashcards_collection.tsx` — изменён, 10-28 21:23
  - `docs/work/tasks/core-dialogs-deploy-package-2026-10-28.md` — изменён, 10-28 21:07
  - `firestore.rules` — изменён, 10-28 23:30
  - `functions/src/community_contest_rules.emulator.test.ts` — новый, 10-28 23:31
  - `functions/src/jarvis/jarvis_data_contract_guard.test.ts` — изменён, 10-28 19:11
  - `tests/owner_locks_energy_30min_no_month_cap_2026_10_28.test.ts` — изменён, 10-28 23:30

### Живое, сегодня — 4 (не брать)
  - `functions/src/access_projection.ts` — изменён, 10-29 11:34
  - `functions/src/community_month_contest.ts` — изменён, 10-29 12:31
  - `functions/src/index.ts` — изменён, 10-29 12:32
  - `shared/community_month_contest.ts` — изменён, 10-29 12:31

## Документы docs/work и прочее — авторам по теме

### Сирота — 81
  - `docs/work/tasks/…` — 64
  - `docs/work/support/…` — 3
  - `docs/gustav/runs/…` — 2
  - `docs/v2/curriculum/…` — 2
  - `docs/work/archive/…` — 2
  - `docs/security/DEPENDENCY_REACHABILITY.json/…` — 1
  - `docs/v2/HANDOVER.md/…` — 1
  - `docs/v2/СТАРТ В2.md/…` — 1
  - `docs/work/exam-banks/…` — 1
  - `docs/work/CODEX_AUDIO_HANDOFF_2026-10-19.md/…` — 1
  - `docs/work/CODEX_TASKS_2026-10-22.md/…` — 1
  - `docs/work/CODEX_TO_CLAUDE_HANDOFF_2026-10-18.md/…` — 1
  - `docs/work/OWNER_INBOX_2026-10-21.md/…` — 1

### Живое, сегодня — 18 (не брать)
  - `docs/work/OWNER_DECISIONS_2026-10-21.md` — изменён, 10-29 12:32
  - `docs/work/OWNER_LOCKS.md` — изменён, 10-29 10:22
  - `docs/work/archive/orphan-2026-10-19/untracked/TodayActivityHistory.tsx` — удалён, удалён
  - `docs/work/archive/orphan-2026-10-19/untracked/audio_replay_pressable_v1.tsx` — удалён, удалён
  - `docs/work/handover/codex-review-2026-10-28.md` — изменён, 10-29 12:05
  - `docs/work/release/2.0.4-plan-2026-10-28.md` — изменён, 10-29 10:04
  - `docs/work/tasks/atomic-source-sync-from-md-2026-10-29.md` — новый, 10-29 12:27
  - `docs/work/tasks/competitive-branch-client-2026-10-29.md` — новый, 10-29 12:23
  - `docs/work/tasks/course-en-rebuild-from-snapshot-2026-10-29.md` — новый, 10-29 10:20
  - `docs/work/tasks/exam-dialogue-no-before-affirmative-2026-10-29.md` — новый, 10-29 11:08
  - `docs/work/tasks/exam-dialogue-tolerance-narrow-2026-10-29.md` — новый, 10-29 11:02
  - `docs/work/tasks/lv2-spanish-progress-cloud-sync-2026-10-29.md` — новый, 10-29 11:06
  - `docs/work/tasks/lv2-spanish-sync-test-hook-2026-10-29.md` — новый, 10-29 11:07
  - `docs/work/tasks/sverka-one-shot-series-2026-10-29.md` — новый, 10-29 12:06
  - `docs/work/tasks/sverka-queue-2026-10-28.md` — новый, 10-29 10:16
  - `docs/work/tasks/sverka-series-scenario-2026-10-29.md` — изменён, 10-29 11:41
  - `docs/work/tasks/tg-pay-payload-and-logs-2026-10-29.md` — новый, 10-29 11:10
  - `docs/work/tasks/voice-night-queue-2026-10-25.md` — изменён, 10-29 12:22

## Прочее — разобрать вручную

### Сирота — 44
  - `components/dev/motion_showcase/…` — 3
  - `.claude/settings.local.json/…` — 1
  - `app/_layout.tsx/…` — 1
  - `app/client_reports.ts/…` — 1
  - `app/monthly_training_sessions.ts/…` — 1
  - `app/personal_progress_store.ts/…` — 1
  - `app/phone_state_preference_bridge.ts/…` — 1
  - `app/privacy_settings.tsx/…` — 1
  - `app/profile_card_public.ts/…` — 1
  - `app/public_profile_snapshot.ts/…` — 1
  - `components/DialogVerdictScreen.tsx/…` — 1
  - `components/DialogsTabContent.tsx/…` — 1
  - `components/MonthlyTrainingSessionIndicator.tsx/…` — 1
  - `components/PlayerProfileModal.tsx/…` — 1
  - `components/mistake-practice/MistakePracticeLoopNode.tsx/…` — 1
  - `components/profile-card/ProfileCardBackdrop.tsx/…` — 1
  - `components/profile-card/ProfileCardBody.tsx/…` — 1
  - `components/profile-card/useSelfProfileCard.ts/…` — 1
  - `components/v2/V2TabBar.tsx/…` — 1
  - `tests/dev_appearance_override.test.ts/…` — 1
  - `tests/freemium_daily_limit_copy_contract.test.ts/…` — 1
  - `tests/metro_block_list_windows.test.ts/…` — 1
  - `tests/monthly_training_sessions.test.ts/…` — 1
  - `tests/profile_card_public_swr.test.ts/…` — 1
  - `tests/revenue_quota_access.test.ts/…` — 1
  - `app/profile_card_showcase_store.ts/…` — 1
  - `components/profile-card/ProfileCardShowcase.tsx/…` — 1
  - `components/profile-card/ProfileCardShowcaseSheet.tsx/…` — 1
  - `components/profile-card/profile_card_showcase_copy.ts/…` — 1
  - `ed1.mjs/…` — 1
  - `hooks/use_profile_card_showcase.ts/…` — 1
  - `hooks/use_profile_card_showcase_sync.ts/…` — 1
  - `modules/privacy/privacy_ai_art.ts/…` — 1
  - `tests/monetization_owner_2026_10_28.test.ts/…` — 1
  - `tests/privacy_ai_art.test.ts/…` — 1
  - `tests/profile_card_showcase.test.ts/…` — 1
  - `tests/profile_card_showcase_journal.test.ts/…` — 1
  - `tests/profile_card_showcase_sheet.test.tsx/…` — 1
  - `tests/profile_card_showcase_store.test.ts/…` — 1
  - `tests/profile_card_showcase_sync.test.ts/…` — 1
  - `tests/use_audio_system_tts_only.test.tsx/…` — 1
  - `th_ink_set.png/…` — 1

### Неясно, вечер 28.10 — 12 (уточнить хозяина)
  - `app/(tabs)/_layout.tsx` — изменён, 10-28 19:08
  - `app/mistake_practice_insights.ts` — изменён, 10-28 19:38
  - `app/mistake_practice_store.ts` — изменён, 10-28 19:38
  - `app/mistakes_hub.tsx` — изменён, 10-28 19:38
  - `app/phone_state_practice_bridge.ts` — изменён, 10-28 19:38
  - `app/speaking_hold_recorder.ts` — изменён, 10-28 19:35
  - `app/speaking_neural_judge.ts` — изменён, 10-28 19:38
  - `components/SpeakingPanel.tsx` — изменён, 10-28 19:35
  - `tests/codex_review_critical_contract_2026_10_28.test.ts` — новый, 10-28 23:31
  - `tests/mistake_practice_store.test.ts` — изменён, 10-28 19:37
  - `tests/speaking_hold_recorder_lifecycle.test.ts` — новый, 10-28 19:34
  - `tests/speaking_neural_judge_lifecycle.test.ts` — новый, 10-28 19:36

### Живое, сегодня — 2 (не брать)
  - `app/remote_flags.ts` — изменён, 10-29 12:23
  - `tests/zz_button_measure.test.ts` — удалён, удалён

### Подсказка по «Прочему» (Ревизор, по названиям — сессии могут перекинуть)
- Витрина карточки профиля (`app/profile_card_*`, `components/profile-card/*`, `hooks/use_profile_card_showcase*`, их тесты) → **Дизайн**.
- Месячный лимит тренировок, деньги и квоты (`app/monthly_training_sessions.ts`, `components/MonthlyTrainingSessionIndicator.tsx`, `tests/revenue_quota_access.test.ts`, `tests/monetization_owner_2026_10_28.test.ts`, `tests/freemium_daily_limit_copy_contract.test.ts`) → **Ядро** (деньги — проверять строго).
- Приватность (`app/privacy_settings.tsx`, `modules/privacy/privacy_ai_art.ts`, `app/public_profile_snapshot.ts`) → **Сайт** (legal) вместе с **Ядром**. До коммита — сверить с политикой.
- Экраны «Диалогов» (`components/DialogVerdictScreen.tsx`, `components/DialogsTabContent.tsx`) → **Темы** (сцена) или автор «Диалогов».
- «Мои ошибки» и «Устно» (`app/mistake_practice_*`, `app/mistakes_hub.tsx`, `app/speaking_*`, `components/SpeakingPanel.tsx`, их тесты — вечер 28.10) → **Дизайн**.
- `ed1.mjs`, `th_ink_set.png`, `components/dev/motion_showcase/*` → мусор и пробы, **не трогать** (владелец).
- `tests/codex_review_critical_contract_2026_10_28.test.ts` (28.10 23:31) — писался по записке Codex; хозяин — сессия, правившая энергию, воронку и правила в 20:30. Уточнить.

## Что предлагаю сессиям
1. Каждая сессия берёт «Сирота» своего раздела: прогоняет связанные тесты на чистой копии (`git archive HEAD` + файл), рабочее коммитит, сломанное и непонятное — списком владельцу. Ничего не удаляем.
2. «Неясно» — сначала спросить в общем канале, чьё. Если за час никто не назвался — считать сиротой.
3. Большие бинарные папки (`assets/audio/learning-v2` — 855 файлов, `assets/images/*` — 111) — до коммита проверить размер и попадёт ли это в бандл. ⚡ Бандл уже вырос 101 → 122 МБ.
4. Мусорный раздел — только решение владельца.
