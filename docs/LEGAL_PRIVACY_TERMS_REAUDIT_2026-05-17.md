# Legal, Privacy, Terms Re-audit - May 17, 2026

Scope: Phraseman app, account deletion flow, Privacy Policy, Terms of Use, Knowly public legal pages, Android privacy permissions, and related Cloud Functions.

This is an engineering/privacy implementation audit, not legal advice. Final legal wording and store declarations still need owner/legal review before release.

## Executive Status

Status: remediated and re-verified for the account deletion and legal-copy risks found in the May 17 audit.

Critical fixes now implemented:

- Server-side account deletion callable added: `accountDeleteMine`.
- `accountDeleteMine` deployed live in project `phraseman-ea0b3` and verified active.
- Client deletion flow now calls the backend first and only wipes local state after server success.
- In-app account deletion is now visible inside the Account modal as well as the settings footer.
- Deletion confirmation now blocks duplicate/accidental closes while the server request is running and describes deletion/de-identification accurately.
- Stable ID mismatch handling hardened so unlinked local IDs do not block deletion, while linked foreign IDs are rejected.
- Knowly legal sync fixed so root, admin OAuth privacy, and `knowly-www` legal pages are regenerated from canonical JSON.
- Public deletion page added at `https://knowlyapps.com/legal/data-deletion/` for Google Play account deletion requirements.
- Knowly legal hosting deployed and verified live: Privacy, Terms, and Data Deletion are dated May 17, 2026.
- Public legal nav no longer exposes the unnecessary `Apps v` dropdown.
- Privacy Policy and Terms updated to May 17, 2026 and expanded to cover cloud sync, social/multiplayer, UGC, chat/moderation, RevenueCat/Shards, analytics/diagnostics, notifications, retention, deletion, minors, and rights.
- Android Advertising ID, AdServices, legacy storage, overlay permission, and release cleartext trust surfaces are removed/blocked for release builds.
- Legal links added to the registration/sign-in prompt.

## Implemented Changes

### Account Deletion

Files:

- `functions/src/account_delete.ts`
- `functions/src/account_delete.test.ts`
- `functions/src/index.ts`
- `functions/package.json`
- `app/cloud_sync.ts`
- `app/auth_provider.ts`
- `app/(tabs)/settings.tsx`
- `components/DeleteAccountConfirmModal.tsx`

What changed:

- Added authenticated callable `accountDeleteMine` with App Check support through existing `ENFORCE_APP_CHECK`.
- Deletes or de-identifies active data across `users`, leaderboard/profile docs, auth links, name/friend/referral indexes, arena/matchmaking/session docs, league chat/moderation/report docs, community pack docs, RevenueCat-linked app records, app activity/error records, league chest/crown records, and relevant `messages` collection groups.
- Removes the user from league groups and deletes empty groups.
- Writes only hashed deletion tombstones in `account_deletion_log`.
- Deletes the Firebase Auth user with Admin SDK.
- Added tests for query coverage, deduping, stable ID fallback, stale local ID fallback, and rejection of a stable ID linked to another auth UID.
- Client deletion no longer attempts partial Firestore/Auth deletion locally. It calls `accountDeleteMine`, then signs out and clears local data, `AsyncStorage`, and stable ID.
- Settings now exposes deletion from the Account modal with destructive copy, so the route is easier to find for store review and real users.
- The confirmation modal keeps the user in the flow while deletion is pending, disables repeated actions, shows progress, and warns that store subscriptions must be cancelled separately.

Important behavior:

- If the local stable ID has no cloud link yet, deletion no longer fails just because the local ID is not verifiable. The function falls back to the known server-side ID or auth UID, then the app can finish local deletion.
- If the requested stable ID is linked to another Firebase Auth UID, deletion is rejected.

### Public Deletion Page

Files:

- `scripts/sync-legal-html.mjs`
- `knowly-www/legal/data-deletion/index.html`
- `legal/privacy_policy_en.json`
- `legal/privacy_policy_en_ios.json`
- `legal/terms_of_use_en.json`
- `legal/terms_of_use_en_ios.json`
- `privacy.html`
- `terms.html`
- `admin/oauth-privacy.html`
- `knowly-www/legal/privacy/index.html`
- `knowly-www/legal/terms/index.html`

What changed:

- `npm run legal:sync` now generates:
  - `terms.html`
  - `privacy.html`
  - `admin/oauth-privacy.html`
  - `knowly-www/legal/privacy/index.html`
  - `knowly-www/legal/terms/index.html`
  - `knowly-www/legal/data-deletion/index.html`
- Public deletion page explains how to delete in-app, how to email support if app access is unavailable, what data is deleted/de-identified, what may be retained, and that store subscriptions must be cancelled separately.
- Privacy/Terms now link to `https://knowlyapps.com/legal/data-deletion/`.
- Legal page header now uses direct links: Home, Phraseman, Privacy Policy, Terms, Contact. The old `Apps v` dropdown is removed.

### Legal Copy

Files:

- `legal/privacy_policy_en.json`
- `legal/privacy_policy_en_ios.json`
- `legal/terms_of_use_en.json`
- `legal/terms_of_use_en_ios.json`
- generated HTML copies listed above

Removed stale/high-risk claims:

- "all ages" without enough nuance
- "aggregated, anonymized" / "does not identify" for analytics and diagnostics
- "anonymous app user ID" for RevenueCat where stable IDs may be linked
- fixed "24 months inactivity" retention promise that had no implemented deletion job
- old EU ODR link
- stale Firebase Hosting README statement

Added coverage:

