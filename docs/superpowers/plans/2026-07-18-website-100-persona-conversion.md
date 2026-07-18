# Phraseman Website 100-Persona Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every one of the 100 audited visitor archetypes find a relevant reason, credible proof, resolved objection, and direct path to installing Phraseman, while keeping the homepage focused on one primary action: **«Скачать и начать первый урок»**.

**Architecture:** Keep one fast static homepage and group the 100 archetypes into ten intent clusters. The homepage uses progressive disclosure: one universal hero, six high-frequency goal cards, product proof, level/time fit, trust/comparison content, categorized FAQ, and repeated download CTAs. Existing and focused new guides carry long-tail details; `/start/` remains available only from the top navigation and is not presented as an alternative CTA elsewhere on the homepage.

**Tech Stack:** Static HTML/CSS/JavaScript in `knowly-www`, Firebase Hosting, existing anonymous site-statistics endpoint, TypeScript/Jest source contracts, focused browser and accessibility checks.

---

## 0. Approved owner decisions and precedence

These decisions are fixed for this plan:

1. The primary CTA copy is exactly **«Скачать и начать первый урок»**.
2. **«Подобрать план»** remains only in the top navigation. It must not appear in the hero, content sections, mobile dock, sticky CTA, final CTA, footer pitch, or contextual cards.
3. Public marketing must not promise Arena, duels, or duels with real players. Current app inspection confirms that weekly leagues, league XP/progression, and league rewards remain genuine; their truthful value must be preserved rather than erased with the duel copy.
4. The `/start/` route, checkout flow, gift flow, Premium page, legal pages, and compatibility deep-link routes are preserved. This plan changes marketing entry points; it does not delete those capabilities.
5. No fabricated user totals, ratings, awards, offline support, exam preparation, device support, or learning outcomes may be added.
6. The homepage must not display 100 personas or 100 tiles. Coverage is implemented through ten intent clusters and a machine-checked coverage matrix.

For homepage CTA placement, duel copy, and persona coverage, this plan supersedes conflicting wording in:

- `docs/superpowers/specs/2026-07-16-premium-landing-and-hero-experiment-design.md`
- `docs/superpowers/plans/2026-07-16-premium-landing-and-hero-experiment.md`

The earlier plan's static-site, platform-routing, consent, performance, experiment, and Admin V2 architecture remains reusable unless this plan explicitly changes it.

**Current-worktree warning:** during planning, unrelated concurrent edits appeared in `app.json`, `app/+native-intent.tsx`, `knowly-www/.well-known/apple-app-site-association`, the duel compatibility route, and several marketing files. They are not part of this plan and must not be reverted, absorbed, or staged automatically. Before implementation, reconcile ownership of overlapping `knowly-www` edits and preserve the user's current work line by line.

## 1. What “satisfy all 100 types” means

Each archetype must have all four links in the conversion chain:

```text
recognition -> evidence -> objection answer -> direct download
```

- **Recognition:** the visitor sees their goal, level, constraint, or situation in plain language.
- **Evidence:** the page shows a real phrase, product screen, review, or honest product behavior relevant to that situation.
- **Objection answer:** the page answers the visitor's most likely blocker: time, fear, price, privacy, platform, accessibility, or product fit.
- **Direct download:** the next primary action is always «Скачать и начать первый урок».

Passing the coverage gate does not mean persuading an unsuitable visitor with a false promise. For exam preparation, professional terminology, children, or accessibility needs not fully supported by the product, the page must state the current boundary and position Phraseman honestly as a supplement where appropriate.

## 2. Ten-cluster coverage map for all 100 archetypes

