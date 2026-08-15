# Knowly Website English Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the entire public Knowly/Phraseman website in English by default, with a complete Russian alternative selected automatically for Russian browsers or explicitly by the visitor.

**Architecture:** Use one canonical set of `knowly-www/` routes. English is the source HTML and metadata. A small shared locale runtime resolves `?lang`, saved preference, and browser language, injects a single accessible EN/RU switcher, and applies the Russian static catalog before each page’s feature script initializes. Dynamic page modules obtain visible strings from the same locale service; URLs, endpoints, payload shapes, and analytics contracts remain unchanged.

**Tech Stack:** Static HTML/CSS/vanilla JavaScript, Firebase Hosting, Node.js built-in test runner, Jest static contracts, Playwright browser checks.

---

## File map

| File or group | Responsibility |
| --- | --- |
| `knowly-www/assets/site-i18n.js` | Locale precedence, storage safety, document metadata, Russian content application, shared selector, query preservation, and small public API for feature scripts. |
| `knowly-www/assets/site-i18n.locales.js` | Reviewed English/Russian page copy and metadata, keyed by stable public page identifiers. |
| `knowly-www/assets/site-i18n.css` | Reusable high-contrast, responsive, keyboard-accessible language selector. |
| `knowly-www/{index,404}.html`, `contact/`, `download/`, `gift/`, `premium/`, `russia/`, `start/`, `start/thanks/` | English canonical copy, localized markup keys, metadata, runtime assets, and a selector mount in the existing header. |
| `knowly-www/guides/**/*.html` | Complete English canonical guide articles with complete Russian catalog content, localized metadata, navigation, and footer links. |
| `knowly-www/legal/**/*.html` | English legal canonical content with a complete Russian alternative and correct language metadata. |
| `knowly-www/english-level-test/{index,app,i18n}.js` | Integrate the existing richer six-UI-locale assessment with the site selector without changing assessment language or API contracts. |
| `knowly-www/assets/{home,demo,gift-certificate-phrases,start}.js` | Replace display-copy literals and legacy counter fallbacks with locale lookups; reinitialize after a locale render. |
| `tests/website_i18n_contract.test.ts` | Static/rule-based coverage for every public route, catalog completeness, locale precedence, and forbidden legacy defaults. |
| `functions-english-test/client_counter_contract.test.js` | Preserve the verified honest `en: 243` counter behavior when the website language runtime is wired into the level-test route. |

## Task 1: Lock the public localization contract with failing tests

**Files:**
- Create: `tests/website_i18n_contract.test.ts`
- Modify: `tests/website_surface_routing_contract.test.ts`

- [ ] **Step 1: Write a failing route-coverage test**

```ts
test('every public content page declares the shared language runtime and a page id', () => {
  const routes = publicHtmlRoutes('knowly-www');
  for (const route of routes) {
    const html = read(route);
    expect(html).toContain('/assets/site-i18n.locales.js');
    expect(html).toContain('/assets/site-i18n.js');
    expect(html).toMatch(/data-i18n-page="[a-z0-9-]+"/);
  }
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run: `npx jest --runTestsByPath tests/website_i18n_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the runtime, catalog, and page declarations do not exist.

- [ ] **Step 3: Add the remaining contract cases**

```ts
test('the locale resolver honours query, saved preference, then ru browser preference', () => {
  const i18n = loadSiteI18n();
  expect(i18n.resolveLocale({ search: '?lang=en', stored: 'ru', languages: ['ru-RU'] })).toBe('en');
  expect(i18n.resolveLocale({ search: '', stored: 'ru', languages: ['en-GB'] })).toBe('ru');
  expect(i18n.resolveLocale({ search: '', stored: null, languages: ['ru-RU'] })).toBe('ru');
  expect(i18n.resolveLocale({ search: '', stored: null, languages: ['de-DE'] })).toBe('en');
});

test('all public pages have complete EN/RU metadata and copy catalogs', () => {
  const catalog = loadCatalog();
  for (const id of publicPageIds()) {
    expect(catalog.en[id]).toBeDefined();
    expect(catalog.ru[id]).toBeDefined();
    expect(leafKeys(catalog.ru[id]).sort()).toEqual(leafKeys(catalog.en[id]).sort());
  }
});
```

