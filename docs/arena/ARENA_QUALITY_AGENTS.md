# Arena Quality Agents — release contract

## Purpose

Arena has its own quality system. It borrows the **discipline** of Learning V2
(independent roles, hash-bound evidence, machine facts before judgement and
fail-closed release), not its session-writing prompts or its pass threshold.
The English V11 replacement pipeline is the reference. Live V10 is explicitly
not an exemplar and must never seed another language.

## Input identity

Every review request contains exactly these immutable values:

- `studyTarget` and `sourceLocale`;
- `poolVersion`, `candidateId`, `taskId`, mode and CEFR band;
- canonical task content hash, semantic-signature hash and provenance hash;
- generator-profile hash and deterministic-facts hash.

A change to any reviewed text, answer key, distractor, explanation, target,
provenance or generator profile invalidates every receipt. An agent never
repairs content; it returns structured findings only.

Before a draft exists, an independent read-only `arena_preauthoring_guardian`
must issue `preauthoring.json`. It receives the target profile, exact target /
mode / CEFR slot, authoritative target-language fact pack, relevant approved
same-mode English structure exemplar, target-pool semantic ledger and generator
prompt version. It returns PASS or HOLD with hashes of every input, intended
answer and accepted variants, a trap plan for every distractor and
`authorMustNotSelfIssue: true`. A draft may not start on HOLD.

## Required agents

| Agent | Independent question | Blocking evidence |
|---|---|---|
| `mode_guardian` | Is the task mechanically solvable in this exact mode? | Exact answer-key/mode matrix, cardinality, unique options, no answer leak, tokenisation and target identity. |
| `target_linguist_primary` | Is each target-language option grammatical, natural and appropriate for level? | Per-option completed form, grammaticality, translation and target-specific rationale. |
| `ambiguity_adversary` | Can another option reasonably be right or can the stated error be false? | Independent per-option matrix from a different reviewer identity. |
| `pedagogy_judge` | Does the task diagnose and practise its declared ability rather than only reward guessing? | Can-do link, diagnostic trap, feedback usefulness and support level. |
| `nonsense_judge` | Is any rule, translation, explanation or cultural assertion false, invented or misleading? | Concrete counterexample or explicit checked PASS. |
| `target_isolation_judge` | Does content/provenance leak English or another target into this target? | Script/token/locale/provenance comparison and exact target match. |
| `pool_diversity_auditor` | Is the entire pool balanced and non-repetitive? | Per-mode/difficulty counts, dedupe, source caps and exposure report. |
| `release_guardian` | Does an immutable, fully reviewed publication exist? | Recomputed hashes, all required receipt fingerprints, receipt ledger and manual approval. |

The linguist must use a target-specific evidence pack. English is a calibration
for structure and style, never linguistic authority for Spanish, French or
German. A target without its approved fact pack is HOLD.

## Receipt schema

Every post-draft receipt must contain `schemaVersion`, `role`, `verdict`,
`taskId`, `studyTarget`, `mode`, `difficulty`, `poolVersion`, `draftSha256`,
`profileSha256`, `generatorPromptSha256`, `evidencePackSha256`,
`approvedExemplarSha256`, `semanticLedgerSha256`, `deterministicFactsSha256`,
`issuedAt`, `runId`, `checks`, `evidence`, `findings` and `mustFix`.

`independence` is mandatory and includes `authorRunIdDifferent: true`,
`freshContext: true` and `selfIssued: false`. Each evidence item points to a
current JSON pointer, quotes the exact current text and lists supporting fact
IDs. A receipt validator re-finds every quote in the current draft and every
fact ID in the evidence pack. A malformed or partial receipt is HOLD, not a
best-effort PASS.

## Mode matrix

`guess_phrase` and `fill_gap` require exactly four unique minimal twins in one
frame and part of speech, one grammatical answer and three grammatical errors.
Each wrong option has its own source-language grammatical proof. Lexical,
contextual, stylistic, collocational or meaning-only wrongness is rejected.

`find_oddity` is the inverse: exactly three grammatical minimal twins and one
proved ungrammatical answer. `translate_build` requires the target token bank,
one same-part-of-speech decoy and target-language tokenisation proof.
`speed_match` requires an authored bijection and semantic/translation evidence;
it does not pretend to have three grammar distractors.

## Decision

`PASS` requires a complete deterministic result plus PASS from all applicable
agents. `HOLD` is returned for missing, stale, malformed or hash-mismatched
evidence. `BLOCK` is returned for any deterministic failure, any agent BLOCK,
or primary/adversarial disagreement. Only a new immutable candidate can be
reviewed again; changing an old receipt is forbidden.

Reader, nonsense/style and distractor judges run twice in isolated fresh
contexts. Their canonical finding key is `code + jsonPointer + optionIndex +
sha256(normalized exactQuote)`. A remediation is based on repeated keys;
non-overlapping noise remains in the audit record. A one-off P0/P1 factual or
ambiguity finding is never discarded: it is adjudicated against deterministic
evidence or the candidate stays HOLD. Release is blocked until fresh
post-remediation receipts pass.

## Current audit

As of 2026-09-19, the new Arena target registry and basic option checker are
**HOLD**, not release-ready. They do not contain target-specific grammar
validators, a per-option linguistic matrix, independent receipts, exact pool
counts, publication readback, runtime wiring or admin controls. This document
is a release contract for the implementation, not evidence that any target
pool is approved.
