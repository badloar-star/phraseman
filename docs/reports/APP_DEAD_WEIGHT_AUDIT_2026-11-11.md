# Аудит мёртвого груза приложения — 2026-11-11

> Версия 2 (пересчёт). Источник — ЗАКОММИЧЕННЫЙ код (снимок d6043c346), а не файлы на диске: рабочая папка на момент аудита
> расходилась с git примерно на 2 250 файлов, и первая версия отчёта, построенная по диску, часть живого кода считала мёртвым.
> Метод: карта импортов от `index.js` и всех файлов-экранов из `router.ctx.js` (dev- и стор-вариант, с учётом заглушек из `metro.config.js`).
> Уже удалено по этому аудиту: 20 файлов (коммит 96878c559). Экран «Активность за год» удалён соседней сессией.
> Не проверялось: неиспользуемые экспорты внутри живых файлов, серверные функции, реальный размер стор-бандла после сжатия.

## Сводка

| Что | Кол-во | Вес |
|---|---|---|
| Экранов (файлов-маршрутов) в dev / в стор-сборке | 139 / 116 | — |
| Исходников, достижимых в стор-сборке | 14405 | 283.2 МБ |
| — из них текст курса V2 (`generated_release`, JSON) | 10 780 | ~195 МБ |
| Ассетов всего (с озвучкой курса) | 18915 | 528.0 МБ |
| — реально подключено кодом | 810 | 16.7 МБ |
| Код, недостижимый из приложения | 721 | 8.9 МБ |
| — A1: нет ни импортов, ни упоминаний в тестах/скриптах | 28 | 143 КБ |
| — A2: импортов нет, но имя упомянуто в тестах/скриптах | 71 | 790 КБ |
| — B: живёт только за счёт тестов (не курс V2) | 87 | 804 КБ |
| — курс V2: конвейер контента и банки экзаменов (вне приложения) | 423 | 6.2 МБ |
| — используется сервером/админкой (НЕ удалять) | 72 | 826 КБ |

## 1. Что грузит приложение без необходимости (не «удалить», а «вынести»)

1. **Текст курса V2 целиком в JS-бандле: 10 780 JSON, ~195 МБ исходников** (`modules/learning-v2/content/factory_native/generated_release/{en,es}`)
   плюс манифесты 11,7 МБ + 1,9 МБ и каталог 1,0 МБ. Подключены статическими `require` в `factory_native_manifest_v1.generated.ts`.
   Сами JSON ленивые (внутри стрелочных функций), но всё вместе раздувает бандл, память и каждое OTA-обновление.
   Звук курса уже вынесен в докачиваемые пакеты, фразы дня — в `.dpk`. Тот же приём для текста уроков — главный резерв.
2. **Цепочка от первой строки запуска до манифеста курса:** `index.js → app/runes_system.ts → app/app_snapshot_store.ts → app/firestore_friend_requests.ts → app/cloud_sync.ts → app/mistake_practice_rewards.ts → app/learning_v2_owner_repository_runtime.ts → modules/learning-v2/progress/learning_session_rune_reward_composite_v1.ts → modules/learning-v2/content/factory_native/factory_native_course_v1.ts → modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated.ts`.
   Голый `import './app/runes_system'` в `index.js` тянет за собой 11343 файлов: прогрев рун на старте зависит от синхронизации с облаком и от курса.
3. **Классические курсы пяти языков разом: ~24 МБ JSON** (`modules/classic-courses/{en,de,it,fr,es}`) — пользователь учит один язык.
4. **Крупные данные как модули:** `components/lesson_help_theory_data.tsx` 1,0 МБ, `app/lesson_data_*` ~3 МБ, `app/idioms_data.ts` 0,6 МБ, `app/phrase_audio_url_map.generated.ts` 0,3 МБ.
5. **Все экраны исполняются на старте:** маршруты синхронные, `inlineRequires` выключен (известное решение PM-216 из-за сбоя Fabric) — каждый лишний экран ниже стоит времени запуска.
6. **Компоненты в `app/*.tsx` регистрируются как экраны** (раздел 2.2).
7. **Нативные библиотеки без единого импорта** (раздел 5) — увеличивают бинарник и время инициализации.
8. **Dev-модули, попадающие в стор-сборку** (раздел 6).

## 2. Экраны

### 2.1 Мёртвые экраны — вход не найден (кандидаты на удаление)

| Файл | Вес | Что нашёл |
|---|---|---|
| `app/premium_modal_v2.tsx` | 2 КБ | единственное упоминание — список в `navigation_back.ts`; все переходы идут на `/premium_modal`. Держат тесты `paywall_entry_points_whitelist_contract`, `paywall_navigation_smooth_contract` |
| `app/friends_week_mine.tsx` | 16 КБ | упомянут только в `navigation_back.ts`; переходов нет. Держит `tests/friend_week_mine.test.ts` — возможно, экран ждёт подключения |
| `app/learning_v2_session_intro_check.tsx` | 25 КБ | никем не импортируется, ссылка только из dev-витрины; идёт в стор-сборку |
| `app/dialogue_v2_visual_fixture.tsx` | 9 КБ | dev-макет, ни одной ссылки, идёт в стор-сборку (нет в исключениях `router.ctx.js`). Держит `tests/dialogue_v2_visual_fixture_route.test.ts` |
| `app/lesson_verbs.tsx` | 598 Б | заглушка-редирект на `/lesson_irregular_verbs`; живых переходов нет |
| `app/flashcards_audio.tsx` | 395 Б | заглушка-редирект для старых ссылок; держит `tests/flashcards_audio_contract.test.ts` — удалять, только если старые ссылки уже не важны |

Снято с подозрения при пересчёте: `app/lesson_theory_v2.tsx` (переход есть с Главной), `app/runes_wallet.tsx` (переходы есть). `app/year_activity.tsx` уже удалён соседней сессией.

Каждый экран удаляется вместе со своим тестом-сторожем и записью в `scripts/pm004_route_registry.mjs`; после удаления убрать строку из `app/_layout.tsx` (`Stack.Screen`), `app/navigation_back.ts`, `app/product_analytics_screen_registry.ts`.

### 2.2 Не экраны, но лежат в `app/*.tsx` и регистрируются как маршруты (перенести в `components/`)

`app/TabSlider.tsx`, `app/TabContext.tsx`, `app/quick_actions_bridge.tsx`, `app/voice_equalizer.tsx`, `app/combo_lesson_gate.tsx` (нет default-экспорта),
`app/referral_access_ended_modal.tsx`, `app/lesson_intro_screens.tsx` (40 КБ), `app/lesson_runtime_access_boundary.tsx`,
`app/product_analytics_runtime_observer.tsx`, `app/ai_dialog_consent_gate.tsx`, `app/learning_v2_locale_guard.tsx`,
`app/learning_v2_direct_session_player_v1.tsx` (233 КБ), `app/learning_v2_session_intro.tsx` (45 КБ).

