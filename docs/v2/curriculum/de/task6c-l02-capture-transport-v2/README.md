# German Task 6C L02 capture transport v2

**Date:** 2026-10-12  
**Status:** `P-ONLY CONTRACT GREEN / PRODUCTION CAPTURE RED`  
**Scope:** transport and provenance for exactly four German L02 DWDS source
captures; no source capture has been performed by this version.

## Authority boundary

This protocol is a fail-closed foundation. A structurally valid capture still
returns only `HOLD_CAPTURE_ONLY` and always carries:

- `canonicalAdmission: FORBIDDEN`;
- `rowsPromoted: 0`;
- `task7Unlock: false`;
- `learnerFacing: false`;
- `releaseAuthorized: false`;
- no translations.

It does not admit lexical rows, materialize Task 7 packets, write learner
content, build a mockup, publish, or change the English contour. The existing
L02 v1 capture and facts remain byte-for-byte independent and retain their
original `HOLD_FACTS_ONLY` status. V2 does not relabel, rebind, or supersede
those bytes.

## Exact upstream and roster

The input contract is bound to the versioned German Task 5 successor:

| Field                  | Exact value                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| path                   | `modules/learning-v2/curriculum/de/chapter_blueprints_de_v2.json`  |
| byte SHA-256           | `18e2be42099785838fc7739ac0c13df2ad1283352881b15ea574fa03099a1b23` |
| canonical body SHA-256 | `3c6979ecccd37806f993a78c3403e455ef0c76079ab5d82d1d3d3b66334cfcf3` |

The closed roster is exactly:

| source plan                     | lemma    | chapter      | checkpoint       | canonical URL                       |
| ------------------------------- | -------- | ------------ | ---------------- | ----------------------------------- |
| `de_lex_plan_l02_c01_wohnen_v1` | `wohnen` | `de_l02_c01` | `de_l02_c01_s08` | `https://www.dwds.de/wb/wohnen`     |
| `de_lex_plan_l02_c01_kueche_v1` | `Küche`  | `de_l02_c01` | `de_l02_c01_s08` | `https://www.dwds.de/wb/K%C3%BCche` |
| `de_lex_plan_l02_c02_tasse_v1`  | `Tasse`  | `de_l02_c02` | `de_l02_c02_s16` | `https://www.dwds.de/wb/Tasse`      |
| `de_lex_plan_l02_c02_teller_v1` | `Teller` | `de_l02_c02` | `de_l02_c02_s16` | `https://www.dwds.de/wb/Teller`     |

No fifth row, caller-selected source, alternate path, or English target is
accepted.

## Byte semantics that v1 could not prove

Each response must preserve three distinct immutable outputs:

1. A normalized header transcript. Header names are lowercase, optional
   whitespace is trimmed, rows are sorted by `name + value`, and the transcript
   is saved as canonical JSON. The byte encoding is UTF-8, object keys are
   recursively sorted by JavaScript string order, arrays retain their declared
   order, and separators contain no optional whitespace. Exactly one LF follows
   the closing `}`; a BOM, CRLF, leading/trailing spaces, pretty printing, or a
   different object-key order is rejected even when it parses to the same JSON
   value. `content-encoding` is derived from this file; duplicate or
   comma-stacked codings are rejected as ambiguous.
2. `encodedEntityBody`: content-coded entity bytes after HTTP transfer framing
   has been removed but before gzip, Brotli, or deflate decoding. This is not
   described as raw TCP or raw wire bytes.
3. `decodedRepresentationBody`: the exact UTF-8 HTML representation obtained
   by the declared deterministic decoder. The loader decodes the preserved
   entity bytes again and requires byte equality with this file.

For `identity`, the two bodies must be byte-identical. For `gzip`, `br`, or
`deflate`, the loader uses the corresponding Node zlib decoder and rejects a
different decoded representation. The old v1 label
`RAW_AUTHORITATIVE_RESPONSE_BYTES` is invalid in v2.

## Network, runtime, and redirect binding

The signed input digest binds all of the following:

- method `GET`;
- exact canonical URL for every roster row;
- exact `accept`, `accept-encoding`, and `user-agent` request headers;
- manual redirect handling with a maximum of three hops;
- `node:https` with automatic content decoding disabled;
- this contract module's current bytes;
- the preparation script's current bytes;
- both exact Task 5 v2 hashes and the closed four-row roster.

The accepted final capture currently requires `200`, the exact canonical URL as
the final URL, and an empty redirect chain. Any method, header, URL, redirect,
runtime, script, module, roster, or upstream change produces a different input
or is rejected directly.

## Structural P-test is not production trust

