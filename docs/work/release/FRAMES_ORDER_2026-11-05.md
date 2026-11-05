# Заказ кадров Сверке (6) и Эмулятору (7) — перемер pending (2026-11-05)

Составил: 3 · МАКЕТЫ. Источник: `docs/phraseman-2.0/registries/visual_parity.json` (765 строк pending), порядок — по приоритету выпуска 2.1.0. Здесь первые **154** состояний; остальные 611 — в `FRAMES_ORDER_2026-11-05.json` (тот же порядок).

## Порядок приоритета (сколько pending в каждой ступени)
- P1 Главная: 17
- P2 Урок / классика / результаты: 111
- P3 Пик: 21
- P4 Сообщество: 11
- P5 Пейвол / Plus / монеты: 28
- P6 Настройки / профиль / аккаунт: 29
- P7 Онбординг / welcome: 12
- P8 Друзья / достижения: 5
- P9 прочие живые (карточки, видео, диалоги, мистейки и т.п.): 135
- P10 скрыто флагом / оверлеи / нет поверхности (в конец): 396

## Как снимать (для каждой строки ниже)
1. Размеры: **412×915** (основной) светлая **и** тёмная; **375×667** — только для строк с пометкой «+375» (первые 40).
2. Тема: по умолчанию графит (Deep sky для тёмной), состояние берётся из столбца «Состояние»; если нужный пользовательский сценарий (ранг, Plus/Free, ошибка сети, ноль энергии) — снять его dev-маршрутом/фикстурой, а не «похожим» экраном.
3. Имя файла: `docs/work/release/frames_2026-11-05/pending/<id>__<тема>-<размер>.png`, например `home-scene-003__graphite-dark-412x915.png`. Время снимка вписать в имя НЕ надо — системное; кадр без правильного состояния не класть (лучше ⬜, чем неверный).
4. Нельзя нажимать кнопки трат/удаления/покупки; вход/привязку не делать (пометить «нужен телефон владельца»).
5. Склейку «макет | приложение» собирает `docs/work/release/tools/compose_pair.cjs <id>` (читает макет из docs/design/v2-app/<файл>.html, телефон по номеру) — Сверке склеивать самому не нужно.
6. Вердикт ✅/🟡 я записываю в `docs/work/release/PENDING_VERDICTS_2026-11-05.json` ПРЕДЛОЖЕНИЕМ; в реестр `visual_parity.json` статус **match** ставит только координатор после просмотра склейки (правило реестра, поле reviewed_by) — по его слову перенесу.

