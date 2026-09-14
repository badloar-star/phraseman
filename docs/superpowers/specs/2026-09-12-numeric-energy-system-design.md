# Numeric Energy System — Design Specification

**Status:** owner-approved design, 2026-09-12

**Visual direction:** option A, compact dark capsule with an outlined lightning bolt and one animated number

**Browser prototype:** local brainstorming artifact `.superpowers/brainstorm/energy-redesign-20260912/content/energy-system-complete-v1.html`

## 1. Purpose

Replace the current five-slot, raster-based energy presentation with one coherent numeric energy system across Phraseman. The new system must use the same balance, prices, recovery rules, animation language, copy, and entitlement behavior in every feature.

The change includes the underlying energy arithmetic, the global HUD, all activity cost badges, all insufficient-energy surfaces, video recovery, Plus Pro unlimited energy, gifts and rewards, pearl refills, notifications, migration, accessibility, tests, and deletion of the retired energy raster assets and retired spend-flight animation.

The Learning V2 content contract, session content, progress authority, and approved owner layouts are not changed. Learning V2 only consumes the shared energy catalog and shared UI components.

## 2. Approved decisions

1. Default permanent maximum is **100 energy**. Every purchased profile-card level adds **+10**, up to 150 at level V.
2. Passive recovery is **10 energy per hour**, or **+1 every 6 minutes**.
3. Recovery from 0 to 100 therefore takes exactly **10 hours**.
4. Active video watching restores **100 energy per hour**, or **+1 every 36 seconds**.
5. Plus Pro provides unlimited energy and hides the energy indicator and price badges.
6. Activity prices use one typed central catalog:
   - short training: 10;
   - full learning session: 20;
   - Arena match: 25;
   - theory, reading, video navigation, and MAX voice calls: 0.
7. Old `energy_plus1`, `energy_plus2`, and `energy_plus3` gifts become **+20, +40, and +60**.
8. A `+20/+40/+60` gift immediately fills the user to the new temporary cap, guaranteeing a visible result of at least **120/140/160**.
9. Temporary gift capacity lasts until local midnight, stacks additively, and is bounded at +200 (350 total at card level V).
10. The compact numeric capsule is used everywhere. Tapping it opens the same shared energy information popover/sheet.
11. Every visible balance change counts through every intermediate integer in the correct direction.
12. The old raster spend-flight animation is removed, not retained as a second animation.
13. Old general energy and energy-reward raster assets are removed after every static consumer is migrated to the vector/dynamic presentation.

No design decisions remain open.

## 3. Energy model

### 3.1 Balance partitions

The displayed balance is:

```text
displayedEnergy = baseEnergy + bonusEnergy
permanentCap    = 100 + 10 × profileCardLevel
activeCap       = permanentCap + bonusCapacity
```

- `baseEnergy` is clamped to `0..permanentCap` (100..150).
- `bonusEnergy` is clamped to `0..bonusCapacity`.
- `bonusCapacity` is clamped to `0..200`, producing an absolute active cap of 350.
- Expiring bonus energy is spent before permanent base energy.
- Ordinary recovery fills base energy first, then the active bonus capacity.
- When bonus capacity expires, bonus energy and capacity become zero. The permanent balance is not reduced.

### 3.2 Fractional recovery

The UI shows an integer, but the energy engine must retain fractional progress so pauses, backgrounding, rate changes, and short video segments do not discard earned time.

The existing account-scoped `energy_state` key remains the compatibility boundary. Its version-2 payload adds:

```ts
type EnergyStateV2 = Readonly<{
  schemaVersion: 2;
  current: number;                 // integer permanent balance, 0..150
  lastSettledAt: number;           // epoch milliseconds
  recoveryCreditMicrounits: number;// 0..<1 energy, 1 energy = 1_000_000
  recoveryDivisionRemainder: number;// carried integer remainder for exact rate division
}>;
```

