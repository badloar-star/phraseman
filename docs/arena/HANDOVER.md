# Арена — технический handover

Статус на 2026-08-14: **базовый production-бэкенд развёрнут и включён;
расширение выключено. Клиентские исправления релизного аудита ждут следующую
сборку приложения.**

Это описание текущего состояния кода, а не планов. Клиент, сервер, правила
доступа, индексы, админская страница конфига и тесты лежат в checkout.
Production-конфиг существует: шесть базовых флагов включены, восемь флагов
расширения выключены. Нужные Functions активны и привязаны к трём секретам,
индексы опубликованы, правила и рабочая админка развёрнуты. Полный
интерактивный прогон новой клиентской сборки остаётся релизным шагом.

**Матч переписан на дуэль v3** (план + отчёт вместо пошаговых вызовов).
Пошаговая машина v2 сохранена и обслуживает Today и Ghost; матчи v3 помечены
`duelVersion: 3` и через неё не проходят. Продуктовая сторона описана в
[`README.md`](./README.md), решения владельца и журнал — в
[`OWNER_DECISIONS.md`](./OWNER_DECISIONS.md).

## 1. Источники реализации

| Область | Файлы |
|---|---|
| Дуэль v3: план, отчёт, закрытие | `functions/src/arena_duel_v3.ts` |
| Движок звёзд | `modules/arena/stars.ts` + байт-копия `functions/src/arena_stars_v3.ts` |
| Движок рангов | `modules/arena/rank_engine.ts` + байт-копия `functions/src/arena_rank_engine.ts` |
| Награды за тир | `modules/arena/tier_rewards.ts` + `functions/src/arena_tier_rewards.ts` |
| Машина матча на устройстве | `modules/arena/match_machine.ts`, `modules/arena/match_store.ts`, `hooks/use_arena_local_match.ts` |
| Разбор плана и живой канал | `modules/arena/duel_plan.ts`, `modules/arena/live_channel.ts` |
| Конфиг и админка | `functions/src/arena_config_contract.ts`, `functions/src/admin_arena_config.ts`, `admin/v2/legacy.html` (`#control-panel`) |
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
| `arena_v2_match_live/{matchId}/seats/{seatId}` | живой прогресс соперника; **единственное место, куда пишет сам клиент** |
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

Форма документа и разбор его проблем вынесены в
`functions/src/arena_config_contract.ts` — один контракт на сервер и на
админскую страницу, чтобы страница не могла записать документ, который сервер
потом отвергнет. Читает и пишет его только пара `adminArenaConfigGet` /
`adminArenaConfigSet`; клиентская запись запрещена правилами.

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

**У матча v3 этот ряд состояний почти не используется.** `arenaV2MatchPlan`
помечает матч `duelVersion: 3` в транзакции и выдаёт план целиком; дальше матч
живёт на устройстве, а сервер видит только отчёт. Шаговая машина (`advanceMatch`)
разделена на `advanceAnyMatch`: матч v3 в неё не попадает — иначе она записала
бы ему нулевые квитанции и уничтожила результат. Публичный документ обновляется
на финише, а не на каждом задании.

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
| `arenaV2MatchPlan` | `{matchId}` | **v3:** план матча целиком: задания, отпечатки ответов, ходы бота, путь живого канала |
| `arenaV2MatchFinish` | `{matchId, reportId, report}` | **v3:** один отчёт за весь матч; пересчёт, квитанции, закрытие при готовности обоих |
| `arenaV2MatchSettle` | `{matchId}` | **v3:** один запрос о закрытии, если соперник опоздал; идемпотентен, опрос по кругу запрещён |
| `arenaV2FriendsBoard` | `{}` | таблица друзей по рангу; один пакетный `getAll` вместо цикла |
| `adminArenaConfigGet` | `{}` | текущий `arena_v2_config/current` и разбор его проблем (только админ) |
| `adminArenaConfigSet` | `{flags…, reason}` | запись конфига с причиной изменения (только админ) |
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

`arenaV2SubmitAnswer`, `arenaV2SubmitSpeedAttempt` и `arenaV2SyncMatch` в матче
v3 не вызываются: во время игры устройство к серверу не обращается вовсе. Они
остаются рабочими для Today/Ghost и для восстановления матчей, начатых старой
сборкой.

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
- **Звёзды в кошелёк начисляет только рейтинговый матч** (D-07: быстрый платит
  опытом). Гейт один и тот же на клиенте и на сервере — политика режима в
  движке звёзд; второго списка режимов нет намеренно, иначе план матча обещал
  бы игроку ноль, а сервер записывал звёзды.
- Счётчик матчей, дающих право на редкую награду (`dailyRewardMatches`, шесть
  за сутки), отдельный от счётчика начисления звёзд (`dailyEligibleMatches`,
  затухание 4×100 % → 2×50 % и потолок 160). Быстрый матч увеличивает первый и
  не трогает второй. Старое поле читается как запасное, чтобы у игравших
  сегодня окно награды не открылось заново.
