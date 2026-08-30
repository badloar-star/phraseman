# Learning V2 English — lexical-density recenter

**Recorded:** 2026-08-30.  
**Scope:** canonical lexical assignment contract and first four chapter projections.

```text
LEARNING V2 RECENTER
completed packet/session: lesson-01:chapter:04 lexical plan; Sessions 25–31 introduce 21 senses, Session 32 introduces none
next exact packet: lesson-01:session:33 lexical assignment (chapter 05, contractions)
documents reread: PASS
blueprint fingerprint: 94ab72b4979033687bde511b0b7de9b53a1692190e61dfe7cfc8475b94673cbf
grammar/review focus: en.grammar.present_be_affirmative.full_form_choice
lexical role: introduce_and_retrieve for Sessions 25–31; retrieval_only for checkpoint Session 32
new senses: proud, ashamed, surprised, bored, confused, worried, awake, asleep, available, correct, certain, serious, local, foreign, online, alive, dead, missing, equal, similar, separate
retrieved senses: explicit changed-context chain from each completed teaching session into the next; scheduled later retrieval retained
learning delta: grounding → lower support → diagnostic contrast → application → repair → listening → spoken production → checkpoint
phrase frames/examples: PASS; subject + am/is/are + complement with 3 session-specific examples
course stage order: PASS for the completed first four chapter lexical scopes
prerequisites/boundary: PASS; Session 25–31 interleave only previously introduced subject/form rows
owner map fresh: PASS
status: ON TRACK for the next lexical-planning packet; aggregate blueprint remains HOLD pending 1,472 lexical-density findings and new owner approval
```

## Focused evidence

- `npx tsx tests/learning_v2_session_lexical_assignments_gate_v2.ts` — PASS,
  `assignments=21`, `course_start_senses=20`, `he_she_it_senses=21`,
  `you_we_they_senses=21`, `full_be_choice_senses=21`;
- `npx tsx tests/learning_v2_course_start_prerequisite_gate_v2.ts` — PASS;
- `npx tsx tests/learning_v2_grammar_registry_gate_v2.ts` — PASS,
  `operations=155`;
- `npx tsx scripts/learning_v2_curriculum_blueprint_gate_v2.ts` — expected
  aggregate HOLD: `lexical_density_findings=1472`, all semantic and course-start
  findings zero;
- `npx tsx scripts/build_learning_v2_curriculum_owner_map_v2.ts` — owner map
  rebuilt from canonical source with the fingerprint above.

## Binding owner rule

Every Session 1–7 in every chapter must introduce 1–5 useful new lexical
senses and retrieve earlier senses. Session 8 introduces zero new senses.
Repetition remains mandatory but never substitutes for lexical growth in a
non-checkpoint session. A number does not justify filler: every introduced
sense must fit the exact grammar operation/can-do and receive later retrieval.
