# Soft upsell premium conversion — design specification

**Date:** 2026-07-13
**Status:** Implemented and frontier-reviewed
**Scope:** Native React Native soft-upsell UI, direct paywall navigation, deterministic attribution, Admin v2 funnel, isolated QA funnel

## 1. Objective

Turn the six soft upsells from QA-looking informational cards into one coherent premium conversion surface that answers, within seconds:

1. What progress did I just make?
2. What will Premium do for me next?
3. Why should I act now?

Every CTA must open the real premium paywall. Every production impression must be traceable, without probabilistic attribution, through paywall interaction to trial or purchase. Manual admin previews must use the same UI and real paywall flow while remaining isolated from production metrics.

## 2. Product principles

- Sell one result: a clear route from the user's current win to more confident real-world language use.
- Use the observed context as proof. Do not present a generic list of features.
- Do not claim personalized facts that the app has not actually measured.
- Keep one visual system and one action hierarchy across all six triggers.
- The primary action opens the real paywall. “Не сейчас” is visually secondary.
- Preserve the existing eligibility, overlay arbitration, cooldown, identity, consent, and premium-access guards.
- Preserve the AI-dialog allowance at exactly `2 lifetime`; this project does not add a daily free dialogue.
- Every commercial claim must be backed by a current trigger value or a bounded measured signal. Missing, tied, sparse, or invalid measurements use neutral fallback copy.

## 3. Chosen visual direction: Quiet Premium (option C)

### 3.1 Surface

- Dark charcoal-to-black gradient with a restrained warm-gold radial glow.
- Thin warm-gold border and soft shadow; no decorative rainbow palette.
- Champagne/gold primary CTA with dark foreground, satisfying the project contrast invariant.
- One consistent Ionicons icon system. No emoji icons.
- Small contextual proof pill above the title, for example `УРОК 1 ЗАВЕРШЁН`.
- Optional two-item proof row only when both items communicate a concrete result. It must not become a feature grid.

### 3.2 Layout

The soft upsell is a real modal surface claimed through the existing overlay arbiter:

1. proof pill;
2. icon;
3. result-led headline;
4. concise explanation;
5. optional proof row;
6. one full-width primary CTA, minimum 52 px high;
7. full-width text-only `Не сейчас`, minimum 44 px touch target.

There is no top-right close button. System Back, backdrop dismissal, and `Не сейчас` all call the same idempotent dismiss path. The primary and dismiss actions must never appear side by side or with equal visual weight.

On phones the surface is a bottom sheet with safe-area padding. On tablets it is centered with a maximum width of 560 px. Text must remain readable at large font scales without horizontal clipping.

### 3.3 Motion

- Modal entrance: opacity plus a short upward transform, 220–280 ms.
- A single diagonal light sweep runs once after the surface becomes visible.
- No infinite animation and no interval timer.
- Use UI-thread animation primitives and only opacity/transform.
- Reduce Motion disables the sweep and uses a simple fade.
- Dismiss animation must finish quickly and must not delay navigation to the paywall.

### 3.4 Overlay ownership

- Add the governed overlay key `softUpsell` immediately before `perfectWeekReward`, making it lower priority than every interrupting, reward, system, and toast surface while preserving the deliberately-last perfect-week reward.
- A soft upsell is opportunistic, not queued: if the slot is occupied, in handoff, or awarded to another waiter during the claim attempt, cancel the soft request and emit `overlay_occupied` suppression. It must not appear later out of context.
- Implement a bounded try-claim path in the arbiter rather than approximating ownership from the existing read-only occupied flag.
- The soft surface is not force-evictable. It releases its claim on dismiss, unmount, account-generation change, or CTA.
- CTA handoff order is mandatory: lock CTA → release `softUpsell` → finish native modal dismissal/handoff gap → navigate to `/premium_modal`.
- Arbitration tests must cover same-tick races, occupied startup, release on unmount, CTA handoff, and absence of a delayed queued display.

## 4. Commercial copy system

Copy follows one structure:

`observed win → cost of losing momentum → specific Premium outcome → act now`

Russian is the approval language. Production strings must remain localized for every currently supported app language. Localization must preserve the promise and hierarchy rather than translate word-for-word. Admin previews show the same production copy source, not a duplicate catalog.

### 4.1 First lesson

- Proof: `УРОК 1 ЗАВЕРШЁН`
- Title: `Ты уже начал. Теперь не теряй темп.`
- Body: `Plus превратит первый результат в понятный маршрут: что учить сегодня, что повторять и как быстрее перейти к живой речи.`
- CTA: `Продолжить с моим планом`

