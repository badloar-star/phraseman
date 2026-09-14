# Task packet: Critical domain contracts

Governance-ID: MANUAL-2026-09-11-DOMAIN-CONTRACTS
Status: Complete
Owner: Codex session requested by product owner
Related epic/enabler: E2 / EN-2.2

## Outcome

Publish concise, machine-verifiable contracts for identity, learning, economy/entitlements, voice/AI, admin commands, telemetry/privacy and release so implementation tasks can locate authority, invariants, recovery behavior and owning tests before editing code.

## Scope

In scope: seven new Markdown contracts under `docs/architecture/domains/`, a zero-dependency verifier, focused verifier tests, and links to existing authoritative owner documents and source/test anchors.

Out of scope: changing any domain implementation, resolving owner decisions, modifying Firestore schema/rules, producing a full data inventory, approving RTO/RPO, or claiming runtime controls were tested by documentation verification.

## Architecture

Each domain document is a navigational contract, not a second source of truth. It must explicitly name the canonical source of truth, authority boundary, invariants, idempotency, offline behavior, privacy posture, recovery behavior and owning tests. Existing normative constitutions/start documents remain authoritative and are linked rather than duplicated.

## Security and privacy

The documents must make auth, money, personal data, voice and admin boundaries visible without including secrets or production records. Unknowns remain explicit. Security- or privacy-sensitive implementation still requires independent review; documentation alone cannot approve mutation.

## Technical debt

Pay now: the absence of critical-domain navigation and required-section validation. Contain: contracts point to current authoritative sources instead of copying large specifications, reducing drift. Record: `docs/architecture/decisions/ADR-0001-learning-v2-authority-drift.md` captures conflicting Learning V2 fingerprints/status text and the broken mandatory link without changing content authority. Accept temporarily: precise named operational owners and RTO/RPO remain role-based/unapproved until the SOC 2 foundation tasks assign people and measured objectives.

## Verification

Completed with TDD. Initial RED failed because the verifier did not exist. The first implementation run then exposed an end-of-file section parser defect; after correction, `node scripts/verify_domain_contracts.test.mjs` passed 4/4 and `node scripts/verify_domain_contracts.mjs` passed with `domain_contracts_ok domains=7 sections=9`. The mandatory Learning V2 blueprint gate separately passed with 32 lessons, 224 chapters, 1,792 packets, zero findings and machine-reported approved fingerprint `bb53181…1845c`.

## Rollback

Delete the seven new domain documents and verifier/test. No runtime, data, deployment, or user-facing state changes require rollback.