| Cluster | Personas from the audit | Required recognition | Required evidence | Main objection to resolve | Runtime destination |
|---|---|---|---|---|---|
| `travel` | 1–10: first trip, urgent trip, family, solo, city-break, road trip, cruise, 45+, budget, anxious traveler | Travel card and airport/hotel/cafe examples | One real travel phrase and a real lesson screen | “Will this help before my trip?” | Existing travel guide + download |
| `work` | 11–20: interview, developer, manager, designer, marketer, freelancer, B2B, relocated worker, advanced professional, call tomorrow | Work/career card and meeting/interview examples | One work phrase, one relevant review, realistic first-week outcome | “Is this practical enough for work?” | Focused work guide + download |
| `move_speak` | 21–30: relocation, exchange, family migration, visa interview, first 30 days, zero level, understands but cannot speak, accent fear, error fear, bad teacher experience | Move card plus “понимаю, но не говорю” path | Pronunciation/privacy demonstration and gentle feedback screen | Fear, embarrassment, starting level | Existing speaking-barrier guide + move guide + download |
| `time_return` | 31–40: busy parent, office commute, two jobs, young mother, tired learner, procrastinator, Duolingo dropout, Anki user, course student, gamification skeptic | “5–15 минут” and “можно вернуться после пропуска” | Three-minute first-lesson sequence and retention explanation | Time, consistency, another abandoned app | Existing 15-minute guide + comparison block + download |
| `proof_platform` | 41–50: claim skeptic, pronunciation skeptic, AI skeptic, subscription skeptic, no-card visitor, Russia, iPhone, Android, desktop, tablet | Clear product facts and platform-specific CTA | Real screenshots, verified review links, QR on desktop | “Can I trust this and install on my device?” | Store router/download chooser |
| `age_access` | 51–60: teenager, student, 35+, 50+, parent, teacher, HR, dyslexia, low vision, no headphones | Age-neutral language, readable layout, accessibility and silent-use answers | Responsive screens, text scaling/focus evidence, audio-optional truth | “Will this be comfortable and appropriate?” | Accessibility FAQ + download when supported |
| `life_content` | 61–70: series, games, social media, music, books, brain training, dating, friends, family abroad, creator | “Для себя” card with content/conversation examples | Real phrases from social/everyday contexts | “Is this relevant outside formal study?” | Relevant guide anchors + download |
| `money_privacy` | 71–80: Premium-ready, free-only, lifetime buyer, gift buyer, subscription-sensitive, limited internet, privacy-sensitive, no-registration, new phone, multilingual | Free-mode summary, Premium boundary, privacy and account FAQ | Current price link, cancellation/restore facts, local voice-processing proof | Cost, surprise charges, data use, continuity | Premium/gift/legal links plus download |
| `exam_profession` | 81–90: EGE, IELTS, TOEFL, medical student, doctor, hospitality, driver, nanny, retail, volunteer | “Учёба и профессия” disclosure, not a fake specialist course | Examples only where current content exists; explicit limitation otherwise | “Does this replace exam/professional training?” | Honest fit guide/FAQ + download as supplement when appropriate |
| `source_compare` | 91–100: ad visitor, article visitor, recommendation, returning visitor, Duolingo comparison, tutor comparison, video comparison, reinstalling user, unsure user, ready-to-install user | Message continuity and clear comparison | Method comparison, update/re-entry note, immediate CTA | Mismatch, duplication, decision paralysis | Source-relevant anchor + direct download |

Coverage acceptance rule:

```text
100 persona IDs present
+ every persona references one recognition module
+ every persona references one evidence module
+ every persona references one objection module
+ every persona ends at the download action or an explicit honest non-fit explanation
```

## 3. Final homepage information architecture

The order is fixed:

1. **Top navigation** — product anchors, guides, FAQ, and the only «Подобрать план» link.
2. **Universal hero** — one promise, one primary download CTA, real product screen.
3. **Trust strip** — free start, no registration, voice privacy; only verified facts.
4. **“Зачем вам английский?”** — six high-frequency cards: travel, work, move, speaking barrier, little time, for self.
5. **“Вот ваш первый урок”** — a three-step real product preview, not a generic feature list.
6. **“Подходит вашему уровню и ритму”** — zero/beginner/intermediate/advanced plus 5/15/30-minute expectations.
7. **“Почему фразы запоминаются”** — method, spaced repetition, pronunciation, simple explanations; no jargon-heavy sales copy.
8. **Segmented proof** — real reviews tagged by visitor problem: speaking, memory, time, clarity.
9. **Honest comparison** — Phraseman versus word cards, videos, Duolingo-style practice, and a tutor; explain complements and boundaries without attacking competitors.
10. **Trust and fit FAQ** — pricing/free mode, privacy, device/platform, age, sound, account continuity, exams, professional English, accessibility.
11. **Final download** — repeat «Скачать и начать первый урок» with platform routing.
12. **Footer** — legal, support, Premium, gift, guides; no plan CTA.

Canonical hero copy:

```text
Английский, на котором действительно говорят

Живые фразы, тренировка произношения и короткие уроки —
чтобы начать говорить, а не готовиться бесконечно.

[Скачать и начать первый урок]
Бесплатно · без регистрации · без карты · первый урок сразу
```

The exact timing claim (“30 секунд”, “3 минуты”, or another number) must be used only after verifying the current first-run path. Until then, use **«первый урок сразу»**.

