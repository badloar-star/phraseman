# Feature Research

**Domain:** Apple Watch companion for an SRS / spaced-repetition flashcard (language-learning) app
**Researched:** 2026-06-07
**Confidence:** MEDIUM (HIGH on watchOS interaction/session principles; MEDIUM on competitor specifics — the watch-flashcard niche is thin and under-documented)

## Context Snapshot

The phone-side SRS engine (`app/active_recall.ts`) is **done**: `getDueItems()`, `markReviewed(phrase, gotCorrect)`, `countDueItemsToday()`. Each `RecallItem` already carries the English phrase plus locale answers (`correctAnswer` / `correctAnswerUK` / `correctAnswerES`). The watch milestone only adds the **wrist-side review UX** and the **read-only native bridge** (RN is the single writer; watch returns `{phrase, gotCorrect, reviewedAt}` for last-write-wins merge). The opaque `phrase` key must round-trip unchanged.

**Most important ecosystem finding:** There is **no successful, mass-market watch flashcard app to copy**. Anki has no official watch app; Duolingo has no watch app; the few that exist (TangoWrist, FlashRecall-style companions) are tiny and under-reviewed. The dominant industry verdict is that **watch-only review is a friction trap unless it is ruthlessly minimal**. This is an opportunity and a warning: Phraseman can own this niche, but only by doing very little, very well. Scope discipline matters more here than feature richness.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features a watch SRS companion must have or it feels broken.

| Feature | Why Expected | Complexity | Phone-side dependency |
|---------|--------------|------------|------------------------|
| **Card stack of "due today" items** | The entire reason to open the watch app — surface what the SRS scheduled. | LOW | YES — consumes `getDueItems()` batch pushed over WatchConnectivity. |
| **Front (English phrase) → tap/crown to reveal answer (locale meaning)** | Active recall requires you to attempt retrieval before seeing the answer. Always-both defeats the learning purpose. | LOW | YES — front + `correctAnswer*` per locale in the pushed batch. |
| **Swipe right = "I know it" / swipe left = "I don't"** | Matches the stated product spec and the universal flashcard gesture vocabulary. One-thumb, eyes-light. | LOW | YES — emits `{phrase, gotCorrect, reviewedAt}` back to RN → `markReviewed`. |
| **Haptic confirmation on each grade** | watchOS norm: tactile ack beats visual-only on a glanced screen; raises usability satisfaction markedly. Distinct taps for right vs left help eyes-off use. | LOW | NO. |
| **Offline cached deck** | The watch is routinely out of iPhone range. A flashcard app that needs a live phone is dead on arrival. Industry-standard expectation (TangoWrist: "works in Airplane Mode"). | MED | YES — last synced batch persisted in App Group; reviews queued for next sync. |
| **Glanceable "due count" complication** | Complications are *the* watch engagement surface; a study app without one is invisible on the face. Tap deep-links into the session. | MED | YES — reads `countDueItemsToday()` value mirrored into App Group. |
| **Clear "you're done" empty / completion state** | Sessions must *end*. A finite "nothing due / all caught up" state is expected and is what makes micro-sessions feel rewarding vs infinite. | LOW | YES — derived from empty/exhausted batch. |
| **Two-tap-max navigation, sub-20s session** | Apple HIG / watchOS norm: most wrist sessions are under 10–20 seconds; deep menus and scrolling are abandonment drivers. | LOW | NO. |
| **Locale-correct answer face** | RU/UK/ES already on each item; showing the wrong locale's meaning would be an obvious bug. | LOW | YES — locale selection passed in batch or read from shared prefs. |

### Differentiators (Competitive Advantage)

Where Phraseman can pull ahead of the (weak) field.

