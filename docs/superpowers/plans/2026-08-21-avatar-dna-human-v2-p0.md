# Avatar DNA human_v2 P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove an instantaneous, fully offline 3D Avatar DNA preview inside the existing Expo React Native app before creating the production avatar catalog.

**Architecture:** Keep P0 isolated from the rejected `human_v1` PNG layer renderer. A pure `human_v2` resolver emits morph, mesh and material state; one preloaded Three scene applies that state without fetching or constructing a new scene after a user tap. The proof surface is internal-only and preserves every current avatar screen and fallback.

**Tech Stack:** Expo SDK 54, React Native 0.81, `expo-gl`, `expo-asset`, `three`, `@react-three/fiber/native`, TypeScript, Jest/RNTL, React Native Reanimated for UI only.

---

## File map

- `package.json` — exact P0 renderer dependencies.
- `metro.config.js` — treats `.glb` as a bundled asset without changing existing resolver rules.
- `modules/avatar-dna-3d/contracts.ts` — small immutable P0 DNA/render-plan types.
- `modules/avatar-dna-3d/resolver.ts` — pure selection-to-render-plan resolver; no GL or I/O.
- `modules/avatar-dna-3d/prewarm.ts` — one-shot asset/scene readiness state and explicit no-network invariant.
- `components/avatar-dna-3d/Avatar3DStage.tsx` — native Canvas host with demand-only rendering and no character animation.
- `components/avatar-dna-3d/Avatar3DScene.tsx` — applies a render plan to already-created object refs.
- `app/_admin_avatar_dna_3d_p0.tsx` — developer-only proof route, never linked from production UI.
- `tests/avatar_dna_3d_resolver.test.ts` — deterministic morph/occlusion tests.
- `tests/avatar_dna_3d_prewarm.test.ts` — no-network and readiness tests.
- `tests/avatar_dna_3d_stage_contract.test.ts` — source-level contract for demand rendering and no avatar motion.

### Task 1: Add a bounded native 3D runtime

**Files:**
- Modify: `package.json`
- Modify: `metro.config.js`
- Create: `tests/avatar_dna_3d_runtime_contract.test.ts`

- [ ] **Step 1: Write a failing runtime contract**

```ts
import fs from 'fs';

test('bundles only the native 3D runtime and accepts GLB assets', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const metro = fs.readFileSync('metro.config.js', 'utf8');
  expect(pkg.dependencies['expo-gl']).toBeDefined();
  expect(pkg.dependencies.three).toBeDefined();
  expect(pkg.dependencies['@react-three/fiber']).toBeDefined();
  expect(metro).toMatch(/assetExts.*glb|glb.*assetExts/s);
});
```

- [ ] **Step 2: Run the contract and verify RED**

Run: `npx jest --runTestsByPath tests/avatar_dna_3d_runtime_contract.test.ts --no-cache --runInBand`

Expected: FAIL because `expo-gl`, `three`, `@react-three/fiber` and GLB Metro support do not exist.

- [ ] **Step 3: Install SDK-compatible packages and add only `.glb` to Metro assets**

Run: `npx expo install expo-gl && npm install three @react-three/fiber`

Add, before `module.exports = config`, exactly:

```js
config.resolver.assetExts = [...config.resolver.assetExts, 'glb'];
```

Do not replace `resolveRequest`, `blockList`, Watchman configuration, or any existing extension list.

- [ ] **Step 4: Run the contract and verify GREEN**

Run: `npx jest --runTestsByPath tests/avatar_dna_3d_runtime_contract.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit only runtime wiring**

```bash
git add package.json package-lock.json metro.config.js tests/avatar_dna_3d_runtime_contract.test.ts
git commit --only -m "feat: add bounded Avatar DNA 3D runtime" -- package.json package-lock.json metro.config.js tests/avatar_dna_3d_runtime_contract.test.ts
```

### Task 2: Define pure `human_v2` P0 state and resolver

**Files:**
- Create: `modules/avatar-dna-3d/contracts.ts`
- Create: `modules/avatar-dna-3d/resolver.ts`
- Create: `tests/avatar_dna_3d_resolver.test.ts`

- [ ] **Step 1: Write failing resolver tests**

```ts
import { resolveAvatar3DPlan } from '../modules/avatar-dna-3d/resolver';

const base = { facePresetId: 'face.soft', hairId: 'hair.wave', outfitId: 'outfit.terra', headwearId: null, skinTone: '#D4936A', hairColor: '#5B2B18', camera: 'portrait' } as const;

