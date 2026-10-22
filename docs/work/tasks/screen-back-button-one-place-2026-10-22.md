# Task packet: кнопка «назад» в одном и том же месте на всех экранах

Governance-ID: TG-D1C1EEB663E1
Governance-ID: TG-21BDFC7D3D09
Governance-ID: TG-E26D9E61A8B2
Governance-ID: TG-1B219FAA61E1
Governance-ID: TG-F2D9DC31FE4C
Governance-ID: TG-4A3363A21B3A
Governance-ID: TG-673CA94C1E57
Governance-ID: TG-629E00F2EA05
Governance-ID: TG-361F0CF5B99D
Governance-ID: TG-3F12C808BE0E
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
- Волна 3: корень вкладки, открытый НЕ из нижнего меню (решение координатора) — начато с «Сообщества» (Пик с Главной,
  «Сегодня», пуш). `app/tab_entry_source.ts`: оболочка вкладок отмечает вход тапом по меню и свайпом; вкладка, ставшая
  видимой без отметки, открыта ссылкой → ScreenBackButton (запасной путь — Главная), ряд вкладок раздела сдвигается вправо.
  Журнал [BACK-TAB]. Остальные вкладки (Обучение, Видео, Настройки) — тем же механизмом следующей волной.
  Попутно красные чужие: `SpireTower.tsx` > 400 строк (8321305c7), dev_links `#fc-zoom-*`, тип LIGHT_SHADOW в
  `learning_v2_task_theme_tokens.ts` (незакоммиченная правка другой сессии).
- Решение координатора 22.10 — вариант А: подвиды вкладки («Все участники», «Шаг» Пика, «Все уроки», списки глав/эпизодов)
  открываются ПОЛНОЭКРАННО поверх шапки вкладки, «назад» в общем месте. SeasonCourse.tsx не трогать (переделывает
  2·ДИЗАЙН). Волна 4 — Пик: `ScreenOriginReset` (сброс признака страницы вкладки внутри Modal), «Шаг» (уже Modal) и
  «Все участники» (теперь Modal поверх вкладки, Пик под ним остаётся смонтированным).
  Сделано: «Шаг» и «Все участники» на ScreenBackButton внутри ScreenOriginReset; «Все участники» — Modal fullScreen поверх
  вкладки; в «Сообществе» сдвиг передан и рисованным вкладкам слоя «Сцены» (`tabsInset={backInset}`, проп 3·МАКЕТЫ
  7961dde6a; строку в tests/spire_scene_contract.test.ts обновил под их просьбу). База 77 → 75.
  Чужие красные: spire_a11y_labels (SpireTower.tsx onPressMe — незакоммичено), spire_scene_contract «журнал башни»
  (SpireScene.tsx — незакоммичено), SpireTower > 400 строк.
- Волна 5 — «Ошибки»: хаб, список (в режиме поиска «назад» закрывает поиск), карточка ошибки — ScreenBackButton слоем,
  больше не уезжает с прокруткой; шапки/герой от безопасного верха, место 48. Хаб Сезона (95dfc2b09, 2·ДИЗАЙН) убрал
  старую «назад» — вычеркнут. База 75 → 71. PanelKit BackButton остаётся: им ещё пользуются Карточки
  (CollectionHeaderV2, TrainingSetupV2) — следующая волна.
- Вопрос координатору (открыт): экраны с ✕ «закрыть» (settings_language, promo, referrals, pack_opening, интро занятия,
  дуэль) — менять на «назад» или оставить ✕ по макетам.
- Волна 6 — Карточки, часть 1: настройка тренировки (TrainingSetupV2 — место 48, кнопка у хозяина
  flashcards_training_setup). База 71 → 70. Коллекция Карточек (flashcards_collection) — отдельной волной: 7 шапок со
  своей «назад» (VideoSetView, CommunityPackPreview(+Skeleton), CollectionTopBar, PackTopBar, CollectionHeader,
  PackOpenFailedView) → одна ScreenBackButton у корня, в режиме выбора — без «назад».
- Решение владельца по ✕ (вариант В): ✕ остаётся там, где по макетам, но общим компонентом — та же точка и круг 48,
  знак ✕; аппаратная «назад» = ✕; сторож распространяется на ✕. Порядок: Карточки → крестики.
- Волна 7 — коллекция Карточек (готово в коде, прогон после тишины): 6 шапок (VideoSetView, CommunityPackPreview(+Skeleton),
  PackTopBar, CollectionTopBar, CollectionHeader) — место `ScreenBackSlot`; одна ScreenBackButton у корня
  flashcards_collection (в режиме выбора её нет, «Отмена»; при «набор не открылся» — leaveCollection). Сторож теперь
  видит и `PackBackBare` (кнопка без круга шапок наборов) — в базу добавлены MyPacksV2 и flashcards_video_packs.
- Крестик (вариант В): `CloseGlyph` (kit.js close), `BackButton glyph="close"`, `ScreenCloseButton` — та же точка и круг,
  системная «назад» Android = ✕ (BackHandler на фокусе).