## Заказ (154)
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
| 58 | spire-004 | P3 | 2. Шпиль — главный экран · Шпиль — башня, я на 4 этаже | spire#4 Шпиль — башня, я на 4 этаже | components/spire/SpireHomeScreen.tsx ; app/spire/use_spire_game.ts | 412×915 светл.+тёмн. |
| 59 | spire-006 | P3 | 3. Все участники · Все участники | spire#6 Все участники | components/spire/SpireAllMembers.tsx ; modules/spire/room_rows.ts | 412×915 светл.+тёмн. |
| 60 | spire-007 | P3 | 4–6. Ступень · Ступень — задание | spire#7 Ступень — задание | components/spire/SpireStepScreen.tsx ; app/spire/use_spire_step_runner.ts | 412×915 светл.+тёмн. |
| 61 | spire-008 | P3 | 4–6. Ступень · Ошибка — правильный ответ | spire#8 Ошибка — правильный ответ | components/spire/SpireStepScreen.tsx ; modules/spire/answer_reveal.ts | 412×915 светл.+тёмн. |
| 62 | spire-010 | P3 | 7. Итог ступени внутри сцены башни · Ступень пройдена — «Выше» двигает маркер | spire#10 Ступень пройдена — «Выше» двигает маркер | components/spire/SpireResultPanel.tsx ; app/spire/use_spire_game.ts | 412×915 светл.+тёмн. |
| 63 | spire-012 | P3 | 8. Этаж пройден и Вершина · Этаж 4 пройден — впереди Страж | spire#12 Этаж 4 пройден — впереди Страж | components/spire/SpireResultPanel.tsx | 412×915 светл.+тёмн. |
| 64 | spire-013 | P3 | 8. Этаж пройден и Вершина · Вершина — 15 этаж | spire#13 Вершина — 15 этаж | components/spire/SpireResultPanel.tsx | 412×915 светл.+тёмн. |
| 65 | community-001 | P3 | Вкладка и Шпиль · вкладка сообщества | spire#4 Шпиль — башня, я на 4 этаже | app/(tabs)/community.tsx ; components/v2/V2SegmentedControl.tsx | 412×915 светл.+тёмн. |
| 66 | spire-gap-001 | P3 | Шпиль · Ступень · Задание — вставь слово | spire-gaps-states#1 Задание — вставь слово | components/spire/SpireTaskView.tsx | 412×915 светл.+тёмн. |
| 67 | spire-gap-002 | P3 | Шпиль · Ступень · Задание — найди лишнее | spire-gaps-states#2 Задание — найди лишнее | components/spire/SpireTaskView.tsx | 412×915 светл.+тёмн. |
| 68 | spire-gap-003 | P3 | Шпиль · Ступень · Задание — собери перевод | spire-gaps-states#3 Задание — собери перевод | components/spire/SpireTaskView.tsx | 412×915 светл.+тёмн. |
| 69 | spire-gap-004 | P3 | Шпиль · Ступень · Задание — послушай и выбери | spire-gaps-states#4 Задание — послушай и выбери | components/spire/SpireTaskView.tsx | 412×915 светл.+тёмн. |
| 70 | spire-gap-005 | P3 | Шпиль · Ступень · Задание — послушай и собери | spire-gaps-states#5 Задание — послушай и собери | components/spire/SpireTaskView.tsx | 412×915 светл.+тёмн. |
| 71 | spire-gap-006 | P3 | Шпиль · Ступень · Задание — найди пары | spire-gaps-states#6 Задание — найди пары | components/spire/SpirePairsBoard.tsx ; components/spire/SpireTaskView.tsx | 412×915 светл.+тёмн. |
| 72 | spire-gap-008 | P3 | Шпиль · Главный · Старт — задания недели ещё готовятся | spire-gaps-states#8 Старт — задания недели ещё готовятся | components/spire/SpireClimbDock.tsx | 412×915 светл.+тёмн. |
| 73 | spire-gap-009 | P3 | Шпиль · Главный · Главный — комнаты ещё нет, «Подняться» неактивна | spire-gaps-states#9 Главный — комнаты ещё нет, «Подняться» неактивна | components/spire/SpireHomeScreen.tsx ; components/spire/SpireClimbDock.tsx | 412×915 светл.+тёмн. |
| 74 | spire-gap-011 | P3 | Шпиль · Главный · Шпиль откроется чуть позже | spire-gaps-states#11 Шпиль откроется чуть позже | components/spire/SpireLockedState.tsx | 412×915 светл.+тёмн. |
| 75 | spire-gap-012 | P3 | Шпиль · Результат · Провал — время вышло | spire-gaps-states#12 Провал — время вышло | components/spire/SpireResultPanel.tsx | 412×915 светл.+тёмн. |
| 76 | spire-gap-014 | P3 | Шпиль · Результат · Провал — ступень не сохранилась | spire-gaps-states#14 Провал — ступень не сохранилась | components/spire/SpireResultPanel.tsx | 412×915 светл.+тёмн. |
| 77 | spire-gap-015 | P3 | Шпиль · Итог недели · Итог недели — поднимаешься | spire-gaps-states#15 Итог недели — поднимаешься | components/spire/SpireWeekResultCard.tsx | 412×915 светл.+тёмн. |
| 78 | spire-gap-021 | P3 | Шпиль · Ступень · Ступень с флажком жалобы | spire-gaps-states#21 Ступень с флажком жалобы | modules/spire/SpireTaskReportButton.tsx ; components/spire/SpireStepScreen.tsx | 412×915 светл.+тёмн. |
| 79 | community-002 | P4 | Вкладка и Шпиль · Шпиль · топ-3 | community#2 Шпиль · топ-3 | components/spire/SpirePodium.tsx ; components/spire/SpireHomeScreen.tsx | 412×915 светл.+тёмн. |
| 80 | community-006 | P4 | Друзья · список и заявки | community#6 список и заявки | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 81 | community-008 | P4 | Друзья · поиск · скелетон | community#8 поиск · загрузка | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 82 | community-009 | P4 | Друзья · профиль найден | community#17 поиск · найден | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 83 | community-011 | P4 | Друзья · заявку не удалось отправить | community#25 добавление · нет связи | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 84 | community-012 | P4 | Друзья · ник или код не найден | community#18 поиск · не найден | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 85 | community-015 | P4 | Друзья · поиск · нет связи | community#21 поиск · нет связи | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 86 | community-017 | P4 | Друзья · заявка отправлена | community#17 поиск · найден | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 87 | community-018 | P4 | Друзья · уже друзья | community#23 добавление · уже друзья | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 88 | community-019 | P4 | Друзья · заявка уже отправлена | community#24 добавление · заявка уже отправлена | app/(tabs)/friends.tsx ; components/friends/FriendsGlassKit.tsx | 412×915 светл.+тёмн. |
| 89 | community-024 | P4 | Друзья · подтверждение удаления | community#15 подтверждение удаления | components/friends_together/FriendTogetherSheet.tsx | 412×915 светл.+тёмн. |
| 90 | profile-017 | P5 | Помощь и подписка · статический пример · месячная подписка | manage-subscription-states#3 Управление Plus · месячная | app/manage_subscription.tsx | 412×915 светл.+тёмн. |
| 91 | profile-018 | P5 | Помощь и подписка · статический пример · разовая покупка | manage-subscription-states#5 Управление Plus · разовая покупка | app/manage_subscription.tsx | 412×915 светл.+тёмн. |
| 92 | profile-019 | P5 | Помощь и подписка · статический пример · загрузка данных магазина | manage-subscription-states#4 Управление Plus · загрузка плана | app/manage_subscription.tsx | 412×915 светл.+тёмн. |
| 93 | coins-003 | P5 | Кошелёк и ранги · повышение · готово к подтверждению | coins#3 повышение · готово к подтверждению | app/coin_rank.tsx | 412×915 светл.+тёмн. |
| 94 | coins-005 | P5 | Кошелёк и ранги · повышение · недостаточно монет | coins#5 повышение · недостаточно монет | app/coin_rank.tsx | 412×915 светл.+тёмн. |
| 95 | coins-006 | P5 | Кошелёк и ранги · каталог 00–19 | coins#6 каталог 00–19 | components/coins/CoinRankCatalog.tsx ; app/coin_rank.tsx | 412×915 светл.+тёмн. |
| 96 | coins-007 | P5 | Кошелёк и ранги · Монетный двор · подтверждённый успех | coins#7 Монетный двор · подтверждённый успех | components/level_up/LevelUpMintCeremony.tsx | 412×915 светл.+тёмн. |
| 97 | coins-008 | P5 | Plus и покупки · нейтральное предложение | coins#8 нейтральное предложение | components/paywall/PaywallPlusScreen.tsx | 412×915 светл.+тёмн. |
| 98 | coins-009 | P5 | Plus и покупки · предложение · загрузка | coins#9 предложение · загрузка | components/paywall/PaywallPlusScreen.tsx | 412×915 светл.+тёмн. |
| 99 | coins-010 | P5 | Plus и покупки · предложение · ошибка до checkout | coins#10 предложение · ошибка до checkout | components/paywall/PaywallPlusScreen.tsx | 412×915 светл.+тёмн. |
| 100 | coins-011 | P5 | Plus и покупки · покупка · ожидание магазина | coins#11 покупка · ожидание магазина | components/paywall/PaywallPlusScreen.tsx | 412×915 светл.+тёмн. |
| 101 | coins-012 | P5 | Plus и покупки · покупка · подтверждение неизвестно | coins#12 покупка · подтверждение неизвестно | app/paywall_purchase.ts | 412×915 светл.+тёмн. |
| 102 | coins-013 | P5 | Plus и покупки · доступ закончился · шторка | coins#13 доступ закончился · шторка | components/EntitlementExpiredHost.tsx | 412×915 светл.+тёмн. |
| 103 | coins-014 | P5 | Plus и покупки · доступ к разбору · решение открыто | coins#14 статистика Free · блюр | components/AiLimitUpsellCard.tsx | 412×915 светл.+тёмн. |
| 104 | coins-015 | P5 | Подтверждённый доступ и границы · Plus-бейдж в профиле | coins#15 Plus-бейдж в профиле | components/PlusBadge.tsx | 412×915 светл.+тёмн. |
| 105 | coins-016 | P5 | Подтверждённый доступ и границы · первая покупка · подтверждена магазином | coins#16 первая покупка · подтверждена магазином | components/FirstPurchaseSealCelebration.tsx | 412×915 светл.+тёмн. |
| 106 | coins-017 | P5 | Подтверждённый доступ и границы · граница доступа урока | coins#18 граница доступа урока | app/(tabs)/lessons.tsx | 412×915 светл.+тёмн. |
| 107 | paywalls-011 | P5 | Цена и покупка · Загрузка условий | paywall-price-states#1 011 · Загрузка условий | components/paywall/PaywallPlusScreen.tsx | 412×915 светл.+тёмн. |
| 108 | paywalls-013 | P5 | Цена и покупка · Проверяем покупку | paywall-price-states#4 013 · Проверяем покупку: идёт оплата | components/paywall/PaywallPlusScreen.tsx | 412×915 светл.+тёмн. |
| 109 | paywalls-015 | P5 | Цена и покупка · Результат покупки неизвестен · отдельный диалог | paywall-price-states#7 015 · Результат покупки неизвестен (диалог) | app/paywall_purchase.ts | 412×915 светл.+тёмн. |
| 110 | paywalls-016 | P5 | Цена и покупка · Статус неизвестен | paywall-price-states#8 016 · Статус неизвестен (после проверки) | app/paywall_purchase.ts | 412×915 светл.+тёмн. |
| 111 | paywalls-020 | P5 | Управление действующим Plus · Загрузка плана | manage-subscription-states#4 Загрузка плана | app/manage_subscription.tsx | 412×915 светл.+тёмн. |
| 112 | paywalls-021 | P5 | Управление действующим Plus · Разовая покупка | manage-subscription-states#5 Разовая покупка | app/manage_subscription.tsx | 412×915 светл.+тёмн. |
| 113 | paywall-gap-002 | P5 | Пейвол Plus · Вход из Настроек — «FREE И PLUS» свёрнуто | paywall-gaps-states#2 Вход из Настроек — «FREE И PLUS» свёрнуто | components/paywall/PaywallBenefitComparison.tsx | 412×915 светл.+тёмн. |
| 114 | paywall-gap-003 | P5 | Пейвол Plus · Вход из Настроек — «FREE И PLUS» развёрнуто | paywall-gaps-states#3 Вход из Настроек — «FREE И PLUS» развёрнуто | components/paywall/PaywallBenefitComparison.tsx | 412×915 светл.+тёмн. |
| 115 | paywall-gap-004 | P5 | Пейвол Plus · Лента пробного периода | paywall-gaps-states#4 Лента пробного периода | components/paywall/PaywallPlus.tsx ; components/paywall/PaywallPlusCopy.ts | 412×915 светл.+тёмн. |
| 116 | paywall-gap-005 | P5 | Пейвол Plus · Выбран «Месяц» | paywall-gaps-states#5 Выбран «Месяц» | components/paywall/PaywallPlusCopy.ts | 412×915 светл.+тёмн. |
| 117 | paywall-gap-006 | P5 | Пейвол Plus · После покупки — «Plus твой. Напомнить…» | paywall-gaps-states#6 После покупки — «Plus твой. Напомнить…» | components/paywall/PaywallTrialReminderPrompt.tsx | 412×915 светл.+тёмн. |
| 118 | profile-001 | P6 | Профиль и основные настройки · настройки | settings-gaps-states#29 Верхний слот сообщений: «Важное от Phraseman» сразу под группой «Профиль» | app/(tabs)/settings.tsx ; components/settings/SettingsGlassRows.tsx | 412×915 светл.+тёмн. |
| 119 | profile-007 | P6 | Обучение и внешний вид · обучение и озвучка | settings-gaps-states#15 Обучение — низ (скорость, голос) | app/settings_edu.tsx | 412×915 светл.+тёмн. |
| 120 | profile-014 | P6 | Помощь и подписка · форма поддержки · диагностика раскрыта | settings-gaps-states#22 Поддержка — диагностика раскрыта | app/support_report.tsx | 412×915 светл.+тёмн. |
| 121 | profile-025 | P6 | Помощь и подписка · опрос недоступен · совместимый маршрут | profile#15 опрос · пустое состояние | app/survey_screen.tsx | 412×915 светл.+тёмн. |
| 122 | profile-030 | P6 | Проект UX · критические действия · проект UX · удаление до отправки | profile#19 проект UX · удаление до отправки | components/DeleteAccountConfirmModal.tsx | 412×915 светл.+тёмн. |
| 123 | auth-gap-001 | P6 | Аккаунт · Аккаунт — гость | accounts-gaps-states#1 Аккаунт — гость | app/account_details.tsx | 412×915 светл.+тёмн. |
| 124 | auth-gap-002 | P6 | Аккаунт · Аккаунт — Google, адрес скопирован | accounts-gaps-states#2 Аккаунт — Google, адрес скопирован | app/account_details.tsx | 412×915 светл.+тёмн. |
| 125 | auth-gap-003 | P6 | Вход · Окно входа — телефон уже связан с другим аккаунтом | accounts-gaps-states#3 Окно входа — телефон уже связан с другим аккаунтом | components/RegistrationPromptModal.tsx ; app/account_switch_copy.ts | 412×915 светл.+тёмн. |
| 126 | auth-gap-004 | P6 | Вход · Окно входа — прогресс на месте, вход отменён | accounts-gaps-states#4 Окно входа — прогресс на месте, вход отменён | components/RegistrationPromptModal.tsx ; app/account_sync_copy.ts | 412×915 светл.+тёмн. |
| 127 | auth-gap-005 | P6 | Вход · Окно входа — ждёт прогресс другого аккаунта | accounts-gaps-states#5 Окно входа — ждёт прогресс другого аккаунта | components/RegistrationPromptModal.tsx ; app/account_backup_blocked_copy.ts | 412×915 светл.+тёмн. |
| 128 | auth-gap-006 | P6 | Вход · Окно входа — аккаунт восстановлен | accounts-gaps-states#6 Окно входа — аккаунт восстановлен | components/RegistrationPromptModal.tsx ; app/account_delete_restore_prompt.ts | 412×915 светл.+тёмн. |
| 129 | auth-gap-007 | P6 | Вход · Восстановить аккаунт? | accounts-gaps-states#7 Восстановить аккаунт? | app/account_delete_restore_prompt.ts | 412×915 светл.+тёмн. |
| 130 | auth-gap-008 | P6 | Вход · Аккаунт удалён | accounts-gaps-states#8 Аккаунт удалён | app/account_delete_restore_prompt.ts | 412×915 светл.+тёмн. |
| 131 | auth-gap-009 | P6 | Аккаунт · Удалить аккаунт? — с входом (14 дней) | accounts-gaps-states#9 Удалить аккаунт? — с входом (14 дней) | components/DeleteAccountConfirmModal.tsx | 412×915 светл.+тёмн. |
| 132 | auth-gap-010 | P6 | Аккаунт · Удалить аккаунт? — гость | accounts-gaps-states#10 Удалить аккаунт? — гость | components/DeleteAccountConfirmModal.tsx | 412×915 светл.+тёмн. |
| 133 | auth-gap-012 | P6 | Аккаунт · Сменить аккаунт? — с переносом Plus | accounts-gaps-states#12 Сменить аккаунт? — с переносом Plus | app/(tabs)/settings.tsx ; app/account_switch_copy.ts | 412×915 светл.+тёмн. |
| 134 | auth-gap-016 | P6 | Аккаунт · Смена — прогресс не сохранён | accounts-gaps-states#16 Смена — прогресс не сохранён | app/(tabs)/settings.tsx | 412×915 светл.+тёмн. |
| 135 | settings-gap-001 | P6 | Настройки · Главная — профиль привязан | settings-gaps-states#1 Главная — профиль привязан | app/(tabs)/settings.tsx | 412×915 светл.+тёмн. |
| 136 | settings-gap-004 | P6 | Настройки · Главная — Plus по промокоду | settings-gaps-states#4 Главная — Plus по промокоду | app/(tabs)/settings.tsx | 412×915 светл.+тёмн. |
| 137 | settings-gap-005 | P6 | Настройки · Главная — Plus за приглашения + пробный доступ | settings-gaps-states#5 Главная — Plus за приглашения + пробный доступ | app/(tabs)/settings.tsx | 412×915 светл.+тёмн. |
| 138 | onboarding-paywall-002 | P7 | Онбординг · экран цены Plus · Онбординг · Цена: справочная цена | onboarding-states#24 Онбординг · Цена: справочная цена | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 139 | onboarding-003 | P7 | Онбординг · Онбординг · Вход идёт долго | onboarding-states#3 Онбординг · Вход идёт долго | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 140 | onboarding-004 | P7 | Онбординг · Онбординг · Вход: нет сети | onboarding-states#4 Онбординг · Вход: нет сети | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 141 | onboarding-005 | P7 | Онбординг · Онбординг · Аккаунта нет | onboarding-states#5 Онбординг · Аккаунта нет | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 142 | onboarding-009 | P7 | Онбординг · Онбординг · Знакомство | onboarding-states#9 Онбординг · Знакомство | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 143 | onboarding-012 | P7 | Онбординг · Онбординг · «Помоги сделать Phraseman лучше» | onboarding-states#12 Онбординг · «Помоги сделать Phraseman лучше» | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 144 | onboarding-013 | P7 | Онбординг · Онбординг · «Как ты узнал о нас?» | onboarding-states#13 Онбординг · «Как ты узнал о нас?» | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 145 | onboarding-016 | P7 | Онбординг · Онбординг · Уровень (выключен в сборке) | onboarding-states#16 Онбординг · Уровень (выключен в сборке) | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 146 | onboarding-017 | P7 | Онбординг · Онбординг · Уровень: выбрано | onboarding-states#17 Онбординг · Уровень: выбрано | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 147 | onboarding-018 | P7 | Онбординг · Онбординг · Уведомления | onboarding-states#18 Онбординг · Уведомления | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 148 | onboarding-031 | P7 | Онбординг · Онбординг · Уровень (выключен в сборке) · тёмная «Океан» | onboarding-states#31 Онбординг · Уровень · «Океан» | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 149 | onboarding-032 | P7 | Онбординг · Онбординг · Уровень: выбрано · тёмная «Океан» | onboarding-states#32 Онбординг · Уровень · выбрано · «Океан» | components/CleanOnboarding.tsx | 412×915 светл.+тёмн. |
| 150 | friends-duel-001 | P8 | Друзья · дуэль на 5 фраз · Дуэль · Фраза 2 из 5 | friends-full#31 Фраза 2 из 5 | app/friends_duel.tsx ; components/friends_together/DuelPlayTopBar.tsx | 412×915 светл.+тёмн. |
| 151 | friends-duel-002 | P8 | Друзья · дуэль на 5 фраз · Дуэль · Верно | friends-full#32 Верно | app/friends_duel.tsx ; components/friends_together/DuelPlayTopBar.tsx | 412×915 светл.+тёмн. |
| 152 | friends-duel-003 | P8 | Друзья · дуэль на 5 фраз · Дуэль · Ход отправлен | friends-full#33 Ход отправлен | app/friends_duel.tsx ; components/friends_together/DuelPlayTopBar.tsx | 412×915 светл.+тёмн. |
| 153 | friends-duel-004 | P8 | Друзья · дуэль на 5 фраз · Дуэль · Победа | friends-full#35 Победа | app/friends_duel.tsx ; components/friends_together/DuelPlayTopBar.tsx | 412×915 светл.+тёмн. |
| 154 | friends-duel-005 | P8 | Друзья · дуэль на 5 фраз · Дуэль · Поражение | friends-full#36 Поражение | app/friends_duel.tsx ; components/friends_together/DuelPlayTopBar.tsx | 412×915 светл.+тёмн. |
