# Analytics production release manifest — 2026-07-13

## Release objective

Ship the governed product, learning, revenue, experiment, reliability, and monthly decision-pack analytics as a clean production snapshot without carrying the local secret-bearing branch history or unrelated uncommitted work.

## Included

- Server-side product analytics aggregates over the governed Firebase Analytics export.
- Consent-scoped acquisition, activation, exact/rolling retention, and data-quality aggregates.
- SRS learning outcomes, delayed recall, evidence-based mastery, content diagnostics, and Weekly Effective Learners.
- RevenueCat server-confirmed financial normalization and subscription-chain aggregates.
- Governed experiment exposure, version adoption, and bounded operation-failure diagnostics.
- Read-only 18-file monthly decision ZIP with a separate 12-complete-month baseline, privacy validation, source watermarks, small-sample suppression, deterministic output, and size caps.
- Admin v2 controls for the analytics workspace and monthly ZIP download.
- BigQuery query hardening: normalized grouping keys and temporary in-job tables to keep the read-only aggregate query within BigQuery planner limits.

## Production sources

- `firebase_analytics`: configured through `phraseman-ea0b3.analytics_532376954`, location `US`.
- `revenuecat_webhooks`: configured through the existing `revenuecat_premium_events` Firestore collection and authenticated webhook.
- `notifications_referrals`, `social_features`, and `feedback_support`: connected through allowlisted Firestore server-side count aggregations; no raw documents or text are returned.
- `store_acquisition`, notification delivery/open outcomes, broader social funnels, and `crashlytics`: intentionally remain `unavailable`, never coerced to zero, until their owner-side exports and governed aggregate adapters are configured.

## Explicit exclusions

- `functions/.env.phraseman-ea0b3` and every other local deploy environment file.
- `.firebase`, `.claude-flow`, `.codex`, `.ruflo`, `.ruvector`, `.swarm`, and test-result/runtime state.
- Local reply JSON batches and temporary scan scripts.
- Uncommitted Content Factory, Arena timing, avatar, and unrelated UI work from the shared workspace.
- Raw events, account UIDs, stable IDs, phrase/answer text, error text, stack traces, and unrestricted free text from the monthly pack.

## Deployment targets

- Firebase Functions: `adminProductAnalytics`, `adminSubscriptionAnalytics`, `adminMonthlyDecisionPack`, `revenueCatShardsWebhook`.
- Firebase Hosting target: `admin`.
- Mobile analytics instrumentation is not part of this server/Admin release and may ship only through the normal update/store gate after its unrelated TypeScript failures are fixed.

## Mobile release gate result

The full `npm run update:gate` currently fails on unrelated snapshot TypeScript errors in achievements, Arena results, soft-upsell study-target typing, trainer dashboard typing, weekly-review copy, a gift-modal callback, survey text test IDs, and survey test mocks. No OTA or store build may be published from this state. The server/Admin analytics rollout remains independently eligible because its focused Functions build, tests, Admin contracts, and live warehouse checks pass.

## Verification required before production

- Functions TypeScript build and focused analytics suites.
- Root focused Admin analytics contract suites.
- Admin JavaScript syntax checks and deterministic ZIP fixture.
- Staged secret scan and explicit forbidden-path audit.
- Deploy preflight proving that the production BigQuery dataset/location are present in an ignored, untracked Functions environment file without printing its values.
- Live BigQuery dry-run and bounded actual query.
- Final Advisor approval of the exact staged diff and evidence.
- Post-deploy authenticated callable/ZIP smoke, hosting asset check, and production log review.
