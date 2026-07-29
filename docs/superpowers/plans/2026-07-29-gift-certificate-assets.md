# Gift Certificate Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce three visually distinct, production-ready certificate background assets for the monthly, yearly, and lifetime gift plans.

**Architecture:** Generate one raster original per approved plan prompt with the built-in image-generation tool. Select and copy each original into an ignored working area, then resize and compress only the three final WebPs into the website asset directory. Do not modify the live gift page or flatten dynamic certificate text into the artwork.

**Tech Stack:** Codex built-in image generation, Sharp, WebP, PowerShell, targeted visual inspection.

---

### Task 1: Generate the monthly certificate background

**Files:**
- Create: `.codex-tmp/gift-certificates/monthly-source.png`

- [ ] **Step 1: Generate the monthly source**

Use the exact Monthly prompt from `docs/superpowers/specs/2026-07-29-gift-certificate-assets-design.md` with the built-in image-generation tool and no reference-image attachment. Expected result: a landscape coral/peach editorial certificate background with a quiet text-safe center and no generated text.

- [ ] **Step 2: Inspect the source**

Open the generated image at original detail. Expected: no letters, pseudo-text, logos, watermarks, people, flags, or school clip art; decorative interest remains around the perimeter.

- [ ] **Step 3: Preserve the selected source**

Copy the selected generated file to `.codex-tmp/gift-certificates/monthly-source.png`. Expected: the file exists and is not inside the shipped `knowly-www/assets/` set.

### Task 2: Generate the yearly certificate background

**Files:**
- Create: `.codex-tmp/gift-certificates/yearly-source.png`

- [ ] **Step 1: Generate the yearly source**

Use the exact Yearly prompt from the approved spec with the built-in image-generation tool and no reference-image attachment. Expected result: a landscape sapphire/royal-blue editorial certificate background with gold accents, an abstract journey motif, and a quiet text-safe center.

- [ ] **Step 2: Inspect the source**

Open the generated image at original detail. Expected: no letters, pseudo-text, branded landmarks, logos, watermarks, flags, people, or travel-agency imagery.

- [ ] **Step 3: Preserve the selected source**

Copy the selected generated file to `.codex-tmp/gift-certificates/yearly-source.png`. Expected: the file exists outside the shipped website asset set.

### Task 3: Generate the lifetime certificate background

**Files:**
- Create: `.codex-tmp/gift-certificates/lifetime-source.png`

- [ ] **Step 1: Generate the lifetime source**

Use the exact Lifetime prompt from the approved spec with the built-in image-generation tool and no reference-image attachment. Expected result: a landscape graphite/emerald/antique-gold editorial certificate background with a continuous-loop motif and quiet text-safe center.

- [ ] **Step 2: Inspect the source**

Open the generated image at original detail. Expected: no letters, pseudo-text, logos, crowns, bank-card styling, QR codes, watermarks, people, or school clip art.

- [ ] **Step 3: Preserve the selected source**

Copy the selected generated file to `.codex-tmp/gift-certificates/lifetime-source.png`. Expected: the file exists outside the shipped website asset set.

### Task 4: Optimize the three final website assets

**Files:**
- Create: `knowly-www/assets/gift-certificates/gift-certificate-monthly.webp`
- Create: `knowly-www/assets/gift-certificates/gift-certificate-yearly.webp`
- Create: `knowly-www/assets/gift-certificates/gift-certificate-lifetime.webp`

- [ ] **Step 1: Confirm the image runtime**

Run: `node -e "require('sharp'); console.log('sharp-ready')"`

Expected: `sharp-ready`.

- [ ] **Step 2: Create the final directory**

Create `knowly-www/assets/gift-certificates/` only. Expected: no existing website asset is overwritten.

- [ ] **Step 3: Resize and compress each selected source**

Use Sharp to fit each image to a consistent 1536x1024 landscape canvas and encode WebP at quality 76 with smart subsampling. Expected: exactly three final WebPs with stable filenames, matching dimensions, and substantially smaller byte size than their source originals.

- [ ] **Step 4: Validate technical properties**

Run a Sharp metadata check over the three final files. Expected for every file: format `webp`, width `1536`, height `1024`, and nonzero file size.

### Task 5: Perform final visual and repository checks

**Files:**
- Verify: `knowly-www/assets/gift-certificates/*.webp`
- Verify: `docs/superpowers/specs/2026-07-29-gift-certificate-assets-design.md`

- [ ] **Step 1: Build a contact sheet in the ignored working area**

Create `.codex-tmp/gift-certificates/contact-sheet.jpg` with the monthly, yearly, and lifetime finals shown side by side. Expected: the three palettes are immediately distinct while their material style is coherent.

- [ ] **Step 2: Inspect the contact sheet and individual finals**

Expected: no generated text, central text zones remain usable, and each plan is recognizable at thumbnail size.

- [ ] **Step 3: Confirm exact deliverables**

Run: `git status --short -- knowly-www/assets/gift-certificates docs/superpowers/plans/2026-07-29-gift-certificate-assets.md`

Expected: only the plan file and the three new final assets appear in this task's uncommitted scope; unrelated user changes remain untouched.

- [ ] **Step 4: Report results**

Return absolute links to all three WebPs and the contact sheet, plus the final prompt set and confirmation that the built-in tool—not a project API key—was used.
