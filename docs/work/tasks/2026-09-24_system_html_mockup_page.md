# Task packet: add system.html design mockup page (Coins/Plus/system windows)

Governance-ID: TG-9CB6A9D23160
Status: Planned
Owner: Claude (design mockup session)
Related epic/enabler: docs/design/v2-app (PhraseMan 2.0 design mockups)

## Outcome

A single static HTML mockup page, `docs/design/v2-app/system.html`, showing the
2.0 redesign of: coin wallet, rank ladder, currency-migration notice, one
consolidated Plus paywall and its related modals, energy explanation/no-energy
state, and system windows (update, release notes, broadcast, personal message,
offline, recovery, not-found, confirm/choice modals, report-error sheet,
toast). This is a design reference for the owner and future implementers to
follow — it renders no app code and ships nothing to production.

## Scope

In scope: creating `docs/design/v2-app/system.html` only, using the existing
shared `kit.css` / `kit.js` / `nav.js` mockup toolkit already used by the
sibling pages (`home.html`, `learn.html`, `finish.html`, etc.) in the same
folder. No application source under `app/`, `components/`, or `functions/` is
touched. No git commands are run (per `AGENT_BRIEF.md`).

Out of scope: implementing any of these screens in the real React Native app;
changing `kit.css`/`kit.js`/`nav.js`; touching any other design mockup page;
any backend/data work.

## Architecture

No architecture change. This is a static, standalone HTML/CSS/JS design
reference page consumed only by a browser for visual review — it has no
runtime coupling to the app, no data flow, and defines no contracts.

## Security and privacy

Not applicable. The page contains only placeholder/sample copy and no real
user data, credentials, or network calls; it is not shipped to end users.

## Technical debt

None created. This is a disposable design artifact, not production code.

## Verification

- Render `system.html` in headless Edge at a fixed window size and inspect
  the screenshot in slices (per `AGENT_BRIEF.md`) to confirm no clipped text,
  no overlap with tab bars/footers, and every listed screen/state present.
- Visual comparison against `docs/design/v2-app/refs/ref_15..23.webp` for
  style consistency (glass buttons, warm-edge cards, serif headlines, etc.).

## Rollback

Delete `docs/design/v2-app/system.html`; no other file depends on it (only
`nav.js`'s static page list references its filename for cross-page navigation
labels).
