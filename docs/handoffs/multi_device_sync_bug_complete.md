# Handoff: Multi-Device Progress Sync — Complete Research & Fix Plan

> **⚠️ ADDENDUM 2026-07-21 (позднее той же даты): ДИАГНОЗ ОПРОВЕРГНУТ по реальному коду.**
> Firebase Auth UID **стабилен** для одного Google/Apple-аккаунта на всех устройствах —
> `signInWithCredential` НЕ создаёт разных пользователей на разных девайсах. Доказательство
> прямо в симптомах самого документа: Plus работает на обоих устройствах, а RevenueCat
> App User ID = `stable_id`, который на втором устройстве появляется только через найденный
> `auth_links/{uid}` → привязка находится, идентичность сходится.
> **НЕ применять шаги 1–4 (переключение ключа на Google sub):** это не чинит симптом,
> ломает инвариант `account_delete_pending_auth` (guard ключуется по тому же uid),
> тест-контракт `tests/auth_provider_stable_link.test.ts` и требует миграции всех auth_links.
> Реальный механизм бага: XP-гейт restore (`app/cloud_sync.ts` `shouldRestoreCloudProgress`)
> + sticky-ветка без уроковых ключей — уроки не доезжают до устройства с localXP ≥ cloudXP.
> **Исправлено** union/max-merge уроковых ключей в sticky-ветке + тест
> `tests/cloud_sync_lesson_union_restore.test.ts`. Разделы ниже оставлены как историческая
> запись анализа; раздел 5 (механика sync/restore) по-прежнему корректен и полезен.

---

> **Prepared for:** Kimi Kate Ray / Химикат 3  
> **Date:** 2026-07-21  
> **Severity:** P0 — mass user impact (all Google/Apple Sign-In users with 2+ devices)  
> **Estimated scope:** 2–3 files, ~30–60 lines of code change
> **Firestore cost impact:** ZERO — same number of reads/writes, only the key changes

---

## 1. Problem Summary

**What users see:**
- User buys Plus on iPhone → Plus works on Android automatically ✅
- User completes lessons on iPhone → lessons do NOT appear on Android ❌
- Same Google account, two different progress states

**Root cause:** `auth_links/{providerUid}` is keyed by **Firebase Auth UID** (device-specific, changes on every `signInWithCredential`) instead of **Google `sub`** or **Apple `user`** (account-specific, permanent).

**Impact:** Every user who signs in with Google/Apple on more than one device gets split into multiple independent profiles. Progress, XP, streak, achievements — all diverge.

---

## 2. How Identity Works (Correct vs Broken)

### 2.1 Data Model

```
auth_links/{providerUid}  →  { stable_id: "abc-123-...", provider: "google", ... }
users/{stableId}          →  { progress: { user_total_xp, unlocked_lessons, ... }, ... }
```

`stable_id` = internal UUID (stored in Keychain/SecureStore, survives app reinstall)
`providerUid` = Google `sub` or Apple `user` ID (permanent, same across all devices)

### 2.2 Correct Flow

```
[Device A: iPhone]
1. User taps "Sign in with Google"
2. App gets Google ID Token → extracts Google `sub` (e.g. "1023...")
3. App looks up auth_links/{google_sub}
   → NOT FOUND (first sign-in)
4. App creates auth_links/{google_sub} → stable_id_A
5. App writes progress to users/{stable_id_A}

[Device B: Android]  
6. User taps "Sign in with Google" (same Google account)
7. App gets Google ID Token → extracts SAME Google `sub` ("1023...")
8. App looks up auth_links/{google_sub}
   → FOUND → stable_id_A
9. App calls restoreFromCloud() → pulls users/{stable_id_A}
10. Progress from iPhone now on Android ✅
```

### 2.3 Broken Flow (Current Code)

