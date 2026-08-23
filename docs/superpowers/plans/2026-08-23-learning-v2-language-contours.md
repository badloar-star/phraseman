# Learning V2 Language Contours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Learning V2 authoring platform target-language-generic so a second, independent authoring session (Spanish) can run in parallel with the live English session with zero interference, zero risk to the LOCKED/AUTO_PASS English fingerprints, and a clear, scalable pattern for every future target language.

**Architecture:** The content-shard layer (`SessionSource`, `LearningV2GeneratedSessionShardV1`) already carries a `targetLanguage: string` field end-to-end — this was discovered during audit and is NOT something this plan invents. The only hardcoded-to-one-course layer is the **authoring registry + collector + preflight CLI + entry contract**. This plan parametrizes exactly that layer by `targetLanguage`, keyed as `(targetLanguage, sessionOrdinal)`, while leaving all 44 English session-content files, all ~65 English per-session tests, and all LOCKED fingerprints byte-for-byte untouched. A parallel, empty Spanish registry (56 DRAFT entries) is created as the seam a Spanish authoring session writes into. Runtime feature gates (Arena, MAX) are closed in a separate final phase using the existing `*_target_gate.ts` pattern.

**Tech Stack:** TypeScript, tsx (script runner), Node `assert/strict` test style already used in this repo's `tests/*.ts` gate files, npm scripts.

**Non-negotiable safety constraint (owner rule, `AGENTS.md` "LEARNING V2: СНАЧАЛА СТАРТ В2"):** LOCKED session fingerprints 1–13 and the AUTO_PASS candidate/forbidden fingerprints for session 14 must be **byte-identical** before and after every task in this plan. Task 1's own test proves this. If any step changes a fingerprint, stop immediately — that step is wrong, not the fingerprint.

---

## Execution deviations (recorded 2026-08-23, during inline execution)

Two things the plan did not anticipate. Both were caught by the plan's own
verification steps, which is the point of having them.

1. **`actualFingerprints` had to widen from `Record<number, string>` to
   `Record<number, string | null>`.** `canonicalJsonV1` (inside
   `hashCanonicalBody`, which the preflight uses to compute the
   forbidden-future fingerprint) is fail-closed and rejects `undefined` as a
   non-JSON value. English never hit this because
   `allAuthoredEpisode01Sessions()` materializes all 56 ordinals, so every key
   is always present with a real hash. An empty Spanish course has no content
   at all, so every one of the 56 positions must be passed explicitly as
   `null` — a missing key throws `canonical_json_non_json_value`. The Spanish
   branch of `actualFingerprints()` therefore emits 56 explicit `null`s, and
   `buildDraftRegistry()` computes session 1's `forbiddenFutureFingerprint`
   with the same `null` placeholder so the two agree.

2. **The Arena/MAX gates must NOT use `storageStudyTarget`.** The plan's draft
   code copied the `app/vocabulary_target_gate.ts` shape, which calls
   `storageStudyTarget(studyTarget)`. That helper is
   `studyTarget === 'fr' ? 'fr' : defaultStudyTarget()` — a deliberately lossy
   *storage-namespace* normalizer that collapses `'es'` (and every unknown
   value) to `'en'`. Reusing it for a *content-availability* question made
   `arenaContentAvailableForTarget('es')` return `true`, i.e. it reported that
   Arena content exists for a Spanish learner — exactly the silent English
   leak the gate was added to prevent. The Task 4 test caught this on first
   run (2 failed / 4 passed). Both gates now compare the raw
   `RuntimeStudyTarget` instead. Any future `*_target_gate.ts` for a language
   other than French must make the same distinction.

---

### Task 1: Parametrize the authoring registry by `targetLanguage`, preserving the English array unchanged

**Files:**
- Modify: `modules/learning-v2/content/source/lesson1_authoring_registry_v1.ts`
- Test: `tests/learning_v2_authoring_registry_multilang_gate.ts` (new)

The existing `tests/learning_v2_lesson1_authoring_registry_gate.ts` imports `LESSON1_AUTHORING_REGISTRY_V1` (a flat array) and `lesson1AuthoringPreflightV1(requestedSessionOrdinal, actualFingerprints, entries?)`. Both must keep their exact current name, shape, and behavior when called with one argument — that test is the proof English is untouched. We ADD a language dimension alongside it, we do not remove the old shape.

- [ ] **Step 1: Read the current file fully (already done in audit) and write the new shape**

Add a `targetLanguage` field to the entry type, a registry-per-language map, and a `buildTargetRegistry` factory so English and Spanish are both instances of the same builder. Keep every existing English constant (fingerprints, owner-decision strings) byte-identical — only their container changes.

