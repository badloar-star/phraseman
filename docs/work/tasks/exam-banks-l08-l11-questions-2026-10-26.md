# Task packet: вопросы со «?» в банках экзамена глав v2 — уроки 08–11

Governance-ID: TG-2A28D2978738
Status: In progress
Owner: 4 · ТЕМЫ
Related epic/enabler: продолжение docs/work/tasks/exam-banks-l08-l11-2026-10-26.md; решение ревизора — запрет «?» только для
урока 1 (с 92b29de96)

## Outcome

В банках уроков 08–11 главы, где в эпизодах до экзамена уже были вопросы (Can you…?, Is/Are … -ing?, Do you…?, Was/Were…?),
получают задания с вопросом; число заданий остаётся 14–16 (вопросы заменяют часть прежних заданий). Читабельные .md обновлены.

## Scope

In scope: только свои файлы банков modules/learning-v2/exam/banks/chapter_exam_v2_l08..l11_c*.ts и docs/work/exam-banks/l08..l11.md.
Out of scope: BANKS, сторожа, движок, чужие банки.

## Architecture

No architecture change: данные ChapterExamV2Bank.

## Security and privacy

Не касается данных пользователей: учебный контент.

## Technical debt

Contain: те же два сторожа (слова эпизодов и правила банков).

## Verification

Словарь эпизодов до экзамена + оба сторожа по каждому уроку.

## Rollback

git revert коммита урока.
