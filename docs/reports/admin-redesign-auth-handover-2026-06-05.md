# Admin Redesign/Auth Handover - 2026-06-05

## Current Priority

Restore reliable admin access before continuing any UI redesign.

The user reports that `https://phraseman-ea0b3.web.app` stays on the PhraseMan Admin login screen instead of automatically opening the admin from the saved Firebase session.

## Root Cause Found

The latest real blocker was not the Google button itself. The entire admin `<script type="module">` was failing before auth initialization.

Chrome DevTools Protocol check on production showed:

```text
SyntaxError: Identifier 'renderArenaWagerFeature' has already been declared
window._pmAdminGoogleSignIn === undefined
```

Because the module script failed, these never ran:

- `window._pmAdminGoogleSignIn = handleAdminGoogleSignIn`
- `onAuthStateChanged(auth, ...)`
- saved-session auto-open logic

## Fix Applied

File changed:

- `admin/index.html`

Removed the older duplicate Arena Bets implementation:

- duplicate `function renderArenaWagerFeature(data)`
- duplicate `window.loadArenaBetsFeature = async function loadArenaBetsFeature(force)`
- duplicate `window.saveArenaWagerFeature = async function saveArenaWagerFeature(active)`

Kept the newer clean Arena Bets implementation below it.

Also previously fixed auth flow so saved session is not blocked by `_adminAuthReady`:

- removed `await _adminAuthReady` from `onAuthStateChanged`
- replaced `_adminAuthReady` with `_adminAuthPersistenceReady`
- removed blocking `getRedirectResult` wait from auto-session path
- Google button remains enabled in HTML

## Tests Updated

File changed:

- `tests/admin_revenue_analytics_contract.test.ts`

Important new guards:

- Google login button must not be initially `disabled`
- `onAuthStateChanged` must not wait on `_adminAuthReady`
- no blocking `withAdminAuthTimeout(getRedirectResult(auth)` in auth boot path
- module script must not contain duplicate top-level function declarations
- `renderArenaWagerFeature` must appear exactly once
- `loadArenaBetsFeature` must appear exactly once

Latest test result:

```text
npx jest --runTestsByPath tests/admin_revenue_analytics_contract.test.ts --no-cache --runInBand
PASS
29 tests passed
```

## Deploy Status

Deployed with:

```text
npm run hosting:admin
```

Deploy completed successfully to:

```text
https://phraseman-ea0b3.web.app
```

## Browser Verification

Used Chrome headless with remote debugging against production after deploy.

Result:

```json
{
  "handler": "function",
  "btnDisabled": false,
  "btnText": "Войти с Google",
  "loginDisplay": "flex",
  "appDisplay": "none",
  "err": ""
}
```

Console events after fix:

```text
No Runtime.exceptionThrown
Only favicon.ico 404
```

Interpretation:

- admin module now boots
- Google handler is registered
- login button is clickable
- no JS SyntaxError remains
- headless browser has no saved Firebase session, so it correctly stays on login screen

## Maestro Status

Maestro CLI is installed:

```text
maestro --version
2.4.0
```

Syntax check for temporary web smoke flow passed:

```text
maestro check-syntax .codex-tmp/admin-login-smoke.yaml
OK
```

But local Maestro test runner did not execute web flow correctly on this Windows environment:

```text
maestro test --headless --platform web ...
You have 0 devices connected
```

`maestro list-devices` shows:

```text
Web
  chromium   default
```

But `--device chromium` and `--device default` both report not connected.

Conclusion: Maestro web runner/device selection is not currently usable from this shell. Chrome DevTools Protocol verification was used instead and successfully caught/fixed the actual production JS failure.

Temporary flow created:

- `.codex-tmp/admin-login-smoke.yaml`

## Important Working Tree Notes

The repository is very dirty with many unrelated app/assets changes. Do not revert or reset the repo.

Admin-related active files:

- `admin/index.html`
- `tests/admin_revenue_analytics_contract.test.ts`
- `.firebase/hosting.YWRtaW4.cache`
- `.codex-tmp/admin-login-smoke.yaml`
- `.codex-tmp-admin-live.html`

Most other modified/deleted/untracked files are unrelated to the admin task and should be ignored unless the user explicitly asks.

## What To Do Next

1. Ask the user to hard refresh `Ctrl+F5`.
2. If they still see login instead of auto-open:
   - ask whether clicking Google opens the popup
   - inspect browser console on their real browser/profile if possible
   - likely causes after this fix:
     - no saved Firebase session in that browser
     - user signed out earlier via admin sign out
     - admin custom claim missing/expired
     - browser blocks Firebase local persistence
3. Do not continue redesign until access is confirmed.
4. When continuing redesign, keep auth tests and module duplicate guard green before every deploy.

## Latest Verified Good Commands

```powershell
npx jest --runTestsByPath tests/admin_revenue_analytics_contract.test.ts --no-cache --runInBand
npm run hosting:admin
```

Production HTML checks should include:

```text
window._pmAdminGoogleSignIn is function
Google button does not contain disabled
No Runtime.exceptionThrown in Chrome DevTools
No duplicate top-level function declarations
```
