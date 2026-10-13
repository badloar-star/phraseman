# German Learning V2 — Task 6B2 guardian / recenter receipt R2: `Aufzug`

**Date:** 2026-10-11  
**Verdict:** `PASS — GUARDIAN/RECENTER PRECONDITION ONLY`  
**All other authority:** `HOLD`.

## Narrow authority

This is an independent reread of the source-adjudication boundary before any
further Task 6B2 action. It establishes only that the current source-only
documentation scope is centred on the exact `Aufzug` candidate and that the
quarantined implementation has not been silently accepted by the observed
scoped Git status.

It does **not** adjudicate dictionary facts, replace the required native-German
or exact-spec reviews, authorize a canonical row, accept a test, authorize
Task 7, or authorize a learner-facing session. Canonical registry bytes,
learner-facing bytes, release/runtime/mockup/audio bytes, and every English
authority are expressly outside this receipt.

## Content-addressed inputs

The eight governing inputs named for this reread, read afresh, are:

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

The current scope receipt is an audit witness rather than one of those eight
governing inputs. It was also read afresh and has SHA-256
`1e5bbfde532d705ec2f5c077f3d21efa39d1e366ae8507230dec7333a71e1260`.

## Recenter findings

1. Stage 0 and the owner decisions require an independent `judge_recenter`
   before and after every learner-facing session. Task 6B2 is not a
   learner-facing session; its packet limits it to source adjudication.
2. Task 6B1 permits only a subsequent candidate-only source adjudication of
   `de_lex_plan_l01_c02_aufzug_v1`. It does not authorize canonical
   materialization.
3. The Task 6B2 packet, draft and quarantine decision agree on the limitation
   `NO_PRODUCTION_POLICY_REGION_OR_PACKET_CONTACT_AUTHORITY` and on the
   prohibition of canonical promotion, Task 7, learner text, mockup, audio,
   release and English-contour edits.
4. Therefore the precondition for fresh, independent native-German and
   exact-spec reviews of the **draft only** is satisfied. Their verdicts remain
   absent from this receipt; source adjudication as a whole remains `HOLD`.

## Scoped status and quarantine semantics

Observed command:

```text
git status --short -- docs/v2/curriculum/de modules/learning-v2/curriculum/de tests/learning_v2_de_lexical_registry_gate.ts
```

Observed result contains only two Task 6B2 documentation paths:

```text
 M docs/v2/curriculum/de/TASK6B2_QUARANTINE_DECISION_2026-10-11.md
?? docs/v2/curriculum/de/TASK6B2_SCOPE_RECEIPT_2026-10-11.md
```

That is compatible with the documentation whitelist. No canonical module,
registry JSON or lexical gate test appeared as a current scoped modification.
Their observed bytes match the preserved quarantine fingerprints:

| Quarantined implementation artifact | Observed SHA-256 |
| --- | --- |
| `modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts` | `10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c` |
| `modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json` | `3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29` |
| `tests/learning_v2_de_lexical_registry_gate.ts` | `3346867a3c40fecf6dcf11ef12c97f9de52a949a7db64870957ac08235c36f58` |

Hash equality proves preservation of the specific observed bytes, not their
authorization. Those bytes remain `QUARANTINED / UNACCEPTED CANDIDATE` and are
not Task 6B2 output.

## Gate result

```text
guardian_recenter_precondition=PASS
source_adjudication_closure=HOLD
canonical_materialization=HOLD
task7_and_learner_authoring=HOLD
release_and_english_authority=EXCLUDED
```

## Next allowed action

Obtain two fresh independent reviews of the hash-bound Task 6B2 draft: one
native-German source-fidelity review and one exact-spec review. They must not
edit or accept quarantined implementation bytes. Any later canonical action
requires a separately authorized Task 6B3 with its own RED/GREEN proof and
reviews.
