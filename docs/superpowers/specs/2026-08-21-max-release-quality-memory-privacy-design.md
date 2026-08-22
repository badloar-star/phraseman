# MAX Release Quality, Memory, Privacy, and Operations Design

Date: 2026-08-21  
Status: owner-approved design  
Scope owner: MAX voice tutor only

## 1. Goal

Turn MAX into a release-ready English voice tutor whose calls finish reliably,
whose review survives app interruption, whose memory produces visible continuity
between lessons, and whose operations can be monitored without storing or
exposing conversation content.

This design deliberately excludes purchases, paywalls, RevenueCat, subscription
packaging, entitlement rules, and prices. Those belong to a separate workstream.

## 2. Approved product decisions

1. A completed call must not lose its review, homework, goal evidence, or memory
   update when the app is backgrounded, killed, or reopened.
2. Reconnect is shown immediately as `Восстанавливаем связь`; it is never masked
   as thinking or listening.
3. MAX has its own first-use consent sheet and its own control in Privacy settings.
4. The MAX consent covers live audio processing, transcript-based review, and the
   small personal tutor memory. Memory does not have a separate enable switch.
5. The user can inspect, correct, delete one memory item, or clear all MAX memory.
6. Phraseman does not retain raw MAX audio.
7. Phraseman does not retain full transcripts after finalization succeeds.
8. Conversation content is not available in the admin panel, product analytics,
   Jarvis, exports, AI batch analysis, logs, error reports, or support tooling.
9. The MAX admin page contains operational aggregates only and never user content.
10. Pronunciation is not corrected, scored, or presented as a MAX capability.
11. The existing MAX sphere keeps its approved appearance. Only its response to
    actual remote audio energy changes.
12. The learner-facing experience and system copy support all eight interface
    languages; Russian is never a fallback for another interface language.
13. A complete B2 curriculum is required before MAX is described as a B2 course.
14. Accessibility requires VoiceOver and TalkBack device verification, not only
    JSX inspection.

## 3. Data boundary

### 3.1 Data used transiently

The following may exist only while a call or its finalization is unfinished:

- live microphone audio in the encrypted device-to-provider media connection;
- completed transcript turns in the in-memory call buffer;
- an account-scoped local finalization envelope required to retry after process
  death;
- the transcript carried in the authenticated finalization request;
- provider response data needed to construct the review and memory projection.

The server must not write the full transcript to Firestore, Cloud Storage, logs,
analytics, billing rows, safety alerts, or the admin panel. Request logging must
exclude request bodies. The client deletes the local transcript envelope as soon
as the server returns a durable finalization receipt. Unacknowledged envelopes
expire locally after 24 hours and are deleted on account switch, sign-out wipe,
or account deletion.

### 3.2 Durable learner data

Durable data is limited to the learning product the user expects:

- the final review receipt without the full transcript;
- the small MAX tutor memory described below;
- goal and phrase evidence;
- next-session homework and promised topic;
- session date, duration, completion reason, and review status;
- minimal server quota and reliability records already required to operate calls.

All durable learner data is account scoped and deleted with the account. No
conversation content is retained for product research.

### 3.3 Operational aggregates

MAX operational reporting uses daily aggregate documents. They contain counts,
histograms, and bounded enums only. They contain no UID, stable ID, session ID,
name, transcript, audio, free text, memory fact, homework phrase, or correction
text.

Allowed dimensions are platform, app build, interface language, target language,
CEFR band, call format, and bounded finish/error category. Dimensions are stored
only when they are required for a concrete reliability decision. The admin page
must not offer a path from an aggregate row to a person or conversation.

## 4. Durable finalization architecture

### 4.1 Client finalization outbox

Create an account-scoped `MaxFinalizeOutbox` with one record per `sessionId`.
The record contains:

- schema version;
- auth/stable account scope hash;
- session ID and tutor goal ID;
- completed transcript turns;
- deterministic tutor-tool evidence;
- start/end timestamps and duration;
- bounded audio/reconnect metrics;
- retry count and next retry time;
- local expiry time of 24 hours.

