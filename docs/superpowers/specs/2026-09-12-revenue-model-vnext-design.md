# Phraseman Revenue Model VNext — design specification

**Date:** 2026-09-12  
**Status:** Awaiting final owner review  
**North star:** server-confirmed total revenue and cohort LTV  
**Release model:** one coordinated big-bang product release, active by default, without a Revenue VNext master flag

## 1. Objective

Replace the accumulated freemium rules with one coherent commercial system in which:

1. the core language course is genuinely useful for free;
2. Plus sells uninterrupted pace, deeper practice, creation capacity, and progress insight;
3. pearls buy deterministic, one-off learning utility rather than cosmetic filler;
4. every paywall claim matches a feature that exists and can be delivered;
5. every purchase, entitlement, debit, and grant is attributable and recoverable;
6. total revenue and long-term retention decide success, not raw subscription conversion alone.

The retired Max AI Tutor is outside the inventory, design, implementation, analytics, and release.

## 2. Owner decisions and non-negotiable boundaries

- Implement the complete model, not an incremental monetization pilot.
- Do not add a Revenue VNext master feature flag.
- New behavior is the runtime default once the coordinated release ships.
- Do not redesign any existing paywall A–G or the onboarding paywall.
- Paywall layout, pricing cards, CTA placement, animations, colors, spacing, and visual hierarchy remain unchanged.
- Only paywall trigger, context, source, frequency, copy, and measured proof may change.
- Keep the onboarding paywall as the final onboarding commercial step with a clear free exit.
- Do not sell Personal Plan to new users. Preserve only already-authorized grandfathered access until its scheduled sunset.
- Keep all 32 main-course lessons free.
- Do not introduce pay-to-win advantages in Arena, League, or other competitive outcomes.
- Do not expire purchased pearls.
- Never charge for a wrong answer, delete progress to create pressure, or sell a corrected exam result.
- A direct route must enforce the same access policy as its visible entry point.
- Store and RevenueCat confirmation remain authoritative for real-money purchase state.
- Ordinary personal progress and pearl spending remain client-authoritative under the Economy Constitution.

## 3. Commercial model

### 3.1 Free

Free is a complete learning product with bounded pace and depth:

- all 32 main-course lessons;
- released Learning V2 sessions according to normal progress rules;
- first study language;
- 100-point energy wallet with recovery;
- up to 20 saved flashcards;
- one user-created pack and up to 10 user-created cards;
- three short flashcard-training sessions per local day;
- one short speaking sample per local day;
- Mistake Lab preview plus one mini-session per calendar week;
- basic progress totals and one useful stats insight;
- diagnostics and exams, limited only by energy;
- community browsing and qualifying publication;
- core Arena, League, Friends, achievements, Phrase of the Day, and video surfaces;
- free Season Pass track.

Free limits must be visible before the user commits work. Existing content is never hidden or deleted after a downgrade.

### 3.2 Plus

Plus is the recurring unlimited/deep tier:

- unlimited energy;
- unlimited flashcard training;
- unlimited speaking starts for ordinary use; bounded anti-abuse/rate controls may protect the service but may not masquerade as a hidden Plus quota;
- full Mistake Lab and mistake history;
- deep statistics, weak-pattern analysis, heatmaps, and percentiles;
- unlimited flashcard and pack creation;
- bulk creator conveniences;
- additional released study languages;
- premium Season Pass track;
- Plus convenience benefits that do not affect competitive fairness.

Plus does not claim exclusive access to the 32 core lessons, Personal Plan, guaranteed outcomes, or unavailable content.

### 3.3 Pearls

Pearls provide explicit one-off alternatives without imitating an indefinite subscription:

| Product | Default price | Exact grant |
|---|---:|---|
| Dynamic energy refill | 2–10 pearls | Restore the exact missing amount up to 100 energy; `ceil(missing / 10)`, bounded to 2–10 |
| Flashcard Training Pass | 8 pearls | Five additional short training starts, valid until consumed |
| Speaking Pack | 12 pearls | Five additional speaking starts, valid until consumed |
| Mistake Lab Ticket | 10 pearls | One full Mistake Lab session |
| Workshop Credit | 15 pearls | Permanently add ten creator-card capacity slots without deleting or locking existing work |
| Focus Day | 25 pearls | 24 hours of unlimited energy and flashcard training; speaking remains separately metered |
| Season premium track | 250 pearls | Premium track for the current season without requiring Plus |

