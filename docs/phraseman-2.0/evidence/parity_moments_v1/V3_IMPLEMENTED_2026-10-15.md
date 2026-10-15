# Моменты v3 — что уже в приложении (15.10, ~08:15)

Вопрос владельца: «одобренные анимации уже в приложении?». Сверка сделана по коду, без эмулятора (Макеты). Источники:
- эталон `engagement-moments-v3-all.html` и `stories-avatar.html`;
- ТЗ `docs/phraseman-2.0/ETALON_MOMENTS_V3_TRANSFER.md`;
- импорты компонентов в `app/` и `components/`;
- чтение флагов.

Как читать колонки:
- «подключён» — компонент импортирован настоящим экраном, а не только `app/dev_moments_preview.tsx`.
- «флаг» — что ещё должно быть включено, чтобы окно показалось.
- «анимация» — перенесена ли раскадровка эталона в компонент. Оценка по коду: фазы, Reanimated, звуки v2. Кадры круга 2 (№7) подтвердят или опровергнут.

## Коротко

- **Окно в коде и подключено к экрану: 22 из 43** — 19 из 21 моментов m + 3 сторис s1–s3. **Анимация эталона перенесена в компонент по коду: 15**:
  - m01, m02, m03, m05, m06, m07, m09, m11, m14, m15, m17, m21;
  - s1, s2, s3.
- **Подключено, но это прежний экран без раскадровки v3 (частично): 7**:
  - m04 — карточка;
  - m08, m10, m16 (нет «звонка»), m18 (нет «думает…»), m20, m22.
- **Компонент есть, но к экрану НЕ подключён: 20** — рубежи серии m19 и d1…d1000. `StreakMilestoneMoment` импортирует только dev-превью. Из рубежей в приложение попадает только запись события в сторис (`recordStreakMilestoneStory`), а полноэкранного окна рубежа нет.
- **Окна в коде нет совсем: 1** — m23 «Пробный период Plus». В коде нет ни компонента, ни строк: «Plus включён», «Что дал Plus», «Оставить Plus».
- **Важно для «уже в приложении»:** все окна v3 скрыты за удалённым флагом `moments_v3`, по умолчанию ВЫКЛ (`components/spire/moments/moments_flag.ts`). Сторис s1–s3 — за `stories_v1`. Пока флаги не включены в remote_config, пользователь видит прежние экраны. Значение флага в проде я не читала: доступа к проду у Макетов нет.

## Таблица

