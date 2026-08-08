# Wider Gift Certificate Shimmer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Widen the desktop gift certificate preview and add a clipped diagonal surface highlight that periodically travels across all three plan designs.

**Architecture:** Keep the change CSS-only inside the existing gift page. A page-local wrapper/grid override supplies the width, while one `.cert::after` pseudo-element supplies the GPU-friendly shimmer; existing content is raised above the effect and reduced-motion users receive no animation.

**Tech Stack:** Static HTML/CSS, Jest contract tests, Playwright visual verification, Firebase Hosting.

---

### Task 1: Wider responsive certificate and shimmer

**Files:**
- Modify: `tests/gift_certificate_assets_contract.test.ts`
- Modify: `knowly-www/gift/index.html`

- [ ] **Step 1: Write the failing contract**

Require these exact design hooks in the gift page:

```ts
expect(giftPage).toContain('.stage > .wrap { max-width: 1160px; }');
expect(giftPage).toContain('grid-template-columns: minmax(0, .96fr) minmax(0, 1.04fr)');
expect(giftPage).toContain('.cert::after');
expect(giftPage).toContain('@keyframes cert-shimmer-pass');
expect(giftPage).toContain('animation: cert-shimmer-pass 6s');
expect(giftPage).toContain('.cert[data-plan="lifetime"] {');
expect(giftPage).toContain('--cert-shimmer:');
expect(giftPage).toContain('@media (prefers-reduced-motion: reduce)');
expect(giftPage).toContain('.cert::after { animation: none; opacity: 0; }');
```

- [ ] **Step 2: Run the contract and verify RED**

Run: `npx jest tests/gift_certificate_assets_contract.test.ts --runInBand`

Expected: FAIL because the wider grid and shimmer CSS are absent.

- [ ] **Step 3: Add the minimal CSS implementation**

Add a 1160px page-local wrapper, `minmax(0, .96fr) minmax(0, 1.04fr)` desktop grid, shimmer color variables, a clipped diagonal `.cert::after` layer animated only with `transform` and `opacity`, content stacking at `z-index: 2`, and a reduced-motion opt-out. Preserve the 860px one-column breakpoint.

- [ ] **Step 4: Run the contract and verify GREEN**

Run: `npx jest tests/gift_certificate_assets_contract.test.ts tests/gift_certificate_catchphrases_contract.test.ts --runInBand`

Expected: both suites pass.

- [ ] **Step 5: Verify real responsive geometry**

Open the page at 375px, 1024px, 1440px, and 1668px. At every viewport assert `document.documentElement.scrollWidth <= window.innerWidth`; on desktop confirm the certificate is wider than its previous approximately 470px width, and capture all three plan variants.

- [ ] **Step 6: Commit and publish**

Stage only the plan, gift page, and focused contract. Commit as `feat(gift): widen certificate and add shimmer`, deploy `hosting:knowlywww`, then verify the live page returns the new CSS hooks.
