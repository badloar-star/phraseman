# Task packet: №47 — итог занятия Learning V2, таймаут функции 15 → 60 с

Governance-ID: TG-45788E23161D
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: решение владельца 21.10, через координатора (OWNER_DECISIONS_2026-10-21.md, №47).

## Outcome

Функция `submitLearningV2CourseSessionCompletedV1` получает 60 с вместо 15. Холодный старт (~6 с на загрузку index.ts) и медленная сеть больше не обрывают запись итога занятия посередине.

## Scope

- `functions/src/learning_v2/course_session_completed_summary_callable_v1.ts`: в `LEARNING_V2_COURSE_SESSION_COMPLETED_CALLABLE_OPTIONS_V1` поставить `timeoutSeconds: 60`.
- Тест функции фиксирует 60.
- Выкладка ТОЛЬКО этой функции (`--only functions:submitLearningV2CourseSessionCompletedV1`). Разрешение владельца дано адресно.
- Клиентская классификация ошибок — сессия Learning V2, не здесь.

## Architecture

Код функции не меняется, только опция. Клиент ждёт 30 с (`app/learning_v2_course_session_completed_sync_v1.ts:108`). Если сервер дорабатывает дольше, приложение повторит отправку. Запись идёт через входящий ящик с квитанцией, поэтому повтор безопасен.

## Security and privacy

Данные не меняются. App Check остаётся выключенным (пломба).

## Technical debt

Клиентские 30 с меньше серверных 60. Владелец этой части — Learning V2: поднимать ли клиентский таймаут, решает он вместе с классификацией.

## Verification

- Тест `course_session_completed_summary_callable_v1.test.ts`.
- После выкладки — проверка опций функции в облаке.

## Rollback

Вернуть 15 и выложить ту же функцию адресно.
