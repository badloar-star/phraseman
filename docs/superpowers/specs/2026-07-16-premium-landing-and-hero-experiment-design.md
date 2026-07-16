# Phraseman Premium Landing and Hero Experiment Design

**Date:** 2026-07-16

**Status:** Approved in conversation

**Scope:** `knowly-www` public landing page, website experiment telemetry, and the focused Admin v2 control surface for the landing hero

**Primary product outcome:** Increase qualified clicks from the landing page to App Store and Google Play without making the page noisy, confusing, or slower on mobile.

## 1. Context

The current Phraseman landing hero asks the visitor to process too many competing elements at once: a long headline, a rotating word, a dense feature paragraph, a quiz CTA, two store badges, a QR panel, three trust chips, a large phone, decorative rays and particles, and a navigation bar with several destinations. The page contains useful content, but its first viewport does not establish one dominant action.

The redesign must preserve the existing user-facing content and destinations while moving them into a clearer narrative below the hero. Decorative behavior may be replaced where the approved premium visual direction requires it. Existing guides, reviews, FAQ, pronunciation demo, store links, QR download path, theme choice, and informational sections remain available.

The approved direction is a light, highly polished product-launch page inspired by the restraint, hierarchy, whitespace, product imagery, and motion pacing of Apple product pages. It must not copy Apple branding or assets.

## 2. Goals

1. Make downloading Phraseman the single dominant conversion goal.
2. Give the first viewport a premium, calm, product-led presentation on a warm white background.
3. Introduce text, CTA, and product imagery in a controlled cinematic sequence without delaying interaction.
4. Preserve all meaningful current landing content by placing it in the right section below the hero.
5. Compare two approved hero compositions with a statistically responsible A/B experiment.
6. Let an administrator run, pause, stop, and resolve the experiment without a website deploy.
7. Make the mobile experience exceptionally clear, thumb-friendly, stable, and fast.

## 3. Non-goals

- Rebuilding the static site in React solely to obtain animation components.
- Changing app-store listings, application onboarding, pricing, or the `/start/` checkout funnel.
- Tracking confirmed installs. The experiment measures outbound store clicks.
- Automatically declaring a winner from a small or incomplete sample.
- Removing existing guides, reviews, FAQ, download methods, theme choice, or other public destinations.
- Adding unrelated Admin v2 navigation or refactoring unrelated legacy admin functionality.

## 4. Approved design principles

### 4.1 One dominant action

The visible hero contains one primary CTA: **“Скачать Phraseman бесплатно”**. The quiz and detailed store options leave the first viewport. Repeated CTAs lower on the page use the same wording and destination logic instead of introducing competing goals.

### 4.2 Premium through precision

The visual system uses large editorial typography, deliberate whitespace, excellent alignment, restrained color, high-quality product imagery, and exact motion timing. Gold remains a small brand accent. It does not become a large decorative surface.

### 4.3 Light by default, existing choice preserved

The redesigned page defaults to a coherent light presentation across every section. The existing theme choice remains available in the compact menu or footer rather than competing with the hero. If the visitor has already made a supported theme choice, the site respects it.

### 4.4 Motion supports hierarchy

Motion establishes reading order and explains the product. It does not create an intro gate, continuous visual noise, or scroll hijacking. Every essential action works before the decorative timeline finishes.

### 4.5 Mobile is a first-class layout

Mobile is not a scaled-down desktop composition. Content order, product imagery, sticky behavior, safe areas, animation complexity, and CTA placement are designed specifically for narrow screens.

## 5. Visual system

### 5.1 Palette

- Page background: `#FFFFFF`
- Warm alternate surface: `#F5F5F2`
- Primary text: `#111111`
- Secondary text: `#5F6368` or a darker value that passes WCAG AA
- Primary CTA: `#111111` with white foreground
- Brand accent: restrained warm gold derived from the current Phraseman palette
- Borders: neutral gray with sufficient contrast on white
- Focus ring: `#0A66FF`, at least 2 px with a visible offset

Bright lime or neon-green surfaces, if any existing content retains them, must use dark foreground text in accordance with the project contrast invariant.

