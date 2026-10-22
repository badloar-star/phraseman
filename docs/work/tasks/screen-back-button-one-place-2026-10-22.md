# Task packet: кнопка «назад» в одном и том же месте на всех экранах

Governance-ID: TG-4A3363A21B3A
Governance-ID: TG-673CA94C1E57
Status: шаг 1 готов — компонент, сторож, база 80, инвентаризация; дальше волны
Owner: 5 · ВХОД И АККАУНТ (координатор 22.10, закон владельца)

## Outcome

Владелец (через координатора, капсом): «КНОПКА НАЗАД ВООБЩЕ ВЕЗДЕ ДОЛЖНА БЫТЬ В ОДНОМ И ТОМ ЖЕ МЕСТЕ НА АБСОЛЮТНО ВСЕХ
ЭКРАНАХ!» Поводы: «где кнопка назад?» на Пике с Главной и в «Вся глава» Сезона. Нужно: один общий компонент с
фиксированной позицией, сторож «все не-корневые экраны — только он и только там», инвентаризация и перевод экранов волнами.

## Scope

Шаг 1 (этот коммит): `components/v2/ScreenBackButton.tsx` + сторож `tests/screen_back_button_contract.test.ts` +
база «ещё не переведённых» `config/screen_back_baseline.json` (только уменьшается) + таблица инвентаризации.
Шаги 2…N: перевод свободных экранов своими кусками; занятые чужими правками — списком координатору.
Эмулятор не трогаем (запрет владельца) — только код.

## Architecture

Позиция — из эталона макетов 2.0 (`docs/design/v2-app/kit.css`), самый частый вариант «назад» в 158 макетах:
круг `.rb.l` 48 (54 места) в `.topbar` высотой 44 у верха контента; контент `.scr .in` начинается на 52 при строке
состояния `.sb` 50 → шапка на +2 от безопасного верха, круг 48 по центру шапки 44 → верх круга = безопасный верх + 0;
слева `--pad` = 20. Константы: `SCREEN_BACK_LEFT = 20`, `SCREEN_BACK_SIZE = 48`, `SCREEN_BACK_TOP_OFFSET = 0`,
верх = `useStableSafeAreaInsets().top + 0` (устойчивый отступ — без прыжка первого кадра).
Компонент кладётся прямым ребёнком корня экрана, который начинается от верхнего края (edge-to-edge), и рисуется
абсолютным слоем поверх — поэтому место одно и то же, как бы ни была свёрстана шапка. Вид — уже принятая
`BackButton` (глиф BackGlyph, заливка buttonFill, тень «Тень», зона 48 + hitSlop 6, журнал [BACK-BTN]); нажатие —
`safeRouterBack(router, fallback)` или свой обработчик (подтверждение выхода и т. п.). Своих стилей/смещений
компонент не принимает — сдвинуть его нельзя. Заголовок рядом оставляет слева `SCREEN_BACK_RESERVED`.

