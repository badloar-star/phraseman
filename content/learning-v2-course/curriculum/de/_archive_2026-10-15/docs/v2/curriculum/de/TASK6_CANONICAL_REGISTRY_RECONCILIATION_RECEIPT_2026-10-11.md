# German Learning V2 — Task 6 canonical registry reconciliation receipt

**Status:** `TASK6_REGISTRY_CLOSURE_PREPARED / TASK7_CONTACTS_HOLD`

## Exact authorities

- Task 6 registry contract:
  `modules/learning-v2/curriculum/de/task6_registry_contract_de_v1.ts`.
- Task 3 grammar authority:
  `modules/learning-v2/curriculum/de/registries/grammar_constructs_de_v1.json`
  (canonical body SHA-256
  `eecaa24781b2054c89c347df9c7312d0db41aa8a53a2694b228530b2624d1f24`).
- Task 4 lesson/pronunciation authority:
  `modules/learning-v2/curriculum/de/lesson_blueprints_de_v1.json`
  (canonical body SHA-256
  `cdfcd27adbe7694fd2e53b86fbb8a91b676d81d5526b487cd7e56b622f88bc9a`).
- Task 5 chapter/lexical-plan authority:
  `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json`
  (canonical body SHA-256
  `e70ef798e06dfa752e9faace47282300a4fd43f8acaf158b2f608a8225f8cf90`).
- Existing lexical item evidence:
  `modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts`, byte SHA-256
  `10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c`.
- B3A-protected lexical registry:
  `modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json`, byte SHA-256
  `3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29`.

## Canonical Task 6 bundle

`modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json`
has byte SHA-256
`95181fb58d7563fc1ae37f220ad13b2543ccde898dfe1e93922cecc4a082fd31`.

<!-- TASK6_CANONICAL_BUNDLE_SHA256: 95181fb58d7563fc1ae37f220ad13b2543ccde898dfe1e93922cecc4a082fd31 -->

The bundle contains exactly two source-bound lexical senses, two German
blueprint phrase frames, and one Task 4 pronunciation target. Its grammar
references are restricted to the pre-A1 fixed-chunk construct already allowed
by the two owning Task 5 chapters. It embeds no learner-facing RU/UK prompts,
options, distractors, feedback, audio, mockup, runtime, release, or English
bytes.

## Deterministic evidence

The new gate is
`tests/learning_v2_de_task6_canonical_registry_gate.ts`, byte SHA-256
`355316efccd41433c0e21239bebb69139d4fed3d96708071582de440a2959938`.

Fresh GREEN command:

```text
node --import tsx tests/learning_v2_de_task6_canonical_registry_gate.ts
```

Observed sentinel:

```text
TASK6_CANONICAL_REGISTRY_RECONCILIATION lexical=2 phraseFrames=2 pronunciation=1 packetContacts=UNVERIFIED_UNTIL_TASK7 rowsPromoted=0 status=HOLD
```

The gate parses the complete bundle through the Task 6 kernel with the real
Task 3–5 source documents and the existing lexical-evidence registry. Its
negative control removes the first phrase frame and requires
`task5_chapter_mapping_without_phrase:de_pf_l01_c01_hallo_nachbarin_v1`.
It also requires the complete closed top-level schema/version, rejects an
unknown `learnerFacingRu` top-level field, and derives the bundle byte SHA-256
from disk before comparing it with the machine-readable receipt binding. Its
byte-drift negative control passes altered raw bundle bytes through the same
binding validator and requires
`task6_canonical_registry_receipt_binding_mismatch`.

Existing Task 6 gates were re-run fresh and retained their required HOLD
boundaries: lexical evidence verifies two rows; phrase-frame quantity and
native phrase judgement remain unverified/required until Task 7; pronunciation
packet contacts remain unverified until Task 7.

## Holds and non-authority

- `rowsPromoted=0`.
- `task7Contacts=UNVERIFIED`.
- Packet materialization, native phrase judgement, phrase-frame quantity, and
  pronunciation contacts remain Task 7 obligations.
- This receipt neither changes nor reinterprets the preserved B3A acceptance
  artifacts. It does not authorize learner-facing authoring, audio, mockup,
  runtime, release, promotion, or English work.
