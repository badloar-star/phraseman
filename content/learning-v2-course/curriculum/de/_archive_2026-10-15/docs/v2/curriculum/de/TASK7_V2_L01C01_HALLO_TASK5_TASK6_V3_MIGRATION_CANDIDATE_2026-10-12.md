# HALLO Task5/Task6 v3 migration candidate

Date: 2026-10-12  
Status: `HOLD`  
Decision: `PROPOSED_EXACT_SUCCESSOR_NOT_ACTIVATED`

## Scope

This packet records a closed, additive migration candidate for the single
`de_l01_c01` Hallo mismatch. It creates evidence-local full-copy candidates;
it does not create or replace a canonical Task5/Task6 path.

- Task5 candidate keeps the complete v2 topology and changes exactly seven
  values: schema v3, the Hallo plan ID, semantic identity, sense gloss,
  utility facet value, checkpoint goal, and checkpoint context signature.
- Task6 candidate keeps the complete v2 registry and changes only its schema
  to v3, the old Hallo/Nachbarin phrase row to the exact `Hallo!` successor,
  clears that row's lexical senses, and points the existing `de_l01_c01`
  mapping to the successor ID.
- The plan-to-frame relation is exactly
  `de_lex_plan_l01_c01_hallo_v2 → de_pf_l01_c01_hallo_v2`.
- The captured Goethe occurrence supports only the exact alternative surface
  `Hallo!`; `DE-RSCH-CEFR-003` remains general CEFR scope evidence and is not
  represented as exact phrase attestation.

## RED

Command:

```text
npx tsx tests/learning_v2_de_task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_gate.ts
```

Observed before implementation: exit `1`, `MODULE_NOT_FOUND` for
`task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1`.

## Candidate authority

The candidate is not canonical admission and grants no Task7, preauthoring,
learner-facing, release, or consumer authority. It preserves:

- `rowsPromoted = 0`;
- Task7 inventory `288 / 6 / 282 / 1792 / 0`;
- owner blueprint approval `PENDING`;
- `consumerCutover = NONE` and `defaultConsumerChanged = false`.

No German learner packet, RU/UK learner content, audio, or owner mockup is
created. No English file, v1 file, canonical path, inventory, or consumer is
edited by this packet.

The validator independently re-runs the fixed-path Hallo source inspector,
binds its source-module bytes, and rejects drift in the captured raw evidence.
It also re-hashes the protected English surface and the pre-existing German v1
surface while excluding exactly 17 closed additive artifacts across the bound
Hallo allocation, phrase-authority HOLD, correction-candidate, and v3-candidate
lineage. Every exclusion must be a unique normalized repo-relative regular file
inside the repository; symlinks and missing files fail closed. The excluded
phrase-authority validator is separately bound by SHA-256, while the remaining
source, correction, and candidate artifacts retain their existing exact byte or
semantic bindings. The validator and manifest themselves remain bound by the
frozen six-file review SHA set. Test path injection is additive: it cannot mask
a fixed manifest, Task5/Task6 input, candidate, inventory, owner contract, or
source extraction. Fixed artifacts are validated first and any injected hostile
copy is validated additionally. Forbidden canonical v3, learner packet, RU/UK,
audio, and mockup paths are checked with `lstat` both before validation and
immediately before return; a broken symlink or a start/end state change fails
closed. After every injected hostile input has been processed, the validator
re-opens and revalidates the fixed manifest, Task5/Task6 upstreams and
candidates, inventory, owner contract, extraction/source artifacts, correction
bindings, and both protected-surface digests. It also compares start/end
fixed-input snapshots, beginning before the first fixed-artifact read and
covering every one of the 1,570 English and 74 German protected files. Each
entry must be a regular non-symlink whose realpath stays inside the repository;
the snapshot binds its `lstat` identity, realpath, metadata, and content
SHA-256, so a late fixed-path mutation, replacement, rename, symlink escape, or
post-override drift cannot receive a verdict. Every intermediate protected-
surface pass is compared to the opening entry identity rather than only to its
content digest. Forbidden-output stability is also checkpointed after the
fixed manifest, before and after every injected hostile input, between bound
artifact phases, and immediately before return; a transient injected output
observed at any validation boundary fails closed.
Fixed and protected bytes are read through an opened handle (using
`O_NOFOLLOW` where the platform exposes it), with path `lstat`/realpath checks
and descriptor `fstat` identity checks both before and after the read. The
opened descriptor, path entry, and opening baseline must agree, closing the
`lstat`-to-open atomic-replacement window.
The legacy source inspector is executed inside a synchronous fixed-read guard:
every repository path present in the opening baseline is served only by that
same descriptor-bound reader. Its manifest, extraction map, raw HTML/PDF,
HTTP metadata, Task5, and inventory reads therefore cannot be redirected to a
byte-identical alternate inode while path snapshots continue to observe the
original file.

## Artifact set

Exactly six new repository files belong to this packet:

1. `modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/manifest.json`
2. `modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/task5_v3_candidate.json`
3. `modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_v1/task6_v3_candidate.json`
4. `modules/learning-v2/curriculum/de/task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_de_v1.ts`
5. `tests/learning_v2_de_task7_v2_l01_c01_hallo_task5_task6_v3_migration_candidate_gate.ts`
6. `docs/v2/curriculum/de/TASK7_V2_L01C01_HALLO_TASK5_TASK6_V3_MIGRATION_CANDIDATE_2026-10-12.md`

## Review boundary

Native and spec review are required on the frozen six-file bytes. Adversarial
review may start only after both pass. A reviewer PASS cannot activate the
candidate; canonical migration, inventory resolution, owner fingerprint
approval, learner authoring, materialization, release, and consumer cutover all
remain separate future authority steps.