- [ ] **Step 4: Keep the existing surface test language-neutral**

Replace Russian literal assertions in `tests/website_surface_routing_contract.test.ts` with structural markers (the CTA element ID and its `data-i18n` key), retaining all approved responsive-layout assertions.

- [ ] **Step 5: Run the focused test and commit the RED test only**

Run: `npx jest --runTestsByPath tests/website_i18n_contract.test.ts tests/website_surface_routing_contract.test.ts --no-cache --runInBand`

Expected: FAIL only on missing localization implementation.

## Task 2: Build the shared locale runtime and accessible selector

**Files:**
- Create: `knowly-www/assets/site-i18n.js`
- Create: `knowly-www/assets/site-i18n.locales.js`
- Create: `knowly-www/assets/site-i18n.css`
- Test: `tests/website_i18n_contract.test.ts`

- [ ] **Step 1: Implement the minimal resolver and persistence API**

```js
const STORAGE_KEY = 'knowly_site_locale_v1';
const SUPPORTED = ['en', 'ru'];

function resolveLocale({ search, stored, languages }) {
  const query = new URLSearchParams(search || '').get('lang');
  if (SUPPORTED.includes(query)) return query;
  if (SUPPORTED.includes(stored)) return stored;
  return (languages || []).some((value) => String(value).toLowerCase().startsWith('ru')) ? 'ru' : 'en';
}

function setLocale(locale) {
  if (!SUPPORTED.includes(locale)) return;
  try { localStorage.setItem(STORAGE_KEY, locale); } catch (_) {}
  const url = new URL(location.href);
  url.searchParams.set('lang', locale);
  location.assign(url.toString());
}
```

- [ ] **Step 2: Apply catalog copy without interpreting user input as HTML**

Implement `applyPage(locale)` so `data-i18n` values set `textContent`, `data-i18n-attr` entries set the named static attribute, and only explicit `data-i18n-html` catalog values use `innerHTML`. Resolve the page identifier from `document.documentElement.dataset.i18nPage`, set `html.lang`, title, description, Open Graph tags, and announce `window.KnowlySiteI18n` before feature scripts run.

- [ ] **Step 3: Implement the reusable selector**

Create a button marked `aria-haspopup="menu"`, labelled `Language`, with a globe SVG, current `EN`/`RU` label, two menu items, keyboard arrows/Enter/Space/Escape support, click-outside close, and 44 px targets. Use `setLocale` on selection.

- [ ] **Step 4: Add responsive styles**

Implement focus-visible styles, `prefers-reduced-motion`, a mobile-safe layout, and theme-neutral contrast in `site-i18n.css`. Do not use flags or emoji.

- [ ] **Step 5: Run GREEN tests**

Run: `npx jest --runTestsByPath tests/website_i18n_contract.test.ts --no-cache --runInBand`

Expected: PASS for resolver, unsafe-storage fallback, catalog-key parity, and selector requirements.

## Task 3: Localize the shared public shell and conversion pages

**Files:**
- Modify: `knowly-www/index.html`
- Modify: `knowly-www/404.html`
- Modify: `knowly-www/contact/index.html`
- Modify: `knowly-www/download/index.html`
- Modify: `knowly-www/gift/index.html`
- Modify: `knowly-www/premium/index.html`
- Modify: `knowly-www/russia/index.html`
- Modify: `knowly-www/start/index.html`
- Modify: `knowly-www/start/thanks/index.html`
- Modify: `knowly-www/assets/site-i18n.locales.js`
- Test: `tests/website_i18n_contract.test.ts`

- [ ] **Step 1: Convert the home page canonical content to reviewed English**

Replace every Russian page-visible string, SEO meta string, heading, CTA, FAQ question/answer, testimonial translation, image alt, and aria label with its reviewed English equivalent. Keep all element IDs/classes and CTA/store URLs. Add `data-i18n` or `data-i18n-attr` keys and record the original Russian values in the `ru.home` catalog.

