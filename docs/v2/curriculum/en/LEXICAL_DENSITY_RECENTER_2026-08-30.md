# Learning V2 English — lexical-density recenter

**Recorded:** 2026-08-30.  
**Scope:** canonical lexical assignment contract and first three chapter projections.

```text
LEARNING V2 RECENTER
completed packet/session: lesson-01:chapter:03 lexical plan; Sessions 17–23 introduce 21 senses, Session 24 introduces none
next exact packet: lesson-01:session:25 lexical assignment (chapter 04, full am/is/are choice)
documents reread: PASS
blueprint fingerprint: b98f142c5bb3fab63153a68e38e1f875a4139d11fb7de5a29dd26de46e0554f8
grammar/review focus: en.grammar.present_be_affirmative.you_we_they_are
lexical role: introduce_and_retrieve for Sessions 17–23; retrieval_only for checkpoint Session 24
new senses: welcome, safe, right, wrong, early, lucky, together, alone, nearby, lost, prepared, careful, inside, outside, upstairs, rich, poor, famous, married, single, different
retrieved senses: explicit changed-context chain from each completed teaching session into the next; scheduled later retrieval retained
learning delta: grounding → lower support → diagnostic contrast → application → repair → listening → spoken production → checkpoint
phrase frames/examples: PASS; you/we/they + are + complement with 3 session-specific examples
course stage order: PASS for the completed first three chapter lexical scopes
prerequisites/boundary: PASS; Session 17–23 use only the already reached you/we/they + are operation
owner map fresh: PASS
status: ON TRACK for the next lexical-planning packet; aggregate blueprint remains HOLD pending 1,479 lexical-density findings and new owner approval
```

## Focused evidence

- `npx tsx tests/learning_v2_session_lexical_assignments_gate_v2.ts` — PASS,
  `assignments=21`, `course_start_senses=20`, `he_she_it_senses=21`,
  `you_we_they_senses=21`;
- `npx tsx tests/learning_v2_course_start_prerequisite_gate_v2.ts` — PASS;
- `npx tsx tests/learning_v2_grammar_registry_gate_v2.ts` — PASS,
  `operations=155`;
- `npx tsx scripts/learning_v2_curriculum_blueprint_gate_v2.ts` — expected
  aggregate HOLD: `lexical_density_findings=1479`, all semantic and course-start
  findings zero;
- `npx tsx scripts/build_learning_v2_curriculum_owner_map_v2.ts` — owner map
  rebuilt from canonical source with the fingerprint above.

## Binding owner rule

Every Session 1–7 in every chapter must introduce 1–5 useful new lexical
senses and retrieve earlier senses. Session 8 introduces zero new senses.
Repetition remains mandatory but never substitutes for lexical growth in a
non-checkpoint session. A number does not justify filler: every introduced
sense must fit the exact grammar operation/can-do and receive later retrieval.
