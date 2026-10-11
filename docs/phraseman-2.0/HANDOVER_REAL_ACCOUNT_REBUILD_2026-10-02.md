# PhraseMan 2.0 — настоящий handover по переделке аккаунтов

Дата: 2026-10-02  
Репозиторий: `C:\appsprojects\phraseman`

## Главная задача простыми словами

Не добавлять очередной слой исправлений к старой системе. Нужно один раз заменить старую систему аккаунтов новой единой authority, которая реально используется приложением:

- аккаунт владеет только серверным `accountId`;
- Firebase UID, provider subject, installation/device ID, session ID и operation ID — разные сущности;
- на аккаунте одновременно работает только одно устройство;
- вход на новом устройстве автоматически отзывает старое устройство;
- выход закрывает локальную сессию сразу;
- удаление аккаунта мгновенно чистит локальные данные и сразу освобождает email/provider identity, а удалённая очистка выполняется отдельно и повторяемо;
- сохраняются только нужные данные PhraseMan 2.0: аккаунты, прогресс уроков, сохранённые карточки/SRS и membership/tombstones карточек. Старые XP, лиги, арена, season pass и прочие удалённые системы не переносятся.

## Что сейчас НЕ является выполненной задачей

Следующие вещи уже частично существуют, но это только контракты/source gates, а не готовая система:

- `modules/account-authority-v2/*` — IDs, reducer, runtime и local-store contracts;
- `functions/src/account_authority/*` — pure lease/delete contracts;
- installation-binding contract и default-off callable;
- callable boundary и source guards;
- migration compatibility/preserved-domain contracts;
- тесты и независимые ревью отдельных пакетов.

Нельзя выдавать это за готовую переделку. В production authority всё ещё остаётся legacy-путь.

## Фактическая проблема в текущем коде

Глобальный cutover всё ещё выключен:

- `app/accounts_v2_client_flag.ts` содержит `ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED = false`;
- `app/auth_provider.ts` всё ещё владеет логикой `stable_id`, `auth_links`, `ensureAnonUser`, merge/swap и старого Firebase flow;
- `app/_layout.tsx` всё ещё вызывает `ensureAnonUser` и startup stable-id flow;
- `app/cloud_sync.ts` всё ещё принимает ownership-решения, пишет legacy state и зависит от `stable_id`/`auth_links`;
- Account Authority bootstrap с реальными app adapters не установлен как единственный runtime authority;
- lease/binding callables не подключены к рабочему клиентскому sign-in flow;
- release/delete/revocation не являются end-to-end production путём.

Именно это сейчас нужно исправлять. Не продолжать бесконечно добавлять изолированные контракты, если они не подключаются к app runtime.

## Настоящий порядок работы

### 1. Сначала production composition в приложении

Подключить реальные adapters в bootstrap:

- installation ID и secure binding-token store;
- Account Authority local store;
- provider adapter только для получения credential/sign-out;
- lease transport;
- scope open/close и preserved-domain storage;
- provider identity release/delete adapter.

Bootstrap должен быть one-shot, fail-closed и установлен до первого account-dependent экрана. Нельзя оставлять silent fallback на legacy.

### 2. Затем заменить `auth_provider.ts`

Оставить в нём только UI/provider credential adapter. Удалить из ownership flow:

- `stable_id` как account owner;
- `auth_links` lookup/merge/swap;
- `ensureAnonUser` как способ создать рабочую account identity;
- auto-merge по старым reward/XP;
- прямое управление локальным scope и cloud sync.

Sign-in, sign-out, account switch, takeover и delete должны вызываться через одну Account Authority FIFO queue.

### 3. Затем обезвластить `cloud_sync.ts`

`cloud_sync` должен стать только транспортом сохранённых доменов с явными аргументами `accountId + generation + session/lease fence`.

Он не должен решать:

- кто владелец аккаунта;
- какой `stable_id` выбрать;
- делать ли merge;
- можно ли открыть scope;
- когда считать пользователя вошедшим/вышедшим.

### 4. Серверные callables подключить end-to-end

Нужны реальные callable paths для:

- installation binding;
- lease acquire/renew;
- автоматического takeover с отзывом старого устройства;
- release/sign-out;
- provider identity release;
- delete request/status и асинхронного purge.

Клиентский `deviceId`, `accountId`, `sessionId`, `stable_id` или `auth_time` не могут быть доказательством устройства/владельца.

### 5. Удалить старую ownership-логику

После интеграционных gates удалить или изолировать legacy writers и экраны, а не просто добавить guard-тесты. Оставить только временный read-only compatibility adapter для миграции сохранённых карточек и прогресса.

### 6. Миграция и release gates

До включения cutover обязательно доказать:

