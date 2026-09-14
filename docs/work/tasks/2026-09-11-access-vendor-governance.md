# Task packet: Access and vendor governance

Governance-ID: MANUAL-2026-09-11-ACCESS-VENDOR-GOVERNANCE  
Status: Complete locally / blocked for operational adoption  
Owner: Codex session requested by product owner  
Related epic/enabler: E7 / EN-7.2, E7 / EN-7.4

## Outcome

Publish repository-safe access-control and vendor-governance policies, templates and a non-secret vendor register so joiner/mover/leaver, MFA, break-glass, quarterly review and subservice dependency evidence have a canonical place.

## Scope

In scope: `docs/security/ACCESS_CONTROL_POLICY.md`, `docs/security/ACCESS_REVIEW_LOG_TEMPLATE.md`, `docs/security/VENDOR_REGISTER.json`, `docs/security/VENDOR_REVIEW_TEMPLATE.md`, `.github/CODEOWNERS`, `SECURITY.md`, `.github/dependabot.yml`, and a focused syntax/inventory check. Inventory is limited to repository-declared providers and public configuration; it does not query Firebase, GitHub, Google Cloud, Expo or vendor consoles.

Out of scope: printing secrets, discovering named human accounts, changing IAM, enabling App Check, changing production access, claiming MFA adoption, approving DPAs/SOC reports, dependency upgrades, deploys or external notifications.

## Architecture

Access policy defines roles, lifecycle events, least privilege, MFA and break-glass evidence. The vendor register distinguishes discovered service, data class, criticality, evidence status and owner assignment. CODEOWNERS and Dependabot establish review/update routing only; they do not grant access or prove operation.

## Security and privacy

Never store tokens, service-account JSON, emails, personal records, vendor credentials or private URLs. Named-human assignments, MFA evidence, DPA/SOC reports and quarterly access exports remain in the approved restricted evidence repository, referenced by ID only.

## Technical debt

Pay now: absence of a canonical access/vendor evidence vocabulary. Contain: repository inventory is explicitly `discovered/unverified`, with no console claim. Accept temporarily: named owners, MFA proof, DPA/SOC evidence, review cadence execution and exit dependencies remain pending until an authorized operator supplies restricted evidence.

## Verification

Completed with TDD: RED failed because the verifier was absent; GREEN is 3/3 focused cases. `node scripts/verify_access_vendor_governance.test.mjs`, `node scripts/verify_access_vendor_governance.mjs --root .` and `node --check scripts/verify_access_vendor_governance.mjs` pass. The register contains 6 discovered vendors, all marked `Draft`/unverified with pending human/legal evidence. Formal adoption remains blocked until restricted access reviews, named owners and vendor/DPA/security evidence exist.

## Rollback

Remove the new governance documents/configuration files. No runtime, production, user or external state is changed by this packet.
