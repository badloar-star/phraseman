# Task packet: демо-ошибки (mistakes=demo) — слова образца mistakes-panel

Governance-ID: TG-444AC661B671
Status: Done
Owner: Ядро (сессия 1)
Related: координатор 13.10; mistakes-panel-021 (образец mistakes-panel.shadow.html — «Grandchildren»)

## Outcome

Засев и демо-хаб подмены mistakes=demo используют фразы образца: Grandchildren — Внуки, I have been — Я был, Ready — Готов,
Although — Хотя, Make a decision — Принять решение, Through — Через. Только демо-данные гостя в dev.

## Scope

In scope: app/dev_mistakes_seed.ts, app/dev_mistakes_demo.ts (только строки фраз). Out of scope: настоящая отработка ошибок.

## Architecture

No architecture change.

## Security and privacy

Только dev-данные гостя.

## Technical debt

- Если в журнале гостя уже есть настоящие ошибки урока (например «Ты в порядке»), они старше засева и встают в очередь первыми — для кадра нужен свежий гость.

## Verification

Тест засева (dev_mistakes_seed_ready) и стор-заглушки.

## Rollback

Откат коммита.