### 2.3 Dev-экраны (в стор-сборку не идут — оставить или удалить по желанию)

`app/dev_cards_result_preview.tsx`, `app/dev_chapter_exam_v2_preview.tsx`, `app/dev_community_scene_preview.tsx`, `app/dev_dialogs_scene_preview.tsx`, `app/dev_home_scene_preview.tsx`, `app/dev_learning_v2_dictionary_v2.tsx`, `app/dev_learning_v2_theory.tsx`, `app/dev_moments_preview.tsx`, `app/dev_season_preview.tsx`, `app/dev_spire_preview.tsx`, `app/dev_spire_scene_preview.tsx`, `app/dev_state.tsx`, `app/dev_today_scene_preview.tsx`, `app/learning-v2/intro-reader-fixture.tsx`, `app/learning_v2_modes_showcase_run/[family].tsx`, `app/pos_analytics_audit.tsx`, `app/v2_kit_preview.tsx`, `app/_dev_cancel_flow_preview.tsx`, `app/_learning_v2_authoring_preview.tsx`, `app/_learning_v2_modes_showcase.tsx`, `app/_motion_showcase.tsx`, `app/_phone_state_sqlcipher_smoke.tsx`, `app/_pos_analytics_audit.tsx`

## 3. Код

### 3.1 A1 — ни импортов, ни упоминаний (удалять первым: 28 файлов, 143 КБ)

> Внимание: «нет упоминаний» здесь значит «нет в тестах и скриптах». Часть файлов ниже упомянута в списках сторожей `config/*-baseline.json`
> или импортируется другим мёртвым файлом из раздела 3.2 (например, `error_traps_*` ← `error_traps/index.ts`, `aha_*` ← `AhaScene.tsx`).
> Такие удаляются только связкой: вместе с мёртвым соседом и правкой списка сторожа. Перед удалением — поиск по имени.

- `app/error_traps/error_traps_17_24.ts` — 7 КБ
- `app/error_traps/error_traps_25_32.ts` — 11 КБ
- `app/error_traps/error_traps_9_16.ts` — 3 КБ
- `app/flashcards/cards_search_sources.ts` — 5 КБ
- `app/flashcards/FlashcardsCategoryBar.tsx` — 2 КБ
- `app/flashcards/FlashcardsCategoryTiles.tsx` — 4 КБ
- `app/learning_v2_audio_identity_v1.ts` — 2 КБ
- `app/learning_v2_lesson1_audio_manifest.ts` — 4 КБ
- `app/lesson_prepositions_es_factory.ts` — 1 КБ
- `app/lesson_prepositions_es_shuffle.ts` — 1 КБ
- `app/settings/profile_name_service.ts` — 2 КБ
- `components/feedback/FeedbackPlashka.tsx` — 4 КБ
- `components/feedback/TransitionBridge.tsx` — 4 КБ
- `components/flashcards/StatusFilterChips.tsx` — 5 КБ
- `components/learning-v2-lab/demo_content.ts` — 7 КБ
- `components/learning-v2-lab/mode_catalog.ts` — 5 КБ
- `components/learning-v2/icons/LearningV2Glyph.tsx` — 3 КБ
- `components/LearningV2CheckpointOutcome.tsx` — 4 КБ
- `components/LearningV2CheckpointSeal.tsx` — 4 КБ
- `components/LearningV2SessionFinale.tsx` — 4 КБ
- `components/onboarding_aha/aha_assets.ts` — 2 КБ
- `components/onboarding_aha/AhaConfetti.tsx` — 3 КБ
- `components/onboarding_aha/ChipsAssembly.tsx` — 10 КБ
- `components/onboarding_aha/KaraokeLine.tsx` — 3 КБ
- `components/premium_celebration/CelebrationSceneViews.tsx` — 30 КБ
- `components/ui/new/OfflineDataNotice.tsx` — 5 КБ
- `components/VipGreenUserName.tsx` — 3 КБ
- `constants/celebrationSceneColors.ts` — 3 КБ

### 3.2 A2 — импортов нет, имя встречается в тестах/скриптах (71 файлов, 790 КБ)

Тесты часто читают исходник как текст или проверяют, что компонента НЕТ на экране. Удалять вместе с проверкой соответствующего теста.

