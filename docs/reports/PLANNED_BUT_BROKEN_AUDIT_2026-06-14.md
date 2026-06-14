# Planned-but-Broken Audit — Phraseman (2026-06-14)

Read-only scan. No code changed. Every item below was verified against current `master` code with `file:line`; suspected-but-unverified items are labeled as such. Items prior reports flagged that are now **fixed** are listed at the end so they aren't re-investigated.

Method: 5 parallel agents over (1) feature flags/kill-switches, (2) TODO/stubs/dead code, (3) Cloud-Functions wiring & deploy, (4) tests/tsc health, (5) prior-report mining — plus direct grep verification of the highest-stakes items by the orchestrator.

---

## A. CONFIRMED broken / silently-failing for real users

### A1. Arena bot-match rank, XP, stars & history silently NOT saved (CONFIRMED)
- Firestore rule `arena_profiles/{userId}` → `allow write: if false` (`firestore.rules:977`) and `match_history` → `if false` (`firestore.rules:982`).
- BUT the client still writes there, errors swallowed:
  - `app/arena_bot_profile_write.ts:163` (rank/xp/stats transaction) + `:231` (match_history)
  - `app/arena_results.tsx:790` (read+persist loop), `app/xp_manager.ts:233` (multipliers), `app/cloud_sync.ts:1865`, `app/public_profile_snapshot.ts:212`
- The fix function `arenaBotMatchRecord` (`functions/src/arena_bot_match.ts:29`) IS deployed but **the client never calls it** (only referenced in a comment, `app/arena_season_math.ts:9`).
- The rule comment at `firestore.rules:975` even falsely claims "ни одного setDoc('arena_profiles') в app/".
- **Impact:** after a bot match, rank progression / XP / stars / streak / match history do not persist. This is the exact bug `arenaBotMatchRecord` was written to fix; the migration was never completed. (Memory said this was fixed — it is NOT.)

### A2. App Check not enforced on paid OpenAI endpoints (CONFIRMED)
- `functions/src/callable_options.ts:3`: `ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === 'true'`; that env var is set `true` nowhere in the repo → **false in prod**.
- All paid callables pass `enforceAppCheck: ENFORCE_APP_CHECK` (=false): `explainPhrase` (`explain_phrase.ts:79`), `explainMistake` (`mistake_explain.ts:204`), `premiumDialogSend` (`premium_dialog.ts:265`), `weeklyReviewGenerate` (`weekly_review.ts:345`), `statsInsightsGenerate` (`stats_insights.ts:396`), `scorePronunciationAttempt` (`pronunciation_scoring.ts:174`).
- **Impact:** the 3 *reachable* paid ones (explainPhrase, explainMistake, premiumDialogSend) can be called by any authed client with no attestation → cost-drain/abuse risk. (Not a one-liner to fix — needs attestation warm-up; flagged in 3 prior reports, still open.)

### A3. Paywall testimonials render empty in production (CONFIRMED)
- `app/paywall_testimonials.ts:38`: `// TODO(before release): заменить на РЕАЛЬНЫЕ отзывы и выставить verified:true.`
- Every entry is `verified:false` `[[draft]]`; prod calls `pickTestimonials(..., includeUnverified=false)` → the whole social-proof section silently disappears.
- **Impact:** a research-backed conversion block ships blank.

### A4. Onboarding "name taken" loop after a crash (CONFIRMED STILL OPEN)
- `app/_layout.tsx:1610,1651` decides whether to show onboarding from `onboarding_done` alone. There is no "`user_name` exists → treat as onboarded" branch (only the Android `duel_*` install-referrer path at `:1624` uses the name).
- **Impact:** if the app crashes between name-save and onboarding-done, the user re-enters onboarding, types the same name, server returns "Это имя уже занято," and they're stuck. (The 15s `nameReserve` timeout added recently only softens the dead-button symptom, not the loop.)

