# German Task 5 v2 — L02/c01 Küche scene correction receipt

**Date:** 2026-10-12  
**Scope:** German Task 5 chapter blueprint only  
**Status:** `CANDIDATE MACHINE PASS / OWNER PENDING / INDEPENDENT REVIEWS REQUIRED`

## Authority boundary

This receipt records a versioned successor for one proven internal scene
inconsistency. It does not approve the German blueprint, admit lexical evidence,
unlock Task 7, authorize learner-facing authoring, or release content.

The existing v1 file remains immutable and continues to identify all evidence
that was captured against it:

| Identity               | Value                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| path                   | `modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json`  |
| schema                 | `learning-v2-german-chapter-blueprints.v1`                         |
| byte SHA-256           | `494abd91c59c88ed652b3b4cdaaeaa118bc53ef64beb57ff54f735433612eb29` |
| canonical body SHA-256 | `e70ef798e06dfa752e9faace47282300a4fd43f8acaf158b2f608a8225f8cf90` |

The successor candidate is:

| Identity               | Value                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| path                   | `modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json`  |
| schema                 | `learning-v2-german-chapter-blueprints.v2`                         |
| byte SHA-256           | `18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23` |
| canonical body SHA-256 | `3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3` |
| owner approval         | `PENDING`                                                          |

`ownerApproval: PENDING` is taken from
`modules/learning-v2/curriculum/de/owner_decisions_contract_de_v1.ts`. No test,
review, or this receipt can convert it to approval.

## Exact successor delta

The v2 gate requires the full v1 object graph and permits only the schema
version plus these three semantic corrections in `de_l02_c01`:

| Field                                      | v1                                          | v2                                                     |
| ------------------------------------------ | ------------------------------------------- | ------------------------------------------------------ |
| `checkpoint.newSituation.setting`          | `shared-hallway-name-labels`                | `shared-kitchen-after-arrival`                         |
| `checkpoint.newSituation.contextSignature` | `hallway-labels-person-number-action-match` | `shared-kitchen-housemates-person-number-action-match` |
| Küche `utilityProof.facetValue`            | `shared-hallway-name-labels`                | `shared-kitchen-after-arrival`                         |

The checkpoint preserves:

- `participants: two-new-housemates`;
- `goal: match-a-person-cue-to-a-present-action-form`.

Its semantic tuple therefore remains distinct from the chapter's primary
`shared-kitchen-after-arrival / new-housemate-and-neighbour /
notice-who-performs-a-bounded-daily-action` situation.

## Deterministic evidence

RED command:

```powershell
npx tsx tests/learning_v2_de_chapter_blueprints_v2_scene_gate.ts --candidate modules/learning-v2/curriculum/de/chapter_blueprints_de_v1.json
```

Observed result: exit `1`,
`Error: task5_v2_scene_setting_invalid`. This proves that the new contract
rejects the contradictory v1 hallway mapping as a v2 candidate.

GREEN commands:

```powershell
npx tsx tests/learning_v2_de_chapter_blueprints_v2_scene_gate.ts
npx tsx tests/learning_v2_de_chapter_blueprints_gate.ts --lesson de_l02
```

The version-aware gate verifies exact v1/v2 byte and canonical identities,
`32 / 224 / 1,792`, the four-field delta allowlist, distinct checkpoint tuple,
unchanged participants and goal, and `ownerApproval: PENDING`. Its hostile
fixtures reject an in-place v1 mutation, missing/extra/out-of-scope fields,
hallway regression, a duplicate semantic tuple, false owner approval, and an
English-contour value.

## Evidence supersession boundary

The existing L02 capture/facts v1 artifacts remain bound to Task 5 v1 and keep
their existing `HOLD_FACTS_ONLY` / non-admission status. They are not rewritten,
relabelled, rebound, or upgraded by this correction.

Any future L02 evidence usable with Task 5 v2 requires a new versioned transport
capture and facts layer bound to the v2 hashes. That future transport must
truthfully distinguish decoded representation bytes from encoded wire bytes and
must provide independently verifiable runner provenance. Until then:

- canonical admission is forbidden;
- Task 7 remains locked;
- learner-facing authoring and owner mockup generation remain locked;
- release and publication remain forbidden.

## Review state

Fresh native linguistic, specification-conformance, and adversarial reviews of
these exact v2 bytes are still required. This writer receipt is not one of those
independent verdicts.
