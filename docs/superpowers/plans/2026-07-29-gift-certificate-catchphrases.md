# Gift Certificate Catchphrases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 50 plan-specific catchphrases to each gift certificate, preserve the chosen phrase through checkout, and move activation instructions below the decorated email certificate.

**Architecture:** Keep the authoritative phrase catalog and validation in a focused Functions module, with a browser-safe static mirror checked by contract tests. The gift page owns random selection and preview stability; checkout stores a validated phrase identifier; the email renderer reads the stored identifier and keeps instructional content outside the certificate table.

**Tech Stack:** Static HTML/CSS/JavaScript, TypeScript, Firebase Functions, Firestore, Jest.

---

### Task 1: Phrase catalogs and contracts

**Files:**
- Create: `functions/src/gift_certificate_phrases.ts`
- Create: `knowly-www/assets/gift-certificate-phrases.js`
- Create: `tests/gift_certificate_catchphrases_contract.test.ts`
- Modify: `functions/src/web_checkout.test.ts`

- [ ] **Step 1: Write failing catalog tests**

Assert that `monthly`, `yearly`, and `lifetime` each contain exactly 50 entries; IDs are unique and plan-prefixed; normalized texts are unique across all 150 entries; every text is non-empty and bounded to 90 characters; and the browser mirror contains the same IDs and texts as the Functions catalog.

- [ ] **Step 2: Run tests and confirm RED**

Run: `npx jest tests/gift_certificate_catchphrases_contract.test.ts --runInBand`

Expected: FAIL because the two catalog files do not exist.

- [ ] **Step 3: Add the catalogs and server helpers**

Export these interfaces from `functions/src/gift_certificate_phrases.ts`:

```ts
export type GiftPhrasePlan = 'monthly' | 'yearly' | 'lifetime';
export type GiftPhrase = Readonly<{ id: string; text: string }>;
export const GIFT_CERTIFICATE_PHRASES: Readonly<Record<GiftPhrasePlan, readonly GiftPhrase[]>>;
export function resolveGiftPhrase(plan: GiftPhrasePlan, phraseId: unknown): GiftPhrase;
```

`resolveGiftPhrase` returns the matching plan entry and falls back to a random entry from the same plan. The browser mirror assigns the identical frozen catalog to `window.PHRASEMAN_GIFT_PHRASES` without network requests.

- [ ] **Step 4: Run catalog tests and confirm GREEN**

Run: `npx jest tests/gift_certificate_catchphrases_contract.test.ts --runInBand`

Expected: PASS with 150 unique phrases.

### Task 2: Stable randomized web preview

**Files:**
- Modify: `knowly-www/gift/index.html`
- Modify: `tests/gift_certificate_assets_contract.test.ts`

- [ ] **Step 1: Add failing preview contracts**

Assert that the page loads `/assets/gift-certificate-phrases.js`, renders `#pvCatchphrase`, stores `state.phraseId`, rerolls only through `selectPhraseForPlan(plan)`, includes `giftPhraseId` in `payload()`, and keeps `syncPreview()` free of random selection.

- [ ] **Step 2: Run tests and confirm RED**

Run: `npx jest tests/gift_certificate_assets_contract.test.ts --runInBand`

Expected: FAIL on the absent phrase element and payload field.

- [ ] **Step 3: Implement preview selection and bounded layout**

Add a reserved two-line `.cert-catchphrase` region. On initial selection and every explicit plan selection, choose one catalog entry, store its ID/text in state, and update the region. Name input calls only `syncPreview()`. Add `giftPhraseId: state.phraseId` to both existing payment payloads through the shared `payload()` function.

- [ ] **Step 4: Run tests and confirm GREEN**

Run: `npx jest tests/gift_certificate_assets_contract.test.ts tests/gift_certificate_catchphrases_contract.test.ts --runInBand`

Expected: PASS.

### Task 3: Persist validated phrase identity in paid orders

**Files:**
- Modify: `functions/src/web_checkout.ts`
- Modify: `functions/src/web_checkout.test.ts`

- [ ] **Step 1: Add failing server validation tests**

Test that a valid yearly ID resolves to its yearly phrase, a monthly ID cannot be used for yearly, a missing/stale ID falls back within the purchased plan, and rendered retries use the stored `giftPhraseId` deterministically.

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm test -- --runTestsByPath src/web_checkout.test.ts --runInBand` from `functions/`.

Expected: FAIL because checkout does not accept or persist `giftPhraseId`.

- [ ] **Step 3: Validate once and store with Stripe and PayPal orders**

Extend `NewOrderInput` with `giftPhraseId?: string`. At each gift checkout entry point, call `resolveGiftPhrase(plan, body.giftPhraseId)`, and persist the resulting stable ID as `giftPhraseId`. Non-gift orders store no phrase. Do not change prices, provider parameters, activation code generation, or payment status handling.

- [ ] **Step 4: Run Functions tests and confirm GREEN**

Run: `npm test -- --runTestsByPath src/web_checkout.test.ts --runInBand` from `functions/`.

Expected: PASS.

### Task 4: Clean certificate email and separate instructions

**Files:**
- Modify: `functions/src/web_checkout.ts`
- Modify: `functions/src/web_checkout.test.ts`

- [ ] **Step 1: Add failing email-boundary tests**

Mark the decorated table with `data-gift-certificate-art="true"` and the instruction card with `data-gift-instructions="true"`. Extract the certificate table in tests and assert it contains the plan, names, resolved phrase, real code, and expiry, while excluding the activation heading, numbered instructions, delivery note, support address, and test warning. Assert all excluded information appears after the certificate table.

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm test -- --runTestsByPath src/web_checkout.test.ts --runInBand` from `functions/`.

Expected: FAIL because instructions currently live inside the certificate table.

- [ ] **Step 3: Recompose gift email HTML**

Inside the certificate panel render product/name lines, `<div data-gift-catchphrase="true">`, plain `data-gift-code="true"`, and expiry only. Close the certificate table, then append a neutral `data-gift-instructions="true"` card containing the test notice when present, activation steps, delivery guidance, and support. Mirror the same information order in the plain-text body.

- [ ] **Step 4: Run focused verification**

Run from repository root:

```powershell
npx jest tests/gift_certificate_assets_contract.test.ts tests/gift_certificate_catchphrases_contract.test.ts --runInBand
Set-Location functions
npm test -- --runTestsByPath src/web_checkout.test.ts --runInBand
npm run build
```

Expected: all focused tests pass and TypeScript builds without errors.

- [ ] **Step 5: Commit implementation**

Stage only the catalog, gift page, checkout module, and focused tests. Commit with `feat(gift): add plan-specific certificate catchphrases`.
