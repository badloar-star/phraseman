---
plan: 03
phase: 01-foundation-friend-codes-data-model-security
status: complete
completed: 2026-05-04
commit: d0d9b03
---

## Summary

Extended firestore.rules with three new match blocks for friend collections. Added 16 new security tests. All 21 tests pass. Catch-all remains last. Existing rules untouched.

## New Rule Blocks (lines 325-389)

1. `match /friend_code_index/{code}` — read=any-auth, create requires uid string+createdAt number, update/delete forbidden
2. `match /users/{targetUid}/friend_requests/{senderUid}` — anti-impersonation (senderUid==auth.uid), banned-sender block, self-targeting forbidden, status='pending' on create, update field-restricted to [status, updatedAt], delete=target-only
3. `match /users/{ownerUid}/friends/{friendUid}` — read=any-auth, create=owner-only, self-friending forbidden (ownerUid!=friendUid), update=false, delete=owner-only

## Key Security Patterns

```javascript
// Anti-impersonation (SEC-02)
senderUid == request.auth.uid

// Banned-sender block (SEC-05)
!exists(/databases/$(database)/documents/banned_users/$(request.auth.uid))

// Field-restricted update (REQ-04)
request.resource.data.diff(resource.data).affectedKeys().hasOnly(['status', 'updatedAt'])
```

## Invariants Verified (D-09)

- match /users/{userId} — present at line 33 (unchanged)
- match /leaderboard/{userId} — present at line 80 (unchanged)
- match /banned_users/{docId} — present at line 86 (unchanged)
- match /auth_links/{providerUid} — present at line 259 (unchanged)
- Catch-all match /{document=**} — last block at lines 391-394

## Test Results

```
PASS tests/firestore_rules_security.test.ts
Tests: 21 passed, 21 total (5 original + 16 new)
```
