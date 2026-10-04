# Task packet: real redesign of the "My mistakes" mockup

Governance-ID: TG-0F0E8FF2E8EF
Status: In progress
Owner: App Check session (Claude)
Related epic/enabler: PhraseMan 2.0 redesign; owner feedback 04.10: "you changed nothing in My mistakes, only colours"

## Outcome

The mistakes mockup is rebuilt with new structure, not only new colours: hub with the approved stack and four equal tiles (same grammar as the cards hub), mistakes shown as the approved flip cards in a grid, a mistake opens as the unfolding card, drill questions are the card itself and the answer is shown by flipping it, result as a ring. Success: owner approves; overlap scan clean.

## Scope

In scope: docs/design/v2-app/mistakes-section.html only. Out of scope: Design session's mistakes-v2.html, application code, locked cards files (linked read-only).

## Architecture

Static HTML on kit.css/kit.js plus the existing glass skin and the locked card CSS; no new dependencies.

## Security and privacy

Static page, invented sample words, no data collected. No privacy impact.

## Technical debt

Contain: previous version of the page stays in git history; after approval the page is locked like cards-section.

## Verification

Open http://127.0.0.1:8765/mistakes-section.html, switch themes, tap cards, run node scripts/mockup_overlap_scan.mjs mistakes-section (expect 0), screenshot every group.

## Rollback

git revert the commit; the earlier skin-only version returns.
