# SOC 2 CPA handoff — Phraseman

Status: internal pre-audit readiness pack. No CPA engagement, customer request or external audit is active. This is not a SOC 2 report, certification or management assertion. Start at [`SOC2_READINESS_HUB.md`](SOC2_READINESS_HUB.md).

## What we will ask for later

Please scope a SOC 2 examination for Phraseman and confirm:

- Type I (control design and implementation at a point in time) or Type II (design plus operating effectiveness over an agreed period);
- Trust Services Categories in scope. The current engineering proposal is Security + Availability; the CPA must approve the final categories;
- system boundary, audit period, subservice treatment and complementary user-entity controls;
- evidence format, secure exchange location, sampling method and named CPA contacts;
- how independent review will be handled for a solo-owner operating model.

SOC 2 is an independent CPA examination of management's system description and controls relevant to the selected Trust Services Categories. It is not a penetration test and it is not a claim that every product defect is absent.

## System boundary to review

The proposed boundary is documented in [`SOC2_SYSTEM_BOUNDARY.md`](SOC2_SYSTEM_BOUNDARY.md). It covers:

- Expo/React Native mobile clients and local/offline state;
- public website and English-level test;
- the single live admin surface `admin/v2/legacy.html`;
- Firebase Hosting, Functions, Auth, Firestore, Storage, Remote Config, tasks and logs;
- GitHub, CI/EAS and release/deployment paths;
- relevant vendors and subservice organizations.

The boundary is a draft until the owner and CPA approve it. No provider region, DPA, retention period or customer commitment is asserted by this file.

## Files to give the CPA first

1. [`SOC2_SYSTEM_BOUNDARY.md`](SOC2_SYSTEM_BOUNDARY.md) — proposed scope, systems, data and trust boundaries.
2. [`RISK_REGISTER.md`](RISK_REGISTER.md) — current risks, treatment, due dates and explicit blockers.
3. [`SOC2_CONTROL_MATRIX.json`](SOC2_CONTROL_MATRIX.json) — draft control population and criterion mapping.
4. [`CONTROL_EVIDENCE_GUIDE.md`](CONTROL_EVIDENCE_GUIDE.md) — evidence classes, cadence and cycle rules.
5. [`DEPENDENCY_RISK_REGISTER.json`](DEPENDENCY_RISK_REGISTER.json) and [`DEPENDENCY_REACHABILITY.json`](DEPENDENCY_REACHABILITY.json) — dependency findings and reachability evidence.
6. [`PRIVACY_DATA_INVENTORY.json`](PRIVACY_DATA_INVENTORY.json) — draft data categories and unresolved privacy decisions.
7. [`../architecture/SYSTEM_CONTEXT.md`](../architecture/SYSTEM_CONTEXT.md), [`../architecture/SERVICE_CATALOG.json`](../architecture/SERVICE_CATALOG.json) and the domain contracts — architecture context.
8. Relevant task packets under [`../work/tasks/`](../work/tasks/) — implementation scope, verification and technical-debt treatment.

## Evidence that must be collected for the agreed period

The CPA will select samples. Prepare redacted, timestamped exports or read-only views for:

- joiner/mover/leaver and privileged-access reviews;
- admin custom-claim/access decisions and audit events;
- pull requests, approvals, CI gates, releases and rollback decisions;
- dependency scans, vulnerability triage and remediation exceptions;
- incident records, tabletop exercise and backup/restore test results;
- vendor/subservice inventory, contracts/assurance reports and review decisions;
- privacy/data inventory, retention/deletion handling and consent configuration;
- availability/monitoring results and approved SLO or recovery objectives;
- security exceptions, risk acceptance and closure evidence.

Each operating evidence item needs a population or sample scope, date, performer/system, result, exceptions/disposition, source revision/checksum and independent review. A passing local test or policy document alone is not operating evidence.

## Never send

- passwords, API keys, service-account JSON, recovery codes or private tokens;
- raw production database dumps;
- raw voice recordings, transcripts, support messages or unnecessary personal data;
- unrestricted administrator credentials;
- an unredacted customer export.

Use the CPA's secure portal, least-privilege read-only accounts and sanitized evidence manifests.

## Current truthful readiness

The repository has a draft boundary, risk register, control matrix, architecture inventory and verified website/admin evidence. The latest control dry-run reports:

`controls=17 criteria=36 mapped_criteria=13 planned_criteria=11 gap_criteria=9 pending_cpa_criteria=3 operating_sources=0 operating_cycles=0 status=Draft`

Therefore Phraseman is **not yet Type II-ready** and must not be described as SOC 2 compliant or certified. The main blockers are formal CPA scope approval, named control ownership, independent review, operating evidence cycles, vendor/privacy decisions, dependency remediation and recovery evidence.

## Questions to ask before signing

- What exact categories and commitments will appear in the report?
- What observation period and minimum evidence cadence do you require?
- Which controls can be tested from sanitized exports, and which require portal access?
- How will Firebase, Google, Expo/EAS, Apple, Google Play, RevenueCat, email and AI providers be treated as subservice organizations?
- What independence or compensating-review arrangement is acceptable for one owner?
- What are the rules for exceptions, qualified opinions and remediation before the report date?
- What report will customers receive, under what NDA, and who may rely on it?
