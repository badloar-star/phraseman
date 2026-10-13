# Task packet: тест gustav_french_notifications_target_isolation — убрать устаревшие проверки (координатор 13.10)

Governance-ID: TG-12F1FBFC1A11
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ (координатор; Ядро файл не трогает)

## Outcome

Тест падал на трёх устаревших проверках, ни одна не ловит настоящую ошибку:
1. `AsyncStorage.getItem('user_total_xp')` — чтение убрано из итогов месяца в efe19ae9d (30.09).
2. Литерал `await scheduleNotifications(snap, …)` — в `_layout.tsx` вызов идёт через модуль: `await notifications.scheduleNotifications(snap, …)`.
3. Вырез «французские напоминания» кончался на «Испанский UX» и после 12.10 захватывал блок английских пушей `MESSAGES_EN`.
   Теперь вырез кончается на `const MESSAGES_EN = [` — проверка смотрит только на французские тексты, как и задумано.

## Scope

In scope — только `tests/gustav_french_notifications_target_isolation.test.ts`.

Out of scope — код приложения.

## Architecture

Смысл проверок не меняется: французские напоминания без английского, studyTarget передаётся в планировщики.

## Security and privacy

Не затрагивается.

## Technical debt

- Contain: тест держится за литералы исходника. Перенос на поведение — отдельная задача.

## Verification

Тест зелёный целиком.

## Rollback

git revert коммита.
