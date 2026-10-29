# Task packet: сузить поблажку ответа собеседнику на экзамене главы (🟡 Ревизора к 9fd9db9fb)

Governance-ID: TG-ACAF9374A232
Status: In progress
Owner: Learning V2 session; Ревизор 29.10

## Outcome

checkChapterExamV2Answer для type 'dialogue' больше не принимает неграмотное и противоположное:
- «yes/no» в начале ответа срезается, только если у эталона нет своего yes/no; yes в эталоне против no в ответе (и наоборот) — неверно;
- «too» в конце допускается только без отрицания в ядре, «either» — только с отрицанием (not / never / nobody / nothing / none).
Тест: «wobble either» → неверно, «I am not hungry too» → неверно, «No, I am.» при эталоне «Yes, I am.» → неверно; прежние верные случаи остаются верными.

## Scope

modules/learning-v2/exam/chapter_exam_v2.ts (функция сравнения ядра), tests/chapter_exam_v2_dialogue_tolerance_2026_10_29.test.ts.

## Architecture

Нормализация ответа прежняя (normalizeChapterExamV2Answer: нижний регистр, без пунктуации, сокращения развёрнуты). Сравнение ядра — чистая функция.

## Security and privacy

Не затрагивается.

## Technical debt

Правила точечные (too/either, yes/no); общая модель допустимых добавок — отдельно.

## Verification

Тест поблажки + все тесты экзамена главы v2.

## Rollback

Revert коммита.
