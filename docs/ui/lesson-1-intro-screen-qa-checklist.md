# Lesson 1 Intro Screen QA Checklist

Цель: пройти intro screen урока 1 так глубоко, чтобы конечный пользователь не увидел визуальных, текстовых, навигационных, локализационных или state-ошибок.

Scope:
- Экран: `LessonIntroScreens` для `lessonId = 1`.
- Контент: `LESSON_1_INTRO_SCREENS`.
- Точка входа: первый вход в `/lesson1?id=1` и admin preview intro.
- Языки UI: RU, UK, ES.
- Study target: обычный режим English и dev-режим Spanish, если он включен в сборке.

Связанные файлы:
- `app/lesson_intro_screens.tsx`
- `app/lesson_intro_screens_lesson1_v2.ts`
- `app/lesson_data_all.ts`
- `app/lesson1.tsx`
- `app/_admin_intro_preview.tsx`
- `tests/lesson_intro_screens_locale.test.ts`
- `scripts/audit_lesson_intro_alignment.mjs`

## 0. Release Gate

Нельзя выпускать, если хотя бы один пункт из этого блока не пройден.

- [ ] Первый вход в урок 1 показывает intro, а не пустой экран.
- [ ] Intro урока 1 содержит 3 блока: concept, formula, practice.
- [ ] На экране нет кракозябр, `undefined`, `null`, пустых строк, пустых карточек.
- [ ] Первый блок объясняет только `am / is / are`, без лишних тем уроков 2+.
- [ ] Все английские примеры грамматически корректны.
- [ ] Wrong-примеры явно выглядят как ошибки и не могут быть приняты за правильный ответ.
- [ ] Correct-примеры читаются как правильные и визуально отличаются от wrong.
- [ ] Тап раскрывает следующий блок.
- [ ] Скролл работает после раскрытия длинного контента.
- [ ] CTA `Начать урок` появляется только после раскрытия всех блоков.
- [ ] CTA не перекрывает последний блок.
- [ ] Нажатие CTA переводит в реальный lesson UI.
- [ ] Кнопка назад закрывает intro/возвращает назад без crash.
- [ ] После первого реального входа флаг `lesson1_intro_shown` записан.
- [ ] При повторном входе intro не показывается, если флаг уже записан.
- [ ] После сброса флага intro снова показывается.
- [ ] Экран читаем на маленьком Android.
- [ ] Экран читаем на iPhone с notch.
- [ ] Экран читаем в светлой и темной теме.
- [ ] Нет console/runtime warnings, red screen, unhandled promise rejection.

## 1. Preconditions

- [ ] Установлена актуальная dev-сборка приложения.
- [ ] Metro запущен без ошибок.
- [ ] Приложение открывается на home/settings без красного экрана.
- [ ] Пользователь авторизован или находится в допустимом guest-состоянии.
- [ ] Урок 1 доступен пользователю.
- [ ] Нет активного blocking modal поверх урока: update, warning, no energy, onboarding, release notes.
- [ ] Для чистого сценария удален `lesson1_intro_shown`.
- [ ] Для repeat-сценария заранее записан `lesson1_intro_shown = true`.
- [ ] Для preview-сценария доступен admin/tester route.
- [ ] Проверяющий знает текущую тему, язык UI и study target.

## 2. Automated Checks

Команды перед ручным прогоном:

```powershell
npm test -- --runTestsByPath tests/lesson_1_intro_screen_contract.test.ts
npm test -- --runTestsByPath tests/lesson_intro_screens_locale.test.ts
npm run audit:lesson-intros
powershell -ExecutionPolicy Bypass -File ./scripts/run_maestro.ps1 maestro/flows/modules/lessons/lesson1_intro_contract.yaml
```