test('returns stable in-range morphs and ready mesh ids without I/O', () => {
  expect(resolveAvatar3DPlan(base)).toEqual({
    morphWeights: { eye_size: 0.35, head_width: 0.15, jaw_shape: 0.1, lip_fullness: 0.2, mouth_width: 0.1, nose_projection: 0.1, nose_width: 0.2 },
    visibleMeshIds: ['body.base', 'hair.wave', 'outfit.terra'],
    hiddenZones: [],
    materialParams: { hairColor: '#5B2B18', skinTone: '#D4936A' },
    camera: 'portrait',
  });
});

test('a hood hides front hair but never erases the selected hair DNA', () => {
  const plan = resolveAvatar3DPlan({ ...base, headwearId: 'hood.assassin' });
  expect(plan.visibleMeshIds).toContain('hood.assassin');
  expect(plan.visibleMeshIds).not.toContain('hair.wave.front');
  expect(plan.hiddenZones).toEqual(['hair.front', 'hair.top']);
});
```

- [ ] **Step 2: Run RED**

Run: `npx jest --runTestsByPath tests/avatar_dna_3d_resolver.test.ts --no-cache --runInBand`

Expected: FAIL because the resolver is absent.

- [ ] **Step 3: Implement immutable types and resolver**

Implement exported `Avatar3DP0DNA`, `Avatar3DRenderPlan`, `P0_FACE_PRESETS`, and `resolveAvatar3DPlan(dna)`. Validate exact allowed IDs, hexadecimal material colors, and camera enum. Return frozen arrays/objects. Use a constant hood coverage map `{ 'hood.assassin': ['hair.front', 'hair.top'] }`; never use random values, network, Date, GL or React imports.

- [ ] **Step 4: Run GREEN**

Run: `npx jest --runTestsByPath tests/avatar_dna_3d_resolver.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit pure foundation**

```bash
git add modules/avatar-dna-3d/contracts.ts modules/avatar-dna-3d/resolver.ts tests/avatar_dna_3d_resolver.test.ts
git commit --only -m "feat: resolve deterministic Avatar DNA 3D plans" -- modules/avatar-dna-3d/contracts.ts modules/avatar-dna-3d/resolver.ts tests/avatar_dna_3d_resolver.test.ts
```

### Task 3: Enforce prewarm-before-tap

**Files:**
- Create: `modules/avatar-dna-3d/prewarm.ts`
- Create: `tests/avatar_dna_3d_prewarm.test.ts`

- [ ] **Step 1: Write failing readiness tests**

```ts
import { createAvatar3DPrewarm } from '../modules/avatar-dna-3d/prewarm';

test('does not allow selection before all local assets and shader warmup are ready', async () => {
  const loadLocalAssets = jest.fn(async () => undefined);
  const warmScene = jest.fn(async () => undefined);
  const prewarm = createAvatar3DPrewarm({ loadLocalAssets, warmScene });
  expect(prewarm.isReady()).toBe(false);
  await prewarm.ready();
  expect(loadLocalAssets).toHaveBeenCalledTimes(1);
  expect(warmScene).toHaveBeenCalledTimes(1);
  expect(prewarm.isReady()).toBe(true);
});

test('never accepts a network loader dependency', () => {
  expect(() => createAvatar3DPrewarm({ loadLocalAssets: async () => undefined, warmScene: async () => undefined, fetch: global.fetch })).toThrow('avatar_3d_network_forbidden');
});
```

- [ ] **Step 2: Run RED**

Run: `npx jest --runTestsByPath tests/avatar_dna_3d_prewarm.test.ts --no-cache --runInBand`

Expected: FAIL because the prewarm API is absent.

- [ ] **Step 3: Implement a shared idempotent prewarm gate**

`createAvatar3DPrewarm` accepts only `loadLocalAssets` and `warmScene`; reject an object with own `fetch` key. Cache one promise, resolve it only after both local steps pass, and retain the rejected state with an explicit `getError()` result. The stage must read this gate before exposing selectable controls.

- [ ] **Step 4: Run GREEN**

Run: `npx jest --runTestsByPath tests/avatar_dna_3d_prewarm.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit readiness gate**

```bash
git add modules/avatar-dna-3d/prewarm.ts tests/avatar_dna_3d_prewarm.test.ts
git commit --only -m "feat: gate Avatar DNA 3D choices on local prewarm" -- modules/avatar-dna-3d/prewarm.ts tests/avatar_dna_3d_prewarm.test.ts
```

### Task 4: Build an internal demand-rendered proof surface

**Files:**
- Create: `components/avatar-dna-3d/Avatar3DScene.tsx`
- Create: `components/avatar-dna-3d/Avatar3DStage.tsx`
- Create: `app/_admin_avatar_dna_3d_p0.tsx`
- Create: `tests/avatar_dna_3d_stage_contract.test.ts`

- [ ] **Step 1: Write failing stage contract**

```ts
import fs from 'fs';

