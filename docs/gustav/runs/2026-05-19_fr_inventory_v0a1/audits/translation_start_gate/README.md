# GUSTAV Translation Start Gate Audit

Run: `2026-05-19_fr_inventory_v0a1`

Status: `PASS`

Generated at: 2026-05-20T07:32:15.196Z

## Summary

- Target study language: `fr`
- Source locales: 2
- Approved source locales: 2
- Translation domains: 9
- Translation agents: 8
- Blocked readiness checks: 10
- Generation-blocking readiness checks: 8
- Source graph approved for input: yes
- Source graph quality passed: yes
- RU/UK source-locale coverage passed: yes
- Generated content audit present: no
- Target isolation ready: no
- Research pack required: yes
- Translation start blocked: yes
- May start translation now: no
- May start French generation: no
- Blockers: 0
- Warnings: 0

## Translation Units

- `lessons`: 32 from `lessons`
- `phrases`: 1600 from `phrases`
- `words`: 8353 from `words`
- `intro_screens`: 147 from `introScreens`
- `quizzes`: 829 from `quizzes`
- `preposition_packs`: 12 from `prepositionPacks`
- `flashcards`: 155 from `flashcards`
- `daily_phrases`: 176 from `dailyPhrases`
- `personal_practice`: 56 from `personalPracticeNodes`

## Blocked Readiness Checks

- `RDY-002`: Run verdict allows generation
- `RDY-010`: Storage is target-safe
- `RDY-020`: Cloud sync is target-safe
- `RDY-021`: Mixed cloud payloads are split
- `RDY-030`: Achievements are globally/target classified
- `RDY-040`: Local-only and cloud-synced target keys are decided
- `RDY-050`: Production target key architecture exists
- `RDY-060`: User-facing surfaces are target-safe
- `RDY-080`: Generated content audit passed
- `RDY-090`: Apply plan is approved

## Required Pre-Translation Gates

- Readiness generation blockers must be zero.
- Target-safe storage architecture must be implemented and verified.
- Cloud sync must separate global, source-locale and study-target state.
- Achievement, stats, trainer, quiz, flashcard and My Practice state must be target-scoped.
- Generated French content audit schema must exist before any production apply.
- Research pack must be attached before first French translation batch.
- Per-domain translation agents must sign off on grammar, naturalness, source-locale parity and runtime shape.
- Translation output must stay inside the Gustav run container until explicit apply approval.

## Forbidden Early Actions

- Generate French lesson files.
- Translate phrases, words, quizzes, flashcards or My Practice nodes.
- Create generated_content_audit.json as if French exists.
- Modify production app files.
- Create production test files in tests/.
- Attach French content to routes or storage.
- Reuse English storage keys for French progress.
- Mix French target state with English or Spanish state.
- Skip research comparison for French-specific grammar and usage.
- Treat RU/UK prompts as target-language content.

## Translation Agents

- `translation_director` (Translation Office): Owns the batch plan and refuses work until readiness permits generation.
- `french_grammar_researcher` (Research Desk): Compares each grammar point against trusted French-learning references before translation.
- `ru_source_locale_editor` (RU Source Locale): Checks Russian explanations, prompts and quiz wording for source-locale clarity.
- `uk_source_locale_editor` (UK Source Locale): Checks Ukrainian explanations, prompts and quiz wording for source-locale clarity.
- `quiz_distractor_auditor` (Assessment): Validates single-answer quizzes and rejects weak distractors.
- `my_practice_personalization_auditor` (My Practice): Maps personal-practice diagnosis nodes to French-safe remediation lessons.
- `runtime_shape_auditor` (Runtime QA): Checks IDs, placeholders, file shapes, source refs and app container boundaries.
- `final_native_quality_gate` (Linguistic QA): Final pass for natural French, register, grammar, spelling and learner suitability.

## Research Pack Contract

Required: yes
Timing: `before_first_translation_batch`

Source policy:
- Use trusted French grammar and learner-reference sources for each grammar cluster before producing French.
- Record source name, checked point, decision and uncertainty for every research-backed rule.
- Do not rely only on the English base when French grammar requires a different lesson order or explanation.

Comparison policy:
- Compare English source meaning, Russian prompt and Ukrainian prompt before writing French.
- Flag English calques, false friends, article/gender drift, pronoun order drift and tense/aspect mismatches.
- Require a separate generated-content audit before any translated batch can be considered app-ready.

## Findings

No findings.

## Notes

- This audit prepares the translation start gate only; it does not generate French content.
- The English source graph is approved as read-only input, but target-isolation readiness still blocks translation.
- RU and UK are source locales for learning French; they must stay separate from French target fields.
- The next safe work is still architecture/research preparation, not French generation.
