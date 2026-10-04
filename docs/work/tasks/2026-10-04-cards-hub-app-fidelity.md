# Task packet: Cards hub fidelity fixes after the first emulator comparison

Governance-ID: TG-069837E2E0EF
Status: In progress
Owner: App Check session (Claude), lane 3
Related epic/enabler: coordinator order 04.10, step 2 of the Cards port; parent packet 2026-10-04-cards-section-app-port.md

## Outcome

The Cards hub screen looks exactly like the approved hub A of docs/design/v2-app/cards-section.html: header with the monthly limit pill and plus, title, a three-layer card stack with the top saved word, the accent button with the remaining sessions, and four equal tiles (Saved, My packs, From video, Community) without scrolling. Success: the coordinator's snapshot comparison against the mockup finds no difference.

## Scope

In scope: app/flashcards/FlashcardsHubScreen.tsx render part and a new view component under app/flashcards/. Out of scope: quota and data logic (monthly training sessions, quota preview hook), mode sheet logic, other Cards screens, files with foreign uncommitted edits.

## Architecture

View-only change: existing state (counts, quota preview, mode sheet handlers, early-tap handling) stays; the JSX tree is replaced by the new hub view fed with those values. No new data flow.

## Security and privacy

No new data, services or permissions. Privacy policy unaffected.

## Technical debt

Contain: the old library rows and the community top block are removed from the hub render, not duplicated; source-contract tests of the old hub layout are updated to the approved layout in the same commit.

## Verification

Own unit tests with two workers, one type check under the semaphore, emulator snapshot next to the mockup (window from the coordinator), parity rows for the hub updated by the coordinator.

## Rollback

Revert the commit; the previous hub returns.
