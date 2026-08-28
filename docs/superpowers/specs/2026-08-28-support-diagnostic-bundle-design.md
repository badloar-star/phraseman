# Phraseman Support Diagnostic Bundle — Design

Date: 2026-08-28
Status: owner approved the design and authorized implementation on 2026-08-28
Scope: React Native client, `submitClientReport`, `error_reports`, live admin surface

## 1. Goal

When a user deliberately sends an error report, attach a small, privacy-safe
timeline of the events that immediately preceded the problem. The administrator
must be able to understand the sequence without asking the user to reproduce it
again or uploading continuous logs from every installation.

The system must remain cheap: no daily per-user uploads, no background log
streaming, and no new Firestore write for each action. Ordinary sessions keep
their diagnostic history only on the device. One diagnostic bundle is added to
the existing `error_reports` write only when the user submits a report.

## 2. Non-goals

- Recording every tap, keystroke, network body, console line, or application
  state value.
- Remote live access to a user's device or account.
- Session replay, screenshots, screen recording, microphone recording, or
  arbitrary file collection.
- Uploading a daily archive for every user.
- Replacing Crashlytics, product analytics, `app_errors`, or Jarvis aggregates.
- Attaching diagnostics to moderation reports about other people.

## 3. Existing foundations

Phraseman already has:

- `app/debug-logger.ts`: an on-device ring of up to 160 error entries with a
  seven-day TTL and duplicate compaction;
- `app/app_health.ts`: throttled Crashlytics warning/critical reporting and
  critical `app_errors` writes;
- `app/error_report.ts`: explicit user error reports with device and account
  metadata;
- `app/client_reports.ts` and `functions/src/client_reports.ts`: authenticated,
  rate-limited report submission with server-side field normalization;
- `error_reports` deletion by stable UID during account deletion;
- the Jarvis Quality department, which reads aggregates from `error_reports`,
  `user_reports`, and `app_errors`;
- the only live admin surface at `admin/v2/legacy.html`.

The new feature extends these paths instead of introducing a parallel reporting
system.

## 4. Chosen architecture

### 4.1 Local breadcrumb ring

Add a dedicated diagnostic breadcrumb module. It keeps a small in-memory ring
and periodically persists a compact copy to AsyncStorage.

Recommended bounds:

- maximum 200 events;
- maximum age 24 hours;
- maximum local serialized size 64 KiB;
- maximum report attachment size 32 KiB;
- duplicate adjacent events compacted with a `count` field;
- persistence batched, not one AsyncStorage write per event;
- flush on app background, a recorded error, and report submission.

The dedicated ring is separate from `debug_logs_v1`: the current debug log is
error-oriented and may contain raw exception messages/stacks, while the support
timeline must accept only an explicit safe schema.

### 4.2 Explicit event schema

Every breadcrumb follows a versioned allowlist:

```ts
type DiagnosticBreadcrumbV1 = {
  atMs: number;
  event: DiagnosticEventName;
  screen?: DiagnosticScreenName;
  result?: 'start' | 'success' | 'blocked' | 'error' | 'info';
  reasonCode?: DiagnosticReasonCode;
  durationBucket?: '<100ms' | '100-500ms' | '500ms-2s' | '2-10s' | '>10s';
  appState?: 'active' | 'background' | 'inactive';
  network?: 'online' | 'offline' | 'unknown';
  operationRef?: string;
  count?: number;
};
```

`event`, `screen`, and `reasonCode` are closed enums. Call sites cannot attach an
arbitrary properties object. `operationRef` is a short random or hashed
correlation reference scoped to one operation/session; it is never an email,
Firebase UID, stable UID, product receipt, or provider token.

Initial high-signal surfaces:

- navigation between major screens;
- onboarding step transitions;
- Google/Apple/anonymous authentication stages;
- account switch and account deletion stages;
- avatar/aura editor open, purchase start/result, entitlement grant, selection
  and application result;
- Shards/economy composite operation start/result without balances or raw IDs;
- subscription purchase/restore stages without receipts;
- cloud-sync start/result and account-generation conflicts;
- lesson open/complete/error without lesson answer text;
- explicit report form open/submit/result.

The first release should contain roughly 20–30 event names, not an attempt to
instrument the whole codebase.

### 4.3 Privacy boundary

The collector is allowlist-only. It must never accept or serialize:

- email, name, nickname, phone number, address, IP address;
- Firebase UID, stable UID, Apple/Google subject, RevenueCat ID;
- auth tokens, App Check tokens, refresh tokens, purchase receipts;
- user-entered text, lesson answers, report comment, clipboard content;
- raw request/response bodies, Firestore document contents, URLs with query
  parameters;
