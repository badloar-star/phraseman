# Task packet: Account Authority 2.0 — этап S0: починить сборку и сохранить работу в git

Governance-ID: TG-BE71B0A37FAA
Status: In progress
Owner: Claude session (Account Authority 2.0 — единственная задача, поручение координатора/владельца)

## Outcome

По сверке `docs/work/tasks/aa0-account-authority-reconciliation-2026-10-03.md`:
1. Доделать прерванную переделку интерфейсов `modules/account-authority-v2/account_authority_lease_transport.ts`: в `modules/account-session-v2/account_authority_production_adapter.ts:584` реализовать `readLease/bindLease/writeLease` (TS2739) через существующее локальное хранилище; в `tests/account_authority_app_integration.test.ts` дописать `readPersisted` в моки (2×TS2741). Тайпчек затронутых файлов — 0 ошибок.
2. Вернуть `tests/account_authority_auth_provider_bridge.test.ts` 8/8 (сейчас 0/8 из-за загрузки модуля) — сначала логи/диагностика причины, потом правка.
3. Немые/подменяющие catch: `account_authority_production_adapter.ts:525` (`.catch(() => undefined)`), `account_authority_lease_transport.ts:286`, `functions/src/account_authority/installation_binding_callable.ts:236` (временный сбой Firestore превращается в «отклонено» — должен быть отдельный retryable-код). Каждый — с причиной в логе (`[ACCOUNT-AUTHORITY]`, без uid/секретов).
4. Сторож `tests/account_authority_legacy_callsite_guard.test.ts` (29/30, хеш `app/cloud_sync.ts`): заменить хрупкую проверку хеша файла на устойчивую (перепись/подсчёт вызовов владения), с `// зачем:`.
5. Прогнать ВСЕ `tests/account_authority_*` и `functions/src/account_authority/*` + `preserved_domains`/`compatibility` — все зелёные.
6. Подготовить коммит тремя частями (исполнитель НЕ коммитит; составь точные списки файлов/хунков): (а) клиентские чистые модули `modules/account-authority-v2/*` + `account_v2_auth_transition.ts` + их тесты; (б) серверные `functions/src/account_authority/*` (+ тесты) — экспорты в `functions/src/index.ts` ОТДЕЛЬНО (решение координатора о выкладке; до тех пор экспорты лучше держать вне HEAD или под явным флагом — предложи безопасный вариант, чтобы полная выкладка функций не создала callable); (в) проводка: `account_authority_production_adapter.ts`, `app/auth_provider.ts` (+66), `accounts_v2_client_runtime.ts` (+244, включая 2 строки 8F callMigrate/callPull), `account_v2_client_session.ts` (+2).

## Scope

Только перечисленное. Поведение при выключенных флагах не менять. Out of scope: логи по всем модулям (S1), решения S2, удаление/вытеснение (S3/S4), миграция (S5).

## Architecture

Без изменений архитектуры плана; доводка до компилируемого и зелёного состояния.

## Security and privacy

Вход/аккаунты — каждая часть коммита пройдёт независимое ревью; серверная часть — security-ревью. Логи без uid/токенов. App Check не включать.

## Technical debt

Accept temporarily: логи в остальных модулях — S1.

## Verification

Тайпчек затронутых файлов 0 ошибок; все тесты AA зелёные (по одному файлу, через светофор); мутации на починенные места (немые catch, retryable-код); `git diff` по чужим хункам пуст (их сейчас нет — вся работа AA передана мне).

## Rollback

git revert по частям; бэкап `.tmp_aa_s0_backup/`.

## Итог исполнителя (2026-10-03)

Git-записей не было, выкладки не было, прод не трогали. Тяжёлые прогоны шли под слотом светофора
«AA S0 tests», слот отдан. Оригиналы до правок лежат в `.tmp_aa_s0_backup/` (папка в `.gitignore`
через `.tmp_*`). Концы строк сохранены: все затронутые файлы остались в LF.

