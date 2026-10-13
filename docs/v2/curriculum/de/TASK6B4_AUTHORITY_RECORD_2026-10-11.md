# B4 current authority record

`verdict=PASS_B4_METHOD_PRECONDITION_ONLY`

The single operative B4 authority is
`COUNTERFACTUAL_EXACT_CURRENT_MINUS_CANDIDATE`. It replaces only the
unavailable clean-B1 replay mechanism for Task 6B4. It neither claims a
historical replay nor retroactively accepts B3/B1/B2.

```text
historicalB1Replay=UNAVAILABLE_NOT_CLAIMED
supersedes=CLEAN_B1_REPLAY_MECHANISM_FOR_TASK6B4_ONLY
doesNotSupersede=B1_ACCEPTANCE,B2_SOURCE_FACTS,QUARANTINE_NON_AUTHORITY
candidateAcceptance=HOLD
rowsPromoted=0
task7Contacts=UNVERIFIED
learnerAuthoring=HOLD
releaseAuthority=HOLD
englishAuthority=EXCLUDED
```

## Provenance and exact closure

This record establishes the procedure from Stage 0, owner decisions and the
preserved B1/B2/quarantine/B3 evidence. A fresh independent final method
advisor must hash-bind this exact record and the B4 packet externally; that
advisor receipt is verification evidence, not an additional authority source.
The fresh guardian must bind this record and that exact final receipt before a
B4 gate can run. All prior advisor receipts are audit history only.

## Current B4 allowlist

Only these B4 artifacts may be changed while closing B4: the B4 packet, this
record, the advisor receipt, a fresh B4 guardian receipt, the B4 gate, and a
later B4 acceptance receipt. Frozen candidate bytes are read-only inputs.
`TASK6B4_METHOD_SCOPE_ADJUDICATION_2026-10-11.md`,
`TASK6B4_AUTHORITY_AND_SCOPE_ADJUDICATION_2026-10-11.md`, B2 R3/R4 and the
B2 scope receipt are audit history; their allowlists are not current B4
authority. English is outside this allowlist.
