# Learning V2 English — Source Evidence Ledger

**Status:** draft research authority for the English 32 × 56 blueprint.  
**Rule:** a source constrains decisions; it does not silently generate the
Phraseman syllabus. Exact sequencing, counts and product mechanics remain
owner-approved product decisions unless a source explicitly supports them.

## Evidence labels

- `PRIMARY_STANDARD` — official framework or descriptor source.
- `PRIMARY_LANGUAGE_PROFILE` — corpus-informed English progression source.
- `PRIMARY_RESEARCH` — peer-reviewed primary study or meta-analysis.
- `PRODUCT_HYPOTHESIS` — plausible Phraseman decision requiring validation.
- `OWNER_CONTRACT` — direct product boundary; normative for implementation but
  not presented as external scientific evidence.

## External sources

### EV-CEFR-01 — CEFR descriptors

- Label: `PRIMARY_STANDARD`
- Source: [Council of Europe CEFR descriptors](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-descriptors)
- Use: define observable, action-oriented communicative outcomes and avoid
  treating isolated grammar recognition as the final course goal.
- Does not establish: a universal English grammar teaching order, exact session
  counts, a vocabulary list, or automatic certification.

### EV-CEFR-02 — CEFR Companion Volume

- Label: `PRIMARY_STANDARD`
- Source: [CEFR Companion Volume 2020](https://rm.coe.int/cefr-companion-volume-with-new-descriptors-2020/16809ea0d4)
- Use: mediation, interaction, reception and production remain distinct
  communicative activities; course outcomes must be broader than item tests.
- Does not establish: Phraseman mode choreography or an English-specific
  prerequisite graph.

### EV-EP-01 — English Profile

- Label: `PRIMARY_LANGUAGE_PROFILE`
- Source: [English Profile](https://englishprofile.org/?menu=english-vocabulary-profile)
- Use: English grammar and vocabulary progression must be language-specific;
  vocabulary is tracked at the level of meaning/sense rather than spelling
  alone; corpus evidence can inform level estimates.
- Does not establish: that every listed item must enter this course, or that a
  corpus level is by itself a pedagogical prerequisite.

### EV-EP-02 — English Profile booklet

- Label: `PRIMARY_LANGUAGE_PROFILE`
- Source: [The English Profile booklet](https://www.englishprofile.org/images/pdf/theenglishprofilebooklet.pdf)
- Use: calibrate grammar/vocabulary claims and document uncertainty when a form
  spans levels or meanings.
- Does not establish: a fixed 32-lesson architecture.

### EV-CAM-01 — guided learning hours

- Label: `PRIMARY_STANDARD`
- Source: [Cambridge English guided learning hours](https://support.cambridgeenglish.org/hc/en-gb/articles/202838506-Guided-learning-hours)
- Use: sanity-check claims about course duration and level reach. Published
  figures are approximate cumulative guidance, not guarantees.
- Does not establish: that 209 product hours guarantee A2, nor that every
  learner reaches the same level.

### EV-CAM-B1-GRAMMAR-01 — Cambridge B1 grammar and language specification

- Label: `PRIMARY_STANDARD`
- Source: [Cambridge B1 Preliminary handbook](https://www.cambridgeenglish.org/Images/557771-b1-preliminary-handbook-2020.pdf)
- Use: constrain the functional B1 grammar coverage boundary and verify that
  the course spine includes the common form/meaning systems needed by B1 tasks.
- Does not establish: Phraseman's exact 32-lesson order, seven-chapter split,
  interaction counts or product mode choreography.

### EV-DIST-01 — distributed practice

- Label: `PRIMARY_RESEARCH`
- Source: [Cepeda et al. (2006), Psychological Bulletin](https://pubmed.ncbi.nlm.nih.gov/16719566/)
- Use: distribute retrieval instead of exhausting an item in one encounter;
  delay should depend on the intended retention interval.
- Does not establish: one universal numeric spacing schedule for this product.

### EV-RET-01 — retrieval practice

- Label: `PRIMARY_RESEARCH`
- Source: [Karpicke & Roediger (2008), Science](https://doi.org/10.1126/science.1152408)
- Use: schedule effortful retrieval after successful study rather than relying
  only on repeated exposure.
- Does not establish: that every retrieval attempt should use the same mode or
  that feedback may be omitted.

### EV-FB-01 — corrective feedback

- Label: `PRIMARY_RESEARCH`
- Source: [Butler & Roediger (2008), Memory & Cognition](https://doi.org/10.3758/MC.36.3.604)
- Use: wrong choices need corrective feedback tied to the selected lure;
  feedback should repair the misconception rather than merely mark failure.
- Does not establish: Phraseman copy length or visual treatment.

### EV-INT-01 — novice interleaving boundary

- Label: `PRIMARY_RESEARCH`
- Source: [Hwang (2025), Language Learning](https://doi.org/10.1111/lang.12659)
- Use: do not assume immediate maximal interleaving is always best for novice
  L2 learners; establish a construct with guided/blocked work before mixing
  close alternatives.
- Does not establish: a universal fixed blocked-to-interleaved ratio.

## Owner contracts used as curriculum constraints

### OC-TOPOLOGY-01

- Label: `OWNER_CONTRACT`
- Source: `modules/learning-v2/content/course_topology_v1.ts`
- Constraint: exactly 32 lessons × 56 sessions; 7 chapters × 8 sessions;
  chapter checkpoints at 8/16/24/32/40/48 and lesson final at 56.

### OC-SCENARIO-01

- Label: `OWNER_CONTRACT`
- Source: `docs/v2/03-learning-architecture-and-curriculum.md`
- Constraint: preserve the 32 scenario lesson identities and their lesson-level
  can-do boundaries.

### OC-SCOPE-01

- Label: `OWNER_CONTRACT`
- Source: `docs/v2/03-learning-architecture-and-curriculum.md`
- Constraint: course starts at A0/PRE_A1 and targets strong functional A1 plus
  selected early-A2 tasks; it does not promise certification or guaranteed A2.

### OC-FULL-B1-SCOPE-01

- Label: `OWNER_CONTRACT`
- Source:
  `docs/superpowers/specs/2026-08-30-learning-v2-english-full-b1-grammar-first-blueprint-design.md`
- Constraint: this later explicit owner decision supersedes `OC-SCOPE-01` for
  the replacement English blueprint. Exactly 32 grammar-first lessons progress
  from zero support through a functional B1 boundary; every lesson owns a new
  major grammar system, and checkpoints exist only inside lessons.

### OC-ORCHESTRATION-01

- Label: `OWNER_CONTRACT`
- Source: `docs/v2/LEARNING_V2_1792_SESSION_PEDAGOGICAL_ORCHESTRATION.ru.md`
- Constraint: fixed prerequisites/evidence with bounded adaptation; 32 lesson,
  224 chapter and 1,792 session planning artifacts are required.

### OC-AUTHORING-01

- Label: `OWNER_CONTRACT`
- Source: `docs/v2/СТАРТ В2.md`
- Constraint: one new grammar operation or explicit review per packet; no
  unexplained future grammar; intro, practice and independent probe align.

## Product hypotheses requiring later validation

### PH-SPACING-01

- Label: `PRODUCT_HYPOTHESIS`
- Hypothesis: a newly introduced construct should receive same-chapter guided
  practice, a later-chapter retrieval probe, a later-lesson retrieval probe and
  transfer use in a checkpoint.
- Required evidence: telemetry comparing retention and error recurrence by
  delay; owner review of burden.

### PH-LEXICON-01

- Label: `PRODUCT_HYPOTHESIS`
- Owner-updated product rule: Sessions 1–7 of every chapter combine 1–5 useful
  new lexical senses with retrieval of earlier senses. Session 8 is the only
  retrieval-only role and introduces zero new senses. Voice, delayed
  retrieval, targeted repair and transfer remain compatible by grounding new
  words before scored use.
- Required evidence: completion time, independent/delayed recall,
  cognitive-load telemetry and lexical-growth distribution across chapters.

### OC-REVIEW-01

- Label: `OWNER_CONTRACT`
- Decision: review is valid only when it creates a learning delta through
  support fading, delay, changed context, contrast, productive shift, targeted
  repair or transfer. Identical repetition is not valid review.

### PH-GRAMMAR-01

- Label: `PRODUCT_HYPOTHESIS`
- Hypothesis: one operational grammar increment per introduction session is
  more reviewable and less prone to hidden prerequisites than bundling several
  new operations.
- Required evidence: conformance audits, error attribution and owner review.

### PH-MODE-01

- Label: `PRODUCT_HYPOTHESIS`
- Hypothesis: modes should be selected by learning function rather than by a
  fixed carousel, while every session still meets the owner-required mode
  coverage contract.
- Required evidence: per-mode success/latency and construct-transfer analysis.

## Citation discipline

Every grammar operation, lexical sense and retrieval schedule in the English
blueprint must reference at least one `EV-*` or `OC-*` entry. Exact choices not
entailed by that evidence must additionally reference a `PH-*` or a new
explicit owner decision. Missing references are a blueprint `HOLD`.
