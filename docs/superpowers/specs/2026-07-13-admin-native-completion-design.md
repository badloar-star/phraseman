# Phraseman Admin v2 Native Completion Design

**Status:** Approved for implementation on 2026-07-13.

**Goal:** Complete the Admin v2 migration from 39 native capabilities and 20 legacy fallbacks to 59 native capabilities and zero fallbacks, without changing finished Safety & Moderation, finished Native Diagnostics, or language-generation behavior.

## Scope

The completion consists of three native operational workspaces:

1. Money Operations: `ugc-purchases`, `refunds`, `referrals`, `telegram-payments`, `website-payments`.
2. Content Operations: `community-packs`, `card-packs`, `daily-phrases`, `french-quizzes`, `explain-reports`, `full-content-control`.
3. Community Operations: `mod-queue`, `help-board`, `helpers-board`, `clubs`, `league-chat`, `arena-ranks`, `arena-live`, `arena-bets`, `arena-rooms`.

The old `admin/index.html`, `admin/testers.html`, `admin/site.html`, and `admin/full.html` remain only as inert emergency archives after cutover. Normal entry points redirect to exact Admin v2 hashes. Archive mode must not read or write live data, export data, copy sensitive data, install live listeners, or expose mutation entry points.

## Architecture

Each package uses the same boundary:

```text
Admin v2 state/view/controller
  -> Firebase callable adapter
  -> bounded server projection or guarded server command
  -> Firestore Admin SDK transaction
  -> immutable admin audit record
```

Admin v2 never imports the Firestore browser client and never writes Firestore directly. Read models are bounded, paginated where needed, honest about truncation and source failures, and mask identity unless the role also has `users.read`.

Writes use a preview/approval/apply protocol. The server owns canonical targets, derives sensitive values from stored records, validates expected state and revision, rejects stale previews, prevents requestor self-approval, makes idempotent replays stable, rejects conflicting idempotency reuse, and writes the domain mutation plus audit in the same transaction. Bulk work uses a resumable server manifest.

## Permissions

Add these permissions to the shared server and browser role matrices:

- `money.export`
- `money.refunds.write`
- `money.payment_orders.write`
- `money.payment_config.write`
- `money.approve`
- `content.reports.write`
- `content.approve`
- `community.read`
- `community.help.read`
- `community.help.write`
- `community.chat.write`
- `community.arena.write`
- `community.arena.destructive`
- `community.arena.economy.write`
- `community.approve`

Owner and admin receive all of them. Analyst receives allowed reads and money export. Content editor receives content read/draft/report handling but not publish or approval. Moderator receives community read/help/chat/moderation but not arena destructive/economy/approval. Support receives help-board read. Approval is always by a different authorized administrator.

## Money Operations

### Read model

- UGC purchases: bounded purchase history, status/search filters, shard amounts, pack and buyer/seller references.
- Refunds: UGC soft refunds and provider-owned RevenueCat refund events are clearly separated.
- Referrals: bounded referral attribution list, status summary, pagination, identity masking, safe CSV export.
- Telegram payments: bounded paid-order list and linked manual-access state.
- Website payments: checkout configuration, site totals, bounded web orders, and related Telegram orders.

### Mutations

- UGC shard refund requires `money.refunds.write` and `money.approve`. Purchase status, user shard balance, shard log, operation record, and audit change in one transaction.
- Provider/Store refunds are read-only. Admin v2 never pretends to issue a Store or RevenueCat refund.
- Telegram activation requires `money.payment_orders.write` and `money.approve`; the server accepts only an already-paid, not-yet-activated order and derives the period from that order.
- Website price/config changes require `money.payment_config.write` and approval.
- Web paid-order activation requires `money.payment_orders.write` and approval.
- Manual access uses the established manual-access domain logic; it does not create or mutate Store entitlement truth.

## Content Operations

### Read model

- Community packs: review queue, active packs, reports, bounded card preview and source health.
- Card packs: metadata, cards, price, category and publication status.
- Daily phrases: ordered schedule, save counts, status and bounded detail.
- French quizzes: the existing deterministic readiness/draft/rollback evidence only.
- Explain reports: entries, counters and cache state with filters and bounded details.
- Full content control: bounded `plan_content_telemetry_events` projection by date range.

