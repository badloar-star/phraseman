# Task packet: cards.html mockup page (PhraseMan 2.0 design set)

Governance-ID: TG-31E9C7ECBD08, TG-F26B5168F3FF
Status: Planned
Owner: session (docs/design/v2-app agent)
Related epic/enabler: docs/phraseman-2.0 (E06/E07 flashcards), design-only, no code epic

## Outcome

A single static HTML mockup page `docs/design/v2-app/cards.html` showing every
Flashcards ("Карточки") screen and state for the PhraseMan 2.0 visual redesign,
built from the shared `kit.css`/`kit.js` design kit and matching the owner's
reference screenshots (`refs/ref_15..23.webp`). This is a design artifact for
the owner to review — no app code changes, no runtime behavior change.

## Scope

In scope: `docs/design/v2-app/cards.html` only (new file). Reads real Russian
copy and screen structure from `app/flashcards/**`, `app/flashcards_*.tsx`,
`app/community_packs/**` to keep the mockup faithful, but does not modify any
of those files.

Out of scope: any app/, functions/, or component code; kit.css/kit.js/home.html
(shared design-kit files, per AGENT_BRIEF.md they must not be edited); other
mockup pages (home.html etc.) already exist and are untouched.

## Architecture

No architecture change. This is a pure documentation/design artifact (static
HTML+CSS+JS mockup, no build step, no app runtime). It does not integrate with
the application; it exists purely for visual review under `docs/design/v2-app/`.

## Security and privacy

No security or privacy impact: static local HTML file with hardcoded sample
copy, no user data, no network calls, no auth, not shipped in the app bundle.

## Technical debt

None created. This is a disposable/reference design artifact, not production
code; no debt disposition applies.

## Verification

- Render the page headless (Edge `--headless=new --screenshot=...`) at several
  window heights and visually inspect via Read on the resulting PNG slices to
  confirm no overlapping/clipped elements, per AGENT_BRIEF.md's own checklist.
- Manual check: every screen/state listed in the assignment is present as its
  own phone with a caption; texts are real Russian product copy (no invented
  features); energy pill + demo present on first screen of each training mode;
  completion screens use the shared `K.completion` layout only.

## Rollback

Delete `docs/design/v2-app/cards.html` (and this task packet) — no other file
depends on it, no data or entitlement involved.
