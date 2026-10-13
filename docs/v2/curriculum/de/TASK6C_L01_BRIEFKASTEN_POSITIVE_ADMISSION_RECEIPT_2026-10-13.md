# German Task 6C L01 `Briefkasten` positive lexical-sense admission receipt

Date: 2026-10-13

Decision: exact positive canonical lexical-sense admission for residential
`Briefkasten` only.

- Admission scope: `EXACT_BRIEFKASTEN_RESIDENTIAL_MAILBOX_NOUN_ONLY`
- Source plan: `de_lex_plan_l01_c03_briefkasten_v1`
- Canonical lexical sense: `de_lex_l01_c03_briefkasten_v1`
- Evidence ID: `DE-LEX-ITEM-L01-C03-BRIEFKASTEN-SENSE-FORM-001`
- Source POS: `Substantiv (Maskulinum)`
- Admitted source sense: DWDS `d-1-2`, residential mailbox
- Explicitly rejected source sense: DWDS `d-1-1`, public street/post-collection box
- Curriculum POS: `noun`
- Noun package: article/gender `der`, singular `Briefkasten`, nominative plural `Briefkästen`
- Broader cases or declension: not authorized
- Register/region: source-unspecified (`null` / `null`)
- Utility role: `scene_grounding`
- Communicative use: ground an introduction at a mailbox area
- Planned-use/checkpoint packet: `de_l01_c03_s24` only
- First introduction: `null`
- First-scored timing: not claimed
- Successor inventory: `10 resolved / 278 unresolved / 1792 packet IDs / 0 materialized`

No phrase frame, phrase mapping, or example authority was added. Examples do
not grant phrase, register, or production authority. `phraseClaims` remains
`HALLO_EXACT_ONLY` and phrase authority remains false.

The V6 snapshots are additive successors of the exact V5 bytes: one lexical
row, one lexical mapping, and one inventory resolution were added. V2–V5,
both prior `Briefkasten` HOLD transactions, the V5 closure, the default
consumer, and the English surface remain pinned and unchanged.

The five semantic artifacts are:

- lexical evidence: `bf298f3e6441b615772ff43efb6ec05252aa07fa772a2d15bb2f330ee523ef12`
- admission manifest: `766022b62d091c6c023d310477969d9e09d7eacd62e6b89af2448fbfe878d8f1`
- lexical V6: `3d45077cba6f20e826ce3fa04732a91fec15d571ac9a0cb54923c8ec84c66e55`
- Task 6 V6: `63d65319b2f41dc6cb08e8e4e407fbf4a6ca71c061229da64a886c62ba9403bc`
- inventory V6: `e940b37e2ea29e479710dada185c8bc1466bb04b61176c8c839432eeaf392677`

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
or default-consumer file is authorized or changed by this receipt.

TDD RED:

```text
node --import tsx tests/learning_v2_de_task6c_l01_briefkasten_positive_admission_gate.ts
exit 1 — AssertionError: briefkasten_positive_missing:modules/learning-v2/curriculum/de/task6c_l01_briefkasten_positive_admission_de_v1.ts
```

Focused GREEN status: `PASS` (exit `0`).

Focused command:

```text
node --import tsx tests/learning_v2_de_task6c_l01_briefkasten_positive_admission_gate.ts
```

Required predecessor regressions:

- V5 positive-admission gate
- V5 final-review closure gate
- `Briefkasten` source-HOLD gate
- `Briefkasten` canonical-admission HOLD gate

Repository-wide TypeScript command:

```text
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --pretty false
```

<!-- TYPESCRIPT_REVIEWED_RUN_JSON
{"command":"node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --pretty false","exitCode":2,"diagnostics":16,"transactionPathCount":8,"transactionDiagnostics":0,"repositoryGreen":false,"logPath":"C:\\Temp\\phraseman_briefkasten_v6_tsc_20261013.log"}
-->

Observed reviewed-run exit: `2`; diagnostics: `16`; diagnostics in the eight transaction
paths: `0`. Full log:
`C:\Temp\phraseman_briefkasten_v6_tsc_20261013.log`. The repository-wide
TypeScript build is not claimed green.
