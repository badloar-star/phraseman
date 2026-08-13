# Джарвис как product manager: архитектура и план

Дата: 2026-08-13

## Проблема

Прежний утренний контур был stateless-монитором порогов:

- изменение `125 → 126` меняло `contentHash` и превращало старую тему в «новую»;
- очередь поддержки смешивала подтверждённые человеческие письма с legacy-записями;
- LLM было прямо запрещено предлагать новые рекомендации — он повторно пересказывал шаблон;
- приоритет почти полностью определялся названием департамента, без novelty и динамики;
- Telegram approval ещё не является полноценным lifecycle задачи.

## Целевой принцип

Джарвис сообщает не состояние базы, а **изменение, требующее решения**.

Правильный ежедневный результат при неизменных данных — молчание. Тема возвращается,
только если она новая, материально изменилась, reopened, стала P0 либо наступил срок
принятого владельцем действия.

Поток:

```text
sources → trusted observations → stable issues → novelty/material-change gate
        → business priority → PM hypothesis/experiment → owner decision
        → task lifecycle → outcome reflection → issue memory
```

## Реализовано в первой итерации

1. `support_inbox.triageState === kept` — единственное доказательство, что `new`
   письмо является живой очередью ответа. Legacy остаётся видимым, не удаляется и
   не выдаётся за SLA-инцидент.
2. Междневная bounded-memory тем хранится server-only в `jarvis_control/global`.
3. Малое дрожание счётчика не является новостью; P1/P2/P3 без новых данных больше
   не повторяются по cooldown. P0 сохраняет повтор из-за заблокированного человека.
4. Scope сохраняет номера уроков/builds; разные продуктовые сущности не склеиваются.
5. LLM теперь строит проверяемую гипотезу и дешёвый эксперимент с метрикой успеха,
   не имея права придумывать факты или менять детерминированные пороги.
6. Telegram явно разделяет изменение, рекомендацию и PM-план.
7. PM prompt получает server-owned 28-day business history, настоящий business
   tier/MRR и свежие current-vs-previous comparisons из существующего admin digest.
8. Telegram approve/reject теперь записывается в точную версию плана; reject
   архивирует её. Это lifecycle решения, но не разрешение на внешнее выполнение.
9. Completed LLM cache переиспользуется; повторный hash больше не резервирует
   бюджет до проверки cache.

## Следующие итерации

### P1 — единый PM brief

- Расширить уже подключённые trusted comparisons из `admin_daily_digest.ts`
  когортами/activation; не создавать третий вычислитель метрик.
- Включить current-vs-previous 7/28 days, настоящий business tier, релизы и
  активные эксперименты.
- North Star: weekly effective learners / подтверждённый recall; guardrails:
  D7/D30 cohort retention, lesson completion, paywall→paid, refund/payment failure,
  crash/complaint rate.
- WAU/MAU показывать только как частоту активности, не как когортное удержание.

#### Blocker когортного retention

Текущий `fetchCohortRetentionMetrics()` выбирает для D1 когорту `today - 1`, а для
D7 — `today - 7`. Утренний cron в 06:00 UTC видит только первые шесть часов
последнего дня окна и поэтому системно занизит retention. До подключения в PM
brief нужно читать только полностью закрытые окна (как минимум lag ещё один UTC
день), затем сравнивать несколько завершённых когорт с baseline и сохранять
`observedAt/completedThrough`. До этого WAU/MAU остаётся только контекстом, а D1/D7
не выдаётся за готовый диагноз.

### P1 — stable issue и lifecycle

- Явный `issueKey = department:signal:scope`, независимый от observation hash.
- Lifecycle: detected → triaged → proposed → accepted → in_progress → monitoring → resolved.
- Ветки: snoozed(until), blocked(reason/owner), dismissed(reason), reopened.
- Добавить Telegram-состояния: отложить, уже решено, неверно, мусор, не поднимать снова.
- Перенести уже работающую запись approve/reject из plan-version в stable issue;
  внешние действия остаются запрещены без отдельного подтверждения владельца.

### P2 — weekly strategy review

- Outcomes вместо списка активности.
- Самый большой bottleneck в acquisition→activation→learning→retention→paid.
- Три ранжированные ставки: evidence, hypothesis, smallest experiment, expected
  upside, effort, guardrail, stop rule.
- Новые voice-of-customer темы без повторения старых писем.

### P2 — честная observability

- Source receipts должны существовать независимо от сработавших alert decisions.
- Убрать синтетические `{state: empty, count: 0}` из admin UI.
- Метрики Джарвиса: repeat rate, stale-signal rate, useful ratio, action conversion,
  false-alert rate, 30-day topic diversity, recommendations with verified outcome.

## Research basis

- Google SRE: actionable alerts, grouping and alert-fatigue control —
  <https://sre.google/sre-book/practical-alerting/>
- Google recommendation systems: candidate generation, scoring, reranking —
  <https://developers.google.com/machine-learning/recommendation/overview/types>
- Intercom RICE prioritization —
  <https://www.intercom.com/blog/rice-simple-prioritization-for-product-managers/>
- Product Talk Opportunity Solution Trees —
  <https://www.producttalk.org/opportunity-solution-trees/>
- SVPG product risks — <https://www.svpg.com/four-big-risks/>
- Anthropic agent evaluator/optimizer patterns —
  <https://www.anthropic.com/engineering/building-effective-agents>
- Reflexion: feedback in episodic memory — <https://arxiv.org/abs/2303.11366>

## Safety invariants

- Missing or stale evidence never becomes a reassuring zero.
- Support PII is never sent into the PM prompt or Telegram digest.
- Старые письма не удаляются и не архивируются автоматически.
- LLM cannot change severity, thresholds, facts or execute recommendations.
- New Jarvis-read fields must update the data-contract guard in the same change.