## Task 0: Freeze product truth and create the RED coverage contract

**Files:**
- Read: `knowly-www/index.html`
- Read: `knowly-www/download/index.html`
- Read: `knowly-www/assets/start.js`
- Read: `knowly-www/assets/site.js`
- Read: `knowly-www/assets/stats.js`
- Read: `app/(tabs)/home.tsx`
- Read: `app/_layout.tsx`
- Read: `app/+native-intent.tsx`
- Create: `tests/fixtures/website_persona_coverage_v1.json`
- Create: `tests/website_persona_conversion_contract.test.ts`

- [ ] **Step 1: Record the scoped dirty state without changing it**

Run:

```powershell
git status --short -- knowly-www tests docs/superpowers/plans
git diff -- knowly-www/index.html knowly-www/download/index.html knowly-www/assets/start.js knowly-www/assets/site.js knowly-www/assets/stats.js
```

Expected: all existing user changes are known and preserved; no reset or cleanup is performed.

- [ ] **Step 2: Build the 100-row fixture**

Use this exact schema for every ID `1..100`:

```json
{
  "id": 1,
  "cluster": "travel",
  "recognition": "goal-travel",
  "evidence": "proof-first-lesson-travel",
  "objection": "fit-urgent-trip",
  "outcome": "download"
}
```

Allowed clusters are exactly:

```text
travel, work, move_speak, time_return, proof_platform,
age_access, life_content, money_privacy, exam_profession, source_compare
```

Populate the names and IDs from the ten ranges in the coverage table above. Do not store demographics, quiz answers, or persona IDs in browser analytics; this fixture is a build-time coverage contract only.

- [ ] **Step 3: Write the failing contract test**

The test must assert:

```ts
expect(personas).toHaveLength(100);
expect(personas.map((p) => p.id)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
expect(new Set(personas.map((p) => p.cluster))).toEqual(new Set(ALLOWED_CLUSTERS));

expect(home).toContain('Скачать и начать первый урок');
expect((home.match(/href="\/start\/"/g) ?? [])).toHaveLength(1);
expect(home).not.toMatch(/дуэл|duel|arena/i);
expect(download).not.toMatch(/дуэл|duel|arena/i);
expect(start).not.toMatch(/добавим дуэли|дуэли с реальными игроками/i);
```

Also assert every fixture module ID exists in the homepage or in an explicitly referenced guide/FAQ target. The contract must additionally require truthful league wording in `index.html`, `download/index.html`, `assets/start.js`, and `llms.txt`; removing duel copy must not erase the genuine weekly-league value.

- [ ] **Step 4: Verify RED**

Run:

```powershell
npx jest --runTestsByPath tests/website_persona_conversion_contract.test.ts --no-cache --runInBand
```

Expected: FAIL because the current hero CTA, duplicated `/start/` links, duel claims, and persona modules violate the approved contract.

- [ ] **Step 5: Commit only the fixture and RED contract when executing this task**

```powershell
git add tests/fixtures/website_persona_coverage_v1.json tests/website_persona_conversion_contract.test.ts
git diff --cached --check
git commit -m "test: define website persona conversion contract"
```

## Task 1: Remove inaccurate duel promises and correct funnel facts

**Files:**
- Modify: `knowly-www/index.html`
- Modify: `knowly-www/download/index.html`
- Modify: `knowly-www/assets/start.js`
- Modify if matches exist: `knowly-www/assets/site.js`
- Modify: `knowly-www/guides/english-15-minutes-a-day/index.html`
- Modify: `knowly-www/guides/how-to-learn-english/index.html`
- Modify if matches exist: `knowly-www/llms.txt`
- Modify if matches exist: `knowly-www/sitemap.xml`
- Test: `tests/website_persona_conversion_contract.test.ts`

- [ ] **Step 1: Inventory public claims**

Run:

```powershell
rg -n -i "дуэл|duel|arena|лиг|league|7 коротких вопросов|из 6" knowly-www -g "*.html" -g "*.js" -g "*.txt" -g "*.xml"
```

Expected: every public marketing claim is classified as remove, rewrite, or compatibility-only. The compatibility route `knowly-www/phraseman/duel/index.html`, `app.json`, `app/+native-intent.tsx`, and universal-link association files are not modified by this marketing-copy task.

- [ ] **Step 2: Replace only the inaccurate promise**

Approved replacements:

