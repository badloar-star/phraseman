# Phraseman Legal / Privacy / Terms / App Audit

Date: 2026-06-19  
Scope: `privacy.html`, `terms.html`, in-app legal JSON, app config, analytics, AI Cloud Functions, subscriptions, UGC/social, support, notifications, store-label risks.  
Note: this is a product/legal engineering audit, not legal advice. A lawyer should approve final Terms, arbitration, DMCA, GDPR/CCPA wording, and store submissions.

## Executive Risk Summary

### Blocker
1. **AI/OpenAI is active in the app but missing from Privacy Policy and Terms third-party/provider disclosures.**
   - Evidence:
     - `functions/src/premium_dialog.ts` sends user text, recent chat history, CEFR, scenario/mode, and companion memory/weak words to OpenAI.
     - `functions/src/explain_phrase.ts` sends phrases and meanings to OpenAI for explanations and AI judging.
     - `functions/src/mistake_explain.ts` sends user answer, target answer, phrase meaning, lesson/phrase context to OpenAI.
     - `functions/src/weekly_review.ts` and `functions/src/stats_insights.ts` send learning analytics briefings to OpenAI.
   - Current legal gap:
     - `privacy.html` provider list does not name OpenAI or generative AI processors.
     - `terms.html` mentions educational explanations may be wrong, but does not clearly disclose AI-generated content, AI limitations, no sensitive-data input, or AI provider processing.
   - Required action:
     - Add a standalone Privacy section: “AI features and OpenAI processing”.
     - Add OpenAI to third-party providers.
     - Add Terms section: AI output may be inaccurate, not human/professional advice, do not submit sensitive personal data, user input/output may be processed/stored for service, safety, quota, billing, abuse prevention, and support.
     - Add in-app disclosure on AI entry points before first AI use.

2. **Store privacy labels/Data Safety likely incomplete if submitted without AI, PostHog, Telegram, speech, and server-push details.**
   - Apple requires disclosure of data collected by the app and third-party partners.
   - Google Play requires accurate Data Safety disclosures and prominent disclosure/consent for unexpected personal/sensitive data collection.
   - Required action:
     - Update App Store Privacy Nutrition Label and Google Play Data Safety from the actual inventory below.

3. **Telegram processing is active but not disclosed as a provider.**
   - Evidence:
     - `functions/src/admin_alerts.ts` sends user reports, content reports, cancel-survey alerts, and critical errors to Telegram Bot API.
     - `functions/src/telegram_premium_bot.ts` handles Telegram Stars premium orders and stores Telegram user/payment identifiers.
     - `functions/src/telegram_support.ts` forwards support messages to bot admins.
   - Current legal gap:
     - Privacy/Terms list Firebase, RevenueCat, Expo, Resend, app stores, but not Telegram.
   - Required action:
     - Add Telegram Bot API / Telegram payments / Telegram support as processors where relevant.
     - Disclose that reports/support/order metadata may be sent to admin Telegram chats.

## High Priority Findings

### AI / FTC / “AI-washing”

Current app reality:
- AI dialogue: user messages, last 8 history turns, mode/scenario, CEFR, profile/memory, weak words.
- AI companion: weak words are taken from learner mistake/trainer history.
- AI phrase explanation: phrase text and meaning, cached by phrase hash.
- AI mistake explanation: user answer and correct answer.
- AI weekly review/stats insights: computed mistake categories, phrases, XP, streaks, minutes, percentiles, weak areas.
- Billing/quota logs: Firestore collections such as `premium_dialog_billing`, `mistake_explain_billing`, `weekly_review_billing`, `stats_insights_billing`.

Missing / must add:
- “We use AI” disclosure in Privacy and Terms.
- “AI provider: OpenAI” in provider list.
- Exact data types sent to AI.
- Retention/billing/quota/safety logs.
- No sensitive-data instruction.
- Accuracy disclaimer and learning-outcome disclaimer.
- Human/non-human disclosure for companion/chatbot.
- Safety/minors language for AI companion: not emotional support, not crisis support, not for children without supervision.
- Marketing substantiation register: every “AI improves X”, “personalized”, “detects weak spots”, “precise”, “accurate” claim must be supported by evidence or softened.

Why it matters:
- FTC has been actively enforcing against deceptive AI claims and AI schemes.
- FTC has also launched AI chatbot companion inquiry focused on safety, minors, disclosures, monetization, and data sharing.

### PostHog / Firebase / Analytics Consent

Current app reality:
- `app/posthog_client.ts` enables PostHog when `EXPO_PUBLIC_POSTHOG_KEY` is set, default host `https://eu.i.posthog.com`.
- `app/analytics.ts` sends product events to Firebase Analytics and PostHog.
- `app/firebase.ts` sets Firebase Analytics and Crashlytics user ID.
- Events include paywall, AI dialog, subscription/cancellation survey, onboarding goals/levels/minutes, notification interactions, winback, revenue activity.

