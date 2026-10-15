# Эталон ↔ код по листам приёмки (без эмулятора)

Сформировано 2026-10-15 05:16 UTC скриптом scripts/mockups/sheet_code_compare.cjs.
Для каждой строки текста из листа приёмки ищется <Text> компонента момента с тем же ключом строки; сравниваются кегль / межстрочный / вес / трекинг.
✓ — совпало по ключу, ≈ — ключ не виден (текст через переменную), но стиль с параметрами эталона в компоненте есть, ✗ — расхождение (эталон → код), ✗? — ключ не виден и стиля с параметрами эталона нет (вероятное расхождение; кнопки V2Button и числа из данных здесь не проверяются). Вес 800 — известное расхождение шрифта на Android до нативной сборки, здесь сравнивается значение в коде.

| момент | ✓ по ключу | ✗ и ✗? | ≈ по стилю |
|---|---|---|---|
| m01 | 2 | 3 | 5 |
| m02 | 1 | 1 | 2 |
| m03 | 0 | 0 | 4 |
| m05 | 6 | 1 | 6 |
| m06 | 2 | 4 | 5 |
| m07 | 3 | 2 | 5 |
| m09 | 3 | 0 | 1 |
| m11 | 1 | 0 | 5 |
| m14 | 1 | 0 | 3 |
| m15 | 1 | 0 | 3 |
| m17 | 2 | 1 | 2 |
| m21 | 0 | 0 | 4 |
| d3 | 0 | 0 | 2 |
| d7 | 1 | 0 | 4 |
| d30 | 0 | 0 | 4 |
| d100 | 0 | 0 | 5 |
| d365 | 0 | 0 | 4 |
| d730 | 0 | 0 | 5 |
| d1000 | 0 | 0 | 4 |

## m01

Файлы кода: `components/spire/moments/MomentPromotion.tsx`, `components/spire/moments/moments_layout.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ✗? | «НАД ОБЛАКАМИ» · `aboveClouds` | 11/auto · 700 · 3 | ключ не виден; стиля с параметрами эталона в файлах момента НЕТ; ближайшие: s.ov 13/17 · 700 · 1.4, s.floorTagText 13/28 · 700, s.skip 13/? · 700 |
| ✗? | «ВЕРШИНА» · `summit` | 7.5/auto · 700 · 0.5 | ключ не виден; стиля с параметрами эталона в файлах момента НЕТ |
| ✗? | «СТРАЖ» · `guard` | 7.5/auto · 700 · 0.5 | ключ не виден; стиля с параметрами эталона в файлах момента НЕТ |
| ✓ | «Этаж 1» · `floorTag` | 13/28 · 700 | совпало — MomentPromotion.tsx:259 (s.floorTagText) |
| ✓ | «+100 монет за повышение» · `promoBonus` | 16/22 · 400 | совпало — MomentPromotion.tsx:265 (s.pBonus) |
| ≈ | «Играть» · `play` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: MomentPromotion.tsx s.pts, MomentPromotion.tsx s.pBonus |
| ≈ | «Топ-5 · Базальт» · `promoShortOverline` | 13/17 · 700 · 1.4 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: MomentPromotion.tsx s.ov |
| ≈ | «Поднимаешься» · `promoShortTitle` | 34/40 · 800 · -0.6 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: MomentPromotion.tsx s.hXl |
| ≈ | «5 место · 470 монет за неделю · +100» · `noMistakes` | 16/22 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: MomentPromotion.tsx s.pBonus |
| ≈ | «Поделиться» · `share` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: MomentPromotion.tsx s.pts, MomentPromotion.tsx s.pBonus |

## m02

Файлы кода: `components/spire/moments/MomentStay.tsx`, `components/spire/moments/moments_layout.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ✗? | «Держимся.» · `staySay` | 16/21 · 700 | ключ не виден; стиля с параметрами эталона в файлах момента НЕТ; ближайшие: s.body 16/22 · ? |
| ✓ | «Остаёшься в Граните» · `stayTitle` | 23/29 · 800 · -0.3 | совпало — MomentStay.tsx:78 (s.title) |
| ≈ | «12 место · 1 180 монет за неделю. До топ-5 не хватило 240.» · `stayBody` | 16/22 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: MomentStay.tsx s.body |
| ≈ | «Играть» · `play` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: MomentStay.tsx s.body |