```text
«короткие уроки и дуэли с реальными игроками»
-> «короткие уроки и практика живой речи»

«Дуэли и лиги»
-> «Практика и прогресс»

«Серия, энергия, лиги и подарки»
-> keep league wording only if the current runtime verification passes;
   otherwise use «Серия, повторение и маленькие ежедневные цели»

«сразу добавим дуэли»
-> «сразу добавим больше разговорной практики»
```

The replacement table above is subordinate to the verified product truth: use **«Еженедельные лиги»** and explain that lesson XP moves the learner through weekly leagues and rewards. Do not replace the combined duel/league feature with generic repetition copy when that would erase the genuine league benefit.

Do not remove or hide genuine app leagues as a side effect.

- [ ] **Step 3: Correct the quiz count**

Change the intro and source comment from seven questions to six because `QUIZ.filter(step => step.type === 'q').length` currently returns six.

- [ ] **Step 4: Verify truth contract GREEN**

Run:

```powershell
npx jest --runTestsByPath tests/website_persona_conversion_contract.test.ts tests/website_privacy_consent_contract.test.ts --no-cache --runInBand
node --check knowly-www/assets/start.js
node --check knowly-www/assets/site.js
```

Expected: persona contract truth assertions and privacy consent contracts pass; JavaScript syntax exits `0`.

- [ ] **Step 5: Commit the truth correction separately**

```powershell
git add knowly-www/index.html knowly-www/download/index.html knowly-www/assets/start.js knowly-www/assets/site.js knowly-www/guides/english-15-minutes-a-day/index.html knowly-www/guides/how-to-learn-english/index.html knowly-www/llms.txt knowly-www/sitemap.xml tests/website_persona_conversion_contract.test.ts
git diff --cached --check
git commit -m "fix: align website promises with current product"
```

## Task 2: Establish one primary download action

**Files:**
- Modify: `knowly-www/index.html`
- Modify: `knowly-www/assets/phraseman.css`
- Modify: `knowly-www/assets/site.js`
- Modify: `knowly-www/download/index.html`
- Modify: `knowly-www/guides/index.html`
- Modify: `knowly-www/guides/how-to-learn-english/index.html`
- Modify: `knowly-www/guides/english-by-phrases/index.html`
- Modify: `knowly-www/guides/speaking-barrier/index.html`
- Modify: `knowly-www/guides/how-to-improve-english-pronunciation/index.html`
- Modify: `knowly-www/guides/english-phrases-for-travel/index.html`
- Modify: `knowly-www/guides/english-15-minutes-a-day/index.html`
- Test: `tests/website_persona_conversion_contract.test.ts`

- [ ] **Step 1: Extend the failing CTA contract**

Assert:

```ts
expect(home).toContain('<a class="cta" href="/start/">Подобрать план</a>');
expect((home.match(/href="\/start\/"/g) ?? [])).toHaveLength(1);
expect(home).not.toContain('quiz-cta');
expect(home).not.toContain('dock-cta');
expect(home).not.toContain('соберём план под вашу цель');
expect(home.match(/Скачать и начать первый урок/g)?.length).toBeGreaterThanOrEqual(2);
```

Require CTA placement identifiers `hero`, `after_first_lesson`, `after_proof`, and `final`.

Add a marketing-page scan which allows `/start/` only inside each page's top `<header>` navigation. Exclude `/start/`, `/premium/`, `/gift/`, and `/start/thanks/` transactional flows from this placement rule because their internal controls are part of an already-entered flow, not competing landing CTAs.

- [ ] **Step 2: Implement platform routing without blocking navigation**

Behavior must be exactly:

```text
iOS mobile -> App Store URL
Android mobile -> Google Play URL
desktop -> accessible store chooser with App Store, Google Play, and QR
unknown/no-JS -> /download/
```

Use the canonical store URLs from `window.KNOWLY_SITE`; do not duplicate new hardcoded URLs.

- [ ] **Step 3: Remove competing plan entry points**

Preserve `/start/` only in the desktop/mobile top navigation on public marketing pages. Remove or replace plan links in the homepage hero, demo, final pitch, quick dock, mobile sticky area, footer marketing copy, guides index, and all seven current guide articles. Do not delete the `/start/` route or change internal quiz, checkout, gift, Premium, or thank-you controls.

On mobile, the top-navigation plan link must remain reachable through the header menu/overflow. It must not return as a bottom dock or sticky competing CTA.

- [ ] **Step 4: Apply interaction/accessibility rules**

