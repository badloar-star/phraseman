# French A1 expert pre-calibration

Status: provisional expert calibration for the isolated candidate bank. It is not empirical item calibration and does not make the bank publishable.

Ordering factors: lexical familiarity, number of details to retain, morphological transparency, interactional directness, and whether the task requires one explicit lookup or a short integration. Scores follow the English engine's A1 interval, increase strictly, and use non-uniform gaps. `build_french_candidate_a1.mjs` owns runtime order; source rows remain in blueprint order.

| Runtime range | Source rows | Score range | Primary load |
|---|---|---:|---|
| fr-a1-001–010 | 2, 4, 1, 3, 6, 8, 5, 7, 10, 12 | 0.500–0.762 | Greeting, introduction, identity, explicit time, family, café request, age, platform, drink, and repetition |
| fr-a1-011–020 | 9, 11, 14, 16, 13, 15, 18, 20, 17, 19 | 0.777–0.908 | Article, hours, town place, acceptance, regular present, invitation details, transport, refusal, existence, and route order |
| fr-a1-021–030 | 22, 24, 21, 23, 26, 28, 25, 27, 30, 32 | 0.923–1.054 | Weather, price request, interior location, label, clothing, toilet request, agreement, public closure, symptom, and apology |
| fr-a1-031–040 | 29, 31, 34, 36, 33, 35, 38, 40, 37, 39 | 1.069–1.200 | Negation, next event, household object, shop help, object pronoun, prohibition, direction, service closing, irregular present, and call-back note |

## Production boundary

- Scores are expert priors for deterministic pre-production routing only.
- Independent French linguistic review, structural gates, adaptive simulation, and A1/A2 boundary review remain mandatory.
- Real-response telemetry must later estimate facility, discrimination, distractor performance, and interface-language differential performance.
