# Draft: article_a_an

Training id: `article_a_an`

Scope: one small repair only. The learner chooses between `a` and `an` by the
first sound of the next word, not by the first letter.

Correct pattern:

- consonant sound -> `a`
- vowel sound -> `an`
- letters can mislead: `an hour`, `a university`

This draft is represented in the app by
`app/diagnosis_training_article_a_an.ts`.

## Implementation Note

This is an existing Jesse-reworked training from the first personal-training
pass. It now carries the `JESSE_REWORKED_PERSONAL_TRAINING` marker so future
Jesse sessions do not replace it as legacy content.
