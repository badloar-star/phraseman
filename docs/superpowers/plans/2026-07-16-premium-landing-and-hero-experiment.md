# Premium Landing and Hero Experiment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the overloaded Phraseman homepage with a premium, mobile-first landing page whose single primary action is downloading the app, while safely comparing a phone-led hero against a typography-led hero from Admin V2.

**Architecture:** One semantic homepage DOM is styled through an early, stable `phone|minimal` assignment. A same-origin public config endpoint exposes only the audited Remote Config experiment settings. Consent-aware client telemetry sends a strict allowlisted event envelope to the existing site-stats function, which deduplicates anonymous experiment events and maintains aggregate counters. Admin V2 reads a server-produced report and publishes changes only through the existing revision-checked Remote Config workflow.

**Tech Stack:** Static HTML/CSS/JavaScript, self-hosted GSAP 3.15.0 + ScrollTrigger + SplitText, Firebase Hosting, Firebase Cloud Functions v2, Firestore, TypeScript/Jest, Playwright, Lighthouse.

---

## Orbit execution packet

- **Scope:** `knowly-www` homepage, the narrow landing experiment backend, and its focused Admin V2 control surface.
- **Risk routing:** R2 for isolated layout/motion; R3 for cross-surface integration; R4 for consent, deduplication, experiment math, activation, and rollback.
- **Writer rule:** one implementation writer at a time; any parallel agents are read-only reviewers.
- **Preservation rule:** keep every existing route, below-the-fold capability, theme toggle, legal link, download page, and `/start/` flow unless this plan explicitly relocates it.
- **Dirty-tree rule:** stage only exact files named by the current task; never clean, reset, or absorb unrelated changes.
- **Authoritative design:** `docs/superpowers/specs/2026-07-16-premium-landing-and-hero-experiment-design.md`.
- **Experiment contract:** ID `landing_hero_v1`; variants `phone|minimal`; modes `experiment|paused|phone|minimal`.
- **Primary metric:** unique store clicks divided by unique experiment impressions.
- **Stop rule:** no winner before the predetermined sample and seven complete UTC days; no automatic winner or automatic activation.

## Task 0: Freeze the baseline and test seams

**Files:**
- Read: `knowly-www/index.html`
- Read: `knowly-www/assets/site-config.js`
- Read: `knowly-www/assets/stats.js`
- Read: `functions/src/site_stats.ts`
- Read: `functions/src/admin_remote_config.ts`
- Read: `admin/v2/scripts/admin-core.js`
- Read: `admin/v2/scripts/admin-firebase.js`
- Read: `admin/v2/scripts/admin-capabilities.js`
- Read: `docs/design/ADMIN_UI_BIBLE.md`
- Create: `tests/landing_premium_contract.test.ts`

- [ ] **Step 1: Record the exact relevant dirty state**

Run:

```powershell
git status --short -- knowly-www functions/src/site_stats.ts functions/src/index.ts functions/src/admin_remote_config.ts firebase.json admin/v2 admin/site.html tests
git diff -- knowly-www/index.html knowly-www/assets/site-config.js knowly-www/assets/stats.js functions/src/site_stats.ts functions/src/index.ts firebase.json admin/v2/scripts/admin-core.js admin/v2/scripts/admin-firebase.js admin/v2/scripts/admin-capabilities.js
```

Expected: the command identifies any pre-existing edits that must be preserved. Save no generated report in tracked source.

- [ ] **Step 2: Trace the existing user path and dependency path**

Confirm:

```text
homepage CTA -> store or /download/
stats.js -> /api/site-stats -> siteStatsTrack -> Firestore aggregates
Admin V2 -> adminGetRemoteConfigWorkspace/adminPublishRemoteConfig -> audited history/rollback
```

Expected: no new direct browser Firestore write and no replacement of the existing Remote Config audit flow.

- [ ] **Step 3: Write a failing source contract**

The first test must assert that the final homepage will contain:

```ts
expect(home).toContain('data-landing-hero');
expect(home).toContain('Скачать Phraseman бесплатно');
expect(home).toContain('assets/landing-premium.css');
expect(home).toContain('assets/landing-experiment.js');
expect(home).toContain('assets/landing-download.js');
expect(home).toContain('assets/landing-motion.js');
expect(home).not.toContain('assets/fx.js');
```

Also assert four CTA placements (`hero`, `sticky`, `product_story`, `final`), one semantic hero, a native `<dialog>`, the existing navigation destinations, and no legacy homepage dock.

- [ ] **Step 4: Verify red**

