# Task packet: Dependency advisory triage and Functions mail-chain slice

Governance-ID: MANUAL-2026-09-11-DEPENDENCY-RISK  
Status: Complete locally / open remediation backlog  
Owner: Codex session requested by product owner  
Related epic/enabler: E7 / EN-7.3

## Outcome

Capture reproducible root and Functions production dependency advisory counts, map critical/high findings to reachability and treatment, and make the smallest compatible Functions mail-parser/mailer update only when characterization tests and the advisory report support it.

## Scope

In scope: sanitized audit output, `docs/security/DEPENDENCY_RISK_REGISTER.md`, `scripts/verify_dependency_risk_register.mjs` and focused tests, plus compatible `functions/package.json`/`functions/package-lock.json` changes for the mail chain if required. Expo/native dependency upgrades are a separate future packet.

Out of scope: `npm audit fix --force`, broad root upgrades, native builds, deployment, registry credentials, production access, or suppressing advisories without reachability/treatment evidence.

## Architecture

The lockfile is the dependency authority; the audit report is a point-in-time signal. Mail parsing/sending behavior is protected by characterization tests before package changes. Runtime reachability, fixed version, owner, due date, exception and rollback are required for each critical/high item.

## Security and privacy

Audit logs retain counts, advisory IDs and dependency paths only; never registry tokens, environment values, user mail bodies or full npm output. Email fixtures contain synthetic data only.

## Technical debt

Pay now: no canonical dependency risk register or SLA verifier. Contain: isolate the Functions mail chain from Expo/native remediation. Accept temporarily: advisories requiring upstream/native major upgrades remain explicitly open with owner/due date; no force upgrade is allowed.

## Verification

Completed under the repository semaphore. Baseline: root `42 total / 17 high / 2 critical`; Functions before the mail slice `16 total / 4 high / 0 critical`. After the compatible Functions update (`mailparser 3.9.24`, `nodemailer 10.0.6`, `imapflow 1.7.8`), Functions reports `12 total / 0 high / 0 critical`. Characterization test `src/support_inbox_mail_chain.test.ts` passes 2/2; dependency register tests pass 3/3; verifier and package syntax checks pass. Root high/critical items remain explicitly open in the register; the Expo/native tree is not force-upgraded.

## Rollback

Restore the prior Functions package manifests and lockfile only with an explicit release packet and passing characterization tests. Remove new register/verifier files without touching production state.
