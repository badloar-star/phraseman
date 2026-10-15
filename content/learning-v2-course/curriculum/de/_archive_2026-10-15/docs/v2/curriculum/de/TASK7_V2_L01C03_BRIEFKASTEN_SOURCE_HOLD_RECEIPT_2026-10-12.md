# Task7 V2 L01C03 `Briefkasten` source-HOLD receipt

<!-- TASK7_BRIEFKASTEN_MODULE_SHA256: f69a2c6e088d9ceea900b6ad0217d72c79dadb9d7035c19b88adff3bb6852a17 -->
<!-- TASK7_BRIEFKASTEN_MANIFEST_SHA256: 1e8b97c051384f05d02675bc05de4d3c2c6bc27101bc4e07c951b4671de35d69 -->
<!-- TASK7_BRIEFKASTEN_EXTRACTION_MAP_SHA256: f97ccbd4f4e95f0361f7fb607cae2f60c2cb4bdac18b89ec9fe34d3568e3cc89 -->
<!-- TASK7_BRIEFKASTEN_CAPTURE_SCRIPT_SHA256: d1a782d5ef0233084d1760e2ce709785af1d3e782aaf1d5aa26c841f5d59bfdd -->

This is a source-bound HOLD allocation only for
`de_lex_plan_l01_c03_briefkasten_v1` at checkpoint `de_l01_c03_s24`.

Direct public HTTPS capture binds the exact DWDS `Briefkasten` entry to the
headword, `Substantiv (Maskulinum)`, article `der`, singular `Briefkasten`,
nominative plural `Briefkästen`, and sense `d-1-2` concerning a box at a house
door into which post is delivered. It does not claim any morphology beyond
those captured fields, register, a learner phrase, canonical admission, an
inventory resolution, Task7 unlock, preauthoring, learner-facing content,
release, or consumer cutover.

Current inventory remains `6 resolved / 282 unresolved / 0 materialized`.

## Deterministic evidence

RED (before the new module existed):

```text
node --import tsx tests/learning_v2_de_task7_v2_l01_c03_briefkasten_source_hold_gate.ts
MODULE_NOT_FOUND
```

GREEN:

```text
node --import tsx tests/learning_v2_de_task7_v2_l01_c03_briefkasten_source_hold_gate.ts
TASK7_V2_L01C03_BRIEFKASTEN_SOURCE_HOLD_GATE PASS status=HOLD ... cutover=NONE
```
