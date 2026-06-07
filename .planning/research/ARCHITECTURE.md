# Architecture Patterns

**Domain:** Apple Watch companion (watchOS SwiftUI + WatchConnectivity) for an Expo/RN app with a pure-TypeScript SRS engine
**Milestone:** v1.1 — Apple Watch Micro-Repetition
**Researched:** 2026-06-07
**Mode:** Project research (integration architecture for a subsequent milestone)

> Scope note: This file proposes how the watch feature plugs into the **existing** system. It does NOT redesign `app/active_recall.ts` or the `widget_bridge` pattern — it mirrors them. New vs modified components are flagged explicitly throughout.

---

## Recommended Architecture

### The core principle (inherited from `widget_bridge`)

`widget_bridge.ts` establishes a one-way rule: **RN is the sole writer, native only reads** a flat, versioned snapshot from App Group UserDefaults. That works for the widget because the widget is purely *display* (phrase of the day → render).

The watch is different: it is **interactive and can be offline**. The user swipes cards while out of iPhone range, and those swipe results are *new authoritative data the watch produces*. So the sole-writer rule must split by direction:

| Channel | Direction | Writer | Reader | Pattern source |
|---------|-----------|--------|--------|----------------|
| **Due-card batch** | phone → watch | RN (sole writer) | watchOS app | Mirrors `widget_bridge` exactly |
| **Complication count** | phone → watch | RN (sole writer) | Complication extension | Mirrors `widget_bridge` exactly |
| **Swipe results** | watch → phone | **watchOS app (must write its own offline queue)** | RN sync layer | NEW — watch is authoritative for its own swipes |

The phrase-key invariant from the milestone context is what makes the split safe: the watch never *originates* a phrase key, it only *echoes back* the opaque `phrase` string it received in the down-batch. The watch is authoritative for the **verdict** (`gotCorrect`, `reviewedAt`), never for the **identity** (`phrase`).

### Data flow diagram

```
┌──────────────────────────── iPhone (React Native) ────────────────────────────┐
│                                                                                │
│   app/active_recall.ts  ── getDueItems() ──►  app/watch_sync.ts  [NEW]         │
│   (UNCHANGED, sole         countDueItemsToday()   │                            │
│    source of truth)                               │ buildDueBatchPayload()     │
│        ▲                                          │ buildComplicationPayload() │
│        │ markReviewed(phrase, gotCorrect, ...)    ▼                            │
│        │ (applied idempotently, LWW)        modules/watch-bridge  [NEW]         │
│        │                                    (Expo Module, WCSession owner)      │
│        │                                          │                            │
│   onSwipeResults event ◄── emit ──────────────────┤                            │
│                                                   │                            │
└───────────────────────────────────────────────────┼────────────────────────────┘
                                                     │
                    ┌────────────────────────────────┼────────────────────────────┐
                    │  WatchConnectivity (WCSession)  │                            │
                    │                                 │                            │
   DOWN: updateApplicationContext(dueBatch)  ◄────────┤  (latest-wins state)       │
   DOWN: updateApplicationContext(complication) ◄─────┤  (latest-wins state)       │
   UP:   transferUserInfo(swipeResults)  ──────────────►  (FIFO durable queue)     │
                    │                                 │                            │
                    └────────────────────────────────┼────────────────────────────┘
                                                     │
┌──────────────────────────── Apple Watch (watchOS) ─┼────────────────────────────┐
│                                                     ▼                            │
│   WatchSessionManager (WCSessionDelegate)                                       │
│        │  on didReceiveApplicationContext → cache batch                         │
│        │  on swipe → enqueue result, transferUserInfo on reconnect              │
│        ▼                                                                        │
│   WatchStore (offline cache, App Group UserDefaults + file)                     │
│        │  - lastDueBatch (read by SwiftUI card stack)                           │
│        │  - pendingSwipeQueue (unsynced verdicts)                               │
│        │  - dueCountToday (read by Complication extension)                      │
│        ▼                                                                        │
│   SwiftUI card stack  ── swipe R/L ──►  enqueue {phrase, gotCorrect, reviewedAt}│
│   Complication extension (WidgetKit accessoryCircular)  ── reads dueCountToday  │
└────────────────────────────────────────────────────────────────────────────────┘
```

### Component boundaries

