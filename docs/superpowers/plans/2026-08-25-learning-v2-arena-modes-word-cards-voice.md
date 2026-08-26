# Learning V2 Arena Modes, Word Cards, and Voice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make English Learning V2 session 1 use all seven non-repeating Arena-styled modes, interleave canonical flip word cards at first use, and reuse the ordinary-lesson hold-to-talk equalizer/footer.

**Architecture:** Keep Learning V2 content/evaluation contracts independent from Arena match state. Reuse the shared V2 UI primitives that Arena already consumes, add a pure interaction-driven word-card coordinator, and adapt the canonical `PhraseCard` and `SpeakingPanel` into the direct session player. Only session 1 source may change; the sequence gate becomes a permanent contract for future sessions.

**Tech Stack:** React Native, Expo Router, React Native Reanimated, `components/ui/v2_ui`, `PhraseCard`, `SpeakingPanel`, TypeScript `tsx` focused gates.

---

### Task 1: Lock the owner contracts with RED gates

**Files:**
- Create: `tests/learning_v2_session_mode_sequence_gate.ts`
- Create: `tests/learning_v2_interleaved_word_card_gate.ts`
- Create: `tests/learning_v2_arena_visual_primitives_gate.ts`
- Modify: `tests/learning_v2_lesson1_session_01_runtime_native_gate.ts`

- [ ] Write a real session-1 package gate asserting `new Set(families).size === 7` and every `families[i] !== families[i - 1]`.
- [ ] Write a source/runtime contract gate rejecting `intro_completed` queue draining and requiring a practice-index trigger.
- [ ] Write a renderer contract gate requiring `V2Chip`/`V2Cta`/`useTournamentPalette` across all seven families, real `PhraseCard` in the overlay, and `SpeakingPanel`/`VoiceEqualizer` lineage in the player.
- [ ] Run each with `npx tsx <file>` and confirm RED for the missing behavior, not syntax errors.

### Task 2: Replace the post-intro word queue with an interaction coordinator

**Files:**
- Create: `app/learning_v2_interleaved_new_word_flow_v1.ts`
- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Test: `tests/learning_v2_interleaved_word_card_gate.ts`

- [ ] Define pure state `{ seenIds, pendingId }` and event `practice_reached` that opens only an unseen encounter attached to the current interaction.
- [ ] Make `continue` mark the pending lexical item seen without incrementing practice.
- [ ] Remove the `practiceActivated = introDone && queue completed` boundary; practice activates immediately after intro and the overlay gates only its current interaction.
- [ ] Run the focused gate and existing preview/device-run gates to GREEN.

### Task 3: Render the exact flashcard model

**Files:**
- Modify: `components/learning-v2/LearningV2NewWordEncounterOverlay.tsx`
- Test: `tests/learning_v2_interleaved_word_card_gate.ts`

- [ ] Replace the custom card body with `PhraseCard mode="view"`.
- [ ] Feed front word/transcription and a custom back containing exact meaning plus approved playful line.
- [ ] Wire the existing `onPlayAudio` into `onSpeakFront`, keep the top-right speaker owned by `PhraseCard`, and place bookmark + `Дальше` below it.
- [ ] Preserve blocking accessibility, 44px controls, entry motion and reduced-motion behavior.
- [ ] Run overlay/source contracts to GREEN.

### Task 4: Move all mode visuals to Arena V2 primitives

**Files:**
- Modify: `modules/learning-v2/modes/phrase_builder_mode_v1.tsx`
- Modify: `modules/learning-v2/modes/listen_choose_mode_v1.tsx`
- Modify: `modules/learning-v2/modes/sound_contrast_mode_v1.tsx`
- Modify: `modules/learning-v2/modes/context_gap_grammar_mode_v1.tsx`
- Modify: `modules/learning-v2/modes/speed_match_mode_v1.tsx`
- Modify: `modules/learning-v2/modes/listen_build_dictation_mode_v1.tsx`
- Modify: `modules/learning-v2/modes/scripted_repeat_compare_mode_v1.tsx`
- Test: `tests/learning_v2_arena_visual_primitives_gate.ts`

- [ ] Replace local answer/tile implementations with shared `V2Chip` while preserving each mode's selected/correct/wrong state.
- [ ] Replace explicit mode actions with shared `V2Cta` where required by that mode.
- [ ] Use `useTournamentPalette`/`V2Card` for Arena-equivalent depth and active-theme colors.
- [ ] Keep audio, IPA, hidden target, pair-grid, dictation and voice state contracts intact.
- [ ] Run the visual-primitives and runtime-native gates to GREEN.

### Task 5: Make session 1 use seven alternating modes

**Files:**
- Modify: `modules/learning-v2/content/source/episode_01_session_01_mode_native_v1.ts`
- Modify only if required by the package projection: `modules/learning-v2/content/source/session_package_from_shard_v1.ts`
- Test: `tests/learning_v2_session_mode_sequence_gate.ts`

- [ ] Assign all 17 existing practice contacts to mode-native families so all seven appear and no adjacent pair matches.
- [ ] Add complete `sound_contrast` payloads rather than a renamed generic interaction.
- [ ] Preserve word-first order, exact targets, diagnostic traps, locale meanings and interaction count.
- [ ] Run the sequence, word-first, mode-native and preview package gates to GREEN.

### Task 6: Reuse canonical ordinary-lesson voice and footer

**Files:**
- Modify: `app/learning_v2_direct_session_player_v1.tsx`
- Modify: `app/learning_v2_session_copy.ts`
- Test: `tests/learning_v2_lesson1_session_01_runtime_native_gate.ts`

- [ ] Replace the custom Learning V2 voice presentation with `SpeakingPanel presentation="inline"` and the same hold state used by `app/lesson1.tsx`.
- [ ] Resolve the expected target from the current mode payload and feed successful transcript/score into the existing evaluator.
- [ ] Render the canonical centered `Устно` control; remove only the explicitly named global `Пропустить`, `Проверить`, theory and hint controls.
- [ ] Prove every native mode still has a reachable completion path.
- [ ] Run runtime-native, voice source-contract and focused ESLint checks to GREEN.

### Task 7: Persist the new global rule and verify safely

**Files:**
- Modify: `docs/v2/СТАРТ В2.md`
- Modify: `docs/v2/MODE_NATIVE_AUTHORING_CONTRACT.ru.md`
- Modify: `docs/v2/HANDOVER.md`
- Modify: `package.json` only if a new focused gate needs a script entry

- [ ] Record the owner decisions: three intro pages, all seven modes per ordinary session, no adjacent repeated family, Arena V2 visuals, interaction-triggered `PhraseCard`, canonical voice/footer.
- [ ] Run fresh preflight, all new `tsx` gates, existing focused preview/runtime/mode-native gates and focused ESLint.
- [ ] Keep production status at `HOLD` for genuine missing published audio/parity receipts; do not weaken those gates.
- [ ] Leave session 1 `DRAFT` for physical-phone owner review; do not open session 2.

No commit step is included because repository policy and the owner require an explicit separate command before commit/push.
