# Удаление аккаунта: аудит индексов и журналов (12.10.2026)

Режим: только чтение. Источники: `functions/src/account_delete.ts`, `account_delete_job.ts`, `account_delete_worker.ts`,
`account_authority/account_authority_purge.ts`, `accounts_v2_deletion/firestore_ports.ts`, `firestore.indexes.json` (коммит 37e53b290),
деплоенный конфиг `C:/Temp/claude/deployed_indexes.json` (выгрузка 12.10 ~18:41), `firebase functions:log`.
В отчёте только хэши (stableUidHash / runId), без uid и email.

## 1. Итог одной строкой

В проде не хватает ровно 5 индексов группы коллекций (все в одной стадии `collection_group_matches`); все они уже есть в репозитории
(37e53b290) и отсутствуют в проде. Других недостающих индексов в путях удаления нет. После деплоя следующим узким местом станет
**полный перебор `users`** (во всех известных запусках `fallbackFullScan=true`) — риск таймаута 540 с, см. раздел 5.

## 2. Недостающие индексы (нужно задеплоить)

Все пять — fieldOverride с `COLLECTION_GROUP ASCENDING` (плюс `COLLECTION` ASC/DESC/CONTAINS, чтобы не отключить обычные запросы по полю).

| collectionGroup | fieldPath | queryScope (нужен) | В репо | В проде |
|---|---|---|---|---|
| `idea_likes_sent` | `targetAuthorUid` | COLLECTION_GROUP, ASC | да | НЕТ (упало) |
| `user_ideas` | `uid` | COLLECTION_GROUP, ASC | да | НЕТ |
| `idea_reports` | `reporterUid` | COLLECTION_GROUP, ASC | да | НЕТ |
| `idea_reports` | `authorUid` | COLLECTION_GROUP, ASC | да | НЕТ |
| `user_idea_report_rate_limits` | `stableUid` | COLLECTION_GROUP, ASC | да | НЕТ |

Порядок запросов в стадии (`COLLECTION_GROUP_QUERY_SPECS`) показывает, почему упал именно первый: до `idea_likes_sent` выполняется 10 запросов
(messages x4, reactions, poll_votes, votes, activity_likes_received, friend_activity_like_daily_limits, friend_activity_likes_sent) —
в журнале `queriesRun` 312 -> 323, то есть 11-й запрос упал, 10 предыдущих индексов в проде рабочие. Остальные четыре недостающих
упали бы следом, по одному на каждый повтор, если бы поставили только первый.

## 3. Полная таблица «запрос -> индекс -> репо -> прод» по стадиям

Условные обозначения: «авто» = автоматический одиночный индекс уровня коллекции (создаётся Firestore сам; пропадает только если на поле
есть fieldOverride без COLLECTION-scope). Проверено: ни одно поле из `FIELD_QUERY_SPECS` не имеет override в репо или в проде — авто-индексы целы.

### До `collection_group_matches` (в запуске 17:38 все прошли успешно)

| Стадия | Запрос | Нужный индекс | Репо | Прод |
|---|---|---|---|---|
| accounts_v2_receipt | флаг + запись (в проде `flag_off`) | не нужен | - | - |
| permanent_denials | транзакция по docId | не нужен | - | - |
| (resolve closure, до стадий) | `users/account_identity_owner_map/account_merge_outbox` `.where(canonicalStableId / winnerStableId / loserStableId ==)` | авто, коллекция | авто | авто |
| collect_peers | чтение подколлекций `friends`, `friend_gift_history`, `friend_requests_sent` по пути | не нужен | - | - |
| direct_docs | `recursiveDelete` по docId | не нужен | - | - |
| arena_sessions_and_match_history | `arena_sessions.where(playerIds array-contains)` | авто, CONTAINS | авто | авто |
| то же | **`collectionGroup('match_history').where(sessionId ==)`** (выполняется только если у игрока есть `arena_sessions`) | `match_history.sessionId` COLLECTION_GROUP ASC | да | да |
| arena_v2_matches_and_members | `arena_v2_match_private.where(participantStableUids / participantAuthUids array-contains)` | авто, CONTAINS | авто | авто |
| arena_season_entries | `listDocuments` + docId | не нужен | - | - |
| field_matches | ~150 спек `FIELD_QUERY_SPECS` (== и array-contains по одному полю) | авто | авто | авто |

### `collection_group_matches` (24 спеки CG + docId-обходы)