### 1. Сборка (TS2739 / 2×TS2741) — исправлено
- `modules/account-session-v2/account_authority_production_adapter.ts`: в
  `createAccountAuthoritySecureRevisionStore` добавлены `readLease`, `bindLease` и `writeLease`.
  Хранилище то же: SecureStore с флагом `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`. Запись аренды лежит
  под ключом `phraseman.account_authority.lease_owner_revision.v1.<sha256(owner)>` и содержит
  `{schemaVersion, ownerHash, uidHash, revision}`. Сырые uid, accountId и sessionId на диск не
  попадают. `bindLease` пишет ревизию UID и запись аренды. `writeLease` (после release) сдвигает
  обе, иначе следующий acquire того же UID ушёл бы со старым `expectedRevision`. Каждая запись
  проверяется чтением обратно. Отсутствующая или битая запись даёт закрытый отказ
  `account_authority_lease_revision_unavailable`.
- `tests/account_authority_app_integration.test.ts`: в оба мока добавлен `readPersisted`. Новые
  тесты: аренда (bind → read → release, ревизия UID идёт в ногу с арендой, сырых id на диске нет),
  битая запись аренды, лог компенсирующего закрытия.
- Тайпчек затронутых файлов (временный tsconfig в scratchpad; клиент: 7 модулей AA, адаптер,
  transition, runtime, client_session, auth_provider, client_flag, все `tests/account_authority_*`;
  functions: `account_authority/*` и `accounts_v2_migration/*`) — **0 ошибок**. ESLint по
  затронутым клиентским файлам — 0.

### 2. bridge 0/8 — причина найдена через лог, исправлено
Временная трассировка `[ACCOUNT-AUTHORITY][DIAG]` вокруг `require(accounts_v2_client_runtime)`
показала, что `require` бросает ts-jest `TSError` с `diagnosticCodes=[2739]`
(`account_authority_production_adapter.ts:584`) и **пустым stack**. Поэтому jest и печатал пустые
сообщения. Корень — пункт 1. Трассировку убрал: файл восстановлен из бэкапа байт-в-байт (`cmp`) и
не изменён. После пункта 1 — **8/8**.

### 3. Немые и подменяющие catch
- `account_authority_production_adapter.ts` (бывш. :525): вместо `.catch(() => undefined)` теперь
  `try/catch` с логами `[ACCOUNT-AUTHORITY] local_store open_scope_metadata_failed` и
  `open_scope_compensation_close_failed kind=… code=…`. Наружу, как и раньше, уходит исходная
  ошибка открытия.
- `account_authority_lease_transport.ts` (бывш. :286): лог
  `[ACCOUNT-AUTHORITY] installation_binding obtain_failed kind=… code=…`. Наружу, как и раньше,
  `account_authority_installation_binding_unavailable`.
- `functions/src/account_authority/installation_binding_callable.ts` (бывш. :236): каждая ветка
  отказа пишет `resolve_rejected {reason}`, где reason — `token_malformed`, `token_unknown`,
  `binding_missing`, `binding_mismatch` или `record_invalid`. Любой другой сбой (Firestore
  contention, deadline, сеть) теперь даёт **отдельный повторяемый код** `unavailable` /
  `account_authority_installation_binding_unavailable` с логом
  `resolve_unavailable {kind, code}`. Для этого в `AccountAuthorityCallableErrorCode`
  (`callable_boundary.ts`) добавлен `'unavailable'`. Клиент `mapAcquireFailure` и так сводит его к
  повторяемому `account_authority_lease_unavailable`.
- В логи попадают только вид ошибки и безопасный код (свой `account_authority_*`, код адаптера,
  числовой gRPC-код). Текста чужой ошибки, uid, токенов и хешей там нет — это проверено тестами.

### 4. Сторож legacy_callsite_guard — переведён на перепись
Хеш структурного пути (порядковые номера узлов) заменён переписью `вид:имя → количество`
(`call:getStableId: 11`, `import:./stable_id: 1`, …) плюс счётчики `occurrences` и `imports`.
Постороннюю правку перепись пропускает, новый, удалённый или переименованный вызов владения ловит.
Это доказывает новый тест «census ignores unrelated edits but catches a new ownership call». Рядом
стоит `// зачем:`. Синтетические тесты чувствительности самой функции к перемещениям оставлены.
Итог — **31/31** (было 29/30). Значения переписи сняты с текущего дерева; счётчики совпали с
прежним пином (cloud_sync 70/2), то есть сдвиг был только в хеше.

