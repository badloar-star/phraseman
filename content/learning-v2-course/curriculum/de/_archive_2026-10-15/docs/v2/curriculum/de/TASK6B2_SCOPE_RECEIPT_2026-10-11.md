# German Learning V2 — Task 6B2 deterministic scope receipt

**Status:** `SCOPE PASS FOR SOURCE-ONLY DOCUMENTATION; NOT A RELEASE OR CANONICAL PASS`.

## Baseline

- repository HEAD is observational only and may advance through unrelated
  parallel snapshot commits; it is not a Task 6B2 authority or invalidation
  criterion;
- historical storage snapshots for the quarantined `Aufzug` implementation:
  `b86fc6957d3bfe049b11e88b4ee5b5b556a4d91b` (evidence and registry) and
  `e2a74ef302fe842cdbc93ef7f722e450be229407` (gate test);
- this receipt intentionally does not attribute unrelated repository changes
  to Task 6B2.

## Task 6B2 writable-path whitelist

Only these German source-adjudication documents belong to Task 6B2:

- `docs/v2/curriculum/de/TASK_PACKET_6B2_AUFZUG_SOURCE_ADJUDICATION.md`;
- `docs/v2/curriculum/de/TASK6B2_AUFZUG_SOURCE_ADJUDICATION_DRAFT_2026-10-11.md`;
- `docs/v2/curriculum/de/TASK6B2_GUARDIAN_RECEIPT_2026-10-11.md`;
- `docs/v2/curriculum/de/TASK6B2_GUARDIAN_RECEIPT_R2_2026-10-11.md`;
- `docs/v2/curriculum/de/TASK6B2_GUARDIAN_RECEIPT_R3_2026-10-11.md`;
- `docs/v2/curriculum/de/TASK6B2_GUARDIAN_RECEIPT_R4_2026-10-11.md`;
- `docs/v2/curriculum/de/TASK6B2_SOURCE_ADJUDICATION_RECEIPT_2026-10-11.md`;
- `docs/v2/curriculum/de/TASK6B2_QUARANTINE_DECISION_2026-10-11.md`;
- `docs/v2/curriculum/de/TASK6B2_SCOPE_RECEIPT_2026-10-11.md`.

The quarantined implementation files are expressly excluded from Task 6B2
authority: `lexical_item_evidence_de_v1.ts`,
`registries/lexical_senses_de_v1.json`, and
`tests/learning_v2_de_lexical_registry_gate.ts`.

## Deterministic result

At audit time, `git status --short -- docs/v2/curriculum/de
modules/learning-v2/curriculum/de tests/learning_v2_de_lexical_registry_gate.ts`
may list only Task 6B2 whitelist documents as modified or untracked. Any
implementation path in that result is quarantined and is compared by SHA-256,
not accepted by its Git presence. The preserved implementation hashes equal the
quarantine-decision hashes. No Task 6B2 action writes English learner-facing
paths, runtime, mockup, audio, release or production configuration.

This proves containment of the Task 6B2 documentation scope. It does not
retroactively authorize, accept, remove or alter the quarantined implementation
bytes.
