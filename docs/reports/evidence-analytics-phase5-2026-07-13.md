# Evidence Analytics Phase 5 — Experiments, Releases, and Reliability

## Outcome

Phase 5 adds governed actual-exposure events, bounded operation failures, version/build adoption, and explicit unavailable states for unsupported native health metrics.

## Experiments

- The existing paywall `v3` split remains `legacy_unmeasured`; it produces no causal experiment exposure.
- A governed passport requires an experiment ID, definition version, assignment salt/allocation, control, audience, primary metric, guardrails, dates, minimum sample, maturity window, stop rule, config revision, and status.
- Assignment remains deterministic and the visible legacy fallback is unchanged.
- `pending_fallback` assignments are rejected from analyzable exposure.
- `experiment_exposure` is emitted only from the mounted A/B/C paywall using its existing impression ID, once per impression, after React commits the screen.
- The warehouse reports exposure/sample by definition, variant, control, surface, and config revision.
- It does not select a winner and reports server revenue by experiment as unavailable without a governed cross-source join.

## Release and reliability

- Version/build adoption is measured from consented product session starts.
- `product_operation_failure` contains only allowlisted feature, operation, failure code, retryability, version, build, and timestamps.
- The first real instrumented operation is store-offerings loading after its built-in retry is exhausted.
- Raw error message, stack, URL, UID, and fingerprint are not included.
- Crash-free users, crash-free sessions, ANR, and native cold start remain explicitly unavailable because no supported aggregate export is configured.
- Admin states that missing observed errors do not prove 100% stability.

## Verification

- Root focused regression: 11 suites, 49 tests passed.
- Functions product-analytics regression: 3 suites, 15 tests passed.
- Functions TypeScript build passed.
- Governance audit: 35 declared, 35 called, 35 warehoused, 35 measured.

## Verification limits

- BigQuery SQL was not live-dry-run because the local workspace has no configured production dataset/credentials.
- Crashlytics aggregate export is not configured.
- No experiment is automatically activated by this change; a valid governed passport and date window are required.

## Находки и предложения

- Server-confirmed revenue by experiment needs a separate privacy-reviewed join and must not use client purchase completion as money truth.
- Native crash-free and ANR should be imported from an official aggregate source before they become rollout guardrails.
- A release passport should accompany each future production rollout so version adoption can be interpreted against exact config/content changes.
