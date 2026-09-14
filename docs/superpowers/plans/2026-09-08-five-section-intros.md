# Five section explanations implementation plan

**Goal:** owner-approved first-entry explanations for Cards, Statistics, Daily phrase, Videos and Friends; DEV replay included.
**Architecture:** extend the local intro registry and reuse FeatureIntroEntry for route-owned screens. Daily phrase uses an explicit request gate before its existing detail sheet, never two native modals together. No access, rewards, content generation or consent changes.
**Stack:** React Native, theme-aware orbit/premiere stages, existing account-scoped seen keys, Node contracts and focused Jest.

- [x] Add failing tests in tests/five_section_intros.test.cjs for all five IDs, families, nine interface locales and real screen wiring. Run with node --test.
- [x] Add app/feature_intro_sections_copy.ts; import SECTION_FEATURE_INTROS in app/feature_intro_registry.ts. Each definition uses existing FeatureIntroDef, first_visit and localized title/body/CTA.
- [x] Mount FeatureIntroEntry in app/flashcards/FlashcardsHubScreen.tsx, app/streak_stats.tsx, app/lingman_videos.tsx and app/(tabs)/friends.tsx. Respect active owner and existing open sheets.
- [x] Test and implement hooks/use_requested_feature_intro.ts. request() checks seen state, repeated taps coalesce, finish() opens the original sheet only after explanation dismissal; blur/unmount cancels pending requests. Connect components/DailyPhraseCard.tsx without removing its quest/audio/deep links.
- [x] Extend the implemented browser gallery with the same source definitions and five invocation captions. Rebuild isolated preview.
- [x] Run focused tests, syntax/whitespace checks, read-only review and preview checks. Keep current worktree; no commit, deployment or emulator.

Approved design: orbit for Cards, Statistics, Daily phrase and Friends; premiere for Videos. Use current theme, reduced-motion behavior and readable shared sheet. Explain only existing controls. Daily phrase begins on explicit opening, not merely viewing Home.

Verification: 27 Node contracts and 24 focused Jest tests passed. Eleven source files parsed with no syntax errors; targeted diff whitespace check passed. Browser gallery rebuilt; all five modal headings/body/CTA rendered, Cards dismissal verified. Read-only review found three P2 conflicts (Friends incoming modals, interrupted widget link, widget link over open daily details); all fixed and re-reviewed with no remaining P1/P2 findings. Jarvis fetchers do not read local intro definitions or seen keys; no data contract changes. No full-project typecheck, native build or emulator run. Shared theme/stage animations retained; the preview is React Native Web, not pixel-identical native screenshots.
