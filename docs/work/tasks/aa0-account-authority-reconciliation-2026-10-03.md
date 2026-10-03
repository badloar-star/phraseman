Governance-ID: TG-836E747B097E

# AA-0 — Account Authority 2.0: честная сверка плана с кодом (2026-10-03)

Режим: только чтение. Никаких правок кода, git-записей и выкладки. Временный tsconfig и логи лежали в
scratchpad сессии, в репозиторий не попали. Тяжёлые прогоны шли под слотом светофора («AA audit»),
слот отдан.

Источники: `docs/superpowers/plans/2026-10-01-account-authority-2-0.md` (Tasks 1–8),
`docs/phraseman-2.0/INBOX_COORDINATOR_FROM_CORE.md` §AV2-23/§95/§AV2-24,
`docs/phraseman-2.0/HANDOVER_REAL_ACCOUNT_REBUILD_2026-10-02.md`, CLAUDE.md, AGENTS.md.

## 0. Короткий итог

| Статус | Кол-во (из 27 пунктов плана) |
|---|---|
| VERIFIED | 11 |
| PARTIAL | 10 |
| CLAIMED-BUT-MISSING | 1 |
| OPEN (и в плане не отмечено) | 5 |

В плане отмечено 22 из 27 пунктов. Подтвердились полностью 11. Ещё 11 отмеченных либо закрыты
только как чистый контракт без подключения к приложению, либо сейчас красные.

**Сборка сейчас красная** (последнюю правку делала прежняя сессия 2026-10-02 08:23, дальше она
обрывается на полпути):
- 3 ошибки TypeScript в затронутых файлах;
- 2 клиентских набора тестов падают, ещё один сторож красный из-за чужой правки `cloud_sync.ts`.

Флаг cutover действительно жёстко выключен (`false`, сторож это проверяет). Если выключены **оба**
флага (`accounts_v2_client_enabled` в «Пульте» тоже OFF), вход, выход, смена аккаунта и удаление
работают как раньше. Если же `accounts_v2_client_enabled` включён, поведение меняется уже сейчас,
хотя cutover выключен (подробно в §3).

Всё, что касается Account Authority, **не закоммичено**: около 12,4 тыс. строк, из них большая
часть вообще не отслеживается git (`??`), и лежит в общем дереве, где работают 10+ сессий.

## 1. Сверка по задачам плана

Обозначения: V = VERIFIED, P = PARTIAL, CBM = CLAIMED-BUT-MISSING, O = OPEN.

### Task 1 — типизированный контракт
| # | Пункт | Статус | Доказательство |
|---|---|---|---|
| 1.1 | RED-тесты branded ID / разделение Firebase UID и provider subject | V | `tests/account_authority_contract.test.ts` 25/25 PASS |
| 1.2 | Валидаторы, frozen-типы, отказ на пустом ID / traversal / смешении видов | V | `modules/account-authority-v2/account_authority_ids.ts` (122 строки), `account_authority_contract.ts` (216) |
| 1.3 | Jest + ESLint + ревью | V | Jest PASS, scoped ESLint 0 ошибок. Артефакта «независимого ревью» в репозитории нет, поэтому эту часть не проверить |

### Task 2 — чистый reducer
| # | Пункт | Статус | Доказательство |
|---|---|---|---|
| 2.1 | RED-тесты: boot, сессия, отмена, resume, takeover, sign-out, delete-local-first, stale generation | V | `tests/account_authority_reducer.test.ts` 9/9 PASS |
| 2.2 | Чистая функция без I/O и без выдуманного accountId | V | `account_authority_reducer.ts` (218 строк), импортов Firebase/React нет |
| 2.3 | Доказать детерминизм и неизменность при плохом переходе | P | 9 тестов на весь автомат — мало. Мутационного прогона нет, а планка владельца его требует |