## m03

Файлы кода: `components/spire/moments/MomentDown.tsx`, `components/spire/moments/moments_layout.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ≈ | «Новая неделя» · `downWakeTitle` | 24/30 · 800 · -0.3 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: MomentDown.tsx s.title |
| ≈ | «Гранит · все с 1 этажа.» · `downWakeBody` | 16/22 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: MomentDown.tsx s.body |
| ≈ | «Играть» · `play` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: MomentDown.tsx s.body |
| ≈ | «Напомнить вечером» · `downLater` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: MomentDown.tsx s.body |

## m05

Файлы кода: `components/spire/moments/SpirePositionRiseMoment.tsx`, `components/spire/moments/SpireOvertakeToast.tsx`, `components/spire/moments/SpireLastChanceSheet.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ✗ | «Ступень пройдена · +10 монет» · `gapCoins` | 13/17 · 700 · 1.4 | кегль 13 → 16; строка 17 → 22; трекинг 1.4 → 0 — SpireLastChanceSheet.tsx:85 (s.p) |
| ≈ | «Ты в топ-5» · `inTop5` | 20/26 · 700 · -0.2 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpirePositionRiseMoment.tsx s.hMd |
| ≈ | «Ты» · `you` | 16/auto · 600 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpireLastChanceSheet.tsx s.p |
| ✓ | «ТОП-5» · `zoneTop5` | 13/17 · 800 · 2 | совпало — SpirePositionRiseMoment.tsx:113 (s.zoneLbl) |
| ≈ | «Играть ещё» · `playMore` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpireLastChanceSheet.tsx s.p, SpireLastChanceSheet.tsx s.plusText |
| ≈ | «К башне» · `toTower` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpireLastChanceSheet.tsx s.p, SpireLastChanceSheet.tsx s.plusText |
| ✓ | «Ира обгоняет тебя» · `overtake` | 16/20 · 700 | совпало — SpireOvertakeToast.tsx:79 (s.title) |
| ✓ | «Играть» · `play` | 13/17 · 700 | совпало — SpireOvertakeToast.tsx:83 (s.playText) |
| ✓ | «на 30 монет недели» · `overtakeSub` | 13/20 · 500 | совпало — SpireOvertakeToast.tsx:80 (s.sub) |
| ✓ | «Воскресенье · до итога» · `lastOver` | 13/17 · 700 · 1.4 | совпало — SpireLastChanceSheet.tsx:79 (s.ov) |
| ≈ | «До топ-5 — 60 монет. Энергия вернётся через 9:29.» · `lastBody` | 16/22 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpireLastChanceSheet.tsx s.p |
| ≈ | «Энергия через» · `energyIn` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpireLastChanceSheet.tsx s.p, SpireLastChanceSheet.tsx s.plusText |
| ✓ | «Играй без ожидания с Plus» · `plusLink` | 16/auto · 700 | совпало — SpireLastChanceSheet.tsx:98 (s.plusText) |

## m06

