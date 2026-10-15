# German Task 6C L01 `Tschüss` positive lexical-sense admission receipt

<!-- TASK5_V3_INPUT_SHA256: 5934f3f94e87f8b50481096732047c6c5c8591c34ce97c30d413d14519ce21fe -->
<!-- LEXICAL_V3_INPUT_SHA256: 475caad2f4a56a576301836c2bb4590061dd4536cd40553b1638ce605bfdbcbb -->
<!-- TASK6_V3_INPUT_SHA256: 8f54a19fcaad578a374c06e3a4ecf5504ab761b1790a296056334aa35bf36862 -->
<!-- INVENTORY_V3_INPUT_SHA256: 702a491699774d2f0cc90c19755bc8747a0b1663ddd2e94f272b68d40ddc1d88 -->
<!-- TASK5_V2_IMMUTABLE_SHA256: 18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23 -->
<!-- INVENTORY_V2_IMMUTABLE_SHA256: db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415 -->
<!-- PRIOR_HOLD_ADJUDICATION_SHA256: f430908b804b5ffe325154b569a3630f4f10a6fb621b661ffdff22340de15051 -->
<!-- DEFAULT_CONSUMER_SHA256: e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59 -->
<!-- LEXICAL_EVIDENCE_SHA256: b8d90064c6c7994369c8d14d935878f976af0ca45b506e77122f454c16dfe72d -->
<!-- LEXICAL_REGISTRY_V4_SHA256: aa08ccd483fb2bebb43a3f2388940a5672708cc70b29e41dfb05e0d4a39bd120 -->
<!-- TASK6_V4_SHA256: 65db4d567150c654c90c14d667811c8682136db753c602d12ed0f8b0808ee1c4 -->
<!-- INVENTORY_V4_SHA256: 3abf18ea54a4b84f0386a75788b86f6e0c693b7f54819284c8f44237a407d4b6 -->
<!-- ADMISSION_MANIFEST_SHA256: 98ea894cb092c5502deeb79fa4e91516d6f612e90722b8313250b546c579974d -->
<!-- ADMISSION_MODULE_SHA256: 9d1247704a5318cf93c63772f3f9bbe251d806b801285993d309aeac796d1d16 -->
<!-- ADMISSION_GATE_SHA256: 1ee1533fb26896dcf4ca4256480db98cd569501f07610f2085953933cdfff4f2 -->

Date: 2026-10-13

Decision: exact positive canonical lexical-sense admission for `Tschüss` only.

- Admission scope: `EXACT_TSCHUESS_SENSE_ONLY`
- Source plan: `de_lex_plan_l01_c02_tschuess_v1`
- Canonical lexical sense: `de_lex_l01_c02_tschuess_v1`
- Source interpretation: `Interjektion` → `fixed_expression`
- Source characterization: `landschaftlich` plus `umgangssprachlich`
- Pedagogical sense: colloquial/informal leave-taking in a familiar departure
- Interaction role: `interaction_closing`
- Planned-use/checkpoint packet: `de_l01_c02_s16` only
- First introduction: `null`
- No first-scored-use timing is claimed
- Successor inventory: `8 resolved / 280 unresolved / 1792 packet IDs / 0 materialized`

This is a complete V4 successor snapshot sourced from the accepted V3
registries. Byte-preservation evidence is limited to these eight bound
historical paths and SHA-256 values:

- `modules/learning-v2/curriculum/de/chapter_blueprints_de_v3.json` — `5934f3f94e87f8b50481096732047c6c5c8591c34ce97c30d413d14519ce21fe`
- `modules/learning-v2/curriculum/de/registries/lexical_senses_de_v3.json` — `475caad2f4a56a576301836c2bb4590061dd4536cd40553b1638ce605bfdbcbb`
- `modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v3.json` — `8f54a19fcaad578a374c06e3a4ecf5504ab761b1790a296056334aa35bf36862`
- `modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v3.json` — `702a491699774d2f0cc90c19755bc8747a0b1663ddd2e94f272b68d40ddc1d88`
- `modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json` — `18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23`
- `modules/learning-v2/curriculum/de/registries/task6c_full_allocation_inventory_de_v2.json` — `db6f68d392783c120efea506157050b7ac53b805cca4be43b31948458853d415`
- `modules/learning-v2/curriculum/de/evidence/task7_v2_l01_c02_tschuess_admission_adjudication_hold_v1/adjudication.json` — `f430908b804b5ffe325154b569a3630f4f10a6fb621b661ffdff22340de15051`
- `modules/learning-v2/curriculum/de/course_blueprint_contract_de_v1.ts` — `e85a651e8ee28d8f9b58e16f9be52e3083708bbb5211074f21c94533dcfebf59`

No byte-preservation claim is made for any unlisted V2, V3, or Tschüss HOLD path.
Current gates observed no drift in the eight listed paths; they do not prove
preservation of any unlisted bytes. The successor does not select itself as a
default consumer.

No phrase frame is admitted. In particular, this transaction neither binds nor
modifies `de_pf_l01_c02_tschuess_aufzug_v1`, does not admit
`Tschüss! Der Aufzug.`, and does not create an exact `Tschüss!` frame.
The Task 6 V4 authority record and the Tschüss materialization record are
closed-object validated: added authority fields are rejected and
`phraseAuthority` must remain exactly `false`.

Independent review status: `PENDING`

The pending review state is not a gate failure and grants no authority. A fresh
read-only reviewer must inspect the final bytes separately; this writer does not
self-approve.