### Task 3 — FIFO runtime и порты
| # | Пункт | Статус | Доказательство |
|---|---|---|---|
| 3.1 | Порты provider / lease / scope / clear / idempotency | V | `account_authority_runtime.ts` (1019), `account_authority_local_store.ts` (104) |
| 3.2 | Гонки A→B, очередь sign-out/sign-in, same-UID, revoked, offline retry, write-after-switch | V | `tests/account_authority_runtime.test.ts` 49/49 PASS |
| 3.3 | Одна FIFO-очередь с generation/fence; A закрыт до B | V | там же. Сейчас 49+9+25 = 83 теста, в плане заявлено 82 |
| 3.4 | Локальная очистка синхронна; remote повторяем по operationId | P | В ядре сделано. В боевой композиции `account_authority_production_adapter.ts:538-542` `clearAccountData` **бросает `account_authority_local_delete_not_wired`**. Журнал операций ограничен 512 записями (`MAX_DURABLE_OPERATIONS`), очистки старых записей нет: после 512 операций — `operation_store_full` |

### Task 4 — серверные lease и identity-release
| # | Пункт | Статус | Доказательство |
|---|---|---|---|
| 4.1 | Тесты: одна активная аренда, идемпотентное продление, вытеснение, stale, release identity, delete-idempotency | V | `functions/src/account_authority/lease_contract.test.ts` 11/11, `delete_contract.test.ts` 19/19 (=30, как в плане). Functions `tsc --noEmit` 0 ошибок |
| 4.2 | Сначала чистые обработчики, потом Firebase-адаптеры, требования к rules/indexes записаны в том же пакете | P | Адаптеры аренды и привязки установки есть: `firebase_lease_callable.ts`, `installation_binding_callable.ts`, тесты 8/8, 11/11, 12/12, 16/16 PASS. Порты удаления в `createFirebaseLeasePorts` **бросают `account_authority_delete_not_wired`**. В `firestore.rules` нет ни одной записи для новых коллекций (закрывает только общий catch-all на строке ~4029). Индексы и TTL нигде не описаны |
| 4.3 | Remote purge асинхронный и ограниченный | P | Есть только контракт (`delete_contract.ts`, 883 строки). Задачи purge, планировщика и callable удаления не существует |

### Task 5 — провайдерский вход через authority
| # | Пункт | Статус | Доказательство |
|---|---|---|---|
| 5.1 | RED-сторожа: провайдер не открывает и не закрывает scope мимо runtime | P | `tests/account_authority_auth_provider_wiring.test.ts` 8/8 PASS, но проверяет только текст исходника. Поведенческий набор `tests/account_authority_auth_provider_bridge.test.ts` **0/8 — все падают** (сообщение пустое; вероятная причина — ts-jest не компилирует `accounts_v2_client_runtime.ts` из-за TS2739 в production-адаптере, см. §2) |
| 5.2 | Sign-in, sign-out, switch, startup reauth через runtime | P | Подключено в `app/auth_provider.ts` и `app/accounts_v2_client_flag.ts`, но работает только при cutover ON. Заявленные «7 suites / 200 tests PASS» сейчас не воспроизводятся. Отдельной ветки «смена аккаунта» нет: это просто sign-out + sign-in. На одном устройстве она под cutover сломана (§4, R3) |
| 5.3 | Google/Apple — тонкий адаптер | V | `runAccountAuthorityCredentialSignIn` в `auth_provider.ts` (+52 строки) не трогает Firestore, stable_id и локальные данные. Но оба его `catch` ничего не пишут в лог |
| 5.4 | Глобальный флаг cutover OFF | V | `ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED = false`, сторож проверяет литерал `false` и затенение |

### Task 6 — миграция только сохраняемых доменов
| # | Пункт | Статус | Доказательство |
|---|---|---|---|
| 6.1 | Миграция переносит только уроки и карточки/SRS, остальное выбрасывает | CBM | Есть только политика: `functions/src/accounts_v2_migration/preserved_domains.ts` (21/21 PASS, закоммичено раньше, 6632921d2). Её **никто не импортирует**: ни `migrate_mine`, ни hydration, ни `cloud_sync`. `account_v2_hydration.ts` не менялся. Тестов по путям из плана (`tests/account_authority_preserved_domains.test.ts`, `functions/src/account_authority/preserved_domains.test.ts`) не существует |
| 6.2 | Mapping accountId + проверенная hydration до отметки «готово» | P | Только в контракте. На сервере `resolvePrincipal` для каждого Firebase UID создаёт **новый** `acct-<uuid>`, связи с данными `users/{uid}` и V2-scope `account:<uid>` нет (R4) |
| 6.3 | Старый клиент не воскрешает legacy-состояние | P | Контракт `compatibility.ts` 23/23 PASS, но ни один серверный путь записи его не вызывает. Клиент 1.6.24 продолжает писать как раньше |

