# PhraseMan 2.0 — эталон моментов v3 для переноса в код (ТЗ)

Источник: `docs/design/v2-app/engagement-moments-v3-all.html` (одобрен владельцем 14.10 с правками) и `docs/design/v2-app/stories-avatar.html` (D192).
Звуки — события V2 (`assets/sounds/v2`, карта `docs/work/tasks/sound-v2-catalog.md`, движок `modules/sound_v2`). Иконки — Ionicons; у каждой указано, где это имя уже есть в коде (новых иконок нет).
Правила, которые проверены playwright во всех моментах и 3 темах: текст поверх текста 0, обрезанный текст 0, за рамкой 0, частицы поверх текста 0, башен обрезано 0, звуков 208 / не загрузилось 0, JS 0.

## engagement-moments-v3-all.html

### m01 · Повышение лиги — три акта

Поверх Главной — при первом открытии приложения после закрытия недели (D191). Акт 1: таблица комнаты в монетах недели, линия ТОП-5 опускается и замирает под «Ты» (повышаются 5 из 30). Акт 2: монета-персонаж cheer. Акт 3: башня Базальта целиком (SpireTowerRender), загорается 1 этаж — на нём монета-аватар и «Этаж 1» (новая неделя — все с 1 этажа), фейерверк, «+100 за повышение» и «Играть» (монеты начисляет ночной крон, «Забрать» нет).

- вариант A «Три акта за 10 с» ~10 с — звуки: tap, sheet_open, correct, league_up
- вариант B «Короткая: для повторных повышений» ~3 с — звуки: correct, league_up

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 5 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tile | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tile | trending-up-outline | app/account_details.tsx, app/community_packs/CommunityPackSocialBar.tsx |
| tile | copy-outline | app/flashcards/CardsHubV2.tsx, app/flashcards/TrainingSetupV2.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Играть | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### m02 · Удержался в лиге

GlassAlertDialog поверх Главной (итог недели — при первом открытии после закрытия недели, D191): монета кивает «Держимся», место и дистанция до топ-5 — в монетах недели. Понижают 5 последних по монетам недели (D190).

- вариант A «Кивок + «до топ-5 — 240 монет»» ~1,5 с — звуки: league_stay, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 5 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tile | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tile | trending-up-outline | app/account_details.tsx, app/community_packs/CommunityPackSocialBar.tsx |
| tile | copy-outline | app/flashcards/CardsHubV2.tsx, app/flashcards/TrainingSetupV2.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |

### m03 · Понижение лиги — мягко

Понижают 5 последних по монетам недели (D190); окно — при первом открытии после закрытия недели, поверх Главной (D191). Отдельный экран темы (туман — непрозрачный фон, текст ничего не перекрывает), монета спит; тап — просыпается с «!».

- вариант A «Туман → тап → новая неделя» ~3 с — звуки: league_down, new_week

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 5 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tile | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tile | trending-up-outline | app/account_details.tsx, app/community_packs/CommunityPackSocialBar.tsx |
| tile | copy-outline | app/flashcards/CardsHubV2.tsx, app/flashcards/TrainingSetupV2.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Играть | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### m04 · «Итог недели» — карточка и сторис

A = SpireWeekResultCard из кода (D182): без крестика, показ один раз при первом входе в новую неделю, слева мини-башня НОВОЙ лиги (SpireTowerRender weekTop) с монетой в углу. B — сторис из трёх слайдов по 2,4 с без выдуманной статистики.

- вариант A «Карточка над башней (как в коде)» 1 с — звуки: new_week
- вариант B «Сторис 3 × 2,4 с» ~7,5 с — звуки: story, new_week

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 2 | flash | app/achievements_screen.tsx, app/lesson_irregular_verbs.tsx |
| Играть | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### m05 · Позиция выросла / обогнали / последний шанс

Места — в монетах недели (локально, кэш комнаты). A: строка «Ты» едет вверх через линию ТОП-5. B: тост «Ира обошла тебя — на 30 монет». C: воскресный «последний шанс» с настоящим доком без энергии (SpireClimbDock: «Энергия через m:ss» + «Играй без ожидания с Plus»), энергия +1 за 10 мин.

