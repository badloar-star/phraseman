# Task packet: factory_native generated — типизированные строки, без TS2590

Governance-ID: TG-546793C68890
Status: In progress
Owner: сессия Learning V2; разрешение владельца через координатора 22.10 («Codex уже без токенов, так что ты сам всё сделаешь»)
Related epic/enabler: afc35c653 (генератор)

## Outcome

В HEAD нет TS2590 в modules/learning-v2/content/factory_native/factory_native_{catalog,manifest}_v1.generated.ts — сборка снова
проходит проверку типов. Незаконченная работа Codex (l22 s53–s54) остаётся незакоммиченной в рабочей копии, но в новой записи.

## Scope

In scope: ровно два сгенерированных файла (разрешение владельца). Out of scope: всё остальное в content/** и modules/learning-v2/content/**.

## Architecture

Механическая замена записи: `Object.freeze({` → `Object.freeze<Row>({` у строк и `Object.freeze([` → `Object.freeze<Row[]>([` у массива.
Данные строк не меняются. Тот же вид печатает исправленный генератор (afc35c653).

## Security and privacy

Не касается данных пользователя: статические метаданные курса.

## Technical debt

- Pay now: генератор уже печатает новую запись; следующая полная пересборка Codex совпадёт с этим видом.

## Verification

1) diff HEAD → преобразованный HEAD: меняются только строки с `Object.freeze` (число строк = число строк каталога + 1).
2) tsc через слот: 0 TS2590. 3) После возврата рабочей копии git diff показывает только строки l22 s53–s54.

## Rollback

git revert коммита — вернёт прежнюю запись (с TS2590). Рабочая копия Codex сохранена в scratchpad до правки.
