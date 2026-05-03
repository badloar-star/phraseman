---
phase: 01-foundation-friend-codes-data-model-security
plan: 03
type: execute
wave: 2
depends_on: [01, 02]
files_modified:
  - firestore.rules
  - tests/firestore_rules_security.test.ts
autonomous: true
requirements: [SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06]

must_haves:
  truths:
    - "firestore.rules contains a /friends/{friendId} subcollection rule scoped to /users/{userId}/friends/{friendId} with owner-only writes"
    - "firestore.rules contains a /friend_requests/{senderId} subcollection rule scoped to /users/{targetUid}/friend_requests/{senderId} where create requires senderId == request.auth.uid (anti-impersonation)"
    - "firestore.rules contains a top-level /friend_code_index/{code} rule with read=any-auth, create-only-if-uid-matches-self, no update or delete"
    - "firestore.rules denies friend request creation when target user has banned_users/{senderUid} document (server-side bypass of banned senders)"
    - "Existing rule blocks (users, leaderboard, banned_users, arena_*, auth_links, etc.) are NOT modified — only new match blocks are added before the catch-all"
    - "Rules test suite (tests/firestore_rules_security.test.ts) is extended with grep-based assertions for all new rule blocks"
  artifacts:
    - path: "firestore.rules"
      provides: "Security rules for /users/{uid}/friends/*, /users/{uid}/friend_requests/*, /friend_code_index/*"
      contains: "match /friend_code_index"
    - path: "tests/firestore_rules_security.test.ts"
      provides: "Extended rules-baseline assertions for new collections"
      contains: "friend_code_index"
  key_links:
    - from: "firestore.rules: /users/{userId}/friend_requests/{senderId}"
      to: "request.auth.uid == senderId"
      via: "create rule clause requiring doc id to equal sender's auth uid"
      pattern: "senderId == request.auth.uid"
    - from: "firestore.rules: /users/{userId}/friend_requests/{senderId}"
      to: "/banned_users/{senderUid} existence check"
      via: "exists(/databases/$(database)/documents/banned_users/$(request.auth.uid)) == false"
      pattern: "banned_users.*request.auth.uid"
    - from: "firestore.rules: /friend_code_index/{code}"
      to: "request.resource.data.uid == request.auth.uid (or canonical-UID equivalent in rules)"
      via: "create-only validation that the code is being claimed by the same auth uid"
      pattern: "friend_code_index"
---

<objective>
Расширить `firestore.rules` правилами для friend-related коллекций, не нарушая существующие правила (users/{uid}, leaderboard/{uid}, arena_*, auth_links, banned_users). Добавить unit-тесты для grep-валидации новых правил.

