# GUSTAV French Research Pack Contract Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-20T07:39:45.320Z

## Summary

- Target study language: `fr`
- Source locales: 2
- Trusted sources: 8
- Official/publisher sources: 8
- Grammar clusters: 12
- Required research fields: 16
- Cross-checks: 6
- Rejected shortcut policies: 7
- Research pack present: no
- Research contract ready: yes
- Translation start blocked: yes
- May start translation now: no
- May start French generation: no
- Blockers: 0
- Warnings: 0

## Trusted Sources

- `cambridge_en_fr_dictionary`: Cambridge Dictionary English-French / French-English (dictionary)
  - https://dictionary.cambridge.org/translate/english-french/
- `oxford_french_usage_guide`: Oxford Dictionaries Premium French usage guide (usage_guide)
  - https://premium.oxforddictionaries.com/media/words/assets/Oxford_Dictionaries_Premium_French_usage_guide.pdf
- `larousse_fr_dictionary`: Larousse Dictionnaire de francais (dictionary)
  - https://www.larousse.fr/dictionnaires/francais
- `le_robert_dictionary`: Dictionnaire Le Robert (dictionary)
  - https://dictionnaire.lerobert.com/
- `bescherelle_conjugation`: Bescherelle conjugation reference (conjugation)
  - https://conjugaison.bescherelle.com/
- `tv5monde_grammar`: TV5MONDE Apprendre le francais grammar (grammar_learning)
  - https://apprendre.tv5monde.com/fr/aides/grammaire
- `oqlf_vitrine_linguistique`: OQLF Vitrine linguistique (official_language_guidance)
  - https://vitrinelinguistique.oqlf.gouv.qc.ca/
- `academie_francaise_dire_ne_pas_dire`: Academie francaise Dire, Ne pas dire (official_language_guidance)
  - https://www.dictionnaire-academie.fr/

## Grammar Clusters

- `articles_gender_number`: Articles, gender and number
- `present_tense_agreement`: Present tense and subject agreement
- `negation`: Negation and negative adverbs
- `questions_word_order`: Questions and word order
- `prepositions_articles`: Prepositions and contracted articles
- `pronouns_order`: Pronouns and object order
- `past_tenses`: Passe compose, imparfait and past contrast
- `future_conditionals`: Future, conditional and polite requests
- `subjunctive_modality`: Subjunctive and modality
- `register_and_naturalness`: Register, naturalness and false friends
- `personal_practice_mapping`: My Practice diagnosis to French remediation
- `quiz_distractors`: Quiz distractors and answer validity

## Required Research Fields

- `clusterId`
- `sourceGraphRefs`
- `englishSourceSummary`
- `ruPromptSummary`
- `ukPromptSummary`
- `trustedSourceChecks`
- `frenchRuleDecision`
- `lessonOrderDecision`
- `translationRisks`
- `falseFriendRisks`
- `articleGenderNotes`
- `conjugationNotes`
- `quizDistractorPolicy`
- `personalPracticePolicy`
- `agentSignoffs`
- `unresolvedQuestions`

## Cross-Checks

- Every grammar cluster must cite at least two trusted sources.
- Every batch must compare English source meaning against RU and UK prompts before French output.
- Every French rule decision must include a learner-level note and a lesson-order decision.
- Every quiz decision must prove one correct answer and plausible distractors.
- Every My Practice decision must prove target-scoped diagnosis and remediation state.
- Every uncertainty must block the translation batch until resolved or explicitly deferred.

## Rejected Shortcut Policies

- Do not translate directly from English without French grammar research.
- Do not use RU or UK text as target French content.
- Do not rely on a single dictionary for grammar decisions.
- Do not accept English word order as French structure without proof.
- Do not generate quizzes before distractor policy is signed off.
- Do not generate My Practice lessons before personal-practice mapping is target-safe.
- Do not create production files or generated_content_audit.json during research.

## Findings

No findings.

## Notes

- This audit defines the French research pack contract only; it does not write French translations.
- The listed sources were selected as trusted references for grammar, usage, dictionaries, conjugation and FLE-style learner sequencing.
- A real fr_research_pack.json remains absent until architecture gates permit translation preparation.
- French generation remains blocked by readiness HOLD.
