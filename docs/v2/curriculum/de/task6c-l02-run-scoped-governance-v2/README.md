# German Task 6C L02 run-scoped remote governance v2 proposal

**Date:** 2026-10-12  
**Status:** `PROPOSAL_PENDING_OWNER_ACCEPTANCE`  
**Normative status:** `NON_NORMATIVE`  
**Execution status:** `INERT`

## Authority boundary

This document is a design proposal only. It is not an accepted contract, an
operational verifier, a workflow change, a GitHub configuration change, or an
instruction to execute a workflow. It performs no network request and
authorizes no remote mutation, capture, artifact upload, attestation,
admission, publication, or release.

The proposal freezes these non-authority values:

- `ownerAcceptanceRecorded: false`;
- `activationAuthorized: false`;
- `canonicalAdmission: FORBIDDEN`;
- `rowsPromoted: 0`;
- `task7Unlock: false`;
- `learnerFacing: false`;
- `releaseAuthorized: false`.

No result described here may be consumed by the production loader. This
proposal does not prove that administrator bypass is impossible. It must never
be cited as branch-protection, environment-approval, run-approval, artifact,
Sigstore, learner-session, owner-mockup, publication, or release evidence.

## Frozen current facts

The proposal begins from the following observed and already reviewed state:

1. The remote `master` branch is currently unprotected.
2. The exact environment
   `learning-v2-de-l02-capture-attestation` is currently absent.
3. Remote-governance v1 is terminal by design at
   `REMOTE_GOVERNANCE_ADMIN_BYPASS_UNVERIFIABLE`, even when its other
   synthetic prerequisites match.
4. The existing workflow
   `.github/workflows/learning-v2-de-l02-capture-attestation.yml` is an inert,
   fail-closed skeleton. Its only job is `fail-closed-contract`, and an
   admitted execution still exits with
   `CAPTURE_PRODUCER_AND_EXTERNAL_GOVERNANCE_NOT_READY`.
5. Capture producer v3 is offline-contract-only. No real v3 evidence root,
   archive, predicate, workflow run, artifact, attestation, receipt, lexical
   admission, Task 7 packet, learner session, or owner mockup exists.

This proposal does not modify, supersede, relabel, or activate remote
governance v1, capture transport v2, capture producer v3, the fail-closed
workflow, any production loader, or any English Learning V2 file.

## Proposed acceptance question

The proposed v2 question is intentionally narrower than “can an administrator
bypass a repository setting?” It is:

> Did one exact GitHub-hosted run of the exact reviewed workflow, at one exact
> protected `master` commit, receive one separately evidenced owner approval
> after a different non-owner actor initiated it, and did that same run produce
> the exact artifact and keyless attestation bound to the v3 capture contract?

A positive answer would govern only that exact `run_id`, `run_attempt`, source
SHA, workflow path/ref/SHA, job, environment deployment, artifact, subject
digest, predicate digest, and attestation. It would not establish a durable
repository-wide claim that admin bypass is impossible.

## Proposed immutable input envelope

Any future normative verifier would have zero caller-supplied repository,
branch, environment, workflow, actor, artifact, or endpoint values. Its only
candidate selector would be a positive decimal `run_id` plus the exact
`run_attempt` learned from the run response. Every other dynamic identifier
must be derived from a previously validated response in the same immutable
evidence bundle.

The bundle would preserve the exact response bytes, response status, complete
pagination marker, retrieval time, and SHA-256 for every observation. It would
bind all observations into one canonical manifest and reject missing pages,
duplicate objects, mutable “latest run” aliases, caller-selected URLs, and
responses collected after an authority decision was emitted.

The proposed fixed read-only observation roster is:

|   # | Method | Fixed GitHub REST path                                                                                                       |
| --: | :----: | ---------------------------------------------------------------------------------------------------------------------------- |
|   1 |  GET   | `/repos/badloar-star/phraseman`                                                                                              |
|   2 |  GET   | `/repos/badloar-star/phraseman/branches/master`                                                                              |
|   3 |  GET   | `/repos/badloar-star/phraseman/branches/master/protection`                                                                   |
|   4 |  GET   | `/repos/badloar-star/phraseman/rulesets?includes_parents=true&per_page=100`                                                  |
|   5 |  GET   | `/repos/badloar-star/phraseman/rulesets/{derived_ruleset_id}?includes_parents=true`                                          |
|   6 |  GET   | `/repos/badloar-star/phraseman/environments/learning-v2-de-l02-capture-attestation`                                          |
|   7 |  GET   | `/repos/badloar-star/phraseman/environments/learning-v2-de-l02-capture-attestation/deployment-branch-policies?per_page=100`  |
|   8 |  GET   | `/repos/badloar-star/phraseman/actions/workflows/learning-v2-de-l02-capture-attestation.yml`                                 |
|   9 |  GET   | `/repos/badloar-star/phraseman/contents/.github/workflows/learning-v2-de-l02-capture-attestation.yml?ref={derived_head_sha}` |
|  10 |  GET   | `/repos/badloar-star/phraseman/actions/runs/{run_id}`                                                                        |
|  11 |  GET   | `/repos/badloar-star/phraseman/actions/runs/{run_id}/jobs?filter=all&per_page=100`                                           |
|  12 |  GET   | `/repos/badloar-star/phraseman/actions/runs/{run_id}/approvals`                                                              |
|  13 |  GET   | `/repos/badloar-star/phraseman/actions/runs/{run_id}/artifacts?per_page=100`                                                 |
|  14 |  GET   | `/repos/badloar-star/phraseman/actions/artifacts/{derived_artifact_id}/zip`                                                  |
|  15 |  GET   | `/repos/badloar-star/phraseman/attestations/{derived_subject_digest}`                                                        |