Every mutation first settles elapsed recovery, then applies the mutation under the existing storage lock. Integer microunits prevent visible floating-point drift. Division remainders are carried between settlements. A change of rate never resets or moves progress backwards.

### 3.3 Passive recovery

- Normal interval: 360,000 ms per energy.
- Normal rate: 10 per hour.
- Recovery stops at `activeCap`.
- A foreground timer is only a display aid. Correctness comes from elapsed timestamps, so recovery continues across app backgrounding, termination, and device sleep.
- The next-unit timer and full-charge timer are derived from the same settled state used by the balance.

### 3.4 Accelerated recovery rewards

The existing league-chest fast-recovery reward and seasonal/boon `turbo_regen` preserve their current one-third-faster relationship:

- normal: +1 every 6 minutes;
- turbo: +1 every 4 minutes, or 15 per hour.

The current 20-minute override must not survive the migration because it would be slower than the new six-minute base interval. When multiple timed recovery effects overlap, the fastest valid rate wins. Settlement is divided at effect-expiry boundaries so an app resume cannot incorrectly apply an expired boost to the whole offline period.

### 3.5 Video recovery

Video recovery is proportional to verified active player progress:

- 36 seconds watched = 1 energy;
- 1 hour watched = 100 energy;
- this is the total active rate, not passive `+10` stacked on top of `+100`;
- pausing preserves fractional credit and never increases the remaining time;
- seeking, repeated player callbacks, stalled playback, hidden playback, and replayed segments cannot credit the same watched interval twice;
- video recovery fills up to `activeCap` and stops when full;
- the visible badge is driven by the same fractional credit as the balance.

For a missing amount `m`, the exact video time is `m × 36 seconds`, adjusted by already-earned fractional credit. User-facing CTAs may round to a friendly minute while accessibility text exposes the precise duration.

### 3.6 Unlimited modes

The shared unlimited resolver covers:

- verified Plus Pro entitlement;
- owner-configured free-for-all;
- the weekly `energy_free_window` between 19:00 and 22:00 local time;
- tester/no-limits overrides already supported by the application.

Plus Pro behavior:

- the energy HUD is hidden entirely;
- activity starts do not debit energy;
- the underlying balance is filled to the current 100–150 permanent cap and remains valid for a future entitlement expiry;
- active gift capacity and expiry are preserved;
- energy cost badges are hidden;
- video uses the existing rune path instead of energy: 3 runes per minute, 6 on Super Sunday, daily cap 600.

The weekly free-energy window also displays `∞`, but its popover says `Занятия без энергии до 22:00`. It does not refill or overwrite the underlying balance. Passive recovery continues normally.

## 4. Central activity price catalog

The catalog is a single typed local source of truth consumed by availability checks, CTA labels, debit operations, refunds, analytics, and tests. Version 1 does not accept independent remote price overrides; this prevents the UI and debit logic from reading different snapshots.

| Price | Activity family | Production surfaces |
|---:|---|---|
| 10 | Short training | flashcard swipe, speaking, blitz, recall, deck starts and retries; lesson words; irregular verbs; preposition drill; mistake practice |
| 20 | Full learning | classic lesson; Learning V2 session; AI dialog; personal-plan exercise; diagnostic test; legacy and V2 level exams; new-session retry |
| 25 | Arena | matchmaking; friend duel; invite; Arena Today; replay; revenge; any other committed match start |
| 0 | Free | theory; reading; video browsing/watching; navigation; MAX call prestart because voice minutes are already its price |

Known production spend callsites that must be migrated:

- `app/ai_dialog_session.tsx`
- `app/arena_friend_duel.tsx`
- `app/arena_invite.tsx`
- `app/arena_matchmaking.tsx`
- `app/arena_today.tsx`
- `app/diagnostic_test.tsx`
- `app/exam.tsx`
- `app/flashcards_blitz.tsx`
- `app/flashcards_speaking.tsx`
- `app/flashcards_swipe.tsx`
- `app/learning-v2/session/[lessonId]/[sessionId].tsx`
- `app/lesson_irregular_verbs.tsx`
- `app/lesson_words.tsx`
- `app/lesson1.tsx`
- `app/level_exam.tsx`
- `app/max_call_prestart.tsx` — remains explicitly free
- `app/mistake_practice_session.tsx`
- `app/personal_plan_exercise.tsx`
- `app/preposition_drill.tsx`
- `components/level-exam/LevelExamV2.tsx`

