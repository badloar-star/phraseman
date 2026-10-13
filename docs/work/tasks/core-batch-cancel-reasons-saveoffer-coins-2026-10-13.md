# Task packet: причины отмены на английском, dev saveOffer=progress, монеты за диалог и тренажёр предлогов

Governance-ID: TG-B9AFC30C195E
Status: In progress
Owner: Ядро (сессия 1)
Related: координатор 13.10 ~08:40; решения владельца 08:15 (монеты за диалог — да, по образцу dialogs.html d6 «+30»; монеты за тренажёр
предлогов — да, как за слова/глаголы).

## Outcome

1. app/manage_subscription.tsx — у 6 причин отмены есть `en`, вызов передаёт `r.en` в слот en (было `r.ru` → русский в английском интерфейсе).
2. `dev_state?saveOffer=progress` — шаг удержания открывается сразу (в памяти, без тапа) для кадров paywalls-024 / profile-022.
3. Монеты за диалог и за тренажёр предлогов — по принципу уроков (локальное начисление + синк), журнал [COINS-EARN].

## Scope

In scope: manage_subscription.tsx, dev_save_offer_progress.ts / dev_state_fixtures.ts (свои строки), клиент итога диалога и
тренажёра предлогов, сторожа. Out of scope: серверная сверка монет coinReconcileV1 (не выкладывается до релиза).

## Architecture

No architecture change: монеты идут тем же путём, что за уроки и слова.

## Security and privacy

Не касается данных (монеты — уже существующее поле прогресса).

## Technical debt

- Серверная сверка монет диалога — после релиза, вместе с coinReconcileV1.

## Verification

Тесты manage_subscription, dev_state, практика/монеты; журнал [COINS-EARN] на эмуляторе.

## Rollback

Откат коммитов.