Файлы кода: `components/spire/moments/SpireStepResultMoment.tsx`, `components/spire/moments/moments_layout.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ✗? | «Чисто!» · `clean` | 16/21 · 700 | ключ не виден; стиля с параметрами эталона в файлах момента НЕТ; ближайшие: s.p 16/22 · ? |
| ✓ | «из 2:00» · `ofBudget` | 13/auto · 600 | совпало — SpireStepResultMoment.tsx:106 (s.timerSmall) |
| ✓ | «10 из 10» · `ofTasks` | 34/40 · 800 · -0.6 | совпало — SpireStepResultMoment.tsx:111 (s.hXl) |
| ≈ | «Без ошибок · +10 монет» · `gapCoins` | 16/22 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpireStepResultMoment.tsx s.p |
| ✗ | «7 из 8 на этаже» · `ofTasks` | 13/17 · 400 | кегль 13 → 34; строка 17 → 40; вес 400 → 800 — SpireStepResultMoment.tsx:111 (s.hXl) |
| ≈ | «Дальше» · `onward` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpireStepResultMoment.tsx s.p |
| ✗? | «Ещё раз?» · `againQ` | 16/21 · 700 | ключ не виден; стиля с параметрами эталона в файлах момента НЕТ; ближайшие: s.p 16/22 · ? |
| ≈ | «3 ошибки — ступень не пройдена» · `failHearts` | 24/30 · 800 · -0.3 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpireStepResultMoment.tsx s.hLg |
| ✗ | «7 из 10. Остаёшься на 4 этаже, ступени не сгорают.» · `ofTasks` | 16/22 · 400 | кегль 16 → 34; строка 22 → 40; вес 400 → 800 — SpireStepResultMoment.tsx:111 (s.hXl) |
| ≈ | «Ещё раз — другой набор» · `retrySet` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpireStepResultMoment.tsx s.p |
| ≈ | «К башне» · `toTower` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpireStepResultMoment.tsx s.p |

## m07

Файлы кода: `components/spire/moments/SpireFloorMoment.tsx`, `components/spire/moments/moments_layout.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ✗ | «ВЕРШИНА» · `summit` | 7.5/auto · 700 · 0.5 | кегль 7.5 → 13; трекинг 0.5 → 1.4 — SpireFloorMoment.tsx:155 (s.ov) |
| ✗? | «СТРАЖ» · `guard` | 7.5/auto · 700 · 0.5 | ключ не виден; стиля с параметрами эталона в файлах момента НЕТ |
| ≈ | «Этаж 4 пройден» · `floorTag` | 13/17 · 700 · 1.4 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpireFloorMoment.tsx s.ov |
| ≈ | «5 этаж — Страж» · `guard` | 24/30 · 800 · -0.3 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpireFloorMoment.tsx s.hLg |
| ≈ | «На 5 этаж» · `toFloor` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpireFloorMoment.tsx s.p |
| ≈ | «Передохнуть» · `rest` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpireFloorMoment.tsx s.p |
| ✓ | «Вершина» · `summit` | 13/17 · 700 · 1.4 | совпало — SpireFloorMoment.tsx:155 (s.ov) |
| ✓ | «15 этаж» · `floorN` | 34/40 · 800 · -0.6 | совпало — SpireFloorMoment.tsx:159 (s.hXl) |
| ✓ | «+200 монет за вершину» · `summitBonus` | 16/22 · 400 | совпало — SpireFloorMoment.tsx:160 (s.p) |
| ≈ | «Дальше» · `onward` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: SpireFloorMoment.tsx s.p |

## m09

Файлы кода: `components/lesson_moments/LessonPerfectMoment.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ✓ | «ИДЕАЛ» · `stamp` | 28/auto · 800 · 3 | совпало — LessonPerfectMoment.tsx:86 (s.stampText) |
| ✓ | «20 из 20» · `ofTasks` | 34/40 · 800 · -0.6 | совпало — LessonPerfectMoment.tsx:90 (s.hXl) |
| ✓ | «Ни одной ошибки · +150 монет» · `noMistakes` | 16/22 · 400 | совпало — LessonPerfectMoment.tsx:91 (s.p) |
| ≈ | «Дальше» · `onward` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: LessonPerfectMoment.tsx s.p |

## m11

Файлы кода: `components/streak/moments/StreakMomentRings.tsx`, `components/streak/moments/TodayRings.tsx`, `components/home/v2/HomeV2TodayCard.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ≈ | «Сегодня» · `today` | 13/17 · 700 · 1.6 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: HomeV2TodayCard.tsx s.header |
| ≈ | «Пройти урок» · `ringLesson` | 16/20 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: HomeV2TodayCard.tsx s.taskTitle |
| ≈ | «Пройти ступени Пика» · `ringSpire` | 16/20 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: HomeV2TodayCard.tsx s.taskTitle |
| ≈ | «Повторить карточки» · `ringCards` | 16/20 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: HomeV2TodayCard.tsx s.taskTitle |
| ≈ | «Не менее 10 слов» · `ringCardsSub` | 13/17 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: HomeV2TodayCard.tsx s.taskSubtitle |
| ✓ | «День выполнен» · `dayDone` | 13/auto · 700 | совпало — TodayRings.tsx:126 (s.dayOkText) |

