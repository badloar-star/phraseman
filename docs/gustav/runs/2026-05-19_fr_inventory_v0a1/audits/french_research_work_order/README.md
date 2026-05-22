# GUSTAV French Research Work Order Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-20T07:55:32.348Z

## Summary

- Target study language: `fr`
- Source locales: 2
- Trusted sources: 8
- Grammar clusters: 12
- Work orders: 12
- Tasks: 84
- Source graph reference groups: 10
- Minimum trusted source checks: 26
- RU/UK comparisons required: 12
- Required signoffs: 72
- Contract ready: yes
- Firewall passed: yes
- Work order ready: yes
- Research pack present: no
- May start research pack writing now: no
- May start translation now: no
- May start French generation: no
- Blockers: 0
- Warnings: 0

## Source Graph Reference Groups

- `lessons`: 32
- `phrases`: 1600
- `words`: 8353
- `introScreens`: 147
- `quizzes`: 829
- `prepositionPacks`: 12
- `flashcards`: 155
- `dailyPhrases`: 176
- `personalPractice`: 56
- `surfaces`: 129

## Work Orders

- `FR-RESEARCH-01`: Articles, gender and number
  - cluster: `articles_gender_number`
  - sources: larousse_fr_dictionary, le_robert_dictionary
  - tasks: 7
  - signoffs: translation_director, french_grammar_researcher, ru_source_locale_reviewer, uk_source_locale_reviewer, quiz_and_practice_reviewer, runtime_shape_auditor
  - can produce French output: no
- `FR-RESEARCH-02`: Present tense and subject agreement
  - cluster: `present_tense_agreement`
  - sources: bescherelle_conjugation, tv5monde_grammar
  - tasks: 7
  - signoffs: translation_director, french_grammar_researcher, ru_source_locale_reviewer, uk_source_locale_reviewer, quiz_and_practice_reviewer, runtime_shape_auditor
  - can produce French output: no
- `FR-RESEARCH-03`: Negation and negative adverbs
  - cluster: `negation`
  - sources: academie_francaise_dire_ne_pas_dire, tv5monde_grammar
  - tasks: 7
  - signoffs: translation_director, french_grammar_researcher, ru_source_locale_reviewer, uk_source_locale_reviewer, quiz_and_practice_reviewer, runtime_shape_auditor
  - can produce French output: no
- `FR-RESEARCH-04`: Questions and word order
  - cluster: `questions_word_order`
  - sources: tv5monde_grammar, oqlf_vitrine_linguistique
  - tasks: 7
  - signoffs: translation_director, french_grammar_researcher, ru_source_locale_reviewer, uk_source_locale_reviewer, quiz_and_practice_reviewer, runtime_shape_auditor
  - can produce French output: no
- `FR-RESEARCH-05`: Prepositions and contracted articles
  - cluster: `prepositions_articles`
  - sources: larousse_fr_dictionary, oqlf_vitrine_linguistique
  - tasks: 7
  - signoffs: translation_director, french_grammar_researcher, ru_source_locale_reviewer, uk_source_locale_reviewer, quiz_and_practice_reviewer, runtime_shape_auditor
  - can produce French output: no
- `FR-RESEARCH-06`: Pronouns and object order
  - cluster: `pronouns_order`
  - sources: tv5monde_grammar, oqlf_vitrine_linguistique
  - tasks: 7
  - signoffs: translation_director, french_grammar_researcher, ru_source_locale_reviewer, uk_source_locale_reviewer, quiz_and_practice_reviewer, runtime_shape_auditor
  - can produce French output: no
- `FR-RESEARCH-07`: Passe compose, imparfait and past contrast
  - cluster: `past_tenses`
  - sources: bescherelle_conjugation, oxford_french_usage_guide
  - tasks: 7
  - signoffs: translation_director, french_grammar_researcher, ru_source_locale_reviewer, uk_source_locale_reviewer, quiz_and_practice_reviewer, runtime_shape_auditor
  - can produce French output: no
- `FR-RESEARCH-08`: Future, conditional and polite requests
  - cluster: `future_conditionals`
  - sources: bescherelle_conjugation, cambridge_en_fr_dictionary
  - tasks: 7
  - signoffs: translation_director, french_grammar_researcher, ru_source_locale_reviewer, uk_source_locale_reviewer, quiz_and_practice_reviewer, runtime_shape_auditor
  - can produce French output: no
- `FR-RESEARCH-09`: Subjunctive and modality
  - cluster: `subjunctive_modality`
  - sources: bescherelle_conjugation, academie_francaise_dire_ne_pas_dire
  - tasks: 7
  - signoffs: translation_director, french_grammar_researcher, ru_source_locale_reviewer, uk_source_locale_reviewer, quiz_and_practice_reviewer, runtime_shape_auditor
  - can produce French output: no
- `FR-RESEARCH-10`: Register, naturalness and false friends
  - cluster: `register_and_naturalness`
  - sources: cambridge_en_fr_dictionary, le_robert_dictionary, oxford_french_usage_guide
  - tasks: 7
  - signoffs: translation_director, french_grammar_researcher, ru_source_locale_reviewer, uk_source_locale_reviewer, quiz_and_practice_reviewer, runtime_shape_auditor
  - can produce French output: no
- `FR-RESEARCH-11`: My Practice diagnosis to French remediation
  - cluster: `personal_practice_mapping`
  - sources: tv5monde_grammar, oqlf_vitrine_linguistique
  - tasks: 7
  - signoffs: translation_director, french_grammar_researcher, ru_source_locale_reviewer, uk_source_locale_reviewer, quiz_and_practice_reviewer, runtime_shape_auditor
  - can produce French output: no
- `FR-RESEARCH-12`: Quiz distractors and answer validity
  - cluster: `quiz_distractors`
  - sources: larousse_fr_dictionary, bescherelle_conjugation, cambridge_en_fr_dictionary
  - tasks: 7
  - signoffs: translation_director, french_grammar_researcher, ru_source_locale_reviewer, uk_source_locale_reviewer, quiz_and_practice_reviewer, runtime_shape_auditor
  - can produce French output: no

## Findings

No findings.

## Notes

- This audit creates research work orders only; it does not create fr_research_pack.json.
- Every work order is research-only and explicitly forbids French translated output.
- The work order binds each French grammar cluster to RU/UK prompt comparison, source graph refs, trusted references, quiz policy and My Practice policy.
- French translation remains blocked until readiness generation blockers are removed and a real accepted research pack exists.
