# Avatar Aura Catalog Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship nine approved ordinary layered avatar auras under compatibility-safe catalog IDs, return all eight legacy ordinary slots to sale, and add separately selected top-tier Plus and Pro layered art.

**Architecture:** Keep ownership and selection stable by changing visual resolution and catalog availability without migrating existing IDs. A focused catalog-art resolver statically maps the eleven production IDs to three WebP layers and `AvatarAura` composes it with the unchanged Season Pass resolver. Candidate generation and rejected art remain ignored; a deterministic finalizer is the only path that copies selected, normalized layers into the application bundle.

**Tech Stack:** React Native, TypeScript, Expo `Animated.Image`, Jest, Node.js, Sharp, built-in Codex image generation, static Metro `require()` assets.

---

## File Structure

- Create `app/avatar_aura_catalog_art.ts`: static ID-to-layer mapping and per-aura motion metadata for ordinary, Plus, and Pro auras only.
- Modify `components/AvatarAura.tsx`: prefer catalog layered art, retain Season Pass fallback, use the approved 1.50 scale.
- Modify `constants/avatar_auras.ts`: add Lime Pulse and remove the five legacy retirement flags; do not change stable IDs, price, or Plus/Pro gates.
- Create `scripts/finalize_avatar_aura_assets.mjs`: validate two selection manifests and copy/compress only selected layers into production paths.
- Create `tests/avatar_aura_layered_assets.test.ts`: resolver completeness, static asset presence, alpha, geometry, and Ice exclusion.
- Modify `tests/avatar_aura_catalog_rework.test.ts`: assert nine ordinary sale items and preserved IDs.
- Modify `tests/customization_purchase_validation.test.ts`: assert all nine ordinary IDs validate at exactly 120 pearls.
- Modify `tests/avatar_auras.test.ts`: assert Plus/Pro access behavior is unchanged and both IDs resolve to catalog art.
- Modify `.codex-tmp/avatar-aura-candidates/pipeline.mjs`: ignored candidate-only support for approved ordinary winners plus Plus/Pro A/B/C comparison.
- Modify `.codex-tmp/avatar-aura-candidates/pipeline.test.mjs`: ignored candidate QA for the final comparison page.
- Create `.codex-tmp/avatar-aura-candidates/approved-ordinary-selection.json`: exact nine approved choices.
- Create `.codex-tmp/avatar-aura-candidates/subscription-selection.json`: user choice contract containing one Plus and one Pro variant after visual review.
- Add `assets/images/avatar_auras/<aura-id>/{base,flow,particles}.webp`: 33 final statically required production files.

Do not modify Season Pass assets, Nimbus behavior, ownership storage, cloud-sync merge logic, the composite purchase journal, Firestore schemas, or Jarvis contracts.

### Task 1: Lock the approved ordinary winners in the candidate pipeline

**Files:**
- Create: `.codex-tmp/avatar-aura-candidates/approved-ordinary-selection.json`
- Modify: `.codex-tmp/avatar-aura-candidates/pipeline.test.mjs`
- Modify: `.codex-tmp/avatar-aura-candidates/pipeline.mjs`

- [ ] **Step 1: Write the approved selection manifest**

```json
{
  "aura-aurora": { "slot": "polar-orbit", "variant": "a" },
  "aura-ember": { "slot": "rose-plasma", "variant": "a" },
  "aura-mint": { "slot": "jade-current", "variant": "a" },
  "aura-violet": { "slot": "velvet-eclipse", "variant": "a" },
  "aura-coral": { "slot": "solar-ribbon", "variant": "c" },
  "aura-prism": { "slot": "prism-fold", "variant": "a" },
  "aura-lagoon": { "slot": "lagoon-helix", "variant": "c" },
  "aura-sunset": { "slot": "sunset-vector", "variant": "a" },
  "aura-lime-pulse": { "slot": "lime-pulse", "variant": "a" }
}
```

