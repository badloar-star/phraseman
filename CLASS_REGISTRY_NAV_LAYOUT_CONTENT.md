# Navigation, Layout, Content, Date, And Haptics Registry

Дата: 2026-06-26.

Статус: первый проход по коду. Runtime не менялся.

## Purpose

Этот реестр фиксирует T1/T2-слой: переходы между экранами, back behavior, layout/safe-area контракты, локализацию, даты и haptics.

Правило: если навигация ведёт к premium/paywall, shards, progress, auth, account deletion или серверной награде, конкретный flow поднимается до T0/T1 и требует узких тестов.

## Navigation Owners

Главные носители:

- `app/_layout.tsx`: root stack, deep links, startup redirects, onboarding/paywall/update gates.
- `app/(tabs)/_layout.tsx`: нижние табы, active tab, deferred tab navigation.
- `components/DeferredRedirect.tsx`: безопасный redirect из effect, не во время render.
- `app/navigation_back.ts`: собственный стек "назад" и `safeRouterBack(...)`.
- `app/safe_modal_navigation.ts`: helper для modal navigation.
- `app/daily_task_navigation.ts`: переходы из daily tasks.
- `app/personal_plan_navigation.ts`: personal plan routes.
- `app/phrase_analytics_navigation.ts`: phrase analytics routes.

Найденный контракт:

- early route redirects must use `DeferredRedirect`;
- root stack keeps opaque background and `animation: 'none'` to avoid blank/underlay glitches;
- `safeRouterBack(...)` avoids native `router.back()` and uses deterministic `router.replace(...)`;
- transient redirect routes like `/premium_modal` are not kept in custom back stack;
- query changes do not create duplicate back-stack entries.

## Layout / Modal Owners

Носители:

- `components/OverlayArbiter.tsx`
- `components/overlay_arbiter_core.ts`
- `components/ContentWrap.tsx`
- `hooks/use-tab-content-bottom-pad.ts`
- `hooks/useModalBackdropFade.ts`
- `components/modal_fx/ModalFx.tsx`
- `components/RewardModalBackdrop.tsx`
- `components/*Modal.tsx`
- `app/(tabs)/home.tsx`
- `app/(tabs)/lessons.tsx`
- `app/(tabs)/arena.tsx`
- `app/(tabs)/friends.tsx`
- `app/(tabs)/settings.tsx`

Риски:

- modal underlay shows stale tab/screen;
- native modal handoff overlaps with custom overlay;
- bottom tab padding clips CTA;
- full-screen stack route hides mounted tab content;
- text overflows compact cards/buttons.

Existing guardrails:

- `tests/navigation_back_underlay_contract.test.ts`
- `tests/modal_opaque_surfaces_contract.test.ts`
- `tests/diagnostic_continue_footer_layout.test.ts`
- `tests/home_week_dots_compact_layout.test.ts`
- `tests/league_bonus_modal_safe_area.test.ts`
- `tests/personal_plan_home_route_card_layout.test.ts`

## Content And Locale Owners

Носители:

- `components/LangContext.tsx`
- `constants/i18n.ts`
- `app/settings_language.tsx`
- `app/source_locales.ts`
- `app/lesson_locale_utils.ts`
- `app/exam_locale.ts`
- `app/daily_tasks_es_locale.ts`
- `app/achievements_es_locale.ts`
- `app/diagnosis_training_copy.ts`
- `components/trainer_load_copy.ts`
- `components/paywall/paywallScreenCopy.ts`
- `app/paywall_copy.ts`
- `app/boons/boon_copy.ts`
- `app/compass/compass_copy.ts`

Риски:

- key exists in RU but not in enabled languages;
- UI copy is translated but runtime source locale is wrong;
- Spanish/French target content leaks into English flow or наоборот;
- generated content bypasses locale gates;
- "copy fix" changes lesson semantics or answer validation.

Existing guardrails:

- `tests/i18n_locale.test.ts`
- `tests/locale_ru_uk_es.test.ts`
- `tests/bootstrap_locale_contract.test.ts`
- `tests/interface_language_options_prod.test.ts`
- `tests/home_locale_runtime.test.ts`
- `tests/lesson_menu_locale_runtime.test.ts`
- `tests/lesson_intro_screens_locale.test.ts`
- `tests/exam_locale_runtime.test.ts`
- `tests/daily_tasks_es_locale.test.ts`
- `tests/diagnosis_training_*_locale*.test.ts`
- `tests/paywall_copy_contract.test.ts`

## Date / Time Owners

Носители:

- `app/daily_tasks.ts`: `getTodayKey()`, daily task day boundaries.
- `app/weekly_xp.ts`: week start calculation.
- `functions/src/daily_tasks_shards.ts`: `utcDayKey(...)`, acceptable today/yesterday UTC window.
- `app/streak_*`: streak windows and revive/freeze logic.
- `app/after_win_upsell_gate.ts`: per-day paywall gating.
- `app/activity_365_analytics.ts`: heatmap and forecast dates.
- `constants/avatars.ts`: weekly avatar rotation epoch.

Риски:

- local day vs UTC day mismatch;
- streak/paywall/daily task reset at wrong time;
- reward claim accepts arbitrary past/future day;
- test uses current real date and flakes.

Existing guardrails:

- `tests/unit/daily_tasks.test.ts`
- `tests/daily_tasks_shards_claim.cloud.test.ts`
- `tests/weekly_xp.test.ts`
- `tests/streak_*`
- `tests/activity_365_analytics.test.ts`
- `tests/after_win_upsell_gate.test.ts`

## Haptics Owners

Носители:

- `hooks/use-haptics.ts`
- `app/haptics_tap_preload.ts`
- `hooks/use-record-start-cue.ts`
- `hooks/use-message-received-cue.ts`
- `components/ActionToast.tsx`
- `components/AchievementToast.tsx`
- reward/modal components that call `hapticSuccess`, `hapticTap`, or impact haptics.

Найденный контракт:

- tap haptic cooldown: `HAPTIC_TAP_COOLDOWN_MS`.
- success/warning/error/impact cooldown: `HAPTIC_FEEDBACK_COOLDOWN_MS`.
- haptics setting is cached from `AsyncStorage`.
- comments recommend `onPressIn` for best tap latency.

Existing guardrail:

- `tests/haptics_rate_limit.test.ts`

## Closed In This Pass

### `tests/navigation_back.test.ts`

Что было:

- Test still expected old native `router.back()` behavior when an in-app previous route existed.
- Current `app/navigation_back.ts` deliberately avoids native back and uses `router.replace(...)` because native back re-exposes an Android/Fabric crash path.

Что сделано:

- Updated the test to assert the current contract: no `canGoBack`, no `back`, replace to the recorded previous route once.

### `tests/deferred_redirect_contract.test.ts`

Что было:

- Test expected every listed route shim to import `DeferredRedirect`.
- `app/league_screen.tsx` is now a pure route alias: `export { default } from './club_screen';`.

Что сделано:

- Updated the test to allow two safe route-shim forms: `DeferredRedirect` or a pure re-export alias.
- It still rejects `useRouter` and `router.replace(...)` in render.

## Stop Points

Остановиться и спросить хозяина:

- changing back-stack behavior for paywall/premium/shards/progress flows;
- changing day boundary logic for streak, daily tasks or rewards;
- removing a redirect route instead of fixing its timing;
- disabling haptics globally instead of respecting user setting and cooldown;
- changing content generation rules that affect answer correctness.
