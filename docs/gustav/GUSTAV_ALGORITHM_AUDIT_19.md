# GUSTAV Algorithm Audit 19

Status: `HOLD`

Scope: executable English source graph extraction for PhraseMan.

## 1. What improved

Gustav now has a read-only source graph extractor:

```text
scripts/gustav_source_graph_extractor.ts
```

It reads the current PhraseMan English base instead of inventing a separate language structure:

```text
constants/lessons.ts
app/lesson_data_1_8_phrases_source.ts
app/lesson_data_9_16_phrases_es.gen.ts
app/lesson_data_17_24.ts
app/lesson_data_25_32.ts
app/lesson_intro_screens_lesson*_v2.ts
app/lesson_intro_screens_en_17_32.ts
app/quiz_data.ts
app/flashcards/system-cards.ts
app/idioms_data.ts
app/diagnosis_trainings.ts
app/lesson_prepositions.ts
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/audits/surface_route_inventory.json
```

It writes:

```text
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/source_graph.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/english_source_graph.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/validation.json
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/source_graph_summary.md
docs/gustav/runs/2026-05-19_fr_inventory_v0a1/source_graph/unresolved.md
```

The extractor does not import Expo/React runtime modules. It parses TypeScript source and writes only run artifacts.

## 2. Source graph result

Command:

```text
NODE_PATH=/Users/maksymbabiev/Documents/phraseman/node_modules node /private/tmp/gustav-build/gustav_source_graph_extractor.js --run docs/gustav/runs/2026-05-19_fr_inventory_v0a1
```

Result:

```text
Status: HOLD
Lessons: 32
Phrases: 1600
Word tokens: 8353
Intro screens: 147
Quizzes: 829
Preposition packs: 12
System flashcards: 155
Daily phrases: 176
My Practice diagnosis nodes: 56
Surfaces: 129
```

## 3. New source graph blocker

### GVA-061: English source graph is extracted but not approved

The graph is now machine-readable, but it remains `HOLD` because:

- `2` generated phrase/runtime files are part of the observed source base;
- `5` generated ES L2 support files must not be copied as French source truth;
- `400` phrase entries come from a generated runtime phrase file;
- the extracted graph needs pedagogical/source approval before generation.

This is the right failure mode. Gustav can see the English base, but it still refuses to generate French from uncertain source truth.

## 4. Validator integration

The run validator now checks the source graph structurally:

- schema version;
- run id;
- status;
- base study target `en`;
- required arrays;
- validation count consistency;
- exactly 32 lesson nodes;
- duplicate lesson and phrase ids;
- phrase target text and word ids;
- unresolved blocker/high-risk counts;
- no `PASS` while unresolved blockers remain.

Validator result:

```text
PASS
Checks: 13687
Blockers: 0
Warnings: 0
```

This validates source graph structure only. It does not approve French generation.

## 5. Readiness gate result

Readiness now sees the source graph instead of treating it as missing:

```text
Decision: HOLD
Checks: 13
Passed: 2
Failed: 11
Generation blockers: 9
Apply blockers: 11
```

The source graph check now reports:

```text
Source graph is HOLD with 32 lessons, 1600 phrases, 147 intro screens, 829 quizzes, 56 personal-practice nodes, 2 unresolved blockers and 7 generated-file risks.
```

Next recommended work changed from "implement source graph extractor" to:

```text
Resolve target-safe migration adapters.
Approve the extracted English source graph and settle generated runtime phrase-file policy.
Run pedagogical/source quality audit over lessons, phrases, quizzes, flashcards, daily phrases and diagnosis-training nodes.
```

## 6. Current stage

Gustav stage:

```text
architecture work: allowed
source graph extraction: created
source graph approval: blocked
French generation: blocked
production apply: blocked
```

Progress state:

```text
source discovery: machine-readable
storage/cloud risk map: created
surface risk map: created
readiness gate: created
migration adapter strategy: created
adapter implementation: not started
pedagogical source graph audit: not started
```

Next concrete work:

```text
source graph quality audit and generated-file source-truth policy
```

Reason:

Gustav can now inventory the English base, including My Practice, but French must still wait until the extracted graph is approved and the generated ES/runtime files are prevented from becoming accidental French structure.