- [ ] **Step 2: Add a failing final-gallery contract**

Add a Node test that calls `buildFinalGallery()` and asserts:

```js
assert.equal((html.match(/data-kind="approved-ordinary"/g) ?? []).length, 9);
assert.equal((html.match(/data-tier="plus"/g) ?? []).length, 3);
assert.equal((html.match(/data-tier="pro"/g) ?? []).length, 3);
assert.doesNotMatch(html, /ice-halo/i);
assert.match(html, /points="50,3\.5 93,26 93,74 50,96\.5 7,74 7,26"/);
assert.match(html, /--avatar-size:38%;--aura-canvas-size:59%/);
```

- [ ] **Step 3: Run the test and confirm the intended failure**

Run:

```powershell
node --test .codex-tmp/avatar-aura-candidates/pipeline.test.mjs
```

Expected: FAIL because `buildFinalGallery` and the Plus/Pro candidate sources do not exist yet.

- [ ] **Step 4: Add final-gallery input validation**

Extend the ignored pipeline with:

```js
import assert from 'node:assert/strict';

const approvedOrdinary = JSON.parse(await fs.readFile(
  path.join(ROOT, 'approved-ordinary-selection.json'),
  'utf8',
));
const SUBSCRIPTION_SLOTS = [
  { id: 'plus-auric-throne', tier: 'plus', palette: ['#FFF3B0', '#F7C94C', '#A96B12'] },
  { id: 'pro-singularity-reactor', tier: 'pro', palette: ['#F5FBFF', '#3B82F6', '#7C3AED'] },
];

function assertOrdinarySelection() {
  const expectedIds = [
    'aura-aurora', 'aura-ember', 'aura-mint', 'aura-violet', 'aura-coral',
    'aura-prism', 'aura-lagoon', 'aura-sunset', 'aura-lime-pulse',
  ];
  assert.deepEqual(Object.keys(approvedOrdinary), expectedIds);
  assert.equal(Object.values(approvedOrdinary).some(({ slot }) => slot === 'ice-halo'), false);
}
```

Use the existing `candidateCard`, real hex markup, dark/light surfaces, visibility pause, and Reduced Motion CSS. Render nine locked ordinary cards and three selectable candidates for each subscription tier. Set the preview canvas to `59%`, which is slightly larger than the accepted corrected `57%` preview while retaining the verified 320-pixel safe radius.

- [ ] **Step 5: Re-run the candidate tests**

Run the same Node test command. Expected: the existing ordinary crop tests pass; the final-gallery test still fails only because the two generated source sheets are absent.

Candidate files are intentionally ignored and are not committed.

### Task 2: Generate three Plus and three Pro variants and present the mockup

**Files:**
- Create: `.codex-tmp/avatar-aura-candidates/sources/plus-auric-throne.png`
- Create: `.codex-tmp/avatar-aura-candidates/sources/pro-singularity-reactor.png`
- Create: `.codex-tmp/avatar-aura-candidates/crops/plus-auric-throne/{a,b,c}-{base,flow,accents}.webp`
- Create: `.codex-tmp/avatar-aura-candidates/crops/pro-singularity-reactor/{a,b,c}-{base,flow,accents}.webp`
- Modify: `.superpowers/brainstorm/2027-1787226456/content/aura-candidates-generated.html`

- [ ] **Step 1: Generate the Plus sheet with built-in image generation**

Use one image-generation call with this exact production brief:

```text
Create a transparent 3-by-3 sprite sheet for a premium mobile-app avatar aura named Auric Throne. Columns A, B, C are three genuinely different variants. Rows are BASE, FLOW, ACCENTS. Every cell contains only one isolated, centered transparent aura layer on the same square canvas, designed around an open regular hexagonal avatar centre. Palette: pale pearl white, rich warm gold, restrained amber depth. BASE is a broad elegant six-part light structure; FLOW is a braided royal light ribbon that can rotate independently; ACCENTS are sparse diamond glints. Crown-like rhythm is allowed but no literal crown object, text, letters, avatar, panel, border, opaque background, wings, weapons, gems, scenery, or confetti. Keep all visible pixels inside 90% of each cell with a wide transparent rotation margin. Clean collectible Phraseman style, readable at 44 px, compatible with light and dark UI.
```

