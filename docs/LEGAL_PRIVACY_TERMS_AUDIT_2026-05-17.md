# Privacy Policy / Terms of Use audit - Phraseman

Date: 2026-05-17

Scope: engineering and product audit of the current repository against the current Privacy Policy and Terms of Use. This is not legal advice and should be reviewed by counsel before publication or store submission.

Important date note: the legal files say "Last updated: April 30, 2026", so the problem is not only the date. The problem is that the text no longer matches the product surface and backend behavior found in the app.

## Executive summary

The current Privacy Policy and Terms need a material update before the next release. The biggest risks are:

1. Account deletion is over-promised. The UI implies broad/permanent deletion, but the client deletion path deletes only selected docs and cannot remove all top-level collections or Firestore subcollections.
2. Analytics and diagnostics are described as anonymized, but the app sets Firebase Analytics/Crashlytics user IDs and stores local/Firebase activity/error records with uid, username, app version, device/platform data.
3. "All ages" is risky for the current feature set: public profiles, UGC packs, league chat, reports, friend gifts/activity, referrals, subscriptions, and virtual currency.
4. RevenueCat and Shards are under-disclosed. The code uses a stable canonical app user ID with RevenueCat and processes both subscriptions and non-renewing Shards purchases.
5. The live public legal pages can drift from canonical JSON. The sync script updates root HTML and admin OAuth HTML, but the app links to `https://knowlyapps.com/legal/...`, served from `knowly-www`.

Recommended release stance: treat this as a blocking legal/compliance cleanup unless the affected features are disabled for store builds.

## Official references checked

- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple App Review Guidelines, especially 1.2, 4.5.4, 5.1.1, 5.1.2, 5.1.4: https://developer.apple.com/app-store/review/guidelines/
- Google Play User Data policy: https://support.google.com/googleplay/android-developer/answer/10144311?hl=en
- Google Play account deletion requirements: https://support.google.com/googleplay/android-developer/answer/13327111?hl=en
- FTC COPPA guidance: https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-not-just-kids-sites
- GDPR Article 13: https://eur-lex.europa.eu/eli/reg/2016/679/art_13/oj/eng
- California CCPA overview / required notices: https://oag.ca.gov/privacy/ccpa
- Firebase Firestore deletion behavior: https://firebase.google.com/docs/firestore/manage-data/delete-data
- EU ODR platform closure: https://consumer-redress.ec.europa.eu/site-relocation_en

## Current legal surfaces

Canonical in-app sources:

- `legal/privacy_policy_en.json`
- `legal/privacy_policy_en_ios.json`
- `legal/terms_of_use_en.json`
- `legal/terms_of_use_en_ios.json`
- `app/privacy_screen.tsx:11`
- `app/terms_screen.tsx:11`

Public website copies:

- `knowly-www/legal/privacy/index.html`
- `knowly-www/legal/terms/index.html`

Operational issue:

- `scripts/sync-legal-html.mjs:114` writes root `terms.html`.
- `scripts/sync-legal-html.mjs:123` writes root `privacy.html`.
- `scripts/sync-legal-html.mjs:124` writes `admin/oauth-privacy.html`.
- `firebase.json:26` serves `knowly-www`, not the root HTML.
- `legal/README.md:16` still says current Firebase Hosting targets admin only, which is now false.

Result: updating canonical JSON and running `npm run legal:sync` does not reliably update the legal pages used by the app footer (`app/config.ts` points to `https://knowlyapps.com/legal/privacy/` and `/terms/`). The legal publishing pipeline should be fixed before editing text.

## Data and feature inventory

Local storage:

- Learning progress, XP, streaks, lessons, achievements, flashcards, settings, notification settings and activity queues are stored in `AsyncStorage`.
- Stable ID is stored in SecureStore and mirrored into `AsyncStorage`: `app/stable_id.ts:23`, `app/stable_id.ts:24`, `app/stable_id.ts:96`, `app/stable_id.ts:128`.
- The code comments explicitly mention Android Auto Backup behavior: `app/stable_id.ts:8`, `app/stable_id.ts:10`.

Identity and auth:

