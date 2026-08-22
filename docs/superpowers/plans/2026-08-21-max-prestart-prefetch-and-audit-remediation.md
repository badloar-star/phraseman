# MAX prestart, captions, and review remediation — implementation plan

Date: 2026-08-21
Design: `docs/superpowers/specs/2026-08-21-max-prestart-stats-card-and-prefetch-design.md`

## Goal

Ship the approved Statistics-style MAX lesson prestart with bounded read-only prefetch, while closing every finding from the preceding MAX audit: caption event races, caption accessibility and clipping, unbounded review copy, incorrect “Что делать завтра” composition, disclosure semantics, and missing state announcements.

## Constraints

- Preserve the existing call, quota, fallback, homework, review, practice, and navigation capabilities.
- Never start microphone, WebRTC, timer, or conversation before explicit lesson start.
- Never background-mint expiring voice credentials on Home focus.
- Reuse existing MAX orb assets; add no new bundled artwork.
- Keep one writer and preserve unrelated dirty-worktree changes.
- Add tests before each production change and use focused gates only.

## Task 1 — repair live-caption event ordering

Files:

- Modify `tests/max_call_live_caption.test.ts`
- Modify `app/max_call_live_caption.ts`
- Modify `app/max_call_session.tsx`

Steps:

1. Add failing reducer tests for:
   - `audio_cleared → audio_started → new item delta`;
   - `reconnect → audio_started → new item delta`;
   - `audio_stopped → late same-item transcript delta`;
   - stale same-item delta after cancellation remaining hidden.
2. Make audio start establish a fresh playback epoch even after a cancelled prior item.
3. Allow a genuinely new assistant item to inherit the active audio epoch, but never revive cancelled text from the old item.
4. When late transcript text arrives after audio has stopped, publish it immediately instead of leaving `visibleText` incomplete.
5. In the session dispatcher, publish when the reducer says visible text changed and schedule pacing only while playback is active.
6. Run `tests/max_call_live_caption.test.ts` and the MAX lifecycle/client tests.

## Task 2 — make live captions accessible and resilient at large text sizes

Files:

- Add `tests/max_call_live_caption_view.test.tsx`
- Modify `app/max_call_live_caption_view.tsx`
- Modify `app/max_call_session.tsx`

Steps:

1. Add render tests proving the control exposes the currently visible learner/MAX text, an open-transcript hint, and a 200% font multiplier.
2. Replace the fixed accessibility label with dynamic readable content plus an explicit hint/action.
3. Remove the 1.2 scaling caps from essential caption text.
4. Replace the fixed 38% clipped container with a bounded scroll/adaptive layout that cannot silently hide essential text.
5. Give transcript-sheet disclosure controls `expanded` state and modal semantics where applicable.
6. Run caption render tests and focused accessibility contracts.

## Task 3 — bound and structure review copy

Files:

- Add `app/max_voice_review_projection.ts`
- Add `tests/max_voice_review_projection.test.ts`
- Modify `functions/src/premium_dialog_review.test.ts`
- Modify `functions/src/premium_dialog_review.ts`
- Modify `app/max_voice_review.tsx`
- Modify `tests/max_voice_review_server_contract.test.ts`

Steps:

1. Add failing pure tests for word-boundary compaction of praise, original, correction, note, and tip.
2. Add failing tests for tomorrow-plan composition:
   - homework + tip + next topic;
   - next topic with no homework still includes a practical tip;
   - no homework/tip uses a concrete localized fallback action.
3. Tighten server parser ceilings and prompt wording so the payload is concise at the source.
4. Project server text into compact top-level cards; preserve complete correction content inside expanded details.
5. Always render an action in “Что делать завтра”; render next topic as context, never as the sole instruction.
6. Announce `loading → loaded/error` review-state changes.
7. Move expanded transcript content outside the transcript toggle button and expose `accessibilityState.expanded`.
8. Remove 1.2 scaling caps from essential review sections and keep the page scrollable.
9. Run pure projection, server parser, review contract, and focused render/accessibility tests.