Save the generated original to the exact Plus source path. Do not use an API key and do not generate more than this single sheet in the call.

- [ ] **Step 2: Generate the Pro sheet with built-in image generation**

Use one image-generation call with this exact production brief:

```text
Create a transparent 3-by-3 sprite sheet for the highest-tier mobile-app avatar aura named Singularity Reactor. Columns A, B, C are three genuinely different variants. Rows are BASE, FLOW, ACCENTS. Every cell contains only one isolated, centered transparent aura layer on the same square canvas, designed around an open regular hexagonal avatar centre. Palette: white-hot blue, saturated cobalt, restrained ultraviolet. BASE is a broken gravitational reactor structure; FLOW is a powerful energy rail or lens arc that can counter-rotate; ACCENTS are sparse electric shards and pulse highlights. It must feel visibly more advanced and energetic than a gold premium aura while staying clean and readable. No text, letters, avatar, panel, border, opaque background, literal machine, wings, weapons, scenery, or confetti. Keep all visible pixels inside 90% of each cell with a wide transparent rotation margin. Clean collectible Phraseman style, readable at 44 px, compatible with light and dark UI.
```

Save the generated original to the exact Pro source path. Do not use an API key and do not generate more than this single sheet in the call.

- [ ] **Step 3: Crop, normalize, and verify all 18 subscription layers**

Run through the safe wrapper:

```powershell
node scripts/codex-safe-run.mjs --name avatar-aura-subscription-crops -- node .codex-tmp/avatar-aura-candidates/pipeline.mjs crop-subscriptions
node scripts/codex-safe-run.mjs --name avatar-aura-subscription-verify -- node .codex-tmp/avatar-aura-candidates/pipeline.mjs verify-subscriptions
```

Expected summary: `verified 18/18 subscription aura elements`; every crop is a 320×320 alpha WebP, centre offset is at most 1.5 pixels, and rotation radius is at most 147 pixels.

- [ ] **Step 4: Build and test the final comparison page**

```powershell
node .codex-tmp/avatar-aura-candidates/pipeline.mjs final-gallery
node --test .codex-tmp/avatar-aura-candidates/pipeline.test.mjs
```

Expected: PASS; the page contains nine approved ordinary cards, three Plus candidates, three Pro candidates, no Ice Halo, real hex avatars, dark animated previews, and light static previews.

- [ ] **Step 5: Open the existing local mock and stop for user selection**

Open or refresh `http://localhost:52033/`. Ask the user to choose A, B, or C for Plus and Pro. Do not copy any subscription candidate into `assets/images/**` before both choices are explicit.

- [ ] **Step 6: Record the two choices**

Write `.codex-tmp/avatar-aura-candidates/subscription-selection.json` in this validated format:

```json
{
  "aura-plus": { "slot": "plus-auric-throne", "variant": "a" },
  "aura-pro": { "slot": "pro-singularity-reactor", "variant": "a" }
}
```

Replace only the variant letters with the user's actual A/B/C choices. The finalizer rejects missing IDs, extra IDs, unknown slots, and variants outside `a`, `b`, or `c`.

Candidate files remain ignored and are not committed.

### Task 3: Return all legacy ordinary IDs to sale and add Lime Pulse

**Files:**
- Modify: `tests/avatar_aura_catalog_rework.test.ts`
- Modify: `tests/customization_purchase_validation.test.ts`
- Modify: `constants/avatar_auras.ts`

- [ ] **Step 1: Write failing catalog tests**