### 5.2 Typography

Use the existing local Inter assets with the system stack (`-apple-system`, `BlinkMacSystemFont`, `Inter`, sans-serif) so the page feels native without adding a render-blocking font dependency. Headings use strong weight, compact tracking, and short line lengths. Body text remains at least 16 px on mobile with a comfortable line height.

### 5.3 Surfaces and controls

- Avoid nested decorative cards.
- Use large uninterrupted fields of white and warm neutral background.
- Reserve translucent blur for the sticky header and the explicit desktop download chooser only.
- Use soft, low-opacity shadows only where they establish depth around the phone or active download panel.
- Primary controls have stable hover and focus states without layout shift.

## 6. Header and navigation

The initial header contains the Phraseman mark plus the two quiet anchors **“Как это работает”** and **“Отзывы”**. The full set of existing destinations remains reachable through the compact menu and corresponding page sections.

The header download CTA is not shown while the hero CTA is visible. After the hero leaves the viewport, the header becomes a lightly translucent sticky surface and introduces a compact **“Скачать”** button. This preserves a single dominant CTA in the first viewport while maintaining easy access during the rest of the journey.

On mobile, the header contains the logo and a minimum 44×44 px menu target. The sticky download affordance appears only after the hero and accounts for `env(safe-area-inset-bottom)` when presented as a bottom bar.

## 7. Hero

### 7.1 Shared content

Both experiment variants use exactly the same product promise, supporting copy, CTA wording, link behavior, trust line, and animation duration.

**Headline**

> Заговорите по-английски.
>
> По-настоящему.

**Supporting copy**

> Живые фразы, тренировка произношения и короткие уроки — чтобы начать говорить, а не продолжать готовиться.

**Primary CTA**

> Скачать Phraseman бесплатно

**Quiet support line**

> Без карты · первый урок сразу

### 7.2 Variant A: product-led

- Desktop/tablet: text and CTA occupy the left side; one refined phone mockup occupies the right side.
- The phone shows a real current Phraseman screen and remains subordinate to the CTA.
- The reveal uses a mask, a small scale correction, a restrained glass highlight, and no perpetual floating loop.
- Mobile: text and CTA remain first. The phone appears below the CTA and may be partially visible at the bottom edge as a scroll cue, but it must not push the CTA below the initial viewport.

### 7.3 Variant B: typographic minimal

- Desktop/tablet: the same text and CTA are centered in a narrower editorial column with significantly more whitespace.
- No phone appears in the hero.
- Mobile: the composition remains centered and fits comfortably without an artificial empty screen.
- The full product demonstration still appears below the hero, so the page never becomes an abstract promise without product evidence.

The experiment compares these two complete hero compositions. Results must not be described as proving a universal rule about phone images.

## 8. CTA behavior

### 8.1 Platform routing

- iOS: the hero CTA opens App Store directly.
- Android: the hero CTA opens Google Play directly.
- Desktop or unknown platform: the CTA opens an inline, accessible download chooser with App Store, Google Play, and QR code.
- The chooser is a result of an explicit click and therefore does not clutter the first viewport.
- Store URLs continue to come from the existing public site configuration.

### 8.2 Placement

The same conversion action appears in four controlled contexts:

1. Directly beneath the hero promise.
2. In the sticky header or mobile download bar after the hero.
3. After the product demonstration.
4. In the final download section.

The first hero button is 56 px high. All important touch targets are at least 44×44 CSS px, have a visible focus state, and remain usable with keyboard and assistive technologies.

## 9. Motion system

### 9.1 Technical choice

Use self-hosted GSAP 3.13+ core with only the required plugins. GSAP is framework-agnostic and suits the existing static HTML/CSS/JavaScript site. React Bits and Motion Primitives are approved references for timing and reveal patterns; they are not a reason to add a React runtime.

The required capabilities are:

- GSAP Timeline for the hero sequence;
- ScrollTrigger for viewport-aware product storytelling;
- self-hosted GSAP SplitText for the headline reveal, with the unsplit semantic headline supplied through `aria-label` and generated visual segments hidden from assistive technology;
- native IntersectionObserver/CSS for simple sections where GSAP adds no value.