### A5. Non-Russian locales fall back to Russian in onboarding (CONFIRMED, by-policy)
- `components/onboarding.tsx:650-660`: pt-BR / vi / id / tr / pl are each gated behind `isInterfaceLangEnabled(...)` (off in store) → `detectLang()` returns `'ru'`.
- **Impact:** a Brazilian/Vietnamese/Turkish/Polish/Indonesian device sees a Russian onboarding (not English). "Correct by policy," but it's a real first-run UX break for non-RU users. Prod UI is effectively ru/uk only.

### A6. `xp_manager.ts` DebugLogger bug breaks test compilation (CONFIRMED, real)
- `app/xp_manager.ts:263` and `:293` call `DebugLogger.warn(ctx, err, 'server_queued')` with **3 args**; `.warn` takes **2** (`app/debug-logger.ts:28`) — only `.error` takes 3.
- At runtime the 3rd arg is dropped (harmless), BUT under `ts-jest` + `strict:true` this is a compile error that **aborts every test suite transitively importing `xp_manager`** (~23 source files), e.g. `tests/level_gift_inventory.test.ts` cannot run.
- **Impact:** 2-line fix; part of the tsc baseline AND a hidden test-coverage hole.

---

## B. Built-but-DEAD on the backend (deployed, never invoked)

These cost deploy footprint and confuse; some are intentional, some are loose ends.

- **B1. `scorePronunciationAttempt`** — deployed (`pronunciation_scoring.ts:172`, in deploy:safe) but **zero client callers**; two tests assert it should be REMOVED (`tests/openai_runtime_cost_contract.test.ts:37-38`, `tests/personal_plan_pronunciation_repeat_live_route.test.ts:138`). Dead + paid OpenAI + App-Check-off + contradicts intended removal. **Cleanup/security loose end.**
- **B2. `arenaGhostCreateChallenge` / `arenaGhostRecordPlay`** — deployed (`arena_ghosts.ts:79,120`) but no client surface at all. The "arena ghost challenge" feature is server-only, invisible to users. Also no App Check option on these.
- **B3. `weeklyReviewGenerate`** — deployed but client uses a LOCAL template (`app/weekly_review_client.ts`), enforced by `tests/openai_runtime_cost_contract.test.ts:28-29`. **Intentional** (cost), but it means "AI weekly review" is template text, not AI.
- **B4. `statsInsightsGenerate`** — same pattern (`app/stats_insights_client.ts`, test :30-31). **Intentional**, but stats insights are local, not AI.

---

## C. Feature exists but is GATED OFF (intentional rollout gates — confirm intent)

- **C1. Arena global Top-100 leaderboard** — hard kill-switch `ARENA_TOP100_REMOTE_ENABLED = false` (`app/arena_leaderboard_fetch.ts:62`, enforced :714). Users only see stale local cache; the full remote-fetch path is built but disabled.
- **C2. Arena ranked-wager (shard staking)** — built but defaults closed: remote flag `rankedWagerEnabled` falls back to `false` when the `app_meta/arena_feature_flags` doc is missing (`app/services/arena_feature_flags.ts:33,39,57,60`); gate at `app/arena_lobby.tsx:228`. OFF unless an admin creates the doc.
- **C3. League XP-promotion mode** — Remote Config `league_xp_promotion_enabled` defaults `false` (`app/remote_flags.ts:82`; used `app/league_engine.ts:632`). Unlaunched experiment.
- **C4. Spanish UI locale** — `SPANISH_UI_LOCALE_ENABLED = false` (`app/config.ts:126`, used `constants/i18n.ts:45`). Spanish hidden as interface language (translations incomplete → RU fallback).
- **C5. On-device neural TTS (Kokoro)** — stub only; `app/spike_voice.tsx:53-66` leaves a "place-stub" and always falls back to stock TTS. Planned premium voice engine is half-built (a "Spike 0" prototype).
- **C6. "Explain like I'm 5"** — flag file says cohort/default-OFF (`app/explain_phrase_flags.ts:13`) but `eas.json:21` ships it `true` to ALL store users. ON, but the "cohort" framing is stale → confirm 100% rollout is intended.

