# Task packet: сторож «Потока» проверяет немецкий и французский до урока 12

Governance-ID: TG-63FF9877B8C2
Status: In progress
Owner: сессия «банк заданий игр de/fr» по задаче координатора («Проверка сессий и коммитов»)
Related epic/enabler: D207; продолжение `game-task-bank-de-fr-lessons-9-12-2026-11-12.md`

## Outcome

Сторож `tests/game_flow_distractors.test.ts` требует свои варианты «Потока» у немецкого и французского на уроки
1–12 (банк продлён коммитами 59e716ab1 и 4f41f979f). Красное от вариантов — чинятся варианты, не сторож.

## Scope

In scope: одна строка `LAST_LESSON` в `tests/game_flow_distractors.test.ts` (de: 12, fr: 12); при красном —
`modules/games/bank/flow_de.ts`, `flow_fr.ts`.

Out of scope: банки en/es/it, правила проверки сторожа.

## Architecture

No architecture change: расширение списка проверяемых уроков — сторож становится строже.

## Security and privacy

Не применимо.

## Technical debt

Нет новых.

## Verification

Через светофор: `npm run test:one -- tests/game_flow_distractors.test.ts` — «N passed».

## Rollback

`git revert` коммита: сторож снова проверяет de/fr до урока 8.