Change the exact catalog ID list to include `aura-lime-pulse` immediately after `aura-sunset`. Replace the retired-only tests with:

```ts
const ORDINARY_SALE_AURA_IDS = [
  'aura-aurora', 'aura-ember', 'aura-mint', 'aura-violet', 'aura-coral',
  'aura-prism', 'aura-lagoon', 'aura-sunset', 'aura-lime-pulse',
] as const;

const baseInput = {
  activeAvatar: '1',
  activeAuraId: null,
  level: 1,
  ownedAuras: {},
  isPremium: false,
  isVip: false,
  isPro: false,
};

it.each(ORDINARY_SALE_AURA_IDS)('keeps %s as an ordinary purchasable aura', (id) => {
  expect(getAvatarAuraById(id)).toMatchObject({ id });
  expect(getAvatarAuraById(id)?.rewardOnly).not.toBe(true);
  expect(getAvatarAuraById(id)?.retiredFromShop).not.toBe(true);
  expect(normalizeAvatarAuraId(id)).toBe(id);
  expect(buildAuraCatalog(baseInput).find((item) => item.id === id))
    .toMatchObject({ id, isOwned: false, availability: { kind: 'shards', cost: 120 } });
});
```

Keep the ownership snapshot regression and change its wording from retired ownership to legacy ownership. It must still prove `aura-aurora` survives union/storage restoration under the same ID.

- [ ] **Step 2: Write failing purchase-validation tests**

Replace the old retained/rejected split with:

```ts
it.each([
  'aura-aurora', 'aura-ember', 'aura-mint', 'aura-violet', 'aura-coral',
  'aura-prism', 'aura-lagoon', 'aura-sunset', 'aura-lime-pulse',
])('accepts ordinary aura %s only at the catalog price', (itemId) => {
  expect(validateCustomizationPurchase(intent({ itemId }), noPlus)).toBe(true);
  expect(validateCustomizationPurchase(intent({ itemId, cost: 119 }), noPlus)).toBe(false);
});

it.each(['aura-flame-51', 'aura-season', 'aura-premium'])
  ('rejects removed or non-purchasable aura %s', (itemId) => {
    expect(validateCustomizationPurchase(intent({ itemId }), noPlus)).toBe(false);
  });
```

- [ ] **Step 3: Run the focused tests and confirm failure**

```powershell
npx jest --runTestsByPath tests/avatar_aura_catalog_rework.test.ts tests/customization_purchase_validation.test.ts --no-cache --runInBand
```

Expected: FAIL because five IDs are still retired and Lime Pulse is absent.

- [ ] **Step 4: Make the minimal catalog change**

In `constants/avatar_auras.ts`:

- preserve `AVATAR_AURA_BUY_COST = 120`;
- remove `retiredFromShop: true` only from Aurora, Violet, Coral, Lagoon, and Sunset;
- add Lime Pulse after Sunset with all eight localized labels and the approved palette:

```ts
{
  id: 'aura-lime-pulse',
  nameRu: 'Лайм', nameUk: 'Лайм', nameEs: 'Lima', namePtBr: 'Lima',
  nameVi: 'Chanh xanh', nameId: 'Limau', nameTr: 'Limon', namePl: 'Limonka',
  color: '#D9FF85', color2: '#63E6B5', color3: '#55CBE7',
  softColor: 'rgba(99,230,181,0.22)',
},
```

Do not change Plus/Pro flags, reward-only IDs, aliases, selection normalization, ownership storage, or purchase-journal code.

- [ ] **Step 5: Run focused catalog and economy tests**

```powershell
npx jest --runTestsByPath tests/avatar_auras.test.ts tests/avatar_aura_catalog_rework.test.ts tests/customization_purchase_validation.test.ts tests/customization_purchase_intent.test.ts tests/cloud_sync_owned_aura_merge.test.ts --no-cache --runInBand
```

Expected: all tests PASS; purchase intent still emits one composite `avatar_aura` grant and never a standalone debit.

