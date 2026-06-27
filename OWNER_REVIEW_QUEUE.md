# Owner Review Queue

Дата: 2026-06-26.

Короткий список решений после чтения стартового файла, карты проекта и первых двух реестров.

## Closed In This Pass

### Root startup identity/onboarding storage batching

Status: closed.

What changed:

- Root `app/_layout.tsx` now reads `user_prev_xp`, `user_total_xp`, and, when needed, `onboarding_done` through one `AsyncStorage.multiGet`.
- First frame still does not wait for network/App Check/cloud restore.
- QA forced onboarding still resolves onboarding as not done.
- XP migration behavior is preserved: if `user_prev_xp` is absent, it is still initialized from existing `user_total_xp`.

Verification:

- `tests/owner_direction_runtime_contract.test.ts` now guards this startup batching and rejects those three startup reads returning to separate `getItem` calls inside bootstrap.

### Runtime blur removal

Status: closed.

What changed:

- Removed remaining runtime `expo-blur` surfaces from the tabbar shell and `TopFadeMask`.
- The tabbar still renders the floating chrome, icons, active pill, scroll collapse, haptics, swipe navigation, and safe-area overlay.
- `TopFadeMask` still renders the same masked top feather, but with a static tint instead of native blur.
- This follows the owner request to remove blur and reduces GPU/native work on lower-end phones.

Verification:

- `tests/owner_direction_runtime_contract.test.ts` now scans runtime `app/`, `components/`, `hooks/`, and `contexts/` TypeScript files and fails if `expo-blur`, `BlurView`, or `dimezisBlurView` comes back.
- `tests/fabric_background_layout_contract.test.ts` was updated to lock the static fade/chrome contract.

### Home loadData storage batching

Status: closed.

What changed:

- Home `loadData` now reads the main local profile/streak/xp/title keys with one `AsyncStorage.multiGet` instead of separate bridge calls.
- Special-title helper keys are grouped into one `multiGet`.
- Lesson progress for the last-opened lesson is reused from the already-loaded 32 lesson progress entries instead of doing an extra `getItem`.
- Freeze/free-freeze and login/comeback/personal-best banner keys are grouped into small `multiGet` reads.
- Server authority paths were not changed: shards, premium, progress, league, tasks, medals, and cloud restore/sync behavior stay as they were.

Verification:

- `tests/owner_direction_runtime_contract.test.ts` now guards the Home `loadData` batching policy and blocks these specific hot-path `getItem` calls from coming back.

### Lesson menu prefetch target scoping

Status: closed.

What changed:

- During Home storage verification, `tests/gustav_last_opened_lesson_target_isolation.test.ts` caught that `lesson1` still prefetched lesson-menu cache without the active `studyTarget`.
- `app/lesson1.tsx` now calls `prefetchLessonMenuCache(lessonId, studyTargetRef.current)`.
- This keeps the lesson menu prefetch aligned with the existing target-scoped storage contract.

Verification:

- `tests/gustav_last_opened_lesson_target_isolation.test.ts` passed.

### Cosmetic avatar/profile cloud sync deferral

Status: closed.

What changed:

- Avatar/profile visual changes now keep optimistic local UI immediately, but non-critical cosmetic broad cloud sync is deferred by 30 seconds.
- Custom avatar purchase/restyle and paid aura purchase still use immediate `forceNow` sync, because those paths change ownership/economy state.
- Profile card level upgrade and cloud-error recovery still use immediate `forceNow` sync, because they are shard/economy authority paths.
- Profile card theme, motion, and public-focus changes now use deferred cloud sync instead of writing to cloud on every cosmetic tap.

Verification:

- `tests/owner_direction_runtime_contract.test.ts` now guards the reduced immediate forceNow allowlist and the cosmetic deferred policy.
- `tests/firebase_cost_controls_contract.test.ts` now guards the Firebase cost rule for avatar/profile cosmetic sync deferral.

### Core shard cloud mirror lower-overwrite guard

Status: closed.

What changed:

