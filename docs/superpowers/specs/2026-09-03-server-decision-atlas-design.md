# Phraseman Server Decision Atlas — Design

**Goal:** Build one standalone, interactive HTML page that explains every app-to-server interaction in plain Russian, shows the current evidence-based behavior, and lets the owner stage safe future-policy choices before any source code changes are proposed.

**Status:** Approved direction with the added requirement that every technical word and status is explained in-place in plain language.

## Owner outcome

The owner can open one local HTML page and understand, without reading source code:

- what each feature does;
- whether an action is local-only, synchronizes with Firebase, or calls a server function;
- who has the final say for the result: the app, server, or external payment/provider;
- when the UI changes: immediately, after an answer, or after an asynchronous worker;
- where data is stored, in what order steps happen, and how retry/offline behavior works;
- whether a retry can duplicate a result, whether a server result can overwrite a local result, and what test or contract supports the claim;
- which changes are selectable and which are intentionally locked by a security, economy, access, or data-consistency contract.

The page is an audit and decision tool. It never connects to Firebase, invokes Cloud Functions, edits remote data, submits a purchase, or changes the app by itself.

## Terms shown in plain Russian

The page has a persistent `Словарь простыми словами` panel and every technical badge opens the same one-sentence definition at its point of use.

| Term | On-page explanation |
|---|---|
| App / client | The Phraseman app on the player’s phone. |
| Server | The remote Phraseman part that checks, stores, or finishes an action. |
| Sync | Sending a phone change to the remote store, or receiving the remote version. |
| Optimistic | The screen changes immediately; the network answer arrives later. |
| Queue | A saved list of actions that will be sent when conditions permit, for example when the internet returns. |
| Contract | A fixed project rule that protects data or behavior. It is not a mysterious technical error and cannot be bypassed by one toggle. |
| Idempotent retry | Repeating the same request returns the original result instead of giving a double reward or a double charge. |
| Receipt | A durable record proving one action and its exact outcome. |
| Overwrite | One version replaces another. The page explicitly says which version may replace which. |
| Background worker / cron | An automatic server task that runs later or on a schedule. |
| Webhook | A message an external service sends to Phraseman, for example after a payment. |

No card may use any of these terms without displaying or linking to this explanation. Labels avoid acronyms where a normal Russian phrase is possible.

## Scope

The catalog covers the full deployed code surface relevant to server behavior:

1. User-facing React Native features: XP, levels, runes, rewards, streaks, lessons and Learning V2, purchases/access, voice/MAX, account and identity, leagues, Arena, tournaments, social systems, notifications, settings, content, reports and analytics.
2. Direct client Firestore reads/writes/listeners and client calls to Cloud Functions or HTTP APIs.
3. Cloud Functions callable endpoints, HTTP endpoints, webhooks, Firestore triggers, queues/workers, scheduled jobs and server-to-server integrations.
4. Internal systems that affect the product: admin operations, Jarvis, support, content publishing, operations and analytics.
5. Test and contract sources that prove a behavior.

Disabled or retired routes are included, marked visibly as `disabled/retired`, and never presented as active functionality.

## Information model

### System map

The landing section groups all records into understandable areas:

- Player progress and rewards
- Economy, purchases and access
- Lessons and content
- Social, leagues, Arena and tournaments
- Voice/MAX and AI safety
- Identity, account and privacy
- Notifications, reports and settings
- Admin, Jarvis, support and analytics
- Background work, HTTP, webhooks and external services

The map uses real counts generated from the audit dataset. Percentages are never invented: each percentage states its numerator and denominator, such as `42 of 57 records have a focused test or contract`.

### Function card

Every record must show these fields in this exact simple-language order:

1. **What it does** — one short user-level sentence.
2. **What starts it** — tap, screen opening, document change, schedule, or outside service.
3. **Current route** — visual flow: `app → immediate screen change? → server/worker → stored result`.
4. **Who has the final say** — client-authoritative, server-adjudicated, shared/sync, or external-confirmed, with a sentence explaining the classification.
5. **What the player sees and when** — optimistic, loading, deferred, or background only.
6. **Sync and offline behavior** — immediate send, durable queue, local-only, retry, or unavailable offline.
7. **Storage and overwrite behavior** — named data boundary/path at an appropriate safe level, whether remote data can replace local data, and conflict policy.
8. **Order and retry safety** — numbered step timeline plus idempotency/receipt behavior.
9. **Evidence** — source paths and badges: `found in code`, `contract checked`, `focused test`, or `manual/runtime check needed`.
10. **Choose future behavior** — controls only for policy dimensions that can safely be changed.

Cards offer a compact summary by default and a `show details` expansion. Search, category, route type, authority, optimistic state, offline state, evidence, risk and selectable-only filters make the complete catalog navigable.

### Decision console

Each selectable control shows:

- current state and its plain explanation;
- allowed alternatives;
- a one-line consequence of each alternative;
- affected areas, calculated from the audit mapping;
- whether the selection requires a normal implementation plan, an owner decision, or a critical contract review.

Selections are browser-local draft choices, persisted in `localStorage`. A `My decisions` panel lists only choices different from baseline. It can export/copy a compact JSON decision draft and a readable change summary. The page does not automatically modify TypeScript or deploy anything.

Unsafe options are not merely hidden. They appear as a locked option with a human explanation. For example, ordinary personal rune spending cannot become a server-authoritative balance rollback because the Economy Constitution requires client authority, durable composite grants, and idempotent receipts. Security, permission, deletion, payment, identity, external-transfer and migration decisions are staged for critical review rather than applied as ordinary UI choices.

## Data collection and truth labels

An offline inventory generator reads only workspace source files and emits a versioned static JSON dataset consumed by the HTML page. It does not read credentials or call any cloud service.

The generator builds a record from:

- client routes: `httpsCallable`, direct Firestore interaction, fetch/HTTP clients, local persistence, optimistic comments/state and retry queues;
- server routes: callable/HTTP exports, trigger/schedule exports, auth checks, validation, Firestore paths, idempotency keys, receipts and external SDK boundaries;
- evidence: focused source tests and explicit contract tests;
- source links: repository-relative file path and line number when available.

The audit never calls a route “working in production” only because it exists. Truth labels have four levels:

| Label | Meaning |
|---|---|
| Found in code | The source contains this route or behavior. |
| Contract checked | A guard or contract test explicitly requires the behavior. |
| Focused test | A relevant automated test passes in the current workspace. |
| Runtime check needed | Source evidence exists, but production behavior has not been observed in this audit. |

## Interaction and visual design

The page follows the dark, high-contrast dashboard direction shown in the approved mockup: Fira Code headings, Fira Sans body text, accessible lime only with dark foreground where used, clear focus rings, no reliance on color alone, keyboard-reachable controls, 44 px minimum hit areas and reduced-motion support.

The top-level view uses a small map, real coverage bars, and filters. Detail cards use a four-step route diagram. Decision controls show current state, proposed state and impact without hiding the baseline. The UI must work at 375 px, 768 px, 1024 px and 1440 px without horizontal overflow.

## Safety and implementation order

1. Inventory the codebase and prove route classifications from source.
2. Create the static audit dataset with traceable source references and no invented metrics.
3. Build the standalone interactive HTML page and its plain-language glossary.
4. Add browser-local decision staging, impact preview and export.
5. Verify the page’s data coverage and interactive controls with focused checks.
6. Only after the owner exports/reviews a decision set, create a separate implementation plan for selected changes. Critical policy changes receive a critical-domain review and preserve project invariants.

## Acceptance criteria

- Every discovered server-related route appears once in the catalog or is explicitly grouped with a reason and source reference.
- A non-technical owner can identify authority, timing, sync, offline, overwrite and retry behavior for every card without needing outside terminology.
- Every technical badge has an immediate simple-language explanation.
- Each displayed count and percentage derives from the static dataset and states what it measures.
- Users can filter, search, expand detail, stage an allowed choice, reset it and export the decision draft without network access.
- The audit page performs no Firebase/HTTP calls and changes no production data.
- Locked controls explain the governing rule and never create a false impression that a dangerous choice was applied.
- The audit distinguishes source evidence from observed production behavior.
