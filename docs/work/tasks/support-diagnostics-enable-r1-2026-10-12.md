# Task packet: включить журнал диагностики в обращении в поддержку (R1) + абзац политики — решение владельца п.81(14)

Governance-ID: TG-2524C6D7FB0A
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10)

## Outcome

- app/remote_flags.ts: isSupportDiagnosticsEnabled → true. Устройство ведёт ограниченный журнал технических действий (24 ч, ≤200 записей,
  ≤64 КБ, по ключу текущего аккаунта); он прикладывается к обращению ТОЛЬКО при явной отправке формы поддержки; форма это говорит и даёт
  посмотреть записи («Посмотреть»).
- Политика (legal/privacy_policy_en.json, _ios.json → legal:sync): абзац о журнале конкретизирован — что пишется, сколько, когда уходит,
  как хранится и удаляется (вместе с обращением; стирается с удалением аккаунта; раньше — по просьбе). Честно: автоматического срока
  удаления обращения на сервере сейчас нет (error_reports без TTL) — фиксированный срок требует серверной правки и выкладки (решение координатора).

## Scope

In scope: флаг, тексты политики и их копии (legal:sync), закреплённые хэши/сторожа. Out of scope: сервер (TTL обращений), новая галочка
«не прикладывать журнал» (нужен образец и решение — вынесено координатору).

## Architecture

Журнал уже реализован (support_diagnostics.ts, outbox, функция client_reports чистит поля cleanSupportDiagnostics); менялся только флаг.

## Security and privacy

В журнал не попадают тексты сообщений, пароли, платёжные данные, токены, чеки (сторож support_diagnostics_privacy_contract).
Журнал не уходит с устройства сам — только с обращением. Политика обновлена ДО релиза (owner-rules A).

## Technical debt

- Contain: каждое событие trackActivity → чтение+запись ключа ≤64 КБ под замком (6 мест записи); при росте частоты — копить в памяти и
  сбрасывать пачкой.

## Verification

support_diagnostics_card_honest, support_diagnostics, support_diagnostics_privacy_contract, support_report_liquid_glass_source_contract,
legal_copies_sync_contract, legal_document_liquid_glass_source_contract.

## Rollback

Флаг обратно в false + revert абзаца.

## Result

Флаг включён, абзац политики заменён (оба JSON), legal:sync. Тесты: support_diagnostics_card_honest 2/2 (ожидание флага → true), support_diagnostics 3/3,
support_diagnostics_privacy_contract 4/4, support_report_liquid_glass 8/8, legal_copies_sync 6/6, aa_guest_honesty 21/21, legal_document_liquid_glass 8/8 (хэши обновлены).
