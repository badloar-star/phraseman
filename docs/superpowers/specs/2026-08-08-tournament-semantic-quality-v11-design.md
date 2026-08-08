# Tournament Pool v11: Semantic Quality and Diverse Fill-Gap

## Status

Approved by the owner in this Codex task on 2026-08-08.

The owner selected a production AI semantic judge on top of deterministic gates and approved:

- two independent review passes before publication;
- diverse `fill_gap` tasks across content and function words;
- fail-closed publication, resumable jobs, caching, quotas, provenance deduplication, and a v11 rollout barrier;
- local verification with fake providers only, with no project-funded OpenAI calls from Codex.

## Goal

Replace the current tournament content path with a quality-first v11 pipeline in which every published task:

1. has one unambiguous key;
2. uses plausible distractors tied to the tested phrase instead of unrelated text;
3. has a factually correct explanation for every wrong option;
4. passes deterministic corpus gates and two production AI reviews;
5. participates in measurable within-mode and within-room diversity;
6. remains reproducible, versioned, hash-pinned, and safe to roll back.

The highest-priority user-visible change is `fill_gap`: blanks must test the full useful vocabulary of authored phrases, not mostly `am`, `is`, `are`, articles, and pronouns.

“100%” in this design means that no task is published without satisfying every defined deterministic and semantic gate. Natural-language correctness cannot be proved mathematically by an AI model, so the pipeline also remains fail-closed, uses two independent review passes including an adversarial pass, records evidence, and supports future audit. A passing structural test alone is never treated as proof of linguistic correctness.

## Scope

Included:

- deterministic candidate generation for all five approved tournament modes;
- diverse `fill_gap` candidates and distribution quotas;
- strict per-option explanations;
- two-pass production AI semantic review;
- cached immutable review receipts keyed by content hash;
- resumable admin fill jobs and truthful progress reporting;
- corrected `find_oddity`, `speed_match`, and cross-mode provenance behavior;
- historical semantic-signature exclusion;
- v11 bundle, dry-run, migration, rollback, and runtime compatibility contracts;
- Firestore, Jarvis, callable, admin, and test contract updates required by the new data path.

Not included without a separate owner action:

- calling the project OpenAI API from Codex or local scripts;
- spending production AI budget;
- deploying Cloud Functions or Hosting;
- writing or switching the live Firestore tournament generation barrier;
- deleting retired endpoints or legacy functionality.

## Confirmed root causes

### `fill_gap`

The current factory finds one strict grammar mutation and then fills remaining distractors from the authored word list. It assigns the same grammar-role explanation to every wrong option even when those extra options fail for a different reason or remain grammatical. This produced the confirmed `She ___ the door at night` example where `locks` is plausible and correctly agrees with `She`, while the explanation falsely claims subject disagreement.

The selection layer also permits a small number of option sets and correct tokens to dominate the 500-task cell.

### `find_oddity`

Current “safe” variants are built through mechanical noun/adjective substitution. They are marked natural without proving that the completed sentence is grammatical or idiomatic. This produced questions with two or three erroneous options while only one index was declared correct.

### `speed_match`

Current display translation extraction splits an authored gloss at the first comma without respecting parentheses or sense boundaries. This can publish truncated text such as `до полудня (утро`.

### Publication and admin integration

The deterministic factory marks tasks verified and published after structural checks. The semantic quality gate is a narrow denylist of previously observed defects. The visible Fill Pool action can plan all five modes, but its four text modes route to an intentional compatibility tombstone.

### Runtime diversity

Runtime excludes consumed `taskId` values, not the shared source provenance. Different modes can therefore show the same source phrase in one 16-task room. In-run semantic signatures also do not prevent a new pool version from republishing historical content under new IDs.

## Architecture

```text
Authored lesson content
        |
        v
Deterministic mode-specific candidate factory
        |
        v
Structural, linguistic-shape, provenance, and diversity gates
        |
        v
Primary AI linguistic judge
        |
        v
Adversarial AI ambiguity judge
        |
        +---- any reject/disagreement/error ----> quarantine + next candidate
        |
        v
Immutable review receipt keyed by contentSha
        |
        v
Published v11 task + exposure bucket
        |
        v
Hash-pinned barrier activation in a separate production operation
```

Candidate generation and room selection remain deterministic. AI judges approve or reject candidates; they do not rewrite task text. Rejected candidates are replaced by the next deterministic candidate so that model prose cannot silently become product content.

No AI request occurs during room creation or gameplay.

## Candidate model

Every candidate has a canonical, option-order-independent `contentSha256` computed from:

- schema version;
- mode and difficulty;
- prompt and translation/context;
- normalized option or token set;
- declared key;
- per-option trap classifications and explanations;
- provenance references.

Option shuffling happens only after the semantic content hash is fixed, or the canonical representation sorts options while retaining the declared semantic role. A review receipt is valid only for the exact canonical content hash and prompt contract version.

Candidates are not eligible for runtime until both semantic reviews pass and the resulting task passes the server validator again.

## Diverse `fill_gap` design

### Eligible words

An authored word may become the blank when:

- it occurs exactly once in the English phrase;
- it is a single lexical token within tournament byte limits;
- it has an authored part of speech and at least three distinct plausible distractor candidates, or the deterministic morphology rules can provide the missing candidates;
- the Russian meaning and full English sentence give enough context for one unique answer;
- reconstructing the phrase with the correct token exactly matches the authored sentence after normalization.

Eligible categories include:

- content words: verbs, nouns, adjectives, adverbs, phrasal particles, and explicitly classified lexical “other” words;
- function words: prepositions, modals, pronouns, conjunctions, determiners, existential forms, articles, and forms of `to be`;
- numbers and time expressions when they are represented as one safe token.

### Distractor construction

Each wrong option carries its own typed trap:

- `morphology`: same lemma, wrong inflection for this context;
- `lexical_meaning`: same part of speech and similar surface form, but wrong meaning under the supplied translation;
- `collocation`: grammatical word that does not form the authored collocation;
- `government`: wrong preposition, particle, or complement pattern;
- `agreement`: wrong subject/verb, number, or case agreement;
- `reference`: wrong person, number, or referent under the Russian context;
- `function_choice`: wrong modal, article, conjunction, determiner, or existential form.

A task may mix trap types. The explanation for an option must state that option’s actual failure; a single role-level sentence may not be copied to unrelated options.

Before AI review, deterministic checks reject duplicate options, multiple-token options, unchanged reconstructions, obvious length giveaways, unsupported characters, and explanations that do not cite the exact option and completed sentence.

### Distribution contract for 500 tasks

- at least 60% test content words;
- articles plus `to be` together are at most 15%;
- no normalized four-option set exceeds 2%;
- no normalized correct token exceeds 8%;
- first, middle, and last blank positions each account for at least 15%; middle is at most 65%;
- every supported category with enough approved candidates appears in the final manifest;
- D1, D2, and D3 retain their approved cell totals;
- D3 cannot be filled solely with pronoun, article, or `to be` questions;
- selection fails closed when the approved candidate supply cannot satisfy the contract.

The manifest reports counts by part of speech, trap type, correct token, option set, blank position, difficulty, source day, and topic.

## Other mode contracts

### `guess_phrase`

- one authored phrase is the unique answer;
- every distractor stays close in length and differs minimally;
- every change has a typed learner trap and an option-specific explanation;
- the Russian intention makes every wrong option clearly wrong;
- multiple prompt families rotate deterministic scenario framing without changing the tested meaning.

### `find_oddity`

- exactly three options are independently valid, natural sentences;
- exactly one option contains one declared repairable error;
- noun/adjective free substitution is not accepted as proof of a natural safe option;
- safe options come from coherent authored sentences in the same topic/construction band or from variants that independently pass both judges;
- all four options are checked independently, not merely relative to the declared `correctIndex`;
- the task is rejected if two options are questionable or if the odd phrase has more than one unrelated error.

### `translate_build`

- the correct token sequence reconstructs one exact authored English meaning;
- exactly one extra token remains;
- the extra token competes with a specific answer token by morphology, spelling, function, or context;
- the decoy cannot produce a second natural answer under the Russian prompt;
- malformed joke tokens may appear only when they represent a documented learner error and pass semantic review.

### `speed_match`

- translations use a dedicated clean display value instead of first-comma truncation;
- gloss parsing respects balanced parentheses and top-level sense separators;
- unmatched brackets, editorial fragments, and empty senses are rejected;
- each pair includes part of speech and, when necessary, an example/sense hint for judge context;
- all six pairs are semantically distinct within the board;
- the judge confirms the chosen Russian display value for the authored word sense.

## Semantic review contract

### Pass 1: linguistic judge

The primary judge receives the full canonical candidate and returns strict JSON that evaluates:

- prompt naturalness and level appropriateness;
- exact number of acceptable answers;
- correctness and naturalness of every completed option;
- plausibility and instructional value of every distractor;
- truth of every per-option explanation;
- translation/context alignment;
- mode-specific contract compliance;
- any harmful, inappropriate, or nonsensical content.