### 9.2 Hero timeline

Target total duration: approximately 1.1 seconds.

1. Header and brand become visible without a large translation.
2. Headline words reveal upward with low blur and a short stagger.
3. Supporting copy fades and translates a small distance.
4. CTA and trust line appear.
5. Variant A phone reveals after the reading order is established.

The CTA exists and is actionable throughout. Animation does not gate link behavior.

### 9.3 Scroll behavior

- No scroll-jacking.
- No infinite hero loops.
- Desktop product storytelling may use a pinned phone with controlled screen transitions.
- ScrollTrigger instances run only when relevant and clean up on resize or media-query change.
- Simple content sections reveal once using opacity and small transforms.
- Testimonials do not auto-scroll in a way that prevents reading.

### 9.4 Reduced motion

When `prefers-reduced-motion: reduce` is active:

- all content is visible immediately;
- the phone does not tilt or parallax;
- pinned scroll storytelling becomes a normal document sequence;
- button hover feedback uses color/border changes without movement;
- no functionality depends on an animation-completion callback.

## 10. Page information architecture

The redesign keeps the existing content but establishes this order:

1. Premium hero and primary download CTA.
2. A single proof row: `10 000+ фраз · 15 минут в день · произношение на устройстве`.
3. Product-in-action story using the phone and real app screens.
4. Three editorial value chapters: living phrases, speaking practice, and a short daily rhythm.
5. Existing pronunciation demo in its own clean scene.
6. “Как это работает” in three steps: download, choose a goal, start the first lesson.
7. Reviews and ratings as large readable editorial quotes.
8. Existing guide collection.
9. Existing FAQ in an accessible accordion.
10. Final download section with platform chooser and desktop QR.
11. Footer with all existing legal, support, guide, theme, and product destinations.

The current phrase ribbon may remain as a restrained transition inside the phrase chapter, not as first-viewport noise. Existing trust and privacy statements move near the related pronunciation/privacy content. Existing quiz access remains available below the main download journey or in the compact menu, but it is not a competing hero CTA.

## 11. Product-in-action story

Desktop uses one large phone and three or four chapters. As the visitor scrolls naturally, the phone screen crossfades or masks between real Phraseman views while adjacent copy explains the current capability. The page does not pin the entire document longer than necessary.

On mobile, the same story becomes a normal vertical sequence:

- screenshot;
- short heading;
- one concise explanation;
- next screenshot.

There is no pinned phone, sideways scroll, forced snap, or intercepted touch gesture on narrow screens.

## 12. Mobile-specific contract

### 12.1 First viewport

- The logo, full headline, supporting copy, primary CTA, and trust line must be readable and actionable at 375 px width.
- At common short heights, the CTA remains above the fold. Variant A phone yields space before the CTA does.
- Use `min-height: calc(100svh - var(--header-height))` for the hero, never a fixed `100vh`; allow content to grow normally when copy or browser chrome requires more room.
- No horizontal scroll at any supported width.

### 12.2 Touch and reachability

- Hero CTA height: 56 px.
- Menu and icon controls: at least 44×44 px.
- Sticky bottom CTA respects the device safe area and never covers FAQ controls, footer links, cookie consent, or the desktop download chooser.
- The sticky CTA hides while the final download CTA is visible to avoid duplicated adjacent actions.

### 12.3 Content and motion

- Headline segmentation must never split a word visually.
- Text is never hidden waiting for a slow animation library.
- Heavy blur, large parallax, continuous 3D tilt, and desktop pinning are disabled on mobile.
- Product images reserve their final aspect ratio before load to prevent content jumps.
- QR code is not shown on mobile; the primary CTA routes directly to the detected store.

### 12.4 Mobile validation widths

The focused responsive gate covers at least 375, 390/393, 430, 768, 1024, and 1440 px. Both A and B variants must be rendered at each relevant width. The 375 px gate is mandatory, not an optional screenshot.

