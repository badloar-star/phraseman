---
plan: 01
phase: 01-foundation-friend-codes-data-model-security
status: complete
completed: 2026-05-04
commit: a10a66e
---

## Summary

Created friend code generation utilities and Firestore-backed storage with canonical UID and transactional uniqueness.

## Files Created

- `app/friend_code.ts` — Pure utilities: FRIEND_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', FRIEND_CODE_LENGTH = 6, generateRandomCode(), isValidFriendCode()
- `app/firestore_friends.ts` — Firestore wrapper: ensureMyFriendCode() (idempotent, transactional reservation via friend_code_index), lookupUserByFriendCode() (banned-user filter)
- `tests/friend_code.test.ts` — 26 tests (13 pure utils + 8 Firestore-backed tests A-H + 5 bonus)

## Key Exports

```typescript
// app/friend_code.ts
export const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const FRIEND_CODE_LENGTH = 6;
export function generateRandomCode(): string
export function isValidFriendCode(code: unknown): boolean

// app/firestore_friends.ts
export const FRIEND_CODE_INDEX_COLLECTION = 'friend_code_index';
export async function ensureMyFriendCode(): Promise<string | null>
export async function lookupUserByFriendCode(code: string): Promise<{ uid: string } | null>
```

## Invariants Verified

- No `anon_id` or `stable_id` as Firestore keys — only `getCanonicalUserId()` (SEC-06)
- `runTransaction` used for atomic check-and-set on `friend_code_index/{CODE}`
- Banned-user check on `lookupUserByFriendCode` (silent null — FRIEND-07)
- `firestore_leaderboard.ts` and `xp_manager.ts` untouched (D-03)
- 26 tests passing

## Test Results

```
PASS tests/friend_code.test.ts
Tests: 26 passed, 26 total
```
