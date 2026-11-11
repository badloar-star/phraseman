# Referral Classic: два учебных дня для Plus

Дата решения: 2026-11-02  
Статус: design only; production-код, deploy, выдача наград и live Firebase не менялись.

## Решение в одном абзаце

Условно рекомендуется **вариант A**: засчитывать для Classic только впервые созданную сервером запись о строгом аутентифицированном completion claim и считать день исключительно по UTC-времени закоммиченной серверной транзакции. У текущих Classic progress events и V2 summary один **класс authority** — клиент заявляет завершение, сервер не проверяет ответы. Но это ещё не structural parity: текущий свободный Classic payload слабее строгого V2 summary contract. A становится не слабее V2 только после реализации всех schema, generation, replay, server-time и referral-integration условий ниже. До этого production implementation не разрешена. Это не доказательство правильных ответов и не server grading.

## Проверенный действующий уровень доверия V2

Текущий V2-путь не имеет серверной проверки ответов:

- receipt объявляет `answerPayload: "absent"`, `serverEvaluationAuthority: "none..."` и `evidenceAuthority: "none"`;
- сервер проверяет auth UID, stable UID, generation, отсутствие tombstone и структурную корректность summary;
- идемпотентность определяется документом из `stableUid + releaseId + lessonId + courseSessionId + sessionRunId`;
- день ставится только при создании новой inbox-записи, по `Date.now()` сервера; повтор `existing` день не ставит;
- trusted course head является отсечением версий, а не защитой от изменённого клиента.

Следовательно, Classic может использовать тот же client-assertion authority class, но не вправе называться доказательством прохождения или правильности ответов. Равенство authority class само по себе не доказывает parity структуры, identity binding и replay semantics.

## Authority class и structural parity — разные утверждения

- **Уже подтверждено:** и V2, и предлагаемый A принимают клиентское заявление без server answer evaluation.
- **Ещё не реализовано:** строгая Classic claim schema, server-bound account generation, отдельный referral fingerprint, commit-attempt server time, durable outbox и provenance-aware referral processing.
- **Условие рекомендации:** только полный набор ниже делает A не слабее действующего V2 по structure/auth/generation/idempotency/time. Нельзя реализовать лишь day marker поверх текущего свободного `progressSubmitEvent` и назвать это parity.

## Вариант A — минимальный целевой контракт; parity условна

### 1. Строгая Classic claim schema

Источник Classic — отдельное versioned тело `referral-classic-completion-claim.v1`, принимаемое рядом с обычным progress event, но разбираемое строгим parser. Canonical body имеет **ровно** следующие ключи, без дополнительных полей:

| key | точный контракт |
|---|---|
| `schemaVersion` | literal `referral-classic-completion-claim.v1` |
| `eventId` | transport ID, `^[A-Za-z0-9._:-]{1,180}$` |
| `accountScope` | server-issued `account:<stableUid>:generation:<N>` |
| `accountGeneration` | safe integer `N >= 1`, совпадает с scope |
| `route` | literal `classic_course_lesson` |
| `classicCourseContractId` | `^[a-z0-9._:-]{1,96}$`, значение из append-only server allowlist |
| `target` | только `en` или `fr`; неизвестное значение не нормализуется в `en`, а отклоняется |
| `lessonId` | integer `1..32`, присутствует в membership map выбранного contract ID и target |
| `attemptId` | `^[A-Za-z0-9._:-]{16,128}$`, создаётся при открытии обычного урока и остаётся неизменным до completion |
| `passed` | literal `true`; это client assertion, не server verdict |

UTF-8 canonical JSON всего body — не более **1,024 bytes**. Parser требует plain object, exact-key set, точные literal/type/range проверки и canonical serialization v1; score, progress arrays, appVersion, platform, timestamps, assessment IDs и произвольные дополнительные ключи в eligibility body запрещены.

