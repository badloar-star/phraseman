# Экран «Обучение» («Сезон и карусель карт») — вычитка 9 языков (Переводчик → 2 · ДИЗАЙН)

Governance-ID: TG-590A2F476076
Status: In progress
Owner: «10 · ПЕРЕВОДЧИК»; файлы экрана — 2 · ДИЗАЙН

## Outcome

`components/learning-v2/season/season_copy.ts` (закоммичен в 1821f9889, чужих правок нет) — две строки
исправлены прямо в файле. `season_copy_card.ts` (у Дизайна не закоммичен) — правка ниже текстом, файл не трогаю.

## Правки в `season_copy.ts` (сделаны)

1. `taskOf` vi: «**bài** {k}/{n}» → «**bài tập** {k}/{n}». На этом же экране «Bài {n}» = «Урок {n}» (`lesson`),
   поэтому «bài 3/12» читалось бы как «урок 3 из 12», а речь о задании.
2. `notFromStart` en: «Not from the start» → «**Start somewhere else**». Это кнопка: «Not from the start» — обрывок
   фразы; смысл «не хочу с начала → выбрать другое место» передаёт «Start somewhere else».

## Правка для `season_copy_card.ts` (сделает 2 · ДИЗАЙН)

- `seasonTasksLabel` vi: `vi: 'bài'` → **`vi: 'bài tập'`** — по той же причине («20 bài» = «20 уроков»).

## Остальное — верно

Все 9 языков в обоих файлах: «Эпизод / Глава» по согласованному словарю (tr Bölüm / Ünite), порядковые
формы tr («{n}. bölümle devam et», «{n}. bölümden başla»), склонение pl («zadania / zadań»), es/pt «tras / depois»,
экзамен главы, «Вся глава», «просмотр».

## Scope

In scope: две строки текста в `season_copy.ts`. Out of scope: логика экрана, `season_copy_card.ts` (у Дизайна).

## Architecture

No architecture change.

## Security and privacy

Не применимо: только тексты, данные не затрагиваются.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync` файла; поиск тестов со старыми строками.

## Rollback

`git revert <коммит>`.
