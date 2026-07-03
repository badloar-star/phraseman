# Cepicepi Generation Rules

These rules are mandatory for future Chains / "Цепи" CapCut generations.

## Project Safety

- User manual edits are sacred. Do not move, resize, retime, restyle, delete, or replace existing CapCut elements unless the user explicitly asks for that exact change.
- Before any native CapCut draft mutation, close CapCut, create a timestamped backup, edit mirrored files consistently, then run structural QA.
- If the user says to save the current project, create a snapshot backup only. Do not repair, add, regenerate, or improve anything in that operation.

## Chains Method

- This is the Chains method, not Venga.
- Phrases must be simple A1-A2.
- Chains are built as progressive phrase expansions: a short base phrase grows step by step with natural details.
- Do not make every phrase start with the same construction. Use varied subjects, verbs, places, time markers, and reasons.
- For 800-phrase packages, all 800 English phrases and all 800 Russian translations must be unique after normalization. No cycling, cloning, or padding smaller sets.
- English/Russian phrase pairs must pass the semantic translation alignment gate before TTS or CapCut insertion. Russian is a learning mirror, not a loose subtitle: if English contains a useful meaning unit such as `my`, `your`, time, place, negation, modal meaning, quantity, reason, or an important adjective/noun, Russian must show it; if Russian adds one, English must contain it. Example fail: `I need my jacket` / `Мне нужна куртка`; repair as `Мне нужна моя куртка` or rewrite English to `I need a jacket`.

## Three-Part Lesson Structure

- Part 1: English first, Russian translation second, English again.
- Part 2: the same chain material, but Russian first, then English, then English again with a second voice.
- Part 3: English only, without Russian text or Russian voiceover.
- For non-English variants, keep the same structure but replace English with the current target language. Example: French-Russian means Part 1 is French, Russian, French; Part 2 is Russian, French, French; Part 3 is French, French only with two different target-language voices.
- The user's wording "анг" in the Chains template means the target-language slot/order of the template, not permission to reinterpret timing. For French-Russian, the literal required order is Part 1 FR/RU/FR, Part 2 RU/FR/FR, Part 3 FR/FR.
- Part 2 audio pauses must mirror Part 1 spacing. English repetitions must not run together.
- Transition/bridge fragments between parts must keep their screen text and get natural OpenAI voiceover that fits the available duration.

## Voiceover

- Use OpenAI API voiceover for all generated phrase and transition audio.
- Voices must sound pleasant and human, not robotic Windows-style TTS.
- English voice 1 and English voice 2 must be distinct but both clear and attractive.
- Russian voice must be natural, warm, and clear.
- Audio must play at natural speed. Never slow down, stretch, or time-warp generated speech to fill a CapCut slot.
- CapCut phrase audio segments must keep `speed = 1`, `is_tone_modify = false`, and `source_timerange.duration == target_timerange.duration == the real WAV/material duration`. A longer `target_timerange.duration` is a slowdown/stretch bug and the QA gate must fail.
- If generated audio is too long for a fixed slot, regenerate shorter wording or a naturally faster TTS take. Do not solve it by slowing other clips, stretching clips, or changing CapCut playback speed without explicit user approval.

## On-Screen Text

- Never allow line wrapping in the middle of a word.
- Insert manual line breaks only at spaces or semantic phrase boundaries.
- If a text block cannot fit cleanly, shorten or rephrase it while preserving meaning.
- This rule applies to Russian, English, IPA/transcription, captions, CTA, intro, and transition text.
- Preserve the template's existing positions, sizes, fonts, and styles unless the user explicitly asks to change them.
- When replacing any CapCut text material, update the rich-text payload so `content.styles[0].range == [0, newText.length]`. Preserve the template font, size, fill, shadow, background, position, and scale; only the text and the full-text style range may change. The QA gate must fail if any new characters fall outside the styled range.
- Never change text segment `target_timerange`, `source_timerange`, `render_timerange`, start, duration, or placement while replacing generated phrase text. Text blocks are sacred timeline structure. The QA gate must compare phrase text tracks against the locked-good template and fail on any timing difference.
- Text must not jump between phrases. Align to the first correctly placed phrase elements.

