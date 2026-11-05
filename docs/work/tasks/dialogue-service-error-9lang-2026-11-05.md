# Task packet: строка serviceError диалогов — «технический перекур» на 9+ языках (№195)

Governance-ID: TG-9AEA800BD12D
Status: In progress
Owner: 10 · ПЕРЕВОДЧИК
Related epic/enabler: реестр №195 (владелец: текст при пустом балансе диалогов)

## Outcome

Готовые строки serviceError («технический перекур — Профессор Лингман уже разбирается») на ru, uk, en, es, pt-BR, vi, id, tr, pl, fr, de — в docs/work/dialogue_service_error_9lang.md. Файл app/dialogue_v2_session_coaching_labels.ts (строка ~81) не трогаю: его правит тот, кто ведёт диалоги. Успех: строки на месте, файл-документ закоммичен, хэш диспетчеру.

## Scope

In scope: docs/work/dialogue_service_error_9lang.md, этот пакет.
Out of scope: app/dialogue_v2_session_coaching_labels.ts (чужой по истории: dc9e1d07d, 731c1f278), серверная логика insufficient_quota, dialog_free_limit.

## Architecture

Текст — строка i18n; клиент показывает её при классе 'service'. Код не меняется.

## Security and privacy

Персональных данных нет; текст не раскрывает внутренних причин (баланс провайдера).

## Technical debt

Строки не вставлены в код — вставит владелец файла. Для fr/de уже есть ключи в файле — переводы даны.

## Verification

Строки без кириллицы в не-ru/uk; длина ≤ 120 знаков; документ на месте.

## Rollback

Удалить документ; клиентский текст не меняется.
