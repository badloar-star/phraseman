# Gift Inventory Apply Design

## Goal

Keep the celebratory chest reveal for a newly earned level gift, but apply an already revealed inventory gift without showing the chest again. Preserve the result modal.

## Behavior

- A newly earned gift opens in the existing chest presentation.
- Inventory `Apply` opens the same reward result surface directly and applies the stored gift.
- Choice gifts open directly on the choice list.
- Dual inventory gifts open directly on their combined reward summary.
- Failed application keeps the failed gift available for retry through the existing inventory persistence rules.
- The entrance animation initializes only on a real `visible: false -> true` opening.

## Implementation boundary

`LevelGiftModal` and `LevelGiftDualModal` receive an explicit presentation mode. The inventory screen selects apply mode; all other callers retain opening mode by default. Existing `applyGift`, account-generation guards, inventory mutation, cosmetic navigation, and result UI remain the source of truth.

## Verification

Focused contracts cover explicit inventory apply mode, direct result presentation, and edge-triggered animation initialization. Existing level-gift inventory and claim-success tests guard persistence and application order.
