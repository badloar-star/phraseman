# Task packet: «Мои ошибки» — «Все 12» продолжает старую сессию из одного задания (mistakes-panel-017)

Governance-ID: TG-0E50EDD95B04
Status: Done
Owner: Ядро (сессия 1)
Related: координатор 13.10; THEMES_ZONES_DIFF_ROWS_R1 (a657d84e4) mistakes-panel-017

## Outcome

Сперва доказательство: тест воспроизводит, что prepareMistakePracticeSession возобновляет сохранённую сессию, собранную под
другой запрос (группа ошибок / длина), и «Все 12» даёт 1 задание. Затем журнал [MISTAKE-PRACTICE-PREPARE] печатает,
чем запрос отличается от сохранённой сессии; правка — возобновлять только сессию того же запроса.

## Scope

In scope: tests/mistake_practice_resume_request_mismatch.test.ts, app/mistake_practice_session_runtime.ts,
modules/mistake-practice/session.ts (поле запроса сессии). Out of scope: правило «исправлено за три разных дня» (замысел).

## Architecture

No architecture change: в сохранённую сессию добавляется отпечаток запроса (необязательное поле, старые сессии читаются).

## Security and privacy

Не касается данных: локальная сессия практики, без новых полей профиля и сети.

## Technical debt

- Старые сохранённые сессии без отпечатка возобновляются как раньше (нельзя отличить запрос).

## Verification

Новый тест (красный до правки, зелёный после), mistake_practice_energy_paid_resume, mistake_practice_review_prepare, runtime_journey.

## Rollback

Откат коммита.