The broader callsite contract must also cover cost previews and retries in lesson menus, flashcard collection/result screens, Arena mode/replay/revenge surfaces, personal-plan cards and transitions, Lingman exam entry, and Learning V2 map/start/outcome surfaces.

### 4.1 Debit timing

Energy is charged once when a durable session or match start is committed, not when a screen opens and not on a speculative tap.

Each start uses one stable idempotency key and one receipt that binds:

```text
energy debit + exact session/match entitlement
```

- Double taps and retries replay the same receipt.
- Cancelling before a session/match is created costs nothing.
- A reconnect to the same Arena match costs nothing.
- A genuinely new retry session or new match uses a new receipt and the catalog price.
- If persistence fails before the entitlement exists, the start is blocked and no debit is presented as committed.
- If a committed entitlement cannot be delivered, compensation references the same receipt and restores the exact base/bonus partition spent.

## 5. Gifts and rewards

### 5.1 Conversion table

| Existing reward | New effect | Presentation |
|---|---|---|
| `energy_full` | Fill base and all active bonus capacity | `Полный заряд` |
| `energy_plus1` | Add 20 temporary capacity and fill to the new cap | `+20 до полуночи` |
| `energy_plus2` | Add 40 temporary capacity and fill to the new cap | `+40 до полуночи` |
| `energy_plus3` | Add 60 temporary capacity and fill to the new cap | `+60 до полуночи` |
| league `energy_fast_recovery` | +1 every 4 minutes for its existing duration | `Быстрое восстановление` |
| seasonal/boon `turbo_regen` | +1 every 4 minutes until its existing expiry | `Восстановление ускорено` |
| `energy_free_window` | No debits from 19:00 to 22:00 local time | `Занятия без энергии` |

### 5.2 Required gift sources

The implementation must migrate all of these sources, presentations, receipts, and inventories:

1. Level gifts: `energy_full`, `energy_plus1/2/3`.
2. Level reward wheel: `energy_full`, `energy_plus2/3`.
3. Daily Journey: `energy_full`, `energy_plus` amounts 2 and 3.
4. Friends Together chest: `energyRefilled`.
5. Quest reward: `energy_full`.
6. League chest: `energy_fast_recovery`.
7. Seasonal reward and weekly boon: `turbo_regen` and `energy_free_window`.
8. Active-gift inventory, phone-state projection, reveal scenes, finish line, accessibility labels, notification copy, tester previews, and reward asset manifests.

### 5.3 Stacking and expiry

- Each `+20/+40/+60` reward adds its capacity to the existing temporary capacity, up to 200 bonus capacity.
- Applying the reward fills both base and bonus pools to the new active cap. Example: 34 energy plus a `+40` reward becomes 140/140.
- A reward received at the active cap refills that cap but does not create capacity above the current permanent cap plus 200 (350 at card level V).
- All energy-capacity gifts expire at the next local midnight, matching current behavior.
- Receiving another gift on the same day keeps that same midnight boundary.
- While the gift is active, passive, turbo, video, and `energy_full` rewards may refill to the active cap.
- At visible expiry, the number counts down through intermediate integers to the resulting base value and the gold state changes to normal. Reduced Motion jumps directly to the final state with the text `Бонус завершён`.

## 6. Pearl refill

One legacy energy slot equals 20 units after the numeric migration. The existing exchange value is therefore preserved as one pearl per started block of 20 missing units:

```text
pearlCost = max(1, ceil((permanentCap - baseEnergy) / 20))
```

Examples:

- 86 → 100 costs 1 pearl;
- 8 → 100 costs 5 pearls;
- 0 → 100 costs 5 pearls.