The schema gate exercises a test-only Ed25519 keypair, trust-root-shaped object,
receipt and signature. This proves only that the proposed byte and provenance
schemas reject hostile mutations. The verifier is private to the structural
harness, cannot be supplied by a caller, and its result is always
`HOLD_CAPTURE_ONLY`. Arbitrary PEM keys, detached signatures, repo-local trust
roots and repo-local receipts have no production authority.

Production has one zero-argument entry point:

`loadGermanTask6cL02CaptureTransportDeV2()`.

It performs no receipt, key, manifest or evidence-root read. It always throws
`CAPTURE_EXTERNALLY_GOVERNED_ATTESTATION_UNAVAILABLE`. Caller paths and verifier
substitution are also rejected. Adding correctly shaped bytes anywhere in the
repository cannot alter this result.

Production acceptance remains unimplemented until all of these future
conditions exist and receive separate specification, security and adversarial
review:

1. The producer runs only on a GitHub-hosted runner for the exact repository
   `badloar-star/phraseman`. Any `self-hosted` runner, missing hosted-runner
   evidence, fork, local runner, reusable workflow owned by another repository,
   or long-lived signing key is denied.
2. The only eligible workflow identity is
   `.github/workflows/learning-v2-de-l02-capture-attestation.yml` at
   `refs/heads/master`, protected by a GitHub environment requiring owner
   approval. The repository now contains only a local fail-closed skeleton for
   that identity. Protected `master` policy and an environment with required
   owner reviewers are external preconditions. Merely naming the environment
   in YAML neither configures nor proves those controls, and GitHub resolves an
   environment before the job's steps run. No protected environment, branch
   policy or other remote repository setting is created, verified or
   authorized by this document.
3. The current zero-producer skeleton has only `contents: read`. A future
   producer would require a separate reviewed change granting exactly
   `contents: read`, `id-token: write`, `attestations: write`, and
   `artifact-metadata: write`; checking out the exact 40-character
   `github.sha`; and signing keylessly through GitHub Actions OIDC. Those write
   permissions are deliberately absent now. Pull-request and untrusted-ref
   execution cannot issue an admissible attestation.
4. The Sigstore bundle binds the exact GitHub repository, workflow path,
   workflow ref, source commit SHA, Task 5 v2 hashes, transport module hash,
   preparation script hash, closed roster, request policy, input digest,
   manifest digest and every captured output digest.
5. The certificate issuer is exactly
   `https://token.actions.githubusercontent.com`; the certificate identity is
   the exact workflow identity above. Fulcio chain validation and Rekor
   inclusion/integrated-time verification use the externally maintained
   Sigstore trust root, never a mutable key stored in this repository.
6. A separately reviewed production adapter verifies the Sigstore bundle and
   GitHub claims before exposing even HOLD capture evidence. Missing claims,
   offline-unverifiable transparency evidence, digest mismatch or unsupported
   bundle version fails closed.
7. Exact hashes and lengths for every header, encoded-entity and decoded-
   representation file pass the existing schema checks with no extra outputs.

The repository currently contains no v2 evidence root, operational protected
workflow, capture producer, attestation subject, Sigstore bundle, production
verifier adapter, key, signature or receipt. The local workflow file is a
non-producing skeleton with one job and no job-level skip condition. Its first
step explicitly denies a runtime unless the runner is GitHub-hosted and the
repository, event, protected `master` ref, exact workflow identity, workflow
SHA and 40-lowercase-hex source SHA match; denial exits nonzero with
`CAPTURE_WORKFLOW_ADMISSION_DENIED`. Checkout is pinned to that source SHA with
credentials disabled, `clean: true` and `fetch-depth: 1`, then the
checked-out HEAD must equal the same SHA. An admitted runtime still exits
nonzero with `CAPTURE_PRODUCER_AND_EXTERNAL_GOVERNANCE_NOT_READY`.
Environment approval can prevent all steps from starting and is not proven by
the YAML reference. The skeleton has no capture or `actions/attest` step and
therefore cannot attest or authorize capture. These facts are intentional. The
preparation script is non-networked and only prints the content-addressed
request or checks that the immutable root does not yet exist.

## Read-only remote-governance preflight

The repository also contains a fail-closed remote-governance preflight. It is
not an environment configurator and has no success result. With no caller
arguments it makes exactly six `gh api --method GET` queries, pinned to GitHub
API version `2026-03-10`, repository `badloar-star/phraseman`, branch `master`
and environment `learning-v2-de-l02-capture-attestation`. The branch-rules and
deployment-policy queries use complete CLI pagination. The process neither
writes response snapshots nor changes repository, branch, environment or
workflow settings.

