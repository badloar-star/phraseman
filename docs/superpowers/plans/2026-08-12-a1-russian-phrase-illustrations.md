# A1 Russian Phrase Illustrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver an opaque 16:9 3D illustration for each of the 300 supplied Russian A1 phrases, with a reviewable manifest and consistent premium light backgrounds.

**Architecture:** A manifest preserves source order, assigns a deterministic filename, and records a concrete visual scene. A small representative approval set is generated first; only approved visual direction is extended in controlled batches. Final PNGs are stored outside bundled app assets, under `output/`, so no unused application assets are added.

**Tech Stack:** Codex built-in image generation, PNG, PowerShell file checks.

---

### Task 1: Create the production manifest

**Files:**
- Create: `output/imagegen/a1-russian-phrase-illustrations/manifest.csv`
- Create: `output/imagegen/a1-russian-phrase-illustrations/README.md`

- [ ] **Step 1: Transcribe the 300 user-provided phrases in their supplied order**

Create `manifest.csv` with this exact header:

```csv
index,phrase,filename,background,scene,status
```

Use three-digit indexes from `001` through `300`; use a distinct slugged PNG filename for every entry, including duplicate phrases. Set `background` by cycling `set2_07`, `set2_08`, `set2_09`, `set2_10`. Set status to `planned`.

- [ ] **Step 2: Write a concise production README**

Include the output dimensions, opaque-PNG rule, no-text rule, four background references, naming convention, and the definition of `planned`, `generated`, `approved`, and `rework` statuses.

- [ ] **Step 3: Validate the manifest before any image is generated**

Run:

```powershell
$rows = Import-Csv output/imagegen/a1-russian-phrase-illustrations/manifest.csv
if ($rows.Count -ne 300) { throw "Expected 300 rows; got $($rows.Count)" }
if (($rows.index | Select-Object -Unique).Count -ne 300) { throw 'Duplicate index' }
if (($rows.filename | Select-Object -Unique).Count -ne 300) { throw 'Duplicate filename' }
if (($rows.background | Where-Object { $_ -notin 'set2_07','set2_08','set2_09','set2_10' }).Count) { throw 'Unknown background' }
"MANIFEST_OK rows=$($rows.Count)"
```

Expected: `MANIFEST_OK rows=300`.

- [ ] **Step 4: Commit the manifest only after the validation reports 300 rows**

```powershell
git add output/imagegen/a1-russian-phrase-illustrations/manifest.csv output/imagegen/a1-russian-phrase-illustrations/README.md
git commit -m "docs: add A1 illustration production manifest"
```

### Task 2: Generate a representative approval set

**Files:**
- Create: `output/imagegen/a1-russian-phrase-illustrations/001-privet.png`
- Create: `output/imagegen/a1-russian-phrase-illustrations/061-krasnyy.png`
- Create: `output/imagegen/a1-russian-phrase-illustrations/095-idti.png`
- Create: `output/imagegen/a1-russian-phrase-illustrations/131-ya-hochu-vody.png`
- Create: `output/imagegen/a1-russian-phrase-illustrations/164-idyot-sneg.png`
- Create: `output/imagegen/a1-russian-phrase-illustrations/204-smeatsya.png`
- Create: `output/imagegen/a1-russian-phrase-illustrations/237-poverni-nalevo.png`
- Create: `output/imagegen/a1-russian-phrase-illustrations/268-vyzovite-vracha.png`

- [ ] **Step 1: Create eight single-image prompts, one for each listed phrase**

Each prompt must use this invariant:

```text
Create a 1920×1080 landscape educational illustration. Friendly polished 3D animated-film style with expressive characters, rounded forms, detailed fabrics and props, and soft warm studio lighting. Use a light premium decorative 16:9 background in the supplied pastel-and-gold style, with a clear bright central area. Fully opaque image. No text, letters, numbers, logos, watermark, black background, transparency, or UI.
```

Add one unambiguous phrase-specific scene to each prompt. The eight prompts must cover greeting, colour, action, request, weather, emotion, direction, and emergency categories.

- [ ] **Step 2: Generate the eight images individually using built-in image generation**

Use one generator call per phrase. Use the supplied examples only as style and background references; do not alter them. Save each selected output to the matching manifest filename under `output/imagegen/a1-russian-phrase-illustrations/`.

- [ ] **Step 3: Visually inspect the eight results and report a compact contact sheet**

Check the intended meaning, absence of text, opaque corners, no black canvas, full 16:9 framing, and no significant cropping. Mark each matching manifest row `generated`, `approved`, or `rework`.

- [ ] **Step 4: Ask the owner to approve the representative set**

Do not generate the remaining 292 images until the owner confirms that the actual images meet the visual direction.

### Task 3: Produce the remaining illustrations in controlled chunks

**Files:**
- Modify: `output/imagegen/a1-russian-phrase-illustrations/manifest.csv`
- Create: `output/imagegen/a1-russian-phrase-illustrations/*.png`

- [ ] **Step 1: Generate each approved manifest item individually using its scene and background assignment**

Apply the approved Task 2 prompt invariant. Keep the phrase meaning central, include no on-image text, and use only opaque 16:9 imagery. Save to the preassigned unique filename; never overwrite an existing approved file.

- [ ] **Step 2: Stop at each checkpoint of 25 images**

Inspect a contact sheet and mark the relevant manifest rows. Correct only rows marked `rework`, using one targeted prompt revision per image.

- [ ] **Step 3: Verify each completed checkpoint**

Run:

```powershell
$rows = Import-Csv output/imagegen/a1-russian-phrase-illustrations/manifest.csv
$bad = $rows | Where-Object { $_.status -notin 'approved','generated' }
"CHECKPOINT rows=$($rows.Count) pending=$($bad.Count)"
```

Expected: 300 rows and a pending count that decreases to zero only after the last reviewed item.

### Task 4: Final delivery audit

**Files:**
- Modify: `output/imagegen/a1-russian-phrase-illustrations/manifest.csv`
- Create: `output/imagegen/a1-russian-phrase-illustrations/FINAL-QA.md`

- [ ] **Step 1: Verify complete file coverage and PNG geometry**

Run a PowerShell check that compares all 300 manifest filenames against the output directory and inspect image dimensions with the installed image tooling. Record missing files, duplicate filenames, non-PNG outputs, non-16:9 geometry, or failed visual checks in `FINAL-QA.md`.

- [ ] **Step 2: Confirm delivery readiness**

The manifest must have 300 rows, every row must be `approved`, every matching PNG must exist, and `FINAL-QA.md` must contain zero missing or rework items.

- [ ] **Step 3: Commit the final manifest and QA report**

```powershell
git add output/imagegen/a1-russian-phrase-illustrations
git commit -m "assets: add A1 Russian phrase illustration set"
```

