# Task packet: перенос найденных отличий в поле diffs реестра сверки

Governance-ID: TG-5A11ED7CC817
Governance-ID: TG-1EE50127DDB9
Governance-ID: TG-3C43A4E6BAF2
Status: In progress
Owner: сессия 6 «СВЕРКА»
Related epic/enabler: ГЕЙТ «ПРИЛОЖЕНИЕ = МАКЕТ»; docs/phraseman-2.0/registries/visual_parity.json

## Outcome

Каждая снятая строка реестра, у которой в SVERKA_LOG записаны отличия, получает их в поле `diffs`. Строка с непустым `diffs` не может стать `match` — гейт видит отличия, а не только журнал.

## Scope

In scope: только поле `diffs` (и `evidence` там, где снимок сделан по подписи кадра) в docs/phraseman-2.0/registries/visual_parity.json, через `updateRow` из scripts/parity_shot.mjs (атомарно, под блокировкой). Скрипт заполнения — scripts/sverka_fill_diffs.mjs.

Out of scope: статусы `match` (ставит координатор), код приложения.

## Architecture

No architecture change: используется существующий атомарный `updateRow` реестра; новый скрипт только вызывает его со списком отличий.

## Security and privacy

Не касается: документация сверки, нет данных пользователей и секретов.

## Technical debt

- Contain: отличия дублируются в SVERKA_LOG (человеку) и diffs (гейту). Выход — писать сразу в diffs при каждой съёмке (правило с 04.10).

## Verification

`node -e` чтение реестра: у перечисленных строк `diffs.length > 0`.

## Rollback

`git revert` коммита — реестр вернётся к прежнему состоянию; данные пользователей не затронуты.
