# MAX Prestart: stats-style lesson card and safe preloading

Date: 2026-08-21
Status: approved by owner (variant A)

## Problem

The current tutor prestart screen is visually noisy and makes the learner wait for the lesson plan. It splits one decision across several small cards, repeats generic lesson labels, uses small text and generic outline icons, and renders an entire "upcoming lessons" list. The lesson preview and the short-lived voice mint are also coupled, so opening MAX exposes network preparation as a blocking loading state.

The owner explicitly requires:

- remove the "Ближайшие уроки" block;
- give every MAX lesson a distinctive, interesting title;
- remove the flag and school-cap visual language;
- use authored assets when a visual is needed;
- use large, noticeable typography and controls;
- match the hierarchy and finish of the Statistics section;
- preload before MAX opens while keeping the lesson timer and conversation stopped until the learner presses Start.

## Approved direction

Use one dominant Statistics-style lesson card instead of a stack of small utility cards. The screen has one primary reading path:

1. compact back/header row;
2. one large lesson hero card;
3. one large primary action.

The hero card uses `StatsCardArtSurface` and the already shipped layered MAX orb asset. It contains:

- lesson ordinal as quiet context, not the title;
- a large unique lesson title, limited to two lines;
- one short outcome sentence in learner language;
- two large metrics: speaking level and goal progress;
- remaining daily voice minutes as a visible but subordinate resource;
- no upcoming-lessons list, flag icon, school icon, small chips, or generic "Max / voice teacher" utility card.

The CTA reads "Начать урок" for tutor mode. It is at least 56 dp high, uses the theme accent fill, and always uses the dark high-contrast foreground token (`t.correctText`) on bright green.

## Distinct lesson titles

Lesson titles are deterministic educational content, not generated at runtime. A title combines:

- the current speaking goal;
- the lesson mode (`new_material`, `review_and_scene`, `free_talk`);
- a rotating authored title pattern selected by stable lesson ordinal.

The mode patterns communicate a different dramatic action, so two consecutive lessons working on the same goal do not repeat the same title. Examples for the first goal:

- new material: "Первый контакт";
- review and scene: "Знакомство без подсказок";
- free talk: "Разговор, который не оборвётся".

The full displayed title must be stable for the same lesson ordinal, localized through the existing supported interface languages, and have a conservative fallback based on the localized goal title. The lesson number remains separate metadata and is never used as the primary title.

## Preloading architecture

Preview data and call credentials have different lifetimes and must not share one cache.

### Read-only lesson preview

`maxVoicePreflight` returns the existing quota snapshot plus the tutor preview when `format: 'tutor'`:

- tutor name;
- lesson ordinal and mode;
- localized goal identity/title/level;
- goal progress;
- counts needed by the hero metrics;
- stable display title and short outcome copy.

The client stores this response in a small in-memory cache keyed by format, CEFR, interface language, and study target. Opening/focusing the Home learning surface triggers one read-only prefetch when MAX is visible. There is no interval and no repeated background polling. The cache has a short freshness window and can be invalidated after a completed MAX call so the next lesson is not stale.

The prestart screen reads the cache synchronously on its first render. If the cache is absent, it renders a deterministic local fallback immediately and refreshes in place; it never replaces the whole card with a loading placeholder.

### Short-lived voice mint

The ephemeral voice token remains separate because it expires quickly and creates a server reservation. Minting it indefinitely on Home focus would waste provider calls, consume rate slots, and frequently expire before use.

Preparation starts on the learner's explicit MAX entry intent (`onPressIn`/press handoff) and is reused by the prestart screen through the existing single premint slot. This overlaps mint latency with navigation and the time spent reading the lesson goal. The timer, microphone, WebRTC session, and billable conversation do not start until "Начать урок" is pressed.

If the mint is still completing, the hero remains fully readable. The CTA exposes an accessible busy state without showing a large loading card. Once ready, its label changes to "Начать урок" and the state change is announced. A failed preparation keeps the lesson preview and presents retry/fallback actions without navigating elsewhere unexpectedly.

## Layout and responsive behavior

- The content is scrollable so small phones and large text never clip the CTA or hero content.
- Essential text allows the project accessibility baseline of up to 200% scaling; no `maxFontSizeMultiplier={1.2}` on lesson title, objective, metrics, errors, or CTA.
- The orb has a bounded responsive size and never steals width needed by text at large font settings.
- At large font sizes, metric cells wrap vertically rather than truncate.
- Touch targets are at least 44 x 44 dp; the primary CTA is at least 56 dp.
- Decorative asset layers are hidden from the accessibility tree. The hero exposes a concise combined label in reading order.
- Preparation state changes and errors use polite live-region announcements.

## State model

The screen independently tracks:

- `preview`: cached, refreshing, or fallback;
- `mint`: preparing, ready, or failed;
- `quota`: known or fallback;
- `call`: not started until explicit CTA press.

Preview failure must not erase cached or deterministic lesson content. Mint failure must not open the call session. Navigating away releases an unclaimed reservation; handing off to the session preserves it.

## Interaction and motion

Use the project's Motion Hybrid tokens and existing MAX orb motion. The prestart redesign adds no bounce, looping attention animation, or word-reactive movement. Reduced-motion settings freeze decorative motion while preserving all information and controls.

## Non-goals

- Do not start microphone capture, WebRTC, the lesson timer, or conversation on Home or prestart.
- Do not keep refreshing or minting in the background.
- Do not introduce new bundled image assets; reuse the statically wired MAX orb layers.
- Do not remove quota, retry, fallback, back navigation, or lesson-progress functionality.
- Do not change economy, subscription, or billing authority.

## Acceptance criteria

1. Opening MAX from a prefetched Home surface shows the lesson hero immediately with no full-card "Готовим урок" placeholder.
2. "Ближайшие уроки", flag, and school-cap icon are absent from tutor prestart.
3. Consecutive lesson modes for the same goal receive distinct stable titles.
4. The hero uses Statistics card treatment and the existing MAX asset.
5. Important text and CTA remain usable at 200% font scaling and on a small phone with scrolling.
6. Home prefetch is read-only and bounded; it does not reserve time or mint an ephemeral token.
7. Entry intent starts/reuses premint, but timer, microphone, and call begin only after the CTA.
8. Failed preview or mint retains a coherent screen and offers retry without accidental navigation.
9. Bright-green CTA content uses a dark foreground.
10. Focused unit, contract, render, accessibility, and event-order tests pass.