```
[Device A: iPhone]
1. User taps "Sign in with Google"
2. App calls signInWithCredential() → Firebase creates NEW user
3. App uses fbUser.uid (Firebase internal, e.g. "xyz-iphone-123")
4. App creates auth_links/{xyz-iphone-123} → stable_id_A

[Device B: Android]
5. User taps "Sign in with Google" (same Google account)
6. App calls signInWithCredential() → Firebase creates DIFFERENT user
7. App uses fbUser.uid (Firebase internal, e.g. "xyz-android-456")
8. App looks up auth_links/{xyz-android-456}
   → NOT FOUND (different Firebase UID!)
9. App creates auth_links/{xyz-android-456} → stable_id_B
10. Two different profiles → progress never syncs ❌
```

---

## 3. The Bug — Exact Code Location

### 3.1 Client-side: `app/auth_provider.ts`

**Line ~1172** (inside `runSignInWithProvider`, after `signInWithCredential`):

```ts
// ❌ WRONG: Firebase Auth UID (device-specific)
firebaseProviderUid = fbUser?.uid ?? '';
```

This `firebaseProviderUid` is then used at **line ~1211**:
```ts
const linkRef = db.collection('auth_links').doc(firebaseProviderUid);
```

**Fix:** Extract the actual Google/Apple provider UID from `fbUser.providerData`:

```ts
// ✅ CORRECT: Google sub / Apple user ID (account-specific)
const googleProvider = fbUser?.providerData?.find(
  (p: any) => p.providerId === 'google.com'
);
const appleProvider = fbUser?.providerData?.find(
  (p: any) => p.providerId === 'apple.com'
);
const providerDataEntry = googleProvider || appleProvider;
firebaseProviderUid = providerDataEntry?.uid ?? fbUser?.uid ?? '';
```

### 3.2 Why the fix works

After `signInWithCredential`, `fbUser.providerData` contains the original provider identity:
- Google: `{ providerId: 'google.com', uid: '<GOOGLE_SUB>' }`
- Apple: `{ providerId: 'apple.com', uid: '<APPLE_USER_ID>' }`

These UIDs are **stable across devices** and are the same regardless of which Firebase Auth user object was created.

### 3.3 Server-side: `functions/src/auth_identity.ts`

The callable `authEnsureStableLink` (line ~986) receives `request.auth.uid` (Firebase UID) and uses it as the `auth_links` key. This compounds the problem.

**Current server code (line ~980):**
```ts
const stableUid = await resolveStableUidForAuth(db, authUid, stableId, { allowProviderRelink, allowAnonRelink });
await ensureAuthLinkDoc(db, authUid, stableUid, provider, metadata);
```

`authUid = request.auth.uid` (Firebase internal UID) → `auth_links/{firebaseUid}`

**Fix:** The client must pass the Google/Apple `providerUid` explicitly, and the server must use it:

```ts
// Client sends: { stableId, providerUid: '<GOOGLE_SUB>' }
// Server uses:
const providerUid = normalizeStableId(request.data?.providerUid);
const authLinkAnchor = providerUid 
  ? await findLiveAuthLinkAnchor(db, providerUid)  // lookup by Google sub
  : await findLiveAuthLinkAnchor(db, authUid);      // fallback
```

---

## 4. Full Sign-In Flow (After Fix)

### 4.1 First device (iPhone)

```
User taps "Sign in with Google"
  ↓
Native Google Sign-In → returns ID Token
  ↓
Firebase signInWithCredential(idToken)
  ↓
fbUser = auth.currentUser
  ↓
Extract googleSub from fbUser.providerData
  ↓
Client calls authEnsureStableLink({ stableId: local_stable_id, providerUid: googleSub })
  ↓
Server: auth_links/{googleSub} does not exist → create it
  ↓
Server: users/{stable_id} ← linkedAuth = { provider: "google", providerUid: googleSub }
  ↓
syncToCloud() → push local progress to users/{stable_id}
```

### 4.2 Second device (Android, same Google account)

