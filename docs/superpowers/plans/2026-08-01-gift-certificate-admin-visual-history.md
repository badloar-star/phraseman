# Gift Certificate Admin Visual History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each created gift certificate as a faithful visual card with activation status/date and require canonical named or anonymous personalization before download or email.

**Architecture:** Keep `admin/v2/legacy.html` as the only admin surface. Add pure server helpers for personalization and status, persist action personalization in a dedicated protected callable, and make list/download/email all consume the same canonical record. Preserve the existing recipient-update callable and sent-record lock; the new UI moves editable fields into an on-demand accessible modal without deleting existing behavior.

**Tech Stack:** TypeScript Firebase Cloud Functions, Firestore transactions, Jest, plain HTML/CSS/JavaScript, Canvas, Playwright.

---

### Task 1: Canonical personalization and activation status helpers

**Files:**
- Modify: `functions/src/web_checkout.ts:550-710`
- Test: `functions/src/web_checkout.test.ts:433-620`

- [ ] **Step 1: Write failing tests for named, anonymous, legacy, and redeemed records**

Add imports and focused cases using the real pure helpers:

```ts
import {
  buildGiftCertificatePersonalizationUpdate,
  deriveGiftCertificateAdminStatus,
  resolveGiftCertificatePersonalization,
} from './web_checkout';

describe('gift certificate personalization', () => {
  const current = {
    certificateId: 'GIFT-XEBFWNPL99',
    activationCode: 'GIFT-XEBFWNPL99',
    product: 'yearly',
    plan: 'yearly',
    gift: true,
    testIssue: false,
    assetUrl: 'https://knowlyapps.com/assets/gift-certificates/gift-certificate-yearly.webp',
    recipientName: 'Профессор Лингман',
    recipientEmail: 'badloar@gmail.com',
    giftTo: 'Профессор Лингман',
    giftFrom: 'Phraseman',
    createdAtMs: 1_000,
    updatedAtMs: 1_000,
    expiresAtMs: 10_000,
    codeExpiresAtMs: 10_000,
  };
  const promo = {
    enabled: true,
    maxRedemptions: 1,
    usedCount: 0,
    expiresAtMs: 10_000,
    certificateId: 'GIFT-XEBFWNPL99',
    certificateProduct: 'yearly',
    rewardDays: 366,
    rewardKind: 'days',
  };

  it('falls back to existing names for a legacy record', () => {
    expect(resolveGiftCertificatePersonalization(current)).toEqual({
      personalizationMode: 'named',
      displayRecipientName: 'Профессор Лингман',
      displaySenderName: 'Phraseman',
    });
  });

  it('keeps saved names but hides both display lines in anonymous mode', () => {
    expect(resolveGiftCertificatePersonalization({
      ...current,
      personalizationMode: 'anonymous',
      displayRecipientName: 'Профессор Лингман',
      displaySenderName: 'Команда Phraseman',
    })).toEqual({
      personalizationMode: 'anonymous',
      displayRecipientName: '',
      displaySenderName: '',
    });
  });

  it('reports the server redemption timestamp', () => {
    expect(deriveGiftCertificateAdminStatus(
      current,
      { ...promo, usedCount: 1, lastRedeemedAtMs: 7_500 },
      8_000,
    )).toEqual({ key: 'redeemed', label: 'Активирован', activatedAtMs: 7_500 });
  });
});
```

- [ ] **Step 2: Run the server suite and verify RED**

Run:

```powershell
npm test -- --runInBand --no-cache src/web_checkout.test.ts
```

Expected: FAIL because the three new exports do not exist.

- [ ] **Step 3: Implement the pure helpers**

Add exact exported boundaries:

```ts
export type GiftCertificatePersonalizationMode = 'named' | 'anonymous';

export function resolveGiftCertificatePersonalization(record: FirebaseFirestore.DocumentData): {
  personalizationMode: GiftCertificatePersonalizationMode;
  displayRecipientName: string;
  displaySenderName: string;
} {
  const personalizationMode = record.personalizationMode === 'anonymous' ? 'anonymous' : 'named';
  const savedRecipient = cleanShortText(
    record.displayRecipientName ?? record.recipientName ?? record.giftTo,
    60,
  );
  const savedSender = cleanShortText(record.displaySenderName ?? record.giftFrom, 60) || 'Phraseman';
  return {
    personalizationMode,
    displayRecipientName: personalizationMode === 'named' ? savedRecipient : '',
    displaySenderName: personalizationMode === 'named' ? savedSender : '',
  };
}

export function deriveGiftCertificateAdminStatus(
  record: FirebaseFirestore.DocumentData,
  promo: FirebaseFirestore.DocumentData,
  nowMs: number,
): { key: 'available' | 'redeemed' | 'expired' | 'disabled'; label: string; activatedAtMs: number } {
  const usedCount = Math.max(0, Math.trunc(Number(promo.usedCount ?? 0)) || 0);
  const activatedAtMs = Math.max(0, Math.trunc(Number(promo.lastRedeemedAtMs ?? 0)) || 0);
  if (usedCount > 0) return { key: 'redeemed', label: 'Активирован', activatedAtMs };
  if (promo.enabled !== true) return { key: 'disabled', label: 'Отключён', activatedAtMs: 0 };
  const expiresAtMs = Math.max(0, Math.trunc(Number(record.expiresAtMs ?? promo.expiresAtMs ?? 0)) || 0);
  if (expiresAtMs <= nowMs) return { key: 'expired', label: 'Истёк', activatedAtMs: 0 };
  return { key: 'available', label: 'Не активирован', activatedAtMs: 0 };
}
```

Implement `buildGiftCertificatePersonalizationUpdate` with an explicit input type, the same identity/product/promo checks as download, optimistic concurrency, named-mode validation for both names, optional validated email, and a patch that preserves saved names in anonymous mode.

- [ ] **Step 4: Run the server suite and verify GREEN**

Run the same command. Expected: all `src/web_checkout.test.ts` tests PASS.

- [ ] **Step 5: Commit the pure server contract**

```powershell
git add -- functions/src/web_checkout.ts functions/src/web_checkout.test.ts
git commit -m "feat(gift): add canonical certificate personalization"
```

### Task 2: Protected personalization persistence and audit

**Files:**
- Modify: `functions/src/web_checkout.ts:617-710`
- Modify: `functions/src/web_checkout.ts:1330-1450`
- Test: `functions/src/web_checkout.test.ts:433-650`
- Test: `tests/admin_v2_gift_certificates_contract.test.ts`

- [ ] **Step 1: Add failing cases for fail-closed mutations**

Cover these inputs with `it.each`: missing authorization, invalid mode, missing either named-mode field, invalid email, stale `expectedUpdatedAtMs`, redeemed promo, disabled promo, expired promo, mismatched certificate ID/product/reward, and attempted mutation after delivery status `sent`.

Use the exact desired input:

```ts
const input = {
  authorization: 'UPDATE_GIFT_CERTIFICATE_PERSONALIZATION',
  certificateId: 'GIFT-XEBFWNPL99',
  personalizationMode: 'named',
  displayRecipientName: 'Профессор Лингман',
  displaySenderName: 'Команда Phraseman',
  recipientEmail: 'badloar@gmail.com',
  expectedUpdatedAtMs: 1_000,
};
```

Add a source contract expecting `export const adminUpdateGiftCertificatePersonalization = onCall(` and the exact authorization token.

- [ ] **Step 2: Run both focused suites and verify RED**

```powershell
npm --prefix functions test -- --runInBand --no-cache src/web_checkout.test.ts
npx jest --runInBand --no-cache --runTestsByPath tests/admin_v2_gift_certificates_contract.test.ts
```

Expected: server validation cases and callable source contract FAIL because the new callable is missing.

- [ ] **Step 3: Add the protected callable without removing the legacy callable**

Export `adminUpdateGiftCertificatePersonalization` with `GIFT_CERTIFICATE_MUTATION_OPTIONS`. In one Firestore transaction, read delivery and promo, call the pure update helper, update only the delivery record, and create an `admin_log` document:

```ts
{
  action: 'gift_certificate_personalization_update',
  targetUid: certificateId,
  details: {
    certificateId,
    previousMode,
    nextMode: result.record.personalizationMode,
    recipientNameChanged,
    senderNameChanged,
    recipientEmailChanged,
  },
  adminEmail: actorEmail,
  adminUid: actorUid,
  ts: new Date(nowMs).toISOString(),
}
```

Do not put the raw email or full names into `details`. Return `giftCertificateDisplayRecord(...)`. Keep `adminUpdateGiftCertificateRecipient` exported for compatibility.

- [ ] **Step 4: Extend the list display record**

Make `giftCertificateDisplayRecord` return `personalizationMode`, the saved display fields, derived `redemptionStatus`, human-readable `redemptionLabel`, and `lastRedeemedAtMs`. Pass a single captured `nowMs` from `adminListGiftCertificates` so all records in a page use the same expiry boundary.

- [ ] **Step 5: Run both focused suites and verify GREEN**

Expected: both commands exit 0 with no failed tests.

- [ ] **Step 6: Commit persistence and audit**

```powershell
git add -- functions/src/web_checkout.ts functions/src/web_checkout.test.ts tests/admin_v2_gift_certificates_contract.test.ts
git commit -m "feat(gift): persist admin certificate personalization"
```

### Task 3: Make download and email consume the same personalization

**Files:**
- Modify: `functions/src/web_checkout.ts:652-710`
- Modify: `functions/src/web_checkout.ts:1060-1140`
- Modify: `functions/src/web_checkout.ts:1503-1585`
- Test: `functions/src/web_checkout.test.ts:433-900`

- [ ] **Step 1: Write failing parity tests**

Add named and anonymous cases proving:

```ts
expect(buildGiftCertificateDownloadDisplayRecord(id, namedRecord, promo)).toMatchObject({
  personalizationMode: 'named',
  displayRecipientName: 'Профессор Лингман',
  displaySenderName: 'Команда Phraseman',
});

expect(buildGiftCertificateDownloadDisplayRecord(id, anonymousRecord, promo)).toMatchObject({
  personalizationMode: 'anonymous',
  displayRecipientName: '',
  displaySenderName: '',
  recipientEmail: 'badloar@gmail.com',
});
```

Add email HTML/text tests asserting that named output contains `Для:` and `от`, while anonymous output contains neither label but still contains the product title and activation code.

- [ ] **Step 2: Run the server suite and verify RED**

Run `npm --prefix functions test -- --runInBand --no-cache src/web_checkout.test.ts`.

Expected: anonymous download/email assertions FAIL because the old renderers use `recipientName`, `giftTo`, and `giftFrom` directly.

- [ ] **Step 3: Route both renderers through one resolved view**

Make the download record expose internal `recipientName` only for admin identity and use `displayRecipientName` / `displaySenderName` for visual composition. Before `sendActivationEmail`, derive an email-only copy:

```ts
const personalization = resolveGiftCertificatePersonalization(claim.delivery);
const sent = await sendActivationEmail({
  ...claim.delivery,
  giftTo: personalization.displayRecipientName,
  giftFrom: personalization.displaySenderName,
  orderId: deliveryId,
  email: claim.decision.email,
  testIssue: false,
}, deliveryRef, deliveryId);
```

Keep the email address and internal recipient identity unchanged. Retain the second server read/validation in download and the send transaction so a redemption between modal submit and action fails closed.

- [ ] **Step 4: Run the server suite and verify GREEN**

Expected: the full focused server suite exits 0.

- [ ] **Step 5: Commit renderer parity**

```powershell
git add -- functions/src/web_checkout.ts functions/src/web_checkout.test.ts
git commit -m "fix(gift): align certificate download and email names"
```

### Task 4: Render visual certificate entities and explicit statuses in the live admin

**Files:**
- Modify: `admin/v2/legacy.html:4920-5000`
- Modify: `admin/v2/legacy.html:35020-35120`
- Test: `tests/admin_v2_gift_certificates_contract.test.ts`

- [ ] **Step 1: Add failing executable admin contracts**

