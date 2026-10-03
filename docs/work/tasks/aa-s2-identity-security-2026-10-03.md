# Task packet: Account Authority 2.0 — этап S2: личность, безопасность сервера, nonce M-1

Governance-ID: TG-B6CFE068FEC1
Status: Planned (после S1)
Owner: Claude session (Account Authority 2.0)

## Решения (по правилу координатора — рекомендованные, записаны в INBOX §AA-1; ждут подтверждения, не блокируют)
- D-AA1 accountId существующих аккаунтов = их существующий stableId (canonicalStableId); новый `acct-<uuid>` — только для действительно новых аккаунтов. Связь фиксируется на сервере при первом acquire (идемпотентно).
- D-AA2 прогресс гостя при первом входе переносится в аккаунт (через существующее слияние, защищённое nonce M-1).
- D-AA3 клиент 1.6.24 продолжает legacy-путь без аренды; сервер отвергает его запись в preserved-домены только после включения cutover-флага; до того — совместимо.
- D-AA4 серверные записи аренды/привязки: 90 дней после последнего использования (TTL) + удаление вместе с аккаунтом; политика — этап S10.

## Outcome

**S2a — сервер (`functions/src/account_authority/*`, security-ревью обязательно):**
1. Отказ анонимным (`sign_in_provider === 'anonymous'`) в installation binding и lease acquire — `permission-denied` с безопасным кодом.
2. Лимит привязок на uid (например ≤ 5 активных) + троттлинг частоты (не чаще N/мин на uid через счётчик в документе principal) → `resource-exhausted`.
3. Проверка привязки внутри транзакции аренды (одна транзакция вместо двух → минус 2–4 чтения на вход, нет окна отзыва).
4. Различимые коды отказа: `binding_mismatch`/`binding_missing` (окончательные) vs `unavailable` (повторяемый); `invalid_input` → `invalid-argument`.
5. Формат sessionId — строго `session-<uuidv4>`; иное → `invalid-argument` до обращения к Firestore.
6. D-AA1: сопоставление существующего stableId → accountId (без нового uuid) — идемпотентно, проверка владения через auth_links/текущий uid.
7. Сырой Firebase uid в `account_authority_principals_v1`/аренде/квитанциях — оставить минимально необходимое, остальное хешировать; TTL-поле `expireAt` для D-AA4 (правила/TTL-политика — S3).

**S2b — клиент:**
8. Транспорт различает окончательные и повторяемые отказы; при `binding_mismatch` сбрасывает привязку; привязка хранится по uid (ключ с хешем uid), а не одна на установку → смена A→B не зацикливается.
9. M-1 nonce по контракту `docs/work/tasks/account-v2-client-anon-merge-nonce-contract-2026-10-03.md`: `stampAnonOwnershipBeforeSignIn` с `nonceRequested: true`; nonce только в памяти процесса, по stableId, ≤10 мин; `anonMergeNonce` в `authEnsureStableLink` и в `mergeStableAccountsViaServer` (`app/cloud_sync.ts`); стереть после merge/relink/отмены; нигде не логировать/не сохранять. Ответ без `mergeNonce` (старый сервер) → работать без nonce.
10. `runAccountAuthorityCredentialSignIn` — не возвращать сырой текст ошибки Firebase (только код).
11. Логи на каждом ветвлении (через логгер S1), без nonce/uid/токенов.

## Scope
Файлы AA (клиент/сервер), `app/auth_provider.ts` (только stamp/ensureLink/nonce и AA-хунки), `app/cloud_sync.ts` (только вызов merge), тесты. Чужие незакоммиченные хунки не трогать. Out of scope: выкладка (по команде координатора после security-ревью), включение флагов.

## Architecture
Сервер — единственный источник решения о личности/аренде; клиент — тонкий, различает коды; nonce — секрет сессии входа в памяти.

## Security and privacy
Security-ревью перед коммитом серверной части. Nonce не логировать. Новые серверные поля (expireAt, хеши) — отразить в политике на S10.

## Technical debt
Legacy-путь метки без nonce живёт до min_app_version 2.0 (контракт Ядра).

## Verification
Тесты на каждый пункт (аноним отклонён; лимит/троттлинг; отзыв привязки между шагами не выдаёт аренду; коды; sessionId; D-AA1 существующий аккаунт открывает свою область; A→B на одном устройстве без зацикливания; nonce уходит в оба вызова для того же stableId, не попадает в хранилище/логи, стирается; без nonce от старого сервера — работает); мутации; тайпчек; security-ревью; совместимость 1.6.24 (сервер принимает старые вызовы legacy-пути).

## Rollback
git revert; серверную часть откатывает координатор (функции не выложены до решения).
