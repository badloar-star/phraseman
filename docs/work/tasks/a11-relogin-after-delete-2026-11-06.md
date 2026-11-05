# A11 — повторный вход после окончательного удаления: без окна «Аккаунт удалён» (Q26, решение владельца 05.11)

Governance-ID: TG-0E85C04E940C
Status: В работе 06.11
Owner: «5 · ВХОД»

## Outcome

Человек, вошедший в окончательно удалённый аккаунт (Google/Apple), не видит окна «Аккаунт удалён безвозвратно»: приложение тихо остаётся у чистого нового профиля, как в окне входа из других мест.

## Scope

`components/CleanOnboarding.tsx` (два места ветки `identity_retired`: убрать вызов `noticeAccountDeletedForever`, оставить журнал `[AUTH-RETIRED]`), `tests/aa_release_floor_auth_ui.test.ts` (счёт вызовов 2 → 0), новый сторож `tests/a11_retired_signin_quiet_2026_11_06.test.ts`.
Функция `noticeAccountDeletedForever` остаётся в коде (покрыта тестом), но больше нигде не вызывается.

## Architecture

Сервер (Q26, ревизии accountdeletemine 00068, worker 00041, retrycron 00035) удаляет лишние записи входа замыкания, поэтому повторный вход создаёт свежий Auth-пользователь. Клиент при `subject:stable` уже создаёт чистый профиль; при `auth|closure|unknown` остаётся отказ с поднятой свежей анонимной личностью (fail-closed не меняется) — убирается только окно.

## Security and privacy

Данные не собираются и не передаются. Защитная ветка (выход провайдера, свежая личность) не тронута — чужие данные на телефоне не попадают.

## Technical debt

A5 (двойной сбой очистки при выходе) не трогается без подтверждённого защитного маркера. Сквозной прогон на тестовом аккаунте №3 — вместе с Ядром.

## Verification

Точечно: `tests/aa_release_floor_auth_ui.test.ts`, новый сторож; журнал `[AUTH-RETIRED]` в онбординге.

## Rollback

Вернуть два вызова `noticeAccountDeletedForever(lang, 'onboarding')`.
