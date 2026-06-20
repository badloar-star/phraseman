# Phraseman Post-Fix Legal / Privacy / Terms Audit

Date: 2026-06-19  
Status: after adding AI/OpenAI, PostHog, voice/speech, copyright/repeat-infringer, and third-party disclosures.  
Scope: web legal pages, in-app legal JSON, app config, major SDKs, AI functions, analytics, purchases, UGC, notifications, account deletion.

This is a product/legal engineering audit, not legal advice. Final Terms, Privacy Policy, App Store / Google Play disclosures, DMCA strategy, and arbitration strategy should be approved by qualified counsel.

## Executive Summary

### Big Improvement Completed

The largest legal mismatch is now fixed:

- Privacy Policy now clearly discloses AI/OpenAI processing.
- Terms now clearly disclose AI-generated content risks.
- PostHog is now disclosed where enabled.
- Voice/speech recognition/transcript risk is now disclosed.
- Copyright/rights complaint and repeat-infringer language is now present.
- In-app legal JSON now matches web legal pages.
- Telegram was intentionally not added to app legal docs because product owner confirmed mobile app data does not flow to Telegram.

### Remaining “Do Not Ship Blindly” Items

1. **Store labels must still be updated manually** in App Store Connect and Google Play Console.
2. **AI just-in-time disclosure should be added in UI** before first AI use.
3. **Analytics consent/opt-out should be decided** for EU/UK and any jurisdiction requiring consent.
4. **Formal DMCA safe-harbor setup is not complete** with just Terms text.
5. **Paywall and AI marketing claims need evidence** or softer wording.
6. **Android Advertising ID should be removed if not truly needed.**
7. **Telegram backend code still exists**; if it ever receives app user reports/support/payment data, app legal docs must be updated or that integration must remain strictly separate.

## What Was Fixed

### Privacy Policy

Files:
- `privacy.html`
- `app/legal/privacy_policy_en.json`
- `app/legal/privacy_policy_en_ios.json`

New coverage:
- AI features and OpenAI processing.
- Text sent to AI.
- Recent conversation history.
- Scenario/mode/language level/learning target.
- Phrase text and phrase meaning.
- Exercise answers and target answers.
- Weak words/phrases and mistake categories.
- Progress, XP, streaks, study minutes.
- AI quota/billing/safety logs.
- Sensitive-data warning.
- OpenAI in third-party providers.
- PostHog in analytics and third-party providers.
- Speech recognition / microphone / transcripts.
- Re-engagement/winback notifications.
- Copyright and rights complaints.

### Terms of Use

Files:
- `terms.html`
- `app/legal/terms_of_use_en.json`
- `app/legal/terms_of_use_en_ios.json`

New coverage:
- AI features are automated.
- AI is not human.
- AI is not a teacher/therapist/emergency/professional substitute.
- AI output may be inaccurate, incomplete, offensive, unsafe, or unsuitable.
- No guaranteed learning improvement.
- No guarantee AI catches every mistake.
- Do not submit sensitive/confidential/payment/medical/legal/financial/emergency data.
- Knowly can limit/log/cache/moderate/reject/disable AI features.
- Copyright/rights complaint contact.
- Repeat-infringer suspension/termination language.
- OpenAI and PostHog in third-party services.

## Evidence From Current Code

### AI / OpenAI

AI is real and active in server functions:
- `functions/src/premium_dialog.ts` — sends user text, recent history, scenario/mode, CEFR, and companion memory to OpenAI.
- `app/ai_companion_memory.ts` — companion memory may include weak words from learner history.
- `functions/src/explain_phrase.ts` — sends phrase and meaning to OpenAI.
- `functions/src/mistake_explain.ts` — sends user answer, target answer, phrase meaning, lesson/phrase metadata to OpenAI.
- `functions/src/weekly_review.ts` — sends computed mistake/progress briefing to OpenAI.
- `functions/src/stats_insights.ts` — sends stats briefing to OpenAI.

Current legal status: **covered after fix**.

Remaining action:
- Add an in-app notice before first AI use:
  - “This feature uses AI. Your text and learning context may be sent to an AI provider. Do not enter sensitive personal data. AI can be wrong.”

### PostHog

PostHog exists:
- `package.json` includes `posthog-react-native`.
- `app/posthog_client.ts` enables PostHog when `EXPO_PUBLIC_POSTHOG_KEY` exists.
- `app/analytics.ts` sends events to PostHog where enabled.