Pearls refill only permanent energy to the current profile-card cap (100–150) and do not manufacture expiring bonus energy. The CTA therefore says `Заполнить до {permanentCap} за {cost} {pearlForm}` instead of claiming to fill an active overcharge cap. The debit and base-energy grant remain one durable composite pearl operation under the Economy Constitution.

## 7. Shared UI architecture

### 7.1 Components

`EnergyHudPill`

- the single compact, borderless indicator used on supported free-user surfaces;
- vector lightning bolt plus one tabular numeric value, with no outline around the container;
- states: normal, low and overcharge; the indicator is absent for Plus/Pro;
- minimum 44×44 hit target even when the visual capsule is smaller;
- opens the shared information surface.

`AnimatedEnergyNumber`

- renders the balance through `AnimatedTextInput` and `useAnimatedProps`;
- uses a UI-thread shared value;
- counts through each intermediate integer;
- deduplicates changes by operation ID;
- exposes an instant final-frame path for Reduced Motion and hidden surfaces.

`EnergyInfoPopover`

- compact anchored popover where space and platform behavior allow;
- the same content falls back to a hybrid bottom sheet on narrow or collision-prone screens;
- uses the approved hybrid modal shell and PressableHybrid/DuoPressable primitives.

`EnergyCostBadge`

- vector lightning and `−10`, `−20`, or `−25`;
- never reads its own price constant;
- receives an activity key and resolves the shared catalog;
- Plus Pro hides both the energy indicator and activity price badges.

`InsufficientEnergySheet`

- replaces all old insufficient/out-of-energy variants with one activity-aware shared surface;
- receives the activity key, required energy, current settled energy, video availability, pearl balance, and entitlement state;
- renders exact time-to-enough, not only time-to-full.

`EnergyRewardPresentation`

- vector/dynamic reward visual used by level gifts, the spin, Daily Journey, quests, and chests;
- variants: full, +20, +40, +60, turbo, and free window;
- removes the need for energy-specific raster reward files.

### 7.2 HUD placement

The shared capsule replaces the existing icon rows and ad-hoc counters on:

- Home;
- Lessons and lesson menu;
- Learning V2 map, resource HUD, session start and outcome surfaces;
- AI Dialog home/session;
- flashcard collection, deck picker, training, and result screens;
- preposition and irregular-verb screens;
- diagnostics and exams;
- personal plans;
- Arena entry, matchmaking, duel, replay, revenge, and Arena Today;
- mistake practice;
- any modal or tester showcase that currently renders `EnergyBar` or `EnergyIcon`.

Only one visible HUD owns the full balance animation for an operation. Other mounted but hidden consumers settle immediately and must not replay the animation when revealed.

## 8. Motion contract

### 8.1 Remove the old spend flight

The current `EnergySpendFlightHost` sends `−N` and a raster lightning asset from the header along a curved global overlay toward a CTA. This behavior is retired completely.

Implementation removal checklist:

- delete `components/EnergySpendFlightHost.tsx` after migration;
- remove its import and mount from `app/_layout.tsx`;
- remove the old `energy_spent_on_start` flight semantics from `app/events.ts` and all emits in `components/EnergyContext.tsx`;
- replace rollback/flight coordination with a balance transaction event;
- remove `ENERGY_SPEND_TRANSFER_HYBRID` if it has no remaining consumer;
- update `app/energy_spend_latency_trace.ts`;
- replace the old flight assertions in `tests/energy_start_cost_contract.test.ts` and `tests/energy_start_confirmation_contract.test.ts` with the new counter contract.

There must never be a release where both the old global flight and the new numeric countdown run for one debit.

### 8.2 New balance transaction

Every committed mutation emits one visual transaction:

```ts
type EnergyVisualTransaction = Readonly<{
  operationId: string;
  from: number;
  to: number;
  reason: 'spend' | 'passive' | 'video' | 'gift' | 'refill' | 'refund' | 'expiry' | 'entitlement';
  source?: 'lesson' | 'training' | 'arena' | 'video' | 'gift' | 'pearls' | 'system';
}>;
```

