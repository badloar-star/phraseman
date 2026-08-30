# Learning V2 English — lexical-density recenter

**Recorded:** 2026-08-30.  
**Scope:** canonical lexical assignment contract and first two chapter projections.

```text
LEARNING V2 RECENTER
completed packet/session: lesson-01:chapter:02 lexical plan; Sessions 09–15 introduce 21 senses, Session 16 introduces none
next exact packet: lesson-01:session:17 lexical assignment (chapter 03, you/we/they + are)
documents reread: PASS
blueprint fingerprint: a8e60213590c364a4ae0c1b1ce62b8b5bda541f48a54159e0823867445281559
grammar/review focus: en.grammar.present_be_affirmative.he_she_it_is
lexical role: introduce_and_retrieve for Sessions 09–15; retrieval_only for checkpoint Session 16
new senses: tall, short, young, old, kind, funny, smart, strong, quiet, loud, friendly, helpful, small, big, clean, dirty, open, closed, easy, difficult, important
retrieved senses: explicit changed-context chain from each completed teaching session into the next; scheduled later retrieval retained
learning delta: grounding → lower support → diagnostic contrast → application → repair → listening → spoken production → checkpoint
phrase frames/examples: PASS; he/she/it + is + complement with 3 session-specific examples
course stage order: PASS for the completed first- and second-chapter lexical scope
prerequisites/boundary: PASS; Session 09–15 use only the already reached he/she/it + is operation
owner map fresh: PASS
status: ON TRACK for the next lexical-planning packet; aggregate blueprint remains HOLD pending 1,484 lexical-density findings and new owner approval
```

## Focused evidence

- `npx tsx tests/learning_v2_session_lexical_assignments_gate_v2.ts` — PASS,
  `assignments=14`, `course_start_senses=20`, `he_she_it_senses=21`;
- `npx tsx tests/learning_v2_course_start_prerequisite_gate_v2.ts` — PASS;
- `npx tsx tests/learning_v2_grammar_registry_gate_v2.ts` — PASS,
  `operations=155`;
- `npx tsx scripts/learning_v2_curriculum_blueprint_gate_v2.ts` — expected
  aggregate HOLD: `lexical_density_findings=1484`, all semantic and course-start
  findings zero;
- `npx tsx scripts/build_learning_v2_curriculum_owner_map_v2.ts` — owner map
  rebuilt from canonical source with the fingerprint above.

## Binding owner rule

Every Session 1–7 in every chapter must introduce 1–5 useful new lexical
senses and retrieve earlier senses. Session 8 introduces zero new senses.
Repetition remains mandatory but never substitutes for lexical growth in a
non-checkpoint session. A number does not justify filler: every introduced
sense must fit the exact grammar operation/can-do and receive later retrieval.
