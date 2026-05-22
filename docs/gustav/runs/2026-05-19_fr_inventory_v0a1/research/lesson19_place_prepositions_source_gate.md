# Lesson 19 Source Gate: French Place Prepositions

Status: research-only, not approved for app activation.

Date: 2026-05-20

## Blocker

Lesson 19 French phrase rows, word rows, intro examples and RU/UK meanings must not be activated from assistant-only translation.

Before app write:

- every English base row must have an evidence note or an exact reviewed decision;
- lexical choices must be checked against dictionary/reference sources;
- French grammar choices must be checked against French grammar/reference sources;
- RU and UK meanings must be reviewed as meanings, not copied from English mechanically;
- rich intro screens must cite the source-backed grammar point and use the current `linesRU` / `linesUK` format.

## Sources Found

- Cambridge English-French Dictionary, `under`: supports `sous` for physical below-location. URL: https://dictionary.cambridge.org/dictionary/english-french/under
- Cambridge English-French Dictionary, `near`: supports `pres de` for physical nearness. URL: https://dictionary.cambridge.org/dictionary/english-french/near
- Cambridge English-French Dictionary, `next to`: supports adjacency as `a cote de` / `pres de`. URL: https://dictionary.cambridge.org/us/dictionary/english-french/next-to
- Cambridge French-English Dictionary, `en face de`: supports the opposite/facing relation. URL: https://dictionary.cambridge.org/dictionary/french-english/en-face-de
- Cambridge English-French Dictionary, `above`: supports `au-dessus de` for higher physical position. URL: https://dictionary.cambridge.org/us/dictionary/english-french/above
- Larousse, `pres`: supports the French spatial relation for low distance. URL: https://www.larousse.fr/dictionnaires/francais/pres/63654
- Larousse, `face`: supports `en face de` with place complements. URL: https://www.larousse.fr/dictionnaires/francais/face/32561
- Larousse, `entre`, `interieur`, `exterieur`: supports spatial families that still need row-level review. URLs: https://www.larousse.fr/dictionnaires/francais/entre/30002, https://www.larousse.fr/dictionnaires/francais/interieur/43706, https://www.larousse.fr/dictionnaires/francais/exterieur/32388
- TV5MONDE Apprendre le francais, A1 place-preposition grammar exercise: supports the topic as beginner grammar practice, not PhraseMan wording. URL: https://apprendre.tv5monde.com/fr/exercices/a1-debutant/grammaire-les-prepositions-de-lieu

## Activation Rule

The evidence above is enough to start a lesson 19 research draft. It is not enough to activate `LESSON_19_FRENCH_SEED`.

Activation needs a row ledger with:

- English base phrase id;
- proposed French target;
- RU meaning;
- UK meaning;
- lexical sources;
- grammar source;
- ambiguity notes;
- reviewer status;
- final app row status.

Any row without accepted status stays out of `app/lesson_data_fr_seed.ts`.
