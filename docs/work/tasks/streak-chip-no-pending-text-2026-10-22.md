# Task packet: чип серии без текста «Сегодня ещё нет» + «До полуночи» на сцене «Сегодня»

Governance-ID: TG-06FD5077E9A2
Status: В работе
Owner: 2 · ДИЗАЙН (слово владельца 22.10 через координатора, дословно: «УБЕРИ ВОТ ЭТОТ ТЕКСТ, ТАКОГО НЕ НАДО ПОКАЗЫВАТЬ. ЛУЧШЕ ПРОСТО ПУСТЬ ОГОНЁК БУДЕТ ПУСТОЙ ИЛИ ЗАЖЖЁН»)
Related epic/enabler: none

## Outcome

В чипе серии на Главной нет текста «Сегодня ещё нет» / «Not yet today» (9 языков): под числом дней всегда стоит слово «Серия», а состояние дня показывает только значок огонька — пустой (flame-outline) или зажжённый (flame). Вместе с этим уходит перенос подписи в 3 строки. Для незрячих в accessibilityLabel остаётся «ещё не сегодня». Мера успеха: при pending на экране нет слова «Сегодня ещё нет», иконка flame-outline; тест зелёный. Дополнительно (просьба координатора): заголовок «До полуночи …» на сцене «Сегодня» рвётся только между фразой и временем, как на сцене Главной.

## Scope

In scope: app/(tabs)/home.tsx (метка чипа серии, удаление слова homeV2StreakPendingWord), components/home/v2/scene/home_scene_preview_fixtures.ts (слово pending в dev-входе), components/home/v2/today_scene/today_scene_copy.ts (midnightTitle, склейка неразрывными пробелами), тесты.

Out of scope: изменение значков и логики состояния дня (streakToday), a11y-тексты, колокольчик и аватар (не уменьшать), остальные подписи шапки.

## Architecture

No architecture change. Состояние «день ещё не засчитан» уже различается значком (flame-outline / flame) и accessibilityLabel; убирается только дублирующая видимая подпись, метка всегда «Серия». Слово pending остаётся только внутри accessibilityLabel (homeV2StreakPendingA11y).

## Security and privacy

Не затрагивается: данных не собираем, сетевых вызовов нет.

## Technical debt

- Contain: макеты docs/design/v2-app (home-new-concepts.html и др.) всё ещё показывают «Сегодня ещё нет» — решение владельца новее макета; координатор обновляет макеты/гейт сверки; owner: 0 · КООРДИНАТОР.

## Verification

- npm run test:one -- tests/streak_chip_no_pending_text_2026_10_22.test.ts tests/home_scene_preview_contract.test.ts tests/today_scene_copy.test.ts.
- grep по всем 9 вариантам фразы в app/ components/ — только accessibilityLabel.

## Rollback

Откат: revert коммита; данные не затрагиваются.
