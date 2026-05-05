---
phase: 02-friend-requests-friends-list-screen
plan: 01
subsystem: friends-data-layer
status: complete
tags: [firestore, friends, security-rules, unit-tests]

dependency_graph:
  requires:
    - app/user_id_policy.ts:getCanonicalUserId
    - app/config.ts:CLOUD_SYNC_ENABLED,IS_EXPO_GO
    - app/firestore_friends.ts:lookupUserByFriendCode
    - firestore.rules:friend_requests match block
  provides:
    - app/firestore_friend_requests.ts:sendFriendRequest
    - app/firestore_friend_requests.ts:acceptFriendRequest
    - app/firestore_friend_requests.ts:declineFriendRequest
    - app/firestore_friend_requests.ts:deleteFriend
    - app/firestore_friend_requests.ts:subscribeToFriends
    - app/firestore_friend_requests.ts:subscribeToIncomingRequests
    - firestore.rules:friends bidirectional create/delete
  affects:
    - Phase 3 friends HoF (consumes subscribeToFriends)
    - Phase 2 Plan 02 friends_screen UI (consumes all exports)

tech_stack:
  added: []
  patterns:
    - "@react-native-firebase/firestore WriteBatch for atomic bidirectional writes"
    - "Two-step accept: status update before batch to satisfy security rules"
    - "subscribeToFriends/subscribeToIncomingRequests use async UID resolution + onSnapshot"

key_files:
  created:
    - app/firestore_friend_requests.ts
    - tests/firestore_friend_requests.test.ts
  modified:
    - firestore.rules
    - tests/firestore_rules_security.test.ts

decisions:
  - "declineFriendRequest deletes doc (not update to declined) — avoids stale docs blocking future re-requests"
  - "acceptFriendRequest: separate update write before batch — security rules see status=accepted for reverse create"
  - "deleteFriend uses WriteBatch for atomic bidirectional removal"
  - "subscriptions resolve UID async via .then() chain — non-blocking return of unsubscribe fn"

metrics:
  duration_seconds: 227
  completed_date: "2026-05-05"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 2
---

# Phase 02 Plan 01: firestore_friend_requests data layer + security rules Summary

**One-liner:** Full friend request lifecycle (send/accept/decline/delete/subscribe) with bidirectional Firestore security rules.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create firestore_friend_requests.ts + unit tests | 4851be8 | app/firestore_friend_requests.ts, tests/firestore_friend_requests.test.ts |
| 2 | Update firestore.rules + security tests | 474f6dd | firestore.rules, tests/firestore_rules_security.test.ts |

## Exported Signatures

```typescript
// app/firestore_friend_requests.ts

export type SendRequestResult =
  | 'sent' | 'already_sent' | 'already_friends' | 'self' | 'not_found' | 'error';

export interface FriendEntry {
  uid: string;
  createdAt: number;
}

export interface FriendRequestEntry {
  fromUid: string;
  status: 'pending' | 'accepted';
  createdAt: number;
}

export async function sendFriendRequest(toUid: string): Promise<SendRequestResult>
export async function acceptFriendRequest(fromUid: string): Promise<void>
export async function declineFriendRequest(fromUid: string): Promise<void>
export async function deleteFriend(friendUid: string): Promise<void>
export function subscribeToFriends(
  callback: (friends: FriendEntry[]) => void,
  onError?: (err: Error) => void,
): () => void
export function subscribeToIncomingRequests(
  callback: (requests: FriendRequestEntry[]) => void,
  onError?: (err: Error) => void,
): () => void
export default function __RouteShim(): null
```

## Test Counts

| Suite | Tests | Status |
|-------|-------|--------|
| tests/firestore_friend_requests.test.ts | 13 (R01-R05, A01-A03, D01, X01-X02, S01-S02) | All passing |
| tests/firestore_rules_security.test.ts | 27 (21 prior + 6 new FR-NEW-1..6) | All passing |
| **Total** | **40** | **All passing** |

## Security Rule Changes

**Changed block:** `match /users/{ownerUid}/friends/{friendUid}`

**Create rule — before:**
```javascript
allow create: if request.auth != null && request.auth.uid == ownerUid && ownerUid != friendUid;
```

**Create rule — after:**
```javascript
allow create: if request.auth != null && ownerUid != friendUid && (
  request.auth.uid == ownerUid ||
  (request.auth.uid == friendUid &&
   exists(/databases/$(database)/documents/users/$(ownerUid)/friend_requests/$(friendUid)) &&
   get(/databases/$(database)/documents/users/$(ownerUid)/friend_requests/$(friendUid)).data.status == 'accepted')
);
```

**Delete rule — before:**
```javascript
allow delete: if request.auth != null && request.auth.uid == ownerUid;
```

**Delete rule — after:**
```javascript
allow delete: if request.auth != null && (request.auth.uid == ownerUid || request.auth.uid == friendUid);
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated existing security test for delete rule change**
- **Found during:** Task 2
- **Issue:** Existing test `'friends subcollection delete restricted to owner'` asserted old rule `request.auth.uid == ownerUid;` which would fail after the update.
- **Fix:** Updated test to `'friends subcollection delete allows ownerUid or friendUid (bidirectional)'` matching the new rule pattern.
- **Files modified:** tests/firestore_rules_security.test.ts
- **Commit:** 474f6dd

## Known Stubs

None — all exports are fully implemented with real Firestore operations.

## Self-Check: PASSED

- app/firestore_friend_requests.ts — FOUND
- tests/firestore_friend_requests.test.ts — FOUND
- Commit 4851be8 — FOUND
- Commit 474f6dd — FOUND
