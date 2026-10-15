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

## P24b (Ревизор после f1a883548, координатор 15.10 ~16:20)

Governance-ID: TG-196FAA7228A2

Тумблер пушей + «Выйти» раньше 1,5 с: отложенная запись отменялась (верно для гостя), но новое значение A так и не доходило до
users/{A} — при следующем входе приходило старое, сервер слал отключённые пуши. Правка: в начале `signOutAndWipeForAccountSwitch`
(app/auth_provider.ts, после проверки поколения A и ДО квеса/смены поколения) — `flushPendingServerPushPrefsBeforeOwnerChange()`
из push_token_registration: если в очереди есть запись или она в пути — досылаем с владельцем A и ждём не дольше 1,5 с; нет записи —
не ждём ничего (скорость выхода не страдает); не успели — `[PUSH-PREFS] flush_timeout`, выход идёт дальше, остаток отменит подписка
на смену поколения. Почему не в clearAccountPushBeforeSwitchSignOut: к этому шагу поколение уже сменено и P24 уже отменил запись.
Тест: тумблер → досылка перед выходом → set в документ A с новым значением; после смены поколения в гостя ничего. Окно 17:45.

Governance-ID: TG-5333B5F7F7D3

Уточнение координатора 16:25: (1) обычный «Выйти» и «Сменить аккаунт» в Настройках и смена в онбординге идут через ту же
`signOutAndWipeForAccountSwitch` — проверено grep, других путей выхода нет; (2) удаление аккаунта (`beginAccountDeletion`,
`handleAccountDeletedOnAnotherDevice`) идёт мимо этой функции — там досылки НЕТ, отложенная запись явно отменяется
(`cancelPendingServerPushPrefsForAccountDelete` → `[PUSH-PREFS] skip_delete`), тест «удаление → skip_delete, записи нет».
