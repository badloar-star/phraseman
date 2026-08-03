# German B2 expert pre-calibration

Status: provisional expert calibration for the isolated candidate bank. It is not empirical item calibration and does not make the bank publishable.

Ordering factors: lexical specificity, discourse dependency, evidential integration, source and stance tracking, number of interactional constraints, and consequence severity. Scores use the English engine’s B2 interval (3.2–3.9), increase strictly, and use non-uniform gaps. `build_german_candidate_b2.mjs` owns runtime order; source rows remain in blueprint order.

| Runtime range | Source rows | Score range | Primary load |
|---|---|---:|---|
| de-b2-001–010 | 2, 10, 6, 14, 22, 18, 26, 30, 34, 38 | 3.200–3.344 | Argument, institutional, change, public-statement, administrative, stance, research, collocation, understatement, and data-protection precision |
| de-b2-011–020 | 5, 9, 13, 21, 33, 1, 17, 25, 29, 37 | 3.363–3.526 | Feasibility, means clause, possession, absent circumstance, proportionality, indirect speech, counterfactual past, future completion, and substitute mood |
| de-b2-021–030 | 7, 27, 19, 35, 23, 11, 15, 31, 39, 3 | 3.545–3.714 | Reservation, framing, baseline, voice, audience risk, expert disagreement, causal contribution, hidden assumption, certainty, and bounded thesis |
| de-b2-031–040 | 4, 8, 12, 20, 24, 32, 28, 16, 36, 40 | 3.730–3.900 | Evidence challenge, safe refusal, mediation, upward correction, trade-off, complaint, bad news, repeated failure, executive escalation, and accountable commitment |

## Production boundary

- Scores are expert priors for deterministic pre-production routing only.
- Independent German linguistic review, structural gates, adaptive simulation, and integration audit remain mandatory.
- Real-response telemetry must later estimate facility, discrimination, distractor performance, and interface-language differential performance.
