# Avatar DNA Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Выпустить за флагом полноценный статичный 2.5D-конструктор персонажа Phraseman с совместимыми слоями, локально-первым сохранением, косметическими наградами без дубликатов и готовыми публичными портретами во всех социальных поверхностях.

**Architecture:** `AvatarDNA` хранит параметры, а не готовую комбинацию; `human_v1` manifest и чистый resolver превращают выбранный DNA в детерминированный visibility/layer plan. Студия рендерит approved WebP-слои локально, публичные списки получают один готовый WebP от доверенного Cloud Function compositor, а legacy `user_avatar` остаётся неизменяемым fallback на всех этапах.

**Tech Stack:** Expo Router, React Native, TypeScript, `expo-image`, React Native Reanimated, AsyncStorage/account-generation guards, Jest, Firebase Auth/Firestore/Storage/Cloud Functions, Node.js + `sharp` для asset QA и серверной композиции.

---

## Перед началом

- Выполнять задачи в текущем checkout: проект запрещает новый branch/worktree без отдельной команды владельца.
- Не использовать проектный `OPENAI_API_KEY`. Для художественных исходников разрешён только встроенный Codex `image_gen`; промежуточные изображения хранятся в `.codex-tmp/avatar-dna/`.
- Не менять `admin/legacy.html`, `admin/index.html` и другие замороженные admin-файлы. Hosted assets размещать только в `admin/v2/avatars/avatar-dna/`; `admin/v2/legacy.html` этой функции не требуется.
- Не включать App Check для админских функций. Пользовательская функция публикации получает обычные auth/identity/deletion guards.
- Не удалять и не переопределять `user_avatar`, custom-avatar, level avatar, aura, frame и существующие gift paths.
- Изменения экономики выполняет единственный critical writer. Обязательны `docs/economy/ECONOMY_CONSTITUTION.md` и существующие economy guards.
- После каждого RED/GREEN цикла коммитить только перечисленные файлы. Если в индексе есть чужие файлы, использовать `git commit --only -- <paths>`.

## Вертикальные ворота

| Gate | Рабочий результат | Разрешение rollout |
|---|---|---|
| A | Бесплатный локальный редактор, статичный preview, save/undo/legacy fallback | Только internal flag |
| B | Проверенный production starter pack в утверждённом тёплом 3D-стиле | Internal QA |
| C | Exact cosmetic grants, покупка и спины без дубликатов/сиротских списаний | До 5% пользователей |
| D | Trusted compositor и ready public portrait/studio projection | До 25% пользователей |
| E | Все consumers, accessibility/performance/telemetry gates | Процентный rollout |

## Карта файлов

### Новые runtime-модули

- `modules/avatar-dna/contracts.ts` — versioned DNA, manifest, item, layer и public-render типы.
- `modules/avatar-dna/canonicalize.ts` — строгий parse/normalize и каноническая сериализация DNA.
- `modules/avatar-dna/catalog.ts` — загрузка immutable catalog и ownership/availability helpers.
- `modules/avatar-dna/resolver.ts` — `chosenDNA -> effectiveDNA + visibilityPlan` без I/O.
- `modules/avatar-dna/storage.ts` — account-scoped current/confirmed/draft/last-good state.
- `modules/avatar-dna/editor_reducer.ts` — guided/free draft, undo/redo и dirty-state.
- `modules/avatar-dna/render_key.ts` — content-addressed render id.
- `modules/avatar-dna/reward_pool.ts` — owned-safe deterministic cosmetic selection.
- `modules/avatar-dna/public_projection.ts` — клиентский parser ready public projection.
- `modules/avatar-dna/telemetry.ts` — privacy-safe operational events.
- `modules/avatar-dna/bundled_assets.generated.ts` — статические `require()` для бесплатного offline core.

### Новые UI-файлы

- `components/avatar-dna/AvatarDNAStage.tsx` — статичный ordered layer renderer.
- `components/avatar-dna/AvatarDNAHero.tsx` — scene/camera switch без движения персонажа.
- `components/avatar-dna/AvatarDNATabs.tsx` — пять основных категорий.
- `components/avatar-dna/AvatarDNACatalog.tsx` — одна виртуализированная сетка.
- `components/avatar-dna/AvatarDNAItemCard.tsx` — owned/selected/locked/new/retry states.
- `components/avatar-dna/AvatarDNAConflictNotice.tsx` — объяснение occlusion + undo.
- `components/avatar-dna/AvatarDNAEditor.tsx` — общая композиция guided/free режима.
- `app/avatar_dna_studio.tsx` — Expo Router screen.
- `app/avatar_dna_invitation.ts` — мягкое приглашение после первого достижения.
- `app/avatar_dna_copy.ts` — полный RU/UK/ES/PT-BR/VI/ID/TR/PL copy contract.

### Новые asset/cloud-файлы

- `config/avatar-dna/human_v1.rig.json` — anchors, safe polygons и crop contracts.
- `config/avatar-dna/catalog.v1.json` — immutable item/layer manifest.
- `config/avatar-dna/style-lock.md` — утверждённый художественный контракт.
- `scripts/avatar-dna/validate_catalog.mjs` — schema/hash/z-order/cycle/file checks.
- `scripts/avatar-dna/build_bundle.mjs` — WebP normalization/compression/thumbnails.
- `scripts/avatar-dna/build_contact_sheet.mjs` — sentinel/pairwise visual matrix.
- `scripts/avatar-dna/publish_assets.mjs` — immutable copy с hash receipt; без deploy.
- `functions/src/avatar_dna_contract.ts` — server-side strict validator.
- `functions/src/avatar_dna_compositor.ts` — trusted portrait/studio compositor.
- `functions/src/avatar_dna_projection.ts` — authenticated idempotent publish callable.
- `app/avatar_dna_public_sync.ts` — best-effort operation upload/retry.

### Существующие файлы, которые изменяются

- `components/AvatarView.tsx` — v2 ready/local renderer before legacy fallback.
- `app/avatar_select.tsx` — entry card в новую Студию без удаления старого каталога.
- `app/_layout.tsx` — route registration.
- `app/app_snapshot_store.ts`, `app/app_snapshot_bootstrap.ts`, `app/customization_snapshot.ts` — first-frame DNA state.
- `constants/customization_storage_keys.ts`, `app/cloud_sync.ts` — account isolation/wipe keys.
- `app/remote_flags.ts` — `avatar_dna_enabled` и rollout percentage.
- `app/economy/client_shard_semantic_reducer.ts` — portable `avatar_dna_item` grant.
- `app/local_level_spins.ts`, `app/level_spin_local_contract.ts`, `app/level_gift_system.ts` — exact item in durable spin receipt.
- `app/public_profile_snapshot.ts`, `functions/src/public_profile_projection.ts`, `functions/src/index.ts` — ready v2 projection.
- `functions/package.json` — pinned `sharp` runtime dependency.
- `firestore.rules`, `storage.rules`, `functions/src/account_delete.ts` — schema/security/deletion.
- `functions/src/jarvis/jarvis_data_contract_guard.test.ts` — explicit schema audit.
- Friend/league/Arena/tournament/profile DTOs listed in Task 12 — propagation of `avatarV2`.

---

### Task 1: Versioned Avatar DNA contracts and canonical parser

**Files:**
- Create: `modules/avatar-dna/contracts.ts`
- Create: `modules/avatar-dna/canonicalize.ts`
- Create: `tests/avatar_dna_contract.test.ts`

- [ ] **Step 1: Write the failing contract tests**

