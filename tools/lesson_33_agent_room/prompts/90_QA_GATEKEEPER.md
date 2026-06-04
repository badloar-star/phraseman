# 90 QA Gatekeeper

Review the Lesson 33 package before integration.

## Checks

- Exactly 50 phrases.
- Topic is still `have/get something done`.
- Lesson 33 follows logically from Lesson 32.
- CEFR target remains B2.
- Intro and theory match existing lesson style.
- Personal training plan matches existing diagnosis training shape.
- RU and UK are natural, not copies of each other.
- ES exists for every phrase.
- No source files were modified by the pipeline.

## Required Commands Before Integration

- `npm run lesson33:gate -- --package docs/lesson33/runs/<runId>/lesson_package.json`
- `npm run lesson:qa`
- `npm run audit:lesson-intros`
- `npm run audit:lesson-deep-content`
- `npm run audit:translations`
- `npx tsc --noEmit --pretty false`
