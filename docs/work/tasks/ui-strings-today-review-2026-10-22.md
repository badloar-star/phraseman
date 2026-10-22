# Task packet: новые строки интерфейса за 22.10 — вычитка 9 языков (Переводчик, поручение координатора)

Governance-ID: TG-0E7F77E5D514
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Просмотрены коммиты 22.10 по темам координатора: экзамен главы (c7fc02a15, 6adba598a, 9c03c5bff, e7f37e012, 0da1b69a7),
«Сегодня» (867096b0d, 6fdcd15dd, 5a9be81d2), карточка нового слова (500e5a4dc, 0a35b070d), окна инбокса (fe62a217d,
ca212f7c0, 979646dd1, f98d5d148), опросы (e8db72cc8, 823ca20e6).

**Новых строк нет** (только логика): окна инбокса, опросы, удаление окна выхода, экзамен главы в движке и «Сезоне»
(видимые строки «Экзамен главы», «Вся глава», «Глава N из M» уже в `season_copy.ts`, вычитаны раньше).
Строки «Сдашь — откроется глава N» в коде пока нет — она только в эталоне (811988480); сверю, когда появится.

**Исправлено** — `components/home/v2/scene/home_scene_copy.ts`, карточка «Экзамен главы ждёт» (сейчас выключена,
но строки должны совпадать с «Сезоном»):
- tr «**Bölüm** sınavı seni bekliyor» → «**Ünite** sınavı seni bekliyor». В приложении «Bölüm» — это «эпизод», глава —
  «Ünite» (`season_copy.ts`: «Ünite sınavı»). Человек прочитал бы «экзамен эпизода».
- vi «Bài kiểm tra chương» → «Bài thi chương», кнопка «Làm bài kiểm tra» → «Làm bài thi» — как в «Сезоне».
- pt-BR «A prova do capítulo» → «O exame do capítulo», кнопка «Fazer a prova» → «Fazer o exame» — как «Exame do capítulo».
- pl «Egzamin z rozdziału czeka» → «Egzamin rozdziału czeka» — как «Egzamin rozdziału».

`components/home/v2/today_scene/today_scene_copy.ts`, «до полуночи»: es «para medianoche» → «para la medianoche»,
pt-BR «para meia-noite» → «para a meia-noite» (без артикля звучит обрывисто).

**Верно без правок:** «Сегодня» / «История» / «N полных дней» на 9 языках (ru/uk/pl с тремя формами), «до полуночи» на
остальных языках, «12 вопросов, сдать от 10» (кроме исправленного выше), «Понятно» на карточке нового слова,
подписи заданий №23 (52b242cb6). Пропусков языков нет.

## Scope

In scope: строки в двух файлах. Out of scope: логика, ru/uk.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync` обоих файлов; тестов со старыми строками нет.

## Rollback

`git revert <коммит>`.
