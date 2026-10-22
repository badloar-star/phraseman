# Task packet: экзамен главы — ключ «от N верных» на 9 языках (Переводчик, координатор 22.10)

Governance-ID: TG-83EC210100D7
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

На карте экзамена в «Сезоне» вместо корявого «10 чтобы сдать» — строка как в эталоне «12 вопросов · от 10 верных ·
~5 минут». В `components/learning-v2/learning_v2_chapter_exam_copy.ts` добавлена функция
`learningV2ChapterExamPassFrom(lang, n)` с согласованием по числу:

ru «от {n} верного/верных», uk «від {n} правильної/правильних», en «at least {n} correct», es «al menos {n}
acierto/aciertos», pt-BR «pelo menos {n} acerto/acertos», vi «từ {n} câu đúng», id «minimal {n} benar», tr «en az {n}
doğru», pl «od {n} poprawnej/poprawnych».

В файле есть чужие незакоммиченные строки (`progress`, `next` — Learning V2): коммит только своей функции через
`--patch`, чужое не трогаю. Подставит 4 · ТЕМЫ.

## Scope

In scope: одна функция текстов. Out of scope: карта «Сезона» (подставляет 4 · ТЕМЫ), чужие строки файла.

## Architecture

No architecture change: отдельная функция рядом с `learningV2ChapterExamCopy`, без новых импортов.

## Security and privacy

Не применимо.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync`; функция прогнана на 9 языках для n = 1, 2, 5, 10, 21 — формы верны (ru «от 21 верного», pl «od 21 poprawnych»).

## Rollback

`git revert <коммит>`.