Ожидаемо:
- [ ] `lesson_1_intro_screen_contract.test.ts` проходит.
- [ ] `lesson_intro_screens_locale.test.ts` проходит.
- [ ] Урок 1 подключен к dedicated intro content: 3 блока concept/formula/practice.
- [ ] В intro урока 1 сохранены ключевые wrong/correct examples.
- [ ] В intro урока 1 не попали темы поздних уроков.
- [ ] `getLessonIntroScreens(1)` возвращает минимум 3 блока.
- [ ] ES-поля intro заполнены.
- [ ] `audit:lesson-intros` пишет `OK: intro alignment checks passed`.
- [ ] Maestro `lesson1_intro_contract.yaml` проходит на чистом user-state.
- [ ] В audit нет critical issues.
- [ ] В audit нет warnings по уроку 1.
- [ ] После команд нет новых неожиданных ошибок в терминале.

## 3. Entry Flow: Real First Visit

- [ ] Очистить `lesson1_intro_shown`.
- [ ] Открыть приложение с холодного старта.
- [ ] Перейти к списку уроков.
- [ ] Открыть урок 1.
- [ ] До intro нет долгого белого/пустого экрана.
- [ ] Header intro виден: `Урок 1` / localized label.
- [ ] Level badge виден: `A1`.
- [ ] Кнопка назад видна и нажимаема.
- [ ] Первый блок intro уже виден.
- [ ] Второй и третий блоки не видны до тапа.
- [ ] Подсказка `Коснитесь...` появляется после задержки, если есть скрытые блоки.
- [ ] Тап в пустой области раскрывает блок 2.
- [ ] Тап по карточке раскрывает блок 2.
- [ ] Скролл-жест не считается тапом, если пользователь реально скроллит.
- [ ] После блока 2 еще нет CTA.
- [ ] Следующий тап раскрывает блок 3.
- [ ] После раскрытия блока 3 CTA плавно появляется.
- [ ] Подсказка продолжения исчезает после раскрытия всех блоков.
- [ ] CTA нажимается с первого раза.
- [ ] После CTA пользователь попадает в первое задание урока 1.
- [ ] В задании урока нет повторного intro поверх lesson UI.

## 4. Entry Flow: Repeat Visit

- [ ] Записать/оставить `lesson1_intro_shown = true`.
- [ ] Полностью закрыть приложение.
- [ ] Открыть приложение заново.
- [ ] Открыть урок 1.
- [ ] Intro не показывается.
- [ ] Сразу открывается lesson UI.
- [ ] Нет flash intro на 1 кадр.
- [ ] Нет пустого экрана между lesson menu и lesson UI.
- [ ] Back из lesson UI возвращает на ожидаемый экран.

## 5. Reset Flow

- [ ] Открыть admin intro preview.
- [ ] Нажать сброс флагов показа всех 32 уроков.
- [ ] Убедиться, что `lesson1_intro_shown` удален.
- [ ] Открыть урок 1 реальным путем.
- [ ] Intro снова показывается.
- [ ] После показа флаг снова записывается.
- [ ] Сброс не удаляет progress урока.
- [ ] Сброс не ломает unlocked lessons.
- [ ] Сброс не меняет язык/тему пользователя.

## 6. Admin Preview Flow

- [ ] Открыть `_admin_intro_preview`.
- [ ] Плитка урока 1 видна.
- [ ] Плитка урока 1 помечена как готовая.
- [ ] Плитка показывает правильное количество блоков.
- [ ] Тап по плитке открывает тот же визуальный компонент intro.
- [ ] Preview не запускает реальный урок.
- [ ] `Начать урок` в preview закрывает overlay, а не уводит в урок.
- [ ] Крестик/назад в preview закрывает overlay.
- [ ] Повторное открытие preview работает без сброса приложения.
- [ ] Preview не записывает `lesson1_intro_shown`.
- [ ] Preview корректно отражает eye/flag state, если реальный intro уже был показан.

## 7. Content: Block 1 Concept

