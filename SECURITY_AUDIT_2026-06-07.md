# Security Audit — phraseman

**Date:** 2026-06-07
**Scope:** Cloud Functions (53 TS files), Firestore rules, static admin web panel, React Native client, infra config, dependencies.
**Method:** Multi-agent parallel audit (5 domain auditors) → adversarial verification of every candidate finding → severity re-rating.
**Result:** 45 candidate findings → **16 confirmed**, 29 refuted as false positives / non-exploitable after verification.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High     | 8 |
| Medium   | 1 |
| Low      | 7 |

> **Overall posture: solid.** Firestore rules use an explicit catch-all `deny`, admin gating via unforgeable `token.admin` custom claim, server-authoritative scoring for ranked play, secrets via Secret Manager / gitignored `.env`. No hardcoded secrets in source, no secrets in git history. The confirmed issues cluster around a few **Cloud Functions that trust client-supplied identity or scores**, and **Firestore rules that over-share data to any authenticated user**.

---

## HIGH severity (fix before next release)

### H1 — `leagueActivateGroupBoost`: public HTTP endpoint, no auth, drains victim shards
**File:** `functions/src/league_groups.ts:496-523` · **Category:** broken-auth / IDOR

`onRequest` with `invoker: 'public'` and `Access-Control-Allow-Origin: *`. Takes `stableId` from the POST body and deducts 50 shards from that user — **no Firebase ID token verification, no App Check, no ownership check**. `stableId` values are enumerable (`leaderboard` is world-readable; `league_groups` members are readable by groupmates). An attacker POSTs `{"data":{"stableId":"<victim>"}}` and drains the victim's shard balance.

**Fix:** Convert to `onCall`; require `request.auth?.uid`; derive `stableUid` from the verified identity via `resolveStableUidForAuth` — never from the body. (Same pattern as the other league callables in this file.)

### H2 — `arenaGhostCreateChallenge`: client-supplied `isCorrect`/`points` trusted
**File:** `functions/src/arena_ghosts.ts:65-117` · **Category:** missing-validation

`normalizeAnswer` accepts `isCorrect` and `points` from the client and clamps them only to `[0, MAX_SCORE_PER_QUESTION]`. The server never cross-checks the answer against the correct value. A player fabricates an all-correct, max-score ghost (`12 × 195 = 2340`) that real players are then matched against — corrupts ghost/leaderboard integrity.

**Fix:** Fetch authoritative `correct` from `arena_questions/{questionId}` server-side; compute `isCorrect`/`points` from `answer === correct` using `calculateArenaPoints`. Ignore client values.

### H3 — `friendSendGift`: sender ownership check skipped when `firebaseAuthUid` absent
**File:** `functions/src/friend_gifts.ts:154-381` · **Category:** IDOR

`senderStableId` comes from the body. The ownership guard only fires when `linkedAuthUid` is non-empty:
```ts
const linkedAuthUid = typeof senderData.firebaseAuthUid === 'string' ? senderData.firebaseAuthUid : '';
if (linkedAuthUid && linkedAuthUid !== request.auth!.uid) { throw ... }
```
For any sender doc lacking `firebaseAuthUid` (legacy/anonymous/unlinked accounts), the check is bypassed and an attacker (who is a friend) drains the victim's shards.

**Fix:** Derive the sender from `request.auth.uid` via `resolveStableUidForAuth`, or reject outright when `firebaseAuthUid` is absent. Never accept a self-asserted sender identity.

### H4 — `arenaHillRecordAttempt`: client `sessionId` as dedup key → unlimited wins
**File:** `functions/src/arena_hill.ts:97-194` · **Category:** missing-validation

Dedup doc id is `session_{sessionId}_{stableUid}` with `sessionId` fully client-controlled. For non-`bot_hill` IDs the age check (`parseSessionStartedAt`) is a no-op (return value discarded). An authenticated user loops with fresh IDs to record unlimited daily wins, manipulating the throne champion. Trivially scriptable.

**Fix:** Require `sessionId` to map to a real `arena_sessions` doc with `state === 'finished'` and the caller in `playerIds` (as `arenaClubWarContribute` does). For bot matches, generate the session id server-side.

### H5 — Admin panel: no CSP / X-Frame-Options (clickjacking + XSS amplification) — ✅ FIXED 2026-06-07
**File:** `firebase.json:21-29` · **Category:** insecure-config
**Remediation:** Added `Content-Security-Policy` (with `frame-ancestors 'none'`, `object-src 'none'`, gstatic/firebase allowlist), `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` to the admin hosting target. CSP origins verified against the panel's actual usage (gstatic ESM Firebase SDK, `*.cloudfunctions.net` callables, same-origin seed fetch). Deploy: `npm run hosting:admin`.