| Component | New/Modified | Responsibility | Communicates with |
|-----------|--------------|----------------|--------------------|
| `app/active_recall.ts` | **UNCHANGED** | Sole SRS source of truth. `getDueItems`, `markReviewed`, `countDueItemsToday` | `app/watch_sync.ts` only |
| `app/watch_sync.ts` | **NEW** | Build down payloads from `getDueItems`/`countDueItemsToday`; apply up payloads via `markReviewed` with LWW dedup; expose JS API + event emitter | `active_recall.ts`, `modules/watch-bridge` |
| `modules/watch-bridge` (Expo Module, iOS-only) | **NEW** | Own the iPhone-side `WCSession`; serialize/deserialize payloads; emit `onSwipeResults` to JS | `watch_sync.ts` (JS), watch over WCSession |
| watchOS SwiftUI app target | **NEW** | Card stack UI, swipe gestures, `WatchSessionManager`, `WatchStore` | WCSession, App Group |
| Complication extension (WidgetKit) | **NEW** | `accessoryCircular`/`accessoryInline` due-count on watch face | App Group UserDefaults (read-only) |
| Expo config plugin | **NEW** | Make `expo prebuild` preserve the watchOS target + entitlements + App Group | Build only |
| `modules/phrase-widget` | **UNCHANGED** | Existing phrase-of-day widget; reference template for the new module | — |

---

## The Sync Contract

Two payloads, both versioned with `schemaVersion` exactly like `WidgetPayload`. Keep them flat (App Group UserDefaults and WCSession dictionaries are not for large blobs).

### DOWN payload — phone → watch (due-card batch)

