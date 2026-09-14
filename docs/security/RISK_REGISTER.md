# Phraseman risk register

Baseline: all P1/P2 findings in [the 2026-09-11 full audit](../audits/2026-09-11-platform-full-audit.md).  
Status: readiness working register; no entry below records owner-approved risk acceptance.  
Scoring note: audit priority is preserved separately from security severity. Dates are treatment/review targets proposed by this program and require owner confirmation.

## AUDIT-P1-DEPENDENCIES
- Priority: P1
- Severity: High
- Status: Blocked
- Status detail: Reachability and compatible upgrade evidence are incomplete
- Asset: Root mobile/application dependency tree and Firebase Functions mail/runtime dependency tree
- Threat: A reachable critical/high third-party advisory is exploited, or a forced major upgrade creates an auth, payment, native or release regression
- Impact: Confidentiality, integrity or availability loss in shipped clients/functions; emergency upgrade or service interruption
- Likelihood: Possible
- Likelihood basis: Advisories are confirmed; exploitability is not
- Treatment: Mitigate
- Owner: Security and release engineering
- Owner status: Assigned
- Owner assignment detail: Accountable roles assigned; named human PENDING owner approval
- Due/review date: 2026-09-30
- Linked control: PLANNED-CC7.1-VULNERABILITY-MANAGEMENT
- Acceptance decision: NotAccepted
- Acceptance expiry: N/A
- Acceptance rationale: Closure requires reachability evidence or compatible remediation with passing gates
- Evidence: Audit baseline reports root 2 critical/17 high and Functions 4 high advisories; detailed triage belongs to Task 2.4

## AUDIT-P1-CONTROL-SYSTEM
- Priority: P1
- Severity: High
- Status: Open
- Status detail: Boundary/register created; control matrix and operating evidence remain absent
- Asset: Security and Availability governance, customer assurance and audit evidence
- Threat: Controls operate inconsistently or cannot be demonstrated because ownership, cadence, evidence, retention and exceptions are not governed together
- Impact: Undetected control failure, missed remediation, failed readiness/attestation and misleading customer claims
- Likelihood: Likely
- Likelihood basis: The unified system was absent at audit baseline
- Treatment: Mitigate
- Owner: Product owner and compliance/security
- Owner status: Assigned
- Owner assignment detail: Accountable roles assigned; named control owners PENDING
- Due/review date: 2026-09-25
- Linked control: PLANNED-CC1.2-GRC-CONTROL-SYSTEM
- Acceptance decision: NotAccepted
- Acceptance expiry: N/A
- Acceptance rationale: Task 2.2 must create the matrix and complete evidence dry-runs
- Evidence: Task 2.1 establishes only boundary and risk intake; it does not prove operating effectiveness

## AUDIT-P1-ADMIN-MONOLITH
- Priority: P1
- Severity: High
- Status: Open
- Status detail: Command inventory and safe extraction seams are not yet proven
- Asset: Privileged admin surface `admin/v2/legacy.html` and its mutation workflows
- Threat: A local change in the multi-million-character live file causes authorization, XSS, destructive-command or operational regression with a large review blast radius
- Impact: Unauthorized or incorrect user/account/entitlement changes, admin outage, weak review evidence
- Likelihood: Possible
- Likelihood basis: Complexity is confirmed; exploit or incident is not asserted
- Treatment: Mitigate
- Owner: Admin engineering and security
- Owner status: Assigned
- Owner assignment detail: Accountable roles assigned; extraction approver PENDING
- Due/review date: 2026-10-15
- Linked control: PLANNED-CC8.1-ADMIN-CHANGE-CONTROL
- Acceptance decision: NotAccepted
- Acceptance expiry: N/A
- Acceptance rationale: Preserve the one live surface and use characterized strangler slices
- Evidence: Audit measured approximately 51,516 lines and 3.2 million characters in the live admin file

## AUDIT-P1-RELEASE-CONTRACT
- Priority: P1
- Severity: High
- Status: Open
- Status detail: Mandatory checks are not yet selected consistently by change class
- Asset: CI pipelines, release artifacts and production Firebase/mobile surfaces
- Threat: A change reaches a release path after an incomplete or non-comparable test set, or shared-state tests conceal flaky/ordering defects
- Impact: Production regression, extended recovery, weak approval/evidence chain
- Likelihood: Possible
- Likelihood basis: Fragmented workflow/gate evidence is confirmed
- Treatment: Mitigate
- Owner: Release engineering
- Owner status: Assigned
- Owner assignment detail: Accountable role assigned; named release authority PENDING
- Due/review date: 2026-10-15
- Linked control: PLANNED-CC8.1-RELEASE-GATE-MATRIX
- Acceptance decision: NotAccepted
- Acceptance expiry: N/A
- Acceptance rationale: Task 3.1 must introduce observable change-to-gate selection before blocking rollout
- Evidence: Existing CI has strong checks but no canonical universal/domain/security/deployment contract

