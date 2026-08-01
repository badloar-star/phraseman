# Level-Up Annual Premium Gift Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the level-up paywall with a 24-hour annual Premium gift: 18 months for the normal annual price and a server-issued six-month bonus only after an attributable paid RevenueCat event.

**Architecture:** A Firestore offer record controls expiry and attribution. The mobile client shows a toast and saved gift, then invokes the existing yearly store package from a dedicated RevenueCat offering; it never grants access. The production RevenueCat webhook is the single writer of the bonus receipt. The live legacy admin can only create an unpurchasable preview for a named administrator account.

**Tech Stack:** Expo Router, React Native, `react-native-purchases`, Firebase Functions v2/Admin SDK, Firestore transactions, RevenueCat webhooks, Jest, static WebP.

---

### Task 1: Define the annual-gift server contract

**Files:**
- Create: `functions/src/level_up_annual_gift.ts`
- Test: `functions/src/level_up_annual_gift.test.ts`

- [ ] Write failing tests for the exact 24-hour expiry, annual-only product allowlist, `INITIAL_PURCHASE/NORMAL` grant, `INITIAL_PURCHASE/TRIAL` wait, `RENEWAL/NORMAL` grant, and rejection of restore/cancel/transfer/sandbox/wrong offering.
- [ ] Run `npm test -- functions/src/level_up_annual_gift.test.ts --runInBand` and confirm failure.
- [ ] Implement `LEVEL_UP_ANNUAL_GIFT_OFFERING_ID = 'level_up_annual_gift_v1'`, a 24-hour TTL, six bonus calendar months, states `available | trial_pending | awaiting_first_paid_renewal | granted | expired`, and pure `isExpired`, `canStartPurchase`, and webhook-classification helpers.
- [ ] Re-run the focused test; commit `feat: define annual level-up gift contract`.

### Task 2: Add guarded server callables

**Files:**
- Create: `functions/src/level_up_annual_gift_callables.ts`
- Modify: `functions/src/index.ts`
- Test: `functions/src/level_up_annual_gift_callables.test.ts`

- [ ] Write failing tests that reject another user’s offer, an expired offer, a preview purchase attempt, and a non-admin preview request.
- [ ] Implement App Check-protected `getLevelUpAnnualGift`, `beginLevelUpAnnualGiftPurchase`, and `adminPreviewLevelUpAnnualGift`. Store `uid`, level, allowed annual product id, offering id, `offerExpiresAt`, state, `preview`, and audit data at `users/{uid}/level_up_annual_gifts/{offerId}`. A purchase attempt is short-lived and binds the offer to the RevenueCat app-user id; preview records never receive one.
- [ ] Run the focused callable test and commit `feat: add guarded annual gift callables`.

### Task 3: Make the production webhook the only grant authority

**Files:**
- Modify: `functions/src/revenuecat_shards.ts`
- Create: `functions/src/level_up_annual_gift_webhook.test.ts`

- [ ] Add failing cases proving no grant on trial, restore, a different paywall, expired offer, duplicate event, or sandbox event; prove exactly one receipt on the matched first paid event.
- [ ] In the existing `revenuecat_premium_events/{eventId}` transaction, verify production environment, annual product, `presented_offering_id`, UID, app-user identity and original transaction lineage. Create `level_up_annual_gift_bonus_receipts/{originalTransactionId}` before moving the offer to `granted`.
- [ ] Store `bonusStartsAtMs` at the verified paid annual expiry and `bonusUntilMs` six calendar months later. Resolve Premium as the union of RevenueCat access and active bonus access; never overwrite normal RevenueCat expiry fields.
- [ ] Run the webhook test plus `functions/src/account_delete_revenuecat_phase2.test.ts`; commit `feat: grant annual gift bonus from paid webhook`.

### Task 4: Implement direct annual checkout client boundary

**Files:**
- Create: `app/level_up_annual_gift.ts`
- Test: `tests/level_up_annual_gift_client.test.ts`

- [ ] Test that only `offerings.all.level_up_annual_gift_v1` is read, only its existing yearly package is selected, preview/expired offers reject, and client purchase success remains `awaiting_confirmation`.
- [ ] Implement an account-scoped bounded peek cache, callable reads, countdown/status derivation, and `startGiftCheckout()`. It calls the begin-attempt callable then `Purchases.purchasePackage(yearlyPackage)` directly. It must not route to `/premium_modal` or expose any monthly package.
- [ ] Run the focused test and commit `feat: start annual gift checkout directly`.