- `addShards`, `addShardsRaw`, and `spendShards` no longer apply successful cloud transaction balances through direct local `persistLocalBalance(cloudApplied.balance, ...)` writes.
- Those cloud success mirrors now go through the shared timestamp-guarded shard mirror before touching visible local wallet state.
- `dailyTasksAllShardsClaim` now returns `shardsUpdatedAtMs`, and the client uses that timestamp when mirroring `newBalance`.
- Daily all-task claim still writes the local claim marker, but stale returned balances cannot lower a newer local wallet.
- Cloud-backed `awardOneTime` now keeps its one-time marker while applying the returned balance through the same guarded mirror.

Verification:

- `npm test -- --runTestsByPath tests/shards_system.test.ts tests/daily_tasks_shards_claim.cloud.test.ts tests/daily_tasks_shards_claim_outcome.test.ts tests/one_time_shards_claim.cloud.test.ts tests/owner_direction_runtime_contract.test.ts --runInBand` passed.
- `npm --prefix functions test -- --runTestsByPath src/daily_tasks_shards.test.ts --runInBand` passed.
- `npm --prefix functions run build` passed.
- TypeScript transpile smoke for `app/shards_system.ts`, `functions/src/daily_tasks_shards.ts`, and the changed shard tests passed.

### Friend gift balance lower-overwrite guard

Status: closed.

What changed:

- Friend gift screens no longer copy raw `senderBalanceAfter` directly into visible shard balance after a send.
- After the server-first send resolves, both friends screens re-read the guarded local shard wallet through `getShardsBalance()`.
- That means `replaceShardsBalanceLocal` timestamp authority decides whether the server mirror is fresh enough before the UI shows it.
- The tabs friends send receipt now shows the same guarded balance as the wallet UI.

Verification:

- `npm test -- --runTestsByPath tests/owner_direction_runtime_contract.test.ts tests/friend_gifts.test.ts tests/friend_quests.test.ts tests/daily_tasks_shards_claim.cloud.test.ts tests/shards_system.test.ts --runInBand` passed.
- TypeScript transpile smoke for the changed friends screens and guarded shard/progress mirrors passed.
- `git diff --check` for the changed files passed with only existing CRLF warnings.

### Release wave bonus lower-overwrite guard

Status: closed.

What changed:

- Release-wave bonus no longer writes `shards_balance` directly after the Firestore transaction.
- The server claim still writes the one-time claim document first, but the local balance mirror now goes through `replaceShardsBalanceLocal(...)`.
- If another newer local shard operation happened while the transaction was in flight, the timestamp guard prevents the older release snapshot from lowering the wallet UI/storage.
- The local claim marker is still written, so an already-claimed release bonus does not become repeatable.

Verification:

- `npm test -- --runTestsByPath tests/owner_direction_runtime_contract.test.ts tests/friend_gifts.test.ts tests/friend_quests.test.ts tests/daily_tasks_shards_claim.cloud.test.ts tests/shards_system.test.ts --runInBand` passed.
- TypeScript transpile smoke for the changed friends screens, release-wave bonus, and guarded shard/progress mirrors passed.
- `git diff --check` for the changed files passed with only existing CRLF warnings.

### Economy client in-flight duplicate suppression

Status: closed.

What changed:

- `sendFriendGiftWithShards` and `sendFriendGiftThanks` now dedupe identical in-flight client requests before creating a second idempotency key.
- `claimFriendQuestReward` now dedupes the same in-flight quest reward claim by stable user and quest id.
- `redeemPromoCode` now dedupes the same normalized promo code while redemption is in flight.
- `ensureLeagueChestRewards` now dedupes the same in-flight league chest claim by user, week and group.
- `buyLeagueGroupBoost` now dedupes the same user's in-flight boost purchase.
- `callCommunityPurchasePack` now dedupes the same in-flight community pack purchase by buyer, pack and study target.
- Server authority did not change: these paths still wait for callable/server confirmation before applying permanent economy state.

Verification:

- TypeScript transpile smoke for 7 changed/audited economy client files passed.
- `npm test -- --runTestsByPath tests/owner_direction_runtime_contract.test.ts --runInBand` passed.

### Client AI in-flight dedupe and v2 OpenAI budget visibility

Status: closed.

What changed:

- `explainPhrase`, `explainChoice`, `explainQuiz`, and `compassVoice` client call wrappers now dedupe identical in-flight callable requests.
- `premiumDialogSend`, `premiumDialogTranslate`, and `explainMistake` client call wrappers now also dedupe identical in-flight callable requests.
- Fast double taps, remounts, or repeated render-triggered calls for the same request now share the same Promise instead of sending duplicate callable traffic.
- Admin v2 Diagnostics now has a read-only OpenAI budget panel backed by the existing `openAiBudgetDashboard` callable.
- The v2 budget panel loads only on explicit refresh/sign-in path, uses the server aggregate instead of browser Firestore scans, and keeps risky model/quota writes out of the v2 screen for now.
- The legacy OpenAI budget screen remains available for guarded model/quota controls while v2 stays read-only.
- `tests/openai_runtime_cost_contract.test.ts` now locks the client in-flight dedupe guard, current local Theo greeting contract, current dialog quota/model config, v2 budget panel, and legacy fallback.

Verification:

- `npm test -- --runTestsByPath tests/openai_runtime_cost_contract.test.ts tests/stats_insights_client_copy.test.ts --runInBand` passed.
- `node --check admin/v2/scripts/admin-firebase.js` passed.
- `node --check admin/v2/scripts/admin-core.js` passed.
- TypeScript transpile smoke for the six changed/audited AI client files passed.
- `npm test -- --runTestsByPath tests/openai_runtime_cost_contract.test.ts --runInBand` passed after extending the guard to Theo send/translate and mistake explain.
- `git diff --check -- app/ai_dialog_client.ts app/ai_mistake_explain_client.ts app/explain_phrase_client.ts app/explain_choice_client.ts app/explain_quiz_client.ts app/compass/compass_voice_client.ts admin/index.html admin/v2/scripts/admin-firebase.js admin/v2/scripts/admin-core.js tests/openai_runtime_cost_contract.test.ts` passed with only CRLF warnings.

### OpenAI miss budget refund

Status: closed.

What changed:

- `explainPhrase`, `explainChoice`, `explainQuiz`, and `compassGenerate` now reserve explain-family user/global budget through one helper.
- If a request loses the cache lock race and returns `pending`, the reserved budget is refunded.
- If the first OpenAI provider call fails before a usable response, the reserved budget is refunded.
- If the shared global cap rejects after the user counter was reserved, the user counter is refunded immediately.
- `statsInsightsGenerate` now refunds its separate global budget when the OpenAI fetch throws or returns a non-OK provider response.
- Rejected/parsed AI outputs after a real model response still count as budget use, because tokens were already spent.

Verification:

- `npm --prefix functions test -- --runTestsByPath src/explain/explain_budget.test.ts --runInBand` passed.
- `npm --prefix functions test -- --runTestsByPath src/weekly_review.test.ts src/stats_insights.test.ts --runInBand` passed.
- `npm test -- --runTestsByPath tests/owner_direction_runtime_contract.test.ts --runInBand` passed.
- `npm --prefix functions run build` passed.

### AI weekly/stats same-briefing replay

Status: closed.

What changed:

- `weeklyReviewGenerate` now stores `lastBriefingHash`, `lastReview`, and `lastModel` in the quota document after a successful generation.
- A retry with the same sanitized weekly briefing inside the closed window returns the stored review with `idempotentReplay: true` before rate-limit or OpenAI.
- `statsInsightsGenerate` now stores `lastBriefingHash`, `lastNotes`, and `lastModel` in the quota document after a successful generation.
- A retry with the same sanitized stats briefing inside the closed window returns stored notes with `idempotentReplay: true` before rate-limit, global budget, or OpenAI.
- A different briefing inside the closed window still returns the existing `not_ready` error. This preserves the one-generation-per-window product contract.

Verification:

- `npm --prefix functions test -- --runTestsByPath src/weekly_review.test.ts src/stats_insights.test.ts --runInBand` passed.
- `npm test -- --runTestsByPath tests/owner_direction_runtime_contract.test.ts --runInBand` passed.
- `npm --prefix functions run build` passed.

### `daily_tasks_set_rerolled`

