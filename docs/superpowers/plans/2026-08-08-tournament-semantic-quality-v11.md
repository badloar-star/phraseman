# Tournament Semantic Quality v11 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use `subagent-driven-development` (recommended) or `executing-plans` to implement this plan task-by-task. Use one critical-domain writer because this work crosses AI spend, Firestore, runtime, and migration contracts. A fresh reviewer must not share the writer's context.

**Goal:** Build a fail-closed tournament v11 pipeline that produces interesting, diverse, unambiguous tasks; makes `fill_gap` test broad content and function vocabulary instead of mostly `am/is/are`; and prevents publication without deterministic gates plus two exact semantic `PASS` receipts.

**Architecture:** Keep the live/frozen v10 path intact. A new pure v11 candidate factory creates unpublished canonical candidates from authored lesson content. Deterministic gates and hard diversity quotas run before paid review. A resumable server job obtains an independent linguistic verdict and adversarial ambiguity verdict through a dependency-injected provider, caches immutable receipts by exact content hash, and writes accepted output only to a server-only v11 bundle. Runtime publication remains a separate, hash-pinned, owner-authorized migration.

**Tech stack:** TypeScript, Jest, Firebase Admin/Firestore, Firebase Functions v2, OpenAI JSON-schema responses behind the existing provider, Node.js CommonJS migration scripts, plain HTML/JavaScript Admin v2.

**Approved design:** `docs/superpowers/specs/2026-08-08-tournament-semantic-quality-v11-design.md`

**Repository constraints:** Work only in `C:\appsprojects\phraseman` on `feature/referral-roulette`; do not create a worktree or another branch. The worktree is heavily dirty. Preserve all existing edits. Prefer new files. For already-dirty `admin/v2/legacy.html` and `firestore.rules`, apply only narrow task hunks, inspect the scoped diff, and do not stage unrelated pre-existing changes. Do not modify dirty `functions/src/index.ts`; keep the existing callable export name. Never run a local or Codex OpenAI request. Do not deploy, run live review, apply a migration, or switch the tournament barrier in this implementation session.

---

## Task 1: Lock the canonical candidate and hash contract

**Files:**

- Create: `functions/src/tournament_semantic_contract.ts`
- Create: `functions/src/tournament_semantic_contract.test.ts`

- [ ] **Step 1: Write RED tests for canonical identity**

Cover option-order independence, stable provenance ordering, and sensitivity to every semantic field:

```ts
const first = makeCandidate({ reviewSubjects: [correct, wrongA, wrongB, wrongC] });
const shuffled = makeCandidate({ reviewSubjects: [wrongC, correct, wrongA, wrongB] });

expect(computeCandidateHash(first)).toBe(computeCandidateHash(shuffled));
expect(computeCandidateHash(withChangedReason(first))).not.toBe(first.contentSha256);
expect(computeCandidateHash(withChangedTrap(first))).not.toBe(first.contentSha256);
expect(computeCandidateHash(withChangedProvenance(first))).not.toBe(first.contentSha256);
expect(semanticSignature(first)).toBe(semanticSignature(withOnlyVersionChanged(first)));
```

Also reject duplicate subject IDs, duplicate provenance keys, an absent declared key, an explanation attached to the correct option, and a wrong option without its own reason.

- [ ] **Step 2: Run the focused test and observe RED**

From `functions/`:

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_semantic_contract.test.ts
```

Expected: FAIL because the v11 contract module does not exist.

- [ ] **Step 3: Implement the smallest complete contract**

Define explicit mode-independent review subjects and provenance:

```ts
export const TOURNAMENT_SEMANTIC_SCHEMA_VERSION = 'tournament-semantic-candidate-v1' as const;
export const TOURNAMENT_REVIEW_CONTRACT_VERSION = 'tournament-semantic-review-v1' as const;

export type TournamentProvenanceKey = `${string}:${number}:${string}`;

export type FillGapTrapType =
  | 'morphology' | 'lexical_meaning' | 'collocation' | 'government'
  | 'agreement' | 'reference' | 'function_choice';

export type ReviewSubject = {
  subjectId: string;
  kind: 'choice_option' | 'build_token' | 'speed_pair';
  declaredRole: 'correct' | 'distractor' | 'safe' | 'odd' | 'required' | 'decoy' | 'pair';
  text: string;
  completedText?: string;
  trapType?: FillGapTrapType | 'minimal_phrase_change' | 'single_oddity_error' | 'build_decoy';
  reason?: string;
  metadata?: Readonly<Record<string, string>>;
};

export type TournamentSemanticCandidate = {
  schemaVersion: typeof TOURNAMENT_SEMANTIC_SCHEMA_VERSION;
  candidateId: string;
  mode: TournamentModeKind;
  difficulty: 1 | 2 | 3;
  prompt: string;
  context: Readonly<Record<string, unknown>>;
  reviewSubjects: readonly ReviewSubject[];
  provenanceKeys: readonly TournamentProvenanceKey[];
  semanticSignature: string;
  contentSha256: string;
};
```

Use `node:crypto` SHA-256 and a recursive canonical JSON serializer. Sort `reviewSubjects` by stable `subjectId` and provenance lexically only for hashing; retain presentation order outside the canonical snapshot. `semanticSignature` must omit task ID, pool version, option order, explanations, and prompt framing while retaining tested meaning and answer roles.

- [ ] **Step 4: Add bounded validation**

Expose:

```ts
export function createTournamentSemanticCandidate(
  input: TournamentSemanticCandidateInput,
): TournamentSemanticCandidate;

export function validateTournamentSemanticCandidate(
  candidate: TournamentSemanticCandidate,
): { ok: true } | { ok: false; reason: CandidateRejectionReason };
```

Enforce exact subject sets per mode, unique normalized values, one declared answer/error, byte limits, option-specific wrong reasons, and one to six provenance keys. Reject rather than repair malformed input.

- [ ] **Step 5: Run GREEN and typecheck**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_semantic_contract.test.ts
npx tsc --noEmit -p tsconfig.json
```

- [ ] **Step 6: Commit only the two new files**

```powershell
git add -- functions/src/tournament_semantic_contract.ts functions/src/tournament_semantic_contract.test.ts
git diff --cached --check
git commit -m "feat: define canonical tournament semantic candidates"
```

## Task 2: Build safe gloss parsing for `speed_match`

**Files:**

- Create: `functions/src/tournament_pool_v11_gloss.ts`
- Create: `functions/src/tournament_pool_v11_gloss.test.ts`

- [ ] **Step 1: Write exact RED regressions**

```ts
expect(parseDisplayGloss('до полудня (утро, ночь)')).toEqual({
  ok: true,
  value: { displayTranslation: 'до полудня', senseHint: 'утро, ночь' },
});
expect(parseDisplayGloss('простуда, холод')).toEqual({
  ok: true,
  value: { displayTranslation: 'простуда', senseHint: 'холод' },
});
expect(parseDisplayGloss('до полудня (утро')).toEqual({
  ok: false,
  reason: 'unbalanced_brackets',
});
expect(parseDisplayGloss(', холод')).toEqual({ ok: false, reason: 'empty_primary_sense' });
```