- вариант A «+1 через линию ТОП-5» ~3 с — звуки: tap, step, floor
- вариант B «Тост «Ира обошла тебя»» ~1,5 с — звуки: tap
- вариант C «Последний шанс: отсчёт + док без энергии» живой — звуки: sheet_open

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 2 | flash | app/achievements_screen.tsx, app/lesson_irregular_verbs.tsx |
| Играть | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |
| Играть ещё | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |
| 0 | flash-outline | app/feature_intro_assets.ts, app/flashcards/FlashcardsTrainingModeSheet.tsx |
| Энергия через 9:40 | flash | app/achievements_screen.tsx, app/lesson_irregular_verbs.tsx |
| Играй без ожидания с Plus | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| Энергия через 9:35 | flash | app/achievements_screen.tsx, app/lesson_irregular_verbs.tsx |

### m06 · Ступень пройдена / не пройдена

Поверх экрана ступени. Пройдена: таймер докручивается с бегущими цифрами, монета cheer «Чисто!», лесенка этажа. Провал = 3 ошибки / таймер / выход: без стыда, «Ещё раз» даёт другой набор (как в коде).

- вариант A ««Чисто!» — 10 из 10» ~3 с — звуки: tap, step, correct
- вариант B «3 ошибки — «Ещё раз»» ~2 с — звуки: wrong, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| ib | chevron-back | app/(tabs)/lessons.tsx, app/account_details.tsx |
|  | heart | app/community_packs/CommunityPackSocialBar.tsx, app/learning-v2/session/[id].tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |
| io | heart | app/community_packs/CommunityPackSocialBar.tsx, app/learning-v2/session/[id].tsx |
| Ещё раз — другой набор | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### m07 · Этаж пройден / Вершина

Этаж 4 = 40 монет (правило 10×N), башня SpireTowerRender перерисовывается на 5-й этаж; вершина — +200, три залпа, без карточки шеринга (D76 — только итоги лиги).

- вариант A «Этаж: +40, окна 5-го» ~2,5 с — звуки: tap, floor, correct
- вариант B «Вершина: 3 залпа, +200» ~3 с — звуки: correct, summit, floor

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 2 | flash | app/achievements_screen.tsx, app/lesson_irregular_verbs.tsx |
| Играть | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |
| На 5 этаж | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### m08 · «Молния» — серия правильных ответов

Поверх настоящей шапки урока: прогресс-бар «греется» на 3 → 5 → 10 (пороги combo_engine), на 10 — молния и вспышка ответа; ошибка обнуляет серию (как в коде), без множителей монет. Эффект комбо снят 03.08 — показываем как предложение.

- вариант A «3 → 5 → 10 → ошибка (сброс)» ~6,5 с — звуки: tap, correct, lightning, wrong, swipe_learn

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| ib | close | app/(tabs)/home.tsx, app/(tabs)/lessons.tsx |
| 3 | heart | app/community_packs/CommunityPackSocialBar.tsx, app/learning-v2/session/[id].tsx |
| 4 | flash | app/achievements_screen.tsx, app/lesson_irregular_verbs.tsx |

### m09 · Идеальный урок — «чекан»

На экране итога урока (не поверх вопроса): монета wow → штамп ИДЕАЛ (плашка темы, без рамки) → стоп-кадр и дрожь → конфетти цветов темы. Монеты — обычные за урок (≈150), без ×1,5.

- вариант A «Штамп → стоп-кадр → дрожь» ~3 с — звуки: sheet_open, lesson_perfect, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
|  | star | app/(tabs)/lessons.tsx, app/achievements_screen.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### m10 · Итог урока — цепная реакция

V2DoneScreen по правилам: 85 % = 3 звезды (LESSON_THREE_STARS_PERCENT), монеты ≈150 летят в баланс, серия дней засчитывается (флаг-огонь из outline в залитый, как в шапке Главной), задача «Сегодня» «Пройти урок 0/1 → 1/1» закрывается. Семь ударов по 620 мс.