`classicCourseContractId` задаёт точный append-only manifest `{ target -> allowed lessonIds }`. Для v1 поддерживаются только обычные Classic targets `en|fr` и уроки `1..32`, причём конкретный lesson обязан существовать в manifest данного target/revision. Contract ID публичен, поэтому, как trusted head V2, служит version cutoff, а не anti-fraud proof.

Обычный `progressSubmitEvent` старых клиентов продолжает синхронизировать прогресс. Но без отдельного строгого claim body он не создаёт referral provenance или day. `exam_complete`, diagnostic, assessment, migration и любые тестовые/экзаменационные routes не могут быть преобразованы в claim.

### 2. Durable queue и account-generation fence

Клиент получает server-bound context только через callable `getReferralClassicAccountContextV1`:

- request — plain object ровно `{ schemaVersion: "referral-classic-account-context-request.v1" }`;
- response — plain object ровно `{ schemaVersion: "referral-classic-account-context.v1", stableUid, accountGeneration, accountScope, issuedAtMs, expiresAtMs, bindingFingerprint }`;
- `accountScope = account:<stableUid>:generation:<accountGeneration>`, lifetime ровно 15 минут, `bindingFingerprint = sha256(canonicalJsonV1(response без bindingFingerprint))`;
- server выдаёт response только после auth-link/user/tombstone/current-generation checks. Fingerprint обнаруживает corruption, но не заменяет повторную серверную проверку.

Клиент принимает context только если текущий локальный active account имеет тот же stable UID, response exact/canonical, `issuedAtMs <= now < expiresAtMs`, generation safe integer и fingerprint совпал. Context немедленно invalidated при logout, account transition, stable UID change, expiry или получении нового context. Queue items прежнего context перемещаются в quarantine и никогда не перепривязываются. Ошибка/timeout handshake означает: обычный progress может сохраниться, но referral claim не создаётся. Локальный runtime generation counter ни при каких условиях не записывается как server `accountGeneration`.

Claim создаётся в durable queue в момент завершения урока и получает неизменяемую привязку:

- storage key: `referral_classic_claim_queue_v1::<accountScope>`;
- queue envelope имеет ровно `schemaVersion: referral-classic-claim-queue-item.v1`, `claim`, `createdAtDeviceMs`, `retryCount`, `lastAttemptAtDeviceMs`; transport metadata не входит в eligibility fingerprint и не принимается сервером как evidence;

- `accountScope` и `accountGeneration` захватываются из активного server-bound account context при создании queue item, а не при последующей отправке. Это не локальный runtime-only `accountScopeKey`: binding получен из серверно подтверждённой identity/generation handshake;
- локальный queue key включает account scope и event ID; drain не переносит item на другой аккаунт или generation;
- клиент отправляет эти два поля без перепривязки. Если active account context изменился, item остаётся stale/quarantined и не даёт referral evidence;
- old clients без server-issued scope/generation продолжают обычный progress sync, но не создают referral days.

В одной Firestore transaction сервер повторно читает и проверяет:

1. `auth_links/{authUid}.stable_id === stableUid`;
2. `users/{stableUid}` существует и не скрыт;
3. `account_deletion_tombstones/{stableUid}` отсутствует;
4. current `users.accountGeneration|generation === claim.accountGeneration`;
5. `claim.accountScope === account:<stableUid>:generation:<currentGeneration>`.

Любое расхождение — fail-closed без receipt/day/outbox. Queue evidence старого поколения не может быть принято новым поколением аккаунта, даже если stable UID совпал.

### 3. Отдельный referral fingerprint и replay contract

Referral eligibility не использует общий progress fingerprint. Сервер строит:

`eligibilityFingerprint = sha256(canonicalJsonV1(eligibilityBody))`, где `eligibilityBody` имеет ровно:

- `schemaVersion = referral-classic-eligibility.v1`;
- resolved `stableUid`;
- checked `accountGeneration`;
- `route`;
- `classicCourseContractId`;
- `target`;
- `lessonId`;
- `attemptId`;
- `passed = true`.

