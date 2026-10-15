# Task packet: защёлка «окно режимов или прямой старт» в хабе Карточек

Governance-ID: TG-00FE152E581E
Status: Done
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: R60, замечание Ревизора по `935f6a931`.

## Outcome
Окно режимов тренировки и запасной прямой старт не срабатывают оба: открылось окно — fallback не стартует; fallback стартовал — окно позже не открывается поверх сессии (лог `sheet_suppressed_after_fallback`).

## Scope
In scope: `app/flashcards/FlashcardsHubScreen.tsx`, тест `tests/train_intent_and_video_watch_pack.test.ts`.

## Architecture
Попытка (`trainAttemptRef`) на каждый запуск тренировки по намерению: флаги «окно открылось» и «время fallback»; `onTrainPress` отказывает 10 с после fallback.

## Security and privacy
Данные не собираются; только журнал.

## Technical debt
Нет.

## Verification
Тест-сторож связей; затронутые наборы тестов хаба.

## Rollback
`git revert` коммита.
