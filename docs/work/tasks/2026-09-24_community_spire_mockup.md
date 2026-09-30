# Task packet: Community/Spire design mockup page

Governance-ID: TG-DB9EB25EFD36
Status: Planned
Owner: design-mockup session (AGENT_BRIEF.md)
Related epic/enabler: E25 (Spire), D31/D40 (new style)

## Outcome

A single static HTML mockup page `docs/design/v2-app/community.html` showing every
screen/state of the "Сообщество" tab (Шпиль/Друзья/Наборы) per
`docs/design/v2-app/AGENT_BRIEF.md`. No app code, no runtime behavior — pure design
reference for the owner and future implementation sessions.

## Scope

In scope: `docs/design/v2-app/community.html` only (new file), using the shared
`kit.css`/`kit.js`/`nav.js` already present in that folder. Purely presentational
HTML/CSS/inline JS demo interactions (tap-to-highlight floor, sheets/modals).

Out of scope: any file under `app/`, `components/`, `functions/`, `modules/` —
this task never touches production code, data contracts, or the real Spire/Community
implementation.

## Architecture

No architecture change. This is a static design artifact outside the application
bundle (`docs/design/**`), not wired into any build, route, or runtime.

## Security and privacy

None applies — static mockup HTML with placeholder names/numbers, no real user data,
no network calls, no auth.

## Technical debt

None created. Mockup file is disposable reference material, superseded once the
real screens are implemented.

## Verification

Manual: render `community.html` in headless Edge per AGENT_BRIEF.md instructions,
inspect screenshots for layout/overflow bugs, fix, and re-render until clean.

## Rollback

Delete or overwrite `docs/design/v2-app/community.html`; no other file depends on it.
