# Task7 v2: Tschüss canonical-admission adjudication — HOLD

This additive German-only adjudication binds the existing direct DWDS source-HOLD capture to `de_lex_plan_l01_c02_tschuess_v1` and `de_l01_c02_s16`.

Decision: `CANONICAL_ADMISSION_WITHHELD_MISSING_REQUIRED_AUTHORITIES`.

Verified source facts: **Tschüss** is an **Interjektion**; DWDS marks the bound sense _umgangssprachlich_ and gives _lebe wohl!_ / _auf Wiedersehen!_. A neutral-register claim and an official pedagogical occurrence are not supported by this packet.

The source facts do not authorize a Task6 canonical allocation, an inventory transaction, Task7, pre-authoring, learner content, release, or consumer cutover. All stay false / `NONE`. The inventory remains `6 resolved / 282 unresolved / 1792 packets / 0 materialized`.

Deterministic gate:

```text
node --import tsx tests/learning_v2_de_task7_v2_l01_c02_tschuess_admission_gate.ts
```

The gate rejects input drift, unsupported neutral-register claims, incorrect lemma, old source-plan ID, admission/cutover escalation, and any packet/release/owner output field.
