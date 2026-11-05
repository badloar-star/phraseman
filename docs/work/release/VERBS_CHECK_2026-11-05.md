# Независимая проверка «Неправильные глаголы» fr/es/de/it — 05.11.2026

Проверял Диспетчер (13), только чтение. Коммиты: 9c5b929db (es), 9e8fc3124 (fr), efc05c5e4 (de), 1c8bb3611 (it), подключение fde49a5e8.
Источник: `modules/classic-irregular-verbs/<lang>.json`.

## Итог: данные чистые; по урокам появления — 28 расхождений (раздел 5)

| Курс | Глаголов | Уроков | Повторы | Пустые переводы (9 языков) | Английские копии в переводах | Пустые формы | Пример раньше урока глагола |
|---|---|---|---|---|---|---|---|
| es | 26 | 17 | 0 | 0 | 0 | 0 | 0 |
| fr | 34 | 15 | 0 | 0 | 0 | 0 | 0 |
| de | 87 | 26 | 0 | 0 | 0 | 0 | 0 |
| it | 35 | 18 | 0 | 0 | 0 | 0 | 0 |

## 1. Один раз, в уроке первого появления
Каждый глагол встречается в файле курса ровно один раз. Ни у одного глагола нет примера (`examples`) из урока раньше того, где он стоит.
Сплошной поиск по всем фразам курса — раздел 5: есть расхождения.

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

Раздел открыт при `CLASSIC_IRREGULAR_VERBS_ENABLED` И активном курсе (`app/classic_irregular_verbs.ts:40-43`). **Поправка:** флаг ВКЛЮЧЁН (`= true`, коммит fde49a5e8, в HEAD). Раньше здесь ошибочно было написано «выключен». Глаголы видны только в тех курсах, которые открыты; при скрытых es/fr/de/it их никто не увидит.

## 5. Сплошной поиск по всем фразам (адресат: Глаголы)
Скрипт (только чтение) прошёл по полю `target` всех фраз `modules/classic-courses/<lang>/lessons-NN.json`. Для каждого глагола ищется первый урок, где во фразе есть его форма из таблицы (все слова формы в одной фразе, без местоимения-подлежащего). Поля `answers`/`alternatives` не смотрелись.
Сырых совпадений 43, из них 15 ложные (омонимы, предлоги, прилагательные). Ниже 28 настоящих.

### 5.1 Глагол встречается РАНЬШЕ своего урока (надо перенести глагол или проверить) — 2
| Курс | Глагол | Стоит в уроке | Впервые | Фраза |
|---|---|---|---|---|
| fr | recevoir | 27 | 18 | fr:18:27 «J’ai reçu le colis.» |
| de | anfangen | 29 | 13 | de:13:50 «Der Kurs fängt gleich an.» |

### 5.2 Глагол стоит РАНЬШЕ, чем его форма появляется во фразах — 19
Возможно, это сделано намеренно (глагол дан по теме урока). Нужно решение Глаголов.
- es: haber 7→20.
- fr: aller 8→11, vouloir 8→12, venir 8→14, connaître 20→22, revenir 27→32.
- de: fahren 6→8, finden 7→9, aussteigen 13→14, kennen 21→24, ausfallen 21→22.
- it: mettere 9→12, volere 12→14, scrivere 15→18, fare 16→17, tenere 16→22, conoscere 20→24, piovere 20→21, dare 23→25.

### 5.3 Ни одна форма из таблицы не встречается во фразах курса — 7
- es: ver (27), poner (29), saber (31).
- fr: comprendre (18).
- de: mögen (5), verlassen (24), denken (26).
Проверить: либо формы во фразах другие (лицо/время не из таблицы), либо глагол в курсе не используется.

### 5.4 Ложные совпадения (не ошибки, для справки)
es pedir («el pedido»), fr lire («le lit»), fr courir («le cours»), de essen («Das Essen»), de laden («Der Laden»), de gefallen (причастие от fallen), de aufstehen / mitkommen / anhalten / ausgehen (auf/mit/an/aus — предлоги), it chiudere / aprire («è chiuso/aperto» — прилагательное), it leggere («letto» — кровать), it correre («in corso»), it salire («sale» — соль).
