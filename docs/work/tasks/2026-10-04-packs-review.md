# Task packet: review of the Community packs concept page

Governance-ID: TG-CB3CE20536D4
Status: In progress
Owner: App Check session (Claude), lane 3
Related epic/enabler: same request as 2026-10-04-four-sections-concepts.md (owner 04.10: concepts for Home, Today, Dialogs, Lessons, Learning B2, Video, Community packs)

## Outcome

Concept pages video-concepts.html and packs-concepts.html are added, every concept page is reviewed against screenshots and shown to the owner with the open questions, and the pages are committed. Success: the owner can open all pages and pick one direction per section.

## Scope

In scope: docs/design/v2-app/*-concepts.html pages only. Out of scope: existing mockups, Cards, Mistakes, application code.

## Architecture

Static HTML pages on kit.css/kit.js with the template mistakes-concepts.html; no code paths.

## Security and privacy

Static pages with invented sample data; no data collected. No privacy impact.

## Technical debt

Contain: after the owner chooses, the chosen concept is built into a full section page and locked; the others are archived.

## Verification

Overlap scan per page (expect 0) and screenshot review.

## Rollback

Delete the pages.
