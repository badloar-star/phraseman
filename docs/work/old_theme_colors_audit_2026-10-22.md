# Аудит: цвета СТАРОЙ темы (constants/cinemaThemes.ts → constants/theme.ts) в экранах вместо токенов текущей (22.10.2026)

Закон владельца: «цвета строго оттенки текущей темы», распространяется и на семантику верно/неверно, если у текущей темы есть токены. Старая тема `Theme` (`t.correct`, `t.wrong`, `t.accent`, `t.textMuted` …) собирается из фиксированной палитры CINEMA/DARK и НЕ следует за выбранной liquid-темой.
Источник: обход `components/` и `app/` (кроме dev, `_*`, лабораторий, превью), алиасы `t.` и `theme.`; строки-комментарии не считаются. Итого 683 обращения в 127 файлах. Правок в чужих файлах нет.

## Что на что менять (контраст — минимум по 23 темам × светлое/тёмное × 3 уровня)

| Старое | Обращений | Замена (текущая тема) | Мин. контраст |
|---|---|---|---|
| `t.textMuted` | 275 | `g.mutedText` | на карточке 5,79; на фоне 4,63 (текст ≥ 4,5) |
| `t.correct` | 108 | `g.good` | карточка/плита 5,48; фон 4,51; контрол 4,50 |
| `t.wrong` | 108 | `g.bad` | карточка 5,48; плита 5,59; фон 4,51; контрол 4,57 |
| `t.accent` | 107 | графика/заливка → `g.accentGraphic` (карточка 6,38; фон 5,47; контрол 5,01); текст → `g.accentTextSafe` (карточка 5,92; фон 4,98; контрол 4,52) | текст ≥ 4,5, графика ≥ 5 |
| `t.textGhost` | 37 | `g.mutedText` (для декоративного — `g.line`) | как `mutedText` |
| `t.gold` | 30 | `g.medalGold` (только графика: карточка 4,17; фон 3,02; контрол 3,16); как ТЕКСТ нельзя — `g.accentTextSafe` или `g.warn` | графика ≥ 3 |
| `t.borderLight` | 7 | `g.hairlineSoft` (или убрать обводку — стиль «Тень») | — |
| `t.cardGradient` | 6 | `[g.plateFillFrom, g.plateFillTo]` | как плита |
| `t.onAccent` | 4 | `g.accentInk` (на `g.accent` 4,56) | 4,56 |
| `t.card` | 2 | `g.opaqueCard` | — |
| `t.onCorrect` / `t.onGold` | 0 | `g.ctaInk` (на `g.good`/`g.bad` ≥ 5,05; на `g.medalGold` 3,33) | — |

Как брать `g`: `const g = useShadowGlass()` (components/v2/ShadowSurface) или `useLv2Glass()` внутри Learning V2.
Оговорка: эвристика по алиасу; если в файле `t` — не `Theme`, обращение ложное, владелец файла отметит.

## По владельцам (файл — число обращений: токен×число (первая строка))

