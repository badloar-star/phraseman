# Dialogue V2 content review handoff

This is a reviewer aid only. It neither approves content nor changes the
release status.

## Candidate under review

- Candidate ID: `dialogue-v2-content-candidate-v1`
- Manifest SHA-256: `05592659b736d48d5592e79dff5713e1d5da3ce1e84f722b6ef1e8f2d5826d5f`
- Packets: 304 (76 source scenarios × 4 supported study targets)
- Study targets: `en`, `es`, `fr`, `de`
- Objectives per packet: 6–8
- Worlds per target: `social`, `work`, `everyday`, `travel`
- Rank sequence in every target/world: 1–19

Each study target contains the same CEFR distribution: A1 20, A2 20, B1 12,
B2 12, C1 8, C2 4.

## Required independent verdicts

The authoritative receipt remains
`dialogue_v2_content_review_receipt.pending.v1.json` until every required role
has supplied its real verdict and authority reference.

| Required role | Reviewer checks | Verdict |
| --- | --- | --- |
| `targetContractGuardian` | Target keys, packet identity, rank/CEFR/world alignment | Pending |
| `scenarioPackReviewer` | Scenario usefulness, objective sequence, and group-chat fit | Pending |
| `promptLanguageJudge` | Natural target-language copy, level appropriateness, correction tone | Pending |
| `voiceLocaleGate` | Voice-mode compatibility and locale-safe prepared-copy eligibility | Pending |
| `stateIsolationJudge` | No cross-language or cross-scenario state assumptions in content | Pending |
| `surfaceMatrixGate` | Briefing, tasks, locks, completion and freeform surface consistency | Pending |

## Review boundary

Review the immutable candidate and its referenced locale drafts only. Do not
promote or alter the receipt from this document. Promotion is valid only when
the receipt schema validates, the manifest hash matches exactly, and an
owner-authorized workflow records all six verdicts.