- вариант A «Семь ударов» ~5 с — звуки: tap, correct, coins_many, streak_small, lesson_done

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
|  | star | app/(tabs)/lessons.tsx, app/achievements_screen.tsx |
| Серия — 6 днейсегодня засчит | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| Пройти урок1/1 | checkmark | app/(tabs)/lessons.tsx, app/combined_lesson_pick.tsx |
| tile | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| Следующий урок | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### m11 · Кольца = задачи «Сегодня» — закрытие

Блок «Сегодня» Главной 1:1 (HomeV2TodayCard) с тремя кольцами — три настоящие задачи дня (урок 1, ступени Пика 3, карточки 10), монета ранга в центре, цвет кольца = цвет отметки строки (токены темы). A: закрывается «Пройти урок» — докрутка с перехлёстом, вспышка, искры, отметка. B: все три — «День выполнен» (без бонусов, D09).

- вариант A «Закрылось кольцо «Пройти урок»» ~2 с — звуки: tap, ring
- вариант B «Все три — «День выполнен»» ~3,5 с — звуки: tap, ring, day_done

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 5 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| День выполнен | checkmark | app/(tabs)/lessons.tsx, app/combined_lesson_pick.tsx |
| Пройти урок1/1 | checkmark | app/(tabs)/lessons.tsx, app/combined_lesson_pick.tsx |
| tile | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| Пройти ступени Пика1/3 | checkmark | app/(tabs)/lessons.tsx, app/combined_lesson_pick.tsx |
| tile | trending-up-outline | app/account_details.tsx, app/community_packs/CommunityPackSocialBar.tsx |
| Повторить карточкиНе менее | checkmark | app/(tabs)/lessons.tsx, app/combined_lesson_pick.tsx |
| tile | copy-outline | app/flashcards/CardsHubV2.tsx, app/flashcards/TrainingSetupV2.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Пройти ступени Пика3/3 | checkmark | app/(tabs)/lessons.tsx, app/combined_lesson_pick.tsx |

### m14 · Повышение ранга монеты — за монеты

Ранг покупается только за монеты (N×1000: ранг 6 = 6 000). A: после итога урока — GlassAlertDialog «Хватает на ранг 6», тап ведёт в существующую церемонию чеканки. B: полка 20 рангов с ценой и полоской в монетах.

- вариант A ««Хватает на ранг 6» — окно» ~1,5 с — звуки: sheet_open, coin_rank
- вариант B «Полка 20 рангов + цена» ~1,5 с — звуки: tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
|  | star | app/(tabs)/lessons.tsx, app/achievements_screen.tsx |
| fl | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### m15 · Выход из урока

KitSheetModal по D67: попытка не сохраняется, повторный вход — минус энергия. Монета просит остаться. Главное действие — «Продолжить», вторичное — «Выйти».

- вариант A «Монета кивает — остаться» ~1,5 с — звуки: sheet_open, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| ib | close | app/(tabs)/home.tsx, app/(tabs)/lessons.tsx |
| 3 | heart | app/community_packs/CommunityPackSocialBar.tsx, app/learning-v2/session/[id].tsx |
| 4 | flash | app/achievements_screen.tsx, app/lesson_irregular_verbs.tsx |

### m16 · Диалог — поток «звонок → брифинг → переписка»

Поток: звонок → брифинг → диалог. Задания — все из сценария в коде (app/ai_dialog_scenarios.ts), брифинг ничем не перекрыт, кнопка «Начать». В переписке наверху полоска заданий (тап — развернуть), выполненное отмечается галочкой. «Входящий звонок» одобрен владельцем 14.10 — в код после R1.

