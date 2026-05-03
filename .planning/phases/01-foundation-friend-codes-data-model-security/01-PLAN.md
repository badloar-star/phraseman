---
phase: 01-foundation-friend-codes-data-model-security
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/friend_code.ts
  - app/firestore_friends.ts
  - tests/friend_code.test.ts
autonomous: true
requirements: [FRIEND-04, FRIEND-05, TEST-01, SEC-06]

must_haves:
  truths:
    - "Friend code generator produces 6-character strings using only base32 alphabet 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' (no 0, O, 1, I, L)"
    - "ensureMyFriendCode() returns existing code from progress.friend_code if present; otherwise generates new unique code, writes it via canonical UID, and returns it"
    - "Collision detection retries generation up to N times when name_index_friend_code/{code} already exists, throws after max retries"
    - "All Firestore operations use canonical UID via getCanonicalUserId() — no anon_id or stable_id key paths"
    - "Unit tests verify alphabet, length, forbidden chars, and collision retry behavior"
  artifacts:
    - path: "app/friend_code.ts"
      provides: "Pure friend code generation utilities (alphabet constant, generateRandomCode, isValidFriendCode)"
      exports: ["FRIEND_CODE_ALPHABET", "FRIEND_CODE_LENGTH", "generateRandomCode", "isValidFriendCode"]
    - path: "app/firestore_friends.ts"
      provides: "Firestore-backed friend code storage with canonical UID and collision detection"
      exports: ["ensureMyFriendCode", "lookupUserByFriendCode", "FRIEND_CODE_INDEX_COLLECTION"]
    - path: "tests/friend_code.test.ts"
      provides: "Unit tests for code generation, validation, alphabet, collision retry"
  key_links:
    - from: "app/firestore_friends.ts:ensureMyFriendCode"
      to: "app/user_id_policy.ts:getCanonicalUserId"
      via: "import + await getCanonicalUserId() before any Firestore write"
      pattern: "getCanonicalUserId\\(\\)"
    - from: "app/firestore_friends.ts:ensureMyFriendCode"
      to: "Firestore: friend_code_index/{CODE}"
      via: "transaction-based reservation (read existing → only set if absent)"
      pattern: "runTransaction|friend_code_index"
    - from: "app/firestore_friends.ts:ensureMyFriendCode"
      to: "Firestore: users/{uid}.progress.friend_code"
      via: "merge: true write of progress.friend_code field"
      pattern: "progress.*friend_code"
---

<objective>
Создать систему генерации и хранения уникальных 6-символьных friend codes (base32 алфавит без `0/O/1/I/L`).
Code генерируется при первом обращении и хранится в `users/{canonicalUid}.progress.friend_code`.
Уникальность гарантируется транзакционной резервацией в коллекции `friend_code_index/{CODE}`.

Purpose: Дать каждому пользователю стабильный, человекочитаемый, защищённый от typo идентификатор для добавления друзей по коду — без необходимости делиться UID или email.

Output:
- `app/friend_code.ts` — pure utility (алфавит, генератор, валидатор) — тестируется в Node без Firestore
- `app/firestore_friends.ts` — Firestore-обёртка (`ensureMyFriendCode`, `lookupUserByFriendCode`)
- `tests/friend_code.test.ts` — unit tests
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
@app/firestore_leaderboard.ts
@firestore.rules

<interfaces>
<!-- Existing canonical UID API the executor MUST use -->

From app/user_id_policy.ts:
```typescript
/**
 * Canonical user ID policy for Firestore user-scoped documents.
 * We always use stableId for users/* to avoid identity drift
 * between auth uid, anon_id and reinstall scenarios.
 */
export async function getCanonicalUserId(): Promise<string | null>;
```

From app/firestore_leaderboard.ts (PATTERN REFERENCE — DO NOT MODIFY):
```typescript
// Pattern for transactional reservation (analogous to NAME_IDX = 'name_index')
// Use runTransaction for atomic check-and-set on friend_code_index/{CODE}.
const NAME_IDX = 'name_index';
await db.runTransaction(async (tx: any) => {
  const ref = db.collection(NAME_IDX).doc(nameLower);
  const snap = await tx.get(ref);
  if (snap.exists && snap.data()?.uid !== myUid) {
    throw new Error('NAME_TAKEN');
  }
  tx.set(ref, { uid: myUid, name: name.trim(), updatedAt: Date.now() });
});
```

