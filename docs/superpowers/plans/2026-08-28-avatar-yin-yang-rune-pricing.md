# Avatar Yin/Yang Rune Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Avatar Studio around a fixed try-on stage and an `Инь` / `Янь` selector, selling Yin/black avatar styles only for runes and Yang/light styles only for pearls through retry-safe composite economy operations.

**Architecture:** Keep the existing avatar/aura catalogs, snapshot service, pearl ledger, and canonical rune projection. Add currency as an explicit catalog/draft/purchase dimension, derive rune prices from the existing pearl tier at a fixed retail rate of 80, and add a versioned customization-rune exact result that is committed atomically with its ownership grant. Move the large preview outside the scrolling `FlatList`; tile taps remain preview-only, while the single bottom action opens the editor and the editor owns the final buy/apply action.

**Tech Stack:** React Native, Expo Router, TypeScript, AsyncStorage, PhoneState economy reducer/bridge, Jest source and behavior contracts.

---

## Working-tree safety

The checkout already contains concurrent owner work in several target files, including `app/avatar_select.tsx`, `app/customization_catalog.ts`, `app/customization_draft.ts`, `app/customization_purchase_intent.ts`, `app/customization_service.ts`, `app/runes_system.ts`, and their tests. Every task must begin with `git diff --` against every path listed in that task and preserve those edits. Do not reset, restore, create a branch/worktree, or replace a whole file. There is one writer only.

Before every Jest, TypeScript, or build command, acquire the shared slot and release it in `finally`:

```powershell
bash .claude/semaphore/slot.sh acquire "jest avatar yin yang"
try { npx jest --runTestsByPath tests/customization_catalog.test.ts --no-cache --runInBand } finally { bash .claude/semaphore/slot.sh release }
```

If a task is committed while the worktree remains dirty, stage only the named hunks after reviewing `git diff --cached`; do not absorb unrelated pre-existing changes.

### Task 1: Canonical Yin/Yang pricing and catalog currency

**Files:**

- Modify: `constants/custom_avatars.ts`
- Modify: `app/customization_catalog.ts`
- Modify: `tests/customization_catalog.test.ts`
- Modify: `tests/avatar100_catalog_activation.test.ts`

- [ ] Add failing catalog tests for every existing price tier and for the two side modes. The required assertions are:

```ts
expect(getCustomAvatarRuneCost(50)).toBe(4_000);
expect(getCustomAvatarRuneCost(70)).toBe(5_600);
expect(getCustomAvatarRuneCost(100)).toBe(8_000);
expect(getCustomAvatarRuneCost(150)).toBe(12_000);
expect(getCustomAvatarRuneCost(300)).toBe(24_000);
expect(getCustomAvatarRuneCost(500)).toBe(40_000);
expect(getCustomAvatarRuneCost(1_000)).toBe(80_000);
expect(getCustomAvatarRuneCost(3_000)).toBe(240_000);

expect(buildAvatarCatalog({ ...base, side: 'yin' })[0]).toMatchObject({
  availability: { kind: 'runes' },
});
expect(parseCustomAvatarValue(buildAvatarCatalog({ ...base, side: 'yin' })[0].previewValue)?.logoColor)
  .toBe('black');
expect(buildAvatarCatalog({ ...base, side: 'yang' })[0]).toMatchObject({
  availability: { kind: 'shards' },
});
expect(parseCustomAvatarValue(buildAvatarCatalog({ ...base, side: 'yang' })[0].previewValue)?.logoColor)
  .toBe('white');
```

- [ ] Run `tests/customization_catalog.test.ts` and confirm RED because `side`, `runes`, and `getCustomAvatarRuneCost` do not exist.
- [ ] Add the fixed retail pricing contract to `constants/custom_avatars.ts`:

```ts
export const CUSTOM_AVATAR_RUNE_RATE = 80;
export const CUSTOM_AVATAR_RUNE_RESTYLE_COST = CUSTOM_AVATAR_RESTYLE_COST * CUSTOM_AVATAR_RUNE_RATE;

export function getCustomAvatarRuneCost(avatarOrPearlCost: CustomAvatarDef | string | number): number {
  const pearlCost = typeof avatarOrPearlCost === 'number'
    ? avatarOrPearlCost
    : getCustomAvatarPurchaseCost(avatarOrPearlCost);
  if (!Number.isSafeInteger(pearlCost) || pearlCost <= 0) throw new Error('invalid_custom_avatar_price');
  return pearlCost * CUSTOM_AVATAR_RUNE_RATE;
}
```