### Task 7 — уход от legacy
| # | Пункт | Статус | Доказательство |
|---|---|---|---|
| 7.1 | Перепись мест, где решается владение, + сторож | P | `tests/account_authority_legacy_callsite_guard.test.ts` 29/30. **Падает** «pins exact … provenance»: изменился хеш `app/cloud_sync.ts` (`dc3afa…` → `04cca9…`). Причина — чужая правка мультиязычной синхронизации, к AA отношения не имеет: сдвиг законный, но сторож хрупкий. Кроме того, это опись 326 legacy-вызовов, а не перевод их на authority |
| 7.2 | Убрать прямые legacy-вызовы владения | O | не начато |
| 7.3 | Read-only слой совместимости на ограниченный срок | O | не начато |

### Task 8 — release gates
| # | Пункт | Статус | Доказательство |
|---|---|---|---|
| 8.1 | Unit/source: тесты, strict TS, ESLint, сторож | P | Сейчас **красный**: 3 ошибки TS, наборы bridge 0/8 и app_integration «failed to run», сторож 29/30 |
| 8.2 | Эмулятор: первый вход, takeover, offline, прерванная миграция, повтор удаления, отказ старому клиенту | O | — |
| 8.3 | Устройство: SQLCipher Android, iOS, background/resume, выход вытесненного устройства | O | — |
| 8.4 | Backup/restore, совместная выкладка rules/indexes/functions, 3 тестовых аккаунта, окно отката | O | — |

## 2. Что сломано сейчас (факты прогонов)

**TypeScript (точечно, временный tsconfig в scratchpad; клиент: 7 модулей AA + адаптер + transition + runtime + client_session + auth_provider + client_flag + 9 тестов):**
```
modules/account-session-v2/account_authority_production_adapter.ts(584,9): TS2739 … missing readLease, bindLease, writeLease (AccountAuthorityLeaseRevisionStore)
tests/account_authority_app_integration.test.ts(52,53):  TS2741 Property 'readPersisted' is missing … AccountAuthorityInstallationBindingPort
tests/account_authority_app_integration.test.ts(236,40): TS2741 то же
```
Причина: в 08:23 прежняя сессия расширила интерфейсы в `account_authority_lease_transport.ts`
(release-транспорт: `readLease/bindLease/writeLease`, `readPersisted`). Production-адаптер (правка
08:06) и интеграционный тест (08:02) под новые интерфейсы не обновлены. Functions `tsc --noEmit`:
0 ошибок.

**Jest, клиент** (`npm run test:one`, по одному файлу):
| Набор | Итог |
|---|---|
| app_integration | FAIL — не компилируется (TS2741) |
| auth_provider_bridge | FAIL 0/8 (пустые сообщения, worker завершён принудительно) |
| auth_provider_wiring | 8/8 |
| bootstrap_contract | 10/10 |
| contract | 25/25 |
| lease_transport | 17/17 |
| legacy_callsite_guard | 29/30 (дрейф хеша `cloud_sync.ts`) |
| reducer | 9/9 |
| runtime | 49/49 |

**Jest, functions:** callable_boundary 16/16, delete_contract 19/19, firebase_lease_callable 8/8,
installation_binding_callable 11/11, installation_binding_contract 12/12, lease_contract 11/11,
accounts_v2_migration/preserved_domains 21/21, compatibility 23/23.

**ESLint** (клиентские файлы AA + тесты): 0 ошибок.

**Немые catch и логи** (правило «сперва логи»):
- **Ни одной строки лога** во всех 16 модулях AA, на клиенте и на сервере (`console.*` / `logger.*` = 0). Логи есть только в `accounts_v2_client_flag.ts` и `accounts_v2_client_runtime.ts` (`[ACCOUNT-AUTHORITY]`, `[ACCOUNT-V2]`).
- Полностью немые:
  - `account_authority_production_adapter.ts:525` — `scopeStore.close(fence).catch(() => undefined)`;
  - `account_authority_lease_transport.ts:286` — `.catch(() => { … throw new Error('…_unavailable') })`: вид ошибки теряется;
  - `functions/src/account_authority/installation_binding_callable.ts:236` — `catch { throw bindingRejected(); }` превращает и временные сбои Firestore (contention, deadline) в «отклонено», без лога.