From app/cloud_sync.ts (relevant SYNC_KEYS — DO NOT add friend_code here, it lives only in Firestore.progress, not AsyncStorage):
```typescript
// progress.friend_code is server-side state — do NOT add to SYNC_KEYS in cloud_sync.ts.
// It is read on demand by ensureMyFriendCode() and stored only in users/{uid}.progress.
```
</interfaces>

<locked_decisions>
From .planning/STATE.md Decisions Log (NON-NEGOTIABLE):
- D-01: Friend codes are 6-char base32, alphabet excludes `0`, `O`, `1`, `I`, `L`
- D-02: Canonical UID (`getCanonicalUserId()`) is the only allowed key for friend data
- D-03: NEVER modify `pushMyScore` in `xp_manager.ts` or anything in `firestore_leaderboard.ts`
</locked_decisions>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create pure friend code utility (alphabet, generator, validator)</name>
  <files>app/friend_code.ts, tests/friend_code.test.ts</files>

  <read_first>
    - app/friend_code.ts (verify it does not exist yet — fresh create)
    - tests/friend_code.test.ts (verify it does not exist yet)
    - tests/stable_id.test.ts (reference: jest mock pattern for AsyncStorage / Expo modules in this project)
    - app/firestore_leaderboard.ts (reference for naming conventions: lowercase keys, plain string IDs)
    - CLAUDE.md (canonical UID rule, banned tropes)
  </read_first>

  <behavior>
    - Test 1: `FRIEND_CODE_ALPHABET` is exactly the string `'ABCDEFGHJKMNPQRSTUVWXYZ23456789'` (32 chars, no `0/O/1/I/L`)
    - Test 2: `FRIEND_CODE_LENGTH` equals `6`
    - Test 3: `generateRandomCode()` returns a string of length 6
    - Test 4: `generateRandomCode()` only contains characters from `FRIEND_CODE_ALPHABET` (loop 1000 times, assert no forbidden char appears)
    - Test 5: `isValidFriendCode('ABC234')` returns `true`
    - Test 6: `isValidFriendCode('ABC23')` returns `false` (length 5)
    - Test 7: `isValidFriendCode('ABC2340')` returns `false` (length 7)
    - Test 8: `isValidFriendCode('ABC23O')` returns `false` (contains forbidden `O`)
    - Test 9: `isValidFriendCode('ABC230')` returns `false` (contains forbidden `0`)
    - Test 10: `isValidFriendCode('ABC23L')` returns `false` (forbidden `L`)
    - Test 11: `isValidFriendCode('abc234')` returns `false` (lowercase not allowed — strict uppercase)
    - Test 12: `isValidFriendCode('')` returns `false`
    - Test 13: `isValidFriendCode(null as any)` returns `false` (defensive)
  </behavior>

  <action>
    Create `app/friend_code.ts` with EXACTLY these exports:

    ```typescript
    /**
     * Friend code alphabet — Crockford-style base32, excluding visually ambiguous chars:
     *   0 (zero, looks like O)
     *   O (oh, looks like 0)
     *   1 (one, looks like I/L)
     *   I (eye, looks like 1/L)
     *   L (el, looks like 1/I)
     * Result: 32 chars (8 letters × 4 + extras = exactly 32 to keep base32 entropy).
     */
    export const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    export const FRIEND_CODE_LENGTH = 6;

    /** Регэксп строгой валидации (uppercase only, exact length). */
    const FRIEND_CODE_REGEX = new RegExp(`^[${FRIEND_CODE_ALPHABET}]{${FRIEND_CODE_LENGTH}}$`);

    /**
     * Generate a random 6-char friend code from the safe base32 alphabet.
     * Uses Math.random — for collision resistance we rely on transactional
     * reservation in Firestore (see app/firestore_friends.ts), not on entropy.
     * 32^6 = ~1.07B → Birthday collision probability is negligible at <1M users.
     */
    export function generateRandomCode(): string {
      let out = '';
      for (let i = 0; i < FRIEND_CODE_LENGTH; i++) {
        const idx = Math.floor(Math.random() * FRIEND_CODE_ALPHABET.length);
        out += FRIEND_CODE_ALPHABET[idx];
      }
      return out;
    }

    /**
     * Strict validation: 6 uppercase chars, all from FRIEND_CODE_ALPHABET.
     * Used by client-side input field BEFORE Firestore lookup (cheap fail-fast).
     */
    export function isValidFriendCode(code: unknown): boolean {
      if (typeof code !== 'string') return false;
      return FRIEND_CODE_REGEX.test(code);
    }

    /* expo-router route shim: keeps utility module from warning when discovered as route */
    export default function __RouteShim() { return null; }
    ```

    Then create `tests/friend_code.test.ts` exercising EVERY behavior listed in `<behavior>` above.

    Use the existing test pattern from `tests/stable_id.test.ts` (no native mocks needed — pure Node module).
    Test file must NOT import anything from Firestore / Firebase.

    Constraints (per `~/.claude/rules/typescript/coding-style.md` and CLAUDE.md):
    - No `console.log` statements (testing.md hook will fail)
    - No `any` casts except where typing `null as any` for defensive validation tests
    - All exports typed explicitly
    - Immutability: do not mutate `FRIEND_CODE_ALPHABET`
  </action>

  <verify>
    <automated>npm test -- --testPathPattern=friend_code</automated>
  </verify>

  <acceptance_criteria>
    - File `app/friend_code.ts` exists and contains line `export const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';` (grep: `FRIEND_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'`)
    - File `app/friend_code.ts` contains line `export const FRIEND_CODE_LENGTH = 6;` (grep: `FRIEND_CODE_LENGTH = 6`)
    - File `app/friend_code.ts` exports `generateRandomCode` and `isValidFriendCode` (grep: `export function generateRandomCode` AND `export function isValidFriendCode`)
    - File `tests/friend_code.test.ts` exists with at least 13 `test(` or `it(` blocks (grep -c `^(test|it)\\(` >= 13)
    - `npm test -- --testPathPattern=friend_code` exits 0 with "Tests: 13 passed" (or higher) in output
    - File contains NO `console.log` (grep: `console\\.log` returns 0 matches in `app/friend_code.ts`)
    - File contains the alphabet string literal exactly (grep ensures no `0`, `O`, `1`, `I`, `L` appear inside the alphabet definition between the single quotes)
  </acceptance_criteria>

  <done>
    `app/friend_code.ts` provides typed pure utilities for friend code alphabet, generation, and validation. All 13+ unit tests pass via `npm test -- --testPathPattern=friend_code`.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create Firestore friend code storage with canonical UID + transactional uniqueness</name>
  <files>app/firestore_friends.ts, tests/friend_code.test.ts</files>

  <read_first>
    - app/firestore_friends.ts (verify it does not exist yet — fresh create)
    - app/friend_code.ts (created in Task 1 — import alphabet/generator/validator)
    - app/user_id_policy.ts (use `getCanonicalUserId()` — required by SEC-06 and CLAUDE.md)
    - app/firestore_leaderboard.ts (PATTERN REFERENCE for `runTransaction` reservation — see `reserveName` lines 164-213)
    - app/config.ts (CLOUD_SYNC_ENABLED, IS_EXPO_GO guards — see how `firestore_leaderboard.ts` uses `getFirestore()`)
    - CLAUDE.md (per D-03 — DO NOT touch `firestore_leaderboard.ts` or `pushMyScore`; only IMPORT for reading patterns)
  </read_first>

  <behavior>
    - Test A: `ensureMyFriendCode()` when `progress.friend_code` already exists returns that exact value without writing (mock: users doc exists with `progress.friend_code = 'ABCD23'`)
    - Test B: `ensureMyFriendCode()` when no code exists writes a freshly generated 6-char code to `friend_code_index/{CODE}` AND `users/{uid}.progress.friend_code`, returns the code
    - Test C: When the first generated code already exists in `friend_code_index/{CODE}` (collision), generator retries — max 10 attempts — and second attempt succeeds
    - Test D: When canonical UID is `null` (offline / Expo Go), `ensureMyFriendCode()` returns `null` and does NOT write to Firestore
    - Test E: `lookupUserByFriendCode('ABCD23')` returns `{ uid }` from `friend_code_index/ABCD23` document
    - Test F: `lookupUserByFriendCode('ABCD23')` returns `null` if `banned_users/{uid}` exists for that uid (per SEC-05/FRIEND-07: silent failure)
    - Test G: `lookupUserByFriendCode('invalid')` returns `null` immediately without Firestore call (uses `isValidFriendCode` from Task 1)
    - Test H: `FRIEND_CODE_INDEX_COLLECTION` constant equals exactly `'friend_code_index'`
  </behavior>

  <action>
    Create `app/firestore_friends.ts`. Mirror the structure/style of `app/firestore_leaderboard.ts` (lazy `getFirestore()`, `CLOUD_SYNC_ENABLED` guards, `getCanonicalUserId()` for the UID).

    EXACT exports required:

    ```typescript
    import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
    import { getCanonicalUserId } from './user_id_policy';
    import { generateRandomCode, isValidFriendCode } from './friend_code';

    /** Firestore collection name for code → uid reverse index. Indexed by code (doc id). */
    export const FRIEND_CODE_INDEX_COLLECTION = 'friend_code_index';

    /** Maximum collision retries before throwing. With 32^6 codespace this is astronomically safe. */
    const MAX_COLLISION_RETRIES = 10;

    const getFirestore = () => {
      if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        return require('@react-native-firebase/firestore').default();
      } catch {
        return null;
      }
    };

    /**
     * Ensure the current user has a unique friend code stored in
     * users/{canonicalUid}.progress.friend_code.
     *
     * Idempotent: if a code already exists, returns it without any write.
     * Generates a new code with transactional collision check on
     * friend_code_index/{CODE} (doc id == code), retries on collision up to
     * MAX_COLLISION_RETRIES times.
     *
     * Returns null when Firestore is unavailable (Expo Go, CLOUD_SYNC_ENABLED=false,
     * or canonical UID not yet provisioned).
     *
     * NOTE: Per CLAUDE.md SEC-06, only canonical UID from getCanonicalUserId() is
     * acceptable — never anon_id, never stable_id directly. ALL writes must use
     * the canonical UID returned here as the document key.
     */
    export async function ensureMyFriendCode(): Promise<string | null>;

    /**
     * Look up another user by friend code. Returns { uid } on hit, null on miss
     * (either: code missing from index, or target user is in banned_users/{uid}).
     * Banned-user filter is silent per FRIEND-07 (UI shows generic "Code not found").
     *
     * Performs client-side validation via isValidFriendCode() before any
     * network call (cheap fail-fast on garbage input).
     */
    export async function lookupUserByFriendCode(code: string): Promise<{ uid: string } | null>;
    ```

    IMPLEMENTATION DETAILS for `ensureMyFriendCode`:
    1. `const uid = await getCanonicalUserId(); if (!uid) return null;`
    2. `const db = getFirestore(); if (!db) return null;`
    3. Read `users/{uid}` document. If `data?.progress?.friend_code` is a string passing `isValidFriendCode()`, return it (idempotent fast path — no write).
    4. Loop up to `MAX_COLLISION_RETRIES`:
       - `const code = generateRandomCode();`
       - `await db.runTransaction(async (tx) => { const ref = db.collection(FRIEND_CODE_INDEX_COLLECTION).doc(code); const snap = await tx.get(ref); if (snap.exists) throw new Error('CODE_TAKEN'); tx.set(ref, { uid, createdAt: Date.now() }); tx.set(db.collection('users').doc(uid), { progress: { friend_code: code }, updatedAt: Date.now() }, { merge: true }); });`
       - If transaction succeeds, return `code`. If it throws `CODE_TAKEN`, continue loop.
    5. After max retries, log via `recordError` (if available) and throw `Error('FRIEND_CODE_GENERATION_EXHAUSTED')`.

    IMPLEMENTATION DETAILS for `lookupUserByFriendCode(code)`:
    1. `if (!isValidFriendCode(code)) return null;` (no Firestore call)
    2. `const db = getFirestore(); if (!db) return null;`
    3. `const snap = await db.collection(FRIEND_CODE_INDEX_COLLECTION).doc(code).get(); if (!snap.exists) return null;`
    4. `const uid = snap.data()?.uid as string | undefined; if (!uid) return null;`
    5. Check `banned_users/{uid}`: `const banSnap = await db.collection('banned_users').doc(uid).get(); if (banSnap.exists) return null;` (per SEC-05/FRIEND-07 silent fail)
    6. Return `{ uid }`.

    Add a `default function __RouteShim()` export at the end (expo-router pattern, see `firestore_leaderboard.ts:346`).

    EXTEND `tests/friend_code.test.ts` (created in Task 1) with tests A-H using a `firestore` mock pattern. Mock `'@react-native-firebase/firestore'` to return a fake `db` with controllable behaviors. Mock `./user_id_policy` to return a known UID or null. Use `jest.resetModules()` in `beforeEach`.

    Constraints:
    - Per CLAUDE.md SEC-06: every `users/{...}` and `friend_code_index/{...}` doc id MUST come from `getCanonicalUserId()` — no `auth().currentUser.uid`, no `anon_id`, no `stable_id`.
    - Per D-03: do NOT modify `app/firestore_leaderboard.ts` or `app/xp_manager.ts`.
    - All exported functions typed explicitly (see `~/.claude/rules/typescript/coding-style.md`).
    - No `console.log` (hooks block).
    - Use `Math.random` is acceptable for code generation — entropy is 32^6 ≈ 1.07B; transactional reservation handles collisions.
  </action>

  <verify>
    <automated>npm test -- --testPathPattern=friend_code</automated>
  </verify>

  <acceptance_criteria>
    - File `app/firestore_friends.ts` exists (test: file is non-empty)
    - File contains exact line `export const FRIEND_CODE_INDEX_COLLECTION = 'friend_code_index';` (grep: `FRIEND_CODE_INDEX_COLLECTION = 'friend_code_index'`)
    - File exports `ensureMyFriendCode` and `lookupUserByFriendCode` (grep: `export async function ensureMyFriendCode` AND `export async function lookupUserByFriendCode`)
    - File imports `getCanonicalUserId` (grep: `from './user_id_policy'` AND `getCanonicalUserId`)
    - File imports `generateRandomCode` and `isValidFriendCode` from `./friend_code` (grep: `from './friend_code'`)
    - File contains `runTransaction` call (grep: `runTransaction`)
    - File contains banned user check on lookup path (grep: `banned_users`)
    - File does NOT reference `anon_id` or `stable_id` strings as Firestore keys (grep: `anon_id|stable_id` returns 0 matches in `app/firestore_friends.ts`)
    - File does NOT modify `firestore_leaderboard.ts` or `xp_manager.ts` (verify with `git diff --name-only` — only `app/firestore_friends.ts` and `tests/friend_code.test.ts` should appear in diff for this task)
    - `tests/friend_code.test.ts` includes at least 8 additional tests covering behaviors A-H (grep -c `^(test|it)\\(` >= 21 total: 13 from Task 1 + 8 new)
    - `npm test -- --testPathPattern=friend_code` exits 0 with all tests passing
    - File contains NO `console.log` (grep: `console\\.log` returns 0 matches in `app/firestore_friends.ts`)
  </acceptance_criteria>

  <done>
    `ensureMyFriendCode()` is idempotent, uses canonical UID, transactionally reserves codes in `friend_code_index/{CODE}`, retries on collision. `lookupUserByFriendCode()` validates client-side, checks banned users, returns silent null on miss. All unit tests pass. Existing `firestore_leaderboard.ts` and `xp_manager.ts` are untouched.
  </done>
