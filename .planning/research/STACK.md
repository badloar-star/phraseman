# Stack Research

**Domain:** Native watchOS companion embedded in an Expo (CNG) React Native iOS app, bidirectional phone↔watch sync
**Researched:** 2026-06-07
**Confidence:** HIGH (versions verified via npm + official Apple docs; one architectural correction flagged below)

## TL;DR Recommendation

1. **Add the watchOS target via `@bacons/apple-targets@4.0.7`** (Evan Bacon's official-grade Expo config plugin). It generates the watch + complication Xcode targets from `targets/*/expo-target.config.js` during `prebuild` and keeps Swift source OUTSIDE `/ios`, so `expo prebuild --clean` never wipes it. This is the only option that is *designed* to survive CNG.
2. **Bridge phone↔watch via `react-native-watch-connectivity@2.0.0`** (RN 0.76+/New-Arch rewrite, released Mar 2026). For the offline-batch use case use **`updateApplicationContext`** (phone→watch: latest due-batch only, survives out-of-range) + **`transferUserInfo`** (watch→phone: queued, guaranteed delivery of every swipe). Do NOT use `sendMessage` as the primary transport — it requires live reachability.
3. **Complication = WidgetKit** (watchOS 9+ `accessoryCircular`/`accessoryCorner`), NOT ClockKit (deprecated since watchOS 9, 2022).
4. **App Group is for watch-app ↔ watch-complication ONLY.** CRITICAL CORRECTION: an App Group does **not** share data between the iPhone app and the Watch app — they run on separate devices/file systems. Phone↔watch data is WatchConnectivity. The complication reads the App Group that the *watch app* writes. The existing `group.app.phraseman.widget` (phone↔iOS-WidgetKit) is a separate concern and a separate group.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@bacons/apple-targets` | **4.0.7** (npm, 2026-05-13) | Expo config plugin that injects `watch` + `watch-widget` Xcode targets during `prebuild`; links Swift source from `targets/` so it persists across CNG regeneration | Only approach purpose-built to survive `expo prebuild --clean`. Source lives outside `/ios`; the plugin re-links it every prebuild. Actively maintained (1.3k★, releases through May 2026). Requires Expo SDK ≥53 — project is on **SDK 54** ✓ |
| `react-native-watch-connectivity` | **2.0.0** (npm, 2026-03-20) | JS/TS wrapper over `WCSession` for phone↔watch messaging | v2 is a New-Architecture (Fabric/TurboModule) rewrite released Mar 2026; requires **RN ≥0.76** — project is on **RN 0.81.5** ✓. Mature (since 2017, 41 releases). Exposes the full WCSession surface (`updateApplicationContext`, `transferUserInfo`, `sendMessage`, file transfer, reachability). The Swift watch side is hand-written (which we want anyway). |
| WatchConnectivity (`WCSession`) | iOS 13.4+ / watchOS | Apple framework: the actual transport | Only OS-sanctioned phone↔watch channel. No third-party transport exists. |
| WidgetKit (watchOS) | watchOS 9+ (`accessory*` families) | Renders the "due count" complication on the watch face | ClockKit deprecated since watchOS 9 (2022). WidgetKit complications are SwiftUI, also surface in the Smart Stack (watchOS 10+). |
| SwiftUI | Xcode 16+ | The entire watch app UI (card stack, swipe) | React Native does **not** run on watchOS — the watch app is pure Swift/SwiftUI. Non-negotiable. |
| App Group + `UserDefaults(suiteName:)` | n/a | Shares the due-count snapshot between the **watch app** and its **complication** (both on-watch) | Same mechanism as existing `modules/phrase-widget`, but a *new, separate* group for the watch side (see App Groups section). |

### Supporting Libraries / Modules

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-modules-core` | (bundled with SDK 54) | Underpins the existing `modules/phrase-widget` Expo Module pattern | Reuse this if you choose to wrap WatchConnectivity yourself instead of `react-native-watch-connectivity` (fallback path). Already a dependency. |
| `@bacons/apple-targets` `ExtensionStorage` | (part of 4.0.7) | Optional JS helper to write App Group `UserDefaults` from RN | NOT needed for phone↔watch (that's WCSession). Only relevant if you later want RN to write a watch-readable group, which is impossible cross-device — skip. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Xcode 16+ (macOS 15 Sequoia) | Build/run the watch target, SwiftUI previews | Required by `@bacons/apple-targets@4.0.7`. Mac+Xcode confirmed available. |
| CocoaPods ≥1.16.2 (ruby 3.2.0) | Pod install after prebuild | Hard requirement of `@bacons/apple-targets@4.0.7`. |
| `npx create-target watch` / `watch-widget` | Scaffolds `targets/watch/` and `targets/watch-widget/` with `expo-target.config.js` + Swift entry | Run once; commit the `targets/` dir. |
| EAS Build (production/preview/dev profiles) | CI builds including the watch target | Watch target builds with the iOS app once the plugin is wired; no profile changes needed beyond a clean prebuild. |

## Installation

```bash
# Core: watch target generator + WatchConnectivity bridge
npm install @bacons/apple-targets@^4.0.7 react-native-watch-connectivity@^2.0.0

# Scaffold the watch app + complication targets (run once)
npx create-target watch
npx create-target watch-widget

# Regenerate native projects (watch target is injected here)
npx expo prebuild -p ios --clean
cd ios && pod install
xed .   # build the watch scheme against a paired watchOS simulator
```

`app.config.js` plugin wiring (add `@bacons/apple-targets` to `plugins`):

```js
plugins: [
  // ...existing plugins...
  ["@bacons/apple-targets", { appleTeamId: "<TEAM_ID>" }],
],
```

## Phone↔Watch Transport: API Selection (maps to offline-batch use case)

| WCSession API | Direction we use it | Offline behavior | Verdict for Phraseman |
|---------------|--------------------|------------------|-----------------------|
| **`updateApplicationContext`** | **phone → watch** (push the due-`RecallItem` batch) | Queued as a SINGLE latest-value slot; overwritten by newer batches; delivered in background when watch reconnects | **PRIMARY for the batch.** We only ever care about the *current* due set — last-write-wins fits perfectly. |
| **`transferUserInfo`** | **watch → phone** (return each `{phrase, gotCorrect, reviewedAt}` swipe) | FIFO queue; **every** item guaranteed to deliver, in order, even after long out-of-range periods | **PRIMARY for swipe results.** We must not lose any swipe; queued + guaranteed is exactly right. |
| `sendMessage` | — | Requires `isReachable == true` (both apps live/foreground-ish) | **AVOID as primary.** Use only as an optional "instant refresh while both open" optimization. The watch will frequently be out of range — relying on it loses data. |
| `transferFile` | — | Queued, for large blobs | Not needed; due batches are small JSON. Only consider if a batch ever exceeds the ~262 KB application-context dictionary limit (unlikely for flashcards). |

Rationale: the milestone explicitly wants "офлайн-кэш вне зоны iPhone" and a guaranteed round-trip of the opaque `phrase` key. `updateApplicationContext` (down) + `transferUserInfo` (up) is the canonical Apple pattern for "always know the latest state going down, never drop an event coming up."

> CRITICAL INVARIANT support: WCSession dictionaries pass strings through verbatim — the opaque `phrase` id round-trips phone→watch→phone unchanged as long as it is sent as a plain string value. The watch never normalizes it.

## App Group Shared Storage — CORRECTED MODEL

| Concern | Mechanism | Group identifier |
|---------|-----------|------------------|
| iPhone app → iOS home/lock-screen WidgetKit widget | `UserDefaults(suiteName:)` (existing `PhraseWidgetModule.swift`) | `group.app.phraseman.widget` (EXISTING — do not reuse for watch) |
| **Watch app → Watch complication** (due-count number) | `UserDefaults(suiteName:)` — same code shape, different device | **NEW group, e.g. `group.app.phraseman.watch`** |
| iPhone app → Watch app | ❌ **NOT possible via App Group** | Use WatchConnectivity instead |

This is the single biggest correction to the original assumption. App Groups are per-device containers; the iPhone and the Watch are different devices, so the existing `group.app.phraseman.widget` cannot carry data to the watch. The watch app receives the due batch over `updateApplicationContext`, writes the due **count** into its *own* App Group (`group.app.phraseman.watch`), and the WidgetKit complication reads that group and calls `WidgetCenter.shared.reloadAllTimelines()`. Both the **watch app target AND the watch-widget (complication) target must enable the same App Group capability** — a common gotcha (complication shows 0/stale if only one target has it).

The pattern still mirrors `modules/phrase-widget` conceptually: one writer (the watch app), read-only consumer (the complication), JSON snapshot with `schemaVersion`.

## Complication: WidgetKit, not ClockKit

- **Use WidgetKit** with `accessoryCircular` (or `accessoryCorner`) widget family for a single due-count number. Target type in `@bacons/apple-targets` is `watch-widget`.
- ClockKit is **deprecated since watchOS 9 (2022)**; do not write new ClockKit code.
- Update budget: WidgetKit allows ~40–75 timeline reloads/day. A due-count that changes on each sync is well within budget; drive reloads from `WidgetCenter.shared.reloadAllTimelines()` after the watch writes a new count.

## Provisioning (Apple Developer portal)

Add the following **before** the first signed build:

| Item | What to create | Notes |
|------|----------------|-------|
| Watch app App ID | New bundle ID `app.phraseman.watchkitapp` (child of `app.phraseman`) | watchOS apps use the `<host>.watchkitapp` convention; `@bacons/apple-targets` derives this. |
| Complication App ID | New bundle ID `app.phraseman.watchkitapp.complication` (or similar) | Separate extension target = separate App ID. |
| App Groups capability | Register `group.app.phraseman.watch`; enable on **iPhone app is NOT required**, but **enable on the Watch app App ID AND the complication App ID** | Distinct from the existing widget group. |
| WatchConnectivity | No special entitlement | Works once a watch app is paired; no portal capability toggle needed. |
| Provisioning profiles | New profiles for the two new App IDs | EAS-managed credentials can generate these; verify the App Group is attached to each. |

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@bacons/apple-targets` | (b) Hand-written custom config plugin that mutates `project.pbxproj` to inject the watch target during prebuild | Only if you need behavior the plugin can't express, or want zero new deps. Far higher maintenance — you re-implement pbxproj target injection, entitlements, and build-phase wiring that the plugin already solves. Brittle across Xcode/Expo bumps. |
| `@bacons/apple-targets` | (c) Bare/prebuild + manual Xcode target | Works, but the target is **wiped by `expo prebuild --clean`** because it lives in the regenerated `/ios`. Acceptable only if you commit `/ios` and abandon CNG — which contradicts the project's `prebuild` workflow. Not recommended. |
| `react-native-watch-connectivity@2.0.0` | Self-written Expo Module (Swift) wrapping `WCSession`, mirroring `modules/phrase-widget` | Choose this if you want zero third-party transport deps and full control, reusing the team's proven Expo Module pattern. Costs you re-implementing reachability, queued transfers, and event plumbing the library already ships. Good *fallback*; library is the faster path. |
| `react-native-watch-connectivity` | `expo-watch-connectivity` (ixacik) | **Avoid:** last published v0.1.8 in **Feb 2025**, 0.x experimental, low adoption. |
| `react-native-watch-connectivity` | `@duell10111/react-native-watch-connectivity` (fork) | Only if upstream stalls; it advertised auto-generated watch target, but upstream v2 (2026) is now the maintained line. |
| WidgetKit complication | ClockKit | Never for new work — deprecated 2022. Only for maintaining a pre-watchOS-9 codebase (N/A here). |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Manual Xcode watch target without a config plugin | Erased by `expo prebuild --clean`; breaks the project's CNG workflow | `@bacons/apple-targets` (`targets/` survives prebuild) |
| App Group to move data iPhone↔Watch | Different devices = different containers; silently never syncs | `WCSession` (`updateApplicationContext` + `transferUserInfo`) |
| `sendMessage` as the sync backbone | Needs both apps reachable/live; drops data when watch is out of range | `updateApplicationContext` (down) + `transferUserInfo` (up) |
| ClockKit complications | Deprecated since watchOS 9 (2022) | WidgetKit `accessory*` widget |
| `expo-watch-connectivity@0.1.x` | Experimental, last release Feb 2025, low adoption | `react-native-watch-connectivity@2.0.0` |
| Reusing `group.app.phraseman.widget` for the watch | It's the iPhone↔iOS-widget group; the complication needs the watch's own group | New `group.app.phraseman.watch` on watch app + complication targets |
| Trying to run RN/JS on the watch | React Native does not support watchOS | Pure SwiftUI on the watch; SM-2 logic stays in RN on the phone |

## Stack Patterns by Variant

**If you want minimum new third-party deps / maximum control:**
- Keep `@bacons/apple-targets` for the target (no realistic alternative), but **write a Swift Expo Module** wrapping `WCSession` that mirrors `modules/phrase-widget`'s facade (RN-as-writer for the down-batch, native-emits-events for the up-swipes).
- Because: reuses a pattern the team already ships and trusts; one fewer external maintenance dependency.

**If you want fastest path to working sync (recommended):**
- Use `react-native-watch-connectivity@2.0.0` for the transport and `@bacons/apple-targets` for the targets.
- Because: the library already implements queued transfers, reachability, and event plumbing on RN 0.81's New Architecture.

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@bacons/apple-targets@4.0.7` | Expo SDK ≥53, Xcode 16, CocoaPods ≥1.16.2, ruby 3.2.0 | Project is Expo **SDK 54** ✓ — within range. Xcode/CocoaPods must meet minimums on the Mac. |
| `react-native-watch-connectivity@2.0.0` | React Native ≥0.76 (New Architecture), iOS 13.4+ | Project is RN **0.81.5** ✓. v2 assumes New Arch — confirm the app has New Arch enabled (RN 0.81 default-on); if the app pinned old-arch, validate the TurboModule loads or pin `@1.1.0`. **RN-version sensitive — flag for phase research.** |
| WidgetKit complications | watchOS 9+ | Set `deploymentTarget: "9.0"` (or higher) in `targets/watch/expo-target.config.js`. |
| `expo-target.config.js` App Group | Watch app target + complication target | Both targets must declare the same `com.apple.security.application-groups`. |

## Open Questions / Flags for Phase Research

- **New Architecture:** confirm whether the app runs RN 0.81 New Architecture on. `react-native-watch-connectivity@2.0.0` targets it; if old-arch is forced anywhere, validate or pin v1.1.0. (RN/Expo-SDK sensitive.)
- **Existing iOS widget target wiring:** the repo has NO `targets/` dir, no `@bacons/apple-targets` in `package.json`, and no widget plugin in `app.config.js`, yet `PhraseWidgetModule.swift` writes a WidgetKit App Group. Confirm how the *current* iOS WidgetKit extension is added (manual post-prebuild? not yet shipped on iOS?). Adopting `@bacons/apple-targets` for the watch is a clean opportunity to bring the iOS widget extension under the same prebuild-surviving mechanism.
- **App Group provisioning automation:** verify EAS-managed credentials attach `group.app.phraseman.watch` to both new App IDs, or do it manually in the portal.

## Sources

- npm registry (`npm view`) — `@bacons/apple-targets@4.0.7` (2026-05-13), `react-native-watch-connectivity@2.0.0` (2026-03-20), `expo-watch-connectivity@0.1.8` (2025-02-16) — HIGH (authoritative version + date data)
- github.com/EvanBacon/expo-apple-targets (README + watch-apps guide) — watch/watch-widget target types, CNG survival, App Group config, Expo SDK ≥53 / Xcode 16 / CocoaPods ≥1.16.2 reqs — HIGH
- github.com/watch-connectivity/react-native-watch-connectivity — RN 0.76+, iOS 13.4+, New-Arch v2, WCSession API surface — HIGH
- developer.apple.com WidgetKit "Migrating ClockKit complications" + WWDC22 "Go further with Complications in WidgetKit" — ClockKit deprecated watchOS 9, WidgetKit is the path, ~40–75 reloads/day — HIGH
- Apple Developer Forums + Kodeco/Teabyte (WatchConnectivity) — `updateApplicationContext` (latest-only, overwrite) vs `transferUserInfo` (FIFO, guaranteed) semantics; App Group does not bridge iPhone↔Watch across devices — MEDIUM (community + tutorial, consistent across multiple sources, aligns with Apple framework docs)
- Local repo: `modules/phrase-widget/ios/PhraseWidgetModule.swift`, `modules/phrase-widget/constants.ts`, `app/widget_bridge.ts`, `package.json` (Expo 54, RN 0.81.5), `app.config.js`/`app.json` — confirmed existing App Group `group.app.phraseman.widget`, RN-sole-writer pattern, no current apple-targets/watch deps — HIGH

---
*Stack research for: watchOS micro-repetition companion on Expo CNG iOS app*
*Researched: 2026-06-07*
