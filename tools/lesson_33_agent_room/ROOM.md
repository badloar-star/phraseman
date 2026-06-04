# Lesson 33 Room Protocol

## Mission

Create Lesson 33 as the logical continuation after Lesson 32.

Lesson 32 is a final mixed review. It already introduces the object-result bridge in phrases such as `I need the documents checked today` and `They want the problem solved quickly`. Lesson 33 turns that bridge into a focused B2 lesson: **have/get something done**.

## Product Shape

Lesson 33 must match the existing course:

- 50 phrases.
- Package status `ready_for_review` or `final_candidate` before gate pass.
- Localized title in RU, UK, and ES.
- Localized titles must differ across RU, UK, and ES.
- Intro screens explaining result, formula, and practice.
- Theory section covering formula, contrast, questions/negatives, and traps.
- RU, UK, ES source-locale text.
- Real RU, UK, and ES phrase translations, not English copies or one shared placeholder.
- English token assembly data with non-blank, unique useful distractors and `correct` values matching `text`.
- Balanced phrase mix: `have/get`, `need/want`, questions, and negatives.
- Personal training plan for the new micro-skill, with `recognition`, `production`, and `mixed_review` steps.
- QA report before source integration.
- Explicit Lesson 32 prerequisite anchor.
- The 33-60 curriculum roadmap must explain each lesson with prerequisites, recycled material, new skill, risk, and why this exact position is logical.

## Agent Order

1. `00_ORCHESTRATOR`: keeps the run coherent and blocks source writes.
2. `10_CURRICULUM_ARCHITECT`: defines the CEFR scope and phrase progression.
3. `20_PHRASE_WRITER`: drafts 50 phrases and token/distractor requirements.
4. `30_INTRO_THEORY_WRITER`: drafts intro and theory.
5. `40_PERSONAL_TRAINING_WRITER`: drafts the diagnosis training shape.
6. `90_QA_GATEKEEPER`: checks Lesson 33 against Lesson 1-32 patterns.

## Workflow

1. Scaffold the run: `npm run lesson33:pipeline -- --run-id <name>`.
2. Fill `docs/lesson33/runs/<name>/lesson_package.json` through the agents.
3. Review `curriculum_roadmap_33_60.md` before phrase writing; do not treat Lesson 33 as an isolated lesson.
4. Gate the package: `npm run lesson33:gate -- --package docs/lesson33/runs/<name>/lesson_package.json`.
5. Fix every blocker in `gate_report.md`.
6. Only after a passing gate, ask for explicit approval to integrate app source files.

## Source Write Guard

The room produces review artifacts only. It must not modify:

- `app/lesson_data_25_32.ts`
- `app/lesson_data_all.ts`
- `app/lesson_help.tsx`
- `app/lesson_intros_17_32.ts`
- `constants/lessons.ts`
- tests

## Required Checks

Before integration, run:

- `npm run lesson:qa`
- `npm run audit:lesson-intros`
- `npm run audit:lesson-deep-content`
- `npm run audit:translations`
- `npx tsc --noEmit --pretty false`
