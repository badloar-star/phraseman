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

## Three-Part Lesson Structure

- Part 1: English first, Russian translation second, English again.
- Part 2: the same chain material, but Russian first, then English, then English again with a second voice.
- Part 3: English only, without Russian text or Russian voiceover.
- Part 2 audio pauses must mirror Part 1 spacing. English repetitions must not run together.
- Transition/bridge fragments between parts must keep their screen text and get natural OpenAI voiceover that fits the available duration.

## Voiceover

- Use OpenAI API voiceover for all generated phrase and transition audio.
- Voices must sound pleasant and human, not robotic Windows-style TTS.
- English voice 1 and English voice 2 must be distinct but both clear and attractive.
- Russian voice must be natural, warm, and clear.
- If generated audio is too long for a fixed slot, fit it carefully without making it sound unnaturally rushed.

## On-Screen Text

- Never allow line wrapping in the middle of a word.
- Insert manual line breaks only at spaces or semantic phrase boundaries.
- If a text block cannot fit cleanly, shorten or rephrase it while preserving meaning.
- This rule applies to Russian, English, IPA/transcription, captions, CTA, intro, and transition text.
- Preserve the template's existing positions, sizes, fonts, and styles unless the user explicitly asks to change them.
- Text must not jump between phrases. Align to the first correctly placed phrase elements.

## Background Videos

- Background videos must be real semantic stock video assets selected for the exact current phrase meaning from open-source stock APIs such as Pexels and Pixabay.
- Do not use intro clips, generic placeholders, CapCut template media, one broad query repeated across many phrases, or a tiny set of duplicated clips as phrase backgrounds.
- Each base phrase should have its own source asset. Reuse is allowed only for the same phrase repeated across lesson parts, unless the user explicitly approves a different cap.
- Generation reports must include query, provider, asset id, source title/tags when available, local file path, and source reuse count.
- The gate must fail when a background is not phrase-specific, media is missing, timings do not match phrase slots, or reuse exceeds the explicit cap.
- Render stock videos as CapCut-friendly 1920x1080 H.264 yuv420p with no black bars. Scale only enough to remove bars.

## CTA / STA Inserts

- Do not touch CTA/STA inserts when the user says they are already in correct places.
- If CTA/STA placement changes are requested, close old gaps by shifting all affected timeline elements together, and open new gaps by moving all affected elements together. Never leave holes or overlaps.

## QA Before Saying Done

- Verify mirrored CapCut files: `draft_content.json`, `template-2.tmp`, and `Timelines/*/draft_content.json`.
- Verify all referenced media paths exist.
- Verify text has no mid-word line breaks.
- Verify phrase audio/text mapping matches the part rules.
- Verify background track count, segment count, source uniqueness/reuse, and timing alignment.
- Create or update a QA report and contact sheet for visual background review before claiming the work is ready.
