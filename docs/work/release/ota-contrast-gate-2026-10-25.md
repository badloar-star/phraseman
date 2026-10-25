# Контраст-гейт OTA (всё, что изменилось после 2.0.2)

Дата: 25.10, сессия 4 · ТЕМЫ, задача координатора. База — снимок сборки 2.0.2 (144) `009c40c97`.
Список: `git diff --name-only 009c40c97..HEAD -- app components modules constants hooks`, экраны и компоненты `.tsx` без тестов,
превью и дев-витрины — 142 файлов. Меряно на 174 сочетаниях (29 тем × светлая/тёмная × Спокойно/Акцент/Максимум),
пороги: текст 4,5, значок 3,0.

## Метод и его границы

- Статический анализатор `scripts/zone_contrast_measure.ts`: пары «цвет ↔ подложка» из кода; подложка — ближайшая по разметке.
- Он нашёл 60 кандидатов в 15 файлах. Каждый разобран вручную по коду и перемерен на 174 сочетаниях точной парой.
  Большинство — ложные: подпись кнопки мерена к фону экрана, а не к своей заливке.
- «Пар не найдено» — цвет задаётся в дочернем компоненте или переменной; такие компоненты перемерены отдельными сторожами
  этой ночи (окна обновления/рассылки, «Восстановить аккаунт?», значок уведомлений, «Очистить память», экран блокировки,
  фактура главной кнопки) или на их замерах зон 25.10 (docs/work/zones-contrast-2026-10-25.md).
- `.ts`-файлы (логика, токены) в счёт не входят; палитры тем стерегут собственные сторожа 174.

## Итог

- Настоящих нарушений: 4. Исправлено: 1 (61eea649a), исправляется: 2 (звёзды итога, маркер ввода Learning V2),
  в занятом файле: 1 (плеер Learning V2 — передано хозяину через координатора).
- Исключения по решению: онбординг (theme-exempt до выбора темы), экран выбора языка (своя тёмная палитра).

## Таблица