The admin hosting target sets only `Cache-Control`/`Pragma`. No `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`. The panel is on **public** Firebase Hosting. An attacker can frame it for clickjacking against a logged-in admin (approve/unban/broadcast). Firestore rules don't help — the click comes from the admin's own authenticated session. `admin/index.html` also has ~253 `innerHTML` assignments of Firestore data; absent CSP, any stored XSS becomes token-exfiltration.

**Fix:** Add to the admin target headers:
```json
{ "key": "Content-Security-Policy", "value": "default-src 'self' https://www.gstatic.com https://*.googleapis.com https://*.firebaseapp.com https://*.firebaseio.com; script-src 'self' https://www.gstatic.com; object-src 'none'; frame-ancestors 'none'" },
{ "key": "X-Frame-Options", "value": "DENY" },
{ "key": "X-Content-Type-Options", "value": "nosniff" },
{ "key": "Referrer-Policy", "value": "no-referrer" }
```

### H6 — Live production secrets in `.env.local`, no secret-scanning safety net — ⚠️ PARTIALLY FIXED 2026-06-07
**File:** `.env.local:7-17` · **Category:** secret-exposure
**Remediation (done):** Added a secret-scanning safety net — (1) zero-dependency scanner `scripts/scan_secrets.mjs` (OpenAI/ElevenLabs/RevenueCat/Stripe/AWS/Google/Slack/GitHub/private-key/bearer detectors + a literal-only `NAME=value` assignment detector for opaque keys with no prefix, e.g. Pexels/Pixabay; redacted output; Firebase-client-key file+line exemption); (2) git `pre-commit` hook auto-installed via npm `prepare` (`scripts/install-git-hooks.mjs`, no husky dep, backs up any pre-existing hook); (3) CI workflow `.github/workflows/secret-scan.yml` running the Node pre-check + authoritative `gitleaks` action over full history; (4) `.gitleaks.toml`.
**Self-audit (2026-06-07) — found & fixed 4 defects in the first cut:** the initial scanner did NOT scan `.env.local` at all (the `TEXT_EXT` regex anchored on `.env$` but the filename ends in `.local`) — i.e. it failed against the exact file H6 is about; it also missed the opaque Pexels/Pixabay keys, over-exempted any line containing `apiKey`, and silently clobbered existing git hooks. All fixed and re-verified END-TO-END against the **real** `.env.local`: all 5 keys now blocked (lines 7/10/12/14/17), full 29k-file tree clean (0 false positives — an over-greedy fix briefly produced 31 FPs and was tightened to literal-only). Manual command: `npm run scan:secrets`.
**⚠️ STILL REQUIRED (manual, user action):** **Rotate all 5 keys** in `.env.local` (ElevenLabs, OpenAI, RevenueCat secret, Pexels, Pixabay) — treat as at-risk since they sat in plaintext. The scanner prevents *future* accidental commits but cannot un-expose a key that was already on disk.

Five live keys in plaintext: ElevenLabs (`sk_…`), OpenAI (`sk-proj-…`), **RevenueCat secret** (`sk_RbQa…`), Pexels, Pixabay. File is currently **gitignored and never committed** (verified) — so no remote exposure today. But `.gitignore` is the *only* guard: no pre-commit hook, no CI secret scanning. One `git add .` exposes all five. The RevenueCat secret can grant arbitrary premium entitlements via REST.

**Fix:** Rotate all five (treat as at-risk). Add a pre-commit hook (gitleaks / detect-secrets) and a CI secret-scan gate. Keep dev secrets in an OS keychain rather than plaintext on disk.

### H7 — `matchmaking_queue` readable by any authed user → push-token harvesting
**File:** `firestore.rules:361-368` · **Category:** IDOR

`allow read: if request.auth != null` on a collection whose docs contain `expoPushToken` and `displayName`. Any throwaway account collection-scans and harvests push tokens; Expo's push endpoint needs only the token to send arbitrary notifications.

