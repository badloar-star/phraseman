# Arena V2 — implementation handover

Статус на 2026-08-11: **implemented locally, not deployed**.

Это описание текущего snapshot, а не будущая архитектура. Код, client routes,
Rules, Indexes и tests находятся в checkout. Production config не создан этой
работой; Functions, Firestore и app binary не деплоились. Device QA не было.

## 1. Источники реализации

| Область | Файлы |
|---|---|
| Pure product/core | `functions/src/arena_v2_core.ts`, `functions/src/arena_expansion_core.ts` |
| Callables/scheduler | `functions/src/arena_v2.ts`, `functions/src/arena_expansion.ts`, export в `functions/src/index.ts` |
| Client transport/listeners | `app/arena_client.ts` |
| Routes | `app/arena*.tsx`, регистрация в `app/_layout.tsx` |
| Client domain/UI | `modules/arena/*`, `components/arena/*` |
| Deep link | `app/+native-intent.tsx` |
| Access/indexes | `firestore.rules`, `firestore.indexes.json` |
| Erasure | `functions/src/account_delete.ts` |

Не менять Tournament, Learning V2, admin или legacy Arena как side effect.
Arena читает только опубликованный `tournamentTasks`; Tournament runtime и
release flag остаются отдельными.

## 2. Runtime namespaces

### Root collections

| Path | Authority и назначение |
|---|---|
| `arena_v2_config/current` | server-only config/kill switches |
| `arena_v2_profiles/{stableUid}` | rating, rank, stats, profile-level pity, active match, invite counters |
| `arena_v2_queue/{stableUid}` | owner-readable queue ticket |
| `arena_v2_queue_locks/{quick|ranked}` | server-only per-mode transaction contention doc |
| `arena_v2_matches/{matchId}` | participant-safe public live projection |
| `arena_v2_match_private/{matchId}` | server-only tasks, identities, bot plan, answers, totals, rewards |
| `arena_v2_invites/{sha256(token)}` | server-only invite identity/status |
| `arena_v2_pair_limits/{hmacPairHash_day}` | server-only Ranked reservation/cooldown/day cap |
| `arena_v2_daily_private/{day_band}` | server-only sealed Today snapshots |
| `arena_v2_ghosts/{ghostId}` | server-only Ghost identities, tasks, host plan и result |
| `arena_v2_series/{seriesId}` | server-only Rivalry coordination, identities и score |
| `arena_v2_partnerships/{hmacPairId}` | server-only Partner relationship/progress projection |
| `tournamentTasks/{taskId}` | read-only content source; not owned by Arena |

### Nested collections

| Path | Назначение |
|---|---|
| `arena_v2_matches/{matchId}/arena_v2_members/{authUid}` | own-readable membership marker |
| `users/{stableUid}/arena_v2_seasons/{seasonId}` | season stars/daily counters/claimed level arrays |
| `users/{stableUid}/arena_v2_receipts/{matchId}` | exactly-once settlement receipt |
| `users/{stableUid}/arena_v2_spin_credits/{creditId}` | available/consumed spin credit |
| `users/{stableUid}/arena_v2_spin_results/{requestId}` | idempotent spin result |
| `users/{stableUid}/arena_v2_season_claims/{season_level_side}` | idempotent track claim |
| `users/{stableUid}/arena_v2_daily_attempts/{dayKey}` | server-only compact official Today marker |
| `users/{stableUid}/arena_v2_expansion_runs/{runId}` | sealed Today/Ghost runtime; server-only |
| `users/{stableUid}/arena_v2_match_labs/{matchId}` | owner-readable compact 30-day review |
| `users/{stableUid}/arena_v2_mastery_signatures/{signature}` | server-only 60-day uniqueness marker |
| `users/{stableUid}/arena_v2_activity_days/{dayKey}` | server-only qualifying activity bitmap |
| `users/{stableUid}/arena_v2_partner_weeks/{weekKey}` | owner-readable Spotlight lock/claims |
| `users/{stableUid}/arena_v2_star_ledger/{receiptId}` | owner-readable spendable-star ledger |
| `users/{stableUid}/arena_v2_entitlements/{itemId}` | owner-readable permanent cosmetics |
| `users/{stableUid}/arena_v2_expansion_receipts/{requestId}` | server-only idempotency receipts |

