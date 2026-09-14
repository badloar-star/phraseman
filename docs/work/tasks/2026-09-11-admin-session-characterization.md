# Task Packet: Admin Session Characterization

## Scope

- Characterize the current login/session DOM and error states of the single live admin surface.
- Add a static contract that protects IDs, login gating, sign-out behavior markers and the retired-surface boundary.

## Non-goals

- No extraction, UI change, App Check change, callable change or admin deploy. The read-only smoke below did not submit credentials or invoke an admin command.
- No restoration of the deleted white V2 router/core/UI.

## Security/privacy and debt

- Preserve admin custom-claim gating and visible `permission-denied`/auth errors.
- Any future extraction requires a new packet with behavioral equivalence evidence.

## Verification

- `node --test tests/admin_session_shell_contract.test.mjs`
- `node scripts/verify_website_surface_contract.mjs --root knowly-www --require-security-headers`

## Evidence

- GREEN: `node --test tests/admin_session_shell_contract.test.mjs` (2/2).
- Read-only production smoke: `https://phraseman-ea0b3.web.app/legacy.html#control-panel` loaded `PhraseMan Admin`; an existing authenticated session rendered the admin shell, sign-out control and stable search/navigation controls. No mutation control was clicked and no data was changed.

## Status

Static characterization and read-only production smoke complete; seam extraction intentionally deferred pending a separately reviewed implementation packet.
