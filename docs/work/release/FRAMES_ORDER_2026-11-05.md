# Заказ кадров Сверке (6) и Эмулятору (7) — перемер pending (2026-11-05)

Составил: 3 · МАКЕТЫ. Источник: `docs/phraseman-2.0/registries/visual_parity.json` (765 строк pending), порядок — по приоритету выпуска 2.1.0. Здесь первые **234** состояний; остальные 529 — в `FRAMES_ORDER_2026-11-05.json` (тот же порядок).

## Порядок приоритета (сколько pending в каждой ступени)
- P1 Главная: 17
- P2 Урок / классика / результаты: 111
- P3 Пик: 21
- P4 Сообщество: 11
- P5 Пейвол / Plus / монеты: 28
- P6 Настройки / профиль / аккаунт: 29
- P7 Онбординг / welcome: 12
- P8 Друзья / достижения: 5
- P9 прочие живые (карточки, видео, диалоги, мистейки и т.п.): 134
- P10 скрыто флагом / оверлеи / нет поверхности (в конец): 395

## Как снимать (для каждой строки ниже)
1. Размеры: **412×915** (основной) светлая **и** тёмная; **375×667** — только для строк с пометкой «+375» (первые 40).
2. Тема: по умолчанию графит (Deep sky для тёмной), состояние берётся из столбца «Состояние»; если нужный пользовательский сценарий (ранг, Plus/Free, ошибка сети, ноль энергии) — снять его dev-маршрутом/фикстурой, а не «похожим» экраном.
3. Имя файла: `docs/work/release/frames_2026-11-05/pending/<id>__<тема>-<размер>.png`, например `home-scene-003__graphite-dark-412x915.png`. Время снимка вписать в имя НЕ надо — системное; кадр без правильного состояния не класть (лучше ⬜, чем неверный).
4. Нельзя нажимать кнопки трат/удаления/покупки; вход/привязку не делать (пометить «нужен телефон владельца»).
5. Склейку «макет | приложение» собирает `docs/work/release/tools/compose_pair.cjs <id>` (читает макет из docs/design/v2-app/<файл>.html, телефон по номеру) — Сверке склеивать самому не нужно.
6. Вердикт ✅/🟡 я записываю в `docs/work/release/PENDING_VERDICTS_2026-11-05.json` ПРЕДЛОЖЕНИЕМ; в реестр `visual_parity.json` статус **match** ставит только координатор после просмотра склейки (правило реестра, поле reviewed_by) — по его слову перенесу.

