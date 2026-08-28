# In-app Support Reports and Reward Bundle Design

Date: 2026-08-28  
Status: approved by owner in the visual brainstorming flow

## Goal

Replace the Settings email support handoff with an in-app problem report flow that lands in the existing admin Reports section, lets an LLM propose—but never send—a reply and severity-based reward bundle, notifies the reporting user through the existing notification bell, and awards pearls, runes, and level spins together exactly once after explicit user acceptance.

## Owner decisions

- Extend the existing `error_reports` and report-reply pipeline. Do not create a second support-ticket system.
- The LLM proposes the reply, severity, and all three reward quantities. An administrator reviews and manually sends the final reply.
- Reward tiers default to:
  - minor: 1 level spin, 300 runes, 1 pearl;
  - serious: 2 level spins, 600 runes, 5 pearls;
  - critical: 3 level spins, 1,000 runes, 10 pearls.
- The administrator may edit values only inside the global bounds: 1–3 spins, 300–1,000 runes, and 1–10 pearls.
- A reward bundle is legal only for a report that is confirmed and fixed. Replies to duplicate, rejected, unconfirmed, or still-in-progress reports carry no reward.
- The user-facing report screen must not enumerate possible reward types or quantities. It only promises a “very pleasant bonus” if the problem is confirmed and fixed.
- The report form must not ask the user for a nickname. Account, app, device, and locale context is captured automatically and silently.
- The home banner says only: `Команда ответила на ваше обращение` in Russian, with equivalent localized copy in every supported app locale.
- Tapping the home banner opens the exact reply directly and permanently hides the banner. Closing the banner with its X hides only the banner; the unread reply remains available in the bell.
- The reply detail must not contain the heading `Вас ждёт приятный бонус`. Its claim CTA is simply `Получить`.
- The celebration heading is `Награда получена`. It must not say that anything is “already on your account”.
- The reward celebration is animated and visually premium, with a reduced-motion alternative.

## Existing system to extend

The repository already has the essential foundations:

- `app/error_report.ts` submits authenticated `error_reports` with stable user, device, app, screen, locale, and progress context.
- `functions/src/client_reports.ts` validates and persists `error_report` documents.
- `admin/v2/legacy.html` is the only live admin surface and already contains the Reports workflow.
- `functions/src/admin_reports_center.ts` lists and exports report documents and supplies LLM instructions.
- `functions/src/report_replies.ts` creates a hidden technical `user_messages` record plus a visible `report_reply` notification and exposes the existing claim callable.
- `components/NotificationCenterButton.tsx` displays the notification bell, report reply detail, and claim action.
- `functions/src/external_economy_events.ts` and the client economy journals provide the immutable external-event model required by the Economy Constitution.

The implementation must extend these contracts rather than creating parallel collections, parallel notification feeds, or direct balance writers.

## User report experience

### Entry point

The Settings row currently labelled “Contact support” remains in the existing “Community and support” group. Its mail icon may change to a report/help icon from the existing Ionicons set. Tapping it opens a dedicated full-screen support-report route instead of a `mailto:` URL or an explanatory email modal.

A full screen is preferred over a small sheet because it provides stable keyboard behavior, room for long multiline input, accessible error placement, and an unambiguous success state.

### Report form

The form contains:

- back navigation;
- title: `Сообщить о проблеме`;
- heading: `Расскажите, что случилось`;
- description: `Здесь можно описать любую проблему, найденную в приложении. Если мы подтвердим и исправим её, вас ждёт очень приятный бонус.`;
- visible label: `Описание проблемы`;
- one multiline input;
- a live character count and inline validation;
- primary CTA: `Отправить обращение`;
- secondary action: `Отмена`.

The placeholder may prompt for what happened, where it happened, and what the user expected. It is not a substitute for the visible label. The UI must not display “account data/version are added automatically” or any equivalent technical explanation.

The report uses the existing localized `error_report` submission path with a stable support origin such as `screen: settings_support`, `category: free_text`, and `dataId: settings_support_request`. The backend-derived stable identity remains authoritative; nickname text from the client is not used to identify the reporter.

### Form states

- Empty: send disabled or validated inline without closing the screen.
- Invalid: the input keeps focus and shows a localized minimum-length error.
- Sending: the send button is disabled and visibly busy; repeated taps cannot submit twice.
- Success: show `Спасибо, мы получили сообщение` and explain only that the team will check it and that the answer will appear in notifications.
- Rate-limited: retain the typed text and show when the user can retry.
- Offline/server error: retain the typed text and offer `Повторить`.
- Back/cancel with unsent text: request confirmation before discarding the draft.

The success state must not display the removed sentence `Повторная отправка не создаст дубль во время обработки.`

## Admin Reports experience

All work remains in `admin/v2/legacy.html`, the only production admin UI.

### Report identification

Reports originating from the Settings support form receive a visible `Из поддержки` label while remaining ordinary `error_reports`. The horizontal report card continues to show existing user, app, device, locale, route, and timestamp context.

### Draft and decision panel

Opening a support report exposes one focused reply panel with:

