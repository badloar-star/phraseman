# Task packet: port the approved Cards section into the app (step by step)

Governance-ID: TG-4981506679EC
Status: In progress
Owner: App Check session (Claude), lane 3 (Cards and Mistakes, mockup and app screens)
Related epic/enabler: PhraseMan 2.0; coordinator order 04.10; owner: "transfer exactly 1:1 without any loss"

## Outcome

Every screen of the Cards section in the app looks and behaves exactly like docs/design/v2-app/cards-section.html (locked mockup): hub variant A, saved list with pinch and slider, unfolding card, packs, video block, modes, setup, sessions, answers, result, limit and offline. Success: the owner compares the emulator against the mockup and finds no difference; the visual-parity rows go green.

## Scope

In scope: view code of app/flashcards/* and the cards screens (hub, collection, training setup, session views, result), new view components, mockup index links. Out of scope: quota and data logic (monthly_training_sessions.ts, Core lane), themes, server, Mistakes screens until the owner approves that mockup, files with foreign uncommitted edits (CardPackShardPaywallModal.tsx, flashcards_target_gate.ts).

## Architecture

View-only changes behind the existing data hooks; the locked card design and zoom engine are reimplemented natively from the locked CSS and engine constants; no new data flow.

## Security and privacy

No new data, services or permissions; the privacy policy is unaffected.

## Technical debt

Contain: each step is a separate small commit; old view code is replaced, not duplicated; the performance rules from AGENTS.md (frozen background, instant first frame) apply.

## Verification

Per step: own unit tests with two workers, one type check under the semaphore, emulator comparison against the mockup (slot via the coordinator), visual-parity rows updated.

## Rollback

Revert the step commit; the previous screens return.
