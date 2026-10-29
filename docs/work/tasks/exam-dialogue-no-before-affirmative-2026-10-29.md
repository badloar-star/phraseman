# Task packet: экзамен главы — «No» перед утвердительным ответом неверно; границы слова в отрицании

Governance-ID: TG-CE63B5EAC5DD
Status: In progress
Owner: Learning V2 session; Ревизор через координатора 29.10

## Outcome

- «No, …» перед утвердительным ядром (без отрицания), когда у эталона своего yes/no нет, — неверно: «No, I am hungry too» → неверно.
- Отрицание ищется по целым словам: «notebook», «nothing»… не считаются not; «I like the notebook either» → неверно,
  «I like the notebook too» → верно.

## Scope

modules/learning-v2/exam/chapter_exam_v2.ts (chapterExamV2DialogueMatch), tests/chapter_exam_v2_dialogue_tolerance_2026_10_29.test.ts.

## Architecture

Чистая функция сравнения ядра ответа собеседнику; нормализация прежняя.

## Security and privacy

Не затрагивается.

## Technical debt

Точечные правила yes/no / too / either.

## Verification

Тест поблажки + все тесты экзамена главы v2.

## Rollback

Revert коммита.