Each product is a durable composite operation containing its exact debit and grant. Every operation has one stable idempotency key and one replayable receipt. Network failure may delay sync but may not revoke a locally committed ordinary purchase.

Cosmetics can remain secondary pearl products, but they are not the primary demand engine.

## 4. Energy 100

- Capacity: 100.
- Initial energy for a new or migrated free account: 100.
- Short activity: 10 energy.
- Standard lesson/session: 20 energy.
- Long exam or full Mistake Lab session: 30 energy.
- Recovery: 5 energy every 60 minutes until capacity.
- Plus: unlimited; no debit operation is created.
- Wrong answers do not spend additional energy.
- Energy is reserved only when an activity can start.
- Failed or revoked starts refund the same operation idempotently.
- UI shows the cost before confirmation and the exact recovery time.
- Refill pricing uses the actual missing amount, never a linear conversion from the retired five-heart scale.

The schema is versioned and additive. Old clients may continue reading their compatible projection while the new client writes immutable VNext operations. A timestamp/LWW snapshot may not overwrite newer local operations.

## 5. Paywall system

### 5.1 Onboarding paywall

- Remains the final monetization screen in `CleanOnboarding`.
- Uses the current visual design without layout or style changes.
- Uses canonical context `onboarding_plan`, never `personal_plan`.
- Price, billing period, lifetime visibility, and trial eligibility come only from the store offering.
- Keeps restore, promo/referral entry, close, and “continue free”.
- Copy may use bounded onboarding facts such as selected level, study goal, and desired practice type.
- Skipping completes onboarding normally and preserves all free access.
- After a skip, no second paywall appears immediately. The next eligible paywall requires a completed value event or a genuine limit.
- Onboarding impressions and purchases form their own funnel and are not merged with feature-gate funnels.

### 5.2 In-product contextual paywalls

`/premium_modal` remains the single dispatcher to the existing A–G designs. The following contexts are canonical:

- `no_energy`;
- `flashcard_training`;
- `flashcard_limit`;
- `flashcard_create` and `pack_create`;
- `speaking`;
- `mistake_practice`;
- `stats` and governed deep-stat subcontexts;
- `language_add`;
- `season_pass_lane`;
- `notification_upsell`;
- `winback`.

Every entry sends a bounded `context`, `source`, `creative_revision`, and unique `paywall_impression_id`. Paid users and unresolved entitlement hydration never receive a false paywall. Deep links, notification routes, and direct activity routes apply the same access gate as hubs.

### 5.3 Frequency and truth

- Maximum one interrupting paywall per product session.
- Dismissed soft prompts receive a seven-day cooldown.
- Genuine user-requested feature gates may reappear when the user deliberately requests the feature again.
- Never show a paywall immediately after an error, during progress loss, or over another owned overlay.
- Copy names the requested value and the exact Free/Plus difference.
- No false countdown, scarcity, unavailable benefit, or preselected billing ambiguity.

## 6. Purchase and entitlement data flow

Subscription chain:

`gate evaluated → paywall impression → plan selected → purchase attempt → exactly one terminal client outcome → entitlement confirmed → RevenueCat webhook lineage`

Requirements:

- stable `event_id`, `paywall_impression_id`, and `purchase_attempt_id`;
- one terminal client outcome: completed, pending, cancelled, or failed;
- restore is not counted as new revenue;
- post-purchase entitlement is checked before content unlock;
- RevenueCat webhook is the source for server-confirmed revenue and refund lineage;
- retries do not create duplicate activations or analytics events;
- account switching invalidates stale local purchase attribution;
- analytics failure never blocks purchase or restore.

Pearl chain:

`catalog/context impression → product selected → composite operation committed → exact grant available → journal sync → receipt projected`

No standalone debit, “spend now/grant later”, direct `users/{uid}.shards` write, or server rejection based on an ordinary personal-balance projection is permitted.

## 7. Analytics and decision system

Every governed commercial event includes:

- schema and creative revision;
- stable event ID and occurrence time;
- opaque subject and product-session IDs;
- build, platform, locale, study target, screen, and source;
- entitlement state and access-resolution state;
- context and product/plan identifiers;
- purchase attempt or economy operation ID where applicable;
- analytics consent state without collecting raw learning answers.

Primary launch metrics:

- server-confirmed revenue per eligible new user at D35 and D60;
- cohort LTV;
- Plus trial, paid activation, renewal, refund, and churn;
- pearl first purchase, first sink, repeat purchase, and breakage.

Guardrails:

- onboarding completion;
- D1/D7/D30 retention;
- completed learning sessions;
- energy-block abandonment;
- paywall close and rage-repeat rate;
- support complaints and refunds;
- voice operating cost per retained/paying cohort;
- Arena/League fairness indicators.

The big-bang release is evaluated as a complete new commercial system. Individual feature causality is not claimed from before/after movement. Future experiments require a pre-registered passport, fixed sample and window, SRM check, maturity, and guardrails.

## 8. Admin and control-plane truth

The only admin surface is `admin/v2/legacy.html`.

- Every visible monetization control must affect runtime or be clearly read-only.
- Energy configuration supports the full VNext range and consistent defaults.
- Pearl catalog shows the same price and grant contract as the client.
- Paywall context and creative revision are visible in funnels.
- Admin cannot declare a winner from insufficient or non-causal data.
- Revenue dashboards distinguish client intent, entitlement activation, server-confirmed revenue, refund, and restore.
- App Check for admin functions remains disabled unless the owner separately orders enablement after the required external setup.

Any schema or collection change updates Firestore Rules and the Jarvis data-contract audit in the same change.

## 9. Migration and release without a master flag

There is no Revenue VNext activation flag and no split runtime. Safety comes from compatibility and release gates:

1. Add backward-compatible server/rules/schema support.
2. Keep old field projections readable while VNext immutable operations become authoritative for the new client.
3. Migrate local energy and entitlements idempotently on first VNext launch.
4. Ship the client whose VNext behavior is active by default.
5. Release matching Functions, Rules, Remote Config values, and admin UI in a coordinated window.
6. Observe purchase, access, crash, refund, and balance-integrity monitors.
7. Roll back binaries/functions only to a version that can safely read additive VNext data.

Destructive cleanup of legacy fields and adapters is not part of the launch. It occurs only after two stable release cycles and requires a separately named deletion decision.

## 10. Epic architecture

### Epic 0 — commercial truth and access integrity

- Remove unavailable claims and retired lesson-lock language.
- Complete route-level access coverage.
- Canonicalize onboarding, Season Pass, and feature contexts.
- Fix cold-hydration false paywalls.
- Align streak-freeze UI price and composite operation.
- Prevent DEV catalog surfaces from presenting fake purchases.

### Epic 1 — measurement spine

- Govern the complete purchase and pearl event vocabulary.
- Add stable IDs and exactly-one outcomes.
- Join client purchase attempts to RevenueCat lineage.
- Complete warehouse allowlists and screen registry.
- Complete consent revoke and external analytics deletion coverage.
- Add data-quality dashboards and invariants.

### Epic 2 — Free/Plus access model

- Centralize the matrix in one typed registry.
- Make every hub and direct route consume the registry.
- Add daily/weekly quota ledgers with account and timezone safety.
- Key quota periods by account plus a persisted IANA timezone snapshot, advance rollovers monotonically, and prevent clock rollback from restoring consumed allowance.
- Preserve created content across downgrade.
- Add complete contract tests for every feature/context pair.

### Epic 3 — Energy 100

- Add versioned config and operation model.
- Implement migration, recovery, activity costs, confirmation, refund, and Plus bypass.
- Update all badges, countdowns, modals, accessibility text, admin controls, and analytics.
- Remove assumptions that capacity equals five from active runtime.

### Epic 4 — pearl utility economy

- Implement the seven utility products and durable receipts.
- Add one production catalog entry from the pearl wallet.
- Add contextual entry points at real shortage moments.
- Add source/sink attribution and purchased-versus-earned cohort views.
- Verify Economy Constitution, Firestore Rules, Jarvis, retry, offline, and account-race behavior.

### Epic 5 — paywall copy and routing

- Preserve all existing paywall visuals.
- Canonicalize onboarding and in-product contexts.
- Produce truthful localized copy for all supported locales.
- Connect measured proof without raw or unbounded user text.
- Enforce frequency, overlay ownership, hydration, and account-generation safety.

### Epic 6 — onboarding commercial flow

- Keep the current onboarding paywall design.
- Replace retired context and claims.
- Personalize only from bounded onboarding selections.
- Preserve clear free completion, restore, promo/referral, pricing, and disclosure.
- Build a dedicated onboarding revenue/retention funnel.

### Epic 7 — admin, release, and operational readiness

- Make all live controls truthful.
- Add revenue, pearl, energy, access, and funnel dashboards.
- Create compatible migration and rollback runbooks.
- Run store sandbox, offline, account-switch, refund, and downgrade verification.
- Publish one coordinated release only after every mandatory gate passes.

