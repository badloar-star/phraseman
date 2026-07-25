# Handoff: Multi-Device Progress Sync Bug — Research & Fix Plan

> **Prepared for:** Kimi Kate Ray / Химикат 3  
> **Date:** 2026-07-21  
> **Severity:** P0 — mass user impact (all Google Sign-In users with 2+ devices)  
> **Estimated scope:** 2–3 files, ~20–40 lines of code change

---

## 1. Problem Statement

When a user signs in with Google on iPhone and then signs in with the **same Google account** on Android, Phraseman **creates two independent profiles** instead of linking them. The user sees:
- **Plus subscription** works on both devices (RevenueCat / Apple / Google Play handles this)
- **Progress (lessons, XP, streak) is DIFFERENT** on each device
- The user rightfully expects identical progress

This is **NOT a user error**. This is a bug in our identity linking code.

---

## 2. Root Cause Analysis

### 2.1 What `auth_links` is supposed to do

`auth_links/{providerUid}` maps a **permanent Google account ID** (`sub` from Google) to our internal `stable_id`. This is the anchor that lets us find the same user on any device.

```
auth_links/{google_sub}  →  { stable_id: "abc123..." }
```

When the user opens Phraseman on a new device and taps "Sign in with Google", the app:
1. Gets the Google `sub`
2. Looks up `auth_links/{google_sub}`
3. Finds the existing `stable_id`
4. Pulls progress from `users/{stable_id}`

### 2.2 What is actually happening (the bug)

In `app/auth_provider.ts`, line ~1172, after `signInWithCredential`, the code does:

```ts
firebaseProviderUid = fbUser?.uid ?? '';
```

`fbUser.uid` is the **Firebase Auth internal UID**, which is **different on every device** (especially after `signInWithCredential` destroys the anonymous session and creates a new Firebase user).

Then:
```ts
const linkRef = db.collection('auth_links').doc(firebaseProviderUid);
```

This writes `auth_links/{firebaseAuthUid}` instead of `auth_links/{google_sub}`.

**Result:**
- iPhone: `auth_links/{firebaseUid_iPhone} → stable_id_A`
- Android: `auth_links/{firebaseUid_Android} → stable_id_B`
- Same Google account, two different `auth_links` entries
- Two different `stable_id`s → two different `users/{stable_id}` documents
- Progress never syncs

### 2.3 The correct identifier already exists in the code

`getLinkedAuthFromCurrentUser()` (line ~589) correctly extracts the Google `sub`:

```ts
for (const p of providers) {
  if (p.providerId === 'google.com') {
    providerUid = p.uid || u.uid;  // p.uid = Google sub ✅
    break;
  }
}
```

But `runSignInWithProvider()` does **NOT** use this. It uses `fbUser.uid` (Firebase internal) instead of `fbUser.providerData[0].uid` (Google sub).

---

## 3. How to Reproduce

1. Install Phraseman on iPhone, complete a lesson, do NOT sign in
2. Sign in with Google → progress goes to `users/{stable_id_A}`
3. Install Phraseman on Android, complete a different lesson, do NOT sign in
4. Sign in with the **same Google account** → progress goes to `users/{stable_id_B}`
5. Check Firestore: two `auth_links` documents, two `users` documents
6. Progress never merges

---

## 4. Correct Flow (Target State)

### 4.1 Identity resolution at sign-in

```
User taps "Sign in with Google"
  ↓
Native sign-in returns Google ID Token
  ↓
Extract Google `sub` from idToken (or from Firebase providerData)
  ↓
Look up auth_links/{google_sub}
  ├─ EXISTS → use existing stable_id → restoreFromCloud()
  └─ NOT EXISTS → use current stable_id → create auth_links/{google_sub}
```

### 4.2 Sync strategy (no Firestore cost increase)

| Event | Action | Firestore cost |
|---|---|---|
| Lesson complete / XP gain / streak update | `syncToCloud()` with 5-min debounce | 1 write per debounce window |
| App foreground after 1h+ | `syncToCloud()` if `pendingSync` | 1 write |
| Sign-in on new device | `restoreFromCloud()` once | 1 read |
| Periodic heartbeat | Activity stamp every 45 min | 1 write per 45 min |

**Key invariant:** `syncToCloud()` already does diff-based writes (only changed keys). No cost increase.

---

## 5. Implementation Plan

### Step 1: Fix `firebaseProviderUid` in `app/auth_provider.ts`

After `linkWithCredential` / `signInWithCredential`, extract the **Google `sub`** from `fbUser.providerData`, NOT `fbUser.uid`.

**Before (broken):**
```ts
firebaseProviderUid = fbUser?.uid ?? '';
```

**After (correct):**
```ts
const googleProvider = fbUser?.providerData?.find(
  (p: any) => p.providerId === 'google.com'
);
firebaseProviderUid = googleProvider?.uid ?? fbUser?.uid ?? '';
```

Same for Apple:
```ts
const appleProvider = fbUser?.providerData?.find(
  (p: any) => p.providerId === 'apple.com'
);
firebaseProviderUid = appleProvider?.uid ?? fbUser?.uid ?? '';
```

**File:** `app/auth_provider.ts`  
**Lines:** ~1172 (in `runSignInWithProvider`, after credential is obtained)

### Step 2: Verify server-side callable uses same providerUid

Check `functions/src/auth_identity.ts` — `ensureStableLinkForAuth` receives `authUid` from `request.auth.uid` (Firebase Auth UID). But it also looks at `signInProvider`.

The server callable `authEnsureStableLink` receives `stableId` from client. The client should pass the **same** `stableId` that matches the Google `sub` lookup.

