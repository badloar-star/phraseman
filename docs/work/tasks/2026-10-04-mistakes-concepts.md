# Task packet: three genuinely different design concepts for the Mistakes section

Governance-ID: TG-9530C6A274BE
Status: In progress
Owner: App Check session (Claude), lane 3
Related epic/enabler: owner 04.10: "do not repeat the Cards section in Mistakes, make Mistakes differently"

## Outcome

One page shows three concepts of the Mistakes section that do not reuse the Cards language (no stack hero, no 2x2 tiles, no card grid, no flip card): a journal timeline, a dashboard with a ring, and a weak-spot map. Four key screens each (hub, mistake detail, drill question, wrong answer). The owner picks one; then the full section is built in the chosen direction.

## Scope

In scope: docs/design/v2-app/mistakes-concepts.html (new page). Out of scope: mistakes-section.html (previous attempt stays until replaced), application code.

## Architecture

Static HTML on kit.css/kit.js and the existing glass skin colours (theme aurora, accent button); only the layout language differs from Cards.

## Security and privacy

Static page, invented sample words, no data collected. No privacy impact.

## Technical debt

Contain: the rejected mistakes-section.html is replaced once a concept is chosen.

## Verification

Open http://127.0.0.1:8765/mistakes-concepts.html, switch themes, run the overlap scan for mistakes-concepts (expect 0).

## Rollback

Delete the page.
