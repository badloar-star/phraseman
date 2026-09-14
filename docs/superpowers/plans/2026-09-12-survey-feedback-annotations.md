# Survey Feedback Annotations Implementation Plan

> **For agentic workers:** Implement inline in the existing checkout; the project forbids creating a worktree or delegated coding task without an explicit owner request.

**Goal:** Let the owner mark preferred surveys, attach a separate comment to each survey, persist that review locally, filter reviewed items, and export all feedback for later implementation.

**Architecture:** Keep the mockup self-contained in one HTML file. Store a versioned `reviews` object in `localStorage`, keyed by stable survey ID; derive counters, list badges, filters, and export payloads from that object. Keep editorial review state separate from the simulated user answer selected in the phone preview.

**Tech Stack:** Semantic HTML, CSS, vanilla JavaScript, browser `localStorage`, Clipboard API, Blob download.

---

### Task 1: Define verification contract

- [ ] Extend `.codex-tmp/verify-survey-library.cjs` to require the stable storage key, editorial controls, feedback filter, and export function.
- [ ] Run the verifier and confirm it fails before implementation.

### Task 2: Add editorial review interface

- [ ] Add an accessible like toggle to every catalog row and the selected-survey review panel.
- [ ] Add a labelled comment textarea with save status and character counter.
- [ ] Add liked/commented counters and a review-state filter without removing existing category/action filters.

### Task 3: Add persistence and export

- [ ] Parse and normalize stored review data defensively.
- [ ] Autosave like/comment changes by survey ID.
- [ ] Export only reviewed surveys with ID, category, question, liked state, and comment to clipboard or a downloaded JSON file.

### Task 4: Verify in the browser

- [ ] Re-run the static verifier with zero failures.
- [ ] Mark a survey, add a comment, reload, and confirm both survive.
- [ ] Confirm the review filter, counters, clipboard/download payload, keyboard focus, and 375px responsive layout.