- `catch` с переупаковкой без лога: adapter 200/244/599/632, lease_transport 126/167/219/243, callable_boundary 191/223/255/268, delete_contract 550/818, а также `mapCallableError` в обоих callable: всё неизвестное превращается в `internal`, и на сервере не остаётся ни одного следа.
- В `auth_provider.ts` `runAccountAuthorityCredentialSignIn`: оба `catch` возвращают ошибку без `logAuthEvent`.
- `account_authority_runtime.ts`: все `catch` пробрасывают ошибку дальше, то есть немыми не являются, но логов у ветвлений нет. Логгер стоит передать портом, чтобы ядро осталось чистым.

## 3. Флаг cutover OFF: что на самом деле выполняется

`ACCOUNT_AUTHORITY_V2_GLOBAL_CUTOVER_ENABLED = false` — константа в исходнике. Через «Пульт» её не
включить, и это проверяет сторож.

### `app/auth_provider.ts` (+66/−2)
1. Импорт `runAccountAuthorityProviderSignInTransition` / `…SignOutTransition` из `accounts_v2_client_flag`.
2. Новая функция `runAccountAuthorityCredentialSignIn(provider)`: native credential → `signInWithCredential`, ответ `linked_existing`. **При OFF не вызывается.**
3. `signInWithProvider`: было `runSignInWithProvider(provider, options)`, стало `runAccountAuthorityProviderSignInTransition(authorityCb, () => runSignInWithProvider(...))`. При OFF вызывается `runLegacyAccountsV2ProviderSignInTransition(legacy)`:
   - `accounts_v2_client_enabled` OFF (или не Android и не доказанный iOS) → **сразу `runSignInWithProvider`, как раньше**;
   - `accounts_v2_client_enabled` ON и Android → вход обёрнут в `runAccountsV2ProviderSignInTransition`, новый координатор `account_v2_auth_transition.ts`. **Это новое поведение**: до правки вход не оборачивался.
4. `signOutCurrentProvider()` теперь делегирует в `runAccountAuthorityProviderSignOutTransition(performCurrentProviderSignOut)`. При OFF и V2 OFF выполняется тот же код, что раньше. При V2 ON выход идёт через координатор V2. Затронуты все вызовы, включая `deleteAccountAndWipe` (строка 3793) и пути на строках 1040 и 2990.
5. `rejectRecoveryProviderMismatch` теперь зовёт `performCurrentProviderSignOut` напрямую, чтобы не было self-deadlock в очереди. При обоих OFF поведение то же. При V2 ON этот выход идёт мимо координатора: нужен тест, что scope V2 закрывается.

### `modules/account-session-v2/accounts_v2_client_runtime.ts` (+244)
Модуль грузится лениво и только при `accounts_v2_client_enabled` ON или при cutover ON. При обоих
OFF он не загружается вовсе. При V2 ON:
- `installAccountAuthorityProductionBootstrapIfPossible()` вызывается из `syncAccountsV2ClientAuth` **при каждой смене auth** (результат запоминается). Он создаёт native scope adapter, **синхронно** (`SecureStore.getItem/setItem`) пишет genesis-метаданные, генерирует и сохраняет `installation_id` в SecureStore. Сеть не трогает: привязка установки делается лениво. При cutover OFF этот bootstrap **никем не используется** — это лишняя работа и синхронный вызов Keychain/Keystore на JS-потоке во время старта.
- `syncAccountsV2ClientAuthUid` больше не берёт переданный uid, а идёт через `getAuthTransition().observeAuthUid(currentAuthUid())`. **Анонимный uid больше не открывает V2-scope** (`isAnonymous !== false → null`).
- `captureAccountsV2OwnerUid` возвращает `null` для анонима, поэтому producer пропускает изменения гостя.
- `produceAccountsV2ChangeIfEnabled`: убран `setTimeout(0)`, `build()` выполняется синхронно в кадре вызывающего. Добавлен `.catch` с логом.
- HYDRATION: в `callMigrate` / `callPull` добавлен `withAccountsV2ClientVersion` (8F, PM-235).

### `account_v2_client_session.ts` (+2)
Поле статуса `hydrationArmed`, только для чтения.

