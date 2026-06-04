# Lesson 33 Agent Room

This room creates a reviewable Lesson 33 package after the existing 32-lesson course.

Lesson 32 is the bridge. Lesson 33 focuses that bridge into one B2 topic: **have/get something done**.

## Run

```bash
npm run lesson33:check
npm run lesson33:pipeline
npm run lesson33:gate -- --package docs/lesson33/runs/<runId>/lesson_package.json
```

Custom run ids must be safe slugs: letters, numbers, dots, underscores, and hyphens only. Do not use `.` or `..`.

Custom output roots must stay under `docs/lesson33/runs/`.

Gate mode must read and write only under `docs/lesson33/runs/`.

## Output

Runs are created in `docs/lesson33/runs/<runId>/` with:

- `manifest.json`
- `lesson_package.json`
- `curriculum_brief.md`
- `phrase_blueprint.md`
- `intro_theory_plan.md`
- `personal_training_plan.md`
- `qa_report.md`
- `gate_report.json` and `gate_report.md` after gate mode

## Non-Negotiables

- Create exactly 50 phrases.
- Preserve the Lesson 1-32 pattern.
- Keep CEFR at B2.
- Do not write app source files from this room.
- Run `npm run lesson:qa` before any app integration claim.

## Gate Mode

After agents fill `lesson_package.json`, run gate mode. A blocked gate is useful: fix the listed errors in the package and run the gate again.
