# Task packet: сторож отката ступени — ожидание под слово «этап»

Governance-ID: TG-EB94F989BF19
Status: In progress
Owner: сессия «Пик: лист этажа» (по просьбе координатора)
Related epic/enabler: none

## Outcome

`tests/spire_reject_rollback.test.ts` красный: ждёт `stepNotCounted: ['Ступень не засчиталась`, а строка с 05.11
(коммит a37fe582c, слово владельца «ступень → этап») звучит «Этап не засчитался. Пройди его ещё раз». Ключ и экран на месте.

## Scope

In scope: одна строка ожидания в тесте + комментарий «зачем». Сама проверка отката (ключ stepNotCounted на экране) остаётся.
Out of scope: тексты приложения, другие тесты (grep по tests/: других ожиданий со словом «Ступень» нет).

## Architecture

No architecture change: правка устаревшего контракта теста.

## Security and privacy

Не касается.

## Technical debt

Pay now: устаревшее ожидание приведено к действующему тексту, сторож не ослаблен.

## Verification

`npm run test:one -- tests/spire_reject_rollback.test.ts` через светофор.

## Rollback

Откат коммита.