- [ ] **Step 2: Convert the supporting conversion pages**

Apply the same canonical-English / catalog-Russian pattern to 404, contact, download, gift, Premium, Russia payment, plan start, and thank-you. Preserve form `name`s, request payloads, price data, redirect handling, and store URLs exactly.

- [ ] **Step 3: Wire shared assets in load order**

For each page, load `site-i18n.css`, then `site-i18n.locales.js`, then `site-i18n.js` before its feature module. Put a `<span data-i18n-switcher></span>` in its existing header; do not move or remove existing navigation.

- [ ] **Step 4: Run route and surface contracts**

Run: `npx jest --runTestsByPath tests/website_i18n_contract.test.ts tests/website_surface_routing_contract.test.ts --no-cache --runInBand && npm run website:surface-contract`

Expected: PASS.

## Task 4: Localize dynamic marketing and funnel scripts

**Files:**
- Modify: `knowly-www/assets/home.js`
- Modify: `knowly-www/assets/demo.js`
- Modify: `knowly-www/assets/gift-certificate-phrases.js`
- Modify: `knowly-www/assets/start.js`
- Modify: `knowly-www/assets/site-i18n.locales.js`
- Test: `tests/website_i18n_contract.test.ts`
- Test: `functions-english-test/client_counter_contract.test.js`

- [ ] **Step 1: Write a failing dynamic-copy audit**

```ts
test('marketing scripts read displayed Russian/English copy from the locale service', () => {
  for (const file of ['home.js', 'demo.js', 'gift-certificate-phrases.js', 'start.js']) {
    const source = read(`knowly-www/assets/${file}`);
    expect(source).toContain('KnowlySiteI18n');
    expect(source).not.toMatch(/textContent\s*=\s*['"][А-Яа-яЁё]/);
  }
});
```

- [ ] **Step 2: Replace visible literals with `KnowlySiteI18n.t`**

Move demo explanations, button labels, gift-certificate text, form errors/success states, quiz/funnel choices, and transient messages into the relevant page catalog. Keep English learning examples in English where they are lesson material and localize only their explanation/chrome.

- [ ] **Step 3: Remove the obsolete `124000` counter fallback**

Make homepage counter display use the current English-test API/cache response with zero as its only fallback. It must never reintroduce the removed legacy baseline. Keep its value language-independent; localize its explanatory label.

- [ ] **Step 4: Verify counter and dynamic routes**

Run: `node --test functions-english-test/client_counter_contract.test.js && npx jest --runTestsByPath tests/website_i18n_contract.test.ts --no-cache --runInBand`

Expected: PASS, including the honest `en: 243` response path.

## Task 5: Integrate the English-level test without regressing its existing locale system

**Files:**
- Modify: `knowly-www/english-level-test/index.html`
- Modify: `knowly-www/english-level-test/app.js`
- Modify: `knowly-www/english-level-test/i18n.js`
- Modify: `tests/english_level_test_i18n_contract.test.ts`
- Modify: `tests/english_level_test_multilingual_release_contract.test.ts`

- [ ] **Step 1: Add a failing interoperability test**

```ts
test('site lang query feeds the level-test UI locale while preserving its assessment language', () => {
  const i18n = loadI18n();
  expect(i18n.resolveUiLocale({ search: '?lang=ru&ui=en&test=de', stored: null, navigatorLanguage: 'en-US' })).toBe('ru');
  expect(i18n.resolveTestLanguage('?lang=ru&test=de')).toBe('de');
});
```

- [ ] **Step 2: Add the shared selector wrapper and query adapter**

Use the shared EN/RU selector for the public-site interface. Map `lang` to the assessment’s UI-locale resolution only when its existing more-specific `ui` query is absent. Do not limit the existing `de`, `es`, `fr`, or `it` UI options inside the assessment selector.

- [ ] **Step 3: Preserve the live honest counter and all test language choices**

