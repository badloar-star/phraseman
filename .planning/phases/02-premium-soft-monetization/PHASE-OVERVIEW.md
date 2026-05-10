ujeгоу а# Phase 02 — Premium Soft Monetization

**Status:** Planning
**Owner:** badloar@gmail.com
**Created:** 2026-05-03

## Goal

Усилить монетизацию через soft-pressure (без отнятия контента у free-юзеров), добавить персонализированные пейволлы, переработать Active Recall в killer-feature «Тренер», добавить Premium Analytics — без оттока пользователей.

## Strategy

**Что НЕ делаем:**
- Контентный пейволл (lock уроков 4-32 за premium) — high churn risk
- Per-lesson shard unlock (псевдопейволл) — bad UX

**Что делаем:**
- Soft trial-push после lesson 5
- Mastery mode (повтор пройденных уроков за 100💎 или Premium = безлимит)
- Premium analytics (heatmap 365 дней, mistake patterns, percentiles only-positive)
- «Тренер» — переработка Active Recall в killer-feature с weak-points / SM-2 / push-уведомлениями
- Персонализированные пейволлы (top-3 болевых тегов)
- Premium-purchase celebration (включая admin-grant)

## Phases (Plans)

| # | Plan | Effort | Depends |
|---|---|---|---|
| 1 | UI Foundation (5 модалок, mastery, blur, admin tab, celebration) | 2-3 дня | — |
| 2 | Personalized Paywall (5 счётчиков, top-3 picker) | 1-2 дня | 1 |
| 3 | Тренер — killer-feature (mistake_log, phrase_priority, /trainer экран, режимы) | 4-7 дней | 1 |
| 4 | Premium Analytics (heatmap 365, mistake patterns, percentiles) | 3-5 дней | 3 (нужны данные mistake_log) |

## Success Criteria (для всей фазы)

1. **No retention regression** — D1/D7/D30 retention не падает (метрика после деплоя через 14 дней).
2. **Mastery работает** — юзер может перепройти любой завершённый урок за 100💎 ИЛИ премиум; теория/словарь остаются открытыми.
3. **Premium celebration срабатывает** — после успешной IAP-покупки И после admin-grant (через `admin_premium_override`) при следующем mount home.tsx.
4. **Stats blur** — free-юзер видит размытые графики с замочком; премиум — четкие графики.
5. **Тренер** — free: 1 сессия/день в 2 режимах; premium: безлимит во всех режимах.
6. **Personalized paywall** — показывает top-3 «болевых» тега; для новичка fallback на generic.
7. **Admin Modals Preview** — все 6+ модалок открываются из админ-таба для ручной проверки.

## Out of Scope (parking lot)

- AI Coach с реальным LLM (заменён на rule-based «Smart-план»)
- PDF Reports
- Voice chat tutor
- CEFR Level Tracker
- Exam Readiness Predictor
- Friend Comparison
- Custom Learning Path

## Decision Log

- **2026-05-03** — выбрали soft-pressure стратегию (не контентный пейволл) для защиты retention
- **2026-05-03** — Mastery триггерится после первого `lesson_complete` (любой score), блокируется только кнопка «Начать урок»
- **2026-05-03** — Аренa НЕ пишется в mistake_log (только learning modes)
- **2026-05-03** — Personal Best Percentiles only-positive (никогда «ты медленнее X%»)
- **2026-05-03** — AI Coach в parking lot, замена rule-based «Smart-план»
- **2026-05-03** — Phrase tag classification — Variant B (одноразовый AI-batch GPT-4o ≈ $0.30)