### Epic 8 — technical-debt closure

- Remove duplicated access rules only after the typed registry is adopted.
- Mark every temporary adapter with a debt ID and deletion condition.
- Remove legacy projections only after two stable releases and explicit owner approval.
- Keep contract guards as permanent regression protection.

## 11. Technical-debt management

The implementation creates `docs/monetization/REVENUE_VNEXT_TECH_DEBT.md`. Every entry contains:

- stable ID `RVTD-NNN`;
- severity P0–P3;
- affected user or financial invariant;
- exact files/contracts;
- reason the debt exists;
- measurable interest/cost of delay;
- responsible epic;
- target release or deletion condition;
- automated guard or verification command;
- state: open, accepted, scheduled, or closed with evidence.

Rules:

- No release with open P0/P1 debt related to money, access, migration, privacy, or misleading purchase copy.
- At least 20% of each epic's implementation capacity closes debt touched by that epic.
- A temporary compatibility adapter requires an expiry condition and contract test.
- Tests are not deleted or weakened to close debt.
- Unrelated cleanup does not enter the release merely because a file is touched.
- Debt review happens at each epic completion and at the final release gate.

## 12. Error handling and recovery

- Access is fail-closed while entitlement is unresolved, without showing a false paywall.
- Purchase pending is distinct from failure.
- Offline ordinary pearl operations commit locally and sync later.
- A failed grant cannot leave an orphan debit.
- A failed activity start cannot leave spent energy.
- Duplicate native callbacks and retries replay the same outcome.
- Account generation changes invalidate stale operations and UI.
- Schema readers tolerate missing VNext fields and unknown future versions.
- The UI explains recoverable failures and preserves the user's work.

## 13. Verification strategy

Each epic uses tests-first implementation and an independent critical review where money, access, privacy, schema, or migration is involved.

Mandatory gates:

- typed access-matrix contract tests;
- direct-route parity tests;
- purchase lifecycle and RevenueCat lineage tests;
- economy idempotency, offline, retry, and account-race tests;
- energy reservation/refund/migration/property tests;
- onboarding and A–G paywall navigation/localization tests;
- analytics governance, warehouse, consent, and deletion tests;
- Firestore Rules emulator and Jarvis contract tests for schema changes;
- focused accessibility and small-screen checks;
- iOS and Android store-sandbox purchase/restore/pending/refund journeys;
- upgrade, downgrade, old-client/new-client, and rollback compatibility matrix;
- final release checklist with no open related P0/P1 debt.

Heavy checks use the shared repository semaphore and run serially within the allowed slots.

## 14. Definition of Done

Revenue Model VNext is complete only when:

1. every active feature appears in the typed Free/Plus/Pearls registry;
2. every direct route and hub enforces the same policy;
3. Energy 100 replaces active five-heart assumptions and migrates safely;
4. all seven pearl utility products grant atomically and replay safely;
5. onboarding and contextual paywalls use truthful canonical contexts without visual redesign;
6. all supported locales render correct first-time and win-back copy;
7. client purchase attempts join to server-confirmed revenue and refunds;
8. admin controls and dashboards reflect actual runtime contracts;
9. privacy consent withdrawal and data-deletion coverage are verified;
10. old and new clients can coexist during store rollout;
11. no related P0/P1 technical debt remains open;
12. focused automated, emulator, store-sandbox, accessibility, migration, and independent review gates pass;
13. the owner explicitly authorizes production deployment after reviewing the release evidence.

## 15. Source-of-truth references

- `docs/monetization/PHRASEMAN_MONETIZATION_AUDIT_2026-09-12.md`
- `docs/monetization/PHRASEMAN_REVENUE_LAB_2026-09-12.html`
- `docs/economy/ECONOMY_CONSTITUTION.md`
- `app/premium_context.ts`
- `app/premium_guard.ts`
- `app/paywall_navigation.ts`
- `app/paywall_purchase.ts`
- `app/paywall_copy.ts`
- `components/CleanOnboarding.tsx`
- `app/energy_contract.ts`
- `app/energy_state_v2.ts`
- `app/energy_session_operation_ledger.ts`
- `app/shop_catalog.ts`
- `app/shards_system.ts`
- `app/product_analytics_governance.json`
- `admin/v2/legacy.html`
- `functions/src/jarvis/jarvis_data_contract_guard.test.ts`
