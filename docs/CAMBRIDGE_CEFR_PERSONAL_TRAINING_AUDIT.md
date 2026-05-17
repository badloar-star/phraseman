# Cambridge/CEFR Personal Training Audit

Date: 2026-05-16

Scope: 56 active Jesse-reworked personal grammar trainings.

Sources used:
- Cambridge English, International language standards: https://www.cambridgeenglish.org/exams-and-tests/cefr/
- Cambridge English, Using the CEFR: Principles of Good Practice: https://www.cambridgeenglish.org/Images/126011-using-cefr-principles-of-good-practice.pdf
- English Profile, Introducing the CEFR for English: https://www.englishprofile.org/images/pdf/theenglishprofilebooklet.pdf

Important caveat:
CEFR is not a grammar checklist by itself. Cambridge explicitly frames it as a reference framework, not a prescriptive syllabus. For English grammar placement, the better model is Cambridge/English Profile-style alignment: grammar points should be assigned to levels with a reason, examples, learner output, and prerequisite control.

## Executive Verdict

Jesse content is technically complete, but Cambridge-style level governance is still missing.

The trainings are good as isolated micro-lessons. The weak point is course architecture:

- no `cefrLevel` per training;
- no prerequisite graph;
- no overlevel/underlevel warning;
- no learner-facing level ladder;
- no distinction between "can be introduced at A2" and "should be mastered at B1";
- no Cambridge-style audit trail explaining why a topic belongs where it belongs.

So yes: before calling this production-ready pedagogy, we should add a CEFR layer.

## Recommended CEFR Bands

### A1 Core

These should appear earliest. They support survival-level sentence building.

- `to_be_present_agreement`
- `there_is_are`
- `noun_singular_plural_basic`
- `article_a_an`
- `determiner_this_that_these_those`
- `pronoun_case`
- `pronoun_possessive`
- `word_order_basic_statement`
- `word_order_basic_question`
- `verb_present_simple_statement`
- `verb_present_simple_negative_question`
- `verb_third_person`
- `imperative_basic`
- `preposition_place_in_on_at`
- `preposition_time_in_on_at`
- `adverb_frequency_position`
- `modifier_very_really_quite`

Risk:
Some of these can become A2 if examples include too much lexical load. Keep examples concrete, short, and everyday.

### A2 Core

These are still basic-user topics, but they require more sentence control, contrast, or time reference.

- `article_the_specific`
- `article_zero`
- `quantifier_some_any`
- `adjective_comparison`
- `adjective_vs_adverb`
- `too_enough`
- `object_order_give_me_it`
- `preposition_direction`
- `preposition_direction_to_into_from`
- `preposition_time_place`
- `preposition_duration_for_since`
- `modal_base_form`
- `modal_can_could_ability_request`
- `modal_should_must_have_to`
- `verb_was_were`
- `verb_past_simple_regular_irregular`
- `verb_past_simple_negative_question`
- `verb_present_continuous_basic`
- `verb_present_simple_vs_continuous`
- `future_will_going_to`
- `future_present_continuous_arrangements`

Risk:
`could`, `should/must/have to`, and future arrangements should be kept functional. If they turn into abstract grammar explanation, they drift toward B1.

### A2+/B1 Bridge

These are the danger zone. They can be taught simply, but they often break beginners if placed too early.

- `past_continuous_basic`
- `past_simple_vs_past_continuous`
- `verb_present_perfect_basic`
- `present_perfect_questions_negatives`
- `present_perfect_for_since`
- `present_perfect_vs_past_simple`
- `used_to_basic`
- `condition_zero_first`
- `conjunction_logic`
- `preposition_common_verb_patterns`
- `infinitive_vs_gerund_basic`
- `phrasal_particle_pair`
- `modal_may_might_probability`

Risk:
These need prerequisite gates. A learner should not reach `present_perfect_vs_past_simple` before passing past simple, present perfect basic, and time-marker contrast.

### B1 Core

These are independent-user topics. They require connected speech, clause control, reported meaning, or hypothetical meaning.

- `condition_second_basic`
- `relative_clauses_who_which_that`
- `reported_speech_basic`
- `modal_force`

Risk:
`modal_force` is not a beginner modal topic. If the training distinguishes "must" as logical conclusion vs obligation, or "can't" as impossibility, it should be B1/B1+.

## Main Architecture Gaps

### 1. No Level Metadata

Current file:

- `app/personal_training_taxonomy.ts`

