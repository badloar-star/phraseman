# Support Diagnostic Bundle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a privacy-safe local diagnostic timeline that is attached only when a user explicitly submits a support report, so account, navigation, avatar, and aura failures can be reconstructed without continuous uploads.

**Architecture:** A strict client schema records allowlisted breadcrumbs in an account-scoped AsyncStorage ring. The support outbox freezes a sanitized snapshot, the callable sanitizes it independently before adding it to the existing `error_reports` document, and the live legacy admin card renders a collapsed timeline. No new collection, background uploader, raw logger export, or daily job.

**Tech Stack:** React Native, TypeScript, AsyncStorage, Firebase callable/Firestore, vanilla HTML/JavaScript admin, Jest/source-contract tests.

**Execution note:** Project rules forbid a new branch, worktree, delegated coding session, commit, deploy, or release without an explicit owner command. Execute inline in the current checkout and preserve unrelated dirty changes.

---

## Task 1: Executable privacy schema

**Files:**
- Create: `app/support_diagnostic_schema.ts`
- Create: `tests/support_diagnostic_schema.test.ts`

- [ ] Write failing tests for allowed events (`navigation`, `app_state`, `support_report`, `customization_purchase`, `customization_apply`, `account_delete`, `auth_transition`) and fields (`atMs`, `event`, `screen`, `result`, `reason`, `subject`, `durationMs`). Unknown keys, nested objects, emails, tokens, UIDs, free text, receipts, and stacks must be dropped. Bundles cap at 200 chronological events and 32 KiB.
- [ ] Implement pure types and sanitizers:

```ts
export interface SupportDiagnosticEvent {
  atMs: number;
  event: SupportDiagnosticEventName;
  screen?: string;
  result?: 'start' | 'success' | 'blocked' | 'error' | 'info';
  reason?: string;
  subject?: 'avatar' | 'aura' | 'account' | 'report' | 'app';
  durationMs?: number;
}
export interface SupportDiagnosticBundle { version: 1; capturedAtMs: number; events: SupportDiagnosticEvent[] }
export function sanitizeSupportDiagnosticEvent(value: unknown): SupportDiagnosticEvent | null;
export function sanitizeSupportDiagnosticBundle(value: unknown): SupportDiagnosticBundle | null;
```

- [ ] Run only the focused schema test RED, then GREEN.

## Task 2: Account-scoped local ring and kill switch

**Files:**
- Create: `app/support_diagnostics.ts`
- Create: `tests/support_diagnostics.test.ts`
- Modify: `app/remote_flags.ts`

- [ ] Add `support_diagnostics_enabled` to `RemoteBoolKey`, default `true`, and export `isSupportDiagnosticsEnabled()`.
- [ ] Write failing mocked-storage tests for a generation-scoped key, 24-hour TTL, 200-event/64-KiB local caps, serialized mutation locking, 32-KiB snapshots, corruption cleanup, disabled mode, and generation isolation.
- [ ] Implement:

```ts
export async function recordSupportDiagnostic(event: Omit<SupportDiagnosticEvent, 'atMs'> & { atMs?: number }): Promise<void>;
export async function captureSupportDiagnosticBundle(): Promise<SupportDiagnosticBundle | null>;
export async function clearSupportDiagnosticsForCurrentAccount(): Promise<void>;
```

Resolve `captureAccountGeneration()` per mutation/snapshot and re-check `isAccountGenerationCurrent()` before writes. Never accept arbitrary metadata. No timers, background uploads, or scans.
- [ ] Run only the ring and focused Remote Config tests.

## Task 3: High-signal breadcrumbs

**Files:**
- Modify: `app/app_activity.ts`
- Modify: `app/avatar_select.tsx`
- Modify: `app/auth_provider.ts`
- Create: `tests/support_diagnostic_integration_contract.test.ts`

- [ ] Write failing contracts for safe navigation/app-state mapping before the activity no-sink early return; avatar/aura purchase/apply boundaries; and account-deletion transitions. Diagnostic calls must never receive raw tags, balances, prices, item IDs, messages, stacks, auth UIDs, or email.
- [ ] Map only recognized activity actions to normalized screen/result fields; ignore arbitrary tags.
- [ ] Instrument customization start/success/blocked/error with only `subject: 'avatar' | 'aura'` and bounded reason codes (`account_changed`, `insufficient_currency`, `transaction_failed`, `selection_failed`).
- [ ] Instrument account deletion start, durable transition, success, and retained-quarantine failure without changing deletion behavior.
- [ ] Run the new contract plus touched account-delete/customization contracts.

## Task 4: Freeze diagnostics in the support outbox

