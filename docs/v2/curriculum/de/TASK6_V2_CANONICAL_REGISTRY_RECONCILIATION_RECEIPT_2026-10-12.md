# German Task 6 v2 canonical registry reconciliation — Phase B

**Date:** 2026-10-12  
**Status:** `HOLD_PHASE_B_REVIEW_PENDING`  
**Phase B review status:** `PENDING_EXTERNAL_REVIEWS`

<!-- TASK6_V2_LEXICAL_REGISTRY_SHA256: 31934e35b5278c7a7e901d08e02da5398f3503825782acbb604d06de094726a5 -->
<!-- TASK6_V2_CANONICAL_BUNDLE_SHA256: ba4ddc48ce99aeb97788ba767e2179c507c8740be24446cbf6b4f9abf591681f -->
<!-- TASK6_V2_GATE_SHA256: b0fd5ed0f11273a18d70c2d60e3171bc4e22c8bcbafcb92a6924be45a54d104b -->

## Scope

Phase B materializes an additive, separately content-addressed German Task6-v2
registry. It preserves both Task6-v1 lexical rows exactly, adds only the four
reviewed L02 rows (`wohnen`, `Küche`, `Tasse`, `Teller`), and preserves the v1
phrase-frame and pronunciation arrays canonically unchanged. There are no L02
phrase-frame or pronunciation claims.

The upstream source-admission candidate and evidence remain permanently
candidate-only with `canonicalAdmission: FORBIDDEN`. Phase B grants only
`ADMITTED_FOR_TASK6_V2_REGISTRY_ONLY` materialization authority inside the new
additive v2 files. It does not reinterpret or mutate Phase A.

## Authority boundary

- status: `TASK6_V2_CANONICAL_PARTIAL`;
- materialized rows: 6 total = 2 preserved v1 + 4 new L02;
- `rowsPromoted: 0`;
- `task7Status: TASK7_HOLD` and `task7Unlock: false`;
- `learnerFacing: false`;
- `phraseClaims: false`;
- `releaseAuthorized: false`;
- `consumerCutover: NONE` and `defaultConsumerChanged: false`.

No default consumer or cutover was changed. The existing default consumer stays
bound to `lexical_senses_de_v1.json`; neither v2 registry is imported by a
runtime/default loader.

## Predecessor evidence

All eight frozen Phase-A files were re-hashed before Phase B. The hashes in the
v2 bundle match the final Phase-A freeze. The Phase-A migration, `wohnen`
valency, source-candidate, and v1 canonical-registry gates were rerun and
passed.

The three Phase-A review verdicts were reported by independent orchestration
tasks:

- native: `/root/l02_task6_v2_phase_a_native_review_r3` — PASS, P0/P1/P2 = 0;
- exact spec: `/root/l02_task6_v2_phase_a_spec_review_r3` — PASS, P0/P1/P2 = 0;
- adversarial: `/root/l02_task6_v2_phase_a_adversarial_review_r2` — PASS,
  P0/P1/P2 = 0.

These are `ORCHESTRATION_ATTESTED_SUMMARY_NOT_SELF_AUTHENTICATING` records.
Run IDs and thread IDs were not exposed and are not invented. The summaries do
not self-grant Phase-B admission, Task 7, learner-facing, cutover, or release
authority.

## TDD evidence

RED command:

```text
node --import tsx tests/learning_v2_de_task6_canonical_registry_v2_gate.ts
```

Observed RED:

```text
AssertionError: task6_v2_phase_b_missing:modules/learning-v2/curriculum/de/registries/lexical_senses_de_v2.json
```

Observed GREEN after materialization:

```text
TASK6_V2_CANONICAL_REGISTRY_GATE PASS lexical=6 legacy=2 l02=4 phraseFrames=v1-preserved pronunciation=v1-preserved rowsPromoted=0 task7=HOLD consumerCutover=NONE
```

Additional deterministic verification:

- Phase-A migration, `wohnen` valency, v1 canonical registry, v1 phrase-frame,
  and v1 pronunciation gates: exit 0;
- task-scoped TypeScript compile for the Phase-B gate and its imports: exit 0;
- ESLint for the Phase-B gate: exit 0;
- Prettier check for all four Phase-B files: PASS;
- OpenAI/API/deploy/push scan for all four Phase-B files: no matches.

A repo-wide `tsc --noEmit` was also attempted. It terminated at the Node 4 GB
heap limit after approximately 214 seconds without emitting a TypeScript
diagnostic. This infrastructure OOM is recorded as unverified, not converted to
a PASS. The required task-scoped compile above passed.

Fresh native, exact-spec, and adversarial Phase-B reviews are still required on
the frozen hashes above.
