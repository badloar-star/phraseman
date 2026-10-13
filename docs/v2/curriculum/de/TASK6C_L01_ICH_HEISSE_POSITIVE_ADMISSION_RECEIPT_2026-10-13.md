# German Task 6C L01 `Ich heiße` positive lexical-sense admission receipt

Date: 2026-10-13

Decision: exact positive canonical lexical-sense admission for `Ich heiße` only.

- Admission scope: `EXACT_ICH_HEISSE_FIXED_EXPRESSION_ONLY`
- Source plan: `de_lex_plan_l01_c03_ich_heisse_v1`
- Canonical lexical sense: `de_lex_l01_c03_ich_heisse_v1`
- Evidence ID: `DE-LEX-ITEM-L01-C03-ICH-HEISSE-SENSE-FORM-001`
- Source lemma/POS/sense: `heißen` / `Verb` / `genannt werden, den Namen haben`
- Curriculum interpretation: bounded first-person verb chunk → `fixed_expression`
- Admitted expression: `Ich heiße`
- Productive `heißen` paradigm: not authorized
- Register: source-unspecified (`null`); no neutral, formal, or colloquial claim
- Interaction role: `participant_reference`
- Communicative use: say a name after a greeting
- Planned-use/checkpoint packet: `de_l01_c03_s24` only
- First introduction: `null`
- First-scored timing: not claimed
- Successor inventory: `9 resolved / 279 unresolved / 1792 packet IDs / 0 materialized`

The Goethe occurrence `Ich heiße Max.` proves occurrence only. It does not
authorize either a literal phrase frame or the productive frame
`Ich heiße {Name}`. No phrase frame was added, linked, or modified;
`phraseClaims` remains `HALLO_EXACT_ONLY`.

The V5 registry snapshots are additive successors of V4: nine lexical rows,
seven new rows plus two preserved legacy rows, and three promoted rows. The
promotion count is accepted only against the bound V4 schema and its exact
`8 / 6 / 2 / 2` predecessor counts.

The five semantic artifacts remain frozen for this bounded P2 receipt-validation
repair:

- lexical evidence: `aaade49d6ba482326b5f0638e617c99744ce3f9242e789928afd7650ea7ccfe3`
- admission manifest: `94900d9d0cd595d394e0964a79d354495e9f41a194eaf4a408d20b377c584b4e`
- lexical V5: `4ed741cc0e457eff0c3500f98e6c8d62a33a951110d428ff1333075eca99a2c7`
- Task 6 V5: `9bbf41335e13dff8f97be3bbd05f21284c99e62c31d5fcb63f7b5f0ab324af91`
- inventory V5: `e1c01fa8ef727c23d128d07bbe5cf67f7c04c6539610817ba39b6e0b555fb3b4`

Independent review status: `PENDING`

This writer does not self-approve. Fresh exact-spec and adversarial review of
the final hashes remain required. The pending review state grants no additional
authority.

Phrase authority: `false`

Task 7 unlock: `false`

Preauthoring authority: `false`

Learner-facing authority: `false`

Release authorization: `false`

Currently materializable: `false`

Materialized packets: `0`

Consumer cutover: `NONE`

Default consumer changed: `false`

Owner approval: `NOT_REQUESTED_NOT_GRANTED`

Production policy: `NOT_AUTHORIZED_BY_THIS_ADMISSION`

No learner/session, mockup, audio, runtime, production, automation, English,
or default-consumer file is authorized by this receipt.

TDD RED:

```text
node --import tsx tests/learning_v2_de_task6c_l01_ich_heisse_positive_admission_gate.ts
exit 1 — AssertionError: ich_heisse_positive_missing:modules/learning-v2/curriculum/de/task6c_l01_ich_heisse_positive_admission_de_v1.ts
```

Focused GREEN status: `PASS` (exit `0`).

Focused command:

```text
node --import tsx tests/learning_v2_de_task6c_l01_ich_heisse_positive_admission_gate.ts
```

Required predecessor regressions all exited `0`:

- `learning_v2_de_task6c_l01_tschuess_positive_admission_gate.ts`
- `learning_v2_de_task6c_l01_tschuess_final_review_closure_gate.ts`
- `learning_v2_de_task6c_l01_hallo_positive_admission_gate.ts`
- `learning_v2_de_task7_v2_l01_c03_ich_heisse_source_hold_gate.ts`

Repository-wide TypeScript command:

```text
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --pretty false
```

<!-- TYPESCRIPT_REVIEWED_RUN_JSON
{"command":"node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --pretty false","exitCode":2,"diagnostics":14,"transactionPathCount":8,"transactionDiagnostics":0,"repositoryGreen":false,"logPath":"C:\\Temp\\phraseman_ich_heisse_v5_tsc_20261013.log"}
-->

Observed reviewed-run exit: `2`; diagnostics: `14`; diagnostics in the eight transaction
paths: `0`. Full log:
`C:\Temp\phraseman_ich_heisse_v5_tsc_20261013.log`. The repository-wide
TypeScript build is not claimed green.

Fresh P2 repair verification is separate from the reviewed run above. The same
exact command exited `2` with `17` current shared-tree diagnostics and `0`
diagnostics in the eight transaction paths. Full fresh log:
`C:\Temp\phraseman_ich_heisse_v5_tsc_p2_repair_20261013.log`. This later count
does not rewrite the reviewed-run `2 / 14 / 0` evidence and does not claim a
green repository build.