| Запрос (collectionGroup.поле) | Репо | Прод |
|---|---|---|
| messages.authorUid, messages.authorStableUid | да | да |
| reactions.userId, poll_votes.userId, votes.userId | да | да |
| activity_likes_received.fromUid | да | да |
| friend_activity_like_daily_limits.targetUid, friend_activity_likes_sent.targetUid | да | да |
| **idea_likes_sent.targetAuthorUid** | да | **НЕТ** |
| **user_ideas.uid** | да | **НЕТ** |
| **idea_reports.reporterUid / authorUid** | да | **НЕТ** |
| **user_idea_report_rate_limits.stableUid** | да | **НЕТ** |
| friend_gifts_received.fromUid, friend_gifts_sent.toUid, friend_gift_history.peerUid | да | да |
| friend_quest_meta.peerUid, friend_quest_weekly.peerUid | да | да |
| notifications.fromUid, shard_rewards.fromUid, shard_log.targetUid | да | да |
| my_events.payload.fromUid, my_events.payload.targetUid | да | да |
| boosts.activatedBy | да | да |
| docId-обходы `friends`, `friend_requests` | не запросы по `documentId()` в группе: идёт `userRef.collection(x).doc(id)` через `getAll` -> индекс не нужен | - | - |
| `friend_hello_cooldowns` / `blocked` по docId | `get()` по пути -> не нужен | - | - |

### После `collection_group_matches` (в продакшене ещё ни разу не выполнялись — риск был скрыт)

| Стадия | Запрос | Нужный индекс | Репо | Прод |
|---|---|---|---|---|
| email_matches | `website_contact_inbox.where(email ==)` | авто | авто | авто |
| email_contacts | `get()` по хэшу | не нужен | - | - |
| league_groups | `league_groups.where(members.<uid>.uid ==)` | авто (подполе карты) | авто | авто |
| arena_club_events | `arena_club_events.where(members.<uid>.uid ==)` | авто | авто | авто |
| activity_like_stats | **`collectionGroup('activity_like_stats').where(lastFromUid ==)`** | COLLECTION_GROUP ASC | да | да |
| explain_reports_reporters | `explain_reports.where(reporters.<uid> == true)` и `lastReporterStableUid ==` | авто | авто | авто |
| spire_groups_members | `spire_groups.where(members.<uid> != null)` | авто (одиночное поле) | авто | авто |
| banned_users_hash | `get()` по docId | не нужен | - | - |
| friend_gift_daily_limits | `users/{peer}/friend_gift_daily_limits.where(recipients.<uid> > 0)` — запрос уровня подколлекции | авто | авто | авто |
| merge_identity_records | `account_merge_outbox.where(winnerStableId / loserStableId ==)` | авто | авто | авто |
| account_authority_purge | `where(authUidHash ==)`; `where(accountId ==).where(tenantId ==)` — два равенства: слияние одиночных индексов, составной не нужен | авто | авто | авто |
| accounts_v2_purge | `orderBy(documentId()).limit` в подколлекциях (в проде `flag_off`, пропуск) | не нужен | - | - |
| tombstone | запись | не нужен | - | - |

Составные индексы (`where + where` с разными полями + `orderBy`) в путях удаления не используются нигде — везде одно условие + `limit`.
Запросов `collectionGroup(...).where(documentId() ...)` в удалении нет.

### Служебные запросы воркера (`sweepAccountDeletionJobs`, каждые 30 мин)

`account_deletion_jobs.where(nextAttemptAtMs / leaseUntilMs / retentionUntilMs <=)`, `account_deletion_tombstones` и
`account_deletion_auth_markers` `.where(retentionUntilMs <=)` — одиночные диапазоны, авто-индексы, override нет. Крон отрабатывает без ошибок
в журнале (виден только холодный старт каждые 30 мин, 5.10 - окно журнала).

## 4. Расхождение репо и прода (на что смотреть при деплое)

- Составные индексы: совпадают (разница только неявный `__name__` в выгрузке прода).
- fieldOverrides: в репо есть, в проде нет — 5 индексов выше **и** `dialogue_v2_freeform_sessions.expiresAt` (TTL, `ttl:true, indexes:[]`;
  деплой его включит — это задуманная правка приватности, но она поедет вместе с индексами).
- В проде есть, в репо нет — 6 TTL-override `english_test_{attempts,clients,completion_rate_limits,daily,rate_limits,report_rate_limits}.expiresAt`.
  `firebase deploy --only firestore:indexes` по моему знанию поля вне файла не удаляет (удаляются только составные индексы после запроса
  подтверждения), но это НЕ проверялось — перед деплоем посмотреть план CLI; если CLI предложит удалить что-то из этих шести, остановиться и
  добавить их в репо.
