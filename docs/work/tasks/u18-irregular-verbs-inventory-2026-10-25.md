Governance-ID: TG-4B2513FACD57

# U18 · Экран «Неправильные глаголы» — опись и план переноса на макет H1–H5 (2026-10-25)

Только чтение. Файл: `app/lesson_irregular_verbs.tsx` (1369 стр.). Эталон: `docs/design/v2-app/learn.html`, раздел H (стр. 706–720 и список кадров стр. 849–850; реестр сверки: learn-064 H1, 065 H2, 066 H3, 067 H4, 068 H4б, 069 H5 — все `pending`, снимка свежего нет).
Состав экрана: корень `LessonIrregularVerbs` (1171), вкладка тренировки `LearnTab` (247), вкладка словаря `DictTab` (1108) + таблица `IrregVerbsScrollTable` (986), заглушка `FrenchIrregularVerbsUnavailable` (1142). Внешнее: `components/VerbLetterBank.tsx` (157) + `app/verb_letter_bank.ts`, `app/irregular_verbs_data.ts`, `app/irregular_verb_options.ts`, `app/irregular_verb_portion_progress.ts`, `components/completion/V2DoneScreen.tsx`, `components/session_attempts/SessionAttemptsHud.tsx`, `components/NoEnergyModal.tsx`, `components/PracticeRuneCounter.tsx`, `hooks/usePracticeRunes.ts`, `hooks/useFirstQuestionEnergyGate.ts`, `components/practice/PracticeChrome|PracticeStates`, `components/v2/ScreenBackButton.tsx`, `app/lesson_runtime_access_boundary.tsx` (обёртка экспорта, 1369).

## 1. Вход и выход
- Маршрут `/lesson_irregular_verbs`, параметры: `id` (номер урока, по умолчанию `'1'`, стр. 1188), служебные `devRunesSeed`, `devJumpToFinale='1'` (только DEV-хаб).
- Кто ведёт сюда: `app/lesson_menu.tsx:1181` (строка `lesson-menu-irregular-verbs`, `navOnce`-защита от двойного тапа; для урока без глаголов и для French вместо перехода открывается «скоро»); `app/lesson_verbs.tsx:16` (старый маршрут `/lesson_verbs` → редирект с теми же параметрами); `components/dev/DevHubSheet.tsx:549` (id=1 + прыжок на итог); `motion_showcase/sections/screens_learn.ts:16` и `runes_check.ts:26`. Регистрация в стеке: `app/_layout.tsx:3744`.
- Уроки с глаголами: 1,2,3(16),4,5,6,7,8,12(10),16,18,25,28,31. Порции по 6 только если глаголов ≥ 8 (`irregular_verbs_data.ts:206-225`): урок 3 → 6+5+5, урок 12 → 5+5. В макете «Урок 12 · 18 глаголов» — в данных у урока 12 их 10.
- Обёртка `withLessonRuntimeAccessBoundary` (1369): сначала проверка доступа к уроку (скелет первого кадра, при отказе — пейвол/окно доступа); сам экран рисуется только после «ок».
- Кнопка «назад»: `SafeTopBackButton` (1257), первый ребёнок под безопасным верхом, абсолютный слой слева 20, круг 48; рядом `ScreenBackSlot` + `PracticeHeaderTitle` (1259-1262). Тап: `fk.tap()` + `Keyboard.dismiss()` + `safeRouterBack(router, /lesson_menu?id=N)`. Подтверждения выхода НЕТ.
- Назад во время тренировки: сразу уходит. На размонтировании: стоп озвучки; если первый ответ не дан — энергия возвращается (`useFirstQuestionEnergyGate`, 312-319); выученные глаголы уже записаны в память по одному (596-610); накопленные руны остаются в локальной копилке и зачитываются только на экране итога (372-380). Системная «назад» Android не перехватывается (у `glyph="back"` нет BackHandler) — обычный возврат стека.
- Выход с итога: ✕ (`V2DoneScreen onClose`, 736), вторичная/главная кнопки (717-735) — везде `safeRouterBack` в меню урока. Заглушка French: `router.replace` в меню урока (1268).

