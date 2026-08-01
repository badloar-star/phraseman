# Gift Certificates Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure «Подарочные сертификаты» section to the live legacy admin so an administrator can generate a batch of real, one-time Phraseman certificates, see them later, enter each recipient name, and download each certificate.

**Architecture:** The server remains authority for product type, code generation, creation time, 365-day expiry, and audit evidence. `admin/v2/legacy.html` is only the accessible control surface and uses authenticated App Check-protected callables; it never generates redeemable codes locally. Certificate downloads use the static plan artwork plus saved recipient name and code.

**Tech Stack:** Firebase Functions v2, Firestore transactions, Firebase callables, static WebP assets, and the existing live admin page `admin/v2/legacy.html`.

---

### Task 1: Define and test the server-side certificate batch contract

**Files:**
- Modify: `functions/src/web_checkout.ts`
- Modify: `functions/src/index.ts`
- Modify: `functions/src/web_checkout.test.ts`

- [ ] **Step 1: Write failing focused tests**

Add tests for `createGiftCertificateBatchPlan` and `adminCreateGiftCertificateBatch` with:

```ts
{
  product: 'monthly' | 'yearly' | 'lifetime',
  count: 1,
  recipientNames: ['Профессор Лингман'],
  source: 'admin_gift_certificates',
  authorization: 'CREATE_GIFT_CERTIFICATES'
}
```

Assert one `GIFT-` code, `maxRedemptions: 1`, `usedCount: 0`, `enabled: true`, server issue time, product-correct expiry, immutable product metadata, a persisted certificate record, and one audit entry. Assert invalid product, count outside 1..200, blank/duplicate recipient names, non-admin/App Check denial, and code collision are rejected.

- [ ] **Step 2: Run test red**

Run: `npm --prefix functions test -- --runInBand src/web_checkout.test.ts`

Expected: FAIL because the batch plan/callable does not exist.

- [ ] **Step 3: Implement the minimal server callable**

Add `adminCreateGiftCertificateBatch` with hard App Check, admin role and `money.manual_access.write`, an authorization phrase, server product map (`monthly: 31`, `yearly: 366`, `lifetime`), `count <= 200`, and transactionally created promo code, certificate metadata, and audit records. Persist `certificateId`, `activationCode`, `product`, `recipientName`, `createdAtMs`, `expiresAtMs`, `status: 'generated'`, and static asset URL. Return only IDs and display-safe metadata.

- [ ] **Step 4: Run test green and export the callable**

Run: `npm --prefix functions test -- --runInBand src/web_checkout.test.ts`

Expected: PASS. Export only `adminCreateGiftCertificateBatch` from `functions/src/index.ts`; do not change unrelated exports.

### Task 2: Add the live admin section and per-certificate downloads

**Files:**
- Modify: `admin/v2/legacy.html`
- Create: `tests/admin_v2_gift_certificates_contract.test.ts`
- Modify: `tests/admin_v2_promo_codes_contract.test.ts`

- [ ] **Step 1: Write failing UI contract**

Assert only `admin/v2/legacy.html` contains a `gift-certificates` tab under «Деньги», calls `httpsCallable(functionsUs, 'adminCreateGiftCertificateBatch')`, has labelled plan and quantity fields, pre-issue preview/confirmation, a persisted certificate table, recipient-name input, and one labelled download action per row. Assert frozen admin files are unchanged.

- [ ] **Step 2: Run contract red**

Run: `npx jest --runInBand tests/admin_v2_gift_certificates_contract.test.ts`

Expected: FAIL because the live section does not exist.

- [ ] **Step 3: Add the section**

In `admin/v2/legacy.html`, add «Подарочные сертификаты» in the existing «Деньги» category. Add a single primary «Сгенерировать сертификаты» button, labelled type/quantity fields, preview text, explicit confirm modal, loading/error/empty states, tooltips, visible focus, and keyboard-operable controls. Do not edit frozen admin files.

- [ ] **Step 4: Render safe download records**

Reload persisted records after creation and show certificate ID, plan, code, recipient, issued date, expiry, redemption status, and «Скачать» per row. The download uses saved server data and the matching static plan asset; it refuses download until saved recipient name is non-empty and escapes all dynamic text. A repeated download must not create a second code.

- [ ] **Step 5: Run UI contracts green**

Run: `npx jest --runInBand tests/admin_v2_gift_certificates_contract.test.ts tests/admin_v2_promo_codes_contract.test.ts`

Expected: PASS.

### Task 3: Verify and make only targeted releases

**Files:**
- Modify only the test files above if verification reveals a missing contract.

- [ ] **Step 1: Run deterministic gates**

```bash
npm --prefix functions test -- --runInBand src/web_checkout.test.ts
npx jest --runInBand tests/admin_v2_gift_certificates_contract.test.ts tests/admin_v2_promo_codes_contract.test.ts
npx tsc --noEmit -p functions/tsconfig.json
git diff --check
```

Expected: selected tests pass, typecheck exits 0, and no whitespace errors.

- [ ] **Step 2: Manual staging check**

Generate one yearly certificate for «Профессор Лингман». Verify it uses yearly art, has the exact saved name and a server-existing one-time code, expires 366 days after creation, and a second download adds no code.

- [ ] **Step 3: Targeted release**

Deploy exactly the six gift-certificate callables, then only hosting target `admin`. Never deploy all Functions:

```powershell
firebase deploy --only functions:adminCreateGiftCertificateBatch,functions:adminListGiftCertificates,functions:adminUpdateGiftCertificateRecipient,functions:adminGetGiftCertificateDownload,functions:adminReplaceSyntheticGiftCertificate,functions:adminSendPreparedGiftCertificate
npm run hosting:admin
```

- [ ] **Step 4: Production smoke check**

Open live `legacy.html#gift-certificates`, confirm records load and there are no console errors. Do not issue a production certificate during this smoke check.

## Self-review

- Covers type, quantity, real one-time code, creation-based expiry, persisted history, recipient name, individual download, confirmation, audit, and targeted release.
- Keeps the only live admin surface in `admin/v2/legacy.html`.
- Uses the server as the only source of redeemable codes and certificate metadata.