test('uses native demand rendering and has no character animation or network path', () => {
  const source = fs.readFileSync('components/avatar-dna-3d/Avatar3DStage.tsx', 'utf8');
  expect(source).toContain("from '@react-three/fiber/native'");
  expect(source).toMatch(/frameloop=["']demand["']/);
  expect(source).not.toMatch(/useFrame\(|requestAnimationFrame|fetch\(|Animated|react-native-reanimated/);
  expect(source).toContain('prewarm.ready');
});
```

- [ ] **Step 2: Run RED**

Run: `npx jest --runTestsByPath tests/avatar_dna_3d_stage_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the stage is absent.

- [ ] **Step 3: Implement the isolated proof route**

`Avatar3DStage` renders `<Canvas frameloop="demand">`; `Avatar3DScene` uses refs to apply the pure plan to already mounted mesh/material objects and calls `invalidate()` exactly after a plan change. Do not call `useFrame`. The route is named `_admin_avatar_dna_3d_p0`, has no public entry point, creates three face-preset buttons, two hair buttons and one hood button, and disables those buttons until `prewarm.ready()` resolves.

Use temporary primitive geometry only for renderer wiring; label it in the route `Техническая 3D-проверка — не финальный арт`. Do not show it in `avatar_select.tsx`, `AvatarView`, any home screen, profile, table or reward flow.

- [ ] **Step 4: Run GREEN**

Run: `npx jest --runTestsByPath tests/avatar_dna_3d_stage_contract.test.ts tests/avatar_dna_3d_resolver.test.ts tests/avatar_dna_3d_prewarm.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit internal surface**

```bash
git add components/avatar-dna-3d/Avatar3DScene.tsx components/avatar-dna-3d/Avatar3DStage.tsx app/_admin_avatar_dna_3d_p0.tsx tests/avatar_dna_3d_stage_contract.test.ts
git commit --only -m "feat: add internal demand-rendered Avatar DNA proof" -- components/avatar-dna-3d/Avatar3DScene.tsx components/avatar-dna-3d/Avatar3DStage.tsx app/_admin_avatar_dna_3d_p0.tsx tests/avatar_dna_3d_stage_contract.test.ts
```

### Task 5: P0 device gate and next-plan decision

**Files:**
- Create: `docs/superpowers/reports/avatar-dna-human-v2-p0-gate.md`

- [ ] **Step 1: Run deterministic contracts**

Run: `npx jest --runTestsByPath tests/avatar_dna_3d_runtime_contract.test.ts tests/avatar_dna_3d_resolver.test.ts tests/avatar_dna_3d_prewarm.test.ts tests/avatar_dna_3d_stage_contract.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 2: Run manual device checklist**

Open `/_admin_avatar_dna_3d_p0` in the existing development build on one iPhone and one Android. For each device, record PASS/FAIL for: first preview after prewarm, all six selection buttons, hood occlusion, portrait/studio camera, ten open/close cycles, no network in the Studio flow, no continuous character motion, and no crash.

- [ ] **Step 3: Write a bounded evidence report**

Record device/model/OS/build, exact observed selection latency class (`instant`, `noticeable`, `blocked`), failures, and the decision. `PASS` requires every selection to be `instant`, no crash in ten cycles, and no loading state after Studio opens. `FAIL` prevents catalog production and requires a runtime-fix or Rive fallback decision.

- [ ] **Step 4: Commit evidence only after device verdict**

```bash
git add docs/superpowers/reports/avatar-dna-human-v2-p0-gate.md
git commit --only -m "docs: record Avatar DNA human v2 P0 gate" -- docs/superpowers/reports/avatar-dna-human-v2-p0-gate.md
```

---

## Self-review

- Spec coverage: Tasks 1–4 implement the isolated offline render-on-change P0; Task 3 prevents post-tap loading; Task 5 is the required iOS/Android gate. Production catalog, economy, sync and app-wide consumers are deliberately excluded until P0 PASS.
- Type consistency: `Avatar3DP0DNA -> resolveAvatar3DPlan -> Avatar3DRenderPlan` is the only selection contract across tasks.
- Placeholder scan: no deferred implementation wording, no production art promise, no unresolved paths. The only deliberately temporary geometry is explicitly quarantined to the internal proof route.
