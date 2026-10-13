# Task packet: Пик — кнопка «Играть» не закрывает низ окна башни (строка 25 R1_BACKLOG, 13.10)

Governance-ID: TG-1CAD8BB2C5D5
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по поручению координатора (кадры spirecheck-001…004: этаж 1 скрыт, этаж 2 наполовину под кнопкой)

## Outcome

После переноса «Комнаты недели» наверх окно башни начинается ниже, и на первом показе его нижние этажи лежали под доком с кнопкой «Играть». Теперь окно ровно до дока (не ниже 260 dp и не выше 400 dp по макету), свой этаж остаётся по центру окна.

## Scope

In scope: `components/spire/spire_tower_window.ts` (чистая функция высоты), `components/spire/SpireTower.tsx` (проп `windowHeight`, центровка по актуальной высоте, повторная центровка при смене высоты), `components/spire/SpireHomeScreen.tsx` (измерение верха окна и верха дока), сторож `tests/spire_tower_window_height.test.ts`.

Out of scope: запас низа страницы (хвост уже считается от высоты дока), вид башни и сцена (Темы), кнопка «Играть».

## Architecture

Верх окна — `onLayout` обёртки башни, верх дока — `onLayout` обёртки дока (одна система координат, страница в положении 0). Высота = верх дока − верх окна − зазор (DOCK_GAP 16), зажата в [260, 400]; пока не измерено — 400. На больших экранах окно остаётся 400, как в макете.

## Security and privacy

Данных не касается.

## Technical debt

Remove: константа высоты окна в расчёте прокрутки (заменена актуальной из ref). Первый кадр рисуется с 400 и один раз ужимается после измерения дока (🟡: в пределах первых кадров).

## Verification

Точечно: `spire_tower_window_height` (4), `spire_tower_scroll_gap017`, `spire_tower_skins`, `spire_rank_coin_avatars`, `spire_rivals_around_floor`, `pm214_spire_config_warm`, `spire_game_source_contract`, `spire_tab_gate_source_contract` (лимит 400 строк: SpireHomeScreen 392); кадр Сверки floor=4 на новой сборке.

## Rollback

git revert коммита.
