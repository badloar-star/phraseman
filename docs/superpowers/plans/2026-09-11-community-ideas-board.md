# Community Ideas Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the existing Settings → Ideas submission flow into a public, immediately published community ideas board with Top/New tabs, full idea screens, idempotent likes integrated with existing profile activity, and admin soft deletion.

**Architecture:** Keep `user_ideas` as the canonical idea collection and keep the existing admin decision workflow compatible. Add separate public-list/detail callables and dedicated idea-like sent records, while reusing the existing received-like totals, notifications, auth, App Check, timeout, account-deletion, Rules, and audit patterns. The app owns presentation and a small read cache; Cloud Functions own all public projections, counters, like receipts, deletion state, and privacy filtering.

**Tech Stack:** React Native + Expo Router, TypeScript, Firebase callable functions, Firestore transactions and Rules, Jest/ts-jest, single live admin surface `admin/v2/legacy.html`.

---

## Scope and file map

### Create

- `app/ideas_types.ts` — shared client-facing idea/list/detail/error types and tab constants.
- `app/ideas_catalog.tsx` — public list and full-detail presentation, including loading/error/empty/deleted states.
- `tests/ideas_public_contract.test.ts` — client contract assertions for the new public API and state mapping.
- `functions/src/user_idea_likes.test.ts` — transaction/idempotency tests for idea likes and unlikes.
- `tests/ideas_admin_delete_contract.test.ts` — single-surface admin and callable deletion contracts.

### Modify

- `functions/src/user_ideas.ts` — publish defaults, public list/detail callables, admin soft delete, shared normalization.
- `functions/src/index.ts` — export the new callable functions if this project uses explicit function exports there.
- `app/ideas_client.ts` — list/detail/like/unlike/delete-safe client API, timeout and cache helpers.
- `app/ideas_submit.tsx` — preserve form behavior while navigating to the published idea and exposing server errors without losing drafts.
- `app/(tabs)/settings.tsx` — route the enabled Ideas row to the catalog instead of directly to the submit form.
- `app/remote_flags.ts` — only if the existing `ideas_enabled` type is missing from the typed flag union; keep the current default disabled.
- `firestore.rules` — close all new collections/subcollections with server-owned writes.
- `functions/src/account_delete.ts` — include `idea_likes_sent` in stable-user cleanup and retain existing received/notification cleanup behavior.
- `functions/src/jarvis/*_firestore_fetcher.ts` — update only the reader(s) that actually consume `user_ideas` or the new like projection.
- `functions/src/jarvis/jarvis_data_contract_guard.test.ts` — add the corresponding field/collection contract rows when a Jarvis reader is affected.
- `admin/v2/legacy.html` — add public/deleted filters, like counts, full-text display, soft-delete action, reason modal, and audit result handling.
- `tests/user_ideas_contract.test.ts` and/or `functions/src/user_ideas.test.ts` — extend current submit/admin tests without weakening the existing decision/reward behavior.

### Do not modify

- `admin/legacy.html`, `admin/index.html`, `admin/full.html`, `admin/site.html`, or retired admin V2 files.
- `functions/src/friend_activity_likes.ts` unless a narrowly scoped shared helper extraction is proven necessary; do not add idea-specific branches to that friend-domain callable.
- Existing Arena, League, Learning V2, or economy files unrelated to the feature.

## Data contract

The implementation must preserve existing fields and add these server-owned fields to `user_ideas/{ideaId}`:

```ts
type IdeaStatus = 'published' | 'approved' | 'rejected' | 'deleted';

type PublicIdeaProjection = {
  id: string;
  title: string;
  description: string;
  authorName: string;
  authorUid: string;
  category: string;
  likeCount: number;
  createdAtMs: number;
  status: 'published' | 'approved';
};
```

Server-only source fields remain excluded from public responses: `authUid`, admin decision fields, premium grant fields, and delete operator metadata.

Idea likes use:

- `users/{senderStableUid}/idea_likes_sent/{ideaId}` — sender-owned receipt, server writes only;
- `users/{authorStableUid}/activity_likes_received/{receiptId}` — existing received-like surface with `kind: 'idea'` and `ideaId`;
- `users/{authorStableUid}/activity_like_stats/summary` — existing total, transactionally maintained;
- existing notifications collection with `type: 'activity_like'`, `kind: 'idea'`, and idea navigation metadata.

