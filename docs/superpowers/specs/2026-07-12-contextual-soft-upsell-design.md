# Contextual Soft Upsell Design

Date: 2026-07-12

## Goal

Add calm, contextual Plus invitations after proven user value without creating another modal queue, interrupting rewards, or changing existing free limits.

Plus has one product promise across all contexts: help the learner turn learned phrases into confident real speech without stopping halfway. Each trigger explains how Plus continues the result the learner has just achieved.

## Locked Product Decisions

- AI dialogues remain exactly two free dialogues for the lifetime of a free account. There is no daily refill and no larger welcome allowance.
- The free lesson boundary remains eight lessons.
- The flashcard limit and its existing `flashcard_limit` paywall remain unchanged.
- Quiz, Arena, energy, AI-explain, and other free limits are outside this change.
- A soft upsell never opens a paywall automatically.
- A soft upsell never enters the Overlay Arbiter queue and is never replayed later as an unrelated modal.
- Premium and VIP users never see soft upsells.

## User Experience

The sequence is always:

1. The learner completes a valuable action.
2. The product shows the complete result, reward, progress, and feedback.
3. If the current screen has a safe inline slot and no overlay conflict, the product may show one contextual card.
4. The learner can continue through the CTA or dismiss it without losing progress.

The shared card contains:

- one short statement of the proven result;
- one explanation of how Plus deepens or continues that result;
- one primary CTA;
- a clearly visible dismiss action.

The card is not a native `Modal`, portal, toast, or automatic navigation. Touch targets are at least 44x44 px, body text meets 4.5:1 contrast, reduced-motion settings are respected, and lime/green filled controls use dark foreground text.

## Trigger Map

### First completed lesson

Eligibility requires the first canonical lesson completion for the scoped account and study target. The opportunity appears only after the lesson reward sequence has finished.

The CTA opens the existing personal-path setup. It does not open `premium_modal`.

If another overlay is active or the result screen can no longer render the card safely, the opportunity is skipped. It is not queued globally.

### Free lesson boundary

Eligibility requires successful completion of lesson eight, or successful completion of the canonical exam that represents the same free boundary. Failed exam attempts and repeated completions do not qualify.

After the full reward sequence, the card presents the completed first stage and offers the next route. The CTA opens the existing paywall with a dedicated `free_lessons_complete` context. Completed lessons, review, and progress remain accessible.

### Weekly Review

The free learner first sees a real personalized conclusion. The card can then offer Plus depth: the complete diagnosis, recommended actions, or a more frequent review.

The opportunity is suppressed for loading, skeleton, error, empty, and `insufficient_data` states. Analytics never contain the personalized review text.

### Second completed AI dialogue

Eligibility requires the second unique, successfully completed AI dialogue for the scoped account. It is based on confirmed completion, not attempts, turns, or screen opens.

The card is shown after the dialogue result and offers continued real-conversation practice. The AI-dialogue allowance remains exactly `2 lifetime`.

### Streak milestones

Eligible milestones are exact first arrivals at 7, 14, and 30 days. A launch with `streak >= milestone` is not sufficient. The primary streak reward has priority.

If the relevant screen has a safe inline slot after rewards, it may show the card. Otherwise the opportunity is skipped; it is not queued for a later unrelated screen.

### Repeated successful training

The trigger type is reserved but disabled by default. It remains inactive until a separate specification defines a canonical successful-training event and its counting window.

### Flashcards

No new UI or behavior is added. A preservation contract verifies that saving beyond the current limit still routes through the existing `flashcard_limit` context and does not lose the attempted user action.

## Priority

When multiple triggers qualify for the same safe slot, select one deterministically:

1. Free lesson or qualifying exam boundary.
2. Second completed AI dialogue.
3. Weekly Review with a real insight.
4. Streak 30, then 14, then 7.
5. First completed lesson.
6. Future repeated successful training.

Only one opportunity may be claimed in a runtime session.

## Architecture

### Policy core

A pure module receives trigger facts, premium access, Remote Config values, persisted timestamps, session state, and overlay occupancy. It returns either an eligible opportunity or a finite suppression reason.

The policy owns trigger priority, exact milestone rules, global cooldown, context dismiss cooldown, and destination selection. It performs no storage, navigation, analytics, or rendering.

### Persisted state

Versioned AsyncStorage state records:

- the last actual global soft-upsell impression;
- dismiss timestamps by context;
- one-time milestones already impressed;
- schema version;
- account and study-target scope for learning-dependent milestones.