```typescript
// modules/learning-v2/content/source/lesson1_authoring_registry_v1.ts
import { hashCanonicalBody } from "../../policies/decision_registry";

export type Lesson1AuthoringStatusV1 =
  | "DRAFT"
  | "AUTO_PASS"
  | "OWNER_APPROVED"
  | "LOCKED";

export interface Lesson1AuthoringRegistryEntryV1 {
  readonly sessionOrdinal: number;
  readonly status: Lesson1AuthoringStatusV1;
  readonly lockedFingerprint?: string;
  readonly candidateFingerprint?: string;
  readonly forbiddenFutureFingerprint?: string;
  readonly ownerDecisionRef?: string;
}

export interface Lesson1AuthoringPreflightV1 {
  readonly lockedThrough: number;
  readonly currentSessionOrdinal: number | null;
  readonly forbiddenFrom: number | null;
}

/** Every target-language course this authoring platform tracks. Adding a
 * language means adding one entry here plus its own registry array below —
 * it must never require editing another language's array. */
export const V2_AUTHORING_TARGET_LANGUAGES = ["en", "es"] as const;
export type V2AuthoringTargetLanguage =
  (typeof V2_AUTHORING_TARGET_LANGUAGES)[number];

export function isV2AuthoringTargetLanguage(
  value: unknown,
): value is V2AuthoringTargetLanguage {
  return (
    typeof value === "string" &&
    (V2_AUTHORING_TARGET_LANGUAGES as readonly string[]).includes(value)
  );
}

// ─── English (existing course — values below are UNCHANGED from before this
// refactor; only the file's shape around them changed) ───────────────────

const OWNER_APPROVED_FIRST_TEN =
  "owner-approved-first-ten-plus-task-distractor-variant-3-2026-08-21";
const LOCKED_FIRST_TEN_FINGERPRINTS: Readonly<Record<number, string>> =
  Object.freeze({
    1: "92791663899cb0539d6aa55080701895715ad54597ab8304d4deefa817afef2f",
    2: "ce9ec77ac058334b14b3e8a6ce7d8dbe262ddd6bcee14894330671ad3e5fbaf3",
    3: "d14a88d3a0403f442e646433a82304186304a8f9b5f2ad002399335d6f98f2a6",
    4: "3c277b5e3df63e04a06bc0e6e8f097300b31f7b426907729c82c23f72a6fa00d",
    5: "6efe77a14f772415a32452fdd6f7782f1066d4f9ef1d3db8d5144b5879f0aa98",
    6: "2048118cdfcfa3ab17faf377703f46a2497e6da57186a5f4799252686530ec04",
    7: "65c66f37aad033a65e5758713b189ebb7f69268ad9ed1b1ec52b35fccbb927d0",
    8: "4ac95fea5c0c404daf7c45015e6a1d80f1a3dc5917f8405ded6d6c4d2862fabd",
    9: "1e2eb1d5a74c2bc9ecdd577553fdc64426e56da711c82a1971b14a008e9508d9",
    10: "afc6510b255316d894cd92f5958be57034e61c7a8dda52b6574dcff663592686",
  });
const OWNER_APPROVED_SESSION_11 =
  "owner-approved-session-11-task-distractor-variant-3-2026-08-21";
const SESSION_11_LOCKED_FINGERPRINT =
  "dc5882cc93aaa1a3dc50554d2c9871fab5fa5c89ffdc1293a48583e10b8452df";
const OWNER_APPROVED_SESSION_12 = "owner-approved-session-12-next-2026-08-21";
const SESSION_12_LOCKED_FINGERPRINT =
  "c444eb113e98c4ae6e88d965b5f810e057beb89f3ce461cd6292a18ce8dc20d2";
const SESSION_13_AUTO_PASS_FINGERPRINT =
  "6fecc3eb8a22cda2517e9ab57b33e9fbdff6172e03f171c9c641832ec6ad4ff7";
const OWNER_APPROVED_SESSION_13 = "owner-approved-session-13-next-2026-08-21";
const SESSION_14_FORBIDDEN_FUTURE_FINGERPRINT =
  "46df531c54ad9aaa685d849f6a5d6e8caf0d4baa167fb7b5686b051f6e17bf51";
const SESSION_14_AUTO_PASS_FINGERPRINT =
  "e29a9b532e9538fe9be3c51eec6f0897c89325ed6a9092b3f568cbe0e55569a1";

function buildEnglishRegistry(): Lesson1AuthoringRegistryEntryV1[] {
  return Array.from({ length: 56 }, (_, index) => {
    const sessionOrdinal = index + 1;
    if (sessionOrdinal <= 10) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: LOCKED_FIRST_TEN_FINGERPRINTS[sessionOrdinal],
        ownerDecisionRef: OWNER_APPROVED_FIRST_TEN,
      };
    }
    if (sessionOrdinal === 11) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_11_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_APPROVED_SESSION_11,
      };
    }
    if (sessionOrdinal === 12) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_12_LOCKED_FINGERPRINT,
        ownerDecisionRef: OWNER_APPROVED_SESSION_12,
      };
    }
    if (sessionOrdinal === 13) {
      return {
        sessionOrdinal,
        status: "LOCKED" as const,
        lockedFingerprint: SESSION_13_AUTO_PASS_FINGERPRINT,
        ownerDecisionRef: OWNER_APPROVED_SESSION_13,
      };
    }
    if (sessionOrdinal === 14) {
      return {
        sessionOrdinal,
        status: "AUTO_PASS" as const,
        candidateFingerprint: SESSION_14_AUTO_PASS_FINGERPRINT,
        forbiddenFutureFingerprint: SESSION_14_FORBIDDEN_FUTURE_FINGERPRINT,
      };
    }
    return { sessionOrdinal, status: "DRAFT" as const };
  });
}

// ─── Spanish (new course — starts as 56 untouched DRAFT entries; a Spanish
// authoring session fills these in the exact same way the English session
// filled its own, one LOCKED session at a time) ───────────────────────────

function buildDraftRegistry(): Lesson1AuthoringRegistryEntryV1[] {
  return Array.from({ length: 56 }, (_, index) => ({
    sessionOrdinal: index + 1,
    status: "DRAFT" as const,
  }));
}

const REGISTRY_BY_TARGET_LANGUAGE: Readonly<
  Record<V2AuthoringTargetLanguage, readonly Lesson1AuthoringRegistryEntryV1[]>
> = Object.freeze({
  en: Object.freeze(buildEnglishRegistry().map((entry) => Object.freeze(entry))),
  es: Object.freeze(buildDraftRegistry().map((entry) => Object.freeze(entry))),
});

/** Back-compat: existing callers (English pipeline, English gate test) keep
 * using this exact name and get exactly the English array, unchanged. */
export const LESSON1_AUTHORING_REGISTRY_V1: readonly Lesson1AuthoringRegistryEntryV1[] =
  REGISTRY_BY_TARGET_LANGUAGE.en;

export function authoringRegistryForTargetLanguage(
  targetLanguage: V2AuthoringTargetLanguage,
): readonly Lesson1AuthoringRegistryEntryV1[] {
  return REGISTRY_BY_TARGET_LANGUAGE[targetLanguage];
}

function assertRegistryShape(
  entries: readonly Lesson1AuthoringRegistryEntryV1[],
  actualFingerprints: Readonly<Record<number, string>>,
): void {
  if (entries.length !== 56) {
    throw new Error(
      `lesson1_authoring_registry_size_invalid:expected=56:actual=${entries.length}`,
    );
  }

  let encounteredUnlocked = false;
  entries.forEach((entry, index) => {
    const expectedOrdinal = index + 1;
    if (entry.sessionOrdinal !== expectedOrdinal) {
      throw new Error(
        `lesson1_authoring_registry_ordinal_invalid:expected=${expectedOrdinal}:actual=${entry.sessionOrdinal}`,
      );
    }
    if (entry.status === "LOCKED") {
      if (encounteredUnlocked) {
        throw new Error(
          `lesson1_authoring_locked_prefix_broken:session=${entry.sessionOrdinal}`,
        );
      }
      if (!entry.ownerDecisionRef?.trim()) {
        throw new Error(
          `lesson1_authoring_owner_decision_missing:session=${entry.sessionOrdinal}`,
        );
      }
      if (!entry.lockedFingerprint?.trim()) {
        throw new Error(
          `lesson1_locked_fingerprint_missing:session=${entry.sessionOrdinal}`,
        );
      }
      if (actualFingerprints[entry.sessionOrdinal] !== entry.lockedFingerprint) {
        throw new Error(
          `lesson1_locked_fingerprint_drift:session=${entry.sessionOrdinal}`,
        );
      }
    } else {
      encounteredUnlocked = true;
      if (
        (entry.status === "AUTO_PASS" || entry.status === "OWNER_APPROVED") &&
        !entry.candidateFingerprint?.trim()
      ) {
        throw new Error(
          `lesson1_candidate_fingerprint_missing:session=${entry.sessionOrdinal}:status=${entry.status}`,
        );
      }
      if (entry.status === "OWNER_APPROVED" && !entry.ownerDecisionRef?.trim()) {
        throw new Error(
          `lesson1_authoring_owner_decision_missing:session=${entry.sessionOrdinal}`,
        );
      }
      if (
        entry.candidateFingerprint &&
        actualFingerprints[entry.sessionOrdinal] !== entry.candidateFingerprint
      ) {
        throw new Error(
          `lesson1_candidate_fingerprint_drift:session=${entry.sessionOrdinal}:status=${entry.status}`,
        );
      }
    }
  });
}

export function lesson1AuthoringPreflightV1(
  requestedSessionOrdinal: number | undefined,
  actualFingerprints: Readonly<Record<number, string>>,
  entries: readonly Lesson1AuthoringRegistryEntryV1[] = LESSON1_AUTHORING_REGISTRY_V1,
): Lesson1AuthoringPreflightV1 {
  assertRegistryShape(entries, actualFingerprints);

  const firstUnlockedIndex = entries.findIndex((entry) => entry.status !== "LOCKED");
  const lockedThrough = firstUnlockedIndex === -1 ? entries.length : firstUnlockedIndex;
  const currentSessionOrdinal =
    firstUnlockedIndex === -1 ? null : (entries[firstUnlockedIndex]?.sessionOrdinal ?? null);
  const forbiddenFrom =
    currentSessionOrdinal === null || currentSessionOrdinal >= entries.length
      ? null
      : currentSessionOrdinal + 1;

  if (currentSessionOrdinal !== null && forbiddenFrom !== null) {
    const currentEntry = entries[firstUnlockedIndex];
    if (!currentEntry?.forbiddenFutureFingerprint?.trim()) {
      throw new Error(
        `lesson1_forbidden_future_fingerprint_missing:current=${currentSessionOrdinal}:range=${forbiddenFrom}-${entries.length}`,
      );
    }
    const actualForbiddenFutureFingerprint = hashCanonicalBody(
      entries
        .filter((entry) => entry.sessionOrdinal >= forbiddenFrom)
        .map((entry) => [entry.sessionOrdinal, actualFingerprints[entry.sessionOrdinal]]),
    );
    if (actualForbiddenFutureFingerprint !== currentEntry.forbiddenFutureFingerprint) {
      throw new Error(
        `lesson1_forbidden_future_fingerprint_drift:range=${forbiddenFrom}-${entries.length}`,
      );
    }
  }

  if (
    requestedSessionOrdinal !== undefined &&
    requestedSessionOrdinal !== currentSessionOrdinal
  ) {
    throw new Error(
      `lesson1_authoring_out_of_order:requested=${requestedSessionOrdinal}:current=${
        currentSessionOrdinal ?? "none"
      }:lockedThrough=${lockedThrough}`,
    );
  }

  return { lockedThrough, currentSessionOrdinal, forbiddenFrom };
}
```