- arbitrary exception messages or full stack traces;
- microphone, audio, image, screenshot, or screen contents;
- exact currency balances or another person's identifiers.

The report document already has an authenticated server-resolved stable UID, so
duplicating identity inside the bundle is unnecessary. The report's normal
comment and exercise context remain governed by the existing report form.

Before upload, the client runs a second sanitizer and size limiter. The callable
runs an independent server sanitizer, validates every enum, limits string/event
counts, and rejects or drops unknown fields. Client sanitation is convenience;
server sanitation is authoritative.

### 4.4 Report submission

When `submitErrorReport` is called:

1. Freeze a snapshot of the last 24 hours from the local ring.
2. Remove expired or malformed entries.
3. Normalize timestamps to relative offsets from `capturedAtMs` for compactness.
4. Apply allowlist sanitation and the 32 KiB cap, dropping oldest entries first.
5. Add a final `report_submit_started` breadcrumb to the snapshot.
6. Submit the existing `error_report` callable once with an optional
   `diagnostics` object.
7. Preserve the local ring regardless of success so a network retry can still
   include context. Existing report throttling remains authoritative after a
   successful callable response.

No independent diagnostics upload is created. A failed report submission does
not leave an orphan log document.

Suggested server shape:

```ts
diagnostics: {
  schemaVersion: 1,
  capturedAtMs: number,
  windowMs: number,
  truncated: boolean,
  droppedCount: number,
  events: DiagnosticBreadcrumbV1[],
}
```

The complete Firestore document must stay comfortably below Firestore's 1 MiB
document limit; the client and server both enforce the much smaller 32 KiB
diagnostics ceiling.

### 4.5 Admin experience

Only `admin/v2/legacy.html` is changed. An `error_reports` detail card gains a
collapsed section named `Диагностика перед ошибкой`.

The section shows:

- capture window and whether older events were truncated;
- a chronological timeline with relative time;
- event, screen, result, safe reason code, duration/network/app-state badges;
- compact duplicate counts;
- a button to copy the already-sanitized diagnostic JSON.

It stays inside the existing `Диагностика → Ошибки` report-detail surface; it
does not create a new top-level section or a nested-card hierarchy. The timeline
uses text plus badges rather than color alone, has a visible keyboard focus
order, exposes a tooltip on the copy action, and provides explicit loading,
empty, unsupported-version, and error states. At 375/768/1024/1440 px it wraps
inside the report detail without horizontal page scrolling.

Unknown schema versions render as `Неподдерживаемая версия диагностики`; they
must never break the report queue. All text is escaped. Full diagnostics are not
included in Telegram alerts or Jarvis model input. Telegram continues to show a
short report summary and directs the owner to the admin detail view.

## 5. Storage, cost, and performance

- Ordinary user action: no network request and no Firestore write.
- Local persistence: batched AsyncStorage update, bounded at 64 KiB.
- Submitted error report: the same single callable and the same single
  `error_reports` document write, with at most 32 KiB additional payload.
- Admin read: the same report document already loaded by the queue.
- Jarvis daily run: no full diagnostic payload is projected; existing
  category/screen aggregates remain unchanged.

Therefore billing is dominated by the number of actual reports, not the number
of active users or app actions. The feature introduces no daily per-user write
multiplier.

## 6. Retention and deletion

- Local breadcrumbs expire after 24 hours and are bounded by count/size.
- `AsyncStorage.clear()` in account deletion removes the local ring.
- The attached bundle lives only inside `error_reports` and is deleted by the
  existing stable-UID account-deletion query.
- Any future retention job for `error_reports` automatically covers the nested
  bundle; no separate diagnostics collection is created.
- Privacy policy text must explicitly state that a user-submitted error report
  may include a limited technical timeline from the preceding 24 hours.
- The report UI should disclose this briefly and offer `Посмотреть`, allowing
  the user to inspect the exact safe event list before sending. The report
  comment and the diagnostic bundle are sent only after the user's explicit
  submit action.

## 7. Failure handling

- Collector failures are swallowed and must never affect app behavior.
- AsyncStorage corruption resets only the diagnostic ring.
- Oversized bundles drop oldest events and expose `truncated`/`droppedCount`.
- Unknown event/reason codes are dropped, not converted to arbitrary strings.
- Server rejection of diagnostics may fall back to accepting the report without
  the optional bundle only when the rest of the report is valid; it must not
  strand the user's report button.
