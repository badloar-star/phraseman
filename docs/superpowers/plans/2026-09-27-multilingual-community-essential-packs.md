# Multilingual Community Essential Packs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish 180 community flashcard packs, isolated by all nine interface locales and four target-language contours.

**Architecture:** Make `en` a first-class pack source locale; carry `sourceLang` into each persisted document, market model, query and cache key; then generate and validate one source-locale-specific record for every target language, locale and theme. A privileged seed script writes owner-authorized, clearly non-user author nicknames that have no author permissions.

**Tech Stack:** TypeScript, React Native, Firebase Cloud Functions/Firestore, Node.js, Jest.

---

### Task 1: Add English to the community-pack source-locale contract

**Files:**
- Modify: `app/source_locales.ts`
- Modify: `app/flashcards/types.ts`
- Modify: `app/flashcards/marketplace.ts`
- Modify: `app/community_packs/schema.ts`
- Modify: `functions/src/community_packs.ts`
- Test: `functions/src/community_packs.test.ts`
- Test: `tests/flashcard_content_lang.test.ts`

- [ ] **Step 1: Write failing tests for an English-source submission.**

```ts
test('persists an English-source pack without a Russian fallback', async () => {
  const payload = { ...submissionPayload(), sourceLang: 'en', title: 'First conversations', description: 'Useful phrases' };
  const { submissionId } = await callCommunity('communitySubmitPackForReview', { authorStableId: 'attacker', payload, submissionKey: 'english_source_pack' });
  await require('./community_packs').communityModerateSubmission({ auth: { token: { admin: true } }, data: { submissionId, action: 'approve' } });
  expect(mockDocs.get(`community_packs/${submissionId}`)).toMatchObject({ sourceLang: 'en', titleEn: 'First conversations', descriptionEn: 'Useful phrases' });
});
```

- [ ] **Step 2: Run `npx jest functions/src/community_packs.test.ts tests/flashcard_content_lang.test.ts --runInBand`; expect a failure for missing English source fields.**

- [ ] **Step 3: Extend `SOURCE_LOCALES` with `en`, add `sourceLang`, `titleEn`, and `descriptionEn` to each client/server payload and market type, and preserve them in all three Cloud Function write paths (new approval, moderator edit, author edit).**

```ts
export const SOURCE_LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
sourceLang?: SourceLocale;
titleEn?: string;
descriptionEn?: string;
```

- [ ] **Step 4: Store an English card back under `sourceLocales.en` and make `resolveFlashcardBackText(card, 'en')` return it only; it must not fall through to Russian.**

- [ ] **Step 5: Re-run the command from Step 2; expect PASS. Commit only Task 1 paths with message `feat: support English-source community packs`.**

### Task 2: Enforce source-locale isolation at catalog boundaries

**Files:**
- Modify: `app/community_packs/communityFirestore.ts`
- Modify: `app/community_packs/communityCatalogFilter.ts`
- Modify: `app/flashcards/FlashcardsCategoryHub.tsx`
- Modify: `app/flashcards/marketplace.ts`
- Modify: `firestore.indexes.json`
- Create: `tests/community_pack_source_locale_isolation.test.ts`

- [ ] **Step 1: Write failing filter and cache-key tests.**

```ts
it('does not return Russian packs in a Ukrainian catalog', () => {
  const packs = [{ id: 'uk', packLanguage: 'en', sourceLang: 'uk' }, { id: 'ru', packLanguage: 'en', sourceLang: 'ru' }] as FlashcardMarketPack[];
  expect(applyCommunityPacksFilter(packs, '', 'popular', 'en', 'uk').map((p) => p.id)).toEqual(['uk']);
});
```

- [ ] **Step 2: Run `npx jest tests/community_pack_source_locale_isolation.test.ts --runInBand`; expect FAIL because the filter has no `sourceLang` argument.**

- [ ] **Step 3: Map `sourceLang` in `mapCommunityPackDocToMarket`, add `filterPacksBySourceLanguage`, pass `lang` from `FlashcardsCategoryHub`, and scope every warm cache key as `${studyTarget}:${sourceLang}`.**

```ts
export function filterPacksBySourceLanguage(packs: readonly FlashcardMarketPack[], sourceLang: SourceLocale) {
  return packs.filter((pack) => (pack.sourceLang ?? 'ru') === sourceLang);
}
```

- [ ] **Step 4: Add `where('sourceLang', '==', sourceLang)` to each published-pack query and a `community_packs` composite index for `packLanguage`, `sourceLang`, `listingStatus`. Select `titleEn`/`descriptionEn` directly in English UI; remove authored-language fallback for a locale-scoped community record.**

- [ ] **Step 5: Re-run `npx jest tests/community_pack_source_locale_isolation.test.ts tests/community_pack_catalog_owner_fixes.test.ts --runInBand`; expect PASS. Commit with `feat: isolate community packs by interface locale`.**