### `functions/src/index.ts` (+6)
Экспорт `accountAuthorityLeaseAcquire`, `accountAuthorityLeaseRelease`,
`accountAuthorityInstallationBindingCreate`. У всех внутри `rolloutEnabled: false`, поэтому они
отвечают `failed-precondition`. `minInstances` не задан (HOT_CALLABLE_OPTIONS: 256 MiB, max 80), так
что в покое они денег не стоят. **Но любая полная выкладка `--only functions` из любой сессии
создаст три новые функции.**

### Вывод
- **Оба флага OFF** — поведение входа, выхода, смены и удаления совпадает с HEAD. Доказано чтением кода; поведенческого теста на это нет.
- **V2 ON, cutover OFF** — поведение уже другое: обёртка координатора, анонимные пользователи, синхронный producer, лишний bootstrap.

Сейчас это подтверждают только текстовые сторожа. Нужен поведенческий тест-матрица «cutover OFF ×
V2 OFF/ON» с последовательностью вызовов, сверенной с HEAD.

Ошибки TS2739/TS2741 Metro не мешают: Babel вырезает типы. При OFF не вызывается ни один код с
неполным интерфейсом, так что для текущей сборки приложения это не авария, а красный gate.

## 4. Разрыв с планкой владельца

### Сценарии (тестов нет или они неполные)
| Сценарий | Состояние |
|---|---|
| Новый аккаунт | Чистая установка: binding + первая аренда покрыты контрактом и транспортом (lease_transport 17/17). End-to-end нет |
| Существующий аккаунт | **Не покрыт и сломан по замыслу**: сервер выдаёт новый `acct-<uuid>`, локальный scope `account:acct-…` ≠ существующий V2 `account:<uid>`, данных `users/{uid}` в mapping нет (R4) |
| Анонимный → вход (слияние гостевого прогресса) | Cutover-адаптер делает `signInWithCredential` без link/merge, legacy-перенос гостя выпадает. Решения нет |
| Смена аккаунта на одном устройстве | **Дефект**: клиент хранит ОДИН binding token на установку (`BINDING_TOKEN_KEY`), а сервер привязывает по паре (uid, installation). После A→B `readPersisted()` отдаёт токен A, сервер отказывает, у B «lease unavailable», дальше fail-closed выход (R3) |
| Два устройства, вытеснение A | Сервер вытесняет. На клиенте у `handleLeaseRevoked` **нет ни одного вызова**: нет проверки на resume/foreground, нет реакции на отказ сервера. Устройство A о вытеснении не узнает |
| Offline / обрыв посреди операции | Ядро: идемпотентность по operationId, тесты runtime. Транспорт: повтор binding после потери ответа покрыт. Эмулятора нет |
| Удаление и восстановление | Не подключено: `clearAccountData` бросает, серверные порты удаления бросают, callable нет. Legacy `deleteAccountAndWipe` **не знает о новых коллекциях** `account_authority_*`: после удаления аккаунта principal, binding и retired_sessions останутся |
| Слияние аккаунтов | Нет. Связано с открытым 🔴 из §AV2-24: `auth_merge.ts` не переносит `stars` |
| 1.6.24 + 2.0 одновременно | 1.6.24 не участвует в аренде. Инвариант 4 («одна аренда») для смешанного парка не выполняется. Записи 1.6.24 сервер не ограничивает (`compatibility.ts` не подключён) |
| Мутационные тесты | Не запускались ни разу |
| Эмулятор на слабом профиле | Не запускался |

### Логи
См. §2. Нужен единый префикс `[ACCOUNT-AUTHORITY]` на клиенте и серверный логгер с редакцией (без
uid, только хеши и коды) на каждом ветвлении и в каждом `catch`.