- [ ] Заголовок RU: смысл про необходимость `am / is / are`.
- [ ] Заголовок UK: тот же смысл.
- [ ] Заголовок ES: тот же смысл.
- [ ] Subtitle объясняет, что в RU/UK глагол может быть невидим, а в English обязателен.
- [ ] Нет противоречия между subtitle и body.
- [ ] Wrong-примеры: `I here`, `He busy`, `It important`.
- [ ] Correct-примеры: `I am here`, `He is busy`, `It is important`.
- [ ] `am / is / are` подсвечены accent-цветом.
- [ ] Wrong-строка не смешана визуально с correct-строкой.
- [ ] Tip объясняет связь person + place/state/quality.
- [ ] Нет объяснения вопросов.
- [ ] Нет объяснения отрицаний.
- [ ] Нет профессий, времени, `at home`, новых конструкций.
- [ ] В ES не появляется русская или украинская строка.
- [ ] В RU не появляется испанский перевод, кроме английских примеров.
- [ ] В UK не появляется русский перевод вместо украинского.

## 8. Content: Block 2 Formula

- [ ] Заголовок говорит про формулу урока.
- [ ] Формула: `Who? + am / is / are + description`.
- [ ] RU формула использует понятную локализацию `Кто?`.
- [ ] UK формула использует понятную локализацию `Хто?`.
- [ ] ES формула не выглядит как перевод на русский/украинский.
- [ ] Примеры: `I am ready`, `She is calm`, `They are happy`.
- [ ] Правила выбора: `I -> am`, `he/she/it -> is`, `you/we/they -> are`.
- [ ] Labels в examples соответствуют примеру.
- [ ] `He is busy` переведен корректно.
- [ ] `We are together` переведен корректно.
- [ ] `It is important` переведен корректно.
- [ ] В блоке нет вопросов.
- [ ] В блоке нет отрицаний.
- [ ] В блоке нет времен кроме текущей связки to be.
- [ ] Формула не переносится так, что становится нечитаемой на узком экране.
- [ ] Английские куски в формуле не теряют пробелы.

## 9. Content: Block 3 Practice

- [ ] Заголовок объясняет сборку фразы в задании.
- [ ] Subtitle: не переводить все сразу, собрать по шагам.
- [ ] Шаг 1: найти subject/who.
- [ ] Шаг 2: выбрать `am / is / are`.
- [ ] Шаг 3: добавить description.
- [ ] Wrong: `She ready`.
- [ ] Correct: `She is ready`.
- [ ] RU/UK текст не говорит, что интерфейс надо нажимать в конкретном месте, если это не видно на экране.
- [ ] Нет лишнего объяснения кнопки `1/2`.
- [ ] Нет длинной справки по приложению.
- [ ] Examples: `I am outside`, `They are tired`, `It is empty`.
- [ ] Notes соответствуют выбранной форме: I/am, they/are, it/is.
- [ ] Wrong и Correct видны без двусмысленности.
- [ ] Последняя карточка не оказывается под CTA.
- [ ] После скролла вниз CTA остается доступным.

## 10. Localization Matrix

Для каждого языка повторить полный проход:

- [ ] RU: header, title, subtitle, body, examples, CTA, back accessibility label.
- [ ] UK: header, title, subtitle, body, examples, CTA, back accessibility label.
- [ ] ES: header, title, subtitle, body, examples, CTA, back accessibility label.
- [ ] RU: нет mojibake в реальном UI.
- [ ] UK: нет mojibake в реальном UI.
- [ ] ES: нет mojibake в реальном UI.
- [ ] RU: нет непереведенных fallback-строк, кроме английских учебных примеров.
- [ ] UK: нет русских fallback-строк.
- [ ] ES: нет русских fallback-строк.
- [ ] ES: accents вроде `está`, `vacío`, `Él` отображаются корректно.
- [ ] UK: апострофы и мягкие знаки отображаются корректно.
- [ ] RU: кавычки не ломают переносы.
- [ ] Все языки: CTA помещается в кнопку.
- [ ] Все языки: hint помещается в строку или аккуратно переносится.

## 11. Study Target Matrix

- [ ] English target + RU UI: primary examples на английском, secondary на русском.
- [ ] English target + UK UI: primary examples на английском, secondary на украинском.
- [ ] English target + ES UI: primary examples на английском, secondary на испанском.
- [ ] Spanish target + RU UI, если доступно: primary examples не ломаются.
- [ ] Spanish target + UK UI, если доступно: fallback не смешивает языки странно.
- [ ] Spanish target + ES UI, если доступно: строки соответствуют Spanish-study режиму.
- [ ] Переключение target перед входом в урок не показывает старый intro-контент из кеша.
- [ ] После смены target флаг показа не создает некорректный сценарий для проверки.

