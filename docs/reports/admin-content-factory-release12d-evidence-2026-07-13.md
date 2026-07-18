# Admin Content Factory — Release 12D evidence

Date: 2026-07-13  
Scope: Arena empirical timing observability  
Deployment: not performed

## Delivered

- Server-scored Arena answers now update privacy-safe daily timing aggregates in the same idempotent transaction as `serverScored=true`.
- Stored dimensions are SHA-256 item hash, difficulty and coarse device class (`phone`, `tablet`, `web`, `unknown`). No user ID, session ID, answer text or question text is stored in timing telemetry.
- Response time is derived from the stable Firestore answer-write `updateTime` minus the authoritative session `questionStartedAt`; cold-start time and transaction retry time are excluded. Fallback client-bounded samples are labelled and cannot make the recommendation gate pass unless at least 95% of the sample is server-observed.
- Histograms produce bounded p50/p95, average time, timeout rate, wrong-answer rate and correct rate. Time is clamped to the authoritative 40-second runtime.
- Detailed per-item aggregates support diagnosis. Two deterministic daily rollup shards per difficulty/device class keep the 31-day admin query below the 1001-document completeness guard while reducing write contention.
- Minimum sample is 200 answers. Partial scans or insufficient server-observed coverage block recommendation eligibility.
- Client timeouts carry the current coarse device class. The server watchdog reuses the player's last known coarse class and otherwise stores `unknown`; any incomplete device attribution blocks every device-specific recommendation.
- The summary always returns `authoritativeQuestionTimeoutMs=40000` and `automaticRuntimeChangeAllowed=false`. Metrics can inform a manual prompt/content review but cannot change match runtime.
- Admin v2 shows 30-day timing metrics, grouped difficulty/device evidence, sample sufficiency and the unchanged 40-second authority.
- New staged Arena runtime documents preserve generated difficulty; legacy items remain compatible as `unknown`.

## Verification

- Focused Functions: 5 suites / 20 tests passed.
- Functions TypeScript build passed.
- App/Admin contracts: 5 suites / 25 tests passed, including existing Arena timer, authoritative matchmaking and Firestore cost guards.
- Admin Playwright smoke: 7 / 7 passed at 375, 768, 1024 and 1440 px.
- Deterministic fixture checks cover p50/p95, timeout/wrong rates, privacy-safe hashes, minimum samples, partial scans, client-bounded exclusion and fixed runtime authority.

## Safety

- No production telemetry was read or written; empirical values shown in tests are deterministic fixtures only.
- No timeout, scoring policy, question count, generated content, release mode or rollout configuration was changed.
- No project OpenAI API key, external model call, deployment, publication, commit or push was used.
