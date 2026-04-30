# Architecture Notes

This document tracks module responsibilities and dependencies for recently split files.

## Flashcards Domain

- `app/flashcards.tsx`
  - Orchestrates screen state, animations, and user interactions.
  - Depends on `types`, `constants`, `system-cards`, `storage`, and `selectors`.
- `app/flashcards/types.ts`
  - Shared domain types for cards and categories.
  - Imported by all flashcards submodules.
- `app/flashcards/constants.ts`
  - UI-facing strings, categories metadata, and tint helpers.
  - Depends on `types`.
- `app/flashcards/system-cards.ts`
  - Canonical predefined cards dataset.
  - Depends on `types`.
- `app/flashcards/storage.ts`
  - AsyncStorage read/write wrappers for custom cards and progress.
  - Used by `flashcards.tsx`.
- `app/flashcards/selectors.ts`
  - Pure functions for derived lists and filter groups/options.
  - Depends on `types`.

## Settings Domain

- `app/(tabs)/settings.tsx`
  - Screen UI and interaction flows for account/settings actions.
  - Delegates profile-name validation and local cache propagation to service.
- `app/settings/profile_name_service.ts`
  - Shared name validation rules and cache-sync routines.
  - Depends on `AsyncStorage`; used by `settings.tsx`.

## Home UX Orchestration

- `app/(tabs)/home.tsx`
  - Uses a priority-based modal queue to avoid overlay collisions.
  - Priority: user warning -> league result -> shard reward -> onboarding -> bug hunt -> tooltips.

## Arena Contracts

- `docs/ARENA_FIRESTORE_CONTRACT.md`
  - Canonical field contract for `arena_rooms` and `arena_invites`.
  - Use this file as the single source of truth for client/functions/rules updates.

## Why This Split

- Reduces cognitive load in large screen files.
- Makes derived logic testable and reusable.
- Keeps storage and validation concerns out of UI rendering code.