The active pill animates the sequence inclusively:

- lesson: `86, 85, 84 … 66`;
- Arena: `86 … 61`;
- video unit: `86 → 87`;
- +40 gift: `86, 87, 88 … 140`;
- refund: the exact reverse amount;
- expiry: overcharge value down to the surviving base value.

Each intermediate integer is written to the animated value. Timing is 12–28 ms per unit depending on delta, with the operation ID preventing duplicate playback. The pill uses only transform and opacity for its settle pulse; layout dimensions remain stable.

Spend presentation:

1. The pressed CTA shows a local `−N` label for 180–240 ms.
2. After the durable start receipt commits, the HUD counts down.
3. The lightning gives one restrained coral pulse and returns to violet.
4. No asset flies across the screen.
5. A rolled-back start never leaves the HUD at a reduced final value.

Recovery presentation:

- each passive or video unit rolls upward once;
- the lightning gives a restrained violet pulse;
- reaching 100 gives one settle glow, not a looping celebration.

Gift presentation:

- the number counts to the new cap;
- the capsule transitions from violet to gold;
- the label `Перегруз до полуночи` appears in the gift modal and popover;
- there is no bounce-heavy reward impact on ordinary refills.

Plus Pro presentation:

- the number morphs to `∞` in 240 ms;
- the capsule remains dark with a violet outline/glow;
- no infinite background animation runs.

Reduced Motion always renders the final number and semantic state immediately. No flight, rolling sequence, scale pulse, or looping glow is played.

## 9. Visual states

| State | Bolt/accent | Value | Non-color signal |
|---|---|---|---|
| Normal 20–100 | violet | integer | normal popover label |
| Low 0–19 | coral | integer | accessibility says `низкий заряд`; popover shows requirement/time |
| Gift overcharge | gold | integer | popover shows the active cap |
| Plus Pro | — | hidden | no indicator and no price badges |
| Free-energy window | violet | `∞` | `Занятия без энергии до 22:00` |

Bright lime CTAs always use dark text/icons, never white.

## 10. Canonical Russian copy

All strings are localized through the existing nine-locale system: RU, UK, EN, ES, PT-BR, VI, ID, TR, and PL. Dynamic plural forms use existing locale helpers. No screen hardcodes its own translation table.

### 10.1 Energy popover

Normal:

- `Энергия`
- `{current} из 100`
- `Следующая единица — через {nextUnit}`
- `Полный заряд — через {timeToFull}`
- `Обычная скорость — 10 в час`
- `При просмотре видео энергия восстанавливается в 10 раз быстрее`

Turbo:

- `Восстановление ускорено`
- `+1 каждые 4 минуты`
- `Бонус действует до {time}`

Overcharge:

- `{current} из {activeCap}`
- `Перегруз до полуночи`
- `После полуночи максимум снова станет {permanentCap}`

Plus Pro:

- `Безлимитная энергия`
- `Включено в Plus Pro`
- `Занятия не расходуют энергию`

Free window:

- `Занятия без энергии до 22:00`
- `Ваш обычный запас продолжает восстанавливаться`

### 10.2 Activity price and CTA

- badge: `−{cost}`
- lesson: `Начать урок · −20`
- Learning V2: `Начать сессию · −20`
- short training: `Начать тренировку · −10`
- Arena: `Войти в Арену · −25`
- retry: `Начать новую попытку · −{cost}`
- Pro: price badge hidden
- free: `Без энергии`

### 10.3 Insufficient-energy sheet