## 13. Experiment design

### 13.1 Experiment identity

- Initial experiment ID: `landing_hero_v1`.
- Allocation: 50% product-led, 50% typographic minimal.
- Any material copy, CTA, phone asset, layout, or timing change requires a new experiment ID.
- Returning eligible visitors keep the same assignment for the experiment lifetime.

### 13.2 Assignment

Assignment is deterministic from a random first-party anonymous identifier plus the experiment ID. It does not use an application UID, email, advertising ID, or fingerprinting inputs.

The bootstrap resolves the experiment mode before the hero animation begins. It uses, in order:

1. a valid current public experiment configuration;
2. a valid locally cached configuration;
3. the safe built-in 50/50 configuration for `landing_hero_v1`.

Once a render starts, a late configuration response does not switch the current page between variants. This prevents layout flicker. The bootstrap waits at most 250 ms for current configuration before using cached or built-in state; at that deadline it starts the page unconditionally.

If persistent storage is unavailable, assignment falls back to the current session. If analytics consent is not available, the visitor may receive a session-only visual variant but does not enter experiment reporting.

### 13.3 Metrics

Primary metric:

`unique eligible visitors with a store click / unique eligible hero impressions`

Canonical events:

- `landing_hero_experiment_impression` — once per eligible anonymous visitor and experiment ID;
- `landing_download_intent` — desktop hero/sticky/product/final CTA opened the store chooser;
- `landing_store_click` — an outbound App Store or Google Play navigation.

Each accepted event contains only the allowlisted experiment ID, variant (`phone` or `minimal`), placement (`hero`, `sticky`, `product_story`, or `final`), platform (`ios`, `android`, or `desktop`), and an anonymous assignment token. The backend hashes the token before deduplication, never writes the raw value, and applies a 90-day TTL to deduplication records.

Secondary diagnostics:

- download-intent click on desktop before store selection;
- store platform;
- CTA placement (`hero`, `sticky`, `product_story`, `final`);
- product-story reach;
- variant-specific error and performance guardrails.

The store navigation is never awaited on analytics. Use `navigator.sendBeacon`; if unavailable, issue `fetch(..., { keepalive: true })` without awaiting it. Neither failure may cancel or delay navigation.

### 13.4 Decision rule

Admin shows the current sample, conversion rate for each variant, absolute and relative difference, and a clear “not enough data” state. Before launch, required sample size is calculated from the trailing 28-day eligible store-click conversion, a 20% relative minimum detectable effect, 95% significance, and 80% power. A winner cannot be recommended before both variants reach that precomputed sample and the test has run for at least seven consecutive complete days. The product owner selects the winner; the system does not silently auto-promote a variant.

## 14. Public experiment configuration

The source of truth remains the audited server-managed configuration. The public site receives only a small validated projection; it must never receive admin history, actor information, unrelated app flags, or secrets.

Canonical fields:

- `texts.web_landing_hero_mode`: `experiment`, `paused`, `phone`, or `minimal`;
- `texts.web_landing_hero_experiment_id`: initially `landing_hero_v1`;
- `numbers.web_landing_hero_phone_percent`: initially `50`.

Mode semantics:

- `experiment`: assign and measure according to the configured split;
- `paused`: preserve visual assignments but exclude new data from the decision sample;
- `phone`: force variant A for everyone;
- `minimal`: force variant B for everyone.

The public `webLandingExperimentConfig` endpoint validates and clamps every value, returns a safe fallback for malformed data, and supports the existing same-origin/CORS requirements. It returns `Cache-Control: public, max-age=30, s-maxage=60, stale-while-revalidate=300`; Admin states that a published change can take up to 60 seconds to reach a fresh page load.

## 15. Admin v2 design

Add a focused **“Главная сайта”** control surface in the user-visible application/site area of Admin v2. Provide a clear shortcut from the existing website admin entry without removing or hiding legacy capabilities.

The control surface contains:

- human-readable current status;
- current experiment ID;
- current allocation;
- side-by-side previews of A and B at desktop width and a tabbed A/B preview at narrow Admin widths;
- the four approved modes;
- primary metric and sample sufficiency;
- a required reason field;
- preview before publish;
- publish action;
- recent audited changes and rollback entry.

The technical keys appear only as secondary details. The screen has one primary action at a time. Buttons include useful text, tooltip, focus, loading, disabled, success, and error states. Publication uses the existing revision-aware `adminPublishRemoteConfig` path so changes are idempotent, audited, and protected from stale overwrites.

Stopping the experiment requires choosing `phone` or `minimal` as the winner. Pausing is reversible and does not choose a winner.

## 16. Data flow

1. Admin loads the current revision and experiment state through the protected Admin callable.
2. Admin edits mode/allocation and supplies a reason.
3. Admin previews the exact before/after effect.
4. Admin publishes through the audited revision-aware callable.
5. The server stores the configuration, operation record, history snapshot, and audit record atomically.
6. The public projection endpoint returns only validated landing-experiment fields.
7. The landing bootstrap chooses the stable variant before starting motion.
8. Eligible impressions and store clicks are sent to the existing site-statistics backend with experiment and placement dimensions.
9. Admin reporting reads aggregate experiment results and never exposes raw visitor identifiers.

## 17. Privacy and security

- Do not store IP address, email, app UID, store account, or browser fingerprint in experiment records.
- Respect the existing analytics consent mechanism.
- Do not include raw Remote Config in a public response.
- Validate event names, experiment IDs, variants, placements, and platforms on the server.
- Rate-limit the public telemetry and configuration endpoints consistently with existing website endpoints.
- Use idempotency/deduplication for unique experiment impressions and conversion events where needed.
- Admin writes require the existing `application.config.write` permission, authenticated callable, expected revision, reason, request ID, and audit record.
- No OpenAI API use is required or permitted for this work.

## 18. Failure behavior

### Configuration unavailable

Use cached valid configuration, then the built-in safe `landing_hero_v1` configuration. Start the page after the bounded bootstrap window. Never leave the hero invisible.

### Invalid configuration

Reject invalid values in Admin and validate again on the public projection. The landing page receives a safe supported mode and split.

### Telemetry unavailable

Store navigation proceeds immediately. The failure is silent to the visitor and observable in diagnostics without an unhandled rejection.

### Animation library unavailable

The base CSS renders all text, CTAs, links, and images in their final positions. Enhancement scripts add motion only after successful initialization.

### Storage unavailable

Use session assignment. Do not repeatedly reassign during a single page session.

### Unsupported or unknown platform

Open the accessible desktop chooser instead of guessing a store.

## 19. Accessibility

- WCAG AA contrast for normal text and controls.
- Logical semantic heading order and landmark structure.
- Hero text remains real selectable text, not canvas or image text.
- Visible keyboard focus.
- DOM order matches reading and visual order.
- Meaningful product images have useful alternative text; purely decorative masks and highlights are hidden from assistive technology.
- Download chooser manages focus, supports Escape when safe, and returns focus to its trigger.
- FAQ uses buttons with correct `aria-expanded` and associated regions.
- Motion honors `prefers-reduced-motion`.
- Color is not the only experiment/admin status signal.

## 20. Performance contract

- Keep the static site architecture; do not ship a React runtime for animation.
- Self-host and version animation assets.
- Load only GSAP capabilities actually used.
- After the synchronous variant decision, variant A injects a preload for its hero phone asset before starting the motion timeline; variant B does not fetch the hero phone asset and lazy-loads product-story imagery below the fold.
- Provide responsive WebP/AVIF sources and explicit width, height, or aspect ratio.
- No WebGL particles, continuous canvas work, or infinite hero animation.
- Use transform and opacity for animated movement.
- Do not block CTA behavior on analytics, image completion, or animation completion.
- Production p75 targets are LCP ≤2.5 s, INP ≤200 ms, and CLS <0.1. The focused simulated-mobile Lighthouse gate targets LCP ≤2.5 s, Total Blocking Time ≤200 ms, and CLS <0.1.

## 21. Verification strategy

