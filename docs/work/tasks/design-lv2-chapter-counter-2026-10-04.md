# Task packet: счётчик главы на карте LV2 по макету learning-v2.html

Governance-ID: TG-195AB025501C
Status: In progress
Owner: сессия «2 · Дизайн» (контур 2, LANES.md)
Related epic/enabler: гейт «приложение = макет», склейка learning-v2_map_nodes.png

## Outcome

Счётчик главы «N/8» на карте «Главы» как в learning-v2.html кадр 03: число крупно (24, жирное), «/8» мелко (13), приглушённо.

## Scope

In scope: `components/learning-v2/LearningV2ChaptersCourse.tsx` — стиль и разметка счётчика главы.
Out of scope: логика прогресса, плавающая кнопка «Все уроки» (отдельный пункт), другие экраны.

## Architecture

No architecture change: только стиль текста.

## Security and privacy

Не затрагивает данные.

## Technical debt

- Accept temporarily: плавающая кнопка «Все уроки» из макета (в приложении — карточка в конце списка) остаётся
  отличием до отдельного пункта; владелец — сессия «2 · Дизайн», пересмотр — следующий проход LV2.

## Verification

Сторожа LV2 (node --test learning_v2_*_contract.test.mjs, tsx-гейт legacy lessons), склейка до/после на emulator-5554.

## Rollback

`git revert` коммита.
