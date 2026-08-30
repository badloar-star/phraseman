# Arena Rank Cinematics and League Knowledge Relics Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace generic Arena matchmaking/versus visuals with lightweight rank-shield cinematics, add the standard Arena back action, and rebuild all twelve League icons as a coherent escalating family of volumetric knowledge relics with a subtle League-screen-only ambient background.

**Architecture:** Keep competitive rules and gameplay HUD unchanged. Pass the viewer's already-loaded Arena star count through navigation, derive rank assets locally, and isolate motion in small Reanimated presentation components that stop when inactive or reduced motion is enabled. Preserve the existing twelve static League asset slots, generate one ordered 3×4 atlas through Codex built-in image generation, and use the repository's Sharp pipeline to extract, key, compress, validate, and manifest the final WebPs.

**Tech Stack:** Expo Router, React Native, React Native Reanimated, Expo Image, TypeScript, Jest source/runtime contracts, Sharp, Codex built-in image generation.

---

## Task 1: Lock the twelve-relief League asset contract

**Files:**
- Modify: `tests/league_icon_assets.test.ts`
- Modify: `scripts/build-league-icon-assets.mjs`
- Modify: `assets/images/levels/league-v6-icons/manifest.json`

- [ ] **Step 1: Add a failing manifest contract for the approved symbolic progression**

Extend `tests/league_icon_assets.test.ts` so the manifest must declare exactly twelve ordered entries and the approved integrated sigils:

```ts
const EXPECTED_SIGILS = [
  'open-book',
  'quill-scroll',
  'owl-mask',
  'knowledge-compass',
  'astrolabe',
  'knowledge-tree',
  'celestial-map',
  'alchemical-flame',
  'crystalline-eye',
  'eclipse-archive',
  'mind-constellation',
  'eternal-library-light',
] as const;

expect(manifest.version).toBe('league-knowledge-relics-v1');
expect(manifest.entries.map((entry) => entry.sigil)).toEqual(EXPECTED_SIGILS);
expect(manifest.designRules).toEqual(expect.arrayContaining([
  expect.stringMatching(/volumetric 3D hexahedron/i),
  expect.stringMatching(/integrated symbolic relief/i),
]));
```

Also retain the current checks for 384×384 output, alpha, transparent padding, static `require()` wiring, and absence of atlas side columns.

- [ ] **Step 2: Run the focused test and confirm the new assertion fails**

Run:

```powershell
$env:CLAUDE_SESSION_ID='codex-arena-league-cinematics'
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh acquire 'jest league icon asset contract'
npx jest tests/league_icon_assets.test.ts --runInBand
& 'C:\Program Files\Git\bin\bash.exe' .claude/semaphore/slot.sh release
```

Expected: FAIL because the existing manifest is the older icon family and has no approved sigil metadata.

- [ ] **Step 3: Update the extraction/publishing script for the knowledge-relic atlas**

In `scripts/build-league-icon-assets.mjs`:

- keep the exact existing twelve output filenames so `app/league_engine.ts` remains statically wired;
- update the ordered `LEAGUES` metadata with `sigil` and a short progression description;
- default the raw atlas path to `.codex-tmp/league-assets/knowledge-relics/league_knowledge_relics_atlas_v1.png`;
- preserve a 3-column by 4-row crop order matching the prompt;
- publish only final 384×384 alpha WebPs into `assets/images/levels/league-v6-icons/`;
- use WebP quality approximately 76 with alpha preserved;
- write manifest version `league-knowledge-relics-v1`, source hash, dimensions, file sizes, sigils, and explicit design rules;
- keep raw atlas, crops, and contact sheet outside the bundled asset directory.

- [ ] **Step 4: Run script syntax and test checks**

Run:

```powershell
node --check scripts/build-league-icon-assets.mjs
```

Expected: PASS. The Jest test may remain red until Task 2 publishes the new manifest and files.

- [ ] **Step 5: Commit the contract and processor**

```powershell
git add -- tests/league_icon_assets.test.ts scripts/build-league-icon-assets.mjs
git commit -m "test: define League knowledge relic asset contract"
```

Do not stage concurrent unrelated changes.

## Task 2: Generate and publish the twelve League knowledge relics

