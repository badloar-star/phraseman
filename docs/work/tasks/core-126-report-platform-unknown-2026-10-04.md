# Task packet: §126 п.9 — репорты с platform 'unknown'

Governance-ID: TG-94EA8E61CB15
Status: Done
Owner: Ядро

## Outcome
Сервер (client_reports.baseDoc) брал только payload.platform, а репорт об ошибке (app/error_report.ts) шлёт платформу как deviceOS — отсюда 'unknown' в репортах. Теперь: клиент добавляет platform в общей точке отправки (submitClientReport, если вызывающий не задал своё), сервер при отсутствии platform берёт deviceOS — это чинит и уже вышедшие версии клиента.

## Scope
app/client_reports.ts, functions/src/client_reports.ts.

## Architecture
Одна общая точка на клиенте вместо правки каждого вызывающего; серверный запасной источник для старых клиентов.

## Security and privacy
Поле platform (ios/android) уже собиралось и описано; новых данных нет.

## Technical debt
Нет.

## Verification
Тесты client_reports (functions и клиент), проверка типов.

## Rollback
Откат коммита.