- [ ] Extend `CatalogAvailability` without overloading pearl semantics:

```ts
export type CustomizationCurrency = 'pearls' | 'runes';
export type AvatarSide = 'yin' | 'yang';

export type CatalogAvailability =
  | { kind: 'owned' }
  | { kind: 'shards'; cost: number }
  | { kind: 'runes'; cost: number }
  | { kind: 'level'; level: number }
  | { kind: 'plus' }
  | { kind: 'pro' }
  | { kind: 'reward' }
  | { kind: 'none' };

export interface BuildAvatarCatalogInput {
  // existing fields stay unchanged
  side?: AvatarSide;
}
```

- [ ] In `buildAvatarCatalog`, default `side` to `yang`, preserve the stored style for owned/active items only when opening the screen, and force all displayed tile previews to the currently selected side. Unowned Yin must use `logoColor: 'black'` plus `{ kind: 'runes', cost: getCustomAvatarRuneCost(avatar) }`; unowned Yang must use `logoColor: 'white'` plus the existing pearl price. Aura catalog behavior remains byte-for-byte equivalent.
- [ ] Re-run `tests/customization_catalog.test.ts tests/avatar100_catalog_activation.test.ts`; expect GREEN and unchanged aura/dev-unlock/retired-sale behavior.
- [ ] Review `git diff -- constants/custom_avatars.ts app/customization_catalog.ts tests/customization_catalog.test.ts tests/avatar100_catalog_activation.test.ts` and commit only reviewed hunks with message `feat: add yin yang avatar pricing model`.

### Task 2: Currency-aware draft resolution

**Files:**

- Modify: `app/customization_draft.ts`
- Modify: `tests/customization_draft.test.ts`

- [ ] Add failing tests proving that purchase/restyle currency follows the preview artwork, not the previously owned style:

```ts
expect(resolveCustomizationAction(yangUnowned)).toMatchObject({
  kind: 'buy-and-apply', target: 'avatar', currency: 'pearls', cost: 50,
});
expect(resolveCustomizationAction(yinUnowned)).toMatchObject({
  kind: 'buy-and-apply', target: 'avatar', currency: 'runes', cost: 4_000,
});
expect(resolveCustomizationAction(yangRestyle)).toMatchObject({
  purchaseKind: 'restyle', currency: 'pearls', cost: 25,
});
expect(resolveCustomizationAction(yinRestyle)).toMatchObject({
  purchaseKind: 'restyle', currency: 'runes', cost: 2_000,
});
expect(resolveCustomizationAction(exactOwnedStyle)).toEqual({ kind: 'apply' });
```

- [ ] Run `tests/customization_draft.test.ts`; expect RED on the missing `currency` and rune-restyle branch.
- [ ] Make purchase actions carry an explicit currency:

```ts
type PurchaseAction = {
  kind: 'buy-and-apply' | 'buy-only';
  target: 'avatar' | 'aura';
  purchaseKind: 'purchase' | 'restyle';
  currency: CustomizationCurrency;
  cost: number;
};
```

- [ ] Resolve initial purchase currency from `availability.kind`. Resolve owned-avatar restyle currency from `parseCustomAvatarValue(draft.previewAvatarValue).logoColor`: black maps to `runes`/`CUSTOM_AVATAR_RUNE_RESTYLE_COST`, white maps to `pearls`/`CUSTOM_AVATAR_RESTYLE_COST`. Keep all auras pearl-only.
- [ ] Re-run the focused draft test; expect GREEN, including exact-style free apply and simultaneous avatar/aura purchase selection.
- [ ] Review the focused diff and commit with message `feat: resolve avatar actions by currency`.

### Task 3: Reusable segmented controls and currency rendering

**Files:**

- Modify: `components/customization/CustomizationControls.tsx`
- Modify: `components/customization/CustomizationCatalogCard.tsx`
- Modify: `components/customization/AvatarEditorSheet.tsx`
- Modify: `components/customization/CustomizationHero.tsx`
- Modify: `tests/customization_icon_tabs_contract.test.ts`
- Modify: `tests/avatar_select_studio_contract.test.ts`
- Add: `tests/avatar_yin_yang_ui_contract.test.ts`

- [ ] Add RED source/UI contracts requiring:

  - visible side labels exactly `Инь` and `Янь`;
  - no visible `чёрный`, `светлый`, `цена в рунах`, or `цена в жемчуге` copy in either side control;
  - `CustomizationHero` has no `onEdit`, `editLabel`, or `customization-hero-edit-chip`;
  - cards and CTA use `RuneGlyph` for rune actions and the existing pearl image for pearl actions;
  - lime actions keep `t.correctText`;
  - each segment exposes `accessibilityRole="tab"` and selected state.

