# Control evidence guide

Status: **Draft / internal readiness only**  
Scope: Security and Availability only  
Matrix: [SOC2_CONTROL_MATRIX.json](SOC2_CONTROL_MATRIX.json)  
Boundary: [SOC2_SYSTEM_BOUNDARY.md](SOC2_SYSTEM_BOUNDARY.md)  
Risk intake: [RISK_REGISTER.md](RISK_REGISTER.md)

This guide defines how Phraseman records control evidence without turning source code, a passing local test or an aspirational procedure into a claim of operating effectiveness. It references Trust Services Criteria identifiers only; it does not reproduce the criteria text and is not a substitute for CPA scoping advice.

## Evidence classes

`planning` evidence records a proposed owner, procedure, treatment or future control. `gap` evidence records a known absence or incomplete capability. Neither class proves that a control is designed or operating; risk-register statements are always `planning` or `gap`, never `design`.

`design` evidence shows that a control is specified or implemented: approved policy text, architecture contracts, test source, workflow definitions, guards and configuration. It can support a design review, but it does not prove the control ran successfully during an observation period.

`operating` evidence is a dated result from an actual control execution: a CI run tied to a revision, an access review with reviewer and exceptions, a vulnerability triage, an incident exercise, or a restore result. Its `path` must reference a machine-validated JSON manifest, not a policy, test source, workflow, Markdown note or generic export. The manifest must match the matrix `evidenceId`, `controlId` and `cycleId` and record the population/scope, performer or system, execution result, exceptions and disposition, source revision, SHA-256 checksum, start time and completion time. A source file describing a test is not operating evidence from that test.

As of 2026-09-11 the matrix contains 8 design sources, 3 planning sources, 7 gap sources, no operating sources and an empty `operatingCycles` array. The repository dry-run is therefore **not** a clean operating cycle, and this program does not claim two clean cycles or SOC 2 readiness.

## Criterion and population completeness

The matrix inventories all 33 Security common-criteria references from CC1.1 through CC9.2 in the selected reference set, plus Availability A1.1–A1.3. Each of the 36 references has an explicit `coverageStatus` and rationale. The current truthful inventory is 13 `Mapped`, 11 `Planned`, 9 `Gap` and 3 `PendingCPA`; only `Mapped` entries claim a currently aligned control relationship, while `Planned` entries identify unfinished controls and `Gap`/`PendingCPA` entries carry no control IDs. Nothing is marked not applicable. Any exclusion or criterion interpretation requires documented product-owner/CPA approval before the matrix can become `Approved`.

`requiredControlIds` is the proposed full control population while the matrix is `Draft`; it becomes an approved operating population only after all required criteria are genuinely `Mapped` and the matrix is formally approved. Planned or gap relationships cannot satisfy operating-population coverage. Every Task 2.1 risk record must name a control present in this population, and that control must link back to the same risk; every control-linked risk must also exist in the parsed register.

## Collection procedure

1. Confirm the control is inside the approved system boundary and its category remains Security or Availability.
2. Identify the full population for the cadence: all relevant changes, accounts, vendors, incidents, alerts or backup targets. Sampling must be documented and approved, not inferred by the collector.
3. Collect the original result into an access-controlled evidence repository. Do not copy secrets, tokens, personal data, raw voice content or unnecessary identifiers into the evidence index.
4. Record a repository-relative manifest/export path, unique evidence ID, collection date and maximum age. Operating evidence also receives one immutable `cycleId`; its `.json` manifest must carry the same evidence, control and cycle identifiers. Multiple files from one control remain fragments of one control result.
5. An independent reviewer reviews the complete required population and records a dated decision. A control owner cannot review a cycle that includes their own control or silently self-approve a critical/high exception.
6. Run the verifier. Failures remain failures; do not extend freshness or remove sources merely to obtain green output.
7. Link exceptions to the risk register or an approved risk-acceptance record and resolve within the control's `exceptionSlaDays`.

The current verifier only accepts repository-contained manifests or sanitized exports. Direct GitHub, Firebase, Google Cloud, store, RevenueCat or vendor API collection is intentionally absent. That prevents accidental production access and secret exposure during this readiness slice; secure automated evidence ingestion requires a separate approved architecture task.