- вариант A1 «Закажи кофе · A1 · 5 заданий» ~11 с — звуки: tap, sheet_open, correct
- вариант A2 «В аптеке · A2 · 4 задания» ~11 с — звуки: tap, sheet_open, correct

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 4 | flash | app/achievements_screen.tsx, app/lesson_irregular_verbs.tsx |
| tile | chatbubbles-outline | app/feature_intro_assets.ts, app/flashcards/marketplace.ts |
| Свободный разговорPLUSПракт | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tile | flash | app/achievements_screen.tsx, app/lesson_irregular_verbs.tsx |
| tile | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tile | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tile | copy-outline | app/flashcards/CardsHubV2.tsx, app/flashcards/TrainingSetupV2.tsx |
| tb | home-outline | app/(tabs)/_layout.tsx, components/tabbar/TabBarHybridPreview.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people | app/(tabs)/_layout.tsx, app/global_broadcast_modal.ts |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Входящий · диалог A1 Mia зво | chatbubbles-outline | app/feature_intro_assets.ts, app/flashcards/marketplace.ts |
| b | close | app/(tabs)/home.tsx, app/(tabs)/lessons.tsx |
| b | mic | app/ai_dialog_session.tsx, app/flashcards/SpeakHoldButton.tsx |
| Mia · баристаУютная кофейняA | chatbubbles-outline | app/feature_intro_assets.ts, app/flashcards/marketplace.ts |
| Начать | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |
| Задания0/5 | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| mic | mic | app/ai_dialog_session.tsx, app/flashcards/SpeakHoldButton.tsx |
| Входящий · диалог A2 Mr. Pat | chatbubbles-outline | app/feature_intro_assets.ts, app/flashcards/marketplace.ts |
| Mr. Patel · фармацевтАптека, | chatbubbles-outline | app/feature_intro_assets.ts, app/flashcards/marketplace.ts |
| Задания0/4 | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |

### m17 · Первый диалог пройден

На экране завершения диалога (dialogue_v2_completion): монета cheer «Получилось!» (нейтрально по роду), конфетти цветов темы, одно действие. Без шеринга фразы пользователя (конфиденциальность), без разблокировок и бонусов (D124/D09).

- вариант A ««Первый разговор — есть!»» ~3 с — звуки: achievement, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| Заказать капучиноВыбрать ра | checkmark | app/(tabs)/lessons.tsx, app/combined_lesson_pick.tsx |
| Следующий сценарий | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### m18 · Итог диалога

dialogue_v2_completion: микро-саспенс «Эмма думает…» 0,8 с → «Эмма довольна», цели закрываются каскадом, монеты без множителей.

- вариант A ««думает…» → довольна → каскад» ~4 с — звуки: tap, correct, coins_many

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| Заказать капучиноВыбрать ра | checkmark | app/(tabs)/lessons.tsx, app/combined_lesson_pick.tsx |
| Следующий сценарий | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |
| who | chatbubbles-outline | app/feature_intro_assets.ts, app/flashcards/marketplace.ts |

### m19 · Рубежи серии дней — 7 / 30 / 100

Чистая церемония без подарков (D09) и заморозок (D101): огонь по лаборатории (StreakFlameFill + burst LiveStreakFlame) меняет стадию морфом, ачивка из существующего каталога (streak_7.webp), шкала стадий. На 100 — «Поделиться» (карточка серии). Цветные стадии (акцент → второй цвет темы → белый) — предложение.

- вариант A «7 дней — морф + ачивка» ~3,5 с — звуки: streak_small, tap
- вариант B «30 дней — календарь» ~4 с — звуки: streak_big, tap
- вариант C «100 дней» ~4 с — звуки: streak_big

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 7 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tile | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tile | trending-up-outline | app/account_details.tsx, app/community_packs/CommunityPackSocialBar.tsx |
| tile | copy-outline | app/flashcards/CardsHubV2.tsx, app/flashcards/TrainingSetupV2.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |
| 30 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| 100 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |

### m20 · «Серия под угрозой» — тост 21:00

= StreakRiskToastHost + пуш 21:00 (бери как есть): тост на Главной с огнём outline, самое короткое действие. Заморозки и восстановления нет (D101).

- вариант A «Тост + «Заниматься»» ~1 с — звуки: streak_risk

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 12 днейСерия | flame-outline | app/(tabs)/home.tsx, app/community_packs/communityCatalogFilter.ts |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tile | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tile | trending-up-outline | app/account_details.tsx, app/community_packs/CommunityPackSocialBar.tsx |
| tile | copy-outline | app/flashcards/CardsHubV2.tsx, app/flashcards/TrainingSetupV2.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| tile | flame-outline | app/(tabs)/home.tsx, app/community_packs/communityCatalogFilter.ts |

### m21 · Возвращение после перерыва — ОДОБРЕН владельцем 14.10, заменяет winback-пейвол (D193)

