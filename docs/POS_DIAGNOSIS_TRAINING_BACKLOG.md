# POS Diagnosis Training Backlog

Last audited: 2026-05-13

Goal: every confident diagnosis should have its own small training, not only a broad POS category lesson.

Current state: microdiagnoses exist as labels and heuristic detection in `app/pos_micro_diagnosis.ts`. A first diagnosis-training engine now exists. `article_a_an`, `article_the_specific`, `article_zero`, `preposition_time_in_on_at`, `preposition_place_in_on_at`, `preposition_duration_for_since`, `preposition_direction_to_into_from`, `preposition_common_verb_patterns`, `object_order_give_me_it`, `word_order_basic_statement`, `word_order_basic_question`, `verb_present_simple_negative_question`, `verb_present_continuous_basic`, `verb_present_simple_vs_continuous`, `verb_past_simple_regular_irregular`, `verb_was_were`, `future_will_going_to`, `infinitive_vs_gerund_basic`, `too_enough`, `verb_present_simple_statement`, `verb_third_person`, `to_be_present_agreement`, `there_is_are`, `modal_base_form`, `modal_force`, `pronoun_case`, `pronoun_possessive`, `adjective_comparison`, `adjective_vs_adverb`, `adverb_frequency_position`, `conjunction_logic`, `phrasal_particle_pair`, `quantifier_some_any`, `determiner_this_that_these_those`, and `noun_singular_plural_basic` have full MVP-review contracts with examples, 12+ exercises, distractor-specific feedback, guided recovery, mastery rules, routing, and Smart Trainer config. Most remaining diagnoses still route to diagnosis trainings and broad POS trainer pools.

## Content Contract For Every Diagnosis Training

Every new diagnosis training should be created as a compact standalone unit:

| Field | Requirement |
|---|---|
| `id` | Stable diagnosis id, e.g. `article_a_an` |
| `category` | One POS category from `WordCategory` |
| `title` | Short RU/UK/ES title shown in toast/coach/trainer |
| `diagnosisText` | What exactly went wrong, in plain user language |
| `mentalModel` | One simple model the user can apply before answering |
| `contrastSet` | The exact options being contrasted, e.g. `a/an`, `in/on/at`, `must/should` |
| `examples` | 6-10 good examples with RU/UK/ES support |
| `exercises` | At least 12 items: 4 easy, 4 contrast, 4 mixed review |
| `distractors` | Only plausible distractors for this diagnosis, not random POS words |
| `routing` | Must be launched by microdiagnosis id, not only category |
| `analytics` | Must log exact token/category/microdiagnosis after each mistake |

## Microdiagnoses That Exist Now

