# Phone-Authoritative Universal Journal

**Статус:** дизайн утверждён владельцем 2026-08-20

**Область:** личный прогресс, локальные настройки и персональная экономика Phraseman

**Решение:** полная замена snapshot/server-authoritative синхронизации универсальным локальным журналом; выпуск поэтапный, без потери данных

## 1. Цель и конституция

Для обычных персональных действий пользователя действует один неизменный порядок:

1. Телефон атомарно сохраняет завершённый результат локально.
2. UI подтверждает результат только после локального durable commit.
3. Сервер получает неизменяемые операции в фоне, хранит и раздаёт их другим устройствам.
4. Сетевой сбой не откатывает локальный результат, не блокирует действие и не показывается пользователю как ошибка сохранения.
5. Два или больше устройств сходятся к одному результату через детерминированное объединение операций, а не через выбор «чей snapshot новее».

Это решение распространяет существующую Economy Constitution на весь обычный персональный прогресс. Сервер не вправе пересчитывать, ограничивать, понижать или отзывать уже локально завершённый валидный личный результат.

### 1.1. Что считается обычными персональными данными

- XP, уровни, streak и календарь активности;
- завершение уроков, экзаменов и персональных заданий;
- достижения, медали, unlocks, best scores и личная статистика;
- карточки пользователя, колоды, планы, ошибки и тренировки;
- персональные настройки, выбранный язык, профиль обучения и локальные предпочтения;
- обычные начисления и траты жемчужин, если они не передают ценность другому человеку и не покупают внешний серверный entitlement;
- незавершённые персональные сессии, если продукт явно разрешает их перенос между устройствами.

### 1.2. Допустимые server-authoritative исключения

Сервер остаётся источником подтверждённого внешнего факта только для:

- Auth, владения аккаунтом, provider links, блокировок и удаления аккаунта;
- реальных платежей, подписок, возвратов и receipt verification;
- переводов между людьми, подарков, marketplace settlement;
- уникального публичного nickname и других глобально уникальных имён;
- admin grants, bans, access и entitlements;
- Arena, League, Tournament, matchmaking, leaderboard и иных competitive outcomes;
- опубликованного контента, remote config, серверных квот AI/voice и операций без локального результата.

Такой факт поступает на телефон как неизменяемое idempotent `external_event`. Он может дополнять личную проекцию, но не может переписывать или понижать обычный локальный журнал.

### 1.3. Отменённые архитектурные решения

Этот документ заменяет authority-модель из `2026-06-13-server-authoritative-progress-direct-cutover-design.md`. После завершения миграции больше не действуют следующие её требования:

- Cloud Functions как источник истины для XP, streak, lessons, exams и unlocks;
- откат локального результата при server rejection;
- блокировка обычного прогресса при недоступном сервере;
- поле `progressServerAuthoritative` как основание выбора данных;
- запрет клиентской записи персонального прогресса как способ установить server authority.

Спецификация `2026-07-15-zero-cost-multi-device-sync-reliability-design.md` остаётся историческим узким патчем. Её cold-start overlay не является целевой моделью и удаляется только после безопасного cutover универсального журнала.

## 2. Доказанные проблемы текущей системы

Аудит установил следующие классы риска:

- `app/cloud_sync.ts` вырезает server-owned XP, streak, unlocks и lesson/exam поля из исходящего client snapshot.
- `functions/src/progress_events.ts` пересчитывает и может отклонять личные progress events, то есть активный core progress остаётся server-authoritative.
- generic sync держит dirty state только в памяти и очищает его до сетевой записи; после ошибки гарантированный durable retry отсутствует.
- конфликт всего snapshot решается по глобальному XP/streak, поэтому свежесть одного поля ошибочно определяет судьбу несвязанных карточек, настроек и статистики.
- stale устройство может отправить полный snapshot и затереть более новые client-owned поля другого устройства.
- AsyncStorage используется как основная БД, но ошибки записи местами проглатываются; durable transaction между событием, результатом и outbox отсутствует.
- progress submission способен создавать callable/Firestore transaction почти на каждый ответ.
- существующий shard journal повторно сканирует локальную и облачную историю без durable high-water cursor.
- обычные cloud refresh/sync ошибки местами показываются пользователю, хотя локальный результат уже доступен.

Новая архитектура обязана устранять эти причины, а не маскировать отдельные симптомы.