Монета спит → просыпается «!» → cheer «С возвращением» (нейтрально по роду). Цифры — пример. Ничего не сгорело, один лёгкий шаг. Без ленты друзей (серверный запрос) и без бонусов (D09).

- вариант A «Спит → «!» → cheer» ~3 с — звуки: tap, new_week

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 0 днейСерия | flame-outline | app/(tabs)/home.tsx, app/community_packs/communityCatalogFilter.ts |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tile | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tile | trending-up-outline | app/account_details.tsx, app/community_packs/CommunityPackSocialBar.tsx |
| tile | copy-outline | app/flashcards/CardsHubV2.tsx, app/flashcards/TrainingSetupV2.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| 5 карточек — 1 минута | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### m22 · Энергия закончилась → Plus

Единый пейвол D115 как шторка над экраном Пика с настоящим доком без энергии (SpireClimbDock). Контекст «Энергия закончилась» — заголовок; выгода одна; пробный «как даёт магазин», цена ≈ €4,99/мес; вторичное — «Подожду 10 минут» (энергия +1 за 10 мин).

- вариант A «Шторка пейвола (контекст «Энергия»)» ~1 с — звуки: energy_out

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 0 | flash-outline | app/feature_intro_assets.ts, app/flashcards/FlashcardsTrainingModeSheet.tsx |
| Энергия через 9:40 | flash | app/achievements_screen.tsx, app/lesson_irregular_verbs.tsx |
| Играй без ожидания с Plus | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tile | flash | app/achievements_screen.tsx, app/lesson_irregular_verbs.tsx |
| Энергия не кончается | checkmark | app/(tabs)/lessons.tsx, app/combined_lesson_pick.tsx |

### m23 · Пробный период Plus

Срок пробного — из магазина (D117): без «7 дней» и «день 5 из 7». A: «Plus включён» — одна выгода и одно действие. B: рекап локальных счётчиков с момента старта, «Оставить Plus ≈ €4,99/мес», вторичное — «Напомнить за день» (читаемое, не сливается).

- вариант A ««Plus включён» — первое действие» ~2,5 с — звуки: plus, tap
- вариант B «Рекап «Что дал Plus»» ~1 с — звуки: sheet_open

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 5 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tile | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tile | trending-up-outline | app/account_details.tsx, app/community_packs/CommunityPackSocialBar.tsx |
| tile | copy-outline | app/flashcards/CardsHubV2.tsx, app/flashcards/TrainingSetupV2.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| tile | chatbubbles-outline | app/feature_intro_assets.ts, app/flashcards/marketplace.ts |
| Свободный разговорбез сцена | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| Поговорить без сценария | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |
| Занятий без ожидания23 Своб | flash | app/achievements_screen.tsx, app/lesson_irregular_verbs.tsx |
|  Занятий без ожидания23 Сво | chatbubbles-outline | app/feature_intro_assets.ts, app/flashcards/marketplace.ts |
|  Занятий без ожидания23 Св | trending-up-outline | app/account_details.tsx, app/community_packs/CommunityPackSocialBar.tsx |

### d1 · День 1 — малый

Первый день — коротко и тепло; тост, без экрана.

- вариант A «Рубеж 1 · малый» ≤1,5 с — звуки: tap, streak_small

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 1 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |

### d3 · День 3 — малый

Огонь заметно разгорается (заливка StreakFlameFill 3/10), ачивка streak_3 открывается в каталоге.

- вариант A «Рубеж 3 · малый» ≤1,5 с — звуки: tap, streak_small

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 3 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |

### d7 · День 7 — большой

Первый рубеж, на котором решается удержание: новая стадия огня и ачивка. Без подарков.

- вариант A «Рубеж 7 · большой» ≈5 с — звуки: streak_big, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 7 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### d14 · День 14 — малый

Малый+: тост с burst, чуть дольше (1,5 с).

- вариант A «Рубеж 14 · малый» ≤1,5 с — звуки: tap, streak_small

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 14 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |

### d30 · День 30 — большой

Месяц — календарь 30 клеток зажигается по одной.

- вариант A «Рубеж 30 · большой» ≈5 с — звуки: streak_big, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 30 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### d50 · День 50 — средний

Средний: экран на 3 с, одно действие.

