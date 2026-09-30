# Dialogue V2 readiness matrix — 2026-09-28

This report is an evidence matrix, not a release approval. No deploy,
publication, production Firebase access, or provider request was performed.

| Requirement | Current evidence | Status |
| --- | --- | --- |
| Four supported dialogue targets | `DIALOGUE_V2_STUDY_TARGETS = en/es/fr/de`; `dialogues:language-contours-gate` passes and unknown targets fail closed | PASS |
| 76 sequential scenarios in every target | Candidate check passes for 304 packets; each target has A1 20, A2 20, B1 12, B2 12, C1 8, C2 4; every target/world has ranks 1–19 | PASS, candidate-only |
| 6–12 goals per scenario | Candidate audit: 6–8 objectives per packet | PASS, candidate-only |
| Rank opens scenarios without purchases | `dialogue_v2_local_rank_access` 11/11; V2 live-path contract excludes purchases/runes | PASS |
| Free 30 replies per calendar month | `dialog_quota_contract`, start and authorization tests: 31/31 | PASS |
| Plus Freeform with persistent per-language memory | Freeform functions suite 267/267; memory/delete suite 55/55 | PASS |
| Group chat personas and cost-aware silence | V2 server suite 113/113 covers server-owned personas, 0–2 replies, replayed silence and quota preservation | PASS |
| Learner voice messages | Voice tests cover exact transcript attachment, local replay, no transcript exposure and locale guard | PASS |
| Completion assessment | Client 12/12 and server 7/7 cover stored overall assessment, goals, corrections and idempotent replay | PASS |
| Firestore isolation | Local Firestore Emulator rules: 15/15 | PASS |
| Design 2.0 component rendering | Local visual fixture captured catalogue, briefing, Freeform and scenario components with Design 2.0 tokens; fixture is not authenticated app acceptance | PASS, fixture-only |
| Content release receipt | Owner-approved receipt exactly matches the immutable candidate; promotion gate passes | PASS for promotion; no active release pointer |
| Occasional bot voice | Explicitly deferred by owner for this release. The guarded infrastructure remains inert with a `null` catalog and is excluded from release acceptance | DEFERRED by owner |
| Production/release acceptance | Owner-only action; not attempted | NOT RUN by design |

## Known non-V2 noise

Legacy tests currently reference removed purchase/XP surfaces and/or fail in
`app/ai_dialog_ownership.ts`. They are not evidence for, and are not used to
approve, the active V2 route. They remain project-wide maintenance work.

## Evidence boundaries

The candidate content status cannot be promoted by an automated test or this
report. The visual fixture cannot prove a live authenticated release route.
Both require their respective authorized review/acceptance steps.