### Безопасность (ревью перед каждым серверным этапом)
- **Аноним на сервере не отсекается.** `callable_boundary` и `installation_binding_callable` принимают любой `request.auth`, включая anonymous. Аноним получит principal, `acct-…` и binding. Нужна проверка `token.firebase.sign_in_provider !== 'anonymous'`.
- **Нет rate-limit** на `InstallationBindingCreate`: каждый вызов ротирует токен — транзакция и 2–3 записи.
- `resolve` в `installation_binding_callable.ts:236` глотает любые ошибки как «rejected». Временный сбой выглядит как отзыв привязки, и диагностики нет.
- App Check: **не использовать** (запломбирован). `request.app` в boundary только парсится и не требуется — так и должно остаться, проверено.
- Хорошо: токен привязки — UUIDv4, на сервере хранится только хеш; uid и installationId хешируются; `toJSON` редактирует поля; правильных ответов и ownership-решений от клиента сервер не принимает.
- Rules: новых коллекций (`account_authority_principals_v1`, `account_authority_accounts_v1/{id}/retired_sessions`, `account_authority_installation_bindings_v1`, `account_authority_installation_binding_tokens_v1`) в `firestore.rules` нет, держатся только на catch-all deny. По правилу Джарвиса новую коллекцию нужно закрыть явно; проверить, нужно ли добавлять её в `jarvis_data_contract_guard`.
- Индексы не нужны: только чтение и запись по doc-id.

### Стоимость Firestore
- Вход ≈ 8–10 чтений и 3–4 записи: binding — 1 чтение и 2–3 записи; `identities.resolve` — две отдельные транзакции (4 чтения), которые можно слить в одну; principal-транзакция; транзакция аренды — 1 чтение плюс N чтений retired_sessions и 1–2 записи. Вход — событие редкое, нагрузка мала.
- `retired_sessions` растёт без ограничения: нужен TTL-policy или чистка.
- Слушателей реального времени нет — это правильно. Проверку вытеснения делать только на resume или foreground с троттлингом (например, не чаще раза в N часов) и по ответу сервера, а не подпиской.

### Совместимость с 1.6.24
Новые callable 1.6.24 не вызывает, ответы существующих функций не менялись. Риск в другом: после
cutover старый клиент продолжает писать `users/{uid}` мимо аренды. Нужна стратегия: серверный отказ
legacy-записям для аккаунта после миграции либо период, когда старые устройства только читают.

### Privacy policy
Новое на сервере (после включения):
- хеш Firebase UID и хеш installation ID;
- server-issued device binding id;
- session id;
- метки времени аренды, вытеснения и отзыва;
- журнал retired_sessions.

Политика говорит о device identifiers и app instance в общем виде. **Не хватает срока хранения**
этих записей и обещания удалить их вместе с аккаунтом. Сейчас удаление аккаунта их не трогает
(см. выше). Правку `legal/` + `legal:sync` нужно внести **до** включения rollout.

## 5. Предлагаемый план этапов

