# Personal Training Copy Quality Audit

## Goal

The next quality layer is content-first:

- Russian and Ukrainian learner-facing copy must be real localized text, not transliteration.
- Spanish copy must not contain Cyrillic fallback text.
- Rules must explain the learner's mistake in plain language, not only name grammar categories.
- Wrong-answer feedback must explain why the selected option fails.
- English grammar terms may appear when useful, but learner-facing RU/UK copy should not depend on internal labels like `subject`, `object`, `auxiliary`, or `base verb`.

## Command

```bash
npm run training:personal:copy-audit
```

Strict mode is available, but should only be enabled after the first cleanup pass:

```bash
npm run training:personal:copy-audit:strict
```

## Current Baseline

Latest local audit:

- `1933` high-confidence errors
- `2816` warnings

Main groups:

- `ru-uk-translit`: RU/UK copy looks transliterated instead of localized.
- `latin-heavy-ru-uk`: RU/UK copy is mostly Latin letters. Some of this is expected when the sentence contains English examples, so this is a warning.
- `english-grammar-jargon`: learner-facing RU/UK copy contains internal grammar labels.
- `thin-intro`: intro has too few teaching blocks.
- `thin-mental-model`: mental model is too short to explain the rule clearly.

## First Cleanup Priority

1. Fix `ru-uk-translit` first. These are user-visible quality bugs.
2. Then review `english-grammar-jargon` and rewrite internal labels into human explanations.
3. Then review `latin-heavy-ru-uk` warnings and separate acceptable English examples from bad localization.
4. Only after the first three passes, enable strict mode in the main personal training check.

## Quality Bar

Good learner-facing feedback:

- names the mistaken choice;
- explains the meaning it creates;
- gives the correct chunk;
- stays short enough to read inside the trainer.

Bad learner-facing feedback:

- only says "wrong";
- only names a grammar term;
- uses transliteration;
- explains the whole topic again instead of the specific mistake.