- [ ] Run the three focused contract tests; expect RED.
- [ ] Replace the two icon-only Avatar/Aura circles with one compact 44-point-minimum segmented control that visibly says `Аватар` and `Аура`. Add a reusable `YinYangControl` in the same file:

```tsx
const SIDE_OPTIONS = [
  { id: 'yin' as const, label: 'Инь' },
  { id: 'yang' as const, label: 'Янь' },
];

<TapScale
  accessibilityRole="tab"
  accessibilityState={{ selected }}
  accessibilityLabel={accessibilityLabelForSide(option.id)}
>
  <Text>{option.label}</Text>
</TapScale>
```

The visible `Text` must contain only the short label; full black/light and currency meaning belongs only in `accessibilityLabel`.

- [ ] Change `CustomizationActionBar` props from bare `cost` to `price: { currency: CustomizationCurrency; amount: number } | null`; render `RuneGlyph` for runes and `pearlIconForTheme` for pearls. Format amounts with the existing locale/number formatter instead of raw ungrouped strings.
- [ ] Extend `AvailabilityChip` to branch on `availability.kind === 'runes'` and render the canonical `RuneGlyph`. Keep tier accent based on the canonical pearl tier passed as `tierPrice`.
- [ ] Simplify `AvatarEditorSheet` props to receive `confirmLabel`, `confirmPrice`, `busy`, `yinLabel`, `yangLabel`, and accessibility labels. Remove direct use of `CUSTOM_AVATAR_RESTYLE_COST`; the resolved action is the only price authority. Disable the CTA while busy.
- [ ] Remove `onEdit`/`editLabel` and the palette chip from `CustomizationHero`, leaving avatar name and aura chip intact.
- [ ] Re-run the focused UI contracts; expect GREEN.
- [ ] Review and commit only these UI primitive changes with message `feat: add yin yang customization controls`.

### Task 4: Fixed try-on layout and preview-only navigation

**Files:**

- Modify: `app/avatar_select.tsx`
- Modify: `tests/avatar_select_bouncy_contract.test.ts`
- Modify: `tests/avatar_select_first_frame_contract.test.ts`
- Modify: `tests/avatar_select_studio_contract.test.ts`
- Modify: `tests/avatar_studio_visual_mock_contract.test.ts`
- Modify: `tests/avatar_dna_studio_contract.test.ts`

- [ ] Add failing contracts for the approved screen hierarchy:

```text
ScreenGradient
  top bar: back + title + pearl balance + rune balance
  CustomizationTabs
  CustomizationHero (outside FlatList)
  YinYangControl (avatars only)
  BouncyWrap > FlatList (catalog only)
  CustomizationActionBar
```

Require that `ListHeaderComponent` no longer contains `CustomizationHero`, the collapsed mini-preview is removed after the fixed stage replaces it, and the `FlatList` remains the direct child of `BouncyWrap`.

- [ ] Run the five focused screen contracts; expect RED on hierarchy and missing rune balance.
- [ ] Add `avatarSide` state initialized from the confirmed custom avatar (`black -> yin`, `white/non-custom -> yang`). Pass it to `buildAvatarCatalog`, update the selected preview when side changes, and keep the stored side for an already active/owned item when the screen first loads.
- [ ] Render both balances in the fixed header using the current pearl chip and `RuneBalanceChip`/canonical rune subscription. Each balance is independently pressable and accessible; rune press routes to `/runes_wallet`.
- [ ] Place `CustomizationTabs`, the large `CustomizationHero`, and the avatar-only `YinYangControl` above `BouncyWrap`. Give the stage a responsive compact height for short screens/320-point width; keep one vertical scroll surface.
- [ ] Keep `selectCatalogItem` preview-only. After any custom avatar tile is selected, set the bottom action presentation to `Настроить аватар` even if the avatar is unowned. Do not call purchase/apply/open-editor from the tile press.
- [ ] Remove `bottomOpensEditor`'s dependency on `resolvedAction.kind === 'apply'`: the bottom action opens the editor for every selected custom avatar, while level avatar, aura, Plus/Pro/level/reward actions retain their existing direct behavior.
- [ ] Remove the collapsed mini-preview interpolation and scroll-derived title handoff only after the fixed stage is in place. Preserve BouncyWrap's direct-child constraint and action-bar bottom inset.
- [ ] Re-run the focused screen tests; expect GREEN.
- [ ] Review the overlapping `app/avatar_select.tsx` diff carefully and commit only the intended layout/state hunks with message `feat: keep avatar try on stage fixed`.