## 3. Граница локальной долговечности

### 3.1. `PhoneStateStore`

Единственным источником истины на телефоне становится account-scoped SQLite-хранилище `PhoneStateStore` в WAL-режиме. Минимальные логические таблицы:

| Таблица | Назначение |
|---|---|
| `operations` | неизменяемые обычные персональные операции |
| `external_events` | подтверждённые сервером внешние события |
| `projections` | восстановимые текущие представления по доменам |
| `outbox_segments` | sealed и отправленные сегменты, их durable статус |
| `remote_cursors` | последний применённый sequence каждого удалённого device stream |
| `checkpoints` | локальные/облачные compact checkpoints и их основания |
| `sync_retry` | attempts, `nextRetryAt`, lease и последняя техническая причина |
| `quarantine` | malformed/unknown данные, не применяемые к проекциям |
| `migrations` | версии и receipts одноразовых импортов |
| `account_keys` | служебные сведения account generation и локальной криптографии |

AsyncStorage после cutover разрешён только для:

- несущественных device-only подсказок и кэшей;
- совместимого legacy mirror на время миграции;
- одноразового источника импорта.

AsyncStorage не может быть единственным владельцем portable progress.

### 3.2. Формат операции

Каждая обычная операция содержит как минимум:

```ts
type PersonalOperation = {
  schemaVersion: number;
  operationId: string;
  stableUid: string;
  accountGeneration: number;
  deviceId: string;
  deviceSequence: number;
  hybridClock: { counter: number; deviceId: string };
  domain: string;
  kind: string;
  entityId: string | null;
  payload: unknown;
  exactResult: unknown;
  createdAtMs: number;
  fingerprint: string;
};
```

Инварианты:

- `operationId` стабилен для всех повторов и глобально уникален в пределах аккаунта;
- рекомендуемая основа ID: `stableUid + accountGeneration + deviceId + deviceSequence`;
- `deviceSequence` монотонно выделяется в той же SQLite transaction;
- `exactResult` замыкает результат операции и не требует серверного пересчёта;
- `fingerprint` защищает от несовместимого повторного использования ID;
- device time служит диагностике и UX, но не разрешению authority-конфликтов;
- созданная операция неизменяема; исправление — новая компенсирующая операция, если доменный контракт её допускает.

### 3.3. Локальный commit path

Для каждого обычного действия выполняется одна SQLite transaction:

1. Проверить локальные доменные предусловия.
2. Выделить `deviceSequence` и создать operation ID.
3. Записать immutable operation.
4. Применить детерминированный reducer.
5. Обновить projection.
6. Добавить operation в текущий outbox segment.
7. Зафиксировать transaction.
8. Только после commit вернуть UI готовый результат.

Network await на этом пути запрещён. Если процесс падает на любом шаге до commit, после перезапуска нет частичного результата. Если падает после commit, journal replay восстанавливает projection и outbox.

### 3.4. Ошибка локального диска

Сетевая тишина и локальная недолговечность — разные ситуации. Нельзя показывать «сохранено», если durable commit не состоялся.

При локальной ошибке система автоматически:

1. удаляет только воспроизводимые кэши;
2. повторяет transaction с ограниченным backoff;
3. сохраняет минимальный emergency intent, если основной journal временно недоступен;
4. при повторной невозможности записи открывает нейтральный recovery screen без обвинения сети и без ложного подтверждения результата.

Это единственная обычная save-ситуация, которая может остановить UI: телефон физически не способен гарантировать сохранность.

## 4. Детерминированные reducers и multi-device merge

Все reducers обязаны быть:

- idempotent по `operationId`;
- коммутативны и ассоциативны для независимых операций одного домена;
- детерминированы без server time;
- одинаковы при incremental apply, полном replay и checkpoint + tail replay.

### 4.1. Матрица merge semantics

| Данные | Операция / структура | Merge |
|---|---|---|
| XP и additive counters | уникальные deltas | сумма только уникальных operation IDs |
| lesson/exam completion | completion facts | union |
| unlocks, achievements, medals, owned items | grow-only/OR set | union; remove только явным tombstone, если разрешено |
| best score / best percent | observations | `max` |
| streak | множество активных local dates | union дат, затем детерминированный derived streak |
| custom cards/decks | OR-set сущностей | add/update плюс tombstone |
| настройки и профиль | field register | HLC/Lamport pair `(counter, deviceId)` отдельно для каждого поля |
| personal plan | task facts + registers | union completions; отдельный register для изменяемого выбора |
| session draft | scoped register | per-session LWW/HLC либо device-only по явному контракту |
| ordinary pearls | composite economy operations | replay уникальных exact results |

