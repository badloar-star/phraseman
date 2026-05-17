# modal_should_must_have_to

Jesse rewrite for the personal training diagnosis `modal_should_must_have_to`.

## Scope

- Keep the existing MVP contract id, category, priority, contrast sets, and required anchor step ids.
- Rebuild learner-facing copy around one problem: Russian/Ukrainian learners flatten `should`, `must`, and `have to` into one "должен / повинен".
- Make the training distinguish five meanings: advice, strong rule, external necessity, prohibition, and no obligation.

## Required anchors

- `modal_smh_easy_001`: choosing `must` must explain that advice needs `should`.
- `modal_smh_easy_002`: choosing `to call` must explain the correct chunk `should call`.
- `modal_smh_contrast_003`: choosing `don't have to` must explain that prohibition needs `mustn't`.
- `modal_smh_contrast_006`: choosing `Have` must point to `Do you have to work`.

## Content design

The exercise ladder moves from single meaning to mixed review:

1. `should` for advice.
2. Action after `should`.
3. `shouldn't` for advice not to do something.
4. `must` for rules.
5. Action after `must`.
6. `mustn't` for prohibition.
7. `have to` for external necessity.
8. `has to` with he/she/it.
9. `Do you have to...?`.
10. `don't have to` for no obligation.
11. `doesn't have to`.
12. `mustn't` vs `don't have to`.
13. Mixed advice/rule/necessity.
14. Mixed question/negative.
15. Final sentence correction.

## QA notes

- Status moved to `active`.
- Jesse marker added.
- Supported locales remain `ru` and `uk`.
- No legacy broad modal-force file was changed.