## AUDIT-P1-RESPONSE-RECOVERY
- Priority: P1
- Severity: High
- Status: Blocked
- Status detail: Severity ownership, RTO/RPO and tested restore evidence require owner decisions
- Asset: Tier 0 service availability, user data, entitlements and incident evidence
- Threat: A security or availability incident is detected but not consistently commanded, communicated, contained or restored
- Impact: Prolonged outage, data/entitlement inconsistency, privacy/legal delay and loss of evidence
- Likelihood: Possible
- Likelihood basis: Alerts/guards exist but an operating response/recovery system is not proven
- Treatment: Mitigate
- Owner: Product owner and incident/recovery roles
- Owner status: Assigned
- Owner assignment detail: Accountable roles assigned; named commander/on-call roster PENDING
- Due/review date: 2026-09-30
- Linked control: PLANNED-A1.2-INCIDENT-AND-RECOVERY
- Acceptance decision: NotAccepted
- Acceptance expiry: N/A
- Acceptance rationale: Tasks 7.1/7.2 require tabletop and safe restore evidence
- Evidence: No canonical severity model, owner tree, approved RTO/RPO or restore record was found at audit baseline

## AUDIT-P2-WEBSITE-HEADERS
- Priority: P2
- Severity: Medium
- Status: Contained
- Status detail: Report-only policy is deployed on `knowlywww`; CSP enforcement and violation review remain open
- Asset: Public website browsers and content/session navigation
- Threat: Missing browser defense-in-depth headers increase impact of a future injection, content-type confusion, referrer leak or unnecessary browser capability
- Impact: Client-side compromise or privacy leakage if combined with another defect
- Likelihood: Possible
- Likelihood basis: Missing baseline is confirmed; exploit chain is not
- Treatment: Mitigate
- Owner: Web engineering
- Owner status: Assigned
- Owner assignment detail: Accountable role assigned; named human PENDING
- Due/review date: 2026-10-31
- Linked control: PLANNED-CC6.6-WEB-HEADER-RATCHET
- Acceptance decision: NotAccepted
- Acceptance expiry: N/A
- Acceptance rationale: Begin with report-only CSP and preserve required product flows
- Evidence: Post-deploy checks on `https://knowlyapps.com/` and `https://knowlyapps.web.app/` returned all five headers; see `docs/work/tasks/2026-09-11-website-security-headers.md`

## AUDIT-P2-DOM-SINKS
- Priority: P2
- Severity: Medium
- Status: Open
- Status detail: Source-to-sink reachability inventory incomplete
- Asset: Live admin DOM, public website DOM and OAuth callback handling
- Threat: A future or existing untrusted source reaches an HTML/string sink without correct context-specific encoding
- Impact: Cross-site scripting, admin-session abuse or content integrity loss
- Likelihood: Possible
- Likelihood basis: Sinks exist; an exploitable dataflow was not confirmed
- Treatment: Mitigate
- Owner: Admin/web engineering and security review
- Owner status: Assigned
- Owner assignment detail: Accountable roles assigned; named reviewer PENDING
- Due/review date: 2026-10-31
- Linked control: PLANNED-CC6.6-DOM-DATAFLOW
- Acceptance decision: NotAccepted
- Acceptance expiry: N/A
- Acceptance rationale: Inventory source→sink paths and ratchet text-only writes to safe APIs
- Evidence: Audit identified multiple `innerHTML` locations while also observing escaping on sampled dynamic paths

