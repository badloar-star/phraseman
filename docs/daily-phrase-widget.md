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

## Notes / known limits

- Audio is on-device `expo-speech`, so widgets cannot play sound directly —
  both platforms open the app and speak. (No mp3 files involved.)
- Glance/Swift code was written without a local build (parallel Metro session on
  8081 blocked prebuild). First `expo prebuild` + native build is the first real
  compile; expect to resolve any version-specific Glance/WidgetKit API nits then.
- Phase 3 (spaced-repetition phrase selection via `Flashcard.addedAt`,
  know/learn buttons) is not yet implemented — the widget currently mirrors the
  same "phrase of the day" the home card shows.