## Заказ (234)
| # | id | Ступень | Экран · состояние | Макет (файл#телефон подпись) | Код (файл; маршрут/фикстуру уточняет Эмулятор) | Размеры |
|---|---|---|---|---|---|---|
| 1 | home-003 | P1 | Главная · Главная · английский — 4 плитки (Уроки, Диалоги, Карточки, Пик) с местом в лиге | home-by-language-mockup#10 Английский · 4 плитки с Пиком + фраза дня | components/home/v2/HomeV2FeatureTiles.tsx ; app/spire/spire_home_place.ts | 412×915 светл.+тёмн. +375×667 |
| 2 | home-004 | P1 | Главная · Главная · по языкам · испанский (фраза дня) | home-by-language-mockup#11 Испанский · 3 плитки (Диалоги, Карточки, Пик) + фраза дня | app/(tabs)/home.tsx ; components/home/v2/HomeV2Header.tsx | 412×915 светл.+тёмн. +375×667 |
| 3 | home-005 | P1 | Главная · Главная · по языкам · немецкий (фраза дня) | home-by-language-mockup#12 Немецкий · 3 плитки + фраза дня | app/(tabs)/home.tsx ; components/home/v2/HomeV2Header.tsx | 412×915 светл.+тёмн. +375×667 |
| 4 | home-006 | P1 | Главная · Главная · по языкам · итальянский (фраза дня) | home-by-language-mockup#14 Итальянский · Карточки, Пик, Наборы из видео + фраза дня | app/(tabs)/home.tsx ; components/home/v2/HomeV2Header.tsx | 412×915 светл.+тёмн. +375×667 |
| 5 | home-007 | P1 | Главная · ряд из 4 плиток · 4 плитки с Пиком, бейдж «N место», тема «Сумерки» | home-by-language-mockup#1 (в) иконки + место в лиге · «Сумерки» · 360 dp | components/home/v2/HomeV2FeatureTiles.tsx ; app/spire/spire_home_place.ts | 412×915 светл.+тёмн. +375×667 |
| 6 | home-008 | P1 | Главная · ряд из 4 плиток · 4 плитки с Пиком, бейдж «N место», тема «Океан» | home-by-language-mockup#3 (в) иконки + место в лиге · «Океан» · 360 dp | components/home/v2/HomeV2FeatureTiles.tsx ; app/spire/spire_home_place.ts | 412×915 светл.+тёмн. +375×667 |
| 7 | home-scene-001 | P1 | Главная · «Сцена» · Главная · Новичок: «Начать» (высота сцены — вариант 2 scenes-compact.html, 46 %) | home-scene-states#1 1 · Новичок: «Начать» | app/(tabs)/home.tsx ; components/home/v2/scene/HomeScene.tsx | 412×915 светл.+тёмн. +375×667 |
| 8 | home-scene-002 | P1 | Главная · «Сцена» · Главная · Продолжить эпизод, днём (высота сцены — вариант 2 scenes-compact.html, 46 %) | home-scene-states#2 2 · Продолжить эпизод, днём | app/(tabs)/home.tsx ; components/home/v2/scene/HomeScene.tsx | 412×915 светл.+тёмн. +375×667 |
| 9 | home-scene-003 | P1 | Главная · «Сцена» · Главная · Серия под угрозой, вечер (высота сцены — вариант 2 scenes-compact.html, 46 %) | home-scene-states#3 3 · Серия под угрозой, вечер | app/(tabs)/home.tsx ; components/home/v2/scene/HomeScene.tsx | 412×915 светл.+тёмн. +375×667 |
| 10 | home-scene-004 | P1 | Главная · «Сцена» · Главная · День выполнен, серия засчитана (высота сцены — вариант 2 scenes-compact.html, 46 %) | home-scene-states#4 4 · День выполнен, серия засчитана | app/(tabs)/home.tsx ; components/home/v2/scene/HomeScene.tsx | 412×915 светл.+тёмн. +375×667 |
| 11 | home-scene-005 | P1 | Главная · «Сцена» · Главная · 0 энергии (высота сцены — вариант 2 scenes-compact.html, 46 %) | home-scene-states#5 5 · 0 энергии | app/(tabs)/home.tsx ; components/home/v2/scene/HomeScene.tsx | 412×915 светл.+тёмн. +375×667 |
| 12 | home-scene-006 | P1 | Главная · «Сцена» · Главная · Нет сети (высота сцены — вариант 2 scenes-compact.html, 46 %) | home-scene-states#6 6 · Нет сети | app/(tabs)/home.tsx ; components/home/v2/scene/HomeScene.tsx | 412×915 светл.+тёмн. +375×667 |
| 13 | home-scene-007 | P1 | Главная · «Сцена» · Главная · Экзамен главы ждёт (высота сцены — вариант 2 scenes-compact.html, 46 %) | home-scene-states#7 7 · Экзамен главы ждёт | app/(tabs)/home.tsx ; components/home/v2/scene/HomeScene.tsx | 412×915 светл.+тёмн. +375×667 |
| 14 | home-scene-008 | P1 | Главная · «Сцена» · Главная · Серия прервалась, начни новую (высота сцены — вариант 2 scenes-compact.html, 46 %) | home-scene-states#8 8 · Серия прервалась, начни новую | app/(tabs)/home.tsx ; components/home/v2/scene/HomeScene.tsx | 412×915 светл.+тёмн. +375×667 |
| 15 | home-scene-009 | P1 | Главная · «Сцена» · Главная · С возвращением после 3+ дней (высота сцены — вариант 2 scenes-compact.html, 46 %) | home-scene-states#9 9 · С возвращением после 3+ дней | app/(tabs)/home.tsx ; components/home/v2/scene/HomeScene.tsx | 412×915 светл.+тёмн. +375×667 |
| 16 | home-scene-010 | P1 | Главная · «Сцена» · Главная · Всё выпущенное пройдено (высота сцены — вариант 2 scenes-compact.html, 46 %) | home-scene-states#10 10 · Всё выпущенное пройдено | app/(tabs)/home.tsx ; components/home/v2/scene/HomeScene.tsx | 412×915 светл.+тёмн. +375×667 |
| 17 | home-scene-011 | P1 | Главная · «Сцена» · Главная · Plus · продолжить днём (высота сцены — вариант 2 scenes-compact.html, 46 %) | home-scene-states#11 11 · Plus · продолжить днём | app/(tabs)/home.tsx ; components/home/v2/scene/HomeScene.tsx | 412×915 светл.+тёмн. +375×667 |
| 18 | practice-004 | P2 | Блиц · Потеря сердца | practice#4 Потеря сердца | app/flashcards_blitz_session.tsx ; components/practice/PracticeChrome.tsx | 412×915 светл.+тёмн. +375×667 |
| 19 | practice-005 | P2 | Устно · Ожидание — «Зажми и говори» | practice#5 Ожидание — «Зажми и говори» | app/flashcards_speaking_session.tsx ; components/practice/PracticeChrome.tsx | 412×915 светл.+тёмн. +375×667 |
| 20 | practice-006 | P2 | Устно · Идёт запись — «Слушаю…» | practice#6 Идёт запись — «Слушаю…» | app/flashcards_speaking_session.tsx ; components/practice/PracticeChrome.tsx | 412×915 светл.+тёмн. +375×667 |
| 21 | practice-007 | P2 | Устно · Распознано верно | practice#7 Распознано верно | app/flashcards_speaking_session.tsx ; components/practice/PracticeChrome.tsx | 412×915 светл.+тёмн. +375×667 |
| 22 | practice-008 | P2 | Устно · Не так — «Ещё раз» | practice#8 Не так — «Ещё раз» | app/flashcards_speaking_session.tsx ; components/practice/PracticeChrome.tsx | 412×915 светл.+тёмн. +375×667 |
| 23 | practice-009 | P2 | Правда / ложь · Вопрос | practice#9 Вопрос | app/flashcards_swipe.tsx ; components/practice/PracticeChrome.tsx | 412×915 светл.+тёмн. +375×667 |
| 24 | practice-010 | P2 | Правда / ложь · Ответил верно — «перевод совпадает» | practice#10 Ответил верно — «перевод совпадает» | app/flashcards_swipe.tsx ; components/practice/PracticeChrome.tsx | 412×915 светл.+тёмн. +375×667 |
| 25 | practice-011 | P2 | Правда / ложь · Ответил верно — «чужой перевод» | practice#11 Ответил верно — «чужой перевод» | app/flashcards_swipe.tsx ; components/practice/PracticeChrome.tsx | 412×915 светл.+тёмн. +375×667 |
| 26 | practice-012 | P2 | Правда / ложь · Ответил неверно | practice#12 Ответил неверно | app/flashcards_swipe.tsx ; components/practice/PracticeChrome.tsx | 412×915 светл.+тёмн. +375×667 |
| 27 | practice-013 | P2 | Вспомни и напиши · Поле ввода | practice#13 Поле ввода | app/flashcards_recall_session.tsx ; components/practice/PracticeChrome.tsx | 412×915 светл.+тёмн. +375×667 |
| 28 | practice-014 | P2 | Вспомни и напиши · Ввод с клавиатурой и подсказкой | practice#14 Ввод с клавиатурой и подсказкой | app/flashcards_recall_session.tsx ; components/practice/PracticeChrome.tsx | 412×915 светл.+тёмн. +375×667 |
| 29 | practice-015 | P2 | Вспомни и напиши · Верно | practice#15 Верно | app/flashcards_recall_session.tsx ; components/practice/PracticeChrome.tsx | 412×915 светл.+тёмн. +375×667 |
| 30 | practice-016 | P2 | Вспомни и напиши · Почти — опечатка | practice#16 Почти — опечатка | app/flashcards_recall_session.tsx ; components/practice/PracticeChrome.tsx | 412×915 светл.+тёмн. +375×667 |
| 31 | practice-017 | P2 | Вспомни и напиши · Неверно | practice#17 Неверно | app/flashcards_recall_session.tsx ; components/practice/PracticeChrome.tsx | 412×915 светл.+тёмн. +375×667 |
| 32 | practice-018 | P2 | Энергия (Free 5 / Plus не тратит) · Старт занятия: 5 → 4 | practice#18 Старт занятия: 5 → 4 | components/EnergyBar.tsx ; app/flashcards_swipe.tsx | 412×915 светл.+тёмн. +375×667 |
| 33 | practice-019 | P2 | Энергия (Free 5 / Plus не тратит) · Восстановление: 3 → 4 | practice#19 Восстановление: 3 → 4 | components/EnergyBar.tsx ; app/flashcards_swipe.tsx | 412×915 светл.+тёмн. +375×667 |
| 34 | practice-020 | P2 | Энергия (Free 5 / Plus не тратит) · Plus — энергии нет | practice#20 Plus — энергии нет | components/EnergyBar.tsx | 412×915 светл.+тёмн. +375×667 |
| 35 | practice-021 | P2 | Единый экран завершения · Без ошибок | practice#21 Без ошибок | app/flashcards/SessionResultScreen.tsx ; components/results/ResultsGlass.tsx | 412×915 светл.+тёмн. +375×667 |
| 36 | practice-022 | P2 | Единый экран завершения · С ошибками | practice#22 С ошибками | app/flashcards/SessionResultScreen.tsx ; components/results/ResultsGlass.tsx | 412×915 светл.+тёмн. +375×667 |
| 37 | practice-023 | P2 | Единый экран завершения · Оценка раскрыта, есть комментарий | practice#23 Оценка раскрыта, есть комментарий | app/flashcards/SessionResultScreen.tsx ; components/results/ResultsGlass.tsx | 412×915 светл.+тёмн. +375×667 |
| 38 | practice-024 | P2 | Завершение — тот же макет в других режимах · Урок V1 — 2 звезды | practice#24 Урок V1 — 2 звезды | app/lesson_complete.tsx ; components/results/ResultsGlass.tsx | 412×915 светл.+тёмн. +375×667 |
| 39 | practice-025 | P2 | Завершение — тот же макет в других режимах · Устно | practice#25 Устно | app/flashcards/SessionResultScreen.tsx | 412×915 светл.+тёмн. +375×667 |
| 40 | practice-026 | P2 | Завершение — тот же макет в других режимах · Диалог | practice#26 Диалог | app/dialogue_v2_completion.tsx | 412×915 светл.+тёмн. +375×667 |
| 41 | practice-027 | P2 | Завершение — тот же макет в других режимах · Сессия Learning V2 | practice#27 Сессия Learning V2 | components/LearningV2SessionOutcomeSheet.tsx ; app/lesson_complete.tsx | 412×915 светл.+тёмн. |
| 42 | learn-014 | P2 | A. Список уроков · A13 | learn#14 A13 | components/paywall/PaywallPlusScreen.tsx | 412×915 светл.+тёмн. |
| 43 | learn-015 | P2 | A. Список уроков · A14 | learn#15 A14 | components/lessons/LessonsListGlassCard.tsx | 412×915 светл.+тёмн. |
| 44 | learn-019 | P2 | B. Меню урока · B1 | learn#19 B1 | app/lesson_menu.tsx ; components/lessons/LessonMenuGlass.tsx | 412×915 светл.+тёмн. |
| 45 | learn-021 | P2 | B. Меню урока · B3 | learn#21 B3 | app/lesson_menu.tsx ; components/lessons/LessonMenuGlass.tsx | 412×915 светл.+тёмн. |
| 46 | learn-022 | P2 | B. Меню урока · B4 | learn#22 B4 | app/lesson_menu.tsx ; components/lessons/LessonMenuGlass.tsx | 412×915 светл.+тёмн. |
| 47 | learn-023 | P2 | B. Меню урока · B5 | learn#23 B5 | app/lesson_menu.tsx ; components/lessons/LessonMenuGlass.tsx | 412×915 светл.+тёмн. |
| 48 | learn-025 | P2 | C. Интро урока · C2 | learn#25 C2 | app/lesson_intro_screens.tsx ; components/lessons/LessonIntroGlass.tsx | 412×915 светл.+тёмн. |
| 49 | learn-026 | P2 | C. Интро урока · C3 | learn#26 C3 | app/lesson_intro_screens.tsx ; components/lessons/LessonIntroGlass.tsx | 412×915 светл.+тёмн. |
| 50 | learn-027 | P2 | C. Интро урока · C4 | learn#27 C4 | components/EnergyBar.tsx | 412×915 светл.+тёмн. |
| 51 | learn-029 | P2 | D. Урок — сборка фразы · D2 | learn#29 D2 | app/lesson1.tsx ; components/practice/PracticeStates.tsx | 412×915 светл.+тёмн. |
| 52 | learn-030 | P2 | D. Урок — сборка фразы · D3 | learn#30 D3 | app/lesson1.tsx ; components/practice/PracticeStates.tsx | 412×915 светл.+тёмн. |
| 53 | learn-031 | P2 | D. Урок — сборка фразы · D4 | learn#31 D4 | app/lesson1.tsx ; components/practice/PracticeStates.tsx | 412×915 светл.+тёмн. |
| 54 | learn-032 | P2 | D. Урок — сборка фразы · D5 | learn#32 D5 | app/lesson1.tsx ; components/practice/PracticeStates.tsx | 412×915 светл.+тёмн. |
| 55 | learn-033 | P2 | D. Урок — сборка фразы · D6 | learn#33 D6 | app/lesson1.tsx ; components/practice/PracticeStates.tsx | 412×915 светл.+тёмн. |
| 56 | learn-034 | P2 | D. Урок — сборка фразы · D7 | learn#34 D7 | app/lesson1.tsx ; components/practice/PracticeStates.tsx | 412×915 светл.+тёмн. |
| 57 | learn-035 | P2 | D. Урок — сборка фразы · D8 | learn#35 D8 | app/lesson1.tsx ; components/practice/PracticeStates.tsx | 412×915 светл.+тёмн. |
| 58 | learn-036 | P2 | D. Урок — сборка фразы · D9 | learn#36 D9 | components/LessonReviewSheet.tsx | 412×915 светл.+тёмн. |
| 59 | learn-037 | P2 | D. Урок — сборка фразы · D10 | learn#37 D10 | components/ExplainSheetHybrid.tsx ; components/ExplainSheet.tsx | 412×915 светл.+тёмн. |
| 60 | learn-038 | P2 | D. Урок — сборка фразы · D10б | learn#38 D10б | components/ExplainSheetHybrid.tsx ; components/ExplainSheet.tsx | 412×915 светл.+тёмн. |
| 61 | learn-039 | P2 | D. Урок — сборка фразы · D11 | learn#39 D11 | components/AiConsentSheetModalHybrid.tsx | 412×915 светл.+тёмн. |
| 62 | learn-041 | P2 | D. Урок — сборка фразы · D13 | learn#41 D13 | app/lesson1.tsx ; components/practice/PracticeStates.tsx | 412×915 светл.+тёмн. |
| 63 | learn-042 | P2 | D. Урок — сборка фразы · D14 | learn#42 D14 | app/lesson1.tsx ; components/practice/PracticeStates.tsx | 412×915 светл.+тёмн. |
| 64 | learn-043 | P2 | D. Урок — сборка фразы · D15 | learn#43 D15 | app/lesson1.tsx ; components/practice/PracticeStates.tsx | 412×915 светл.+тёмн. |
| 65 | learn-044 | P2 | D. Урок — сборка фразы · D16 | learn#44 D16 | app/lesson1.tsx ; components/practice/PracticeStates.tsx | 412×915 светл.+тёмн. |
| 66 | learn-045 | P2 | D. Урок — сборка фразы · D17 | learn#45 D17 | components/NoEnergyModal.tsx | 412×915 светл.+тёмн. |
| 67 | learn-046 | P2 | D. Урок — сборка фразы · D18 | learn#46 D18 | app/lesson1.tsx ; components/practice/PracticeStates.tsx | 412×915 светл.+тёмн. |
| 68 | learn-050 | P2 | E. Итог урока — общий экран завершения (D36) · E4 | learn#50 E4 | app/lesson_complete.tsx ; components/results/ResultsGlass.tsx | 412×915 светл.+тёмн. |
| 69 | learn-060 | P2 | G. Теория · G2 | learn#60 G2 | app/lesson_help.tsx ; components/theory/TheoryLessonView.tsx | 412×915 светл.+тёмн. |
| 70 | learn-061 | P2 | G. Теория · G3 | learn#61 G3 | app/lesson_help.tsx ; components/theory/TheoryLessonView.tsx | 412×915 светл.+тёмн. |
| 71 | learn-062 | P2 | G. Теория · G4 | learn#62 G4 | app/lesson_help.tsx ; components/theory/TheoryLessonView.tsx | 412×915 светл.+тёмн. |
| 72 | learn-063 | P2 | G. Теория · G5 | learn#63 G5 | app/lesson_help.tsx ; components/theory/TheoryLessonView.tsx | 412×915 светл.+тёмн. |
| 73 | learn-064 | P2 | H. Неправильные глаголы · H1 | learn#64 H1 | app/lesson_irregular_verbs.tsx | 412×915 светл.+тёмн. |
| 74 | learn-065 | P2 | H. Неправильные глаголы · H2 | learn#65 H2 | app/lesson_irregular_verbs.tsx | 412×915 светл.+тёмн. |
| 75 | learn-066 | P2 | H. Неправильные глаголы · H3 | learn#66 H3 | app/lesson_irregular_verbs.tsx | 412×915 светл.+тёмн. |
| 76 | learn-067 | P2 | H. Неправильные глаголы · H4 | learn#67 H4 | app/lesson_irregular_verbs.tsx | 412×915 светл.+тёмн. |
| 77 | learn-068 | P2 | H. Неправильные глаголы · H4б | learn#68 H4б | app/lesson_irregular_verbs.tsx | 412×915 светл.+тёмн. |
| 78 | learn-069 | P2 | H. Неправильные глаголы · H5 | learn#69 H5 | app/lesson_irregular_verbs.tsx | 412×915 светл.+тёмн. |
| 79 | learn-070 | P2 | I. Тренажёр предлогов · I1 | learn#70 I1 | app/preposition_drill.tsx | 412×915 светл.+тёмн. |
| 80 | learn-071 | P2 | I. Тренажёр предлогов · I2 | learn#71 I2 | app/preposition_drill.tsx | 412×915 светл.+тёмн. |
| 81 | learn-072 | P2 | I. Тренажёр предлогов · I3 | learn#72 I3 | app/preposition_drill.tsx | 412×915 светл.+тёмн. |
| 82 | learn-073 | P2 | I. Тренажёр предлогов · I4 | learn#73 I4 | app/preposition_drill.tsx | 412×915 светл.+тёмн. |
| 83 | learn-074 | P2 | I. Тренажёр предлогов · I5 | learn#74 I5 | app/preposition_drill.tsx | 412×915 светл.+тёмн. |
| 84 | learn-075 | P2 | J. Диагностика · J1 | learn#75 J1 | app/diagnostic_test.tsx ; components/level-exam/ExamGlassParts.tsx | 412×915 светл.+тёмн. |
| 85 | learn-076 | P2 | J. Диагностика · J2 | learn#76 J2 | app/diagnostic_test.tsx ; components/level-exam/ExamGlassParts.tsx | 412×915 светл.+тёмн. |
| 86 | learn-077 | P2 | J. Диагностика · J3 | learn#77 J3 | app/diagnostic_test.tsx ; components/level-exam/ExamGlassParts.tsx | 412×915 светл.+тёмн. |
| 87 | learn-078 | P2 | J. Диагностика · J4 | learn#78 J4 | app/diagnostic_test.tsx ; components/level-exam/ExamGlassParts.tsx | 412×915 светл.+тёмн. |
| 88 | learn-079 | P2 | J. Диагностика · J5 | learn#79 J5 | app/diagnostic_test.tsx ; components/level-exam/ExamGlassParts.tsx | 412×915 светл.+тёмн. |
| 89 | learn-080 | P2 | J. Диагностика · J6 | learn#80 J6 | app/diagnostic_test.tsx ; components/level-exam/ExamGlassParts.tsx | 412×915 светл.+тёмн. |
| 90 | learn-081 | P2 | J. Диагностика · J7 | learn#81 J7 | app/diagnostic_test.tsx ; components/level-exam/ExamGlassParts.tsx | 412×915 светл.+тёмн. |
| 91 | learn-082 | P2 | J. Диагностика · J8 | learn#82 J8 | app/diagnostic_test.tsx ; components/level-exam/ExamGlassParts.tsx | 412×915 светл.+тёмн. |
| 92 | learn-083 | P2 | J. Диагностика · J9 | learn#83 J9 | app/diagnostic_test.tsx ; components/ThemedConfirmModal.tsx | 412×915 светл.+тёмн. |
| 93 | learn-084 | P2 | J. Диагностика · J10 | learn#84 J10 | app/diagnostic_test.tsx ; components/level-exam/ExamGlassParts.tsx | 412×915 светл.+тёмн. |
| 94 | learn-085 | P2 | K. Зачёт уровня · K1 | learn#85 K1 | app/level_exam.tsx | 412×915 светл.+тёмн. |
| 95 | learn-086 | P2 | K. Зачёт уровня · K2 | learn#86 K2 | app/level_exam.tsx | 412×915 светл.+тёмн. |
| 96 | learn-087 | P2 | K. Зачёт уровня · K3 | learn#87 K3 | app/level_exam.tsx | 412×915 светл.+тёмн. |
| 97 | learn-088 | P2 | K. Зачёт уровня · K4 | learn#88 K4 | app/level_exam.tsx | 412×915 светл.+тёмн. |
| 98 | learn-089 | P2 | K. Зачёт уровня · K5 | learn#89 K5 | app/level_exam.tsx | 412×915 светл.+тёмн. |
| 99 | learn-090 | P2 | K. Зачёт уровня · K5б | learn#90 K5б | app/level_exam.tsx | 412×915 светл.+тёмн. |
| 100 | learn-091 | P2 | K. Зачёт уровня · K6 | learn#91 K6 | app/level_exam.tsx | 412×915 светл.+тёмн. |
| 101 | learn-092 | P2 | K. Зачёт уровня · K7 | learn#92 K7 | app/level_exam.tsx | 412×915 светл.+тёмн. |
| 102 | learn-093 | P2 | K. Зачёт уровня · K8 | learn#93 K8 | app/level_exam.tsx ; components/ThemedConfirmModal.tsx | 412×915 светл.+тёмн. |
| 103 | learn-094 | P2 | L. Финальный экзамен · L1 | learn#94 L1 | app/exam.tsx | 412×915 светл.+тёмн. |
| 104 | learn-095 | P2 | L. Финальный экзамен · L2 | learn#95 L2 | app/exam.tsx | 412×915 светл.+тёмн. |
| 105 | learn-096 | P2 | L. Финальный экзамен · L3 | learn#96 L3 | app/exam.tsx | 412×915 светл.+тёмн. |
| 106 | learn-097 | P2 | L. Финальный экзамен · L4 | learn#97 L4 | app/exam.tsx | 412×915 светл.+тёмн. |
| 107 | learn-098 | P2 | L. Финальный экзамен · L5 | learn#98 L5 | app/exam.tsx | 412×915 светл.+тёмн. |
| 108 | learn-099 | P2 | L. Финальный экзамен · L6 | learn#99 L6 | app/exam.tsx | 412×915 светл.+тёмн. |
| 109 | learn-100 | P2 | L. Финальный экзамен · L7 | learn#100 L7 | app/exam.tsx | 412×915 светл.+тёмн. |
| 110 | learn-101 | P2 | L. Финальный экзамен · L8 | learn#101 L8 | app/exam.tsx | 412×915 светл.+тёмн. |
| 111 | learn-102 | P2 | L. Финальный экзамен · L9 | learn#102 L9 | components/CertificateNameModal.tsx | 412×915 светл.+тёмн. |
| 112 | learn-103 | P2 | L. Финальный экзамен · L10 | learn#103 L10 | app/exam.tsx | 412×915 светл.+тёмн. |
| 113 | results-001 | P2 | Ошибки · хаб ошибок | results#1 хаб ошибок | app/mistakes_hub.tsx ; app/mistakes_list.tsx | 412×915 светл.+тёмн. |
| 114 | results-002 | P2 | Ошибки · ошибок пока нет | results#2 ошибок пока нет | app/mistakes_hub.tsx ; app/mistakes_list.tsx | 412×915 светл.+тёмн. |
| 115 | results-003 | P2 | Ошибки · список ошибок | results#3 список ошибок | app/mistakes_hub.tsx ; app/mistakes_list.tsx | 412×915 светл.+тёмн. |
| 116 | results-004 | P2 | Ошибки · деталь ошибки | results#4 деталь ошибки | app/mistakes_hub.tsx ; app/mistakes_list.tsx | 412×915 светл.+тёмн. |
| 117 | results-005 | P2 | Ошибки · повторная практика | results#5 повторная практика | app/mistake_practice_session.tsx | 412×915 светл.+тёмн. |
| 118 | results-006 | P2 | Ошибки · финал практики ошибок | results#6 финал практики ошибок | components/mistake-practice/MistakeSessionFinale.tsx | 412×915 светл.+тёмн. |
| 119 | results-007 | P2 | Серия и статистика · серия и неделя | results#7 серия и неделя | app/streak_stats.tsx | 412×915 светл.+тёмн. |
| 120 | results-008 | P2 | Серия и статистика · стадии огня 0–10 | results#8 стадии огня 0–10 | app/streak_stats.tsx | 412×915 светл.+тёмн. |
| 121 | results-010 | P2 | Серия и статистика · риск серии · тост | results#10 риск серии · тост | components/StreakRiskToastHost.tsx ; components/ActionToast.tsx | 412×915 светл.+тёмн. |
| 122 | results-011 | P2 | Витрина достижений · витрина | results#11 витрина | app/achievements_screen.tsx ; components/results/ResultsGlass.tsx | 412×915 светл.+тёмн. |
| 123 | results-012 | P2 | Витрина достижений · витрина · пусто | results#12 витрина · пусто | app/achievements_screen.tsx ; components/results/ResultsGlass.tsx | 412×915 светл.+тёмн. |
| 124 | results-013 | P2 | Витрина достижений · достижение · подробнее | results#13 достижение · подробнее | app/achievements_screen.tsx ; components/results/ResultsGlass.tsx | 412×915 светл.+тёмн. |
| 125 | results-014 | P2 | Единый итог · единый итог · монеты, ошибка, комментарий | results#14 единый итог · монеты, ошибка, комментарий | app/lesson_complete.tsx ; components/results/ResultsGlass.tsx | 412×915 светл.+тёмн. |
| 126 | energy-modes-016 | P2 | Два режима энергии · Режим А · Режим А · ошибка: сердечко и серия монет | learn#32 D5 · Неверно — сердце потеряно | components/EnergyContext.tsx ; components/NoEnergyModal.tsx | 412×915 светл.+тёмн. |
| 127 | voice-mics-learn-001 | P2 | Урок · задание «Устно» · остаток голоса 3 — цифра на микрофоне | learn#105 V1 · Устно — осталось 3 | app/lesson1.tsx | 412×915 светл.+тёмн. |
| 128 | voice-mics-learn-002 | P2 | Урок · задание «Устно» · голос на сегодня закончился — «PLUS» на микрофоне | learn#106 V2 · Устно — 0: бейдж PLUS, тап → Plus | app/lesson1.tsx | 412×915 светл.+тёмн. |
| 129 | spire-004 | P3 | 2. Шпиль — главный экран · Шпиль — башня, я на 4 этаже | spire#4 Шпиль — башня, я на 4 этаже | components/spire/SpireHomeScreen.tsx ; app/spire/use_spire_game.ts | 412×915 светл.+тёмн. |
| 130 | spire-006 | P3 | 3. Все участники · Все участники | spire#6 Все участники | components/spire/SpireAllMembers.tsx ; modules/spire/room_rows.ts | 412×915 светл.+тёмн. |
| 131 | spire-007 | P3 | 4–6. Ступень · Ступень — задание | spire#7 Ступень — задание | components/spire/SpireStepScreen.tsx ; app/spire/use_spire_step_runner.ts | 412×915 светл.+тёмн. |
| 132 | spire-008 | P3 | 4–6. Ступень · Ошибка — правильный ответ | spire#8 Ошибка — правильный ответ | components/spire/SpireStepScreen.tsx ; modules/spire/answer_reveal.ts | 412×915 светл.+тёмн. |
| 133 | spire-010 | P3 | 7. Итог ступени внутри сцены башни · Ступень пройдена — «Выше» двигает маркер | spire#10 Ступень пройдена — «Выше» двигает маркер | components/spire/SpireResultPanel.tsx ; app/spire/use_spire_game.ts | 412×915 светл.+тёмн. |
| 134 | spire-012 | P3 | 8. Этаж пройден и Вершина · Этаж 4 пройден — впереди Страж | spire#12 Этаж 4 пройден — впереди Страж | components/spire/SpireResultPanel.tsx | 412×915 светл.+тёмн. |
| 135 | spire-013 | P3 | 8. Этаж пройден и Вершина · Вершина — 15 этаж | spire#13 Вершина — 15 этаж | components/spire/SpireResultPanel.tsx | 412×915 светл.+тёмн. |
| 136 | community-001 | P3 | Вкладка и Шпиль · вкладка сообщества | spire#4 Шпиль — башня, я на 4 этаже | app/(tabs)/community.tsx ; components/v2/V2SegmentedControl.tsx | 412×915 светл.+тёмн. |
| 137 | spire-gap-001 | P3 | Шпиль · Ступень · Задание — вставь слово | spire-gaps-states#1 Задание — вставь слово | components/spire/SpireTaskView.tsx | 412×915 светл.+тёмн. |
| 138 | spire-gap-002 | P3 | Шпиль · Ступень · Задание — найди лишнее | spire-gaps-states#2 Задание — найди лишнее | components/spire/SpireTaskView.tsx | 412×915 светл.+тёмн. |
| 139 | spire-gap-003 | P3 | Шпиль · Ступень · Задание — собери перевод | spire-gaps-states#3 Задание — собери перевод | components/spire/SpireTaskView.tsx | 412×915 светл.+тёмн. |
| 140 | spire-gap-004 | P3 | Шпиль · Ступень · Задание — послушай и выбери | spire-gaps-states#4 Задание — послушай и выбери | components/spire/SpireTaskView.tsx | 412×915 светл.+тёмн. |
| 141 | spire-gap-005 | P3 | Шпиль · Ступень · Задание — послушай и собери | spire-gaps-states#5 Задание — послушай и собери | components/spire/SpireTaskView.tsx | 412×915 светл.+тёмн. |
| 142 | spire-gap-006 | P3 | Шпиль · Ступень · Задание — найди пары | spire-gaps-states#6 Задание — найди пары | components/spire/SpirePairsBoard.tsx ; components/spire/SpireTaskView.tsx | 412×915 светл.+тёмн. |
| 143 | spire-gap-008 | P3 | Шпиль · Главный · Старт — задания недели ещё готовятся | spire-gaps-states#8 Старт — задания недели ещё готовятся | components/spire/SpireClimbDock.tsx | 412×915 светл.+тёмн. |
| 144 | spire-gap-009 | P3 | Шпиль · Главный · Главный — комнаты ещё нет, «Подняться» неактивна | spire-gaps-states#9 Главный — комнаты ещё нет, «Подняться» неактивна | components/spire/SpireHomeScreen.tsx ; components/spire/SpireClimbDock.tsx | 412×915 светл.+тёмн. |
| 145 | spire-gap-011 | P3 | Шпиль · Главный · Шпиль откроется чуть позже | spire-gaps-states#11 Шпиль откроется чуть позже | components/spire/SpireLockedState.tsx | 412×915 светл.+тёмн. |
| 146 | spire-gap-012 | P3 | Шпиль · Результат · Провал — время вышло | spire-gaps-states#12 Провал — время вышло | components/spire/SpireResultPanel.tsx | 412×915 светл.+тёмн. |
| 147 | spire-gap-014 | P3 | Шпиль · Результат · Провал — ступень не сохранилась | spire-gaps-states#14 Провал — ступень не сохранилась | components/spire/SpireResultPanel.tsx | 412×915 светл.+тёмн. |
| 148 | spire-gap-015 | P3 | Шпиль · Итог недели · Итог недели — поднимаешься | spire-gaps-states#15 Итог недели — поднимаешься | components/spire/SpireWeekResultCard.tsx | 412×915 светл.+тёмн. |
| 149 | spire-gap-021 | P3 | Шпиль · Ступень · Ступень с флажком жалобы | spire-gaps-states#21 Ступень с флажком жалобы | modules/spire/SpireTaskReportButton.tsx ; components/spire/SpireStepScreen.tsx | 412×915 светл.+тёмн. |
| 150 | community-002 | P4 | Вкладка и Шпиль · Шпиль · топ-3 | community#2 Шпиль · топ-3 | components/spire/SpirePodium.tsx ; components/spire/SpireHomeScreen.tsx | 412×915 светл.+тёмн. |
| 151 | community-006 | P4 | Друзья · список и заявки | community#6 список и заявки | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 152 | community-008 | P4 | Друзья · поиск · скелетон | community#8 поиск · загрузка | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 153 | community-009 | P4 | Друзья · профиль найден | community#17 поиск · найден | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 154 | community-011 | P4 | Друзья · заявку не удалось отправить | community#25 добавление · нет связи | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 155 | community-012 | P4 | Друзья · ник или код не найден | community#18 поиск · не найден | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 156 | community-015 | P4 | Друзья · поиск · нет связи | community#21 поиск · нет связи | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 157 | community-017 | P4 | Друзья · заявка отправлена | community#17 поиск · найден | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 158 | community-018 | P4 | Друзья · уже друзья | community#23 добавление · уже друзья | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 159 | community-019 | P4 | Друзья · заявка уже отправлена | community#24 добавление · заявка уже отправлена | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 160 | community-024 | P4 | Друзья · подтверждение удаления | community#15 подтверждение удаления | components/friends_together/FriendTogetherSheet.tsx | 412×915 светл.+тёмн. |
| 161 | profile-017 | P5 | Помощь и подписка · статический пример · месячная подписка | manage-subscription-states#3 Управление Plus · месячная | app/manage_subscription.tsx | 412×915 светл.+тёмн. |
| 162 | profile-018 | P5 | Помощь и подписка · статический пример · разовая покупка | manage-subscription-states#5 Управление Plus · разовая покупка | app/manage_subscription.tsx | 412×915 светл.+тёмн. |
| 163 | profile-019 | P5 | Помощь и подписка · статический пример · загрузка данных магазина | manage-subscription-states#4 Управление Plus · загрузка плана | app/manage_subscription.tsx | 412×915 светл.+тёмн. |
| 164 | coins-003 | P5 | Кошелёк и ранги · повышение · готово к подтверждению | coins#3 повышение · готово к подтверждению | app/coin_rank.tsx | 412×915 светл.+тёмн. |
| 165 | coins-005 | P5 | Кошелёк и ранги · повышение · недостаточно монет | coins#5 повышение · недостаточно монет | app/coin_rank.tsx | 412×915 светл.+тёмн. |
| 166 | coins-006 | P5 | Кошелёк и ранги · каталог 00–19 | coins#6 каталог 00–19 | components/coins/CoinRankCatalog.tsx ; app/coin_rank.tsx | 412×915 светл.+тёмн. |
| 167 | coins-007 | P5 | Кошелёк и ранги · Монетный двор · подтверждённый успех | coins#7 Монетный двор · подтверждённый успех | components/level_up/LevelUpMintCeremony.tsx | 412×915 светл.+тёмн. |
| 168 | coins-008 | P5 | Plus и покупки · нейтральное предложение | coins#8 нейтральное предложение | components/paywall/PaywallPlusScreen.tsx | 412×915 светл.+тёмн. |
| 169 | coins-009 | P5 | Plus и покупки · предложение · загрузка | coins#9 предложение · загрузка | components/paywall/PaywallPlusScreen.tsx | 412×915 светл.+тёмн. |
| 170 | coins-010 | P5 | Plus и покупки · предложение · ошибка до checkout | coins#10 предложение · ошибка до checkout | components/paywall/PaywallPlusScreen.tsx | 412×915 светл.+тёмн. |
| 171 | coins-011 | P5 | Plus и покупки · покупка · ожидание магазина | coins#11 покупка · ожидание магазина | components/paywall/PaywallPlusScreen.tsx | 412×915 светл.+тёмн. |
| 172 | coins-012 | P5 | Plus и покупки · покупка · подтверждение неизвестно | coins#12 покупка · подтверждение неизвестно | app/paywall_purchase.ts | 412×915 светл.+тёмн. |
| 173 | coins-013 | P5 | Plus и покупки · доступ закончился · шторка | coins#13 доступ закончился · шторка | components/EntitlementExpiredHost.tsx | 412×915 светл.+тёмн. |
| 174 | coins-014 | P5 | Plus и покупки · доступ к разбору · решение открыто | coins#14 статистика Free · блюр | components/AiLimitUpsellCard.tsx | 412×915 светл.+тёмн. |
| 175 | coins-015 | P5 | Подтверждённый доступ и границы · Plus-бейдж в профиле | coins#15 Plus-бейдж в профиле | components/PlusBadge.tsx | 412×915 светл.+тёмн. |
| 176 | coins-016 | P5 | Подтверждённый доступ и границы · первая покупка · подтверждена магазином | coins#16 первая покупка · подтверждена магазином | components/FirstPurchaseSealCelebration.tsx | 412×915 светл.+тёмн. |
| 177 | coins-017 | P5 | Подтверждённый доступ и границы · граница доступа урока | coins#18 граница доступа урока | app/(tabs)/lessons.tsx | 412×915 светл.+тёмн. |
| 178 | paywalls-011 | P5 | Цена и покупка · Загрузка условий | paywall-price-states#1 011 · Загрузка условий | components/paywall/PaywallPlusScreen.tsx | 412×915 светл.+тёмн. |
| 179 | paywalls-013 | P5 | Цена и покупка · Проверяем покупку | paywall-price-states#4 013 · Проверяем покупку: идёт оплата | components/paywall/PaywallPlusScreen.tsx | 412×915 светл.+тёмн. |
| 180 | paywalls-015 | P5 | Цена и покупка · Результат покупки неизвестен · отдельный диалог | paywall-price-states#7 015 · Результат покупки неизвестен (диалог) | app/paywall_purchase.ts | 412×915 светл.+тёмн. |
| 181 | paywalls-016 | P5 | Цена и покупка · Статус неизвестен | paywall-price-states#8 016 · Статус неизвестен (после проверки) | app/paywall_purchase.ts | 412×915 светл.+тёмн. |
| 182 | paywalls-020 | P5 | Управление действующим Plus · Загрузка плана | manage-subscription-states#4 Загрузка плана | app/manage_subscription.tsx | 412×915 светл.+тёмн. |
| 183 | paywalls-021 | P5 | Управление действующим Plus · Разовая покупка | manage-subscription-states#5 Разовая покупка | app/manage_subscription.tsx | 412×915 светл.+тёмн. |
| 184 | paywall-gap-002 | P5 | Пейвол Plus · Вход из Настроек — «FREE И PLUS» свёрнуто | paywall-gaps-states#2 Вход из Настроек — «FREE И PLUS» свёрнуто | components/paywall/PaywallBenefitComparison.tsx | 412×915 светл.+тёмн. |
| 185 | paywall-gap-003 | P5 | Пейвол Plus · Вход из Настроек — «FREE И PLUS» развёрнуто | paywall-gaps-states#3 Вход из Настроек — «FREE И PLUS» развёрнуто | components/paywall/PaywallBenefitComparison.tsx | 412×915 светл.+тёмн. |
| 186 | paywall-gap-004 | P5 | Пейвол Plus · Лента пробного периода | paywall-gaps-states#4 Лента пробного периода | components/paywall/PaywallPlus.tsx ; components/paywall/PaywallPlusCopy.ts | 412×915 светл.+тёмн. |
| 187 | paywall-gap-005 | P5 | Пейвол Plus · Выбран «Месяц» | paywall-gaps-states#5 Выбран «Месяц» | components/paywall/PaywallPlusCopy.ts | 412×915 светл.+тёмн. |
| 188 | paywall-gap-006 | P5 | Пейвол Plus · После покупки — «Plus твой. Напомнить…» | paywall-gaps-states#6 После покупки — «Plus твой. Напомнить…» | components/paywall/PaywallTrialReminderPrompt.tsx | 412×915 светл.+тёмн. |
| 189 | profile-001 | P6 | Профиль и основные настройки · настройки | settings-gaps-states#29 Верхний слот сообщений: «Важное от Phraseman» сразу под группой «Профиль» | app/(tabs)/settings.tsx ; components/settings/SettingsGlassRows.tsx | 412×915 светл.+тёмн. |
| 190 | profile-007 | P6 | Обучение и внешний вид · обучение и озвучка | settings-gaps-states#15 Обучение — низ (скорость, голос) | app/settings_edu.tsx | 412×915 светл.+тёмн. |
| 191 | profile-014 | P6 | Помощь и подписка · форма поддержки · диагностика раскрыта | settings-gaps-states#22 Поддержка — диагностика раскрыта | app/support_report.tsx | 412×915 светл.+тёмн. |
| 192 | profile-025 | P6 | Помощь и подписка · опрос недоступен · совместимый маршрут | profile#15 опрос · пустое состояние | app/survey_screen.tsx | 412×915 светл.+тёмн. |
| 193 | profile-030 | P6 | Проект UX · критические действия · проект UX · удаление до отправки | profile#19 проект UX · удаление до отправки | components/DeleteAccountConfirmModal.tsx | 412×915 светл.+тёмн. |
| 194 | auth-gap-001 | P6 | Аккаунт · Аккаунт — гость | accounts-gaps-states#1 Аккаунт — гость | app/account_details.tsx | 412×915 светл.+тёмн. |
| 195 | auth-gap-002 | P6 | Аккаунт · Аккаунт — Google, адрес скопирован | accounts-gaps-states#2 Аккаунт — Google, адрес скопирован | app/account_details.tsx | 412×915 светл.+тёмн. |
| 196 | auth-gap-003 | P6 | Вход · Окно входа — телефон уже связан с другим аккаунтом | accounts-gaps-states#3 Окно входа — телефон уже связан с другим аккаунтом | components/RegistrationPromptModal.tsx ; app/account_switch_copy.ts | 412×915 светл.+тёмн. |
| 197 | auth-gap-004 | P6 | Вход · Окно входа — прогресс на месте, вход отменён | accounts-gaps-states#4 Окно входа — прогресс на месте, вход отменён | components/RegistrationPromptModal.tsx ; app/account_sync_copy.ts | 412×915 светл.+тёмн. |
| 198 | auth-gap-005 | P6 | Вход · Окно входа — ждёт прогресс другого аккаунта | accounts-gaps-states#5 Окно входа — ждёт прогресс другого аккаунта | components/RegistrationPromptModal.tsx ; app/account_backup_blocked_copy.ts | 412×915 светл.+тёмн. |
| 199 | auth-gap-006 | P6 | Вход · Окно входа — аккаунт восстановлен | accounts-gaps-states#6 Окно входа — аккаунт восстановлен | components/RegistrationPromptModal.tsx ; app/account_delete_restore_prompt.ts | 412×915 светл.+тёмн. |
| 200 | auth-gap-007 | P6 | Вход · Восстановить аккаунт? | accounts-gaps-states#7 Восстановить аккаунт? | app/account_delete_restore_prompt.ts | 412×915 светл.+тёмн. |
| 201 | auth-gap-008 | P6 | Вход · Аккаунт удалён | accounts-gaps-states#8 Аккаунт удалён | app/account_delete_restore_prompt.ts | 412×915 светл.+тёмн. |
| 202 | auth-gap-009 | P6 | Аккаунт · Удалить аккаунт? — с входом (14 дней) | accounts-gaps-states#9 Удалить аккаунт? — с входом (14 дней) | components/DeleteAccountConfirmModal.tsx | 412×915 светл.+тёмн. |
| 203 | auth-gap-010 | P6 | Аккаунт · Удалить аккаунт? — гость | accounts-gaps-states#10 Удалить аккаунт? — гость | components/DeleteAccountConfirmModal.tsx | 412×915 светл.+тёмн. |
| 204 | auth-gap-012 | P6 | Аккаунт · Сменить аккаунт? — с переносом Plus | accounts-gaps-states#12 Сменить аккаунт? — с переносом Plus | app/(tabs)/settings.tsx ; app/account_switch_copy.ts | 412×915 светл.+тёмн. |
| 205 | auth-gap-016 | P6 | Аккаунт · Смена — прогресс не сохранён | accounts-gaps-states#16 Смена — прогресс не сохранён | app/(tabs)/settings.tsx | 412×915 светл.+тёмн. |
| 206 | settings-gap-001 | P6 | Настройки · Главная — профиль привязан | settings-gaps-states#1 Главная — профиль привязан | app/(tabs)/settings.tsx | 412×915 светл.+тёмн. |
| 207 | settings-gap-004 | P6 | Настройки · Главная — Plus по промокоду | settings-gaps-states#4 Главная — Plus по промокоду | app/(tabs)/settings.tsx | 412×915 светл.+тёмн. |
| 208 | settings-gap-005 | P6 | Настройки · Главная — Plus за приглашения + пробный доступ | settings-gaps-states#5 Главная — Plus за приглашения + пробный доступ | app/(tabs)/settings.tsx | 412×915 светл.+тёмн. |
| 209 | settings-gap-008 | P6 | Настройки · Очистить кеш — готово + опрос после голосования | settings-gaps-states#8 Очистить кеш — готово + опрос после голосования | app/(tabs)/settings.tsx ; components/settings/SettingsMessageSlotCard.tsx | 412×915 светл.+тёмн. |
| 210 | settings-gap-010 | P6 | Настройки · Уведомления — сохранено, время | settings-gaps-states#10 Уведомления — сохранено, время | app/settings_notifications.tsx | 412×915 светл.+тёмн. |
| 211 | settings-gap-011 | P6 | Настройки · Уведомления — низ списка (итоги месяца, ещё) | settings-gaps-states#11 Уведомления — низ списка (итоги месяца, ещё) | app/settings_notifications.tsx | 412×915 светл.+тёмн. |
| 212 | settings-gap-017 | P6 | Настройки · Приватность — ИИ включён, документы, удаление | settings-gaps-states#17 Приватность — ИИ включён, документы, удаление | app/privacy_settings.tsx | 412×915 светл.+тёмн. |
| 213 | settings-gap-022 | P6 | Настройки · Поддержка — диагностика раскрыта | settings-gaps-states#22 Поддержка — диагностика раскрыта | app/support_report.tsx | 412×915 светл.+тёмн. |
| 214 | settings-gap-023 | P6 | Настройки · Поддержка — обращение отправлено | settings-gaps-states#23 Поддержка — обращение отправлено | app/support_report.tsx | 412×915 светл.+тёмн. |
| 215 | settings-gap-027 | P6 | Настройки · Уведомления — ежедневное выключено: «Время» приглушено | settings-gaps-states#27 Уведомления — ежедневное выключено: «Время» приглушено | app/settings_notifications.tsx | 412×915 светл.+тёмн. |
| 216 | settings-gap-034 | P6 | Настройки · Обучение — выбранный голос озвучки | settings-gaps-states#34 Обучение — выбранный голос озвучки | app/settings_edu.tsx | 412×915 светл.+тёмн. |
| 217 | auth-gap-019 | P6 | Вход · Онбординг — гость выбрал существующий Google | accounts-gaps-states#19 Этот аккаунт уже есть в Phraseman | app/onboarding_account_switch_confirm.ts ; app/account_switch_copy.ts | 412×915 светл.+тёмн. |
| 218 | onboarding-paywall-002 | P7 | Онбординг · экран цены Plus · Онбординг · Цена: справочная цена | onboarding-states#24 Онбординг · Цена: справочная цена | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 219 | onboarding-003 | P7 | Онбординг · Онбординг · Вход идёт долго | onboarding-states#3 Онбординг · Вход идёт долго | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 220 | onboarding-004 | P7 | Онбординг · Онбординг · Вход: нет сети | onboarding-states#4 Онбординг · Вход: нет сети | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 221 | onboarding-005 | P7 | Онбординг · Онбординг · Аккаунта нет | onboarding-states#5 Онбординг · Аккаунта нет | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 222 | onboarding-009 | P7 | Онбординг · Онбординг · Знакомство | onboarding-states#9 Онбординг · Знакомство | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 223 | onboarding-012 | P7 | Онбординг · Онбординг · «Помоги сделать Phraseman лучше» | onboarding-states#12 Онбординг · «Помоги сделать Phraseman лучше» | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 224 | onboarding-013 | P7 | Онбординг · Онбординг · «Как ты узнал о нас?» | onboarding-states#13 Онбординг · «Как ты узнал о нас?» | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 225 | onboarding-016 | P7 | Онбординг · Онбординг · Уровень (выключен в сборке) | onboarding-states#16 Онбординг · Уровень (выключен в сборке) | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 226 | onboarding-017 | P7 | Онбординг · Онбординг · Уровень: выбрано | onboarding-states#17 Онбординг · Уровень: выбрано | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 227 | onboarding-018 | P7 | Онбординг · Онбординг · Уведомления | onboarding-states#18 Онбординг · Уведомления | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 228 | onboarding-031 | P7 | Онбординг · Онбординг · Уровень (выключен в сборке) · тёмная «Океан» | onboarding-states#31 Онбординг · Уровень · «Океан» | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 229 | onboarding-032 | P7 | Онбординг · Онбординг · Уровень: выбрано · тёмная «Океан» | onboarding-states#32 Онбординг · Уровень · выбрано · «Океан» | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 230 | friends-duel-001 | P8 | Друзья · дуэль на 5 фраз · Дуэль · Фраза 2 из 5 | friends-full#31 Фраза 2 из 5 | app/friends_duel.tsx ; components/friends_together/DuelPlayTopBar.tsx | 412×915 светл.+тёмн. |
| 231 | friends-duel-002 | P8 | Друзья · дуэль на 5 фраз · Дуэль · Верно | friends-full#32 Верно | app/friends_duel.tsx ; components/friends_together/DuelPlayTopBar.tsx | 412×915 светл.+тёмн. |
| 232 | friends-duel-003 | P8 | Друзья · дуэль на 5 фраз · Дуэль · Ход отправлен | friends-full#33 Ход отправлен | app/friends_duel.tsx ; components/friends_together/DuelPlayTopBar.tsx | 412×915 светл.+тёмн. |
| 233 | friends-duel-004 | P8 | Друзья · дуэль на 5 фраз · Дуэль · Победа | friends-full#35 Победа | app/friends_duel.tsx ; components/friends_together/DuelPlayTopBar.tsx | 412×915 светл.+тёмн. |
| 234 | friends-duel-005 | P8 | Друзья · дуэль на 5 фраз · Дуэль · Поражение | friends-full#36 Поражение | app/friends_duel.tsx ; components/friends_together/DuelPlayTopBar.tsx | 412×915 светл.+тёмн. |