Current legal status: **covered after fix**.

Remaining action:
- Decide whether EU/UK users need opt-in before PostHog/Firebase non-essential analytics.
- Add analytics opt-out if you want stronger protection.

### Firebase / Crashlytics / Analytics

Current coverage:
- Firebase Auth, Firestore, Functions, Analytics, Crashlytics, App Check are listed.
- Stable app ID and linked analytics are disclosed.
- Android Advertising ID is disclosed.

Residual risk:
- If you do not actually need Android Advertising ID, remove it. It creates disclosure and Google Play Data Safety burden.

### RevenueCat / Purchases / Shards

Current coverage:
- RevenueCat subscription, purchase, entitlement, receipt, cancellation/refund/chargeback metadata disclosed.
- `phraseman_uid` / stable ID use disclosed.
- Shards virtual currency terms are strong.

Residual risk:
- Paywall claims must be truthful:
  - “free trial” only if store package really has trial;
  - “cancel anytime” must match store reality;
  - “price doubles” or urgency must be real, time-bounded, and documented;
  - “exactly what to improve” / “precise” should be softened unless tested.

### Voice / Speech Recognition

Current app config includes:
- `expo-speech-recognition`
- Android `RECORD_AUDIO`
- iOS microphone/speech recognition permission injection via config plugin.

Current legal status: **covered after fix**.

Residual risk:
- If voice route is experimental/dev-only, make sure it cannot accidentally ship publicly.
- If any audio, not just transcript, is uploaded later, update Privacy Policy and store labels again.

### UGC / Community / Chat / Reports

Current coverage:
- User content and moderation are covered.
- Copyright/rights complaint language added.
- Repeat-infringer language added.

Residual risk:
- For full U.S. DMCA safe-harbor posture, Terms text is not enough:
  - create a public copyright/DMCA page;
  - publish takedown/counter-notice requirements;
  - register a DMCA designated agent with the U.S. Copyright Office if you want DMCA safe harbor;
  - keep repeat-infringer enforcement records.

### Telegram

Important nuance:
- Mobile app legal docs now do **not** mention Telegram because product owner stated the app does not send data to Telegram and Telegram is only website/bot related.
- Codebase still contains Telegram-related backend files such as admin alerts, premium bot, and support bot.

Residual risk:
- If those backend functions are deployed in the same project and receive app-originated reports, support messages, cancellation surveys, critical errors, or payment/order data, then Telegram becomes a processor for app data and must be disclosed.
- If Telegram is truly separate from the app, keep it separated and document that internally.

## Store Disclosure Checklist

### Apple App Store Privacy Label

Update labels to reflect:
- Contact info: email/name if sign-in/support/contact.
- User ID: stable ID, Firebase/Auth UID, RevenueCat app user ID.
- Purchases: subscription/purchase/entitlement history.
- User content: community packs, chat, reports, surveys, AI prompts/messages if stored or processed.
- Product interaction: app events, screens, paywall events, AI events, onboarding choices.
- Diagnostics: crashes, logs, device/app metadata.
- Identifiers: app instance ID, stable app ID, push token.
- Other data / inferences: learning progress, weak words, mistake categories, AI personalization signals.
- Audio: only if audio leaves device. If only transcript/recognized text is used, label as user content/other data as applicable.

Tracking:
- Likely “No tracking” only if data is not used across other companies’ apps/websites for advertising or data brokerage.
- If IDFA, Meta Pixel, cross-app retargeting, or third-party ad measurement appears later, ATT and labels must change.

### Google Play Data Safety

Likely categories:
- Personal info: email/name if sign-in/support.
- Financial info / purchase history: subscriptions, receipts, entitlements.
- App activity: screens, lessons, progress, events, AI interactions.
- App info and performance: crashes, diagnostics.
- Device or other IDs: stable ID, app instance ID, Advertising ID, push token.
- User-generated content: community packs, chats, reports, surveys, AI messages.
- Audio: only if collected/uploaded.
- Photos/images: only if image selection/upload is active.

Also verify:
- Data deletion URL is live and accessible from web.
- In-app account deletion still works.
- Data Safety says what is retained after deletion.

## High-Risk Areas Still Needing Operational Controls

### 1. AI UI Notice

