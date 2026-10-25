# Ссылки Сверки: 16 состояний «Сцены» (Главная + «Сегодня») — 25.10

Governance-ID: TG-5A1B0B92C677
Составил: 1 · ЯДРО по задаче координатора. Те же строки — в `docs/phraseman-2.0/DEV_LINKS_R1.md` (раздел «Сцена Главной и
«Сегодня»»), робот `parity_batch_shoot` их берёт («уникальна: да», шаг `wait:2500`). Сторож:
`tests/dev_links_scene_states_contract.test.mjs`.

## Как устроено

- **Вход.** `dev_state` ставит общий фон кадра (`onboarding=done&intros=seen&overlays=off&animations=off`) и уводит
  `next=` на dev-вход сцены.
- **Состояние решает НАСТОЯЩАЯ функция:** `pickHomeSceneState` / `pickTodaySceneState`. Её вход — моки фактов телефона:
  часы, серия, засчитан ли день, энергия, история дней, прогресс урока, сеть. Числа взяты из эталона (серия 5, энергия 4,
  21:40 → «До полуночи 2 ч 20 мин» и т. д.).
- **Вид** — тот же `HomeSceneView` / `TodaySceneView`, что на боевом экране. В шапке колокольчик и аватар — неподвижные
  заглушки того же вида.
- **Без записей:** ничего не читается из сети и не пишется в Firestore и хранилище. Тема и оформление — только в памяти
  процесса.
- **В стор-сборке маршрутов нет** (`ENABLE_DEV_TOOLS && !IS_STORE_RELEASE`, сторож `store_bundle_dev_routes_guard`).
- **Тема** — как у эталона по умолчанию:
  - Главная — «Океан» (marine), тёмное;
  - «Сегодня» — «Сумерки» (ink), светлое.

  Другая тема: в ссылке Главной поменять `theme=` на id темы. Для «Сегодня» — `theme=<id>` у `dev_state` и
  `theme=dark|light` в `next`.
- **Проверка в журнале:** `[DEV-STATE] home_scene_preview` (requested / decided / reason) и `[DEV-STATE]
  today_scene_preview` (decision / reason). Если функция решила иначе, чем просили, это видно сразу.

## Главная — home-scene-states.html

| Строка | Эталон | Ссылка |
|---|---|---|
| home-scene-001 | #1 Новичок: «Начать» | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&next=/dev_home_scene_preview?state=newbie%26theme=marine%26appearance=dark` |
| home-scene-002 | #2 Продолжить эпизод, днём | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&next=/dev_home_scene_preview?state=continue%26theme=marine%26appearance=dark` |
| home-scene-003 | #3 Серия под угрозой, вечер | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&next=/dev_home_scene_preview?state=streak_risk%26theme=marine%26appearance=dark` |
| home-scene-004 | #4 День выполнен, серия засчитана | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&next=/dev_home_scene_preview?state=day_done%26theme=marine%26appearance=dark` |
| home-scene-005 | #5 0 энергии | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&next=/dev_home_scene_preview?state=no_energy%26theme=marine%26appearance=dark` |
| home-scene-006 | #6 Нет сети | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&next=/dev_home_scene_preview?state=offline%26theme=marine%26appearance=dark` |
| home-scene-007 | #7 Экзамен главы ждёт | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&next=/dev_home_scene_preview?state=exam_ready%26theme=marine%26appearance=dark` |
| home-scene-008 | #8 Серия прервалась, начни новую | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&next=/dev_home_scene_preview?state=streak_lost%26theme=marine%26appearance=dark` |
| home-scene-009 | #9 С возвращением после 3+ дней | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&next=/dev_home_scene_preview?state=welcome_back%26theme=marine%26appearance=dark` |
| home-scene-010 | #10 Всё выпущенное пройдено | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&next=/dev_home_scene_preview?state=all_done%26theme=marine%26appearance=dark` |
| home-scene-011 | #11 Plus · продолжить днём | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&next=/dev_home_scene_preview?state=continue%26theme=marine%26appearance=dark%26plus=1` |

## «Сегодня» — today-scene-concepts.html (вариант A)

| Строка | Эталон | Ссылка |
|---|---|---|
| today-scene-001 | #1 Утро: 0 из 3 | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&theme=ink&next=/dev_today_scene_preview?state=morning%26theme=light` |
| today-scene-002 | #2 День: 1 из 3 | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&theme=ink&next=/dev_today_scene_preview?state=day%26theme=light` |
| today-scene-003 | #3 Вечер: серия под угрозой | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&theme=ink&next=/dev_today_scene_preview?state=eve%26theme=light` |
| today-scene-004 | #4 Все задания выполнены | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&theme=ink&next=/dev_today_scene_preview?state=done%26theme=light` |
| today-scene-005 | #5 Видео вместо диалога: 4 из 10 минут | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&animations=off&theme=ink&next=/dev_today_scene_preview?state=video%26theme=light` |

«Вечер» и «серия под угрозой» у «Сегодня» — одно состояние (today-scene-003), отдельной строки нет: в реестре их пять.

## Честно: что из этого получается на БОЕВОЙ Главной тестового аккаунта

Подмены фактов на боевой Главной нет. Состояния зависят от часов телефона и истории дней, которые нельзя выставить, не
трогая данные.

| Состояние | На боевой Главной | Как |
|---|---|---|
| Новичок | да | гость после `pm clear` + онбординг, ни одного эпизода |
| Продолжить | да | любой эпизод пройден, до 20:00 |
| 0 энергии | да | `energy=0` у `dev_state` (без Plus) |
| Нет сети | да | выключить сеть эмулятора (`adb shell svc wifi disable` и `svc data disable`) |
| Plus | да | `plus=on` |
| Серия под угрозой | только вечером | часы телефона ≥ 20:00, серия ≥ 1, сегодня занятий нет |
| День выполнен | да, но с прохождением | пройти эпизод сегодня — пишет прогресс аккаунта |
| Экзамен ждёт, всё пройдено | нет без записи прогресса | нужно пройти главу / все выпущенные эпизоды |
| Серия прервалась, с возвращением | нет | нужна история дней (позавчера / 3+ дня без заходов). `welcomeback=` подменяет только окно «С возвращением», не разрыв заходов Главной |

Если координатор решит, что для сверки нужна именно боевая Главная во всех состояниях, Ядро добавит dev-подмену
фактов сцены в памяти: часы, разрыв заходов, история дней, прогресс урока. Тот же вход функции, без записи.