### 4.2 Eight free lessons completed

- Proof: `БЕСПЛАТНЫЙ СТАРТ ПРОЙДЕН`
- Title: `База готова. Дальше начинается твой английский.`
- Body: `Ты прошёл бесплатный старт. Plus откроет полный маршрут, разговорную практику и повторение слабых мест — без случайных упражнений.`
- CTA: `Открыть полный маршрут`

### 4.3 Weekly review

- Proof: `ТВОЯ НЕДЕЛЯ В ЦИФРАХ`
- Title with measured insight: `Ты лучше запоминаешь {strong_area}, чем {weak_area}.`
- Body: `Plus откроет персональные повторы и полный учебный маршрут, чтобы чаще возвращаться к слабому месту, а не повторять всё подряд.`
- CTA: `Усилить слабое место`
- Safe fallback title: `Неделя уже показала, что работает для тебя.`
- Safe fallback body: `Plus соберёт следующие уроки и повторы вокруг твоего реального прогресса — без случайного выбора упражнений.`

The measured version is allowed only when both values are bounded category enum values from the actual weekly-review aggregate, each category has at least five scored attempts, and the success-rate delta is at least 15 percentage points. Ties, smaller deltas, missing samples, or invalid categories use the fallback. Only localized labels from a closed enum may be interpolated; raw user/generated text is forbidden. Each rendered label is capped at 32 characters.

### 4.4 Second AI dialogue

- Proof: `2 РАЗГОВОРА ЗАВЕРШЕНЫ`
- Title: `Ты завершил два разговора. Не останавливай практику.`
- Body: `Plus продолжит разговорную практику в реальных ситуациях и поможет довести знакомые фразы до автоматизма.`
- CTA: `Продолжить говорить`

This copy does not promise one free dialogue per day. The free allowance remains two dialogues lifetime.

### 4.5 Seven-day streak

- Proof: `7 ДНЕЙ ПОДРЯД`
- Title: `Это уже не случайность. У тебя появилась привычка.`
- Body: `Plus превратит регулярность в результат: даст следующий шаг на каждый день и вовремя вернёт то, что начинает забываться.`
- CTA: `Закрепить результат`

### 4.6 Repeated successful training

- Proof with measured weak category: `СЛАБОЕ МЕСТО НАЙДЕНО`
- Title with measured weak category: `{weak_area} пока забирает больше всего ошибок.`
- Body with measured weak category: `Plus откроет персональные тренировки и повторы ошибок, чтобы чаще возвращаться к этой теме, а не повторять всё подряд.`
- Safe proof: `ТРЕНИРОВКА ЗАВЕРШЕНА`
- Safe title: `Повторение уже работает. Следующий шаг — сделать его точнее.`
- Safe body: `Plus откроет персональные тренировки и повторение сохранённых ошибок, чтобы практика опиралась на твои результаты.`
- Measured CTA: `Убрать слабое место`
- Safe CTA: `Продолжить с персональными тренировками`

The measured version requires a bounded trainer/SRS category with at least five scored attempts and an error rate at least 15 percentage points above the next category. It uses the same closed localized enum and 32-character cap as the weekly review. Otherwise the safe fallback is mandatory.

## 5. Navigation and behavior

- All six primary CTAs navigate to the dispatcher route `/premium_modal`. The soft CTA does not call `openPremiumPaywall()` directly because that helper resolves to `/paywall_a|b|c`; the dispatcher remains the single A/B/C selection boundary.
- Add one shared `SoftUpsellAttribution` parser/forwarder. `/premium_modal`, Paywall A/B/C, and the purchase hook all consume the same validated optional object. Existing non-soft entry points receive `null` and behave unchanged.
- The first-lesson CTA no longer stops at a QA toast. It opens the real paywall with `context=first_lesson_success`, not `context=personal_plan`.
- First-lesson purchase fulfillment is explicit: after confirmed premium activation, if a pending personal plan exists, activate it through the existing path; if none exists, route to `/personal_plan_setup` in post-purchase mode so the promised plan is actually created without showing a second paywall. A no-pending-plan test is mandatory.
- Route parameters carry only validated bounded values:
  - `source=soft_upsell`;
  - `soft_upsell_impression_id`;
  - `soft_upsell_trigger`;
  - `soft_upsell_context`;
  - `soft_upsell_mode=production|test`.