## 2. Вкладки и экраны (выбор — состояния корня)
| Экран | Как выбирается | Код |
|---|---|---|
| Заглушка French | `frenchIrregularBlocked = !vocabularyContentAvailableForTarget(studyTarget,'irregular_verbs')` (1189); нижней вкладочной полосы нет | 1265, 1315 |
| Скелет «чтение прогресса» | `hydratedCountsKey !== irregularStorageKey` (пока из памяти не прочитан `globalCounts`), testID `irregular-verbs-progress-loading` | 1271-1280 |
| «Учить» (LearnTab) | `userTab` (null/'dict'/'learn'), по умолчанию `tab='learn'` (1200-1201); также если `practiceAll` | 1270-1301 |
| «Словарь» (DictTab) | `userTab==='dict'` и не `practiceAll` | 1302-1310 |
| Подэкран LearnTab: вопрос | `phase='answering'/'feedback'` (387); режим ввода: `recallActive` = глагол уже выучен (`initCounts[base]≥2`, на деле 3) → буквы; иначе 4 кнопки | 654, 859-908 |
| Подэкран LearnTab: итог порции | `allDone` (352) → `V2DoneScreen` | 680-739 |
| Пустая очередь | `!allDone && !activeVerb` → тихий уход назад (`useSilentLeave`), пока — пустой фон | 677-678, 741-745 |
- Переключатель `userTab` меняют: тап по сегменту (1348-1352), `onStartLearn` из словаря (1307), `onCancelStart`/закрытие окна «нет энергии» → 'dict' (1300, 1363). `practiceAll` включает «Начать заново» (1295-1298) и сбрасывается при тапе «Словарь» и смене урока (1207-1210). `learnTabKey` перемонтирует LearnTab (1282).
- Вход по умолчанию — «Учить» (закреплено тестом `energy_start_confirmation_contract`: владелец 24.08 «без окна подтверждения»). Полностью выученный урок: `activePortion=[]` → LearnTab сразу `allDone` → экран «Все глаголы выучены» без списания энергии.

## 3. Все кнопки
Почти ни у одной нет testID (в таблице «—»).
| Текст (ru) | Где | Что делает | Условия | testID |
|---|---|---|---|---|
| ‹ (a11y «Назад») | 1257 | `safeRouterBack` в `/lesson_menu` | всегда | — (внутри `BackButton`, screen=`lesson_irregular_verbs`) |
| «Учить» | сегмент 1318-1357 | `setUserTab('learn')` | не показан при French | — (role=tab) |
| «Словарь» | то же | `setUserTab('dict')`, `practiceAll=false`; из тренировки размонтирует LearnTab | то же | — |
| «Начать тренировку →» | DictTab 1136 | `fk.tap()`, `setUserTab('learn')` | всегда | — |
| 4 варианта слова | 879-903 | `handleTap(word, idx)` → проверка, озвучка тапнутого слова, `registerVerdict` | `phase==='answering'`; после ответа неверные тускнеют 0,4, значок ✓/✕ справа | — |
| Плитка буквы (банк) | VerbLetterBank 105-123 | добавить букву в ответ (+`hapticTap`) | не `disabled`, не использована | — |
| Буква в ответе | 78-94 | убрать букву | не `disabled` | — |
| Значок «стереть» (backspace) | 127-135 | очистить ответ | есть буквы | — |
| Зелёная кнопка со словом | 136-151 | `onSubmit(assembled)` → `handleRecallSubmit` → `handleTap(слово,-1)` | ≥1 буквы и не `disabled` | — |
| Слова base/past/pp в таблице | 1039-1059 | озвучка (`speakAudio`, en-US) | всегда | — |
| Значок «в карточки» | 1064 `AddToFlashcard` | сохраняет `base / past / pp` в карточки | лимит Free внутри компонента | — |
| «Сообщить об ошибке» | 911 (LearnTab), 1086 (таблица) | отправка репорта (`dataId` `irregular_verb_<base>` / `irregular_verbs_list_lesson_N`) | — | — |
| ✕ (итог) | V2DoneScreen | в меню урока | всегда | — |
| «Следующая порция» / «К уроку» (основная) | 714-724 | `continuePortion()` (после `settlePortion`) / назад | при `continuing` или `hydrating` тап игнорируется | `v2-done-primary` |
| «К уроку» / «Начать заново» (тихая) | 725-735 | назад / `continuePortion(true)` → `onReset` | то же | `v2-done-secondary` |
| «К уроку» (French) | 1158 | `router.replace` в меню | только French | `lesson-irregular-verbs-french-source-gate-back` |
| «Позже» / «Plus» в окне нет энергии | `NoEnergyModal` | закрыть → вкладка «Словарь»; Plus → пейвол | `noEnergyModalOpen` | `no-energy-modal-later`, `no-energy-modal-plus` |
Не кнопки, но с testID: `irregular-verbs-complete` (итог), `irregular-verbs-practice-runes` (счётчик рун), `irregular-verbs-session-attempts` (сердца).