`eventId`, `clientLocalDate`, `clientCreatedAt`, app/platform, queue timestamps, score, progress и retry counters исключены как transport/unstable fields.

В той же транзакции сервер использует два server-only индекса:

- `users/{stableUid}/referral_classic_claim_event_ids_v1/{sha256(exactEventId)}` с exact fields `schemaVersion`, exact `eventId`, `accountGeneration`, `eligibilityFingerprint`, `receiptId`;
- `users/{stableUid}/referral_classic_claim_receipts_v1/{receiptId}`, где `receiptId = rc1_<sha256(accountGeneration + eligibilityFingerprint)>`, с exact fields `schemaVersion`, `receiptId`, `stableUid`, `accountGeneration`, canonical `eligibilityBody`, `eligibilityFingerprint`, `acceptedAt`, `acceptedDayUtc`, `authority: client_asserted_completion`, `answerPayload: absent`, `serverEvaluationAuthority: none`.

Replay rules:

- тот же `eventId` + тот же fingerprint → exact duplicate, без нового дня/outbox;
- тот же `eventId` + другой canonical eligibility body → conflict/fail-closed;
- новый `eventId` + уже существующий fingerprint → semantic duplicate, без нового дня/outbox;
- новый `attemptId` создаёт отличимый claim. Именно `attemptId`, а не timestamp/eventId, различает две попытки одного урока; он клиентский и не доказывает реальную попытку, что остаётся частью residual risk A.

### 4. Provenance первого урока и 500 монет

Первый qualifying Classic receipt атомарно обновляет server-only документ поколения:

`users/{stableUid}/referral_learning_generations_v1/{accountGeneration}`

с точными полями `schemaVersion: referral-learning-generation.v1`, `stableUid`, `accountGeneration`, `firstClassicReceiptId`, `classicDay1Utc`, `classicDay2Utc`, `updatedAt`. `classicDay2Utc` равен `null` до второго distinct day; поле не опускается. Первое receipt ID неизменно; direct client access ко всем трём subcollections запрещён Rules.

Переход «`firstClassicReceiptId` отсутствовал → появился» является единственным Classic-триггером первого завершённого урока. Он не выводится из `lessons_completed`, `completed_lessons`, `pass_count`, `lesson1_pass_live`, migration или произвольного `users.progress`.

Экономика не меняется: **500 монет пригласившему и 500 приглашённому** при выполнении существующих правил свежести аккаунта, 30-дневного окна приглашения, monthly cap и остальных отказов. Действующие pair ledger IDs остаются последним идемпотентным барьером начисления.

### 5. Авторитетное acceptedAt и два серверных дня

Каждая Firestore transaction callback attempt после чтения identity/generation/duplicate state вызывает `Timestamp.now()` **внутри callback**, вычисляет `acceptedDayUtc = floor(acceptedAt.toMillis() / 86_400_000)` и атомарно сохраняет exact `acceptedAt`, receipt и нужный transition day. Outbox создаётся атомарно только если receipt породил первый-completion и/или новый distinct-day transition.

- если Firestore повторяет callback, предыдущая выборка времени не авторитетна;
- если retry пересёк UTC-полночь, authoritative day — день `acceptedAt` именно той callback attempt, которая успешно committed;
- `FieldValue.serverTimestamp()` без сохранённого числового day недостаточен, потому что его нельзя использовать для решения внутри той же транзакции;
- все клиентские даты/timestamps полностью игнорируются.

Первый уникальный Classic day становится `classicDay1Utc`; тот же день ничего не добавляет; первый отличный day становится `classicDay2Utc`; после двух дней новые receipts не меняют day set. Receipt всё равно может сохраниться как duplicate-safe audit fact, но не создаёт eligibility transition.

