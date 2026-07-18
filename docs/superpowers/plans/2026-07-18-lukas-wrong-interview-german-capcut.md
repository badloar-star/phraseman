# Lukas Wrong Interview German CapCut Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a complete standalone German–Russian CapCut lesson about Lukas entering the wrong job interview, with 49 phrases, three teaching voices, a rebuilt intro, 15 polaroids, and a separately verified native CapCut project.

**Architecture:** Build every text, audio, and visual asset in an isolated source package while CapCut remains open. Validate the package independently, then close CapCut once, clone the English native draft, apply deterministic JSON transformations to the clone, synchronize all native mirrors, and run structural plus visual gates before reopening.

**Tech Stack:** Python 3, ElevenLabs REST API, FFmpeg/ffprobe, Pillow, Codex built-in image generation, native CapCut 8.9 JSON, pytest/unittest-style contract scripts.

---

### Task 1: Create the isolated source package and phrase contract

**Files:**
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/phrases.json`
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/phrases.txt`
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/validate_package.py`

- [ ] **Step 1: Write the phrase validator first**

```python
def validate_rows(rows):
    assert len(rows) == 49
    assert [row["index"] for row in rows] == list(range(1, 50))
    assert len({row["de"] for row in rows}) == 49
    assert len({row["ru"] for row in rows}) == 49
    assert all(row["ipa"].startswith("/") and row["ipa"].endswith("/") for row in rows)
```

- [ ] **Step 2: Run the empty-package validator**

Run:

```powershell
python "C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/validate_package.py"
```

Expected: failure because `phrases.json` does not yet contain 49 rows.

- [ ] **Step 3: Write the approved 49-sentence story**

Each row contains `index`, `de`, `ru`, `ipa`, `scene`, and `speaker_notes`.
The flattened `phrases.txt` contains exactly 147 UTF-8 lines: German, then
Russian, then IPA.

- [ ] **Step 4: Validate content and encoding**

Run the validator again. Expected: `49 rows; 147 lines; encoding OK`.

### Task 2: Discover and preview teaching voices

**Files:**
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/voice_pipeline.py`
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/voice_manifest.json`
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/voice_previews/`

- [ ] **Step 1: Implement read-only voice discovery**

```python
def find_unique_voice(voices, normalized_name):
    matches = [voice for voice in voices if normalize(voice["name"]) == normalized_name]
    if len(matches) != 1:
        raise RuntimeError(f"Expected one voice, found {len(matches)}")
    return matches[0]
```

Paginate `/v2/voices` correctly and resolve the user-owned `RusTeacher`.

- [ ] **Step 2: Generate male remix previews**

Use Liam `TX3LPaxmHKxFdv7VOQHJ` with
`POST /v1/text-to-voice/{voice_id}/remix`. Save all preview MP3 files and IDs;
do not create a permanent voice until the best preview is selected.

- [ ] **Step 3: Generate female Voice Design previews**

Use `POST /v1/text-to-voice/design` with native Standard German, warm teacher
delivery, stable pacing, and clean studio sound. Save all preview MP3 files and
IDs.

- [ ] **Step 4: Select deterministically and create two voices**

Reject previews with clipping, non-German accent, unstable pitch, or rushed
delivery. Create the selected male and female voices through
`POST /v1/text-to-voice`; record IDs and descriptions in the manifest.

### Task 3: Generate and validate all narration audio

**Files:**
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/audio/female_de/`
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/audio/russian/`
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/audio/male_de/`
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/audio/story/`
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/audio/intro/`
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/audio_manifest.json`

- [ ] **Step 1: Generate a dry-run request manifest**

The manifest must contain 49 female German, 49 Russian, 49 male German, one
complete German story, and one Russian intro request before any paid batch.

- [ ] **Step 2: Generate the complete audio set**

Use `eleven_multilingual_v2` for stable long-form speech and explicit German or
Russian language codes. Use checkpoint hashes so reruns skip already valid
files.

- [ ] **Step 3: Probe every file**

```python
duration = ffprobe_duration(path)
assert duration > 0
assert path.stat().st_size > 1024
```

Expected: 149 valid MP3 outputs and zero missing or duplicate request hashes.

### Task 4: Rebuild deterministic intro assets