Add cases for nested `()[]{}`, top-level semicolon/slash separators, editorial fragments, malformed markup, unpaired surrogates, Unicode format controls, and maximum word/byte limits. Assert the same whitespace-token word count used by `speedMatchTileWordCount` in the runtime: bracket contents do not reset or hide words. Make the raw-input byte cap larger than the display cap so every typed limit rejection remains reachable.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_pool_v11_gloss.test.ts
```

- [ ] **Step 3: Implement a depth-aware parser**

```ts
export type ParsedDisplayGloss = {
  displayTranslation: string;
  senseHint: string;
};

export function parseDisplayGloss(raw: string):
  | { ok: true; value: ParsedDisplayGloss }
  | { ok: false; reason: GlossRejectionReason };
```

Apply the cheap raw-size guard first, then walk code points once, track bracket depth, and split only at approved top-level separators. Preserve nested content rather than truncating at an inner comma. Extract a trailing, whitespace-prefixed parenthetical sense annotation into `senseHint` as one intact value, then validate the display with the runtime's exact one-to-three whitespace-token rule. Accept only plain sense-annotation punctuation; reject editorial abbreviations, angle-bracket markup, unpaired surrogates, and invisible/bidirectional format controls. Do not silently delete unmatched punctuation or invent a translation.

- [ ] **Step 4: Run GREEN and commit**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_pool_v11_gloss.test.ts
git add -- functions/src/tournament_pool_v11_gloss.ts functions/src/tournament_pool_v11_gloss.test.ts
git diff --cached --check
git commit -m "fix: preserve complete tournament speed glosses"
```

## Task 3: Create broad, typed `fill_gap` candidates

**Files:**

- Create: `functions/src/tournament_pool_v11_fill_gap.ts`
- Create: `functions/src/tournament_pool_v11_fill_gap.test.ts`
- Read/import: `functions/src/tournament_task_factory.ts`

- [ ] **Step 1: Write RED tests for the confirmed ambiguity**

Use a synthetic authored phrase for `She closes the door at night.` and require per-option truth:

```ts
const candidates = buildFillGapCandidates(day, phrase);
const closes = candidates.find(item => item.correctToken === 'closes');

expect(closes?.distractors).not.toContainEqual(expect.objectContaining({
  value: 'locks',
  trapType: 'agreement',
}));
expect(closes?.distractors.every(item => item.reason.includes(item.value))).toBe(true);
expect(closes?.distractors.every(item => item.completedSentence.includes(item.value))).toBe(true);
```

If `locks` is retained, it must be classified as a lexical/context alternative and the candidate must remain unpublished until the semantic judges prove uniqueness. It may never receive a false agreement explanation.

- [ ] **Step 2: Write RED category tests**

Create fixtures proving blanks can target:

```ts
const expectedCategories: FillGapCategory[] = [
  'verb', 'noun', 'adjective', 'adverb', 'phrasal_particle', 'preposition',
  'modal', 'pronoun', 'conjunction', 'determiner', 'existential', 'article',
  'to_be', 'number_time', 'lexical_other',
];
expect(new Set(buildFixtureCandidates().map(item => item.category)))
  .toEqual(new Set(expectedCategories));
```

Also assert first/middle/last blank positions, exact reconstruction of the authored English phrase, one-token answers, same-POS lexical traps where available, morphology/government/collocation traps, and no duplicated option set.

- [ ] **Step 3: Run RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_pool_v11_fill_gap.test.ts
```

- [ ] **Step 4: Implement category classification and typed distractors**

```ts
export type FillGapDistractor = {
  value: string;
  trapType: FillGapTrapType;
  completedSentence: string;
  reason: string;
};

export type FillGapCandidate = {
  correctToken: string;
  category: FillGapCategory;
  position: 'first' | 'middle' | 'last';
  prompt: string;
  translation: string;
  distractors: readonly [FillGapDistractor, FillGapDistractor, FillGapDistractor];
  provenanceKey: TournamentProvenanceKey;
};
```

Tokenize against authored `SourceWord` entries, require the chosen token to occur exactly once, and reject mismatched tokenization. Build distractors from authored same-POS choices first, then deterministic morphology/function rules. Every rule must construct its own completed sentence and explanation. Never copy one grammar note across unrelated options.

Import the canonical `FillGapTrapType` from `tournament_semantic_contract.ts`; do not define a second, drifting trap taxonomy.

- [ ] **Step 5: Add deterministic hard gates**

Reject unchanged reconstructions, duplicate normalized options, unsupported multi-token answers, obvious length giveaways, a reason that does not cite the exact wrong token, and a category/trap combination the rule cannot prove. Keep semantically plausible alternatives as review candidates only; do not claim they are deterministically wrong.

- [ ] **Step 6: Run GREEN and commit**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_pool_v11_fill_gap.test.ts
npx tsc --noEmit -p tsconfig.json
git add -- functions/src/tournament_pool_v11_fill_gap.ts functions/src/tournament_pool_v11_fill_gap.test.ts
git diff --cached --check
git commit -m "feat: generate diverse typed tournament fill gaps"
```

## Task 4: Replace unsafe `find_oddity` substitutions

**Files:**

- Create: `functions/src/tournament_pool_v11_oddity.ts`
- Create: `functions/src/tournament_pool_v11_oddity.test.ts`

- [ ] **Step 1: Write RED regressions for multiple wrong options**

```ts
expect(buildOddityCandidates(timeFixture))
  .not.toContainEqual(expect.objectContaining({
    safeOptions: expect.arrayContaining(['It is moment to sleep.', 'It is night to sleep.']),
  }));
expect(isEligibleSafeSentence('I am looking for a blue shoes.')).toBe(false);
```

Add an assertion that all provenance keys of the three safe source sentences are retained.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_pool_v11_oddity.test.ts
```

- [ ] **Step 3: Implement whole-sentence safe options**

```ts
export function buildOddityCandidates(
  day: SourceDay,
  seed: string,
): readonly TournamentSemanticCandidateInput[];
```

Choose three complete authored sentences from the same day/topic and a bounded length/construction band. Produce the odd option by one declared token-level mutation of one source sentence. Record the repair, error class, completed corrected sentence, and every source phrase provenance key. Mechanical noun/adjective substitution may create an unreviewed odd mutation, but may never be used as proof that a safe option is natural.

- [ ] **Step 4: Add exact-one-error gates**

Require three distinct safe texts, one distinct odd text, one repair span, and one declared error type. Reject a mutation that changes multiple non-contiguous tokens or causes a second unrelated defect. Semantic truth remains subject to both judges.

- [ ] **Step 5: Run GREEN and commit**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_pool_v11_oddity.test.ts
git add -- functions/src/tournament_pool_v11_oddity.ts functions/src/tournament_pool_v11_oddity.test.ts
git diff --cached --check
git commit -m "fix: build oddity tasks from authored safe sentences"
```

## Task 5: Assemble all five v11 candidate modes

**Files:**

- Create: `functions/src/tournament_pool_v11_candidates.ts`
- Create: `functions/src/tournament_pool_v11_candidates.test.ts`
- Read/import: `functions/src/tournament_content_source.ts`
- Read/import: `functions/src/tournament_pool_v2_factory.ts`

- [ ] **Step 1: Write RED mode and regression tests**

Require deterministic candidate supply for `guess_phrase`, `fill_gap`, `find_oddity`, `translate_build`, and `speed_match`; no candidate may contain the four confirmed bad outputs. Require typed review subjects for every option/token/pair.

