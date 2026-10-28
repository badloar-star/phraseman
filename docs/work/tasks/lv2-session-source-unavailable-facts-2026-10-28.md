# Task packet: «курс открывается не полностью / нет доступа к занятиям» — факты по бандлу и логи [V2-SESSION-SOURCE]

Governance-ID: TG-17CB867A92D5
Status: In progress
Owner: Learning V2 session; координатор 28.10 (жалобы #1, #3, #11; находка Ревизора)

## Outcome

1. Факты: какие занятия en объявлены выпущенными (потолок бандла) и какие реально собираются из бандла для ru / uk — на коммите сборки 147
   (a82a3b220) и на HEAD; список и число выпущенных, но не собирающихся.
2. Логи [V2-SESSION-SOURCE] в loadCurrentLearningV2CourseReleasedSessionV3: id занятия, есть ли в бандле, источник, причина отказа.
3. Предложение фикса — только после фактов.

## Scope

app/learning_v2_course_released_session_client_v3.ts (логи на развилке источника); проверочный скрипт вне репозитория.

## Architecture

Выпущенным считается индекс < LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1; бандл — materializeFactoryNativeLearningV2SessionV1. Для en/es нет
сетевого пути: нет в бандле → learning_v2_factory_session_unavailable (для en так и до 82cfea233).

## Security and privacy

Нет данных (в логе — номера урока / занятия и язык).

## Technical debt

Сетевой запасной путь для en — решение координатора / владельца после фактов.

## Verification

Скрипт по всем выпущенным занятиям × ru / uk на двух коммитах; тесты клиента v3.

## Rollback

Revert коммита.
