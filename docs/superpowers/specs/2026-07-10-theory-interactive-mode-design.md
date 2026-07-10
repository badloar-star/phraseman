# Interactive Theory Mode — Design Specification

**Date:** 2026-07-10  
**Status:** UX concept approved; implementation not started  
**Scope:** The `Theory` stage inside the unified lesson flow

## 1. Product role

`Theory` is a mandatory first-pass stage that prepares the learner for `Build`. It must not behave like a static article or a grammar page. The learner should discover the rule by interacting with a phrase, changing its parts, observing the result, and completing one guided construction task.

The stage is short: normally 2–4 minutes. It is part of the lesson spine, not a separate destination.

```text
context scene → inspect phrase → manipulate meaning → guided build → Build unlocks
```

## 2. Entry and shell

The user reaches Theory from the dense course map and lesson cluster. The map remains the navigation layer; Theory is the action layer.

On first entry:

1. The selected lesson node focuses/zooms on the map.
2. A short stage intro identifies the lesson topic and the current goal.
3. Theory opens directly; there is no second menu.

On repeat entry, the intro may collapse to a short transition or be skipped. The user resumes from the last unfinished interaction.

## 3. Screen composition

The approved base screen has four visual zones:

1. **Header** — stage name, step count, close/exit affordance, progress bar.
2. **Context scene** — a short cinematic visual situation. Motion, sound and text are parameterized content slots; language-specific phrases and audio are injected by the lesson pack.
3. **Phrase laboratory** — the target phrase is split into tappable word tokens. The selected token receives material, highlight and depth changes.
4. **Action area** — role chips, explanation panel, and one primary CTA with a physical press response.

The visual language must reuse existing Phraseman avatar primitives: the canonical pointy-top hex geometry, gradient material, facet/highlight treatment, accent outline and aura behavior. Stage icons should be real illustrated assets, not generic CSS glyphs.

## 4. Interaction sequence

### 4.1 Context

The scene communicates why the phrase exists. It may animate a character or object, but it must not require language-specific lip-sync in the first version. The phrase audio and text are separate slots.

### 4.2 Inspect

The learner taps a word. The selected word becomes visually elevated. The explanation panel identifies its role and the scene may react with a small animation or sound cue.

### 4.3 Manipulate

The learner changes one meaningful element of the phrase. For example, an action word changes from `need` to `want`. The phrase, explanation, scene state and audio update together.

### 4.4 Guided build

The learner completes one constrained construction task with enough support to succeed. This is the bridge into the full `Build` stage, not the full Build experience.

### 4.5 Completion

After the guided build succeeds, Theory marks its progress event and unlocks the next lesson stage. A repeat visit can be shortened, but the first-pass completion remains part of lesson progress.

## 5. Feedback states

### Default

The screen communicates that words are tappable and shows one clear next action. No quiz-like pressure is present.

### Correct discovery

- selected word receives a highlight and elevated material;
- scene reacts;
- phrase audio may play once;
- explanation changes to the newly discovered role;
- next action becomes explicit.

### Incorrect discovery

- no loss of lesson progress;
- selected item gets a restrained error treatment;
- explanation points to the relevant contrast;
- learner can retry immediately;
- a targeted help/replay path is available.

### Completion

- guided build confirms success;
- stage progress advances;
- next stage is announced;
- CTA transitions into `Build` or returns to the lesson cluster when the user exits.

## 6. Content contract

Theory content must be generated and delivered independently from the runtime shell.

```text
sceneTemplateId
lessonId
targetLocale
sourcePhrase
targetPhrase
translation
wordParts[]
roleExplanations[]
manipulableSlots[]
guidedBuild
audioAssets[]
sceneTiming
textLayoutVariants
reviewState
publishState
```

The cinematic scene is reusable across languages. Text, audio, line breaks, timings and answers are language-pack data. A new language must not require a binary application update unless it introduces a new runtime interaction type.

## 7. Personal Plan behavior

The lesson spine stays stable. Personal Plan may alter:

- which phrase is selected;
- which word role receives emphasis;
- how many examples are shown;
- whether a recovery explanation is inserted;
- whether a short speaking/listening challenge is added after Theory.

It must not remove the first-pass Theory stage or silently replace the canonical lesson flow.

## 8. Motion and interaction rules

- primary CTA uses a 3–5 px press-in with a compressed lower shadow;
- selected word uses elevation, material highlight and a short 150–300 ms transition;
- scene reactions use transform/opacity where possible;
- no infinite animation is required for comprehension;
- reduced-motion mode removes loops but preserves state changes and feedback;
- all interactive targets remain at least 44 px.

## 9. Acceptance criteria

- Theory is a real interactive stage, not a static text page.
- The first-pass flow includes context, inspection, manipulation and one guided build.
- Every interaction produces clear visual feedback.
- Errors do not destroy progress and route to targeted explanation.
- The scene shell is reusable across languages.
- Language-specific text/audio/timing live in generated content packs.
- The UI uses the existing Phraseman avatar/hex material language.
- The mode can be inserted into the unified lesson runtime without replacing legacy lesson behavior.

## 10. Explicit non-goals

- no full free-form AI conversation;
- no mandatory lip-sync in v1;
- no replacement of the existing lesson runtime in this design phase;
- no implementation of `Build`, `Listen`, `Speak` or `Exam` in this spec.
