# German Learning V2 — Task 6B4A: `Aufzug` current-state acceptance (superseded audit draft)

**Status:** `SUPERSEDED / NO_ACCEPTANCE_AUTHORITY`.

This preserved draft is not an operative task packet. Fresh independent
adjudication found that B2 quarantine requires explicit B3-family acceptance
authority, which B4A cannot create for itself. It is retained unchanged in
substance for audit; `TASK_PACKET_6B3A_AUFZUG_CURRENT_STATE_ACCEPTANCE.md`
is the only proposed acceptance route.

## Historical, non-operative draft content

The text below is preserved solely to document the rejected B4A route. It
grants no authority, authorizes no future receipt and must not be executed.
The operative acceptance route is B3A.

## Historical non-operative preconditions

- `TASK6B4_VALIDATION_RECEIPT_2026-10-11.md` is `VALIDATION_PASS`.
- Fresh B4 RED exits `1` only as
  `aufzug_canonical_materialization_missing`; fresh GREEN exits `0` with the
  exact current-state validation sentinel.
- The real lexical gate remains green against the frozen candidate.
- A fresh spec review and a fresh adversarial review inspect this 6B4A packet,
  the acceptance receipt and the unchanged candidate bytes.

## Historical frozen-candidate record

| Artifact | SHA-256 |
| --- | --- |
| Item evidence | `10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c` |
| Lexical registry | `3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29` |
| Real lexical gate | `3346867a3c40fecf6dcf11ef12c97f9de52a949a7db64870957ac08235c36f58` |

## Rejected acceptance boundary — non-operative

No 6B4A receipt may set
`candidateAcceptance=ACCEPTED_UNDER_B4_CURRENT_STATE`. The following proposed
state was rejected because B2 requires B3-family authority:

```text
b3Acceptance=NOT_ESTABLISHED
rowsPromoted=0
task7Contacts=UNVERIFIED
learnerAuthoring=HOLD
mockup=HOLD
releaseAuthority=HOLD
englishAuthority=EXCLUDED
```

No English file, learner-facing RU+UK bytes, owner mockup, audio, release,
promotion, Task 7 contact or runtime state may be changed by this historical
draft.
