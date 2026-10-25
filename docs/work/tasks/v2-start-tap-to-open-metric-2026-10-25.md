# Task packet: замер «тап → готово → экран занятия» для любого входа

Governance-ID: TG-9E32085A3198
Status: In progress
Owner: Learning V2 session; перемер Сверки 25.10 (строк [V2-START] в журнале нет — вход через Сезон их не пишет)

## Outcome

Время от тапа до экрана занятия видно в журнале при любом входе (Сезон, Главная, «Уроки»): `[V2-START] handoff` с видом тапа
(take_ready / tap_joins_running / tap_cold) и tapToReadyMs пишется в общей передаче готового занятия, `[V2-START] open` со
stageToOpenMs — когда экран занятия забрал готовое занятие. Метрика tap_result ≥ 95 % считается по этим строкам.

## Scope

app/learning_v2_session_launch_v1.ts (момент тапа, строка handoff в stageLearningV2ReadyHandoffV1),
app/learning_v2_course_released_session_client_v3.ts (время передачи, одна строка open на запуск). Поведение и вид не меняются.

## Architecture

Время тапа хранится в памяти процесса (последний тап, его вид и занятие). Строка open — один раз на sessionRunId: чтение моста
идемпотентно и повторяется при ремаунте.

## Security and privacy

Без uid и персональных данных: номер занятия, вид тапа, миллисекунды. Сеть и хранилище не трогаются.

## Technical debt

Pay now: перемер «тап → открытие» был невозможен для входа через Сезон.

## Verification

Тест модуля запуска: после take_ready вызов stage пишет handoff с видом тапа; consume пишет open один раз.

## Rollback

Revert коммита.
