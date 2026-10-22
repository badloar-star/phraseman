# Task packet: Пик — строка summitDock, сверка перевода перед хотфиксом OTA (Переводчик, координатор 22.10)

Governance-ID: TG-9F6668D39C73
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

`summitDock` в `components/spire/spire_game_strings.ts` (c2ad7ec38, 3 · МАКЕТЫ) — надпись вместо «Играть» после Стража-15.
Ширина кнопки — до 32 знаков. Сверка: 7 языков верны, исправляю два.
- en «You are at the summit this week» → «You’re at the summit this week»: короче и естественнее, апостроф как в соседних строках.
- pl «Jesteś na szczycie w tym tygodniu» (33 знака, больше лимита 32) → «Jesteś na szczycie tygodnia» (27), как ru «вершине недели».

## Scope

In scope: две подстроки одного ключа. Out of scope: логика вершины (3 · МАКЕТЫ).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync` файла; поиск старых строк по тестам; `git diff --numstat` = 1/1 (+ комментарий «зачем»).

## Rollback

`git revert <коммит>`.
