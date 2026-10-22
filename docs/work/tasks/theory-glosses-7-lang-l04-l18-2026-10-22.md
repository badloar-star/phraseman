# Task packet: переводы английских слов в теории уроков 4–22 на 7 языках (Переводчик ← 12 · ТЕОРИЯ, координатор 22.10)

Governance-ID: TG-53D8F731BBE9
Governance-ID: TG-628C13EF0D2C
Status: Done — 129 замен в 86 черновиках, сборка без замечаний, абзацев > 300 знаков нет
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

12 · ТЕОРИЯ добавила в ru и uk перевод в скобках к английским словам, которые ученик видит впервые. Список — в
`docs/work/tasks/theory-status-2026-10-22.md`:
- у4 раздел 09: in the sink, in the basement, on the worktop, on the windowsill, under the doormat;
- у6 04: the host, my brother;
- у7 03: the barber, the fan;
- у9 08: She is in the doorway, I am near the carousel;
- у10 03: once a week, twice a week, today, now; 05: earache, backache, toothache; 08: at lunchtime, at midnight;
- у12: rise, hide, find;
- у17: a bookend, two ottomans, pecans, polenta;
- у18: This cabin bag is too big / checked bag light enough;
- у19 02: talk in private; 06: cope with the stress, achieve this goal;
- у20 02: take your belongings;
- у21 03: plan, expect, promise, offer;
- у22 03: unscrew, untangle;
- у5 06: пример «Where is my laptop?» → «Their laptops are on the desk.» (все 9 языков).

То же делаю в es, pt-BR, vi, id, tr, pl. В en переводить нечего: там короткое пояснение простым английским, и только для
редких слов (worktop, ottoman, bookend, pecans, polenta, earache…). Очевидные (my brother, now) оставляю как есть.

## Scope

In scope: `docs/work/theory_drafts/lesson_{04,05,06,07,09,10,12,17,18,19,20,21,22}_{en,es,pt-BR,vi,id,tr,pl}.md` и пересборка их
`modules/learning-v2/theory/generated/*.json`. Пример у5 — во всех 9 языках, включая ru и uk.
Out of scope: ru/uk уроков 19–22 (незакоммиченная работа 12 · ТЕОРИИ — их файлы не коммичу), карты занятий, сторожа. Полный список — theory-terms-for-translator-2026-10-22.md (2357b00a4). Правило: абзац ≤ 300 знаков.

## Architecture

No architecture change. Сборка — `node scripts/build_learning_v2_theory.mjs`. В коммит идут только мои пути; чужие 19–22 не коммичу.

## Security and privacy

Не применимо.

## Technical debt

- Не проверено носителями.

## Verification

`node scripts/build_learning_v2_theory.mjs --check` совпадает для моих уроков; точечный сторож теории; `git diff --numstat`
только по моим файлам.

## Rollback

`git revert <коммит>`.
