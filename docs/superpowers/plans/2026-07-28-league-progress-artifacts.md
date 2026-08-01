# League Progress Artifacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 12 distinctive premium league icons in the new Daily Challenge art style and remove the unused league-card asset system.

**Architecture:** Keep the existing static league icon filenames and `require()` mappings so no screen behavior changes. Generate approved raster artwork through built-in DALL·E, remove a flat chroma-key background locally, normalize to the guarded 384×384 transparent WebP contract, then run the focused asset test.

**Tech Stack:** React Native/Expo static assets, TypeScript/Jest, Sharp, built-in DALL·E image generation.

---

### Task 1: Remove unused league background cards

**Files:**
- Modify: `app/league_engine.ts`
- Modify: `app.json`
- Modify: `scripts/compress-bundled-assets.mjs`
- Modify: `tests/league_icon_assets.test.ts`
- Delete: `assets/images/levels/league-v6-cards/`

- [x] **Step 1: Change the focused contract to reject dead card wiring**

```ts
expect(source).not.toContain('cardImageUri');
expect(patterns).not.toContain('assets/images/levels/league-v6-cards/*.webp');
```

- [x] **Step 2: Remove `cardImageUri` from `ClubDef`, all 12 league definitions, and the exported `LEAGUES` projection**

```ts
ionIcon: c.ionIcon,
imageUri: c.imageUri,
color: c.color,
frameId: c.frameId,
```

- [x] **Step 3: Remove the card OTA pattern, compressor special-case, and 13 tracked card files**

Expected: `rg "cardImageUri|league-v6-cards" app components constants app.json` returns no matches.

- [ ] **Step 4: Run the focused contract**

Run: `npx jest tests/league_icon_assets.test.ts --runInBand`
Expected: PASS.

### Task 2: Generate and approve the visual anchors

**Files:**
- Create temporarily: `.codex-tmp/league-progress-artifacts/copper-source.png`
- Create temporarily: `.codex-tmp/league-progress-artifacts/supreme-source.png`
- Create temporarily: `.codex-tmp/league-progress-artifacts/copper-preview.png`
- Create temporarily: `.codex-tmp/league-progress-artifacts/supreme-preview.png`

- [ ] **Step 1: Generate Copper through built-in DALL·E**

Use a centered initiator's winged helmet in hammered copper with a restrained teal patina, premium gold filigree, strong small-size silhouette, and perfectly flat magenta chroma-key background.

- [ ] **Step 2: Generate Supreme through built-in DALL·E**

Use a luminous gold victory cup with white-gold laurel and multigem crown, matching Copper's camera, light, scale, and ornament density, on a perfectly flat green chroma-key background.

- [ ] **Step 3: Show both source outputs in the Codex chat**

Expected: owner approves the family style and visible progression before the other ten generations.

### Task 3: Generate the remaining ten league artifacts safely

**Files:**
- Create temporarily: `.codex-tmp/league-progress-artifacts/*-source.png`

- [ ] **Step 1: Generate two high-resolution five-artifact source sheets**

Generate sheet A with Bronze torch, Silver compass, Gold hammer, Platinum orbital sphere, and Emerald codex. Generate sheet B with Sapphire crown, Ruby phoenix flame, Diamond owl, Black Diamond portal, and Ether ascension crystal. Reuse the approved camera, lighting, bevel quality, padding, and material language; do not reuse a primary silhouette. The two-sheet workflow limits large in-thread image payloads while preserving enough source resolution for 384×384 production crops.

- [ ] **Step 2: Show both source sheets in the Codex chat**

Expected: every icon is visually distinct without labels and clearly belongs to the same premium Daily Challenge family.

### Task 4: Normalize and wire the approved icon set

**Files:**
- Replace: `assets/images/levels/league-v6-icons/league-icon-med.webp`
- Replace: `assets/images/levels/league-v6-icons/league-icon-bronz.webp`
- Replace: `assets/images/levels/league-v6-icons/league-icon-serebro.webp`
- Replace: `assets/images/levels/league-v6-icons/league-icon-zoloto.webp`
- Replace: `assets/images/levels/league-v6-icons/league-icon-platina.webp`
- Replace: `assets/images/levels/league-v6-icons/league-icon-izumrud.webp`
- Replace: `assets/images/levels/league-v6-icons/league-icon-sapfir.webp`
- Replace: `assets/images/levels/league-v6-icons/league-icon-rubin.webp`
- Replace: `assets/images/levels/league-v6-icons/league-icon-almaz.webp`
- Replace: `assets/images/levels/league-v6-icons/league-icon-cherniy-almaz.webp`
- Replace: `assets/images/levels/league-v6-icons/league-icon-efir.webp`
- Replace: `assets/images/levels/league-v6-icons/league-icon-vishaya.webp`

- [ ] **Step 1: Remove each flat chroma-key background with soft matte and despill**

Run per source:

```powershell
python C:\Users\badlo\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py --input <source.png> --out <cutout.png> --auto-key border --soft-matte --transparent-threshold 12 --opaque-threshold 220 --despill
```

Expected: transparent cutout with no colored border residue.

- [ ] **Step 2: Normalize approved cutouts to guarded production assets**

Use Sharp to trim, contain within a 320×320 safe content area, center on a transparent 384×384 canvas, and encode WebP at quality 76 with alpha preserved.

- [ ] **Step 3: Replace only the 12 already-wired filenames**

Expected: no new production asset path or source mapping is added.

### Task 5: Verify production readiness

**Files:**
- Test: `tests/league_icon_assets.test.ts`

- [ ] **Step 1: Run the focused league asset contract**

Run: `npx jest tests/league_icon_assets.test.ts --runInBand`
Expected: PASS with 384×384 WebP, alpha, padding, and artifact checks for all 12 icons.

- [ ] **Step 2: Search for removed card references and unintended league assets**

Run: `rg -n "cardImageUri|league-v6-cards|league-card-" app components constants tests scripts app.json`
Expected: no runtime or packaging references; only intentionally retained historical documentation is allowed.

- [ ] **Step 3: Review the final 12-icon contact sheet at small size**

Expected: all silhouettes remain recognizable at 64–84 px, rank progression is obvious, and no icon contains text, watermark, background residue, or accidental letters.

- [ ] **Step 4: Commit the completed asset change**

```powershell
git add app/league_engine.ts app.json scripts/compress-bundled-assets.mjs tests/league_icon_assets.test.ts assets/images/levels/league-v6-icons assets/images/levels/league-v6-cards
git commit -m "feat: refresh league progression icons"
```
