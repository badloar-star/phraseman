# POS / Diagnosis trainer: Existing Trainings Export

Last audited: 2026-05-13

This file is an export of the training surfaces that already exist for POS analytics, Diagnosis trainer, weak phrase practice, lesson words, and prepositions.

## How The Current Flow Works

1. A user makes mistakes in lessons, lesson words, quizzes, review, trainer, diagnostic, coach, exam, or arena.
2. The mistake logger stores the phrase plus the exact mistaken token/category when the screen can provide it.
3. POS analytics trusts exact word/category signals first. Old phrase-only mistakes are not enough for a confident POS diagnosis.
4. Coach toast is allowed outside exams only.
5. Coach toast currently needs at least 3 exact mistakes in the same POS category, or a persistent analytics signal with at least 3 exact stored mistakes.
6. Diagnosis trainer opens a category lesson, optionally showing a narrower microdiagnosis label.
7. After the explanation, smart trainer opens a weak POS pool with the user's mistakes plus similar lesson phrases.

## Current Training Surfaces

| Surface | File / Entry | What It Trains | Current Personalization |
|---|---|---|---|
| Diagnosis trainer lesson | `app/problem_coach.tsx` + `app/diagnosis_trainings.ts` | Explanation plus short exercises for one POS category | Receives category, focus words, microdiagnosis label, evidence count |
| Diagnosis Training Engine | `app/diagnosis_training_types.ts`, `app/diagnosis_trainings.ts`, `app/diagnosis_training_article_a_an.ts`, `app/diagnosis_training_article_the_specific.ts`, `app/diagnosis_training_article_zero.ts`, `app/diagnosis_training_quantifier_some_any.ts`, `app/diagnosis_training_determiner_this_that_these_those.ts`, `app/diagnosis_training_there_is_are.ts`, `app/diagnosis_training_noun_singular_plural_basic.ts`, `app/diagnosis_training_preposition_time_in_on_at.ts`, `app/diagnosis_training_preposition_place_in_on_at.ts`, `app/diagnosis_training_preposition_duration_for_since.ts`, `app/diagnosis_training_preposition_direction_to_into_from.ts`, `app/diagnosis_training_preposition_common_verb_patterns.ts`, `app/diagnosis_training_object_order_give_me_it.ts`, `app/diagnosis_training_word_order_basic_statement.ts`, `app/diagnosis_training_word_order_basic_question.ts`, `app/diagnosis_training_verb_present_simple_negative_question.ts`, `app/diagnosis_training_verb_present_continuous_basic.ts`, `app/diagnosis_training_verb_present_simple_vs_continuous.ts`, `app/diagnosis_training_verb_past_simple_regular_irregular.ts`, `app/diagnosis_training_verb_was_were.ts`, `app/diagnosis_training_future_will_going_to.ts`, `app/diagnosis_training_infinitive_vs_gerund_basic.ts`, `app/diagnosis_training_verb_present_simple_statement.ts`, `app/diagnosis_training_verb_third_person.ts`, `app/diagnosis_training_to_be_present_agreement.ts`, `app/diagnosis_training_modal_base_form.ts`, `app/diagnosis_training_modal_force.ts`, `app/diagnosis_training_pronoun_case.ts`, `app/diagnosis_training_pronoun_possessive.ts`, `app/diagnosis_training_adjective_comparison.ts`, `app/diagnosis_training_adjective_vs_adverb.ts`, `app/diagnosis_training_adverb_frequency_position.ts`, `app/diagnosis_training_too_enough.ts`, `app/diagnosis_training_conjunction_logic.ts`, `app/diagnosis_training_phrasal_particle_pair.ts`, `app/diagnosis_training_engine.ts`, `app/diagnosis_training_router.ts` | Microdiagnosis-specific route: explanation, mini-task, adaptive feedback, mastery, smart trainer payload | Full MVP-review content exists for `article_a_an`, `article_the_specific`, `article_zero`, `quantifier_some_any`, `determiner_this_that_these_those`, `there_is_are`, `noun_singular_plural_basic`, `preposition_time_in_on_at`, `preposition_place_in_on_at`, `preposition_duration_for_since`, `preposition_direction_to_into_from`, `preposition_common_verb_patterns`, `object_order_give_me_it`, `word_order_basic_statement`, `word_order_basic_question`, `verb_present_simple_negative_question`, `verb_present_continuous_basic`, `verb_present_simple_vs_continuous`, `verb_past_simple_regular_irregular`, `verb_was_were`, `future_will_going_to`, `infinitive_vs_gerund_basic`, `verb_present_simple_statement`, `verb_third_person`, `to_be_present_agreement`, `modal_base_form`, `modal_force`, `pronoun_case`, `pronoun_possessive`, `adjective_comparison`, `adjective_vs_adverb`, `adverb_frequency_position`, `too_enough`, `conjunction_logic`, and `phrasal_particle_pair` |
| Coach toast | `components/CoachToast.tsx` | Nudge to open Diagnosis trainer after repeated POS mistakes | Shows exact pattern label when available |
| Smart Trainer weak POS pool | `app/trainer_smart_session.tsx` + `app/trainer_store.ts` | User's weak phrases/words plus category fallback phrases | Filters by POS category and prioritizes focus words |
| POS workout engine | `app/pos_workout_engine.ts` | Slot/form/meaning/rule drills for POS categories | Category-specific drill type, not diagnosis-specific yet |
| Lesson words | `app/lesson_words.tsx` | Vocabulary recognition by lesson | Logs word as exact POS signal; activates word trainer items |
| Preposition drill | `app/preposition_drill.tsx` + `app/lesson_prepositions.ts` | Lesson-level preposition slots | Has time/place/direction/other classification and per-choice explanations |
| Preposition explanations | `app/preposition_explanations.ts` + `app/preposition_overrides.ts` | Explains why a preposition is correct in a sentence | Rule-based explanations for many preposition contexts |
| Phrase analytics screen | `app/phrase_analytics_screen.tsx` | Shows weak POS/categories to user | Category-level analytics with top words |
| Active recall / review | `app/active_recall.ts`, `app/review.tsx` | Repeats weak phrases | Uses exact POS metadata when available |
| Regular trainer modes | `app/trainer.tsx`, `app/trainer_store.ts` | Due, weak, hard, smart mix, words, phrases, arena | Prioritizes due state, mistake count, streak, and POS priority |