```ts
import { canonicalizeAvatarDNA, parseAvatarDNA } from '../modules/avatar-dna/canonicalize';

const dna = {
  schemaVersion: 1,
  rigId: 'human_v1',
  base: { starterPresetId: 'starter_warm_01', skinToneId: 'skin_03', faceBaseId: 'face_01', bodyBaseId: 'body_01' },
  face: { eyesId: 'eyes_01', irisColorId: 'iris_brown', browsId: 'brows_01', noseId: 'nose_01', mouthId: 'mouth_01', skinDetailIds: [], makeupIds: [], facialHairId: null },
  hair: { styleId: 'hair_01', colorId: 'hair_brown' },
  wearables: { outfitId: 'outfit_01', headwearId: null, maskId: null, eyewearId: null, earAccessoryId: null, neckAccessoryId: null },
  scene: { backgroundId: 'background_cream', auraId: null, frameId: null, foregroundFxId: null },
} as const;

test('accepts human_v1 and produces stable canonical JSON', () => {
  expect(parseAvatarDNA(dna)).toEqual(dna);
  expect(canonicalizeAvatarDNA({ ...dna, face: { ...dna.face, makeupIds: [] } }))
    .toBe(canonicalizeAvatarDNA(dna));
});

test.each([
  { ...dna, schemaVersion: 2 },
  { ...dna, rigId: 'human_v2' },
  { ...dna, face: { ...dna.face, eyesId: '../escape' } },
  { ...dna, face: { ...dna.face, makeupIds: ['m1', 'm1'] } },
])('rejects malformed or non-canonical DNA %#', (value) => {
  expect(() => parseAvatarDNA(value)).toThrow('avatar_dna_invalid');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
npx jest --runTestsByPath tests/avatar_dna_contract.test.ts --no-cache --runInBand
```

Expected: FAIL because `modules/avatar-dna/canonicalize` does not exist.

- [ ] **Step 3: Implement strict immutable contracts**

Define `AvatarDNA`, `AvatarSlot`, `AvatarLayerRecord`, `AvatarItemManifest`, `AvatarCatalogManifest`, `ResolvedAvatarDNA`, `AvatarV2Projection`, `AvatarDNAConflictNotice` and `AvatarDNAPurchaseIntent` in `contracts.ts`. Use `Readonly`, readonly arrays and these exact roots:

```ts
export const AVATAR_DNA_SCHEMA_VERSION = 1 as const;
export const AVATAR_DNA_RIG_ID = 'human_v1' as const;
export const AVATAR_ID = /^[a-z][a-z0-9_.-]{1,79}$/;

export type AvatarCamera = 'portrait' | 'studio';
export type AvatarCategory = 'base' | 'face' | 'hair' | 'look' | 'scene';
export type AvatarDNAConflictNotice = Readonly<{
  kind: 'occlusion' | 'conflict';
  hiddenSlots: readonly AvatarSlot[];
  itemId: string;
}>;
export type AvatarDNAPurchaseIntent = Readonly<{
  operationId: string;
  itemId: string;
  catalogVersion: 1;
  cost: number;
}>;
export type AvatarSlot =
  | 'background' | 'outfit.back' | 'hood.back' | 'hair.back' | 'body'
  | 'outfit' | 'ears' | 'face' | 'skin.detail' | 'makeup' | 'eyes' | 'iris'
  | 'brows' | 'nose' | 'mouth' | 'facial.hair' | 'hair.side' | 'hair.front'
  | 'eyewear' | 'ear.accessory' | 'mask' | 'headwear.front'
  | 'neck.accessory' | 'outfit.front' | 'aura' | 'frame' | 'foreground.fx';
```

`parseAvatarDNA` must reject unknown root/nested keys, invalid IDs, duplicate arrays, non-v1 schema/rig and more than 8 skin/makeup detail IDs. `canonicalizeAvatarDNA` must call the parser and stringify objects in declared field order with sorted multi-select arrays.

- [ ] **Step 4: Run GREEN and typecheck the two files**

Run:

```bash
npx jest --runTestsByPath tests/avatar_dna_contract.test.ts --no-cache --runInBand
npx tsc --noEmit --pretty false --incremental false
```

Expected: contract test PASS; TypeScript exits 0. If the repository has unrelated existing type errors, capture them and run `npx eslint modules/avatar-dna/contracts.ts modules/avatar-dna/canonicalize.ts tests/avatar_dna_contract.test.ts` as the scoped gate instead of claiming a global pass.

- [ ] **Step 5: Commit**

```bash
git add modules/avatar-dna/contracts.ts modules/avatar-dna/canonicalize.ts tests/avatar_dna_contract.test.ts
git commit --only -m "feat: define Avatar DNA v1 contract" -- modules/avatar-dna/contracts.ts modules/avatar-dna/canonicalize.ts tests/avatar_dna_contract.test.ts
```

---

### Task 2: Rig manifest, catalog validator and deterministic resolver

**Files:**
- Create: `config/avatar-dna/human_v1.rig.json`
- Create: `config/avatar-dna/catalog.v1.json`
- Create: `modules/avatar-dna/catalog.ts`
- Create: `modules/avatar-dna/resolver.ts`
- Create: `scripts/avatar-dna/validate_catalog.mjs`
- Create: `tests/avatar_dna_resolver.test.ts`
- Create: `tests/avatar_dna_catalog_contract.test.ts`

- [ ] **Step 1: Write failing resolver cases**

```ts
import catalog from '../config/avatar-dna/catalog.v1.json';
import { resolveAvatarDNA } from '../modules/avatar-dna/resolver';
import { starterAvatarDNA } from '../modules/avatar-dna/catalog';

test('compound hood hides top hair and ears without changing chosen DNA', () => {
  const chosen = {
    ...starterAvatarDNA('starter_warm_01'),
    hair: { styleId: 'hair_wavy_01', colorId: 'hair_brown' },
    wearables: {
      ...starterAvatarDNA('starter_warm_01').wearables,
      headwearId: 'headwear.assassin_hood.01',
    },
  };
  const resolved = resolveAvatarDNA(chosen, catalog);
  expect(resolved.chosenDNA.hair.styleId).toBe('hair_wavy_01');
  expect(resolved.visibilityPlan.hiddenSlots).toEqual(expect.arrayContaining(['hair.front', 'ears']));
  expect(resolved.layers.map((layer) => layer.id)).toEqual([
    'background.cream', 'hood.assassin.back', 'hair.wavy.back', 'body.base.01',
    'outfit.starter.01', 'face.base.01', 'eyes.01', 'iris.brown', 'brows.01',
    'nose.01', 'mouth.01', 'hood.assassin.shadow', 'hood.assassin.front',
  ]);
});

test('removing the hood restores the stored hair choice', () => {
  const hooded = { ...starterAvatarDNA('starter_warm_01'), wearables: { ...starterAvatarDNA('starter_warm_01').wearables, headwearId: 'headwear.assassin_hood.01' } };
  const unhooded = { ...hooded, wearables: { ...hooded.wearables, headwearId: null } };
  expect(resolveAvatarDNA(unhooded, catalog).visibilityPlan.hiddenSlots).not.toContain('hair.front');
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npx jest --runTestsByPath tests/avatar_dna_resolver.test.ts tests/avatar_dna_catalog_contract.test.ts --no-cache --runInBand
```

Expected: FAIL because catalog/resolver modules are absent.

- [ ] **Step 3: Implement one canonical rig and a closed starter catalog**

`human_v1.rig.json` must declare the 13 approved anchors, `face.safe`, `head.safe`, `portraitCrop`, `studioCrop`, canvas `2048`, runtime `512`, portrait `256` and thumbnail `192`. `catalog.v1.json` must include the exact starter IDs used by Task 1 plus `headwear.assassin_hood.01` with three records:

```json
{
  "id": "headwear.assassin_hood.01",
  "assetVersion": 1,
  "rigIds": ["human_v1"],
  "category": "look",
  "entitlement": { "kind": "reward", "rarity": "rare" },
  "layers": [
    { "id": "hood.assassin.back", "slot": "hood.back", "z": 20, "file": "hood-back.webp" },
    { "id": "hood.assassin.shadow", "slot": "makeup", "z": 95, "file": "face-shadow.webp", "clip": "face.safe" },
    { "id": "hood.assassin.front", "slot": "headwear.front", "z": 150, "file": "hood-front.webp" }
  ],
  "occludes": ["hair.front", "ears"],
  "conflicts": [],
  "restoresOnRemove": true
}
```

