# Task packet: Cards gallery zoom mockup and beautiful hub variants

Governance-ID: TG-FD16B5CF4143
Status: In progress
Owner: App Check session (Claude)
Related epic/enabler: PhraseMan 2.0 cards redesign, owner request 04.10

## Outcome

The owner can open one mockup page and try, with a slider and a pinch gesture, how flashcards resize and change shape like a phone gallery, see the cards in the pre-2.0 form (slightly lower) with gradient, glass and transparency, and choose one of five new hub designs. Success: the owner picks one hub design and confirms the card behaviour; the page passes the overlap scanner.

## Scope

In scope: docs/design/v2-app/cards-gallery.html (new mockup page only). Out of scope: application code, other mockups, release gates.

## Architecture

No architecture change: a static HTML mockup built on the existing kit.css and kit.js with a small layout engine in the page script.

## Security and privacy

The page is static, loads no external resources, collects no data and uses invented sample words only. No privacy impact.

## Technical debt

Contain: the page reuses kit.css classes and adds local styles; after the owner chooses a variant the winner is moved into the product mockups and this page is archived.

## Verification

Open http://127.0.0.1:8765/cards-gallery.html, drag the slider, check columns 1 to 4, flip a card, switch themes, then run node scripts/mockup_overlap_scan.mjs cards-gallery and expect no overlaps.

## Rollback

Delete the new file; nothing else depends on it.
