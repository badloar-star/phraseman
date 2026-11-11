# Task packet: убрать временные замеры [TAP-PERF] и [TILE-PERF] из урока

Governance-ID: TG-014EEE723929
Status: In progress
Owner: сессия «аудит микрофризов при сборке фраз» (владелец 11.11.2026)
Related epic/enabler: docs/work/tasks/lesson-tap-perf-trace-2026-11-11.md

## Outcome

Владелец 11.11 на вопрос «что делать с временными замерами»: «Убрать замеры, ждать сборку». Замер выполнен
(23 тапа в dev: 34–76 мс до готового кадра), цифры получены, трассировка больше не нужна. Результат — в коде урока
не остаётся временных строк лога; поведение урока не меняется.

## Scope

In scope:
- `app/lesson1.tsx` — убрать блок `[TAP-PERF]`, вернуть однострочный `onTileWordPress`;
- `app/lesson1_smart_options.ts` — убрать обёртку-замер `[TILE-PERF]`, подбор плиток снова одна функция.

Out of scope: сами ускорения (подбор слов, вибрация на касании, отдельный блок плиток) остаются; повторный аудит
сборки фраз идёт отдельным шагом без правок кода.

## Architecture

No architecture change: удаляется только диагностическая обвязка, добавленная сегодня.

## Security and privacy

Не затрагивается: удаляется лог с числами миллисекунд.

## Technical debt

- Pay now: временная трассировка, принятая как долг в двух прошлых карточках, снимается.

## Verification

- сторожа коммита; `npm run test:one -- tests/lesson_word_press_accuracy_contract.test.ts` и
  `tests/smart_distractors.test.ts` через светофор;
- в коде нет строк `TAP-PERF` и `TILE-PERF`.

## Rollback

`git revert` одного коммита.