### 5 · ВХОД (настройки/магазин/пейвол/энергия): 21 файлов, 100 обращений
- app/shop.tsx — 13: wrong×1 (стр. 192), gold×2 (стр. 192), textMuted×9 (стр. 339), textGhost×1 (стр. 392)
- app/flashcards/CardPackShardPaywallModal.tsx — 12: textMuted×5 (стр. 428), gold×5 (стр. 481), textGhost×2 (стр. 1251)
- components/NotificationCenterButton.tsx — 10: textGhost×4 (стр. 518), textMuted×5 (стр. 520), wrong×1 (стр. 553)
- components/paywall/paywallShared.tsx — 10: accent×7 (стр. 86), textMuted×2 (стр. 99), textGhost×1 (стр. 111)
- app/settings_notifications.tsx — 6: correct×2 (стр. 504), wrong×2 (стр. 540), textMuted×2 (стр. 554)
- components/AiConsentSheetModal.tsx — 5: accent×4 (стр. 183), textMuted×1 (стр. 240)
- components/NotificationPermissionModal.tsx — 5: accent×2 (стр. 116), correct×1 (стр. 129), textMuted×2 (стр. 130)
- components/PremiumCard.tsx — 5: correct×4 (стр. 83), cardGradient×1 (стр. 94)
- components/settings/SettingsGroup.tsx — 5: textMuted×3 (стр. 176), wrong×1 (стр. 312), textGhost×1 (стр. 339)
- app/referrals.tsx — 5: textMuted×3 (стр. 654), accent×2 (стр. 774)
- components/settings/SettingsMessageSlotCard.tsx — 4: textMuted×3 (стр. 140), textGhost×1 (стр. 166)
- app/settings_edu.tsx — 4: textMuted×4 (стр. 379)
- components/NoEnergyModal.tsx — 3: gold×3 (стр. 485)
- components/SoftContextualUpsellCard.tsx — 3: textMuted×3 (стр. 78)
- app/(tabs)/settings.tsx — 2: textMuted×1 (стр. 1614), correct×1 (стр. 1958)
- app/privacy_settings.tsx — 2: wrong×2 (стр. 450)
- app/support_report.tsx — 2: wrong×2 (стр. 306)
- components/account/NicknameEditModal.tsx — 1: wrong×1 (стр. 416)
- components/energy/EnergyAttemptsHud.tsx — 1: wrong×1 (стр. 93)
- components/ReferralInviteBannerArt.tsx — 1: accent×1 (стр. 81)
- app/settings_language.tsx — 1: textMuted×1 (стр. 104)

### Достижения/статистика (владелец не назван): 4 файлов, 17 обращений
- app/achievements_screen.tsx — 8: textGhost×3 (стр. 306), textMuted×3 (стр. 1092), gold×2 (стр. 1183)
- components/ActivityHeatmap365.tsx — 5: accent×2 (стр. 189), textMuted×3 (стр. 231)
- components/achievements/AchievementShelfCarousel.tsx — 3: accent×1 (стр. 309), textGhost×1 (стр. 309), textMuted×1 (стр. 313)
- components/achievements/AchievementCategoryDock.tsx — 1: textMuted×1 (стр. 268)

### Карточки (владелец не назван): 21 файлов, 115 обращений
- app/flashcards_swipe.tsx — 30: accent×4 (стр. 3603), textMuted×12 (стр. 3698), wrong×6 (стр. 3719), gold×2 (стр. 4090), correct×6 (стр. 4193)
- app/flashcards/FlashcardListItem.tsx — 13: accent×3 (стр. 651), wrong×4 (стр. 675), cardGradient×3 (стр. 780), textMuted×2 (стр. 846), correct×1 (стр. 972)
- app/flashcards/PhraseCard.tsx — 12: correct×6 (стр. 750), wrong×6 (стр. 769)
- app/flashcards_voice_picker.tsx — 10: accent×3 (стр. 283), textGhost×3 (стр. 291), textMuted×4 (стр. 317)
- app/flashcards/CollectionHeader.tsx — 9: textMuted×6 (стр. 292), wrong×2 (стр. 462), accent×1 (стр. 503)
- app/flashcards/DeckSelectionTile.tsx — 5: accent×2 (стр. 207), textMuted×2 (стр. 207), textGhost×1 (стр. 251)
- app/flashcards_recall_session.tsx — 5: wrong×2 (стр. 1055), correct×2 (стр. 1065), textGhost×1 (стр. 1109)
- components/flashcards/CollectionLimitHeader.tsx — 4: wrong×2 (стр. 45), gold×1 (стр. 45), accent×1 (стр. 45)
- components/flashcards/FlashcardsShelves.tsx — 4: gold×2 (стр. 112), accent×1 (стр. 118), correct×1 (стр. 166)
- app/flashcards/CollectionListView.tsx — 4: accent×1 (стр. 576), wrong×1 (стр. 789), textGhost×1 (стр. 930), textMuted×1 (стр. 933)
- app/flashcards/WordStrengthDots.tsx — 3: correct×1 (стр. 14), gold×1 (стр. 15), wrong×1 (стр. 16)
- app/community_packs/PackCommentsSheet.tsx — 2: wrong×2 (стр. 1072)
- app/community_packs/UgcPackEditorCardPreview.tsx — 2: textGhost×1 (стр. 305), textMuted×1 (стр. 348)
- app/flashcards/FlashcardDetailsBody.tsx — 2: textMuted×2 (стр. 171)
- app/flashcards/FlashcardsCategoryHub.tsx — 2: accent×2 (стр. 178)
- app/flashcards/FlashcardsCategoryTiles.tsx — 2: textMuted×1 (стр. 59), accent×1 (стр. 79)
- app/flashcards/SpeakHoldButton.tsx — 2: textMuted×2 (стр. 197)
- components/AddToFlashcard.tsx — 1: textMuted×1 (стр. 274)
- components/flashcards/StatusFilterChips.tsx — 1: accent×1 (стр. 78)
- app/flashcards/FlashcardsCategoryBar.tsx — 1: textMuted×1 (стр. 30)
- app/flashcards_collection.tsx — 1: textMuted×1 (стр. 1686)

