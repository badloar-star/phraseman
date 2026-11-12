# Task packet: сторож «Потока» проверяет английские уроки 13–16

Governance-ID: TG-64A600042EF5
Status: Done
Owner: сессия «банк игр es/it» (просьба координатора 12.11)
Related epic/enabler: D207

## Outcome

`tests/game_flow_distractors.test.ts` проверяет свои варианты «Потока» английского курса на уроках 13–16 теми же
правилами, что 1–12: на урок не меньше шести фраз с набором, раунды собираются из своих вариантов.

## Scope

In scope: только список уроков по языку в `tests/game_flow_distractors.test.ts`. Out of scope: сами банки.

## Architecture

No architecture change: расширение списка уроков в стороже.

## Security and privacy

Не применимо.

## Technical debt

- Pay now: список уроков сторожа отставал от банка английского (13–16 добавлены без проверки) — заменён на число
  «последний урок банка» по языку, чтобы расширение было одной правкой.

## Verification

`npm run test:one -- tests/game_flow_distractors.test.ts` через светофор, читать «N passed».

## Rollback

`git revert` коммита.
