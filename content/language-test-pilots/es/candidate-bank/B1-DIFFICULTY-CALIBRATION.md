# Spanish B1 expert pre-calibration

Status: provisional expert calibration for the isolated candidate bank. It is not an empirical claim and does not make the bank publishable. Real-response item statistics remain required before production recalibration.

The ordering uses four observable factors: number of details that must be integrated, grammatical dependency span, explicit versus inferred evidence, and pragmatic component count/register control. Scores stay inside the English engine’s B1 interval (2.3–3.1), are strictly increasing, and are intentionally non-linear. Source rows remain in blueprint order; `build_spanish_candidate_b1.mjs` owns the reviewed runtime order.

| Runtime item | Source row | Score | Primary load |
|---|---:|---:|---|
| es-b1-001 | 4 | 2.300 | Explicit employment term in one sentence |
| es-b1-002 | 11 | 2.316 | Explicit health-category distinction |
| es-b1-003 | 15 | 2.335 | Familiar participant-role distinction |
| es-b1-004 | 7 | 2.351 | Banking term inferred from a stated fee |
| es-b1-005 | 19 | 2.374 | Travel remedy inferred from cancellation |
| es-b1-006 | 27 | 2.389 | Environmental action from explicit procedure |
| es-b1-007 | 31 | 2.407 | Emotion inferred from a clear state change |
| es-b1-008 | 35 | 2.426 | Education funding term from definition |
| es-b1-009 | 39 | 2.443 | Civic document distinguished from service-place terms |
| es-b1-010 | 23 | 2.465 | Digital-security referent inferred from warning |
| es-b1-011 | 13 | 2.486 | Controlled future morphology with explicit evidence |
| es-b1-012 | 33 | 2.503 | Place-relative connector in a single dependency |
| es-b1-013 | 29 | 2.527 | Ongoing duration with a verbal periphrasis |
| es-b1-014 | 17 | 2.546 | Hypothetical advice frame and conditional form |
| es-b1-015 | 5 | 2.568 | Subjunctive licensed by recommendation |
| es-b1-016 | 21 | 2.583 | Future temporal clause and mood control |
| es-b1-017 | 9 | 2.609 | Ordered double-object pronouns and agreement |
| es-b1-018 | 25 | 2.631 | Passive se agreement in an institutional rule |
| es-b1-019 | 2 | 2.648 | Background/foreground aspect across two clauses |
| es-b1-020 | 6 | 2.672 | Explicit cause and consequence in a service notice |
| es-b1-021 | 1 | 2.694 | Action plus deadline amid a competing task |
| es-b1-022 | 26 | 2.713 | Cross-sentence object-pronoun resolution |
| es-b1-023 | 10 | 2.737 | Schedule, restriction, and exception integration |
| es-b1-024 | 38 | 2.752 | Audience and requested action inference |
| es-b1-025 | 3 | 2.779 | Apology, conflict, and concrete rescheduling alternative |
| es-b1-026 | 24 | 2.801 | Identity, purpose, and callback information |
| es-b1-027 | 12 | 2.819 | Neutral clarification of two possible referents |
| es-b1-028 | 16 | 2.844 | Formal opening, request purpose, and closing |
| es-b1-029 | 28 | 2.861 | Advice balanced with listener autonomy |
| es-b1-030 | 18 | 2.887 | Cancellation, transfer, arrival, and deadline integration |
| es-b1-031 | 22 | 2.906 | Eligibility, three documents, and deadline integration |
| es-b1-032 | 34 | 2.924 | Multi-criterion service-plan comparison |
| es-b1-033 | 14 | 2.947 | Overall evaluation inferred across praise and criticism |
| es-b1-034 | 30 | 2.969 | Cause, consequence, and institutional response in news |
| es-b1-035 | 8 | 2.984 | Mitigated disagreement plus relevant justification |
| es-b1-036 | 20 | 3.008 | Complaint acknowledgement and choice of remedy |
| es-b1-037 | 32 | 3.027 | Tactful correction and two-step plan restoration |
| es-b1-038 | 36 | 3.051 | Negotiated compromise preserving two priorities |
| es-b1-039 | 40 | 3.076 | Evidence, investigation request, and specific refund remedy |
| es-b1-040 | 37 | 3.100 | Unreal present condition across two verb systems |

## Production boundary

- These scores are expert priors, not measured difficulty parameters.
- The adaptive simulator may use them for deterministic pre-production routing only after the whole bank passes content review.
- Production telemetry must later test facility, discrimination, distractor functioning, and differential performance by interface language before any score recalibration.