Extract the actual helper bodies from `legacy.html` and execute them with representative records. Assert that:

```ts
expect(giftCertificateStatusView({
  redemptionStatus: 'redeemed',
  lastRedeemedAtMs: 1_775_000_000_000,
}).label).toBe('Активирован');

expect(giftCertificateStatusView({
  redemptionStatus: 'available',
  expiresAtMs: Date.now() + 86_400_000,
}).label).toBe('Не активирован');

const html = giftCertificateRowHtml(namedRecord);
expect(html).toContain('gift-cert-visual');
expect(html).toContain('gift-certificate-yearly.webp');
expect(html).toContain('Профессор Лингман');
expect(html).toContain('Активирован');
```

Add an anonymous record and assert that neither saved display name appears in the visual overlay.

- [ ] **Step 2: Run the admin contract and verify RED**

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/admin_v2_gift_certificates_contract.test.ts
```

Expected: FAIL because `.gift-cert-visual` and `giftCertificateStatusView` do not exist.

- [ ] **Step 3: Replace the flat row layout with an operational visual entity**

Add CSS for a responsive two-column history grid and a 3:2 preview. Use the allowlisted `record.assetUrl` only after `giftCertificateAssertAsset(record)`. The overlay must contain the same canonical header, product title, phrase, display names when named, code, and expiry. Add textual badges with `data-status="available|redeemed|expired|disabled"`; lime/success surfaces use `#07110a` text.

Keep details and actions in the same entity below the preview. Do not add a decorative card inside the entity. At widths below 860 px use one column; buttons remain at least 44 px high.

- [ ] **Step 4: Implement truthful status copy**

Add:

```js
function giftCertificateStatusView(record) {
  if (record.redemptionStatus === 'redeemed') return {
    key: 'redeemed',
    label: 'Активирован',
    detail: Number(record.lastRedeemedAtMs) > 0
      ? `Дата активации: ${giftCertificateDate(record.lastRedeemedAtMs)}`
      : 'Дата активации не записана',
  };
  if (record.redemptionStatus === 'disabled') return { key: 'disabled', label: 'Отключён', detail: '' };
  if (Number(record.expiresAtMs) <= Date.now()) return { key: 'expired', label: 'Истёк', detail: '' };
  return { key: 'available', label: 'Не активирован', detail: '' };
}
```

Show delivery state separately from activation state.

- [ ] **Step 5: Run the admin contract and verify GREEN**

Expected: the contract exits 0.

- [ ] **Step 6: Commit the visual history**

```powershell
git add -- admin/v2/legacy.html tests/admin_v2_gift_certificates_contract.test.ts
git commit -m "feat(admin): show visual gift certificate history"
```

### Task 5: Add the accessible personalization modal and wire both actions

**Files:**
- Modify: `admin/v2/legacy.html:4920-5000`
- Modify: `admin/v2/legacy.html:35020-35520`
- Test: `tests/admin_v2_gift_certificates_contract.test.ts`

- [ ] **Step 1: Write failing modal and action-flow contracts**

Assert the real extracted code provides:

- `giftCertificateOpenPersonalizationModal(record, action)`;
- radio values `named` and `anonymous`;
- labels `Кому`, `От кого`, and `Email получателя`;
- named-mode validation for both display fields;
- anonymous output with both display strings empty and the original saved names preserved;
- email required only for action `send`;
- both `downloadGiftCertificate` and `sendGiftCertificateEmail` await the modal before the mutation callable;
- the callable authorization is `UPDATE_GIFT_CERTIFICATE_PERSONALIZATION`.

- [ ] **Step 2: Run the admin contract and verify RED**

Run the same focused Jest command. Expected: FAIL because the modal and new callable client are absent.

- [ ] **Step 3: Implement the on-demand modal**

