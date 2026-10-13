# German Learning V2 — Task 6B3: `Aufzug` canonical materialization

## Objective

Make one bounded, reviewable decision about the already-preserved candidate
bytes for `Aufzug`. This packet can accept those exact bytes as the second
canonical lexical row, or reject them. It does not rewrite the candidate.

## Preconditions and source boundary

- Task 6B1 receipt: `TASK6B1_LEXICAL_REVIEW_RECEIPT_2026-10-08.md`.
- Task 6B2 receipt: `TASK6B2_SOURCE_ADJUDICATION_RECEIPT_2026-10-11.md`.
- B1 receipt SHA-256: `183d82f9f83d5d79ab7078767cb468004b54a6b7fac656022c0daab642bd9bd0`.
- B2 receipt SHA-256: `a87d60144ff8274e54f41a1a0cea76ec716d09dea4da75e94a922339f9a63746`.
- The source claim is limited to `der Aufzug`, plural `die Aufzüge`, from
  DWDS sense `Vorrichtung zum Hochziehen, Lift`.
- `lift in a building` is a curriculum interpretation, not a claimed verbatim
  dictionary definition.

## Candidate freeze to adjudicate

| Artifact                                                                 | SHA-256                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts`       | `10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c` |
| `modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json` | `3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29` |
| `tests/learning_v2_de_lexical_registry_gate.ts`                          | `3346867a3c40fecf6dcf11ef12c97f9de52a949a7db64870957ac08235c36f58` |

The candidate identity is fixed as:

- canonical lexical ID: `de_lex_l01_c02_aufzug_v1`;
- source plan: `de_lex_plan_l01_c02_aufzug_v1`;
- item evidence: `DE-LEX-ITEM-L01-C02-AUFZUG-SENSE-FORM-001`;
- shared policy evidence: `DE-REG-BASELINE-001`;
- limitation: `NO_PRODUCTION_POLICY_REGION_OR_PACKET_CONTACT_AUTHORITY`.

## RED/GREEN contract

`npx --no-install tsx tests/learning_v2_de_aufzug_canonical_admission_gate.ts --baseline b1`
must fail with `aufzug_canonical_materialization_missing`: this reconstructs
the B1 one-row baseline in memory and verifies that it contains no `Aufzug`
materialization.

The default invocation must bind the exact three frozen hashes, both prior
receipts, the source/curriculum identity and the non-authority boundary. It
must print the bounded HOLD result. A hash change invalidates this packet and
requires a fresh RED, review, and freeze.

The admission gate validates the candidate only: it runs the real lexical
gate and prints `TASK6B3_CANDIDATE_VALIDATED`. The word `ACCEPTED` is reserved
for a later receipt after independent review; the gate itself cannot
self-authorize acceptance.

## Explicit non-authority

Task 6B3 does not promote a row, schedule or validate Task 7 contacts,
authorize learner-facing RU+UK content, alter the mockup, generate audio,
change runtime/release state, or modify English Learning V2. It leaves
`rowsPromoted=0` and `task7Contacts=UNVERIFIED`.