`resolveAvatarDNA` must validate every selected item, collect item layers, apply explicit occlusion/conflicts, sort by `z` then layer id, and reject cycles with `avatar_manifest_cycle`.

- [ ] **Step 4: Add the static asset contract gate and verify GREEN**

`validate_catalog.mjs` must exit non-zero for unknown rig/slot, duplicate ID, unsafe path, missing file, z outside 0–179, cycle, wrong dimensions, non-WebP runtime files, file/hash mismatch or missing entitlement metadata. In fixture mode it validates JSON without requiring production images:

```bash
node scripts/avatar-dna/validate_catalog.mjs --catalog config/avatar-dna/catalog.v1.json --rig config/avatar-dna/human_v1.rig.json --fixture-mode
npx jest --runTestsByPath tests/avatar_dna_resolver.test.ts tests/avatar_dna_catalog_contract.test.ts --no-cache --runInBand
```

Expected: validator prints `avatar-dna catalog: PASS`; both suites PASS.

- [ ] **Step 5: Commit**

```bash
git add config/avatar-dna modules/avatar-dna/catalog.ts modules/avatar-dna/resolver.ts scripts/avatar-dna/validate_catalog.mjs tests/avatar_dna_resolver.test.ts tests/avatar_dna_catalog_contract.test.ts
git commit --only -m "feat: resolve compatible Avatar DNA layers" -- config/avatar-dna modules/avatar-dna/catalog.ts modules/avatar-dna/resolver.ts scripts/avatar-dna/validate_catalog.mjs tests/avatar_dna_resolver.test.ts tests/avatar_dna_catalog_contract.test.ts
```

---

### Task 3: Account-scoped local state and first-frame snapshot

**Files:**
- Create: `modules/avatar-dna/storage.ts`
- Modify: `constants/customization_storage_keys.ts:1-23`
- Modify: `app/customization_snapshot.ts:13-156`
- Modify: `app/app_snapshot_store.ts:23-107, 221-242, 317-320`
- Modify: `app/app_snapshot_bootstrap.ts`
- Modify: `app/cloud_sync.ts:562-693`
- Create: `tests/avatar_dna_storage.test.ts`
- Modify: `tests/customization_snapshot.test.ts`
- Modify: `tests/app_snapshot_store_contract.test.ts`
- Modify: `tests/account_generation.test.ts`

- [ ] **Step 1: Write RED tests for local commit and account switching**

```ts
test('writes confirmed DNA and both last-good render ids in one account-scoped commit', async () => {
  const result = await commitAvatarDNA({ ownerStableId: 'u1', accountGeneration: 4, dna, renderIds: { portrait: 'p1', studio: 's1' }, manifestVersion: 1 });
  expect(result.status).toBe('committed');
  await expect(readAvatarDNAState('u1', 4)).resolves.toMatchObject({ confirmedDNA: dna, lastGood: { portrait: 'p1', studio: 's1' } });
});

test('rejects a stale account-generation commit', async () => {
  mockGeneration({ stableId: 'u2', generation: 5 });
  await expect(commitAvatarDNA({ ownerStableId: 'u1', accountGeneration: 4, dna, renderIds: { portrait: 'p1', studio: 's1' }, manifestVersion: 1 }))
    .resolves.toEqual({ status: 'stale-account' });
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npx jest --runTestsByPath tests/avatar_dna_storage.test.ts tests/customization_snapshot.test.ts tests/app_snapshot_store_contract.test.ts tests/account_generation.test.ts --no-cache --runInBand
```

Expected: FAIL on missing DNA storage/snapshot fields.

- [ ] **Step 3: Implement account-scoped state**

Add fixed keys only for migration markers and use owner+generation suffixes for state:

```ts
export const AVATAR_DNA_STATE_PREFIX = 'avatar_dna_state_v1:';
export const AVATAR_DNA_DRAFT_PREFIX = 'avatar_dna_draft_v1:';
export const AVATAR_DNA_INVITATION_PREFIX = 'avatar_dna_invitation_v1:';
export const AVATAR_DNA_STYLE_OPERATION_PREFIX = 'avatar_dna_style_operation_v1:';
```

Persist this exact state root-last under `withAccountTransitionLock` + `withStorageLock`:

```ts
export type AvatarDNAStoredState = Readonly<{
  schemaVersion: 1;
  ownerStableId: string;
  accountGeneration: number;
  confirmedDNA: AvatarDNA;
  lastConfirmedDNA: AvatarDNA;
  manifestVersion: number;
  lastGood: Readonly<{ portrait: string; studio: string }>;
  updatedAtMs: number;
}>;
```

Add `avatarDNA?: AvatarDNAStoredState` to `CustomizationSnapshot` and `AppSnapshotProfile`. Bootstrap must parse it before first screen render. `resetAppSnapshotForAccountSwitch` remains the in-memory fence; `cloud_sync.ts` account-local prefix cleanup must include all four prefixes.

- [ ] **Step 4: Run GREEN**

Run the four suites from Step 2. Expected: all PASS, including stale-generation and corrupt-state fallback cases.

- [ ] **Step 5: Commit**

```bash
git add modules/avatar-dna/storage.ts constants/customization_storage_keys.ts app/customization_snapshot.ts app/app_snapshot_store.ts app/app_snapshot_bootstrap.ts app/cloud_sync.ts tests/avatar_dna_storage.test.ts tests/customization_snapshot.test.ts tests/app_snapshot_store_contract.test.ts tests/account_generation.test.ts
git commit --only -m "feat: persist account-scoped Avatar DNA" -- modules/avatar-dna/storage.ts constants/customization_storage_keys.ts app/customization_snapshot.ts app/app_snapshot_store.ts app/app_snapshot_bootstrap.ts app/cloud_sync.ts tests/avatar_dna_storage.test.ts tests/customization_snapshot.test.ts tests/app_snapshot_store_contract.test.ts tests/account_generation.test.ts
```

---

### Task 4: Static layered renderer and `AvatarView` fallback chain

**Files:**
- Create: `components/avatar-dna/AvatarDNAStage.tsx`
- Create: `modules/avatar-dna/render_key.ts`
- Modify: `components/AvatarView.tsx:14-96`
- Create: `tests/avatar_dna_stage_contract.test.tsx`
- Create: `tests/avatar_view_v2_fallback.test.tsx`

- [ ] **Step 1: Write RED rendering tests**

```tsx
test('renders effective layers in resolver order without animated avatar styles', () => {
  const view = render(<AvatarDNAStage dna={dna} camera="portrait" size={128} />);
  expect(view.getAllByTestId(/^avatar-layer-/).map((node) => node.props.accessibilityLabel)).toEqual(expectedLayerIds);
  expect(view.UNSAFE_queryAllByType(Animated.View)).toHaveLength(0);
});

test('prefers a ready v2 portrait and falls back to legacy when it errors', () => {
  const view = render(<AvatarView avatar="custom:custom-gen-01:ember:black" avatarV2={{ schemaVersion: 1, state: 'ready', renderId: 'r1', portraitUrl: 'https://cdn/p.webp', studioUrl: 'https://cdn/s.webp', manifestVersion: 1 }} />);
  fireEvent(view.getByTestId('avatar-v2-image'), 'error');
  expect(view.UNSAFE_getByType(CustomAvatarBadge)).toBeTruthy();
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/avatar_dna_stage_contract.test.tsx tests/avatar_view_v2_fallback.test.tsx --no-cache --runInBand
```

Expected: FAIL on missing components/props.

- [ ] **Step 3: Implement the static renderer**

`AvatarDNAStage` calls the pure resolver, renders absolute `expo-image` layers on one square canvas, sets `pointerEvents="none"`, and changes only crop geometry between `portrait` and `studio`. It must not import Reanimated or `AvatarAura`.

Extend `AvatarView` props with:

```ts
avatarV2?: AvatarV2Projection | null;
localDNA?: AvatarDNA | null;
```

Use the exact order: ready `avatarV2.portraitUrl` → own `localDNA` stage → current custom/level avatar → level badge. Keep `AvatarAura` outside this selection so legacy aura/frame behavior is preserved; callers continue to control `animateAura`.

- [ ] **Step 4: Run GREEN and regression contracts**

Run:

```bash
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/avatar_dna_stage_contract.test.tsx tests/avatar_view_v2_fallback.test.tsx --no-cache --runInBand
npx jest --runTestsByPath tests/avatar_select_studio_contract.test.ts tests/avatar_aura_soft_edge_contract.test.ts tests/custom_avatar_asset_alignment.test.ts --no-cache --runInBand
```

Expected: all listed suites PASS.

- [ ] **Step 5: Commit**

```bash
git add components/avatar-dna/AvatarDNAStage.tsx modules/avatar-dna/render_key.ts components/AvatarView.tsx tests/avatar_dna_stage_contract.test.tsx tests/avatar_view_v2_fallback.test.tsx
git commit --only -m "feat: render static Avatar DNA portraits" -- components/avatar-dna/AvatarDNAStage.tsx modules/avatar-dna/render_key.ts components/AvatarView.tsx tests/avatar_dna_stage_contract.test.tsx tests/avatar_view_v2_fallback.test.tsx
```

---

### Task 5: Draft reducer, conflicts, undo and redo

**Files:**
- Create: `modules/avatar-dna/editor_reducer.ts`
- Create: `tests/avatar_dna_editor_reducer.test.ts`

- [ ] **Step 1: Write RED reducer tests**

```ts
test('selecting a hood keeps hair in chosen DNA and exposes one undoable notice', () => {
  const next = avatarDNAEditorReducer(initialState, { type: 'select-item', category: 'look', itemId: 'headwear.assassin_hood.01' });
  expect(next.present.chosenDNA.hair.styleId).toBe('hair_wavy_01');
  expect(next.present.notice).toEqual({ kind: 'occlusion', hiddenSlots: ['ears', 'hair.front'], itemId: 'headwear.assassin_hood.01' });
  expect(avatarDNAEditorReducer(next, { type: 'undo' }).present.chosenDNA.wearables.headwearId).toBeNull();
});

test('undo and redo never create spend intents', () => {
  const changed = avatarDNAEditorReducer(initialState, { type: 'select-item', category: 'scene', itemId: 'background.sunset.01' });
  expect(avatarDNAEditorReducer(changed, { type: 'undo' }).present.pendingPurchase).toBeNull();
  expect(avatarDNAEditorReducer(changed, { type: 'redo' }).present.pendingPurchase).toBeNull();
});
```

- [ ] **Step 2: Verify RED**

Run: `npx jest --runTestsByPath tests/avatar_dna_editor_reducer.test.ts --no-cache --runInBand`

Expected: FAIL because reducer is absent.

- [ ] **Step 3: Implement the pure editor state machine**

Use these explicit states/actions:

```ts
export type AvatarDNAEditorMode = 'guided' | 'free';
export type AvatarDNAEditorState = Readonly<{
  mode: AvatarDNAEditorMode;
  guidedStep: 0 | 1 | 2 | 3;
  confirmedDNA: AvatarDNA;
  past: readonly AvatarDNA[];
  present: Readonly<{ chosenDNA: AvatarDNA; resolved: ResolvedAvatarDNA; notice: AvatarDNAConflictNotice | null; pendingPurchase: AvatarDNAPurchaseIntent | null }>;
  future: readonly AvatarDNA[];
  dirty: boolean;
}>;
export type AvatarDNAEditorAction =
  | Readonly<{ type: 'select-item'; category: AvatarCategory; itemId: string }>
  | Readonly<{ type: 'set-camera'; camera: AvatarCamera }>
  | Readonly<{ type: 'next-step' | 'previous-step' | 'undo' | 'redo' | 'dismiss-notice' | 'reset-to-confirmed' }>;
```

Cap `past`/`future` at 40 DNA snapshots and never store camera/category navigation as economic or DNA mutations.

- [ ] **Step 4: Run GREEN**

Run the reducer suite. Expected: PASS with hood restore, dirty reset, history cap and purchase isolation.

- [ ] **Step 5: Commit**

```bash
git add modules/avatar-dna/editor_reducer.ts tests/avatar_dna_editor_reducer.test.ts
git commit --only -m "feat: add Avatar DNA editor history" -- modules/avatar-dna/editor_reducer.ts tests/avatar_dna_editor_reducer.test.ts
```

---

### Task 6: Full Studio UI, five categories and motion-only controls

**Files:**
- Create: `components/avatar-dna/AvatarDNAHero.tsx`
- Create: `components/avatar-dna/AvatarDNATabs.tsx`
- Create: `components/avatar-dna/AvatarDNACatalog.tsx`
- Create: `components/avatar-dna/AvatarDNAItemCard.tsx`
- Create: `components/avatar-dna/AvatarDNAConflictNotice.tsx`
- Create: `components/avatar-dna/AvatarDNAEditor.tsx`
- Create: `app/avatar_dna_studio.tsx`
- Create: `app/avatar_dna_copy.ts`
- Modify: `app/_layout.tsx:3087-3091`
- Modify: `app/avatar_select.tsx:785-909`
- Create: `tests/avatar_dna_studio_contract.test.ts`
- Create: `tests/avatar_dna_studio_accessibility.test.tsx`

- [ ] **Step 1: Write RED structure/accessibility tests**

The structural test must assert one `FlashList`/`FlatList`, `numColumns`, five category IDs, `PRESS`/`LUM`/`CHK` imports, no local `withSpring({`/magic durations, no animation import in `AvatarDNAStage`, and complete RU/UK/ES/PT-BR/VI/ID/TR/PL keys in `avatar_dna_copy.ts`. The RNTL test must assert 44×44 controls, selected `accessibilityState`, labels for icon-only buttons, dark text on bright green CTA and reduced-motion behavior.

```tsx
expect(screen.getByRole('tab', { name: 'Основа' })).toHaveAccessibilityState({ selected: true });
expect(screen.getByRole('button', { name: 'Сохранить персонажа' })).toBeEnabled();
expect(screen.getByLabelText('Капюшон ассасина, награда, не получен')).toBeTruthy();
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npx jest --runTestsByPath tests/avatar_dna_studio_contract.test.ts --no-cache --runInBand
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/avatar_dna_studio_accessibility.test.tsx --no-cache --runInBand
```

Expected: both fail because the new route/components do not exist.

- [ ] **Step 3: Build the editor composition**

Implement top bar (close/title/undo/redo), persistent static hero, `По пояс / Портрет`, tabs `base/face/hair/look/scene`, horizontal subcategories, one virtualized grid and one bottom CTA. All visible copy comes from `avatar_dna_copy.ts`. Use only `PRESS`, `LUM`, `CHK` from `constants/motionHybrid.ts`; reduced motion changes item selection immediately. No character/scene layer may translate, scale, rotate, bob, blink or loop.

`avatar_select.tsx` receives one owned/free entry card labeled `Создать персонажа` and keeps every existing custom/avatar/aura tile and action. `app/_layout.tsx` registers `<Stack.Screen name="avatar_dna_studio" options={{ headerShown: false }} />`.

- [ ] **Step 4: Run GREEN and legacy Studio contracts**

Run the two new suites plus:

```bash
npx jest --runTestsByPath tests/avatar_select_studio_contract.test.ts tests/avatar_select_first_frame_contract.test.ts tests/avatar_select_vip_aura_contract.test.ts tests/motion_hybrid_contract.test.ts --no-cache --runInBand
```

Expected: all PASS; existing Studio still exposes avatars and auras.

- [ ] **Step 5: Commit**

