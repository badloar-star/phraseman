# Ядро · подсчёт «Набора месяца» по 4 ответам владельца (29.10 ~07:50, через координатора)

Governance-ID: TG-5CF612968728
Status: Done — functions jest 13/13, модуль без ошибок типов; подключение — после коммита Codex
Owner: 1 · ЯДРО

## Outcome
Чистый модуль `functions/src/community_month_tally.ts` (без импорта незакоммиченных файлов Codex) + тесты на 4 правила:
1) пройденный урок = классика (`lessons_completed`/`completed_lessons`) ИЛИ занятие Learning V2
   (`progress.learning_v2_course_progress_sync_v1` ≥ 1 — клиент уже синхронизирует, новое поле не нужно; испанский
   ключ `…:target:es` в облако не уходит — вопрос Learning V2); 2) возраст: `users.created_at`, иначе дата Firebase Auth;
3) 10 действующих голосов, снятый лайк возвращает голос; 4) пересчёт раз в 3 ч, в последние сутки месяца — раз в час.
Патч в docs/work/handover/community-contest-fixes-2026-10-29.md обновлён.

## Scope
In scope: новый модуль и тест в functions/src (новые файлы, не Codex), документ-передача.
Out of scope: файлы конкурса Codex (`community_month_contest.ts`, rules, indexes, index.ts) до их коммита; выкладка.

## Architecture
Модуль самодостаточен (свои типы, структурно совместимые с `ContestEntry`), чистый: всё время и данные — во входе.
Расписание: `every 1 hours`, функция `communityStandingsShouldRefresh(nowMs)` решает «каждые 3 ч / каждый час в последние сутки».

## Security and privacy
Читает только существующие поля профиля на сервере; новых данных и полей нет.

## Technical debt
Не создаёт; Codex подключает модуль вместо `readEntries`.

## Verification
Тест functions (jest, через слот) на правила 1–4 и границы; проверка типов functions.

## Rollback
`git revert`; модуль ничем не вызывается до подключения.