| Diagnosis ID | Category | Current Detection | Current Training | Needed Standalone Training |
|---|---|---|---|---|
| `article_a_an` | article | token/picked is `a` or `an` | Full MVP-review training exists in `app/diagnosis_training_article_a_an.ts` | Review content in product UI, then use as template for the next diagnoses. |
| `article_the_specific` | article | token/picked is `the` | Full MVP-review training exists in `app/diagnosis_training_article_the_specific.ts` | Review content in product UI, then use as template for specificity-style article diagnoses. |
| `article_zero` | article | token/picked/raw says zero/no article | Full MVP-review training exists in `app/diagnosis_training_article_zero.ts` | Review content in product UI, then use as template for general-vs-specific diagnoses. |
| `quantifier_some_any` | determiner | token/picked/raw says some/any/no or determiner/quantifier | Full MVP-review training exists in `app/diagnosis_training_quantifier_some_any.ts` | Review content in product UI; keep many/much and few/little as future determiner splits. |
| `determiner_this_that_these_those` | determiner | token/picked/raw says this/that/these/those or demonstrative | Full MVP-review training exists in `app/diagnosis_training_determiner_this_that_these_those.ts` | Review content in product UI; keep broader it/this/that pronoun contrast as a future split. |
| `preposition_time_place` | preposition | legacy broad fallback | Broad preposition lesson + preposition slot trainer | Keep only as fallback when evidence cannot separate time/place. |
| `preposition_direction_to_into_from` | preposition | to/from/into/out of or raw movement/destination/source/inside-outside signal | Full MVP-review training exists in `app/diagnosis_training_preposition_direction_to_into_from.ts` | Review content in product UI; keep method/tool and fixed collocations separate. |
| `preposition_common_verb_patterns` | preposition | raw/phrase says fixed verb + preposition, e.g. `listen to`, `wait for`, `depend on`, `look at`, `talk to`, `think about`, `ask for`, `believe in` | Full MVP-review training exists in `app/diagnosis_training_preposition_common_verb_patterns.ts` | Review content in product UI; keep adjective collocations and recipient/beneficiary as future splits. |
| `object_order_give_me_it` | syntax | raw/category says syntax/object order/double object, especially `give me it`, `send her it`, `show me it`, or `to/for` confusion in two-object verbs | Full MVP-review training exists in `app/diagnosis_training_object_order_give_me_it.ts` | Review content in product UI; keep broader adverb/time word-order as a future syntax split. |
| `word_order_basic_statement` | syntax | raw/category says basic word order, subject/verb/object order, object-first, verb-before-subject, place-before-object, time-inside-core, or frequency-adverb position | Full MVP-review training exists in `app/diagnosis_training_word_order_basic_statement.ts` | Review content in product UI; keep questions/inversion as a future syntax split. |
| `word_order_basic_question` | syntax | raw/category says question order, question word order, missing auxiliary, does + -s, did + past, do with be/modal, or missing inversion after question words | Full MVP-review training exists in `app/diagnosis_training_word_order_basic_question.ts` | Review content in product UI; keep embedded questions and tag questions as future syntax splits. |
| `preposition_direction` | preposition | `to/from/into/onto/through/across/for/with/by/of` or movement raw | Broad preposition lesson + preposition slot trainer | Split into direction, transfer/recipient, method/tool, reason/purpose. |
| `verb_present_simple_negative_question` | verb | do/does questions and negatives | Full MVP-review training exists in `app/diagnosis_training_verb_present_simple_negative_question.ts` | Review content in product UI, then split affirmative third-person `-s` into a separate training if needed. |
| `verb_present_continuous_basic` | verb | raw says Present Continuous/continuous/progressive/be+ing/now/right now/at the moment or -ing + be signal | Full MVP-review training exists in `app/diagnosis_training_verb_present_continuous_basic.ts` | Review content in product UI; keep tense-family boundaries separate from Present Simple statement drills. |
| `verb_present_simple_vs_continuous` | verb | raw says Simple vs Continuous, habit vs now, usually vs now, tense contrast, or mixed time markers | Full MVP-review training exists in `app/diagnosis_training_verb_present_simple_vs_continuous.ts` | Review content in product UI; keep single-form missing-be errors in `verb_present_continuous_basic`. |
| `verb_past_simple_regular_irregular` | verb | raw says Past Simple/regular past/irregular past/past marker or phrase has yesterday/last night/ago/before | Full MVP-review training exists in `app/diagnosis_training_verb_past_simple_regular_irregular.ts` | Review content in product UI; keep did + base questions/negatives for a future split. |
| `verb_was_were` | verb | raw says was/were, past be, past to be, or present be with past markers like yesterday/last night | Full MVP-review training exists in `app/diagnosis_training_verb_was_were.ts` | Review content in product UI; keep past continuous `was/were + -ing` as a future split. |
| `future_will_going_to` | verb | raw says future will/going to, instant decision, promise, prediction, plan, evidence, will to, missing be going to, or double future | Full MVP-review training exists in `app/diagnosis_training_future_will_going_to.ts` | Review content in product UI; keep future conditionals as a future split. |
| `infinitive_vs_gerund_basic` | verb | raw says infinitive/gerund, to do vs doing, want/need/decide/plan + wrong form, or enjoy/finish/avoid/mind + wrong form | Full MVP-review training exists in `app/diagnosis_training_infinitive_vs_gerund_basic.ts` | Review content in product UI; keep object-complement patterns like `want me to` as a future split. |
| `verb_present_simple_statement` | verb | raw says Present Simple statement/habit/fact/routine/schedule or repeated-time phrase | Full MVP-review training exists in `app/diagnosis_training_verb_present_simple_statement.ts` | Review content in product UI; keep pure third-person spelling boundary in `verb_third_person`. |
| `verb_third_person` | verb | he/she/it, `-s/-es` | Full MVP-review training exists in `app/diagnosis_training_verb_third_person.ts` | Review content in product UI; keep question/negative double-marking in `verb_present_simple_negative_question`. |
| `verb_tense` | verb | generic verb form/tense | Broad verb lesson + form choice | Split by tense family: past simple, present continuous, present perfect, future/will, used to. |
| `verb_after_modal` | verb | raw/modal or modal token around verb | Broad verb/modal lessons | Create `after modal = base verb` drill: no `to`, no `-s`, no past form after modal. |
| `to_be_present_agreement` | to-be | present `am/is/are` or missing present be | Full MVP-review training exists in `app/diagnosis_training_to_be_present_agreement.ts` | Review content in product UI; past `was/were` now routes to `verb_was_were`. |
| `there_is_are` | existential | raw says existential/there is/there are/is there/are there/hay | Full MVP-review training exists in `app/diagnosis_training_there_is_are.ts` | Review content in product UI; keep it-is vs there-is deeper contrast as a future split if needed. |
| `to_be_agreement` | to-be | broad/past to-be fallback | Broad to-be lesson + form choice | Keep only as fallback when evidence cannot narrow to `to_be_present_agreement`, `there_is_are`, or `verb_was_were`. |
| `modal_base_form` | modal | raw modal structure/base-form signal, or modal followed by `to`/`-s`/past/`-ing` | Full MVP-review training exists in `app/diagnosis_training_modal_base_form.ts` | Review content in product UI; keep modal meaning contrast in `modal_force`. |
| `modal_force` | modal | token/picked is modal | Full MVP-review training exists in `app/diagnosis_training_modal_force.ts` | Review content in product UI; keep narrower modal meaning subtypes for deeper follow-up. |
| `pronoun_case` | pronoun | subject/object pronouns | Full MVP-review training exists in `app/diagnosis_training_pronoun_case.ts` | Review content in product UI; keep possessive pronouns as `pronoun_possessive`. |
| `pronoun_possessive` | pronoun | possessive pronouns | Full MVP-review training exists in `app/diagnosis_training_pronoun_possessive.ts` | Review content in product UI; keep subject/object case in `pronoun_case`. |
| `adjective_comparison` | adjective | comparative/superlative raw or `-er/-est/more` | Full MVP-review training exists in `app/diagnosis_training_adjective_comparison.ts` | Review content in product UI; keep superlative `-est/most` as a future split if needed. |
| `adjective_vs_adverb` | adjective/adverb | adjective or non-frequency adverb | Full MVP-review training exists in `app/diagnosis_training_adjective_vs_adverb.ts` | Review content in product UI; keep frequency adverb placement in `adverb_frequency_position`. |
| `adverb_frequency_position` | adverb | always/often/usually/sometimes/never etc. | Full MVP-review training exists in `app/diagnosis_training_adverb_frequency_position.ts` | Review content in product UI; keep manner adverbs in `adjective_vs_adverb`. |
| `too_enough` | modifier | raw/category says modifier, too/enough, too much/many, not enough, enough before adjective, enough after noun, or too ... to | Full MVP-review training exists in `app/diagnosis_training_too_enough.ts` | Review content in product UI; keep very/really degree intensifiers as a future adverb split. |
| `conjunction_logic` | conjunction | and/but/because/if/when/although etc. | Full MVP-review training exists in `app/diagnosis_training_conjunction_logic.ts` | Review content in product UI; keep paired connectors as future splits. |
| `phrasal_particle_pair` | phrasal_particle | up/off/on/out/over/back/away/down/in or raw phrasal | Full MVP-review training exists in `app/diagnosis_training_phrasal_particle_pair.ts` | Review content in product UI; keep separable/inseparable placement as a future split. |
| `noun_singular_plural_basic` | noun | token/picked/raw says plural/singular/count/uncountable/number or `-s/-es/-ies` | Full MVP-review training exists in `app/diagnosis_training_noun_singular_plural_basic.ts` | Review content in product UI; keep many/much and deeper countable/uncountable quantity as future splits. |
| `noun_number` | noun | legacy broad fallback | Broad noun lesson | Keep only as fallback if future noun-number evidence is too broad for the basic singular/plural training. |
| `noun_meaning` | noun | generic noun choice | Broad noun lesson | Create meaning contrast drill: person/place/thing/time/role; near-synonym contrast from lesson words. |
| `category_general` | any | fallback when no narrower subtype wins | Broad POS lesson only | Should not get a standalone training. Use it only when evidence is stable but subtype is unknown. |