### Pass 2: adversarial judge

The second request receives the same canonical candidate but a different prompt: attempt to invalidate the key by finding a second acceptable answer, a second erroneous oddity option, an inaccurate explanation, a context ambiguity, or an unnatural “safe” phrase.

Both responses must:

- conform to a strict JSON schema;
- echo the exact `contentSha256` and prompt version;
- include one verdict for every option/token/pair required by the mode;
- return `PASS` with zero blocking findings.

The final decision is `PASS` only when both judges independently return valid `PASS`. Any `REJECT`, disagreement, missing item, hash mismatch, malformed JSON, provider error, or exhausted retry produces no published task.

The model IDs are configuration values in the existing server-side OpenAI job configuration, not hardcoded in the content factory. The provider boundary is dependency-injected so tests use a fake implementation.

## Review cache and evidence

A dedicated server-only collection stores one immutable receipt per `(contentSha256, reviewContractVersion, modelPair)`.
Receipts are written with create-only semantics; an existing document is read and verified, never overwritten.

Minimum receipt fields:

- `contentSha256` and canonical task snapshot hash;
- mode, difficulty, candidate ID, and provenance keys;
- review contract and prompt versions;
- primary/adversarial model IDs;
- both validated structured verdicts;
- aggregate decision;
- request/token accounting;
- creation and completion timestamps;
- generation job ID.

Only a complete `PASS` receipt can be reused. Rejected, malformed, stale-version, or partial receipts do not approve a task. Cache lookup has bounded queries and no unbounded module-level map.

Client access is explicitly denied in Firestore Rules. Server-side admin callables require the existing admin claim. App Check behavior is not changed. Any new collection or field is checked against Jarvis fetchers and its data-contract guard in the same change.

## Resumable admin job

The existing visible surface remains `admin/v2/legacy.html`. Retired compatibility callables remain retired; functionality is not deleted.

`adminFillTournamentPool` is changed to create or resume a semantic pool-fill job instead of routing text modes to `runTextGeneration`.

### Dry run

Dry run performs no provider call and no source write. It returns:

- requested and available cells;
- deterministic candidate counts after hard gates;
- projected primary/adversarial request counts;
- estimated budget units using existing accounting configuration;
- diversity feasibility and any blocking shortage;
- current historical-signature exclusions.

### Real run

- one idempotent job owns a target pool version and requested cells;
- work is processed in bounded sequential batches;
- one callable invocation processes at most one configured batch and returns a continuation state; while the page remains open the admin UI invokes the next batch sequentially, and a later button press resumes the persisted job after the page was closed;
- each checkpoint records candidate cursor, accepted/rejected counts, rejection reasons, request accounting, and remaining quota;
- closing the admin page does not lose completed reviews;
- starting the same target resumes from the checkpoint;
- a content hash with a complete cached receipt incurs no repeat request;
- daily caps are reserved through the existing OpenAI job budget mechanism;
- transient provider failures receive at most two bounded retries;
- permanent failures, malformed responses, and judge disagreements quarantine the candidate and continue with the next candidate;
- exhausted candidate supply marks the cell blocked with exact counts and reasons rather than weakening gates.

The admin UI reports job ID, state, per-mode progress, accepted/rejected/quarantined counts, estimated/actual requests, budget status, and the next safe action. It must not claim that the pool is ready until every required cell and global gate passes.

## Publication lifecycle

Candidate and review work never enters runtime queries as published content.

Required lifecycle:

1. deterministic candidate exists only in job state or an explicitly non-runtime staging collection;
2. both review receipts pass;
3. final task is reconstructed from the canonical candidate, validated, and written as `verified:true` / `published` with review receipt reference and content hash;
4. complete v11 bundle is dry-run, audited, hash-pinned, and exposure-simulated;
5. a separate owner-authorized production operation switches the generation barrier.

Old v10 stays available until v11 is complete. Existing rooms retain exact task-secret compatibility. No deployment, migration, live OpenAI review, or barrier switch is implicit in implementation completion.

## Diversity across rooms and versions

Runtime keeps both:

- `excludedTaskIds` for exact task reuse;
- `excludedProvenanceKeys` for source phrase reuse across all modes in the 16-task room.

A provenance key includes plan ID, day index, and phrase ID. For multi-pair speed tasks, every pair provenance is reserved. Room assembly fails closed if a complete plan cannot be built without a provenance collision.

