# Task packet: pre-commit задним числом по коммитам ночи 05.10 (только проверки)

Governance-ID: TG-B7324F0089B5
Status: Done (координатор 05.10: «прогони все проверки pre-commit задним числом; FAIL — сначала мне, не чинить молча»)
Owner: сессия 1 · ЯДРО

## Outcome

До 767dc8175 скрипт коммита (commit-tree + update-ref) не запускал pre-commit хуки. Прогнать 11 проверок хука по 51 коммиту
(254 файла) на текущем HEAD и отчитаться PASS/FAIL. Отчёт: C:\Temp\claude\core_retro_precommit_report_2026-10-05.txt.

## Scope

Только запуск проверок и отчёт. Код и планки (--update) не трогаются.

## Architecture

Staged-проверки — полным сканом/через временный индекс = HEAD; проверки момента коммита — по stat коммитов.

## Security and privacy

Скан секретов — только локально.

## Technical debt

Новый долг не вносится. Найдено вне моих коммитов: чужая незакоммиченная правка
app/learning_v2_course_released_session_client_v3.ts без вызова озвучки сессии 1 — сообщено координатору.

## Verification

Все 11 проверок PASS на HEAD.

## Rollback

Не требуется.