## Existing Diagnosis trainer Category Lessons

| Category | Blocks | Exercises | Example Exercise Sentences | Status |
|---|---:|---:|---|---|
| article | 8 | 7 | `I booked ___ hotel...`, `My sister is ___ engineer.`, `They play ___ football...` | Exists |
| determiner | 8 | 7 | `I have some time...`, `Do you have any questions?`, `Would you like some tea?` | Exists, but shallow |
| preposition | 6 | 8 | `The meeting is ___ Monday.`, `We arrived ___ the airport...`, `I have lived here ___ three years.` | Exists |
| syntax | 1 | 8 | `Give me the book.`, `Give it to me.`, `Send it to her.` | Exists, but shallow |
| verb | 6 | 8 | `She ___ coffee every morning.`, `Did you ___ him yesterday?`, `He can ___ very fast.` | Exists |
| modal | 6 | 8 | `You ___ smoke here.`, `You ___ apologize...`, `He ___ seen me yesterday.` | Exists |
| to-be | 2 | 8 | `They ___ at the party...`, `There ___ many people...`, `I am used to ___ up early.` | Exists, but shallow |
| phrasal_particle | 6 | 8 | `We ran out of coffee.`, `Please write ___ your name...`, `I looked it ___.` | Exists |
| noun | 2 | 8 | `Can I have some ___?`, `How many ___ are in the room?`, `There are ___ books...` | Exists, but shallow |
| adjective | 1 | 8 | `This film is ___ than...`, `It was the ___ day...`, `He bought a ___ car.` | Exists, but shallow |
| adverb | 2 | 8 | `He works very ___.`, `She ___ coffee...`, `She is ___ sleeping.` | Exists, but shallow |
| modifier | 2 | 8 | `This coffee is too hot.`, `This answer is good enough.`, `We do not have enough chairs.` | Exists, but shallow |
| pronoun | 1 | 8 | `Between you and ___...`, `This is ___ book.`, `They cooked dinner by ___.` | Exists, but shallow |
| conjunction | 1 | 8 | `I was tired, ___ I went...`, `___ you hurry...`, `___ tea ___ coffee...` | Exists, but shallow |
| other | 1 | 8 | Mixed fallback exercises | Exists as fallback, should not be used for confident diagnosis |

## Existing POS Workout Profiles

