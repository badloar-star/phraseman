# Gustav French Curriculum Contract

Date: 2026-05-20

## Decision

French uses the existing 32 lesson rail. The English base remains the structural source, but the French target has its own grammar map where English-only topics are adapted or replaced.

The app source of truth is:

- `app/french_lesson_curriculum.ts`
- `app/lesson_titles_for_study_target.ts`
- `tests/gustav_french_curriculum_contract.test.ts`

## Source Basis

- France Education international DELF A1: self-introduction, simple questions, forms, short messages, simple purchases.
- France Education international DELF A2: routine exchanges, familiar topics, connected short phrases, simple notes/messages.
- France Education international CEFR key content inventory: A1/A2 grammar, vocabulary, discourse functions.
- Alliance Francaise A1 curriculum: être/avoir, articles, present tense, -er verbs, prepositions, imperative, near future, passé composé.
- TV5MONDE A1-A2 grammar bank: learner-facing French grammar explanations and exercises.

## Lesson Rail

- Lessons 1-8: A1.1
- Lessons 9-16: A1.2
- Lessons 17-24: A2.1
- Lessons 25-32: A2.2

## Non-Negotiables

- Do not translate the app interface into French.
- French is a study target available from RU/UK source UI.
- Keep Spanish dev target button intact.
- Never mix French progress/content with English progress/content.
- XP, streak, daily stats, and achievement state are shared account meta, not per-target language state.
- Do not copy English-only grammar blindly: phrasal verbs, English continuous/perfect framing, used to, and complex object require French replacements.

## Current Implementation Status

- French lesson map exists for all 32 lessons.
- Lesson list and lesson menu titles switch to French-track RU/UK titles when `studyTarget === 'fr'`.
- French CEFR label in lesson menu uses A1.1/A1.2/A2.1/A2.2.
- Lesson progress, medals, unlocks, local lesson sessions, mastery replay, and level exam keys are target-aware for French.
- No playable French seed or French intro is active yet.
- Lesson 1 is reset to a blocked source-gate ledger: app activation requires row-level evidence, RU/UK meaning review, approved French word rows, approved rich intro screens, and runtime source-gate approval.
- Personal Practice state is scoped by study target and RU/UK source UI before any French coach lessons can be enabled.
