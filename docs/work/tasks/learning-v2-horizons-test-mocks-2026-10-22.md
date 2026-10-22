# Task packet: тест горизонтов Learning V2 снова зелёный (заглушки теста)

Governance-ID: TG-2AC45EB509DD
Status: In progress
Owner: сессия Learning V2 (поручение координатора 22.10)
Related epic/enabler: none

## Outcome

tests/learning_v2_horizons_native.test.tsx проходит 17/17. Красным его делают устаревшие заглушки теста (ThemeContext без
FONT_SCALE, заглушка, которая отдаёт не массив туда, где код ждёт пару), а не код экранов.

## Scope

In scope: только заглушки в tests/learning_v2_horizons_native.test.tsx. Out of scope: код экранов горизонтов и словаря —
правится только если по логам окажется, что ошибка в нём (тогда отдельно и с разбором).

## Architecture

No architecture change: тест догоняет текущие контракты модулей (ThemeContext, хуки), которые заглушки перестали повторять.

## Security and privacy

Не применимо: изменения только в тесте.

## Technical debt

- Pay now: заглушки повторяют текущий публичный контракт модулей, без лишнего.

## Verification

Прогон теста через слот (RNTL-конфиг): 17/17; вывод сохранить в scratchpad.

## Rollback

git revert коммита теста.
