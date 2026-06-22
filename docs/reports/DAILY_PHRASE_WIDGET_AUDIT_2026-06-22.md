# Daily-Phrase Widget — Audit & Design Review (2026-06-22)

Scope: the native home-screen / lock-screen **"phrase of the day"** widget — iOS WidgetKit
(`targets/widget/*`) + Android Glance (`modules/phrase-widget/android/*`) + the RN writer
(`app/widget_bridge.ts`), measured against the in-app `DailyPhraseCard` it is meant to mirror.

Method: 4-dimension adversarial workflow (parity / design / robustness / a11y-i18n) → per-finding
adversarial verification → synthesis. 43 raw findings → **20 confirmed**. **0 P0, 0 P1, 9 P2, 8 P3**
+ advisory. No crashes, no data loss, no functional breakage — every confirmed item is parity,
fidelity, robustness, i18n or accessibility. (The `robustness` verification batch hit a transient
server rate-limit; those verdicts are partial — the stale-data items below were re-confirmed in
synthesis and by direct code read.)

Storage/transport is sound: App Group `group.app.phraseman.widget` / Android prefs `app.phraseman.widget`
/ key `phrase_of_the_day_v1` all match across JS + Swift + Kotlin. Deep-link regex `phrase/([A-Za-z0-9_-]+)`
matches the real id forms (`local-<n>` and Firestore ids). RN-sole-writer invariant holds.

---

## P2 — visible parity / fidelity / a11y gaps

1. **Android paints a flat solid color, dropping the 3-stop gradient.** `PhraseGlanceWidget.kt:77` parses
   only `gradientMid` into `base`; `gradientTop`/`gradientBottom` are decoded (`:227,229`) but never used.
   iOS and the in-app card render a 3-stop gradient → same theme looks visibly different on the highest-volume
   platform. **Fix:** render a gradient via Glance 1.1 `background(ImageProvider)` + runtime `GradientDrawable`
   (top-leading→bottom-trailing, mid held ~56%), or a static `res/drawable`.
2. **Misleading Android picker preview / `widget_colors.xml` use a purple palette in no theme.**
   `phrase_widget_preview.xml` (`#FFF7F5FF` bg) + `widget_colors.xml` (`#FF7C5CFF`) are light-purple; all 8
   themes are dark with green/gold/coral/blue/etc accents. The gallery thumbnail and the placement flash look
   like a different app. The same XML is used as **both** `previewLayout` and `initialLayout`. **Fix:** recolor
   to the default `dark` chrome; add a dedicated dark `initialLayout`; delete the dead purple resources.
3. **`transcription` is permanently empty (dead feature).** `widget_bridge.ts:144` reads it via loose cast
   `(phrase as { transcription?: string })`, but `DailyPhrase` has no such field → always `''`. The iOS
   (`PhraseWidget.swift:81-86`) and Android (`:130-137`) transcription lines are gated non-empty → never render.
   Documented at `docs/daily-phrase-widget.md:58`. **Fix:** wire the existing offline IPA generator
   `getTranscription(phrase.english)` from `app/transcription.ts`; drop the `as` cast so TS flags it. (Or remove
   the field + both branches + the doc line.)
4. **Play/listen affordance diverges by size & platform.** Android shows a `▶ {tapHint}` text pill at *every*
   size (`PhraseGlanceWidget.kt:142-164`); iOS shows a circular icon-only `play.fill` only on medium
   (`:63-70`); iOS small/lock and the in-app collapsed card have none. The code comment "no dangling button"
   (`:87-89`) contradicts the rendered pill. **Fix:** one pattern — small circular accent icon chip on iOS
   medium + Android medium only; whole-card-tap elsewhere.