**Files:**
- Create outside bundle: `.codex-tmp/league-assets/knowledge-relics/league_knowledge_relics_atlas_v1.png`
- Replace: `assets/images/levels/league-v6-icons/*.webp`
- Replace: `assets/images/levels/league-v6-icons/manifest.json`
- Create outside bundle: `.codex-tmp/league-assets/knowledge-relics/contact-sheet.webp`

- [ ] **Step 1: Generate one ordered 3×4 transparent atlas with built-in image generation**

Use the `imagegen` skill and one built-in image-generation call, not project API credentials and not twelve in-thread calls. The prompt must specify:

```text
Create a production game-UI sprite atlas on a perfectly uniform removable chroma background, exactly 3 columns by 4 rows, twelve centered isolated volumetric 3D hexahedron knowledge relics, no text, no labels, no loose objects, no scenery, no frames between cells. Every symbol is an engraved/inlaid emblem fused into the front face of the same premium relic family. Progression grows more powerful, intricate, radiant, and arcane from cell 1 to 12 while silhouettes remain readable at 84 px. Ordered left-to-right, top-to-bottom: copper/open-book sigil; bronze/quill-and-scroll sigil; silver/geometric owl-mask sigil; gold/knowledge-compass glyph; platinum/astrolabe glyph; emerald/knowledge-tree rune; sapphire/celestial-map glyph; ruby/alchemical-flame rune; diamond/crystalline-eye sigil; black-diamond/eclipse-and-secret-archive seal; ether/constellation-of-mind rune; supreme/eternal-light-and-infinite-library seal. Premium fantasy learning-game style matching Phraseman, sharp beveled hexahedral crystals, controlled glow, transparent-ready edges, consistent camera and lighting, no photorealistic standalone books, owls, scrolls, trees, eyes, or libraries.
```

Save the raw result under `.codex-tmp/league-assets/knowledge-relics/`; never place the generation original in `assets/images/**`.

- [ ] **Step 2: Inspect the raw atlas before publishing**

Use local image inspection and confirm:

- all twelve cells are present in exact order;
- every motif reads as a symbol integrated into a hexahedron face;
- no cell contains a literal scene or detached object;
- later leagues visibly increase in material power and symbolic complexity;
- borders leave safe crop padding and there is no text.

If the atlas violates a required cell, regenerate the single atlas rather than adding speculative alternate files to the bundle.

- [ ] **Step 3: Extract, key, compress, and manifest the approved atlas**

Run:

```powershell
node scripts/codex-safe-run.mjs -- node scripts/build-league-icon-assets.mjs --source .codex-tmp/league-assets/knowledge-relics/league_knowledge_relics_atlas_v1.png
```

Expected: 12 final WebPs, 384×384, alpha preserved, manifest updated, raw/intermediate files outside the bundle.

- [ ] **Step 4: Inspect the contact sheet and representative transparent outputs**

Inspect the contact sheet plus Copper, Emerald, Black Diamond, and Supreme outputs against the approved progression. Confirm edge transparency and legibility at approximate 84 px.

- [ ] **Step 5: Run the focused asset gates**

Run under one heavy-process semaphore slot:

```powershell
npx jest tests/league_icon_assets.test.ts tests/league_current_icon_content_alignment.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit only the twelve wired finals and manifest**

```powershell
git add -- assets/images/levels/league-v6-icons/league-icon-med.webp assets/images/levels/league-v6-icons/league-icon-bronz.webp assets/images/levels/league-v6-icons/league-icon-serebro.webp assets/images/levels/league-v6-icons/league-icon-zoloto.webp assets/images/levels/league-v6-icons/league-icon-platina.webp assets/images/levels/league-v6-icons/league-icon-izumrud.webp assets/images/levels/league-v6-icons/league-icon-sapfir.webp assets/images/levels/league-v6-icons/league-icon-rubin.webp assets/images/levels/league-v6-icons/league-icon-almaz.webp assets/images/levels/league-v6-icons/league-icon-cherniy-almaz.webp assets/images/levels/league-v6-icons/league-icon-efir.webp assets/images/levels/league-v6-icons/league-icon-vishaya.webp assets/images/levels/league-v6-icons/manifest.json
git commit -m "feat: rebuild League icons as knowledge relics"
```

## Task 3: Add the League-screen-only ambient relic

**Files:**
- Create: `components/league/LeagueAmbientRelic.tsx`
- Create: `tests/league_ambient_relic.test.ts`
- Modify: `app/club_screen.tsx`

- [ ] **Step 1: Write failing component and integration contracts**

Create `tests/league_ambient_relic.test.ts` to assert:

- the component is `pointerEvents="none"` and inaccessible to screen readers;
- opacity is constrained to the approved 0.06–0.08 range;
- motion is transform-only and uses Reanimated UI-thread timing;
- active motion is slow `translateY` around 8 px plus scale `1 → 1.015 → 1` with no rotation;
- reduced-motion and inactive states cancel/reset the loop;
- `app/club_screen.tsx` renders the ambient component with `myLeague.imageUri`, `runtimeActive`, and `reduceMotion`;
- no Arena screen imports the component.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run under the semaphore:

```powershell
npx jest tests/league_ambient_relic.test.ts --runInBand
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the isolated ambient component**