| момент | компонент в коде | подключён к экрану | флаг | анимация из эталона |
|---|---|---|---|---|
| m01 Повышение лиги (A три акта, B короткая) | `components/spire/moments/MomentPromotion.tsx`, `MomentPromotionShort.tsx` | Главная: `SpireWeekMomentHost` ← `app/(tabs)/home.tsx` | moments_v3 (`spire_week_moment_gate`) | перенесена (три акта, фазы; B — короткая) |
| m02 Удержался | `MomentStay.tsx` | там же | moments_v3 | перенесена |
| m03 Понижение | `MomentDown.tsx` | там же | moments_v3 | перенесена |
| m04 «Итог недели» A карточка / B сторис | `components/spire/SpireWeekResultCard.tsx`; B — слайд `WeekSlide` в `components/stories/StorySlides.tsx` | A: экран Пика `SpireHomeScreen`; B: сторис (событие `spire_week`) | A — без флага (D182); B — stories_v1 | частично: карточка — прежняя (появление без раскадровки v3); сторис — через общий просмотрщик |
| m05 Позиция выросла / обогнали / последний шанс | `SpirePositionRiseMoment.tsx`, `SpireOvertakeToast.tsx`, `SpireLastChanceSheet.tsx` | Пик: `SpirePositionMomentsHost` ← `SpireMomentsLayer` ← `SpireHomeScreen` | moments_v3 | перенесена (у шторки «последний шанс» анимация шторки, своей нет) |
| m06 Ступень пройдена / не пройдена | `SpireStepResultMoment.tsx` | Пик: `SpireOutcomeMomentHost` ← слой моментов | moments_v3 | перенесена |
| m07 Этаж / Вершина | `SpireFloorMoment.tsx` | там же | moments_v3 | перенесена |
| m08 «Молния» — серия ответов | `components/feedback/ComboRing.tsx` + `app/feedback/combo_engine.ts` | урок `app/lesson1.tsx` | без флага | частично: прежнее кольцо комбо; прогрев полоски 3→5→10 с молнией из эталона — не подтверждён |
| m09 Идеальный урок | `components/lesson_moments/LessonPerfectMoment.tsx` (+ Host) | `app/lesson_complete.tsx` | moments_v3 | перенесена |
| m10 Итог урока — цепная реакция | `V2DoneScreen` в `app/lesson_complete.tsx` | итог урока | без флага | частично: прежний экран итога; «семь ударов» эталона по коду не найдены |
| m11 Кольца «Сегодня» | `components/streak/moments/TodayRingsSlot.tsx`, `TodayRings.tsx` | Главная: `HomeV2TodayCard` | moments_v3 (`ringsOn`) | перенесена |
| m14 Хватает на ранг монеты | `components/coin_rank_moments/CoinRankEnoughDialog.tsx` | Главная `app/(tabs)/home.tsx` | moments_v3 (`coin_rank_enough_gate`) | перенесена |
| m15 Выход из урока | `components/lesson_exit/LessonExitSheet.tsx` | `app/lesson1.tsx` | moments_v3 (без флага — прежний выход) | перенесена (шторка) |
| m16 Диалог: звонок → брифинг → переписка | брифинг и сессия — `app/dialogue_v2_briefing.tsx`, `app/dialogue_v2_session.tsx`; **экрана «звонок» нет** | Диалоги | без флага | частично: нет шага «звонок»; брифинг и переписка — прежние экраны |
| m17 Первый диалог пройден | `components/dialog_moments/FirstDialogMoment.tsx` (+ Host) | `app/dialogue_v2_completion.tsx` | moments_v3 | перенесена |
| m18 Итог диалога | `app/dialogue_v2_completion.tsx` | итог диалога | без флага | частично: микро-саспенс «Эмма думает…» → «довольна» в коде не найден |
| m19 Рубежи серии 7/30/100 | `components/streak/moments/StreakMilestoneMoment.tsx` (Screen / Toast / Ribbon) | **НЕТ** — только `app/dev_moments_preview.tsx` | (moments_v3 читает сам компонент) | компонент готов, но окно на экран не выведено |
| m20 «Серия под угрозой» 21:00 | `components/StreakRiskToastHost.tsx` | `app/_layout.tsx` | без флага | по ТЗ «бери как есть» — прежний тост (своей анимации нет) |
| m21 Возвращение после перерыва | `components/moments/WelcomeBackMoment.tsx` | Главная `app/(tabs)/home.tsx` | moments_v3 (`welcome_back_gate`) | перенесена |
| m22 Энергия закончилась → Plus | единый пейвол `premium_modal` (context `no_energy`) из `components/spire/SpireClimbDock.tsx` | Пик | без флага | частично: пейвол D115 открывается отдельным окном; «шторка над доком Пика» эталона — не подтверждена |
| m23 Пробный период Plus (A «Plus включён», B «Что дал Plus») | **НЕТ** | **НЕТ** | — | **окна нет** |
| d1, d3, d7, d14, d30, d50, d100, d150, d200, d250, d300, d365, d400, d500, d600, d730, d800, d900, d1000 | `StreakMilestoneMoment.tsx` / `StreakMilestoneScreen.tsx` / `StreakMilestoneToast.tsx` | **НЕТ** — только dev-превью; в приложении — только событие для сторис | (moments_v3) | компоненты готовы (тосты и экраны рубежей), на экран не выведены |
| s1 Красное кольцо у аватара | `components/stories/StoryRing.tsx`, `StoryAvatarSlot.tsx` | Главная `app/(tabs)/home.tsx` | stories_v1 | перенесена |
| s2 Тап по аватару → все события | `components/stories/StoryViewer.tsx` | из `StoryAvatarSlot` | stories_v1 | перенесена |
| s3 События по одному кадру | `components/stories/StorySlides.tsx` | в просмотрщике | stories_v1 | перенесена (слайды без своей анимации, переходы — во вьюере) |

## Кому что

- **m19 и d1…d1000 — подключить `StreakMilestoneMoment` к реальному экрану** (по ТЗ — поверх Главной после засчитанного дня). Компоненты уже есть. Зона: Темы (components/streak) + Ядро (где показывать).
- **m23 «Пробный период Plus»** — окна нет; срок пробного D117 — из магазина. Нужен владелец пейвола (Ядро/Авторизация) и решение, делать ли его до R1.
- **m16 «звонок», m18 «думает…», m10 «семь ударов», m08 «прогрев полоски»** — прежние экраны есть, микро-анимаций эталона нет: Дизайн / Диалоги.
- **Флаги:** `moments_v3` и `stories_v1` выключены по умолчанию. Включать ли их в remote_config — решение владельца/координатора.