---

## D. Content-coverage gaps surfaced to users as "coming soon"

Code is fine; the underlying content for some lessons/plan-days isn't authored, so users hit placeholders:
- `app/lesson_menu.tsx` — vocab (`:701`), irregular verbs (`:755`), prepositions (`:809`) tiles show "Скоро/Material готовится" when that lesson lacks data.
- `app/personal_plan_theory.tsx:42` — "Теория для этого дня скоро появится" for unauthored plan days.
- `app/(tabs)/lessons.tsx:1062` — "Продолжение скоро" footer (course incomplete by design).
- `app/lesson_help.tsx:19837` — fallback "Теория для этого урока скоро появится".
- `app/(tabs)/quizzes.tsx:1606` — "Вопросы временно недоступны" when a quiz has no phrases.

---

## E. Suspected-still-open (flagged by prior reports; NOT re-verified line-by-line)

Honest gaps — each needs one more grep to confirm:
- **Identity/auth merge hardening** (AUTH_IDENTITY_AUDIT H1/H3/H4/H5/H7/H10): account merge wiring was *confirmed fixed* (see F2), but the surrounding hardening (claim-once uid binding, premium-cache invalidation on swap, 2nd-device anon progress loss, RC anon-id writes) has **no fix claimed**. Likely partially open.
- **Exam XP cap** (ECONOMY #3 / DEEP P1): ≥90% exam = 10000 XP × all boosts, no cap/idempotency. No fix claimed.
- **Lessons 18 & 20 have 49/50 phrases** (DEEP_AUDIT P1, regression test red). No later fix claimed.
- **Referral C2/C3** (REFERRAL_AUDIT): "completed a lesson" antifraud = "lesson 2 unlocked" (granted without completing); French course never triggers referral reward (reads only EN/legacy keys). No fix claimed. (C1 is FIXED — see F4.)
- **matchmaking_queue leaks push tokens/nicks** to any authed user (DEEP P1). No fix claimed.

---

## F. Prior-flagged items VERIFIED FIXED (do not re-investigate)

- **F1. All deploy:safe Cloud Functions are exported** — the 2026-06-10 "arena rooms not exported" bug is gone; all 101 whitelisted functions are referenced in `functions/src/index.ts`. (Only `openAiBudgetDashboard`/`openAiDialogModelConfig`/`openAiDialogQuotaConfig` are excluded from deploy:safe — they're admin-gated, correct.)
- **F2. Server account-merge IS wired to client** — `app/cloud_sync.ts:1132` (`httpsCallable('authMergeStableAccounts')`) called from `app/auth_provider.ts:1017`; old by-XP local merge replaced.
- **F3. Economy fields ARE protected by rules** — shards always Admin-only (`firestore.rules:38-50`); premium/VIP fields Admin-only; XP/streak/level/weekly_xp protected once `progressServerAuthoritative` is set (`firestore.rules:96-110`, graceful migration). (Not "rules protect nothing" as older reports said.)
- **F4. Referral share uses the REFERRAL code, not the friend code** — `app/(tabs)/friends.tsx:109,1412-1413,1448` (`buildCloudReferralInviteShare` + dedicated `referralCode`); C1 fix documented at `:1419`. `referral_enabled` now defaults `true` (`app/remote_flags.ts:77`); invite page exists at `knowly-www/phraseman/invite/index.html`.
- **F5. Onboarding answers are used, not hardcoded** — `components/onboarding.tsx:727-755` maps picker goal/minutes/level into the profile ("никаких хардкодов"). *Minor:* `a0` ("from scratch") still maps to `currentLevel='a1'` (`:747`) — lossy at level granularity only.
- **F6. Onboarding double-paywall removed** — purchase happens inline (`components/onboarding.tsx:1232-1320`); no second `/premium_modal` hop. Mid-onboarding push prompt also removed (`requestPermission:false` at `:1203,:1774`; permission requested after purchase `:1332`).
- **F7. No skipped/disabled tests** — zero `.skip/.only/xit/.todo` across 606 test files. The few red suites are STALE source-grep contract tests (`personal_plan_premium_activation_contract`, `leaderboard_identity_and_league_membership_contract`, `personal_plan_premium_ui_contract`) — the features are present (in one case *more* hardened than the test expects).
- **F8. FORCE_PREMIUM is safe in prod** — `app/config.ts:71` ANDs with `IS_DEV_RUNTIME && !IS_STORE_RELEASE`; locked by `tests/force_premium_prod_guard.test.ts`.

---

## tsc baseline (29 errors) — breakdown
- 14 × `hitSlop` object→number (RN-types regression; cosmetic)
- 8 × FlashList v2 un-migrated props (`@shopify/flash-list` 2.0.2 dropped `estimatedItemSize`)
- 4 × stray draft `docs/reports/ai_dialogue_premium_dialog.draft.ts` leaking into typecheck (should be excluded)
- 2 × `xp_manager.ts` DebugLogger.warn 3-arg → **real (A6)**
- 2 × `components/onboarding.tsx:619/625` TDZ (`styles` used before declaration) — latent runtime hazard (file owned by another session; not touched)
- 1 × `BouncyScrollView.tsx` ReactNode cast (noise)

## Priority
1. **A1** bot-match rank/XP silently lost (wire client → `arenaBotMatchRecord`, or relax rules) — real player-facing data loss.
2. **A2** App Check off on reachable paid OpenAI callables — cost/abuse.
3. **A6** `xp_manager` 2-line fix — unblocks ~23 test suites.
4. **A3** empty paywall testimonials — conversion.
5. **A4/A5** onboarding name-loop + non-RU fallback — first-run UX.
6. **B1** remove dead `scorePronunciationAttempt`.

---

## FIX STATUS (2026-06-14, this session)

| Item | Status | Commit / note |
|---|---|---|
| **A6** xp_manager DebugLogger.warn 3-arg | ✅ FIXED | `78660464` — switched to `.error(ctx,err,'warning')`; added RN-firebase app/functions Jest mocks; `level_gift_inventory.test` 0→6/6. tsc 29→27. |
| **B1** dead `scorePronunciationAttempt` | ✅ FIXED (needs functions deploy) | `19921505` — removed export + deploy:safe entry + deleted source file. 2 contract tests now pass. |
| **A2** App Check off | ✅ PREPARED (not enabled — user choice) | `9f5abdda` — added per-group flags `ENFORCE_APP_CHECK_SENSITIVE`/`_OPENAI` so staged rollout is executable; behavior unchanged (still off). Console setup still required before enabling. |
| **A3** empty paywall testimonials | ✅ FIXED | `4c211e77` — shipped 4 REAL Google Play reviews (from landing `0338417a`) as `verified:true`; anti-fake guard intact; 11/11 tests pass. |
| **A4** onboarding "name taken" loop | ✅ FIXED | `f425dd6a` — pass saved `user_name` as `oldName`; if server says taken but name == own saved name, proceed. tsc clean. |
| **A1** bot-match rank not saved | ↪ HANDLED BY ANOTHER SESSION | `e0a62cc0` wired client → `arenaBotMatchRecord` CF. Left untouched (file was locked); confirmed fixed there. Needs functions deploy. |
| **A5** non-RU locales → Russian | ⚠️ NOT A CODE BUG | App has NO English UI bundle (`INTERFACE_LANG_READY_FOR_PROD = ['ru','uk']`, `UiBundleLang = 'ru'|'uk'|'es'`). RU fallback is the app's RU-first reality; "fix" = build an English translation (product decision, out of scope). |

**Deploy still required by user:** `git push`, then `firebase deploy --only functions` (for A1 + B1 to take effect server-side). App-side fixes (A3/A4/A6) ship with the next build.