- Firebase anonymous auth is default.
- Optional Google/Apple sign-in stores provider UID, email/display name when provided, platform and timestamps: `app/auth_provider.ts:685`, `app/auth_provider.ts:691`.
- `auth_links/{providerUid}` is used for identity linking and can remain orphaned after delete: `app/auth_provider.ts:1221`, `app/auth_provider.ts:1231`.

Cloud sync:

- `app/cloud_sync.ts:106` lists a large sync surface: XP, lessons, stats, premium metadata, certificates, custom flashcards, community pack ownership, foreground usage, daily breakdowns, and many lesson keys.
- User docs are written under `users/{uid}` and activity stamps: `app/cloud_sync.ts:765`, `app/cloud_sync.ts:776`.
- Arena/public profile mirrors are written under `arena_profiles`: `app/cloud_sync.ts:782`, `app/cloud_sync.ts:796`.

Analytics and diagnostics:

- Firebase Analytics events are logged: `app/firebase.ts:9`, `app/firebase.ts:18`.
- Firebase Analytics and Crashlytics user IDs are set: `app/firebase.ts:30`, `app/firebase.ts:31`, `app/firebase.ts:32`.
- App activity queue stores uid, username, app/build/platform/state locally and sometimes in Firestore: `app/app_activity.ts:17`, `app/app_activity.ts:63`, `app/app_activity.ts:73`, `app/app_activity.ts:96`.
- App errors can be written to `app_errors` with uid, username, device name, stack, app version and platform: `app/app_health.ts:111`, `app/app_health.ts:121`, `app/app_health.ts:127`.
- Cancellation surveys store user metadata in Firestore: `app/firebase.ts:144`, `app/firebase.ts:155`.

Purchases and RevenueCat:

- RevenueCat is configured with canonical app user ID when available: `app/revenuecat_init.ts:145`, `app/revenuecat_init.ts:147`.
- The app logs in to RevenueCat and sets a `phraseman_uid` attribute: `app/revenuecat_init.ts:149`, `app/revenuecat_init.ts:151`.
- RevenueCat webhooks process subscription events and Shards purchases: `functions/src/revenuecat_shards.ts:163`, `functions/src/revenuecat_shards.ts:264`.
- Webhook records include product IDs, event IDs, transaction IDs, store/environment, purchase/expiry timestamps: `functions/src/revenuecat_shards.ts:180`, `functions/src/revenuecat_shards.ts:214`, `functions/src/revenuecat_shards.ts:297`.

UGC, community packs and reports:

- Community pack submissions store card text, author stable ID, caller auth UID, moderation status, prior snapshots and admin decisions: `functions/src/community_packs.ts:144`, `functions/src/community_packs.ts:204`, `functions/src/community_packs.ts:210`.
- Purchases store buyer/author stable IDs and buyer display name: `functions/src/community_packs.ts:583`, `functions/src/community_packs.ts:645`, `functions/src/community_packs.ts:651`.
- User and pack reports store reporter/reported IDs and names, reason, platform and app version: `app/user_report.ts:41`, `app/user_report.ts:94`.

League chat:

- League chat stores author IDs/names/avatar/aura, message text, normalized text, moderation categories/reasons, platform/app version: `functions/src/league_chat.ts:227`, `functions/src/league_chat.ts:260`, `functions/src/league_chat.ts:266`.
- Reports store message text, author UID and reporter UID: `functions/src/league_chat.ts:295`, `functions/src/league_chat.ts:337`, `functions/src/league_chat.ts:339`.
- Apple requires UGC/social apps to include filtering, reporting, blocking, and contact info. The code has parts of this, but the Terms do not describe the chat/reporting/moderation model clearly.

Friends, gifts and referrals:

