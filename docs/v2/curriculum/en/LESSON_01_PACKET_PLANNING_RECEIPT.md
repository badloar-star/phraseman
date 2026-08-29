# Learning V2 English — Lesson 01 packet-planning receipt

**Recorded:** 2026-08-28.  
**Scope:** historical milestone receipt, superseded for current counts and
fingerprint by `FULL_COURSE_BLUEPRINT_OWNER_REVIEW_2026-08-28.md`. It still does
not authorize learner-facing authoring.

## Recenter receipt

```text
LEARNING V2 RECENTER
completed packet/session: curriculum planning layer — 1,792 exact packets materialized
next learner-facing session: HOLD — owner approval of full candidate fingerprint is still required
documents reread: PASS
blueprint fingerprint: 013e742080c20d6a71fc731dc55ac26aaeb0e1fda2d3e6fd59712b65fdc1695a (candidate; owner PENDING)
grammar/review focus: exact per packet in canonical full-course module
lexical role: exact per packet; 280 senses and 730 retrieval edges
new senses: assigned by packet where useful
retrieved senses: assigned by packet from prior introductions
learning delta: assigned for all review packets
phrase frames/examples: two canonical examples per chapter, projected into exact packets
course stage order: PASS through full owner-map materialization
prerequisites/boundary: PASS across full 136-operation DAG
owner map fresh: PASS
status: STRUCTURAL PASS / OWNER APPROVAL PENDING
```

## Documents reread completely

1. `docs/v2/СТАРТ В2.md`;
2. `docs/v2/MODE_NATIVE_AUTHORING_CONTRACT.ru.md`;
3. `docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md`;
4. `docs/v2/LEARNING_V2_COURSE_BLUEPRINT_32X56_DESIGN.ru.md`;
5. `docs/v2/curriculum/en/RESEARCH_DOSSIER.ru.md`;
6. `docs/v2/curriculum/en/SOURCE_EVIDENCE_LEDGER.md`;
7. `docs/v2/curriculum/en/COURSE_OVERVIEW_32_LESSONS.ru.md`;
8. `docs/v2/curriculum/AFTER_EVERY_SESSION_RECENTER.ru.md`.

## Fresh focused evidence

- `npx tsx tests/learning_v2_course_blueprint_contract_gate.ts` — `PASS`;
- `npx tsx tests/learning_v2_grammar_prerequisite_dag_gate.ts` — `PASS`;
- `npm run learning-v2:curriculum-blueprint-gate` — `PASS`:
  `exact_packets=1792`, `hold_packets=0`, `grammar_operations=136`,
  `dag_edges=194`, `dag_findings=0`, `packet_findings=0`;
- `npm run learning-v2:curriculum-owner-map:build` — `32 lessons`,
  `224 chapters`, `1792 session slots`;
- `node tests/learning_v2_curriculum_owner_map_gate.mjs` — `PASS`.

## Fingerprint authority

Старые file-level SHA из registry-only milestone больше не являются свежими и
намеренно удалены. Единственная текущая aggregate authority — candidate
fingerprint из `FULL_COURSE_BLUEPRINT_OWNER_REVIEW_2026-08-28.md`; owner HTML
обязан показывать тот же fingerprint.

## Exact blocker before learner-facing Session 4

The full curriculum planning layer exists and passes structural gates. The
remaining blocker is owner review and explicit approval of the candidate
fingerprint in the full clickable map. Approval must not be inferred from a
green test or from this receipt.
