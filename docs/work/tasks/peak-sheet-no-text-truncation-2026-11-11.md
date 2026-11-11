# Task packet: лист этажа Пика без обрезки текста (lint text-integrity)

Governance-ID: TG-0F7CFFC3FF6D
Status: In progress
Owner: сессия «Пик: лист этажа»
Related epic/enabler: release-gate Lint (координатор 11.11)

## Outcome

Release-gate держит отправку ветки: `text-integrity/no-unsafe-text-truncation` в
`components/spire/peak/PeakStepSheet.tsx` (подпись «Рекорд ступени N», имя держателя рекорда, имя в сетке «Сейчас на этаже»).
Правило владельца: текст не обрезать и не ужимать — лечить переносом и вёрсткой.

## Scope

In scope: убрать `numberOfLines` у трёх текстов листа; имя в сетке — перенос по центру ячейки.
Out of scope: правило линта и его базовый список (не ослаблять, исключений не добавлять), другие файлы.

## Architecture

No architecture change: только вёрстка текста в одном компоненте.

## Security and privacy

Не касается: данные и запросы не меняются.

## Technical debt

Pay now: три запрещённых обрезки удалены, база правила не растёт.

## Verification

`npx eslint components/spire/peak/PeakStepSheet.tsx` точечно; тесты листа через светофор.

## Rollback

Откат коммита; на данные не влияет.