- Friend codes are stored in `friend_code_index`: `functions/src/friend_codes.ts:8`, `functions/src/friend_codes.ts:71`.
- Friend gifts create `friend_gifts_sent`, `friend_gifts_received`, `friend_gift_history`, `my_events` and `shard_log`: `functions/src/friend_gifts.ts:242`, `functions/src/friend_gifts.ts:262`, `functions/src/friend_gifts.ts:302`.
- Referrals store referral codes, owners and attributions with referrer/referee stable IDs: `functions/src/referral.ts:22`, `functions/src/referral.ts:23`, `functions/src/referral.ts:24`, `functions/src/referral.ts:271`.
- Google Play install referrer is used: `app/referral_bootstrap.ts:31`, `app/referral_bootstrap.ts:44`.

Notifications:

- Android permissions include `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED` and `VIBRATE`: `app.json:62`, `app.json:64`.
- Local notification schedules store IDs/settings in `AsyncStorage`: `app/notifications.ts:229`, `app/notifications.ts:265`, `app/notifications.ts:543`.
- Notifications include streak warnings, phrase of the day, weekly/monthly recaps and league overtakes: `app/notifications.ts:301`, `app/notifications.ts:751`, `app/notifications.ts:818`, `app/notifications.ts:874`, `app/notifications.ts:928`.

Website contact:

- Website contact form stores name, email, message, topic, page URL, user-agent and forwarded IP header: `functions/src/website_contact.ts:108`, `functions/src/website_contact.ts:136`, `functions/src/website_contact.ts:144`.
- It can send the message through Resend: `functions/src/website_contact.ts:34`, `functions/src/website_contact.ts:39`.

Device/app platform data:

- Android manifest includes Advertising ID permission: `app.json:65`.
- Expo Updates is enabled: `app.json:15`.
- Apple Sign In and associated domains are enabled: `app.json:72`, `app.json:73`.

## High priority findings

### P0-1. Deletion promise does not match actual deletion

Current text and UI:

- Privacy says cloud data can be deleted by email within 90 days: `legal/privacy_policy_en.json:48`.
- Parent/child section says deletion within 30 days: `legal/privacy_policy_en.json:8`.
- Delete modal tells the user broad data will be permanently deleted: `components/DeleteAccountConfirmModal.tsx:63`, `components/DeleteAccountConfirmModal.tsx:75`.

Actual code:

- `deleteCloudData()` deletes only `users/{canonicalUid}` and maybe an auth UID duplicate: `app/cloud_sync.ts:1223`, `app/cloud_sync.ts:1234`.
- It attempts to delete the Firebase Auth user: `app/cloud_sync.ts:1236`.
- `auth_links/{providerUid}` is explicitly not deleted and becomes orphaned: `app/auth_provider.ts:1231`.
- Firestore document deletion does not delete subcollections automatically, per Firebase docs.

Missing deletion coverage includes at least: `auth_links`, `app_activity`, `app_errors`, `subscription_cancel_surveys`, `community_pack_submissions`, `community_pack_purchases`, `community_pack_reports`, `user_reports`, `league_chat_messages`, `league_chat_reports`, `referral_attributions`, `referral_owners`, `friend_code_index`, `revenuecat_*_events`, `website_contact_inbox`, user subcollections such as `shard_log`, `friends`, `friend_gifts_*`, `friend_gift_history`, `my_events`, `community_seller_inbox`.

Fix:

- Add a trusted Cloud Function for deletion using Admin SDK and recursive deletion across known top-level collections/subcollections.
- Decide what must be retained for fraud, chargebacks, tax/accounting, legal claims and moderation integrity.
- Change the UI and policy to say exactly what is deleted immediately, what is retained, why, and for how long.
- Add/verify a public account deletion web URL for Google Play.

### P0-2. Analytics is not anonymous as currently described

Current Privacy text says analytics is "aggregated, anonymized" and does not personally identify users: `legal/privacy_policy_en.json:31`, `legal/privacy_policy_en.json:32`.

Actual code:

- Firebase Analytics and Crashlytics user IDs are set: `app/firebase.ts:30`, `app/firebase.ts:31`, `app/firebase.ts:32`.
- App activity records include uid and username: `app/app_activity.ts:63`, `app/app_activity.ts:73`.
- Error records include uid, username, stack, device name and version metadata: `app/app_health.ts:111`, `app/app_health.ts:121`, `app/app_health.ts:127`.
- Android requests Advertising ID permission: `app.json:65`.

