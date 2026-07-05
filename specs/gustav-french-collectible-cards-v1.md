# Gustav French Collectible Cards V1

## Objective

Build a French-native collectible-card candidate for `studyTarget=fr` with English Treasure/Collectibles blueprint parity, without editing English collectible production files or French lesson files.

The French candidate must contain at least as much content as English:

- 30 sets.
- 10 regular cards per set.
- 1 secret card per set.
- 300 droppable cards and 30 set-completion secret cards.
- 150 common, 90 rare, 45 epic, 15 legendary regular cards.

Production activation remains closed until every source, image, runtime, admin, server, storage, rollback, and explicit activation gate passes.

## Source-Of-Truth Files Inspected

- `tools/collectibles/catalog_seed.json`
- `tools/collectibles/generate.mjs`
- `tools/collectibles/STYLE_GUIDE.md`
- `tools/collectibles/README.md`
- `tools/collectibles/AGENTS.md`
- `app/collectibles/catalog_data.ts`
- `app/collectibles/catalog.ts`
- `app/collectibles/storage.ts`
- `app/collectibles_screen.tsx`
- `app/collectibles/collectible_image_url_map.generated.ts`
- `functions/src/collectibles.ts`
- `functions/src/collectibles_catalog.ts`
- `tests/collectibles_catalog_contract.test.ts`
- `tests/collectibles_card_images_contract.test.ts`
- `scripts/export-codex-dalli-results.mjs`

## English Blueprint Facts

1. The English catalog is generated from `tools/collectibles/catalog_seed.json`; generated app/server files must not be edited by hand.
2. The live catalog has 30 sets, each with 10 droppable cards plus 1 secret card.
3. Set type controls rarity distribution:
   - Type `A`: 5 common, 3 rare, 2 epic, 0 legendary.
   - Type `B`: 5 common, 3 rare, 1 epic, 1 legendary.
4. With 15 type `A` and 15 type `B` sets, the total regular-card distribution is 150 common, 90 rare, 45 epic, 15 legendary.
5. Card text shape is:
   - target phrase,
   - IPA,
   - literary RU equivalent,
   - literal RU translation,
   - simple RU meaning,
   - target-language example,
   - RU example translation,
   - origin/fact note,
   - rarity,
   - art fallback.
6. The current English runtime is single-catalog and server-owned:
   - server roll source: `functions/src/collectibles.ts`
   - client inventory key: `collectibles_owned_v1`
   - state key: `collectibles_state_v1`
   - claim callable: `collectiblesClaimDrop`
7. English image URLs are remote `.webp`; inline SVG is the fallback. Local DALL-E sources are exported through `scripts/export-codex-dalli-results.mjs`.

## Current French Facts

1. Existing Gustav French collectible work only covers a small translation packet for `set09_work`, `set10_home`, and `set11_love`.
2. It does not create a French-native 30-set collectible catalog.
3. It does not provide 330 French idiom/expression rows.
4. It does not provide full source evidence per row.
5. It does not provide a 330-item DALL-E generation queue.
6. There is no production runtime switch for a target-specific collectible catalog yet.

## Gap List

- `fr_collectible_catalog_full_330`: missing.
- `fr_collectible_rarity_parity`: missing.
- `fr_collectible_source_evidence_per_row`: missing.
- `fr_collectible_dalle_queue_330`: missing.
- `fr_collectible_runtime_target_isolation`: not applied.
- `fr_collectible_server_roll_pool_target_isolation`: not applied.
- `fr_collectible_admin_activation_handoff`: missing.

## Exact Requirements

### FR-COLL-001: English Shape Parity

Build artifacts must prove 30 sets, 300 regular cards, and 30 secret cards. Every set must preserve the English set order, type, and rarity distribution.

The user-facing French catalog must not look like an English catalog copy. English row/set ids, English set titles, and source-English anchors are allowed only in the blueprint audit artifact. They must not appear on French catalog rows or sets that can be consumed by runtime/admin surfaces.

### FR-COLL-002: French-Native Content

French rows must be French idioms, locutions, proverbs, or living fixed expressions. They must not be translations of English collectible rows.

French set ids and card ids must be French-native slugs, not `fr_` plus an English card id such as `fr_animals_01`.

### FR-COLL-003: Text Style Parity

Every row must include the same explanation style as English:

