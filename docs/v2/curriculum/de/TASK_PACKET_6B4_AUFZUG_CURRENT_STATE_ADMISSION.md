# German Learning V2 — Task 6B4: `Aufzug` current-state admission

## Purpose

Evaluate the preserved `Aufzug` candidate against the exact current German
contract. This packet does not claim a historical B1 replay: the exact old
B1 evidence, registry and gate bytes are unavailable after recovery searches.

`redMode=COUNTERFACTUAL_EXACT_CURRENT_MINUS_CANDIDATE`

`historicalB1Replay=UNAVAILABLE_NOT_CLAIMED`

## Frozen current candidate

- evidence: `10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c`;
- lexical registry: `3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29`;
- lexical gate: `3346867a3c40fecf6dcf11ef12c97f9de52a949a7db64870957ac08235c36f58`.

The candidate is `de_lex_l01_c02_aufzug_v1`, source plan
`de_lex_plan_l01_c02_aufzug_v1`, evidence
`DE-LEX-ITEM-L01-C02-AUFZUG-SENSE-FORM-001`: `der Aufzug`, plural `die
Aufzüge`, curriculum sense `lift in a building`. The exact limitation remains
`NO_PRODUCTION_POLICY_REGION_OR_PACKET_CONTACT_AUTHORITY`.

## Gate contract

Before dynamic imports or child execution, the B4 gate checks the complete
current code/authority closure: the B4-only authority record, its independent
advisor receipt, its fresh B4 guardian, the preserved B1/B2/quarantine audit
chain and the frozen candidate hashes. B2 guardian R4, the B2 scope receipt
and the earlier B4 adjudications are audit history, not current B4 authority.
Its
counterfactual probe removes only the candidate lexical row and item evidence
from in-memory copies, validates the remaining `Nachbarin` row/evidence with
the real parsers, then fails exactly `aufzug_canonical_materialization_missing`.
It does not call that counterfactual a historical B1 snapshot.

The normal gate runs the real current lexical gate with `process.execPath`,
the resolved local `tsx` preload, absolute paths and `shell:false`. It may
emit only `TASK6B4_CURRENT_STATE_CANDIDATE_VALIDATED`; acceptance requires
fresh independent reviews and a separate receipt.

Required RED and GREEN commands are respectively:

```text
node --import tsx tests/learning_v2_de_aufzug_current_state_admission_gate.ts --probe absent-aufzug
node --import tsx tests/learning_v2_de_aufzug_current_state_admission_gate.ts
```

Both modes use the same candidate-required validator; the first must fail only
with `aufzug_canonical_materialization_missing`, and the second must pass.

## Non-authority

B4 does not promote rows, create Task 7 contacts, author learner-facing
RU+UK content, alter the owner mockup, generate audio, change runtime/release
state or modify English Learning V2. Expected status remains
`rowsPromoted=0 task7Contacts=UNVERIFIED status=HOLD`.