All candidate observations are read-only GETs. This proposal neither performs
those observations nor authorizes any mutation method. The API version,
Accept header, pagination behavior, response-size limits, timeouts, and
canonical byte representation must be frozen by a later accepted contract.

## Proposed branch-governance predicate

Before a run can be considered, `master.protected` must be `true` and one of
the following two complete paths must validate. A mixture of partial facts from
both paths is rejected.

### Classic protection path

- the exact classic protection object is present for `master`;
- `enforce_admins.enabled` is exactly `true`;
- force pushes and deletions are disabled;
- required pull-request reviews and required status checks are present under a
  later owner-accepted exact policy;
- no response field is interpreted as proving administrator-bypass
  impossibility beyond the documented classic `enforce_admins` fact.

### Repository ruleset path

- every ruleset page is complete, and the selected positive ruleset ID is
  derived from that closed response;
- the detailed ruleset has `target: branch` and `enforcement: active`;
- its include condition matches exactly `refs/heads/master`, with no exclusion
  that can remove `master`;
- its `bypass_actors` list is empty;
- it forbids deletion and non-fast-forward updates and carries the later
  owner-accepted exact pull-request/status-check policy;
- parent and repository rulesets are evaluated together; no single matching
  rule may hide a conflicting or weakening applicable rule;
- these facts are run prerequisites, not proof that administrator bypass is
  universally impossible.

## Proposed environment predicate

The exact environment must be
`learning-v2-de-l02-capture-attestation` and must satisfy all of the following:

- exactly one `required_reviewer` protection rule;
- that rule has `prevent_self_review: true`;
- its reviewer list contains exactly one `User`, login `badloar-star`, with the
  expected immutable GitHub user ID frozen only after owner acceptance;
- exactly one `branch_policy` protection rule and no wait-timer or unknown
  protection rule;
- `deployment_branch_policy.protected_branches: false` and
  `deployment_branch_policy.custom_branch_policies: true`;
- one completely paginated deployment branch policy, exactly `master`, with a
  positive ID and nonempty node ID; no wildcard, tag, duplicate, or additional
  branch policy;
- the environment observation predates the reviewed run's approval and job
  start, and its digest is bound into the run-scoped evidence manifest.

Environment configuration alone never yields acceptance.

## Proposed exact workflow and hosted-job predicate

The candidate run must match all of the following:

- repository `badloar-star/phraseman`;
- event `workflow_dispatch`;
- head branch `master` and head repository equal to the canonical repository,
  never a fork;
- one lowercase 40-hex `head_sha`, equal to the reviewed workflow SHA and the
  source commit used by every produced descriptor;
- workflow path
  `.github/workflows/learning-v2-de-l02-capture-attestation.yml` at
  `refs/heads/master`;
- workflow bytes fetched from that exact commit and equal to a later
  owner-accepted SHA-256; current inert bytes are not the future producer
  contract;
- exactly one job for the run attempt, with job key and name
  `capture-and-attest-v3`, environment
  `learning-v2-de-l02-capture-attestation`, and successful conclusion;
- GitHub-hosted evidence from the job response must match the later calibrated
  stable fields for exact runner label `ubuntu-24.04` and the GitHub-managed
  runner group; `self-hosted`, any extra runner label, reusable foreign
  workflows, containers, service containers, missing runner evidence, and
  unverifiable runner-group semantics are rejected;
- run status `completed`, conclusion `success`, exact `run_attempt`, and no
  rerun, job, or artifact from another attempt may be merged into the bundle.

The current inert job `fail-closed-contract` is eligible only for the
sacrificial semantics experiment described below. It is never eligible for
capture or attestation acceptance.

## Proposed run-scoped human-approval predicate

For the exact candidate `run_id` and `run_attempt`, the intended contract is:

- the run initiator and `triggering_actor` are the same identified non-owner
  user and are not `badloar-star`;
- the approvals response contains exactly one applicable approval;
- that approval is `approved`, belongs to `User` login `badloar-star` with the
  frozen immutable user ID, and targets the exact environment deployment for
  this run attempt;
- approval time is after run creation and after the deployment entered its
  waiting state, but before the protected job starts;
- no self-approval, rejection, bypass, stale approval, approval from another
  attempt, team-only inference, or owner-triggered run can satisfy the
  predicate;