Create the modal DOM only when invoked and remove it on settle. Use a fieldset with two radios, real labels, one primary action, one cancel action, `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus containment, Escape cancellation, and visible inline errors. In anonymous mode disable the two name inputs but retain their values in memory. For `send`, show and require the email field; for `download`, do not require email.

Return this exact shape:

```js
{
  personalizationMode: mode,
  displayRecipientName: mode === 'named' ? recipientName : savedRecipientName,
  displaySenderName: mode === 'named' ? senderName : savedSenderName,
  recipientEmail,
}
```

The server uses `personalizationMode` to hide saved names in anonymous output.

- [ ] **Step 4: Persist before either action**

Replace inline row inputs with the modal flow and add a client callable cache for `adminUpdateGiftCertificatePersonalization`. Send `expectedUpdatedAtMs`, update `_giftCertificateRecords` from the returned record, and rerender history before continuing.

For an already-sent record, preserve the existing lock: open a read-only modal explaining that personalization was fixed when the email was sent; allow download with the existing values but do not call the mutation callable. For redeemed, expired, or disabled records, disable both actions and show the status reason.

- [ ] **Step 5: Make Canvas conditional on canonical display names**

In `downloadGiftCertificate`, draw `Для:` and `от` only when `canonical.personalizationMode === 'named'` and the corresponding display value exists. Use the same saved vertical slots so anonymous mode does not shift the product title into the public header area.

- [ ] **Step 6: Make send use the same modal result**

For `sendGiftCertificateEmail`, require email in the modal, persist personalization, show a final summary inside the same modal action state, then call `sendPreparedGiftCertificate`. Do not add a second native/browser modal. Disable the primary button during both server calls and keep row status feedback.

- [ ] **Step 7: Run the admin and server suites and verify GREEN**

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/admin_v2_gift_certificates_contract.test.ts tests/gift_certificate_assets_contract.test.ts tests/gift_certificate_catchphrases_contract.test.ts
npm --prefix functions test -- --runInBand --no-cache src/web_checkout.test.ts
```

Expected: all suites exit 0.

- [ ] **Step 8: Commit the action modal**

```powershell
git add -- admin/v2/legacy.html functions/src/web_checkout.ts functions/src/web_checkout.test.ts tests/admin_v2_gift_certificates_contract.test.ts
git commit -m "feat(admin): personalize gift certificate actions"
```

### Task 6: Visual, responsive, compiler, and independent review gates

**Files:**
- Verify: `admin/v2/legacy.html`
- Verify: `functions/src/web_checkout.ts`
- Verify: `functions/src/web_checkout.test.ts`
- Verify: `tests/admin_v2_gift_certificates_contract.test.ts`
- Create ignored artifacts: `.codex-tmp/gift-certificate-admin-review/`

- [ ] **Step 1: Run all narrow automated gates fresh**

```powershell
npx jest --runInBand --no-cache --runTestsByPath tests/admin_v2_gift_certificates_contract.test.ts tests/gift_certificate_assets_contract.test.ts tests/gift_certificate_catchphrases_contract.test.ts
npm --prefix functions test -- --runInBand --no-cache src/web_checkout.test.ts
Push-Location functions
try { npx tsc --noEmit --pretty false } finally { Pop-Location }
git diff --check -- admin/v2/legacy.html functions/src/web_checkout.ts functions/src/web_checkout.test.ts tests/admin_v2_gift_certificates_contract.test.ts
```

Expected: zero failed tests, TypeScript exit 0, and no `git diff --check` errors.

- [ ] **Step 2: Render real visual fixtures**

Use Playwright against extracted live-admin functions and the three real WebPs. Save named and anonymous screenshots plus 375, 768, 1024, and 1440 px history screenshots under `.codex-tmp/gift-certificate-admin-review/`. Confirm no page-level horizontal scroll, no clipped button labels, and matching preview/PNG personalization.

- [ ] **Step 3: Run an independent critical review**

Review the bounded diff for admin authorization, Firestore transaction integrity, recipient/email privacy, status truthfulness, sent-record immutability, anonymous-mode parity, accessibility, and missing tests. Any material finding returns to the relevant RED step before completion.

- [ ] **Step 4: Report completion without deploying**

Report exact passing counts, TypeScript result, visual artifact paths, and remaining production E2E boundary. Do not deploy Functions or Hosting without a separate explicit release request.
