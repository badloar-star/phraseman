# Task packet: rebuild the cards-states mockup on the approved screens

Governance-ID: TG-DED2BDFACA7A
Status: In progress
Owner: App Check session (Claude), lane 3
Related epic/enabler: owner 04.10: "redo everything - states cannot look different from what I already approved (hub, lists, forms, no card backs)"

## Outcome

Every extra state of the Cards section is built from the same approved building blocks as cards-section.html (header, lists of packs, video rows, deck pick rows, forms, sheets, empty states), so a state never looks different from its approved family. Success: owner approves page by page.

## Scope

In scope: docs/design/v2-app/cards-states.html (rebuilt from the approved helpers) and the build script in the scratchpad. Out of scope: cards-section.html and its lock, application code, removed items (card backs, pack art, design block of pack creation).

## Architecture

The page reuses the approved page's styles and helper functions; new screens only compose them and add the state-specific toast, modal or sheet.

## Security and privacy

Static page, invented sample data, no collection. No privacy impact.

## Technical debt

Contain: replaces the earlier verbatim-old-state version; after approval the page is locked like cards-section.

## Verification

Overlap scan for cards-states (expect 0) and screenshot review of every group against its approved counterpart.

## Rollback

git revert the rebuild commit.