Immutable `receipt.acceptedAt` — **единственный** Classic `lessonAtMs` для проверки 30-дневного invite window. Consumer time, retry time, apply time и client time не могут его заменить. При первом reward processing exact `acceptedAt` и `receiptId` сохраняются в attribution (`ladderLessonPassedAtMs`, `ladderLessonReceiptId`) и остаются неизменными при monthly-cap waiting, delayed consumer, referral-apply catch-up и cooldown/list retries. Plus cooldown по-прежнему сравнивает текущий server retry time с последним фактическим grant time; receipt time сохраняет provenance/lesson window, но не сдвигает cooldown clock.

### 6. Marker names, generation и смешивание Classic/V2

Дни образуют **единое множество server UTC days** из двух разрешённых источников:

- legacy V2 server-received completion summary;
- Classic receipt days `classicDay1Utc/classicDay2Utc` из документа **текущего account generation**.

`referralLearningDaysV1` строит set из current-generation Classic days и legacy `users.progress.lv2_srv_day1/lv2_srv_day2`, удаляет invalid/duplicate values и считает eligible только при `set.size >= 2`. Один V2-день и один отличный Classic-день дают два дня; V2 и Classic в один UTC-день дают один день. Legacy V2 keys остаются grandfathered и не переписываются.

Generation/merge contract:

- receipt, event-ID index и generation document всегда включают checked server generation;
- новая account generation получает новый document ID и не может использовать Classic receipts/days старой generation;
- account deletion удаляет user subcollections; stale queue item старой generation отклоняется;
- обычный auth/account merge не переносит и не объединяет Classic days через `max` или progress snapshot;
- перенос Classic receipt между stable UIDs допустим только отдельной server merge transaction с проверенными source/target generations и неизменным receipt fingerprint; такой merge не входит в A;
- действующее grandfathered merge-поведение legacy V2 keys не меняется, но оно не делает старые Classic claims допустимыми.

Уже выданные монеты, Plus tiers и существующие V2-дни неизменны. Classic progress snapshots, созданные до rollout, не превращаются в дни задним числом. Исторический Classic-день допустим только при отдельном owner-approved lazy reconciliation из уже существующей server-created progress-event ledger с её `createdAt`; такой reconciliation не входит в минимальную реализацию A. Без него пользователь получает Classic day только за новое qualifying событие после rollout.

### 7. Durable trigger/outbox и referral integration

Та же transaction, которая впервые создаёт receipt, создаёт server-only outbox **только при реальном eligibility transition**:

`referral_eligibility_outbox_v1/{receiptId}` с exact fields `schemaVersion`, `receiptId`, `stableUid`, `accountGeneration`, `eventKinds`, `acceptedAt`, `acceptedDayUtc`, `state`, `attemptCount`, `lastErrorCode`. `eventKinds` — canonical ordered non-empty array (maximum 2) из `first_classic_completion`, `learning_day_changed`; `state` — `pending|processed|terminal`, initial `pending`; `attemptCount` initial `0`; `lastErrorCode` initial `null` и затем bounded non-sensitive code.

Первый receipt даёт `first_classic_completion` и day 1; первый отличный day даёт `learning_day_changed`. Same-day receipt после первого и любой receipt после day 2 остаются audit-only: receipt сохраняется, generation document не меняется, outbox не создаётся. Если transition требует outbox, но receipt/day/outbox нельзя записать одной транзакцией, вся транзакция abort — частичного marker без retry anchor быть не может.

Consumer работает идемпотентно:

