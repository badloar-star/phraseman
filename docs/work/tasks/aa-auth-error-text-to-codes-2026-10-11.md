# Task packet: сырой текст ошибок входа/смены аккаунта → только код (аналитика и логи)

Governance-ID: TG-0AE4918142EE
Status: Planned
Owner: сессия «Авторизация» (Account V2), исполнитель Opus
Related epic/enabler: RELEASE_SLICE C; долг из ревью аудита двойного тапа (0dfe1c9c9, §AUTH-0150)

## Outcome
Ни одно событие аналитики (`logAuthEvent` → `logEvent`) и ни одна строка журнала в `app/auth_provider.ts` не несут сырой текст ошибки (`e.message`) — только нормализованный код (`identityErrorCode` из `app/identity_trace.ts`) и стадию. Текст ошибки Firebase/Google/Apple может содержать почту — в аналитику (сторонний сервис) он уйти не должен.

## Scope
In scope — `app/auth_provider.ts`, места (строки на 2026-10-11 ~01:30, сверить по файлу):
- вход: ~2435–2437 (`stage: 'native'`), ~2648–2650 (`stage: 'firebase'`), ~3210–3211 (`stage: 'swap'`, `errStr`);
- смена аккаунта/выход: ~3712, ~3759, ~3781, ~3830, ~3851 (`backupDetail`), ~3903–3904;
- удаление: ~4089 (`[AA-S4] delete:legacy_proof_skipped reason=`);
- ~930 (`const detail = …`) — проверить, куда идёт.
ВАЖНО: `detail` местами используется дальше в ЛОГИКЕ (сопоставление «отмена пользователем», `describeAuthError(detail)` для текста человеку, `reason` по подстроке). Логику и текст для человека НЕ ломать: менять только то, что уходит в `logAuthEvent`/`console.*`/поле `detail` результата, которое печатается. Если `detail` результата читают потребители (settings.tsx, AccountLogoutFlow.tsx, onboarding_account_switch_confirm.ts, RegistrationPromptModal.tsx) для решения или текста — сохранить смысл (код вместо текста допустим только если никто не парсит текст; найти grep'ом).
Out of scope: сервер, App Check, settings.tsx/cloud_sync.ts (чужие — только описать), UI-тексты.

## Architecture
Без изменения архитектуры: единый нормализатор `identityErrorCode(e)`; при необходимости — маленький помощник `authErrorTelemetry(e)` → `{ code }`.

## Security and privacy
Цель — убрать возможную почту/идентификаторы из сторонней аналитики и журналов. Новых данных нет. После правки проверить, что политика конфиденциальности не обещает обратного (аналитика ошибок без персональных данных — соответствует).

## Technical debt
Pay now: все перечисленные места. Сторож в тесте: в `auth_provider.ts` нет `logAuthEvent(…error: …message…)` и `String(e?.message ?? e)` в полях, уходящих в аналитику.

## Verification
Новый/дополненный тест (сторож по исходнику + поведенческий, где реально: ошибка с «почтой» в тексте → в `logEvent` и `console` её нет). По одному, со слотом: новый тест, `auth_provider_behavior`, `auth_provider_stable_link`, `aa_auth_double_tap_contract`, `aa_auth_switch_resume_throw`, `account_delete_flow_contract`, `registration_prompt_modal_lifecycle`. Ревью до APPROVE.

## Rollback
Отдельный коммит; `git revert`.

## Итог исполнителя

Status: Done (ждёт ревью и коммита координатором). Коммитов исполнитель не делал.

### Таблица мест (`app/auth_provider.ts`, строки до правки)
| Место | Куда уходил текст | В логике? | Стало |
|---|---|---|---|
| 930–932 `post-delete local wipe` | dev-журнал | нет | `identityErrorCode(e)` |
| 1008–1009 `phone_state_retire_threw` | dev-журнал | нет | код |
| 1289 `fresh_identity signout_failed` | console.warn | нет | код |
| 1733 `hasPlayServices failed` | dev-журнал | нет (throw ниже не тронут) | код |
| 1790 `runGoogleNativeSignIn: signIn threw` | dev-журнал | нет | код (найдено поведенческим тестом) |
| 2433–2437 вход `native` | `logAuthEvent` + dev-журнал | `errStr` — ДА (отмена/конфиг, `describeAuthError`) | в аналитику/журнал код; `errStr` с текстом оставлен |
| 2646–2650 вход `firebase` | `logAuthEvent` + dev-журнал | `errStr` — ДА | так же |
| 3209–3210 вход `swap` | `logAuthEvent` + dev-журнал | `errStr` — ДА | так же |
| 3293 `keep_local tail failed` | console.warn | нет | код |
| 3395 `bg:… FAIL` | console.warn | нет | код |
| 3428 `background refresh failed` | console.warn | нет | код |
| 3616 `signout:out reserve_failed` | console.warn | нет | код (свои коды замка проходят как есть) |
| 3712 no_cloud catch | `detail` результата | нет (потребители только печатают) | код |
| 3759, 3781 backup catch | `logAuthEvent` + `detail` + dev-журнал | нет | код |
| 3830, 3851 `backupDetail` | `logAuthEvent` + `detail` | только проверка на непустоту | код (всегда непустой) |
| 3902–3904 общий catch | `logAuthEvent` + `detail` + dev-журнал | нет | код |
| 4032 `prepare_threw` | console + DebugLogger critical | нет | код |
| 4069 `aa_failed` | console + DebugLogger critical | нет | код |
| 4089 `legacy_proof_skipped` | console.warn | нет | код |
| 4111 `bg_threw` | DebugLogger critical | нет | код |
| 4545 `ack_rejected_observed` | console.warn | нет | код |

Читатели `SignOutSwitchResult.detail`: `app/(tabs)/settings.tsx` — не читает; `components/account/AccountLogoutFlow.tsx` — печатает в журнал и DebugLogger; `app/onboarding_account_switch_confirm.ts` — не читает (только `reason`); `components/RegistrationPromptModal.tsx` (DEV-сброс) — кладёт в `Error`, который печатается кодом. Текст никто не разбирает → переведено на код. Свои коды приложения (`account_switch_backup_unavailable`, `generation_io`…) `identityErrorCode` пропускает как есть.

### Оставлено намеренно
- `errStr` / `result.error` входа — нужен вызывающему для логики и текста человеку.
- 1137, 4435, 4609 (`delete:anon_server… ack=failed reason=`) — текст ответа нашего сервера, строки пинены `aa_guest_server_delete` / `aa_guest_offline_delete_retry`; сторож разрешает ровно одну такую строку с `.message` в шаблоне.
- `captureAuthSignInFailure(errStr)` → `recordError` + `logAppError` (для `swap`/`guard` — critical → Firestore/Telegram): несёт сырой текст. Вне перечня пакета — предложение ниже.
- `DebugLogger.error('auth_provider:…', e)` в общих catch и прочие `__DEV__`-предупреждения с объектом ошибки (хранилище/Firestore) — вне пакета.

### Тесты
Новый `tests/aa_auth_error_codes_only.test.ts` (сторож по исходнику + 4 поведенческих, `__DEV__=true`). Обновлены 3 ожидания `detail` в `tests/auth_provider_behavior.test.ts` (текст → `error_without_code`). Прогон по одному: aa_auth_error_codes_only 7/7, auth_provider_behavior 110/110, auth_provider_stable_link 35/35, aa_auth_double_tap_contract 29/29, aa_auth_switch_resume_throw 2/2, account_delete_flow_contract 23/23, registration_prompt_modal_lifecycle 7/7, aa_guest_server_delete 12/12, aa_guest_offline_delete_retry 3/3, aa_s2c_logout_wipe_trace 5/5. Полная проверка типов не запускалась (мало памяти).
Governance-ID: TG-17B4F6788C5A — расширение: captureAuthSignInFailure / account_delete_guard_unavailable / anonymous_preparation_failed → код (Telegram/Firestore без текста ошибок).

## Итог доработки

Status: Done (TG-17B4F6788C5A), ждёт ревью/коммита координатором.

`captureAuthSignInFailure` → `recordError(new Error('auth_signin:<provider>:<stage>:<d>'))` (Crashlytics) + `logAppError('auth:signin_failure', new Error(d), { severity })`; `critical` (все стадии, кроме native/firebase/config и транзиентного auth_link) → Firestore + Telegram. Других подстановок текста внутри нет (теги — provider/stage).

`app/auth_provider.ts` (строки после правки):
- 2027–2037 — страховка `safeAuthFailureDetail`: detail проходит, если состоит только из `[a-z0-9_:./-]`; иначе безопасный префикс до «:» + `:redacted_text`. Проверка транзиента по-прежнему на сыром `detail` вызова (коды auth_link не меняются).
- 2465 native → `native_${identityErrorCode(e)}`; 2684 firebase → `firebase_${…}`; 3249 swap → `swap_${…}`. `errStr` с текстом оставлен для `return`/логики (APPLE_ANDROID_MISSING_SERVICE_ID, describeAuthError).
- 2371, 2697 `account_delete_guard_unavailable:${identityErrorCode(guardError)}` — префикс сохранён; `error` результата и так константа.
- 2483 `anonymous_preparation_failed:${identityErrorCode(error)}` — префикс сохранён; `error` результата константа.
- auth_link (`remote/local_stable_link_failed:${failure}`), config, `presync_…_backup_…` — уже коды, не тронуты.

Тесты: `tests/aa_auth_error_codes_only.test.ts` дополнен (11 тестов): сторож «captureAuthSignInFailure не получает errStr/.message/${detail}», поведенческие native (recordError = `auth_signin:google:native:native_DEVELOPER_ERROR`, в recordError/logAppError нет «@») и firebase (`auth/email-already-in-use`, нет «@»), страховка и транзиент — по регулярке из исходника (поведенческий путь auth_link в стенде уходит в `linked_pending`). Прогон по одному: aa_auth_error_codes_only 11/11, auth_provider_behavior 110/110, auth_provider_stable_link 35/35, aa_auth_double_tap_contract 29/29, aa_guest_server_delete 12/12, aa_release_floor_auth_ui 19/19. grep по tests: `captureAuthSignInFailure` — только auth_provider_stable_link (пин строки auth_link, не тронута); `account_delete_guard_unavailable`/`anonymous_preparation_failed` — пинов нет.
Governance-ID: TG-547B9EB63A66 — независимое ревью (код ошибок вместо текста) и коммит.
Governance-ID: TG-D4881BAD6899 — APPROVE ревью; коммит. Хвост ревью (M1 признак без кода, L1–L4 строгость сторожа) — следующим шагом.

## Хвост ревью (M1, L1, L3) — делает координирующая сессия
Governance-ID: TG-0AE4918142EE (прод.)
- M1: `identityErrorCode` (`app/identity_trace.ts`) — конечный числовой `code` → строка; ошибка без кода с нестандартным `name` (TypeError, RangeError…, только `[A-Za-z]{1,40}`) → `error_without_code:<name>`; обычный `Error` → прежний `error_without_code` (ожидания тестов и таблица отказов аварийной копии не меняются, незнакомый код там и так → not_uploaded). Текст сообщения по-прежнему не пропускается.
- L1: firebase-тест закрепляет стадию (`auth_signin:google:firebase:…`).
- L3: сторож logAuthEvent ловит `errStr`/`msg`.
- Проверка: aa_auth_error_codes_only, aa_s2c_user_cases_new_system, aa_s2d_presync_backup_refusal, auth_provider_behavior — по одному, со слотом; ревью.
Governance-ID: TG-3E309C6A1510 — APPROVE ревью хвоста; Number.isSafeInteger по замечанию L; коммит.
