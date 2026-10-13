# Task packet: Пик — верх башни виден на вершине и dev-параметр spireScroll=top (№25б, 13.10)

Governance-ID: TG-6BFBD7E92E07
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по поручению координатора (кадр spiretop_tier0_scrolled: кровля у верхнего края окна, конус и навершие срезаны)

## Outcome

На 14–15 этаже окно башни центрировалось на своём этаже, и верх башни (конус, навершие) уходил выше края окна. Геометрия уже даёт запас над кровлей (запас сверху 300 против 238 нужных), поэтому отступ не добавляется: окно на 14–15 этаже прижимается к верху башни, если свой этаж остаётся в окне (в узком окне 14 этаж остаётся по центру). Для кадров Сверки — dev-параметр `dev_state?spireScroll=top|off`: окно башни прокручивается к началу сцены; журнал `[SPIRE-SCROLL] top` с `gotY` и `[SPIRE-DOCK-INSET] top|window` (contentTop, sceneTopY, maxScroll, достижимость верха и этажа 1, высота окна до дока).

## Scope

In scope: `components/spire/spire_tower_crown.ts` (подъём кровли из геометрии, куда прокрутить), `components/spire/SpireTower.tsx` (прокрутка через эту функцию, dev-подмена, журналы), `components/spire/SpireHomeScreen.tsx` (журнал высоты окна), `app/dev_spire_tier.ts` + `store_release_stubs/dev_state/dev_spire_tier_stub.ts` + `app/dev_state_fixtures.ts` (параметр), сторожа `spire_tower_crown`, `spire_dev_scroll_override`.

Out of scope: сцена и цвета (Темы), высота окна до дока (отдельный коммит этого же вечера).

## Architecture

`SPIRE_CROWN_RISE = 34 + 168 + 36` повторяет геометрию `Crown` (барабан, конус, навершие и свечение), сторож проверяет совпадение с литералами `Crown`. Прокрутка: `spireWindowScrollY({cy, windowH, crownTopY, floorHalf, nearTop})`. Параметр `spireScroll` живёт в памяти процесса, в стор-сборке геттер всегда null, установка отклоняется; стор-заглушка экспортирует те же имена.

## Security and privacy

Данных не касается.

## Technical debt

Remove: ничего; журналы `[SPIRE-DOCK-INSET]` остаются на ранних выходах прокрутки и краях окна.

## Verification

Точечно: `spire_tower_crown`, `spire_dev_scroll_override`, `spire_tower_window_height`, `spire_tower_scroll_gap017`, `store_release_dev_state_stubs`, `spire_dev_preview_release_guard`, `spire_game_source_contract`, `spire_tab_gate_source_contract`; кадры Сверки (низ: этаж 1, верх: tier 0..11).

## Rollback

git revert коммита.