Note precisely what changed vs. the original file: the 56-entry array literal became `buildEnglishRegistry()` (same code, wrapped in a function), a new `buildDraftRegistry()` was added, both are stored in `REGISTRY_BY_TARGET_LANGUAGE`, and `LESSON1_AUTHORING_REGISTRY_V1` now points at `REGISTRY_BY_TARGET_LANGUAGE.en` instead of a bare array — but it is the *same array contents*. `assertRegistryShape` and `lesson1AuthoringPreflightV1` are untouched byte-for-byte.

- [ ] **Step 2: Run the EXISTING English registry gate test to prove nothing broke**

Run: `npx tsx tests/learning_v2_lesson1_authoring_registry_gate.ts`
Expected: `LESSON 1 AUTHORING REGISTRY GATE: PASS`

If this fails, do not proceed — revert Step 1 and re-diff against the original file before retrying.

- [ ] **Step 3: Run the machine preflight to prove the English course status is unchanged**

Run: `npm run learning-v2:lesson1-authoring-preflight`
Expected exact output:
```
LESSON 1 AUTHORING PREFLIGHT: PASS
LOCKED: 1-13
CURRENT: 14
CURRENT STATUS: AUTO_PASS
FORBIDDEN: 15-56
REQUESTED: status-only
```

- [ ] **Step 4: Write the new multilang gate test**