Глобальный XP, streak или timestamp никогда не используется как clock для другого поля.

### 4.2. Streak

Истина — множество дат подтверждённой локальной активности с нормализованной user timezone policy. `streak_count` является projection, а не mutable authority field. Объединение двух устройств добавляет даты и затем заново вычисляет streak.

Timezone policy должна быть версионирована внутри события или checkpoint, чтобы смена timezone не меняла прошлые дни задним числом.

### 4.3. Карточки и удаление

Удаление portable сущности создаёт tombstone с entity ID и field clock. Физическое удаление operation history запрещено до достижения documented compaction horizon всеми известными устройствами. Старое устройство не может воскресить карточку простым повтором старого add.

### 4.4. Жемчужины

Каждая обычная трата — одна composite operation, содержащая одновременно:

- debit;
- точный grant/result/entitlement;
- один стабильный idempotency key.

Standalone debit запрещён. Сервер не отклоняет такую валидную обычную операцию из-за собственного balance view.

Если два offline-устройства независимо потратили один доступный остаток, сохраняются оба локально выданных результата. После merge balance projection может стать отрицательной. Уже выданное не отзывается; новые ordinary spends блокируются локально до восстановления неотрицательного баланса новыми grant operations.

Внешние переводы, real-money и competitive economy остаются `external_events` и подчиняются серверному подтверждению.

## 5. Облачный транспорт

### 5.1. Firestore-модель

Предлагаемая логическая структура:

```text
users/{stableUid}/personal_sync_segments/{deviceId}_{firstSequence}
users/{stableUid}/personal_sync_checkpoints/{checkpointId}
users/{stableUid}/sync_devices/{deviceId}
users/{stableUid}/external_events/{externalEventId}
users/{stableUid}/entitlements/current
```

Имена могут быть уточнены при implementation plan, но семантика фиксирована:

- segment immutable после create;
- один segment принадлежит одному device stream;
- диапазон sequence внутри segment непрерывен и проверяем;
- повтор create с тем же ID и тем же fingerprint — успешный idempotent retry;
- тот же ID с другим fingerprint — quarantine/security signal;
- checkpoint не удаляет source history в первом релизе;
- giant `users/{uid}` progress snapshot больше не является каналом ежедневной синхронизации.

Любое изменение коллекций/полей в реализации одновременно обновляет Firestore Rules, индексы при необходимости, Jarvis fetchers и `jarvis_data_contract_guard.test.ts`.

### 5.2. Sealed segments

Текущий segment запечатывается по первому наступившему условию:

- 50 операций;
- 64 KiB сериализованного payload;
- завершение урока/экзамена/сессии;
- уход приложения в background;
- 2 минуты с первой операции сегмента при активном приложении.

Один урок из 20 ответов должен создавать не более одной progress segment write при нормальном сценарии. Per-answer callable и per-answer Firestore transaction запрещены.

### 5.3. Durable sync coordinator

Один общий coordinator обслуживает journal, Learning V2, economy, gifts и другие outbox-потоки с одинаковой семантикой. Его persistent состояние содержит dirty streams, lease, attempts и `nextRetryAt`.

Триггеры:

- sealed local segment;
- восстановление connectivity;
- foreground/resume;
- окончание hydration;
- немедленный best-effort background flush без искусственной задержки;
- достижение persisted retry deadline во время активного приложения.

Backoff с jitter: ориентиры `5s → 30s → 2m → 10m → 1h`, далее capped. Постоянный polling запрещён.

Ошибка upload/pull не очищает dirty bit. Process death не теряет retry state.

### 5.4. Incremental pull

Для каждого известного remote device хранится отдельный durable cursor. Клиент запрашивает только sequence после cursor, применяет сегменты в transaction и сдвигает cursor только после успешного commit.

Запрещены:

- повторное чтение всей облачной истории при каждой локальной операции;
- сравнение полного local snapshot с полным cloud snapshot;
- full upload со stale устройства;
- один глобальный cursor для независимых device streams;
- конфликт-решение через server timestamp.

