# Learning V2 E1 Content Compiler Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate E1 to the owner-approved 32-unit × 12-session architecture and build the multilingual content compiler that turns an approved language profile plus structured content items into twelve required micro-sessions, bounded optional-practice templates and fail-closed QA without conflating farmable access stars with performance or mastery.

**Architecture:** Preserve the 32 existing Episode identities as stable internal unit identities, keep `v2-episode-contract.v1` readable as a legacy/internal artifact, and introduce a versioned twelve-session child artifact plus `v2-episode-contract.v2` for all newly generated units. Add pure, client-safe content contracts under `modules/learning-v2/content`; keep the thirteen-stage Content Factory DAG authoritative; treat the language profile as an immutable prerequisite rather than a new stage. Functions resolve exact refs, run the compiler and QA, and emit artifacts consumed by existing activity/bundle stages. This packet is E1-only and must not rewrite the legacy E1 fixture, Admin UI, production pointers or Kimi files.

**Tech Stack:** TypeScript, Jest, existing Learning V2 canonical contracts, Content Factory pure planning, Content Studio immutable refs and canonical hashing.

---

## Scope and dependency boundary

This is the first of three implementation packets:

1. **This plan:** E1 language/content/session contracts, compiler, QA, optional-practice contract and reward-policy separation.
2. **Later plan:** Admin V2 one-button orchestration, exception review and live device preview.
3. **Later plan:** application map/session UI, dynamic optional speech nodes and accepted Kimi presentation import.

Do not add a fourteenth Content Factory stage kind. The published language profile
is a prerequisite ref. Structured content and compiled session artifacts are
outputs of the existing episode outline/activity-instance path. Do not modify
Rules, indexes, deploy configuration or production pointers in this packet.

The owner confirmed the product duration on 2026-07-22: 32 units × 12 required
sessions, normally 3–5 sessions per day, targets a flexible 12–16 week core
course. Each unit therefore aggregates approximately 30–48 minutes of required
practice; `estimatedMinutes` at unit level must no longer inherit the legacy
single-session E1 value of 12.

## File map

| File | Responsibility |
|---|---|
| `modules/learning-v2/content/language_profile.ts` | Immutable language/script capability body, ref and fail-closed validator. |
| `modules/learning-v2/contracts/session.ts` | Twelve-session unit child contract, zones, card plans and optional-slot separation. |
| `modules/learning-v2/content/content_item.ts` | Language-native phrase/content object and compatibility validator. |
| `modules/learning-v2/content/session_compiler.ts` | Deterministic twelve-session compilation and support-fading policy. |
| `modules/learning-v2/content/optional_practice.ts` | Generic optional-slot capability and selection contract; no UI. |
| `modules/learning-v2/progress/optional_practice_reward.ts` | Versioned diminishing-reward projection with no hard cap and no mastery output. |
| `functions/src/content_factory/v2_content_compilation.ts` | Functions adapter resolving exact refs and invoking pure compiler/QA. |
| `functions/src/content_factory/v2_episode_content_qa.ts` | Blocking quality report for traceability, session cardinality and profile compatibility. |
| `functions/src/content_factory/v2_admin_generation_contract.ts` | Require exact `languageProfileRef` in E1 generation request/fingerprint. |
| `tests/fixtures/learning-v2/content-studio/e1-content-source.json` | E1 source content bank used to produce the v2 twelve-session vertical slice while preserving the legacy v1 fixture. |
| `tests/learning_v2_e1_content_compiler.test.ts` | Root contract/integration proof against canonical `episode-01.valid.json`. |

---

### Task 0: Versioned unit-to-session architecture migration

**Risk:** Cross-contract migration. Assign one `economy-critical` writer and a
fresh read-only `economy-reviewer`. Do not parallelise source edits.

**Files:**
- Create: `modules/learning-v2/contracts/session.ts`
- Modify: `modules/learning-v2/contracts/identities.ts`
- Modify: `modules/learning-v2/contracts/episode.ts`
- Modify: `modules/learning-v2/contracts/validation.ts`
- Create: `tests/support/learning_v2_session_builders.ts`
- Create: `tests/learning_v2_session_contract.test.ts`
- Modify: `tests/learning_v2_episode_contract.test.ts`

- [ ] **Step 1: Write RED identity and cardinality tests**

```ts
import {
  validateV2SessionSet,
  type V2SessionSetBody,
} from '../modules/learning-v2/contracts/session';
import {
  buildValidSessionSet,
  buildV2E1,
  readLegacyE1,
} from './support/learning_v2_session_builders';

test('requires exactly twelve ordered required sessions in three zones', () => {
  const value = buildValidSessionSet();
  expect(validateV2SessionSet(value)).toMatchObject({ ok: true });
  expect(value.sessions.map((session) => session.zone)).toEqual([
    'understand', 'understand', 'understand', 'understand',
    'use', 'use', 'use', 'use',
    'master', 'master', 'master', 'master',
  ]);
  expect(validateV2SessionSet({ ...value, sessions: value.sessions.slice(0, 11) })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['session_set_required_count']),
  });
});

test('keeps optional practice outside the twelve required sessions', () => {
  const value = buildValidSessionSet();
  expect(value.optionalPracticeSlots.length).toBeLessThanOrEqual(2);
  expect(value.optionalPracticeSlots.every((slot) =>
    slot.requiredForProgress === false && slot.canWriteMastery === false,
  )).toBe(true);
});

test('preserves v1 validation and requires a session-set ref for v2', () => {
  expect(validateV2EpisodeContract(readLegacyE1()).ok).toBe(true);
  expect(validateV2EpisodeContract({ ...buildV2E1(), sessionSetRef: undefined })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining([expect.objectContaining({ code: 'episode_session_set_ref_required' })]),
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npx jest --runTestsByPath tests/learning_v2_session_contract.test.ts tests/learning_v2_episode_contract.test.ts --no-cache --runInBand`

Expected: FAIL because SessionId, SessionSet and Episode v2 do not exist.

