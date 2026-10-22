# Task packet: «Ещё N слов откроются в эпизодах урока» — 9 языков (Переводчик, координатор 22.10)

Governance-ID: TG-81CC86CA647A
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

`app/learning_v2_lesson_words_closed_v1.ts` (Learning V2, файл ещё не в git — коммичу целиком по поручению):
- ru / uk / pl — три формы числа верны (pl «21 słów odblokuje się» — глагол в ед. числе при 5+ и 21, так и надо).
- pt-BR «vai abrir / vão abrir» → «será liberada / serão liberadas» — как «liberada» в остальном приложении (слово
  «abrir» о слове звучит странно).
- en «opens / open» → «unlocks / unlock».
- es, vi, id, tr — верно; tr «bölüm» = эпизод по словарю «Сезона».

## Scope

In scope: строки одного файла. Out of scope: подсчёт слов (логика Learning V2).

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Не проверено носителями.

## Verification

Функция прогнана на 9 языках для n = 1, 3, 5, 21 — формы верны.

## Rollback

`git revert <коммит>`.

## Коммит

Правки попали в репозиторий коммитом Learning V2 **0a12676e9** (она закоммитила файл целиком, уже с вычиткой — проверено:
«liberada», «unlocks», пометка «Вычитано Переводчиком» есть в HEAD). Отдельно коммитится только этот пакет.
