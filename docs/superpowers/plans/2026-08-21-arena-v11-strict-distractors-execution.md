# Arena V11 strict distractors — execution delta

Date: 2026-08-21

This plan narrows and extends the approved
`2026-08-08-tournament-semantic-quality-v11.md` plan for the Arena owner rule
recorded as D-76. The older plan remains the source of truth for resumable
review jobs, immutable receipts, zero-write audit artifacts, and guarded
publication. This delta wins where the older plan allowed lexical or contextual
choice traps or assumed the Tournament barrier would switch Arena.

## Non-negotiable contract

- `guess_phrase` and `fill_gap`: one grammatical answer plus exactly three
  ungrammatical minimal twins in the same slot, frame, and part of speech.
- A deterministic rule must recompute why every wrong completion is invalid.
  Declared `grammaticality`, `minimalTwin`, or `partOfSpeech` metadata is not
  proof.
- `find_oddity` is the inverse: three grammatical minimal twins and one
  mechanically proved grammatical error.
- `translate_build` keeps one competing decoy; `speed_match` keeps six exact
  bilingual pairs. The three-distractor rule does not alter those mechanics.
- V10 is immutable and remains live until the complete V11 gate passes.

## Phase 1 — deterministic grammar proof core

1. Add `tournament_pool_v11_grammar_twins.ts` with a versioned rule catalog,
   typed evidence, canonical validation, and no metadata-trust path.
2. Start with rules whose grammaticality is mechanically decidable from the
   authored sentence: subject/be agreement, be-form agreement, article
   number/form, modal + base form, do-auxiliary + base form, and `to` + base
   form. Ambiguous forms fail closed.
3. Test metadata spoofing, semantic substitutions such as `locks`, exact
   one-slot reconstruction, same POS, one-valid/three-invalid cardinality,
   contractions, irregular forms, and duplicate/length giveaways.

Acceptance: every returned twin set revalidates from the source phrase and
rule catalog; no lexical/context/collocation/reference trap is representable.

## Phase 2 — all five candidate factories

1. Project one proved twin set into both `fill_gap` and `guess_phrase`
   candidates and immediately call `createTournamentSemanticCandidate` and
   `validateTournamentSemanticCandidate`.
2. Build oddity candidates from the inverse proof matrix.
3. Build translate and speed candidates from exact authored provenance.
4. Add deterministic stable IDs, semantic signatures, difficulty, topic,
   source provenance, and rule-catalog hash.

Acceptance: all candidates pass the semantic V2 contract and their independent
grammar-proof validator. No factory can emit an unpublished candidate by
asserting review metadata alone.

## Phase 3 — capacity, difficulty, and diversity

1. Measure the checked-in 546-day corpus after all ambiguity rejections.
2. Add more formally proved grammar rules until every mode/difficulty cell has
   review rejection headroom; never weaken the owner rule to fill a quota.
3. Enforce caps per source phrase, option set, grammar rule, lemma, topic, and
   provenance key. Run the 730-day exposure/repetition simulation.

Acceptance: exact 4,000 selected tasks, exact cell quotas, 4,000 distinct
semantic signatures, and positive headroom after deterministic rejection.

## Phase 4 — independent semantic review and immutable bundle

Implement the approved two-pass review, model-pair budget, attempt state
machine, immutable receipts, resumable job, history exclusion, and server-only
bundle. A receipt must pin candidate hash, grammar-rule-catalog hash, review
contract version, model/reviewer identity, and a complete per-option matrix.
Primary and adversarial receipts must come from different reviewer identities.

Local Codex execution may use deterministic/fake providers only. It must not
use a project or user OpenAI API key. Real provider review is a separate
owner-authorized production operation.

## Phase 5 — zero-write audit and immutable publication

Produce ignored local artifacts: candidates, rejection summary, rule and
diversity counts, review index, exact manifest/bundle/receipt hashes, Merkle
root/proofs, and the 730-day simulation. The dry run must report
`productionWrites: 0`. Stage V11 as new documents and retain all V10 documents.

## Phase 6 — Arena-safe dual-publication runtime

1. Add an exact allowlisted publication registry containing V10 and a
   hash-pinned V11 record.
2. Make both `arena_v2.ts` and `arena_expansion.ts` select the publication
   captured from `arena_v2_config/current`; remove independent hard-coded V10
   prefixes from their loaders.
3. Deploy the dual runtime while the pointer still selects V10.
4. After exact V11 readback, switch the Arena config pointer with a
   transaction/CAS pinned to expected V10 and exact V11 hashes.
5. Rollback is the inverse pointer CAS. It never restores or mutates task data.

Existing matches remain stable because their selected tasks are frozen in
private match state. The retired Tournament product gate is not changed.

## Mandatory verification before activation

- focused unit tests for every phase, Functions TypeScript emitted build, and
  the full protected Arena suites;
- Firestore recursive denies and emulator contracts for every new server-only
  root, plus Jarvis unread/data-contract gates;
- exact 4,000-task readback, validation, receipt parity, content hash, Merkle
  proof, quota, diversity, and protected-room checks;
- independent linguistic review with zero blockers;
- fresh read-only code review of the producer, publication CAS, both Arena
  loaders, Rules, and rollback;
- no deploy or pointer switch while any gate is red or review is incomplete.
