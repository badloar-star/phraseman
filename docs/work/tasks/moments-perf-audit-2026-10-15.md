# Окна моментов v3: аудит скорости перед сборкой 16.10 (UI-тред, reduced-motion, ленивая загрузка)

Governance-ID: TG-6A9087E17579

## Outcome
Таблица по 15 окнам моментов (потоки анимации, поведение при «уменьшить движение», ленивая загрузка) и список того, что работает на JS-треде. Мелких дыр (`useNativeDriver`, reduced-motion) не найдено; крупное — списком координатору.

## Scope
Только чтение: `components/streak/moments`, `components/spire/moments`, `components/coin_rank_moments`, `components/dialog_moments`, `components/lesson_exit`, `components/lesson_moments`, `components/moments` (55 файлов, 33 компонента). Правок кода в этой задаче нет.

## Architecture
Вся анимация — Reanimated (`useSharedValue` / `withTiming` / `entering`). React Native `Animated` в окнах моментов не используется нигде (grep по `useNativeDriver`, `Animated.timing/spring/Value` — пусто). Дискретные «биты» сценария (хор, конфетти, подсветка этажа) идут через `setTimeout` + `setState` на JS-треде, плавное движение — на UI-треде.

## Security and privacy
Данные не затрагиваются.

## Technical debt
См. раздел «Что на JS-треде» — два счётчика на `setInterval(40 мс)`.

## Verification
Чтение кода и grep по папкам; живого замера кадров на эмуляторе не было (запланирован №7).

## Rollback
Не применимо (только документ).

## 1. Что крутится на JS-треде

| Файл:строка | Что | Оценка |
|---|---|---|
| `SpireFloorMoment.tsx:84-88` | `setInterval` 40 мс → `setCounted(...)`: счётчик «+монеты» за этаж, перерисовывает весь `FloorView` ~25 раз/с на время `T.countMs` | 🟡 заметно: рядом шумит `MomentCoin`/конфетти. Лучше вынести число в маленький дочерний компонент (перерисовывается только он) или анимировать на UI-треде через `useAnimatedProps` на `TextInput` |
| `SpireStepResultMoment.tsx:79-83` | то же для времени шага (`setShownMs`), 40 мс, на время `T.ringMs` (кольцо при этом на UI-треде) | 🟡 то же |
| `SpireLastChanceSheet.tsx:55` | `setInterval` 1000 мс — часы «энергия через…» | 🟢 раз в секунду, только пока шторка видна и приложение активно |
| `MomentPromotion.tsx:171-` | `setTimeout` → `setPhase(...)` по меткам сценария (~8 меток за 14 с) | 🟢 дискретно, не в кадре |
| `MomentPromotionShort.tsx:70-71`, `SpireFloorMoment.tsx:80/90/142-146`, `SpireStepResultMoment.tsx:75-86/144-145`, `SpirePositionRiseMoment.tsx:78`, `FirstDialogMoment.tsx:54-56`, `LessonPerfectMoment.tsx:59-65`, `LessonExitSheet.tsx:55-56`, `CoinRankEnoughDialog.tsx:63`, `SpireOvertakeToast.tsx:63-64`, `StreakMilestoneToast.tsx:51-57`, `StreakMilestoneScreen.tsx:92`, `TodayRings.tsx:93-106`, `WelcomeBackMoment.tsx:76-82` | одиночные `setTimeout` с `setState` (хор, «бум», конфетти, поза монеты) | 🟢 по 2–5 штук за показ, каждая — одна перерисовка окна |
| `MomentCoin.tsx:325` | `setTimeout` удаляет частицы эмоции из состояния | 🟢 до 1,6 с + шаг, штучно |

React Native `Animated` и `useNativeDriver`: не найдено ни одного вхождения.

## 2. «Уменьшить движение» (`useReducedMotion` / `reduceMotion`)

| Окно | Учитывает | Финальный вид сразу |
|---|---|---|
| Повышение, короткое повышение, «остаёшься», понижение | ✅ | ✅ (`jumpToEnd`, `setFire(false)`) |
| Этаж / итог шага / рост позиции / «последний шанс» / тост обгона | ✅ | ✅ (`useState(reduceMotion ? final : start)`: `counted`, `litFloor`, `shownMs`, `peek`, `cheer`) |
| Идеальный урок, первый диалог, «достаточно монет», выход из урока | ✅ | ✅ |
| Рубеж серии (экран, тост, кольца, лента), TodayRings, конфетти | ✅ | ✅ (`done` = все метки, тост `enter = 1`) |
| `WelcomeBackMoment`, `MomentCoin` | ✅ | ✅ (`progress.value = last`, `SayBubble p = 1`) |
| Хосты (`SpireWeekMomentHost`, `SpireMomentsLayer`, `SpireOutcomeMomentHost`, `SpirePositionMomentsHost`, `FirstDialogHost`, `LessonPerfectHost`), `StreakGlowSpot`, `TodayRingsSlot`, `StreakMilestoneMoment` | — (не анимируют, у них нет движения) | — |