```
User taps "Sign in with Google"
  ↓
Native Google Sign-In → returns ID Token (same googleSub)
  ↓
Firebase signInWithCredential(idToken)
  ↓
fbUser = auth.currentUser (DIFFERENT firebase UID!)
  ↓
Extract googleSub from fbUser.providerData (SAME googleSub!)
  ↓
Client calls authEnsureStableLink({ stableId: local_stable_id, providerUid: googleSub })
  ↓
Server: auth_links/{googleSub} EXISTS → points to stable_id_A
  ↓
Server: assertStableOwner → OK (same googleSub owns it)
  ↓
Client: outcome = 'merged_swap_to_remote' (local_stable_id ≠ stable_id_A)
  ↓
Client: syncToCloud(forceNow=true) → push local progress to old stable_id
  ↓
Client: mergeStableAccountsViaServer(old, stable_id_A) → server merges
  ↓
Client: wipeLocalAccountData() → clear local keys
  ↓
Client: setStableId(stable_id_A)
  ↓
Client: restoreFromCloud() → pull merged progress
  ↓
Progress from iPhone now on Android ✅
```

---

## 5. Sync Mechanism — When & How Progress Travels

### 5.1 Trigger events (what calls syncToCloud)

| Event | File | Notes |
|---|---|---|
| Lesson complete | `app/lesson_complete.tsx:980` | `syncToCloud({ forceNow: true })` — immediate |
| XP registered | `app/xp_manager.ts` | After any XP change |
| Avatar/frame change | `app/avatar_select.tsx` | Profile customization |
| Streak update | `app/streak_safety.ts` | Daily streak changes |
| Settings change | `app/(tabs)/settings.tsx` | Name, preferences |
| App goes to background | `app/_layout.tsx:1762` | `syncToCloud()` before background |
| Boot (if local progress exists) | `app/_layout.tsx:2029` | Only if `shouldSync === true` |
| Sign-in merge | `app/auth_provider.ts:1321` | `syncToCloud({ forceNow: true })` before swap |

### 5.2 Debounce strategy (in `app/cloud_sync.ts`)

```ts
const SYNC_DEBOUNCE_MS = 5 * 60 * 1000;   // 5 minutes
const SYNC_HEARTBEAT_MS = 60 * 60 * 1000; // 60 minutes
```

- **Normal sync:** `markCloudSyncPending()` sets flag. If 5 min passed since last sync → immediate. Otherwise → timer for remaining time.
- **Force sync:** `syncToCloud({ forceNow: true })` → bypass debounce, sync immediately.
- **Heartbeat:** Every 60 min even if no changes (activity stamp).
- **In-flight protection:** `syncInFlight` prevents parallel syncs.

### 5.3 Restore strategy (in `app/cloud_sync.ts`)

```ts
const RESTORE_FIRESTORE_READ_MS = 15_000; // 15s timeout
```

- **Called at:** App startup (before any sync), after sign-in, on account switch
- **Merges data:** Cloud wins for most keys, but:
  - Monotonic counters (achievement counts) → max(cloud, local)
  - Owned items (avatars, flashcard packs) → union(cloud, local)
  - Lesson progress → best of quality (more "correct" answers)
  - Current week XP → max(cloud, local)
- **Protects local:** Daily tasks for today are NOT overwritten by stale cloud data

### 5.4 Diff-based writes (cost optimization)

```ts
// cloud_sync.ts ~1968
let previousSnapshot: Record<string, string | null> = {};
const snapRaw = await AsyncStorage.getItem(LAST_SYNC_SNAPSHOT_KEY);
if (snapRaw) previousSnapshot = JSON.parse(snapRaw);

const progressPatch: Record<string, string | null> = {};
for (const [key, value] of Object.entries(data)) {
  if (previousSnapshot[key] !== value) progressPatch[key] = value;
}
```

Only changed keys are written. If nothing changed → no Firestore write.

---

## 6. Implementation Steps

### Step 1: Fix client-side provider UID extraction

