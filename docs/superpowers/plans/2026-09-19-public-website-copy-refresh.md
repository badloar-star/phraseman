# Public Website Copy Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the obsolete plan-building funnel and make every public Phraseman page clear, natural, localized, and consistent with the Phraseman Bible.

**Architecture:** `knowly-www/` is a static Firebase Hosting surface with standalone route HTML files and shared client-side localization. The retired funnel will be removed from the published tree while Firebase Hosting permanently redirects its former URLs to `/download/`. Copy changes remain local to page markup and `assets/site-i18n.locales.js`; no mobile-app, admin, payment, or legal policy semantics change.

**Tech Stack:** Static HTML, vanilla JavaScript, CSS, Firebase Hosting, Node.js contract checks.

---

### Task 1: Lock the retired route behavior

**Files:**
- Modify: `firebase.json`
- Modify: `knowly-www/sitemap.xml`
- Modify: `knowly-www/llms.txt`
- Modify: `knowly-www/legal/privacy/index.html`
- Delete: `knowly-www/start/index.html`
- Delete: `knowly-www/assets/start.js`

- [ ] **Step 1: Extend the website-surface contract with the retired-route requirements.**

  Add a check that `/start/` no longer exists in the public tree, that no public HTML links to it, that sitemap and LLM inventory do not mention the plan builder, and that the `knowlywww` Hosting config supplies a 301 redirect to `/download/`. Preserve `/start/thanks/`, because gift checkout uses it as its confirmation screen.

- [ ] **Step 2: Run the contract to demonstrate that the current site fails.**

  Run: `node scripts/verify_website_surface_contract.mjs --root knowly-www`

  Expected: FAIL until the obsolete files, links, inventory entries, and redirects are changed.

- [ ] **Step 3: Retire the funnel without creating a dead end.**

  Delete only the two funnel source files listed above. Add the explicit 301 redirect rule, remove `/start/` from sitemap and LLM inventory, and remove only the no-longer-true privacy-policy sentence about the site plan quiz. Preserve the gift-payment confirmation route and every unrelated legal statement.

- [ ] **Step 4: Run the contract again.**

  Run: `node scripts/verify_website_surface_contract.mjs --root knowly-www`

  Expected: `website_surface_contract_ok`.

### Task 2: Remove retired navigation from every public route

**Files:**
- Modify: `knowly-www/index.html`
- Modify: `knowly-www/app/index.html`
- Modify: `knowly-www/download/index.html`
- Modify: `knowly-www/english-level-test/index.html`
- Modify: `knowly-www/premium/index.html`
- Modify: `knowly-www/gift/index.html`
- Modify: `knowly-www/contact/index.html`
- Modify: `knowly-www/faq/index.html`
- Modify: `knowly-www/russia/index.html`
- Modify: `knowly-www/404.html`
- Modify: `knowly-www/404/index.html`
- Modify: `knowly-www/guides/index.html`
- Modify: `knowly-www/guides/english-15-minutes-a-day/index.html`
- Modify: `knowly-www/guides/english-by-phrases/index.html`
- Modify: `knowly-www/guides/english-phrases-for-travel/index.html`
- Modify: `knowly-www/guides/how-to-improve-english-pronunciation/index.html`
- Modify: `knowly-www/guides/how-to-learn-english/index.html`
- Modify: `knowly-www/guides/speaking-barrier/index.html`
- Modify: `knowly-www/legal/privacy/index.html`
- Modify: `knowly-www/legal/terms/index.html`
- Modify: `knowly-www/legal/data-deletion/index.html`
- Modify: `knowly-www/assets/site-i18n.locales.js`

- [ ] **Step 1: Remove the footer destination, not the surrounding navigation.**

  Remove the `/start/` anchor and its `approved.18` localization entry from every route’s shared footer. Keep the “Практиковаться” group and its remaining application, download, and level-test destinations in place.

- [ ] **Step 2: Make the localization registry match.**

  Remove `Подобрать план`, `Подобрать практику`, `Find your plan`, and `Find your practice` only where they describe the retired funnel. Preserve editorial uses of “план” in guide content.

- [ ] **Step 3: Prove no retired navigation remains.**

  Run: `rg -n --glob '*.html' --glob '*.js' 'href="/start/"|/start/thanks/|Подобрать практику|Find your practice' knowly-www`

  Expected: no matches outside an explicit redirect test fixture, if one is introduced.

### Task 3: Rewrite shared RU and EN copy to the Phraseman Bible

