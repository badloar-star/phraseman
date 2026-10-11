# Task packet: getDevGreetName() для greet= и ревью безопасности dev-хуков аккаунта (5e5faa331)

Governance-ID: TG-764F27F4B055
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по поручению координатора (12.10)
Related epic/enabler: docs/work/tasks/dev-account-states-2026-10-12.md; R1_SHOT_LIST onboarding-010

## Outcome

(1) Независимый ревью безопасности диффа 5e5faa331 (dev-хуки в `auth_provider.ts`): в стор-сборке хуки физически недостижимы, и никакая комбинация параметров не приводит к реальному стиранию, выходу или удалению. (2) Параметр `greet=<строка>` и геттер `getDevGreetName()` в `app/dev_account_state.ts` (память, только dev) — вставку в `CleanOnboarding.tsx` делает Авторизация. (3) Срез типов `auth_provider.ts` — когда на ПК ≥ 4 ГБ свободно и нет чужого tsc.

## Scope

In scope: `app/dev_account_state.ts` (+ геттер), `app/dev_state_fixtures.ts` (параметр `greet`), тест; ревью агентом (только чтение); отчёт координатору.

Out of scope: правка `CleanOnboarding.tsx` (в работе у Авторизации); любые изменения поведения auth-функций сверх уже закоммитенных хуков (правки по итогам ревью — только если ревью найдёт дефект, отдельным коммитом).

## Architecture

No architecture change: ещё одно значение в том же in-memory состоянии, геттер «выключено» вне `__DEV__ && !IS_STORE_RELEASE`.

## Security and privacy

Имя из ссылки — тестовая строка, обрезается до 24 символов, никуда не отправляется и не пишется. Ревью проверяет отсутствие пути к реальному стиранию/выходу/удалению.

## Technical debt

Contain: тест геттера и стор-сборки. Accept temporarily: геттер остаётся до конца R1.

## Verification

Тест `tests/dev_account_state.test.ts` (greet), отчёт ревью, срез типов `auth_provider.ts` при свободной памяти.

## Rollback

Откат коммита; данные не затрагиваются.