Статус: закрыто.

Что сделано:

- Добавлен listener в `app/(tabs)/home.tsx`.
- Home теперь обновляет daily-task summary после полного reroll набора.
- `tests/app_events_overlay_registry.test.ts` больше не держит это событие в emit-only allowlist.

Проверка:

- `npm test -- --runTestsByPath tests/app_events_overlay_registry.test.ts --runInBand` passed.

### `tests/navigation_back.test.ts`

Статус: закрыто.

Что сделано:

- Найден дрейф теста: он ждал старый `router.back()` path.
- Текущий `app/navigation_back.ts` специально использует `router.replace(...)`, чтобы не возвращать Android/Fabric crash path.
- Тест обновлён под текущий контракт: no native back, replace to recorded previous route.

Проверка:

- `npm test -- --runTestsByPath tests/navigation_back.test.ts tests/navigation_back_underlay_contract.test.ts tests/deferred_redirect_contract.test.ts tests/haptics_rate_limit.test.ts --runInBand` passed.

### `tests/deferred_redirect_contract.test.ts`

Статус: закрыто.

Что сделано:

- Найден дрейф теста: он требовал `DeferredRedirect` даже для `app/league_screen.tsx`, который теперь является чистым re-export alias на `club_screen`.
- Тест обновлён: route shim безопасен, если использует `DeferredRedirect` или является чистым re-export; `useRouter` и `router.replace(...)` в render всё ещё запрещены.

Проверка:

- Входит в тот же зелёный navigation/haptics прогон выше.

### Owner runtime direction guardrail

Статус: закрыто.

Что сделано:

- Добавлен `tests/owner_direction_runtime_contract.test.ts`.
- Он фиксирует 20 guardrails под принципы хозяина:
  - быстрый startup не ждёт сеть;
  - широкий `syncToCloud()` debounced/locked, а `forceNow` только явное исключение;
  - новые `forceNow` call sites запрещены без owner-reviewed allowlist;
  - новые `setInterval`/polling call sites запрещены без owner-reviewed allowlist;
  - новые Firestore `onSnapshot` live listeners запрещены без owner-reviewed allowlist;
  - private arena room timer использует секундный UI tick и отдельный точный timeout;
  - boost countdown timer не запускается, когда активных бустов нет;
  - energy recovery polling не крутится при полной энергии, unlimited или background;
  - online presence heartbeat active-only и не чаще одного раза в 5 минут;
  - arena emoji cooldown timer не пересоздаёт sub-second interval;
  - league chat undo-hide countdown не тикает чаще видимой секунды;
  - arena acceptance/rematch countdown не тикает чаще видимой секунды;
  - Home Theo typewriter не рендерит каждый символ сверхчастым interval;
  - paywall urgency countdown не читает storage каждую секунду;
  - matchmaking elapsed timers не тикают чаще одного раза в секунду;
  - arena question timers используют секундный UI tick и отдельный точный timeout;
  - stats boost countdowns используют один общий interval вместо четырёх;
  - progress writes идут через очередь/ledger/serialized flush, а XP fallback остаётся optimistic/local-first;
  - analytics/activity queues capped, duplicate-throttled and sampled, не Firestore на каждый tap;
  - restore/migration monotonic, чтобы поздний sync не откатывал значения вниз.

Проверка:

- `npm test -- --runTestsByPath tests/owner_direction_runtime_contract.test.ts --runInBand` passed.

### `tests/firebase_cost_controls_contract.test.ts`

Статус: закрыто.

Что сделано:

- Найден дрейф теста: он ожидал, что экран `settings_invite_friend` не использует cloud referral invite builder.
- Текущий код уже делает правильный ленивый путь: персональная invite-ссылка строится только по явному нажатию Share, не на sign-in/render.
- Тест обновлён под текущий дешёвый контракт:
  - нет referral code generation on sign-in;
  - invite cloud link только внутри `onSendInvite`;
  - friends sync не читает referral collections.

Проверка:

- `npm test -- --runTestsByPath tests/firebase_cost_controls_contract.test.ts --runInBand` passed inside the broader cost/performance run.

## Needs Product/Owner Decision

