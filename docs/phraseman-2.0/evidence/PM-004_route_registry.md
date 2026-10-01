# PM-004 — реестр экранов и маршрутов

Сгенерировано `node scripts/pm004_route_registry.mjs`. **SHA проверки: `ea8413669`** (общий для всех строк — дерево app/ прочитано на этом коммите).

Экран = `.tsx` в `app/` с `export default`-компонентом, без `_`-префикса (кроме `_layout`), не PascalCase-компонент и не колокейтед-компонент в `app/flashcards/`, `app/community_packs/`, `app/feedback/` (тот же критерий, что в `registries/screen_inventory.json`, 24.09).

Входы — строки маршрута в кавычках в `app/ components/ hooks/ modules/` (push/replace/Link/реестры навигации), регистрация `<Stack.Screen>` не считается. Deep link — любой маршрут открывается схемой `phraseman://` (Expo Router, `app/+native-intent.tsx` пропускает путь как есть, кроме перечисленных ниже редиректов); `push-уведомление` — маршрут встречается в `app/notification_tap_handler.ts`. Универсальная ссылка `https://knowlyapps.com/phraseman/invite` → `/home` (app.json intentFilters + +native-intent).

Статусы: keep 70, archive 12, redesign 15, remove 2, needs-owner-decision 1; всего **100**.