## Task 1: Freeze contracts with failing tests

**Files:**
- Create: `tests/ideas_public_contract.test.ts`
- Modify: `functions/src/user_ideas.test.ts`
- Modify: `functions/src/account_delete.test.ts` only for the new collection-group expectation

- [ ] **Step 1: Add submit publication assertions.**

Assert that a submitted idea stores `status: 'published'`, `likeCount: 0`, a server-resolved `authorName`, and both numeric and ISO creation timestamps while retaining the current one-per-day rate limit.

- [ ] **Step 2: Add public projection assertions.**

Define expected public response keys and assert that `authUid`, `decidedBy`, premium fields, and delete operator fields are absent.

- [ ] **Step 3: Add account-deletion collection coverage.**

Assert that the deletion collection-group registry includes `idea_likes_sent.ideaId`/stable-owner cleanup and does not require direct client deletion.

- [ ] **Step 4: Run only the focused tests.**

Run:

```powershell
npx jest --runInBand functions/src/user_ideas.test.ts tests/ideas_public_contract.test.ts functions/src/account_delete.test.ts
```

Expected: new assertions fail because the public callables and fields do not exist yet; existing tests must remain green.

## Task 2: Implement the server idea lifecycle

**Files:**
- Modify: `functions/src/user_ideas.ts`
- Modify: `functions/src/index.ts` if required by current export style
- Test: `functions/src/user_ideas.test.ts`, `tests/ideas_public_contract.test.ts`

- [ ] **Step 1: Extract shared normalization helpers.**

Add bounded text/status/category parsing and a `toPublicIdeaProjection()` helper. The helper must select only `id`, title, description, public author name, category, like count, created timestamp, and public status.

- [ ] **Step 2: Update `submitUserIdea` atomically.**

Keep the existing auth, stable UID, App Check, daily quota, payload limits, and multilingual fields. Resolve the display name from the server-owned public profile/user document; use the client `userName` only as a fallback candidate after validation. Write `status: 'published'`, `likeCount: 0`, `updatedAtMs`, and timestamps in the same transaction.

- [ ] **Step 3: Add `listPublicUserIdeas`.**

Accept `{ tab: 'top' | 'new', limit?: number, cursor?: string }`. Clamp the limit to 50. Query only `status in ['published', 'approved']`, order Top by `likeCount DESC, createdAtMs DESC` and New by `createdAtMs DESC`, then return projections plus an opaque cursor. Do not return private or admin-only fields.

- [ ] **Step 4: Add `getPublicUserIdea`.**

Accept one bounded `ideaId`. Return a projection plus full description. Return `not-found` for missing/deleted records so stale detail screens have one predictable state.

- [ ] **Step 5: Add `adminDeleteUserIdea`.**

Require `admin: true`, a valid admin role, and the existing ideas permission. Accept `{ ideaId, reason }`, require a non-empty bounded reason, and transactionally move the idea to `status: 'deleted'` with `deletedAtMs`, `deletedBy`, `deleteReason`, and `updatedAtMs`. Keep the document for admin history; do not delete likes from the public query path.

- [ ] **Step 6: Preserve current decision workflow.**

Keep `adminListUserIdeas`, `adminDecideUserIdea`, and `adminDraftIdeaDecision` behavior intact. A deleted idea cannot be approved/rejected through the normal workflow unless the admin explicitly restores it in a future scope; the current plan only hides it.

- [ ] **Step 7: Run focused server tests.**

Run:

```powershell
npx jest --runInBand functions/src/user_ideas.test.ts tests/ideas_public_contract.test.ts
```

Expected: publication, projection filtering, pagination bounds, deleted-detail behavior, and admin permission tests pass.

## Task 3: Add idempotent idea likes

**Files:**
- Create: `functions/src/user_idea_likes.test.ts`
- Modify: `functions/src/user_ideas.ts` or create `functions/src/user_idea_likes.ts` with exports wired through `functions/src/index.ts`
- Test: `functions/src/user_ideas.test.ts`

- [ ] **Step 1: Write transaction tests first.**

Cover: first like increments idea count and author total; same user retry returns the same current receipt without incrementing; unlike decrements once; repeated unlike is a no-op; deleted/missing idea rejects; self-like policy is explicit and tested; concurrent duplicate calls cannot produce a count above one per sender/idea.