- eyebrow: `Нужно {cost} для {activity}`
- title: `Не хватает {missing} энергии`
- body: `Обычным восстановлением хватит через {timeToEnough}.`
- current row: `Сейчас — {current} из {cost}`
- video CTA: `Смотреть видео · около {friendlyVideoTime}`
- video detail: `Видео восстановит недостающее примерно за {exactVideoTime}.`
- pearl CTA: `Заполнить до {permanentCap} за {pearlCost} {pearlForm}`
- subscription CTA: `Безлимитная энергия с Plus Pro`
- dismissal: `Позже`
- unavailable video: `Видео сейчас недоступно. Прогресс восстановления сохранён.`
- persistence error: `Не удалось сохранить изменение энергии. Попробуйте ещё раз.`
- compensation toast: `Энергия возвращена: запуск не состоялся.`

After a successful Plus Pro purchase from this sheet, the pending start intent is resumed exactly once. After a successful pearl refill, the sheet settles the new balance and returns to the same start intent without a second debit.

### 10.4 Gifts

Full:

- `Полный заряд`
- `Энергия восстановлена до {activeCap}`
- CTA: `Забрать заряд`

Capacity gift:

- `Перегруз энергии`
- `+20 до полуночи` / `+40 до полуночи` / `+60 до полуночи`
- `Запас и временный максимум стали {activeCap}.`
- `До полуночи энергия восстанавливается до {activeCap}.`
- `После полуночи максимум снова станет {permanentCap}.`
- cap reached: `Максимальный перегруз — +200. Заряд восстановлен полностью.`

Turbo/free-window reward:

- `Быстрое восстановление`
- `Теперь +1 каждые 4 минуты до {time}.`
- `Занятия без энергии`
- `Энергия не расходуется сегодня с 19:00 до 22:00.`

### 10.5 Video badge

Limited user:

- `Энергия восстанавливается`
- `в 10 раз быстрее`
- full: badge hidden

Plus Pro:

- retain current rune copy and daily-cap messaging;
- energy and rune badges are mutually exclusive.

### 10.6 Notifications and toasts

- notification title: `Энергия восстановлена`
- notification body: `Полный заряд готов. Продолжим?`
- pearl toast: `Энергия восстановлена до {permanentCap}.`
- gift toast: `Перегруз энергии: {current} до полуночи.`
- expiry toast while visible: `Бонус завершён. Максимум снова {permanentCap}.`

The full-energy notification remains idempotent, respects the energy notification preference, and retains quiet hours from 23:00 through 08:00.

### 10.7 Accessibility labels

- normal HUD: `Энергия: {current} из 100. Следующая единица через {nextUnit}.`
- overcharge HUD: `Энергия: {current} из {activeCap}. Перегруз действует до полуночи.`
- low HUD: `Низкий заряд энергии: {current} из 100.`
- Plus Pro HUD: `Безлимитная энергия Plus Pro.`
- cost badge: `{activity} расходует {cost} энергии.`
- disabled start: `Недостаточно энергии. Нужно {cost}, доступно {current}.`

## 11. Asset retirement

The implementation must first remove every static consumer, then delete these tracked raster files:

- `assets/images/energy/energy-start-cost.webp`
- `assets/images/level-spin-rewards/energy_full.webp`
- `assets/images/level-spin-rewards/energy_plus2.webp`
- `assets/images/level-spin-rewards/energy_plus3.webp`

Known consumers that require migration include:

- `components/EnergyIcon.tsx`
- `components/EnergyCostBadge.tsx`
- `components/EnergySpendFlightHost.tsx`
- `components/session_attempts/SessionAttemptsRecoveryModal.tsx`
- `components/youtube/VideoEnergyBoostBadge.tsx`
- `app/theme_ui_assets.ts`
- `app/level_spin_reward_assets.ts`
- `app/level_spin_reward_asset_manifest.ts`
- `components/daily_journey/DailyJourneyRevealScene.tsx`
- reward-wheel, quest, gift, and tester-preview consumers of those maps.

The replacement is an SVG/vector lightning shape plus live text. Deletion is allowed only after a literal repository search proves zero remaining static references and the relevant asset guards are updated to require the new no-raster contract.

## 12. Migration

Migration is account-scoped, idempotent, and performed under the existing energy storage lock.

### 12.1 Base state