The outbox is written before navigation to the review screen. Navigation is not
the owner of finalization. A bootstrap drain retries pending records after local
hydration and authenticated account recovery. Account mismatch causes immediate
deletion rather than cross-account delivery.

### 4.2 Server finalization callable

Introduce a MAX-specific finalization operation keyed by `sessionId`. It verifies
that the authenticated account owns the minted voice session. The operation:

1. validates bounded transcript and evidence input;
2. reserves a short processing lease for the deterministic session ID;
3. returns the existing receipt when already completed;
4. applies deterministic tutor-tool evidence first;
5. requests the transcript-based review and safe memory extraction;
6. writes the review receipt and tutor-memory projection idempotently;
7. settles the call lifecycle through the existing server-owned settlement path;
8. updates daily operational aggregates without content;
9. marks the finalization receipt complete;
10. returns the receipt to the client.

The request transcript is never stored. A crashed attempt can be retried because
the client retains its outbox record until it receives the complete receipt. A
stale processing lease can be taken over; concurrent attempts cannot apply
mastery, homework, or memory twice.

### 4.3 Review receipt

The durable receipt stores only learner-facing output:

- one strength;
- one primary improvement focus;
- up to three corrections with normalized learner/correct forms;
- up to three tomorrow actions;
- confirmed homework phrases;
- next conversation topic;
- goal evidence and progress transition;
- a short session summary without personal conversation details;
- processing status and stable schema/model/content versions.

The review screen reads the receipt by session ID. It can show `saved`,
`processing`, `ready`, or `failed_retryable`. Returning later never requires the
original transcript after the receipt is ready.

## 5. MAX consent and privacy controls

### 5.1 First-use sheet

Reuse the production `AiConsentSheetModalHybrid` and `HybridSheetShell` family.
The sheet appears before any MAX pre-mint, microphone request, audio connection,
or transcript processing. It is localized in all eight interface languages.

The message states, in plain language:

- microphone audio is sent directly to OpenAI while the call is active;
- OpenAI produces the synthetic voice and transcript;
- Phraseman does not record or keep raw call audio;
- the full transcript is used temporarily for the review and then deleted;
- MAX keeps a small learning memory so the next lesson continues naturally;
- sensitive, financial, medical, legal, identifying, and emergency information
  must not be shared with MAX;
- the user can inspect, correct, and clear MAX memory in settings.

Accepting enables MAX. Declining leaves the rest of the app available and does
not start preparation. The consent decision is stored through the existing local
plus cloud consent pattern and is hydrated before the MAX entry can activate.

### 5.2 Privacy settings

Add an `AI-уроки с MAX` switch beside the existing AI feature switches. Turning
it off prevents future MAX calls and revokes future processing. It does not
silently delete existing tutor memory because deletion is a separate explicit
action.

Add a `Память MAX` row beneath the switch. It opens the memory manager. This is
not another consent toggle.

### 5.3 Memory manager

The memory manager provides:

- a plain-language explanation of why each category exists;
- grouped current values;
- edit for user-correctable personal/preferences fields;
- delete for each item;
- `Очистить всю память MAX` as a separated destructive action with confirmation;
- loading, empty, error, saved, and retry states;
- an audit-safe server receipt for edits and deletion without retaining old text.

Clearing memory does not disable MAX. The next call behaves like a first meeting.

## 6. Tutor memory V2

### 6.1 Schema

Replace the undifferentiated `facts: string[]` projection with typed, bounded
categories while continuing to parse the old schema during migration:

- `preferredName`: one user-correctable display name;
- `learningGoal`: one non-sensitive language-learning purpose;
- `conversationHooks`: up to eight short, non-sensitive interests or broad life
  context summaries volunteered by the learner;
