# Daily Survey Themed Asset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce and validate the approved concept-A Ember master preview for the connected Home Daily Survey slot without altering the removed Daily Challenge or any unrelated asset.

**Architecture:** Keep generation outside the bundled asset tree until visual approval. Generate one compact tactile 3D master, validate its semantics and 68 × 68 readability, then inspect image metadata; only a later approved phase may add per-theme static mappings and compressed WebP files.

**Tech Stack:** Built-in Codex `imagegen`, local PNG inspection, `sharp` metadata and thumbnail rendering, React Native/Expo static image requirements.

---

### Task 1: Confirm the connected slot and generation boundary

**Files:**
- Inspect: `components/SurveyTaskCard.tsx`
- Inspect: `assets/images/survey/survey.webp`
- Create directory: `.codex-tmp/theme-assets-v2/daily-survey/ember/`

- [ ] **Step 1: Confirm the current source is statically connected**

Run:

```powershell
rg -n -F "require('../assets/images/survey/survey.webp')" components/SurveyTaskCard.tsx
```

Expected: exactly one match in the 68 × 68 `survey-offer-art` slot.

- [ ] **Step 2: Confirm free physical memory before generation**

Run:

```powershell
Get-CimInstance Win32_OperatingSystem | Select-Object @{n='FreeGB';e={[math]::Round($_.FreePhysicalMemory/1MB,1)}}
```

Expected: enough free memory for one built-in generation call. Do not start a browser server, subagent, or parallel generator.

- [ ] **Step 3: Create only the ignored preview directory**

Run:

```powershell
New-Item -ItemType Directory -Force -Path '.codex-tmp/theme-assets-v2/daily-survey/ember' | Out-Null
```

Expected: no new file under `assets/images/**`.

### Task 2: Generate the Ember concept-A master

**Files:**
- Create: `.codex-tmp/theme-assets-v2/daily-survey/ember/ember-daily-survey-concept-a-source.png`

- [ ] **Step 1: Generate one preview with built-in imagegen**

Use this exact semantic prompt:

```text
Use case: stylized-concept
Asset type: 68 × 68 Home Daily Survey illustration
Primary request: one compact softly rounded feedback card in slight three-quarter view, three clearly separated raised answer controls arranged vertically, exactly one selected through both inset depth and a small central mark, and one short stylus resting beside the card without covering the controls
Style/medium: premium compact soft tactile 3D still-life matching the approved Phraseman Ember family
Composition/framing: strong centered near-square silhouette, generous transparent padding, contained contact shadow, readable at tiny thumbnail size
Lighting/mood: warm soft studio light
Color palette: terracotta, warm ivory, dark cocoa, antique brass, tiny muted-olive edge accent
Materials/textures: ceramic and soft leather card, subtle paperlike inset surface, lacquered stylus, restrained embossed edge ornament
Constraints: no readable text; exactly three answer controls; exactly one selected; true transparent alpha
Avoid: clipboard, checklist, paper form, book, notebook, flashcard, microphone, speaker, speech bubbles, architecture, landmark, character, shield, trophy, gift, chest, pearl, reward token, Practice, Diagnostic Test, Daily Challenge, MAX, logo, UI card background, painted checkerboard
```

Expected: one image generation call and one visible preview.

- [ ] **Step 2: Copy the generated source into the workspace non-destructively**

Copy the generated file from its reported `$CODEX_HOME/generated_images/**` path to:

```text
.codex-tmp/theme-assets-v2/daily-survey/ember/ember-daily-survey-concept-a-source.png
```

Expected: the original generated file remains intact and no bundled asset is overwritten.

### Task 3: Validate the preview

**Files:**
- Inspect: `.codex-tmp/theme-assets-v2/daily-survey/ember/ember-daily-survey-concept-a-source.png`
- Create: `.codex-tmp/theme-assets-v2/daily-survey/ember/ember-daily-survey-concept-a-68px-preview.png`

- [ ] **Step 1: Check semantic invariants visually**

Confirm all of the following:

```text
one feedback card; three answer controls; exactly one selected; one stylus; no text; no clipboard/checklist; no lesson/test/flashcard symbols; no Daily Challenge; no MAX
```

Expected: the asset reads as feedback choice rather than a learning exercise or reward.

- [ ] **Step 2: Inspect source metadata**

Run:

```powershell
node -e "const sharp=require('sharp'); sharp(process.argv[1]).metadata().then(m=>console.log(JSON.stringify({width:m.width,height:m.height,channels:m.channels,hasAlpha:m.hasAlpha})))" ".codex-tmp/theme-assets-v2/daily-survey/ember/ember-daily-survey-concept-a-source.png"
```

Expected for production readiness: `channels: 4` and `hasAlpha: true`. If not, retain the `-source.png` suffix and report it only as a visual preview.

- [ ] **Step 3: Render a 68 × 68 inspection thumbnail**

Run:

```powershell
node -e "const sharp=require('sharp'); sharp(process.argv[1]).resize(68,68,{fit:'contain'}).png().toFile(process.argv[2])" ".codex-tmp/theme-assets-v2/daily-survey/ember/ember-daily-survey-concept-a-source.png" ".codex-tmp/theme-assets-v2/daily-survey/ember/ember-daily-survey-concept-a-68px-preview.png"
```

Expected: all three answer controls and the selected state remain distinguishable at the actual slot size.

- [ ] **Step 4: Stop before integration**

Run:

```powershell
git status --short -- assets/images components/SurveyTaskCard.tsx
```

Expected: this preview workflow introduced no new modifications in either path. Existing unrelated owner changes, if present, are reported and left untouched.

No static per-theme map, WebP conversion, or app wiring is allowed until the Ember master receives visual approval.