## 4. Все состояния
| Состояние | Что видит пользователь | Код |
|---|---|---|
| Доступ к уроку проверяется | скелет урока обёртки | 1369 (+`lesson_runtime_access_boundary.tsx`) |
| French-источник закрыт | щит, заголовок/текст (ru/uk + 7 яз.), «К уроку»; сегмента нет | 1142-1168 |
| Чтение прогресса | скелет: полоса + пустая плашка | 1271-1280 |
| Словарь | «N / M выучено» + полоса, таблица, «Начать тренировку» | 1108-1140 |
| Вопрос, узнавание | плашка с переводом, цепочка base→past→pp с «?», подпись «Сначала попробуй вспомнить», 4 кнопки | 766-908 |
| Вопрос, воспроизведение | подпись «Собери форму из букв» + банк букв | 859-867 |
| Ответ верен | кнопка зелёная + ✓, ячейка цепочки — сплошная рамка зелёная, в ней форма; озвучка; ~800 мс и дальше | 515-531, 570-623 |
| Ответ неверен | выбранная красная + ✕, верная зелёная, в ячейке — ВЕРНАЯ форма (не введённая); сердце −1; запись в «Мои ошибки»; ~400 мс | 515-559 |
| Глагол освоен | всплывашка `VictoryBurst` «Глагол освоен» + «base – past – pp», звук `medal`, 1600 мс; полёт монет к счётчику | 586-611, 957-974 |
| Глагол с ошибкой | после 3-й формы возвращается в КОНЕЦ очереди (не освоен) | 615-621 |
| Сердца кончились | `isAttemptsStopEffect` → return без автоперехода; `useSessionAttemptAutoReset` сжигает руны порции, возвращает сердца, форма повторяется; в режиме Б энергии — пилюля энергии вместо сердец | 565-567, 633-651 |
| Нет энергии | при входе гейт `onInsufficient` → окно `NoEnergyModal variant="learn"`; закрыл → «Словарь» | 312-319, 1299, 1363 |
| Порция/раздел завершён | `V2DoneScreen`: «Порция глаголов пройдена» (есть следующая) или «Все глаголы выучены»; верно/ошибок/точность, +руны, список ошибок «глагол: введено → верно» | 680-739 |
| Идёт переход к след. порции | кнопка тап-игнор (`continuing`), без спиннера | 356, 448-487 |
| Сбой зачёта/перехода | под итогом текст «Не удалось сохранить награду. Нажми ещё раз.» (9 яз.) | 357, 704-713 |
| Урок без материала | тихий возврат в меню | 677 |
| DEV-прыжок на итог | сразу экран итога с поддельными рунами | 352, 331 |

