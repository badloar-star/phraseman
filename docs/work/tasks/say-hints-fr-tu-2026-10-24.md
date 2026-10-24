# Task packet: подсказки «что сказать» — французское «Приятно познакомиться» на «tu» (Переводчик, проход по коммитам 24.10)

Governance-ID: TG-A34A74AE315C
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Проход по новым коммитам (координатор 24.10): в `app/dialogue_v2_say_hints_local.ts` (952a8614f) фраза fr для «Nice to meet you»
— «C'est un plaisir de vous rencontrer.» — на «vous», а соседние фразы того же собеседника на «tu» («Salut ! Ta journée…»,
«Et toi, comment tu t'appelles ?», немецкая пара — «dich»). Замена: «Ça me fait plaisir de te rencontrer.» — «tu» и без рода
(«Ravi(e) de te rencontrer» потребовал бы угадывать пол ученика). Остальные три коммита прохода (2400b1929 — мягкие ответы на изучаемом
языке, 462293c5b — маршрут, af51c41b2 — числа заданий) строк интерфейса не добавили.

## Scope

In scope: одна строка fr в `CONCEPTS.greet`. Out of scope: остальные фразы (вычитаны, замечаний нет).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Нет.  Обращение в заказе («s'il vous plaît» в кафе) оставлено на «vous» намеренно — так говорят официанту.

## Verification

`npm run test:one -- tests/dialogue_v2_say_hints_local.test.ts`; разбор файла babel.

## Rollback

`git revert <коммит>`.
