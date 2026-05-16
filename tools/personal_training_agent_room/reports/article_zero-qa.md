# QA: article_zero

Training id: `article_zero`

Files checked:

- `tools/personal_training_agent_room/drafts/article_zero.draft.md`

Protocol note:

- Requested path `room/docs/standard` was not present in this workspace.
- Jesse room files read instead:
  - `tools/personal_training_agent_room/JESSE_PINKMAN.md`
  - `tools/personal_training_agent_room/README.md`
  - `tools/personal_training_agent_room/ROOM.md`
  - `tools/personal_training_agent_room/templates/replacement_checklist.md`
  - `tools/personal_training_agent_room/prompts/10_IMPLEMENTATION_INTEGRATOR.md`

Scope check:

- [x] Diagnosis id is exactly `article_zero`.
- [x] Work is draft/report only.
- [x] No app file was created or edited.
- [x] Registry, taxonomy, and admin files were not edited.
- [x] Replacement sweep was read-only.
- [x] Existing app file found: `app/diagnosis_training_article_zero.ts`.
- [x] No stale same-id app variants were found in `app`.

Content check:

- [x] One idea only: English can talk about things in general with no article.
- [x] Not a broad article lesson.
- [x] No long rule list for `a/an/the`.
- [x] Simple learner language.
- [x] RU, UK, and ES are separate sections.
- [x] Examples support the same idea.
- [x] Every task has one correct answer: `no article`.
- [x] Every wrong option has its own feedback.
- [x] Each wrong feedback names and explains the exact selected option.

Wrong-option feedback audit:

- `a`: each explanation says why `a` does not fit the selected sentence.
- `an`: each explanation says why `an` does not fit the selected sentence.
- `the`: each explanation says why `the` would make the noun specific, while the sentence is general.

Manual QA result: PASS

Automated gate:

- Not run. The requested deliverables are markdown draft and QA only, and the user explicitly said not to create app files or touch registry/taxonomy/admin.
