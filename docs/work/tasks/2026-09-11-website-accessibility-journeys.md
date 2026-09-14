# Task Packet: Website Accessibility Journeys

## Scope

- Add static contract coverage for keyboard entry, focus visibility, semantic headings, FAQ disclosure, reduced motion, and narrow/zoom-safe layout signals on primary website routes.
- Fix only defects demonstrated by the contract; preserve the existing visual system and behavior.

## Non-goals

- No Lighthouse upload or production mutation beyond the separately authorized `knowlywww` hosting release.
- No content rewrite, route removal, or replacement of the approved website surface.

## Security/privacy and debt

- Tests are local and do not collect screenshots, URLs, or user data.
- Accessibility regressions become a required local gate for future website changes.
- Any browser-confirmed failure gets its own small packet and regression test.

## Verification

- `node --test tests/website_accessibility_journeys.test.mjs`
- `node scripts/verify_website_surface_contract.mjs --root knowly-www --require-security-headers`

## Evidence

- GREEN: `node --test tests/website_accessibility_journeys.test.mjs` (3/3); current primary routes satisfy the covered static contracts.
- Production route review completed after owner authorization: 12 primary routes returned HTTP 200, each exposed a title, one primary heading and a skip link. The accessibility tree for the published home page exposed keyboard-entry links, semantic headings and FAQ buttons. Device VoiceOver/TalkBack evidence is still pending.

## Status

Static journey coverage and the authorized production route review are complete; no source fix was required. Physical-device assistive-technology evidence remains open.