The taxonomy tracks status and QA, but not pedagogical placement.

Recommended fields:

```ts
cefrLevel: 'A1' | 'A2' | 'A2+' | 'B1' | 'B1+';
prerequisites: PosMicroDiagnosisId[];
placementRisk: 'low' | 'medium' | 'high';
```

### 2. No Prerequisite Graph

The biggest practical issue is not topic quality. It is sequencing.

Examples:

- `present_perfect_vs_past_simple` needs `verb_past_simple_regular_irregular`, `verb_present_perfect_basic`, and preferably `present_perfect_for_since`.
- `past_simple_vs_past_continuous` needs `verb_past_simple_regular_irregular`, `verb_past_simple_negative_question`, and `past_continuous_basic`.
- `condition_second_basic` needs `condition_zero_first`, past-form familiarity, and modal base-form control.
- `reported_speech_basic` needs statement word order, pronoun case, past forms, and basic tense awareness.
- `relative_clauses_who_which_that` needs noun phrase control and basic clause order.

### 3. Mixed "Introduce" vs "Master"

Cambridge-style alignment needs two separate ideas:

- introducedLevel: when learner can first meet it;
- masteryLevel: when learner should reliably use it.

Example:

- `present_perfect_for_since` can be introduced at A2+, but reliable contrast with past simple is B1.
- `could` as polite request can be A2; `could` as past ability/probability contrast is higher.
- `will/going to` can be A2; nuanced prediction/intention contrast is B1.

### 4. Beginner Course May Feel Too Grammar-Dense

The list is grammar-complete, but a Cambridge-style learner path should not present all grammar points as equal units.

For A1/A2 users, prioritize:

- sentence survival;
- question building;
- time/place;
- basic verb tense;
- everyday requests;
- correction of high-frequency Russian-transfer errors.

Hold back:

- abstract modal force;
- full reported speech;
- present perfect vs past simple;
- infinitive vs gerund pattern lists;
- phrasal particle contrast unless examples are tiny.

## Proposed Implementation Pass

### Pass 1: Add CEFR Metadata

Update `app/personal_training_taxonomy.ts` with level metadata and prerequisites.

Deliverable:

- every active training has `cefrLevel`;
- every A2+/B1 training has prerequisites;
- no high-risk item appears without a gate.

### Pass 2: Admin Visibility

Sync metadata into `admin/personal-trainings.js`.

Admin should show:

- CEFR level;
- prerequisite count;
- placement risk;
- whether the training is available by default or gated.

### Pass 3: Route Learners by Level

Use metadata to decide what a learner sees after diagnosis.

Suggested behavior:

- A1 learner: never receive B1 grammar as primary recommendation;
- A2 learner: can receive A2+/B1 bridge only if prerequisites are passed;
- B1 learner: can receive bridge and B1 topics;
- mixed-level learner: receive prerequisite repair before advanced contrast.

### Pass 4: QA Rule

Add a QA check:

- every taxonomy item must have a CEFR level;
- every B1 or A2+/B1 item must have prerequisites;
- no training can depend on an inactive training;
- no circular prerequisites.

## High-Priority Reordering Recommendations

Move earlier:

- `word_order_basic_statement`
- `word_order_basic_question`
- `to_be_present_agreement`
- `there_is_are`
- `verb_present_simple_statement`
- `verb_present_simple_negative_question`
- `verb_third_person`
- `pronoun_case`
- `article_a_an`
- `preposition_place_in_on_at`

Gate behind prerequisites:

- `present_perfect_vs_past_simple`
- `present_perfect_questions_negatives`
- `past_simple_vs_past_continuous`
- `condition_second_basic`
- `reported_speech_basic`
- `relative_clauses_who_which_that`
- `infinitive_vs_gerund_basic`
- `modal_force`

Potentially split later:

- `preposition_common_verb_patterns`
- `infinitive_vs_gerund_basic`
- `phrasal_particle_pair`
- `modal_should_must_have_to`
- `modal_can_could_ability_request`

Reason:
These can contain multiple learner problems inside one label. Cambridge-style progression works better when each item tests one narrow competency.

## Verdict

Jesse pass answered: "Are the trainings clean and contract-compliant?"

Cambridge/CEFR pass should answer: "Are the trainings in the right learning order?"

Current answer:

Not yet. Content is clean, but the course needs CEFR metadata and prerequisite gates before it can honestly claim Cambridge-style progression.