Migration first settles every complete legacy 30-minute unit that elapsed before
the migration timestamp. It then converts the settled balance and the remaining
partial legacy slot:

```text
legacyFraction = elapsedWithinCurrentLegacySlot / 30 minutes
scaledProgress = legacyFraction × 20
newBase = clamp(oldSettledCurrent × 20 + floor(scaledProgress), 0, 100)
newRecoveryCredit = fractionalPart(scaledProgress)
```

With zero partial progress: 0→0, 1→20, 2→40, 3→60, 4→80, 5→100. A user
at 3/5 who was halfway through the next legacy slot migrates to 70/100, not
60 plus only half of one new unit.

This preserves the whole earned fraction of the old 20-energy-equivalent slot.
After that one-time conversion, the new six-minute interval becomes authoritative;
unearned legacy wall-clock time is not carried forward.

Malformed legacy state follows the current fail-safe policy and must not silently create negative or over-cap balances.

### 12.2 Bonus state

- legacy capacity/amount 1 becomes 20;
- 2 becomes 40;
- 3 becomes 60;
- larger valid accumulated values are multiplied by 20 and clamped to the 200 bonus-capacity ceiling;
- the original expiry timestamp is preserved;
- a consumed bonus amount and its still-active capacity remain distinct.

### 12.3 Remote and level defaults

- `max_energy` default and validation range move from the fixed legacy value 5 to 100;
- `energy_recovery_interval_ms` default becomes 360,000;
- level-aware maximum helpers stop adding slots and return 100;
- tester controls, previews, fixtures, and phone-state snapshots use the new scale;
- readers remain backward-compatible for one release boundary, but writers emit only version 2 after migration.

## 13. Notification timing

The full-charge notification is scheduled from the same rate-aware projection as the UI.

- Spending below the active cap schedules or replaces one notification.
- Reaching the cap, entering Plus Pro, or applying a gift that fills the cap cancels it.
- Turbo and video progress reschedule it when the predicted completion materially changes.
- If temporary capacity expires before it could refill, the projection splits at midnight and schedules against the resulting 100 cap.
- Quiet-hour shifting remains 23:00–08:00 local time.
- Notification permission is never requested at spend time.

## 14. Error and concurrency behavior

1. Spend, gift, video credit, pearl refill, passive settlement, refund, and expiry use the same account-scoped lock.
2. Every durable user operation has a stable idempotency key.
3. Bonus energy is spent first and refunded back to its original partition while the bonus entitlement is still valid.
4. A refund after bonus expiry restores only the legal surviving partition and records the reconciliation in the original receipt.
5. Account generation changes abort stale async work before it can write another account's energy.
6. Corrupt bonus storage never gets overwritten by a speculative spend; the user sees a recoverable error path.
7. Network failure affects synchronization only. It cannot duplicate a local debit or revoke an already committed local session result.
8. No direct pearl debit is introduced; pearl refill remains a composite operation with its exact energy grant.

## 15. Performance and accessibility

- Balance animation runs on the UI thread through Reanimated shared values.
- No continuous animation, global timer, or hidden-screen loop is introduced.
- Countdown updates are active only while a relevant surface is visible and the app is active.
- Layout width is reserved for three digits and `∞`; counting never shifts neighboring header content.
- All interactive energy surfaces have at least a 44×44 touch target.
- Normal text meets 4.5:1 contrast.
- Color is never the only state signal.
- Vector icons use one 24×24 viewBox and remain decorative when the parent has the full accessibility label.
- Reduced Motion displays the final frame and semantic copy with no motion.

## 16. Verification plan

### 16.1 Pure arithmetic tests

- 0→100 passive recovery takes exactly ten hours.
- +1 passive recovery occurs every six minutes.
- video grants exactly 100 units per verified hour and preserves fractional segments.
- passive and video rates do not accidentally stack.
- turbo changes the interval to four minutes and preserves partial progress.
- settlement across a boost expiry applies each rate only to its valid segment.
- time-to-enough and time-to-full agree with the displayed countdowns.
- pearl cost uses `ceil(missingBase / 20)`.

