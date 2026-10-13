# Task packet: dev_state?notifnudge=show — вызвать окно «включить напоминания» для проверки умного напоминания (Сверка)

Governance-ID: TG-8074B6EC6C7D
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10: Сверка проверяет умные напоминания на госте)

## Outcome

Подмена `phraseman://dev_state?...&notifnudge=show&overlays=on&next=/(tabs)/home`:
1. стирает отметку «окно уже показано сегодня» (`notif_permission_nudge_last_day`);
2. через 2,5 с шлёт то же событие приложения `notif_permission_nudge` (missedDays=3), что и реальный путь.

Дальше окно живёт по коду релиза: разрешение ОС → `enableSmartDailyReminder` → журнал `[SMART-REMINDER] enable … days=7 mode=auto`
и `schedule created=7`.

## Scope

In scope — один параметр в `app/dev_state_fixtures.ts`.

Out of scope — поведение окна и расписания в релизе.

## Architecture

Как остальные подмены: `pick()` → `step()`. Стор-сборка подменяет dev-модули заглушками (`store_release_stubs_gate`); экспорты не меняются.

## Security and privacy

Только dev. Пишется одна локальная отметка AsyncStorage, без Firestore.

## Technical debt

- Contain: задержка 2,5 с подобрана под монтирование корня после перехода; если слушатель не успел, перезапустить ссылку.

## Verification

- Сторож стор-заглушек.
- Тесты dev_state.
- Кадр Сверки.

## Rollback

git revert коммита.