- [ ] **Step 6: Commit only the catalog unit**

```powershell
git add -- constants/avatar_auras.ts tests/avatar_aura_catalog_rework.test.ts tests/customization_purchase_validation.test.ts
git commit --only -m "feat: return legacy avatar auras to sale" -- constants/avatar_auras.ts tests/avatar_aura_catalog_rework.test.ts tests/customization_purchase_validation.test.ts
```

### Task 4: Create the deterministic production asset finalizer and static resolver

**Files:**
- Create: `scripts/finalize_avatar_aura_assets.mjs`
- Create: `tests/avatar_aura_layered_assets.test.ts`
- Create: `app/avatar_aura_catalog_art.ts`
- Create: `assets/images/avatar_auras/<aura-id>/{base,flow,particles}.webp`

- [ ] **Step 1: Write the failing resolver and asset-hygiene test**

Use this exact production ID list:

```ts
const PRODUCTION_IDS = [
  'aura-plus', 'aura-pro', 'aura-aurora', 'aura-ember', 'aura-mint',
  'aura-violet', 'aura-coral', 'aura-prism', 'aura-lagoon',
  'aura-sunset', 'aura-lime-pulse',
] as const;
```

For every ID, assert `getCatalogAvatarAuraAssetForAvatarId(id)` returns all three sources and positive motion durations. Read the resolver source and assert exactly 33 literal `.webp` `require()` calls. Read each expected asset with Sharp and assert WebP, alpha, 320×320, centre offset ≤1.5 pixels, and rotation radius ≤147 pixels. Assert the resolver source and bundled paths contain no `ice-halo`.

- [ ] **Step 2: Run the new test and confirm failure**

```powershell
npx jest --runTestsByPath tests/avatar_aura_layered_assets.test.ts --no-cache --runInBand
```

Expected: FAIL because the resolver and production assets do not exist.

- [ ] **Step 3: Implement the finalizer mappings and validation**

The finalizer must use this immutable ordinary mapping:

```js
const ORDINARY = {
  'aura-aurora': ['polar-orbit', 'a'],
  'aura-ember': ['rose-plasma', 'a'],
  'aura-mint': ['jade-current', 'a'],
  'aura-violet': ['velvet-eclipse', 'a'],
  'aura-coral': ['solar-ribbon', 'c'],
  'aura-prism': ['prism-fold', 'a'],
  'aura-lagoon': ['lagoon-helix', 'c'],
  'aura-sunset': ['sunset-vector', 'a'],
  'aura-lime-pulse': ['lime-pulse', 'a'],
};
const LAYERS = ['base', 'flow', 'accents'];
```

Read and validate `subscription-selection.json`, merge it with `ORDINARY`, and write each layer to `assets/images/avatar_auras/<id>/<layer-name>.webp`, mapping candidate `accents` to production `particles`. Use Sharp with `webp({ quality: 72, alphaQuality: 90 })`. Before writing, verify the source is 320×320 with alpha, visible centre offset ≤1.5 pixels, and radius ≤147 pixels. Refuse unknown IDs, missing layers, duplicate outputs, or any source slot named `ice-halo`.

- [ ] **Step 4: Add the complete static resolver**

Create `app/avatar_aura_catalog_art.ts` with one literal entry per production ID and exactly three literal `require()` calls per entry. Use `SeasonAuraAsset` as the established layer contract and this complete implementation:

```ts
import type { ImageSourcePropType } from 'react-native';
import type { SeasonAuraAsset } from './season_pass_track_config';

const MOTION = {
  'aura-plus': [7000, 48000, 26000, 17000, true, false],
  'aura-pro': [4600, 30000, 12000, 8000, false, true],
  'aura-aurora': [6400, 38000, 21000, 14000, false, true],
  'aura-ember': [5200, 32000, 17000, 11000, false, true],
  'aura-mint': [6800, 0, 24000, 16000, true, false],
  'aura-violet': [7200, 44000, 26000, 18000, true, false],
  'aura-coral': [5600, 36000, 19000, 12000, false, true],
  'aura-prism': [6000, 42000, 22000, 13000, true, false],
  'aura-lagoon': [7000, 46000, 28000, 19000, false, true],
  'aura-sunset': [5800, 34000, 18000, 11000, true, false],
  'aura-lime-pulse': [4800, 0, 16000, 10000, false, true],
} as const;

type MotionTuple = readonly [number, number, number, number, boolean, boolean];

function art(
  baseSource: ImageSourcePropType,
  flowSource: ImageSourcePropType,
  particlesSource: ImageSourcePropType,
  motion: MotionTuple,
): SeasonAuraAsset {
  const [pulseMs, baseSpinMs, flowSpinMs, particlesSpinMs, flowReverse, particlesReverse] = motion;
  return {
    baseSource, flowSource, particlesSource,
    pulseMs, baseSpinMs, flowSpinMs, particlesSpinMs, flowReverse, particlesReverse,
  };
}

const CATALOG_AVATAR_AURA_ASSETS: Readonly<Record<string, SeasonAuraAsset>> = {
  'aura-plus': art(
    require('../assets/images/avatar_auras/aura-plus/base.webp'),
    require('../assets/images/avatar_auras/aura-plus/flow.webp'),
    require('../assets/images/avatar_auras/aura-plus/particles.webp'),
    MOTION['aura-plus'],
  ),
  'aura-pro': art(
    require('../assets/images/avatar_auras/aura-pro/base.webp'),
    require('../assets/images/avatar_auras/aura-pro/flow.webp'),
    require('../assets/images/avatar_auras/aura-pro/particles.webp'),
    MOTION['aura-pro'],
  ),
  'aura-aurora': art(
    require('../assets/images/avatar_auras/aura-aurora/base.webp'),
    require('../assets/images/avatar_auras/aura-aurora/flow.webp'),
    require('../assets/images/avatar_auras/aura-aurora/particles.webp'),
    MOTION['aura-aurora'],
  ),
  'aura-ember': art(
    require('../assets/images/avatar_auras/aura-ember/base.webp'),
    require('../assets/images/avatar_auras/aura-ember/flow.webp'),
    require('../assets/images/avatar_auras/aura-ember/particles.webp'),
    MOTION['aura-ember'],
  ),
  'aura-mint': art(
    require('../assets/images/avatar_auras/aura-mint/base.webp'),
    require('../assets/images/avatar_auras/aura-mint/flow.webp'),
    require('../assets/images/avatar_auras/aura-mint/particles.webp'),
    MOTION['aura-mint'],
  ),
  'aura-violet': art(
    require('../assets/images/avatar_auras/aura-violet/base.webp'),
    require('../assets/images/avatar_auras/aura-violet/flow.webp'),
    require('../assets/images/avatar_auras/aura-violet/particles.webp'),
    MOTION['aura-violet'],
  ),
  'aura-coral': art(
    require('../assets/images/avatar_auras/aura-coral/base.webp'),
    require('../assets/images/avatar_auras/aura-coral/flow.webp'),
    require('../assets/images/avatar_auras/aura-coral/particles.webp'),
    MOTION['aura-coral'],
  ),
  'aura-prism': art(
    require('../assets/images/avatar_auras/aura-prism/base.webp'),
    require('../assets/images/avatar_auras/aura-prism/flow.webp'),
    require('../assets/images/avatar_auras/aura-prism/particles.webp'),
    MOTION['aura-prism'],
  ),
  'aura-lagoon': art(
    require('../assets/images/avatar_auras/aura-lagoon/base.webp'),
    require('../assets/images/avatar_auras/aura-lagoon/flow.webp'),
    require('../assets/images/avatar_auras/aura-lagoon/particles.webp'),
    MOTION['aura-lagoon'],
  ),
  'aura-sunset': art(
    require('../assets/images/avatar_auras/aura-sunset/base.webp'),
    require('../assets/images/avatar_auras/aura-sunset/flow.webp'),
    require('../assets/images/avatar_auras/aura-sunset/particles.webp'),
    MOTION['aura-sunset'],
  ),
  'aura-lime-pulse': art(
    require('../assets/images/avatar_auras/aura-lime-pulse/base.webp'),
    require('../assets/images/avatar_auras/aura-lime-pulse/flow.webp'),
    require('../assets/images/avatar_auras/aura-lime-pulse/particles.webp'),
    MOTION['aura-lime-pulse'],
  ),
};

export function getCatalogAvatarAuraAssetForAvatarId(
  auraId: string | null | undefined,
): SeasonAuraAsset | undefined {
  return auraId ? CATALOG_AVATAR_AURA_ASSETS[auraId] : undefined;
}
```

