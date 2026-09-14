# DEV explanation replay implementation plan

Owner requests one DEV Hub flag for the eight approved explanation scenarios.

**Goal:** repeat explanations on re-entry while enabled, DEV only, without deleting seen flags or changing AI consent.
**Architecture:** session-local observable boolean guarded by ENABLE_DEV_TOOLS and !IS_STORE_RELEASE. Registry bypasses seen reads/writes while active; shared hook and custom League/swipe owners reset their per-focus latch only in replay mode. AI wrapper offers a dismiss-only preview when its real consent modal is not requested. Mistake setup already opens on every user invocation.
**Stack:** React Native, existing DEV Hub row styles, useSyncExternalStore, focused Node/Jest tests.

- [x] Add failing tests in tests/dev_feature_intro_replay.test.cjs for store disabled, DEV opt-in, notifications, no seen-key removal, and owner wiring.
- [x] Implement app/feature_intro_dev_replay.ts, wire registry and hooks/use_feature_intro.ts. No persistence is needed: UI explicitly says until restart.
- [x] Wire existing custom League/swipe latches; preserve weekly-result priority, selected content and feature access gates.
- [x] Add DEV Hub switch using existing theme/row styles and checked accessibility state.
- [x] Add a preview-only path in AiDialogConsentModal; original visible consent owns original handlers. Preview cannot call consent writes or grant access. Adapt isolated browser preview stubs.
- [x] Run Node regression, focused interaction/League/Arena tests using semaphore. Read-only review and syntax validation. No branch, commits, native build or deployment.

Verification: 23 Node contracts passed; 18 focused Jest tests passed across four suites (including focus/re-entry, late dismissal after disabling, real consent priority and preview-only actions). Initial Node tests failed before implementation. AI hook mocks required explicit memo rerender in the test harness; production subscriptions are unchanged. Read-only reviewer found no P1/P2 issues. Nine touched TS/TSX files parse without syntax errors; targeted diff whitespace check passed. Isolated implemented preview rebuilt successfully. No full typecheck or native/device run performed.