Account switch and deletion cannot carry learning milestones into another account. Storage migration fails closed: invalid state suppresses no permanent capability and is replaced with a valid empty state.

### Session coordinator

The coordinator serializes competing claims and allows at most one actual soft-upsell impression per runtime session. A global seven-day cooldown starts only after the card is actually rendered and reports an impression.

Eligibility, suppression, dismissal, CTA, and impression are distinct transitions. Eligibility never consumes a cooldown.

### Overlay occupancy

Overlay Arbiter exposes only a read-only occupied signal. Soft upsell is not added to `OverlayKey`, `OVERLAY_PRIORITY`, wants state, native-modal lists, or watchdog logic.

An occupied overlay causes a local `skip` unless the current screen already owns a safe inline slot that can remain until that screen closes. There is no background wait for the arbiter to become free.

### Shared card

One reusable React Native component receives finalized copy, destination, CTA, dismiss handler, theme, and accessibility labels. It does not decide eligibility or perform automatic navigation.

## Cooldowns

- Maximum one actual soft-upsell impression per seven rolling days.
- Maximum one actual soft-upsell impression per runtime session.
- A dismiss creates a context-specific cooldown.
- A one-time milestone is consumed only after a real impression.
- Two explicit dismissals of the same context may later support a longer cooldown, but this is not required in version one.
- Hard-limit paywalls are not counted as soft-upsell impressions.

The global seven-day limit is fixed in version one rather than remotely tunable.

## Remote Configuration

Each trigger has an independent boolean kill switch with safe default `false`:

- first lesson;
- free lesson/exam boundary;
- Weekly Review;
- second AI dialogue;
- streak milestones;
- repeated successful training.

Triggers are enabled individually only after their focused verification. No new admin screen is required. If admin controls are changed, `docs/design/ADMIN_UI_BIBLE.md` must be read first.

## Analytics

Events:

- `soft_upsell_eligible`;
- `soft_upsell_impression`;
- `soft_upsell_cta`;
- `soft_upsell_dismiss`;
- `soft_upsell_suppressed`.

Bounded parameters:

- context;
- trigger;
- destination;
- study target;
- overlay occupied flag;
- suppression reason;
- schema/config version;
- the applicable bounded counter: lesson count, dialogue count, or streak milestone.

An impression is emitted only after actual rendering. Personalized review content, arbitrary error strings, user text, and identifiers are excluded.

## Performance and Navigation

- The coordinator is not a frequently changing global React context.
- Persisted state is read only at candidate trigger points and cached with bounded lifetime.
- Screens keep their existing first-frame geometry and frozen-background behavior.
- No new timer, polling loop, infinite animation, or focus refetch is introduced.
- CTA navigation uses the existing personal-plan and paywall routes and preserves the current back destination.

## Tests

Required focused coverage:

- policy suppression for Premium/VIP, disabled trigger, global cooldown, session cap, context dismiss, and occupied overlay;
- deterministic priority;
- exact first/eighth lesson boundaries and repeat suppression;
- exam success only;
- Weekly Review only after a real insight;
- AI dialogue only at confirmed unique completion count two;
- explicit preservation of the `2 lifetime` AI-dialogue limit;
- streak exact first arrival at 7, 14, and 30;
- persisted-state migration and account/study-target isolation;
- concurrent claim serialization;
- impression only after render;
- Remote Config defaults off;
- soft upsell absent from Overlay Arbiter queue and priority maps;
- existing flashcard-limit behavior unchanged;
- accessibility and lime-surface dark-foreground contracts.

Existing focused overlay, lesson completion, Weekly Review, dialogue-limit, streak, performance-freeze, lifecycle, and navigation-underlay guards must remain green.

## Rollout

1. Ship the policy, storage, coordinator, card, analytics, and kill switches with every trigger off.
2. Verify first lesson and enable it for a controlled audience.
3. Verify and enable the eighth-lesson boundary.
4. Verify Weekly Review.
5. Verify the second AI dialogue without changing its allowance.
6. Verify streak 7/14/30.
7. Leave repeated training disabled until separately specified.

## Acceptance Criteria

- Soft upsell never enters or waits in the overlay queue.
- No paywall opens automatically.
- No user sees more than one soft impression per session or seven days.
- Premium/VIP sees none.
- Every trigger can be remotely disabled and defaults off.
- First lesson leads only to the personal path.
- AI dialogues remain exactly two lifetime for free users.
- Flashcard behavior and all unrelated limits remain unchanged.
- Impression analytics correspond to visible UI.
- Focused tests and protected performance/navigation contracts pass without weakening existing guards.
