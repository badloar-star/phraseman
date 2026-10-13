# B3A immutable acceptance attempts

`ATTEMPT_NAMESPACE_ONLY / ACCEPTANCE_HOLD`

This protocol is a create-only verifier design for a future B3A acceptance
attempt. It is separate from, and has no authority to modify, the historical
singleton B3A records. An attempt ID has the grammar
`b3a-<lowercase-alphanumeric-segments>` and its complete evidence lives only
under `docs/v2/curriculum/de/b3a-attempts/<attempt-id>/`.

## Required immutable files

Each attempt directory must be created before review and must contain these
canonical JSON files. No file in an attempt directory is an update target:
corrections require a different attempt ID and a new directory.

| File | Required binding |
| --- | --- |
| `snapshot.json` | `attemptId`, sorted per-path SHA-256 working-tree hashes, exact Git-index metadata (`<mode> <blob> <stage>` or `UNTRACKED`), and `snapshotRootSha256 = sha256(JSON.stringify(entries))`. |
| `guardian.json` | Canonical JSON with ordered keys `attemptId`, `closure`, `snapshotRootSha256`, `verdict`; it is a distinct PASS artifact named and SHA-256-bound by P. |
| `P.json` | Stage `P`, the snapshot root, guardian path and SHA-256, frozen candidate tuple, full closure map, and only pre-acceptance terminal HOLD states. |
| `review.spec.json` | A PASS receipt from `orbit-spec-reviewer`, binding attempt ID, P SHA-256 and snapshot root. |
| `review.adversarial.json` | A PASS receipt from `orbit-red-team`, binding attempt ID, P SHA-256 and snapshot root. |
| `F.json` | Stage `F`, P SHA-256, snapshot root, unchanged candidate tuple/closure, and both review paths and SHA-256 values. |

The snapshot has one entry for every closure path and no other path. It is
German-target-only: `docs/v2/curriculum/de/**`,
`modules/learning-v2/curriculum/de/**`, and `tests/learning_v2_de_**` are the
only permitted closure families. English is rejected from attempt inputs before
the validator reads it; it is never hashed, baselined, staged, cleaned, edited
or attributed by B3A. The verifier recomputes every recorded content hash and
Git-index metadata; any drift fails closed. Its hostile self-test adds an
English path to an otherwise valid snapshot and requires deterministic
rejection.

Every recorded path is first normalized with repository-root containment before
the validator invokes Git or reads the filesystem. Backslashes, absolute paths,
`.` aliases and any traversal that fails exact normalized round-trip containment
are rejected. Attempt receipt paths are never valid snapshot entries.

## Candidate and closure

`P.json` and `F.json` must contain this exact candidate tuple, both directly
and as members of the closure map:

```text
modules/learning-v2/curriculum/de/lexical_item_evidence_de_v1.ts
  10c80c5f418b9e3f804f243b5ec8e8f5f03243023f938187b1a45a4b56edf74c
modules/learning-v2/curriculum/de/registries/lexical_senses_de_v1.json
  3290e4f77449963f3ae836f609c7ca4a988ae165a2a3dc2daef51f2d8ca83d29
tests/learning_v2_de_lexical_registry_gate.ts
  3346867a3c40fecf6dcf11ef12c97f9de52a949a7db64870957ac08235c36f58
```

P's closure has exactly these authoritative paths (with their exact current
SHA-256 values), rather than an arbitrary superset: Stage 0, German owner
decisions, B1 receipt, B2 source adjudication and quarantine, B3 packet as
history, B4 packet/authority/final method advisor/guardian/validation, the B3A
authority record, target-scoped authority amendment, immutable-attempt
authority, B3A method-advisor receipts R3/R4/R5, this immutable protocol
document, this protocol gate source, and the three candidate paths above.
`F.json` must exactly reuse P's closure; it cannot add, remove or reinterpret a
path after either review.

## One-way validation

The only valid order is:

```text
snapshot.json → guardian.json → P.json → distinct reviews of P → F.json → immutable anchor → final gate
```

The two review receipts must name distinct fresh runtime task IDs. The
deterministic gate verifies names, roles, P hash and snapshot root; the live
orchestration record remains the separate evidence that the named tasks were
actually fresh and independent. P and the reviews cannot name F. F never
self-hashes and is not edited after final validation.

The immutable anchor is a full 40-character Git commit SHA supplied to the
final-gate invocation. It must be reachable from `HEAD`; its parent must not
contain the attempt directory; and the complete Git history across refs for
that directory must contain exactly that first-creation commit. The gate reads
`snapshot.json`, `guardian.json`, `P.json`, both review files and `F.json` from
that commit and requires bytewise identity with the attempt directory. If any
first-creation, reachability, unique-history or byte-identity proof is absent,
final validation fails closed and the design makes no create-only or
immutability claim.

All JSON objects are canonical pretty JSON with a trailing newline and exact
allowed keys. `snapshot.json` has only `algorithm`, `attemptId`, `entries`, and
`snapshotRootSha256`; an entry has only `gitIndex`, `path`, and `sha256`.
`P.json` has only `attemptId`, `candidateTuple`, `closure`, `guardian`,
`snapshot`, `stage`, and `status`. A review has only `attemptId`,
`preManifestSha256`, `reviewerRole`, `reviewerTask`, `snapshotRootSha256`, and
`verdict`; F has only `attemptId`, `candidateTuple`, `closure`,
`preManifestSha256`, `reviews`, `snapshotRootSha256`, `stage`, and `status`.
Unknown keys, release claims, F references from P or a review, and review paths
other than `review.spec.json` and `review.adversarial.json` are rejected.

Run only the isolated gate:

```powershell
npx tsx tests/learning_v2_de_aufzug_b3a_immutable_attempt_gate.ts --pre <attempt-id>
npx tsx tests/learning_v2_de_aufzug_b3a_immutable_attempt_gate.ts --final <attempt-id> <immutable-anchor-commit>
```

There is intentionally no attempt directory in this change. Its absence means
no new authority has been asserted.

## Terminal states

P retains only `candidateAcceptance=HOLD` and `b3aAcceptance=PENDING`. A valid F
can establish only `b3aAcceptance=ESTABLISHED` and
`candidateAcceptance=ACCEPTED_UNDER_B4_CURRENT_STATE`. In both stages,
`b3Acceptance=NOT_ESTABLISHED`, `rowsPromoted=0`,
`task7Contacts=UNVERIFIED`, learner authoring/mockup/audio/runtime/release are
terminal HOLD, English is EXCLUDED, and `historicalB1Replay` remains
`UNAVAILABLE_NOT_CLAIMED`. No additional status keys are permitted.
