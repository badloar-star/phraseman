# Task packet: P24 — отложенная запись настроек пушей уходит в документ гостя после выхода (Ревизор, координатор 15.10)

Governance-ID: TG-B79F3F3388F4
Status: Подготовка; коммит вместе с оптимистичным выходом (п.4 account-speed-plan) или раньше отдельным окном
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

`app/push_token_registration.ts`: `updateServerPushPrefs` копит выбор 1,5 с, `writeServerPushPrefsNow` берёт `ensureAnonUser()` в момент
записи — без поколения аккаунта. Тумблеры пушей + сразу «Выйти» → pushPrefs прошлого аккаунта записываются в users/{гость}.
После правки: владелец (поколение аккаунта) захватывается при тапе; смена поколения отменяет отложенную запись
(`[PUSH-PREFS] cancel reason=owner_changed`); запись, уже начатая, перед `set` сверяет владельца и пропускает (`skip reason=owner_changed`).

## Scope

In: `app/push_token_registration.ts` (захват поколения, подписка на смену, проверки перед записью), тест
`tests/push_prefs_owner_guard.test.ts`. Out: формат pushPrefs, склейка 1,5 с, кэш-ключ.

## Architecture

`captureAccountGeneration()` / `subscribeAccountGeneration()` из `app/account_generation.ts` (уже используются выходом/сменой).
Сравнение по номеру поколения и stableId: выход вызывает `invalidateAccountGeneration()` (номер растёт) — этого достаточно для отмены.
Если поколение не менялось (в т.ч. ранний старт, тесты без поколения) — поведение прежнее.

## Security and privacy

Устраняет запись данных аккаунта A в документ гостя. В лог — номера поколений и фаза, без uid.

## Technical debt

- Выбор A, отменённый при выходе, не доезжает до users/{A}; локально он сохранён и уйдёт при следующем изменении под A.

## Verification

`tests/push_prefs_coalesce.test.ts` (прежнее поведение), новый `tests/push_prefs_owner_guard.test.ts`: тумблер → смена поколения
до 1,5 с → записи нет; запись начата → смена поколения → `set` не вызван.

## Rollback

`git revert`.