Сторож: (1) константы равны эталону kit.css; (2) любой файл app/** и components/**, где рисуется своя «назад»
(BackButton/PracticeBackButton/DialogueGlassBackButton/ResultsGlassBackButton/BackGlyph/стрелка chevron|arrow-back
пропом или именем), обязан быть в базе — база только уменьшается; новый экран — только ScreenBackButton.

## Security and privacy

Данных не касается.

## Technical debt

База «не переведённых» — долг, гасится волнами. Экраны внутри SafeAreaView с верхним краем должны снять верхний край
при переводе, иначе кнопка сместится на высоту отступа — проверяется в каждой волне.

## Verification

Сторож + back_glyph_contract + navigation_back*; срез проверки типов через светофор. Визуальная сверка — Сверкой,
когда снимут запрет на эмулятор.

## Rollback

`git revert` коммитов волны; база восстанавливается тем же откатом.

## Инвентаризация 22.10 (шаг 1)

Своя кнопка «назад» — 80 файлов (база `config/screen_back_baseline.json`). Занятые чужими правками: `app/privacy_settings.tsx`, `app/learning_v2_lesson_words.tsx` (новый файл другой сессии).

| Файл | Как рисует «назад» | Статус |
|---|---|---|
| app/(tabs)/lessons.tsx | BackGlyph | свободен |
| app/account_details.tsx | BackGlyph | свободен |
| app/achievements_screen.tsx | ResultsGlassBackButton | свободен |
| app/ai_companion_session.tsx | BackGlyph | свободен |
| app/ai_dialog_consent_gate.tsx | BackGlyph | свободен |
| app/ai_dialog_home.tsx | icon-prop | свободен |
| app/ai_dialog_session.tsx | BackGlyph | свободен |
| app/coin_rank.tsx | BackGlyph | свободен |
| app/coin_rank_catalog.tsx | BackGlyph | свободен |
| app/combined_lesson_pick.tsx | PracticeBackButton | свободен |
| app/dialogue_v2_completion.tsx | DialogueGlassBackButton | свободен |
| app/dialogue_v2_memory.tsx | BackGlyph | свободен |
| app/exam.tsx | PracticeBackButton | свободен |
| app/flashcards/CardsHubV2.tsx | BackGlyph | свободен |
| app/flashcards/CollectionDeckView.tsx | BackGlyph | свободен |
| app/flashcards/CollectionHeader.tsx | BackGlyph | свободен |
| app/flashcards/CollectionHeaderV2.tsx | BackButton | свободен |
| app/flashcards/TrainingSetupV2.tsx | BackButton | свободен |
| app/flashcards_blitz_session.tsx | PracticeBackButton | свободен |
| app/flashcards_packs.tsx | icon-prop | свободен |
| app/flashcards_recall_session.tsx | PracticeBackButton | свободен |
| app/flashcards_speaking_session.tsx | PracticeBackButton | свободен |
| app/flashcards_swipe.tsx | PracticeBackButton, icon-prop | свободен |
| app/flashcards_voice_picker.tsx | BackGlyph | свободен |
| app/hint.tsx | BackGlyph | свободен |
| app/language_welcome.tsx | BackGlyph | свободен |
| app/learning_v2_lesson_words.tsx | PracticeBackButton | ЗАНЯТ (новый, не закоммичен другой сессией) |
| app/lesson1.tsx | PracticeBackButton | свободен |
| app/lesson_complete.tsx | ResultsGlassBackButton, BackGlyph | свободен |
| app/lesson_help.tsx | PracticeBackButton | свободен |
| app/lesson_intro_screens.tsx | BackGlyph | свободен |
| app/lesson_irregular_verbs.tsx | PracticeBackButton | свободен |
| app/lesson_words.tsx | PracticeBackButton | свободен |
| app/lingman_playlist.tsx | BackGlyph | свободен |
| app/lingman_video_watch.tsx | BackGlyph | свободен |
| app/manage_subscription.tsx | BackGlyph | свободен |
| app/mistake_detail.tsx | BackButton | свободен |
| app/mistakes_hub.tsx | BackButton | свободен |
| app/mistakes_list.tsx | BackButton | свободен |
| app/preposition_drill.tsx | PracticeBackButton | свободен |
| app/privacy_settings.tsx | BackGlyph | ЗАНЯТ |
| app/runes_wallet.tsx | BackGlyph | свободен |
| app/settings_edu.tsx | BackGlyph | свободен |
| app/settings_notifications.tsx | BackGlyph | свободен |
| app/settings_themes.tsx | BackGlyph | свободен |
| app/shop.tsx | BackGlyph | свободен |
| app/streak_stats.tsx | BackGlyph | свободен |
| app/support_report.tsx | BackGlyph | свободен |
| app/survey_screen.tsx | BackGlyph | свободен |
| app/today_tasks.tsx | BackButton | свободен |
| app/year_activity.tsx | ResultsGlassBackButton | свободен |
| components/ActivityHeatmap365.tsx | BackGlyph | свободен |
| components/AiDialogBriefingScreen.tsx | BackGlyph | свободен |
| components/AppMessagesInbox.tsx | BackGlyph | свободен |
| components/LessonReviewSheet.tsx | BackGlyph | свободен |
| components/NotificationCenterButton.tsx | BackGlyph | свободен |
| components/VipSurveyModal.tsx | BackGlyph | свободен |
| components/dialogs/DialogueV2BriefingScreen.tsx | DialogueGlassBackButton | свободен |
| components/dialogs/DialogueV2FreeformScreen.tsx | DialogueGlassBackButton | свободен |
| components/dialogs/DialogueV2SessionScreen.tsx | DialogueGlassBackButton | свободен |
| components/dialogs/glass/DialogueGlassKit.tsx | DialogueGlassBackButton | свободен |
| components/dialogs/scene/DialogsSceneHub.tsx | icon-prop | свободен |
| components/home/v2/today_scene/TodaySceneView.tsx | BackButton | свободен |
| components/learning-v2/LearningV2ChapterExamResult.tsx | BackGlyph | свободен |
| components/learning-v2/LearningV2ChaptersCourse.tsx | BackGlyph | свободен |
| components/learning-v2/horizons/LearningV2Horizons.tsx | BackGlyph | свободен |
| components/learning-v2/season/SeasonCourseConnected.tsx | BackGlyph | свободен |
| components/lessons/LessonMenuGlass.tsx | icon-prop | свободен |
| components/level-exam/ExamGlassParts.tsx | PracticeBackButton | свободен |
| components/mistakes-panel/PanelKit.tsx | BackGlyph | свободен |
| components/packs/PackScreenKit.tsx | BackGlyph | свободен |
| components/practice/PracticeChrome.tsx | PracticeBackButton | свободен |
| components/spire/SpireAllMembers.tsx | BackGlyph | свободен |
| components/spire/SpireStepScreen.tsx | BackGlyph | свободен |
| components/streak/StreakStagesModal.tsx | BackGlyph | свободен |
| components/survey/SurveyRewardPanel.tsx | BackGlyph | свободен |
| components/survey/SurveySheetModal.tsx | BackGlyph | свободен |
| components/theory/TheoryLessonView.tsx | PracticeBackButton | свободен |
| components/v2/V2Kit.tsx | icon-prop | свободен |
| components/youtube/YoutubeChannelHeader.tsx | BackGlyph | свободен |

Маршруты без найденной кнопки «назад» (своя разметка, NavIcon с переменной или кнопки нет вовсе) — проверить вручную в волнах:
- `app/community_packs/PackCommentsSheet.tsx`
- `app/community_packs/ReportCommentModal.tsx`
- `app/community_packs/UgcPackEditorCardPreview.tsx`
- `app/community_pack_create.tsx`
- `app/flashcards_audio.tsx`
- `app/friends_duel.tsx`
- `app/learning-v2/session/[id].tsx`
- `app/learning_v2_session_intro.tsx`
- `app/learning_v2_session_intro_check.tsx`
- `app/lesson_verbs.tsx`
- `app/pack_opening.tsx`
- `app/premium_modal.tsx`
- `app/premium_modal_v2.tsx`
- `app/privacy_screen.tsx`
- `app/promo_code_entry.tsx`
- `app/referrals.tsx`
- `app/referral_access_ended_modal.tsx`
- `app/settings_language.tsx`
- `app/shards_shop.tsx`
- `app/terms_screen.tsx`
- `app/voice_equalizer.tsx`

Корни вкладок кнопки «назад» не имеют (некуда возвращаться) — вопрос к координатору про случай, когда вкладку открыли с Главной (Пик с Главной: «где кнопка назад?»): показывать ли «назад», когда вкладку открыли с Главной.

## Волна 1 (22.10)

- Вкладки: `TabPageContext` (components/tab_top_bleed.ts, ставит TabSlider) — кнопка различает экран стека (верх = безопасный
  верх) и страницу вкладки (верх = зона часов полноэкранной страницы или 0 под отступом оболочки). Без этого во вкладках
  отступ складывался бы дважды.
- «Сегодня» (`app/today_tasks.tsx`) переведена: кнопка — ScreenBackButton, в строке шапки — место под неё (48), шапка высотой
  48 (заголовок по центру кнопки, как `.topbar` макета). База 80 → 78 (ещё `TheoryLessonView` — его переводит другая сессия).
- ВОПРОС координатору — подвиды внутри вкладки под её шапкой (Пик «Все участники»/«Шаг» под «Друзья/Пик/Наборы»,
  «Обучение» → «Все уроки», «Вся глава»): кнопка на общем месте легла бы на шапку вкладки. Предложение: такие подвиды
  открывать полноэкранно поверх шапки вкладки — тогда «назад» на общем месте. До решения — не трогаю.
- Волна 2: «Слова урока» Learning V2 (`app/learning_v2_lesson_words.tsx`, файл 2·ДИЗАЙН 0eb910479 — координатор поручил
  перевести) — кнопка слоем вне ContentWrap, заголовок справа и по центру кнопки. База 78 → 77.
- Решения координатора 22.10: поле 20 и PressableHybrid приняты; Пик/корень вкладки, открытый НЕ из нижнего меню, —
  показывать ScreenBackButton; «Вся глава» — пропуск (экран урока переделывается).