- Построение CG-индекса на существующих данных занимает от минут; пока индекс в статусе `CREATING`, запрос по-прежнему падает FAILED_PRECONDITION
  и повтор задачи впустую расходует попытку (максимум 8). Деплоить, дождаться READY в консоли, и только потом будить задачи.

## 5. Журналы: сколько удалений упало

`functions:log` отдаёт нестабильные неполные страницы (одно значение `-n` показывает одно окно времени, другое — другое). Я перебрал `-n` от 1
до 250 для accountDeleteWorker и до 200 для accountDeleteMine/accountDeleteEnqueue и склеил события. Число ниже — нижняя граница.

| Функция | Что видно за доступный период (10.10 ... 12.10; журнал воркера с 6.10) |
|---|---|
| accountDeleteMine | 1 запуск удаления: runId `89fd3ced_1791826656202`, 12.10 17:37:36-17:38:29Z, **failed на `collection_group_matches`** (code 9 FAILED_PRECONDITION, `idea_likes_sent`.`targetAuthorUid`), 53 с, 323 запроса, удалено 42 документа |
| accountDeleteWorker | 2 разных задачи (stableUidHash `2c1cdfe0...` и `8ab721e3...`), 6.10; **4 полностью записанных провала на `collection_group_matches`** (11:37 и 12:37Z, по одному на задачу, ошибка та же самая); ещё 4 попытки (10:36 и 11:06Z) обрываются в журнале посреди стадий без итоговой строки (окно журнала), 13:36Z — только маркеры вызова |
| accountDeleteWorker, 10.10 20:37Z и 12.10 17:37Z | вызовы воркера через ~15 с после `accountDeleteEnqueue` (20:36:54 и 17:36:56) без строк стадий. Это либо пустой запуск «ещё не срок» (14-дневный grace), либо потеря строк окном журнала — по журналу различить нельзя |
| accountDeleteEnqueue | ошибок сервера нет; только предупреждения App Check (принудительная проверка выключена); вызовы 1.10, 3.10, 6.10 (10:30, 14:01), 10.10 20:36, 12.10 17:36 |
| accountDeleteRetryCron | работает каждые :06/:36, ошибок нет |
| accountDeleteCredentialStatus | только предупреждения App Check, 6.10 |

Итого по `stage=failed` (нижняя граница по неполному журналу):
- уникальных runId со стадией `failed`: 5 (воркер: `2c1cdfe0_1791286572657`, `8ab721e3_1791286573063`, `2c1cdfe0_1791290174765`,
  `8ab721e3_1791290174882`; mine: `89fd3ced_1791826656202`);
- **все 5 — на `collection_group_matches`**, одна и та же причина (нет индекса `idea_likes_sent.targetAuthorUid`); других этапов и других причин в
  доступном журнале нет;
- три аккаунта затронуты: stableUidHash `2c1cdfe0`, `8ab721e3`, `89fd3ced`;
- запусков со стадией `done` (успешных удалений) за доступный период: 0.

Все известные запуски показали `collect_peers`: `sentIndexPresent=false, peerCount=0, fallbackFullScan=true` — то есть для этих аккаунтов
(в том числе гостей) стадии `collection_group_matches` (docId-обход), `friend_gift_daily_limits` и обход «Привета» пойдут полным перебором
`users.listDocuments()` (~4-7 чтений на каждого пользователя в базе, 20 параллельно). Стадия `field_matches` одна занимает ~37 с при 295 запросах.
**Риск**: при большом `users` (оценка: больше 15-20 тыс. документов) остаток не уложится в 540 с таймаута -> провал уже на следующей стадии
и повтор по кругу. Размер `users` по журналу не определить — проверить числом документов (консоль) и при необходимости не запускать массовую
реанимацию до решения о сужении перебора.

### 5.1. Замер размеров и стоимость узкого пути (Ядро, 12.10, после 2027e3b2b)

Замер в проде `count()`-агрегатами (только чтение; стоит 1 чтение на 1000 записей индекса, всего около 10 чтений):

| Что | Документов |
|---|---|
| `users` | **5 802** |
| группа `friend_requests` (входящие заявки у получателей) | **38** |
| группа `blocked` | **0** |
| группа `friend_requests_sent` (обратный индекс + маркеры) | 5 154 |
| группа `friends` | 61 |

Стоимость одного удаления (связанные пользователи и три стадии, которые шли полным перебором):
- **Полный перебор (было):** `listDocuments()` трижды по 5 802, плюс на каждого пользователя `getAll` до 4 документов (`friends`/`friend_requests` × два id),
  2 чтения «Привет»+`blocked` и минимум 1 чтение запроса `friend_gift_daily_limits`. Итого **≈ 40–58 тыс. чтений** и минуты работы. Растёт линейно
  с базой: при 20 тыс. пользователей — таймаут 540 с.