### Диалоги (владелец не назван): 10 файлов, 87 обращений
- components/DialogVerdictScreen.tsx — 25: correct×4 (стр. 127), wrong×1 (стр. 129), textMuted×18 (стр. 263), accent×2 (стр. 775)
- app/ai_dialog_session.tsx — 23: textMuted×12 (стр. 2174), accent×8 (стр. 2190), correct×1 (стр. 2302), gold×2 (стр. 2676)
- components/DialogsTabContent.tsx — 11: accent×4 (стр. 365), textMuted×7 (стр. 593)
- app/ai_companion_session.tsx — 9: textMuted×5 (стр. 115), accent×4 (стр. 134)
- components/dialogs/DialogHowToSaySheet.tsx — 8: textMuted×7 (стр. 276), accent×1 (стр. 328)
- components/AiDialogBriefingScreen.tsx — 6: textMuted×3 (стр. 237), gold×1 (стр. 290), accent×2 (стр. 338)
- components/dialogs/DialogPhraseReview.tsx — 2: correct×1 (стр. 36), textMuted×1 (стр. 73)
- components/AiBadge.tsx — 1: accent×1 (стр. 15)
- components/dialogs/DialogBubbleActions.tsx — 1: textMuted×1 (стр. 91)
- components/dialogs/DialogHelperRow.tsx — 1: textMuted×1 (стр. 86)

### Learning V2 / занятия и ошибки: 21 файлов, 81 обращений
- components/SpeakingPanel.tsx — 12: correct×3 (стр. 213), wrong×2 (стр. 216), textMuted×3 (стр. 246), accent×2 (стр. 247), card×1 (стр. 2414), onAccent×1 (стр. 2492)
- app/learning_v2_modes_showcase_run/[family].tsx — 8: accent×5 (стр. 119), textMuted×2 (стр. 256), correct×1 (стр. 278)
- components/level-exam/LevelExamResult.tsx — 7: correct×2 (стр. 67), wrong×2 (стр. 67), textMuted×2 (стр. 91), accent×1 (стр. 149)
- components/SpeakingButton.tsx — 7: textMuted×5 (стр. 132), accent×2 (стр. 146)
- app/exam.tsx — 7: wrong×6 (стр. 1191), correct×1 (стр. 1510)
- app/diagnostic_test.tsx — 6: wrong×3 (стр. 1614), correct×3 (стр. 1679)
- app/flashcards_speaking_session.tsx — 4: textMuted×3 (стр. 1641), correct×1 (стр. 1733)
- app/level_exam.tsx — 4: wrong×2 (стр. 1275), correct×2 (стр. 1279)
- components/MistakeEli5Modal.tsx — 3: accent×1 (стр. 228), textMuted×2 (стр. 252)
- components/ReportErrorButton.tsx — 3: wrong×3 (стр. 296)
- components/AiMistakeCard.tsx — 2: accent×1 (стр. 111), textMuted×1 (стр. 168)
- components/ExplainReportButton.tsx — 2: wrong×2 (стр. 201)
- components/level-exam/ContextChoiceQuestion.tsx — 2: correct×1 (стр. 30), wrong×1 (стр. 32)
- components/level-exam/LevelExamIntro.tsx — 2: correct×1 (стр. 125), wrong×1 (стр. 138)
- components/level-exam/SpeedMatchQuestion.tsx — 2: correct×1 (стр. 22), wrong×1 (стр. 22)
- components/mistake-practice/MistakePracticeLoopNode.tsx — 2: wrong×1 (стр. 46), textMuted×1 (стр. 55)
- components/MistakeEli5ModalHybrid.tsx — 2: textMuted×2 (стр. 114)
- components/session_attempts/SessionAttemptsHud.tsx — 2: wrong×1 (стр. 298), textGhost×1 (стр. 299)
- app/learning_v2_session_intro_check.tsx — 2: wrong×1 (стр. 278), correct×1 (стр. 296)
- components/level-exam/LevelExamTimer.tsx — 1: wrong×1 (стр. 22)
- components/SpeakingInlineResultStars.tsx — 1: textMuted×1 (стр. 29)

