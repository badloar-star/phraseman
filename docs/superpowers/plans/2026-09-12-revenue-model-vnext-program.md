# Revenue Model VNext Program Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Phraseman's accumulated monetization rules with the approved big-bang Free/Plus/Pearls system, active by default and released as one coordinated product change.

**Architecture:** The program is split into nine dependency-ordered epics, each with its own executable companion plan and deterministic release gate. Shared commercial policy is centralized, money/access/schema changes use one critical writer, and every critical epic receives fresh independent review. There is no Revenue VNext master flag; compatibility, test gates, and coordinated deployment provide safety.

**Tech Stack:** Expo Router, React Native, TypeScript, AsyncStorage operation ledgers, Firebase/Firestore/Cloud Functions, RevenueCat, Remote Config, BigQuery product analytics, Jest/RNTL, Firebase Rules emulator, `admin/v2/legacy.html`.

---

## Program rules

- Work in the current checkout; do not create a branch or worktree without a separate owner request.
- Preserve unrelated dirty files and staged changes.
- Max AI Tutor is excluded from every epic.
- Do not change paywall visual design.
- Do not deploy until the owner separately authorizes production publication after reviewing evidence.
- Use tests first for every behavior change.
- Use one writer for money, access, Firestore schema/rules, migrations, privacy, and release work.
- Use the shared semaphore for Jest, typecheck, builds, and other heavy checks.
- Update Firestore Rules and Jarvis contracts in the same change as any schema/collection/field change.
- Never weaken an economy, access, privacy, or data-contract guard to make a check pass.

## Dependency graph

`Epic 0 → Epic 1 → Epic 2 → Epic 3 → Epic 4 → Epic 5 → Epic 6 → Epic 7 → Epic 8 → release`

Epic 1 may inventory later schemas, but no later epic may ship before the previous epic's contracts are green. The application release contains all completed epics together.

## Epic backlog

### Epic 0 — commercial truth and access integrity

Companion plan: `docs/superpowers/plans/2026-09-12-revenue-vnext-epic-0-commercial-truth.md`

- [x] Remove Personal Plan from active Plus sales copy in all supported locales.
- [x] Add fail-closed direct-route access protection to Blitz.
- [x] Replace false “three free lessons” and “Plus unlocks lessons” completion copy.
- [x] Add canonical onboarding and Season Pass paywall contexts.
- [x] Correct the onboarding purchase context without changing its design.
- [x] Make Flashcards Swipe wait for entitlement hydration before redirecting.
- [x] Replace the second hard-coded streak-freeze price with the Remote Config value.
- [x] Make fixed-policy and compatibility-only admin controls truthful.
- [x] Make the DEV utility shop explicitly non-purchasing until composite grants exist.
- [x] Run focused critical review and Epic 0 verification.

### Epic 1 — measurement spine

- [ ] Create the commercial event schema and immutable ID types.
- [ ] Add exactly-one purchase terminal outcome enforcement.
- [ ] Carry paywall, purchase-attempt, economy-operation, and creative IDs end to end.
- [ ] Join client attempts to RevenueCat webhook lineage without treating restore as revenue.
- [ ] Govern onboarding, paywall, pearl, energy, and access events.
- [ ] Complete missing warehouse allowlists and screen registry entries.
- [ ] Implement consent withdrawal opt-out/reset and external deletion coverage.
- [ ] Add data-quality invariants for duplicates, missing parents, and impossible chains.
- [ ] Extend only `admin/v2/legacy.html` with truthful revenue-quality views.
- [ ] Run AA integrity, privacy, BigQuery, callable, and admin contract gates.

### Epic 2 — typed Free/Plus/Pearls access matrix

Companion tranche: `docs/superpowers/plans/2026-09-12-revenue-vnext-epic-2a-flashcard-training-quota.md`

- [x] Epic 2A: enforce one account/lineage-scoped three-per-IANA-day quota
  across all four flashcard training modes, with Plus and RC compatibility
  unlimited, hub/setup preview parity, and post-energy refund safety.

- [ ] Create one typed registry covering every active feature in the audit inventory.
- [ ] Encode approved Free, Plus, quota, and one-off utility access.
- [ ] Replace direct `hasPremiumAccess` monetization decisions with registry decisions.
- [ ] Add account-safe daily and weekly quota ledgers.
- [ ] Apply identical decisions to hubs, direct routes, deep links, and notifications.
- [ ] Preserve existing user-created content on downgrade.
- [ ] Mirror mutable controls in Remote Config and mark fixed policy read-only.
- [ ] Generate a complete feature/context contract test matrix.

