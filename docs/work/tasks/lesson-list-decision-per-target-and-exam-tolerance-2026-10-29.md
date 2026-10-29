# Task packet: решение списка уроков с языком изучения; поблажка too/either и «Yes, / No,» в ответе экзамена главы

Governance-ID: TG-D3848A671D78
Status: In progress
Owner: Learning V2 session; координатор 29.10 (🟡 Ревизора; просьба Теории)

## Outcome

1. rememberLessonListDecision / lessonListJustOpened учитывают язык изучения: после смены en↔es меню не верит решению другого курса.
2. checkChapterExamV2Answer не штрафует за лишний хвост too/either в конце и «Yes, / No,» в начале — только поверх правильного ядра;
   неверное ядро с таким хвостом/префиксом остаётся неверным. Тест на примерах из 9c34c1092.

## Scope

app/lesson_premium_gate.ts, app/lesson_menu.tsx, app/(tabs)/lessons.tsx (передать studyTarget), проверка ответа экзамена главы
(modules/learning-v2/exam), тесты.

## Architecture

Решение списка живёт в памяти процесса 60 с; ключ дополняется языком. Проверка экзамена: нормализация ответа до сравнения с принятыми.

## Security and privacy

Не затрагивается.

## Technical debt

Поблажка — точечные правила; общая модель «допустимых добавок» к ответу — отдельная задача.

## Verification

Тесты: решение списка по языку; ответы с хвостом/префиксом поверх верного ядра — верно, поверх неверного — неверно.

## Rollback

Revert коммита.