</task>

</tasks>

<verification>
Plan-level checks:
1. `npm test -- --testPathPattern=friend_code` passes (all tests green).
2. `git diff --name-only HEAD` shows only `app/friend_code.ts`, `app/firestore_friends.ts`, `tests/friend_code.test.ts` modified (NO changes to `xp_manager.ts`, `firestore_leaderboard.ts`, `firestore.rules`, `functions/`).
3. `grep -nE "anon_id|stable_id" app/firestore_friends.ts` returns 0 matches.
4. `grep -n "getCanonicalUserId" app/firestore_friends.ts` returns at least 1 match.
5. `grep -n "0\\|O\\|1\\|I\\|L" -o app/friend_code.ts | grep "FRIEND_CODE_ALPHABET" -A1` does not show forbidden chars inside the alphabet string.
</verification>

<success_criteria>
- FRIEND-04: `ensureMyFriendCode()` exists, generates a 6-char base32 code on first call, stores in `users/{canonicalUid}.progress.friend_code`. — VERIFIED via Test B.
- FRIEND-05: collision detection via transactional reservation in `friend_code_index/{CODE}` with retry. — VERIFIED via Test C.
- TEST-01: unit tests cover alphabet, length, forbidden chars, validation, collision retry. — VERIFIED by `npm test`.
- SEC-06: only `getCanonicalUserId()` is used as the user key. — VERIFIED by grep checks above.
- D-03 untouched: `firestore_leaderboard.ts` + `xp_manager.ts` not modified. — VERIFIED by `git diff --name-only`.
</success_criteria>

<output>
After completion, create `.planning/phases/01-foundation-friend-codes-data-model-security/01-foundation-friend-codes-data-model-security-01-SUMMARY.md` capturing: actual file paths, exported function signatures, the alphabet string, test count, and any deviations from this plan.
</output>