### `bug_hunt_eligible_check`

Статус: нет runtime-владельца.

Что найдено:

- `components/NoEnergyModal.tsx` ставит `energy_onboarding_shown = 1` и отправляет событие.
- Слушателя нет.
- Живой Home UI для `bugHunt`/`bug_hunt` в текущем `app/(tabs)/home.tsx` не найден.

Решение:

- Либо восстановить/создать Home-side bug-hunt UI.
- Либо признать событие dormant/future hook.
- Не удалять событие без решения, потому что `NoEnergyModal` общий для многих экранов.

### `energy_purchased_shards`

Статус: нет runtime-владельца.

Что найдено:

- `app/energy_shard_refill.ts` отправляет событие после покупки энергии за осколки.
- `energy_reload` уже обновляет EnergyContext.
- `EnergyRefillShardModal` отдельно показывает success `action_toast`.

Решение:

- Решить, нужно ли событие для аналитики, достижений, stats или будущего UI.
- Если не нужно, оформить как dormant/future hook или удалить отдельным явным решением.

### `lesson_replay_started`

Статус: контракт есть, runtime-владельца нет.

Что найдено:

- `app/mastery.ts` отправляет событие.
- `app/events.ts` говорит, что `lesson1.tsx` должен reload progress.
- В `app/` и `components/` не найден production call site для `executeReplay(...)`.
- Текущий replay intro path в `lesson_menu.tsx` открывает `/lesson1` с `replayIntro=1`, но не вызывает `executeReplay(...)`.

Решение:

- Решить, mastery replay dormant legacy или надо восстановить реальный UI/listener.
- Не добавлять поведение вслепую, потому что это касается progress semantics.

## T0 Architecture Decision

### Shards Authority

Статус: смешанная модель, нужна отдельная владелец-правка перед runtime изменениями.

Что найдено:

- `firestore.rules` запрещает обычному клиенту писать top-level shard fields.
- Часть shard-путей уже идёт через Cloud Functions.
- `app/shards_system.ts` всё ещё содержит client transaction/local-first fallback paths.
- Узкие тесты подтверждают текущую mixed-mode модель.

Проверка:

- `tests/daily_tasks_shards_claim.cloud.test.ts` passed.
- `tests/shards_spend_cloud_timeout.test.ts` passed.

Решение:

- Либо постепенно переводить cloud-enabled shard mutations на Cloud Functions.
- Либо явно закрепить local-first fallback как допустимый контракт.
- Не менять rules и wallet code одновременно без отдельного плана.

### Server batching / cost vs freshness

Статус: нужен владелец для всех мест, где дешевле и свежее конфликтуют.

Что найдено:

- `CLASS_REGISTRY_SERVER_BATCHING.md` зафиксировал хороший шаблон: local durable queue -> Cloud Function -> transaction -> ledger -> local mirror.
- `app/_layout.tsx` уже делает важный порядок: restore cloud before sync cloud.
- Analytics/activity queues capped and mostly local, чтобы не писать Firestore на каждый tap.

Решение:

- Любой переход с live read на cache/SWR или наоборот согласовывать отдельно.
- Любую T0 optimistic wallet/progress правку делать только с idempotency key и reconciliation.

### `syncToCloud({ forceNow: true })` audit

Статус: нужен владелец перед runtime изменениями.

Что найдено:

- `app/cloud_sync.ts` уже debounces plain `syncToCloud()` for 5 minutes and serializes in-flight sync.
- `forceNow` call sites exist in auth, premium, XP migration, lesson completion, lesson1 intro/unlock, avatar/aura, profile card upgrade, battle pass store.

Решение:

- Оставить `forceNow` для account/purchase/one-time migration/paid economy paths.
- Отдельно решить, какие non-critical profile/stat/content writes можно перевести на deferred/debounced sync.

### Performance / startup tradeoffs

Статус: runtime ускорения разрешены только локально и без удаления фич.

Что найдено:

- `CLASS_REGISTRY_PERFORMANCE.md` зафиксировал startup path, timers/subscriptions, queues and dev runtime noise.
- Главный риск - не "медленно вообще", а конкретные hot spots: startup heavy init, AppState listeners, arena/matchmaking timers, broad AsyncStorage.