Unknown, Nimbus, and Season Pass IDs must return `undefined`.

- [ ] **Step 5: Wire first, then run the finalizer**

After the resolver contains all 33 static `require()` slots, run:

```powershell
node scripts/codex-safe-run.mjs --name finalize-avatar-auras -- node scripts/finalize_avatar_aura_assets.mjs
```

Expected: 33 production WebPs written and a concise success summary. No raw generation source is copied.

- [ ] **Step 6: Run the resolver test**

```powershell
npx jest --runTestsByPath tests/avatar_aura_layered_assets.test.ts --no-cache --runInBand
```

Expected: PASS with eleven complete aura assets and all geometry checks green.

- [ ] **Step 7: Commit the resolver, finalizer, tests, and only final assets**

```powershell
git add -- app/avatar_aura_catalog_art.ts scripts/finalize_avatar_aura_assets.mjs tests/avatar_aura_layered_assets.test.ts assets/images/avatar_auras
git commit --only -m "feat: add layered catalog aura assets" -- app/avatar_aura_catalog_art.ts scripts/finalize_avatar_aura_assets.mjs tests/avatar_aura_layered_assets.test.ts assets/images/avatar_auras
```

### Task 5: Render catalog art through the lifecycle-safe layered ring

**Files:**
- Modify: `components/AvatarAura.tsx`
- Modify: `tests/avatar_aura_catalog_rework.test.ts`
- Modify: `tests/season_aura_account_preview_contract.test.ts`

- [ ] **Step 1: Add failing renderer assertions**

Assert the source imports and calls `getCatalogAvatarAuraAssetForAvatarId`, keeps `getSeasonAuraAssetForAvatarId`, resolves `catalogAsset ?? seasonAsset`, uses `LAYERED_AURA_RING_SCALE = 1.50`, passes the resolved asset to `SeasonAuraRing`, and gates the programmatic fallback loop when layered art exists.

Keep the lifecycle assertions for focus, `AppState`, the `animate` prop, and Reduced Motion. Keep the Season Pass contract proving its resolver still participates.

- [ ] **Step 2: Run renderer contracts and confirm failure**

```powershell
npx jest --runTestsByPath tests/avatar_aura_catalog_rework.test.ts tests/season_aura_account_preview_contract.test.ts tests/season_pass_reward_art.test.ts tests/runtime_lifecycle_ratchet.test.ts --no-cache --runInBand
```

Expected: FAIL only on the new catalog-art and 1.50-scale assertions.

- [ ] **Step 3: Make the minimal renderer change**

Use this resolution flow:

```ts
const catalogAsset = getCatalogAvatarAuraAssetForAvatarId(aura?.id);
const seasonAsset = getSeasonAuraAssetForAvatarId(aura?.id, themeMode);
const layeredAsset = catalogAsset ?? seasonAsset;
```