## m14

Файлы кода: `components/coin_rank_moments/CoinRankEnoughDialog.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ✓ | «Хватает на ранг 6» · `title` | 23/29 · 800 · -0.3 | совпало — CoinRankEnoughDialog.tsx:86 (s.title) |
| ≈ | «7 004 монеты — ранг 6 стоит 6 000.» · `rankPaid` | 16/22 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: CoinRankEnoughDialog.tsx s.body |
| ≈ | «Повысить за 6 000» · `upgrade` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: CoinRankEnoughDialog.tsx s.body |
| ≈ | «Позже» · `later` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: CoinRankEnoughDialog.tsx s.body |

## m15

Файлы кода: `components/lesson_exit/LessonExitSheet.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ✓ | «Выйти из урока?» · `title` | 26/31 · 800 · -0.4 | совпало — LessonExitSheet.tsx:76 (s.title) |
| ≈ | «Попытка не сохранится, повторный вход — −1 энергия.» · `energy` | 16/22 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: LessonExitSheet.tsx s.body |
| ≈ | «Продолжить» · `keep` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: LessonExitSheet.tsx s.body |
| ≈ | «Выйти» · `leave` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: LessonExitSheet.tsx s.body |

## m17

Файлы кода: `components/dialog_moments/FirstDialogMoment.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ✗? | «Получилось!» · `say` | 16/21 · 700 | ключ не виден; стиля с параметрами эталона в файлах момента НЕТ; ближайшие: s.p 16/22 · ? |
| ✓ | «Первый диалог» · `overline` | 13/17 · 700 · 1.4 | совпало — FirstDialogMoment.tsx:69 (s.ov) |
| ✓ | «Первый разговор по-английски — есть!» · `title` | 34/40 · 800 · -0.6 | совпало — FirstDialogMoment.tsx:70 (s.hXl) |
| ≈ | «6 реплик · 5 заданий из 5» · `ofTasks` | 16/22 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: FirstDialogMoment.tsx s.p |
| ≈ | «Следующий сценарий» · `next` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: FirstDialogMoment.tsx s.p |

## m21

Файлы кода: `components/moments/WelcomeBackMoment.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ≈ | «С возвращением» · `TITLE` | 34/40 · 800 · -0.6 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: WelcomeBackMoment.tsx s.title |
| ≈ | «9 дней — ничего не сгорело: 412 фраз, ранг 5, энергия полная.» · `NOTHING_LOST` | 16/22 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: WelcomeBackMoment.tsx s.body16 |
| ≈ | «5 карточек — 1 минута» · `MINUTE` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: WelcomeBackMoment.tsx s.body16 |
| ≈ | «На Главную» · `HOME` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: WelcomeBackMoment.tsx s.body16 |

## d3

Файлы кода: `components/streak/moments/StreakMilestoneScreen.tsx`, `components/streak/moments/StreakMilestoneToast.tsx`, `components/streak/moments/StreakMilestoneMoment.tsx`, `components/streak/moments/StreakMilestoneRibbon.tsx`, `components/streak/moments/StreakMomentFlame.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ≈ | «3 дня подряд» · `DAYS_IN_A_ROW` | 16/20 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.achText, StreakMilestoneToast.tsx s.title |
| ≈ | «До недели — 4 дня» · `toWeek` | 13/20 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneToast.tsx s.sub |

## d7

Файлы кода: `components/streak/moments/StreakMilestoneScreen.tsx`, `components/streak/moments/StreakMilestoneToast.tsx`, `components/streak/moments/StreakMilestoneMoment.tsx`, `components/streak/moments/StreakMilestoneRibbon.tsx`, `components/streak/moments/StreakMomentFlame.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ≈ | «Серия · 7 дней» · `overline` | 13/17 · 700 · 1.4 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.ov, StreakMilestoneScreen.tsx s.ovMuted |
| ≈ | «Первая неделя» · `TITLES[7]` | 34/40 · 800 · -0.6 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.xl |
| ≈ | «Новая стадия огня — до 30 дней» · `stageNew` | 16/22 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.p |
| ✓ | «Ачивка «7 дней»» · `achievementRow` | 16/auto · 700 | совпало — StreakMilestoneScreen.tsx:162 (s.achText) |
| ≈ | «Дальше» · `next` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.p |

