# Achievement Statuette Art Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the rejected object-based and photorealistic character art with 70 unique owner-approved award sculptures across three archetypes—heraldic, allegorical, and champion—then prove the catalog, files, and UI map match 70↔70.

**Architecture:** `content/achievement-art-v2/manifest.json` remains the source of truth for concept, approved archetype, value tier, unique material palette, shape language, pedestal profile, and delivery state. `scripts/guard_achievement_art_manifest_v2.mjs` rejects rows that are not visibly inanimate award sculptures, collapse the museum-diversity contract, or connect without a static image slot. Built-in image generation produces one raw source at a time using the three saved approval previews; the project extractor creates normalized 1024×1024 alpha WebP files consumed by `constants/achievementImageAssets.ts`.

**Tech Stack:** React Native static image requires, JSON manifest, Node.js, TypeScript transpilation, Sharp, built-in Codex image generation.

**Execution constraint:** Use inline execution in the current checkout. The project forbids an unrequested worktree or delegated coding session. Run only narrow guards and image metadata checks because the owner's computer is unstable under heavy load. Do not create commits unless the owner explicitly requests one.

---

### Task 1: Enforce the Owner-Approved Three-Archetype Contract

**Files:**
- Modify: `content/achievement-art-v2/manifest.json`
- Modify: `scripts/guard_achievement_art_manifest_v2.mjs`
- Test: `scripts/guard_achievement_art_manifest_v2.mjs`

- [ ] **Step 1: Mark every current connected asset except `legend_second_wind` as pending**

The manifest must report one accepted reference and 69 pending assets. Do not delete or move binary files yet; replacements will overwrite their stable paths after backup.

- [ ] **Step 2: Replace the object contract with the statuette contract**

Add these required contract values:

```json
{
  "form": "inanimate award statuette on a complete visible pedestal",
  "referenceFamily": "heraldic sculpture, allegorical human statuette, monumental champion trophy",
  "readOrder": "award statuette first, individual achievement symbolism second"
}
```

Each asset row must contain one `archetype` from `heraldic`, `allegorical`, or `champion`, one `valueTier` from `early`, `mid`, `high`, or `legendary`, plus non-empty unique `sculpture`, `gesture`, `materialPalette`, `shapeLanguage`, and `pedestalProfile` values. The only accepted form is a visibly inanimate designed sculpture physically integrated with its pedestal.

- [ ] **Step 3: Extend the guard**

The guard must fail when a row lacks `archetype`, `valueTier`, `sculpture`, `gesture`, `materialPalette`, `shapeLanguage`, or `pedestalProfile`; when the archetype or tier is unknown; when material palettes, shape languages, or pedestal profiles repeat; when the eight approved form families are not represented; when a row uses `form !== "statuette"`; when `legend_second_wind` is not connected; or when any other row is connected before its static file and require slot exist.

- [ ] **Step 4: Run the narrow guard**

Run:

```powershell
node scripts/guard_achievement_art_manifest_v2.mjs
```

Expected:

```text
[achievement-art-v2] PASS: 70 unique statuette concepts, 1 connected, 69 pending
```

### Task 2: Rewrite the 70 Concepts as Designed Award Sculptures

**Files:**
- Modify: `content/achievement-art-v2/manifest.json`
- Test: `scripts/guard_achievement_art_manifest_v2.mjs`

- [ ] **Step 1: Assign a unique sculpture and ceremonial gesture to every row**

Use these exact series boundaries:

- Streak: heraldic endurance sculptures with rigid commemorative gestures.
- XP: mostly faceless allegorical makers, scholars, navigators, and engineers whose complexity rises with threshold.
- League: monumental champion trophies with distinct crown, mane, armor, wing, shield, or cup silhouettes.
- Historical balance: vault, fortune, and stewardship guardians; no currency pile.
- Foreground time: contemplative timekeepers and watchful guardians; a clock may be an attribute but never the whole subject.
- Paid access: patron and founder statuettes.
- Secret legends: narrative sculptures drawn from all three archetypes, with the Phoenix remaining unchanged.

- [ ] **Step 2: Give every row a pedestal design**

Pedestals must be integrated, complete, and unique in profile or surface construction. They may share the Phoenix material family but may not be copied and recolored.

- [ ] **Step 3: Reject ordinary-object subjects**

Search:

```powershell
rg -n 'wind-up key|metronome|alarm bell|odometer|spark plug|dynamo|flywheel|counterweight|power cell|archive reel' content/achievement-art-v2/manifest.json
```

Expected: no active `sculpture` value is one of these ordinary objects. Such concepts may appear only as integrated attributes or pedestal ornament.

- [ ] **Step 4: Run the manifest guard**

Expected: 70 unique statuette concepts, one connected reference, 69 pending.

### Task 3: Produce the First Corrected Proof Trio

**Files:**
- Backup: `.codex-tmp/achievement-art-v2-object-rejected-2026-08-21/`
- Modify: `assets/images/achievements/streak_3.webp`
- Modify: `assets/images/achievements/xp_100.webp`
- Modify: `assets/images/achievements/league_champion.webp`
- Modify: `constants/achievementImageAssets.ts`
- Modify: `content/achievement-art-v2/manifest.json`

- [ ] **Step 1: Back up the rejected WebP files**

Copy `streak_3.webp`, `xp_100.webp`, and any existing `league_champion.webp` into the explicit backup directory before overwriting.

