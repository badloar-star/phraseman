# Learning V2 — multilingual content generation and optional practice

**Date:** 2026-07-22  
**Status:** owner-approved product direction; implementation not authorised by this document  
**Scope:** Learning V2 curriculum generation, Admin V2 Content Studio, dynamic optional practice and reward separation

## 1. Mission

Admin V2 must make creation of a high-quality course feel close to a one-button
operation while enforcing a strict multilingual content pipeline underneath.
The system must let an owner who does not know the target language generate,
inspect and release a course with bounded risk. It must not treat one model's
unreviewed output as publishable truth.

The app presents one coherent learning path with twelve required micro-sessions
per unit and a small number of dynamic optional practice nodes. Optional nodes
prioritise speaking, due review and mistake repair, may award economy stars,
and never manufacture learning mastery.

## 2. Course structure

- Pilot course: 32 communicative units.
- Unit: 12 required micro-sessions plus up to two adaptive sessions.
- Required path: `Understand (4) -> Use (4) -> Master (4)`.
- Micro-session: 7–9 exercise cards, 3–4 interaction modes, normally 2.5–4 minutes.
- The counts are pinned pilot hypotheses, not values selected freely by a model.
- A unit is built around one observable `can do` outcome. Grammar, vocabulary,
  pronunciation and writing-system work exist only to serve that outcome.

The generator must first build a shared content graph and then compile sessions.
It must not independently generate twelve unrelated phrase lists.

## 3. Pedagogic modes and UI engines

The course supports fourteen pedagogic modes:

1. meaning/intention choice without situational images;
2. listen and choose meaning;
3. pair matching;
4. form, sound, stress or tone discrimination;
5. sentence assembly;
6. cloze;
7. independent typed or spoken retrieval;
8. dictation;
9. repeat/shadowing;
10. guided spoken response;
11. scripted/branching dialogue;
12. microstory;
13. Mistake Lab;
14. communicative mission/roleplay.

They are rendered through eight reusable UI engines: Choice, Match, Arrange,
Input, Speech, Dialogue, Story and Mission. Mistake Lab reuses the same engines
with mistake-derived content. Microstories and free missions remain later-stage
capabilities until their evaluation and fallback infrastructure is proven.

## 4. Multilingual generation pipeline

The Admin happy path is intentionally short:

1. select target language;
2. select learner/explanation language;
3. select level and course goal;
4. press `Create course`;
5. review exceptions and a live preview;
6. approve a versioned release.

The button starts a gated pipeline:

1. **Language profile.** Script, direction, tokenisation, morphology, word
   order, register/politeness, regional variants, phonology, tones/stress,
   TTS/STT capabilities and accessibility alternatives.
2. **Outcome graph.** Thirty-two ordered `can do` outcomes with prerequisites,
   recycling and chapter checkpoints.
3. **Language-native content bank.** Natural target-language meanings,
   constructions and phrase chunks. A course must not be created by blindly
   translating an English phrase list.
4. **Structured content objects.** Each item contains intent, target text,
   natural translation, optional literal gloss, accepted variants, rejected
   variants, morphology, register, region, audio/pronunciation data, typical
   errors, distractor rationale, difficulty, prerequisites, compatible modes
   and outcome links.
5. **Session compiler.** The same approved item progresses through meaning,
   comprehension, cued retrieval, assembly, independent retrieval, speech,
   dialogue/transfer and delayed retrieval with deliberate hint fading.
6. **Validation.** Schema, references, duplicates, answer closure, semantic
   equivalence, grammar, naturalness, level, distractors, audio, accessibility,
   script-specific constraints and whole-season graph checks.
7. **Independent quality pass.** Disagreement and low-confidence items are
   quarantined. Admin shows exceptions, reasons, back-translation and live
   exercise preview instead of thousands of rows.
8. **Scoped release.** Generate and validate E1 first, then E1–E8, then the
   full 32-unit season. Every release is immutable, versioned and rollbackable.

No model may auto-publish directly to production. For a new language, certify
the language profile, E1 and a representative sample with a competent native
reviewer before widening the release. This bounded review replaces full manual
editing but does not pretend that AI alone guarantees correctness.

