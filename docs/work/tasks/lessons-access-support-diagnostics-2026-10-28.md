# Task packet: логи жалоб #1/#3/#11 — в журнал обращений, а не в console (вырезается в релизе)

Governance-ID: TG-64055D020D49
Status: In progress
Owner: Learning V2 session; 🔴 Ревизора по b65578480 через координатора 28.10

## Outcome

[CLASSIC-LESSONS], [FEATURE-INTRO] и отказ [V2-SESSION-SOURCE] доходят до поддержки с обращением человека:
событие recordSupportDiagnostic feature_action, screen и action из закрытых значений и малых счётчиков, без uid и текста.
Показ классического списка пишется одним событием на смену причины (поиск по буквам событий не плодит).

## Scope

Новый app/lessons_access_diagnostics.ts (события + защита от дублей), вызовы из app/(tabs)/lessons.tsx,
hooks/use_requested_feature_intro.ts, app/learning_v2_course_released_session_client_v3.ts. Исправить неверный комментарий про warn.
Тест на формат действий под белый список сервера.

## Architecture

babel.config.js в прод-сборке удаляет console.* кроме warn/error. Журнал обращений (app/support_diagnostics.ts) копит события
в памяти и пачкой на диск, уходит с обращением. Действие: ^[a-zA-Z][a-zA-Z0-9_.:-]{0,79}$, без слов из 20+ знаков.

## Security and privacy

В событии только закрытые значения (cutBy, page, язык цели en/es/…, источник) и счётчики уроков 0–32. Ни uid, ни текста поиска.
Новых данных за пределы устройства не уходит, пока человек сам не отправит обращение — как у существующих событий журнала.

## Technical debt

Событие показа живёт до диагноза жалоб; потом можно оставить только cutBy != none.

## Verification

Тест формата действий; точечные тесты уроков и вводных окон; разбор синтаксиса.

## Rollback

Revert коммита.
