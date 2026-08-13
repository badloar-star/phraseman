# Knowly Website English Localization Design

## Goal

Make English the default experience for every public page on `knowlyapps.com`,
retain a complete Russian experience, and add a clear, accessible language
switcher to the header of every public page.

## Scope

The public static site under `knowly-www/` is in scope, including the home
page, download, Premium, gift, contact, Russia payment guide, start funnel,
thank-you screen, English-level test, guides, legal pages, 404 page, and their
client-side dynamic copy. App screens and the Firebase admin are not in scope.

## Decision

Use one canonical set of public pages with a shared client-side localization
layer rather than parallel `/en/` and `/ru/` page trees.

English will be the canonical HTML language and the server-rendered document
content. This makes the initial render and search-engine content English for
international visitors. Russian content will be a first-class supported locale
in explicit page dictionaries and will be applied before the page becomes
visible. The existing multi-language English-level test will retain its
additional UI locales and test-language choices.

## Language Resolution

The site resolves the interface language in this order:

1. A valid `lang=en` or `lang=ru` URL query parameter.
2. The visitor's saved `knowly_site_locale_v1` choice in `localStorage`.
3. Browser preference: a primary browser language beginning with `ru` selects
   Russian; every other language selects English.

An explicit switch updates the storage value, updates the URL query parameter
without discarding the current route, and reloads only if a page needs a clean
dynamic initialization. A link containing `lang` remains shareable and has
priority over a stale stored preference.

`<html lang>`, document title, meta description, Open Graph title and
description, relevant `aria-label` values, and page-visible text must all
reflect the selected interface locale.

## Interface

Every public header gets the same compact `EN / RU` language control, positioned
at the right side of the top navigation. It is a labelled, keyboard-operable
button that opens a two-option menu. It has a 44 px minimum target, clear focus
ring, Escape-to-close behavior, outside-click close behavior, and high contrast
in desktop and mobile page themes.

The control uses a small SVG globe icon and the active locale label; it does not
use flag imagery or emoji. It must not alter the approved page layout, hide
existing navigation, or introduce horizontal scrolling at the mobile breakpoint.

## Localization Architecture

Add a small shared runtime, loaded before each page's own behavior scripts:

- `knowly-www/assets/site-i18n.js` resolves the locale, applies strings and
  document metadata, persists explicit choices, and creates the shared control.
- `knowly-www/assets/site-i18n.locales.js` contains the English and Russian
  dictionaries. Dictionary values are static, authored copy only; no user input
  is ever inserted as HTML.
- `knowly-www/assets/site-i18n.css` supplies the one reusable switcher style and
  motion-reduction/focus behavior.

Each page declares a stable `data-i18n-page` identifier. Page markup uses
`data-i18n` keys for text and `data-i18n-attr` for translated attributes. The
runtime supports text, trusted static HTML for article paragraphs that already
contain inline links/emphasis, and attributes such as `title`, `placeholder`,
`aria-label`, and `alt`.

English source strings stay in the document and Russian equivalents are stored
in the dictionary. This lets crawlers and no-JavaScript visitors receive the
English default. A pre-paint locale marker prevents Russian-preference visitors
from briefly seeing English content.

Dynamic public scripts (`demo.js`, `home.js`, `gift-certificate-phrases.js`,
`start.js`, the contact/download flows, and the English-level test) receive
their display strings from the shared locale service or an adapter that preserves
the English-level test's current locale contract. No checkout endpoint, form
field name, analytics event, deeplink, or route contract changes.

## Translation Quality

All page-visible strings must be translated by meaning, not mechanically:

- Preserve Phraseman and product-plan names where they are proper names.
- Keep prices, URLs, store links, legal references, and required product claims
  factually unchanged unless their surrounding wording is localized.
- Translate testimonials accurately and identify the original store/source;
  do not invent endorsements.
- Keep the Russia-specific payment page available in Russian and English, with
  its payment guidance precisely localized.
- Ensure guides retain headings, lists, links, code-free structured content,
  and reading flow in both languages.

## SEO and Routing

Existing paths, canonical URLs, sitemap entries, redirects, and download/store
links remain unchanged. Canonical HTML is English. The language selector adds a
query parameter only for visitor preference and does not create separate
canonical route trees.

Each page gets English metadata in source plus locale-specific metadata in the
dictionary. The `lang` query parameter is preserved by internal navigation
where practical, while the saved preference remains the fallback if a link does
not carry it.

## Error Handling and Progressive Enhancement

If `localStorage` is unavailable or throws, locale selection falls back safely
to the URL and browser preference. If a dictionary key is missing, the English
source text remains visible and a development-only diagnostic identifies the
page/key; production pages must never show untranslated key names. The selector
is omitted only when its runtime cannot initialize, leaving an intelligible
English page rather than breaking navigation.

## Verification

Automated coverage will verify:

- Supported locale resolution precedence and invalid-query fallback.
- Safe persistence behavior when browser storage fails.
- Every public HTML page includes the shared runtime, stable page ID, and
  switcher mount point.
- Every declared key has both English and Russian values; all translated
  attributes and dynamic-script copy are covered.
- English default HTML contains no unintended Cyrillic marketing copy; Russian
  output has no missing English placeholders apart from valid brand names,
  source names, URLs, and language-learning examples.
- Existing website surface and routing contracts remain green.

Manual browser checks will cover the home page, a guide, the level test, gift,
checkout start flow, legal page, and 404 at desktop and mobile widths; English
and Russian choices must persist across route navigation and a new visit.

## Acceptance Criteria

1. A non-Russian browser opening any public site route sees complete English
   copy immediately and can use every existing page function.
2. A Russian browser sees complete Russian copy automatically.
3. `EN / RU` is visible, accessible, and works consistently in every public
   header; a visitor's explicit choice overrides auto-detection and persists.
4. All dynamic messages, forms, dialogs, metadata, and accessibility labels are
   localized for English and Russian.
5. Existing routes, payments, deep links, analytics, forms, responsive visual
   design, and the multi-language level-test behavior remain intact.
