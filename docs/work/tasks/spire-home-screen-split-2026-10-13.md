# Task packet: SpireHomeScreen ≤ 400 строк — вынос чтения локальной недели в модуль (Авторизация №11, координатор 13.10)

Governance-ID: TG-959BBB54D844
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по просьбе Авторизации и координатора

## Outcome

`components/spire/SpireHomeScreen.tsx` короче 400 строк (сторож `spire_tab_gate_source_contract` «every spire component file stays within 400 lines» снова зелёный). Поведение не меняется: выносятся только функции чтения локальной недели и список языков Шпиля в отдельный модуль `components/spire/spire_home_week.ts`.

## Scope

In scope: `SpireHomeScreen.tsx` (удаляются `SPIRE_LANGS`, `asSpireLang`, `peekFirstFrameWeek`, `readCurrentLocalWeek` и ставшие ненужными импорты), новый модуль `spire_home_week.ts`, сторож модуля.

Out of scope: имена-заглушки в `SpireTour.tsx` (сессия Темы), остальные сторожа Шпиля (`use_spire_game.ts` длиннее 400 строк — отдельно, Авторизация).

## Architecture

Модуль экспортирует `asSpireLang`, `peekFirstFrameWeek`, `readCurrentLocalWeek` без React. Логи [SPIRE] и ветки (нет uid, нет недели, устарела) переносятся один в один; экран импортирует их и вызывает как раньше.

## Security and privacy

Данных не касается.

## Technical debt

Contain: файл `SpireHomeScreen.tsx` всё ещё близок к потолку — дальнейший рост требует следующего выноса (шапка недели или блок логов шлюза).

## Verification

Точечные прогоны `tests/spire_tab_gate_source_contract.test.mjs` (часть про 400 строк), `tests/spire_target_reset.test.ts`, `tests/spire_optimistic_ui_r1.test.ts` и сторожа нового модуля через test:one под светофором.

## Rollback

git revert коммита.