## 12. Visual Layout

Проверить на каждом устройстве из matrix:

- [ ] Header не залезает в status bar.
- [ ] Header не залезает под notch.
- [ ] Header pill не обрезает `Урок 1`.
- [ ] Badge `A1` виден.
- [ ] Back button имеет минимум 36x36 visual area.
- [ ] Back button tap area комфортная.
- [ ] Карточка имеет видимые отступы от краев.
- [ ] Левая цветная stripe видна и не съедает текст.
- [ ] Icon circle не перекрывает title.
- [ ] Title не выходит за карточку.
- [ ] Body line-height комфортный.
- [ ] Formula line не обрезается.
- [ ] Wrong/correct framed lines имеют достаточный padding.
- [ ] Example box не выглядит как вложенная карточка, если визуально перегружено.
- [ ] Между блоками есть воздух.
- [ ] Нижний spacer защищает контент от CTA.
- [ ] CTA не перекрывает navigation bar.
- [ ] CTA не выходит за safe area.
- [ ] CTA shadow/elevation не создает грязный ореол.
- [ ] Gradient CTA читаемый на всех темах.
- [ ] Нет мерцания при появлении CTA.
- [ ] Нет резкого layout jump при раскрытии блока.
- [ ] При повороте экрана нет fatal layout issue, если orientation поддерживается.

## 13. Device Matrix

Минимальный набор:

- [ ] Android small: 360x640 или близко.
- [ ] Android medium: Pixel 5/6/8.
- [ ] Android large: Pixel Fold/large emulator.
- [ ] Android with 3-button navigation.
- [ ] Android gesture navigation.
- [ ] iOS small: iPhone SE.
- [ ] iOS notch: iPhone 13/14/15.
- [ ] iOS large: Pro Max.
- [ ] Tablet, если приложение поддерживает tablet layout.

На каждом устройстве:
- [ ] First block виден без горизонтального скролла.
- [ ] Все блоки можно раскрыть.
- [ ] Все блоки можно прочитать.
- [ ] CTA можно нажать.
- [ ] Back можно нажать.
- [ ] Нет clipping текста.
- [ ] Нет горизонтального overflow.
- [ ] Нет touch dead zones.

## 14. Themes

- [ ] Default dark.
- [ ] Minimal light.
- [ ] Sakura.
- [ ] Ocean.
- [ ] Neon.
- [ ] Forest.
- [ ] Fog.
- [ ] Coral.
- [ ] Grafit.

Для каждой темы:
- [ ] Background не спорит с карточками.
- [ ] Text primary читается.
- [ ] Text muted читается.
- [ ] Accent виден.
- [ ] Success виден.
- [ ] Danger виден.
- [ ] Warning/gold виден.
- [ ] CTA текст контрастный.
- [ ] Back icon контрастный.
- [ ] Border не исчезает полностью.
- [ ] Shadows не делают карточку мутной.

## 15. Interaction And Gestures

- [ ] Single tap раскрывает ровно один следующий блок.
- [ ] Double tap не перепрыгивает через два блока непредсказуемо.
- [ ] Tap во время анимации не ломает state.
- [ ] Быстрые 5 taps не вызывают crash.
- [ ] Tap по hint раскрывает следующий блок через родительский Pressable.
- [ ] Tap по CTA после появления не раскрывает блок заново.
- [ ] Tap по back во время анимации безопасен.
- [ ] Back hardware button Android работает ожидаемо.
- [ ] iOS swipe-back, если включен, не оставляет overlay.
- [ ] Scroll вверх/вниз работает после раскрытия каждого блока.
- [ ] Long press не вызывает нежелательное выделение/меню.
- [ ] Haptics не crash на устройстве без haptic support.

## 16. Animation Quality