## d30

Файлы кода: `components/streak/moments/StreakMilestoneScreen.tsx`, `components/streak/moments/StreakMilestoneToast.tsx`, `components/streak/moments/StreakMilestoneMoment.tsx`, `components/streak/moments/StreakMilestoneRibbon.tsx`, `components/streak/moments/StreakMomentFlame.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ≈ | «Серия · 30 дней» · `overline` | 13/17 · 700 · 1.4 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.ov, StreakMilestoneScreen.tsx s.ovMuted |
| ≈ | «Месяц подряд» · `TITLES[30]` | 34/40 · 800 · -0.6 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.xl |
| ≈ | «Новая стадия огня — до 100 дней» · `stageNew` | 16/22 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.p |
| ≈ | «Дальше» · `next` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.p |

## d100

Файлы кода: `components/streak/moments/StreakMilestoneScreen.tsx`, `components/streak/moments/StreakMilestoneToast.tsx`, `components/streak/moments/StreakMilestoneMoment.tsx`, `components/streak/moments/StreakMilestoneRibbon.tsx`, `components/streak/moments/StreakMomentFlame.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ≈ | «Серия · 100 дней» · `overline` | 13/17 · 700 · 1.4 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.ov, StreakMilestoneScreen.tsx s.ovMuted |
| ≈ | «Сто дней» · `TITLES[100]` | 34/40 · 800 · -0.6 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.xl |
| ≈ | «Новая стадия огня — до года» · `stageNewYear` | 16/22 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.p |
| ≈ | «Дальше» · `next` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.p |
| ≈ | «Поделиться» · `share` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.p |

## d365

Файлы кода: `components/streak/moments/StreakMilestoneScreen.tsx`, `components/streak/moments/StreakMilestoneToast.tsx`, `components/streak/moments/StreakMilestoneMoment.tsx`, `components/streak/moments/StreakMilestoneRibbon.tsx`, `components/streak/moments/StreakMomentFlame.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ≈ | «Год подряд» · `TITLES[365]` | 34/40 · 800 · -0.6 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.xl |
| ≈ | «До двух лет — 365 дней» · `toTwoYears` | 16/22 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.p |
| ≈ | «Дальше» · `next` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.p |
| ≈ | «Поделиться» · `share` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.p |

## d730

Файлы кода: `components/streak/moments/StreakMilestoneScreen.tsx`, `components/streak/moments/StreakMilestoneToast.tsx`, `components/streak/moments/StreakMilestoneMoment.tsx`, `components/streak/moments/StreakMilestoneRibbon.tsx`, `components/streak/moments/StreakMomentFlame.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ≈ | «Серия · 730 дней» · `overline` | 13/17 · 700 · 1.4 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.ov, StreakMilestoneScreen.tsx s.ovMuted |
| ≈ | «Два года» · `TITLES[730]` | 34/40 · 800 · -0.6 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.xl |
| ≈ | «До Легенды — 270 дней» · `untilLegend` | 16/22 · 400 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.p |
| ≈ | «Дальше» · `next` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.p |
| ≈ | «Поделиться» · `share` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.p |

## d1000

Файлы кода: `components/streak/moments/StreakMilestoneScreen.tsx`, `components/streak/moments/StreakMilestoneToast.tsx`, `components/streak/moments/StreakMilestoneMoment.tsx`, `components/streak/moments/StreakMilestoneRibbon.tsx`, `components/streak/moments/StreakMomentFlame.tsx`

| | текст · ключ | эталон | код |
|---|---|---|---|
| ≈ | «Финальная стадия огня» · `finalStage` | 13/17 · 700 · 1.4 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.ov, StreakMilestoneScreen.tsx s.ovMuted |
| ≈ | «Легенда» · `TITLES[1000]` | 34/40 · 800 · -0.6 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.xl |
| ≈ | «Дальше» · `next` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.p |
| ≈ | «Поделиться» · `share` | 16/22 · 700 | ключ не виден (текст через переменную); стиль с теми же параметрами есть: StreakMilestoneScreen.tsx s.p |