- `app/community_packs/purchaseCommunityPack.ts` — 1 КБ
- `app/community_packs/UgcPackEditorCardPreview.tsx` — 16 КБ
- `app/completion/progress_completion_copy.ts` — 622 Б
- `app/constants/verb_forms.ts` — 10 КБ
- `app/error_traps/error_traps_1_8.ts` — 81 КБ
- `app/error_traps/index.ts` — 1 КБ
- `app/explain_choice_client.ts` — 4 КБ
- `app/feedback/sound_bank.ts` — 1 КБ
- `app/flashcards/delete_hint_seen.ts` — 2 КБ
- `app/french_phrase_analytics.ts` — 10 КБ
- `app/learning_v2_factory_runtime_audio_omissions_v1.ts` — 4 КБ
- `app/learning_v2_intro_theme.ts` — 2 КБ
- `app/learning_v2_runtime_audio_omissions_v1.generated.ts` — 7 КБ
- `app/lesson_prepositions_es_segment01.ts` — 24 КБ
- `app/lesson_prepositions_es_segment02.ts` — 27 КБ
- `app/lesson_prepositions_es_segment03.ts` — 32 КБ
- `app/lesson_teaching_notes.ts` — 6 КБ
- `app/paywall_profile.ts` — 7 КБ
- `app/pos_micro_diagnosis.ts` — 140 КБ
- `app/quiz_data_es_l2.ts` — 15 КБ
- `app/rank_change.ts` — 4 КБ
- `app/revenue_quota_access.ts` — 761 Б
- `app/theme_ownership_store.ts` — 10 КБ
- `app/theme_ui_assets.ts` — 660 Б
- `app/weekly_review_copy.ts` — 8 КБ
- `components/account/GlassInlineAlert.tsx` — 3 КБ
- `components/AccountDeletedNotice.tsx` — 6 КБ
- `components/BilingualMistakeText.tsx` — 3 КБ
- `components/centered_dialog_shell.tsx` — 9 КБ
- `components/dialogs/DialogHelperRow.tsx` — 7 КБ
- `components/dialogs/DialogHowToSaySheet.tsx` — 21 КБ
- `components/ExamResultPreviewAdminModal.tsx` — 35 КБ
- `components/ExplainButton.tsx` — 6 КБ
- `components/feature_intro/DialogueComicStage.tsx` — 3 КБ
- `components/feedback/ProgressCompletionView.tsx` — 941 Б
- `components/feedback/RetiredRasterFallback.tsx` — 2 КБ
- `components/flashcards/CollectionLimitHeader.tsx` — 5 КБ
- `components/flashcards/FlashcardsShelves.tsx` — 10 КБ
- `components/friends_together/FriendPhraseCard.tsx` — 22 КБ
- `components/home/HomeMistakesLockedSheet.tsx` — 4 КБ
- `components/home/homeRuneAsset.ts` — 1 КБ
- `components/home/HomeSectionPulseButton.tsx` — 6 КБ
- `components/learning-v2-lab/kimi/primitives.tsx` — 8 КБ
- `components/learning-v2-lab/kimi/tokens.ts` — 5 КБ
- `components/learning-v2-lab/LearningV2ModesLab.tsx` — 8 КБ
- `components/learning-v2-lab/ModeDemoPlayer.tsx` — 19 КБ
- `components/learning-v2/icons/LearningV2ChapterPattern.tsx` — 4 КБ
- `components/learning-v2/icons/LearningV2ChapterTile.tsx` — 3 КБ
- `components/learning-v2/LearningV2LessonDictionaryOverlayV1.tsx` — 20 КБ
- `components/learning-v2/LearningV2PulseMapSessionRow.tsx` — 11 КБ
- `components/LessonEnergyLightning.tsx` — 711 Б
- `components/LevelSpinRewardArt.tsx` — 1 КБ
- `components/mistake-practice/MistakePracticeLoopNode.tsx` — 4 КБ
- `components/onboarding_aha/aha_audio.ts` — 8 КБ
- `components/onboarding_aha/aha_ui.tsx` — 8 КБ
- `components/onboarding_aha/AhaScene.tsx` — 12 КБ
- `components/onboarding_aha/index.ts` — 296 Б
- `components/onboarding_aha/SceneBackdrop.tsx` — 1 КБ
- `components/paywall/PaywallBenefitComparison.tsx` — 18 КБ
- `components/paywall/PaywallProofCards.tsx` — 43 КБ
- `components/PopUpActionButton.tsx` — 4 КБ
- `components/SpeakingButton.tsx` — 8 КБ
- `components/spire/scene/spire_scene_header.tsx` — 9 КБ
- `components/stats/AiBlockNote.tsx` — 6 КБ
- `components/ui/new/UndoSnackbar.tsx` — 9 КБ
- `components/ui/PrimaryButton.tsx` — 4 КБ
- `components/YearWheel.tsx` — 5 КБ
- `hooks/use-onboarding-sounds.ts` — 1 КБ
- `hooks/use-speak-answer.ts` — 5 КБ
- `hooks/useAccordionFaqStyle.ts` — 3 КБ
- `hooks/useSpeakingAttemptGate.ts` — 6 КБ

### 3.3 B — отключённые разделы: живут только за счёт тестов (87 файлов, 804 КБ)

Целые функции, которые собраны и покрыты тестами, но к интерфейсу не подключены. Решение по каждой — «подключить» или «удалить вместе с тестами».

| Папка | Файлов | Вес |
|---|---|---|
| `app/lesson_data_1_8_phrases_source.ts` | 1 | 276 КБ |
| `components/learning-v2` | 9 | 93 КБ |
| `components/onboarding_aha` | 6 | 56 КБ |
| `modules/phone-state` | 5 | 37 КБ |
| `components/RewardModalBackdrop.tsx` | 1 | 29 КБ |
| `app/learning_v2_course_released_session_client_v2.ts` | 1 | 24 КБ |
| `modules/account-session-v2` | 2 | 19 КБ |
| `app/stats_insights_client.ts` | 1 | 17 КБ |
| `components/spire` | 1 | 13 КБ |
| `app/friends_together` | 2 | 13 КБ |
| `components/premium_celebration` | 1 | 12 КБ |
| `components/home` | 3 | 11 КБ |
| `app/energy_gift_client.ts` | 1 | 10 КБ |
| `app/energy_gift_pool.ts` | 1 | 10 КБ |
| `modules/audio` | 1 | 10 КБ |
| `components/packs` | 2 | 9 КБ |
| `app/learning_v2_activity_released_submission_sync_v2.ts` | 1 | 9 КБ |
| `app/review_evaluator.ts` | 1 | 8 КБ |
| `components/SpeakingQuotaDots.tsx` | 1 | 8 КБ |
| `components/paywall` | 1 | 7 КБ |
| `app/learning_v2_remote_audio_v1.ts` | 1 | 7 КБ |
| `components/friends_together` | 1 | 6 КБ |
| `app/paywall_progress_mirror.ts` | 1 | 6 КБ |
| `app/flashcards` | 1 | 6 КБ |
| `app/mistakes_locked_copy.ts` | 1 | 6 КБ |
| `app/dialogue_v2_released_catalogue_projection.ts` | 1 | 6 КБ |
| `constants/statsThemeChrome.ts` | 1 | 6 КБ |
| `components/streak` | 1 | 6 КБ |
| `app/shards_pending_grants.ts` | 1 | 5 КБ |
| `app/feedback_engine.ts` | 1 | 5 КБ |
| `app/lesson_grammar_map.ts` | 1 | 5 КБ |
| `app/account_deleted_notice.ts` | 1 | 4 КБ |
| `app/guest_background_upload.ts` | 1 | 4 КБ |
| `app/learning_v2_course_session_save_card_v1.ts` | 1 | 4 КБ |
| `app/weekly_review_snapshot.ts` | 1 | 4 КБ |
| `app/learning_v2_new_word_encounter_flow_v1.ts` | 1 | 4 КБ |
| `app/session_attempts` | 1 | 3 КБ |
| `app/user_warning_check.ts` | 1 | 3 КБ |
| `app/energy_gift_effects.ts` | 1 | 3 КБ |
| `app/word_training_neighbor_blocks.ts` | 1 | 3 КБ |
| `app/learning_v2_session_review_history_v1.ts` | 1 | 3 КБ |
| `app/dialogs_rank.ts` | 1 | 3 КБ |
| `app/dialogs_limit_session.ts` | 1 | 3 КБ |
| `constants/statsThemeChromeFromTokens.ts` | 1 | 2 КБ |
| `components/energyIconLayout.ts` | 1 | 2 КБ |
| `app/learning_v2_mistake_loop_runtime.ts` | 1 | 2 КБ |
| `app/bilingual_segments.ts` | 1 | 2 КБ |
| `app/practice_option_shuffle.ts` | 1 | 2 КБ |
| `app/types` | 1 | 2 КБ |
| `hooks/dev_force_low_end.ts` | 1 | 2 КБ |
| `app/home_youtube_feature.ts` | 1 | 2 КБ |
| `app/completion` | 1 | 2 КБ |
| `hooks/use_dialogue_v2_freeform_prepared_bot_voice_playback.ts` | 1 | 1 КБ |
| `app/achievement_nearest.ts` | 1 | 1 КБ |
| `constants/cinemaAssetVariants.ts` | 1 | 1 КБ |
| `modules/spire` | 1 | 1 КБ |
| `constants/themedToastChromeFromTokens.ts` | 1 | 1 КБ |
| `app/home_learning_priority_card.ts` | 1 | 1 КБ |
| `app/learning_language_surface_availability.ts` | 1 | 1 КБ |
| `app/ai_dialog_energy_settlement.ts` | 1 | 1 КБ |
| `app/revenue_quota_energy_guard.ts` | 1 | 755 Б |
| `app/dialogue_pack_canonical.ts` | 1 | 662 Б |
| `app/feature_access_resolution.ts` | 1 | 522 Б |
| `app/video_phrases_contract.ts` | 1 | 521 Б |
| `components/statsPremiumBlurCache.ts` | 1 | 344 Б |