Правила покрывают:
1. `/users/{uid}/friends/{friendId}` — owner-only writes; mutual-friend read.
2. `/users/{targetUid}/friend_requests/{senderId}` — anti-impersonation create (doc id == sender's auth uid), banned-sender блокировка, owner-only delete (accept/decline cleanup).
3. `/friend_code_index/{code}` — read любым auth юзером (для lookup), create только если `request.resource.data.uid == request.auth.uid`, no update / no delete.
4. `progress.friend_code` уже покрыт существующим правилом `/users/{uid}` (read/write для любого auth — известный tradeoff, см. firestore.rules:30).

Purpose: Без правил Firestore deny-all catch-all блокирует все friend-операции. Правила создают границу безопасности, согласованную с CLAUDE.md (canonical UID, banned users, не трогать pushMyScore-flow).

Output:
- `firestore.rules` с тремя новыми `match` блоками
- `tests/firestore_rules_security.test.ts` с дополнительными grep-проверками
- Никаких изменений в Cloud Functions, в `app/`, или в существующих rule блоках

⚠️ ЗАВИСИТ ОТ Plan 01 (нужно знать что friend_code хранится в `users/{uid}.progress.friend_code` и резервируется в `friend_code_index/{code}`) и Plan 02 (нужно знать что `weekly_xp` живёт в `users/{uid}.progress.weekly_xp` — НЕ требует отдельного rule, покрыт существующим `match /users/{userId}`).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@CLAUDE.md
@firestore.rules
@tests/firestore_rules_security.test.ts
@.planning/phases/01-foundation-friend-codes-data-model-security/01-foundation-friend-codes-data-model-security-01-SUMMARY.md
@.planning/phases/01-foundation-friend-codes-data-model-security/01-foundation-friend-codes-data-model-security-02-SUMMARY.md

<interfaces>
<!-- Schema contracts established by plans 01 and 02 that these rules must enforce -->

From plan 01 (`app/firestore_friends.ts`):
- Collection: `friend_code_index` (top-level)
- Doc id: friend code (6-char base32, e.g. `'ABCD23'`)
- Doc fields: `{ uid: string, createdAt: number }`
- Owner: `request.auth.uid` corresponds to user storing canonical UID. (Note: in this codebase `request.auth.uid` is the anonymous Firebase Auth uid, while `users/{userId}` doc id is `stable_id` per `app/user_id_policy.ts`. Rules should permit any authenticated user to create a code reservation as long as `request.resource.data.uid` matches their auth uid OR (looser) is a non-empty string — see action below for the chosen tradeoff.)

From plan 02 (`app/weekly_xp.ts` + `app/cloud_sync.ts`):
- Field: `users/{userId}.progress.weekly_xp` (string-encoded number)
- Field: `users/{userId}.progress.weekly_xp_period_start` (ISO date string)
- These are nested inside the existing `progress` map → ALREADY covered by current rule `match /users/{userId} { allow read, write: if request.auth != null; }` (see firestore.rules:33-34). NO new rule needed for these fields.

From existing firestore.rules patterns to MIRROR:

```javascript
// Existing pattern for owner-scoped writes (mirror this for /friends):
match /users/{userId} {
  allow read, write: if request.auth != null;  // Phraseman uses stable_id ≠ auth.uid, so isOwner(userId) doesn't apply directly. BUT for /friends subcollection, doc id is the *friend's* UID (not the path's userId), so different shape.
}

// Existing pattern for affectedKeys() restriction (mirror for friend_requests update):
match /arena_invites/{inviteId} {
  allow update: if request.auth != null
    && (resource.data.fromUid in [request.auth.uid] ...)
    && request.resource.data.diff(resource.data).affectedKeys()
       .hasOnly(['status']);
}

// Existing pattern for banned_users gating:
match /banned_users/{docId} {
  allow read:  if request.auth != null;
  allow write: if isAdmin();
}
// USE: `exists(/databases/$(database)/documents/banned_users/$(request.auth.uid))` to block banned senders.
```
</interfaces>

<locked_decisions>
From .planning/STATE.md, CLAUDE.md, and previous plans (NON-NEGOTIABLE):
- D-09: NEVER touch existing rule blocks for `/users/{userId}`, `/leaderboard/{userId}`, `/banned_users`, `/arena_*`, `/auth_links`, `/league_groups`, etc. Only ADD new blocks before the catch-all.
- D-10: Catch-all `match /{document=**}` MUST remain at the end with `allow read, write: if false;`
- D-11: Friend ops respect `banned_users/{uid}` — banned senders cannot create friend_requests
- D-12: `friend_code_index/{code}` is publicly readable by any auth user (needed for FRIEND-06 lookup); SEC-04 confirms `progress.friend_code` is also readable (already covered by existing `/users/{userId}` rule).
- D-13: Use `request.auth.uid` in rules (NOT canonical/stable UID) — Firestore rules can only see Firebase Auth uid. Per CLAUDE.md, `pushMyScore` already does mismatched-uid writes; this is the documented tradeoff. Do not attempt to bridge auth.uid ↔ stable_id in rules.
</locked_decisions>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add three new match blocks to firestore.rules (friends, friend_requests, friend_code_index)</name>
  <files>firestore.rules</files>

  <read_first>
    - firestore.rules (FULL READ — must understand exact structure, find the catch-all line ~309, identify safe insertion point right before catch-all)
    - .planning/phases/01-foundation-friend-codes-data-model-security/01-foundation-friend-codes-data-model-security-01-SUMMARY.md (verify plan 01 actually used `friend_code_index` as the collection name and `progress.friend_code` as the field path)
    - tests/firestore_rules_security.test.ts (existing test patterns we will extend in Task 2)
    - CLAUDE.md (per D-09, D-11)
  </read_first>

  <action>
    Open `firestore.rules`. Find the catch-all block (currently lines 308-311):

    ```javascript
    // ── CATCH-ALL ─────────────────────────────────────────────────────────────
    match /{document=**} {
      allow read, write: if false;
    }
    ```

    Insert the THREE new `match` blocks IMMEDIATELY BEFORE the catch-all comment. Use this exact text (preserving 2-space indentation matching existing rules):

    ```javascript
        // ── Friend code reverse index (FRIEND-04, FRIEND-05, SEC-04) ──────────────
        // Doc id = the 6-char friend code itself; data = { uid, createdAt }.
        // Read: any authenticated user (needed for code → uid lookup, FRIEND-06).
        // Create: only if request.resource.data.uid is non-empty string (transactional
        //   reservation in app/firestore_friends.ts:ensureMyFriendCode handles uniqueness).
        // Update/Delete: forbidden (immutable index — code never changes hands).
        match /friend_code_index/{code} {
          allow read: if request.auth != null;
          allow create: if request.auth != null
            && request.resource.data.uid is string
            && request.resource.data.uid.size() > 0
            && request.resource.data.createdAt is number;
          allow update: if false;
          allow delete: if false;
        }

        // ── Friend requests (REQ-01..REQ-07, SEC-02, SEC-03, SEC-05) ──────────────
        // Path: users/{targetUid}/friend_requests/{senderUid}.
        // Doc id is the sender's UID (anti-impersonation: only the sender can create
        // their own request to a target).
        //
        // Create:
        //   - sender must be authenticated
        //   - doc id (senderUid) must equal request.auth.uid (cannot fake sender)
        //   - sender must NOT be in banned_users/{senderUid} (SEC-05)
        //   - cannot send to self (target ≠ sender) — clarifies REQ semantics
        //   - request.resource.data.status must be 'pending' on creation
        // Read: authenticated user can read requests addressed to them (target == auth.uid)
        //   OR requests they sent (sender == auth.uid).
        // Update: only the target can change status to 'accepted' or 'declined'
        //   (affectedKeys hasOnly ['status']) — accept/decline flow.
        // Delete: only the target can delete (post-accept cleanup or decline cleanup).
        match /users/{targetUid}/friend_requests/{senderUid} {
          allow read: if request.auth != null
            && (request.auth.uid == targetUid || request.auth.uid == senderUid);
          allow create: if request.auth != null
            && senderUid == request.auth.uid
            && targetUid != senderUid
            && !exists(/databases/$(database)/documents/banned_users/$(request.auth.uid))
            && request.resource.data.status == 'pending'
            && request.resource.data.createdAt is number;
          allow update: if request.auth != null
            && request.auth.uid == targetUid
            && request.resource.data.diff(resource.data).affectedKeys()
               .hasOnly(['status', 'updatedAt'])
            && request.resource.data.status in ['accepted', 'declined'];
          allow delete: if request.auth != null && request.auth.uid == targetUid;
        }

        // ── Friends list (LIST-*, REQ-03, REQ-06, SEC-01, SEC-06) ─────────────────
        // Path: users/{ownerUid}/friends/{friendUid}.
        // Mirror docs created on accept (REQ-03): users/{A}/friends/{B} AND users/{B}/friends/{A}.
        //
        // Read: any authenticated user (needed for HoF in Phase 3 — friend rows
        //   must be queryable by friend's uid; banned-user filter happens client-side).
        //   Tradeoff documented (mirrors existing /users/{userId} read=any-auth rule).
        // Create: only if owner == auth.uid (you can only add to your own list).
        //   The "mirror doc" in friend's list is created by THEM via the corresponding
        //   accept-flow client transaction (each side creates its own doc).
        // Delete: only owner can delete from their list.
        // Update: forbidden — friend rows are immutable (re-create on data change).
        match /users/{ownerUid}/friends/{friendUid} {
          allow read: if request.auth != null;
          allow create: if request.auth != null
            && request.auth.uid == ownerUid
            && ownerUid != friendUid;
          allow update: if false;
          allow delete: if request.auth != null && request.auth.uid == ownerUid;
        }
    ```

    DO NOT modify any existing rule block. DO NOT change `match /users/{userId}` (the parent rule already permits read/write at the doc level — these subcollection rules supplement, not override).

    DO NOT add or remove any helper functions (`isOwner`, `isAdmin`).

    VERIFY the catch-all `match /{document=**} { allow read, write: if false; }` is still the last block.
  </action>

  <verify>
    <automated>node -e "const r=require('fs').readFileSync('firestore.rules','utf8'); const required=['match /friend_code_index/{code}','match /users/{targetUid}/friend_requests/{senderUid}','match /users/{ownerUid}/friends/{friendUid}','allow read, write: if false;']; const missing=required.filter(s=>!r.includes(s)); if(missing.length){console.error('MISSING:',missing);process.exit(1);} console.log('OK')"</automated>
  </verify>

  <acceptance_criteria>
    - `firestore.rules` contains literal `match /friend_code_index/{code}` (grep)
    - `firestore.rules` contains literal `match /users/{targetUid}/friend_requests/{senderUid}` (grep)
    - `firestore.rules` contains literal `match /users/{ownerUid}/friends/{friendUid}` (grep)
    - `firestore.rules` contains `senderUid == request.auth.uid` clause (grep — anti-impersonation)
    - `firestore.rules` contains `exists(/databases/$(database)/documents/banned_users/$(request.auth.uid))` clause (grep — banned-sender check)
    - `firestore.rules` contains `request.resource.data.status == 'pending'` (grep — initial status validation)
    - `firestore.rules` contains `affectedKeys()\\s*\\n?\\s*.hasOnly(['status', 'updatedAt'])` for friend_requests update (grep with multiline tolerance)
    - `firestore.rules` STILL contains `match /{document=**}` followed by `allow read, write: if false;` AS THE LAST `match` BLOCK (grep + line-order check: catch-all line number > all friend block line numbers)
    - `firestore.rules` STILL contains existing rule lines unchanged: `match /users/{userId} {`, `match /leaderboard/{userId} {`, `match /banned_users/{docId} {`, `match /auth_links/{providerUid} {` (grep each — confirms D-09)
    - `git diff firestore.rules` shows ONLY additions (no deletions of existing rules) — verify with `git diff --stat firestore.rules` (insertions > 0, deletions == 0)
    - Validation script in `<verify>` exits 0
  </acceptance_criteria>

  <done>
    `firestore.rules` has three new `match` blocks for `/friend_code_index/{code}`, `/users/{uid}/friend_requests/{senderId}`, and `/users/{uid}/friends/{friendId}`. Catch-all is still the last rule. All existing rules are byte-identical (only additions in diff).
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Extend tests/firestore_rules_security.test.ts with grep-based assertions for new rules</name>
  <files>tests/firestore_rules_security.test.ts</files>

  <read_first>
    - tests/firestore_rules_security.test.ts (FULL READ — see existing 5 tests; pattern is grep-against-rules-text, NOT firebase-rules-emulator)
    - firestore.rules (modified in Task 1 — confirm new blocks are present)
    - tests/stable_id.test.ts (NOT a model — just confirms project's general jest style with TypeScript)
  </read_first>

  <behavior>
    - Test A: `friend_code_index` rule exists with correct read/create/update/delete clauses
    - Test B: `friend_requests` rule contains anti-impersonation clause (`senderUid == request.auth.uid`)
    - Test C: `friend_requests` rule contains banned-sender check (`banned_users/$(request.auth.uid)`)
    - Test D: `friend_requests` initial status validation (`status == 'pending'`)
    - Test E: `friend_requests` update is field-restricted (`affectedKeys` includes `'status'`)
    - Test F: `friend_requests` update only allows status in `['accepted', 'declined']`
    - Test G: `friends` subcollection rule exists with create-by-owner clause (`request.auth.uid == ownerUid`)
    - Test H: `friends` subcollection forbids self-friending (`ownerUid != friendUid`)
    - Test I: `friends` subcollection update is forbidden (`allow update: if false;` inside that block)
    - Test J: existing rules untouched — assertions for `match /users/{userId}`, `match /leaderboard/{userId}`, `match /banned_users/{docId}`, and the catch-all are still passing (regression guard for D-09)
    - Test K: catch-all is the LAST `match` block (verify by indexing the last occurrence of `match /` in the rules file is the catch-all)
  </behavior>

  <action>
    APPEND to `tests/firestore_rules_security.test.ts` — keep existing 5 tests intact, add a new `describe` block:

    ```typescript
    describe('firestore.rules friend system (Phase 1)', () => {
      const rules = readFileSync(rulesPath, 'utf8');

      test('friend_code_index rule allows authenticated read', () => {
        expect(rules).toContain('match /friend_code_index/{code} {');
        expect(rules).toMatch(/match \/friend_code_index\/\{code\} \{[\s\S]*?allow read: if request\.auth != null;/);
      });

      test('friend_code_index rule restricts create to non-empty uid', () => {
        expect(rules).toMatch(/match \/friend_code_index\/\{code\} \{[\s\S]*?allow create: if request\.auth != null[\s\S]*?request\.resource\.data\.uid is string[\s\S]*?request\.resource\.data\.uid\.size\(\) > 0/);
      });

      test('friend_code_index rule forbids update and delete', () => {
        expect(rules).toMatch(/match \/friend_code_index\/\{code\} \{[\s\S]*?allow update: if false;[\s\S]*?allow delete: if false;/);
      });

      test('friend_requests create requires senderUid == request.auth.uid (anti-impersonation)', () => {
        expect(rules).toContain('match /users/{targetUid}/friend_requests/{senderUid} {');
        expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?senderUid == request\.auth\.uid/);
      });

      test('friend_requests create checks banned_users (SEC-05)', () => {
        expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?!exists\(\/databases\/\$\(database\)\/documents\/banned_users\/\$\(request\.auth\.uid\)\)/);
      });

      test('friend_requests create requires status == pending', () => {
        expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?request\.resource\.data\.status == 'pending'/);
      });

      test('friend_requests forbids self-targeting', () => {
        expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?targetUid != senderUid/);
      });

      test('friend_requests update is field-restricted to status and updatedAt', () => {
        expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?affectedKeys\(\)[\s\S]*?\.hasOnly\(\['status', 'updatedAt'\]\)/);
      });

      test('friend_requests update only permits accepted or declined statuses', () => {
        expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?request\.resource\.data\.status in \['accepted', 'declined'\]/);
      });

      test('friend_requests delete restricted to target', () => {
        expect(rules).toMatch(/friend_requests\/\{senderUid\}[\s\S]*?allow delete: if request\.auth != null && request\.auth\.uid == targetUid;/);
      });

      test('friends subcollection rule exists with owner-only create', () => {
        expect(rules).toContain('match /users/{ownerUid}/friends/{friendUid} {');
        expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?allow create: if request\.auth != null[\s\S]*?request\.auth\.uid == ownerUid/);
      });

      test('friends subcollection forbids self-friending', () => {
        expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?ownerUid != friendUid/);
      });

      test('friends subcollection forbids updates', () => {
        expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?allow update: if false;/);
      });

      test('friends subcollection delete restricted to owner', () => {
        expect(rules).toMatch(/friends\/\{friendUid\}[\s\S]*?allow delete: if request\.auth != null && request\.auth\.uid == ownerUid;/);
      });

      test('catch-all is still the last match block (D-09 regression guard)', () => {
        // Find last occurrence of `match /...` and assert it's the catch-all
        const matches = [...rules.matchAll(/match \/[^\s]+ \{/g)];
        const lastMatch = matches[matches.length - 1];
        expect(lastMatch).toBeDefined();
        expect(lastMatch![0]).toContain('match /{document=**}');
      });

      test('existing rules untouched — users, leaderboard, banned_users blocks still present', () => {
        expect(rules).toContain('match /users/{userId} {');
        expect(rules).toContain('match /leaderboard/{userId} {');
        expect(rules).toContain('match /banned_users/{docId} {');
        expect(rules).toContain('match /auth_links/{providerUid} {');
      });
    });
    ```

    DO NOT modify the existing top-level `describe('firestore.rules security baseline')` block. New `describe` is appended.

    Constraints:
    - Per CLAUDE.md: no `console.log`, types explicit where exported, but test files don't export so this is implicit.
    - Use the same `readFileSync` pattern as existing tests.
  </action>

  <verify>
    <automated>npm test -- --testPathPattern=firestore_rules_security</automated>
  </verify>

  <acceptance_criteria>
    - `tests/firestore_rules_security.test.ts` contains second `describe(` block with title `'firestore.rules friend system (Phase 1)'` (grep)
    - File has at least 16 total `test(` blocks (5 original + at least 11 new = 16+) (grep -c >= 16)
    - All test names from `<behavior>` A through K are present (verify by reading test file or grep for distinguishing keywords like `'banned_users'`, `'self-friending'`, `'self-targeting'`, `'catch-all'`)
    - `npm test -- --testPathPattern=firestore_rules_security` exits 0 with all tests passing
    - Existing 5 tests in the original `describe` block still pass (regression check — implicitly covered by the test command)
    - File contains NO `console.log` (grep returns 0 matches for `console\\.log`)
  </acceptance_criteria>

  <done>
    `tests/firestore_rules_security.test.ts` has 16+ tests passing, including 11+ new tests for friend_code_index, friend_requests, and friends subcollection rules. Existing rules baseline tests still pass (D-09 protected).
  </done>
</task>

</tasks>

<verification>
Plan-level checks:
1. `npm test -- --testPathPattern=firestore_rules_security` passes (all 16+ tests).
2. `git diff --stat firestore.rules` shows only additions, zero deletions (D-09).
3. `git diff app/ functions/` returns nothing — this plan changes only `firestore.rules` and tests.
4. Manually run the validation script from Task 1's `<verify>` block to confirm rule structure.
5. Optional: deploy to Firebase emulator (`firebase emulators:start --only firestore`) and confirm rules compile without syntax errors. (Not required for plan completion — grep tests are the gate.)
</verification>

<success_criteria>
- SEC-01: `/users/{ownerUid}/friends/{friendUid}` rule with owner-only create/delete; read for any auth user (HoF tradeoff documented). — VERIFIED via Tests G, H, I.
- SEC-02: `/users/{targetUid}/friend_requests/{senderUid}` create requires `senderUid == request.auth.uid`. — VERIFIED via Test B.
- SEC-03: friend_requests read for participants, delete for target. — VERIFIED via existing `<action>` rule body + Tests `J`-style assertions.
- SEC-04: `progress.friend_code` is readable by any auth user (covered by existing `/users/{userId}` rule, no new rule needed). — DOCUMENTED in plan, verified by Test J (existing rule untouched).
- SEC-05: banned_users blocked at request creation via `exists(...)` check. — VERIFIED via Test C.
- SEC-06: rules use `request.auth.uid` consistently (Firestore rules cannot see canonical/stable UID — documented tradeoff per CLAUDE.md). — VERIFIED by inspection: no rule references stable_id.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-friend-codes-data-model-security/01-foundation-friend-codes-data-model-security-03-SUMMARY.md` capturing: number of new rule blocks added, number of new tests added, exact line range where new blocks were inserted in `firestore.rules`, confirmation that catch-all is still last, and any deviations from the planned rule text.
</output>