- [ ] **Step 3: Add exact session identities and child artifact**

```ts
export interface V2SessionSetRef {
  readonly episodeId: EpisodeId;
  readonly version: number;
  readonly contentHash: string;
}

export interface V2SessionCardPlan {
  readonly cardId: string;
  readonly contentItemId: string;
  readonly objectiveId: string;
  readonly family: V2ActivityFamily;
  readonly learningFunction: 'notice' | 'comprehend' | 'retrieve' | 'discriminate' | 'assemble' | 'pronounce' | 'respond' | 'transfer' | 'review';
  readonly support: LearningSupportLevel;
  readonly promptId: string;
  readonly promptNovelty: 'trained' | 'varied' | 'novel';
}

export interface V2RequiredSessionDefinition {
  readonly sessionId: SessionId;
  readonly ordinal: number;
  readonly zone: 'understand' | 'use' | 'master';
  readonly targetSeconds: number;
  readonly cards: readonly V2SessionCardPlan[];
}

export interface V2SessionSetBody {
  readonly schemaVersion: 'v2-session-set.v1';
  readonly episodeId: EpisodeId;
  readonly version: number;
  readonly sessions: readonly V2RequiredSessionDefinition[];
  readonly optionalPracticeSlots: readonly V2OptionalPracticeSlot[];
}
```

Validate exact fields, exactly twelve sessions, ordinals 1–12, four sessions per
zone, target duration 150–240 seconds, 7–9 cards, 3–4 distinct families and at
most two optional slots. The child body contains no hash of itself and no gate,
review or approval receipt backrefs.

`tests/support/learning_v2_session_builders.ts` must return frozen, fully valid
objects through exported `buildValidSessionSet`, `buildV2E1` and `readLegacyE1`
functions. `readLegacyE1` reads `episode-01.valid.json`; builders never modify
that fixture.

- [ ] **Step 4: Add Episode v2 as an explicit union without mutating v1**

Keep the existing v1 interface and validator path byte-compatible. Add a v2
variant that pins `sessionSetRef`, declares aggregate `estimatedMinutes` between
30 and 48, and keeps the existing objective, evidence, fallback and checkpoint
semantics. Never silently reinterpret a v1 body as v2.

- [ ] **Step 5: Run GREEN and legacy regression**

Run: `npx jest --runTestsByPath tests/learning_v2_session_contract.test.ts tests/learning_v2_episode_contract.test.ts tests/learning_v2_attempt_cardinality.test.ts tests/learning_v2_evidence_contract.test.ts --no-cache --runInBand`

Expected: PASS; legacy E1 remains readable and new E1 v2 fails closed without an exact session-set ref.

- [ ] **Step 6: Commit**

```powershell
git add modules/learning-v2/contracts/session.ts modules/learning-v2/contracts/identities.ts modules/learning-v2/contracts/episode.ts modules/learning-v2/contracts/validation.ts tests/support/learning_v2_session_builders.ts tests/learning_v2_session_contract.test.ts tests/learning_v2_episode_contract.test.ts
git commit -m "feat: version V2 units with twelve sessions"
```

---

### Task 0A: Separate farmable practice access stars from performance and mastery

**Files:**
- Modify: `modules/learning-v2/contracts/stars.ts`
- Modify: `tests/learning_v2_gate_policy.test.ts`
- Create: `tests/learning_v2_star_source_separation.test.ts`

- [ ] **Step 1: Write RED source-separation tests**

```ts
test('allows optional practice to add cumulative access without changing local performance', () => {
  const projection = applyAccessStarDelta({
    previousTotal: 20,
    delta: 3,
    source: 'optional_practice',
    idempotencyKey: 'account-1:quick-speak:attempt-1',
  });
  expect(projection).toEqual({ nextTotal: 23, delta: 3, source: 'optional_practice' });
  expect(projection).not.toHaveProperty('performanceStarsDelta');
  expect(projection).not.toHaveProperty('mastered');
});

test('does not let farmed access satisfy the local performance minimum', () => {
  expect(evaluateV2Gate({
    alreadyUnlocked: false,
    grandfathered: false,
    requiredLoopsComplete: true,
    capabilityFallbackComplete: true,
    priorEpisodePerformanceEarned: 0,
    localMinimum: 14,
    cumulativeAccessEarned: 999,
    requiredCumulativeAccess: 20,
    purchasedAccessAppliedToThisGate: 0,
    checkpointDecision: 'not_required',
  })).toEqual({ allowed: false, reason: 'local_performance' });
});
```

- [ ] **Step 2: Verify RED**

Run: `npx jest --runTestsByPath tests/learning_v2_star_source_separation.test.ts tests/learning_v2_gate_policy.test.ts --no-cache --runInBand`

Expected: FAIL because an idempotent source-labelled access-star projection does not exist.

- [ ] **Step 3: Implement additive access-star sources**

Add `performance`, `optional_practice` and `purchase` source labels. Only
`performance` may update the best-by-slot projection. Optional practice may add
to cumulative access through the later versioned diminishing reward policy but
cannot satisfy `localPerformanceMinimum`, checkpoint evidence or mastery.

- [ ] **Step 4: Run GREEN**

Run: `npx jest --runTestsByPath tests/learning_v2_star_source_separation.test.ts tests/learning_v2_gate_policy.test.ts tests/learning_v2_learning_evidence_policy.test.ts --no-cache --runInBand`

Expected: PASS; farmable access, local performance and mastery remain separate.

- [ ] **Step 5: Commit**

```powershell
git add modules/learning-v2/contracts/stars.ts tests/learning_v2_gate_policy.test.ts tests/learning_v2_star_source_separation.test.ts
git commit -m "feat: separate V2 practice star sources"
```

---

### Task 1: Immutable multilingual LanguageProfile contract

**Files:**
- Create: `modules/learning-v2/content/language_profile.ts`
- Create: `tests/learning_v2_language_profile.test.ts`

- [ ] **Step 1: Write the failing contract tests**

