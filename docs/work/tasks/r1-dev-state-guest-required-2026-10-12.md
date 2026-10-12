# Task packet: dev_state?guest=required — ссылка съёмки отказывает целиком, если на эмуляторе не анонимный гость

Governance-ID: TG-2FFD39BE1F77
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (предложено координатору 12.10; Сверка поддержала и ждёт)
Related epic/enabler: съёмка R1; владелец разрешил роботу настоящие «Выйти», смену аккаунта, код приглашения, тумблеры — ТОЛЬКО на анонимном госте

## Outcome

Параметр `guest=required` в ссылке dev_state: до ЛЮБОГО шага проверяется текущий пользователь Firebase Auth. Не анонимный гость
(№1/№2/№3, Google/Apple, нет пользователя) → ссылка не применяет ничего и не переходит на `next` (экран остаётся на DEV-STATE),
лог `[DEV-STATE] guest=required refused: <причина>`; шаги робота дальше не находят элементов и падают безопасно.

## Scope

In scope: app/dev_state_account_guard.ts (чистая проверка без побочных эффектов), app/dev_state_fixtures.ts (параметр + ранний выход),
тест. Out of scope: само приложение, ссылки других сессий (параметр добавляет в ссылки та сессия, что их ведёт; свои — я).

## Architecture

Ранний выход в applyDevState сразу после проверки dev-сборки — тот же путь, что `not_dev_build`. Проверка — classifyGuestUser
(уже используемая фикстурами), но без markDevFixtureNoUpload: защита не должна менять синхронизацию карточек гостя.

## Security and privacy

Только снижает риск: настоящий аккаунт не получает ни одного dev-шага. Данных не добавляет.

## Technical debt

- Contain: параметр опциональный; без него поведение прежнее.

## Verification

Тест: не-гость → next=null, skipped.all=guest_required_refused, ни одного applied; гость → идёт дальше. Синтаксис; dev_state тесты.

## Rollback

Откат коммита.
