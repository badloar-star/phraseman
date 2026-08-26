# Learning V2 Curriculum Graph and Orchestration Gates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` for sequential execution. Use `subagent-driven-development` only after the owner explicitly authorizes delegated coding; this repository otherwise requires one writer in the shared dirty worktree.

**Goal:** Turn the approved 32 × 56 pedagogical orchestration into a versioned, machine-checked curriculum skeleton that blocks learner-facing authoring when prerequisites, chapter roles, interaction profiles, review edges, or assessment probes are invalid.

**Architecture:** Add one language-independent orchestration contract beside the existing Learning V2 contracts, one pure validator beside the existing coverage validator, and one explicit Lesson 1 skeleton that augments—not duplicates—the current 56-session map. A standalone fail-closed gate validates the skeleton before the existing authoring preflight. This phase does not write sessions 2–56, change runtime screens, implement the adaptive scheduler, or alter Spanish content.

**Tech Stack:** TypeScript, Node `assert/strict`, existing `tsx` gate pattern, existing Learning V2 curriculum/session-map contracts, narrow Jest tests where useful.

---

## Scope and invariants

This is Phase B1 of the approved orchestration specification in
`docs/v2/LEARNING_V2_1792_SESSION_PEDAGOGICAL_ORCHESTRATION.ru.md`.

It must establish these invariants before future authoring:

- 32 lessons × 7 chapters × 8 sessions remain the fixed course topology.
- Each lesson has one can-do boundary, one grammar boundary, prerequisites, seven chapter outcomes, and a final transfer.
- Chapter positions have fixed roles: encounter, notice, guided application, retrieval, variation, near transfer/repair, voice, checkpoint.
- Voice, recall and checkpoint packets introduce no new lexicon.
- Every packet names its primary learning operation before any mode is assigned.
- A profile contains all seven approved mode-native families and its counts match the approved hypothesis table.
- Every independent probe uses a distinct ref from training; every core objective has a pinned delayed probe.
- Prerequisites and review edges point backwards and form a DAG.
- Future packets are metadata only; they do not authorize learner-facing intros, phrases, distractors, feedback or locale content.

Non-goals for this plan:

- no rewrite of `episode_01_session_01_mode_native_v1.ts`;
- no authoring of sessions 2–56;
- no runtime renderer, audio, microphone, animation or phone-preview work;
- no adaptive scheduling algorithm or telemetry collection;
- no Spanish file changes;
- no commit, push or deploy without a separate explicit owner command.

## Task 1: Freeze the orchestration vocabulary and interaction profiles

**Files:**

- Create: `modules/learning-v2/contracts/pedagogical_orchestration_v1.ts`
- Create: `tests/learning_v2_pedagogical_orchestration_contract_v1.test.ts`

### Step 1: Write the failing contract test

The test must import the seven approved families and assert exact profile counts,
totals, and inclusion of every family:

```ts
import {
  LEARNING_V2_NATIVE_MODE_FAMILIES_V1,
  LEARNING_V2_ORCHESTRATION_PROFILES_V1,
} from '../modules/learning-v2/contracts/pedagogical_orchestration_v1';

describe('Learning V2 pedagogical orchestration contract v1', () => {
  it('keeps the approved seven native families in one canonical order', () => {
    expect(LEARNING_V2_NATIVE_MODE_FAMILIES_V1).toEqual([
      'listen_choose',
      'sound_contrast',
      'phrase_builder',
      'listen_build_dictation',
      'context_gap_grammar',
      'speed_match',
      'scripted_repeat_compare',
    ]);
  });

  it.each([
    ['rapid_words_then_phrases', 20],
    ['standard_development', 16],
    ['recall_near_transfer', 16],
    ['voice_heavy', 12],
    ['checkpoint', 16],
  ] as const)('%s has the approved total', (profile, total) => {
    const counts = LEARNING_V2_ORCHESTRATION_PROFILES_V1[profile];
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(total);
    expect(Object.values(counts).every((count) => count > 0)).toBe(true);
  });
});
```

### Step 2: Run RED with the shared heavy-process semaphore

```bash
bash .claude/semaphore/slot.sh acquire "jest orchestration contract RED"
npx jest tests/learning_v2_pedagogical_orchestration_contract_v1.test.ts --runInBand
bash .claude/semaphore/slot.sh release
```