- The main paywall creates its own `paywall_impression_id`. Both identifiers coexist and serve different purposes.
- A CTA claim is idempotent. Repeated taps cannot open multiple paywalls or emit duplicate CTA events.
- A dismiss is idempotent. Backdrop, system Back, and `Не сейчас` cannot double-count dismissal.
- If navigation fails, the modal stays recoverable and the user can retry; the failure must not be counted as a paywall impression.
- The attribution object captures the current account generation. Any account change while the soft modal or paywall is open invalidates the object, prevents attribution events from being emitted for the new account, and exits the stale purchase flow safely.
- Restore is never credited as a soft conversion. Restoring a prior entitlement can close the paywall normally but emits no soft trial, activation, or purchase outcome.

## 6. Deterministic analytics chain

### 6.1 Attribution rule

Only the direct chain counts:

`one soft_upsell_impression_id → its CTA → the paywall opened by that CTA → store result in that paywall instance`

There is no seven-day or last-touch attribution. A later purchase from another entry point is not credited to the soft upsell.

Generate `soft_upsell_impression_id` exactly once when the opportunity successfully claims the modal slot, before emitting `soft_upsell_eligible` and before the first visible frame. Eligible therefore carries both the soft impression ID and its own event ID. Candidates rejected or suppressed before a claim do not emit eligible and use a separate bounded suppression event ID with no soft impression ID. Keep claimed chain state stable in immutable/ref-backed state across rerenders. CTA always uses this ID even if asynchronous impression logging is still in flight. The CTA must never wait for analytics.

### 6.2 Event chain

The governed event sequence is:

1. after a successful non-queued overlay claim, create the chain and emit `soft_upsell_eligible` with its stable soft impression and event IDs;
2. on the first visible frame, emit `soft_upsell_impression`;
3. emit exactly one of `soft_upsell_dismiss` or `soft_upsell_cta`;
4. after CTA, emit `paywall_shown`, then follow one of two branches:
   - exit branch: `paywall_close` or `paywall_continue_free`;
   - purchase branch: optional `paywall_plan_select` → `paywall_cta_click` → `purchase_started` → truthful store outcome;
5. after failed, cancelled, or pending outcomes, a later `paywall_close` can be emitted as a separate subsequent event carrying the same attribution;
6. truthful store outcomes are:
   - `trial_started` only when post-purchase RevenueCat CustomerInfo confirms the active matching annual entitlement has `periodType=TRIAL`;
   - `purchase_completed` for confirmed entitlement activation, with `activation_type=trial|paid`;
   - `purchase_pending` for Ask-to-Buy, deferred, or payment-pending outcomes;
   - `purchase_failed` for a classified failure;
   - `purchase_cancelled` for user cancellation.

`trial_started` and `purchase_completed(activation_type=trial)` belong to one successful trial activation. The dashboard labels `entitlement activations`, `trial starts`, and `paid non-trial activations` separately; it never describes every activation as immediately paid.

The commercial invariant is explicit: only the annual subscription can have the seven-day trial. Monthly and lifetime products never emit `trial_started`. Annual offer eligibility shown before purchase is not proof that a trial was applied; only the confirmed post-purchase entitlement period type is proof. Pending is not failure and does not emit completion.

`purchase_pending` is terminal for this direct attribution chain. Closing or leaving the paywall destroys the local chain. If the store approves the transaction later, the entitlement is still activated normally, but that later activation is not credited to the soft upsell because the user selected exact direct-chain attribution rather than delayed attribution.

### 6.3 Shared fields

Claimed-chain events from `soft_upsell_eligible` onward carry:

- `soft_upsell_impression_id` — UUID-like, validated, maximum 80 characters;
- `soft_upsell_trigger` — one of the six governed triggers;
- `soft_upsell_context` — one of the governed contexts;
- `soft_upsell_mode` — `production` or `test`;
- `event_id` — a bounded stable semantic-event identifier, maximum 80 characters.

Paywall and purchase events additionally carry the existing:

- `paywall_impression_id`;
- `context` and `source`;
- `paywall` variant;
- selected `plan`;
- `product_id` where appropriate;
- `time_since_impression_ms`.

The soft identifiers enter the existing Firebase Analytics/PostHog path and remain analytics-consent gated. They must not be written as a new user profile, Firestore identity record, or unbounded raw string.

Validation is atomic: ID, trigger, context, mode, and the governed trigger↔context pair either form one valid `SoftUpsellAttribution` object or the entire attribution is dropped. A partial or forged object must never leave a valid-looking ID attached to unknown metadata.

