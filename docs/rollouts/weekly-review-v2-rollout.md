# Weekly Review V2 — controlled rollout

This runbook documents a future operator-approved rollout. It does not authorize deployment or production enablement.

## Initial safe state

- Server `aiV2Enabled=false`.
- Server `rolloutPct=0`.
- Client Remote Config `weekly_review_ai_v2_enabled=false`.
- Free continues to show only the local practice snapshot and Plus CTA.
- Plus continues to use its local/cached fallback without a provider request.

## Targeted deployment

After explicit production approval, deploy only the weekly review callable and its config surface:

```powershell
firebase deploy --only functions:weeklyReviewGenerate,functions:openAiJobsConfig
```

Deploy while all V2 switches are still off. Do not use a broad Functions deploy for this rollout.

## Enablement order

1. Verify a tester build with mocked Free, local fallback, fresh, replay/cooldown and offline/error states.
2. Confirm current privacy policy and store disclosures cover the exact computed learning data sent to the provider.
3. Set server `aiV2Enabled=true` with a small internal stable bucket in `rolloutPct`.
4. Turn the client boolean `weekly_review_ai_v2_enabled=true`. It is a global kill switch only; do not add a second client percentage rollout.
5. Perform one real request from an entitled tester account.
6. Repeat the same briefing inside 24 hours and verify replay/cooldown without new provider billing.
7. Attempt a direct Free call and verify rejection occurs before quota, lease, budget and billing writes.
8. Verify the billing lifecycle contains outcome and token usage, and the quota is keyed by canonical stableUid.
9. Expand the server percentage in explicit steps only after the previous step is healthy.

## Metrics to watch

- request success rate;
- p95 latency;
- invalid structured-response rate;
- provider/network failure rate;
- daily budget reservations, settled usage and cap rejections;
- estimated average cost per new provider result;
- provider vs replay/cache result source;
- expand, action and paywall conversion by Free/Plus tier;
- unexpected Free callable attempts;
- account-switch or downgrade cache-exposure reports.

Analytics is best-effort and consent-gated. It is a product funnel signal, not billing truth; billing and quota collections remain the operational source of truth for spend.

## Production smoke checklist

- Server confirms Plus entitlement independently of the client.
- One request produces a valid V2 result in the requested UI language.
- Identical repeat inside 24 hours returns replay/cooldown with no new provider charge.
- A different request inside the rolling window is rejected as not ready.
- Parallel identical requests produce at most one provider call.
- Free direct-call fixture is rejected before paid-work state changes.
- Billing outcome and token usage are present for a paid response, including an invalid paid response.
- Provider/network failure refunds a reserved budget slot when no paid response was received.
- Downgrade and account switch do not expose the previous Plus account cache.
- Offline/error preserves only the old result allowed for the current Plus account.

## Rollback

Disable either switch immediately:

1. client `weekly_review_ai_v2_enabled=false`, or
2. server `aiV2Enabled=false` / `rolloutPct=0`.

The local snapshot, account-scoped cache and Plus fallback continue to work. Do not delete quota, billing or cache data during rollback; preserve it for idempotency and investigation.

## Explicit stop point

Do not deploy, enable flags, invoke the live provider, or change production configuration without separate user/operator approval.