- вариант A «Рубеж 50 · средний» ≈3 с — звуки: streak_mid, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 50 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### d100 · День 100 — большой

Сто — редкий рубеж: морф в белый, конфетти, «Поделиться» (карточка серии).

- вариант A «Рубеж 100 · большой» ≈5 с — звуки: streak_big, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 100 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### d150 · День 150 — малый

Малый+ между большими.

- вариант A «Рубеж 150 · малый» ≤1,5 с — звуки: tap, streak_small

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 150 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |

### d200 · День 200 — средний

Средний.

- вариант A «Рубеж 200 · средний» ≈3 с — звуки: streak_mid, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 200 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### d250 · День 250 — малый

Малый+.

- вариант A «Рубеж 250 · малый» ≤1,5 с — звуки: tap, streak_small

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 250 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |

### d300 · День 300 — средний

Средний с прицелом на год.

- вариант A «Рубеж 300 · средний» ≈3 с — звуки: streak_mid, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 300 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### d365 · День 365 — огромный · Год

Год — три акта с тапом «быстрее»: календарь → новая стадия → карточка.

- вариант A «Рубеж 365 · огромный · Год» ≈8–9 с — звуки: tap, streak_year

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 365 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### d400 · День 400 — средний

Средний.

- вариант A «Рубеж 400 · средний» ≈3 с — звуки: streak_mid, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 400 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### d500 · День 500 — большой · своя сцена

Большой: полтысячи, «Поделиться».

- вариант A «Рубеж 500 · большой · своя сцена» ≈8–9 с — звуки: streak_big, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 500 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### d730 · День 730 — огромный · Два года

Юбилей в годах значит больше круглой сотни — своя сцена: два кольца по 12 месяцев.

- вариант A «Рубеж 730 · огромный · Два года» ≈8–9 с — звуки: streak_year, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 730 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### d600 · День 600 — средний

Средний.

- вариант A «Рубеж 600 · средний» ≈3 с — звуки: streak_mid, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 600 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### d800 · День 800 — средний

Средний.

- вариант A «Рубеж 800 · средний» ≈3 с — звуки: streak_mid, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 800 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### d900 · День 900 — средний

Средний.

- вариант A «Рубеж 900 · средний» ≈3 с — звуки: streak_mid, tap

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 900 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### d1000 · День 1000 — легенда

Легенда — самая длинная драма: морф в золото, персонаж, три залпа; без рамок и подарков.

- вариант A «Рубеж 1000 · легенда» ≈8–9 с — звуки: streak_legend, correct

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 1000 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Дальше | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

## stories-avatar.html

### s1 · Главная: красное кольцо вокруг аватара

КОГДА: есть хотя бы одно непросмотренное событие (итог недели лиги — вверх / удержался / вниз, рубеж серии, повышение ранга монеты, ачивка). Кольцо — вокруг аватара-монеты в шапке Главной (HomeV2Header): 3 px + зазор 2 px, тёплый градиент красный → оранжевый, как у сторис в Instagram; кольцо и монета 38 — в слоте аватара 48 × 48, шапка не сдвигается; мягко «дышит». Окно итога недели (D191) остаётся: 1 раз при первом входе после закрытия недели, итог параллельно попадает в сторис. Всё просмотрено — кольца нет. Событий нет — кольца нет, тап по аватару ведёт туда же, куда сейчас. Собирается: HomeV2Header + обёртка аватара (новая, нужна в код), coin_rank_XX. Данные — useStoryEvents() Ядра: кольцо = unseenCount > 0, флаг stories_v1.

- вариант A «Есть новые события» — — звуки: —
- вариант B «Всё просмотрено — кольцо исчезло» — — звуки: —
- вариант C «Событий нет — кольца нет» — — звуки: —

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 5 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tile | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tile | trending-up-outline | app/account_details.tsx, app/community_packs/CommunityPackSocialBar.tsx |
| tile | copy-outline | app/flashcards/CardsHubV2.tsx, app/flashcards/TrainingSetupV2.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |

### s2 · Тап по аватару → все события подряд

