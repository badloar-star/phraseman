# Phraseman SOC 2 system boundary

Baseline date: 2026-09-11  
Status: readiness draft; owner, legal counsel and the selected CPA firm have not approved this boundary.  
Canonical topology inputs: [service catalog](../architecture/SERVICE_CATALOG.json), [system context](../architecture/SYSTEM_CONTEXT.md), and [critical domain contracts](../architecture/domains/).

## Scope decision

The proposed first readiness scope is the Security and Availability Trust Services Categories for the Phraseman learning service. This is a working boundary for gap remediation, not an audit-period declaration and not a claim of SOC 2 compliance. Final categories, commitments, carve-in/carve-out treatment, period, and description criteria are **PENDING owner and CPA approval**. Confidentiality, Processing Integrity and Privacy are not silently excluded from engineering: their obligations remain in security/privacy risk analysis even if they are not selected for the first examination.

## Service commitment covered

The system provides authenticated language-learning experiences, local/cloud progress continuity, entitlement-aware features, voice/AI interactions, a public product website and test, and privileged operational administration. Numeric availability commitments, RTO/RPO and customer-facing support commitments are **PENDING**; this document must not be used to advertise guarantees.

## People in scope

Repository-established functional roles are in scope wherever they design, build, approve, operate or support the system:

- product owner and administrators with privileged command authority;
- product, mobile, web/admin, backend, identity, economy/payments, learning/content, assessment, voice/AI and release engineering;
- security, privacy, safety, compliance and finance approval roles;
- support and incident/recovery participants;
- contractors or vendor personnel with logical access, if any.

Named accountable people, employment/contractor population, joiner/mover/leaver authority, escalation order and on-call coverage are **BLOCKED pending an owner-approved personnel/access inventory**. Role names describe responsibility boundaries but do not prove staffing or operating effectiveness.

## Systems in scope

### Product-controlled components

- Expo/React Native mobile clients for iOS and Android, including local state, offline queues and update handling;
- the public `knowlywww` Firebase Hosting surface and English-test journey;
- the single live admin surface served from `admin/v2/legacy.html` by the `admin` Hosting target;
- Firebase Functions codebases `default`, `max`, `content` and `english-test` on Node.js 22;
- Firebase project `phraseman-ea0b3` control-plane configuration represented by version-controlled manifests;
- Firestore, Firebase Auth, Firebase Storage, Remote Config, managed secrets/configuration, scheduler/tasks and logs used by those codebases;
- source code, dependency locks, GitHub workflows, build/release configuration, evidence scripts, policies, tests and operational records used to change or operate the service;
- developer/admin endpoints and devices when they hold source, release credentials, production access or retained evidence.

The service catalog currently proves 13 manifest-discovered services/origins. It is a minimum topology, not an exhaustive vendor/data-flow inventory.

### Trust boundaries

1. Learner device ↔ public network ↔ Firebase/Google-managed APIs and product Functions.
2. Public browser ↔ Firebase Hosting ↔ English-test/product endpoints and consented analytics.
3. Authenticated admin browser ↔ live admin Hosting ↔ claim-protected callable Functions.
4. Privileged Functions ↔ Firestore/Auth/Storage/secrets/tasks/logging and external providers.
5. Source repository/CI/EAS operator ↔ signed build or named Firebase deployment target.
6. Product-controlled processing ↔ each subservice organization listed below.

## Data in scope

- account and authentication identifiers, provider links, session and recovery/deletion metadata;
- learner profile, locale, settings, progress, answers, content state and synchronization journals;
- subscriptions, entitlements, purchase/refund evidence, immutable economy events and administrative grants;
- voice/audio input, transcripts, prompts, AI responses, learning feedback, moderation/safety state, quotas and authorized memory;
- consent state, privacy choices, analytics events, device/request metadata and aggregated reporting;
- support reports, administrator commands, audit events, incident/recovery evidence and abuse/safety records;
- public site/content, assessment responses/results and content-production artifacts;
- source code, configuration, dependency metadata, build artifacts and secrets required to operate the service.

Data classification, field-level inventory, lawful basis/purpose, retention, deletion/export coverage and child-data decisions are **PENDING Task 2.3/vendor governance and privacy-lifecycle work**. Secrets are in scope as protected operational data but must never be copied into evidence documents.

