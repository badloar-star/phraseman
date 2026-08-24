# Arena distractor audit — 2026-08-21

## Verdict

The live pool `tpool_20260801_v10` fails the owner's strict distractor rule in
`guess_phrase`. All 1,493 tasks in that mode contain at least one
lexical/meaning replacement, and zero tasks have three explicitly grammatical
error reasons. The pool must not be presented as grammar-audited or reused as
the source for the next publication.

The audit was read-only. It did not write Firestore, publish a pool, deploy
Functions, or change an active match.

## Live-pool inventory

| Mode | Tasks | Mode-specific result |
|---|---:|---|
| `guess_phrase` | 1,493 | **FAIL:** 4,439/4,479 distractors are explicitly lexical/meaning replacements; all 1,493 tasks are affected; 0 tasks have three grammatical-error reasons |
| `fill_gap` | 500 | 1,500/1,500 distractors have explicit grammar reasons and each task has exactly three |
| `find_oddity` | 315 | Structural matrix is intact: one declared broken answer and three safe alternatives; 52 safe alternatives have low token overlap and need a separate linguistic review before reuse |
| `translate_build` | 1,500 | Exactly one form-related decoy in every task; no unrelated decoy found by the deterministic audit |
| `speed_match` | 192 | Six-pair bijection is structurally valid in every task; this mode has semantic mismatches, not three choice distractors |

Exact live mode/difficulty cells: `guess_phrase` 470/554/469,
`fill_gap` 160/180/160, `find_oddity` 110/205/0,
`translate_build` 400/700/400, and `speed_match` 60/70/62.

Total: 4,000 documents, including 2,308 four-option tasks and 6,924 declared
choice distractors. Cardinality, uniqueness, answer index, and per-option
explanation shape passed. Those structural passes do **not** prove linguistic
quality.

## Root cause

1. The V10 deterministic factory preferred grammatical mutations but filled
   missing slots with `lexical_meaning` substitutions. That fallback made the
   options look parallel while allowing grammatically valid wrong answers.
2. The generator prompt explicitly allowed situation distractors that were
   “grammatically fine but wrong in this moment” and prioritized synonyms,
   false friends, literal translations, and collocations.
3. The runtime/publication gate verified four options, exactly three wrong
   indices, explanations, hashes, and signatures, but it trusted declared
   semantic roles. It did not require proof that every wrong completed phrase
   was ungrammatical or that every option tested one part of speech.

## Strict rule encoded for the replacement pipeline

For `situation`/`guess_phrase` and `gap`/`fill_gap`:

- exactly four unique minimal twins;
- exactly one grammatically valid answer;
- all three wrong options are grammatically invalid in the completed phrase;
- all four test the same part of speech and sentence frame;
- lexical, contextual, stylistic, politeness-only, collocational, or
  meaning-only wrongness cannot pass as a distractor;
- every wrong option has its own distinct Russian grammatical proof;
- both the primary and adversarial judges must return a complete per-option
  grammar matrix; missing, duplicated, mixed-part-of-speech, non-minimal, or
  ambiguous evidence fails closed.

Mode-specific inverse: `find_oddity` remains solvable only when three options
are grammatical minimal twins and exactly the declared answer is
ungrammatical. Making all four options broken would destroy the answer key.
`translate_build` has one decoy, and `speed_match` uses pair mismatches, so the
“three grammar distractors” rule does not apply to those different mechanics.

The semantic review contract is now `tournament-semantic-review-v2`.
Grammar-choice candidate objects accepted by that contract require
`partOfSpeech`, `grammaticality`, and `minimalTwin` evidence, and reject
`lexical_meaning`, `collocation`, `reference`, and `function_choice` as grammar
distractor types. The current primary/adversarial prompt set is v3: both judges
must assess every review subject independently, must not trust self-declared
candidate metadata, and must return the exact per-subject matrix. The strict
parser enforces the mode-specific matrix: grammar modes require same-POS
minimal twins and the exact valid/invalid roles, `translate_build` requires the
same-POS decoy while grammar fields are `not_applicable`, and `speed_match`
requires the explicitly non-grammar matrix. Missing semantic proof fails closed
even when candidate metadata claims the right role.

This is not yet an active live publication. The legacy per-mode admin AI
generator callables remain tombstoned; the existing `adminFillTournamentPool`
source route now owns the unpublished V11 candidate/review pipeline for all
five modes, but no deployment or pointer switch was performed by this audit:

- the grammar proof is rebuilt from the authored sentence instead of trusting
  distractor metadata;
- each candidate carries the exact source provenance, proof rule, completed
  sentence for every option, catalog version, and catalog SHA-256;
- candidate IDs and content hashes are bound to the canonical proof, so a
  changed option, reason, source, or ID fails closed;
- malformed source words, ambiguous lexical reparses, affirmative `do`,
  perfect/progressive substitutions, embedded/subjunctive `be`, and mixed-POS
  traps are rejected;