## Task 4 — add deterministic tutor-preview content and read-only cache

Files:

- Add `functions/src/max_voice_tutor_preview.ts`
- Add `functions/src/max_voice_tutor_preview.test.ts`
- Modify `functions/src/max_voice_mint.ts`
- Modify `functions/src/max_voice_mint.test.ts`
- Add `app/max_tutor_preview.ts`
- Add `tests/max_tutor_preview.test.ts`
- Modify `app/max_call_mint_request.ts`

Steps:

1. Add failing server tests for stable, localized, mode-distinct lesson titles and short outcomes.
2. Build tutor preview from existing tutor memory and can-do progress without writes or model calls.
3. Return tutor preview from `maxVoicePreflight` for tutor format and reuse the same display copy in mint output.
4. Add a defensive client parser and a bounded in-memory cache keyed by format/CEFR/interface language/study target.
5. Add cache tests for synchronous peek, TTL reuse, in-flight deduplication, failure preservation, and explicit invalidation.
6. Add `prefetchMaxTutorPreview` to the callable boundary; no timer or interval.
7. Run server preview/mint and client cache tests.

## Task 5 — prefetch on Home and hand off premint on MAX entry intent

Files:

- Modify `app/(tabs)/home.tsx`
- Modify `app/max_call_prestart.tsx`
- Modify `tests/max_call_home_entry_contract.test.ts`
- Modify `tests/max_call_premint.test.ts`

Steps:

1. Add failing contracts proving Home performs a bounded read-only tutor preview prefetch while active.
2. Add failing contracts proving MAX press starts/reuses premint before navigation.
3. Trigger preview prefetch once through the cache when Home becomes active and MAX is visible.
4. On MAX press, start the existing single premint slot synchronously, then navigate; prestart reuses that exact promise.
5. Prestart reads preview cache synchronously and refreshes it without replacing the hero with a loading card.
6. Keep cleanup/handoff semantics so abandoned reservations are released and session claims remain intact.
7. Run Home entry and premint tests.

## Task 6 — implement approved Statistics-style prestart

Files:

- Modify `app/max_call_prestart.tsx`
- Add `tests/max_call_prestart_design_contract.test.ts`
- Reuse `components/StatsCardArtSurface.tsx`
- Reuse `components/home/MaxHomeOrb.tsx`
- Reuse `app/max_home_orb_assets.ts`

Steps:

1. Add failing design contracts for:
   - absence of “Ближайшие уроки”, flag, and school icon;
   - presence of Statistics card surface and MAX orb asset;
   - scrollability and 200% essential text scaling;
   - large high-contrast CTA and stable hero test IDs.
2. Replace tutor prestart card stack with one large hero card containing lesson number, unique title, short outcome, level/progress metrics, and remaining minutes.
3. Keep scenario/companion behavior functional, using the same shell without tutor-only fields.
4. Keep retry/fallback actions visible on mint failure.
5. Keep CTA busy/disabled semantics until mint is ready, announce readiness, and never show a large plan-loading placeholder.
6. Verify on narrow and large-text layouts through render tests and source contracts.

## Task 7 — focused regression and audit gates

Commands:

1. Run the new/changed Jest suites only.
2. Run the relevant MAX lifecycle, transcript, client teardown, mint, tutor goal, and review suites.
3. Run ESLint only on touched TypeScript/TSX files.
4. Run scoped TypeScript diagnostics and store full logs under `.codex-tmp/`.
5. Run `git diff --check` on touched files.
6. Re-run UI/UX and React Native accessibility checklists against the final screen.
7. Inspect the final diff for unrelated changes, forbidden removals, green-surface contrast, and accidental API-key use.

## Completion criteria

- All design-spec acceptance criteria pass.
- Every previously recorded audit finding has a code fix plus a deterministic test or explicit manual gate.
- The focused suite is green with no new scoped lint/type errors.
- No unrelated file is staged, reverted, or overwritten.