- **Обход групп (стало, 2027e3b2b):** 38 + 0 документов, 2 страничных запроса — **≈ 40 чтений** (минимум 1 чтение на пустой запрос), меньше секунды.
  В ~1 000 раз дешевле. Растёт с числом *живых* заявок и блокировок, а не с базой.
- **Потолок 20 000 на группу** — защита от вырождения: в худшем случае 2 × 20 000 = 40 тыс. чтений, то есть столько же, сколько полный перебор сегодня.
  Предложение: снизить потолок до 5 000 (обход всё ещё в 8 раз дешевле перебора), а при достижении 5 000 переходить на путь ниже.

**Путь на будущее — поле вместо обхода (предложение, не сделано, без деплоя):**
1. `users/{to}/friend_requests/{from}`: клиент при создании пишет `fromUid` (= id документа). В `firestore.rules` (create, строка ~2436)
   добавить `request.resource.data.fromUid == senderUid` (необязательным полем, чтобы старые сборки не падали).
2. `users/{blocker}/blocked/{target}`: серверная `friendBlockUser` пишет `targetUid` (= id документа).
3. `firestore.indexes.json` → `fieldOverrides`: одиночные индексы с `queryScope: COLLECTION_GROUP` для `friend_requests.fromUid` и `blocked.targetUid`.
4. В `collect_peers`: `collectionGroup('friend_requests').where('fromUid','==',id)` и `collectionGroup('blocked').where('targetUid','==',id)` —
   платим только за совпадения (обычно 1–5 чтений). Пока старые документы без поля не досеяны (досев — запись в прод, решение владельца),
   оставлять обход групп как сейчас; после досева обход можно убрать.
5. Риск: старые сборки пишут заявки без `fromUid` ещё месяцы, поэтому без досева или обхода узкий запрос пропустит их — переход только с обходом
   в подстраховке.

**Оценка:** при 38 заявках и 0 блокировках новое поле сэкономит ≈ 35 чтений на удаление, а стоит правки клиента, правил, индекса, сервера и досева.
Сейчас оно не окупается. Включать, когда группа `friend_requests` превысит несколько тысяч документов. Отслеживать: в журнале `collect_peers`
есть `groupScanned` — число просмотренных документов на каждое удаление.

**Прицельный деплой для 2027e3b2b** (`executeAccountDeletion` вызывают только эти две функции; `accountDeleteEnqueue`, `adminQueueAccountDeletion`
и крон повтора этот код не исполняют):

```bash
firebase deploy --only functions:default:accountDeleteMine,functions:default:accountDeleteWorker
```

Индексы из раздела 2 деплоятся отдельно (`firestore:indexes`) и **раньше** функций: без индекса `idea_likes_sent.targetAuthorUid` удаление
по-прежнему упадёт на `collection_group_matches`. Повторная постановка трёх удалений — `scripts/account_delete_requeue_failed_2026-10-12.mjs`
(7f5e79b0d): сначала без флагов (только чтение, проверит индексы), `--apply --owner-yes` — только по «да» владельца.

## 6. Автоповтор: что есть, чего нет