## Calendar and freshness

| Cadence | Collection event | Minimum retained context |
|---|---|---|
| continuous | Export/review on the defined monitoring interval | monitor identity, interval, result, gap and alert disposition |
| per_change | Each in-scope change or deployment decision | revision, actor, approvals, selected gates, result and exception |
| daily / weekly | Close of each period | population, scan/run result, triage owner and overdue items |
| monthly | By the next monthly review | population, metrics, exceptions, owner review and risk updates |
| quarterly | One independently reviewed package per quarter | full period population, samples, exceptions and remediation status |
| annual | One approved review or exercise per year | scope, participants, result, exceptions, approval and next due date |

Freshness is deterministic: `collectedOn + maxAgeDays` must not be earlier than the verifier's `--as-of` date. `maxAgeDays` is a collection control, not permission to postpone a more frequent cadence. The stricter obligation wins.

## When a cycle counts

A clean operating cycle is counted only when all of the following are true:

- the matrix and its required population are `Approved`;
- every required control has at least one `operating` evidence source with the same `cycleId`, backed by a structurally valid matching JSON manifest;
- each manifest records the actual population/scope, performer/system, pass result, resolved exception disposition, source revision/checksum and ordered timestamps;
- one independent named reviewer records `reviewedOn`, reviewer role, decision and decision detail;
- the decision is `clean`, not `exceptions_open` or `failed`;
- all evidence remains present and fresh.

Two fragments from one control never substitute for evidence from a second control. Partial, failed, exception-open, malformed, mismatched or generic-document evidence cannot complete a clean cycle. A `Draft` matrix cannot claim any operating cycle. Operating files with no cycle review are unreviewed evidence, not a cycle.

## Retention and access

The draft matrix uses 18 months of retention for each listed control so a future Type II window can preserve surrounding evidence. This is a planning baseline, not a legal decision. The product owner, privacy/legal reviewer and CPA must approve the final period before an observation window.

Evidence access follows least privilege. Store secrets in their managed systems, not in evidence. Prefer immutable references, checksums or sanitized exports; preserve original timestamps and the link to the source revision/run. Deletion or redaction follows the applicable privacy and legal-retention decision and must leave an auditable reason.

## Exceptions

An exception records the control ID, affected population/period, discovery time, impact, containment, accountable owner, due date and closure evidence. The matrix SLA is the maximum triage/remediation window for this readiness program; a security incident, entitlement risk, unauthorized access, data-loss condition or legal/privacy deadline may require immediate escalation.

Expired evidence and missed cycles are exceptions. They are not repaired by changing `collectedOn`, `maxAgeDays`, cadence or cycle metadata. A cycle counts only when every required control in its approved population is independently reviewed with a clean decision.

## Approval blockers

- Product owner and CPA have not approved the final boundary or criterion mapping; 23 criteria remain `Planned`, `Gap` or `PendingCPA`.
- Named-human control owners and independent reviewers are not assigned; role ownership remains `human_pending`.
- Vendor assurance, access reviews, incident exercises, approved RTO/RPO and restore evidence remain incomplete.
- No operating evidence cycle is recorded, so two clean cycles are not available.
- Confidentiality, Processing Integrity and Privacy are intentionally excluded until an explicit scope decision.

Until these blockers close, external wording must describe this as an internal Security + Availability readiness program, never as “SOC 2 compliant”, “SOC 2 certified”, “SOC 2 ready” or equivalent.

## Verification

Run the read-only repository check from the repository root:

```text
node scripts/verify_control_evidence.mjs --matrix docs/security/SOC2_CONTROL_MATRIX.json --risk-register docs/security/RISK_REGISTER.md --repo-root . --as-of 2026-09-11 --dry-run
```

`control_evidence_ok` means only that the matrix schema, bidirectional risk links, criterion coverage declarations and current repository evidence paths/manifests pass the configured structural, existence and freshness rules. It does not assess semantic criterion alignment, whether a control is suitably designed, whether its population is substantively complete, or whether an auditor will accept the evidence.
