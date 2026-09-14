# Task Packet: Consent-aware Website CWV RUM

## Scope

- Add a small browser-only observer for LCP, INP and CLS.
- Send only after explicit `pm_consent=yes`, with route template, device class and release marker.
- Never include query strings, fragments, free-form URLs, user identifiers or raw event data.
- Keep transmission disabled until a separately approved backend endpoint is configured.

## Non-goals

- No new analytics vendor, cookie, fingerprint, or cross-site identifier.
- No change to the existing `siteStatsTrack` schema; the observer was included in the separately authorized hosting release but remains disabled without an endpoint.
- No alerting before a two-week baseline.

## Security, privacy and debt

- Consent is a hard gate; missing or declined consent drops metrics.
- The endpoint is explicit (`KNOWLY_SITE.webVitalsEndpoint`) and defaults to disabled.
- A future endpoint/schema change requires a new task packet, privacy review, and server-side allowlist tests.

## Verification

- `node --test tests/website_web_vitals_contract.test.mjs`
- `node scripts/verify_website_surface_contract.mjs --root knowly-www --require-security-headers`
- `git diff --check`

## Evidence

- RED captured before implementation: the contract test failed because the observer file was absent.
- GREEN: `node --test tests/website_web_vitals_contract.test.mjs` (2/2).
- GREEN: `node --check knowly-www/assets/js/web-vitals.js`.
- GREEN: `node scripts/verify_website_surface_contract.mjs --root knowly-www --require-security-headers`.

## Status

Client observer is deployed but collection remains intentionally disabled because no reviewed `webVitalsEndpoint` exists and the current `siteStatsTrack` backend rejects CWV event types. No telemetry or alerting is claimed.