The pure validator requires the exact public, non-fork, non-archived and
enabled repository identity; a protected `master`; classic branch protection
or a nonempty applicable branch-rules response; exactly one required-reviewer
rule naming the owner `User` with self-review prevention; exactly one required
`branch_policy` protection rule plus an optional wait timer; custom deployment
branch policies enabled instead of protected-branch mode; and exactly one
fully paginated `master` branch policy containing only its documented positive
`id`, nonempty `node_id` and exact `name`. Missing, malformed, incomplete or
different evidence returns a granular `REMOTE_GOVERNANCE_*` unavailable code.

Even when every documented prerequisite matches, the terminal result remains
nonzero `REMOTE_GOVERNANCE_ADMIN_BYPASS_UNVERIFIABLE`. An undocumented
`can_admins_bypass` response field, whether `true` or `false`, cannot turn that
result into success. The GitHub REST evidence available to this preflight does
not prove that an administrator cannot bypass the approval gate.

## Files and gates

| Purpose                            | Path                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------- |
| schema, loader, verifier interface | `modules/learning-v2/curriculum/de/task6c_l02_capture_transport_de_v2.ts` |
| non-network preparation protocol   | `scripts/prepare_learning_v2_de_task6c_l02_capture_v2.ts`                 |
| real production verification       | `scripts/verify_learning_v2_de_task6c_l02_capture_transport_v2.ts`        |
| structural and hostile gate        | `tests/learning_v2_de_task6c_l02_capture_transport_v2_gate.ts`            |
| fail-closed workflow skeleton      | `.github/workflows/learning-v2-de-l02-capture-attestation.yml`            |
| workflow static security gate      | `tests/learning_v2_de_task6c_l02_capture_attestation_workflow_gate.ts`    |
| remote-governance pure validator   | `modules/learning-v2/curriculum/de/task6c_l02_remote_governance_de_v1.ts` |
| read-only remote preflight         | `scripts/verify_learning_v2_de_task6c_l02_remote_governance_v1.ts`        |
| remote-governance hostile gate     | `tests/learning_v2_de_task6c_l02_remote_governance_v1_gate.ts`            |

Structural command:

```powershell
npx tsx tests/learning_v2_de_task6c_l02_capture_transport_v2_gate.ts
```

Expected current result: exit `0`, structural PASS. Its fixture uses a fresh
test-only Ed25519 keypair and real signature verification. Hostile cases cover
old v1 labelling, encoded/decoded divergence, ambiguous content coding,
mutated script identity, method/header/final URL/redirect/runtime drift,
timestamp reversal, byte tampering, extra files, caller input, recapture,
status/authority escalation, translations, learner exposure, English target,
trust-root escalation and invalid signature.

Real production command:

```powershell
npx tsx scripts/verify_learning_v2_de_task6c_l02_capture_transport_v2.ts
```

Expected current result: nonzero exit with
`CAPTURE_EXTERNALLY_GOVERNED_ATTESTATION_UNAVAILABLE`. Repo-local evidence,
keys or re-signed receipts are forbidden from changing this result.

Workflow static command:

```powershell
npx tsx tests/learning_v2_de_task6c_l02_capture_attestation_workflow_gate.ts
```

Expected current result: exit `0` for the exact local fail-closed bytes. This
proves neither GitHub environment policy nor branch protection, producer
execution, capture, attestation, Sigstore verification or release authority.

Preparation checks:

```powershell
npx tsx scripts/prepare_learning_v2_de_task6c_l02_capture_v2.ts --assert-new-root
npx tsx scripts/prepare_learning_v2_de_task6c_l02_capture_v2.ts --print-request
```

Neither command opens a network connection or writes evidence.

Read-only remote-governance checks:

```powershell
npx tsx tests/learning_v2_de_task6c_l02_remote_governance_v1_gate.ts
npx tsx scripts/verify_learning_v2_de_task6c_l02_remote_governance_v1.ts
```

The first command is an offline structural/hostile gate and must exit `0`.
The second command reads the six fixed GitHub API surfaces and must always exit
nonzero: `2` for forbidden caller arguments, otherwise `1` with a stable
`UNAVAILABLE` envelope. A nonzero result is evidence of the exact unmet or
unprovable condition only; it is not a workflow, environment, capture or
release authorization.

## Next admissible step

Independently review the local fail-closed workflow skeleton, then separately
design the externally governed producer, attestation subject and production
Sigstore verifier described above. This packet does not create a GitHub
environment, branch protection, remote setting, producer, subject, attestation
or capture. Until that separate work is authorized and verified, even a
perfectly formed local evidence root and a freshly re-signed Ed25519 receipt
remain structural test data only and cannot be loaded by production.
