# Task packet: «Сегодня» в стиле «Сцена» — вычитка текстов 8 языков (Переводчик → 4 · ТЕМЫ)

Governance-ID: TG-452CED13E7A5
Status: In progress
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

`components/home/v2/today_scene/today_scene_copy.ts` (закоммичен в dc5e1ed82, чужих правок нет). ru — из эталона, не трогаю.

Исправлено:
- `NOUN.cards` pl: «**fiszki**» → «**karty**» — раздел в приложении называется «Karty».
- `NOUN.spire_steps` en: «**Spire** steps» → «**Peak** steps» — в приложении Пик по-английски «Peak» (Spire — внутреннее имя кода).
- `warm` (вечер, «Одно занятие сохранит серию»): es «Una **sesión**», pt-BR «Uma **sessão**», id «Satu **sesi**», vi «Một **buổi học**» —
  старое слово «сессия»; en уже «One lesson». → es «Una lección», pt-BR «Uma lição», id «Satu pelajaran», vi «Một bài học».
- id: «**Streak** {n} hari», «streak-mu» — в приложении «Серия» по-индонезийски «Runtunan». → «Runtunan {n} hari», «runtunanmu».
- `midnightTitle` tr: «Gece yarısına 2 sa 5 dk» — без глагола обрывается. → «Gece yarısına 2 sa 5 dk **kaldı**».

Не трогаю: en «Left: …» — тест `tests/today_scene_copy.test.ts` проверяет эту строку дословно, а тесты сейчас не запускаю
(мало памяти на ПК). Предложение для 4 · ТЕМЫ: «**Still to do:** …» звучит естественнее — менять вместе с тестом.

Остальное верно: склонение «Серия N дней» (ru/uk/pl), es/pt «Faltan / Faltam … para medianoche», «N из M», «Задания дня».

## Scope

In scope: строки текста в `today_scene_copy.ts`. Out of scope: логика, ru, строка en «Left», тесты.

## Architecture

No architecture change.

## Security and privacy

Не применимо: только тексты.

## Technical debt

- en «Left:» — до правки вместе с тестом.

## Verification

`babel.parseSync`; тест проверяет только ru и en «Left» — их правки не касаются.

## Rollback

`git revert <коммит>`.