Create `components/league/LeagueAmbientRelic.tsx` with a narrow interface:

```ts
type LeagueAmbientRelicProps = {
  source: ImageSourcePropType;
  active: boolean;
  reduceMotion: boolean;
  viewportWidth: number;
};
```

Implementation requirements:

- an absolute, centered layer behind interactive content;
- image width 115–125% of viewport width, `contentFit="contain"`;
- fixed low opacity around `0.07`;
- `withRepeat(withSequence(...))` on UI-thread transform values only;
- slow translate/scale cycle, no rotation, no blur, no JS timer;
- cancel and restore neutral transform when inactive or reduced motion is enabled;
- `pointerEvents="none"`, `accessible={false}`.

- [ ] **Step 4: Wire it only into the League screen**

In `app/club_screen.tsx`, render `LeagueAmbientRelic` in the screen background layer below the FlashList/content cards and above the existing base artwork. Pass the current League image, `runtimeActive`, `reduceMotion`, and current window width. Keep the existing 84 px foreground League icon unchanged.

Do not touch league refresh intervals, cache TTL, promotion/demotion logic, or any other screen.

- [ ] **Step 5: Run focused tests and inspect the League screen**

Run:

```powershell
npx jest tests/league_ambient_relic.test.ts tests/league_current_icon_content_alignment.test.ts tests/league_icon_assets.test.ts --runInBand
```

Open the League screen and verify the large relic remains a quiet backdrop rather than competing with standings, progress, or controls.

- [ ] **Step 6: Commit the ambient layer**

```powershell
git add -- components/league/LeagueAmbientRelic.tsx app/club_screen.tsx tests/league_ambient_relic.test.ts
git commit -m "feat: add ambient League relic backdrop"
```

## Task 4: Add the Arena back action and rank navigation context

**Files:**
- Modify: `components/arena/ArenaHubSurface.tsx`
- Modify: `components/arena/arena_rank_shield_assets.ts`
- Modify: `tests/arena_entry_prefetch.test.ts`
- Modify: `tests/arena_hub_surface_contract.test.ts`
- Create: `tests/arena_rank_navigation_contract.test.ts`

- [ ] **Step 1: Write failing navigation and asset-helper tests**

Assert that:

- Arena hub uses the standard `ArenaScreen` back affordance;
- back performs `router.replace('/(tabs)/home')`;
- ranked matchmaking navigation includes the already-loaded `viewerStars` string;
- quick matchmaking remains compatible and does not require rank context;
- a pure helper converts rank index 0–23 to the existing static shield asset without dynamic `require()`;
- unknown viewer rank is represented as `null`, not fabricated as Bronze III.

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run under the semaphore:

```powershell
npx jest tests/arena_entry_prefetch.test.ts tests/arena_hub_surface_contract.test.ts tests/arena_rank_navigation_contract.test.ts --runInBand
```

Expected: FAIL on missing back action, navigation parameter, and helper.

- [ ] **Step 3: Add a rank-index asset helper**

In `components/arena/arena_rank_shield_assets.ts`, add a bounded helper such as:

```ts
export function arenaRankShieldAssetForRankIndex(rankIndex: number): ImageSourcePropType | null
```

Clamp/validate finite integer indices to the 0–23 Arena ladder and resolve via the existing static tier/division map. Invalid/unknown input returns `null`.

- [ ] **Step 4: Wire back navigation and viewer stars from the hub**

In `ArenaHubSurface.tsx`:

- enable the existing standard back button;
- use `router.replace('/(tabs)/home' as never)`;
- add `viewerStars: String(home.profile.rating)` only to ranked matchmaking params when the value is finite;
- preserve quick mode, active-queue resume, token consumption, queue cancellation, and prefetch behavior.

- [ ] **Step 5: Run focused tests**

Expected: all Task 4 tests PASS.

- [ ] **Step 6: Commit the navigation model**

```powershell
git add -- components/arena/ArenaHubSurface.tsx components/arena/arena_rank_shield_assets.ts tests/arena_entry_prefetch.test.ts tests/arena_hub_surface_contract.test.ts tests/arena_rank_navigation_contract.test.ts
git commit -m "feat: carry Arena rank into matchmaking"
```

## Task 5: Build the lightweight ranked matchmaking scene

**Files:**
- Create: `components/arena/ArenaRankMatchmakingScene.tsx`
- Create: `tests/arena_rank_matchmaking_scene.test.ts`
- Modify: `app/arena_matchmaking.tsx`
- Modify: `tests/arena_v2_client_source_contract.test.ts`

- [ ] **Step 1: Write failing scene contracts**

Test that the scene:

- receives nullable viewer stars rather than fetching profile data;
- renders the exact viewer shield on the upper left when known;
- derives the opponent reel only from eligible same/±1 rank indices, clamped to 0–23;
- uses a smooth entrance and levitation for the viewer shield;
- uses a quick vertical transform reel on the right;
- uses no `setInterval`, `setTimeout`, layout animation, blur, or per-frame JS callback;
- stops/reset motion when inactive or reduced motion is enabled;
- provides a quiet neutral placeholder if rank context is missing.

Add an app contract that quick mode continues to render `ArenaSearchPulse`, while ranked mode renders the new scene.

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run under the semaphore:

```powershell
npx jest tests/arena_rank_matchmaking_scene.test.ts tests/arena_v2_client_source_contract.test.ts --runInBand
```

Expected: FAIL because the ranked scene is absent.

- [ ] **Step 3: Implement the matchmaking scene**

Create `ArenaRankMatchmakingScene.tsx` with:

```ts
type ArenaRankMatchmakingSceneProps = {
  viewerStars: number | null;
  active: boolean;
  reduceMotion: boolean;
};
```

Use pure exported helpers for the viewer rank index and eligible reel indices so tests can validate the same/±1 rule. Use Reanimated shared values and `withRepeat`/`withSequence` for transform and opacity only. Keep all assets static through `arena_rank_shield_assets.ts`.

- [ ] **Step 4: Render it for ranked search only**

In `app/arena_matchmaking.tsx`:

- parse optional `viewerStars` from route params;
- leave quick search's existing pulse unchanged;
- render `ArenaRankMatchmakingScene` only for ranked mode;
- pass screen activity and reduced-motion state;
- preserve search copy, elapsed time, cancel button, heartbeat, queue subscription, sound loop, and matchmaking APIs;
- pass `viewerStars` forward to `/arena_match` when known.

- [ ] **Step 5: Run focused tests and visually inspect both modes**

Expected: ranked shows left exact shield plus right eligible reel; quick remains the current pulse; client source contract still sees only its two existing functional intervals.

- [ ] **Step 6: Commit the matchmaking scene**

```powershell
git add -- components/arena/ArenaRankMatchmakingScene.tsx app/arena_matchmaking.tsx tests/arena_rank_matchmaking_scene.test.ts tests/arena_v2_client_source_contract.test.ts
git commit -m "feat: animate ranks during ranked matchmaking"
```

## Task 6: Replace versus avatars with colliding rank shields

**Files:**
- Modify: `components/arena/ArenaVersusIntro.tsx`
- Modify: `app/arena_match.tsx`
- Modify: `tests/arena_match_view.test.ts`
- Create: `tests/arena_rank_versus_intro.test.ts`

- [ ] **Step 1: Write failing versus contracts**

Assert that:

- `ArenaVersusIntro` receives nullable explicit viewer/opponent rank indices;
- the collision scene renders two rank shield assets and no avatar images;
- names, versus mark, countdown, haptics, sounds, and completion timing remain present;
- gameplay still renders the existing `ArenaPlayers` avatar/name/score HUD after the intro;
- opponent rank comes from the prepared match plan;
- viewer rank comes from passed viewer stars without any network request;
- missing rank data uses a neutral non-rank placeholder rather than a fake lowest rank.