Решение:

- Можно добавлять guardrail tests.
- Нельзя ради скорости выключать preload, sync, analytics или premium/progress checks без отдельного решения.

### `tests/stats_premium_blur_performance_contract.test.ts`

Статус: закрыто после решения хозяина "блур лучше вообще убрать".

Что найдено:

- Тест ожидает, что `components/StatsPremiumBlur.tsx` не использует `expo-blur` / live blur.
- Старый `components/StatsPremiumBlur.tsx` импортировал `BlurView` и использовал его как fallback до cached image.

Что сделано:

- `expo-blur`, `BlurView`, `react-native-view-shot`, `captureRef`, `blurRadius` removed from `StatsPremiumBlur.tsx`.
- Non-premium users now see a lightweight static Premium placeholder, lock, and CTA instead of real stats under live blur.
- Premium/dev-unlocked users still receive the real children content.
- `components/statsPremiumBlurCache.ts` now returns `flat-veil`; realtime/cached blur paths are intentionally disabled.

Проверка:

- `tests/stats_premium_blur_performance_contract.test.ts`: passed.
- `tests/stats_premium_blur_cache.test.ts`: passed.

## Safe Non-T0 Performance/Cost Pass Closed - 2026-06-27

Status: closed for the currently approved safe scope.

What was completed:

- User/pack reports now share an in-memory throttle cache after first successful delivery.
- Lesson bug reports now use an in-memory throttle cache after first successful delivery.
- Admin user warning checks now use a local cooldown cache before reading throttle storage or querying Firestore again.
- Lightweight prompt gates now group their AsyncStorage reads with `multiGet`.
- Existing server delivery, failure behavior, UI result states, XP bonus order, premium/auth, shards, progress and cloud sync authority were not changed.
- Guard tests now lock the new behavior so these paths do not quietly return to repeated storage/server work.

Owner note:

- This pass deliberately stayed outside XP/progress/streak/shards/premium/auth/cloud authority.
- The safe pass removes repeated local bridge work and repeated spam-triggered report work, but it does not change the product truth model.

## Remaining Owner Decisions After Safe Pass - 2026-06-27

These are still open because they require product/owner choice, not because implementation stopped:

- T0 progress/shards/sync authority: needs a named owner-approved scope, idempotency key, monotonic merge rules, ledger/retry behavior and rollback protection before runtime edits.
- Firestore listener freshness: premium, remote config, arena, friends, league/chat and app messages need per-screen decisions before switching live listeners to cache-first/SWR.
- `syncToCloud({ forceNow: true })`: keep for account, purchase, migration and paid economy paths; decide separately for non-critical profile/stat/content writes.
- App Check Console/provider state: client and server code paths are audited. Recheck on 2026-06-27 still cannot confirm deployed enforcement from this workspace: `appcheck:apps:list` is unavailable in Firebase CLI 15.15.0, `functions:config:get` is `{}`, `gcloud` is not installed, and no repo-local `ENFORCE_APP_CHECK=true` was found. Provider registration/enforcement state still needs Firebase/Google Cloud Console confirmation.
- Dormant/future hooks (`bug_hunt_eligible_check`, `energy_purchased_shards`, `lesson_replay_started`): needs product decision before restoring UI/listeners or deleting anything.

## Closed T0 Monotonic Mirror Items - 2026-06-27

Status: closed for the narrow owner-approved "do not overwrite visible progress downward" scope.

Closed:

- Late progress event server mirror cannot lower local `user_total_xp`.
- Late progress event server mirror cannot lower current-week XP inside the same week.
- Cloud restore cannot relock English/French `unlocked_lessons` with a smaller stale cloud list.
- Cloud restore cannot lower stronger level exam progress fields.
- Friend quest reward mirror cannot lower local `user_total_xp` with a smaller returned `callerXp`.

Still open:

- Shards global `Math.max` is not safe. Real spends, server insufficient reconciliation and admin override must be able to lower balance.
- Full shards authority redesign still needs a separate owner-approved ledger/idempotency plan.

## Closed Shards Timestamp Mirror Items - 2026-06-27

