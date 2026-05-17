# adjective_comparison

Jesse rewrite for the personal training diagnosis `adjective_comparison`.

## Scope

- Keep the MVP id, category, priority, supported locales, contrast set, smart trainer config, guided mode, and required anchor steps.
- Rebuild the copy around one learner problem: the learner understands the comparison meaning, but builds the English chunk incorrectly.
- Teach meaning first:
  - short words often use `-er`: `cheaper`, `faster`
  - longer words often use `more`: `more expensive`, `more useful`
  - spelling changes: `big -> bigger`, `easy -> easier`
  - irregular chunks: `good -> better`, `bad -> worse`
  - direct comparison uses `than`
  - equal comparison uses `as ... as`

## Required anchors

- `comparison_contrast_001`: wrong `biger` feedback must contain `bigger`.
- `comparison_easy_003`: wrong `expensiver` feedback must contain `more expensive`.
- `comparison_mixed_003`: wrong `better / than` feedback must contain `as good as`.

## Step ladder

1. `cheap -> cheaper`
2. `fast -> faster`
3. `expensive -> more expensive`
4. `big -> bigger`
5. `hot -> hotter`
6. `easy -> easier`
7. `easier than`
8. `useful -> more useful`
9. `good -> better`
10. `bad -> worse`
11. `cheaper / more expensive`
12. `as good as`
13. `better than / as good as`
14. `good -> better / bad -> worse`
15. final sentence correction

## QA notes

- Status moved to `active`.
- Jesse marker added.
- Supported locales remain `ru`, `uk`, `es`.
- Learner-facing RU/UK copy avoids internal labels such as `comparative form` and teaches through ready chunks.