### 5.5. Checkpoints и новый телефон

Периодический checkpoint содержит:

- версию reducer/schema;
- projection по доменам;
- включённый vector/high-water mark по device streams;
- hash/fingerprint основания;
- ссылку на предыдущий checkpoint при необходимости проверки цепочки.

Новый телефон получает последний валидный checkpoint, затем только tail segments. Checkpoint создаётся после согласованного порога операций/байтов, а не на каждое изменение.

В первом релизе source segments не удаляются автоматически. Политика безопасной garbage collection проектируется отдельно после подтверждения multi-device acknowledgements и rollback window.

### 5.6. Firebase cost policy

- Entitlement/access listener слушает маленький отдельный документ, не весь `users/{uid}`.
- App messages соблюдают TTL; foreground не делает forced refresh без изменения основания.
- League remote data читаются не чаще 6 часов и только при входе на экран клуба, кроме явного pull-to-refresh и смены недели.
- Marketplace, community packs, gifts и friends используют общий cache/store, TTL или один shared listener вместо дублирующих запросов.
- Sync не делает запись при отсутствии новых операций и не делает pull уже применённых segments.

## 6. UX и наблюдаемость

### 6.1. Обычное сохранение

Для ordinary personal operations запрещены:

- toast/alert «облако недоступно», «проверь соединение», «не удалось сохранить»;
- rollback локально committed результата;
- кнопка ручного retry обычного sync;
- блокировка действия по `NetInfo` до local queue;
- ожидание network promise перед UI success;
- logout warning, утверждающий, что локально committed прогресс потерян только из-за отсутствия сети.

В настройках допускается спокойная диагностическая строка:

- `Сохранено на телефоне`;
- `Синхронизация ожидает сеть`;
- `Синхронизировано`.

Она не является ошибкой и не мешает работе.

### 6.2. Видимые внешние ошибки

Ошибка может быть показана, когда без сервера нет честного результата: provider auth, real payment, refund, unique nickname, transfer/gift settlement, competitive action, moderation, AI/voice request без локального fallback. Даже здесь idempotent outbox и pending UI предпочтительнее rollback, если доменный контракт это позволяет.

### 6.3. Внутренняя диагностика

Без user-facing тревоги собираются:

- число и возраст pending segments;
- retry attempts и error class без чувствительного payload;
- cursor lag по устройствам;
- duplicate operation count;
- fingerprint conflicts/quarantine;
- projection replay mismatch;
- checkpoint validation failures;
- Firestore reads/writes по типу sync;
- число user-visible ordinary sync errors, целевое значение — ноль.

## 7. Identity, приватность и account isolation

- Каждый operation и segment содержит `stableUid` и `accountGeneration`.
- Device ID стабилен внутри установки, не является Auth authority и не переносит данные между аккаунтами.
- SQLite namespace логически и криптографически изолирован по аккаунту; ключи хранятся через SecureStore/Keychain.
- После logout очередь владельца запечатывается, но не передаётся следующему пользователю устройства.
- Sync старого аккаунта возобновляется только после повторной авторизации его владельца.
- Account switch использует существующий безопасный wipe/backup contract и не смешивает projections.
- Provider-linked `stableUid` остаётся security anchor и может заменить неподтверждённый anonymous local ID по существующему Auth-инварианту.
- Account deletion сохраняет существующий двухфазный fast-local-exit contract. Универсальный journal не заставляет UI ждать cloud deletion.
- После подтверждённого удаления старые ключи/namespace становятся недоступны; cloud cleanup выполняется отдельным security workflow.

Анонимный новый телефон без provider link не может магически восстановить другой anonymous install. Гарантированный cross-device restore требует подтверждённой связи аккаунта.

## 8. Миграция без потери данных

Полная целевая замена выпускается ступенчато. «Полная замена» описывает конечную authority-модель, а не одномоментный рискованный релиз.

### 8.1. Полный inventory

До production-кода создаётся машинно проверяемый реестр каждого account-scoped legacy key/field:

- домен и reducer;
- portable или device-only;
- personal или external;
- локальный и облачный источник;
- правило import и dedupe;
- legacy mirror/удаление;
- ожидаемый размер и PII-класс.

Неизвестный account key не может молча исчезнуть. Guard падает, пока у ключа нет явной классификации.