### 12 · ТЕОРИЯ (уроки/теория): 12 файлов, 83 обращений
- components/lesson_intro_rich.tsx — 12: textMuted×1 (стр. 249), correct×4 (стр. 252), wrong×5 (стр. 253), gold×2 (стр. 254)
- components/theory/WordBankBuilder.tsx — 10: textMuted×3 (стр. 212), correct×4 (стр. 240), wrong×3 (стр. 241)
- app/lesson1.tsx — 10: wrong×3 (стр. 1252), correct×7 (стр. 1264)
- components/theory/BinaryRecognition.tsx — 8: correct×3 (стр. 65), textMuted×3 (стр. 69), wrong×2 (стр. 100)
- components/theory/ThreeTileChoice.tsx — 8: textMuted×3 (стр. 95), correct×2 (стр. 103), wrong×3 (стр. 105)
- components/theory/SpotTheSlip.tsx — 7: wrong×4 (стр. 55), textMuted×1 (стр. 56), correct×2 (стр. 97)
- app/preposition_drill.tsx — 7: correct×4 (стр. 419), wrong×3 (стр. 495)
- components/theory/TheoryLessonView.tsx — 6: correct×3 (стр. 390), wrong×3 (стр. 391)
- components/lesson_help_theory_ui.tsx — 4: accent×1 (стр. 59), gold×1 (стр. 61), correct×1 (стр. 63), wrong×1 (стр. 65)
- app/lesson_irregular_verbs.tsx — 4: correct×2 (стр. 758), wrong×2 (стр. 758)
- app/lesson_words.tsx — 4: correct×3 (стр. 3248), wrong×1 (стр. 3299)
- components/CombinedLessonBreakdown.tsx — 3: textMuted×1 (стр. 56), wrong×2 (стр. 92)

### 3 · МАКЕТЫ (Главная/Сегодня/Пик): 5 файлов, 33 обращений
- components/DailyPhraseCard.tsx — 19: accent×2 (стр. 786), correct×9 (стр. 821), textMuted×6 (стр. 835), wrong×2 (стр. 1012)
- components/home/DayRings.tsx — 5: gold×1 (стр. 160), textMuted×2 (стр. 164), accent×2 (стр. 165)
- components/home/HomeSectionPulseButton.tsx — 4: accent×2 (стр. 80), textMuted×2 (стр. 82)
- app/(tabs)/home.tsx — 3: textMuted×3 (стр. 2963)
- components/home/HomeMistakesLockedSheet.tsx — 2: textMuted×1 (стр. 45), accent×1 (стр. 52)