- [ ] **Step 2: Run the focused tests and confirm they fail**

Run under the semaphore:

```powershell
npx jest tests/arena_rank_versus_intro.test.ts tests/arena_match_view.test.ts --runInBand
```

Expected: FAIL because the intro still collides avatars.

- [ ] **Step 3: Replace only the intro collision artwork**

In `ArenaVersusIntro.tsx`:

- retain the current shared-value motion timeline, countdown, haptics, and audio;
- replace left/right `AvatarView` instances with statically resolved rank shield images;
- keep player names and accessibility labels;
- use the same neutral placeholder for unknown rank metadata;
- animate transforms/opacity only, with no JS-frame work.

- [ ] **Step 4: Pass rank context from the match route**

In `app/arena_match.tsx`:

- parse optional `viewerStars`;
- derive nullable viewer rank index with the Arena rank engine;
- pass `plan.opponent.rank` as the authoritative opponent rank index;
- leave `ArenaPlayers` and all gameplay avatar/name/score behavior untouched.

The server already constrains ranked humans to ±1 and creates ranked bots at the viewer's exact rank, so do not modify Arena backend matching or competitive outcomes.

- [ ] **Step 5: Run focused tests and inspect intro-to-game transition**

Expected: shields collide during intro; once countdown completes, the normal two-avatar scoreboard appears unchanged.

- [ ] **Step 6: Commit the versus intro**

```powershell
git add -- components/arena/ArenaVersusIntro.tsx app/arena_match.tsx tests/arena_rank_versus_intro.test.ts tests/arena_match_view.test.ts
git commit -m "feat: collide rank shields in Arena versus intro"
```

## Task 7: Verify integrated behavior and preserve owner boundaries

**Files:**
- Modify only if a focused failure identifies an in-scope defect.

- [ ] **Step 1: Run formatting/static source checks**

Run:

```powershell
git diff --check
rg -n "setInterval|setTimeout|rotate" components/arena/ArenaRankMatchmakingScene.tsx components/league/LeagueAmbientRelic.tsx
rg -n "LeagueAmbientRelic" app components modules
```

Expected: no whitespace errors; no timer/rotation usage in the new motion components; ambient relic imported only by the League screen.

- [ ] **Step 2: Run the focused Arena and League integration suites**

Acquire one semaphore slot, then run serially:

```powershell
npx jest tests/arena_rank_navigation_contract.test.ts tests/arena_rank_matchmaking_scene.test.ts tests/arena_rank_versus_intro.test.ts tests/arena_entry_prefetch.test.ts tests/arena_hub_surface_contract.test.ts tests/arena_match_view.test.ts tests/arena_v2_client_source_contract.test.ts tests/arena_owner_requested_ui_contract.test.ts tests/league_icon_assets.test.ts tests/league_current_icon_content_alignment.test.ts tests/league_ambient_relic.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 3: Run the established Arena gate and narrow League gates**

Use the existing project Arena gate command if documented in `package.json`; otherwise run the established Arena test glob serially. Include only narrow League UI/asset tests, not the whole repository. Keep the semaphore slot for the full heavy-test duration and release it immediately afterward.

Expected: all Arena client suites pass; no League demotion/cache guard changes.

- [ ] **Step 4: Run focused TypeScript validation where available**

Prefer targeted project scripts or file-scoped lint/type checks. If only full `tsc --noEmit` is available and needed, acquire a semaphore slot before running it and release it afterward.

- [ ] **Step 5: Perform final visual acceptance in the local app**

Verify:

- Arena hub has the standard back button and returns to Home;
- Arena hero remains large, containerless, and levitating;
- ranked search shows exact left rank and lightweight eligible right reel;
- quick search retains its current pulse;
- versus intro collides rank shields, then gameplay shows unchanged avatars/names/scores;
- all twelve League foreground relics use integrated symbols and escalate visually;
- only the League screen shows the giant 6–8% ambient current relic, with no clutter;
- reduced-motion behavior is static and readable.

- [ ] **Step 6: Review exact diff and commit any final in-scope fixes**

Use `git status --short`, `git diff --stat`, and path-scoped diffs. Never stage unrelated concurrent work. If no fix is needed, make no empty commit.

- [ ] **Step 7: Report completion with evidence**

Report the implementation outcome, generated asset family, focused/full test results, and any verification limitation. Do not claim visual or test success without current evidence.