- primary CTA minimum height: `56px`;
- every interactive target at least `44x44px`;
- dark text/icons on bright green/lime CTA surfaces;
- visible focus style;
- no layout-shifting hover scale;
- CTA visible in the first `375x667` viewport;
- QR hidden on mobile;
- `prefers-reduced-motion` respected.

- [ ] **Step 5: Verify CTA GREEN**

Run:

```powershell
npx jest --runTestsByPath tests/website_persona_conversion_contract.test.ts tests/web_admin_runtime_fallback_audit.test.ts --no-cache --runInBand
node --check knowly-www/assets/site.js
```

Expected: exactly one `/start/` homepage link remains and every primary action is a download action.

- [ ] **Step 6: Commit the CTA hierarchy**

```powershell
git add knowly-www/index.html knowly-www/download/index.html knowly-www/assets/phraseman.css knowly-www/assets/site.js knowly-www/guides/index.html knowly-www/guides/how-to-learn-english/index.html knowly-www/guides/english-by-phrases/index.html knowly-www/guides/speaking-barrier/index.html knowly-www/guides/how-to-improve-english-pronunciation/index.html knowly-www/guides/english-phrases-for-travel/index.html knowly-www/guides/english-15-minutes-a-day/index.html tests/website_persona_conversion_contract.test.ts
git diff --cached --check
git commit -m "feat: make first lesson the primary website action"
```

## Task 3: Build the six high-frequency recognition paths

**Files:**
- Modify: `knowly-www/index.html`
- Modify: `knowly-www/assets/phraseman.css`
- Create: `knowly-www/assets/landing-goals.js`
- Create: `knowly-www/guides/english-for-work/index.html`
- Create: `knowly-www/guides/english-for-moving-abroad/index.html`
- Modify: `knowly-www/guides/index.html`
- Modify: `knowly-www/sitemap.xml`
- Create: `tests/website_goal_selector_core.test.ts`
- Test: `tests/website_persona_conversion_contract.test.ts`

- [ ] **Step 1: Add failing module-presence tests**

Required recognition IDs:

```text
goal-travel
goal-work
goal-move
goal-speak
goal-time
goal-self
goal-study-profession
```

Each card must contain a concrete situation, one sample phrase or outcome, an accessible name, and a route to supporting evidence. It must not contain a plan CTA.

- [ ] **Step 2: Implement a calm six-card grid**

Desktop uses `3x2`; mobile uses a single column or accessible horizontal list with no auto-rotation. Cards are links or buttons only when they perform navigation or disclosure. Use SVG icons from one consistent set; do not use emoji as interface icons.

`landing-goals.js` must use an allowlisted, data-driven configuration for exactly `travel|work|move|speak|time|self`. Selecting a goal changes only the short result, three example situations, and linked evidence; it must not rebuild the whole page, move the primary CTA, or hide general content. Support `?goal=<allowlisted-value>` for message continuity from campaigns, use a neutral fallback for any other value, and keep a user's click only in session storage. Never accept or render arbitrary URL text as HTML.

- [ ] **Step 3: Add two missing high-intent guides**

`english-for-work` must cover interview, meetings, calls, chat, client communication, and the honest boundary for specialist vocabulary.

`english-for-moving-abroad` must cover housing, doctor, school, bank, transport, and the honest boundary for legal/immigration advice.

Every guide ends with **«Скачать и начать первый урок»** and links back to relevant homepage evidence. «Подобрать план» may appear only in that guide's top header navigation.

- [ ] **Step 4: Verify section and sitemap contracts**

Run:

```powershell
npx jest --runTestsByPath tests/website_persona_conversion_contract.test.ts tests/website_goal_selector_core.test.ts --no-cache --runInBand
node --check knowly-www/assets/landing-goals.js
```

Expected: personas `1..40`, `61..70`, and relevant `81..90` all resolve to a recognition module and evidence destination.

- [ ] **Step 5: Commit recognition paths**

```powershell
git add knowly-www/index.html knowly-www/assets/phraseman.css knowly-www/assets/landing-goals.js knowly-www/guides/english-for-work/index.html knowly-www/guides/english-for-moving-abroad/index.html knowly-www/guides/index.html knowly-www/sitemap.xml tests/website_persona_conversion_contract.test.ts tests/website_goal_selector_core.test.ts
git diff --cached --check
git commit -m "feat: add goal-based website entry paths"
```

## Task 4: Show the real first lesson and product evidence