## Additional Diagnoses Needed From Lesson / Word / Preposition Coverage

These are not yet first-class microdiagnosis ids, but should be added because the lesson and drill content can create these mistake types.

### Articles

| Proposed ID | Category | Why Needed | Training Spec |
|---|---|---|---|
| `article_countable_singular` | article | A/an requires a singular countable noun; many article errors are really countability errors. | Contrast `a car`, `cars`, `water`, `advice`; require user to decide countable/uncountable before article. |
| `article_unique_common` | article | `the sun`, `the airport`, `the same`, superlatives are not just "known object". | Train unique/shared-world references and fixed `the` patterns. |

### Prepositions

| Proposed ID | Category | Why Needed | Training Spec |
|---|---|---|---|
| `preposition_time_in_on_at` | preposition | `in/on/at` or raw time signal | Full MVP-review training exists in `app/diagnosis_training_preposition_time_in_on_at.ts` | Review content in product UI, then create separate place training. |
| `preposition_place_in_on_at` | preposition | raw place signal with `in/on/at` | Full MVP-review training exists in `app/diagnosis_training_preposition_place_in_on_at.ts` | Review content in product UI, then continue with duration/direction preposition trainings. |
| `preposition_duration_for_since` | preposition | token/picked is `for` or `since`, or raw duration signal | Full MVP-review training exists in `app/diagnosis_training_preposition_duration_for_since.ts` | Review content in product UI, then continue with direction/recipient/method prepositions. |
| `preposition_direction_to_into_from` | preposition | token/picked/raw says `to`, `into`, `from`, `out of`, movement, destination, source, recipient, or in-vs-into | Full MVP-review training exists in `app/diagnosis_training_preposition_direction_to_into_from.ts` | Review content in product UI; keep method/tool and fixed collocations separate. |
| `preposition_common_verb_patterns` | preposition | raw/phrase says fixed verb + preposition like `listen to`, `wait for`, `depend on`, `look at`, `talk to`, `think about`, `ask for`, `believe in` | Full MVP-review training exists in `app/diagnosis_training_preposition_common_verb_patterns.ts` | Review content in product UI; keep adjective collocations separate. |
| `preposition_method_by_with` | preposition | `by bus`, `with a knife`, `by email` are common traps. | Train method vs instrument. |
| `preposition_recipient_to_for` | preposition | `give to`, `buy for`, `explain to` are common L1 transfer errors. | Train recipient/beneficiary with verb classes. |
| `preposition_fixed_collocation` | preposition | `interested in`, `good at`, `afraid of`, `similar to` cannot be solved by broad time/place rules. | Train fixed adjective/noun + preposition chunks after verb patterns. |

