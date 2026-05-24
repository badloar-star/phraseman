# Lingman Montazher Review Desk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first local browser review desk for inspecting and correcting Lingman Montazher edit decisions.

**Architecture:** Keep the first slice isolated in `lingman-montazher/`. The browser UI reads a review manifest JSON, shows the raw video or placeholder, renders proportional timeline segments and screen text events, lets the editor change clip decisions/text, and exports a corrected manifest.

**Tech Stack:** Static HTML/CSS/JavaScript for the local review UI, Python standard library for contract validation tests, later Remotion/ffmpeg integration.

---

### Task 1: Static Review Desk

**Files:**
- Create: `lingman-montazher/README.md`
- Create: `lingman-montazher/review-desk/index.html`
- Create: `lingman-montazher/review-desk/styles.css`
- Create: `lingman-montazher/review-desk/app.js`
- Create: `lingman-montazher/data/sample-review.json`

- [x] Create a self-contained local review page.
- [x] Render project summary, video preview, timeline segments, screen text events, and decision editor.
- [x] Add import/export controls for review manifests and raw video files.

### Task 2: Manifest Contract Guard

**Files:**
- Create: `lingman-montazher/tools/validate_review_manifest.py`
- Create: `lingman-montazher/tests/test_review_manifest.py`

- [x] Validate required manifest sections.
- [x] Validate source and output time ranges.
- [x] Validate screen text timing and readable dwell time.
- [x] Verify the bundled sample manifest.

### Task 3: Local Verification

**Files:**
- Modify only files created above.

- [ ] Run `python -m unittest discover -s lingman-montazher/tests`.
- [ ] Start a local static server with `python lingman-montazher/server.py --port 4179`.
- [ ] Open `http://localhost:4179/review-desk/` for visual inspection.