- full user report text and captured context;
- report status and resolution;
- LLM-proposed localized title and body;
- LLM-proposed severity: minor, serious, or critical;
- three explicit numeric controls for spins, runes, and pearls;
- a user-facing preview of the notification detail and reward celebration;
- a single primary action: `Отправить ответ`;
- a secondary action to regenerate the draft;
- audit and error feedback.

Each field has a visible label, tooltip, loading/disabled/error state, and keyboard focus state. The send button must explain that it creates a user notification and a claimable reward bundle; it does not immediately alter balances. The preview is mandatory because this is a user-visible message with an economic effect.

### LLM instructions

The report export instructions and the admin draft prompt must require the LLM to:

1. assess each `reportId` independently and identify duplicates;
2. distinguish confirmed-and-fixed problems from unconfirmed, duplicate, rejected, and in-progress reports;
3. write a short respectful reply in the user’s language;
4. choose exactly one severity only for a confirmed-and-fixed problem;
5. propose all three reward quantities using the approved tier defaults;
6. emit zero rewards for every other resolution;
7. never send, publish, or award anything automatically;
8. state uncertainties instead of fabricating confirmation.

The backend validates the structured result independently. Prompt text is not a security boundary.

### Manual validation

The administrator may adjust all three quantities, but the server accepts a non-zero bundle only when:

- resolution is `confirmed_fixed`;
- the report document has a server-recognized fixed state;
- spins are an integer from 1 through 3;
- runes are an integer from 300 through 1,000;
- pearls are an integer from 1 through 10;
- all three quantities are positive together.

There is no partial reward bundle. Zero/zero/zero represents no reward; any other combination with a missing currency is invalid.

## Reply delivery and unread behavior

The server sends the reply using the existing dual-document pattern:

- a hidden technical `users/{stableUid}/user_messages/{messageId}` source of truth;
- a visible `users/{stableUid}/notifications/report_reply_{messageId}` notification.

The same transaction writes the report reply metadata, exact reward bundle, notification, report status, helper projection change when applicable, and audit entry. Retry with the same report must not create a second message or second claimable bundle.

### Read semantics

Opening the notification center must no longer mark every visible notification read. A report reply is marked read only when the user opens that exact notification detail, either from the home banner or the notification list.

The bell behavior while unread is:

- visible unread badge;
- short two-sided ring choreography when a new reply first arrives;
- a gentle intermittent reminder while an unread reply remains, never a continuous high-frequency loop;
- no animation when the app is backgrounded or the home tab is inactive;
- a static badge and accent treatment when reduced motion is enabled.

### Home reply banner

For an unread report reply, the home screen shows a compact banner directly below the last-lesson card:

`Команда ответила на ваше обращение`

Behavior:

- tapping the banner opens the reply detail directly, marks that notification read, and permanently dismisses the banner;
- tapping the X dismisses only the banner and does not mark the reply read;
- the banner is account-scoped and persisted so it does not reappear after dismissal;
- the same reply remains accessible from the notification center until the user deletes it;
- multiple unread replies resolve to the newest banner while the bell retains the total unread count.

## Reward claim contract

### Exact reward bundle

The canonical reward is an immutable exact result:

```text
report_reward_bundle {
  messageId
  reportCollection
  reportId
  resolution: confirmed_fixed
  severity: minor | serious | critical
  spins: 1..3
  runes: 300..1000
  pearls: 1..10
}
```

The bundle is an external confirmed event, not an ordinary server-authoritative balance decision. The server verifies only the trusted report-reply record, owner, exact bundle, and idempotency state. It must not write `users/{uid}.shards`, a rune balance snapshot, or a spin balance snapshot.

### Claim sequence

```text
open exact reply
  -> tap “Получить”
  -> disable duplicate taps
  -> obtain/replay the same server claim receipt for messageId
  -> persist one local prepared bundle intent
  -> under the canonical local economy/account lock, commit:
       pearl external-event operation
       rune credit operation
       level-spin credit operation
       bundle receipt and projections
  -> show the one-shot celebration
  -> refresh visible balances
```

The implementation must use one stable claim/event id derived from the report message. Replaying identical bytes succeeds without a second effect. Reusing the id with different bytes fails closed. Account changes during any step abort display and cannot credit the new account.

The client must not show the celebration until the full local bundle commit is durable. If the app closes after the commit but before the animation, startup recovery must preserve all grants and mark the message claimed; replaying the animation is optional, but replaying the economic effect is forbidden.

### Failure behavior

- Network unavailable before receipt: retain the unclaimed CTA and show a retryable error.
- Response lost after server receipt: retry the same `messageId`; the server returns/replays the same receipt.
- Local storage failure before bundle commit: show no celebration and keep a recoverable prepared intent.
- Failure while updating one projection: the canonical bundle coordinator must roll back or recover the entire local commit; a user-visible partial reward is forbidden.
- Duplicate tap: one in-flight request and one final receipt.
- Account switch: discard UI state for the old account and do not apply its receipt to the new account.
- Corrupt or out-of-range bundle: fail closed, preserve the notification, and expose an actionable retry/support error.

## Premium motion design

The celebration is a finite, approximately 1.5-second sequence:

1. backdrop and soft halo fade in;
2. gift mark enters with a restrained spring and one highlight sweep;
3. a bounded set of lightweight particles disperses and disappears;
4. spins, runes, and pearls rise in sequentially;
5. the `Отлично` CTA appears;
6. one success haptic fires after the durable bundle commit.

Only opacity and transforms animate. Layout dimensions are not animated. No emoji are used as icons. Production does not loop the celebration. All animation stops on unmount. Reduced motion replaces the choreography with a short opacity transition and the final static state.

The reply screen contains the three exact amounts and the CTA `Получить`; it does not contain `Вас ждёт приятный бонус`. The celebration title is exactly `Награда получена` and contains no claim that the items are “already on the account”.

## Localization and accessibility

Every new user-facing string is localized for the app’s supported UI locales using the established localization helper. Russian owner-approved copy is the source meaning; translations must preserve the absence of explicit reward promises on the report form.

Required accessibility behavior:

- 44×44 minimum touch targets;
- visible labels for the multiline input and admin numeric fields;
- meaningful accessibility roles and labels for back, close, banner, dismiss, send, retry, claim, and celebration-close controls;
- focus moves to the first invalid field after failed validation;
- screen readers announce sending, success, failure, and the three granted quantities;
- contrast is at least 4.5:1 for normal text;
- bright lime/green CTA surfaces use dark foreground such as `#07110A`;
- reduced-motion settings are respected in the bell, banner, modal, and celebration.

## Data contracts, Rules, and Jarvis

Because the report reply and external economy event schemas change, the same implementation must:

- update Firestore Rules for the exact new/extended server-write-only fields and collections;
- keep client access owner-scoped and prevent clients from forging reward bundles or claimed state;
- update the applicable Jarvis Firestore fetcher if it reads report reply or external economy event fields;
- update `functions/src/jarvis/jarvis_data_contract_guard.test.ts` for every schema field Jarvis depends on;
- update report projections/exports so archived replies expose the bundle without leaking unrelated user fields;
- preserve the single live admin surface contract.

## Test strategy

Implementation follows strict red-green-refactor cycles.

### Client report tests

- Settings support row opens the in-app route and contains no `mailto:` call.
- The form renders the approved copy and contains neither removed technical sentence.
- Empty/short input is rejected without losing text.
- sending disables duplicate taps;
- success, throttle, offline failure, retry, cancel, and unsent-draft confirmation work;
- automatic metadata reaches `error_reports` without requiring nickname input.

### Admin and backend tests

- LLM instruction export contains all three tiers, manual-approval requirement, and no automatic-send instruction.
- Structured drafts validate severity and all three quantities.
- non-fixed resolutions require zero/zero/zero;
- fixed reports accept the bounded bundle and reject partial/out-of-range values;
- two admin sends for one report cannot create two replies;
- the transaction writes message, notification, report metadata, bundle, helper projection, and audit consistently;
- report center projection exposes the safe bundle fields.

### Notification tests

- opening the center does not mark report replies read;
- opening the exact reply does;
- the banner is directly below the last-lesson card;
- banner tap opens the exact reply and dismisses the banner;
- X dismisses the banner without marking the reply read;
- bell badge and motion persist while the exact notification is unread;
- account switch cannot reuse banner/read state;
- reduced motion suppresses repeated movement.

### Economy and claim tests

- exact tier bundles grant pearls, runes, and spins once;
- arbitrary in-range admin edits grant the exact reviewed values;
- retry before response, response loss, duplicate tap, restart, and server already-claimed recovery do not duplicate any currency;
- local failure cannot leave a partial three-currency result;
- operation-id/fingerprint conflict fails closed;
- account switch during claim cannot credit the new account;
- no direct `users/{uid}.shards` writer or standalone debit is introduced;
- Firestore Rules reject client-forged bundle and claim documents;
- Jarvis and Economy Constitution guards remain green.

### UI and motion tests

- every button has a working handler, disabled/loading state, and accessible label;
- modal back, close, retry, claim, and final close transitions are covered;
- animation is finite and uses only transform/opacity for moving elements;
- low-motion mode renders the final information without losing content;
- device checks cover compact and large phone heights and large system fonts;
- admin checks cover 375, 768, 1024, and 1440 widths, keyboard navigation, focus rings, loading, empty, error, and preview states.

## Acceptance criteria

The feature is complete only when:

1. Settings support no longer opens email and never asks for a nickname.
2. A user can submit a free-text problem without losing the draft on recoverable failure.
3. The report appears in the existing Reports section with full existing context and a support-origin label.
4. The LLM proposes but cannot send a reply or award; the administrator manually reviews and sends.
5. Only confirmed-and-fixed reports may carry one bounded three-currency bundle.
6. The home banner and bell both open the same exact reply, with owner-approved copy and dismissal behavior.
7. A report reply remains unread until that exact reply is opened.
8. `Получить` grants all three reviewed quantities exactly once and never shows partial success.
9. The premium celebration is finite, accessible, reduced-motion-aware, and titled `Награда получена`.
10. All focused client, backend, Rules, economy, Jarvis, admin, notification, and interaction tests pass with fresh evidence.
