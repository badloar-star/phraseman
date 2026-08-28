# Avatar Studio: Yin/Yang Pricing and Fixed Try-On Design

Date: 2026-08-28  
Status: owner-approved visual direction  
Approved direction: concept 1, fixed try-on stage

## Goal

Redesign the existing Avatar Studio so the selected appearance stays visible while the user browses, black avatar variants are sold only for runes, light avatar variants are sold only for pearls, and the purchase action appears only after the user has selected the avatar background and side of the appearance.

The implementation must preserve the existing avatar catalog, aura catalog, owned-item semantics, Plus/Pro/reward gates, level avatar, Avatar DNA entry, cloud synchronization, account isolation, and all existing cosmetic assets.

## Terminology

- **Yin** means the black avatar artwork (`logoColor: "black"`) and uses runes.
- **Yang** means the light avatar artwork (`logoColor: "white"`) and uses pearls.
- **Background** means the existing custom-avatar gradient (`gradientId`).
- **Exact style** means the tuple of avatar ID, gradient ID, Yin/Yang artwork, and art version.
- **Owned avatar** retains the current ownership model: the account owns the avatar and stores one confirmed style. This design does not create a new per-style inventory.

## Screen Structure

### Fixed chrome

The screen header shows:

1. Back action.
2. Title `Студия образа`.
3. Both balances: pearls and runes. Each balance uses its canonical project asset/component and remains independently accessible.

The section switch becomes one compact segmented control with the labels `Аватар` and `Аура`. It replaces any visually competing button treatment but does not remove either section.

### Fixed try-on stage

The large avatar preview is outside the scrolling catalog and remains visible while the catalog moves. The stage includes the selected avatar, selected aura, avatar name, and aura name.

The catalog is the only main scrolling surface. There is no nested vertical scroll. On shorter phones, the stage compresses to a smaller approved size; it does not disappear. The existing collapsed mini-preview may be removed only after the fixed stage replaces its function.

### Yin/Yang control

The Avatar section shows a two-option segmented control directly below the try-on stage. Its only visible labels are:

- `Инь`.
- `Янь`.

The control must not show the words `чёрный`, `светлый`, `цена в рунах`, or `цена в жемчуге`, and it has no supporting subtitle. Currency is communicated by the canonical currency icon and amount on the selected tile and confirmation action.

Changing this control updates every visible avatar tile, the fixed preview, price icon, price number, and editor default. The control is not shown in the Aura section because auras keep their existing pearl pricing.

The default for a not-yet-owned avatar remains Yang/light, matching the current catalog change. An already owned or active avatar opens with its stored side and background.

### Catalog behavior

Tapping an avatar tile performs try-on only. It must not purchase, apply, or open the editor immediately.

After an avatar tile is selected, the fixed bottom action reads `Настроить аватар`. The old `Настроить аватар` action is removed from the large preview itself, so there is one primary action only.

The catalog keeps `Все` and `Мои`. Price-tier filter buttons remain removed. Tiles keep tier grouping, names, ownership state, and price chips.

### Editor flow

Pressing the bottom `Настроить аватар` action opens the existing editor sheet with:

1. A large live preview.
2. Background choices.
3. The same two-button control labeled only `Инь` and `Янь`.
4. One bottom confirmation action.

The confirmation action is resolved from ownership and style state:

- Unowned Yang avatar: `Купить и применить · {pearlPrice}`.
- Unowned Yin avatar: `Купить и применить · {runePrice}`.
- Owned avatar with its exact stored style: `Применить` with no price.
- Owned avatar with a changed Yang style: `Купить и применить · 25` pearls.
- Owned avatar with a changed Yin style: `Купить и применить · 2 000` runes.

Closing the editor does not charge, grant, or apply anything. A failed or cancelled confirmation preserves the last confirmed appearance.

### Aura flow

Auras retain their current availability rules, reward states, Plus/Pro gates, and price of 120 pearls. The fixed preview and compact `Аватар / Аура` switch are shared with the avatar flow. Yin/Yang does not change aura art or aura price.

## Pricing Contract

Rune prices use a fixed retail anchor of `1 pearl = 80 runes`, which is the existing base exchange rate. Retail prices do not follow the daily exchange quote or its 60–100 corridor; cosmetic prices must remain predictable.

| Pearl tier | Yin rune price |
|---:|---:|
| 50 | 4,000 |
| 70 | 5,600 |
| 100 | 8,000 |
| 150 | 12,000 |
| 300 | 24,000 |
| 500 | 40,000 |
| 1,000 | 80,000 |
| 3,000 | 240,000 |

The implementation derives rune prices from the canonical pearl price with one shared constant, for example `CUSTOM_AVATAR_RUNE_RATE = 80`. It must not duplicate rune prices across catalog entries.

Restyle prices use the same anchor:

- Yang restyle: 25 pearls.
- Yin restyle: 2,000 runes.

The selected side determines the currency. A confirmation modal, sheet action, catalog tile, and ledger operation must all show and validate the same currency and amount.

## Catalog and Draft Model

`CatalogAvailability` gains a rune-priced availability variant rather than overloading the existing pearl variant. The avatar catalog builder receives the selected Yin/Yang mode and exposes the correct preview value and availability for that mode.