Expected: FAIL because `pedagogical_orchestration_v1.ts` does not exist. If the
test command crashes, release the slot before diagnosing.

### Step 3: Implement the minimum versioned contract

The file must import `V2ActivityFamily` rather than inventing a second activity
family type:

```ts
import type { V2ActivityFamily } from './activity';

export const LEARNING_V2_PEDAGOGICAL_ORCHESTRATION_SCHEMA_V1 =
  'learning-v2-pedagogical-orchestration.v1' as const;

export const LEARNING_V2_NATIVE_MODE_FAMILIES_V1 = Object.freeze([
  'listen_choose',
  'sound_contrast',
  'phrase_builder',
  'listen_build_dictation',
  'context_gap_grammar',
  'speed_match',
  'scripted_repeat_compare',
] as const satisfies readonly V2ActivityFamily[]);

export type LearningV2NativeModeFamilyV1 =
  (typeof LEARNING_V2_NATIVE_MODE_FAMILIES_V1)[number];

export type LearningV2InteractionProfileKeyV1 =
  | 'rapid_words_then_phrases'
  | 'standard_development'
  | 'recall_near_transfer'
  | 'voice_heavy'
  | 'checkpoint';

export const LEARNING_V2_ORCHESTRATION_PROFILES_V1 = Object.freeze({
  rapid_words_then_phrases: Object.freeze({
    listen_choose: 4, sound_contrast: 3, phrase_builder: 4,
    listen_build_dictation: 2, context_gap_grammar: 3,
    speed_match: 2, scripted_repeat_compare: 2,
  }),
  standard_development: Object.freeze({
    listen_choose: 2, sound_contrast: 1, phrase_builder: 3,
    listen_build_dictation: 3, context_gap_grammar: 3,
    speed_match: 2, scripted_repeat_compare: 2,
  }),
  recall_near_transfer: Object.freeze({
    listen_choose: 2, sound_contrast: 1, phrase_builder: 2,
    listen_build_dictation: 3, context_gap_grammar: 3,
    speed_match: 3, scripted_repeat_compare: 2,
  }),
  voice_heavy: Object.freeze({
    listen_choose: 1, sound_contrast: 2, phrase_builder: 1,
    listen_build_dictation: 2, context_gap_grammar: 1,
    speed_match: 1, scripted_repeat_compare: 4,
  }),
  checkpoint: Object.freeze({
    listen_choose: 2, sound_contrast: 2, phrase_builder: 2,
    listen_build_dictation: 2, context_gap_grammar: 3,
    speed_match: 2, scripted_repeat_compare: 3,
  }),
} as const satisfies Readonly<Record<
  LearningV2InteractionProfileKeyV1,
  Readonly<Record<LearningV2NativeModeFamilyV1, number>>
>>);
```

Also define the closed unions used by later packets:

```ts
export type LearningV2ChapterSessionRoleV1 =
  | 'encounter_lexical_seed'
  | 'notice_discriminate'
  | 'guided_application'
  | 'retrieval'
  | 'variation'
  | 'near_transfer_repair'
  | 'voice'
  | 'checkpoint';

export type LearningV2LearningFunctionV1 =
  | 'encounter' | 'recognize' | 'discriminate' | 'retrieve_meaning'
  | 'build_form' | 'assemble' | 'comprehend' | 'pronounce'
  | 'apply' | 'transfer' | 'independent_check';

export type LearningV2PriorStateV1 =
  | 'unseen' | 'encountered' | 'recognized' | 'retrieved'
  | 'applied' | 'independently_demonstrated' | 'due_for_review';
```

### Step 4: Run GREEN

Run the same narrow Jest command under the semaphore. Expected: one suite PASS.

### Step 5: Inspect without committing

```bash
git diff --check -- modules/learning-v2/contracts/pedagogical_orchestration_v1.ts tests/learning_v2_pedagogical_orchestration_contract_v1.test.ts
```

Do not commit unless the owner separately authorizes it.

## Task 2: Define the lesson/chapter/session packet schema

**Files:**

- Modify: `modules/learning-v2/contracts/pedagogical_orchestration_v1.ts`
- Modify: `tests/learning_v2_pedagogical_orchestration_contract_v1.test.ts`

### Step 1: Add RED compile-time fixtures and runtime assertions

