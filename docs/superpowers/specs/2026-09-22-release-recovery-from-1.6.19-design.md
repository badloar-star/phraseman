# Phraseman: controlled recovery from release 1.6.19

## Status

Proposed recovery design. No application code, release configuration, Git branch,
worktree, deployment, or store rollout is changed by this document.

## Decision

Release **1.6.19 / build 125** is the known-good performance baseline. Its
commit is `79369b347` (2026-09-15 17:58:05 +01:00). Future work must not try to
repair the accumulated post-release working branch in place. Instead, recovery
starts from this baseline and reintroduces only owner-approved features through
small, independently verifiable changes.

## Evidence and current state

- The current local checkout is on `feature/referral-roulette` at
  `efbe0dcd99012bfdcb83c524c262370eb16fb207`.
- It contains 222 commits after the 1.6.19 baseline, plus local modified and
  untracked files. It is not an appropriate release or diagnostic baseline.
- GitHub `master` is stale (`53bb633`, version 1.6.7 / build 112) and must not
  be treated as the source of the current application.
- The owner reports that 1.6.19 is responsive, while later builds exhibit slow
  taps and unacceptable interface lag. The performance regression has not yet
  been attributed to a particular change.

## Goals

1. Restore a reliable development and release path from the known-good 1.6.19
   state.
2. Preserve every later change for reference; no historic work is deleted.
3. Identify and reintroduce valuable post-1.6.19 features deliberately rather
   than inheriting the whole post-release state.
4. Make performance a release criterion measured on a physical device, not an
   impression from static audits.
5. Produce an understandable map of the systems that are retained and of every
   reintroduced feature's dependencies.

## Non-goals

- No mass cleanup, large refactor, dependency upgrade, or broad deletion.
- No attempt to make the current post-1.6.19 branch releasable before it has
  been decomposed.
- No production deployment, store submission, or rollout change in the
  recovery setup phase.
- No rewriting or deleting existing Git history, branches, or worktrees.

## Recovery architecture

### 1. Preserve the evidence

Before any code work, record the exact current `HEAD`, dirty-file inventory,
untracked-file inventory, and remote branch state in a recovery manifest. The
current branch remains an archive/quarantine source and is not modified as part
of recovery.

Create a new isolated recovery checkout only after the owner explicitly
approves its exact branch and worktree names. The checkout starts exactly at
`79369b347`; it does not merge, rebase, or copy the current branch.

### 2. Establish a performance acceptance baseline

Build and run the 1.6.19 source on a designated physical test device. Record a
small repeatable journey:

1. cold launch to usable home screen;
2. five main-tab changes;
3. opening and closing the main content surfaces used daily;
4. starting and completing a short lesson/flashcard interaction;
5. backgrounding and resuming the app;
6. repeating the journey after a normal user session has accumulated data.

For each step, capture observable timing and responsiveness evidence (screen
recording, device performance trace where available, and relevant application
logs). The baseline is the behaviour of 1.6.19 on the same device, not an
arbitrary millisecond target invented after the fact.

### 3. Build a feature ledger

From commits after `79369b347`, create a human-readable ledger. Every item is
one of:

- **Keep now:** independently valuable and low-risk to transfer;
- **Investigate:** has unclear dependencies, performance cost, or incomplete
  validation;
- **Defer:** desirable but not needed for recovery;
- **Reject:** obsolete, duplicate, or contrary to an owner decision.

The ledger records purpose, source commits/files, user-facing flow, data and
server dependencies, tests, performance-sensitive behaviour (listeners,
timers, lists, animations, large imports), and the verification journey.

### 4. Reintroduce one bounded change at a time

Each approved feature transfer gets its own short-lived branch from the
recovery baseline and one focused pull request. It may use a clean cherry-pick
only when its complete dependency chain is known; otherwise it is reimplemented
against the 1.6.19 architecture.

For each transfer, verify:

- its specified user journey works;
- relevant unit/contract tests pass;
- it does not introduce uncontrolled subscriptions, timers, large eager imports,
  or list rendering regressions;
- the 1.6.19 performance journey remains comparable on the same device;
- data, purchases, identity, and server contracts are inspected when affected.

If a transfer regresses responsiveness, revert that transfer only and return it
to **Investigate**. Do not compensate by removing unrelated code.

### 5. Rebuild release confidence

After every selected feature is green, run the complete release gate set and a
manual smoke journey covering sign-in, learning, flashcards, social/community
surfaces that were changed, purchases where applicable, offline/resume, and
account switching. Only then prepare a new version/build number and create a
candidate release.

## System map deliverable

The recovery ledger also becomes the first codebase map. It will be organized
by runtime area, not folders alone:

| Area | Owner-facing description | Client entry points | Data/server boundary | Runtime risk | Verification |
| --- | --- | --- | --- | --- | --- |
| Navigation and app lifecycle | How screens mount, freeze, resume, and fetch | Root layout, tabs, screen focus hooks | App state and persisted snapshots | timers, subscriptions, re-renders | performance journey |
| Learning and lessons | Lesson discovery, session state, rewards | lesson routes and state modules | content registries, Firestore, functions | content weight, state churn | short lesson |
| Flashcards | Collections, decks, video packs, study | flashcard routes and list components | local cache and Firestore | list rendering, media | open and study deck |
| Social/community | Community packs and likes | community routes/components | Firestore listeners/functions | listeners and data fan-out | open, like, return |
| Account/economy | identity, entitlements, balances | providers and action surfaces | Firebase/Auth/functions/Rules | correctness and offline behavior | sign-in and protected action |

The map will only describe code that has been inspected. Unknowns remain marked
as unknown; they are not guessed away.

## Safety rules

- Do not overwrite the current checkout or discard its uncommitted files.
- Do not update `master` to represent a release unless the owner explicitly
  directs that exact Git action.
- Do not upgrade app version/build numbers during recovery setup.
- No large "audit cleanup" changes are accepted without a traceable user flow,
  dependency analysis, and a performance check.
- Critical data, purchase, authentication, and permission changes require a
  separate focused review before transfer.

## Completion criteria for the recovery phase

The recovery phase is ready for a candidate release only when:

1. the recovery checkout derives exactly from 1.6.19;
2. current later work is preserved and documented as an archive source;
3. every transferred feature has a ledger entry and focused verification;
4. the agreed physical-device performance journey is comparable to 1.6.19;
5. release gates and the defined smoke journey pass; and
6. the owner has reviewed the resulting diff and release plan.

## First implementation decision required

Before creating any new checkout, the owner must approve the exact branch and
worktree names. Proposed names:

- branch: `recovery/from-1.6.19`
- worktree directory: `C:\appsprojects\phraseman-recovery-1.6.19`

No branch or worktree is created by this design document.
