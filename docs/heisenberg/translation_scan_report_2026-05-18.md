# Heisenberg translation scan report - 2026-05-18

## Gate status

- `npm run heisenberg:gate`: PASS
- Batch manifest: `docs/heisenberg/batch/2026-05-18T14-23-54-767Z/manifest.json`
- Batch locales: `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`
- Batch coverage: `partial units: 0`, `missing-all units: 0` for every target locale
- Existing `es` locale audit blockers: `0`

## Checks

- `npm run audit:translations`: PASS, phrases `1600`, flags `0`
- Focused Jest inside gate: PASS, 5 suites / 61 tests
- `npx tsc --noEmit --pretty false`: PASS
- `npm run heisenberg:semantic-audit:strict`: PASS, `0 blockers`, `259 warnings`
- `npm run heisenberg:ui-audit`: PASS command, latest `activationReady=no`, `601 findings`, `0 missing triLang locale units`
- Earlier same-day extra contract check: `npx jest --runTestsByPath tests/level_gift_reward_icons.test.ts --no-cache --runInBand`: PASS, 2 tests

## Fixes applied

- `app/quiz_source_locale_payloads.ts`: fixed EASY source-locale key drift by renumbering the first duplicate range to `268`-`272`; this removed duplicate object keys `273`, `274`, `275`.
- `tests/quiz_spanish_locale.test.ts`: corrected the expected Spanish prompt for the present-continuous item.
- `constants/levelGiftImages.ts`: restored the level-gift themed image catalog for 6 themes x 4 variants, with fallback to `minimalDark/common`.
- `app/lesson_words.tsx`: added `pt-BR`, `vi`, `id`, `tr`, `pl` glosses to `175` lesson word objects, plus planned-locale POS labels, noun lemma overrides, completion/repeat/round UI, prompt, report payload, and start-training UI.
- `app/pos_micro_diagnosis.ts`: added planned-locale text for `62` micro-diagnosis labels and `62` coach lines.
- `app/pos_workout_engine.ts`: added planned-locale text for `5` drill method instructions, `5` answer labels, `15` focus chips, and `15` POS workout profiles across title, drill label, coach line, mistake rationale, and next step.
- `app/preposition_explanations.ts`: added explicit `pt-BR`, `vi`, `id`, `tr`, `pl` fields to `79` generated explanation objects while preserving the runtime `ptBr` field.
- `app/premium_modal.tsx`: added explicit planned-locale fields to `73` Premium modal objects, including context benefits, `quiz_limit` rows, and cancellation survey reasons.
- `app/lesson_intro_screens_en_17_32.ts`: added planned-locale translations to `71` intro example objects across lessons 24-32; `app/lesson_data_types.ts` now allows optional planned-locale fields in `IntroExample`.
- `constants/custom_avatars.ts`: added planned-locale labels to `55` custom avatar names and `10` gradient names, with strict `CustomAvatarLocalizedLabel` coverage.
- `app/irregular_verbs_data.ts`: promoted existing planned copy from `IRREGULAR_VERB_SOURCE_LOCALES` into `51` top-level glossary rows and made planned fields required on `IrregularVerb`.
- `app/_admin_settings_testers.tsx`: added planned `pt-BR`, `vi`, `id`, `tr`, `pl` text to `43` admin tester `actionToastTri` messages.
- `app/events.ts`: broadened `actionToastTri` input to accept `PlannedTriLangCopy` while preserving the current emitted `messageRu`, `messageUk`, `messageEs` payload.
- `app/level_gifts_inventory.tsx`: fixed 4 mojibake blockers in gift inventory labels for `pt-BR` and `vi`.
- `constants/levelGiftRewardIcons.ts`: added the missing level-gift reward icon registry required by the new icon coverage test, with fallback to `choice_3_level`.
- `app/shard_earn_ui.ts`: added planned `pt-BR`, `vi`, `id`, `tr`, `pl` labels to all `26` shard-earn reason messages and made the local label map strict on planned languages.
- `app/level_gift_active_inventory.ts`: added planned-locale fields to `16` active level-gift inventory `triLang` blocks, including the local pack-hours helper; this brought `triLang` missing locale units back to `0`.
- `components/LevelGiftDualModal.tsx`: aligned the new `premiumChestSource` prop through `GiftResultBlock` so the gift modal TypeScript contract compiles with the themed premium chest source.
- `app/phrase_analytics.ts`: added canonical `pt-BR` aliases beside existing `ptBR` analytics copy in `21` locale objects and made `AnalyticsLocaleCopy` require the canonical planned locale key.
- `app/review_utils.ts`: added planned `pt-BR`, `vi`, `id`, `tr`, `pl` text to `21` review prompt locale objects and made the local copy type strict over planned interface languages.
- `app/phrase_analytics_screen.tsx`: added canonical `pt-BR` aliases beside existing `ptBR` screen analytics copy in `18` locale objects, keeping the stricter shared analytics type green.
- `app/diagnosis_training_types.ts`: allowed optional planned-locale fields on `TriText`, `whatUserMustLearn`, and diagnosis examples so individual trainers can carry planned copy without breaking existing trainers.
- `app/diagnosis_training_word_order_basic_question.ts`: added planned-locale learning bullets, example translations, guided prompts, recovery cards, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `constants/arena_i18n.ts`: added planned `pt-BR`, `vi`, `id`, `tr`, `pl` arena UI labels, forfeit copy, and reaction picker labels; file is now `0` UI findings.
- `app/flashcards/bundles/victoriaBundleShared.ts`: allowed planned phrase fields on Victoria rows; kept `id` as the row identifier, so Indonesian cannot be represented by a top-level `id` phrase key in these row objects.
- `app/flashcards/bundles/prep_at/prep_at_cards.ts`, `prep_by`, `prep_in`, `prep_on`, `prep_to`: added planned phrase translations to `75` preposition flashcard rows (`15` per bundle); all five files are now `0` UI findings.
- `app/lesson_intro_screens_lesson8_v2.ts`, `lesson10_v2`, `lesson11_v2`, `lesson12_v2`, `lesson14_v2`: added planned translations to `62` intro example objects; all five files are now `0` UI findings.
- `app/diagnostic_test.tsx`: added planned copy to the build header, accessibility task labels, and `6` result-band labels; file is now `0` UI findings.
- `app/diagnosis_training_adjective_comparison.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `components/ReleaseWaveBonusModal.tsx`: restored the missing `LinearGradient` import that blocked `tsc` during the final gate pass.
- `app/_layout.tsx`: repaired the first-lesson bottomsheet JSX closure so the already-modified `ImageBackground` panel compiles during the gate.
- `app/diagnosis_training_adjective_vs_adverb.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_adverb_frequency_position.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_article_a_an.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_article_the_specific.ts`: added planned-locale learning bullets, `8` inline example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_article_zero.ts`: added planned-locale learning bullets, `8` inline example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_future_present_continuous_arrangements.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `components/LeagueChestOpenModal.tsx`: completed the in-progress reward-card contract cleanup by removing unreachable switch branches, keeping `tsc` green, and adding planned-locale text to `13` new `triLang` reward labels; file is now `0` UI findings.
- `app/diagnosis_training_future_will_going_to.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_imperative_basic.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_infinitive_vs_gerund_basic.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_modal_can_could_ability_request.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_modal_force.ts`: added planned-locale learning bullets, `8` example translations, refreshed the old `ru`/`uk`/`es` example placeholders, and added a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_modal_may_might_probability.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_modal_should_must_have_to.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_noun_singular_plural_basic.ts`: added planned-locale learning bullets and `8` example translations while preserving existing `es`; local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_object_order_give_me_it.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_phrasal_particle_pair.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_preposition_common_verb_patterns.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_preposition_direction_to_into_from.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.
- `app/diagnosis_training_preposition_duration_for_since.ts`: added planned-locale learning bullets, `8` example translations, and a local planned-aware `tri()` fallback; file is now `0` UI findings.

## UI untranslated checklist

Latest UI report: `docs/heisenberg/ui/2026-05-18T14-24-46-024Z/ui_locale_audit.md`

- Files scanned: `611`
- Findings: `601` (`-40` since the previous report snapshot, `-1273` since the first report today)
- Missing locale units: `2958` (`-200` since the previous report snapshot)
- `triLang` missing locale units: `0`
- Locale object findings:
  - `locale-object-missing-all-planned-locales`: `581`
  - `locale-object-missing-planned-locales`: `20`
- Missing by locale:
  - `pt-BR`: `601`
  - `vi`: `592`
  - `id`: `581`
  - `tr`: `592`
  - `pl`: `592`

Files now at `0` UI findings after these passes:

- `app/lesson_words.tsx`
- `app/pos_micro_diagnosis.ts`
- `app/pos_workout_engine.ts`
- `app/preposition_explanations.ts`
- `app/premium_modal.tsx`
- `app/lesson_intro_screens_en_17_32.ts`
- `constants/custom_avatars.ts`
- `app/irregular_verbs_data.ts`
- `app/_admin_settings_testers.tsx`
- `app/level_gifts_inventory.tsx`
- `app/shard_earn_ui.ts`
- `app/level_gift_active_inventory.ts`
- `app/phrase_analytics.ts`
- `app/review_utils.ts`
- `app/phrase_analytics_screen.tsx`
- `app/diagnosis_training_word_order_basic_question.ts`
- `constants/arena_i18n.ts`
- `app/flashcards/bundles/prep_at/prep_at_cards.ts`
- `app/flashcards/bundles/prep_by/prep_by_cards.ts`
- `app/flashcards/bundles/prep_in/prep_in_cards.ts`
- `app/flashcards/bundles/prep_on/prep_on_cards.ts`
- `app/flashcards/bundles/prep_to/prep_to_cards.ts`
- `app/lesson_intro_screens_lesson8_v2.ts`
- `app/lesson_intro_screens_lesson10_v2.ts`
- `app/lesson_intro_screens_lesson11_v2.ts`
- `app/lesson_intro_screens_lesson12_v2.ts`
- `app/lesson_intro_screens_lesson14_v2.ts`
- `app/diagnostic_test.tsx`
- `app/diagnosis_training_adjective_comparison.ts`
- `app/diagnosis_training_adjective_vs_adverb.ts`
- `app/diagnosis_training_adverb_frequency_position.ts`
- `app/diagnosis_training_article_a_an.ts`
- `app/diagnosis_training_article_the_specific.ts`
- `app/diagnosis_training_article_zero.ts`
- `app/diagnosis_training_future_present_continuous_arrangements.ts`
- `app/diagnosis_training_future_will_going_to.ts`
- `app/diagnosis_training_imperative_basic.ts`
- `app/diagnosis_training_infinitive_vs_gerund_basic.ts`
- `app/diagnosis_training_modal_can_could_ability_request.ts`
- `app/diagnosis_training_modal_force.ts`
- `app/diagnosis_training_modal_may_might_probability.ts`
- `app/diagnosis_training_modal_should_must_have_to.ts`
- `app/diagnosis_training_noun_singular_plural_basic.ts`
- `app/diagnosis_training_object_order_give_me_it.ts`
- `app/diagnosis_training_phrasal_particle_pair.ts`
- `app/diagnosis_training_preposition_common_verb_patterns.ts`
- `app/diagnosis_training_preposition_direction_to_into_from.ts`
- `app/diagnosis_training_preposition_duration_for_since.ts`
- `components/LeagueChestOpenModal.tsx`

Priority files remaining:

1. `app/diagnosis_training_preposition_place_in_on_at.ts` - 10
2. `app/diagnosis_training_preposition_time_in_on_at.ts` - 10
3. `app/diagnosis_training_preposition_time_place.ts` - 10
4. `app/diagnosis_training_present_perfect_questions_negatives.ts` - 10
5. `app/diagnosis_training_present_perfect_vs_past_simple.ts` - 10
6. `app/diagnosis_training_pronoun_case.ts` - 10
7. `app/diagnosis_training_quantifier_some_any.ts` - 10
8. `app/diagnosis_training_relative_clauses_who_which_that.ts` - 10
9. `app/diagnosis_training_reported_speech_basic.ts` - 10
10. `app/diagnosis_training_to_be_present_agreement.ts` - 10
11. `app/diagnosis_training_too_enough.ts` - 10
12. `app/diagnosis_training_verb_past_simple_negative_question.ts` - 10
13. `app/diagnosis_training_verb_past_simple_regular_irregular.ts` - 10
14. `app/diagnosis_training_verb_present_continuous_basic.ts` - 10
15. `app/diagnosis_training_verb_present_perfect_basic.ts` - 10
16. `app/diagnosis_training_verb_present_simple_negative_question.ts` - 10
17. `app/diagnosis_training_verb_present_simple_statement.ts` - 10
18. `app/diagnosis_training_verb_present_simple_vs_continuous.ts` - 10
19. `app/diagnosis_training_verb_third_person.ts` - 10
20. `app/diagnosis_training_verb_was_were.ts` - 10
21. `app/diagnosis_training_word_order_basic_statement.ts` - 10
22. `app/lesson_intro_screens_lesson20_v2.ts` - 10
23. `app/lesson_intro_screens_lesson21_v2.ts` - 10
24. `app/lesson_intro_screens_lesson9_v2.ts` - 10
25. `app/diagnosis_training_condition_zero_first.ts` - 9

## Semantic checklist

Latest semantic report: `docs/heisenberg/semantic/2026-05-18T14-24-42-667Z/semantic_audit.md`

- Blockers: `0`
- Warnings: `259`
- Review groups: `74`
- Warning groups:
  - `quiz-source-locale-coverage-gap`: `147`
  - `protected-english-term-missing`: `97`
  - `possible-distractor-index-drift`: `15`

Quiz source-locale coverage warnings:

- HARD `#273`-`#275`: missing `pt-BR`, `vi`, `id`, `tr`, `pl`
- HARD `#276`-`#297`: missing `es`, `pt-BR`, `vi`, `id`, `tr`, `pl`

Quality warnings to review after coverage:

- Protected English terms missing inside localized explanations, especially EASY `#282`, `#287`, `#288` and HARD `#268`-`#272`.
- Possible distractor index drift in MEDIUM `#112`, `#160`, `#165`, `#167`, `#175`, `#199` and several HARD items.

## Next execution checklist

1. Continue the UI queue in the priority order above, starting with `app/diagnosis_training_preposition_place_in_on_at.ts`.
2. Add quiz source-locale payloads for HARD `#273`-`#297`.
3. Review semantic warnings for protected English terms and distractor index drift.
4. Keep the newly-zeroed analytics, arena, prep-flashcard, lesson-intro, diagnostic, and diagnosis-training files at `0` findings when future copy is added.
5. Re-run:
   - `npm run heisenberg:gate`
   - `npm run heisenberg:semantic-audit:strict`
   - `npm run heisenberg:ui-audit`