## 5. Награды и счётчики
- Энергия: `ENERGY_SESSION_COST = 1` за вход (`energy_contract.ts:103`); списание окончательное после ПЕРВОГО ответа (`finalizeOn:'first_answer'`), выход без ответа — возврат; повторный вход в тот же раздел в окне 10 мин бесплатно (по комментарию 310-311); Plus — без списания. За ошибки энергия не тратится (режим А). Комментарии «10 ⚡» (491) устарели.
- Руны: `PRACTICE_RUNE_FULL_AWARD=3` за глагол с ЧИСТЫМ проходом всех трёх форм при первом прохождении, повтор — 1; воскресенье ×2; дубль за тот же глагол в копилке не платится (`practice_rune_earnings.ts:31-34`, `usePracticeRunes.onCorrectAnswer`, стр. 583). Копилка в AsyncStorage; на сервер уходит ОДНА операция при `settle()` на экране итога (372-380), `settlePracticeRuneEarningsToServer`. В итоге показано `practiceRunes.runes` (702).
- Очки/XP: `totalPts` (331) заведён, но на экране не показывается; XP запрещён тестом.
- Счётчики: `learnedCnt` / `portionVerbs.length` — по порции (776); `counts[base]=3` ставится только при чистом проходе (591), других значений нет; `REQUIRED=3` — порог «выучен» в словаре; верно/ошибок итога — `runCorrectRef/runWrongRef` считают КАЖДЫЙ ответ (по формам), не глаголы.
- Хранилище: `irregular_verbs_global` (для английской цели; для других — `scopedOrLegacyKey` в домене `lesson_progress`, `target_storage_keys.ts:228`); сердца `useSessionAttempts` ключ `irregular-verbs:<цель>:<урок>`; копилка рун/отметка `settledOnce` — `practice_rune_earnings`; `user_name`, настройки озвучки (`loadSettings`) читаются. Запись прогресса с `catch` и лог `[IRREGULAR-VERBS] progress write FAILED` (закреплён тестом).
- Попытки: `registerVerdict` на каждый ответ (`'correct'`/`'pedagogical_wrong'`), id `сессия:глагол:форма:счётчик`.
- «Мои ошибки»: `captureCurrentAccountObjectiveAttempt` на каждый неверный ответ (`sourceKind:'irregular_verb'`, 541-558).
- Сервер/Firestore: в самом файле прямых вызовов Firestore НЕТ. Косвенно: зачёт рун (1 вызов на порцию), списание/возврат энергии (`EnergyContext`), проверка доступа к уроку (обёртка), репорт ошибки (`submitErrorReport`), `AddToFlashcard` (локально + аналитика). Дропа карточек/осколков за раздел нет (удалено D140; тест `portion_transition` сторожит).

## 6. Тексты
Через `triLang` (9 языков ru/uk/en/es/pt-BR/vi/id/tr/pl): подписи времён (`verbTenseCaptions` 220), «N / M выучено», подсказки «Собери форму из букв»/«Сначала попробуй вспомнить» (762), заголовки/подзаголовок/кнопки итога (686-727), «Не удалось сохранить награду…», a11y «Назад», вкладки (частично), текст репорта, French-заглушка (`frenchVocabularyGateCopy`), «Глагол освоен» (`feedback_i18n`).
НЕ полностью 9-языковые / не через `triLang`: заголовок для `id` — английское «Irregular verbs» (1247); у `en`/`es` заголовок и вкладки берутся из пакета `stringsForLang` (`lessonMenu.verbs`, `vocab`, `words.training`) — в ru-пакете это «Неправильные формы глаголов»; шапка словаря = `sv.base/past/pp/tr` пакета («Основа», «Past Simple», «Past Participle», «Перевод» — не «настоящее/прошлое/причастие»); «Начать тренировку» — `words.listStartTraining` (пакет); переводы глаголов — поля данных `ru/uk/es/pt-BR/vi/id/tr/pl` (для `en` — `verb.ru`, т.е. русский; для es есть словарь-запас 103-205); `form`-ярлыки в репорте — английские слова `past/pp/base`; в банке букв «· · ·» и «—». Мёртвое: `formRowMeta` («V1·»), `userName`, `showAttemptsModal`, `isLightTheme`, `pack` в DictTab, второй набор подписей в `irregular_verb_form_caption.ts`.