- [ ] **Step 2: Implement deterministic receipt IDs.**

Derive the sent document ID from a versioned hash of `ideaId` and sender stable ID. Never use timestamps or client-provided random IDs for uniqueness.

- [ ] **Step 3: Implement `likeUserIdea`.**

Resolve the authenticated stable user, validate the auth link, load the idea and author in one Firestore transaction, reject non-public statuses, and short-circuit when the sent receipt already exists. On first like, write the sent receipt, increment `likeCount`, write the author received receipt, increment the existing author `activity_like_stats/summary.total`, and create the existing notification shape with `kind: 'idea'`.

- [ ] **Step 4: Implement `unlikeUserIdea`.**

Load the deterministic receipt and idea in one transaction. If absent, return `removed: false`. If present, delete the receipt, clamp `likeCount` and author total at zero, and return the authoritative counts. Never delete historical received notifications unless existing product policy explicitly requires it.

- [ ] **Step 5: Run focused like tests.**

Run:

```powershell
npx jest --runInBand functions/src/user_idea_likes.test.ts
```

Expected: all idempotency and counter invariants pass.

## Task 4: Close Rules, account deletion, and Jarvis contracts

**Files:**
- Modify: `firestore.rules`
- Modify: `functions/src/account_delete.ts`
- Modify: affected `functions/src/jarvis/*_firestore_fetcher.ts`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts` when a reader is affected
- Test: `tests/ideas_security_contract.test.ts` (create if no existing focused file covers the exact rules)

- [ ] **Step 1: Add Rules assertions.**

Keep `user_ideas` client create/read/update/delete disabled. Add explicit server-owned rules for `users/{userId}/idea_likes_sent/{ideaId}` and prevent client writes to idea counters, received receipts, totals, and notifications.

- [ ] **Step 2: Extend account deletion.**

Add the new sent-like collection to the stable-user collection-group cleanup/quarantine registry. Verify received-like and notification cleanup continues to cover `kind: 'idea'` without adding a second deletion path.

- [ ] **Step 3: Audit Jarvis readers.**

Search `functions/src/jarvis/*_firestore_fetcher.ts` for `user_ideas`, `likeCount`, or the new collection names. If a reader consumes the changed schema, update its normalization and the data-contract guard in the same change. If no reader consumes it, record that no new department/contract row is required in the implementation notes, without inventing a Jarvis department.

- [ ] **Step 4: Run security and deletion contracts.**

Run:

```powershell
npx jest --runInBand tests/ideas_security_contract.test.ts tests/account_delete_flow_contract.test.ts functions/src/account_delete.test.ts functions/src/jarvis/jarvis_data_contract_guard.test.ts
```

Expected: no client-owned write path, no orphaned sent likes, and no Jarvis drift.

## Task 5: Build the client API and cache

**Files:**
- Create: `app/ideas_types.ts`
- Modify: `app/ideas_client.ts`
- Modify: `tests/ideas_client_cache.test.ts`

- [ ] **Step 1: Add typed public API.**

Define `IdeaTab`, `PublicIdea`, `IdeaPage`, `IdeaClientError`, and `IdeaLikeState` types. Keep `IdeaInput` backward compatible with `ideas_submit.tsx`.

- [ ] **Step 2: Add cached callable wrappers.**

Implement `listPublicUserIdeas`, `getPublicUserIdea`, `likeUserIdea`, and `unlikeUserIdea` using the existing Firebase region, App Check warmup, callable timeout, and cloud-availability guards. Normalize errors to stable codes: `offline`, `not-found`, `rate-limited`, `permission-denied`, `unknown`.

- [ ] **Step 3: Add read caching without polling.**

Cache each tab by account generation and tab key for the current screen lifetime/short TTL. Refresh on entering the screen, tab change, explicit pull-to-refresh, and successful like/unlike. Do not add `setInterval` or background listeners.

- [ ] **Step 4: Add client tests.**

Assert callable caching, stale-page replacement, retry behavior, like state restoration, and no cache leakage across account generations.

## Task 6: Implement mobile screens and navigation

**Files:**
- Create: `app/ideas_catalog.tsx`
- Modify: `app/ideas_submit.tsx`
- Modify: `app/(tabs)/settings.tsx`
- Modify: `tests/approved_ux_context.test.cjs` and create `tests/ideas_catalog.test.tsx` if no suitable screen test exists

- [ ] **Step 1: Route the Settings row.**

When `isIdeasEnabled()` is true, route to the catalog. Preserve the existing direct submit route only as the catalog’s `+` action. When the flag is false, keep the row hidden and make direct route access return safely to Settings.

- [ ] **Step 2: Build catalog layout.**

Use `ScreenGradient`, `SafeAreaView`, `SectionSheetHeader`, the existing theme context, `BouncyScrollView`, and 44 dp minimum targets. Render Top/New with compact rows and no full description. Use dark text on all lime surfaces per the project UI rule.

- [ ] **Step 3: Build full detail state.**

Load by ID, show author name/date/full description, show filled/unfilled like state, handle not-found/deleted, and update the local row/detail projection from the callable response without inventing a client-authoritative count.

- [ ] **Step 4: Integrate submission success.**

Keep the current form validation and one-per-day server rule. On success, invalidate New/Top caches, show the success state, and offer opening the created idea. On failure, preserve the draft and map the rate limit/network message without nesting incompatible RN `Modal` alerts.

- [ ] **Step 5: Add screen tests.**

Cover: flag-off route guard, tab labels, author/title rendering, empty/loading/error states, full detail navigation, like/unlike calls, validation, submitting lock, success navigation, and deleted detail.

## Task 7: Extend the live admin surface

**Files:**
- Modify: `admin/v2/legacy.html`
- Create/modify: `tests/ideas_admin_delete_contract.test.ts`

- [ ] **Step 1: Extend the idea card projection.**

Render public/deleted status, like count, author name, created time, and delete metadata only where the admin list is permitted to show it.

- [ ] **Step 2: Add filters.**

Add `published`, `approved`, `rejected`, `deleted`, and `all` options without removing the existing pending/decided workflow. Keep the current callable pagination and stale-source health behavior.

- [ ] **Step 3: Add delete action and modal.**

Add a reason field, require non-empty reason, disable buttons during the call, invoke `adminDeleteUserIdea`, refresh the current filter, and show a truthful success/error toast. Do not hard-delete the Firestore document from the browser.

- [ ] **Step 4: Add single-surface contracts.**

Assert the new UI exists only in `admin/v2/legacy.html`, the callable name is wired, App Check enforcement is not enabled as a side effect, and the old admin paths remain untouched.

- [ ] **Step 5: Run admin contracts.**

Run:

```powershell
npx jest --runInBand tests/ideas_admin_delete_contract.test.ts tests/admin_single_surface_contract.test.ts functions/src/user_ideas.test.ts
```

## Task 8: Verification and staged rollout checks

**Files:**
- Modify only focused tests discovered during implementation; no unrelated cleanup.

- [ ] **Step 1: Run focused unit/contract gates.**

Run the server idea, like, Rules, account-delete, client, screen, and admin tests from Tasks 1–7.

- [ ] **Step 2: Run TypeScript checks only after acquiring the repository semaphore slot.**

```powershell
bash .claude/semaphore/slot.sh acquire "ideas board focused typecheck"
npx tsc --noEmit --pretty false
bash .claude/semaphore/slot.sh release
```

If the typecheck is too broad for the machine, use the repository’s existing focused type/test command rather than bypassing the semaphore.

- [ ] **Step 3: Verify the live prototype journeys manually.**

Check enabled/disabled flag, Top/New ordering, detail, like/unlike retry, new idea publication, daily quota, deleted detail, admin delete, and account switch boundaries.

- [ ] **Step 4: Run the project’s required completion verification.**

Use the verification-before-completion checklist. Confirm `git diff --check`, focused test output, Rules/Jarvis contracts, and that no unrelated dirty files were staged.

- [ ] **Step 5: Commit only the feature files.**

Stage the exact files changed by Tasks 1–8. Do not use `--no-verify`; if an unrelated repository guard blocks the commit, report the guard and leave unrelated files untouched.

## Implementation order and checkpoints

1. Tasks 1–4 establish server/data/security contracts.
2. Task 5 provides a typed client boundary.
3. Task 6 adds the mobile experience.
4. Task 7 adds admin deletion.
5. Task 8 runs the focused gates and final verification.

Each task should be independently reviewable. No task may silently delete an existing feature, weaken a guard, bypass App Check policy, or introduce a second balance/like authority.