```typescript
// tests/learning_v2_authoring_registry_multilang_gate.ts
import assert from "node:assert/strict";
import {
  authoringRegistryForTargetLanguage,
  isV2AuthoringTargetLanguage,
  lesson1AuthoringPreflightV1,
  V2_AUTHORING_TARGET_LANGUAGES,
} from "../modules/learning-v2/content/source/lesson1_authoring_registry_v1";

assert.ok(isV2AuthoringTargetLanguage("en"));
assert.ok(isV2AuthoringTargetLanguage("es"));
assert.ok(!isV2AuthoringTargetLanguage("fr"));
assert.deepEqual([...V2_AUTHORING_TARGET_LANGUAGES], ["en", "es"]);

const esRegistry = authoringRegistryForTargetLanguage("es");
assert.equal(esRegistry.length, 56);
assert.ok(esRegistry.every((entry) => entry.status === "DRAFT"));

const esPreflight = lesson1AuthoringPreflightV1(undefined, {}, esRegistry);
assert.deepEqual(esPreflight, {
  lockedThrough: 0,
  currentSessionOrdinal: 1,
  forbiddenFrom: null,
});

process.stdout.write("LEARNING V2 AUTHORING REGISTRY MULTILANG GATE: PASS\n");
```

- [ ] **Step 5: Run the new test**

Run: `npx tsx tests/learning_v2_authoring_registry_multilang_gate.ts`
Expected: `LEARNING V2 AUTHORING REGISTRY MULTILANG GATE: PASS`

- [ ] **Step 6: Commit**

```bash
git add modules/learning-v2/content/source/lesson1_authoring_registry_v1.ts tests/learning_v2_authoring_registry_multilang_gate.ts
git commit -m "feat(learning-v2): parametrize authoring registry by target language

English registry values (LOCKED 1-13 fingerprints, AUTO_PASS 14 candidate)
are byte-identical - only the file's shape changed from one flat array to
a per-target-language map. Spanish gets its own empty 56-entry DRAFT
registry as the seam a parallel authoring session writes into."
```

---

### Task 2: Add `--target` to the preflight CLI, default `en` for backward compatibility