```ts
const result = buildTournamentV11Candidates({
  sourceDays: loadTournamentSourceDays(TOURNAMENT_SOURCE_PLANS),
});
expect(new Set(result.candidates.map(item => item.mode))).toEqual(new Set(ALL_V11_MODES));
expect(result.rejections.byReason.multiple_acceptable_answers ?? 0).toBeDefined();
expect(JSON.stringify(result.candidates)).not.toContain('It is moment to sleep.');
expect(JSON.stringify(result.candidates)).not.toContain('до полудня (утро"');
```

Add mode-specific quality assertions:

- `guess_phrase` rotates at least three deterministic prompt families and every distractor is a minimal learner trap with bounded length/lexical distance;
- `find_oddity` safe sentences share a topic/construction band rather than being unrelated random phrases;
- `translate_build` has exactly one typed decoy and exactly one reconstructible sequence;
- each `speed_match` board has six exact-distinct English/Russian pairs plus POS/sense context;
- no mode emits a generic/random distractor without a typed relationship to the tested content.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_pool_v11_candidates.test.ts
```

- [ ] **Step 3: Implement unpublished candidate assembly**

Expose a pure API with injected historical signatures:

```ts
export function buildTournamentV11Candidates(options: {
  sourceDays: readonly SourceDay[];
  historicalSemanticSignatures?: ReadonlySet<string>;
}): TournamentV11CandidateBuild;
```

Adapt the strong v10 `guess_phrase` and `translate_build` minimal-change logic into canonical review subjects, use the new fill/oddity/gloss modules, and preserve all six speed-pair provenance keys. Do not construct `verified:true` or `lifecycle:'published'` tasks here.

Rotate stable prompt-family IDs (`situation`, `intention`, `dialogue`) for `guess_phrase` without leaking the answer. Preserve each family in candidate context and manifest metrics so one framing cannot dominate silently.

- [ ] **Step 4: Separate content identity from presentation**

Derive candidate IDs from source provenance and transformation identity. Compute `semanticSignature` before presentation shuffling and `contentSha256` after all reasons/context are complete. Reject historical signatures before any review request can be scheduled.

- [ ] **Step 5: Run GREEN and commit**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_pool_v11_candidates.test.ts
npx tsc --noEmit -p tsconfig.json
git add -- functions/src/tournament_pool_v11_candidates.ts functions/src/tournament_pool_v11_candidates.test.ts
git diff --cached --check
git commit -m "feat: assemble unpublished tournament v11 candidates"
```

## Task 6: Enforce hard `fill_gap` and corpus diversity quotas

**Files:**

- Create: `functions/src/tournament_pool_v11_selector.ts`
- Create: `functions/src/tournament_pool_v11_selector.test.ts`

- [ ] **Step 1: Write RED quota tests**

For the 500-task fill cell require:

```ts
expect(summary.total).toBe(500);
expect(summary.contentWordCount).toBeGreaterThanOrEqual(300);
expect(summary.articleAndToBeCount).toBeLessThanOrEqual(75);
expect(Math.max(...Object.values(summary.optionSetCounts))).toBeLessThanOrEqual(10);
expect(Math.max(...Object.values(summary.correctTokenCounts))).toBeLessThanOrEqual(40);
expect(summary.positionCounts.first).toBeGreaterThanOrEqual(75);
expect(summary.positionCounts.middle).toBeGreaterThanOrEqual(75);
expect(summary.positionCounts.middle).toBeLessThanOrEqual(325);
expect(summary.positionCounts.last).toBeGreaterThanOrEqual(75);
```

Assert exact D1/D2/D3 counts `160/180/160`, category/trap/topic/source-day metrics, deterministic output, every supported category with sufficient supply appearing in the final manifest, D3 not being filled solely by pronoun/article/`to_be` questions, and a typed failure with exact shortages when the fixture cannot satisfy a floor.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_pool_v11_selector.test.ts
```

- [ ] **Step 3: Implement deterministic constrained selection**

```ts
export function selectTournamentV11Candidates(input: {
  candidates: readonly TournamentSemanticCandidate[];
  quotas: typeof TOURNAMENT_V11_CELL_QUOTAS;
}): { ok: true; selected: readonly TournamentSemanticCandidate[]; manifest: V11CandidateManifest }
   | { ok: false; shortages: readonly DiversityShortage[] };
```

Select mandatory position/category floors first, respect difficulty-cell counts throughout, then fill remaining slots by deterministic least-used scores. Enforce option-set and correct-token caps at insertion. Apply a bounded deterministic swap/repair pass; if the final manifest misses any constraint, return `ok:false` rather than relaxing it.

- [ ] **Step 4: Report every diversity axis**

Manifest fields must include mode/difficulty counts, fill category/trap/token/option-set/position, source day/topic, oddity error type, translate decoy type, speed POS/sense coverage, historical exclusions, and deterministic rejection reasons.

- [ ] **Step 5: Run GREEN and commit**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_pool_v11_selector.test.ts
git add -- functions/src/tournament_pool_v11_selector.ts functions/src/tournament_pool_v11_selector.test.ts
git diff --cached --check
git commit -m "feat: enforce tournament v11 diversity quotas"
```

## Task 7: Implement strict two-pass semantic review

**Files:**

- Create: `functions/src/tournament_semantic_review.ts`
- Create: `functions/src/tournament_semantic_review.test.ts`
- Create: `functions/src/tournament_semantic_openai_provider.ts`
- Create: `functions/src/tournament_semantic_openai_provider.test.ts`
- Read/import: `functions/src/explain/explain_provider.ts`

- [ ] **Step 1: Write RED parser tests**

Test valid primary/adversarial passes, a second acceptable fill answer, a second erroneous oddity option, a false option explanation, an invalid speed pair, missing/duplicate/extra subjects, wrong content hash, wrong prompt/contract version, wrong pass/model echo, malformed JSON, and provider errors.

```ts
expect(parseSemanticVerdict(validRaw, expected)).toEqual(expect.objectContaining({ verdict: 'PASS' }));
expect(() => parseSemanticVerdict(hashMismatchRaw, expected)).toThrow('semantic_hash_mismatch');
expect(() => parseSemanticVerdict(missingSubjectRaw, expected)).toThrow('semantic_subject_set_mismatch');
```

- [ ] **Step 2: Write RED orchestration tests with a fake provider**

```ts
const result = await reviewTournamentCandidate(candidate, config, fakeProvider);
expect(fakeProvider.calls.map(call => call.pass)).toEqual(['primary', 'adversarial']);
expect(result.decision).toBe('PASS');
```

Assert the adversarial pass is not shown the first pass response, a primary reject skips paid adversarial review, disagreement rejects, and neither malformed prose nor a timeout can become `PASS`.

- [ ] **Step 3: Run RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_semantic_review.test.ts
```

- [ ] **Step 4: Implement strict schemas and prompts**

```ts
export interface TournamentSemanticReviewProvider {
  review(request: SemanticProviderRequest): Promise<SemanticProviderResponse>;
}