```bash
git add components/avatar-dna app/avatar_dna_studio.tsx app/avatar_dna_copy.ts app/_layout.tsx app/avatar_select.tsx tests/avatar_dna_studio_contract.test.ts tests/avatar_dna_studio_accessibility.test.tsx
git commit --only -m "feat: add Avatar DNA Studio editor" -- components/avatar-dna app/avatar_dna_studio.tsx app/avatar_dna_copy.ts app/_layout.tsx app/avatar_select.tsx tests/avatar_dna_studio_contract.test.ts tests/avatar_dna_studio_accessibility.test.tsx
```

---

### Task 7: Save, dirty exit, guided first creation and safe feature flag

**Files:**
- Create: `app/avatar_dna_invitation.ts`
- Modify: `app/avatar_dna_studio.tsx`
- Modify: `app/remote_flags.ts:41-136, 232-326`
- Modify: `app/events.ts`
- Modify: `components/AchievementContext.tsx:105-138`
- Create: `tests/avatar_dna_save_flow.test.ts`
- Create: `tests/avatar_dna_invitation.test.ts`
- Modify: `tests/remote_flags.test.ts`

- [ ] **Step 1: Write RED flow tests**

```ts
test('first achievement offers a dismissible invitation and never blocks a lesson', async () => {
  await onFirstAchievement({ stableId: 'u1', generation: 2 });
  expect(emittedEvents).toContainEqual(['avatar_dna_invitation_requested', { source: 'first_achievement' }]);
  expect(await readInvitationState('u1', 2)).toMatchObject({ offered: true, completed: false });
});

test('save commits local DNA before starting best-effort public sync', async () => {
  await saveAvatarDNADraft(dna, deps);
  expect(deps.calls).toEqual(['validate', 'render-local', 'commit-local', 'patch-snapshot', 'enqueue-sync']);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx jest --runTestsByPath tests/avatar_dna_save_flow.test.ts tests/avatar_dna_invitation.test.ts tests/remote_flags.test.ts --no-cache --runInBand`

Expected: FAIL on missing flag/invitation/save functions.

- [ ] **Step 3: Implement flag and local-first save**

Add `avatar_dna_enabled` to `RemoteBoolKey` with default `false` and `avatar_dna_rollout_pct` to `RemoteNumberKey` with default `0`. Enable only when bool is true and `isInRolloutBucket(stableId, 'avatar-dna-v1', pct)` succeeds. Save order is fixed: validate catalog/entitlements → build portrait/studio local render IDs → account-scoped commit → `patchAppSnapshot` → enqueue sync. Dirty close uses the shared hybrid alert/sheet shell and offers save/continue/discard.

Invitation state is `{ offered, dismissed, completed, offeredAtMs }`; it fires once after the first achievement only, never from onboarding and never as a blocking modal.

- [ ] **Step 4: Run GREEN**

Run the suites from Step 2 and `tests/account_generation.test.ts`. Expected: PASS, including flag-off no-entry, dismissal persistence and stale-account no-commit.

- [ ] **Step 5: Commit**

```bash
git add app/avatar_dna_invitation.ts app/avatar_dna_studio.tsx app/remote_flags.ts app/events.ts components/AchievementContext.tsx tests/avatar_dna_save_flow.test.ts tests/avatar_dna_invitation.test.ts tests/remote_flags.test.ts
git commit --only -m "feat: gate and save Avatar DNA locally" -- app/avatar_dna_invitation.ts app/avatar_dna_studio.tsx app/remote_flags.ts app/events.ts components/AchievementContext.tsx tests/avatar_dna_save_flow.test.ts tests/avatar_dna_invitation.test.ts tests/remote_flags.test.ts
```

**Gate A acceptance:** free items can create/save/restore a static character locally; flag-off users see no new entry; legacy Studio is unchanged.

---

### Task 8: Production asset factory and starter art pack

**Files:**
- Create: `config/avatar-dna/style-lock.md`
- Create: `scripts/avatar-dna/build_bundle.mjs`
- Create: `scripts/avatar-dna/build_contact_sheet.mjs`
- Create: `scripts/avatar-dna/publish_assets.mjs`
- Create: `modules/avatar-dna/bundled_assets.generated.ts`
- Create: `tests/avatar_dna_asset_pipeline.test.ts`
- Generate ignored sources under: `.codex-tmp/avatar-dna/sources/`
- Create: `assets/images/avatar_dna/human_v1/**/*.webp` for the catalog items whose entitlement kind is `free`
- Publish final files under: `admin/v2/avatars/avatar-dna/v1/`
- Modify: `config/avatar-dna/catalog.v1.json`

- [ ] **Step 1: Write RED pipeline tests**

Test fixture bundles must fail for alpha outside safe polygon, missing front/back layer, edge halo, wrong dimension, duplicate ID, altered hash and 64px unreadable portrait. A valid fixture must output a receipt with SHA-256 for each file.

- [ ] **Step 2: Verify RED**

Run: `npx jest --runTestsByPath tests/avatar_dna_asset_pipeline.test.ts --no-cache --runInBand`

Expected: FAIL because builder/contact-sheet/publisher do not exist.

- [ ] **Step 3: Implement deterministic file pipeline**

`build_bundle.mjs` uses root `sharp`, trims/places every source on a 512×512 shared canvas, preserves alpha, emits WebP quality 72, creates 192×192 thumbnail and records pixel bounds/hash/bytes. `publish_assets.mjs` rejects overwrite of an existing `<itemId>/<assetVersion>` when bytes differ. It copies only final WebP + manifest receipt; source PNGs never enter `admin/v2`. Free base/face/hair/outfit/background layers are also copied 1:1 into `assets/images/avatar_dna/human_v1/` and wired by literal static `require()` calls in `bundled_assets.generated.ts`; reward/shop cosmetics remain remote. The asset test fails on any bundled file without a matching require or any required free-core slot without a bundled file.

- [ ] **Step 4: Create the exact starter art inventory with built-in `image_gen`**

Use `config/avatar-dna/style-lock.md` and `human_v1.rig.json` as references. Generate category atlases and split them into these closed v1 families. Every visual family has ten independent shape/style variants; color swatches remain tint parameters and do not multiply source anatomy:

- 2 starter presets;
- 10 skin tones, 10 face bases and 10 body bases;
- 10 eyes, 10 iris colors, 10 brows, 10 noses, 10 mouths, 10 skin details, 10 makeup items and 10 facial-hair items;
- 10 hairstyles × 10 tintable hair colors;
- 10 outfits and 10 backgrounds;
- 10 headwear items including the compound assassin hood;
- 10 masks, 10 eyewear, 10 ear accessories and 10 neck accessories;
- 10 auras, 10 frames and 10 foreground effects.

Prompt contract: warm premium stylized 3D, expressive plausible eyes, soft sculpted face, cream/terracotta light, same orthographic front pose, no text, no camera change, no extra anatomy, preserve rig-guide silhouette. Every generation result goes to `.codex-tmp/avatar-dna/sources/<itemId>/` and is segmented by the deterministic builder. Generate one bounded item family per fresh or compacted Codex task, export results immediately and keep checkpoints file-based; never accumulate a large in-thread base64 batch.

- [ ] **Step 5: Verify GREEN with automated and human visual gates**

Run:

```bash
node scripts/codex-safe-run.mjs -- node scripts/avatar-dna/validate_catalog.mjs --catalog config/avatar-dna/catalog.v1.json --rig config/avatar-dna/human_v1.rig.json --assets admin/v2/avatars/avatar-dna/v1
node scripts/codex-safe-run.mjs -- node scripts/avatar-dna/build_contact_sheet.mjs --catalog config/avatar-dna/catalog.v1.json --out qa-artifacts/avatar-dna/v1
npx jest --runTestsByPath tests/avatar_dna_asset_pipeline.test.ts tests/avatar_dna_catalog_contract.test.ts tests/avatar_dna_resolver.test.ts --no-cache --runInBand
```