| Файл | Минимум | Вердикт |
|---|---|---|
| app/(tabs)/community.tsx | 4,77 (порог 4,5, пар 1) | ок |
| app/(tabs)/friends.tsx | 4,77 (порог 4,5, пар 6) | ок |
| app/(tabs)/home.tsx | 4,77 (порог 4,5, пар 8) | ок |
| app/(tabs)/lessons.tsx | 4,77 (порог 4,5, пар 8) | ок |
| app/_layout.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| app/achievements_screen.tsx | 4,77 (порог 4,5, пар 22) | ок |
| app/ai_companion_session.tsx | 4,77 (порог 3, пар 16) | ок |
| app/ai_dialog_session.tsx | 4,77 (порог 3, пар 36) | ок |
| app/combo_lesson_gate.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| app/dialogue_v2_briefing.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| app/dialogue_v2_completion.tsx | 4,77 (порог 4,5, пар 22) | ок |
| app/dialogue_v2_freeform.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| app/dialogue_v2_memory.tsx | 1,00 (порог 4,5, пар 18) | ок — ложное: «Открыть Plus» p.ctaText на своей заливке p.cta (пара кнопки) |
| app/dialogue_v2_session.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| app/flashcards/CardsSessionResultV2.tsx | 4,77 (порог 4,5, пар 10) | ок |
| app/flashcards/CollectionGalleryView.tsx | 4,51 (порог 4,5, пар 10) | ок |
| app/flashcards/CollectionListView.tsx | 1,00 (порог 4,5, пар 19) | ок — ложное: «Создать набор» ctaInk на своей заливке cta |
| app/flashcards/ExpandedCardV2.tsx | 4,77 (порог 4,5, пар 6) | ок |
| app/flashcards/FlashcardsHubScreen.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| app/flashcards/SavedCollectionStates.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| app/flashcards/SpeakHoldButton.tsx | 4,77 (порог 4,5, пар 1) | ок |
| app/flashcards/VideoPackRow.tsx | 4,77 (порог 4,5, пар 7) | ок |
| app/flashcards/VideoSetView.tsx | 4,77 (порог 4,5, пар 12) | ок |
| app/flashcards_training_setup.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| app/friends_week_mine.tsx | 4,77 (порог 4,5, пар 10) | ок |
| app/language_welcome.tsx | 1,00 (порог 4,5, пар 8) | ок — своя тёмная палитра (theme-exempt), мерено к фону темы |
| app/learning-v2/chapter-exam.tsx | 4,77 (порог 3, пар 7) | ок |
| app/learning-v2/course.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| app/learning_v2_direct_session_player_v1.tsx | 4,77 (порог 4,5, пар 35) | НАРУШЕНИЕ, файл занят — значки «прослушать» :3689 (g.cta на buttonFill, 1,31, 38/174) и микрофона :3878 (g.cta на opaqueControl, 1,01, 28/174); замена g.accentGraphic (≥ 3,20 / ≥ 4,51) — хозяину Learning V2 |
| app/learning_v2_placement.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| app/learning_v2_session_intro.tsx | 4,77 (порог 4,5, пар 18) | ИСПРАВЛЯЕТСЯ — маркер «внимание» g.cta как текст (было 1,00, 38/174) → ≥ 4,5 |
| app/learning_v2_session_intro_check.tsx | 1,00 (порог 3, пар 16) | вне выпуска — маршрут открывается только из дев-витрины |
| app/lesson1.tsx | 4,02 (порог 4,5, пар 31) | ок — в тёмной ветке correct/correctBg ≥ 5,44; в светлой текст = glass.text |
| app/lesson_complete.tsx | 4,77 (порог 4,5, пар 27) | ок |
| app/manage_subscription.tsx | 4,77 (порог 4,5, пар 37) | ИСПРАВЛЕНО 61eea649a — подписи плашек статистики (было 3,09, 78/174) → ≥ 4,5 |
| app/mistake_practice_session.tsx | 4,51 (порог 4,5, пар 14) | ок |
| app/settings_edu.tsx | 4,77 (порог 4,5, пар 10) | ок |
| app/streak_stats.tsx | 1,00 (порог 4,5, пар 70) | ок — выбранная фишка bgCard на заливке accentText ≥ 5,68 |
| components/AiLimitUpsellCard.tsx | 4,49 (порог 3, пар 2) | ок |
| components/AppMessagesInbox.tsx | 5,17 (порог 3, пар 10) | ок |
| components/CleanOnboarding.tsx | 1,00 (порог 4,5, пар 19) | theme-exempt до выбора темы (решение координатора 25.10, eb3dddbe7) |
| components/DailyPhraseCard.tsx | 1,64 (порог 4,5, пар 20) | ок — ложное: цвет тени, не текст |
| components/DeleteAccountConfirmModal.tsx | 4,77 (порог 4,5, пар 5) | ок |
| components/DialogVerdictScreen.tsx | 4,77 (порог 4,5, пар 42) | ок |
| components/DialogsTabContent.tsx | 4,77 (порог 4,5, пар 14) | ок |
| components/ForceUpdateGate.tsx | 4,77 (порог 4,5, пар 4) | ок |
| components/GlobalBroadcastModal.tsx | 4,77 (порог 4,5, пар 8) | ок |
| components/LearningV2SessionOutcomeSheet.tsx | 1,00 (порог 3, пар 11) | ок — значок цвета листа на круге g.text ≥ 11,01; замок secondary ≥ 5,05 |
| components/MedalToast.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/NoEnergyModal.tsx | 4,77 (порог 4,5, пар 10) | ок |
| components/NotificationCenterButton.tsx | 4,52 (порог 4,5, пар 19) | ок |
| components/PremiumContext.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/RegistrationPromptModal.tsx | 4,77 (порог 4,5, пар 44) | ок |
| components/SpeakingPanel.tsx | 4,77 (порог 4,5, пар 10) | ок |
| components/StreakRiskToastHost.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/ThemedBlockingAlertHost.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/UpdateModal.tsx | 4,77 (порог 4,5, пар 4) | ок |
| components/account/AccountRestoreSummaryDialog.tsx | 5,93 (порог 4,5, пар 5) | ок |
| components/account/DeleteAccountVariantBBody.tsx | 4,77 (порог 4,5, пар 5) | ок |
| components/completion/V2DoneScreen.tsx | 4,77 (порог 4,5, пар 34) | ИСПРАВЛЯЕТСЯ — невыбитые звёзды opaqueControl на фоне (было 1,00, 155/174 ниже 1,5) → тон не тусклее макета 1,5 |
| components/dialogs/DialogueV2CatalogueContainer.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/dialogs/DialogueV2FreeformScreen.tsx | 1,00 (порог 3, пар 14) | ок — ложное: микрофон ctaInk на своей заливке cta при записи |
| components/dialogs/DialogueV2HubNotices.tsx | 4,77 (порог 4,5, пар 10) | ок |
| components/dialogs/DialogueV2SessionScreen.tsx | 1,00 (порог 3, пар 17) | ок — ложное: микрофон ctaInk на своей заливке cta при записи |
| components/dialogs/glass/DialogueGlassSessionParts.tsx | 4,77 (порог 3, пар 17) | ок |
| components/dialogs/scene/DialogsSceneHub.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/energy/EnergyStopSheet.tsx | 1,00 (порог 4,5, пар 4) | ок — ложное: accentInk на своей заливке accent |
| components/friends_together/FriendEventMarker.tsx | 4,56 (порог 3, пар 4) | ок |
| components/home/v2/HomeV2Header.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/home/v2/scene/HomeScene.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/home/v2/scene/HomeSceneEnergy.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/home/v2/scene/HomeSceneStage.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/home/v2/scene/PremiumThemeMotion.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/home/v2/today_scene/TodaySceneView.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/learning-v2/IntroRoleText.tsx | 4,85 (порог 4,5, пар 1) | ок |
| components/learning-v2/LearningV2AllLessonsList.tsx | 4,77 (порог 3, пар 13) | ок |
| components/learning-v2/LearningV2ChapterExamSheet.tsx | 1,00 (порог 3, пар 7) | ок — opaqueCard на кнопке g.text ≥ 11,01, энергия ≥ 7,98 |
| components/learning-v2/LearningV2Glass.tsx | 4,77 (порог 3, пар 2) | ок |
| components/learning-v2/LearningV2TaskBody.tsx | 4,77 (порог 3, пар 11) | ок |
| components/learning-v2/exam_v2/ChapterExamV2Question.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/learning-v2/exam_v2/ChapterExamV2Result.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/learning-v2/exam_v2/ChapterExamV2Run.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/learning-v2/placement/PlacementChrome.tsx | 4,77 (порог 4,5, пар 6) | ок |
| components/learning-v2/placement/PlacementStartView.tsx | 4,77 (порог 4,5, пар 3) | ок |
| components/learning-v2/season/SeasonCardFace.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/learning-v2/season/SeasonCourse.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/learning-v2/season/SeasonCourseConnected.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/learning-v2/season/SeasonCourseView.tsx | 4,77 (порог 4,5, пар 6) | ок |
| components/learning-v2/season/SeasonExpandedCard.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/learning-v2/season/SeasonPickScreens.tsx | 4,77 (порог 4,5, пар 10) | ок |
| components/learning-v2/workshop/PhraseWorkshopRowButton.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/learning-v2/workshop/PhraseWorkshopTheorySheet.tsx | 11,01 (порог 4,5, пар 4) | ок |
| components/lesson_prep/LessonPrepCtaBody.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/lessons/LessonHardModeSwitchLine.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/paywall/PaywallContextIcons.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/paywall/PaywallPlus.tsx | 4,56 (порог 3, пар 26) | ок |
| components/paywall/PaywallPlusScreen.tsx | 4,85 (порог 4,5, пар 1) | ок |
| components/paywall/PaywallServerRefusedDock.tsx | 4,77 (порог 4,5, пар 6) | ок |
| components/paywall/m/PaywallMChart.tsx | 5,93 (порог 4,5, пар 8) | ок |
| components/paywall/m/PaywallMCompare.tsx | 5,68 (порог 4,5, пар 7) | ок |
| components/paywall/m/PaywallMDock.tsx | 1,00 (порог 3, пар 8) | ок — ctaFillInk на градиенте ctaFill ≥ 4,51 |
| components/paywall/m/PaywallMHeaderCard.tsx | 5,93 (порог 4,5, пар 3) | ок |
| components/paywall/m/PaywallMPanels.tsx | 4,51 (порог 3, пар 29) | ок |
| components/paywall/m/PaywallMPlans.tsx | 4,77 (порог 4,5, пар 7) | ок |
| components/paywall/m/PaywallMRoad.tsx | 5,68 (порог 4,5, пар 4) | ок |
| components/paywall/m/PaywallMSheet.tsx | 4,77 (порог 4,5, пар 4) | ок |
| components/paywall/m/PaywallMWorkshopPreview.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/spire/SpireEnergyPill.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/spire/SpireExitSheet.tsx | 4,51 (порог 4,5, пар 4) | ок |
| components/spire/SpireGhostLayer.tsx | 5,68 (порог 3, пар 5) | ок |
| components/spire/SpireGoldFrame.tsx | 5,47 (порог 4,5, пар 1) | ок |
| components/spire/SpireGoldReward.tsx | 8,77 (порог 4,5, пар 1) | ок |
| components/spire/SpireHeartsRow.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/spire/SpireHomeScreen.tsx | 5,05 (порог 3, пар 4) | ок |
| components/spire/SpireHomeTitle.tsx | 11,01 (порог 4,5, пар 1) | ок |
| components/spire/SpireResultPanel.tsx | 4,77 (порог 4,5, пар 7) | ок |
| components/spire/SpireStepScreen.tsx | 4,77 (порог 4,5, пар 7) | ок |
| components/spire/SpireTimerRing.tsx | 4,77 (порог 4,5, пар 2) | ок |
| components/spire/SpireTower.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/spire/SpireTowerRivals.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/spire/moments/MomentDown.tsx | 4,77 (порог 4,5, пар 2) | ок |
| components/spire/moments/MomentPromotion.tsx | 4,51 (порог 4,5, пар 13) | ок |
| components/spire/moments/MomentPromotionShort.tsx | 4,77 (порог 4,5, пар 3) | ок |
| components/spire/moments/MomentStay.tsx | 4,77 (порог 4,5, пар 3) | ок |
| components/spire/moments/SpireLastChanceSheet.tsx | 4,77 (порог 4,5, пар 4) | ок |
| components/spire/moments/SpireOvertakeToast.tsx | 4,51 (порог 4,5, пар 4) | ок |
| components/spire/moments/SpirePositionMomentsHost.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/spire/moments/SpirePositionRiseMoment.tsx | 4,51 (порог 4,5, пар 3) | ок |
| components/spire/moments/SpireStepResultMoment.tsx | 4,49 (порог 3, пар 10) | ок |
| components/spire/moments/SpireWeekMomentHost.tsx | 11,01 (порог 4,5, пар 1) | ок |
| components/spire/scene/SpireScene.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/spire/scene/SpireScenePedestal.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/spire/scene/spire_scene_backdrop.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/stories/StorySlides.tsx | 4,77 (порог 4,5, пар 16) | ок |
| components/streak/StreakRuleExplainer.tsx | 5,93 (порог 4,5, пар 3) | ок |
| components/streak/StreakStagesModal.tsx | 4,77 (порог 4,5, пар 4) | ок |
| components/streak/moments/StreakMilestoneScreen.tsx | 5,73 (порог 4,5, пар 3) | ок |
| components/streak/moments/StreakMilestoneToast.tsx | 5,05 (порог 4,5, пар 2) | ок |
| components/streak/moments/StreakMomentFlame.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| components/v2/GlassAlertDialog.tsx | 1,00 (порог 4,5, пар 4) | ок — ctaFillInk на ctaFill; фактура не рисуется, если прячет подпись (8d7e81f60) |
| components/v2/ThemeAccentFill.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
| modules/learning-v2/modes/mode_feedback_v1.tsx | — (пар не найдено: цвета из дочерних компонентов или переменных) | ок |