- `languagePreference`: target/native balance preference;
- `pacePreference`: slower/default/natural;
- `activeIssues`: normalized English-learning issues currently needing work;
- `resolvedIssues`: issues with independent evidence that they improved;
- `phraseQueue`: due phrases and evidence state;
- `goalMastery`: can-do goal evidence;
- `homework`: current evidence-backed phrases only;
- `nextTopic`: one promised next topic;
- `callCount`, `lastCallAtMs`, and recent idempotency session IDs.

Memory extraction must never preserve a raw quote. A conversation hook is a
short neutral summary such as `enjoys cooking`, not a transcript fragment.

### 6.2 Prohibited memory

Reject memory candidates containing or describing:

- health, disability, medication, diagnosis, or mental-health details;
- financial status, payment details, debt, or salary;
- exact address, precise location, travel booking identifiers, or live location;
- email, phone number, account number, document number, password, or secret;
- political opinion, religion, union membership, sexuality, or intimate life;
- legal disputes, immigration cases, emergencies, or allegations about a person;
- information about another identifiable person;
- any detail not useful for future English teaching.

Enforcement uses a structured extraction schema, provider instructions,
deterministic pattern rejection for obvious identifiers, length/count bounds,
and server-side allowlisted field validation. Rejected candidates are discarded,
not logged.

### 6.3 Evidence and correction rules

- A user edit always overrides model-extracted personal facts.
- A user deletion prevents the same item from being immediately reintroduced in
  the same session receipt.
- `uncertain` or invalid speech evidence cannot create or resolve an issue.
- One corrected repetition cannot mark an issue resolved.
- Resolution requires lower-support evidence in a later or changed context.
- Goal mastery and issue resolution store normalized evidence labels, not raw
  learner utterances.
- All numeric mastery transitions remain explicit product hypotheses until
  calibrated with human review; they are not presented as CEFR certification.

### 6.4 Prompt behavior

At the start of a returning learner's call, MAX should naturally use at most one
personal hook and one learning-continuity hook. It must not recite the memory,
mention sensitive filtering, or sound like surveillance.

Priority order:

1. greet using the confirmed preferred name when available;
2. reconnect to the promised topic or due phrase;
3. adapt language balance and pace;
4. watch one active issue without announcing a hidden score;
5. acknowledge resolved progress only when supported by evidence.

## 7. Call-state and failure experience

Use one visible status owner for the live call:

- `Говори`;
- `MAX говорит`;
- `Восстанавливаем связь`;
- `Завершаем разговор`;
- `Разговор сохранён`.

Remove any delayed reconnect masking. Reconnect appears on the first state
transition and remains until success or terminal failure.

A terminal failure opens an in-flow receipt instead of navigating silently home.
It states whether the conversation was saved, whether the review is still being
prepared, and offers one primary action: retry connection, open saved review, or
return to MAX start depending on the actual state.

An explicit learner request to end the conversation bypasses normal endpointing:
MAX gives one short goodbye, emits the end tool, stops listening, and finalizes.
A watchdog still forces local teardown when the provider never emits the tool.

## 8. Live captions

Captions use stable audio-synchronized chunks rather than displaying raw ASR
partials indiscriminately.

- maximum two visible lines;
- MAX captions begin only after remote audio begins;
- stable words may appear progressively without rewriting already committed text;
- the final line locks when remote audio stops;
- user and MAX turns have unambiguous ownership;
- scroll follows the active completed chunk without jumping the layout;
- screen readers announce a completed turn, not each word;
- caption failure never blocks audio or call controls.

## 9. MAX sphere motion

The sphere's asset, silhouette, size, colors, and surrounding layout remain
unchanged. No ring, halo, extra outline, waveform, or word-triggered scale event
is added.

Remote audio energy is smoothed into a subtle scale/light response with bounded
attack and release values from the existing motion constants. Silence returns to
the unchanged idle sphere without snapping. Reduce Motion keeps essential
speaker-state feedback while removing continuous decorative pulsing.

## 10. Review and progress experience

### 10.1 Review hierarchy

The review screen has three progressive layers:

1. `Итог`: one strength and one primary focus.
2. `Что сделать завтра`: at most three numbered actions. A target English phrase
   is displayed explicitly, not implied by explanation text.
3. `Детали`: corrections, goal evidence, full available learning details, and the
   locally displayed transcript while it still exists in the finalization flow.

`Следующий разговор` is a separate row. Dense transcript/details remain collapsed
by default. The review remains readable at 200% text size.

### 10.2 Durable progress

Show progress that the system can defend:

- learner speaking time;
- can-do goals used with lower support;
- due phrases retrieved;
- active issues and issues resolved with later/contextual evidence;
- next planned conversation;
- weekly continuity based on durable review receipts.

Do not present unique-word sums, model correction percentages, time spent,
completion, streak, or call count as proof of proficiency. Do not display a CEFR
level increase unless the separate level-assessment contract supports it.

## 11. Curriculum and language coverage

The target language for this release remains English. Interface/support language
coverage is Russian, Ukrainian, Spanish, Brazilian Portuguese, Vietnamese,
Indonesian, Turkish, and Polish.

Every MAX surface and server fallback must cover all eight interface languages:
consent, prestart, call state, reconnect, permissions, terminal failure, review,
memory manager, deletion confirmation, safety fallback, and empty states.

B2 requires a dedicated can-do catalog, prerequisites, natural target phrases,
scene tasks, lower-support evidence, and changed-context checks. Until that
catalog exists and is reviewed, B2 users may receive conversation practice but
the product must not describe MAX as a complete B2 curriculum.

Pronunciation correction, pronunciation scoring, accent scoring, phoneme advice,
and claims of pronunciation improvement are explicitly out of scope. Transcript
review may correct grammar, vocabulary, phrasing, and communicative clarity only.

## 12. Privacy-safe MAX operations

### 12.1 Server aggregate contract

Create daily MAX operational aggregates with bounded counters/histograms for:

- mints requested/succeeded/failed;
- preparation latency;
- time-to-first-remote-audio buckets;
- response-latency buckets;
- calls started/completed/failed;
- explicit user ends and watchdog ends;
- reconnect attempts/recoveries/failures and recovery-time buckets;
- no-audio and empty-transcript counts;
- finalization queued/ready/retryable/terminal states;
- memory update success/failure and rejected-sensitive-candidate count;
- review ready/failure counts;
- quota reservation/settlement/watchdog counts;
- estimated provider usage/cost aggregates already available to operations.

Aggregation happens server-side. No per-event content collection is introduced.
The event contract is versioned, idempotent, and detects impossible sequences.

### 12.2 Admin page

Add one `MAX` page under `Диагностика` in the only live admin source,
`admin/v2/legacy.html`. The page follows the Admin UI Bible:

- a plain title and one-line purpose;
- period selector: today, 7 days, 30 days;
- health status with text plus color;
- compact KPI row;
- latency and completion trends;
- reconnect/failure breakdown;
- finalization and memory-write health;
- quota/watchdog health;
- clear loading, empty, error, and stale-data states;
- last aggregate timestamp and source description;
- no transcript, user search, UID, session drill-down, quote, or AI conversation
  summary control.

The page loads only when opened, uses pagination/bounded queries where needed,
and does not introduce presence polling or a background timer.

### 12.3 Access, rules, and Jarvis

New aggregate collections are server-write/admin-callable-read only. Direct
client reads and writes are denied in Firestore Rules. Admin reads require the
existing admin custom claim and generate an audit entry for diagnostic access.

Because this adds a data source, the same change updates:

- the appropriate Jarvis Firestore fetcher;
- `jarvis_data_contract_guard.test.ts`;
- `all_departments_snapshot.ts` when a department field is added;
- `JF_DEPARTMENT_META` in `admin/v2/legacy.html` when a department is added;
- Firestore Rules for every new collection.

Jarvis receives operational aggregates only, never learner memory or content.

## 13. Accessibility contract

The release-critical path is prestart -> consent -> microphone permission ->
call -> reconnect/error -> finalization -> review -> memory manager.