Нет runtime namespaces для Offline Practice или Rematch.

## 3. Config и release gate

Каждый callable сначала проверяет server-only `arena_v2_config/current` с
15-секундным in-instance cache:

```ts
{
  schemaVersion: 'arena-v2-config.v1',
  productConfigVersion: 'arena-v2-product.v1',
  enabled: boolean,
  quickEnabled: boolean,
  rankedEnabled: boolean,
  friendEnabled: boolean,
  rewardsEnabled: boolean,
  spinEnabled: boolean,
  arenaExpansionEnabled: boolean,
  arenaTodayEnabled: boolean,
  arenaMatchLabEnabled: boolean,
  arenaMasteryEnabled: boolean,
  arenaGhostEnabled: boolean,
  arenaRivalEnabled: boolean,
  arenaPartnerEnabled: boolean,
  arenaStarStoreEnabled: boolean,
  arenaCosmeticCatalogVersion: 'arena-cosmetics.v1',
  arenaRivalRuntimeVersion: 'arena-rival.v1',
  minClientVersion: 'x.y.z',
  contentPublication: {
    poolVersion: 'tpool_20260801_v10',
    manifestSha256: '8ec778fef78045b148e077be7efdf2dcdc081a275005e4bcf713a1a3754a00e5'
  }
}
```

`app/arena_client.ts` добавляет установленный `clientVersion` ко всем вызовам.
Сервер принимает semver-like `x.y.z` с optional suffix и fail-closed отвечает
`arena_client_update_required`, если версия отсутствует, invalid или ниже min.

Backend fail-closed сравнивает и poolVersion, и digest с каноническими
константами deterministic v10 publication. Каждая generated task несёт
`arenaPublication` с leaf hash и 12-step Merkle proof; loader проверяет payload
выбранных 10 документов против compiled root
`ac0cf279e14c052854f90245fb5dae8da08a0a59bf806b1e63823c626024f999`.
Factory guard заново строит все 4000 задач, сверяет content digest/Merkle root и
доказывает все inclusion proofs. Поэтому altered/mini v10 pool больше не может
пройти Arena loader с одним лишь правильным названием версии.