- [ ] Header fade выглядит плавно.
- [ ] Card fade выглядит плавно.
- [ ] Slide-up не дергается.
- [ ] Icon pulse не раздражает и не ломает layout.
- [ ] Hint bobbing не перекрывает текст.
- [ ] CTA fade-in не появляется слишком рано.
- [ ] CTA breathing pulse не меняет layout.
- [ ] На слабом Android нет сильного stutter.
- [ ] При reduced motion, если системно влияет, экран остается понятным.
- [ ] При background/foreground во время анимации экран не зависает.

## 17. State And Storage

- [ ] До первого входа `lesson1_intro_shown` отсутствует.
- [ ] При первом входе флаг записывается.
- [ ] Если пользователь нажал back из intro, флаг уже записан и intro не повторяется.
- [ ] Это поведение принято продуктово; если нет, завести bug.
- [ ] Если AsyncStorage read падает, intro показывается.
- [ ] Если AsyncStorage write падает, экран не crash.
- [ ] Replay intro route/token показывает intro повторно.
- [ ] Replay intro не ломает обычный `lesson1_intro_shown`.
- [ ] Preview не пишет флаг.
- [ ] Reset флагов удаляет только `lesson{id}_intro_shown`.
- [ ] Смена lesson id не переносит флаг урока 1 на другой урок.
- [ ] Смена study target не оставляет stale intro в текущем render.

## 18. Navigation

- [ ] Из lesson menu -> lesson 1 -> intro.
- [ ] Из home continue -> lesson 1 -> intro, если флага нет.
- [ ] Из notification/deeplink -> lesson 1 -> intro, если флага нет и route допустим.
- [ ] Back из intro возвращает туда, откуда пользователь пришел.
- [ ] CTA из intro ведет в lesson 1, а не в другой урок.
- [ ] После CTA phrase index начинается корректно.
- [ ] После завершения урока нет возврата на intro.
- [ ] App background во время intro и возврат не сбрасывает revealedCount неожиданно.
- [ ] App kill во время intro и повторный запуск соответствует storage policy.

## 19. Accessibility

- [ ] Back button имеет accessibility role button.
- [ ] Back button имеет localized accessibility label.
- [ ] CTA имеет понятный текст.
- [ ] Dynamic font size не ломает header.
- [ ] Dynamic font size не ломает CTA.
- [ ] Screen reader читает карточки в логичном порядке.
- [ ] Wrong/correct не передаются только цветом; текстовые метки помогают понять смысл.
- [ ] Hit areas удобные.
- [ ] Контраст текста достаточный.
- [ ] Нет критически мелкого текста в examples/labels.
- [ ] Анимации не являются единственным способом понять state.

## 20. Error And Crash Watch

Во время ручного прогона открыть logs.

- [ ] Нет red screen.
- [ ] Нет yellow warning про missing key.
- [ ] Нет warning про Animated useNativeDriver.
- [ ] Нет warning про `Cannot update a component while rendering`.
- [ ] Нет warning про unmounted state update.
- [ ] Нет unhandled promise rejection.
- [ ] Нет Firebase/analytics crash из-за входа в lesson.
- [ ] Нет ошибки safe-area context.
- [ ] Нет ошибки vector icons.
- [ ] Нет ошибки LinearGradient.
- [ ] Нет ошибок theme undefined.
- [ ] Нет ошибок lang undefined.
- [ ] Нет ошибок studyTarget undefined.

## 21. Copy QA

- [ ] Все фразы короткие и полезные.
- [ ] Нет орфографических ошибок.
- [ ] Нет грамматических ошибок в RU.
- [ ] Нет грамматических ошибок в UK.
- [ ] Нет грамматических ошибок в ES.
- [ ] Нет канцелярита или слишком длинных объяснений.
- [ ] Термины одинаковые: `am / is / are`, `To Be`, `description`.
- [ ] `Who?` в ES-study не вводит пользователя в заблуждение.
- [ ] Wrong examples не выглядят как допустимый разговорный English.
- [ ] Correct examples соответствуют A1.
- [ ] Нет тем, которых пользователь еще не проходил.
- [ ] Нет конфликтов с реальными фразами первого урока.