Fix:

- Replace "anonymized" with an accurate description: product analytics, diagnostics, crash reports and debug/error traces may be linked to a stable app user ID or device/app instance ID.
- State whether Advertising ID is collected/used and by which SDK. If not needed, remove `com.google.android.gms.permission.AD_ID`.
- Add analytics/diagnostics opt-out or consent review if relying on consent in Apple/GDPR contexts.
- Update App Store Privacy Nutrition Labels and Google Data Safety.

### P0-3. "All ages" is not aligned with current social/UGC/commerce behavior

Current text:

- Privacy says Phraseman is available to users of all ages: `legal/privacy_policy_en.json:8`.
- Terms say the app is available to users of all ages: `legal/terms_of_use_en.json:8`.

Actual product:

- Public leaderboard/profile fields.
- League chat with user text.
- Community packs with UGC text, moderation and purchases.
- Friend codes, friend activity and gifts.
- Referrals/install referrer.
- Subscriptions and Shards purchases.
- Analytics/diagnostics and stable IDs.

Risk:

- FTC COPPA applies to services directed to children under 13 that collect personal information, and to general-audience services with actual knowledge of under-13 users.
- Apple Kids/privacy rules are stricter for apps intended for children or collecting/sharing minors' personal information.
- Google Play child/family policies may constrain SDKs and data collection if the target audience includes children.

Fix options:

- Safer path: set a minimum age statement and require parental consent for minors where applicable. Disable chat/UGC/social/referrals/purchases for underage users if age is collected.
- If truly "all ages", add child-specific compliance: age flow, parental consent, child-safe SDK review, UGC restrictions, parent deletion/access path, and age-appropriate store declarations.

### P0-4. Live legal page update pipeline can publish stale terms

Evidence:

- App links open `https://knowlyapps.com/legal/privacy/` and `/terms/`.
- `firebase.json:26` serves `knowly-www`.
- `scripts/sync-legal-html.mjs` writes root `privacy.html` and `terms.html`, not `knowly-www/legal/...`.
- `legal/README.md:16` says hosting targets admin only, which is outdated.

Fix:

- Make canonical JSON generate both root HTML and `knowly-www/legal/privacy/index.html` / `knowly-www/legal/terms/index.html`.
- Update README to reflect actual hosting targets.
- Add a simple CI/check script that fails if canonical JSON and public pages drift.

## Medium priority findings

### P1-1. RevenueCat and Shards are described too narrowly

Current Privacy says RevenueCat verifies subscriptions using an anonymous app user ID and receipt: `legal/privacy_policy_en.json:27`, `legal/privacy_policy_en.json:28`.

Actual code uses a stable canonical ID and sends a custom attribute to RevenueCat: `app/revenuecat_init.ts:145`, `app/revenuecat_init.ts:151`.

RevenueCat webhooks process both subscriptions and non-renewing Shards purchases: `functions/src/revenuecat_shards.ts:251`, `functions/src/revenuecat_shards.ts:264`.

Fix:

- Describe RevenueCat as processing app user ID, store receipts/transaction IDs, product IDs, entitlement status, purchase/expiry times, store/environment and webhook events.
- Add Shards purchase processing to Privacy and Terms, not only Shards spending/earning.
- Terms should clearly distinguish subscriptions, consumable/non-renewing purchases, free/earned Shards, no cash value, no transfer, no withdrawal, fraud reversals and refund effects.

### P1-2. Stable ID persistence and backup behavior are missing

The app uses a long-lived stable ID in SecureStore and an AsyncStorage mirror: `app/stable_id.ts:23`, `app/stable_id.ts:24`, `app/stable_id.ts:96`.

The code comments mention Android Auto Backup and SecureStore behavior: `app/stable_id.ts:8`, `app/stable_id.ts:10`.

Current Privacy only talks about Firebase anonymous ID and local AsyncStorage. It does not explain that a durable app/device identifier may persist through restore/reinstall/backup behavior.

Fix:

- Add a "Stable app identifier" section.
- Explain purpose: account recovery, cloud sync, fraud prevention, purchases, referrals, moderation, support.
- Explain where it is stored and when it is reset.
- Revisit `allowBackup: true` in `app.json:24` if retention after uninstall is not intended.