| Feature | Value Proposition | Complexity | Phone-side dependency |
|---------|-------------------|------------|------------------------|
| **Genuinely native, instant card stack (SwiftUI, no phone round-trip per card)** | The #1 complaint about watch flashcards is sluggishness and sync fragility. A native, pre-loaded, instant-feeling stack *is* the differentiator. | MED | YES — batch pre-load, not per-card fetch. |
| **TTS pronunciation through AirPods from the watch** | Pronunciation is core to phrasal-verb learning, and the watch can play audio to already-paired AirPods even out of iPhone range. Few competitors do this. Phraseman already centralizes TTS via `useAudio`. | HIGH | PARTIAL — watch-side audio must be pre-rendered/cached (can't call phone `expo-speech` live offline); consider shipping pre-generated clips in the batch, or watch-local AVSpeechSynthesizer. |
| **XP / streak feedback echoed on the watch (micro-reward)** | Ties micro-sessions back into the existing gamification loop; "every wrist review counts" reinforces the dozens-of-sessions-a-day retention thesis. | MED | YES — read XP/streak from shared store; do NOT make watch the writer. |
| **Auto-advance / autoplay pacing (optional)** | TangoWrist's adjustable 0.5–10s autoplay lets hands-free drilling. Optional and off by default; a power-user nicety. | MED | NO. |
| **Distinct success vs miss haptic + subtle animation** | Makes the binary grade feel deliberate and satisfying without looking at the screen — reinforces the "5-second glance" promise. | LOW | NO. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **4-button SM-2 grading on the watch (Again / Hard / Good / Easy)** | "Anki has it; the engine supports nuance." | Four targets on a ~40mm screen is fat-finger hell; it violates the sub-3-second glance and the one-swipe spec. SM-2 nuance is wasted when the user can't reliably hit the right button. | **Binary right/left only** (see Decisive Recommendation below). Map the swipe to `gotCorrect: true/false`; let the existing engine derive the interval. |
| **Card creation / editing on the watch** | "Quick add while I think of one." | Text entry on watch is painful and a documented abandonment cause. RN is the single writer anyway. | Create/edit on phone; watch is review-only. |
| **Full deck browsing / lesson navigation on watch** | "See all 32 lessons on my wrist." | Defeats glanceability; recreates the phone app badly. Violates two-tap rule. | Watch shows only the due queue; everything else stays on phone. |
| **Live per-card sync to the phone (write-through)** | "Keep phone perfectly in sync in real time." | Watch is often out of range; per-card writes will stall or fail. Conflicts with the read-only-native / last-write-wins design. | Queue grades locally, batch-merge on reconnect by `reviewedAt`. |
| **Aggressive "cards are due!" push notifications** | "Nudge me so I don't forget." | Wrist nudges are intrusive; over-notifying is the fastest path to the app being silenced/deleted. SRS due-times are bursty and would fire constantly. | Passive complication as primary nudge; if notifications ship at all, make them opt-in, rate-limited (≤1/day), and tied to a user-chosen reminder time — not per-card due events. |
| **Standalone watch login / account on watch** | "Use it without my phone." | Auth + canonical-UID flows on watch add huge complexity for a companion. | Watch inherits identity from the paired phone via App Group; no separate login. |
| **Showing answer first / always showing both sides** | "Faster, no extra tap." | Kills active recall — the retrieval attempt is the learning. | Front-only, then reveal. Reveal cost is one crown turn or tap. |

---

## Decisive Recommendation: Binary vs 4-Grade

**Use binary swipe (right = know / left = don't know). Do NOT put 4-button SM-2 grading on the watch.** Decision: HIGH confidence.

Rationale:
1. **Ergonomics win outright.** Every credible watchOS guideline points to sub-20-second sessions, two-tap-max flows, and tactile (not precise-target) interaction. Four small grade buttons fight all three. A swipe is the single most reliable eyes-light gesture on the wrist.
2. **The spec already says binary,** and the engine signature is `markReviewed(phrase, gotCorrect: boolean)` — binary is the *native shape of the contract*. Forcing 4-grade would require redefining the bridge payload and the engine call.
3. **Nuance is illusory on the wrist.** A mis-tapped "Easy" when you meant "Again" corrupts the schedule worse than a clean binary signal. Binary degrades gracefully; mis-grading does not.
4. **The phone keeps the rich path.** Users who want Again/Hard/Good/Easy still have it on the phone. The watch is for volume and frequency, not precision — its job is "dozens of micro-sessions," and binary maximizes throughput.

Implementation note: map `swipe right → gotCorrect: true`, `swipe left → gotCorrect: false`, and let `active_recall.ts` translate that into SM-2 ease/interval as it already does for any boolean outcome. Optionally treat a long-press or down-swipe as "skip/snooze" (no grade emitted) so users aren't forced to lie when they want to defer — but keep this optional and low-priority.

---

## Answers to the Specific Questions

1. **Interaction model.** Swipe for grading (right/left) is correct and matches the spec. Digital Crown is the ergonomic choice for **reveal/advance** (TangoWrist's "turn once to reveal, turn again for next" is the proven pattern), but a **tap-to-flip** is the lower-complexity table-stakes baseline — ship tap first, add crown-reveal as polish. Do not overload swipe for both navigation and grading.
2. **Reveal flow.** Front-only (English) → tap or crown → reveal locale meaning. Always-both is an anti-feature (kills recall).
3. **Session shape.** Finite, batch-bounded session (whatever `getDueItems()` returned, capped — e.g. a soft cap of ~10–20 cards per micro-session feels right for a 5-second-per-card glance). Always provide an explicit "all caught up" end state; never infinite scroll. Haptic on every grade (distinct right vs left). TTS-through-AirPods is sensible and a differentiator, but offline pre-rendering is the hard part — treat as v1.x, not v1.
4. **Complication.** Show the due count (`countDueItemsToday()`), kept ≤ a couple of glanceable characters; tap deep-links straight into the card session. This is the primary, tasteful nudge surface.
5. **Offline.** Persist the last synced batch in the App Group and run fully from cache; queue grades with `reviewedAt` for last-write-wins merge on reconnect. If no batch has ever synced, show a friendly "open Phraseman on your phone to load cards" empty state — never a blank/error screen.
6. **Notifications.** Stay **passive by default** — the complication is the nudge. If a reminder is offered, it must be opt-in, ≤1/day, at a user-chosen time, never per-card-due. Per-event SRS nudges are an anti-feature.
7. **Categories.** Captured in the tables above.

---

## Feature Dependencies

```
Card stack of due items
    └──requires──> WatchConnectivity batch push (RN → watch)
                       └──requires──> App Group shared storage + schemaVersion

Swipe grade (right/left)
    └──requires──> Card stack (must have a card to grade)
    └──feeds──> {phrase, gotCorrect, reviewedAt} queue
                    └──requires──> last-write-wins merge → markReviewed()

Due-count complication
    └──requires──> countDueItemsToday() mirrored into App Group
    └──enhances──> Card stack (deep-link entry point)

Offline cached deck
    └──requires──> Persisted batch in App Group

TTS through AirPods (differentiator)
    └──requires──> Pre-rendered/cached audio OR watch-local synthesis
    └──conflicts──> "RN is single writer / live phone fetch" (can't call phone TTS offline)

Reminder notification (anti-feature unless opt-in)
    └──conflicts──> Passive-by-default complication nudge
```

### Dependency Notes

- **Grade emission requires the card stack and the bridge:** the watch can only return a grade for a phrase it received; the opaque `phrase` key must round-trip unchanged or `markReviewed` no-ops (`if (!item) return`).
- **Complication enhances the stack:** its only job is glance + deep-link; it must read a mirrored count, never compute SRS itself.
- **TTS conflicts with the offline/read-only model:** the watch cannot invoke phone-side `expo-speech` when out of range, so any watch audio needs pre-shipped clips or watch-local `AVSpeechSynthesizer` — this is why it's a v1.x differentiator, not v1 table stakes.
- **Notifications conflict with the passive nudge philosophy:** ship the complication first; only add notifications if user research demands it.

---

## MVP Definition

### Launch With (v1) — ruthless minimum

- [ ] **WatchConnectivity batch push + App Group store** — without the bridge there is no app. (Native, read-only.)
- [ ] **Card stack of due items, front-only** — the core surface.
- [ ] **Tap-to-reveal locale answer** — lowest-complexity reveal; respects active recall.
- [ ] **Swipe right/left binary grade → queued `{phrase, gotCorrect, reviewedAt}`** — the spec'd contract.
- [ ] **Haptic confirmation (distinct right vs left)** — cheap, high satisfaction.
- [ ] **Offline cache + queued merge (last-write-wins)** — non-negotiable for a watch.
- [ ] **Due-count complication with deep-link** — the engagement surface.
- [ ] **"All caught up" / "load cards on phone" empty states** — makes sessions end gracefully.
- [ ] **Locale-correct answer rendering** — RU/UK/ES already exist; pick correctly.

### Add After Validation (v1.x)

- [ ] **Digital Crown reveal/advance** — add once tap flow is validated. Trigger: users want eyes-lighter flow.
- [ ] **TTS pronunciation via AirPods (pre-rendered/cached)** — Trigger: retention data shows audio drives recall; resolve the offline-audio approach first.
- [ ] **XP/streak echo on watch** — Trigger: tie into gamification once core loop is sticky.
- [ ] **Optional autoplay pacing** — Trigger: power-user requests for hands-free drilling.
- [ ] **Opt-in daily reminder (≤1/day, user-chosen time)** — Trigger: only if complication proves insufficient.

### Future Consideration (v2+)

- [ ] **Skip/snooze gesture** — defer; binary covers the primary loop.
- [ ] **Richer session stats on watch (accuracy, study time)** — defer; keep watch lean, stats live on phone.
- [ ] **Android Wear parity** — explicitly out of scope this milestone per PROJECT.md.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| WatchConnectivity batch + App Group | HIGH | MEDIUM | P1 |
| Due-item card stack (front-only) | HIGH | LOW | P1 |
| Tap-to-reveal answer | HIGH | LOW | P1 |
| Swipe binary grade + queue | HIGH | LOW | P1 |
| Haptic confirmation | MEDIUM | LOW | P1 |
| Offline cache + merge | HIGH | MEDIUM | P1 |
| Due-count complication + deep-link | HIGH | MEDIUM | P1 |
| Empty / done states | MEDIUM | LOW | P1 |
| Locale-correct answer | HIGH | LOW | P1 |
| Digital Crown reveal/advance | MEDIUM | MEDIUM | P2 |
| TTS via AirPods | MEDIUM | HIGH | P2 |
| XP/streak echo | MEDIUM | MEDIUM | P2 |
| Autoplay pacing | LOW | MEDIUM | P3 |
| Opt-in reminder notification | LOW | MEDIUM | P3 |

**Priority key:** P1 = must have for launch · P2 = add after validation · P3 = future.

---

## Competitor Feature Analysis

| Feature | TangoWrist (watch-native SRS) | AnkiMobile / Anki | Duolingo | Our Approach |
|---------|-------------------------------|-------------------|----------|--------------|
| Native watch app | YES (the niche specialist) | NO official watch app | NO watch app | YES — native SwiftUI, our edge over the absent giants. |
| Reveal mechanic | Digital Crown (turn to reveal/advance) | Tap (phone) | n/a | Tap in v1, Crown in v1.x. |
| Grading | Implicit mastery / SRS auto | 4-button SM-2 (phone) | n/a | **Binary swipe** — wrist-appropriate. |
| Offline | "Works in Airplane Mode" | Phone-local | n/a | Cached batch + queued merge. |
| Audio | Add audio per card | Phone audio | Phone audio | TTS via AirPods (v1.x differentiator). |
| Complication | Not documented | n/a | n/a | Due-count + deep-link (table stakes for us). |
| Notifications | "Daily reminders" | n/a | Aggressive (phone) | Passive complication; opt-in reminder only. |
| Card creation on watch | Manage decks on phone | Phone | n/a | Review-only on watch (RN single writer). |

**Read of the field:** the two apps everyone associates with flashcards/language (Anki, Duolingo) have *no* watch presence — confirmed across multiple 2024–2025 sources. The only real comparable (TangoWrist) is brand-new and under-reviewed. So the bar is "be the first that doesn't feel clunky," and the validated way to clear it is minimalism + native speed + glanceable complication, exactly what the watchOS interaction guidelines reward.

---

## Confidence & Gaps

- **HIGH:** watchOS interaction principles (sub-20s sessions, two-tap navigation, haptic confirmation, complications as the engagement surface, graceful offline) — corroborated across Apple HIG framing and multiple independent 2025 sources.
- **HIGH:** binary-grade recommendation — backed by ergonomics + the existing engine contract.
- **MEDIUM:** competitor specifics — the niche is thin; TangoWrist details come from its App Store listing (no user reviews yet), so its patterns are indicative, not proven at scale.
- **GAP / for later phases:** the **offline TTS approach** is unresolved — whether to ship pre-rendered clips in the batch (bandwidth/storage cost) or use watch-local `AVSpeechSynthesizer` (quality/voice parity with `useAudio`). Flag for the audio phase. Also unflagged: whether the complication count can update frequently enough given watchOS budget — verify against complication refresh limits during implementation.

## Sources

- FlashRecall — Flashcards for Apple Watch: https://flashrecall.app/blog/flashcards-for-apple-watch (MEDIUM — vendor blog, "watch as notification layer; watch-only review causes week-one abandonment")
- FlashRecall — Anki on Apple Watch: https://flashrecall.app/blog/apple-watch-anki (MEDIUM — "no official Anki watch app; workarounds clunky/sync-fragile")
- TangoWrist Watch Flashcards (App Store): https://apps.apple.com/us/app/tangowrist-watch-flashcards/id6749536179 (MEDIUM — Crown reveal/advance, offline, autoplay 0.5–10s, manage-on-phone; no user reviews yet)
- Designing for watchOS — Apple HIG: https://developer.apple.com/design/human-interface-guidelines/watchos (HIG content JS-rendered; principles corroborated via secondary sources)
- MoldStud — Designing Apple Watch Complications: https://moldstud.com/articles/p-the-ultimate-guide-to-designing-complications-for-apple-watch-dos-and-donts (MEDIUM)
- Rivva — Best Apple Watch productivity apps 2025: https://blog.rivva.app/p/best-apple-watch-productivity-apps (MEDIUM — sub-20s sessions, glanceable <20 chars, two-tap, complication engagement lift)
- rshankar.com — Haptic feedback on Apple Watch: https://www.rshankar.com/haptic-feedback-in-wellness-apps-apple-watch/ (MEDIUM — haptics raise usability satisfaction; avoid overuse)
- XDA — Stream audio on Apple Watch without iPhone: https://www.xda-developers.com/how-stream-music-apple-watch/ (MEDIUM — watch can drive AirPods independent of/out of range from iPhone)
- Duolingo watch availability (TikTok/App Store cross-check): https://en.wikipedia.org/wiki/Duolingo (LOW/MEDIUM — confirms no Duolingo watch app)

---
*Feature research for: Apple Watch SRS flashcard companion (Phraseman v1.1)*
*Researched: 2026-06-07*