```ts
import {
  validateV2LanguageProfile,
  type V2LanguageProfileBody,
} from '../modules/learning-v2/content/language_profile';

const latinProfile: V2LanguageProfileBody = {
  schemaVersion: 'v2-language-profile-body.v1',
  profileId: 'english-general-a1',
  version: 1,
  targetLanguage: 'en',
  script: {
    system: 'latin',
    direction: 'ltr',
    tokenization: 'space_delimited',
    joiningBehavior: 'none',
  },
  grammar: {
    dominantWordOrders: ['svo'],
    morphology: 'mixed',
    grammaticalFeatures: ['person', 'number', 'tense'],
    registerFeatures: ['neutral', 'formal', 'informal'],
  },
  speech: {
    lexicalTone: false,
    stressSystem: 'lexical',
    ttsLocales: ['en-US', 'en-GB'],
    sttLocales: ['en-US', 'en-GB'],
  },
  scriptCurricula: [],
  supportedActivityFamilies: [
    'listen_choose',
    'sound_contrast',
    'phrase_builder',
    'listen_build_dictation',
    'context_gap_grammar',
    'quick_spoken_response',
    'shadowing_prosody',
  ],
};

test('accepts an exact Latin profile and freezes the normalized body', () => {
  const result = validateV2LanguageProfile(latinProfile);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error('profile_expected_valid');
  expect(Object.isFrozen(result.value)).toBe(true);
});

test.each([
  ['hanzi', ['pinyin_tones', 'hanzi_components']],
  ['kana_kanji', ['hiragana', 'katakana', 'kanji_readings']],
  ['hangul', ['jamo_blocks']],
  ['arabic', ['joining_forms', 'diacritics']],
] as const)('requires the matching script curriculum for %s', (system, curricula) => {
  const candidate = {
    ...latinProfile,
    profileId: `${system}-a1`,
    targetLanguage: system === 'hanzi' ? 'zh' : system === 'kana_kanji' ? 'ja' : system === 'hangul' ? 'ko' : 'ar',
    script: {
      ...latinProfile.script,
      system,
      direction: system === 'arabic' ? 'rtl' : 'ltr',
      tokenization: system === 'hanzi' || system === 'kana_kanji' ? 'language_specific' : 'space_delimited',
      joiningBehavior: system === 'arabic' ? 'contextual' : 'none',
    },
    scriptCurricula: curricula,
  };
  expect(validateV2LanguageProfile(candidate).ok).toBe(true);
  expect(validateV2LanguageProfile({ ...candidate, scriptCurricula: [] })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['script_curriculum_required']),
  });
});

test('rejects unknown fields and unsupported activity families', () => {
  expect(validateV2LanguageProfile({ ...latinProfile, hiddenPrompt: 'x' })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['language_profile_unknown_field']),
  });
  expect(validateV2LanguageProfile({
    ...latinProfile,
    supportedActivityFamilies: ['not-a-family'],
  }).ok).toBe(false);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx jest --runTestsByPath tests/learning_v2_language_profile.test.ts --no-cache --runInBand`

Expected: FAIL because `modules/learning-v2/content/language_profile.ts` does not exist.

- [ ] **Step 3: Implement the exact profile body/ref and validator**

```ts
import { V2_ACTIVITY_FAMILIES, type V2ActivityFamily } from '../contracts/activity';

export type V2ScriptSystem = 'latin' | 'cyrillic' | 'greek' | 'hanzi' | 'kana_kanji' | 'hangul' | 'arabic' | 'hebrew' | 'devanagari' | 'thai';
export type V2ScriptCurriculum = 'pinyin_tones' | 'hanzi_components' | 'hiragana' | 'katakana' | 'kanji_readings' | 'jamo_blocks' | 'joining_forms' | 'diacritics';

export interface V2LanguageProfileRef {
  readonly profileId: string;
  readonly version: number;
  readonly contentHash: string;
}

export interface V2LanguageProfileBody {
  readonly schemaVersion: 'v2-language-profile-body.v1';
  readonly profileId: string;
  readonly version: number;
  readonly targetLanguage: string;
  readonly script: {
    readonly system: V2ScriptSystem;
    readonly direction: 'ltr' | 'rtl';
    readonly tokenization: 'space_delimited' | 'language_specific';
    readonly joiningBehavior: 'none' | 'contextual';
  };
  readonly grammar: {
    readonly dominantWordOrders: readonly string[];
    readonly morphology: 'analytic' | 'synthetic' | 'agglutinative' | 'mixed';
    readonly grammaticalFeatures: readonly string[];
    readonly registerFeatures: readonly string[];
  };
  readonly speech: {
    readonly lexicalTone: boolean;
    readonly stressSystem: 'none' | 'fixed' | 'lexical' | 'phrase_level';
    readonly ttsLocales: readonly string[];
    readonly sttLocales: readonly string[];
  };
  readonly scriptCurricula: readonly V2ScriptCurriculum[];
  readonly supportedActivityFamilies: readonly V2ActivityFamily[];
}

export type V2LanguageProfileValidation =
  | { readonly ok: true; readonly value: Readonly<V2LanguageProfileBody> }
  | { readonly ok: false; readonly issues: readonly string[] };

const requiredCurricula: Partial<Record<V2ScriptSystem, readonly V2ScriptCurriculum[]>> = {
  hanzi: ['pinyin_tones', 'hanzi_components'],
  kana_kanji: ['hiragana', 'katakana', 'kanji_readings'],
  hangul: ['jamo_blocks'],
  arabic: ['joining_forms', 'diacritics'],
};

export function validateV2LanguageProfile(value: unknown): V2LanguageProfileValidation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false, issues: ['language_profile_invalid'] };
  const input = value as Record<string, unknown>;
  const keys = ['schemaVersion', 'profileId', 'version', 'targetLanguage', 'script', 'grammar', 'speech', 'scriptCurricula', 'supportedActivityFamilies'];
  const issues: string[] = Object.keys(input).some((key) => !keys.includes(key)) ? ['language_profile_unknown_field'] : [];
  if (input.schemaVersion !== 'v2-language-profile-body.v1') issues.push('language_profile_schema_invalid');
  if (typeof input.profileId !== 'string' || !input.profileId.trim()) issues.push('language_profile_id_required');
  if (!Number.isSafeInteger(input.version) || Number(input.version) < 1) issues.push('language_profile_version_invalid');
  if (typeof input.targetLanguage !== 'string' || !/^[a-z]{2,3}(?:-[A-Z]{2})?$/.test(input.targetLanguage)) issues.push('language_profile_language_invalid');
  const script = input.script as V2LanguageProfileBody['script'];
  const curricula = Array.isArray(input.scriptCurricula) ? input.scriptCurricula : [];
  for (const required of requiredCurricula[script?.system] ?? []) if (!curricula.includes(required)) issues.push('script_curriculum_required');
  const families = Array.isArray(input.supportedActivityFamilies) ? input.supportedActivityFamilies : [];
  if (families.some((family) => !V2_ACTIVITY_FAMILIES.includes(family as V2ActivityFamily))) issues.push('language_profile_activity_family_invalid');
  if (issues.length) return { ok: false, issues: Object.freeze([...new Set(issues)]) };
  return { ok: true, value: Object.freeze(input as unknown as V2LanguageProfileBody) };
}
```

