# Lesson 33 Pipeline

Lesson 33 is the first post-32 lesson pipeline for the English course. It continues Lesson 32, which already mixes advanced B2 patterns such as `be used to + V-ing`, relative clauses, reported speech, passive, and `need/want + object + V3`.

## Topic

Primary Lesson 33 topic: **have/get something done**.

The lesson teaches causative/result-object phrases:

- I had my phone repaired.
- She got her documents checked.
- We need the room cleaned before evening.
- They want the problem solved quickly.

## Scope

- CEFR target: B2.
- Output: a reviewable lesson package, not direct app integration.
- Phrase count: 50 phrases, matching Lessons 1-32.
- Required locales: EN target phrase, RU, UK, ES.
- Required title locales: RU, UK, ES.
- Required title quality: RU, UK, and ES titles must be localized, not one copied placeholder.
- Required continuation anchor: `topic.prerequisites` must mention Lesson 32.
- Required learning surfaces: phrases, intro, theory, personal training plan, QA report.
- Required package status before gate pass: `ready_for_review` or `final_candidate`.

## Pipeline Commands

```bash
npm run lesson33:check
npm run lesson33:pipeline
npm run lesson33:gate -- --package docs/lesson33/runs/<runId>/lesson_package.json
```

The pipeline writes runs under `docs/lesson33/runs/<runId>/`.

Custom `--run-id` values must be simple slugs: letters, numbers, dots, underscores, and hyphens only. Dot directory segments (`.` or `..`) and path separators are rejected so scaffold output cannot escape the review artifact folder.

Custom `--out-root` values must also stay under `docs/lesson33/runs/`.

Gate mode also accepts only packages and report output directories under `docs/lesson33/runs/`. It rejects other paths before reading or writing.

## Modes

- `scaffold`: creates a run folder with the manifest, package shell, briefs, and QA checklist.
- `gate`: validates a filled `lesson_package.json` and writes `gate_report.json` plus `gate_report.md`.

The gate blocks integration if the package does not contain 50 phrases, B2 CEFR scope, the `have/get something done` topic, intro screens, theory blocks, and a personal training plan.

The strengthened gate also checks:

- package `status` is `ready_for_review` or `final_candidate`
- sequential IDs: `lesson33_phrase_1` through `lesson33_phrase_50`
- `phraseTargets.count` must stay at 50 when present
- localized `title.ru`, `title.uk`, and `title.es`
- localized titles must differ across RU, UK, and ES
- `topic.prerequisites` mentioning Lesson 32
- intro screens explaining result, formula, and practice
- theory blocks covering formula, contrast, questions/negatives, and traps
- `wordsEn` token order against the English phrase
- every `wordsEn.correct` value must match its `text`
- distractors must be non-blank, unique, and must not contain the correct answer
- phrase translations must not duplicate English
- RU, UK, and ES phrase translations must not be identical to each other
- at least 35 phrases using a Lesson 33 causative/result-object pattern
- at least 10 phrases using `need/want + object + V3`
- at least 5 question phrases
- at least 5 negative phrases
- `personalTraining.id` exactly `causative_have_get_done`
- personal training steps covering `recognition`, `production`, and `mixed_review`
- every personal training step must include `prompt` and a Lesson 33 causative `target`
- attributive descriptions like "I have a repaired phone" do not count as causative coverage
- a 33-60 roadmap artifact in every scaffolded run
- every 33-60 roadmap item must include `prerequisites`, `recycledFrom`, `newSkill`, `risk`, and `whyHere`
- Lesson 33 must explicitly justify its Lesson 32 continuation and `need/want + object + V3` recycling
- the C1 block must stay gated behind earlier conditionals, modals, reporting, and clause work
- room/protocol files contain the Lesson 32 anchor, Lesson 33 topic, package status, and personal training contract

## Integration Rule

This pipeline must not write into app source files. Integration into `app/lesson_data_*`, `app/lesson_help.tsx`, `constants/lessons.ts`, or diagnosis training files requires a separate explicit approval step after the generated package passes review.

## Required Checks Before Integration

- `npm run lesson:qa`
- `npm run audit:lesson-intros`
- `npm run audit:lesson-deep-content`
- `npm run audit:translations`
- `npx tsc --noEmit --pretty false`

The gate report is only a package-level check. App-level checks still run after explicit source integration.