### 8.2. `legacy-opening-checkpoint.v1`

Под account lock один раз импортируются:

- account-scoped AsyncStorage;
- `LAST_SYNC_SNAPSHOT` и текущий cloud progress snapshot;
- durable progress/economy/Learning V2/gift outboxes;
- существующие operation ledgers с сохранением исходных operation IDs;
- подтверждённые entitlements как external facts.

Для snapshot-полей без истории действуют консервативные правила:

- XP и cumulative counters: `max`, а не сумма двух snapshot;
- completion/unlock/owned: union;
- best results: max;
- activity dates: union;
- field settings: импорт как opening register с детерминированным приоритетом;
- local value, отличающийся от последнего синхронизированного snapshot, считается unsynced local state и не понижается cloud snapshot;
- external facts не превращаются в personal operations.

Opening checkpoint получает стабильный fingerprint. Повторный запуск миграции возвращает тот же receipt и не удваивает значения.

### 8.3. Shadow mode

Новый journal и reducers сначала работают параллельно старой системе без влияния на UI. Сравниваются:

- projection значения по каждому домену;
- набор operation IDs;
- локальный replay после process restart;
- merge двух и более device fixtures;
- прогноз Firestore reads/writes.

Расхождение не исправляется выбором старого snapshot «по умолчанию»: оно классифицируется и устраняется в importer/reducer.

### 8.4. Local cutover

После shadow gates UI читает `PhoneStateStore`. Старые AsyncStorage/`users.progress` значения временно получают только derived mirrors для совместимости и rollback старого binary.

Legacy mirror:

- не является authority;
- не может понизить journal projection;
- не создаёт новую operation без доказанного legacy mutation;
- имеет явную дату удаления.

### 8.5. Cloud cutover

В одном согласованном изменении вводятся:

- immutable segments, cursors, checkpoints и external event rules;
- индексы;
- Jarvis readers и data-contract guard;
- cost telemetry;
- клиентский incremental transport;
- отключение per-answer `progressSubmitEvent` для migrated cohorts;
- отделение entitlement listener от giant user document.

Только после dual-read/shadow подтверждения Firestore Rules перестают закреплять server authority обычного прогресса. Security validation структуры и ownership сохраняется.

### 8.6. Завершение миграции

После двух стабильных production releases на 100% cohort:

- удаляются старые progress authority paths;
- прекращается legacy mirror;
- удаляются user-facing ordinary sync errors;
- snapshot restore остаётся только миграционным reader для старых версий на установленный compatibility horizon;
- rollback не удаляет новый immutable journal и не откатывает его projections более старым snapshot.

## 9. Verification gates

### 9.1. Reducer algebra

Для каждого домена обязательны property/fixture tests:

- `apply(op, op) == apply(op)`;
- разные порядки одного набора операций дают одинаковый projection;
- grouping/batching не меняет результат;
- checkpoint + tail равен полному replay;
- duplicate segment и retry не меняют результат;
- tombstone не воскресает от старого add;
- неизвестная schema уходит в quarantine и не портит известную projection.

### 9.2. Fault injection

Падение имитируется после каждого шага local transaction, seal, upload, download, apply и cursor advance. Для каждого случая доказывается:

- нет orphan debit/grant;
- нет UI success до durable local commit;
- committed operation не исчезает;
- повтор не создаёт duplicate result;
- cursor не перескакивает неприменённый segment.

### 9.3. Multi-device scenarios

Минимальная матрица:

- два offline-устройства одновременно получают XP и закрывают разные уроки;
- одно удаляет карточку, второе редактирует старую версию;
- оба меняют разные настройки и одно поле одновременно;
- оба тратят один доступный pearl balance;
- новое устройство восстанавливает checkpoint и tail;
- stale устройство возвращается после нескольких месяцев;
- account A выходит, account B входит на том же телефоне;
- provider link меняет anonymous stable ID;
- app killed до/после commit и до/после upload;
- schema upgrade и downgrade старого клиента.

### 9.4. Migration fixtures

Обязательны fixtures реальных форм текущих AsyncStorage/cloud snapshots, включая частично синхронизированные, повреждённые, старые версии, несколько существующих outbox и повторный import. Проверяется отсутствие downgrade, double count и account leakage.

### 9.5. Firestore/security contracts

