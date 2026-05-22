# Flashcards Audio Mode Plan

Date: 2026-05-21

Status: implemented as a foreground-only MVP.

Implemented slice:

- Shared source/deck helpers: `app/flashcards/trainingSources.ts`.
- Pure playback sequencing helpers: `app/flashcards/audioSession.ts`.
- New route: `app/flashcards_audio.tsx`.
- Entry points: flashcards hub and collection CTA.
- Coverage: `tests/flashcards_audio_session.test.ts` and `tests/flashcards_audio_contract.test.ts`.

## Decision

Build a foreground-only flashcards audio mode. Do not build lock-screen, background, generated podcast, native media service, or pre-rendered audio in this iteration.

Working product name:

- RU: `Слушать карточки`
- UK: `Слухати картки`
- ES: `Escuchar tarjetas`
- EN internal: `flashcards_audio`

The mode should let the user choose the same card sources as card training, then play an automatic loop:

1. Show front side.
2. Speak front side.
3. Wait recall pause.
4. Flip to back side.
5. Speak back side.
6. Wait next-card pause.
7. Move to the next card.

## Audit Inputs

- `docs/ARCHITECTURE.md`: flashcards screen responsibilities and split modules.
- `docs/FLASHCARDS_RULES.md`: translation fallback and Android audio button responder rule.
- `docs/FLASHCARDS_SWIPE_IMBA_CHECKLIST_2026-05-17.md`: existing training source UX and learning-loop audit.
- `docs/SOUND_DESIGN_AUDIT_2026-05-18.md`: speech is not SFX; app sound should not overlap voice.
- `docs/gustav/GUSTAV_TARGET_LANGUAGE_ARCHITECTURE.md`: source/interface language and study target must stay separate.
- `app/flashcards.tsx`: hub entry point and current `openTraining`.
- `app/flashcards/FlashcardsCategoryHub.tsx`: training tile and pack/category hub layout.
- `app/flashcards_collection.tsx`: collection-level CTA, `source/filter` route params, view/flip daily task tracking.
- `app/flashcards_swipe.tsx`: source selection, source loading, owned packs, community packs, smart card queue, speech usage.
- `hooks/use-audio.ts`: current `expo-speech` wrapper, speech rate, voice override, language inference.
- `app/user_settings_store.ts`: speech settings storage.
- `app/spanish_content_gate.ts`: card back source-language resolver.
- `app/phrase_target_utils.ts`: target-language TTS locale helper.
- `app/target_storage_keys.ts`: target-scoped storage patterns.

## Current Architecture Findings

### What We Can Reuse

- `useAudio()` already wraps `expo-speech`, stops previous speech before new speech, respects user speech rate and selected voice.
- Manual card speech already exists in `FlashcardListItem`.
- Swipe training already knows how to build sources from saved cards, custom cards, official owned packs, and community packs.
- Collection screen already passes `source` and `filter` into the training route, so `Слушать эти карточки` can follow the same route contract.
- Daily task and achievement tracking already has `flashcard_view`, `flashcard_flip`, `flashcard_viewed`, and `flashcard_flipped`.
- Card back text is already centralized through `resolveFlashcardBackText(item, cardContentLang)`.

### What Should Not Be Reused Directly

- Do not duplicate the whole source-building block inside a new audio screen.
- Do not make the audio mode depend on swipe prompts, decoys, yes/no answers, or swipe memory.
- Do not score passive listening as `trainer_correct`.
- Do not add background playback or native audio plugin for MVP.
- Do not hardcode card back as `ru`; use `flashcardContentLang`.
- Do not permanently fill `uk` from `ru`; preserve the fallback rule from `FLASHCARDS_RULES.md`.

## Product Scope

### MVP

- New route: `/flashcards_audio`.
- Entry from flashcards hub: tile/button `Слушать`.
- Entry from collection: CTA `Слушать эти карточки`, using the same `source/filter` context as current training.
- Setup screen with selectable card sources, reusing the same source model as swipe training.
- Player screen with:
  - visible current card;
  - auto front speech;
  - auto flip;
  - auto back speech;
  - play/pause;
  - previous/next;
  - replay current side;
  - progress `N / total`;
  - finish screen with `Повторить` and `К наборам`.
- Simple settings on the setup/player screen:
  - recall pause: 2s / 4s / 6s;
  - next pause: 1s / 2s / 3s;
  - shuffle on/off.

### Later

- Loop mode.
- Weak-card playlist.
- Due-card playlist.
- Separate "front only" or "back first" mode.
- Sleep timer.
- Generated audio track / real background playback.
- Lock-screen controls.

## UX Flow

### Hub Entry

Add a second audio-oriented action near the current training tile:

- Training: active check, user answers.
- Listen: passive/low-effort repeat, app advances automatically.

Avoid technical copy. Use benefit language:

- `Слушать`
- `Автоповтор с паузами`

### Collection Entry

When `filteredCards.length > 0`, show two compact actions:

- `Тренироваться с этими карточками`
- `Слушать эти карточки`

Both should preserve the same `source/filter` route scope.

### Setup

Use the same source list mental model as `flashcards_swipe`:

- saved cards;
- custom cards;
- official packs;
- community packs.

Keep all available sources selected by default unless a route source is provided.

### Player

States:

- `idle`
- `front_speaking`
- `front_pause`
- `flipping_to_back`
- `back_speaking`
- `next_pause`
- `paused`
- `done`

Controls:

- play/pause as the primary button;
- previous/next;
- replay side;
- close/back;
- small settings button for pause durations.

Screen behavior:

- Keep the screen awake only while playing, if a lightweight Expo-safe option already exists in the project or is acceptable to add later. Otherwise leave it out of MVP.
- Stop speech on unmount, route back, pause, and source change.
- If user manually flips, stop current speech and update state deterministically.

## Technical Plan

### Step 1: Extract Shared Source Logic

Create `app/flashcards/trainingSources.ts`.

Move or expose reusable pieces from `app/flashcards_swipe.tsx`:

- `SourceKind`
- `TrainingSource`
- `TrainingCard`
- `buildOfficialTrainingSourcesFromIds`
- `buildCachedTrainingSources`
- `buildCommunitySources`
- `initialSelectionForSources`
- `filterCardsForRoute`
- `flashcardToCardItem`
- `customRawToCardItems`
- `packKey`
- subtitle/title helpers as needed

Keep swipe-specific logic in `flashcards_swipe.tsx`:

- decoys;
- prompts;
- swipe memory;
- mastery scoring;
- wrong/hint recovery;
- session draft.

### Step 2: Add Pure Audio Session Engine

Create `app/flashcards/audioSession.ts`.

Pure functions:

- `buildAudioDeck(cards, options)`
- `nextAudioStep(state, event)`
- `audioTextForSide(card, side, contentLang)`
- `audioLocaleForSide(card, side, studyTarget, contentLang)`

Reason: timers and speech are hard to test inside a component. The step engine should be unit-tested without React Native.

### Step 3: Add `/flashcards_audio`

Create `app/flashcards_audio.tsx`.

Responsibilities:

- parse `source`, `filter`, `owned` params;
- load sources via shared source module;
- render source setup;
- build deck;
- run timer/speech state machine;
- render card and controls;
- persist no long-term learning memory in MVP.

### Step 4: Wire Navigation

- In `app/flashcards.tsx`, add `openAudioMode`.
- In `FlashcardsCategoryHub`, add an audio tile/action, or evolve the current training tile into a two-action training/listen area.
- In `app/flashcards_collection.tsx`, add `openAudioMode` mirroring `openSwipeGame`.

### Step 5: Tracking

Count passive audio mode conservatively:

- On first front display per card in the session: `flashcard_view`.
- On automatic flip to back: `flashcard_flip`.
- On completion of all cards from saved list: consider `flashcards_session`, but only if behavior matches the existing achievement meaning.
- Do not emit `trainer_correct`.
- Do not update swipe memory.

### Step 6: Tests

Unit tests:

- `audioSession` step transitions.
- `audioTextForSide` front/back fallback.
- locale selection: front target language, back source/interface language.
- source extraction still dedupes and filters empty cards.
- route params select one source when passed.

Static/source contract tests:

- `/flashcards_audio` uses `useStudyTarget`.
- `/flashcards_audio` uses `flashcardContentLang`.
- `/flashcards_audio` stops audio on unmount.
- no `trainer_correct` event in audio route.
- no `expo-audio` or background plugin in MVP.

Manual QA:

- RU, UK, ES UI.
- dark/light/gold themes.
- saved/custom/official/community sources.
- route from hub.
- route from collection with `source/filter`.
- pause/resume mid-front.
- pause/resume during pause.
- manual next while speech is active.
- leave screen while speech is active.
- empty source list.
- long card text and long translations.
- Android responder behavior.

## Acceptance Criteria

- User can start audio mode from the flashcards hub.
- User can start audio mode from a collection/pack and it uses only the visible scoped cards.
- Audio mode speaks front and back automatically with configurable pauses.
- User can pause, resume, skip, go back, and replay without duplicate overlapping speech.
- Card visually flips automatically before speaking the back side.
- The app stops speaking when leaving the screen.
- Daily flashcard view/flip progress increments once per card per listening session.
- The mode works without native rebuild or new background audio permissions.
- The implementation keeps source locale and study target separate.

## Main Risks

- `expo-speech` callbacks may be inconsistent across Android/iOS. Mitigation: use our own timers as the primary session driver and treat speech callbacks as best-effort.
- Pauses may feel too slow or too fast. Mitigation: ship 2/4/6 recall pause and 1/2/3 next pause.
- Auto-selecting every pack may create huge sessions. Mitigation: show total count and add shuffle; later add session size.
- Duplicating source loading would create drift from swipe training. Mitigation: extract shared source module first.
- Passive mode may be mistaken for real mastery. Mitigation: copy and scoring should frame it as listening/review, not correctness.

## Recommended Implementation Order

1. Extract shared source loading from `flashcards_swipe.tsx`.
2. Add pure audio session engine and tests.
3. Build `/flashcards_audio` setup screen.
4. Build foreground player state machine.
5. Add hub and collection entry points.
6. Add tracking and achievement guardrails.
7. Run targeted Jest/static tests.
8. Run manual QA on device/emulator.

## Effort Estimate

MVP: 2-4 focused engineering days.

Polished version with stronger animation, saved preferences, first-run hints, and broad QA: 4-7 days.

Background/lock-screen playback remains out of scope.