### Syntax / Word Order

| Proposed ID | Category | Why Needed | Training Spec |
|---|---|---|---|
| `object_order_give_me_it` | syntax | Two-object verbs create errors that are not just pronoun or preposition errors: `give me it`, `send her it`, `buy it to me`. | Full MVP-review training exists in `app/diagnosis_training_object_order_give_me_it.ts`; trains person+thing vs thing+to/for+person and the `it/them` ordering trap. |
| `word_order_basic_statement` | syntax | Flexible Russian/Ukrainian word order transfers into English statements: `Coffee I like`, `Every morning drinks he tea`, `I read at home books`. | Full MVP-review training exists in `app/diagnosis_training_word_order_basic_statement.ts`; trains subject + verb + object/place/time, time-fronting without inversion, and frequency adverb position. |
| `word_order_basic_question` | syntax | Russian/Ukrainian intonation questions transfer into English as `You work?`, `Where you live?`, `Does she works?`, `Did you went?`. | Full MVP-review training exists in `app/diagnosis_training_word_order_basic_question.ts`; trains helper + subject + verb, do/does/did questions, be/modal inversion, and question words. |

### Verbs / Tenses

| Proposed ID | Category | Why Needed | Training Spec |
|---|---|---|---|
| `verb_present_simple_affirmative` | verb | `he works`, `they work`; third person is only one part. | Train subject + base/s form. |
| `verb_present_simple_negative_question` | verb | `doesn't work`, `Does she work?`; no `works` after does. | Train auxiliary carries grammar. |
| `verb_past_simple_questions_negatives` | verb | The new Past Simple statements training intentionally keeps `did + base` questions/negatives as a future split. | Train `Did you go?`, `I did not go`, and avoid `did went`. |
| `verb_present_continuous_be_ing` | verb/to-be | Errors can be `be` or `-ing`. | Train `am/is/are + V-ing`, not just verb token. |
| `verb_present_perfect_have_v3` | verb | Existing to-be lesson includes `has been`; likely broader perfect issues. | Train `have/has + V3`, ever/never/already/yet. |
| `infinitive_vs_gerund_basic` | verb | Lessons include gerund/infinitive patterns such as `want learning`, `enjoy to learn`, and `to going`. | Full MVP-review training exists in `app/diagnosis_training_infinitive_vs_gerund_basic.ts`; trains governed verb patterns: `want/need/decide/plan/agree + to do` vs `enjoy/finish/avoid/mind + doing`. |