Current legal gap:
- Privacy mentions Firebase Analytics/Crashlytics, but does not name PostHog in provider list.
- Consent/opt-out story is unclear for EU/UK if analytics is non-essential and linked to stable ID.

Required action:
- Add PostHog as provider and disclose event types, user IDs, and EU host if used.
- Add analytics opt-out or consent gate where required.
- Ensure Apple/Google labels include product interaction, analytics, diagnostics, identifiers, purchase events, and potentially user content/survey content.

### Voice / Speech / Microphone

Current app reality:
- `app.config.js` includes `expo-speech-recognition` plugin and microphone/speech recognition permission text.
- `app/spike_voice.tsx` prototype records/transcribes speech on-device, sends transcript to `premiumDialogSend`, and on iOS sets `recordingOptions: { persist: true }`.

Current legal gap:
- Privacy only covers text-to-speech, not speech recognition/microphone/transcripts.

Required action:
- Add a “Speech recognition / microphone / pronunciation” section:
  - when microphone is requested;
  - whether audio stays on device or may be temporarily processed by OS/speech module;
  - whether transcript is sent to OpenAI for AI voice dialogue;
  - whether recordings persist locally in prototype/production.
- If voice route is dev-only, ensure it cannot ship publicly or update policy before release.

### UGC / Copyright / DMCA

Current app reality:
- User content includes community packs, flashcards, translations, chat messages, reports, nicknames, surveys, poll votes, reactions.
- Terms include user content warranties, license, and moderation rights.

Gaps:
- No DMCA/takedown procedure.
- No designated DMCA agent language/page.
- No repeat-infringer policy.
- No counter-notice process.

Required action:
- Add `DMCA Copyright Policy` page.
- If seeking U.S. DMCA safe harbor, register a DMCA designated agent with the U.S. Copyright Office and publish the same contact info publicly.
- Add repeat-infringer policy in Terms.
- Add in-app/web copyright report channel.

### Arbitration / Class Action

Current Terms:
- Governing law: Ukraine.
- 30-day informal resolution.
- Individual-claims/class waiver.
- Courts of Ukraine unless mandatory consumer law allows elsewhere.
- No arbitration clause.

Recommendation:
- Do **not** blindly paste an ICC arbitration clause from screenshots.
- If the app targets U.S. consumers and class-action risk is a priority, use lawyer-drafted U.S.-specific arbitration with:
  - opt-out window,
  - small-claims carveout,
  - mass-arbitration procedure,
  - consumer-rights carveouts,
  - public injunctive relief carveout where required,
  - app-store/consumer-law compatibility.
- For EU/UK/Ukraine users, mandatory consumer courts/rights may override parts of arbitration/class waivers.

## Medium Priority Findings

### Purchases / RevenueCat / Paywall Claims

Current app reality:
- RevenueCat receives canonical stable app user ID and `phraseman_uid`.
- Purchase/trial/paywall events are logged.
- Some paywall/urgency UI references future pricing/urgency.

Actions:
- Keep every “discount”, “old price”, “price doubles”, “trial”, “cancel anytime”, “free” claim truthful and store-backed.
- Avoid fake urgency. If “price doubles” is not a real scheduled price change for that user/offer, soften or remove.
- Add an internal screenshot archive of every paywall variant with offer ID, price source, and claim basis.

### Cancellation Surveys / Admin Alerts

Current app reality:
- Cancellation survey may store reason text, userName, language, premium plan, platform, OS, app version.
- Telegram admin alert can forward cancel-survey/report data.

Actions:
- Disclose free-text survey data may be reviewed by admins/support and sent through Telegram if alerts are enabled.
- Warn users not to include sensitive personal data in free-text fields.

### Push Notifications / Re-engagement

Current app reality:
- Expo push token is stored with platform, language, timezone.
- Server-side re-engagement pushes use inactivity, streak, last active, quiet hours, token, language, username.

Privacy mostly covers push tokens, but add:
- re-engagement/winback/streak-risk messages;
- timezone/local quiet-hours use;
- opt-out path and token deletion behavior.

### Android Advertising ID

Current app reality:
- `app.json` declares `com.google.android.gms.permission.AD_ID`.
- Privacy mentions Android Advertising ID.

Actions:
- If not using ads/attribution, consider disabling/removing Advertising ID collection to reduce disclosure burden.
- If kept, Google Play Data Safety must disclose device/other IDs and purposes.

### Photo Library Permission

Current app reality:
- iOS `NSPhotoLibraryUsageDescription` exists.
- No confirmed active image picker in this audit.

Action:
- If the permission is unused, remove it before release.
- If used for avatars/community content, disclose photo/image selection and storage/sharing.

## Store Disclosure Inventory

### Apple App Privacy Label likely needs

Data Linked to User:
- User ID / stable app ID / Firebase Auth UID.
- Email/name if sign-in/support/contact.
- Purchase history / subscription status / entitlements.
- User content: chat, community packs, reports, survey responses, AI prompts/transcripts where stored or processed.
- Product interaction: screens/features/events/paywall/referrals/notifications.
- Diagnostics: crashes, logs, device/app metadata.
- Identifiers: app instance ID, stable ID, push token, possibly Advertising ID on Android equivalent not relevant to iOS.
- Learning data/inferences: progress, XP, streaks, weak words, mistake categories, AI personalization.