Create one valid packet fixture and malformed fixtures for: missing grammar
boundary, missing delayed probe, future prerequisite, and new lexicon in voice.
The valid fixture must use explicit values:

```ts
const VALID_PACKET = {
  schemaVersion: 'learning-v2-session-packet.v1',
  lessonOrdinal: 1,
  chapterOrdinal: 1,
  sessionOrdinal: 1,
  chapterPosition: 1,
  role: 'encounter_lexical_seed',
  primaryCanDo: 'Say where I am and whether I am ready.',
  grammarBoundary: ['copula_be', 'first_person_singular'],
  prerequisiteObjectiveStates: [],
  newLexiconIds: ['en:here', 'en:ready'],
  newLexiconRationale: 'Needed immediately for the first useful I am statements.',
  retrievalTargetIds: [],
  sessionKind: 'words_then_phrases',
  interactionProfile: 'rapid_words_then_phrases',
  leadingLearningFunctions: ['encounter', 'recognize', 'assemble'],
  leadingModes: ['listen_choose', 'phrase_builder'],
  independentProbeRef: 'en:l01:s01:independent:location-ready',
  delayedProbeRefs: ['en:l01:s09:delayed:location-ready'],
  prohibitedFutureMaterial: ['present_simple', 'past_simple', 'future_will'],
} as const;
```

### Step 2: Add the packet types

Add these types to the contract:

```ts
export type LearningV2PrerequisiteObjectiveStateV1 = Readonly<{
  objectiveId: string;
  minimumState: Exclude<LearningV2PriorStateV1, 'unseen' | 'due_for_review'>;
  establishedBySessionOrdinal: number;
}>;

export type LearningV2SessionPacketV1 = Readonly<{
  schemaVersion: 'learning-v2-session-packet.v1';
  lessonOrdinal: number;
  chapterOrdinal: number;
  sessionOrdinal: number;
  chapterPosition: number;
  role: LearningV2ChapterSessionRoleV1;
  primaryCanDo: string;
  grammarBoundary: readonly string[];
  prerequisiteObjectiveStates: readonly LearningV2PrerequisiteObjectiveStateV1[];
  newLexiconIds: readonly string[];
  newLexiconRationale: string;
  retrievalTargetIds: readonly string[];
  sessionKind: import('../content/source/episode_01_session_map_v1').SessionKind;
  interactionProfile: LearningV2InteractionProfileKeyV1;
  leadingLearningFunctions: readonly LearningV2LearningFunctionV1[];
  leadingModes: readonly LearningV2NativeModeFamilyV1[];
  independentProbeRef: string;
  delayedProbeRefs: readonly string[];
  prohibitedFutureMaterial: readonly string[];
}>;
```

Avoid the inline import if it creates a contract→content dependency cycle. If
the cycle appears, move `SessionKind` into this contract and re-export it from
`episode_01_session_map_v1.ts`; preserve its existing public import path.

### Step 3: Define chapter-position constants

```ts
export const LEARNING_V2_CHAPTER_ROLE_BY_POSITION_V1 = Object.freeze({
  1: 'encounter_lexical_seed',
  2: 'notice_discriminate',
  3: 'guided_application',
  4: 'retrieval',
  5: 'variation',
  6: 'near_transfer_repair',
  7: 'voice',
  8: 'checkpoint',
} as const);
```

### Step 4: Run the narrow contract test and inspect the dependency graph

Run the Task 1 Jest command. Then run:

```bash
rg -n "SessionKind|pedagogical_orchestration_v1" modules/learning-v2/contracts modules/learning-v2/content/source/episode_01_session_map_v1.ts
```

Expected: PASS and no circular runtime import.

## Task 3: Build a pure fail-closed packet and graph validator

**Files:**

- Create: `modules/learning-v2/content/pedagogical_orchestration_validator_v1.ts`
- Create: `tests/learning_v2_pedagogical_orchestration_validator_v1.test.ts`

### Step 1: Write table-driven RED tests

The validator test must cover at least these mutations, one finding code each:

- duplicate or missing ordinal;
- chapter/position mismatch;
- wrong role for chapter position;
- profile total/count mismatch;
- profile omits one approved family;
- voice/checkpoint introduces lexicon;
- prerequisite points to current/future session;
- delayed probe is absent or equals the independent probe;
- session 56 introduces new material;
- graph cycle;
- empty can-do, grammar boundary or leading operation;
- leading mode has no declared learning function.