## 7. Переходы
- Порядок форм `FORM_SEQ = ['past','pp','base']` (90): шаг 0 спрашивает V2, шаг 1 — V3, шаг 2 — V1; цепочка показывает остальные две формы (751-755).
- Ответ → `locked` + `phase='feedback'` → таймер 800 мс (верно) / 400 мс (неверно) (82, 623) → следующая форма (`buildStep`: новые 4 варианта) или конец глагола. Озвучка тапнутого слова — сразу, не после таймера (тест `selected_audio_contract`).
- Конец глагола (после 3-й формы): чисто → руны, burst, `counts`+память, `learnedCnt+1`, глагол вон из очереди; с ошибкой → в конец очереди. Очередь пуста → `setAllDone(true)`.
- Остановка по сердцам: таймер НЕ запускается (return 566), экран ждёт автосброса (страховка 8 с, `INPUT_LOCK_WATCHDOG_MS`), потом та же форма заново (`letterBankKey+1`).
- Итог → `settlePortion` (эффект 372) → кнопки: «Следующая порция» (`continuePortion`: ждёт зачёт, `startNewCompletionIfSettled`, подставляет `sectionProgress.next`, обнуляет `learnedCnt`, остаёмся на том же оплаченном входе) или «К уроку»; когда порций больше нет — «К уроку» / «Начать заново» (`onReset` → `practiceAll=true`, перемонтирование, ВСЕ глаголы урока в режиме букв, повтор по 1 руне).
- Ошибка на 1-й форме не прерывает глагол: все 3 формы проходятся, глагол потом возвращается.

## 8. Отличия от эталона H1–H5
Общее для всех кадров:
- Шапка макета: «‹» + «Неправильные глаголы» + подзаголовок («Урок 12 · 18 глаголов» / «Учить · 4 / 18»), справа ничего (`plus:true`). В коде: заголовок «N. Неправильные глаголы» без подзаголовка (1261); справа ряд «рунный счётчик + сердца» (787-802) — в макете их нет.
- Макет в режиме «Учить» без нижнего сегмента; код держит сегмент «Учить | Словарь» всегда (1315) и в ПОРЯДКЕ ОБРАТНОМ макету (код: Учить, Словарь; макет `tabbar('Словарь','Учить')`).
- Индикатор прогресса макета — только полоса `.trk` 6 px, 22 % = 4/18 УРОКА; код: текст «k / M выучено» над полосой по ПОРЦИИ (учтено тестом `${learnedCnt} / ${portionVerbs.length}`).
H1 Словарь:
- Подзаголовок шапки нет. Колонки: у макета «настоящее / прошлое / причастие / перевод», 12 px, равные доли (flex), без прокрутки; у кода «Основа / Past Simple / Past Participle / Перевод» 13 px, фикс. ширины 104/104/104/170/40, горизонтальная прокрутка + самодельный бегунок (1080), лишняя колонка «в карточки» и озвучка тапом, кнопка «Сообщить об ошибке» под таблицей, кнопка «Начать тренировку» в самом низу — всего этого в H1 нет.
- Выученные приглушены — совпадает (но перевод в коде всегда приглушён). Полоса «6 / 18 выучено» — совпадает по смыслу.
H2 «вспомнить»:
- Макет: подпись «Сначала попробуй вспомнить», строка «идти → шёл», цепочка `go → ? → gone`, внизу призрачная кнопка «Показать форму», вариантов нет. Код: те же подпись и цепочка, но сразу 4 варианта ответа, кнопки «Показать форму» нет, перевод — общий («Идти; ехать»), а не «инфинитив → форма на русском» (русских прошедших форм в данных нет).
- Подписи под цепочкой: макет 12 px, код 13; ячейка пропуска совпадает (92×48, штрих).
H3 «собери из букв»:
- Макет: слоты по числу букв (44×52, подчёркнутые, заполненные белее), плитки букв 52×56 с рамкой-линией, без кнопок; проверка САМА, когда слоты заполнены. Код: одна строка ответа с подчёркиванием и плитками-«чипами» зелёного тона, банк плиток без рамки (цвета `theme`, не `glass`), кнопка «стереть» и зелёная кнопка-слово для отправки; число слотов не показано.
H4 верно / H4б неверно:
- Макет: в ячейке цепочки — ВВЕДЁННАЯ форма (`went` зелёная; `wont` красная), под цепочкой строка вердикта («Верно — went» / «Правильно: went») со значком, внизу главная кнопка «Дальше →» (переход вручную). Код: в ячейке всегда ВЕРНАЯ форма в цвете исхода, строки вердикта нет, кнопки «Дальше» нет — автопереход по таймеру.
H5 итог порции:
- Совпадает: общий экран, заголовок «Порция глаголов пройдена», подзаголовок «Неправильные глаголы · Урок N · K глаголов», «Следующая порция» / «К уроку», список ошибок «go: wont → went», рунная награда.
- Расходится: статистика в макете «5 верно / 1 ошибок / 83 %» — по ГЛАГОЛАМ (6), код считает по ответам-формам (до 18+); нет блока «Глаголы запомнились?» (оценка), у слов он есть через `FeedbackRatingCard`; допустимые виды оценки на сервере: `lesson|learning_v2|vocab|dialogue|arena_blitz|arena_rating` — вида «глаголы» нет (`app/feedback_client.ts:18`, `functions/src/feedback_entries.ts`).

