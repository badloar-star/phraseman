# GUSTAV Lesson 9-16 Source-Truth Decision Packet

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-19T19:13:14.324Z

## Summary

- Options: 4
- Approved options: 1
- Rejected options: 2
- Pending-review options: 0
- Requires-manual-work options: 1
- Recommended options: 1
- Approval artifact exists: yes
- Approval granted: yes
- Clean draft structurally clean: yes
- Clean draft Spanish leaks: 0
- Clean draft runtime-generated origins: 400
- Historical candidate do_not_auto_merge: yes
- Blockers: 0
- High risks: 0
- Can resolve lesson 9-16 source truth: yes

## Options

### direct_generated_runtime: Use generated runtime phrase file directly

- Status: `rejected`
- Recommended: no
- Source artifacts:
  - `app/lesson_data_9_16_phrases_es.gen.ts`
  - `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/generated_source_truth_audit.json`
- Evidence:
  - 1 generated artifact is used as phrase source.
  - 400 generated phrase entries remain runtime evidence.
- Blockers:
  - Generated Spanish runtime must not become French curriculum source truth.
  - Source graph and generated source-truth audits remain HOLD.
- Required approval:
  - Not approvable as direct source truth.

### historical_recovery_candidate: Promote historical git candidate

- Status: `rejected`
- Recommended: no
- Source artifacts:
  - `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/lesson_9_16_source_recovery_audit.json`
  - `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/recovery/lesson_9_16_historical_recovery_candidate.json`
  - `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/lesson_9_16_reconciliation_audit.json`
- Evidence:
  - 2 historical inline candidates were found.
  - 0 exact English matches by id in best recovery candidate.
  - 8 blocker lessons in reconciliation audit.
  - 200 invalid canonical candidate ids.
- Blockers:
  - Reconciliation policy is do_not_auto_merge.
  - Historical candidate does not match current runtime phrase intent closely enough.
- Required approval:
  - Only usable after manual reconciliation into a new clean source, not direct promotion.

### clean_canonical_draft: Review and approve clean EN/RU/UK canonical draft

- Status: `approved`
- Recommended: yes
- Source artifacts:
  - `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/recovery/lesson_9_16_canonical_source_draft.json`
  - `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/lesson_9_16_canonical_source_draft_audit.json`
  - `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/recovery/lesson_9_16_source_truth_approval.json`
- Evidence:
  - Structurally clean: yes.
  - 400 phrases across 8 lessons.
  - 0 Spanish field leaks and 0 Spanish token suspects.
  - 400 runtime-generated origins require explicit acceptance.
- Blockers:
- Required approval:
  - Approved for lesson 9-16 EN/RU/UK source truth in this Gustav run. Production apply plan is still required before app writes.

### manual_rebuild: Manually rebuild lesson 9-16 canonical source

- Status: `requires_manual_work`
- Recommended: no
- Source artifacts:
  - `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/recovery/lesson_9_16_canonical_source_draft.json`
  - `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/lesson_9_16_reconciliation_audit.json`
- Evidence:
  - Available if clean draft review rejects runtime-derived source truth.
  - Would require human/pedagogical reconstruction before French generation.
- Blockers:
  - No manual rebuild artifact exists yet.
  - Would require another source graph extraction and quality audit.
- Required approval:
  - Approve rebuilt source artifact after review.

## Findings

### L916P-002: Historical candidate cannot be selected

Severity: `info`

Historical recovery remains rejected by 8 blocker lessons and policy do_not_auto_merge; clean canonical draft was selected instead.

Files:
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/lesson_9_16_reconciliation_audit.json`

### L916P-005: Clean draft runtime-generated origin risk is accepted

Severity: `info`

400 clean draft phrases trace back to runtime_generated source graph refs, and the approval artifact explicitly accepts this risk for the clean EN/RU/UK draft.

Files:
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/recovery/lesson_9_16_source_truth_approval.json`
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/lesson_9_16_canonical_source_draft_audit.json`

## Required Before French Generation

- Review the clean canonical draft and either approve it or reject it.
- If approved, create a signed approval artifact with selectedOption=clean_canonical_draft.
- If rejected, create a manual rebuilt source and rerun source graph gates.
- Do not generate French until approvalGranted=true and readiness passes.

## Notes

- This packet turns lesson 9-16 source truth into an explicit decision workflow.
- The approval template is pending and deliberately does not unlock generation.
- No production app files are modified by this script.