- `app/account_deleted_notice.ts` — 4 КБ
- `app/achievement_nearest.ts` — 1 КБ
- `app/ai_dialog_energy_settlement.ts` — 1 КБ
- `app/bilingual_segments.ts` — 2 КБ
- `app/completion/progress_completion_model.ts` — 2 КБ
- `app/dialogs_limit_session.ts` — 3 КБ
- `app/dialogs_rank.ts` — 3 КБ
- `app/dialogue_pack_canonical.ts` — 662 Б
- `app/dialogue_v2_released_catalogue_projection.ts` — 6 КБ
- `app/energy_gift_client.ts` — 10 КБ
- `app/energy_gift_effects.ts` — 3 КБ
- `app/energy_gift_pool.ts` — 10 КБ
- `app/feature_access_resolution.ts` — 522 Б
- `app/feedback_engine.ts` — 5 КБ
- `app/flashcards/cards_search_index.ts` — 6 КБ
- `app/friends_together/friend_phrase_card.ts` — 6 КБ
- `app/friends_together/friend_phrase_copy.ts` — 6 КБ
- `app/guest_background_upload.ts` — 4 КБ
- `app/home_learning_priority_card.ts` — 1 КБ
- `app/home_youtube_feature.ts` — 2 КБ
- `app/learning_language_surface_availability.ts` — 1 КБ
- `app/learning_v2_activity_released_submission_sync_v2.ts` — 9 КБ
- `app/learning_v2_course_released_session_client_v2.ts` — 24 КБ
- `app/learning_v2_course_session_save_card_v1.ts` — 4 КБ
- `app/learning_v2_mistake_loop_runtime.ts` — 2 КБ
- `app/learning_v2_new_word_encounter_flow_v1.ts` — 4 КБ
- `app/learning_v2_remote_audio_v1.ts` — 7 КБ
- `app/learning_v2_session_review_history_v1.ts` — 3 КБ
- `app/lesson_data_1_8_phrases_source.ts` — 276 КБ
- `app/lesson_grammar_map.ts` — 5 КБ
- `app/mistakes_locked_copy.ts` — 6 КБ
- `app/paywall_progress_mirror.ts` — 6 КБ
- `app/practice_option_shuffle.ts` — 2 КБ
- `app/revenue_quota_energy_guard.ts` — 755 Б
- `app/review_evaluator.ts` — 8 КБ
- `app/session_attempts/session_attempts_registry.ts` — 3 КБ
- `app/shards_pending_grants.ts` — 5 КБ
- `app/stats_insights_client.ts` — 17 КБ
- `app/types/feedback.ts` — 2 КБ
- `app/user_warning_check.ts` — 3 КБ
- `app/video_phrases_contract.ts` — 521 Б
- `app/weekly_review_snapshot.ts` — 4 КБ
- `app/word_training_neighbor_blocks.ts` — 3 КБ
- `components/energyIconLayout.ts` — 2 КБ
- `components/friends_together/energy_gift_strings.ts` — 6 КБ
- `components/home/v2/scene/home_scene_art.ts` — 5 КБ
- `components/home/v2/scene/home_scene_hero_fade.ts` — 4 КБ
- `components/home/v2/scene/home_scene_hero512.generated.ts` — 3 КБ
- `components/learning-v2/horizons/art.ts` — 9 КБ
- `components/learning-v2/horizons/copy.ts` — 11 КБ
- `components/learning-v2/horizons/HorizonArtwork.tsx` — 4 КБ
- `components/learning-v2/horizons/LearningV2Horizons.tsx` — 28 КБ
- `components/learning-v2/horizons/model.ts` — 13 КБ
- `components/learning-v2/icons/learningV2IconData.generated.ts` — 17 КБ
- `components/learning-v2/icons/learningV2IconHue.ts` — 5 КБ
- `components/learning-v2/icons/learningV2Icons.ts` — 3 КБ
- `components/learning-v2/season/season_modal_bounds.ts` — 3 КБ
- `components/onboarding_aha/aha_chips_logic.ts` — 3 КБ
- `components/onboarding_aha/aha_events.ts` — 1 КБ
- `components/onboarding_aha/aha_karaoke.ts` — 2 КБ
- `components/onboarding_aha/aha_scenes.ts` — 15 КБ
- `components/onboarding_aha/aha_speech_logic.ts` — 2 КБ
- `components/onboarding_aha/SpeechBeat.tsx` — 32 КБ
- `components/packs/community_scene_shared.ts` — 5 КБ
- `components/packs/TopNewSwitch.tsx` — 5 КБ
- `components/paywall/m/paywall_m_panels.ts` — 7 КБ
- `components/premium_celebration/celebrationScenes.ts` — 12 КБ
- `components/RewardModalBackdrop.tsx` — 29 КБ
- `components/SpeakingQuotaDots.tsx` — 8 КБ
- `components/spire/peak/PeakTour.tsx` — 13 КБ
- `components/statsPremiumBlurCache.ts` — 344 Б
- `components/streak/moments/StreakMilestoneRibbon.tsx` — 6 КБ
- `constants/cinemaAssetVariants.ts` — 1 КБ
- `constants/statsThemeChrome.ts` — 6 КБ
- `constants/statsThemeChromeFromTokens.ts` — 2 КБ
- `constants/themedToastChromeFromTokens.ts` — 1 КБ
- `hooks/dev_force_low_end.ts` — 2 КБ
- `hooks/use_dialogue_v2_freeform_prepared_bot_voice_playback.ts` — 1 КБ
- `modules/account-session-v2/account_sync_srs_reissue.ts` — 11 КБ
- `modules/account-session-v2/testing/memory_scope_storage.ts` — 8 КБ
- `modules/audio/sound_motion.ts` — 10 КБ
- `modules/phone-state/legacy_reader.ts` — 7 КБ
- `modules/phone-state/opening_checkpoint.ts` — 10 КБ
- `modules/phone-state/shadow_compare.ts` — 4 КБ
- `modules/phone-state/testing/memory_database.ts` — 11 КБ
- `modules/phone-state/testing/sync_cost_trace.ts` — 4 КБ
- `modules/spire/bot_coin_rank.ts` — 1 КБ