### P1-3. UGC, chat, moderation and reporting terms are incomplete

Terms mention Community Packs, but not the full social/UGC system:

- League chat, message reports, moderation queues.
- User reports and community pack reports.
- Blocking/abuse flow.
- Visibility and retention of chat/report content.
- License grant for user content.
- Takedown/IP complaint process.

Fix:

- Add a dedicated UGC and social conduct section.
- Add a license from user to Knowly to host, display, moderate, reproduce and distribute user-submitted content inside the app.
- Add no expectation of privacy for public/semi-public chat/leaderboard/catalog content.
- Add report/blocking/moderation/takedown/appeal language.
- Add prohibition on external contact info in chat, harassment, sexual content, hate, threats, spam, impersonation and IP infringement.

### P1-4. Public profile scope is too narrow

Current Privacy lists public nickname, XP, streak, club tier and avatar: `legal/privacy_policy_en.json:16`.

Actual public/social fields also include, depending on feature: arena profile data, profile card theme/motion/focus, frames/aura, weekly points, wins/matches, premium/club markers, friend activity, gift events, community pack author/seller data and buyer display names.

Fix:

- Replace narrow list with a broader "Public and social data" section.
- Mark which fields are public to all app users, visible to league/group members, visible to friends, visible to pack buyers/sellers, or internal moderation only.

### P1-5. Notifications are missing from Privacy

Current Privacy does not explain notification permissions/settings or notification content.

Actual app schedules local reminders, phrase of the day, streak warnings, recaps and league overtakes; settings and scheduled IDs are stored locally: `app/notifications.ts:229`, `app/notifications.ts:301`, `app/notifications.ts:751`, `app/notifications.ts:874`.

Fix:

- Add local notifications section.
- State that notification content may include streak, XP, lesson count, phrase text and league rank context.
- If remote push tokens are ever enabled, add token storage, provider and deletion details.

### P1-6. Referrals and install referrer are missing

Actual app processes referral codes and Play Install Referrer data: `app/referral_bootstrap.ts:31`, `app/referral_bootstrap.ts:44`.

Backend stores referral owners/attributions and stable IDs: `functions/src/referral.ts:22`, `functions/src/referral.ts:271`.

Fix:

- Add a referrals section to Privacy.
- Add referral program rules to Terms: eligibility, abuse/fraud, caps, reward changes, no cash value, reversal on fraud/refunds.

### P1-7. Website contact form and Resend are missing

The current Privacy focuses on the mobile app but public site contact data is collected:

- Email/message/name/topic/page URL: `functions/src/website_contact.ts:108`, `functions/src/website_contact.ts:136`.
- User-agent and forwarded IP header: `functions/src/website_contact.ts:144`.
- Resend email provider: `functions/src/website_contact.ts:34`, `functions/src/website_contact.ts:39`.

Fix:

- Add website/contact support section or create a combined Knowly/Phraseman privacy notice.
- Add Resend or email provider as a processor.
- Add retention period for support/contact messages.

### P1-8. Retention claims are unsupported or inconsistent

Current Privacy:

- Parent/guardian deletion: 30 days: `legal/privacy_policy_en.json:8`.
- General cloud deletion: 90 days: `legal/privacy_policy_en.json:48`.
- Inactivity deletion: after 24 months: `legal/privacy_policy_en.json:16`.

I did not find a matching scheduled cleanup path for "24 months of inactivity" in the inspected code. If it exists outside this repo, document it; otherwise this is an over-promise.

Fix:

- Add a retention table by data category.
- Remove "after 24 months of inactivity" unless implemented with a job and tested.
- Align 30/90-day promises and explain legal/fraud/accounting retention exceptions.

### P1-9. GDPR/UK GDPR transparency is too thin

The Privacy Policy lacks several standard transparency elements expected under GDPR Article 13:

- Controller identity and full contact details.
- EU/UK representative or DPO status if applicable.
- Purposes and lawful bases by processing category.
- Recipients/processors and international transfers/safeguards.
- Retention periods or retention criteria.
- Right to complain to a supervisory authority.
- Whether data is required for contract/app functionality or optional.

