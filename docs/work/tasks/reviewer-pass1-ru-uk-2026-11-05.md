# Task packet: правки ru/uk Ревизора (pass1, en/es) через слой

Governance-ID: TG-38D678BA639A
Status: In progress
Owner: 10 · ПЕРЕВОДЧИК
Related epic/enabler: проверка Ревизора (Opus, смысл en/es 1200 фраз, pass1)

## Outcome

24 записи ru/uk из результатов Ревизора (docs/work/course_quality_1pct/pass1/results_en_*.json, results_es_*.json) применены в слой docs/work/classic_translation_fixes_2026_11_04.json. Парные языки ru↔uk согласованы там, где правка дана только для одного языка. Успех: JSON читается, коммит, хэш Ревизору.

## Scope

In scope: docs/work/classic_translation_fixes_2026_11_04.json (ru/uk), этот пакет.
Out of scope: поля target/tiles/alternatives (зона Теории); дубли целевых фраз в es (28 шт., отдельным решением); код приложения.

## Architecture

Слой-оверрайды для scripts/classic_course_pack.mjs. Код не меняется.

## Security and privacy

Персональных данных нет.

## Technical debt

Дубли целевых фраз в es (класс P5) — не трогаем, пока не решено, нужны ли разные ru/uk для разных ситуаций; парные ru/uk, добавленные нами, — носителями не проверены.

## Verification

JSON парсится; число применённых записей совпадает с ожидаемым; коммит через safe_commit с --expect.

## Rollback

`git revert` коммита; слой возвращается к предыдущей версии.