### To Be

| Proposed ID | Category | Why Needed | Training Spec |
|---|---|---|---|
| `to_be_present_agreement` | to-be | Current id mixes present and past. | Full MVP-review training exists in `app/diagnosis_training_to_be_present_agreement.ts`; trains I am / he is / they are, missing be before adjective/place/role, singular/plural nouns, questions, and negatives. |
| `to_be_past_continuous_was_were_ing` | to-be/verb | After was/were agreement, users can still miss `was/were + -ing` for past continuous. | Train `I was working`, `they were waiting`, and contrast with Past Simple. |
| `to_be_there_is_are` | to-be | `there is/are` appears in current exercises. | Train existential there + singular/plural. |
| `to_be_aux_continuous` | to-be | `I am working` is not the same as identity/adjective. | Train be as auxiliary for continuous. |

### Modals

| Proposed ID | Category | Why Needed | Training Spec |
|---|---|---|---|
| `modal_obligation_advice` | modal | `must`, `have to`, `should` are semantically close. | Train obligation vs advice vs rule. |
| `modal_permission_possibility` | modal | `can`, `could`, `may`, `might` need meaning contrast. | Train permission vs ability vs possibility. |
| `modal_perfect` | modal | Current exercises include `must have seen`, `could have won`. | Train modal + have + V3. |

### Pronouns

| Proposed ID | Category | Why Needed | Training Spec |
|---|---|---|---|
| `pronoun_reflexive` | pronoun | Existing exercises include `by myself/themselves`. | Train myself/yourself/himself/themselves and `by myself`. |
| `pronoun_it_this_that` | pronoun | Demonstratives are likely in lessons/words. | Train it vs this/that/these/those. |