- первый вход с существующими карточками и прогрессом;
- вход на втором устройстве: старое автоматически закрывается;
- offline/reconnect и повторяемость операций;
- sign-out без зависания UI;
- delete local-first и повтор delete;
- старый клиент не может снова писать legacy ownership state;
- emulator/device gates, backup/restore, rules/indexes/functions integration.

## Что считать готовым

Работа готова только если приложение в обычном запуске действительно использует новую authority, а не если отдельно зелёные тесты контрактов. Должно быть подтверждено:

1. В app startup установлен реальный Account Authority bootstrap.
2. Ни один экран/feature не принимает account ownership decisions через `stable_id`, `auth_links` или legacy auth flow.
3. Sign-in/sign-out/takeover/delete проходят через один serialized runtime.
4. Сохранённые карточки/SRS и прогресс уроков не теряются.
5. Старое устройство автоматически теряет lease и закрывает локальный scope.
6. Delete сразу очищает локальный scope и освобождает provider identity; remote purge не блокирует UI.
7. Cutover включается только после emulator/device/backup/rollback evidence.

## Жёсткое правило для следующей сессии

Если предлагается ещё один «контракт», «аудит» или «guard», сначала показать, какой реальный app/server runtime path он подключает. Если он не приближает замену `auth_provider.ts`/`cloud_sync.ts`/startup legacy authority — это не основная работа и её нельзя выдавать за прогресс переделки аккаунтов.

## Ограничения

Не делать deploy, production migration, Firestore purge, real-user deletion, device/EAS run или commit/push без отдельной команды владельца. Не использовать project OpenAI API key для Codex.

## Текущее состояние этого handover (после 2026-10-02 integration slice)

Добавлен первый реальный app-wiring slice:

- `modules/account-session-v2/account_authority_production_adapter.ts` создаёт dedicated installation identity, durable authority metadata, native SQLCipher scope adapter и dedicated lease-revision storage;
- `modules/account-session-v2/accounts_v2_client_runtime.ts` получил production bootstrap install seam;
- `app/accounts_v2_client_flag.ts` вызывает bootstrap только когда явно включён `accounts_v2_client_enabled` или global cutover, поэтому при обоих выключенных флагах native/SecureStore работа не запускается;
- `tests/account_authority_app_integration.test.ts`: focused suite `9/9 PASS`; scoped ESLint и diff-check PASS.

Этот slice **не является готовой системой аккаунтов**. Незакрытые P1:

- clean-install binding token ещё не выдаётся/не передаётся в lease acquire;
- отсутствующая durable revision пока fail-closed, поэтому первый lease на чистой установке не приобретается;
- release/delete transports не подключены;
- `clearAccountData` остаётся явным `account_authority_local_delete_not_wired` blocker;
- operation ledger имеет лимит 512 без доказанного retention/pruning;
- startup cutover barrier и emulator/device gates не закрыты;
- global cutover остаётся `false`.

Не считать текущие зелёные focused tests доказательством полной переделки. Следующий исполнитель должен сначала закрыть clean-install binding/lease path, затем release/delete/local-first deletion, затем migration/device gates.

### Clean-install binding/first-lease packet (implemented, independent review pending)

- Client lease transport now sends exact `{ operationId, expectedRevision, bindingToken }` and accepts `expectedRevision: null` only for explicit server-serialized initial bootstrap.
- Installation binding writes a hashed token index, deletes the previous token index atomically on rotation, and the resolver verifies token hash, current record, auth UID hash and revocation before deriving the server device binding.
- `auth_time`, client `deviceId`, client `accountId` and `stable_id` are not accepted as installation proof.
- Client stores only the opaque binding token/device-binding metadata in dedicated Account Authority SecureStore keys; unknown/malformed/revoked binding and missing revision fail closed.
- Writer evidence: Functions 4 suites/38 tests PASS; client 2 suites/22 tests PASS; Functions TypeScript and scoped ESLint PASS; no deploy/emulator/device.

This packet is still **not production-ready** until fresh independent review passes. Release/delete transports, synchronous local deletion, operation retention/pruning, startup barrier and cutover gates remain open.

### Restart/replay hardening (implemented, independent review PASS)

The response-loss/restart P1 is closed at source level: the dedicated binding credential store now reads the persisted opaque token and device binding from device-only SecureStore, and a new transport instance reuses them instead of rotating the binding. A focused regression proves the same `operationId` with `expectedRevision: null` replays idempotently after response loss and does not create a second binding rotation.

Fresh review: **PASS, no P0/P1/P2 findings**. Independent evidence: client/bootstrap focused gates `4 suites / 47 tests PASS`; server callable/binding/replay gates `3 suites / 26 tests PASS`; no deploy/device/full suite.

Still open and intentionally fail-closed: release callable, delete callable, synchronous local clear, durable operation pruning, startup barrier, emulator/device/backup/rollback gates, and owner-authorized cutover.