Use stable finding codes, not prose matching:

```ts
expect(findings.map((finding) => finding.code)).toContain(
  'session_packet_prerequisite_not_prior',
);
```

### Step 2: Run RED

```bash
bash .claude/semaphore/slot.sh acquire "jest orchestration validator RED"
npx jest tests/learning_v2_pedagogical_orchestration_validator_v1.test.ts --runInBand
bash .claude/semaphore/slot.sh release
```

Expected: FAIL because the validator module is missing.

### Step 3: Implement a pure validator with deterministic findings

Export:

```ts
export type LearningV2OrchestrationFindingCodeV1 =
  | 'session_packet_count_invalid'
  | 'session_packet_ordinal_invalid'
  | 'session_packet_chapter_position_invalid'
  | 'session_packet_role_invalid'
  | 'session_packet_profile_invalid'
  | 'session_packet_mode_coverage_invalid'
  | 'session_packet_new_lexicon_forbidden'
  | 'session_packet_prerequisite_not_prior'
  | 'session_packet_prerequisite_cycle'
  | 'session_packet_independent_probe_missing'
  | 'session_packet_delayed_probe_missing'
  | 'session_packet_probe_not_distinct'
  | 'session_packet_final_transfer_new_material'
  | 'session_packet_learning_function_missing'
  | 'session_packet_boundary_missing';

export type LearningV2OrchestrationFindingV1 = Readonly<{
  code: LearningV2OrchestrationFindingCodeV1;
  sessionOrdinal: number | null;
  detail: string;
}>;

export function validateLearningV2LessonSkeletonV1(
  packets: readonly LearningV2SessionPacketV1[],
): readonly LearningV2OrchestrationFindingV1[];
```

The implementation must:

- never mutate or sort the caller's array in place;
- return findings sorted by `sessionOrdinal`, then `code`, then `detail`;
- compute `chapterOrdinal = floor((sessionOrdinal - 1) / 8) + 1` and
  `chapterPosition = ((sessionOrdinal - 1) % 8) + 1`;
- verify profile counts against the frozen contract, not a copied table;
- verify backward edges before cycle detection;
- treat empty/whitespace IDs as missing;
- fail closed on an unknown role, profile, family or learning function.

### Step 4: Run GREEN and mutation proof

Run the same narrow Jest test. Expected: PASS. Temporarily change one profile
count in the test fixture and prove that the gate reports
`session_packet_profile_invalid`; revert only that deliberate mutation with
`apply_patch`.

## Task 4: Author the explicit Lesson 1 curriculum skeleton

**Files:**

- Create: `modules/learning-v2/content/source/lesson1_curriculum_skeleton_v1.ts`
- Create: `tests/learning_v2_lesson1_curriculum_skeleton_gate.ts`
- Read only: `modules/learning-v2/content/source/episode_01_session_map_v1.ts`
- Read only: `docs/v2/03-learning-architecture-and-curriculum.md`

### Step 1: Write the standalone RED gate

The gate must assert:

```ts
assert.equal(LESSON1_CURRICULUM_SKELETON_V1.length, 56);
assert.deepEqual(
  LESSON1_CURRICULUM_SKELETON_V1.map((packet) => packet.sessionOrdinal),
  Array.from({ length: 56 }, (_, index) => index + 1),
);
assert.deepEqual(validateLearningV2LessonSkeletonV1(
  LESSON1_CURRICULUM_SKELETON_V1,
), []);
```

Also cross-check every packet against the existing map:

- same ordinal;
- same `SessionKind`;
- `builtOn` represented as prerequisite objective states;
- `recalls` represented in retrieval/review metadata;
- session 56 is a final checkpoint and introduces no lexicon/material.

### Step 2: Run RED as a light `tsx` gate

```bash
npx tsx tests/learning_v2_lesson1_curriculum_skeleton_gate.ts
```

Expected: FAIL because the skeleton file does not exist. This direct gate does
not need the heavy semaphore.

### Step 3: Author all 56 metadata packets explicitly

Create an immutable export:

```ts
export const LESSON1_CURRICULUM_SKELETON_V1:
  readonly LearningV2SessionPacketV1[] = Object.freeze([
  SESSION_01_PACKET,
  SESSION_02_PACKET,
  SESSION_03_PACKET,
  SESSION_04_PACKET,
  SESSION_05_PACKET,
  SESSION_06_PACKET,
  SESSION_07_PACKET,
  SESSION_08_PACKET,
  SESSION_09_PACKET,
  SESSION_10_PACKET,
  SESSION_11_PACKET,
  SESSION_12_PACKET,
  SESSION_13_PACKET,
  SESSION_14_PACKET,
  SESSION_15_PACKET,
  SESSION_16_PACKET,
  SESSION_17_PACKET,
  SESSION_18_PACKET,
  SESSION_19_PACKET,
  SESSION_20_PACKET,
  SESSION_21_PACKET,
  SESSION_22_PACKET,
  SESSION_23_PACKET,
  SESSION_24_PACKET,
  SESSION_25_PACKET,
  SESSION_26_PACKET,
  SESSION_27_PACKET,
  SESSION_28_PACKET,
  SESSION_29_PACKET,
  SESSION_30_PACKET,
  SESSION_31_PACKET,
  SESSION_32_PACKET,
  SESSION_33_PACKET,
  SESSION_34_PACKET,
  SESSION_35_PACKET,
  SESSION_36_PACKET,
  SESSION_37_PACKET,
  SESSION_38_PACKET,
  SESSION_39_PACKET,
  SESSION_40_PACKET,
  SESSION_41_PACKET,
  SESSION_42_PACKET,
  SESSION_43_PACKET,
  SESSION_44_PACKET,
  SESSION_45_PACKET,
  SESSION_46_PACKET,
  SESSION_47_PACKET,
  SESSION_48_PACKET,
  SESSION_49_PACKET,
  SESSION_50_PACKET,
  SESSION_51_PACKET,
  SESSION_52_PACKET,
  SESSION_53_PACKET,
  SESSION_54_PACKET,
  SESSION_55_PACKET,
  SESSION_56_PACKET,
]);
```

Do not derive pedagogical fields from ordinal-only templates. Shared builders may
fill structural coordinates, schema version and profile counts, but every
`primaryCanDo`, boundary, prerequisite state, lexicon rationale, retrieval set,
leading function/mode and probe ref must be editorially explicit.

This task writes metadata only. It must not import or populate
`AUTHORED_EPISODE_01_SESSIONS`.

### Step 4: Review the 56 packets chapter by chapter

Run the gate after each chapter (8 packets) by allowing a temporary expected
count parameter local to the test, then restore the final hard requirement of
56 before GREEN. After chapter 7, run:

```bash
npx tsx tests/learning_v2_lesson1_curriculum_skeleton_gate.ts
```

Expected: `LESSON 1 CURRICULUM SKELETON GATE: PASS`.

### Step 5: Check that no learner-facing content leaked in

The gate must reject keys named `intro`, `phrase`, `distractor`, `feedback`,
`locales`, `translation`, `audioRef` or `modePayload` anywhere in the skeleton.
This makes the metadata/content boundary executable.

## Task 5: Add prerequisite, review-edge and coverage integration

**Files:**

- Modify: `modules/learning-v2/content/pedagogical_orchestration_validator_v1.ts`
- Modify: `modules/learning-v2/content/objective_coverage_matrix_v1.ts`
- Modify: `tests/learning_v2_pedagogical_orchestration_validator_v1.test.ts`
- Create: `tests/learning_v2_lesson1_orchestration_coverage_gate.ts`

### Step 1: Write RED tests for graph completeness

Assert that:

- every objective introduced in Lesson 1 has an independent probe;
- every core objective has at least one later delayed probe;
- every delayed probe points to a packet later than the introduction;
- every `recalls` edge in `EPISODE_01_SESSION_MAP_V1` is represented;
- no objective is orphaned after its first encounter;
- recognition, retrieval/application and independent evidence are represented
  by distinct session/interaction refs.

### Step 2: Extend the existing coverage input instead of forking it

Add optional orchestration evidence fields to
`LearningV2CoverageSessionInputV1`:

```ts
readonly primaryObjectiveId?: string;
readonly prerequisiteObjectiveIds?: readonly string[];
readonly independentProbeRef?: string;
readonly delayedProbeRefs?: readonly string[];
```

Keep existing callers source-compatible. Add new findings only when the new
fields are supplied, so unrelated current gates do not change behavior.