Run: `npx jest --runTestsByPath tests/landing_premium_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the new homepage contract does not exist.

- [ ] **Step 5: Commit only the test if Task 0 is executed as a standalone slice**

```powershell
git add tests/landing_premium_contract.test.ts
git diff --cached --check
git commit -m "test: define premium landing contract"
```

## Task 1: Build the deterministic client experiment core

**Files:**
- Create: `knowly-www/assets/landing-experiment-core.js`
- Create: `tests/landing_experiment_core.test.ts`

- [ ] **Step 1: Write failing unit tests for normalization and assignment**

Cover:

```ts
expect(normalizeConfig({ mode: 'experiment', experimentId: 'landing_hero_v1', phonePercent: 50 })).toEqual({
  mode: 'experiment', experimentId: 'landing_hero_v1', phonePercent: 50,
});
expect(normalizeConfig({ mode: 'oops', phonePercent: 999 })).toMatchObject({ mode: 'paused', phonePercent: 50 });
expect(assignVariant('stable-token', 50)).toBe(assignVariant('stable-token', 50));
expect(resolveVariant({ mode: 'phone' }, 'x')).toBe('phone');
expect(resolveVariant({ mode: 'minimal' }, 'x')).toBe('minimal');
expect(resolveVariant({ mode: 'paused' }, 'x')).toMatch(/^(phone|minimal)$/);
expect(shouldReport({ mode: 'experiment' })).toBe(true);
expect(shouldReport({ mode: 'paused' })).toBe(false);
```

Also test the exact event names, allowed variants, placements, platforms, cache expiry, and timeout constants.

- [ ] **Step 2: Verify red**

Run: `npx jest --runTestsByPath tests/landing_experiment_core.test.ts --no-cache --runInBand`

Expected: FAIL because the pure experiment core is absent.

- [ ] **Step 3: Implement a dependency-free UMD core**

Requirements:

- expose pure functions for Node tests and browser use;
- use a deterministic non-cryptographic bucket only for variant assignment;
- clamp allocation to `0..100` and fail malformed config to `paused`;
- define `CONFIG_TIMEOUT_MS = 250` and `CONFIG_CACHE_MS = 300000`;
- never include email, UID, IP, user-agent, page text, or arbitrary properties in event payloads;
- accept only `landing_hero_experiment_impression`, `landing_download_intent`, and `landing_store_click`.

- [ ] **Step 4: Verify green**

Run: `npx jest --runTestsByPath tests/landing_experiment_core.test.ts --no-cache --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit the pure core**

```powershell
git add knowly-www/assets/landing-experiment-core.js tests/landing_experiment_core.test.ts
git diff --cached --check
git commit -m "feat: add deterministic landing experiment core"
```

## Task 2: Vendor the animation runtime without a supply-chain runtime dependency

**Files:**
- Create: `scripts/vendor-gsap-landing.mjs`
- Create: `knowly-www/assets/vendor/gsap/gsap.min.js`
- Create: `knowly-www/assets/vendor/gsap/ScrollTrigger.min.js`
- Create: `knowly-www/assets/vendor/gsap/SplitText.min.js`
- Create: `knowly-www/assets/vendor/gsap/LICENSE`

- [ ] **Step 1: Add a deterministic vendor script**

The script must:

- consume an explicitly unpacked `gsap@3.15.0` source directory;
- copy only the four allowlisted files;
- verify expected filenames and refuse an unknown version;
- write nothing outside `knowly-www/assets/vendor/gsap`.

- [ ] **Step 2: Acquire and copy the pinned package**

Run:

```powershell
npm pack gsap@3.15.0 --pack-destination .codex-tmp/gsap-landing
node scripts/vendor-gsap-landing.mjs .codex-tmp/gsap-landing/package
```

Expected: local assets exist; `package.json` and lockfiles remain unchanged.

- [ ] **Step 3: Verify syntax and provenance**

Run:

```powershell
node --check scripts/vendor-gsap-landing.mjs
node --check knowly-www/assets/vendor/gsap/gsap.min.js
node --check knowly-www/assets/vendor/gsap/ScrollTrigger.min.js
node --check knowly-www/assets/vendor/gsap/SplitText.min.js
git status --short -- package.json package-lock.json knowly-www/assets/vendor/gsap scripts/vendor-gsap-landing.mjs
```

Expected: JavaScript syntax passes and no package manifest was modified by this task.

- [ ] **Step 4: Commit vendored motion assets**

```powershell
git add scripts/vendor-gsap-landing.mjs knowly-www/assets/vendor/gsap
git diff --cached --check
git commit -m "build: vendor landing motion runtime"
```

## Task 3: Implement early assignment and consent-aware telemetry