| Этап | Объём | Файлы | Зависит от | Параллельно с | Выкладка | Ревью |
|---|---|---|---|---|---|---|
| **S0 — починить сборку** | Реализовать в адаптере `readLease/bindLease/writeLease` (по owner, SecureStore device-only); моки `readPersisted` в app_integration; подтвердить причину bridge 0/8 и вернуть 8/8; сторож: законный сдвиг хеша `cloud_sync.ts` с `// зачем:` или перевод на нехешевую проверку; немой catch adapter:525 → лог. Затем коммит частями: (а) чистые клиентские модули + тесты, (б) серверный код без выкладки, (в) проводка | `account_authority_production_adapter.ts`, `tests/account_authority_app_integration.test.ts`, `tests/account_authority_legacy_callsite_guard.test.ts` | — | — | нет | code |
| **S1 — логи** | Порт-логгер в runtime (ядро остаётся чистым), `[ACCOUNT-AUTHORITY]` на каждом ветвлении и `catch` адаптера и транспорта; серверный логгер с редакцией во всех `mapCallableError` / `catch`; `installation_binding_callable:236` — различать «отклонено» и «временно недоступно» | модули AA, `functions/src/account_authority/*`, `auth_provider.ts` (2 catch) | S0 | S2, S7 | нет | code |
| **S2 — решения по идентичности + security-ревью дизайна** | Решения владельца: (1) accountId для существующих аккаунтов (= канонический uid или mapping-документ); (2) судьба гостевого прогресса при входе; (3) политика для 1.6.24 после cutover; (4) срок хранения. Сервер: отказ анониму, rate-limit binding, binding на клиенте хранить **по uid**, слить две транзакции resolve | дизайн-док + `callable_boundary.ts`, `installation_binding_*`, `lease_transport.ts` | S0 | S1, S7 | нет | **security** |
| **S3 — сервер: удаление и очистка** | Firebase-порты удаления, callable удаления, задача purge (ограниченная, идемпотентная), release provider identity; добавить коллекции `account_authority_*` в серверное удаление (и в legacy `deleteAccountAndWipe`); явные deny-правила; TTL для `retired_sessions`; контракт Джарвиса при необходимости; тесты на Firestore-эмуляторе | `functions/src/account_authority/*`, `firestore.rules`, удаление аккаунта | S2 | S4 | нет (код) | **security** |
| **S4 — клиент: удаление, вытеснение, запись** | Локальное удаление первым (синхронная метка-надгробие + асинхронный стиратель); вызов `handleLeaseRevoked`: проверка на resume/foreground с троттлингом и по коду отказа сервера; `commitPreservedWrite` для lesson_progress и flashcards_srs; очистка журнала операций (512); смена аккаунта с binding по uid | runtime, адаптер, транспорт, `accounts_v2_client_runtime.ts` | S2 | S3 | нет | code |
| **S5 — миграция и совместимость** | Подключить `preserved_domains` / `compatibility` к `migrate_mine` и hydration; mapping accountId; режим для 1.6.24 (отказ legacy-записям после миграции аккаунта); слияние: решение по `auth_merge` / stars (§AV2-24) | `functions/src/accounts_v2_migration/*`, `accounts_v2_adapter/*`, `account_v2_hydration.ts` | S3, S4 | — | нет | **security** + code |
| **S6 — матрица сценариев + мутации** | Сценарии: новый / существующий / аноним→вход / смена / 2 устройства / offline / обрыв / удаление+повтор / восстановление / слияние / 1.6.24+2.0. Мутационное тестирование (Stryker или ручные мутанты) reducer / runtime / lease_contract / delete_contract / binding | `tests/account_authority_*`, functions tests | S4, S5 | — | нет | code |
| **S7 — доказать, что OFF ничего не меняет** | Поведенческая матрица «cutover OFF × V2 OFF/ON»: последовательность вызовов входа, выхода, смены и удаления равна HEAD. Решить, нужен ли bootstrap при V2 ON без cutover (сейчас это лишняя синхронная работа с SecureStore) | `tests/…`, `app/accounts_v2_client_flag.ts` | S0 | S1, S2 | нет | code |
| **S8 — Firebase-эмулятор** | Functions + Firestore emulator: два устройства, offline, обрыв, повторы, удаление | скрипты эмулятора | S3–S6 | — | нет | code |
| **S9 — Android-эмулятор, слабый профиль** | Вход / выход / смена / вытеснение / удаление по логам `[ACCOUNT-AUTHORITY]`; замер холодного старта (синхронный SecureStore) | — | S8 | — | нет | — |
| **S10 — выкладка и rollout** | Правка privacy policy; backup; выкладка rules + functions вместе с `rolloutEnabled: false`; затем включить на сервере, потом cutover на клиенте для 3 тестовых аккаунтов владельца; окно отката | — | S9 + команда владельца | — | **да** | **security** финальное |
| **S11 — отчёт «DONE»** | Таблица доказательств: прогоны, мутации, эмулятор, логи, хеши коммитов | этот файл / PROGRESS | S10 | — | нет | — |

Минимальный критический путь: S0 → S2 → (S3 ∥ S4) → S5 → S6 → S8 → S9 → S10. S1 и S7 идут
параллельно сразу после S0.

## 6. Топ-5 рисков

1. **Красная сборка и незакоммиченные 12,4 тыс. строк в общем дереве.** Среди них untracked-файлы, при этом сессий 10+ и общий git-индекс: работу можно потерять или кто-то закоммитит её чужим коммитом. → S0 немедленно.
2. **Смена аккаунта на одном устройстве под cutover сломана**: один binding token на установку при серверной привязке по (uid, installation).
3. **Существующий аккаунт под cutover откроет пустой scope** (`acct-<uuid>` ≠ `account:<uid>`), mapping и миграции нет. Гостевой прогресс при входе не переносится.
4. **Удаление и вытеснение не подключены**: `clearAccountData` / серверные delete-порты бросают `not_wired`; у `handleLeaseRevoked` нет вызова. Legacy-удаление не стирает новые серверные коллекции — это риск для приватности после включения.
5. **Ноль логов в AA и три немых или подменяющих catch.** Плюс V2-флаг ON уже меняет поведение без cutover. Плюс сервер принимает анонима и не ограничивает частоту вызовов привязки.
