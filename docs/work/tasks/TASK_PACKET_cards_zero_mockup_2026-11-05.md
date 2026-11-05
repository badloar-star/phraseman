# Task packet: mockup "Карточки 0/0" on the real owner frame

Governance-ID: TG-234105006FA7
Status: In progress
Owner: 3 · МАКЕТЫ session (coordinator decision 06:2x)
Related epic/enabler: owner screen 09 "не тот макет"; MASTER row 28

## Outcome
Interactive mockup docs/work/mockups/cards-zero-2026-11-05/cards_zero.html built on the REAL owner frame (screens 09): "Сейчас" (untouched frame) vs "0/0 как будет" (no "Начни с готового" plate, one main button "Создать набор") + approved reference render (cards-section phone 1).

## Scope
In scope: mockup HTML/PNG under docs/work/mockups, no app code. Out of scope: removing the plate from FlashcardsHubScreen (Дизайн).

## Architecture
No architecture change; static HTML with canvas patching of a real frame (rule: mockups only on real screens).

## Security and privacy
The embedded frame is the owner's TestFlight screenshot (test account, no personal data beyond a friend code absent on this screen).

## Technical debt
Contain: has-cards state shown via approved reference image, not drawn on the real frame (no real frame of that state at hand).

## Verification
Headless run: 0 console errors, both states render; viewed screenshots.

## Rollback
Delete the folder.