- [ ] **Step 4: Run GREEN and regression contract**

Run: `npx jest --runTestsByPath tests/learning_v2_language_profile.test.ts tests/learning_v2_activity_registry.test.ts --no-cache --runInBand`

Expected: PASS, 0 failed tests.

- [ ] **Step 5: Commit**

```powershell
git add modules/learning-v2/content/language_profile.ts tests/learning_v2_language_profile.test.ts
git commit -m "feat: define V2 language profiles"
```

---

### Task 2: Structured language-native content items

**Files:**
- Create: `modules/learning-v2/content/content_item.ts`
- Create: `tests/learning_v2_content_item.test.ts`

- [ ] **Step 1: Write RED tests for traceability, variants and distractors**

```ts
import { validateV2ContentItem } from '../modules/learning-v2/content/content_item';

const valid = {
  schemaVersion: 'v2-content-item.v1',
  contentItemId: 'e1-introduce-name-01',
  episodeId: 'ep-01',
  intentId: 'introduce_self_name',
  target: { locale: 'en', text: 'I am Anna.', register: 'neutral', region: 'general' },
  learnerMeanings: [{ locale: 'ru', value: 'Я Анна.', sourceHash: 'a'.repeat(64) }],
  acceptedAnswers: ['I am Anna.', "I'm Anna."],
  rejectedAnswers: [{ value: 'I Anna.', reasonCode: 'copula_missing' }],
  linguisticFeatures: ['copula_be', 'first_person_singular'],
  pronunciationTargets: ['stress_anna'],
  prerequisiteContentItemIds: [],
  objectiveIds: ['obj-introduce-self'],
  compatibleFamilies: ['listen_choose', 'phrase_builder', 'quick_spoken_response'],
};

test('accepts one traceable language-native content item', () => {
  expect(validateV2ContentItem(valid)).toMatchObject({ ok: true });
});

test.each([
  ['accepted_answer_duplicate', { acceptedAnswers: ['I am Anna.', ' i am anna. '] }],
  ['content_item_objective_required', { objectiveIds: [] }],
  ['content_item_family_unsupported', { compatibleFamilies: ['describe_scene'] }],
  ['rejected_answer_reason_required', { rejectedAnswers: [{ value: 'I Anna.', reasonCode: '' }] }],
])('rejects %s', (code, change) => {
  expect(validateV2ContentItem({ ...valid, ...change })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining([code]),
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `npx jest --runTestsByPath tests/learning_v2_content_item.test.ts --no-cache --runInBand`

Expected: FAIL because the content-item module is absent.

- [ ] **Step 3: Implement the content-item contract**

Create exact exported types `V2ContentItem`, `V2RejectedAnswer`,
`V2ContentItemValidation` and `validateV2ContentItem`. Reuse
`V2LocalizedContentValue` and `V2ActivityFamily`. Normalise answer comparisons
with `trim().toLocaleLowerCase(locale)` but preserve original display strings.
Reject `describe_scene` because the owner removed situational-image activities
from this direction. Reject empty objectives, unreasoned distractors, duplicate
accepted answers and any family absent from the resolved LanguageProfile.

```ts
export function assertContentItemCompatibleWithProfile(
  item: V2ContentItem,
  profile: V2LanguageProfileBody,
): void {
  if (item.target.locale !== profile.targetLanguage) throw new Error('content_item_language_mismatch');
  const supported = new Set(profile.supportedActivityFamilies);
  if (item.compatibleFamilies.some((family) => !supported.has(family))) {
    throw new Error('content_item_family_unsupported');
  }
}
```

- [ ] **Step 4: Run GREEN**

Run: `npx jest --runTestsByPath tests/learning_v2_content_item.test.ts tests/learning_v2_language_profile.test.ts --no-cache --runInBand`

Expected: PASS, 0 failed tests.

- [ ] **Step 5: Commit**

```powershell
git add modules/learning-v2/content/content_item.ts tests/learning_v2_content_item.test.ts
git commit -m "feat: validate V2 content items"
```

---

### Task 3: Deterministic twelve-session compiler

**Files:**
- Create: `modules/learning-v2/content/session_compiler.ts`
- Create: `tests/learning_v2_session_compiler.test.ts`

- [ ] **Step 1: Write RED tests for the approved unit shape**

```ts
import { compileV2RequiredSessions } from '../modules/learning-v2/content/session_compiler';
import { buildEnglishProfile, buildE1ContentItems } from './support/learning_v2_content_builders';