- Награда за тир — косметика, один раз за всю жизнь (D-63). Ключ операции
  `arena_tier.t{N}` содержит ровно одно двоеточие: с двумя реестр звёзд отверг
  бы её молча. Выдаются все тиры между прошлым пожизненным лучшим и новым.
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
- живой канал `arena_v2_match_live/{matchId}/seats/{seatId}` — единственное
  исключение из запрета клиентской записи: писать можно только в СВОЁ место за
  столом, и правило сверяет `seatId` с меткой участия. Ограничены схема, длина
  списка ходов и обязательность метки времени, по которой уборка находит
  брошенные каналы. Сам документ матча в этой коллекции доступен только на
  чтение;
- все остальные direct client writes запрещены.

Composite indexes:

```text
tournamentTasks: poolVersion, mode, difficulty, __name__
arena_v2_members (COLLECTION_GROUP): expireAt
seats (COLLECTION_GROUP): updatedAtMs
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
Ranked и 7 для Friend.

**Дуэль v3 сняла главную статью расхода.** Раньше каждый ответ и каждая попытка
на доске пар писали два документа, и на двух досках это давало до 32 записей на
игрока при полном переборе. Теперь во время матча сервер не пишет ничего:
транзакции остались только у плана, отчёта и закрытия. Живой канал соперника
стоит **одну запись на задание** — это проверяется тестом, а не декларируется.

Устройство обращается к серверу три раза за матч; четвёртый вызов
(`arenaV2MatchSettle`) случается только если соперник не сдал отчёт вовремя, и
ровно один раз. Опроса по кругу нет нигде — это прямое требование владельца по
стоимости базы.

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

## 12. Фактические результаты тестов

Прогон на 2026-08-13 (вечер): **44 набора, 833 утверждения, все зелёные.**
Срез типов Арены (`npx tsc -p tsconfig.arena.json --noEmit`) и типы Functions
чисты.

Быстрый способ — одна команда из корня, без jest:

```bash
bash tools/arena_tests/run.sh
```

Она компилирует наборы Арены во временную папку и прогоняет их крошечным
прогонщиком (`tools/arena_tests/`). В конце печатает строку вида
`SUITES=44 ASSERTIONS=833 FAILED_SUITES=0`. Подробности — в
`tools/arena_tests/README.md`.

Полный прогон через jest (медленнее, но это привычный инструмент):

```bash
npx tsc -p tsconfig.arena.json --noEmit
cd functions && npx tsc --noEmit -p tsconfig.json

# полный прогон наборов Арены
npx jest --runInBand tests/arena_*.test.ts
cd functions && npx jest --runInBand \
  src/arena_duel_v3.test.ts src/arena_config_contract.test.ts \
  src/arena_v2_core.test.ts src/arena_expansion_core.test.ts \
  src/arena_speed_progress_codec.test.ts \
  src/arena_v2_backend_contract.test.ts src/arena_rival_backend_contract.test.ts \
  src/account_delete.test.ts