The customization draft keeps side and background as explicit preview state until confirmation. Switching Avatar/Aura tabs or closing the editor must not silently mutate ownership or the confirmed avatar.

Purchase validation recalculates the canonical price from the avatar definition and selected side. UI-provided price numbers are never trusted.

## Economy and Persistence Contract

This feature is governed by `docs/economy/ECONOMY_CONSTITUTION.md`.

### Pearl path

Yang purchases and Yang restyles continue through the existing shard composite operation. The operation binds the exact debit to the exact avatar ownership/style grant and optional apply input.

### Rune path

Yin purchases and Yin restyles use a dedicated durable customization composite. The implementation must not add a generic `spendRunes` or a standalone rune debit.

The exact result has a versioned schema such as `client-customization-rune-operation.v1` and includes at least:

- stable owner ID and account generation;
- stable operation ID;
- avatar ID and art version;
- exact owned style value;
- exact apply input when using buy-and-apply;
- negative rune delta and canonical price;
- balance before and balance after;
- initial-purchase or restyle reason;
- creation time;
- request fingerprint.

The debit and entitlement are one durable local operation. A retry with the same operation ID and fingerprint replays the same receipt and cannot charge twice. Reuse of an operation ID with different content fails closed.

Initial Yin purchase uses a semantic stable operation ID for the avatar. A restyle creates a fresh operation ID when the user confirms, persists it before mutation, and reuses it for every retry of that same confirmation.

The local canonical wallet decides whether sufficient runes are available. If insufficient, no balance, ownership, or applied-style write occurs. After a successful local commit, network failure affects synchronization only: it must not revoke the avatar, roll back the applied style, or surface a user-visible loss.

The rune projection and PhoneState bridge must recognize the exact customization operation. The existing guard that forbids an exported generic `spendRunes` remains in force.

## Jarvis and Firestore Contract

Before implementation completion, inspect the actual persistence path used by the new rune composite.

- If it adds a new grant kind or exact-result shape to data read by `functions/src/jarvis/money_source_reader.ts`, update that reader and its focused tests.
- Update `functions/src/jarvis/jarvis_data_contract_guard.test.ts` in the same change for every changed persisted field or operation schema.
- Reuse the existing immutable economy collection where applicable. If any new collection is introduced, add an explicit Firestore Rules block in the same change.
- Do not add a server-authoritative ordinary-spend decision or a direct personal balance writer.

## Error Handling

- Insufficient pearls opens the existing pearl shop path.
- Insufficient runes shows a clear localized insufficient-runes message and a link to the rune wallet; it does not route to the pearl shop automatically.
- A prepared operation is resumed on the same account only.
- Account change during confirmation aborts without applying another account's ownership or style.
- Corrupt intent, fingerprint mismatch, reused operation ID, or invalid canonical price fails closed and logs the exact reason.
- Busy confirmation actions are disabled to prevent duplicate taps.

## Accessibility and Motion

- All interactive targets are at least 44 by 44 points.
- Avatar/Aura and Yin/Yang controls expose tab or selected state, not color alone.
- Price labels and the two Yin/Yang buttons include the full side and currency meaning in accessibility text even though the visible button labels remain only `Инь` and `Янь`.
- The fixed stage and catalog remain usable at 320-point width and on short screens.
- Try-on transitions use opacity/transform only, last 150–300 ms, and honor reduced-motion preferences.
- Bright lime/green filled actions use dark foreground according to the project contrast rule.

## Verification

Focused tests must cover:

1. Every current pearl tier maps to exactly `price * 80` runes.
2. Yin catalog tiles expose rune availability and black art; Yang tiles expose pearl availability and white art.
3. Aura price and gating are unchanged.
4. Tile tap performs preview only and resolves the bottom action to `Настроить аватар`.
5. The preview action is absent from the hero.
6. The only visible side-control labels are `Инь` and `Янь`; editor confirmation currency and amount still change with the selection.
7. Exact owned style applies for free.
8. Yang restyle costs 25 pearls; Yin restyle costs 2,000 runes.
9. Initial rune purchase and rune restyle are durable composite operations with exact grants.
10. Retry, crash resume, account switch, insufficient balance, and operation-ID conflict cannot double-charge or orphan a debit.
11. Network sync failure preserves the committed local result.
12. Economy constitution, Jarvis data-contract, Firestore Rules, catalog, purchase validation, studio UI, first-frame, and bouncy-scroll focused gates remain green.

Heavy Jest, TypeScript, or build commands must acquire and release the shared semaphore slot. Verification should remain focused on the touched contracts.

## Out of Scope

- Changing how runes are earned.
- Changing the exchange corridor or daily quote.
- Selling auras for runes.
- Creating separate permanent ownership records for every background and side.
- Removing any current avatar, aura, reward, subscription gate, Avatar DNA entry, level avatar, or customization capability.
- Changing real-money purchases or store products.

## Acceptance Criteria

The feature is complete when a user can browse avatars while always seeing the large try-on, switch between Yin and Yang, see the canonical currency and price everywhere, select an avatar without purchasing it, configure background and side, then atomically buy and apply it with the correct currency. No retry or network failure can charge twice or leave a debit without the exact avatar/style grant.