### 5. Прогоны (по одному файлу, текст вывода прочитан)
Клиент: app_integration 18/18, auth_provider_bridge 8/8, auth_provider_wiring 8/8,
bootstrap_contract 10/10, contract 25/25, lease_transport 18/18, legacy_callsite_guard 31/31,
reducer 9/9, runtime 49/49, account_v2_auth_transition_v2 19/19, accounts_v2_client_wiring_v2 19/19.
Functions: callable_boundary 16/16, delete_contract 19/19, firebase_lease_callable 8/8,
installation_binding_callable 13/13, installation_binding_contract 12/12, lease_contract 11/11,
preserved_domains 21/21, compatibility 23/23, no_network 28/28.

**Мутации.** Каждая внесена скриптом, файл затем восстановлен из копии и сверен `cmp` байт-в-байт:
- m1: вернуть немой `.catch(() => undefined)` в адаптер → app_integration 1 FAIL;
- m2: убрать лог в transport → lease_transport 1 FAIL;
- m3: вернуть «всё = отклонено» в binding resolve → installation_binding_callable 1 FAIL;
- m4: `writeLease` перестаёт сдвигать ревизию UID → app_integration 1 FAIL;
- m5: перепись не считает вызовы → guard 2 FAIL;
- m6: убрать `'unavailable'` из кодов → набор не компилируется (ts-jest), FAIL.

Все 6 мутантов убиты.

### Экспорты в `functions/src/index.ts` — решение
6 строк экспорта трёх callable **убраны**, `index.ts` снова совпадает с HEAD (`git diff` пуст).
Код callable с захардкоженным `rolloutEnabled: false` остался. Сторожа в
`firebase_lease_callable.test.ts` и `installation_binding_callable.test.ts` перевёрнуты: теперь
они требуют, чтобы экспорта **не было** (с `// зачем:`).

Почему так, а не флаг сборки. Firebase CLI создаёт функцию по любому экспортированному `onCall`,
и `rolloutEnabled: false` этому не мешает. Условный экспорт (`export const x = FLAG ? onCall() :
undefined`) зависит от того, как discovery обрабатывает `undefined`, и это хрупко. Отсутствие
экспорта — единственный вариант, при котором полная `firebase deploy --only functions` из любой
сессии гарантированно ничего не создаёт.

Когда координатор решит выкладывать, вернуть ровно эти строки после `accountsV2PullMine` и
перевернуть два сторожа:
```
// Account Authority 2.0: server-owned lease acquisition. Client cutover remains
// hardcoded off; this export alone does not switch production traffic.
export { accountAuthorityLeaseAcquire, accountAuthorityLeaseRelease } from "./account_authority/firebase_lease_callable";
// Account Authority 2.0: server-issued installation binding bootstrap. The
// callable is exported with its server rollout gate hardcoded off.
export { accountAuthorityInstallationBindingCreate } from "./account_authority/installation_binding_callable";
```

### 6. Разбивка коммита (исполнитель НЕ коммитил)
⚠️ В общем индексе сейчас **чужие** staged-файлы (52 файла). Коммитить только с явными путями:
`git commit --only -- <пути>`, иначе чужое уедет в коммит. Некоторые файлы AA помечены как
intent-to-add (` A`), и `--only` их заберёт. Порядок обязателен: **А → Б1 → Б2 → В**. Сторож
legacy_callsite_guard (в В) читает файлы из Б1/Б2, а тесты в В читают `accounts_v2_client_flag.ts`.

**А — чистые клиентские модули** (все файлы целиком, все новые):
- `modules/account-authority-v2/account_authority_ids.ts`
- `modules/account-authority-v2/account_authority_contract.ts`
- `modules/account-authority-v2/account_authority_reducer.ts`
- `modules/account-authority-v2/account_authority_runtime.ts`
- `modules/account-authority-v2/account_authority_local_store.ts`
- `modules/account-authority-v2/account_authority_bootstrap_contract.ts`
- `modules/account-authority-v2/account_authority_lease_transport.ts`
- `modules/account-session-v2/account_v2_auth_transition.ts`
- `tests/account_authority_contract.test.ts`, `tests/account_authority_reducer.test.ts`,
  `tests/account_authority_runtime.test.ts`, `tests/account_authority_lease_transport.test.ts`

