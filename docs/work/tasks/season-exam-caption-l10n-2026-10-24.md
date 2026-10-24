# Task packet: подпись экзамена Сезона — вычитка 8 языков (Переводчик, 6a9e44e16 3 · МАКЕТЫ через координатора)

Governance-ID: TG-278DFEB84429
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

`components/learning-v2/season/season_copy_card.ts` — `examOpens` («Сдашь — откроется глава {n}») и `examFacts`
(«{q} вопросов, сдать от {p}»): ru дословно из эталона не трогаю, 8 языков — черновик Макетов, вычитан.
Правки (естественнее, без кальки):
- en: «Pass to unlock chapter {n}» · «{q} questions, {p} to pass» (было «Pass and chapter {n} opens» · «pass with {p}»);
- pt-BR: «Se passar, abre o capítulo {n}» (было «Passou, o capítulo {n} abre» — прошедшее время звучит как уже свершившееся);
- vi: «Đạt để mở chương {n}» · «{q} câu hỏi, cần đúng {p}» (было «Đạt là mở…» · «đạt từ {p}» — неясно, от чего);
- id: «Lulus untuk membuka bab {n}» · «{q} soal, minimal {p} benar» (было «Lulus, bab {n} terbuka» · «lulus mulai {p}»).
uk, es, tr, pl — верны, без изменений. `startExam`, `chapterShort` — верны.

## Scope

In scope: две строки кортежей в одном файле. Out of scope: ru, вёрстка, остальные ключи файла.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- `examFacts` пишет «{q} вопросов» без склонения: верно, пока вопросов 12 (`CHAPTER_EXAM_QUESTION_COUNT_V1`). Если число станет
  переменным (2, 3, 4, 21…), понадобятся формы числа ru/uk/pl.
- Строка «… · …» на 360 dp переносится на вторую строку во всех языках, кроме en и vi, — так же, как русский эталон (345 px при 320).

## Verification

Замер Inter 13 (строка) и Inter Bold 16 (кнопка) по ширине 320 px: все ≤ 2 строк (максимум es 403 px), кнопка ≤ 174 px.
`npm run test:one -- tests/season_exam_caption_note_2026_10_24.test.ts`.

## Rollback

`git revert <коммит>`.