- [ ] **Step 2: Generate `streak_3` as a statuette**

Use the owner-approved heraldic-swallow preview as the geometry/style reference. Generate an unmistakably inanimate blackened-bronze and copper swallow award whose clean V wings and body flow into a complete volcanic-stone pedestal.

- [ ] **Step 3: Generate `xp_100` as a statuette**

Use the owner-approved allegorical-smith preview as the geometry/style reference. Generate a faceless graphite-and-ivory knowledge-smith award raising a restrained blue crystal finial; robe and arms must flow into a complete workshop-stone pedestal.

- [ ] **Step 4: Generate `league_champion` as the monumental archetype**

Use the owner-approved champion-lion preview as the direct style reference. Generate a rigid heraldic lion with a carved mask, broad geometric mane, integrated abstract cup, and complete black-onyx champion pedestal.

- [ ] **Step 5: Extract and normalize each asset**

Run `scripts/extract_generated_chroma_alpha.mjs` with `--normalize-framing true`; use `--neutralize-green-glass true` when translucent material refracts the chroma matte.

- [ ] **Step 6: Visually inspect all three WebP files**

Reject any result without a complete base, visibly inanimate award construction, approved clean-plane stylization, trophy silhouette, or clean alpha edges. Reject lifelike eyes, fur, skin, expressive mascot faces, wildlife realism, and gritty photorealistic microtexture.

- [ ] **Step 7: Connect only accepted results**

Set each row to `"form": "statuette"` and `"status": "connected"`; preserve its stable static require slot.

- [ ] **Step 8: Verify**

Run the manifest guard, foundation guard, TypeScript transpilation for the image map, Sharp metadata checks, and targeted `git diff --check`.

Expected: four connected statuettes (`legend_second_wind`, `streak_3`, `xp_100`, `league_champion`) and 66 pending.

### Task 4: Replace the Remaining Rejected Core Art

**Files:**
- Modify: `assets/images/achievements/{streak_7,streak_14,streak_30,streak_60,streak_100,streak_150,streak_200,xp_250,xp_500,xp_1000,xp_2500,xp_5000,xp_10000,xp_20000,legend_every_league}.webp`
- Modify: `content/achievement-art-v2/manifest.json`
- Modify: `constants/achievementImageAssets.ts`

- [ ] **Step 1: Work in batches of at most two distinct statuettes**

For every batch: back up, generate one call per asset, extract, inspect, connect, run narrow guards, then end the turn to keep Codex records and PC load bounded.

- [ ] **Step 2: Rework `legend_every_league`**

Replace the compass object with a navigator-champion statuette holding a compass shield on a complete league-stone pedestal.

- [ ] **Step 3: Finish the rejected-core audit**

Expected: all 17 previously rejected assets have statuette replacements and no object-only image remains connected.

### Task 5: Generate the Remaining Statuette Collection

**Files:**
- Modify: `assets/images/achievements/*.webp`
- Modify: `content/achievement-art-v2/manifest.json`
- Modify: `constants/achievementImageAssets.ts`

- [ ] **Step 1: Continue two-asset batches by progression order**

Finish streak and XP, then historical balance, league champions, foreground time, paid access, and secret legends.

- [ ] **Step 2: Enforce uniqueness before connecting**

Each new row must have unique `sculpture`, `gesture`, `materialPalette`, `shapeLanguage`, `pedestalProfile`, and output. Rounded, flowing, and slender soft forms must cover at least two thirds of the manifest; crystalline, architectural, mechanical, and massive angular construction is a minority exception. Before connecting a pair, compare both images against all connected images for material, silhouette, gesture, scale, base repetition, and boxy/faceted repetition. Template recolors and consecutive coarse polygon figures fail review. Every earlier connected image remains provisional and receives no exemption from the final diversity audit.

- [ ] **Step 3: Keep the bundle map exact**

Every final file under `assets/images/achievements/` must have one static require slot; do not generate alternates or raw sources into the bundled directory.

### Task 6: Final 70↔70 and Shelf Audit

**Files:**
- Verify: `app/achievement_catalog_v2.ts`
- Verify: `content/achievement-art-v2/manifest.json`
- Verify: `constants/achievementImageAssets.ts`
- Verify: `components/achievements/AchievementShelfCarousel.tsx`
- Verify: `app/achievements_screen.tsx`

- [ ] **Step 1: Run deterministic catalog and art guards**

Expected: 70 active catalog IDs, 70 connected statuette rows, zero pending.

- [ ] **Step 2: Inspect all WebP metadata**

Expected: exactly 70 active outputs, each 1024×1024 with alpha.

- [ ] **Step 3: Audit the contact sheet at shelf scale**

At 128 px every asset must read as a designed award with visible base; reject repeated sculptures, repeated gestures, living-character silhouettes, object-only silhouettes, text, glow, inconsistent scale, or an over-dominant coarse/angular template. Confirm that early, mid, high, and legendary value tiers are legible without labels and that the collection alternates rounded, flowing, slender, crystalline, architectural, mechanical, massive, and chased-metal forms.

- [ ] **Step 4: Re-run the lightweight UI contract checks**

Confirm the theme-adaptive shelf supplies lighting and that no generated asset paints a spotlight or shelf into the bitmap.

- [ ] **Step 5: Mark the goal complete only after every criterion passes**

Do not claim completion based on manifest status alone; visual statuette conformance and exact catalog/file/map evidence are required.
