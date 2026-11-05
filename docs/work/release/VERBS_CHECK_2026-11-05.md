# Независимая проверка «Неправильные глаголы» fr/es/de/it — 05.11.2026

Проверял Диспетчер (13), только чтение. Коммиты: 9c5b929db (es), 9e8fc3124 (fr), efc05c5e4 (de), 1c8bb3611 (it), подключение fde49a5e8.
Источник: `modules/classic-irregular-verbs/<lang>.json`.

## Итог: ✅ ошибок не найдено

| Курс | Глаголов | Уроков | Повторы | Пустые переводы (9 языков) | Английские копии в переводах | Пустые формы | Пример раньше урока глагола |
|---|---|---|---|---|---|---|---|
| es | 26 | 17 | 0 | 0 | 0 | 0 | 0 |
| fr | 34 | 15 | 0 | 0 | 0 | 0 | 0 |
| de | 87 | 26 | 0 | 0 | 0 | 0 | 0 |
| it | 35 | 18 | 0 | 0 | 0 | 0 | 0 |

## 1. Один раз, в уроке первого появления
Каждый глагол встречается в файле курса ровно один раз. Ни у одного глагола нет примера (`examples`) из урока раньше того, где он стоит.
Ограничение: проверено по примерам в самом файле. Сплошной поиск формы глагола по всем фразам курса не делался.

## 2. Формы (выборка по 10 на язык) — верны
- es: estar, costar, leer, escribir, poder, ir, hacer, empezar, cerrar, pedir — presente / pretérito / participio верны.
- fr: être, faire, prendre, apprendre, pouvoir, falloir, voir, pleuvoir, dire, connaître — présent / passé composé / futur верны.
- de: sein, mögen, verstehen, halten, aussteigen, können, sehen, zurückkommen, kennen, geben — Präsens 3 л. / Präteritum / Partizip II верны.
- it: essere, piacere, aprire, andare, rimanere, dovere, perdere, fare, uscire, chiedere — presente / participio верны.

## 3. Переводы на 9 языков (ru, uk, en, es, pt-BR, vi, id, tr, pl)
Пустых нет. Совпадений с английским переводом (кроме самого en и языка курса) нет.

## 4. Меню и экран
`app/irregular_verbs_for_target.ts` даёт курсу его собственный список (`classicIrregularVerbsByLesson`), английский курс не изменился, неизвестный курс получает пусто. Пункт меню скрыт, если в уроке нет глаголов.
Тест `tests/classic_irregular_verbs_data.test.ts` — 33/33 зелёный (прогон 05.11).

⚠️ Раздел открыт только при `CLASSIC_IRREGULAR_VERBS_ENABLED` И активном курсе (`app/classic_irregular_verbs.ts:43`). Флаг сейчас выключен (150 — только английский). Если владелец включает es/fr/de/it по условию «≤15%» (779d869eb), флаг нужно включить вместе с курсом, иначе глаголов в курсе не будет.
