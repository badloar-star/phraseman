---
phase: 02-friend-requests-friends-list-screen
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/firestore_friend_requests.ts
  - firestore.rules
  - tests/firestore_friend_requests.test.ts
  - tests/firestore_rules_security.test.ts
autonomous: true
requirements: [REQ-01, REQ-02, REQ-03, REQ-04, REQ-05, REQ-06, REQ-07, TEST-02, TEST-03, TEST-05]

must_haves:
  truths:
    - "sendFriendRequest(toUid) creates users/{toUid}/friend_requests/{myUid} with status='pending'; returns typed result: 'sent'|'already_sent'|'already_friends'|'self'|'not_found'|'error'"
    - "acceptFriendRequest(fromUid): updates request status to 'accepted', then batch-creates users/{myUid}/friends/{fromUid} AND users/{fromUid}/friends/{myUid}"
    - "declineFriendRequest(fromUid): DELETES users/{myUid}/friend_requests/{fromUid} (not updates)"
    - "deleteFriend(friendUid): batch-deletes users/{myUid}/friends/{friendUid} AND users/{friendUid}/friends/{myUid}"
    - "Firestore security rules updated: friends create allows friendUid when accepted request exists; friends delete allows ownerUid OR friendUid"
    - "All operations use getCanonicalUserId() — no anon_id or stable_id as keys"
    - "subscribeToFriends and subscribeToIncomingRequests return unsubscribe functions for real-time onSnapshot listeners"
  artifacts:
    - path: "app/firestore_friend_requests.ts"
      provides: "Full friend request lifecycle: send, accept, decline, delete, real-time subscriptions"
      exports: ["SendRequestResult", "FriendEntry", "FriendRequestEntry", "sendFriendRequest", "acceptFriendRequest", "declineFriendRequest", "deleteFriend", "subscribeToFriends", "subscribeToIncomingRequests"]
    - path: "tests/firestore_friend_requests.test.ts"
      provides: "Unit tests for request lifecycle (TEST-02, TEST-03, TEST-05)"
    - path: "firestore.rules"
      provides: "Updated rules: friends create allows accepted-request reverse entry; friends delete allows bidirectional removal"
    - path: "tests/firestore_rules_security.test.ts"
      provides: "New tests for updated friends create/delete rules"
  key_links:
    - from: "app/firestore_friend_requests.ts"
      to: "app/user_id_policy.ts:getCanonicalUserId"
      via: "Every function starts with getCanonicalUserId() before any Firestore write"
      pattern: "getCanonicalUserId\\(\\)"
    - from: "app/firestore_friend_requests.ts:acceptFriendRequest"
      to: "Firestore: users/{myUid}/friend_requests/{fromUid}"
      via: "update { status: 'accepted', updatedAt } then batch-create both friends entries"
      pattern: "status.*accepted"
    - from: "firestore.rules"
      to: "Firestore: users/{ownerUid}/friends/{friendUid}"
      via: "Updated create rule: allows friendUid when accepted request exists (get() check)"
      pattern: "friend_requests.*accepted"
---

<objective>
Реализовать полный жизненный цикл friend requests на уровне данных.

Operations:
- `sendFriendRequest(toUid)` — записать `users/{toUid}/friend_requests/{myUid}` статус 'pending'
- `acceptFriendRequest(fromUid)` — обновить статус → 'accepted', затем batch-создать оба side friends
- `declineFriendRequest(fromUid)` — DELETE документ запроса (не update статус)
- `deleteFriend(friendUid)` — batch-DELETE обе стороны friendship
- `subscribeToFriends` / `subscribeToIncomingRequests` — real-time onSnapshot listeners

Обновить `firestore.rules`: поддержать bidirectional create/delete для friends collection.

Output:
- `app/firestore_friend_requests.ts` — весь data layer
- `tests/firestore_friend_requests.test.ts` — unit tests (TEST-02, TEST-03, TEST-05)
- `firestore.rules` — updated friends match block
- `tests/firestore_rules_security.test.ts` — 5-6 новых security tests
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/REQUIREMENTS.md
@CLAUDE.md
@app/user_id_policy.ts
@app/firestore_friends.ts
@app/config.ts
@firestore.rules
@tests/firestore_rules_security.test.ts

<interfaces>
<!-- Phase 1 exports that Plan 01 builds upon -->