export async function reviewTournamentCandidate(
  candidate: TournamentSemanticCandidate,
  config: SemanticReviewConfig,
  provider: TournamentSemanticReviewProvider,
): Promise<TwoPassReviewResult>;
```

The response must echo exact hash, review contract, prompt version, pass, and model; contain exactly one verdict for each expected subject; report zero blocking findings for `PASS`; and state the acceptable-answer/error count required by the mode. Parse with an explicit runtime schema, never truthy/coercive fields.

Bind the primary and adversarial prompt versions to `TOURNAMENT_REVIEW_CONTRACT_VERSION` in one immutable constant map. A prompt text/version change is invalid unless the review contract version is bumped in the same change; test this invariant so an old create-only receipt ID can never block a legitimate fresh review.

- [ ] **Step 5: Add the production adapter without using it locally**

Wrap `openAiChat` with strict `json_schema` and `maxAttempts: 1`. The job, not the provider, owns the total initial attempt plus at most two retries. Accept the API key as an argument supplied by the callable secret boundary. Do not read `process.env.OPENAI_API_KEY` in pure modules or tests.

- [ ] **Step 6: Test the production adapter deterministically**

Inject or mock `openAiChat` and assert the exact model, pass-specific system prompt, candidate hash, prompt/contract versions, strict response schema, timeout, and `maxAttempts: 1`. Assert token usage is mapped without coercion and that provider errors remain errors rather than synthetic verdicts. The existing provider does not expose a response ID; use the fenced internal attempt ID from Task 8 as the audit identity instead of inventing a provider ID.

```ts
expect(openAiChatMock).toHaveBeenCalledWith(expect.objectContaining({
  model: config.primaryModel,
  maxAttempts: 1,
  responseFormat: expect.objectContaining({ type: 'json_schema' }),
}));
```

- [ ] **Step 7: Prove tests cannot reach the network**

In the test, replace the provider with a fake and install a `global.fetch` sentinel that throws if called. Assert zero network calls for pass, reject, retry classification, and parse failure paths.

- [ ] **Step 8: Run GREEN and commit**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_semantic_review.test.ts src/tournament_semantic_openai_provider.test.ts
npx tsc --noEmit -p tsconfig.json
git add -- functions/src/tournament_semantic_review.ts functions/src/tournament_semantic_review.test.ts functions/src/tournament_semantic_openai_provider.ts functions/src/tournament_semantic_openai_provider.test.ts
git diff --cached --check
git commit -m "feat: add two-pass tournament semantic review"
```

## Task 8: Add model-pair configuration and attempt-based budget accounting

**Files:**

- Modify: `functions/src/openai_jobs_config.ts`
- Modify: `functions/src/openai_jobs_config.test.ts`
- Create: `functions/src/tournament_semantic_budget.ts`
- Create: `functions/src/tournament_semantic_budget.test.ts`
- Create: `functions/src/tournament_semantic_attempt_store.ts`
- Create: `functions/src/tournament_semantic_attempt_store.test.ts`

- [ ] **Step 1: Write RED config tests**

Require tournament-only fields while preserving all existing job responses:

```ts
expect(jobFromData('tournament', {
  tournament: {
    primaryModel: 'gpt-4.1-mini',
    adversarialModel: 'gpt-4.1',
    semanticDailyRequestCap: 600,
  },
})).toEqual(expect.objectContaining({
  primaryModel: 'gpt-4.1-mini',
  adversarialModel: 'gpt-4.1',
  semanticDailyRequestCap: 600,
}));
```

Test invalid model fallback, bounded caps, kill switch, and backward compatibility when the new fields are absent.

- [ ] **Step 2: Write RED budget tests**

Use a fake transactional store. Assert one consumed cap unit per provider-call authorization, no reservation on receipt cache hit, atomic cap exhaustion, token/usage recording, and zero writes in dry-run.

Add crash-window and stale-lease RED tests for a fenced attempt state machine:

```ts
type AttemptState = 'reserved' | 'calling' | 'returned' | 'recorded' | 'abandoned';
```

Test crashes after reservation, after the `calling` transition, after provider return, after billing, after receipt creation, and before candidate checkpoint. A persisted `calling` attempt can never authorize another provider call. If its result is unknown, resume must consume a new cap unit and a new attempt ordinal. A persisted `returned` result must resume from stored validated response/usage without another call. A stale lease holder must be unable to write response, billing, receipt, or checkpoint data.

- [ ] **Step 3: Run RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/openai_jobs_config.test.ts src/tournament_semantic_budget.test.ts src/tournament_semantic_attempt_store.test.ts
```

- [ ] **Step 4: Extend config narrowly**

```ts
export interface TournamentSemanticJobConfig extends JobConfig {
  primaryModel: JobModel;
  adversarialModel: JobModel;
  semanticDailyRequestCap: number;
}

export function resolveTournamentSemanticJobConfig(
  db: FirebaseFirestore.Firestore,
): Promise<TournamentSemanticJobConfig>;
```

Keep existing `model/globalDailyCap` for compatibility. Store the two semantic models and request cap in the existing `admin_runtime_config/openai_jobs.tournament` object.

- [ ] **Step 5: Implement fenced attempt accounting on existing ledgers**

Back `reserveAttempt` with `tournament_ai_usage` and write actual token accounting to `tournament_ai_billing`. Allocate a monotonic per-candidate/pass attempt ordinal transactionally; the immutable internal attempt ID includes that ordinal. Reservation consumes the daily cap and creates `reserved`. A lease-fenced transaction changes it to `calling` immediately before the external request. Persist the validated response hash, structured result, token usage, and internal attempt ID in `returned` before any receipt/checkpoint work; billing then moves it idempotently to `recorded`.

Never call the provider from `reserved` or reuse a `calling` authorization. On unknown outcome after lease loss, mark the old attempt `abandoned`, allocate a new ordinal, and consume another cap unit. Count ambiguous crash attempts toward the initial-plus-two maximum. This may conservatively overcount spend capacity, but it cannot undercount actual calls. Do not revive `tournament_ai_budget` from the retired full-AI path.

- [ ] **Step 6: Run GREEN and commit**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/openai_jobs_config.test.ts src/tournament_semantic_budget.test.ts src/tournament_semantic_attempt_store.test.ts
npx tsc --noEmit -p tsconfig.json
git add -- functions/src/openai_jobs_config.ts functions/src/openai_jobs_config.test.ts functions/src/tournament_semantic_budget.ts functions/src/tournament_semantic_budget.test.ts functions/src/tournament_semantic_attempt_store.ts functions/src/tournament_semantic_attempt_store.test.ts
git diff --cached --check
git commit -m "feat: configure and budget tournament semantic review"
```

## Task 9: Store immutable review receipts

**Files:**

- Create: `functions/src/tournament_semantic_receipt_store.ts`
- Create: `functions/src/tournament_semantic_receipt_store.test.ts`

- [ ] **Step 1: Write RED repository tests**

Test deterministic receipt IDs, create-only semantics, exact cache hits, model/prompt/contract mismatches, conflict equality, conflict inequality, and no unbounded in-memory cache. Cover immutable `PASS`, terminal `REJECT`, `PARTIAL`, and `ERROR` evidence variants. Delete each required evidence field from otherwise valid fixtures and assert strict rejection.

