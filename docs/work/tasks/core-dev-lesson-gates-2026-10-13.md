# Task packet: dev-подмена «настоящие ворота уроков» — модалы A11/A12 (learn-012/013), шаги learn-031/032, dialogs-041

Governance-ID: TG-45D905CB16A4
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: Макеты f5564eafa (learn-012/013 — экран вместо модала), dialogs-041 (passed вместо finished)

## Outcome

Робот снимает окна «Уровень пока закрыт» (A11) и «Недоступно» (A12) списка уроков, а не экран зачёта; dialogs-041 доходит
до «Диалог пройден».

## Scope

In scope: `app/dev_paywall_state.ts` (+ заглушка стора) — флаг в памяти `lessonGates=real` и `legacyCap=N`;
`app/dev_plus_controls.ts` `projectDevLessonAccess` учитывает флаг; разбор в `app/dev_state_fixtures.ts`; тесты.
Шаги ссылок — Авторизация (steps-модуль). Out of scope: логика ворот в `app/(tabs)/lessons.tsx` (не меняется).

## Architecture

Причина: в dev-сборке `DEV_CONTENT_UNLOCK` открывает всё, поэтому `allDone` экзамена истинен и тап ведёт на `/level_exam`.
Флаг `lessonGates=real` выключает dev-открытие при Plus (A11: Plus, A2 не открыт). `legacyCap=N` при plus=off задаёт
сохранённый бесплатный потолок старых аккаунтов (D122) — A12: Free с потолком 8, A1 не пройден. Только память процесса.

## Security and privacy

Не касается: dev-only, в стор-сборке заглушка, хранилище и облако не меняются.

## Technical debt

- Contain: флаг живёт до перезапуска процесса, как прочие dev-подмены.

## Verification

Тесты на проекцию доступа и разбор ссылки; Сверка — повтор learn-012/013.

## Rollback

Откат коммита; без ссылки поведение прежнее.