### 3.4 Курс V2 — конвейер контента (423 файлов, 6.2 МБ)

В приложение не входит: исходники и проверки сборки курса, банки экзаменов (212 файлов, читаются тестами). НЕ удалять без владельца конвейера.

| Папка | Файлов | Вес |
|---|---|---|
| `modules/learning-v2/content/source` | 356 | 5.1 МБ |
| `modules/learning-v2/curriculum/en` | 23 | 605 КБ |
| `modules/learning-v2/curriculum/de` | 12 | 330 КБ |
| `modules/learning-v2/curriculum/validation` | 2 | 27 КБ |
| `modules/learning-v2/curriculum/contracts` | 3 | 27 КБ |
| `modules/learning-v2/content/neutral_qa_session_fixture_v1.ts` | 1 | 21 КБ |
| `modules/learning-v2/progress/server_wallet_credit_settlement.ts` | 1 | 16 КБ |
| `modules/learning-v2/progress/required_session_credit_settlement.ts` | 1 | 13 КБ |
| `modules/learning-v2/content/objective_coverage_matrix_v1.ts` | 1 | 13 КБ |
| `modules/learning-v2/content/quality_dashboard_v1.ts` | 1 | 11 КБ |
| `modules/learning-v2/content/evidence_based_quality_rules_v1.ts` | 1 | 11 КБ |
| `modules/learning-v2/preview/static_owner_review_bundle_v1.ts` | 1 | 10 КБ |
| `modules/learning-v2/runtime/course_session_audio_readback_v1.ts` | 1 | 9 КБ |
| `modules/learning-v2/content/session_intro_runtime_adapter.ts` | 1 | 8 КБ |
| `modules/learning-v2/preview/authoring_device_preview_v1.ts` | 1 | 8 КБ |
| `modules/learning-v2/content/paywall_upcoming_phrases_v1.ts` | 1 | 7 КБ |
| `modules/learning-v2/progress/required_session_award_decision.ts` | 1 | 7 КБ |
| `modules/learning-v2/exam/chapter_exam_v2_vocabulary.ts` | 1 | 7 КБ |
| `modules/learning-v2/contracts/hard_mode.ts` | 1 | 5 КБ |
| `modules/learning-v2/content/audio_delivery_contract.ts` | 1 | 5 КБ |
| `modules/learning-v2/content/generator_course_contract_v2.ts` | 1 | 5 КБ |
| `modules/learning-v2/contracts/mode_native_authoring_contract_v1.ts` | 1 | 5 КБ |
| `modules/learning-v2/preview/authoring_device_preview_lesson2_v1.ts` | 1 | 5 КБ |
| `modules/learning-v2/preview/authoring_device_preview_lesson3_v1.ts` | 1 | 4 КБ |
| `modules/learning-v2/contracts/migration_policy.ts` | 1 | 4 КБ |

### 3.5 Используется сервером/админкой — НЕ удалять