**Files:**
- Modify: `knowly-www/index.html`
- Modify: `knowly-www/assets/phraseman.css`
- Modify only if needed: `knowly-www/assets/demo.js`
- Create: `knowly-www/assets/phraseman-first-lesson-phrase.webp`
- Create: `knowly-www/assets/phraseman-first-lesson-build.webp`
- Create: `knowly-www/assets/phraseman-first-lesson-feedback.webp`
- Test: `tests/website_persona_conversion_contract.test.ts`

- [ ] **Step 1: Select evidence from the current app**

Capture and compress these three real states from the current app:

```text
phraseman-first-lesson-phrase.webp   -> see/hear a useful phrase
phraseman-first-lesson-build.webp    -> build or say the phrase
phraseman-first-lesson-feedback.webp -> receive simple corrective feedback and continue
```

Do not create screens that the released app does not contain. Preserve explicit image dimensions and use compressed WebP/AVIF where supported.

- [ ] **Step 2: Build the `proof-first-lesson` sequence**

The block must answer in under ten seconds of scanning:

- what the visitor does;
- what feedback they receive;
- what the next step is;
- why this helps them speak rather than memorize isolated words.

Include tailored evidence anchors for travel, work, speaking fear, and no-time visitors without duplicating the whole section.

- [ ] **Step 3: Keep the proof accessible and fast**

- no autoplay audio;
- no microphone permission on page load;
- descriptive alt text for product images;
- meaningful content visible without JavaScript;
- no horizontal overflow at `375px`;
- no content hidden permanently when motion libraries fail.

- [ ] **Step 4: Verify proof coverage**

Run:

```powershell
npx jest --runTestsByPath tests/website_persona_conversion_contract.test.ts --no-cache --runInBand
```

Expected: all 100 fixture rows resolve to a real evidence module or an honest limitation disclosure.

- [ ] **Step 5: Commit product evidence**

```powershell
git add knowly-www/index.html knowly-www/assets/phraseman.css knowly-www/assets/demo.js knowly-www/assets/phraseman-first-lesson-phrase.webp knowly-www/assets/phraseman-first-lesson-build.webp knowly-www/assets/phraseman-first-lesson-feedback.webp tests/website_persona_conversion_contract.test.ts
git diff --cached --check
git commit -m "feat: show the real first lesson on the website"
```

## Task 5: Resolve the ten major objection families

**Files:**
- Modify: `knowly-www/index.html`
- Modify: `knowly-www/assets/phraseman.css`
- Modify: `knowly-www/guides/index.html`
- Modify only if current facts require synchronization: `knowly-www/premium/index.html`
- Test: `tests/website_persona_conversion_contract.test.ts`
- Test: `tests/website_privacy_consent_contract.test.ts`

- [ ] **Step 1: Add the level/time fit module**

Four level states:

```text
Почти с нуля
Понимаю, но не говорю
Говорю с ошибками
Уверенно — нужна практика
```

Three time states:

```text
5–10 минут
15 минут
30+ минут
```

Copy must give realistic use patterns, not guaranteed outcomes.

- [ ] **Step 2: Add an honest comparison table**

Rows:

```text
Phraseman
карточки слов
видео/соцсети
игровое языковое приложение
репетитор/курс
```

Columns:

```text
готовые фразы
обратная связь по речи
короткая ежедневная практика
живой преподаватель
экзаменационная программа
```

Use text plus icons; color must not be the only signal. State clearly that Phraseman does not replace a live teacher or a full specialist exam course where those capabilities do not exist.

- [ ] **Step 3: Expand categorized FAQ**

Required categories and topics:

- `start`: free mode, registration, first lesson, level;
- `speech`: microphone, voice privacy, headphones, accent;
- `payment`: Premium, cancellation, lifetime, gift, Russia;
- `device`: iOS, Android, tablet only if verified, new phone/account continuity;
- `fit`: age, parent/teacher, accessibility, exam, professional English;
- `method`: phrases versus words, forgetting, returning after a break, advanced practice.

- [ ] **Step 4: Verify objection coverage**

Run:

```powershell
npx jest --runTestsByPath tests/website_persona_conversion_contract.test.ts tests/website_privacy_consent_contract.test.ts --no-cache --runInBand
```

Expected: every fixture objection ID maps to an existing FAQ, comparison, trust, level, or time module; privacy contracts remain green.

- [ ] **Step 5: Commit objection resolution**

```powershell
git add knowly-www/index.html knowly-www/assets/phraseman.css knowly-www/guides/index.html knowly-www/premium/index.html tests/website_persona_conversion_contract.test.ts tests/website_privacy_consent_contract.test.ts
git diff --cached --check
git commit -m "feat: resolve website install objections"
```