### Task 5: Exact customization rune operation

**Files:**

- Modify: `modules/phone-state/domains/economy.ts`
- Modify: `app/level_spin_star_grants.ts`
- Add: `app/customization_rune_purchase.ts`
- Add: `tests/customization_rune_operation.test.ts`
- Modify: `tests/session_attempt_rune_operation.test.ts`
- Modify: `tests/economy_constitution_contract.test.ts`

- [ ] Add RED tests for a versioned exact result, insufficient balance, duplicate replay, operation-ID conflict, negative overlay projection, and atomic durable writes. The exact result must contain:

```ts
export type CustomizationRunePurchaseExactResultV1 = Readonly<{
  schemaVersion: 'client-customization-rune-operation.v1';
  operationId: string;
  ownerStableId: string;
  accountGeneration: number;
  avatarId: string;
  artVersion?: 'showcase-v1' | 'avatar100-v1';
  ownedValue: string;
  applyInput?: Readonly<{
    avatarValue: string;
    storedAuraSelection: string | null;
    level: number;
    frameId: string;
    cloudSyncMode?: 'immediate' | 'deferred';
  }>;
  runeDelta: number;
  price: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: 'custom_avatar' | 'custom_avatar_restyle';
  createdAtMs: number;
  requestFingerprint: string;
}>;
```

- [ ] Run `tests/customization_rune_operation.test.ts tests/session_attempt_rune_operation.test.ts tests/economy_constitution_contract.test.ts`; expect RED.
- [ ] In `modules/phone-state/domains/economy.ts`, add strict parser/fingerprint helpers. Validate `runeDelta === -price`, `price > 0`, `balanceAfter === balanceBefore - price`, black `ownedValue`, exact owner/account, supported reason, safe integers, and a 64-hex fingerprint. Add `customization_rune_purchase` to the allowed zero-delta PhoneState grant kinds because its actual rune delta is projected locally from the exact result.
- [ ] Generalize `LocalRuneOperation`, parsing, fingerprint checking, unacknowledged overlay, and inferred server balance in `app/level_spin_star_grants.ts` so both session recovery and customization negative operations participate without a type-specific fallback.
- [ ] Export a narrow `prepareCustomizationRunePurchase` function from the canonical rune module. It must recover the current projection, reject insufficient runes before writes, return existing identical operations as duplicates, reject same-ID/different-fingerprint conflicts, and return the operation+projection writes without committing them.
- [ ] In `app/customization_rune_purchase.ts`, own one `AsyncStorage.multiSet` containing: operation write, rune projection write, ownership map write, granted purchase intent write, and rune sync outbox write. Then hydrate/publish the canonical rune projection and trigger background sync. Never export `spendRunes`, never write `users/{uid}.shards`, and never debit before the grant is ready.
- [ ] Re-run the focused economy tests; expect GREEN and no regression in session-attempt recovery.
- [ ] Review and commit with message `feat: add exact rune avatar purchase composite`.

### Task 6: Dual-currency purchase intent and validation

**Files:**

- Modify: `app/customization_purchase_intent.ts`
- Modify: `app/customization_purchase_validation.ts`
- Modify: `tests/customization_purchase_intent.test.ts`
- Modify: `tests/customization_purchase_validation.test.ts`
- Modify: `tests/customization_purchase_confirmation.test.ts`

- [ ] Add RED tests for Yang pearl purchase, Yin rune purchase, Yin restyle, crash resume, network sync failure, account switch, insufficient runes, and parsing a pre-existing v1 pearl intent.
- [ ] Introduce v2 intents while retaining backward compatibility:

```ts
type CustomizationPurchaseIntentV2 = PurchaseCustomizationInput & {
  v: 2;
  currency: 'pearls' | 'runes';
  accountScope: string;
  opId: string;
  phase: 'prepared' | 'granted';
  createdAt: number;
};
```

Treat parsed v1 intents as `currency: 'pearls'`; never reinterpret an existing prepared pearl intent as runes.