## Background Videos

- Background videos must be real semantic stock video assets selected for the exact current phrase meaning from open-source stock APIs such as Pexels and Pixabay.
- Do not use intro clips, generic placeholders, CapCut template media, one broad query repeated across many phrases, or a tiny set of duplicated clips as phrase backgrounds.
- Each base phrase should have its own source asset. Reuse is allowed only for the same phrase repeated across lesson parts, unless the user explicitly approves a different cap.
- Generation reports must include query, provider, asset id, source title/tags when available, local file path, and source reuse count.
- The gate must fail when a background is not phrase-specific, media is missing, timings do not match phrase slots, or reuse exceeds the explicit cap.
- Every CapCut background material must have a resolvable `path` or CapCut draft-placeholder `media_path` pointing to the real local phrase-specific mp4. A visible timeline block with no resolvable media reference is a failure.
- Every phrase background segment must be visible and fully opaque (`alpha = 1`) with no alpha keyframes that fade it out.
- No visible CapCut preset, intro, template, or combination overlay such as `My presets` may cover the lesson phrase area after the intro boundary.
- Render stock videos as CapCut-friendly 1920x1080 H.264 yuv420p with no black bars. Scale only enough to remove bars.

## CTA / STA Inserts

- Do not touch CTA/STA inserts when the user says they are already in correct places.
- If CTA/STA placement changes are requested, close old gaps by shifting all affected timeline elements together, and open new gaps by moving all affected elements together. Never leave holes or overlaps.
- CTA/STA text must be written with a Cyrillic-capable font and verified for literal `?` replacement characters and mojibake such as `Ð`/`Ñ`. If any CTA/STA text becomes unreadable, restore only the CTA/STA text materials and do not touch phrase timing, audio, or backgrounds.

## QA Before Saying Done

- The locked-good baseline for the current Cepicepi project is saved in `.codex-tmp/capcut-backups/ЦЕПИ ЦЕПИ ЦЕПИ (1).LOCKED-GOOD-CURRENT-20260605_162149` with manifest `exports/chains/cepicepi_next_chains_a1a2_20260605/LOCKED_GOOD_CURRENT_STATE.json`. Future work must preserve this current-good state unless the user explicitly requests a specific change.
- Verify mirrored CapCut files: `draft_content.json`, `template-2.tmp`, and `Timelines/*/draft_content.json`.
- Verify all referenced media paths exist.
- Verify every phrase background material has a resolvable `path` or `media_path`.
- Verify every phrase background segment is visible and opaque.
- Verify no visible preset/intro/template overlay covers phrase backgrounds.
- Verify text has no mid-word line breaks.
- Verify every replaced text payload has full-length style coverage: `styles[0].range` starts at `0` and ends at the exact new text length.
- Verify CTA/STA text has no `????` replacement, mojibake, or unsupported-font rendering.
- Verify phrase audio is not slowed or stretched: every generated phrase audio segment has `speed = 1`, `is_tone_modify = false`, equal source/target durations, and duration matching the real WAV/material duration within tolerance.
- Verify phrase audio/text mapping matches the part rules.
- Verify semantic translation alignment: no missing English meaning units in Russian and no extra Russian meaning units unsupported by English.
- Verify background track count, segment count, source uniqueness/reuse, and timing alignment.
- Run `node scripts/chains_capcut_contract_check.mjs --draft-dir "<CapCut draft folder>" --template-dir "<locked-good/source template folder>" --report "<qa report path>"` before saying the project is ready. `status` must be `ready`, `styleRangeErrorCount` must be `0`, and `audioStretchErrorCount` must be `0`.
- Create or update a QA report and contact sheet for visual background review before claiming the work is ready.
