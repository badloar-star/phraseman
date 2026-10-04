# Task packet: Account Authority 2.0 — этап S5: миграция и совместимость

Governance-ID: TG-70B581CAE918
Governance-ID: TG-B73E39B4FADC
Governance-ID: TG-8C9B6FC702C3
Status: Implemented (не закоммичено) — на подтверждение координатору
Owner: Claude session 5 · АВТОРИЗАЦИЯ (Account Authority 2.0)
Related epic/enabler: docs/superpowers/plans/2026-10-01-account-authority-2-0.md, строка S5 (≈247); зависит от S3 (c6241c9d7), S4 (1d76be137, 12829ccbd)

## Outcome
Существующие пользователи переходят на Account Authority без потери данных и без второго «нового» аккаунта; старый клиент 1.6.24 продолжает работать рядом с 2.0. Конкретно:
- `preserved_domains` / `compatibility` подключены к `migrate_mine` (functions/src/accounts_v2_migration/*) и к гидрации клиента (`account_v2_hydration.ts`): полезная нагрузка сохранённых записей (lesson_progress, flashcards_srs — отметки фиксации из S4b) доезжает до сервера и обратно;
- mapping accountId по решению D-AA1: существующий аккаунт = его stableId (canonicalStableId), `acct-<uuid>` — только для новых; прогресс гостя переносится при первом входе;
- режим 1.6.24: старый путь без аренды работает; сервер отвергает запись 1.6.24 в preserved-домены ТОЛЬКО после миграции этого аккаунта на AA (по флагу/метке миграции), до этого — совместимо;
- главный путь удаления при включённом cutover: решить и реализовать (AA-удаление vs старое `deleteAccountAndWipe`), без двойной работы и без дыр (S4a: сейчас идут рядом).
Мера успеха: тесты сценариев (существующий / новый / гость→вход / 1.6.24 рядом с 2.0 / повторная миграция идемпотентна / обрыв посреди миграции), мутации, логи `[AA-S5]`, ноль немых catch, security-ревью APPROVE.

## Scope
In: `functions/src/accounts_v2_migration/*`, `modules/account-session-v2/accounts_v2_adapter/*` (или фактические пути адаптера), `account_v2_hydration.ts`, `functions/src/account_authority/*` (mapping/совместимость), клиентский вход/смена/удаление в части S5.
Out: перенос `users/{loser}.stars` в `auth_merge.ts` и coin_reconcile (8S) — контур сессии «Ядро» (§97), не трогать; если S5 от него зависит — описать зависимость. Матрица сценариев целиком (S6), флаги (S7), эмулятор (S8), Android (S9), деплой/политика (S10). Новый UI — нет (гейт макетов). Чужие контуры — LANES.md.

## Architecture
Сервер — правда об аккаунте; миграция серверная, идемпотентная (расписка/метка версии), возобновляемая; клиент local-first, гидрация из кэша/снапшота мгновенно, сервер догоняет. Совместимость: признак «аккаунт мигрирован на AA» на сервере решает, принимаются ли записи старого пути в preserved-домены.

## Security and privacy
security-ревью обязательно: перенос данных между личностями (гость → аккаунт), mapping accountId (не присвоить чужой аккаунт), отказ записям 1.6.24 (не потерять данные легитимного старого клиента), удаление (без дыр при двух путях). PII в логах — нет. Политика (S10): перенос прогресса гостя, хранение метки миграции.

## Technical debt
- S4b LOW-2 (тест ёмкости слотов) — S6. migration_overflow — док развёртывания S10.
- Если найдётся мёртвый код миграции — удалять только с доказательством неиспользования (в т.ч. 1.6.24).

## Verification
Точечные jest со слотом светофора (клиент `npm run test:one -- tests/<файл>`, сервер `cd functions && npx jest --no-coverage --no-watchman --maxWorkers=2 src/...`), соседи AA/миграции зелёные, мутации (Tests:), PM-229 ≤ 0, tsc точечно, security-ревью до APPROVE. Firebase-экономия: миграция пакетами where+limit, без выкачивания коллекций, без N запросов на пользователя при старте.

## Rollback
git revert; rollout и ворота cutover выключены — на пользователей не влияет. Миграция данных в проде не запускается (S10, по команде владельца).

## S5 разведка (2026-10-04, исполнитель S5)

### Карта (файл:строка)
**Preserved-домены / совместимость (сервер)**
- `functions/src/accounts_v2_migration/preserved_domains.ts:13` — `PRESERVED_DOMAIN_MIGRATION_POLICY` (carried = lesson_progress, flashcard, library_membership); `:81` `evaluatePreservedDomainMigration` — чистая модель, в рантайме НЕ вызывается (только свои тесты).
- `functions/src/accounts_v2_migration/compatibility.ts:109` `evaluateMigrationCutover` — модель PM-235, к рантайму не подключена (шапка :9–26).
- `functions/src/accounts_v2_contract.ts:23` `ACCOUNTS_V2_ENTITY_TYPES` = ровно те же 3 типа, что carried → перенос V2 уже несёт только сохраняемые домены.
- `functions/src/accounts_v2_adapter/migrate_mine.ts:321` `handleAccountsV2MigrateMine` (Пакет 6G, ЭКСПОРТИРОВАН `functions/src/index.ts:1141`, под `config/accounts_v2.syncEnabled`), `:259` `runMigration`, `:290` проверка ready, `:299` применение пакетов. Данные V2 — `accounts_v2/{uid}` (`firestore_port.ts:36`), ключ — Firebase uid, а не accountId.
- Гидрация клиента: `modules/account-session-v2/account_v2_hydration.ts:582` `hydrateAccountsV2Scope` (migrate → pull → apply), запускается только из V2-сессии `account_v2_client_session.ts:466`; область V2 = `account:<uid>` (`account_v2_client_session.ts:157`).

**Mapping accountId (D-AA1)**
- Сервер: `functions/src/account_authority/account_principal_store.ts:228` `resolvePrincipalForAcquire`: якорь `auth_links/{uid}.stable_id` есть → accountId = stableId (`existing_stable_id`, :245–263), канонизация скрытого дубля `:182` `verifyStableAccount`; якоря нет → `acct-<uuid>` (`new_account`); якорь появился/сменился → перепривязка (`rebound`, :301). Реализовано в S2a — S5 правок не требует.
- Клиент: AA открывает область `account:<accountId>` (`account_authority_production_adapter.ts:440`, `:798`) — в ней только служебные отметки AA (отметки фиксации S4b, метаданные); полезная нагрузка уроков/карточек живёт в хранилищах фич (AsyncStorage) и в V2-области `account:<uid>`.

**Как сервер узнаёт «аккаунт мигрирован»**
- Для V2: отметка `accounts_v2/{uid}/accounts_v2_meta/migration` {status done|partial|hold|not_found_yet} (`migrate_mine.ts:43`), по uid. Клиентская метка гидрации 7A — `accounts_v2_legacy_hydrated_v1` (только на телефоне).
- Для AA: отдельной метки «аккаунт мигрирован на AA» НЕТ. Есть принципал (`account_authority_principals_v1`, по хешу uid, не по аккаунту) — он означает лишь «был вход клиентом с AA».

**Режим 1.6.24**
- 1.6.24 (app.json `version` = 1.6.24) пишет сохраняемые домены ТОЛЬКО прямыми записями Firestore старого cloud_sync (`users/{stableId}` progress.*, `flashcard_pages`) под `firestore.rules:1111/1178`; callable-путь V2 в проде выключен флагами. Значит серверный отказ 1.6.24 возможен только правилами Firestore (или min_app_version 7B).
- `firestore.rules` и `app/cloud_sync.ts` сейчас с ЧУЖИМИ незакоммиченными правками — не трогаю.

**Удаление: старое и AA рядом (S4a)**
- `app/auth_provider.ts:3872` `beginAccountAuthorityDeletionIfEnabled()` (под воротами cutover) запускается ПАРАЛЛЕЛЬНО со старым `finishAccountDeletion` (`:3881`); доказательство старым удалением — `:3887–3897`.
- AA: `account_authority_runtime.ts:573–583` — `lease.deleteAccount` (очередь ждёт первую отправку `delete_begin` ≤5 с, `account_authority_remote_delete_queue.ts:419`) → затем `provider.signOut` → `auth.signOut()` (`account_authority_production_adapter.ts:1352`). Сервер `delete_begin` освобождает Firebase Auth сразу и чистит ТОЛЬКО коллекции AA.
- Старое: держит вход до подтверждения сервера (`auth_provider.ts:4158` ack `authReleased/credentialSafe`, комментарий `:4220`), сервер `account_delete.ts` стирает ВСЁ: `:1821` стадия `account_authority_purge`, `:1829` `accounts_v2_purge`, `:1840` `deleteUser`.
- 🔴 Найдено (под выключенными воротами, на пользователей не влияет): при cutover AA выходит из провайдера и стирает Auth через ≤5 с, пока старый поток ещё ждёт постановку серверного удаления → постановка может уйти без входа → полное серверное стирание не начнётся (данные users/**, accounts_v2/** переживут удаление). Двойная работа: два серверных удаления на одно действие.

**Гость → вход (D-AA2) при cutover**
- `auth_provider.ts:1962` `runAccountAuthorityCredentialSignIn` — чистый `signInWithCredential`, без link/stamp/merge гостя; старый `runSignInWithProvider` (stamp + nonce M-1 + merge) используется только при выключенных воротах (`:2074–2077`). При cutover прогресс гостя на сервер не переносится (локально остаётся в хранилищах фич).

**V2 под cutover**
- `app/accounts_v2_client_flag.ts:148–173` `syncAccountsV2ClientAuth`: при cutover — только resume AA и `return`; V2-сессия (outbox → sync, migrate_mine, гидрация) НЕ стартует. Полезная нагрузка при cutover идёт только старым cloud_sync.

### Решения S5
- **D-AA5 (реализую; на подтверждение координатору): главный путь серверного удаления при cutover — старое удаление** (`deleteAccountAndWipe`/`finishAccountDeletion` → задача `account_delete`, полное стирание всех доменов, включая стадию `account_authority_purge`; Auth освобождается при постановке). AA при cutover — local-first (надгробие, стиратель, мгновенный UI) + запись очереди в состоянии `awaiting_legacy` как трекер доказательства: `delete_begin` из потока удаления НЕ отправляется, AA НЕ выходит из провайдера (выход — у старого потока после подтверждения сервера). Снятие записи — по доказательству старого удаления (`server_enqueued`), иначе через 90 дней с тревогой. Путь «AA-сервер» (`delete_begin`) остаётся в коде и тестах (флаг пути), для будущего, когда старое удаление уйдёт.
- **migrate_mine ↔ preserved_domains (реализую, поведение не меняется):** перед применением пакетов — сторож «только carried-типы политики»; чужой тип → HOLD `non_preserved_entity_type`, V2 не пишется. Тест равенства `ACCOUNTS_V2_ENTITY_TYPES` и политики.
- **1.6.24 (реализую только чистый контракт; на подтверждение):** `evaluateLegacyWriterPreservedWrite` — старый писатель допускается всегда, кроме доказанной миграции аккаунта на AA при включённом cutover; состояние миграции неизвестно → допускаем (не теряем данные законного старого клиента). Принуждение — правилами Firestore (+1 `exists()` только когда запись трогает сохраняемые поля) — НЕ делаю: правила заняты чужой правкой, тесты правил — S8. Набросок правила — в итоге.
- **Без безопасного варианта → вопросы координатору (не реализую):** (В1) запуск V2-сессии (sync + migrate_mine + гидрация) под cutover и её остановка при вытеснении/выходе; (В2) перенос прогресса гостя при AA-входе (D-AA2 сейчас не выполняется под cutover); (В3) серверная метка «аккаунт мигрирован на AA» — когда и кем ставится (нужен отчёт клиента о проверенной гидрации); (В4) правило Firestore для 1.6.24.

## Итог исполнителя S5 (2026-10-04)

Status: Implemented (НЕ закоммичено; ворота cutover выключены, поведение приложения при выключенных — без изменений; ничего не задеплоено, функции не экспортировались). Governance-ID TG-B73E39B4FADC, TG-8C9B6FC702C3 в шапке.

### Сделано
1. **D-AA5 — главный путь удаления при cutover = старое удаление (на подтверждение координатору). 🔴 из разведки закрыт.**
   - `modules/account-authority-v2/account_authority_remote_delete_queue.ts:58` путь `'authority' | 'legacy_primary'`, `:61` боевой — `legacy_primary`; `:71` реестр отсрочки выхода из провайдера для удаления (память процесса); `:218` новая запись → `awaiting_legacy`; `:356` такие записи не отправляются НИКОГДА (старт, новый запрос, вход того же аккаунта); `:377` без доказательства — снимаются через 90 дней с тревогой (critical); `:479` `deleteAccount` в legacy_primary только ставит запись, сеть не ждёт; состояние очереди получило счётчик `awaitingLegacy`. Восстановление прерванных удалений на старте тоже ставит `awaiting_legacy`.
   - `modules/account-session-v2/account_authority_production_adapter.ts:129/:1319/:1360` — зависимость `remoteDeleteServerPath`, боевая сборка передаёт `legacy_primary`; не задана → `authority` (тесты и путь S4a не изменились).
   - `modules/account-session-v2/accounts_v2_client_runtime.ts:349` удаление помечает операцию «выход — за старым потоком» (снятие в `finally`), `:253` боевой порт провайдера пропускает выход для такой операции. Обычный выход/смена выходят как раньше.
   - `app/auth_provider.ts:3903` — `[AA-S5] delete:aa_awaiting_legacy` если старое удаление не дошло до `server_enqueued` (запись AA ждёт; повтор ведёт замок старого потока).
   - Итог: при cutover сервер получает ОДНО удаление (`account_delete`: всё, включая `account_authority_purge` и `accounts_v2_purge`, Auth освобождается при постановке), вход держится до подтверждения сервера; UI по-прежнему мгновенный (надгробие + стиратель AA). `delete_begin` остаётся в коде для будущего (путь `authority`).
2. **preserved_domains → migrate_mine** (`functions/src/accounts_v2_adapter/migrate_mine.ts:170` `nonPreservedEntityTypes`, `:317` сторож перед применением): тип вне `PRESERVED_DOMAIN_MIGRATION_POLICY.carriedEntityTypes` → HOLD `non_preserved_entity_type`, V2 не пишется, лог `[AA-S5] migrate hold` без uid. Сейчас типы V2 = политика — поведение живой функции не меняется (функция экспортирована; при следующей выкладке уйдёт и сторож).
3. **Режим 1.6.24 — чистый контракт** `functions/src/accounts_v2_migration/preserved_domains.ts:179` `evaluateLegacyWriterPreservedWrite` (на подтверждение координатору): старый писатель допускается всегда, кроме «cutover включён И миграция аккаунта на AA доказана»; состояние неизвестно → допускаем (не теряем данные законного старого клиента); битый вход → отказ `invalid_input`. Принуждения нет (см. В4).
4. **Mapping accountId (D-AA1)** — правок не потребовалось: сделано в S2a (`account_principal_store.ts:228`). Риск-заметка: если якорь `auth_links/{uid}.stable_id` равен самому uid (очень старые аккаунты), область AA `account:<accountId>` совпадёт по ключу с областью V2 `account:<uid>` — станет важным только при В1.

### Тесты
- Новый клиентский `tests/aa_s5_delete_main_path.test.ts` — 13/13: боевой путь; мгновенный local_deleted без сети; AA НЕ выходит из провайдера при удалении (обычный выход — выходит); перезапуск + повторный вход — `delete_begin` не уходит; доказательство старым удалением снимает запись; двойной тап; процесс убит до постановки → восстановление в `awaiting_legacy`; 90 дней → снятие с тревогой; путь `authority` и путь по умолчанию — как в S4a; логи `[AA-S5]` без id; проводка (адаптер, порт провайдера, поток удаления, auth_provider).
- Новый серверный `functions/src/accounts_v2_adapter/aa_s5_migration_compat.test.ts` — 16/16: равенство типов V2 и политики; `nonPreservedEntityTypes`; существующий аккаунт (stableId через auth_links) → done, только сохраняемые домены; чужой тип → HOLD, ноль записей; повторная миграция идемпотентна (already_done, 1 чтение); обрыв (partial) → продолжение без дублей; 10 случаев контракта 1.6.24.
- Соседи клиента (12 наборов): 228/230 — 2 красных `account_authority_legacy_callsite_guard` (peekStableId 7→8, stableIdentityReads 19→20) — те же ЧУЖИЕ, известные с S4a (§AA-24), S5 вызовов не добавил.
- Сервер `src/account_authority` + `src/accounts_v2_migration` + `src/accounts_v2_adapter`: 619/620 — 1 красный `root_fields_dry_run.test.ts` (перепись корневых полей кода: 61 вместо ≥63) — ЧУЖОЙ, от S5 не зависит (импортирует только dry_run/inventory и скрипт переписи).
- `tsc --noEmit` functions — 0 ошибок; PM-229 `silentCatch=0`.

### Мутации (15, все убиты; cmp с эталоном после каждой — OK)
M1 новая запись `pending` — компиляция (сужение типа) · M2 eligible пускает awaiting — 1 failed · M3 legacy_primary всё равно ждёт отправку — выжил в 1-м прогоне → добавлена проверка лога, 1 failed · M4 awaiting не истекает — 1 · M5 путь по умолчанию legacy — выжил → тест «путь не задан», 1 failed · M6 боевая константа authority — 1 · M7 порт не проверяет отсрочку — выжил → строгий сторож порта, 1 failed · M8 адаптер не передаёт путь — 9 · M9 отсрочка не снимается — 1 · M10 счётчик — 1 · M11 сторож carried выключен — 1 · M12 сторож пропускает чужие — 2 · M13 1.6.24 после миграции допускается — 2 · M14 unknown режет старого — 1 · M15 cutover не проверяется — 1.

### Эталон
`.tmp_aa_s5_backup/after/` — 8 файлов (6 изменённых + 2 новых теста) + этот пакет; до правок — `.tmp_aa_s5_backup/before/`.

### Решения на подтверждение координатору
- D-AA5 (главный путь удаления при cutover — старое удаление; AA — local-first + трекер `awaiting_legacy`; delete_begin не шлётся; выход — за старым потоком).
- Контракт 1.6.24: «неизвестно → допускаем».
- Остаточный риск D-AA5: между локальным «удалено» и выходом старого потока Firebase ещё вошедший; продление AA по возврату из фона в это окно получит отказ открытия области (надгробие) — данные не открываются, но строка-отказ в логе будет.

### Вопросы без безопасного варианта (НЕ реализовано)
- **В1.** Под cutover V2-сессия (outbox → sync, migrate_mine, гидрация) не стартует (`app/accounts_v2_client_flag.ts:148–173`), полезная нагрузка идёт только старым cloud_sync. Запускать ли её под cutover (своим флагом, только при аренде AA, остановка при вытеснении/выходе) и как развести ключи областей AA/V2 (см. п.4)? Рекомендация: да, ключ AA — отдельное пространство имён.
- **В2.** D-AA2 под cutover не выполняется: `runAccountAuthorityCredentialSignIn` (`auth_provider.ts:1962`) — чистый `signInWithCredential` без link/stamp/merge гостя (nonce M-1). Рекомендация: для анонима под cutover — старый путь связки/слияния как адаптер миграции; без якоря новый вход даёт `acct-<uuid>`, потом перепривязку и сироту до TTL.
- **В3.** Серверной метки «аккаунт мигрирован на AA» нет. Когда ставить (нужен отчёт клиента о проверенной гидрации + mapping, как требует `evaluatePreservedDomainMigration`), где хранить (по хешу accountId или по stableId, если правилам нужен `exists()`)?
- **В4.** Принуждение 1.6.24 — только правилами Firestore (`users/{id}` progress.* сохраняемых доменов и `flashcard_pages`), с `exists()` метки лишь когда запись трогает эти поля. `firestore.rules` сейчас с чужой правкой, тесты правил — S8. Набросок: `allow update: if ... && (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['progress']) || !exists(/databases/$(database)/documents/<метка>/$(userId)))` (уточнить на уровень полей progress.* в S8).

### Отложено
В1–В4; эмулятор правил (S8); матрица сценариев целиком (S6); перенос stars/coin_reconcile — контур «Ядро», S5 от него не зависит.

### Данные для политики (S10)
- На устройстве: запись очереди удаления `awaiting_legacy` (id операции, accountId, id сессии) в SecureStore до доказательства старым удалением, но не дольше 90 дней.
- Новых серверных данных S5 не добавил; при В3 появится метка миграции аккаунта на AA (по хешу), её срок — вместе с аккаунтом.
- Удаление аккаунта при cutover — единым серверным удалением (все домены), как в действующей политике.

## Security-ревью S5 — APPROVE (2026-10-04); условия для решений координатора
- LOW-1: контракт 1.6.24 «неизвестно = разрешить» (`evaluateLegacyWriterPreservedWrite`) не применяется. При реализации В4 (правила Firestore через `exists()` метки миграции) контракт обязан совпасть с правилами; решение — координатор.
- LOW-2: до запуска V2-сессии под cutover (В1) вынести ключи областей AA в своё пространство имён (сейчас `account:<accountId>` может совпасть с V2 `account:<uid>` при якоре = uid).