### Mutations

- Community pack approve/reject/request-changes requires a reason, expected status and audit. Removing an active pack requires a second administrator.
- Card-pack draft metadata uses `content.draft.write`; price, publish and unpublish use `content.publish` plus `content.approve`.
- Daily-phrase edit is a draft action. Scheduling, reorder, activation and bulk import require preview, diff, rollback snapshot and approval.
- French quiz migration preserves `activationApproved=false` and `productionReady=false`. It does not generate content, activate French, or change the language-generation system.
- Explain-report status changes and bulk completion use `content.reports.write`, expected statuses and idempotent commands. Destructive cache/counter operations require explicit preview and confirmation.

## Community Operations

### Read model

- Mod queue: bounded unified summary of UGC packs, Help Board and league chat. User reports and global bans link to the existing Safety & Moderation workspace.
- Help Board: topics, comments, reports, moderation queue, restrictions and bounded detail.
- Helpers board: ranking projection and editable description revision.
- Clubs: league groups, members, chest events and crown archive.
- League chat: rooms, queue, reports, messages, archive, automatic blocks and restrictions.
- Arena ranks: bounded profiles and rank/source indicators.
- Arena live: explicit on-screen refresh of matchmaking queue, sessions and rooms; no mutation during a read.
- Arena bets: current economy-flag state and revision.
- Arena rooms: bounded rooms and member state.

### Mutations

- Help Board actions go through the existing moderation domain and never add a second global-ban path.
- League-chat moderation is transactional and audited. Global ban remains exclusively in Safety & Moderation.
- Arena resync uses `community.arena.write`.
- Arena cleanup/purge uses `community.arena.destructive`, second-admin approval, an exact UID manifest, a fingerprint and resumable chunks. The server must not classify a placeholder only by display name and must never delete `users/*` or Auth identities.
- Arena live never performs background cleanup just because the page was opened.
- Arena wager changes require `community.arena.economy.write`, `community.approve`, expected revision, audit and rollback metadata.
- Arena room close/deactivation is a guarded server command. Destructive or bulk room work requires approval and a resumable operation.

## UI contract

The existing seven-section shell remains. The three workspaces are compact drill-down screens under Money, Content and Community. Every screen has a plain-language title, one main action, explicit loading/empty/partial/error/permission/stale states, filters, bounded detail, source freshness, visible keyboard focus, 44px primary targets, tooltips, dark text on lime, and responsive layouts at 375, 768, 1024 and 1440 pixels.

The UI follows `docs/design/ADMIN_UI_BIBLE.md`. The UI/UX catalog recommendation for a data-dense drill-down dashboard is used only for density and interaction patterns; its dark palette and alternative typography are rejected because the Admin UI Bible requires the established calm light operational system.

## Cutover and release

The capability registry maps the five money IDs to `money-operations`, the six content IDs to `content-operations`, and the nine community IDs to `community-operations`. The migration board must report 59 guarded/native and zero fallback. No live Admin v2 link may lead to legacy.

Release is targeted: deploy only the new/updated callables, verify unauthenticated production probes return 401, perform authenticated read-only smoke, deploy only Hosting target `admin`, and verify all 20 direct hashes and legacy redirects. Production mutation smoke is forbidden.

## Acceptance criteria

- Capability truth is exactly 59 native/guarded and 0 fallback.
- All 20 remaining capabilities have native server-backed views with legacy behavior preserved.
- Admin v2 contains no Firestore browser access or direct write path.
- Sensitive changes require permission, reason, exact confirmation, stale-state validation, idempotency and audit; high-risk changes require a second administrator.
- Legacy pages are inert archives and normal entry points redirect to exact Admin v2 hashes.
- Finished Safety & Moderation and Native Diagnostics continue passing their focused contracts.
- Language generation, French activation and production language-pack state are unchanged.
- Focused Functions, frontend contracts, syntax, TypeScript, audits, responsive browser checks, live smoke and final Advisor review all pass.