| Маршрут | Файл | Владелец | Статус | Основание | Входов | Примеры входов | Deep link |
|---|---|---|---|---|---:|---|---|
| `/(tabs)/_layout` | app/(tabs)/_layout.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 0 | нет (корень/табы/динамический путь) | phraseman://_layout |
| `/(tabs)/arena` | app/(tabs)/arena.tsx | навигация | **archive** | D83: legacy-якорь URL /arena, рендерит null | 9 | app/(tabs)/_layout.tsx:319<br>app/(tabs)/_layout.tsx:328 | phraseman://arena |
| `/(tabs)/community` | app/(tabs)/community.tsx | Сообщество | **redesign** | D39: новая вкладка «Сообщество» | 5 | app/(tabs)/home.tsx:2899<br>app/(tabs)/_layout.tsx:319 | phraseman://community<br>push-уведомление |
| `/(tabs)/friends` | app/(tabs)/friends.tsx | Сообщество/друзья | **redesign** | D39: друзья внутри «Сообщества» | 15 | app/(tabs)/home.tsx:2901<br>app/(tabs)/_layout.tsx:319 | phraseman://friends<br>push-уведомление |
| `/(tabs)/home` | app/(tabs)/home.tsx | Главная | **redesign** | D42/D50/D97: Главная из блоков референса | 70 | app/(tabs)/index.tsx:10<br>app/(tabs)/_layout.tsx:319 | phraseman://home<br>push-уведомление |
| `/(tabs)/index` | app/(tabs)/index.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 0 | нет (корень/табы/динамический путь) | phraseman://index |
| `/(tabs)/journal` | app/(tabs)/journal.tsx | навигация | **archive** | legacy-якорь URL /journal (файл = реэкспорт lessons, не рендерится) | 5 | app/(tabs)/_layout.tsx:316<br>app/(tabs)/_layout.tsx:319 | phraseman://journal |
| `/(tabs)/lessons` | app/(tabs)/lessons.tsx | Обучение | **redesign** | D39/D97: вкладка «Обучение» | 20 | app/(tabs)/friends.tsx:2334<br>app/(tabs)/_layout.tsx:319 | phraseman://lessons |
| `/(tabs)/settings` | app/(tabs)/settings.tsx | Настройки | **redesign** | D39/D97: вкладка «Настройки» | 32 | app/(tabs)/home.tsx:2903<br>app/(tabs)/_layout.tsx:319 | phraseman://settings |
| `/(tabs)/video` | app/(tabs)/video.tsx | Видео | **redesign** | D39/D50: вкладка «Видео» | 5 | app/(tabs)/home.tsx:2897<br>app/(tabs)/home.tsx:3677 | phraseman://video |
| `/+not-found` | app/+not-found.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 0 | нет (корень/табы/динамический путь) | phraseman://+not-found |
| `/_layout` | app/_layout.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 0 | нет (корень/табы/динамический путь) | phraseman://_layout |
| `/account_details` | app/account_details.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 4 | app/(tabs)/settings.tsx:1024<br>app/(tabs)/settings.tsx:1039 | phraseman://account_details |
| `/achievements_screen` | app/achievements_screen.tsx | достижения | **keep** | PM-054 done: достижения удалённых механик сняты, экран остаётся | 4 | app/navigation_back.ts:87<br>app/streak_stats.tsx:2374 | phraseman://achievements_screen |
| `/ai_companion_session` | app/ai_companion_session.tsx | Диалоги | **keep** | D05/D111 | 7 | app/ai_dialog_target_gate.ts:64<br>app/ai_dialog_target_gate.ts:74 | phraseman://ai_companion_session |
| `/ai_dialog_briefing` | app/ai_dialog_briefing.tsx | Диалоги | **keep** | D05/D111 | 7 | app/ai_dialog_target_gate.ts:64<br>app/ai_dialog_target_gate.ts:74 | phraseman://ai_dialog_briefing |
| `/ai_dialog_consent_gate` | app/ai_dialog_consent_gate.tsx | Диалоги | **keep** | D05/D111 + согласие на ИИ (политика) | 1 | app/navigation_back.ts:94 | phraseman://ai_dialog_consent_gate |
| `/ai_dialog_home` | app/ai_dialog_home.tsx | Диалоги | **keep** | D05/D111: Диалоги остаются (лимит Free 30 ответов/мес) | 8 | app/(tabs)/home.tsx:3142<br>app/ai_dialog_target_gate.ts:64 | phraseman://ai_dialog_home |
| `/ai_dialog_session` | app/ai_dialog_session.tsx | Диалоги | **keep** | D05/D111 | 7 | app/ai_dialog_briefing.tsx:315<br>app/ai_dialog_target_gate.ts:64 | phraseman://ai_dialog_session |
| `/coin_rank` | app/coin_rank.tsx | ранг монеты | **keep** | D34/D93 | 3 | app/(tabs)/home.tsx:3360<br>app/(tabs)/home.tsx:3642 | phraseman://coin_rank |
| `/collectibles_screen` | app/collectibles_screen.tsx | коллекция фраз | **keep** | PROGRESS 2026-09-27: коллекция — одобренная поверхность, дропы сняты | 6 | app/lesson_complete.tsx:1672<br>app/lesson_irregular_verbs.tsx:770 | phraseman://collectibles_screen |
| `/combined_lesson_pick` | app/combined_lesson_pick.tsx | learning_v1 | **keep** | реестр 24.09 (keep) | 1 | app/(tabs)/lessons.tsx:4175 | phraseman://combined_lesson_pick |
| `/community_pack_create` | app/community_pack_create.tsx | наборы сообщества | **keep** | D35/D85 | 11 | app/flashcards/FlashcardsCategoryHub.tsx:770<br>app/flashcards/FlashcardsCategoryHub.tsx:854 | phraseman://community_pack_create |
| `/diagnostic_test` | app/diagnostic_test.tsx | learning_v1 | **keep** | реестр 24.09 (keep) | 4 | app/(tabs)/lessons.tsx:5694<br>app/navigation_back.ts:232 | phraseman://diagnostic_test |
| `/dialogue_v2_briefing` | app/dialogue_v2_briefing.tsx | Диалоги V2 | **keep** | D112 | 2 | app/dialogue_v2_completion.tsx:172<br>components/DialogsTabContent.tsx:151 | phraseman://dialogue_v2_briefing |
| `/dialogue_v2_completion` | app/dialogue_v2_completion.tsx | Диалоги V2 | **keep** | D112 | 1 | app/dialogue_v2_session.tsx:360 | phraseman://dialogue_v2_completion |
| `/dialogue_v2_freeform` | app/dialogue_v2_freeform.tsx | Диалоги V2 | **keep** | D81: свободный разговор остаётся | 1 | components/dialogs/DialogueV2CatalogueContainer.tsx:146 | phraseman://dialogue_v2_freeform |
| `/dialogue_v2_memory` | app/dialogue_v2_memory.tsx | Диалоги V2 | **keep** | D112 | 1 | components/dialogs/DialogueV2CatalogueContainer.tsx:150 | phraseman://dialogue_v2_memory |
| `/dialogue_v2_session` | app/dialogue_v2_session.tsx | Диалоги V2 | **keep** | D112 | 1 | app/dialogue_v2_briefing.tsx:190 | phraseman://dialogue_v2_session |
| `/dialogue_v2_visual_fixture` | app/dialogue_v2_visual_fixture.tsx | Диалоги V2 | **archive** | dev-фикстура (__DEV__), без входа | 0 | нет (корень/табы/динамический путь) | phraseman://dialogue_v2_visual_fixture |
| `/exam` | app/exam.tsx | learning_v1 | **keep** | реестр 24.09 (keep) | 5 | app/diagnostic_test.tsx:1564<br>app/navigation_back.ts:133 | phraseman://exam |
| `/flashcards` | app/flashcards.tsx | flashcards | **keep** | реестр 24.09 (keep) | 37 | app/(tabs)/home.tsx:3151<br>app/community_pack_create.tsx:902 | phraseman://flashcards |
| `/flashcards_audio` | app/flashcards_audio.tsx | карточки | **archive** | редирект на /flashcards (старые ссылки) | 0 | нет (корень/табы/динамический путь) | phraseman://flashcards_audio |
| `/flashcards_blitz_session` | app/flashcards_blitz_session.tsx | flashcards | **keep** | реестр 24.09 (keep) | 8 | app/flashcards/tabbar_state.ts:232<br>app/flashcards/training_entry.ts:14 | phraseman://flashcards_blitz_session |
| `/flashcards_card_editor` | app/flashcards_card_editor.tsx | flashcards | **keep** | реестр 24.09 (keep) | 5 | app/flashcards/tabbar_state.ts:252<br>app/flashcards_collection.tsx:819 | phraseman://flashcards_card_editor |
| `/flashcards_collection` | app/flashcards_collection.tsx | flashcards | **keep** | реестр 24.09 (keep) | 17 | app/community_pack_create.tsx:901<br>app/flashcards/FlashcardsCategoryHub.tsx:590 | phraseman://flashcards_collection |
| `/flashcards_market_dev` | app/flashcards_market_dev.tsx | flashcards | **keep** | реестр 24.09 (keep) | 1 | components/dev/motion_showcase/sections/screens_flashcards.ts:19 | phraseman://flashcards_market_dev |
| `/flashcards_my_packs` | app/flashcards_my_packs.tsx | flashcards | **keep** | реестр 24.09 (keep) | 8 | app/flashcards/FlashcardsCategoryHub.tsx:943<br>app/flashcards/FlashcardsHubScreen.tsx:607 | phraseman://flashcards_my_packs |
| `/flashcards_packs` | app/flashcards_packs.tsx | flashcards | **keep** | реестр 24.09 (keep) | 7 | app/flashcards/FlashcardsHubScreen.tsx:610<br>app/flashcards/FlashcardsHubScreen.tsx:644 | phraseman://flashcards_packs |
| `/flashcards_recall_session` | app/flashcards_recall_session.tsx | flashcards | **keep** | реестр 24.09 (keep) | 2 | app/flashcards/training_entry.ts:17<br>app/flashcards/training_entry.ts:47 | phraseman://flashcards_recall_session |
| `/flashcards_speaking_session` | app/flashcards_speaking_session.tsx | flashcards | **keep** | реестр 24.09 (keep) | 7 | app/flashcards/tabbar_state.ts:201<br>app/flashcards/training_entry.ts:15 | phraseman://flashcards_speaking_session |
| `/flashcards_swipe` | app/flashcards_swipe.tsx | flashcards | **keep** | реестр 24.09 (keep) | 9 | app/feature_intro_copy.ts:16<br>app/flashcards/tabbar_state.ts:198 | phraseman://flashcards_swipe |
| `/flashcards_training_setup` | app/flashcards_training_setup.tsx | flashcards | **keep** | реестр 24.09 (keep) | 10 | app/feature_intro_training_copy.ts:10<br>app/feature_intro_training_copy.ts:24 | phraseman://flashcards_training_setup |
| `/flashcards_truefalse_session` | app/flashcards_truefalse_session.tsx | карточки | **keep** | режим тренировки карточек | 6 | app/flashcards/training_entry.ts:16<br>app/flashcards/training_entry.ts:49 | phraseman://flashcards_truefalse_session |
| `/flashcards_video_packs` | app/flashcards_video_packs.tsx | flashcards | **keep** | реестр 24.09 (keep) | 2 | app/flashcards/FlashcardsHubScreen.tsx:654<br>app/lingman_videos.tsx:373 | phraseman://flashcards_video_packs |
| `/flashcards_voice_picker` | app/flashcards_voice_picker.tsx | flashcards | **keep** | реестр 24.09 (keep) | 3 | app/navigation_back.ts:91<br>app/settings_edu.tsx:351 | phraseman://flashcards_voice_picker |
| `/hint` | app/hint.tsx | learning_v1 | **keep** | реестр 24.09 (keep) | 5 | app/lesson1.tsx:1528<br>app/lesson_menu.tsx:1146 | phraseman://hint |
| `/index` | app/index.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 0 | нет (корень/табы/динамический путь) | phraseman://index |
| `/language_welcome` | app/language_welcome.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 4 | app/navigation_back.ts:259<br>components/dev/motion_showcase/sections/screens_profile.tsx:129 | phraseman://language_welcome |
| `/learning-v2/course` | app/learning-v2/course.tsx | learning_v2 | **redesign** | реестр 24.09 (redesign) | 8 | app/learning-v2/lesson/[id].tsx:1119<br>app/learning-v2/session/[id].tsx:1299 | phraseman://learning-v2/course |
| `/learning-v2/intro-reader-fixture` | app/learning-v2/intro-reader-fixture.tsx | dev-инструменты | **archive** | dev-фикстура интро-ридера | 0 | нет (корень/табы/динамический путь) | phraseman://learning-v2/intro-reader-fixture |
| `/learning-v2/lesson/[id]` | app/learning-v2/lesson/[id].tsx | learning_v2 | **redesign** | реестр 24.09 (redesign) | 0 | нет (корень/табы/динамический путь) | phraseman://learning-v2/lesson/[id] |
| `/learning-v2/session/[id]` | app/learning-v2/session/[id].tsx | learning_v2 | **redesign** | реестр 24.09 (redesign) | 6 | app/(tabs)/lessons.tsx:3487<br>app/learning-v2/lesson/[id].tsx:1072 | phraseman://learning-v2/session/[id] |
| `/learning_v2_authoring_preview` | app/learning_v2_authoring_preview.tsx | learning_v2 | **redesign** | реестр 24.09 (redesign) | 2 | app/learning_v2_direct_session_player_v1.tsx:369<br>app/native_runtime_capability.ts:31 | phraseman://learning_v2_authoring_preview |
| `/learning_v2_direct_session_player_v1` | app/learning_v2_direct_session_player_v1.tsx | learning_v2 | **redesign** | реестр 24.09 (redesign) | 3 | app/session_attempts/session_attempts_registry.ts:10<br>app/session_attempts/session_attempts_registry.ts:69 | phraseman://learning_v2_direct_session_player_v1 |
| `/learning_v2_modes_showcase` | app/learning_v2_modes_showcase.tsx | dev-инструменты | **archive** | production-safe gate витрины 7 режимов V2 | 0 | нет (корень/табы/динамический путь) | phraseman://learning_v2_modes_showcase |
| `/learning_v2_modes_showcase_run/[family]` | app/learning_v2_modes_showcase_run/[family].tsx | dev-инструменты | **archive** | запуск режима из dev-витрины | 0 | нет (корень/табы/динамический путь) | phraseman://learning_v2_modes_showcase_run/[family] |
| `/learning_v2_session_intro` | app/learning_v2_session_intro.tsx | learning_v2 | **redesign** | реестр 24.09 (redesign) | 1 | components/dev/motion_showcase/sections/screens_learn.ts:33 | phraseman://learning_v2_session_intro |
| `/learning_v2_session_intro_check` | app/learning_v2_session_intro_check.tsx | learning_v2 | **redesign** | реестр 24.09 (redesign) | 1 | components/dev/motion_showcase/sections/screens_learn.ts:34 | phraseman://learning_v2_session_intro_check |
| `/lesson1` | app/lesson1.tsx | learning_v1 | **keep** | реестр 24.09 (keep) | 10 | app/combined_lesson_pick.tsx:80<br>app/lesson_complete.tsx:1145 | phraseman://lesson1 |
| `/lesson_complete` | app/lesson_complete.tsx | learning_v1 | **keep** | реестр 24.09 (keep) | 6 | app/lesson1.tsx:3211<br>app/lesson1.tsx:3239 | phraseman://lesson_complete |
| `/lesson_help` | app/lesson_help.tsx | learning_v1 | **keep** | реестр 24.09 (keep) | 5 | app/lesson1.tsx:1528<br>app/lesson_menu.tsx:1149 | phraseman://lesson_help |
| `/lesson_intro_screens` | app/lesson_intro_screens.tsx | learning_v1 | **keep** | реестр 24.09 (keep) | 1 | components/dev/motion_showcase/sections/screens_learn.ts:20 | phraseman://lesson_intro_screens |
| `/lesson_irregular_verbs` | app/lesson_irregular_verbs.tsx | learning_v1 | **keep** | реестр 24.09 (keep) | 8 | app/lesson_menu.tsx:1027<br>app/lesson_verbs.tsx:16 | phraseman://lesson_irregular_verbs |
| `/lesson_menu` | app/lesson_menu.tsx | learning_v1 | **keep** | реестр 24.09 (keep) | 17 | app/(tabs)/home.tsx:3666<br>app/(tabs)/home.tsx:4142 | phraseman://lesson_menu |
| `/lesson_theory_v2` | app/lesson_theory_v2.tsx | learning_v1 | **keep** | реестр 24.09 (keep) | 1 | components/dev/motion_showcase/sections/screens_learn.ts:18 | phraseman://lesson_theory_v2 |
| `/lesson_verbs` | app/lesson_verbs.tsx | learning_v1 | **keep** | реестр 24.09 (keep) | 1 | components/dev/motion_showcase/sections/screens_learn.ts:17 | phraseman://lesson_verbs |
| `/lesson_words` | app/lesson_words.tsx | learning_v1 | **keep** | реестр 24.09 (keep) | 8 | app/lesson_menu.tsx:952<br>app/navigation_back.ts:141 | phraseman://lesson_words |
| `/lessons_list` | app/lessons_list.tsx | learning_v1 | **keep** | реестр 24.09 (keep) | 39 | app/(tabs)/home.tsx:3129<br>app/ai_companion_session.tsx:360 | phraseman://lessons_list<br>push-уведомление |
| `/level_exam` | app/level_exam.tsx | Learning V1 | **keep** | D72/D121: экзамены | 3 | app/(tabs)/lessons.tsx:4414<br>app/navigation_back.ts:234 | phraseman://level_exam |
| `/lingman_playlist` | app/lingman_playlist.tsx | видео | **keep** | D50/D132 | 2 | app/lingman_videos.tsx:290<br>components/dev/motion_showcase/sections/screens_learn.ts:37 | phraseman://lingman_playlist |
| `/lingman_videos` | app/lingman_videos.tsx | видео | **keep** | D50/D132: лента видео | 10 | app/(tabs)/home.tsx:3892<br>app/feature_intro_sections_copy.ts:61 | phraseman://lingman_videos<br>push-уведомление |
| `/manage_subscription` | app/manage_subscription.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 8 | app/(tabs)/settings.tsx:866<br>app/navigation_back.ts:80 | phraseman://manage_subscription<br>push-уведомление |
| `/mistake_detail` | app/mistake_detail.tsx | mistakes | **keep** | реестр 24.09 (keep) | 1 | app/mistakes_list.tsx:92 | phraseman://mistake_detail |
| `/mistake_practice_session` | app/mistake_practice_session.tsx | mistakes | **keep** | реестр 24.09 (keep) | 9 | app/learning-v2/lesson/[id].tsx:1279<br>app/mistakes_hub.tsx:191 | phraseman://mistake_practice_session |
| `/mistakes_hub` | app/mistakes_hub.tsx | mistakes | **keep** | реестр 24.09 (keep) | 3 | app/(tabs)/home.tsx:3081<br>app/learning_v2_direct_session_player_v1.tsx:2422 | phraseman://mistakes_hub |
| `/mistakes_list` | app/mistakes_list.tsx | mistakes | **keep** | реестр 24.09 (keep) | 2 | app/mistakes_hub.tsx:196<br>app/mistake_detail.tsx:118 | phraseman://mistakes_list |
| `/motion_showcase` | app/motion_showcase.tsx | dev-инструменты | **archive** | production-safe gate, dev-витрина | 1 | app/navigation_back.ts:263 | phraseman://motion_showcase |
| `/pack_opening` | app/pack_opening.tsx | gifts_spins_chests | **remove** | реестр 24.09 (remove) | 4 | app/flashcards_target_gate.ts:70<br>app/navigation_back.ts:142 | phraseman://pack_opening |
| `/phrase_analytics_screen` | app/phrase_analytics_screen.tsx | статистика (Premium) | **needs-owner-decision** | ВОПРОС: «Аналитика ошибок» (Premium) не имеет входа из приложения — только из DEV-витрины. Вернуть вход, оставить скрытым (archive) или удалить? | 3 | app/navigation_back.ts:238<br>app/_pos_analytics_audit.tsx:146 | phraseman://phrase_analytics_screen |
| `/pos_analytics_audit` | app/pos_analytics_audit.tsx | dev-инструменты | **archive** | production-safe gate, dev-аудит | 1 | app/navigation_back.ts:240 | phraseman://pos_analytics_audit |
| `/premium_modal` | app/premium_modal.tsx | монетизация | **keep** | один пейвол Plus за диспетчером (владелец 2026-09-30) | 51 | app/(tabs)/friends.tsx:2231<br>app/(tabs)/home.tsx:2697 | phraseman://premium_modal<br>push-уведомление |
| `/premium_modal_v2` | app/premium_modal_v2.tsx | монетизация | **archive** | редирект на /premium_modal | 1 | app/navigation_back.ts:102 | phraseman://premium_modal_v2 |
| `/preposition_drill` | app/preposition_drill.tsx | learning_v1 | **keep** | реестр 24.09 (keep) | 4 | app/lesson_menu.tsx:1091<br>app/navigation_back.ts:231 | phraseman://preposition_drill |
| `/privacy_screen` | app/privacy_screen.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 3 | app/navigation_back.ts:256<br>app/privacy_settings.tsx:330 | phraseman://privacy_screen |
| `/privacy_settings` | app/privacy_settings.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 4 | app/(tabs)/settings.tsx:1312<br>app/ai_dialog_consent_gate.tsx:142 | phraseman://privacy_settings |
| `/promo_code_entry` | app/promo_code_entry.tsx | монетизация | **keep** | PM-221-A2: покупки/промокоды — защищённый домен | 4 | app/(tabs)/settings.tsx:1082<br>app/(tabs)/settings.tsx:1109 | phraseman://promo_code_entry |
| `/referrals` | app/referrals.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 7 | app/(tabs)/settings.tsx:1113<br>app/(tabs)/settings.tsx:1147 | phraseman://referrals |
| `/runes_wallet` | app/runes_wallet.tsx | runes_to_coins | **redesign** | реестр 24.09 (redesign) | 3 | app/(tabs)/home.tsx:4006<br>app/navigation_back.ts:85 | phraseman://runes_wallet |
| `/settings_edu` | app/settings_edu.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 5 | app/(tabs)/settings.tsx:1179<br>app/flashcards_voice_picker.tsx:155 | phraseman://settings_edu |
| `/settings_language` | app/settings_language.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 3 | app/(tabs)/settings.tsx:1047<br>app/language_welcome.tsx:143 | phraseman://settings_language |
| `/settings_notifications` | app/settings_notifications.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 3 | app/(tabs)/settings.tsx:1189<br>app/survey_client.ts:29 | phraseman://settings_notifications |
| `/settings_themes` | app/settings_themes.tsx | темы | **redesign** | D38: темы остаются (удаляются только ассеты), темы 2.0 | 3 | app/(tabs)/settings.tsx:1237<br>app/survey_client.ts:28 | phraseman://settings_themes |
| `/shards_shop` | app/shards_shop.tsx | монетизация | **archive** | PM-057/PM-060: редирект старых ссылок магазина жемчуга | 4 | app/flashcards_target_gate.ts:70<br>app/navigation_back.ts:81 | phraseman://shards_shop |
| `/shop` | app/shop.tsx | монетизация | **remove** | D09/D70/D102: dev-магазин спинов/косметики за жемчуг, входа из приложения нет — кандидат на удаление | 2 | app/navigation_back.ts:84<br>app/_layout.tsx:2891 | phraseman://shop |
| `/streak_stats` | app/streak_stats.tsx | streak | **keep** | реестр 24.09 (keep) | 7 | app/(tabs)/home.tsx:3397<br>app/(tabs)/home.tsx:3630 | phraseman://streak_stats |
| `/support_report` | app/support_report.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 5 | app/(tabs)/settings.tsx:1337<br>app/manage_subscription.tsx:668 | phraseman://support_report |
| `/survey_screen` | app/survey_screen.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 2 | app/navigation_back.ts:92<br>components/dev/motion_showcase/sections/screens_profile.tsx:126 | phraseman://survey_screen |
| `/terms_screen` | app/terms_screen.tsx | приложение (общая инфраструктура) | **keep** | реестр 24.09 (keep) | 3 | app/navigation_back.ts:257<br>app/privacy_settings.tsx:342 | phraseman://terms_screen |
| `/v2_kit_preview` | app/v2_kit_preview.tsx | dev-инструменты | **archive** | витрина только для разработки | 0 | нет (корень/табы/динамический путь) | phraseman://v2_kit_preview |

