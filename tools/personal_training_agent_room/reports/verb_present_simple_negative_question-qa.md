# QA: verb_present_simple_negative_question

Status: ready as draft/report package
Scope checked: only `tools/personal_training_agent_room/drafts/verb_present_simple_negative_question.draft.md` and this report were created.

## User Constraints

| Constraint | Result |
| --- | --- |
| Work only on `verb_present_simple_negative_question` | Pass |
| Create draft file | Pass |
| Create QA report file | Pass |
| Do not touch registry/taxonomy/admin | Pass |
| Avoid banned wording | Pass |
| Include required learner explanation | Pass |
| Focus on `Do you...?`, `Does he...?`, `I don't...`, `He doesn't...` | Pass |
| Every wrong option explains its exact error | Pass |

## Content Review

The draft is scoped to one repair target: questions and negatives with `do`, `does`, `don't`, `doesn't`.

Covered patterns:

- `Do you work?`
- `Does he work?`
- `I don't work.`
- `He doesn't work.`

Covered mistake types:

- `Does you...?` explained as a subject-match error.
- `Do he...?` explained as a subject-match error.
- `I doesn't...` explained as a subject-match error.
- `He don't...` explained as a subject-match error.
- `Does he works?` explained as extra `-s` after `does`.
- `He doesn't works.` explained as extra `-s` after `doesn't`.
- `Are you work?`, `Is he work?`, `I am not know`, `He isn't need` explained as wrong helper choice with action verbs.

## Exercise QA

| Item | Target | Wrong-option feedback |
| --- | --- | --- |
| 1 | `Do you...?` | Specific for `Does`, `Are`, `Do works` |
| 2 | `Does he...?` | Specific for `Do`, `Is`, `Does works` |
| 3 | `I don't...` | Specific for `doesn't`, `am not`, `don't likes` |
| 4 | `He doesn't...` | Specific for `don't`, `isn't`, `doesn't likes` |
| 5 | `Do you...?` | Specific for `Does`, `Are`, `Do lives` |
| 6 | `Does he...?` | Specific for `Do`, `Is`, `Does lives` |
| 7 | `I don't...` | Specific for `doesn't`, `am not`, `don't knows` |
| 8 | `He doesn't...` | Specific for `don't`, `isn't`, `doesn't knows` |
| 9 | `Do you...?` | Specific for subject match, wrong helper, `-s` after `do` |
| 10 | `Does he...?` | Specific for subject match, wrong helper, `-s` after `does` |
| 11 | `I don't...` | Specific for subject match, wrong helper, `-s` after `don't` |
| 12 | `He doesn't...` | Specific for subject match, wrong helper, `-s` after `doesn't` |
| 13 | `Do you...? / I don't...` | Each wrong pair identifies the bad half only |
| 14 | `Does he...? / He doesn't...` | Each wrong pair identifies the bad half only |
| 15 | `Does he works?` repair | Distractors point back to `works -> work` |
| 16 | `He doesn't works.` repair | Distractors point back to `works -> work` |

## Risk Notes

- This is a content draft, not an app integration patch.
- No registry, taxonomy, or admin files were edited.
- No automated app gate was run because the requested deliverables are markdown draft/report files only.

## Verdict

Pass. The draft stays inside the requested id, uses the required explanation, keeps the focus narrow, and gives option-specific feedback for every wrong answer.
