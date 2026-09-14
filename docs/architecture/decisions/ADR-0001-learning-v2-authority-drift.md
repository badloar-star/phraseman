# ADR-0001: Treat the Learning V2 gate as current machine authority while documentation drifts

Status: Proposed — owner reconciliation required  
Date: 2026-09-11  
Decision owner: Phraseman product/curriculum owner

## Context

The mandatory `docs/v2/СТАРТ В2.md` top block names fingerprint `94ab72…73cbf` with `OWNER REVIEW REQUIRED`. The owner receipt contains `bb5318…45c` in its header, calls it `OWNER APPROVED`, later says the same value is pending, and names further fingerprints in narrative. Its mandatory design link also resolves to `docs/superpowers/specs/...`, while the relative link currently points outside `docs/` and is broken.

On 2026-09-11, the required command `npx tsx scripts/learning_v2_curriculum_blueprint_gate_v2.ts` passed and reported `owner_approval=APPROVED fingerprint=bb53181a104f8476761eef548949b0f978a0fd2f0caacdb239ad70c5cbb1845c` with 32 lessons, 224 chapters, 1,792 packets and zero findings.

## Decision

For architecture inventory only, report the fresh gate result as the machine-observed state and report the prose conflict explicitly. Do not edit learner-facing content, change approval, select a different fingerprint, or silently rewrite historical receipts under this ADR.

Any Learning V2 implementation or authoring task remains governed by the full mandatory start route and its own preflight. The owner must reconcile the top authority block, receipt narrative and broken design link in one bounded documentation change.

## Consequences

- Architecture documentation can point to a reproducible authority instead of guessing.
- The conflict remains visible and blocks claims based solely on the inconsistent prose.
- A follow-up debt item is required; this ADR does not itself approve content or release.

## Verification and exit condition

Exit when the owner-approved fingerprint and status are consistent across `СТАРТ В2`, the owner receipt and the curriculum gate, the design link resolves, and the mandatory gate still passes without weakening.