**Files:**
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/intro/intro_script.json`
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/intro/how_video_works.png`
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/intro/intro_manifest.json`

- [ ] **Step 1: Write the Russian intro script**

The script must introduce German, explain the listen/analyse/consolidate
structure, hook the wrong-interview story, and fit the existing 31.8-second
sequence.

- [ ] **Step 2: Render the instructional card deterministically**

Use Pillow with Cyrillic-capable fonts. Replace every reference to English with
German while preserving the three-column hierarchy.

- [ ] **Step 3: Validate raster text and dimensions**

Expected: `1672x940`, no mojibake, no replacement characters, and all text
inside measured safe areas.

### Task 5: Generate the 15-scene visual package

**Files:**
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/polaroids/CHARACTER_STYLE_BIBLE.md`
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/polaroids/01.webp` through `15.webp`
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/polaroids/manifest.json`
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/polaroids/contact_sheet.jpg`

- [ ] **Step 1: Lock character and location identity**

Define Lukas, Frau Keller, the Berlin office building, and the language school.
Create reference images before scene production.

- [ ] **Step 2: Generate exactly 15 semantic scenes**

Use Codex built-in image generation only. Save each result immediately; never
use a project OpenAI API key and never create speculative extra finals.

- [ ] **Step 3: Compress and map scenes**

Convert finals to square WebP and map all 49 phrase indices to exactly one of
the 15 scenes.

- [ ] **Step 4: Build the contact sheet gate**

Reject identity drift, duplicate composition, unreadable generated text,
incorrect chronology, or any missing phrase coverage.

### Task 6: Build the deterministic native CapCut transformer

**Files:**
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/lukas_capcut_builder.py`
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/test_lukas_capcut_builder.py`

- [ ] **Step 1: Write failing structural contract tests**

```python
assert track_counts(after) == track_counts(before)
assert segment_ids(after) == segment_ids(before)
assert segment_starts(after) == segment_starts(before)
assert all_native_mirrors_match(project_copy)
```

- [ ] **Step 2: Implement text fitting**

Measure actual glyph width for Bodoni, Segoe UI Light, Tahoma Bold, and intro
fonts. Insert line breaks only at spaces. Fail if any word or line cannot fit.

- [ ] **Step 3: Implement role-based replacements**

Replace exactly 98 German, 98 Russian, 98 IPA, 49 counters, 245 phrase-audio
segments, the full-story narration, intro narration, intro text/assets, and 15
polaroids. Preserve starts, animation materials, transforms, and render order.

- [ ] **Step 4: Dry-run against a copied JSON fixture**

Expected: all content gates pass and the source JSON hash remains unchanged.

### Task 7: Create and install the separate native project

**Files:**
- Create: `%LOCALAPPDATA%/CapCut/User Data/Projects/com.lveditor.draft/ЛУКАС НЕ ТО СОБЕСЕДОВАНИЕ DE/`

- [ ] **Step 1: Close CapCut and verify process exit**

Use a normal window close, wait for autosave, then confirm no `CapCut.exe`
process remains.

- [ ] **Step 2: Verify the English mirrors and back up**

All four source mirrors must be byte-identical. If not, stop and repair the
source-copy boundary before cloning.

- [ ] **Step 3: Clone and transform only the German project**

Run the builder against the new native copy. Never point a write command at
`АННА ПОЕЗД-copy`.

- [ ] **Step 4: Verify mirror hashes and media paths**

Expected: four identical draft hashes and zero missing media paths.

### Task 8: Final verification and handoff

**Files:**
- Create: `C:/Users/badlo/OneDrive/Desktop/BANK/VID/LUKAS WRONG INTERVIEW DE/QA_REPORT.md`

- [ ] **Step 1: Run focused structural gates**

Check counts, IDs, starts, durations, speed, text roles, audio roles, encoding,
manual wrapping, polaroid coverage, and intro replacements.

- [ ] **Step 2: Reopen CapCut and visually inspect**

Review intro, full-story pass, phrases 1/25/49 in both teaching sections,
polaroid transitions, section cards, CTA, and ending.

- [ ] **Step 3: Record evidence**

Write exact pass/fail evidence and remaining human-listening risks in
`QA_REPORT.md`. Do not claim completion while any gate is open.
