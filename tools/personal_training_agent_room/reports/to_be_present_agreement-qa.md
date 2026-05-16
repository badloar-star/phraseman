# QA Report: to_be_present_agreement

Date: 2026-05-16  
Room: Jesse Pinkman  
Mode: draft-only handoff

## Scope Check

- Created draft: `tools/personal_training_agent_room/drafts/to_be_present_agreement.draft.md`
- Created report: `tools/personal_training_agent_room/reports/to_be_present_agreement-qa.md`
- Did not edit `app`, registry, taxonomy, or admin files.
- Replacement sweep found an existing connected app file: `app/diagnosis_training_to_be_present_agreement.ts`.
- Per user instruction, the existing connected app file was not changed.

## Content Check

- Training id: `to_be_present_agreement`
- Locales present in learner-facing copy: RU, UK, ES
- Step count: 12
- Target level: beginner
- Main learner model: "I am, he is, they are" as small word pairs.
- Learner-facing copy avoids the banned space-separated label for this concept.
- Explanations are short and focused on one choice: `am`, `is`, `are`, or missing small word.
- Every step has a separate feedback entry for each wrong option.

## Step Coverage

| Step | Focus | Correct | Wrong options covered |
| --- | --- | --- | --- |
| 1 | I | am | is, are, - |
| 2 | he | is | am, are, - |
| 3 | she | is | am, are, - |
| 4 | they | are | am, is, - |
| 5 | you | are | am, is, - |
| 6 | it | is | am, are, - |
| 7 | we | are | am, is, - |
| 8 | one thing | is | am, are, - |
| 9 | many things | are | am, is, - |
| 10 | question order | Is | Am, Are, Does |
| 11 | negative with they | are | am, is, do |
| 12 | mixed pair | I am / They are | I is, They is, missing words |

## QA Verdict

Pass for draft-only handoff. The draft is ready for product/content review before any future integration work.

Focused Jesse gate was not run because this task intentionally did not publish or modify app training files.