Expected: short summaries report PASS; full logs remain in `.codex-tmp`; inventory sheets cover all ten assets in every visual family. Cross-combination sheets must include all ten aligned core combinations plus separate compatible passes for all masks and all eyewear, every skin tone, both starter presets, hood/mask/eyewear conflicts and portrait/studio crops. Owner approval of both inventory and cross-combination sheets is a blocking human gate.

- [ ] **Step 6: Publish immutable files and commit**

Run `node scripts/avatar-dna/publish_assets.mjs --version 1 --source .codex-tmp/avatar-dna/bundles --target admin/v2/avatars/avatar-dna/v1`, then commit only final compressed files, manifests, scripts and tests. Do not deploy hosting in this task.

**Gate B acceptance:** the app can render the production starter inventory in the approved reference style; every item passes machine checks and the approved contact sheet.

---

### Task 9: Ownership, purchases and exact no-duplicate spin grants

**Files:**
- Create: `modules/avatar-dna/reward_pool.ts`
- Modify: `app/economy/client_shard_semantic_reducer.ts`
- Modify: `app/local_level_spins.ts:30-36, 93-97, 261-310`
- Modify: `app/level_spin_local_contract.ts:3-45, 76-91`
- Modify: `app/level_gift_system.ts:1252-1384, 1846-1896, 2206-2226`
- Modify: `modules/avatar-dna/storage.ts`
- Create: `tests/avatar_dna_reward_pool.test.ts`
- Create: `tests/avatar_dna_spin_atomicity.test.ts`
- Modify: `tests/client_shard_operation_ledger.test.ts`
- Modify: `tests/level_gift_effect_exactly_once.test.ts`
- Modify: `tests/economy_constitution_contract.test.ts`

- [ ] **Step 1: Write RED reward/atomicity tests**

```ts
test('deterministically chooses an exact unowned item from the pinned catalog', () => {
  expect(selectAvatarDNAReward({ requestId: 'req-1234567890abcd', catalogVersion: 1, ownedItemIds: ['headwear.assassin_hood.01'], lane: 'base' }))
    .toEqual({ kind: 'avatar_dna_item', itemId: 'mask.fox.01', catalogVersion: 1 });
});

test('same request replays the exact item and cannot consume the spin twice', async () => {
  const first = await claimLocalLevelSpin();
  const replay = await claimLocalLevelSpin();
  expect(replay.requestId).toBe(first.requestId);
  expect(replay.exactGrant).toEqual(first.exactGrant);
  expect(await readLocalLevelSpinBalance()).toBe(0);
});

test('a failed composite write leaves the credit and ownership unchanged', async () => {
  storage.failBeforeEntitlement();
  await expect(claimLocalLevelSpin()).rejects.toThrow();
  expect(await readLocalLevelSpinBalance()).toBe(1);
  expect(await readOwnedAvatarDNAItems()).toEqual([]);
});

test('a crash after entitlement may favor the user but never leaves an orphan debit', async () => {
  storage.failAfterEntitlementBeforeCreditRoot();
  await expect(claimLocalLevelSpin()).rejects.toThrow();
  expect(await readLocalLevelSpinBalance()).toBe(1);
  expect(await readOwnedAvatarDNAItems()).toContain('mask.fox.01');
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npx jest --runTestsByPath tests/avatar_dna_reward_pool.test.ts tests/avatar_dna_spin_atomicity.test.ts tests/client_shard_operation_ledger.test.ts tests/level_gift_effect_exactly_once.test.ts tests/economy_constitution_contract.test.ts --no-cache --runInBand
```

Expected: new suites fail; existing economy suites stay green before implementation.

- [ ] **Step 3: Add portable semantic entitlement**

Extend the existing operation journal with grant kind `avatar_dna_item`, subjectId equal to catalog item ID and payload `{ catalogVersion: 1 }`. `reducePortableClientShardGrant` writes the item into the owner-scoped DNA ownership projection. Purchase uses one `commitClientShardOperation` with `semanticResult: true`; no standalone balance write is added.

- [ ] **Step 4: Bind spin credit and exact entitlement**

Extend `LocalLevelSpinReceipt` with:

```ts
exactGrant: Readonly<{
  kind: 'avatar_dna_item';
  itemId: string;
  catalogVersion: 1;
}> | null;
requestFingerprint: string;
```

When `baseGiftId === 'cosmetic_avatar_common'`, select from the immutable reward pool after excluding all owned IDs and the other lane's selected ID. Under the same account/storage lock, first persist a prepared intent, then the exact entitlement/receipt/occurrence/pending reveal, and commit credit removal in the state root last. Recovery replays the same fingerprint: a crash may favor the user with a free entitlement but can never leave a consumed credit without its grant. The gift application path only reveals/replays `exactGrant`; it never calls `Math.random()` for DNA items. If the pool is empty, choose the existing XP fallback before preparing the composite operation.

- [ ] **Step 5: Run GREEN and the constitution guard**

Run the five suites from Step 2. Expected: all PASS; duplicate count and orphan debit count are zero; retry produces byte-identical receipt.

- [ ] **Step 6: Commit as one critical economy change**

Stage only the files in this task, run `git diff --cached --check`, review with a fresh economy/security reviewer, then commit once. Do not split debit logic from entitlement logic.

**Gate C acceptance:** every cosmetic spin shows an already-owned exact result, never duplicates an available item, and a crash/network failure cannot produce a consumed credit without its entitlement.

---

### Task 10: Trusted Cloud compositor and server-owned ready projection

**Files:**
- Create: `functions/src/avatar_dna_contract.ts`
- Create: `functions/src/avatar_dna_compositor.ts`
- Create: `functions/src/avatar_dna_projection.ts`
- Create: `functions/src/avatar_dna_contract.test.ts`
- Create: `functions/src/avatar_dna_compositor.test.ts`
- Create: `functions/src/avatar_dna_projection.test.ts`
- Modify: `functions/src/public_profile_projection.ts:10-141`
- Modify: `functions/src/index.ts:1079-1091`
- Modify: `functions/package.json`
- Modify: `firestore.rules:1285-1418, 1609-1615`
- Modify: `storage.rules`
- Modify: `functions/src/account_delete.ts:189-230, 490-506`
- Modify: `functions/src/jarvis/jarvis_data_contract_guard.test.ts:321-361`
- Modify: `tests/firestore_rules_security.test.ts`
- Create: `tests/avatar_dna_storage_rules.test.ts`

- [ ] **Step 1: Write RED server/security tests**

Tests must prove: unauthenticated/foreign UID rejected; unknown item/hash rejected; arbitrary bitmap field rejected; same operationId+fingerprint replays; changed payload with same ID fails; output paths are owner-scoped; public projection changes only after portrait and studio exist; previous ready projection survives any composition failure; direct Firestore/Storage client writes are denied; owner can read the server-written immutable receipt; account deletion removes style operations and render prefix.

- [ ] **Step 2: Verify RED**

Run:

```bash
npm --prefix functions test -- --runInBand avatar_dna_contract.test.ts avatar_dna_compositor.test.ts avatar_dna_projection.test.ts
npx jest --runTestsByPath tests/firestore_rules_security.test.ts tests/avatar_dna_storage_rules.test.ts --no-cache --runInBand
```

Expected: FAIL because callable/rules are absent.

- [ ] **Step 3: Implement strict callable input and idempotency**

Callable input is only:

```ts
type AvatarDNAProjectInput = Readonly<{
  stableId: string;
  operationId: string;
  requestFingerprint: string;
  manifestVersion: 1;
  dna: AvatarDNA;
}>;
```

Resolve stable identity, reject deletion markers/hidden identity, validate DNA against the server-bundled hashed manifest and store immutable `users/{stableUid}/avatar_style_operations/{operationId}`. Exact retry returns the prior receipt; changed fingerprint fails `already-exists`.

- [ ] **Step 4: Implement compositor and atomic ready switch**

Pin `sharp` in `functions/package.json`. Composite approved 512px layers to `avatar-renders/{stableUid}/{renderId}/studio.webp`, then crop/resize portrait to `portrait.webp`. Write both objects with immutable cache metadata and hashes. Only after both `file.exists()` checks succeed, merge this shape into `public_profiles/{stableUid}`:

```ts
avatarV2: {
  schemaVersion: 1,
  state: 'ready',
  renderId,
  portraitUrl,
  studioUrl,
  manifestVersion: 1,
  updatedAtMs,
}
```

Never accept client image bytes or URLs. On failure, write retry metadata to the operation document and leave the old `avatarV2` untouched.

- [ ] **Step 5: Close rules, deletion and Jarvis contracts**

Firestore: owner may read its style-operation receipts, while direct create/update/delete remain denied; the authenticated callable is the sole writer. `public_profiles` remains server-write-only. Storage: authenticated reads of ready renders, no client writes. Account deletion recursively removes the user subcollection and explicitly deletes `avatar-renders/<stableUid>/`. Jarvis guard records the new schema as operational/non-metric and asserts a rule exists; no department fetcher is changed because none reads `public_profiles` or the new subcollection.

- [ ] **Step 6: Run GREEN**

Run Step 2 commands plus:

```bash
npm --prefix functions test -- --runInBand public_profile_projection.test.ts jarvis/jarvis_data_contract_guard.test.ts account_delete_flow_contract.test.ts
npx jest --runTestsByPath tests/account_delete_flow_contract.test.ts --no-cache --runInBand
```

Expected: all focused suites PASS.

- [ ] **Step 7: Commit as one cross-contract critical change**

Commit functions, both rules files, deletion and Jarvis guard together. Do not deploy functions/rules/storage from this task.

---

### Task 11: Client public sync and last-good recovery

**Files:**
- Create: `app/avatar_dna_public_sync.ts`
- Create: `modules/avatar-dna/public_projection.ts`
- Modify: `app/public_profile_snapshot.ts:34-61, 181-340`
- Modify: `modules/avatar-dna/storage.ts`
- Create: `tests/avatar_dna_public_sync.test.ts`
- Modify: `tests/public_profile_snapshot_hot_path.test.ts`

- [ ] **Step 1: Write RED retry/fallback tests**

```ts
test('network failure keeps local DNA and queues the same operation id', async () => {
  callable.mockRejectedValue(new Error('offline'));
  await syncAvatarDNAProjection(operation);
  expect(await readConfirmedAvatarDNA()).toEqual(dna);
  expect(await readPendingAvatarDNAOperation()).toMatchObject({ operationId: operation.operationId, requestFingerprint: operation.requestFingerprint });
});

test('malformed public avatarV2 is ignored in favor of legacy avatar', () => {
  expect(parseAvatarV2Projection({ state: 'ready', portraitUrl: 'javascript:bad' })).toBeNull();
});
```

- [ ] **Step 2: Verify RED**

Run: `npx jest --runTestsByPath tests/avatar_dna_public_sync.test.ts tests/public_profile_snapshot_hot_path.test.ts --no-cache --runInBand`

Expected: FAIL on missing sync/parser.

- [ ] **Step 3: Implement best-effort queue**

The client sends only validated DNA operation fields to `avatarDNAProjectMine`. Pending state is root-last and replayed on app foreground/account hydration with the same operation ID/fingerprint. A successful response updates cached ready projection; failure changes only retry metadata. `public_profile_snapshot.ts` includes the current ready `avatarV2` in its display hash but never writes URLs supplied by the client.

- [ ] **Step 4: Run GREEN**

Run Step 2 suites plus `tests/app_snapshot_bootstrap_account_race.test.ts`. Expected: PASS, including old-ready preservation, malformed URL rejection and account switch during retry.

- [ ] **Step 5: Commit**

```bash
git add app/avatar_dna_public_sync.ts modules/avatar-dna/public_projection.ts app/public_profile_snapshot.ts modules/avatar-dna/storage.ts tests/avatar_dna_public_sync.test.ts tests/public_profile_snapshot_hot_path.test.ts
git commit --only -m "feat: sync Avatar DNA public renders" -- app/avatar_dna_public_sync.ts modules/avatar-dna/public_projection.ts app/public_profile_snapshot.ts modules/avatar-dna/storage.ts tests/avatar_dna_public_sync.test.ts tests/public_profile_snapshot_hot_path.test.ts
```

---

### Task 12: Propagate ready portraits through every avatar consumer

**Files:**
- Modify: `app/app_snapshot_store.ts:63-77`
- Modify: `app/friends_profiles_batch.ts`
- Modify: `functions/src/friends_profiles.ts`
- Modify: `app/firestore_friends.ts`
- Modify: `app/firestore_leagues.ts`
- Modify: `functions/src/league_groups.ts`
- Modify: `modules/arena/contract.ts`
- Modify: `functions/src/arena_v2.ts`
- Modify: `app/tournament_client.ts`
- Modify: `functions/src/tournament_core.ts`
- Modify: `app/(tabs)/friends.tsx`, `app/(tabs)/home.tsx`, `app/(tabs)/tournaments.tsx`
- Modify: `app/arena_friend_duel.tsx`, `app/avatar_select.tsx`, `app/club_screen.tsx`, `app/LeagueResultModal.tsx`, `app/top_helpers.tsx`
- Modify: `app/tournament_lobby.tsx`, `app/tournament_results.tsx`, `app/tournament_season.tsx`, `app/tournament_table.tsx`
- Modify: `components/arena/ArenaPlayers.tsx`, `components/arena/ArenaVersusIntro.tsx`
- Modify: `components/customization/CustomizationCatalogCard.tsx`, `components/customization/CustomizationHero.tsx`
- Modify: `components/friends_together/FriendLevelUpModal.tsx`, `components/friends_together/FriendTogetherSheet.tsx`
- Modify: `components/league/LeagueResultHybrid.tsx`, `components/LevelGiftDualModal.tsx`, `components/LevelGiftModal.tsx`
- Modify: `components/NotificationCenterButton.tsx`, `components/PlayerProfileModal.tsx`
- Create: `tests/avatar_v2_consumer_contract.test.ts`
- Create: `functions/src/friends_profiles_avatar_v2.test.ts`
- Create: `functions/src/league_groups_avatar_v2.test.ts`
- Create: `functions/src/arena_v2_avatar_v2.test.ts`
- Modify: `functions/src/tournament_core.test.ts`

- [ ] **Step 1: Write the RED consumer inventory contract**

The test runs `rg`/source reads and fails if a non-catalog `AvatarView` call receives a remote profile `avatar` without the adjacent `avatarV2` prop. It also asserts friend/league/Arena/tournament DTOs accept only parsed `AvatarV2Projection`, never arbitrary nested data.

- [ ] **Step 2: Verify RED**

Run: `npx jest --runTestsByPath tests/avatar_v2_consumer_contract.test.ts --no-cache --runInBand`

Expected: FAIL and list the unconverted call sites.

- [ ] **Step 3: Extend DTOs without replacing legacy avatar**

Add `avatarV2?: AvatarV2Projection | null` beside every remote `avatar`. Server fan-outs copy only the ready projection fields after validation; synthetic residents/bots leave it undefined. Update each `AvatarView` call to pass both fields. Lists keep `animateAura={false}` and therefore decode one 256px image per visible person.

- [ ] **Step 4: Run focused consumer suites and verify GREEN**

Run:

```bash
npx jest --runTestsByPath tests/avatar_v2_consumer_contract.test.ts tests/tournament_avatar_values.test.ts tests/avatar_select_studio_contract.test.ts --no-cache --runInBand
npm --prefix functions test -- --runInBand friends_profiles_avatar_v2.test.ts league_groups_avatar_v2.test.ts arena_v2_avatar_v2.test.ts tournament_core.test.ts
```

Expected: all named suites PASS.

- [ ] **Step 5: Commit by bounded domain batches**

Use four commits in this order: friends/profile; league; Arena; tournaments. Each commit includes its DTO, UI consumers and focused tests. Do not edit Arena files outside the exact listed propagation and never revert Arena work.