- `first_classic_completion` вызывает provenance-aware `processReferralLadderLesson(..., trigger: classic_receipt, receiptId, accountGeneration)`;
- функция внутри reward transaction повторно читает receipt/generation document и текущую generation; generic `contestLessonsCompleted` не является Classic fallback;
- referral-apply catch-up для уже завершившего урок друга читает current-generation `firstClassicReceiptId`, а не progress snapshot;
- `learning_day_changed` вызывает `processLadderPlusEligibility` по union-reader; переход ко второму distinct day запускается один раз;
- list retry/cooldown retry также перепроверяет provenance и current generation;
- outbox становится `processed` только после успешного результата; ошибка оставляет `pending` с bounded retry metadata. Pair coin ledger, eligible-row state и Plus tier ledger делают повтор безопасным;
- если receipt transaction committed, но trigger не запустился, durable pending outbox остаётся обнаруживаемым scheduled retry. Fire-and-forget после callable без outbox запрещён.

Referral attribution для A при apply атомарно сохраняет `referrerAccountGenerationAtApply` и `refereeAccountGenerationAtApply`. Перед **любой** economy mutation каждый coin/Plus/outbox consumer и retry transaction (`processReferralLadderLesson`, referral-apply catch-up, monthly-cap/list retry, `processLadderPlusEligibility`, cooldown claim/grant, outbox retry) повторно проверяет для evidence owner и каждого reward recipient: user существует, `identityHidden !== true`, tombstone отсутствует, current server generation совпадает с generation, сохранённой в receipt/outbox и attribution. Для referee receipt/outbox generation также обязан совпасть с `refereeAccountGenerationAtApply`; для referrer current generation — с `referrerAccountGenerationAtApply`. Проверка выполняется в той же transaction до ledger/stats/attribution/grant mutation; кэш или первоначальная receipt-проверка её не заменяют. Pending A-row без обеих apply-generation bindings fail-closed; уже выданная история не переписывается.

Если user отсутствует, скрыт, tombstone существует или generation устарела, результат `terminal_deleted_or_stale`: economy mutation не выполняется, outbox переводится в `terminal` с `lastErrorCode: account_deleted_or_generation_stale` либо удаляется account-deletion worker. Это terminal outcome, scheduled retry запрещён; в частности deletion никогда не является временной ошибкой.

Top-level `referral_eligibility_outbox_v1` обязательно входит в account-deletion query plan по `stableUid == deletedStableUid`; account deletion удаляет все pending/processed/terminal rows до завершения. Query coverage и deletion regression проверяют строки удаляемого UID, сохранение чужих строк, batching и idempotent retry.

Ни один путь (`users` trigger, referral apply, list retry, outbox retry) не имеет snapshot fallback для Classic.

### 8. Plus и устройство

Экономика и ограничения остаются без изменений:

- каждые 3 eligible friends дают 14 дней Plus;
- выдача — не чаще одного tier за 30 дней; заработанный tier не теряется;
- existing `plus_grant_ledger` остаётся единственным идемпотентным источником выдачи;
- известное совпадение push-token hash означает `same_device` и permanent `not_eligible`;
- если один из token hashes неизвестен, сохраняется действующая семантика `two_days_device_unknown`: друг может стать eligible. Это best-effort device check, не строгая device authority;
- monthly cap, fresh-account, self-referral, account/window и прочие действующие ограничения не ослабляются.

### 9. Fail-closed

День и provenance не пишутся, если:

- auth/stable UID/generation не подтверждены или аккаунт удаляется;
- exact-key/size/canonical claim validation не пройдена или route не `classic_course_lesson`;
- durable queue не содержит creation-time server-bound account scope/generation;
- lesson ID/target не входят в поддерживаемый Classic contract;
- `classicCourseContractId` отсутствует или не находится в append-only allowlist;
- event ID связан с другим eligibility body, stale generation обнаружена или auth/user/tombstone checks не пройдены;
- transaction с eligibility transition не может атомарно создать receipt, generation transition и required outbox. Для audit-only same-day/post-day2 receipt отсутствие outbox является контрактом, а не ошибкой.

Ошибка обновления referral eligibility не должна превращаться в повторную награду: ledger и существующие pair/tier receipts обеспечивают безопасный retry. Удаление/hidden user/tombstone/stale generation — terminal, не retryable.

### 10. Честная формулировка риска