Rules tests доказывают:

- пользователь создаёт сегменты только своего `stableUid`/account generation;
- сегмент нельзя изменить или удалить после create;
- retry с тем же ID не создаёт вторую операцию;
- другой пользователь не читает личный journal;
- клиент не подделывает external confirmed event/entitlement;
- admin/competitive/economy внешние адаптеры не пишут legacy personal balance;
- новые collections закрыты default-deny правилами;
- Jarvis contract соответствует deployed schema.

### 9.6. Cost budgets

Автоматические trace/contract tests фиксируют:

- урок из 20 ответов: `<= 1` personal progress segment write;
- урок: `0` progress callables и `0` per-answer Firestore transactions;
- foreground без новых данных: `0` progress writes;
- incremental sync не перечитывает ранее acknowledged segments;
- обычная shard/progress операция не сканирует всю историю;
- giant user document не имеет progress listener;
- League foreign data читаются только на club entry с TTL не менее 6 часов, кроме утверждённых исключений;
- app messages/marketplace/gifts соблюдают documented TTL и не дублируют listeners.

### 9.7. UX contracts

Static и behavioral guards запрещают для ordinary personal paths:

- network await до локального success;
- rollback committed projection;
- `Alert`/toast с save/sync/network error;
- offline precondition до journal append;
- manual retry как обязательный путь продолжения.

Целевые production metrics:

- orphan debit: `0`;
- duplicate grant/result: `0`;
- projection downgrade после merge: `0`;
- cross-account data leakage: `0`;
- user-visible ordinary sync errors: `0`;
- lost committed operation: `0`.

## 10. Rollout, stop gates и rollback

Порядок выпуска:

1. Development fixtures и reducer/fault tests.
2. Internal builds с локальным journal и без cloud authority cutover.
3. Production shadow mode, UI продолжает читать старую projection.
4. Cohort 1%.
5. Cohort 10%.
6. Cohort 50%.
7. Cohort 100%.
8. Два стабильных релиза наблюдения.
9. Удаление legacy authority и mirror отдельным проверяемым изменением.

Автоматический stop rollout срабатывает при любом из условий:

- lost/duplicate operation;
- orphan debit или duplicate grant;
- projection downgrade;
- fingerprint conflict выше согласованного security threshold;
- account leakage;
- migration mismatch вне документированного allowlist;
- Firestore cost на активного пользователя выше утверждённого budget;
- рост crash-free regression, связанный с `PhoneStateStore`;
- появление user-visible ordinary sync error.

Безопасный rollback:

- останавливает новый cohort и cloud uploader;
- возвращает чтение UI на совместимый derived mirror только если mirror не ниже journal projection;
- никогда не удаляет новые operations, segments или checkpoints;
- не возвращает server rejection/rollback уже выданных обычных результатов;
- сохраняет возможность исправить reducer и повторить deterministic replay.

## 11. Не входит в эту спецификацию

- автоматическая garbage collection облачной истории до появления доказанной ack/vector policy;
- перенос anonymous аккаунта на другое устройство без provider link/backup;
- превращение competitive, payment или inter-user outcomes в client-authoritative операции;
- изменение продуктовых правил начисления XP/жемчужин, кроме запрета server recalculation после локального commit;
- реализация конкретной SQLite-библиотеки, binary encoding или compression algorithm — они выбираются implementation plan при соблюдении контрактов этого документа;
- удаление существующей функциональности. Все текущие домены должны быть классифицированы и перенесены, а не молча отброшены.

## 12. Definition of done

Архитектурная замена завершена только когда одновременно верно следующее:

- все ordinary personal domains читают и записывают через `PhoneStateStore`;
- UI подтверждает ordinary result после local transaction и не ждёт сеть;
- server progress engine не пересчитывает и не отклоняет валидные personal results;
- все sync retries durable и переживают process death;
- multi-device merge проходит domain-specific reducers без global snapshot winner;
- новый телефон восстанавливается через checkpoint + incremental tail;
- Firestore cost budgets проходят на production-like traces;
- Rules и Jarvis contracts соответствуют новой schema;
- внешние server-authoritative события изолированы от personal journal;
- два стабильных production releases подтверждают нулевые потери, дубли, downgrade и account leakage;
- legacy server-authoritative progress и giant snapshot sync удалены только после выполнения всех gates.