```ts
const id = semanticReceiptId(candidate.contentSha256, contractVersion, modelPair);
await store.createImmutable(passReceipt);
await expect(store.createImmutable(passReceipt)).resolves.toEqual({ reused: true, id });
await expect(store.createImmutable(changedReceiptSameId)).rejects.toThrow('receipt_conflict');
```

- [ ] **Step 2: Run RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_semantic_receipt_store.test.ts
```

- [ ] **Step 3: Implement create-only storage**

Use collection `tournament_semantic_review_receipts`. The parent document ID is SHA-256 of exact content hash, contract version, and ordered model pair. In a transaction, read the deterministic parent: create a terminal `PASS` or `REJECT` when absent; when present, accept only a byte-equivalent validated terminal receipt. A reusable approval requires the `PASS` variant with two complete passing verdicts and matching hash/versions/models. A cached terminal `REJECT` prevents repeat spend but never authorizes publication.

Store malformed, interrupted, provider-error, and other incomplete evidence as create-only child documents:

```text
tournament_semantic_review_receipts/{receiptKey}/evidence/{internalAttemptId}
```

These `PARTIAL`/`ERROR` evidence receipts are immutable, do not create or replace the terminal parent, and never approve content. Their attempt-scoped IDs allow a later bounded retry to finish review without colliding with the approved parent identity.

Define and validate the complete immutable evidence shape:

```ts
type TournamentSemanticReceiptBase = {
  contentSha256: string;
  canonicalTaskSnapshotHash: string;
  candidateId: string;
  mode: TournamentModeKind;
  difficulty: 1 | 2 | 3;
  provenanceKeys: readonly TournamentProvenanceKey[];
  reviewContractVersion: string;
  primaryPromptVersion: string;
  adversarialPromptVersion: string;
  primaryModel: JobModel;
  adversarialModel: JobModel;
  requestAccounting: { attempts: number; inputTokens: number; outputTokens: number };
  createdAtMs: number;
  completedAtMs: number;
  generationJobId: string;
};

export type TournamentSemanticReceipt =
  | (TournamentSemanticReceiptBase & {
      decision: 'PASS';
      primaryVerdict: PassingSemanticVerdict;
      adversarialVerdict: PassingSemanticVerdict;
    })
  | (TournamentSemanticReceiptBase & {
      decision: 'REJECT';
      primaryVerdict: SemanticVerdict;
      adversarialVerdict?: SemanticVerdict;
      blockingFindings: readonly SemanticFinding[];
    })
  | (TournamentSemanticReceiptBase & {
      decision: 'PARTIAL' | 'ERROR';
      internalAttemptId: string;
      completedPasses: readonly SemanticReviewPass[];
      failureCode: string;
    });
```

The prompt versions are not independent identity knobs: the contract-to-prompts invariant from Task 7 requires a contract bump for every prompt change. This preserves the approved receipt key while preventing stale prompt collisions. Only the `PASS` terminal variant is returned by `getReusableApproval`; terminal `REJECT` and attempt-scoped evidence have separate explicit read methods.

- [ ] **Step 4: Run GREEN and commit**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_semantic_receipt_store.test.ts
git add -- functions/src/tournament_semantic_receipt_store.ts functions/src/tournament_semantic_receipt_store.test.ts
git diff --cached --check
git commit -m "feat: persist immutable tournament review receipts"
```

## Task 10: Build the resumable semantic job and server-only v11 bundle

**Files:**

- Create: `functions/src/tournament_semantic_job.ts`
- Create: `functions/src/tournament_semantic_job.test.ts`
- Create: `functions/src/tournament_semantic_history.ts`
- Create: `functions/src/tournament_semantic_history.test.ts`
- Create: `functions/src/tournament_pool_v11_bundle.ts`
- Create: `functions/src/tournament_pool_v11_bundle.test.ts`

- [ ] **Step 1: Write RED job-state tests**

Cover deterministic create/resume, one active lease, stale lease takeover, revision conflicts, a bounded batch, checkpoint after every terminal candidate, cached PASS, cached terminal REJECT with zero repeat spend, primary reject, adversarial reject, disagreement, transient retries capped at two, immutable partial/error evidence, malformed response quarantine, budget pause, candidate shortage, and exact progress counts.

```ts
const first = await runTournamentSemanticJobBatch(deps, { poolVersion: V11, maxCandidates: 4 });
const resumed = await runTournamentSemanticJobBatch(deps, { poolVersion: V11, jobId: first.jobId, maxCandidates: 4 });
expect(resumed.cursor).toBeGreaterThan(first.cursor);
expect(deps.provider.maxConcurrentCalls).toBe(1);
```

Also assert a wall-clock deadline checkpoints before the callable timeout even when fewer than the candidate cap have completed.

- [ ] **Step 2: Write RED historical-signature tests**

Load signatures from the exact ready generation in bounded pages plus exact reusable receipts. Test pagination cursors, generation drift, duplicated signature collapse, malformed legacy tasks, and exclusion before any provider/budget call:

```ts
const history = await loadHistoricalTournamentSignatures(adapter, readyBarrier);
expect(history.signatures.has(repeatedCandidate.semanticSignature)).toBe(true);
expect(provider.calls).toHaveLength(0);
```

- [ ] **Step 3: Write RED dry-run tests**

Require candidate counts, hard-gate rejections, projected primary/adversarial request counts, retry upper bound, cache-hit counts, historical exclusions, and diversity feasibility. Assert zero provider, secret, budget, job, receipt, task, and bundle writes.

- [ ] **Step 4: Write RED bundle finalization tests**

Finalization must fail unless every cell quota and global diversity gate passes and every selected content hash has an exact reusable two-pass receipt. The bundle hash must change when any task, receipt reference, manifest field, or provenance key changes.

- [ ] **Step 5: Run RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_semantic_job.test.ts src/tournament_semantic_history.test.ts src/tournament_pool_v11_bundle.test.ts
```

- [ ] **Step 6: Implement bounded history loading and job interfaces**

```ts
export interface SemanticJobRepository {
  createOrResume(input: CreateSemanticJobInput): Promise<SemanticJobState>;
  claimLease(input: ClaimLeaseInput): Promise<SemanticJobLease>;
  checkpoint(input: CheckpointInput): Promise<void>;
}

export async function runTournamentSemanticJobBatch(
  deps: SemanticJobDependencies,
  input: { jobId?: string; poolVersion: string; maxCandidates: number },
): Promise<SemanticJobBatchResult>;
```

Use root `tournament_semantic_jobs/{jobId}` and bounded subcollections for cells/candidates so no document approaches 1 MiB. Default to four candidates and cap at six per callable. Process requests sequentially through the fenced attempt state machine from Task 8. A primary `REJECT` is terminal; a primary `PASS` triggers the independent adversarial request. Provider errors retry only when classified transient. Resume from persisted `returned` data without a provider call; an unknown `calling` outcome consumes a fresh capped attempt.

Load the current ready barrier once per batch, page its published task signatures with explicit limits/cursors, merge exact reusable receipt signatures, and recheck barrier generation before committing a checkpoint. Feed the resulting set into the pure candidate builder so historical matches are rejected before paid review. Iterate the deterministic per-cell reserve queue until approved supply can satisfy all selectors; do not freeze the first 4000 candidates and then weaken quotas after review rejects.

Stop early on a monotonic wall-clock deadline, checkpoint the current cursor, and return a continuation before the callable timeout.

- [ ] **Step 7: Implement non-runtime finalization**

Write approved output to:

```text
tournament_pool_v11_bundles/{poolVersion}
tournament_pool_v11_bundles/{poolVersion}/tasks/{taskId}
```

The bundle task may contain `verified:true`, `lifecycle:'published'`, `contentSha256`, `semanticReceiptId`, `semanticSignature`, and `provenanceKeys`, but it is not copied into `tournamentTasks` here. Use create-only/hash-equality semantics. Store a frozen manifest and bundle hash on the root.

- [ ] **Step 8: Run GREEN and commit**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_semantic_job.test.ts src/tournament_semantic_history.test.ts src/tournament_pool_v11_bundle.test.ts
npx tsc --noEmit -p tsconfig.json
git add -- functions/src/tournament_semantic_job.ts functions/src/tournament_semantic_job.test.ts functions/src/tournament_semantic_history.ts functions/src/tournament_semantic_history.test.ts functions/src/tournament_pool_v11_bundle.ts functions/src/tournament_pool_v11_bundle.test.ts
git diff --cached --check
git commit -m "feat: add resumable tournament semantic review jobs"
```