## 5. Writing-system packs

The 32-unit communicative course remains shared in shape. A language profile
may attach a dedicated Script Curriculum without rewriting the core.

- Chinese: pinyin, tones, Hanzi recognition, components/radicals, stroke order
  and meaning–sound–character links.
- Japanese: hiragana, katakana, kanji readings/components, furigana fading and
  politeness contrasts.
- Korean: jamo, Hangul block composition, sound discrimination and connected
  speech changes.
- Arabic/Hebrew and other RTL systems: direction, joining/forms, diacritics and
  safe mixed-direction rendering.
- Further profiles may cover Devanagari, Thai, Greek, Cyrillic and other
  systems through the same capability contract.

Script activities use the established engines wherever possible. They are not
permission to add unrelated mini-games or clutter the primary path.

## 6. Dynamic optional practice

Each unit may expose at most one or two optional side nodes at a time. The same
practice can also be offered after a required session. Closing the offer has no
penalty and optional nodes never block progression.

Initial optional speech experiences:

- **Quick Speak:** 60–90 seconds, 5–7 short independent responses.
- **Echo & Rhythm:** model audio, immediate repetition, focused chunk retry.
- **Listen & Respond:** hear a prompt and produce a meaningful short response.

Later capabilities may add pronunciation focus, spoken chains, timed dialogue,
personal-plan speaking and language-specific tone/script practice.

Dynamic selection uses the approved content bank and combines current-unit
items, due retrieval, prior mistakes and eligible personal-plan items. Exact
mixes are calibrated product hypotheses. It must not create a separate random
phrase universe.

The map owns generic optional slots rather than hard-coded mode names. A new
mode registers supported languages/scripts, accepted content capabilities,
runtime engine, microphone/network requirements, offline/accessibility routes,
eligibility rules, expected duration, reward policy and evidence semantics.

## 7. Errors and adaptive return

An error produces visible but non-shaming feedback and an escalating recovery:

1. neutral hint;
2. useful contrast;
3. show, hide and require reconstruction;
4. return after several cards, preferably through a different compatible mode;
5. schedule Mistake Lab and later delayed retrieval when appropriate.

Store the reason, not only the failed phrase: meaning, literal transfer,
morphology, word order, article, listening, pronunciation, script, tone or
stress. Corrective feedback is immediate; evidence of durable learning is
separate and may require later lower-support retrieval.

## 8. Star economy decision

The owner approved unlimited optional earning without a hard daily cap, paired
with diminishing rewards for repeating the same easy material.

- New, due and mistake-repair practice receives full reward eligibility.
- Independent spoken retrieval may be weighted above recognition.
- Exact low-value repetition gradually earns less.
- Rotation should offer harder, due or novel material rather than abruptly
  blocking the learner.
- Speech skip or unavailable microphone carries no penalty.
- Economy stars, content access and learning mastery are separate domains.
- Earned or purchased stars must never mark a phrase, unit, pronunciation goal
  or CEFR descriptor as mastered.

Exact reward values, decay curve and reset window remain explicit product
hypotheses for the pilot and require anti-frustration and anti-exploit telemetry.

## 9. Acceptance criteria for later implementation

- Admin has one simple default generation path and hides advanced controls.
- A new language cannot generate content without an approved language profile.
- The pipeline creates E1, E1–E8 and E1–E32 only through scoped gates.
- Every exercise is traceable to a structured content item and `can do` outcome.
- Invalid, disputed or low-confidence items cannot enter an approved release.
- The app can render the required path without optional nodes.
- At most two optional nodes are visible per unit at one time.
- Optional practice cannot mutate mastery or block progression.
- Repetition decay is deterministic, account-scoped and testable.
- Chinese, Japanese, Korean and RTL fixtures prove script expansion.
- Releases support exact preview, immutable versioning, pause and rollback.

## 10. Out of scope for this approval

- Production deployment or content publication.
- Final star values or decay formula.
- A claim that AI removes all need for native-language launch validation.
- Free-form AI roleplay before safety, evaluation, privacy and fallback gates.
- Importing the current Kimi prototype into application source.