Поток: тап по аватару → сторис раскрываются из аватара → 4 события по 2,4 с, полосы прогресса сверху → после последнего закрываются, кольцо исчезает. Тап справа — дальше, слева — назад, удержание — пауза, свайп вниз или ✕ — закрыть. Звук: событие story (V2) на каждом перелистывании, sheet_close на закрытии. Собирается: модал на весь экран (KitSheetModal fullscreen), SpireTowerSvg, LiveStreakFlame, coin_rank_XX, ассеты ачивок.

- вариант A «Живой поток (жми в телефоне)» ~12 с — звуки: story, sheet_close

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 5 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tile | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tile | trending-up-outline | app/account_details.tsx, app/community_packs/CommunityPackSocialBar.tsx |
| tile | copy-outline | app/flashcards/CardsHubV2.tsx, app/flashcards/TrainingSetupV2.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Твои событиясегодня | close | app/(tabs)/home.tsx, app/(tabs)/lessons.tsx |
| — | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

### s3 · События — по одному кадру

Только то, что реально произошло за время отсутствия: итог недели лиги (D182/D190/D191 — вверх / удержался / вниз, башня новой лиги целиком и свой этаж), рубеж серии (те же сцены рубежей), повышение ранга монеты (куплен за монеты), ачивка. Порядок — по времени события.

- вариант 1 «Итог недели» 2,4 с — звуки: story
- вариант 2 «Серия» 2,4 с — звуки: story
- вариант 3 «Ранг монеты» 2,4 с — звуки: story
- вариант 4 «Ачивка» 2,4 с — звуки: story

| элемент | иконка (Ionicons) | где в коде |
|---|---|---|
| 5 днейСерия | flame | app/(tabs)/home.tsx, app/achievements_screen.tsx |
| ib | notifications-outline | app/(tabs)/settings.tsx, components/CleanOnboarding.tsx |
| ib | chevron-forward | app/ai_dialog_session.tsx, app/coin_rank.tsx |
| tile | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tile | trending-up-outline | app/account_details.tsx, app/community_packs/CommunityPackSocialBar.tsx |
| tile | copy-outline | app/flashcards/CardsHubV2.tsx, app/flashcards/TrainingSetupV2.tsx |
| tb | home | app/(tabs)/home.tsx, app/(tabs)/_layout.tsx |
| tb | book-outline | app/(tabs)/lessons.tsx, app/(tabs)/settings.tsx |
| tb | play-circle-outline | app/(tabs)/_layout.tsx, app/feature_intro_assets.ts |
| tb | people-outline | app/(tabs)/settings.tsx, app/(tabs)/_layout.tsx |
| tb | settings-outline | app/(tabs)/_layout.tsx, app/ai_dialog_consent_gate.tsx |
| Твои событиясегодня | close | app/(tabs)/home.tsx, app/(tabs)/lessons.tsx |
| — | arrow-forward | app/coin_rank.tsx, app/dialogue_v2_completion.tsx |

## Подложечные экраны — сверка с эмулятором (склейка «эмулятор | образец»)

Склейка: Главная (`evidence/parity/HOME_dark.png`, 11.10) | Пик (`spire-001`) | Урок (`learning-v2-010`) | Диалоги (`dialogs-001`) рядом с подложками образца (`EMA.homeUnder / spireUnder / lessonUnder / dialogsUnder`).

- Главная: порядок блоков в образце = коду (`app/(tabs)/home.tsx`): HomeV2Header → ContinueCard → FeatureTiles → (VideoRail) → HomeV2TodayCard → (DailyPhraseCard).
  Расхождения с кадром 11.10: в кадре есть лента «Видео» (флаг `video_button_enabled`, удалённый) и «Фраза дня» (только en/fr, D129) — в подложке образца их нет;
  задания дня в кадре другие («Потренировать диалог», строка «Друзья в Phraseman»). Нужен свежий кадр Главной от Сверки и решение: рисовать подложки с видео и «Фразой дня», как в текущем проде, или без.
- Пик, Урок, Диалоги: состав и порядок совпадают (шапка, «Комната недели» над башней, окно башни; шапка урока с прогрессом/сердцами/энергией; «Свободный разговор» + категории). Счётчики и тексты — пример.
- Иконки: все 374 вхождения иконок в моментах — Ionicons, которые уже есть в коде (новых иконок нет), таблицы — по моментам выше.