From app/firestore_friends.ts (Phase 1):
```typescript
export async function ensureMyFriendCode(): Promise<string | null>
export async function lookupUserByFriendCode(code: string): Promise<{ uid: string } | null>
// lookupUserByFriendCode already filters banned users silently (FRIEND-07)
```

From app/user_id_policy.ts:
```typescript
export async function getCanonicalUserId(): Promise<string | null>
```

Current Firestore friends security rules (from firestore.rules, lines ~360-370):
```javascript
match /users/{ownerUid}/friends/{friendUid} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.auth.uid == ownerUid && ownerUid != friendUid;
  allow update: if false;
  allow delete: if request.auth != null && request.auth.uid == ownerUid;
}
```

These MUST be updated in this plan to support:
1. accept: Alice (friendUid) can create users/Bob/friends/Alice if users/Bob/friend_requests/Alice.status == 'accepted'
2. delete: ownerUid OR friendUid can delete (bidirectional removal)
</interfaces>

<locked_decisions>
From .planning/STATE.md:
- D-02: Canonical UID (getCanonicalUserId()) is the ONLY allowed key for friend data
- D-03: NEVER modify pushMyScore in xp_manager.ts or firestore_leaderboard.ts
- Friend requests require accept (not auto-add) — anti-spam, anti-stalking
- No nickname search (stalking risk)
</locked_decisions>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create firestore_friend_requests.ts — full request lifecycle + subscription helpers</name>
  <files>app/firestore_friend_requests.ts, tests/firestore_friend_requests.test.ts</files>

  <read_first>
    - app/firestore_friends.ts (Pattern for getFirestore, IS_EXPO_GO guard, getCanonicalUserId usage)
    - app/user_id_policy.ts (getCanonicalUserId signature)
    - app/config.ts (CLOUD_SYNC_ENABLED, IS_EXPO_GO)
    - tests/friend_code.test.ts (Jest mock patterns used in this project — jest.mock, beforeEach resetModules)
    - CLAUDE.md (UID rules: only canonical, no anon_id, no stable_id)
  </read_first>

  <behavior>
    sendFriendRequest tests:
    - Test R01: sendFriendRequest when toUid == myUid returns 'self' without Firestore write
    - Test R02: sendFriendRequest when users/{myUid}/friends/{toUid} exists returns 'already_friends' without write
    - Test R03: sendFriendRequest when users/{toUid}/friend_requests/{myUid} exists with status 'pending' returns 'already_sent'
    - Test R04: sendFriendRequest happy path — creates users/{toUid}/friend_requests/{myUid} with {status:'pending', createdAt: <number>} and returns 'sent'
    - Test R05: sendFriendRequest when getCanonicalUserId returns null returns 'error' without write

    acceptFriendRequest tests:
    - Test A01: acceptFriendRequest updates users/{myUid}/friend_requests/{fromUid} to {status:'accepted', updatedAt:<number>}
    - Test A02: acceptFriendRequest creates users/{myUid}/friends/{fromUid} with {createdAt:<number>}
    - Test A03: acceptFriendRequest creates users/{fromUid}/friends/{myUid} (reverse entry) with {createdAt:<number>}

    declineFriendRequest tests:
    - Test D01: declineFriendRequest DELETES users/{myUid}/friend_requests/{fromUid} (not an update)

    deleteFriend tests:
    - Test X01: deleteFriend deletes users/{myUid}/friends/{friendUid}
    - Test X02: deleteFriend also deletes users/{friendUid}/friends/{myUid} (reverse entry)

    subscriptions:
    - Test S01: subscribeToFriends calls onSnapshot on users/{myUid}/friends and returns unsubscribe fn
    - Test S02: subscribeToIncomingRequests calls onSnapshot on users/{myUid}/friend_requests with where('status','==','pending') and returns unsubscribe fn
  </behavior>

  <action>
    Create `app/firestore_friend_requests.ts` with EXACTLY these exports:

    ```typescript
    import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
    import { getCanonicalUserId } from './user_id_policy';

    export type SendRequestResult =
      | 'sent'
      | 'already_sent'
      | 'already_friends'
      | 'self'
      | 'not_found'
      | 'error';

    export interface FriendEntry {
      uid: string;
      createdAt: number;
    }

    export interface FriendRequestEntry {
      fromUid: string;
      status: 'pending' | 'accepted';
      createdAt: number;
    }

    const getFirestore = () => { /* same pattern as firestore_friends.ts */ };

    /**
     * Send a friend request to another user by their UID (resolved from friend code).
     * Caller MUST resolve UID via lookupUserByFriendCode first (which handles banned filter).
     */
    export async function sendFriendRequest(toUid: string): Promise<SendRequestResult>

    /**
     * Accept an incoming friend request from fromUid.
     * Step 1: update request status → 'accepted'
     * Step 2: batch-create both friendship entries
     */
    export async function acceptFriendRequest(fromUid: string): Promise<void>

    /**
     * Decline an incoming request — DELETES the request document (not update to 'declined').
     * Deletion keeps Firestore tidy and avoids stale declined docs blocking future re-requests.
     */
    export async function declineFriendRequest(fromUid: string): Promise<void>

    /**
     * Remove a friend bidirectionally.
     * Deletes users/{myUid}/friends/{friendUid} AND users/{friendUid}/friends/{myUid}
     * in a single WriteBatch.
     */
    export async function deleteFriend(friendUid: string): Promise<void>

    /**
     * Real-time listener for current user's friends collection.
     * Returns an unsubscribe function.
     * Callback receives array of FriendEntry.
     */
    export function subscribeToFriends(
      callback: (friends: FriendEntry[]) => void,
      onError?: (err: Error) => void,
    ): () => void

    /**
     * Real-time listener for incoming friend requests (status == 'pending').
     * Returns an unsubscribe function.
     * Callback receives array of FriendRequestEntry.
     */
    export function subscribeToIncomingRequests(
      callback: (requests: FriendRequestEntry[]) => void,
      onError?: (err: Error) => void,
    ): () => void
    ```

    IMPLEMENTATION DETAILS:

    `sendFriendRequest(toUid)`:
    1. `const myUid = await getCanonicalUserId(); if (!myUid) return 'error';`
    2. `if (toUid === myUid) return 'self';`
    3. `const db = getFirestore(); if (!db) return 'error';`
    4. Check `users/{myUid}/friends/{toUid}` — if exists, return `'already_friends'`
    5. Check `users/{toUid}/friend_requests/{myUid}` — if exists AND status == 'pending', return `'already_sent'`
    6. Set `users/{toUid}/friend_requests/{myUid}` = `{ status: 'pending', createdAt: Date.now() }`
    7. Return `'sent'` on success. Catch errors → return `'error'`

    `acceptFriendRequest(fromUid)`:
    1. `const myUid = await getCanonicalUserId(); if (!myUid) throw ...`
    2. `const db = getFirestore(); if (!db) throw ...`
    3. Update `users/{myUid}/friend_requests/{fromUid}` → `{ status: 'accepted', updatedAt: Date.now() }`
       (separate write — must commit BEFORE batch so security rules see status='accepted' for reverse create)
    4. Build WriteBatch:
       - Set `users/{myUid}/friends/{fromUid}` = `{ createdAt: Date.now() }`
       - Set `users/{fromUid}/friends/{myUid}` = `{ createdAt: Date.now() }`
    5. `await batch.commit()`

    `declineFriendRequest(fromUid)`:
    1. `const myUid = await getCanonicalUserId(); if (!myUid) return;`
    2. `const db = getFirestore(); if (!db) return;`
    3. Delete `users/{myUid}/friend_requests/{fromUid}` (NOT update to 'declined')

    `deleteFriend(friendUid)`:
    1. `const myUid = await getCanonicalUserId(); if (!myUid) return;`
    2. `const db = getFirestore(); if (!db) return;`
    3. `const batch = db.batch()`
    4. `batch.delete(users/{myUid}/friends/{friendUid})`
    5. `batch.delete(users/{friendUid}/friends/{myUid})`
    6. `await batch.commit()`

    `subscribeToFriends(callback, onError)`:
    1. `const myUid = await getCanonicalUserId()` — must handle async; use then() chain
    2. On UID ready: `db.collection('users').doc(myUid).collection('friends').onSnapshot(snap => { ... })`
    3. Map each doc: `{ uid: doc.id, createdAt: doc.data().createdAt ?? 0 }`
    4. Return unsubscribe fn. If UID unavailable, callback([]) and return no-op.

    `subscribeToIncomingRequests(callback, onError)`:
    1. Same UID pattern
    2. `db.collection('users').doc(myUid).collection('friend_requests').where('status', '==', 'pending').onSnapshot(...)`
    3. Map each doc: `{ fromUid: doc.id, status: 'pending', createdAt: doc.data().createdAt ?? 0 }`

    Add `export default function __RouteShim() { return null; }` at the end.

    CONSTRAINTS:
    - No `console.log` — use DebugLogger.error if needed for error paths
    - No `anon_id` or `stable_id` as keys
    - `WriteBatch` pattern: `const batch = db.batch(); batch.set(ref, data); await batch.commit()`
    - `@react-native-firebase/firestore` batch API: `db.batch()` not `writeBatch(db)`
  </action>

  <verify>
    <automated>npm test -- --testPathPattern=firestore_friend_requests</automated>
  </verify>

  <acceptance_criteria>
    - File `app/firestore_friend_requests.ts` exists and is non-empty
    - Exports: `SendRequestResult`, `FriendEntry`, `FriendRequestEntry`, `sendFriendRequest`, `acceptFriendRequest`, `declineFriendRequest`, `deleteFriend`, `subscribeToFriends`, `subscribeToIncomingRequests` (grep each)
    - `getCanonicalUserId` imported and called in every exported async function (grep: `getCanonicalUserId`)
    - No `anon_id` or `stable_id` string literals as Firestore keys (grep: 0 matches)
    - `declineFriendRequest` uses `.delete(` not `.update(` (grep: `declineFriendRequest` section uses `.delete`)
    - `deleteFriend` uses `batch.delete` twice (grep: `batch.delete` appears >= 2 times in file)
    - `tests/firestore_friend_requests.test.ts` exists with >= 13 test/it blocks
    - `npm test -- --testPathPattern=firestore_friend_requests` exits 0 with all tests passing
    - File contains NO `console.log`
  </acceptance_criteria>

  <done>
    Full friend request lifecycle implemented and tested. All 13+ unit tests pass. No leaderboard or XP files touched.
  </done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Update firestore.rules — bidirectional friends create/delete + new security tests</name>
  <files>firestore.rules, tests/firestore_rules_security.test.ts</files>

  <read_first>
    - firestore.rules (read the full friends match block — lines ~360-390)
    - tests/firestore_rules_security.test.ts (read existing test structure and helpers to extend it)
  </read_first>

  <behavior>
    New rule tests to add:
    - Test FR-NEW-1: Friends create — friendUid can create entry when accepted request exists
    - Test FR-NEW-2: Friends create — friendUid CANNOT create entry when NO accepted request exists
    - Test FR-NEW-3: Friends create — third-party uid (neither ownerUid nor friendUid) cannot create
    - Test FR-NEW-4: Friends delete — ownerUid can delete (existing behavior, still passes)
    - Test FR-NEW-5: Friends delete — friendUid can now delete (new bidirectional behavior)
    - Test FR-NEW-6: Friends delete — third-party uid cannot delete
  </behavior>

  <action>
    UPDATE `firestore.rules` — find the `match /users/{ownerUid}/friends/{friendUid}` block and replace:

    OLD:
    ```javascript
    match /users/{ownerUid}/friends/{friendUid} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.auth.uid == ownerUid && ownerUid != friendUid;
      allow update: if false;
      allow delete: if request.auth != null && request.auth.uid == ownerUid;
    }
    ```

    NEW:
    ```javascript
    match /users/{ownerUid}/friends/{friendUid} {
      allow read: if request.auth != null;
      // ownerUid can always add a friend (standard forward create)
      // friendUid can add themselves as a friend of ownerUid ONLY when
      // ownerUid has an accepted friend_request from friendUid —
      // this enables the acceptFriendRequest() two-step client-side accept.
      allow create: if request.auth != null && ownerUid != friendUid && (
        request.auth.uid == ownerUid ||
        (request.auth.uid == friendUid &&
         exists(/databases/$(database)/documents/users/$(ownerUid)/friend_requests/$(friendUid)) &&
         get(/databases/$(database)/documents/users/$(ownerUid)/friend_requests/$(friendUid)).data.status == 'accepted')
      );
      allow update: if false;
      // Both ownerUid and friendUid may delete — enables client-side bidirectional removal.
      allow delete: if request.auth != null && (request.auth.uid == ownerUid || request.auth.uid == friendUid);
    }
    ```

    Then UPDATE `tests/firestore_rules_security.test.ts`:
    - Read the existing test file to understand helpers (projectId, initializeTestEnvironment, etc.)
    - Add 6 new tests (FR-NEW-1 through FR-NEW-6) for the updated friends create/delete rules
    - For FR-NEW-1: set up users/{ownerUid}/friend_requests/{friendUid} with status='accepted' in test environment, then assert write allowed
    - For FR-NEW-2: same setup but WITHOUT a friend_request doc (or with status='pending'), assert DENIED
    - For FR-NEW-3: use a third uid that is neither ownerUid nor friendUid, assert DENIED
    - For FR-NEW-4/5/6: test delete permissions for ownerUid, friendUid, third-party
  </action>

  <verify>
    <automated>cd tests && npx jest --testPathPattern=firestore_rules</automated>
  </verify>

  <acceptance_criteria>
    - `firestore.rules` contains `request.auth.uid == friendUid` in the friends match block create rule (grep)
    - `firestore.rules` contains `status == 'accepted'` in the friends create rule (grep)
    - `firestore.rules` contains `request.auth.uid == friendUid` in the friends delete rule (grep)
    - Catch-all `match /{document=**}` is still the LAST block in the file (grep: last match block)
    - Existing match blocks untouched: `/users/{userId}`, `/leaderboard/{userId}`, `/banned_users/{docId}`, `/auth_links/{providerUid}`, `/friend_code_index/{code}`, `/users/{targetUid}/friend_requests/{senderUid}` (grep each to verify presence)
    - `tests/firestore_rules_security.test.ts` now has >= 27 total tests (21 prior + 6 new)
    - All tests pass (npm test -- --testPathPattern=firestore_rules exits 0)
  </acceptance_criteria>

  <done>
    Security rules support bidirectional accept (via get() check on accepted request) and bidirectional delete. All 27+ rules tests pass. No other rules blocks modified.
  </done>
