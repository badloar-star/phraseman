# Pitfalls Research

**Domain:** watchOS companion for Expo/React Native + string-keyed SRS engine
**Researched:** 2026-06-07
**Confidence:** HIGH (prebuild/WCSession/entitlements verified with official docs + GitHub issues; phrase-key and conflict pitfalls HIGH based on platform fundamentals + multiple corroborating sources)

---

## Critical Pitfalls

### Pitfall 1: Expo prebuild --clean destroys the watchOS target

**What goes wrong:**
`expo prebuild --clean` (and EAS Build, which runs prebuild internally) deletes and regenerates the entire `ios/` directory. Any manually added watchOS target — the `.xcodeproj` group, the Embed Watch Content build phase, the WatchKit dependency on the host app — is wiped on every clean build. The Xcode project is left with no watch target at all, or with the target orphaned and unwired.

**Why it happens:**
`--clean` is the canonical safe option for CNG (Continuous Native Generation): it removes `ios/` before regenerating so no stale config accumulates. That is correct behavior for files Expo owns. The watch target lives inside `ios/` but Expo has no native understanding of it, so it regenerates the project without the target.

Additionally, `@bacons/apple-targets` (the de-facto standard plugin for this) has a documented wiring bug (issue #175): after `prebuild --clean` with a watchOS target, the generated pbxproj has self-dependencies on the watch target instead of the host app depending on the watch target, and is missing the "Embed Watch Content" copy phase entirely. Patch-package is the documented workaround while this is unresolved.

**How to avoid:**

1. Store all watch source files in a top-level `/targets/watch/` directory (outside `ios/`). `@bacons/apple-targets` reads from this directory and re-injects targets into `ios/` on every prebuild run — surviving `--clean`.

2. Write a config plugin that is fully idempotent: it must produce the same result on first run and on every subsequent `--clean` run. Use `withXcodeProject` to add the target programmatically, not by mutating raw pbxproj strings. The plugin must check `hasTarget(projectName)` before adding, and `hasPhase(targetName, 'Embed Watch Content')` before adding the phase.

3. Apply a `patch-package` patch on top of `@bacons/apple-targets`'s `with-xcode-changes.js` to correctly wire the "watch app depends on host app" dependency and add the embed phase. This patch must be committed and applied as a `postinstall` script. Verify it is still needed on each `@bacons/apple-targets` version bump.

4. In `eas.json`, confirm EAS Build does not pass `--skip-prebuild`. By default EAS runs `expo prebuild --clean` — the plugin must be correct or the cloud build will ship without a watch target.

5. Smoke-test: after every `prebuild --clean`, run `xcodebuild -list -project ios/YourApp.xcodeproj` and assert the watch app target appears in the output.

**Warning signs:**
- Watch app disappears from scheme list in Xcode after a prebuild.
- EAS Build succeeds but the resulting `.ipa` has no embedded watch app (check with `unzip -l *.ipa | grep Watch`).
- Build log shows "Embed Watch Content" phase is absent from the app target.

**Phase to address:** Phase 1 — Config plugin and entitlements setup. Must be the first deliverable; nothing else is buildable until prebuild survives clean.

---

### Pitfall 2: The phrase key silently mutates during the phone→watch→phone round-trip

**What goes wrong:**
`markReviewed(phrase, gotCorrect)` does an exact string lookup. If the phrase key arrives back at the RN layer with any mutation — a trimmed leading/trailing space, a different Unicode normalization form, a modified whitespace character, a locale-specific character casing change — the lookup finds nothing and returns silently with no-op. The watch session records a review, the user sees a correct/incorrect animation, but the SRS state is never updated. There is no error, no crash, no log line.

**Why it happens — five distinct mechanisms:**

1. **JSON serialization normalization.** When a `String` is serialized to JSON in Swift (`JSONEncoder`) and deserialized in JavaScript (`JSON.parse`), Unicode scalar sequences that are canonically equivalent but representationally different (NFD vs NFC) may survive unchanged in JSON but not match TypeScript's `===` if the original key was stored in a different form. JavaScript uses UTF-16 internally; Swift uses UTF-8. Combining characters (common in Ukrainian/Cyrillic with accents) can round-trip differently.

2. **Swift `String` trimming / whitespace normalization.** A careless `.trimmingCharacters(in: .whitespacesAndNewlines)` or `.lowercased()` anywhere in the Swift layer — including in a helper that formats display text — will permanently alter the opaque key if that helper is accidentally applied to the phrase field rather than only the display field.

3. **WCSession dictionary plist constraint.** WCSession transfers (`sendMessage`, `transferUserInfo`, `updateApplicationContext`) require all values to be plist-compatible types: `String`, `Number`, `Bool`, `Date`, `Data`, `Array`, `Dictionary`. A Swift `String` value is plist-safe, but `NSString` and `String` bridging edge cases exist. Any value that is not plist-compatible causes the entire transfer to be silently dropped (no error callback on the watch side with some API variants).

4. **UserDefaults / plist round-trip.** The App Group shared `UserDefaults` stores values as XML plist. NSString (and Swift String via bridge) is stored as UTF-8. Reading back through `string(forKey:)` returns an `NSString`. If the original TypeScript string had any characters that XML-encodes on write (e.g., `&`, `<`, `>`), they will be decoded correctly — but only if you wrote through `UserDefaults` not through a raw plist file. Writing raw plist and reading via `UserDefaults` or vice versa can produce escaped vs unescaped variants.

5. **Locale-dependent case folding.** Swift's `.lowercased()` without a `Locale` argument uses the system locale. On a Turkish locale device, `.lowercased()` maps `"I"` to `"ı"` (dotless i), permanently mangling any key containing uppercase I.

**How to avoid:**

1. **Treat `phrase` as an opaque identifier at the Swift layer.** Never call any string transformation on it: no `.trimmed`, no `.lowercased()`, no normalization, no `.replacingOccurrences`. If display text needs transformation, copy to a separate `displayPhrase` field and transform that. The `phrase` field flows through Swift as-is.

2. **Write a round-trip test before any other integration work.** The test:
   - Takes 20 representative phrases from `active_recall.ts` including ones with: leading/trailing spaces, Unicode combining chars (Cyrillic), apostrophes, slashes, `&` characters, multi-word phrases.
   - Serializes them to `[String: Any]` in Swift.
   - Passes through `WKWatchConnectivityManager` encode/decode cycle (simulated in a unit test).
   - Writes to App Group `UserDefaults`, reads back.
   - Returns to the RN layer via the native module.
   - Asserts `phrase_returned === phrase_original` in a Jest test using `toBe` (strict equality, not `toEqual`).
   This test must be green before Phase 3 (watchOS SwiftUI app) begins.

3. **Add a canary assertion in `markReviewed`.** Instead of silently returning on `!item`, log a WARNING: `"markReviewed: phrase key not found — possible round-trip mutation. Key: '${phrase}'"`. This converts a silent no-op into a detectable signal during QA.

4. **Version the payload schema.** Include a `schemaVersion: 1` field in every WCSession dictionary. On schema mismatch, log and drop rather than silently misapply.

**Warning signs:**
- Review sessions on the watch produce no change in `getDueItems()` count on the phone.
- Items reviewed on the watch reappear immediately on next app launch.
- Canary log line fires during QA.

**Phase to address:** Phase 2 — Native WCSession module. The round-trip test must be written at the start of Phase 2, before any SwiftUI app work, as a contract between the native module and the RN sync layer. Phase 5 (RN sync layer) adds the canary assertion in `markReviewed`.

---

### Pitfall 3: Wrong WCSession transfer API for the use case

**What goes wrong:**
Using `sendMessage` to deliver review results from watch to phone fails silently when the phone is out of range or the iOS app is not in the foreground. The developer tests on a desk where phone and watch are centimeters apart, everything works, then real-world users lose review data.

**Why it happens:**
`sendMessage(_:replyHandler:errorHandler:)` requires `session.isReachable == true`, which requires the phone to be awake and the iOS app to be in the foreground (or in the immediate vicinity and the background mode entitlement to be active). For a micro-repetition app worn during commutes, the phone is often locked or out of Bluetooth range.

The three APIs have fundamentally different delivery semantics:

| API | Requires reachable | Delivery guarantee | Coalesces |
|-----|--------------------|--------------------|-----------|
| `sendMessage` | YES (both foreground) | None if unreachable | No |
| `transferUserInfo` | No | FIFO queue, eventual | No |
| `updateApplicationContext` | No | Latest-only delivery | YES — overwrites previous |

Using `updateApplicationContext` for review results means if the user does 5 reviews before the phone syncs, only the last context arrives. The first 4 reviews are silently lost.

**How to avoid:**

1. **Watch→Phone review results: use `transferUserInfo`.** It queues FIFO and delivers eventually when connectivity is restored. Each review is a separate enqueue call with its own `{phrase, gotCorrect, reviewedAt}` dictionary.

2. **Phone→Watch card batch: use `updateApplicationContext` or App Group shared storage.** The watch only needs the current batch of due items; if the phone sends an updated batch, only the latest matters. `updateApplicationContext` is correct here.

3. **Activate WCSession on both sides at app launch, not lazily.** Session activation is async; if you activate on the first message send, there is a race between activation completing and the transfer call. Activate in `applicationDidFinishLaunching` / `WKApplicationDelegate.applicationDidFinishLaunching`.

4. **Check `session.activationState == .activated` before any transfer call.** If not activated, queue the payload locally and flush when `sessionDidBecomeActive` fires.

5. **Do not use `sendMessage` for anything that must survive backgrounding.** Reserve it only for real-time ping-acknowledgment patterns (e.g., "is phone alive?" heartbeat).

**Warning signs:**
- Reviews disappear when phone is in pocket during a test walk.
- `errorHandler` on `sendMessage` fires with `WCErrorCodeNotReachable`.
- Transfer queue grows unboundedly in `session.outstandingUserInfoTransfers`.

**Phase to address:** Phase 2 — Native WCSession module. The correct API selection must be locked in the module design before any Swift code is written for the watch side.

---

### Pitfall 4: Offline double-review corrupts SM-2 state

**What goes wrong:**
User reviews card X on the watch (offline). Before syncing, user opens the phone app and reviews the same card X again. Both reviews arrive at `markReviewed`. If applied in arbitrary order, the SM-2 interval calculation runs twice from the same base state — producing a doubled-interval or a reset-to-zero depending on the `gotCorrect` values. The SRS schedule becomes permanently wrong for that card without any error.

**Why it happens:**
`active_recall.ts` `markReviewed` mutates state in-place from the current value. It has no concept of `reviewedAt` timestamps or idempotency keys. Applying it twice with the same inputs doubles the interval calculation.

**How to avoid:**

1. **Last-write-wins by `reviewedAt` timestamp.** The RN sync layer (Phase 5) must compare the incoming watch review's `reviewedAt` against the current `item.lastReviewedAt` before calling `markReviewed`. If `reviewedAt <= item.lastReviewedAt`, discard the incoming review as already superseded. This is the minimal correct policy for a two-device SRS.

2. **Include `reviewedAt` in every review payload from the watch.** Use ISO 8601 string (JSON-safe, plist-safe). On the Swift side: `ISO8601DateFormatter().string(from: Date())` at the moment the user swipes.

3. **Clock skew tolerance.** Watch and phone clocks can diverge by a few seconds. Use a tolerance window of 5 seconds when comparing: if `|watchReviewedAt - phoneReviewedAt| < 5s`, treat as the same review event and take the `gotCorrect` from the watch (the more intentional action).

4. **Idempotency key.** Generate a UUID on the watch at review time and include it in the payload: `{phrase, gotCorrect, reviewedAt, reviewId: UUID}`. In the RN sync layer, keep a `Set<reviewId>` of recently applied reviews (last 200, TTL 24h in AsyncStorage). On receipt, check `Set.has(reviewId)` before calling `markReviewed`. This prevents the "delivered twice by WCSession" scenario (see Pitfall 3 — `transferUserInfo` can theoretically re-deliver under session reset conditions).

**Warning signs:**
- Cards that were reviewed correctly on watch reappear as due immediately on phone.
- SM-2 interval for a card is 2x or 0.5x the expected value after a sync.
- Same `phrase` appears twice in `session.outstandingUserInfoTransfers`.

**Phase to address:** Phase 5 — RN sync layer. The `reviewId` UUID must be generated in Phase 3 (watchOS SwiftUI app, at swipe time) and included in the Phase 2 payload schema.

---

### Pitfall 5: App Group entitlements provisioning hell

**What goes wrong:**
`UserDefaults(suiteName: "group.com.yourapp.shared")` returns `nil` or an empty container on a real device. The watch reads stale or empty card data. The complication shows 0 due items. Everything works in the simulator.

**Why it happens — three independent failure modes:**

1. **App Group not registered for the watch extension bundle ID.** The App Group must be enabled for three distinct bundle IDs: the host app (`com.yourapp`), the watch app (`com.yourapp.watchkitapp`), and the watch extension (`com.yourapp.watchkitapp.watchkitextension`). Registering it for the host app only is the most common mistake. Simulator checks are lenient; device builds enforce entitlements strictly.

2. **EAS Build provisioning profile cache.** EAS Build has a documented server-side caching bug (issue #40851) where an outdated provisioning profile that lacks the App Group capability is reused even after the developer deletes and regenerates credentials. The build succeeds but the signed binary lacks the entitlement. Symptom: `unzip -l app.ipa | xargs codesign -d --entitlements - | grep group` shows no App Group in the extension's entitlements.

3. **EAS CLI watch target provisioning gap.** As of mid-2025 (issue #2578), EAS CLI does not automatically generate provisioning profiles for the watch app target. The build may fail with "No profiles for 'com.yourapp.watchkitapp' were found," or may silently use a wrong profile. Workaround: declare the watch extension in `extra.eas.build.experimental.ios.appExtensions` in `app.json` so EAS CLI knows to provision it.

**How to avoid:**

1. In the config plugin, add the App Group entitlement to ALL three targets' `.entitlements` files: host app, watch app, watch extension. Use `withEntitlementsPlist` in the plugin, not manual file editing.

2. Add to `app.json`:
   ```json
   "extra": {
     "eas": {
       "build": {
         "experimental": {
           "ios": {
             "appExtensions": [
               { "targetName": "YourWatchApp", "bundleIdentifier": "com.yourapp.watchkitapp" },
               { "targetName": "YourWatchExtension", "bundleIdentifier": "com.yourapp.watchkitapp.watchkitextension" }
             ]
           }
         }
       }
     }
   }
   ```

3. After each EAS Build that touches entitlements, verify with: `EXPO_DEBUG=1 eas build` and inspect the capability sync log. If the App Group is missing, run `EXPO_NO_CAPABILITY_SYNC=1 eas build` to bypass the sync and use manually configured profiles.

4. Smoke test on device (not simulator): `UserDefaults(suiteName: "group.com.yourapp.shared")?.set("ping", forKey: "test")` in the host app, then read `"test"` from the watch extension. If nil, entitlements are wrong.

**Warning signs:**
- Complication shows 0 even when items are due.
- `UserDefaults(suiteName:)` returns non-nil container but all keys return nil.
- `codesign -d --entitlements - YourApp.app/PlugIns/Watch.appex` does not list the App Group.

**Phase to address:** Phase 1 — Config plugin and entitlements setup. Entitlements must be verified on a real device before any watch UI work begins. A smoke test (`UserDefaults` ping from host to extension) is Phase 1's acceptance criterion.

---

### Pitfall 6: WatchConnectivity reliability traps — activation/session lifecycle

**What goes wrong:**
Session delegate methods (`sessionDidBecomeActive`, `didReceiveUserInfo`) are not called. Transfers queue up and never deliver. Watch restarts fix the problem temporarily.

**Why it happens:**
`WCSession.activate()` is async. The delegate method `session(_:activationDidCompleteWith:error:)` fires on a background queue. If any transfer call is made before this fires — which is common when the module is initialized lazily or in a `viewDidLoad` — the call silently queues in an intermediate state. Additionally, there is a documented watchOS bug where the activation delegate method is not called at all when activating after a session was previously deactivated; the workaround is to always activate in the app delegate's `init` or `applicationDidFinishLaunching`, not in a view controller or SwiftUI `onAppear`.

WCSession also requires the delegate to be set BEFORE calling `activate()`. Setting the delegate after calling activate is undefined behavior and commonly produces the "delegate not called" symptom.

**How to avoid:**

1. Create a singleton `WatchConnectivityManager` that sets itself as delegate and calls `WCSession.default.activate()` in its `init`. Initialize this singleton in the iOS app delegate `applicationDidFinishLaunching` and in the watch `WKApplicationDelegate.applicationDidFinishLaunching`.

2. In the Swift module, queue all outgoing transfers in a `pendingQueue: [[String: Any]]` and flush in `sessionDidBecomeActive`. Never call any transfer method until activation is confirmed.

3. On the watch side, the `WKExtensionDelegate` pattern is replaced by `WKApplicationDelegate` in watchOS 7+. Use the modern API; mixing old and new patterns causes silent failures.

4. Do not rely on WCSession in the watchOS simulator for `transferUserInfo` — it does not work. Always test connectivity features on a physical device.

**Warning signs:**
- `session.activationState` stays `.notActivated` after launch.
- `session.outstandingUserInfoTransfers.count` grows but nothing is delivered.
- Restarting the watch resolves the issue temporarily.

**Phase to address:** Phase 2 — Native WCSession module. The singleton pattern and activation-before-transfer guard must be part of the initial module design, not retrofitted.

---

## Moderate Pitfalls

### Pitfall 7: Complication update budget exhaustion

**What goes wrong:**
The complication "due items" count is stale for hours. Users see "0 due" on their watch face while the phone has 15 cards ready. Or the count never updates after the morning batch is synced.

**Why it happens:**
watchOS enforces a complication refresh budget of approximately 40–70 timeline refreshes per day (roughly one every 15–60 minutes depending on how frequently the user views the complication). Requesting refreshes at every sync event quickly exhausts this budget. Once exhausted, `CLKComplicationServer.sharedInstance().reloadTimeline(for:)` is silently rate-limited. The system resumes honoring requests after the budget resets.

Additionally, the App Group `UserDefaults` write (from the phone, via WCSession background delivery) and the complication timeline read (on the watch) are not automatically synchronized. If `reloadTimeline` is called before the `UserDefaults` write propagates across the App Group boundary, the complication reads the old count.

**How to avoid:**

1. Use `CLKComplicationServer` (or WidgetKit on watchOS 9+) to request a timeline reload at most once per sync event from the phone, and at most once per hour proactively. Do not call `reloadTimeline` on every WCSession message.

2. Use `transferCurrentComplicationUserInfo` (not `transferUserInfo`) when the phone wants to push a count update to the complication. This API has a higher-priority delivery path specifically for complication data and wakes the watch extension to update the timeline. Note: this has its own budget (approximately 50 pushes/day).

3. Accept that the complication is not realtime. Document this in the UX: the count updates within 15 minutes of a sync. Show a "last synced" timestamp if precision matters.

**Warning signs:**
- Complication count frozen for more than 2 hours.
- `CLKComplicationServer` logs rate-limit warnings.
- Budget-exhaustion error in watchOS logs.

**Phase to address:** Phase 4 — WatchKit Complication.

---

### Pitfall 8: Battery and payload size blow-outs

**What goes wrong:**
Sending a large batch of due items over WCSession saturates the radio, drains the watch battery noticeably, and may exceed the per-call payload limit, causing silent transfer failures.

**Why it happens:**
`sendMessage` and `transferUserInfo` have a documented limit of 65,536 bytes per call. `updateApplicationContext` allows 262,144 bytes. A `RecallItem` with phrase, correctAnswer, correctAnswerUK, correctAnswerES, and metadata fields can be 200–500 bytes serialized. A batch of 200 items is 40–100 KB — potentially over the `sendMessage`/`transferUserInfo` limit.

**How to avoid:**

1. Use `updateApplicationContext` (262 KB limit) for the primary card batch transfer from phone to watch.

2. Cap the batch at 50 items maximum. The watch is for micro-repetition; if the user has 200 due items, schedule the worst 50. This also keeps payload well under 25 KB, leaving headroom.

3. Strip fields not needed on the watch. The watch only needs: `phrase` (opaque ID), `displayText` (what to show on card front), `correctAnswer` (for the back in the user's locale). Remove `correctAnswerES`, metadata, Firebase IDs. Serialize with compact JSON keys or use integer field indices for the highest-volume fields.

4. For the watch→phone direction, each review is tiny: `{phrase, gotCorrect, reviewedAt, reviewId}` is approximately 150 bytes. 50 reviews = 7.5 KB, well within `transferUserInfo` limits.

**Warning signs:**
- `WCErrorCodePayloadTooLarge` error in native logs.
- Watch battery drops visibly during sync.
- Only the first N items arrive; rest are silently dropped.

**Phase to address:** Phase 3 — watchOS SwiftUI app (card display) must agree on the stripped payload schema; Phase 2 — WCSession module defines the schema and cap.

---

### Pitfall 9: watchOS app lifecycle — independent vs dependent, state loss

**What goes wrong:**
The watch app crashes or shows stale data when the iPhone is not nearby. SwiftUI `@State` resets when the watch app is backgrounded. The offline card cache is not populated because the developer assumed the phone is always in range.

**Why it happens:**
watchOS apps have aggressive lifecycle management. `WKApplicationDelegate.applicationDidEnterBackground` is called after ~5 seconds of inactivity. State held in `@State` or in-memory variables is lost on the next launch if not persisted to disk (UserDefaults or a local file). Unlike iPhone apps, there is no guaranteed background refresh window.

Additionally, if the watch app is configured as "dependent" (requires iPhone), the watch app cannot be installed without the iPhone app. If configured as "independent," it can run standalone but must declare it in `WKWatchOnly = NO` / `WKCompanionAppBundleIdentifier` correctly or App Store review will flag it.

**How to avoid:**

1. Persist the card batch to the App Group `UserDefaults` immediately on receipt from WCSession. Do not hold it only in memory. On launch, read from `UserDefaults` first, then check for a fresher context update.

2. Design the watch app to function fully offline for the card batch. If WCSession is not reachable, use the cached batch. Show a "last synced: X minutes ago" indicator rather than an error.

3. Persist review results to a local buffer (App Group `UserDefaults` keyed array) before `transferUserInfo`. If the watch is backgrounded before the transfer completes, the results survive in the buffer and are retried on next launch.

4. Use `WKApplication.shared().scheduleBackgroundRefresh(withPreferredDate:userInfo:scheduledCompletion:)` sparingly (one scheduled refresh per day is the practical limit) to proactively refresh the card batch overnight.

**Warning signs:**
- Watch shows "0 cards" after a brief wrist-down period.
- Reviews done offline do not appear in the sync queue after reconnect.
- App crashes with "nil array" when WCSession has not delivered data yet.

**Phase to address:** Phase 3 — watchOS SwiftUI app. Persistence-first design must be established in the data model, not added later.

---

### Pitfall 10: App Store review — watch app rejection for minimal functionality

**What goes wrong:**
Apple rejects the watch app update citing guideline 4.0 (minimum functionality) or guideline 2.1 (app completeness). The watch app is treated as an afterthought that merely mirrors phone content.

**Why it happens:**
Apple reviewers evaluate the watch experience independently. A watch app that simply shows a list of items readable on the phone, with no watch-specific interaction, is flagged as not providing genuine value on the wrist. The Phraseman watch app is at moderate risk because reviewers may not understand SRS micro-repetition without explanation.

**How to avoid:**

1. Write a detailed App Review notes field explaining the use case: "Users review language flashcards in 5-second micro-sessions during commutes and pauses without taking out their phone. The watch provides offline card access and tactile swipe-based review that is not possible on the phone form factor."

2. Ensure the watch app demonstrates standalone value: it must work without a phone in range (cached cards), and must provide the primary swipe interaction (not just display a list).

3. Do not ship a watch app that requires the phone to be in range for every interaction. Reviewers test offline scenarios.

4. The complication adds standalone value: glancing at the wrist to see "7 cards due" without unlocking the phone is a watch-native behavior that reviewers expect.

**Warning signs:**
- Review notes field is empty.
- Watch app has no offline functionality (all data fetched live from phone).
- Watch app UI is a pixel-perfect clone of the phone flashcard screen without wrist-optimized layout.

**Phase to address:** Phase 4 — Complication (makes the standalone value case). Phase 3 — watchOS SwiftUI app must implement offline cache before submission.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Manual `ios/` edits instead of config plugin | Faster Phase 1 | Wiped on every `prebuild --clean`; breaks EAS Build | Never |
| Storing only in-memory review queue on watch | Simpler code | Reviews lost on background/crash before sync | Never |
| Using `sendMessage` for all transfers | Simpler API surface | Review data lost whenever phone is out of range | Never |
| Sending full `RecallItem` without stripping fields | No mapping layer needed | Payload over WCSession size limit; extra battery drain | Acceptable only if item count is always < 30 |
| Skipping `reviewId` idempotency key | Simpler payload | Duplicate reviews silently corrupt SM-2 state | Never |
| Complication reads directly from WCSession context | No App Group needed | Complication cannot update without active session | Never |
| Single provisioning profile for all targets | Simpler EAS config | Build fails; App Group entitlement missing in watch extension | Never |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| `@bacons/apple-targets` | Assuming the plugin handles watch wiring correctly out of the box | Apply patch-package fix for issue #175; verify with `xcodebuild -list` after every prebuild |
| WCSession `transferUserInfo` | Testing only in Simulator | `transferUserInfo` does not work in Simulator; always use physical devices for connectivity tests |
| App Group `UserDefaults` | Using the same `UserDefaults` suite name string in prod and dev builds | Use the App Group ID from the entitlement (`group.$(PRODUCT_BUNDLE_IDENTIFIER).shared`), not a hardcoded string |
| EAS Build capability sync | Assuming EAS auto-provisions watch extension App Group | Explicitly declare all watch targets in `appExtensions`; verify entitlements post-build with `codesign` |
| `active_recall.ts` `markReviewed` | Calling it without verifying the phrase key survived the round-trip | Run the round-trip test on 20+ representative phrases before integrating with SwiftUI app |
| `CLKComplicationServer.reloadTimeline` | Calling on every sync event | Rate-limit to once per sync event; use `transferCurrentComplicationUserInfo` for phone-pushed updates |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sending full card batch on every WCSession message | Watch battery drain, transfer errors | Diff the batch before sending; only send when due items change | > 30 items in batch |
| Holding card array in SwiftUI `@State` only | Cards disappear after 5s background | Persist to App Group UserDefaults on write | Every backgrounding event |
| Polling `getDueItems()` on a timer in RN to detect watch sync | CPU wake every N seconds | Use an event-driven model: native module emits `onReviewReceived` event | Always |
| Large `reviewId` set in AsyncStorage | Slow startup parse | Cap at 500 entries, TTL 48h, use a ring buffer | > 1000 entries |

---

## "Looks Done But Isn't" Checklist

- [ ] **Prebuild survival:** Run `expo prebuild --clean` followed by `xcodebuild -list` and verify watch target is present — not just that the app compiles in Xcode with the `ios/` directory already there.
- [ ] **Phrase key round-trip:** The round-trip test runs in CI, not just locally. Covers phrases with: spaces, apostrophes, Cyrillic, multi-word, 60+ character length.
- [ ] **Offline review persistence:** Kill the watch app mid-session (force-quit), relaunch, and verify the review buffer survives and syncs on reconnect.
- [ ] **App Group on device:** Test `UserDefaults(suiteName:)` exchange on a physical device, not Simulator, with a distribution-signed build.
- [ ] **EAS Build entitlements:** After the first EAS production build, `unzip -l .ipa` and `codesign -d --entitlements` on both the main app and watch extension to confirm App Group appears in both.
- [ ] **WCSession transfer API:** Confirm no `sendMessage` calls are used in the watch→phone review upload path.
- [ ] **Complication update:** Put phone in airplane mode, review 5 cards on watch, re-enable WiFi, wait 10 minutes, verify complication count updates.
- [ ] **Canary assertion fires:** Introduce a deliberate mutation (add a space to phrase) in the Swift layer, confirm the `markReviewed` canary log appears in Metro logs.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Prebuild wiped watch target | MEDIUM | Re-create plugin as idempotent, run `prebuild --clean`, verify; lost time is the patch-package setup |
| Phrase key mutation discovered post-launch | HIGH | Requires a migration: scan all `RecallItems`, find items with near-match keys (Levenshtein distance 1), prompt user to confirm mapping; cannot be automated safely |
| SM-2 state corrupted by double-review | MEDIUM | Reset affected items to `{interval: 1, easeFactor: 2.5}` (fresh start); cannot reconstruct correct state without a review log |
| EAS Build missing App Group entitlement | LOW | Re-run `eas build` with `--clear-cache` flag; re-register App Group in Apple Developer Portal for all bundle IDs; verify with codesign |
| Complication stale indefinitely | LOW | Force-quit watch app, reopen — triggers timeline reload; permanent fix is switching to `transferCurrentComplicationUserInfo` |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Prebuild wipes watch target | Phase 1: Config plugin | `xcodebuild -list` after `prebuild --clean` in CI |
| Phrase key round-trip mutation | Phase 2: WCSession module (test); Phase 5: RN sync (canary) | Round-trip test green in CI; canary never fires in QA |
| Wrong WCSession transfer API | Phase 2: WCSession module | Code review: grep for `sendMessage` in watch→phone path |
| Double-review SM-2 corruption | Phase 5: RN sync layer | Integration test: two concurrent reviews of same card → single markReviewed call |
| App Group entitlements | Phase 1: Config plugin + entitlements | Physical device smoke test; codesign entitlement dump |
| Complication budget exhaustion | Phase 4: Complication | Monitor complication refresh logs under 24h test; count must stay < 40 |
| WCSession activation lifecycle | Phase 2: WCSession module | Session activates within 3s of app launch on cold start |
| Offline state loss on watch | Phase 3: watchOS SwiftUI app | Background/foreground cycle test; cards persist |
| Payload too large | Phase 2: WCSession module (schema cap at 50 items) | Unit test: 50-item batch serialized size < 200 KB |
| App Store rejection | Phase 3 + 4 (offline + complication) | Review notes written; offline mode tested before submission |

---

## Sources

- [expo-apple-targets Issue #175: incorrect Watch embed/dependency wiring](https://github.com/EvanBacon/expo-apple-targets/issues/175)
- [EAS Build Issue #40851: cached provisioning profile without App Groups](https://github.com/expo/expo/issues/40851)
- [EAS CLI Issue #2578: setting provisioning profile on Apple Watch Target](https://github.com/expo/eas-cli/issues/2578)
- [Three Ways to communicate via WatchConnectivity — alexanderweiss.dev](https://alexanderweiss.dev/blog/2023-01-18-three-ways-to-communicate-via-watchconnectivity)
- [Size Limits for WatchConnectivity data transfers — blog.martinp7r.com](https://blog.martinp7r.com/posts/size-limits-for-watchconnectivity-data-transfers/)
- [WCSession Apple Developer Documentation](https://developer.apple.com/documentation/watchconnectivity/wcsession)
- [Keeping your complications up to date — Apple Developer Documentation](https://developer.apple.com/documentation/clockkit/keeping-your-complications-up-to-date)
- [WCSession has not been activated — Apple Developer Forums](https://developer.apple.com/forums/thread/666484)
- [Workaround for WCSession activation delegate bug — Apple Developer Forums](https://developer.apple.com/forums/thread/19635)
- [iOS capabilities — Expo Documentation](https://docs.expo.dev/build-reference/ios-capabilities/)
- [expo-apple-targets README](https://github.com/EvanBacon/expo-apple-targets/blob/main/packages/apple-targets/README.md)
- [Design Notes 21: Byte Compression for Watch Connectivity — david-smith.org](https://www.david-smith.org/blog/2023/02/03/design-notes-21/)
- [expo-watch-connectivity (community module)](https://github.com/ixacik/expo-watch-connectivity)
- [WatchOS App Review Rejected for UI — Apple Developer Forums](https://developer.apple.com/forums/thread/734083)

---

*Pitfalls research for: watchOS companion to Expo/RN + SRS (Phraseman v1.1)*
*Researched: 2026-06-07*
