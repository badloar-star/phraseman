# German Learning V2 — Task 6C additive allocation-contact transport

**Status:** `ADMITTED_FOR_TASK6C_ALLOCATION_ONLY`

This is a narrow German-only planning transport. It contains neither a lexical
row nor captured source evidence, and it does not amend Task 5, the canonical
registry, Task 7, a learner session, a mockup, a release, or English.

The executable authority is
`modules/learning-v2/curriculum/de/task6c_additive_source_plan_contract_de_v1.ts`.
Its fixed L01 target binding is only
`de_l01` / `de_l01_c01` / `PLANNED_MAPPING_ONLY`. For that chapter, the exact
proposed identities are `Haus` and `Name`, represented only by their closed
Task6C planning identifiers. They are not canonical lexical identities and are
not evidence admissions.

Each allocation contact carries its own `sourceChapterId`, exact chapter
situation signature, introduction packet and additive-owned scored-contact ID.
The contract resolves ownership from the declared chapter instead of assigning a
chapter through a hidden default. Current chronology is deliberately strict:

- Haus: `de_l01_c01_s03` introduction, later Task6C scored contact in `s05`.
- Name: `de_l01_c01_s04` introduction, later Task6C scored contact in `s06`.

An introduction cannot share its scored packet, follow it, use the Task 5
checkpoint packet, reuse a Task 5 source-plan/evidence row, cross a chapter or
situation, collide with another additive identity, or claim a learner-facing
field. Task 5 remains source-plan evidence only and cannot become an
additive-owned scored contact.

The registry has the separate, intentionally limited status
`ADMITTED_FOR_TASK6C_ALLOCATION_ONLY`; its permanent literals are
`task7Unlock=false`, `canonicalPromotion=false`, and
`learnerFacingAuthority=false`. The status admits only this frozen allocation
mapping. It does not authorize canonical promotion, packet materialization,
learner content, source capture, release, or a Task 7 unlock.

Run the focused hostile gate:

```text
node --import tsx tests/learning_v2_de_task6c_additive_source_plan_contract_gate.ts
node --import tsx tests/learning_v2_de_task6c_batch001_loader_gate.ts
```