- `fr`: the real French phrase as spoken/written.
- `ipaFr`: French IPA without slashes.
- `ru`: literary equivalent, not literal.
- `literalRu`: literal RU translation, lowercase where natural.
- `meaningRu`: simple one-sentence meaning.
- `exampleFr`: natural French example with the phrase inside.
- `exampleRu`: conversational RU translation of the example.
- `originRu`: short origin/fact note; if origin is uncertain, say that clearly.

### FR-COLL-004: Source Evidence

Every row must carry at least two trusted source lookup records from the approved French source family:

- CNRTL
- Larousse
- Le Robert
- Dictionnaire de l'Academie francaise
- TV5MONDE

Rows without source evidence remain HOLD.

### FR-COLL-005: DALL-E Queue

Create a file-based DALL-E queue with 330 items. Each item must include:

- card id,
- set id,
- rarity or `secret`,
- phrase,
- literal-scene subject,
- prompt derived from the approved PhraseMan Collectibles raster style guide: warm cinematic 3D storybook scene, full-bleed 1024x819 frame, no text, no UI frame, no rarity badge, no transparent/flat-vector look,
- source output path,
- final webp target path.

The queue must not call in-thread image generation. Bulk generated images must be written to ignored source/checkpoint directories and exported/compressed through a file pipeline.

### FR-COLL-006: Runtime And Server Hold

Do not modify app/server runtime catalog files in this build. French collectible activation must stay as generated candidate artifacts until a later target-isolated runtime spec is approved.

### FR-COLL-007: Admin Handoff

Create an admin handoff artifact naming all open and closed gates. It must explicitly keep:

- `activationApproved=false`
- `liveUploadPerformed=false`
- `runtimeApplyPerformed=false`
- `englishCatalogModified=false`
- `lessonFilesModified=false`

## Edge Cases

- French phrase contains apostrophes or accents.
- Secret cards must not enter the droppable pool.
- A row may have uncertain origin, but must say it is uncertain.
- Source URL syntax alone is not enough for final activation; it is enough only for queue/handoff until live source verification is run.
- No row may leak English text as the studied phrase.
- No card id may collide with English card ids.

## Gates And Tests

Add:

- `scripts/gustav_build_fr_collectible_cards_v1.mjs`
- `tests/gustav_fr_collectible_cards_v1.test.ts`

The test must verify:

- 30 sets.
- 330 total rows.
- 300 regular rows.
- 30 secret rows.
- rarity totals 150/90/45/15.
- every set has 10 cards plus 1 secret.
- every row has French fields, RU explanation fields, source evidence, and a DALL-E queue item.
- generated artifacts keep activation closed.
- English production collectible files are only inspected, not modified by the builder.

## Files To Edit

Allowed:

- `specs/gustav-french-collectible-cards-v1.md`
- `scripts/gustav_build_fr_collectible_cards_v1.mjs`
- `tests/gustav_fr_collectible_cards_v1.test.ts`
- generated Gustav artifacts under `docs/gustav/generated/fr/collectibles/`

Forbidden in this build:

- `tools/collectibles/catalog_seed.json`
- `app/collectibles/catalog_data.ts`
- `functions/src/collectibles_catalog.ts`
- `app/collectibles/collectible_image_url_map.generated.ts`
- French lesson files and lesson generated artifacts.

## Definition Of Done

Done for this build means:

1. Spec exists.
2. Builder generates a complete French collectible candidate.
3. Builder generates English-blueprint audit evidence.
4. Builder generates source evidence manifest for every row.
5. Builder generates DALL-E queue for every row.
6. Builder generates admin/runtime/server activation handoff with activation closed.
7. Narrow test passes.

Production activation is still HOLD until source verification and image generation/upload are complete.

## Explicit Blockers Keeping Production On HOLD

- Live source verification has not been executed for all 330 rows.
- 330 DALL-E `.webp` assets have not been generated, compressed, checked, and uploaded.
- French target-specific runtime/server roll pool has not been applied.
- Admin UI activation controls have not been wired.
- Explicit activation approval is absent.

## Build Handoff

Build target: `fr_collectible_cards_v1`.

First command:

```bash
node scripts/gustav_build_fr_collectible_cards_v1.mjs
```

Verification:

```bash
npx jest --runTestsByPath tests/gustav_fr_collectible_cards_v1.test.ts --no-cache --runInBand
```
