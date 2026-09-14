# Phraseman SOC 2 readiness hub

This is the single navigation point for internal pre-audit readiness. It is not a SOC 2 report, certification, customer promise or active audit engagement. No external auditor or CPA is currently engaged.

## Current status

**Stage:** pre-audit readiness  
**Owner model:** one product owner operating the repository; named human assignments and independent review arrangements are still to be recorded.  
**Proposed first scope:** Security + Availability, pending a future owner/CPA scope decision.  
**Operating evidence:** 0 clean cycles. The repository currently proves design and planning work, not a Type II observation period.

Latest machine check:

\`controls=17 criteria=36 mapped_criteria=13 planned_criteria=11 gap_criteria=9 pending_cpa_criteria=3 operating_sources=0 operating_cycles=0 status=Draft\`

## The rule for “one place”

This hub is the index. It must not duplicate policies or evidence. Each linked canonical document has one owner and one source of truth; changes update the relevant task packet and this status page when the readiness state changes.

### Canonical documents

| Area | Source of truth |
| --- | --- |
| System boundary and scope | [\`SOC2_SYSTEM_BOUNDARY.md\`](SOC2_SYSTEM_BOUNDARY.md) |
| Risks and treatment | [\`RISK_REGISTER.md\`](RISK_REGISTER.md) |
| Control population and criteria | [\`SOC2_CONTROL_MATRIX.json\`](SOC2_CONTROL_MATRIX.json) |
| Evidence rules and calendar | [\`CONTROL_EVIDENCE_GUIDE.md\`](CONTROL_EVIDENCE_GUIDE.md) |
| CPA handoff when needed | [\`SOC2_CPA_HANDOFF.md\`](SOC2_CPA_HANDOFF.md) |
| Data inventory | [\`PRIVACY_DATA_INVENTORY.json\`](PRIVACY_DATA_INVENTORY.json) |
| Dependency risk | [\`DEPENDENCY_RISK_REGISTER.json\`](DEPENDENCY_RISK_REGISTER.json) |
| Dependency reachability | [\`DEPENDENCY_REACHABILITY.json\`](DEPENDENCY_REACHABILITY.json) |
| Architecture | [\`../architecture/SYSTEM_CONTEXT.md\`](../architecture/SYSTEM_CONTEXT.md), [\`../architecture/SERVICE_CATALOG.json\`](../architecture/SERVICE_CATALOG.json) |
| Work packets | [\`../work/tasks/\`](../work/tasks/) |

## Readiness board

### Green — built and machine-checked

- system context, service catalog and critical-domain contracts;
- risk register and control-matrix schema/verifier;
- technical-debt register and task-governance hook;
- website security headers, production route review and accessibility contracts;
- canonical admin surface characterization and production smoke of the SOC 2 readiness workbench;
- bounded weekly server collector for admin-access and admin-log summaries, with immutable manifests and admin-only readback;
- dependency reachability inventory;
- draft privacy/data inventory and vendor/access governance documents.

### Amber — exists as a plan, but does not yet prove operation

- named control owners and independent reviewer;
- approved boundary, criteria and retention period;
- monthly access/vendor/privacy reviews;
- dependency remediation for open critical/high advisories;
- incident tabletop and backup/restore exercise;
- native VoiceOver/TalkBack evidence;
- consent-aware CWV endpoint and approved retention;
- two clean operating evidence cycles.
- repeatable live use of the admin-only readiness journal, including a reviewed sync/read-back cycle.
- first scheduled collector run and review of its blocked-source list; automated output is evidence input, not owner approval.

## Where future evidence goes

- **Sanitized manifests:** \`docs/security/evidence-manifests/\` (repository-relative JSON only; no secrets or raw user data).
- **Original evidence:** an access-controlled evidence store approved later; do not put credentials, database dumps, voice data or raw support messages in Git.
- **Task linkage:** every manifest links to a control ID, risk ID where relevant, task packet, source revision, checksum and review decision.

There is no operating evidence folder to pretend is complete today. The first manifest is created only after a real control execution and review.

## One-person monthly routine

The server collector runs weekly on Monday at 04:00 UTC and stores redacted, bounded manifests for the two currently approved server-side sources. It deliberately marks dependency, restore, incident, vendor, privacy and availability items as blocked until their source or human exercise is approved. It does not send notifications, approve controls or collect secrets/PII.

At the end of each month, run one small evidence cycle:

1. Review changes and releases: revision, approvals, selected gates and exceptions.
2. Review privileged access and account changes: population, reviewer and removals.
3. Review dependency/security findings: new findings, reachability, treatment and due dates.
4. Review incidents, alerts, restore/tabletop actions and open exceptions.
5. Update vendor/privacy decisions and technical debt.
6. Generate sanitized manifests, record checksums and have an independent reviewer arrangement confirmed.
7. Run the machine verifier and keep failures as visible exceptions.

## Next three actions

1. Choose and document the evidence repository and the solo-owner/independent-review arrangement.
2. Review the weekly collector output in the admin panel and resolve or accept its blocked exceptions.
3. Close the highest-risk operational gaps: critical dependencies, access review, restore test and incident tabletop.
4. Repeat the monthly routine until the matrix can be approved and two clean cycles exist.

Until then, external wording is: **“Phraseman maintains an internal Security + Availability pre-audit readiness program.”**
