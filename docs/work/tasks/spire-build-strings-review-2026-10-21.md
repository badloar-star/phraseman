# Task packet: сверка строк Пика «Собери перевод» (коммит Дизайна 56587085d)

Governance-ID: TG-2F1B9F321406
Status: In progress
Owner: сессия «10 · ПЕРЕВОДЧИК»
Related epic/enabler: R07

## Outcome

Ключи `check`, `buildCount`, `buildReorder` в `components/spire/spire_game_strings.ts` сверены
на 9 языках. `check` и `buildCount` верны. В `buildReorder` исправлены uk («тап по слову» — калька
→ «торкнися слова, щоб прибрати його») и pl («by je cofnąć» → «by je zabrać»). ru — из макета, не трогаю.

## Scope

In scope: две строки текста в одном ключе. Out of scope: логика экрана, ru-эталон.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Новый долг не вносится: две строки текста.

## Verification

`babel.parseSync`; поиск тестов со старым текстом. Прогон тестов — после «142 tsc готов».

## Rollback

`git revert <коммит>`.
