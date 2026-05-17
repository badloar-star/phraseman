# Draft: preposition_direction

## Jesse scope

One diagnosis id only: `preposition_direction`.

This is the residual direction bucket after `preposition_direction_to_into_from`.
The lesson stays intentionally narrow:

- `go home` / `come home` without `to`;
- `to` for a destination;
- `into` for movement inside;
- `onto` for movement onto a surface;
- `from` for a starting point;
- `out of` for movement from inside to outside.

The core learner pain is not "memorize all direction words".
It is choosing by Russian/Ukrainian direct translation instead of by the movement arrow.

## Protected file

`app/diagnosis_training_preposition_direction.ts`

Marker:

`JESSE_REWORKED_PERSONAL_TRAINING`

## Learner model

Draw an arrow first:

- home after go/come is already a destination: `come home`;
- to a place: `go to work`;
- inside: `go into the room`;
- onto a surface: `put it onto the table`;
- starting point: `come from Dublin`;
- from inside to outside: `get out of the car`.

## Content notes

- Kept the existing app/test contract for `contrastSet`, priority, routes, analytics, and Smart Trainer payload.
- Replaced legacy mojibake and broad grammar text with concrete RU/UK learner copy.
- Kept required exercise ids used by `trainer_modes.test.ts`.
- Added distractor-specific feedback for every wrong option.
- Guided mode uses the same arrow model instead of terminology.

## QA intent

The training should feel like Jesse:

- one mistake family;
- short, usable explanations;
- concrete ready chunks;
- no broad textbook lecture;
- no forbidden grammar-term teaching in learner-facing RU/UK text.
