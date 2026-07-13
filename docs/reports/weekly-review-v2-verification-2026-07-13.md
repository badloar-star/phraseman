# Weekly Review V2 — verification report

Date: 2026-07-13

## Verified behavior

- Free exits before account cache, Firebase Functions, App Check and provider code. It receives only the local practice snapshot plus the Plus offer.
- Plus uses an account-generation-scoped cache, preserves the previous permitted result on offline/error, and hides that cache after downgrade or identity transition.
- The callable validates server entitlement and canonical `stableUid`, replays an identical result before paid work, allows at most one new result per rolling 24 hours, serializes concurrent generation, and reserves the global daily budget atomically.
- The V2 prompt receives a bounded, sanitized briefing and an explicit evidence/action allowlist. The response must pass the strict structured schema and evidence/action validation.
- The redesigned card keeps first-frame geometry, uses dark foreground on lime, has 46–52 px controls, and runs only a one-shot 260 ms transform/opacity animation while active and motion is allowed.
- Weekly-review analytics is consent-gated by the existing Firebase transport and accepts only bounded categorical fields. It drops identifiers, learning text, generated copy, and raw errors.
- Both client and server rollout switches remain off by default.

## Commands and results

### Root focused suite

The full focused command from the implementation plan completed with:

- 14 suites passed, 2 suites failed;
- 172 tests passed, 3 tests failed.

The three failures were inspected:

1. The directly related owner-direction contract still expected the old weekly-review replay signatures. It was updated to the new stableUid-only quota and parameterized lease finalization, then rerun successfully.
2. An unrelated Theo model contract expects an older source string in `functions/src/premium_dialog.ts`, which is concurrently modified outside this change.
3. An unrelated admin budget test reads the absent `admin/legacy/index.html`.

The weekly-review portions of both formerly failing suites were rerun with a focused name filter: 2 tests passed, 55 unrelated tests skipped.

Additional UI/client result:

- weekly review client, card states, analytics, accessibility, motion and placement: 31 tests passed across the focused runs;
- runtime lifecycle motion ratchet: passed;
- performance freeze contract: passed.

### Functions focused suite

`openai_jobs_config`, weekly review behavior, transactions and prompt-security suites:

- 4 suites passed;
- 44 tests passed.

### Functions TypeScript build

The Functions project compiled successfully with strict TypeScript settings into ignored temporary output:

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json --outDir ../.codex-tmp/functions-build-weekly-review
```

Temporary output was used to avoid overwriting unrelated generated `functions/lib/**` changes in the shared worktree.

### Diff and privacy inspection

- Focused `git diff --check`: passed.
- No secret value was added.
- Analytics tests prove that `uid`, `email`, phrase text, lesson title, generated headline/summary and raw error message are not emitted.
- No project OpenAI key or live OpenAI provider was used by Codex.

## Visual verification status

The in-app browser could not reach the ambient local URL because `http://localhost:56155/` returned `ERR_CONNECTION_REFUSED`; no Expo web server was listening on that port. Therefore a live visual matrix (Free/Plus, light/dark/high-contrast, reduce motion, EN/FR, account switch) remains a tester-build smoke item. Static UI/accessibility/motion contracts passed, but they are not claimed as a substitute for live visual verification.

## Production status

No Firebase deploy was run. No Remote Config or server rollout flag was enabled. The implementation is fail-closed and ready for the controlled checklist in `docs/rollouts/weekly-review-v2-rollout.md`.

## Final Advisor remediation

The first final review identified three release-blocking gaps. All three were corrected with regression coverage:

- an expired Plus cache now returns `plus_ready_to_generate` while the V2 flag is enabled, so opening the card starts the next daily review automatically;
- paid-response token usage is read and persisted before structured-output validation, so `invalid_response` keeps the actual provider usage when the provider returned normal JSON;
- weekly config clamps the daily cap to at least 1, and the reservation function independently rejects any non-positive cap instead of treating it as unlimited.
- JSON primitives such as `null` are normalized to an empty provider object, so an HTTP 2xx paid response is still settled against billing/cap before being rejected as `invalid_response`.

Fresh remediation checks:

- weekly client: 10/10 passed;
- Functions config, behavior, transaction and prompt-security suites: 48/48 passed;
- strict Functions TypeScript compile to ignored temporary output: passed.
