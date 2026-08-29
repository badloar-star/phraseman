# Learning V2 English — full course blueprint owner review

**Recorded:** 2026-08-28.  
**State:** `MATERIALIZED / STRUCTURAL GATES PASS / OWNER APPROVAL PENDING`.  
**Candidate fingerprint:**
`013e742080c20d6a71fc731dc55ac26aaeb0e1fda2d3e6fd59712b65fdc1695a`.

Этот receipt заменяет прежнее состояние, где owner map показывал 1 792 пустых
`HOLD · EXACT PACKET PENDING` слота. Он не разрешает release и не утверждает
learner-facing тексты: сначала владелец просматривает полный curriculum
fingerprint, затем существующие Sessions 1–3 проходят conformance audit, и
только потом можно последовательно писать Session 4+.

## Канонические артефакты

- `modules/learning-v2/curriculum/en/course_blueprint_en_v1.ts` — единый body и
  стабильный fingerprint;
- `grammar_operations_en_v1.ts` + `grammar_operations_en_course_v1.ts` — 136
  human-authored grammar operations;
- `prerequisite_dag_en_v1.ts` — 194 prerequisite edges;
- `lexical_senses_en_v1.ts` — 280 lexical senses и 730 retrieval edges;
- `chapter_blueprints_en_v1.ts` — 224 chapter outcomes;
- `chapter_examples_en_v1.ts` — по два owner-reviewable canonical English
  examples для каждой главы;
- `exact_session_packets_en_v1.ts` — 1 792 exact packets;
- `coverage_matrices_en_v1.ts` — grammar, lexical и can-do coverage matrices;
- `.codex-tmp/learning-v2-curriculum-owner-map/index.html` — кликабельная
  проекция тех же данных, не отдельный источник правды.

## Что уже проверяет gate

- 32 урока × 7 глав × 8 sessions;
- одна introduction-глава на каждую grammar operation;
- checkpoint lessons 8/16/24/32 не вводят grammar;
- нет неизвестных или будущих prerequisite/review IDs;
- каждый packet имеет exact role, can-do, grammar operation или review set,
  lexical plan, measurable learning delta, 2 canonical examples, allowed
  mode families и independent probe;
- нет `sound_contrast` и буквенной сборки;
- все lexical IDs существуют, имеют first-introduction lesson и будущие
  retrieval edges;
- course validator сообщает `packet_findings=0`.

## Свежие команды

```text
npm run learning-v2:curriculum-blueprint-gate
LEARNING V2 CURRICULUM BLUEPRINT GATE: PASS
chapter_blueprints=224
exact_packets=1792 hold_packets=0
grammar_operations=136 dag_edges=194
dag_findings=0
packet_findings=0

npm run learning-v2:curriculum-owner-map:build
exactPackets=1792 chapterBlueprints=224 lexicalSenses=280

node tests/learning_v2_curriculum_owner_map_gate.mjs
LEARNING V2 CURRICULUM OWNER MAP GATE: PASS
```

## Непереходимая граница

`ownerApproval` остаётся `PENDING`. Нельзя называть blueprint `LOCKED`, менять
его fingerprint на approved или массово писать prompts/distractors/feedback/
localizations/audio без явного решения владельца после просмотра полного
owner map.
