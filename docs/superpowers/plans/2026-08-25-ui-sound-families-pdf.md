# UI Sound Families PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce one polished Russian PDF containing the approved 34 Phraseman interaction-sound moments and three complete Adobe Firefly prompts per moment.

**Architecture:** A single deterministic Python builder owns the 34-entry content model, validates IDs and prompt counts, and renders the document with ReportLab. The final PDF is checked structurally with pypdf/pdfplumber and visually by rendering every page with pypdfium2.

**Tech Stack:** Python 3, ReportLab, pypdf, pdfplumber, pypdfium2, Pillow.

---

### Task 1: Create the deterministic PDF builder and content model

**Files:**
- Create: `scripts/build_ui_sound_families_pdf.py`
- Reference: `docs/superpowers/specs/2026-08-25-ui-sound-families-design.md`

- [ ] **Step 1: Define the 34-entry source model**

Create typed family and sound-moment records containing `id`, `title`, `trigger`, `duration`, `volume`, and prompts `A`, `B`, `C`. Each prompt begins with the stable ID without the `_v1`/`_v2` suffix.

- [ ] **Step 2: Add content invariants before rendering**

The builder must raise an error unless there are exactly 7 families, 34 unique IDs, 102 non-empty prompts, three prompt variants per moment, and every prompt begins with its stable sound ID.

- [ ] **Step 3: Implement the visual system**

Use A4 pages, Arial/Arial Bold/Arial Black from `C:/Windows/Fonts`, a white background, black display headings, mustard accent `#D9A321`, neutral rules, rounded metric and prompt cards, running header, footer title and page numbers. Avoid browser-generated timestamps and URLs.

- [ ] **Step 4: Implement document flow**

Render the cover, audit metrics, usage instructions, seven-family overview, arbitration hierarchy, all 34 prompt blocks, intentionally silent interactions, and the production checklist. Keep each sound block together where possible and repeat family context at section starts.

- [ ] **Step 5: Run the builder's internal validation**

Run:

```powershell
& 'C:\Users\badlo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts\build_ui_sound_families_pdf.py --validate-only
```

Expected: `PASS: 7 families, 34 moments, 102 prompts`.

### Task 2: Generate the PDF

**Files:**
- Create: `output/pdf/phraseman_ui_sound_families_2026-08-25.pdf`

- [ ] **Step 1: Mark the PDF artifact operation**

Run exactly once before the first PDF-authoring command:

```powershell
node container_tools/mark_artifact_operation_started.mjs --operation-kind create --expected-output-count 1 --output-format pdf
```

Expected: successful operation marker.

- [ ] **Step 2: Build the final PDF**

Run:

```powershell
& 'C:\Users\badlo\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' scripts\build_ui_sound_families_pdf.py
```

Expected: one PDF at `output/pdf/phraseman_ui_sound_families_2026-08-25.pdf` and a summary with page, family, moment and prompt counts.

- [ ] **Step 3: Check the logical PDF structure**

Use pypdf/pdfplumber to reopen the file and assert that it has pages, contains the cover title, contains every one of the 34 sound IDs, and exposes exactly 102 prompt labels.

Expected: `PASS: logical PDF checks`.

### Task 3: Render and visually verify every page

**Files:**
- Create: `tmp/pdfs/ui-sound-families/page-*.png`
- Create: `tmp/pdfs/ui-sound-families/contact-*.png`
- Modify if needed: `scripts/build_ui_sound_families_pdf.py`

- [ ] **Step 1: Render all pages at inspection resolution**

Render with pypdfium2 at a scale sufficient to inspect Cyrillic, card edges, page breaks and footers.

- [ ] **Step 2: Build compact contact sheets**

Place no more than eight rendered pages on each contact sheet so typography remains inspectable.

- [ ] **Step 3: Inspect all contact sheets and representative full pages**

Reject the build for clipped text, overlapping blocks, orphaned headings, broken glyphs, inconsistent margins, missing footer/page numbers, or weak section transitions.

- [ ] **Step 4: Correct and regenerate if needed**

Change only the deterministic builder, regenerate the same stable PDF path, rerender every page, and repeat inspection until no visible defect remains.

### Task 4: Final verification and delivery

**Files:**
- Verify: `output/pdf/phraseman_ui_sound_families_2026-08-25.pdf`

- [ ] **Step 1: Reopen the final artifact**

Confirm the file is readable, non-empty, and the latest render corresponds to its modification time.

- [ ] **Step 2: Run final content assertions**

Confirm 7 families, 34 unique generated IDs, 102 prompt variants, A/B/C for every moment, and the technical target `mono, 48 kHz, -14 LUFS, -1 dBTP`.

- [ ] **Step 3: Review repository changes**

Run `git status --short` and ensure only the builder, plan/spec documentation and final output created by this task are considered for task-specific reporting. Preserve all unrelated user changes.

- [ ] **Step 4: Deliver the PDF**

Report the audit summary, page count, 34/102 content counts, verification result and the single final PDF artifact.