### Step 3: Implement the bridge

Export a pure adapter from the Lesson 1 skeleton file:

```ts
export function lesson1CoverageInputsFromSkeletonV1():
  readonly LearningV2CoverageSessionInputV1[];
```

It must project metadata only and must not inspect learner-facing content.

### Step 4: Run the two focused gates

```bash
npx tsx tests/learning_v2_lesson1_curriculum_skeleton_gate.ts
npx tsx tests/learning_v2_lesson1_orchestration_coverage_gate.ts
```

Expected: both PASS with zero findings.

## Task 6: Expose one fail-closed CLI gate and put it before authoring

**Files:**

- Create: `scripts/learning_v2_pedagogical_orchestration_gate.ts`
- Modify: `scripts/learning_v2_lesson1_authoring_preflight.ts`
- Modify: `package.json`
- Create: `tests/learning_v2_pedagogical_orchestration_cli_gate.ts`

### Step 1: Write RED CLI tests

The CLI test must verify exact status lines for valid Lesson 1 and non-zero exit
with sorted finding codes for an injected invalid fixture. Expected valid output:

```text
LEARNING V2 PEDAGOGICAL ORCHESTRATION GATE: PASS
SCOPE: lesson-01
PACKETS: 56
CHAPTERS: 7
FINDINGS: 0
```

### Step 2: Implement the CLI

The script imports the canonical skeleton and validator, prints only the short
summary above on PASS, and prints `HOLD` plus stable finding lines on failure.
It must not scan the repository or materialize session content.

### Step 3: Add package scripts

Add:

```json
"learning-v2:pedagogical-orchestration-gate": "npx tsx scripts/learning_v2_pedagogical_orchestration_gate.ts"
```

Prepend `npm run learning-v2:pedagogical-orchestration-gate && ` to the current
value of `learning-v2:lesson1-authoring-gate`; preserve the remainder of that
long command byte-for-byte so none of its existing focused gates disappears.

Do not add the English skeleton gate to `learning-v2:es-authoring-gate`.

### Step 4: Make preflight fail closed before registry authorization

Refactor the CLI logic into a pure assertion exported by the validator:

```ts
export function assertLearningV2LessonSkeletonV1(
  packets: readonly LearningV2SessionPacketV1[],
): void;
```

Call it in `learning_v2_lesson1_authoring_preflight.ts` only when
`targetLanguage === 'en'`, before the existing call to
`lesson1AuthoringPreflightV1`. A broken
skeleton must output `LESSON 1 AUTHORING PREFLIGHT: HOLD`; it must never be
possible to bypass it with `--session`.

### Step 5: Run focused GREEN checks

```bash
npm run learning-v2:pedagogical-orchestration-gate
npm run learning-v2:lesson1-authoring-preflight -- --target en --session 1
npm run learning-v2:es-authoring-preflight
```

Expected:

- orchestration gate PASS, 56 packets, 0 findings;
- English preflight remains PASS with CURRENT 1 / DRAFT / FORBIDDEN 2–56;
- Spanish preflight output is unchanged.

## Task 7: Ratchet against template choreography without rewriting content

**Files:**

- Create: `tests/learning_v2_orchestration_template_ratcheting_gate.ts`
- Read only: `modules/learning-v2/content/source/lesson1_session_choreography_v1.ts`
- Read only: `tests/learning_v2_lesson1_session_choreography.test.ts`

### Step 1: Capture the approved target and current debt separately

The gate must compare materialized choreography only for authored/current
sessions. For future forbidden sessions, it validates metadata packets and does
not build content. This avoids turning the skeleton into authorization to author.

For session 1, report stable mismatches between the approved profile and the
current materialized family counts. Do not silently mutate the approved profile
to match the old template.

### Step 2: Add a debt receipt rather than a false PASS

If session 1 still violates the approved seven-family profile, write a compact
ignored receipt under:

```text
.codex-tmp/learning-v2-orchestration/session-01-profile-findings.json
```

The gate exits non-zero until the later Session 1 mode-native implementation
plan repairs it. The receipt contains only finding codes, expected counts and
actual counts—no generated content or bulky logs.

### Step 3: Prove forbidden sessions are not materialized

Spy or dependency-test that the ratchet never imports
`AUTHORED_EPISODE_01_SESSIONS` for ordinals 2–56. Expected: metadata validation
can PASS while content authoring remains forbidden.