| Путь | Повтор | Детали |
|---|---|---|
| Очередь `accountDeleteEnqueue` -> задача `account_deletion_jobs` -> воркер `accountDeleteWorker` (триггер на запись документа) | ДА | Ошибка стадии: задача возвращается в `queued`, `nextAttemptAtMs = now + backoff` (30 с, 60 с, 120 с ... потолок 30 мин), `lastError` с текстом `account_delete_failed at <стадия> \| <код> \| <сообщение>`. Лимит 8 попыток, затем `status=failed` |
| Крон `accountDeleteRetryCron` каждые 30 мин (`sweepAccountDeletionJobs`) | ДА, но только для `queued/running` | Берёт до 20 просроченных по `nextAttemptAtMs` и до 20 с истёкшей арендой, пишет `retryRequestedAtMs` -> снова срабатывает воркер. Задачи `failed` и `completed` пропускает |
| Задача `failed` (8 попыток исчерпано) | НЕТ автоматически | Оживает только новой постановкой того же `authUid`: `accountDeleteEnqueue` (клиент) или админ `adminQueueAccountDeletion` — оба вызывают `enqueueAccountDeletionJob`, который переводит `failed -> queued, attempts=0, nextAttemptAtMs=now` |
| Grace 14 дней | - | Новая задача получает `nextAttemptAtMs = now + 14 дней`; воркер до срока ничего не делает. Постановки 10.10 20:36 и 12.10 17:36 (если сервер их принял) выполнятся ~24.10 и ~26.10 — к тому времени индексы должны быть в проде |
| **`accountDeleteMine` (прямой вызов)** | **НЕТ** | Выполняет удаление синхронно, задачу НЕ создаёт; перед стартом ставит маркеры `pending` и вечные запреты (`fenceAccountDeletionRoots`). Провал = недоудалённые данные + маркеры без задачи; крон ничего не видит (он ходит только по `account_deletion_jobs`). Грейс-период Mine обходит |
| Клиент `retryGuestServerDeletionOnce` (`app/auth_provider.ts`) | частично | Один ограниченный повтор при старте/возврате, шлёт **`accountDeleteEnqueue`**, а не Mine; повторяет только при «временном» отказе (регулярка `unavailable|deadline|timeout|network|offline`) и только если замок удаления (`pendingDeleteLock`) записан. Ответ сервера `internal` (наш случай: `account_delete_failed at ...`) считается не временным -> замок сходится локально, повторов нет |
| Клиент `ensureAccountDeleteCredentialSafe` | не про данные | Для связанных (не гостевых) аккаунтов дожимает постановку и квитанцию `credential_safe` (ключ из SecureStore), НЕ повторяет сами стадии удаления |
| Гость без замка (`guestDirectDeleteOperation`) | НЕТ | Единственный выстрел прямого Mine; результат не проверяется, повтора нет |

Механика 12.10 17:37 по журналу: постановка стартовала в 17:36:56 (холодный старт ~9 с > клиентский дедлайн 8 с), через ~20 с ушёл запасной прямой
Mine (17:37:26) -> провал. То есть Mine-путь здесь — результат тайм-аута постановки, а не выбор.

## 7. Что произойдёт после деплоя индексов

1. Пока индексы строятся (`CREATING`) — запросы всё ещё падают, обновлять ожидание не нужно, ждать READY.
2. Задачи воркера в `queued` (если у двух известных аккаунтов остались попытки из 8) подхватит крон (:06/:36); они стартуют стадии заново
   (идемпотентно, `ctx.seen` пуст, ранние стадии быстро находят остаток) и впервые дойдут до стадий после `collection_group_matches`.
3. Задачи уже в `failed` (по расчёту времени это вероятно: 8 попыток при шаге 30 мин заканчиваются за ~4 ч, а журнал 6.10 показывает попытки
   с 10:36 до 13:36) **не оживут сами** — нужна повторная постановка (админский `adminQueueAccountDeletion` либо `enqueue` с клиента). Состояние
   задач журналом не определить: прочитать `account_deletion_jobs` по `stableUidHash` (поле хранит полный sha256; префиксы из журнала —
   `2c1cdfe032ffeed2`, `8ab721e3285be960`, `89fd3ced0c0d39df`) — это операция владельца/админа.
4. Аккаунт `89fd3ced` (Mine 12.10): задачи у него может не быть вообще (если постановка не дошла). Его данные: 42 документа удалены
   (`users/{uid}` и поддерево), маркеры `pending` и вечные запреты стоят, остаток (field/CG-совпадения, все стадии после) — нет. Нужна ручная
   постановка через админку, иначе остаётся персональный хвост (риск для политики приватности: срок «удалено» не выполняется).
5. Ожидаемое новое узкое место: полный перебор `users` (см. раздел 5), затем возможные недоступные раньше стадии (league_groups: стадия
   бросает `league_group_delete_no_progress`, если документ найден по запросу, но участника в нём нет — по коду маловероятно, но стадия ни разу
   не выполнялась в проде).

## 8. Что рекомендовано сделать (решения владельцу/координатору)

- Задеплоить `firebase deploy --only firestore:indexes` (проверить план CLI: нет ли удалений `english_test_*`), дождаться READY всех пяти.
- Прочитать `account_deletion_jobs` по трём хэшам, понять статусы и `attempts`; для `failed` — повторно поставить через админку.
- Решить про узкий перебор `users` (индекс исходящих заявок `friend_requests_sent` отсутствует у этих аккаунтов): прежде чем массово
  реанимировать, посчитать размер `users`.
- Добавить в журнал воркера итоговую строку на ранних выходах `processAccountDeletionJob` (`return null` без логов) — сейчас по ним нельзя
  отличить «ещё не срок» от потери журнала.
- Рассмотреть задачу «Mine-провал создаёт задачу» (иначе у прямого пути нет повтора) — отдельное решение, в этот отчёт не входит.