5. **Neither widget renders the identity icon chip.** The card draws a 54×54 themed `phrases` chip
   (`DailyPhraseCard.tsx:428-435`); widgets render kicker only. `chipBg`/`chipBorder` decoded, chip never drawn.
   **Fix:** add a ~28–32pt rounded chip top-left (bundle a neutral glyph; widgets can't read the RN themed asset).
6. **Radial glow + hairline border dropped on both.** Card has `plaqueGlow` + 1px `chrome.border`; widgets
   render neither. `border` is in the payload (free to draw); `chrome.glow` isn't even transmitted. **Fix:** draw
   the border now; extend the theme payload with `glow` and add a blurred accent circle.
7. **iOS lock-screen accessory is unbranded.** `PhraseWidget.swift:93-104` is two `Text` lines, no kicker, no
   glyph; `.caption2` + `lineLimit(1)` truncates most meanings. **Fix:** leading SF Symbol (`text.quote`) +
   kicker, allow 2 meaning lines, verify against `AccessoryWidgetBackground`.
8. **iOS widget ignores Dynamic Type.** small/medium use fixed `.system(size:)` (`:34,44,49,65,73,78,83`); no
   `@ScaledMetric`/semantic styles. `minimumScaleFactor` only shrinks. **Fix:** semantic text styles or
   `@ScaledMetric`; verify `systemSmall` at AX5. (Lock-screen already uses semantic styles.)

## P3 — polish / robustness / latent drift

9. **No `schemaVersion` validation natively** — a future v3 snapshot renders half-decoded on an old installed
   widget. Decode it; return nil/null above the known max version. (`PhrasePayload.swift:40-54`; `:219-250` Kt.)
10. **`literal` decoded-but-unused (iOS) / not-decoded (Android)** — latent parity trap. Render on both or drop.
11. **Kicker empty-fallback locale divergence** — native fallback English vs writer/placeholder Russian
    (`ФРАЗА ДНЯ`). Effectively dead, but inconsistent. Make the two native literals match.
12. **Color-parse parity holds** — only sub-1/255 Android alpha truncation differs. No action; `roundToInt()`
    optional. If `#RGB` shorthand is ever introduced, expand it in `widget_bridge.ts` (the sides diverge on it).
13. **iOS gradient is vertical/even-stop**, ignoring the card's diagonal `[0,0.56,1]`. Use `Gradient.Stop`
    locations + `.topLeading→.bottomTrailing` (pairs with fix #1).
14. **Kicker typography differs** (card 800+tracking vs iOS `.bold` vs Android `Medium` 10sp). Standardize at
    11pt heavy; iOS `.tracking(0.6)`.
15. **Android Listen pill is faint** — `chipBg` ~13–15% alpha over the solid base. Raise to ~0.18–0.22.
16. **`titleColor`/`border`/`chipBorder` decoded but unused → kicker color drifts from the card** (widget kicker
    uses `accent`, card uses `chrome.title`). Color the kicker with `titleColor`; draw `border`; or drop the fields.
17. **Picker description: Android hardcoded English, iOS hardcoded Russian**, no per-locale translations. Add
    `values-<locale>/strings.xml` for the 8 locales; move iOS to a String Catalog.
18. *(advisory)* **Phrase under-scaled vs the card** (18–23pt vs card hero `max(25, f.h2)` weight 900). Bump to
    ~24–26pt heavy with `minimumScaleFactor`.

### Robustness (re-confirmed in synthesis; verification batch was rate-limited)
- **No stale-day signal.** `updatedAt`/`date` are written but never read natively. iOS refreshes after next
  local midnight, but if the app never runs the snapshot is never rewritten → today's widget silently shows
  yesterday's phrase. **Android has no midnight self-refresh at all** (`updatePeriodMillis=0`, relies solely on
  `reloadAll`). **Fix:** compare snapshot day vs current day in the renderer; when stale, dim slightly / show a
  small dot next to the kicker + "Open to refresh"; wire an Android midnight `WorkManager` refresh.
- `tapHint()` covers only 4 locales (`PhraseGlanceWidget.kt:169-174`); vi/id/tr/pl/pt-BR fall through to English
  "Listen" — and `pt-BR` "FRASE" collides with Spanish "Escuchar". Extend to all 8 or match full kicker strings.

---

## Design direction — modernize to a premium 2024 card extension

1. **Gradient + depth parity, define-once.** A single shared "lit surface" spec: diagonal 3-stop gradient
   (locations `[0,0.56,1]`, top-leading→bottom-trailing) + soft top-right accent glow + 1px hairline border,
   applied on iOS (`Gradient.Stop` + `RoundedRectangle.stroke` + blurred `Circle`) and Android (Glance 1.1
   gradient drawable + 1dp border + radial glow drawable). Closes #1, #6, #13. Extend the theme payload with `glow`.
2. **Phrase-as-hero hierarchy.** One dominant element: phrase ~24–26pt heavy with `minimumScaleFactor`/2-line
   wrap; demote kicker to a quiet *tracked* uppercase label colored with `titleColor`; one restrained accent chip;
   drop transcription on small. Addresses #14, #16, #18.
3. **Reinstate the identity chip + one consistent affordance.** Bundle a neutral phrase glyph chip top-left on
   small/medium + Android (#5). Collapse play to one pattern — circular accent icon chip on medium only,
   whole-card-tap elsewhere (#4). Extend `tapHint` to 8 locales / fix the pt-BR↔es collision.
4. **Fix the Android picker preview + dark loading state** so users never see the white/purple flash (#2).
5. **Brand the lock screen + add a stale-data signal** (#7 + robustness) — the one item that affects perceived
   *freshness*, the whole point of a daily widget.

**Sequencing:** ship #1 + #4 first (largest visible/brand win), then #2/#3 hierarchy + identity, then lock-screen
+ stale-data. Wiring `transcription` (#3) is a one-line bridge change that lights up an already-built feature.

---

- Проверили виджет «фраза дня» на iPhone и Android и сравнили с карточкой внутри приложения.
- Серьёзных поломок нет — ничего не падает; все замечания про внешний вид, аккуратность и удобство.
- Главная беда: на Android карточка плоская и одноцветная, а в приложении и на iPhone — с переливом и объёмом
  (выглядят как разные приложения).
- В списке виджетов на Android показывается светло-фиолетовый образец, которого нет ни в одной теме — при
  добавлении он мелькает и сбивает с толку.
- Строчка с транскрипцией обещана, но никогда не показывается — её забыли заполнить (чинится одной строкой).
- Кнопка «Слушать» сделана по-разному на разных телефонах, фирменный значок и подсветка пропали, на экране
  блокировки виджет безликий, крупный текст для слабовидящих на iPhone не увеличивается, и нет пометки
  «сегодняшняя фраза» (может молча показывать вчерашнюю).
- Что дальше: одинаковый перелив с объёмом на обоих телефонах, поправить образец в списке, вернуть фирменный
  значок и единый стиль кнопки, добавить узнаваемость на экране блокировки и значок свежести.