### Task 5: Build the exact themed gift UI

**Files:**
- Create: `components/LevelUpAnnualGiftToast.tsx`
- Create: `app/level_up_annual_gift_offer.tsx`
- Create: `app/level_up_annual_gift_assets.ts`
- Create: `assets/images/level_up_annual_gift/<theme>/gift.webp`
- Tests: `tests/level_up_annual_gift_ui_contract.test.ts`, `tests/level_up_annual_gift_assets.test.ts`

- [ ] Test safe-area use, 44×44 close target, swipe dismissal, reduced-motion handling, no “Получить 2 месяца” text, CTA “Получить 18 месяцев”, and a static asset for every supported theme.
- [ ] First add one static `require()` slot for every supported theme. Then generate one approved-style gift image per slot, compress final WebP files, and verify no unreferenced bundled asset remains.
- [ ] Implement the graphite/lime screen, dark `#07110A` CTA text, visible 24-hour timer, truthful trial/paid status and cancellation disclosure. Gate countdown work by focus and AppState.
- [ ] Run focused UI/asset tests and commit `feat: add themed annual gift experience`.

### Task 6: Integrate level-up, Gifts, Plus and settings

**Files:**
- Modify: `app/_layout.tsx`
- Modify: `app/level_gifts_inventory.tsx`
- Modify: the existing Plus/settings Premium-status surface located during implementation
- Test: `tests/level_up_annual_gift_integration.test.ts`

- [ ] Add failing checks that the current automatic `level_up → /premium_modal` push is gone, the toast is queued after existing rewards, Gifts opens `level_up_annual_gift_offer`, and Plus/settings display “Подарок будет начислен после первой оплаты”.
- [ ] Replace only the after-win navigation in `app/_layout.tsx`; retain the full existing level-reward queue. Keep expired gifts auditable but non-actionable. Hydrate the Plus/settings card from the peek cache or reserve its final geometry.
- [ ] Run the new integration test with `tests/level_up_sheet_contract.test.ts` and `tests/overlay_arbiter.test.ts`; commit `feat: replace level-up paywall with saved annual gift`.

### Task 7: Add the live-admin preview requested by the owner

**Files:**
- Modify only: `admin/v2/legacy.html`
- Test: `tests/level_up_annual_gift_admin_contract.test.ts`, `tests/admin_single_surface_contract.test.ts`

- [ ] Add failing checks for a Money/Paywall panel titled “Подарок за уровень”, explicit target-account UID, a single “Создать тестовый подарок” CTA, the `adminPreviewLevelUpAnnualGift` callable, confirm dialog, audit link, and text “Оплату и бонус не создаёт”.
- [ ] Add the compact panel only to `admin/v2/legacy.html`, following the Admin UI Bible: label, hint, tooltip, loading/success/error, one primary CTA and confirm. It creates only a 24-hour preview gift for the entered account so the owner can see toast → offer → Gifts; it can neither open IAP nor grant access.
- [ ] Run focused admin contracts and `node scripts/admin-legacy-button-audit.mjs`; commit `feat: add annual gift admin preview`.

### Task 8: Final focused verification and configuration gate

**Files:** tests only unless a focused failure proves a defect.

- [ ] Run all new annual-gift tests, existing RevenueCat guard tests, existing level-up overlay tests, and admin contracts with `npm test -- <focused paths> --runInBand`.
- [ ] Run `git diff --check` and a syntax check of the extracted inline JavaScript from `admin/v2/legacy.html`.
- [ ] Before enabling the client path, verify manually in RevenueCat that `level_up_annual_gift_v1` contains only the existing annual product and production webhooks provide offering and original transaction fields. Deploy Functions before enabling the feature; use the admin preview with the owner account and prove it cannot create a purchase attempt.

## Self-review

The plan covers the 24-hour timer, only-yearly promise, direct system checkout, gift inventory, Plus/settings disclosure, exactly-once paid-webhook grant, cancellation behavior, themed assets and the requested safe live-admin preview. It deliberately prevents client or admin preview flows from issuing paid access.