Перенесены в В, хотя по смыслу «чистые»: `tests/account_authority_bootstrap_contract.test.ts` (читает
`app/accounts_v2_client_flag.ts`) и `tests/account_v2_auth_transition_v2.test.ts` (грузит
`accounts_v2_client_runtime`). Иначе коммит А красный сам по себе.

**Б1 — серверный AA, без экспорта** (папка целиком, все файлы новые):
- `functions/src/account_authority/` — callable_boundary(.test), delete_contract(.test),
  firebase_lease_callable(.test), installation_binding_callable(.test),
  installation_binding_contract(.test), lease_contract(.test), lease_handlers.ts
- `functions/src/index.ts` — **не входит**, изменений нет.

**Б2 — политика миграции** (файлы целиком):
- `functions/src/accounts_v2_migration/preserved_domains.ts`, `preserved_domains.test.ts` (новые)
- `functions/src/accounts_v2_migration/compatibility.ts`, `compatibility.test.ts`,
  `no_network.test.ts` (M)

Здесь две оговорки. `preserved_domains.ts` использует `blockingReasons` из новой
`compatibility.ts`, поэтому разделять их нельзя. А по содержанию правки `compatibility` и
`no_network` (`backup_manifest`) похожи на хвост PM-235/237 (E23 M5), а не на AA. Координатору
стоит подтвердить, что эти хунки не держит другая сессия. Сверка AA-0 ошибочно считала
`preserved_domains` закоммиченным в 6632921d2: он не отслеживается git (`??`).

**В — проводка**:
- `modules/account-session-v2/account_authority_production_adapter.ts` (новый, с правками S0)
- `modules/account-session-v2/accounts_v2_client_runtime.ts` — все 9 хунков, включая 8F: импорт
  `withAccountsV2ClientVersion` (@@ -20,0 +28) и `callMigrate`/`callPull` (@@ -126 +305, @@ -128
  +308). `account_v2_client_version.ts` уже в HEAD.
- `modules/account-session-v2/account_v2_client_session.ts` — 2 хунка (`hydrationArmed`)
- `app/auth_provider.ts` — 5 хунков, все AA: импорт (@@ -62,0 +63), `rejectRecoveryProviderMismatch`
  (@@ -1804), `runAccountAuthorityCredentialSignIn` (@@ -1839,0 +1845,52), `signInWithProvider`
  (@@ -1895), `signOutCurrentProvider` (@@ -3799,0 +3860)
- `app/accounts_v2_client_flag.ts` — **в пакете не перечислен, но обязателен**: `auth_provider.ts`
  импортирует из него `runAccountAuthorityProvider*Transition`. Все хунки — AA и V2-transition.
- тесты: `tests/account_authority_app_integration.test.ts`,
  `tests/account_authority_auth_provider_bridge.test.ts`,
  `tests/account_authority_auth_provider_wiring.test.ts`,
  `tests/account_authority_bootstrap_contract.test.ts`,
  `tests/account_authority_legacy_callsite_guard.test.ts`,
  `tests/account_v2_auth_transition_v2.test.ts`, `tests/accounts_v2_client_wiring_v2.test.ts` (M)

### Открыто и передано дальше
- Логи по остальным модулям — S1. Сюда входят `mapCallableError`, переупаковывающие catch в
  adapter, transport и boundary, и два catch в `auth_provider`.
- Аноним на сервере и rate-limit привязки — S2.
- Мутацию сторожа на настоящем `app/cloud_sync.ts` не делал: это чужой файл в общем дереве.
  Вместо неё синтетический тест на копии `account_switch_quarantine.ts` в памяти.
- Не проверял, нет ли трёх callable уже на проде (`functions:list` — обращение к проду, его
  запрещено трогать). Сверка AA-0 считает, что их там нет.