## Task 6: Add privacy-safe intent and CTA measurement

**Risk:** This task touches analytics/privacy contracts. Route implementation and review at the project's critical-domain floor. Do not use visitor persona IDs, quiz answers, free text, fingerprints, email, UID, or advertising IDs.

**Files:**
- Modify: `knowly-www/assets/stats.js`
- Modify: `functions/src/site_stats.ts`
- Modify: `functions/src/site_stats.test.ts`
- Modify: `tests/website_privacy_consent_contract.test.ts`
- Modify: `tests/firebase_cost_controls_contract.test.ts`
- Test: `tests/website_persona_conversion_contract.test.ts`

- [ ] **Step 1: Define the strict allowlist**

Only these new dimensions are permitted:

```ts
type IntentCluster =
  | 'travel' | 'work' | 'move_speak' | 'time_return' | 'proof_platform'
  | 'age_access' | 'life_content' | 'money_privacy'
  | 'exam_profession' | 'source_compare' | 'unselected';

type DownloadPlacement = 'hero' | 'after_first_lesson' | 'after_proof' | 'final';
```

Event names:

```text
website_intent_view
website_download_intent
click_ios
click_android
```

- [ ] **Step 2: Write failing parser and aggregation tests**

Reject unknown event fields and values. Preserve existing aggregate/cost controls. Consent rules must remain at least as strict as the existing implementation.

- [ ] **Step 3: Implement non-blocking measurement**

Use `sendBeacon` with `fetch(..., { keepalive: true })` fallback. Navigation must proceed even when analytics fails. Aggregate by day, page, placement, platform, and allowlisted intent cluster; do not store raw visitor records for this feature.

- [ ] **Step 4: Verify analytics/privacy GREEN**

Run:

```powershell
npx jest --runTestsByPath tests/website_privacy_consent_contract.test.ts tests/firebase_cost_controls_contract.test.ts tests/website_persona_conversion_contract.test.ts --no-cache --runInBand
Push-Location functions
npx jest --runTestsByPath src/site_stats.test.ts --no-cache --runInBand
Pop-Location
node --check knowly-www/assets/stats.js
```

Expected: all focused tests pass, unknown fields are rejected, and navigation remains independent of telemetry.

- [ ] **Step 5: Commit measurement separately**

```powershell
git add knowly-www/assets/stats.js functions/src/site_stats.ts functions/src/site_stats.test.ts tests/website_privacy_consent_contract.test.ts tests/firebase_cost_controls_contract.test.ts tests/website_persona_conversion_contract.test.ts
git diff --cached --check
git commit -m "feat: measure website intent and download placement"
```

## Task 7: Responsive, accessibility, SEO, and visual verification

**Files:**
- Create: `scripts/serve-knowly-www-e2e.cjs`
- Create: `playwright.website.config.ts`
- Create: `tests/e2e/website/persona-landing.spec.ts`
- Modify: `knowly-www/index.html`
- Modify: `knowly-www/assets/phraseman.css`
- Modify: `knowly-www/sitemap.xml`
- Modify: `knowly-www/llms.txt`

- [ ] **Step 1: Add browser journeys**

`scripts/serve-knowly-www-e2e.cjs` must serve only `knowly-www/` on `127.0.0.1:4174`, resolve directory requests to `index.html`, use correct HTML/CSS/JS/image MIME types, reject path traversal, and write no files. `playwright.website.config.ts` must use that command as its `webServer`, store screenshots/traces only under `qa-artifacts/website-persona-conversion/`, and run with one worker.

Test at `375`, `390`, `430`, `768`, `1024`, and `1440` pixels:

```text
top navigation has the only plan link
hero CTA is visible and actionable
iOS/Android/desktop routing is correct
all six goal cards are keyboard reachable
first-lesson proof is readable without JS animation
FAQ is keyboard usable
final download CTA is visible
no horizontal overflow
consent banner does not cover the CTA
reduced motion shows all content
```

- [ ] **Step 2: Add SEO truth assertions**

Title, meta description, Open Graph, JSON-LD, `llms.txt`, and sitemap must use current product truth and the direct-download promise. No duel/Arena promise may remain in public marketing metadata.

- [ ] **Step 3: Run focused deterministic gates**

```powershell
npx jest --runTestsByPath tests/website_persona_conversion_contract.test.ts tests/website_privacy_consent_contract.test.ts tests/firebase_cost_controls_contract.test.ts --no-cache --runInBand
node --check scripts/serve-knowly-www-e2e.cjs
npx playwright test --config playwright.website.config.ts
node --check knowly-www/assets/site.js
node --check knowly-www/assets/start.js
node --check knowly-www/assets/stats.js
git diff --check
```

