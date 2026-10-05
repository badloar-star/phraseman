# Task packet: learn-4/8 — статус карточки экзамена: «Откроется с Plus» важнее несданного, 0% = нет результата

Governance-ID: TG-F0787B77F4A0
Status: In progress (координатор 05.10, одобрено: «для Free без Plus „Откроется с Plus“ важнее несданного результата,
0% считать „нет результата“; тесты: Free+0% → Plus; Plus+70% → „Почти — 70%“; Free+сданный → настоящий статус»;
лог Сверки [LESSONS-EXAM] status: hasResult, pct 0, passed false → «Почти — 0%»)
Owner: сессия 1 · ЯДРО

## Outcome

Выбор статуса — чистая функция pickLessonsExamStatus (app/lessons_exam_status.ts) с порядком:
сдан → «Сдан — N%»; нужен Plus → «Откроется с Plus»; несданный с pct > 0 → «Почти — N%»; дальше прежняя цепочка
(нет источника экзамена → копия ворот; все уроки готовы → «Нажми, чтобы начать»; Plus + прошлый зачёт → «Сначала
зачёт»; иначе → «Заверши все уроки»). Тексты не меняются. Доступ (тап по карточке) не меняется.

## Scope

app/lessons_exam_status.ts (новый), app/(tabs)/lessons.tsx (subLine через функцию), tests/lessons_exam_status.test.ts.

## Architecture

Логика вынесена из рендера в чистую функцию — тестируема без экрана.

## Security and privacy

Не затрагивает.

## Technical debt

Временный лог [LESSONS-EXAM] убрать после проверки Сверкой.

## Verification

Тест функции (3 случая координатора + граничные); сторожа lessons; Сверка learn-4/8.

## Rollback

git revert коммита.