Точный пример оставшегося риска A:

1. В первый UTC-день аутентифицированный изменённый клиент отправляет строгий claim с допустимыми contract/target/lesson, `passed: true` и выдуманным `attemptId`, не проходя задания.
2. На следующий серверный UTC-день он отправляет второй strict claim с новым выдуманным `attemptId`.
3. Сервер может подтвердить auth, уникальность двух ledger records и два времени приёма, но не правильность ответов; после остальных проверок друг получает два учебных дня.

Это тот же client-assertion authority class, что у V2: изменённый клиент может отправить две структурно корректные completed summaries с разными client-controlled session/run identifiers и публичной trusted course head, при том что сервер явно не получает и не проверяет ответы. Structural parity и утверждение «A не слабее V2» допустимы только после реализации **всех** clauses 1–11; частичная реализация не авторизована.

### 11. Allowlist guard и безопасный порядок поставки

Append-only `CLASSIC_REFERRAL_COURSE_CONTRACTS_V1` хранит exact contract ID, target и membership уроков. Guard обязан сравнивать текущие shipped Classic manifests с allowlist и ломать build, если новый contract/revision отсутствует. Старый contract ID без отдельного owner decision не удаляется, чтобы уже опубликованный клиент не потерял eligibility.

Порядок поставки обязателен:

1. Добавить contract schema/parser, allowlist и guard с тестами; flag остаётся off.
2. Добавить deny-by-default Rules для receipt/event-index/generation/outbox collections и server-owned projections.
3. Добавить server writer, union-reader, provenance-aware reward integration и retry consumer; добавить top-level outbox в account-deletion query plan/coverage; flag остаётся off.
4. Deploy server/Rules **до** клиента, который отправляет новый contract ID. Этот документ deploy не разрешает.
5. Выпустить клиент с generation-bound durable queue; старые клиенты продолжают progress sync без referral days.
6. Проверить staged telemetry/gates, затем отдельным owner-approved действием включить flag и только после backend readiness менять How/Share copy с «Новом курсе» на «Курсе».

Если allowlist/server support ещё не развёрнуты, клиентский claim fail-closed и остаётся retryable; он не деградирует в snapshot qualification.

## Вариант B — строгая server answer authority (не default)

Сервер создаёт attempt/challenge, привязывает UID, generation, lesson/content revision, nonce и expiry, хранит versioned answer manifests, принимает сырые ответы, сам рассчитывает pass и создаёт immutable completion receipt. Только такой receipt даёт первый урок и учебный день.

Плюсы: изменённый клиент не может заявить `passed: true` без допустимых ответов.  
Минусы: это отдельная крупная задача — новый Classic protocol, manifests, client wiring, Rules, migration/compatibility и расширенная security review. Владелец её сейчас не заказывал.

## Почему A рекомендуется условно

A — минимальный **целевой контракт**, который может выполнить owner decision «обычный Курс + два учебных дня», не переоткрывая весь Classic backend. Сейчас он описан, но не реализован, поэтому recommendation не является implementation authorization. После полного TDD-выполнения clauses 1–11 и fresh critical review A может быть признан не слабее V2 по structural/generation/replay/integration guarantees, оставаясь без answer authority. B следует выбирать только отдельным решением владельца, если требуется защита от modified client.

## Обязательные TDD-гейты перед production change