## Маршруты из реестра 24.09, файлов которых больше нет (49)

| Маршрут | Что получает старая ссылка |
|---|---|
| `/ai_dialog_tutor_session` | +not-found |
| `/arena_friend_duel` | +native-intent → /home (D83) |
| `/arena_history` | +native-intent → /home (D83) |
| `/arena_invite` | +native-intent → /home (D83) |
| `/arena_match` | +native-intent → /home (D83) |
| `/arena_matchmaking` | +native-intent → /home (D83) |
| `/arena_ranks` | +native-intent → /home (D83) |
| `/arena_results` | +native-intent → /home (D83) |
| `/arena_review` | +native-intent → /home (D83) |
| `/arena_season_pass` | +native-intent → /home (D83) |
| `/arena_star_wallet` | +native-intent → /home (D83) |
| `/arena_today` | +native-intent → /home (D83) |
| `/arena_tops` | +native-intent → /home (D83) |
| `/avatar_dna_studio` | +not-found |
| `/avatar_select` | +not-found |
| `/club_screen` | +not-found |
| `/coin_exchange` | +not-found |
| `/ideas_catalog` | +not-found |
| `/ideas_submit` | +not-found |
| `/league_screen` | +not-found |
| `/level_gifts_inventory` | +not-found |
| `/level_reward_spin` | +not-found |
| `/max_call_prestart` | +not-found |
| `/max_call_session` | +not-found |
| `/max_lessons` | +not-found |
| `/max_memory_settings` | +not-found |
| `/max_paywall` | +not-found |
| `/max_voice_review` | +not-found |
| `/modal` | +native-intent |
| `/paywall_a` | +native-intent → /premium_modal |
| `/paywall_b` | +native-intent → /premium_modal |
| `/paywall_c` | +native-intent → /premium_modal |
| `/paywall_d` | +native-intent → /premium_modal |
| `/paywall_e` | +native-intent → /premium_modal |
| `/paywall_f` | +native-intent → /premium_modal |
| `/paywall_g` | +native-intent → /premium_modal |
| `/personal_plan` | +not-found |
| `/personal_plan_complete` | +not-found |
| `/personal_plan_dev` | +not-found |
| `/personal_plan_exercise` | +not-found |
| `/personal_plan_exercise_transition` | +not-found |
| `/personal_plan_quiz` | +not-found |
| `/personal_plan_runtime_dev` | +not-found |
| `/personal_plan_setup` | +not-found |
| `/personal_plan_stats_screen` | +not-found |
| `/personal_plan_task_done` | +not-found |
| `/personal_plan_thank_you` | +not-found |
| `/personal_plan_theory` | +not-found |
| `/season_pass` | +not-found |

## Открытые вопросы владельцу (1)

- `/phrase_analytics_screen`: ВОПРОС: «Аналитика ошибок» (Premium) не имеет входа из приложения — только из DEV-витрины. Вернуть вход, оставить скрытым (archive) или удалить?

## Статус remove, файл ещё в дереве (2) — кандидаты на удаление

- `/pack_opening` (app/pack_opening.tsx): реестр 24.09 (remove)
- `/shop` (app/shop.tsx): D09/D70/D102: dev-магазин спинов/косметики за жемчуг, входа из приложения нет — кандидат на удаление
