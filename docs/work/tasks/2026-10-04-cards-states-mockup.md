# Task packet: Cards states mockup - states missing from the approved cards-section

Governance-ID: TG-821934B65CE1
Status: In progress
Owner: App Check session (Claude), lane 3
Related epic/enabler: coordinator rule 04.10: every state of the old cards.html must be found in the new mockup; orphaned states are listed and drawn

## Outcome

One extra page, docs/design/v2-app/cards-states.html, draws the states of the old cards mockup that the approved cards-section.html does not contain (loading, errors, empty, confirmations, menus, complaints, card editor, pack creation, training preparation), in the same approved style. Success: owner approves; every old state maps to a new screen or to the explicit block "needs the owner's answer".

## Scope

In scope: the new mockup page only (plus registry rows after approval). Out of scope: cards-section.html and its lock, application code, states that contradict the new mockup (they go to a separate block for the owner), the outdated "first 20 free cards" state (replaced by the monthly limit already in the approved mockup).

## Architecture

Static HTML on kit.css/kit.js, the glass skin and the locked card CSS linked read-only; no new dependencies.

## Security and privacy

Static page, invented sample words, no data collected. No privacy impact.

## Technical debt

Contain: after approval the page is locked like cards-section and the parity registry gets rows cards-states-NNN, then the old cards.html rows are marked superseded.

## Verification

Open http://127.0.0.1:8765/cards-states.html, switch themes, run the overlap scan for cards-states (expect 0), screenshot every group.

## Rollback

Delete the page.
