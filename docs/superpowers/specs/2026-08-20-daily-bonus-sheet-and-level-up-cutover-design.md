# Daily Bonus Sheet and Level-Up Gift Cutover

Date: 2026-08-20
Status: implemented; focused contracts verified 2026-08-20

## Objective

Replace the production «Бонус дня» presentation with a newly composed animated
bottom sheet and stop the global level-up flow from opening the legacy one-gift
and two-gift modals.

The selected visual direction is **A — «Герой над текстом»**.

## Scope

### Daily bonus

- Add a new `BoonActivatedSheet` production surface built on
  `HybridSheetShell`.
- Keep `BoonActivatedHost` eligibility, once-per-UTC-day persistence,
  Remote Config kill-switch handling, onboarding gate, and overlay-arbiter
  ownership unchanged.
- Keep the reward semantics unchanged: the boon is already active before the
  sheet is displayed. Closing the sheet must not grant, claim, or mutate a
  reward.
- Use existing generated boon art through `weeklyBoonIconSource`; do not add a
  new bundled asset.
- Keep the former centered `BoonActivatedModal` available only as a rollback or
  development reference until the new sheet is accepted in production.

### Level-up cutover

- The global level-up handler must process only the Spin level-up queue for new
  runtime level crossings.
- It must not automatically open `LevelGiftModal` or `LevelGiftDualModal` after
  the level plaque.
- Do not delete either gift component. The Gifts inventory still uses them to
  apply unclaimed legacy gifts and gifts won through Spin.
- Preserve existing persisted gift inventory and claim behavior. No migration
  may discard a pending reward.

## Daily Bonus Sheet Layout

From bottom to top:

1. Theme-toned sheet surface with the standard drag grabber.
2. A centered boon icon as the single hero.
3. Localized boon title.
4. One concise localized explanation that the boon is already active.
5. A compact truthful status row: energy window until 22:00, flashcard trial
   for 48 hours, and all other displayed boons until the end of the day.
6. One full-width primary CTA.

The background screen remains visible through the standard dimming scrim. The
sheet must remain legible in every existing theme without container borders.
The primary CTA uses `t.accent` with a foreground derived by
`buttonForegroundForBackground`; the status uses `readableOn` against the
actual sheet background. Both meet 4.5:1 without changing global theme tokens,
and lime/neon fills retain a dark foreground.

## Motion Contract

- Sheet entrance and gesture dismissal come from `HybridSheetShell`.
- The sheet rises from the bottom with the shared `LUM`/`SHEET` physics and no
  automatic overshoot.
- The boon icon is the only «Чекан» hero: one finite landing followed by
  exactly one expanding impact ring and zero dust.
- Title, description, status, and CTA resolve in the non-uniform `LUM.ladder`
  order.
- All motion constants come from `constants/motionHybrid.ts`; no local spring
  or duration literals are introduced.
- The drag remains interruptible and follows the finger 1:1 downward, with the
  existing upward rubber resistance and velocity/offset dismissal thresholds.
- Reduce Motion renders the final geometry immediately, with no sheet travel,
  hero fall, recoil, or rings.
- No idle loop is added.

## Interaction and Accessibility

- CTA, backdrop press, Android back, and downward swipe all enter the same
  animated `requestDismiss` path.
- Closing is idempotent: repeated/concurrent requests cannot restart dismissal
  or call the host callback twice.
- The CTA is a `PressableHybrid`/`Pressable` control with button semantics and
  a localized accessibility label.
- The daily sheet's invisible backdrop is hidden from screen readers; the
  visible CTA has a meaningful localized close label.
- The sheet isolates modal accessibility, exposes its title as a header, and
  keeps decorative art and impact rings hidden from screen readers.
- Text supports 200% scaling and reflows inside a bounded scroll region while
  the close CTA remains fixed and reachable. Weights remain 400 and 700.
- The first rendered frame reserves the final content geometry.

## Data Flow

1. `BoonActivatedHost` computes the eligible primary boon.
2. The host persists the daily shown marker before requesting overlay space.
3. The overlay arbiter grants `boonActivated` visibility.
4. `BoonActivatedSheet` receives only localized display data and `onClose`.
5. Closing releases overlay visibility; it performs no economy or entitlement
   write.

The level-up data flow remains:

1. XP crosses one or more levels.
2. The account-scoped Spin queue receives one credit per crossed level.
3. The global handler displays the level plaque and acknowledges the Spin
   level-up notice.
4. When the final queued Spin notice is level 5, the existing after-win
   free-user upsell gate runs with all premium, intro, cooldown, tournament,
   analytics, Firebase, route, and account-generation guards preserved.
5. The user opens Spin separately; the resulting gift is stored in Gifts.
6. Gifts inventory applies that reward through its existing single-gift
   presentation.

## Verification

Add or update focused tests proving:

- the production host renders the new bottom sheet;
- the sheet uses `HybridSheetShell`, shared motion tokens, themed CTA contrast,
  accessibility semantics, 200% reflow, per-boon status truth, and
  reduced-motion behavior;
- the global level-up handler no longer imports or renders either legacy gift
  modal;
- the Gifts inventory still imports and renders both legacy gift components;
- Spin level crossings still produce exact local Spin credits;
- the level-5 upsell remains reachable only after the last Spin notice and
  preserves navigation-before-mark ordering;
- existing boon gating, overlay arbitration, and once-per-day contracts pass.

Run only the affected Jest contracts plus the motion-hybrid guards. Do not run
the whole project suite for this scoped UI change.

## Non-Goals

- No change to boon scheduling, boon effects, Remote Config, or reward amounts.
- No economy schema or Firestore change.
- No deletion of gift inventory or persisted pending gifts.
- No new image generation or bundled asset.
- No change to the Spin reward catalog.
