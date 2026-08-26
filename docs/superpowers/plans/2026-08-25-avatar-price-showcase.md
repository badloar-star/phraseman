# Avatar Price Showcase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and open a standalone responsive HTML showroom for all 43 priced avatar pairs.

**Architecture:** A single self-contained HTML file loads the adjacent collection manifest, derives the 43 priced entries, and renders semantic tier sections and pair cards. A local static server exposes the HTML and relative WebP assets; no production application code or APIs are changed.

**Tech Stack:** HTML5, CSS, vanilla JavaScript, existing WebP avatar assets, local static HTTP server.

---

### Task 1: Build the standalone showroom

**Files:**
- Create: `.codex-tmp/avatar-20-one-by-one/independent/showcase/index.html`

- [ ] **Step 1: Create the semantic page shell**

Include a hero with collection statistics, a sticky filter navigation, a live result count, and a main region where tier sections are rendered.

```html
<header class="hero">...</header>
<nav class="filters" aria-label="Фильтр по цене">...</nav>
<main id="catalog" aria-live="polite"></main>
```

- [ ] **Step 2: Implement the premium responsive visual system**

Use CSS variables for tier accents, a dark high-contrast background, 44 px controls, visible `:focus-visible` rings, three/two/one-column breakpoints, and reduced-motion support.

```css
.tier-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:20px; }
@media (max-width:1100px){.tier-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
@media (max-width:720px){.tier-grid{grid-template-columns:1fr;}}
@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;transition:none!important;}}
```

- [ ] **Step 3: Load and render the priced entries**

Fetch `../collection-manifest.json`, filter entries with numeric prices, group them in the fixed order `50, 70, 100, 150, 300`, and render two independently labelled WebP images per card.

```js
const prices=[50,70,100,150,300];
const entries=manifest.entries.filter(entry=>prices.includes(entry.price));
const assetIndex=62+entry.number;
const base=`../avatar-${String(entry.number).padStart(2,'0')}/pairs`;
```

- [ ] **Step 4: Implement accessible filtering**

Each filter button sets `aria-pressed`, updates the visible tier sections and count, and preserves a complete `Все` state.

```js
button.addEventListener('click',()=>setFilter(button.dataset.price));
button.setAttribute('aria-pressed',String(selected));
```

### Task 2: Verify structure and assets

**Files:**
- Create: `.codex-tmp/avatar-20-one-by-one/independent/showcase/validate-showcase.mjs`

- [ ] **Step 1: Add deterministic validation**

The script must assert 43 priced entries, counts `10/10/10/10/3`, 86 existing WebP files, required accessibility markers, and forbidden production coupling.

- [ ] **Step 2: Run validation**

Run:

```powershell
node .codex-tmp/avatar-20-one-by-one/independent/showcase/validate-showcase.mjs
```

Expected: `pairs=43 images=86 missing=0 failures=0` and exit code 0.

### Task 3: Open and visually test the showroom

**Files:**
- No additional source files.

- [ ] **Step 1: Start a local static server**

Serve `.codex-tmp/avatar-20-one-by-one/independent` on an available localhost port and keep the process scoped to this showcase.

- [ ] **Step 2: Open the page in the browser**

Navigate to `/showcase/index.html`, confirm the hero and 43-pair count are visible, and test at least one price filter.

- [ ] **Step 3: Check responsive layouts and missing assets**

Inspect 1440 px and 375 px viewport widths, confirm no horizontal overflow, verify all 86 images load, and capture a screenshot.