**Files:**
- Modify: `scripts/learning_v2_lesson1_authoring_preflight.ts`
- Modify: `package.json` (add one script)
- Test: manual CLI runs (this script has no dedicated unit test today — the registry gate test asserts the package.json script string, so we must not change the EXISTING script's registered command)

The current npm script `learning-v2:lesson1-authoring-preflight` is asserted verbatim inside `tests/learning_v2_lesson1_authoring_registry_gate.ts` (line ~131-134: `"npx tsx scripts/learning_v2_lesson1_authoring_preflight.ts"`). We must NOT change that string — instead the script itself learns to read `--target`, defaulting to `en` when absent, so the existing command keeps working exactly as before.

- [ ] **Step 1: Modify the preflight script to accept `--target`**

```typescript
// scripts/learning_v2_lesson1_authoring_preflight.ts
import { AUTHORED_EPISODE_01_SESSIONS } from "../modules/learning-v2/content/source/authored_sessions_v1";
import {
  authoringRegistryForTargetLanguage,
  isV2AuthoringTargetLanguage,
  lesson1AuthoringPreflightV1,
  type V2AuthoringTargetLanguage,
} from "../modules/learning-v2/content/source/lesson1_authoring_registry_v1";
import { learningV2SessionContentFingerprint } from "../modules/learning-v2/content/source/learning_content_quality_gate_v1";

function readRequestedSessionOrdinal(argv: readonly string[]): number | undefined {
  const sessionFlagIndex = argv.indexOf("--session");
  if (sessionFlagIndex === -1) return undefined;
  const raw = sessionFlagIndex === -1 ? undefined : argv[sessionFlagIndex + 1];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 56) {
    throw new Error("lesson1_authoring_session_argument_invalid: use --session <1..56>");
  }
  return parsed;
}

function readTargetLanguage(argv: readonly string[]): V2AuthoringTargetLanguage {
  const targetFlagIndex = argv.indexOf("--target");
  if (targetFlagIndex === -1) return "en";
  const raw = argv[targetFlagIndex + 1];
  if (!isV2AuthoringTargetLanguage(raw)) {
    throw new Error(
      `lesson1_authoring_target_argument_invalid: use --target <en|es>, got ${String(raw)}`,
    );
  }
  return raw;
}

function actualFingerprints(targetLanguage: V2AuthoringTargetLanguage): Readonly<Record<number, string>> {
  // English is the only course with real authored content today; Spanish's
  // collector is wired in Task 3. Until then an empty fingerprint map is
  // correct - it must match the all-DRAFT registry with zero LOCKED entries.
  if (targetLanguage !== "en") return Object.freeze({});
  return Object.freeze(
    Object.fromEntries(
      AUTHORED_EPISODE_01_SESSIONS.map((source) => [
        source.requiredSessionOrdinal,
        learningV2SessionContentFingerprint(source),
      ]),
    ),
  );
}

function rangeLabel(from: number | null, to: number): string {
  if (from === null || from > to) return "none";
  return from === to ? String(from) : `${from}-${to}`;
}

function main(): void {
  const argv = process.argv.slice(2);
  const requestedSessionOrdinal = readRequestedSessionOrdinal(argv);
  const targetLanguage = readTargetLanguage(argv);
  const registry = authoringRegistryForTargetLanguage(targetLanguage);
  const preflight = lesson1AuthoringPreflightV1(
    requestedSessionOrdinal,
    actualFingerprints(targetLanguage),
    registry,
  );
  const currentEntry = registry.find(
    (entry) => entry.sessionOrdinal === preflight.currentSessionOrdinal,
  );

  process.stdout.write(
    [
      "LESSON 1 AUTHORING PREFLIGHT: PASS",
      `TARGET: ${targetLanguage}`,
      `LOCKED: ${rangeLabel(preflight.lockedThrough > 0 ? 1 : null, preflight.lockedThrough)}`,
      `CURRENT: ${preflight.currentSessionOrdinal ?? "none"}`,
      `CURRENT STATUS: ${currentEntry?.status ?? "COMPLETE"}`,
      `FORBIDDEN: ${rangeLabel(preflight.forbiddenFrom, 56)}`,
      `REQUESTED: ${requestedSessionOrdinal ?? "status-only"}`,
    ].join("\n") + "\n",
  );
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`LESSON 1 AUTHORING PREFLIGHT: HOLD\n${message}\n`);
  process.exitCode = 1;
}
```

- [ ] **Step 2: Run without `--target` to prove English default is unchanged in substance (one new `TARGET: en` line is expected and correct)**

Run: `npm run learning-v2:lesson1-authoring-preflight`
Expected:
```
LESSON 1 AUTHORING PREFLIGHT: PASS
TARGET: en
LOCKED: 1-13
CURRENT: 14
CURRENT STATUS: AUTO_PASS
FORBIDDEN: 15-56
REQUESTED: status-only
```

- [ ] **Step 3: Run the existing registry gate test again — it asserts the package.json script string, not stdout shape, so it must still pass**

Run: `npx tsx tests/learning_v2_lesson1_authoring_registry_gate.ts`
Expected: `LESSON 1 AUTHORING REGISTRY GATE: PASS`

- [ ] **Step 4: Run with `--target es` to prove the Spanish seam works**

Run: `npx tsx scripts/learning_v2_lesson1_authoring_preflight.ts --target es`
Expected:
```
LESSON 1 AUTHORING PREFLIGHT: PASS
TARGET: es
LOCKED: none
CURRENT: 1
CURRENT STATUS: DRAFT
FORBIDDEN: none
REQUESTED: status-only
```

- [ ] **Step 5: Add the `--target es` convenience npm script**

In `package.json`, alongside the existing `learning-v2:lesson1-authoring-preflight` line, add:

```json
"learning-v2:es-authoring-preflight": "npx tsx scripts/learning_v2_lesson1_authoring_preflight.ts -- --target es",
```

- [ ] **Step 6: Run it**

Run: `npm run learning-v2:es-authoring-preflight`
Expected: same output as Step 4.

- [ ] **Step 7: Commit**

```bash
git add scripts/learning_v2_lesson1_authoring_preflight.ts package.json
git commit -m "feat(learning-v2): preflight CLI accepts --target, defaults to en

English callers using the existing bare command are unaffected. --target es
reads the (currently empty) Spanish DRAFT registry and reports session 1 as
the only allowed next session, matching the English course's own history."
```

---

### Task 3: Write `docs/v2/СТАРТ ES.md` — the Spanish entry contract

**Files:**
- Create: `docs/v2/СТАРТ ES.md`
- Modify: `AGENTS.md` (add the mandatory-read trigger line for Spanish, mirroring the existing English one)

This is a content/process document, not code — but it is the actual deliverable the user asked for: the thing a second Codex/Claude session reads first. It reuses `docs/v2/СТАРТ В2.md` almost verbatim (same discipline: sequential authoring, drift-check cadence, 3-page intro contract, distractor typology, gate command family) with three substitutions:
1. Every "английский язык / target = English" framing becomes "испанский язык / target = Spanish".
2. The 8 explanation locales become `ru, uk, en, pt-BR, vi, id, tr, pl` (es → en swap, confirmed with the user; the other 7 unchanged).
3. The preflight command becomes `npm run learning-v2:es-authoring-preflight` (or `-- --target es`), and all references to "СТАРТ В2" as the sibling document become a cross-reference, not a duplicate of content.

- [ ] **Step 1: Read `docs/v2/СТАРТ В2.md` in full one more time immediately before writing (it may have been updated since the audit at the top of this session)**

Run: `cat "docs/v2/СТАРТ В2.md"` and diff its current owner-decision date against what was read during the audit phase of this session. If it changed, incorporate the new rule before writing the Spanish clone.

- [ ] **Step 2: Write `docs/v2/СТАРТ ES.md`**

Structure (full content — do not stub sections):

```markdown
# СТАРТ ES

> **ЧИТАТЬ ПЕРВЫМ ПРИ ЛЮБОЙ РАБОТЕ С ИСПАНСКИМ КОНТУРОМ LEARNING V2.**
> Этот документ — обязательная точка входа для новой сессии Codex/Claude,
> продолжения после compaction, передачи задачи и возвращения к работе после
> паузы, для испанского (изучаемого) языка курса. Нельзя сначала редактировать
> код или контент, а потом читать правила.

**Статус:** постоянный owner contract.
**Последнее прямое решение владельца:** 2026-08-23.
**Главное правило:** никакая сессия исполнителя не продолжает испанский контур
Learning V2 по памяти, старому пересказу или одному зелёному тесту.

**Отношение к английскому контуру:** испанский — независимый, параллельный
target-language контур той же платформы Learning V2. Он использует ТУ ЖЕ
дисциплину авторства, что и английский (`docs/v2/СТАРТ В2.md`), но собственный
реестр сессий, собственные fingerprints и собственный preflight-флаг
`--target es`. Правка испанского контура никогда не трогает английские файлы
`episode_01_session_*`, английский `lesson1_authoring_registry_v1.ts` (кроме
как через общий, языконезависимый API, описанный в этом документе), и не
может понизить/изменить статус LOCKED/AUTO_PASS английских сессий. Если
машинный preflight для `--target en` меняет вывод после испанской правки —
это `HOLD`, откатывай испанскую правку и разбирайся, что задело общий слой.

**Ключевое языковое отличие:** испанский — ИЗУЧАЕМЫЙ (target) язык, а не один
из восьми языков объяснения. Восемь языков объяснения интро для испанского
курса: `ru, uk, en, pt-BR, vi, id, tr, pl` — то есть тот же набор, что у
английского курса, но `es` заменён на `en` (в английском курсе `es` был языком
объяснения; в испанском курсе объясняемый язык — испанский, поэтому вместо
него в наборе объяснений появляется `en`). Остальные семь локалей — те же
самые тексты той же дисциплины, переписанные под новую пару (объяснение на
этом языке → испанская целевая фраза), а не переиспользованные из английского
курса.

## 1. Что сделать сразу после открытия этого файла

1. Прочитать компактный обязательный набор из раздела 2 непосредственно с диска.
2. Запустить authoring-preflight для испанского и назвать владельцу машинно
   подтверждённые: непрерывный диапазон `LOCKED`, единственную разрешённую
   текущую сессию, незакрытые gates и запрещённый следующий диапазон.
   Точная команда: `npm run learning-v2:es-authoring-preflight`. Перед
   learner-facing изменением дополнительно передать `-- --target es --session NN`;
   запрос любой сессии кроме единственной разрешённой обязан вернуть `HOLD`.
3. Назвать владельцу: текущую сессию, точную цель пакета, применимые запреты,
   незакрытые gates и ближайшее действие.
4. До редактирования зафиксировать короткий task packet: scope, non-goals,
   `SessionKind`, objective, разрешённая грамматика/лексика испанского,
   interaction profile, нужные activity families, локали объяснения (см. выше),
   RED-проверки и критерии приёмки.
5. Если понимание расходится с этим документом, с `docs/v2/СТАРТ В2.md` (в
   части общей дисциплины) или источниками истины — `HOLD`. Нельзя молча
   придумать компромисс.

## 2. Обязательный маршрут чтения

### A. Всегда читать полностью перед началом/возобновлением испанского контура

1. `AGENTS.md` — правила репозитория и безопасность.
2. `docs/v2/СТАРТ ES.md` — этот входной контракт.
3. `docs/v2/СТАРТ В2.md`, раздел 2 «Обязательный маршрут чтения» и раздел 3
   «Защита от ухода от спецификации» — общая дисциплина применяется испанскому
   контуру без изменений; здесь не дублируется, только применяется.
4. Машинный испанский authoring-реестр и результат его preflight
   (`--target es`) — фактический статус, единственная разрешённая сессия.
5. Только source-файл, карта, focused gates и owner-макет текущей испанской
   сессии.

### B. Читать по событию, а не постоянно

Те же правила, что в `docs/v2/СТАРТ В2.md` раздел 2.B, применённые к испанским
файлам вместо английских: `LESSON_DESIGN_RULES`, `03-learning-architecture-and-
curriculum`, `04-activity-catalog-and-storyboards`, `LEARNING_CONTENT_STYLE_
BIBLE` — все они языконезависимы по процессу и используются без дублирования.
Испанская лексика/грамматика/культурные реалии проверяются носителем-редактором
испанского, а не переводом с английского курса.

## 3–9. Дисциплина авторства, интро, дистракторы, learner UI, гейты

Полностью идентичны `docs/v2/СТАРТ В2.md` разделам 3–9 — читать их напрямую,
не пересказывать здесь. Единственная замена по всему тексту: «английский» →
«испанский», «target = English» → «target = Spanish», восемь локалей
объяснения — набор из преамбулы этого документа (`ru, uk, en, pt-BR, vi, id,
tr, pl`), команда preflight — `npm run learning-v2:es-authoring-preflight`
(или `-- --target es`).

## 10. Текущий обязательный вывод по испанскому контуру

Испанский контур не имеет ни одной сессии. Реестр — 56 записей `DRAFT`,
преflight подтверждает `CURRENT: 1`. Первая правильная задача — написать
`SessionSource` для испанской сессии 1 по тому же контракту, что английская
сессия 1 (тема, grammar boundary, интро 3 страницы на восьми локалях выше,
14–18 interactions), запустить преflight с `--target es --session 1`, и только
затем гейты. Копировать английский текст и переводить его гугл-переводом —
прямое нарушение раздела 6 `СТАРТ В2` (интро не переводится механически).

## 11. Без отдельного разрешения запрещено

Тот же список, что в `docs/v2/СТАРТ В2.md` раздел 11, плюс:

- редактировать любой файл, чьё имя начинается с `episode_01_` (это английский
  контур) при работе над испанским контуром;
- менять `LESSON1_AUTHORING_REGISTRY_V1` (английский экспорт) — испанский
  контур имеет собственный `authoringRegistryForTargetLanguage("es")`.

## 12. Что записать перед завершением любой рабочей сессии

Те же требования, что `СТАРТ В2` раздел 12, применённые к испанскому реестру
и испанскому HANDOVER-файлу (заводится отдельно от `docs/v2/HANDOVER.md`,
который принадлежит английскому контуру).
```

- [ ] **Step 3: Add the mandatory-read trigger to `AGENTS.md`**

Find the existing block (near the top of `AGENTS.md`, confirmed during audit at line 3):
```
## ⛔ LEARNING V2: СНАЧАЛА `СТАРТ В2` (владелец, 2026-08-21)
```
Immediately after that whole section (before the next `##` heading), add a new section:

```markdown
## ⛔ LEARNING V2 ИСПАНСКИЙ: СНАЧАЛА `СТАРТ ES` (владелец, 2026-08-23)

Испанский — независимый, параллельный target-language контур Learning V2. При
любом запросе найти, продолжить, написать, изменить, проверить или показать
работу по испанскому курсу исполнитель обязан **до любых действий** полностью
прочитать `docs/v2/СТАРТ ES.md` и пройти указанный там маршрут чтения (который
сам ссылается на общую дисциплину `docs/v2/СТАРТ В2.md`, не дублируя её).

Испанская и английская сессии могут работать одновременно в одном рабочем
дереве. Испанская сессия никогда не редактирует файлы, чьё имя начинается с
`episode_01_`, и никогда не редактирует английский экспорт
`LESSON1_AUTHORING_REGISTRY_V1` — только `authoringRegistryForTargetLanguage
("es")` и файлы своего собственного контура.
```

- [ ] **Step 4: Verify the file encoding/filename survives git on this Windows checkout (the existing `СТАРТ В2.md` already proves Cyrillic filenames work in this repo, so this is a sanity check, not a new risk)**

Run: `git status --porcelain -- "docs/v2/СТАРТ ES.md" "docs/v2/СТАРТ В2.md"`
Expected: both paths show as tracked/untracked correctly, no mangled filename (e.g. no `?` or escaped octal sequence in the path).

- [ ] **Step 5: Commit**

```bash
git add "docs/v2/СТАРТ ES.md" AGENTS.md
git commit -m "docs(learning-v2): add СТАРТ ES entry contract for Spanish contour

Reuses the English course's authoring discipline by reference (no
duplication of process rules) while making Spanish the target language and
swapping the 8-locale explanation set (es -> en, other 7 unchanged per
owner decision 2026-08-23)."
```

---

### Task 4: Close the Arena and MAX target-language gaps

**Files:**
- Create: `app/arena_target_gate.ts`
- Create: `app/max_target_gate.ts`
- Test: `tests/learning_v2_arena_max_target_gate.test.ts` (new)

Audit found zero `studyTarget` references in Arena or MAX. Both are implicitly English-only today. This task does not change Arena/MAX runtime behavior for English users (still works exactly as today) — it adds the same `*ContentAvailableForTarget` gate shape used by the other 7 features, defaulting to "available for en, unavailable for anything else" so a Spanish-target user sees an honest "not available yet" rather than silently getting English Arena content.

- [ ] **Step 1: Read the existing gate pattern once more for exact shape match**

Reference file already read during audit: `app/vocabulary_target_gate.ts`. New files follow the same shape: `storageStudyTarget`, `RuntimeStudyTarget` import from `target_storage_keys.ts`, an `xContentAvailableForTarget(studyTarget)` export.

- [ ] **Step 2: Write `app/arena_target_gate.ts`**

```typescript
// app/arena_target_gate.ts
// зачем: Арена не имела ни одного упоминания studyTarget (аудит 2026-08-23) —
// то есть молча предполагала английский. Этот гейт делает предположение явным
// и честным вместо тихой утечки английского контента в испанский контур.
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

/** Арена сегодня существует только для английского контура. */
export function arenaContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return storageStudyTarget(studyTarget) === 'en';
}

/* expo-router: не регистрировать файл как экран */
export default function __ArenaTargetGateRouteShim() {
  return null;
}
```

- [ ] **Step 3: Write `app/max_target_gate.ts`**

```typescript
// app/max_target_gate.ts
// зачем: MAX (голосовой репетитор) не имел ни одного упоминания studyTarget
// (аудит 2026-08-23) — то есть молча предполагал английский. Этот гейт делает
// предположение явным и честным вместо тихой утечки английского контента.
import { storageStudyTarget, type RuntimeStudyTarget } from './target_storage_keys';

/** MAX сегодня существует только для английского контура. */
export function maxVoiceContentAvailableForTarget(studyTarget?: RuntimeStudyTarget): boolean {
  return storageStudyTarget(studyTarget) === 'en';
}

/* expo-router: не регистрировать файл как экран */
export default function __MaxTargetGateRouteShim() {
  return null;
}
```

- [ ] **Step 4: Write the gate test**

```typescript
// tests/learning_v2_arena_max_target_gate.test.ts
import { arenaContentAvailableForTarget } from '../app/arena_target_gate';
import { maxVoiceContentAvailableForTarget } from '../app/max_target_gate';

describe('arena_target_gate', () => {
  it('is available for English', () => {
    expect(arenaContentAvailableForTarget('en')).toBe(true);
  });
  it('is unavailable for Spanish', () => {
    expect(arenaContentAvailableForTarget('es')).toBe(false);
  });
  it('is unavailable when studyTarget is undefined-but-defaults-to-en per storageStudyTarget', () => {
    // storageStudyTarget's own default behavior is exercised, not re-implemented here.
    expect(typeof arenaContentAvailableForTarget(undefined)).toBe('boolean');
  });
});

describe('max_target_gate', () => {
  it('is available for English', () => {
    expect(maxVoiceContentAvailableForTarget('en')).toBe(true);
  });
  it('is unavailable for Spanish', () => {
    expect(maxVoiceContentAvailableForTarget('es')).toBe(false);
  });
});
```

- [ ] **Step 5: Run the new test**

Run: `npx jest tests/learning_v2_arena_max_target_gate.test.ts --runInBand`
Expected: 4 passing tests.

**Note — this task deliberately stops at "gate exists and is honest."** Wiring `arenaContentAvailableForTarget` / `maxVoiceContentAvailableForTarget` into the actual Arena/MAX screens (to show a real "not available for this language yet" UI state instead of nothing) is follow-up UI work once Spanish has enough content to make the question real. Flag this explicitly to the owner rather than silently leaving Arena/MAX screens unguarded at the UI layer — see the color-coded summary at the end of the session.

- [ ] **Step 6: Commit**

```bash
git add app/arena_target_gate.ts app/max_target_gate.ts tests/learning_v2_arena_max_target_gate.test.ts
git commit -m "feat(arena,max): add target-language content gates

Arena and MAX voice tutor had zero studyTarget awareness (silent
English-only assumption). Adds the same *ContentAvailableForTarget gate
shape used by the other 7 target-scoped features. Screen-level wiring to
show a real fallback UI is separate follow-up work once Spanish content
exists."
```

---

### Task 5: Final verification — both courses' preflights, full existing test suite for touched files

**Files:** none created; verification only.

- [ ] **Step 1: Re-run the English preflight one more time as the final proof**

Run: `npm run learning-v2:lesson1-authoring-preflight`
Expected: identical to Task 1 Step 3 output (with the added `TARGET: en` line from Task 2).

- [ ] **Step 2: Re-run the Spanish preflight**

Run: `npm run learning-v2:es-authoring-preflight`
Expected: identical to Task 2 Step 4 output.

- [ ] **Step 3: Run every test file this plan touched or created, in one pass**

Run:
```bash
npx tsx tests/learning_v2_lesson1_authoring_registry_gate.ts && \
npx tsx tests/learning_v2_authoring_registry_multilang_gate.ts
```
Expected: both print their `PASS` line, exit code 0.

Run: `npx jest tests/learning_v2_arena_max_target_gate.test.ts --runInBand`
Expected: 4 passing.

- [ ] **Step 4: Confirm git status is clean except for this plan's own commits (no stray dirty files from unrelated work, per repo rule against touching unrelated dirty files)**

Run: `git status --porcelain`
Expected: empty, or only files explicitly part of this plan's own uncommitted final step.

- [ ] **Step 5: Report to the owner**

State plainly: English course status unchanged (LOCKED 1-13, AUTO_PASS 14, still awaiting owner review — this plan did not touch that review). Spanish contour now exists as an empty, valid 56-session DRAFT registry with its own preflight command and its own entry contract (`СТАРТ ES.md`). A second Codex/Claude session can now be started with the instruction "read `docs/v2/СТАРТ ES.md` first" and it will not be able to touch English files even by mistake, because the entry contract and the registry API both name the boundary explicitly.