## Task 8: Documentation, handover and final verification

**Files:**

- Modify: `docs/v2/СТАРТ В2.md`
- Modify: `docs/v2/HANDOVER.md`
- Modify: `docs/v2/README.md`
- Modify: `docs/v2/LEARNING_V2_1792_SESSION_PEDAGOGICAL_ORCHESTRATION.ru.md`

### Step 1: Document executable ownership

Add exact links from the normative specification to:

- orchestration contract;
- Lesson 1 skeleton;
- pure validator;
- standalone CLI gate;
- package command;
- ignored debt receipt path.

State clearly that the contract freezes the hypothesis but does not turn it
into proven efficacy; only delayed-retention pilot data may revise profile
weights under a new version.

### Step 2: Update START V2 route

Add the orchestration spec and executable gate to the mandatory reading route
without duplicating the entire spec. Preserve all current owner rules and
Spanish isolation instructions.

### Step 3: Update HANDOVER truthfully

Record:

- exact files changed;
- commands and decisive PASS/HOLD lines;
- current English registry state;
- unresolved Session 1 materialized-profile debt;
- explicit next plan: Session 1 mode-native choreography/runtime parity;
- explicit prohibition: do not start Session 2.

### Step 4: Run narrow verification

Light gates:

```bash
npm run learning-v2:pedagogical-orchestration-gate
npm run learning-v2:lesson1-authoring-preflight -- --target en --session 1
npm run learning-v2:es-authoring-preflight
npx tsx tests/learning_v2_lesson1_curriculum_skeleton_gate.ts
npx tsx tests/learning_v2_lesson1_orchestration_coverage_gate.ts
```

Focused Jest under one semaphore slot:

```bash
bash .claude/semaphore/slot.sh acquire "jest orchestration final"
npx jest tests/learning_v2_pedagogical_orchestration_contract_v1.test.ts tests/learning_v2_pedagogical_orchestration_validator_v1.test.ts tests/learning_v2_objective_coverage_matrix_v1.test.ts --runInBand
bash .claude/semaphore/slot.sh release
```

Static checks:

```bash
git diff --check -- modules/learning-v2/contracts/pedagogical_orchestration_v1.ts modules/learning-v2/content/pedagogical_orchestration_validator_v1.ts modules/learning-v2/content/source/lesson1_curriculum_skeleton_v1.ts scripts/learning_v2_pedagogical_orchestration_gate.ts tests/learning_v2_pedagogical_orchestration_contract_v1.test.ts tests/learning_v2_pedagogical_orchestration_validator_v1.test.ts tests/learning_v2_lesson1_curriculum_skeleton_gate.ts tests/learning_v2_lesson1_orchestration_coverage_gate.ts tests/learning_v2_pedagogical_orchestration_cli_gate.ts tests/learning_v2_orchestration_template_ratcheting_gate.ts package.json docs/v2/СТАРТ\ В2.md docs/v2/HANDOVER.md docs/v2/README.md docs/v2/LEARNING_V2_1792_SESSION_PEDAGOGICAL_ORCHESTRATION.ru.md
git status --short
```

Expected final state for this phase:

- the skeleton gate passes all 56 Lesson 1 metadata packets;
- English preflight still authorizes only session 1;
- Spanish preflight is unchanged;
- no learner-facing content was created for sessions 2–56;
- any current Session 1 profile mismatch is an explicit HOLD/debt receipt, not
  hidden by weakening the new profile;
- no deploy, commit or push occurred.

## Follow-up implementation plans after this package

These are separate vertical packages and must not be mixed into Phase B1:

1. **Session 1 native choreography and phone parity:** redesign every contact
   under the approved profile, preserve word-first, and verify all seven real
   runtime modes on a phone.
2. **Delayed scheduler and adaptation:** implement fixed review edges plus
   bounded adaptation of spacing, support and difficulty; never adapt the
   curriculum boundary or assessment evidence.
3. **Telemetry and pilot calibration:** measure independent and D+3…D+7
   retention, not completion alone; version profile changes as new hypotheses.
4. **Course-wide skeleton:** repeat the Lesson 1 metadata process for the 31
   remaining lessons only after lesson outcomes, boundaries and prerequisite
   DAG receive owner review.