Required behavior:

- accurate roles, names, states, and values for every control;
- one announcement owner for call status;
- goal announced only when it changes;
- captions announced only as completed turns or through an explicit user setting;
- decorative sphere hidden from focus unless it exposes a concise current-speaker
  status without duplicating the visible live status;
- non-color text/shape cues for progress and errors;
- iOS targets at least 44 pt and Android targets at least 48 dp;
- 200% text scaling without clipped essential text or controls;
- dark text/icons on lime surfaces;
- Reduce Motion support;
- predictable focus when sheets open/close and after errors;
- alternate non-speech route out of microphone/recognition failure states.

Release evidence must include physical-device VoiceOver and TalkBack runs. Static
JSX inspection or simulator screenshots are not a pass.

## 14. Build and release gate

The production Functions build must be green before MAX release. The currently
observed Arena and Learning V2 TypeScript failures are separate fixes, but they
remain release blockers because the deployable Functions artifact is shared.
Arena fixes must preserve the project rule that Arena work is never reverted or
overwritten from an old snapshot.

## 15. Test strategy

All implementation follows test-first red-green-refactor cycles.

### Client automated tests

- consent unset/granted/denied and bootstrap hydration;
- no pre-mint or microphone work before consent;
- account-scoped finalization outbox persistence, retry, expiry, and wipe;
- app-kill/reopen receipt recovery;
- immediate reconnect state and terminal failure receipt;
- explicit end request cannot remain in listening;
- caption audio synchronization and bounded layout;
- sphere appearance unchanged and audio-energy response bounded;
- review three-layer hierarchy and 200% text contracts;
- memory manager edit/delete/clear and account isolation;
- eight-language fallback guards;
- accessibility tree and live-region ownership.

### Functions automated tests

- authenticated session ownership;
- deterministic finalize idempotency and concurrent retry;
- stale processing lease recovery;
- transcript absent from every durable document and log payload;
- review receipt schema and bounded fields;
- old-to-V2 memory migration;
- sensitive-candidate rejection;
- user corrections winning over extraction;
- active issue resolution requiring valid later/context evidence;
- no pronunciation fields or claims;
- aggregate idempotency and prohibited-property rejection;
- account deletion coverage;
- Firestore Rules and Jarvis data-contract parity;
- admin callable permission and bounded period validation.

### Manual/device verification

- physical iPhone and Android;
- weak Android device;
- speaker, wired headset, and Bluetooth;
- denied microphone, mute, background, screen lock, incoming call;
- poor Wi-Fi and network handoff;
- VoiceOver, TalkBack, large text, Reduce Motion, external navigation smoke test;
- all eight interface languages;
- admin responsive widths 375, 768, 1024, and 1440 px.

## 16. Release acceptance criteria

- A killed/reopened app can obtain the same durable review for the session.
- No successful finalization leaves a transcript in server storage.
- No admin/Jarvis/analytics response contains conversation or memory content.
- Reconnect is visible immediately and never appears as thinking/listening.
- An explicit end request reaches a saved or clearly failed terminal state.
- The learner can inspect, edit, delete, and clear MAX memory.
- User-edited memory is not overwritten by later extraction.
- Sensitive memory candidates are discarded and never logged.
- The review shows at most three tomorrow actions and one explicit next topic.
- The sphere's approved visual contract remains unchanged.
- Pronunciation is neither corrected nor claimed.
- All eight language contract tests pass without Russian cross-locale fallback.
- The MAX admin page contains operational aggregates only.
- Firestore Rules, Jarvis contracts, focused tests, accessibility device checks,
  and the full production Functions build pass.

## 17. Explicit non-goals

- purchase, paywall, entitlement, pricing, or subscription work;
- raw-audio recording or storage;
- transcript archive or admin transcript viewer;
- AI batch summary of user conversations;
- product analytics containing free text;
- pronunciation scoring or coaching;
- new visual appearance for the MAX sphere;
- background presence maps or decorative real-time admin polling.
