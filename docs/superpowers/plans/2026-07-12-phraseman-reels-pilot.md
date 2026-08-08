# Phraseman Reels Pilot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce five complete Russian-language Instagram Reels packages on the Windows desktop, each containing a generated absurd photorealistic scene, deterministic hook overlay, useful caption, vertical MP4, concept record, and verification evidence.

**Architecture:** Content is drafted first as five independent concept records, then each source image is generated and exported one at a time through the built-in Codex image tool. A temporary local Node builder uses Sharp and FFmpeg to composite the fixed white hook area, create a reversible scene-only zoom, compute hashes, validate artifacts, and assemble a contact sheet and manifest. Every run uses a new timestamped desktop directory and never modifies existing output.

**Tech Stack:** Built-in Codex image generation, Node.js, Sharp, FFmpeg/ffprobe, PowerShell, UTF-8 Markdown/JSON/text.

---

## File map

- Create: `C:\Users\badlo\OneDrive\Desktop\Phraseman_Reels_Pilot_5\run-YYYYMMDD-HHMMSS\README.md` — publishing order and package summary.
- Create: `...\manifest.json` — machine-readable artifact and validation record.
- Create: `...\contact-sheet.jpg` — final visual QA sheet.
- Create: `...\01` through `...\05` — one self-contained package per reel.
- Create temporarily: `C:\appsprojects\phraseman\.codex-tmp\phraseman-reels-pilot\build-reels.mjs` — deterministic compositor, MP4 builder, and validator.
- Do not modify app source, configuration, keys, or prior desktop output.

### Task 1: Create the isolated output run

- [ ] Resolve the desktop with `[Environment]::GetFolderPath('Desktop')` and create `Phraseman_Reels_Pilot_5\run-YYYYMMDD-HHMMSS` plus folders `01`–`05`.
- [ ] Confirm the run path did not exist before creation and record it in `.codex-tmp\phraseman-reels-pilot\active-run.txt`.
- [ ] Confirm Sharp resolves from `C:\appsprojects\phraseman\node_modules\sharp` and `ffmpeg`/`ffprobe` are callable.

### Task 2: Write the five complete content concepts

- [ ] Write `01\concept.md` and `01\caption.txt` for the future-of-work formula: a specific, non-guaranteed forecast about English skills and a visually absurd interview scene.
- [ ] Write `02\concept.md` and `02\caption.txt` for the hidden-majority-error formula: passive word collecting versus usable phrase recall.
- [ ] Write `03\concept.md` and `03\caption.txt` for the paradox formula: speaking improves when the learner stops constructing every sentence word by word.
- [ ] Write `04\concept.md` and `04\caption.txt` for the concrete-win formula: a small set of response patterns that removes common conversational pauses.
- [ ] Write `05\concept.md` and `05\caption.txt` for the unexpected-advantage formula: English as access to people, knowledge, and choices rather than a school subject.
- [ ] Check every hook for direct Russian «ты», distinct construction, no impossible guarantee, and exact fulfillment by its caption.
- [ ] Check each caption is UTF-8, 1200–2000 characters including CTA, uses short paragraphs, contains no emoji/hashtags/mojibake, and ends with a natural Phraseman download bridge plus `Ссылка на Phraseman — в био.`
- [ ] If any caption uses a time-sensitive fact, verify it against a current primary source and record the URL/date in `concept.md`; otherwise keep the article experiential and mark `Источники: не требуются — проверяемых внешних утверждений нет.`

### Task 3: Generate and export five source scenes one at a time

- [ ] Generate only scene 01 with the built-in image tool using the exact prompt from `01\concept.md`; require real adults, a clear absurd conflict, vertical photorealism, no text/logos/watermarks, and space for cropping.
- [ ] Copy the returned local image file to `01\source.png`, decode it with Sharp, record dimensions, and visually accept or reject it before any next generation.
- [ ] Repeat the same generate → copy → decode → inspect sequence for scenes 02, 03, 04, and 05, never holding multiple unexported image results.
- [ ] Permit at most three attempts per scene. Reject unreadable action, weak hook relationship, accidental text/logo, malformed faces/hands, extra limbs, duplicate characters, or excessive clutter. If no attempt passes, stop and mark the run incomplete.

