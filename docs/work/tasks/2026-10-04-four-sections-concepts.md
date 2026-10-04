# Task packet: design concepts for Home, Today, Dialogs, Lessons + Learning B2, Video, Community packs

Governance-ID: TG-72C10790BB99
Status: In progress
Owner: App Check session (Claude), lane 3 (mockups with the owner)
Related epic/enabler: owner 04.10, after the Mistakes concept choice: "do the same for Home, Today (the new section opened by the Today block), Dialogs, Lessons and Learning B2, Video, and Packs"

## Outcome

For each section one page with three genuinely different design concepts (four key screens each, taken from the screens and content of the existing mockups of that section, nothing invented), so the owner picks a direction per section exactly as it was done for Mistakes. Pages: home-concepts.html (Home and Today), dialogs-concepts.html, lessons-concepts.html (Lessons and Learning B2), video-concepts.html, packs-concepts.html (Community packs tab).

## Scope

In scope: the new concept pages under docs/design/v2-app. Out of scope: the existing mockups of those sections (they stay as history), application code, Cards and Mistakes.

## Architecture

Static HTML on kit.css/kit.js and the glass skin colours; the template is mistakes-concepts.html.

## Security and privacy

Static pages, invented sample data, no collection. No privacy impact.

## Technical debt

Contain: after the choice the full section page is built and locked like Cards and Mistakes; the concept pages are archived.

## Verification

Overlap scan for each page (expect 0) and screenshot review.

## Rollback

Delete the pages.
