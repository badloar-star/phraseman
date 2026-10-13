# Task packet: смета Firebase п.11 (часть) — фраза дня en читается из дневного кэша без сети

Governance-ID: TG-08C001B33FDB
Status: In progress
Owner: Ядро (сессия 1)
Related: docs/phraseman-2.0/FIREBASE_COST_R1_2026-10-13.md п.11; список R1 Ядра п.2 (координатор 13.10)

## Outcome

- app/daily_phrase_system.ts `getTodayPhrase`: если сегодняшняя фраза с сервера уже лежит в дневном кэше
  (`REMOTE_DAILY_PHRASE_CACHE_KEY`, дата = сегодня) — отдаём её без запроса `daily_phrases` (where+orderBy+limit 10).
  Раньше запрос шёл на каждом старте и в каждом планировании пушей. Немой catch в readCachedRemotePhrase — с причиной.
- Журнал [DAILY-PHRASE] source=day_cache|network.

## Scope

In scope: одна функция и её catch. Out of scope: es/de/it (свои пути), лента видео, предстарт диалога (следующие части п.11).

## Architecture

No architecture change.

## Security and privacy

Нет.

## Technical debt

- Правка фразы в админке в тот же день дойдёт до тех, кто уже открыл приложение сегодня, только завтра (фразы планируются заранее).

## Verification

Точечные тесты фразы дня; babel-проверка.

## Rollback

Откат коммита.
