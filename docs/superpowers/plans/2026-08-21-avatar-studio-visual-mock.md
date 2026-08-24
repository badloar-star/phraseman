# Avatar Studio Visual Mock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an isolated browser mock that lets the owner judge two coherent, premium-styled avatar bases and their curated outfit/accessory states before any app integration.

**Architecture:** A standalone React-compatible HTML page reads a small static catalog. Each selected catalog item resolves to one pre-authored complete portrait image, so the mock never composites facial parts or exposes a fake 3D runtime. The catalog models the eventual compatibility rules through explicit base and slot metadata.

**Tech Stack:** Static HTML, CSS, vanilla browser JavaScript, local image assets, no network requests.

---

### Task 1: Define the mock catalog contract

**Files:**
- Create: `prototypes/avatar-studio/index.html`
- Test: `tests/avatar_studio_visual_mock_contract.test.ts`

- [ ] **Step 1: Write the failing static contract test**

```ts
expect(source).toContain('const BASES');
expect(source).toContain("id: 'boy'");
expect(source).toContain("id: 'girl'");
expect(source).toContain("smirk");
expect(source).toContain("archmage");
expect(source).toContain("accessories");
```

- [ ] **Step 2: Run the focused test and verify it fails because the page does not exist**

Run: `npx jest --runTestsByPath tests/avatar_studio_visual_mock_contract.test.ts --runInBand`

- [ ] **Step 3: Create a local-only catalog in the page**

```js
const BASES = Object.freeze([
  { id: 'boy', label: 'Мальчик' },
  { id: 'girl', label: 'Девочка' },
]);
const CATALOG = Object.freeze({
  expression: ['neutral', 'smile', 'smirk', 'sad', 'angry'],
  outfit: ['casual', 'student', 'mage', 'archmage'],
  accessories: ['glasses', 'cap', 'beanie', 'hood', 'crown', 'wizard-hat'],
});
```

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npx jest --runTestsByPath tests/avatar_studio_visual_mock_contract.test.ts --runInBand`

### Task 2: Build the reference-faithful mobile layout

**Files:**
- Modify: `prototypes/avatar-studio/index.html`
- Modify: `tests/avatar_studio_visual_mock_contract.test.ts`

- [ ] **Step 1: Extend the test with required visual surface markers**

```ts
expect(source).toContain('data-testid="avatar-studio-mock"');
expect(source).toContain('Твоя студия');
expect(source).toContain('Выражение');
expect(source).toContain('Аксессуары');
expect(source).toContain('Сохранить персонажа');
```

- [ ] **Step 2: Add the mobile shell and controls**

Use a 390px wide cream screen, a 300px portrait card, category tabs, 44px-minimum accessible item cards, and a fixed terracotta save action. Use the reference palette `#FFF5EC`, `#F1D1B9`, `#CA542D`, `#45271A`; do not use emoji icons or technical labels.

- [ ] **Step 3: Add 180–240ms opacity/transform transitions to item selection only**

```css
.choice { transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease; }
.choice[aria-pressed="true"] { transform: translateY(-2px); }
@media (prefers-reduced-motion: reduce) { .choice { transition: none; } }
```

- [ ] **Step 4: Run the focused test and open the static page locally**

Run: `npx jest --runTestsByPath tests/avatar_studio_visual_mock_contract.test.ts --runInBand`

Expected: PASS. Verify the page via the local browser before asking the owner to review it.

### Task 3: Add only approved, complete portrait states

**Files:**
- Create: `prototypes/avatar-studio/assets/README.md`
- Modify: `prototypes/avatar-studio/index.html`
- Modify: `tests/avatar_studio_visual_mock_contract.test.ts`

- [ ] **Step 1: Specify asset acceptance rules in the README**

State that every portrait must be a whole half-body character, match the approved warm stylized visual language, include compatible hair/outfit/accessory in one render, and never be a cut-up face, SVG puppet, or placeholder geometry.

- [ ] **Step 2: Render only complete portrait states**

```js
function resolvePortrait({ baseId, expressionId, outfitId, accessoryId }) {
  return PORTRAITS[`${baseId}:${expressionId}:${outfitId}:${accessoryId}`]
    ?? PORTRAITS[`${baseId}:neutral:casual:none`];
}
```

The fallback is permitted only inside this private mock and must remain a visually complete character.

- [ ] **Step 3: Add an asset guard test**

```ts
expect(source).not.toContain('sphereGeometry');
expect(source).not.toContain('AvatarStudioRig');
expect(source).not.toContain('facePresetId');
```

- [ ] **Step 4: Run the focused test and visually inspect both bases, archmage, hood, glasses and smirk**

Run: `npx jest --runTestsByPath tests/avatar_studio_visual_mock_contract.test.ts --runInBand`

Expected: PASS.

### Task 4: Owner-only preview gate

**Files:**
- Modify: `prototypes/avatar-studio/index.html`
- Test: `tests/avatar_studio_visual_mock_contract.test.ts`

- [ ] **Step 1: Add a test that proves the mock has no app route or network use**

```ts
expect(source).not.toContain('fetch(');
expect(source).not.toContain('expo-router');
expect(source).not.toContain('react-native');
```

- [ ] **Step 2: Include an explicit preview-only badge**

The badge must read `Визуальный макет · не в приложении` and be visually secondary.

- [ ] **Step 3: Run focused contracts and report only the owner-review URL**

Run: `npx jest --runTestsByPath tests/avatar_studio_visual_mock_contract.test.ts --runInBand`

Expected: PASS. Do not add a phone header entry, app route, GLB, or device build.

## Plan self-review

- Coverage: two bases, five expressions including smirk, hair/outfit/accessory-led customization, compatibility and offline mock are covered by Tasks 1–4.
- No face-part or skin-colour controls appear in the plan.
- The mock remains isolated from React Native until owner visual approval.