### Nouns / Words

| Proposed ID | Category | Why Needed | Training Spec |
|---|---|---|---|
| `noun_count_uncount` | noun | `advice`, `money`, `water` require quantity logic. | Train count/uncount plus much/many/some. |
| `noun_plural_irregular` | noun | Plural errors are not always simple `-s`. | Train child/children, person/people, police plural behavior where present. |
| `word_meaning_near_synonym` | noun/verb/adjective/adverb | Lesson words can be mistaken by meaning, not grammar. | Train minimal semantic contrasts from lesson word bank. |

### Adjectives / Adverbs

| Proposed ID | Category | Why Needed | Training Spec |
|---|---|---|---|
| `adjective_superlative` | adjective | Current id merges comparative/superlative. | Train `the best`, `the most interesting`, one-of group context. |
| `adverb_already_yet_still` | adverb | Current adverb id only handles frequency. | Train perfect/negative/question placement for already/yet/still. |
| `adverb_degree_very_really` | adverb | `too/enough` now has a modifier-specific training; very/really still need focused degree-adverb handling. | Train `very/really/quite` intensity without mixing in `too/enough`. |

### Conjunctions

| Proposed ID | Category | Why Needed | Training Spec |
|---|---|---|---|
| `conjunction_condition_if_when` | conjunction | `if` and `when` are different logic. | Train condition vs time. |
| `conjunction_contrast_but_although` | conjunction | Contrast connectors differ in sentence shape. | Train `but` vs `although/though`. |
| `conjunction_pair_either_neither` | conjunction | Existing exercises include paired connectors. | Train either/or, neither/nor, both/and. |

### Phrasal Verbs

| Proposed ID | Category | Why Needed | Training Spec |
|---|---|---|---|
| `phrasal_meaning_particle` | phrasal_particle | The particle changes meaning. | Train look up, turn on/off, run out of, carry on. |
| `phrasal_separable_object` | phrasal_particle | `look it up` vs `look up it` needs separate handling. | Train pronoun placement and object placement. |

## Connection Requirements For New Diagnosis Trainings

When you create these trainings, they should be connected like this:

1. Add a stable diagnosis id to `PosMicroDiagnosisId` in `app/pos_micro_diagnosis.ts`.
2. Add labels and coach lines in RU/UK/ES.
3. Update `classifySignal` so the id is selected only from exact token/category evidence.
4. Add diagnosis-specific lesson content, preferably separate from `DIAGNOSIS_TRAININGS` so diagnosis trainings stay clean.
5. Route `/problem_coach` by `microDiagnosisId`, not only `category`.
6. Pass `microDiagnosisId` into `/trainer_smart_session`.
7. Make smart trainer filter/generate items by diagnosis-specific contrast set, not only POS category.
8. Log practice results with category and microdiagnosis.
9. Add tests:
   - 2 exact mistakes do not trigger.
   - 3 exact mistakes trigger the intended diagnosis.
   - Phrase-only mistakes do not trigger.
   - Diagnosis trainer route preserves the microdiagnosis.
   - Smart trainer receives the microdiagnosis.

## Priority Order

Build these first because they are common, easy to detect, and high-value:

1. `article_a_an`
2. `article_the_specific`
3. `article_zero`
4. `preposition_time_in_on_at`
5. `preposition_place_in_on_at`
6. `preposition_duration_for_since`
7. `verb_present_simple_negative_question`
8. `verb_third_person`
9. `to_be_present_agreement`
10. `modal_base_form`

Second wave:

11. `pronoun_case`
12. `pronoun_possessive`
13. `adjective_comparison`
14. `adjective_vs_adverb`
15. `adverb_frequency_position`
16. `conjunction_logic`
17. `phrasal_particle_pair`
18. `noun_count_uncount`

Third wave:

19. modal perfect / modal force subtypes
20. fixed preposition collocations
21. phrasal separability
22. word meaning near-synonym trainings

