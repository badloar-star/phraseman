# Task packet: теория uk для курсов en/es/fr (уроки 1–9, plain, «ви»)

Governance-ID: TG-44AE43243432
Status: In progress
Owner: 10 · ПЕРЕВОДЧИК
Related epic/enabler: решение владельца — uk-объём делится: Переводчик берёт en/es/fr, Learning V2 — de/it (диспетчер, 05.11)

## Outcome

uk-локаль plain-теории уроков 1–9 курсов en, es, fr — по хэшам Теории (en 97d2c818f, fr 7579efa09, база 258a6f4bc). Файлы docs/work/classic_theory_plain/<course>/locales_NN.json. Успех: каждый урок — заголовок, главы c1…cN (title, text) на uk, на «ви», без калек, без русского; коммит на урок; метрика T3 Ревизору.

## Scope

In scope: docs/work/classic_theory_plain/en/locales_01…09.json, es/fr по мере хэшей; этот пакет.
Out of scope: de и it на uk (Learning V2); es/pt-BR/vi/id/tr/pl — остановлены владельцем; ru/en-тексты Теории; lessons-*.json.

## Architecture

Данные-слой для scripts/classic_plain_apply.mjs (fill()). Код не меняется.

## Security and privacy

Персональных данных нет.

## Technical debt

Переводы на uk не проверены носителем; формулировки «ви» — по решению владельца Q54. Уроки 1–3 en могут меняться Теорией — пересверить по хэшу.

## Verification

JSON парсится; все главы урока имеют uk; коммит через safe_commit с --expect; метрика T3 после каждого урока.

## Rollback

`git revert` коммита урока.