test('compiles twelve ordered sessions in three zones', () => {
  const result = compileV2RequiredSessions({
    episodeId: 'ep-01',
    canDoOutcomeId: 'obj-introduce-self',
    profile: buildEnglishProfile(),
    items: buildE1ContentItems(),
  });
  expect(result.sessions).toHaveLength(12);
  expect(result.sessions.map((session) => session.zone)).toEqual([
    'understand', 'understand', 'understand', 'understand',
    'use', 'use', 'use', 'use',
    'master', 'master', 'master', 'master',
  ]);
  result.sessions.forEach((session) => {
    expect(session.cards.length).toBeGreaterThanOrEqual(7);
    expect(session.cards.length).toBeLessThanOrEqual(9);
    expect(new Set(session.cards.map((card) => card.family)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(session.cards.map((card) => card.family)).size).toBeLessThanOrEqual(4);
  });
});

test('fades support and ends with independent non-reused prompts', () => {
  const result = compileV2RequiredSessions({
    episodeId: 'ep-01',
    canDoOutcomeId: 'obj-introduce-self',
    profile: buildEnglishProfile(),
    items: buildE1ContentItems(),
  });
  expect(result.sessions[0].support).toBe('model');
  expect(result.sessions[11].support).toBe('none');
  expect(result.sessions[11].cards.every((card) => card.promptNovelty !== 'trained')).toBe(true);
});

test('fails when the bank cannot produce seven traceable cards per session', () => {
  expect(() => compileV2RequiredSessions({
    episodeId: 'ep-01',
    canDoOutcomeId: 'obj-introduce-self',
    profile: buildEnglishProfile(),
    items: buildE1ContentItems().slice(0, 1),
  })).toThrow('session_content_insufficient');
});
```

- [ ] **Step 2: Verify RED**

Run: `npx jest --runTestsByPath tests/learning_v2_session_compiler.test.ts --no-cache --runInBand`

Expected: FAIL because compiler and support builders do not exist.

- [ ] **Step 3: Add focused test builders**

**Files:**
- Create: `tests/support/learning_v2_content_builders.ts`

The builder exports `buildEnglishProfile()` and `buildE1ContentItems()` with at
least eight distinct E1 items and accepted surface variants. It must call the
real validators before returning values; it must not write source or fixtures.

- [ ] **Step 4: Implement the pure compiler**

Use a fixed versioned policy table, not random mode selection:

```ts
const REQUIRED_SESSION_POLICY_V1 = Object.freeze([
  { zone: 'understand', support: 'model', families: ['listen_choose', 'speed_match', 'phrase_builder'] },
  { zone: 'understand', support: 'full_text', families: ['listen_choose', 'sound_contrast', 'phrase_builder'] },
  { zone: 'understand', support: 'full_text', families: ['speed_match', 'phrase_builder', 'context_gap_grammar'] },
  { zone: 'understand', support: 'partial_cue', families: ['listen_choose', 'phrase_builder', 'scripted_repeat_compare'] },
  { zone: 'use', support: 'partial_cue', families: ['phrase_builder', 'context_gap_grammar', 'quick_spoken_response'] },
  { zone: 'use', support: 'partial_cue', families: ['listen_build_dictation', 'phrase_builder', 'shadowing_prosody'] },
  { zone: 'use', support: 'partial_cue', families: ['context_gap_grammar', 'quick_spoken_response', 'listen_choose'] },
  { zone: 'use', support: 'visual_only', families: ['listen_build_dictation', 'quick_spoken_response', 'scripted_dialogue'] },
  { zone: 'master', support: 'visual_only', families: ['quick_spoken_response', 'listen_build_dictation', 'context_gap_grammar'] },
  { zone: 'master', support: 'none', families: ['quick_spoken_response', 'scripted_dialogue', 'listen_build_dictation'] },
  { zone: 'master', support: 'none', families: ['quick_spoken_response', 'scripted_dialogue', 'shadowing_prosody'] },
  { zone: 'master', support: 'none', families: ['quick_spoken_response', 'scripted_dialogue', 'listen_build_dictation'] },
] as const);
```

Resolve each requested family against the profile and content item capability
sets. A language-safe fallback may substitute only another family with the same
learning function. Emit immutable cards with `contentItemId`, `objectiveId`,
`family`, `support`, `promptId` and `promptNovelty`. Fail rather than silently
dropping a required card or objective.

- [ ] **Step 5: Run GREEN and canonical Episode regressions**

Run: `npx jest --runTestsByPath tests/learning_v2_session_compiler.test.ts tests/learning_v2_episode_contract.test.ts --no-cache --runInBand`

Expected: PASS, 0 failed tests.

- [ ] **Step 6: Commit**

```powershell
git add modules/learning-v2/content/session_compiler.ts tests/support/learning_v2_content_builders.ts tests/learning_v2_session_compiler.test.ts
git commit -m "feat: compile V2 required sessions"
```

---

### Task 4: Generic optional-practice slots without UI coupling

**Files:**
- Create: `modules/learning-v2/content/optional_practice.ts`
- Create: `tests/learning_v2_optional_practice.test.ts`

- [ ] **Step 1: Write RED selection tests**

```ts
import { selectOptionalPracticeSlots } from '../modules/learning-v2/content/optional_practice';

test('shows at most two eligible optional nodes and never blocks the unit', () => {
  const result = selectOptionalPracticeSlots({
    episodeId: 'ep-01',
    microphoneAvailable: true,
    networkAvailable: true,
    dueContentItemIds: ['e1-a'],
    mistakeContentItemIds: ['e1-b'],
    personalPlanContentItemIds: ['e1-c'],
    capabilities: [
      { capabilityId: 'quick-speak-v1', family: 'quick_spoken_response', requiresMicrophone: true, requiresNetwork: false, expectedSeconds: 75 },
      { capabilityId: 'echo-rhythm-v1', family: 'shadowing_prosody', requiresMicrophone: true, requiresNetwork: false, expectedSeconds: 90 },
      { capabilityId: 'listen-respond-v1', family: 'scripted_dialogue', requiresMicrophone: true, requiresNetwork: true, expectedSeconds: 120 },
    ],
  });
  expect(result).toHaveLength(2);
  expect(result.every((slot) => slot.requiredForProgress === false)).toBe(true);
});

test('omits microphone-only capabilities when speech is unavailable', () => {
  expect(selectOptionalPracticeSlots({
    episodeId: 'ep-01',
    microphoneAvailable: false,
    networkAvailable: false,
    dueContentItemIds: [],
    mistakeContentItemIds: [],
    personalPlanContentItemIds: [],
    capabilities: [{ capabilityId: 'quick-speak-v1', family: 'quick_spoken_response', requiresMicrophone: true, requiresNetwork: false, expectedSeconds: 75 }],
  })).toEqual([]);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx jest --runTestsByPath tests/learning_v2_optional_practice.test.ts --no-cache --runInBand`

Expected: FAIL because the optional-practice module is absent.

- [ ] **Step 3: Implement deterministic priority and generic slots**

Prioritise `mistake -> due -> personal_plan -> current_unit`, then stable-sort
by `capabilityId`, filter capability requirements, and return at most two slots.
The output contains content-source selectors rather than copied phrase bodies.

```ts
export interface V2OptionalPracticeSlot {
  readonly slotId: string;
  readonly episodeId: string;
  readonly capabilityId: string;
  readonly family: V2ActivityFamily;
  readonly sourcePriority: 'mistake' | 'due' | 'personal_plan' | 'current_unit';
  readonly expectedSeconds: number;
  readonly requiredForProgress: false;
  readonly canWriteMastery: false;
}
```

- [ ] **Step 4: Run GREEN**

Run: `npx jest --runTestsByPath tests/learning_v2_optional_practice.test.ts tests/learning_v2_session_compiler.test.ts --no-cache --runInBand`

Expected: PASS, 0 failed tests.

- [ ] **Step 5: Commit**

```powershell
git add modules/learning-v2/content/optional_practice.ts tests/learning_v2_optional_practice.test.ts
git commit -m "feat: define V2 optional practice slots"
```

---

### Task 5: Unlimited earning with versioned diminishing rewards

**Files:**
- Create: `modules/learning-v2/progress/optional_practice_reward.ts`
- Create: `tests/learning_v2_optional_practice_reward.test.ts`

- [ ] **Step 1: Write RED tests using a test-only policy body**

```ts
import { projectOptionalPracticeReward } from '../modules/learning-v2/progress/optional_practice_reward';

const policy = {
  schemaVersion: 'v2-optional-practice-reward-policy.v1' as const,
  key: 'optional-practice-test-policy',
  version: 1,
  repeatBands: [
    { minimumPriorExactCompletions: 0, multiplierBasisPoints: 10000 },
    { minimumPriorExactCompletions: 2, multiplierBasisPoints: 6000 },
    { minimumPriorExactCompletions: 5, multiplierBasisPoints: 2500 },
  ],
  dueBoostBasisPoints: 2000,
  mistakeRepairBoostBasisPoints: 2000,
  minimumAward: 1,
};

test('has no hard cap and diminishes exact easy repetition', () => {
  const first = projectOptionalPracticeReward({ baseStars: 4, priorExactCompletions: 0, due: false, mistakeRepair: false }, policy);
  const repeated = projectOptionalPracticeReward({ baseStars: 4, priorExactCompletions: 8, due: false, mistakeRepair: false }, policy);
  expect(first.awardedStars).toBe(4);
  expect(repeated.awardedStars).toBeGreaterThan(0);
  expect(repeated.awardedStars).toBeLessThan(first.awardedStars);
  expect(repeated.hardCapReached).toBe(false);
});

test('restores useful value for due and mistake-repair practice', () => {
  const plain = projectOptionalPracticeReward({ baseStars: 10, priorExactCompletions: 8, due: false, mistakeRepair: false }, policy);
  const useful = projectOptionalPracticeReward({ baseStars: 10, priorExactCompletions: 8, due: true, mistakeRepair: true }, policy);
  expect(useful.awardedStars).toBeGreaterThan(plain.awardedStars);
});

test('cannot output mastery or access decisions', () => {
  const result = projectOptionalPracticeReward({ baseStars: 4, priorExactCompletions: 0, due: false, mistakeRepair: false }, policy);
  expect(result).toEqual({ awardedStars: 4, hardCapReached: false, policyKey: 'optional-practice-test-policy', policyVersion: 1 });
  expect(result).not.toHaveProperty('mastered');
  expect(result).not.toHaveProperty('accessAllowed');
});
```

- [ ] **Step 2: Verify RED**

Run: `npx jest --runTestsByPath tests/learning_v2_optional_practice_reward.test.ts --no-cache --runInBand`

Expected: FAIL because the reward projection is absent.

- [ ] **Step 3: Implement pure policy validation and projection**

Use integer basis points and integer star output. Validate that repeat thresholds
strictly increase and multipliers never increase. Do not add a production policy
body or choose production numeric values in this task. Runtime must receive an
exact approved `VersionedPolicyRef<'reward'>` and resolved body.

```ts
const basis = band.multiplierBasisPoints
  + (input.due ? policy.dueBoostBasisPoints : 0)
  + (input.mistakeRepair ? policy.mistakeRepairBoostBasisPoints : 0);
const awardedStars = Math.max(policy.minimumAward, Math.floor((input.baseStars * basis) / 10000));
return Object.freeze({
  awardedStars,
  hardCapReached: false as const,
  policyKey: policy.key,
  policyVersion: policy.version,
});
```

- [ ] **Step 4: Run GREEN plus existing star separation tests**

Run: `npx jest --runTestsByPath tests/learning_v2_optional_practice_reward.test.ts tests/learning_v2_gate_policy.test.ts tests/learning_v2_learning_evidence_policy.test.ts --no-cache --runInBand`

Expected: PASS, 0 failed tests; existing access/mastery projections remain unchanged.

- [ ] **Step 5: Commit**

```powershell
git add modules/learning-v2/progress/optional_practice_reward.ts tests/learning_v2_optional_practice_reward.test.ts
git commit -m "feat: project optional practice rewards"
```

---

### Task 6: Require an immutable language-profile prerequisite in Content Factory

**Files:**
- Modify: `functions/src/content_factory/v2_admin_generation_contract.ts`
- Modify: `functions/src/content_factory/v2_admin_generation_contract.test.ts`
- Modify: `functions/src/content_factory/generation_plan.test.ts`

- [ ] **Step 1: Add failing parser/fingerprint tests**

Extend the valid request fixture with:

```ts
languageProfileRef: {
  profileId: 'english-general-a1',
  version: 1,
  contentHash: 'b'.repeat(64),
},
```

Add assertions:

```ts
expect(parseV2AdminGenerationRequest({ ...validRequest, languageProfileRef: undefined })).toThrow('v2_generation_language_profile_required');
expect(parseV2AdminGenerationRequest({
  ...validRequest,
  languageProfileRef: { ...validRequest.languageProfileRef, contentHash: 'abc' },
})).toThrow('v2_generation_language_profile_invalid');

const first = buildV2AdminGenerationPlan(parseV2AdminGenerationRequest(validRequest));
const changed = buildV2AdminGenerationPlan(parseV2AdminGenerationRequest({
  ...validRequest,
  languageProfileRef: { ...validRequest.languageProfileRef, version: 2 },
}));
expect(changed.requestFingerprint).not.toBe(first.requestFingerprint);
expect(changed.stages.map((stage) => stage.kind)).toEqual(first.stages.map((stage) => stage.kind));
```

- [ ] **Step 2: Verify RED**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_factory/v2_admin_generation_contract.test.ts src/content_factory/generation_plan.test.ts --no-cache --runInBand; Pop-Location`

Expected: FAIL because `languageProfileRef` is currently an unknown field and not fingerprinted.

- [ ] **Step 3: Parse and freeze the exact ref without changing stage cardinality**

Add `languageProfileRef` to `TOP_LEVEL_FIELDS`, `V2AdminGenerationRequest` and
`V2AdminGenerationPlan`. Parse only `profileId`, `version`, `contentHash`; reject
unknown fields and malformed hashes. Include the ref in the canonical request
fingerprint. Do not add a `v2_language_profile` stage.

- [ ] **Step 4: Run GREEN and exact thirteen-kind regression**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_factory/v2_admin_generation_contract.test.ts src/content_factory/generation_plan.test.ts --no-cache --runInBand; Pop-Location`

Expected: PASS; the stage-kind set remains exactly the pre-existing thirteen kinds.

- [ ] **Step 5: Commit**

```powershell
git add functions/src/content_factory/v2_admin_generation_contract.ts functions/src/content_factory/v2_admin_generation_contract.test.ts functions/src/content_factory/generation_plan.test.ts
git commit -m "feat: pin V2 generation language profile"
```

---

### Task 7: Functions compilation adapter and blocking E1 quality report

**Files:**
- Create: `functions/src/content_factory/v2_content_compilation.ts`
- Create: `functions/src/content_factory/v2_content_compilation.test.ts`
- Create: `functions/src/content_factory/v2_episode_content_qa.ts`
- Create: `functions/src/content_factory/v2_episode_content_qa.test.ts`

- [ ] **Step 1: Write RED tests for exact-hash resolution and fail-closed QA**

```ts
test('compiles only when the resolved profile body matches the pinned hash', async () => {
  await expect(compileV2EpisodeContent({
    request: validRequest,
    contentItems: buildE1ContentItems(),
    resolveLanguageProfile: async () => ({ ref: validRequest.languageProfileRef, body: buildEnglishProfile() }),
  })).resolves.toMatchObject({ episodeId: 'ep-01', sessions: { length: 12 } });
});

test('rejects a profile body whose canonical hash differs from the request ref', async () => {
  await expect(compileV2EpisodeContent({
    request: validRequest,
    contentItems: buildE1ContentItems(),
    resolveLanguageProfile: async () => ({
      ref: validRequest.languageProfileRef,
      body: { ...buildEnglishProfile(), targetLanguage: 'de' },
    }),
  })).rejects.toThrow('language_profile_hash_mismatch');
});

test('blocks release when any card loses content or objective traceability', () => {
  const compiled = buildCompiledE1();
  const broken = {
    ...compiled,
    sessions: compiled.sessions.map((session, index) => index === 0
      ? { ...session, cards: session.cards.map((card, cardIndex) => cardIndex === 0 ? { ...card, contentItemId: 'missing' } : card) }
      : session),
  };
  expect(qaV2EpisodeContent(broken, buildE1ContentItems(), buildEnglishProfile())).toMatchObject({
    ok: false,
    blockingIssues: expect.arrayContaining(['compiled_card_content_missing']),
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_factory/v2_content_compilation.test.ts src/content_factory/v2_episode_content_qa.test.ts --no-cache --runInBand; Pop-Location`

Expected: FAIL because both modules are absent.

- [ ] **Step 3: Implement the adapter and QA report**

The adapter resolves the immutable profile, recomputes its canonical body hash,
validates all items, calls `compileV2RequiredSessions`, derives optional-practice
templates and runs QA. QA blocks on profile mismatch, unknown content refs,
unknown objectives, session/card/mode cardinality, unsupported families,
duplicate prompt IDs, trained prompts in independent checks, missing fallback
for microphone/network requirements, or any optional slot that can write mastery.

Return:

```ts
export interface V2EpisodeContentQualityReport {
  readonly schemaVersion: 'v2-episode-content-quality-report.v1';
  readonly episodeId: string;
  readonly ok: boolean;
  readonly blockingIssues: readonly string[];
  readonly warningIssues: readonly string[];
  readonly checkedContentItemIds: readonly string[];
  readonly checkedSessionIds: readonly string[];
  readonly languageProfileRef: V2LanguageProfileRef;
}
```

- [ ] **Step 4: Run GREEN with Content Factory regressions**

Run: `Push-Location functions; npx jest --runTestsByPath src/content_factory/v2_content_compilation.test.ts src/content_factory/v2_episode_content_qa.test.ts src/content_factory/v2_admin_generation_contract.test.ts src/content_factory/generation_plan.test.ts --no-cache --runInBand; Pop-Location`

Expected: PASS, 0 failed tests.

- [ ] **Step 5: Commit**

```powershell
git add functions/src/content_factory/v2_content_compilation.ts functions/src/content_factory/v2_content_compilation.test.ts functions/src/content_factory/v2_episode_content_qa.ts functions/src/content_factory/v2_episode_content_qa.test.ts
git commit -m "feat: compile and validate V2 episode content"
```

---

### Task 8: E1 v2 source fixture and legacy-compatible vertical-slice proof

**Files:**
- Create: `tests/fixtures/learning-v2/content-studio/e1-content-source.json`
- Create: `tests/learning_v2_e1_content_compiler.test.ts`
- Modify: `docs/v2/HANDOVER.md`

- [ ] **Step 1: Add the E1 source fixture**

The fixture contains one English LanguageProfile body/ref, the E1 `can do`
outcome, at least eight natural content items, accepted variants, reasoned
rejected variants and the exact reward-policy ref. It contains no receipt
backrefs, mutable approval state, user data, API credentials or generated audio
blobs. Compute real SHA-256 values using the existing canonical hash helper.

- [ ] **Step 2: Write the RED end-to-end contract**

```ts
test('compiles the E1 source into the approved twelve-session semantics', () => {
  const source = readJson('fixtures/learning-v2/content-studio/e1-content-source.json');
  const canonical = readJson('fixtures/learning-v2/episode-01.valid.json');
  const compiled = compileV2RequiredSessions({
    episodeId: 'ep-01',
    canDoOutcomeId: source.canDoOutcomeId,
    profile: source.languageProfile,
    items: source.contentItems,
  });
  const qa = qaV2EpisodeContent(compiled, source.contentItems, source.languageProfile);
  expect(qa.ok).toBe(true);
  expect(compiled.sessions).toHaveLength(12);
  expect(compiled.sessions.flatMap((session) => session.cards).every((card) => source.contentItems.some((item) => item.contentItemId === card.contentItemId))).toBe(true);
  expect(canonical.episode.episodeId).toBe('ep-01');
  expect(canonical.episode.canDoOutcome.some((value: { value: string }) => value.value.trim().length > 0)).toBe(true);
});

test('keeps optional reward output outside canonical mastery evidence', () => {
  const source = readJson('fixtures/learning-v2/content-studio/e1-content-source.json');
  expect(source.optionalPracticeTemplates.every((template: { requiredForProgress: boolean; canWriteMastery: boolean }) =>
    template.requiredForProgress === false && template.canWriteMastery === false,
  )).toBe(true);
});
```

- [ ] **Step 3: Verify RED**

Run: `npx jest --runTestsByPath tests/learning_v2_e1_content_compiler.test.ts --no-cache --runInBand`

Expected: FAIL until the fixture hashes, compiler inputs and QA output agree.

- [ ] **Step 4: Make the fixture and compilation proof GREEN**

Adjust only source content data and compiler defects. Do not weaken canonical E1
validation, reduce session/card/mode cardinality, remove independent prompts or
turn warnings into ignored errors.

- [ ] **Step 5: Run the joint root/Functions verification packet**

Run:

```powershell
npx jest --runTestsByPath tests/learning_v2_language_profile.test.ts tests/learning_v2_content_item.test.ts tests/learning_v2_session_compiler.test.ts tests/learning_v2_optional_practice.test.ts tests/learning_v2_optional_practice_reward.test.ts tests/learning_v2_e1_content_compiler.test.ts tests/learning_v2_episode_contract.test.ts tests/learning_v2_gate_policy.test.ts tests/learning_v2_learning_evidence_policy.test.ts --no-cache --runInBand
Push-Location functions
npx jest --runTestsByPath src/content_factory/v2_admin_generation_contract.test.ts src/content_factory/generation_plan.test.ts src/content_factory/v2_content_compilation.test.ts src/content_factory/v2_episode_content_qa.test.ts --no-cache --runInBand
npx tsc --noEmit --pretty false
Pop-Location
npx tsc --noEmit --pretty false
```

Expected: every command exits 0; 0 failed tests; no source-write-guard violation.

- [ ] **Step 6: Record exact evidence in the handover**

Update `docs/v2/HANDOVER.md` with commit hashes, changed files, RED/GREEN command
counts, preserved dirty state, remaining Admin/UI/Kimi packets and the exact next
task. Do not mark Admin generation or optional-practice UI complete.

- [ ] **Step 7: Commit the E1 vertical slice**

```powershell
git add tests/fixtures/learning-v2/content-studio/e1-content-source.json tests/learning_v2_e1_content_compiler.test.ts docs/v2/HANDOVER.md
git commit -m "test: prove V2 E1 content compilation"
```

---

## Final plan verification checklist

- [ ] E1 is the only generated scope in this packet.
- [ ] Existing Episode v1 remains readable; Episode v2 plus its twelve-session child is authoritative for new generation.
- [ ] LanguageProfile is an exact immutable prerequisite ref, not a mutable stage.
- [ ] Every compiled card traces to one content item and one objective.
- [ ] Twelve sessions, three zones, 7–9 cards and 3–4 modes are enforced.
- [ ] Independent checks do not reuse trained prompts.
- [ ] Optional slots are generic, at most two, non-blocking and mastery-free.
- [ ] Reward earning has no hard cap and exact repetition diminishes under a versioned policy.
- [ ] No production reward numbers are invented in this packet.
- [ ] Chinese, Japanese, Korean and RTL profile contract cases pass.
- [ ] No Admin UI, app UI, Kimi import, Rules, indexes, deploy or production change occurs.

## Execution roles and order

Use one writer. Tasks 1–5 are ordinary pure-contract work. Task 6 touches the
cross-boundary generation request fingerprint and must receive fresh high-risk
contract review before GREEN is accepted. Task 7 is Functions integration.
Task 8 is the joint deterministic verifier packet. A Kimi intake reviewer may
operate read-only in parallel, but cannot edit or approve these contracts.
