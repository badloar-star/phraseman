# Task packet: у каждой сценки Диалогов свой значок (владелец 13.10 09:40, через координатора)

Governance-ID: TG-87AB3474EA89
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

В каталоге Диалогов строка сценки показывает значок по смыслу сценки, а не общий значок мира. Примеры:
- `travel_02` «код двери» → `key`;
- `work_03` «время звонка» → `call`;
- `everyday_07` «присмотр за питомцем» → `paw`.

Сопоставление id → значок — одна таблица `components/dialogs/dialogue_scenario_icons.ts` на все 76 выпущенных сценок
(travel/work/social/everyday _01…_19). Неизвестный id — прежний значок мира.

## Scope

In scope:
- таблица значков;
- одна строка отрисовки в `DialogueV2CatalogueSection.tsx` (плитка строки сценки);
- сторож-тест.

Out of scope:
- значок мира в заголовке группы;
- брифинг и сессия;
- тексты, раскладка, размеры, цвета.

## Architecture

Чистая таблица `Record<string, IoniconName>` + функция `dialogueScenarioIcon(id, fallback)`. Логов нет — чистая отрисовка
(решение координатора).

## Security and privacy

Только вид.

## Technical debt

- Contain: новые сценки без строки в таблице получают значок мира. Сторож требует строку для каждой выпущенной сценки.

## Verification

Тест: каждое имя есть в glyphmap Ionicons; таблица покрывает все `sourceScenarioId` выпущенного кандидата;
отрисовка вызывает таблицу с запасным значком мира. Сверке — список Диалогов.

## Rollback

git revert коммита.
