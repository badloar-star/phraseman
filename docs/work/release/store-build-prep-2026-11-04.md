# Новая сборка в магазины — подготовка Ревизора, 04.11.2026

HEAD на момент среза: 99adcd778. Только чтение; решений нет.

## 1. Чек-лист ручной проверки на устройстве (15 строк)
1. Чистая установка, старт без входа: онбординг, выбор языка изучения (en/es/fr/de/it) — язык сохраняется после перезапуска.
2. Выбранный язык определяет вкладку «Обучение» и плитку курса на Главной (es/en открыты, остальные по D129/D201).
3. Классический урок от начала до конца: итог, медаль, монеты, XP — один раз; повторное открытие не даёт вторую награду.
4. Урок Learning V2 (1 занятие целиком): задания не наслаиваются, энергия списана один раз, прогресс виден после перезапуска.
5. «Собери фразу»: каждое задание решаемо (в т. ч. после правки сборщика ошибок).
6. Словарь: добавить слово, тренировка, «Мои ошибки» открываются без вечной загрузки.
7. Диалог до результата: монеты за диалог засчитаны один раз, история диалога сохраняется.
8. Пик: вход, этаж, правило повышения, рекорд этажа; «нет энергии» показывает окно, а не падает.
9. Покупка Plus: окно, оплата в тестовой среде, сразу открывшиеся уроки.
10. Восстановление покупок на втором устройстве / после переустановки.
11. Вход и выход (Google/Apple/гость): после выхода нет чужих данных, после входа прогресс на месте.
12. Старт без интернета (самолётный режим): Главная, урок из бандла, словарь работают, нет вечных спиннеров.
13. Старт после обновления поверх старой версии: незаконченное занятие, монеты, серия, темы за награды на месте.
14. Главная при fontScale 1.3 и длинном заголовке: текст читается поверх героя; тема за награду показывает свой фон и анимацию.
15. Удаление аккаунта: данные стираются, повторный вход создаёт чистый аккаунт; Telegram-ссылка Plus не даёт чужому доступа.

## 2. Незакоммиченное рабочее дерево (468 путей; 251 с реальными отличиями, остальное — шум CRLF)
Возраст по mtime: 80 файлов старше 4 дней (то, что осталось с эпохи Codex/сирот), 158 за 1–3 дня, 11 за последние сутки. Кто именно автор, по дереву не определить.

| Тема | Файлы (главные) | Тесты |
|---|---|---|
| Классика: журнал завершения урока | app/classic_completion_*.ts (6 новых), modules/classic-course-v1/classic_starter_native_ports.ts, app/lesson1.tsx (140/34), lesson_complete.tsx (91/60), lesson_screen_bootstrap.ts (296/46), progress_events_client.ts, phone_state_progress_cutover.ts, medal_utils.ts, practice_rune_settlement.ts | ~25 новых classic_completion_* и lesson_screen_*, red-fixtures; есть. Самая рискованная тема: задевает прогресс пользователей |
| Доступ к урокам / Plus | lesson_lock_system, lesson_next_access, lesson_premium_gate, lesson_runtime_access_boundary, premium_guard, PremiumContext, monetization_policy (41/0), plus_lessons_diagnostics, combo_gate_decision, combined_lesson_pick | есть (lesson_*, plus_lessons_*, classic_lesson_entitlement_readiness) |
| Пейволы и покупки | paywall_funnel, paywall_purchase, PaywallPlusScreen, use_soft_upsell_opportunity, functions/src/paywall_receipt_attribution (+test), admin_paywall_variant_stats, firestore.indexes.json | есть (paywall_*, paywall_receipt_attribution) |
| Learning V2: полное отключение, язык, видимость | learning_v2_visibility_switch (48/13), learning_v2_locale_guard, learning_v2_owner_repository_runtime (87/14), learning_v2_progress_gate, learning_v2_report_filter, learning_v2_session_rune_reward_recovery_bootstrap (новые), course_released_session_client_v3, home_continue_route, last_lesson | learning_v2_full_off_* (7 новых) и др.; есть. Пересекается с ожидаемой «заморозкой с порогом ≥1» |
| Сцена Главной 280 dp и сцены | HomeScene, HomeSceneStage (26/96), HomeSceneEnergy, home_scene_fit, SceneBackdrop, SceneStarTwinkle, scene_palette, dev_home_scene_preview | home_scene_compact_280 (новый), scene_*, home_hero_* ; есть. Часть тестов уже красная/красные фикстуры (scene_star_twinkle_runtime_owner_red) |
| Android: аудио и жизненный цикл | audio_session_coordinator, modules/audio/audio_activity + audio_runtime_arbiter, speaking_hold_recorder (93/39), speaking_neural_judge, SpeakingPanel, YoutubeInlinePlayer, audio_mode_outcome_diagnostics (новый), modules/dev/native_audio_* | audio_mode_*, speaking_*_lifecycle, native_audio_*, video_player_lifecycle; есть |
| Пик: рекорды этажей, достижения, сцена | functions/src/spire_floor_record_* (10 новых), shared/spire_floor_records.ts, spire_floor_record_flag, SpireFloorRecord/SpireRecordAttempt, spire achievements (modules/achievements/spire_*, spire_achievement_client, assets/images/spire-achievements), use_spire_*, spire_report_client, spire_pack_build, firestore.rules (21/3) | spire_floor_record*, spire_achievement_*; есть. Затрагивает firestore.rules — серверная выкладка |
| Достижения (общие) | app/achievements.ts (91/0), achievement_catalog_v2, activity_achievement_sources, modules/achievements/activity_* | activity_achievement_*; есть |
| Витрина карточки профиля | profile_card_showcase_* (app, components, hooks, shared, functions projection), PlayerProfileModal, profile-card/* | profile_card_showcase*; есть |
| Истории, конкурс, лесенка (клиент) | frames_ladder, story_disc, frames_contest (3/65), contest_win_store (18/138), referral_ladder*.tsx, referral_invite_share (38/14), modules/story_events/referral_ladder_* | referral_ladder_*, story_*; есть |
| Диалоги и монеты | dialogue_v2_coin_reward, DialogueV2CoinIntentHost (20/30), dialogue_v2_session | dialogue_v2_coin_durable_recovery, owner_history_regressions (новые); есть. Соответствует «диалоги не засчитываются» |
| «Мои ошибки» / «Собери фразу» | mistake_practice_store (30/7), mistake_practice_insights, mistakes_hub, modules/mistake-practice/exercise_builders (25/2) | mistake_builder_solvable_2026_11_04 (новый), mistake_practice_store; есть. Соответствует «Собери фразу нерешаемо» |
| Прочее | admin/v2/legacy.html (82/2), functions/src/account_delete (52/11), cloud_sync, dev-инструменты (DevHubSheet, devToolRegistry), jest-конфиги, scripts/mockups | частично (account_delete_coverage_gaps) |
| Мусор, не в сборку | admin.zip, functions-admin/lib/, outputs/, удалённые docs/phraseman-2.0/evidence/m08_1018/*.png, test-results/.last-run.json | — |

## 3. Правило проверки каждого нового коммита
tsc приложения → охранные тесты темы → `git show --stat` на чужие хунки/файлы вне темы → поиск секретов → затрагивает ли прогресс (миграция, ключи AsyncStorage, стирание при выходе).