Fix:

- Add a structured "What we collect, why, lawful basis, retention" table.
- Add international transfers and processor list.
- Add supervisory authority complaint language.

### P1-10. CCPA/CPRA coverage is incomplete

Current Privacy says California residents may request collection info and opt out of sale, and that data is not sold: `legal/privacy_policy_en.json:44`.

Missing:

- Categories of personal information collected.
- Sources, purposes, recipients/disclosures.
- Retention periods/criteria.
- Whether data is sold or shared for cross-context behavioral advertising.
- Sensitive personal information statement if applicable.
- Notice at collection language at/near collection points.

Fix:

- Add a California section or a US state privacy section.
- Add "we do not sell or share personal information for cross-context behavioral advertising" only if confirmed by SDK behavior and contracts.

### P1-11. EU ODR link is obsolete

Terms still refer EU users to the EU Online Dispute Resolution platform: `legal/terms_of_use_en.json:68`.

The European Commission states the ODR platform was discontinued as of 20 July 2025.

Fix:

- Remove or replace the ODR sentence.
- Point to current consumer redress bodies if counsel wants an EU consumer dispute section.

## Lower priority but important cleanup

### P2-1. Sign-in modal lacks direct legal links

Registration/sign-in prompt reassures users that email is not public and no spam is sent: `components/RegistrationPromptModal.tsx:129`, `components/RegistrationPromptModal.tsx:339`.

It does not link Privacy/Terms at the point of Google/Apple sign-in.

Fix:

- Add Privacy Policy and Terms links to the modal.
- Consider a concise disclosure that sign-in syncs progress and stores provider/account identifiers.

### P2-2. Store disclosure labels need a fresh pass

Likely App Store Privacy categories to review:

- Contact Info: email/name from Google/Apple and support forms.
- User Content: community packs, chat messages, reports, contact/support messages.
- Gameplay Content: progress, XP, leaderboards, arena/matchmaking, achievements.
- Identifiers: stable app user ID, Firebase user ID, RevenueCat user ID, Advertising ID if used.
- Purchases: subscription and Shards purchase history.
- Usage Data: product interaction and learning activity.
- Diagnostics: crashes, performance, app errors.

Likely linked to user: most of the above because the app uses stable/canonical IDs.

Tracking: do not answer until `AD_ID`, Firebase Analytics settings, Google/RevenueCat/Expo contracts and any advertising/retargeting use are confirmed.

Likely Google Data Safety categories:

- Personal info, app activity, app info/performance, device/other IDs, financial/purchase history, messages/user-generated content.
- Shared with service providers: Google/Firebase, RevenueCat, Expo, Resend, Apple/Google stores.
- Deletion: should be marked only after the deletion flow is made complete and a public deletion URL exists.

### P2-3. Third-party processor list is incomplete

Current list: Firebase, RevenueCat, Expo, Apple/Google.

Missing or needs precision:

- Firebase App Check, Crashlytics, Cloud Functions, Firestore, Auth, Analytics.
- RevenueCat webhooks and purchase processing.
- Expo Updates / EAS update infrastructure.
- Resend or other email provider for website contact.
- Google Play Install Referrer / Play Services.
- Apple/Google sign-in and stores.

### P2-4. Terms need clearer purchase/subscription language

Terms cover subscriptions and refunds, but should be reviewed for:

- Products offered: monthly/annual subscriptions, trials, Shards packs, virtual currency, UGC pack purchases.
- Trial eligibility, renewal period, cancellation path, platform billing terms.
- Refund handling and effect on entitlements/Shards.
- No real-money gaming/gambling interpretation for Shards wagers/arena if applicable.
- Consumer withdrawal waiver wording for EU users should be reviewed by counsel; do not rely on a broad sentence unless the purchase flow obtains the required express consent/acknowledgment.

### P2-5. Root generated HTML has encoding issues in titles

`scripts/sync-legal-html.mjs` writes titles containing mojibake (`â€”`) at `scripts/sync-legal-html.mjs:114` and `scripts/sync-legal-html.mjs:120`.