Expected: Jest and Playwright exit `0`, no JavaScript syntax error, no whitespace error.

- [ ] **Step 4: Perform the visual gate**

Create ignored screenshots/contact sheets under `qa-artifacts/website-persona-conversion/`. Review:

- hierarchy and one dominant CTA;
- real product evidence;
- no clutter from the ten-cluster system;
- readable text and manual line breaks at narrow widths;
- dark foreground on any bright green/lime surface;
- no plan CTA outside the header;
- no fake or stale claim.

- [ ] **Step 5: Commit verification infrastructure and final corrections**

```powershell
git add scripts/serve-knowly-www-e2e.cjs playwright.website.config.ts tests/e2e/website/persona-landing.spec.ts knowly-www/index.html knowly-www/assets/phraseman.css knowly-www/sitemap.xml knowly-www/llms.txt
git diff --cached --check
git commit -m "test: verify website persona conversion experience"
```

## Task 8: Preview, measure, and release safely

**Files:**
- Read: `firebase.json`
- Read: `package.json`
- Write ignored evidence only: `qa-artifacts/website-persona-conversion/`

- [ ] **Step 1: Build a release checklist from actual changes**

Confirm:

```text
100/100 persona rows covered
one /start/ link on homepage
zero duel/Arena marketing claims
direct first-lesson CTA at four placements
all focused tests green
desktop/mobile/reduced-motion screenshots approved
no unrelated dirty files staged
```

- [ ] **Step 2: Preview before production**

Use a Firebase Hosting preview channel or equivalent non-production static preview. Do not deploy Cloud Functions merely for copy/layout changes. If Task 6 changes the event schema, deploy the compatible backend before the website begins sending the new fields.

- [ ] **Step 3: Verify the preview**

Repeat store-link routing, top-nav plan link, consent, FAQ, and responsive checks on the preview URL. Do not submit payments, emails, or live support forms.

- [ ] **Step 4: Production release requires explicit owner authorization**

Command after approval:

```powershell
npm run hosting:knowly-www
```

Expected: only Firebase Hosting target `knowlywww` is deployed for static-site-only work.

- [ ] **Step 5: Observe without declaring a winner early**

Primary metric:

```text
unique store clicks / unique eligible homepage visits
```

Secondary diagnostics:

```text
store clicks by platform
store clicks by CTA placement
store clicks by allowlisted intent cluster
goal-card engagement
FAQ engagement
```

Compare at least one complete weekly traffic cycle. Do not call a conversion winner from a few clicks. The first decision is whether visitors reach the store more often without harming consent, performance, or support behavior.

## 4. Definition of done

The work is complete only when all conditions are true:

1. Every public marketing page contains `/start/` only in its top navigation; the homepage contains exactly one such link. Transactional `/start/`, Premium, gift, and thank-you flows keep their internal controls.
2. Every other primary CTA says **«Скачать и начать первый урок»** and routes appropriately by platform.
3. Public marketing contains no inaccurate Arena/duel/real-player promise.
4. The quiz truthfully says six questions and contains no duel promise.
5. The 100-row fixture covers IDs `1..100` exactly once.
6. Every row maps to recognition, evidence, objection handling, and a download or honest non-fit outcome.
7. The homepage remains a focused page, not a 100-card directory.
8. Genuine leagues remain truthfully represented, and all unrelated existing functionality remains preserved.
9. New guide content makes no unverified product or outcome claim.
10. Accessibility, responsive, privacy, cost, syntax, and browser gates pass with fresh evidence.
11. Production is not deployed without explicit owner authorization.

## 5. Recommended delivery order

| Release | Scope | User-visible result | Risk |
|---|---|---|---|
| R1 | Tasks 0–2 | Truthful copy and one dominant direct-download CTA | Low–medium |
| R2 | Tasks 3–5 | All ten persona clusters recognized with proof and objection handling | Medium |
| R3 | Task 6 | Privacy-safe intent/placement measurement | High: analytics/privacy |
| R4 | Tasks 7–8 | Responsive proof, preview, controlled production release | Medium–high: release |

R1 is the fastest conversion correction and must not wait for the longer content program. R2 completes the 100-persona promise. R3 is optional for page usefulness but required to learn which paths produce store clicks. R4 is mandatory before any completion or production claim.