</task>

</tasks>

<verification>
Plan-level checks:
1. `npm test -- --testPathPattern=firestore_friend_requests` exits 0 (all friend_request tests pass)
2. `npm test -- --testPathPattern=firestore_rules` exits 0 (all 27+ rules tests pass)
3. `grep -n "getCanonicalUserId" app/firestore_friend_requests.ts` >= 3 matches (each fn uses it)
4. `grep -nE "anon_id|stable_id" app/firestore_friend_requests.ts` returns 0 matches
5. `grep -n "batch.delete" app/firestore_friend_requests.ts` >= 2 matches (bidirectional delete)
6. `git diff --name-only HEAD` shows only `app/firestore_friend_requests.ts`, `firestore.rules`, `tests/firestore_friend_requests.test.ts`, `tests/firestore_rules_security.test.ts` (NOT xp_manager.ts, firestore_leaderboard.ts)
7. `grep -n "match /{document=\*\*}" firestore.rules` — catch-all is last block
</verification>

<success_criteria>
- REQ-01: sendFriendRequest creates users/{toUid}/friend_requests/{myUid} with status='pending'. VERIFIED via Test R04.
- REQ-02: duplicate pending request returns 'already_sent'. VERIFIED via Test R03.
- REQ-03: self-request returns 'self'. VERIFIED via Test R01.
- REQ-04: acceptFriendRequest updates status + batch-creates both friend entries. VERIFIED via Tests A01-A03.
- REQ-05: declineFriendRequest deletes the request document. VERIFIED via Test D01.
- REQ-06: deleteFriend batch-deletes both sides. VERIFIED via Tests X01-X02.
- REQ-07: banned user handling is in lookupUserByFriendCode (Phase 1) — sendFriendRequest receives already-filtered toUid from UI.
- TEST-02: request state machine (pending→accepted, pending→deleted-on-decline). VERIFIED via A-series and D01 tests.
- TEST-03: both friend entries created on accept. VERIFIED via Tests A02-A03.
- TEST-05: ban filter in lookupUserByFriendCode (Phase 1 test F) + UI layer sends only valid toUid — covered by Plan 02.
</success_criteria>

<output>
After completion, create `.planning/phases/02-friend-requests-friends-list-screen/02-friend-requests-friends-list-screen-01-SUMMARY.md` capturing: actual exported signatures, test counts, security rule changes, any deviations from this plan.
</output>