- [ ] Make the input union impossible to misuse: auras allow only pearl reason `avatar_aura`; Yang avatars allow pearl `custom_avatar`/`custom_avatar_restyle`; Yin avatars allow rune reasons with the same semantic subject but no `ShardSpendReason` cast.
- [ ] In `resumeCustomizationPurchase`, branch on currency. Pearl continues through `commitShardCompositeOperation`. Rune calls the dedicated customization composite and receives the same granted intent/ownership result. Both paths then run the existing validated apply step; a crash between grant and apply resumes without a second debit.
- [ ] Recalculate canonical validation from `CUSTOM_AVATARS`, `ownedValue`, and `applyInput`. Reject UI-supplied currency/price mismatches:

```ts
const style = parseCustomAvatarValue(String(intent.ownedValue));
const expectedCurrency = style?.logoColor === 'black' ? 'runes' : 'pearls';
const expectedCost = intent.spendReason === 'custom_avatar_restyle'
  ? (expectedCurrency === 'runes' ? CUSTOM_AVATAR_RUNE_RESTYLE_COST : CUSTOM_AVATAR_RESTYLE_COST)
  : (expectedCurrency === 'runes' ? getCustomAvatarRuneCost(item.avatar) : getCustomAvatarPurchaseCost(item.avatar));
```

- [ ] Ensure prepared/granted intents are account-scoped, duplicate taps reuse the same persisted operation, invalid price/style fails before mutation, and a background sync failure still returns the locally committed outcome.
- [ ] Re-run the three focused purchase tests; expect GREEN.
- [ ] Review the concurrent error-detail/account-lease edits in these files and commit only reconciled changes with message `feat: support rune customization purchase intents`.

### Task 7: Wire editor confirmation and user-facing failures

**Files:**

- Modify: `app/avatar_select.tsx`
- Modify: `constants/i18n.ts`
- Modify: `tests/avatar_yin_yang_ui_contract.test.ts`
- Modify: `tests/avatar_select_studio_contract.test.ts`
- Modify: `tests/customization_purchase_confirmation.test.ts`

- [ ] Add failing tests for the final flow:

  - tile tap -> bottom `Настроить аватар`;
  - editor Yin/Yang or background change updates preview and resolved confirmation price immediately;
  - exact owned style -> `Применить` with no price;
  - unowned Yang -> `Купить и применить` + pearl icon/price;
  - unowned Yin -> `Купить и применить` + rune icon/price;
  - owned Yang restyle -> 25 pearls;
  - owned Yin restyle -> 2,000 runes;
  - closing editor performs no write;
  - busy disables confirmation.

- [ ] Run the focused tests; expect RED.
- [ ] Keep editor changes in temporary state. Build `editorPreviewValue` from `editorAvatar`, `editorGradientId`, `editorLogoColor`, and `editorArtVersion`; pass a draft containing that value through `resolveCustomizationAction` to derive the editor CTA.
- [ ] Move purchase initiation from the main bottom action into editor confirmation. The confirm handler must first persist/prepare the purchase intent, then resume it. Only a free exact-owned-style action may call the existing apply service without a debit.
- [ ] Use visible labels only `Инь` and `Янь`. Add localized accessibility strings describing black/rune and light/pearl meaning, but do not render those long strings as visible text.
- [ ] Map `customization_runes_insufficient` to a localized clear message plus an action to `/runes_wallet`. Keep `insufficient_shards` routing to the existing pearl shop. Keep errors/account changes from closing the sheet or mutating the confirmed appearance.
- [ ] Re-run the focused flow tests; expect GREEN.
- [ ] Review the full `avatar_select.tsx` behavior and commit with message `feat: buy and apply avatar styles from editor`.

### Task 8: PhoneState sync, Firestore/Jarvis contract, and rules evidence

**Files:**