- `modules/learning-v2-pcm-decoder/index.ts` — 2 КБ
- `modules/learning-v2-pcm-decoder/types.ts` — 810 Б
- `modules/learning-v2/authoring/episode_draft.ts` — 13 КБ
- `modules/learning-v2/authoring/episode_graph.ts` — 9 КБ
- `modules/learning-v2/authoring/season_approval_receipt.ts` — 3 КБ
- `modules/learning-v2/authoring/season_draft.ts` — 18 КБ
- `modules/learning-v2/authoring/season_revision.ts` — 7 КБ
- `modules/learning-v2/content/generator_course_batch_plan.ts` — 13 КБ
- `modules/learning-v2/content/generator_course_manifest.ts` — 15 КБ
- `modules/learning-v2/content/lesson1_release_parity_v1.ts` — 5 КБ
- `modules/learning-v2/content/optional_practice.ts` — 4 КБ
- `modules/learning-v2/content/release_cache.ts` — 1 КБ
- `modules/learning-v2/content/release_loader.ts` — 900 Б
- `modules/learning-v2/content/release_manifest.ts` — 14 КБ
- `modules/learning-v2/content/release_rollout_v1.ts` — 3 КБ
- `modules/learning-v2/content/source/authored_sessions_v1.ts` — 35 КБ
- `modules/learning-v2/contracts/access_boost.ts` — 7 КБ
- `modules/learning-v2/contracts/access_quote.ts` — 3 КБ
- `modules/learning-v2/contracts/activity_result.ts` — 8 КБ
- `modules/learning-v2/contracts/activity_session_package_v2.ts` — 23 КБ
- `modules/learning-v2/contracts/content_studio.ts` — 1 КБ
- `modules/learning-v2/contracts/curriculum.ts` — 3 КБ
- `modules/learning-v2/contracts/delayed_probe.ts` — 5 КБ
- `modules/learning-v2/contracts/delayed_receipts.ts` — 11 КБ
- `modules/learning-v2/contracts/delayed_runtime.ts` — 6 КБ
- `modules/learning-v2/contracts/required_session_answer.ts` — 2 КБ
- `modules/learning-v2/contracts/required_session_progress.ts` — 25 КБ
- `modules/learning-v2/contracts/schema_versions.ts` — 2 КБ
- `modules/learning-v2/contracts/validation.ts` — 223 КБ
- `modules/learning-v2/migration/placement_policy.ts` — 6 КБ
- `modules/learning-v2/progress/activity_released_session_submission_spool_v2.ts` — 11 КБ
- `modules/learning-v2/progress/activity_released_session_submission_v2.ts` — 16 КБ
- `modules/learning-v2/progress/checkpoint_projection.ts` — 5 КБ
- `modules/learning-v2/progress/gate_policy.ts` — 2 КБ
- `modules/learning-v2/progress/learning_evidence_policy.ts` — 2 КБ
- `modules/learning-v2/progress/optional_practice_reward.ts` — 11 КБ
- `modules/learning-v2/progress/progress_hydration.ts` — 2 КБ
- `modules/learning-v2/progress/required_session_reducer.ts` — 23 КБ
- `modules/learning-v2/reference-evidence/reference_evidence_gate.ts` — 7 КБ
- `modules/learning-v2/runtime/activity_auxiliary_integrity_loader_v1.ts` — 13 КБ
- `modules/learning-v2/runtime/activity_auxiliary_release_index_v1.ts` — 22 КБ
- `modules/learning-v2/runtime/activity_auxiliary_release_manifest_v1.ts` — 16 КБ
- `modules/learning-v2/runtime/activity_learner_core_release_index_v1.ts` — 22 КБ
- `modules/learning-v2/runtime/activity_learner_core_release_index_v2.ts` — 19 КБ
- `modules/learning-v2/runtime/activity_registry.ts` — 7 КБ
- `modules/learning-v2/runtime/activity_runtime.ts` — 418 Б
- `modules/learning-v2/runtime/activity_session_intro_projection_v1.ts` — 14 КБ
- `modules/learning-v2/runtime/course_lesson_audio_release_index_v1.ts` — 15 КБ
- `modules/learning-v2/runtime/course_session_audio_release_extension_v1.ts` — 12 КБ
- `modules/learning-v2/runtime/course_session_learner_transport_projection_v1.ts` — 20 КБ
- `modules/learning-v2/runtime/course_session_readback_v1.ts` — 7 КБ
- `modules/learning-v2/runtime/unsupported_activity.ts` — 321 Б
- `modules/learning-v2/runtime/voice_audio_device_episode_upload_ack_v1.ts` — 6 КБ
- `modules/learning-v2/runtime/voice_audio_device_page_evidence_v1.ts` — 8 КБ
- `modules/learning-v2/runtime/voice_audio_device_page_upload_ack_v1.ts` — 9 КБ
- `modules/learning-v2/runtime/voice_audio_device_page_v1.ts` — 16 КБ
- `modules/learning-v2/runtime/voice_native_decoder_observer_v1.ts` — 9 КБ
- `modules/learning-v2/runtime/voice_pcm_signal_observer_v1.ts` — 16 КБ
- `modules/phone-state/reducers/counter.ts` — 1 КБ
- `modules/phone-state/reducers/economy.ts` — 2 КБ
- `modules/phone-state/reducers/entities.ts` — 4 КБ
- `modules/phone-state/reducers/helpers.ts` — 2 КБ
- `modules/phone-state/reducers/index.ts` — 166 Б
- `modules/phone-state/reducers/register.ts` — 2 КБ
- `modules/phone-state/reducers/sets.ts` — 2 КБ
- `modules/phone-state/reducers/streak.ts` — 3 КБ
- `shared/dialogue_v2_freeform_contract.ts` — 1 КБ
- `shared/dialogue_v2_freeform_prepared_bot_voice_selection_contract.ts` — 5 КБ
- `shared/dialogue_v2_group_participant_adapter.ts` — 1 КБ
- `shared/dialogue_v2_group_turn_planner.ts` — 8 КБ
- `shared/dialogue_v2_release_coverage_contract.ts` — 2 КБ
- `shared/video_transcript_timing.ts` — 10 КБ

### 3.6 Данные внутри папок кода, которые никто не читает

- `modules/learning-v2/curriculum` — 16 файл(ов), 1.5 МБ
- `app/graphify-out/cache` — 88 файл(ов), 328 КБ
- `modules/account-session-v2/native` — 1 файл(ов), 104 КБ
- `app/error_traps/AUDIT_1_8.md` — 1 файл(ов), 24 КБ
- `app/learning_v2_factory_silent_audio_v1.json` — 1 файл(ов), 5 КБ
- `modules/learning-v2/content` — 1 файл(ов), 1 КБ
- `app/карточки дальше.txt` — 1 файл(ов), 0 Б

Отдельно: `app/graphify-out/cache` — 88 файлов кэша анализатора лежат в папке экранов и закоммичены.

## 4. Ассеты

Подключено кодом 810 из 18915 файлов (925 без озвучки курса).

### 4.1 `assets/audio/learning-v2` — 17990 файлов, 505.5 МБ

В приложение не входит (звук курса докачивается пакетом, папка исключена в `.easignore`), но закоммичена в git.
Удалять из репозитория, только если те же файлы надёжно лежат в облачном хранилище или у конвейера озвучки.

### 4.2 Нигде не упоминаются (97 файлов, 4.3 МБ)

