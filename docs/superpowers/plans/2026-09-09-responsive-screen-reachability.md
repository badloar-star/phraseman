# Responsive screen reachability implementation plan

**Goal:** Keep application content and actions reachable on short/narrow windows, tablets, rotation and enlarged text without scaling the entire UI or removing functionality.

**Architecture:** Constrain scroll viewports by the available flex space; let their content grow. Keep primary task controls outside task scrolling where practical. Compress decorative spacing before text or touch targets. Preserve the current theme, navigation, gestures, data and reward contracts.

**Tech stack:** React Native, React Native Web, TypeScript, Playwright, existing focused Jest gates.

## Acceptance matrix

Widths/heights in logical pixels: 320×480, 320×568, 360×640, 375×667, 390×844, 568×320, 768×1024, 1024×768. Include long text, font scales 1/1.5/2, safe areas, keyboard where applicable, question/answer/result states. No global transform scaling, no new text truncation, no lost controls. Native device verification must be distinguished from browser geometry and static inspection.

## Tasks

- [x] Read current workspace rules; preserve dirty work. Inventory route candidates and existing layout guards in `.codex-tmp/responsive-20260909/`.
- [x] Audit common bounded screen shells, task screens, result screens, dialogs and fixed-height overlays. Record confirmed issues separately from candidates and delegated/scrollable routes.
- [x] Add failing reachability regressions for Arena choices/builders and common alerts. Exercise the real component layout where possible; source contracts alone do not prove pixels.
- [x] Bound Arena task content (`flexShrink: 1`, `minHeight: 0`); place prompt/options inside bounded scrolling and submit outside it. Use the existing short-screen threshold and compact chip padding. Preserve matching interactions and current event handlers.
- [x] Add scroll fallback to flashcard training content while preserving pinned transport controls and voice hold target. Fix narrow settings rows by wrapping.
- [x] Fix confirmed non-scrolling search/result/information screens and alert overflow. Preserve modal dismissal, blocked states and already scroll-owned forms.
- [x] Triage remaining route families and modal candidates; fix confirmed layout defects with focused regressions. Static matches are not treated as runtime PASS.
- [x] Run focused checks under the shared semaphore, one process at a time. Browser geometry matrix and screenshots go to `.codex-tmp/responsive-20260909/`; do not run broad builds automatically.
- [x] Perform fresh read-only review, resolve findings, and write `docs/design/RESPONSIVE_SCREEN_AUDIT_2026-09-09.md`. No deployment or claim of exhaustive physical-device coverage.
- [ ] Native follow-up: complete the runtime route/state/locale matrix on Android/iOS, including keyboard and microphone gestures. Not established by source triage or the browser fixture matrix.

## Verification result

144 core geometry scenarios + 24 intrinsic card sizing scenarios passed. Focused
Jest: 96 tests in 13 suites passed. ESLint: 49 files, 0 errors, 62 warnings.
Babel TSX parse: 49 files, 0 errors. Scoped `git diff --check`: exit 0.
Full-device coverage remains explicitly unverified; see the report for boundaries.

## Verification commands

Use `C:/Program Files/Git/bin/bash.exe .claude/semaphore/slot.sh acquire` with session id `codex-responsive-20260909` before heavy work, then release in `finally`.

Existing focused gates: `tests/arena_question_layout.test.ts`, `tests/short_screen_layout_contract.test.ts`, `tests/fc_speaking_layout_gate.ts`, modal lifecycle contracts and new reachability regressions. Exact added checks and RED/GREEN evidence will be recorded with the final changed-file list.

## Scope notes

This is layout repair, not content authoring: no curriculum, authored sessions, localizations, approval fingerprints, scoring, audio lifecycle, payments or permissions are changed. Learning V2 already has a dedicated practice viewport; inspect current wiring before changing it. Preserve ongoing work in the shared checkout. The owner has authorized the full adaptation task; proceed inline without creating branches/worktrees or waiting for another approval.
