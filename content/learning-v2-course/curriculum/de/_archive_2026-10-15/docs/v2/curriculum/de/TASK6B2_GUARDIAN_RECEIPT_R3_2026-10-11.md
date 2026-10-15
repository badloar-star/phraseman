# German Learning V2 — Task 6B2 guardian / recenter receipt R3: `Aufzug`

**Date:** 2026-10-11  
**Verdict:** `PASS — GUARDIAN/RECENTER PRECONDITION ONLY`  
**Scope of this receipt:** independent guardian/recenter precondition only.

## Narrow authority

This reread checks only whether the current Task 6B2 source-adjudication
documentation has a content-addressed, contained scope sufficient to begin the
two still-required independent reviews of the `Aufzug` draft. It does not
adjudicate DWDS/Duden claims, accept a dictionary source, or alter any
canonical, learner-facing, runtime, mockup, audio, release, or English-contour
artifact.

## Governing inputs read afresh

| Input | SHA-256 |
| --- | --- |
| `TASK_PACKET_STAGE_0.md` | `82d29e357da2e5444aa377de33dd07f06fe12dbaa8f1e3c3de8285d297489ba5` |
| `OWNER_DECISIONS.md` | `eff5412a13531052aa56c1e40f4058f35da405297b418ca8fcbb7b44bc19f615` |
| `RESEARCH_DOSSIER.ru.md` | `55c8cc16bdedcb1e8e3b61bfbd9fb82d61c74a21119f4adc3caa7efd99c76318` |
| `SOURCE_EVIDENCE_LEDGER.md` | `38a878346f1bb410cba6f11311563669b29e91ad63e5eda6f548f21c4c6ce10a` |
| `TASK6B1_LEXICAL_REVIEW_RECEIPT_2026-10-08.md` | `183d82f9f83d5d79ab7078767cb468004b54a6b7fac656022c0daab642bd9bd0` |
| `TASK_PACKET_6B2_AUFZUG_SOURCE_ADJUDICATION.md` | `895071432264e72ceba0b611da4f8e405be8f33b1b35eefde033c55659fc34bf` |
| `TASK6B2_AUFZUG_SOURCE_ADJUDICATION_DRAFT_2026-10-11.md` | `7fdc7151be3d701a73b5c5072efa10416dd1a6d371a87fac4c8c1344a7bae38e` |
| `TASK6B2_QUARANTINE_DECISION_2026-10-11.md` | `e3f700d0d6a8553af4d1807f3188bc16f1c4f3d2f0b20c7a7a571e5768487acf` |
| `TASK6B2_SCOPE_RECEIPT_2026-10-11.md` | `55cfe646f7d0c0ca7cc5f542b5c09128eae22e0c33234a0786020161167f7326` |
| `TASK6B2_GUARDIAN_RECEIPT_R2_2026-10-11.md` | `5bf63db06e10ff6cc724ce02dcf111c53611c61bbc2a488e27a7b19f97d3bb45` |

## Scope and quarantine observations

The scope receipt correctly treats repository `HEAD` as observational rather
than as the Task 6B2 baseline. Its method is a declared documentation-path
whitelist plus fixed SHA-256 values for the three quarantined implementation
artifacts. Both R2 and this R3 receipt are explicitly present in that
whitelist.

The observed targeted command was:

```text
git status --short -- docs/v2/curriculum/de modules/learning-v2/curriculum/de tests/learning_v2_de_lexical_registry_gate.ts
```

The observed output contains only whitelisted documentation paths and no
implementation path. The observed preserved hashes also equal the quarantine
decision:

| Quarantined artifact | SHA-256 |
| --- | --- |
| `modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts` | `10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c` |
| `modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json` | `3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29` |
| `tests/learning_v2_de_lexical_registry_gate.ts` | `3346867a3c40fecf6dcf11ef12c97f9de52a949a7db64870957ac08235c36f58` |

This proves preservation of the observed quarantined bytes, not their
authorization. They remain `QUARANTINED / UNACCEPTED CANDIDATE`.

## Recenter finding

The source-only documentation boundary is current, hash-bound for the
governing inputs and quarantined paths, and uses an explicit target-scoped
whitelist rather than global `HEAD`. The scoped status has no implementation
path outside quarantine. This is sufficient only for the precondition to
obtain the two independent reviews of the already hash-bound draft.

## Gate result

```text
guardian_recenter_precondition=PASS
source_adjudication_closure=HOLD
canonical_materialization=HOLD
task7_and_learner_authoring=HOLD
release_authority=HOLD
english_authority=EXCLUDED
```

## Exact next permitted action

Obtain fresh, independent native-German source-fidelity and exact-spec reviews
of the draft at the hash listed above. They must not edit, accept, promote or
derive authority from the quarantined implementation bytes.

No canonical `Aufzug` row, Task 7 contact, learner session, RU/UK content,
mockup, audio, release, runtime change, or English-contour action is authorized
by this receipt.
