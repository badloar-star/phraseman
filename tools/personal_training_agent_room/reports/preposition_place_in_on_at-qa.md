# QA Report: preposition_place_in_on_at

Status: pass for draft handoff.
Files checked:
- `tools/personal_training_agent_room/drafts/preposition_place_in_on_at.draft.md`
- `tools/personal_training_agent_room/reports/preposition_place_in_on_at-qa.md`

## Scope Check

- Training id is exactly `preposition_place_in_on_at`.
- Work is limited to draft/report artifacts in `tools/personal_training_agent_room`.
- No shared app, registry, admin, test, or docs files were changed.
- Content teaches only spatial use of `in`, `on`, and `at`.
- The learner model uses the required framing: `in` — inside, `on` — surface, `at` — point/place.

## Content Check

- 12 learner steps are present.
- All steps use RU / UK / ES learner-facing text.
- Every step has the same three answer options: `in`, `on`, `at`.
- Every option in every step has option-specific feedback.
- The feedback explains the picture of the place instead of giving a broad grammar lecture.
- Examples cover containers, surfaces, meeting points, cities, walls, exact addresses, functional places, material surfaces, bounded outdoor areas, building levels, route points, and streets as lines.

## Risk Notes

- Step 7 notes that `in school` can exist in some varieties, but keeps the target answer `at school` because the task is about the school as a place of activity.
- Step 11 distinguishes `at the corner` for a stop point from `on the corner` for a building/location on a corner.
- Step 12 uses a street without a number for `on`; exact-address contrast is handled separately in step 6 with `at`.

## Handoff

The draft is ready for implementation handoff. This pass intentionally did not publish or wire app code.