**Files:**
- Create: `knowly-www/assets/landing-experiment.js`
- Modify: `knowly-www/assets/site-config.js`
- Modify: `knowly-www/assets/stats.js`
- Modify: `tests/landing_experiment_core.test.ts`

- [ ] **Step 1: Extend failing browser-state tests**

Test with a small fake DOM/storage/fetch harness:

- cached config applies synchronously;
- network config may decide only within 250 ms;
- late config never changes the variant on the current page;
- `?heroPreview=phone|minimal` forces a non-persistent, non-reporting preview;
- session assignment works before consent;
- consent promotes the same anonymous token to local storage;
- `paused`, forced modes, preview, and denied consent never report;
- `html[data-hero-variant]` is set before hero image loading;
- minimal never sets the hero phone `src`.

- [ ] **Step 2: Verify red**

Run: `npx jest --runTestsByPath tests/landing_experiment_core.test.ts --no-cache --runInBand`

Expected: FAIL on the new browser-state cases.

- [ ] **Step 3: Implement the early bootstrap**

Load order in `<head>` will be `site-config.js`, `landing-experiment-core.js`, then `landing-experiment.js`. The bootstrap must:

- read five-minute cached public config first;
- fetch `window.KNOWLY_CONFIG.landingExperimentConfigEndpoint` with a 250 ms decision deadline;
- create a stable anonymous random token, not a fingerprint;
- keep the first resolved variant for the whole document lifetime;
- set `data-hero-variant`, `data-hero-mode`, and `data-hero-experiment-id` on `<html>`;
- preload/assign the phone image only for `phone`;
- emit at most one eligible impression after consent becomes measurable.

- [ ] **Step 4: Extend the stats façade**

Add without breaking legacy counters or Meta Pixel:

```js
window.KNOWLY_STATS.measurementAllowed()
window.KNOWLY_STATS.measurementState()
window.KNOWLY_STATS.sendExperiment(event)
```

Dispatch `knowly:consentchange` whenever state resolves or changes. Set `html[data-consent-visible]` while the banner is open so the sticky CTA can yield.

- [ ] **Step 5: Verify green and compatibility**

Run:

```powershell
npx jest --runTestsByPath tests/landing_experiment_core.test.ts --no-cache --runInBand
node --check knowly-www/assets/landing-experiment-core.js
node --check knowly-www/assets/landing-experiment.js
node --check knowly-www/assets/site-config.js
node --check knowly-www/assets/stats.js
```

Expected: PASS; legacy counter calls still exist.

- [ ] **Step 6: Commit the browser experiment seam**

```powershell
git add knowly-www/assets/landing-experiment-core.js knowly-www/assets/landing-experiment.js knowly-www/assets/site-config.js knowly-www/assets/stats.js tests/landing_experiment_core.test.ts
git diff --cached --check
git commit -m "feat: bootstrap consent-aware landing experiment"
```

## Task 4: Rebuild the homepage as one premium semantic composition

**Files:**
- Modify: `knowly-www/index.html`
- Create: `knowly-www/assets/landing-premium.css`
- Create: `knowly-www/assets/landing-download.js`
- Modify: `tests/landing_premium_contract.test.ts`

- [ ] **Step 1: Expand the failing source contract**

Assert the exact hero copy:

```text
Заговорите по-английски.
По-настоящему.
Живые фразы, тренировка произношения и короткие уроки — чтобы начать говорить, а не продолжать готовиться.
Скачать Phraseman бесплатно
Без карты · первый урок сразу
```

Assert the section order:

```text
hero -> proof -> product story -> feature chapters -> pronunciation demo ->
how it works -> realistic timeline -> reviews -> guides -> FAQ -> final download -> footer
```

Assert that `/start/` remains a quiet secondary action below the fold, every existing footer/legal route remains present, and the homepage no longer loads the shared legacy `phraseman.css` or `fx.js`.

- [ ] **Step 2: Verify red**

Run: `npx jest --runTestsByPath tests/landing_premium_contract.test.ts --no-cache --runInBand`

Expected: FAIL on the new semantic structure.

- [ ] **Step 3: Write accessible, progressive HTML**

Use one hero DOM for both variants. Requirements:

- correct heading order, landmarks, skip link, accessible navigation, and visible focus;
- real `<button>` for dialog controls and real links for navigation/download targets;
- a native `<dialog>` containing App Store, Google Play, QR, close control, and an explanatory title;
- the phone element uses existing `assets/phraseman-screen-home.webp`, but has no eager `src` in minimal mode;
- no content depends on JavaScript or GSAP to become visible;
- no fabricated awards, user counts, or performance claims.

- [ ] **Step 4: Build the mobile-first visual system**

Core tokens:

```css
--paper: #ffffff;
--paper-soft: #f5f5f2;
--ink: #111111;
--muted: #686868;
--gold: #b88a22;
--cta: #111111;
```

Requirements:

- system font stack, restrained gold detail, generous whitespace, maximum readable line lengths;
- hero `min-height: calc(100svh - var(--header-height))` where practical;
- primary CTA height at least 56 px; every target at least 44×44 px;
- CTA remains in the first 375×667 viewport;
- safe-area padding, no horizontal overflow, no mobile QR, no mobile pinned scene;
- `phone` lets the device yield below/behind copy on narrow screens;
- `minimal` centers the typography without leaving a visual hole;
- sticky download CTA hides near final CTA, while dialog is open, and while consent is visible;
- dark text/icons on any bright lime/green surface.

- [ ] **Step 5: Implement download routing**

`landing-download.js` must:

- route iOS directly to `storeIos`;
- route Android directly to `storeAndroid`;
- open the download dialog on desktop with `/download/` as the no-JS fallback;
- trap focus through native dialog behavior, restore trigger focus, close on Escape;
- emit `landing_download_intent` and `landing_store_click` only through the telemetry façade;
- tag placement exactly as `hero|sticky|product_story|final`.

- [ ] **Step 6: Verify contract and syntax**

Run:

```powershell
npx jest --runTestsByPath tests/landing_premium_contract.test.ts tests/landing_experiment_core.test.ts --no-cache --runInBand
node --check knowly-www/assets/landing-download.js
```

Expected: PASS.

- [ ] **Step 7: Commit the static premium page**

```powershell
git add knowly-www/index.html knowly-www/assets/landing-premium.css knowly-www/assets/landing-download.js tests/landing_premium_contract.test.ts
git diff --cached --check
git commit -m "feat: rebuild premium download landing"
```

## Task 5: Add motion as an enhancement, not a loading gate

**Files:**
- Create: `knowly-www/assets/landing-motion.js`
- Modify: `knowly-www/index.html`
- Modify: `knowly-www/assets/landing-premium.css`
- Modify: `tests/landing_premium_contract.test.ts`

- [ ] **Step 1: Add failing motion/accessibility contracts**

Assert:

- vendored GSAP scripts load with `defer` before `landing-motion.js`;
- the stylesheet has `prefers-reduced-motion: reduce` coverage;
- no base selector sets meaningful content to permanently hidden;
- mobile CSS disables pinned/horizontal storytelling;
- the motion script checks GSAP/plugin availability and exits safely.

- [ ] **Step 2: Verify red**