### Task 3: Create and validate the 180-pack content manifest

**Files:**
- Create: `content/community-packs/essential-v1/manifest.json`
- Create: `scripts/validate_community_essential_packs.mjs`
- Create: `tests/validate_community_essential_packs.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing validator tests for coverage, cardinality, identity and locale purity.**

```js
test('requires all 180 locale-target-theme packs', () => expect(() => validateManifest({ packs: [] })).toThrow('expected 180 packs'));
test('rejects a reserved nickname and an out-of-range pack', () => expect(() => validateManifest({ packs: [pack({ authorNickname: 'user admin', cards: Array(9) })] })).toThrow());
```

- [ ] **Step 2: Run `node --test tests/validate_community_essential_packs.test.mjs`; expect module-not-found.**

- [ ] **Step 3: Implement the validator using exactly these domains.**

```js
const TARGETS = ['en', 'fr', 'de', 'es'];
const SOURCE_LOCALES = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];
const THEMES = ['first_conversations', 'city_and_directions', 'food_and_shopping', 'emergencies', 'daily_actions'];
```

It must require 180 unique tuples, five themes per target/source pair, 10–18 cards, stable IDs, unique normalized target text within a pack, nonempty target and source text, and a nonempty <=32-character nickname other than `user admin`.

- [ ] **Step 4: Author `manifest.json`: one independent record for every tuple; a fixed random size in `10..18`; a unique natural nickname; localized title/description; and cards with target-side text in `packLanguage` and back text only in `sourceLang`.**

- [ ] **Step 5: Add `community-packs:essential:validate` to `package.json`, run it (expected `PASS: 180 packs; 36 target/source contours; 5 themes each`), then commit with `content: add multilingual essential community packs`.**

### Task 4: Build an idempotent seeded-content publisher with non-user nicknames

**Files:**
- Create: `scripts/publish_community_essential_packs.mjs`
- Create: `tests/publish_community_essential_packs.test.mjs`

- [ ] **Step 1: Write publisher tests.**

```js
test('dry run validates 180 submissions without writes', async () => {
  const result = await publishManifest({ dryRun: true, manifest, submit });
  expect(result.created).toBe(180);
  expect(submit).not.toHaveBeenCalled();
});
test('writes a seeded nickname without creating an author identity', async () => {
  const result = await publishManifest({ dryRun: false, manifest: onePackManifest, writePack });
  expect(writePack).toHaveBeenCalledWith(expect.objectContaining({ seededAuthorNickname: expect.any(String), authorStableId: null }));
});
```

- [ ] **Step 2: Run `node --test tests/publish_community_essential_packs.test.mjs`; expect module-not-found.**

- [ ] **Step 3: Implement a publisher that writes only a seed-specific nickname field and never creates or impersonates an account.**

```js
await writePack({ ...pack, id: `seed_essential_v1_${pack.id}`, authorStableId: null, seededAuthorNickname: pack.authorNickname, seedKind: 'essential_v1' });
```

Default to `--dry-run`; require `--publish` for remote writes. `seededAuthorNickname` is read only for documents carrying `seedKind: 'essential_v1'`; normal community submissions must remain unable to supply it.

- [ ] **Step 4: Run `node scripts/publish_community_essential_packs.mjs --dry-run`; expect `DRY RUN: 180 submissions; 0 remote writes`. Commit with `feat: add safe community pack publisher`.**

### Task 5: Gate the public write and verify the released catalog

**Files:**
- Create: `content/community-packs/essential-v1/publication-report.json` after publication

- [ ] **Step 1: Run `npm run community-packs:essential:validate` and `npx jest functions/src/community_packs.test.ts tests/community_pack_source_locale_isolation.test.ts tests/flashcard_content_lang.test.ts --runInBand`; expect both exit 0.**

- [ ] **Step 2: Immediately before publication, obtain confirmation that the next command will create 180 publicly visible catalog entries with owner-approved seeded nicknames.**

- [ ] **Step 3: Run `node scripts/publish_community_essential_packs.mjs --publish`; expect `PUBLISHED: 180; failed: 0; duplicated/replayed: 0`.**

- [ ] **Step 4: Verify one pack for every target/source pair in the ordinary user catalog and verify it is absent from other source locales. Store only IDs, locale/target pairs and counts in `publication-report.json`; commit it with `docs: record essential pack publication`.**

## Self-review

- Tasks 1–2 implement English source support and strict locale separation.
- Task 3 implements five variable-size themed packs for each of 36 target/source contours.
- Task 4 keeps random nicknames explicitly marked as seeded content rather than impersonating users.
- Task 5 makes the external publication confirmation and release verification explicit.
