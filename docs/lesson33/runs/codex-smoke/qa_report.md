# Lesson 33 QA Report

Status: scaffolded

## Gate

This run is not ready for app integration until all required outputs are filled and all checks pass.

## Required Checks

- [ ] npm run lesson:qa
- [ ] npm run audit:lesson-intros
- [ ] npm run audit:lesson-deep-content
- [ ] npm run audit:translations
- [ ] npx tsc --noEmit --pretty false

## Source Write Guard

The pipeline must not modify:

- app/lesson_data_25_32.ts
- app/lesson_data_all.ts
- app/lesson_help.tsx
- app/lesson_intros_17_32.ts
- constants/lessons.ts
- tests/
