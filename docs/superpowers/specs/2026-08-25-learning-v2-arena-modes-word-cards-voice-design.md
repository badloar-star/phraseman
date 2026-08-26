# Learning V2: Arena modes, interleaved word cards, canonical voice

**Status:** owner-approved 2026-08-25.  
**Scope:** common Learning V2 runtime seam plus English lesson 1 session 1. Sessions 2–56 remain forbidden by authoring preflight.

## Owner outcome

After exactly three intro screens, practice uses all seven Learning V2 families. The same family may never appear in two adjacent practice positions. Every ordinary future session must satisfy the same two rules before it can pass authoring.

Five families reuse the exact visual primitives and interaction language already used by Arena:

| Learning V2 family | Arena visual analogue |
|---|---|
| `phrase_builder` | `translate_build` |
| `listen_choose` | `guess_phrase` |
| `sound_contrast` | `find_oddity` |
| `context_gap_grammar` | `fill_gap` |
| `speed_match` | `speed_match` |

`listen_build_dictation` and `scripted_repeat_compare` keep their unique learning operation but use the same Arena visual system. The source of truth is the shared `components/ui/v2_ui.tsx` primitives, palette and motion tokens; Arena business state and server contracts are not imported into Learning V2.

## Mode interface

- Options and word tiles use the real `V2Chip`: diagonal gradient, lower 3D edge, top highlight, press depth, haptic, selected and verdict motion.
- Mode-owned primary actions use the real `V2Cta` where the owner HTML requires an explicit action.
- Surfaces use `V2Card` and `useTournamentPalette`; active app-theme colors remain authoritative.
- Learning V2 retains explicit target/explanation semantic typography, audio controls, diagnostic feedback and each family's mode-native payload.
- The two Learning-only families must not fall back to a generic radio screen. Dictation retains hidden target + audio + token reconstruction. Repeat & Compare retains model playback + hold-to-talk + honest speech outcome.

## New-word timing and card

- The old post-intro queue is removed. A card is due only when the player reaches the first practice interaction carrying that exact `newWordEncounter`.
- The card blocks that interaction, appears above the still-mounted task, and is dismissed only by `Дальше`. Closing resumes the same interaction; it never advances the practice index.
- Later interactions with the same lexical item do not show it again.
- The card renders the real `app/flashcards/PhraseCard.tsx`, including its exact 3D flip, press response, reduced-motion/crossfade fallback and top-right speaker.
- Front: target word + transcription. Back: exact locale-native meaning + the approved short playful locale-native line.
- Below the card: bookmark save control and `Дальше`. Save is idempotent and never dismisses the card.
- Existing motion policy remains: the first word in lesson 1 may use `lesson_hero_b`; all later cards use `premium_a`.

## Voice and footer

- Learning V2 removes the custom global `Пропустить` and `Проверить` controls.
- The practice footer contains only the centered canonical `Устно` hold control. No theory or hint control is added.
- Hold behavior reuses the ordinary-lesson `SpeakingPanel` inline route and its exact `VoiceEqualizer`; no copied equalizer and no independent Learning V2 recognizer UI.
- Press-in immediately opens/activates the inline speaking surface and starts capture; press-out stops capture. System recognizer fallback remains available when the on-device model is absent.
- The exact target comes from the current mode-native payload. A successful transcript is evaluated through the existing Learning V2 evaluator.
- Each mode owns its normal completion action. Removing the global check button must not make any interaction impossible to finish.

## Gates

Session 1 cannot pass unless the real learner child proves:

1. exactly three intro pages precede practice;
2. all seven families are present;
3. no adjacent practice interactions share a family;
4. word cards are interaction-triggered rather than drained after intro;
5. the overlay imports the real `PhraseCard` and exposes flip, speaker, save and continue;
6. all seven mode renderers use the shared Arena V2 primitives;
7. the footer contains only the canonical hold control and the inline `VoiceEqualizer` path;
8. focused preflight and existing word-first/mode-native gates remain unweakened.

No deploy, TTS generation, commit, push or session-2 authoring belongs to this package.