### Task 4: Build deterministic covers

- [ ] Create the temporary Node builder with constants `WIDTH=1080`, `HEIGHT=1920`, `HEADER=480`, `TEXT_LEFT=96`, `TEXT_TOP=80`, `TEXT_RIGHT=984`, `TEXT_BOTTOM=400`, `MIN_FONT=64`, and `MAX_LINES=4`.
- [ ] Use Sharp to crop each source scene into the 1080×1440 lower region, reserving noncritical content from the bottom 320 px and sides 96 px.
- [ ] Render each manually line-broken hook as black Arial Bold SVG text on a pure white 1080×480 header; fail when a word is split, text exceeds four lines, the computed font is under 64 px, or bounds leave the specified rectangle.
- [ ] Composite the fixed header and scene into `reel-cover.png`, then verify exact 1080×1920 dimensions and successful decoding.

### Task 5: Build five Reels MP4 files

- [ ] Produce an 8-second, 30 fps scene-only scale animation `1.000 → 1.025 → 1.000`; keep the header as a separate stationary overlay for every frame.
- [ ] Encode `reel.mp4` as H.264 `yuv420p`, 1080×1920, without an audio stream.
- [ ] Validate each file with ffprobe for codec, pixel format, dimensions, 30 fps, eight-second duration within one frame, and zero audio streams.
- [ ] Decode each full MP4 to a null sink with FFmpeg and fail on any decoding error.
- [ ] Extract first, middle, and last frames and compare the first/last dimensions and composition to confirm the loop closes without a visible crop jump.

### Task 6: Assemble metadata and verification artifacts

- [ ] Compute SHA-256 for every `source.png`, `reel-cover.png`, `reel.mp4`, `caption.txt`, and `concept.md`.
- [ ] Write `manifest.json` with package number, topic, formula, hook, relative paths, PNG dimensions, MP4 parameters, caption length, hashes, sources, individual check results, and package status.
- [ ] Set overall status to `passed` only when all five package statuses are `passed`.
- [ ] Write `README.md` with publishing order, each hook, corresponding caption location, and the explicit note that publishing remains manual.
- [ ] Create `contact-sheet.jpg` showing all five covers at phone-readable scale plus first/middle/last video frames.

### Task 7: Final visual and content QA

- [ ] Inspect all five source images, covers, and the contact sheet for anatomy, accidental text, scene clarity, hook readability, manual line breaks, and safe-zone cropping.
- [ ] Inspect first/middle/last frames for stationary headers and symmetric scene movement.
- [ ] Re-read all five captions for usefulness, distinctness, hook fulfillment, spelling, CTA integrity, and absence of copied author phrasing.
- [ ] Run the builder validation command again against the immutable output folder and retain the compact validation summary in `manifest.json`.
- [ ] Request final Advisor review with the five hooks, captions, prompts, contact sheet, artifact paths, manifest, ffprobe/decode evidence, and unresolved uncertainty. Apply required changes and resubmit until `DECISION: APPROVED`.
- [ ] Report completion only if manifest overall status is `passed` and Advisor returns `DECISION: APPROVED`.

## Exact verification commands

```powershell
node C:\appsprojects\phraseman\.codex-tmp\phraseman-reels-pilot\build-reels.mjs --validate "<absolute-run-path>"
ffprobe -v error -show_entries stream=codec_name,pix_fmt,width,height,r_frame_rate,codec_type -show_entries format=duration -of json "<package>\reel.mp4"
ffmpeg -v error -i "<package>\reel.mp4" -f null NUL
```

Expected final validator result:

```text
packages=5 passed=5 failed=0 overall=passed
```
