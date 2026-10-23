# Task packet: пояснения грамматических терминов в теории уроков 1, 3, 4, 9, 14, 18, 22 на 7 языках (Переводчик ← 12 · ТЕОРИЯ)

Governance-ID: TG-BFC1B5509119
Governance-ID: TG-3BBED60E1C2C
Status: Done — 49 советов, build --check чистый
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

По списку `docs/work/tasks/theory-term-tips-for-translator-2026-10-22.md`: в конец раздела 01 «What you will learn to say» —
новый `**tip**` одной строкой ≤ 300 знаков в en, es, pt-BR, vi, id, tr, pl. Термин языка + пример, как в ru:
у1 глагол / отрицание; у3 артикль; у4 единственное / множественное число; у9 существительное / связка / Present Continuous /
Present Simple; у14 подлежащее; у18 прилагательное; у22 местоимение / притяжательное.

«Скрепка» (связка) — тем словом, которым её уже называет теория языка: es «pieza», pt-BR «peça», vi «từ nối», id «penjepit»,
tr «bağlayıcı», pl «łącznik», en «clip» (как в у1·01).

## Scope

In scope: 49 строк в `docs/work/theory_drafts/lesson_{01,03,04,09,14,18,22}_{en,es,pt-BR,vi,id,tr,pl}.md` и пересборка их json.
Out of scope: ru/uk (12 · ТЕОРИЯ), сторож `theory_terms_before_feedback` (ru).

## Architecture

No architecture change. `node scripts/build_learning_v2_theory.mjs`, в коммит — только мои пути.

## Security and privacy

Не применимо.

## Technical debt

- Не проверено носителями. Термины выбраны школьные, общепринятые для каждого языка.

## Verification

`build --check` чистый; каждая строка ≤ 300 знаков; `git diff --numstat` только по моим файлам (каждый +2/0).

## Rollback

`git revert <коммит>`.
