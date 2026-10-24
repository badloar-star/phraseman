# Task packet: жалобы 24.10 по урокам — №4, 5, 6, 8, 9, 11, 13, 16

Governance-ID: TG-47F923F0814E
Governance-ID: TG-B1853B9584A3
Governance-ID: TG-D159A8290D8A
Governance-ID: TG-3207A03A1932
Governance-ID: TG-D52FEF3DA5BC
Governance-ID: TG-3DA202301323
Governance-ID: TG-CBEBB7C0EBEC
Governance-ID: TG-6ADBFAF9C073
Governance-ID: TG-642AA7092133
Governance-ID: TG-25EF74B593D2
Governance-ID: TG-F85F576326FA
Governance-ID: TG-F3CBD0E9A08C
Governance-ID: TG-AE3AB7F02F39
Status: In progress
Owner: Learning V2 сессии (по поручению 0 · КООРДИНАТОР 24.10)
Related epic/enabler: docs/work/support/REPORTS_BATCH_2026-10-24.md (владелец пачки и replies.json — 1 · ЯДРО)

## Outcome

По каждой жалобе: причина установлена по фактам (прод-журнал app_errors, логи с префиксом), исправлено и покрыто тестом,
либо честно «не подтверждено». Ядро получает по номеру: подтверждено/нет, исправлено/ждёт билда, черновик ответа на «вы».
Блокер релиза 25.10.

- №4, 5, 6, 8, 16 — «Ошибки» / Работа над ошибками / Тест урока не грузятся, «проверьте связь», «урок не готов», «исправить 30 — крутится».
- №9, 13 — «не удалось подсчитать звёзды», урок 8 главы 1 не засчитан.
- №11 — задание «Уходить/оставлять» с ответом Left в «Ошибках».

## Scope

In scope: чтение прод-журнала app_errors (только чтение, без uid в выводе); экраны ошибок/теста урока; финал занятия
Learning V2 (app/learning_v2_direct_session_player_v1.tsx); источник заданий «Ошибок». Логи с префиксом [SUPPORT-1024]/
существующими префиксами, исправления, точечные тесты.

Out of scope: Пик (№2, 3, 10, 12, 14, 15), оплата (№1), пожелания (№7) — другие сессии. Отправка ответов — только владелец.

## Architecture

No architecture change заранее: правки точечные в найденных местах. Если причина — серверная, передаю Ядру.

## Security and privacy

Чтение прод-журнала через учётку владельца (application-default), в вывод не попадают uid/имена/тексты жалоб — только
контексты ошибок, сообщения и версии. Новых данных не собираем.

## Technical debt

Contain: каждый найденный немой путь получает лог причины навсегда (правило «сперва логи»).

## Verification

Точечные тесты через slot.sh; для каждой причины — тест, воспроизводящий её. Проверка типов затронутых файлов.

## Rollback

Откат коммитов; данные пользователей не трогаются.

## Дополнение 25.10 ночь — движок экзамена главы

Outcome: сдача экзамена ОТКРЫВАЕТ непройденные эпизоды главы (прогресс v2 «open»), а не засчитывает их (замок «открыто ≠ пройдено»).
Scope: app/learning_v2_chapter_exam_v1.ts finishLearningV2ChapterExamV1; тест движка. Architecture: store.complete → store.open одной записью.
Security and privacy: без изменений. Technical debt: нет. Verification: тесты экзамена и прогресса v2. Rollback: откат коммита.
