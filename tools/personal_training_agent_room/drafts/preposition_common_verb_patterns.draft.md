# Draft: preposition_common_verb_patterns

## Jesse scope

One diagnosis id only: `preposition_common_verb_patterns`.

This training handles common action + small-word chunks:

- `listen to`
- `wait for`
- `depend on`
- `look at`
- `look for`
- `talk to`
- `talk about`
- `think about`
- `ask for`
- `ask about`
- `believe in`

The learner pain is concrete: they know the main word but lose the small tail, producing phrases like `listen music`, `wait me`, `depend from`, `look on`.

## Protected file

`app/diagnosis_training_preposition_common_verb_patterns.ts`

Marker:

`JESSE_REWORKED_PERSONAL_TRAINING`

## Learner model

Do not choose the small word by direct translation.
Store the whole chunk:

- not `listen` + translated word, but `listen to`;
- not `wait` + translated word, but `wait for`;
- not `depend` + translated word, but `depend on`.

## Content notes

- Preserved existing registry/import route.
- Preserved exact test contract values:
  - priority `29`
  - contrast set
  - required step ids
  - Smart Trainer source and microdiagnosis id
- Rewrote RU/UK learner-facing text to avoid English grammar labels like `object`.
- Kept distractor-specific feedback for every wrong option.
- Kept guided recovery and mixed review.

## QA intent

This should feel like Jesse:

- one mistake family;
- concrete phrase chunks;
- short feedback;
- no broad lecture;
- no direct-translation trap left unexplained.
