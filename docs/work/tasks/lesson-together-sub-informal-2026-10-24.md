# Task packet: «Награда «вместе» вам обоим» → без «вам» — замок владельца «на ты» зелёный (Переводчик, координатор 24.10)

Governance-ID: TG-5977F50455EC
Status: Done — сторож 5/5
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

`tests/informal_address_ru_uk_guard.test.mjs` (замок владельца «интерфейс на ты») красный на HEAD из-за
`app/friends_together/lesson_together_finish_copy.ts` FINAL_SUB (3fa8f96df, строка из моего черновика 865d9c17b):
ru «Награда «вместе» вам обоим», uk «Нагорода «разом» вам обом». Шаблон «к двоим» в стороже пропускает «вы оба» и «никто из вас»,
но не «вам обоим». Решение координатора: замок не расширяем (это может только владелец) — переписываем строку без «вам».

ru «Награда «вместе» — каждому», uk «Нагорода «разом» — кожному». Остальные 7 языков уже значат «обоим / каждому из двоих»
(«for both of you», «para los dos», «para vocês dois», «cho cả hai», «untuk kalian berdua», «İkinize de», «dla was obojga») и не
подпадают под сторож ru/uk — без изменений. JSDoc над функцией и строка в черновике `friends-6-8-9-copy-draft.md` — в тон.

## Scope

In scope: ru/uk в FINAL_SUB + JSDoc; строка черновика. Out of scope: сторож (не ослабляется).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Если «Награда «вместе» — каждому» на склейке Сверки окажется длиннее места, короче: «Награда «вместе» обоим» (тоже без «вам»).

## Verification

`node --test tests/informal_address_ru_uk_guard.test.mjs` — зелёный; `babel.parseSync` файла.

## Rollback

`git revert <коммит>`.