Semantic event IDs are stable across retries and double callbacks:

- each pre-claim suppression has its own bounded event ID derived from the bounded opportunity/milestone claim, without a soft impression ID;
- one ID each for eligible, impression, CTA, dismiss, paywall shown, close, and continue-free;
- one ID per first selection of each plan;
- each store attempt gets a bounded monotonic attempt number within the paywall instance, and started/pending/completed/failed/cancelled/trial IDs derive from that attempt;
- event IDs include the soft impression ID and compact suffixes while remaining within 80 characters.

The attribution object and its counters live only for the direct open paywall instance. Closing it, completing it, restoring, or changing account generation destroys the chain so a later entry point cannot inherit it.

## 7. Admin v2: Soft upsell funnel

The existing Product Analytics page gains a dedicated `Soft upsell funnel` section. It uses the same 7/28/90-day and platform filters.

### 7.1 Mode separation

Two explicit views are available:

- `Production` — default; includes only `soft_upsell_mode=production`.
- `Test` — includes only manual admin preview chains marked `soft_upsell_mode=test`.

Test events never contribute to production totals, rates, alerts, or recommendations. The selected mode is visually obvious in the section header.

### 7.2 Per-trigger rows

Each of the six triggers shows:

- eligible users/events;
- unique impressions;
- dismissals;
- dismissal rate per impression;
- CTA impressions;
- CTA rate per impression;
- paywall impressions reached;
- paywall reach rate per CTA;
- paywall closes and continue-free actions;
- paywall close rate per reached paywall;
- monthly/yearly/lifetime selections;
- store starts;
- payment-pending outcomes;
- trials started;
- entitlement activations;
- paid non-trial activations;
- failures;
- cancellations;
- impression-to-trial rate;
- impression-to-purchase rate;
- CTA-to-purchase rate;
- median time from soft impression to CTA;
- median time from soft impression to purchase result.

All conversion denominators use distinct `soft_upsell_impression_id`, not raw event counts. Raw event counts can be exposed in a diagnostic tooltip but must not be the headline funnel.

### 7.3 Data-quality indicators

The section reports:

- percentage of downstream paywall events carrying a valid soft impression ID;
- duplicate event count removed by `event_id` deduplication;
- unknown/invalid trigger count;
- chains with CTA but no paywall impression;
- chains with purchase outcome but no purchase start.
- conflicting chains where the same `(soft_upsell_mode, soft_upsell_impression_id)` contains different trigger/context values.

RevenueCat remains the source of truth for actual subscription status and revenue. This funnel reports consented in-app attribution signals and must say so in the UI.

## 8. BigQuery and callable changes

The existing `adminProductAnalytics` callable is extended rather than creating a parallel Firestore analytics store.

- Update `product_analytics_governance.json`, its field registry/field sets, and the event catalog before expanding SQL. Add `soft_upsell_impression_id`, `soft_upsell_trigger`, `soft_upsell_context`, `soft_upsell_mode`, `event_id`, and `activation_type` only to applicable governed events.
- Add the five soft-upsell events and `purchase_pending` to the governed BigQuery allowlist.
- Carry soft attribution on `paywall_close` and `paywall_continue_free` as well as shown, plan-select, CTA, and store events.
- Extract the bounded soft fields, `event_id`, and `activation_type` in `raw_base`.
- Add the six soft contexts to the existing context registry instead of collapsing them to `unknown`.
- Build soft chains grouped by `(soft_upsell_mode, soft_upsell_impression_id)` and validate trigger/context consistency inside each chain.
- Join downstream paywall/purchase events only by the exact `(soft_upsell_mode, soft_upsell_impression_id)` pair, never by user, session, time window, context alone, or paywall context alone.
- Deduplicate all governed chain events by bounded `event_id`; retain the existing fallback dedupe only for legacy non-soft rows.
- Return separate `softUpsells.production`, `softUpsells.test`, and `softUpsells.quality` payloads.
- Preserve existing conversion queries and response fields for backward compatibility.
- Keep callable authentication, permission checks, platform filter, date bounds, cache key, and dataset validation unchanged.

## 9. Admin preview behavior

