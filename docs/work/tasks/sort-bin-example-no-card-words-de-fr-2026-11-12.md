# Task packet: пример корзины «Сортировки» не выдаёт ответ — немецкий и французский

Governance-ID: TG-SORTEXDEFR12
Status: Done
Owner: сессия плиток Главной по задаче сессии «Elevate app механики и макеты» (обход экранов, заход 1)
Related epic/enabler: D207; пара к `sort-bin-example-no-card-words-es-it-2026-11-12.md`

## Outcome

Под названием корзины стоит правило, а не слово с карт той же колоды: «Anna, die Tür» при карте «Die Tür ___ offen»
выдавало ответ. Мера: проверка в `tests/game_task_bank_de_fr.test.ts` — пример корзины не повторяет значимых слов карт.

## Scope

In scope: `example` корзин в `modules/games/bank/sort_de.ts` (17 колод из 20) и `sort_fr.ts` (20 из 20);
проверка в `tests/game_task_bank_de_fr.test.ts`. Out of scope: названия корзин, карты, подсказки.

## Решено без владельца

- Примеры: местоимения как правило («ich, er, sie», «wir, sie (несколько)»), слова, которых нет на картах колоды
  («der Zug, der Stuhl»), или короткое правило по-русски («так же, как», «где, откуда, куда»).
- В проверке служебными считаются артикли, предлоги и местоимения (как просила сессия Elevate: «er, sie, es» — это
  само правило); слова названия корзины не считаются — они подставляются в каждую карту своей корзины.
- de 4, 5, 13 уже были правилом — не менялись.

## Verification

Через светофор, точечно: `tests/game_task_bank_de_fr.test.ts` и `tests/game_content_integrity.test.ts` — 74 passed.

## Rollback

`git revert` коммита.
