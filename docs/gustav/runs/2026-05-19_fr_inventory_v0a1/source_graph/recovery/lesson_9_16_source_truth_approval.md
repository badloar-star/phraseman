# GUSTAV Lesson 9-16 Source-Truth Approval

Run: `2026-05-19_fr_inventory_v0a1`

Status: `approved`

Approved at: 2026-05-19T19:13:17.765Z

## Decision

- Approved canonical source truth: yes
- Selected option: `clean_canonical_draft`
- Approver: `user`
- Approval basis: User replied 'давай' after Audit 25 recommended the clean canonical draft approval path.

Approved artifacts:
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/recovery/lesson_9_16_canonical_source_draft.json`
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/lesson_9_16_canonical_source_draft_audit.json`
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/lesson_9_16_source_truth_decision_packet.json`

Rejected artifacts:
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/recovery/lesson_9_16_historical_recovery_candidate.json`
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/lesson_9_16_reconciliation_audit.json`
- `app/lesson_data_9_16_phrases_es.gen.ts as direct French source truth`

## Required Criteria

### APP-001: Clean draft reviewed against current app behavior

Satisfied: yes

Evidence:
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/recovery/lesson_9_16_canonical_source_draft.json`
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/lesson_9_16_canonical_source_draft_audit.json`

### APP-002: Historical candidate rejected or reconciled explicitly

Satisfied: yes

Evidence:
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/lesson_9_16_reconciliation_audit.json`

### APP-003: Runtime-generated origin risk accepted or replaced

Satisfied: yes

Evidence:
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/generated_source_truth_audit.json`
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/lesson_9_16_canonical_source_draft_audit.json`

### APP-004: Production apply plan required before app write

Satisfied: yes

Evidence:
- `docs/gustav/runs/2026-05-19_fr_inventory_v0a1/apply_plan/file_changes.json remains required before production write`

## Safety

- May start French generation: no
- May modify production app files: no
- Requires apply plan before production write: yes

## Notes

- Approval resolves lesson 9-16 EN/RU/UK source truth for the current Gustav run only.
- Approval accepts runtime-generated origin risk only after the clean draft stripped Spanish runtime fields and preserved current EN/RU/UK prompts.
- Approval does not start French generation because target isolation gates remain HOLD.
- Approval does not allow production app writes without a separate apply plan.
