# Task packet: подключить scripts/dev_links_r1_steps_errfix.py в генератор DEV_LINKS_R1 последним

Governance-ID: TG-4FFECCA52DF4
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (генератор ссылок; модуль — Темы, befda6335)

## Outcome

`import dev_links_r1_steps_errfix` — последней строкой после p84 в scripts/dev_links_r1_generate.py, с «зачем»; пересборка
DEV_LINKS_R1. В таблицу беру только строки, которые меняет errfix (реестр образцов другой сессии сейчас может быть незакоммичен).

## Scope

In scope: scripts/dev_links_r1_generate.py (одна строка), DEV_LINKS_R1.md. Out of scope: сам модуль errfix (Темы).

## Architecture

Модули шагов применяются по порядку импорта; errfix — исправления поверх всех, идемпотентны (ошибка, если записи нет).

## Security and privacy

prod_write_guard по таблице.

## Technical debt

- Contain: нет.

## Verification

Генератор, prod_write_guard, dev_links_r1_contract / selectors_exist.

## Rollback

Откат коммита.

## Дополнение: settings-gap-005 (Ядро 77f934e96)

`vip=referral&plus=inherit&introAccess=active` — две плашки «Plus за приглашения» + «Полный доступ на 3 дня» (подмена в памяти).