Data Used to Track:
- Likely “No” **only if** Firebase/PostHog/RevenueCat data is not linked with third-party data across other companies’ apps/sites for ads/measurement and no IDFA/ATT tracking is used.
- If any cross-app/site ad measurement, retargeting, broker sharing, Meta Pixel, or IDFA is introduced, ATT and tracking label must be updated.

### Google Play Data Safety likely needs

Disclose categories:
- Personal info: email/name if sign-in/support.
- Financial info / purchase history: subscriptions, entitlements, transaction/receipt metadata.
- App activity: screens, events, lesson progress, interactions, searches if any.
- App info and performance: crashes, diagnostics, logs.
- Device or other IDs: stable ID, app instance ID, Advertising ID, push token.
- User-generated content: community packs, chat, reports, surveys, AI messages.
- Audio: only if audio is collected/transmitted; if only local speech recognition and no audio leaves device, disclose carefully as local/on-device. If transcript goes to AI, disclose transcript as user content.
- Photos/images: only if user-selected images are collected/uploaded.

## Screenshot Checklist Mapping

1. **FTC AI Disclosure** — must add AI/OpenAI Privacy + Terms sections and in-app AI disclosure.
2. **Arbitration Clause** — current Terms have class waiver, not arbitration. Add only with lawyer-drafted regional clause; do not paste generic ICC.
3. **Privacy Nutrition Label** — update Apple/Google labels from actual SDK/provider inventory.
4. **UGC Liability** — add DMCA policy, repeat-infringer policy, takedown/counter-notice process.
5. **Copyright damages** — reduce risk by DMCA agent, moderation, user warranties, prompt takedown, no copyrighted pack scraping.
6. **Meta Pixel / GA4** — no active Meta Pixel/GA4 found in app scan, but Firebase Analytics and PostHog exist. If website/admin uses GA4/Pixel later, update privacy, cookie/consent, and store labels.

## Concrete Text To Add

### Privacy Policy: AI section

Add after analytics or before text-to-speech:

> AI features. Some Phraseman features use generative AI providers such as OpenAI to generate dialogue replies, phrase explanations, mistake explanations, weekly reviews, stats insights, and similar learning feedback. When you use these features, we may send the AI provider the text you enter, recent conversation history, selected scenario or mode, language level, learning target, phrase text, phrase meaning, your answer and target answer, computed learning analytics such as weak categories, weak words/phrases, streaks, XP, minutes, and related context needed to generate the requested response. We also keep limited logs for quotas, billing, abuse prevention, debugging, safety, and service reliability, such as user IDs, model name, token counts, timestamps, feature type, and status. Do not submit sensitive personal data, confidential information, payment details, medical, legal, financial, or emergency information to AI features. AI output may be inaccurate or incomplete.

### Privacy Policy: provider list

Add:
- OpenAI / AI model providers for generative AI features.
- PostHog for product analytics if enabled.
- Telegram Bot API / Telegram payments / Telegram support where Telegram bot, admin alerts, or Telegram Stars premium activation are used.

### Terms: AI section

Add:

> AI-generated features. The App may include AI-generated dialogue, explanations, mistake feedback, summaries, recommendations, and other learning content. AI output is generated automatically, may be inaccurate, incomplete, offensive, unsafe, or unsuitable for your context, and is not professional, legal, medical, financial, immigration, employment, or emergency advice. AI characters or companions are not humans and are not a substitute for teachers, therapists, emergency services, or professional advice. You must not submit sensitive, confidential, unlawful, infringing, or personal data that you do not have the right to provide. We may limit, log, cache, moderate, reject, or disable AI features for safety, abuse prevention, cost control, legal compliance, or service reliability.

### Terms: DMCA / repeat infringer

Add:
- copyright complaint address/page;
- repeat-infringer termination policy;
- counter-notice procedure;
- user obligation not to upload infringing packs/text/audio/images.

## External Sources Checked

- FTC AI enforcement: https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes
- FTC AI chatbot companion inquiry: https://www.ftc.gov/news-events/news/press-releases/2025/09/ftc-launches-inquiry-ai-chatbots-acting-companions
- FTC 2025 civil penalty max: https://www.ftc.gov/news-events/news/press-releases/2025/02/ftc-publishes-inflation-adjusted-civil-penalty-amounts-2025
- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple ATT / tracking: https://developer.apple.com/app-store/user-privacy-and-data-use/
- Google Play Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play User Data Policy: https://support.google.com/googleplay/android-developer/answer/10144311
- OpenAI API data controls: https://developers.openai.com/api/docs/guides/your-data
- OpenAI business privacy: https://openai.com/enterprise-privacy/
- U.S. Copyright Office DMCA directory: https://www.copyright.gov/dmca-directory/
- U.S. Copyright statutory damages: https://www.copyright.gov/title17/92chap5.html

