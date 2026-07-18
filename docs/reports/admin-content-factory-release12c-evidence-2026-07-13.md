# Admin Content Factory — Release 12C evidence

Date: 2026-07-13  
Scope: advisory shadow quality judge  
Deployment: not performed

## Delivered

- Independent judge prompt and model route for generated lesson, Quiz/Challenge, Flashcard and Arena stage artifacts.
- The artifact is explicitly untrusted data. Judge input excludes actor/user identifiers, is capped at 100 KB and is bound to content, grounding, input, schema and output hashes.
- Structured dimensions cover grammar, naturalness, semantic alignment, answer uniqueness, CEFR, locale direction and grounding.
- Every receipt is `authority=advisory_only` and `requiresHumanReview=true`. Even a high-confidence agreement cannot approve or publish content.
- Disagreement, confidence below `0.85`, any issue, any failed/uncertain dimension, malformed output or provider failure routes to human review.
- Separate Firestore configuration defaults to disabled and requires `enabled=true`, a positive daily cap and an allowlisted model. An invalid active model disables the judge with an explicit config error; it is never silently replaced for a paid request.
- Receipt persistence is conditional on `needs_review`, the same revision, exact content hash and unchanged review fingerprint, preventing a late judge response from attaching after a human decision or to changed evidence.
- Admin preview shows the shadow receipt read-only and states plainly that it cannot approve or publish.

## Verification

- Focused Functions: 5 suites / 85 tests passed.
- Functions TypeScript build passed.
- Admin source contracts: 2 suites / 17 tests passed.
- Admin Playwright smoke: 7 / 7 passed at 375, 768, 1024 and 1440 px.
- Fake-provider cases passed for high-confidence agreement, low confidence, QA disagreement, explicit quality issue, malformed provider output and disabled mode.
- Repository cases passed for disabled-by-default config, separate cap, replay-safe reservation and stale-content receipt rejection.
- Firestore Emulator: 9 suites / 25 tests passed, including concurrent human approval versus judge commit; the final state can never be approved with unseen judge evidence.

## Safety

- No project OpenAI API key or real model/provider request was used during implementation or verification.
- Production shadow judge remains disabled unless an administrator explicitly creates a positive-cap configuration. No configuration write was performed.
- Judge failure never blocks artifact generation and never weakens the existing manual review requirement.
- No Firestore production write, deployment, publication, commit or push was performed.
