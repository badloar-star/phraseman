# Task packet: SOC 2 system boundary and risk register

Governance-ID: MANUAL-2026-09-11-SOC2-BOUNDARY-RISK
Status: Blocked — local draft artifacts are complete and verified; formal boundary approval and named-human assignments remain PENDING product-owner/CPA decisions
Owner: Codex critical-security task under product-owner instruction
Related epic/enabler: E2 / E7 / EN-7.1 / Task 2.1

## Outcome

Publish a reviewable SOC 2 system boundary and a machine-verified risk register that includes every P1/P2 finding from the 2026-09-11 audit. Unknown human ownership or approval remains visibly blocked or pending instead of being inferred.

## Scope

In scope: `docs/security/SOC2_SYSTEM_BOUNDARY.md`, `docs/security/RISK_REGISTER.md`, `docs/security/RISK_ACCEPTANCE_TEMPLATE.md`, a zero-dependency risk-register verifier and its fixture tests, plus the Task 2.1 status line in the Platform Trust Program plan.

Out of scope: production or cloud access; changing IAM, dependencies, application behavior, Firebase configuration, secrets, controls, releases, audit claims, or accepting any risk on the owner's behalf.

## Architecture

The system boundary is a documentation layer over the existing service catalog and domain contracts. The risk register is the canonical planning record for audit findings and links risks to planned control identifiers without claiming those controls operate. Validation is fail-closed for malformed records, ownerless high risks, and expired critical acceptances.

## Security and privacy

This task handles security/compliance metadata only. It must not include credentials, production records, personal data, access inventories, or unverified vendor assurances. Named roles may be used only where the repository already establishes them; unresolved accountable humans remain `BLOCKED` or `PENDING`.

## Technical debt

Pay now: missing SOC 2 boundary, missing unified P1/P2 register, and missing deterministic register validation. Contain: link control IDs as planned controls and keep effectiveness unclaimed until Task 2.2 produces the control matrix and evidence cycles. Accept temporarily: audit scope categories, named accountable people, RTO/RPO, locations, subservice treatment, and actual risk acceptances remain pending owner/legal/CPA decisions; exit condition is explicit approval recorded in the applicable governance artifact.

## Verification

Completed with TDD under the repository semaphore. Initial RED: `node --test scripts/verify_risk_register.test.mjs` failed 0/5 because `scripts/verify_risk_register.mjs` did not exist. Subsequent RED cycles proved the owner and acceptance gaps. The final quality-review RED passed 7/22 and failed 15 new/strengthened checks covering approved High/Medium expiry, punctuated owner placeholders, field enums, ID/priority consistency and strict CLI parsing. Final GREEN passed 22/22. The real register passed `node scripts/verify_risk_register.mjs --as-of 2026-09-11` with `risk_register_ok risks=11 audit_findings=11`. These results verify the local drafts only; formal boundary approval remains blocked as stated above.

## Rollback

Remove only the new documentation/verifier/test files and revert the single Task 2.1 plan status line. No runtime, user data, cloud resource, entitlement, or deployment state changes.