Keep `completedByLanguage` as the source of the displayed test language counter and retain the verified live English total of 243. Do not change request shape, question banks, certificate values, analytics, or completion identifiers.

- [ ] **Step 4: Run assessment contracts**

Run: `npx jest --runTestsByPath tests/english_level_test_i18n_contract.test.ts tests/english_level_test_multilingual_release_contract.test.ts --no-cache --runInBand && node --test functions-english-test/*.test.js`

Expected: PASS.

## Task 6: Translate every guide and legal public page completely

**Files:**
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
- Test: `tests/website_i18n_contract.test.ts`

- [ ] **Step 1: Translate guide titles, article bodies, lists, calls to action, image alts, and metadata**

Author natural English matching the source meaning and keep every original list, section hierarchy, in-article link, disclaimer, learning example, and CTA. Store the complete original Russian copy under the same stable keys so Russian output is byte-for-byte equivalent in meaning and structure.

- [ ] **Step 2: Translate the legal pages accurately**

Keep the existing English legal content as canonical where already present; introduce matching Russian catalog values for all visible/legal metadata. Preserve company names, email addresses, effective dates, and legal URLs verbatim.

- [ ] **Step 3: Run catalog completeness and language-leak tests**

Run: `npx jest --runTestsByPath tests/website_i18n_contract.test.ts --no-cache --runInBand`

Expected: PASS; the English source has no unapproved Cyrillic text and every Russian catalog key is available.

## Task 7: Cover exceptional public routes and visual behavior

**Files:**
- Modify: `knowly-www/phraseman/apple-auth/index.html`
- Modify: `knowly-www/phraseman/duel/index.html`
- Modify: `knowly-www/phraseman/invite/index.html`
- Modify: `knowly-www/robots.txt`
- Modify: `knowly-www/sitemap.xml`
- Modify: `tests/website_i18n_contract.test.ts`
- Create: `tests/website_i18n_playwright.spec.mjs`

- [ ] **Step 1: Leave non-content deeplink shims functional**

Translate only page-visible fallback/error copy for Apple auth, duel, and invite routes. Do not add a header selector to application-deeplink shims that redirect immediately or would alter their protocol handling.

- [ ] **Step 2: Preserve SEO routing**

Keep canonical URLs and existing sitemap entries; do not add locale-specific duplicate paths. Ensure the `lang` preference is never written into sitemap or canonical URLs.

- [ ] **Step 3: Add Playwright checks**

Verify at desktop and 375 px widths that: a non-Russian browser sees English; a Russian browser sees Russian; selector choice persists after navigation; `?lang=en` overrides stored Russian; keyboard focus and Escape work; no horizontal scrollbar is introduced; and the existing home/start/gift/level-test CTA remains actionable.

- [ ] **Step 4: Run focused browser suite**

Run: `npx playwright test tests/website_i18n_playwright.spec.mjs --config playwright.knowly.config.mjs`

Expected: PASS with screenshots/traces stored under ignored Playwright output folders.

## Task 8: Final verification and deployment handoff

**Files:**
- Verify: `knowly-www/**`
- Verify: `tests/website_i18n_contract.test.ts`
- Verify: `tests/website_surface_routing_contract.test.ts`

- [ ] **Step 1: Run static and unit gates**

Run:

```powershell
npx jest --runTestsByPath tests/website_i18n_contract.test.ts tests/website_surface_routing_contract.test.ts tests/english_level_test_i18n_contract.test.ts tests/english_level_test_multilingual_release_contract.test.ts --no-cache --runInBand
npm run website:surface-contract
Push-Location functions-english-test; npm test; Pop-Location
```

Expected: every command exits 0.

- [ ] **Step 2: Review the diff against the acceptance criteria**

Check every public route, text source, locale selector, browser preference, URL preference, dynamic feature, metadata field, and preserved endpoint/route. Confirm no unrelated dirty-worktree file was modified.

- [ ] **Step 3: Deploy only after a fresh all-green result and explicit authorization**

Run: `npm run hosting:knowly-www`

Expected: Hosting deploy reports success and the production smoke checks reproduce the English default and Russian override.