- safe direct/inverted agreement, modal/do-support, negative do-support,
  allowlisted infinitive, `let's`, irregular agreement, reviewed preposition /
  transitive-object pronoun case, and sentence-initial subject-pronoun case are
  accepted;
- `find_oddity` uses three mechanically generated grammatical minimal twins
  in one shared frame and exactly one proved agreement error; unrelated
  authored sentences are never mixed; `translate_build` has one same-POS decoy; `speed_match`
  keeps a six-pair authored bijection;
- every candidate carries the authored topic, source-day and provenance data
  needed by the diversity manifest.

The current full-corpus build produces 37,337 unique candidates after 924
duplicate semantic signatures are rejected:

| Mode | D1 | D2 | D3 | Live-compatible quota | Result |
|---|---:|---:|---:|---:|---|
| `guess_phrase` | 2,504 | 4,042 | 1,861 | 470/554/469 | positive raw headroom |
| `fill_gap` | 2,504 | 4,042 | 1,861 | 160/180/160 | positive raw headroom |
| `find_oddity` | 327 | 294 | 105 | 110/205/0 | positive raw headroom |
| `translate_build` | 4,601 | 9,523 | 5,140 | 400/700/400 | positive raw headroom |
| `speed_match` | 127 | 264 | 142 | 60/70/62 | positive raw headroom |

Raw option triples are not treated as independent content. The constrained V11
selector now returns exactly 4,000 distinct semantic signatures in the exact
15 live-compatible cells. It caps a source phrase at four selections per mode,
caps each `fill_gap` option set at ten and each correct token at forty, and
selects at least 300 content-word gaps, at most 75 article/`to be` gaps, and at
least 75 first, middle, and last positions (middle never exceeds 325).
Canonical grammar evidence is retained inside the content hash and recomputed
again by selection and bundle finalization, so relabelling grammatical lexical
choices as invalid grammar cannot pass downstream. The strict two-pass review
parser, fake-tested production adapter, fenced attempt accounting, prompt-set
hash, distinct-reviewer enforcement, create-only receipt contract, and
canonical-4,000 bundle finalizer exist. The non-runtime publication contour now
also has a deterministic resumable job contract with fenced leases, revisioned
terminal checkpoints, exact cached PASS/REJECT reuse, retry state that survives
a deadline continuation, a two-retry ceiling, budget pause, shortage reporting,
and a write-free dry-run projection. Bundle publication no longer attempts one
4,000-document loop: immutable tasks are written and read back in bounded
create-only batches behind a plan-hash-bound durable checkpoint, and the ready
root is created last.

Dry-run input must explicitly prove `providerCalls: 0` and
`productionWrites: 0`; its output repeats both zeros, emits complete validated
runtime-task artifacts, and can never claim `ready`. Provider attempts use
per-job monotonic ordinals. The current job lease is transactionally reread
immediately before a provider call, the returned model result is durably
persisted before billing/recording, and retry reconciliation reuses that result
without another call or charge. A paid primary result is checkpointed across a
budget pause before adversarial review. Receipts bind the candidate's canonical
`semanticSignature` directly, so historical dedup remains stable when content,
provenance, or explanation text changes without changing reviewed semantics.

Concrete Firestore adapters and the permission-preserving admin
`dry_run`/`run_batch`/`status` route now exist. The three semantic collections
are recursively denied to clients, including admins, and the runtime loader
accepts V11 only with exact task-count, manifest, bundle, receipt-ledger, and
exposure-layout barrier pins. Incomplete bundle publication remains `running`
with a continuation; only the final all-gates checkpoint becomes `ready`.
Migration validation independently recomputes every artifact hash and exact
task ID, requires the diversity and 730-day exposure gates, and stages only
complete validated runtime documents. Apply and rollback remain guarded,
preflight-first scripts; neither has been executed by this audit.

Focused fake-only verification includes the actual checked-in source corpus →
V11 selector → exact PASS receipt fixtures → production finalizer → production
runtime path for 4,000 tasks over 730 days. It asserts 16 unique tasks per room,
zero task/provenance overlap between adjacent rooms in each series, and complete
task/bucket coverage while retaining bounded bucket reads. These exact PASS
fixtures validate pipeline identity and runtime exposure, not independent human
linguistic approval; real publication still requires real independent receipts.

## Release consequence

The live V10 data has not been rewritten or deployed by this audit. The V11
producer calls `createTournamentSemanticCandidate` plus
`validateTournamentSemanticCandidate` as a mandatory fail-closed gate. Raw
capacity, deterministic 4,000-task selection, artifact validation, and the
server-only bundle/runtime path pass fake-only contracts. Publication is still
blocked on actual independent semantic receipts and an owner-authorized,
preflighted migration/pointer switch. A replacement pool must still be
generated, independently linguistically reviewed, published under a new pool
version and hashes, and only then selected by Arena. V10 must stay classified as
failed until that rollout is complete.

Machine-readable evidence from the read-only run is stored outside source at
`.codex-tmp/arena-distractor-audit-20260821/live-v10-distractor-audit.json`.
