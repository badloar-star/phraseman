# COVERAGE — полная опись видимого в PhraseMan (для сессии интерфейса)

> Источники: `app/**/*.{ts,tsx}` (139 маршрутов из `docs/phraseman-2.0/registries/screen_inventory.json`,
> аудит на `385daed73`), `docs/phraseman-2.0/docs/REMOVAL.md`, `docs/phraseman-2.0/docs/NAVIGATION.md`,
> `docs/phraseman-2.0/03_DECISIONS.md` + `PROGRESS.md` (решения D01–D65, 2026-09-24), прямой grep по
> `components/**` и `app/**` на `<Modal`, `Sheet`, `Toast`, `Banner`, `Celebration`, confetti и т.п.
>
> Колонка **2.0**: `оставить` / `удаляется (причина)` / `консервация` (код жив, вне релиза) / `редизайн`
> (логика остаётся, макет меняется) / `уточнить владельцу` (открытый вопрос D04/D13/D16/D18/D21/D23/D27
> и т.п.) / `вне работы` (владелец запретил трогать — Главная и онбординг).
> Колонка **Макет** — пусто, заполняет сессия интерфейса (`docs/design/v2-app/AGENT_BRIEF.md`).
>
> **Вне работы (не включено в опись):** `app/(tabs)/home.tsx` и всё дерево Главной
> (components/home/**, components/home/v2/**) — владелец запретил трогать; экраны онбординга
> (`components/CleanOnboarding.tsx`, `components/onboarding.tsx`, `components/onboarding_aha/**`,
> `app/language_welcome.tsx` как часть онбординга) — тоже вне этой описи по прямому указанию.
> `app/language_welcome.tsx` всё же перечислен ниже (раздел Профиль/Настройки), так как он используется
> ПОВТОРНО как обычный экран смены языка из настроек, не только при первом входе.

## Итоговые числа

| Раздел | Оставить/редизайн | Удаляется | Консервация | Уточнить |
|---|---|---|---|---|
| Обучение V1 (LRN) | 17 | 0 | 0 | 1 |
| Learning V2 (LV2) | 0 | 0 | 0 | 9 (redesign) |
| Карточки (CARD) | 14 | 2 | 0 | 0 |
| Диалоги (DLG) | 6 | 0 | 0 | 0 |
| Видео (VID) | 2 | 0 | 0 | 0 |
| Сообщество/Друзья/Шпиль (COM) | 6 | 12 | 0 | 3 |
| Профиль/Настройки/Аккаунт (PRF) | 13 | 5 | 0 | 6 |
| Результаты/Достижения/Ошибки/Серия (RES) | 10 | 4 | 0 | 1 |
| Монеты/Ранги/Plus/Пейволлы (PAY) | 5 | 3 | 6 (Max) | 9 |
| Системные окна/уведомления/обновления (SYS) | 11 | 0 | 0 | 0 |
| Таббар/навигация (NAV) | 3 | 2 | 0 | 0 |

Всего пунктов в описи: 156 (в таблицах с ID) + ~140 дополнительных вспомогательных
модалок/шторок/тостов/анимаций, перечисленных внутри строк таблиц («компонент», «модалка»,
«анимация» без отдельного ID) и в разделах «Компоненты, требующие отдельного внимания» /
«Дополнения». Из реестра 139 маршрутов покрыты все.

---

## 1. Обучение V1 (LRN) — `learning_v1`, D12 OWNER_FINAL: сохраняется, первые 3 урока открыты

| ID | Тип | Что видит пользователь | Файл | 2.0 | Макет |
|---|---|---|---|---|---|
| LRN-01 | экран | Список уроков V1 | `app/lessons_list.tsx` | оставить | |
| LRN-02 | экран | Меню урока (выбор режима: слова/грамматика/подсказка) | `app/lesson_menu.tsx` | оставить | |
| LRN-03 | экран | Урок — основной тренажёр (сборка фразы, выбор, ввод) | `app/lesson1.tsx` | оставить | |
| LRN-04 | экран | Слова урока (карточки новых слов) | `app/lesson_words.tsx` | оставить | |
| LRN-05 | экран | Неправильные глаголы (тренажёр) | `app/lesson_irregular_verbs.tsx` | оставить | |
| LRN-06 | экран | Экран теории (грамматика простым языком) | `app/lesson_theory_v2.tsx` | оставить | |
| LRN-07 | экран | Список неправильных глаголов (справка) | `app/lesson_verbs.tsx` | оставить | |
| LRN-08 | экран | Подсказка/помощь по уроку | `app/lesson_help.tsx` | оставить | |
| LRN-09 | экран | Тренажёр предлогов | `app/preposition_drill.tsx` | оставить | |
| LRN-10 | экран | Итог урока (результат, звёзды, «дальше») | `app/lesson_complete.tsx` | оставить (D64.1: заменить XP на анимированные монеты, общий макет итога со всеми режимами) | |
| LRN-11 | экран | Вводные интро-страницы урока (карусель до старта) | `app/lesson_intro_screens.tsx` | оставить | |
| LRN-12 | экран | Комбинированный выбор урока (два языка сразу) | `app/combined_lesson_pick.tsx` | оставить | |
| LRN-13 | экран/состояние | Разбор комбинированного урока (детали смешанного прогресса) | `components/CombinedLessonBreakdown.tsx` | оставить | |
| LRN-14 | экран | Диагностический тест (определение уровня) | `app/diagnostic_test.tsx` | оставить | |
| LRN-15 | экран | Экзамен по итогам курса/уровня | `app/exam.tsx` | оставить | |
| LRN-16 | экран | Экзамен на уровень (отдельный from lessons) | `app/level_exam.tsx` | уточнить владельцу (в реестре decision=unknown, не привязан к фиче; логика звёзд D36 применяется — вероятно оставить) | |
| LRN-17 | экран | Компонент экзамена V2 (общий движок вопросов) | `components/level-exam/LevelExamV2.tsx` + `LevelExamIntro.tsx`, `LevelExamCountdown.tsx`, `LevelExamTimer.tsx`, `LevelExamQuestionFrame.tsx`, `LevelExamResult.tsx`, `ContextChoiceQuestion.tsx`, `PhraseBuilderQuestion.tsx`, `SpeedMatchQuestion.tsx` | оставить (обслуживает LRN-16) | |
| — | модалка | Разбор ошибки/подсказка «Объясни проще» | `components/MistakeEli5Modal.tsx` / `MistakeEli5ModalHybrid.tsx` | оставить (используется из мест ошибок/уроков) | |
| — | шторка | Теория помощи (текст + иллюстрация) | `components/lesson_help_theory_data.tsx`, `lesson_help_theory_ui.tsx`, `lesson_intro_rich.tsx` | оставить | |
| — | анимация | Молния «мало энергии» на уроке | `components/LessonEnergyLightning.tsx` | уточнить (энергетическая механика жива — D06/D07, но ценники сняты PM-086; проверить актуальность визуала) | |
| — | состояние | Скелетон загрузки урока | `components/LessonLoadingSkeleton.tsx` | оставить | |

## 2. Learning V2 (LV2) — `learning_v2`, D14 LATER: поздний этап, редизайн всех экранов

| ID | Тип | Что видит пользователь | Файл | 2.0 | Макет |
|---|---|---|---|---|---|
| LV2-01 | экран | Карта курса (узлы, прогресс) | `app/learning-v2/course.tsx` | редизайн | |
| LV2-02 | экран | Урок V2 (обёртка перед сессией) | `app/learning-v2/lesson/[id].tsx` | редизайн | |
| LV2-03 | экран | Сессия V2 (сам тренажёр: слушай/пиши/выбери) | `app/learning-v2/session/[id].tsx` | редизайн | |
| LV2-04 | экран/dev | Витрина авторского режима (preview) | `app/learning_v2_authoring_preview.tsx`, `app/learning-v2/intro-reader-fixture.tsx` | редизайн (или dev-only, уточнить нужен ли в релизе) | |
| LV2-05 | экран/dev | Прямой плеер сессии (v1, диагностика) | `app/learning_v2_direct_session_player_v1.tsx` | редизайн/dev-only | |
| LV2-06 | экран/dev | Витрина режимов V2 (все типы заданий подряд) | `app/learning_v2_modes_showcase.tsx`, `app/learning_v2_modes_showcase_run/[family].tsx` | редизайн/dev-only | |
| LV2-07 | экран | Интро сессии (перед стартом) + чек интро | `app/learning_v2_session_intro.tsx`, `app/learning_v2_session_intro_check.tsx` | редизайн | |
| LV2-08 | модалка | Founder Pass / ранний доступ V2 | `components/learning-v2/LearningV2FounderPassModal.tsx` | уточнить владельцу (пробные 10 сессий D14 — открыто) | |
| LV2-09 | шторка/оверлей | Словарь урока (новое слово, встреченное в тексте) | `components/learning-v2/LearningV2LessonDictionaryOverlayV1.tsx`, `LearningV2NewWordEncounterOverlay.tsx`, `LearningV2WordPocketOverlayV1.tsx` | редизайн | |
| — | шторка | Итог сессии V2 (финал, что выучено) | `components/LearningV2SessionOutcomeSheet.tsx`, `LearningV2SessionFinale.tsx`, `LearningV2CheckpointOutcome.tsx`, `LearningV2CheckpointSeal.tsx` | редизайн (D64.1 общий макет итога) | |
| — | анимация | Полёт руны/награды по карте курса | `components/LearningV2RuneFlight.tsx` | редизайн (руны→монеты D03) | |
| — | компонент | Узел карты, инлайн-раскрытие узла, варианты ответа | `components/LearningV2MapNode.tsx`, `LearningV2InlineNodeReveal.tsx`, `LearningV2AnswerChoice.tsx` | редизайн | |

Примечание: скачивание озвучки V2 полностью удалено (D47, PM-206/219d80a72) — сама возможность
заниматься V2 остаётся, но экраны/настройки загрузки пакета озвучки в описи ниже не перечисляются
как отдельные пункты интерфейса (их больше нет).

## 3. Карточки (CARD) — `flashcards`, D12/D35: остаются, лимит 3 набора Free

| ID | Тип | Что видит пользователь | Файл | 2.0 | Макет |
|---|---|---|---|---|---|
| CARD-01 | экран | Хаб карточек (стартовый экран раздела) | `app/flashcards/FlashcardsHubScreen.tsx`, роут `app/flashcards.tsx` | оставить | |
| CARD-02 | экран | Категории карточек | `app/flashcards/FlashcardsCategoryHub.tsx` | оставить | |
| CARD-03 | экран | Коллекция набора (список карточек внутри набора) | `app/flashcards_collection.tsx` | оставить | |
| CARD-04 | экран | Редактор карточки | `app/flashcards_card_editor.tsx` | оставить | |
| CARD-05 | экран | Мои наборы | `app/flashcards_my_packs.tsx` | оставить (D91-098: список вместо плиток уже сделан) | |
| CARD-06 | экран | Каталог наборов (сообщество) | `app/flashcards_packs.tsx` | оставить | |
| CARD-07 | экран | Тренировка «Блиц» | `app/flashcards_blitz_session.tsx` | оставить | |
| CARD-08 | экран | Тренировка «Вспомни и напиши» | `app/flashcards_recall_session.tsx` | оставить | |
| CARD-09 | экран | Тренировка «Устно» (речь) | `app/flashcards_speaking_session.tsx` | оставить | |
| CARD-10 | экран | Тренировка «Свайп» (карточка вправо/влево) | `app/flashcards_swipe.tsx` | оставить | |
| CARD-11 | экран | Настройка тренировки (выбор режима/набора) | `app/flashcards_training_setup.tsx` | оставить | |
| CARD-12 | экран | Наборы из видео | `app/flashcards_video_packs.tsx`, `app/flashcards_audio.tsx` + новые `app/flashcards/PackVideoHero.tsx`, `app/flashcards/VideoPackRow.tsx`, `app/flashcards_video_packs.tsx` (в разработке, из git-статуса) | оставить | |
| CARD-13 | экран | Выбор голоса озвучки карточек | `app/flashcards_voice_picker.tsx` | оставить | |
| CARD-14 | экран/dev | Витрина маркетплейса (dev) | `app/flashcards_market_dev.tsx` | оставить (dev-инструмент) | |
| CARD-15 | экран | Создание набора сообщества | `app/community_pack_create.tsx` | оставить | |
| CARD-16 | шторка | Выбор набора (при добавлении карточки/тренировке) | `app/flashcards/DeckPickerSheet.tsx` | оставить | |
| CARD-17 | шторка | Выбор режима тренировки | `app/flashcards/FlashcardsTrainingModeSheet.tsx` | оставить | |
| CARD-18 | модалка | Пейволл покупки набора за осколки | `app/flashcards/CardPackShardPaywallModal.tsx`, `app/flashcards/useCardPackShardPaywall.tsx` | удаляется (осколки/жемчуг уходят D15/D57; заменить на монетную покупку или Plus-гейт) | |
| CARD-19 | модалка | Открытие набора-«пака» (анимация, как лутбокс) | `app/pack_opening.tsx` | удаляется (`gifts_spins_chests`, D09) | |
| CARD-20 | шторка | Выбор языка колоды | `app/flashcards/PackLanguagePicker.tsx` | оставить | |
| CARD-21 | шторка | Заголовок коллекции (доп. действия) | `app/flashcards/CollectionHeader.tsx` | оставить | |
| CARD-22 | тост | Карточка сохранена / добавлена | `components/SaveToCardsButton.tsx`, `components/SavedCardsFlight.tsx`, `components/AddToFlashcard.tsx` | оставить (полёт карточки — анимация полезной обратной связи, не награда) | |
| CARD-23 | модалка | Жалоба на набор | `app/community_packs/ReportCommentModal.tsx`, `components/ReportPackModal.tsx` | оставить (D20: жалоба флагом) | |
| CARD-24 | шторка | Комментарии к набору | `app/community_packs/PackCommentsSheet.tsx` | оставить | |

## 4. Диалоги (DLG) — `ai_dialogs`, доступ по рангу монеты вместо Plus/рун (D05, открыто)

| ID | Тип | Что видит пользователь | Файл | 2.0 | Макет |
|---|---|---|---|---|---|
| DLG-01 | экран | Хаб диалогов (выбор собеседника/сценария) | `app/ai_dialog_home.tsx`, `components/DialogsTabContent.tsx` | уточнить владельцу (D05: порог ранга монеты вместо уровня/Plus не утверждён) | |
| DLG-02 | экран | Брифинг перед диалогом (описание сценария) | `app/ai_dialog_briefing.tsx` | уточнить владельцу (тот же D05) | |
| DLG-03 | экран | Сама сессия диалога (чат с ИИ) | `app/ai_dialog_session.tsx`, `app/ai_companion_session.tsx` | уточнить владельцу | |
| DLG-04 | экран | Наставник/репетитор — отдельный формат сессии | `app/ai_dialog_tutor_session.tsx`, `components/dialogs/TutorBoard.tsx`, `TutorHubPoster.tsx`, `TutorTopicPicker.tsx` | уточнить владельцу | |
| DLG-05 | экран/шторка | Согласие на диалоги (первый вход, приватность) | `app/ai_dialog_consent_gate.tsx`, `components/AiDialogConsentModal.tsx`, `components/AiConsentSheetModal.tsx`, `AiConsentSheetModalHybrid.tsx` | оставить (обязательное согласие) | |
| DLG-06 | шторки | Разбор фразы, «почему так», подсказка «как сказать» | `components/dialogs/DialogPhraseReview.tsx`, `DialogWhySheet.tsx`, `DialogHowToSaySheet.tsx`, `DialogGoalsSheet.tsx`, `DialogHelperRow.tsx`, `DialogBubbleActions.tsx` | оставить | |
| — | анимация | Победа в диалоге (празднование в конце сценария) | `components/DialogVictoryCelebration.tsx`, `DialogVictoryCelebrationHybrid.tsx` | оставить, но привести к общему макету итога без XP (D64.1) | |
| — | экран | Итог/вердикт диалога | `components/DialogVerdictScreen.tsx` | оставить (обновить под общий итог) | |
| — | компонент | Квота диалогов (счётчик оставшихся) | `components/DialogQuotaBadge.tsx` | уточнить (квота может быть завязана на Plus/ранг — тот же D05) | |
| — | компонент | Плитка сценария диалога | `components/DialogScenarioTile.tsx` | оставить | |

## 5. Видео (VID) — `lingman`, новая центральная вкладка «Видео» (D39, D50)

| ID | Тип | Что видит пользователь | Файл | 2.0 | Макет |
|---|---|---|---|---|---|
| VID-01 | экран | Вкладка «Видео» (лента канала + вход в наборы из видео) | `app/(tabs)/video.tsx` → `app/lingman_videos.tsx` | оставить (уже реализовано, D39/D50) | |
| VID-02 | экран | Плейлист / подборка видео | `app/lingman_playlist.tsx` | уточнить владельцу (decision=unknown в реестре; логически часть VID-01) | |
| — | компонент | Плеер видео инлайн | `components/youtube/YoutubeInlinePlayer.tsx`, `YoutubeVideoCard.tsx`, `YoutubePremiereHero.tsx` | оставить | |
| — | шторка | Выбор канала | `components/youtube/YoutubeChannelPickerSheet.tsx`, `YoutubeChannelTabs.tsx`, `YoutubeChannelHeader.tsx` | оставить | |
| — | модалка | Фразы из видео (список фраз ролика) | `components/youtube/YoutubeVideoPhrases.tsx` | оставить | |
| — | компонент | Кнопка «Видео Лингмана» (вход с других экранов) | `components/LingmanVideosButton.tsx` | оставить | |

## 6. Сообщество / Друзья / Шпиль (COM) — `league`, `arena`, D39/D54: Арена уходит, Шпиль заменяет Лигу

| ID | Тип | Что видит пользователь | Файл | 2.0 | Макет |
|---|---|---|---|---|---|
| COM-01 | экран | Вкладка «Сообщество» (переключатель Лига/Друзья/Наборы) | `app/(tabs)/community.tsx` | оставить (уже реализовано D39, коммит `bfdc8e783`) | |
| COM-02 | экран | Раздел «Лига» внутри Сообщества (боевая лига, крон жив) | `app/club_screen.tsx` | оставить (D37/D54: лига → «Шпиль» на уровне механики строится параллельно, club_screen пока живой) | |
| COM-03 | экран | Полный экран лиги (устаревший отдельный маршрут) | `app/league_screen.tsx` | уточнить владельцу (дублирует club_screen — вероятно объединить/удалить один) | |
| COM-04 | экран | Раздел «Друзья» внутри Сообщества | `app/(tabs)/friends.tsx` | оставить (переехал внутрь Сообщества по D39, сам файл остаётся как модуль) | |
| COM-05 | экран | Раздел «Наборы» внутри Сообщества | `app/flashcards_packs.tsx` (embedded режим) | оставить | |
| COM-06 | шторка | Правила лиги | `components/LeagueRulesSheet.tsx` | оставить (текст устарел — «+10 к запасу за лигу», нужно поправить под энергию 5, PM-084 хвост) | |
| COM-07 | модалка | Сундук лиги / друзей | `components/LeagueChestOpenModal.tsx`, `components/league/LeagueChestTeaserModal.tsx`, `LeagueChestScanTeaser.tsx`, `LeagueChestSlitOpen.tsx`, `LeagueChestRing.tsx`, `components/friends_together/FriendsChestModal.tsx`, `FriendsChestCard.tsx` | удаляется (сундуки лиги/друзей, D09; выдача уже выключена PM-056) | |
| COM-08 | модалка | Бонус лиги доступен (буст, множитель) | `components/LeagueBonusAvailableModal.tsx`, `components/league/LeagueBonusBeaconOrb.tsx`, `LeagueBonusMission.tsx` | удаляется (клубные/личные ускорители опыта, D58) | |
| COM-09 | анимация | Сцена соревнования лиги (гонка/анимация мест) | `components/league/LeagueCompetitionScene.tsx`, `LeagueRaceFeed.tsx` | редизайн (пьедестал топ-3 вместо 30 участников, D37) | |
| COM-10 | экран/модалка | Результат недели лиги (повышение/понижение) | `app/LeagueResultModal.tsx`, `components/league/LeagueResultHybrid.tsx` | оставить, но пересчитать метрику под монеты недели (D37) | |
| COM-11 | компонент | Строка позиции в таблице лиги | `components/league/LeagueLeaderboardRow.tsx`, `LeagueMyPositionBar.tsx`, `LeagueQuickStats.tsx` | оставить (редизайн под топ-3 + «все участники») | |
| COM-12 | экран | Дуэль с другом (Арена) | `app/arena_friend_duel.tsx` | удаляется (Арена, D10) | |
| COM-13 | экран | История матчей Арены | `app/arena_history.tsx` | удаляется (Арена) | |
| COM-14 | экран | Приглашение в Арену | `app/arena_invite.tsx` | удаляется (Арена) | |
| COM-15 | экран | Матч Арены (сам бой) | `app/arena_match.tsx` | удаляется (Арена) | |
| COM-16 | экран | Поиск соперника Арены | `app/arena_matchmaking.tsx` | удаляется (Арена) | |
| COM-17 | экран | Ранги Арены | `app/arena_ranks.tsx` | удаляется (Арена) | |
| COM-18 | экран | Результаты матча Арены | `app/arena_results.tsx` | удаляется (Арена) | |
| COM-19 | экран | Разбор матча Арены | `app/arena_review.tsx` | удаляется (Арена) | |
| COM-20 | экран | Сезонный пропуск Арены | `app/arena_season_pass.tsx`, `app/season_pass.tsx` | удаляется (Арена + сезонный пропуск, D10/D53) | |
| COM-21 | экран | Кошелёк звёзд Арены | `app/arena_star_wallet.tsx` | удаляется (Арена) | |
| COM-22 | экран | «Сегодня» в Арене (ежедневные задания) | `app/arena_today.tsx` | удаляется (Арена) | |
| COM-23 | экран | Топы Арены | `app/arena_tops.tsx` | удаляется (Арена) | |
| COM-24 | вкладка (устарела) | Старая вкладка «Арена» в таббаре | `app/(tabs)/arena.tsx`, `components/arena/ArenaHubSurface.tsx` | удаляется из таббара (D44 уже выполнено — вкладки нет в `_layout.tsx`), код консервируется (генераторы/пул заданий переиспользует Шпиль, D54) | |
| — | шторки/меню Арены (ещё ~30 доп. компонентов) | Меню режима, оверфлоу, отчёт о сопернике | `components/arena/ArenaModeSheet.tsx`, `ArenaHubOverflowSheet.tsx`, `ArenaOpponentFoundHost.tsx`, `ArenaReportOpponentButton.tsx` и ещё ~26 файлов `components/arena/*` | удаляется вместе с Ареной (UI), пул заданий/движок сохраняется законсервированным для Шпиля | |
| — | экран (в разработке, не в реестре) | «Шпиль» — новая замена Лиги/Арены | ещё не создан UI-файл (только `app/spire_config_client.ts`, `app/spire_report_client.ts`, `modules/spire/**` — движок без экрана) | новый экран, будет добавлен отдельной задачей (D54) | |

## 7. Профиль / Настройки / Аккаунт (PRF)

| ID | Тип | Что видит пользователь | Файл | 2.0 | Макет |
|---|---|---|---|---|---|
| PRF-01 | вкладка | Вкладка «Настройки» | `app/(tabs)/settings.tsx` | оставить | |
| PRF-02 | экран | Данные аккаунта | `app/account_details.tsx` | оставить | |
| PRF-03 | экран | Смена языка изучения | `app/settings_language.tsx`, `app/language_welcome.tsx` (повторный вызов) | оставить | |
| PRF-04 | экран | Настройки уведомлений | `app/settings_notifications.tsx` | оставить | |
| PRF-05 | экран | Настройки образования (уровень, цели, озвучка) | `app/settings_edu.tsx` | оставить | |
| PRF-06 | экран | Темы оформления | `app/settings_themes.tsx` | редизайн (D38/D41: темы остаются, только тёмные варианты, удаляются декоративные ассеты и покупка за жемчуг) | |
| PRF-07 | экран | Приватность (согласия, данные) | `app/privacy_screen.tsx`, `app/privacy_settings.tsx` | оставить | |
| PRF-08 | экран | Условия использования | `app/terms_screen.tsx` | оставить | |
| PRF-09 | экран | Поддержка / жалоба | `app/support_report.tsx` | оставить | |
| PRF-10 | экран | Управление подпиской | `app/manage_subscription.tsx` | оставить | |
| PRF-11 | экран | Ввод промокода | `app/promo_code_entry.tsx` | уточнить владельцу (монетизация — decision=unknown) | |
| PRF-12 | экран | Реферальная программа (рулетка) | `app/referrals.tsx` | оставить (D52: остаётся как есть) | |
| PRF-13 | экран | Опрос (survey) | `app/survey_screen.tsx`, `components/survey/SurveySheetModal.tsx` | оставить | |
| PRF-14 | экран | Достижения | `app/achievements_screen.tsx`, `components/achievements/AchievementShelfCarousel.tsx`, `AchievementCategoryDock.tsx` | уточнить владельцу (в 03_DECISIONS не упомянуто явно; тосты достижений уже упрощены PM-053/198) | |
| PRF-15 | экран | Коллекционные предметы (витрина) | `app/collectibles_screen.tsx`, `components/collectibles/CollectiblesEmptyStateMotion.tsx` | уточнить владельцу (`collectibles`, decision=unknown; вероятно часть подарков/наград — риск пересечения с D09) | |
| PRF-16 | экран | Старый редактор аватара (удалён) | `app/avatar_select.tsx` (файл физически удалён 2026-09-24, маршрут не работает) | удаляется — уже выполнено (D57, PM-061/063), кнопка на Главной ведёт в никуда, чистка на стороне интерфейса | |
| PRF-17 | экран | Студия ДНК аватара (не выпущена) | `app/avatar_dna_studio.tsx` (файл физически удалён) | удаляется — уже выполнено (D57) | |
| PRF-18 | компонент | Показ текущего аватара/монеты ранга пользователя | `components/AvatarView.tsx`, `components/AvatarAura.tsx` (упрощён до нейтральной прослойки), `components/level_up/CoinFaceArt.tsx` | редизайн (монета ранга заменяет аватар, D60/D62) | |
| PRF-19 | модалка | Смена никнейма | `components/account/NicknameEditModal.tsx` | оставить | |
| PRF-20 | шторка | Процесс выхода из аккаунта | `components/account/AccountLogoutFlow.tsx` | оставить | |
| PRF-21 | модалка | Подтверждение удаления аккаунта | `components/DeleteAccountConfirmModal.tsx` | оставить (сейчас в разработке компактной вёрстки, см. git-статус) | |
| PRF-22 | компонент/уведомление | Уведомление «аккаунт удалён» | `components/AccountDeletedNotice.tsx`, `app/account_deleted_notice.ts` | оставить | |
| PRF-23 | шторка | Выбор языка изучения (пикер) | `components/settings/StudyLanguagePicker.tsx` | оставить | |
| — | модалка | Настройки памяти MAX (консервация) | `app/max_memory_settings.tsx` | консервация (Max, D11) | |

## 8. Результаты / Достижения / Ошибки / Серия (RES)

| ID | Тип | Что видит пользователь | Файл | 2.0 | Макет |
|---|---|---|---|---|---|
| RES-01 | экран | Хаб «Мои ошибки» | `app/mistakes_hub.tsx` | оставить | |
| RES-02 | экран | Список ошибок | `app/mistakes_list.tsx` | оставить | |
| RES-03 | экран | Детали одной ошибки | `app/mistake_detail.tsx` | оставить | |
| RES-04 | экран | Тренировка по ошибкам | `app/mistake_practice_session.tsx`, `components/mistake-practice/MistakePracticeLoopNode.tsx`, `MistakeSessionFinale.tsx`, `MistakeVerdictPanel.tsx`, `MistakeTitleShelf.tsx` | оставить (итог привести к общему макету D64.1) | |
| RES-05 | экран | Статистика серии (streak) | `app/streak_stats.tsx` | оставить (D-огонь серии заменяет перо, NAVIGATION.md; дизайн стадий 0–10 дней) | |
| RES-06 | модалка | Восстановление серии | `components/StreakReviveModal.tsx` | удаляется, если восстановление «за жемчуг» (D45: все модалки «за жемчуг» удаляются) — уточнить, остаётся ли платный вариант за монеты | |
| RES-07 | тост/хост | Риск потери серии (напоминание) | `components/StreakRiskToastHost.tsx` | оставить | |
| RES-08 | компонент | Иконка звена цепочки серии | `components/StreakChainIcon.tsx` | редизайн (замена «пера» на огонь) | |
| RES-09 | экран/оверлей | Общий итог тренировки (все режимы) | новый общий компонент (ещё не выделен в отдельный файл — сейчас разные `*_complete`/`*Finale`/`*OutcomeSheet` по режимам) | редизайн — ОБЯЗАТЕЛЬНО единый макет с анимированным начислением монет вместо XP (D64.1, задача PM-137) | |
| RES-10 | анимация | Конфетти / победная вспышка на итоге | `components/feedback/ConfettiBurst.tsx`, `VictoryBurst.tsx`, `ResultsSequence.tsx`, `ProgressCompletionView.tsx`, `ProgressProofBlock.tsx` | оставить (переиспользуется общим итогом D64.1) | |
| — | тост | Достижение получено (упрощённый тост) | было `components/AchievementToast.tsx` | удалено — уже выполнено (PM-053/198, 2026-09-24) | |
| — | анимация | Печать сертификата / имя на сертификате | `components/CertificateNameModal.tsx` | уточнить владельцу (relates to achievements — не упомянуто в decisions) | |
| — | шапка | Годовое колесо активности | `components/YearWheel.tsx`, `components/ActivityHeatmap365.tsx`, `app/activity_365_analytics.ts` | оставить | |

## 9. Монеты / Ранги / Plus / Пейволлы (PAY)

| ID | Тип | Что видит пользователь | Файл | 2.0 | Макет |
|---|---|---|---|---|---|
| PAY-01 | экран | Обмен рун на монеты (переходный экран) | `app/coin_exchange.tsx` | редизайн (D03: руны→монеты, механика меняется на прямое повышение ранга) | |
| PAY-02 | экран | Кошелёк рун/монет | `app/runes_wallet.tsx`, `components/RuneBalanceChip.tsx`, `components/HomeRuneBalance.tsx` (Главная — вне работы) | редизайн (текстовая замена «руны»→«монеты», кошелёк A уже и есть монеты, D69) | |
| PAY-03 | экран | Магазин осколков (жемчуга) | `app/shards_shop.tsx` | уточнить владельцу (decision=unknown; покупка жемчуга за деньги уже отключена PM-057, экран частично мёртв) | |
| PAY-04 | экран | Общий магазин (валюты/предметы) | `app/shop.tsx` | уточнить владельцу | |
| PAY-05 | анимация | Церемония повышения ранга монеты («Монетный двор») | `components/level_up/LevelUpMintCeremony.tsx`, `CoinRankUpgradeCeremony.tsx`, `MintCoin.tsx`, `MintSceneArt.tsx`, `MintSparks.tsx` | оставить — готова, вариант B утверждён (D49/D62), не хватает только кнопки на Главной (вне этой описи) | |
| — | модалка | Инвентарь подарков за уровень | `app/level_gifts_inventory.tsx` | удаляется (`gifts_spins_chests`, D09/D65) | |
| — | модалка/экран | Розыгрыш приза (спин) за уровень | `app/level_reward_spin.tsx`, `components/LevelSpinRewardModal.tsx`, `LevelSpinRewardArt.tsx` | удаляется — уже выполнено (PM-046, 2026-09-24) | |
| — | модалка | Подарок уровня (двойной/одинарный) | `components/LevelGiftDualModal.tsx`, `LevelGiftModal.tsx`, `components/level_gift_box.tsx` | удаляется (D65: Level Gift удаляется целиком) | |
| PAY-06 | модалка | Пейволл варианты A–G (сплит-тест офферов) | `app/paywall_a.tsx` … `app/paywall_g.tsx` | уточнить владельцу (нужно решить, сколько вариантов оставить в 2.0) | |
| PAY-07 | модалка | Общая точка входа в пейволл | `app/premium_modal.tsx`, `app/premium_modal_v2.tsx` | уточнить владельцу | |
| PAY-08 | модалка | Апсейл ИИ-лимита | `components/AiLimitUpsellCard.tsx`, `SoftContextualUpsellCard.tsx` | уточнить владельцу | |
| PAY-09 | модалка | Истёк доступ (Plus закончился) | `components/EntitlementExpiredHost.tsx` | оставить | |
| PAY-10 | оверлей | Блюр статистики для Free (призыв купить Plus) | `components/StatsPremiumBlur.tsx` | оставить | |
| PAY-11 | значок | Значок PRO/Plus рядом с именем | `components/PlusBadge.tsx`, `PremiumGoldButton.tsx`, `PremiumGoldUserName.tsx`, `PremiumAvatarHalo.tsx`, `VipGreenUserName.tsx` | оставить (часть — редизайн под монетный стиль) | |
| PAY-12 | анимация | Празднование первой покупки Plus | `components/FirstPurchaseSealCelebration.tsx`, `components/PremiumCelebrationModal.tsx`, `components/premium_celebration/CelebrationSceneViews.tsx` | оставить | |
| PAY-13 | анимация | VIP-праздник (крупная покупка) | `components/VipCelebrationModal.tsx`, `VipSurveyModal.tsx`, `VipSurveyReviewPromptModal.tsx` | уточнить владельцу | |
| — | экран (консервация) | Вход в звонок Max (голосовой ассистент) | `app/max_call_prestart.tsx` | консервация (D11, MAX_SECTION_SEALED_BY_OWNER_2026_09_04 — НЕ восстанавливать без прямой команды владельца) | |
| — | экран (консервация) | Сессия звонка Max | `app/max_call_session.tsx` | консервация | |
| — | экран (консервация) | Уроки с Max | `app/max_lessons.tsx` | консервация | |
| — | экран (консервация) | Разбор звонка Max | `app/max_voice_review.tsx` | консервация | |
| — | экран (консервация) | Пейволл Max | `app/max_paywall.tsx` | консервация | |
| — | модалка (консервация) | Согласие на голос Max | `app/max_voice_consent_gate.tsx`, `components/MaxVoiceConsentModal.tsx` | консервация | |
| PAY-14 | шторка | Правила рулетки-приза («Привет другу») | `components/referral_how_sheet.tsx`, `referral_code_sheet.tsx`, `referral_friend_reward_modal.tsx`, `referral_sheet_shell.tsx` | оставить (D52), но убрать валютную награду за привет другу (D22 PROPOSED) | |
| PAY-15 | экран (устарел) | Прямой пейволл-роут (короткий переход) | `app/direct_paywall_route.tsx` | уточнить владельцу | |
| PAY-16 | оверлей | Экран окончания доступа к уроку (истёк доступ по времени) | `app/lesson_runtime_access_boundary.tsx` | оставить | |

## 10. Системные окна / уведомления / обновления (SYS)

| ID | Тип | Что видит пользователь | Файл | 2.0 | Макет |
|---|---|---|---|---|---|
| SYS-01 | экран | Экран ошибки (краш-фолбэк) | `components/ErrorBoundary.tsx` | оставить | |
| SYS-02 | баннер | «Нет соединения» (офлайн) | `components/OfflineBanner.tsx` | оставить | |
| SYS-03 | модалка | Требуется обновление приложения | `components/ForceUpdateGate.tsx`, `components/UpdateModal.tsx` | оставить | |
| SYS-04 | экран | Технические работы (maintenance) | `components/MaintenanceGate.tsx` | оставить | |
| SYS-05 | экран | Восстановление состояния телефона (сбой синхронизации) | `components/PhoneStateRecoveryScreen.tsx` | оставить | |
| SYS-06 | модалка | Что нового (release notes) | `components/ReleaseNotesModal.tsx` | оставить | |
| SYS-07 | модалка | Общее объявление (broadcast от команды) | `components/GlobalBroadcastModal.tsx`, `components/PersonalAdminMessageModal.tsx` | оставить | |
| SYS-08 | модалка | Запрос разрешения на уведомления | `components/NotificationPermissionModal.tsx`, `NotificationPermissionModalHybrid.tsx` | оставить | |
| SYS-09 | тост/хост | Проблема с оплатой (billing issue) | `components/BillingIssueToastHost.tsx` | оставить | |
| SYS-10 | шторка | Входящие сообщения приложения (инбокс) | `components/AppMessagesInbox.tsx`, `components/NotificationCenterButton.tsx` | оставить | |
| SYS-11 | модалка | Запрос отзыва (App Store review prompt) | `components/ReviewPromptModal.tsx` | оставить | |
| — | placeholder-роут | Заглушка «This is a modal» (шаблон Expo Router) | `app/modal.tsx` | уточнить (похоже на неиспользуемый шаблон — удалить как мусор шаблона Expo) | |
| — | экран | Диплинк/not-found редирект | `app/+not-found.tsx`, `app/+native-intent.tsx` | оставить (технические) | |

## 11. Таббар / навигация (NAV)

| ID | Тип | Что видит пользователь | Файл | 2.0 | Макет |
|---|---|---|---|---|---|
| NAV-01 | таббар | Нижняя навигация: Главная · Обучение · Видео · Сообщество · Настройки | `app/(tabs)/_layout.tsx` | оставить — уже реализовано (D39, коммит `bfdc8e783`); правит сессия интерфейса (D44) | |
| NAV-02 | вкладка (устарела) | Старая вкладка «Уроки» (журнал, редирект-заглушка) | `app/(tabs)/journal.tsx` | удаляется как отдельная вкладка — уже не в таббаре, файл остаётся как якорь диплинка | |
| NAV-03 | вкладка (устарела) | Старая вкладка «Арена» (не в таббаре) | `app/(tabs)/arena.tsx` | удаляется из навигации (см. COM-24) | |
| — | компонент | Слайдер между вкладками (свайп) | `app/TabSlider.tsx`, `app/TabContext.tsx` | оставить | |
| — | оверлей | Арбитр перекрывающихся модалок/тостов (кто главнее) | `components/OverlayArbiter.tsx`, `overlay_arbiter_core.ts` | оставить (техническая инфраструктура, не показывается сама по себе) | |

---

## Компоненты, требующие отдельного внимания (не привязаны к одному маршруту)

Эти файлы рендерят Modal/Sheet/Toast, но обслуживают несколько разделов сразу или являются
инфраструктурой показа (выбирают, что показать поверх остального):

- `components/modal_fx/HybridAlertShell.tsx`, `HybridSheetShell.tsx`, `native_modal_dismiss_coordinator.ts` — общая замена Alert/шторки, используется почти всеми модалками выше. Оставить.
- `components/ThemedConfirmModal.tsx`, `ThemedChoiceModal.tsx`, `ThemedBlockingAlertHost.tsx` — универсальные confirm/choice диалоги. Оставить.
- `components/centered_dialog_shell.tsx`, `MotionModal.tsx`, `ResponsiveModalScrollView.tsx` — обёртки модалок (общая анимация появления). Оставить.
- `components/RewardModalBackdrop.tsx`, `GoldBevel.tsx`, `ShineOverlay.tsx`, `HoloFoilCard.tsx` — визуальные эффекты для наградных модалок (часть будут не нужны после удаления жемчуга/спинов — проверить точечно на каждой оставшейся модалке).
- `components/QuestSheetModal.tsx`, `QuestTaskCard.tsx` — квесты/задания (проверено PM-232 после чистки мёртвых наград pearls/spins — актуальны, оставить, но подключить к новому блоку «Сегодня» D49).
- `components/PromoBanner.tsx`, `SoftContextualUpsellCard.tsx`, `ReportReplyHomeBanner.tsx` — баннеры на разных экранах (не Главная), оставить точечно.
- `components/GiftOpenEffects.tsx`, `GiftExpiryCountdown.tsx`, `SpinTicketArt.tsx`, `SpinRewardPlaque.tsx`, `PrizeArc` (`prize_arc.tsx`) — визуальные ассеты открытия подарков/спинов — удаляются вместе с механикой (D09).
- `components/BoonActivatedHost.tsx`, `BoonActivatedModal.tsx`, `BoonActivatedSheet.tsx`, `BoonChestModal.tsx`, `BoonHeroSheet.tsx`, `components/boon_hero/BoonHeroEmblem.tsx`, `components/TodaysBoonStrip.tsx`, `WeeklyBoonDetailModal.tsx`, `MysteryMondayHost.tsx`, `PerfectWeekHost.tsx`, `ComebackBoonHost.tsx` — вся система «бонусов дня/недели/возвращения» — удаляется (D09, уже выключена на сервере PM-049/052, хост-компоненты помечены как мёртвый код, требуют удаления файлов).
- `components/daily_journey/DailyJourneyProductionModalHost.tsx`, `DailyJourneyRevealScene.tsx` — «Дневной путь» — удаляется, заменяется блоком «Сегодня» (D49/D51).
- `components/friends_together/FriendLevelUpModal.tsx`, `FriendStudyInviteModal.tsx`, `FriendTogetherSheet.tsx`, `FriendEventMarker.tsx` — приглашения друга/повышение друга — оставить в разделе Друзья (COM-04), кроме FriendsChestModal/FriendsChestCard (см. COM-07, удаляется).
- `components/GlobalFriendGiftHost.tsx`, `GlobalShardsEarnedHost.tsx` — глобальные хосты подарков/наград жемчуга — удаляются вместе с подарками/жемчугом (D09/D15).
- `components/RankChangeBanner.tsx`, `MedalToast.tsx`, `InGameToast.tsx`, `ActionToast.tsx` — общие тосты смены ранга/медали/действия — оставить, но проверить, что «ранг» теперь означает монетный ранг, а не XP-уровень.
- `components/SeasonGiftModal.tsx`, `SeasonRewardInfoModal.tsx`, `SeasonAuraRing.tsx`, `SeasonProfileCardFrame.tsx`, `SeasonPassBuyButton.tsx`, `app/season_pass.tsx` — весь сезонный пропуск — удаляется (D53).
- `components/roulette_win_modal.tsx`, `roulette_win_celebration.tsx` — колесо выигрыша (проверить: это реферальная рулетка PRF-12, которая остаётся, D52 — НЕ путать со спинами уровня, которые удаляются).
- `components/PlayerProfileModal.tsx` — карточка чужого игрока (визитка) — оставить, обновить под монету/ранг.
- `components/CustomAvatarBadge.tsx`, `components/customization/*` (`AvatarEditorSheet.tsx`, `CustomizationCatalogCard.tsx`, `CustomizationControls.tsx`, `CustomizationHero.tsx`, `CustomizationPurchaseConfirmModal.tsx`) — редактор кастомизации, завязанный на старую систему аватаров — уточнить владельцу, что из этого переживает переход на монету ранга (D60/D61).
- `components/avatar-aura/**`, `components/avatar-dna/**` — рендер уже купленных аур/аватаров (не редактор) — НЕ удалять сейчас (D59 отменено D61 для аур — ассеты аур уже удалены без замены; для avatar-dna уточнить отдельно).

## Дополнения (перепроверены после второго независимого прохода)

- `components/ui/new/UndoSnackbar.tsx` — снекбар «отменить действие» (общий, используется в разных местах точечно). Оставить.
- `components/ui/new/OfflineDataNotice.tsx` — уведомление «данные могут быть устаревшими» (офлайн-кэш). Дополняет SYS-02, оставить.
- `app/referral_access_ended_modal.tsx` — модалка «реферальный доступ закончился». Часть PRF-12/PAY-14 (реферальная рулетка), оставить (D52).
- `app/session_attempts/session_attempt_recovery.ts` — логика восстановления прерванной попытки занятия (не отдельный визуальный компонент, а модель данных для существующих экранов возобновления сессии) — уточнить, требует ли отдельного UI-элемента после решения по энергии (PM-084).
- `components/max/MaxLessonsStatsSheet.tsx`, `MaxTutorLiveBoard.tsx`, `MaxCallOrb.tsx`, `MaxDailyQuotaMeter.tsx`, `MaxLessonCountdown.tsx`, `MaxLessonMissionPlaque.tsx`, `MaxMinutesBadge.tsx`, `MaxSpeechSparkline.tsx`, `MaxTutorGoalStrip.tsx`, `MaxTutorTopicNotice.tsx` — весь набор экранных элементов Max — консервация (D11, MAX_SECTION_SEALED_BY_OWNER_2026_09_04), не рисовать в макетах 2.0.
- Арена: доп. тосты `components/arena/ArenaOpponentFoundToast.tsx`, `ArenaEntryFailureToast.tsx`, `ArenaNextRankToast.tsx` и анимации `ArenaVersusIntro.tsx`, `ArenaFinalScoreCount.tsx`, `ArenaStarFlight.tsx`, `ArenaResultDuel.tsx` — удаляются вместе с Ареной (см. COM-24).
- `components/survey/SurveyPearlFlight.tsx`, `SurveyPearlChip.tsx` — анимация «жемчуг за опрос» — удаляется (жемчуг за опрос уже обнулён на сервере, PM-058: `SURVEY_SHARD_AMOUNT 1→0`), сам опрос (PRF-13) остаётся, но без визуала жемчуга.

## Известные пробелы / открытые вопросы для владельца

1. `app/level_exam.tsx`, `app/season_pass.tsx`, `app/collectibles_screen.tsx`, `app/achievements_screen.tsx`, `app/shards_shop.tsx`, `app/shop.tsx`, `app/promo_code_entry.tsx`, паивоплы A–G, `premium_modal`/`premium_modal_v2` — decision=unknown в официальном реестре; нужна явная резолюция владельца или программы 2.0 перед тем как сессия интерфейса будет их рисовать.
2. Диалоги (весь раздел DLG) висят на открытом D05 — порог доступа (ранг монеты вместо уровня/Plus) не утверждён; макет можно рисовать, но текст/условие доступа изменится позже.
3. `app/league_screen.tsx` вероятно дублирует `app/club_screen.tsx` — требуется решение, какой из двух — канонический экран лиги/Шпиля.
4. «Шпиль» (замена Лиги/Арены, D54) на момент описи не имеет собственного экрана в `app/` — только серверный/клиентский движок без UI. Когда экран появится, его нужно добавить в этот файл отдельным ID (COM-25+).
5. `components/StreakReviveModal.tsx` — открыт вопрос, остаётся ли платное восстановление серии (за монеты) или удаляется целиком вместе с «докупи за жемчуг» (D45).

## Как выявлялись данные (проверяемость)

- 139 маршрутов и их `decision` — прямое чтение `docs/phraseman-2.0/registries/screen_inventory.json` (аудит на коммите `385daed73`, метод: полный список `app/**/*.{ts,tsx}`, различение экрана и `__RouteShim`-заглушки).
- Решения D01–D65 — построчное чтение `docs/phraseman-2.0/03_DECISIONS.md` и `docs/phraseman-2.0/PROGRESS.md` (раздел 1 и журнал раздела 5).
- Модалки/шторки/тосты/анимации вне реестра маршрутов — прямой `grep -rl` по `<Modal`, `Sheet`, `Toast`, `Banner`, `Celebration`, `onfetti`, `Lottie`, `BottomSheet` в `app/**` и `components/**` (библиотек Lottie/`@gorhom/bottom-sheet` в проекте нет — все шторки самописные на базе `react-native` `Modal` + `HybridSheetShell`).
- Текущий таббар (`Главная · Обучение · Видео · Сообщество · Настройки`) подтверждён чтением `app/(tabs)/_layout.tsx` (строки 443–455) и `app/(tabs)/community.tsx`, `app/(tabs)/video.tsx` — уже реализовано в этой ветке (коммит `bfdc8e783`), не гипотеза.
- `app/(tabs)/home.tsx` и онбординг исключены по прямому требованию задания («вне работы, владелец запретил трогать»).