The pool job also loads normalized semantic signatures from the currently published generation and review ledger. New v11 candidates matching historical content are excluded before paid review whenever possible.

The two-year deterministic simulation must prove:

- 16 distinct task IDs per room;
- zero repeated provenance keys within a room;
- adjacent scheduled rooms remain task-ID disjoint;
- every v11 task remains reachable;
- no mode or source bucket collapses to a small prefix.

## Error handling

- Deterministic gate failure: reject locally with a typed reason and no AI spend.
- Missing API configuration: job becomes blocked; no task is published.
- Timeout or transient provider error: retry at most twice with existing timeout/backoff conventions, then quarantine.
- Invalid JSON/schema/hash: quarantine immediately or after one schema-repair request if the existing provider contract already supports it; never infer a pass from prose.
- Judge disagreement: reject candidate; do not ask a third judge merely to break the tie.
- Budget exhausted: checkpoint as paused with exact remaining work.
- Candidate shortage: fail the affected cell and preserve accepted review cache; never relax quotas automatically.
- Firestore conflict/retry: use idempotent content-hash document IDs and transactional ownership/checkpoints.
- Stale review version: require fresh review before publication.

## TDD sequence

Every production behavior begins with a focused failing test and an observed expected RED result.

1. Add exact regression tests for:
   - `It is moment/night to sleep` producing multiple odd options;
   - `I am looking for a blue shoes` as an invalid safe option;
   - `She locks the door` as a grammatical/semantically plausible alternative with a false agreement explanation;
   - `a.m. -> до полудня (утро` truncation;
   - repeated provenance in a deterministic room.
2. Add `fill_gap` candidate and quota tests covering every supported word category, mixed trap types, per-option reasons, positions, exact-set caps, correct-token caps, and fail-closed shortages.
3. Add strict semantic review schema tests for pass, reject, second acceptable answer, second oddity error, false explanation, malformed JSON, missing option, hash mismatch, disagreement, timeout, retry, cache hit, stale prompt version, and budget exhaustion.
4. Add admin job tests for dry-run zero spend, all five modes, idempotent resume, checkpoints, progress, quarantine, and truthful readiness.
5. Add runtime tests for zero provenance collisions over 730 days while preserving task-ID exposure and existing-room compatibility.
6. Add Firestore/Jarvis/admin contract tests for new fields and collections without enabling App Check.
7. Implement the minimum behavior for each RED test, verify GREEN, and refactor only while focused tests remain green.

Local and CI tests must mock the provider and must never read `OPENAI_API_KEY` or make a network request.

## Verification gates

Before implementation can be reported complete:

- focused tournament semantic-review, candidate, admin, runtime, Firestore, and Jarvis tests pass;
- the complete deterministic v11 candidate corpus builds in a bounded audit command;
- all mode/difficulty totals and fill-gap diversity quotas pass;
- zero known regression examples enter the approved bundle;
- all `wrongOptionReasons` align one-to-one with options and their completed sentences;
- 730-day simulation has zero provenance collisions;
- Functions TypeScript build passes;
- relevant lint/boundary and source-write guards pass;
- no test or generator mutates source during a normal test run;
- no local OpenAI request is made;
- an independent critical code review reports no unresolved Critical or Important finding;
- the final diff contains only task-owned files and preserves pre-existing dirty work.

Real production AI review, deployment, Firestore migration, and barrier activation remain separately reported, owner-authorized operations.

## Acceptance criteria

Implementation is accepted when:

- Fill Pool can dry-run and process all five approved modes through the new resumable pipeline;
- no text mode routes to the retired generator;
- a task cannot be published without two valid semantic `PASS` receipts for its exact content hash;
- `fill_gap` meets all diversity caps and includes broad content-word coverage;
- every wrong option has a truthful, option-specific reason;
- `find_oddity` has exactly one erroneous option in every approved task;
- `speed_match` contains no truncated or malformed display translations;
- room assembly has no cross-mode provenance repetition;
- historical semantic duplicates are excluded before publication;
- all specified tests and build gates pass without real API spend;
- v10 remains untouched and usable until a separate v11 production review and migration are explicitly run.

## Rollout and rollback boundary

The implementation may add v11 code, staging/review contracts, dry-run tooling, and an admin job. It must not deploy, call production AI, write the live pool, or switch the ready barrier in this task without a new explicit production-operation instruction.

When that future operation is authorized, it must use frozen bundle and receipt hashes, bounded writes, read-back validation, protected-room checks, a generation barrier, and an independently verified rollback artifact. Rollback restores the exact prior generation and removes only hash-pinned v11 documents.