1. Account-context callable принимает/возвращает только exact schema; wrong auth/link/user/tombstone/generation, expiry и corrupt fingerprint fail-closed.
2. Logout/account switch/expiry quarantine queue; handshake failure сохраняет обычный progress без referral claim; runtime counter никогда не становится server generation.
3. Strict parser принимает только exact 10-key body ≤1,024 UTF-8 bytes; extra/wrong route/target/lesson/contract отклоняются.
4. Queue item сохраняет creation-time scope/generation; account switch и stale generation не переадресуют evidence.
5. Receipt writer transactionally проверяет auth link, user exists, `identityHidden !== true`, tombstone absent, current generation и exact account scope.
6. Новый fingerprint receipt создаёт first-completion provenance и day 1.
7. Same event/same body — duplicate; same event/different body — conflict; new event/same fingerprint — semantic duplicate.
8. Fingerprint не меняется от client timestamps, score, progress, app/platform или retry metadata; новый attempt ID различает claim.
9. Transaction retry через UTC midnight сохраняет acceptedAt/day именно committed callback attempt.
10. Два claims в один server UTC day дают один день; следующий distinct server day даёт day 2.
11. Same-day после day 1 и любой post-day2 claim сохраняют audit receipt, не меняют generation document и не создают outbox.
12. `exam_complete`, assessment, diagnostic, migration, snapshot, старый свободный progress event и прямой progress update не дают provenance/day.
13. Один legacy V2 day + один отличный current-generation Classic day дают eligibility; одинаковый day — нет.
14. Новая generation не наследует Classic days; stale queue/receipt и неавторизованный merge не учитываются.
15. Apply сохраняет generations обеих сторон; каждый coin/Plus/apply/list/cooldown/outbox consumer transaction повторно проверяет users, `identityHidden`, tombstones и обе current generations до economy mutation.
16. Deleted/hidden/tombstoned/stale generation даёт terminal outcome без retry и без coin/stats/Plus mutation.
17. Referral apply catch-up, users trigger, list retry и outbox retry используют receipt provenance без snapshot fallback.
18. `receipt.acceptedAt` — единственный `lessonAtMs`: delayed consumer внутри invite window проходит; outside window отказывается независимо от consumer time.
19. Monthly-cap waiting, next-month retry и referral-apply catch-up сохраняют exact receipt acceptedAt/ID; cooldown clock остаётся привязан к actual grant time.
20. Упавший consumer оставляет durable pending outbox; retry не удваивает pair coins, eligible count или Plus tier.
21. Account-delete query plan содержит `referral_eligibility_outbox_v1.stableUid == deletedUid`; тесты удаляют все rows владельца, сохраняют чужие, проверяют batching/idempotent retry.
22. Same known device остаётся `not_eligible`; unknown device сохраняет действующее поведение.
23. 500/500, 3 friends, 14 days, 30-day cooldown, monthly cap и 30-day invite window неизменны.
24. Rules запрещают client access к новым collections/markers; Jarvis и course-contract guards знают их.
25. Старые клиенты синхронизируют progress, но не создают days; server-first rollout и flag-off порядок проверяется.
26. Все 9 локалей меняются на «Курс / Course» только после readiness и не обещают server-verified answers.

## Граница разрешения

Этот документ закрывает выбор A/B, но **не авторизует реализацию**, пока fresh critical review не подтвердит полноту clauses 1–11 как implementable task packet. Отдельное owner approval требуется после этого review. В любом случае не разрешены deploy, live Firebase mutations, backfill, фактическая выдача наград, commit/release и самовольный переход к варианту B.

## Источники фактов в коде

- `functions/src/learning_v2/course_session_completed_summary_callable_v1.ts:39-68, 180-219, 223-307`
- `functions/src/progress_events.ts:339-376, 619-653, 790-978`
- `functions/src/referral_ladder_plus.ts:1-18, 43-99, 114-157`
- `functions/src/referral_ladder_server.ts:116-152, 168-319, 397-402`
- `functions/src/referral_ladder.ts:1-22, 59-90`
- `functions/src/community_month_tally.ts:68-86`
- `functions/src/referral.ts:820-840`
- `firestore.rules:451-497, 1137-1154`
- `components/referral_ladder_strings.ts:18-34`
- `app/account_generation.ts:5-67`
- `app/account_scope_key.ts:3-10`
- `functions/src/account_delete.ts:220-400`
- `functions/src/account_delete_coverage_gaps.test.ts:20-50`
