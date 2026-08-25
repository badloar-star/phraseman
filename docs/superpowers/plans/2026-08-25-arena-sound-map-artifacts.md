# Arena Sound Map Artifacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a self-contained editable HTML sound map and a visually verified A4 PDF covering 35 Arena sound moments with 105 Adobe Firefly prompts.

**Architecture:** A deterministic Python builder reads the current 28 Arena prompts and production catalog, appends the seven approved sound moments, validates the complete content model, writes a standalone HTML document, and prints that HTML to PDF with installed Chromium. Structural checks reopen the PDF and compare its content with the HTML; Poppler renders every page for visual inspection.

**Tech Stack:** Python 3, standard-library parsing and HTML escaping, Chromium headless PDF printing, pypdf, pdfplumber, Poppler.

---

### Task 1: Build and validate the 35-sound content model

**Files:**
- Create: `scripts/build_arena_sound_map.py`
- Read: `modules/arena/sound_catalog.ts`
- Read: `docs/arena/SOUND_PROMPTS.md`
- Read: `docs/superpowers/specs/2026-08-25-arena-sound-map-design.md`

- [ ] **Step 1: Define the builder contract and seven new events**

Create immutable records for `SoundSpec` and `PromptSet`. Embed complete A/B/C prompts and recommended parameters for:

```text
ar_versus_impact.mp3
ar_invite_sent.mp3
ar_invite_received.mp3
ar_invite_accepted.mp3
ar_reaction_send.mp3
ar_store_purchase.mp3
ar_store_equip.mp3
```

Each prompt must begin with the file stem and end with an explicit duration, dry/short-tail requirement, mono requirement, and no speech.

- [ ] **Step 2: Parse existing sources without modifying them**

Parse all 28 `ARENA_SOUNDS` rows from `modules/arena/sound_catalog.ts`. Parse the eight numbered sections and A/B/C prompt paragraphs from `docs/arena/SOUND_PROMPTS.md`. Prefix existing prompts with their file stem and use catalog duration/volume/cooldown/priority as production truth.

- [ ] **Step 3: Add exact content invariants**

The builder exits non-zero unless all assertions pass:

```python
assert len(sounds) == 35
assert len({sound.file for sound in sounds}) == 35
assert sum(len(sound.prompts) for sound in sounds) == 105
assert all(set(sound.prompts) == {"A", "B", "C"} for sound in sounds)
assert all(prompt.startswith(sound.stem) for sound in sounds for prompt in sound.prompts.values())
assert sum(sound.integration == "wired" for sound in sounds) == 27
assert sum(sound.integration == "trigger_required" for sound in sounds) == 8
```

- [ ] **Step 4: Run validation before rendering**

Run:

```powershell
& 'C:\Users\badlo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts\build_arena_sound_map.py --validate-only
```

Expected:

```text
PASS: 35 sounds, 105 prompts, 27 wired, 8 trigger-required
```

### Task 2: Generate the standalone editable HTML

**Files:**
- Modify: `scripts/build_arena_sound_map.py`
- Create: `output/pdf/zvukovaya_karta_arena_phraseman.html`

- [ ] **Step 1: Implement the visual system**

Write one standalone HTML file with embedded CSS, no JavaScript, no external network resources, A4 `@page` rules, Arial/Arial Black fallbacks, black display type, amber `#B8750E`, warm-neutral cards, status pills, monospaced file names, page-break protection for sound cards, and print-color adjustment.

- [ ] **Step 2: Render the complete document flow**

Render cover metrics, usage instructions, technical audio requirements, ten-section journey map, 35 sound cards, integration legend, final production table, implementation order, and a short intentionally-reused/global-sound note.

- [ ] **Step 3: Generate and validate HTML**

Run:

```powershell
& 'C:\Users\badlo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts\build_arena_sound_map.py --html-only
```

Expected: `output/pdf/zvukovaya_karta_arena_phraseman.html` exists and the builder reports `35 sounds / 105 prompts`.

- [ ] **Step 4: Check standalone constraints**

Run a focused Python check that reads the HTML and asserts: no `http://`, no `https://`, no `<script`, exactly 35 `data-sound-card` attributes, 105 `data-prompt` attributes, and all 35 file names.

### Task 3: Print the HTML to PDF and verify content

**Files:**
- Create: `output/pdf/zvukovaya_karta_arena_phraseman.pdf`
- Create: `tmp/pdfs/arena-sound-map/page-*.png`

- [ ] **Step 1: Mark the PDF operation exactly once**

Immediately before the first PDF authoring command run:

```powershell
node container_tools/mark_artifact_operation_started.mjs --operation-kind create --expected-output-count 1 --output-format pdf
```

Expected: successful artifact-operation marker.

- [ ] **Step 2: Print with installed Chrome**

Run headless Chrome with `--headless=new`, `--disable-gpu`, `--no-pdf-header-footer`, `--print-to-pdf-no-header`, and `--print-to-pdf=<absolute output path>` against the absolute `file:///` URL for the generated HTML.

Expected: one non-empty A4 PDF at `output/pdf/zvukovaya_karta_arena_phraseman.pdf` with no browser URL/date headers.

- [ ] **Step 3: Reopen and compare logical content**

Using pypdf/pdfplumber, assert that the PDF is readable, every page is approximately A4, the title is present, all 35 file names are present, the collision description includes the VS impact moment, and the extracted text contains 35 A, 35 B, and 35 C prompt labels.

- [ ] **Step 4: Render every PDF page**

Run:

```powershell
& 'C:\Users\badlo\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe' -png -r 120 output\pdf\zvukovaya_karta_arena_phraseman.pdf tmp\pdfs\arena-sound-map\page
```

Expected: one PNG per PDF page and no Poppler errors.

### Task 4: Visual QA and final verification

**Files:**
- Modify if necessary: `scripts/build_arena_sound_map.py`
- Regenerate: `output/pdf/zvukovaya_karta_arena_phraseman.html`
- Regenerate: `output/pdf/zvukovaya_karta_arena_phraseman.pdf`

- [ ] **Step 1: Inspect the cover, representative sound cards, collision card, and final table**

Reject clipping, overlapping text, broken Cyrillic, weak contrast, split cards, orphaned headings, browser headers/footers, missing page numbers, or inconsistent margins.

- [ ] **Step 2: Inspect all remaining rendered pages**

Use contact sheets of no more than eight pages each and inspect every page. If any defect is found, change only the deterministic builder, regenerate both stable outputs, rerender every page, and repeat inspection.

- [ ] **Step 3: Run final deterministic checks**

Run builder validation and PDF logical validation again. Expected final result:

```text
PASS: HTML standalone
PASS: 35 sounds, 105 prompts, 27 wired, 8 trigger-required
PASS: PDF readable, A4, all sound IDs present
PASS: visual inspection complete
```

- [ ] **Step 4: Review task-specific changes**

Run:

```powershell
git status --short -- scripts/build_arena_sound_map.py output/pdf/zvukovaya_karta_arena_phraseman.html output/pdf/zvukovaya_karta_arena_phraseman.pdf docs/superpowers/specs/2026-08-25-arena-sound-map-design.md docs/superpowers/plans/2026-08-25-arena-sound-map-artifacts.md
```

Expected: only the plan, approved specification, builder, and two requested outputs are reported for this task. All unrelated working-tree changes remain untouched.
