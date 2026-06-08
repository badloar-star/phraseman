# Baseline аналитики перед A/B монетизации

> Дата: 2026-06-08
> Цель: 1–2 недели собрать честный baseline воронки ДО включения A/B новых механик.
> Урок прошлого: `intro_ended_*` были объявлены, но не вызывались → половина воронки была невидима.
> Теперь защищено контракт-тестом `tests/analytics_funnel_coverage.test.ts`.

---

## 0. Предусловие: включить PostHog (иначе baseline только в Firebase)

Сейчас вся аналитика пишется в **Firebase Analytics** (работает в проде). PostHog (воронки/когорты/retention из коробки) — **no-op, пока не задан ключ**.

Чтобы baseline был удобен для анализа воронки:
1. `npm i posthog-react-native`
2. В `.env` / `eas.json`:
   - `EXPO_PUBLIC_POSTHOG_KEY=phc_xxx`
   - `EXPO_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com` (или свой)
3. Пересобрать dev-client / прод-билд.

Проверка активации: `isPostHogEnabled()` в `app/posthog_client.ts` возвращает true.
Без этого baseline можно строить и по Firebase, но funnel-отчёты собирать вручную.

---

## 1. События воронки (все ПОДТВЕРЖДЕНЫ вызовами в коде)

Контракт-тест гарантирует, что каждое из них реально вызывается (не только объявлено):

**Верх воронки (онбординг → intro):**
- `onboarding_step_view` { step }
- `onboarding_plan_paywall_view` { plan }
- `onboarding_plan_trial_cta` { plan, has_trial }
- `intro_full_access_started`

**Главный момент конверсии (конец 72ч):**
- `intro_ended_shown` — показана модалка
- `intro_ended_cta` — нажал «Открыть полный доступ» → ведёт на пейвол
- `intro_ended_dismiss` — закрыл без перехода

**Пейвол:**
- `paywall_shown` { context, source }
- `paywall_plan_select`
- `paywall_cta_click`
- `paywall_close` { context } — (теперь и в PostHog)
- `paywall_continue_free` { context } — (теперь и в PostHog)

**Покупка:**
- `purchase_started` { context, plan, with_trial, paywall }
- `purchase_completed`
- `purchase_failed`
- `purchase_cancelled`
- `trial_started`
- `subscription_restored`

**Новые механики (для будущего A/B):**
- `afterwin_upsell_shown` { source } — показан after-win апсейл (level_up)
- `afterwin_upsell_cta` { plan, source } — нажал CTA на after-win пейволе
- `paywall_abandoned_push_sent` — запланирован abandoned-push
- `winback_shown` — показан winback вернувшемуся

---

## 2. Ключевые воронки для отчётов

**A. Главная (intro → оплата):**
`intro_ended_shown` → `intro_ended_cta` → `paywall_shown{context:intro_ended}` → `purchase_started` → `purchase_completed`
- Метрика: conversion intro_ended_shown → purchase_completed.
- Это эталон, с которым потом сравнивать A/B вариантов (#2 «было/стало», urgency, зеркало прогресса).

**B. Онбординг → intro:**
`onboarding_step_view` → `onboarding_complete` → `intro_full_access_started`

**C. After-win (новое, baseline≈0 — сравнить после включения):**
`afterwin_upsell_shown` → `afterwin_upsell_cta` → `purchase_completed`
- Страж: D7/D30 retention и App Store review rate НЕ должны падать (over-prompting).

**D. Re-engagement:**
`paywall_abandoned_push_sent` → (открытие приложения) → `paywall_shown` → `purchase_*`
`winback_shown` → `purchase_*`

---

## 3. Сегментация (свойства, которые уже летят)

- `context` — на `paywall_shown`/`purchase_*` (intro_ended, streak, quiz_limit, trainer_limit, level_up, smart_trainer, …)
- `source` — direct / settings_premium / afterwin_levelup / winback / smart_trainer_lock
- `plan` — monthly / yearly
- `with_trial` / `has_trial` — был ли триал
- `paywall` — v1 / v2 (A/B сплит пейвола `paywall_variant`)

---

## 4. Что НЕ включать пока идёт baseline

- НЕ включать A/B новых конверсионных механик (#2 urgency-вариант, зеркало, перцентиль) на 100% — собрать чистый baseline текущего поведения.
- Новые блоки (зеркало/отзывы/urgency/цена-в-день) уже в проде, но: отзывы скрыты (нет verified), urgency показывается по своей механике. Зафиксировать их текущее состояние как часть baseline.

---

## 5. Через 1–2 недели — критерии готовности к A/B

- [ ] PostHog активен, события видны (или Firobase-выгрузка собрана).
- [ ] `intro_ended_shown → purchase_completed` имеет статзначимый объём (хотя бы N сотен показов).
- [ ] Воронка B (онбординг) не теряет шаги (нет «дыр» где конверсия падает до ~0 — признак неотслеженного события).
- [ ] Зафиксированы baseline-числа по каждой воронке (A–D) — это контроль для A/B.

После этого — запускать A/B детерминированно по userId-хешу (паттерн `remote_flags.ts` `EXPO_PUBLIC_*_AB_*`).
Стражевые метрики в каждом тесте: refund rate, D7/D30 retention, push opt-out, App Store review rate.