- General-audience/minors wording
- Firebase anonymous auth, Google/Apple sign-in, stable ID, cloud sync
- Public/social/multiplayer/profile/leaderboard visibility
- UGC/community packs/chat/reports/moderation
- Friend gifts/referrals/invite codes
- RevenueCat, subscriptions, purchases, Shards
- Analytics, Crashlytics, app health logs
- Notifications and local scheduled reminders
- Text-to-speech behavior
- Website contact form and support email processing
- Processors, legal bases, retention, deletion, rights, security, changes, contact

### Android Privacy Permissions

Files:

- `app.json`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/res/xml/phraseman_network_security_config.xml`
- `android/app/src/debug/res/xml/phraseman_network_security_config.xml`
- `android/app/src/debugOptimized/res/xml/phraseman_network_security_config.xml`
- `legal/privacy_policy_en.json`
- `plugins/withAndroidDevCleartext.js`

What changed:

- Removed explicit `com.google.android.gms.permission.AD_ID` from `app.json` permissions.
- Removed direct source-manifest request for `com.google.android.gms.permission.AD_ID`.
- Added `android.blockedPermissions` for:
  - `com.google.android.gms.permission.AD_ID`
  - `android.permission.ACCESS_ADSERVICES_AD_ID`
  - `android.permission.ACCESS_ADSERVICES_ATTRIBUTION`
  - `android.permission.ACCESS_ADSERVICES_TOPICS`
- Added Android manifest `tools:node="remove"` entries for the same ad-related permissions so dependency manifests do not reintroduce them during merge.
- Added release blocking/removal for legacy external storage and overlay permissions:
  - `android.permission.READ_EXTERNAL_STORAGE`
  - `android.permission.WRITE_EXTERNAL_STORAGE`
  - `android.permission.SYSTEM_ALERT_WINDOW`
- Release network security now sets `cleartextTrafficPermitted="false"` and trusts system certificates only.
- Debug and debugOptimized builds keep explicit dev overlays for cleartext/user certificates, so release hardening is not silently undone by local dev needs.
- Updated `plugins/withAndroidDevCleartext.js` so future prebuild/plugin runs preserve release hardening and only add dev cleartext to debug manifests.
- Privacy Policy says Android builds are not intended to request Advertising ID, and disclosures must be updated before adding ads/tracking.

Release manifest check:

- `./gradlew.bat :app:processReleaseMainManifest` completed.
- The regenerated release merged manifest does not contain `AD_ID`, AdServices, storage, or overlay permissions.
- Release merged manifest has `android:usesCleartextTraffic="false"`.

### Legal Links In App

File:

- `components/RegistrationPromptModal.tsx`

What changed:

- Added Privacy Policy and Terms of Use links to the sign-in/registration prompt using existing Knowly legal URLs.

## Verification

Passed:

- `node -e "JSON.parse(...)"` for all legal JSON files
- `npm run legal:sync`
- `node -e "JSON.parse(require('fs').readFileSync('app.json','utf8'))"`
- `npx expo config --type public`
- `npx tsc --noEmit --pretty false`
- `npm --prefix functions run build`
- `npm --prefix functions test -- --runInBand` - 6 suites, 44 tests passed
- `npm test -- --runInBand` - 96 suites, 1078 tests passed
- `npm test -- --runTestsByPath tests/trainer_modes.test.ts tests/release_notes_modal.test.ts --runInBand` - 168 tests passed after fixing unrelated stale content/build expectations
- `git diff --check` on touched legal/account-deletion/privacy/test files
- `node --check plugins/withAndroidDevCleartext.js`
- `./gradlew.bat :app:processReleaseMainManifest`
- Audit grep found no stale phrases:
  - `all ages`
  - `aggregated, anonymized`
  - `does not identify`
  - `anonymous app user ID`
  - `24 months`
  - old EU ODR URL
  - old "Current Firebase Hosting" README text

Live verification:

- `https://knowlyapps.com/legal/privacy/` returns the May 17, 2026 policy and no `Apps v` nav.
- `https://knowlyapps.com/legal/terms/` returns the May 17, 2026 terms and no `Apps v` nav.
- `https://knowlyapps.com/legal/data-deletion/` returns the May 17, 2026 deletion page and no `Apps v` nav.
- Firebase Functions lists `accountDeleteMine` as `ACTIVE`, 540 second timeout, 1024 MiB memory, URL `https://us-central1-phraseman-ea0b3.cloudfunctions.net/accountDeleteMine`.

## Remaining Release Checklist

Still required before store submission:

- Build a fresh Android AAB from the hardened manifest/config and inspect the final AAB manifest before uploading.
- Ship the updated app client so users and reviewers see the improved Account modal deletion route.
- Update Google Play Data safety with the public deletion URL: `https://knowlyapps.com/legal/data-deletion/`.
- Update App Store privacy labels / App Privacy details to match the new policy.
- Run a real-device deletion smoke test with a disposable Firebase account and verify the server deletes/de-identifies expected Firestore/Auth data.
- If admin OAuth privacy is served from a separate admin hosting target, deploy that target too.
- Legal/owner review of the final wording is still required because this audit is engineering/privacy implementation review, not legal advice.

## Sources Checked

- Google Play account deletion requirements: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/9888076
- Apple App Review Guidelines, including account deletion expectations: https://developer.apple.com/app-store/review/guidelines/
- Apple "Offering account deletion in your app": https://developer.apple.com/support/offering-account-deletion-in-your-app/
- Apple App privacy details: https://developer.apple.com/app-store/app-privacy-details/
- Expo permissions / blockedPermissions guidance: https://docs.expo.dev/guides/permissions/
- GDPR Article 13: https://eur-lex.europa.eu/eli/reg/2016/679/art_13/oj/eng
- California CCPA overview: https://oag.ca.gov/privacy/ccpa
