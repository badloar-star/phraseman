# Phraseman Admin Operations Design

> Status: approved direction; implementation must proceed one phase at a time.
>
> This document is the product and safety specification for the future
> implementation plan. It consolidates the supplied audits as proposals, not as
> authority over repository rules.

## Goal

Make the existing Phraseman admin visually immediate, inexpensive to operate,
safe for high-impact actions, and genuinely useful for content/support work —
without creating a second admin, removing existing capability, weakening server
authorization, or reintroducing the login and click-freeze regressions.

## Chosen approach

Build one **phased master programme**, not a big-bang redesign.

- A phase is shippable on its own and has explicit entry/exit gates.
- An agent must implement only the currently authorised phase, verify it, and
  stop for owner approval before starting the next phase.
- Existing sections, routes, IDs, handlers, and supported workflows remain
  available throughout. New views extend or group them; they do not delete them.
- `admin/v2/legacy.html` remains the sole production entry point. Directly
  included scripts in `admin/v2/scripts/` are allowed only when they are loaded
  by that file. Retired admin surfaces must not be restored.

## Non-negotiable constraints

1. Publish only the Firebase Hosting target `admin` using `npm run hosting:admin`.
2. Do not edit frozen admin files: `admin/legacy.html`, `admin/index.html`,
   `admin/full.html`, or `admin/site.html`.
3. Firebase Auth custom claims and server-side permission checks remain the
   authority for admin access. The UI is never the enforcement boundary.
4. Admin App Check remains unenforced. Do not set `enforceAppCheck: true`,
   `ENFORCE_APP_CHECK_ADMIN=true`, or add global/direct client guards that block
   ordinary admin actions. Existing gift-only legacy transport must not spread to
   other workflows.
5. Never use a client Firestore write for a privileged action. Money, access,
   refunds, bans, deletion, publication, or other high-impact actions must stay
   callable/server-confirmed, idempotent, permission-checked, and auditable.
6. Economy rules remain intact: never write `users/{uid}.shards`; never create a
   standalone debit; never replace client-authoritative ordinary spending with a
   server balance check.
7. Any new collection, field, or data schema requires Firestore Rules and the
   Jarvis data-contract review/guard in the same change.
8. Never persist sensitive admin data to IndexedDB/localStorage by default.
   Any future trusted-device cache needs explicit owner approval, a logout wipe,
   short TTL/schema version, sensitive-field exclusion, and a threat-model.
9. Every DOM observer must be scoped and idempotent. It must not mutate the
   subtree it observes unless a value-change guard prevents self-triggering.
10. Preserve the existing login contract: local persistence, redirect recovery,
    forced claim refresh, no sign-out when a claim is temporarily absent, an
    enabled sign-in control, and an interactive browser heartbeat after load.

## Selected programme

### Phase 0 — Safety baseline and regression proof

**Purpose:** keep the production admin operable while later work lands.

Deliver:

- Characterisation contracts for the live admin surface, owner login, App Check
  boundary, navigation observers, and V6/V7 runtime safety.
- A Playwright smoke test which proves `readyState=complete`, live login button
  enabled/pointer-active, sign-in handler present, safe click probe works, no
  page errors, and the event loop still advances after a navigation mutation.
- A bounded permission matrix inventory for every existing mutating callable or
  direct admin data access. This is evidence-gathering first; do not infer that
  server protection is missing from HTML alone.
- Targeted user/AI-text XSS fixture coverage for support, reports, messages, and
  UGC rendering sinks. CSP work is report-only and staged, never a blanket
  production policy change.

Acceptance:

- The current auth/navigation/App Check contracts pass.
- No observer can create an unbounded mutation loop.
- Every sampled high-impact action has an identified server enforcement point;
  unverified endpoints are recorded as gaps rather than declared safe.

### Phase 1 — Instant, bounded, low-cost reads

**Purpose:** make repeat visits feel instant without preloading the world.

Deliver:

- Per-section freshness policy: preserve visible data, render an explicit small
  revalidation state, coalesce duplicate requests, and distinguish manual
  refresh from background revalidation.
- First-load-only skeletons. A populated section must not be cleared merely
  because a refresh began or failed.
- Cursor pagination and server-side targeted search for heavy lists (users,
  email, reports, queues). Initial pages are bounded; full export is explicit.
- Remove transitive full `loadUsers()` calls from unrelated pages.
- A read-cost telemetry display labelled as an estimate, separating cached data,
  server queries, aggregate documents, and callables. It must add no fan-out
  reads or timers.

Acceptance:

- Reopening a loaded section preserves its existing DOM and starts at most one
  background request.
- A failed refresh preserves the prior result and shows a truthful stale/error
  state.
- No unrelated tab loads a whole users/email collection.
- No short polling interval or global warm-load substitutes for good caching.

### Phase 2 — SafeOps and truthful change history

**Purpose:** make high-impact administration inspectable and recoverable.

Deliver:

- A command-by-command contract for sensitive server actions: actor, permission,
  reason, stable idempotency key, expected revision where applicable, result,
  and immutable audit record produced atomically with the effect.
- A thin Change Center on existing config/flag flows: draft, diff/preview,
  explicit confirmation, server result, audit link, and safe rollback snapshot.
- Repair any evidenced partial bulk-operation UI so only successfully processed
  IDs are rendered successful; failed IDs remain actionable and retryable.

Acceptance:

- Sensitive actions cannot report final success before a server-confirmed result.
- Repeating the same idempotency key cannot double-apply an action.
- Rollback only applies to reversible config/campaign state, never fabricates
  financial or economy corrections.

### Phase 3 — Daily operations surfaces

**Purpose:** reduce navigation cost without duplicating data stores.

Deliver:

- A task-oriented `Today`/Mission Control summary built from existing bounded
  sources: active incidents, stale campaigns, pending queues, release health,
  and direct links to current tools.
- An Operations Inbox as a read-model and navigation layer over existing support,
  reports, moderation, and health sources — no parallel ticket source of truth.
- Extend the current User 360/profile path with a permission-aware timeline of
  existing learning, access, payment, support, and admin-action records.
- Regroup navigation inside the live legacy surface and complete the existing
  command palette only for safe, already-supported destinations/commands.

Acceptance:

- All legacy routes/deep links retain an accessible path.
- The new overview performs bounded reads and shows freshness/provenance.
- Dangerous commands route to existing preview/confirmation flows; none execute
  immediately from a palette or dashboard.

### Phase 4 — Content QA Copilot for user-created packs

**Purpose:** raise content quality before publication while keeping people in
control.

Deliver:

- A `Check pack` draft workflow for user-created packs. It validates deterministic
  rules first (missing fields, duplicates, invalid language/format, prohibited
  structure) and then optionally requests a server-side AI review.
- The AI response is a structured, reviewable draft: severity, item reference,
  reason, suggested correction, and a ready-to-edit Russian response to the
  author. It never writes the pack, sends a message, rejects publication, or
  changes a status automatically.
- A human reviewer can edit, discard, rerun, or approve the draft. Sending a
  response and changing publication status remain explicit existing privileged
  actions, each with audit history.
- Limits, model/version provenance, request idempotency, redaction/minimisation,
  error/retry state, and a per-review cost display.

Acceptance:

- One click creates a visible draft review, not an irreversible moderation action.
- AI output is rendered as untrusted text and cannot inject HTML/script.
- No client-side secret or direct browser call to an AI provider exists.
- A failed AI request leaves the pack and its moderation status unchanged.

### Phase 5 — Campaign, experiment, and release health workflow

**Purpose:** run product changes deliberately rather than through scattered flags.

Deliver:

- A common campaign draft structure on existing workflows: owner, audience,
  schedule, frequency cap, preview, stop rule, and rollback action.
- An Experiment Center only after metric definitions, consent, audience rules,
  control-group policy, and server audit paths are established.
- Release/Incident Health using truthful bounded sources: app health, version
  adoption where available, campaign status, and explicit emergency off switches.

Acceptance:

- A campaign/experiment cannot become active without preview and a
  server-confirmed audit record.
- Metrics label source, date range, freshness, incomplete data, and currency
  provenance. Currency must never fall back to a false `1:1` conversion.
- No automatic rollout expansion, refund, ban, or publication is introduced.

## Explicit deferrals and rejections

- No big-bang rewrite or a second modular admin application.
- No default persistent cache of sensitive administrator/user data.
- No automatic AI moderation, publishing, refunds, bans, grants, or corrective
  economy events.
- No BigQuery/warehouse, geo profiling, MFA rollout, staging cutover, two-person
  approval, strict CSP enforcement, or recovery dashboard until their explicit
  policy, privacy, ownership, and operational prerequisites are approved.
- No speculative Firebase SDK upgrade based on an audit claim alone.

## Implementation handoff rules for browser ChatGPT

1. Read `AGENTS.md`, `docs/design/ADMIN_UI_BIBLE.md`, and the current
   `admin/v2/legacy.html` before changing anything.
2. Work only on the owner-authorised phase. Start every task with the failing
   test, then make the minimal implementation, then run the focused green tests.
3. Treat the existing file as a live compatibility surface: do not rename/remove
   handlers, IDs, routes, or user-visible functions as a side effect.
4. For critical data/auth/economy/privacy work, first inspect Rules, Functions,
   tests, and Jarvis contracts. Do not claim a static HTML audit proves a server
   vulnerability.
5. Before each deploy, run focused contracts, `git diff --check`, and browser
   smoke checks. Deploy only `npm run hosting:admin`.
6. After deploy, cache-bust download the live `legacy.html`, compare SHA-256 to
   local, and repeat the live browser smoke test.
7. Stop after a phase and report: changed files, tests, browser evidence,
   Firestore read impact, migration/rules/Jarvis impact, risks, and next phase.
