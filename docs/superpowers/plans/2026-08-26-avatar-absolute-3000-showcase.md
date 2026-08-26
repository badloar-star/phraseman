# Avatar Absolute 3000 Showcase Implementation Plan

> **Execution note:** Run this plan inline and sequentially. Do not create a branch, worktree, delegated coding task, background worker, or heavy test process. Generate and process exactly one image at a time.

**Goal:** Add one showcase-only 3000-pearl avatar pair, ID 126 “Императорский астральный барс”, whose beauty, material finish, silhouette, and static presentation are visibly more prestigious than the 1000-pearl tier while preserving all production catalog and economy behavior.

**Architecture:** Keep `constants/custom_avatars.ts` unchanged. Append one local-only data record inside `showcase/index.html`, load its two files from `admin/v2/avatars/`, and extend the existing price ladder and prompt/audit tools to understand 3000. The two variants are separate image generations and pass the existing alpha/safe-zone validator before being copied into the showcase asset directory.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js ESM tests, `sharp`, built-in Codex image generation.

---

### Task 1: Lock the 3000 prompt and audit contracts

**Files:**
- Modify: `scripts/avatar-100/build-prompts.test.mjs`
- Modify: `scripts/avatar-100/build-prompts.mjs`
- Modify: `scripts/avatar-100/build-alpha-audit.mjs`

**Steps:**
1. Add a failing prompt test for price 3000 requiring “Absolute”, an imperial astral snow leopard with coherent feline anatomy, independent dark/light poses, and explicit bans on rainbow, horror, humanoids, machines, detached halos/rings, scenery, and cropping.
2. Run `node --test scripts/avatar-100/build-prompts.test.mjs` and confirm the unsupported-price failure.
3. Add the exact 3000 tier direction and include 3000 in the supported-price list.
4. Add audit tier `{ price: 3000, start: 126, end: 126 }`.
5. Re-run the focused prompt test.

### Task 2: Add a showcase-only eighth tier

**Files:**
- Modify: `tests/avatar_showcase_html_contract.test.ts`
- Modify: `showcase/index.html`

**Steps:**
1. Update the HTML contract assertions to require the unchanged hosted production collection plus one explicit showcase-only ID 126 entry and a local asset path for that entry.
2. Add price filter 3000, tier metadata “Абсолют”, counts 64 pairs / 128 images, eight-level copy, and the single `EXTRA_SHOWCASE_ENTRY` without modifying `constants/custom_avatars.ts`.
3. Resolve ID 126 image URLs from `../admin/v2/avatars/custom-idea-126`; retain the hosted Firebase base for the original 63 pairs.
4. Add a static full-width 3000 card treatment: near-black/pale-gold palette, double border, restrained corner markers, stronger type scale, and responsive single-column behavior. Use no animation, iridescence, or rainbow gradient.
5. Validate the document with a lightweight Node source-assertion command; do not start Jest or a full build.

### Task 3: Generate and validate ID 126 dark artwork

**Files:**
- Create: `.codex-tmp/avatar-absolute-3000/126/black/source/*`
- Create: `.codex-tmp/avatar-absolute-3000/126/black/final/custom-idea-126-black.webp`

**Steps:**
1. Generate one dark Imperial Astral Snow Leopard using coherent four-limbed feline anatomy and black-diamond/champagne-gold/cold-white material language.
2. Require a complete isolated silhouette with generous margin on all sides; reject any crop, missing limb, detached effect, text, scenery, humanoid feature, machinery, dragon default, or rainbow color.
3. Copy the generated source into the ignored checkpoint directory.
4. Run the existing one-image finalizer to produce a 512×512 alpha WebP.
5. Inspect the final visually and run the existing single-file validator. Regenerate if either inspection fails.

### Task 4: Generate and validate ID 126 light artwork

**Files:**
- Create: `.codex-tmp/avatar-absolute-3000/126/white/source/*`
- Create: `.codex-tmp/avatar-absolute-3000/126/white/final/custom-idea-126-white.webp`

**Steps:**
1. Generate the light variant only after the dark variant is complete.
2. Use a genuinely different pose and moonstone/platinum/champagne-gold/cold-white material language while preserving the same species identity and coherent feline anatomy.
3. Process, inspect, and validate it independently with the same safe-zone and artifact rules.

### Task 5: Promote the pair and run lightweight verification

**Files:**
- Create: `admin/v2/avatars/custom-idea-126-black.webp`
- Create: `admin/v2/avatars/custom-idea-126-white.webp`

**Steps:**
1. Validate both final files together as a pair before promotion.
2. Copy only the two validated compressed WebPs into `admin/v2/avatars/`.
3. Run the lightweight Node test group for prompt, alpha-audit, normalizer, and asset validation.
4. Verify with targeted source assertions that the showcase contains tier counts `10/10/10/10/10/10/3/1`, total 64, price 3000, ID 126, and no production catalog mutation.
5. Open or refresh `showcase/index.html` and visually confirm no horizontal overflow, no cropped artwork, and a clear visual jump from 1000 to 3000.

**Acceptance criteria:**
- Exactly one 3000-pearl showcase pair exists and is not wired into the production app/economy.
- Dark and light are separate generations, not negatives or recolors.
- Both files are 512×512 WebP with alpha, entirely within the safe zone, and free from pale-background extraction damage.
- The creature is a coherent four-limbed Imperial Astral Snow Leopard with no horror anatomy, robots, vehicles, humans, rainbow treatment, detached halos/rings, or generic dragon silhouette.
- The 3000 card is the most noticeable static section in the showcase and remains usable on narrow screens.
