# Task packet: вопрос 18 вариант А — скрипт снятия/возврата опросов осколков (не запускался)

Governance-ID: TG-ABBC967A70D2
Status: Done (подготовлено, не запускалось)
Owner: Ядро (сессия 1)
Related: координатор 13.10 — вопрос владельцу 18; шаг 13а плана (eed78a332)

## Outcome

scripts/pause_shard_surveys_until_release.mjs (просмотр по умолчанию, запись и возврат только с кодовым словом) и справка
docs/phraseman-2.0/SHARD_SURVEY_ES_OPTION_A_2026-10-13.md: почему снимать все (старый сервер падает в legacy-режим), ротация на дни
до выхода, команды для владельца.

## Scope

In scope: скрипт и справка. Out of scope: запуск (только владелец), опросы и переводы.

## Architecture

No architecture change.

## Security and privacy

Скрипт читает service-account.json — запускает только владелец; сессия его не запускала и ключ не читала.
Подсчёт людей — агрегат count() без чтения документов.

## Technical debt

- Возврат обязателен в день выхода после выкладки функций опроса — записано в справке.

## Verification

node --check; логика сверена с getActiveShardSurvey на HEAD и с поведением боевого старого кода.

## Rollback

Запуск с --restore; откат коммита.