| Category | Current Drill Type | Current Label | What It Actually Does |
|---|---|---|---|
| verb | `form_choice` | form and tense | Chooses among verb forms in a phrase |
| noun | `meaning_map` | object and number | Anchors word meaning/count to translation and phrase |
| pronoun | `slot_anchor` | who / whom / whose | Fills a pronoun slot |
| adjective | `meaning_map` | quality and comparison | Chooses descriptive/comparative adjective |
| adverb | `slot_anchor` | how / where / when | Fills adverb slot |
| modifier | `rule_contrast` | too / enough | Contrasts degree and quantity modifiers like `too hot`, `good enough`, and `enough time` |
| preposition | `slot_anchor` | relation and direction | Fills preposition slot |
| syntax | `order_rebuild` | word order | Contrasts object order patterns like `give me the book` vs `give it to me` |
| article | `slot_anchor` | a/an/the/zero | Fills article slot |
| determiner | `slot_anchor` | some/any/no | Fills quantifier/determiner slot |
| to-be | `form_choice` | am/is/are/was/were | Chooses to-be form |
| conjunction | `order_rebuild` | connect ideas | Chooses connector in context |
| modal | `rule_contrast` | possibility/obligation/advice | Contrasts modal meaning |
| phrasal_particle | `rule_contrast` | verb + particle | Contrasts phrasal particle |

## Existing Smart Trainer Modes

| Mode | Route / Param | Selection Logic | Notes |
|---|---|---|---|
| due | `mode=due` | Items due today first | General spaced repetition |
| fresh | `mode=fresh` | Recently added low-repetition items | Not POS-specific |
| weak | `mode=weak` | Low streak or repeated mistakes | Used after Diagnosis trainer |
| hard | `mode=hard` | Items with 3+ mistakes | General difficulty mode |
| smart mix | `mode=smart_mix` | Due + weak + fresh mix | Premium smart session |
| POS focus pool | `mode=weak&category=<pos>` | Category-matched weak items, fallback from mistake log, then lesson phrases | Current post-coach consolidation |
| Analytics focus | `mode=weak&source=analytics&category=<pos>` | Same as POS focus, launched from analytics CTA | Uses focus words / priority / recovery |

## Existing Lesson Word Training

Lesson words already log exact word-level POS signals. That means a word mistake can contribute to POS analytics if the word has a stable POS category.

Covered word-level POS buckets in `lesson_words.tsx`:

| Word POS Bucket | Analytics Category |
|---|---|
| `pronouns` | pronoun |
| `verbs` | verb |
| `irregular_verbs` | verb |
| `adjectives` | adjective |
| `adverbs` | adverb |
| `nouns` | noun |
| `prepositions` | preposition |
| `conjunctions` | conjunction |
| `articles` | article |
| `phrases` | phrase/other; should not drive a narrow POS diagnosis unless token metadata is available |

## Existing Preposition Training

The preposition drill already has a stronger internal taxonomy than the generic POS coach:

| Preposition Kind | Source | Notes |
|---|---|---|
| time | `app/lesson_prepositions.ts` | Uses `during`, `before`, `after`, `since`, `until`, `for`, `by`, `on`, `in`, `at` |
| place | `app/lesson_prepositions.ts` | Uses `in`, `on`, `at`, `under`, `over`, `between`, `inside`, `near`, etc. |
| direction | `app/lesson_prepositions.ts` | Uses `to`, `into`, `onto`, `from`, `through`, `across`, `up`, `down`, `out`, `off` |
| other/fixed relation | `app/preposition_explanations.ts` | Includes fixed rules like `believe in`, `interested in`, `on media`, `with tool/person`, `by method`, `to recipient`, etc. |

Important gap: time/place `in/on/at`, `for/since` duration, and core `to/into/from/out of` direction are now split into diagnosis-specific routes. Legacy broad `preposition_time_place` remains only as fallback; recipient/beneficiary, method/tool, and fixed-collocation prepositions still need diagnosis-specific trainings.

## Current Connection Status

| Requirement | Status |
|---|---|
| No coach toasts during exams | Done |
| Require stronger evidence before toast | Done: 3 exact mistakes |
| Do not diagnose from phrase-only mistakes | Done |
| Show exact pattern in toast | Done |
| Carry exact pattern into Diagnosis trainer | Done |
| Carry exact pattern into Smart Trainer label | Done |
| Separate lesson content for each exact diagnosis | MVP partial: 33 full MVP-review trainings exist |
| Diagnosis-specific exercise generator | Engine exists; broad content expansion still needed |
| Diagnosis-specific mastery/progress | Not done |
| Admin/editor export/import for diagnosis trainings | Not done |

