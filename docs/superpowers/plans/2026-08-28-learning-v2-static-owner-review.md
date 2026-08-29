# Learning V2 Static Owner Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a lightweight source-backed HTML player for every English Learning V2 session currently exposed by the canonical authoring registry.

**Architecture:** A pure TypeScript adapter joins the existing device-preview package with intro answer metadata from the exact authored source and emits a serializable owner-review bundle. A generator embeds that bundle into a self-contained mobile-first HTML runtime, while a tiny Node HTTP server provides a secure localhost origin for audio and microphone access without Expo/Metro/Firebase.

**Tech Stack:** TypeScript/tsx, Node HTTP, plain semantic HTML/CSS/JavaScript, Web Speech and MediaRecorder browser APIs.

---

### Task 1: Lock the source-backed bundle contract

**Files:**
- Create: `tests/learning_v2_static_owner_review_bundle_v1_gate.ts`
- Create: `modules/learning-v2/preview/static_owner_review_bundle_v1.ts`

- [ ] **Step 1: Write a failing test** asserting that the bundle exposes only registry rows 1 and 2, contains all eight interface locales, preserves three intro pages and every practice interaction, joins intro correct answers/explanations, preserves new-word encounters, and contains all six active families.
- [ ] **Step 2: Run** `npx tsx tests/learning_v2_static_owner_review_bundle_v1_gate.ts` and verify it fails because the module is absent.
- [ ] **Step 3: Implement** `buildLearningV2StaticOwnerReviewBundleV1()` as a pure adapter over `learningV2AuthoringDevicePreviewRowsV1`, `buildLearningV2AuthoringDevicePreviewV1`, and `authoredLearningV2SessionSource`.
- [ ] **Step 4: Re-run the focused test** and require `LEARNING V2 STATIC OWNER REVIEW BUNDLE: PASS`.

### Task 2: Generate a self-contained interactive HTML artifact

**Files:**
- Create: `tests/learning_v2_static_owner_review_html_v1_gate.ts`
- Create: `scripts/learning-v2-static-owner-review/template_v1.ts`
- Create: `scripts/build_learning_v2_static_owner_review.ts`
- Modify: `package.json`

- [ ] **Step 1: Write a failing test** for the generated document contract: embedded schema version, session picker, locale selector, six family renderers, intro feedback, word-card overlay, deterministic option shuffle, source fingerprint inspector, and absence of Firebase/Expo imports.
- [ ] **Step 2: Run** `npx tsx tests/learning_v2_static_owner_review_html_v1_gate.ts` and verify the expected missing-module failure.
- [ ] **Step 3: Implement** a single generated `index.html` with embedded CSS, runtime JavaScript, and JSON bundle. Render intro, word-first overlays, all six active modes, feedback, back/continue navigation, audio fallback, microphone capture, and completion screen without inventing learner content.
- [ ] **Step 4: Add** `learning-v2:owner-review-html:build` to `package.json` and generate `.codex-tmp/learning-v2-owner-review/index.html`.
- [ ] **Step 5: Re-run the focused HTML gate** and require `LEARNING V2 STATIC OWNER REVIEW HTML: PASS`.

### Task 3: Serve the review surface without application bootstrap

**Files:**
- Create: `tests/learning_v2_static_owner_review_server_v1_gate.ts`
- Create: `scripts/serve_learning_v2_static_owner_review.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write a failing test** that starts the server on an ephemeral port, requests `/` and `/health`, verifies CSP/content type/no-store headers, and rejects traversal.
- [ ] **Step 2: Run** `npx tsx tests/learning_v2_static_owner_review_server_v1_gate.ts` and confirm the server module is missing.
- [ ] **Step 3: Implement** a loopback-only Node HTTP server that serves only the generated review directory and reports the exact local URL.
- [ ] **Step 4: Add** `learning-v2:owner-review-html` to build then serve the artifact.
- [ ] **Step 5: Re-run the server gate** and require `LEARNING V2 STATIC OWNER REVIEW SERVER: PASS`.

### Task 4: Verify real owner flow and document handoff

**Files:**
- Modify: `docs/v2/HANDOVER.md`

- [ ] **Step 1: Run** the three focused gates plus `npm run learning-v2:lesson1-authoring-preflight -- --session 2`.
- [ ] **Step 2: Start** the lightweight server and perform a browser walkthrough: landing page, locale switch, session 1 intro/practice, session 2 opening, word card, audio replay, one choice mode, builder, speed match, and voice capture permission/state.
- [ ] **Step 3: Confirm** no request loads Expo/Metro/Firebase and no forbidden session is present.
- [ ] **Step 4: Record** the exact command, URL, exposed registry range, generated artifact path, and verification evidence in `docs/v2/HANDOVER.md`.
- [ ] **Step 5: Open** the verified localhost URL in Codex for owner review.

## Plan self-review

- Spec coverage: source authority, registry boundary, eight locales, intro answer metadata, all six active modes, word-first overlays, browser audio/microphone, accessibility, artifact lifecycle, and review-only state are each assigned to a task.
- Placeholder scan: no TBD/TODO or unspecified implementation step remains.
- Type consistency: the bundle builder is the only source adapter; the generator and tests consume its versioned output. The server never imports application/runtime code.
- Repository constraints: no worktree, branch, commit, deploy, Firebase write, TTS generation, or project API key is used. Generated output remains under `.codex-tmp`.