**Files:**
- Modify: `app/error_report.ts`
- Modify: `app/support_report_outbox.ts`
- Modify: `app/support_report.tsx`
- Modify: `tests/support_report_contract.test.ts`
- Modify: `tests/support_report_outbox.test.ts`

- [ ] Extend `ErrorReportPayload` with optional `diagnostics?: SupportDiagnosticBundle`; pass only that sanitized object to `submitClientReport`.
- [ ] Write failing tests proving capture occurs before `PendingSupportReport` creation, the frozen bundle survives retry, account mismatch never re-captures another generation, and reporting succeeds without diagnostics.
- [ ] Capture once before enqueue and use the same frozen payload for persistence and direct fallback:

```ts
const diagnostics = await captureSupportDiagnosticBundle().catch(() => null);
const frozenPayload = diagnostics ? { ...payload, diagnostics } : payload;
```

- [ ] Add an accessible disclosure and “Посмотреть” preview. State that recent technical actions attach only to this report and exclude message text/passwords/payment data. Preview time/event/result only; sending remains immediate without diagnostics.
- [ ] Record safe `support_report` start/queued/fallback outcomes without report text.
- [ ] Run the two focused support-report tests.

## Task 5: Independent server sanitizer

**Files:**
- Modify: `functions/src/client_reports.ts`
- Modify: `functions/src/client_reports.test.ts`

- [ ] Write failing tests with extra keys, nested objects, PII-like strings, huge arrays, invalid/future/expired timestamps, and oversized serialization.
- [ ] Implement `cleanSupportDiagnostics(value, now)`: same or stricter allowlist, 24-hour window, at most five minutes future skew, 200 events, 32 KiB, chronological output.
- [ ] Conditionally attach only in the `error_report` branch:

```ts
const diagnostics = cleanSupportDiagnostics(payload.diagnostics, now);
return { ...base, /* existing fields */ ...(diagnostics ? { diagnostics } : {}), status: 'new' };
```

- [ ] Invalid diagnostics must never reject a valid report; other report kinds cannot persist them.
- [ ] Run only `functions/src/client_reports.test.ts` with the shared semaphore if required.

## Task 6: Live admin timeline

**Files:**
- Modify: `admin/v2/legacy.html`
- Create: `tests/admin_support_diagnostics_contract.test.ts`

- [ ] Write a failing source contract for a collapsed `<details>` block inside existing error cards, escaping, malformed fallback, chronological order, and copy-safe-JSON.
- [ ] Add strict pure helpers `normalizeSupportDiagnostics(value)` and `renderSupportDiagnostics(value)` near `renderReports`.
- [ ] Insert only when diagnostics exist. Follow `docs/design/ADMIN_UI_BIBLE.md`: existing palette/classes, visible focus, text+icon, tooltip, responsive wrapping. No new top-level tab and no frozen admin file edits.
- [ ] Copy only normalized diagnostics, never the full report.
- [ ] Run the new and existing admin single-surface/report contracts.

## Task 7: Privacy, deletion, and Jarvis contracts

**Files:**
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`
- Modify: applicable privacy-policy locale files under `app/legal/`
- Modify: `tests/account_delete_flow_contract.test.ts`
- Create: `tests/support_diagnostics_privacy_contract.test.ts`

- [ ] Add a failing privacy contract: no forbidden keys, no daily/background upload, report disclosure present.
- [ ] Update applicable localized privacy text for bounded on-device technical history and explicit attachment. Do not claim continuous monitoring.
- [ ] Document/assert in the Jarvis guard that `error_reports.diagnostics` is excluded from model prompts/Telegram/digest text while aggregate category/screen/build reads remain unchanged.
- [ ] Confirm existing account deletion removes `error_reports` by stable UID and local storage clearing covers the ring. Do not add a second deletion path.
- [ ] Inspect `admin_alerts`, daily digest, and Jarvis fetchers for accidental interpolation/spread.
- [ ] Run focused privacy, deletion-contract, and Jarvis tests.

## Task 8: Focused verification and handoff

- [ ] Run formatting/lint only on changed files if a narrow command exists.
- [ ] Before any Jest/type/build command acquire and always release the shared semaphore:

```bash
bash .claude/semaphore/slot.sh acquire "support diagnostics focused verification"
# focused tests from Tasks 1-7 only
bash .claude/semaphore/slot.sh release
```

- [ ] Use a narrow TypeScript check only if supported; never run whole-project `tsc --noEmit` or broad Jest.
- [ ] Inspect the final diff for raw logger export, arbitrary metadata, PII, background network work, economy changes, frozen admin files, and unrelated dirty-tree edits.
- [ ] Report exact focused results and remaining device/admin verification. State that nothing was deployed or released.
