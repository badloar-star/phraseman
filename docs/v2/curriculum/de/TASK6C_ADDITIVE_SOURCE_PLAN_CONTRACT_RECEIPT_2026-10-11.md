# Task 6C additive allocation-contact receipt

**Status:** `ADMITTED_FOR_TASK6C_ALLOCATION_ONLY`

The focused contract gate verifies the frozen German L01/c01 planned mappings
for Haus and Name. It checks chapter ownership through each contact's
`sourceChapterId`, the Task 5 situation signature, fixed `s03 → s05` and
`s04 → s06` chronology, separate additive-owned scored contacts, collision
rejection against Task 5 plans, and closed-schema rejection for reused Task 5
evidence or learner fields.

The status is transport-only. Its permanent literals are `task7Unlock=false`,
`canonicalPromotion=false`, and `learnerFacingAuthority=false`. No lexical row,
source capture, canonical promotion, packet materialization, learner-facing
content, mockup, release, or English change is admitted by this receipt.

Batch-001 stays a separate Task 5 provenance route with `HOLD` and
`NOT_DIRECT_EVIDENCE`; it cannot satisfy an additive scored contact.

```text
node --import tsx tests/learning_v2_de_task6c_additive_source_plan_contract_gate.ts
node --import tsx tests/learning_v2_de_task6c_batch001_loader_gate.ts
```