Exact completed-review history follows. Reviewer raw sidecars and output hashes
were unavailable to this writer and are recorded as unavailable, not inferred.

<!-- REVIEW_HISTORY_JSON
{
  "initialSpec": {
    "taskIdentity": "/root/de_tschuess_spec_review",
    "verdict": "HOLD",
    "findings": { "P0": 0, "P1": 1, "P2": 0 },
    "reviewedHashes": {
      "evidence": "b8d90064c6c7994369c8d14d935878f976af0ca45b506e77122f454c16dfe72d",
      "manifest": "98ea894cb092c5502deeb79fa4e91516d6f612e90722b8313250b546c579974d",
      "lexicalV4": "aa08ccd483fb2bebb43a3f2388940a5672708cc70b29e41dfb05e0d4a39bd120",
      "task6V4": "65db4d567150c654c90c14d667811c8682136db753c602d12ed0f8b0808ee1c4",
      "inventoryV4": "3abf18ea54a4b84f0386a75788b86f6e0c693b7f54819284c8f44237a407d4b6",
      "module": "2e9c13283e8e8a5a228350281ff2699c41089893017782ee919d81459bca8523",
      "gate": "a34d4b873d48feb1ba18cf6075df7510a562485351a0b2eadbbbbc22691b2576",
      "receipt": "7d06c5b93145685eabbf9b910ed00707e38f1aa7e7fd8ff8a4cc959c8ce1f223"
    },
    "rawSidecarPath": "unavailable",
    "outputSha256": "unavailable"
  },
  "postrepairSpec": {
    "taskIdentity": "/root/de_tschuess_postrepair_spec_review",
    "verdict": "PASS",
    "findings": { "P0": 0, "P1": 0, "P2": 0 },
    "reviewedHashes": {
      "evidence": "b8d90064c6c7994369c8d14d935878f976af0ca45b506e77122f454c16dfe72d",
      "manifest": "98ea894cb092c5502deeb79fa4e91516d6f612e90722b8313250b546c579974d",
      "lexicalV4": "aa08ccd483fb2bebb43a3f2388940a5672708cc70b29e41dfb05e0d4a39bd120",
      "task6V4": "65db4d567150c654c90c14d667811c8682136db753c602d12ed0f8b0808ee1c4",
      "inventoryV4": "3abf18ea54a4b84f0386a75788b86f6e0c693b7f54819284c8f44237a407d4b6",
      "module": "5b13ede1f3800f3aa5b57619749291dbef7dac976cc867dae88488b5d1f29b33",
      "gate": "16989f89bea90562ee9458de10ae3220804762754fe3cecdcd35901c601732d3",
      "receipt": "6f9faf507bd1da3651cd1094b65eb909611004493507260475741fdc0fabb666"
    },
    "rawSidecarPath": "unavailable",
    "outputSha256": "unavailable"
  },
  "adversarial": {
    "taskIdentity": "/root/de_tschuess_adversarial_review",
    "verdict": "HOLD",
    "findings": { "P0": 0, "P1": 0, "P2": 2 },
    "reviewedHashes": {
      "evidence": "b8d90064c6c7994369c8d14d935878f976af0ca45b506e77122f454c16dfe72d",
      "manifest": "98ea894cb092c5502deeb79fa4e91516d6f612e90722b8313250b546c579974d",
      "lexicalV4": "aa08ccd483fb2bebb43a3f2388940a5672708cc70b29e41dfb05e0d4a39bd120",
      "task6V4": "65db4d567150c654c90c14d667811c8682136db753c602d12ed0f8b0808ee1c4",
      "inventoryV4": "3abf18ea54a4b84f0386a75788b86f6e0c693b7f54819284c8f44237a407d4b6",
      "module": "5b13ede1f3800f3aa5b57619749291dbef7dac976cc867dae88488b5d1f29b33",
      "gate": "16989f89bea90562ee9458de10ae3220804762754fe3cecdcd35901c601732d3",
      "receipt": "6f9faf507bd1da3651cd1094b65eb909611004493507260475741fdc0fabb666"
    },
    "rawSidecarPath": "unavailable",
    "outputSha256": "unavailable"
  },
  "finalReviewStatus": "PENDING",
  "freshFinalReviewsRequired": 2
}
-->

Phrase authority: `false`

Task 7 unlock: `false`

Preauthoring authority: `false`

Learner-facing authority: `false`

Release authorization: `false`

Consumer cutover: `NONE`

Default consumer changed: `false`

The receipt does not authorize learner sessions, mockups, local or production
release, automation changes, English changes, or any default-consumer cutover.

Focused deterministic gate:

```text
node --import tsx tests/learning_v2_de_task6c_l01_tschuess_positive_admission_gate.ts
```

Repository-wide TypeScript diagnostic (not green):

<!-- TYPESCRIPT_POSTREPAIR_EXIT: 2 -->
<!-- TYPESCRIPT_POSTREPAIR_DIAGNOSTICS: 17 -->
<!-- TYPESCRIPT_CLOSURE_EXIT: 2 -->
<!-- TYPESCRIPT_CLOSURE_DIAGNOSTICS: 14 -->
<!-- TYPESCRIPT_CLOSURE_TARGET_DIAGNOSTICS: 0 -->

```text
node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --pretty false
```

The postrepair verification run exited `2` with 17 pre-existing errors in
unrelated files. A fresh proof-closure rerun exited `2` with 14 pre-existing
errors in unrelated files and zero diagnostics in the eight transaction files.
The count changed because three unrelated app diagnostics were no longer
present in the shared workspace. This receipt does not claim a green
repository-wide TypeScript build.
