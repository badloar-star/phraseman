# Task packet: очередь коммитов Ядра в окно 13:30 (смета п.8 повтор, переводы, превью Карточек) и paywalls-009/010 для Сверки

Governance-ID: TG-1DA767F030CC
Status: In progress
Owner: Ядро (сессия 1)
Related: firebase-cost-item8-startup-calls, long-translations-core-texts, dev-cards-preview-safe-back (13.10)

## Outcome

- Три ранее подготовленных изменения уходят по очереди в окно кода 13:30 через safe_commit.sh (п.8 сметы отказал в 13:00:
  HEAD сдвинул чужой коммит).
- Сверке (local_8658a5fb): paywalls-009/010 — кадр 07:47 снят до db61aa3e4 (09:36); условия гарантированного показа и строка журнала.

## Scope

In scope: коммиты уже проверенных правок (тесты зелёные), сообщение Сверке. Out of scope: новые правки кода.

## Architecture

No architecture change.

## Security and privacy

Коммиты только своих хунков через safe_commit.sh (numstat-сверка); секретов в изменениях нет.

## Technical debt

- Повторный отказ по сдвигу HEAD возможен в загруженном окне — тогда следующий слот :00/:30.

## Verification

Хэши коммитов и numstat совпадают с ожиданием; повторная проверка отказов.

## Rollback

Откат коммитов.
