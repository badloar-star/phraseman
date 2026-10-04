# Task packet: "My mistakes" section mockup in the approved glass style

Governance-ID: TG-9066A22C861A
Status: In progress
Owner: App Check session (Claude)
Related epic/enabler: PhraseMan 2.0 redesign, owner request 04.10 ("do the mistakes section too, same thoughtful and beautiful style as the cards mockups")

## Outcome

The owner opens one page and sees every screen, state and window of the "My mistakes" section (home entry, hub, list, mistake card, drill task types, answers and explanation, result, empty/offline states) in exactly the approved cards-section style: glass surfaces, gradient of the theme colour inside, aurora background, accent main button, themes switchable. Success: owner approves; page passes the overlap scanner.

## Scope

In scope: docs/design/v2-app/mistakes-section.html (new mockup page, reuses cards-glass.css and the locked card CSS read-only). Out of scope: the Design session's mistakes-v2.html, application code, release gates.

## Architecture

No architecture change: static HTML on kit.css/kit.js plus the existing glass skin; the locked card block is only linked, never edited.

## Security and privacy

Static page, no external resources, invented sample words, no data collected. No privacy impact.

## Technical debt

Contain: after approval the page is locked like cards-section and the visual-parity registry rows are added; mistakes-v2.html stays untouched as the Design session's draft.

## Verification

Open http://127.0.0.1:8765/mistakes-section.html, switch themes, flip the card, run node scripts/mockup_overlap_scan.mjs mistakes-section and expect 0 overlaps; screenshot every group.

## Rollback

Delete the new page; nothing depends on it.
