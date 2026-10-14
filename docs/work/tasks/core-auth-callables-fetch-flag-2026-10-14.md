# Task packet: вызовы пути входа (ensureLink / stamp / merge) через fetch с ID-токеном — ПОД ФЛАГОМ (по умолчанию выкл)

Governance-ID: TG-B4D491B7080C
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: ACC-SPEED, прогон №5 (однопоточная очередь RNFirebase functions), решение координатора 14.10 (пункт 2)

## Outcome

Под флагом `auth_callables_fetch_v1` (remote_config_cache_v1.bools, по умолчанию выкл; dev — EXPO_PUBLIC_AUTH_CALLABLES_FETCH=1)
вызовы authEnsureStableLink, authStampAnonOwnership, authMergeStableAccounts идут обычным fetch на адрес callable с
Authorization: Bearer <ID-токен> — мимо однопоточной очереди RNFirebase (firebase.json pool_size 0, инвариант утечки потоков
не трогаем). Решение включать — по цифрам прогона №6 (если вызовы входа всё ещё стоят за стартовыми ensure).

## Scope

In scope: новый `app/auth_callable_fetch.ts` (вызов по протоколу callable, разбор ответа и ошибок, флаг, логи [AUTH-FETCH]),
точечная обёртка трёх мест: `app/cloud_sync.ts` (ensureLink, merge), `app/auth_provider.ts` (stamp); тест.
Out of scope: остальные callable приложения; патч RNFirebase (бэклог после R1).

## Architecture

Протокол callable: POST {data} → {result} | {error:{status,message,details}}. Ошибка превращается в объект с code
(`functions/<status-kebab>`), message, details — существующие классификаторы (classifyCloudAccessFailure, accountAuthorityErrorCode)
читают его как раньше. Откат на нативный вызов — ТОЛЬКО если запрос гарантированно не ушёл (флаг выключен, нет токена /
projectId / fetch, ошибка до отправки). Ушёл и упал (сеть, таймаут, ответ) — ошибка наверх, без повтора: для merge/stamp повтор
мог бы выполнить операцию дважды. Таймаут — тот же, что у вызывающего (withTimeout снаружи + AbortController внутри).

## Security and privacy

ID-токен уходит только на наш адрес функций по https — так же, как его шлёт SDK. В логах — имя функции, исход, код, мс;
без токена, uid и данных. App Check не используется (пломба).

## Technical debt

Contain: флаг выключен — поведение прежнее. После решения по №6/№7 — либо включить, либо снять код.

## Verification

Тесты: флаг выкл → нативный путь, fetch не зовётся; флаг вкл → Bearer-токен, тело {data}, разбор {result}; ошибка сервера →
code/message/details как у SDK; нет токена → нативный путь (запрос не ушёл); сеть упала после отправки → ошибка наверх без
нативного повтора; таймаут → abort. Существующие тесты входа и синхронизации зелёные. Типы.

## Rollback

Флаг выключен по умолчанию; снять три обёртки — вызовы снова только нативные.

## Журнал

- 14.10 22:05 — App Check (вопрос координатора перед №7): сервер не требует — authEnsureStableLink / authStampAnonOwnership /
  authMergeStableAccounts на HOT_CALLABLE_OPTIONS с enforceAppCheck: ENFORCE_APP_CHECK = false (пломба владельца 17.08,
  functions/src/callable_options.ts, сторож app_check_sealed.test.ts); клиент модуля @react-native-firebase/app-check не имеет
  (снят 01.10) — нативный callable заголовок X-Firebase-AppCheck не шлёт. fetch без него = то же, что натив: под флагом вход
  по App Check не ломается.