- The preview catalog imports the same production copy definitions used by runtime triggers.
- Selecting a scenario opens the real redesigned soft modal.
- The soft CTA closes the preview surface and opens the real `/premium_modal` route.
- The chain is marked `soft_upsell_mode=test` from the initial soft impression through purchase outcome.
- The admin preview provides a visible warning: `Тестовая цепочка — не попадёт в Production funnel`.
- QA toasts may confirm test-mode routing but cannot replace navigation.
- Previewing or dismissing does not consume production cooldowns or milestones.
- A test purchase still follows the store/dev-IAP behavior of the installed build; the UI must never claim a real charge when the build uses a bypass.
- The test funnel is still analytics-consent gated. The preview must explain when consent is disabled instead of silently promising that events will appear.

## 10. Error, offline, and privacy behavior

- Analytics never blocks dismissal, paywall opening, or purchase.
- Missing analytics consent means the chain is not observable in the analytics dashboard; no alternate identity tracking is introduced.
- Analytics delivery is best-effort through the existing consent-gated SDK path. The current local analytics queue is disabled, so lack of consent, offline termination, or SDK delivery failure can produce incomplete chains. Admin quality indicators expose partial-chain and downstream-ID coverage instead of presenting the funnel as billing truth.
- Invalid route attribution fields are dropped, not repaired from arbitrary strings.
- Premium users never receive a production soft upsell.
- A failed or cancelled purchase leaves attribution truthful and does not emit completion.
- Account switches invalidate any active soft-upsell claim and attribution context.

## 11. Testing requirements

### 11.1 UI and accessibility

- Same hierarchy and action positions for all six scenarios.
- Primary button and dismiss touch targets meet 44 px minimum; primary is at least 52 px.
- Dark text on the gold/champagne CTA passes contrast.
- Large-font layout, small phone width, tablet width, light/dark app themes, and Reduce Motion are covered.
- The sweep runs once and stops; no new unguarded interval or infinite animation.
- Backdrop, system Back, and `Не сейчас` emit at most one dismissal.
- Weekly and repeated-training measured copy is rejected below its sample/delta thresholds and never interpolates raw text.

### 11.2 Navigation

- Every preview CTA opens the real premium modal.
- Every production trigger opens the correct paywall context.
- Paywall A, B, and C parse the same optional attribution object and preserve non-soft behavior when it is absent.
- Double taps do not create duplicate routes.
- First lesson and lesson eight retain their identity and overlay guards.
- A first-lesson purchase with no pending plan continues to post-purchase plan setup and does not fall home with an unfulfilled promise.
- CTA remains usable when impression analytics is delayed or fails.
- Account switching while the soft modal or paywall is open invalidates the stale chain.
- AI-dialog tests continue to enforce two lifetime free dialogues and no daily allowance.

### 11.3 Attribution

- One generated soft ID is preserved through paywall shown, plan selection, store start, trial, completion, failure, and cancellation.
- A paywall opened independently has no soft attribution.
- A later unrelated purchase cannot inherit a closed soft chain.
- Test and production modes cannot mix in one chain.
- Invalid IDs, triggers, contexts, and modes are rejected.
- Missing, partial, mismatched, and forged attribution is dropped atomically.
- Stable event IDs deduplicate retries and duplicate native callbacks.
- Restore produces no soft conversion.
- Payment pending is distinct from failure and completion.
- Annual trial-eligible but not-applied, annual applied trial, monthly, and lifetime outcomes are tested separately; only confirmed applied annual trial emits `trial_started`.
- Paywall close and continue-free retain direct attribution.

### 11.4 Admin analytics

- Governance registry/field sets, SQL allowlist, extraction, exact `(mode, ID)` joins, event-ID deduplication, conflicting-chain detection, mode separation, denominator calculations, empty state, and partial-chain quality indicators have focused tests.
- Existing product analytics response contracts remain backward compatible.
- Admin rendering tests cover Production/Test switching and all required metrics.

## 12. Acceptance criteria

The work is complete only when:

1. all six soft upsells use the approved Quiet Premium surface and context-led commercial copy;
2. every CTA opens the real paywall;
3. dismiss is consistently secondary and never equal to the purchase action;
4. the one-shot sweep is smooth, bounded, and accessible;
5. a unique soft impression ID survives the entire direct purchase chain;
6. Admin v2 shows per-trigger production and isolated test funnels;
7. annual trial, paid non-trial activation, entitlement activation, pending, failure, cancellation, close, and continue-free metrics are distinguishable;
8. manual QA activity cannot pollute production metrics;
9. existing premium, payment, consent, identity, and performance invariants remain intact;
10. focused UI, navigation, analytics, callable, and admin tests pass.
