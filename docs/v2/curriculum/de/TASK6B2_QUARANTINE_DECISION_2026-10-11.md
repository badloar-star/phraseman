# German Learning V2 — Task 6B2 quarantine decision: `Aufzug`

**Status:** `QUARANTINED / UNACCEPTED CANDIDATE`.

## Decision

Existing uncommitted `Aufzug` registry, evidence and test bytes are preserved
in place. They are not accepted as Task 6B2 output, do not receive canonical
authority and cannot open Task 7, learner-facing authoring, mockup, release or
promotion.

## Evidence

Task 6B1 admitted only the `Nachbarin` canonical row and allowed the next step
solely as source adjudication of `Aufzug` candidate-only. Task 6B2 separately
forbids creating, accepting or promoting a canonical lexical row. Current live
bytes already contain an `Aufzug` canonical row, trusted evidence and test
contacts; their author and authorizing task cannot be established from Git,
because they are untracked.

The preserved current SHA-256 values are:

| Artifact | SHA-256 |
| --- | --- |
| `lexical_item_evidence_de_v1.ts` | `10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c` |
| `registries/lexical_senses_de_v1.json` | `3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29` |
| `learning_v2_de_lexical_registry_gate.ts` | `3346867a3c40fecf6dcf11ef12c97f9de52a949a7db64870957ac08235c36f58` |

## Consequences

- No byte is deleted, moved, reverted or overwritten.
- Task 6B2 may close only source adjudication and retains the mandatory
  limitation `NO_PRODUCTION_POLICY_REGION_OR_PACKET_CONTACT_AUTHORITY`.
- A later Task 6B3 must independently authorize canonical materialization,
  run RED/GREEN from a clean B1 baseline and collect fresh reviews before any
  quarantined implementation candidate can be accepted.
