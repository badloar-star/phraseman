# Monetization Release QA

Date: 2026-05-12

## Release Goal

Ship the course-first model:

- Lessons 1-3 are free without subscription.
- Lesson 4+ requires Premium.
- Closing the course paywall may show a store-backed 3-day trial offer.
- Trainer stays one simple hub: Words / Phrases / Arena.
- Free trainer is limited to 1 session per day; Premium is unlimited.
- Arena direct entry cannot bypass energy/daily limits.

## Store Setup

RevenueCat must expose active monthly and yearly packages for production offerings.

App Store Connect:

- The subscription group has an active 3-day introductory free trial on the intended product.
- The trial is approved and available in the current storefront.
- The sandbox tester has not already consumed the same introductory offer when testing eligibility.

Google Play Console:

- The base plan / offer has a 3-day free trial phase.
- The offer is active and attached to the product RevenueCat returns.
- RevenueCat receives `subscriptionOptions` with a free trial phase for Android purchase flow.

Expected app behavior:

- If the store does not return a trial, the app must not promise "3 days free".
- If the store returns a trial, the app can show the 3-day copy and the purchase still goes through Apple/Google.

## Manual QA Matrix

| Scenario | Account state | Expected result |
| --- | --- | --- |
| Open lesson 1 | Free user | Lesson opens. |
| Open lesson 2 | Free user | Lesson opens. |
| Open lesson 3 | Free user | Lesson opens. |
| Open lesson 4 from lessons tab | Free user | Course paywall opens with `course_after_lesson3`. |
| Open lesson 4 via direct route | Free user | User is redirected to course paywall. |
| Tap next after lesson 3 | Free user | Course paywall opens instead of lesson 4. |
| Close course paywall with trial product | Free user, store trial available | Exit trial modal appears. |
| Close course paywall without trial product | Free user, no store trial | Paywall closes without promising trial. |
| Buy from exit trial modal | Free user, store trial available | Native Apple/Google purchase sheet opens with trial terms. |
| Restore purchase | Premium user | Entitlement unlocks lesson 4+, trainer, arena unlimited. |
| Trainer first session today | Free user | Session starts. |
| Trainer second session today | Free user | `trainer_limit` paywall opens. |
| Direct trainer session route | Free user, no entry token | Redirects to `trainer_limit` paywall. |
| Smart trainer direct route | Free user | Premium paywall opens. |
| Diagnosis trainer direct route | Free user | Premium paywall opens. |
| Arena ranked with no energy | Free user | Energy/paywall path blocks match start. |
| Arena direct game route | Free user, no entry token | Redirects to Arena tab and logs direct block. |
| Arena rematch | Free user with allowance | Match opens only after entry reservation. |
| Match notification tap | Free user with valid session | Match opens only after entry reservation. |
| Premium account | Premium user | No lesson/trainer/arena limits. |

## Analytics To Watch

Core funnel:

- `course_paywall_after_lesson3`
- purchase start / purchase success events already emitted by the paywall flow
- restore success events already emitted by the paywall flow

Trial exit offer:

- `exit_trial_offer_shown`
- `exit_trial_offer_accepted`
- `exit_trial_offer_declined`

Bypass protection:

- `trainer_direct_gate_blocked`
- `arena_direct_gate_blocked`

Healthy launch signal:

- Many `course_paywall_after_lesson3` events after lesson 3.
- Some `exit_trial_offer_shown` only where store trial exists.
- Low but non-zero direct-block events during QA; near-zero after release.
- Purchase sheet opens from both normal paywall CTA and exit trial CTA.

## Tester Flags

Use the tester/admin tools deliberately:

- `tester_no_premium=true` for real free-user QA in development.
- `tester_no_limits=true` only for content QA, not monetization QA.
- `_force_trial_ui=1` only for UI preview; it does not prove the store will grant a real trial.

## Go / No-Go

Go when:

- TypeScript and focused monetization tests pass.
- Real iOS sandbox confirms the trial sheet text.
- Real Android license tester confirms the trial offer selection.
- Lesson 4 direct route, trainer direct route, and arena direct route are blocked for free users.
- Premium entitlement unlocks immediately after purchase and after restore.

No-go when:

- The app displays "3 days free" while the native store sheet has no trial.
- Free users can reach lesson 4+ without Premium.
- Free users can start unlimited trainer sessions by direct route.
- Arena game can be opened directly without a reserved entry.
- RevenueCat returns no active packages in production.