**Verify:** In `auth_identity.ts` line ~986, `request.auth.uid` is Firebase UID, but `ensureStableLinkForAuth` also receives `signInProvider`. Make sure the server doesn't rely solely on Firebase UID for `auth_links` lookups.

Actually — the server callable writes `auth_links/{authUid}` where `authUid = request.auth.uid`. This is also wrong! The server should write `auth_links/{googleSub}`.

**BUT WAIT:** The server does NOT have access to the Google `sub` directly. It only has `request.auth.uid` (Firebase UID). The client must pass the Google `sub` explicitly.

**Fix approach:**
1. Client extracts Google `sub` after sign-in
2. Client passes `providerUid` (Google sub) in the `authEnsureStableLink` callable request
3. Server uses `providerUid` for `auth_links/{providerUid}` instead of `request.auth.uid`

**Files to modify:**
- `app/auth_provider.ts` — pass `providerUid` in callable request
- `functions/src/auth_identity.ts` — use `providerUid` from request data for `auth_links`

### Step 3: Backward compatibility for existing `auth_links`

Existing users already have `auth_links/{firebaseUid}` entries. We need a migration strategy:

**Option A (recommended):** Server-side fallback — when looking up `auth_links/{googleSub}` and not found, also check if the Firebase UID has an existing link and migrate it.

**Option B:** Mark old `auth_links` as deprecated, create new ones with Google sub. On next sign-in, the new link takes precedence.

### Step 4: Add server-side merge for existing split accounts

For users like Viktor who already have two `stable_id`s, we need:
1. A server function to merge two `users/{stable_id}` documents (keep max XP, merge lesson progress, etc.)
2. Update `auth_links` to point both old and new to the canonical `stable_id`
3. Optionally: a one-time admin script to find and fix all split accounts

---

## 6. Files to Touch

| File | Change | Risk |
|---|---|---|
| `app/auth_provider.ts` | Use Google/Apple `sub` instead of Firebase UID for `auth_links` | Medium — sign-in flow is critical |
| `functions/src/auth_identity.ts` | Accept `providerUid` in callable, use it for `auth_links` | Medium — server identity |
| `functions/src/auth_merge.ts` | Add server-side merge for split accounts | Low — already exists, may need tuning |
| `app/cloud_sync.ts` | Verify `restoreFromCloud` works correctly after fix | Low — mostly unchanged |

---

## 7. Acceptance Criteria

### 7.1 Functional tests
- [ ] Sign in with Google on iPhone → complete Lesson 1 → `auth_links/{googleSub}` created
- [ ] Sign in with same Google on Android → `auth_links/{googleSub}` found → same `stable_id`
- [ ] Progress from iPhone appears on Android after `restoreFromCloud()`
- [ ] Complete Lesson 2 on Android → sync to cloud → appears on iPhone after next sync
- [ ] Apple Sign-In follows the same pattern

### 7.2 Regression tests
- [ ] Existing users with `auth_links/{firebaseUid}` can still sign in (backward compat)
- [ ] Anonymous users without sign-in are unaffected
- [ ] Account switch flow (`signOutAndWipeForAccountSwitch`) still works
- [ ] Account delete flow still works

### 7.3 Firestore cost check
- [ ] No additional reads per regular sync
- [ ] No additional writes per regular sync
- [ ] One extra read at sign-in for `auth_links` lookup (already happening)

---

## 8. Firestore Cost Considerations

**Current cost per sign-in:**
- 1 read: `auth_links/{firebaseUid}`
- 1 read: `users/{stableId}` (for restore)
- 1 write: `users/{stableId}` (for sync)

**After fix cost per sign-in:**
- 1 read: `auth_links/{googleSub}`
- 1 read: `users/{stableId}` (for restore)
- 1 write: `users/{stableId}` (for sync)
- 1 write: `auth_links/{googleSub}` (only if creating new)

**No cost increase for regular operation.** The number of reads/writes per sign-in stays the same. Only the key used for `auth_links` changes.

---

## 9. Notes & Open Questions

1. **Does Apple provide a stable `sub`?** Yes — Apple returns a stable `user` ID per app team. It is NOT the user's Apple ID email. It is stable across devices for the same app.

2. **What about users who signed in before this fix?** They have `auth_links/{firebaseUid}`. On next sign-in with the fix, the lookup for `auth_links/{googleSub}` will miss. Need backward-compat fallback.

3. **Can we use the Google ID Token `sub` claim directly?** Yes — the `sub` claim in the Google ID Token is the stable Google account ID. We can decode the JWT client-side to get it without an extra network call.

4. **RevenueCat identity:** RevenueCat already uses `stable_id` as the App User ID (see `syncRevenueCatAfterAuthLink`). After fixing `stable_id` consistency, RevenueCat will correctly track the same user across devices.

---

## 10. Quick References

### Key code locations
- `app/auth_provider.ts:1172` — `firebaseProviderUid = fbUser?.uid` (broken)
- `app/auth_provider.ts:1211` — `db.collection('auth_links').doc(firebaseProviderUid)` (uses wrong key)
- `app/auth_provider.ts:589-624` — `getLinkedAuthFromCurrentUser()` (correctly uses `p.uid`)
- `functions/src/auth_identity.ts:986-1000` — `authEnsureStableLink` callable
- `functions/src/auth_identity.ts:919-984` — `ensureStableLinkForAuth` (server-side)

### Key data model
```
auth_links/{providerUid}  →  { stable_id: string, provider: "google"|"apple", ... }
users/{stableId}          →  { progress: {...}, linkedAuth: {...}, ... }
```

---

*End of handoff. Good luck!*