Status: closed for the narrow owner-approved "stale shard server response must not overwrite a newer wallet operation" scope.

Closed:

- `replaceShardsBalanceLocal()` can now reject stale server mirrors when `updatedAtMs` is older than local shard meta.
- Friend gift spend mirrors include/pass `shardsUpdatedAtMs`.
- Friend quest reward shard mirrors include/pass `shardsUpdatedAtMs`.
- Community pack purchase spend mirrors include/pass `shardsUpdatedAtMs`.
- League group boost spend/voucher mirrors include/pass `shardsUpdatedAtMs`.
- League chest reward mirrors include/pass `shardsUpdatedAtMs`.
- Collectible shard bonus mirrors include/pass `shardsUpdatedAtMs`.

Still open:

- Do not convert the shard wallet to global `Math.max`; that would break real spends and admin corrections.
- Full shard authority still needs a separate product decision: keep mixed local/transaction fallback, or move all cloud-enabled shard mutations to callable ledger/idempotency.
- Firebase Console App Check enforcement/provider state still needs manual confirmation outside the repo. 2026-06-27 recheck confirmed only the code/default state, not deployed Gen2 env flags.

## Shards Ledger Audit Follow-up - 2026-06-27

Status: audit artifact added and two safe bypass fixes closed.

Artifact:

- `SHARDS_LEDGER_AUTHORITY_AUDIT_2026-06-27.md`

Closed:

- Release wave shard cloud/local grant now carries shard freshness metadata.
- Level gift fallback no longer writes raw `shards_balance`; it uses the shared shard mirror.
- `functions/src/auth_merge.ts`: account merge now stamps merged shard writes with `shards_updated_at_ms`, `shards_updated_op='replace'`, and `shards_updated_reason='account_merge'`, so a stale local wallet cannot treat the merged cloud balance as unversioned and overwrite it.
- Owner contract now guards all three cases.

Still open:

- Full callable-ledger migration: decide if mixed local fallback should remain a supported contract or be phased out path by path.

## Optimistic UI Coverage Audit - 2026-06-27

Status: audit artifact added; narrow pending-UI fixes closed.

Artifact:

- `OPTIMISTIC_UI_COVERAGE_AUDIT_2026-06-27.md`

Decision:

- Optimistic UI is already present in safe or bounded places: lesson progress, XP local fallback, arena answers, league group boost/likes, shard local fallback, and premium delivery after confirmed RevenueCat state.
- Optimistic UI should not be forced everywhere. Money, auth, account deletion, other-user economy, UGC purchase, public prestige, admin grant, and App Check protected mutation paths must remain server-first or confirmation-first.
- For server-first paths, the next UX work should be fast pending/disabled/retry states plus idempotency, not fake permanent success before authority confirms.

Closed:

- `app/flashcards/CardPackShardPaywallModal.tsx`: shard/voucher pack purchase CTAs now show a real `ActivityIndicator` while the existing `purchasing` lock is active.
- `app/(tabs)/friends.tsx` and `app/friends_screen.tsx`: friend gift rows now show a real `ActivityIndicator` on the selected gift while the existing `giftBusyId` lock is active.
- `app/profile_card_upgrade.tsx`: profile-card upgrade CTA now shows a real `ActivityIndicator` while the existing `busy` lock is active.
- `app/daily_tasks_screen.tsx`: daily-task reroll CTA now shows a real `ActivityIndicator` while the existing `rerollBusyId` lock is active.
- `app/friend_gifts.ts` and `functions/src/friend_gifts.ts`: friend gift sends now include a client idempotency key; the server saves the first successful result and replays it for duplicate delivery without a second shard spend, gift write, or push.
- `app/friend_gifts.ts` and `functions/src/friend_gifts.ts`: friend gift thanks now include a client idempotency key; duplicate thanks calls replay without a second thanks event or push notification.
- `functions/src/community_packs.ts`: community pack purchase already uses deterministic `buyerStableId__packId`; the owner guard now keeps repeated same-pack purchase attempts idempotent.
- `functions/src/league_groups.ts`: duplicate delivery of the same buyer's already-active group boost now returns the active boost as success; a different buyer is still blocked by `already-active`.
- `functions/src/friend_activity_likes.ts` and `app/league_group_boosts.ts`: duplicate delivery of the same friend activity like now returns `idempotentReplay` without a second counter increment/log; league boost cache uses the replay count instead of adding another local like.
- `functions/src/arena_bot_match.ts` and `app/arena_bot_profile_write.ts`: duplicate delivery of the same bot arena `sessionId` now replays from `match_history` without a second XP/SR/stat increment; history docs now store `sessionId` for cleanup queries.
- Reward-claim audit closed: daily all-task shards, league chest, collectibles, profile-card upgrade, arena season rewards, promo redemption, and RevenueCat premium/shard webhooks already have claim/processed markers or level guards; the owner guard now locks those markers.
- `components/paywall/PaywallCtaBlock.tsx` and `app/paywall_purchase.ts`: A/B/C premium purchase and restore are now mutually blocked. Purchase shows the existing spinner, restore shows its spinner, and restore is disabled while purchase is already pending.
- `components/onboarding.tsx`: inline personal-plan paywall now has separate purchase/restore pending states, visible spinners, disabled duplicate taps, and disabled plan switching while purchase/restore is in flight.
- `app/personal_plan_state.ts`: `clearPersonalPlanState()` now clears the in-memory personal-plan cache as well as AsyncStorage, so a clear cannot keep showing an old active plan.
- `tests/owner_direction_runtime_contract.test.ts`: guard prevents the pending visual from being silently disabled again with `false && purchasing`.
- `tests/premium_modal_locale.test.ts`, `tests/paywall_purchase_activation_contract.test.ts`, and `tests/personal_plan_premium_activation_contract.test.ts`: guards lock premium pending UI, mutual purchase/restore blocking, and onboarding inline pending states.
- Purchase/gift/profile/reroll authority did not change: ownership, gift receipt UI, public prestige, task replacement and balance changes still wait for the existing server/purchase result.

Still open:

- Extend idempotency keys to other repeatable economy callables if owner approves each path.
- Continue auditing server-first screens for missing pending UI, without changing authority.
- Continue using monotonic/timestamp reconciliation for any local mirror of XP/progress/shards.

## Current Green Checks

Latest focused runs:

- Premium pending UI run on 2026-06-27: 3 suites, 17 tests passed.
- Friend gift idempotency run on 2026-06-27: root 2 suites, 42 tests passed; functions 1 suite, 7 tests passed; functions build passed.
- Auth merge shard freshness run on 2026-06-27: functions `auth_merge` 1 suite, 42 tests passed; owner guard 1 suite, 41 tests passed; required root auth/account guards 5 suites, 79 tests passed; functions `auth_identity` 1 suite, 15 tests passed; functions build passed.
- Friend activity like replay run on 2026-06-27: functions `friend_activity_likes` 1 suite passed; owner guard passed; functions build passed.
- Arena bot match replay run on 2026-06-27: functions `arena_bot_match` 1 suite, 2 tests passed; combined functions replay suite 3 suites, 54 tests passed; owner guard passed; functions build passed.
- Current combined focused run: 16 suites, 130 tests passed.
- Premium stats veil run: 2 suites, 2 tests passed.
- Cost/performance/server-safety run: 7 suites, 52 tests passed.
- Events/navigation run: 4 suites, 22 tests passed.

Individual checks covered:

- `tests/app_events_overlay_registry.test.ts`: passed.
- `tests/owner_direction_runtime_contract.test.ts`: passed.
- `tests/firebase_cost_controls_contract.test.ts`: passed.
- `tests/arena_firestore_cost_controls.test.ts`: passed.
- `tests/mastery_replay.test.ts`: passed.
- `tests/firestore_rules_security.test.ts`: passed.
- `tests/progress_event_type_contract.test.ts`: passed.
- `tests/progress_events_client_queue.test.ts`: passed.
- `tests/progress_events_engine.test.ts`: passed.
- `tests/daily_tasks_shards_claim.cloud.test.ts`: passed.
- `tests/shards_spend_cloud_timeout.test.ts`: passed.
