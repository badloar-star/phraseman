# Daily Phrase Widget — build & verify

Native home-screen / lock-screen widget showing the "phrase of the day".
iOS = WidgetKit (SwiftUI), Android = Glance (Compose). RN writes the snapshot;
native only reads it.

## Architecture

```
DailyPhraseCard / app start
   -> syncWidgetData()                (app/widget_bridge.ts)
   -> PhraseWidget.setData(payload)   (modules/phrase-widget — Expo Module)
        iOS:     App Group UserDefaults  group.app.phraseman.widget
        Android: SharedPreferences        app.phraseman.widget
   -> native widget reads snapshot and renders
   <- tap: phraseman://phrase/<id>[?play=1]
        -> +native-intent.tsx -> /home?openPhrase=<id>[&play=1]
        -> DailyPhraseCard opens details (+ speaks on ?play=1, on-device expo-speech)
```

Shared identifiers (must match across JS + both native sides):
`modules/phrase-widget/constants.ts`.

## Files

| Area | Path |
|------|------|
| RN bridge | `app/widget_bridge.ts` |
| Module facade | `modules/phrase-widget/index.ts`, `constants.ts`, `expo-module.config.json` |
| iOS native bridge | `modules/phrase-widget/ios/PhraseWidgetModule.swift` |
| iOS widget extension | `targets/widget/*` (@bacons/apple-targets) |
| Android native bridge | `modules/phrase-widget/android/.../PhraseWidgetModule.kt` |
| Android widget | `.../PhraseGlanceWidget.kt`, `PhraseWidgetReceiver.kt`, `res/**` |
| iOS plugin | `@bacons/apple-targets` (app.json) + `ios.entitlements` (app.json) |
| Android plugin | `plugins/withAndroidDailyPhraseWidget.js` (app.json) |
| Deep link | `app/+native-intent.tsx` (`phrase/<id>` branch) |
| Play button + auto-play | `components/DailyPhraseCard.tsx` |

## Build steps (run on YOUR isolated Metro port + AVD — do not touch 8081)

1. Install the new dep:
   ```
   npm install
   ```
2. Prebuild (regenerates native projects incl. the widget target + entitlements):
   ```
   npx expo prebuild --clean
   ```
3. iOS (needs macOS/Xcode): build to a device/simulator, then long-press home
   screen → add the **Фраза дня** widget. Lock-screen: add the rectangular
   accessory widget (iOS 16+).
4. Android: `npx expo run:android --port <YOUR_PORT>`, then long-press home
   screen → Widgets → Phraseman.

## Verify

- Open the app once so `syncWidgetData()` writes a snapshot.
- Add the widget; it should show today's English phrase + meaning (+ transcription on medium).
- Tap the widget → app opens on home with the phrase details sheet.
- Tap ▶ → app opens and speaks the phrase (on-device).
- Next day after 00:05 local, iOS timeline refreshes to the new phrase.

## Design (2026-06-22 redesign)

Both platforms render the same lit, dimensional surface as the in-app card:
- **Diagonal 3-stop gradient** (top-leading → bottom-trailing, mid held to 56%),
  a soft **top-right accent bloom** (`theme.glow`, carried in the payload), and a
  **1px hairline border** (`theme.border`). On Android the surface is baked into a
  `Bitmap` (Glance has no gradient brush) — replaces the old flat solid fill.
- A rounded **identity chip** + an accent **kicker** colored with `theme.titleColor`
  (was `accent`, which mismatched the card).
- The **phrase is the hero** and **wraps fully — never truncated to a single
  ellipsis line**. iOS uses semantic Dynamic-Type fonts + `minimumScaleFactor`;
  Android uses generous `maxLines` so long phrases wrap instead of clipping.
- A consistent round **play chip** on medium only (iOS + Android); whole-card tap
  everywhere else. `tapHint` covers all 8 locales.
- The **lock-screen accessory** is branded (leading glyph + kicker) and allows the
  phrase 2 lines.
- A quiet **stale-day marker** (a "·" / refresh glyph by the kicker) shows when the
  snapshot's `date` ≠ today — i.e. the app has not run since midnight. Computed in
  the renderer from the payload `date` (native now reads it).
- The Android widget-picker **preview** and `widget_colors.xml` are painted in the
  real default `dark` chrome (was a purple `#7C5CFF` palette that exists in no
  theme), and the picker description is **localized** (`values-<locale>/strings.xml`).
- Native decoders **validate `schemaVersion`** (≤2) and fall back to the placeholder
  on a newer/unknown schema.

## Notes / known limits

- Audio is on-device `expo-speech`, so widgets cannot play sound directly —
  both platforms open the app and speak. (No mp3 files involved.)
- Glance/Swift code is compiled for the first time on `expo prebuild` + native
  build (no macOS/AVD in this session). Expect to resolve any version-specific
  Glance/WidgetKit API nits then; the redesign targets Glance 1.1.1 + WidgetKit
  iOS 16/17 APIs verified against the installed libs.
- iOS picker `configurationDisplayName`/`description` stay Russian (matches the
  default kicker/placeholder). Full per-locale iOS strings would need a String
  Catalog on the generated `@bacons/apple-targets` extension — a follow-up.
- Android has no periodic self-refresh (`updatePeriodMillis=0`, by design to save
  battery); freshness relies on the app calling `reloadAll` + the stale-day marker.
  A midnight `WorkManager` refresh is a possible future addition.
- Phase 3 (spaced-repetition phrase selection via `Flashcard.addedAt`,
  know/learn buttons) is not yet implemented — the widget currently mirrors the
  same "phrase of the day" the home card shows.
