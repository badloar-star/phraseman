# Task packet: №18 — dev-подписка Plus с датой следующего списания (profile-024, paywalls-022; координатор 13.10 ~14:00)

Governance-ID: TG-54F9E291371B
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

В кадрах profile-024 и paywalls-022 в карточке плана нет строки «Следующее списание · 14 января 2027».

Причина (`app/manage_subscription.tsx:405`): метаданные брались из ответа RevenueCat, если ответ вообще был. У эмулятора RC отвечает пустой подпиской без даты, поэтому dev-план с датой (`plan=yearly`, expiryMs = сейчас + 365 дней) проигрывал ответу магазина.

Теперь:
1. Dev-подмена плана важнее ответа магазина (только dev: `getDevPlanOverride()` в сторе = null).
2. Новый параметр `planUntil=YYYY-MM-DD` задаёт точную дату, как в образце (2027-01-14).
3. Строки DEV_LINKS profile-024 и paywalls-022 получают `planUntil=2027-01-14`.

## Scope

In scope:
- `app/manage_subscription.tsx` (порядок источников метаданных);
- `app/dev_vip_override.ts` (дата в подмене плана);
- `app/dev_state_fixtures.ts` (разбор `planUntil`);
- DEV_LINKS.

Out of scope: реальные покупки, RevenueCat, запись в прод.

## Architecture

`setDevPlanOverride(plan, nowMs, untilMs?)` — если задан `untilMs`, он и есть expiryMs. Фикстура передаёт его из `planUntil`.

## Security and privacy

Только память процесса в dev-сборке; ни покупки, ни записи в Firestore.

## Technical debt

- Сторож `manage_subscription_liquid_glass_source_contract` уже красный (4 проверки, до правки) — хэш `metadata` поменяется. Нужно обновить хэши вместе с владельцем сторожа.

## Verification

- в журнале кадра `[DEV-STATE] plan memory_only` с expiryMs = 2027-01-14;
- в кадре строка «Следующее списание».

## Rollback

`git revert` коммита.
