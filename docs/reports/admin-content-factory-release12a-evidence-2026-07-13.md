# Admin Content Factory — Release 12A evidence

Date: 2026-07-13  
Scope: content-stage resume accounting and uniform review fingerprint  
Deployment: not performed

## Delivered

- Pause, resume and cancel now advance a monotonic `controlRevision` inside the same Firestore transaction as the state change.
- Every control action writes a separate audit record with before/after state, attempt counters, control revision, `attemptDelta: 0` and `providerAttemptDelta: 0`.
- Resume changes only `paused → queued`; it does not invoke a provider or modify `attempts` / `generationAttempts`.
- Concurrent resume requests are serialized: one succeeds, one is rejected after the state has advanced, and only one audit record commits.
- Admin labels distinguish first generation, retry generation and resume-without-generation.
- Review fingerprints cover every canonical generation stage kind and bind stage/artifact identity, immutable storage coordinates, grounding, QA, prompt/schema/context evidence, edit base identity and advisory judge receipt.
- Any mutation of QA or judge evidence invalidates the previous review fingerprint; the existing stale-fingerprint approval guard remains authoritative.

## Verification

- Focused Functions: 6 suites / 107 tests passed.
- Functions TypeScript build passed.
- Admin source contract: 1 suite / 12 tests passed.
- Admin Playwright smoke: 7 / 7 passed, including visible generate/retry/resume distinctions and zero fake-provider run calls caused by resume.
- Firestore Emulator: 1 / 1 passed for concurrent resume, unchanged attempt counters and single audit commit.
- Focused `git diff --check` passed.

## Safety

- No project OpenAI API key, external provider, deployment, production write, publication, commit or push was used.
- Existing stage states and controls remain available; no functionality was removed.
