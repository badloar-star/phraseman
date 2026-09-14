# Saved packs completion

**Goal:** Finish the audited saved-card / authored-pack workflow without changing unrelated work.

**Architecture:** Pack language is independent of the learning course. Preserve the existing EN/FR physical stores and sync contracts; expose all saved cards with explicit semantic language and original storage target. Public edits remain moderated; author withdrawal must fence pending reviews.

**Stack:** React Native, AsyncStorage, Firebase Functions/Firestore, TypeScript.

## Execution checklist

- [x] Regression tests: real storage adapters with in-memory disk; EN/FR retrieval, ES/DE text collisions, failed writes, metadata round trip, minimum 10, language-aware merge.
- [x] `hooks/use-flashcards.ts`, `app/flashcards/useCollectionData.ts`: load saved contours, preserve metadata, durable delete/undo, no metadata-stale render.
- [x] `components/youtube/YoutubeVideoPhrases.tsx`, `app/lingman_videos.tsx`: derive phrase language from its selected channel.
- [x] `app/community_pack_create.tsx`, `app/community_packs/*`: editor minimum, provenance, local/public linkage, retry identity, language entry parameters, catalog filtering.
- [x] `functions/src/community_packs.ts`, `firestore.rules`: author withdrawal cancels stale moderation, never uploads the new private revision, retains existing buyer access.
- [x] Collection UI: compact selection, grey disabled CTA, motion respecting reduced-motion preferences; speech follows card language.
- [x] Run narrow tests through shared semaphore; frontend syntax/lint and server type checks. Full frontend typecheck is not claimed (memory limit).
- [x] Update audit report with actual verification and any remaining deployment/runtime boundaries. No deploy or commit without authorization.
- [ ] Release-only gate: native runtime smoke (the existing localhost is a static mockup), Functions/index rollout and two-account visibility check. Not performed or substituted by unit tests.

## Acceptance examples

```ts
expect(filterByLanguage(await loadAllSavedFlashcards(), 'fr')).toHaveLength(1);
expect(await addFlashcard(spanishTaxi, 'es')).toBe('added');
await expect(removeFlashcardWithSnapshot(id, 'fr')).rejects.toThrow(); // disk failure
expect(localSaveError(nineCards)).not.toBeNull();
expect(roundTrip(ukrainianVideoCard).uk).toBe(ukrainianVideoCard.uk);
```

Run focused regression: `node tests/saved_packs_completion.test.cjs`. Heavy Jest and server typecheck require `.claude/semaphore/slot.sh acquire` and release in finally. Read exact touched code before edits; preserve existing changes and official learning gates.
