# Task 6C four-noun independent review attempt protocol

`GERMAN_ONLY / ALLOCATION_ONLY / HOLD`

This protocol prepares one prospective review attempt for the existing four-row
Task 5 allocation-only registry (`Briefkasten`, `Büro`, `Garten`,
`Hausmeister`). It does not admit or connect anything. It does not alter the
existing allocation loader, canonical registry, Task 7, packet materialization,
learner content, mockup, audio, runtime, release, or any English path.

The only current attempt is
`task6c-four-noun-20261012-01`. Its `P.json` was created before any fresh review
output or receipt. No runner receipt, raw review output, trust root, or `F.json`
is asserted by this protocol.

## Frozen P closure

`P.json` freezes exact working-tree bytes for only these six inputs:

| Input                                                                                       | SHA-256                                                            |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/v2/curriculum/de/task6c-full-registry-l01-v1/target-allocation.json`                  | `b6ddd2e2fb665fe6c295a624c7009791539473ee23e9141b89b30cbfd507e0f0` |
| `modules/learning-v2/curriculum/de/evidence/task6c_l01_six_noun_admission_v1/manifest.json` | `a3a44ab4d1bc79ccc0af6741070eeb36267382fab2f44bb3dfb912adcdb42b55` |
| `modules/learning-v2/curriculum/de/registries/task6_canonical_registry_de_v1.json`          | `95181fb58d7563fc1ae37f220ad13b2543ccde898dfe1e93922cecc4a082fd31` |
| `modules/learning-v2/curriculum/de/registries/task6c_task5_allocation_admission_de_v1.json` | `044bff82f93c06529595b0b1e41dd7ee61c81ee10bc4adebb084dcf096ec1ff3` |
| `modules/learning-v2/curriculum/de/task6c_task5_allocation_admission_de_v1.ts`              | `1e867019e3cfbd804e2ec4bd1486dcbec904a568eaf3d9d9d546f53ec343cbff` |
| `tests/learning_v2_de_task6c_task5_allocation_admission_gate.ts`                            | `be7ac31870fae2898fc9e2dd1e954512ed6a9b07dd538603f92092c05848ecd5` |

Entries are sorted by path and the closure root is
`sha256(JSON.stringify(entries))`:

`49f4c6681fd83d15f197a131a10df6b3b0039b4faf92ca3776abfa45e45110f0`

Any byte change in any of the six inputs invalidates P before receipts are read.
A later review cannot rescue drift by replacing a digest; drift requires a new
attempt ID and a new P created before new reviews.

## One-way attempt order

```text
P.json
  -> fresh raw native-German review + runner receipt
  -> fresh raw adversarial review + runner receipt
  -> F.json
  -> final gate (still HOLD)
```

The two review invocations must be runner-issued, read-only and executed in
fresh isolated workspaces. Their `runId` and `taskId` values must be pairwise
distinct. A model message, role label, copied transcript, hand-written JSON, or
`ORCHESTRATION_ATTESTED_TRANSCRIPT_SUMMARY` is not a runner receipt.

## Required runner receipt schema

Each receipt is canonical pretty JSON with a trailing newline and exactly these
top-level keys:

```text
schemaVersion
receiptKind
attemptId
reviewRole
runnerInvocation
bindings
rawOutput
verdict
status
signature
```

Required literal values:

```text
schemaVersion = learning-v2-runner-independent-review-receipt.v1
receiptKind = RUNNER_ISSUED_INDEPENDENT_REVIEW_RECEIPT
attemptId = task6c-four-noun-20261012-01
reviewRole = NATIVE_GERMAN_REVIEW | ADVERSARIAL_REVIEW
verdict = PASS
status = HOLD_ONLY
```

`runnerInvocation` contains exactly:

```text
runnerId: nonempty runner identity
runId: nonempty runner-issued run identity
taskId: nonempty runner-issued task identity
executionMode: READ_ONLY
workspaceIsolation: FRESH_ISOLATED_WORKSPACE
```

`bindings` contains exactly:

```text
preManifestPath: P.json
preManifestSha256: SHA-256 of the current P.json bytes
closureRootSha256: 49f4c6681fd83d15f197a131a10df6b3b0039b4faf92ca3776abfa45e45110f0
```

`rawOutput` contains exactly its role-specific relative path, byte length and
SHA-256. The required files are:

```text
NATIVE_GERMAN_REVIEW:
  review.native.raw
  review.native.runner-receipt.json

ADVERSARIAL_REVIEW:
  review.adversarial.raw
  review.adversarial.runner-receipt.json
```

The gate hashes the raw bytes itself; a digest without retrievable raw bytes is
rejected.

`signature` contains exactly:

```text
algorithm: ed25519
keyId: nonempty runner signing-key identity
signedPayloadSha256: SHA-256 of canonical unsigned receipt bytes
signatureBase64: Ed25519 signature over those canonical bytes
```

Canonical unsigned receipt bytes recursively sort object keys while preserving
array order and omit only the `signature` object. Signature verification uses a
separate fixed trust root:

`docs/v2/curriculum/de/task6c-four-noun-review-attempts/runner-trust-root.json`

That trust root must itself be canonical JSON with
`schemaVersion=learning-v2-runner-trust-root.v1`, `algorithm=ed25519`, and one or
more unique active key records containing `keyId`, `publicKeyPem`,
`publicKeySha256`, and `status=ACTIVE`. The gate verifies the PEM hash, resolves
the receipt key by ID, and performs real Ed25519 verification. This protocol
does not invent a production key, trust root, receipt, or signature. Until the
runner supplies verifiable material, the attempt remains RED/HOLD.

## Required F schema

`F.json` may be created only after both raw outputs and both signed receipts
exist. It contains exactly:

```text
schemaVersion: learning-v2-de-task6c-four-noun-review-attempt-final.v1
attemptId: task6c-four-noun-20261012-01
stage: F
preManifestSha256: current P.json SHA-256
closureRootSha256: frozen closure root
receipts.native: path, receipt SHA-256, raw path, raw SHA-256
receipts.adversarial: path, receipt SHA-256, raw path, raw SHA-256
status: terminal HOLD ceiling
```

The final status is still only
`attemptAcceptance=RUNNER_RECEIPTS_VERIFIED_HOLD`. It preserves
`canonicalAdmission=FORBIDDEN`, `rowsPromoted=0`, `task7Unlock=false`,
`packetMaterializationAuthority=false`, `learnerFacing=false`, and HOLD for
learner authoring, mockup, audio, runtime and release. It excludes English.
Even a fully valid F cannot admit a row or unlock Task 7.

## Commands and current expected results

Structural and hostile contract validation must be GREEN:

```powershell
npx tsx tests/learning_v2_de_task6c_four_noun_review_attempt_gate.ts
```

The real attempt gate must currently be RED with the first missing authority:

```powershell
npx tsx scripts/learning-v2-de-task6c-four-noun-review-attempt-gate.ts
# Error: RUNNER_RECEIPT_MISSING:NATIVE_GERMAN_REVIEW
```

This RED is the truthful state. It is not a failure to be bypassed, and the
structural test's GREEN is not review acceptance.
