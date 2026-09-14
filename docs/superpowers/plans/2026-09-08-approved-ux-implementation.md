# Approved UX implementation plan

> **For agentic workers:** Execute inline using executing-plans. Owner approved the mockups on 2026-09-08. No separate checkout, delegated writer, commit or deployment is authorized.

**Goal:** Bring approved explanations and motion into the actual app, preserving functionality, theme colors and paywalls.

**Architecture:** Extend the existing FeatureIntroModal and account-scoped registry, not a second welcome system. Reuse HybridSheetShell for native dismissal, theme tokens and finite Reanimated sequences. Keep useful contextual instructions in their existing screen slots.

**Tech Stack:** React Native, Expo Router, Reanimated, TypeScript, focused Jest tests.

## Acceptance and sequence

- [x] Animated introductions: `components/FeatureIntroModal.tsx`, new `components/feature_intro/FeatureIntroStage.tsx`, `app/feature_intro_registry.ts`. Explicit `premiere` and `orbit` families; scrollable text, fixed action area, reduced-motion final frame, no looping background work. Test `tests/feature_intro_presentation.test.cjs` first with Node's test runner; it must reject missing family routing and missing real stage integration before implementation.
- [x] Arena: retain its existing seen key and screen ownership. Set the selected premiere family and replace misleading “В бой” with a label that only promises opening Arena. Do not change matchmaking or economy.
- [x] League: retain `league_rules_first_visit`; replace only automatic long rules with the short premiere. Preserve the header help button and full rules. Delay rules handoff until the native introduction is dismissed. Weekly results retain priority; hidden screens cannot consume a first visit.
- [x] Replay: a settings-linked `app/feature_guide.tsx` lists only shipped explanations; opening one does not clear seen flags or start a paid feature. Test routing and absence of storage-reset side effects.
- [x] Approved contextual changes: implement exact proposals from `.superpowers/brainstorm/feature-intros/ux-review/scenes.cjs` and `/native/catalog.js`; separate loading, empty, error and nothing-selected states; replace QA accessibility labels; preserve translations and controls. Each behavior gets a focused failing regression before its patch.
- [x] Additional entrypoints: inspect existing explanations before adding one. Owner-selected styling remains authoritative. No new automatic modal for simple empty/error states. Protected consent/voice/Learning V2 work requires its own source-contract reading before edits; do not silently couple consent with seen state.
- [x] Preview and review: preserve historical before screens, show actual changed components in the native-source preview, run focused tests with repository semaphore and read-only review. Report partial items explicitly; do not call the entire app complete until every approved scenario is accounted for.

## Scope ledger

Approved sources: 40 contextual scenarios in `ux-review/scenes.cjs` (including keep decisions), 22 exact-screen scenarios in `ux-review/native/catalog.js`, and the owner's per-section style list. Paywalls remain unchanged. Existing exams/ranks/gifts flows and manually opened rules remain functional. No backend/schema changes are planned; Jarvis fetchers have no feature-intro registry references.

## Verification commands

Lightweight: `node --test tests/feature_intro_presentation.test.cjs`.
Focused Jest: acquire `.claude/semaphore/slot.sh`, run the named intro/league regression tests with `--runInBand --watch=false`, release in the same shell on success or failure. Do not run a global typecheck or suite.

## Status

2026-09-08: approved change/keep ledger implemented in source and reviewed. Six automatic explanation entrypoints (Arena, League, swipe, listening, speaking, blitz); two existing contextual windows enhanced (AI consent, mistake setup); seven explanations in the manual guide. Historical before/proposal preview preserved. New actual-component preview: /ux-review/implemented/index.html. Browser/native rendering differences remain explicit; no emulator, native build, deployment or production API calls. See docs/design/APPROVED_UX_IMPLEMENTATION_2026-09-08.md for the bounded verification and scope.
