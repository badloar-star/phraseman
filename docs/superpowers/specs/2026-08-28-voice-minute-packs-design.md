# Voice Minute Packs Design

## Decision

Retire the auto-renewing MAX subscription as a product. Keep MAX as the name
of the AI voice teacher. New access to paid voice lessons is purchased as
non-expiring, one-time minute packs rather than as a Premium tier.

## Customer model

Premium, Pro, and MAX voice minutes are independent:

- Premium and Pro continue to unlock the existing app features.
- A voice-minute pack unlocks only its exact number of AI-teacher seconds; it
  never grants Premium and is never attached to a RevenueCat entitlement.
- The MAX screen shows the verified available balance, the store-provided
  prices for 30-, 120-, and 300-minute packs, and an explicit purchase action
  for each pack.
- Minute credits do not expire. A caller may use them in any later month.

The initial commercial catalogue is `30`, `120`, and `300` minutes. The
storefront price tiers are configured only after the server accepts and
settles those products; the intended US anchors are $7.99, $22.99, and $49.99.

## Money and usage contract

Each verified store purchase produces one immutable server-authored
`voice_minute_events` grant keyed by its stable RevenueCat/store transaction
identifier. A duplicate event returns the same receipt and cannot add minutes
twice. Refunds append a reversal event instead of deleting the purchase.

Each completed call produces one immutable charge keyed by `sessionId` and
the durable completion result. The transaction that settles a call records its
charge and releases any unused reservation together. A wallet balance is only
a rebuildable projection of these events; it is not a source of truth.

No voice-minute product changes `premium_plan`, `premium_expiry`, or either
the `premium` or `max` RevenueCat entitlement. A call can start through one
of three independent gates: a one-time trial, a verified paid-minute balance,
or an explicit admin grant.

## Legacy MAX migration

The owner confirmed that no MAX subscription has ever been paid. Therefore the
app removes the MAX subscription UI, client entitlement path, and monthly
allowance rather than carrying a legacy compatibility mode. An unexpected old
subscription event remains ignored safely and can never create Premium access
or a minute credit.

## Store setup and release order

Create unpublished one-time consumable IAP products for each pack on both
stores and connect them to a new RevenueCat `voice_minutes` offering. Do not
attach them to an entitlement. The verified webhook/server path must be
released before those products become purchasable. Sandbox validates purchase,
pending purchase, duplicate delivery, refund, reinstall, and account switch
before the products are published. The unused old MAX offering and store
subscription are removed only after sandbox verification of the replacement.
