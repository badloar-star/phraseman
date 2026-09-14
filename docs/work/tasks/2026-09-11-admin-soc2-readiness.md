# Task Packet: Admin SOC 2 Readiness Workbench

## Scope

- Add a categorized `SOC 2 / Готовность` section to the single live admin source `admin/v2/legacy.html`.
- Show the internal pre-audit status, current control/evidence counts and the next operational gaps in plain language.
- Provide a bounded workbench: start a control, attach a short evidence note, complete it, export the local journal and synchronise the journal to an admin-only Firestore collection.
- Keep the workbench separate from product writes: it does not call product Functions, Remote Config or admin commands.
- Add contract tests for the UI boundary, persistence schema/rules and local array/object state compatibility.

## Non-goals

- No SOC 2 claim, CPA assertion, customer report or external audit engagement.
- No secrets, raw evidence, user data, credentials or production logs in the panel.
- The follow-on automatic collector is intentionally separate: one daily scheduled job writes only bounded server-owned manifests/projections; it never writes the manual journal or approves a control.
- No App Check change, auth change, admin command change or admin deployment in this task.

## UX and safety

- The panel is placed in the existing compliance/navigation surface and uses the current admin visual language.
- Status is communicated with text and labels, not color alone.
- Controls are explicit buttons and short text fields; there are no hidden product actions.
- Local storage is a fallback. Sync is explicit, admin-only and schema/rules constrained; the panel is still not an official SOC 2 evidence package.

## Technical debt

- The static counts must be updated when the verified matrix changes; stale numbers are an evidence-quality risk.
- Evidence notes are capped and sanitized to a short operator note; original evidence still belongs in an access-controlled evidence store.
- The static matrix counts must be reviewed when the canonical matrix changes; stale numbers remain an evidence-quality risk.
- Automated manifests are redacted and bounded; blocked-source reasons are explicit so missing integrations cannot look like passing evidence.

## Verification

- `node --test tests/admin_session_shell_contract.test.mjs tests/admin_soc2_readiness_contract.test.mjs tests/admin_soc2_readiness_persistence_contract.test.mjs`
- `git diff --check`

## Rollback

Remove only the `SOC 2 / Готовность` navigation item, its bounded panel/runtime, the dedicated rules block and these contract tests. Existing journal documents remain recoverable and must be retained or explicitly deleted by the owner.

## Status

Implemented, deployed to the admin Hosting target, Firestore rules and the daily collector deployed, and live browser-tested through start → evidence → complete → sync. This remains internal pre-audit readiness, not an official SOC 2 report.