### 21.1 Pure logic tests

- deterministic 50/50 assignment;
- stable assignment for an experiment ID;
- new assignment namespace after experiment ID change;
- forced `phone` and `minimal` modes;
- paused-mode reporting exclusion;
- invalid configuration fallback;
- platform routing;
- analytics payload allowlist and deduplication.

### 21.2 Contract tests

- public configuration exposes only allowed landing fields;
- Admin publication uses preview, expected revision, reason, and audited callable;
- legacy website/admin entry remains available;
- existing page destinations and content sections remain wired;
- existing store URLs remain the source of store navigation.

### 21.3 Browser tests

Render both variants at 375, 390/393, 430, 768, 1024, and 1440 px and verify:

- no horizontal overflow;
- hero CTA visible and actionable;
- no initial variant flicker or material layout shift;
- correct direct mobile store route;
- correct desktop chooser and QR;
- sticky CTA appears only after hero and does not cover content;
- mobile safe-area behavior;
- keyboard navigation and focus;
- reduced-motion presentation;
- FAQ interaction;
- product story degrades to a normal mobile sequence;
- all existing sections remain reachable.

### 21.4 Visual review

Capture both hero variants and the full page at the required widths. Review typography, optical alignment, line breaks, phone crop, animation starting/ending states, sticky controls, consent UI interaction, and the final CTA. The contact sheet must show the 375 px mobile state prominently.

### 21.5 Performance review

Run a focused mobile Lighthouse/Web Vitals check against the production-like static build. Confirm that the experiment bootstrap is bounded, the CTA is not delayed, animation scripts do not create long tasks, and image dimensions prevent CLS.

## 22. Acceptance criteria

The design is complete when all of the following are true:

1. The entire main page has a coherent premium light presentation by default.
2. The first viewport contains one dominant download CTA and no competing quiz/store/QR cluster.
3. Variant A shows the phone; variant B presents the approved centered typographic hero.
4. Text appears before CTA, and the phone appears last without delaying interaction.
5. All meaningful existing landing content and destinations remain available below the hero or in the compact menu/footer.
6. Mobile at 375 px shows readable hero copy and an accessible CTA without horizontal overflow or covered controls.
7. Desktop scroll storytelling becomes a simple vertical product sequence on mobile and under reduced motion.
8. Admin can run 50/50, pause, force phone, or force minimal through a previewed audited change.
9. Store clicks are attributed to experiment variant and CTA placement without blocking navigation.
10. The result view distinguishes insufficient data from an actionable winner decision.
11. Invalid config, failed telemetry, unavailable storage, and failed animation enhancement all degrade safely.
12. Focused accessibility, responsive, contract, visual, and performance checks pass.

## 23. Rollout

1. Implement the new light page and both hero variants behind the built-in safe experiment configuration.
2. Verify both variants locally and in a production-like hosting preview.
3. Deploy the public configuration projection and telemetry schema before enabling reporting.
4. Deploy the focused Admin v2 control and confirm preview/audit/rollback behavior.
5. Publish the website with experiment mode initially at 50/50.
6. Confirm impression and store-click events for both variants without using live conversions as test fixtures.
7. Run through at least one full weekly traffic cycle and the precomputed sample requirement.
8. Manually choose and publish the winner through Admin; preserve experiment history.

## 24. Research references

- Apple iPhone product presentation: <https://www.apple.com/iphone-17/>
- GSAP installation and framework-agnostic delivery: <https://gsap.com/docs/v3/Installation/>
- GSAP ScrollTrigger: <https://gsap.com/docs/v3/Plugins/ScrollTrigger/>
- React Bits text/scroll reveal reference: <https://reactbits.dev/text-animations/scroll-reveal>
- Motion text and stagger reference: <https://motion.dev/docs/animate>
- Reduced-motion accessibility: <https://web.dev/learn/accessibility/motion>
- W3C target-size guidance: <https://www.w3.org/WAI/WCAG21/Understanding/target-size.html>
- Optimizely sample-size calculator: <https://www.optimizely.com/tools/sample-size-calculator>