Run: `npx jest --runTestsByPath tests/landing_premium_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the motion enhancement is absent.

- [ ] **Step 3: Implement the premium reveal sequence**

Register `ScrollTrigger` and `SplitText`. Use:

- an approximately 1.1 second hero sequence: eyebrow, split headline lines, lead, CTA, proof note, then phone if present;
- SplitText line masks with accessible original text and `autoSplit` for responsive reflow;
- `ScrollTrigger.batch` for once-only below-fold reveals;
- subtle transforms and opacity only; no decorative continuous loops;
- optional phone pin/parallax only at `min-width: 1024px` and only when motion is allowed;
- a complete teardown/rebuild on relevant media changes;
- immediate visible fallback when GSAP or any plugin is unavailable.

- [ ] **Step 4: Verify syntax and reduced-motion fallback**

Run:

```powershell
npx jest --runTestsByPath tests/landing_premium_contract.test.ts --no-cache --runInBand
node --check knowly-www/assets/landing-motion.js
```

Expected: PASS.

- [ ] **Step 5: Commit motion separately for bounded rollback**

```powershell
git add knowly-www/index.html knowly-www/assets/landing-premium.css knowly-www/assets/landing-motion.js tests/landing_premium_contract.test.ts
git diff --cached --check
git commit -m "feat: add accessible premium landing motion"
```

## Task 6: Add strict backend experiment contracts and privacy guards

**Files:**
- Create: `functions/src/landing_experiment.ts`
- Create: `functions/src/landing_experiment.test.ts`
- Modify: `functions/src/site_stats.ts`
- Modify: `functions/src/site_stats.test.ts`

- [ ] **Step 1: Write failing parser, dedupe, and math tests**

Cover:

```ts
expect(parseLandingEvent(validStoreClick)).toEqual(validStoreClick);
expect(() => parseLandingEvent({ ...validStoreClick, email: 'x@example.com' })).toThrow('invalid_event_fields');
expect(() => parseLandingEvent({ ...validStoreClick, placement: 'navbar' })).toThrow('invalid_event_placement');
expect(dedupeId(validStoreClick)).toMatch(/^[a-f0-9]{64}$/);
expect(buildCounterPatch('phone', 'landing_store_click')).toEqual({ phoneStoreClicks: 1 });
expect(requiredSamplePerVariant({ baseline: 0.05, relativeMde: 0.2, alpha: 0.05, power: 0.8 })).toBeGreaterThan(0);
expect(twoProportionReport(equalCounts).winner).toBe(null);
```

Test unknown keys, wrong experiment ID, malformed anonymous token, forced/paused reporting, expiry creation, repeat event behavior, transaction atomicity, and home-specific legacy click buckets.

- [ ] **Step 2: Verify red**

Run:

```powershell
Push-Location functions
npx jest --runTestsByPath src/landing_experiment.test.ts src/site_stats.test.ts --no-cache --runInBand
Pop-Location
```

Expected: FAIL because experiment parsing and counters are absent.

- [ ] **Step 3: Implement a strict allowlisted envelope**

Allowed fields only:

```ts
type LandingEvent = {
  event: 'landing_hero_experiment_impression' | 'landing_download_intent' | 'landing_store_click';
  experimentId: 'landing_hero_v1';
  variant: 'phone' | 'minimal';
  placement: 'hero' | 'sticky' | 'product_story' | 'final';
  platform: 'ios' | 'android' | 'desktop';
  anonymousToken: string;
};
```

Reject unknown fields instead of silently dropping them. Hash the token with SHA-256 immediately and never persist or log the raw value.

- [ ] **Step 4: Implement atomic deduplication and aggregation**

Use:

- aggregate: `site_experiments/{experimentId}`;
- dedupe: `site_experiment_dedupe/{sha256(experimentId|variant|event|token)}`;
- `expiresAt` Firestore Timestamp at now + 90 days;
- one Firestore transaction that reads aggregate/dedupe, creates only a missing dedupe record, and increments only once;
- current Remote Config check with a one-entry 30-second server cache;
- accept reporting only when current mode is `experiment` and experiment ID matches.

Keep the existing site-stat rate limit. Add home-specific legacy view/click buckets for baseline comparison without changing other page counters.

- [ ] **Step 5: Implement pure statistical reporting helpers**

Use a two-sided two-proportion z-test and the predetermined planning inputs:

- alpha 0.05;
- power 0.80;
- relative MDE 20%;
- baseline from the prior 28 complete daily homepage buckets;
- fallback baseline 5% explicitly labelled as fallback;
- minimum seven complete UTC days;
- report recommendation only, never auto-select or auto-publish.

- [ ] **Step 6: Verify green**

Run:

```powershell
Push-Location functions
npx jest --runTestsByPath src/landing_experiment.test.ts src/site_stats.test.ts --no-cache --runInBand
npx tsc --noEmit --pretty false
Pop-Location
```

Expected: PASS.

- [ ] **Step 7: Commit backend domain logic**

```powershell
git add functions/src/landing_experiment.ts functions/src/landing_experiment.test.ts functions/src/site_stats.ts functions/src/site_stats.test.ts
git diff --cached --check
git commit -m "feat: measure landing experiment privately"
```

## Task 7: Expose the public config and admin report callables

**Files:**
- Create: `functions/src/web_landing_experiment.ts`
- Create: `functions/src/web_landing_experiment.test.ts`
- Create: `functions/src/admin_landing_experiment.ts`
- Create: `functions/src/admin_landing_experiment.test.ts`
- Modify: `functions/src/index.ts`
- Modify: `firebase.json`

- [ ] **Step 1: Write failing HTTP and callable tests**

Public endpoint tests:

- GET/OPTIONS only;
- exact public body `{mode, experimentId, phonePercent, revision}`;
- no conditions, internal metadata, audit actor, tokens, or secrets;
- ETag/304 behavior;
- cache header `public, max-age=30, s-maxage=60, stale-while-revalidate=300`;
- fail closed to a normalized paused payload.

Admin report tests:

- authentication and `config.read`/appropriate admin permission required;
- aggregate counters, rates, baseline source, planned sample, elapsed complete days, z/p values;
- `winner: null` before both time and sample gates;
- recommendation is advisory and carries no write side effect.

- [ ] **Step 2: Verify red**

Run:

```powershell
Push-Location functions
npx jest --runTestsByPath src/web_landing_experiment.test.ts src/admin_landing_experiment.test.ts --no-cache --runInBand
Pop-Location
```

Expected: FAIL because endpoints do not exist.

- [ ] **Step 3: Implement and export endpoints**

Export:

- `webLandingExperimentConfig` as a same-origin hosting rewrite target;
- `adminGetLandingExperimentReport` as a protected callable;
- the existing `siteStatsTrack` with the new event branch.

Add `/api/landing-experiment-config` before broader rewrites in the `knowly-www` hosting target.

- [ ] **Step 4: Verify green and export wiring**

Run:

```powershell
Push-Location functions
npx jest --runTestsByPath src/web_landing_experiment.test.ts src/admin_landing_experiment.test.ts src/landing_experiment.test.ts src/site_stats.test.ts --no-cache --runInBand
npx tsc --noEmit --pretty false
Pop-Location
rg -n "webLandingExperimentConfig|adminGetLandingExperimentReport|landing-experiment-config" functions/src/index.ts firebase.json
```

Expected: PASS and all exports/rewrites are present once.

- [ ] **Step 5: Commit the delivery seam**

```powershell
git add functions/src/web_landing_experiment.ts functions/src/web_landing_experiment.test.ts functions/src/admin_landing_experiment.ts functions/src/admin_landing_experiment.test.ts functions/src/index.ts firebase.json
git diff --cached --check
git commit -m "feat: expose landing experiment controls"
```

## Task 8: Add the focused Admin V2 landing experiment workspace

**Files:**
- Create: `admin/v2/scripts/landing-experiment-ui.js`
- Modify: `admin/v2/scripts/admin-capabilities.js`
- Modify: `admin/v2/scripts/admin-core.js`
- Modify: `admin/v2/scripts/admin-firebase.js`
- Modify: `admin/v2/scripts/admin-guidance.js`
- Modify: `admin/v2/styles/admin.css`
- Modify: `admin/site.html`
- Create: `tests/admin_v2_landing_experiment_contract.test.ts`

- [ ] **Step 1: Re-read the Admin UI Bible before editing**

Run: `Get-Content -Raw docs/design/ADMIN_UI_BIBLE.md`

Expected: the implementation follows the current source of truth for categories, icons, tooltips, density, focus, mobile layout, and confirmation patterns.

- [ ] **Step 2: Write failing Admin contracts**

Assert:

- one native application capability `website-landing`;
- one shortcut from `admin/site.html`;
- no direct `firebase.firestore()`/`setDoc`/`updateDoc` write from the landing module;
- reads use `adminGetRemoteConfigWorkspace` plus `adminGetLandingExperimentReport`;
- writes use the existing `adminPublishRemoteConfig` preview/publish/history/rollback seam;
- exact keys are `texts.web_landing_hero_mode`, `texts.web_landing_hero_experiment_id`, and `numbers.web_landing_hero_phone_percent`;
- reason and expected revision are mandatory;
- phone/minimal preview links use non-reporting `heroPreview` query values;
- controls expose `experiment|paused|phone|minimal` and allocation `0..100`.

- [ ] **Step 3: Verify red**

Run: `npx jest --runTestsByPath tests/admin_v2_landing_experiment_contract.test.ts --no-cache --runInBand`

Expected: FAIL because the focused workspace is absent.

- [ ] **Step 4: Implement the workspace as a small isolated module**

The module must render:

- current status, experiment ID, allocation, config revision, and last audit summary;
- two visual preview cards side by side on wide screens and accessible tabs/cards on narrow screens;
- primary metric for both variants, uplift, confidence/p-value, complete days, required/observed sample;
- a clear label when baseline is the 5% fallback;
- recommendation text only after predetermined gates;
- mode controls, allocation, reason, Preview, Publish, History, and Rollback;
- impact summary before publish and live-region result feedback.

Do not add a second Remote Config writer, parallel history model, or custom rollback mechanism.

- [ ] **Step 5: Verify scripts and contracts**

Run:

```powershell
npx jest --runTestsByPath tests/admin_v2_landing_experiment_contract.test.ts --no-cache --runInBand
node --check admin/v2/scripts/landing-experiment-ui.js
node --check admin/v2/scripts/admin-capabilities.js
node --check admin/v2/scripts/admin-core.js
node --check admin/v2/scripts/admin-firebase.js
node --check admin/v2/scripts/admin-guidance.js
```

Expected: PASS.

- [ ] **Step 6: Commit only the exact Admin integration files**

Because several Admin files may contain pre-existing edits, inspect each hunk before staging:

```powershell
git diff -- admin/v2/scripts/admin-capabilities.js admin/v2/scripts/admin-core.js admin/v2/scripts/admin-firebase.js admin/v2/scripts/admin-guidance.js admin/v2/styles/admin.css admin/site.html
git add admin/v2/scripts/landing-experiment-ui.js tests/admin_v2_landing_experiment_contract.test.ts
git add -p admin/v2/scripts/admin-capabilities.js admin/v2/scripts/admin-core.js admin/v2/scripts/admin-firebase.js admin/v2/scripts/admin-guidance.js admin/v2/styles/admin.css admin/site.html
git diff --cached --check
git commit -m "feat: manage landing experiment in admin"
```

Expected: no unrelated Admin changes are staged.

## Task 9: Add deterministic browser coverage for mobile, routing, and motion

**Files:**
- Create: `playwright.landing.config.ts`
- Create: `scripts/serve-landing-e2e.cjs`
- Create: `tests/e2e/landing/landing-premium.spec.ts`

- [ ] **Step 1: Write the browser journeys**

Run against a local static server with fetch/config/stats interception. Cover viewports:

```text
375×667
393×852
430×932
768×1024
1024×768
1440×900
```

Assertions:

- headline and primary CTA visible in the initial mobile viewport;
- primary CTA box height >=56 and all interactive targets >=44;
- no horizontal overflow at any viewport;
- `minimal` never requests `phraseman-screen-home.webp`;
- `phone` requests/renders it without covering the CTA;
- assignment stays stable across reloads and a late response never switches current DOM;
- preview query does not call experiment telemetry;
- iOS and Android user agents route directly to the correct store;
- desktop opens dialog, focuses it, closes on Escape, restores focus;
- sticky CTA appears after hero and hides near final/consent/dialog;
- reduced motion leaves all content visible and creates no pin;
- no uncaught page errors or console errors.

- [ ] **Step 2: Verify red**

Run:

```powershell
npm exec --yes --package=@playwright/test@1.61.1 -- playwright test --config playwright.landing.config.ts
```

Expected: FAIL before the server/config and final UI behavior are complete.

- [ ] **Step 3: Complete only browser-observed defects**

Fix the smallest implementation defect surfaced by each failing journey. Do not weaken target sizes, above-fold CTA, reduced-motion, telemetry, or routing assertions to obtain green.

- [ ] **Step 4: Verify green twice**

Run the same Playwright command twice. Expected: both runs PASS with no retries required and screenshots/traces written only under ignored test output.

- [ ] **Step 5: Commit browser coverage**

```powershell
git add playwright.landing.config.ts scripts/serve-landing-e2e.cjs tests/e2e/landing/landing-premium.spec.ts
git diff --cached --check
git commit -m "test: cover premium landing journeys"
```

## Task 10: Run the Orbit adversarial review and close findings

**Files:**
- Review: every file changed in Tasks 1–9
- Optional create: ignored report under `.codex-tmp/landing-review/`

- [ ] **Step 1: Freeze the candidate packet**

Record exact base/head, changed files, focused test results, experiment keys, event schema, Firestore paths, admin permissions, and rollback modes.

- [ ] **Step 2: Run separate read-only review lenses**

R3 product/UI lens:

- clarity of the single action;
- mobile first viewport and sticky behavior;
- semantic/accessibility/reduced-motion behavior;
- content preservation and route compatibility.

R4 privacy/statistics/release lens:

- consent state transitions and preview/paused leakage;
- unknown-field rejection and raw-token non-persistence;
- transactional dedupe and TTL readiness;
- Remote Config fail-closed behavior;
- baseline/sample/p-value math and no early winner;
- permissions, audit reason, revision conflict, history, rollback;
- deployment ordering and kill-switch behavior.

- [ ] **Step 3: Convert findings into tests before fixes**

For every confirmed P0/P1/P2 defect, add or strengthen a focused failing test, verify red, implement the smallest fix, then verify green. Record dismissed findings with evidence; do not make speculative cleanup edits.

- [ ] **Step 4: Run the focused regression packet**

```powershell
npx jest --runTestsByPath tests/landing_experiment_core.test.ts tests/landing_premium_contract.test.ts tests/admin_v2_landing_experiment_contract.test.ts --no-cache --runInBand
Push-Location functions
npx jest --runTestsByPath src/landing_experiment.test.ts src/site_stats.test.ts src/web_landing_experiment.test.ts src/admin_landing_experiment.test.ts --no-cache --runInBand
npx tsc --noEmit --pretty false
Pop-Location
npm exec --yes --package=@playwright/test@1.61.1 -- playwright test --config playwright.landing.config.ts
```

Expected: all checks PASS; no unresolved P0/P1/P2 finding.

- [ ] **Step 5: Commit only validated review fixes**

Use one bounded commit such as `fix: close landing experiment review findings` if changes were required. Do not create a no-op commit.

## Task 11: Performance, accessibility, and visual acceptance packet

**Files:**
- Inspect: generated browser screenshots and traces
- No tracked output required

- [ ] **Step 1: Inspect all six viewport screenshots**

Check both variants at minimum 375×667, 768×1024, and 1440×900. Confirm typography hierarchy, whitespace, phone crop, button prominence, content order, no clipping, no accidental empty bands, and premium visual restraint.

- [ ] **Step 2: Run Lighthouse mobile on both variants**

Targets:

- LCP <=2.5 seconds;
- TBT <=200 ms;
- CLS <0.10;
- accessibility score >=0.95.

Use local production-like static serving and store reports in an ignored directory. If a target fails, fix the cause and rerun rather than lowering the target.

- [ ] **Step 3: Perform keyboard and motion checks**

Verify skip link, navigation order, focus visibility, dialog focus/restore, Escape, theme toggle, all CTA placements, 200% text zoom, high contrast where available, and reduced motion.

- [ ] **Step 4: Verify the final file packet**

Run:

```powershell
git diff --check
git status --short -- knowly-www functions/src firebase.json admin/v2 admin/site.html tests scripts playwright.landing.config.ts
```

Expected: only intended changes remain attributable to this plan; generated reports are ignored.

## Task 12: Owner-authorized release and rollback proof

**Files:**
- No new source files expected

- [ ] **Step 1: Confirm release authority and exact candidate**

Do not deploy merely because tests pass. Record candidate HEAD and obtain the owner's release instruction for this landing packet.

- [ ] **Step 2: Enable Firestore TTL before experiment traffic**

```powershell
gcloud firestore fields ttls update expiresAt --collection-group=site_experiment_dedupe --enable-ttl --project=phraseman-ea0b3
gcloud firestore fields ttls list --collection-group=site_experiment_dedupe --project=phraseman-ea0b3
```

Expected: TTL is enabling/active for `expiresAt`. Activation may take time; deletion is asynchronous.

- [ ] **Step 3: Deploy backend functions first**

Deploy only:

```text
webLandingExperimentConfig
siteStatsTrack
adminGetLandingExperimentReport
```

Smoke-check paused/forced behavior before enabling experiment mode.

- [ ] **Step 4: Deploy the two hosting targets**

```powershell
npm run hosting:knowly-www
npm run hosting:admin
```

Expected: both commands succeed; production smoke checks pass on mobile and desktop.

- [ ] **Step 5: Activate through Admin V2 with a reason**

Start in `paused` or a forced owner-selected variant, verify both preview URLs and live telemetry silence, then publish `experiment` with ID `landing_hero_v1` and the approved allocation. Never write Remote Config directly from a script or browser console.

- [ ] **Step 6: Prove rollback**

From Admin V2 history, demonstrate that `paused`, `phone`, and `minimal` can each be published with expected revision and reason. Return to the owner-approved operating mode. Record audit IDs and final revision.

- [ ] **Step 7: Observe without early stopping**

Monitor operational errors and counter health, but do not declare a winner until planned sample and seven complete UTC days are both satisfied. A severe UX/privacy/telemetry incident is a safety stop, not a statistical win.

## Final acceptance criteria

- [ ] The first mobile viewport communicates one promise and one dominant action: download the app.
- [ ] Both `phone` and `minimal` variants use the same semantic content and differ only in hero composition.
- [ ] Variant assignment is stable, bounded to 250 ms, cached for five minutes, and never changes late on the current page.
- [ ] Minimal mode does not download the hero phone asset.
- [ ] Direct store routing works on iOS/Android; desktop dialog and `/download/` fallback work without ambiguity.
- [ ] All legacy routes and below-the-fold capabilities named in the design remain reachable.
- [ ] Motion is self-hosted, progressive, reduced-motion-safe, and never hides content on failure.
- [ ] Experiment telemetry is consent-aware, strict, anonymous, raw-token-free at rest, deduplicated, TTL-governed, and disabled in preview/paused/forced modes.
- [ ] Admin changes are audited, reason-required, revision-checked, previewable, historically visible, and reversible.
- [ ] The statistical report uses the declared baseline/MDE/alpha/power rules and cannot produce an early automatic winner.
- [ ] Focused Jest, Functions TypeScript, Playwright, Lighthouse, accessibility, and adversarial review gates pass.
- [ ] Deployment occurs only after explicit owner authorization and includes a demonstrated kill switch/rollback.

## Expected release evidence

Record:

- branch, base, candidate HEAD, and exact commits;
- changed files and preserved pre-existing dirty files;
- root/functions/browser commands with pass counts;
- screenshots for both variants at the acceptance viewports;
- Lighthouse metrics;
- TTL state;
- deployed function and hosting target results;
- Remote Config revision, reason, audit/history IDs, active mode/allocation;
- smoke-test telemetry and dedupe evidence;
- rollback proof;
- unresolved limitations or follow-up proposals.
