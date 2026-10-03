# Контракт для клиента: одноразовый nonce метки anon_merge_claim (M-1 / HIGH-1)

Governance-ID: TG-4C1F2E8260DF
Status: Ready for Account V2 (встроить в Authority 2.0)
Owner: Account V2 (клиент); сервер — Ядро (пакет docs/work/tasks/core-m1-anon-merge-claim-nonce-2026-10-03.md)

## Outcome
Клиент 2.0 получает nonce при постановке метки и предъявляет его в КАЖДОМ вызове, где метка открывает доступ к анонимному аккаунту. Только тогда защита M-1/HIGH-1 действует без legacy-пути.

## Scope (клиент)
1. `app/auth_provider.ts` → `stampAnonOwnershipBeforeSignIn` (~:193-205): вызов `authStampAnonOwnership({ stableId, nonceRequested: true })`; из ответа взять `mergeNonce: string` (отсутствует — сервер старый → работать без nonce).
2. Хранить nonce ТОЛЬКО в памяти процесса (переменная модуля/Authority), привязанным к `stableId`, на время одного входа (≤ 10 мин). Не писать в AsyncStorage/SecureStore/логи/Crashlytics/аналитику. После успешного merge/relink или отмены входа — стереть.
3. `authEnsureStableLink` (после signInWithCredential) — добавить `anonMergeNonce: <nonce>` в data, если nonce есть для запрашиваемого stableId.
4. `app/cloud_sync.ts` → вызов `authMergeStableAccounts` (~:2375-2377, `mergeStableAccountsViaServer`): добавить `anonMergeNonce: <nonce>` в `{ stableIdA, stableIdB }`.
5. Ответ stamp без флага не меняется (`{ok, stableUid}`) — старый код не ломается.

## Сервер (уже/скоро на проде)
- stamp `{stableId, nonceRequested:true}` → `{ok, stableUid, mergeNonce}`; на документе только sha256.
- merge / ensureStableLink: `anonMergeNonce` — строка 1..128; неверный/отсутствующий при метке с хэшем → `permission-denied` `stable_id_mismatch` (тот же код, что сейчас).
- Метка без хэша (клиент 1.6.24) — legacy-путь: только провайдерский вызывающий, вошедший ПОСЛЕ метки; выключатель `ANON_MERGE_CLAIM_LEGACY_PATH_ENABLED`.

## Architecture
Сервер выдаёт секрет, клиент держит его в памяти между stamp и merge. Новых запросов нет.

## Security and privacy
Nonce — секрет уровня сессии входа: не логировать, не сохранять на диск. Новых персональных данных нет.

## Technical debt
Legacy-путь живёт до min_app_version 2.0 (план релиза: min_app_version 2.0 → ~7 дней нулевых `[ANON-MERGE-CLAIM] legacy_path` → довести outbox без хэша → выключить выключатель деплоем).

## Verification
Клиентские тесты: stamp просит nonce; nonce уходит в ensureLink и merge для того же stableId; не попадает в хранилище/логи; стирается после входа. E2E на эмуляторе: вход Google на аккаунт, уже привязанный к другому устройству → слияние проходит, в логах сервера `nonce_ok`, не `legacy_path`.

## Rollback
Клиент без nonce продолжает работать legacy-путём, пока выключатель включён.