## Task 11: Route the existing admin callable to v11

**Files:**

- Modify: `functions/src/admin_tournament_tasks.ts`
- Modify: `functions/src/admin_tournament_tasks.test.ts`
- Do not modify: `functions/src/index.ts`

- [ ] **Step 1: Add RED callable-wrapper tests**

Keep the existing export and permission/App Check boundary. Test:

- `dryRun:true` returns v11 feasibility with no provider/write;
- `action:'run_batch'` creates or resumes one job and processes one bounded batch;
- `action:'status'` returns persisted progress through the callable;
- all five text modes are handled by v11 and none calls `runTextGeneration`;
- retired functions remain retired;
- invalid job IDs, versions, batch sizes, and extra input keys fail closed.

```ts
expect(runTextGenerationSpy).not.toHaveBeenCalled();
expect(result).toEqual(expect.objectContaining({
  jobId: expect.any(String),
  state: expect.stringMatching(/running|paused|blocked|ready/),
  continuation: expect.anything(),
}));
```

- [ ] **Step 2: Run RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/admin_tournament_tasks.test.ts
```

- [ ] **Step 3: Replace only the callable body**

Accept a backward-compatible input envelope:

```ts
type AdminFillTournamentPoolInput = {
  action?: 'dry_run' | 'run_batch' | 'status';
  dryRun?: boolean;
  poolVersion?: typeof TOURNAMENT_POOL_V11_VERSION;
  jobId?: string;
  maxCandidates?: number;
  level?: string;
  maxTasks?: number;
  healthy?: boolean;
};
```

Map legacy `dryRun:true` to `dry_run`; map a real legacy click to `run_batch`. Resolve the server config, inject `OPENAI_API_KEY.value()` only for a real provider attempt, and return truthful continuation/progress. Do not query live `tournamentTasks` to claim v11 readiness.

- [ ] **Step 4: Run GREEN and commit**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/admin_tournament_tasks.test.ts
npx tsc --noEmit -p tsconfig.json
git add -- functions/src/admin_tournament_tasks.ts functions/src/admin_tournament_tasks.test.ts
git diff --cached --check
git commit -m "feat: run tournament fill through semantic v11 jobs"
```

## Task 12: Deny client access and record the Jarvis boundary

**Files:**

- Modify narrowly: `firestore.rules` (already dirty)
- Create: `tests/tournament_semantic_firestore_rules_contract.test.ts`
- Create: `functions/src/tournament_semantic_firestore_rules.emulator.test.ts`
- Create: `functions/src/jarvis/tournament_semantic_unread_contract.test.ts`
- Run existing: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`

- [ ] **Step 1: Write RED security-contract tests**

Require explicit recursive deny rules for:

```text
tournament_semantic_jobs
tournament_semantic_review_receipts
tournament_pool_v11_bundles
```

Assert these roots are excluded from the browser-admin catch-all because Firestore match permissions combine with OR. Add emulator cases proving unauthenticated, ordinary authenticated, and `admin:true` clients all fail reads, creates, updates, deletes, and nested-subcollection access for every new root. Seed fixtures only through `withSecurityRulesDisabled`. Assert no Jarvis fetcher reads candidates, raw verdicts, receipts, or job subcollections.

- [ ] **Step 2: Run RED**

From the repo root:

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/tournament_semantic_firestore_rules_contract.test.ts
npm --prefix functions test -- --runInBand --no-cache --runTestsByPath src/jarvis/tournament_semantic_unread_contract.test.ts
```

- [ ] **Step 3: Patch only the required rules hunks**

Add each collection to the exclusions in the existing admin catch-all and add explicit recursive denies:

```rules
match /tournament_semantic_jobs/{document=**} {
  allow read, write: if false;
}
match /tournament_semantic_review_receipts/{document=**} {
  allow read, write: if false;
}
match /tournament_pool_v11_bundles/{document=**} {
  allow read, write: if false;
}
```

Do not enable or change App Check. Do not add a Jarvis reader; the test documents intentional unread status.

- [ ] **Step 4: Run GREEN and inspect the dirty-file boundary**

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/tournament_semantic_firestore_rules_contract.test.ts
npm --prefix functions test -- --runInBand --no-cache --runTestsByPath src/jarvis/tournament_semantic_unread_contract.test.ts src/jarvis/jarvis_data_contract_guard.test.ts
firebase emulators:exec --config ../firebase.json --only firestore --project demo-phraseman-tournament-semantic --log-verbosity QUIET "jest --config jest.emulator.config.js --runTestsByPath src/tournament_semantic_firestore_rules.emulator.test.ts --no-cache --runInBand"
git diff -- firestore.rules
```

Run the `firebase emulators:exec` command from `functions/`. Do not commit `firestore.rules` automatically because it contains pre-existing user edits. Commit only the new tests; leave the narrow rules hunk unstaged and report it explicitly.

## Task 13: Show honest dry-run, progress, pause, and resume in Admin v2

**Files:**

- Modify narrowly: `admin/v2/legacy.html` (already dirty)
- Modify: `tests/admin_tournaments_tab_contract.test.ts`
- Read fully before editing: `docs/design/ADMIN_UI_BIBLE.md`

- [ ] **Step 1: Read the Admin UI Bible to EOF in bounded chunks**

Record the applicable rules: one primary CTA, secondary dry-run, plain-language consequences, visible loading/error/paused states, tooltips, keyboard focus, no decorative realtime UI, and no activation action on this surface.

- [ ] **Step 2: Write RED source-contract tests**

Require:

- secondary `Проверить план` sends `dryRun:true`;
- one primary `Начать / продолжить проверку v11` CTA;
- sequential continuation with a double-click lock;
- job ID persisted locally and reused after reload;
- progress for every mode/cell plus accepted/rejected/quarantined counts;
- budget, shortage, pause, blocked, and next-action copy;
- no green readiness before all global gates;
- no retired generator or activation callable.

- [ ] **Step 3: Run RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/admin_tournaments_tab_contract.test.ts
```

- [ ] **Step 4: Patch the two tournament UI regions only**

Modify only the fill card near the existing tournament section and `tnFillPool` handler. Keep the existing live pool statistics but label them `Текущий живой пул`; show v11 review readiness separately. Use one in-flight request at a time:

```js
while (response.continuation && !response.paused && pageStillActive) {
  response = await callFill({ action: 'run_batch', jobId: response.jobId });
  renderTournamentV11Progress(response);
}
```

The loop must yield between calls, stop when the page is closed/inactive, and resume from the persisted job ID on a later click. All buttons need visible text, `title`/tooltip, focus state, loading state, disabled state, and explicit result copy.

- [ ] **Step 5: Run GREEN and inspect only scoped hunks**

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/admin_tournaments_tab_contract.test.ts
git diff -- admin/v2/legacy.html
```

Do not auto-stage the dirty HTML file. Commit the clean test file only; report the exact UI hunks left unstaged.

## Task 14: Prevent source-phrase repetition inside a room

**Files:**

- Modify: `functions/src/tournament_core.ts`
- Modify: `functions/src/tournaments.ts`
- Create: `functions/src/tournament_provenance_dedup.test.ts`
- Create: `functions/src/tournament_task_provenance_serialization.test.ts`
- Do not modify dirty: `functions/src/tournament_core.test.ts`

- [ ] **Step 1: Write RED parsing and validation tests**

Test that legacy tasks without provenance remain valid, v11 requires bounded unique keys, malformed/duplicate/oversized keys are rejected, and `speed_match` preserves all six keys through parse/secret serialization.

- [ ] **Step 2: Write RED selection tests**

```ts
const picked = selectRoundTasks({
  pool,
  roomId,
  roundNo: 2,
  count: 4,
  modeKind: 'mix',
  excludedTaskIds: new Set(),
  excludedProvenanceKeys: new Set(['gavan:10:phrase-3']),
});
expect(picked.flatMap(task => task.provenanceKeys ?? []))
  .not.toContain('gavan:10:phrase-3');
```

Require the fallback shuffle and curated override path to obey the same filter. A genuine shortage must return failure/null rather than reuse provenance.

- [ ] **Step 3: Run RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_provenance_dedup.test.ts src/tournament_task_provenance_serialization.test.ts
```

- [ ] **Step 4: Implement optional legacy-compatible provenance**

Add `provenanceKeys?: string[]` to `TournamentTask`, byte/count limits, v11-required validation, and `excludedProvenanceKeys` to `TaskSelectionParams`. Preserve keys in `parseTournamentTaskDocument`. In `buildTournamentRounds`, accumulate all selected keys across all 16 tasks and pass the set to every subsequent round selection.

- [ ] **Step 5: Run GREEN and commit**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_provenance_dedup.test.ts src/tournament_task_provenance_serialization.test.ts
npx tsc --noEmit -p tsconfig.json
git add -- functions/src/tournament_core.ts functions/src/tournaments.ts functions/src/tournament_provenance_dedup.test.ts functions/src/tournament_task_provenance_serialization.test.ts
git diff --cached --check
git commit -m "fix: prevent tournament room provenance repeats"
```

## Task 15: Add v11 exposure, full-corpus, and 730-day gates

**Files:**

- Create: `functions/src/tournament_pool_v11_factory.ts`
- Create: `functions/src/tournament_pool_v11_factory.test.ts`
- Create: `functions/src/tournament_pool_v11_runtime.test.ts`
- Modify: `functions/src/tournament_pool_exposure_v7.test.ts`
- Modify: `functions/src/tournaments.ts`

- [ ] **Step 1: Write RED factory tests**

Build the final task model only from selected candidates plus exact reusable receipts. Assert exact 4000 task IDs, exact mode/difficulty quotas, 4000 semantic signatures, review reference/hash parity, strict server validation, no known regression phrase, and all fill diversity gates.

- [ ] **Step 2: Write RED v11 barrier tests**

Require exact generation/layout/hash metadata for v11 while preserving v7-v9 bucket behavior and legacy/v10 compatibility. Reject missing or drifted bucket counts, generation mismatch, malformed exposure IDs, and a v11 task missing provenance or receipt fields.

- [ ] **Step 3: Write the 730-day RED simulation**

Use realistic scheduled room IDs, multiple slot series/shards, and all 16 tasks per room. Require:

```ts
expect(roomTaskIds.size).toBe(16);
expect(roomProvenanceKeys.size).toBe(totalProvenanceRefsInRoom);
expect(adjacentRoomOverlap).toBe(0);
expect(allV11TaskIdsSeen.size).toBe(4000);
```

Also assert no source/mode bucket collapses to a small prefix and every speed board reserves all six provenance keys.

- [ ] **Step 4: Run RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_pool_v11_factory.test.ts src/tournament_pool_v11_runtime.test.ts src/tournament_pool_exposure_v7.test.ts
```

- [ ] **Step 5: Implement v11 task finalization and exposure metadata**

Set a new immutable pool version constant. Derive task IDs from pool version plus content hash. Assign bounded per-mode exposure buckets after selection. Runtime must only recognize v11 when an exact ready-barrier token pins pool version, layout, task count, manifest hash, bundle hash, and receipt-ledger hash.

Use `TOURNAMENT_POOL_V11_VERSION = 'tpool_20260808_v11'`. For v11 reads, constrain the query by the barrier-pinned exposure bucket/pool version and reject every returned task whose stored values drift; never use the legacy broad `source == ai` query for v11.

- [ ] **Step 6: Run GREEN and commit**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_pool_v11_factory.test.ts src/tournament_pool_v11_runtime.test.ts src/tournament_pool_exposure_v7.test.ts
npx tsc --noEmit -p tsconfig.json
git add -- functions/src/tournament_pool_v11_factory.ts functions/src/tournament_pool_v11_factory.test.ts functions/src/tournament_pool_v11_runtime.test.ts functions/src/tournament_pool_exposure_v7.test.ts functions/src/tournaments.ts
git diff --cached --check
git commit -m "feat: finalize and expose reviewed tournament v11 tasks"
```

## Task 16: Add zero-write v11 audit artifacts

**Files:**

- Create: `functions/src/tournament_pool_v11_dry_run.ts`
- Create: `functions/src/tournament_pool_v11_dry_run.test.ts`
- Generate only ignored artifacts under: `.codex-tmp/tournament-pool-v11/`

- [ ] **Step 1: Write RED audit tests**

Require exact candidate counts, hard-gate rejection counts, historical exclusions, review coverage, receipt hashes, 4000 bundle tasks, all diversity metrics, 730-day exposure results, and `productionWrites: 0`.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_pool_v11_dry_run.test.ts
```

- [ ] **Step 3: Implement pure/read-only artifact generation**

Emit manifest JSON, candidate rejection summary, reviewed-task NDJSON, receipt index, exposure report, and a compact human-readable report. Never call the semantic provider. When Firestore adapters are supplied for a future authorized preflight, reads must be paged/bounded and writes must remain zero.

