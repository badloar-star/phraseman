# Task packet: System context and service catalog

Governance-ID: MANUAL-2026-09-11-SERVICE-CATALOG
Status: Complete
Owner: Codex session requested by product owner
Related epic/enabler: E2 / EN-2.1

## Outcome

Publish a C4-lite system context and a machine-verifiable service catalog so an implementer or reviewer can identify Phraseman deployment surfaces, owners, data classes, criticality, recovery tiers, and trust boundaries without reading the whole repository.

## Scope

In scope: `.firebaserc`, `firebase.json`, `app.json`, and `eas.json` as canonical discovery manifests; new `docs/architecture/SYSTEM_CONTEXT.md`, `docs/architecture/SERVICE_CATALOG.json`, `scripts/verify_service_catalog.mjs`, and its focused Node tests.

Out of scope: product/runtime changes, IAM inspection, production data, vendor-console verification, changing deployment configuration, domain contracts from Task 1.2, and remediation of unknown ownership or recovery decisions.

## Architecture

The JSON catalog is the machine-readable source; the Markdown context explains relationships and trust boundaries. The verifier discovers Firebase Hosting targets, Functions codebases, and explicit HTTP(S) origins from the fixed canonical manifests, then requires catalog coverage and complete governance metadata. Tier 0/1 services cannot use `unknown` ownership.

## Security and privacy

Only repository manifests are read. The catalog records data classes and trust boundaries but no credentials, tokens, personal records, secret values, or live cloud configuration. Public Firebase identifiers are treated as identifiers, not secrets.

## Technical debt

Pay now: missing architecture inventory and machine-verifiable ownership fields. Contain: canonical-source coverage is deliberately bounded to four manifests; sources embedded elsewhere are deferred to Task 1.2 domain contracts and the vendor register. Any unresolved RTO/RPO stays explicit as `unapproved`, not invented.

## Verification

Completed with TDD: the focused suite first failed because the verifier was absent. After implementation, `node --test scripts/verify_service_catalog.test.mjs` passed 5/5, covering valid topology, missing Hosting, missing Functions, missing origins and unknown critical ownership. `node scripts/verify_service_catalog.mjs --root .` passed with `service_catalog_ok services=13 sources=4`.

## Rollback

Delete the four new architecture/verifier files. No product, deployment, data, or external state changes need rollback.