- Modify: `app/phone_state_economy_bridge.ts`
- Modify: `modules/phone-state/domains/economy.ts`
- Modify: `tests/phone_state_economy_bridge.test.ts`
- Modify: `functions/src/jarvis/money_source_reader.ts` only if the persisted grant is in its read path
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts`
- Modify: focused Jarvis reader test discovered by `rg -n "money_source_reader" functions/src/jarvis -g "*.test.ts"`
- Modify: `firestore.rules` only if implementation introduces a new collection
- Modify: focused Firestore/economy rule contract discovered by `rg -n "client_economy_operations|phone.?state" tests functions/src -g "*.test.ts"`

- [ ] Add RED bridge tests proving `customization_rune_purchase` accepts only a valid exact result bound to the same operation ID, entitlement ID, owner, account generation, and fingerprint.
- [ ] Extend `NonMonetaryEconomyGrantInput` and `commitPhoneStateNonMonetaryEconomyGrant` with the customization kind and strict parser. Keep the PhoneState composite `delta: 0`; the exact local rune operation remains the balance authority.
- [ ] Trace the actual server persistence path with targeted `rg`, then update Jarvis contract metadata for every new persisted grant kind/field. If `money_source_reader.ts` reads the operation, count/classify the new debit there and test it; if it does not, add an explicit guard assertion documenting that separation rather than speculative reader code.
- [ ] Reuse the existing immutable PhoneState/economy collection. If and only if a new collection was necessary, add a deny-by-default/owner-scoped immutable Firestore Rules block and its focused emulator/source contract in the same task.
- [ ] Run the focused bridge, Jarvis guard, reader, and rule tests; expect GREEN. Do not weaken a guard to make it pass.
- [ ] Review and commit with message `feat: sync rune avatar purchase receipts`.

### Task 9: Focused verification and final review

**Files:**

- Verify only; do not modify unrelated files.
- Update: `docs/superpowers/specs/2026-08-28-avatar-yin-yang-rune-pricing-design.md` only if implementation reveals an owner-approved contract change.

- [ ] Run the complete focused catalog/UI/purchase/economy set under one semaphore slot:

```powershell
bash .claude/semaphore/slot.sh acquire "jest avatar yin yang final"
try {
  npx jest --runTestsByPath `
    tests/customization_catalog.test.ts `
    tests/avatar100_catalog_activation.test.ts `
    tests/customization_draft.test.ts `
    tests/customization_icon_tabs_contract.test.ts `
    tests/avatar_yin_yang_ui_contract.test.ts `
    tests/avatar_select_bouncy_contract.test.ts `
    tests/avatar_select_first_frame_contract.test.ts `
    tests/avatar_select_studio_contract.test.ts `
    tests/avatar_select_vip_aura_contract.test.ts `
    tests/avatar_studio_visual_mock_contract.test.ts `
    tests/avatar_dna_studio_contract.test.ts `
    tests/customization_purchase_intent.test.ts `
    tests/customization_purchase_validation.test.ts `
    tests/customization_purchase_confirmation.test.ts `
    tests/customization_rune_operation.test.ts `
    tests/session_attempt_rune_operation.test.ts `
    tests/phone_state_economy_bridge.test.ts `
    tests/economy_constitution_contract.test.ts `
    --no-cache --runInBand
} finally {
  bash .claude/semaphore/slot.sh release
}
```

Expected result: all focused tests pass, no open handles, no snapshots rewritten.

- [ ] Run the focused TypeScript check supported by the repository for the touched app/tests. If only the full `tsc --noEmit` exists, acquire the semaphore and run it once; report unrelated pre-existing failures separately and do not repair them in this feature.
- [ ] Search for forbidden visible labels and unsafe economy paths:

```powershell
rg -n "цена в рунах|цена в жемчуге|Инь.*ч[её]рн|Янь.*светл|spendRunes|FieldValue\.increment\(-" app components constants modules tests
```

Expected result: no visible UI strings or exported generic rune debit; accessibility-only explanatory copy is allowed and must be identified explicitly.

- [ ] Verify type consistency: every `CustomizationAction`, `CatalogAvailability`, purchase intent, card price, editor price, validator, and ledger exact result uses the same `pearls | runes` discriminant and canonical amount.
- [ ] Verify spec coverage against every Acceptance Criteria item, especially aura price 120 pearls, default Yang, exact owned style free apply, Yin restyle 2,000 runes, and network failure preserving the local result.
- [ ] Inspect `git diff --check`, `git status --short`, and the final focused diff. Confirm all pre-existing unrelated dirty files remain untouched and no placeholder (`TODO`, `FIXME`, `throw new Error('not implemented')`) was introduced.
- [ ] Perform a manual device check at 320-point width and a short Android viewport: the stage remains visible, catalog alone scrolls, both balances fit, all targets are at least 44 points, reduced motion is honored, and lime buttons have dark text.
- [ ] Commit any final test-only adjustment with message `test: verify yin yang avatar purchase flow`; otherwise leave no empty commit.

## Completion criteria

Implementation is complete only when the visible side labels are exactly `Инь` and `Янь`, the large try-on remains visible while browsing, tile taps never charge, the editor is the only buy/apply surface, all Yin prices are `pearl tier * 80` runes, all Yang prices remain pearls, auras remain 120 pearls, and every rune debit is durably bound to its exact avatar/style grant with idempotent retry and account isolation.
