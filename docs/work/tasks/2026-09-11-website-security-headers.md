# Task Packet: Website Security Headers (Report-Only)

## Scope

- Add baseline security response headers to the live `knowlywww` Firebase Hosting target.
- Start CSP in `Content-Security-Policy-Report-Only` mode only.
- Inventory and document the origins required by the current website before enforcement.
- Add a machine-checkable contract and local verification evidence.

## Non-goals

- No DNS change, Firebase console change, or CSP enforcement; the explicitly authorized `knowlywww` hosting deploy is recorded below.
- No changes to the admin hosting surface or application runtime code.
- No removal of existing third-party integrations.

## Security and privacy

- Headers must reduce MIME sniffing, referrer leakage, and unnecessary browser capabilities.
- CSP must be report-only initially so violations can be reviewed without breaking users.
- The policy must not add analytics, tracking, or new data collection.

## Technical-debt management

- Keep the report-only policy and origin inventory versioned in `firebase.json` and this packet.
- Record every observed CSP violation as a follow-up task before switching to enforcement.
- Treat each new external origin as a reviewed change to the CSP allowlist.

## Verification

- `node --test tests/website_security_headers_contract.test.mjs`
- `node scripts/verify_website_surface_contract.mjs --root knowly-www`
- `node --check scripts/verify_website_surface_contract.mjs`
- `git diff --check`

## Rollback

- Revert only the `knowlywww` header additions and their contract test; do not alter redirects, rewrites, or site content.

## Status

## Origin inventory (2026-09-11)

The current website source references these non-self origins that are relevant to the report-only policy:

- `https://connect.facebook.net` (browser pixel script/connectivity)
- `https://www.paypal.com` (checkout SDK/frames/connectivity)
- `https://us-central1-phraseman-ea0b3.cloudfunctions.net` (website callable HTTP endpoints)
- Store and informational links (`apps.apple.com`, `play.google.com`, `t.me`, `schema.org`) remain navigation/content URLs and are not script/connect/frame origins.

## Evidence

- RED captured before implementation: the two contract tests failed because `knowlywww` had no security baseline.
- GREEN: `node --test tests/website_security_headers_contract.test.mjs` (2/2).
- GREEN: `node scripts/verify_website_surface_contract.mjs --root knowly-www --require-security-headers`.
- GREEN: `node --check scripts/verify_website_surface_contract.mjs`.

Deployed to `hosting:knowlywww` on 2026-09-11 after explicit owner authorization. Post-deploy checks passed on `https://knowlyapps.com/` and `https://knowlyapps.web.app/`: HTTP 200 and all five expected headers present. CSP remains report-only; no violation telemetry or enforcement was enabled.