## 9. План переноса (каждый шаг — отдельный коммит; решения владельца Q1–Q5 в конце)
| № | Что меняется | Файлы | Риск | Что закрепляет текущее | Часы | Вид |
|---|---|---|---|---|---|---|
| 0 | Сторож-тест на «как есть» (порядок форм, задержки 800/400, чистый проход → 3, запись ключа) + testID на сегмент, плашку, цепочку, варианты | `app/lesson_irregular_verbs.tsx`, новый `tests/irregular_verbs_screen_contract.test.ts` | нулевой; руны/счёт не трогаем | — | 1,5 | не меняет поведение |
| 1 | Шапка: заголовок «Неправильные глаголы» + подзаголовок «Урок N · M глаголов» / «Учить · k / M» (9 языков, `PracticeHeaderTitle subtitle`) | основной файл | малый; подсчёт M (по уроку или порции, Q1); тест `portion_transition` ждёт `${learnedCnt} / ${portionVerbs.length}` | `portion_transition`, `verdicts_7c831a193` (стр. 770/807/852) | 1 | только вид |
| 2 | Словарь H1: подписи «настоящее/прошлое/причастие/перевод» (взять `verbTenseCaptions`), 12 px, равные доли; решить судьбу прокрутки, колонки «в карточки», озвучки, «Сообщить», кнопки старта (Q2) | основной файл | средний: уберёшь `Animated.event` — упадут проверки `useNativeDriver:true` | `interaction_responsiveness_contract`, `animated_event_scrollview_contract`, `kit_progress_fill_contract`, `learn_lesson_exams_liquid_glass…mjs` | 2–3 | только вид (+ потеря функций, если Q2=убрать) |
| 3 | Сегмент: порядок «Словарь | Учить», показывать только в словаре; в «Учить» — без сегмента (выход — «назад»/результат) | основной файл | средний: меняется навигация; вход по умолчанию остаётся «Учить» (Q3) | `energy_start_confirmation_contract` (стр. 14-15 жёстко: порядок и дефолт) — правка теста осознанная | 1,5 | поведение навигации |
| 4 | Карточка вопроса: подписи 12 px, строка «инфинитив → форма» (Q4: нужны русские формы в данных 9 языков; пока оставить перевод) | основной файл (+ данные) | средний, если трогать данные (`irregular_verbs_locale.test`) | `irregular_verbs_locale`, `user_reports_2026_10_14_content` | 1 (без данных) / 6+ (с данными) | вид / контент |
| 5 | Банк букв по H3: слоты по длине слова, плитки 52×56 на токенах `glass`, авто-проверка при заполнении, без кнопки «слово» (оставить «стереть»?), testID | `components/VerbLetterBank.tsx`, основной файл | высокий: путь `handleTap(слово,-1)` общий с попытками/рунами; не сломать «возврат формы» после сгорания сердец (`letterBankKey`) | `verb_letter_bank.test` (чистая логика не меняется), `button_row_gap_guard` (исключение для файла), `attempts_integration` | 3 | поведение (авто-submit) + вид |
| 6 | «Показать форму» в H2: новое подсостояние «вспоминаю» → тап раскрывает ввод (варианты/буквы) | основной файл | высокий: надо решить, считается ли «показать» ошибкой и тратит ли сердце (Q5) | `attempts_stop_all_screens_contract` (регэксп на `return` до автоперехода), `selected_audio_contract` | 3 | поведение |
| 7 | Вердикт H4/H4б: в ячейке введённая форма красным при неверном, строка «Верно — went»/«Правильно: went», кнопка «Дальше →»; решение — таймер или вручную (Q5) | основной файл | высокий: убираем `setTimeout` 800/400 — задеть поток награды, озвучки, остановки сердец; если оставить таймер — только вид | `attempts_integration` (3 теста), `attempts_stop_all_screens_contract`, `selected_audio_contract`, `practice_rune_screen_wiring_contract` | 3–4 | вид (таймер) / поведение (вручную) |
| 8 | Итог H5: статистика по глаголам (считать за глагол, не за форму), блок «Глаголы запомнились?» (`FeedbackRatingCard` в `feedbackSlot`; новый вид оценки требует правки сервера `functions/src/feedback_entries.ts` + выкладки, либо временно `vocab`) | основной файл, `app/feedback_client.ts`, `functions/src/*` | средний: счётчик рун и `runCorrectRef` не смешивать; сервер — отдельное решение | `portion_transition` (continuePortion), `use_practice_runes.test`, `admin_ratings_dashboard_contract` | 2 (без сервера) / 4 (с сервером) | счёт — поведение, блок — вид |
| 9 | Уборка: удалить `showAttemptsModal`, `formRowMeta`, `userName`, `isLightTheme`, устаревшие «10 ⚡», «Irregular verbs» для `id` → перевод | основной файл | малый; сторожа читают текст файла — прогнать список ниже | все «читающие исходник» тесты | 1 | без поведения |
| 10 | Свежие снимки H1–H5 на эмуляторе и обновление реестра learn-064…069 (хэши доказательств) | `docs/phraseman-2.0/registries/visual_parity.json` + evidence | процессный | `visual_parity_gate` (35/35) | 1,5 | — |
Итого ≈ 17–25 ч (зависит от Q2/Q4/Q5).

