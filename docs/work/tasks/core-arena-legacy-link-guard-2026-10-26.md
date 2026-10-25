# Ядро · старый адрес /arena ведёт на Главную — сторож (аудит «назад», пункт 5 раздачи)

Governance-ID: TG-23E74AFC834A
Status: In progress
Owner: 1 · ЯДРО (координатор 26.10: «Арена удалена, маршрут не удаляем — OTA, старые ссылки и пуши; мягкий переход на
Главную + сторож»)

## Outcome
Старые ссылки и пуши на `/arena` открывают Главную, а не пустой экран и не not-found. Сторож держит это правило.

## Scope
In scope: тест `tests/arena_legacy_link_to_home_contract.test.mjs`.

Out of scope: код. Мягкий переход уже есть — `app/(tabs)/arena.tsx` — пустой якорь (D83), `app/(tabs)/_layout.tsx`
отображает `/arena` и сегмент `arena` на вкладку 0. Восстанавливать Арену запрещено (D54/D83).

## Architecture
Изменений нет. Правило сторожа: обе таблицы `_layout.tsx` (`PATHNAME_TO_IDX`, `SEGMENT_TO_TAB_IDX`) дают `/arena` → 0, а
вкладка 0 — `/(tabs)/home`. Якорь пустой и без импортов — это уже держит `d83_arena_client_deleted.probe.ts`.

## Security and privacy
Данных не касается.

## Technical debt
Accept temporarily — маршрут /arena живёт, пока есть сборки и пуши со старой ссылкой. Удалить его решает координатор,
когда минимальная версия поднимется выше последних сборок с Ареной. До тех пор сторож держит переход на Главную.

## Verification
`node --test tests/arena_legacy_link_to_home_contract.test.mjs`.

## Rollback
Откат коммита.
