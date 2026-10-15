# Task6C Task5 allocation-only receipt — 2026-10-11

German-only allocation authority for four existing L01 Task5 noun evidence rows:
`Briefkasten`, `Büro`, `Garten`, and `Hausmeister`.

This is neither canonical registry promotion nor packet materialization. It binds the
immutable six-noun evidence candidate, exact Task5 scene narrowing, target slots and
strict `introduction < scored` packet chronology. The Hausmeister row is bound to
`d-1-1`; Swiss `d-1-2` remains excluded.

- Registry: `modules/learning-v2/curriculum/de/registries/task6c_task5_allocation_admission_de_v1.json`
- Fixed zero-argument loader: `modules/learning-v2/curriculum/de/task6c_task5_allocation_admission_de_v1.ts`
- Hostile gate: `tests/learning_v2_de_task6c_task5_allocation_admission_gate.ts`
- Immutable evidence manifest SHA-256: `a3a44ab4d1bc79ccc0af6741070eeb36267382fab2f44bb3dfb912adcdb42b55`
- Fixed F closure SHA-256: `6bc849c3369468cfb59be92bfcbd249473f65a29c8e9170385ddcfbcfe619c44`
- Fixed native/adversarial review SHA-256: `58f5ce80d09ab91fbca3770bb7d91f365857045c6bb14d70070181a652183134` / `d7659bf4db1ffe0f2ec32afb6fdb3e89070881e2eaebc164f2d0dd91b7046105`
- L01 target-allocation SHA-256: `b6ddd2e2fb665fe6c295a624c7009791539473ee23e9141b89b30cbfd507e0f0`

The sole status is `TASK5_ADMITTED_FOR_TASK6C_ALLOCATION_ONLY`:
`rowsAdmitted=4`, `rowsPromoted=0`, `canonicalRegistryStatus=NOT_CANONICAL`, and all
canonical-promotion, Task7, packet-materialization, learner-facing and release flags
are false. The loader has no input path or options and returns a private branded,
deep-frozen object only after fixed-path validation. It does not connect to the full
allocation authority.

The F closure and both records are separately hash-bound, parsed with closed schemas,
and require `ACCEPTED_UNDER_TASK6C_CURRENT_STATE`, two `PASS` verdicts in their
respective roles, and `HOLD_ONLY` review/authority ceilings. They do not grant
canonical, packet, learner, or release authority.

Required checks:

```text
npx tsx tests/learning_v2_de_task6c_task5_allocation_admission_gate.ts
npx tsx tests/learning_v2_de_task6c_l01_six_noun_admission_gate.ts
npx tsx tests/learning_v2_de_task6c_l01_six_noun_receipt_closure_gate.ts
npx tsx tests/learning_v2_de_task6c_full_allocation_authority_gate.ts
```