Тесты, которые читают файл экрана или его части (при каждом шаге прогонять, начиная с шага 0): `tests/irregular_verbs_attempts_integration.test.tsx`, `irregular_verbs_portion_transition.test.ts` (достаёт тело `continuePortion` через AST — не переименовывать), `irregular_verbs_selected_audio_contract.test.ts` (срез от `const handleTap = useCallback` до `const handleRecallSubmit = useCallback`), `irregular_verbs_locale.test.ts`, `irregular_verb_options.test.ts`, `irregular_verb_portion_progress.test.ts`, `verb_letter_bank.test.ts`, `attempts_stop_all_screens_contract.test.ts`, `energy_start_confirmation_contract.test.ts`, `energy_start_cost_contract.test.ts`, `energy_session_callsites_contract.ts`, `session_attempts_screen_wiring_gate.ts`, `session_attempts_registry.test.ts`, `practice_rune_screen_wiring_contract.test.ts`, `use_practice_runes.test.ts`, `interaction_responsiveness_contract.test.ts`, `animated_event_scrollview_contract.test.ts`, `kit_progress_fill_contract.test.ts`, `button_row_gap_guard.test.ts`, `learn_lesson_exams_liquid_glass_source_contract.test.mjs`, `verdicts_7c831a193_app_fixes_contract.test.ts` (стр. 28-37), `user_reports_2026_10_14_content.test.ts`, `lessons_overlays_audit_r58.test.ts`, `direct_lesson_runtime_access_boundary_contract.test.ts`, `mistake_practice_source_capture_contract.test.ts`, `mistake_journal_record_and_totals_contract.test.ts`, `gustav_french_vocabulary_target_gate.test.ts`, `gustav_french_lesson_entry_points_gate.test.ts`, `gustav_target_storage_keys.test.ts`, `energy_modal_texts_match_section.test.ts`. Пример перед коммитом: `node --test tests/learn_lesson_exams_liquid_glass_source_contract.test.mjs`.

Вопросы владельцу (через координатора): Q1 знаменатель «k / M» в шапке и полосе — урок (как макет) или порция (как сейчас)? Q2 что делать со всем, чего нет в H1 (прокрутка вбок, «в карточки», озвучка по тапу, «Сообщить об ошибке», кнопка «Начать тренировку»)? Q3 дефолтная вкладка «Учить» остаётся, а сегмент — только в словаре? Q4 «идти → шёл» требует русских прошедших форм для 9 языков — делаем контент или оставляем перевод? Q5 «Дальше» вручную и «Показать форму» — как считаем в сердцах/рунах?
