# Home reward buttons implementation plan

> Execute inline in the existing checkout; owner approved the design on 2026-09-08. No new worktree or delegated writer.

**Goal:** Move Spin and Gift below the level card, before Quick start, using equal compact controls with internal counts.
**Architecture:** Relocate the existing JSX in app/(tabs)/home.tsx outside the statistics TouchableOpacity. Keep balance state, callbacks, routes, pulse, gift target ref and unread projection unchanged.
**Tech Stack:** React Native, existing TapScale, palette, Expo Image.

- [x] Update tests/home_spin_entry_contract.test.ts to require `home-stats-card < home-reward-actions < home-quickstart-title`, matching themed button surfaces and counts inside each surface. Run it and confirm old layout fails.
- [x] Move the existing conditional action row to a sibling below the stats wrapper. Use `flexDirection: 'row'`, gap 10, each visible slot `flex: 1, minWidth: 0`, `minHeight: 52`, shared panel palette and gold count chips with dark text. Preserve an invisible measurable gift target without reserving empty row height.
- [x] Update the superseded position assertions in tests/daily_journey_home_stats_contract.test.ts; preserve all delivery, grant, navigation and stale-response assertions. Run these two focused suites under the repository semaphore, one worker, isolated ts-jest. Parse home.tsx and check diff whitespace.
- [x] Record completion and any native visual verification limitation in docs/main-course-free-access-2026-09-08.md. Do not publish a build.

## Owner revision — compact header shortcuts (2026-09-08)

The owner rejected the separate full-width reward row as too large. This
supersedes its placement and size requirements above. Spin and Gift now share
the existing header with the notification, energy, video and profile controls:
28-point artwork, 44-point touch targets, 18-point gold badges with dark text,
no text labels or filled button panels. Badge display caps at 99+; localized
accessibility labels retain the full counts. Narrow-header side padding is
12 points so the shortcuts fit alongside the existing controls. Empty rewards
consume no visible slot; the hidden gift-flight measurement target remains.

Direct navigation, delivery pulse, markInventoryOpened and existing balance
subscriptions remain. Focused verification: 2 suites / 36 tests PASS, TSX parse
0 diagnostics. Log: .codex-tmp/home-compact-rewards.log. Native rendering and
screen-reader interaction were not exercised; no build was published.
