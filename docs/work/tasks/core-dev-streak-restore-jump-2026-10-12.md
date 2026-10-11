# Task packet: dev-фикстура «прыжок серии после восстановления» для проверки [HOME-RESTORE-JUMP]

Governance-ID: TG-F2E5C095C230
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10: у гостя и №2 серия 0 — по строкам [HOME-RESTORE-JUMP] судить нельзя).

## Outcome
Ссылка dev-состояния `streakJump=5:12`: локальная серия 5 → Главная показывает 5 → через 3 с после кадра Главной серия в
хранилище становится 12 и летит то же событие, что у настоящего восстановления (`cloud_profile_hydrated`). Сверка видит
строку [HOME-RESTORE-JUMP] storedStreak=12 против «[STREAK] home:hydration … -> 5» — и останется ли на экране 5.

## Scope
In: `app/dev_streak_restore_jump.ts` (новый), параметр в `app/dev_state_fixtures.ts`, тест. Out: стор-сборка (ворота
isDevStateAvailable — только dev и не стор), облако (streak_count клиент в облако не шлёт — серверный ключ).

## Architecture
Модуль пишет `streak_count` локально, ждёт кадр Главной + 3 с, пишет второе значение и шлёт событие. Каждый шаг — лог
`[DEV-STATE] streak_jump`.

## Security and privacy
Только dev; локальное значение тестового аккаунта.

## Technical debt
Снять вместе с временной трассировкой [HOME-RESTORE-JUMP] после этапа 2.

## Verification
Тест модуля (порядок записи и события); сторожа dev-состояния.

## Rollback
`git revert`.
