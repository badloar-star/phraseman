# Learning V2 English — Sessions 01–03 blueprint conformance audit

**Recorded:** 2026-08-30  
**Blueprint fingerprint:**
`3a4ca1422a6125bb317121c312c0166fdb595ee90111f297c480c8a82b7716e4`  
**Blueprint approval:** `PENDING`  
**Verdict:** `HOLD` — 9 deterministic source findings.

## Why the blueprint changed

The previously approved fingerprint
`ce1163d02a965e843e56a17c306ff4f14d55033ba21e75d7fbb082557fb61c1a`
was not prerequisite-safe at the course start. Its first operation used the
whole `am/is/are` system and treated `here/ready` as known at PRE-A1. The
mandatory Session 1 preflight exposed that defect, so the fingerprint is now
`SUPERSEDED`.

The amended blueprint now establishes this order:

1. `I + am` with canonical examples `I am here.` and `I am ready.`;
2. `he/she/it + is`;
3. `you/we/they + are`;
4. full-form choice across the explained patterns;
5. contractions.

Session 1 explicitly introduces `here` and `ready`. Every later pattern is
forbidden until its own chapter. This exact course-start contract is protected
by `tests/learning_v2_course_start_prerequisite_gate_v2.ts` and by the
aggregate curriculum gate.

## Current source findings

`tests/learning_v2_lesson1_sessions_01_03_blueprint_conformance_gate.ts`
currently reports:

- Session 1: source inventory still classifies grammar forms `I/am` together
  with lexical senses and lacks a binding to the amended fingerprint;
- Session 2: old `happy/sad/tired/fine` introduction does not match the
  guided `I am` packet, has no canonical anchor and has no amended binding;
- Session 3: old contraction focus arrives before its dedicated chapter, has
  no canonical anchor and has no amended binding.

The gate output is intentionally `HOLD (9 findings)`. Learner-facing sources
were not edited because the amended blueprint requires a new exact owner
approval first. After approval, only Session 1 may be reconciled; Session 2
remains frozen until Session 1 reaches zero findings and completes its own
learner-facing review.

## Focused evidence

```text
LEARNING V2 COURSE START PREREQUISITE GATE V2: PASS
LEARNING V2 GRAMMAR REGISTRY V2 GATE: PASS operations=155
LEARNING V2 PREREQUISITE DAG V2 GATE: PASS operations=155 edges=154
LEARNING V2 LEXICAL PROGRESSION GATE V2: PASS planned_senses=97 retrieval_edges=382 lessons=32
LEARNING V2 EXACT SESSION PACKETS GATE V2: PASS packets=1792 intros=5376 practices=30464 checkpoints=224
LEARNING V2 CURRICULUM BLUEPRINT V2 GATE: HOLD approval_pass=false course_start_findings=0
```

The final HOLD is the expected authorization boundary, not a structural or
semantic failure. The next legal action is explicit owner approval of the exact
fingerprint shown at the top of this receipt.
