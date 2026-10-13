# Task 6C c01 additive allocation-only admission receipt

## Scope

This receipt records only the fixed German `Haus` and `Name` allocation
admission slice. It does not create a canonical lexical row, a Task 7 packet,
a learner-facing phrase, audio, RU/UK text, a mockup, or release authority.

## Fixed artifacts

- Registry: `modules/learning-v2/curriculum/de/registries/task6c_additive_allocation_admission_de_v1.json`
  - SHA-256: `9bfb6350da75e14edd7953590a6490f087ce6a72de69a19d63bf17836b8f402b`
- Zero-argument loader: `modules/learning-v2/curriculum/de/task6c_additive_allocation_admission_de_v1.ts`
  - SHA-256: `8d111cfd97d809b37f7c4b9fd7bb3c5e50392192b14df0530bce9e38688ddde3`
- Hostile gate: `tests/learning_v2_de_task6c_additive_allocation_admission_gate.ts`
  - SHA-256: `fe63dfb647c6a7b9ccf165be1e994fdd5a5b86308101dd87150449e35109582c`

The loader reads only fixed project paths and verifies the fixed raw-capture,
facts, contact contract, L01 target allocation, and canonical-registry
identities. The canonical registry remains a two-row baseline and neither
admitted additive ID collides with it.

## Result

The registry has exactly two rows:

- `de_lex_plan_task6c_l01_c01_haus_v1` → planned `de_plan_l01_nonc01_03_v1`, introduction `de_l01_c01_s03`, separately owned later contact `de_l01_c01_s05`.
- `de_lex_plan_task6c_l01_c01_name_v1` → planned `de_plan_l01_nonc01_04_v1`, introduction `de_l01_c01_s04`, separately owned later contact `de_l01_c01_s06`.

Its literal authority ceiling is: `rowsAdmitted=2`, `rowsPromoted=0`,
`canonicalRegistryStatus=NOT_CANONICAL`, and canonical promotion, Task 7,
packet materialization, learner-facing, and release authority are all `false`.

## Evidence

RED was observed before the loader existed: the new gate failed with
`MODULE_NOT_FOUND` for `task6c_additive_allocation_admission_de_v1`.

GREEN commands:

```text
npx tsx tests/learning_v2_de_task6c_additive_allocation_admission_gate.ts
npx tsx tests/learning_v2_de_task6c_l01_c01_haus_name_direct_capture_gate.ts
npx tsx tests/learning_v2_de_task6c_l01_c01_haus_name_facts_gate.ts
npx tsx tests/learning_v2_de_task6c_additive_source_plan_contract_gate.ts
npx tsc --noEmit --pretty false --skipLibCheck --target es2022 --module nodenext --moduleResolution nodenext modules/learning-v2/curriculum/de/task6c_additive_allocation_admission_de_v1.ts tests/learning_v2_de_task6c_additive_allocation_admission_gate.ts
npx prettier --check modules/learning-v2/curriculum/de/task6c_additive_allocation_admission_de_v1.ts modules/learning-v2/curriculum/de/registries/task6c_additive_allocation_admission_de_v1.json tests/learning_v2_de_task6c_additive_allocation_admission_gate.ts
npx eslint modules/learning-v2/curriculum/de/task6c_additive_allocation_admission_de_v1.ts tests/learning_v2_de_task6c_additive_allocation_admission_gate.ts
git diff --check -- modules/learning-v2/curriculum/de/task6c_additive_allocation_admission_de_v1.ts modules/learning-v2/curriculum/de/registries/task6c_additive_allocation_admission_de_v1.json tests/learning_v2_de_task6c_additive_allocation_admission_gate.ts
```

All commands completed with exit code 0. Existing c01 raw-capture and facts
gates retain their factual `HOLD` status; that status is not reinterpreted as
canonical, Task 7, learner, or release authority.