### 16.2 Gift tests

- full gift fills the active cap;
- +20/+40/+60 guarantees 120/140/160 from any lower balance;
- multiple gifts stack to at most 200 above the current permanent cap (350 at card level V);
- bonus is spent before base;
- ordinary recovery refills active bonus capacity;
- local-midnight expiry removes only bonus state;
- Daily Journey, level gift, wheel, quest, Friends chest, league, season, and boon adapters all map to the new contract;
- reward copy and accessibility values match the granted amount.

### 16.3 Debit and receipt tests

- each activity key resolves exactly one catalog price;
- every production start callsite uses the catalog;
- double tap, retry, reconnect, and receipt replay charge once;
- a new retry session charges once with a new operation ID;
- failed entitlement creation does not leave an orphan debit;
- compensation restores the exact partition and animates once.

### 16.4 UI and motion tests

- one shared capsule appears on every inventoried header;
- normal, low, overcharge, Plus Pro, and free-window states render correctly;
- tapping the capsule opens the shared popover/sheet;
- `86→66` visits every intermediate integer in order;
- `86→140` visits every intermediate integer in order;
- one operation ID cannot animate twice;
- hidden consumers do not replay old operations;
- Reduced Motion renders the final number immediately;
- all CTA prices and insufficient-energy copy use the same resolved cost.

### 16.5 Retirement guards

Repository guards must fail if any of these return:

- `EnergySpendFlightHost` mounted in `_layout`;
- `energy_spent_on_start` used as the retired flight event;
- `energy-start-cost.webp` referenced by source;
- `energy_full.webp`, `energy_plus2.webp`, or `energy_plus3.webp` referenced by source;
- a production start hardcodes `1`, `10`, `20`, or `25` instead of using the catalog;
- a legacy five-slot `EnergyBar` is rendered;
- a separate screen-level energy popover duplicates the shared one.

### 16.6 Focused project gates

- existing energy, bonus-energy, gift-storage, refill, video, notification, and session-callsite tests;
- focused React Native UI tests for the new shared components;
- Arena-focused start/reconnect tests without changing Arena competition rules;
- Learning V2 blueprint fingerprint gate;
- Learning V2 authoring preflight must introduce no findings beyond the five pre-existing legacy course-slot wiring HOLD findings observed before this design;
- literal zero-reference asset scan before deletion.

Heavy Jest/type/build commands must acquire and release the repository traffic-light semaphore.

## 17. Rollout and rollback boundary

1. Land the versioned engine and migration reader first behind one internal `numeric_energy_v2` rollout switch.
2. Migrate the shared HUD, popover, cost badge, and insufficient-energy sheet.
3. Move every production activity to the central catalog and receipt contract.
4. Migrate video, Plus Pro, gifts, rewards, pearl refill, and notifications.
5. Remove the old spend flight and all static raster consumers in the same release where the new animation becomes authoritative.
6. Delete the four raster assets only after zero-reference verification.
7. Enable the new writer and UI together. Never expose a 0–5 writer to a 0–100 UI or vice versa.

Rollback may switch presentation back only while the compatibility reader remains, but must never divide or overwrite a version-2 balance destructively. Once all supported clients understand version 2, the legacy reader and rollout switch can be retired in a separate change.

## 18. Acceptance criteria

The feature is complete only when:

- every visible energy balance uses the approved numeric capsule;
- every visible change animates each intermediate integer, with a Reduced Motion final-frame alternative;
- all activity prices match the catalog and every committed start charges exactly once;
- passive, video, turbo, gift, Pro, pearl, offline, notification, and expiry behavior match this document;
- all energy-related gifts and rewards use the new scale and dynamic presentation;
- the old global spend flight is absent;
- the four retired raster assets have zero references and are deleted;
- all nine locales and accessibility labels are covered;
- focused deterministic gates pass and no protected Arena, Economy, Jarvis, or Learning V2 contract is weakened.
