# Task packet: теория uk, английский курс, уроки 2–4 (plain, «ви»)

Governance-ID: TG-3192FC8A8A94
Status: In progress
Owner: 10 · ПЕРЕВОДЧИК
Related epic/enabler: пульт uk-en (диспетчер, 05.11), 32 урока английского курса

## Outcome

uk-локаль plain-теории английского курса, уроки 2, 3, 4 (docs/work/classic_theory_plain/en/locales_02…04.json) по хэшу Теории 97d2c818f. Успех: JSON парсится; каждая глава имеет uk; коммит на урок; строка «ПУЛЬТ» диспетчеру.

## Scope

In scope: docs/work/classic_theory_plain/en/locales_02.json, locales_03.json, locales_04.json; этот пакет.
Out of scope: другие курсы, уроки 5–32 en (следующими), ru/en-тексты Теории.

## Architecture

Данные-слой для scripts/classic_plain_apply.mjs. Код не меняется.

## Security and privacy

Персональных данных нет.

## Technical debt

Переводы не проверены носителем uk; английские словарные списки в уроке 4 переданы как есть.

## Verification

JSON парсится; ключи глав совпадают с английским уроком; коммит через safe_commit с --expect.

## Rollback

`git revert` коммитов уроков 2–4.
