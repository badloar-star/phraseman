# QA Report: article_a_an

Training id: `article_a_an`

Files checked:

- `app/diagnosis_training_article_a_an.ts`
- `app/diagnosis_trainings.ts`
- `tools/personal_training_agent_room/drafts/article_a_an.draft.md`

## Scope Check

- Training id is exactly `article_a_an`.
- Existing app file is present.
- Registry route is present in `app/diagnosis_trainings.ts`.
- Content stays inside one mistake category: choosing `a` or `an` by sound.
- The training has its own app file, not inline fallback content.
- The app file now carries the `JESSE_REWORKED_PERSONAL_TRAINING` marker.

## QA Verdict

PASS.

Approved as a Jesse-reworked personal training. Future sessions should not
replace it unless explicitly rebuilding `article_a_an`.