- Крестики (готово в коде, прогон после тишины): settings_language, pack_opening, интро занятия и его проверка, дуэль
  (сообщение/итог/игра; самодельный DuelCloseButton снят), документы LegalDocumentSheet (приватность/условия) — общий
  ScreenCloseButton. Новое: `ScreenBackSlot` (место под кнопку в строке шапки), `ScreenOriginBelowSafeTop` (содержимое уже
  под безопасным верхом — кнопка считает верх от него). Сторож: храповик своих ✕ в app/** (`config/screen_close_baseline.json`,
  17 — там и законные ✕ шторок/очистки поля, разбирать волнами). Отложено: промокод/рефералы (SectionSheetHeader, ✕ справа
  по стандарту 12.10 — вопрос координатору), редактор набора (PackEditorV2.tsx занят чужой правкой).
- Промокод и рефералы (координатор 22.10: «новый закон отменяет стандарт 12.10 „✕ справа“»): SectionSheetHeader закрывается
  общим ScreenCloseButton слева сверху (внутри ScreenOriginBelowSafeTop — шапка первой под безопасным верхом хозяина), справа
  только аксессуар; варианты closeVariant/motionVariant и самодельный ✕ сняты. Сторож section_sheet_header_close_right
  ЗАМЕНЁН на section_sheet_header_close_left (проверяет общий ✕ слева и аксессуар справа).
- Проверки перед коммитом (тишина снята частично): 116 наборов тестов по затронутым файлам — свои падения исправлены
  (сторож заготовки предпросмотра, храповик ✕ + витрина режимов в базе, ✕ устойчив к подмене react-native без BackHandler);
  чужие: reachable_action_buttons (chapter-exam), flashcards_liquid_hub ×4 (isLiteModeOn не подменён, c0bfb85b7),
  flashcards_saved_liquid ×2 (CollectionListView). Node-сторожа 15/15, срез типов 0.
  tests/learning_v2_intro_reader_a.test.tsx в коммит НЕ вошёл: в файле чужие незакоммиченные правки; мои куски (подмена
  ScreenBackButton, зона 48) остаются в рабочей копии; этот файл в набор запуска не входит.
- Красные после волн (координатор 22.10): spire_shadow_style_fixes — «Все участники» сняты из списка «берёт тень из
  useSpireShadow» (их единственная тень была у своей «назад», теперь общая кнопка со своей тенью); flashcards_liquid_hub ×4 —
  харнесс не знал ./lite_mode_flag (c0bfb85b7), дана заглушка «выключен»; flashcards_saved_liquid ×2 — сторож держал
  подсказку «Зажми карточку», снятую в 6ed749216 (удаление — свайп с корзиной), переведён на свайп.
- Волна 8 — Настройки ×3 (обучение, темы, аккаунт): общий перенос (codemod) — стрелка в начале прокрутки → ScreenBackSlot,
  ScreenBackButton у ScreenGradient с теми же testID/подписью/обработчиком (у аккаунта сохранён запрет ухода во время
  выхода). Сторож settings_edu переведён. База 70 → 67. Уведомления, подписка, отчёт об ошибке — устроены иначе, вручную.
- Волны 9–11: Настройки ещё ×3 (уведомления — убрана двойная вибрация; подписка — кнопка перед прокруткой, порядок LP и один
  поток SafeAreaView сохранены; отчёт об ошибке), Итоги ×3 (год активности, достижения, итог урока — обе кнопки) и Диалоги ×4
  (брифинг, свободный, занятие — «назад»; итог диалога — ✕). Новое: SafeTopBackButton / SafeTopCloseButton — первым ребёнком
  в потоке под безопасным верхом (абсолютный слой не учитывает отступ родителя). Сторожа обновлены: уведомления, отчёт,
  подписка ×2, итоги. База 67 → 57. Чужие красные: dialogue_v2_wait_typing (app/dialogue_v2_session.tsx, 4b9f71abc),
  paywall_entry_callsite_registry (app/dev_dialogs_scene_preview.tsx).
- Волна 12 (Практика ×8): комбо-урок, неправильные глаголы, предлоги, теория урока, урок 1 (+ заготовка загрузки той же
  высоты), «Вспомни» ✕ (в строке монет), «Устно» ✕, Блиц (‹ на загрузке/«мало карточек», ✕ в занятии). Четыре поведенческих
  теста тренировок подменяют общую кнопку. Замок владельца отмечен в двух сторожах. База 57 → 49.
- ЗАМОК 22.10 «не пересекается с другими элементами»: SCREEN_BACK_GAP/ZONE, ScreenBackZone, useScreenBackContentTop; полоса или
  строка шапки с местом — ДО прокрутки. 15 экранов приведены; сторож screen_back_content_below_contract (дерево TS). Ждут:
  mistake_detail (герой от верха по макету — вопрос координатору), TheoryLessonView (правит другая сессия).
