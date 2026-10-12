# Task packet: переключатель «Приложить журнал диагностики» на форме обращения (решение владельца 12.10 (б))

Governance-ID: TG-83AA419111D9
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 12.10)

## Outcome

На форме поддержки (app/support_report.tsx), в карточке «Техническая диагностика», — переключатель (CustomSwitch, роль switch,
подпись для диктора «Приложить журнал диагностики»), по умолчанию ВКЛЮЧЁН. Выключен → журнал не прикладывается и не отправляется:
экран не передаёт его, а отправка (support_report_outbox) не захватывает его сама (явный параметр attachDiagnostics=false). Текст карточки
следует за состоянием; «Посмотреть» — только при включённом. Хаптик на переключателе (управляющий элемент). Лог `[SUPPORT-DIAG]`.
Политика: «журнал можно отключить на форме обращения» (вместе с пунктом (а) — 30 дней).

## Scope

In scope: support_report.tsx, support_report_outbox.ts (параметр доставки), тесты. Out of scope: сервер, состав журнала.

## Architecture

sendSupportReportInBackground(payload, lang, options, delivery = { attachDiagnostics?: boolean }) — общий тип SubmitErrorReportOptions не трогается.

## Security and privacy

Пользователь управляет отправкой журнала; при выключенном ничего не захватывается и не уходит.

## Technical debt

- Contain: нет.

## Verification

Тест: выключенный — outbox не зовёт захват и не кладёт diagnostics; контракт экрана (switch, хаптик, текст по состоянию);
support_report_liquid_glass_source_contract, support_diagnostics_card_honest, privacy_contract.

## Rollback

Откат коммита.

## Result

Тесты: support_diagnostics_attach_toggle 3/3, card_honest 2/2 (галочка — при включённом и прикладываемом), privacy_contract 4/4, batched_flush 4/4,
support_report_liquid_glass 8/8 (число многоязычных текстов 17→19, два новых хэша). Политика — вместе с пунктом (а).