Rename the local scale constant to `LAYERED_AURA_RING_SCALE`, set it to `1.50`, and leave the 12-pixel layout gutter in place. Replace the branch and animation gate to use `layeredAsset`, then pass `asset={layeredAsset}` to the existing `SeasonAuraRing`. Do not change `SeasonAuraRing` motion implementation or the programmatic fallback for Nimbus/unknown art.

- [ ] **Step 4: Re-run renderer and catalog tests**

```powershell
npx jest --runTestsByPath tests/avatar_auras.test.ts tests/avatar_aura_catalog_rework.test.ts tests/avatar_aura_layered_assets.test.ts tests/season_aura_account_preview_contract.test.ts tests/season_pass_reward_art.test.ts tests/runtime_lifecycle_ratchet.test.ts --no-cache --runInBand
```

Expected: PASS; catalog and Season Pass art both use the same lifecycle-safe layered renderer.

- [ ] **Step 5: Commit the renderer unit**

```powershell
git add -- components/AvatarAura.tsx tests/avatar_aura_catalog_rework.test.ts tests/season_aura_account_preview_contract.test.ts
git commit --only -m "feat: render layered catalog avatar auras" -- components/AvatarAura.tsx tests/avatar_aura_catalog_rework.test.ts tests/season_aura_account_preview_contract.test.ts
```

### Task 6: Verify entitlement continuity, visual geometry, and bundle hygiene

**Files:**
- Verify only; repair in the owning task if a gate fails.

- [ ] **Step 1: Run the complete focused regression set**

```powershell
npx jest --runTestsByPath tests/avatar_auras.test.ts tests/avatar_aura_catalog_rework.test.ts tests/avatar_aura_layered_assets.test.ts tests/customization_purchase_validation.test.ts tests/customization_purchase_intent.test.ts tests/cloud_sync_owned_aura_merge.test.ts tests/avatar_select_vip_aura_contract.test.ts tests/season_aura_account_preview_contract.test.ts tests/season_pass_reward_art.test.ts tests/runtime_lifecycle_ratchet.test.ts --no-cache --runInBand
```

Expected: all suites and tests PASS.

- [ ] **Step 2: Verify static asset hygiene**

Run:

```powershell
rg -n "assets/images/avatar_auras" app components constants hooks contexts lib modules
rg -n "ice-halo" app components constants assets/images/avatar_auras tests/avatar_aura_layered_assets.test.ts
```

Expected: the first command shows one resolver with 33 literal static paths and its consumer; the second command shows only the explicit negative test, with no production source or asset match.

- [ ] **Step 3: Verify no entitlement or economy code changed**

```powershell
git diff --name-only HEAD~3..HEAD
git diff HEAD~3..HEAD -- app/customization_purchase_intent.ts app/cloud_sync.ts constants/customization_storage_keys.ts
```

Expected: no diff in purchase intent, cloud sync, storage keys, Firestore Rules, functions, or Jarvis. The only economy behavior change is catalog availability for the same composite purchase path.

- [ ] **Step 4: Inspect dark/light and size matrix**

Render the eleven production composites at 44, 54, and 82 pixels on dark and light surfaces. Confirm the real hex is centred, the face opening stays clear, no complete rotation clips, and Pro is visibly stronger than Plus. Save QA screenshots under ignored `.codex-tmp/avatar-aura-candidates/qa/`.

- [ ] **Step 5: Run a fresh high-risk review and deterministic verifier**

Because the catalog is tied to paid pearl entitlements, request a read-only `economy-reviewer` review of stable-ID preservation, sale availability, price validation, and composite-grant continuity. Then run an independent `economy-verifier` over the exact commands in Steps 1–3. Any failing deterministic gate blocks completion.

- [ ] **Step 6: Confirm the final diff is scoped**

```powershell
git status --short
git log -4 --oneline
```

Expected: aura commits contain only the named catalog, resolver, renderer, tests, final asset files, and finalizer. Pre-existing unrelated working-tree changes remain untouched.