### прочее (владелец не назван): 14 файлов, 62 обращений
- app/(tabs)/lessons.tsx — 18: accent×3 (стр. 1742), correct×2 (стр. 1744), gold×1 (стр. 1833), textMuted×12 (стр. 1846)
- components/WordDrillCard.tsx — 11: correct×3 (стр. 54), card×1 (стр. 156), textMuted×2 (стр. 177), wrong×1 (стр. 215), accent×1 (стр. 215), onAccent×3 (стр. 221)
- components/FeedbackRatingCard.tsx — 9: correct×4 (стр. 180), textGhost×4 (стр. 318), accent×1 (стр. 354)
- components/ExamResultPreviewAdminModal.tsx — 6: textMuted×4 (стр. 292), correct×1 (стр. 308), wrong×1 (стр. 308)
- components/TonalSurface.tsx — 4: cardGradient×2 (стр. 56), accent×2 (стр. 76)
- components/ScreenGradient.tsx — 3: accent×3 (стр. 703)
- components/modal_fx/HybridSheetShell.tsx — 2: accent×2 (стр. 365)
- components/ui/PrimaryButton.tsx — 2: textMuted×1 (стр. 32), accent×1 (стр. 63)
- components/VerbLetterBank.tsx — 2: correct×2 (стр. 93)
- components/GlassSurface.tsx — 1: accent×1 (стр. 86)
- components/ThemedChoiceModal.tsx — 1: wrong×1 (стр. 113)
- components/ui/new/UndoSnackbar.tsx — 1: textMuted×1 (стр. 167)
- components/youtube/YoutubeChannelPickerSheet.tsx — 1: textMuted×1 (стр. 33)
- app/hint.tsx — 1: textMuted×1 (стр. 1521)

### 8 · МОМЕНТЫ (награды/серия/итоги): 17 файлов, 102 обращений
- app/streak_stats.tsx — 49: textMuted×36 (стр. 960), textGhost×10 (стр. 1226), accent×3 (стр. 1605)
- app/pack_opening.tsx — 12: borderLight×7 (стр. 318), textMuted×4 (стр. 352), accent×1 (стр. 563)
- app/lesson_complete.tsx — 10: textMuted×6 (стр. 242), correct×1 (стр. 266), wrong×1 (стр. 1557), gold×1 (стр. 1826), textGhost×1 (стр. 1860)
- components/feedback/ResultsSequence.tsx — 8: accent×2 (стр. 899), textMuted×6 (стр. 924)
- components/feedback/VictoryBurst.tsx — 3: accent×1 (стр. 123), textMuted×2 (стр. 132)
- components/feedback/ComboHeatSlot.tsx — 2: textMuted×2 (стр. 126)
- components/feedback/ComboRing.tsx — 2: gold×1 (стр. 87), accent×1 (стр. 87)
- components/feedback/FeedbackPlashka.tsx — 2: correct×1 (стр. 69), wrong×1 (стр. 69)
- components/feedback/HybridRefreshControl.tsx — 2: accent×2 (стр. 24)
- components/feedback/TransitionBridge.tsx — 2: accent×1 (стр. 94), textMuted×1 (стр. 102)
- components/RankChangeBanner.tsx — 2: correct×1 (стр. 321), gold×1 (стр. 321)
- components/roulette_win_modal.tsx — 2: textMuted×1 (стр. 207), accent×1 (стр. 227)
- components/survey/SurveyRewardPanel.tsx — 2: wrong×2 (стр. 104)
- components/feedback/ProgressProofBlock.tsx — 1: textMuted×1 (стр. 18)
- components/prize_arc.tsx — 1: textMuted×1 (стр. 337)
- components/ReviewPromptModal.tsx — 1: textMuted×1 (стр. 220)
- components/RewardModalBackdrop.tsx — 1: gold×1 (стр. 217)

### Друзья (владелец не назван): 2 файлов, 4 обращений
- components/friends/FriendsGlassKit.tsx — 3: wrong×1 (стр. 261), textMuted×1 (стр. 261), correct×1 (стр. 261)
- components/friends_together/FriendListRow.tsx — 1: wrong×1 (стр. 126)