**Fix:** `allow read: if request.auth != null && request.auth.uid == entryId;` (the Admin SDK function doesn't need a client read rule). Expose queue count via the existing public `app_meta` aggregate if the UI needs it.

### H8 — *(duplicate of H1 — same `leagueActivateGroupBoost` endpoint, reported by a second auditor)*
Counted once for remediation. Confirms the finding independently.

---

## MEDIUM severity

### M1 — `users/{userId}/my_events` readable by any authed user (IDOR)
**File:** `firestore.rules:417-419`

Friend-activity feed (gift sent/received with target/sender UIDs and names, XP/streak timestamps) is world-readable to authenticated users. Target UIDs are derivable from the world-readable leaderboard. (Note: the friends list at `:404-405` already leaks the graph via a parallel path — fix both.)

**Fix:** `allow read: if canonicalUserMatchesAuth(userId);` (matches the pattern used for `activity_likes_received`).

---

## LOW severity (hardening / cheat-resistance)

- **L1 — `arenaRoomRecordRun` trusts client score** (`functions/src/arena_rooms.ts:166-210`). Cosmetic only — room scoreboard is ephemeral and not wired to global leaderboard/XP/economy. Recompute server-side when feasible.
- **L2 — `leagueUpdateMyMember` lets client self-declare `isPremium`/`isVip`** (`functions/src/league_groups.ts:314-346`). Cosmetic badge spoof; no feature gate reads these. Remove the fields from accepted input; derive from authoritative subscription state.
- **L3 — Chat rate-limit TOCTOU** (`functions/src/arena_rooms.ts:368-414`, also `league_chat.ts:244`). Read-check-write not atomic → one extra message per coordinated concurrent pair. Wrap in a Firestore transaction.
- **L4 — RevenueCat webhook: auth check after business-logic routing + non-constant-time compare** (`functions/src/revenuecat_shards.ts:381-415`). Product-ID oracle leaks only public App-Store IDs; timing channel impractical over HTTPS. Still: move auth to the top of the handler and use `crypto.timingSafeEqual`.
- **L5 — App Check not enforced on callables** (`functions/src/callable_options.ts:3`, `ENFORCE_APP_CHECK` defaults false). Deliberate, documented deferral; Firebase Auth + per-user rate limits contain cost. Enable App Check API in the project, then deploy with `ENFORCE_APP_CHECK=true`.
- **L6 — `app_check_token_auto_refresh:false` + opt-in enforcement** (`firebase.json:64-65`). Same root cause as L5; correct once App Check is provisioned.
- **L7 — `banned_users` / `user_warnings` enumerable by any authed user** (`firestore.rules:147-156`). Exposes UIDs + admin warning text. Scope reads to owner/admin: `allow read: if request.auth != null && (isAdmin() || resource.data.uid == request.auth.uid)`.

---

## Notable NON-issues (verified false positives — do not "fix")

These were raised by auditors and **refuted** with evidence — recording so they aren't re-flagged:

- **Timing-attack on webhook/bot `===` comparisons** — impractical over HTTPS/Cloud Run jitter; secrets are high-entropy in Secret Manager. (Best-practice `timingSafeEqual` still recommended, see L4 — but not a vulnerability.)
- **CORS wildcards** on `website_contact` / `leagueActivateGroupBoost` — no `Allow-Credentials: true`, so no credential forwarding; endpoints are already public to non-browser callers.
- **App Check missing on `adminGrantReward`/`leagueChestClaim`/`referralApply`** — each has independent server-side authz (unforgeable `admin` claim, membership checks, account-age caps, transactional idempotency).
- **`leagueChestClaim` / `arenaClubWarContribute` double-claim / score-injection** — Firestore transactions are serializable; `session_players.score` is not in the client-writable field allowlist (`:290-298`).
- **`questionTimeout` / `arena_sessions` update rule** — scoring is fully server-authoritative; client state writes only sync timers/forfeit and cannot inflate rank.
- **Admin `testers.html` client-only gate, unbounded admin reads, `safeText` quote-escaping** — admin is fully trusted by design; Firestore `isAdmin()` is the real gate; user fields are numeric-coerced server-side; user content lands in text-content position, not attributes.
- **`leaderboard` world-readable / contains `firebaseAuthUid`** — leaderboard is public by design; Firebase UIDs are project-scoped non-secrets. (Minor hygiene: omit `firebaseAuthUid` from leaderboard docs.)
- **`allowBackup:true` + `stable_id` in AsyncStorage** — `stable_id` is a non-secret UUID; access requires the Firebase Auth token bound via `auth_links`.
- **`functions/.env` "not gitignored"** — root `.gitignore:34` `.env` is recursive and already covers it; current contents are benign.
- **E2E test creds in AsyncStorage, OpenAI worker in `app/`** — `.test` TLD accounts with no claims; files unreachable by Metro (blocklisted `tools/`/`tests/`, store-release stub).

---

## Recommended remediation order

1. **H1/H8** `leagueActivateGroupBoost` → `onCall` + auth (active fund-draining path).
2. **H6** rotate the 5 secrets + add secret-scanning pre-commit + CI.
3. **H7, M1, L7** tighten Firestore read rules (`matchmaking_queue`, `my_events`, `banned_users`/`user_warnings`).
4. **H3, H4, H2** server-derive identity / server-validate scores in the affected callables.
5. **H5** add admin-panel security headers.
6. **L3, L4, L5/L6** transactions for rate limits; webhook auth-first + `timingSafeEqual`; provision + enforce App Check.
