# Task packet: наряды башни Шпиля по лигам — каркас (владелец 13.10)

Governance-ID: TG-24079139BA1C
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по поручению координатора (палитры — Макеты)

## Outcome

1. `SpireTowerSvg` принимает проп `skin`: цвета кладки, карнизов, крыши, неба, света окон, свечения навершия и тон зубцов берутся из него; без пропа — прежний вид (Оникс без деталей).
2. Таблица «лига → наряд» одна: `modules/spire/tower_skins.ts` (индекс = tier из `tier_names.ts`). Заполнены Гранит и Мрамор для проверки, остальные `null` = Оникс.
3. `SpireTower` выбирает наряд по лиге игрока мемо по `tier`; экран Шпиля передаёт `game.tier ?? week.tier`.
4. Выключатель `SPIRE_LEAGUE_SKINS_ENABLED = false`: пока Макеты не отдали финальные палитры, игрок видит прежнюю башню.

## Scope

In scope: `modules/spire/tower_skins.ts`, `components/spire/SpireTowerSvg.tsx`, `SpireTower.tsx`, `SpireHomeScreen.tsx` (одна строка), сторож `tests/spire_tower_skins.test.ts`.

Out of scope: текстуры и детали (металл, навершия, вымпелы) — поля `texture`/`details` заведены, отрисовка придёт с финальными палитрами; `SpireTour.tsx` (файл Тем); «Итог недели» — в карточке башни нет, нужен мини-макет.

## Architecture

Наряд — замороженный объект чистых строк; число узлов SVG от него не зависит (+0), blur на кладке не добавляется. Стабильная ссылка наряда держит memo башни.

## Security and privacy

Данных пользователя не затрагивает.

## Technical debt

Contain: палитры Гранита/Мрамора временные (из спеки до «премиальной» переделки); включение — одной строкой после приёмки Сверкой.

## Verification

Точечный прогон сторожа `tests/spire_tower_skins.test.ts` через test:one — 7 из 7.

## Rollback

git revert коммита.
