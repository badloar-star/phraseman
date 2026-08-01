# Multilingual Language Level Tests Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one public RU/EN page that runs reliable adaptive A1–C2 text assessments for English, German, French, Italian, and Spanish and produces a matching localized certificate.

**Architecture:** Keep the existing language-neutral adaptive engine and put the two independent choices—UI locale and assessed language—behind small registries. Load one versioned 240-item bank per assessed language, build web/server copies deterministically, and make structural, linguistic-review, simulation, browser, accessibility, and production smoke gates mandatory. Preserve the current English URL, API collection, certificate theme controls, and all existing analytics/privacy behavior.

**Tech Stack:** Static HTML/CSS/vanilla JavaScript, Node.js 22, `node:test`, Firebase Functions/Hosting, Playwright 1.61, JSON question banks, CEFR 2020 descriptors.

**Design spec:** `docs/superpowers/specs/2026-08-01-multilingual-language-level-tests-design.md`

---

## Source-of-truth and quality policy

Use these official references to define constructs and level fit. Do not copy their protected item wording, passages, answer options, or solutions.

- All languages: [Council of Europe CEFR Companion Volume 2020](https://www.coe.int/en/web/common-european-framework-reference-languages/cefr-companion-volume-and-its-language-versions) and its reception/pragmatics descriptors.
- German: [Goethe-Institut exam training A1–C2](https://www.goethe.de/en/spr/prf/ueb.html), including the public A1–B1 vocabulary lists linked by Goethe.
- French: [France Éducation international DELF A1–B2](https://www.france-education-international.fr/en/diplome/delf-tout-public?langue=en), [DALF C1 examples](https://france-education-international.fr/diplome/dalf/exemples-sujets?langue=en), and [DALF C2 examples](https://www.france-education-international.fr/diplome/dalf/dalf-c2-exemples-de-sujets).
- Italian: [Università per Stranieri di Siena CILS examples A1–C2](https://cils.unistrasi.it/1/89/188/Esempi-prove-di-esami.htm).
- Spanish: [Instituto Cervantes Plan Curricular](https://cvc.cervantes.es/ensenanza/biblioteca_ELE/plan_curricular/indice.htm), especially grammar, functions, pragmatic strategies, textual genres, and notions.

`reviewStatus: "reviewed"` means all of the following are recorded for the exact item hash: authoring pass, adversarial linguistic pass, deterministic bank gates, and level-fit/coverage pass. It must never imply official endorsement, accreditation, native-speaker review, or review by any referenced institution.

Every new question must be original, adult-appropriate, culturally neutral where possible, and have exactly one defensible answer under the stated context. A reviewer must explicitly explain why each of the three distractors fails. Template cycling, translation of the English bank, paraphrase cloning, and padding a level with near-duplicates are release blockers.

## File map

### Create

- `knowly-www/english-level-test/i18n.js` — assessed-language registry, RU/EN copy, locale detection, URL/storage helpers, interpolation.
- `functions-english-test/client_multilingual_ui_contract.test.js` — locale, URL, full-copy, and page-state contracts.
- `functions-english-test/certificate_locale_contract.test.js` — automatic certificate locale and assessed-language naming.
- `functions-english-test/analytics_multilingual_contract.test.js` — server allowlists and privacy/backward-compatibility contracts.
- `functions-english-test/multilingual_browser_smoke.test.js` — Playwright matrix for five tests × two UI locales.
- `scripts/lib/language_test_bank.mjs` — pure registry, schema checks, deterministic builder, hashes.
- `scripts/generate_language_test_assets.mjs` — `--language`, `--all`, and read-only `--check` CLI.
- `scripts/audit_language_test_bank.mjs` — detailed non-mutating quality/coverage report into `.codex-tmp/language-test-audits/`.
- `content/language-tests/references/de.md`, `fr.md`, `it.md`, `es.md` — construct sources and copyright-safe usage notes.
- `content/language-tests/blueprints/de.json`, `fr.json`, `it.json`, `es.json` — exact per-level coverage matrix.
- `content/language-tests/questions/{de,fr,it,es}/{A1,A2,B1,B2,C1,C2}.json` — source banks, 40 items each.
- `content/language-tests/reviews/{de,fr,it,es}/{A1,A2,B1,B2,C1,C2}.json` — per-item adversarial review evidence and source-file hash.
- `knowly-www/english-level-test/data/questions.{de,fr,it,es}.json` — generated browser banks.
- `functions-english-test/data/questions.{de,fr,it,es}.json` — byte-equivalent generated server banks.

### Modify

- `knowly-www/english-level-test/index.html` — load `i18n.js`, retain unrelated background stylesheet edit, bump asset versions.
- `knowly-www/english-level-test/app.js` — select/load/freeze assessed language, render all UI through translations, preserve state on UI-locale changes, attach analytics dimensions.
- `knowly-www/english-level-test/certificate.js` — accept `uiLocale` and `testLanguage`, localize all modal chrome and subject naming.
- `knowly-www/english-level-test/styles.css` — 44 px globe button and five-language selector, responsive/focus/reduced-motion states.
- `scripts/generate_english_test_assets.mjs` — compatibility wrapper around the generic builder; existing commands keep working.
- `functions-english-test/index.js` — allowlisted language/locale/bank metadata and multilingual question IDs without changing collection names.
- `functions-english-test/question_bank_quality.test.js` — run structural and review-evidence gates over all five banks.
- `functions-english-test/adaptive_engine_simulation.test.js` — run the same simulation matrix over every bank.
- `functions-english-test/client_assessment_copy_contract.test.js` — replace hard-coded Russian-only expectations with complete RU/EN dictionary expectations.
- `functions-english-test/analytics_result_contract.test.js` — preserve result integrity while adding the two dimensions.
- `functions-english-test/hosting_cache_contract.test.js` — require versioned `i18n.js` and all selected data URLs.
- `package.json` — add narrow `language-tests:*` scripts only; do not alter broad test commands.

## Task 1: Isolate the implementation safely

**Files:** None.

- [ ] **Step 1: Read the worktree skill before changing source**

Run:

```powershell
Get-Content -Raw 'C:\Users\badlo\.agents\skills\using-git-worktrees\SKILL.md'
```

Expected: complete worktree instructions. The current workspace has extensive unrelated user edits, so implementation must not use it as a write surface.

- [ ] **Step 2: Create an isolated branch/worktree from the approved-spec commit**

Use the worktree skill to create branch `codex/multilingual-language-level-tests` from `e05f2e4c7` in a sibling directory. Verify the resolved path is outside `C:\appsprojects\phraseman` but inside `C:\appsprojects` before creation.

- [ ] **Step 3: Record the existing overlapping user diff**

Run in the original workspace:

```powershell
git diff -- knowly-www/english-level-test/index.html
```

Expected: the uncommitted `/assets/site-background.css` link. Preserve that line when the feature is integrated; do not overwrite or revert it.

- [ ] **Step 4: Verify baseline narrow gates**

Run in the new worktree:

```powershell
node --test functions-english-test/*.test.js
node scripts/generate_english_test_assets.mjs --check
node --check knowly-www/english-level-test/app.js
node --check knowly-www/english-level-test/certificate.js
```

Expected: all existing English-test tests pass, generated outputs match, and both scripts parse.

## Task 2: Build the locale and assessed-language core with TDD

**Files:**

- Create: `knowly-www/english-level-test/i18n.js`
- Create: `functions-english-test/client_multilingual_ui_contract.test.js`

- [ ] **Step 1: Write failing locale-resolution tests**

Load `i18n.js` in a `vm` context and assert this exact contract:

```js
assert.equal(resolve({ search: '', stored: null, navigatorLanguage: 'ru-RU' }), 'ru');
assert.equal(resolve({ search: '', stored: null, navigatorLanguage: 'de-DE' }), 'en');
assert.equal(resolve({ search: '', stored: 'ru', navigatorLanguage: 'en-GB' }), 'ru');
assert.equal(resolve({ search: '?ui=en', stored: 'ru', navigatorLanguage: 'ru-RU' }), 'en');
assert.equal(resolve({ search: '?ui=xx', stored: null, navigatorLanguage: 'ru-RU' }), 'ru');
```

Also assert `resolveTestLanguage('?test=de') === 'de'`, each of the other four allowlisted values survives, and unknown/missing values become `en`.

- [ ] **Step 2: Run RED**

Run:

```powershell
node --test functions-english-test/client_multilingual_ui_contract.test.js
```

Expected: FAIL because `i18n.js` does not exist.

- [ ] **Step 3: Implement the minimal public API**

Expose one frozen global:

```js
global.EnglishTestI18n = Object.freeze({
  UI_LOCALES: Object.freeze(['ru', 'en']),
  TEST_LANGUAGES: Object.freeze(['en', 'de', 'fr', 'it', 'es']),
  TESTS,
  resolveUiLocale,
  resolveTestLanguage,
  readStoredLocale,
  persistLocale,
  updateUrlSelection,
  t,
});
```

`TESTS` contains display, grammatical, certificate, filename, and BCP-47 names in RU and EN. `t(locale, key, vars)` must throw in tests for a missing key and escape/interpolate only known string variables at the render boundary.

- [ ] **Step 4: Add dictionary-completeness tests**

Walk the RU and EN leaves and assert identical key paths. Require keys for header, landing, consent, loading/error/retry, question/timer/actions/exit, result/stats/name, share/restart, certificate chrome/save/print, store badges, CTA, footer, ARIA, document title/description, and per-level result copy.

- [ ] **Step 5: Run GREEN and commit**

Run the test from Step 2, then:

```powershell
git add knowly-www/english-level-test/i18n.js functions-english-test/client_multilingual_ui_contract.test.js
git commit -m "feat: add language test locale core"
```

Expected: test passes and the commit includes exactly two files.

## Task 3: Add the header toggle and five-language landing selector

**Files:**

- Modify: `knowly-www/english-level-test/index.html`
- Modify: `knowly-www/english-level-test/app.js`
- Modify: `knowly-www/english-level-test/styles.css`
- Modify: `functions-english-test/client_multilingual_ui_contract.test.js`

- [ ] **Step 1: Write failing DOM/source contracts**

Require:

```js
assert.match(index, /<script src="\.\/i18n\.js\?v=\d{8}-\d+"><\/script>/);
assert.match(app, /class="elt-ui-locale-toggle"/);
assert.match(app, /aria-pressed="\$\{code === selectedTestLanguage\}"/);
assert.match(app, /English|Deutsch|Français|Italiano|Español/);
assert.doesNotMatch(app, /🇬🇧|🇩🇪|🇫🇷|🇮🇹|🇪🇸/u);
```

Also require `history.replaceState`/`URLSearchParams`, a 44 px minimum hit target, visible `:focus-visible`, wrap on narrow screens, and no horizontal carousel.

- [ ] **Step 2: Run RED**

Run the focused test. Expected: FAIL on missing toggle/selector.

- [ ] **Step 3: Implement selection without changing the English default**

Initialize:

```js
let uiLocale = EnglishTestI18n.resolveUiLocale({
  search: location.search,
  stored: EnglishTestI18n.readStoredLocale(),
  navigatorLanguage: navigator.language,
});
let selectedTestLanguage = EnglishTestI18n.resolveTestLanguage(location.search);
let attemptTestLanguage = null;
```

Render a real SVG globe plus current `RU`/`EN`. Render five `button` elements with `aria-pressed`, native-language names, and `data-test-language`. Before start, selection updates the URL and landing copy. After start, the selector is absent and `attemptTestLanguage` is immutable.

- [ ] **Step 4: Implement responsive/focus styles**

Use CSS grid/flex wrap with `min-height: 44px`; never use flag assets or emoji. Preserve existing palette. Active state must combine a marker/icon, border, and color.

- [ ] **Step 5: Run focused test, parse gates, and commit**

Run:

```powershell
node --test functions-english-test/client_multilingual_ui_contract.test.js
node --check knowly-www/english-level-test/i18n.js
node --check knowly-www/english-level-test/app.js
```

Then commit the four files with `feat: add language test selectors`.

## Task 4: Localize every page state without resetting an attempt

**Files:**

- Modify: `knowly-www/english-level-test/app.js`
- Modify: `knowly-www/english-level-test/i18n.js`
- Modify: `functions-english-test/client_multilingual_ui_contract.test.js`
- Modify: `functions-english-test/client_assessment_copy_contract.test.js`

- [ ] **Step 1: Write failing full-screen copy/state tests**

Require every user-visible literal in `app.js` to be a `t(...)` result or assessed-language content. Add a denylist for the current Russian literals such as `Начать бесплатно`, `Не знаю`, `Выйти`, `Верно`, `Создать сертификат`, `Поделиться`, and `Пройти тест ещё раз`.

Exercise a question-state snapshot:

```js
const before = { questionId: 'de-b1-007', deadline: 123456, historyLength: 6 };
toggleUiLocale();
assert.deepEqual(readAttemptState(), before);
```

- [ ] **Step 2: Run RED**

Expected: FAIL because app templates still contain Russian service copy.

- [ ] **Step 3: Introduce explicit view state**

Use a bounded descriptor, not cloned DOM:

```js
let activeView = { kind: 'landing', data: null };

function setActiveView(kind, data) {
  activeView = { kind, data };
}

function rerenderForUiLocale() {
  document.documentElement.lang = uiLocale;
  updateDocumentMetadata();
  renderActiveView({ preserveAttempt: true });
}
```

For question re-rendering, preserve `currentQuestion`, `questionDeadline`, `questionStartTime`, `engine.history`, and selected/answered lock. For result re-rendering, preserve the sanitized name field and result. Do not restart timers, analytics events, count-completion, or the engine.

- [ ] **Step 4: Replace all chrome with dictionary calls**

Cover brand subtitle, landing, stores, preview certificate, consent, loading/error, question meta/actions, exit dialog, result, certificate entry, share/clipboard/prompt, CTA, footer, and all ARIA/alt/title strings. Set assessed-content `lang` from `TESTS[testLanguage].bcp47`, not from UI locale.

- [ ] **Step 5: Run focused tests and commit**

Expected: no denied RU/EN service literals remain in `app.js`; current English assessment copy contracts still pass. Commit with `feat: localize language test flow`.

## Task 5: Load and cache only the selected bank

**Files:**

- Modify: `knowly-www/english-level-test/app.js`
- Modify: `functions-english-test/client_multilingual_ui_contract.test.js`

- [ ] **Step 1: Write failing bank-selection tests**

Require URLs `./data/questions.${code}.json?v=${version}` for all five allowlisted codes, verify only the selected code is fetched on start, and verify a failed German load does not fall back to English.

- [ ] **Step 2: Run RED**

Expected: FAIL because `BANK_URL` is hard-coded to English.

- [ ] **Step 3: Implement a bounded five-entry session cache**

```js
const bankCache = new Map();

async function loadBank(language) {
  if (bankCache.has(language)) return bankCache.get(language);
  const response = await fetch(TESTS[language].bankUrl);
  if (!response.ok) throw new Error(`bank_http_${response.status}`);
  const bank = await response.json();
  if (bank.language !== language || !Array.isArray(bank.questions) || bank.questions.length !== 240) {
    throw new Error('bank_contract_mismatch');
  }
  bankCache.set(language, bank);
  return bank;
}
```

Freeze `attemptTestLanguage = selectedTestLanguage` before loading. Localize retry/error; retry only that bank.

- [ ] **Step 4: Run GREEN and commit**

Run the focused client tests and `node --check`; commit with `feat: load selected language test bank`.

## Task 6: Make certificates subject-aware and locale-aware

**Files:**

- Modify: `knowly-www/english-level-test/certificate.js`
- Modify: `knowly-www/english-level-test/app.js`
- Create: `functions-english-test/certificate_locale_contract.test.js`

- [ ] **Step 1: Write failing certificate tests**

Assert `show({ uiLocale: 'en', testLanguage: 'de', ... })` defaults to English and produces `Phraseman German Level Check`; RU/FR produces the correct Russian name for French. Require all modal buttons, ARIA, iOS save hint, alerts, print title, CTA, and filename to use the chosen certificate locale and assessed language.

- [ ] **Step 2: Run RED**

Expected: FAIL because `currentLang` is globally initialized and the subject is hard-coded to English.

- [ ] **Step 3: Pass locale/subject explicitly**

Replace shared initial state with per-modal state:

```js
function renderCertificate(data) {
  let currentLang = data.uiLocale === 'ru' ? 'ru' : 'en';
  const testLanguage = EnglishTestI18n.TEST_LANGUAGES.includes(data.testLanguage)
    ? data.testLanguage
    : 'en';
  // existing theme state remains unchanged
}
```

Keep the existing manual RU/English buttons. Build SVG copy from `LANGS[currentLang]` plus the assessed-language display name. Do not remove themes, PNG, PDF/print, iOS preview, CTA, focus trap, or confetti/reduced-motion behavior.

- [ ] **Step 4: Run GREEN and commit**

Run certificate, client, and parse tests. Commit with `feat: localize language test certificates`.

## Task 7: Extend the analytics contract safely

**Risk:** Cross-contract/privacy write; execution requires the project’s critical-domain writer/reviewer policy.

**Files:**

- Modify: `functions-english-test/index.js`
- Modify: `knowly-www/english-level-test/app.js`
- Create: `functions-english-test/analytics_multilingual_contract.test.js`
- Modify: `functions-english-test/analytics_result_contract.test.js`

- [ ] **Step 1: Write failing server normalization tests**

Require:

```js
normalizeTestLanguage('de') === 'de';
normalizeTestLanguage('xx') === 'en';
normalizeUiLocale('ru') === 'ru';
normalizeUiLocale('fr') === 'en';
normalizeQuestionIdentity({ questionId: 'fr-c2-040', position: 20 }) !== null;
normalizeQuestionIdentity({ questionId: 'xx-c2-040', position: 20 }) === null;
```

Verify old English `start/view/progress/complete` bodies still normalize, no certificate name field is accepted, and all new values are allowlisted.

- [ ] **Step 2: Run RED**

Expected: FAIL on the `en-`-only question regex and missing dimensions.

- [ ] **Step 3: Implement normalized attempt dimensions**

Store `testLanguage`, `uiLocale`, and the submitted normalized `bankVersion` on attempt creation; include dimensions on relevant normalized events. Keep `english_test_attempts`, HMAC IDs, consent requirement, TTLs, body/rate limits, and action allowlist unchanged.

- [ ] **Step 4: Add dimensions to client events**

`api()` appends only:

```js
testLanguage: attemptTestLanguage || selectedTestLanguage,
uiLocale,
```

Never append `lastCertName` or raw question text.

- [ ] **Step 5: Run the complete isolated function suite and commit**

Run `node --test functions-english-test/*.test.js`. Expected: all pass. Commit with `feat: segment language test analytics`.

## Task 8: Generalize the deterministic bank builder

**Files:**

- Create: `scripts/lib/language_test_bank.mjs`
- Create: `scripts/generate_language_test_assets.mjs`
- Modify: `scripts/generate_english_test_assets.mjs`
- Modify: `functions-english-test/question_bank_quality.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing generic-builder tests**

Require language registry paths, exact 40-per-level/240-total counts, language-prefixed IDs, ascending difficulty, four unique options, 10 correct answers in each stored position per level, at least three skills per level, required review fields, byte-equivalent web/server output, and zero writes under `--check`.

- [ ] **Step 2: Run RED**

Expected: FAIL because only the English hard-coded builder exists.

- [ ] **Step 3: Extract pure builder functions**

Export the registry and path functions exactly as follows, then move the existing English validator/builder body behind the same language-aware context:

```js
import { join } from 'node:path';

export const LEVELS = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export const LANGUAGES = Object.freeze(['en', 'de', 'fr', 'it', 'es']);
export const DIALECTS = Object.freeze({
  en: Object.freeze(['neutral', 'british', 'american']),
  de: Object.freeze(['standard']),
  fr: Object.freeze(['standard']),
  it: Object.freeze(['standard']),
  es: Object.freeze(['standard']),
});

export function assertLanguage(language) {
  if (!LANGUAGES.includes(language)) throw new Error(`Unsupported language: ${language}`);
}

export function sourceDirFor(root, language) {
  assertLanguage(language);
  return language === 'en'
    ? join(root, 'content', 'english-test', 'questions')
    : join(root, 'content', 'language-tests', 'questions', language);
}

export function outputPathsFor(root, language) {
  assertLanguage(language);
  const filename = `questions.${language}.json`;
  return [
    join(root, 'knowly-www', 'english-level-test', 'data', filename),
    join(root, 'functions-english-test', 'data', filename),
  ];
}
```

`validateQuestion(question, { language, level, seenIds })` enforces the tested common schema plus `DIALECTS[language]`. `buildLanguageBank({ root, language })` reads the six files from `sourceDirFor`, validates them, and returns the deterministic JSON string. `checkGeneratedOutputs({ root, languages })` compares normalized bytes and mtimes without writes. `generate_english_test_assets.mjs` becomes a compatibility entry point that invokes the same builder for `en`.

- [ ] **Step 4: Add narrow package scripts**

```json
"language-tests:generate": "node scripts/generate_language_test_assets.mjs --all",
"language-tests:check": "node scripts/generate_language_test_assets.mjs --all --check",
"language-tests:audit": "node scripts/audit_language_test_bank.mjs --all"
```

- [ ] **Step 5: Run English regression and commit**

Run both old and new English `--check` commands and byte-compare the current English output before/after. Commit with `refactor: generalize language test bank builder` only if English bytes are unchanged.

## Task 9: Build the rigorous content-quality framework

**Files:**

- Create: `scripts/audit_language_test_bank.mjs`
- Create: `content/language-tests/references/{de,fr,it,es}.md`
- Create: `content/language-tests/blueprints/{de,fr,it,es}.json`
- Modify: `functions-english-test/question_bank_quality.test.js`

- [ ] **Step 1: Write failing blueprint/review gates**

For every new language/level require exact quotas:

```js
const SKILL_QUOTAS = {
  A1: { grammar: 12, vocabulary: 10, reading: 10, pragmatics: 8 },
  A2: { grammar: 12, vocabulary: 10, reading: 10, pragmatics: 8 },
  B1: { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 },
  B2: { grammar: 10, vocabulary: 10, reading: 10, pragmatics: 10 },
  C1: { grammar: 8, vocabulary: 8, reading: 12, pragmatics: 12 },
  C2: { grammar: 8, vocabulary: 8, reading: 12, pragmatics: 12 },
};
```

Require unique `constructId`, one or more official `descriptorRefs`, review evidence for every ID, exact SHA-256 of the reviewed source file, `accuracy`, `levelFit`, `singleAnswer`, `distractorExclusivity`, `naturalness`, `originality`, `ruInstructionAccuracy`, and `enInstructionAccuracy` all equal to `pass`.

- [ ] **Step 2: Add duplication and leakage gates**

Normalize case, Unicode, punctuation, articles, and whitespace. Fail exact duplicate stimuli/options, duplicate correct-answer sentences, normalized Jaccard similarity above `0.82` for two full items in the same bank, more than four stems with the same structural fingerprint, Russian leakage into target options, and target-language answer leakage into service instructions.

- [ ] **Step 3: Add upper-band and reading-depth gates**

Require every C1/C2 item eligible for routing to have `upperBandEvidence: true`. Require at least six independent multi-sentence reading/pragmatics stimuli per C1/C2 level, logical-inference questions at C2, and prohibit obscure trivia as a proxy for proficiency.

- [ ] **Step 4: Write the reference and blueprint files**

Each reference file records the official URL, access date `2026-08-01`, relevant sections, allowed use (“construct/format inspiration only”), and prohibited use (“no copied items/passages/options”). Each blueprint lists 40 distinct constructs per level before any question is authored.

- [ ] **Step 5: Implement the read-only audit CLI**

The CLI prints only a short status/count summary and writes detailed JSON/Markdown to `.codex-tmp/language-test-audits/<language>-<timestamp>/`. It must never modify source, review, or generated bank files.

- [ ] **Step 6: Run gates and commit**

English may be exempt only from new review-evidence fields; it is not exempt from existing structural/simulation gates. Commit framework files with `test: add multilingual bank quality gates`.

## Task 10: Author and review the German bank

**Files:**

- Create: `content/language-tests/questions/de/{A1,A2,B1,B2,C1,C2}.json`
- Create: `content/language-tests/reviews/de/{A1,A2,B1,B2,C1,C2}.json`
- Generate: `knowly-www/english-level-test/data/questions.de.json`
- Generate: `functions-english-test/data/questions.de.json`

- [ ] **Step 1: Author A1 and A2 in four 10-item batches per level**

Use the German blueprint and Goethe A1/A2 scope. Cover cases/articles, present-tense verb placement, separable verbs, modal basics, negation, time/dates, everyday vocabulary, notices/messages, and simple requests. Every option is German; RU/EN fields explain only the action.

Canonical shape:

```json
{
  "id": "de-a1-001",
  "level": "A1",
  "difficulty": 0.5,
  "skill": "grammar",
  "format": "gap-fill",
  "constructId": "de.a1.verb-sein.first-person",
  "descriptorRefs": ["CEFR-A1-reading", "GOETHE-A1-structures"],
  "scenario": "Introducing yourself",
  "prompt": "Complete the German sentence.",
  "scenarioRu": "Знакомство",
  "instructionRu": "Выбери форму, которая правильно завершает немецкое предложение.",
  "stimulus": "Ich ___ Studentin.",
  "options": ["bin", "bist", "ist", "seid"],
  "correctIndex": 0,
  "explanation": "With ich, the present form of sein is bin.",
  "targetConstruct": "First-person singular of sein in a basic identity statement.",
  "cefrRationale": "A1 learners understand and form very simple personal-information statements.",
  "dialect": "standard",
  "reviewStatus": "draft",
  "ambiguityNotes": "Only bin agrees with ich; bist, ist, and seid require other subjects.",
  "upperBandEvidence": false
}
```

- [ ] **Step 2: Author B1 and B2 in four 10-item batches per level**

Cover subordinate-clause word order, relative clauses, passive/alternatives, Konjunktiv II, tense/aspect in narratives, collocation, register, longer notices/articles, implication, and polite disagreement. Do not use dialect-only answers unless explicitly labelled.

- [ ] **Step 3: Author C1 and C2 in four 10-item batches per level**

Cover dense syntax, nominal style, nuanced connectors/particles, idiomatic collocation, academic/public prose, stance, irony, implicature, logical scope, and register shifts. C2 must test precision and inference, not rare-word trivia.

- [ ] **Step 4: Run the authoring audit while items remain draft**

Run `node scripts/audit_language_test_bank.mjs --language de --allow-draft`. Expected: 240 items, exact quotas/positions, no duplicate/leakage failures; review-evidence failures remain expected.

- [ ] **Step 5: Perform an adversarial item-by-item review**

For each item independently try to invalidate the key, make a distractor acceptable, identify dialect/register dependence, or move the construct to another CEFR level. Revise the item instead of rationalizing a defect. Record all eight review verdicts and a concrete distractor note in the matching review file.

- [ ] **Step 6: Hash, mark reviewed, generate, simulate, and commit**

After all review verdicts pass, apply any final revisions, change the surviving items to `reviewStatus: "reviewed"`, compute the SHA-256 of each final level file, and write that exact hash into its review file. Then run generation/check/audit plus the all-bank simulation. Commit German source, evidence, and generated copies with `feat: add reviewed German level test bank`.

## Task 11: Author and review the French bank

**Files:**

- Create: `content/language-tests/questions/fr/{A1,A2,B1,B2,C1,C2}.json`
- Create: `content/language-tests/reviews/fr/{A1,A2,B1,B2,C1,C2}.json`
- Generate: `knowly-www/english-level-test/data/questions.fr.json`
- Generate: `functions-english-test/data/questions.fr.json`

- [ ] **Step 1: Author A1/A2 in four 10-item batches per level**

Use DELF/CEFR constructs: articles/gender, present and near future, basic past, pronouns, negation, quantity, everyday lexicon, notices, messages, requests, `tu/vous`, and routine interactions.

Canonical assessed fragment:

```json
{
  "id": "fr-a1-001",
  "constructId": "fr.a1.verb-etre.first-person",
  "stimulus": "Je ___ étudiante.",
  "options": ["suis", "es", "est", "êtes"],
  "correctIndex": 0,
  "ambiguityNotes": "Only suis agrees with je; the other forms require tu, il/elle, or vous."
}
```

Each French level file has top-level `language: "fr"`. Its 40 full question objects use the complete German-task item schema, original French content, RU/EN task instructions, `dialect: "standard"`, and `reviewStatus: "draft"` until review.

- [ ] **Step 2: Author B1/B2 in four 10-item batches per level**

Cover tense choice, object/relative pronouns, condition/hypothesis, subjunctive in level-appropriate contexts, connectors, collocation, formal/informal correspondence, reading purpose/detail/inference, and pragmatic appropriateness.

- [ ] **Step 3: Author C1/C2 in four 10-item batches per level**

Cover advanced cohesion, reported stance, nuanced modality, idiom/collocation, academic/journalistic argument, implicit evaluation, irony, logical scope, register, and near-synonym precision. Avoid France-only cultural trivia.

- [ ] **Step 4: Run draft audit, adversarial review, hash evidence, and final gates**

Use `--language fr --allow-draft`, then item-by-item key/distractor/level/register review. After revisions, mark the surviving items reviewed, hash each final level file into its evidence file, generate both copies, simulate, and commit with `feat: add reviewed French level test bank`.

## Task 12: Author and review the Italian bank

**Files:**

- Create: `content/language-tests/questions/it/{A1,A2,B1,B2,C1,C2}.json`
- Create: `content/language-tests/reviews/it/{A1,A2,B1,B2,C1,C2}.json`
- Generate: `knowly-www/english-level-test/data/questions.it.json`
- Generate: `functions-english-test/data/questions.it.json`

- [ ] **Step 1: Author A1/A2 in four 10-item batches per level**

Use CILS/CEFR constructs: articles/gender/number, present, modal basics, common prepositions, passato prossimo basics, agreement, everyday vocabulary, short notices/messages, greetings, requests, and routine exchanges.

Canonical assessed fragment:

```json
{
  "id": "it-a1-001",
  "constructId": "it.a1.verb-essere.first-person",
  "stimulus": "Io ___ studente.",
  "options": ["sono", "sei", "è", "siamo"],
  "correctIndex": 0,
  "ambiguityNotes": "Only sono agrees with io; sei, è, and siamo require different subjects."
}
```

All full objects use original standard Italian and the same complete reviewed schema.

- [ ] **Step 2: Author B1/B2 in four 10-item batches per level**

Cover tense/aspect choice, clitic pronouns, relative constructions, conditionals/subjunctive, passive/impersonal forms, connectors, collocation, reading inference, politeness, and register.

- [ ] **Step 3: Author C1/C2 in four 10-item batches per level**

Cover advanced cohesion, nuanced mood/tense, idiomatic collocation, formal prose, argument structure, implicit stance, irony, logical scope, and fine register/near-synonym distinctions. Exclude archaic trivia.

- [ ] **Step 4: Run draft audit, adversarial review, hash evidence, and final gates**

Use `--language it --allow-draft`, revise every defect, mark the surviving items reviewed, bind each evidence file to the final level-file hash, generate, simulate, and commit with `feat: add reviewed Italian level test bank`.

## Task 13: Author and review the Spanish bank

**Files:**

- Create: `content/language-tests/questions/es/{A1,A2,B1,B2,C1,C2}.json`
- Create: `content/language-tests/reviews/es/{A1,A2,B1,B2,C1,C2}.json`
- Generate: `knowly-www/english-level-test/data/questions.es.json`
- Generate: `functions-english-test/data/questions.es.json`

- [ ] **Step 1: Author A1/A2 in four 10-item batches per level**

Use PCIC/CEFR constructs: gender/number/articles, `ser/estar/hay`, present, basic past/future intentions, pronouns, quantity, everyday notions, short signs/messages, requests, greetings, and routine interactions.

Canonical assessed fragment:

```json
{
  "id": "es-a1-001",
  "constructId": "es.a1.verb-ser.first-person",
  "stimulus": "Yo ___ estudiante.",
  "options": ["soy", "eres", "es", "somos"],
  "correctIndex": 0,
  "ambiguityNotes": "Only soy agrees with yo; eres, es, and somos require other subjects."
}
```

Use neutral international Spanish. Region-specific forms such as `vosotros` or `voseo` may appear only when explicitly contextualized and must never be the unmarked sole standard.

- [ ] **Step 2: Author B1/B2 in four 10-item batches per level**

Cover past contrasts, mood selection, object/relative pronouns, conditionals, periphrases, connectors, collocation, reading inference, politeness, and register across neutral contexts.

- [ ] **Step 3: Author C1/C2 in four 10-item batches per level**

Cover advanced cohesion, nuanced mood/aspect, idiomatic collocation, academic/journalistic prose, implicit stance, irony, logical scope, register, and dialect-aware near-synonym precision without penalizing a valid regional form.

- [ ] **Step 4: Run draft audit, adversarial review, hash evidence, and final gates**

Use `--language es --allow-draft`, revise dialect ambiguity aggressively, mark the surviving items reviewed, bind each evidence file to the final level-file hash, generate, simulate, and commit with `feat: add reviewed Spanish level test bank`.

## Task 14: Run the adaptive simulation matrix over all five banks

**Files:**

- Modify: `functions-english-test/adaptive_engine_simulation.test.js`

- [ ] **Step 1: Generalize the test loop and observe RED for missing banks**

```js
for (const language of ['en', 'de', 'fr', 'it', 'es']) {
  const bank = loadBank(language);
  test(`${language}: all-correct earns C2 only with direct evidence`, () => {
    const attempts = simulate(bank, (question) => ({
      index: question.correctIndex,
      skipped: false,
    }));
    assert.equal(attempts.every(({ result }) => result.estimatedLevel === 'C2'), true);
    assert.equal(attempts.every(({ result }) => result.totalQuestions <= 20), true);
    assert.equal(attempts.every(({ shown }) => (
      shown.filter((question) => question.level === 'C1').length >= 3
      && shown.filter((question) => question.level === 'C2').length >= 3
    )), true);
  });
}
```

Add equally concrete all-wrong, all-skipped, seeded-random, and four fixed-position cases inside the same language loop by adapting the existing tested callbacks. Keep 2,000 deterministic seeds per strategy per language. Also assert no repeated IDs and no pool exhaustion.

- [ ] **Step 2: Run GREEN only after all generated banks exist**

Run:

```powershell
node --test functions-english-test/adaptive_engine_simulation.test.js
```

Expected: all five language groups pass with high-level random/fixed-position rates ≤2% and max length ≤20.

- [ ] **Step 3: Commit**

Commit with `test: simulate all language level banks`.

## Task 15: Add browser, responsive, accessibility, and state-preservation E2E

**Files:**

- Create: `functions-english-test/multilingual_browser_smoke.test.js`
- Modify: `functions-english-test/package.json` only if a test script is needed; use root Playwright dependency rather than duplicating it.

- [ ] **Step 1: Write the failing Playwright matrix**

Serve `knowly-www` on localhost and for each `test=en|de|fr|it|es` and `ui=ru|en` assert correct title, selected button, complete service locale, selected bank request, first assessed-content `lang`, and no console/page errors.

- [ ] **Step 2: Add state-preservation and certificate cases**

During question 2, record the visible question text, question number, timer value, and intercepted `view`/`progress` network-event counts. Toggle UI and assert the question/number remain identical, the timer never increases or resets to 45, and no duplicate analytics event is emitted. Do not add production APIs used only by tests. Complete deterministic browser fixtures, create a certificate, and assert automatic locale plus correct assessed-language wording.

- [ ] **Step 3: Add layout/accessibility cases**

At 375×812 and 1440×900 assert `document.documentElement.scrollWidth <= innerWidth`, 44×44 targets, visible keyboard focus, no focus escape from certificate modal, correct `html[lang]`, and reduced-motion behavior. Check RU/EN pages for leaked service-copy denylist tokens.

- [ ] **Step 4: Run and commit**

Run the one E2E file only. Save screenshots/traces under ignored `.codex-tmp/language-test-e2e/`. Commit with `test: cover multilingual level test journeys`.

## Task 16: Versioning, final verification, and release

**Files:**

- Modify: `knowly-www/english-level-test/index.html`
- Modify: `functions-english-test/hosting_cache_contract.test.js`

- [ ] **Step 1: Write failing asset-version contract**

Require version queries on `styles.css`, `engine.js`, `i18n.js`, `certificate.js`, and `app.js`. Require every bank URL version to match its JSON `bankVersion` registry entry.

- [ ] **Step 2: Bump versions once after final source bytes settle**

Do not touch or remove `/assets/site-background.css?v=20260729-1`. Use a single release stamp for changed JS/CSS and the individual bank versions for JSON.

- [ ] **Step 3: Run fresh deterministic gates**

```powershell
node scripts/generate_language_test_assets.mjs --all --check
node scripts/audit_language_test_bank.mjs --all
node --test functions-english-test/*.test.js
node --check knowly-www/english-level-test/engine.js
node --check knowly-www/english-level-test/i18n.js
node --check knowly-www/english-level-test/certificate.js
node --check knowly-www/english-level-test/app.js
```

Expected: exit 0, 1,200 total unique questions, 240 per language, 40 per level, no quality failures, all unit/contract/simulation/browser tests pass, all scripts parse.

- [ ] **Step 4: Independent specification and critical-contract review**

Review the final diff against every Definition of Done item in the spec. Use a fresh read-only reviewer for assessment correctness and a critical-domain reviewer for analytics/privacy changes. Any P0/P1 or ambiguity finding blocks release and returns to the relevant TDD task.

- [ ] **Step 5: Commit the version stamp**

Commit only final index/cache-contract changes with `chore: version multilingual level test assets`.

- [ ] **Step 6: Deploy only the required targets**

Deploy the isolated `english-test` function codebase because its input contract changed, then deploy only Firebase Hosting target `knowlywww`. Do not deploy admin or the default mobile Functions codebase.

- [ ] **Step 7: Verify live production**

For all five `?test=` values and both `?ui=` values, verify HTTP 200, correct selected language, bank fetch, one question transition, and no console error. Verify API old/new payload compatibility, certificate PNG path, and no 404 navigation. Compare live asset hashes/version stamps with the intended release.

- [ ] **Step 8: Record release evidence**

Write a concise ignored report under `.codex-tmp/language-test-release/<timestamp>/` with commands, exit codes, decisive counts, deployed targets, live URLs, and asset hashes. Do not paste full logs into the conversation.

## Final acceptance checklist

- [ ] Five independent banks exist; each has 240 original items, exactly 40 per CEFR level.
- [ ] Every new item has recorded accuracy, level-fit, naturalness, originality, and distractor-exclusivity review evidence bound to the final file hash.
- [ ] The UI is complete RU/EN across landing, question, result, certificate, CTA, errors, system dialogs, sharing, and accessibility text.
- [ ] Browser locale detection, explicit URL override, and persisted manual choice follow the approved precedence.
- [ ] Changing UI language never resets or lengthens a live attempt.
- [ ] The certificate defaults to the UI locale, names the assessed language, and retains manual RU/EN and all five themes.
- [ ] Analytics remains consent-gated, allowlisted, backward-compatible, rate-limited, and free of certificate names/question text.
- [ ] The same engine passes deterministic behavior simulations over all five banks.
- [ ] Mobile/desktop Playwright journeys pass without overflow, focus defects, copy leakage, 404s, or console errors.
- [ ] Only `functions:english-test` and `hosting:knowlywww` are deployed, with live hashes verified.
