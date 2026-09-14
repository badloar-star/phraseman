# Release domain contract

## Owner

Release engineering owns orchestration; each domain owner approves its gates; the product owner authorizes production rollout and rollback decisions.

## Source of truth

Firebase surfaces and targets are declared in [firebase.json](../../../firebase.json), mobile release profiles in [eas.json](../../../eas.json), release checks in [release_precheck.mjs](../../../scripts/release_precheck.mjs), and deployment locking in [deploy_lock_guard.mjs](../../../scripts/deploy_lock_guard.mjs).

## Authority

Only version-controlled manifests, required green gates and an explicit authorized release action may change a production surface. A local build, document status or passing subset of tests is not deployment authorization.

## Invariants

Deploy the named target only; preserve the admin single-surface boundary; do not bypass lock/quality/secret gates; bind artifacts to source revision and configuration; keep rollback inputs available before rollout.

## Idempotency

Repeated prechecks are read-only and deterministic. Deployment automation must identify the same artifact/revision, avoid concurrent conflicting releases, and make already-applied state distinguishable from a new rollout.

## Offline behavior

No production release occurs offline. Previously installed mobile code and hosted assets follow their existing cache behavior; offline clients must not fabricate update success or incompatible schema availability.

## Security and privacy

Secrets stay in managed secret/config systems and outside artifacts/logs. Release permissions use least privilege, sensitive configuration changes require review, and evidence must identify actor, revision, target and outcome.

## Recovery

Rollback restores a known compatible artifact/configuration and is itself audited and gated. Data/schema changes need forward/rollback compatibility rather than code-only reversal. Approved per-service RTO/RPO are still missing.

## Owning tests

[release_reliability_contract.test.ts](../../../tests/release_reliability_contract.test.ts), [admin_hosting_deploy_guard.test.ts](../../../tests/admin_hosting_deploy_guard.test.ts), [learning_v2_release_rollout_v1.test.ts](../../../tests/learning_v2_release_rollout_v1.test.ts), and [source-quality.yml](../../../.github/workflows/source-quality.yml).
