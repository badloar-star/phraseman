# Lesson 1 French Starter Source Gate

Run: `2026-05-19_fr_inventory_v0a1`

Status: research-only, not approved for app activation.

## Scope

- Study target: French.
- Source UI locales: Russian and Ukrainian only.
- App UI translation to French: forbidden.
- Lesson surface: draft only until row-level evidence and reviewer acceptance exist.

## Candidate Official/Reference Sources

1. France Education international, `Manuel du candidat DELF A1`
   - URL: https://www.france-education-international.fr/document/manuel-candidat-delf-a1
   - Use: A1 boundary check for simple phrases, common present-tense verbs, simple questions, and agreement awareness.
   - Status: source candidate, not row approval.

2. Larousse, `Conjugaison : être`
   - URL: https://www.larousse.fr/conjugaison/francais/%C3%AAtre/4440
   - Use: forms of `être` in the present indicative and auxiliary role.
   - Status: source candidate, not row approval.

3. Larousse, `Conjugaison : aller`
   - URL: https://www.larousse.fr/fr/conjugaison/francais/aller/314
   - Use: `aller` as a movement verb and present-tense conjugation source.
   - Status: source candidate, not row approval.

4. Cambridge English-French Dictionary, `be`
   - URL: https://dictionary.cambridge.org/us/dictionary/english-french/be
   - Use: lexical mapping warnings for English `be`; confirms that English progressive/passive uses do not map mechanically to one French lesson rule.
   - Status: source candidate, not row approval.

5. Cambridge English-French Dictionary, `have`
   - URL: https://dictionary.cambridge.org/dictionary/english-french/have
   - Use: lexical mapping warnings for `have`, especially auxiliary and obligation meanings.
   - Status: source candidate, not row approval.

6. Cambridge English-French Dictionary, `go`
   - URL: https://dictionary.cambridge.org/us/dictionary/english-french/go
   - Use: lexical mapping warnings for `go` and `aller`; does not approve full PhraseMan rows.
   - Status: source candidate, not row approval.

## Activation Rules

- Do not re-add `LESSON_1_FRENCH_SEED` to `app/lesson_data_fr_seed.ts`.
- Do not re-add `FRENCH_INTRO_SCREENS[1]` to `app/lesson_intro_screens_fr.ts`.
- Before activation, every row needs:
  - English base phrase inventory.
  - RU and UK meaning review.
  - French grammar/reference note.
  - Bilingual dictionary or parallel-source note for risky lexical choices.
  - Reviewer status accepted.

## Current Decision

Lesson 1 remains blocked from runtime. Draft seed and draft intro runtime files are intentionally empty until row-level evidence is accepted.

## Approved Research Packet: Scope Only

Status: approved for lesson planning research; not approved for app activation.

This packet may be used to design the French-specific Lesson 1 order and reviewer checklist. It must not be used to write `proposedFrench`, `wordsFr`, quiz rows, diagnostic rows, intro examples, or production app seeds.

### Source Evidence Used

- France Education international, `Manuel du candidat DELF A1`: supports A1 scope around self-presentation, simple personal questions, simple instructions, short texts and basic form-like personal information. This supports the beginner communication boundary only.
- TV5MONDE Apprendre le français, `Grammaire : le verbe être et le verbe s'appeler au présent`: supports treating present-tense `être` and `s'appeler` as beginner grammar practice. This supports a Lesson 1 grammar objective, not PhraseMan row wording.
- Larousse, `Conjugaison : être`: supports checking `être` as a core irregular present-tense verb and auxiliary. It must be used for forms, not for translating PhraseMan rows.
- Cambridge English-French Dictionary, `be`: supports lexical-risk review for English `be`, especially because English `be` does not map mechanically to one French structure in progressive, passive or identity sentences.

### Lesson 1 Planning Decision

- Grammar objective: beginner identity/introduction grammar, anchored on `être` and name/introduction structures.
- CEFR target: A1 starter only.
- French structures to research next: subject pronouns, present-tense `être`, name/introduction structure, simple affirmative/negative identity statements, simple personal questions.
- RU/UK explanation needs: explain that English `to be` is not a one-to-one French template; explain conjugated forms before phrase assembly; flag that French UI must not be created.
- Phrase candidates: remain empty until every row has row-level lexical/grammar evidence and RU/UK meaning review.
- Vocabulary: remain empty until noun gender, article choice and pronunciation notes are reviewed.
- Distractors: remain empty until one-correct-answer policy is signed off for each row.
- Quiz/exam mapping: blocked until the French quiz/exam packets cite this lesson objective and approve distractors.
- Mistake taxonomy: draft categories may be `verb_etre_agreement`, `subject_pronoun`, `name_intro_structure`, `negation_basic`; no runtime taxonomy activation until personal-practice source evidence exists.

### Next Required Evidence

- Row-by-row comparison against the connected English Lesson 1 base inventory.
- RU and UK meaning review for every candidate row.
- Dictionary or grammar reference note for every risky lexical or structural decision.
- Rich intro notes in the current `linesRU` / `linesUK` shape.
- Reviewer acceptance before anything can enter `app/lesson_data_fr_seed.ts`.
