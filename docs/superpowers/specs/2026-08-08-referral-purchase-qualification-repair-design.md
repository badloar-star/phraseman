# Referral Purchase Qualification Repair Design

## Goal

Keep referral qualification consistent with the authoritative store-Premium projection without restoring the retired broad `users/{id}` Firestore trigger, and repair already-stale `pending` attributions when the admin referral dashboard is opened.

## Design

1. `applyVerifiedPremiumSubscriptionEvent` remains the single RevenueCat write seam used by both the signed webhook and the authenticated RevenueCat reconciliation callable. After its Firestore transaction commits, it asks `markRefereeQualified` to reconcile the resolved owner. The existing referral transaction re-reads the user and only qualifies an active server-owned store plan.
2. A replayed RevenueCat event carries the original receipt owner back out of the idempotency branch. This makes a retry capable of completing referral qualification even when the Premium transaction committed but the first qualification attempt failed.
3. RevenueCat transfer handling invokes the same qualification seam for the canonical recipient after the transfer transaction commits.
4. `adminGetReferralDashboard` performs a bounded repair pass over at most 100 `pending` attributions. It prefilters against current store-Premium projections and then delegates every mutation to `markRefereeQualified`, preserving deadline, emergency-stop, and idempotency rules.
5. The retired broad document trigger is removed from `referral.ts`; no global user-write listener is exported or deployed.

## Failure and cost behavior

- RevenueCat qualification failure propagates from the webhook path so RevenueCat can retry; the duplicate receipt branch remains repair-capable.
- Dashboard repair is bounded and best-effort per attribution. A repair error is logged and reported in the callable response but does not hide otherwise readable dashboard data.
- No client-writable field is trusted. `markRefereeQualified` re-reads the user inside its transaction and verifies `isStorePremiumActive`.

## Verification

- Unit tests cover applied, duplicate, missing-owner, and bounded dashboard-repair paths.
- Cost-control contracts continue to forbid exporting `referralOnUserProgressUpdated`.
- Functions TypeScript build must pass.

## Deployment boundary

This change prepares source and tests only. Production deployment and the resulting production data mutation require a separate explicit release command.