## AUDIT-P2-PERFORMANCE-BUDGET
- Priority: P2
- Severity: Medium
- Status: Open
- Status detail: No consent-aware field baseline or approved SLO
- Asset: Public website availability and conversion journeys
- Threat: Performance degrades without detection because CI has no budget and production has no representative RUM baseline
- Impact: Failed journeys, lower conversion, accessibility friction and unavailable evidence for service commitments
- Likelihood: Possible
- Treatment: Mitigate
- Owner: Growth/web engineering and product
- Owner status: Assigned
- Owner assignment detail: Accountable roles assigned; numeric SLO approver PENDING
- Due/review date: 2026-11-15
- Linked control: PLANNED-A1.1-WEB-PERFORMANCE-SLO
- Acceptance decision: NotAccepted
- Acceptance expiry: N/A
- Acceptance rationale: Collect privacy-safe mobile/desktop route baselines before setting alerts
- Evidence: Audit found static/lazy-loading strengths but no canonical Core Web Vitals SLO

## AUDIT-P2-REPO-GOVERNANCE
- Priority: P2
- Severity: Medium
- Status: Open
- Status detail: Draft CODEOWNERS, private disclosure guidance and Dependabot automation now exist; owner confirmation and enforcement evidence remain open
- Asset: Source repository, security intake and dependency maintenance
- Threat: Sensitive changes lack mandatory reviewers, vulnerability reporters lack a safe route, or dependency remediation is missed
- Impact: Unauthorized/unsafe change, delayed vulnerability response and weak audit evidence
- Likelihood: Possible
- Treatment: Mitigate
- Owner: Product owner and security/release engineering
- Owner status: Assigned
- Owner assignment detail: Accountable roles assigned; named CODEOWNERS PENDING
- Due/review date: 2026-10-15
- Linked control: PLANNED-CC1.1-REPOSITORY-GOVERNANCE
- Acceptance decision: NotAccepted
- Acceptance expiry: N/A
- Acceptance rationale: Task 2.3 must add approved ownership and disclosure/update policy
- Evidence: `.github/CODEOWNERS`, `SECURITY.md` and `.github/dependabot.yml` are present as draft governance artifacts; they do not yet prove named-human approval or active review operation

## AUDIT-P2-ARCHITECTURE-MAP
- Priority: P2
- Severity: Medium
- Status: Contained
- Status detail: C4-lite context/catalog/domain contracts exist; vendor/data-flow completeness remains pending
- Asset: Architecture knowledge, change scoping and trust-boundary review
- Threat: Engineers or reviewers change a critical flow using an incomplete map and miss a data consumer, authority boundary or recovery dependency
- Impact: Cross-contract regression, stale evidence or unowned service dependency
- Likelihood: Possible
- Treatment: Mitigate
- Owner: Architecture and domain engineering roles
- Owner status: Assigned
- Owner assignment detail: Accountable roles assigned; named architect PENDING
- Due/review date: 2026-10-31
- Linked control: PLANNED-CC2.3-ARCHITECTURE-INVENTORY
- Acceptance decision: NotAccepted
- Acceptance expiry: N/A
- Acceptance rationale: Maintain the new catalog/contracts and extend through vendor/data lifecycle work
- Evidence: Phase 1 addressed the baseline gap but the service catalog explicitly remains a minimum manifest-derived inventory

## AUDIT-P2-UX-JOURNEYS
- Priority: P2
- Severity: Medium
- Status: Open
- Status detail: Authenticated admin and physical-device accessibility journeys are not evidenced
- Asset: Learner/admin critical journeys, including users relying on assistive technology
- Threat: Keyboard, screen-reader, scaling, focus, reduced-motion, offline or recovery defects block a critical task without detection
- Impact: Exclusion, failed account/payment/learning/admin journeys and support burden
- Likelihood: Possible
- Likelihood basis: Public semantics are strong; untested journeys remain
- Treatment: Mitigate
- Owner: Product, mobile and admin/web engineering
- Owner status: Assigned
- Owner assignment detail: Accountable roles assigned; named device-test owner PENDING
- Due/review date: 2026-11-30
- Linked control: PLANNED-CC3.2-ACCESSIBLE-CRITICAL-JOURNEYS
- Acceptance decision: NotAccepted
- Acceptance expiry: N/A
- Acceptance rationale: Tasks 4.3 and 6.2 must retain web/native journey evidence
- Evidence: Audit covered public semantics and unauthenticated admin login only, not authenticated admin or native device matrices

## Register governance

- `Open`, `Blocked` and `Contained` do not mean accepted.
- A planned control ID is a roadmap link, not evidence that the control is designed or operating.
- Critical/High risks require an accountable owner role, dated treatment and escalation when overdue.
- Acceptance requires the separate template below; a register edit alone cannot approve it.
- Review after a material incident, vendor/architecture change, new critical/high finding, or at least monthly during readiness work.