Recovery callables (`QueueCancel`, Match Accept/Decline/Submit/Sync/Forfeit`,
`arenaTodaySubmitAnswer/SubmitSpeedAttempt/Sync`, `arenaGhostStatus/Decline`, `arenaPartnerPause/Remove`,
`arenaRivalLeave/Mute` и read-only Home/Store) продолжают безопасное чтение или
закрытие уже начатого состояния при выключенных feature flags. Они всё равно
требуют совместимый schema/product/content config и client version; Store и
Rival additionally требуют свои exact runtime versions.

`arenaV2Home` тоже вызывается как recovery: при `enabled=false` он возвращает
own profile/season/queue/active match и safe `availability` (`enabled`,
`quickEnabled`, `rankedEnabled`, `friendEnabled`, `rewardsEnabled`,
`spinEnabled`). Hub показывает maintenance, отключает три mode CTA и скрывает
spin claim по этой projection. Season route остаётся доступным для просмотра;
сам claim отдельно защищён `rewardsEnabled`. `arenaExpansionHome` возвращает
отдельную availability projection для Today/Lab/Mastery/Ghost/Rival/Partner/
Store, wallet split, own summaries и safe active Today/Ghost run.

## 4. Public/private contract

Public `arena_v2_matches` содержит только seat IDs `a|b`, display snapshots,
`mode: quick|ranked|friend|series`, `opponentKind: human|bot`, acceptance, state,
version, current sanitized task, submitted seats, score, deadlines, reveal и
reduced result. После eligible human result он может кратко содержать
`rivalOffer: {seriesId, fromSeat, expiresAtMs}`; stable/auth IDs там нет.

Фактические states:

```text
accepting → countdown → task_active → task_reveal → ... → settled
accepting/task flow → aborted
```

`closedField` содержит `{taskIndex, seatAwards[]}` с seat, `correct`, `points`
и `seasonStars`; correct answer/explanation там нет. `result.rewards[seat]`
содержит только `starsEarned`, `ratingDelta`, `ratingAfter`, `rankAfter`.

Полный собственный reward (`seasonStarsAfter`, `spinAwarded`,
`spinReceiptId`) возвращается только вызывающему как top-level
`viewerReward` из sealed `rewardsByStableUid`. Он не записывается в public
opponent-readable result.

Private root хранит 10 immutable task snapshots, answer material, raw stable
и auth IDs, seat mapping, answer/speed ledgers, totals, bot blueprint, pair
reservation и private rewards. Serialized private envelope обязан быть меньше
384 KiB.

Client имеет один listener на собственный queue doc; после получения matchId
queue listener выключается и остаётся один listener на public match. Direct
client writes отсутствуют.

Today/Ghost tasks, raw answers и Ghost host plan находятся только в server-only
roots/runs. Match Lab — единственная owner-readable answer-bearing projection:
она содержит только собственный sanitized verdict/time, explanation и до трёх
recovery tasks. Root Ghost/Series/Partnership documents клиент напрямую не
читает; summary выдаётся callables после participant/auth revalidation.

## 5. Content assembly

Порядок modes, difficulty bands и scoring определены в [`README.md`](./README.md).
На каждый матч backend строит семь `(mode,difficulty)` cells. Для каждой cell:

1. query по exact `poolVersion`, `mode`, `difficulty`;
2. order by document ID;
3. deterministic SHA-1 cursor;
4. `startAt(cursor).limit(requiredCount)`;
5. при нехватке — bounded wrap `endBefore(cursor)`.

Успешная сборка возвращает **ровно 10 task documents** и затем проверяет 10
разных task IDs, exact mode/difficulty и Tournament publication validation.
Это не означает гарантированно 10 billed reads: семь пустых first-page queries
могут иметь minimum read charge, а Firestore transaction retry повторяет reads.
Не более 14 task queries на успешную попытку; private snapshots отделены от
Tournament документов.

Текущая сборка не хранит recent-60 history и не проверяет semantic signature.
Она гарантирует только уникальность task ID внутри матча.

## 6. Callable surface

Все callables работают в `us-central1` через `HOT_CALLABLE_OPTIONS`: timeout
15 с, 256 MiB, maxInstances 80, глобальная user App Check policy проекта.
Auth связывается с stable identity; hidden/deleted/banned caller отклоняется.

| Callable | Request без автоматически добавленного `clientVersion` | Результат/эффект |
|---|---|---|
| `arenaV2Home` | `{}` | availability + own profile/season/queue/active safe match |
| `arenaV2FindMatch` | `{mode, requestId}` | waiting ticket или human match |
| `arenaV2QueueCancel` | `{requestId?}` | cancel только своей актуальной queue |
| `arenaV2QuickBotFallback` | `{requestId}` | human recheck, затем disclosed bot |
| `arenaV2MatchAccept` | `{matchId}` | accept; countdown только после всех humans |
| `arenaV2MatchDecline` | `{matchId}` | prestart abort |
| `arenaV2SubmitAnswer` | `{matchId, taskIndex, submissionId, answer}` | authoritative verdict/receipt |
| `arenaV2SubmitSpeedAttempt` | `{matchId, taskIndex, submissionId, pairIndex, selectedIndex}` | authoritative pair verdict/progress |
| `arenaV2SyncMatch` | `{matchId, expectedVersion?}` | deadline catch-up/settlement/viewerReward |
| `arenaV2Forfeit` | `{matchId}` | prestart abort или post-start settlement loss |
| `arenaV2InviteCreate` | `{friendStableUid, requestId}` | deterministic raw invite token/idempotent replay |
| `arenaV2InviteAccept` | `{inviteId}` | friend match |
| `arenaV2InviteDecline` | `{inviteId}` | pending→declined |
| `arenaV2SeasonClaim` | `{seasonId?, level, side}` | exact-once level reward |
| `arenaV2SpinStatus` | `{}` | up to 50 available credits count |
| `arenaV2SpinClaim` | `{requestId}` | consumes oldest credit, exact result receipt |
| `arenaExpansionHome` | `{}` | expansion availability, Today/Mastery/social summaries, wallet/equipment, active run |
| `arenaTodayStart` | `{requestId}` | one official UTC-day run for frozen division band |
| `arenaTodaySubmitAnswer` | `{matchId, taskIndex, submissionId, answer}` | authoritative Today/Ghost answer mutation |
| `arenaTodaySubmitSpeedAttempt` | `{matchId, taskIndex, submissionId, pairIndex, selectedIndex}` | authoritative speed mutation |
| `arenaTodaySync` | `{matchId, expectedVersion?}` | catch-up/settlement for Today or accepted Ghost |
| `arenaMatchLabGet` | `{matchId?|sourceRunId?, mode?}` | owner-only review/recovery plan or honest empty plan |
| `arenaGhostCreate` | `{friendStableUid, sourceRunId, sourceKind, requestId}` | sealed snapshot + hash-only persisted capability |
| `arenaGhostAccept` | `{inviteToken, requestId}` | target-bound 20-minute zero-economy run |
| `arenaGhostStatus` | `{inviteToken?}` | participant-safe active/recent-complete summaries/result |
| `arenaGhostDecline` | `{inviteToken}` | awaiting guest → declined |
| `arenaRivalPropose` | `{sourceMatchId, requestId}` | 30-second offer after eligible human result |
| `arenaRivalAccept` | `{seriesId, requestId}` | starts game 2 after invitee opt-in |
| `arenaRivalNext` | `{seriesId, requestId}` | per-player ready; starts next game when both ready |
| `arenaRivalLeave` | `{seriesId, requestId}` | leaves pending/between-game series without rated penalty |
| `arenaRivalMute` | `{seriesId, muted, requestId}` | exact pair mute preference |
| `arenaPartnerInvite` | `{friendStableUid, requestId}` | creates/returns reciprocal-friend partnership invite |
| `arenaPartnerAccept` | `{partnershipId|inviteToken, requestId}` | activates target-bound partnership |
| `arenaPartnerPause` | `{partnershipId, paused, requestId}` | pauses/resumes own participation |
| `arenaPartnerPreferences` | `{enabled, quietHoursUtc|null, requestId}` | nudge opt-in + quiet hours, projected to active pairs |
| `arenaPartnerNudge` | `{partnershipId, requestId}` | bounded preset owner-only notification |
| `arenaPartnerRemove` | `{partnershipId, requestId}` | removes partnership |
| `arenaPartnerClaimSpotlight` | `{partnershipId, requestId}` | lazy shared-day recompute + exact weekly threshold claim |
| `arenaStarStore` | `{}` | versioned catalog, own wallet/entitlements/equipment |
| `arenaStarPurchase` | `{itemId, catalogVersion, requestId}` | permanent entitlement, exact wallet debit |
| `arenaStarEquip` | `{itemId, slot, requestId}` | entitlement-checked equipment update |

`expectedVersion` у `SyncMatch` сейчас только валидируется как integer; он не
является compare-and-swap guard. Transaction state остаётся authoritative.

Internal scheduler `arenaV2CleanupHourly` запускается раз в 60 минут,
`us-central1`, timeout 120 с, 256 MiB, maxInstances 1.

## 7. Matchmaking и reconciliation

- Queue state: `waiting|matched|cancelled`; lease 45 с.
- Candidate query: oldest `waiting`, `limit(10)`.
- Quick: ±3; bot callable доступен не раньше 6 с и повторно profile-checks
  кандидатов, пропуская busy/stale/incompatible.
- Ranked: human-only; same division первые 10 с, затем строго ±1.
- Ranked pair reservation: 12 с acceptance; commit при countdown; cooldown
  30 минут; cap 2/UTC-day; pair doc retention marker 32 суток.
- Client Ranked heartbeat: 15 с. Пороги 30/90 с — только presentation.
- Friend Create/Accept требуют reciprocal friendship и свободные profiles.
  Accept повторно проверяет moderation/current auth host, отклоняет уже matched
  queue и атомарно отменяет waiting queue обоих. Затем создаётся обычный
  12-секундный acceptance match; host переходит в него по owner profile listener.

Каждый client `SyncMatch` может catch up абсолютные deadlines. Дополнительно
hourly scheduler выбирает до 25 non-terminal matches, просроченных минимум на
60 с, и прогоняет state machine с guard 32. Поэтому orphan без клиента может
ждать почти час; backlog более 25 за запуск не закрывается сразу.

Cleanup затем удаляет до 100 документов из каждой из шести групп: stale queue,
expired public match, private match, invite, pair limit и collection-group
member markers. Public match tree не полагается только на parent deletion:
member markers чистятся отдельно.

Expansion reconciliation:

- Today имеет четыре sealed snapshots в UTC-day (по division bands), одну
  official attempt на user/day и hard expiry не позднее day-end grace +20 минут.
- Ghost Accept продлевает и logical `expiresAtMs`, и Firestore TTL `expireAt` на
  полный run; complete result хранится 7 суток и читается через отдельный
  participant/status/completedAt index. Cap — 3 active outgoing, 10 creates/day,
  одна awaiting/playing запись на пару.
- Rival offer доставляется второму устройству через уже открытый public-match
  listener (`fromSeat` определяет incoming) и принимается прямо с result screen.
  Simultaneous propose до доставки snapshot возвращает ту же invited series,
  не создаёт duplicate и покрыт двухустройственным emulator race-smoke.
- Partner не делает fan-out по дням: claim лениво читает максимум 14 activity
  docs на пару. Qualifying day создаётся только Quick/Ranked/Today settlement
  при минимум 8 submitted answers; Friend/Ghost/Series не учитываются.
- Today percentile и friend-cohort comparison отсутствуют. Match Lab не
  вычисляет turning point/question contribution. Эти поля post-launch gated и
  не должны появляться в release copy до отдельной реализации и тестов.

## 8. Economy и exact-once

- Rating меняется только для `mode=ranked`, `opponentKind=human`, двух людей и
  snapshot divisions с разницей не более 1.
- Match settlement читает profile/season/receipt каждого человека и создаёт
  receipt в той же transaction, где пишет rating/stars/profile/result.
- Pity хранится в root profile и поэтому переживает 63-day season rollover.
- Public reward reduced; full reward доступен только его владельцу.
- Season claim имеет детерминированный claim doc; shards/spin credit создаются
  в той же transaction.
- Spin claim имеет result doc по requestId, HMAC roll и atomically consumes
  один credit; replay одного requestId возвращает тот же result.
- Spin не выдаёт competitive benefit; только 5/10/20 shards.
- `season.stars` — gross, неубывающий progress; `profile.starWalletBalance` —
  отдельный spendable balance. Earn увеличивает обе проекции, purchase уменьшает
  только wallet. Learning V2 wallets/stars не читаются и не пишутся.
- Today даёт максимум 30 wallet/season stars/day. Mastery thresholds дают до
  500 lifetime wallet stars. Partner Spotlight даёт 10 на 3 shared days и ещё
  20 на 5 shared days, максимум 30 wallet/season stars/week.
- Ghost и Rival games 2/3 hard-zero: rating, stars, spin, pity, mastery, Partner
  activity и обычные profile outcomes не изменяются.
- Cosmetic catalog `arena-cosmetics.v1` содержит 13 permanent direct-choice
  items; нет random purchase, boost или pay-to-win эффекта.

`SpinStatus`, Home и `SpinClaim` проверяют server expiry независимо от
eventual Firestore TTL. Rare credits живут 30 дней, season credits — 365 дней;
claim повторно проверяет expiry внутри transaction.

Spin credit выбирается внутри transaction query: concurrent разные request IDs
автоматически конфликтуют/retry и получают разные доступные credits. Этот race
закрыт отдельным Firestore emulator test; double award невозможен.

## 9. Rules, indexes и account deletion

Rules:

- config, private roots (base + Today/Ghost/Series/Partnership), invites, locks
  и pair limits полностью закрыты;
- profile читает только owner через stable/auth binding;
- queue читает только matching `authUid`;
- public match читает только auth с собственным member marker;
- member marker читает только тот же auth UID;
- base economy, Match Lab, Partner week, star ledger и entitlements
  owner-readable/server-write-only; sealed attempts/runs/signatures/activity/
  expansion receipts полностью закрыты;
- все direct client writes запрещены.

Composite indexes:

```text
tournamentTasks: poolVersion, mode, difficulty, __name__
arena_v2_queue: mode, status, joinedAtMs
arena_v2_matches: terminal, stateDeadlineAtMs
arena_v2_invites: fromStableUid, status
arena_v2_spin_credits: status, expiresAtMs
arena_v2_ghosts: participantStableUids CONTAINS, status
arena_v2_ghosts: participantStableUids CONTAINS, status, expiresAtMs
arena_v2_ghosts: participantStableUids CONTAINS, status, completedAtMs DESC
arena_v2_ghosts: fromStableUid, status
arena_v2_ghosts: fromStableUid, status, expiresAtMs
arena_v2_ghosts: pairId, status
arena_v2_ghosts: pairId, status, expiresAtMs
arena_v2_partnerships: participantStableUids CONTAINS, status
arena_v2_partnerships: participantStableUids CONTAINS, status, expiresAtMs
arena_v2_series: pairId, dayKey, createdAtMs DESC
arena_v2_series: participantStableUids CONTAINS, status
arena_v2_series: participantStableUids CONTAINS, status, offerExpiresAtMs
```

Single-field indexing отключён для private/public task, answer, bot, speed,
totals, rewards, mastery и equipped maps, включая Expansion runs/Ghost/Lab.
Account deletion ищет profile/queue, identity arrays в private match,
Ghost/Series/Partnership participant arrays, pair participant array и все four
invite identity fields. Отдельная stage рекурсивно удаляет public match tree с
member markers и sealed private doc. Все 9 Expansion user subcollections входят
в recursive user-tree deletion; cross-user notification fromUid также очищается.

## 10. Structural cost envelope

Текущий код имеет bounded queries, но instrumented billed-cost test не
выполнен. Нельзя сохранять старый claim «≤80 reads/≤35 writes на матч».

Upper bounds одной transaction attempt, без actor/config/identity reads,
empty-query minimum charges и automatic retries:

| Operation | Domain document reads |
|---|---:|
| Quick find/fallback, human found последним | до 33 |
| Ranked find, candidate найден последним | до 53 |
| Friend accept + content | 16 |
| Content часть успешного создания | ровно 10 returned task docs |

Quick bound: own profile/queue/lock 3 + queue results до 10 + candidate profiles
до 10 + tasks 10. Ranked добавляет current+previous pair docs для каждого из
до 10 candidates. Actor/config/identity и transaction retry оплачиваются
дополнительно.

Типичное создание пишет 6 документов для bot match, 9 для Quick human, 10 для
Ranked и 7 для Friend. Каждая обычная answer transaction может писать public и
private docs; каждый новый speed attempt — те же два. На двух `speed_match`
досках существует до 32 уникальных pair/selected combinations на игрока, а
server cap ledger IDs — 40. Поэтому adversarial write cost существенно выше
старого бюджета даже при bounded payload.

Client listener billing зависит от числа public snapshots, reconnects и
metadata/cache behavior и не измерен. Global per-mode lock сериализует pairing
и может стать hotspot; oldest-10 scan может временно не видеть совместимого
игрока за первой десяткой.

## 11. Privacy, security и social limits

Public match не содержит raw stable/auth IDs, answer fingerprints, correct
indexes, explanation, private ledger, full opponent reward или spin state.
Invite DB хранит hash, pair limit — HMAC ID. Answer body не передаётся в public
match.

Ghost root хранит только SHA-256 capability hash; raw token детерминированно
восстанавливается Functions из `ARENA_V2_INVITE_HMAC_KEY`, ghost ID и target
auth UID. Поэтому token не следует описывать как one-time: безопасность даёт
target binding, friendship/auth revalidation, 48-hour accept TTL и single run.
Rotation этого HMAC key инвалидирует незавершённые social links и должна быть
отдельной операцией с rollout plan.

Partner nudge требует явный target opt-in, уважает quiet hours, reciprocal
friendship, pause/moderation и server caps. Он записывается только в
`users/{target}/notifications`, содержит preset type, safe sender snapshot и
nav `{kind:'arena_partner', partnershipId}`; public `my_events` не используется.
Partner invite создаёт такой же owner-only in-app notification без bearer
token и удаляет его атомарно при Accept. Push-доставка не заявляется.

Secrets, которые должны быть provisioned для production Functions:

```text
ARENA_V2_PAIR_HMAC_KEY
ARENA_V2_INVITE_HMAC_KEY
ARENA_V2_SPIN_HMAC_KEY
```

Значения не должны попадать в repo/logs. Без pair/invite key соответствующий
flow fail-closed. Без spin key match drop не выполняется, а SpinClaim
fail-closed.

Friend create/accept проверяет reciprocal friendship documents, moderation и
текущий auth binding; отдельной block collection backend не читает. Контракт
полагается на то, что блокировка удаляет friendship docs — это остаётся пунктом
social-safety QA до rollout.

## 12. Фактические test results

Повторно зелёные в текущем snapshot 2026-08-11:

```text
cd functions
npx jest --runInBand src/arena_expansion_core.test.ts \
  src/arena_speed_progress_codec.test.ts \
  src/arena_v2_core.test.ts src/arena_v2_backend_contract.test.ts \
  src/arena_rival_backend_contract.test.ts src/account_delete.test.ts \
  src/jarvis/jarvis_data_contract_guard.test.ts --silent
# 7 suites, 89 tests passed

cd ..
npx jest --runInBand \
  tests/arena_expansion_client_contract.test.ts \
  tests/arena_expansion_client_source_contract.test.ts \
  tests/arena_expansion_integration_contract.test.ts \
  tests/arena_v2_client_contract.test.ts \
  tests/arena_v2_client_source_contract.test.ts \
  tests/arena_v2_integration_contract.test.ts \
  tests/product_analytics_screen_registry.test.ts \
  tests/product_analytics_event_catalog.test.ts \
  tests/native_intent_referral.test.ts \
  tests/user_notifications_account_cache.test.ts \
  tests/firestore_rules_security.test.ts --silent
# 11 suites, 203 tests passed
```

Firestore emulator suites также фактически получили green:

```text
cd functions
npm run test:emulator:arena-v2-gameplay
npm run test:emulator:arena-v2-rules
npm run test:emulator:arena-expansion-gameplay
npm run test:emulator:arena-rival-gameplay
```

Base gameplay: 4 tests. Rules: 5 tests (ожидаемые `PERMISSION_DENIED` в negative
probes). Expansion gameplay: 5 tests — Today exact-once/economy/mastery/activity,
Ghost accept/result/TTL/zero-economy/caps, Partner thresholds/anti-idle, Store
purchase/equip/idempotency. Rival gameplay: 2 tests — mutual accept + series
settlement/reconciliation и caps/leave behavior.

Не проверены device E2E и часть emulator concurrency: Quick human/Ranked/Friend
decline/accept races, full pair caps, reconnect/forfeit, season claims,
pity/drop boundaries, orphan backlog и account delete на реальном Firestore.
Нет device QA на iOS/Android, accessibility, deep-link install/onboarding,
background/reconnect, animations/haptics/sound. Cost counters не снимались.

## 13. Manual prerequisites и acceptance checklist

Перед любым deploy обязательно:

- [ ] явно принять bounded-cost trade-offs из sections 7, 10 и 12;
- [ ] provision три HMAC secrets через production-approved secret/env path;
- [ ] создать exact `arena_v2_config/current` с flags initially false,
  production `minClientVersion`, pool version и проверенным manifest digest;
- [ ] подтвердить, что `tpool_20260801_v10` полностью опубликован и каждая из
  required mode/difficulty cells достаточна; перепубликовать exact deterministic
  output, чтобы все task docs содержали `arenaPublication` Merkle proofs;
- [ ] deploy composite indexes и дождаться `READY`;
- [ ] deploy Rules и повторить rules emulator/production staging probes;
- [ ] проверить global user App Check policy для Arena client callables, не
  изменяя admin App Check policy;
- [ ] включить Firestore TTL для retention fields; hard spin expiry уже
  проверяется сервером независимо от TTL;
- [ ] выполнить two-user emulator matrix и instrumented cost test;
- [ ] выполнить iOS/Android device QA, deep-link, background/reconnect,
  Reduced Motion, screen reader, large text, sound/haptics settings;
- [ ] проверить privacy/account deletion и observability без raw IDs/answers;
- [ ] получить явное разрешение владельца на Functions/Rules/Indexes/app deploy;
- [ ] только после deploy включать `enabled` и mode/reward flags поэтапно.

### Operator config procedure

У Arena Expansion нет operator control в live `admin/v2/legacy.html`. До
отдельно одобренного admin UI конфиг меняется только контролируемой server/Admin
операцией; client write невозможен по Rules.

1. Считать и сохранить текущий `arena_v2_config/current`; не заменять документ
   неполным payload и не терять base flags, `minClientVersion` или publication.
2. Сначала развернуть composite indexes и дождаться состояния `READY`, затем
   Rules и Functions при всех Expansion flags `false`, после этого app binary
   с routes. Само наличие кода не включает feature.
3. Merge exact base config и Expansion поля, оставив все восемь Expansion
   boolean flags `false`. Одновременно записать
   `arenaCosmeticCatalogVersion: 'arena-cosmetics.v1'` и
   `arenaRivalRuntimeVersion: 'arena-rival.v1'`.
4. Проверить `arenaV2Home`/`arenaExpansionHome`, recovery существующего матча,
   deny-rules probes, secret availability и production client-version gate.
5. Включать по одному gate с наблюдением ошибок/стоимости: общий
   `arenaExpansionEnabled` → Today/Lab/Mastery → Store → Ghost → Partner →
   Rival. Для Store/Rival boolean без exact version намеренно не сработает.
6. Не включать percentile/friend cohort или copy про turning point: таких
   runtime flags/DTO в этом snapshot нет.
7. Rollback: сначала выключить только проблемный child flag; при неизвестной
   ошибке выключить `arenaExpansionEnabled`. Не удалять config/version fields:
   recovery callables всё ещё валидируют совместимый config. Base Arena можно
   оставить включённой, если инцидент изолирован в Expansion.

Пример **initially disabled merge fields** (не самостоятельный полный config):

```ts
{
  arenaExpansionEnabled: false,
  arenaTodayEnabled: false,
  arenaMatchLabEnabled: false,
  arenaMasteryEnabled: false,
  arenaGhostEnabled: false,
  arenaRivalEnabled: false,
  arenaPartnerEnabled: false,
  arenaStarStoreEnabled: false,
  arenaCosmeticCatalogVersion: 'arena-cosmetics.v1',
  arenaRivalRuntimeVersion: 'arena-rival.v1',
}
```

## 14. Точный no-deploy handover

В этой передаче локально добавлены Arena V2 + Expansion client, isolated
backend, Rules, Indexes, account-delete integration, tests и эта документация.
Tournament runtime и Learning V2 economy не связаны с Arena. Production state
не менялся и ни одна Firebase/app deployment команда не запускалась. Live admin
не получил Arena config controls.

Перед rollout остаются manual secrets/config/index readiness, расширенная
two-device/concurrency/cost матрица и реальный iOS/Android QA. Локальные green
tests не являются утверждением о production deployment.