**File:** `app/auth_provider.ts`  
**Function:** `runSignInWithProvider`  
**Around line:** 1172

```ts
// AFTER: let firebaseProviderUid: string; (line 1105)
// AFTER: await firebaseUserForTokenRefresh.getIdToken(true); (line ~1201)

// Replace:
// firebaseProviderUid = fbUser?.uid ?? '';

// With:
const googleProvider = fbUser?.providerData?.find(
  (p: any) => p.providerId === 'google.com'
);
const appleProvider = fbUser?.providerData?.find(
  (p: any) => p.providerId === 'apple.com'
);
const providerDataEntry = googleProvider || appleProvider;
firebaseProviderUid = providerDataEntry?.uid ?? fbUser?.uid ?? '';
```

### Step 2: Pass providerUid to server callable

**File:** `app/cloud_sync.ts`  
**Function:** `ensureStableAuthLinkForStableIdDetailed`  
**Around line:** 1617

Add `providerUid` to callable request:

```ts
const fn = callable<
  { stableId: string; linkMetadata?: StableAuthLinkMetadata; providerUid?: string },
  { ok: boolean; stableUid: string; authUid: string }
>('authEnsureStableLink');
const res = await withTimeout(
  fn({ 
    stableId, 
    ...(hasFreshMetadata ? { linkMetadata: metadata } : {}),
    ...(firebaseProviderUid ? { providerUid: firebaseProviderUid } : {}),
  }),
  STABLE_AUTH_LINK_TIMEOUT_MS,
  'auth_link_callable',
);
```

**BUT:** `ensureStableAuthLinkForStableIdDetailed` is called from multiple places. Need to add `providerUid` as optional parameter and thread it through.

### Step 3: Fix server-side to use providerUid

**File:** `functions/src/auth_identity.ts`  
**Function:** `authEnsureStableLink` (callable handler)  
**Around line:** 986

```ts
export const authEnsureStableLink = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const signInProvider = String(request.auth.token?.firebase?.sign_in_provider ?? '').trim();
  const metadata = normalizeAuthLinkMetadata(request.data?.linkMetadata);
  
  // NEW: prefer client-provided providerUid over Firebase Auth uid
  const clientProviderUid = normalizeStableId(request.data?.providerUid);
  const effectiveProviderUid = clientProviderUid || authUid;
  
  return ensureStableLinkForAuth(db, authUid, request.data?.stableId, signInProvider, metadata, effectiveProviderUid);
});
```

Then update `ensureStableLinkForAuth` to accept and use `effectiveProviderUid` for `auth_links` lookups and writes.

### Step 4: Backward compatibility

For existing users with `auth_links/{firebaseUid}`:

1. Server `findLiveAuthLinkAnchor` currently checks `auth_links/{authUid}`. 
2. After fix, it should check `auth_links/{providerUid}` first, then fallback to `auth_links/{authUid}`.
3. If found via fallback, update/create `auth_links/{providerUid}` pointing to same `stable_id`.

```ts
// In ensureStableLinkForAuth:
async function findLiveAuthLinkAnchor(
  db: admin.firestore.Firestore,
  providerUid: string,
  fallbackAuthUid?: string,
): Promise<string | null> {
  // Try providerUid first (new correct key)
  const linkSnap = await db.collection(AUTH_LINKS).doc(providerUid).get().catch(() => null);
  const anchoredStableId = normalizeStableId(linkSnap?.data()?.stable_id);
  if (anchoredStableId) return anchoredStableId;
  
  // Fallback: try old firebase uid key (backward compat)
  if (fallbackAuthUid && fallbackAuthUid !== providerUid) {
    const fallbackSnap = await db.collection(AUTH_LINKS).doc(fallbackAuthUid).get().catch(() => null);
    const fallbackStableId = normalizeStableId(fallbackSnap?.data()?.stable_id);
    if (fallbackStableId) {
      // Migrate: create new auth_links/{providerUid} pointing to same stable_id
      await db.collection(AUTH_LINKS).doc(providerUid).set({
        stable_id: fallbackStableId,
        migratedFrom: fallbackAuthUid,
        updatedAt: Date.now(),
      }, { merge: true });
      return fallbackStableId;
    }
  }
  return null;
}
```