### Epic 3 — Energy 100

- [ ] Finalize the additive VNext energy operation schema.
- [ ] Implement 100 capacity, 5-per-hour recovery, and 10/20/30 activity costs.
- [ ] Migrate legacy balances idempotently and preserve old-client readability.
- [ ] Add reservation, acknowledgement, refund, retry, and account-race protection.
- [ ] Update every activity start and every visible energy projection.
- [ ] Implement dynamic 2–10 pearl refill as one composite operation.
- [ ] Update admin configuration, Firestore Rules, Jarvis, analytics, and runbooks.
- [ ] Run property, migration, offline, accessibility, and cross-version gates.

### Epic 4 — pearl utility economy

- [ ] Define typed catalog and durable grant receipts for all seven products.
- [ ] Implement Training Pass, Speaking Pack, Mistake Lab Ticket, Workshop Credit, Focus Day, and Season Track grants.
- [ ] Reuse the Energy 100 refill operation from Epic 3.
- [ ] Add one production catalog entrance from the existing pearl wallet.
- [ ] Add contextual shortage entrances without duplicating purchase logic.
- [ ] Add source/sink and purchased-versus-earned attribution.
- [ ] Update Firestore Rules, Jarvis, account deletion, and recovery behavior.
- [ ] Run idempotency, replay, offline, account-switch, and no-orphan-debit gates.

### Epic 5 — paywall copy, routing, and frequency

- [ ] Freeze A–G visual snapshots and style hashes as regression evidence.
- [ ] Centralize canonical context/source/creative parsing.
- [ ] Write truthful localized copy for every approved context.
- [ ] Add bounded measured proof without raw user text.
- [ ] Enforce session cap, cooldown, overlay ownership, and hydration safety.
- [ ] Verify store-derived pricing/trial disclosure and restore behavior.
- [ ] Verify first-time, win-back, free-exit, and account-switch behavior in every locale.

### Epic 6 — onboarding commercial flow

- [ ] Keep the existing final onboarding paywall layout and interactions.
- [ ] Use `onboarding_plan` context and remove Personal Plan semantics.
- [ ] Map bounded level/goal/practice selections to copy only.
- [ ] Preserve continue-free, restore, promo/referral, and legal disclosure.
- [ ] Prevent immediate post-skip paywall repetition.
- [ ] Add an isolated onboarding commercial funnel and retention guardrails.
- [ ] Run complete/skip/purchase/pending/restore/offline/accessibility journeys.

### Epic 7 — admin and operational readiness

- [ ] Read and apply `docs/design/ADMIN_UI_BIBLE.md` before every admin edit.
- [ ] Make every visible monetization control effective or explicitly read-only.
- [ ] Add revenue, pearl, energy, access, and data-quality views to `admin/v2/legacy.html`.
- [ ] Preserve admin authentication and keep admin App Check disabled.
- [ ] Create migration, incident, rollback, reconciliation, and support runbooks.
- [ ] Add store-sandbox and production-readiness checklists.

### Epic 8 — technical-debt closure and release gate

- [ ] Maintain `docs/monetization/REVENUE_VNEXT_TECH_DEBT.md` throughout execution.
- [ ] Close every related P0/P1 item with deterministic evidence.
- [ ] Add expiry conditions and guards for every compatibility adapter.
- [ ] Run full old-client/new-client compatibility matrix.
- [ ] Run focused suites, typecheck/build under semaphore, Rules emulator, store sandbox, and independent reviews.
- [ ] Prepare but do not execute the coordinated production deployment.
- [ ] Present final evidence and obtain explicit owner deployment authorization.

## Technical-debt cadence

- Review debt after every task that touches a registered file or contract.
- Reserve at least one debt-closing task for every four product tasks.
- Block an epic's completion on related P0/P1 debt.
- Do not mix unrelated cleanup into a critical change.
- Close entries only with a test, command, or runtime artifact that proves the exit condition.

## Program completion evidence

- [ ] Nine epic plans completed and checked off.
- [ ] All Definition of Done items in the approved design spec have direct evidence.
- [ ] No paywall visual-regression diff.
- [ ] No orphan pearl or energy debit path.
- [ ] No direct-route/hub access mismatch.
- [ ] No false product claim or noncanonical paywall context.
- [ ] RevenueCat server lineage, refunds, and restores are distinguishable.
- [ ] No related open P0/P1 technical debt.
- [ ] Explicit owner approval recorded before deployment.
