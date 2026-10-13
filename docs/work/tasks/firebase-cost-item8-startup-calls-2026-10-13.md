# Task packet: смета Firebase п.8 — три вызова на каждом старте без кэша (рассылка, ящик модерации, опрос)

Governance-ID: TG-08C001B33FDB
Status: In progress
Owner: Ядро (сессия 1)
Related: docs/phraseman-2.0/FIREBASE_COST_R1_2026-10-13.md п.8; координатор 13.10 ~12:50 («выбери первый и начни»)

## Outcome

- app/global_broadcast_modal.ts: ответ «активных рассылок нет» запоминается на диске на 3 ч для этого uid
  (`global_broadcast_empty_v1`); в этот срок старт не зовёт `globalBroadcastListActive`. Есть рассылки — запись снимается.
  Новая рассылка доходит до человека не позже чем через 3 ч (раньше — на ближайшем старте).
- app/community_packs/communityModerationAlerts.ts: пустой ящик модерации (нет непрочитанных результатов) запоминается на 6 ч
  для автора (`community_seller_inbox_empty_v1`); в этот срок `communityListSellerInbox` не зовётся.
- app/survey_client.ts: повтор запроса опроса — только при ОШИБКЕ; честный ответ «опроса нет» не повторяется (ротация
  детерминирована). Кэш строки на 6 ч в home_survey_entry остаётся.
- config/phone-state-legacy-inventory.v1.json: два новых ключа (device_only, без синка).
Журнал: [OVERLAY-QUEUE] broadcast:fetch reason=empty_cached, [MOD-ALERT] skip reason=empty_cached, [SURVEY] … attempts.

## Scope

In scope: три клиента + реестр + их тесты. Out of scope: сервер, Пульт, premium_guard (п.10 — Авторизация).

## Architecture

No architecture change.

## Security and privacy

В ключах — только uid/stableId владельца устройства и время; кэш сверяет uid, при смене аккаунта не используется.

## Technical debt

- Срок 3 ч для рассылки — компромисс «стоимость ↔ скорость доставки»; если владельцу нужна мгновенная доставка — сбросить
  через версию рассылки в remote_config (отдельно).

## Verification

Точечные тесты рассылки, опроса, модерации; сторож реестра (unknownKeys=0).

## Rollback

Откат коммита: вызовы снова на каждом старте.
