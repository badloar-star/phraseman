# Полный список экранов релизной сборки — 15.10 (для полной проверки F01/F04)

Источник: статическое чтение кода (агент координатора), сверено с router.ctx.js. Пути относительно `app/`.
Релиз: `EXPO_PUBLIC_STORE_RELEASE=1` → ENABLE_DEV_TOOLS=false, урезанный контекст маршрутов. Интерфейс в релизе: ru, uk, es, pt-BR, vi, id, tr, pl (en выключен). Вкладка «Обучение» видна только при изучаемом en (D129). Пик — только интерфейс ru/uk.

Матрица проверки на КАЖДЫЙ экран: первый кадр · низ после прокрутки до конца (ничего под таббаром/доком) · КАЖДАЯ кнопка тапом (куда ведёт, не мёртвая, не виснет) · Free/Plus где отличается (через dev) · 5 языков обучения где есть язык · пустое/офлайн где применимо. Шаблон вердиктов — full-check-template-2026-10-15.md.

## 1. Вкладки (плавающий таббар виден)
| Экран | Файл | Язык | Низ | Free/Plus | Мик |
|---|---|---|---|---|---|
| Главная | (tabs)/home.tsx | по studyTarget | скролл, useTabContentBottomPad | пейвол потери серии, бейдж Plus, плитка Диалогов | — |
| Обучение | (tabs)/lessons.tsx | только en | FlatList; страница V2 прячет таббар | уроки после 3 → пейвол; Диалоги «Plus» | — |
| Видео | (tabs)/video.tsx → lingman_videos | пилюля языка обучения (StudyLanguageSheet); подвкладка «Наборы» — PackLanguagePicker | FlashList | — | — |
| Сообщество | (tabs)/community.tsx | сегменты ниже | — | — | — |
| Настройки | (tabs)/settings.tsx | строки → settings_language, StudyLanguageSheet | скролл + версия | строка Plus, промо, рефералы | — |

Подстраницы: Сообщество «Друзья» ((tabs)/friends.tsx) · «Пик» (SpireHomeScreen, док «Играть» прибит) · «Наборы» (flashcards_packs embedded, PackLanguagePicker) · Обучение «Уроки» / «Диалоги» (DialogsTabContent) / «V2» (LearningV2ChaptersCourse) · Видео home/playlists/packs.

## 2. Поверх вкладок (таббар закрыт)
Обучение: lessons_list · learning-v2/course · learning-v2/session/[id] (мик) · lesson_menu · combined_lesson_pick (прибитая «Начать») · lesson1 (мик, «Дальше») · lesson_words · lesson_irregular_verbs (/lesson_verbs) · preposition_drill · hint · lesson_help · lesson_complete (док) · diagnostic_test · exam · level_exam (ExamFooter).
Диалоги: ai_dialog_home · dialogue_v2_briefing · dialogue_v2_session (мик) · dialogue_v2_completion · dialogue_v2_freeform (Plus, мик) · dialogue_v2_memory · ai_dialog_briefing · ai_dialog_session (мик) · ai_companion_session (Plus).
Карточки: flashcards (хаб) · flashcards_collection (PanelDock, пикер языка) · flashcards_packs · flashcards_my_packs · flashcards_video_packs · flashcards_training_setup (PanelDock, пикер) · flashcards_swipe · flashcards_truefalse_session · flashcards_blitz_session · flashcards_recall_session · flashcards_speaking_session (мик) · flashcards_card_editor · community_pack_create (allowNone) · flashcards_voice_picker.
Видео: lingman_videos (из пуша, savedOnly) · lingman_playlist · lingman_video_watch (PanelDock «Добавить набор»).
Ошибки: mistakes_hub · mistakes_list · mistake_detail · mistake_practice_session (мик).
Прогресс/экономика: streak_stats (размытие для Free) · achievements_screen · year_activity · coin_rank (прибитый CTA) · coin_rank_catalog · runes_wallet · language_welcome · survey_screen.
Шторки разделов: settings_language · settings_edu · settings_notifications · settings_themes · privacy_settings · privacy_screen · terms_screen · support_report · account_details (Выйти/Удалить) · manage_subscription · referrals · promo_code_entry.
Пейвол: premium_modal (PaywallPlusScreen, все источники).
Без входа в релизе: lesson_theory_v2, pack_opening, survey_screen.

## 3. Модалы и оверлеи
Онбординг CleanOnboarding (welcome → privacy → niceToMeet → promise → improve → source → language → level → notifications → name → trialReminder → onboardingPaywall).
Пейвол: PaywallSwipeSheet, PaywallTrialReminderPrompt.
Энергия: EnergyStopSheet, EnergyNeededSheet, EnergyInfoPopover, NoEnergyModal (экзамены, карточки, слова, глаголы, предлоги, брифинг), SpireNoEnergySheet.
«Встречайте 2.0»: ReleaseNotesV2Modal; ReleaseNotesModal (старый).
Сторис: StoryViewer (StoryAvatarSlot на Главной).
Корень: RegistrationPromptModal, NotificationPermissionModal, UpdateModal, GlobalBroadcastModal, AppMessageAnnouncementModal, PersonalAdminMessageModal, MaintenanceGate, ForceUpdateGate, StartupSplashHold, PhoneStateRecoveryScreen, PromoBanner; хосты EntitlementExpiredHost, ReferralWelcomeHost, StreakRiskToastHost, BillingIssueToastHost, GlobalLevelUpRewards, GlobalShardsEarnedHost.
Главная: PlayerProfileModal, SurveySheetModal, PremiumCelebrationModal, VipCelebrationModal, HomeV2VideoPlayerModal, DailyPhraseCard, welcome-back, rank-enough, LegacyBonusWelcomeHost.
Друзья: AddFriendModal, FriendStudyInviteModal, FriendTogetherSheet, UnifiedPlayerModal, ReferralAccessEndedModal.
Настройки/Видео: StudyLanguageSheet, YoutubeChannelPickerSheet, ReferralCodeSheet, ReferralHowSheet, RouletteWinModal.
Обучение: FeatureIntroModal, LearningV2FounderPassModal, LearningV2SessionOutcomeSheet, окно закрытого урока.
Уроки/статистика: AchievementNotifModal, ReviewPromptModal, StreakStagesModal.
Карточки: CardPackShardPaywallModal, CollectionMenuSheet, PackCommentsSheet, ReportPackModal, DeckPickerSheet, FlashcardsTrainingModeSheet.
Приватность/аккаунт: AiDialogConsentModal, DeleteAccountConfirmModal, NicknameEditModal.
Пик: SpireStepScreen, SpireTour, SpireMomentsLayer и моменты.

## 4. Где язык (проверять ×5 языков обучения / 8 интерфейса)
Интерфейс: settings_language. Обучение: настройки (шторка), Видео (пилюля), settings_language (строка), language_welcome, шаг языка онбординга. Наборы: Сообщество «Наборы»/flashcards_packs, flashcards_my_packs, flashcards_video_packs (и Видео «Наборы»), flashcards_collection, flashcards_training_setup, community_pack_create.

## 5. Микрофоны (8, общий счётчик 3/день)
lesson1 · learning-v2/session/[id] (плеер V2) · mistake_practice_session · flashcards_speaking_session · dialogue_v2_session · dialogue_v2_freeform · ai_dialog_session.

Итого: 74 экрана релиза + ~70 модалов/оверлеев.