Дыр нет. Попутно: звук/хаптик при reduced-motion в `SpireFloorMoment` / `SpireStepResultMoment` играются сразу (`playUnlessRecentlyPlayed`), без сценария — это осознанно.

## 3. Ленивая загрузка

| Окно | Как грузится |
|---|---|
| Окна недели (повышение / остаёшься / понижение) | ✅ `lazy(() => import('SpireWeekMomentHost'))`, `home.tsx:147` |
| Слой окон Пика (результат шага, этаж, рост позиции, обгон, «последний шанс») | ✅ `lazy(() => import('./moments/SpireMomentsLayer'))`, `SpireHomeScreen.tsx:55` |
| WelcomeBack | ✅ `lazy`, `home.tsx:149` |
| «Достаточно монет» | ✅ `lazy`, `home.tsx:151` |
| Первый диалог | ✅ `lazy`, `dialogue_v2_completion.tsx:39` |
| Выход из урока | ✅ `lazy`, `lesson1.tsx:164` (+ `exitSheetMounted` — не монтируется до первого открытия) |
| Идеальный урок | ✅ `lazy`, `lesson_complete.tsx:14` |
| Кольца «Сегодня» | ✅ `require` по флагу внутри `HomeV2TodayCard` |
| Рубеж серии (`StreakMilestoneMoment` → экран/тост) | ⚠️ ни одного боевого вызова пока нет (только `dev_moments_preview`); Ядро при подключении обязано брать его через `lazy` / `require` по флагу, как остальные — иначе конфетти и монета попадут в стартовый бандл Главной |
| Сторис (`StorySlides` статически тянет `StreakMomentFlame`) | 🟡 за пределами списка: убедиться, что сам `StoryViewer` грузится лениво (на 15.10 — ленивые `require`) |

## 4. Красный `spire_home_week_module` — потолок 400 строк `SpireHomeScreen.tsx` (разбор 15.10)

Тест `tests/spire_home_week_module.test.ts`: `screen.split('\n').length <= 400`. Коммит 80c151340 (мой, m05) довёл файл ровно до границы (HEAD: 399 переводов строки = 400 по `split`). Любая добавленная строка роняет тест.

| Чьи строки | Что | Эффект |
|---|---|---|
| Мои (в HEAD, 80c151340) | `import useMomentsV3Enabled`, `lazy(SpireMomentsLayer)`, `momentsV3` / `momentOutcome`, одна строка `<Suspense><SpireMomentsLayer…/>` — всего 5 строк | уже учтены, превышения не дают |
| Чужие, не закоммитлены (в рабочем дереве 405 строк, +6) | импорты `spireRankArtName` + `ThemedArt` (+2), блок «значок лиги + подпись» вместо одной строки подписи (+3), стиль `subtitleRow` (+1) | 🔴 это и даёт превышение |

Мои 5 строк вынести нельзя: без них не освободить 6 строк, а `momentOutcome` нужен ниже по экрану (строка 353). Правильное место для правки — чужой хунк (Темы): вынести «значок лиги + подпись» в крошечный `components/spire/SpireWeekSubtitle.tsx` (props: `text`, `tier`), в экране остаётся один тег и один импорт, стиль `subtitleRow` уезжает в подкомпонент → экран возвращается к 399. Файл сейчас правит другая сессия — в него не лезу; передано Темам и координатору. Код — после №7.

**Итог по владельцу (координатор 15.10 ~07:30):** Темы хунк не писали. Он связан с `modules/spire/tier_badge.ts` (untracked, создан 14.10 в 12:19, комментарии по-английски — почерк Codex). Файлы Codex не трогаем; вопрос «закоммитить / вынести / откатить» вынесен владельцу. **До слова владельца `tests/spire_home_week_module.test.ts` остаётся красным по известной причине** (405 строк против потолка 400 из-за чужого хунка), мои 5 строк (m05) превышения не дают.

## Что делать (предложение)
1. 🟡 Вынести счётчики `counted` / `shownMs` в маленькие дочерние компоненты (или `useAnimatedProps`) — два файла, ~30 строк; делаю в окне 08:30, если координатор согласен (после №7, чтобы не перезагружать приложение посреди замера).
2. ⚠️ Ядру: при подключении рубежа серии — ленивая загрузка.
3. Остальное — без правок.