```

Что именно закреплено тестами, а не обещаниями:

- **паритет клиента и сервера** — движки звёзд и рангов существуют в двух
  байт-идентичных копиях, `arena_stars_parity` и `arena_rank_parity` прогоняют
  обе на одних входах и падают при первом расхождении. Расхождение здесь
  означает, что игрок видит одно число, а получает другое;
- **бюджет живого канала** — полный матч из десяти заданий, где публикация
  дёргается по двадцать раз на задание, даёт ровно десять записей;
- **начисление звёзд гейтится одной политикой режима** — быстрый матч не
  начисляет (D-07), и второго списка режимов на сервере больше нет;
- **интерфейс не врёт** — четыре состояния загрузки на всех экранах, отказ
  важнее пустоты, и список экранов в тесте перечислен поимённо, чтобы
  следующий экран не завёл ту же ложь заново;
- **рейтинговый матч без сети не начинается** (D-72);
- **идентификатор операции награды за тир** содержит ровно одно двоеточие,
  иначе реестр звёзд отверг бы его молча.

Эмуляторные наборы Firestore в этом прогоне не запускались. Разбор их
состояния под дуэль v3 сделан отдельно:

- `arena_v2_rules`, `arena_expansion_gameplay`, `arena_rival_gameplay` —
  **актуальны**: они проверяют правила доступа, Today/Ghost/Partner/магазин и
  серии, то есть то, чего переписывание матча не касалось. Серии закрываются
  через `arenaV2Forfeit`, пошаговой отправкой ответов этот набор не пользуется;
- `arena_v2_gameplay` — **был устаревшим в одном сценарии и исправлен.** Он
  ждал от быстрого матча раскрытого бота (`opponentKind: 'bot'` в ответе
  вызова и в публичном документе) и десяти заданий. Сегодня бот скрыт,
  публичный документ всегда говорит `'human'`, а быстрый матч состоит из пяти
  заданий. Остальные три его сценария (просроченный кредит спина, гонка двух
  request id, перепроверка друга-хозяина) матча не касаются и верны;
- ходовая часть дуэли v3 эмулятором по-прежнему **не покрыта**. Она не
  сломана — старые наборы её просто не трогают. Недостающее по убыванию
  ценности: круг «план → отчёт → закрытие», единственность квитанции при
  одновременных отчётах и то, что матч v3 не попадает в шаговую машину v2.
  Правило живого канала — единственной точки клиентской записи — закрыто
  отдельной проверкой в наборе правил.

Не проверены: реальные два устройства, конкурентность экономики и спинов,
замеры стоимости, проверки на iOS/Android, доступность, глубокие ссылки,
восстановление после сворачивания, анимации, звук и вибрация.

## 13. Что нужно сделать перед выпуском

Владельцу:

- [ ] выдать три секрета Functions одобренным способом:
  `ARENA_V2_PAIR_HMAC_KEY`, `ARENA_V2_INVITE_HMAC_KEY`, `ARENA_V2_SPIN_HMAC_KEY`.
  Без ключа пары и приглашений соответствующий поток отказывает, без ключа
  спина награда не выдаётся. Значения не должны попадать в репозиторий и логи;
- [ ] подтвердить, что пул `tpool_20260801_v10` опубликован целиком и каждая
  требуемая пара «тип × сложность» набирается; задания должны нести
  `arenaPublication` с Merkle proof;
- [ ] сгенерировать звуковые файлы по `SOUND_PROMPTS.md` (на каждый звук три
  промпта в разных стилях) и положить их по ключам каталога;
- [ ] пересобрать приложение: серверная часть без сборки работает, но экраны
  матча, рангов, истории, топов, разбора и таббар приедут только с ней;
- [ ] принять компромиссы по стоимости из разделов 7, 10 и 12 — замеров
  реальной стоимости не делалось;
- [ ] выполнить проверку на живых iOS/Android: глубокие ссылки, сворачивание и
  возврат, уменьшенное движение, экранный диктор, крупный шрифт, звук и
  вибрация, удаление аккаунта.

### Последовательность деплоя

Порядок важен: каждый шаг опирается на предыдущий, а последний — единственный,
который видят игроки.

1. `firebase deploy --only firestore:indexes` — первым, потому что индексы
   строятся не мгновенно, а запросы без них падают. Новые:
   `arena_v2_members.expireAt`, `seats.updatedAtMs`. Дождаться `READY`.
2. `firebase deploy --only firestore:rules` — добавлено
   `arena_v2_match_live/{matchId}/seats/{seatId}`, единственное место
   клиентской записи.
3. `firebase deploy --only functions` — новое: `arenaV2MatchPlan`,
   `arenaV2MatchFinish`, `arenaV2MatchSettle`, `arenaV2FriendsBoard`,
   `adminArenaConfigGet`, `adminArenaConfigSet`.
4. `firebase deploy --only hosting:admin` — рабочая админка
   `admin/v2/legacy.html`.
5. Открыть `legacy.html#control-panel`, карточку «Арена», поставить
   переключатели, указать причину и записать.

**Шаг 5 обязателен и ничем не заменяется.** Без документа
`arena_v2_config/current` бэкенд Арены отказывает во всём — это и есть ответ на
вопрос «почему Арена не работает». Изменение доезжает до игроков примерно за
пятнадцать секунд: это кеш конфига, а не сбой.

Раньше конфигом нельзя было управлять вообще: документ server-only, клиентская
запись запрещена правилами, а экрана не существовало. Теперь он редактируется
страницей, которая проверяет полноту документа перед записью и не даёт
затереть базовые поля неполным payload.

### Порядок включения

Включать по одному, наблюдая ошибки и стоимость: сначала общий `enabled`, затем
быстрый матч, затем рейтинговый и матч с другом, затем награды и спин. Дальше
расширение: общий `arenaExpansionEnabled` → Today/Lab/Mastery → магазин →
Ghost → Partner → Rivalry. Для магазина и Rivalry булев флаг без точной версии
рантайма намеренно не сработает.

Откат: сначала выключить только проблемный дочерний флаг; при непонятной ошибке
выключить `arenaExpansionEnabled`. Поля версий и конфига не удалять —
восстановительные вызовы всё равно проверяют совместимый конфиг. Базовую Арену
можно оставить включённой, если происшествие изолировано в расширении.

Не включать процентиль дня, сравнение с когортой друзей и тексты про
«поворотный момент»: таких полей и флагов в этой сборке нет.

## 14. Точная граница этой передачи

Локально добавлены и переписаны: дуэль v3 (план и отчёт), движки звёзд и рангов
в двух сверяемых копиях, награды за тир косметикой, живой канал с бюджетом
записей, машина матча на устройстве, экраны хаба, истории, топов, разбора,
целей дня и рангов, каталог звуков и их расстановка, контракт конфига и
админская страница, правила доступа, индексы и тесты.

Турнирный рантайм и экономика Learning V2 с Ареной не связаны. Состояние
production не менялось: ни одна команда деплоя не запускалась. Зелёные
локальные тесты не являются утверждением о работоспособности в production.
