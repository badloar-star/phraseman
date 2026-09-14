# Access control policy (repository baseline)

Status: Draft — operational adoption and named owners are pending restricted evidence.  
Owner: Security/compliance owner to be assigned.  
Review cadence: quarterly, and after any material identity or privilege change.

## Scope and authority

This policy covers human operators, repository collaborators, Firebase/GitHub/Expo service identities and privileged admin commands. Authentication providers and cloud IAM remain authoritative; this document defines the evidence and review process, not a new permission system.

Least privilege is the default. A client UI, CODEOWNERS entry or local configuration never grants production access. Admin App Check stays disabled until the owner explicitly authorizes the documented staged enablement sequence.

## Lifecycle

- Joiner: record approved role, manager/owner, required systems, MFA evidence and start date before access is granted.
- Mover: compare old/new role, remove obsolete privileges first where safe, record approver and effective date.
- Leaver: revoke sessions/tokens and privileged access promptly, transfer owned artifacts, preserve required audit evidence and record completion.
- Service identity: document purpose, minimum scopes, secret storage, rotation owner, last-use review and emergency disable path.

## Authentication and privileged access

MFA is required for human privileged access where the provider supports it; adoption is unverified until a restricted access review proves it. Shared accounts are prohibited. Break-glass access is time-bound, separately approved, logged, reviewed after use and never used as a routine path.

The live admin surface is `admin/v2/legacy.html`; authorization is enforced by server-side admin claims and callable checks. Repository review routing does not replace Firebase authorization.

## Evidence

The restricted evidence store retains access-review exports, joiner/mover/leaver tickets, MFA attestations, service-account inventory, break-glass events, approver identity, review date, exceptions and remediation due dates. This repository contains templates and non-secret inventory only.

## Exceptions

Every exception has a reason, risk, compensating control, accountable role, approval, expiry and follow-up. Expired exceptions reopen the risk; they are never hidden by editing evidence dates.
