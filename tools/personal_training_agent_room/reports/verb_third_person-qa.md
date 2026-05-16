# QA: verb_third_person

Scope checked:
- Draft file: `tools/personal_training_agent_room/drafts/verb_third_person.draft.md`
- QA file: `tools/personal_training_agent_room/reports/verb_third_person-qa.md`
- App, registry, docs, tests, and admin files intentionally untouched.

## Request Fit

- [x] Only focused on training id `verb_third_person`.
- [x] Created draft only.
- [x] Created QA report only.
- [x] Did not edit shared files.
- [x] 12 learner steps included.
- [x] RU/UK/ES copy included for title, diagnosis, model, core rule, meanings, and feedback.
- [x] Beginner tone used.
- [x] Shame-free recovery language included.
- [x] Every option has feedback, including correct options and each wrong option.

## Content Boundary

- [x] Teaches one concrete pattern: after he/she/it or one person/thing, English often adds -s/-es to the action word.
- [x] Uses the requested human explanation: small -s tail, with I work - he works.
- [x] Keeps does as a boundary check only, not a separate broad lesson.
- [x] Includes spelling cases: works, lives, costs, leaves, goes, watches, studies.
- [x] Includes have -> has.
- [x] Includes contrast with they/I/you/we where no -s is needed.

## Forbidden Wording Check

- [x] The learner-facing draft avoids the blocked grammar labels requested by the user.
- [x] QA prose avoids those labels too.
- [x] The only unavoidable identifier-like text is the underscore id/path `verb_third_person`, which is the requested training id.

## Per-Option Feedback Check

Steps checked manually:
- [x] Step 1: A/B/C/D feedback present in RU/UK/ES.
- [x] Step 2: A/B/C/D feedback present in RU/UK/ES.
- [x] Step 3: A/B/C/D feedback present in RU/UK/ES.
- [x] Step 4: A/B/C/D feedback present in RU/UK/ES.
- [x] Step 5: A/B/C/D feedback present in RU/UK/ES.
- [x] Step 6: A/B/C/D feedback present in RU/UK/ES.
- [x] Step 7: A/B/C/D feedback present in RU/UK/ES.
- [x] Step 8: A/B/C/D feedback present in RU/UK/ES.
- [x] Step 9: A/B/C/D feedback present in RU/UK/ES.
- [x] Step 10: A/B/C/D feedback present in RU/UK/ES.
- [x] Step 11: A/B/C/D feedback present in RU/UK/ES.
- [x] Step 12: A/B/C/D feedback present in RU/UK/ES.

## Risks / Notes

- This is not wired into the app by design. User requested draft and QA only.
- Existing published app training for this id was found during the sweep but left untouched.
- The draft is content-ready for a later integrator pass, but no implementation gate was run because no app code was changed.

## QA Verdict

PASS.

Implementation integrator review completed for publish activation:

- Existing app file is present: `app/diagnosis_training_verb_third_person.ts`.
- Registry route is present in `app/diagnosis_trainings.ts`.
- Content stays inside one mistake category: the small `-s/-es` ending after he/she/it or one person/thing.
- The report confirms 12 learner steps, RU/UK/ES coverage, beginner-safe wording, and option-specific feedback for every answer.
- Approved for `status: active`.