## Processes in scope

- product/security architecture, risk assessment and technical-debt governance;
- identity lifecycle, access authorization, privileged administration and access review;
- secure development, code review, dependency management, CI, build, release, rollback and change evidence;
- content publication and configuration changes that affect the learner experience;
- entitlement/purchase/economy processing and reconciliation;
- learning progress sync, account recovery/deletion and privacy request handling;
- consent-gated telemetry, monitoring, alerting and audit-log review;
- voice/AI provider use, safety gates, quotas, retention and cost reconciliation;
- vulnerability intake/remediation, incident response, business continuity, backup/restore and post-incident learning;
- vendor due diligence, contract/evidence review, renewal and exit planning.

Current operation of access reviews, vendor reviews, evidence cadence, tabletop exercises and restore tests is **not proven** by this boundary.

## Locations

- end-user mobile devices and public/admin browsers may operate globally;
- Functions deployment configuration names `us-central1` for the inspected functions and Firebase configuration;
- Firebase Hosting is a managed edge service whose actual processing/support locations require provider evidence;
- Firestore/Auth/Storage/logging data locations and backup replicas are **PENDING read-only console/export verification**;
- GitHub, Expo/EAS and other provider processing locations are **PENDING vendor review**;
- workforce, contractor, support and administrator work locations are **PENDING owner inventory**.

No data-residency claim may be derived from the Functions region alone.

## Subservice organizations and external dependencies

The following are known or code/config-evidenced candidates for the vendor register. Inclusion here does not claim a signed DPA, current SOC report, region, retention term or approved risk treatment.

| Organization/service | Boundary function | Data or dependency | Review state |
|---|---|---|---|
| Google Cloud / Firebase | Hosting, Auth, Firestore, Storage, Functions, tasks/scheduler, logging and APIs | Product, account, operational and audit data | **PENDING vendor evidence and exact product/location inventory** |
| Expo / EAS | mobile builds, updates and release services | build artifacts, app metadata, device request metadata | **PENDING contract/access/evidence review** |
| Apple App Store / Google Play | distribution, identity/store transactions | account/store identifiers, purchase confirmations | **PENDING vendor and responsibility review** |
| RevenueCat | subscription lifecycle and entitlement evidence | app-user/store transaction identifiers | **PENDING DPA, retention, access and assurance review** |
| OpenAI | voice/text AI, moderation or TTS paths where explicitly configured | prompts, audio/transcripts or derived learning content | **PENDING feature-level data-flow and retention review** |
| PostHog / Firebase Analytics | optional product analytics | consented event and device/account pseudonymous data | **PENDING configuration, hosting region and retention review** |
| Resend/email delivery chain | administrator/support email delivery | recipient address and message content | **PENDING provider/subprocessor and retention review** |
| GitHub | source, CI and security/change evidence | source, workflow metadata, access/audit events | **PENDING access and assurance review** |
| unpkg / Google Fonts | browser assets | request metadata and public assets | **PENDING necessity/integrity/privacy review** |

Any additional processor, payment path, notification service, crash/observability tool or manual data transfer discovered later is automatically boundary-relevant until reviewed; omission is not an exclusion decision.

## Customer and user responsibilities

Users control their device security, provider account security, consent choices and truthful inputs. Administrators must use approved accounts, MFA when available, least privilege, documented reasons and the live admin surface. These complementary responsibilities do not transfer the service organization's obligation to enforce authorization, protect data, preserve entitlements or recover safely.

## Explicit exclusions

- personal user devices beyond application-controlled storage/processes;
- public marketing/social channels that do not process service data;
- local development helpers that cannot reach production and hold no production data or credentials;
- provider internal controls outside product control, subject to subservice treatment and assurance review.

Exclusions are provisional. Production data, credentials, release authority, customer commitments or a critical dependency bring a component back into scope regardless of label.

## Boundary governance

Changes to authentication, authorization, money/entitlements, personal or child data, voice/AI providers, data stores, schema, admin commands, deployment targets, regions, vendors, retention or customer commitments require boundary review in the same task packet. Review this document at least annually and before any audit period, acquisition, material incident or major architecture/vendor change. Approval record: **PENDING product owner + security/compliance + CPA scope review**.