**Transport:** `WCSession.updateApplicationContext(_:)`. Rationale (verified): application context keeps only the **latest** state and overwrites prior ones — exactly right for "here is the current set of due cards." We never need history of past batches; we need the freshest list. ([Apple docs](https://developer.apple.com/documentation/watchconnectivity/wcsession/updateapplicationcontext(_:)))

```ts
// Defined in app/watch_sync.ts, mirrors WidgetPayload's style
export interface WatchDueBatchPayload {
  schemaVersion: 1;
  /** ISO date the batch was generated for (drives "stale batch" detection on watch). */
  generatedFor: string;          // "YYYY-MM-DD"
  /** Epoch ms when written — watch can show "tap phone to refresh" if very stale. */
  updatedAt: number;
  /** Interface language the `meaning` field was resolved for. */
  lang: 'ru' | 'uk' | 'es';
  cards: WatchCard[];
}

export interface WatchCard {
  /** OPAQUE ID. Exactly RecallItem.phrase. Watch MUST echo this back unchanged. */
  phrase: string;
  /** Front of card = English phrase (display = same string as `phrase`). */
  front: string;
  /** Back of card = locale-resolved meaning (correctAnswer/UK/ES picked by `lang`). */
  back: string;
  /** Phonetic transcription if available, else "". */
  transcription: string;
  /** For sort/priority hint on watch; not authoritative. */
  errorCount: number;
}
```

**Field selection rationale:**
- Include only what the 5-second swipe UI needs: `phrase` (opaque id + front), `back` (resolved meaning), `transcription`. Exclude SM-2 internals (`easeFactor`, `interval`, `repetitions`, `nextDue`) — the watch never computes SRS; the phone does. Sending them would invite the watch to "help," violating the sole-writer rule for SRS state.
- `back` is **pre-resolved on the phone** (`watch_sync` picks `correctAnswer` / `correctAnswerUK` / `correctAnswerES` from the `lang` setting) — same approach `buildWidgetPayload` uses with `dailyPhraseCopyForLang`. The watch stays locale-dumb.

**Batch size:** 20–30 cards. The on-phone `/review` session uses `SESSION_LIMIT = 7`, but the watch is for *many* micro-sessions across the day while possibly offline, so over-provision. Cap at 30 to keep the application-context dictionary small (WCSession context has a practical size budget; 30 short phrases is well within it). Pull via `getDueItems(30, undefined, studyTarget)` — **note: pass `commitSessionOverflow: false` / omit it** so building the batch never mutates `nextDue` (building a batch must be a pure read).

**Refresh cadence (who calls `sendDueBatch`):** mirror `widget_bridge` call sites —
1. App foreground/start.
2. After any on-phone review session ends (due set changed).
3. Study-target change.
4. On `WCSession` activation / `sessionReachabilityDidChange` to reachable.
5. After applying an up-batch of swipe results (the due set shrank — refresh the watch's view).

### UP payload — watch → phone (swipe results)

**Transport:** `WCSession.transferUserInfo(_:)`. Rationale (verified): `transferUserInfo` is a **durable FIFO queue** — every packet is delivered, in order, even after offline gaps, and nothing is overwritten. Swipe verdicts must not be lost or coalesced, so this is the correct primitive (NOT `updateApplicationContext`, which would drop all but the last). ([Teabyte: three ways to communicate](https://alexanderweiss.dev/blog/2023-01-18-three-ways-to-communicate-via-watchconnectivity))

```ts
// app/watch_sync.ts
export interface WatchSwipeBatch {
  schemaVersion: 1;
  results: WatchSwipeResult[];
}

export interface WatchSwipeResult {
  /** OPAQUE ID echoed back unchanged from WatchCard.phrase. Never re-normalized. */
  phrase: string;
  /** Swipe right = true (knew it), swipe left = false. */
  gotCorrect: boolean;
  /** Epoch ms captured on the watch at swipe time. Drives last-write-wins. */
  reviewedAt: number;
}
```

The watch sends one `WatchSwipeBatch` per `transferUserInfo` call (it may flush several queued swipes at once on reconnect, or one at a time — both fine because FIFO preserves order).

### `schemaVersion` + forward compatibility

Follow the `WidgetPayload` discipline literally:
- Both payloads carry `schemaVersion: 1`.
- **Reader-side tolerance:** on the watch, if `WatchDueBatchPayload.schemaVersion` is unknown/greater than supported, keep showing the last good cached batch (do not crash, do not clear cache). On the phone, if an incoming `WatchSwipeBatch.schemaVersion` is unknown, drop the batch and log (do not feed garbage to `markReviewed`).
- **Additive evolution:** new optional fields only; never repurpose a field. A v2 reader must handle a v1 payload. This matches the comment in `widget_bridge.ts`: "Versioned so a future native build can detect and ignore snapshots it does not understand."

---

## Conflict / Dedup Strategy

The hard case: a card is swiped on the watch **offline** at T1, and the same phrase is reviewed on the phone at T2. When the watch reconnects, the phone receives the T1 verdict *after* the T2 review already mutated SRS state.

### Recommendation: Last-Write-Wins by `reviewedAt`

`markReviewed` already stamps `item.lastReviewed = Date.now()` on every call (line 585). Use that as the LWW clock.

The `app/watch_sync.ts` apply algorithm:

```ts
export async function applySwipeBatch(
  batch: WatchSwipeBatch,
  studyTarget?: RuntimeStudyTarget,
): Promise<{ applied: number; skippedStale: number; skippedMissing: number }> {
  if (batch.schemaVersion !== 1) return { applied: 0, skippedStale: 0, skippedMissing: 0 };

  // Sort by reviewedAt ascending so within-batch order is deterministic.
  const ordered = [...batch.results].sort((a, b) => a.reviewedAt - b.reviewedAt);

  const all = await getAllItems(studyTarget);            // single read for the guard
  const byPhrase = new Map(all.map(i => [i.phrase, i])); // EXACT key, no normalize

  let applied = 0, skippedStale = 0, skippedMissing = 0;
  for (const r of ordered) {
    const item = byPhrase.get(r.phrase);                 // round-trip invariant relied on here
    if (!item) { skippedMissing++; continue; }           // see "missing card" below
    // LWW: only apply if the watch verdict is newer than the last phone-side review.
    if (r.reviewedAt <= item.lastReviewed) { skippedStale++; continue; }
    await markReviewed(r.phrase, r.gotCorrect, undefined, studyTarget);
    item.lastReviewed = r.reviewedAt;                    // keep local guard map in sync
    applied++;
  }
  return { applied, skippedStale, skippedMissing };
}
```

Key points:
- **Idempotency:** `transferUserInfo` can in rare cases redeliver; replaying the same batch is a no-op because after the first apply, `item.lastReviewed` advances past `r.reviewedAt`, so the second pass hits the `skippedStale` branch. The contract is: *apply only if `reviewedAt > item.lastReviewed`.*
- **Exact-key lookup:** the guard map is built with the raw `phrase` string — never `.toLowerCase()` / `.trim()` — honoring the round-trip invariant. This is the same exact-match contract `markReviewed` uses internally (`items.find(i => i.phrase === phrase)`).
- **Ordering within a batch:** sort by `reviewedAt` so if the same phrase appears twice in one batch (user swiped, card cycled back, swiped again), the later verdict wins and the SM-2 transitions apply in real chronological order.

> Caveat on `markReviewed`'s own clock: `markReviewed` internally sets `lastReviewed = Date.now()` (not `reviewedAt`). That is acceptable — the LWW *decision* is made in `applySwipeBatch` using `reviewedAt`; the stored `lastReviewed` just needs to monotonically advance to prevent re-apply, which `Date.now()` (always ≥ the watch timestamp by the time it reaches the phone) guarantees. We do **not** need to modify `active_recall.ts` to accept an external timestamp for correctness — the in-memory guard map handles within-run idempotency, and `Date.now()` handles cross-run.

### Card swiped on watch that no longer exists on phone

`markReviewed` no-ops when the item is gone (line 582: `if (!item) return`). This is **acceptable and correct** for this milestone:
- The item may have been auto-deleted (`AUTO_DELETE_DAYS`), pushed out by `MAX_ITEMS`, or removed via `removeItem`. The phrase is no longer in the SRS queue; recording a verdict against nothing is meaningless.
- `applySwipeBatch` counts these as `skippedMissing` for telemetry but takes no action. No error, no crash — same silent-noop philosophy as the engine. Document this explicitly so the planner doesn't try to "fix" it.

---

## Offline Cache on Watch

The watch must function with no iPhone in range, so it persists two things locally.

### What and where

| Data | Storage | Why |
|------|---------|-----|
| `lastDueBatch` (the WatchCard array) | App Group UserDefaults (single JSON string, like `phrase-widget`) | Small, read by both the app and potentially the complication; UserDefaults is the established pattern in this codebase |
| `pendingSwipeQueue` (unsynced `WatchSwipeResult[]`) | App Group file (`pendingSwipes.json`) **or** a UserDefaults array key | Append-mostly, must survive app suspension and watch reboot; a file is cleaner for an append/truncate queue but UserDefaults is fine at this volume |
| `dueCountToday` (Int) | App Group UserDefaults | Read by the Complication extension; written by RN (see complication section) |

Use the **same App Group suite naming convention** as `phrase-widget` (`group.app.phraseman.widget`) but with watch-specific keys, OR a dedicated suite `group.app.phraseman.watch`. **Recommendation: a dedicated suite `group.app.phraseman.watch`** — the watch app, the WCSession-receiving code, and the complication all live on the watch and share their own concerns; keeping them off the phone-widget suite avoids accidental key collisions and keeps the two features' entitlements independently reasonable. (Both suites are declared in entitlements; this is purely an isolation decision.)

### Replay on reconnect

```
WatchSessionManager (WCSessionDelegate):
  sessionReachabilityDidChange(_:):
    if session.isReachable || session.activationState == .activated:
      flushPendingSwipes()

  func flushPendingSwipes():
    let queue = WatchStore.loadPendingSwipes()   // [WatchSwipeResult]
    guard !queue.isEmpty else { return }
    let batch = WatchSwipeBatch(schemaVersion: 1, results: queue)
    session.transferUserInfo(batch.asDictionary)  // durable FIFO; survives if it goes offline mid-send
    // Do NOT clear the queue here. transferUserInfo is durable; clear only after
    // confirmed handoff to keep it crash-safe.
    WatchStore.markFlushed(queue)  // remove exactly the entries handed off
```

Design notes:
- The watch **enqueues immediately on every swipe** (synchronous local write) and flushes opportunistically. Because `transferUserInfo` is itself a durable OS-managed queue, once handed off the OS guarantees delivery — so the watch can prune its local queue after handoff. Keep local entries until handoff to survive an app crash between swipe and handoff.
- The phone's `applySwipeBatch` idempotency (LWW guard) is the safety net if a swipe is somehow handed off twice.

---

## Where the RN Sync Layer Lives

### `app/watch_sync.ts` — NEW module (the only thing that touches `active_recall.ts`)

Thin wrapper, same spirit as `widget_bridge.ts` (build payload → call native; receive native event → apply). JS-facing surface:

```ts
// app/watch_sync.ts

/** Build + push the current due batch to the watch. Pure read of SRS state. */
export async function sendDueBatch(opts?: {
  studyTarget?: RuntimeStudyTarget;
  lang?: 'ru' | 'uk' | 'es';
  limit?: number;        // default 30
  now?: number;
}): Promise<boolean>;     // false if native module unavailable / nothing due

/** Build + push the complication count. */
export async function sendComplicationCount(opts?: {
  studyTarget?: RuntimeStudyTarget;
}): Promise<boolean>;

/** Apply an incoming swipe batch to SRS (LWW + idempotent). */
export async function applySwipeBatch(
  batch: WatchSwipeBatch,
  studyTarget?: RuntimeStudyTarget,
): Promise<{ applied: number; skippedStale: number; skippedMissing: number }>;

/** Subscribe to swipe results pushed up from the watch. Returns unsubscribe. */
export function onSwipeResults(
  handler: (batch: WatchSwipeBatch) => void,
): () => void;

/** Wire-up helper: subscribe + apply + refresh batch. Call once at app start. */
export function startWatchSync(opts?: {
  studyTarget?: RuntimeStudyTarget;
  lang?: 'ru' | 'uk' | 'es';
}): () => void;          // returns teardown
```

`startWatchSync` internally does: `onSwipeResults(b => applySwipeBatch(b).then(() => sendDueBatch()))` plus an initial `sendDueBatch()` + `sendComplicationCount()`. This keeps the SRS round-trip self-healing: every applied batch shrinks the due set and re-pushes the fresh batch + count.

### `modules/watch-bridge` — NEW Expo Module (iOS-only WCSession owner)

Mirror `modules/phrase-widget` structure (`index.ts` facade + `ios/WatchBridgeModule.swift` + `expo-module.config.json`). It owns the **iPhone-side** `WCSession`.

```ts
// modules/watch-bridge/index.ts
import { requireOptionalNativeModule, EventEmitter } from 'expo-modules-core';

interface WatchBridgeNativeModule {
  isAvailable(): boolean;                       // false on Android / Expo Go / no paired watch
  isPaired(): Promise<boolean>;
  updateDueBatch(payload: WatchDueBatchPayload): Promise<void>;     // → updateApplicationContext
  updateComplication(payload: WatchComplicationPayload): Promise<void>; // → updateApplicationContext (separate key) + transferCurrentComplicationUserInfo when budget allows
  // Emits "onSwipeResults" with { schemaVersion, results } when watch delivers a transferUserInfo.
}
```

```swift
// modules/watch-bridge/ios/WatchBridgeModule.swift (sketch)
public final class WatchBridgeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("WatchBridge")
    Events("onSwipeResults")

    OnStartObserving { /* activate WCSession, set delegate */ }

    AsyncFunction("updateDueBatch") { (payload: [String: Any]) in
      try WCSession.default.updateApplicationContext(["dueBatch": payload])
    }
    AsyncFunction("updateComplication") { (payload: [String: Any]) in
      try WCSession.default.updateApplicationContext(["complication": payload])
    }
    Function("isAvailable") { WCSession.isSupported() }
  }
  // WCSessionDelegate.didReceiveUserInfo → sendEvent("onSwipeResults", swipeBatchDict)
}
```

**Event-emitter pattern for incoming results:** native receives `didReceiveUserInfo` (the durable up-queue), then `sendEvent("onSwipeResults", batch)`. The JS facade re-exposes it via `EventEmitter`; `watch_sync.onSwipeResults` subscribes. This is the inverse of `phrase-widget`, which had no inbound channel — the new module adds one.

> Android: `WatchBridge.isAvailable()` returns false (no `ios/` peer compiled in, just like `phrase-widget` no-ops in Expo Go). All `watch_sync` callers must be guard-clause tolerant exactly like `syncWidgetData`'s `if (!PhraseWidget.isAvailable()) return false`.

---

## Complication Data Path

**What it shows:** `countDueItemsToday()` — the same number as the home badge, on the watch face.

**Path:**
1. RN computes `countDueItemsToday(studyTarget)` (pure read, no mutation — line 177).
2. `watch_sync.sendComplicationCount()` builds a tiny payload and calls `WatchBridge.updateComplication`.
3. Native sends it via `updateApplicationContext` (latest-wins is correct — only the freshest count matters).
4. On the watch, `WatchSessionManager` writes the Int into the **App Group UserDefaults suite** (`group.app.phraseman.watch`, key `due_count_today_v1`).
5. The WidgetKit complication extension (`accessoryCircular` + `accessoryInline`) reads that key in its `TimelineProvider` and renders it. Call `WidgetCenter.shared.reloadAllTimelines()` after the write (same call `phrase-widget`'s `reloadAll` uses).

```ts
export interface WatchComplicationPayload {
  schemaVersion: 1;
  dueCount: number;
  updatedAt: number;
}
```

**App Group suite decision:** use the **watch-specific suite** `group.app.phraseman.watch`, NOT the phrase-widget suite. The phrase-widget suite (`group.app.phraseman.widget`) belongs to the iOS home/lock-screen widget and is RN-written-on-the-phone; the complication count is written *on the watch* by the watch app after receiving WCSession data. Different writer, different device, different lifecycle → separate suite. This keeps the existing widget contract untouched (honoring "do not redesign widget_bridge").

**Who writes when:** RN pushes the count on the same triggers as the due batch (app start, after a review session, study-target change, after applying an up-batch). The watch app writes the App Group key on receipt. The complication never writes — read-only, mirroring the sole-writer principle on the watch side.

---

## Patterns to Follow

### Pattern 1: Direction-split sole-writer
**What:** Keep RN as sole writer for all *display* data (due batch, complication). Allow the watch to write only its *own* generated data (swipe queue), which it then ships to RN as the authoritative applier.
**When:** Any channel where the producer of truth differs by direction.

### Pattern 2: Opaque-id echo
**What:** The watch stores and returns `phrase` as an untouched string. Never `.trim()`, `.toLowerCase()`, normalize, or reconstruct it.
**Why:** `markReviewed` / `applySwipeBatch` do exact-match lookups. Any mutation breaks the round-trip and silently no-ops the review.

### Pattern 3: Pure-read payload building
**What:** `sendDueBatch` calls `getDueItems(limit)` **without** `commitSessionOverflow`. Building a snapshot must never mutate SRS state (no `nextDue` shifting).
**Why:** The watch batch is a view, not a session start. Mutating on snapshot would corrupt scheduling.

### Pattern 4: Graceful native-absence
**What:** Every `watch_sync` entry point checks `WatchBridge.isAvailable()` and returns a benign value on Android / Expo Go / unpaired watch.
**Source:** Directly mirrors `syncWidgetData`'s try/catch + `isAvailable()` guard.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Watch computing SRS
**What:** Sending `easeFactor`/`interval`/`nextDue` to the watch and letting it precompute next due dates.
**Why bad:** Two SRS engines diverge; violates "engine not rewritten." **Instead:** watch sends raw verdicts; phone is the only scheduler.

### Anti-Pattern 2: Using `updateApplicationContext` for swipe results
**What:** Sending verdicts via application context.
**Why bad:** Context coalesces — offline swipes get overwritten, results lost. **Instead:** `transferUserInfo` (durable FIFO).

### Anti-Pattern 3: Re-normalizing the phrase key on the watch
**What:** Trimming/lowercasing the phrase for display or storage.
**Why bad:** Breaks the exact-match invariant; `markReviewed` no-ops. **Instead:** store `phrase` opaque; have a separate `front` field if any display transform is ever needed (it isn't — front == phrase).

### Anti-Pattern 4: Clearing the watch pending queue before handoff confirmed
**What:** Dropping the local queue right after `transferUserInfo` returns.
**Why bad:** A crash between swipe and OS handoff loses the verdict. **Instead:** prune only entries actually handed to the OS queue.

### Anti-Pattern 5: Reusing the phrase-widget App Group suite for the complication
**What:** Writing `due_count_today` into `group.app.phraseman.widget`.
**Why bad:** Mixes phone-written and watch-written data in one suite, couples two independent features. **Instead:** `group.app.phraseman.watch`.

---

## Scalability / Robustness Considerations

| Concern | Approach |
|---------|----------|
| Large due set | Cap watch batch at 30; phone keeps full set. Watch re-requests fresh batch after each apply. |
| Long offline period | `transferUserInfo` durable queue + local `pendingSwipes.json`; replay on reconnect. |
| Duplicate delivery | LWW guard (`reviewedAt > lastReviewed`) makes apply idempotent. |
| Phrase deleted before sync | `markReviewed` no-ops (`skippedMissing`); acceptable. |
| Stale batch on watch (phone never ran) | `updatedAt`/`generatedFor` lets watch show a subtle "open phone to refresh" hint; still swipeable on cached cards. |
| Schema drift | Additive-only fields; unknown `schemaVersion` → watch keeps cache, phone drops batch. |

---

## Suggested Build Order

Dependencies flow strictly: you cannot test sync without a session; you cannot have a session without entitlements; you cannot keep the watch target without the config plugin. Order:

```
Phase 1: Config plugin + entitlements + App Groups   (no deps; everything else needs it)
   └─► Phase 2: WCSession native module (modules/watch-bridge, iPhone side)
          └─► Phase 3: watchOS SwiftUI app (card stack + WatchSessionManager + WatchStore + offline queue)
                 ├─► Phase 4: Complication extension (needs App Group + watch app target)
                 └─► Phase 5: RN sync layer (app/watch_sync.ts) — needs the native module to send/receive
```

**Why this order:**

1. **Config plugin / entitlements / App Groups (FIRST, hard blocker).** `expo prebuild` regenerates the native project and will wipe a hand-added watchOS target. Nothing downstream survives a rebuild without this. Declares both App Group suites (`...widget` already exists; add `...watch`) and the WatchConnectivity capability. Pure infra, no business logic. *Recommend a vertical "hello world" watch target here to prove the plugin survives prebuild before investing in features.*

2. **WCSession native module (`modules/watch-bridge`).** Mirror `modules/phrase-widget` scaffolding. Implement `updateApplicationContext` send + `didReceiveUserInfo` event. Testable in isolation by echoing payloads with a stub watch. Depends only on entitlements/config from Phase 1.

3. **watchOS SwiftUI app.** Card stack, swipe gestures, `WatchSessionManager` (WCSessionDelegate), `WatchStore` (App Group cache + `pendingSwipes.json`), replay-on-reconnect. This is the heaviest phase. Depends on the session capability (P1) and benefits from P2 existing as the counterpart, though the watch side can be developed against a manual test harness.

4. **Complication extension.** WidgetKit `accessoryCircular`/`accessoryInline` reading `due_count_today_v1` from the watch App Group. Depends on the watch app target (P3) existing and the App Group (P1). Small once P3's `WatchStore` write path exists.

5. **RN sync layer (`app/watch_sync.ts`).** The end-to-end glue: `sendDueBatch`, `sendComplicationCount`, `applySwipeBatch` (LWW), `onSwipeResults`, `startWatchSync`. Depends on the native module (P2) for transport. Wired into app-start call sites last, after the round-trip is provable.

> P4 and P5 can proceed in parallel after P3 (P4 needs only the App Group write; P5 needs only the native module). P1→P2→P3 is the strict critical path.

---

## New vs Modified Components — Summary

| Component | Status |
|-----------|--------|
| `app/active_recall.ts` | **UNCHANGED** (consumed read-only + via `markReviewed`) |
| `app/widget_bridge.ts`, `modules/phrase-widget` | **UNCHANGED** (reference template only) |
| `app/watch_sync.ts` | **NEW** |
| `modules/watch-bridge` (Expo Module, iOS) | **NEW** |
| watchOS SwiftUI app target | **NEW** |
| Complication extension (WidgetKit) | **NEW** |
| Expo config plugin (watch target + entitlements) | **NEW** |
| App Group `group.app.phraseman.watch` | **NEW** (declared in entitlements) |
| App-start wiring (call `startWatchSync`) | **MODIFIED** (one call site, mirrors `syncWidgetData` wiring) |

---

## Sources

- [WCSession.updateApplicationContext — Apple Developer Documentation](https://developer.apple.com/documentation/watchconnectivity/wcsession/updateapplicationcontext(_:)) — latest-wins semantics for the down batch. **HIGH**
- [Three Ways to communicate via WatchConnectivity — Teabyte](https://alexanderweiss.dev/blog/2023-01-18-three-ways-to-communicate-via-watchconnectivity) — `transferUserInfo` durable FIFO vs `updateApplicationContext` coalescing. **MEDIUM** (corroborated by Apple docs above)
- [Creating accessory widgets and watch complications — Apple Developer Documentation](https://developer.apple.com/documentation/widgetkit/creating-accessory-widgets-and-watch-complications) — WidgetKit complication families (`accessoryCircular`, `accessoryInline`, `accessoryCorner`), timeline provider, App Group read pattern. **HIGH**
- [Complications and widgets: Reloaded — WWDC22](https://developer.apple.com/videos/play/wwdc2022/10050/) — ClockKit → WidgetKit migration, `reloadAllTimelines`. **MEDIUM**
- Existing codebase: `app/active_recall.ts`, `app/widget_bridge.ts`, `modules/phrase-widget/*`, `.planning/PROJECT.md` — integration contracts, sole-writer pattern, schemaVersion convention. **HIGH** (primary source)
