# MAYMAY Pipeline

This file is the source of truth for the MAYMAY CapCut/TTS pipeline. If the user says "MAYMAY", "меймей", "найди пайплайн меймей", or asks to make a new MAYMAY video/package, read this file first and follow it exactly.

## Current Purpose

MAYMAY builds 30 short CapCut videos for English learning. Each video has exactly 20 English phrase/preposition/phrasal-verb items and 20 matching Russian translations. The template is split into two 15-video CapCut projects because each project carries 300 Russian audio/text items and 300 English audio/text items.

Current native CapCut projects:

- `C:\Users\badlo\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\MAYMAY` = pack 01.
- `C:\Users\badlo\AppData\Local\CapCut\User Data\Projects\com.lveditor.draft\MAYMAY-copy` = pack 02.
- `MAYMAY-copy-copy` is a duplicate copy, not the canonical second project unless the user explicitly names it.

Current desktop pack folders:

- `C:\Users\badlo\OneDrive\Desktop\MAYMAY_300RU_300EN_PACK_01`
- `C:\Users\badlo\OneDrive\Desktop\MAYMAY_300RU_300EN_PACK_02`

Canonical helper scripts:

- `content/scripts/MAYMAY_generate_openai_tts.py`
- `content/scripts/MAYMAY_code_300_300_safe.py`

## Category Plan

Each category has 20 phrases. Keep this order.

Pack 01 categories:

1. ON
2. AT
3. FOR
4. TO
5. BY
6. IN
7. OUT
8. UP
9. DOWN
10. OFF
11. OVER
12. WITH
13. FROM
14. ABOUT
15. INTO

Pack 02 categories:

1. AWAY
2. BACK
3. AROUND
4. THROUGH
5. ACROSS
6. AFTER
7. BEFORE
8. UNDER
9. AGAINST
10. BETWEEN
11. WITHOUT
12. WITHIN
13. ALONG
14. AHEAD
15. ASIDE

## Phrase Rules

- Exactly 30 sets total, exactly 20 items per set.
- Prefer phrasal verbs and common preposition phrases: `turn on`, `look at`, `ask for`, `go through`, etc.
- The phrase set must feel like one category. Do not mix random grammar categories inside one video.
- English phrases should usually be one or two words. Three words are allowed only when the phrase is natural and useful.
- Russian translations must match the English order one-to-one.
- No duplicates inside the 600 English phrases unless the user explicitly asks for repeats.
- Save each pack as one `phrases.txt` with exactly 600 non-empty lines:
  - Lines 1-300: Russian.
  - Lines 301-600: English.
  - Category-major order: 20 lines for category 1, then 20 for category 2, etc.

## TTS Rules

Use OpenAI API TTS, not CapCut TTS.

Default TTS settings from `content/scripts/MAYMAY_generate_openai_tts.py`:

- Model: `gpt-4o-mini-tts`
- Format: `mp3`
- Russian voice: `marin`
- English voice: `coral`
- Russian instruction: warm calm Russian language-teacher tone, clear native pronunciation, natural conversational speed, not slow and not fast, say only the phrase.
- English instruction: warm calm English language-teacher tone, clear pronunciation for learners, natural conversational speed, not slow and not fast, say only the phrase.

Folder layout is strict:

- Folder `1` = Russian audio, `1.mp3` through `300.mp3`.
- Folder `2` = English audio, `1.mp3` through `300.mp3`.

Do not reverse the physical folder meaning. The JSON updater handles the template slot swap internally.

## JSON Update Rules

Use `content/scripts/MAYMAY_code_300_300_safe.py` as the canonical `code.py` in each pack folder.

The updater is allowed to change only:

- Audio material paths/names/durations.
- Audio segment `source_timerange.duration` and `target_timerange.duration`, using the full real audio duration.
- Text material `content.text` and style `range` values needed for the new text.
- Compound title text inside `materials.drafts`.

The updater must not change:

- Start positions.
- Segment order.
- Number of tracks or segments.
- Text box position, size, transform, effects, font, color, animations, or frame.
- Video/background segments.
- Any non-requested CapCut element.

Audio must be placed whole at the original start point. Never insert a new file into an old shorter slot without updating the segment duration to the full MP3 duration.

Template audio slot mapping is intentionally swapped:

- Folder `2` English audio goes into the slots that previously used folder 1.
- Folder `1` Russian audio goes into the slots that previously used folder 2.
- Starts stay exactly as they were.

## Compound Category Title

Every video's compound intro/title must show the category, not the old question "Как хорошо ты знаешь английский?" or "How well do you know SPANISH?"

Required label format:

```text
ФРАЗЫ
С ON
```

Replace `ON` with the current category. The newline is manual and mandatory. Do not rely on CapCut automatic wrapping. Do not resize the selected box/frame.

When editing a native CapCut project, update all mirrors consistently:

- Root `draft_content.json`
- Root `template-2.tmp`
- `Timelines/<id>/draft_content.json`
- `Timelines/<id>/template-2.tmp`
- `Timelines/<id>/attachment/patch/mini_draft.json` if present
- Matching `subdraft/<id>/draft_content.json` files

For each of the 30 visible compound clips, replace all old title layers inside that compound with the same category label while preserving each layer's own style.

## CapCut Safety Protocol

Before any native CapCut draft edit:

1. Check for running `CapCut` processes.
2. If CapCut is open, close it normally first.
3. Wait for autosave to settle.
4. Kill remaining CapCut helper processes only if they do not exit.
5. Create a timestamped backup of every file that will be changed.
6. Only then write JSON.

Never write native draft files while CapCut is running.

## Encoding Rules

- Always read and write text/JSON as UTF-8 or UTF-8-SIG.
- Do not use PowerShell `Get-Content`/`Set-Content` to rewrite Russian phrase files.
- Avoid any pipeline that can produce mojibake.
- Validation must fail on `Ð`, `Ñ`, `�`, or literal `????`.

## Required Validation

Before saying "готово", verify:

- Each pack has exactly 300 audio files in folder `1` and 300 in folder `2`.
- `phrases.txt` has exactly 600 non-empty lines.
- Root and timeline JSON files have no `Ð`, `Ñ`, `�`, or `????`.
- Active top-level phrase text matches `phrases.txt` exactly.
- Active 30 compound titles match the category order exactly.
- Old title text `How well` / `Как хорошо ты знаешь` is gone from active compounds.
- Audio segment durations match the full MP3 durations.
- Audio segment starts did not change.
- Track structure did not change except audio durations.

## Current Good State

As of 2026-06-25:

- `MAYMAY` pack 01 has category titles `ФРАЗЫ\nС ON` through `ФРАЗЫ\nС INTO`.
- `MAYMAY-copy` pack 02 has category titles `ФРАЗЫ\nС AWAY` through `ФРАЗЫ\nС ASIDE`.
- Both canonical projects pass:
  - 30 active compound title checks.
  - 150 category title text layers per project.
  - 0 old title layers in active compounds.
  - 0 phrase text mismatches.
  - 0 mojibake markers in root/timeline draft files.