---

## 7. Acceptance Criteria

### 7.1 Critical path test
```
1. Install app on iPhone
2. Complete Lesson 1 → earn 50 XP
3. Tap "Sign in with Google" (account: user@gmail.com)
4. Verify: auth_links/{google_sub} created, points to stable_id_A
5. Verify: users/{stable_id_A}.progress.user_total_xp = 50

6. Install app on Android (fresh)
7. Complete Lesson 2 → earn 60 XP
8. Tap "Sign in with Google" (same account: user@gmail.com)
9. Verify: auth_links/{google_sub} found → stable_id_A
10. Verify: restoreFromCloud() pulls XP=50 from iPhone
11. Verify: merge adds Android progress → XP=110 (or server merge handles)
12. On iPhone: open app → sync → Lesson 2 appears
```

### 7.2 Regression tests
- [ ] Anonymous user (no sign-in) → unaffected
- [ ] Existing user with old `auth_links/{firebaseUid}` → still works, auto-migrates
- [ ] Apple Sign-In → same behavior as Google
- [ ] Account switch flow → works correctly
- [ ] Account delete → removes auth_links, new sign-in creates fresh

### 7.3 Firestore cost check
- [ ] Sign-in: same 1 read (auth_links) + 1 read (users) + 1 write (auth_links, only first time)
- [ ] Regular sync: unchanged (diff-based, debounced)
- [ ] No new indexes needed

---

## 8. Firestore Security Rules Impact

Current rules use `auth_links/{authUid}` for ownership checks. After fix:
- `auth_links/{googleSub}` should be writable only by callable (server-side)
- Client never writes auth_links directly (already the case)
- No rules changes needed if server callable handles writes

---

## 9. Open Questions for Implementer

1. **Does `fbUser.providerData` always contain the Google `sub` after `signInWithCredential`?**
   - YES: Firebase Auth stores provider identity in `providerData[].uid`
   - But verify: after `linkWithCredential` (anonymous → Google), the providerData may be appended

2. **What if user has BOTH Google AND Apple linked?**
   - Each provider gets its own `auth_links/{googleSub}` and `auth_links/{appleUser}`
   - Both should point to same `stable_id` (this is already supported by data model)
   - Ensure `ensureStableLinkForAuth` handles this

3. **What about users who already signed in before the fix?**
   - They have `auth_links/{firebaseUid_old}` → stable_id_A
   - On next sign-in, new code extracts Google `sub` → looks up `auth_links/{googleSub}` → NOT FOUND
   - Fallback to `auth_links/{firebaseUid}` → FOUND → stable_id_A
   - Server creates `auth_links/{googleSub}` → stable_id_A
   - Future sign-ins on other devices work correctly

4. **RevenueCat identity?**
   - RevenueCat uses `stable_id` as App User ID
   - After fix, `stable_id` is consistent across devices
   - RevenueCat will correctly track the same user
   - No RevenueCat changes needed

---

## 10. Key File References

| File | Purpose | Key Lines |
|---|---|---|
| `app/auth_provider.ts` | Sign-in flow, provider UID extraction | 1105, 1172, 1211, 1260–1400 |
| `app/cloud_sync.ts` | Sync/restore logic, callable client | 1617–1678 (ensureStableAuthLink) |
| `functions/src/auth_identity.ts` | Server callable, auth_links management | 919–984 (ensureStableLinkForAuth), 986–1000 (callable handler) |
| `functions/src/auth_merge.ts` | Server-side account merge | mergeStableAccountsViaServer |
| `app/_layout.tsx` | Boot flow, restore before sync | 1974–2034 |

---

*End of handoff. Good luck!*