Fix:

- Replace corrupted characters in the generator.
- Add a smoke check for generated HTML title text.

## What is extra or misleading in current text

Remove or rewrite:

- "Aggregated, anonymized usage data" and "does not identify you personally" for analytics.
- "RevenueCat ... using an anonymous app user ID" as a blanket statement.
- "Cloud data is retained ... after 24 months of inactivity" unless implemented.
- "To delete local data: uninstall the App" as a complete local deletion instruction, because stable IDs/backups/keychain behavior are more nuanced.
- "All ages" unless you are prepared to support child privacy compliance across social, UGC, analytics, purchases and SDKs.
- EU ODR platform reference.
- `legal/README.md` statement that Firebase Hosting targets admin only.

Keep, but make more precise:

- No precise geolocation.
- No contacts/photos unless user enters content.
- No payment card details received by Knowly. Add that purchase metadata and receipts/transactions are processed by stores/RevenueCat/Knowly backend.
- Text-to-speech on-device statement, if still true for all TTS/audio features.

## What is missing from Privacy Policy

Add sections for:

- Controller identity, business contact, privacy contact, support contact.
- Data categories by feature.
- Stable app identifier and Firebase anonymous ID.
- Auth linking with Google/Apple.
- Cloud sync/progress and public/social visibility.
- League chat, reports, moderation and blocking.
- Community packs/UGC marketplace.
- Friends, gifts, friend codes, activity feed.
- Referrals, invite codes and Play Install Referrer.
- Subscriptions, Shards purchases and RevenueCat processing.
- Analytics, app activity, Crashlytics and diagnostics.
- Notifications.
- Website contact/support messages and Resend.
- Processors and international transfers.
- Retention/deletion table.
- GDPR/UK GDPR lawful bases and rights.
- CCPA/US state privacy categories and rights.
- Children/minors policy.
- Security measures at a high level.
- How material changes are notified.

## What is missing from Terms of Use

Add sections for:

- Minimum age or parental consent model.
- Public/social features and conduct.
- League chat rules, moderation, reports and blocking.
- UGC license grant and user warranties.
- Community pack takedown/IP complaint process.
- Virtual currency, Shards packs, refunds/reversals, no cashout, no transfer.
- Referrals/invite rewards and abuse controls.
- Friend gifts/activity and social abuse.
- Account deletion, retained records and effect on content/purchases/subscriptions.
- Store-specific purchase terms for Apple and Google.
- Obsolete ODR replacement/removal.

## Suggested implementation sequence

1. Fix deletion architecture first: server-side recursive deletion plus retention exceptions.
2. Fix legal publishing pipeline so canonical JSON updates the live `knowly-www/legal/...` pages.
3. Rewrite Privacy Policy using the new data inventory and remove misleading claims.
4. Rewrite Terms for UGC/chat/social/referrals/Shards/purchases/minors.
5. Add Privacy/Terms links to sign-in prompts and account deletion web page for Google Play.
6. Re-run App Store Privacy and Google Data Safety questionnaires from the new inventory.
7. Ask counsel to review the final text, especially minors, EU/UK GDPR, CCPA/CPRA, paid Shards, subscriptions and governing law.

## Draft policy wording targets

Use this as a drafting checklist, not final legal copy:

- "We collect app/user identifiers, including Firebase anonymous IDs, a Phraseman stable app ID, provider IDs when you sign in with Google or Apple, and RevenueCat app user IDs."
- "Analytics and diagnostics may include app events, screen/feature usage, crash logs, error context, app version, platform, device information, and user/app IDs. These records are used to operate, debug, secure and improve the app."
- "Some profile and activity data is visible to other users, including leaderboard/league/friend/community features."
- "User-submitted content such as chat messages, reports and Community Packs may be stored, reviewed, moderated, published, removed and retained for safety, abuse prevention and legal reasons."
- "Deleting your account deletes or de-identifies most active account data, but some records may be retained for purchase history, fraud prevention, security, legal compliance, dispute handling, moderation integrity or backup limitations."