## 22. Learning Quality

- [ ] Пользователь понимает, зачем нужен `am / is / are`.
- [ ] Пользователь видит разницу между RU/UK zero-verb и English required verb.
- [ ] Пользователь понимает базовую формулу.
- [ ] Пользователь понимает выбор `am/is/are`.
- [ ] Пользователь понимает, как применять это в задании.
- [ ] Блоки идут от смысла к формуле и практике.
- [ ] Нет когнитивной перегрузки.
- [ ] Wrong/correct пара помогает, а не пугает.
- [ ] Примеры соответствуют первому уроку.
- [ ] После intro первое задание не ощущается неожиданным.

## 23. Regression Checks Around Lesson UI

- [ ] После CTA виден header lesson 1.
- [ ] Энергия отображается корректно.
- [ ] Первое задание показывает phrase prompt.
- [ ] Word options отображаются.
- [ ] Check/next/undo controls работают.
- [ ] Theory/help button работает.
- [ ] Back из lesson UI работает.
- [ ] Если энергии нет, no-energy flow не появляется поверх intro до CTA.
- [ ] Если есть active warning modal, он не ломает intro state.
- [ ] Если user completes lesson, completion screen работает как раньше.

## 24. Edge Cases

- [ ] Intro screens array пустой: компонент уходит в lesson UI без crash.
- [ ] Один блок: CTA появляется после первого блока.
- [ ] Очень длинный title: не ломает layout.
- [ ] Очень длинный formula line: переносится.
- [ ] Отсутствует `examples`: карточка без example box выглядит нормально.
- [ ] Отсутствует `linesRU`: fallback на legacy text работает.
- [ ] Отсутствует `titleES`: тест должен поймать до релиза.
- [ ] Неизвестный `kind`: fallback style не crash.
- [ ] Неверный lessonId не должен показывать lesson 1 контент.
- [ ] Offline mode не ломает intro.
- [ ] Slow storage не показывает вечный blank.
- [ ] Rapid app reload не оставляет half-rendered intro.

## 25. Screenshot Evidence

Сохранить скриншоты перед выпуском:

- [ ] RU dark, block 1.
- [ ] RU dark, all blocks + CTA.
- [ ] RU light, all blocks + CTA.
- [ ] UK dark, block 1.
- [ ] UK dark, all blocks + CTA.
- [ ] ES dark, block 1.
- [ ] ES dark, all blocks + CTA.
- [ ] Small Android all blocks.
- [ ] iPhone notch all blocks.
- [ ] Admin preview tile for lesson 1.
- [ ] Admin preview opened lesson 1 intro.

## 26. Final Sign-Off

- [ ] Automated tests passed.
- [ ] Alignment audit passed.
- [ ] Manual first-visit passed.
- [ ] Manual repeat-visit passed.
- [ ] Manual reset passed.
- [ ] Manual admin preview passed.
- [ ] RU passed.
- [ ] UK passed.
- [ ] ES passed.
- [ ] Dark theme passed.
- [ ] Light theme passed.
- [ ] Small screen passed.
- [ ] Large screen passed.
- [ ] No crash/log errors.
- [ ] No visible text errors.
- [ ] No layout overlap.
- [ ] No blocked navigation.
- [ ] Product accepted storage behavior.
- [ ] Ready for release.

## Current Automated Run

2026-05-15 local run:
- `npm test -- --runTestsByPath tests/lesson_1_intro_screen_contract.test.ts` passed: 6 tests, 1 suite.
- `npm test -- --runTestsByPath tests/lesson_1_intro_screen_contract.test.ts tests/lesson_intro_screens_locale.test.ts` passed: 10 tests, 2 suites.
- `npm test -- --runTestsByPath tests/lesson_intro_screens_locale.test.ts` passed: 4 tests, 1 suite.
- `npm run audit:lesson-intros` passed: intro alignment OK, warnings 0.
- Added Maestro flow: `maestro/flows/modules/lessons/lesson1_intro_contract.yaml`. Manual device run still required.