**Gate D acceptance:** own profile updates immediately; other users see the previous ready avatar until the new ready portrait exists; friends/league/Arena/tournaments never render a layer stack per row.

---

### Task 13: Telemetry, performance and accessibility release gates

**Files:**
- Create: `modules/avatar-dna/telemetry.ts`
- Modify: `components/avatar-dna/AvatarDNAEditor.tsx`
- Modify: `components/avatar-dna/AvatarDNACatalog.tsx`
- Modify: `components/avatar-dna/AvatarDNAItemCard.tsx`
- Modify: `components/AvatarView.tsx`
- Create: `tests/avatar_dna_telemetry_privacy.test.ts`
- Create: `tests/avatar_dna_performance_contract.test.ts`
- Modify: `tests/avatar_dna_studio_accessibility.test.tsx`
- Modify: `tests/motion_hybrid_contract.test.ts`

- [ ] **Step 1: Write RED privacy/performance gates**

Telemetry test rejects keys containing `image`, `prompt`, `faceBytes`, `dnaJson` or raw URLs. Performance contract asserts one virtualized grid, bounded prefetch to current/adjacent subcategory, content-addressed cache, no avatar/aura loop in list mode and one ready portrait image in social rows.

- [ ] **Step 2: Verify RED**

Run:

```bash
npx jest --runTestsByPath tests/avatar_dna_telemetry_privacy.test.ts tests/avatar_dna_performance_contract.test.ts tests/motion_hybrid_contract.test.ts --no-cache --runInBand
npx jest --config jest.rntl.config.cjs --runTestsByPath tests/avatar_dna_studio_accessibility.test.tsx --no-cache --runInBand
```

Expected: new gates fail until instrumentation/limits are added.

- [ ] **Step 3: Implement bounded operational metrics**

Allow only event names and fields from this closed schema:

```ts
type AvatarDNATelemetryEvent =
  | { name: 'avatar_studio_opened'; source: 'invitation' | 'studio' | 'profile' }
  | { name: 'avatar_studio_saved'; mode: 'guided' | 'free'; durationBucket: 'lt30' | '30to120' | 'gt120' }
  | { name: 'avatar_asset_fallback'; itemId: string; camera: 'portrait' | 'studio' }
  | { name: 'avatar_public_sync'; state: 'ready' | 'retry'; ageBucket: 'fresh' | 'hour' | 'day' }
  | { name: 'avatar_classic_restored' };
```

Add zero-valued operational counters for duplicate cosmetic, orphan debit and empty-avatar fallback; their tests must fail on non-zero fixtures. Enforce prefetch and decoded-image limits in code constants, not comments.

- [ ] **Step 4: Run GREEN and slow-device manual check**

Run Step 2 commands. Then on the lowest-supported Android device/emulator verify: Studio first interactive frame, rapid category switching, 100-item scroll, portrait/studio toggle, save offline, relaunch, and a league list. Record timings and screenshots in ignored `qa-artifacts/avatar-dna/runtime/`.

- [ ] **Step 5: Commit**

Commit telemetry, UI bounds and all four tests together. Do not include runtime screenshots in the mobile bundle.

---

### Task 14: Migration, rollback and final focused verification

**Files:**
- Modify: `app/avatar_select.tsx`
- Modify: `modules/avatar-dna/storage.ts`
- Create: `tests/avatar_dna_migration.test.ts`
- Create: `tests/avatar_dna_release_gate.test.ts`
- Modify: `docs/superpowers/specs/2026-08-20-avatar-dna-studio-design.md` only if implementation discovers an owner-approved contract correction

- [ ] **Step 1: Write RED migration/rollback tests**

Test these exact states: legacy-only account; DNA-enabled account; corrupt DNA; removed catalog item; revoked defective item with last-good render; account switch; `Вернуть классический аватар`; flag disabled after prior save; public compositor unavailable. Every case must preserve a non-empty visible avatar.

- [ ] **Step 2: Verify RED**

Run: `npx jest --runTestsByPath tests/avatar_dna_migration.test.ts tests/avatar_dna_release_gate.test.ts --no-cache --runInBand`

Expected: FAIL on missing explicit classic rollback/revocation behavior.

- [ ] **Step 3: Implement monotonic migration**

Never auto-convert legacy selections. First DNA save marks the owner-scoped DNA state active; `Вернуть классический аватар` changes presentation mode but preserves DNA for future editing. A disabled flag hides editing but continues rendering an already-confirmed last-good DNA/public portrait. Revoked items cannot enter a new draft; the current last-good portrait remains until voluntary save.

- [ ] **Step 4: Run the complete focused gate**

```bash
npx jest --runTestsByPath tests/avatar_dna_contract.test.ts tests/avatar_dna_catalog_contract.test.ts tests/avatar_dna_resolver.test.ts tests/avatar_dna_storage.test.ts tests/avatar_dna_editor_reducer.test.ts tests/avatar_dna_studio_contract.test.ts tests/avatar_dna_save_flow.test.ts tests/avatar_dna_reward_pool.test.ts tests/avatar_dna_spin_atomicity.test.ts tests/avatar_dna_public_sync.test.ts tests/avatar_v2_consumer_contract.test.ts tests/avatar_dna_telemetry_privacy.test.ts tests/avatar_dna_performance_contract.test.ts tests/avatar_dna_migration.test.ts tests/avatar_dna_release_gate.test.ts tests/economy_constitution_contract.test.ts tests/motion_hybrid_contract.test.ts tests/account_delete_flow_contract.test.ts tests/firestore_rules_security.test.ts --no-cache --runInBand

npm --prefix functions test -- --runInBand avatar_dna_contract.test.ts avatar_dna_compositor.test.ts avatar_dna_projection.test.ts public_profile_projection.test.ts jarvis/jarvis_data_contract_guard.test.ts
```

Expected: all focused suites PASS with zero duplicate cosmetics, zero orphan debits and zero empty-avatar projections.

- [ ] **Step 5: Run release preflight without deploying**

Run `git diff --check`, `node scripts/avatar-dna/validate_catalog.mjs` against production assets, the contact-sheet gate and scoped TypeScript/ESLint. Request fresh TypeScript, security/economy and React Native UI reviews. Fix every P0/P1 and re-run the exact failed gate.

- [ ] **Step 6: Commit final migration/release guards**

Commit only migration code and release tests. Deployment of Hosting, Functions, Firestore Rules or Storage Rules requires a separate explicit release task and its own rollback plan.

**Gate E acceptance:** all 12 acceptance criteria from the design spec map to a passing deterministic gate; no existing avatar/aura/frame behavior is removed; rollout defaults remain off/0 until the owner authorizes release.

## Spec-to-task coverage

| Design requirement | Implemented by |
|---|---|
| `human_v1`, anchors, crops, versioning | Tasks 1–2 |
| Five categories, guided/free editor | Tasks 5–7 |
| Static character; UI motion only | Tasks 4, 6, 13 |
| Compound hood/mask/headwear and restoration | Tasks 2, 5, 8 |
| DALL·E only as source art; deterministic asset QA | Task 8 |
| Free base and rare cosmetics | Tasks 2, 8–9 |
| Exact spin result, no duplicate/orphan debit | Task 9 |
| Local-first save, account isolation, last-good | Tasks 3, 7, 11, 14 |
| Trusted ready portrait/studio public renders | Tasks 10–11 |
| Friends/league/Arena/tournament consumers | Task 12 |
| Firestore/Storage/deletion/Jarvis contracts | Task 10 |
| Legacy fallback and explicit classic return | Tasks 4, 6, 14 |
| Performance, accessibility, localization, telemetry | Tasks 6, 13 |
| Phased rollout and safe rollback | Tasks 7, 14 |

## Execution boundary

Implementation starts at Task 1 and stops at every Gate A–E for evidence review. No production deployment is included in this plan. Asset contact-sheet approval, critical economy review and cross-contract cloud review are mandatory human/reviewer checkpoints and cannot be replaced by a green unit test.
