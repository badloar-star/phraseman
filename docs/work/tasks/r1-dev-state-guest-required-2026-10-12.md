# Task packet: dev_state?guest=required — ссылка съёмки отказывает целиком, если на эмуляторе не анонимный гость

Governance-ID: TG-2FFD39BE1F77
Governance-ID: TG-43DFB4F8002E
Governance-ID: TG-D8EE1F90FA15
Status: In progress (п.1 координатора: формат лога + guest=required в ссылках)
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

## Дополнение (TG-43DFB4F8002E, координатор 12.10 вечер, п.1)

- Лог отказа строго: `[DEV-STATE] refused guest_required uid=<маска> isAnonymous=<значение>` (+ причина).
- `guest=required` во всех ссылках DEV_LINKS_R1 с удалением, сменой аккаунта и кодом приглашения, где кадр — гость:
  auth-gap-010/011, auth-gap-012…018, overlays-campaigns-016…026 (пост-обработка ENTRIES в scripts/dev_links_r1_steps_auth.py).
- НЕ ставится (кадр существует только у вошедшего аккаунта — кнопка «Выйти» и окно «14 дней» рисуются при linkedAuth,
  app/account_details.tsx): profile-028/029 (выход), profile-030 и auth-gap-009 (удаление с входом). Они остаются на подменах-отказах
  logout=hold|fail / delete=fail, которые отказывают до любого действия на ЛЮБОМ аккаунте. Настоящий выход без подмены неизбежно
  трогает аккаунт №1–№3 — только по отдельному слову владельца.
- Стор-сборка: маршрут dev_state вырезан, applyDevState в стор-режиме отказывает (isDevStateAvailable), модуль защиты грузится
  только из него — отдельная заглушка не нужна.
- (TG-D8EE1F90FA15) шаги на новых подменах Ядра (7a79d3519): settings-gap-020/021/023, paywalls-008/009/010/020, profile-019.