- Account-generation changes immediately reset the in-memory ring so one
  account's events cannot be attached to another account's report.
- Signing out, switching accounts, and deletion clear persisted breadcrumbs.

## 8. Security and access

- The client writes through the existing authenticated callable only.
- The server resolves stable UID from Firebase Auth and ignores client identity.
- Existing rate limits continue to apply.
- Firestore remains closed to direct client writes for report collections.
- Admin access remains protected by the existing admin custom claim.
- App Check policy is unchanged; this feature must not enable admin App Check.
- The diagnostics object is inert data. Admin rendering must escape every value
  and never execute links, markup, commands, or report-supplied instructions.

## 9. Data-contract impact

This is a schema addition to `error_reports`, so the same implementation change
must:

- confirm Jarvis readers continue projecting only approved aggregate fields;
- update `jarvis_data_contract_guard.test.ts` with the optional diagnostics
  field contract where required;
- update server/client report schema tests;
- keep `account_delete.ts` coverage for `error_reports` intact;
- avoid a new collection, so no new Firestore rule surface is necessary.

## 10. Verification strategy

Focused automated tests:

1. Ring count, TTL, size cap, batching, and adjacent deduplication.
2. Allowlist serialization and rejection of email/token/UID/free-text fixtures.
3. Account-generation reset and cross-account isolation.
4. Snapshot ordering, truncation, and deterministic relative timestamps.
5. Report submission includes diagnostics only on explicit error-report submit.
6. Server independently sanitizes counts, strings, enums, and unknown fields.
7. Oversized/invalid diagnostics do not discard a valid human report.
8. Admin timeline escapes values and tolerates absent/unknown schema versions.
9. Account deletion removes local breadcrumbs and server report documents.
10. Jarvis reads aggregates without receiving diagnostic event contents.

Manual verification:

- Perform an avatar/aura purchase failure simulation, send a report, and confirm
  the admin timeline shows the ordered stages without balance or identity data.
- Repeat with airplane mode and submit after reconnecting.
- Switch accounts before reporting and verify no prior-account event survives.
- Delete the account and confirm both local ring and corresponding report are
  covered by deletion.

## 11. Rollout

Use a Remote Config kill switch for collection and attachment. Suggested rollout:

1. Owner/dev installations only.
2. Inspect several deliberately generated reports for usefulness and privacy.
3. Enable for a small percentage of production users.
4. Review payload size, report submission latency, server rejection count, and
   accidental-PII test telemetry.
5. Enable for all users if the gates remain clean.

The kill switch disables new breadcrumb collection and attachment; it does not
delete existing user reports or weaken account deletion.

## 12. Acceptance criteria

- A submitted error report can show the ordered high-signal events preceding the
  report without a second reproduction session.
- No network log upload occurs before explicit user submission.
- No raw PII, credentials, receipts, user input, or arbitrary console output can
  enter the diagnostic bundle through its public API.
- The bundle is at most 32 KiB and the local ring at most 64 KiB/200 events/24h.
- Report submission remains one callable and one Firestore report write.
- A malformed diagnostic bundle cannot break report submission or admin UI.
- Account switch/deletion prevents cross-account diagnostic leakage.
- Existing Crashlytics, Jarvis aggregates, Telegram alerts, and report workflows
  keep their current behavior.

## 13. Crashlytics correlation and low-overhead observability extension

Owner approval: on 2026-08-28 the owner selected the recommended observability
variant after reviewing the time, cost, privacy, and device-load trade-offs.

### 13.1 Goal and reuse boundary

The existing sanitized support ring remains the only client breadcrumb source.
The extension must not create a second event collector, install another crash
SDK, add session replay, or stream user sessions. Phraseman already ships
`@react-native-firebase/crashlytics`; the implementation only adds a bounded
best-effort bridge and a correlation reference.

Crashlytics remains responsible for native crashes, non-fatal exceptions, and
Android ANRs. The app must not add a continuously running JavaScript watchdog.
Slow operations are identified by duration on a small allowlist of flows:
support submission, avatar/aura purchase and application, authentication, and
account deletion.

### 13.2 Hot-path performance contract

`recordSupportDiagnostic` must not read and rewrite AsyncStorage for every
event. It sanitizes the event, appends it to an account-generation-scoped
in-memory ring, trims it in memory, and returns without awaiting disk or native
telemetry.

Persistence rules:

- hydrate once per active account generation;
- use one transient debounce, never a periodic/background interval;
- persist at most once per two seconds during an active event burst;
- flush immediately when a report snapshot is requested or the app moves to
  the background;
- serialize no more than 200 events or 64 KiB;
- swallow storage and native telemetry failures;
- cancel or discard queued work when the account generation changes.

This design permits short-lived scheduled work caused by a real event but
forbids a timer that wakes an idle app. It also forbids a network request per
breadcrumb.

### 13.3 Crashlytics bridge

Only the already-sanitized event is eligible for mirroring. The bridge writes a
compact static line assembled from the versioned allowlist; it cannot accept
free text, tags, exception messages, URLs, IDs, request bodies, or receipts.

The bridge mirrors only high-signal events:

- authentication and account-deletion transitions;
- support-report queue/send/result transitions;
- avatar/aura purchase and application transitions;
- app foreground/background changes;
- navigation and generic feature actions only after adjacent deduplication and
  a maximum rate of two mirrored lines per second.

Crashlytics calls are fire-and-forget and native-production-only. No caller
awaits them. The existing Remote Config flag `support_diagnostics_enabled`
disables both new breadcrumb recording and the bridge, while core Crashlytics
crash collection remains unchanged.

### 13.4 Correlation contract

Each explicit support submission already receives a stable outbox ID. That ID
becomes the support correlation reference after strict validation against the
pattern `support_<timestamp>_<short-random>` and a 120-character limit.

The same reference is:

1. placed in the frozen report payload;
2. set as a Crashlytics custom key immediately before delivery;
3. accepted and independently sanitized by `submitClientReport`;
4. stored in the existing `error_reports` document;
5. emitted in one structured server log together with the resulting report
   document ID and safe outcome code;
6. shown and copied by the existing admin report card.

It is not an email, Firebase UID, stable account ID, purchase identifier, or
provider token. Server logs must contain no report comment, exercise text,
stack, receipt, or identity. A retry reuses the same correlation reference and
idempotency key.

### 13.5 Duration and failure signals

Key operations record only integer `durationMs`, safe operation name, result,
and reason code. Threshold crossings create a sanitized non-fatal signal only
when an operation ends or fails; there is no polling. Repeated identical signals
use the existing app-health throttling and sampling.

Network diagnostics consist of stage and outcome codes such as `queued`,
`send_started`, `timeout`, `auth_changed`, `rate_limited`, and `accepted`.
HTTP bodies, callable payloads, headers, tokens, IP addresses, and full URLs are
never recorded.

### 13.6 Cost and storage

The extension adds no dependency, collection, per-action Firestore write, or
continuous upload. A successful support submission still creates the same one
report document; the correlation reference and diagnostic bundle are fields in
that document. One short structured Cloud Logging entry is allowed per report.

Crashlytics and its custom logs use the already-installed no-cost Firebase
product. Additional Firestore and Cloud Logging usage is proportional to the
number of actual support reports, not daily or monthly active users.

### 13.7 Verification gates

Focused tests must prove:

1. a burst of breadcrumbs causes at most one persistence write in a two-second
   window and no idle/background interval exists;
2. snapshot capture flushes the in-memory ring and completes within the existing
   150 ms report deadline when storage is healthy;
3. account-generation changes cannot persist, mirror, or attach the retiring
   account's events;
4. the Crashlytics bridge rejects arbitrary text and rate-limits navigation and
   generic feature actions;
5. correlation references survive offline retry but malformed references are
   removed independently on both client and server;
6. the callable writes and logs the same safe correlation reference without
   logging report contents or identity;
7. the admin escapes and copies the reference and diagnostics;
8. telemetry failures never change purchase, account-deletion, authentication,
   navigation, or report-delivery results;
9. focused profiling on a low-end Android target and an iPhone shows no
   persistent timer, unbounded memory growth, or per-event network activity.

### 13.8 Rollout and acceptance

The extension ships behind the existing diagnostics kill switch. Owner/dev
builds validate deliberate purchase, account deletion, offline retry, crash,
and slow-operation scenarios before general rollout.

Acceptance requires all of the following:

- an administrator can move from a support report correlation reference to the
  matching safe client/server evidence;
- a crash or ANR includes useful preceding allowlisted breadcrumbs when the SDK
  captured the session;
- ordinary app activity produces no Firestore writes and no diagnostics upload;
- an idle app has no diagnostics polling timer;
- storage, Crashlytics, or logging failures are behaviorally invisible;
- the privacy exclusions in section 4.3 remain enforceable by client, server,
  admin, and contract tests.