- the owner approval record, run, job, environment snapshot, workflow bytes,
  artifact, and attestation are hashed into one immutable closure.

### Unresolved GitHub approvals semantics

The endpoint
`/repos/badloar-star/phraseman/actions/runs/{run_id}/approvals` exists as the
candidate source, but this proposal does not assert that its response provides
all fields, history, attempt binding, timestamps, deployment identity, or
stable semantics required above. Documentation and synthetic fixtures are not
enough to settle that question.

Before any normative adoption, an owner-authorized sacrificial run of the
current inert workflow is mandatory. A non-owner must dispatch it; the exact
owner must approve the environment gate; the job must then reach its expected
fail-closed terminal error without capture, upload, OIDC token request, or
attestation. Read-only observations must establish which approval/run/job
fields are actually returned and whether they support the complete temporal
and attempt-scoped predicate. If they do not, v2 remains HOLD and the contract
must be redesigned. A successful sacrificial observation is evidence for API
semantics only; it is not governance acceptance or release authority.

## Proposed artifact and attestation predicate

Only after owner acceptance, workflow review, and approvals-semantics
calibration could a future producer run be evaluated. Its closure would require
all of the following:

1. Exactly one non-expired artifact belongs to the exact run and run attempt.
   Its name is exactly
   `learning-v2-de-task6c-l02-capture-v3-run-{run_id}-attempt-{run_attempt}-{head_sha}`;
   the placeholders are substituted only from the already validated run. Its
   size is within the later accepted bound, and its API digest equals the
   digest independently recomputed from the downloaded bytes.
2. The ZIP is read with strict size, entry-count, duplicate-name, traversal,
   symlink, device, compression-ratio, and decompressed-size limits. It contains
   exactly two regular files:
   `learning-v2-de-task6c-l02-capture-v3.tar` and
   `learning-v2-de-task6c-l02-capture-v3.predicate.json`. No directory entry or
   extra file is ignored. The GitHub attestation bundle is fetched from the
   fixed attestations endpoint and is not accepted from this artifact.
3. The TAR reconstructs exactly from the validated 13-file v3 evidence root;
   its name, media type, byte length, and SHA-256 equal the predicate subject.
   The predicate independently binds the v3 producer digest, frozen Task 5 v2
   hashes, exact workflow/source/run identity, manifest, twelve evidence
   descriptors, network/DNS/TLS policy, and every HOLD authority value.
4. The attestation query uses only the derived `sha256:{lowercase_hex}` subject
   digest. Exactly one admissible statement binds that subject and the exact v3
   predicate type; unrelated or duplicate attestations do not count.
5. Signature and certificate verification use the externally maintained
   Sigstore/Fulcio/Rekor trust material, certificate issuer
   `https://token.actions.githubusercontent.com`, exact repository, exact
   workflow path/ref/SHA, exact source SHA, GitHub-hosted runner claim, and
   transparency inclusion/integrated-time checks. No repository key, caller
   key, long-lived key, locally re-signed receipt, or model-authored PASS may
   satisfy verification.
6. Attestation time must be after the validated owner approval and artifact
   creation for the same run attempt. Every identity and digest must close over
   the same run-scoped manifest; cross-run or cross-attempt composition fails.
7. Even a cryptographically valid closure yields at most a separately defined
   `HOLD_CAPTURE_ONLY` result until a fresh production-loader contract,
   independent specification review, adversarial review, and explicit owner
   acceptance exist. It cannot admit lexical rows or unlock Task 7 by itself.

## Adoption gates

This proposal remains `PROPOSAL_PENDING_OWNER_ACCEPTANCE` unless every item
below occurs in order:

1. The owner explicitly accepts or revises the run-scoped acceptance model.
2. A separate task freezes the exact remote configuration, workflow bytes,
   user ID, job fields, artifact allowlist, API version, and response schemas.
3. The owner separately authorizes the remote branch/environment setup; this
   document cannot do so.
4. The owner separately authorizes the sacrificial inert run and its
   non-owner dispatch/owner approval sequence.
5. Recorded observations resolve approvals-endpoint semantics; ambiguity is a
   deterministic HOLD.
6. A new normative implementation begins with RED tests and receives fresh
   independent specification and adversarial review.
7. A separate explicit authorization is required before wiring or running any
   capture/attestation producer.

Until then there is no activation, acceptance, PASS claim, capture authority,
admission authority, Task 7 unlock, learner-facing session, mockup update,
publication, or release.

## Static proposal gate

`tests/learning_v2_de_task6c_l02_run_scoped_governance_v2_proposal_gate.ts`
checks this proposal offline. It freezes the document digest and vocabulary,
requires all fixed GET paths and non-authority values, rejects positive
admin-bypass claims, rejects executable command blocks, and proves that the
proposal directory contains Markdown only. The gate imports no process,
network, GitHub, workflow, or configuration client. A green static gate means
only that these inert proposal bytes match this bounded packet.
