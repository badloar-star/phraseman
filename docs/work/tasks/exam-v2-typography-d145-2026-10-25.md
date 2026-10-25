# Task packet: экзамен v2 — размеры текста на шкалу D145 (16 / 13)

Governance-ID: TG-21BA62FE9EBD
Status: In progress
Owner: Learning V2 session; храповик типографики D145 от Ревизора через координатора 25.10

## Outcome

Восемь размеров текста экрана экзамена v2 (12,5 / 14 / 15 / 17) переведены на шкалу D145: мелкие подписи — 13, обычный текст — 16.
Межстрочные интервалы и отступы не меняются: раскладка прежняя. Храповик tests/typography_two_sizes_ratchet.test.mjs не растёт.

## Scope

components/learning-v2/exam_v2/ChapterExamV2Question.tsx (подсказка микрофона, «или напиши»),
components/learning-v2/exam_v2/ChapterExamV2Result.tsx («N ошибки», ссылка разбора, тексты карточек разбора, номер эпизода).

## Architecture

Только числа fontSize в стилях.

## Security and privacy

Только размеры текста в стилях; данных, сети и чтений нет.

## Technical debt

Прототип экзамена (Макеты) нужно поправить на те же размеры, иначе склейка разойдётся в этих восьми местах.

## Verification

tests/typography_two_sizes_ratchet.test.mjs, тесты экзамена v2.

## Rollback

Revert коммита.