- `assets/audio/correct.mp3` — 29 КБ
- `assets/audio/correct_new.mp3` — 33 КБ
- `assets/audio/message_received.mp3` — 11 КБ
- `assets/audio/ob_correct.mp3` — 62 КБ
- `assets/audio/ob_purchase_success.mp3` — 56 КБ
- `assets/audio/onboarding_aha/ambient_everyday.mp3` — 329 КБ
- `assets/audio/onboarding_aha/ambient_media.mp3` — 329 КБ
- `assets/audio/onboarding_aha/ambient_people.mp3` — 329 КБ
- `assets/audio/onboarding_aha/ambient_self.mp3` — 329 КБ
- `assets/audio/onboarding_aha/ambient_travel.mp3` — 329 КБ
- `assets/audio/onboarding_aha/ambient_work.mp3` — 329 КБ
- `assets/audio/onboarding_aha/everyday_a.mp3` — 28 КБ
- `assets/audio/onboarding_aha/everyday_b.mp3` — 35 КБ
- `assets/audio/onboarding_aha/media_a.mp3` — 25 КБ
- `assets/audio/onboarding_aha/media_b.mp3` — 27 КБ
- `assets/audio/onboarding_aha/people_a.mp3` — 24 КБ
- `assets/audio/onboarding_aha/people_b.mp3` — 41 КБ
- `assets/audio/onboarding_aha/self_a.mp3` — 26 КБ
- `assets/audio/onboarding_aha/self_b.mp3` — 29 КБ
- `assets/audio/onboarding_aha/travel_a.mp3` — 17 КБ
- `assets/audio/onboarding_aha/travel_b.mp3` — 32 КБ
- `assets/audio/onboarding_aha/work_a.mp3` — 26 КБ
- `assets/audio/onboarding_aha/work_b.mp3` — 39 КБ
- `assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-1.mp3` — 15 КБ
- `assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-2.mp3` — 17 КБ
- `assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-3.mp3` — 20 КБ
- `assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-4.mp3` — 41 КБ
- `assets/audio/personal-plans-runtime/gavan/runtime/gavan-d001-listen-audio/gavan-d1-phrase-5.mp3` — 16 КБ
- `assets/audio/record_start.mp3` — 5 КБ
- `assets/audio/sfx/v1/celebration/cel_max_awaken_v1.m4a` — 39 КБ
- `assets/audio/sfx/v1/celebration/cel_streak_shield_v1.m4a` — 16 КБ
- `assets/audio/sfx/v1/max/pm_max_call_connect_v1.m4a` — 13 КБ
- `assets/audio/sfx/v1/max/pm_max_call_end_v1.m4a` — 14 КБ
- `assets/audio/sfx/v1/max/pm_max_consent_granted_v1.m4a` — 13 КБ
- `assets/audio/sfx/v1/max/pm_max_prestart_ready_v1.m4a` — 15 КБ
- `assets/audio/sfx/v1/max/pm_max_review_open_v1.m4a` — 16 КБ
- `assets/audio/sfx/v1/reward/pm_rune_count_tick_v1.m4a` — 8 КБ
- `assets/audio/sfx/v1/social/pm_social_gift_received_v1.m4a` — 19 КБ
- `assets/fonts/OFL-Inter.txt` — 4 КБ
- `assets/images/community_scene/community_21_midnight_moon_fan.webp` — 8 КБ
- `assets/images/community_scene/community_30_slate_minimal_fan.webp` — 6 КБ
- `assets/images/home_last_lesson/home-last-lesson-midnight.webp` — 6 КБ
- `assets/images/home_last_lesson/home-last-lesson-olive.webp` — 6 КБ
- `assets/images/home_last_lesson/home-last-lesson-sagePorcelain.webp` — 6 КБ
- `assets/images/home_last_lesson/home-last-lesson-volt.webp` — 6 КБ
- `assets/images/home_mistakes/home-mistakes-aurora.webp` — 24 КБ
- `assets/images/home_mistakes/home-mistakes-ember.webp` — 24 КБ
- `assets/images/home_mistakes/home-mistakes-gold.webp` — 25 КБ
- `assets/images/home_mistakes/home-mistakes-indigo.webp` — 24 КБ
- `assets/images/home_mistakes/home-mistakes-midnight.webp` — 24 КБ
- `assets/images/home_mistakes/home-mistakes-olive.webp` — 24 КБ
- `assets/images/home_mistakes/home-mistakes-sagePorcelain.webp` — 24 КБ
- `assets/images/home_mistakes/home-mistakes-volt.webp` — 24 КБ
- `assets/images/learning_v2_map/phraseman-map-chest-v1.webp` — 30 КБ
- `assets/images/learning_v2_map/phraseman-map-exam-v1.webp` — 28 КБ
- `assets/images/learning_v2_map/phraseman-map-guide-v1.webp` — 25 КБ
- `assets/images/learning_v2_map/phraseman-map-sign-v1.webp` — 24 КБ
- `assets/images/level-spin-rewards/cosmetic_avatar_aura.webp` — 28 КБ
- `assets/images/level-spin-rewards/cosmetic_theme.webp` — 46 КБ
- `assets/images/level-spin-rewards/pearls_10.webp` — 16 КБ
- `assets/images/level-spin-rewards/pearls_100.webp` — 21 КБ
- `assets/images/level-spin-rewards/pearls_20.webp` — 26 КБ
- `assets/images/level-spin-rewards/pearls_250.webp` — 21 КБ
- `assets/images/level-spin-rewards/pearls_50.webp` — 16 КБ
- `assets/images/level-spin-rewards/stars_100.webp` — 17 КБ
- `assets/images/level-spin-rewards/stars_1000.webp` — 26 КБ
- `assets/images/level-spin-rewards/stars_250.webp` — 24 КБ
- `assets/images/level-spin-rewards/stars_500.webp` — 27 КБ
- `assets/images/spin/README.md` — 811 Б
- `assets/images/splash-icon-light.png` — 106 КБ
- `assets/images/v2art/hero512/dark/home_scene_all_done.webp` — 23 КБ
- `assets/images/v2art/hero512/dark/home_scene_continue.webp` — 23 КБ
- `assets/images/v2art/hero512/dark/home_scene_day_done.webp` — 19 КБ
- `assets/images/v2art/hero512/dark/home_scene_exam_ready.webp` — 17 КБ
- `assets/images/v2art/hero512/dark/home_scene_newbie.webp` — 20 КБ
- `assets/images/v2art/hero512/dark/home_scene_no_energy.webp` — 17 КБ
- `assets/images/v2art/hero512/dark/home_scene_offline.webp` — 18 КБ
- `assets/images/v2art/hero512/dark/home_scene_streak_lost.webp` — 20 КБ
- `assets/images/v2art/hero512/dark/home_scene_streak_risk.webp` — 22 КБ
- `assets/images/v2art/hero512/dark/home_scene_welcome_back.webp` — 20 КБ
- `assets/images/v2art/hero512/light/home_scene_all_done.webp` — 22 КБ
- `assets/images/v2art/hero512/light/home_scene_continue.webp` — 20 КБ
- `assets/images/v2art/hero512/light/home_scene_day_done.webp` — 19 КБ
- `assets/images/v2art/hero512/light/home_scene_exam_ready.webp` — 14 КБ
- `assets/images/v2art/hero512/light/home_scene_newbie.webp` — 20 КБ
- `assets/images/v2art/hero512/light/home_scene_no_energy.webp` — 14 КБ
- `assets/images/v2art/hero512/light/home_scene_offline.webp` — 18 КБ
- `assets/images/v2art/hero512/light/home_scene_streak_lost.webp` — 22 КБ
- `assets/images/v2art/hero512/light/home_scene_streak_risk.webp` — 22 КБ
- `assets/images/v2art/hero512/light/home_scene_welcome_back.webp` — 18 КБ
- `assets/images/weekly_compass_icons/README.md` — 462 Б
- `assets/theme-icons/aurora.webp` — 2 КБ
- `assets/theme-icons/gold.webp` — 2 КБ
- `assets/theme-icons/indigo.webp` — 2 КБ
- `assets/theme-icons/midnight.webp` — 2 КБ
- `assets/theme-icons/sagePorcelain.webp` — 2 КБ
- `assets/╨É╨á╨ò╨¥╨É - Copy.txt` — 458 КБ

### 4.3 Не подключены приложением, но имя встречается в тестах/скриптах/админке (11 файлов, 84 КБ)