**Files:**
- Modify: `knowly-www/assets/site-i18n.locales.js`
- Modify: `knowly-www/index.html`
- Modify: `knowly-www/app/index.html`
- Modify: `knowly-www/download/index.html`
- Modify: `knowly-www/english-level-test/index.html`
- Modify: `knowly-www/premium/index.html`
- Modify: `knowly-www/gift/index.html`
- Modify: `knowly-www/contact/index.html`
- Modify: `knowly-www/faq/index.html`
- Modify: `knowly-www/russia/index.html`
- Modify: `knowly-www/404.html`
- Modify: `knowly-www/404/index.html`
- Modify: `knowly-www/guides/index.html`
- Modify: `knowly-www/guides/english-15-minutes-a-day/index.html`
- Modify: `knowly-www/guides/english-by-phrases/index.html`
- Modify: `knowly-www/guides/english-phrases-for-travel/index.html`
- Modify: `knowly-www/guides/how-to-improve-english-pronunciation/index.html`
- Modify: `knowly-www/guides/how-to-learn-english/index.html`
- Modify: `knowly-www/guides/speaking-barrier/index.html`

- [ ] **Step 1: Replace high-impact ambiguous Russian with concrete benefit-led copy.**

  Keep the existing visual rhythm, but make headings self-explanatory. Replace standalone poetic labels such as “Когда начинает получаться”, “Для чьей-то большой мечты”, and “Начинается с любопытства” with text that explains the relevant practice, test, gift, or guide benefit.

- [ ] **Step 2: Fix the known broken and non-native English strings.**

  Use `Gift access`, `Payment options in Russia`, and locale-specific 404 text. Standardize British English: `practise` is a verb and `practice` is a noun. Replace direct translations only when the English would not be written naturally by a native speaker.

- [ ] **Step 3: Make support, FAQ, and plan cards immediately clear.**

  Rewrite “БЕЗ НЕДОСКАЗАННОСТИ”, “ЧЕМ ПОМОЧЬ?”, and abstract premium/gift labels into short, warm statements with a clear next action. Keep pricing data, form fields, and purchase behavior intact.

- [ ] **Step 4: Run targeted language regressions.**

  Run: `rg -n --glob '*.html' --glob '*.js' 'Бывает\.\s*Let.s try again|Give access|Payment from Russia|Find your (plan|practice)|БЕЗ НЕДОСКАЗАННОСТИ' knowly-www`

  Expected: no matches.

### Task 4: Preserve interaction and accessibility semantics

**Files:**
- Modify: `knowly-www/guides/index.html`
- Modify: `knowly-www/assets/approved/site.js` (only if a semantic control change requires its selector to be updated)
- Modify: `scripts/verify_website_surface_contract.mjs`

- [ ] **Step 1: Inspect guide-category behavior.**

  If categories are mutually exclusive, use one selected tab/radio pattern with explicit `aria-selected` or `aria-checked`; if categories are independently combinable, retain checkboxes and expose that behavior in the label. Do not change filtering behavior merely to change markup.

- [ ] **Step 2: Add a light static contract for the preserved accessibility baseline.**

  Require a skip link, one main heading on core routes, and no link to the retired builder. Do not make visual details part of the contract.

- [ ] **Step 3: Run the public-surface contract.**

  Run: `npm run website:surface-contract`

  Expected: `website_surface_contract_ok`.

### Task 5: Final visual and release verification

**Files:**
- Verify: all modified `knowly-www/**` files and `firebase.json`

- [ ] **Step 1: Check the homepage, test, guides, gift, premium, contact, FAQ, Russia, download, and both 404 paths at desktop width.**

  Confirm readable hierarchy, no dead plan-builder links, and one clear primary action per page.

- [ ] **Step 2: Check the homepage, guide index, and contact page at 375px width.**

  Confirm no horizontal overflow, readable body text, visible focus style, and touch targets at least 44px.

- [ ] **Step 3: Verify redirects from the retired URLs.**

  Use the Firebase Hosting configuration as the release source of truth; confirm `/start/` resolves to `/download/` in the hosting preview or deployment review. Confirm gift checkout still targets its existing confirmation route.

- [ ] **Step 4: Commit only the website-refresh files.**

  Run: `git add firebase.json knowly-www scripts/verify_website_surface_contract.mjs docs/superpowers/specs/2026-09-19-public-website-copy-refresh-design.md docs/superpowers/plans/2026-09-19-public-website-copy-refresh.md`

  Run: `git commit -m "fix(site): refresh public copy and retire plan builder"`

  Expected: exactly the refresh files are committed; unrelated working-tree changes remain untouched.