Legal text is fixed, but best practice is user-facing disclosure at the point of use.

Recommended UI copy:

> This feature uses AI. Your message and learning context may be sent to an AI provider. Do not enter sensitive personal data. AI can make mistakes.

Add to:
- AI dialog entry.
- AI companion.
- Explain button/sheet if AI-generated.
- Mistake explanation.
- Weekly review/stats insights if AI-generated.
- Voice dialogue prototype if enabled.

### 2. AI Claims Register

Create a simple internal table:
- Claim text.
- Screen / paywall / store listing location.
- Evidence.
- Owner.
- Last reviewed date.

Examples to review:
- “precise”
- “exact”
- “personalized”
- “AI finds your weak spots”
- “improves speaking”
- “learn faster”
- “knows what to improve”

If no evidence: soften.

### 3. Analytics Consent / Opt-Out

Current policy says consent-based analytics where required, but app code appears to send Firebase/PostHog events without a visible consent gate in the audited files.

Options:
- Minimal: keep analytics as legitimate interest where allowed, but add opt-out in settings.
- Stronger: EU/UK analytics opt-in before PostHog/Firebase non-essential analytics.
- Strictest: default analytics off until consent in regulated regions.

### 4. Android Advertising ID

If not needed, remove:
- `com.google.android.gms.permission.AD_ID`

Why:
- Less Data Safety burden.
- Lower “tracking/advertising identifier” anxiety.
- Cleaner privacy posture.

### 5. DMCA / Copyright

Terms now have basic protection, but “5000% protection” means:
- public copyright policy page;
- dedicated copyright complaint email/form;
- repeat infringer policy;
- takedown logs;
- counter-notice workflow;
- DMCA agent if targeting U.S. safe harbor.

### 6. Telegram Separation

Because backend code contains Telegram:
- create an internal note: “Telegram bot is website/bot-only and does not receive app data.”
- if false at any point, update Privacy/Terms before enabling the flow.

## Risk Matrix

| Area | Current Risk | After Fix | Remaining Action |
|---|---:|---:|---|
| AI/OpenAI missing from Privacy | Critical | Low/Medium | Add in-app AI notices |
| AI output liability | High | Medium | Soften claims, add UI warning |
| PostHog undisclosed | High | Low/Medium | Consent/opt-out decision |
| Store labels mismatch | High | High until manually updated | Update App Store/Google Play |
| Telegram app disclosure | Conditional High | Low if truly separate | Keep separation documented |
| UGC copyright | High | Medium | DMCA process/agent/page |
| Paywall urgency claims | Medium/High | Medium | Evidence and screenshot archive |
| Android AD_ID | Medium | Medium | Remove if unnecessary |
| Voice/speech disclosure | Medium | Low/Medium | Ensure no audio upload or update |
| Account deletion | Medium | Low/Medium | Test web + in-app deletion flow |

## Release Gate Checklist

Before next app release:

- [ ] App Store Privacy Label updated.
- [ ] Google Play Data Safety updated.
- [ ] AI UI disclosure shown before first AI use.
- [ ] Analytics opt-out/consent decision documented.
- [ ] Paywall claims reviewed and evidence archived.
- [ ] Android AD_ID kept only if necessary.
- [ ] Voice routes reviewed so prototypes do not ship accidentally.
- [ ] DMCA/copyright page created if UGC/community packs remain public.
- [ ] Data deletion URL tested from web.
- [ ] In-app account deletion tested.
- [ ] Telegram separation documented or Telegram disclosed if app data flows there.

## Official Sources Checked

- Apple App Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Apple User Privacy and Data Use / ATT: https://developer.apple.com/app-store/user-privacy-and-data-use/
- Google Play Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play User Data Policy: https://support.google.com/googleplay/android-developer/answer/10144311
- Google Play account deletion policy guidance: https://android-developers.googleblog.com/2024/03/designing-your-account-deletion-experience-google-play.html
- FTC AI enforcement / deceptive AI claims: https://www.ftc.gov/news-events/news/press-releases/2024/09/ftc-announces-crackdown-deceptive-ai-claims-schemes
- OpenAI API/business data use: https://help.openai.com/en/articles/5722486-how-your-data-is-used-to-improve-model-performance
- U.S. Copyright Office DMCA designated agent directory: https://www.copyright.gov/dmca-directory/