- `assets/images/flow_clean_202607/manifest.json` — 3 КБ
- `assets/images/home_last_lesson/home-last-lesson-aurora.webp` — 6 КБ
- `assets/images/home_last_lesson/home-last-lesson-ember.webp` — 5 КБ
- `assets/images/home_last_lesson/home-last-lesson-forest.webp` — 6 КБ
- `assets/images/home_last_lesson/home-last-lesson-gold.webp` — 7 КБ
- `assets/images/home_last_lesson/home-last-lesson-indigo.webp` — 6 КБ
- `assets/images/level-spin-rewards/stars_10.webp` — 22 КБ
- `assets/images/levels/generated-v5-dalle/manifest.json` — 13 КБ
- `assets/images/onboarding_icon_cutout.webp` — 5 КБ
- `assets/images/v2art/hero512/manifest.json` — 9 КБ
- `assets/theme-icons/olive.webp` — 2 КБ

## 5. Библиотеки

| Пакет | Вывод |
|---|---|
| `react-native-view-shot` | 0 импортов — нативный модуль, удалить |
| `expo-symbols` | 0 импортов — удалить |
| `expo-task-manager` | 0 импортов — удалить (проверить, что фоновые уведомления его не требуют) |
| `expo-status-bar` | 0 импортов — удалить |
| `@react-navigation/elements` | 0 импортов — из package.json убрать |
| `@react-navigation/bottom-tabs` | 0 импортов — зависимость самого expo-router, прямую запись убрать |
| `expo-system-ui` | импортов нет, но нужен для `userInterfaceStyle` в app.json — ОСТАВИТЬ |
| `react-native-screens`, `expo-dev-client`, `expo-build-properties`, `expo` | нужны сборке/роутеру — ОСТАВИТЬ |
| dev: `@expo/ngrok`, `@remotion/media-utils`, `an-array-of-english-words` | использования в скриптах не нашёл — проверить и удалить |

## 6. Dev-модули, которые доезжают до стор-сборки

- `components/dev/motion_showcase/showcase_copy.ts` — 47 КБ
- `app/debug-logger.ts` — 17 КБ
- `app/dev_firestore_read_counter.ts` — 13 КБ
- `components/home/v2/scene/home_scene_preview_fixtures.ts` — 10 КБ
- `app/friends_together/dev_bots.ts` — 10 КБ
- `app/dialogue_v2_visual_fixture.tsx` — 9 КБ
- `modules/learning-v2/modes/dev_showcase_fixtures_v1.ts` — 9 КБ
- `app/dev_energy_tools.ts` — 9 КБ
- `modules/learning-v2/content/e1_demo_bank.ts` — 8 КБ
- `app/_learning_v2_authoring_preview.tsx` — 8 КБ
- `app/dev_audio_players_census.ts` — 7 КБ
- `components/friends_together/DevBotsSheet.tsx` — 7 КБ
- `app/device_onboarding_marks.ts` — 7 КБ
- `constants/devRoutes.ts` — 6 КБ
- `app/_learning_v2_modes_showcase.tsx` — 6 КБ
- `app/dev-account-v2-ios-proof.tsx` — 5 КБ
- `app/dev_fixture_upload_guard.ts` — 5 КБ
- `app/dev_callable_counter.ts` — 5 КБ
- `app/dev_plus_controls.ts` — 5 КБ
- `app/dev_video_full.ts` — 4 КБ
- `app/home_polls/home_polls_v2_fixture.ts` — 4 КБ
- `app/dev_plus_splash.ts` — 3 КБ
- `app/dev_forced_flags.ts` — 3 КБ
- `app/paywall_dev_preview.ts` — 3 КБ
- `app/dev_force_newbie.ts` — 3 КБ
- `app/dev_firestore_read_counter_boot.ts` — 2 КБ
- `app/dev_edu_settings.ts` — 2 КБ
- `hooks/device_perf_tier.ts` — 2 КБ
- `app/dev_callable_counter_boot.ts` — 2 КБ
- `app/dev_video_network_delay.ts` — 2 КБ
- `modules/learning-v2/progress/dev_progress_override_v1.ts` — 2 КБ
- `app/platform_ui_preview.ts` — 2 КБ
- `app/dev_audio_players_census_boot.ts` — 2 КБ
- `app/dev-emulator-login.tsx` — 2 КБ
- `app/dev_snapshot_clean.ts` — 2 КБ
- `app/learning_v2_modes_showcase.tsx` — 1 КБ
- `app/dev_diag_gate.ts` — 1 КБ
- `app/motion_showcase.tsx` — 736 Б
- `components/dev/DevHubSheetGate.tsx` — 643 Б
- `app/learning_v2_authoring_preview.tsx` — 525 Б

Обёртки `app/learning_v2_authoring_preview.tsx`, `app/learning_v2_modes_showcase.tsx` и их `_`-пары не внесены в список заглушек стор-сборки — их код уезжает в стор.

(`debug-logger.ts`, `device_onboarding_marks.ts`, `device_perf_tier.ts` — боевые, попали в список по имени; остальные — кандидаты на заглушки в `metro.config.js`.)

## 7. Мусор в корне проекта (на приложение не влияет, засоряет репозиторий и диск)

- Случайные файлы от сбойных команд: `-`, `nul`, `%windir%`, `@`, `console.log('A`, `console.log('ERR'`, `txt[lang]`, `i.completionFeedbackByLocale).length`, `}`, `Write-Output 'done'`.
- Закоммиченные одноразовые файлы: `LB3a.txt`, `LB3b.txt`, `LB6.txt`, `ed1.mjs`, `_scan_broken_tmp.cjs`, `validate_pkg.py`, `replies*.json` (6 шт.), `feed_backfill.state.json`, `market-mockup.html`, `th_ink_set.png`, `ART_STYLE_FOR_CODEX.zip` (рядом распакованная папка на 944 МБ).
- Около 60 отчётов и хэндоффов в корне (`*_AUDIT_2026-06-*.md`, `HANDOFF_*`, `TELEGRAM_UX_*`, `UI_STANDARD_V4/V5`) — перенести в архив документации.
- Папки: `_to_delete` (39 файлов в git), `_archive` (61), `_worktree_backups_2026-08-16`, `_scoped_build_l04_s09_*`, `dist` 476 МБ, `dist-store` 93 МБ, `builds` 284 МБ (сборки .aab за май), `output` 883 МБ, `exports` 716 МБ, `tmp` 218 МБ, `maestro-results` 28 МБ, логи `*.log`, `scan_out*.txt`.
- `docs` — 8 ГБ и 38 115 файлов в git; `content` — 1,9 ГБ и 26 671 файл.
- Рабочая папка расходится с git примерно на 2 250 файлов (около 1 475 есть в git, но отсутствуют на диске) — выяснить, чья это незавершённая работа.
- Старый список `DEAD_CODE_VERIFIED.md` (30.09) исполнен не до конца: например, `components/ExplainButton.tsx` всё ещё на месте.