- [ ] **Step 4: Run GREEN and commit**

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_pool_v11_dry_run.test.ts
git add -- functions/src/tournament_pool_v11_dry_run.ts functions/src/tournament_pool_v11_dry_run.test.ts
git diff --cached --check
git commit -m "feat: audit tournament v11 without production writes"
```

## Task 17: Create separate guarded v11 apply and rollback scripts

**Files:**

- Create: `scripts/apply-tournament-pool-v11.cjs`
- Create: `scripts/rollback-tournament-pool-v11.cjs`
- Create: `tests/tournament_pool_v11_migration_scripts.test.ts`
- Do not modify: `scripts/apply-tournament-pool-v2.cjs`
- Do not modify: `scripts/rollback-tournament-pool-v2.cjs`

- [ ] **Step 1: Write RED pure-script tests**

Test pins for source barrier generation/revision/layout, v11 bundle hash, manifest hash, receipt-ledger hash, backup hash, exact task IDs, bounded write/read/delete chunks, protected-room checks, release transaction shape, read-back, and exact rollback restoration.

Require default preflight-only behavior. Apply must require both `--apply` and `PHRASEMAN_TOURNAMENT_V11_APPLY=1`; rollback must require its own explicit flag and exact generated rollback artifact.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/tournament_pool_v11_migration_scripts.test.ts
```

- [ ] **Step 3: Implement guarded scripts by extracting no live assumptions**

At future runtime, read the actual ready barrier first; do not assume production is v10. Stop unless it equals the operator-pinned expected source. Acquire the barrier only after protected-room checks. Copy only hash-pinned v11 bundle tasks into `tournamentTasks`, read them back, then switch the barrier transactionally. Rollback restores the exact source barrier/documents and deletes only pinned v11 IDs.

- [ ] **Step 4: Verify syntax without running apply or rollback**

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/tournament_pool_v11_migration_scripts.test.ts
node --check scripts/apply-tournament-pool-v11.cjs
node --check scripts/rollback-tournament-pool-v11.cjs
```

- [ ] **Step 5: Commit**

```powershell
git add -- scripts/apply-tournament-pool-v11.cjs scripts/rollback-tournament-pool-v11.cjs tests/tournament_pool_v11_migration_scripts.test.ts
git diff --cached --check
git commit -m "feat: guard tournament v11 migration and rollback"
```

## Task 18: Run complete verification and independent reviews

**Files:**

- Review all task-owned files and narrow hunks in dirty files
- Save bulky logs under ignored `.codex-tmp/tournament-v11-verification/`

- [ ] **Step 1: Run the focused deterministic suite**

From `functions/`:

```powershell
npx jest --runInBand --no-cache --runTestsByPath src/tournament_semantic_contract.test.ts src/tournament_pool_v11_gloss.test.ts src/tournament_pool_v11_fill_gap.test.ts src/tournament_pool_v11_oddity.test.ts src/tournament_pool_v11_candidates.test.ts src/tournament_pool_v11_selector.test.ts src/tournament_semantic_review.test.ts src/tournament_semantic_openai_provider.test.ts src/openai_jobs_config.test.ts src/tournament_semantic_budget.test.ts src/tournament_semantic_attempt_store.test.ts src/tournament_semantic_receipt_store.test.ts src/tournament_semantic_job.test.ts src/tournament_semantic_history.test.ts src/tournament_pool_v11_bundle.test.ts src/admin_tournament_tasks.test.ts src/tournament_provenance_dedup.test.ts src/tournament_task_provenance_serialization.test.ts src/tournament_pool_v11_factory.test.ts src/tournament_pool_v11_runtime.test.ts src/tournament_pool_v11_dry_run.test.ts src/tournament_pool_exposure_v7.test.ts src/jarvis/tournament_semantic_unread_contract.test.ts src/jarvis/jarvis_data_contract_guard.test.ts
```

- [ ] **Step 2: Run root contract and script tests**

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/admin_tournaments_tab_contract.test.ts tests/tournament_semantic_firestore_rules_contract.test.ts tests/tournament_pool_v11_migration_scripts.test.ts
```

- [ ] **Step 3: Run the authoritative Firestore emulator denial gate**

From `functions/`:

```powershell
firebase emulators:exec --config ../firebase.json --only firestore --project demo-phraseman-tournament-semantic --log-verbosity QUIET "jest --config jest.emulator.config.js --runTestsByPath src/tournament_semantic_firestore_rules.emulator.test.ts --no-cache --runInBand"
```

- [ ] **Step 4: Run compile and static gates without regenerating user-owned content**

```powershell
npx tsc --noEmit -p functions/tsconfig.json
npx tsc -p functions/tsconfig.json --outDir .codex-tmp/tournament-v11-verification/functions-build
node --check scripts/apply-tournament-pool-v11.cjs
node --check scripts/rollback-tournament-pool-v11.cjs
git diff --check
```

The second `tsc` command is the full emitted Functions TypeScript build directed only to ignored `.codex-tmp`; it is the non-mutating build gate. Do not run the package prebuild that rewrites `src/generated/tournament_content.json` while authored plan files are dirty. Record the generated-content prebuild as intentionally skipped due the protected worktree, while reporting the emitted TypeScript build separately as passed or failed.

- [ ] **Step 5: Prove the no-network/no-spend boundary**

Run the tests with OpenAI credentials absent and the fake provider sentinel enabled. Confirm no local request, receipt write, bundle write, live `tournamentTasks` write, deployment, or barrier mutation occurred.

- [ ] **Step 6: Inspect scope and source-write safety**

```powershell
git status --short
git diff --name-only
git diff -- admin/v2/legacy.html firestore.rules
git log --oneline --max-count=20
```

Compare against the baseline dirty-file inventory. Any unrelated delta is a blocker. Never discard or reformat pre-existing user changes.

- [ ] **Step 7: Run a fresh critical-domain code review**

Use a fresh read-only critical reviewer to inspect semantic truth, hash/cache identity, budget races, Firestore OR-rule safety, lease idempotency, staging isolation, runtime legacy compatibility, migration/rollback pins, and missing tests. Resolve every Critical and Important finding with a new RED test before changing code.

- [ ] **Step 8: Run an independent deterministic verifier**

Have a separate verifier rerun the exact focused commands and report command, exit code, decisive counts, and log paths without editing source.

- [ ] **Step 9: Report honestly**

The implementation may be called complete only if all deterministic gates pass and no Critical/Important review finding remains. Report separately:

- implemented locally;
- verified with fake providers;
- not run: production AI review;
- not done: deploy, live Firestore write, migration apply, barrier activation;
- any narrow uncommitted hunks in pre-dirty files.

End the completion report with `Находки и предложения` as required by the repository instructions.

---

## Definition of done

- Every v11 published candidate has one exact answer/error and truthful per-option reasons.
- Every accepted content hash has two independent structured `PASS` verdicts for exact versions/models.
- `fill_gap` covers broad vocabulary and satisfies the 60% content-word, 15% article+`to be`, 2% option-set, 8% correct-token, and position contracts.
- The confirmed `She locks`, `It is moment/night`, `a blue shoes`, and `a.m.` failures cannot enter the reviewed bundle.
- No review candidate or partial job state is readable by clients or eligible for runtime.
- No room repeats a source provenance key across modes; the 730-day gate passes.
- Historical semantic duplicates are removed before paid review.
- Dry-run has zero provider calls and zero writes; cached exact receipts avoid repeat spend.
- Admin v2 truthfully shows feasibility, progress, pause/block reasons, and resume state without activation controls.
- v10 remains operational until a separately authorized, hash-pinned v11 migration.
- No local OpenAI call, deployment, live migration, or barrier switch occurs during implementation.
