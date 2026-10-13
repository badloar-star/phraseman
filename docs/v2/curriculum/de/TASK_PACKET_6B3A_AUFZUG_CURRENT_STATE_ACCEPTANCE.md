# German Learning V2 — Task 6B3A: `Aufzug` current-state acceptance

## Objective

Make the one bounded acceptance decision required by B2 quarantine for the
unchanged `Aufzug` candidate. B3A uses the B4 current-state method, not a
historical clean-B1 replay and not a retroactive B3 PASS.

## Required authority closure

Before any acceptance, hash-bind the exact final bytes of Stage 0,
German owner decisions, B1 receipt, B2 source adjudication, B2 quarantine,
B3 packet as audit history, B4 packet/authority/advisor/guardian/validation,
this B3A authority record, its target-scoped authority amendment, this B3A
packet and the deterministic B3A final-gate source. A fresh B3A guardian binds
those upstream inputs first.
Manifest P then binds that guardian and the three frozen candidate artifacts
below while retaining
`candidateAcceptance=HOLD`. Fresh reviewers inspect exact P. Manifest F then
binds P plus both fresh review hashes and contains the only proposed terminal
state. The final gate verifies F. This one-way P → reviews → F → gate chain
has no receipt/review cycle; any drift invalidates the decision.

P binds only the target-scoped German closure. English is rejected from B3A
attempt snapshots and closures before it is read; the gate does not baseline,
clean, stage, change or attribute English content. Any drift in a recorded
German closure path fails closed.

## Frozen candidate

| Repository path | SHA-256 |
| --- | --- |
| `modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts` | `10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c` |
| `modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json` | `3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29` |
| `tests/learning_v2_de_lexical_registry_gate.ts` | `3346867a3c40fecf6dcf11ef12c97f9de52a949a7db64870957ac08235c36f58` |

## Required execution

1. B4 absent-candidate probe exits `1` only with
   `aufzug_canonical_materialization_missing`.
2. B4 normal gate exits `0` only with
   `TASK6B4_CURRENT_STATE_CANDIDATE_VALIDATED` and the continuing HOLD
   counters.
3. The real lexical gate exits `0` with the same frozen candidate evidence.
4. A fresh B3A guardian precedes and is hash-bound by manifest P. Independent spec and adversarial
   reviews hash-bind P. F is generated only after their PASS receipts; the
   frozen final gate validates F without post-gate mutation.
5. The reviewer receipts carry prescribed role and distinct fresh task IDs;
   the live orchestration record independently demonstrates those two tasks
   were spawned after P. File text alone is not claimed to prove authorship.

## Non-authority

Until that receipt exists, `candidateAcceptance=HOLD`. A passing B3A receipt
may establish only `b3aAcceptance=ESTABLISHED` and
`candidateAcceptance=ACCEPTED_UNDER_B4_CURRENT_STATE`; it must retain
`b3Acceptance=NOT_ESTABLISHED`, all zero/unverified/HOLD states, and English
exclusion. It cannot write learner RU+UK content, mockups, audio, release,
runtime state or Task 7 contacts.
